import { describe, it, expect } from 'vitest';
import { QuickCartAdapter } from '../QuickCartAdapter';
import { ExperimentExecutor } from '@realitycheck/executor';
import { ExperimentSpec } from '@realitycheck/contracts';

// BLOCKED: QuickCart application is not available in the workspace.
// Do not remove `.skip` until the actual QuickCart benchmark is provided and can run on localhost.
describe.skip('BLOCKED: QuickCart not available - Real Chromium E2E', () => {
  const adapter = new QuickCartAdapter();

  it('TEST A — shipping-bug: BoundaryEngine discovers 1050, Verifier returns CONTRADICTED', async () => {
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'http://localhost:3000/?scenario=shipping-bug',
      testConditions: {
        cartSubtotalTarget: 999
      },
      expectedObservables: {
        shippingCost: 0
      }
    };

    // We let the Executor use the deterministic probe planner.
    const result = await ExperimentExecutor.executeBoundaryExperiment(spec, adapter);

    // In shipping-bug, 999 and 1000 charge shipping, but 1050 is free.
    expect(result.verifierResult.verdict).toBe('CONTRADICTED');
    expect(result.verifierResult.observedBoundary).toBe(1050);
  });

  it('TEST B — shipping-honest: BoundaryEngine discovers 999, Verifier returns SUPPORTED', async () => {
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'http://localhost:3000/?scenario=shipping-honest',
      testConditions: {
        cartSubtotalTarget: 999
      },
      expectedObservables: {
        shippingCost: 0
      }
    };

    const result = await ExperimentExecutor.executeBoundaryExperiment(spec, adapter);

    // In shipping-honest, 999 gives free shipping.
    expect(result.verifierResult.verdict).toBe('SUPPORTED');
    expect(result.verifierResult.observedBoundary).toBe(999);
  });

  it('TEST C — insufficient evidence: Returns INCONCLUSIVE', async () => {
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'http://localhost:3000/?scenario=invalid-scenario',
      testConditions: {
        cartSubtotalTarget: 999
      },
      expectedObservables: {
        shippingCost: 0
      }
    };

    const result = await ExperimentExecutor.executeBoundaryExperiment(spec, adapter);

    expect(result.verifierResult.verdict).toBe('INCONCLUSIVE');
  });
});
