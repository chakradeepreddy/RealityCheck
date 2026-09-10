import { 
  SiteAdapter, 
  RunManifest, 
  ExecutionStatusEnum, 
  VerdictEnum, 
  ExecutionMode,
  ExperimentSpec,
  ClaimCompiler
} from '@realitycheck/contracts';
import { ExperimentRepository } from '@realitycheck/db';
import { ExperimentExecutor, ExecutionResult } from '@realitycheck/executor';

export class RealityCheckOrchestrator {
  constructor(private repository: ExperimentRepository) {}

  /**
   * Runs a new experiment from scratch.
   */
  async runNewExperiment(
    claim: string,
    targetUrl: string,
    adapter: SiteAdapter<any> | null,
    compiler: ClaimCompiler,
    executionMode: ExecutionMode = 'CONTROLLED',
    claimAttachmentPath?: string
  ): Promise<ExecutionResult & { runId: string }> {
    const runId = crypto.randomUUID();
    
    const manifest: RunManifest = {
      schemaVersion: '1.0.0',
      runId,
      claim,
      claimAttachmentPath,
      targetUrl,
      primitive: 'BOUNDARY',
      executionMode,
      adapter: adapter ? adapter.constructor.name : 'NONE',
      adapterVersion: adapter ? adapter.version || '1.0.0' : 'N/A',
      experimentSpec: {} as any, // Placeholder until compiled
      browserEnvironment: {
        browser: 'Chromium',
        version: 'latest',
        viewport: { width: 1280, height: 720 },
        locale: 'en-US',
        currency: 'USD',
        region: 'US'
      },
      testConditions: {},
      startedAt: new Date().toISOString(),
      expectedObservables: {}
    };

    if (!adapter) {
      const reason = `Preflight failed: No registered SiteAdapter supports URL ${targetUrl}`;
      await this.repository.saveRun(manifest, ExecutionStatusEnum.UNSUPPORTED_SITE, VerdictEnum.INCONCLUSIVE, reason);
      return {
        runId,
        spec: manifest.experimentSpec,
        observations: [],
        verifierResult: { verdict: VerdictEnum.INCONCLUSIVE, reason }
      };
    }

    // Preflight
    let supportsUrl = false;
    try {
      supportsUrl = adapter.supports(targetUrl);
    } catch (e) {
      supportsUrl = false;
    }

    if (!supportsUrl) {
      const reason = `Preflight failed: Adapter ${manifest.adapter} does not support URL ${targetUrl}`;
      await this.repository.saveRun(manifest, ExecutionStatusEnum.UNSUPPORTED_SITE, VerdictEnum.INCONCLUSIVE, reason);
      return {
        runId,
        spec: manifest.experimentSpec,
        observations: [],
        verifierResult: { verdict: VerdictEnum.INCONCLUSIVE, reason }
      };
    }

    // Pass Preflight, start running
    await this.repository.saveRun(manifest, ExecutionStatusEnum.RUNNING, VerdictEnum.INCONCLUSIVE, 'Compiling and executing...');

    try {
      // Compile
      let spec: ExperimentSpec;
      try {
        spec = await compiler.compileClaim(claim, targetUrl);
      } catch (e: any) {
        const errorMessage = e instanceof Error ? e.message : 'Compilation failed';
        let statusToSet: typeof ExecutionStatusEnum[keyof typeof ExecutionStatusEnum] = ExecutionStatusEnum.NOT_TESTABLE;
        let inconclusiveReason = `Claim cannot be mapped to a supported experiment: ${errorMessage}`;
        
        if (errorMessage.includes('GROQ_API_KEY')) {
          statusToSet = ExecutionStatusEnum.FAILED;
          inconclusiveReason = `System misconfiguration: ${errorMessage}`;
        }
        
        await this.repository.saveRun(manifest, statusToSet, VerdictEnum.INCONCLUSIVE, inconclusiveReason);
        return {
          runId,
          spec: manifest.experimentSpec,
          observations: [],
          verifierResult: { verdict: VerdictEnum.INCONCLUSIVE, reason: inconclusiveReason }
        };
      }
      
      manifest.experimentSpec = spec;
      manifest.expectedObservables = spec.expectedObservables;
      manifest.primitive = spec.primitive as any;
      
      // Update DB with compiled spec immediately before execution
      await this.repository.saveRun(manifest, ExecutionStatusEnum.RUNNING, VerdictEnum.INCONCLUSIVE, 'Executing browser tests...');

      // Execute
      let result: ExecutionResult;
      if (spec.primitive === 'BOUNDARY') {
        result = await ExperimentExecutor.executeBoundaryExperiment(spec, adapter);
      } else if (spec.primitive === 'CANARY') {
        result = await ExperimentExecutor.executeCanaryExperiment(spec, adapter);
      } else {
        throw new Error(`Unsupported primitive: ${spec.primitive}`);
      }
      
      // Save Result
      await this.repository.saveRun(
        manifest, 
        ExecutionStatusEnum.COMPLETED, 
        result.verifierResult.verdict, 
        result.verifierResult.reason,
        result.verifierResult.claimedBoundary,
        result.verifierResult.observedBoundary
      );
      
      if (result.observations.length > 0) {
        await this.repository.saveObservations(runId, result.observations);
      }

      return { runId, ...result };

    } catch (error: any) {
      const reason = `Execution failed catastrophically: ${error.message}`;
      await this.repository.saveRun(manifest, ExecutionStatusEnum.FAILED, VerdictEnum.INCONCLUSIVE, reason);
      throw error;
    }
  }

  /**
   * Replays an existing run using the exact stored ExperimentSpec.
   */
  async runReplay(
    originalRunId: string,
    adapter: SiteAdapter<any> | null,
    executionMode: ExecutionMode = 'CONTROLLED'
  ): Promise<ExecutionResult & { runId: string }> {
    const originalRun = await this.repository.getRun(originalRunId);
    if (!originalRun) {
      throw new Error(`Run ${originalRunId} not found in database.`);
    }

    const runId = crypto.randomUUID();
    const parsedSpec = JSON.parse(originalRun.experimentSpec) as ExperimentSpec;

    const manifest: RunManifest = {
      schemaVersion: '1.0.0',
      runId,
      originalRunId,
      claim: originalRun.claim,
      claimAttachmentPath: originalRun.claimAttachmentPath || undefined,
      targetUrl: originalRun.targetUrl,
      primitive: originalRun.primitive as 'BOUNDARY' | 'CANARY',
      executionMode,
      adapter: adapter ? adapter.constructor.name : 'NONE',
      adapterVersion: adapter ? adapter.version || '1.0.0' : 'N/A',
      experimentSpec: parsedSpec,
      browserEnvironment: JSON.parse(originalRun.browserEnvironment),
      testConditions: JSON.parse(originalRun.testConditions),
      startedAt: new Date().toISOString(),
      expectedObservables: parsedSpec.expectedObservables
    };

    if (!adapter) {
      const reason = `Replay Preflight failed: No registered SiteAdapter supports URL ${manifest.targetUrl}`;
      await this.repository.saveRun(manifest, ExecutionStatusEnum.UNSUPPORTED_SITE, VerdictEnum.INCONCLUSIVE, reason);
      return {
        runId,
        spec: manifest.experimentSpec,
        observations: [],
        verifierResult: { verdict: VerdictEnum.INCONCLUSIVE, reason }
      };
    }

    // Preflight
    let supportsUrl = false;
    try {
      supportsUrl = adapter.supports(manifest.targetUrl);
    } catch (e) {
      supportsUrl = false;
    }

    if (!supportsUrl) {
      const reason = `Replay Preflight failed: Adapter ${manifest.adapter} does not support URL ${manifest.targetUrl}`;
      await this.repository.saveRun(manifest, ExecutionStatusEnum.UNSUPPORTED_SITE, VerdictEnum.INCONCLUSIVE, reason);
      return {
        runId,
        spec: manifest.experimentSpec,
        observations: [],
        verifierResult: { verdict: VerdictEnum.INCONCLUSIVE, reason }
      };
    }

    await this.repository.saveRun(manifest, ExecutionStatusEnum.RUNNING, VerdictEnum.INCONCLUSIVE, 'Replaying browser tests...');

    try {
      // Execute (Bypassing ClaimCompiler)
      let result: ExecutionResult;
      if (parsedSpec.primitive === 'BOUNDARY') {
        result = await ExperimentExecutor.executeBoundaryExperiment(parsedSpec, adapter);
      } else if (parsedSpec.primitive === 'CANARY') {
        result = await ExperimentExecutor.executeCanaryExperiment(parsedSpec, adapter);
      } else {
        throw new Error(`Unsupported primitive: ${parsedSpec.primitive}`);
      }
      
      // Save Result
      await this.repository.saveRun(
        manifest, 
        ExecutionStatusEnum.COMPLETED, 
        result.verifierResult.verdict, 
        result.verifierResult.reason,
        result.verifierResult.claimedBoundary,
        result.verifierResult.observedBoundary
      );
      
      if (result.observations.length > 0) {
        await this.repository.saveObservations(runId, result.observations);
      }

      return { runId, ...result };

    } catch (error: any) {
      const reason = `Replay execution failed catastrophically: ${error.message}`;
      await this.repository.saveRun(manifest, ExecutionStatusEnum.FAILED, VerdictEnum.INCONCLUSIVE, reason);
      throw error;
    }
  }
}
