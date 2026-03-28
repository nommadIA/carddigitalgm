import fs from 'fs';

const filePath = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '        <div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col pb-24">';
const endMarker = '      )}\n        </div>\n      </div>\n    </Page>\n  );\n}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found');
  process.exit(1);
}

let mobileView = content.substring(startIndex, endIndex);

mobileView = mobileView.replace(
  /<motion\.div\n                className="flex w-full"\n                animate=\{\{ x: `-\$\{currentScreen \* 100\}%` \}\}/,
  '<motion.div\n                className="flex w-full items-start"\n                animate={{ x: `-${currentScreen * 100}%` }}'
);

mobileView = mobileView.replace(
  /<motion\.div\n                className="flex w-full"\n                  drag="x"/,
  '<motion.div\n                className="flex w-full items-start"\n                  drag="x"'
);

const newContent = content.substring(0, startIndex) + mobileView + content.substring(endIndex);

fs.writeFileSync(filePath, newContent);
console.log('Mobile carousel items-start added successfully');
