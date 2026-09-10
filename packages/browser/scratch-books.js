const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://books.toscrape.com/');
  const html = await page.content();
  console.log("=== HEAD ===");
  console.log(html.substring(0, 1000));
  
  // extract basket
  const basket = await page.evaluate(() => {
     return document.querySelector('.basket-mini')?.outerHTML || document.querySelector('header')?.outerHTML;
  });
  console.log("=== BASKET ===");
  console.log(basket);
  await browser.close();
})();
