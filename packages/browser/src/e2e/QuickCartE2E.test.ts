import { describe, it, expect } from 'vitest';
import { GenericAdaptiveAdapter } from '../GenericAdaptiveAdapter';
import { ExperimentExecutor } from '@realitycheck/executor';
import { ExperimentSpec } from '@realitycheck/contracts';


describe('QuickCart Real Chromium E2E', () => {
  const adapter = new GenericAdaptiveAdapter();

  it('TEST A — shipping-bug: BoundaryEngine discovers 1050, Verifier returns CONTRADICTED', async () => {
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'http://127.0.0.1:5174/?scenario=shipping-bug',
      testConditions: {
        cartSubtotalTarget: 999
      },
      expectedObservables: {
        shippingCost: 0
      }
    };

    const result = await ExperimentExecutor.executeBoundaryExperiment(spec, adapter);


    expect(result.verifierResult.verdict).toBe('CONTRADICTED');
    expect(result.verifierResult.observedBoundary).toBe(1050);
  }, 60000);

  it('TEST B — shipping-honest: BoundaryEngine discovers 999, Verifier returns SUPPORTED', async () => {
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'http://127.0.0.1:5174/?scenario=shipping-honest',
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
      targetUrl: 'http://127.0.0.1:5174/?scenario=forced-inconclusive',
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
      targetUrl: 'http://127.0.0.1:5174/?scenario=canary-leak',
      testConditions: {
        canaryInputTarget: 'name',
        allowedDestinations: []
      },
      expectedObservables: {}
    };

    const result = await ExperimentExecutor.executeCanaryExperiment(spec, adapter);
    expect(result.verifierResult.verdict).toBe('CONTRADICTED');
    

    const hasLeak = result.observations.some(obs => 
      obs.canaryNetworkObservations?.some(net => net.markerFound && net.url.includes('fake-third-party'))
    );
    expect(hasLeak).toBe(true);
  }, 60000);

  it('TEST E — canary-honest: Network observation finds NO leak, Verifier returns SUPPORTED', async () => {
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'CANARY',
      targetUrl: 'http://127.0.0.1:5174/?scenario=canary-honest',
      testConditions: {
        canaryInputTarget: 'name',
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
