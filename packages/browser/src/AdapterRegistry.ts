import { SiteAdapter } from '@realitycheck/contracts';
import { Page } from '@playwright/test';

export class AdapterRegistry {
  private static adapters: Set<SiteAdapter<Page>> = new Set();

  /**
   * Registers a SiteAdapter for use by the generic execution engine.
   */
  static register(adapter: SiteAdapter<Page>): void {
    // Avoid duplicate registrations
    for (const a of this.adapters) {
      if (a.id === adapter.id) {
        throw new Error(`Adapter with id ${adapter.id} is already registered.`);
      }
    }
    this.adapters.add(adapter);
  }

  /**
   * Resolves the correct SiteAdapter for a given target URL.
   * Throws an error if no authorized adapter supports the URL.
   */
  static resolve(url: string): SiteAdapter<Page> {
    for (const adapter of this.adapters) {
      if (adapter.supports(url)) {
        return adapter;
      }
    }
    throw new Error(`No registered SiteAdapter supports the URL: ${url}. The target website must be explicitly authorized and implemented.`);
  }

  /**
   * Clears all registered adapters (useful for testing).
   */
  static clear(): void {
    this.adapters.clear();
  }
}
