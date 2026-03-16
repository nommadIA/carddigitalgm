
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

        // Notificação do Navegador (se permitido)
        if ("Notification" in window && Notification.permission === "granted") {
          const title = alarm.type === 'EXPENSE' ? 'Lembrete de Despesa' : 'Orçamento Aprovado';
          const body = alarm.type === 'EXPENSE'
            ? `Cliente: ${alarm.clientName}\nHorário: ${alarm.time}`
            : `Olá! Orçamento "${alarm.clientName}" em andamento, conclua antes do prazo "${alarm.deliveryDays || 5} dias"`;

          new Notification(title, {
            body: body,
            icon: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg",
            vibrate: [200, 100, 200],
            tag: alarm.id,
            renotify: true
          } as any);
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

  const disableReminder = (alarm: BudgetAlarm) => {
    toggleAlarmsForBudget(alarm.budgetId, false);
    dismiss(alarm.id);
  };

  if (alarms.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {alarms.map((alarm) => (
        <div
          key={alarm.id}
          className="pointer-events-auto w-[360px] max-w-[92vw] rounded-xl border border-white/5 bg-[#151619] shadow-[0_20px_40px_rgba(0,0,0,0.5)] p-4 animate-slide-up"
          role="status"
        >
          <div className="flex items-start gap-4">
            {/* Icon hardware style */}
            <div className="h-12 w-12 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center shrink-0 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[var(--gm-primary)]/10 animate-pulse" />
              <Bell size={20} className="text-[var(--gm-primary)] relative z-10" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[9px] font-mono uppercase tracking-widest text-white/30">
                  SISTEMA // ALERTA
                </div>
                <div className="text-[9px] font-mono text-[var(--gm-primary)] animate-pulse">
                  Agora
                </div>
              </div>

              <div className="text-white font-bold text-xs uppercase tracking-wider mb-2">
                {alarm.type === 'EXPENSE' ? 'Lembrete de Despesa' : 'Orçamento Aprovado'}
              </div>

              <div className="space-y-1">
                {alarm.type === 'EXPENSE' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-white/40 uppercase">Cliente</span>
                      <span className="text-[10px] font-mono text-white truncate max-w-[180px]">{alarm.clientName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-white/40 uppercase">Horário</span>
                      <span className="text-[10px] font-mono text-[var(--gm-primary)]/80">{alarm.time}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] text-white/80 leading-relaxed">
                    Olá! Orçamento "{alarm.clientName}" em andamento, conclua antes do prazo "{alarm.deliveryDays || 5} dias"
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  className="flex-1 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 text-[10px] font-bold uppercase tracking-widest transition-all"
                  onClick={() => dismiss(alarm.id)}
                  type="button"
                >
                  Entendido
                </button>

                <button
                  className="h-9 px-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400/80 text-[10px] font-bold flex items-center justify-center transition-all"
                  onClick={() => disableReminder(alarm)}
                  type="button"
                  title="Desativar lembretes para este orçamento"
                >
                  <BellOff size={14} />
                </button>
              </div>
            </div>

            <button
              className="h-6 w-6 rounded-lg hover:bg-white/5 text-white/20 hover:text-white flex items-center justify-center transition-colors -mt-1 -mr-1"
              onClick={() => dismiss(alarm.id)}
              type="button"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlarmToast;
