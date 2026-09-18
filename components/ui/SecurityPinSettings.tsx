import React, { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, KeyRound, Lock, CheckCircle2, RefreshCw, AlertTriangle } from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import {
  isPinSecurityActive,
  setPinSecurityActive,
  removeSecurityPin,
  lockSession,
} from "../../lib/securityPin";
import PinLockModal from "../auth/PinLockModal";

export default function SecurityPinSettings() {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"verify" | "setup">("setup");
  const [successNotice, setSuccessNotice] = useState<string>("");

  const refreshStatus = () => {
    if (user?.email) {
      setIsActive(isPinSecurityActive(user.email));
    }
  };

  useEffect(() => {
    refreshStatus();
  }, [user]);

  const handleToggle = () => {
    if (isActive) {
      // Pedir verificação para desativar
      setModalMode("verify");
      setModalOpen(true);
    } else {
      // Ativar novo PIN
      setModalMode("setup");
      setModalOpen(true);
    }
  };

  const handleModalSuccess = () => {
    if (modalMode === "setup") {
      setSuccessNotice("PIN configurado e ativado com sucesso!");
      refreshStatus();
      setModalOpen(false);
    } else {
      // Verificou com sucesso para desativar
      removeSecurityPin(user?.email);
      setSuccessNotice("Proteção por PIN desativada neste dispositivo.");
      refreshStatus();
      setModalOpen(false);
    }
    setTimeout(() => setSuccessNotice(""), 3500);
  };

  const handleChangePin = () => {
    setModalMode("setup");
    setModalOpen(true);
  };

  const handleLockNow = () => {
    lockSession();
    window.location.reload();
  };

  return (
    <div className="gm-settings-card flex flex-col gap-4 p-5 rounded-2xl border border-white/10 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-[var(--gm-primary,#FE540B)] shrink-0">
            <Lock size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              Segurança do Dispositivo & PIN de Acesso
              {isActive ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Ativo
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
                  Desativado
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Proteja seu acesso caso suas senhas fiquem salvas no navegador deste computador.
            </p>
          </div>
        </div>

        {/* Botão Switch Ativar/Desativar */}
        <button
          type="button"
          onClick={handleToggle}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            isActive
              ? "bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30"
              : "bg-[var(--gm-primary,#FE540B)] text-white hover:opacity-90 shadow-md shadow-orange-500/20"
          }`}
        >
          {isActive ? "Desativar Proteção" : "Ativar PIN de 4 Dígitos"}
        </button>
      </div>

      {successNotice && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Cartão explicativo com detalhes práticos */}
      <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-xs text-slate-300 leading-relaxed space-y-2">
        <div className="flex items-start gap-2.5">
          <ShieldCheck size={16} className="text-[var(--gm-primary,#FE540B)] shrink-0 mt-0.5" />
          <span>
            <strong>Como funciona:</strong> Ao salvar suas credenciais no Google Chrome ou no navegador, qualquer pessoa com acesso ao computador poderia clicar em "Entrar". Com o PIN configurado, o sistema exige seus 4 dígitos pessoais para liberar o acesso, mesmo que o login esteja salvo.
          </span>
        </div>

        {isActive && (
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={handleChangePin}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound size={14} />
              Alterar PIN
            </button>

            <button
              type="button"
              onClick={handleLockNow}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-orange-400 text-xs font-semibold border border-orange-500/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Lock size={14} />
              Testar Bloqueio Agora
            </button>
          </div>
        )}
      </div>

      {modalOpen && (
        <PinLockModal
          open={modalOpen}
          mode={modalMode}
          email={user?.email}
          userName={user?.full_name}
          title={modalMode === "setup" ? "Definir PIN de Segurança" : "Confirmar PIN Atual"}
          description={
            modalMode === "setup"
              ? "Digite 4 dígitos que você lembrará facilmente para desbloquear o app neste computador."
              : "Digite seu PIN atual para confirmar a desativação."
          }
          onSuccess={handleModalSuccess}
          onCancel={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
