const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://demowebshop.tricentis.com/');
  const html = await page.content();
  console.log(html.substring(0, 2000));
  // extract first product item
  const productHtml = await page.evaluate(() => document.querySelector('.product-item')?.outerHTML);
  console.log(productHtml);
  await browser.close();
})();
