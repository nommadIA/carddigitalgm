import fs from 'fs';

const filePath = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Change "Timbrado e Perfil" to "Timbrado" and icon User to FileText
content = content.replace(
  /<User size=\{20\} className="text-slate-400" \/> Timbrado e Perfil/g,
  '<FileText size={20} className="text-slate-400" /> Timbrado'
);

// 2. Increase thumbnail size in mobile view
const startMarker = '<div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col pb-24">';
const endMarker = '      )}\n        </div>\n      </div>\n    </Page>\n  );\n}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  let mobileView = content.substring(startIndex, endIndex);

  // Change w-24 h-36 to w-32 h-48 in mobile view
  mobileView = mobileView.replace(
    /w-24 h-36/g,
    'w-32 h-48'
  );

  // 3. Move containers up by removing pt-4
  mobileView = mobileView.replace(
    /<div className="relative overflow-hidden w-full pt-4">/,
    '<div className="relative overflow-hidden w-full pt-1">'
  );

  content = content.substring(0, startIndex) + mobileView + content.substring(endIndex);
}

fs.writeFileSync(filePath, content);
console.log('Timbrado changes applied successfully');
