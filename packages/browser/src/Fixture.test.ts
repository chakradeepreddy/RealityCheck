import { test, expect, beforeAll, afterAll } from 'vitest';
import { chromium, Browser, Page } from 'playwright-core';
import { GenericAdaptiveAdapter } from './GenericAdaptiveAdapter';
import path from 'path';

let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
});

afterAll(async () => {
  await browser.close();
});

test.describe('Fixture Genericity Tests', () => {
  const adapter = new GenericAdaptiveAdapter();

  test('modern-react-shop fixture', async () => {
    const fixturePath = 'file://' + path.resolve(__dirname, 'e2e/fixtures/modern-react-shop.html');
    await adapter.navigate(page, fixturePath);
    
    const obs = await adapter.observeState(page, fixturePath);
    expect(obs.pageState!.cartSubtotal).toBe(69.98);
    expect(obs.pageState!.shippingCost).toBe(5);
    expect(obs.pageState!.discountValue).toBe(10);
    expect(obs.pageState!.discountApplied).toBe(true);
  });

  test('legacy-table-cart fixture', async () => {
    const fixturePath = 'file://' + path.resolve(__dirname, 'e2e/fixtures/legacy-table-cart.html');
    await adapter.navigate(page, fixturePath);
    
    const obs = await adapter.observeState(page, fixturePath);
    expect(obs.pageState!.cartSubtotal).toBe(60);
    expect(obs.pageState!.shippingCost).toBe(0); // Free
  });

  test('aria-heavy-store fixture', async () => {
    const fixturePath = 'file://' + path.resolve(__dirname, 'e2e/fixtures/aria-heavy-store.html');
    await adapter.navigate(page, fixturePath);
    
    const obs = await adapter.observeState(page, fixturePath);
    expect(obs.pageState!.cartSubtotal).toBe(100);
    expect(obs.pageState!.shippingCost).toBe(10);
    expect(obs.pageState!.discountValue).toBe(10);
    expect(obs.pageState!.discountApplied).toBe(true);
  });
});
