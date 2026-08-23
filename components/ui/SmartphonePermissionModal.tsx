// components/ui/SmartphonePermissionModal.tsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Smartphone, Camera, Volume2, RefreshCw, CheckCircle2, X, ShieldCheck, Sparkles } from "lucide-react";
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

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    // Apenas para dispositivos móveis ou telas compactas
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (!isMobile) return;

    // Se já respondeu e já deu permissão, não incomoda
    const hasPrompted = localStorage.getItem("gm_mobile_permissions_prompted_v2");
    const notifPermission = typeof window !== "undefined" && "Notification" in window ? Notification.permission : "granted";

    if (notifPermission === "granted") {
      setGrantedNotification(true);
    }

    if (!hasPrompted && notifPermission !== "granted") {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [forceOpen]);

  const handleGrantPermissions = async () => {
    setIsRequesting(true);
    try {
      // 1. Tocar som de teste e desbloquear AudioContext no mobile
      try {
        playNotificationSound();
      } catch (e) {}

      // 2. Solicitar Notificações e Salvar Token FCM
      if ("Notification" in window) {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          setGrantedNotification(true);
          if (tenantId && user?.id) {
            await forceSavePushToken(tenantId, user.id);
          }
        }
      }

      // 3. Solicitar Câmera/Mídia se disponível (apenas checar/preparar)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          // Fecha imediatamente após permissão concedida
          stream.getTracks().forEach((t) => t.stop());
        } catch (e) {
          console.log("[Permissões] Câmera opcional não autorizada agora");
        }
      }

      localStorage.setItem("gm_mobile_permissions_prompted_v2", "true");
      
      pushToast({
        type: "success",
        title: "Permissões Ativadas!",
        message: "Seu smartphone agora receberá notificações em tempo real simultâneas!",
        ttl: 4000
      });

      setIsOpen(false);
      if (onClose) onClose();
    } catch (err: any) {
      console.error("Erro ao solicitar permissões:", err);
      localStorage.setItem("gm_mobile_permissions_prompted_v2", "true");
      setIsOpen(false);
      if (onClose) onClose();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("gm_mobile_permissions_prompted_v2", "true");
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
          className="relative w-full max-w-sm fora border border-white/15 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 text-white overflow-hidden font-sans"
        >
          {/* Brilho de fundo temático */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-[var(--gm-primary,#FE540B)]/20 rounded-full blur-3xl pointer-events-none" />

          {/* Cabeçalho */}
          <div className="flex items-center justify-between shrink-0 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[var(--gm-primary,#FE540B)]/15 border border-[var(--gm-primary,#FE540B)]/30 flex items-center justify-center text-[var(--gm-primary,#FE540B)]">
                <Smartphone size={20} className="animate-pulse" />
              </div>
              <div className="text-left">
                <h3 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                  Ativar Recursos Mobile
                  <Sparkles size={13} className="text-[var(--gm-primary,#FE540B)]" />
                </h3>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  CardDigital GM
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full barra hover:bg-white/10 flex items-center justify-center transition-all text-zinc-400 hover:text-white border border-white/10 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Descrição */}
          <p className="text-[11.5px] text-zinc-300 leading-relaxed text-left -mt-1">
            Para que o aplicativo funcione com <strong>notificações em tempo real simultâneas no computador e celular</strong> (mesmo com o app fechado ou minimizado), precisamos de algumas permissões:
          </p>

          {/* Lista de Permissões */}
          <div className="flex flex-col gap-2 text-left">
            <div className="p-2.5 rounded-xl barra border border-white/10 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                <Bell size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">Notificações Push em 2º Plano</h4>
                  {grantedNotification && <CheckCircle2 size={13} className="text-emerald-400" />}
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                  Receba alertas instantâneos de aprovação de orçamentos e mensagens mesmo com a tela bloqueada.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl barra border border-white/10 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                <Volume2 size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white">Toques e Alertas Sonoros</h4>
                <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                  Sons suaves de confirmação para novos clientes e status de produção.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl barra border border-white/10 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Camera size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white">Câmera e Mídia</h4>
                <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                  Upload ágil de fotos de orçamentos, timbrados, recibos e comprovantes.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl barra border border-white/10 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                <RefreshCw size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white">Sincronização em Tempo Real</h4>
                <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                  Tudo que você altera no smartphone atualiza no desktop simultaneamente.
                </p>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={handleGrantPermissions}
              disabled={isRequesting}
              className="w-full py-3 rounded-xl bg-[var(--gm-primary,#FE540B)] hover:brightness-110 active:scale-[0.98] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
            >
              {isRequesting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  Configurando...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Permitir Todas as Funções
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-2 text-[11px] font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Agora não, configurar mais tarde
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
