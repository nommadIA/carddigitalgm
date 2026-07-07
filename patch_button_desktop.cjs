const fs = require('fs');
let content = fs.readFileSync('components/bio/BioRenderer.tsx', 'utf-8');

const desktopTarget = `                               {desc && (
                                 <div 
                                   className={\`mt-4 text-base md:text-lg lg:text-xl text-zinc-100 max-w-2xl leading-relaxed whitespace-pre-wrap \${bio.description_bold ? 'font-bold' : 'font-medium'} \${bio.description_italic ? 'italic' : ''}\`}
                                   dangerouslySetInnerHTML={{ __html: desc }}
                                 />
                               )}
                            </div>`;

const desktopReplace = `                               {desc && (
                                 <div 
                                   className={\`mt-4 text-base md:text-lg lg:text-xl text-zinc-100 max-w-2xl leading-relaxed whitespace-pre-wrap \${bio.description_bold ? 'font-bold' : 'font-medium'} \${bio.description_italic ? 'italic' : ''}\`}
                                   dangerouslySetInnerHTML={{ __html: desc }}
                                 />
                               )}
                               
                               {bio.portfolio_items && bio.portfolio_items.length > 0 && (
                                 <div className="mt-8 flex">
                                   <button 
                                     onClick={() => {
                                       const el = document.getElementById("portfolio-section");
                                       if (el) el.scrollIntoView({ behavior: 'smooth' });
                                     }}
                                     className="flex items-center gap-2 px-6 py-3 rounded-full text-base font-extrabold shadow-lg cursor-pointer transition-all duration-300 transform hover:scale-105 active:scale-95 text-white bg-gradient-to-r"
                                     style={{ 
                                       backgroundImage: \`linear-gradient(to right, \${brandColor}, \${brandColor}dd)\`,
                                     }}
                                   >
                                     <Layout className="w-5 h-5" /> Ver Portfólio
                                   </button>
                                 </div>
                               )}
                            </div>`;

if (content.includes(desktopTarget)) {
  content = content.replace(desktopTarget, desktopReplace);
  fs.writeFileSync('components/bio/BioRenderer.tsx', content);
  console.log("Desktop hero button injected.");
} else {
  console.log("Failed to find desktop hero target.");
}
