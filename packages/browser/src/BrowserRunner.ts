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
}
