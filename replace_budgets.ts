import fs from 'fs';

let content = fs.readFileSync('./pages/Budgets.tsx', 'utf8');

const targetContent = `      ) : filtered.length === 0 ? (
        <Card className="text-center p-10 border-dashed opacity-70">Nenhum orçamento encontrado.</Card>
      ) : (
        <Grid cols={2}>
          {filtered.map((r) => {`;

const replacementContent = `      ) : filtered.length === 0 ? (
        <Card className="text-center p-10 border-dashed opacity-70">Nenhum orçamento encontrado.</Card>
      ) : tab === "CONCLUIDOS" ? (
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
                        <button className={iconBtn("orange")} title="Editar" onClick={() => setEditId(r.id)} type="button">
                          <Pencil size={16} />
                        </button>
                        <button 
                          className={iconBtn("green")} 
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
                        <button className={iconBtn("red")} title="Lixeira" onClick={() => softDelete(r.id)} type="button">
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
      ) : (
        <Grid cols={2}>
          {filtered.map((r) => {`;

content = content.replace(targetContent, replacementContent);
fs.writeFileSync('./pages/Budgets.tsx', content);
console.log('Replaced successfully');
