import { Page } from '@playwright/test';
import { Observation, SiteAdapter, ExperimentSpec } from '@realitycheck/contracts';

/**
 * TricentisAdapter — Boundary + Canary testing against Tricentis Demo Web Shop.
 *
 * Tricentis Demo Web Shop is an explicitly authorized test automation sandbox.
 * https://demowebshop.tricentis.com/
 *
 * Boundary: Reads product prices from the catalog (.actual-price).
 *           Observes: minPrice and maxPrice.
 *
 * Canary: Plants a unique synthetic marker into the search box, then observes
 *         outbound network requests (such as analytics or autocomplete APIs) 
 *         to detect if the marker leaks to unauthorized domains.
 */
export class TricentisAdapter implements SiteAdapter<Page> {
  id = 'tricentis';
  version = '1.0.0';

  supports(url: string): boolean {
    return url.includes('demowebshop.tricentis.com');
  }

  async navigate(page: Page, url: string): Promise<void> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
  }

  /**
   * Boundary mode: No setup required, just read the product listing.
   */
  async establishNumericState(_page: Page, _targetValue: number, _spec?: ExperimentSpec): Promise<void> {
    // No-op
  }

  async observeState(page: Page, url: string): Promise<Observation> {
    let minPrice = Infinity;
    let maxPrice = 0;
    const allPrices: number[] = [];
    let productCount = 0;

    try {
      const priceLocators = await page.locator('.actual-price').all();
      productCount = priceLocators.length;

      for (const locator of priceLocators) {
        try {
          const text = await locator.textContent({ timeout: 1000 });
          if (text) {
            const match = text.match(/([\d.]+)/);
            if (match && match[1]) {
              const price = parseFloat(match[1]);
              if (!isNaN(price) && price > 0) {
                allPrices.push(price);
                if (price < minPrice) minPrice = price;
                if (price > maxPrice) maxPrice = price;
              }
            }
          }
        } catch {
          // Skip individual locator errors
        }
      }
    } catch {
      // Scraping failure
    }

    if (minPrice === Infinity) minPrice = 0;

    return {
      schemaVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      url,
      pageState: {
        minPrice,
        maxPrice,
        productCount,
        allPrices
      }
    };
  }

  /**
   * Canary: plant a unique marker in the search box.
   */
  async plantCanaryMarker(page: Page, target: string, marker: string): Promise<void> {
    const searchInput = page.locator('#small-searchterms');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill(marker);
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);
  }
}
