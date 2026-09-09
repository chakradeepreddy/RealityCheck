import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealityCheckOrchestrator } from './RealityCheckOrchestrator';
import { ExperimentRepository } from '@realitycheck/db';
import { SiteAdapter, ExperimentSpec, ExecutionStatusEnum, VerdictEnum, ClaimCompiler } from '@realitycheck/contracts';
import { ExperimentExecutor, ExecutionResult } from '@realitycheck/executor';

describe('RealityCheckOrchestrator', () => {
  let repository: any;
  let compiler: any;
  let adapter: any;
  let orchestrator: RealityCheckOrchestrator;

  beforeEach(() => {
    repository = {
      saveRun: vi.fn(),
      saveObservations: vi.fn(),
      getRun: vi.fn()
    };

    compiler = {
      compileClaim: vi.fn()
    };

    adapter = {
      supports: vi.fn()
    };
    
    // Explicitly set constructor name for logging
    Object.defineProperty(adapter, 'constructor', { value: { name: 'MockAdapter' } });

    orchestrator = new RealityCheckOrchestrator(repository as unknown as ExperimentRepository);
    
    // Spy on ExperimentExecutor
    vi.spyOn(ExperimentExecutor, 'executeBoundaryExperiment').mockResolvedValue({
      spec: {} as any,
      observations: [],
      verifierResult: { verdict: VerdictEnum.SUPPORTED, reason: 'Valid' }
    } as any);
  });

  describe('runNewExperiment', () => {
    it('handles preflight failure (NOT_RUN)', async () => {
      adapter.supports.mockReturnValue(false);

      const result = await orchestrator.runNewExperiment('Free shipping over $50', 'https://example.com', adapter, compiler);

      expect(result.verifierResult.verdict).toBe(VerdictEnum.INCONCLUSIVE);
      expect(repository.saveRun).toHaveBeenCalledTimes(1);
      expect(repository.saveRun).toHaveBeenCalledWith(
        expect.anything(),
        ExecutionStatusEnum.NOT_RUN,
        VerdictEnum.INCONCLUSIVE,
        expect.stringContaining('Preflight failed')
      );
      expect(compiler.compileClaim).not.toHaveBeenCalled();
    });

    it('handles compiler failure (FAILED)', async () => {
      adapter.supports.mockReturnValue(true);
      compiler.compileClaim.mockRejectedValue(new Error('Groq API Error'));

      const result = await orchestrator.runNewExperiment('claim', 'https://example.com', adapter, compiler);
      expect(result.verifierResult.verdict).toBe(VerdictEnum.INCONCLUSIVE);
      expect(result.verifierResult.reason).toContain('Claim cannot be mapped to a supported experiment: Groq API Error');

      expect(repository.saveRun).toHaveBeenCalledWith(
        expect.anything(),
        ExecutionStatusEnum.COMPLETED,
        VerdictEnum.INCONCLUSIVE,
        expect.stringContaining('Claim cannot be mapped to a supported experiment: Groq API Error')
      );
    });

    it('successfully executes a new run', async () => {
      adapter.supports.mockReturnValue(true);
      compiler.compileClaim.mockResolvedValue({ primitive: 'BOUNDARY', expectedObservables: {} });

      const result = await orchestrator.runNewExperiment('claim', 'https://example.com', adapter, compiler);

      expect(result.verifierResult.verdict).toBe(VerdictEnum.SUPPORTED);
      
      // Called for RUNNING (pre-compile), RUNNING (post-compile), COMPLETED
      expect(repository.saveRun).toHaveBeenCalledTimes(3);
      
      // Final save should be COMPLETED
      expect(repository.saveRun).toHaveBeenLastCalledWith(
        expect.anything(),
        ExecutionStatusEnum.COMPLETED,
        VerdictEnum.SUPPORTED,
        'Valid',
        undefined,
        undefined
      );
    });
  });

  describe('runReplay', () => {
    it('bypasses compiler and replays stored spec', async () => {
      adapter.supports.mockReturnValue(true);
      repository.getRun.mockResolvedValue({
        claim: 'claim',
        targetUrl: 'https://example.com',
        primitive: 'BOUNDARY',
        experimentSpec: '{"primitive": "BOUNDARY", "expectedObservables":{}}',
        browserEnvironment: '{}',
        testConditions: '{}'
      });

      const result = await orchestrator.runReplay('run-123', adapter);

      expect(result.verifierResult.verdict).toBe(VerdictEnum.SUPPORTED);
      expect(compiler.compileClaim).not.toHaveBeenCalled(); // Explicitly verify bypass
      
      // Final save
      expect(repository.saveRun).toHaveBeenLastCalledWith(
        expect.objectContaining({ originalRunId: 'run-123' }), // Ensure linked
        ExecutionStatusEnum.COMPLETED,
        VerdictEnum.SUPPORTED,
        'Valid',
        undefined,
        undefined
      );
    });
  });
});
