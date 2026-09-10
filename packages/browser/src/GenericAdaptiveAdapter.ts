import { Page, Locator } from '@playwright/test';
import { Observation, SiteAdapter, ExperimentSpec, CapabilityResult } from '@realitycheck/contracts';

interface Candidate<T> {
  element: Locator;
  data: T;
  confidence: number;
  reason: string;
}

interface Capability {
  supported: boolean;
  confidence: number;
}

interface ProductData {
  name: string;
  price: number;
  addAction: Locator;
}

interface CartNavData {
  action: 'click' | 'navigate';
  target: string | Locator;
}

interface CanaryInputData {
  input: Locator;
  submitBtn: Locator;
}

interface Playbook {
  capabilities: {
    productDiscovery: Capability;
    cartNavigation: Capability;
    quantityControl: Capability;
    canaryInput: Capability;
    observation: Capability;
  };
  products: Candidate<ProductData>[];
  cartNavigation?: Candidate<CartNavData>;
  canaryInput?: Candidate<CanaryInputData>;
}

export class GenericAdaptiveAdapter implements SiteAdapter<Page> {
  id = 'generic-adaptive';
  version = '1.0.0';

  supports(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
  }

  async discoverCapabilities(page: Page, url: string, spec: ExperimentSpec): Promise<CapabilityResult> {
    try {
      await this.navigate(page, url);
      const playbook = await this.buildPlaybook(page);

      if (spec.primitive === 'BOUNDARY') {
        if (!playbook.capabilities.productDiscovery.supported) {
          return { isTestable: false, reason: 'NOT_TESTABLE: Target website does not support product discovery or prices are unreliable.' };
        }
        if (!playbook.capabilities.cartNavigation.supported) {
          return { isTestable: false, reason: 'NOT_TESTABLE: Target website does not support cart navigation or observation.' };
        }
        if (spec.boundaryType === 'QUANTITY_DISCOUNT' && !playbook.capabilities.quantityControl.supported) {
          return { isTestable: false, reason: 'NOT_TESTABLE: Target website does not support quantity control.' };
        }
      } else if (spec.primitive === 'CANARY') {
        if (!playbook.capabilities.canaryInput.supported) {
          // If no canary input on homepage, check if we can navigate to cart to find one
          if (playbook.capabilities.cartNavigation.supported && playbook.cartNavigation?.data?.target) {
            await (playbook.cartNavigation.data.target as Locator).click().catch(() => {});
            try { await page.waitForLoadState('networkidle', { timeout: 2000 }); } catch {}
            const cartPlaybook = await this.buildPlaybook(page);
            if (!cartPlaybook.capabilities.canaryInput.supported) {
               return { isTestable: false, reason: 'NOT_TESTABLE: Target website does not expose suitable inputs for canary planting even after cart navigation.' };
            }
          } else {
            return { isTestable: false, reason: 'NOT_TESTABLE: Target website does not expose suitable inputs for canary planting.' };
          }
        }
      }

      return { isTestable: true };
    } catch (e: any) {
      return { isTestable: false, reason: `NOT_TESTABLE: Discovery failed due to network or navigation error: ${e.message}` };
    }
  }

  async navigate(page: Page, url: string): Promise<void> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Generic cookie banner dismissal
    try {
      const cookieBtn = page.locator('button, a, [role="button"]').filter({ hasText: /accept|agree|got it|allow all/i }).first();
      if (await cookieBtn.isVisible({ timeout: 2000 })) {
        await cookieBtn.click();
      }
    } catch {
      // Ignore
    }
  }

  private extractPriceFromString(txt: string): number | null {
    // Match common currency formats: $1,234.56, €1.234,56, 1234.56 USD
    const match = txt.match(/[$₹€£]\s?(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)|(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)\s?[$₹€£]/);
    if (match) {
      let valStr = match[1] || match[2];
      // Normalize commas/dots
      if (valStr.includes(',') && valStr.includes('.')) {
         valStr = valStr.replace(/,/g, '');
      } else if (valStr.includes(',')) {
         if (valStr.match(/,\d{2}$/)) { // 1.234,56
             valStr = valStr.replace(/\./g, '').replace(',', '.');
         } else { // 1,234
             valStr = valStr.replace(/,/g, '');
         }
      }
      const val = parseFloat(valStr);
      if (!isNaN(val)) return val;
    }
    return null;
  }

  private async buildPlaybook(page: Page): Promise<Playbook> {
    const playbook: Playbook = {
      capabilities: {
        productDiscovery: { supported: false, confidence: 0 },
        cartNavigation: { supported: false, confidence: 0 },
        quantityControl: { supported: false, confidence: 0 },
        canaryInput: { supported: false, confidence: 0 },
        observation: { supported: false, confidence: 0 }
      },
      products: []
    };

    // 1. Discover Products
    const containers = await page.locator('article, li, div[role="listitem"], [class*="product" i], [class*="item" i], [data-testid*="product" i], [data-testid*="item" i], [data-product], [data-item]').all();
    
    for (const container of containers) {
      try {
        if (!await container.isVisible()) continue;

        const buttons = await container.locator('button, a[role="button"], [role="button"]').all();
        let addAction: Locator | null = null;
        let actionConfidence = 0;

        for (const btn of buttons) {
          const text = (await btn.textContent())?.toLowerCase() || '';
          const ariaLabel = (await btn.getAttribute('aria-label'))?.toLowerCase() || '';
          
          if (text.includes('add') || text.includes('buy') || ariaLabel.includes('add to cart')) {
            addAction = btn;
            actionConfidence = 50;
            if (text.includes('cart') || ariaLabel.includes('cart') || ariaLabel.includes('basket')) {
               actionConfidence += 40;
            }
            break;
          }
        }

        if (!addAction) continue;

        // Find price inside container
        const textNodes = await container.locator('*:not(:has(*))').all(); // Leaf nodes
        let price: number | null = null;
        let name: string = 'Unknown Product';
        
        // Find title - usually a heading
        const heading = container.locator('h1, h2, h3, h4, h5, h6').first();
        if (await heading.isVisible()) {
          name = (await heading.textContent())?.trim() || name;
        }

        for (const node of textNodes) {
           const txt = (await node.textContent()) || '';
           const p = this.extractPriceFromString(txt);
           if (p !== null) {
              price = p;
              break;
           }
        }

        if (price !== null && addAction) {
           playbook.products.push({
             element: container,
             data: { name, price, addAction },
             confidence: actionConfidence,
             reason: 'Semantic product container with price and action'
           });
        }
      } catch {}
    }

    if (playbook.products.length > 0) {
      playbook.capabilities.productDiscovery = { supported: true, confidence: 100 };
    }

    // 2. Discover Cart Navigation
    const navCandidates = await page.locator('a, button, [role="button"]').all();
    for (const nav of navCandidates) {
      try {
        if (!await nav.isVisible()) continue;
        const text = (await nav.textContent())?.toLowerCase() || '';
        const href = (await nav.getAttribute('href'))?.toLowerCase() || '';
        const ariaLabel = (await nav.getAttribute('aria-label'))?.toLowerCase() || '';
        
        // Exclude product additions
        if (text.includes('add') || ariaLabel.includes('add')) continue;

        let score = 0;
        if (href.includes('cart') || href.includes('checkout') || href.includes('basket')) score += 50;
        if (text.includes('cart') || text.includes('basket') || text.includes('checkout')) score += 30;
        if (ariaLabel.includes('cart') || ariaLabel.includes('basket') || ariaLabel.includes('checkout')) score += 40;

        if (score > 40) {
          playbook.cartNavigation = {
            element: nav,
            data: { action: 'click', target: nav },
            confidence: score,
            reason: `Semantic cart markers found with score ${score}`
          };
          playbook.capabilities.cartNavigation = { supported: true, confidence: score };
          break; // take highest/first confident
        }
      } catch {}
    }

    // 3. Discover Quantity Control
    const quantityInputs = await page.locator('input[type="number"], select, [aria-label*="quantity" i], [name*="qty" i]').all();
    for (const q of quantityInputs) {
      if (await q.isVisible()) {
        playbook.capabilities.quantityControl = { supported: true, confidence: 80 };
        break;
      }
    }

    // 4. Discover Canary Input
    const textInputs = await page.locator('input[type="text"], input[type="search"], textarea, [contenteditable="true"]').all();
    for (const ti of textInputs) {
      if (await ti.isVisible()) {
        playbook.capabilities.canaryInput = { supported: true, confidence: 90 };
        break;
      }
    }

    return playbook;
  }

  async establishNumericState(page: Page, targetValue: number, spec?: ExperimentSpec): Promise<void> {
    if (!spec) return;
    if (spec.testConditions.observableInputKey != null && spec.testConditions.observableInputKey === spec.testConditions.observableOutputKey) return; // Read-only

    await page.context().clearCookies();
    const currentUrl = new URL(page.url());
    await page.goto(`${currentUrl.origin}/${currentUrl.search}`, { waitUntil: 'domcontentloaded' });

    const playbook = await this.buildPlaybook(page);

    if (spec.boundaryType === 'QUANTITY_DISCOUNT') {
      if (!playbook.capabilities.productDiscovery.supported || playbook.products.length === 0) {
        throw new Error('NOT_TESTABLE: Cannot establish QUANTITY state: No products discovered.');
      }
      
      // Use highest confidence product
      playbook.products.sort((a, b) => b.confidence - a.confidence);
      const product = playbook.products[0];
      
      await product.data.addAction.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      
      if (!playbook.cartNavigation) {
        throw new Error("NOT_TESTABLE: Could not discover cart navigation to set quantity.");
      }
      
      const navLoc = playbook.cartNavigation.data.target as Locator;
      await navLoc.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      
      const quantityInputs = await page.locator('input[type="number"], input[type="text"][name*="qty" i], input[type="text"][name*="quantity" i], input[aria-label*="quantity" i]').all();
      let qtyInputFound = false;
      for (const qInput of quantityInputs) {
         if (await qInput.isVisible().catch(() => false)) {
            await qInput.fill(targetValue.toString());
            await qInput.press('Enter').catch(() => {});
            await page.waitForLoadState('networkidle').catch(() => {});
            qtyInputFound = true;
            break;
         }
      }
      
      if (!qtyInputFound) {
        throw new Error("NOT_TESTABLE: Could not discover cart quantity input to establish target state.");
      }

    } else if (spec.boundaryType === 'NUMERIC_THRESHOLD') {
      if (!playbook.capabilities.productDiscovery.supported || playbook.products.length === 0) {
        throw new Error('NOT_TESTABLE: Cannot establish NUMERIC state: No products discovered.');
      }

      const prices = playbook.products.map(p => p.data.price);
      const selection = this.findProductCombination(prices, targetValue);
      
      if (!selection || selection.length === 0) {
        throw new Error(`Cannot reach exact target ${targetValue} with discovered prices: ${prices.join(', ')}`);
      }

      for (const count of selection) {
        const product = playbook.products[count.index];
        for (let i = 0; i < count.quantity; i++) {
          await product.data.addAction.click();
          await page.waitForLoadState('networkidle').catch(() => {});
        }
      }
      
      if (!playbook.cartNavigation) {
        throw new Error("NOT_TESTABLE: Could not discover cart navigation.");
      }
      
      const navLoc = playbook.cartNavigation.data.target as Locator;
      await navLoc.click();
      await page.waitForLoadState('networkidle').catch(() => {});
    }
  }

  private findProductCombination(prices: number[], target: number): { index: number, quantity: number }[] | null {
    let bestResult: { index: number, quantity: number }[] | null = null;
    let minDiff = Infinity;
    const maxItems = 10; 
    
    const sortedIndices = prices.map((p, i) => i).sort((a, b) => prices[b] - prices[a]);
    
    const search = (currentIdx: number, currentSum: number, counts: number[], items: number) => {
      const absDiff = Math.abs(currentSum - target);
      if (absDiff < minDiff && currentSum > 0) {
        minDiff = absDiff;
        bestResult = counts.map((qty, idx) => ({ index: idx, quantity: qty })).filter(c => c.quantity > 0);
      }
      
      if (items >= maxItems) return;
      if (currentSum >= target) return; // Adding more items will only increase the sum further away from target
      
      if (currentIdx >= sortedIndices.length) return;
      
      const pIdx = sortedIndices[currentIdx];
      const p = prices[pIdx];
      
      counts[pIdx]++;
      search(currentIdx, currentSum + p, counts, items + 1);
      
      counts[pIdx]--;
      search(currentIdx + 1, currentSum, counts, items);
    };
    
    search(0, 0, new Array(prices.length).fill(0), 0);
    return bestResult; // Returns closest match (under or over target)
  }

  async plantCanaryMarker(page: Page, target: string, marker: string): Promise<void> {
    const playbook = await this.buildPlaybook(page);
    if (!page.url().includes('cart') && !page.url().includes('checkout')) {
      if (playbook.cartNavigation) {
         const navLoc = playbook.cartNavigation.data.target as Locator;
         await navLoc.click().catch(() => {});
         try { await page.waitForLoadState('networkidle', { timeout: 2000 }); } catch {}
      }
    }
    
    const inputs = await page.locator('input[type="text"], input[type="search"], input:not([type])').all();
    let bestInput: Candidate<CanaryInputData> | null = null;
    
    for (const input of inputs) {
      if (!await input.isVisible().catch(() => false)) continue;
      
      const id = (await input.getAttribute('id'))?.toLowerCase() || '';
      const name = (await input.getAttribute('name'))?.toLowerCase() || '';
      const placeholder = (await input.getAttribute('placeholder'))?.toLowerCase() || '';
      const aria = (await input.getAttribute('aria-label'))?.toLowerCase() || '';
      
      let score = 0;
      const combined = `${id} ${name} ${placeholder} ${aria}`;
      
      if (combined.includes(target.toLowerCase())) score += 50;
      if (combined.includes('promo') || combined.includes('discount') || combined.includes('coupon') || combined.includes('canary')) score += 30;
      
      if (score >= 50) {
         // Find submit
         const form = input.locator('ancestor::form').first();
         let submitBtn: Locator | null = null;
         
         if (await form.isVisible().catch(() => false)) {
            submitBtn = form.locator('button[type="submit"], input[type="submit"], button').first();
         } else {
            // Find adjacent button
            submitBtn = page.locator('button, input[type="submit"]').filter({ hasText: /submit|search|go|apply/i }).first();
         }
         
         if (submitBtn && await submitBtn.isVisible().catch(() => false)) {
            bestInput = {
              element: input,
              data: { input, submitBtn },
              confidence: score,
              reason: 'Semantic matching of input attributes + visible submit button'
            };
            break;
         }
      }
    }
    
    if (bestInput) {
      await bestInput.data.input.fill(marker);
      await bestInput.data.submitBtn.click();
      try { await page.waitForLoadState('networkidle', { timeout: 2000 }); } catch {}
    } else {
      throw new Error(`INCONCLUSIVE: Canary target '${target}' could not be reliably identified.`);
    }
  }

  async observeState(page: Page, url: string): Promise<Observation> {
    const pageState: Record<string, any> = {};

    if (!page.url().includes('cart') && !page.url().includes('checkout')) {
      const playbook = await this.buildPlaybook(page);
      if (playbook.cartNavigation) {
         const navLoc = playbook.cartNavigation.data.target as Locator;
         await navLoc.click().catch(() => {});
         try { await page.waitForLoadState('networkidle', { timeout: 2000 }); } catch {}
      }
    }

    try {
      const extractMetricSemantic = async (keywords: RegExp): Promise<number | undefined> => {
         return await page.evaluate((regexStr) => {
           const regex = new RegExp(regexStr, 'i');
           const elements = Array.from(document.querySelectorAll('dt, th, td, span, div, p, label, b, strong, h1, h2, h3, h4, h5, h6')).reverse();
           let structuredValue: number | undefined = undefined;
           let unstructuredValue: number | undefined = undefined;
           let structuredConflict = false;
           
           for (const el of elements) {
             const txt = (el.textContent || '').trim();
             // Must be very short (1-4 words max) to be a label, not a sentence!
             const wordCount = txt.split(/\s+/).length;
             if (wordCount <= 4 && regex.test(txt) && (el.children.length === 0 || el.tagName === 'DT' || el.tagName === 'TH')) {
               let sVal: number | undefined = undefined;
               
               // Look for value in next sibling
               if (el.nextElementSibling) {
                 const siblingTxt = el.nextElementSibling.textContent || '';
                 if (siblingTxt.toLowerCase().includes('free')) sVal = 0;
                 const match = siblingTxt.match(/[$₹€£]\s?(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)/);
                 if (match) sVal = parseFloat(match[1].replace(/,/g, ''));
               }
               
               // Look for value in parent's next sibling (only if it's a structural wrapper)
               if (sVal === undefined && el.parentElement && ['DIV', 'TD', 'TH'].includes(el.parentElement.tagName) && el.parentElement.children.length === 1 && el.parentElement.nextElementSibling) {
                 const pSiblingTxt = el.parentElement.nextElementSibling.textContent || '';
                 if (pSiblingTxt.toLowerCase().includes('free')) sVal = 0;
                 const match = pSiblingTxt.match(/[$₹€£]\s?(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)/);
                 if (match) sVal = parseFloat(match[1].replace(/,/g, ''));
               }
               
               if (sVal !== undefined) {
                  if (structuredValue !== undefined && structuredValue !== sVal) {
                      structuredConflict = true;
                  }
                  structuredValue = sVal;
               } else {
                 // Inline match like "Shipping: $5"
                 const match = txt.match(/[$₹€£]\s?(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)/);
                 if (match) {
                   unstructuredValue = parseFloat(match[1].replace(/,/g, ''));
                 } else if (txt.toLowerCase().includes('free')) {
                   unstructuredValue = 0;
                 }
               }
             }
           }
           
           if (structuredConflict) return undefined;
           return structuredValue !== undefined ? structuredValue : unstructuredValue;
         }, keywords.source);
      };

      const cartSubtotal = await extractMetricSemantic(/subtotal|total merchandise|items total/i);
      const shippingCost = await extractMetricSemantic(/shipping|delivery|handling/i);
      const discountValue = await extractMetricSemantic(/discount|promo|saved|offer/i);
      
      // Total fallback if subtotal is not specifically labeled
      const finalTotal = await extractMetricSemantic(/^total$/i);
      if (cartSubtotal === undefined && finalTotal !== undefined) {
         pageState.cartSubtotal = finalTotal;
      }

      if (cartSubtotal !== undefined) pageState.cartSubtotal = cartSubtotal;
      
      if (shippingCost !== undefined) {
         pageState.shippingCost = shippingCost;
      } else {
         const hasFreeText = await page.locator('text="Free"').isVisible().catch(() => false);
         if (hasFreeText) pageState.shippingCost = 0;
      }
      
      if (discountValue !== undefined) {
         pageState.discountValue = discountValue;
         pageState.discountApplied = discountValue > 0;
      } else {
         const hasDiscountText = await page.locator('text=/discount applied|promo applied/i').isVisible().catch(() => false);
         pageState.discountApplied = hasDiscountText;
      }

    } catch (e) {
      console.warn("Observation scraping failed:", e);
    }

    return {
      schemaVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      url,
      pageState
    };
  }
}
