const fs = require('fs');
let content = fs.readFileSync('components/bio/BioRenderer.tsx', 'utf-8');

const footerTarget = `          {/* 6. Admin Area / Login Footer Trigger */}
          <div className="pt-8 pb-4 text-center space-y-4">
            <div className="text-sm sm:text-base font-bold tracking-wider opacity-70 text-slate-400">
              CardDigital GM® 2026
            </div>
            <div>
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold opacity-40 hover:opacity-100 hover-text-brand transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                Área Restrita / Login do Administrador
              </button>
            </div>
        </div>`;

const footerReplace = `          {/* 6. Admin Area / Login Footer Trigger */}
          <div className="pt-8 pb-8 text-center space-y-6">
            <div className="text-sm sm:text-base font-bold tracking-wider opacity-90">
              <span className="text-white">CardDigital</span>{' '}
              <span style={{ color: "#FF5500" }}>GM®</span>{' '}
              <span className="text-white">2026</span>
            </div>
            <div>
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="inline-flex items-center gap-2 text-base font-black bg-clip-text text-transparent drop-shadow-sm font-funnel hover:scale-105 transition-transform cursor-pointer"
                style={{
                  backgroundImage: \`linear-gradient(90deg, \${brandColor}, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, \${brandColor})\`,
                  backgroundSize: '300% 300%',
                  animation: 'color-loop 5s ease infinite',
                }}
              >
                <Lock className="w-5 h-5 text-white/50" />
                Área Restrita / Login do Administrador
              </button>
            </div>
        </div>`;

if (content.includes(footerTarget)) {
  content = content.replace(footerTarget, footerReplace);
  fs.writeFileSync('components/bio/BioRenderer.tsx', content);
  console.log("Footer updated successfully.");
} else {
  console.log("Failed to find footer target.");
}
