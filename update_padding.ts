import fs from 'fs';

const cssPath = 'index.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

cssContent = cssContent.replace(
  /padding-bottom: 100px;/g,
  'padding-bottom: 140px;'
);

fs.writeFileSync(cssPath, cssContent);
console.log('Updated padding-bottom in index.css');
