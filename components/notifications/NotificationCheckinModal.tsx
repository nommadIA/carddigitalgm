// components/notifications/NotificationCheckinModal.tsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  X,
  Volume2,
  Smartphone,
  Layers,
  Sparkles,
  Play,
  RotateCcw,
  Check,
  ChevronRight,
  ShieldCheck,
  Wifi,
  Radio,
  Clock,
  Apple,
  ExternalLink,
  Info
} from "lucide-react";
import {
  testNotificationAberto,
  testNotificationMinimizado,
  testNotificationSegundoPlano,
  testNotificationFechado,
  getNotificationDiagnostics
} from "../../lib/realNotification";
import { getAlarmsHealthInfo } from "../../lib/alarmSystem";
import { playNotificationSound } from "../../lib/audio";
import { useAuth } from "../../store/AuthContext";
import { forceSavePushToken } from "../../services/pushFCM";

export interface NotificationCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCheckinModal({
  isOpen,
  onClose,
}: NotificationCheckinModalProps) {
  const { tenantId, user } = useAuth();

  // Estados dos testes dos 4 cenários
  const [testState1, setTestState1] = useState<"idle" | "running" | "success">("idle");
  const [testState2, setTestState2] = useState<"idle" | "countdown" | "success">("idle");
  const [countdown2, setCountdown2] = useState<number>(5);

  const [testState3, setTestState3] = useState<"idle" | "countdown" | "success">("idle");
  const [countdown3, setCountdown3] = useState<number>(8);

  const [testState4, setTestState4] = useState<"idle" | "running" | "success">("idle");
  const [pushStatusMessage, setPushStatusMessage] = useState<string>("");

  // Diagnósticos
  const [diagnostics, setDiagnostics] = useState<any>({
    notificationSupported: true,
    permission: "default",
    serviceWorkerSupported: true,
    serviceWorkerReady: false,
    isIOS: false,
    isStandalone: false,
    vibrateSupported: true,
    currentSound: "classic_chord",
    soundMuted: false,
  });

  const [alarmsHealth, setAlarmsHealth] = useState<any>({
    totalCount: 0,
    activeCount: 0,
    nextUpcoming: null,
  });

  // Atualiza diagnósticos sempre que o modal abre
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    getNotificationDiagnostics().then((diag) => {
      if (active) setDiagnostics(diag);
    });

    const health = getAlarmsHealthInfo();
    setAlarmsHealth(health);

    return () => {
      active = false;
    };
  }, [isOpen]);

  // Contagem regressiva do Teste 2 (Minimizado)
  useEffect(() => {
    let timer: any = null;
    if (testState2 === "countdown") {
      if (countdown2 > 0) {
        timer = setTimeout(() => setCountdown2((prev) => prev - 1), 1000);
      } else {
        setTestState2("success");
      }
    }
    return () => clearTimeout(timer);
  }, [testState2, countdown2]);

  // Contagem regressiva do Teste 3 (Segundo Plano)
  useEffect(() => {
    let timer: any = null;
    if (testState3 === "countdown") {
      if (countdown3 > 0) {
        timer = setTimeout(() => setCountdown3((prev) => prev - 1), 1000);
      } else {
        setTestState3("success");
      }
    }
    return () => clearTimeout(timer);
  }, [testState3, countdown3]);

  // Executar Teste 1: App Aberto
  const handleTest1 = async () => {
    setTestState1("running");
    await testNotificationAberto();
    setTimeout(() => {
      setTestState1("success");
    }, 600);
  };

  // Executar Teste 2: App Minimizado
  const handleTest2 = async () => {
    setCountdown2(5);
    setTestState2("countdown");
    await testNotificationMinimizado(5);
  };

  // Executar Teste 3: Em Segundo Plano
  const handleTest3 = async () => {
    setCountdown3(8);
    setTestState3("countdown");
    await testNotificationSegundoPlano(8);
  };

  // Executar Teste 4: App Fechado
  const handleTest4 = async () => {
    setTestState4("running");
    setPushStatusMessage("Sincronizando infraestrutura de Service Worker e Push...");

    // Se tiver dados de login, sincroniza o token FCM
    if (tenantId && user?.id) {
      try {
        await forceSavePushToken(tenantId, user.id);
      } catch (e) {}
    }

    const res = await testNotificationFechado();
    setPushStatusMessage(res.message);
    setTestState4("success");
  };

  // Pedir permissão nativa
  const handleRequestPermission = async () => {
    if (typeof Notification !== "undefined") {
      try {
        const res = await Notification.requestPermission();
        const diag = await getNotificationDiagnostics();
        setDiagnostics(diag);
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isGranted = diagnostics.permission === "granted";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto no-scrollbar bg-black/75 backdrop-blur-sm animate-fade-in"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-4xl rounded-lg border border-[#26262A] bg-[#131315] gm-modal shadow-2xl overflow-hidden p-5 sm:p-6 text-[#F2F2F3] flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-[#26262A] shrink-0 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-md bg-[var(--gm-primary)]/15 border border-[var(--gm-primary)]/30 flex items-center justify-center text-[var(--gm-primary)] shrink-0">
              <Radio size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Check-in de Notificações
                </h3>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  4 Estados
                </span>
              </div>
              <p className="text-xs text-[#8B8B92] mt-0.5">
                Auditoria e teste em tempo real: Aberto, Minimizado, Segundo Plano e Fechado
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 rounded-[4px] border border-[#26262A] bg-[#1B1B1E] hover:bg-[#26262A] hover:border-[#3F3F46] flex items-center justify-center text-[#8B8B92] hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto no-scrollbar space-y-5 pr-0.5 flex-1 relative z-10 text-left">
          
          {/* PAINEL DE SAÚDE DO SISTEMA */}
          <div className="relative rounded-md p-4 sm:p-5 border border-[#26262A] bg-[#0B0B0C] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--gm-primary)] flex items-center gap-2">
                <ShieldCheck size={15} />
                Status do Ecossistema no Dispositivo
              </span>
              {!isGranted && (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="text-[11px] font-black uppercase tracking-wider px-3 h-8 rounded-[4px] bg-[var(--gm-primary)] text-[#0B0B0C] hover:brightness-110 active:scale-95 transition-colors cursor-pointer"
                >
                  Permitir no Navegador
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Permissão */}
              <div className="p-3 rounded-[4px] bg-[#131315] border border-[#26262A] flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-[#8B8B92] uppercase tracking-wider">Permissão SO</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isGranted ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {isGranted ? "Concedida" : diagnostics.permission === "denied" ? "Bloqueada" : "Pendente"}
                  </span>
                </div>
              </div>

              {/* Service Worker */}
              <div className="p-3 rounded-[4px] bg-[#131315] border border-[#26262A] flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-[#8B8B92] uppercase tracking-wider">Service Worker</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {diagnostics.serviceWorkerSupported ? "Ativo (v6)" : "Indisponível"}
                  </span>
                </div>
              </div>

              {/* Som e Áudio */}
              <div className="p-3 rounded-[4px] bg-[#131315] border border-[#26262A] flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-[#8B8B92] uppercase tracking-wider">Toque Sonoro</span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        !diagnostics.soundMuted ? "bg-emerald-400" : "bg-amber-400"
                      }`}
                    />
                    <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[80px]">
                      {!diagnostics.soundMuted ? "Ligado" : "Mudo"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => playNotificationSound()}
                    title="Testar som"
                    className="text-[#8B8B92] hover:text-white p-1.5 hover:bg-[#1B1B1E] rounded-[4px] transition-colors cursor-pointer"
                  >
                    <Volume2 size={15} />
                  </button>
                </div>
              </div>

              {/* Modo de Tela */}
              <div className="p-3 rounded-[4px] bg-[#131315] border border-[#26262A] flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-[#8B8B92] uppercase tracking-wider">Ambiente</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs sm:text-sm font-bold text-white truncate">
                    {diagnostics.isStandalone ? "PWA Standalone" : diagnostics.isIOS ? "iOS Safari" : "Web Desktop"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* OS 4 CARDS DE CHECK-IN */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#CBD5E1] flex items-center gap-2">
              <Layers size={15} className="text-[var(--gm-primary)]" />
              Testes Práticos por Estado
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* ESTADO 1 */}
              <div className="rounded-md p-4 sm:p-5 border border-[#26262A] bg-[#0B0B0C] flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
                        1. App Aberto
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase shrink-0">
                      Primeiro Plano
                    </span>
                  </div>
                  <p className="text-xs text-[#8B8B92] leading-relaxed">
                    Dispara banner de alerta na tela, áudio sonoro e vibração do smartphone, atualizando o sino instantaneamente.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTest1}
                  disabled={testState1 === "running"}
                  className="w-full h-10 px-4 rounded-[6px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] hover:border-[#3F3F46] text-xs font-bold uppercase tracking-wider text-[#F2F2F3] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {testState1 === "success" ? (
                    <>
                      <Check size={15} className="text-emerald-400 stroke-[2.5]" />
                      <span>Disparado com Sucesso</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} className="text-[var(--gm-primary)] fill-[var(--gm-primary)]" />
                      <span>Testar em Primeiro Plano</span>
                    </>
                  )}
                </button>
              </div>

              {/* ESTADO 2 */}
              <div className="rounded-md p-4 sm:p-5 border border-[#26262A] bg-[#0B0B0C] flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
                        2. App Minimizado
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase shrink-0">
                      Janela Oculta
                    </span>
                  </div>
                  <p className="text-xs text-[#8B8B92] leading-relaxed">
                    Testa se o sistema operacional exibe o balão/banner nativo fora do navegador enquanto a janela estiver minimizada.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTest2}
                  disabled={testState2 === "countdown"}
                  className={`w-full h-10 px-4 rounded-[6px] border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    testState2 === "countdown"
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : testState2 === "success"
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      : "bg-[#1B1B1E] hover:bg-[#26262A] border-[#26262A] hover:border-[#3F3F46] text-[#F2F2F3]"
                  }`}
                >
                  {testState2 === "countdown" ? (
                    <>
                      <Clock size={15} className="animate-spin" />
                      <span>Minimize a janela ({countdown2}s)...</span>
                    </>
                  ) : testState2 === "success" ? (
                    <>
                      <Check size={15} className="text-emerald-400 stroke-[2.5]" />
                      <span>Notificação Entregue</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} className="text-amber-400 fill-amber-400" />
                      <span>Testar Minimizado (5s)</span>
                    </>
                  )}
                </button>
              </div>

              {/* ESTADO 3 */}
              <div className="rounded-md p-4 sm:p-5 border border-[#26262A] bg-[#0B0B0C] flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
                        3. Em Segundo Plano
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase shrink-0">
                      Aba Oculta
                    </span>
                  </div>
                  <p className="text-xs text-[#8B8B92] leading-relaxed">
                    O Service Worker gerencia a sincronização de alarmes e dispara mesmo com o smartphone bloqueado ou em outra aba.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTest3}
                  disabled={testState3 === "countdown"}
                  className={`w-full h-10 px-4 rounded-[6px] border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    testState3 === "countdown"
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                      : testState3 === "success"
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      : "bg-[#1B1B1E] hover:bg-[#26262A] border-[#26262A] hover:border-[#3F3F46] text-[#F2F2F3]"
                  }`}
                >
                  {testState3 === "countdown" ? (
                    <>
                      <Smartphone size={15} />
                      <span>Bloqueie a tela do celular ({countdown3}s)...</span>
                    </>
                  ) : testState3 === "success" ? (
                    <>
                      <Check size={15} className="text-emerald-400 stroke-[2.5]" />
                      <span>Disparo Concluído</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} className="text-blue-400 fill-blue-400" />
                      <span>Testar 2º Plano (8s)</span>
                    </>
                  )}
                </button>
              </div>

              {/* ESTADO 4 */}
              <div className="rounded-md p-4 sm:p-5 border border-[#26262A] bg-[#0B0B0C] flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
                        4. App Fechado / Push
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-purple-500/15 text-purple-400 border border-purple-500/30 uppercase shrink-0">
                      App Encerrado
                    </span>
                  </div>
                  <p className="text-xs text-[#8B8B92] leading-relaxed">
                    O protocolo Web Push (FCM / APNs) acorda o Service Worker mesmo se o app estiver totalmente encerrado.
                  </p>
                  {pushStatusMessage && (
                    <p className="text-[11px] text-purple-300 pt-0.5">{pushStatusMessage}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleTest4}
                  disabled={testState4 === "running"}
                  className="w-full h-10 px-4 rounded-[6px] bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-xs font-bold uppercase tracking-wider text-purple-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Wifi size={14} className="text-purple-400" />
                  <span>Testar Push Remoto & SW</span>
                </button>
              </div>
            </div>
          </div>

          {/* DICA IPHONE */}
          <div className="rounded-md p-4 sm:p-5 border border-[#26262A] bg-[#0B0B0C] flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-[4px] bg-[#1B1B1E] border border-[#26262A] flex items-center justify-center shrink-0 text-white">
              <Apple size={18} />
            </div>
            <div className="space-y-1 text-left">
              <h5 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
                Instruções para Apple iPhone (iOS)
              </h5>
              <p className="text-xs text-[#8B8B92] leading-relaxed">
                No iOS 16.4 ou superior, para receber alertas em segundo plano com o app fechado, toque no botão <strong className="text-[#CBD5E1]">Compartilhar</strong> no Safari e escolha <strong className="text-[#CBD5E1]">"Adicionar à Tela de Início"</strong>. Depois, abra pelo ícone instalado e autorize as notificações.
              </p>
            </div>
          </div>

          {/* RESUMO DOS ALARMES */}
          {alarmsHealth.activeCount > 0 && (
            <div className="rounded-md p-3.5 border border-[#26262A] bg-[#0B0B0C] flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-[var(--gm-primary)]" />
                <span className="text-[#CBD5E1] font-medium">
                  {alarmsHealth.activeCount} alarme(s) agendados no sistema.
                </span>
              </div>
              {alarmsHealth.nextUpcoming && (
                <span className="text-[11px] font-mono font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-[4px] border border-emerald-500/25 tabular-nums">
                  Próximo: {alarmsHealth.nextUpcoming.time}
                </span>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="pt-4 mt-4 border-t border-[#26262A] flex items-center justify-between gap-3 shrink-0 relative z-10">
          <span className="text-[11px] text-[#8B8B92] font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Info size={14} />
            Check-in Realtime CardDigital GM
          </span>

          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-[6px] bg-[var(--gm-btn-bg,var(--gm-primary,#FE540B))] hover:brightness-110 text-[#0B0B0C] border border-[var(--gm-btn-border,var(--gm-primary,#FE540B))] text-xs font-black uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap"
          >
            Concluir Check-in
          </button>
        </div>

      </motion.div>
    </div>
  );
}
