
import React, { useEffect, useState } from "react";
import { checkAlarms, markAlarmAsTriggered, toggleAlarmsForBudget } from "../../lib/alarmSystem";
import { Bell, BellOff, X } from "lucide-react";
import { BudgetAlarm } from "../../types";
import { playNotificationSound } from "../../lib/audio";

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
  const [alarms, setAlarms] = useState<BudgetAlarm[]>([]);

  useEffect(() => {
    // Solicita permissão para notifications do navegador
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Polling a cada 2 segundos para verificar alarmes
    const interval = setInterval(() => {
      const alarm = checkAlarms();
      if (alarm) {
        setAlarms((prev) => {
          // Evita duplicatas visuais
          if (prev.find(a => a.id === alarm.id)) return prev;
          playNotificationSound(); // ✅ Add sound for new alarm
          return [alarm, ...prev];
        });

        // Notificação do Navegador (se permitido)
        if ("Notification" in window && Notification.permission === "granted") {
          let title = 'Notificação';
          let body = '';
          let hashUrl = '/';
          
          if (alarm.type === 'NOTE') {
             title = 'Lembrete de Nota';
             body = `Nota: ${alarm.clientName}\nHorário: ${alarm.time}`;
             hashUrl = `/#/notes?id=${alarm.budgetId}`;
          } else if (alarm.type === 'EXPENSE') {
             title = 'Lembrete de Despesa';
             body = `Cliente: ${alarm.clientName}\nHorário: ${alarm.time}`;
             hashUrl = `/#/expenses?id=${alarm.budgetId}`;
          } else {
             title = 'Orçamento Aprovado';
             body = `Olá! Orçamento "${alarm.clientName}" em andamento, conclua antes do prazo "${alarm.deliveryDays || 5} dias"`;
             hashUrl = `/#/budgets?id=${alarm.budgetId}`;
          }

          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
              registration.showNotification(title, {
                body: body,
                icon: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg",
                vibrate: [200, 100, 200],
                tag: alarm.id,
                renotify: true,
                requireInteraction: true,
                data: { url: hashUrl }
              } as any);
            });
          } else {
            const n = new Notification(title, {
              body: body,
              icon: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg",
              vibrate: [200, 100, 200],
              tag: alarm.id,
              renotify: true,
              requireInteraction: true
            } as any);
            
            n.onclick = function(e) {
              e.preventDefault();
              window.focus();
              window.location.hash = hashUrl.replace('/#', '');
              n.close();
            };
          }
        }

        // Marca como disparado (no storage e IndexedDB)
        markAlarmAsTriggered(alarm.id);
      }
    }, 2000);

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

  return (
    <div className="fixed bottom-20 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {alarms.map((alarm) => {
        const descriptionText = getNotificationText(alarm);

        return (
          <div
            key={alarm.id}
            className="pointer-events-auto w-[360px] max-w-[92vw] rounded-xl border border-white/10 bg-[#151619]/95 backdrop-blur-md shadow-[0_16px_36px_rgba(0,0,0,0.6)] p-5 animate-slide-up transition-all"
          >
            <div className="flex items-start gap-4">
              {/* Icon with beautiful swinging bell animation */}
              <div className="h-12 w-12 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center shrink-0 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[var(--gm-primary)]/10 animate-pulse" />
                <Bell size={20} className="text-[var(--gm-primary)] relative z-10 animate-bell-ring" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-end mb-1">
                  {/* Visually dynamic and larger Agora indicator */}
                  <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--gm-primary)] animate-pulse">
                    Agora
                  </div>
                </div>

                <div className="text-white font-bold text-[13px] uppercase tracking-wider mb-2">
                  {alarm.type === 'EXPENSE' ? 'Lembrete de Despesa' : alarm.type === 'NOTE' ? 'Lembrete de Nota' : 'Orçamento Aprovado'}
                </div>

                {/* Clean, fully left-aligned description with smooth Typewriter typing animation */}
                <div className="text-[11px] text-white/80 leading-relaxed text-left">
                  <TypewriterText text={descriptionText} />
                </div>

                <div className="flex gap-2 mt-4">
                  {/* Flat premium orange buttons (no neon glowing/blooming shadows) */}
                  <button
                    className="flex-1 h-9 rounded-lg bg-[var(--gm-primary)] hover:brightness-105 active:scale-[0.98] text-white text-[11px] font-bold uppercase tracking-wider transition-all duration-150 flex items-center justify-center border border-white/10"
                    onClick={(e) => { e.stopPropagation(); dismiss(alarm.id); }}
                    type="button"
                  >
                    Entendido
                  </button>

                  <button
                    className="flex-1 h-9 rounded-lg bg-[var(--gm-primary)] hover:brightness-105 active:scale-[0.98] text-white text-[11px] font-bold uppercase tracking-wider transition-all duration-150 flex items-center justify-center border border-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      let hashUrl = '';
                      if (alarm.type === 'NOTE') {
                         hashUrl = `/notes?id=${alarm.budgetId}`;
                      } else if (alarm.type === 'EXPENSE') {
                         hashUrl = `/expenses?id=${alarm.budgetId}`;
                      } else {
                         hashUrl = `/budgets?id=${alarm.budgetId}`;
                      }
                      window.location.hash = hashUrl;
                      dismiss(alarm.id);
                    }}
                    type="button"
                  >
                    Visualizar
                  </button>
                </div>
              </div>

              <button
                className="h-6 w-6 rounded-lg hover:bg-white/5 text-white/20 hover:text-white flex items-center justify-center transition-colors -mt-1 -mr-1"
                onClick={(e) => { e.stopPropagation(); dismiss(alarm.id); }}
                type="button"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AlarmToast;
