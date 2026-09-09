import { describe, it, expect } from 'vitest';
import { QuickCartAdapter } from '../QuickCartAdapter';
import { ExperimentExecutor } from '@realitycheck/executor';
import { ExperimentSpec } from '@realitycheck/contracts';

// BLOCKED: QuickCart application is not available in the workspace.
// Do not remove `.skip` until the actual QuickCart benchmark is provided and can run on localhost.
describe('QuickCart Real Chromium E2E', () => {
  const adapter = new QuickCartAdapter();

  it('TEST A — shipping-bug: BoundaryEngine discovers 1050, Verifier returns CONTRADICTED', async () => {
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'http://127.0.0.1:5173/?scenario=shipping-bug',
      testConditions: {
        cartSubtotalTarget: 999
      },
      expectedObservables: {
        shippingCost: 0
      }
    };

    const result = await ExperimentExecutor.executeBoundaryExperiment(spec, adapter);

    // In shipping-bug, the actual free shipping kicks in at 1050.
    // The adapter successfully establishes exactly 1050 and the engine observes it.
    expect(result.verifierResult.verdict).toBe('CONTRADICTED');
    expect(result.verifierResult.observedBoundary).toBe(1050);
  }, 60000);

  it('TEST B — shipping-honest: BoundaryEngine discovers 999, Verifier returns SUPPORTED', async () => {
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'http://127.0.0.1:5173/?scenario=shipping-honest',
      testConditions: {
        cartSubtotalTarget: 999
      },
      expectedObservables: {
        shippingCost: 0
      }
    };

    const result = await ExperimentExecutor.executeBoundaryExperiment(spec, adapter);

    expect(result.verifierResult.verdict).toBe('SUPPORTED');
    expect(result.verifierResult.observedBoundary).toBe(999);
  }, 60000);

  it('TEST C — insufficient evidence: Returns INCONCLUSIVE', async () => {
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'http://127.0.0.1:5173/?scenario=forced-inconclusive', // adapter sees this and returns empty
      testConditions: {
        cartSubtotalTarget: 999
      },
      expectedObservables: {
        shippingCost: 0
      }
    };

    const result = await ExperimentExecutor.executeBoundaryExperiment(spec, adapter);
    expect(result.verifierResult.verdict).toBe('INCONCLUSIVE');
  }, 60000);

  it('TEST D — canary-leak: Network observation finds marker, Verifier returns CONTRADICTED', async () => {
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'CANARY',
      targetUrl: 'http://127.0.0.1:5173/?scenario=canary-leak',
      testConditions: {
        canaryInputTarget: 'coupon-code',
        allowedDestinations: []
      },
      expectedObservables: {}
    };

    const result = await ExperimentExecutor.executeCanaryExperiment(spec, adapter);
    expect(result.verifierResult.verdict).toBe('CONTRADICTED');
    
    // We expect the leak to have been found in the observations
    const hasLeak = result.observations.some(obs => 
      obs.canaryNetworkObservations?.some(net => net.markerFound && net.url.includes('fake-third-party'))
    );
    expect(hasLeak).toBe(true);
  }, 60000);

  it('TEST E — canary-honest: Network observation finds NO leak, Verifier returns SUPPORTED', async () => {
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'CANARY',
      targetUrl: 'http://127.0.0.1:5173/?scenario=canary-honest',
      testConditions: {
        canaryInputTarget: 'coupon-code',
        allowedDestinations: []
      },
      expectedObservables: {}
    };

    const result = await ExperimentExecutor.executeCanaryExperiment(spec, adapter);
    expect(result.verifierResult.verdict).toBe('SUPPORTED');
    
    const hasLeak = result.observations.some(obs => 
      obs.canaryNetworkObservations?.some(net => net.markerFound && net.url.includes('fake-third-party'))
    );
    expect(hasLeak).toBe(false);
  }, 60000);
});
