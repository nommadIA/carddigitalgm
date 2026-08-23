import React, { useEffect, useMemo, useState } from "react";
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
  Share2,
  Copy,
  CheckCircle2,
  Repeat,
  Bell,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { GlassDatePicker } from "../components/ui/GlassDatePicker";
import { GlassTimePicker } from "../components/ui/GlassTimePicker";
import { addAlarmsForBudget, removeAlarmsForBudget } from "../lib/alarmSystem";
import { motion, AnimatePresence } from "motion/react";

const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type ExpenseRow = {
  id: string;
  description: string;
  amount: number;
  due_date: string | null;
  paid: boolean;
  deleted_at?: string | null;
  created_at?: string;
  tenant_id?: string | null;
  user_id?: string | null;
  is_recurring?: boolean | null;
  reminder_time?: string | null;
};

type ExpenseUI = {
  id: string;
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  paid: boolean;
  deleted_at?: string | null;
  isRecurring?: boolean;
  reminderTime?: string;
  reminderDate?: string;
};

function monthRange(monthYYYYMM: string) {
  const [yStr, mStr] = monthYYYYMM.split("-");
  const y = Number(yStr);
  const m = Number(mStr); // 1..12

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

export default function Expenses() {
  const [expenses, setExpenses] = useState<ExpenseUI[]>([]);
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [tab, setTab] = useState<"active" | "recurring" | "trash">("active");

  // Inline Notion-style expanded row ID
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Edit State for expanded row or new item
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPaid, setEditPaid] = useState(false);
  const [editIsRecurring, setEditIsRecurring] = useState(false);
  const [editReminderEnabled, setEditReminderEnabled] = useState(false);
  const [editReminderDate, setEditReminderDate] = useState("");
  const [editReminderTime, setEditReminderTime] = useState("");
  const [isSavingInline, setIsSavingInline] = useState(false);

  // Modal for creating new expense
  const [showNewModal, setShowNewModal] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [newPaid, setNewPaid] = useState(false);
  const [newIsRecurring, setNewIsRecurring] = useState(false);
  const [newReminderEnabled, setNewReminderEnabled] = useState(false);
  const [newReminderDate, setNewReminderDate] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("09:00");

  // Share report modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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
            setExpandedRowId(id);
          }
        });
    }
  }, [location.search]);

  async function loadExpenses() {
    setLoading(true);
    try {
      const { startISO, nextISO } = monthRange(month);

      let q = supabase
        .from("expenses")
        .select("*")
        .order("due_date", { ascending: false });

      if (tab === "active") {
        q = q.is("deleted_at", null).gte("due_date", startISO).lt("due_date", nextISO);
      } else if (tab === "trash") {
        q = q.not("deleted_at", "is", null).gte("due_date", startISO).lt("due_date", nextISO);
      } else if (tab === "recurring") {
        q = q.is("deleted_at", null).eq("is_recurring", true);
      }

      const { data, error } = await q;
      if (error) throw error;

      const rows: ExpenseUI[] = ((data as ExpenseRow[]) || []).map((r) => {
        let rDate = "";
        let rTime = "";
        if (r.reminder_time) {
          if (r.reminder_time.includes(" ")) {
            const parts = r.reminder_time.split(" ");
            rDate = parts[0] || "";
            rTime = parts[1] || "";
          } else {
            rTime = r.reminder_time;
          }
        }
        return {
          id: r.id,
          description: r.description,
          amount: Number(r.amount) || 0,
          dueDate: r.due_date ? String(r.due_date) : "",
          paid: !!r.paid,
          deleted_at: r.deleted_at ?? null,
          isRecurring: !!r.is_recurring,
          reminderTime: rTime,
          reminderDate: rDate,
        };
      });

      setExpenses(rows);
    } catch (e) {
      console.error("Error loading expenses:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, tab]);

  const totalPago = useMemo(
    () => expenses.filter((e) => e.paid).reduce((a, b) => a + (Number(b.amount) || 0), 0),
    [expenses]
  );

  const totalPendente = useMemo(
    () => expenses.filter((e) => !e.paid).reduce((a, b) => a + (Number(b.amount) || 0), 0),
    [expenses]
  );

  const totalGeral = useMemo(
    () => expenses.reduce((a, b) => a + (Number(b.amount) || 0), 0),
    [expenses]
  );

  const monthFormatted = useMemo(() => {
    try {
      const [year, m] = month.split("-");
      const date = new Date(Number(year), Number(m) - 1, 1);
      return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    } catch {
      return month;
    }
  }, [month]);

  // Open inline Notion-style editor
  const handleToggleExpand = (ex: ExpenseUI) => {
    if (expandedRowId === ex.id) {
      setExpandedRowId(null);
    } else {
      setExpandedRowId(ex.id);
      setEditDesc(ex.description);
      setEditAmount(String(ex.amount));
      setEditDueDate(ex.dueDate);
      setEditPaid(ex.paid);
      setEditIsRecurring(!!ex.isRecurring);
      setEditReminderEnabled(!!(ex.reminderTime || ex.reminderDate));
      setEditReminderDate(ex.reminderDate || ex.dueDate || "");
      setEditReminderTime(ex.reminderTime || "09:00");
    }
  };

  // Quick toggle paid status
  const handleTogglePaid = async (ex: ExpenseUI, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextPaid = !ex.paid;
    setExpenses((prev) => prev.map((item) => (item.id === ex.id ? { ...item, paid: nextPaid } : item)));

    try {
      await supabase.from("expenses").update({ paid: nextPaid }).eq("id", ex.id);
      showToast(nextPaid ? "Despesa marcada como PAGA!" : "Despesa marcada como PENDENTE!");
    } catch (err) {
      console.error(err);
      loadExpenses();
    }
  };

  // Save inline Notion-style edits
  const handleSaveInline = async (id: string) => {
    if (!editDesc.trim() || !editDueDate) {
      alert("Por favor, preencha a descrição e o vencimento.");
      return;
    }

    setIsSavingInline(true);
    const numAmount = Number(String(editAmount).replace(",", ".") || 0);

    let reminderStr: string | null = null;
    if (editReminderEnabled && editReminderTime) {
      reminderStr = editReminderDate ? `${editReminderDate} ${editReminderTime}` : editReminderTime;
    }

    const payload: any = {
      description: editDesc.trim(),
      amount: numAmount,
      due_date: editDueDate,
      paid: editPaid,
      is_recurring: editIsRecurring,
      reminder_time: reminderStr,
    };

    try {
      let { error } = await supabase.from("expenses").update(payload).eq("id", id);
      if (error && error.code === "42703") {
        // Fallback without new columns if table not migrated yet
        const { is_recurring, reminder_time, ...fallbackPayload } = payload;
        const res = await supabase.from("expenses").update(fallbackPayload).eq("id", id);
        if (res.error) throw res.error;
      } else if (error) {
        throw error;
      }

      // Schedule or remove alarm
      if (editReminderEnabled && editReminderTime) {
        addAlarmsForBudget(id, editDesc.trim(), [editReminderTime], "EXPENSE", undefined, editReminderDate || editDueDate);
      } else {
        removeAlarmsForBudget(id);
      }

      setExpenses((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                description: editDesc.trim(),
                amount: numAmount,
                dueDate: editDueDate,
                paid: editPaid,
                isRecurring: editIsRecurring,
                reminderDate: editReminderDate,
                reminderTime: editReminderTime,
              }
            : item
        )
      );

      setExpandedRowId(null);
      showToast("Despesa atualizada com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar: " + (err?.message || "Ocorreu um erro."));
    } finally {
      setIsSavingInline(false);
    }
  };

  // Create new expense
  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim() || !newDueDate) {
      alert("Por favor, preencha a descrição e o vencimento.");
      return;
    }

    const numAmount = Number(String(newAmount).replace(",", ".") || 0);
    let reminderStr: string | null = null;
    if (newReminderEnabled && newReminderTime) {
      reminderStr = newReminderDate ? `${newReminderDate} ${newReminderTime}` : newReminderTime;
    }

    const payload: any = {
      description: newDesc.trim(),
      amount: numAmount,
      due_date: newDueDate,
      paid: newPaid,
      is_recurring: newIsRecurring,
      reminder_time: reminderStr,
    };

    try {
      let { data, error } = await supabase.from("expenses").insert(payload).select().single();
      if (error && error.code === "42703") {
        const { is_recurring, reminder_time, ...fallbackPayload } = payload;
        const res = await supabase.from("expenses").insert(fallbackPayload).select().single();
        if (res.error) throw res.error;
        data = res.data;
      } else if (error) {
        throw error;
      }

      if (data && newReminderEnabled && newReminderTime) {
        addAlarmsForBudget(data.id, newDesc.trim(), [newReminderTime], "EXPENSE", undefined, newReminderDate || newDueDate);
      }

      setShowNewModal(false);
      setNewDesc("");
      setNewAmount("");
      setNewPaid(false);
      setNewIsRecurring(false);
      setNewReminderEnabled(false);
      showToast("Despesa criada com sucesso!");
      loadExpenses();
    } catch (err: any) {
      alert("Erro ao criar: " + (err?.message || "Ocorreu um erro."));
    }
  };

  // Import recurring expenses to the current selected month
  const handleImportRecurring = async () => {
    try {
      setLoading(true);
      const { data: recurringData, error } = await supabase
        .from("expenses")
        .select("*")
        .is("deleted_at", null)
        .eq("is_recurring", true);

      if (error) throw error;
      if (!recurringData || recurringData.length === 0) {
        alert("Nenhuma despesa marcada como recorrente foi encontrada.");
        return;
      }

      const { startISO } = monthRange(month);
      const [currYear, currMonth] = month.split("-");

      let addedCount = 0;
      for (const rec of recurringData) {
        // Calculate new due date for this month
        let day = "10";
        if (rec.due_date) {
          const parts = rec.due_date.split("-");
          if (parts[2]) day = parts[2];
        }
        const targetDueDate = `${currYear}-${currMonth}-${day.padStart(2, "0")}`;

        // Check if already exists in this month
        const exists = expenses.some(
          (e) => e.description.toLowerCase() === rec.description.toLowerCase() && e.dueDate === targetDueDate
        );

        if (!exists) {
          await supabase.from("expenses").insert({
            description: rec.description,
            amount: rec.amount,
            due_date: targetDueDate,
            paid: false,
            is_recurring: true,
            reminder_time: rec.reminder_time,
          });
          addedCount++;
        }
      }

      showToast(`${addedCount} despesa(s) recorrente(s) importada(s) para ${monthFormatted}!`);
      loadExpenses();
    } catch (err: any) {
      alert("Erro ao importar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate WhatsApp report text
  const generateReportText = () => {
    const lines = [
      `📊 *RELATÓRIO DE DESPESAS - GM EDIFICAÇÃO*`,
      `📅 *Mês de Referência:* ${monthFormatted.toUpperCase()}`,
      `-----------------------------------------`,
      `✅ *Total Pago:* ${CURRENCY_FORMATTER.format(totalPago)}`,
      `⏳ *Total Pendente:* ${CURRENCY_FORMATTER.format(totalPendente)}`,
      `💰 *Total Geral:* ${CURRENCY_FORMATTER.format(totalGeral)}`,
      `📌 *Quantidade:* ${expenses.length} despesa(s)`,
      `-----------------------------------------`,
      `*DETALHAMENTO:*`,
    ];

    if (expenses.length === 0) {
      lines.push(`_Nenhuma despesa registrada neste período._`);
    } else {
      expenses.forEach((e, idx) => {
        const dateStr = e.dueDate ? e.dueDate.split("-").reverse().join("/") : "Sem data";
        const statusStr = e.paid ? "✅ PAGO" : "⏳ PENDENTE";
        lines.push(`${idx + 1}. *${e.description}*`);
        lines.push(`   📅 Vencimento: ${dateStr}`);
        lines.push(`   💵 Valor: ${CURRENCY_FORMATTER.format(e.amount)} [${statusStr}]`);
        if (e.isRecurring) lines.push(`   🔁 Recorrente`);
        lines.push(``);
      });
    }

    lines.push(`-----------------------------------------`);
    lines.push(`Gerado automaticamente pelo Sistema GM Edificação.`);
    return lines.join("\n");
  };

  const handleCopyReport = () => {
    const text = generateReportText();
    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const text = generateReportText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  async function softDeleteExpense(id: string) {
    try {
      await softDeleteApi("expenses", id);
      removeAlarmsForBudget(id);
      showToast("Despesa movida para a lixeira.");
      await loadExpenses();
    } catch (e: any) {
      alert(e?.message || "Erro ao excluir.");
    }
  }

  async function restoreExpense(id: string) {
    try {
      await restoreApi("expenses", id);
      showToast("Despesa restaurada.");
      await loadExpenses();
    } catch (e: any) {
      alert(e?.message || "Erro ao restaurar.");
    }
  }

  async function hardDelete() {
    if (!deleteConfirmId) return;
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", deleteConfirmId);
      if (error) throw error;
      removeAlarmsForBudget(deleteConfirmId);
      setDeleteConfirmId(null);
      showToast("Despesa excluída definitivamente.");
      await loadExpenses();
    } catch (e: any) {
      alert(e?.message || "Erro ao excluir definitivamente.");
    }
  }

  return (
    <Page
      title="Despesas"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95"
            onClick={handleImportRecurring}
            title="Importar despesas recorrentes para este mês"
          >
            <Repeat size={14} className="text-orange-400" />
            <span>Importar Recorrentes</span>
          </button>

          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95"
            onClick={() => setShowShareModal(true)}
            title="Compartilhar Relatório de Despesas"
          >
            <Share2 size={14} className="text-green-400" />
            <span>Compartilhar Relatório</span>
          </button>

          <button
            className="px-5 py-2 rounded-xl bg-[var(--gm-primary)] hover:brightness-110 text-white text-xs font-extrabold transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95"
            type="button"
            onClick={() => setShowNewModal(true)}
          >
            <Plus size={16} />
            <span>Nova Despesa</span>
          </button>
        </div>
      }
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-[10000] bg-[#1a1b1f] border border-orange-500/40 text-white px-5 py-3 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center gap-3 text-sm font-bold"
          >
            <CheckCircle2 size={18} className="text-orange-400 shrink-0 animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP CONTROL CONTAINER: PAGO / PENDENTE / ATUALIZAR / TABS */}
      <div className="gm-card fora p-5 rounded-2xl border border-white/10 shadow-none mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Mês Selector */}
          <div className="flex items-center gap-3 bg-black/40 border border-white/10 px-4 py-2 rounded-xl">
            <Calendar size={18} className="text-orange-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Mês de Referência</span>
              <input
                className="bg-transparent text-white font-bold text-sm outline-none cursor-pointer"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
          </div>

          {/* Workflow Tabs: Todas do Mês / Recorrentes / Lixeira */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 shadow-none">
            <button
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === "active"
                  ? "bg-white/15 text-white font-black border border-white/20 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              onClick={() => setTab("active")}
            >
              Todas do Mês
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                tab === "recurring"
                  ? "bg-orange-500/20 text-orange-400 font-black border border-orange-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              onClick={() => setTab("recurring")}
            >
              <Repeat size={13} />
              Recorrentes
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider uppercase transition-all whitespace-nowrap border ${
                tab === "trash"
                  ? "bg-red-500/20 border-red-500/40 text-red-400"
                  : "bg-transparent border-transparent text-slate-400 hover:text-red-400"
              }`}
              onClick={() => setTab("trash")}
            >
              Lixeira
            </button>
          </div>
        </div>

        {/* Status Containers (Pago / Pendente / Total / Atualizar) */}
        <div className="mt-5 flex gap-3 flex-wrap items-center justify-between border-t border-white/5 pt-4">
          <div className="flex gap-3 flex-wrap items-center">
            {/* PAGO Container */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold text-sm shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>PAGO:</span>
              <span className="font-mono text-base">{CURRENCY_FORMATTER.format(totalPago)}</span>
            </div>

            {/* PENDENTE Container */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-extrabold text-sm shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
              <span>PENDENTE:</span>
              <span className="font-mono text-base">{CURRENCY_FORMATTER.format(totalPendente)}</span>
            </div>

            {/* TOTAL GERAL */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs font-bold">
              <span>TOTAL:</span>
              <span className="font-mono text-white font-extrabold text-sm">{CURRENCY_FORMATTER.format(totalGeral)}</span>
            </div>
          </div>

          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer"
            onClick={() => loadExpenses()}
            title="Recarregar despesas"
          >
            <RotateCcw size={15} className="text-orange-400" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* LISTA DE DESPESAS COM EXPANSÃO INLINE ESTILO NOTION */}
      <div className="gm-card barra !p-0 overflow-hidden min-h-[420px] flex flex-col transition-all duration-300 rounded-2xl border border-white/10 shadow-none mb-24">
        {/* Header fixo da tabela */}
        <div className="hidden sm:grid grid-cols-[150px_1fr_160px_140px] gap-4 px-6 py-4 border-b border-white/10 font-black opacity-80 uppercase tracking-widest text-[11px] bg-[#121216]/95 backdrop-blur-md shrink-0 shadow-sm text-slate-300">
          <div>Vencimento</div>
          <div>Descrição da Despesa</div>
          <div className="text-right">Valor (R$)</div>
          <div className="text-right pr-2">Ações & Status</div>
        </div>

        {/* Conteúdo da Lista */}
        <div className="flex-1 overflow-y-auto min-h-0 gm-scrollable">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 opacity-60">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
              <span className="text-sm font-bold text-slate-400">Carregando despesas...</span>
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-xl font-bold text-white mb-1">Nenhuma despesa encontrada</div>
              <div className="text-sm text-slate-400">
                {tab === "trash"
                  ? "A lixeira deste mês está vazia."
                  : tab === "recurring"
                  ? "Nenhuma despesa recorrente cadastrada."
                  : `Nenhuma despesa para ${monthFormatted}.`}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {expenses.map((e) => {
                const isExpanded = expandedRowId === e.id;
                return (
                  <div
                    key={e.id}
                    className={`transition-colors ${
                      isExpanded
                        ? "bg-[#181a20] border-l-4 border-orange-500"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    {/* Linha Principal da Despesa */}
                    <div
                      className="p-4 sm:px-6 sm:py-4 flex flex-col sm:grid sm:grid-cols-[150px_1fr_160px_140px] sm:items-center gap-3 cursor-pointer select-none"
                      onClick={() => handleToggleExpand(e)}
                    >
                      {/* Vencimento e Status Pill */}
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                          <Calendar size={14} className="text-orange-400 shrink-0" />
                          {e.dueDate ? e.dueDate.split("-").reverse().join("/") : "-"}
                        </div>
                        {e.paid ? (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            PAGO
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                            PENDENTE
                          </span>
                        )}
                      </div>

                      {/* Descrição + Badges de Recorrência/Lembrete */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-white text-base truncate">
                          {e.description}
                        </span>
                        {e.isRecurring && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0 flex items-center gap-1" title="Despesa Recorrente">
                            <Repeat size={10} />
                            Recorrente
                          </span>
                        )}
                        {(e.reminderTime || e.reminderDate) && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 shrink-0 flex items-center gap-1" title={`Lembrete: ${e.reminderDate ? e.reminderDate + ' ' : ''}${e.reminderTime}`}>
                            <Bell size={10} />
                            {e.reminderTime}
                          </span>
                        )}
                      </div>

                      {/* Valor Formatado */}
                      <div
                        className={`text-base font-extrabold sm:text-right font-mono ${
                          e.paid ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {CURRENCY_FORMATTER.format(e.amount)}
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center justify-end gap-2" onClick={(ev) => ev.stopPropagation()}>
                        {/* Toggle Pago Rápido */}
                        <button
                          type="button"
                          onClick={(ev) => handleTogglePaid(e, ev)}
                          className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all border ${
                            e.paid
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30"
                              : "bg-black/40 border-white/10 text-white/40 hover:text-white hover:border-white/25"
                          }`}
                          title={e.paid ? "Marcar como Pendente" : "Marcar como Pago"}
                        >
                          <Check size={16} />
                        </button>

                        {/* Expandir / Editar Estilo Notion */}
                        <button
                          type="button"
                          onClick={() => handleToggleExpand(e)}
                          className={`h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all border ${
                            isExpanded
                              ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                              : "bg-black/40 border-white/10 text-white/60 hover:text-white hover:border-white/25"
                          }`}
                          title="Editar detalhes (Notion)"
                        >
                          <Pencil size={13} />
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>

                        {/* Excluir / Restaurar */}
                        {tab === "active" || tab === "recurring" ? (
                          <button
                            className="h-9 w-9 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0 border border-red-500/20"
                            onClick={() => softDeleteExpense(e.id)}
                            title="Mover para lixeira"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <>
                            <button
                              className="h-9 w-9 rounded-xl bg-white/5 text-white/80 hover:text-white transition-all flex items-center justify-center shrink-0 border border-white/10"
                              onClick={() => restoreExpense(e.id)}
                              title="Restaurar"
                            >
                              <RotateCcw size={14} />
                            </button>
                            <button
                              className="h-9 w-9 rounded-xl bg-red-600 text-white hover:bg-red-500 transition-all flex items-center justify-center shrink-0"
                              onClick={() => setDeleteConfirmId(e.id)}
                              title="Excluir definitivo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* EXPANSÃO NOTION-STYLE INLINE */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden bg-[#111317] border-t border-b border-orange-500/30 px-6 py-5 shadow-inner"
                        >
                          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                              <span className="text-xs font-black uppercase tracking-widest text-orange-400 font-mono">
                                Propriedades da Despesa (Modo Notion)
                              </span>
                            </div>
                            <span className="text-[11px] text-white/40">
                              Altere os dados e salve sem sair da tela
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Descrição */}
                            <div className="flex flex-col gap-1.5 md:col-span-2">
                              <label className="text-[10px] uppercase font-black tracking-widest text-white/50">
                                📝 Descrição da Despesa
                              </label>
                              <input
                                type="text"
                                className="bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-orange-500/60 transition-colors"
                                value={editDesc}
                                onChange={(ev) => setEditDesc(ev.target.value)}
                                placeholder="Nome da conta, fornecedor..."
                              />
                            </div>

                            {/* Valor */}
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] uppercase font-black tracking-widest text-white/50">
                                💰 Valor (R$)
                              </label>
                              <input
                                type="text"
                                className="bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-emerald-400 font-mono font-extrabold outline-none focus:border-emerald-500/60 transition-colors"
                                value={editAmount}
                                onChange={(ev) => setEditAmount(ev.target.value)}
                                placeholder="0,00"
                              />
                            </div>

                            {/* Vencimento */}
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] uppercase font-black tracking-widest text-white/50">
                                📅 Data de Vencimento
                              </label>
                              <GlassDatePicker
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-orange-500/60 transition-colors flex items-center min-h-[42px]"
                                value={editDueDate}
                                onChange={setEditDueDate}
                                title="Vencimento"
                              />
                            </div>

                            {/* Lembrete / Alerta por Data e Hora */}
                            <div className="flex flex-col gap-1.5 md:col-span-2 bg-black/30 border border-white/5 p-3.5 rounded-xl">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] uppercase font-black tracking-widest text-yellow-300 flex items-center gap-1.5">
                                  <Bell size={13} className="text-yellow-400" />
                                  Notificação / Lembrete por Data e Hora
                                </label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editReminderEnabled}
                                    onChange={(ev) => setEditReminderEnabled(ev.target.checked)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
                                </label>
                              </div>

                              {editReminderEnabled && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                  <div>
                                    <span className="text-[10px] text-white/40 block mb-1">Data do Alerta</span>
                                    <GlassDatePicker
                                      className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                                      value={editReminderDate}
                                      onChange={setEditReminderDate}
                                      title="Data do Alerta"
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-white/40 block mb-1">Horário do Alerta</span>
                                    <GlassTimePicker
                                      value={editReminderTime}
                                      onChange={setEditReminderTime}
                                      className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                                      title="Horário do Alerta"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Despesa Recorrente & Status Pago */}
                            <div className="flex flex-col sm:flex-row gap-3 md:col-span-3 pt-2">
                              {/* Toggle Recorrente */}
                              <div
                                onClick={() => setEditIsRecurring(!editIsRecurring)}
                                className={`flex-1 flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                  editIsRecurring
                                    ? "bg-orange-500/15 border-orange-500/40 text-orange-300"
                                    : "bg-black/30 border-white/10 text-white/60 hover:text-white"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Repeat size={16} className={editIsRecurring ? "text-orange-400" : "text-white/40"} />
                                  <div className="flex flex-col text-left">
                                    <span className="text-xs font-bold">Despesa Recorrente</span>
                                    <span className="text-[10px] opacity-70">Repetir automaticamente todo mês</span>
                                  </div>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={editIsRecurring}
                                  onChange={() => {}}
                                  className="w-4 h-4 accent-orange-500 cursor-pointer"
                                />
                              </div>

                              {/* Toggle Status Pago */}
                              <div
                                onClick={() => setEditPaid(!editPaid)}
                                className={`flex-1 flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                  editPaid
                                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                                    : "bg-black/30 border-white/10 text-white/60 hover:text-white"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Check size={16} className={editPaid ? "text-emerald-400" : "text-white/40"} />
                                  <div className="flex flex-col text-left">
                                    <span className="text-xs font-bold">Status do Pagamento</span>
                                    <span className="text-[10px] opacity-70">
                                      {editPaid ? "Conta quitada (Pago)" : "Aguardando pagamento (Pendente)"}
                                    </span>
                                  </div>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={editPaid}
                                  onChange={() => {}}
                                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Botões de Ação da Linha Expandida */}
                          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-white/10">
                            <button
                              type="button"
                              onClick={() => setExpandedRowId(null)}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              disabled={isSavingInline}
                              onClick={() => handleSaveInline(e.id)}
                              className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
                            >
                              {isSavingInline ? (
                                <span>Salvando...</span>
                              ) : (
                                <>
                                  <Save size={14} />
                                  <span>Salvar Alterações</span>
                                </>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL CRIAR NOVA DESPESA */}
      <AnimatePresence>
        {showNewModal && (
          <div
            className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md"
            onClick={() => setShowNewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="gm-card fora w-full max-w-lg rounded-2xl border border-white/15 overflow-hidden shadow-2xl relative z-10 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#121216]">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus size={18} className="text-orange-400" />
                  Nova Despesa
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateNew} className="p-6 space-y-4">
                <div>
                  <label className="text-xs uppercase font-bold text-slate-400 block mb-1.5">
                    Descrição da Despesa
                  </label>
                  <input
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-orange-500 transition-all"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Ex: Conta de luz, Internet, Fornecedor X..."
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase font-bold text-slate-400 block mb-1.5">
                      Valor (R$)
                    </label>
                    <input
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-emerald-400 font-mono font-bold outline-none focus:border-emerald-500 transition-all"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder="0,00"
                      inputMode="decimal"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold text-slate-400 block mb-1.5">
                      Vencimento
                    </label>
                    <GlassDatePicker
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-orange-500 transition-all flex items-center min-h-[42px]"
                      value={newDueDate}
                      onChange={setNewDueDate}
                      title="Vencimento"
                    />
                  </div>
                </div>

                {/* Lembrete / Notificação */}
                <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-yellow-300 flex items-center gap-1.5">
                      <Bell size={14} className="text-yellow-400" />
                      Definir Lembrete / Alerta
                    </span>
                    <input
                      type="checkbox"
                      checked={newReminderEnabled}
                      onChange={(e) => setNewReminderEnabled(e.target.checked)}
                      className="w-4 h-4 accent-yellow-500 cursor-pointer"
                    />
                  </div>

                  {newReminderEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[10px] text-white/40 block mb-1">Data do Alerta</span>
                        <GlassDatePicker
                          className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                          value={newReminderDate}
                          onChange={setNewReminderDate}
                          title="Data do Alerta"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-white/40 block mb-1">Horário do Alerta</span>
                        <GlassTimePicker
                          value={newReminderTime}
                          onChange={setNewReminderTime}
                          className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                          title="Horário do Alerta"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Recorrente e Pago */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setNewIsRecurring(!newIsRecurring)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      newIsRecurring
                        ? "bg-orange-500/15 border-orange-500/40 text-orange-300"
                        : "bg-black/30 border-white/10 text-white/60"
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Repeat size={14} /> Recorrente Mensal
                    </span>
                    <input
                      type="checkbox"
                      checked={newIsRecurring}
                      onChange={() => {}}
                      className="w-4 h-4 accent-orange-500"
                    />
                  </div>

                  <div
                    onClick={() => setNewPaid(!newPaid)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      newPaid
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                        : "bg-black/30 border-white/10 text-white/60"
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Check size={14} /> Já Pago
                    </span>
                    <input
                      type="checkbox"
                      checked={newPaid}
                      onChange={() => {}}
                      className="w-4 h-4 accent-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[var(--gm-primary)] hover:brightness-110 text-white text-xs font-extrabold transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
                  >
                    <Plus size={16} />
                    Cadastrar Despesa
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL COMPARTILHAR RELATÓRIO DE DESPESAS */}
      <AnimatePresence>
        {showShareModal && (
          <div
            className="fixed inset-0 z-[1000] bg-black/85 flex items-center justify-center p-4 backdrop-blur-md"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="gm-card fora w-full max-w-lg rounded-2xl border border-white/15 overflow-hidden shadow-2xl relative z-10 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#121216]">
                <div className="flex items-center gap-2">
                  <Share2 size={18} className="text-green-400" />
                  <h3 className="text-lg font-bold text-white">Relatório de Despesas</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-black/50 border border-white/10 rounded-xl p-4 text-xs font-mono text-white/90 whitespace-pre-wrap max-h-[320px] overflow-y-auto leading-relaxed">
                  {generateReportText()}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 border border-white/10 active:scale-95"
                  >
                    {copiedReport ? (
                      <>
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <span className="text-emerald-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Copiar Relatório</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="px-4 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/30 active:scale-95"
                  >
                    <MessageSquare size={16} />
                    <span>Enviar para WhatsApp</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMAÇÃO DE EXCLUSÃO DEFINITIVA */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div
            className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md"
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="gm-card fora w-full max-w-sm rounded-[24px] overflow-hidden border border-white/12 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-7 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-500/20">
                  <Trash2 size={28} className="text-red-500" />
                </div>
                <h3 className="text-2xl font-extrabold text-white mb-2.5">Excluir Definitivamente?</h3>
                <p className="text-slate-300 text-sm mb-6 leading-relaxed">
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
                    className="gm-btn flex-1 h-11 rounded-xl text-xs uppercase tracking-widest font-black bg-red-600 hover:bg-red-500 text-white shadow-none"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Page>
  );
}
