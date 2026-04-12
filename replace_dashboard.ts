import fs from 'fs';

let content = fs.readFileSync('./pages/Dashboard.tsx', 'utf8');

// Add backdrop-blur-md to all cards in Dashboard
content = content.replace(/bg-white dark:bg-slate-800/g, 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-md');

fs.writeFileSync('./pages/Dashboard.tsx', content);
console.log('Replaced Dashboard successfully');
