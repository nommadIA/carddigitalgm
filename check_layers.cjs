const fs = require('fs');
let content = fs.readFileSync('pages/Bio.tsx', 'utf-8');
console.log(content.match(/layers\?: any\[\]/));
