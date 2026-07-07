const fs = require('fs');
let content = fs.readFileSync('components/bio/BioRenderer.tsx', 'utf-8');

const target2 = `                        {(prevPortfolio || nextPortfolio) && (
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
                        )}`;
const replacement2 = `                        {(prevPortfolio || nextPortfolio) && (
                          <div className="max-w-[1600px] mx-auto w-full px-4 md:px-8 lg:px-12 py-16 flex items-center justify-between font-bold text-xl sm:text-2xl md:text-3xl" style={{ color: brandColor || 'var(--primary-color)' }}>
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
                        )}`;

if (content.includes(target2)) {
  content = content.replace(target2, replacement2);
  fs.writeFileSync('components/bio/BioRenderer.tsx', content);
  console.log('Navigation color updated successfully.');
} else {
  console.log('Failed to find target.');
}
