const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5174/cart?scenario=forced-inconclusive');
  // Wait for the cart to load
  await page.waitForTimeout(2000);
  const html = await page.content();
  console.log(html);
  await browser.close();
})();
