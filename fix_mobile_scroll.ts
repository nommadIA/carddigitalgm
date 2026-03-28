import fs from 'fs';

const filePath = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  '<div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col h-full">',
  '<div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col h-full min-h-0">'
);

content = content.replace(
  '<div className="relative overflow-hidden w-full pt-1 flex-1 flex flex-col">',
  '<div className="relative overflow-hidden w-full pt-1 flex-1 flex flex-col min-h-0">'
);

content = content.replace(
  '<motion.div \n              className="relative flex items-start flex-1"\n              initial={false}\n            >',
  '<motion.div \n              className="relative flex items-start flex-1 min-h-0"\n              initial={false}\n            >'
);

content = content.replace(
  '<motion.div\n                className="flex w-full items-start h-full"\n                animate={{ x: `-${currentScreen * 100}%` }}',
  '<motion.div\n                className="flex w-full items-start h-full min-h-0"\n                animate={{ x: `-${currentScreen * 100}%` }}'
);

content = content.replace(
  '<motion.div\n                className="flex w-full items-start h-full"\n                  drag="x"',
  '<motion.div\n                className="flex w-full items-start h-full min-h-0"\n                  drag="x"'
);

content = content.replace(
  'className="w-full shrink-0 px-2 flex flex-col justify-start h-full overflow-y-auto no-scrollbar"',
  'className="w-full shrink-0 px-2 flex flex-col justify-start h-full overflow-y-auto no-scrollbar min-h-0 pb-24"'
);

fs.writeFileSync(filePath, content);
console.log('Added min-h-0 to flex containers for mobile scrolling');
