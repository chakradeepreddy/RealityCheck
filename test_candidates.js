const { chromium } = require('@playwright/test');

async function testSite(name, url, testFn) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  console.log(`\n=== Testing: ${name} (${url}) ===`);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const title = await page.title();
    console.log(`  Title: ${title}`);
    const result = await testFn(page);
    console.log(`  Result: ${JSON.stringify(result)}`);
    console.log(`  STATUS: OK`);
  } catch (e) {
    console.log(`  ERROR: ${e.message.substring(0, 300)}`);
    console.log(`  STATUS: FAIL`);
  } finally {
    await browser.close();
  }
}

(async () => {
  // Test 1: Flipkart search for laptops - check if discounts are visible
  await testSite('Flipkart Laptops', 'https://www.flipkart.com/search?q=laptop', async (page) => {
    await page.waitForTimeout(3000);
    const discountEls = await page.locator('text=% off').count();
    const captcha = await page.locator('text=captcha').count();
    const blocked = await page.locator('text=Access Denied').count();
    return { discountCount: discountEls, captcha, blocked };
  });

  // Test 2: DemoBlaze - known e-commerce demo with prices
  await testSite('DemoBlaze', 'https://www.demoblaze.com', async (page) => {
    await page.waitForTimeout(3000);
    const items = await page.locator('.card').count();
    const priceEls = await page.locator('.card-block h5').all();
    const prices = await Promise.all(priceEls.slice(0, 5).map(async p => (await p.textContent())?.trim()));
    return { items, samplePrices: prices };
  });

  // Test 3: SauceDemo - authorized demo store
  await testSite('SauceDemo', 'https://www.saucedemo.com', async (page) => {
    await page.waitForTimeout(2000);
    await page.locator('#user-name').fill('standard_user');
    await page.locator('#password').fill('secret_sauce');
    await page.locator('#login-button').click();
    await page.waitForURL('**/inventory.html', { timeout: 8000 });
    const items = await page.locator('.inventory_item').count();
    const priceEls = await page.locator('.inventory_item_price').all();
    const prices = await Promise.all(priceEls.map(p => p.textContent()));
    return { items, prices };
  });

  // Test 4: OWASP Juice Shop
  await testSite('OWASP Juice Shop', 'https://juice-shop.herokuapp.com/#/', async (page) => {
    await page.waitForTimeout(6000);
    const products = await page.locator('.mat-card').count();
    return { products };
  });

  // Test 5: httpbin - form
  await testSite('httpbin POST form', 'https://httpbin.org/forms/post', async (page) => {
    await page.waitForTimeout(1000);
    const inputs = await page.locator('input').count();
    return { inputs };
  });

})();
