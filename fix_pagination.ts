import fs from 'fs';

const filePath = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  '<div className="flex justify-center mt-2 mb-6 z-[110] pointer-events-none">',
  '<div className="absolute bottom-4 left-0 right-0 flex justify-center z-[110] pointer-events-none">'
);

fs.writeFileSync(filePath, content);
console.log('Updated pagination dots to absolute position');
