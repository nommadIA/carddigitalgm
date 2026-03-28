import fs from 'fs';

const filePath = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '        <div className="lg:hidden w-full max-w-md mx-auto relative h-[calc(100vh-140px)] flex flex-col">';
const endMarker = '      )}\n        </div>\n      </div>\n    </Page>\n  );\n}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found');
  process.exit(1);
}

let mobileView = content.substring(startIndex, endIndex);

// Add h-[400px] to the gap-2 container
mobileView = mobileView.replace(/className="flex flex-col gap-2"/g, 'className="flex flex-col gap-2 h-[400px]"');

// Add flex-1 to Cards
mobileView = mobileView.replace(/group flex flex-col/g, 'group flex-1 flex flex-col');

const newContent = content.substring(0, startIndex) + mobileView + content.substring(endIndex);

fs.writeFileSync(filePath, newContent);
console.log('Mobile view sizes adjusted to h-[400px] and flex-1 successfully');
