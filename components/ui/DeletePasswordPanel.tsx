import React, { useState, useMemo, useEffect } from "react";
import { Lock, Save, Trash2, AlertTriangle, Loader2, X } from "lucide-react";
import { setSecurityPassword, hardDeleteTrash } from "../../lib/trash";
import { supabase } from "../../lib/supabase";

export default function DeletePasswordPanel() {
  // Modal State for Password
  const [modalOpen, setModalOpen] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loadingPass, setLoadingPass] = useState(false);

  // Trash State
  const [trashPass, setTrashPass] = useState("");
  const [loadingTrash, setLoadingTrash] = useState(false);

  // Confirm Delete State
  const [showTrashConfirm, setShowTrashConfirm] = useState(false);

  useEffect(() => {
    if (!modalOpen && !showTrashConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showTrashConfirm && !loadingTrash) setShowTrashConfirm(false);
        else if (modalOpen && !loadingPass) setModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, showTrashConfirm, loadingPass, loadingTrash]);

  const canSavePass = useMemo(() => {
    return newPass.length >= 6 && newPass === confirmPass && !loadingPass;
  }, [newPass, confirmPass, loadingPass]);

  async function handleSavePass() {
    if (newPass.length < 6) {
        alert("A senha deve ter no mínimo 6 caracteres.");
        return;
    }
    if (newPass !== confirmPass) {
        alert("As senhas não conferem.");
        return;
    }

    try {
        setLoadingPass(true);
        await setSecurityPassword(newPass);
        await supabase.auth.refreshSession();
        alert("Senha de segurança atualizada com sucesso!");
        setNewPass("");
        setConfirmPass("");
        setModalOpen(false);
    } catch (e: any) {
        const msg = String(e?.message || "");
        if (msg.includes("password_too_short")) {
            alert("A senha deve ter no mínimo 6 caracteres.");
        } else {
            console.error(e);
            alert("Erro ao cadastrar senha: " + msg);
        }
    } finally {
        setLoadingPass(false);
    }
  }

  async function handleEmptyTrash() {
      if (!trashPass) return;
      
      try {
          setLoadingTrash(true);
          await hardDeleteTrash(trashPass);
          alert("Lixeira esvaziada com sucesso!");
          setTrashPass("");
          setShowTrashConfirm(false);
      } catch (e: any) {
           const msg = String(e?.message || "");
          if (msg.includes("invalid_app_password")) {
            alert("Erro: senha do aplicativo inválida");
          } else {
            alert("Erro: " + msg);
          }
      } finally {
          setLoadingTrash(false);
      }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
        {/* Card 1: Password Settings (Modal Trigger) */}
        <div className="gm-card p-6 rounded-lg flex flex-col justify-between">
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-[var(--gm-primary)]/10 rounded-lg text-[var(--gm-primary)] border border-[var(--gm-primary)]/20 shadow-[0_0_10px_var(--gm-primary-10)]">
                        <Lock size={20} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-base">Senha de Segurança</h3>
                        <p className="text-slate-400 text-xs">Protege exclusões definitivas.</p>
                    </div>
                </div>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                    Configure uma senha mestra para impedir exclusões acidentais de dados importantes (Clientes e Orçamentos).
                </p>
            </div>
            
            <button 
                onClick={() => setModalOpen(true)}
                className="w-full h-11 rounded-md border border-[#26262A] bg-[#131315] hover:bg-[#1B1B1E] text-[#F2F2F3] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
                Configurar / Alterar Senha
            </button>
        </div>

        {/* Card 2: Empty Trash */}
        <div className="gm-card p-6 rounded-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <AlertTriangle size={100} className="text-[#F65A1A]" />
            </div>

            <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="p-2 bg-[#F65A1A]/10 rounded-lg text-[#F65A1A] border border-[#F65A1A]/20">
                    <Trash2 size={20} />
                </div>
                <div>
                    <h3 className="text-white font-bold text-base">Esvaziar Lixeira Global</h3>
                    <p className="text-slate-400 text-xs">Limpa itens deletados de todos os módulos.</p>
                </div>
            </div>

            <div className="space-y-3 relative z-10">
                <input
                    type="password"
                    placeholder="Digite a senha de segurança atual"
                    value={trashPass}
                    onChange={(e) => setTrashPass(e.target.value)}
                    className="gm-input"
                />
                <button
                    onClick={() => setShowTrashConfirm(true)}
                    disabled={loadingTrash || !trashPass}
                    className="w-full h-11 rounded-md bg-[#F65A1A] hover:bg-[#FF7A38] text-[#0B0B0C] border border-[#F65A1A] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.3)] disabled:bg-[#18181B] disabled:border-[#26262A] disabled:text-[#52525B] disabled:cursor-not-allowed cursor-pointer"
                >
                    {loadingTrash ? <Loader2 className="animate-spin text-[#0B0B0C]" size={16} /> : <Trash2 size={16} className="text-[#0B0B0C]" />}
                    <span>{loadingTrash ? "Processando..." : "Esvaziar Tudo"}</span>
                </button>
            </div>
        </div>

        {/* Modal: Set Password */}
        {modalOpen && (
            <div className="fixed inset-0 z-[1000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => !loadingPass && setModalOpen(false)}>
                <div className="gm-modal w-full max-w-md rounded-lg bg-[#131315] border border-[#26262A] overflow-hidden relative z-10 animate-fade-in" onClick={e => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-[#26262A] flex justify-between items-center bg-[#0B0B0C]">
                        <h3 className="text-lg font-bold text-white">Definir Senha de Exclusão</h3>
                        <button
                          type="button"
                          onClick={() => !loadingPass && setModalOpen(false)}
                          className="w-8 h-8 rounded-[4px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] text-[#8B8B92] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                          title="Fechar"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                         <div className="p-3.5 bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/25 rounded-md text-xs sm:text-sm text-[var(--gm-primary)] flex items-start gap-3">
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <p>Essa senha será solicitada sempre que você tentar excluir algo <strong>definitivamente</strong>.</p>
                        </div>

                        <div className="space-y-3">
                            <input
                                type="password"
                                value={newPass}
                                onChange={(e) => setNewPass(e.target.value)}
                                placeholder="Nova senha (mín. 6)"
                                autoFocus
                                className="gm-input"
                            />
                             <input
                                type="password"
                                value={confirmPass}
                                onChange={(e) => setConfirmPass(e.target.value)}
                                placeholder="Confirmar nova senha"
                                className="gm-input"
                            />
                        </div>

                        <div className="pt-2 flex gap-3">
                             <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                disabled={loadingPass}
                                className="flex-1 h-10 rounded-[6px] border border-[#26262A] bg-[#1B1B1E] hover:bg-[#26262A] text-[#F2F2F3] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap"
                             >
                                Cancelar
                             </button>
                             <button
                                type="button"
                                onClick={handleSavePass}
                                disabled={!canSavePass}
                                className="flex-1 h-10 rounded-[6px] bg-[var(--gm-primary,#FE540B)] hover:brightness-110 text-[#0B0B0C] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
                             >
                                {loadingPass ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                Salvar
                             </button>
                        </div>
                        
                        <p className="text-[11px] text-[#8B8B92] text-center pt-1">
                           Dica: use letras + números + símbolo (ex: GM@2026!).
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Modal: Confirm Empty Trash */}
        {showTrashConfirm && (
            <div className="fixed inset-0 z-[1001] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => !loadingTrash && setShowTrashConfirm(false)}>
                <div className="gm-modal w-full max-w-sm rounded-lg bg-[#131315] border border-[#26262A] overflow-hidden relative z-10 animate-fade-in" onClick={e => e.stopPropagation()}>
                    <div className="p-6 text-center">
                        <div className="w-14 h-14 bg-[var(--gm-primary)]/10 rounded-md flex items-center justify-center mx-auto mb-4 border border-[var(--gm-primary)]/25">
                            <Trash2 size={28} className="text-[var(--gm-primary)]" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Esvaziar Lixeira?</h3>
                        <p className="text-[#8B8B92] text-xs sm:text-sm mb-6 leading-relaxed">
                            ATENÇÃO: Isso apagará TODOS os itens da Lixeira permanentemente. Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowTrashConfirm(false)}
                                disabled={loadingTrash}
                                className="flex-1 h-10 rounded-[6px] border border-[#26262A] bg-[#1B1B1E] hover:bg-[#26262A] text-[#F2F2F3] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleEmptyTrash}
                                disabled={loadingTrash}
                                className="flex-1 h-10 rounded-[6px] bg-[#F65A1A] hover:bg-[#FF7A38] text-[#0B0B0C] border border-[#F65A1A] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:bg-[#18181B] disabled:border-[#26262A] disabled:text-[#52525B] whitespace-nowrap"
                            >
                                {loadingTrash ? <Loader2 className="animate-spin text-[#0B0B0C]" size={16} /> : "Esvaziar"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}