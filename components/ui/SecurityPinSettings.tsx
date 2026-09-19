import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Lock,
  CheckCircle2,
  Sparkles,
  Info,
  Laptop,
} from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import {
  isPinSecurityActive,
  removeSecurityPin,
  lockSession,
} from "../../lib/securityPin";
import PinLockModal from "../auth/PinLockModal";

export default function SecurityPinSettings() {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"verify" | "setup" | "change">("setup");
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
    } else if (modalMode === "change") {
      setSuccessNotice("PIN de segurança alterado com sucesso!");
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
    if (isActive) {
      setModalMode("change");
    } else {
      setModalMode("setup");
    }
    setModalOpen(true);
  };

  const handleLockApp = () => {
    lockSession();
    window.dispatchEvent(new CustomEvent("gm:lock_session"));
  };

  const handleLockNow = () => {
    lockSession();
    window.dispatchEvent(new CustomEvent("gm:lock_session"));
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      {/* CARD PRINCIPAL - APPLE GLASS BLUR */}
      <div
        className="apple-glass-card rounded-2xl p-6 sm:p-7 border border-white/15 flex flex-col gap-6 relative overflow-hidden shadow-2xl"
        style={{
          background: "rgba(18, 18, 24, 0.55)",
          backdropFilter: "blur(32px) saturate(190%)",
          WebkitBackdropFilter: "blur(32px) saturate(190%)",
        }}
      >
        {/* LINHA SUPERIOR: Ícone + Título + Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-start sm:items-center gap-4">
            {/* Ícone de Cadeado Apple Glass */}
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[var(--gm-primary,#FE540B)]/25 to-orange-500/15 border border-[var(--gm-primary,#FE540B)]/45 flex items-center justify-center text-[var(--gm-primary,#FE540B)] shadow-[0_0_24px_rgba(254,84,11,0.25)] shrink-0">
              <Lock size={26} className="drop-shadow-md" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h4 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Segurança do Dispositivo & PIN de Acesso
                </h4>
                {isActive ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Proteção Ativa
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-zinc-500/20 text-zinc-300 border border-zinc-500/30">
                    Desativada
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-zinc-300/80 leading-relaxed max-w-2xl">
                Proteja seu acesso caso suas credenciais fiquem salvas no navegador deste computador.
              </p>
            </div>
          </div>
        </div>

        {/* FEEDBACK DE SUCESSO */}
        {successNotice && (
          <div
            className="apple-glass-card bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-4 text-xs sm:text-sm text-emerald-200 flex items-center gap-2.5 animate-fade-in shadow-lg shadow-emerald-500/10"
            style={{
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span className="font-semibold">{successNotice}</span>
          </div>
        )}

        {/* BOTÕES DE AÇÃO DO PIN: CORES DISTINTAS COM SIGNIFICADO SEMÂNTICO */}
        {isActive ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
            {/* 1. BLOQUEAR APP (Laranja GM Oficial - Tranca Imediata / Ação Principal) */}
            <button
              type="button"
              onClick={handleLockApp}
              className="w-full px-4 py-3.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2.5 cursor-pointer bg-gradient-to-r from-orange-500/20 via-[var(--gm-primary,#FE540B)]/25 to-amber-500/20 hover:from-orange-500/35 hover:via-[var(--gm-primary,#FE540B)]/40 hover:to-amber-500/35 text-orange-200 hover:text-white border border-[var(--gm-primary,#FE540B)]/45 hover:border-[var(--gm-primary,#FE540B)]/80 shadow-lg shadow-orange-500/20 backdrop-blur-md active:scale-95"
            >
              <Lock size={16} className="text-[var(--gm-primary,#FE540B)] shrink-0" />
              <span>Bloquear App</span>
            </button>

            {/* 2. DESATIVAR PROTEÇÃO (Vermelho Alerta / Ruby - Risco / Desativação de Segurança) */}
            <button
              type="button"
              onClick={handleToggle}
              className="w-full px-4 py-3.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2.5 cursor-pointer bg-gradient-to-r from-rose-500/15 via-red-500/20 to-rose-600/15 hover:from-rose-500/30 hover:via-red-500/35 hover:to-rose-600/30 text-rose-200 hover:text-white border border-rose-500/40 hover:border-rose-400/80 shadow-lg shadow-rose-500/20 backdrop-blur-md active:scale-95"
            >
              <ShieldAlert size={16} className="text-rose-400 shrink-0" />
              <span>Desativar Proteção</span>
            </button>

            {/* 3. ALTERAR PIN (Ciano / Azul Tech - Credenciais / Chave de Acesso Digital) */}
            <button
              type="button"
              onClick={handleChangePin}
              className="w-full px-4 py-3.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2.5 cursor-pointer bg-gradient-to-r from-sky-500/15 via-cyan-500/20 to-blue-600/15 hover:from-sky-500/30 hover:via-cyan-500/35 hover:to-blue-600/30 text-cyan-200 hover:text-white border border-cyan-500/40 hover:border-cyan-400/80 shadow-lg shadow-cyan-500/20 backdrop-blur-md active:scale-95"
            >
              <KeyRound size={16} className="text-cyan-400 shrink-0" />
              <span>Alterar PIN</span>
            </button>

            {/* 4. TESTAR BLOQUEIO (Violeta / Púrpura - Simulação / Diagnóstico de Teste) */}
            <button
              type="button"
              onClick={handleLockNow}
              className="w-full px-4 py-3.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2.5 cursor-pointer bg-gradient-to-r from-purple-500/15 via-violet-500/20 to-indigo-600/15 hover:from-purple-500/30 hover:via-violet-500/35 hover:to-indigo-600/30 text-purple-200 hover:text-white border border-purple-500/40 hover:border-purple-400/80 shadow-lg shadow-purple-500/20 backdrop-blur-md active:scale-95"
            >
              <Sparkles size={16} className="text-purple-400 shrink-0" />
              <span>Testar Bloqueio</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
            <button
              type="button"
              onClick={handleToggle}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2.5 cursor-pointer bg-gradient-to-r from-[var(--gm-primary,#FE540B)] to-orange-500 text-white hover:brightness-110 shadow-lg shadow-orange-500/30 active:scale-95"
            >
              <ShieldCheck size={18} />
              <span>Ativar PIN de 4 Dígitos</span>
            </button>
          </div>
        )}

        {/* CARD INFORMATIVO: COMO FUNCIONA (APPLE GLASS) */}
        <div
          className="apple-glass-card rounded-2xl p-5 sm:p-6 border border-white/10 text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-3.5"
          style={{
            background: "rgba(12, 12, 18, 0.40)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
          }}
        >
          <div className="flex items-center gap-2.5 font-bold text-white text-xs sm:text-sm tracking-wide">
            <Laptop size={18} className="text-[var(--gm-primary,#FE540B)] shrink-0" />
            <span>Como funciona a segurança no seu dispositivo:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1 text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <ShieldCheck size={16} className="text-[var(--gm-primary,#FE540B)] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white mb-0.5">Credenciais Salvas</p>
                <p className="text-zinc-400 text-[11px] leading-snug">
                  Impede o acesso indevido caso seu navegador (Google Chrome, Edge) preencha o login automaticamente.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <KeyRound size={16} className="text-[var(--gm-primary,#FE540B)] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white mb-0.5">PIN de 4 Dígitos</p>
                <p className="text-zinc-400 text-[11px] leading-snug">
                  Apenas você conhece a chave de 4 números necessária para autorizar o acesso neste computador.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <Lock size={16} className="text-[var(--gm-primary,#FE540B)] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white mb-0.5">Bloqueio Automático</p>
                <p className="text-zinc-400 text-[11px] leading-snug">
                  Sempre que o navegador ou este computador for reiniciado, a chave de 4 dígitos será solicitada.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO / CRIAÇÃO / ALTERAÇÃO DE PIN */}
      {modalOpen && (
        <PinLockModal
          open={modalOpen}
          mode={modalMode}
          email={user?.email}
          userName={user?.full_name}
          title={
            modalMode === "verify"
              ? "Confirmar PIN Atual"
              : undefined
          }
          description={
            modalMode === "verify"
              ? "Digite seu PIN atual de 4 dígitos para confirmar a desativação."
              : undefined
          }
          onSuccess={handleModalSuccess}
          onCancel={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
