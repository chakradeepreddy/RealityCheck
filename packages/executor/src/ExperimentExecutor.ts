import { ExperimentSpec, SiteAdapter, Observation, ExperimentSpecSchema } from '@realitycheck/contracts';
import { BrowserRunner } from '@realitycheck/browser';
import * as crypto from 'crypto';
import { BoundaryEngine } from '@realitycheck/engines';
import { DeterministicVerifier, VerifierResult } from '@realitycheck/verifier';
import { DeterministicProbePlanner } from './DeterministicProbePlanner';

export interface ExecutionResult {
  spec: ExperimentSpec;
  observations: Observation[];
  verifierResult: VerifierResult;
}

export class ExperimentExecutor {
  /**
   * Executes a boundary experiment deterministically from end to end.
   * 
   * This orchestration layer coordinates the execution pipeline but contains NO
   * verdict logic, NO QuickCart specific selectors, and NO browser automation itself.
   * 
   * @param spec The experiment specification (claim to test)
   * @param adapter The injected SiteAdapter tailored to the target website
   * @param probeStates Optional numeric states to probe. If omitted, generated deterministically.
   * @returns The fully structured ExecutionResult
   */
  static async executeBoundaryExperiment(
    spec: ExperimentSpec,
    adapter: SiteAdapter<any>,
    probeStates?: number[]
  ): Promise<ExecutionResult> {
    // 1. Structural Validation
    const validation = ExperimentSpecSchema.safeParse(spec);
    if (!validation.success) {
      return {
        spec,
        observations: [],
        verifierResult: {
          verdict: 'INCONCLUSIVE',
          reason: `Invalid ExperimentSpec structure: ${validation.error.message}`
        }
      };
    }

    if (spec.primitive !== 'BOUNDARY' || spec.boundaryType !== 'NUMERIC_THRESHOLD') {
       return {
        spec,
        observations: [],
        verifierResult: {
          verdict: 'INCONCLUSIVE',
          reason: `Unsupported primitive or boundary type: ${spec.primitive} / ${spec.boundaryType}`
        }
      };
    }

    const expectedCartSubtotalTarget = spec.testConditions.cartSubtotalTarget;
    if (expectedCartSubtotalTarget === undefined) {
      return {
        spec,
        observations: [],
        verifierResult: {
          verdict: 'INCONCLUSIVE',
          reason: 'ExperimentSpec is missing required cartSubtotalTarget.'
        }
      };
    }

    // Determine probes deterministically if not provided
    const actualProbeStates = probeStates || DeterministicProbePlanner.planNumericBoundaryProbes(expectedCartSubtotalTarget);

    // 2. Invoke BrowserRunner
    const runner = new BrowserRunner();
    let observations: Observation[] = [];
    try {
      await runner.init();
      // Execute the browser runner and retrieve array of observations
      observations = await runner.runBoundaryObservation(spec, adapter, spec.targetUrl, actualProbeStates);

    } catch (err: any) {
      // Browser failure -> Fail closed as INCONCLUSIVE
      return {
        spec,
        observations,
        verifierResult: {
          verdict: 'INCONCLUSIVE',
          reason: `Browser execution failed catastrophically: ${err.message}`
        }
      };
    } finally {
      await runner.close();
    }

    // 3. Boundary Engine isolates the numeric transition
    // Note: We use expectedObservable 'shippingCost' reaching 0 for 'Free Shipping'. 
    // In a generic scenario, the engine needs to know what output value implies success.
    // Here we check for shippingCost becoming 0.
    const analysis = BoundaryEngine.analyzeNumericThreshold(
      observations,
      'cartSubtotal',
      'shippingCost',
      0
    );

    // 4. Deterministic Verifier produces final Verdict
    const verifierResult = DeterministicVerifier.verifyBoundary(spec, analysis);

    return {
      spec,
      observations,
      verifierResult
    };
  }

  /**
   * Executes a canary experiment deterministically from end to end.
   */
  static async executeCanaryExperiment(
    spec: ExperimentSpec,
    adapter: SiteAdapter<any>
  ): Promise<ExecutionResult> {
    const validation = ExperimentSpecSchema.safeParse(spec);
    if (!validation.success) {
      return {
        spec,
        observations: [],
        verifierResult: {
          verdict: 'INCONCLUSIVE',
          reason: `Invalid ExperimentSpec structure: ${validation.error.message}`
        }
      };
    }

    if (spec.primitive !== 'CANARY') {
      return {
        spec,
        observations: [],
        verifierResult: {
          verdict: 'INCONCLUSIVE',
          reason: `Unsupported primitive: ${spec.primitive}`
        }
      };
    }

    const target = spec.testConditions.canaryInputTarget;
    if (!target) {
      return {
        spec,
        observations: [],
        verifierResult: {
          verdict: 'INCONCLUSIVE',
          reason: 'ExperimentSpec is missing required canaryInputTarget.'
        }
      };
    }

    // Generate unique synthetic marker
    const marker = `rc_canary_${crypto.randomUUID()}`;

    const runner = new BrowserRunner();
    let observations: Observation[] = [];
    try {
      await runner.init();
      observations = await runner.runCanaryObservation(spec, adapter, spec.targetUrl, target, marker);
    } catch (err: any) {
      return {
        spec,
        observations,
        verifierResult: {
          verdict: 'INCONCLUSIVE',
          reason: `Browser execution failed catastrophically: ${err.message}`
        }
      };
    } finally {
      await runner.close();
    }

    // A single observation object comes back containing the network observations
    const observation = observations[0];
    if (!observation || !observation.canaryNetworkObservations) {
      return {
        spec,
        observations,
        verifierResult: {
          verdict: 'INCONCLUSIVE',
          reason: 'No canary network observations were collected.'
        }
      };
    }

    const verifierResult = DeterministicVerifier.verifyCanary(spec, observation.canaryNetworkObservations);

    return {
      spec,
      observations,
      verifierResult
    };
  }
}
