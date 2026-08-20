import { BudgetAlarm } from "../types";
import { syncAlarmsToDB, markAlarmAsTriggeredInDB } from "./db";

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
  syncAlarmsToDB(alarms).catch(console.error);
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
  type: "BUDGET" | "EXPENSE" | "NOTE" = "BUDGET",
  deliveryDays?: number,
  date?: string | null
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
    deliveryDays,
    date,
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
export const scheduleApprovedBudgetReminders = (budgetId: string, clientName: string, deliveryDays?: number) => {
  const times = getBudgetReminderTimes();
  addAlarmsForBudget(budgetId, clientName, times, "BUDGET", deliveryDays);
};

// ✅ NOVO: Sincroniza todos os alarmes de orçamento existentes com os novos horários globais
export const syncAllBudgetAlarms = () => {
  const currentAlarms = getAlarms();
  const budgetAlarms = currentAlarms.filter(a => a.type === "BUDGET");
  
  if (budgetAlarms.length === 0) return;

  const times = getBudgetReminderTimes();
  const nonBudgetAlarms = currentAlarms.filter(a => a.type !== "BUDGET");
  
  // Agrupa por budgetId para saber quais clientes temos e os dias de entrega
  const budgetGroups = new Map<string, { clientName: string, deliveryDays?: number }>();
  budgetAlarms.forEach(a => {
    budgetGroups.set(a.budgetId, { clientName: a.clientName, deliveryDays: a.deliveryDays });
  });

  const newAlarms: BudgetAlarm[] = [];
  budgetGroups.forEach((data, budgetId) => {
    times.forEach(time => {
      newAlarms.push({
        id: crypto.randomUUID(),
        budgetId,
        clientName: data.clientName,
        time,
        active: true,
        triggered: false,
        type: "BUDGET",
        deliveryDays: data.deliveryDays,
        lastTriggeredOn: null as any,
      });
    });
  });

  saveAlarms([...nonBudgetAlarms, ...newAlarms]);
};

// ✅ NOVO: Sincroniza alarmes com a lista real de orçamentos do banco de dados
export const syncAlarmsWithBudgets = (budgets: any[]) => {
  const currentAlarms = getAlarms();
  const nonBudgetAlarms = currentAlarms.filter(a => a.type !== "BUDGET");
  const budgetAlarms = currentAlarms.filter(a => a.type === "BUDGET");

  // Create a map of existing alarms by budgetId + time to preserve state
  const existingAlarmsMap = new Map<string, BudgetAlarm>();
  budgetAlarms.forEach(a => {
    existingAlarmsMap.set(`${a.budgetId}_${a.time}`, a);
  });

  const times = getBudgetReminderTimes();
  const newAlarms: BudgetAlarm[] = [];

  budgets.forEach(budget => {
    const rawStatus = (budget.status || "AGUARDANDO").toString().toUpperCase().trim();
    let normStatus = rawStatus;
    if (rawStatus.includes("CONCL")) normStatus = "CONCLUIDO";
    else if (rawStatus.includes("APROV")) normStatus = "APROVADO";
    else if (rawStatus.includes("CANC")) normStatus = "CANCELADO";
    else if (rawStatus.includes("AGUAR")) normStatus = "AGUARDANDO";
    else if (rawStatus.includes("PROD") || rawStatus.includes("FAZ") || rawStatus.includes("EM ")) normStatus = "PRODUCAO";

    const isApprovedOrProd = normStatus === "APROVADO" || normStatus === "PRODUCAO";
    
    if (isApprovedOrProd && !budget.deleted_at) {
      // Check if the user has disabled alarms for this budget entirely
      const existingForBudget = budgetAlarms.filter(a => a.budgetId === budget.id);
      const isManuallyDisabled = existingForBudget.length > 0 && existingForBudget.some(a => !a.active);

      times.forEach(time => {
        const existing = existingAlarmsMap.get(`${budget.id}_${time}`);
        
        newAlarms.push({
          id: existing ? existing.id : crypto.randomUUID(),
          budgetId: budget.id,
          clientName: budget.client_name || "Cliente",
          time,
          active: existing ? existing.active : !isManuallyDisabled,
          triggered: existing ? existing.triggered : false,
          type: "BUDGET",
          deliveryDays: budget.delivery_days || 5,
          lastTriggeredOn: existing ? existing.lastTriggeredOn : null as any,
        });
      });
    }
  });

  saveAlarms([...nonBudgetAlarms, ...newAlarms]);
};

// ✅ NOVO: Sincroniza alarmes com a lista real de notas do banco de dados
export const syncAlarmsWithNotes = (notes: any[]) => {
  const currentAlarms = getAlarms();
  const nonNoteAlarms = currentAlarms.filter(a => a.type !== "NOTE");
  const noteAlarms = currentAlarms.filter(a => a.type === "NOTE");

  const newAlarms: BudgetAlarm[] = [];
  const existingAlarmsMap = new Map<string, BudgetAlarm>();
  noteAlarms.forEach(a => {
    existingAlarmsMap.set(`${a.budgetId}_${a.time}`, a);
  });

  notes.forEach(note => {
    if (!note.deleted_at && note.reminder_time) {
      const hasDate = note.reminder_time.includes(" ");
      let rDate: string | null = null;
      let rTimeStr = note.reminder_time;
      if (hasDate) {
        const parts = note.reminder_time.split(" ");
        rDate = parts[0] || null;
        rTimeStr = parts.slice(1).join(" ") || "";
      }
      
      const times = rTimeStr.split(",").map((t: string) => t.trim()).filter((t: string) => /^\d{2}:\d{2}$/.test(t));
      
      times.forEach((time: string) => {
        const existing = existingAlarmsMap.get(`${note.id}_${time}`);
        newAlarms.push({
          id: existing ? existing.id : crypto.randomUUID(),
          budgetId: note.id,
          clientName: note.title || "Nota",
          time,
          active: existing ? existing.active : true,
          triggered: existing ? existing.triggered : false,
          type: "NOTE",
          date: rDate,
          lastTriggeredOn: existing ? existing.lastTriggeredOn : null as any,
        });
      });
    }
  });

  saveAlarms([...nonNoteAlarms, ...newAlarms]);
};

// ✅ NOVO: Sincroniza alarmes com a lista de despesas (Despertador no Vencimento)
export const syncAlarmsWithExpenses = (expenses: any[]) => {
  const currentAlarms = getAlarms();
  const nonExpenseAlarms = currentAlarms.filter(a => a.type !== "EXPENSE");
  const expenseAlarms = currentAlarms.filter(a => a.type === "EXPENSE");

  const newAlarms: BudgetAlarm[] = [];
  const existingAlarmsMap = new Map<string, BudgetAlarm>();
  expenseAlarms.forEach(a => {
    existingAlarmsMap.set(`${a.budgetId}_${a.time}`, a);
  });

  expenses.forEach(exp => {
    // Alarme ativo para despesas não pagas, não excluídas e com despertador ativado
    const isPaid = !!exp.paid;
    const isDeleted = !!exp.deleted_at;
    const hasAlarm = exp.reminder_alarm !== false; // Padrão ativo
    const dDate = exp.dueDate || exp.due_date;

    if (!isDeleted && !isPaid && dDate && hasAlarm) {
      const times = (exp.reminder_time || "09:00")
        .split(",")
        .map((t: string) => t.trim())
        .filter((t: string) => /^\d{2}:\d{2}$/.test(t));
      
      if (times.length === 0) times.push("09:00");

      times.forEach((time: string) => {
        const existing = existingAlarmsMap.get(`${exp.id}_${time}`);
        newAlarms.push({
          id: existing ? existing.id : crypto.randomUUID(),
          budgetId: exp.id,
          clientName: exp.description || "Despesa",
          time,
          active: existing ? existing.active : true,
          triggered: existing ? existing.triggered : false,
          type: "EXPENSE",
          date: dDate, // Dispara no dia de vencimento
          lastTriggeredOn: existing ? existing.lastTriggeredOn : null as any,
        });
      });
    }
  });

  saveAlarms([...nonExpenseAlarms, ...newAlarms]);
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
    if (a.date && a.date !== today) return false;
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
  markAlarmAsTriggeredInDB(alarmId).catch(console.error);
};

export const snoozeAlarm = (alarmId: string) => {
  // por padrão: só marca como disparado hoje (sem alarme sonoro)
  markAlarmAsTriggered(alarmId);
};
