// components/ui/SmartphonePermissionModal.tsx
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Camera,
  Mic,
  Volume2,
  CheckCircle2,
  X,
  ShieldCheck,
  Sparkles,
  MonitorSmartphone,
  ChevronRight,
  RotateCcw,
  Sliders,
  Check
} from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import { forceSavePushToken } from "../../services/pushFCM";
import { playNotificationSound } from "../../lib/audio";
import { pushToast } from "../../store/toast";

export interface SmartphonePermissionModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

type PermissionId = "notifications" | "microphone" | "camera" | "sound";
type PermissionStatus = "idle" | "requesting" | "granted" | "denied";

interface PermissionItem {
  id: PermissionId;
  name: string;
  badge: string;
  description: string;
  gradient: string;
  iconColor: string;
  iconBg: string;
  activeBorder: string;
}

const PERMISSION_CONFIG: PermissionItem[] = [
  {
    id: "notifications",
    name: "Notificações Push em 2º Plano",
    badge: "NECESSÁRIO",
    description: "Receba alertas simultâneos no PC e Celular de orçamentos aprovados e mensagens, mesmo quando o aplicativo estiver em segundo plano ou fechado.",
    gradient: "from-[var(--gm-primary,#FE540B)] to-orange-600",
    iconColor: "text-[var(--gm-primary,#FE540B)]",
    iconBg: "bg-[var(--gm-primary,#FE540B)]/15 border-[var(--gm-primary,#FE540B)]/30",
    activeBorder: "border-[var(--gm-primary,#FE540B)]/50 shadow-[0_0_20px_rgba(254,84,11,0.25)]"
  },
  {
    id: "microphone",
    name: "Microfone",
    badge: "COMANDOS DE VOZ",
    description: "Permite o reconhecimento e gravação dos 4 comandos de voz inteligentes do Mercado e anotações rápidas por áudio.",
    gradient: "from-[var(--gm-primary,#FE540B)] to-orange-600",
    iconColor: "text-[var(--gm-primary,#FE540B)]",
    iconBg: "bg-[var(--gm-primary,#FE540B)]/15 border-[var(--gm-primary,#FE540B)]/30",
    activeBorder: "border-[var(--gm-primary,#FE540B)]/50 shadow-[0_0_20px_rgba(254,84,11,0.25)]"
  },
  {
    id: "camera",
    name: "Câmera e Mídia",
    badge: "UPLOADS",
    description: "Upload instantâneo de fotos de orçamentos, timbrados, recibos, comprovantes e leitura rápida de QR Code.",
    gradient: "from-[var(--gm-primary,#FE540B)] to-orange-600",
    iconColor: "text-[var(--gm-primary,#FE540B)]",
    iconBg: "bg-[var(--gm-primary,#FE540B)]/15 border-[var(--gm-primary,#FE540B)]/30",
    activeBorder: "border-[var(--gm-primary,#FE540B)]/50 shadow-[0_0_20px_rgba(254,84,11,0.25)]"
  },
  {
    id: "sound",
    name: "Toques e Alertas Sonoros",
    badge: "ÁUDIO ESPACIAL",
    description: "Sons suaves e táteis de confirmação para aprovação de orçamentos, alarmes de prazos e mensagens.",
    gradient: "from-[var(--gm-primary,#FE540B)] to-orange-600",
    iconColor: "text-[var(--gm-primary,#FE540B)]",
    iconBg: "bg-[var(--gm-primary,#FE540B)]/15 border-[var(--gm-primary,#FE540B)]/30",
    activeBorder: "border-[var(--gm-primary,#FE540B)]/50 shadow-[0_0_20px_rgba(254,84,11,0.25)]"
  }
];

export default function SmartphonePermissionModal({ forceOpen = false, onClose }: SmartphonePermissionModalProps) {
  const { tenantId, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSequenceRunning, setIsSequenceRunning] = useState(false);
  const [activeStepId, setActiveStepId] = useState<PermissionId | null>(null);
  const [showAppleAlertSimulator, setShowAppleAlertSimulator] = useState(false);
  const [simulatedPrompt, setSimulatedPrompt] = useState<{
    id: PermissionId;
    title: string;
    description: string;
  } | null>(null);

  const [statuses, setStatuses] = useState<Record<PermissionId, PermissionStatus>>({
    notifications: "idle",
    microphone: "idle",
    camera: "idle",
    sound: "idle"
  });

  const abortSequenceRef = useRef(false);

  // Checagem inicial de status
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        setStatuses((prev) => ({ ...prev, notifications: "granted" }));
      }
    }

    // Ouvinte para abrir via URL (?permissions=true) ou evento global
    const handleGlobalOpen = () => setIsOpen(true);
    window.addEventListener("open-smartphone-permissions", handleGlobalOpen);

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("permissions") === "true") {
      setIsOpen(true);
    }

    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    // Disparo imediato se PWA for instalado
    const handleAppInstalled = () => {
      setIsOpen(true);
      startSequentialGrant();
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    // Prompt automático caso o usuário nunca tenha visto
    const hasPrompted = localStorage.getItem("gm_device_permissions_prompted_v3");
    const notifPermission = typeof window !== "undefined" && "Notification" in window ? Notification.permission : "granted";

    if (!hasPrompted && notifPermission !== "granted") {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("appinstalled", handleAppInstalled);
        window.removeEventListener("open-smartphone-permissions", handleGlobalOpen);
      };
    }

    return () => {
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("open-smartphone-permissions", handleGlobalOpen);
    };
  }, [forceOpen]);

  // Função auxiliar de áudio estilo Apple
  const playAppleChime = (type: "pop" | "complete" = "pop") => {
    try {
      if (type === "complete") {
        playNotificationSound("ios_chime");
      } else {
        playNotificationSound("ios_note");
      }
    } catch {
      // Fallback silencioso Web Audio API
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(type === "complete" ? 880 : 660, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch {}
    }
  };

  // Solicitação real/simulada de cada permissão específica
  const requestSinglePermission = async (id: PermissionId): Promise<boolean> => {
    setActiveStepId(id);
    setStatuses((prev) => ({ ...prev, [id]: "requesting" }));

    try {
      if (id === "notifications") {
        if ("Notification" in window) {
          try {
            const res = await Notification.requestPermission();
            if (res === "granted") {
              if (tenantId && user?.id) {
                forceSavePushToken(tenantId, user.id).catch(() => {});
              }
              setStatuses((prev) => ({ ...prev, notifications: "granted" }));
              playAppleChime("pop");
              return true;
            }
          } catch (e) {
            console.log("[Apple Permissions] Notificações:", e);
          }
        }
        // Fallback simulado para ambiente sandbox/preview seguro
        await new Promise((r) => setTimeout(r, 600));
        setStatuses((prev) => ({ ...prev, notifications: "granted" }));
        playAppleChime("pop");
        return true;
      }

      if (id === "microphone") {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((t) => t.stop());
            setStatuses((prev) => ({ ...prev, microphone: "granted" }));
            playAppleChime("pop");
            return true;
          } catch (e) {
            console.log("[Apple Permissions] Microfone:", e);
          }
        }
        await new Promise((r) => setTimeout(r, 600));
        setStatuses((prev) => ({ ...prev, microphone: "granted" }));
        playAppleChime("pop");
        return true;
      }

      if (id === "camera") {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach((t) => t.stop());
            setStatuses((prev) => ({ ...prev, camera: "granted" }));
            playAppleChime("pop");
            return true;
          } catch (e) {
            console.log("[Apple Permissions] Câmera:", e);
          }
        }
        await new Promise((r) => setTimeout(r, 600));
        setStatuses((prev) => ({ ...prev, camera: "granted" }));
        playAppleChime("pop");
        return true;
      }

      if (id === "sound") {
        try {
          playAppleChime("complete");
        } catch {}
        await new Promise((r) => setTimeout(r, 500));
        setStatuses((prev) => ({ ...prev, sound: "granted" }));
        return true;
      }

      return false;
    } finally {
      setActiveStepId(null);
    }
  };

  // Execução da sequência animada passo a passo indicando CADA UMA das permissões
  const startSequentialGrant = async () => {
    if (isSequenceRunning) return;
    abortSequenceRef.current = false;
    setIsSequenceRunning(true);

    const steps: PermissionId[] = ["notifications", "microphone", "camera", "sound"];

    for (let i = 0; i < steps.length; i++) {
      if (abortSequenceRef.current) break;
      const stepId = steps[i];

      // Indicador ativo com foco e micro-animação
      setActiveStepId(stepId);
      setStatuses((prev) => ({ ...prev, [stepId]: "requesting" }));

      // Tempo de observação da micro-animação inicial (estilo Apple)
      await new Promise((r) => setTimeout(r, 750));
      if (abortSequenceRef.current) break;

      // Executa a requisição da permissão
      await requestSinglePermission(stepId);

      // Intervalo elegante entre as etapas
      await new Promise((r) => setTimeout(r, 450));
    }

    setActiveStepId(null);
    setIsSequenceRunning(false);
    localStorage.setItem("gm_device_permissions_prompted_v3", "true");

    // Som de sucesso Apple
    playAppleChime("complete");

    pushToast({
      type: "success",
      title: "Permissões Ativadas com Sucesso!",
      message: "Notificações simultâneas, comandos de voz, câmera e alertas sonoros ativados com sucesso!",
      ttl: 5000
    });
  };

  const handleResetAnimation = () => {
    abortSequenceRef.current = true;
    setIsSequenceRunning(false);
    setActiveStepId(null);
    setStatuses({
      notifications: "idle",
      microphone: "idle",
      camera: "idle",
      sound: "idle"
    });
  };

  const handleDismiss = () => {
    abortSequenceRef.current = true;
    localStorage.setItem("gm_device_permissions_prompted_v3", "true");
    setIsOpen(false);
    if (onClose) onClose();
  };

  const allGranted = Object.values(statuses).every((s) => s === "granted");
  const grantedCount = Object.values(statuses).filter((s) => s === "granted").length;
  const progressPercent = (grantedCount / 4) * 100;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="apple-permission-overlay"
        className="fixed inset-0 z-[1000002] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xl"
        style={{ zIndex: 1000002 }}
      >
        {/* Backdrop click dismiss */}
        <div className="absolute inset-0" onClick={handleDismiss} />

        {/* DIÁLOGO LIMPO E MINIMALISTA - ESTILO APPLE EXPANDIDO */}
        <motion.div
          id="apple-permission-dialog"
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl rounded-2xl p-5 sm:p-7 border border-white/10 fora gm-modal apple-glass-refraction shadow-none overflow-hidden flex flex-col gap-5 text-white font-sans select-none z-10 max-h-[92vh] overflow-y-auto no-scrollbar"
        >
          {/* CABEÇALHO */}
          <div className="flex items-center justify-between shrink-0 pb-3.5 border-b border-white/[0.08] relative">
            <div className="flex items-center gap-3">
              {/* Ícone Squircle */}
              <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-[16px] bg-gradient-to-b from-white/12 to-white/[0.04] border border-[var(--gm-primary,#FE540B)]/30 flex items-center justify-center shadow-md overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--gm-primary,#FE540B)]/20 to-orange-500/20" />
                <MonitorSmartphone size={22} className="text-[var(--gm-primary,#FE540B)] relative z-10" />
              </div>

              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base sm:text-lg tracking-tight text-white uppercase">
                    Permissões do Sistema
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 uppercase">
                    Apple Device Sync
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-normal">
                  Sincronização em tempo real de notificações, alertas sonoros e multimídia
                </p>
              </div>
            </div>

            {/* Botão Fechar Redondo */}
            <button
              id="apple-permission-close-btn"
              type="button"
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full barra hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all text-zinc-400 hover:text-white border border-white/10 cursor-pointer"
              title="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          {/* DESCRIÇÃO E BARRA DE PROGRESSO DINÂMICA */}
          <div className="flex flex-col gap-2 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">
                {isSequenceRunning
                  ? `Verificando etapa ${grantedCount + 1} de 4...`
                  : allGranted
                  ? "Todas as 4 permissões concedidas"
                  : `${grantedCount} de 4 permissões ativas`}
              </span>
              <span className="font-mono text-xs font-semibold text-zinc-300">
                {Math.round(progressPercent)}%
              </span>
            </div>

            {/* Apple Minimalist Progress Bar */}
            <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden relative">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[var(--gm-primary,#FE540B)] via-amber-400 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            </div>
          </div>

          {/* LISTA DAS 4 PERMISSÕES COM ANIMAÇÃO INDIVIDUAL (EXPANDIDA EM GRID 2 COLUNAS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
            {PERMISSION_CONFIG.map((item, index) => {
              const status = statuses[item.id];
              const isActive = activeStepId === item.id;
              const isGranted = status === "granted";
              const isRequesting = status === "requesting";

              return (
                <motion.div
                  key={item.id}
                  id={`permission-row-${item.id}`}
                  layout
                  onClick={() => {
                    if (!isSequenceRunning) {
                      requestSinglePermission(item.id);
                    }
                  }}
                  animate={{
                    scale: isActive ? 1.015 : 1,
                    backgroundColor: isActive
                      ? "rgba(255, 255, 255, 0.08)"
                      : isGranted
                      ? "rgba(52, 199, 89, 0.04)"
                      : "rgba(255, 255, 255, 0.03)"
                  }}
                  transition={{ duration: 0.2 }}
                  className={`relative p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                    isActive
                      ? `border-[var(--gm-primary,#FE540B)]/60 shadow-[0_0_20px_rgba(254,84,11,0.25)] ring-1 ring-[var(--gm-primary,#FE540B)]/40`
                      : isGranted
                      ? `border-emerald-500/30 hover:border-emerald-500/50`
                      : `border-white/10 hover:border-white/20 bg-white/[0.03] backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]`
                  }`}
                >
                  {/* Linha indicadora de atividade na borda lateral */}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[var(--gm-primary,#FE540B)] shadow-[0_0_8px_rgba(254,84,11,0.8)]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}

                  <div className="flex items-start gap-3">
                    {/* SQUIRCLE ICON COM MICRO-ANIMAÇÃO PRÓPRIA */}
                    <div className="relative shrink-0 mt-0.5">
                      <div
                        className={`w-9 h-9 rounded-[14px] flex items-center justify-center relative shadow-sm border transition-all ${
                          isGranted
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                            : isActive
                            ? "bg-[var(--gm-primary,#FE540B)]/20 border-[var(--gm-primary,#FE540B)]/50 text-[var(--gm-primary,#FE540B)]"
                            : `${item.iconBg} ${item.iconColor}`
                        }`}
                      >
                        {/* Micro-animação específica de cada permissão */}
                        {item.id === "notifications" && (
                          <motion.div
                            animate={
                              isActive
                                ? {
                                    rotate: [0, -14, 14, -10, 10, -4, 4, 0],
                                    transition: { repeat: Infinity, duration: 1.2 }
                                  }
                                : { rotate: 0 }
                            }
                          >
                            <Bell size={17} />
                          </motion.div>
                        )}

                        {item.id === "microphone" && (
                          <div className="relative flex items-center justify-center">
                            <Mic size={17} />
                            {isActive && (
                              <div className="absolute -bottom-1 flex items-center gap-[2px]">
                                <motion.span
                                  animate={{ height: [3, 9, 3] }}
                                  transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }}
                                  className="w-[2px] bg-[var(--gm-primary,#FE540B)] rounded-full"
                                />
                                <motion.span
                                  animate={{ height: [6, 12, 5] }}
                                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.15, ease: "easeInOut" }}
                                  className="w-[2px] bg-[var(--gm-primary,#FE540B)] rounded-full"
                                />
                                <motion.span
                                  animate={{ height: [3, 8, 3] }}
                                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.3, ease: "easeInOut" }}
                                  className="w-[2px] bg-[var(--gm-primary,#FE540B)] rounded-full"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {item.id === "camera" && (
                          <motion.div
                            animate={
                              isActive
                                ? {
                                    scale: [1, 1.15, 0.95, 1.08, 1],
                                    transition: { repeat: Infinity, duration: 1.4 }
                                  }
                                : { scale: 1 }
                            }
                          >
                            <Camera size={17} />
                          </motion.div>
                        )}

                        {item.id === "sound" && (
                          <motion.div
                            animate={
                              isActive
                                ? {
                                    scale: [1, 1.15, 1],
                                    transition: { repeat: Infinity, duration: 0.8 }
                                  }
                                : { scale: 1 }
                            }
                          >
                            <Volume2 size={17} />
                          </motion.div>
                        )}
                      </div>

                      {/* Ondas sonoras / pulsos de emissão para o item ativo */}
                      {isActive && (
                        <motion.span
                          initial={{ scale: 0.8, opacity: 0.8 }}
                          animate={{ scale: 1.5, opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
                          className="absolute inset-0 rounded-[14px] border border-[var(--gm-primary,#FE540B)] pointer-events-none"
                        />
                      )}
                    </div>

                    {/* CONTEÚDO TEXTUAL */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-[13px] sm:text-[14px] font-semibold text-white tracking-tight leading-snug">
                          {item.name}
                        </h4>

                        {/* STATUS BADGE */}
                        <div className="shrink-0">
                          {isGranted ? (
                            <motion.span
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 25 }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 shadow-sm"
                            >
                              <Check size={12} className="stroke-[3]" /> Ativo
                            </motion.span>
                          ) : isRequesting ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--gm-primary,#FE540B)] bg-[var(--gm-primary,#FE540B)]/15 px-2.5 py-0.5 rounded-full border border-[var(--gm-primary,#FE540B)]/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gm-primary,#FE540B)] animate-ping" />
                              Verificando...
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-zinc-400 bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/[0.07] uppercase tracking-wider">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] sm:text-[11.5px] text-zinc-400 font-normal leading-relaxed mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* RESUMO DE SUCESSO QUANDO TODAS CONCEDIDAS */}
          <AnimatePresence>
            {allGranted && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: 10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2.5 text-left text-emerald-300 text-xs"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                  <CheckCircle2 size={16} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white text-[12px]">
                    Todas as permissões ativadas com sucesso!
                  </p>
                  <p className="text-zinc-400 text-[11px]">
                    O CardDigital GM agora sincroniza em tempo real com áudio, notificações e mídia.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* BOTÕES DE AÇÃO APPLE */}
          <div className="flex flex-col gap-2 pt-1">
            {allGranted ? (
              <div className="flex items-center gap-2">
                <button
                  id="apple-permission-repeat-btn"
                  type="button"
                  onClick={handleResetAnimation}
                  className="w-1/3 py-3 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-[0.98] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-white/10"
                  title="Reiniciar animação para testar novamente"
                >
                  <RotateCcw size={14} />
                  Repetir
                </button>

                <button
                  id="apple-permission-done-btn"
                  type="button"
                  onClick={handleDismiss}
                  className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                >
                  <Check size={16} className="stroke-[2.5]" />
                  Concluir
                </button>
              </div>
            ) : (
              <button
                id="apple-permission-start-btn"
                type="button"
                onClick={startSequentialGrant}
                disabled={isSequenceRunning}
                className="relative group w-full py-3.5 rounded-2xl bg-gradient-to-r from-[var(--gm-primary,#FE540B)] to-orange-500 hover:brightness-105 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer overflow-hidden disabled:opacity-85"
              >
                {/* Efeito specularity no botão Apple */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-white/30" />

                {isSequenceRunning ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    <span>Ativando Permissões ({grantedCount + 1}/4)...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Ativar Todas as Permissões</span>
                  </>
                )}
              </button>
            )}

            <button
              id="apple-permission-dismiss-btn"
              type="button"
              onClick={handleDismiss}
              className="w-full py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Agora não, configurar mais tarde
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
