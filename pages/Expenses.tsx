import React, { useEffect, useMemo, useState } from "react";
import { Page } from "../components/ui/Page";
import { Card } from "../components/ui/Card";
import { supabase } from "../lib/supabase";
import { softDelete as softDeleteApi, restore as restoreApi } from "../lib/trash";
import { Plus, Trash2, Pencil, Calendar, Check, Clock, X, Save, RotateCcw } from "lucide-react";
import { GlassDatePicker } from "../components/ui/GlassDatePicker";

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
};

type ExpenseUI = {
  id: string;
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  paid: boolean;
  deleted_at?: string | null;
};

function monthRange(monthYYYYMM: string) {
  // monthYYYYMM = "2026-02"
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
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [tab, setTab] = useState<"active" | "trash">("active");

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isPaid, setIsPaid] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  async function loadExpenses() {
    setLoading(true);
    try {
      const { startISO, nextISO } = monthRange(month);

      let q = supabase
        .from("expenses")
        .select("id, description, amount, due_date, paid, deleted_at, created_at, tenant_id, user_id")
        .order("due_date", { ascending: false });

      /**
       * ✅ IMPORTANTE:
       * Não filtramos por tenant_id aqui.
       * Quem garante o isolamento multi-tenant é o RLS do Supabase.
       * Isso evita “sumiu tudo” quando o tenantId do front fica errado/desatualizado.
       */

      // Aba Ativas/Lixeira
      if (tab === "active") q = q.is("deleted_at", null);
      else q = q.not("deleted_at", "is", null);

      // Filtro do mês no BANCO
      q = q.gte("due_date", startISO).lt("due_date", nextISO);

      const { data, error } = await q;
      if (error) throw error;

      const rows = ((data as ExpenseRow[]) || []).map((r) => ({
        id: r.id,
        description: r.description,
        amount: Number(r.amount) || 0,
        dueDate: r.due_date ? String(r.due_date) : "",
        paid: !!r.paid,
        deleted_at: r.deleted_at ?? null,
      }));

      setExpenses(rows);
    } catch (e) {
      console.error(e);
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

  const handleOpenNew = () => {
    setEditingId(null);
    setDesc("");
    setAmount("");
    setDueDate(new Date().toISOString().split("T")[0]);
    setIsPaid(false);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEdit = (ex: ExpenseUI) => {
    setEditingId(ex.id);
    setDesc(ex.description);
    setAmount(String(ex.amount));
    setDueDate(ex.dueDate);
    setIsPaid(ex.paid);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setDeleteConfirmId(null);
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!desc.trim() || !dueDate) {
      alert("Preencha descrição e data.");
      return;
    }

    const payload: any = {
      description: desc.trim(),
      amount: Number(String(amount).replace(",", ".") || 0),
      due_date: dueDate,
      paid: isPaid,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from("expenses").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("expenses").insert(payload);
        if (error) throw error;
      }

      handleCancel();
      await loadExpenses();
    } catch (err: any) {
      alert(err?.message || "Erro ao salvar.");
    }
  }

  async function softDeleteExpense(id: string) {
    try {
      await softDeleteApi("expenses", id);
      await loadExpenses();
    } catch (e: any) {
      alert(e?.message || "Erro ao excluir.");
    }
  }

  async function restoreExpense(id: string) {
    try {
      await restoreApi("expenses", id);
      await loadExpenses();
    } catch (e: any) {
      alert(e?.message || "Erro ao restaurar.");
    }
  }

  const confirmHardDelete = (id: string) => setDeleteConfirmId(id);

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
        <button className="gm-btn" type="button" onClick={handleOpenNew}>
          <Plus size={16} />
          Nova Despesa
        </button>
      }
    >
      <Card className="mb-6 gm-compact">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-400" />
            <input
              className="gm-input"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{ maxWidth: 180 }}
            />
          </div>

          <div className="gm-tabs">
            <button className={`gm-tab ${tab === "active" ? "active" : ""}`} onClick={() => setTab("active")}>
              Ativas
            </button>
            <button 
              className={`px-4 py-2 rounded-lg text-xs font-black tracking-widest uppercase transition-all duration-300 whitespace-nowrap border-2 ${
                tab === "trash"
                  ? "bg-[var(--gm-primary)]/20 border-[var(--gm-primary)] text-[var(--gm-primary)] shadow-[0_0_15px_var(--gm-primary-20)]"
                  : "bg-black/40 border-[var(--gm-primary)]/20 text-[var(--gm-primary)] hover:bg-[var(--gm-primary)]/10 hover:border-[var(--gm-primary)]/40 hover:text-[var(--gm-primary)] shadow-none"
              }`}
              onClick={() => setTab("trash")}
            >
              Lixeira
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-3 flex-wrap">
          <div className="gm-pill-neon-green">
            <Check size={14} /> Pago: {CURRENCY_FORMATTER.format(totalPago)}
          </div>
          <div className="gm-pill-neon-red">
            <Clock size={14} /> Pendente: {CURRENCY_FORMATTER.format(totalPendente)}
          </div>
          <button type="button" className="gm-btn gm-btn-outline text-sm" onClick={() => loadExpenses()} title="Recarregar">
            <RotateCcw size={16} />
            Atualizar
          </button>
        </div>
      </Card>

      {showForm && (
        <Card className="mb-6 animate-fade-in border-[var(--gm-primary)]/30 bg-zinc-900/60 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--gm-primary)]" />
          <div className="pl-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {editingId ? <Pencil size={18} className="text-[var(--gm-primary)]" /> : <Plus size={18} className="text-[var(--gm-accent)]" />}
                {editingId ? "Editar Despesa" : "Nova Despesa"}
              </h3>
              <button
                onClick={handleCancel}
                className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="gm-label ml-1">Descrição</label>
                  <input
                    className="gm-input"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Ex: Conta de luz"
                  />
                </div>

                <div>
                  <label className="gm-label ml-1">Valor</label>
                  <input
                    className="gm-input"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    inputMode="decimal"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="gm-label ml-1">Vencimento</label>
                  <GlassDatePicker className="gm-input min-w-[140px]" value={dueDate} onChange={setDueDate} title="Vencimento" />
                </div>

                <div className="md:col-span-2 flex items-center gap-2">
                  <input id="paid" type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
                  <label htmlFor="paid" className="text-sm text-slate-200">
                    Marcado como pago
                  </label>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button className="gm-btn" type="submit">
                  <Save size={16} />
                  Salvar
                </button>
                <button className="gm-btn gm-btn-outline" type="button" onClick={handleCancel}>
                  <X size={16} />
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </Card>
      )}

      <Card className="mb-24">
        {loading ? (
          <div className="p-8 text-center opacity-60">Carregando...</div>
        ) : expenses.length === 0 ? (
          <div className="p-10 text-center opacity-60">
            <div className="text-lg font-bold">Tudo limpo!</div>
            <div className="text-sm">Nenhuma despesa encontrada para {month.replace("-", "/")}.</div>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {expenses.map((e) => (
              <div key={e.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="font-bold text-slate-100">{e.description}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <Calendar size={12} />
                    {e.dueDate ? new Date(e.dueDate).toLocaleDateString("pt-BR") : "-"}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                  <div className={`text-lg font-extrabold ${e.paid ? "text-[var(--gm-accent)]" : "text-[var(--gm-primary)]"}`}>
                    {CURRENCY_FORMATTER.format(e.amount)}
                  </div>

                  <div className="flex gap-2">
                    <button className="gm-btn gm-btn-icon gm-btn-soft" onClick={() => handleEdit(e)} title="Editar">
                      <Pencil size={16} />
                    </button>

                    {tab === "active" ? (
                      <button
                        className="h-10 w-10 rounded-xl bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/20 hover:bg-[var(--gm-primary)] hover:text-white text-[var(--gm-primary)] transition-all flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(255,123,0,0.1)]"
                        onClick={() => softDeleteExpense(e.id)}
                        title="Mover para lixeira"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <>
                        <button className="gm-btn gm-btn-icon gm-btn-soft" onClick={() => restoreExpense(e.id)} title="Restaurar">
                          <RotateCcw size={16} />
                        </button>
                        <button
                          className="h-10 w-10 rounded-xl bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/20 hover:bg-[var(--gm-primary)] hover:text-white text-[var(--gm-primary)] transition-all flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(255,123,0,0.1)]"
                          onClick={() => confirmHardDelete(e.id)}
                          title="Excluir definitivo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteConfirmId(null)}>
          <div className="gm-card w-full max-w-sm rounded-[32px] overflow-hidden !border-white/10 relative z-10 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-[var(--gm-primary)]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[var(--gm-primary)]/20 shadow-[0_0_15px_var(--gm-primary-10)]">
                <Trash2 size={32} className="text-[var(--gm-primary)]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Excluir Definitivamente?</h3>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                Esta ação não pode ser desfeita. A despesa será removida permanentemente do sistema.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="gm-btn gm-btn-outline flex-1 h-12 rounded-xl text-xs uppercase tracking-widest font-black"
                >
                  Cancelar
                </button>
                <button
                  onClick={hardDelete}
                  className="gm-btn flex-1 h-12 rounded-xl text-xs uppercase tracking-widest font-black shadow-[0_4px_15px_rgba(255,122,0,0.3)]"
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