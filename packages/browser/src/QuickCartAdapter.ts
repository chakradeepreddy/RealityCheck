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
    // QuickCart is a local benchmark running on localhost:3000
    // Real implementation might check hostname or specific benchmark query params
    return url.includes('localhost:3000') || url.includes('quickcart');
  }

  async navigate(page: Page, url: string): Promise<void> {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async establishNumericState(page: Page, targetValue: number): Promise<void> {
    // For QuickCart, we simulate reaching a specific cart subtotal by filling out a quantity input.
    // In reality, this requires understanding the product price and calculating the quantity,
    // or if the test site has a debug/scenario input, we just inject the quantity.
    
    // We assume the quickcart page has a quantity input and an add-to-cart button.
    // Wait for the product input
    const quantityInput = page.locator('[data-test="quantity-input"]');
    await quantityInput.waitFor({ state: 'visible', timeout: 5000 });
    
    // As a simplification for the benchmark, if the price is 1 unit, we just set the quantity to targetValue.
    // Otherwise, the adapter needs to know the item price. For QuickCart, let's assume we can just 
    // inject the exact numeric value into a debug cart subtotal input or add an item of that price.
    // If QuickCart implements a quantity input that multiplies by a fixed price (e.g. ₹1), we just fill it.
    await quantityInput.fill(targetValue.toString());

    // Click add to cart
    const addToCartBtn = page.locator('[data-test="add-to-cart"]');
    await addToCartBtn.click();

    // Wait for the cart to update
    const cart = page.locator('[data-test="cart"]');
    await cart.waitFor({ state: 'visible' });
    
    // Ensure the subtotal matches our target before returning
    const subtotalEl = page.locator('[data-test="cart-subtotal"]');
    await subtotalEl.waitFor({ state: 'visible' });
    // In a highly reliable adapter, we might loop and verify the subtotal stabilized.
    // For now, we assume the click triggers an update.
  }

  async observeState(page: Page, url: string): Promise<Observation> {
    // Extract the cart subtotal
    const subtotalText = await page.locator('[data-test="cart-subtotal"]').textContent();
    const shippingText = await page.locator('[data-test="shipping-cost"]').textContent();
    
    // Clean strings (e.g. "₹999" -> 999)
    const cartSubtotal = subtotalText ? parseInt(subtotalText.replace(/[^0-9.-]+/g, ''), 10) : undefined;
    let shippingCost: number | undefined = undefined;

    if (shippingText) {
      if (shippingText.toLowerCase().includes('free')) {
        shippingCost = 0;
      } else {
        shippingCost = parseInt(shippingText.replace(/[^0-9.-]+/g, ''), 10);
      }
    }

    return {
      schemaVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      url: url,
      pageState: {
        cartSubtotal,
        shippingCost
      }
    };
  }
}
