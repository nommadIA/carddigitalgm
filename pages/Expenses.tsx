import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  ChevronLeft,
  ChevronRight,
  ListFilter,
  MessageSquare,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { GlassDatePicker } from "../components/ui/GlassDatePicker";
import { GlassTimePicker } from "../components/ui/GlassTimePicker";
import { addAlarmsForBudget, removeAlarmsForBudget } from "../lib/alarmSystem";
import { useAuth } from "../store/AuthContext";
import { broadcastAppNotification } from "../lib/syncHub";
import { motion, AnimatePresence } from "motion/react";

const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const MONTHS_LIST = [
  { value: "01", name: "Janeiro", short: "Jan" },
  { value: "02", name: "Fevereiro", short: "Fev" },
  { value: "03", name: "Março", short: "Mar" },
  { value: "04", name: "Abril", short: "Abr" },
  { value: "05", name: "Maio", short: "Mai" },
  { value: "06", name: "Junho", short: "Jun" },
  { value: "07", name: "Julho", short: "Jul" },
  { value: "08", name: "Agosto", short: "Ago" },
  { value: "09", name: "Setembro", short: "Set" },
  { value: "10", name: "Outubro", short: "Out" },
  { value: "11", name: "Novembro", short: "Nov" },
  { value: "12", name: "Dezembro", short: "Dez" },
];

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

// Detecção universal de erro de coluna inexistente ou cache de schema do PostgREST
function isMissingColumnError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || "").toUpperCase();
  const msg = (String(error.message || "") + " " + String(error.details || "") + " " + String(error.hint || "")).toLowerCase();
  return (
    code === "42703" ||
    code === "PGRST204" ||
    code === "PGRST100" ||
    msg.includes("could not find") ||
    msg.includes("schema cache") ||
    msg.includes("is_recurring") ||
    msg.includes("reminder_time") ||
    msg.includes("column")
  );
}

const EXPENSE_LOCAL_META_KEY = "gm_expenses_local_meta_v1";

function getExpenseLocalMeta(): Record<string, { isRecurring?: boolean; reminderTime?: string; reminderDate?: string }> {
  try {
    const raw = localStorage.getItem(EXPENSE_LOCAL_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveExpenseLocalMeta(id: string, meta: { isRecurring?: boolean; reminderTime?: string; reminderDate?: string }) {
  try {
    const current = getExpenseLocalMeta();
    current[id] = { ...current[id], ...meta };
    localStorage.setItem(EXPENSE_LOCAL_META_KEY, JSON.stringify(current));
  } catch {}
}

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
  const { tenantId } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseUI[]>([]);
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Modal Seletor de Mês de Referência
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => {
    const d = new Date();
    return d.getFullYear();
  });

  const [tab, setTab] = useState<"active" | "recurring" | "trash">("active");

  // Inline Notion-style expanded row ID
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Modal for editing expense (opened directly via pencil icon)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

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

      let data: any[] | null = null;
      try {
        const res = await q;
        if (res.error) throw res.error;
        data = res.data;
      } catch (err: any) {
        if (isMissingColumnError(err)) {
          // Se a coluna is_recurring ou outra não existe, faz query sem o filtro de coluna
          console.warn("[Expenses] Column missing in loadExpenses, applying fallback query:", err.message);
          let fallbackQ = supabase
            .from("expenses")
            .select("*")
            .order("due_date", { ascending: false });
          if (tab === "active") {
            fallbackQ = fallbackQ.is("deleted_at", null).gte("due_date", startISO).lt("due_date", nextISO);
          } else if (tab === "trash") {
            fallbackQ = fallbackQ.not("deleted_at", "is", null).gte("due_date", startISO).lt("due_date", nextISO);
          } else if (tab === "recurring") {
            fallbackQ = fallbackQ.is("deleted_at", null);
          }
          const fbRes = await fallbackQ;
          if (fbRes.error) {
            // Último recurso: busca tudo sem filtros restritivos
            const plainRes = await supabase.from("expenses").select("*");
            data = plainRes.data;
          } else {
            data = fbRes.data;
          }
        } else {
          throw err;
        }
      }

      const localMeta = getExpenseLocalMeta();

      let rows: ExpenseUI[] = ((data as ExpenseRow[]) || []).map((r) => {
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

        const meta = localMeta[r.id];
        const isRec = r.is_recurring !== undefined && r.is_recurring !== null 
          ? !!r.is_recurring 
          : (meta?.isRecurring ?? false);

        return {
          id: r.id,
          description: r.description,
          amount: Number(r.amount) || 0,
          dueDate: r.due_date ? String(r.due_date) : "",
          paid: !!r.paid,
          deleted_at: r.deleted_at ?? null,
          isRecurring: isRec,
          reminderTime: rTime || meta?.reminderTime || "",
          reminderDate: rDate || meta?.reminderDate || "",
        };
      });

      if (tab === "recurring") {
        rows = rows.filter((r) => r.isRecurring);
      }

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

  const handlePrevMonth = () => {
    try {
      const [yearStr, monthStr] = month.split("-");
      let y = Number(yearStr);
      let m = Number(monthStr) - 1;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
      setMonth(`${y}-${String(m).padStart(2, "0")}`);
    } catch {}
  };

  const handleNextMonth = () => {
    try {
      const [yearStr, monthStr] = month.split("-");
      let y = Number(yearStr);
      let m = Number(monthStr) + 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      setMonth(`${y}-${String(m).padStart(2, "0")}`);
    } catch {}
  };

  // Open dedicated modal to edit expense (triggered by pencil icon)
  const handleOpenEditModal = (ex: ExpenseUI, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingExpenseId(ex.id);
    setEditDesc(ex.description);
    setEditAmount(String(ex.amount));
    setEditDueDate(ex.dueDate);
    setEditPaid(ex.paid);
    setEditIsRecurring(!!ex.isRecurring);
    setEditReminderEnabled(!!(ex.reminderTime || ex.reminderDate));
    setEditReminderDate(ex.reminderDate || ex.dueDate || "");
    setEditReminderTime(ex.reminderTime || "09:00");
    setShowEditModal(true);
  };

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

  // Save edits (both inline and dedicated modal)
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
      if (error && isMissingColumnError(error)) {
        console.warn("[Expenses] Missing column on update, retrying with fallbackPayload:", error.message);
        // Fallback without new columns if table not migrated yet
        const { is_recurring, reminder_time, ...fallbackPayload } = payload;
        const res = await supabase.from("expenses").update(fallbackPayload).eq("id", id);
        if (res.error) throw res.error;
      } else if (error) {
        throw error;
      }

      // Guardar metadados de recorrência e lembrete localmente como garantia
      saveExpenseLocalMeta(id, {
        isRecurring: editIsRecurring,
        reminderDate: editReminderDate,
        reminderTime: editReminderTime,
      });

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
      setShowEditModal(false);
      setEditingExpenseId(null);
      showToast("Despesa atualizada com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar: " + (err?.message || "Ocorreu um erro."));
    } finally {
      setIsSavingInline(false);
    }
  };

  const handleSaveExpense = handleSaveInline;

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
    if (tenantId) {
      payload.tenant_id = tenantId;
    }

    try {
      let createdRow: any = null;
      let { data, error } = await supabase.from("expenses").insert(payload).select().single();
      
      if (error && isMissingColumnError(error)) {
        console.warn("[Expenses] Missing column on insert, retrying with fallbackPayload:", error.message);
        const { is_recurring, reminder_time, ...fallbackPayload } = payload;
        const res = await supabase.from("expenses").insert(fallbackPayload).select().single();
        if (res.error) {
          // Se select() falhar por RLS, tenta insert direto
          const plainRes = await supabase.from("expenses").insert(fallbackPayload);
          if (plainRes.error) throw plainRes.error;
          createdRow = { id: "exp_" + Date.now(), ...fallbackPayload };
        } else {
          createdRow = res.data;
        }
      } else if (error) {
        throw error;
      } else {
        createdRow = data;
      }

      const createdId = createdRow?.id || ("exp_" + Date.now());

      // Persistir preferência localmente para não perder status de recorrência/lembrete
      saveExpenseLocalMeta(createdId, {
        isRecurring: newIsRecurring,
        reminderDate: newReminderDate,
        reminderTime: newReminderTime,
      });

      if (createdId && newReminderEnabled && newReminderTime) {
        addAlarmsForBudget(createdId, newDesc.trim(), [newReminderTime], "EXPENSE", undefined, newReminderDate || newDueDate);
      }

      // Notificação simultânea para Smartphone & Desktop
      try {
        broadcastAppNotification(tenantId, {
          title: "💸 Nova Despesa Cadastrada",
          message: `${newDesc.trim()} • R$ ${numAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          type: "expense",
          amount: numAmount,
          url: "/expenses",
        });
      } catch (e) {}

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
      let recurringData: any[] = [];
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .is("deleted_at", null)
        .eq("is_recurring", true);

      if (error && isMissingColumnError(error)) {
        console.warn("[Expenses] is_recurring missing in schema cache, using local metadata");
        const fallbackRes = await supabase.from("expenses").select("*").is("deleted_at", null);
        const localMeta = getExpenseLocalMeta();
        recurringData = (fallbackRes.data || []).filter((e: any) => localMeta[e.id]?.isRecurring);
      } else if (error) {
        throw error;
      } else {
        recurringData = data || [];
      }

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
          const insertPayload: any = {
            description: rec.description,
            amount: rec.amount,
            due_date: targetDueDate,
            paid: false,
            is_recurring: true,
            reminder_time: rec.reminder_time,
          };
          if (tenantId) insertPayload.tenant_id = tenantId;

          let insRes = await supabase.from("expenses").insert(insertPayload).select().single();
          let newId = insRes.data?.id;

          if (insRes.error && isMissingColumnError(insRes.error)) {
            const { is_recurring, reminder_time, ...fallbackPayload } = insertPayload;
            const plainRes = await supabase.from("expenses").insert(fallbackPayload).select().single();
            if (plainRes.error) {
              await supabase.from("expenses").insert(fallbackPayload);
            } else {
              newId = plainRes.data?.id;
            }
          }

          if (newId) {
            saveExpenseLocalMeta(newId, {
              isRecurring: true,
              reminderTime: rec.reminder_time,
            });
          }
          addedCount++;
        }
      }

      showToast(`${addedCount} despesa(s) recorrente(s) importada(s) para ${monthFormatted}!`);
      loadExpenses();
    } catch (err: any) {
      alert("Erro ao importar: " + (err?.message || "Ocorreu um erro"));
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

      {/* TOP CONTROL CONTAINER: MÊS DE REFERÊNCIA / STATUS / ATUALIZAR / ABAS */}
      <div 
        id="expenses-top-controls"
        className="w-full fora rounded-2xl md:rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-none mb-6 p-4 sm:p-5 md:p-6 flex flex-col gap-4 sm:gap-5 !overflow-visible"
        style={{ minHeight: "auto", height: "auto" }}
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5">
          {/* Mês Selector com Setas de Navegação - Responsivo para Smartphone e Desktop */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {/* Desktop: Seta Anterior */}
            <button
              type="button"
              onClick={handlePrevMonth}
              className="hidden sm:flex w-13 h-13 min-w-[52px] min-h-[52px] rounded-2xl bg-black/60 hover:bg-white/15 text-white/80 hover:text-white border border-white/15 items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-md hover:border-orange-500/40"
              title="Mês anterior"
            >
              <ChevronLeft size={22} />
            </button>

            {/* Botão Principal do Mês de Referência que abre o Modal Dedicado */}
            <button
              type="button"
              onClick={() => {
                const [yearStr] = month.split("-");
                setPickerYear(Number(yearStr) || new Date().getFullYear());
                setShowMonthModal(true);
              }}
              className="flex items-center justify-between gap-3 sm:gap-4 bg-black/70 hover:bg-black/90 border border-white/20 hover:border-orange-500/70 px-4 sm:px-5 py-3 rounded-2xl w-full sm:w-auto sm:min-w-[270px] min-h-[52px] transition-all cursor-pointer shadow-lg group active:scale-98"
              title="Clique para abrir o seletor de mês e ano"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-105 group-hover:bg-orange-500/25 transition-all shrink-0 shadow-sm">
                  <Calendar size={20} />
                </div>
                <div className="flex flex-col items-start text-left select-none">
                  <span className="text-[11px] uppercase tracking-wider text-orange-400 font-extrabold flex items-center gap-1 leading-none mb-1">
                    Mês de Referência
                  </span>
                  <span className="text-sm sm:text-base font-black text-white capitalize leading-tight">
                    {monthFormatted}
                  </span>
                </div>
              </div>
              <ChevronDown size={20} className="text-white/50 group-hover:text-orange-400 group-hover:translate-y-0.5 transition-all shrink-0 ml-1" />
            </button>

            {/* Desktop: Seta Próximo */}
            <button
              type="button"
              onClick={handleNextMonth}
              className="hidden sm:flex w-13 h-13 min-w-[52px] min-h-[52px] rounded-2xl bg-black/60 hover:bg-white/15 text-white/80 hover:text-white border border-white/15 items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-md hover:border-orange-500/40"
              title="Próximo mês"
            >
              <ChevronRight size={22} />
            </button>

            {/* Desktop: Botão Hoje */}
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                const currentMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                setMonth(currentMonthKey);
                showToast("Mês atual selecionado!");
              }}
              className="hidden sm:flex h-13 min-h-[52px] px-4 sm:px-5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/15 text-xs font-black uppercase tracking-wider transition-all items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-md active:scale-95"
              title="Ir para o mês atual"
            >
              Hoje
            </button>

            {/* Smartphone: As duas setas abaixo do MODAL MÊS DE REFERÊNCIA pegando as extremidades da tela */}
            <div className="flex sm:hidden items-center justify-between gap-3 w-full">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="flex-1 h-12 rounded-2xl bg-black/70 hover:bg-white/15 text-white/80 hover:text-white border border-white/15 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-md hover:border-orange-500/40"
                title="Mês anterior"
              >
                <ChevronLeft size={22} />
              </button>

              <button
                type="button"
                onClick={handleNextMonth}
                className="flex-1 h-12 rounded-2xl bg-black/70 hover:bg-white/15 text-white/80 hover:text-white border border-white/15 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-md hover:border-orange-500/40"
                title="Próximo mês"
              >
                <ChevronRight size={22} />
              </button>
            </div>
          </div>

          {/* Workflow Tabs: Todas do Mês / Recorrentes / Lixeira */}
          <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 p-1.5 sm:p-2 rounded-2xl bg-black/50 border border-white/15 shadow-md w-full sm:w-auto min-h-[52px]">
            <button
              className={`h-11 sm:h-12 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tab === "active"
                  ? "bg-white/15 text-white font-black border border-white/25 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
              onClick={() => setTab("active")}
            >
              <ListFilter size={16} className="shrink-0 text-orange-400" />
              <span className="truncate">Todas do Mês</span>
            </button>
            <button
              className={`h-11 sm:h-12 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tab === "recurring"
                  ? "bg-orange-500/20 text-orange-400 font-black border border-orange-500/40 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
              onClick={() => setTab("recurring")}
            >
              <Repeat size={16} className="shrink-0 text-orange-400" />
              <span className="truncate">Recorrentes</span>
            </button>
            <button
              className={`h-11 sm:h-12 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                tab === "trash"
                  ? "bg-red-500/20 border-red-500/40 text-red-400 shadow-md"
                  : "bg-transparent border-transparent text-slate-400 hover:text-red-400"
              }`}
              onClick={() => setTab("trash")}
            >
              <Trash2 size={16} className="shrink-0" />
              <span className="truncate">Lixeira</span>
            </button>
          </div>
        </div>

        {/* Status Containers (Pago / Pendente / Total / Atualizar) */}
        <div className="flex flex-col sm:flex-row gap-3.5 items-stretch sm:items-center justify-between border-t border-white/10 pt-5">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-center">
            {/* PAGO Container */}
            <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold text-xs sm:text-sm shadow-sm justify-center sm:justify-start min-h-[50px]">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>PAGO:</span>
              <span className="font-mono text-sm sm:text-base font-black">{CURRENCY_FORMATTER.format(totalPago)}</span>
            </div>

            {/* PENDENTE Container */}
            <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-extrabold text-xs sm:text-sm shadow-sm justify-center sm:justify-start min-h-[50px]">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse shrink-0" />
              <span>PENDENTE:</span>
              <span className="font-mono text-sm sm:text-base font-black">{CURRENCY_FORMATTER.format(totalPendente)}</span>
            </div>

            {/* TOTAL GERAL */}
            <div className="col-span-2 sm:col-span-1 flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-2xl bg-white/5 border border-white/15 text-white/90 text-xs sm:text-sm font-bold justify-center sm:justify-start min-h-[50px]">
              <span className="font-black uppercase tracking-wider text-white/50">TOTAL:</span>
              <span className="font-mono text-white font-black text-sm sm:text-base">{CURRENCY_FORMATTER.format(totalGeral)}</span>
            </div>
          </div>

          <button
            type="button"
            className="h-12 sm:h-13 min-h-[50px] px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-white/90 hover:text-white border border-white/15 text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer shrink-0 hover:border-orange-500/40"
            onClick={() => loadExpenses()}
            title="Recarregar despesas"
          >
            <RotateCcw size={16} className="text-orange-400" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* LISTA DE DESPESAS DIRETA COM EXPANSÃO INLINE ESTILO NOTION */}
      <div className="w-full fora bg-white/[0.02] backdrop-blur-md rounded-2xl border border-white/10 shadow-none mb-12 flex flex-col overflow-visible">
        {/* Header fixo da tabela (visível no desktop) */}
        <div className="hidden sm:grid grid-cols-[160px_1fr_160px_140px] items-center gap-4 px-6 py-4 border-b border-white/10 font-black opacity-80 uppercase tracking-widest text-[11px] barra bg-black/20 text-slate-300 rounded-t-2xl">
          <div>Vencimento</div>
          <div>Descrição da Despesa</div>
          <div className="text-right">Valor (R$)</div>
          <div className="text-right pr-2">Ações & Status</div>
        </div>

        {/* Conteúdo da Lista Direta (sem barra de rolagem interna ou altura travada) */}
        <div className="w-full">
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
                    {/* Linha Principal da Despesa: Adaptada para Smartphone e Desktop */}
                    <div
                      className="p-4 sm:px-6 sm:py-4 flex flex-col sm:grid sm:grid-cols-[160px_1fr_160px_140px] sm:items-center gap-3 cursor-pointer select-none"
                      onClick={() => handleToggleExpand(e)}
                    >
                      {/* Vencimento e Status Pill */}
                      <div className="flex items-center justify-between sm:justify-start gap-2">
                        <div className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                          <Calendar size={14} className="text-orange-400 shrink-0" />
                          {e.dueDate ? e.dueDate.split("-").reverse().join("/") : "-"}
                        </div>
                        {e.paid ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 tracking-wider">
                            PAGO
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/40 tracking-wider">
                            PENDENTE
                          </span>
                        )}
                      </div>

                      {/* Descrição + Badges de Recorrência/Lembrete */}
                      <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                        <span className="font-bold text-white text-base sm:text-sm md:text-base truncate">
                          {e.description}
                        </span>
                        {e.isRecurring && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0 flex items-center gap-1" title="Despesa Recorrente">
                            <Repeat size={10} />
                            Recorrente
                          </span>
                        )}
                        {(e.reminderTime || e.reminderDate) && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 shrink-0 flex items-center gap-1" title={`Lembrete: ${e.reminderDate ? e.reminderDate + ' ' : ''}${e.reminderTime}`}>
                            <Bell size={10} />
                            {e.reminderTime}
                          </span>
                        )}
                      </div>

                      {/* Smartphone Layout para Linha Inferior (Valor à esquerda + Ações à direita) / Desktop Grid */}
                      <div className="flex items-center justify-between sm:contents pt-2 sm:pt-0 border-t border-white/5 sm:border-0">
                        {/* Valor Formatado */}
                        <div
                          className={`text-lg sm:text-base font-extrabold sm:text-right font-mono ${
                            e.paid ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {CURRENCY_FORMATTER.format(e.amount)}
                        </div>

                        {/* Botões de Ação Padronizados (Tamanho e Alinhamento Idênticos) */}
                        <div className="flex items-center justify-end gap-2 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                          {/* Toggle Pago Rápido */}
                          <button
                            type="button"
                            onClick={(ev) => handleTogglePaid(e, ev)}
                            data-icon-btn="true"
                            className={`w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] rounded-xl flex items-center justify-center shrink-0 transition-all border cursor-pointer active:scale-90 ${
                              e.paid
                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 shadow-sm"
                                : "bg-black/40 border-white/10 text-white/40 hover:text-white hover:border-white/25"
                            }`}
                            title={e.paid ? "Marcar como Pendente" : "Marcar como Pago"}
                          >
                            <Check size={18} />
                          </button>

                          {/* Editar Despesa (Abre Modal com Botão Salvar Alterações) */}
                          <button
                            type="button"
                            onClick={(ev) => handleOpenEditModal(e, ev)}
                            data-icon-btn="true"
                            className="w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] rounded-xl flex items-center justify-center shrink-0 transition-all border cursor-pointer active:scale-90 bg-orange-500/15 border-orange-500/40 text-orange-400 hover:bg-orange-500 hover:text-white shadow-sm hover:scale-105"
                            title="Editar despesa (Salvar Alterações)"
                          >
                            <Pencil size={16} />
                          </button>

                          {/* Excluir / Restaurar */}
                          {tab === "active" || tab === "recurring" ? (
                            <button
                              data-icon-btn="true"
                              className="w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0 border border-red-500/20 cursor-pointer active:scale-90"
                              onClick={() => softDeleteExpense(e.id)}
                              title="Mover para lixeira"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <>
                              <button
                                data-icon-btn="true"
                                className="w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] rounded-xl bg-white/5 text-white/80 hover:text-white transition-all flex items-center justify-center shrink-0 border border-white/10 cursor-pointer active:scale-90"
                                onClick={() => restoreExpense(e.id)}
                                title="Restaurar"
                              >
                                <RotateCcw size={16} />
                              </button>
                              <button
                                data-icon-btn="true"
                                className="w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] rounded-xl bg-red-600 text-white hover:bg-red-500 transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-90 shadow-sm"
                                onClick={() => setDeleteConfirmId(e.id)}
                                title="Excluir definitivo"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
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
                          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
                              <span className="text-xs font-black uppercase tracking-widest text-orange-400 font-mono">
                                Propriedades da Despesa
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(ev) => handleOpenEditModal(e, ev)}
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer"
                                title="Abrir em modal completo"
                              >
                                <Pencil size={12} className="text-orange-400" />
                                <span>Abrir Modal</span>
                              </button>
                              <button
                                type="button"
                                disabled={isSavingInline}
                                onClick={() => handleSaveInline(e.id)}
                                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
                                title="Salvar Alterações"
                              >
                                {isSavingInline ? (
                                  <span>Salvando...</span>
                                ) : (
                                  <>
                                    <Save size={13} />
                                    <span>Salvar Alterações</span>
                                  </>
                                )}
                              </button>
                            </div>
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

      {/* MODAL EDITAR DESPESA COM BOTÃO SALVAR ALTERAÇÕES EM DESTAQUE */}
      <AnimatePresence>
        {showEditModal && (
          <div
            className="fixed inset-0 z-[1000] bg-black/85 flex items-center justify-center p-4 sm:p-6 md:p-8 backdrop-blur-md overflow-y-auto"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="gm-card fora w-full max-w-2xl lg:max-w-3xl rounded-3xl border border-white/15 overflow-hidden shadow-2xl relative z-10 p-0 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header do Modal */}
              <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-white/10 bg-[#121216]/95">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                    <Pencil size={20} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                      Editar Despesa
                    </h3>
                    <p className="text-xs text-white/50 font-medium mt-0.5">
                      Atualize os dados e confirme no botão Salvar Alterações
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Formulário com Grade Espaçosa */}
              <form
                onSubmit={(ev) => {
                  ev.preventDefault();
                  if (editingExpenseId) handleSaveExpense(editingExpenseId);
                }}
                className="p-6 sm:p-8 space-y-5"
              >
                {/* Descrição da Despesa */}
                <div>
                  <label className="text-xs uppercase font-extrabold tracking-wider text-slate-300 block mb-2">
                    Descrição da Despesa *
                  </label>
                  <input
                    className="w-full bg-black/40 border border-white/10 focus:border-orange-500 rounded-2xl px-4 sm:px-5 py-3 text-sm sm:text-base text-white font-bold outline-none transition-all placeholder:text-white/30"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Ex: Conta de Luz, Aluguel, Fornecedor..."
                    required
                    autoFocus
                  />
                </div>

                {/* Valor e Vencimento em 2 Colunas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="text-xs uppercase font-extrabold tracking-wider text-slate-300 block mb-2">
                      Valor da Conta (R$) *
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-xs font-bold text-white/40 font-mono">
                        R$
                      </span>
                      <input
                        className="w-full bg-black/40 border border-white/10 focus:border-emerald-500 rounded-2xl pl-11 pr-4 py-3 text-base sm:text-lg text-emerald-400 font-mono font-extrabold outline-none transition-all placeholder:text-emerald-400/30"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        placeholder="0,00"
                        inputMode="decimal"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs uppercase font-extrabold tracking-wider text-slate-300 block mb-2">
                      Data de Vencimento *
                    </label>
                    <GlassDatePicker
                      className="w-full bg-black/40 border border-white/10 focus:border-orange-500 rounded-2xl px-4 sm:px-5 py-3 text-sm sm:text-base text-white font-bold outline-none transition-all flex items-center min-h-[48px]"
                      value={editDueDate}
                      onChange={setEditDueDate}
                      title="Vencimento"
                    />
                  </div>
                </div>

                {/* Bloco de Lembrete / Notificação */}
                <div className="bg-black/30 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3.5 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
                        <Bell size={16} />
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-extrabold text-white block">
                          Notificação / Lembrete de Pagamento
                        </span>
                        <span className="text-[11px] text-white/40 block">
                          Receba aviso sonoro e visual no horário programado
                        </span>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editReminderEnabled}
                        onChange={(e) => setEditReminderEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                    </label>
                  </div>

                  {editReminderEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/5">
                      <div>
                        <label className="text-[11px] font-bold text-white/60 block mb-1.5">
                          Data do Alerta
                        </label>
                        <GlassDatePicker
                          className="w-full bg-black/50 border border-white/10 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-sm text-white font-bold"
                          value={editReminderDate}
                          onChange={setEditReminderDate}
                          title="Data do Alerta"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-white/60 block mb-1.5">
                          Horário do Alerta
                        </label>
                        <GlassTimePicker
                          value={editReminderTime}
                          onChange={setEditReminderTime}
                          className="w-full bg-black/50 border border-white/10 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-sm text-white font-bold"
                          title="Horário do Alerta"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Recorrência e Status Pago em Cards Interativos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Despesa Recorrente */}
                  <div
                    onClick={() => setEditIsRecurring(!editIsRecurring)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      editIsRecurring
                        ? "bg-orange-500/15 border-orange-500/40 text-orange-300"
                        : "bg-black/30 border-white/10 text-white/60 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Repeat size={18} className={editIsRecurring ? "text-orange-400" : "text-white/40"} />
                      <div>
                        <span className="text-xs sm:text-sm font-bold block">Despesa Recorrente</span>
                        <span className="text-[10px] sm:text-[11px] opacity-70 block">
                          Repete automaticamente todo mês
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={editIsRecurring}
                      onChange={() => {}}
                      className="w-5 h-5 accent-orange-500 cursor-pointer"
                    />
                  </div>

                  {/* Status Pago */}
                  <div
                    onClick={() => setEditPaid(!editPaid)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      editPaid
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                        : "bg-black/30 border-white/10 text-white/60 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Check size={18} className={editPaid ? "text-emerald-400" : "text-white/40"} />
                      <div>
                        <span className="text-xs sm:text-sm font-bold block">Status do Pagamento</span>
                        <span className="text-[10px] sm:text-[11px] opacity-70 block">
                          {editPaid ? "Conta quitada (Pago)" : "Aguardando pagamento (Pendente)"}
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={editPaid}
                      onChange={() => {}}
                      className="w-5 h-5 accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Ações do Modal com BOTÃO DE SALVAR ALTERAÇÕES */}
                <div className="flex items-center justify-end gap-3 pt-5 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="h-12 px-5 rounded-xl text-xs sm:text-sm font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingInline}
                    className="h-12 px-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-black transition-all flex items-center gap-2.5 shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingInline ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Salvando alterações...</span>
                      </div>
                    ) : (
                      <>
                        <Save size={18} className="stroke-[2.5]" />
                        <span>Salvar Alterações</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CRIAR NOVA DESPESA - PROPORCIONAL, ESPAÇOSO E ORGANIZADO */}
      <AnimatePresence>
        {showNewModal && (
          <div
            className="fixed inset-0 z-[1000] bg-black/85 flex items-center justify-center p-4 sm:p-6 md:p-8 backdrop-blur-md overflow-y-auto"
            onClick={() => setShowNewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="gm-card fora w-full max-w-2xl lg:max-w-3xl rounded-3xl border border-white/15 overflow-hidden shadow-2xl relative z-10 p-0 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header do Modal */}
              <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-white/10 bg-[#121216]/95">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                    <Plus size={22} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                      Cadastrar Nova Despesa
                    </h3>
                    <p className="text-xs text-white/50 font-medium mt-0.5">
                      Preencha os detalhes da conta para acompanhamento financeiro
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Formulário com Grade Espaçosa */}
              <form onSubmit={handleCreateNew} className="p-6 sm:p-8 space-y-5">
                {/* Descrição da Despesa */}
                <div>
                  <label className="text-xs uppercase font-extrabold tracking-wider text-slate-300 block mb-2">
                    Descrição da Despesa *
                  </label>
                  <input
                    className="w-full bg-black/40 border border-white/10 focus:border-orange-500 rounded-2xl px-4 sm:px-5 py-3 text-sm sm:text-base text-white font-bold outline-none transition-all placeholder:text-white/30"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Ex: Conta de Luz, Internet Fibra, Fornecedor de Alvenaria..."
                    autoFocus
                  />
                </div>

                {/* Valor e Vencimento em 2 Colunas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="text-xs uppercase font-extrabold tracking-wider text-slate-300 block mb-2">
                      Valor da Conta (R$) *
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-xs font-bold text-white/40 font-mono">
                        R$
                      </span>
                      <input
                        className="w-full bg-black/40 border border-white/10 focus:border-emerald-500 rounded-2xl pl-11 pr-4 py-3 text-base sm:text-lg text-emerald-400 font-mono font-extrabold outline-none transition-all placeholder:text-emerald-400/30"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        placeholder="0,00"
                        inputMode="decimal"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs uppercase font-extrabold tracking-wider text-slate-300 block mb-2">
                      Data de Vencimento *
                    </label>
                    <GlassDatePicker
                      className="w-full bg-black/40 border border-white/10 focus:border-orange-500 rounded-2xl px-4 sm:px-5 py-3 text-sm sm:text-base text-white font-bold outline-none transition-all flex items-center min-h-[48px]"
                      value={newDueDate}
                      onChange={setNewDueDate}
                      title="Vencimento"
                    />
                  </div>
                </div>

                {/* Bloco de Lembrete / Notificação */}
                <div className="bg-black/30 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3.5 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shrink-0">
                        <Bell size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-extrabold text-white">
                          Ativar Lembrete / Alerta Programado
                        </span>
                        <span className="text-[11px] text-white/50">
                          Receba aviso no sistema e smartphone antes do vencimento
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newReminderEnabled}
                        onChange={(e) => setNewReminderEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                    </label>
                  </div>

                  {newReminderEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                      <div>
                        <span className="text-xs font-bold text-white/60 block mb-1.5">
                          Data do Alerta
                        </span>
                        <GlassDatePicker
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white font-bold"
                          value={newReminderDate}
                          onChange={setNewReminderDate}
                          title="Data do Alerta"
                        />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white/60 block mb-1.5">
                          Horário do Alerta
                        </span>
                        <GlassTimePicker
                          value={newReminderTime}
                          onChange={setNewReminderTime}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white font-bold"
                          title="Horário do Alerta"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Opções: Recorrente Mensal e Já Pago */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setNewIsRecurring(!newIsRecurring)}
                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all select-none ${
                      newIsRecurring
                        ? "bg-orange-500/15 border-orange-500/40 text-orange-300 shadow-sm"
                        : "bg-black/30 border-white/10 text-white/70 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${newIsRecurring ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/40'}`}>
                        <Repeat size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-bold">Despesa Recorrente</span>
                        <span className="text-[11px] opacity-70">Lança automaticamente todo mês</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={newIsRecurring}
                      onChange={() => {}}
                      className="w-4 h-4 accent-orange-500 cursor-pointer pointer-events-none"
                    />
                  </div>

                  <div
                    onClick={() => setNewPaid(!newPaid)}
                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all select-none ${
                      newPaid
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm"
                        : "bg-black/30 border-white/10 text-white/70 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${newPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                        <Check size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-bold">Status do Pagamento</span>
                        <span className="text-[11px] opacity-70">
                          {newPaid ? "Conta quitada (Pago)" : "Aguardando pagamento"}
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={newPaid}
                      onChange={() => {}}
                      className="w-4 h-4 accent-emerald-500 cursor-pointer pointer-events-none"
                    />
                  </div>
                </div>

                {/* Ações do Modal */}
                <div className="flex items-center justify-end gap-3 pt-5 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="h-11 px-5 rounded-xl text-xs sm:text-sm font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="h-11 px-7 rounded-xl bg-[var(--gm-primary)] hover:brightness-110 text-white text-xs sm:text-sm font-black transition-all flex items-center gap-2 shadow-lg shadow-orange-500/25 active:scale-95 cursor-pointer"
                  >
                    <Plus size={18} className="stroke-[2.5]" />
                    <span>Cadastrar Despesa</span>
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
            className="fixed inset-0 z-[1000] bg-black/85 flex items-center justify-center p-4 sm:p-6 md:p-8 backdrop-blur-md overflow-y-auto"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="gm-card fora w-full max-w-2xl rounded-3xl border border-white/15 overflow-hidden shadow-2xl relative z-10 p-0 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-white/10 bg-[#121216]/95">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Share2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-white">Relatório Mensal de Despesas</h3>
                    <p className="text-xs text-white/50 font-medium mt-0.5">
                      Copie o resumo formatado ou envie diretamente para o WhatsApp
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 sm:p-8 space-y-5">
                <div className="bg-black/50 border border-white/10 rounded-2xl p-5 text-xs sm:text-sm font-mono text-white/90 whitespace-pre-wrap max-h-[340px] overflow-y-auto leading-relaxed shadow-inner">
                  {generateReportText()}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="h-12 px-5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 border border-white/10 active:scale-95 cursor-pointer"
                  >
                    {copiedReport ? (
                      <>
                        <CheckCircle2 size={18} className="text-emerald-400" />
                        <span className="text-emerald-400 font-extrabold">Copiado para a Área de Transferência!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={18} />
                        <span>Copiar Relatório</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="h-12 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 cursor-pointer"
                  >
                    <MessageSquare size={18} />
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

      {/* MODAL SELETOR DE MÊS DE REFERÊNCIA - RENDERIZADO VIA PORTAL E 100% CENTRALIZADO NO SMARTPHONE E DESKTOP */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showMonthModal && (
              <div
                className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-hidden"
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: "100vw",
                  height: "100dvh",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                }}
                onClick={() => setShowMonthModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="w-full max-w-[420px] sm:max-w-md rounded-3xl border border-white/20 bg-[#14151a] shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_40px_rgba(246,90,26,0.12)] relative z-10 overflow-hidden flex flex-col m-auto h-[84dvh] min-h-[580px] max-h-[760px] sm:h-auto sm:min-h-0 sm:max-h-[90dvh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header do Modal */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#101114] shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 shadow-sm">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-white leading-tight">Mês de Referência</h3>
                        <p className="text-xs text-white/60 font-medium leading-none mt-1">
                          Selecione o mês para filtrar despesas
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMonthModal(false)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer shrink-0 border border-white/10"
                      title="Fechar"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3 sm:gap-4 overflow-y-auto">
                    {/* Seletor de Ano */}
                    <div className="flex items-center justify-between bg-black/50 border border-white/15 rounded-2xl p-2 sm:p-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPickerYear((y) => y - 1)}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 active:scale-95 shadow-sm"
                        title="Ano anterior"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl sm:text-3xl font-black text-white tracking-wider font-mono">
                          {pickerYear}
                        </span>
                        {pickerYear === new Date().getFullYear() && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-500/20 text-orange-400 border border-orange-500/40 tracking-wider">
                            Atual
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPickerYear((y) => y + 1)}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 active:scale-95 shadow-sm"
                        title="Próximo ano"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>

                    {/* Grade de 12 Meses - Tamanho ampliado e expansão vertical confortável no smartphone */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-2.5 flex-1 items-stretch">
                      {MONTHS_LIST.map((mItem) => {
                        const itemMonthKey = `${pickerYear}-${mItem.value}`;
                        const isSelected = month === itemMonthKey;
                        const todayDate = new Date();
                        const realCurrentKey = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}`;
                        const isCurrentRealMonth = realCurrentKey === itemMonthKey;

                        return (
                          <button
                            key={mItem.value}
                            type="button"
                            onClick={() => {
                              setMonth(itemMonthKey);
                              setShowMonthModal(false);
                              showToast(`Mês alterado para ${mItem.name} de ${pickerYear}`);
                            }}
                            className={`relative p-2 sm:p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 sm:gap-1.5 cursor-pointer h-full min-h-[66px] sm:min-h-[60px] active:scale-95 ${
                              isSelected
                                ? "bg-orange-500/25 border-orange-500 text-white font-black shadow-md shadow-orange-500/25 scale-[1.02]"
                                : "bg-black/40 border-white/10 text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20 font-bold"
                            }`}
                          >
                            <span className={`text-[10px] sm:text-[11px] uppercase font-mono tracking-wider leading-none ${isSelected ? "text-orange-400 font-black" : "text-white/50"}`}>
                              {mItem.value} • {mItem.short}
                            </span>
                            <span className="text-xs sm:text-sm font-black truncate max-w-full leading-tight">
                              {mItem.name}
                            </span>
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500 shadow-sm" />
                            )}
                            {isCurrentRealMonth && !isSelected && (
                              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400" title="Mês atual" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Botões Rápidos no Rodapé do Modal */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          const currentM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                          setPickerYear(now.getFullYear());
                          setMonth(currentM);
                          setShowMonthModal(false);
                          showToast("Mês atual selecionado!");
                        }}
                        className="h-11 px-3.5 sm:px-4 rounded-xl bg-white/5 hover:bg-white/15 text-white/90 hover:text-white border border-white/15 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm"
                      >
                        <Clock size={15} className="text-emerald-400 shrink-0" />
                        <span>Mês Atual</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowMonthModal(false)}
                        className="h-11 px-5 sm:px-6 rounded-xl bg-[var(--gm-primary)] hover:brightness-110 text-white text-xs font-black transition-all cursor-pointer active:scale-95 shadow-md uppercase tracking-wider shrink-0"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </Page>
  );
}
