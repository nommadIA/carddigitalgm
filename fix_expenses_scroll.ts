import fs from 'fs';

const filePath = 'pages/Expenses.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  '<Card>',
  '<Card className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden">'
);

content = content.replace(
  '<div className="divide-y divide-white/10">',
  '<div className="flex-1 overflow-y-auto no-scrollbar pb-24"><div className="divide-y divide-white/10">'
);

content = content.replace(
  '</div>\n        )}',
  '</div></div>\n        )}'
);

fs.writeFileSync(filePath, content);
console.log('Updated Expenses.tsx for scrollable list');
