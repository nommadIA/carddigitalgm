import fs from 'fs';
const file = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(file, 'utf8');

const returnStart = content.indexOf('  return (\n    <Page\n      title="Configurações"');
if (returnStart === -1) {
  console.error("Could not find return statement");
  process.exit(1);
}

const startMobile = content.lastIndexOf('    /* SMARTPHONE CAROUSEL VIEW */');
const mobileContent = content.substring(startMobile);

function extractMobileSection(index) {
  const p = mobileContent.indexOf(`{index === ${index} && (`);
  const pEnd = mobileContent.indexOf('\n            )}', p);
  const secMobile = mobileContent.substring(p, pEnd);
  const startDiv = secMobile.indexOf('<div className="flex flex-col gap-2">');
  const endDiv = secMobile.lastIndexOf('</div>', secMobile.lastIndexOf('</div>') - 1) + 6;
  return secMobile.substring(startDiv, endDiv);
}

const sec0Content = extractMobileSection(0); // Personalização
const sec1Content = extractMobileSection(1); // Tema e Estilo
const sec2Content = extractMobileSection(2); // Timbrado e Perfil
const sec3Content = extractMobileSection(3); // Notificações Push
const sec4Content = extractMobileSection(4); // Plano de Fundo

const pPagamento = content.lastIndexOf('<CreditCard size={20}', startMobile);
const pPagamentoStart = content.lastIndexOf('<div', pPagamento);
const pPagamentoEnd = content.indexOf('</div>\n              </div>\n            </div>', pPagamentoStart) + 46;
const secPagamento = content.substring(pPagamentoStart, pPagamentoEnd);

const secTimbrado = `
                    <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-4 px-4 relative overflow-hidden group">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 block">Timbrado A4 (PDF/JPG/PNG)</label>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-16 rounded bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden flex items-center justify-center relative shrink-0">
                          {uploadingTimbrado ? <Loader2 size={16} className="animate-spin text-slate-400" /> : timbradoUrl ? <img src={timbradoUrl} alt="Timbrado" className="w-full h-full object-cover" /> : <FileText size={20} className="opacity-50 text-slate-400" />}
                        </div>
                        <label className={\`gm-btn-soft flex-1 py-2 flex items-center justify-center gap-2 cursor-pointer \${uploadingTimbrado ? "opacity-50 pointer-events-none" : ""}\`}>
                          {uploadingTimbrado ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />}
                          {uploadingTimbrado ? "Enviando..." : "Escolher arquivo"}
                          <input type="file" accept="image/*,application/pdf" className="hidden" disabled={uploadingTimbrado} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadTimbrado(f); }} />
                        </label>
                      </div>
                    </Card>
`;

const sec2ContentWithTimbrado = sec2Content.replace('</Card>', '</Card>\n' + secTimbrado);

const newReturn = `  return (
    <Page
      title="Configurações"
      actions={
        <div className="flex gap-2">
          <AnimatePresence>
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-lg text-sm font-medium"
              >
                <Check size={16} />
                Salvo!
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            className="gm-btn-soft"
            onClick={exportJson}
            title="Exportar JSON"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            type="button"
            className="gm-btn"
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            <span className="hidden sm:inline">
              {saving ? "Salvando..." : "Salvar Configurações"}
            </span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col h-[calc(100dvh-120px)]">
        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {loading ? (
            <Card className="text-center p-10">Carregando...</Card>
          ) : viewMode === "desktop" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 pb-6 items-start">
              {/* COLUNA ESQUERDA */}
              <div className="space-y-4 md:space-y-6">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <Palette size={20} className="text-slate-400" /> Personalização
                  </h2>
                  ${sec0Content}
                </div>

                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <ImageIcon size={20} className="text-slate-400" /> Plano de Fundo
                  </h2>
                  ${sec4Content}
                </div>

                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <User size={20} className="text-slate-400" /> Timbrado e Perfil
                  </h2>
                  ${sec2ContentWithTimbrado}
                </div>
                
                ${secPagamento}
              </div>

              {/* COLUNA DIREITA */}
              <div className="space-y-4 md:space-y-6">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <Paintbrush size={20} className="text-slate-400" /> Tema e Estilo
                  </h2>
                  ${sec1Content}
                </div>

                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <Bell size={20} className="text-slate-400" /> Notificações Push
                  </h2>
                  ${sec3Content}
                </div>
              </div>
            </div>
          ) : (
${mobileContent}
      </div>
    </Page>
  );
}
`;

const newContent = content.substring(0, returnStart) + newReturn;
fs.writeFileSync(file, newContent);
console.log("File completely rebuilt!");
