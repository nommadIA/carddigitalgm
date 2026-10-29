import React, { useState, useMemo } from "react";
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
            <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in" onClick={() => !loadingPass && setModalOpen(false)}>
                <div className="gm-modal gm-card w-full max-w-md rounded-[24px] overflow-hidden !border-white/10 relative z-10 animate-fade-in" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <h3 className="text-xl font-bold text-white">Definir Senha de Exclusão</h3>
                        <button onClick={() => !loadingPass && setModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-8 space-y-4">
                         <div className="p-4 bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/20 rounded-lg text-sm text-[var(--gm-primary)] flex items-start gap-3">
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <p>Essa senha será solicitada sempre que você tentar excluir algo <strong>definitivamente</strong>.</p>
                        </div>

                        <div className="space-y-4">
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

                        <div className="pt-4 flex gap-3">
                             <button
                                onClick={() => setModalOpen(false)}
                                disabled={loadingPass}
                                className="gm-btn gm-btn-outline flex-1 rounded-xl"
                             >
                                Cancelar
                             </button>
                             <button
                                onClick={handleSavePass}
                                disabled={!canSavePass}
                                className="gm-btn flex-1 rounded-xl"
                             >
                                {loadingPass ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Salvar
                             </button>
                        </div>
                        
                        <p className="text-[10px] text-slate-500 text-center mt-4">
                           Dica: use letras + números + símbolo (ex: GM@2026!).
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Modal: Confirm Empty Trash */}
        {showTrashConfirm && (
            <div className="fixed inset-0 z-[1001] bg-black/50 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in" onClick={() => !loadingTrash && setShowTrashConfirm(false)}>
                <div className="gm-modal gm-card w-full max-w-sm rounded-[24px] overflow-hidden !border-white/10 relative z-10 animate-fade-in" onClick={e => e.stopPropagation()}>
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-[var(--gm-primary)]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[var(--gm-primary)]/20 shadow-[0_0_15px_var(--gm-primary-10)]">
                            <Trash2 size={32} className="text-[var(--gm-primary)]" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Esvaziar Lixeira?</h3>
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                            ATENÇÃO: Isso apagará TODOS os itens da Lixeira permanentemente. Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowTrashConfirm(false)}
                                disabled={loadingTrash}
                                className="flex-1 h-11 rounded-md border border-[#26262A] bg-[#131315] hover:bg-[#1B1B1E] text-[#F2F2F3] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEmptyTrash}
                                disabled={loadingTrash}
                                className="flex-1 h-11 rounded-md bg-[#F65A1A] hover:bg-[#FF7A38] text-[#0B0B0C] border border-[#F65A1A] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.3)] cursor-pointer disabled:bg-[#18181B] disabled:border-[#26262A] disabled:text-[#52525B]"
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