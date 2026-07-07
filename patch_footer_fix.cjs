const fs = require('fs');
let content = fs.readFileSync('components/bio/BioRenderer.tsx', 'utf-8');

const footerTarget = `            <div>
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
            </div>`;

const footerReplace = `            <div>
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="inline-flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
              >
                <Lock className="w-5 h-5 text-white/50" />
                <span 
                  className="text-base font-black bg-clip-text text-transparent drop-shadow-sm font-funnel"
                  style={{
                    backgroundImage: \`linear-gradient(90deg, \${brandColor}, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, \${brandColor})\`,
                    backgroundSize: '300% 300%',
                    animation: 'color-loop 5s ease infinite',
                  }}
                >
                  Área Restrita / Login do Administrador
                </span>
              </button>
            </div>`;

if (content.includes(footerTarget)) {
  content = content.replace(footerTarget, footerReplace);
  fs.writeFileSync('components/bio/BioRenderer.tsx', content);
  console.log("Footer text gradient fixed successfully.");
} else {
  console.log("Failed to find footer target.");
}
