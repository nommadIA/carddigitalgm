
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { Card } from "../components/ui/Card";
import { Grid } from "../components/ui/Grid";
import ChartBox from "../components/ui/ChartBox";
import { Page } from "../components/ui/Page";
import { CURRENCY_FORMATTER } from "../constants";
import SafeResponsive from "../components/ui/SafeResponsive";
import { pushToast } from "../store/toast";
import { MessageCircle, FileText, Save, History, X, Download, Trash2, Trash, RefreshCw } from "lucide-react";
import { useAuth } from "../store/AuthContext";
import { generateFinanceReportPdf } from "../services/pdfService";
import { fetchSettingsSupabase } from "../lib/settings";
import { createFinanceReport, listFinanceReports, deleteFinanceReportForever, trashFinanceReport, restoreFinanceReport, FinanceReport } from "../lib/financeReports";

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
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DayRow[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyReports, setHistoryReports] = useState<FinanceReport[]>([]);

  const [showTrash, setShowTrash] = useState(false);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashReports, setTrashReports] = useState<FinanceReport[]>([]);

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

  const handleWhatsApp = (customResumo?: any, customTitle?: string) => {
    const r = customResumo || resumo;
    const title = customTitle || "Últimos 30 dias";
    const text = `*Relatório Financeiro - ${title}*\n\nEntradas: ${CURRENCY_FORMATTER.format(r.entradas)}\nSaídas: ${CURRENCY_FORMATTER.format(r.saidas)}\nSaldo: ${CURRENCY_FORMATTER.format(r.acumulado)}\n\nGerado por CardDigital GM`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handlePDF = async (customTransactions?: any[], customTitle?: string) => {
    try {
      const settings = await fetchSettingsSupabase(tenantId);
      const t = customTransactions || transactions;
      const title = customTitle || "Últimos 30 dias";
      
      const rowsForPdf = t.map((item: any) => ({
        date: item.date,
        type: item.type,
        title: item.desc,
        amount: item.amount,
        status: "Concluído",
        category: item.type === 'receita' ? 'Receita' : 'Despesa'
      }));

      const blob = await generateFinanceReportPdf({
        rows: rowsForPdf,
        periodLabel: title,
        brand: {
          companyName: settings?.company_name,
          companySubtitle: settings?.company_subtitle,
          phone: settings?.phone,
          email: settings?.email,
          website: settings?.website,
          logoDataUrl: settings?.logo_url,
        }
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Relatorio_Financeiro_${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      a.click();
    } catch (e) {
      console.error(e);
      pushToast({ type: "error", title: "Erro", message: "Não foi possível gerar o PDF" });
    }
  };

  const handleSave = async () => {
    try {
      await createFinanceReport({
        tenant_id: tenantId,
        title: `Relatório - Últimos 30 dias (${new Date().toLocaleDateString('pt-BR')})`,
        period_start: toISODate(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)),
        period_end: toISODate(new Date()),
        totals: resumo,
        items: transactions,
      });
      pushToast({ type: "success", title: "Salvo", message: "Relatório salvo com sucesso!" });
    } catch (e: any) {
      console.error(e);
      pushToast({ type: "error", title: "Aviso", message: "Não foi possível salvar o relatório (a tabela pode não existir)." });
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await listFinanceReports(tenantId, "active");
      setHistoryReports(data);
    } catch (e) {
      console.error(e);
      pushToast({ type: "error", title: "Erro", message: "Não foi possível carregar o histórico." });
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistory = () => {
    setShowHistory(true);
    loadHistory();
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este relatório?")) return;
    try {
      await deleteFinanceReportForever(id);
      pushToast({ type: "success", title: "Excluído", message: "Relatório excluído com sucesso." });
      loadHistory();
    } catch (e) {
      console.error(e);
      pushToast({ type: "error", title: "Erro", message: "Não foi possível excluir o relatório." });
    }
  };

  return (
    <Page 
      title="Relatórios Financeiros" 
      subtitle="Fluxo de caixa e análise de 30 dias"
      actions={
        <div className="flex gap-2">
          <button onClick={() => handleWhatsApp()} className="gm-btn gm-btn-outline text-sm" title="Enviar por WhatsApp">
            <MessageCircle size={16} className="text-green-500" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
          <button onClick={() => handlePDF()} className="gm-btn gm-btn-outline text-sm" title="Gerar PDF">
            <FileText size={16} className="text-blue-500" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button onClick={handleSave} className="gm-btn gm-btn-outline text-sm" title="Salvar Relatório">
            <Save size={16} className="text-orange-500" />
            <span className="hidden sm:inline">Salvar</span>
          </button>
          <button onClick={openHistory} className="gm-btn gm-btn-primary text-sm" title="Histórico">
            <History size={16} />
            <span className="hidden sm:inline">Histórico</span>
          </button>
        </div>
      }
    >
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

      {/* Modal Histórico */}
      {showHistory && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold">Histórico de Relatórios</h2>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {historyLoading ? (
                <div className="text-center opacity-60 py-8">Carregando histórico...</div>
              ) : historyReports.length === 0 ? (
                <div className="text-center opacity-60 py-8">Nenhum relatório salvo encontrado.</div>
              ) : (
                <div className="space-y-4">
                  {historyReports.map(rep => (
                    <div key={rep.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-lg">{rep.title}</h4>
                        <p className="text-sm text-slate-400">
                          Salvo em {new Date(rep.created_at).toLocaleDateString('pt-BR')} às {new Date(rep.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div className="flex gap-4 mt-2 text-sm font-medium">
                          <span className="text-green-500">Entradas: {CURRENCY_FORMATTER.format(rep.totals?.entradas || 0)}</span>
                          <span className="text-red-500">Saídas: {CURRENCY_FORMATTER.format(rep.totals?.saidas || 0)}</span>
                          <span className={rep.totals?.acumulado >= 0 ? 'text-blue-500' : 'text-orange-500'}>
                            Saldo: {CURRENCY_FORMATTER.format(rep.totals?.acumulado || 0)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleWhatsApp(rep.totals, rep.title)} 
                          className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg transition-colors"
                          title="Reenviar WhatsApp"
                        >
                          <MessageCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handlePDF(rep.items, rep.title)} 
                          className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-colors"
                          title="Abrir PDF"
                        >
                          <Download size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteReport(rep.id)} 
                          className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Excluir Relatório"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

