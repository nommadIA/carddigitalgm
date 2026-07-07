const fs = require('fs');
let content = fs.readFileSync('components/bio/BioRenderer.tsx', 'utf-8');

const target1 = `                  const isNewFormat = !!portfolioItem.layers;`;
const replacement1 = `                  const currentIndex = (bio.portfolio_items || []).findIndex((p: any) => p.id === activePortfolioId);
                  const prevPortfolio = currentIndex > 0 ? bio.portfolio_items[currentIndex - 1] : null;
                  const nextPortfolio = currentIndex !== -1 && currentIndex < (bio.portfolio_items || []).length - 1 ? bio.portfolio_items[currentIndex + 1] : null;
                  
                  const isNewFormat = !!portfolioItem.layers;`;

const target2 = `                        <div className="w-full flex flex-col items-center">
                           {images.map((img, idx) => (
                             <img key={img.id || idx} src={img.image_url} alt={\`Banner \${idx+1}\`} className="w-full max-w-[1600px] h-auto object-contain block mx-auto" loading={idx === 0 ? "eager" : "lazy"} />
                           ))}
                        </div>
                     </div>`;
const replacement2 = `                        <div className="w-full flex flex-col items-center">
                           {images.map((img, idx) => (
                             <img key={img.id || idx} src={img.image_url} alt={\`Banner \${idx+1}\`} className="w-full max-w-[1600px] h-auto object-contain block mx-auto" loading={idx === 0 ? "eager" : "lazy"} />
                           ))}
                        </div>

                        {(prevPortfolio || nextPortfolio) && (
                          <div className={\`max-w-[1600px] mx-auto w-full px-4 md:px-8 lg:px-12 py-16 flex items-center justify-between font-bold text-xl sm:text-2xl md:text-3xl \${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}\`}>
                             {prevPortfolio ? (
                                <button onClick={() => { setActivePortfolioId(prevPortfolio.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:opacity-70 transition-opacity flex items-center gap-2 cursor-pointer">
                                  <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" /> {prevPortfolio.title || "Anterior"}
                                </button>
                             ) : <div />}

                             {nextPortfolio ? (
                                <button onClick={() => { setActivePortfolioId(nextPortfolio.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:opacity-70 transition-opacity flex items-center gap-2 cursor-pointer text-right">
                                  {nextPortfolio.title || "Próximo"} <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                                </button>
                             ) : <div />}
                          </div>
                        )}
                     </div>`;

if (content.includes(target1) && content.includes(target2)) {
  content = content.replace(target1, replacement1);
  content = content.replace(target2, replacement2);
  fs.writeFileSync('components/bio/BioRenderer.tsx', content);
  console.log('Navigation injected successfully.');
} else {
  console.log('Failed to find targets.');
  if (!content.includes(target1)) console.log('Target 1 missing');
  if (!content.includes(target2)) console.log('Target 2 missing');
}
