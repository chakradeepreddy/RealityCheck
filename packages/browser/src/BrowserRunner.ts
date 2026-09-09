import { chromium, Browser, Page } from '@playwright/test';
import { ExperimentSpec, Observation, SiteAdapter } from '@realitycheck/contracts';

/**
 * Generic runner for executing reality checks in the browser.
 * It is completely unaware of the target site's DOM structure.
 */
export class BrowserRunner {
  private browser: Browser | null = null;

  async init() {
    this.browser = await chromium.launch({ headless: true });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Run a boundary observation experiment.
   * 
   * @param spec The verified experiment spec.
   * @param adapter The site adapter that knows how to interact with the target site.
   * @param targetUrl The URL to navigate to.
   * @param probeStates The numeric states to probe (e.g. cart subtotals: [999, 1000, 1050]).
   */
  async runBoundaryObservation(
    spec: ExperimentSpec,
    adapter: SiteAdapter<Page>,
    targetUrl: string,
    probeStates: number[]
  ): Promise<Observation[]> {
    if (!this.browser) {
      throw new Error("BrowserRunner is not initialized.");
    }

    const context = await this.browser.newContext();
    const page = await context.newPage();
    const observations: Observation[] = [];

    try {
      // 1. Navigate to the initial page
      try {
        await adapter.navigate(page, targetUrl);
      } catch (err) {
        // Fail closed on navigation error
        return [];
      }

      // 2. Iterate through requested probe states
      for (const state of probeStates) {
        try {
          // Establish the state using the adapter
          await adapter.establishNumericState(page, state);

          // Give the page a moment to stabilize network/DOM if the adapter didn't fully await it
          await page.waitForLoadState('domcontentloaded');

          // Read the state to generate an observation
          const observation = await adapter.observeState(page, page.url());
          observations.push(observation);
        } catch (err) {
          // If a state cannot be established or observed, we log it and potentially continue or stop,
          // but we do not manufacture evidence. We return whatever we successfully observed.
          console.warn(`Failed to establish or observe state ${state}:`, err);
        }
      }
    } finally {
      await page.close();
      await context.close();
    }

    return observations;
  }

  /**
   * Run a canary network observation experiment.
   */
  async runCanaryObservation(
    spec: ExperimentSpec,
    adapter: SiteAdapter<Page>,
    targetUrl: string,
    target: string,
    marker: string
  ): Promise<Observation[]> {
    if (!this.browser) {
      throw new Error("BrowserRunner is not initialized.");
    }
    if (!adapter.plantCanaryMarker) {
      throw new Error(`Adapter ${adapter.id} does not support planting canary markers.`);
    }

    const context = await this.browser.newContext();
    const page = await context.newPage();
    const networkObservations: { url: string, method: string, markerFound: boolean }[] = [];

    // Attach network listener
    page.on('request', request => {
      const url = request.url();
      const method = request.method();
      const headers = JSON.stringify(request.headers());
      const postData = request.postData() || '';

      const markerFound = url.includes(marker) || headers.includes(marker) || postData.includes(marker);
      
      networkObservations.push({
        url,
        method,
        markerFound
      });
    });

    try {
      // 1. Navigate to the initial page
      await adapter.navigate(page, targetUrl);

      // 2. Plant the marker
      await adapter.plantCanaryMarker(page, target, marker);

      // 3. Wait for network to stabilize
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch (e) {
        // Ignore timeout if page doesn't reach network idle perfectly
      }
      
      // We also take a regular observation for evidence
      const observation = await adapter.observeState(page, page.url());
      observation.canaryNetworkObservations = networkObservations;
      return [observation];

    } catch (err: any) {
      console.warn(`Failed to execute canary run:`, err);
      // Return empty observation list on catastrophic failure (Fail Closed)
      return [];
    } finally {
      await page.close();
      await context.close();
    }
  }
}
