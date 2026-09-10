import { Page } from '@playwright/test';
import { Observation, SiteAdapter, ExperimentSpec } from '@realitycheck/contracts';

/**
 * FlipkartAdapter — Boundary testing against Flipkart product search results.
 *
 * Observes: maxDiscountPercent (highest "% off" badge found on the search listing page)
 *
 * Safe read-only adapter: does NOT add to cart, login, or bypass any bot protection.
 * Relies solely on publicly visible listing DOM that loads without authentication.
 */
export class FlipkartAdapter implements SiteAdapter<Page> {
  id = 'flipkart';
  version = '1.0.0';

  supports(url: string): boolean {
    return url.includes('flipkart.com');
  }

  async navigate(page: Page, url: string): Promise<void> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for product grid to appear
    await page.waitForTimeout(3000);
  }

  /**
   * For Flipkart, establishNumericState is a no-op because we read listing-level
   * data (discount percentages) and don't need to set up cart state.
   * The targetValue is used by BoundaryEngine but page doesn't need changing.
   */
  async establishNumericState(_page: Page, _targetValue: number, _spec?: ExperimentSpec): Promise<void> {
    // No-op: Flipkart adapter reads static listing data, no state establishment needed
  }

  async observeState(page: Page, url: string): Promise<Observation> {
    let maxDiscountPercent = 0;
    let discountCount = 0;

    try {
      // Flipkart renders discount badges as "X% off" text nodes
      const discountLocators = await page.locator('text=% off').all();
      discountCount = discountLocators.length;

      for (const locator of discountLocators) {
        try {
          const text = await locator.textContent({ timeout: 1000 });
          if (text) {
            // e.g. "27% off" or "27%off"
            const match = text.match(/(\d+)\s*%\s*off/i);
            if (match && match[1]) {
              const pct = parseInt(match[1], 10);
              if (!isNaN(pct) && pct > maxDiscountPercent) {
                maxDiscountPercent = pct;
              }
            }
          }
        } catch {
          // Skip individual locator errors
        }
      }
    } catch {
      // If discount scraping fails entirely, return 0
    }

    return {
      schemaVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      url,
      pageState: {
        maxDiscountPercent,
        discountCount
      }
    };
  }
}
