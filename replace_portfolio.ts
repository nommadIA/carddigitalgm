import fs from 'fs';

let content = fs.readFileSync('pages/Bio.tsx', 'utf-8');

// 1. Add deletedPortfolioItems state
if (!content.includes('const [deletedPortfolioItems, setDeletedPortfolioItems]')) {
  content = content.replace(
    'const [deletedCatalogItems, setDeletedCatalogItems] = useState<any[]>([]);',
    'const [deletedCatalogItems, setDeletedCatalogItems] = useState<any[]>([]);\n  const [deletedPortfolioItems, setDeletedPortfolioItems] = useState<any[]>([]);\n  const [activePortfolioTab, setActivePortfolioTab] = useState<"active" | "trash">("active");\n  const [editingPortfolioItem, setEditingPortfolioItem] = useState<any>(null);'
  );
}

// 2. Add handlers
const handlers = `
  const handleAddPortfolioCollection = () => {
    const current = bioConfig.portfolio_items || [];
    const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
    const newItem = {
      id: Date.now().toString(),
      title: \`Portfólio \${normalized.length + 1}\`,
      layers: []
    };
    handleChange("portfolio_items", [...normalized, newItem]);
  };

  const handleUpdatePortfolioCollection = (id: string, updates: any) => {
    const current = bioConfig.portfolio_items || [];
    const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
    handleChange("portfolio_items", normalized.map((p: any) => p.id === id ? { ...p, ...updates } : p));
  };

  const handleRemovePortfolioCollection = (id: string) => {
    const current = bioConfig.portfolio_items || [];
    const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
    const itemToDelete = normalized.find((i: any) => i.id === id);
    if (itemToDelete) {
      setDeletedPortfolioItems(prev => [...prev, itemToDelete]);
    }
    handleChange("portfolio_items", normalized.filter((p: any) => p.id !== id));
  };

  const restorePortfolioCollection = (id: string) => {
    const itemToRestore = deletedPortfolioItems.find(i => i.id === id);
    if (itemToRestore) {
      const current = bioConfig.portfolio_items || [];
      const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
      handleChange("portfolio_items", [...normalized, itemToRestore]);
      setDeletedPortfolioItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const permanentlyDeletePortfolioCollection = (id: string) => {
    setDeletedPortfolioItems(prev => prev.filter(i => i.id !== id));
  };

  const clearPortfolioTrash = () => {
    setDeletedPortfolioItems([]);
  };

  const handleUploadPortfolioLayer = async (portfolioId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      pushToast({ type: "info", title: "Upload", message: "Enviando banner..." });
      const url = await uploadImage(e.target.files[0]);
      
      const current = bioConfig.portfolio_items || [];
      const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
      
      handleChange("portfolio_items", normalized.map((p: any) => {
        if (p.id === portfolioId) {
          return {
            ...p,
            layers: [...(p.layers || []), { id: Date.now().toString(), image_url: url }]
          };
        }
        return p;
      }));
      
      pushToast({ type: "success", title: "Sucesso", message: "Banner adicionado" });
    } catch(err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao enviar banner" });
    }
  };

  const handleRemovePortfolioLayer = (portfolioId: string, layerId: string) => {
    const current = bioConfig.portfolio_items || [];
    const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
    
    handleChange("portfolio_items", normalized.map((p: any) => {
      if (p.id === portfolioId) {
        return {
          ...p,
          layers: (p.layers || []).filter((l: any) => l.id !== layerId)
        };
      }
      return p;
    }));
  };
`;

if (!content.includes('handleAddPortfolioCollection')) {
  content = content.replace(
    'const handleUploadPortfolioItem = async',
    handlers + '\n\n  const handleUploadPortfolioItem = async'
  );
}

const originalPortfolioSection = `          {/* SEÇÃO DE PORTFÓLIO */}
          <div className="gm-card p-4 sm:p-6 space-y-4">
            <button
               onClick={() => toggleSection('portfolio')}
               className="w-full flex justify-between items-center text-lg font-semibold text-white group"
            >
              <span className="flex items-center gap-2"><Layout className="w-5 h-5 text-[var(--primary-color)] group-hover:scale-110 transition-transform" /> Portfólio</span>
              {openSections.portfolio ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {openSections.portfolio && (
            <div className="animate-in fade-in slide-in-from-top-2 pt-2 space-y-5">
              {/* Seção Título do Portfólio */}
              <div className="w-full sm:max-w-sm">
                <label className="gm-label">Título da Seção</label>
                <input type="text" className="gm-input" value={bioConfig.portfolio_title || 'Portfólio'} onChange={e => handleChange("portfolio_title", e.target.value)} placeholder="Ex: Meu Portfólio" />
              </div>

              {/* UPLOAD E LISTA DE ITENS */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="font-bold text-white text-sm">Banners do Portfólio</h3>
                  
                  <label className="gm-btn gm-btn-outline px-3 py-1.5 text-[10px] flex items-center justify-center cursor-pointer hover:bg-[var(--primary-color)] hover:text-white transition-colors">
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    <span>Adicionar Banner</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadPortfolioItem} />
                  </label>
                </div>
                
                <div className="text-xs text-zinc-500 mb-2">Formato sugerido: Quadrado (ex: 1080x1080).</div>
                
                {bioConfig.portfolio_items && bioConfig.portfolio_items.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {bioConfig.portfolio_items.map((item: any, idx: number) => (
                      <div key={item.id} className="relative group rounded-xl overflow-hidden aspect-square border border-zinc-800 bg-zinc-950/50 flex items-center justify-center">
                         <OptimizedImage src={item.image_url} alt="Portfolio" className="max-w-full max-h-full object-contain" width={400} />
                         <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              type="button" 
                              onClick={() => handleRemovePortfolioItem(item.id)} 
                              className="text-red-400 hover:text-red-300 font-bold text-xs flex flex-col items-center gap-1"
                            >
                               <Trash className="w-5 h-5" />
                               Remover
                            </button>
                         </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
                    Nenhum banner no portfólio ainda.
                  </div>
                )}
              </div>
            </div>
            )}
          </div>`;

const newPortfolioSection = `          {/* SEÇÃO DE PORTFÓLIO */}
          <div className="gm-card p-4 sm:p-6 space-y-4">
            <button
               onClick={() => toggleSection('portfolio')}
               className="w-full flex justify-between items-center text-lg font-semibold text-white group"
            >
              <span className="flex items-center gap-2"><Layout className="w-5 h-5 text-[var(--primary-color)] group-hover:scale-110 transition-transform" /> Portfólio</span>
              {openSections.portfolio ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {openSections.portfolio && (
            <div className="animate-in fade-in slide-in-from-top-2 pt-2 space-y-5">
              {/* Seção Título do Portfólio */}
              <div className="w-full sm:max-w-sm">
                <label className="gm-label">Título da Seção</label>
                <input type="text" className="gm-input" value={bioConfig.portfolio_title || 'Portfólio'} onChange={e => handleChange("portfolio_title", e.target.value)} placeholder="Ex: Meu Portfólio" />
              </div>

              {/* UPLOAD E LISTA DE ITENS */}
              <div className="space-y-4 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mt-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setActivePortfolioTab("active")}
                      className={\`text-sm font-bold pb-2 border-b-2 transition-colors cursor-pointer \${activePortfolioTab === "active" ? "border-[var(--primary-color)] text-white" : "border-transparent text-slate-400 hover:text-slate-300"}\`}
                    >
                      Portfólios Ativos
                    </button>
                    <button
                      onClick={() => setActivePortfolioTab("trash")}
                      className={\`text-sm font-bold pb-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 \${activePortfolioTab === "trash" ? "border-red-500 text-red-400" : "border-transparent text-slate-400 hover:text-red-400"}\`}
                    >
                      <Trash2 className="w-4 h-4" />
                      Lixeira ({deletedPortfolioItems.length})
                    </button>
                  </div>
                  
                  {activePortfolioTab === "active" && (
                    <button 
                      onClick={handleAddPortfolioCollection}
                      className="gm-btn gm-btn-outline px-3 py-1.5 text-[10px] flex items-center justify-center cursor-pointer hover:bg-[var(--primary-color)] hover:text-white transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>Novo Portfólio</span>
                    </button>
                  )}
                </div>
                
                {activePortfolioTab === "active" ? (
                  <div className="space-y-4">
                    {(() => {
                      const current = bioConfig.portfolio_items || [];
                      const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio ' + p.id.slice(-3), layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
                      
                      if (normalized.length === 0) {
                        return (
                          <div className="py-8 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
                            Nenhum portfólio criado ainda.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {normalized.map((item: any) => (
                            <div key={item.id} className="border border-zinc-800 bg-zinc-900/40 rounded-xl overflow-hidden p-4 space-y-4">
                              <div className="flex items-center justify-between">
                                <input 
                                  type="text" 
                                  className="bg-transparent text-white font-bold text-sm outline-none border-b border-transparent focus:border-zinc-700 pb-1"
                                  value={item.title || ''}
                                  onChange={e => handleUpdatePortfolioCollection(item.id, { title: e.target.value })}
                                  placeholder="Nome do Portfólio"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemovePortfolioCollection(item.id)}
                                  className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                                  title="Mover para Lixeira"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              </div>
                              
                              <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-xs font-semibold text-slate-300">Camadas (Banners) ({item.layers?.length || 0})</span>
                                  <label className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2 py-1 rounded cursor-pointer transition-colors flex items-center gap-1">
                                    <Upload className="w-3 h-3" />
                                    Adicionar Banner
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadPortfolioLayer(item.id, e)} />
                                  </label>
                                </div>
                                
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                  {(item.layers || []).map((layer: any) => (
                                    <div key={layer.id} className="relative group aspect-square rounded-lg overflow-hidden bg-black border border-zinc-800">
                                      <OptimizedImage src={layer.image_url} alt="Layer" className="w-full h-full object-cover" width={200} />
                                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <button
                                          type="button"
                                          onClick={() => handleRemovePortfolioLayer(item.id, layer.id)}
                                          className="text-red-400 hover:text-red-300 p-2"
                                        >
                                          <Trash className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      {deletedPortfolioItems.length > 0 && (
                        <button
                          type="button"
                          onClick={clearPortfolioTrash}
                          className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                        >
                          Esvaziar Lixeira
                        </button>
                      )}
                    </div>
                    {deletedPortfolioItems.length === 0 ? (
                      <div className="text-center py-10 text-slate-500 text-sm border border-dashed border-slate-800 rounded-2xl space-y-2">
                        <Trash2 className="w-10 h-10 opacity-20 mx-auto text-slate-400" />
                        <p>A lixeira está vazia.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-900">
                        {deletedPortfolioItems.map((item: any, idx: number) => (
                          <div key={item.id || idx} className="py-3 flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1 flex items-center gap-3">
                              {item.layers && item.layers[0] && (
                                <div className="w-10 h-10 rounded bg-black overflow-hidden border border-zinc-800 shrink-0">
                                  <img src={item.layers[0].image_url} alt="" className="w-full h-full object-cover" />
                                </div>
                              )}
                              <h4 className="font-bold text-sm text-slate-300 truncate">{item.title || 'Portfólio Excluído'}</h4>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => restorePortfolioCollection(item.id)}
                                className="text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Restaurar portfólio"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Restaurar
                              </button>
                              <button
                                type="button"
                                onClick={() => permanentlyDeletePortfolioCollection(item.id)}
                                className="text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Excluir permanentemente"
                              >
                                <Trash className="w-3.5 h-3.5" />
                                Excluir
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            )}
          </div>`;

if (content.includes('Nenhum banner no portfólio ainda')) {
  content = content.replace(originalPortfolioSection, newPortfolioSection);
  fs.writeFileSync('pages/Bio.tsx', content);
  console.log('Bio.tsx successfully updated with advanced portfolio management.');
} else {
  console.log('Could not find original portfolio section to replace.');
}

