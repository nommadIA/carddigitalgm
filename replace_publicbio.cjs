const fs = require('fs');

let content = fs.readFileSync('pages/PublicBio.tsx', 'utf-8');

if (!content.includes('portfolioId = searchParams.get("portfolio")')) {
  // First add useSearchParams
  content = content.replace('import { useParams } from "react-router-dom";', 'import { useParams, useSearchParams } from "react-router-dom";');
  
  // Then in PublicBio() add searchParams
  content = content.replace('const { tenantId } = useParams();', 'const { tenantId } = useParams();\n  const [searchParams] = useSearchParams();\n  const portfolioId = searchParams.get("portfolio");');
  
  const viewerComponent = `
      {/* Portfolio Viewer Mode */}
      {data && portfolioId && (
        <div className="fixed inset-0 bg-black z-[9999] overflow-y-auto">
          {(() => {
            const bio = data.bio_config || {};
            // Find the portfolio from the list
            let portfolioItem: any = null;
            if (bio.portfolio_items) {
               portfolioItem = bio.portfolio_items.find((p: any) => p.id === portfolioId);
            }
            
            if (!portfolioItem) {
              return (
                <div className="min-h-screen flex items-center justify-center text-white">
                  Portfólio não encontrado.
                </div>
              );
            }
            
            // Backwards compatibility layer
            const isNewFormat = !!portfolioItem.layers;
            const images = isNewFormat ? portfolioItem.layers : [{ id: portfolioItem.id, image_url: portfolioItem.image_url }];
            
            return (
              <div className="min-h-screen pb-16">
                 {/* Header */}
                 <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4 flex items-center justify-between">
                    <h1 className="text-white font-bold text-lg">{portfolioItem.title || "Portfólio"}</h1>
                    <button onClick={() => window.close()} className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors cursor-pointer" title="Fechar guia">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                 </div>
                 
                 {/* Images List */}
                 <div className="max-w-4xl mx-auto mt-4 px-4 space-y-6">
                    {images.map((img: any, idx: number) => (
                      <div key={img.id || idx} className="w-full bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
                         <img src={img.image_url} alt={\`Layer \${idx+1}\`} className="w-full h-auto max-h-[80vh] object-contain" />
                      </div>
                    ))}
                 </div>
              </div>
            );
          })()}
        </div>
      )}
  `;

  content = content.replace('{data && <BioRenderer data={data} asPreview={false} />}', '{data && !portfolioId && <BioRenderer data={data} asPreview={false} />}\n' + viewerComponent);
  
  fs.writeFileSync('pages/PublicBio.tsx', content);
  console.log('PublicBio.tsx updated for Portfolio Viewer.');
} else {
  console.log('Already updated or pattern not found.');
}

