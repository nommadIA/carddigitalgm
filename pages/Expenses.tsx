
import React, { useEffect, useMemo, useState } from 'react';
import { Page } from '../components/ui/Page';
import { Card } from '../components/ui/Card';
import { Grid } from '../components/ui/Grid';
import { supabase } from '../lib/supabase';
import { softDelete as softDeleteApi, restore as restoreApi } from '../lib/trash';
import { Plus, Trash2, Pencil, DollarSign, Calendar, Check, Clock, X, Save, AlignLeft, RotateCcw, ShieldAlert } from 'lucide-react';

const CURRENCY_FORMATTER = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR');

type ExpenseRow = {
  id: string;
  description: string;
  amount: number;
  due_date: string | null;
  paid: boolean;
  created_at?: string;
  deleted_at?: string | null;
};

type ExpenseUI = {
  id: string;
  description: string;
  amount: number;
  dueDate: string; // UI
  paid: boolean;
  deleted_at?: string | null;
};

export default function Expenses() {
  const [expenses, setExpenses] = useState<ExpenseUI[]>([]);
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [tab, setTab] = useState<'active' | 'trash'>('active');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isPaid, setIsPaid] = useState(false);

  // Hard delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  async function loadExpenses() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('due_date', { ascending: false });

      if (error) throw error;

      const rows = ((data as ExpenseRow[]) || []).map((r) => ({
        id: r.id,
        description: r.description,
        amount: Number(r.amount) || 0,
        dueDate: r.due_date ? String(r.due_date) : '',
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

  useEffect(() => { loadExpenses(); }, []);

  const filtered = useMemo(() => {
    const base = expenses.filter(e => (tab === 'trash' ? !!e.deleted_at : !e.deleted_at));
    // Filtra pelo mês selecionado na UI
    return base.filter(e => (e.dueDate || '').startsWith(month));
  }, [expenses, tab, month]);

  const totalPago = useMemo(
    () => filtered.filter(e => e.paid).reduce((a, b) => a + (Number(b.amount) || 0), 0),
    [filtered]
  );
  const totalPendente = useMemo(
    () => filtered.filter(e => !e.paid).reduce((a, b) => a + (Number(b.amount) || 0), 0),
    [filtered]
  );

  // Ações do Formulário
  const handleOpenNew = () => {
    setEditingId(null);
    setDesc('');
    setAmount('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setIsPaid(false);
    setShowForm(true);
    // Scroll suave para o topo para ver o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (ex: ExpenseUI) => {
    setEditingId(ex.id);
    setDesc(ex.description);
    setAmount(String(ex.amount));
    setDueDate(ex.dueDate);
    setIsPaid(ex.paid);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!desc.trim() || !dueDate) {
      alert("Preencha descrição e data.");
      return;
    }

    const payload = {
      description: desc.trim(),
      amount: Number(amount.replace(',', '.') || 0),
      due_date: dueDate,
      paid: isPaid
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('expenses').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expenses').insert(payload);
        if (error) throw error;
      }

      handleCancel();
      loadExpenses();
    } catch (err: any) {
      alert(err?.message || "Erro ao salvar.");
    }
  }

  async function softDeleteExpense(id: string) {
    try {
      await softDeleteApi("expenses", id);
      loadExpenses();
    } catch (e: any) {
      alert(e?.message || "Erro ao excluir.");
    }
  }

  async function restoreExpense(id: string) {
    try {
      await restoreApi("expenses", id);
      loadExpenses();
    } catch (e: any) {
      alert(e?.message || "Erro ao restaurar.");
    }
  }

  const confirmHardDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  async function hardDelete() {
    if (!deleteConfirmId) return;
    try {
      await supabase.from("expenses").delete().eq("id", deleteConfirmId);
      setDeleteConfirmId(null);
      loadExpenses();
    } catch (e: any) {
      alert(e?.message || "Erro ao excluir definitivamente.");
    }
  }

  return (
    <Page
      title="Despesas"
      subtitle="Controle de gastos e lançamentos"
      actions={
        <button
          className="gm-btn gm-border-loop"
          type="button"
          onClick={handleOpenNew}
        >
          <Plus size={16} />
          Nova Despesa
        </button>
      }
    >
      {/* CARD 1: Filtros e Resumo */}
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
            <button className={`gm-tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
              Ativas
            </button>
            <button className={`gm-tab ${tab === 'trash' ? 'active' : ''}`} onClick={() => setTab('trash')}>
              Lixeira
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-3 flex-wrap">
          <div className="gm-pill gm-pill-green">
            <Check size={14} /> Pago: {CURRENCY_FORMATTER.format(totalPago)}
          </div>
          <div className="gm-pill gm-pill-red">
            <Clock size={14} /> Pendente: {CURRENCY_FORMATTER.format(totalPendente)}
          </div>
        </div>
      </Card>

      {/* FORMULÁRIO DE EDIÇÃO (INLINE) - Aparece aqui quando showForm = true */}
      {showForm && (
        <Card className="mb-6 animate-fade-in border border-orange-500/30 bg-slate-900/60 backdrop-blur-xl relative overflow-hidden">
            {/* Faixa decorativa lateral */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
            
            <div className="pl-3">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {editingId ? <Pencil size={18} className="text-orange-500"/> : <Plus size={18} className="text-green-500"/>}
                        {editingId ? "Editar Despesa" : "Nova Despesa"}
                    </h3>
                    <button onClick={handleCancel} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSave}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Descrição */}
                        <div className="md:col-span-2">
                            <label className="gm-label ml-1">Descrição</label>
                            <div className="relative">
                                <AlignLeft size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                <input 
                                    className="gm-input pl-10 w-full bg-black/20 border-white/10 focus:border-orange-500 focus:bg-black/40 transition-all text-white placeholder-slate-600" 
                                    value={desc} 
                                    onChange={(e) => setDesc(e.target.value)} 
                                    placeholder="Ex: Conta de Luz, Aluguel..." 
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Valor */}
                        <div>
                            <label className="gm-label ml-1">Valor (R$)</label>
                            <div className="relative">
                                <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                <input 
                                    type="number"
                                    step="0.01"
                                    className="gm-input pl-10 w-full bg-black/20 border-white/10 focus:border-orange-500 focus:bg-black/40 transition-all text-white placeholder-slate-600 font-mono" 
                                    value={amount} 
                                    onChange={(e) => setAmount(e.target.value)} 
                                    placeholder="0.00" 
                                />
                            </div>
                        </div>

                        {/* Data */}
                        <div>
                            <label className="gm-label ml-1">Vencimento</label>
                            <input 
                                type="date" 
                                className="gm-input w-full bg-black/20 border-white/10 focus:border-orange-500 focus:bg-black/40 transition-all text-white" 
                                value={dueDate} 
                                onChange={e => setDueDate(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isPaid ? 'bg-green-500 border-green-500' : 'bg-transparent border-slate-500 group-hover:border-white'}`}>
                                {isPaid && <Check size={14} className="text-black" />}
                            </div>
                            <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={isPaid} 
                                onChange={(e) => setIsPaid(e.target.checked)} 
                            />
                            <span className={`text-sm font-medium ${isPaid ? 'text-green-400' : 'text-slate-400 group-hover:text-white'}`}>
                                Marcar como paga
                            </span>
                        </label>

                        <div className="flex gap-2">
                            <button type="button" className="gm-btn hover:bg-white/5 border-transparent text-slate-300" onClick={handleCancel}>
                                Cancelar
                            </button>
                            <button type="submit" className="gm-btn gm-border-loop px-6">
                                <Save size={18} />
                                Salvar
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </Card>
      )}

      {/* LISTAGEM */}
      {loading ? (
        <div className="p-10 text-center opacity-60">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center opacity-60 border-dashed">
            <div className="mb-2 text-xl font-bold">Tudo limpo!</div>
            Nenhuma despesa encontrada para {month.split('-').reverse().join('/')}.
        </Card>
      ) : (
        <Grid cols={2}>
          {filtered.map((ex) => (
            <Card key={ex.id} className="gm-compact hover:border-white/20 transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate text-base">{ex.description}</div>
                  <div className="mt-1 flex items-center gap-2 text-sm opacity-80">
                    <span className={`font-bold font-mono ${ex.paid ? 'text-green-400' : 'text-orange-400'}`}>
                        {CURRENCY_FORMATTER.format(ex.amount)}
                    </span>
                    {ex.paid && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded uppercase font-bold">Pago</span>}
                  </div>
                  <div className="mt-2 text-xs gm-muted flex items-center gap-1">
                    <Calendar size={12}/>
                    {ex.dueDate ? DATE_FORMATTER.format(new Date(ex.dueDate + 'T12:00:00')) : 'Sem data'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {tab === 'trash' ? (
                    <>
                    <button 
                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-green-500/20 hover:border-green-500/50 hover:text-green-400 flex items-center justify-center transition-all" 
                        onClick={() => restoreExpense(ex.id)} 
                        title="Restaurar"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button 
                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-500 flex items-center justify-center transition-all group/btn" 
                        onClick={() => setDeleteConfirmId(ex.id)} 
                        title="Excluir Definitivo"
                      >
                        <ShieldAlert size={16} className="group-hover/btn:scale-110 transition-transform"/>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-blue-500/20 hover:border-blue-500/50 hover:text-blue-400 flex items-center justify-center transition-all group/btn"
                        onClick={() => handleEdit(ex)}
                        title="Editar"
                      >
                        <Pencil size={16} className="group-hover/btn:scale-110 transition-transform"/>
                      </button>
                      
                      <button 
                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-500 flex items-center justify-center transition-all group/btn" 
                        onClick={() => softDeleteExpense(ex.id)} 
                        title="Excluir"
                      >
                        <Trash2 size={16} className="group-hover/btn:scale-110 transition-transform"/>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </Grid>
      )}
      {/* Hard Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-slate-900 border border-red-500/30 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <ShieldAlert size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Excluir Definitivamente?</h3>
              <p className="text-slate-400 text-sm mb-6">
                Esta ação não pode ser desfeita. A despesa será removida permanentemente do sistema.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 text-slate-300 font-medium hover:bg-white/5 rounded-xl transition-colors border border-white/10"
                >
                  Cancelar
                </button>
                <button
                  onClick={hardDelete}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all"
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
