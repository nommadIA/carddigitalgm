import fs from 'fs';

const filePath = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace all occurrences
content = content.replace(
  /className="w-full shrink-0 px-2 flex flex-col justify-start h-full overflow-y-auto \[\&::\-webkit\-scrollbar\]:hidden \[\-ms\-overflow\-style:none\] \[scrollbar\-width:none\]"/g,
  'className="w-full shrink-0 px-2 flex flex-col justify-start h-full overflow-y-auto no-scrollbar"'
);

fs.writeFileSync(filePath, content);
console.log('Updated scrollbar classes');
