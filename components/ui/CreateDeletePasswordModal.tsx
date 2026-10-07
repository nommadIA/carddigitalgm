import React, { useMemo, useState } from "react";
import { setSecurityPassword } from "../../lib/trash";
import { supabase } from "../../lib/supabase";
import { X, Loader2, Save } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CreateDeletePasswordModal({ open, onClose }: Props) {
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);

  const canSave = useMemo(
    () => newPass.length >= 6 && newPass === confirmPass && !loading,
    [newPass, confirmPass, loading]
  );

  async function handleSave() {
    if (!canSave) return;

    try {
      setLoading(true);
      await setSecurityPassword(newPass);
      await supabase.auth.refreshSession();
      alert("Senha de exclusão atualizada com sucesso!");
      setNewPass("");
      setConfirmPass("");
      
      // setTimeout garante que o estado do componente pai seja atualizado fora do ciclo atual de eventos
      setTimeout(() => {
        onClose();
      }, 0);
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || "";
      if (msg.includes("password_change_too_soon")) {
        alert("Aguarde 60 segundos para trocar a senha novamente.");
      } else {
        alert("Erro ao salvar senha: " + (msg || "desconhecido"));
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      onClick={() => !loading && onClose()}
      className="fixed inset-0 z-[1200] bg-black/75 flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md fora border border-white/10 rounded-2xl p-6 shadow-2xl relative"
      >
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
            <X size={20} />
        </button>

        <div className="mb-6">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Criar Senha</h3>
            <p className="text-base text-slate-300 font-medium mt-1.5 leading-relaxed">
            Proteja exclusões definitivas com uma senha segura.
            </p>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            placeholder="Nova senha (mín 6)"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            className="w-full p-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-[var(--gm-primary)] transition-all placeholder-slate-500"
          />

          <input
            type="password"
            placeholder="Confirme a senha"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            className="w-full p-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-[var(--gm-primary)] transition-all placeholder-slate-500"
          />

          <div className="flex gap-3 mt-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-xl border border-white/10 bg-transparent text-slate-300 font-bold hover:bg-white/5 transition-all disabled:opacity-50"
            >
              Voltar
            </button>

            <button
              onClick={handleSave}
              disabled={!canSave}
              className={`flex-1 py-3 rounded-xl border border-white/10 text-white font-bold flex items-center justify-center gap-2 transition-all ${
                  canSave ? "bg-[var(--gm-primary)] hover:brightness-110 shadow-lg shadow-[var(--gm-primary)]/20" : "bg-[var(--gm-primary)]/20 cursor-not-allowed text-white/50"
              }`}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}