const fs = require('fs');
const path = '/Users/chakradeepreddy/Documents/QuickCart/src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// The block to replace:
//                 ) : (
//                   <div className="summary-row">
//                     <span>Shipping</span>
//                     <span>TBD</span>
//                   </div>
//                 )}

const regex = /\)\s*:\s*\(\s*<div className="summary-row">\s*<span>Shipping<\/span>\s*<span>TBD<\/span>\s*<\/div>\s*\)/g;

if (regex.test(content)) {
  content = content.replace(regex, ') : null');
  fs.writeFileSync(path, content, 'utf8');
  console.log("Patched successfully!");
} else {
  console.log("Could not find the block to patch.");
}

