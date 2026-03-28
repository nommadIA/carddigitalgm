import fs from 'fs';

const filePath = 'pages/Financial.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  '<div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">',
  '<div className="pb-24">'
);

fs.writeFileSync(filePath, content);
console.log('Reverted internal scroll in Financial.tsx to use global scroll');
