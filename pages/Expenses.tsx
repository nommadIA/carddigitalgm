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
import { SectionDivider } from "../components/ui/SectionDivider";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import { usePlanAccess } from "../hooks/usePlanAccess";
import PlanLockedNotice from "../components/plans/PlanLockedNotice";
import { PlanId } from "../lib/subscriptionPlans";

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
  const { subscription, canAccess, checkQuota, isExpired } = usePlanAccess();
  const expensesAccess = canAccess("expenses");
  const recurringAccess = canAccess("expenses_recurring");
  const [expenses, setExpenses] = useState<ExpenseUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [lockModal, setLockModal] = useState<{
    title: string;
    reason?: string;
    requiredPlan?: PlanId;
  } | null>(null);

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

  useEffect(() => {
    const anyModal = showEditModal || showNewModal || showShareModal || !!deleteConfirmId || showMonthModal;
    if (!anyModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showEditModal) setShowEditModal(false);
        else if (showNewModal) setShowNewModal(false);
        else if (showShareModal) setShowShareModal(false);
        else if (deleteConfirmId) setDeleteConfirmId(null);
        else if (showMonthModal) setShowMonthModal(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showEditModal, showNewModal, showShareModal, deleteConfirmId, showMonthModal]);

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

  const activeExpensesCount = expenses.filter((e) => !e.deleted_at).length;

  const openNewExpenseWithCheck = () => {
    const qCheck = checkQuota("expenses_monthly", activeExpensesCount);
    if (!qCheck.allowed) {
      setLockModal({
        title: "Limite Mensal de Despesas Atingido",
        reason: qCheck.reason,
        requiredPlan: qCheck.requiredPlan || "intermediario",
      });
      return;
    }
    setShowNewModal(true);
  };

  // Import recurring expenses to the current selected month
  const handleImportRecurring = async () => {
    if (!recurringAccess.allowed) {
      setLockModal({
        title: "Importação de Recorrentes Bloqueada",
        reason: recurringAccess.reason,
        requiredPlan: recurringAccess.requiredPlan || "intermediario",
      });
      return;
    }
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

  if (!expensesAccess.allowed) {
    return (
      <Page title="Despesas">
        <PlanLockedNotice
          variant="page"
          title="Controle de Despesas Bloqueado"
          reason={expensesAccess.reason}
          requiredPlan={expensesAccess.requiredPlan || "intermediario"}
          currentPlanName={subscription.planName}
          isExpired={isExpired}
        />
      </Page>
    );
  }

  return (
    <Page
      title="Despesas"
      actions={
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-center md:justify-end gap-2.5 w-full md:w-auto flex-wrap">
          <button
            className="forge-btn forge-btn--primary w-full md:w-auto !h-11 !min-h-[44px] !px-5 !rounded-[6px] text-sm font-bold uppercase tracking-[0.05em] inline-flex items-center justify-center gap-2 cursor-pointer md:order-3"
            type="button"
            onClick={openNewExpenseWithCheck}
          >
            <Plus size={20} className="stroke-[2.5] gm-btn-plus-black" />
            <span>Nova Despesa</span>
          </button>

          <button
            type="button"
            className="forge-btn forge-btn--secondary w-full md:w-auto !h-11 !min-h-[44px] !px-4 !rounded-[6px] text-sm font-bold uppercase tracking-[0.05em] inline-flex items-center justify-center gap-2 cursor-pointer md:order-1"
            onClick={handleImportRecurring}
            title="Importar despesas recorrentes para este mês"
          >
            <Repeat size={19} />
            <span>Importar Recorrentes</span>
          </button>

          <button
            type="button"
            className="forge-btn forge-btn--secondary w-full md:w-auto !h-11 !min-h-[44px] !px-4 !rounded-[6px] text-sm font-bold uppercase tracking-[0.05em] inline-flex items-center justify-center gap-2 cursor-pointer md:order-2"
            onClick={() => setShowShareModal(true)}
            title="Compartilhar Relatório de Despesas"
          >
            <Share2 size={19} />
            <span>Compartilhar Relatório</span>
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
            className="fixed top-6 right-6 z-[10000] bg-[#131315] border border-[var(--gm-primary,#FE540B)]/50 text-[#f2f2f3] px-5 py-3 rounded-md shadow-2xl flex items-center gap-3 text-sm font-bold font-mono"
          >
            <CheckCircle2 size={18} className="text-[var(--gm-primary,#FE540B)] shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP CONTROL CONTAINER: MÊS DE REFERÊNCIA / STATUS / ATUALIZAR / ABAS */}
      <SectionDivider label="Filtros e Período" />
      <div 
        id="expenses-top-controls"
        className="w-full relative rounded-lg border border-[#26262a] bg-[#131315] overflow-hidden mb-6 p-4 sm:p-5 flex flex-col gap-4 sm:gap-5"
        style={{ minHeight: "auto", height: "auto" }}
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 relative z-10">
          {/* Mês Selector com Navegação Limpa - Forge UI */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                const [yearStr] = month.split("-");
                setPickerYear(Number(yearStr) || new Date().getFullYear());
                setShowMonthModal(true);
              }}
              className="flex items-center justify-between gap-3 sm:gap-4 bg-[#1b1b1e] hover:bg-[#26262a] border border-[#26262a] hover:border-[#3F3F46] px-3.5 py-2 rounded-[6px] w-full sm:w-auto sm:min-w-[250px] min-h-[40px] h-10 transition-colors cursor-pointer group"
              title="Clique para abrir o seletor de mês e ano"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-[4px] border border-[var(--gm-primary,#FE540B)]/30 bg-[var(--gm-primary,#FE540B)]/15 flex items-center justify-center text-[var(--gm-primary,#FE540B)] shrink-0">
                  <Calendar size={14} />
                </div>
                <div className="flex flex-col items-start text-left select-none leading-tight min-w-0">
                  <span className="text-[11px] uppercase font-mono tracking-wider text-[#8b8b92] font-semibold leading-none mb-0.5">
                    Mês de Referência
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#f2f2f3] capitalize font-mono leading-none truncate">
                    {monthFormatted}
                  </span>
                </div>
              </div>
              <ChevronDown size={16} className="text-[#8b8b92] group-hover:text-[var(--gm-primary,#FE540B)] transition-colors shrink-0" />
            </button>

            {/* Setas de Navegação Anterior / Próximo (Smartphone e Desktop) */}
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="flex-1 sm:flex-none sm:w-10 h-10 rounded-[6px] border border-[#26262a] bg-[#1b1b1e] hover:bg-[#26262a] text-[#f2f2f3] hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
                title="Mês anterior"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                type="button"
                onClick={handleNextMonth}
                className="flex-1 sm:flex-none sm:w-10 h-10 rounded-[6px] border border-[#26262a] bg-[#1b1b1e] hover:bg-[#26262a] text-[#f2f2f3] hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
                title="Próximo mês"
              >
                <ChevronRight size={18} />
              </button>

              {/* Desktop: Botão Hoje */}
              <div className="hidden sm:block">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    const currentMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                    setMonth(currentMonthKey);
                    showToast("Mês atual selecionado!");
                  }}
                  className="h-10 px-3.5 rounded-[6px] border border-[#26262a] bg-[#1b1b1e] hover:bg-[#26262a] text-[#f2f2f3] hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                  title="Ir para o mês atual"
                >
                  Hoje
                </button>
              </div>
            </div>
          </div>

          {/* Workflow Tabs: Todas do Mês / Recorrentes / Lixeira no padrão Forge */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1.5 p-1 rounded-[6px] border border-[#26262a] bg-[#1b1b1e] shadow-none w-full sm:w-auto min-h-[44px]">
            <button
              type="button"
              aria-pressed={tab === "active"}
              data-selected={tab === "active"}
              className={`h-9 px-3 sm:px-4 rounded-[4px] text-xs sm:text-[13px] font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tab === "active"
                  ? "bg-[var(--gm-primary,#FE540B)] text-white font-bold shadow-none"
                  : "text-[#8b8b92] hover:text-[#f2f2f3] hover:bg-white/5"
              }`}
              onClick={() => setTab("active")}
            >
              <ListFilter size={17} className={tab === "active" ? "text-white shrink-0" : "text-[var(--gm-primary,#FE540B)] shrink-0"} />
              <span className="truncate">Todas do Mês</span>
            </button>
            <button
              type="button"
              aria-pressed={tab === "recurring"}
              data-selected={tab === "recurring"}
              className={`h-9 px-3 sm:px-4 rounded-[4px] text-xs sm:text-[13px] font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tab === "recurring"
                  ? "bg-[var(--gm-primary,#FE540B)] text-white font-bold shadow-none"
                  : "text-[#8b8b92] hover:text-[#f2f2f3] hover:bg-white/5"
              }`}
              onClick={() => setTab("recurring")}
            >
              <Repeat size={17} className={tab === "recurring" ? "text-white shrink-0" : "text-[var(--gm-primary,#FE540B)] shrink-0"} />
              <span className="truncate">Recorrentes</span>
            </button>
            <button
              type="button"
              aria-pressed={tab === "trash"}
              data-selected={tab === "trash"}
              className={`h-9 px-3 sm:px-4 rounded-[4px] text-xs sm:text-[13px] font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tab === "trash"
                  ? "bg-red-600 text-white font-bold shadow-none"
                  : "text-[#8b8b92] hover:text-red-400 hover:bg-white/5"
              }`}
              onClick={() => setTab("trash")}
            >
              <Trash2 size={17} className={tab === "trash" ? "text-white shrink-0" : "shrink-0"} />
              <span className="truncate">Lixeira</span>
            </button>
          </div>
        </div>

        {/* Status Containers (Pago / Pendente / Total / Atualizar) Forge Style */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-t border-[#26262a] pt-4">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 items-center">
            <div className="flex items-center gap-2 px-3 py-2 rounded-[4px] border border-[#26262a] bg-[#0B0B0C] text-emerald-400 font-mono text-xs justify-center sm:justify-start min-h-[38px]">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-[11px] uppercase tracking-wider text-[#8b8b92] font-semibold">PAGO:</span>
              <span className="font-bold tabular-nums text-[#f2f2f3]">
                <AnimatedNumber value={totalPago} currency decimals={2} replayKey={`${tab}-${month}`} />
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-[4px] border border-[#26262a] bg-[#0B0B0C] text-red-400 font-mono text-xs justify-center sm:justify-start min-h-[38px]">
              <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
              <span className="text-[11px] uppercase tracking-wider text-[#8b8b92] font-semibold">PENDENTE:</span>
              <span className="font-bold tabular-nums text-[#f2f2f3]">
                <AnimatedNumber value={totalPendente} currency decimals={2} replayKey={`${tab}-${month}`} />
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 flex items-center gap-2 px-3 py-2 rounded-[4px] border border-[#26262a] bg-[#0B0B0C] text-[#f2f2f3] font-mono text-xs justify-center sm:justify-start min-h-[38px]">
              <span className="text-[11px] uppercase tracking-wider text-[#8b8b92] font-semibold">TOTAL:</span>
              <span className="font-bold tabular-nums text-[#f2f2f3]">
                <AnimatedNumber value={totalGeral} currency decimals={2} replayKey={`${tab}-${month}`} />
              </span>
            </div>
          </div>

          <button
            type="button"
            className="forge-btn forge-btn--secondary rounded-[6px] h-9 px-4 text-xs font-semibold cursor-pointer shrink-0 whitespace-nowrap"
            onClick={() => loadExpenses()}
            title="Recarregar despesas"
          >
            <RotateCcw size={14} className="text-[var(--gm-primary,#FE540B)]" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* LISTA DE DESPESAS DIRETA COM EXPANSÃO INLINE ESTILO NOTION */}
      <SectionDivider label="Despesas Cadastradas" className="mt-8 mb-4" />
      <div className="w-full relative rounded-lg border border-[#26262a] bg-[#131315] mb-12 flex flex-col overflow-hidden">
        <div className="hidden sm:grid grid-cols-[160px_1fr_160px_140px] items-center gap-4 px-6 py-3.5 border-b border-[#26262a] font-mono font-bold uppercase tracking-wider text-[11px] bg-[#0B0B0C] text-[#8b8b92]">
          <div>Vencimento</div>
          <div>Descrição da Despesa</div>
          <div className="text-right">Valor (R$)</div>
          <div className="text-right pr-2">Ações & Status</div>
        </div>

        <div className="w-full">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 opacity-70">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[var(--gm-primary,#FE540B)]" />
              <span className="text-sm font-semibold text-[#8b8b92]">Carregando despesas...</span>
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-lg font-bold text-[#F2F2F3] mb-1">Nenhuma despesa encontrada</div>
              <div className="text-sm text-[#8b8b92]">
                {tab === "trash"
                  ? "A lixeira deste mês está vazia."
                  : tab === "recurring"
                  ? "Nenhuma despesa recorrente cadastrada."
                  : `Nenhuma despesa para ${monthFormatted}.`}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#26262a]">
              {expenses.map((e) => {
                const isExpanded = expandedRowId === e.id;
                return (
                  <div
                    key={e.id}
                    className={`transition-colors ${
                      isExpanded
                        ? "bg-[#1B1B1E] border-l-[3px] border-[var(--gm-primary,#FE540B)]"
                        : "hover:bg-[#1B1B1E]/60"
                    }`}
                  >
                    <div
                      className="p-4 sm:px-6 sm:py-4 flex flex-col sm:grid sm:grid-cols-[160px_1fr_160px_140px] sm:items-center gap-3 cursor-pointer select-none"
                      onClick={() => handleToggleExpand(e)}
                    >
                      <div className="flex items-center justify-between sm:justify-start gap-2">
                        <div className="text-xs font-mono font-bold tabular-nums text-[#F2F2F3] flex items-center gap-1.5">
                          <Calendar size={14} className="text-[var(--gm-primary,#FE540B)] shrink-0" />
                          {e.dueDate ? e.dueDate.split("-").reverse().join("/") : "-"}
                        </div>
                        {e.paid ? (
                          <span className="px-2 py-0.5 rounded-[4px] font-mono text-[11px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 tracking-wider">
                            PAGO
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-[4px] font-mono text-[11px] font-bold uppercase bg-red-500/15 text-red-400 border border-red-500/30 tracking-wider">
                            PENDENTE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                        <span className="font-bold text-[#F2F2F3] text-sm sm:text-base truncate">
                          {e.description}
                        </span>
                        {e.isRecurring && (
                          <span className="px-2 py-0.5 rounded-[4px] font-mono text-[11px] font-semibold uppercase bg-[var(--gm-primary,#FE540B)]/15 text-[var(--gm-primary,#FE540B)] border border-[var(--gm-primary,#FE540B)]/30 shrink-0 flex items-center gap-1" title="Despesa Recorrente">
                            <Repeat size={11} />
                            Recorrente
                          </span>
                        )}
                        {(e.reminderTime || e.reminderDate) && (
                          <span className="px-2 py-0.5 rounded-[4px] font-mono text-[11px] font-semibold uppercase bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 shrink-0 flex items-center gap-1" title={`Lembrete: ${e.reminderDate ? e.reminderDate + ' ' : ''}${e.reminderTime}`}>
                            <Bell size={11} />
                            {e.reminderTime}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:contents pt-2 sm:pt-0 border-t border-[#26262a] sm:border-0">
                        <div
                          className={`text-base sm:text-base font-bold tabular-nums sm:text-right font-mono ${
                            e.paid ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {CURRENCY_FORMATTER.format(e.amount)}
                        </div>

                        {/* Botões de Ação Padronizados Forge UI */}
                        <div className="flex items-center justify-end gap-1.5 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                          {/* Toggle Pago Rápido */}
                          <button
                            type="button"
                            onClick={(ev) => handleTogglePaid(e, ev)}
                            data-icon-btn="true"
                            className={`w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] rounded-[4px] flex items-center justify-center shrink-0 transition-all border cursor-pointer active:scale-95 ${
                              e.paid
                                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 shadow-none"
                                : "bg-[#1b1b1e] border-[#26262a] text-[#8b8b92] hover:text-[#f2f2f3] hover:border-[#38383f]"
                            }`}
                            title={e.paid ? "Marcar como Pendente" : "Marcar como Pago"}
                          >
                            <Check size={16} />
                          </button>

                          {/* Editar Despesa */}
                          <button
                            type="button"
                            onClick={(ev) => handleOpenEditModal(e, ev)}
                            data-icon-btn="true"
                            className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] rounded-[4px] flex items-center justify-center shrink-0 transition-all border cursor-pointer active:scale-95 bg-[#1b1b1e] border-[#26262a] text-[var(--gm-primary,#FE540B)] hover:bg-[#26262a] hover:border-[#38383f] shadow-none"
                            title="Editar despesa"
                          >
                            <Pencil size={14} />
                          </button>

                          {/* Excluir / Restaurar */}
                          {tab === "active" || tab === "recurring" ? (
                            <button
                              data-icon-btn="true"
                              className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] rounded-[4px] bg-[#1b1b1e] text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all flex items-center justify-center shrink-0 border border-[#26262a] cursor-pointer active:scale-95"
                              onClick={() => softDeleteExpense(e.id)}
                              title="Mover para lixeira"
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <>
                              <button
                                data-icon-btn="true"
                                className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] rounded-[4px] bg-[#1b1b1e] text-[#f2f2f3] hover:bg-[#26262a] transition-all flex items-center justify-center shrink-0 border border-[#26262a] cursor-pointer active:scale-95"
                                onClick={() => restoreExpense(e.id)}
                                title="Restaurar"
                              >
                                <RotateCcw size={14} />
                              </button>
                              <button
                                data-icon-btn="true"
                                className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] rounded-[4px] bg-red-600 text-white hover:bg-red-500 transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95 shadow-none"
                                onClick={() => setDeleteConfirmId(e.id)}
                                title="Excluir definitivo"
                              >
                                <Trash2 size={14} />
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
                          className="overflow-hidden bg-[#0B0B0C] border-t border-b border-orange-500/30 px-6 py-5"
                        >
                          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#26262A] flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-[2px] bg-orange-400" />
                              <span className="text-xs font-black uppercase tracking-widest text-orange-400 font-mono">
                                Propriedades da Despesa
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(ev) => handleOpenEditModal(e, ev)}
                                className="h-8 px-3 rounded-[6px] bg-[#1B1B1E] hover:bg-[#26262A] text-white/80 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-[#26262A] cursor-pointer whitespace-nowrap shrink-0"
                                title="Abrir em modal completo"
                              >
                                <Pencil size={12} className="text-orange-400" />
                                <span>Abrir Modal</span>
                              </button>
                              <button
                                type="button"
                                disabled={isSavingInline}
                                onClick={() => handleSaveInline(e.id)}
                                className="h-8 px-4 rounded-[6px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
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
                              <label className="text-[11px] uppercase font-bold tracking-wider text-zinc-400">
                                Descrição da Despesa
                              </label>
                              <input
                                type="text"
                                className="bg-[#131315] border border-[#26262A] rounded-[4px] px-3.5 py-2.5 text-sm text-white font-semibold outline-none focus:border-orange-500 transition-colors"
                                value={editDesc}
                                onChange={(ev) => setEditDesc(ev.target.value)}
                                placeholder="Nome da conta, fornecedor..."
                              />
                            </div>

                            {/* Valor */}
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[11px] uppercase font-bold tracking-wider text-zinc-400">
                                Valor (R$)
                              </label>
                              <input
                                type="text"
                                className="bg-[#131315] border border-[#26262A] rounded-[4px] px-3.5 py-2.5 text-sm text-emerald-400 font-mono tabular-nums font-extrabold outline-none focus:border-emerald-500 transition-colors"
                                value={editAmount}
                                onChange={(ev) => setEditAmount(ev.target.value)}
                                placeholder="0,00"
                              />
                            </div>

                            {/* Vencimento */}
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[11px] uppercase font-bold tracking-wider text-zinc-400">
                                Data de Vencimento
                              </label>
                              <GlassDatePicker
                                className="w-full bg-[#131315] border border-[#26262A] rounded-[4px] px-3.5 py-2.5 text-sm text-white font-semibold outline-none focus:border-orange-500 transition-colors flex items-center min-h-[42px]"
                                value={editDueDate}
                                onChange={setEditDueDate}
                                title="Vencimento"
                              />
                            </div>

                            {/* Lembrete / Alerta por Data e Hora */}
                            <div className="flex flex-col gap-1.5 md:col-span-2 bg-[#131315] border border-[#26262A] p-3.5 rounded-md">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] uppercase font-bold tracking-wider text-yellow-300 flex items-center gap-1.5">
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
                                    <span className="text-[11px] text-zinc-400 block mb-1">Data do Alerta</span>
                                    <GlassDatePicker
                                      className="w-full bg-[#0B0B0C] border border-[#26262A] rounded-[4px] px-3 py-1.5 text-xs text-white font-semibold"
                                      value={editReminderDate}
                                      onChange={setEditReminderDate}
                                      title="Data do Alerta"
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[11px] text-zinc-400 block mb-1">Horário do Alerta</span>
                                    <GlassTimePicker
                                      value={editReminderTime}
                                      onChange={setEditReminderTime}
                                      className="w-full bg-[#0B0B0C] border border-[#26262A] rounded-[4px] px-3 py-1.5 text-xs text-white font-semibold"
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
                                className={`flex-1 flex items-center justify-between p-3 rounded-md border cursor-pointer transition-all ${
                                  editIsRecurring
                                    ? "bg-orange-500/15 border-orange-500/40 text-orange-300"
                                    : "bg-[#131315] border-[#26262A] text-zinc-400 hover:text-white hover:border-[#3F3F46]"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Repeat size={16} className={editIsRecurring ? "text-orange-400" : "text-zinc-500"} />
                                  <div className="flex flex-col text-left">
                                    <span className="text-xs font-bold">Despesa Recorrente</span>
                                    <span className="text-[11px] opacity-75">Repetir automaticamente todo mês</span>
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
                                className={`flex-1 flex items-center justify-between p-3 rounded-md border cursor-pointer transition-all ${
                                  editPaid
                                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                                    : "bg-[#131315] border-[#26262A] text-zinc-400 hover:text-white hover:border-[#3F3F46]"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Check size={16} className={editPaid ? "text-emerald-400" : "text-zinc-500"} />
                                  <div className="flex flex-col text-left">
                                    <span className="text-xs font-bold">Status do Pagamento</span>
                                    <span className="text-[11px] opacity-75">
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
                          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-[#26262A]">
                            <button
                              type="button"
                              onClick={() => setExpandedRowId(null)}
                              className="h-9 px-4 rounded-[6px] text-xs font-bold text-zinc-300 hover:text-white bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] transition-all cursor-pointer whitespace-nowrap shrink-0"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              disabled={isSavingInline}
                              onClick={() => handleSaveInline(e.id)}
                              className="h-9 px-5 rounded-[6px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
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
            className="fixed inset-0 z-[1000] bg-black/75 flex items-center justify-center p-4 sm:p-6 md:p-8 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-2xl lg:max-w-3xl max-h-[92vh] flex flex-col rounded-lg border border-[#26262A] overflow-hidden shadow-2xl relative z-10 p-0 my-auto bg-[#131315] text-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header do Modal (Pinned) */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#26262A] bg-[#131315] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[6px] border border-[color:var(--gm-primary)]/40 bg-[color:var(--gm-primary)]/15 flex items-center justify-center text-[color:var(--gm-primary)]">
                    <Pencil size={18} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white leading-tight">
                      Editar Despesa
                    </h3>
                    <p className="text-xs text-zinc-400 font-medium mt-0.5">
                      Atualize os dados e confirme no botão Salvar Alterações
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-9 h-9 rounded-[4px] flex items-center justify-center text-zinc-400 hover:text-white bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] transition-colors cursor-pointer shrink-0"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Formulário com Grade Espaçosa & Pinned Action Bar */}
              <form
                onSubmit={(ev) => {
                  ev.preventDefault();
                  if (editingExpenseId) handleSaveExpense(editingExpenseId);
                }}
                className="flex flex-col flex-1 min-h-0 overflow-hidden"
              >
                {/* Scrollable Form Body */}
                <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
                  {/* Descrição da Despesa */}
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-zinc-300 block mb-2">
                      Descrição da Despesa *
                    </label>
                    <input
                      className="w-full h-11 bg-[#0B0B0C] border border-[#26262A] focus:border-orange-500 rounded-[4px] px-4 text-sm text-white font-semibold outline-none transition-all placeholder:text-zinc-600"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Ex: Conta de Luz, Aluguel, Fornecedor..."
                      required
                      autoFocus
                    />
                  </div>

                  {/* Valor e Vencimento em 2 Colunas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <label className="text-xs uppercase font-bold tracking-wider text-zinc-300 block mb-2">
                        Valor da Conta (R$) *
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-xs font-bold text-zinc-500 font-mono">
                          R$
                        </span>
                        <input
                          className="w-full h-11 bg-[#0B0B0C] border border-[#26262A] focus:border-emerald-500 rounded-[4px] pl-10 pr-4 text-base text-emerald-400 font-mono tabular-nums font-extrabold outline-none transition-all placeholder:text-emerald-400/30"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          placeholder="0,00"
                          inputMode="decimal"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs uppercase font-bold tracking-wider text-zinc-300 block mb-2">
                        Data de Vencimento *
                      </label>
                      <GlassDatePicker
                        className="w-full h-11 bg-[#0B0B0C] border border-[#26262A] focus:border-orange-500 rounded-[4px] px-4 text-sm text-white font-semibold outline-none transition-all flex items-center"
                        value={editDueDate}
                        onChange={setEditDueDate}
                        title="Vencimento"
                      />
                    </div>
                  </div>

                  {/* Bloco de Lembrete / Notificação */}
                  <div className="bg-[#0B0B0C] border border-[#26262A] rounded-md p-4 space-y-3.5 transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[6px] bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shrink-0">
                          <Bell size={16} />
                        </div>
                        <div>
                          <span className="text-xs sm:text-sm font-bold text-white block">
                            Notificação / Lembrete de Pagamento
                          </span>
                          <span className="text-[11px] text-zinc-400 block">
                            Receba aviso sonoro e visual no horário programado
                          </span>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#26262A]">
                        <div>
                          <label className="text-[11px] font-bold text-zinc-400 block mb-1.5">
                            Data do Alerta
                          </label>
                          <GlassDatePicker
                            className="w-full h-10 bg-[#131315] border border-[#26262A] focus:border-yellow-500 rounded-[4px] px-3.5 text-sm text-white font-semibold"
                            value={editReminderDate}
                            onChange={setEditReminderDate}
                            title="Data do Alerta"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-zinc-400 block mb-1.5">
                            Horário do Alerta
                          </label>
                          <GlassTimePicker
                            value={editReminderTime}
                            onChange={setEditReminderTime}
                            className="w-full h-10 bg-[#131315] border border-[#26262A] focus:border-yellow-500 rounded-[4px] px-3.5 text-sm text-white font-semibold"
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
                      className={`p-4 rounded-md border cursor-pointer transition-all flex items-center justify-between ${
                        editIsRecurring
                          ? "bg-orange-500/15 border-orange-500/40 text-orange-300"
                          : "bg-[#0B0B0C] border-[#26262A] text-zinc-400 hover:text-white hover:border-[#3F3F46]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Repeat size={18} className={editIsRecurring ? "text-orange-400" : "text-zinc-500"} />
                        <div>
                          <span className="text-xs sm:text-sm font-bold block">Despesa Recorrente</span>
                          <span className="text-[11px] opacity-75 block">
                            Repete automaticamente todo mês
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={editIsRecurring}
                        onChange={() => {}}
                        className="w-4 h-4 accent-orange-500 cursor-pointer"
                      />
                    </div>

                    {/* Status Pago */}
                    <div
                      onClick={() => setEditPaid(!editPaid)}
                      className={`p-4 rounded-md border cursor-pointer transition-all flex items-center justify-between ${
                        editPaid
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                          : "bg-[#0B0B0C] border-[#26262A] text-zinc-400 hover:text-white hover:border-[#3F3F46]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Check size={18} className={editPaid ? "text-emerald-400" : "text-zinc-500"} />
                        <div>
                          <span className="text-xs sm:text-sm font-bold block">Status do Pagamento</span>
                          <span className="text-[11px] opacity-75 block">
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

                {/* Ações do Modal Pinned com BOTÃO DE SALVAR ALTERAÇÕES EM DESTAQUE */}
                <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[#26262A] bg-[#131315] shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="forge-btn forge-btn--secondary rounded-[6px] h-10 px-5 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingInline}
                    className="forge-btn forge-btn--primary rounded-[6px] h-10 px-6 text-xs font-semibold cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    {isSavingInline ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        <span>Salvando alterações...</span>
                      </div>
                    ) : (
                      <>
                        <Save size={15} />
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
            className="fixed inset-0 z-[1000] bg-black/75 flex items-center justify-center p-4 sm:p-6 md:p-8 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowNewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-2xl lg:max-w-3xl max-h-[92vh] flex flex-col rounded-lg border border-[#26262A] overflow-hidden shadow-2xl relative z-10 p-0 my-auto bg-[#131315] text-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header do Modal (Pinned) */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#26262A] bg-[#131315] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[6px] border border-[color:var(--gm-primary)]/40 bg-[color:var(--gm-primary)]/15 flex items-center justify-center text-[color:var(--gm-primary)]">
                    <Plus size={20} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white leading-tight">
                      Cadastrar Nova Despesa
                    </h3>
                    <p className="text-xs text-zinc-400 font-medium mt-0.5">
                      Preencha os detalhes da conta para acompanhamento financeiro
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="w-9 h-9 rounded-[4px] flex items-center justify-center text-zinc-400 hover:text-white bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] transition-colors cursor-pointer shrink-0"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Formulário com Grade Espaçosa & Pinned Action Bar */}
              <form onSubmit={handleCreateNew} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Scrollable Form Body */}
                <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
                {/* Descrição da Despesa */}
                <div>
                  <label className="text-xs uppercase font-bold tracking-wider text-zinc-300 block mb-2">
                    Descrição da Despesa *
                  </label>
                  <input
                    className="w-full h-11 bg-[#0B0B0C] border border-[#26262A] focus:border-orange-500 rounded-[4px] px-4 text-sm text-white font-semibold outline-none transition-all placeholder:text-zinc-600"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Ex: Conta de Luz, Internet Fibra, Fornecedor de Alvenaria..."
                    autoFocus
                  />
                </div>

                {/* Valor e Vencimento em 2 Colunas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-zinc-300 block mb-2">
                      Valor da Conta (R$) *
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-xs font-bold text-zinc-500 font-mono">
                        R$
                      </span>
                      <input
                        className="w-full h-11 bg-[#0B0B0C] border border-[#26262A] focus:border-emerald-500 rounded-[4px] pl-10 pr-4 text-base text-emerald-400 font-mono tabular-nums font-extrabold outline-none transition-all placeholder:text-emerald-400/30"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        placeholder="0,00"
                        inputMode="decimal"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-zinc-300 block mb-2">
                      Data de Vencimento *
                    </label>
                    <GlassDatePicker
                      className="w-full h-11 bg-[#0B0B0C] border border-[#26262A] focus:border-orange-500 rounded-[4px] px-4 text-sm text-white font-semibold outline-none transition-all flex items-center"
                      value={newDueDate}
                      onChange={setNewDueDate}
                      title="Vencimento"
                    />
                  </div>
                </div>

                {/* Bloco de Lembrete / Notificação */}
                <div className="bg-[#0B0B0C] border border-[#26262A] rounded-md p-4 space-y-3.5 transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-[6px] bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shrink-0">
                        <Bell size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-bold text-white">
                          Ativar Lembrete / Alerta Programado
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          Receba aviso no sistema e smartphone antes do vencimento
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#26262A]">
                      <div>
                        <span className="text-[11px] font-bold text-zinc-400 block mb-1.5">
                          Data do Alerta
                        </span>
                        <GlassDatePicker
                          className="w-full h-10 bg-[#131315] border border-[#26262A] rounded-[4px] px-3.5 text-sm text-white font-semibold"
                          value={newReminderDate}
                          onChange={setNewReminderDate}
                          title="Data do Alerta"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-zinc-400 block mb-1.5">
                          Horário do Alerta
                        </span>
                        <GlassTimePicker
                          value={newReminderTime}
                          onChange={setNewReminderTime}
                          className="w-full h-10 bg-[#131315] border border-[#26262A] rounded-[4px] px-3.5 text-sm text-white font-semibold"
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
                    className={`flex items-center justify-between p-4 rounded-md border cursor-pointer transition-all select-none ${
                      newIsRecurring
                        ? "bg-orange-500/15 border-orange-500/40 text-orange-300"
                        : "bg-[#0B0B0C] border-[#26262A] text-zinc-400 hover:text-white hover:border-[#3F3F46]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center ${newIsRecurring ? 'bg-orange-500/20 text-orange-400' : 'bg-[#1B1B1E] text-zinc-500'}`}>
                        <Repeat size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-bold">Despesa Recorrente</span>
                        <span className="text-[11px] opacity-75">Lança automaticamente todo mês</span>
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
                    className={`flex items-center justify-between p-4 rounded-md border cursor-pointer transition-all select-none ${
                      newPaid
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                        : "bg-[#0B0B0C] border-[#26262A] text-zinc-400 hover:text-white hover:border-[#3F3F46]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center ${newPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1B1B1E] text-zinc-500'}`}>
                        <Check size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-bold">Status do Pagamento</span>
                        <span className="text-[11px] opacity-75">
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
                </div>

                {/* Ações do Modal Pinned */}
                <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[#26262A] bg-[#131315] shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="forge-btn forge-btn--secondary rounded-[6px] h-10 px-5 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="forge-btn forge-btn--primary rounded-[6px] h-10 px-6 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus size={15} />
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
            className="fixed inset-0 z-[1000] bg-black/75 flex items-center justify-center p-4 sm:p-6 md:p-8 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-2xl rounded-lg border border-[#26262A] overflow-hidden shadow-2xl relative z-10 p-0 my-auto bg-[#131315] text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#26262A] bg-[#131315]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[6px] border border-emerald-500/40 bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <Share2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Relatório Mensal de Despesas</h3>
                    <p className="text-xs text-zinc-400 font-medium mt-0.5">
                      Copie o resumo formatado ou envie diretamente para o WhatsApp
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="w-9 h-9 rounded-[4px] flex items-center justify-center text-zinc-400 hover:text-white bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] transition-colors cursor-pointer shrink-0"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-[#0B0B0C] border border-[#26262A] rounded-md p-5 text-xs sm:text-sm font-mono text-zinc-200 whitespace-pre-wrap max-h-[340px] overflow-y-auto leading-relaxed">
                  {generateReportText()}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="forge-btn forge-btn--secondary rounded-[6px] h-10 px-5 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {copiedReport ? (
                      <>
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={15} />
                        <span>Copiar Relatório</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="forge-btn forge-btn--primary rounded-[6px] h-10 px-5 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <MessageSquare size={15} />
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
            className="fixed inset-0 z-[1000] bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-lg overflow-hidden border border-[#26262A] bg-[#131315] text-[#f2f2f3] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-red-500/10 rounded-md flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                  <Trash2 size={22} className="text-red-500" />
                </div>
                <h3 className="text-lg font-extrabold text-white mb-2">Excluir Definitivamente?</h3>
                <p className="text-[#8b8b92] text-xs mb-5 leading-relaxed font-mono">
                  Esta ação não pode ser desfeita. A despesa será removida permanentemente do sistema.
                </p>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="forge-btn forge-btn--secondary rounded-[6px] flex-1 h-10 text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <X size={14} />
                    <span>Cancelar</span>
                  </button>
                  <button
                    type="button"
                    onClick={hardDelete}
                    className="forge-btn bg-red-600 hover:bg-red-500 text-white border border-red-600 rounded-[6px] flex-1 h-10 text-xs font-bold cursor-pointer shadow-none inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Trash2 size={14} />
                    <span>Excluir</span>
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
                className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-hidden"
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
                  className="w-full max-w-[420px] sm:max-w-md rounded-[10px] border border-[#26262A] bg-[#131315] shadow-2xl relative z-10 overflow-hidden flex flex-col m-auto h-auto max-h-[88dvh] sm:max-h-[90dvh] text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header do Modal */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#26262A] bg-[#131315] shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[6px] border border-[color:var(--gm-primary)]/40 bg-[color:var(--gm-primary)]/15 flex items-center justify-center text-[color:var(--gm-primary)] shrink-0">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-white leading-tight">Mês de Referência</h3>
                        <p className="text-xs text-zinc-400 font-medium leading-none mt-1">
                          Selecione o mês para filtrar despesas
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMonthModal(false)}
                      className="w-9 h-9 rounded-[4px] flex items-center justify-center text-zinc-400 hover:text-white bg-[#1B1B1E] hover:bg-[#26262A] transition-colors cursor-pointer shrink-0 border border-[#26262A]"
                      title="Fechar"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3 sm:gap-4 overflow-y-auto">
                    {/* Seletor de Ano */}
                    <div className="flex items-center justify-between bg-[#0B0B0C] border border-[#26262A] rounded-md p-2 sm:p-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPickerYear((y) => y - 1)}
                        className="w-10 h-10 rounded-[4px] bg-[#1B1B1E] hover:bg-[#26262A] text-white flex items-center justify-center transition-all cursor-pointer border border-[#26262A] active:scale-95"
                        title="Ano anterior"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl sm:text-3xl font-black text-white tracking-wider font-mono tabular-nums">
                          {pickerYear}
                        </span>
                        {pickerYear === new Date().getFullYear() && (
                          <span className="px-2 py-0.5 rounded-[4px] text-[11px] font-black uppercase bg-orange-500/20 text-orange-400 border border-orange-500/40 tracking-wider">
                            Atual
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPickerYear((y) => y + 1)}
                        className="w-10 h-10 rounded-[4px] bg-[#1B1B1E] hover:bg-[#26262A] text-white flex items-center justify-center transition-all cursor-pointer border border-[#26262A] active:scale-95"
                        title="Próximo ano"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>

                    {/* Grade de 12 Meses */}
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
                            className={`relative p-2 sm:p-2.5 rounded-md border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer h-full min-h-[66px] sm:min-h-[60px] active:scale-95 ${
                              isSelected
                                ? "bg-orange-500/20 border-orange-500 text-white font-black"
                                : "bg-[#0B0B0C] border-[#26262A] text-zinc-300 hover:text-white hover:bg-[#1B1B1E] hover:border-[#3F3F46] font-bold"
                            }`}
                          >
                            <span className={`text-[11px] uppercase font-mono tabular-nums tracking-wider leading-none ${isSelected ? "text-orange-400 font-black" : "text-zinc-500"}`}>
                              {mItem.value} • {mItem.short}
                            </span>
                            <span className="text-xs sm:text-sm font-black truncate max-w-full leading-tight">
                              {mItem.name}
                            </span>
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-2 h-2 rounded-[2px] bg-orange-500" />
                            )}
                            {isCurrentRealMonth && !isSelected && (
                              <div className="absolute top-2 right-2 w-2 h-2 rounded-[2px] bg-emerald-400" title="Mês atual" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Botões Rápidos no Rodapé do Modal */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#26262A] shrink-0">
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
                        className="h-10 px-4 rounded-[6px] bg-[#1B1B1E] hover:bg-[#26262A] text-[#F2F2F3] border border-[#26262A] text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Clock size={15} className="text-emerald-400 shrink-0" />
                        <span>Mês Atual</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowMonthModal(false)}
                        className="h-10 px-6 rounded-[6px] bg-[var(--gm-btn-bg,var(--gm-primary,#FE540B))] hover:brightness-110 text-[var(--gm-primary-foreground,#0B0B0C)] border border-[var(--gm-btn-border,var(--gm-primary,#FE540B))] text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 whitespace-nowrap"
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

      <PlanLockedNotice
        variant="modal"
        isOpen={Boolean(lockModal)}
        onClose={() => setLockModal(null)}
        title={lockModal?.title || "Recurso Bloqueado no Plano Atual"}
        reason={lockModal?.reason}
        requiredPlan={lockModal?.requiredPlan || "intermediario"}
        currentPlanName={subscription.planName}
        isExpired={isExpired}
      />
    </Page>
  );
}
