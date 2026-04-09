import fs from 'fs';
let content = fs.readFileSync('./pages/Configuracoes.tsx', 'utf8');
content = content.replace(/bg-black\/5 dark:bg-black\/40 backdrop-blur-md/g, 'bg-black/10 dark:bg-black/40 backdrop-blur-md');
content = content.replace(/border-black\/5 dark:border-white\/10/g, 'border-black/10 dark:border-white/10');
fs.writeFileSync('./pages/Configuracoes.tsx', content);
console.log('Replaced successfully');
