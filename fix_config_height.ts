import fs from 'fs';

const filePath = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  '<div className="flex flex-col h-[calc(100dvh-280px)] lg:h-[calc(100dvh-120px)]">',
  '<div className="flex-1 min-h-0 flex flex-col">'
);

fs.writeFileSync(filePath, content);
console.log('Updated Configuracoes root container to flex-1 min-h-0');
