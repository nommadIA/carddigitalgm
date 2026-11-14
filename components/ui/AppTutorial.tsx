// components/ui/AppTutorial.tsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, ChevronRight, ChevronLeft, Plus, Users, Wallet, ShoppingCart, 
  FileText, Sparkles, Check, Paintbrush, StickyNote, HelpCircle
} from "lucide-react";
import { playNotificationSound } from "../../lib/audio";

interface AppTutorialProps {
  onClose: () => void;
}

export default function AppTutorial({ onClose }: AppTutorialProps) {
  const [step, setStep] = useState(0);
  const [selectedIconHelp, setSelectedIconHelp] = useState<string | null>(null);
  const [simulatedBudget, setSimulatedBudget] = useState(false);
  const [customNote, setCustomNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [tempColor, setTempColor] = useState("");

  const stepsCount = 6;

  // Change primary color CSS variable visually during tutorial simulation
  const changeBrandColorSim = (colorHex: string) => {
    setTempColor(colorHex);
    document.documentElement.style.setProperty("--gm-primary", colorHex);
    document.documentElement.style.setProperty("--gm-primary-30", `${colorHex}4d`);
    try {
      playNotificationSound();
    } catch (e) {}
  };

  const handleNext = () => {
    if (step < stepsCount - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("gm.tutorialCompleted", "true");
    localStorage.removeItem("gm.tutorialForceStart");
    onClose();
    try {
      playNotificationSound();
    } catch (e) {}
  };

  // Close tutorial on ESC press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleComplete();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="relative w-full max-w-lg bg-[#131315] border border-[#26262A] rounded-lg overflow-hidden shadow-[0_24px_56px_rgba(0,0,0,0.9)] flex flex-col min-h-[500px] animate-fade-in"
      >
        {/* Progress Bar Header */}
        <div className="w-full h-1.5 bg-[#0B0B0C] flex">
          {Array.from({ length: stepsCount }).map((_, idx) => (
            <div 
              key={idx} 
              className={`h-full flex-1 transition-all duration-300 ${
                idx <= step ? "bg-[var(--gm-primary)]" : "bg-[#26262A]"
              }`}
            />
          ))}
        </div>

        {/* Floating Skip/Close Button */}
        <button 
          type="button"
          onClick={handleComplete}
          className="absolute top-4 right-4 w-8 h-8 rounded-[4px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] text-[#8B8B92] hover:text-white flex items-center justify-center transition-colors z-20 cursor-pointer"
          title="Pular Tutorial"
        >
          <X size={16} />
        </button>

        {/* Step Contents */}
        <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-center py-4"
            >
              {step === 0 && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-lg bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/30 flex items-center justify-center text-[var(--gm-primary)]">
                    <Sparkles size={32} className="text-[var(--gm-primary)]" />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    Bem-vindo ao CardDigital <span className="text-[var(--gm-primary)]">GM</span>!
                  </h3>
                  <p className="text-sm text-[#CBD5E1] leading-relaxed max-w-sm mx-auto">
                    Parabéns pelo cadastro! Vamos fazer um tour interativo rápido para aprender a usar as principais funções. É prático e rápido!
                  </p>
                  <div className="bg-[#0B0B0C] border border-[#26262A] rounded-md p-4 text-left space-y-3 max-w-sm mx-auto">
                    <div className="flex items-center gap-3 text-xs text-[#CBD5E1]">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span><b>Orçamentos:</b> Calcule em segundos.</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#CBD5E1]">
                      <div className="w-2 h-2 rounded-full bg-[var(--gm-primary)] shrink-0" />
                      <span><b>Clientes:</b> Lista de contatos e obras integradas.</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#CBD5E1]">
                      <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span><b>Aparência:</b> Carregue sua logo e cores.</span>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/30 flex items-center justify-center text-[var(--gm-primary)] shrink-0">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white leading-tight">Painel de Atalhos Rápidos</h4>
                      <p className="text-xs text-zinc-400">Na versão Desktop, todos os 5 atalhos ficam em uma única linha!</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Facilidade de acesso! Toque em qualquer ícone abaixo para ver o que cada atalho oficial realiza:
                  </p>

                  <div className="grid grid-cols-5 gap-3 py-2">
                    {[
                      { key: "orc", label: "Novo Orçamento", icon: Plus },
                      { key: "cli", label: "Clientes", icon: Users },
                      { key: "fin", label: "Financeiro", icon: Wallet },
                      { key: "mer", label: "Mercado", icon: ShoppingCart },
                      { key: "not", label: "Notas", icon: StickyNote },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSel = selectedIconHelp === item.key;
                      return (
                        <button
                          key={item.key}
                          onClick={() => {
                            setSelectedIconHelp(item.key);
                            try { playNotificationSound(); } catch (e) {}
                          }}
                          className={`p-2.5 rounded-md border flex flex-col items-center justify-center gap-1.5 aspect-square transition-colors cursor-pointer ${
                            isSel 
                              ? "bg-[var(--gm-primary)]/15 border-[var(--gm-primary)] text-[var(--gm-primary)]"
                              : "bg-[#0B0B0C] border-[#26262A] text-[#8B8B92] hover:border-[#3F3F46] hover:text-white"
                          }`}
                        >
                          <Icon size={20} />
                          <span className="text-[11px] font-bold text-center truncate w-full">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="min-h-[64px] bg-[#0B0B0C] border border-[#26262A] rounded-md p-3 flex items-center justify-center text-center">
                    {selectedIconHelp === "orc" && (
                      <p className="text-xs text-[var(--gm-primary)] font-bold">Novo Orçamento: Preencha materiais, mão de obra, margens e gere Orçamentos e PDFs prontos!</p>
                    )}
                    {selectedIconHelp === "cli" && (
                      <p className="text-xs text-[var(--gm-primary)] font-bold">Clientes: Cadastro completo de clientes para acompanhamento e envio de mensagens.</p>
                    )}
                    {selectedIconHelp === "fin" && (
                      <p className="text-xs text-[var(--gm-primary)] font-bold">Financeiro: Entradas, saídas de caixa e faturamento estimado unificado.</p>
                    )}
                    {selectedIconHelp === "mer" && (
                      <p className="text-xs text-[var(--gm-primary)] font-bold">Mercado: Lista de suprimentos comuns da construção civil para pesquisa e cálculo rápida.</p>
                    )}
                    {selectedIconHelp === "not" && (
                      <p className="text-xs text-[var(--gm-primary)] font-bold">Notas: Rascunho de anotações e checklists salvos na hora localmente!</p>
                    )}
                    {!selectedIconHelp && (
                      <p className="text-xs text-[#8B8B92] italic">Toque em qualquer botão acima para simular a ação.</p>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/30 flex items-center justify-center text-[var(--gm-primary)] shrink-0">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white leading-tight">Criação Instantânea de Orçamentos</h4>
                      <p className="text-xs text-[#8B8B92]">Pronto para formatar e compartilhar</p>
                    </div>
                  </div>
                  <p className="text-sm text-[#CBD5E1] leading-relaxed">
                    Você digita os materiais e mão de obra, adiciona impostos ou margens e o app compacta tudo em um link ou PDF direto para o WhatsApp do cliente.
                  </p>

                  <div className="bg-[#0B0B0C] border border-[#26262A] rounded-md p-4 flex flex-col items-center gap-4 justify-center">
                    <span className="text-xs text-[#8B8B92] uppercase tracking-wider">Simulador de Emissão</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSimulatedBudget(true);
                        try { playNotificationSound(); } catch (e) {}
                      }}
                      className="h-10 w-full max-w-xs px-4 rounded-[6px] bg-[var(--gm-primary,#FE540B)] text-[#0B0B0C] flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider cursor-pointer"
                    >
                      <FileText size={16} />
                      Simular Emissão de Orçamento
                    </button>

                    {simulatedBudget && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full bg-emerald-500/15 border border-emerald-500/30 rounded-md p-3 flex gap-3 items-center"
                      >
                        <div className="w-8 h-8 rounded-[4px] bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <Check size={18} />
                        </div>
                        <div className="flex-1 text-left">
                          <h5 className="text-xs font-bold text-white">Orc_Reforma_648A.pdf Gerado!</h5>
                          <p className="text-[11px] text-emerald-400">Sucesso: Disponível para enviar ao WhatsApp!</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/30 flex items-center justify-center text-[var(--gm-primary)] shrink-0">
                      <StickyNote size={20} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white leading-tight">Lembretes e Notas Diárias</h4>
                      <p className="text-xs text-zinc-400">Escreva tarefas para não se esquecer na obra</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-300">
                    Insira as anotações do canteiro. Simule o salvamento digitando algo no campo abaixo:
                  </p>

                  <div className="space-y-3">
                    <textarea
                      placeholder="Ex: Comprar areia lavada, ligar para o eletricista..."
                      value={customNote}
                      onChange={(e) => {
                        setCustomNote(e.target.value);
                        setNoteSaved(false);
                      }}
                      className="gm-input w-full p-3 text-xs bg-black/60 border-white/5 rounded-lg h-24 focus:border-[var(--gm-primary)] text-white"
                    />
                    <button
                      disabled={!customNote}
                      onClick={() => {
                        setNoteSaved(true);
                        try { playNotificationSound(); } catch (e) {}
                      }}
                      className="gm-btn w-full py-2 flex items-center justify-center gap-2 text-xs font-bold disabled:opacity-55"
                    >
                      <Check size={14} />
                      Salvar Nota de Teste
                    </button>

                    {noteSaved && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-emerald-400 font-bold text-center"
                      >
                        ✓ Nota salva! Ela será listada no banco de Notas do app.
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/30 flex items-center justify-center text-[var(--gm-primary)] shrink-0">
                      <Paintbrush size={20} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white leading-tight">Sua Marca, Seu Estilo</h4>
                      <p className="text-xs text-zinc-400">Altere a logo e a cor em tempo real</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-300">
                    O app é seu! Você pode selecionar as cores de preferência. Toque em uma cor de teste abaixo para ver a mágica acontecer agora mesmo:
                  </p>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {[
                      { hex: "var(--gm-primary)", name: "Laranja GM (Oficial)" },
                      { hex: "#10b981", name: "Verde Esmeralda" },
                      { hex: "#e11d48", name: "Rosa Carmim" },
                    ].map((col) => (
                      <button
                        key={col.hex}
                        onClick={() => changeBrandColorSim(col.hex)}
                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                          tempColor === col.hex || (col.hex === "var(--gm-primary)" && !tempColor)
                            ? "border-[var(--gm-primary)] bg-[var(--gm-primary)]/10"
                            : "border-white/5 bg-white/5 hover:border-white/15"
                        }`}
                      >
                        <div 
                          className="w-8 h-8 rounded-full shadow-lg" 
                          style={{ backgroundColor: col.hex }}
                        />
                        <span className="text-[11px] text-[#CBD5E1] font-medium text-center">{col.name}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#8B8B92] text-center italic mt-1">
                    Nota: Acesse o menu Configurações para carregar sua logotipo e misturar outras cores personalizadas!
                  </p>
                </div>
              )}

              {step === 5 && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Check size={36} />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    Tudo Pronto para decolar!
                  </h3>
                  <p className="text-sm text-[#CBD5E1] leading-relaxed max-w-sm mx-auto">
                    Excelente! Você concluiu o seu mini tutorial interativo e aprendeu a usar o aplicativo CardDigital GM.
                  </p>
                  <div className="bg-[#0B0B0C] rounded-md p-4 border border-[#26262A] max-w-sm mx-auto flex items-center gap-3 text-left">
                    <HelpCircle size={22} className="text-[var(--gm-primary)] shrink-0" />
                    <div>
                      <h5 className="text-xs font-bold text-white">Dica Extra</h5>
                      <p className="text-[11px] text-[#8B8B92]">Você pode refazer este tutorial quando quiser clicando no botão em <b>Configurações</b>!</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer Controls */}
          <div className="flex items-center justify-between border-t border-[#26262A] pt-4 mt-4 select-none shrink-0">
            {/* Back Button */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={step === 0}
              className="h-9 px-3.5 rounded-[6px] flex items-center gap-1.5 text-xs font-bold text-[#8B8B92] hover:text-white hover:bg-[#1B1B1E] transition-colors disabled:opacity-0 disabled:pointer-events-none cursor-pointer whitespace-nowrap"
            >
              <ChevronLeft size={16} />
              Anterior
            </button>

            {/* Steps Counter */}
            <span className="text-[11px] font-mono text-[#8B8B92] tabular-nums">
              Passo {step + 1} de {stepsCount}
            </span>

            {/* Next / Complete button */}
            <button
              type="button"
              onClick={handleNext}
              className="h-10 px-5 rounded-[6px] bg-[var(--gm-primary,#FE540B)] hover:brightness-110 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0B0B0C] transition-colors cursor-pointer whitespace-nowrap"
            >
              {step === stepsCount - 1 ? "Concluir" : "Próximo"}
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
