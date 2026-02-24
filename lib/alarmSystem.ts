import { BudgetAlarm } from "../types";

const ALARM_KEY = "gm_pro_alarms_v1";
const REMINDER_TIMES_KEY = "gm_budget_reminder_times_v1"; // ✅ NOVO
const REMINDER_ENABLED_KEY = "gm_budget_reminder_enabled_v1"; // ✅ NOVO

const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const getAlarms = (): BudgetAlarm[] => {
  const raw = localStorage.getItem(ALARM_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const saveAlarms = (alarms: BudgetAlarm[]) => {
  localStorage.setItem(ALARM_KEY, JSON.stringify(alarms));
};

export const getBudgetReminderTimes = (): string[] => {
  try {
    const raw = localStorage.getItem(REMINDER_TIMES_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : null;
    const clean = (arr || [])
      .map((t) => String(t || "").trim())
      .filter((t) => /^\d{2}:\d{2}$/.test(t));
    if (clean.length === 3) return clean;
  } catch {}
  // padrão (pode mudar em Configurações)
  return ["09:00", "13:00", "18:00"];
};

export const setBudgetReminderTimes = (times: string[]) => {
  const clean = (times || [])
    .map((t) => String(t || "").trim())
    .filter((t) => /^\d{2}:\d{2}$/.test(t))
    .slice(0, 3);

  while (clean.length < 3) clean.push("09:00");
  localStorage.setItem(REMINDER_TIMES_KEY, JSON.stringify(clean));
};

export const getBudgetRemindersEnabled = (): boolean => {
  const raw = localStorage.getItem(REMINDER_ENABLED_KEY);
  return raw !== "false"; // Default true
};

export const setBudgetRemindersEnabled = (enabled: boolean) => {
  localStorage.setItem(REMINDER_ENABLED_KEY, String(enabled));
};

export const addAlarmsForBudget = (
  budgetId: string,
  clientName: string,
  times: string[],
  type: "BUDGET" | "EXPENSE" = "BUDGET"
) => {
  const current = getAlarms();
  // Remove alarmes antigos deste item se existirem
  const filtered = current.filter((a) => a.budgetId !== budgetId);

  const newAlarms: BudgetAlarm[] = times.map((time) => ({
    id: crypto.randomUUID(),
    budgetId,
    clientName,
    time,
    active: true,
    triggered: false, // compat
    type,
    lastTriggeredOn: null as any, // compat (se types ainda não tinha)
  }));

  saveAlarms([...filtered, ...newAlarms]);
};

export const removeAlarmsForBudget = (budgetId: string) => {
  const current = getAlarms();
  const filtered = current.filter((a) => a.budgetId !== budgetId);
  saveAlarms(filtered);
};

// ✅ NOVO: chamado quando status vira APROVADO
export const scheduleApprovedBudgetReminders = (budgetId: string, clientName: string) => {
  const times = getBudgetReminderTimes();
  addAlarmsForBudget(budgetId, clientName, times, "BUDGET");
};

export const toggleAlarmsForBudget = (budgetId: string, active: boolean) => {
  const current = getAlarms();
  const updated = current.map((a) => (a.budgetId === budgetId ? { ...a, active } : a));
  saveAlarms(updated);
};

// ✅ AGORA: dispara 1x por dia por horário (recorrente)
// Não depende mais do "triggered" antigo
export const checkAlarms = (): BudgetAlarm | null => {
  const alarms = getAlarms();
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const today = todayKey();

  const alarmToTrigger = alarms.find((a: any) => {
    if (!a.active) return false;
    if (a.time !== currentTime) return false;
    const last = String(a.lastTriggeredOn || "");
    return last !== today; // ✅ só 1x por dia naquele horário
  });

  return (alarmToTrigger as any) || null;
};

export const markAlarmAsTriggered = (alarmId: string) => {
  const alarms: any[] = getAlarms() as any;
  const today = todayKey();
  const updated = alarms.map((a) => {
    if (a.id !== alarmId) return a;
    return {
      ...a,
      triggered: true, // compat
      lastTriggeredOn: today, // ✅ novo
    };
  });
  saveAlarms(updated as any);
};

export const snoozeAlarm = (alarmId: string) => {
  // por padrão: só marca como disparado hoje (sem alarme sonoro)
  markAlarmAsTriggered(alarmId);
};
