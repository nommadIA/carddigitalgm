import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Loader2 } from "lucide-react";
import { CURRENCY_FORMATTER } from "../../constants";

export default function ExpandedBudgetRow({ budgetId }: { budgetId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: res } = await supabase
        .from("budgets")
        .select("*, items:budget_items(*)")
        .eq("id", budgetId)
        .single();
      setData(res);
      setLoading(false);
    }
    load();
  }, [budgetId]);

  if (loading) {
    return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-slate-500" /></div>;
  }

  if (!data) return <div className="p-4 text-slate-500">Erro ao carregar detalhes.</div>;

  return (
    <div className="p-5 bg-black/20 border-t border-white/5 text-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <div>
          <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Subtotal</div>
          <div className="font-medium text-white text-base">{CURRENCY_FORMATTER.format(Number(data.subtotal || 0))}</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Desconto</div>
          <div className="font-medium text-red-400 text-base">{CURRENCY_FORMATTER.format(Number(data.discount || 0))}</div>
        </div>
        <div>
          <div className="text-[var(--gm-primary)] text-xs uppercase font-bold tracking-wider mb-1">Total</div>
          <div className="font-bold text-[var(--gm-primary)] text-lg">{CURRENCY_FORMATTER.format(Number(data.total_amount || 0))}</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Pagamento</div>
          <div className="font-medium text-white text-base">
            {data.payment_method || "-"} <span className="text-slate-400">{data.installments > 1 ? `(${data.installments}x)` : ""}</span>
          </div>
        </div>
        <div>
          <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Prazo de Entrega</div>
          <div className="font-medium text-white text-base">{data.delivery_days ? `${data.delivery_days} dias úteis` : "-"}</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Validade</div>
          <div className="font-medium text-white text-base">{data.validity_days ? `${data.validity_days} dias` : "-"}</div>
        </div>
      </div>

      {data.items && data.items.length > 0 && (
        <div>
          <div className="text-[var(--gm-primary)] text-xs uppercase font-bold tracking-wider mb-3">Itens do Orçamento</div>
          <div className="space-y-3">
            {data.items.map((item: any) => (
              <div key={item.id} className="bg-white/5 p-4 rounded-xl flex justify-between items-start border border-white/5">
                <div className="pr-4">
                  <div className="font-bold text-white text-base mb-1.5">{item.title}</div>
                  <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{item.description}</div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div className="text-sm text-slate-400 mb-1">{item.quantity}x {CURRENCY_FORMATTER.format(Number(item.unit_price || 0))}</div>
                  <div className="font-bold text-white text-base">{CURRENCY_FORMATTER.format(Number(item.total_price || 0))}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
