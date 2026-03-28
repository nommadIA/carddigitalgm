import fs from 'fs';

const filePath = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  '{/* PAGINATION DOTS - RELATIVE POSITION */}\n          <div className="absolute bottom-4 left-0 right-0 flex justify-center z-[110] pointer-events-none">',
  `{/* BLUR OVERLAY */}
          <div 
            className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none z-[100] lg:hidden" 
            style={{ 
              maskImage: 'linear-gradient(to top, black 0%, transparent 100%)', 
              WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }} 
          />

          {/* PAGINATION DOTS */}
          <div className="flex justify-center fixed left-0 right-0 z-[110] pointer-events-none pagination-dots-container">`
);

fs.writeFileSync(filePath, content);
console.log('Updated pagination dots and added blur overlay');
