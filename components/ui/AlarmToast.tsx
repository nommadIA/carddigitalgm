
import React, { useEffect, useState } from "react";
import { checkAlarms, markAlarmAsTriggered, toggleAlarmsForBudget } from "../../lib/alarmSystem";
import { Bell, BellOff, X } from "lucide-react";
import { BudgetAlarm } from "../../types";

const AlarmToast = () => {
  const [alarms, setAlarms] = useState<BudgetAlarm[]>([]);

  useEffect(() => {
    // Solicita permissão para notificações do navegador
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
          return [alarm, ...prev];
        });

        // Toca som discreto
        try {
          const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
          audio.volume = 0.4;
          audio.play().catch(() => {});
        } catch {}

        // Notificação do Navegador (se permitido)
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(alarm.type === 'EXPENSE' ? 'Lembrete de Despesa' : 'Orçamento Aprovado', {
            body: `Cliente: ${alarm.clientName}\nHorário: ${alarm.time}`,
            icon: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg"
          });
        }

        // Marca como disparado (no storage)
        markAlarmAsTriggered(alarm.id);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const dismiss = (id: string) => {
    setAlarms(prev => prev.filter(a => a.id !== id));
  };

  const disableReminder = (alarm: BudgetAlarm) => {
    toggleAlarmsForBudget(alarm.budgetId, false);
    dismiss(alarm.id);
  };

  if (alarms.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {alarms.map((alarm) => (
        <div
          key={alarm.id}
          className="pointer-events-auto w-[360px] max-w-[92vw] rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl p-4 animate-slide-up"
          role="status"
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
              <Bell size={18} className="text-orange-400" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-white font-extrabold text-sm tracking-wide">
                {alarm.type === 'EXPENSE' ? 'Lembrete de Despesa' : 'Orçamento Aprovado'}
              </div>
              <div className="text-white/70 text-xs mt-1 truncate">
                Cliente: <span className="text-white font-semibold">{alarm.clientName}</span>
              </div>
              <div className="text-white/55 text-xs mt-1">
                Horário: <span className="text-white/80 font-semibold">{alarm.time}</span>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 text-xs font-bold transition-colors"
                  onClick={() => dismiss(alarm.id)}
                  type="button"
                >
                  Entendi
                </button>

                <button
                  className="h-8 px-3 rounded-lg bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 text-red-200 text-xs font-bold flex items-center gap-2 transition-colors"
                  onClick={() => disableReminder(alarm)}
                  type="button"
                  title="Desativar lembretes deste orçamento"
                >
                  <BellOff size={14} /> Desativar
                </button>
              </div>
            </div>

            <button
              className="h-8 w-8 rounded-full hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors -mt-1 -mr-1"
              onClick={() => dismiss(alarm.id)}
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlarmToast;
