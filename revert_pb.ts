import fs from 'fs';

const files = [
  { path: 'pages/Dashboard.tsx', oldStr: 'pb-40', newStr: 'pb-24' },
  { path: 'pages/Configuracoes.tsx', oldStr: 'pb-40', newStr: 'pb-24' },
  { path: 'pages/Financial.tsx', oldStr: 'pb-40', newStr: 'pb-24' },
  { path: 'pages/Expenses.tsx', oldStr: 'mb-40', newStr: 'mb-24' }
];

files.forEach(file => {
  let content = fs.readFileSync(file.path, 'utf8');
  content = content.replace(file.oldStr, file.newStr);
  fs.writeFileSync(file.path, content);
});

console.log('Reverted padding/margin to 24');
