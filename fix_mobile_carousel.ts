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

// Change container to not use absolute inset-0
mobileView = mobileView.replace(
  /<div className="flex-1 relative overflow-hidden w-full pt-4 pb-12">/,
  '<div className="relative overflow-hidden w-full pt-4">'
);

mobileView = mobileView.replace(
  /className="absolute inset-0 flex items-start pt-4"/,
  'className="relative flex items-start"'
);

mobileView = mobileView.replace(
  /<motion\.div\s+className="flex w-full h-full"/g,
  '<motion.div\n                className="flex w-full"'
);

mobileView = mobileView.replace(
  /className="w-full h-full shrink-0 overflow-hidden px-2 flex flex-col justify-start"/g,
  'className="w-full shrink-0 overflow-hidden px-2 flex flex-col justify-start"'
);

mobileView = mobileView.replace(
  /<div className="w-full h-full flex-shrink-0 flex flex-col">/g,
  '<div className="w-full flex-shrink-0 flex flex-col">'
);

// Also change the main container to not have fixed height
mobileView = mobileView.replace(
  /className="lg:hidden w-full max-w-md mx-auto relative h-\[calc\(100vh-140px\)\] flex flex-col"/,
  'className="lg:hidden w-full max-w-md mx-auto relative flex flex-col pb-24"'
);

const newContent = content.substring(0, startIndex) + mobileView + content.substring(endIndex);

fs.writeFileSync(filePath, newContent);
console.log('Mobile carousel adjusted to wrap content successfully');
