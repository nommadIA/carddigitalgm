
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { Card } from "../components/ui/Card";
import { Grid } from "../components/ui/Grid";
import ChartBox from "../components/ui/ChartBox";
import { Page } from "../components/ui/Page";
import { CURRENCY_FORMATTER } from "../constants";
import SafeResponsive from "../components/ui/SafeResponsive";
import { pushToast } from "../store/toast";

// Recharts
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend
} from "recharts";

type DayRow = { day: string; entradas: number; saidas: number; saldoDia: number; acumulado: number };
type Transaction = { id: string; desc: string; amount: number; type: 'receita' | 'despesa'; date: string; };

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Financial() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DayRow[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const loadData = async () => {
    // Não seta loading=true para evitar flash no realtime
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);

    const startISO = toISODate(start);
    const endISO = toISODate(end);

    const { data: budgets } = await supabase
    .from("budgets")
    .select("id, created_at, total_amount, status, client_name")
    .gte("created_at", `${startISO}T00:00:00`)
    .lte("created_at", `${endISO}T23:59:59`);

    const { data: expenses } = await supabase
    .from("expenses")
    .select("id, created_at, amount, description")
    .gte("created_at", `${startISO}T00:00:00`)
    .lte("created_at", `${endISO}T23:59:59`);

    // 1. Prepare Daily Aggregation
    const map = new Map<string, { entradas: number; saidas: number }>();
    for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = toISODate(d);
    map.set(key, { entradas: 0, saidas: 0 });
    }

    const allTrans: Transaction[] = [];

    (budgets ?? [])
    .filter((b: any) => String(b.status || "").toLowerCase().includes("concl"))
    .forEach((b: any) => {
        const day = String(b.created_at).slice(0, 10);
        const val = Number(b.total_amount || 0);
        const item = map.get(day);
        if (item) item.entradas += val;

        allTrans.push({
            id: b.id,
            desc: b.client_name || "Orçamento",
            amount: val,
            type: 'receita',
            date: b.created_at
        });
    });

    (expenses ?? []).forEach((x: any) => {
    const day = String(x.created_at).slice(0, 10);
    const val = Number(x.amount || 0);
    const item = map.get(day);
    if (item) item.saidas += val;

    allTrans.push({
        id: x.id,
        desc: x.description || "Despesa",
        amount: val,
        type: 'despesa',
        date: x.created_at
    });
    });

    // 2. Build Chart Rows
    let acumulado = 0;
    const out: DayRow[] = [];
    for (const [day, v] of map.entries()) {
    const saldoDia = v.entradas - v.saidas;
    acumulado += saldoDia;
    out.push({ day: day.slice(5), entradas: v.entradas, saidas: v.saidas, saldoDia, acumulado });
    }

    // 3. Sort Transactions (newest first)
    allTrans.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setRows(out);
    setTransactions(allTrans);
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    // Realtime subscription
    const channel = supabase
    .channel("rt-finance")
    .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => {
        loadData();
        pushToast({ type: "info", title: "Financeiro", message: "Atualizado em tempo real" });
        }
    )
    .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budgets" },
        () => {
        loadData();
        pushToast({ type: "info", title: "Financeiro", message: "Atualizado em tempo real" });
        }
    )
    .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, []);

  const resumo = useMemo(() => {
    const entradas = rows.reduce((a, r) => a + r.entradas, 0);
    const saidas = rows.reduce((a, r) => a + r.saidas, 0);
    const acumulado = rows.length ? rows[rows.length - 1].acumulado : 0;
    return { entradas, saidas, acumulado };
  }, [rows]);

  return (
    <Page title="Relatórios Financeiros" subtitle="Fluxo de caixa e análise de 30 dias">
      {loading ? (
        <div className="p-10 text-center opacity-60">Carregando dados financeiros...</div>
      ) : (
        <>
          <Grid cols={3} className="mb-8">
            <Card className="border-l-4 border-l-green-500">
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Entradas</p>
               <h2 className="text-3xl font-bold text-green-500">{CURRENCY_FORMATTER.format(resumo.entradas)}</h2>
            </Card>
            <Card className="border-l-4 border-l-red-500">
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Saídas</p>
               <h2 className="text-3xl font-bold text-red-500">{CURRENCY_FORMATTER.format(resumo.saidas)}</h2>
            </Card>
            <Card className={`border-l-4 ${resumo.acumulado >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Saldo Acumulado</p>
               <h2 className={`text-3xl font-bold ${resumo.acumulado >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>{CURRENCY_FORMATTER.format(resumo.acumulado)}</h2>
            </Card>
          </Grid>

          <Grid cols={2} className="gap-8">
            <Card title="Fluxo Diário (Entradas x Saídas)">
              <div className="mt-4">
                  <ChartBox height={300}>
                    <SafeResponsive height={300}>
                      <BarChart data={rows}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="day" stroke="#666" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#0f1117', border: '1px solid #30363d', borderRadius: '8px', color: '#fff'}} 
                            cursor={{fill: 'rgba(255,255,255,0.03)'}}
                        />
                        <Legend wrapperStyle={{paddingTop: '20px'}} />
                        <Bar name="Receita" dataKey="entradas" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={12} />
                        <Bar name="Despesa" dataKey="saidas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} />
                      </BarChart>
                    </SafeResponsive>
                  </ChartBox>
              </div>
            </Card>

            <Card title="Evolução do Saldo">
              <div className="mt-4">
                  <ChartBox height={300}>
                    <SafeResponsive height={300}>
                      <LineChart data={rows}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="day" stroke="#666" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                        <Tooltip contentStyle={{backgroundColor: '#0f1117', border: '1px solid #30363d', borderRadius: '8px', color: '#fff'}} />
                        <Legend wrapperStyle={{paddingTop: '20px'}} />
                        <Line name="Saldo" type="monotone" dataKey="acumulado" stroke="var(--gm-primary)" strokeWidth={3} dot={false} activeDot={{r: 6, fill: 'var(--gm-primary)'}} />
                      </LineChart>
                    </SafeResponsive>
                  </ChartBox>
              </div>
            </Card>
          </Grid>

          {/* Detailed Report */}
          <div className="mt-8">
              <Card>
                <div className="gm-card-header mb-4">
                    <div className="gm-card-title">
                        <h3>Relatório Detalhado</h3>
                        <span className="gm-muted">Últimos 30 dias (Orçamentos Concluídos e Despesas)</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {transactions.length === 0 ? (
                        <div className="text-center p-8 opacity-50">Sem movimentações no período.</div>
                    ) : (
                        <div className="text-sm">
                            <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 border-b border-white/10 font-bold opacity-60 uppercase tracking-wider text-xs">
                                <div>Data</div>
                                <div>Descrição</div>
                                <div className="text-right">Valor</div>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {transactions.map(t => (
                                    <div key={t.id} className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors items-center">
                                        <div className="text-slate-400 font-mono text-xs">{new Date(t.date).toLocaleDateString('pt-BR')}</div>
                                        <div className="font-medium">{t.desc}</div>
                                        <div className={`text-right font-bold ${t.type === 'receita' ? 'text-green-500' : 'text-red-500'}`}>
                                            {t.type === 'receita' ? '+' : '-'} {CURRENCY_FORMATTER.format(t.amount)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center px-4">
                    <span className="font-bold text-slate-300">Total Líquido (Período)</span>
                    <span className={`text-xl font-extrabold ${resumo.acumulado >= 0 ? 'text-[var(--gm-primary)]' : 'text-orange-500'}`}>
                        {CURRENCY_FORMATTER.format(resumo.acumulado)}
                    </span>
                </div>
              </Card>
          </div>
        </>
      )}
    </Page>
  );
}
