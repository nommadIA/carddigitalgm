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
      if (!confirm("ATENÇÃO: Isso apagará TODOS os itens da Lixeira permanentemente. Continuar?")) return;

      try {
          setLoadingTrash(true);
          await hardDeleteTrash(trashPass);
          alert("Lixeira esvaziada com sucesso!");
          setTrashPass("");
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
        <div className="bg-slate-900/50 border border-slate-700/50 p-6 rounded-2xl flex flex-col justify-between">
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 border border-blue-500/20">
                        <Lock size={20} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-base">Senha de Segurança</h3>
                        <p className="text-slate-400 text-xs">Protege exclusões definitivas.</p>
                    </div>
                </div>
                <p className="text-slate-500 text-sm mb-6">
                    Configure uma senha mestra para impedir exclusões acidentais de dados importantes (Clientes e Orçamentos).
                </p>
            </div>
            
            <button 
                onClick={() => setModalOpen(true)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
                Configurar / Alterar Senha
            </button>
        </div>

        {/* Card 2: Empty Trash */}
        <div className="bg-slate-900/50 border border-red-500/30 p-6 rounded-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <AlertTriangle size={100} className="text-red-500" />
            </div>

            <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="p-2 bg-red-500/10 rounded-lg text-red-500 border border-red-500/20">
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder-slate-500"
                />
                <button
                    onClick={handleEmptyTrash}
                    disabled={loadingTrash || !trashPass}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                    {loadingTrash ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                    {loadingTrash ? "Processando..." : "Esvaziar Tudo"}
                </button>
            </div>
        </div>

        {/* Modal */}
        {modalOpen && (
            <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => !loadingPass && setModalOpen(false)}>
                <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
                        <h3 className="text-xl font-bold text-white">Definir Senha de Exclusão</h3>
                        <button onClick={() => !loadingPass && setModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                         <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-200">
                            Essa senha será solicitada sempre que você tentar excluir algo <strong>definitivamente</strong>.
                        </div>

                        <div className="space-y-4">
                            <input
                                type="password"
                                value={newPass}
                                onChange={(e) => setNewPass(e.target.value)}
                                placeholder="Nova senha (mín. 6)"
                                autoFocus
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                            />
                             <input
                                type="password"
                                value={confirmPass}
                                onChange={(e) => setConfirmPass(e.target.value)}
                                placeholder="Confirmar nova senha"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                            />
                        </div>

                        <div className="pt-2 flex gap-3">
                             <button
                                onClick={() => setModalOpen(false)}
                                disabled={loadingPass}
                                className="flex-1 py-3 text-slate-400 font-medium hover:bg-white/5 rounded-xl transition-colors"
                             >
                                Cancelar
                             </button>
                             <button
                                onClick={handleSavePass}
                                disabled={!canSavePass}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                             >
                                {loadingPass ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Salvar
                             </button>
                        </div>
                        
                        <p className="text-[10px] text-slate-500 text-center mt-2">
                           Dica: use letras + números + símbolo (ex: GM@2026!).
                        </p>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}