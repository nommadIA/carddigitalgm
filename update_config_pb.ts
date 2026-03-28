import fs from 'fs';

const configPath = 'pages/Configuracoes.tsx';
let configContent = fs.readFileSync(configPath, 'utf8');
configContent = configContent.replace(
  'className="w-full shrink-0 px-2 flex flex-col justify-start h-full overflow-y-auto no-scrollbar min-h-0 pb-24"',
  'className="w-full shrink-0 px-2 flex flex-col justify-start h-full overflow-y-auto no-scrollbar min-h-0 pb-40"'
);
fs.writeFileSync(configPath, configContent);

console.log('Updated padding-bottom to 40 for Configuracoes');
