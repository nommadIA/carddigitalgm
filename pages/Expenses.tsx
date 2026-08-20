import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Page } from "../components/ui/Page";
import { supabase } from "../lib/supabase";
import { softDelete as softDeleteApi, restore as restoreApi } from "../lib/trash";
import {
  Plus,
  Trash2,
  Pencil,
  Calendar,
  Check,
  Clock,
  X,
  Save,
  RotateCcw,
  Repeat,
  Bell,
  BellOff,
  AlertTriangle,
  Sparkles,
  CalendarDays,
  DollarSign,
  ChevronDown,
} from "lucide-react";
import { GlassDatePicker } from "../components/ui/GlassDatePicker";
import { GlassTimePicker } from "../components/ui/GlassTimePicker";
import { syncAlarmsWithExpenses } from "../lib/alarmSystem";

const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export type ExpenseUI = {
  id: string;
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  paid: boolean;
  is_recurring?: boolean;
  recurring_frequency?: string;
  reminder_alarm?: boolean;
  reminder_time?: string;
  deleted_at?: string | null;
};

// Storage local resiliente para metadados caso a tabela remota ainda não possua as novas colunas
const getMetaLocal = (id: string) => {
  try {
    const raw = localStorage.getItem(`gm_exp_meta_${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveMetaLocal = (id: string, meta: { is_recurring?: boolean; reminder_alarm?: boolean; reminder_time?: string }) => {
  try {
    const prev = getMetaLocal(id) || {};
    localStorage.setItem(`gm_exp_meta_${id}`, JSON.stringify({ ...prev, ...meta }));
  } catch {}
};

function monthRange(monthYYYYMM: string) {
  const [yStr, mStr] = monthYYYYMM.split("-");
  const y = Number(yStr);
  const m = Number(mStr);

  const start = new Date(y, m - 1, 1);
  const next = new Date(y, m, 1);

  const toISO = (d: Date) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };

  return { startISO: toISO(start), nextISO: toISO(next) };
}

// Utilitário para status e sinalização de vencimento
export function getDueDateStatus(dueDateStr: string, paid: boolean) {
  if (paid) {
    return {
      status: "PAID",
      label: "Pago",
      colorClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      badgeText: "Pago",
      isOverdue: false,
      isToday: false,
    };
  }

  if (!dueDateStr) {
    return {
      status: "NONE",
      label: "Sem data",
      colorClass: "bg-zinc-800/60 text-zinc-400 border-zinc-700/40",
      badgeText: "Sem vencimento",
      isOverdue: false,
      isToday: false,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = dueDateStr.split("-").map(Number);
  if (parts.length < 3) {
    return {
      status: "NONE",
      label: "Data inválida",
      colorClass: "bg-zinc-800/60 text-zinc-400 border-zinc-700/40",
      badgeText: "Data inválida",
      isOverdue: false,
      isToday: false,
    };
  }

  const due = new Date(parts[0], parts[1] - 1, parts[2]);
  due.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return {
      status: "TODAY",
      label: "Vence Hoje!",
      colorClass: "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse font-extrabold",
      badgeText: "Vence Hoje!",
      isOverdue: false,
      isToday: true,
    };
  }

  if (diffDays < 0) {
    const daysLate = Math.abs(diffDays);
    return {
      status: "OVERDUE",
      label: daysLate === 1 ? "Vencida ontem" : `Vencida há ${daysLate} dias`,
      colorClass: "bg-red-500/20 text-red-400 border-red-500/40 font-bold",
      badgeText: daysLate === 1 ? "Vencida ontem" : `Vencida (${daysLate}d)`,
      isOverdue: true,
      isToday: false,
    };
  }

  if (diffDays === 1) {
    return {
      status: "TOMORROW",
      label: "Vence amanhã",
      colorClass: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      badgeText: "Vence amanhã",
      isOverdue: false,
      isToday: false,
    };
  }

  return {
    status: "UPCOMING",
    label: `Vence em ${diffDays} dias`,
    colorClass: "bg-white/5 text-slate-300 border-white/10",
    badgeText: `Em ${diffDays} dias`,
    isOverdue: false,
    isToday: false,
  };
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<ExpenseUI[]>([]);
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [tab, setTab] = useState<"active" | "trash" | "recurring">("active");

  // INLINE CREATION STATE (Não abre modal!)
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newPaid, setNewPaid] = useState(false);
  const [newIsRecurring, setNewIsRecurring] = useState(false);
  const [newReminderAlarm, setNewReminderAlarm] = useState(true);
  const [newReminderTime, setNewReminderTime] = useState("09:00");
  const [savingInline, setSavingInline] = useState(false);

  // INLINE EDITING STATE
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPaid, setEditPaid] = useState(false);
  const [editIsRecurring, setEditIsRecurring] = useState(false);
  const [editReminderAlarm, setEditReminderAlarm] = useState(true);
  const [editReminderTime, setEditReminderTime] = useState("09:00");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const newDescInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-align month based on deep-linked expense query
  useEffect(() => {
    const hashQuery = window.location.hash.includes("?") ? window.location.hash.split("?")[1] : "";
    const params = new URLSearchParams(location.search || window.location.search || hashQuery);
    const id = params.get("id");
    if (id) {
      supabase
        .from("expenses")
        .select("due_date, deleted_at")
        .eq("id", id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            if (data.deleted_at) {
              setTab("trash");
            } else {
              setTab("active");
            }
            if (data.due_date) {
              const parts = data.due_date.split("-");
              if (parts.length >= 2) {
                setMonth(`${parts[0]}-${parts[1]}`);
              }
            }
          }
        });
    }
  }, [location.search]);

  // Handle deep-linked expense item inline highlight/edit
  useEffect(() => {
    const hashQuery = window.location.hash.includes("?") ? window.location.hash.split("?")[1] : "";
    const params = new URLSearchParams(location.search || window.location.search || hashQuery);
    const id = params.get("id");
    if (id && expenses.length > 0) {
      const expense = expenses.find((e) => e.id === id);
      if (expense) {
        startEditInline(expense);
      }
    }
  }, [location.search, expenses]);

  // Focus input when inline adding begins
  useEffect(() => {
    if (isAddingInline) {
      setTimeout(() => {
        newDescInputRef.current?.focus();
      }, 50);
    }
  }, [isAddingInline]);

  async function loadExpenses() {
    setLoading(true);
    try {
      const { startISO, nextISO } = monthRange(month);

      let q = supabase
        .from("expenses")
        .select("*")
        .order("due_date", { ascending: true });

      // Filtro da aba
      if (tab === "trash") {
        q = q.not("deleted_at", "is", null);
      } else {
        q = q.is("deleted_at", null);
      }

      // Filtro do mês no BANCO (exceto se for visualização global de lixeira)
      if (tab !== "trash") {
        q = q.gte("due_date", startISO).lt("due_date", nextISO);
      }

      const { data, error } = await q;
      if (error) throw error;

      const rows = ((data as any[]) || []).map((r) => {
        const localMeta = getMetaLocal(r.id);
        const isRec = r.is_recurring !== undefined ? !!r.is_recurring : localMeta?.is_recurring ?? false;
        const remAlarm = r.reminder_alarm !== undefined ? !!r.reminder_alarm : localMeta?.reminder_alarm ?? true;
        const remTime = r.reminder_time || localMeta?.reminder_time || "09:00";

        return {
          id: r.id,
          description: r.description,
          amount: Number(r.amount) || 0,
          dueDate: r.due_date ? String(r.due_date) : "",
          paid: !!r.paid,
          is_recurring: isRec,
          recurring_frequency: r.recurring_frequency || "MONTHLY",
          reminder_alarm: remAlarm,
          reminder_time: remTime,
          deleted_at: r.deleted_at ?? null,
        };
      });

      // Filtro específico para aba "recorrentes"
      const finalRows = tab === "recurring" ? rows.filter((r) => r.is_recurring) : rows;

      setExpenses(finalRows);

      // Sincroniza lembretes/alarmes com sistema de despertador
      syncAlarmsWithExpenses(rows);
    } catch (e) {
      console.error("Erro ao carregar despesas:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, tab]);

  // Cálculos de resumo
  const totalPago = useMemo(
    () => expenses.filter((e) => e.paid).reduce((a, b) => a + (Number(b.amount) || 0), 0),
    [expenses]
  );

  const totalPendente = useMemo(
    () => expenses.filter((e) => !e.paid).reduce((a, b) => a + (Number(b.amount) || 0), 0),
    [expenses]
  );

  const totalVencendoHojeOuVencidas = useMemo(
    () =>
      expenses
        .filter((e) => {
          if (e.paid || !e.dueDate) return false;
          const status = getDueDateStatus(e.dueDate, e.paid);
          return status.isOverdue || status.isToday;
        })
        .reduce((a, b) => a + (Number(b.amount) || 0), 0),
    [expenses]
  );

  const totalRecorrentes = useMemo(
    () => expenses.filter((e) => e.is_recurring).reduce((a, b) => a + (Number(b.amount) || 0), 0),
    [expenses]
  );

  // ABRIR LINHA DE NOVA DESPESA (INLINE - SEM MODAL)
  const handleOpenInlineNew = () => {
    setIsAddingInline(true);
    setEditingId(null);
    setNewDesc("");
    setNewAmount("");
    // Se o mês selecionado não for o atual, preenche com o dia 10 ou hoje do mês
    const today = new Date().toISOString().split("T")[0];
    if (today.startsWith(month)) {
      setNewDueDate(today);
    } else {
      setNewDueDate(`${month}-10`);
    }
    setNewPaid(false);
    setNewIsRecurring(false);
    setNewReminderAlarm(true);
    setNewReminderTime("09:00");
  };

  const handleCancelInlineNew = () => {
    setIsAddingInline(false);
    setNewDesc("");
    setNewAmount("");
    setSavingInline(false);
  };

  // SALVAR NOVA DESPESA INLINE
  async function handleSaveInlineNew(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!newDesc.trim()) {
      alert("Por favor, informe a descrição da despesa.");
      newDescInputRef.current?.focus();
      return;
    }

    if (!newDueDate) {
      alert("Por favor, selecione a data de vencimento.");
      return;
    }

    setSavingInline(true);
    const parsedAmount = Number(String(newAmount).replace(/\./g, "").replace(",", ".") || 0);

    const fullPayload: any = {
      description: newDesc.trim(),
      amount: parsedAmount,
      due_date: newDueDate,
      paid: newPaid,
      is_recurring: newIsRecurring,
      recurring_frequency: "MONTHLY",
      reminder_alarm: newReminderAlarm,
      reminder_time: newReminderTime || "09:00",
    };

    try {
      let createdId: string | null = null;
      const { data, error } = await supabase.from("expenses").insert(fullPayload).select("id").maybeSingle();

      if (error) {
        // Fallback caso colunas novas ainda não estejam sincronizadas no banco
        console.warn("Tentando fallback de colunas básicas:", error.message);
        const basicPayload = {
          description: newDesc.trim(),
          amount: parsedAmount,
          due_date: newDueDate,
          paid: newPaid,
        };
        const { data: bData, error: bError } = await supabase.from("expenses").insert(basicPayload).select("id").maybeSingle();
        if (bError) throw bError;
        if (bData?.id) createdId = bData.id;
      } else if (data?.id) {
        createdId = data.id;
      }

      if (createdId) {
        saveMetaLocal(createdId, {
          is_recurring: newIsRecurring,
          reminder_alarm: newReminderAlarm,
          reminder_time: newReminderTime,
        });
      }

      // Limpa formulário e fecha inline
      setIsAddingInline(false);
      setNewDesc("");
      setNewAmount("");
      await loadExpenses();
    } catch (err: any) {
      alert(err?.message || "Erro ao salvar a despesa.");
    } finally {
      setSavingInline(false);
    }
  }

  // INLINE EDITING
  const startEditInline = (ex: ExpenseUI) => {
    setIsAddingInline(false);
    setEditingId(ex.id);
    setEditDesc(ex.description);
    setEditAmount(String(ex.amount).replace(".", ","));
    setEditDueDate(ex.dueDate);
    setEditPaid(ex.paid);
    setEditIsRecurring(!!ex.is_recurring);
    setEditReminderAlarm(ex.reminder_alarm !== false);
    setEditReminderTime(ex.reminder_time || "09:00");
  };

  const cancelEditInline = () => {
    setEditingId(null);
    setSavingEdit(false);
  };

  async function handleSaveEditInline(id: string) {
    if (!editDesc.trim() || !editDueDate) {
      alert("Preencha a descrição e a data de vencimento.");
      return;
    }

    setSavingEdit(true);
    const parsedAmount = Number(String(editAmount).replace(/\./g, "").replace(",", ".") || 0);

    const fullPayload: any = {
      description: editDesc.trim(),
      amount: parsedAmount,
      due_date: editDueDate,
      paid: editPaid,
      is_recurring: editIsRecurring,
      recurring_frequency: "MONTHLY",
      reminder_alarm: editReminderAlarm,
      reminder_time: editReminderTime || "09:00",
    };

    try {
      const { error } = await supabase.from("expenses").update(fullPayload).eq("id", id);
      if (error) {
        // Fallback para colunas básicas
        const basicPayload = {
          description: editDesc.trim(),
          amount: parsedAmount,
          due_date: editDueDate,
          paid: editPaid,
        };
        const { error: bError } = await supabase.from("expenses").update(basicPayload).eq("id", id);
        if (bError) throw bError;
      }

      saveMetaLocal(id, {
        is_recurring: editIsRecurring,
        reminder_alarm: editReminderAlarm,
        reminder_time: editReminderTime,
      });

      setEditingId(null);
      await loadExpenses();
    } catch (err: any) {
      alert(err?.message || "Erro ao atualizar a despesa.");
    } finally {
      setSavingEdit(false);
    }
  }

  // Alternância rápida de Pago diretamente na linha
  async function togglePaidQuick(e: ExpenseUI) {
    const nextPaid = !e.paid;
    setExpenses((prev) => prev.map((item) => (item.id === e.id ? { ...item, paid: nextPaid } : item)));

    try {
      await supabase.from("expenses").update({ paid: nextPaid }).eq("id", e.id);
      // Re-sincroniza alarmes (se foi paga, desativa o alarme; se desmarcou, reativa)
      syncAlarmsWithExpenses(expenses.map((item) => (item.id === e.id ? { ...item, paid: nextPaid } : item)));
    } catch (err) {
      console.error("Erro ao alternar status de pagamento:", err);
      await loadExpenses();
    }
  }

  // Alternância rápida de Despertador diretamente na linha
  async function toggleAlarmQuick(e: ExpenseUI) {
    const nextAlarm = !e.reminder_alarm;
    setExpenses((prev) =>
      prev.map((item) => (item.id === e.id ? { ...item, reminder_alarm: nextAlarm } : item))
    );

    saveMetaLocal(e.id, { reminder_alarm: nextAlarm });

    try {
      await supabase.from("expenses").update({ reminder_alarm: nextAlarm }).eq("id", e.id);
      syncAlarmsWithExpenses(
        expenses.map((item) => (item.id === e.id ? { ...item, reminder_alarm: nextAlarm } : item))
      );
    } catch (err) {
      // Ignora erro se coluna não existir no DB
    }
  }

  // Alternância rápida de Recorrência diretamente na linha
  async function toggleRecurringQuick(e: ExpenseUI) {
    const nextRecurring = !e.is_recurring;
    setExpenses((prev) =>
      prev.map((item) => (item.id === e.id ? { ...item, is_recurring: nextRecurring } : item))
    );

    saveMetaLocal(e.id, { is_recurring: nextRecurring });

    try {
      await supabase.from("expenses").update({ is_recurring: nextRecurring }).eq("id", e.id);
    } catch (err) {
      // Ignora erro se coluna não existir no DB
    }
  }

  // Importar / Duplicar despesas recorrentes do mês anterior para o mês atual
  async function handleImportRecurringExpenses() {
    if (tab === "trash") return;
    setLoading(true);
    try {
      // Busca despesas marcadas como recorrentes
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("is_recurring", true)
        .is("deleted_at", null);

      if (error) throw error;

      const recurringList = (data as any[]) || [];
      if (recurringList.length === 0) {
        alert("Nenhuma despesa recorrente encontrada para replicar.");
        setLoading(false);
        return;
      }

      // Agrupa por descrição única para não duplicar no mesmo mês
      const currentDescriptions = new Set(expenses.map((e) => e.description.toLowerCase().trim()));
      const toInsert: any[] = [];

      recurringList.forEach((rec) => {
        if (!currentDescriptions.has(rec.description.toLowerCase().trim())) {
          // Extrai o dia original do vencimento
          let day = "10";
          if (rec.due_date) {
            const p = rec.due_date.split("-");
            if (p.length === 3) day = p[2];
          }
          const targetDueDate = `${month}-${day.padStart(2, "0")}`;

          toInsert.push({
            description: rec.description,
            amount: rec.amount,
            due_date: targetDueDate,
            paid: false,
            is_recurring: true,
            recurring_frequency: "MONTHLY",
            reminder_alarm: rec.reminder_alarm ?? true,
            reminder_time: rec.reminder_time || "09:00",
          });
        }
      });

      if (toInsert.length === 0) {
        alert("Todas as despesas recorrentes já constam no mês atual!");
        setLoading(false);
        return;
      }

      const { error: insErr } = await supabase.from("expenses").insert(toInsert);
      if (insErr) throw insErr;

      await loadExpenses();
      alert(`${toInsert.length} despesa(s) recorrente(s) importada(s) com sucesso para ${month.replace("-", "/")}!`);
    } catch (err: any) {
      alert(err?.message || "Erro ao importar despesas recorrentes.");
    } finally {
      setLoading(false);
    }
  }

  async function softDeleteExpense(id: string) {
    try {
      await softDeleteApi("expenses", id);
      await loadExpenses();
    } catch (e: any) {
      alert(e?.message || "Erro ao mover para a lixeira.");
    }
  }

  async function restoreExpense(id: string) {
    try {
      await restoreApi("expenses", id);
      await loadExpenses();
    } catch (e: any) {
      alert(e?.message || "Erro ao restaurar despesa.");
    }
  }

  async function hardDelete() {
    if (!deleteConfirmId) return;
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", deleteConfirmId);
      if (error) throw error;
      setDeleteConfirmId(null);
      await loadExpenses();
    } catch (e: any) {
      alert(e?.message || "Erro ao excluir definitivamente.");
    }
  }

  return (
    <Page
      title="Despesas"
      actions={
        <div className="flex items-center gap-2">
          {tab !== "trash" && (
            <button
              className="gm-btn gm-btn-outline text-xs sm:text-sm font-bold shadow-none border-white/10 hover:border-white/20 flex items-center gap-1.5"
              type="button"
              onClick={handleImportRecurringExpenses}
              title="Copiar despesas recorrentes cadastradas para este mês"
            >
              <Repeat size={15} className="text-[var(--gm-primary)]" />
              <span className="hidden sm:inline">Importar</span> Recorrentes
            </button>
          )}

          <button
            className={`gm-btn shadow-none flex items-center gap-2 font-bold ${
              isAddingInline ? "bg-white/20 text-white border-white/20" : ""
            }`}
            type="button"
            onClick={() => {
              if (isAddingInline) {
                handleCancelInlineNew();
              } else {
                handleOpenInlineNew();
              }
            }}
          >
            {isAddingInline ? <X size={16} /> : <Plus size={16} />}
            <span>{isAddingInline ? "Fechar Inserção" : "Nova Despesa"}</span>
          </button>
        </div>
      }
    >
      {/* BARRA SUPERIOR DE FILTRO E RESUMO FINANCEIRO */}
      <div className="gm-card fora p-4 sm:p-5 rounded-2xl border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-2xl mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Seletor de Mês */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-300 shrink-0 backdrop-blur-md">
              <Calendar size={18} />
            </div>
            <input
              className="gm-input shadow-none bg-white/[0.04] backdrop-blur-md border-white/10 font-bold text-sm h-10 cursor-pointer rounded-xl px-3 text-white"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{ maxWidth: 180 }}
            />
          </div>

          {/* Abas de Visualização */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl barra border border-white/10 shadow-none overflow-x-auto bg-white/[0.02] backdrop-blur-xl">
            <button
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-none ${
                tab === "active"
                  ? "bg-white/15 text-white font-black"
                  : "text-slate-400 hover:text-white"
              }`}
              onClick={() => setTab("active")}
            >
              Todas do Mês
            </button>

            <button
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-none flex items-center gap-1.5 ${
                tab === "recurring"
                  ? "bg-[var(--gm-primary)]/20 border border-[var(--gm-primary)]/40 text-[var(--gm-primary)] font-black"
                  : "text-slate-400 hover:text-white"
              }`}
              onClick={() => setTab("recurring")}
            >
              <Repeat size={13} />
              Recorrentes
            </button>

            <button
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all whitespace-nowrap shadow-none border ${
                tab === "trash"
                  ? "bg-[var(--gm-primary)]/20 border-[var(--gm-primary)]/40 text-[var(--gm-primary)]"
                  : "bg-transparent border-transparent text-slate-400 hover:text-[var(--gm-primary)]"
              }`}
              onClick={() => setTab("trash")}
            >
              Lixeira
            </button>
          </div>
        </div>

        {/* Pílulas de Resumo com Alertas de Vencimento e Recorrência */}
        <div className="mt-4 flex gap-2.5 flex-wrap items-center">
          <div className="gm-pill-neon-green shadow-none border border-emerald-500/20 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
            <Check size={14} className="text-emerald-400" />
            <span>Pago: {CURRENCY_FORMATTER.format(totalPago)}</span>
          </div>

          <div className="gm-pill-neon-red shadow-none border border-red-500/20 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
            <Clock size={14} className="text-red-400" />
            <span>Pendente: {CURRENCY_FORMATTER.format(totalPendente)}</span>
          </div>

          {totalVencendoHojeOuVencidas > 0 && (
            <div className="py-1.5 px-3 rounded-xl text-xs font-black bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 backdrop-blur-md animate-pulse">
              <AlertTriangle size={14} className="text-amber-400" />
              <span>Vencendo / Vencidas: {CURRENCY_FORMATTER.format(totalVencendoHojeOuVencidas)}</span>
            </div>
          )}

          {totalRecorrentes > 0 && (
            <div className="py-1.5 px-3 rounded-xl text-xs font-bold bg-white/[0.04] text-slate-300 border border-white/10 flex items-center gap-1.5 backdrop-blur-md">
              <Repeat size={13} className="text-[var(--gm-primary)]" />
              <span>Fixas/Recorrentes: {CURRENCY_FORMATTER.format(totalRecorrentes)}</span>
            </div>
          )}

          <button
            type="button"
            className="gm-btn gm-btn-outline text-xs h-8 px-3 ml-auto shadow-none border-white/10 hover:border-white/20 flex items-center gap-1.5 bg-white/[0.03] backdrop-blur-md"
            onClick={() => loadExpenses()}
            title="Recarregar"
          >
            <RotateCcw size={14} />
            Atualizar
          </button>
        </div>
      </div>

      {/* TABELA / LISTA PRINCIPAL DE DESPESAS */}
      <div className="gm-card barra !p-0 overflow-hidden flex flex-col transition-all duration-300 rounded-2xl border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-2xl mb-24">
        {/* CABEÇALHO DA TABELA (DESKTOP) */}
        <div className="hidden sm:grid grid-cols-[140px_1fr_140px_170px] gap-4 px-5 py-3.5 border-b border-white/10 font-black opacity-85 uppercase tracking-wider text-xs bg-white/[0.045] backdrop-blur-xl shrink-0 shadow-sm items-center">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-400" />
            <span>Vencimento</span>
          </div>
          <div>Descrição da Despesa</div>
          <div className="text-right">Valor (R$)</div>
          <div className="text-right pr-2">Ações & Status</div>
        </div>

        {/* ========================================================================= */}
        {/* LINHA DE INSERÇÃO VAZIA INLINE (NOVA DESPESA - NÃO ABRE MODAL!)           */}
        {/* ========================================================================= */}
        {isAddingInline && (
          <form
            onSubmit={handleSaveInlineNew}
            className="p-4 sm:px-5 sm:py-3.5 bg-[var(--gm-primary)]/[0.08] backdrop-blur-xl border-b border-[var(--gm-primary)]/40 transition-all animate-fade-in flex flex-col gap-3 relative z-10"
          >
            {/* LINHA 1: CAMPOS PRINCIPAIS ALINHADOS 1-A-1 COM O CABEÇALHO */}
            <div className="flex flex-col sm:grid sm:grid-cols-[140px_1fr_140px_170px] gap-3 sm:gap-4 sm:items-center">
              {/* 1. CAMPO DATA */}
              <div>
                <label className="sm:hidden text-[10px] font-black uppercase text-slate-400 mb-1 block">
                  Data Vencimento
                </label>
                <GlassDatePicker
                  className="w-full h-10 bg-black/40 backdrop-blur-md border border-white/20 rounded-xl text-xs text-white font-mono px-3.5 flex items-center justify-between focus:border-[var(--gm-primary)] hover:border-white/40 transition-all cursor-pointer"
                  value={newDueDate}
                  onChange={setNewDueDate}
                  title="Data de Vencimento"
                />
              </div>

              {/* 2. CAMPO DESCRIÇÃO */}
              <div>
                <label className="sm:hidden text-[10px] font-black uppercase text-slate-400 mb-1 block">
                  Descrição da Despesa
                </label>
                <input
                  ref={newDescInputRef}
                  className="gm-input w-full bg-black/40 backdrop-blur-md border-white/20 text-sm font-bold text-white placeholder-slate-500 h-10 px-3.5 rounded-xl focus:border-[var(--gm-primary)]"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Ex: Conta de Luz, Aluguel, Fornecedor..."
                  onKeyDown={(e) => {
                    if (e.key === "Escape") handleCancelInlineNew();
                  }}
                />
              </div>

              {/* 3. CAMPO VALOR */}
              <div>
                <label className="sm:hidden text-[10px] font-black uppercase text-slate-400 mb-1 block">
                  Valor (R$)
                </label>
                <div className="relative w-full">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 pointer-events-none select-none">
                    R$
                  </span>
                  <input
                    className="gm-input w-full bg-black/40 backdrop-blur-md border-white/20 text-sm sm:text-base font-extrabold text-white font-mono h-10 pl-9 pr-3 rounded-xl focus:border-[var(--gm-primary)] sm:text-right"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0,00"
                    inputMode="decimal"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") handleCancelInlineNew();
                    }}
                  />
                </div>
              </div>

              {/* 4. AÇÕES: SOMENTE BOTÃO SALVAR (CANCELAMENTO FEITO VIA 'FECHAR INSERÇÃO' NO TOPO) */}
              <div className="flex items-center justify-end pt-1 sm:pt-0 w-full">
                <button
                  type="submit"
                  disabled={savingInline}
                  className="gm-btn w-full sm:w-auto h-10 px-5 text-xs font-black rounded-xl bg-[var(--gm-primary)] hover:brightness-110 text-white flex items-center justify-center gap-1.5 shadow-md shrink-0 cursor-pointer"
                  title="Salvar Despesa (Enter)"
                >
                  {savingInline ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Salvar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* LINHA 2: OPÇÕES RÁPIDAS (CÁPSULAS COM MESMO TAMANHO E PADRÃO) */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Toggle Já está pago */}
                <label className={`h-10 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer select-none backdrop-blur-md ${
                  newPaid 
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm" 
                    : "bg-black/40 text-slate-300 border-white/20 hover:border-white/40 hover:text-white"
                }`}>
                  <input
                    type="checkbox"
                    checked={newPaid}
                    onChange={(e) => setNewPaid(e.target.checked)}
                    className="w-4 h-4 rounded accent-[var(--gm-primary)] cursor-pointer"
                  />
                  <span>Já está pago</span>
                </label>

                {/* Toggle Despesa Fixa / Recorrente */}
                <button
                  type="button"
                  onClick={() => setNewIsRecurring(!newIsRecurring)}
                  className={`h-10 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer select-none backdrop-blur-md ${
                    newIsRecurring
                      ? "bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] border-[var(--gm-primary)]/50 shadow-sm"
                      : "bg-black/40 text-slate-300 border-white/20 hover:text-white hover:border-white/40"
                  }`}
                  title={newIsRecurring ? "Despesa Fixa Ativa (Mensal)" : "Tornar Despesa Fixa/Recorrente"}
                >
                  <Repeat size={14} />
                  <span>Despesa Fixa (Recorrente)</span>
                </button>

                {/* Toggle Despertador / Alarme */}
                <button
                  type="button"
                  onClick={() => setNewReminderAlarm(!newReminderAlarm)}
                  className={`h-10 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer select-none backdrop-blur-md ${
                    newReminderAlarm
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
                      : "bg-black/40 text-slate-300 border-white/20 hover:text-white hover:border-white/40"
                  }`}
                  title={newReminderAlarm ? `Despertador Ativo às ${newReminderTime}` : "Ativar Despertador no Vencimento"}
                >
                  {newReminderAlarm ? <Bell size={14} className="text-amber-400" /> : <BellOff size={14} />}
                  <span>Despertador</span>
                </button>

                {/* Configuração do Horário do Despertador quando ativo (Caixa de hora em amarelo escuro dentro da cápsula) */}
                {newReminderAlarm && (
                  <div className="h-10 px-3.5 rounded-xl border border-amber-500/50 bg-amber-500/20 backdrop-blur-md text-amber-300 text-xs font-mono font-bold flex items-center gap-2 animate-fade-in">
                    <Clock size={14} className="text-amber-400 shrink-0" />
                    <span>Tocar às:</span>
                    <input
                      type="time"
                      value={newReminderTime}
                      onChange={(e) => setNewReminderTime(e.target.value)}
                      className="bg-amber-950/80 border border-amber-500/50 text-amber-200 focus:border-amber-400 focus:bg-amber-900/90 rounded-lg px-2 py-0.5 text-xs font-mono font-bold focus:outline-none cursor-pointer h-7 shadow-inner"
                    />
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-400 hidden lg:flex items-center gap-1.5 font-medium">
                <span>Pressione</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] border border-white/15">Enter</kbd>
                <span>para salvar ou</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] border border-white/15">Esc</kbd>
                <span>para cancelar</span>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* LISTAGEM DE DESPESAS COM EDIÇÃO INLINE E SINALIZAÇÃO DE VENCIMENTO        */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[680px] gm-scrollable">
          {loading ? (
            <div className="p-12 text-center opacity-60">
              <div className="w-6 h-6 border-2 border-[var(--gm-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-sm font-medium text-slate-300">Carregando despesas...</span>
            </div>
          ) : expenses.length === 0 && !isAddingInline ? (
            <div className="p-12 text-center opacity-70 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-slate-400">
                <CalendarDays size={26} />
              </div>
              <div className="text-base font-bold text-white">Nenhuma despesa cadastrada</div>
              <div className="text-xs text-slate-400 mt-1 max-w-sm">
                Não há despesas registradas para {month.replace("-", "/")}. Clique em "Nova Despesa" para adicionar diretamente na lista.
              </div>
              <button
                onClick={handleOpenInlineNew}
                type="button"
                className="gm-btn mt-4 text-xs font-bold py-2 px-4 shadow-none flex items-center gap-2"
              >
                <Plus size={15} /> Inserir Despesa Agora
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {expenses.map((e) => {
                const isEditing = editingId === e.id;
                const status = getDueDateStatus(e.dueDate, e.paid);

                // MODO EDIÇÃO INLINE DA LINHA EXISTENTE
                if (isEditing) {
                  return (
                    <div
                      key={e.id}
                      className="p-4 sm:px-5 sm:py-3.5 bg-white/[0.03] backdrop-blur-xl border-l-4 border-[var(--gm-primary)] flex flex-col gap-3 transition-colors"
                    >
                      {/* LINHA 1: INPUTS ALINHADOS COM O GRID DA TABELA */}
                      <div className="flex flex-col sm:grid sm:grid-cols-[140px_1fr_140px_170px] gap-3 sm:gap-4 sm:items-center">
                        {/* Data Edit */}
                        <div>
                          <GlassDatePicker
                            className="w-full h-10 bg-black/40 backdrop-blur-md border border-white/20 rounded-xl text-xs text-white font-mono px-3.5 flex items-center justify-between focus:border-[var(--gm-primary)] hover:border-white/40 cursor-pointer"
                            value={editDueDate}
                            onChange={setEditDueDate}
                            title="Data de Vencimento"
                          />
                        </div>

                        {/* Descrição Edit */}
                        <div>
                          <input
                            className="gm-input w-full bg-black/40 backdrop-blur-md border-white/20 text-sm font-bold text-white h-10 px-3.5 rounded-xl focus:border-[var(--gm-primary)]"
                            value={editDesc}
                            onChange={(ev) => setEditDesc(ev.target.value)}
                            placeholder="Descrição..."
                          />
                        </div>

                        {/* Valor Edit */}
                        <div>
                          <div className="relative w-full">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 pointer-events-none select-none">
                              R$
                            </span>
                            <input
                              className="gm-input w-full bg-black/40 backdrop-blur-md border-white/20 text-sm sm:text-base font-extrabold text-white font-mono h-10 pl-9 pr-3 rounded-xl focus:border-[var(--gm-primary)] sm:text-right"
                              value={editAmount}
                              onChange={(ev) => setEditAmount(ev.target.value)}
                              placeholder="0,00"
                              inputMode="decimal"
                            />
                          </div>
                        </div>

                        {/* Ações Edit (Separadas do campo de valor) */}
                        <div className="flex items-center justify-end gap-2 w-full">
                          <button
                            type="button"
                            onClick={cancelEditInline}
                            className="gm-btn gm-btn-outline h-10 px-3 text-xs font-bold rounded-xl border-white/20 hover:border-white/40 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 shrink-0 bg-white/[0.03] backdrop-blur-md"
                            title="Cancelar"
                          >
                            <X size={15} />
                            <span>Cancelar</span>
                          </button>
                          <button
                            type="button"
                            disabled={savingEdit}
                            onClick={() => handleSaveEditInline(e.id)}
                            className="gm-btn h-10 px-4 text-xs font-black rounded-xl bg-[var(--gm-primary)] hover:brightness-110 text-white flex items-center justify-center gap-1.5 shadow-md shrink-0 cursor-pointer"
                            title="Salvar alterações"
                          >
                            {savingEdit ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <Save size={15} />
                                <span>Salvar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* LINHA 2: OPÇÕES DA EDIÇÃO INLINE (CÁPSULAS COM MESMO PADRÃO E TAMANHO) */}
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {/* Toggle Pago */}
                          <label className={`h-10 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer select-none backdrop-blur-md ${
                            editPaid
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm"
                              : "bg-black/40 text-slate-300 border-white/20 hover:border-white/40 hover:text-white"
                          }`}>
                            <input
                              type="checkbox"
                              checked={editPaid}
                              onChange={(ev) => setEditPaid(ev.target.checked)}
                              className="w-4 h-4 rounded accent-[var(--gm-primary)] cursor-pointer"
                            />
                            <span>Marcado como Pago</span>
                          </label>

                          {/* Toggle Fixa */}
                          <button
                            type="button"
                            onClick={() => setEditIsRecurring(!editIsRecurring)}
                            className={`h-10 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer select-none backdrop-blur-md ${
                              editIsRecurring
                                ? "bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] border-[var(--gm-primary)]/50 shadow-sm"
                                : "bg-black/40 text-slate-300 border-white/20 hover:text-white hover:border-white/40"
                            }`}
                          >
                            <Repeat size={14} />
                            <span>Despesa Fixa</span>
                          </button>

                          {/* Toggle Despertador */}
                          <button
                            type="button"
                            onClick={() => setEditReminderAlarm(!editReminderAlarm)}
                            className={`h-10 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer select-none backdrop-blur-md ${
                              editReminderAlarm
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
                                : "bg-black/40 text-slate-300 border-white/20 hover:text-white hover:border-white/40"
                            }`}
                          >
                            {editReminderAlarm ? <Bell size={14} className="text-amber-400" /> : <BellOff size={14} />}
                            <span>Despertador</span>
                          </button>

                          {/* Horário (Caixa de hora em amarelo escuro dentro da cápsula) */}
                          {editReminderAlarm && (
                            <div className="h-10 px-3.5 rounded-xl border border-amber-500/50 bg-amber-500/20 backdrop-blur-md text-amber-300 text-xs font-mono font-bold flex items-center gap-2 animate-fade-in">
                              <Clock size={14} className="text-amber-400 shrink-0" />
                              <span>Tocar às:</span>
                              <input
                                type="time"
                                value={editReminderTime}
                                onChange={(ev) => setEditReminderTime(ev.target.value)}
                                className="bg-amber-950/80 border border-amber-500/50 text-amber-200 focus:border-amber-400 focus:bg-amber-900/90 rounded-lg px-2 py-0.5 text-xs font-mono font-bold focus:outline-none cursor-pointer h-7 shadow-inner"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // MODO EXIBIÇÃO NORMAL DA LINHA (COM SINALIZADORES DE VENCIMENTO E DESPERTADOR)
                return (
                  <div
                    key={e.id}
                    className={`p-4 sm:px-5 sm:py-3.5 flex flex-col sm:grid sm:grid-cols-[140px_1fr_140px_170px] sm:items-center gap-3 sm:gap-4 transition-colors ${
                      status.isToday
                        ? "bg-amber-500/[0.07] hover:bg-amber-500/[0.12] border-l-4 border-amber-500"
                        : status.isOverdue
                        ? "bg-red-500/[0.05] hover:bg-red-500/[0.09] border-l-4 border-red-500/60"
                        : e.paid
                        ? "hover:bg-white/[0.03] opacity-80"
                        : "hover:bg-white/[0.04]"
                    }`}
                  >
                    {/* COLUNA 1: DATA E SINALIZAÇÃO DE VENCIMENTO */}
                    <div className="flex flex-col gap-1">
                      <div className="text-xs text-slate-300 flex items-center gap-1.5 font-mono font-bold">
                        <Calendar size={13} className="text-slate-500 shrink-0" />
                        <span>{e.dueDate ? new Date(e.dueDate + "T00:00:00").toLocaleDateString("pt-BR") : "-"}</span>
                      </div>

                      {/* Badge de status do vencimento */}
                      <div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider border ${status.colorClass}`}>
                          {status.isToday && <AlertTriangle size={10} className="text-amber-400" />}
                          {status.isOverdue && <Clock size={10} className="text-red-400" />}
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {/* COLUNA 2: DESCRIÇÃO + BADGES (RECORRENTE / DESPERTADOR) */}
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          onClick={() => togglePaidQuick(e)}
                          className={`font-bold text-sm sm:text-base cursor-pointer hover:underline truncate ${
                            e.paid ? "line-through text-slate-400 font-medium" : "text-white"
                          }`}
                          title="Clique para alternar pago/pendente"
                        >
                          {e.description}
                        </span>

                        {/* Badge de Despesa Recorrente */}
                        {e.is_recurring && (
                          <button
                            type="button"
                            onClick={() => toggleRecurringQuick(e)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] border border-[var(--gm-primary)]/40 hover:brightness-110 transition-all shrink-0"
                            title="Despesa Recorrente (Mensal) - Clique para alternar"
                          >
                            <Repeat size={10} />
                            <span>Recorrente</span>
                          </button>
                        )}

                        {/* Badge de Despertador de Lembrete Ativo */}
                        {e.reminder_alarm !== false && !e.paid && (
                          <button
                            type="button"
                            onClick={() => toggleAlarmQuick(e)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono text-amber-300 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition-all shrink-0"
                            title={`Despertador ativo às ${e.reminder_time || "09:00"} - Clique para desativar`}
                          >
                            <Bell size={10} className="text-amber-400 animate-pulse" />
                            <span>{e.reminder_time || "09:00"}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* COLUNA 3: VALOR */}
                    <div
                      className={`text-base font-black sm:text-right font-mono ${
                        e.paid ? "text-emerald-400" : status.isOverdue || status.isToday ? "text-amber-400" : "text-white"
                      }`}
                    >
                      {CURRENCY_FORMATTER.format(e.amount)}
                    </div>

                    {/* COLUNA 4: AÇÕES COM MESMO PADRÃO E ESTILO */}
                    <div className="flex items-center justify-end gap-2">
                      {/* Botão de rápido Pago / Não Pago (Verificado) */}
                      <button
                        className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all shrink-0 border border-white/10 ${
                          e.paid
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30 shadow-sm"
                            : "bg-white/5 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/10"
                        }`}
                        onClick={() => togglePaidQuick(e)}
                        title={e.paid ? "Marcado como Pago (Clique para desmarcar)" : "Marcar como Pago"}
                      >
                        <Check size={16} />
                      </button>

                      {/* Botão de Editar Inline */}
                      <button
                        className="h-9 w-9 rounded-xl flex items-center justify-center transition-all shrink-0 border border-white/10 hover:border-[var(--gm-primary)]/40 bg-white/5 text-[var(--gm-primary)] hover:bg-[var(--gm-primary)]/10 shadow-none"
                        onClick={() => startEditInline(e)}
                        title="Editar Despesa na linha"
                      >
                        <Pencil size={15} />
                      </button>

                      {/* Botão de Lixeira / Exclusão */}
                      {tab === "active" || tab === "recurring" ? (
                        <button
                          className="h-9 w-9 rounded-xl flex items-center justify-center transition-all shrink-0 border border-white/10 hover:border-red-500/40 bg-white/5 text-red-400 hover:bg-red-500/10 hover:text-red-300 shadow-none"
                          onClick={() => softDeleteExpense(e.id)}
                          title="Mover para lixeira"
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        <>
                          <button
                            className="h-9 w-9 rounded-xl flex items-center justify-center transition-all shrink-0 border border-white/10 hover:border-amber-500/40 bg-white/5 text-amber-400 hover:bg-amber-500/10 shadow-none"
                            onClick={() => restoreExpense(e.id)}
                            title="Restaurar"
                          >
                            <RotateCcw size={15} />
                          </button>
                          <button
                            className="h-9 w-9 rounded-xl flex items-center justify-center transition-all shrink-0 border border-white/10 hover:border-red-500/40 bg-white/5 text-red-400 hover:bg-red-500/10 shadow-none"
                            onClick={() => setDeleteConfirmId(e.id)}
                            title="Excluir definitivo"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMAÇÃO DE EXCLUSÃO DEFINITIVA */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="gm-card fora w-full max-w-sm rounded-[24px] overflow-hidden border border-white/12 shadow-none relative z-10 animate-fade-in p-0"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="p-7 text-center">
              <div className="w-16 h-16 bg-[var(--gm-primary)]/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-[var(--gm-primary)]/20 shadow-none">
                <Trash2 size={28} className="text-[var(--gm-primary)]" />
              </div>
              <h3 className="text-2xl font-extrabold text-white mb-2.5">Excluir Definitivamente?</h3>
              <p className="text-slate-300 text-base mb-6 leading-relaxed">
                Esta ação não pode ser desfeita. A despesa será removida permanentemente do sistema.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="gm-btn gm-btn-outline flex-1 h-11 rounded-xl text-xs uppercase tracking-widest font-black shadow-none border-white/10 hover:border-white/20"
                >
                  Cancelar
                </button>
                <button
                  onClick={hardDelete}
                  className="gm-btn flex-1 h-11 rounded-xl text-xs uppercase tracking-widest font-black shadow-none"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
