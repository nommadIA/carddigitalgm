
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ShoppingCart, Trash2, Camera, Check, DollarSign, Wallet, Loader2, X, Sparkles } from 'lucide-react';
import { CURRENCY_FORMATTER } from '../constants';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/AuthContext';
import { Page } from "../components/ui/Page";
import { Grid } from "../components/ui/Grid";
import { Card } from "../components/ui/Card";

type CartItem = {
  id: string;
  name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  created_at: string;
};

const Market = () => {
  const { tenantId } = useAuth();
  
  const [walletBalance, setWalletBalance] = useState(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');

  const totalListValue = useMemo(() => cartItems.reduce((acc, i) => acc + i.subtotal, 0), [cartItems]);
  const availableBalance = useMemo(() => Math.max(0, walletBalance - totalListValue), [walletBalance, totalListValue]);

  useEffect(() => {
    if (tenantId) fetchWalletBalance();
  }, [tenantId]);

  const fetchWalletBalance = async () => {
    const { data } = await supabase.from("market_wallet").select("balance").eq("tenant_id", tenantId).maybeSingle();
    setWalletBalance(Number(data?.balance ?? 0));
    setLoading(false);
  };

  const handleAddItem = () => {
    const nome = newItemName.trim();
    const preco = Number(newItemPrice);
    if (!nome || !preco) return;
    
    setCartItems(prev => [{
        id: crypto.randomUUID(),
        name: nome,
        unit_price: preco,
        quantity: newItemQty,
        subtotal: preco * newItemQty,
        created_at: new Date().toISOString(),
    }, ...prev]);
    
    setNewItemName(""); setNewItemPrice(""); setNewItemQty(1);
  };

  const handleTopUp = async () => {
      const amt = Number(topUpAmount);
      if(amt > 0) {
          await supabase.rpc("market_wallet_topup", { p_tenant_id: tenantId, p_amount: amt, p_note: "Recarga" });
          fetchWalletBalance();
          setTopUpModalOpen(false);
          setTopUpAmount("");
      }
  };

  return (
    <Page title="Mercado" subtitle="Lista de compras e saldo disponível">
       
       <Grid cols={1} className="mb-6">
           <Card className="bg-[var(--gm-surface-2)] border-none p-0 overflow-hidden">
              <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div>
                    <p className="text-xs opacity-70 uppercase tracking-widest font-bold mb-1 text-slate-400">Saldo Disponível</p>
                    <div className="text-4xl font-extrabold flex items-center gap-3 tracking-tight text-[var(--gm-primary)]">
                        {CURRENCY_FORMATTER.format(availableBalance)}
                        <button onClick={() => setTopUpModalOpen(true)} className="w-8 h-8 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center text-white">
                            <Plus size={20} />
                        </button>
                    </div>
                 </div>
                 <div className="text-right bg-white/5 p-4 rounded-xl border border-white/5 min-w-[180px]">
                     <p className="text-xs opacity-70 uppercase tracking-widest font-bold mb-1">Total da Lista</p>
                     <div className="text-2xl font-bold">{CURRENCY_FORMATTER.format(totalListValue)}</div>
                 </div>
              </div>
           </Card>
       </Grid>

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
                    <button className="gm-btn gm-border-loop w-full md:w-auto px-8" onClick={handleAddItem}>
                        <Plus size={18} /> Adicionar
                    </button>
                </div>
            </Card>

            {/* List */}
            <Card title={`Itens na Lista (${cartItems.length})`}>
                {cartItems.length === 0 ? (
                    <div className="text-center opacity-50 py-12 flex flex-col items-center border border-dashed border-white/10 rounded-xl bg-white/5">
                        <ShoppingCart size={48} className="mb-4 opacity-50" />
                        <p>Sua lista de compras está vazia.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/10">
                        {cartItems.map(item => (
                            <div key={item.id} className="flex justify-between items-center py-4 px-2 hover:bg-white/5 rounded-lg transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-slate-400 text-sm">
                                        {item.quantity}x
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg">{item.name}</div>
                                        <div className="text-xs opacity-60">Unit: {CURRENCY_FORMATTER.format(item.unit_price)}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <span className="font-bold text-xl text-[var(--gm-primary)]">{CURRENCY_FORMATTER.format(item.subtotal)}</span>
                                    <button onClick={() => setCartItems(p => p.filter(x => x.id !== item.id))} className="w-8 h-8 rounded-lg hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-colors">
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
       </Grid>

       {topUpModalOpen && (
           <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
               <div className="w-full max-w-sm bg-[var(--gm-surface)] border border-[var(--gm-border)] rounded-2xl p-6 shadow-2xl">
                   <h3 className="text-xl font-bold mb-1">Adicionar Saldo</h3>
                   <p className="text-sm text-slate-400 mb-6">Insira o valor para recarregar sua carteira.</p>
                   
                   <input 
                        type="number" 
                        className="gm-input mb-6 text-3xl font-bold text-center h-16" 
                        value={topUpAmount} 
                        onChange={e => setTopUpAmount(e.target.value)} 
                        placeholder="0.00" 
                        autoFocus 
                   />
                   
                   <div className="flex gap-3">
                       <button className="gm-btn w-full" onClick={() => setTopUpModalOpen(false)}>Cancelar</button>
                       <button className="gm-btn gm-border-loop w-full" onClick={handleTopUp}>Confirmar Recarga</button>
                   </div>
               </div>
           </div>
       )}
    </Page>
  );
};

export default Market;
