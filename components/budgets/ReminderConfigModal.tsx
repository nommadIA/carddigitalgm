import React, { useEffect, useState } from "react";
import { Bell, BellOff, Clock, Save, X } from "lucide-react";
import { getBudgetReminderTimes, setBudgetReminderTimes, getBudgetRemindersEnabled, setBudgetRemindersEnabled } from "../../lib/alarmSystem";

interface ReminderConfigModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ReminderConfigModal({ open, onClose }: ReminderConfigModalProps) {
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [rem1, setRem1] = useState("09:00");
  const [rem2, setRem2] = useState("13:00");
  const [rem3, setRem3] = useState("18:00");
  const [savedToast, setSavedToast] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const times = getBudgetReminderTimes();
      setRem1(times[0] || "09:00");
      setRem2(times[1] || "13:00");
      setRem3(times[2] || "18:00");
      setRemindersEnabled(getBudgetRemindersEnabled());
    }
  }, [open]);

  function normalizeTime(v: string) {
    const t = String(v || "").trim();
    return /^\d{2}:\d{2}$/.test(t) ? t : "";
  }

  function handleSave() {
    setBudgetRemindersEnabled(remindersEnabled);

    if (!remindersEnabled) {
      setSavedToast("Lembretes desativados.");
      setTimeout(() => {
        setSavedToast(null);
        onClose();
      }, 2000);
      return;
    }

    const t1 = normalizeTime(rem1);
    const t2 = normalizeTime(rem2);
    const t3 = normalizeTime(rem3);

    if (!t1 || !t2 || !t3) {
      alert("Preencha os 3 horários.");
      return;
    }

    setBudgetReminderTimes([t1, t2, t3]);

    // Solicita permissão de notificação se estiver ativando
    if (remindersEnabled && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    setSavedToast("Horários salvos! (Novos APROVADOS usarão isso)");
    setTimeout(() => {
      setSavedToast(null);
      onClose();
    }, 2000);
  }

  function handleTestNotification() {
    if (!("Notification" in window)) {
      alert("Este navegador não suporta notificações.");
      return;
    }

    if (Notification.permission !== "granted") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          sendTest();
        } else {
          alert("Permissão de notificação negada.");
        }
      });
    } else {
      sendTest();
    }

    function sendTest() {
      new Notification("Teste de Notificação", {
        body: "Seu sistema de lembretes está funcionando corretamente!",
        icon: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg"
      });
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161b22] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Bell size={18} className="text-[var(--gm-primary)]" />
            Configurar Lembretes
          </h3>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-white">Status APROVADO</div>
              <div className="text-xs text-white/60 mt-1">
                Receba notificações diárias nos horários abaixo enquanto o orçamento estiver aprovado.
              </div>
            </div>
            <button
              type="button"
              className={`gm-btn h-8 text-xs ${remindersEnabled ? "gm-border-loop" : ""}`}
              onClick={() => setRemindersEnabled(!remindersEnabled)}
            >
              {remindersEnabled ? "Ativo" : "Desativado"}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-white/40 mb-1 block">Horário 1</label>
              <input
                type="time"
                className="gm-input h-9 text-center text-sm"
                value={rem1}
                onChange={(e) => setRem1(e.target.value)}
                disabled={!remindersEnabled}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-white/40 mb-1 block">Horário 2</label>
              <input
                type="time"
                className="gm-input h-9 text-center text-sm"
                value={rem2}
                onChange={(e) => setRem2(e.target.value)}
                disabled={!remindersEnabled}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-white/40 mb-1 block">Horário 3</label>
              <input
                type="time"
                className="gm-input h-9 text-center text-sm"
                value={rem3}
                onChange={(e) => setRem3(e.target.value)}
                disabled={!remindersEnabled}
              />
            </div>
          </div>

          {savedToast && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-3 rounded-xl text-center">
              {savedToast}
            </div>
          )}

          <div className="pt-2 space-y-3">
            <button className="gm-btn gm-border-loop w-full font-bold" onClick={handleSave}>
              <Save size={16} />
              Salvar Configuração
            </button>

            <button 
              className="w-full h-10 rounded-xl border border-white/5 bg-white/5 text-white/60 text-xs font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              onClick={handleTestNotification}
              type="button"
            >
              <Bell size={14} />
              Testar Notificação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
