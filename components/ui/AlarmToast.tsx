
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

    // Polling a cada 10 segundos para verificar alarmes
    const interval = setInterval(() => {
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
          });
        } catch (e) {}

        // Marca como disparado (no storage e IndexedDB)
        markAlarmAsTriggered(alarm.id);
      }
    }, 10000);

    return () => clearInterval(interval);
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
    <div className="fixed inset-0 sm:inset-auto sm:bottom-20 sm:right-4 z-[9999] flex flex-col items-center justify-center sm:items-end p-4 sm:p-0 gap-3 pointer-events-none">
      {alarms.map((alarm) => {
        const descriptionText = getNotificationText(alarm);

        return (
          <div
            key={alarm.id}
            style={{
              backdropFilter: "blur(28px) saturate(190%) contrast(105%)",
              WebkitBackdropFilter: "blur(28px) saturate(190%) contrast(105%)",
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(20, 22, 28, 0.45) 40%, rgba(10, 12, 16, 0.65) 100%)",
            }}
            className="pointer-events-auto w-[380px] max-w-[94vw] rounded-[24px] border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.65),0_1px_1px_rgba(255,255,255,0.25)_inset,0_0_25px_rgba(255,255,255,0.03)_inset] p-4.5 sm:p-5 animate-scale-up sm:animate-slide-up transition-all relative overflow-hidden group"
          >
            {/* Apple Glass specular reflection overlay */}
            <div className="absolute inset-0 rounded-[24px] pointer-events-none bg-gradient-to-b from-white/[0.14] via-white/[0.02] to-transparent" />

            {/* Header: FIVE ICON (Logo Oficial do App CardDigital GM) + Identificação do Sistema */}
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/[0.12] relative z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* FIVE ICON oficial do App CardDigital GM com tamanho ampliado exatamente como no anexo 2 */}
                <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-[9px] border border-white/20 flex items-center justify-center overflow-hidden shadow-sm bg-black/50 shrink-0 !p-0">
                  <img
                    src={officialAppLogo}
                    alt="CardDigital GM Oficial"
                    className="w-full h-full object-cover scale-[1.3] transform"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/logo.png";
                    }}
                  />
                </div>
                {/* Texto CardDigital GM exatamente com a tipografia, cores e formato do anexo 2 */}
                <div className="flex items-center leading-none">
                  <span className="text-[14px] sm:text-[15px] font-bold text-white tracking-tight flex items-center drop-shadow-xs">
                    CardDigital<span className="text-[#FE540B] font-black ml-1.5">GM</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.08] border border-white/15 text-[10px] font-bold uppercase tracking-wider text-orange-400 backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  AGORA
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3.5 relative z-10">
              {/* Apple Squircle Icon Box: LOGO CADASTRADO PELA CONTA DO USUÁRIO */}
              <div className="w-12 h-12 rounded-[16px] bg-white/[0.08] border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center shrink-0 relative overflow-hidden backdrop-blur-xl p-1">
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
                  <div className="text-white font-bold text-[13px] tracking-tight uppercase leading-snug drop-shadow-xs">
                    {alarm.type === 'EXPENSE' ? 'Lembrete de Despesa' : alarm.type === 'NOTE' ? 'Lembrete de Nota' : 'Orçamento Aprovado'}
                  </div>
                  <button
                    className="h-6 w-6 rounded-full bg-white/[0.08] hover:bg-white/[0.22] active:scale-95 text-white/60 hover:text-white flex items-center justify-center transition-all backdrop-blur-md cursor-pointer shrink-0 -mt-0.5 border border-white/15"
                    onClick={(e) => { e.stopPropagation(); dismiss(alarm.id); }}
                    type="button"
                    title="Fechar"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Clean, fully left-aligned description with smooth Typewriter typing animation */}
                <div className="text-[12px] text-white/85 leading-relaxed text-left font-normal drop-shadow-xs">
                  <TypewriterText text={descriptionText} />
                </div>
              </div>
            </div>

            {/* Apple Glass Action Buttons: centralizados em relação às extremidades da caixa */}
            <div className="flex items-center gap-2.5 mt-4 pt-0.5 relative z-10 w-full">
              <button
                className="flex-1 h-9 rounded-xl bg-white/[0.09] hover:bg-white/[0.18] active:scale-[0.98] text-white text-[11px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center border border-white/20 backdrop-blur-xl shadow-xs cursor-pointer"
                onClick={(e) => { e.stopPropagation(); dismiss(alarm.id); }}
                type="button"
              >
                Entendido
              </button>

              <button
                className="flex-1 h-9 rounded-xl bg-[var(--gm-primary)]/90 hover:bg-[var(--gm-primary)] hover:brightness-110 active:scale-[0.98] text-white text-[11px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center border border-white/30 backdrop-blur-xl shadow-[0_4px_16px_rgba(var(--gm-primary-rgb),0.35)] cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  let targetPath = '';
                  if (alarm.type === 'NOTE') {
                     targetPath = `/notes?id=${alarm.budgetId}`;
                  } else if (alarm.type === 'EXPENSE') {
                     targetPath = `/expenses?id=${alarm.budgetId}`;
                  } else {
                     targetPath = `/budgets?id=${alarm.budgetId}`;
                  }
                  navigate(targetPath);
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
