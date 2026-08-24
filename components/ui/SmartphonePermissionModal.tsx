// components/ui/SmartphonePermissionModal.tsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Smartphone, Camera, Mic, Volume2, RefreshCw, CheckCircle2, X, ShieldCheck, Sparkles, MonitorSmartphone } from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import { forceSavePushToken } from "../../services/pushFCM";
import { playNotificationSound } from "../../lib/audio";
import { pushToast } from "../../store/toast";

interface SmartphonePermissionModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function SmartphonePermissionModal({ forceOpen = false, onClose }: SmartphonePermissionModalProps) {
  const { tenantId, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [grantedNotification, setGrantedNotification] = useState(false);
  const [grantedMic, setGrantedMic] = useState(false);
  const [grantedCamera, setGrantedCamera] = useState(false);

  useEffect(() => {
    // 1. Checa status atual das permissões
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        setGrantedNotification(true);
      }
    }

    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    // 2. Disparador imediato quando o App for Instalado (PWA / Desktop / Mobile)
    const handleAppInstalled = () => {
      console.log("[PWA] App instalado com sucesso! Solicitando ativação de permissões completas...");
      setIsOpen(true);
      // Auto-dispara a concessão caso o usuário acabe de instalar
      handleGrantPermissions();
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    // 3. Checa se o app deve sugerir ativação de permissões
    const hasPrompted = localStorage.getItem("gm_device_permissions_prompted_v3");
    const notifPermission = typeof window !== "undefined" && "Notification" in window ? Notification.permission : "granted";

    if (!hasPrompted && notifPermission !== "granted") {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }

    return () => {
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [forceOpen]);

  const handleGrantPermissions = async () => {
    setIsRequesting(true);
    let successCount = 0;
    try {
      // 1. Desbloquear AudioContext / Tocar som de teste
      try {
        playNotificationSound();
      } catch (e) {}

      // 2. Solicitar Notificações e Salvar Token FCM para disparo simultâneo nos dispositivos
      if ("Notification" in window) {
        try {
          const perm = await Notification.requestPermission();
          if (perm === "granted") {
            setGrantedNotification(true);
            successCount++;
            if (tenantId && user?.id) {
              await forceSavePushToken(tenantId, user.id);
            }
          }
        } catch (e) {
          console.log("[Permissões] Notificações:", e);
        }
      }

      // 3. Solicitar Microfone (para comandos de voz, Mercado e notas de áudio)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getTracks().forEach((t) => t.stop());
          setGrantedMic(true);
          successCount++;
        } catch (e) {
          console.log("[Permissões] Microfone não autorizado ou cancelado:", e);
        }
      }

      // 4. Solicitar Câmera (para fotos de orçamentos, recibos e documentos)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          videoStream.getTracks().forEach((t) => t.stop());
          setGrantedCamera(true);
          successCount++;
        } catch (e) {
          console.log("[Permissões] Câmera não autorizada ou cancelada:", e);
        }
      }

      localStorage.setItem("gm_device_permissions_prompted_v3", "true");
      
      pushToast({
        type: "success",
        title: "Permissões Ativadas com Sucesso!",
        message: "Notificações simultâneas (mesmo em 2º plano ou tela bloqueada), microfone e câmera ativados!",
        ttl: 5000
      });

      // Aguarda 800ms para o usuário ver os checks verdes
      setTimeout(() => {
        setIsOpen(false);
        if (onClose) onClose();
      }, 900);
    } catch (err: any) {
      console.error("Erro ao solicitar permissões:", err);
      localStorage.setItem("gm_device_permissions_prompted_v3", "true");
      setIsOpen(false);
      if (onClose) onClose();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("gm_device_permissions_prompted_v3", "true");
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000002] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl" style={{ zIndex: 1000002 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-md fora border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white overflow-hidden font-sans"
        >
          {/* Brilho de fundo temático */}
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-[var(--gm-primary,#FE540B)]/20 rounded-full blur-3xl pointer-events-none" />

          {/* Cabeçalho */}
          <div className="flex items-center justify-between shrink-0 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[var(--gm-primary,#FE540B)]/15 border border-[var(--gm-primary,#FE540B)]/30 flex items-center justify-center text-[var(--gm-primary,#FE540B)]">
                <MonitorSmartphone size={22} className="animate-pulse" />
              </div>
              <div className="text-left">
                <h3 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  Ativar Permissões do Aplicativo
                  <Sparkles size={14} className="text-[var(--gm-primary,#FE540B)]" />
                </h3>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  PC & Smartphone · Sincronização em Tempo Real
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full barra hover:bg-white/10 flex items-center justify-center transition-all text-zinc-400 hover:text-white border border-white/10 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Descrição */}
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed text-left -mt-1">
            Para que o aplicativo funcione com <strong>notificações simultâneas nos seus dispositivos</strong> (mesmo em 2º plano, fechado ou minimizado) e suporte áudio e câmera, ative as permissões abaixo:
          </p>

          {/* Lista de Permissões */}
          <div className="flex flex-col gap-2.5 text-left">
            {/* 1. Notificações Push & 2º Plano */}
            <div className="p-3 rounded-2xl barra border border-white/10 flex items-start gap-3 bg-white/5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                <Bell size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-white">Notificações Push em 2º Plano</h4>
                  {grantedNotification ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 size={12} /> Ativo
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Necessário</span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                  Receba alertas simultâneos no PC e Celular de orçamentos aprovados e mensagens, mesmo quando o horário for cadastrado em apenas um dispositivo.
                </p>
              </div>
            </div>

            {/* 2. Microfone */}
            <div className="p-3 rounded-2xl barra border border-white/10 flex items-start gap-3 bg-white/5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                <Mic size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-white">Microfone</h4>
                  {grantedMic ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 size={12} /> Ativo
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Comandos de Voz</span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                  Permite o reconhecimento e gravação dos 4 comandos de voz do Mercado e notas rápidas por áudio.
                </p>
              </div>
            </div>

            {/* 3. Câmera */}
            <div className="p-3 rounded-2xl barra border border-white/10 flex items-start gap-3 bg-white/5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Camera size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-white">Câmera e Mídia</h4>
                  {grantedCamera ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 size={12} /> Ativo
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Uploads</span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                  Upload ágil de fotos de orçamentos, timbrados, recibos, comprovantes e QR Code.
                </p>
              </div>
            </div>

            {/* 4. Alertas Sonoros */}
            <div className="p-3 rounded-2xl barra border border-white/10 flex items-start gap-3 bg-white/5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                <Volume2 size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-white">Toques e Alertas Sonoros</h4>
                <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                  Sons suaves de confirmação para orçamentos, alarmes de prazos e mensagens.
                </p>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={handleGrantPermissions}
              disabled={isRequesting}
              className="w-full py-3.5 rounded-2xl bg-[var(--gm-primary,#FE540B)] hover:brightness-110 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
            >
              {isRequesting ? (
                <>
                  <RefreshCw size={17} className="animate-spin" />
                  Ativando Todas as Permissões...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Ativar Todas as Permissões Agora
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Agora não, configurar mais tarde
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
