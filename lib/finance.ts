import { supabase } from "./supabase";

export type FinanceRow = {
  id: string;
  type: "receita" | "despesa";
  title: string;
  category?: string | null;
  amount: number;
  created_at: string;
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
}

export function monthRangeISO(ref: Date) {
  const start = startOfMonth(ref).toISOString();
  const end = endOfMonth(ref).toISOString();
  return { start, end };
}

export async function fetchMonthFinance(params: { tenantId: string; refDate: Date }) {
  const { tenantId, refDate } = params;
  const { start, end } = monthRangeISO(refDate);

  // DESPESAS
  const exp = await supabase
    .from("expenses")
    .select("id, amount, created_at, description")
    .eq("tenant_id", tenantId)
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: false });

  if (exp.error) throw exp.error;

  // RECEITAS (budgets aprovados/concluídos etc.)
  const bud = await supabase
    .from("budgets")
    .select("id, created_at, status, total_amount, client_name")
    .eq("tenant_id", tenantId)
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: false });

  if (bud.error) throw bud.error;

  const expenses: FinanceRow[] =
    (exp.data ?? []).map((r: any) => ({
      id: r.id,
      type: "despesa",
      title: r.description || "Despesa",
      category: null,
      amount: Number(r.amount || 0),
      created_at: r.created_at,
    })) || [];

  const budgets: FinanceRow[] =
    (bud.data ?? []).map((r: any) => {
      const val = r.total_amount ?? 0;
      const title = r.client_name || "Orçamento";
      return {
        id: r.id,
        type: "receita",
        title,
        category: r.status ?? "budget",
        amount: Number(val || 0),
        created_at: r.created_at,
      };
    }) || [];

  const rows: FinanceRow[] = [...expenses, ...budgets].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
  );

  const totalReceitas = budgets.reduce((s, r) => s + r.amount, 0);
  const totalDespesas = expenses.reduce((s, r) => s + r.amount, 0);
  const saldo = totalReceitas - totalDespesas;

  return { rows, totalReceitas, totalDespesas, saldo };
}

export function buildCharts(rows: FinanceRow[]) {
  // agrupar por dia do mês
  const map = new Map<string, { day: string; receitas: number; despesas: number; saldo: number }>();

  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

    const item = map.get(key) || { day: key, receitas: 0, despesas: 0, saldo: 0 };
    if (r.type === "receita") item.receitas += r.amount;
    else item.despesas += r.amount;
    item.saldo = item.receitas - item.despesas;
    map.set(key, item);
  }

  return Array.from(map.values()).sort((a, b) => +new Date(a.day) - +new Date(b.day));
}