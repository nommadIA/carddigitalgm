import fs from 'fs';

const layoutPath = 'components/ui/Layout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

layoutContent = layoutContent.replace(
  '<BottomNav />',
  `{/* BLUR OVERLAY PARA ROLAGEM VERTICAL MOBILE */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none z-[100] lg:hidden" 
        style={{ 
          maskImage: 'linear-gradient(to top, black 0%, transparent 100%)', 
          WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }} 
      />
      <BottomNav />`
);

fs.writeFileSync(layoutPath, layoutContent);
console.log('Added blur overlay to Layout.tsx');
