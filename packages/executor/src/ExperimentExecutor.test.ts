import { describe, it, expect, vi } from 'vitest';
import { ExperimentExecutor } from './ExperimentExecutor';
import { ExperimentSpec, SiteAdapter, Observation } from '@realitycheck/contracts';
import { BoundaryEngine } from '@realitycheck/engines';
import { DeterministicVerifier } from '@realitycheck/verifier';

// Mock playwright so we don't actually launch a browser during unit tests
vi.mock('@playwright/test', () => {
  return {
    chromium: {
      launch: vi.fn().mockResolvedValue({
        close: vi.fn().mockResolvedValue(undefined),
        newContext: vi.fn().mockResolvedValue({
          close: vi.fn().mockResolvedValue(undefined),
          newPage: vi.fn().mockResolvedValue({
            close: vi.fn().mockResolvedValue(undefined),
            waitForLoadState: vi.fn().mockResolvedValue(undefined),
            url: vi.fn().mockReturnValue('https://example.com/test')
          })
        })
      })
    }
  };
});

// We intentionally do not import QuickCartAdapter or any QuickCart specific logic here.

describe('ExperimentExecutor generic pipeline tests', () => {
  it('A. HONEST -> SUPPORTED: executes the full end to end pipeline gracefully', async () => {
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'https://example.com/honest',
      testConditions: { cartSubtotalTarget: 999 },
      expectedObservables: {}
    };

    const mockAdapter: SiteAdapter<any> = {
      id: 'mock',
      version: '1',
      navigate: vi.fn(),
      establishNumericState: vi.fn(),
      observeState: vi.fn().mockImplementation(async (page, url) => {
        // Return 50 shipping for lower bound, 0 for 999
        return {
          schemaVersion: '1.0.0',
          timestamp: '1',
          url,
          pageState: {
            // Note: Since the executor orchestrates, it uses the probe states from the runner loop.
            // We'll just fake the sequence based on how many times observeState is called.
            cartSubtotal: 0, // Gets replaced below
            shippingCost: 0
          }
        };
      })
    };
    
    // Stub observeState to return appropriate sequence based on probe state inputs (which happens in the Runner)
    // Actually the runner passes probeStates: [500, 999]. Let's match those.
    let callIndex = 0;
    const sequence = [
      { cartSubtotal: 500, shippingCost: 50 },
      { cartSubtotal: 999, shippingCost: 0 }
    ];
    mockAdapter.observeState = vi.fn().mockImplementation(async () => {
      const state = sequence[callIndex++];
      return { schemaVersion: '1.0.0', timestamp: '1', url: 'x', pageState: state };
    });

    const result = await ExperimentExecutor.executeBoundaryExperiment(spec, mockAdapter, [500, 999]);

    expect(result.verifierResult.verdict).toBe('SUPPORTED');
    expect(result.verifierResult.claimedBoundary).toBe(999);
    expect(result.verifierResult.observedBoundary).toBe(999);
  });

  it('B. CONTRADICTED: returns contradicted when the actual boundary differs', async () => {
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'https://example.com/contradicted',
      testConditions: { cartSubtotalTarget: 999 },
      expectedObservables: {}
    };

    const mockAdapter: SiteAdapter<any> = {
      id: 'mock',
      version: '1',
      navigate: vi.fn(),
      establishNumericState: vi.fn(),
      observeState: vi.fn()
    };
    
    let callIndex = 0;
    const sequence = [
      { cartSubtotal: 999, shippingCost: 50 }, // Did not get free shipping at 999
      { cartSubtotal: 1050, shippingCost: 0 } // Got free shipping at 1050
    ];
    mockAdapter.observeState = vi.fn().mockImplementation(async () => {
      const state = sequence[callIndex++];
      return { schemaVersion: '1.0.0', timestamp: '1', url: 'x', pageState: state };
    });

    const result = await ExperimentExecutor.executeBoundaryExperiment(spec, mockAdapter, [999, 1050]);

    expect(result.verifierResult.verdict).toBe('CONTRADICTED');
    expect(result.verifierResult.claimedBoundary).toBe(999);
    expect(result.verifierResult.observedBoundary).toBe(1050);
  });

  it('C. INCONCLUSIVE: insufficient evidence produces inconclusive safely', async () => {
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'https://example.com/inconclusive',
      testConditions: { cartSubtotalTarget: 999 },
      expectedObservables: {}
    };

    const mockAdapter: SiteAdapter<any> = {
      id: 'mock',
      version: '1',
      navigate: vi.fn(),
      establishNumericState: vi.fn(),
      observeState: vi.fn()
    };
    
    // Everything is free shipping, so no boundary is established
    let callIndex = 0;
    const sequence = [
      { cartSubtotal: 500, shippingCost: 0 }, 
      { cartSubtotal: 999, shippingCost: 0 } 
    ];
    mockAdapter.observeState = vi.fn().mockImplementation(async () => {
      const state = sequence[callIndex++];
      return { schemaVersion: '1.0.0', timestamp: '1', url: 'x', pageState: state };
    });

    const result = await ExperimentExecutor.executeBoundaryExperiment(spec, mockAdapter, [500, 999]);

    expect(result.verifierResult.verdict).toBe('INCONCLUSIVE');
  });

  it('D. INVALID SPEC prevents browser execution and fails safely', async () => {
    const spec: any = {
      schemaVersion: '9.9.9', // invalid
      primitive: 'INVALID'
    };

    const mockAdapter: SiteAdapter<any> = {
      id: 'mock',
      version: '1',
      navigate: vi.fn(),
      establishNumericState: vi.fn(),
      observeState: vi.fn()
    };

    const result = await ExperimentExecutor.executeBoundaryExperiment(spec, mockAdapter, [999]);

    expect(result.verifierResult.verdict).toBe('INCONCLUSIVE');
    expect(result.verifierResult.reason).toContain('Invalid ExperimentSpec structure');
    expect(mockAdapter.navigate).not.toHaveBeenCalled();
  });

  it('E. BROWSER FAILURE fails closed safely', async () => {
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'https://example.com/fail',
      testConditions: { cartSubtotalTarget: 999 },
      expectedObservables: {}
    };

    const mockAdapter: SiteAdapter<any> = {
      id: 'mock',
      version: '1',
      navigate: vi.fn().mockRejectedValue(new Error('Browser crashed')),
      establishNumericState: vi.fn(),
      observeState: vi.fn()
    };

    const result = await ExperimentExecutor.executeBoundaryExperiment(spec, mockAdapter, [500, 999]);

    // Although the browser failure is gracefully handled in BrowserRunner, the lack of valid observations 
    // forces the engine to return INSUFFICIENT_OBSERVATIONS, which the Verifier translates to INCONCLUSIVE.
    // (Or the runner might bubble an error. Our runner catches Navigation errors and returns empty arrays).
    expect(result.verifierResult.verdict).toBe('INCONCLUSIVE');
    expect(result.observations.length).toBe(0);
  });

  it('F. PROVE data flow delegation', async () => {
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'https://example.com/honest',
      testConditions: { cartSubtotalTarget: 999 },
      expectedObservables: {}
    };

    const mockAdapter: SiteAdapter<any> = {
      id: 'mock',
      version: '1',
      navigate: vi.fn(),
      establishNumericState: vi.fn(),
      observeState: vi.fn().mockResolvedValue({
        schemaVersion: '1.0.0',
        timestamp: '1',
        url: 'x',
        pageState: { cartSubtotal: 999, shippingCost: 0 }
      })
    };

    const boundarySpy = vi.spyOn(BoundaryEngine, 'analyzeNumericThreshold');
    const verifierSpy = vi.spyOn(DeterministicVerifier, 'verifyBoundary');

    await ExperimentExecutor.executeBoundaryExperiment(spec, mockAdapter, [500, 999]);

    expect(boundarySpy).toHaveBeenCalled();
    expect(verifierSpy).toHaveBeenCalled();
  });
});
