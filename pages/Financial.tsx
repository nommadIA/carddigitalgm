import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { Card } from "../components/ui/Card";
import { Grid } from "../components/ui/Grid";
import ChartBox from "../components/ui/ChartBox";
import { Page } from "../components/ui/Page";
import { CURRENCY_FORMATTER } from "../constants";
import SafeResponsive from "../components/ui/SafeResponsive";
import { pushToast } from "../store/toast";
import { FileText, Save, History, X, Download, Trash2, ChevronLeft, ChevronRight, Calendar, Share2, Copy, Mail, TrendingUp, TrendingDown, Wallet, BarChart3 } from "lucide-react";
import { WhatsAppIcon } from "../components/ui/WhatsAppIcon";
import { SectionDivider } from "../components/ui/SectionDivider";
import { useAuth } from "../store/AuthContext";
import { generateFinanceReportPdf } from "../services/pdfService";
import { fetchSettingsSupabase } from "../lib/settings";
import { openWhatsapp } from "../services/whatsApp";
import {
  createFinanceReport,
  listFinanceReports,
  deleteFinanceReportForever,
  FinanceReport,
} from "../lib/financeReports";

const cardBase =
  "relative rounded-xl border border-[#26262A] bg-[#131315] text-[#F2F2F3] shadow-sm overflow-hidden transition-all";

const listBtnClass = (tone: "neutral" | "green" | "red" | "orange" = "neutral") => {
  const base =
    "w-10 h-10 flex items-center justify-center shrink-0 rounded-md transition-all duration-150 border border-[#26262A] bg-[#131315] hover:bg-[#1B1B1E] cursor-pointer active:scale-95";
  if (tone === "orange") return `${base} text-[#F65A1A] hover:border-[#F65A1A] hover:text-[#FF7A38]`;
  if (tone === "green") return `${base} text-emerald-400 hover:border-emerald-500 hover:text-emerald-300`;
  if (tone === "red") return `${base} text-red-400 hover:border-red-500 hover:text-red-300`;
  return `${base} text-[#8B8B92] hover:border-[#F2F2F3]/40 hover:text-[#F2F2F3]`;
};

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
  const [loading, setLoading] = useState(false);
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
          <div className="flex items-center rounded-md p-1 w-full xl:w-auto justify-between xl:justify-start h-[40px] border border-[#26262A] bg-[#131315]">
            <button 
              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
              className="p-1.5 hover:bg-[#1B1B1E] rounded-md transition-colors text-[#8B8B92] hover:text-[#F2F2F3] flex items-center justify-center cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="px-3 flex items-center gap-2 font-bold text-xs uppercase tracking-wider min-w-[140px] justify-center text-[#F2F2F3]">
              <Calendar size={14} className="text-[#F65A1A]" />
              <span className="capitalize">{selectedDate.toLocaleString("pt-BR", { month: "long", year: "numeric" })}</span>
            </div>
            <button 
              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
              className="p-1.5 hover:bg-[#1B1B1E] rounded-md transition-colors text-[#8B8B92] hover:text-[#F2F2F3] flex items-center justify-center cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="ml-1 px-2.5 py-1 text-[10px] uppercase font-black bg-[#1B1B1E] hover:bg-[#F65A1A] text-[#8B8B92] hover:text-[#0B0B0C] border border-[#26262A] rounded-md transition-all h-[26px] flex items-center justify-center cursor-pointer shadow-none"
            >
              Hoje
            </button>
          </div>
          
          <div className="flex flex-row gap-2 w-full xl:w-auto justify-between xl:justify-start">
            <button
              onClick={() => handleShare(resumo, selectedDate.toLocaleString("pt-BR", { month: "long", year: "numeric" }), transactions)}
              className="forge-btn forge-btn--secondary !w-[38px] !h-[38px] !min-w-[38px] !p-0 !rounded-[4px] cursor-pointer"
              title="Compartilhar Relatório"
            >
              <Share2 size={15} />
            </button>
            <button 
              onClick={() => handlePDF(transactions, selectedDate.toLocaleString("pt-BR", { month: "long", year: "numeric" }))} 
              className="forge-btn forge-btn--secondary !w-[38px] !h-[38px] !min-w-[38px] !p-0 !rounded-[4px] cursor-pointer" 
              title="Gerar PDF"
            >
              <FileText size={15} />
            </button>
            <button 
              onClick={handleSave} 
              className="forge-btn forge-btn--primary !w-[38px] !h-[38px] !min-w-[38px] !p-0 !rounded-[4px] cursor-pointer" 
              title="Fechar e Salvar Mês"
            >
              <Save size={15} />
            </button>
            <button 
              onClick={openHistory} 
              className="forge-btn forge-btn--secondary !w-[38px] !h-[38px] !min-w-[38px] !p-0 !rounded-[4px] cursor-pointer" 
              title="Histórico"
            >
              <History size={15} />
            </button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="p-10 text-center opacity-60">Carregando dados financeiros...</div>
      ) : (
        <div className="w-full space-y-6 pb-6 sm:pb-10 mb-4">
          <div className="mb-2">
            <SectionDivider label="Resumo do mês" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className={`p-5 flex flex-col justify-between space-y-3 group ${cardBase} hover:border-emerald-500/40`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Entradas
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1.5 tracking-tight">
                    {CURRENCY_FORMATTER.format(resumo.entradas)}
                  </div>
                </div>
                <div className="w-11 h-11 rounded-xl barra border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0 shadow-none">
                  <TrendingUp size={20} />
                </div>
              </div>
            </div>

            <div className={`p-5 flex flex-col justify-between space-y-3 group ${cardBase} hover:border-red-500/40`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Saídas
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-red-400 mt-1.5 tracking-tight">
                    {CURRENCY_FORMATTER.format(resumo.saidas)}
                  </div>
                </div>
                <div className="w-11 h-11 rounded-xl barra border border-red-500/25 text-red-400 flex items-center justify-center shrink-0 shadow-none">
                  <TrendingDown size={20} />
                </div>
              </div>
            </div>

            <div className={`p-5 flex flex-col justify-between space-y-3 group ${cardBase} hover:border-[color:var(--gm-primary)]/40`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Saldo Acumulado
                  </span>
                  <div className={`text-2xl sm:text-3xl font-extrabold mt-1.5 tracking-tight ${
                    resumo.acumulado >= 0 ? "text-[color:var(--gm-primary)]" : "text-red-400"
                  }`}>
                    {CURRENCY_FORMATTER.format(resumo.acumulado)}
                  </div>
                </div>
                <div className={`w-11 h-11 rounded-xl barra border ${
                  resumo.acumulado >= 0 ? "border-[color:var(--gm-primary)]/25 text-[color:var(--gm-primary)]" : "border-red-500/25 text-red-400"
                } flex items-center justify-center shrink-0 shadow-none`}>
                  <Wallet size={20} />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <SectionDivider label="Gráficos" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={`p-5 flex flex-col justify-between space-y-3 group ${cardBase}`}>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Fluxo Diário</span>
                  <h3 className="text-base font-bold text-white mt-1">Entradas x Saídas</h3>
                </div>
                <div className="w-8 h-8 rounded-lg barra border border-white/15 text-slate-400 flex items-center justify-center shrink-0 shadow-none">
                  <BarChart3 size={16} />
                </div>
              </div>
              <div className="mt-2">
                <ChartBox height={300}>
                  <SafeResponsive height={300}>
                    <BarChart data={rows}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" stroke="#888" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#141418",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: 12,
                          boxShadow: "none",
                        }}
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      />
                      <Legend wrapperStyle={{ paddingTop: "20px" }} />
                      <Bar name="Receita" dataKey="entradas" fill="var(--gm-accent)" radius={[4, 4, 0, 0]} barSize={12} />
                      <Bar name="Despesa" dataKey="saidas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} />
                    </BarChart>
                  </SafeResponsive>
                </ChartBox>
              </div>
            </div>

            <div className={`p-5 flex flex-col justify-between space-y-3 group ${cardBase}`}>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Evolução</span>
                  <h3 className="text-base font-bold text-white mt-1">Saldo Acumulado</h3>
                </div>
                <div className="w-8 h-8 rounded-lg barra border border-[color:var(--gm-primary)]/25 text-[color:var(--gm-primary)] flex items-center justify-center shrink-0 shadow-none">
                  <TrendingUp size={16} />
                </div>
              </div>
              <div className="mt-2">
                <ChartBox height={300}>
                  <SafeResponsive height={300}>
                    <LineChart data={rows}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" stroke="#888" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#141418",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: 12,
                          boxShadow: "none",
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: "20px" }} />
                      <Line name="Saldo" type="monotone" dataKey="acumulado" stroke="var(--gm-primary)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "var(--gm-primary)" }} />
                    </LineChart>
                  </SafeResponsive>
                </ChartBox>
              </div>
            </div>
          </div>

          {/* Detailed Report */}
          <div className="mt-8">
            <SectionDivider label="Extrato detalhado" />
            <div className="mt-4">
              <div className={`overflow-hidden ${cardBase}`}>
                <div className="p-5 border-b border-white/10 flex items-center justify-between barra">
                  <div>
                    <h3 className="text-lg font-bold text-white">Relatório Detalhado</h3>
                    <span className="text-xs text-slate-400">Movimentações de {selectedDate.toLocaleString("pt-BR", { month: "long", year: "numeric" })}</span>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-full border border-[var(--gm-primary)]/25 text-[var(--gm-primary)] text-xs font-bold bg-[var(--gm-primary)]/10 flex items-center gap-1.5">
                    <FileText size={14} />
                    <span>{transactions.length} {transactions.length === 1 ? "registro" : "registros"}</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {transactions.length === 0 ? (
                    <div className="text-center p-8 opacity-50">Sem movimentações no período.</div>
                  ) : (
                    <div className="text-sm">
                      <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-6 py-4 border-b border-white/10 font-bold text-xs text-slate-400 uppercase tracking-wider barra bg-transparent">
                        <div>Data</div>
                        <div>Descrição</div>
                        <div className="text-right">Valor</div>
                      </div>
                      <div className="pb-8">
                        {/* RECEITAS */}
                        {transactions.filter(t => t.type === "receita").length > 0 && (
                          <>
                            <div className="px-6 py-2.5 flex items-center gap-2 border-y border-white/10 bg-emerald-500/10 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                              Ganhos / Receitas
                            </div>
                            {transactions.filter(t => t.type === "receita").map((t) => (
                              <div
                                key={t.id}
                                className="grid grid-cols-[auto_1fr_auto] gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/[0.04] transition-colors items-center"
                              >
                                <div className="text-slate-400 font-mono text-xs">{new Date(t.date).toLocaleDateString("pt-BR")}</div>
                                <div className="font-medium text-slate-100">{t.desc}</div>
                                <div className="text-right font-bold text-emerald-400">
                                  + {CURRENCY_FORMATTER.format(t.amount)}
                                </div>
                              </div>
                            ))}
                          </>
                        )}

                        {/* DESPESAS */}
                        {transactions.filter(t => t.type === "despesa").length > 0 && (
                          <>
                            <div className="px-6 py-2.5 flex items-center gap-2 border-y border-white/10 bg-red-500/10 text-red-400 font-bold text-xs uppercase tracking-wider mt-4">
                              <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]" />
                              Despesas / Saídas
                            </div>
                            {transactions.filter(t => t.type === "despesa").map((t) => (
                              <div
                                key={t.id}
                                className="grid grid-cols-[auto_1fr_auto] gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/[0.04] transition-colors items-center"
                              >
                                <div className="text-slate-400 font-mono text-xs">{new Date(t.date).toLocaleDateString("pt-BR")}</div>
                                <div className="font-medium text-slate-100">{t.desc}</div>
                                <div className="text-right font-bold text-red-400">
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
                <div className="mt-4 pt-4 border-t border-white/10 px-6 pb-6 barra">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-bold text-slate-400 text-sm">Total de Ganhos:</span>
                        <span className="text-base font-extrabold text-emerald-400">
                          {CURRENCY_FORMATTER.format(resumo.entradas)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="font-bold text-slate-400 text-sm">Total de Despesas:</span>
                        <span className="text-base font-extrabold text-red-400">
                          {CURRENCY_FORMATTER.format(resumo.saidas)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:min-w-[280px] barra p-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
                      <span className="font-bold text-slate-300 text-sm">Total Líquido:</span>
                      <span className={`text-xl font-extrabold ${resumo.acumulado >= 0 ? "text-[var(--gm-primary)]" : "text-red-400"}`}>
                        {CURRENCY_FORMATTER.format(resumo.acumulado)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Histórico */}
      {showHistory && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={() => setShowHistory(false)}>
          <div className={`gm-modal ${cardBase} rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/10 barra">
              <h2 className="text-2xl font-extrabold text-white">Histórico de Relatórios</h2>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {historyLoading ? (
                <div className="text-center text-slate-400 py-8 text-base">Carregando histórico...</div>
              ) : historyReports.length === 0 ? (
                <div className="text-center text-slate-400 py-8 text-base">Nenhum relatório salvo encontrado.</div>
              ) : (
                <div className="space-y-4">
                  {historyReports.map((rep) => (
                    <div
                      key={rep.id}
                      className={`p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${cardBase}`}
                    >
                      <div>
                        <h4 className="font-bold text-lg text-white">{rep.title}</h4>
                        <p className="text-sm text-slate-400 mt-1">
                          Salvo em {new Date(rep.created_at).toLocaleDateString("pt-BR")} às{" "}
                          {new Date(rep.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <div className="flex gap-4 mt-2 text-sm font-medium">
                          <span className="text-emerald-400">Entradas: {CURRENCY_FORMATTER.format(rep.totals?.entradas || 0)}</span>
                          <span className="text-red-400">Saídas: {CURRENCY_FORMATTER.format(rep.totals?.saidas || 0)}</span>
                          <span className={rep.totals?.acumulado >= 0 ? "text-[var(--gm-primary)]" : "text-emerald-400"}>
                            Saldo: {CURRENCY_FORMATTER.format(rep.totals?.acumulado || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleShare(rep.totals, rep.title, rep.items)}
                          className={listBtnClass("orange")}
                          title="Compartilhar Relatório"
                        >
                          <Share2 size={16} />
                        </button>
                        <button
                          onClick={() => handlePDF(rep.items, rep.title)}
                          className={listBtnClass("orange")}
                          title="Abrir PDF"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReport(rep.id);
                          }}
                          className={confirmDeleteId === rep.id 
                            ? "h-10 px-4 rounded-xl bg-red-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer animate-pulse"
                            : listBtnClass("red")
                          }
                          title={confirmDeleteId === rep.id ? "Clique novamente para confirmar" : "Excluir Relatório"}
                        >
                          <Trash2 size={16} />
                          {confirmDeleteId === rep.id && <span>Confirmar?</span>}
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={() => setShareData(null)}>
          <div className={`gm-modal ${cardBase} rounded-2xl w-full max-w-md overflow-hidden`} onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/10 flex justify-between items-center barra">
              <h3 className="text-xl font-extrabold text-white">Compartilhar Relatório</h3>
              <button onClick={() => setShareData(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => {
                  openWhatsapp("", shareData.message);
                  setShareData(null);
                }}
                className={`w-full p-3.5 rounded-xl flex items-center gap-3 transition-all text-left cursor-pointer ${cardBase} hover:border-emerald-500/50`}
              >
                <div className="shrink-0">
                  <WhatsAppIcon size={22} className="text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-emerald-400 leading-tight">WhatsApp</p>
                  <p className="text-xs text-slate-400 leading-tight mt-0.5">Enviar diretamente para um contato</p>
                </div>
              </button>

              <button
                onClick={() => {
                  window.open(`mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodeURIComponent(shareData.message)}`, "_blank");
                  setShareData(null);
                }}
                className={`w-full p-3.5 rounded-xl flex items-center gap-3 transition-all text-left cursor-pointer ${cardBase} hover:border-[var(--gm-primary)]/50`}
              >
                <div className="shrink-0">
                  <Mail size={22} className="text-[var(--gm-primary)]" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-[var(--gm-primary)] leading-tight">E-mail</p>
                  <p className="text-xs text-slate-400 leading-tight mt-0.5">Enviar por correio eletrônico</p>
                </div>
              </button>

              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(shareData.message);
                  pushToast({ type: "success", title: "Copiado", message: "Texto copiado para a área de transferência!" });
                  setShareData(null);
                }}
                className={`w-full p-3.5 rounded-xl flex items-center gap-3 transition-all text-left cursor-pointer ${cardBase} hover:border-white/30`}
              >
                <div className="shrink-0">
                  <Copy size={22} className="text-slate-300" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-white leading-tight">Copiar Texto</p>
                  <p className="text-xs text-slate-400 leading-tight mt-0.5">Copiar para a área de transferência</p>
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
                  className={`w-full p-3.5 rounded-xl flex items-center gap-3 transition-all text-left cursor-pointer ${cardBase} hover:border-[var(--gm-primary)]/50`}
                >
                  <div className="shrink-0">
                    <Share2 size={22} className="text-[var(--gm-primary)]" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[var(--gm-primary)] leading-tight">Mais Opções</p>
                    <p className="text-[10px] text-slate-400 leading-tight">Menu de compartilhamento do sistema</p>
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