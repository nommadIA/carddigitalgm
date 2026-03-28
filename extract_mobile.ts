import fs from 'fs';

const filePath = 'pages/Configuracoes.tsx';
const content = fs.readFileSync(filePath, 'utf8');

const startMarker = '<div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col pb-24">';
const endMarker = '      )}\n        </div>\n      </div>\n    </Page>\n  );\n}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const mobileView = content.substring(startIndex, endIndex);
  fs.writeFileSync('mobile_view.tsx', mobileView);
  console.log('Mobile view extracted successfully');
} else {
  console.log('Could not find mobile view section');
}
