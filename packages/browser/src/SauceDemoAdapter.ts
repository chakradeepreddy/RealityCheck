import { Page } from '@playwright/test';
import { Observation, SiteAdapter, ExperimentSpec } from '@realitycheck/contracts';

/**
 * SauceDemoAdapter — Boundary testing against the public Swag Labs / SauceDemo store.
 *
 * Public credentials: standard_user / secret_sauce (officially published by Sauce Labs)
 * https://www.saucedemo.com
 *
 * Observes: minItemPrice (lowest priced item on the inventory page)
 *
 * CONTROLLED mode: reads item prices from the inventory listing.
 * Does NOT place real orders or persist any data.
 */
export class SauceDemoAdapter implements SiteAdapter<Page> {
  id = 'saucedemo';
  version = '1.0.0';

  private static readonly BASE_URL = 'https://www.saucedemo.com';

  supports(url: string): boolean {
    return url.includes('saucedemo.com');
  }

  async navigate(page: Page, url: string): Promise<void> {
    await page.goto(SauceDemoAdapter.BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Login with official public demo credentials
    const usernameInput = page.locator('#user-name');
    const passwordInput = page.locator('#password');
    const loginBtn = page.locator('#login-button');

    await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
    await usernameInput.fill('standard_user');
    await passwordInput.fill('secret_sauce');
    await loginBtn.click();

    // Wait for inventory page
    await page.waitForURL('**/inventory.html', { timeout: 10000 });
    await page.waitForSelector('.inventory_item', { timeout: 10000 });
  }

  /**
   * For SauceDemo inventory boundary testing, no state needs to be established.
   * The adapter reads all item prices from the listing page.
   */
  async establishNumericState(_page: Page, _targetValue: number, _spec?: ExperimentSpec): Promise<void> {
    // No-op: SauceDemo adapter reads static inventory prices
  }

  async observeState(page: Page, url: string): Promise<Observation> {
    let minItemPrice = Infinity;
    let maxItemPrice = 0;
    const allPrices: number[] = [];

    try {
      const priceLocators = await page.locator('.inventory_item_price').all();

      for (const locator of priceLocators) {
        try {
          const text = await locator.textContent({ timeout: 1000 });
          if (text) {
            // e.g. "$29.99"
            const match = text.match(/\$?([\d.]+)/);
            if (match && match[1]) {
              const price = parseFloat(match[1]);
              if (!isNaN(price)) {
                allPrices.push(price);
                if (price < minItemPrice) minItemPrice = price;
                if (price > maxItemPrice) maxItemPrice = price;
              }
            }
          }
        } catch {
          // Skip individual locator errors
        }
      }
    } catch {
      // Scraping failure → return empty state
    }

    if (minItemPrice === Infinity) minItemPrice = 0;

    return {
      schemaVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      url,
      pageState: {
        minItemPrice,
        maxItemPrice,
        itemCount: allPrices.length,
        allPrices
      }
    };
  }
}
