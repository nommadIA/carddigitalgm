
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ShoppingCart, Trash2, Camera, Check, DollarSign, Wallet, Loader2, X, Sparkles, Share2, History, Mail, Copy, Calendar } from 'lucide-react';
import { WhatsAppIcon } from '../components/ui/WhatsAppIcon';
import { CURRENCY_FORMATTER } from '../constants';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/AuthContext';
import { Page } from "../components/ui/Page";
import { Grid } from "../components/ui/Grid";
import { Card } from "../components/ui/Card";
import { motion, AnimatePresence } from 'motion/react';

type CartItem = {
  id: string;
  name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  created_at: string;
};

type MarketHistory = {
  month: string;
  total: number;
  count: number;
};

const Market = () => {
  const { tenantId, user } = useAuth();
  
  const [walletBalance, setWalletBalance] = useState(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<MarketHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [addingItem, setAddingItem] = useState(false);
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [toppingUp, setToppingUp] = useState(false);
  
  const [shareData, setShareData] = useState<{ title: string; message: string } | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showDeleteHistoryConfirm, setShowDeleteHistoryConfirm] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resettingBalance, setResettingBalance] = useState(false);

  // Lock body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = topUpModalOpen || showFinalizeConfirm || showResetConfirm || showDeleteHistoryConfirm || !!shareData;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [topUpModalOpen, showFinalizeConfirm, showResetConfirm, showDeleteHistoryConfirm, shareData]);

  const totalListValue = useMemo(() => cartItems.reduce((acc, i) => acc + (Number(i.unit_price) * Number(i.quantity)), 0), [cartItems]);
  const realAvailableBalance = useMemo(() => walletBalance - totalListValue, [walletBalance, totalListValue]);
  const availableBalanceDisplay = useMemo(() => Math.max(0, realAvailableBalance), [realAvailableBalance]);

  useEffect(() => {
    if (tenantId && user) {
        fetchWalletBalance();
        fetchCartItems();
        fetchHistory();
    }
  }, [tenantId, user]);

  const fetchWalletBalance = async () => {
    const { data } = await supabase
        .from("market_wallet")
        .select("balance")
        .eq("tenant_id", tenantId)
        .eq("user_id", user?.id)
        .maybeSingle();
    setWalletBalance(Number(data?.balance ?? 0));
    setLoading(false);
  };

  const fetchCartItems = async () => {
    const { data } = await supabase
        .from("shopping_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", user?.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
    
    if (data) setCartItems(data);
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
        const { data, error } = await supabase
            .from("market_transactions")
            .select("amount, created_at")
            .eq("tenant_id", tenantId)
            .eq("created_by", user?.id)
            .lt("amount", 0); // apenas gastos

        if (error) throw error;

        // Agrupar por mês
        const groups: Record<string, { total: number; count: number }> = {};
        data.forEach(t => {
            const date = new Date(t.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!groups[key]) groups[key] = { total: 0, count: 0 };
            groups[key].total += Math.abs(Number(t.amount));
            groups[key].count += 1;
        });

        const formatted = Object.entries(groups).map(([month, val]) => ({
            month,
            total: val.total,
            count: val.count
        })).sort((a, b) => b.month.localeCompare(a.month));

        setHistory(formatted);
    } catch (e) {
        console.error(e);
    } finally {
        setHistoryLoading(false);
    }
  };

    const handleDeleteHistoryMonth = async (monthKey: string) => {
        setHistoryLoading(true);
        try {
            const [year, month] = monthKey.split("-");
            const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString();
            const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59).toISOString();

            const { error } = await supabase
                .from("market_transactions")
                .delete()
                .eq("tenant_id", tenantId)
                .eq("created_by", user?.id)
                .gte("created_at", startDate)
                .lte("created_at", endDate)
                .lt("amount", 0); // apenas gastos

            if (error) {
                console.error("Erro ao excluir histórico do mês:", error);
                throw error;
            }

            setHistory(prev => prev.filter(h => h.month !== monthKey));
            setShowDeleteHistoryConfirm(null);
        } catch (e: any) {
            console.error("Erro completo na exclusão do histórico:", e);
            alert("Erro ao excluir histórico: " + (e.message || "Erro desconhecido"));
        } finally {
            setHistoryLoading(false);
        }
    };

  const handleAddItem = async () => {
    const nome = newItemName.trim();
    const preco = Number(newItemPrice) || 0;
    if (!nome) return;
    
    setAddingItem(true);
    try {
        const { data, error } = await supabase.from("shopping_items").insert({
            tenant_id: tenantId,
            user_id: user?.id,
            name: nome,
            unit_price: preco,
            quantity: newItemQty
        }).select().single();

        if (error) throw error;

        setCartItems(prev => [data, ...prev]);
        setNewItemName(""); setNewItemPrice(""); setNewItemQty(1);
    } catch (e: any) {
        alert("Erro ao adicionar item: " + e.message);
    } finally {
        setAddingItem(false);
    }
  };

  const handleRemoveItem = async (id: string) => {
    try {
        const { error } = await supabase.from("shopping_items").delete().eq("id", id);
        if (error) throw error;
        setCartItems(prev => prev.filter(x => x.id !== id));
    } catch (e: any) {
        alert("Erro ao remover item: " + e.message);
    }
  };

  const handleTopUp = async () => {
      const amt = Number(topUpAmount);
      if(amt <= 0) return;

      setToppingUp(true);
      try {
          const { error } = await supabase.rpc("market_wallet_topup", { 
              p_tenant_id: tenantId, 
              p_user_id: user?.id,
              p_amount: amt, 
              p_note: "Recarga" 
          });

          if (error) throw error;

          await fetchWalletBalance();
          setTopUpModalOpen(false);
          setTopUpAmount("");
          alert("Recarga realizada com sucesso!");
      } catch (e: any) {
          alert("Erro ao recarregar: " + e.message);
      } finally {
          setToppingUp(false);
      }
  };

  const handleResetBalance = async () => {
      setResettingBalance(true);
      try {
          const { error } = await supabase
              .from("market_wallet")
              .update({ balance: 0 })
              .eq("tenant_id", tenantId)
              .eq("user_id", user?.id);

          if (error) throw error;

          await fetchWalletBalance();
          setShowResetConfirm(false);
          alert("Saldo zerado com sucesso!");
      } catch (e: any) {
          alert("Erro ao zerar saldo: " + e.message);
      } finally {
          setResettingBalance(false);
      }
  };

  const handleFinalize = async () => {
    if (cartItems.length === 0) return;
    
    if (walletBalance < totalListValue) {
        alert(`Saldo insuficiente. Você tem ${CURRENCY_FORMATTER.format(walletBalance)}, mas a lista custa ${CURRENCY_FORMATTER.format(totalListValue)}.`);
        return;
    }

    setFinalizing(true);
    try {
        const note = `Compra Mercado: ${cartItems.length} itens`;
        
        // 1. Deduzir do saldo da carteira via RPC
        const { error: spendError } = await supabase.rpc("market_wallet_spend", { 
            p_tenant_id: tenantId, 
            p_user_id: user?.id,
            p_amount: totalListValue, 
            p_note: note 
        });

        if (spendError) throw new Error("Erro ao deduzir saldo: " + spendError.message);

        // 2. Registrar como despesa geral para aparecer no financeiro
        const { error: expenseError } = await supabase.from("expenses").insert({
            tenant_id: tenantId,
            user_id: user?.id,
            description: `MERCADO - ${new Date().toLocaleDateString('pt-BR')}`,
            amount: totalListValue,
            due_date: new Date().toISOString().split('T')[0],
            paid: true
        });

        if (expenseError) {
            console.error("Erro ao registrar despesa financeira, mas o saldo foi deduzido:", expenseError);
            // Não travamos o processo aqui pois o saldo já foi deduzido
        }

        // 3. Limpa a lista no banco
        const { error: deleteError } = await supabase
            .from("shopping_items")
            .delete()
            .eq("tenant_id", tenantId)
            .eq("user_id", user?.id);

        if (deleteError) throw new Error("Erro ao limpar lista: " + deleteError.message);

        setCartItems([]);
        await fetchWalletBalance();
        await fetchHistory();
        setShowFinalizeConfirm(false);
        alert("Lista finalizada com sucesso!");
    } catch (e: any) {
        console.error("Erro completo na finalização:", e);
        alert(e.message || "Erro ao finalizar lista. Verifique sua conexão.");
    } finally {
        setFinalizing(false);
    }
  };

  const handleShare = () => {
    if (cartItems.length === 0) return;

    let msg = `*🛒 LISTA DE COMPRAS - MERCADO*\n`;
    msg += `📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    msg += `--------------------------------\n`;
    
    cartItems.forEach(item => {
        const sub = Number(item.unit_price) * Number(item.quantity);
        msg += `• ${item.quantity}x ${item.name} - ${CURRENCY_FORMATTER.format(sub)}\n`;
    });

    msg += `--------------------------------\n`;
    msg += `*TOTAL DA LISTA: ${CURRENCY_FORMATTER.format(totalListValue)}*\n`;
    msg += `\n_Gerado por CardDigital GM_`;

    setShareData({ title: "Lista de Compras", message: msg });
  };

  return (
    <Page 
        title="Mercado"
        actions={
            <div className="flex gap-2">
                <button 
                    className="gm-btn gm-btn-outline" 
                    onClick={() => setShowHistory(!showHistory)}
                >
                    <History size={16} /> {showHistory ? "Ver Lista" : "Histórico"}
                </button>
                {!showHistory && cartItems.length > 0 && (
                    <button 
                        className="gm-btn gm-btn-accent" 
                        onClick={handleShare}
                    >
                        <Share2 size={16} /> Compartilhar
                    </button>
                )}
            </div>
        }
    >
       
       <Grid cols={1} className="mb-6">
           <Card className="bg-white/5 backdrop-blur-md border border-white/10 p-0 overflow-hidden">
              <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div>
                    <p className="text-xs opacity-70 uppercase tracking-widest font-bold mb-1 text-slate-400">Saldo Disponível</p>
                    <div className="flex items-center justify-center sm:justify-start gap-4">
                        <div className="text-4xl font-black tracking-tight text-[var(--gm-primary)]">
                            {CURRENCY_FORMATTER.format(availableBalanceDisplay)}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setTopUpModalOpen(true)} className="gm-btn gm-btn-icon gm-btn-soft" title="Adicionar Saldo">
                                <Plus size={24} />
                            </button>
                            {walletBalance > 0 && (
                                <button 
                                    onClick={() => setShowResetConfirm(true)} 
                                    className="gm-btn gm-btn-icon gm-btn-danger"
                                    title="Zerar Saldo"
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}
                        </div>
                     </div>
                 </div>
                 <div className="text-center md:text-right bg-white/5 p-4 rounded-xl border border-white/10 min-w-[180px]">
                     <p className="text-xs opacity-70 uppercase tracking-widest font-bold mb-1">Total da Lista</p>
                     <div className="text-2xl font-bold">{CURRENCY_FORMATTER.format(totalListValue)}</div>
                 </div>
              </div>
           </Card>
       </Grid>

       {showHistory ? (
           <Grid cols={1}>
               <Card title="Histórico de Gastos Mensais">
                   {historyLoading ? (
                       <div className="flex justify-center py-12">
                           <Loader2 size={32} className="animate-spin text-slate-500" />
                       </div>
                   ) : history.length === 0 ? (
                       <div className="text-center opacity-50 py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
                           <History size={48} className="mb-4 opacity-50 mx-auto" />
                           <p>Nenhum histórico de gastos encontrado.</p>
                       </div>
                   ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {history.map(h => {
                               const [year, month] = h.month.split("-");
                               const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('pt-BR', { month: 'long' });
                               return (
                                   <div key={h.month} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[var(--gm-primary)] transition-all group relative">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowDeleteHistoryConfirm(h.month);
                                            }}
                                            className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white z-20 transition-all shadow-lg border border-red-500/30"
                                            title="Excluir este mês"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                       <div className="flex justify-between items-start mb-2 pr-8">
                                           <div className="flex items-center gap-2 text-slate-400">
                                               <Calendar size={14} />
                                               <span className="text-xs font-bold uppercase tracking-widest">{monthName} {year}</span>
                                           </div>
                                           <div className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-bold">{h.count} compras</div>
                                       </div>
                                       <div className="text-2xl font-black text-white group-hover:text-[var(--gm-primary)] transition-colors">
                                           {CURRENCY_FORMATTER.format(h.total)}
                                       </div>
                                   </div>
                               );
                           })}
                       </div>
                   )}
               </Card>
           </Grid>
       ) : (
           <Grid cols={1} className="gap-6">
                {/* Add Item Form */}
                <Card title="Adicionar Item">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="gm-label mb-1 block">Produto</label>
                            <input className="gm-input w-full" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Ex: Arroz 5kg" />
                        </div>
                        <div className="w-full md:w-32">
                            <label className="gm-label mb-1 block">Preço (Un)</label>
                            <input className="gm-input" type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="0.00" />
                        </div>
                        <div className="w-full md:w-24">
                            <label className="gm-label mb-1 block">Qtd</label>
                            <input className="gm-input text-center" type="number" value={newItemQty} onChange={e => setNewItemQty(Number(e.target.value))} />
                        </div>
                        <button className="gm-btn w-full md:w-auto px-8" onClick={handleAddItem} disabled={addingItem}>
                            {addingItem ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Adicionar
                        </button>
                    </div>
                </Card>

                <Card 
                    title={`Itens na Lista (${cartItems.length})`}
                    className="mt-8"
                    right={
                        cartItems.length > 0 && (
                            <button 
                                className="gm-btn gm-btn-accent font-black transition-all px-6 py-2 rounded-xl flex items-center gap-2"
                                onClick={() => setShowFinalizeConfirm(true)}
                                disabled={finalizing}
                            >
                                {finalizing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
                                FINALIZAR LISTA
                            </button>
                        )
                    }
                >
                    {cartItems.length === 0 ? (
                        <div className="text-center opacity-50 py-12 flex flex-col items-center border border-dashed border-white/10 rounded-xl bg-white/5">
                            <ShoppingCart size={48} className="mb-4 opacity-50" />
                            <p>Sua lista de compras está vazia.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/10">
                            {cartItems.map(item => (
                                <div key={item.id} className="flex flex-col sm:flex-row justify-between sm:items-center py-4 px-2 hover:bg-white/5 rounded-lg transition-colors gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-slate-400 text-sm flex-shrink-0">
                                            {item.quantity}x
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-lg truncate">{item.name}</div>
                                            <div className="text-xs opacity-60">Unit: {CURRENCY_FORMATTER.format(item.unit_price)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-6">
                                        <span className="font-bold text-xl text-[var(--gm-primary)]">{CURRENCY_FORMATTER.format(Number(item.unit_price) * Number(item.quantity))}</span>
                                        <button onClick={() => handleRemoveItem(item.id)} className="gm-btn gm-btn-icon gm-btn-danger">
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
           </Grid>
       )}

       <AnimatePresence>
        {topUpModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-hidden">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
                    onClick={() => setTopUpModalOpen(false)}
                />
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-sm bg-[#1a1a1a]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden" 
                    onClick={e => e.stopPropagation()}
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--gm-primary)] to-[var(--gm-accent)]"></div>
                    
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--gm-primary)]/20 flex items-center justify-center text-[var(--gm-primary)] mb-6">
                            <Wallet size={32} />
                        </div>
                        
                        <h3 className="text-2xl font-black text-white mb-2">Adicionar Saldo</h3>
                        <p className="text-sm text-slate-400 mb-8">Insira o valor para recarregar sua carteira.</p>
                        
                        <div className="relative w-full mb-8">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-500">R$</span>
                            <input 
                                type="number" 
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-3xl font-black text-white focus:outline-none focus:border-[var(--gm-primary)] transition-all text-center" 
                                value={topUpAmount} 
                                onChange={e => setTopUpAmount(e.target.value)} 
                                placeholder="0.00" 
                                autoFocus 
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3 w-full">
                            <button 
                                className="gm-btn w-full py-4 font-black text-lg" 
                                onClick={handleTopUp}
                                disabled={toppingUp}
                            >
                                {toppingUp ? <Loader2 size={24} className="animate-spin mx-auto" /> : "CONFIRMAR RECARGA"}
                            </button>
                            <button 
                                className="gm-btn gm-btn-soft w-full py-3" 
                                onClick={() => setTopUpModalOpen(false)}
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
       </AnimatePresence>

                {/* Modal de Confirmação de Exclusão de Histórico */}
                <AnimatePresence>
                    {showDeleteHistoryConfirm && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                onClick={() => setShowDeleteHistoryConfirm(null)}
                            />
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="relative w-full max-w-sm bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-[var(--gm-primary)]"></div>
                                
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 mb-6">
                                        <Trash2 size={32} />
                                    </div>
                                    
                                    <h2 className="text-2xl font-black text-white mb-2">Excluir Histórico?</h2>
                                    <p className="text-slate-400 mb-8">
                                        Deseja excluir permanentemente todo o histórico de gastos deste mês? 
                                        <br />
                                        <span className="text-red-400 font-bold">Esta ação não pode ser desfeita.</span>
                                    </p>
                                    
                                    <div className="grid grid-cols-2 gap-4 w-full">
                                        <button 
                                            className="gm-btn gm-btn-soft w-full py-3"
                                            onClick={() => setShowDeleteHistoryConfirm(null)}
                                        >
                                            VOLTAR
                                        </button>
                                        <button 
                                            className="gm-btn gm-btn-danger w-full py-3"
                                            onClick={() => handleDeleteHistoryMonth(showDeleteHistoryConfirm)}
                                            disabled={historyLoading}
                                        >
                                            {historyLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "EXCLUIR"}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

               {/* Finalize Confirmation Modal */}
        <AnimatePresence>
            {showFinalizeConfirm && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-hidden">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowFinalizeConfirm(false)}
                    />
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-sm bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--gm-primary)] to-[var(--gm-accent)]"></div>
                        
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-[var(--gm-primary)]/20 rounded-2xl flex items-center justify-center mb-6 text-[var(--gm-primary)]">
                                <ShoppingCart size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2">Finalizar Compra?</h3>
                            <p className="text-slate-400 mb-8">
                                Deseja finalizar esta lista no valor de <span className="text-white font-bold">{CURRENCY_FORMATTER.format(totalListValue)}</span>?
                                O valor será deduzido do seu saldo de mercado.
                            </p>
                            
                            <div className="grid grid-cols-1 gap-3 w-full">
                                <button 
                                    onClick={handleFinalize}
                                    disabled={finalizing}
                                    className="gm-btn w-full py-4 font-black flex items-center justify-center gap-2"
                                >
                                    {finalizing ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                                    SIM, FINALIZAR AGORA
                                </button>
                                <button 
                                    onClick={() => setShowFinalizeConfirm(false)}
                                    className="gm-btn gm-btn-soft w-full py-3"
                                >
                                    CANCELAR
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* Reset Balance Confirmation Modal */}
        <AnimatePresence>
            {showResetConfirm && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-hidden">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowResetConfirm(false)}
                    />
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-sm bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-[var(--gm-primary)]"></div>
                        
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-6 text-red-500">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2">Zerar Saldo?</h3>
                            <p className="text-slate-400 mb-8">
                                Tem certeza que deseja zerar o seu saldo disponível de <span className="text-white font-bold">{CURRENCY_FORMATTER.format(walletBalance)}</span>?
                                <br/><span className="text-red-400 font-bold">Esta ação não pode ser desfeita.</span>
                            </p>
                            
                            <div className="grid grid-cols-1 gap-3 w-full">
                                <button 
                                    onClick={handleResetBalance}
                                    disabled={resettingBalance}
                                    className="gm-btn gm-btn-danger w-full py-4 font-black flex items-center justify-center gap-2"
                                >
                                    {resettingBalance ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={24} />}
                                </button>
                                <button 
                                    onClick={() => setShowResetConfirm(false)}
                                    className="gm-btn gm-btn-soft w-full py-3"
                                >
                                    CANCELAR
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* Share Options Modal */}

       {shareData && (
        <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShareData(null)}>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Share2 size={20} className="text-[var(--gm-primary)]" />
                Compartilhar {shareData.title}
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => {
                    window.open(`https://wa.me/?text=${encodeURIComponent(shareData.message)}`, "_blank");
                    setShareData(null);
                  }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/20 hover:bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] transition-all font-bold text-left"
                >
                  <WhatsAppIcon size={20} /> WhatsApp
                </button>

                <button 
                  onClick={() => {
                    window.open(`mailto:?subject=${shareData.title}&body=${encodeURIComponent(shareData.message)}`, "_blank");
                    setShareData(null);
                  }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-[var(--gm-accent)]/10 border border-[var(--gm-accent)]/20 hover:bg-[var(--gm-accent)]/20 text-[var(--gm-accent)] transition-all font-bold text-left"
                >
                  <Mail size={20} /> E-mail
                </button>

                <button 
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shareData.message);
                      alert("Texto copiado para a área de transferência!");
                      setShareData(null);
                    } catch (err) {
                      alert("Erro ao copiar texto.");
                    }
                  }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all font-bold text-left"
                >
                  <Copy size={20} /> Copiar Texto
                </button>

                {navigator.share && (
                    <button 
                      onClick={async () => {
                        try {
                          await navigator.share({
                            title: shareData.title,
                            text: shareData.message,
                          });
                          setShareData(null);
                        } catch (err) {
                          if ((err as Error).name !== 'AbortError') {
                            alert("Erro ao compartilhar.");
                          }
                        }
                      }}
                      className="flex items-center gap-3 p-4 rounded-xl bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/20 hover:bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] transition-all font-bold text-left"
                    >
                      <Share2 size={20} /> Outras Opções (Sistema)
                    </button>
                )}
              </div>

              <button 
                onClick={() => setShareData(null)}
                className="w-full mt-6 py-3 text-slate-400 font-medium hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
};

export default Market;
