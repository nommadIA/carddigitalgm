import React, { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  async function handleSave() {
    if (!canSave) return;

    try {
      setLoading(true);
      await setSecurityPassword(newPass);
      await supabase.auth.refreshSession();
      alert("Senha de exclusão atualizada com sucesso!");
      setNewPass("");
      setConfirmPass("");

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
      className="fixed inset-0 z-[1200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md gm-modal bg-[#131315] border border-[#26262A] rounded-lg p-6 shadow-2xl relative"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Fechar"
          className="absolute top-4 right-4 w-9 h-9 rounded-[4px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] hover:border-[#3F3F46] text-[#8B8B92] hover:text-[#F2F2F3] flex items-center justify-center transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        <div className="mb-5 pr-10">
          <h3 className="text-xl font-bold text-[#F2F2F3] tracking-tight">Criar Senha</h3>
          <p className="text-[13px] text-[#8B8B92] mt-1 leading-relaxed">
            Proteja exclusões definitivas com uma senha segura.
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            placeholder="Nova senha (mín. 6 caracteres)"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            className="w-full h-11 px-3.5 rounded-[4px] border border-[#26262A] bg-[#0B0B0C] text-sm text-[#F2F2F3] outline-none focus:border-[var(--gm-primary)] transition-colors placeholder-[#8B8B92]"
          />

          <input
            type="password"
            placeholder="Confirme a senha"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            className="w-full h-11 px-3.5 rounded-[4px] border border-[#26262A] bg-[#0B0B0C] text-sm text-[#F2F2F3] outline-none focus:border-[var(--gm-primary)] transition-colors placeholder-[#8B8B92]"
          />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-10 rounded-[6px] border border-[#26262A] bg-[#1B1B1E] hover:bg-[#26262A] text-[#F2F2F3] text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
            >
              Voltar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="flex-1 h-10 rounded-[6px] border border-[var(--gm-primary,#F65A1A)] bg-[var(--gm-primary,#F65A1A)] hover:brightness-110 text-[#0B0B0C] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:bg-[#18181B] disabled:border-[#26262A] disabled:text-[#52525B] disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin text-current" size={16} /> : <Save size={16} className="text-current" />}
              <span>{loading ? "Salvando..." : "Salvar"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}