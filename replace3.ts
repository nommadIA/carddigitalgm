import fs from 'fs';
let content = fs.readFileSync('./pages/Configuracoes.tsx', 'utf8');
content = content.replace(/text-xs font-bold uppercase tracking-wider text-\[var\(--gm-primary\)]/g, 'text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)]');
fs.writeFileSync('./pages/Configuracoes.tsx', content);
console.log('Replaced successfully');
