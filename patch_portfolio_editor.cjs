const fs = require('fs');
let content = fs.readFileSync('pages/Bio.tsx', 'utf-8');

const targetStr = `                              <div className="bg-zinc-950/50 p-3 sm:p-4 rounded-xl border border-zinc-800/50">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                                  <span className="text-xs font-semibold text-slate-300">Banners internos ({item.layers?.length || 0})</span>`;

const replacement = `                              <div className="bg-zinc-950/50 p-3 sm:p-4 rounded-xl border border-zinc-800/50">
                                <div className="mb-6">
                                  <label className="gm-label mb-2 block text-xs">Descrição do Portfólio</label>
                                  <textarea 
                                    className={\`gm-input min-h-[120px] w-full resize-y rounded-xl p-3 bg-zinc-900/50 border border-zinc-800 focus:border-[var(--primary-color)] outline-none transition-colors \${item.description_align === "left" ? "text-left" : item.description_align === "right" ? "text-right" : "text-center"} \${item.description_bold ? "font-bold" : "font-medium"} \${item.description_italic ? "italic" : "not-italic"} \${getFontSizeClass(item.description_size)} bio-desc-font-\${item.description_font || "ui"}\`}
                                    value={item.description || ''}
                                    onChange={(e) => handleUpdatePortfolioCollection(item.id, { description: e.target.value })}
                                    placeholder="Descreva o projeto..."
                                  />
                                  <div className="flex flex-wrap items-center gap-2 bg-[#0d0e12]/60 p-2 rounded-xl border border-zinc-800/50 mt-2">
                                    <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800 shadow-inner">
                                      <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_align: "left" })} className={\`p-1.5 rounded-md transition-colors \${(!item.description_align || item.description_align === 'left') ? 'bg-[var(--primary-color)] text-white' : 'text-slate-400 hover:text-white hover:bg-zinc-700'}\`}><AlignLeft className="w-4 h-4" /></button>
                                      <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_align: "center" })} className={\`p-1.5 rounded-md transition-colors \${item.description_align === 'center' ? 'bg-[var(--primary-color)] text-white' : 'text-slate-400 hover:text-white hover:bg-zinc-700'}\`}><AlignCenter className="w-4 h-4" /></button>
                                      <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_align: "right" })} className={\`p-1.5 rounded-md transition-colors \${item.description_align === 'right' ? 'bg-[var(--primary-color)] text-white' : 'text-slate-400 hover:text-white hover:bg-zinc-700'}\`}><AlignRight className="w-4 h-4" /></button>
                                    </div>
                                    <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800 shadow-inner">
                                      <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_bold: !item.description_bold })} className={\`p-1.5 rounded-md transition-colors \${item.description_bold ? 'bg-[var(--primary-color)] text-white' : 'text-slate-400 hover:text-white hover:bg-zinc-700'}\`}><Bold className="w-4 h-4 font-bold" /></button>
                                      <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_italic: !item.description_italic })} className={\`p-1.5 rounded-md transition-colors \${item.description_italic ? 'bg-[var(--primary-color)] text-white' : 'text-slate-400 hover:text-white hover:bg-zinc-700'}\`}><Italic className="w-4 h-4 italic" /></button>
                                    </div>
                                    <div className="flex-1 min-w-[140px]">
                                      <select className="gm-input !h-8 !py-0 !px-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-slate-300 w-full" value={item.description_font || "ui"} onChange={e => handleUpdatePortfolioCollection(item.id, { description_font: e.target.value })}>
                                        <option value="ui">Inter (Sistema)</option>
                                        <option value="funnel">Funnel (Títulos)</option>
                                        <option value="roboto">Roboto</option>
                                        <option value="montserrat">Montserrat</option>
                                        <option value="poppins">Poppins</option>
                                        <option value="playfair">Playfair Display</option>
                                        <option value="outfit">Outfit</option>
                                      </select>
                                    </div>
                                    <div className="w-[80px]">
                                      <select className="gm-input !h-8 !py-0 !px-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-slate-300 w-full" value={item.description_size || "16 pt"} onChange={e => handleUpdatePortfolioCollection(item.id, { description_size: e.target.value })}>
                                        <option value="10 pt">10 pt</option>
                                        <option value="12 pt">12 pt</option>
                                        <option value="14 pt">14 pt</option>
                                        <option value="16 pt">16 pt</option>
                                        <option value="18 pt">18 pt</option>
                                        <option value="20 pt">20 pt</option>
                                        <option value="24 pt">24 pt</option>
                                        <option value="30 pt">30 pt</option>
                                        <option value="36 pt">36 pt</option>
                                        <option value="48 pt">48 pt</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 border-t border-zinc-800/50 pt-4">
                                  <span className="text-xs font-semibold text-slate-300">Banners internos ({item.layers?.length || 0})</span>`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacement);
  fs.writeFileSync('pages/Bio.tsx', content);
  console.log('Injected description editor successfully!');
} else {
  console.log('Failed to find target string!');
}
