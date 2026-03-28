import fs from 'fs';

const filePath = 'pages/Expenses.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  '<Card className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden">',
  '<Card className="mb-24">'
);

content = content.replace(
  '<div className="flex-1 overflow-y-auto no-scrollbar pb-24"><div className="divide-y divide-white/10">',
  '<div className="divide-y divide-white/10">'
);

content = content.replace(
  '</div></div>\n        )}',
  '</div>\n        )}'
);

fs.writeFileSync(filePath, content);
console.log('Reverted internal scroll in Expenses.tsx to use global scroll');
