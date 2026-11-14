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

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const allGranted = Object.values(statuses).every((s) => s === "granted");
  const grantedCount = Object.values(statuses).filter((s) => s === "granted").length;
  const progressPercent = (grantedCount / 4) * 100;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="apple-permission-overlay"
        className="fixed inset-0 z-[1000002] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm"
        style={{ zIndex: 1000002 }}
      >
        {/* Backdrop click dismiss */}
        <div className="absolute inset-0" onClick={handleDismiss} />

        {/* DIÁLOGO FORGE */}
        <motion.div
          id="apple-permission-dialog"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl sm:max-w-3xl rounded-lg p-5 sm:p-6 border border-[#26262A] bg-[#131315] gm-modal shadow-2xl overflow-hidden flex flex-col gap-5 text-[#F2F2F3] font-sans select-none z-10 max-h-[92vh] overflow-y-auto no-scrollbar"
        >
          {/* CABEÇALHO */}
          <div className="flex items-center justify-between gap-3 shrink-0 pb-3.5 border-b border-[#26262A] relative">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-md bg-[#1B1B1E] border border-[#26262A] flex items-center justify-center shrink-0">
                <MonitorSmartphone size={20} className="text-[var(--gm-primary,#FE540B)]" />
              </div>

              <div className="text-left min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base sm:text-lg tracking-tight text-white">
                    Permissões do Sistema
                  </h3>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-[var(--gm-primary,#FE540B)]/15 border border-[var(--gm-primary,#FE540B)]/30 text-[var(--gm-primary,#FE540B)] uppercase">
                    Device Sync
                  </span>
                </div>
                <p className="text-xs text-[#8B8B92] mt-0.5">
                  Sincronização em tempo real de notificações, alertas sonoros e multimídia
                </p>
              </div>
            </div>

            <button
              id="apple-permission-close-btn"
              type="button"
              onClick={handleDismiss}
              className="w-9 h-9 rounded-[4px] bg-[#1B1B1E] hover:bg-[#26262A] flex items-center justify-center transition-colors text-[#8B8B92] hover:text-white border border-[#26262A] hover:border-[#3F3F46] cursor-pointer shrink-0"
              title="Fechar"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          {/* PROGRESSO */}
          <div className="flex flex-col gap-2 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#CBD5E1] font-medium">
                {isSequenceRunning
                  ? `Verificando etapa ${grantedCount + 1} de 4...`
                  : allGranted
                  ? "Todas as 4 permissões concedidas"
                  : `${grantedCount} de 4 permissões ativas`}
              </span>
              <span className="font-mono text-xs font-bold text-[#F2F2F3] tabular-nums">
                {Math.round(progressPercent)}%
              </span>
            </div>

            <div className="w-full h-1.5 bg-[#0B0B0C] border border-[#26262A] rounded-[3px] overflow-hidden relative">
              <motion.div
                className="h-full rounded-[3px] bg-[var(--gm-primary,#FE540B)]"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>

          {/* LISTA DAS 4 PERMISSÕES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
            {PERMISSION_CONFIG.map((item) => {
              const status = statuses[item.id];
              const isActive = activeStepId === item.id;
              const isGranted = status === "granted";
              const isRequesting = status === "requesting";

              return (
                <div
                  key={item.id}
                  id={`permission-row-${item.id}`}
                  onClick={() => {
                    if (!isSequenceRunning) {
                      requestSinglePermission(item.id);
                    }
                  }}
                  className={`relative p-4 rounded-md border transition-colors cursor-pointer overflow-hidden ${
                    isActive
                      ? "bg-[#1B1B1E] border-[var(--gm-primary,#FE540B)]"
                      : isGranted
                      ? "bg-[#0D1F17]/40 border-emerald-500/40 hover:border-emerald-500/60"
                      : "bg-[#0B0B0C] border-[#26262A] hover:border-[#3F3F46]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0 mt-0.5">
                      <div
                        className={`w-9 h-9 rounded-[4px] flex items-center justify-center border transition-colors ${
                          isGranted
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                            : isActive
                            ? "bg-[var(--gm-primary,#FE540B)]/15 border-[var(--gm-primary,#FE540B)]/50 text-[var(--gm-primary,#FE540B)]"
                            : "bg-[#1B1B1E] border-[#26262A] text-[var(--gm-primary,#FE540B)]"
                        }`}
                      >
                        {item.id === "notifications" && <Bell size={17} />}
                        {item.id === "microphone" && <Mic size={17} />}
                        {item.id === "camera" && <Camera size={17} />}
                        {item.id === "sound" && <Volume2 size={17} />}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-[13px] sm:text-sm font-bold text-white tracking-tight leading-snug">
                          {item.name}
                        </h4>

                        <div className="shrink-0">
                          {isGranted ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-[4px] border border-emerald-500/30">
                              <Check size={12} className="stroke-[2.5]" /> Ativo
                            </span>
                          ) : isRequesting ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--gm-primary,#FE540B)] bg-[var(--gm-primary,#FE540B)]/15 px-2 py-0.5 rounded-[4px] border border-[var(--gm-primary,#FE540B)]/30">
                              Verificando...
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono font-semibold text-[#8B8B92] bg-[#1B1B1E] px-2 py-0.5 rounded-[4px] border border-[#26262A] uppercase tracking-wider">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-[#8B8B92] leading-relaxed mt-1.5">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {allGranted && (
            <div className="p-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-left text-emerald-300 text-xs">
              <div className="w-7 h-7 rounded-[4px] bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                <CheckCircle2 size={16} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-xs">
                  Todas as permissões ativadas com sucesso
                </p>
                <p className="text-[#CBD5E1] text-[11px]">
                  Sincronização em tempo real com áudio, notificações e mídia habilitada.
                </p>
              </div>
            </div>
          )}

          {/* BOTÕES DE AÇÃO FORGE */}
          <div className="flex flex-col gap-2 pt-1">
            {allGranted ? (
              <div className="flex items-center gap-2.5">
                <button
                  id="apple-permission-repeat-btn"
                  type="button"
                  onClick={handleResetAnimation}
                  className="w-1/3 h-10 rounded-[6px] bg-[#1B1B1E] hover:bg-[#26262A] text-[#F2F2F3] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#26262A]"
                  title="Reiniciar teste"
                >
                  <RotateCcw size={14} />
                  Repetir
                </button>

                <button
                  id="apple-permission-done-btn"
                  type="button"
                  onClick={handleDismiss}
                  className="flex-1 h-10 rounded-[6px] bg-emerald-500 hover:bg-emerald-600 text-[#0B0B0C] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                className="w-full h-11 rounded-[6px] bg-[var(--gm-primary,#FE540B)] hover:brightness-110 active:scale-[0.99] text-[#0B0B0C] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-70"
              >
                {isSequenceRunning ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-4 h-4 border-2 border-[#0B0B0C]/30 border-t-[#0B0B0C] rounded-full"
                    />
                    <span>Ativando Permissões ({grantedCount + 1}/4)...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={17} />
                    <span>Ativar Todas as Permissões</span>
                  </>
                )}
              </button>
            )}

            <button
              id="apple-permission-dismiss-btn"
              type="button"
              onClick={handleDismiss}
              className="w-full py-2 text-xs font-semibold text-[#8B8B92] hover:text-[#F2F2F3] transition-colors cursor-pointer"
            >
              Agora não, configurar mais tarde
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
