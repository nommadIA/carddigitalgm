
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkAlarms, markAlarmAsTriggered, toggleAlarmsForBudget } from "../../lib/alarmSystem";
import { Bell, BellOff, X } from "lucide-react";
import { BudgetAlarm } from "../../types";
import { playNotificationSound } from "../../lib/audio";
import { readSettingsLocal } from "../../lib/settings";
import { triggerRealNotification } from "../../lib/realNotification";
import { broadcastAppNotification } from "../../lib/syncHub";

// Fast typing effect for premium notifications
const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let active = true;
    let i = 0;
    setDisplayedText("");

    const interval = setInterval(() => {
      if (active) {
        if (i < text.length) {
          setDisplayedText(text.substring(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
        }
      }
    }, 18); // Fluid 18ms speed

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [text]);

  return <span className="transition-all duration-150">{displayedText}</span>;
};

const AlarmToast = () => {
  const navigate = useNavigate();
  const [alarms, setAlarms] = useState<BudgetAlarm[]>([]);

  useEffect(() => {
    // Solicita permissão para notifications do navegador
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const runAlarmCheck = () => {
      const alarm = checkAlarms();
      if (alarm) {
        setAlarms((prev) => {
          // Evita duplicatas visuais
          if (prev.find(a => a.id === alarm.id)) return prev;
          playNotificationSound(); // ✅ Add sound for new alarm
          return [alarm, ...prev];
        });

        // Dispara notificação nativa fora do app / segundo plano
        const text = getNotificationText(alarm);
        const currentSettings = readSettingsLocal();
        const userLogo = currentSettings?.company_logo_url || currentSettings?.avatar_url || undefined;
        triggerRealNotification({
          title: `⏰ CardDigital GM · Alarme (${alarm.time})`,
          body: text,
          icon: userLogo,
          inAppToast: false, // O AlarmToast já renderiza o card visual interno
        }).catch(() => {});

        // Transmissão simultânea de alarme para Smartphone & Desktop
        try {
          const tid = typeof localStorage !== "undefined" ? localStorage.getItem("tenant_id") : null;
          broadcastAppNotification(tid, {
            id: `alarm_${alarm.id}`,
            title: `⏰ Alarme (${alarm.time}): ${alarm.clientName}`,
            message: text,
            type: "alarm",
            icon: userLogo,
            url: alarm.type === "EXPENSE" ? "/expenses" : alarm.type === "NOTE" ? "/notes" : "/budgets",
            skipInAppToast: true,
          });
        } catch (e) {}

        // Marca como disparado (no storage e IndexedDB)
        markAlarmAsTriggered(alarm.id);
      }
    };

    // 1. Checagem imediata na montagem
    runAlarmCheck();

    // 2. Polling a cada 10 segundos
    const interval = setInterval(runAlarmCheck, 10000);

    // 3. Resiliência: checagem imediata quando a aba/janela volta de minimizado/segundo plano
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runAlarmCheck();
      } else {
        // Quando entra em segundo plano, avisa o Service Worker para manter sincronização
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "CHECK_BACKGROUND_ALARMS" });
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const dismiss = (id: string) => {
    setAlarms(prev => prev.filter(a => a.id !== id));
  };

  const getNotificationText = (alarm: BudgetAlarm) => {
    if (alarm.type === 'EXPENSE') {
      return `Lembrete: O pagamento da despesa de "${alarm.clientName}" está agendado para às ${alarm.time}.`;
    }
    if (alarm.type === 'NOTE') {
      return `Atenção: O lembrete da nota "${alarm.clientName}" está programado para às ${alarm.time}.`;
    }
    return `Olá! O orçamento "${alarm.clientName}" está em andamento. Lembre-se de concluir antes do prazo estipulado de ${alarm.deliveryDays || 5} dias.`;
  };

  if (alarms.length === 0) return null;

  const settings = readSettingsLocal();
  const companyName = settings?.company_name || "GM Edificação";
  const userRegisteredLogo = settings?.company_logo_url || settings?.avatar_url || null;
  const officialAppLogo = "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg";

  return (
    <div 
      className="gm-alarm-host pointer-events-none fixed bottom-20 right-3 sm:bottom-6 sm:right-6 z-[99999] flex flex-col items-end gap-3"
      style={{
        background: "transparent",
        border: "none",
        boxShadow: "none",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
        padding: 0,
        margin: 0,
        pointerEvents: "none",
      }}
    >
      {alarms.map((alarm) => {
        const descriptionText = getNotificationText(alarm);

        return (
          <div
            key={alarm.id}
            style={{
              background: "#121215",
              borderRadius: "20px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
            }}
            className="pointer-events-auto w-[380px] max-w-[calc(100vw-24px)] rounded-[20px] p-4.5 sm:p-5 animate-scale-up sm:animate-slide-up transition-all relative overflow-hidden group"
          >
            {/* Header: FIVE ICON (Logo Oficial do App CardDigital GM) + Identificação do Sistema */}
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/[0.08] relative z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* FIVE ICON oficial do App CardDigital GM */}
                <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-[9px] border border-white/10 flex items-center justify-center overflow-hidden shadow-sm bg-black shrink-0 !p-0">
                  <img
                    src={officialAppLogo}
                    alt="CardDigital GM Oficial"
                    className="w-full h-full object-cover scale-[1.3] transform"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/logo.png";
                    }}
                  />
                </div>
                {/* Texto CardDigital GM */}
                <div className="flex items-center leading-none">
                  <span className="text-[14px] sm:text-[15px] font-bold text-white tracking-tight flex items-center" style={{ fontFamily: "'Funnel Display', sans-serif" }}>
                    CardDigital<span className="text-[#FE540B] font-black ml-1.5" style={{ fontFamily: "'Funnel Display', sans-serif", fontWeight: 800 }}>GM</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-[10px] font-bold uppercase tracking-wider text-orange-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  AGORA
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3.5 relative z-10">
              {/* Icon Box: LOGO CADASTRADO PELA CONTA DO USUÁRIO */}
              <div className="w-12 h-12 rounded-[16px] bg-[#18181c] border border-white/10 shadow-md flex items-center justify-center shrink-0 relative overflow-hidden p-1">
                {userRegisteredLogo ? (
                  <img
                    src={userRegisteredLogo}
                    alt={companyName}
                    className="w-full h-full object-contain rounded-[12px]"
                  />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-[var(--gm-primary)]/15 animate-pulse" />
                    <Bell size={20} className="text-[var(--gm-primary)] relative z-10 animate-bell-ring" />
                  </>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="text-white font-bold text-[13px] tracking-tight uppercase leading-snug">
                    {alarm.type === 'EXPENSE' ? 'Lembrete de Despesa' : alarm.type === 'NOTE' ? 'Lembrete de Nota' : 'Orçamento Aprovado'}
                  </div>
                  <button
                    className="h-6 w-6 rounded-full bg-white/5 hover:bg-white/15 active:scale-95 text-white/60 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 -mt-0.5 border border-white/10"
                    onClick={(e) => { e.stopPropagation(); dismiss(alarm.id); }}
                    type="button"
                    title="Fechar"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Clean, fully left-aligned description with smooth Typewriter typing animation */}
                <div className="text-[12px] text-zinc-300 leading-relaxed text-left font-normal">
                  <TypewriterText text={descriptionText} />
                </div>
              </div>
            </div>

            {/* Action Buttons: estilo sólido Forge UI */}
            <div className="flex items-center gap-2.5 mt-4 pt-0.5 relative z-10 w-full">
              <button
                className="flex-1 h-9 rounded-xl bg-[#1c1c21] hover:bg-[#27272e] active:scale-[0.98] text-white text-[11px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center border border-white/10 shadow-xs cursor-pointer"
                onClick={(e) => { e.stopPropagation(); dismiss(alarm.id); }}
                type="button"
              >
                Entendido
              </button>

              <button
                className="flex-1 h-9 rounded-xl bg-[var(--gm-primary,#FE540B)] hover:brightness-110 active:scale-[0.98] text-white text-[11px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center shadow-md shadow-[var(--gm-primary,#FE540B)]/30 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  const targetId = alarm.budgetId;
                  const targetType = alarm.type;
                  let targetPath = '';
                  if (targetType === 'NOTE') {
                     targetPath = `/notes?id=${targetId}`;
                  } else if (targetType === 'EXPENSE') {
                     targetPath = `/expenses?id=${targetId}`;
                  } else {
                     targetPath = `/budgets?id=${targetId}`;
                  }

                  // Grava para detecção mesmo em caso de transição de rota ou recarregamento
                  try {
                    sessionStorage.setItem('gm_signal_item_id', targetId);
                    sessionStorage.setItem('gm_signal_item_type', targetType);
                  } catch (err) {}

                  // Dispara evento imediato para componentes já montados na tela
                  window.dispatchEvent(new CustomEvent('gm-signal-item', {
                    detail: { id: targetId, type: targetType }
                  }));

                  navigate(targetPath, { state: { signalId: targetId, timestamp: Date.now() } });
                  dismiss(alarm.id);
                }}
                type="button"
              >
                Visualizar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AlarmToast;
