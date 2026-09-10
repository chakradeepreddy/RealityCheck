const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  
  async function checkScenario(scenario) {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:5174/?scenario=${scenario}`);
    await page.waitForLoadState('networkidle');
    const products = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('article, li, div[class*="product"]')).map(el => el.innerText);
      const prices = [];
      for (const txt of texts) {
        if (!txt) continue;
        const match = txt.match(/[$₹€£]\s?(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)/);
        if (match) {
           const p = parseFloat(match[1].replace(/,/g, ''));
           if (!prices.includes(p)) prices.push(p);
        }
      }
      return prices.sort((a,b)=>a-b);
    });
    console.log(`Scenario ${scenario} prices:`, products);
    await page.close();
  }

  await checkScenario('shipping-honest');
  await checkScenario('forced-inconclusive');
  await browser.close();
})();
