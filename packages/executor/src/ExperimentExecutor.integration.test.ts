import { describe, it, expect, vi } from 'vitest';
import { ExperimentExecutor } from './ExperimentExecutor';
import { SiteAdapter, ExperimentSpec, Observation } from '@realitycheck/contracts';
import { Page } from '@playwright/test';

class FakeSiteAdapter implements SiteAdapter<Page> {
  id = 'fake-adapter';
  version = '1.0.0';
  
  public throwOnNavigate = false;
  public throwOnObserve = false;
  public lastRequestedState = 0;

  supports(url: string): boolean {
    return url.includes('fake-site.com');
  }

  async navigate(page: Page, url: string): Promise<void> {
    if (this.throwOnNavigate) throw new Error("Fake navigation failed");
    // We intentionally don't call page.goto() to keep the test fast and avoid external network calls
  }

  async establishNumericState(page: Page, targetValue: number): Promise<void> {
    this.lastRequestedState = targetValue;
  }

  async observeState(page: Page, url: string): Promise<Observation> {
    if (this.throwOnObserve) throw new Error("Fake observation failed");
    
    // Simulate a transition where free shipping is achieved at >= 1000
    const shippingCost = this.lastRequestedState >= 1000 ? 0 : 50;

    return {
      schemaVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      url: 'http://fake-site.com/cart',
      pageState: {
        cartSubtotal: this.lastRequestedState,
        shippingCost
      }
    };
  }
}

describe('ExperimentExecutor Adapter Contract Integration', () => {
  it('A. Adapter injection works, Executor does not know QuickCart, and valid boundary is discovered', async () => {
    const fakeAdapter = new FakeSiteAdapter();
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'http://fake-site.com/scenario',
      testConditions: {
        cartSubtotalTarget: 999
      },
      expectedObservables: {
        shippingCost: 0
      }
    };

    const result = await ExperimentExecutor.executeBoundaryExperiment(spec, fakeAdapter);

    // The boundary in FakeSiteAdapter is 1000.
    // The claim is 999.
    // The verifier should return CONTRADICTED because 1000 !== 999.
    expect(result.verifierResult.verdict).toBe('CONTRADICTED');
    expect(result.verifierResult.observedBoundary).toBe(1000);
    // Executor returned successfully meaning injection and generic routing worked.
    expect(result.observations.length).toBeGreaterThan(0);
  });

  it('D. Adapter failure (navigate) fails closed', async () => {
    const fakeAdapter = new FakeSiteAdapter();
    fakeAdapter.throwOnNavigate = true;
    
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'http://fake-site.com/scenario',
      testConditions: {
        cartSubtotalTarget: 999
      },
      expectedObservables: {
        shippingCost: 0
      }
    };

    const result = await ExperimentExecutor.executeBoundaryExperiment(spec, fakeAdapter);

    // If navigate fails, BrowserRunner returns [] observations.
    // BoundaryEngine returns INSUFFICIENT_OBSERVATIONS.
    // Verifier returns INCONCLUSIVE.
    expect(result.observations.length).toBe(0);
    expect(result.verifierResult.verdict).toBe('INCONCLUSIVE');
  });

  it('E. Invalid ExperimentSpec fails before browser mutation', async () => {
    const fakeAdapter = new FakeSiteAdapter();
    const spec = {
      // Missing primitive, completely invalid
      schemaVersion: '1.0.0',
      targetUrl: 'http://fake-site.com/scenario'
    } as any;

    const result = await ExperimentExecutor.executeBoundaryExperiment(spec, fakeAdapter);
    expect(result.verifierResult.verdict).toBe('INCONCLUSIVE');
    expect(result.verifierResult.reason).toContain('Invalid ExperimentSpec structure');
  });
});
