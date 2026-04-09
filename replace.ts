import fs from 'fs';
let content = fs.readFileSync('./pages/Configuracoes.tsx', 'utf8');

// Replace labels
content = content.replace(/text-\[10px\] font-bold uppercase tracking-wider text-slate-500/g, 'text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)]');
content = content.replace(/font-bold text-\[10px\] uppercase tracking-wider text-slate-500/g, 'font-bold text-xs uppercase tracking-wider text-[var(--gm-primary)]');
content = content.replace(/text-\[10px\] font-semibold text-slate-500/g, 'text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)]');

// Replace info boxes
content = content.replace(/bg-slate-50 dark:bg-slate-900\/50/g, 'bg-black/5 dark:bg-black/40 backdrop-blur-md');
content = content.replace(/border-slate-200 dark:border-slate-700/g, 'border-black/5 dark:border-white/10');

fs.writeFileSync('./pages/Configuracoes.tsx', content);
console.log('Replaced successfully');
