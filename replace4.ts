import fs from 'fs';
let content = fs.readFileSync('./pages/Configuracoes.tsx', 'utf8');
content = content.replace(/font-bold text-xs uppercase tracking-wider text-\[var\(--gm-primary\)]/g, 'font-bold text-sm uppercase tracking-wider text-[var(--gm-primary)]');
fs.writeFileSync('./pages/Configuracoes.tsx', content);
console.log('Replaced successfully');
