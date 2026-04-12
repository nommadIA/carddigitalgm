import fs from 'fs';

let content = fs.readFileSync('./pages/Budgets.tsx', 'utf8');

const targetContent = `      ) : tab === "CONCLUIDOS" ? (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="text-sm min-w-[600px]">
              <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 border-b border-white/10 font-bold opacity-60 uppercase tracking-wider text-xs">
                <div>Data</div>
                <div>Descrição</div>
                <div className="text-right">Ações</div>
              </div>
              <div className="pb-2">
                {filtered.map((r) => {
                  const created = r.created_at ? new Date(r.created_at) : null;
                  
                  const listBtnClass = (tone: "neutral" | "green" | "red" | "orange" = "neutral") => {
                    const base = "gm-btn w-10 h-10 flex items-center justify-center shrink-0";
                    if (tone === "orange") return \`\${base} gm-btn-soft\`;
                    if (tone === "green") return \`\${base} gm-btn-soft\`;
                    if (tone === "red") return \`\${base} gm-btn-danger\`;
                    return \`\${base} gm-btn-soft\`;
                  };

                  return (
                    <div
                      key={r.id}
                      className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors items-center"
                    >
                      <div className="text-slate-400 font-mono text-xs">
                        {created ? created.toLocaleDateString("pt-BR") : "-"}
                      </div>
                      <div className="font-medium">
                        <span className="font-extrabold text-white mr-2">{(r.client_name || "CLIENTE").toUpperCase()}</span>
                        <span className="text-slate-300">{r.title || "Orçamento"}</span>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <div className="text-right font-bold text-[var(--gm-primary)] mr-4">
                          {CURRENCY.format(Number(r.total_amount || 0))}
                        </div>
                        <button className={listBtnClass("orange")} title="Editar" onClick={() => setEditId(r.id)} type="button">
                          <Pencil size={16} />
                        </button>
                        <button 
                          className={listBtnClass("green")} 
                          title="Compartilhar" 
                          onClick={() => handleShare(r)} 
                          type="button"
                          disabled={sharing === r.id}
                        >
                          {sharing === r.id ? (
                            <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Share2 size={16} />
                          )}
                        </button>
                        <button className={listBtnClass("red")} title="Lixeira" onClick={() => softDelete(r.id)} type="button">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      ) : (`;

const replacementContent = `      ) : (tab === "CONCLUIDOS" || tab === "CANCELADOS" || tab === "LIXEIRA") ? (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="text-sm min-w-full">
              <div className="hidden sm:grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 border-b border-white/10 font-bold opacity-60 uppercase tracking-wider text-xs">
                <div>Data</div>
                <div>Descrição</div>
                <div className="text-right">Ações</div>
              </div>
              <div className="pb-2">
                {filtered.map((r) => {
                  const created = r.created_at ? new Date(r.created_at) : null;
                  
                  const listBtnClass = (tone: "neutral" | "green" | "red" | "orange" = "neutral") => {
                    const base = "gm-btn w-10 h-10 flex items-center justify-center shrink-0";
                    if (tone === "orange") return \`\${base} gm-btn-soft\`;
                    if (tone === "green") return \`\${base} gm-btn-soft\`;
                    if (tone === "red") return \`\${base} gm-btn-danger\`;
                    return \`\${base} gm-btn-soft\`;
                  };

                  return (
                    <div
                      key={r.id}
                      className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto] gap-2 sm:gap-4 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors sm:items-center"
                    >
                      <div className="flex justify-between sm:contents">
                        <div className="text-slate-400 font-mono text-xs sm:text-sm">
                          {created ? created.toLocaleDateString("pt-BR") : "-"}
                        </div>
                        <div className="sm:hidden text-right font-bold text-[var(--gm-primary)]">
                          {CURRENCY.format(Number(r.total_amount || 0))}
                        </div>
                      </div>
                      <div className="font-medium truncate">
                        <span className="font-extrabold text-white mr-2">{(r.client_name || "CLIENTE").toUpperCase()}</span>
                        <span className="text-slate-300">{r.title || "Orçamento"}</span>
                      </div>
                      <div className="flex items-center gap-2 justify-between sm:justify-end mt-2 sm:mt-0">
                        <div className="hidden sm:block text-right font-bold text-[var(--gm-primary)] mr-4">
                          {CURRENCY.format(Number(r.total_amount || 0))}
                        </div>
                        <div className="flex items-center gap-2">
                          {tab !== "LIXEIRA" ? (
                            <>
                              <button className={listBtnClass("orange")} title="Editar" onClick={() => setEditId(r.id)} type="button">
                                <Pencil size={16} />
                              </button>
                              <button 
                                className={listBtnClass("green")} 
                                title="Compartilhar" 
                                onClick={() => handleShare(r)} 
                                type="button"
                                disabled={sharing === r.id}
                              >
                                {sharing === r.id ? (
                                  <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Share2 size={16} />
                                )}
                              </button>
                              <button className={listBtnClass("red")} title="Lixeira" onClick={() => softDelete(r.id)} type="button">
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button className={listBtnClass("green")} title="Restaurar" onClick={() => restore(r.id)} type="button">
                                <RotateCcw size={16} />
                              </button>
                              <button
                                className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-300 transition-all flex items-center justify-center shrink-0"
                                title="Excluir Definitivamente"
                                onClick={() => hardDelete(r.id)}
                                type="button"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      ) : (`;

content = content.replace(targetContent, replacementContent);
fs.writeFileSync('./pages/Budgets.tsx', content);
console.log('Replaced successfully');
