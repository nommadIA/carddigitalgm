const fs = require('fs');
let content = fs.readFileSync('components/bio/BioRenderer.tsx', 'utf-8');

const oldReturn = `                  return (
                     <div className="space-y-0">
                        <div className="flex items-center justify-between pb-4 px-4 md:px-8 lg:px-12 max-w-[1150px] mx-auto">
                           <h2 className={\`text-2xl sm:text-4xl font-bold tracking-tight \${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}\`}>{portfolioItem.title || "Portfólio"}</h2>
                           <button onClick={() => { setActiveView("bio"); setActivePortfolioId(null); }} className={\`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full transition-colors cursor-pointer flex items-center gap-2 text-sm font-bold \${theme === 'dark' || theme === 'glass' ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-slate-900'}\`}>
                             <ChevronLeft className="w-5 h-5" /> <span>Voltar</span>
                           </button>
                        </div>
                        <div className="w-full flex flex-col items-center">
                           {images.map((img, idx) => (
                             <img key={img.id || idx} src={img.image_url} alt={\`Banner \${idx+1}\`} className="w-full h-auto block" />
                           ))}
                        </div>
                     </div>
                  );`;

const newReturn = `                  const descriptionAlignClass = portfolioItem.description_align === "left" ? "text-left" : portfolioItem.description_align === "right" ? "text-right" : "text-center";
                  const descriptionBoldClass = portfolioItem.description_bold ? "font-bold" : "font-medium";
                  const descriptionItalicClass = portfolioItem.description_italic ? "italic" : "not-italic";
                  const descriptionFontClass = \`bio-desc-font-\${portfolioItem.description_font || "ui"}\`;
                  const descriptionSizeClass = getFontSizeClass(portfolioItem.description_size);

                  return (
                     <div className="space-y-0 w-full">
                        <div className="flex items-center justify-between pb-4 px-4 md:px-8 lg:px-12 max-w-[1453px] mx-auto w-full">
                           <button onClick={() => { setActiveView("bio"); setActivePortfolioId(null); }} className={\`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full transition-colors cursor-pointer flex items-center gap-2 text-sm font-bold \${theme === 'dark' || theme === 'glass' ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-slate-900'}\`}>
                             <ChevronLeft className="w-5 h-5" /> <span>Voltar</span>
                           </button>
                        </div>
                        <div className="w-full flex flex-col items-center">
                           {images.map((img, idx) => (
                             <img key={img.id || idx} src={img.image_url} alt={\`Banner \${idx+1}\`} className="w-full max-w-[1453px] h-auto object-contain block mx-auto" loading={idx === 0 ? "eager" : "lazy"} />
                           ))}
                        </div>
                        <div className="max-w-[1453px] mx-auto w-full px-4 md:px-8 lg:px-12 py-12 sm:py-20">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-start">
                            <h2 className={\`text-4xl sm:text-5xl md:text-6xl font-black tracking-tight \${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}\`}>
                              {portfolioItem.title || "Portfólio"}
                            </h2>
                            {portfolioItem.description && (
                              <div className={\`whitespace-pre-wrap \${descriptionAlignClass} \${descriptionBoldClass} \${descriptionItalicClass} \${descriptionSizeClass} \${descriptionFontClass} \${theme === 'dark' || theme === 'glass' ? 'text-slate-300' : 'text-slate-700'}\`}>
                                {portfolioItem.description}
                              </div>
                            )}
                          </div>
                        </div>
                     </div>
                  );`;

if (content.includes(oldReturn)) {
  content = content.replace(oldReturn, newReturn);
  fs.writeFileSync('components/bio/BioRenderer.tsx', content);
  console.log('Updated portfolio rendering!');
} else {
  console.log('Could not find oldReturn in BioRenderer.tsx');
}
