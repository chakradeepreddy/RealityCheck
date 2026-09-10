import { Page } from '@playwright/test';
import { Observation, SiteAdapter } from '@realitycheck/contracts';

/**
 * QuickCartAdapter maps the generic testing operations to QuickCart's specific
 * selectors and DOM structure.
 */
export class QuickCartAdapter implements SiteAdapter<Page> {
  id = 'quickcart';
  version = '1.0.0';

  supports(url: string): boolean {
    // QuickCart is a local benchmark running on localhost:5173
    // Real implementation might check hostname or specific benchmark query params
    return url.includes('localhost:3000') || url.includes('localhost:5173') || url.includes('127.0.0.1:5173') || url.includes('quickcart');
  }

  async navigate(page: Page, url: string): Promise<void> {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    // Attempt to reset state before proceeding, if the endpoint exists
    try {
      const origin = new URL(url).origin;
      await page.request.post(`${origin}/__test/reset`);
    } catch {
      // Ignore if reset endpoint is not available
    }
  }

  async establishNumericState(page: Page, targetValue: number, spec?: import('@realitycheck/contracts').ExperimentSpec): Promise<void> {
    // QuickCart Products: 
    // p1: 999
    // p2: 1000
    // p3: 1025
    // p4: 1050
    // p5: 150
    
    // Clear any existing cart items by simply reloading the homepage
    // Since QuickCart uses React state, a full reload wipes the cart.
    // However, we MUST preserve the scenario query parameters set by the test spec!
    const currentUrl = new URL(page.url());
    const searchParams = currentUrl.search;
    const origin = currentUrl.origin;
    await page.goto(`${origin}/${searchParams}`, { waitUntil: 'domcontentloaded' });

    if (spec?.boundaryType === 'QUANTITY_DISCOUNT') {
      // targetValue represents quantity of items to add
      const products = page.locator('[data-testid="product"]');
      await products.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      const productLocator = products.first();
      for (let i = 0; i < targetValue; i++) {
        if (i === 0) {
          await productLocator.locator('[data-testid="add-to-cart"]').click();
        } else {
          await productLocator.locator('button[aria-label="Increase quantity"]').click();
        }
        await page.waitForTimeout(100);
      }
    } else {
      let targetProductId = 'p1'; // default
      if (targetValue < 999) targetProductId = 'p5'; // 150
      else if (targetValue >= 999 && targetValue < 1000) targetProductId = 'p1'; // 999
      else if (targetValue >= 1000 && targetValue < 1025) targetProductId = 'p2'; // 1000
      else if (targetValue >= 1025 && targetValue < 1050) targetProductId = 'p3'; // 1025
      else if (targetValue >= 1050) targetProductId = 'p4'; // 1050

      const products = page.locator('[data-testid="product"]');
      await products.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      const count = await products.count();
      let found = false;
      
      for (let i = 0; i < count; i++) {
        const p = products.nth(i);
        const priceText = await p.locator('.price').textContent();
        let price = 0;
        if (priceText) {
          price = parseInt(priceText.replace(/[^0-9.-]+/g, ''), 10);
        }
        
        let matched = false;
        if (targetProductId === 'p1' && price === 999) matched = true;
        if (targetProductId === 'p2' && price === 1000) matched = true;
        if (targetProductId === 'p3' && price === 1025) matched = true;
        if (targetProductId === 'p4' && price === 1050) matched = true;
        if (targetProductId === 'p5' && price === 150) matched = true;
        
        if (matched) {
          await p.locator('[data-testid="add-to-cart"]').click();
          found = true;
          break;
        }
      }
      
      if (!found) {
        throw new Error(`Could not find product matching ${targetProductId} for targetValue ${targetValue}`);
      }
    }

    // Go to cart via UI navigation to preserve React state
    await page.locator('.nav-cart-link').click();
    
    // Wait for the cart to render
    const cart = page.locator('[data-testid="cart"]');
    await cart.waitFor({ state: 'visible' });
    
    // Ensure the subtotal is visible
    const subtotalEl = page.locator('[data-testid="cart-subtotal"]');
    await subtotalEl.waitFor({ state: 'visible' });
  }

  async plantCanaryMarker(page: Page, target: string, marker: string): Promise<void> {
    if (!page.url().includes('/cart')) {
      await page.locator('.nav-cart-link').click();
    }
    const canaryInput = page.locator('[data-testid="canary-input"]');
    await canaryInput.waitFor({ state: 'visible', timeout: 5000 });
    
    await canaryInput.fill(marker);
    await page.locator('[data-testid="canary-submit"]').click();
    
    // Wait for status message
    await page.locator('.canary-status').waitFor({ state: 'visible' });
  }

  async observeState(page: Page, url: string): Promise<Observation> {
    // Ensure we are on the cart page
    if (!page.url().includes('/cart')) {
      await page.locator('.nav-cart-link').click();
    }

    // Check if inconclusive forced
    const inconclusive = page.locator('[data-testid="forced-inconclusive"]');
    if (await inconclusive.isVisible().catch(() => false)) {
      return {
        schemaVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        url: url,
        pageState: {}
      };
    }

    const subtotalLocator = page.locator('[data-testid="cart-subtotal"]');
    let cartSubtotal: number | undefined = undefined;
    let shippingCost: number | undefined = undefined;
    let discountApplied: boolean | undefined = undefined;
    let discountValue: number | undefined = undefined;

    if (await subtotalLocator.isVisible().catch(() => false)) {
      const subtotalText = await subtotalLocator.textContent();
      const shippingText = await page.locator('[data-testid="shipping-cost"]').textContent();
      const discountText = await page.locator('[data-testid="discount"]').textContent().catch(() => null);
      
      cartSubtotal = subtotalText ? parseInt(subtotalText.replace(/[^0-9.-]+/g, ''), 10) : undefined;

      if (shippingText) {
        if (shippingText.toLowerCase().includes('free') || shippingText === '₹0' || shippingText === '0') {
          shippingCost = 0;
        } else {
          shippingCost = parseInt(shippingText.replace(/[^0-9.-]+/g, ''), 10);
        }
      }

      if (discountText) {
        const parsed = parseInt(discountText.replace(/[^0-9.-]+/g, ''), 10);
        if (parsed > 0) {
          discountApplied = true;
          discountValue = parsed;
        } else {
          discountApplied = false;
          discountValue = 0;
        }
      } else {
         discountApplied = false;
      }
    }

    return {
      schemaVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      url: url,
      pageState: {
        cartSubtotal,
        shippingCost,
        discountApplied,
        discountValue
      }
    };
  }
}
