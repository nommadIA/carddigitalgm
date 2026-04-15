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
    <div className="p-4 bg-black/20 border-t border-white/5 text-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <div className="text-slate-500 text-xs uppercase font-bold">Subtotal</div>
          <div className="font-medium">{CURRENCY_FORMATTER.format(Number(data.subtotal || 0))}</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs uppercase font-bold">Desconto</div>
          <div className="font-medium text-red-400">{CURRENCY_FORMATTER.format(Number(data.discount || 0))}</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs uppercase font-bold">Total</div>
          <div className="font-medium text-[var(--gm-primary)]">{CURRENCY_FORMATTER.format(Number(data.total_amount || 0))}</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs uppercase font-bold">Pagamento</div>
          <div className="font-medium">{data.payment_method || "-"} {data.installments > 1 ? `(${data.installments}x)` : ""}</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs uppercase font-bold">Prazo de Entrega</div>
          <div className="font-medium">{data.delivery_days ? `${data.delivery_days} dias úteis` : "-"}</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs uppercase font-bold">Validade</div>
          <div className="font-medium">{data.validity_days ? `${data.validity_days} dias` : "-"}</div>
        </div>
      </div>

      {data.items && data.items.length > 0 && (
        <div>
          <div className="text-slate-500 text-xs uppercase font-bold mb-2">Itens do Orçamento</div>
          <div className="space-y-2">
            {data.items.map((item: any) => (
              <div key={item.id} className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <div className="font-medium text-white">{item.title}</div>
                  <div className="text-xs text-white/70 mt-1 whitespace-pre-wrap">{item.description}</div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div className="text-xs text-white/70">{item.quantity}x {CURRENCY_FORMATTER.format(Number(item.unit_price || 0))}</div>
                  <div className="font-bold text-white">{CURRENCY_FORMATTER.format(Number(item.total_price || 0))}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
