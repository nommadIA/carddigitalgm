import fs from 'fs';

const financialPath = 'pages/Financial.tsx';
let financialContent = fs.readFileSync(financialPath, 'utf8');
financialContent = financialContent.replace(
  '<div className="pb-24">',
  '<div className="pb-40">'
);
fs.writeFileSync(financialPath, financialContent);

const expensesPath = 'pages/Expenses.tsx';
let expensesContent = fs.readFileSync(expensesPath, 'utf8');
expensesContent = expensesContent.replace(
  '<Card className="mb-24">',
  '<Card className="mb-40">'
);
fs.writeFileSync(expensesPath, expensesContent);

console.log('Updated padding-bottom to 40 for Financial and Expenses');
