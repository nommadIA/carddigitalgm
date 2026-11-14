import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Lock,
  CheckCircle2,
  Sparkles,
  Laptop,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  LogOut,
  Unlink,
  Download,
  Globe,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import {
  isPinSecurityActive,
  removeSecurityPin,
  lockSession,
} from "../../lib/securityPin";
import {
  DeviceSession,
  fetchActiveDeviceSessions,
  getOrCreateDeviceId,
  readLocalDeviceSessions,
  registerOrHeartbeatDeviceSession,
  unlinkAllOtherDevices,
  unlinkDeviceSession,
} from "../../lib/deviceSessions";
import PinLockModal from "../auth/PinLockModal";

function formatRelativeActivity(iso?: string): string {
  if (!iso) return "Recente";
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "Recente";
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return "Agora mesmo";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Há ${diffHours}h`;
  return new Date(ms).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(iso?: string): string {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SecurityPinSettings() {
  const { user, tenantId, signOut } = useAuth();
  const [isActive, setIsActive] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"verify" | "setup" | "change">("setup");
  const [successNotice, setSuccessNotice] = useState<string>("");

  // Sessões ativas & computadores conectados
  const currentDeviceId = getOrCreateDeviceId();
  const [sessions, setSessions] = useState<DeviceSession[]>(() =>
    readLocalDeviceSessions(tenantId, user?.email).sessions
  );
  const [loadingSessions, setLoadingSessions] = useState<boolean>(true);
  const [refreshingSessions, setRefreshingSessions] = useState<boolean>(false);
  const [confirmUnlinkId, setConfirmUnlinkId] = useState<string | null>(null);
  const [confirmUnlinkOthers, setConfirmUnlinkOthers] = useState<boolean>(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const refreshStatus = () => {
    if (user?.email) {
      setIsActive(isPinSecurityActive(user.email));
    }
  };

  const loadSessions = useCallback(
    async (forceRegister = false) => {
      if (!user?.email) {
        setSessions([]);
        setLoadingSessions(false);
        return;
      }
      setRefreshingSessions(true);
      try {
        if (forceRegister) {
          const res = await registerOrHeartbeatDeviceSession({
            tenantId,
            userId: user.id,
            email: user.email,
            forceWrite: true,
          });
          setSessions(res.sessions);
        } else {
          const list = await fetchActiveDeviceSessions({
            tenantId,
            userId: user.id,
            email: user.email,
          });
          setSessions(list);
        }
      } finally {
        setLoadingSessions(false);
        setRefreshingSessions(false);
      }
    },
    [tenantId, user?.id, user?.email]
  );

  useEffect(() => {
    refreshStatus();
  }, [user]);

  useEffect(() => {
    void loadSessions(true);

    const handleUpdated = (ev: any) => {
      if (Array.isArray(ev?.detail)) {
        setSessions(ev.detail);
        setLoadingSessions(false);
      }
    };

    window.addEventListener("gm:device_sessions_updated", handleUpdated);
    return () => {
      window.removeEventListener("gm:device_sessions_updated", handleUpdated);
    };
  }, [loadSessions]);

  const handleToggle = () => {
    if (isActive) {
      setModalMode("verify");
      setModalOpen(true);
    } else {
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
      removeSecurityPin(user?.email);
      setSuccessNotice("Proteção por PIN desativada neste dispositivo.");
      refreshStatus();
      setModalOpen(false);
    }
    void loadSessions(true);
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

  const handleUnlinkDevice = async (device: DeviceSession) => {
    if (!user?.email) return;
    setUnlinkingId(device.deviceId);
    setSessionNotice(null);
    try {
      const res = await unlinkDeviceSession({
        tenantId,
        userId: user.id,
        email: user.email,
        targetDeviceId: device.deviceId,
      });

      setConfirmUnlinkId(null);

      if (res.isCurrentDevice) {
        await signOut();
        return;
      }

      if (res.ok) {
        setSessions(res.sessions);
        setSessionNotice({
          type: "ok",
          text: `"${device.deviceLabel}" foi desvinculado. Esse acesso será desconectado automaticamente.`,
        });
      } else {
        setSessionNotice({
          type: "err",
          text: "Não foi possível desvincular este dispositivo no momento. Tente novamente.",
        });
      }
    } finally {
      setUnlinkingId(null);
      setTimeout(() => setSessionNotice(null), 5000);
    }
  };

  const handleUnlinkAllOthers = async () => {
    if (!user?.email) return;
    setUnlinkingId("__all_others__");
    setSessionNotice(null);
    try {
      const res = await unlinkAllOtherDevices({
        tenantId,
        userId: user.id,
        email: user.email,
      });
      setConfirmUnlinkOthers(false);
      if (res.ok) {
        setSessions(res.sessions);
        setSessionNotice({
          type: "ok",
          text:
            res.unlinkedCount > 0
              ? `${res.unlinkedCount} outra(s) sessão(ões) desvinculada(s) com sucesso. Apenas este dispositivo permanece ativo.`
              : "Nenhuma outra sessão ativa para desvincular.",
        });
      } else {
        setSessionNotice({
          type: "err",
          text: "Falha ao desvincular as outras sessões. Tente novamente.",
        });
      }
    } finally {
      setUnlinkingId(null);
      setTimeout(() => setSessionNotice(null), 5000);
    }
  };

  // Métricas resumidas para computadores, app baixado e sessões ativas
  const desktopSessions = sessions.filter((s) => s.deviceCategory === "desktop");
  const mobileOrTabletSessions = sessions.filter((s) => s.deviceCategory !== "desktop");
  const installedDesktopCount = desktopSessions.filter((s) => s.isPwaInstalled).length;
  const totalInstalledCount = sessions.filter((s) => s.isPwaInstalled).length;
  const otherSessionsCount = sessions.filter((s) => s.deviceId !== currentDeviceId).length;

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      {/* CARD 1: PIN DE ACESSO DO DISPOSITIVO */}
      <div className="bg-[#131315] rounded-lg p-5 sm:p-6 border border-[#26262A] flex flex-col gap-5 relative overflow-hidden">
        {/* LINHA SUPERIOR: Ícone + Título + Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#26262A]">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-md bg-[var(--gm-primary,#FE540B)]/15 border border-[var(--gm-primary,#FE540B)]/35 flex items-center justify-center text-[var(--gm-primary,#FE540B)] shrink-0">
              <Lock size={22} />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h4 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Segurança do Dispositivo & PIN de Acesso
                </h4>
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[4px] border ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/35"
                      : "bg-[#1B1B1E] text-[#8B8B92] border-[#26262A]"
                  }`}
                >
                  {isActive ? "Proteção Ativa" : "Desativada"}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#8B8B92] leading-relaxed max-w-2xl">
                Proteja seu acesso caso suas credenciais fiquem salvas no navegador deste dispositivo (smartphone ou computador).
              </p>
            </div>
          </div>
        </div>

        {/* FEEDBACK DE SUCESSO */}
        {successNotice && (
          <div className="bg-emerald-500/10 border border-emerald-500/35 rounded-md p-3.5 text-xs sm:text-sm text-emerald-300 flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span className="font-semibold">{successNotice}</span>
          </div>
        )}

        {/* BOTÕES DE AÇÃO DO PIN */}
        {isActive ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
            <button
              type="button"
              onClick={handleLockApp}
              className="h-10 w-full px-4 rounded-[6px] text-xs font-bold uppercase tracking-wider transition-[background-color,border-color,color,transform] duration-150 flex items-center justify-center gap-2 cursor-pointer bg-[var(--gm-primary,#FE540B)]/15 hover:bg-[var(--gm-primary,#FE540B)]/25 text-white border border-[var(--gm-primary,#FE540B)]/45 hover:border-[var(--gm-primary,#FE540B)] active:scale-[0.96] whitespace-nowrap"
            >
              <Lock size={15} className="text-[var(--gm-primary,#FE540B)] shrink-0" />
              <span>Bloquear App</span>
            </button>

            <button
              type="button"
              onClick={handleToggle}
              className="h-10 w-full px-4 rounded-[6px] text-xs font-bold uppercase tracking-wider transition-[background-color,border-color,color,transform] duration-150 flex items-center justify-center gap-2 cursor-pointer bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-white border border-rose-500/35 hover:border-rose-400 active:scale-[0.96] whitespace-nowrap"
            >
              <ShieldAlert size={15} className="text-rose-400 shrink-0" />
              <span>Desativar Proteção</span>
            </button>

            <button
              type="button"
              onClick={handleChangePin}
              className="h-10 w-full px-4 rounded-[6px] text-xs font-bold uppercase tracking-wider transition-[background-color,border-color,color,transform] duration-150 flex items-center justify-center gap-2 cursor-pointer bg-[#1B1B1E] hover:bg-[#26262A] text-[#F2F2F3] hover:text-white border border-[#26262A] hover:border-[#3F3F46] active:scale-[0.96] whitespace-nowrap"
            >
              <KeyRound size={15} className="text-cyan-400 shrink-0" />
              <span>Alterar PIN</span>
            </button>

            <button
              type="button"
              onClick={handleLockNow}
              className="h-10 w-full px-4 rounded-[6px] text-xs font-bold uppercase tracking-wider transition-[background-color,border-color,color,transform] duration-150 flex items-center justify-center gap-2 cursor-pointer bg-[#1B1B1E] hover:bg-[#26262A] text-[#F2F2F3] hover:text-white border border-[#26262A] hover:border-[#3F3F46] active:scale-[0.96] whitespace-nowrap"
            >
              <Sparkles size={15} className="text-[var(--gm-primary,#FE540B)] shrink-0" />
              <span>Testar Bloqueio</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
            <button
              type="button"
              onClick={handleToggle}
              className="h-10 w-full sm:w-auto px-5 rounded-[6px] text-xs font-black uppercase tracking-wider transition-[filter,transform] duration-150 flex items-center justify-center gap-2 cursor-pointer bg-[var(--gm-primary,#FE540B)] text-[#0B0B0C] hover:brightness-110 active:scale-[0.96] whitespace-nowrap"
            >
              <ShieldCheck size={16} className="shrink-0" />
              <span>Ativar PIN de 4 Dígitos</span>
            </button>
          </div>
        )}

        {/* CARD INFORMATIVO: COMO FUNCIONA */}
        <div className="bg-[#0B0B0C] rounded-md p-4 sm:p-5 border border-[#26262A] text-xs sm:text-sm text-[#CBD5E1] leading-relaxed space-y-3">
          <div className="flex items-center gap-2.5 font-bold text-white text-xs sm:text-sm tracking-wide">
            <Laptop size={17} className="text-[var(--gm-primary,#FE540B)] shrink-0" />
            <span>Como funciona a segurança no seu dispositivo:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#131315] border border-[#26262A]">
              <ShieldCheck size={16} className="text-[var(--gm-primary,#FE540B)] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white mb-0.5">Credenciais Salvas</p>
                <p className="text-[#8B8B92] text-[11px] leading-snug">
                  Impede o acesso indevido caso seu navegador (Google Chrome, Edge) preencha o login automaticamente.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#131315] border border-[#26262A]">
              <KeyRound size={16} className="text-[var(--gm-primary,#FE540B)] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white mb-0.5">PIN de 4 Dígitos</p>
                <p className="text-[#8B8B92] text-[11px] leading-snug">
                  Apenas você conhece a chave de 4 números necessária para autorizar o acesso neste dispositivo.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#131315] border border-[#26262A]">
              <Lock size={16} className="text-[var(--gm-primary,#FE540B)] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white mb-0.5">Bloqueio Automático</p>
                <p className="text-[#8B8B92] text-[11px] leading-snug">
                  Sempre que o navegador ou o dispositivo for reiniciado, a chave de 4 dígitos será solicitada.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: COMPUTADORES CONECTADOS, APP BAIXADO & SESSÕES ATIVAS */}
      <div className="bg-[#131315] rounded-lg p-5 sm:p-6 border border-[#26262A] flex flex-col gap-5 relative overflow-hidden">
        {/* CABEÇALHO DA SEÇÃO DE SESSÕES */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#26262A]">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-md bg-[var(--gm-primary,#FE540B)]/15 border border-[var(--gm-primary,#FE540B)]/35 flex items-center justify-center text-[var(--gm-primary,#FE540B)] shrink-0">
              <Monitor size={22} />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h4 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Computadores Conectados & Sessões Ativas
                </h4>
                <span className="text-xs font-mono font-bold tabular-nums text-[var(--gm-primary,#FE540B)]">
                  {desktopSessions.length} {desktopSessions.length === 1 ? "computador" : "computadores"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#8B8B92] leading-relaxed max-w-2xl">
                Acompanhe em quantos computadores o aplicativo está baixado e logado com sua conta ({user?.email || "conta atual"}) e desvincule acessos quando precisar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => void loadSessions(true)}
              disabled={refreshingSessions}
              className="h-10 px-4 rounded-[6px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] hover:border-[#3F3F46] text-xs font-bold text-[#F2F2F3] flex items-center justify-center gap-2 active:scale-[0.96] transition-[background-color,border-color,transform] duration-150 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw
                size={15}
                className={`text-[var(--gm-primary,#FE540B)] shrink-0 ${refreshingSessions ? "animate-spin" : ""}`}
              />
              <span>Atualizar</span>
            </button>

            {otherSessionsCount > 0 && !confirmUnlinkOthers && (
              <button
                type="button"
                onClick={() => setConfirmUnlinkOthers(true)}
                className="h-10 px-4 rounded-[6px] bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-xs font-bold text-rose-200 hover:text-white flex items-center justify-center gap-2 active:scale-[0.96] transition-[background-color,border-color,transform] duration-150 cursor-pointer whitespace-nowrap"
              >
                <LogOut size={15} className="text-rose-400 shrink-0" />
                <span>Desvincular Outros ({otherSessionsCount})</span>
              </button>
            )}

            {confirmUnlinkOthers && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUnlinkAllOthers}
                  disabled={unlinkingId === "__all_others__"}
                  className="h-10 px-4 rounded-[6px] bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.96] transition-[background-color,transform] duration-150 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {unlinkingId === "__all_others__" ? (
                    <RefreshCw size={14} className="animate-spin shrink-0" />
                  ) : (
                    <Check size={14} className="shrink-0" />
                  )}
                  <span>Confirmar Desvincular ({otherSessionsCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmUnlinkOthers(false)}
                  className="h-10 px-3 rounded-[6px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] text-[#CBD5E1] hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.96] transition-[background-color,transform] duration-150 cursor-pointer whitespace-nowrap"
                >
                  <X size={14} className="shrink-0" />
                  <span>Cancelar</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* AVISO DE AÇÃO NAS SESSÕES */}
        {sessionNotice && (
          <div
            className={`rounded-md p-3.5 border text-xs sm:text-sm font-medium flex items-center gap-2.5 ${
              sessionNotice.type === "ok"
                ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/35 text-rose-300"
            }`}
          >
            {sessionNotice.type === "ok" ? (
              <CheckCircle2 size={17} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle size={17} className="text-rose-400 shrink-0" />
            )}
            <span>{sessionNotice.text}</span>
          </div>
        )}

        {/* RESUMO NUMÉRICO (TABULAR-NUMS) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-md bg-[#0B0B0C] border border-[#26262A] flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8B8B92]">
                Computadores Logados
              </div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {desktopSessions.length}
              </div>
              <div className="text-[11px] text-[#8B8B92] truncate">
                {installedDesktopCount} app instalado · {desktopSessions.length - installedDesktopCount} navegador
              </div>
            </div>
            <div className="w-10 h-10 rounded-md bg-[var(--gm-primary,#FE540B)]/15 border border-[var(--gm-primary,#FE540B)]/30 text-[var(--gm-primary,#FE540B)] flex items-center justify-center shrink-0">
              <Monitor size={18} />
            </div>
          </div>

          <div className="p-4 rounded-md bg-[#0B0B0C] border border-[#26262A] flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8B8B92]">
                App Baixado / Instalado
              </div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {totalInstalledCount}
              </div>
              <div className="text-[11px] text-[#8B8B92] truncate">
                {totalInstalledCount > 0
                  ? "Atalho / App PWA em execução"
                  : "Acessando via navegador web"}
              </div>
            </div>
            <div className="w-10 h-10 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Download size={18} />
            </div>
          </div>

          <div className="p-4 rounded-md bg-[#0B0B0C] border border-[#26262A] flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8B8B92]">
                Total de Sessões Ativas
              </div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {sessions.length}
              </div>
              <div className="text-[11px] text-[#8B8B92] truncate">
                {desktopSessions.length} PC(s) · {mobileOrTabletSessions.length} celular/tablet
              </div>
            </div>
            <div className="w-10 h-10 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
              <Laptop size={18} />
            </div>
          </div>
        </div>

        {/* LISTA DE SESSÕES ATIVAS */}
        <div className="space-y-2.5">
          {loadingSessions ? (
            <div className="p-6 rounded-md bg-[#0B0B0C] border border-[#26262A] flex items-center justify-center gap-2.5 text-xs text-[#8B8B92]">
              <RefreshCw size={15} className="animate-spin text-[var(--gm-primary,#FE540B)]" />
              <span>Carregando sessões ativas...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-6 rounded-md border border-dashed border-[#26262A] bg-[#0B0B0C] text-center space-y-3">
              <p className="text-xs sm:text-sm text-[#8B8B92]">
                Nenhuma sessão ativa registrada ainda para esta conta.
              </p>
              <button
                type="button"
                onClick={() => void loadSessions(true)}
                className="h-10 px-4 mx-auto rounded-[6px] bg-[var(--gm-primary,#FE540B)] text-[#0B0B0C] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Monitor size={15} className="shrink-0" />
                <span>Registrar Este Computador</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#26262A] rounded-md border border-[#26262A] bg-[#0B0B0C] overflow-hidden">
              {sessions.map((session) => {
                const isCurrent = session.deviceId === currentDeviceId;
                const isConfirming = confirmUnlinkId === session.deviceId;
                const isBusy = unlinkingId === session.deviceId;

                const DeviceIcon =
                  session.deviceCategory === "mobile"
                    ? Smartphone
                    : session.deviceCategory === "tablet"
                    ? Tablet
                    : Monitor;

                return (
                  <div
                    key={session.deviceId}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-colors ${
                      isCurrent ? "bg-[var(--gm-primary,#FE540B)]/[0.06]" : "hover:bg-[#131315]"
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                      <div
                        className={`w-11 h-11 rounded-md border flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? "bg-[var(--gm-primary,#FE540B)]/15 border-[var(--gm-primary,#FE540B)]/40 text-[var(--gm-primary,#FE540B)]"
                            : "bg-[#131315] border-[#26262A] text-[#CBD5E1]"
                        }`}
                      >
                        <DeviceIcon size={20} />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white truncate">
                            {session.deviceLabel}
                          </span>
                          {isCurrent && (
                            <span className="text-[11px] font-bold text-[var(--gm-primary,#FE540B)]">
                              · Este dispositivo
                            </span>
                          )}
                        </div>

                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-[#8B8B92] font-mono tabular-nums">
                          <span className="inline-flex items-center gap-1 text-[#CBD5E1]">
                            {session.isPwaInstalled ? (
                              <>
                                <Download size={12} className="text-emerald-400 shrink-0" />
                                <span className="text-emerald-300 font-semibold">App Baixado (Instalado)</span>
                              </>
                            ) : (
                              <>
                                <Globe size={12} className="text-[#8B8B92] shrink-0" />
                                <span>Navegador Web</span>
                              </>
                            )}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Tela {session.screenResolution}</span>
                          <span aria-hidden="true">·</span>
                          <span>Atividade: {formatRelativeActivity(session.lastActiveAt)}</span>
                          <span aria-hidden="true">·</span>
                          <span>Desde {formatDateTime(session.firstSeenAt)}</span>
                          {session.pinEnabled && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 text-emerald-400">
                                <ShieldCheck size={12} className="shrink-0" />
                                <span>PIN ativo</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* AÇÃO DESVINCULAR */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {!isConfirming ? (
                        <button
                          type="button"
                          onClick={() => setConfirmUnlinkId(session.deviceId)}
                          className={`h-10 px-4 rounded-[6px] border text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 cursor-pointer whitespace-nowrap ${
                            isCurrent
                              ? "bg-[#1B1B1E] hover:bg-rose-500/15 border-[#26262A] hover:border-rose-500/45 text-[#CBD5E1] hover:text-rose-200"
                              : "bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-200 hover:text-white"
                          }`}
                          title={
                            isCurrent
                              ? "Desvincular este computador e sair da conta"
                              : "Desvincular e desconectar este computador remotamente"
                          }
                        >
                          <Unlink size={14} className="shrink-0" />
                          <span>{isCurrent ? "Desvincular Este" : "Desvincular"}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleUnlinkDevice(session)}
                            disabled={isBusy}
                            className="h-10 px-3.5 rounded-[6px] bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.96] transition-[background-color,transform] duration-150 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                          >
                            {isBusy ? (
                              <RefreshCw size={13} className="animate-spin shrink-0" />
                            ) : (
                              <Check size={13} className="shrink-0" />
                            )}
                            <span>{isCurrent ? "Sair e Desvincular" : "Confirmar"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmUnlinkId(null)}
                            className="h-10 px-3 rounded-[6px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] text-[#CBD5E1] hover:text-white text-xs font-bold flex items-center justify-center gap-1 active:scale-[0.96] transition-[background-color,transform] duration-150 cursor-pointer whitespace-nowrap"
                          >
                            <X size={13} className="shrink-0" />
                            <span>Cancelar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
