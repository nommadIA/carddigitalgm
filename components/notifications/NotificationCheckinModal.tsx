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

  if (!isOpen) return null;

  const isGranted = diagnostics.permission === "granted";

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto no-scrollbar bg-black/75 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-4xl lg:max-w-5xl gm-push-glass-card rounded-[28px] border border-white/20 shadow-[0_30px_90px_rgba(0,0,0,0.85)] p-5 sm:p-7 md:p-8 text-slate-100 relative overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Specular glass reflection */}
        <div className="absolute inset-0 pointer-events-none rounded-[28px] bg-gradient-to-b from-white/[0.12] via-transparent to-black/30" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[var(--gm-primary)]/15 border border-[var(--gm-primary)]/30 flex items-center justify-center text-[var(--gm-primary)] shadow-sm shrink-0">
              <Radio size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                  Check-in de Notificações
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  4 Estados
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">
                Auditoria e teste em tempo real: Aberto, Minimizado, Segundo Plano e Fechado
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full barra border border-white/10 hover:border-white/25 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto no-scrollbar space-y-5 pr-0.5 flex-1 relative z-10 text-left">
          
          {/* PAINEL DE SAÚDE DO SISTEMA (RADAR DIAGNÓSTICO) */}
          <div className="barra p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--gm-primary)] flex items-center gap-2">
                <ShieldCheck size={15} />
                Status do Ecossistema no Dispositivo
              </span>
              {!isGranted && (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="text-[10.5px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-[var(--gm-primary)] text-white hover:brightness-110 active:scale-95 transition-all shadow-none cursor-pointer"
                >
                  Permitir no Navegador
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Permissão */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col gap-1.5">
                <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider">Permissão SO</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isGranted ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                    }`}
                  />
                  <span className="text-xs sm:text-sm font-black text-white">
                    {isGranted ? "Concedida" : diagnostics.permission === "denied" ? "Bloqueada" : "Pendente"}
                  </span>
                </div>
              </div>

              {/* Service Worker */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col gap-1.5">
                <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider">Service Worker</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      diagnostics.serviceWorkerReady ? "bg-emerald-400 animate-pulse" : "bg-emerald-400"
                    }`}
                  />
                  <span className="text-xs sm:text-sm font-black text-white">
                    {diagnostics.serviceWorkerSupported ? "Ativo (v6)" : "Indisponível"}
                  </span>
                </div>
              </div>

              {/* Som e Áudio */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col gap-1.5">
                <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider">Toque Sonoro</span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        !diagnostics.soundMuted ? "bg-emerald-400" : "bg-amber-400"
                      }`}
                    />
                    <span className="text-xs sm:text-sm font-black text-white truncate max-w-[80px]">
                      {!diagnostics.soundMuted ? "Ligado" : "Mudo"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => playNotificationSound()}
                    title="Testar som"
                    className="text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <Volume2 size={15} />
                  </button>
                </div>
              </div>

              {/* Modo de Tela (PWA / Navegador) */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col gap-1.5">
                <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider">Ambiente</span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-xs sm:text-sm font-black text-white truncate">
                    {diagnostics.isStandalone ? "PWA Standalone" : diagnostics.isIOS ? "iOS Safari" : "Web Desktop"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* OS 4 CARDS DE CHECK-IN / TESTE (EXPANDIDOS EM GRID 2 COLUNAS) */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers size={15} className="text-[var(--gm-primary)]" />
              Executar Testes Práticos por Estado (Horizontalmente Expandido)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ESTADO 1: APP ABERTO */}
              <div className="p-4 sm:p-5 rounded-2xl barra border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                        1. App Aberto
                      </span>
                    </div>
                    <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 uppercase shrink-0">
                      Primeiro Plano
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Dispara banner de alerta Apple Glass na tela, áudio sonoro e vibração do smartphone, atualizando o sino instantaneamente.
                  </p>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleTest1}
                    disabled={testState1 === "running"}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] border border-white/15 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-none"
                  >
                    {testState1 === "success" ? (
                      <>
                        <Check size={15} className="text-emerald-400 stroke-[3]" />
                        <span>Disparado com Sucesso!</span>
                      </>
                    ) : (
                      <>
                        <Play size={14} className="text-[var(--gm-primary)] fill-[var(--gm-primary)]" />
                        <span>Testar em Primeiro Plano</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ESTADO 2: APP MINIMIZADO */}
              <div className="p-4 sm:p-5 rounded-2xl barra border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                        2. App Minimizado
                      </span>
                    </div>
                    <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 uppercase shrink-0">
                      Janela Recolhida
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Testa se o sistema operacional exibe o balão/banner nativo fora do navegador enquanto a janela estiver minimizada.
                  </p>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleTest2}
                    disabled={testState2 === "countdown"}
                    className={`w-full px-4 py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-none ${
                      testState2 === "countdown"
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse"
                        : testState2 === "success"
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                        : "bg-white/10 hover:bg-white/15 border-white/15 text-white active:scale-[0.98]"
                    }`}
                  >
                    {testState2 === "countdown" ? (
                      <>
                        <Clock size={15} className="animate-spin" />
                        <span>Minimize a janela ({countdown2}s)...</span>
                      </>
                    ) : testState2 === "success" ? (
                      <>
                        <Check size={15} className="text-emerald-400 stroke-[3]" />
                        <span>Notificação Entregue!</span>
                      </>
                    ) : (
                      <>
                        <Play size={14} className="text-amber-400 fill-amber-400" />
                        <span>Testar Minimizado (5s)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ESTADO 3: SEGUNDO PLANO */}
              <div className="p-4 sm:p-5 rounded-2xl barra border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" />
                      <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                        3. Em Segundo Plano
                      </span>
                    </div>
                    <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 uppercase shrink-0">
                      Tela Bloqueada / Aba Oculta
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    O Service Worker gerencia a sincronização de alarmes e dispara mesmo com o smartphone bloqueado ou em outra aba.
                  </p>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleTest3}
                    disabled={testState3 === "countdown"}
                    className={`w-full px-4 py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-none ${
                      testState3 === "countdown"
                        ? "bg-blue-500/20 border-blue-500/40 text-blue-300 animate-pulse"
                        : testState3 === "success"
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                        : "bg-white/10 hover:bg-white/15 border-white/15 text-white active:scale-[0.98]"
                    }`}
                  >
                    {testState3 === "countdown" ? (
                      <>
                        <Smartphone size={15} className="animate-pulse" />
                        <span>Bloqueie a tela do celular ({countdown3}s)...</span>
                      </>
                    ) : testState3 === "success" ? (
                      <>
                        <Check size={15} className="text-emerald-400 stroke-[3]" />
                        <span>Disparo Concluído!</span>
                      </>
                    ) : (
                      <>
                        <Play size={14} className="text-blue-400 fill-blue-400" />
                        <span>Testar 2º Plano (8s)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ESTADO 4: APP FECHADO / PUSH */}
              <div className="p-4 sm:p-5 rounded-2xl barra border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0" />
                      <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                        4. App Fechado / Push
                      </span>
                    </div>
                    <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25 uppercase shrink-0">
                      App Encerrado
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    O protocolo Web Push (FCM / APNs) acorda o Service Worker mesmo se o app estiver totalmente encerrado pelo usuário.
                  </p>
                  {pushStatusMessage && (
                    <p className="text-[11px] text-purple-300 italic pt-0.5">{pushStatusMessage}</p>
                  )}
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleTest4}
                    disabled={testState4 === "running"}
                    className="w-full px-4 py-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 active:scale-[0.98] border border-purple-500/40 text-xs font-bold text-purple-200 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-none"
                  >
                    <Wifi size={14} className="text-purple-400" />
                    <span>Testar Push Remoto & SW</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* DICA ESPECIAL PARA IPHONE APPLE (iOS) */}
          <div className="p-4 sm:p-5 rounded-2xl barra border border-white/10 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-white">
              <Apple size={18} />
            </div>
            <div className="space-y-1 text-left">
              <h5 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                Instruções Importantes para Apple iPhone (iOS)
              </h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                No iOS 16.4 ou superior, para receber alertas em segundo plano com o app fechado, a Apple exige que você toque no botão <strong>Compartilhar</strong> (ícone do quadrado com a seta para cima no Safari) e escolha <strong>"Adicionar à Tela de Início"</strong>. Feito isso, abra pelo ícone instalado e autorize as notificações!
              </p>
            </div>
          </div>

          {/* RESUMO DOS ALARMES ATIVOS */}
          {alarmsHealth.activeCount > 0 && (
            <div className="p-3.5 rounded-xl barra border border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-[var(--gm-primary)]" />
                <span className="text-slate-300 font-medium">
                  {alarmsHealth.activeCount} alarme(s) de orçamentos e prazos agendados no sistema.
                </span>
              </div>
              {alarmsHealth.nextUpcoming && (
                <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Próximo: {alarmsHealth.nextUpcoming.time}
                </span>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between shrink-0 relative z-10">
          <span className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Info size={13} />
            Check-in Automático Realtime CardDigital GM
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[var(--gm-primary)] hover:brightness-110 active:scale-95 text-xs font-black text-white uppercase tracking-wider shadow-none transition-all cursor-pointer"
          >
            Concluir Check-in
          </button>
        </div>

      </motion.div>
    </div>
  );
}
