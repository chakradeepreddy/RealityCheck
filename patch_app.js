const fs = require('fs');
const path = '/Users/chakradeepreddy/Documents/QuickCart/src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Hide shipping cost row if scenario === 'forced-inconclusive'
const oldRow = `<div className="summary-row">
                  <span>Shipping</span>
                  <span data-testid="shipping-cost">{formatPrice(shipping)}</span>
                </div>`;

const newRow = `{scenario !== 'forced-inconclusive' && (
                  <div className="summary-row">
                    <span>Shipping</span>
                    <span data-testid="shipping-cost">{formatPrice(shipping)}</span>
                  </div>
                )}`;

if (content.includes(oldRow)) {
  content = content.replace(oldRow, newRow);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Patched successfully.");
} else {
  console.log("Could not find the row to patch.");
}
