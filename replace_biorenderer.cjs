const fs = require('fs');
let content = fs.readFileSync('components/bio/BioRenderer.tsx', 'utf-8');

const oldSection = `          {/* Portfólio Section */}
          {bio.portfolio_items && bio.portfolio_items.length > 0 && (
            <div className="pt-4 space-y-4 relative">
              <div className="flex items-center justify-between px-2">
                {bio.portfolio_title && <h2 className={\`text-2xl sm:text-3xl font-black tracking-tight \${t.textTitle}\`}>{bio.portfolio_title}</h2>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {bio.portfolio_items.map((item: any) => (
                   <div 
                     key={item.id}
                     onClick={() => setZoomedImage(item.image_url)}
                     className="relative aspect-square w-full rounded-[1.5rem] overflow-hidden border shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-zoom-in bg-zinc-950/20 group flex items-center justify-center"
                     style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                   >
                     <img 
                       src={item.image_url} 
                       alt="Portfolio item" 
                       className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                       referrerPolicy="no-referrer" 
                     />
                     <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <span className="bg-black/60 backdrop-blur-md text-white rounded-full p-2.5 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300">
                         <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                         </svg>
                       </span>
                     </div>
                   </div>
                ))}
              </div>
            </div>
          )}`;

const newSection = `          {/* Portfólio Section */}
          {bio.portfolio_items && bio.portfolio_items.length > 0 && (
            <div className="pt-4 space-y-4 relative">
              <div className="flex items-center justify-between px-2">
                {bio.portfolio_title && <h2 className={\`text-2xl sm:text-3xl font-black tracking-tight \${t.textTitle}\`}>{bio.portfolio_title}</h2>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {bio.portfolio_items.map((item: any) => {
                   const isNewFormat = !!item.layers;
                   const coverImg = isNewFormat && item.layers.length > 0 ? item.layers[0].image_url : item.image_url;
                   
                   return (
                     <div 
                       key={item.id}
                       onClick={() => {
                         if (asPreview) {
                            alert("No modo de edição, abra o link publicamente para ver o portfólio completo.");
                            return;
                         }
                         const baseUrl = window.location.href.split('?')[0];
                         window.open(baseUrl + '?portfolio=' + item.id, '_blank');
                       }}
                       className="relative aspect-square w-full rounded-[1.5rem] overflow-hidden border shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer bg-zinc-950/20 group flex items-center justify-center"
                       style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                     >
                       {coverImg ? (
                         <img 
                           src={coverImg} 
                           alt={item.title || "Portfolio item"} 
                           className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                           referrerPolicy="no-referrer" 
                         />
                       ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center bg-black/5 dark:bg-white/5">
                           <Layout className="w-8 h-8 opacity-20 mb-2" />
                         </div>
                       )}
                       
                       {/* Overlay with Portfolio Title */}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 transition-opacity flex flex-col justify-end p-4">
                         <span className="text-white font-bold text-sm sm:text-base drop-shadow-md">
                           {item.title || "Portfólio"}
                         </span>
                         {isNewFormat && item.layers && (
                           <span className="text-white/70 text-xs font-semibold">
                             {item.layers.length} {item.layers.length === 1 ? 'imagem' : 'imagens'}
                           </span>
                         )}
                       </div>
                       
                       <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <span className="bg-black/60 backdrop-blur-md text-white rounded-full p-2.5 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 shadow-xl">
                           <ExternalLink className="w-5 h-5" />
                         </span>
                       </div>
                     </div>
                   );
                })}
              </div>
            </div>
          )}`;

if (content.includes('Portfólio Section')) {
  content = content.replace(oldSection, newSection);
  if (!content.includes('ExternalLink')) {
    content = content.replace('import { Share2,', 'import { Share2, ExternalLink, Layout,');
  }
  fs.writeFileSync('components/bio/BioRenderer.tsx', content);
  console.log('BioRenderer.tsx updated.');
} else {
  console.log('Not found.');
}
