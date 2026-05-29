import fs from 'fs';

let content = fs.readFileSync('pages/Configuracoes.tsx', 'utf-8');

// Add the Desktop version (ROW 5)
// It was right before the "</div> } : ( <div className="lg:hidden ...""

content = content.replace(
  `                  </div>
                </Card>
              </div>

            </div>
          ) : (`,
  `                  </div>
                </Card>
              </div>

              {/* ROW 5 */}
              <div className="flex flex-col h-full lg:col-span-2">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <HelpCircle size={20} className="text-[var(--gm-primary)]" /> Tutorial do Aplicativo
                </h2>
                <Card className="flex flex-col flex-1 border border-black/10 dark:border-white/10 shadow-sm rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md transition-all duration-300 py-6 px-6 relative overflow-hidden group items-center justify-center text-center">
                  <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto flex-1">
                    <div className="w-16 h-16 rounded-full bg-[var(--gm-primary)]/10 text-[var(--gm-primary)] flex items-center justify-center mb-4">
                      <Sparkles size={32} />
                    </div>
                    <div className="space-y-2 mb-6 shrink-0">
                      <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                        Passo a Passo Interativo
                      </h4>
                      <p className="text-xs text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                        Quer rever as principais funções e usabilidade do painel principal? Inicie o assistente de onboarding.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        localStorage.removeItem("gm.tutorialCompleted");
                        localStorage.setItem("gm.tutorialForceStart", "true");
                        navigate("/");
                      }}
                      className="gm-btn py-3 px-6 flex items-center justify-center gap-2 text-sm w-full transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Sparkles size={16} />
                      Iniciar Tutorial do App
                    </button>
                  </div>
                </Card>
              </div>

            </div>
          ) : (`
);

// Add the Mobile Icon to the Tabs
content = content.replace(
  `                  { id: 6, label: "Toques", icon: Volume2 },
                ].map((tab) => {`,
  `                  { id: 6, label: "Toques", icon: Volume2 },
                  { id: 7, label: "Manual", icon: HelpCircle },
                ].map((tab) => {`
);

// Add the Mobile content block (index === 7)
content = content.replace(
  `                                        })}
                                      </div>
                                    </Card>
                                  </div>
                                </>
                              )}
                            </div>
                          </motion.div>`,
  `                                        })}
                                      </div>
                                    </Card>
                                  </div>
                                </>
                              )}
                              {index === 7 && (
                                <>
                                  <div className="flex items-center justify-between mb-1 shrink-0">
                                    <h2 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-wider">
                                      <HelpCircle size={16} className="text-[var(--gm-primary)]" /> Tutorial Interativo
                                    </h2>
                                  </div>

                                  <div className="flex flex-col gap-3">
                                    <Card className="!border-none !shadow-none bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl p-5 relative overflow-hidden flex flex-col items-center justify-center text-center h-auto">
                                      <div className="w-12 h-12 rounded-full bg-[var(--gm-primary)]/10 text-[var(--gm-primary)] flex items-center justify-center mb-3">
                                        <Sparkles size={24} />
                                      </div>
                                      <div className="space-y-1.5 mb-5 shrink-0">
                                        <h4 className="text-base font-bold text-slate-800 dark:text-white">
                                          Aprenda em Segundos
                                        </h4>
                                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 max-w-[240px] mx-auto leading-relaxed">
                                          Quer rever as principais funções e usabilidade do painel principal? Inicie o assistente virtual passo a passo agora.
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          localStorage.removeItem("gm.tutorialCompleted");
                                          localStorage.setItem("gm.tutorialForceStart", "true");
                                          navigate("/");
                                        }}
                                        className="gm-btn py-2.5 px-6 flex items-center justify-center gap-2 text-xs w-full transition-all hover:scale-[1.02] active:scale-[0.98]"
                                      >
                                        <Sparkles size={14} />
                                        Iniciar Tutorial
                                      </button>
                                    </Card>
                                  </div>
                                </>
                              )}
                            </div>
                          </motion.div>`
);

fs.writeFileSync('pages/Configuracoes.tsx', content);
