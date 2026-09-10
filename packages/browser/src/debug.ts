import { chromium } from 'playwright-core';
import path from 'path';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('file://' + path.resolve(__dirname, 'e2e/fixtures/legacy-table-cart.html'));
  
  const val = await page.evaluate((regexStr) => {
           const regex = new RegExp(regexStr, 'i');
           const elements = Array.from(document.querySelectorAll('dt, th, span, div, p, label, td, b, strong'));
           
           for (const el of elements) {
             const txt = (el.textContent || '').trim();
             if (txt.length < 50 && regex.test(txt)) {
               // Case 1: next sibling
               if (el.nextElementSibling) {
                 const siblingTxt = el.nextElementSibling.textContent || '';
                 if (siblingTxt.toLowerCase().includes('free')) return {case: 1, val: 0};
                 const match = siblingTxt.match(/[$₹€£]\s?(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)/);
                 if (match) return {case: 1, val: parseFloat(match[1].replace(/,/g, ''))};
               }
               
               // Case 2: parent next sibling
               if (el.parentElement && el.parentElement.nextElementSibling) {
                 const pSiblingTxt = el.parentElement.nextElementSibling.textContent || '';
                 if (pSiblingTxt.toLowerCase().includes('free')) return {case: 2, val: 0};
                 const match = pSiblingTxt.match(/[$₹€£]\s?(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)/);
                 if (match) return {case: 2, val: parseFloat(match[1].replace(/,/g, ''))};
               }
               
               // Case 3: same element
               const match = txt.match(/[$₹€£]\s?(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)/);
               if (match) {
                 return {case: 3, val: parseFloat(match[1].replace(/,/g, ''))};
               }
             }
           }
           return null;
         }, /subtotal|total merchandise|items total/i.source);
         
  console.log("Legacy subtotal:", val);
  
  await page.goto('file://' + path.resolve(__dirname, 'e2e/fixtures/modern-react-shop.html'));
  const val2 = await page.evaluate((regexStr) => {
           const regex = new RegExp(regexStr, 'i');
           const elements = Array.from(document.querySelectorAll('dt, th, span, div, p, label, td, b, strong'));
           
           for (const el of elements) {
             const txt = (el.textContent || '').trim();
             if (txt.length < 50 && regex.test(txt)) {
               // Case 1: next sibling
               if (el.nextElementSibling) {
                 const siblingTxt = el.nextElementSibling.textContent || '';
                 if (siblingTxt.toLowerCase().includes('free')) return {case: 1, val: 0, from: el.tagName};
                 const match = siblingTxt.match(/[$₹€£]\s?(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)/);
                 if (match) return {case: 1, val: parseFloat(match[1].replace(/,/g, '')), from: el.tagName};
               }
             }
           }
           return null;
         }, /subtotal|total merchandise|items total/i.source);
  console.log("Modern subtotal:", val2);

  await browser.close();
})();
