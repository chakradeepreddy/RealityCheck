import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { chromium, Browser, Page } from '@playwright/test';
import { GenericAdaptiveAdapter } from './GenericAdaptiveAdapter';
import { ExperimentSpec } from '@realitycheck/contracts';
import * as http from 'http';

describe('Capability Discovery', () => {
  let browser: Browser;
  let page: Page;
  let adapter: GenericAdaptiveAdapter;
  let server: http.Server;
  let currentHtml = '';
  const port = 3013;
  const url = `http://localhost:${port}`;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(currentHtml);
    });
    await new Promise<void>((resolve) => server.listen(port, resolve));
  });

  afterAll(async () => {
    await browser.close();
    server.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    adapter = new GenericAdaptiveAdapter();
    currentHtml = ''; // Reset before each
  });

  afterEach(async () => {
    await page.close();
  });

  const getBoundarySpec = (quantity = false): ExperimentSpec => ({
    schemaVersion: '1.0.0',
    primitive: 'BOUNDARY',
    boundaryType: quantity ? 'QUANTITY_DISCOUNT' : 'NUMERIC_THRESHOLD',
    targetUrl: url,
    testConditions: {},
    expectedObservables: {}
  });

  const getCanarySpec = (): ExperimentSpec => ({
    schemaVersion: '1.0.0',
    primitive: 'CANARY',
    targetUrl: url,
    testConditions: {},
    expectedObservables: {}
  });

  it('1. BOUNDARY: returns isTestable: true when product, price, and cart are present', async () => {
    currentHtml = `
      <html><body>
        <a href="/cart">Go to Cart</a>
        <div class="product">
          <span class="price">$10.00</span>
          <button>Add to Cart</button>
        </div>
        <div class="cart">Subtotal: $10.00</div>
        <div class="quantity">Quantity: <input type="number" value="1" /></div>
      </body></html>
    `;
    const result = await adapter.discoverCapabilities(page, url, getBoundarySpec(false));
    expect(result.isTestable).toBe(true);
  });

  it('2. BOUNDARY: returns NOT_TESTABLE when cart is missing', async () => {
    currentHtml = `
      <html><body>
        <div class="product">
          <span class="price">$10.00</span>
          <button>Add to Cart</button>
        </div>
      </body></html>
    `;
    const result = await adapter.discoverCapabilities(page, url, getBoundarySpec(false));
    expect(result.isTestable).toBe(false);
    expect(result.reason).toContain('NOT_TESTABLE');
    expect(result.reason).toContain('cart');
  });

  it('3. BOUNDARY: returns NOT_TESTABLE when product/price is unreliable', async () => {
    currentHtml = `
      <html><body>
        <div class="cart">Subtotal: $10.00</div>
      </body></html>
    `;
    const result = await adapter.discoverCapabilities(page, url, getBoundarySpec(false));
    expect(result.isTestable).toBe(false);
    expect(result.reason).toContain('NOT_TESTABLE');
    expect(result.reason).toContain('product');
  });

  it('4. BOUNDARY: returns NOT_TESTABLE when quantity control is missing but required', async () => {
    currentHtml = `
      <html><body>
        <a href="/cart">Go to Cart</a>
        <div class="product">
          <span class="price">$10.00</span>
          <button>Add to Cart</button>
        </div>
        <div class="cart">Subtotal: $10.00</div>
        <!-- No quantity control -->
      </body></html>
    `;
    const result = await adapter.discoverCapabilities(page, url, getBoundarySpec(true));
    expect(result.isTestable).toBe(false);
    expect(result.reason).toContain('NOT_TESTABLE');
    expect(result.reason).toContain('quantity');
  });

  it('5. CANARY: returns NOT_TESTABLE when suitable inputs are missing', async () => {
    currentHtml = `
      <html><body>
        <h1>Hello World</h1>
        <!-- No inputs -->
      </body></html>
    `;
    const result = await adapter.discoverCapabilities(page, url, getCanarySpec());
    expect(result.isTestable).toBe(false);
    expect(result.reason).toContain('NOT_TESTABLE');
    expect(result.reason).toContain('canary');
  });

  it('6. CANARY: returns isTestable: true when inputs are present', async () => {
    currentHtml = `
      <html><body>
        <input type="text" name="search" />
        <button>Submit</button>
      </body></html>
    `;
    const result = await adapter.discoverCapabilities(page, url, getCanarySpec());
    expect(result.isTestable).toBe(true);
  });

  it('7. Network error: returns NOT_TESTABLE', async () => {
    const result = await adapter.discoverCapabilities(page, 'http://localhost:12345/nonexistent', getBoundarySpec(false));
    expect(result.isTestable).toBe(false);
    expect(result.reason).toContain('NOT_TESTABLE');
    expect(result.reason).toContain('network');
  });
});
