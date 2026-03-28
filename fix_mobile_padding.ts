import fs from 'fs';

const filePath = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  '<div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col pb-24 h-full">',
  '<div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col h-full">'
);

fs.writeFileSync(filePath, content);
console.log('Removed pb-24 from mobile view container');
