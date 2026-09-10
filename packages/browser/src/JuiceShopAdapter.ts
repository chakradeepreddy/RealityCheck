import { Page } from '@playwright/test';
import { Observation, SiteAdapter, ExperimentSpec } from '@realitycheck/contracts';

/**
 * JuiceShopAdapter — Boundary + Canary testing against the OWASP Juice Shop.
 *
 * OWASP Juice Shop is an intentionally vulnerable web application designed for security testing.
 * It is explicitly authorized for automated testing: https://owasp.org/www-project-juice-shop/
 *
 * Boundary: Reads product prices from the product listing (/.mat-card elements).
 *           Observes: minPrice (cheapest product on the storefront)
 *
 * Canary: Plants a unique synthetic marker into the search box, then observes
 *         network requests to detect if the marker leaks to unauthorized domains.
 *         Allowed destination: juice-shop.herokuapp.com (the app's own API)
 */
export class JuiceShopAdapter implements SiteAdapter<Page> {
  id = 'juice-shop';
  version = '1.0.0';

  supports(url: string): boolean {
    return url.includes('juice-shop.herokuapp.com') || url.includes('owasp-juice.shop');
  }

  async navigate(page: Page, url: string): Promise<void> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Dismiss cookie banner if present
    try {
      const cookieBtn = page.locator('button:has-text("Me want it!")');
      await cookieBtn.waitFor({ state: 'visible', timeout: 3000 });
      await cookieBtn.click();
    } catch {
      // No cookie banner
    }
    // Wait for products to load
    await page.waitForTimeout(5000);
  }

  /**
   * Boundary mode: no state establishment needed — reads static product prices.
   */
  async establishNumericState(_page: Page, _targetValue: number, _spec?: ExperimentSpec): Promise<void> {
    // No-op: Juice Shop adapter reads static product listing data
  }

  async observeState(page: Page, url: string): Promise<Observation> {
    let minPrice = Infinity;
    let maxPrice = 0;
    const allPrices: number[] = [];
    let productCount = 0;

    try {
      // Wait for product cards
      await page.waitForSelector('.mat-card', { timeout: 8000 }).catch(() => {});
      const cards = await page.locator('.mat-card').all();
      productCount = cards.length;

      for (const card of cards) {
        try {
          // Price is in a <span> with format "1.99 ¤" or "$1.99"
          const priceText = await card.locator('.item-price, [class*="price"]').first().textContent({ timeout: 1000 }).catch(() => '');
          if (priceText) {
            const match = priceText.match(/([\d.]+)/);
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
          // Skip individual card errors
        }
      }
    } catch {
      // Scraping failure → return empty state
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
   * Canary: plant a unique marker in the Juice Shop search box.
   * The search calls the app's own /rest/products/search API — we verify
   * the marker doesn't escape to third-party domains.
   */
  async plantCanaryMarker(page: Page, target: string, marker: string): Promise<void> {
    // Navigate to search
    const searchInput = page.locator('#searchQuery, input[id="searchQuery"], .search-field input, mat-search-bar input').first();

    try {
      // Click the search icon to expand search bar
      const searchIcon = page.locator('[aria-label="Search"]').first();
      await searchIcon.waitFor({ state: 'visible', timeout: 5000 });
      await searchIcon.click();
      await page.waitForTimeout(500);
    } catch {
      // Search bar may already be expanded
    }

    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill(marker);

    // Trigger search
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);
  }
}
