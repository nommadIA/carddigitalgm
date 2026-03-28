import fs from 'fs';

const filePath = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '<div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col pb-24">';
const endMarker = '      )}\n        </div>\n      </div>\n    </Page>\n  );\n}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  let mobileView = content.substring(startIndex, endIndex);

  // Adjust QR code box in mobile view
  mobileView = mobileView.replace(
    /<div className="mt-2 flex flex-col items-center justify-center p-2 bg-slate-50 dark:bg-slate-900\/50 rounded-xl border border-slate-200 dark:border-slate-700">/,
    '<div className="mt-4 flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">'
  );
  
  mobileView = mobileView.replace(
    /<img src=\{pixQrPreview\} alt="QR Pix" className="w-24 h-24 rounded-lg shadow-sm mb-2" \/>/,
    '<img src={pixQrPreview} alt="QR Pix" className="w-32 h-32 rounded-lg shadow-sm mb-4" />'
  );

  mobileView = mobileView.replace(
    /className="gm-btn-soft w-full justify-center py-2 text-xs"/,
    'className="gm-btn-soft w-full justify-center py-3 text-sm font-semibold"'
  );

  // Ensure all cards have a consistent min-height or height if requested
  // The user said "AJUSTE O TAMANBHO FINAL DE TODOS OS CONTAINERS"
  // Let's add a min-h-[400px] or similar to the cards to make them consistent
  mobileView = mobileView.replace(
    /className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-3 px-3 relative overflow-hidden group flex flex-col justify-center"/g,
    'className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-5 px-4 relative overflow-hidden group flex flex-col justify-center min-h-[380px]"'
  );

  content = content.substring(0, startIndex) + mobileView + content.substring(endIndex);
}

fs.writeFileSync(filePath, content);
console.log('Mobile QR and container sizes adjusted successfully');
