import fs from 'fs';

const filePath = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add 4 more fonts
content = content.replace(
  /\["Inter", "Roboto", "Poppins", "Montserrat"\]/g,
  '["Inter", "Roboto", "Poppins", "Montserrat", "Open Sans", "Lato", "Oswald", "Raleway"]'
);

// 2. Mobile view adjustments
const startMarker = '<div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col pb-24">';
const endMarker = '      )}\n        </div>\n      </div>\n    </Page>\n  );\n}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  let mobileView = content.substring(startIndex, endIndex);

  // Set fixed height for all cards in mobile view
  mobileView = mobileView.replace(
    /className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-5 px-4 relative overflow-hidden group flex flex-col justify-center "/g,
    'className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-5 px-4 relative overflow-hidden group flex flex-col justify-center h-[400px]"'
  );
  
  // Also replace any that might have different padding
  mobileView = mobileView.replace(
    /className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-3 px-3 relative overflow-hidden group flex flex-col items-center justify-center text-center"/g,
    'className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-3 px-3 relative overflow-hidden group flex flex-col items-center justify-center text-center h-[400px]"'
  );

  // Timbrado adjustments
  // Make thumbnails larger (w-32 h-48 -> w-36 h-52 or w-full h-full)
  // Let's use w-36 h-52
  mobileView = mobileView.replace(/w-32 h-48/g, 'w-36 h-52');
  
  // Change text color to white for "Seu Timbrado" and "Gabarito"
  // Currently: <span className="text-[10px] font-semibold text-slate-500">Seu Timbrado</span>
  mobileView = mobileView.replace(
    /<span className="text-\[10px\] font-semibold text-slate-500">Seu Timbrado<\/span>/,
    '<span className="text-[10px] font-semibold text-white bg-slate-800/50 px-2 py-1 rounded-md">Seu Timbrado</span>'
  );
  mobileView = mobileView.replace(
    /<span className="text-\[10px\] font-semibold text-slate-500">Gabarito<\/span>/,
    '<span className="text-[10px] font-semibold text-white bg-slate-800/50 px-2 py-1 rounded-md">Gabarito</span>'
  );

  // Pix adjustments
  // The user wants to decrease the container size slightly, but keeping it the same as others.
  // Since we set h-[400px] on all, it will be the same.
  // Let's make sure the QR code fits well in h-[400px].
  // w-40 h-40 might be too big if the container is 400px and has other elements.
  // Let's change w-40 h-40 to w-32 h-32 to ensure it fits nicely.
  mobileView = mobileView.replace(/w-40 h-40/g, 'w-32 h-32');

  content = content.substring(0, startIndex) + mobileView + content.substring(endIndex);
  fs.writeFileSync(filePath, content);
  console.log('Mobile adjustments applied successfully');
} else {
  console.log('Could not find mobile view section');
}
