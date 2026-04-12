import fs from 'fs';

const files = [
  './pages/Budgets.tsx',
  './pages/Clients.tsx',
  './pages/Expenses.tsx',
  './pages/Financial.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/bg-white dark:bg-slate-800/g, 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-md');
  fs.writeFileSync(file, content);
  console.log(`Replaced in ${file} successfully`);
}
