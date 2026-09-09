import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRunner } from './BrowserRunner';
import { ExperimentSpec, SiteAdapter, Observation } from '@realitycheck/contracts';
import { Page } from '@playwright/test';

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
            url: vi.fn().mockReturnValue('https://example.com/test'),
            screenshot: vi.fn().mockResolvedValue(Buffer.from(''))
          })
        })
      })
    }
  };
});

describe('BrowserRunner generic architecture test', () => {
  let runner: BrowserRunner;

  beforeEach(() => {
    runner = new BrowserRunner();
  });

  afterEach(async () => {
    await runner.close();
    vi.clearAllMocks();
  });

  it('runs successfully using a generic mock adapter without QuickCart knowledge', async () => {
    await runner.init();

    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      targetUrl: 'https://example.com/test',
      testConditions: {
        cartSubtotalTarget: 1000
      },
      expectedObservables: {}
    };

    const mockObservations: Observation[] = [
      { schemaVersion: '1.0.0', timestamp: '1', url: 'https://example.com/test', pageState: { cartSubtotal: 999, shippingCost: 50 } },
      { schemaVersion: '1.0.0', timestamp: '2', url: 'https://example.com/test', pageState: { cartSubtotal: 1050, shippingCost: 0 } }
    ];

    let callCount = 0;

    const mockAdapter: SiteAdapter<Page> = {
      id: 'mock-site',
      version: '1.0',
      supports: () => true,
      navigate: vi.fn().mockResolvedValue(undefined),
      establishNumericState: vi.fn().mockResolvedValue(undefined),
      observeState: vi.fn().mockImplementation(async () => {
        const obs = mockObservations[callCount];
        callCount++;
        return obs;
      })
    };

    const results = await runner.runBoundaryObservation(spec, mockAdapter, spec.targetUrl, [999, 1050]);

    // Ensure the runner called the adapter correctly
    expect(mockAdapter.navigate).toHaveBeenCalledTimes(1);
    expect(mockAdapter.establishNumericState).toHaveBeenCalledTimes(2);
    expect(mockAdapter.observeState).toHaveBeenCalledTimes(2);

    // Ensure we got the structured observations back
    expect(results).toHaveLength(2);
    expect(results[0].pageState?.cartSubtotal).toBe(999);
    expect(results[1].pageState?.shippingCost).toBe(0);
  });

  it('fails closed and returns what it could observe if an adapter throws', async () => {
    await runner.init();

    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      targetUrl: 'https://example.com/fail',
      testConditions: { cartSubtotalTarget: 1000 },
      expectedObservables: {}
    };

    const mockAdapter: SiteAdapter<Page> = {
      id: 'mock-site',
      version: '1.0',
      supports: () => true,
      navigate: vi.fn().mockResolvedValue(undefined),
      establishNumericState: vi.fn().mockImplementation(async (page, val) => {
        if (val === 1050) throw new Error("Blocked by bot protection");
      }),
      observeState: vi.fn().mockResolvedValue({ schemaVersion: '1.0.0', timestamp: '1', url: 'x', pageState: { cartSubtotal: 999 } })
    };

    // 999 will succeed, 1050 will throw
    const results = await runner.runBoundaryObservation(spec, mockAdapter, spec.targetUrl, [999, 1050]);

    // It should not crash, it should return the 1 observation it got
    expect(results).toHaveLength(1);
    expect(results[0].pageState?.cartSubtotal).toBe(999);
  });
});
