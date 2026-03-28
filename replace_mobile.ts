import fs from 'fs';

const filePath = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '    /* SMARTPHONE CAROUSEL VIEW */';
const endMarker = '      )}\n        </div>\n      </div>\n    </Page>\n  );\n}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);
console.log('startIndex:', startIndex, 'endIndex:', endIndex);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found');
  process.exit(1);
}

const newMobileView = `{/* MOBILE VIEW - CAROUSEL */}
      {viewMode === "mobile" && (
        <div className="lg:hidden w-full max-w-md mx-auto relative h-[calc(100vh-140px)] flex flex-col">
          
          <div className="flex-1 relative overflow-hidden w-full pt-4 pb-12">
            <motion.div 
              className="absolute inset-0 flex items-center"
              initial={false}
            >
              <motion.div
                className="flex w-full h-full"
                animate={{ x: \`-\${currentScreen * 100}%\` }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
              >
                <motion.div
                  className="flex w-full h-full"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = offset.x * velocity.x;
                    if (offset.x < -50 && currentScreen < 6) {
                      setCurrentScreen(currentScreen + 1);
                    } else if (offset.x > 50 && currentScreen > 0) {
                      setCurrentScreen(currentScreen - 1);
                    }
                  }}
                >
                {[0, 1, 2, 3, 4, 5, 6].map((index) => {
                  const isActive = index === currentScreen;
                  return (
                    <motion.div
                      key={index}
                      className="w-full h-full shrink-0 overflow-hidden px-2 flex flex-col justify-start"
                      animate={{ 
                        filter: isActive ? "blur(0px)" : "blur(4px)", 
                        opacity: isActive ? 1 : 0.5,
                        scale: isActive ? 1 : 0.95
                      }}
                      transition={{ duration: 0.3 }}
                    >
                {index === 0 && (
                  <div className="w-full h-full flex-shrink-0 flex flex-col">
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <Palette size={20} className="text-slate-400" /> Personalização
                      </h2>
                    </div>

                    <div className="flex flex-col gap-2 h-full">
                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-3 px-3 relative overflow-hidden group flex-1 flex flex-col justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden flex items-center justify-center relative shrink-0">
                            {uploadingLogo ? (
                              <Loader2 size={24} className="animate-spin text-slate-400" />
                            ) : companyLogoUrl ? (
                              <img src={companyLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                              <ImageIcon size={24} className="opacity-50 text-slate-400" />
                            )}
                          </div>
                          <label className={\`gm-btn w-full py-2 flex items-center justify-center gap-2 cursor-pointer \${uploadingLogo ? "opacity-50 pointer-events-none" : ""}\`}>
                            {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={16} />}
                            {uploadingLogo ? "Enviando..." : "Alterar Logo"}
                            <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadLogo(f); }} />
                          </label>
                        </div>
                      </Card>

                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-3 px-3 relative overflow-hidden group flex-1 flex flex-col justify-center">
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nome da empresa</label>
                            <input className="gm-input py-2 text-sm h-10" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Escala Global</label>
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                              <input type="range" min={0.7} max={3} step={0.05} className="flex-1 h-1.5 accent-[var(--gm-primary)]" value={mobileScale} onChange={(e) => setMobileScale(Number(e.target.value))} />
                              <div className="w-10 text-center font-bold text-xs text-[var(--gm-primary)]">{mobileScale}x</div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
              )}

              {index === 1 && (
                  <div className="w-full h-full flex-shrink-0 flex flex-col">
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <Paintbrush size={20} className="text-slate-400" /> Tema e Estilo
                      </h2>
                    </div>

                    <div className="flex flex-col gap-2 h-full">
                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-3 px-3 relative overflow-hidden group flex-1 flex flex-col justify-center">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 block">Temas de Cores</label>
                        <div className="grid grid-cols-5 gap-3">
                          {PRESET_THEMES.map((t) => {
                            const isActive = brandPrimary.toLowerCase() === t.primary.toLowerCase();
                            return (
                              <button
                                key={t.name}
                                type="button"
                                onClick={() => applyTheme(t)}
                                className={\`relative flex items-center justify-center aspect-square rounded-full transition-all \${
                                  isActive ? "ring-2 ring-[var(--gm-primary)] ring-offset-2 ring-offset-white dark:ring-offset-slate-800 scale-110 shadow-lg shadow-[var(--gm-primary-30)]" : "hover:scale-105 opacity-80"
                                }\`}
                                title={t.name}
                              >
                                <div 
                                  className="w-full h-full rounded-full shadow-inner border border-black/5 dark:border-white/5" 
                                  style={{ 
                                    background: \`linear-gradient(135deg, \${t.primary} 0%, \${t.primary} 50%, \${t.accent} 50%, \${t.accent} 100%)\` 
                                  }} 
                                />
                                {isActive && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <Check size={12} className="text-white drop-shadow-md" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </Card>

                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-3 px-3 relative overflow-hidden group flex-1 flex flex-col justify-center">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 block">Estilo dos Botões</label>
                        <div className="grid grid-cols-2 gap-3">
                          {BUTTON_STYLES.map((s) => {
                            const isActive = buttonStyle === s.id;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setButtonStyle(s.id)}
                                className={\`flex flex-col items-center justify-between p-3 rounded-xl border-2 transition-all h-20 \${
                                  isActive ? "border-[var(--gm-primary)] bg-[var(--gm-primary-10)]" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                                }\`}
                              >
                                <div className={\`w-full py-1.5 text-[10px] font-bold rounded-md flex items-center justify-center \${
                                  s.id === "solid" ? "bg-[var(--gm-primary)] text-white" : "bg-transparent border border-[var(--gm-primary)] text-[var(--gm-primary)]"
                                }\`}>Preview</div>
                                <span className={\`text-[9px] font-bold uppercase tracking-wider \${isActive ? "text-[var(--gm-primary)]" : "text-slate-500"}\`}>
                                  {s.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </Card>
                    </div>
                  </div>
              )}

              {index === 2 && (
                  <div className="w-full h-full flex-shrink-0 flex flex-col">
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <CreditCard size={20} className="text-slate-400" /> Pix (Pagamento)
                      </h2>
                    </div>

                    <div className="flex flex-col gap-2 h-full">
                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-3 px-3 relative overflow-hidden group flex-1 flex flex-col justify-center">
                        <div className="space-y-2">
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Tipo de Chave</label>
                            <select className="gm-input py-2 text-sm h-10 w-full" value={pixType} onChange={(e) => setPixType(e.target.value)}>
                              <option value="CPF">CPF</option>
                              <option value="CNPJ">CNPJ</option>
                              <option value="EMAIL">E-mail</option>
                              <option value="PHONE">Telefone</option>
                              <option value="RANDOM">Aleatória</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Chave Pix</label>
                            <input className="gm-input py-2 text-sm h-10 w-full" value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="Sua chave Pix" />
                          </div>

                          {pixQrPreview && (
                            <div className="mt-2 flex flex-col items-center justify-center p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">QR Code Pix</div>
                              <img src={pixQrPreview} alt="QR Pix" className="w-24 h-24 rounded-lg shadow-sm mb-2" />
                              <button
                                  type="button"
                                  className="gm-btn-soft w-full justify-center py-2 text-xs"
                                  onClick={() => {
                                    const a = document.createElement("a");
                                    a.href = pixQrPreview;
                                    a.download = "pix_qr_configuracoes.png";
                                    a.click();
                                  }}
                                >
                                  <Download size={14} />
                                  Baixar QR
                                </button>
                            </div>
                          )}

                        </div>
                      </Card>
                    </div>
                  </div>
              )}

              {index === 3 && (
                  <div className="w-full h-full flex-shrink-0 flex flex-col">
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <User size={20} className="text-slate-400" /> Timbrado e Perfil
                      </h2>
                    </div>

                    <div className="flex flex-col gap-2 h-full">
                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-3 px-3 relative overflow-hidden group flex-1 flex flex-col justify-center">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 block">Avatar (perfil)</label>
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden flex items-center justify-center relative shrink-0">
                            {uploadingAvatar ? <Loader2 size={20} className="animate-spin text-slate-400" /> : avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <User size={24} className="opacity-50 text-slate-400" />}
                          </div>
                          <div className="flex flex-col gap-1 flex-1">
                            <label className={\`gm-btn py-2 flex items-center justify-center gap-2 cursor-pointer \${uploadingAvatar ? "opacity-50 pointer-events-none" : ""}\`}>
                              {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />}
                              {uploadingAvatar ? "Enviando..." : "Escolher arquivo"}
                              <input type="file" accept="image/*" className="hidden" disabled={uploadingAvatar} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadAvatar(f); }} />
                            </label>
                            <span className="text-[10px] text-slate-400 text-center">Formatos aceitos: JPG, PNG, GIF</span>
                          </div>
                        </div>
                      </Card>

                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-3 px-3 relative overflow-hidden group flex-1 flex flex-col justify-center">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start gap-2 justify-center">
                            <div className="flex flex-col items-center gap-2 flex-1">
                              <span className="text-[10px] font-semibold text-slate-500">Seu Timbrado</span>
                              <div className="w-24 h-36 rounded bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden flex items-center justify-center relative shrink-0">
                                {uploadingTimbrado ? <Loader2 size={24} className="animate-spin text-slate-400" /> : timbradoUrl ? <img src={timbradoUrl} alt="Timbrado" className="w-full h-full object-cover" /> : <FileText size={32} className="opacity-50 text-slate-400" />}
                              </div>
                              <label className={\`gm-btn w-full py-2 flex items-center justify-center gap-2 cursor-pointer \${uploadingTimbrado ? "opacity-50 pointer-events-none" : ""}\`}>
                                {uploadingTimbrado ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />}
                                {uploadingTimbrado ? "Enviando..." : "Importar"}
                                <input type="file" accept="image/*,application/pdf" className="hidden" disabled={uploadingTimbrado} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadTimbrado(f); }} />
                              </label>
                            </div>
                            <div className="flex flex-col items-center gap-2 flex-1">
                              <span className="text-[10px] font-semibold text-slate-500">Gabarito</span>
                              <div className="w-24 h-36 rounded bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden flex items-center justify-center relative shrink-0">
                                <img src={TIMBRADO_MODEL_URL} alt="Gabarito" className="w-full h-full object-cover" />
                              </div>
                              <a href={TIMBRADO_MODEL_URL} target="_blank" rel="noopener noreferrer" className="gm-btn w-full py-2 flex items-center justify-center gap-2">
                                <Download size={14} />
                                Baixar
                              </a>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
              )}

              {index === 4 && (
                  <div className="w-full h-full flex-shrink-0 flex flex-col">
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <Type size={20} className="text-slate-400" /> Fonte do App
                      </h2>
                    </div>

                    <div className="flex flex-col gap-2 h-full">
                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-3 px-3 relative overflow-hidden group flex-1 flex flex-col justify-center">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 block text-center">Família de Fonte</label>
                        <div className="grid grid-cols-2 gap-3">
                          {["Inter", "Roboto", "Poppins", "Montserrat"].map((font) => {
                            const isActive = fontFamily === font;
                            return (
                              <button
                                key={font}
                                type="button"
                                onClick={() => setFontFamily(font)}
                                className={\`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all h-20 \${
                                  isActive ? "border-[var(--gm-primary)] bg-[var(--gm-primary-10)]" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                                }\`}
                                style={{ fontFamily: font }}
                              >
                                <span className={\`text-base font-medium \${isActive ? "text-[var(--gm-primary)]" : "text-slate-700 dark:text-slate-300"}\`}>
                                  {font}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </Card>
                    </div>
                  </div>
              )}

              {index === 5 && (
                  <div className="w-full h-full flex-shrink-0 flex flex-col">
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <Bell size={20} className="text-slate-400" /> Notificações Push
                      </h2>
                    </div>

                    <div className="flex flex-col gap-2 h-full">
                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-3 px-3 relative overflow-hidden group flex flex-col items-center justify-center text-center flex-1">
                        {/* Background Glow */}
                        <div className={\`absolute -top-10 -right-10 w-48 h-48 blur-3xl rounded-full opacity-20 \${pushPermission === "granted" ? "bg-emerald-500" : "bg-amber-500"}\`} />
                        
                        <div className={\`w-24 h-24 rounded-full flex items-center justify-center mb-6 border-2 transition-all duration-500 \${
                          pushPermission === "granted" 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]" 
                            : "bg-amber-500/10 border-amber-500/30 text-amber-500 animate-pulse"
                        }\`}>
                          <Bell size={48} />
                        </div>

                        <div className="space-y-3 mb-8">
                          <h4 className="text-2xl font-bold text-slate-800 dark:text-white">
                            {pushPermission === "granted" ? "Notificações Ativas" : "Permissão Necessária"}
                          </h4>
                          <p className="text-sm text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                            {pushPermission === "granted" 
                              ? "Você receberá alertas importantes diretamente no seu dispositivo." 
                              : "Ative as notificações para não perder atualizações em tempo real."}
                          </p>
                        </div>

                        {pushPermission !== "granted" && (
                          <button
                            onClick={async () => {
                              const permission = await Notification.requestPermission();
                              setPushPermission(permission);
                            }}
                            className="gm-btn w-full py-4 text-base font-bold shadow-lg shadow-[var(--gm-primary-20)]"
                          >
                            Permitir Notificações
                          </button>
                        )}

                        <button
                          disabled={testing || pushPermission !== "granted"}
                          onClick={async () => {
                            setTesting(true);
                            if ("serviceWorker" in navigator) {
                              const reg = await navigator.serviceWorker.ready;
                              reg.active?.postMessage("TEST_NOTIFICATION");
                              setTimeout(() => setTesting(false), 1000);
                            }
                          }}
                          className={\`gm-btn-soft mt-4 py-4 flex items-center justify-center gap-2 text-base font-bold w-full transition-all \${
                            pushPermission !== "granted" ? "opacity-50 grayscale" : ""
                          }\`}
                        >
                          {testing ? <Loader2 size={20} className="animate-spin" /> : <Bell size={20} />}
                          {testing ? "Enviando teste..." : "Enviar Notificação de Teste"}
                        </button>
                      </Card>
                    </div>
                  </div>
              )}

              {index === 6 && (
                  <div className="w-full h-full flex-shrink-0 flex flex-col">
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <ImageIcon size={20} className="text-slate-400" /> Plano de Fundo
                      </h2>
                    </div>

                    <div className="flex flex-col gap-2 h-full">
                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-3 px-3 relative overflow-hidden group flex-1 flex flex-col justify-center">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">Plano de fundo</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">Ative para aparecer no app</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setBgEnabled(!bgEnabled)}
                              className={\`px-4 py-2 rounded-lg text-sm font-bold transition-all \${
                                bgEnabled ? "bg-[var(--gm-primary)] text-white shadow-md shadow-[var(--gm-primary-30)]" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                              }\`}
                            >
                              {bgEnabled ? "Ativo" : "Inativo"}
                            </button>
                          </div>



                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex justify-between">
                              <span>Opacidade</span>
                              <span className="text-[var(--gm-primary)]">{Math.round(bgOpacity * 100)}%</span>
                            </label>
                            <input type="range" min={0} max={100} step={1} className="w-full h-2 accent-[var(--gm-primary)]" value={bgOpacity} onChange={(e) => setBgOpacity(Number(e.target.value))} />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex justify-between">
                              <span>Zoom</span>
                              <span className="text-[var(--gm-primary)]">{bgScale}x</span>
                            </label>
                            <input type="range" min={1} max={2} step={0.1} className="w-full h-2 accent-[var(--gm-primary)]" value={bgScale} onChange={(e) => setBgScale(Number(e.target.value))} />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex justify-between">
                              <span>Desfoque</span>
                              <span className="text-[var(--gm-primary)]">{bgBlur}px</span>
                            </label>
                            <input type="range" min={0} max={24} step={1} className="w-full h-2 accent-[var(--gm-primary)]" value={bgBlur} onChange={(e) => setBgBlur(Number(e.target.value))} />
                          </div>

                          <div className="pt-4">
                            <label className="gm-btn w-full py-4 flex items-center justify-center gap-2 cursor-pointer text-base shadow-lg shadow-[var(--gm-primary-20)]">
                              <FileImage size={20} />
                              Upload Background
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadBackground(f); }} />
                            </label>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
              )}
                    </motion.div>
                  )
                })}

                </motion.div>
              </motion.div>
            </div>

          {/* PAGINATION DOTS - BOTTOM POSITION */}
          <div className="flex justify-center fixed left-0 right-0 z-[110] pointer-events-none pagination-dots-container">
            <div className="flex gap-1.5 pointer-events-auto">
              {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDirection(idx > currentScreen ? 1 : -1);
                    setCurrentScreen(idx);
                  }}
                  className={\`h-1 rounded-full transition-all duration-300 \${
                    idx === currentScreen ? "w-4 bg-[#ff6600] shadow-[0_0_8px_#ff6600]" : "w-1 bg-white/50"
                  }\`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
\n        </div>\n      </div>\n    </Page>\n  );\n}`;

const contentBefore = content.split(startMarker)[0];

fs.writeFileSync(filePath, contentBefore + newMobileView);
console.log('Mobile view replaced successfully');
