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

    if (spec.primitive !== 'BOUNDARY') {
       return {
        spec,
        observations: [],
        verifierResult: {
          verdict: 'INCONCLUSIVE',
          reason: `Unsupported primitive: ${spec.primitive}`
        }
      };
    }

    if (spec.boundaryType !== 'NUMERIC_THRESHOLD' && spec.boundaryType !== 'QUANTITY_DISCOUNT') {
       return {
        spec,
        observations: [],
        verifierResult: {
          verdict: 'INCONCLUSIVE',
          reason: `Unsupported boundary type: ${spec.boundaryType}`
        }
      };
    }

    let expectedTarget = 0;
    let actualProbeStates: number[] = probeStates || [];

    if (spec.boundaryType === 'NUMERIC_THRESHOLD') {
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
      expectedTarget = expectedCartSubtotalTarget;
      if (!probeStates) {
        actualProbeStates = DeterministicProbePlanner.planNumericBoundaryProbes(expectedCartSubtotalTarget);
      }
    } else if (spec.boundaryType === 'QUANTITY_DISCOUNT') {
      const itemsToAdd = spec.testConditions.itemsToAdd;
      if (!itemsToAdd || itemsToAdd.length === 0 || itemsToAdd[0].quantity === undefined) {
        return {
          spec,
          observations: [],
          verifierResult: {
            verdict: 'INCONCLUSIVE',
            reason: 'ExperimentSpec is missing required itemsToAdd with quantity.'
          }
        };
      }
      expectedTarget = itemsToAdd[0].quantity;
      if (!probeStates) {
        actualProbeStates = [
          Math.max(1, expectedTarget - 2),
          Math.max(1, expectedTarget - 1),
          expectedTarget,
          expectedTarget + 1,
          expectedTarget + 2
        ].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
      }
    }

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
    let analysis;
    if (spec.boundaryType === 'NUMERIC_THRESHOLD') {
      analysis = BoundaryEngine.analyzeNumericThreshold(
        observations,
        'cartSubtotal',
        'shippingCost',
        0
      );
    } else {
      // For quantity discounts, we want to observe discountApplied becoming true
      // We pass the quantity as input. Since QuickCartAdapter observeState doesn't return the explicit quantity in pageState
      // but returns cartSubtotal which scales monotonically with quantity, we can use cartSubtotal!
      // BUT we need the threshold in terms of quantity. If QuickCartAdapter mapped targetValue=quantity, 
      // the observedBoundary will be the cartSubtotal. That's a mismatch.
      // Let's modify QuickCartAdapter to just return `cartQuantity` in pageState or we just rely on `itemsToAdd`.
      // Wait, we can map the transition of discountApplied=true back to the corresponding targetValue (quantity).
      // A better way is: use a custom analysis or inject quantity into the observation!
      // Actually, since `QuickCartAdapter` just clicks 'add-to-cart' N times, the state we care about is the index of the observation.
      // But we can map the `observations` manually. Let's just use a simple logic here:
      const lowestMet = observations.find(obs => obs.pageState?.discountApplied === true);
      const highestNotMet = [...observations].reverse().find(obs => obs.pageState?.discountApplied === false);
      
      if (!lowestMet) {
        analysis = {
          status: 'BOUNDARY_NOT_ESTABLISHED' as const,
          supportingObservations: observations,
          reason: 'Discount condition is never met in the provided observations.',
        };
      } else {
        // We know the probe states correspond 1:1 to the observations array length
        // Find the index of lowestMet
        const metIndex = observations.indexOf(lowestMet);
        const observedBoundaryQuantity = actualProbeStates[metIndex];
        
        analysis = {
          status: 'BOUNDARY_FOUND' as const,
          observedBoundary: observedBoundaryQuantity,
          supportingObservations: observations,
          reason: `Transition found. Boundary established at quantity ${observedBoundaryQuantity}.`
        };
      }
    }

    // 4. Deterministic Verifier produces final Verdict
    const verifierResult = DeterministicVerifier.verifyBoundary(spec, analysis, expectedTarget);

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
