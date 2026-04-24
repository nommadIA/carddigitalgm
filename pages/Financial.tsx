import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { Card } from "../components/ui/Card";
import { Grid } from "../components/ui/Grid";
import ChartBox from "../components/ui/ChartBox";
import { Page } from "../components/ui/Page";
import { CURRENCY_FORMATTER } from "../constants";
import SafeResponsive from "../components/ui/SafeResponsive";
import { pushToast } from "../store/toast";
import { FileText, Save, History, X, Download, Trash2, ChevronLeft, ChevronRight, Calendar, Share2, Copy, Mail } from "lucide-react";
import { WhatsAppIcon } from "../components/ui/WhatsAppIcon";
import { useAuth } from "../store/AuthContext";
import { generateFinanceReportPdf } from "../services/pdfService";
import { fetchSettingsSupabase } from "../lib/settings";
import {
  createFinanceReport,
  listFinanceReports,
  deleteFinanceReportForever,
  FinanceReport,
} from "../lib/financeReports";

// Recharts
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";

type DayRow = {
  day: string;
  entradas: number;
  saidas: number;
  saldoDia: number;
  acumulado: number;
};
type Transaction = {
  id: string;
  desc: string;
  amount: number;
  type: "receita" | "despesa";
  date: string;
};

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

  const [selectedDate, setSelectedDate] = useState(new Date());

  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyReports, setHistoryReports] = useState<FinanceReport[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [shareData, setShareData] = useState<{ title: string; message: string } | null>(null);

  function normalizeStatus(v?: string | null) {
    if (!v) return "AGUARDANDO";
    const up = v.toUpperCase();
    if (up.includes("CONCLU")) return "CONCLUIDO";
    if (up.includes("CANCEL")) return "CANCELADO";
    if (up.includes("APROV")) return "APROVADO";
    if (up.includes("AGUAR")) return "AGUARDANDO";
    if (up.includes("PROD") || up.includes("FAZ") || up.includes("EM ")) return "PRODUCAO";
    if (up.includes("PRONTO")) return "PRONTO";
    return up;
  }

  const loadData = async () => {
    setLoading(true);
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

    const startISO = toISODate(start);
    const endISO = toISODate(end);

    const daysInMonth = end.getDate();
    let budgetsQ = supabase
      .from("budgets")
      .select("*")
      .or(`completed_at.gte.${startISO}T00:00:00,created_at.gte.${startISO}T00:00:00`);

    if (tenantId) budgetsQ = budgetsQ.eq("tenant_id", tenantId);

    // Expenses
    let expensesQ = supabase
      .from("expenses")
      .select("id, created_at, amount, description, tenant_id")
      .gte("created_at", `${startISO}T00:00:00`)
      .lte("created_at", `${endISO}T23:59:59`);

    if (tenantId) expensesQ = expensesQ.eq("tenant_id", tenantId);

    const [budgetsRes, expensesRes] = await Promise.all([budgetsQ, expensesQ]);
    const budgets = budgetsRes.data;
    const expenses = expensesRes.data;

    // 1. Prepare Daily Aggregation
    const map = new Map<string, { entradas: number; saidas: number }>();
    for (let i = 0; i < daysInMonth; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = toISODate(d);
      map.set(key, { entradas: 0, saidas: 0 });
    }

    const allTrans: Transaction[] = [];

    (budgets ?? [])
      .filter((b: any) => normalizeStatus(b.status) === "CONCLUIDO")
      .forEach((b: any) => {
        const dateToUse = b.completed_at || b.created_at;
        const dateObj = new Date(dateToUse);
        if (dateObj < start || dateObj > end) return; // ignore if outside current month

        const day = String(dateToUse).slice(0, 10);
        const val = Number(b.total_amount || 0);
        const item = map.get(day);
        if (item) item.entradas += val;

        allTrans.push({
          id: b.id,
          desc: b.client_name || "Orçamento",
          amount: val,
          type: "receita",
          date: dateToUse,
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
        type: "despesa",
        date: x.created_at,
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

    // 3. Sort Transactions (Receitas first, then Despesas, then by Date)
    allTrans.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "receita" ? -1 : 1;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    setRows(out);
    setTransactions(allTrans);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, tenantId]);

  useEffect(() => {
    // Realtime subscription (mantive do jeito que estava para não mexer em estabilidade)
    const channel = supabase
      .channel("rt-finance")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => {
        loadData();
        pushToast({ type: "info", title: "Financeiro", message: "Atualizado em tempo real" });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "budgets" }, () => {
        loadData();
        pushToast({ type: "info", title: "Financeiro", message: "Atualizado em tempo real" });
      })
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

  const handleShare = (customResumo?: any, customTitle?: string, customTransactions?: any[]) => {
    const r = customResumo || resumo;
    const t = customTransactions || transactions;
    const title = customTitle || "Últimos 30 dias";
    
    let text = `📊 *Relatório Financeiro - ${title}*\n\n`;
    text += `💰 *Entradas:* ${CURRENCY_FORMATTER.format(r.entradas)}\n`;
    text += `💸 *Saídas:* ${CURRENCY_FORMATTER.format(r.saidas)}\n`;
    text += `📈 *Saldo:* ${CURRENCY_FORMATTER.format(r.acumulado)}\n\n`;
    
    if (t && t.length > 0) {
      text += `📝 *Movimentações:*\n`;
      // Sort by date descending
      const sorted = [...t].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      sorted.forEach((item: any) => {
        const emoji = item.type === "receita" ? "✅" : "❌";
        const date = new Date(item.date).toLocaleDateString("pt-BR");
        text += `${emoji} ${date} - ${item.desc}: ${CURRENCY_FORMATTER.format(item.amount)}\n`;
      });
      text += `\n`;
    }
    
    text += `📱 _Gerado por CardDigital GM_`;
    
    setShareData({ title: `Relatório Financeiro - ${title}`, message: text });
  };

  // ✅ FIX: passar "settings" (não brand), que é o que o pdfService realmente usa
  const handlePDF = async (customTransactions?: any[], customTitle?: string) => {
    try {
      const settings = await fetchSettingsSupabase(tenantId);
      if (!settings) {
        pushToast({ type: "error", title: "Erro", message: "Configurações não encontradas. Salve as configurações primeiro." });
        return;
      }

      const t = customTransactions || transactions;
      const title = customTitle || "Últimos 30 dias";

      const rowsForPdf = t.map((item: any) => ({
        date: item.date,
        type: item.type,
        title: item.desc,
        amount: item.amount,
        status: "Concluído",
        category: item.type === "receita" ? "Receita" : "Despesa",
      }));

      const blob = await generateFinanceReportPdf({
        rows: rowsForPdf,
        periodLabel: title,
        settings,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Relatorio_Financeiro_${title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      a.click();
    } catch (e: any) {
      console.error(e);
      pushToast({ type: "error", title: "Erro", message: e?.message || "Não foi possível gerar o PDF" });
    }
  };

  const handleSave = async () => {
    try {
      const monthName = selectedDate.toLocaleString("pt-BR", { month: "long" }).toUpperCase();
      const year = selectedDate.getFullYear();
      
      await createFinanceReport({
        tenant_id: tenantId,
        title: `Relatório - ${monthName} / ${year}`,
        month_ref: `${year}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}`,
        period_start: toISODate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)),
        period_end: toISODate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)),
        totals: resumo,
        items: transactions,
      });
      pushToast({ type: "success", title: "Salvo", message: "Relatório salvo com sucesso!" });
    } catch (e: any) {
      console.error(e);
      pushToast({
        type: "error",
        title: "Aviso",
        message: "Não foi possível salvar o relatório (a tabela pode não existir).",
      });
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
    if (!id || !tenantId) {
      pushToast({ type: "error", title: "Erro", message: "ID ou Tenant ausente." });
      return;
    }

    // Primeiro clique: pede confirmação mudando o estado
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      // Resetar após 4 segundos se não confirmar
      setTimeout(() => {
        setConfirmDeleteId(current => current === id ? null : current);
      }, 4000);
      return;
    }

    // Segundo clique: executa a exclusão
    setConfirmDeleteId(null);
    pushToast({ type: "info", title: "Aguarde", message: "Excluindo do banco de dados..." });
    
    try {
      await deleteFinanceReportForever(id, tenantId);
      pushToast({ type: "success", title: "Sucesso", message: "Relatório removido." });
      await loadHistory();
    } catch (e: any) {
      pushToast({ 
        type: "error", 
        title: "Erro ao excluir", 
        message: e.message || "Erro desconhecido." 
      });
    }
  };

  return (
    <Page
      title="Relatórios Financeiros"
      actions={
        <div className="flex flex-col xl:flex-row gap-3 w-full items-stretch xl:items-center mt-4">
          <div className="flex items-center gm-btn rounded-xl p-1.5 w-full xl:w-auto justify-between xl:justify-start shadow-sm h-[42px] !cursor-default">
            <button 
              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="px-3 flex items-center gap-2 font-bold text-sm min-w-[140px] justify-center text-white">
              <Calendar size={14} />
              <span className="capitalize">{selectedDate.toLocaleString("pt-BR", { month: "long", year: "numeric" })}</span>
            </div>
            <button 
              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="ml-1 px-3 py-1 text-[10px] uppercase font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors h-full flex items-center justify-center cursor-pointer"
            >
              Hoje
            </button>
          </div>
          
          <div className="flex flex-row gap-2 w-full xl:w-auto justify-between xl:justify-start">
            <button
              onClick={() => handleShare(resumo, selectedDate.toLocaleString("pt-BR", { month: "long", year: "numeric" }), transactions)}
              className="gm-btn rounded-xl shadow-sm justify-center h-[42px] w-[42px] p-0 flex-1 xl:flex-none"
              title="Compartilhar Relatório"
            >
              <Share2 size={18} />
            </button>
            <button 
              onClick={() => handlePDF(transactions, selectedDate.toLocaleString("pt-BR", { month: "long", year: "numeric" }))} 
              className="gm-btn rounded-xl shadow-sm justify-center h-[42px] w-[42px] p-0 flex-1 xl:flex-none" 
              title="Gerar PDF"
            >
              <FileText size={18} />
            </button>
            <button 
              onClick={handleSave} 
              className="gm-btn rounded-xl shadow-sm justify-center h-[42px] w-[42px] p-0 flex-1 xl:flex-none" 
              title="Fechar e Salvar Mês"
            >
              <Save size={18} />
            </button>
            <button 
              onClick={openHistory} 
              className="gm-btn rounded-xl shadow-sm justify-center h-[42px] w-[42px] p-0 flex-1 xl:flex-none" 
              title="Histórico"
            >
              <History size={18} />
            </button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="p-10 text-center opacity-60">Carregando dados financeiros...</div>
      ) : (
        <>
          <Grid cols={3} className="mb-8">
            <Card className="border-l-4 border-l-[var(--gm-accent)]">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Entradas</p>
              <h2 className="text-3xl font-bold text-[var(--gm-accent)]">{CURRENCY_FORMATTER.format(resumo.entradas)}</h2>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Saídas</p>
              <h2 className="text-3xl font-bold text-red-500">{CURRENCY_FORMATTER.format(resumo.saidas)}</h2>
            </Card>
            <Card className={`border-l-4 ${resumo.acumulado >= 0 ? "border-l-[var(--gm-accent)]" : "border-l-[var(--gm-primary)]"}`}>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Saldo Acumulado</p>
              <h2 className={`text-3xl font-bold ${resumo.acumulado >= 0 ? "text-[var(--gm-accent)]" : "text-[var(--gm-primary)]"}`}>
                {CURRENCY_FORMATTER.format(resumo.acumulado)}
              </h2>
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
                        contentStyle={{ backgroundColor: "#0f1117", border: "1px solid #30363d", borderRadius: "8px", color: "#fff" }}
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      />
                      <Legend wrapperStyle={{ paddingTop: "20px" }} />
                      <Bar name="Receita" dataKey="entradas" fill="var(--gm-accent)" radius={[4, 4, 0, 0]} barSize={12} />
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
                      <Tooltip contentStyle={{ backgroundColor: "#0f1117", border: "1px solid #30363d", borderRadius: "8px", color: "#fff" }} />
                      <Legend wrapperStyle={{ paddingTop: "20px" }} />
                      <Line name="Saldo" type="monotone" dataKey="acumulado" stroke="var(--gm-primary)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "var(--gm-primary)" }} />
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
                  <span className="gm-muted">Movimentações de {selectedDate.toLocaleString("pt-BR", { month: "long", year: "numeric" })}</span>
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
                    <div className="pb-24">
                      {/* RECEITAS */}
                      {transactions.filter(t => t.type === "receita").length > 0 && (
                        <>
                          <div className="px-4 py-2 bg-[var(--gm-accent)]/5 text-[var(--gm-accent)] text-[10px] font-bold uppercase tracking-widest border-y border-white/5">
                            Ganhos / Receitas
                          </div>
                          {transactions.filter(t => t.type === "receita").map((t) => (
                            <div
                              key={t.id}
                              className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors items-center"
                            >
                              <div className="text-slate-400 font-mono text-xs">{new Date(t.date).toLocaleDateString("pt-BR")}</div>
                              <div className="font-medium">{t.desc}</div>
                              <div className="text-right font-bold text-[var(--gm-accent)]">
                                + {CURRENCY_FORMATTER.format(t.amount)}
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* DESPESAS */}
                      {transactions.filter(t => t.type === "despesa").length > 0 && (
                        <>
                          <div className="px-4 py-2 bg-red-500/5 text-red-500 text-[10px] font-bold uppercase tracking-widest border-y border-white/5 mt-4">
                            Despesas / Saídas
                          </div>
                          {transactions.filter(t => t.type === "despesa").map((t) => (
                            <div
                              key={t.id}
                              className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors items-center"
                            >
                              <div className="text-slate-400 font-mono text-xs">{new Date(t.date).toLocaleDateString("pt-BR")}</div>
                              <div className="font-medium">{t.desc}</div>
                              <div className="text-right font-bold text-red-500">
                                - {CURRENCY_FORMATTER.format(t.amount)}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ✅ Totais detalhados */}
              <div className="mt-4 pt-4 border-t border-white/10 px-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-bold text-slate-300">Total de Ganhos (Período)</span>
                      <span className="text-lg font-extrabold text-green-500">
                        {CURRENCY_FORMATTER.format(resumo.entradas)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="font-bold text-slate-300">Total de Despesas (Período)</span>
                      <span className="text-lg font-extrabold text-red-500">
                        {CURRENCY_FORMATTER.format(resumo.saidas)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:min-w-[260px]">
                    <span className="font-bold text-slate-300">Total Líquido (Período)</span>
                    <span className={`text-xl font-extrabold ${resumo.acumulado >= 0 ? "text-[var(--gm-primary)]" : "text-[var(--gm-accent)]"}`}>
                      {CURRENCY_FORMATTER.format(resumo.acumulado)}
                    </span>
                  </div>
                </div>
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
                  {historyReports.map((rep) => (
                    <div
                      key={rep.id}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="font-bold text-lg">{rep.title}</h4>
                        <p className="text-sm text-slate-400">
                          Salvo em {new Date(rep.created_at).toLocaleDateString("pt-BR")} às{" "}
                          {new Date(rep.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <div className="flex gap-4 mt-2 text-sm font-medium">
                          <span className="text-[var(--gm-accent)]">Entradas: {CURRENCY_FORMATTER.format(rep.totals?.entradas || 0)}</span>
                          <span className="text-red-500">Saídas: {CURRENCY_FORMATTER.format(rep.totals?.saidas || 0)}</span>
                          <span className={rep.totals?.acumulado >= 0 ? "text-[var(--gm-primary)]" : "text-[var(--gm-accent)]"}>
                            Saldo: {CURRENCY_FORMATTER.format(rep.totals?.acumulado || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleShare(rep.totals, rep.title, rep.items)}
                          className="p-2 bg-[var(--gm-primary)]/10 text-[var(--gm-primary)] hover:bg-[var(--gm-primary)]/20 rounded-lg transition-colors"
                          title="Compartilhar Relatório"
                        >
                          <Share2 size={18} />
                        </button>
                        <button
                          onClick={() => handlePDF(rep.items, rep.title)}
                          className="p-2 bg-[var(--gm-accent)]/10 text-[var(--gm-accent)] hover:bg-[var(--gm-accent)]/20 rounded-lg transition-colors"
                          title="Abrir PDF"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReport(rep.id);
                          }}
                          className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
                            confirmDeleteId === rep.id 
                              ? "bg-[var(--gm-primary)] text-white animate-pulse px-4 shadow-[0_0_15px_var(--gm-primary-40)]" 
                              : "bg-[var(--gm-primary)]/10 text-[var(--gm-primary)] hover:bg-[var(--gm-primary)]/20 border border-[var(--gm-primary)]/20 shadow-[0_0_8px_rgba(255,123,0,0.1)]"
                          }`}
                          title={confirmDeleteId === rep.id ? "Clique novamente para confirmar" : "Excluir Relatório"}
                        >
                          <Trash2 size={18} />
                          {confirmDeleteId === rep.id && <span className="text-xs font-bold uppercase tracking-widest">Confirmar?</span>}
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
      {/* Modal de Compartilhamento */}
      {shareData && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-lg font-bold">Compartilhar Relatório</h3>
              <button onClick={() => setShareData(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => {
                  window.open(`https://wa.me/?text=${encodeURIComponent(shareData.message)}`, "_blank");
                  setShareData(null);
                }}
                className="w-full gm-btn gm-btn-outline !justify-start !pl-3 gap-3 py-4"
              >
                <div className="shrink-0">
                  <WhatsAppIcon size={24} className="text-[var(--gm-primary)]" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-[var(--gm-primary)] leading-tight">WhatsApp</p>
                  <p className="text-[10px] text-white/70 leading-tight">Enviar diretamente para um contato</p>
                </div>
              </button>

              <button
                onClick={() => {
                  window.open(`mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodeURIComponent(shareData.message)}`, "_blank");
                  setShareData(null);
                }}
                className="w-full gm-btn gm-btn-outline !justify-start !pl-3 gap-3 py-4"
              >
                <div className="shrink-0">
                  <Mail size={24} className="text-[var(--gm-primary)]" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-[var(--gm-primary)] leading-tight">E-mail</p>
                  <p className="text-[10px] text-white/70 leading-tight">Enviar por correio eletrônico</p>
                </div>
              </button>

              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(shareData.message);
                  pushToast({ type: "success", title: "Copiado", message: "Texto copiado para a área de transferência!" });
                  setShareData(null);
                }}
                className="w-full gm-btn gm-btn-outline !justify-start !pl-3 gap-3 py-4"
              >
                <div className="shrink-0">
                  <Copy size={24} className="text-[var(--gm-primary)]" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-[var(--gm-primary)] leading-tight">Copiar Texto</p>
                  <p className="text-[10px] text-white/70 leading-tight">Copiar para colar em outro lugar</p>
                </div>
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
                    } catch (e) {
                      console.warn("Share failed", e);
                    }
                  }}
                  className="w-full gm-btn gm-btn-outline !justify-start !pl-3 gap-3 py-4"
                >
                  <div className="shrink-0">
                    <Share2 size={24} className="text-[var(--gm-primary)]" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[var(--gm-primary)] leading-tight">Mais Opções</p>
                    <p className="text-[10px] text-white/70 leading-tight">Menu de compartilhamento do sistema</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}