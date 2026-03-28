import fs from 'fs';

const filePath = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  '<div className="flex flex-col h-[calc(100dvh-120px)]">',
  '<div className="flex flex-col h-[calc(100dvh-200px)] lg:h-[calc(100dvh-120px)]">'
);

fs.writeFileSync(filePath, content);
console.log('Updated container height for mobile');
