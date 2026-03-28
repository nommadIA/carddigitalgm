import fs from 'fs';

const filePath = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '<div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col pb-24">';
const endMarker = '      )}\n        </div>\n      </div>\n    </Page>\n  );\n}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  let mobileView = content.substring(startIndex, endIndex);

  // Remove min-h-[380px] to let containers shrink to fit their content
  mobileView = mobileView.replace(/min-h-\[380px\]/g, '');

  // Adjust QR code box
  mobileView = mobileView.replace(
    /<div className="mt-4 flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900\/50 rounded-xl border border-slate-200 dark:border-slate-700">/,
    '<div className="mt-4 flex flex-col items-center justify-center p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 w-full">'
  );
  
  mobileView = mobileView.replace(
    /<img src=\{pixQrPreview\} alt="QR Pix" className="w-32 h-32 rounded-lg shadow-sm mb-4" \/>/,
    '<img src={pixQrPreview} alt="QR Pix" className="w-40 h-40 rounded-xl shadow-md mb-4 object-contain bg-white p-2" />'
  );

  mobileView = mobileView.replace(
    /className="gm-btn-soft w-full justify-center py-3 text-sm font-semibold"/,
    'className="gm-btn w-full justify-center py-3 text-sm font-bold shadow-lg shadow-[var(--gm-primary-20)]"'
  );

  content = content.substring(0, startIndex) + mobileView + content.substring(endIndex);
}

fs.writeFileSync(filePath, content);
console.log('Mobile final adjustments applied successfully');
