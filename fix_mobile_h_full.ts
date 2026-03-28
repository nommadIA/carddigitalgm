import fs from 'fs';

const filePath = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '<div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col pb-24">';
const endMarker = '      )}\n        </div>\n      </div>\n    </Page>\n  );\n}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  let mobileView = content.substring(startIndex, endIndex);

  // Add h-full to the main container
  mobileView = mobileView.replace(
    '<div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col pb-24">',
    '<div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col pb-24 h-full">'
  );

  // Add flex-1 and flex flex-col to the next div
  mobileView = mobileView.replace(
    '<div className="relative overflow-hidden w-full pt-1">',
    '<div className="relative overflow-hidden w-full pt-1 flex-1 flex flex-col">'
  );

  // Add flex-1 to the first motion.div
  mobileView = mobileView.replace(
    '<motion.div \n              className="relative flex items-start"',
    '<motion.div \n              className="relative flex items-start flex-1"'
  );

  // Add h-full to the second motion.div
  mobileView = mobileView.replace(
    '<motion.div\n                className="flex w-full items-start"',
    '<motion.div\n                className="flex w-full items-start h-full"'
  );

  // Add h-full to the third motion.div
  mobileView = mobileView.replace(
    '<motion.div\n                className="flex w-full items-start"\n                  drag="x"',
    '<motion.div\n                className="flex w-full items-start h-full"\n                  drag="x"'
  );

  // Replace h-[65vh] with h-full
  mobileView = mobileView.replace(/h-\[65vh\]/g, 'h-full');

  content = content.substring(0, startIndex) + mobileView + content.substring(endIndex);
  fs.writeFileSync(filePath, content);
  console.log('Mobile view height adjusted to h-full');
} else {
  console.log('Could not find mobile view section');
}
