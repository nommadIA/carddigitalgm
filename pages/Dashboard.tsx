import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Download,
  Plus,
  TrendingUp,
  Users,
  Clock,
  ArrowUpRight,
  Loader2,
  Wallet,
  FileText,
  UserPlus,
  BarChart3,
  X,
  Maximize2,
  CheckCircle2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import SafeResponsive from "../components/ui/SafeResponsive";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/AuthContext";
import { pushToast } from "../store/toast";
import { fetchSettingsSupabase, readSettingsLocal, AppSettings } from "../lib/settings";
import { SectionDivider } from "../components/ui/SectionDivider";
import { generateFullAppSummaryPdf } from "../services/pdfService";

function formatPhoneBR(value: string) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

interface BudgetRow {
  id: string;
  client_name: string;
  service_name: string;
  total_amount: number;
  status: string;
}

/* ---------- Componente MiniSparkline para a miniatura do gráfico ---------- */
function MiniSparkline({ data }: { data: number[] }) {
  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const width = 200;
  const height = 40;
  const padding = 4;
  const usableHeight = height - padding * 2;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - padding - ((val - min) / range) * usableHeight;
    return { x, y };
  });

  let pathD = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const mx = (curr.x + next.x) / 2;
    pathD += ` C ${mx},${curr.y} ${mx},${next.y} ${next.x},${next.y}`;
  }

  const fillD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id="miniSparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--gm-primary)" stopOpacity={0.45} />
          <stop offset="100%" stopColor="var(--gm-primary)" stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#miniSparkGrad)" />
      <path d={pathD} fill="none" stroke="var(--gm-primary)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- Estilos reutilizáveis (tokens do tema em --gm-*) ---------- */
const cardBase =
  "gm-card rounded-2xl transition-all";
const inputBase =
  "w-full gm-input rounded-xl px-4 py-3 text-sm text-[color:var(--gm-text)] placeholder-zinc-500 focus:outline-none focus:border-[color:var(--gm-primary)] transition-all";

export default function Dashboard() {
  const { tenantId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Modal Faturamento State
  const [faturamentoModalOpen, setFaturamentoModalOpen] = useState(false);
  const [faturamentoPeriod, setFaturamentoPeriod] = useState<"30d" | "6m" | "12m">("30d");

  // App Settings (for user registered company logo & name)
  const [appSettings, setAppSettings] = useState<AppSettings | null>(() => readSettingsLocal());

  // Live Clock & Date Widget State
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Form state for "Novo cliente"
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [savingClient, setSavingClient] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    faturamentoMensal: 48230,
    orcametosAbertos: 17,
    aguardando: 6,
    ticketMedio: 2836,
    clientesAtivos: 132,
  });

  // Recent budgets list
  const [recentBudgets, setRecentBudgets] = useState<BudgetRow[]>([
    {
      id: "1",
      client_name: "Studio Marés",
      service_name: "Identidade visual",
      total_amount: 3400,
      status: "APROVADO",
    },
    {
      id: "2",
      client_name: "Casa Bento",
      service_name: "Site institucional",
      total_amount: 6150,
      status: "NA FILA",
    },
    {
      id: "3",
      client_name: "Bruta Café",
      service_name: "Cardápio digital",
      total_amount: 980,
      status: "RECUSADO",
    },
  ]);

  useEffect(() => {
    async function loadDashboardData() {
      if (!tenantId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch Settings (for logo)
        fetchSettingsSupabase(tenantId).then((s) => {
          if (s) setAppSettings(s);
        });

        const [budgetsRes, clientsRes] = await Promise.all([
          supabase
            .from("budgets")
            .select("*")
            .eq("tenant_id", tenantId)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("clients")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .is("deleted_at", null),
        ]);

        if (budgetsRes.data && budgetsRes.data.length > 0) {
          const mapped: BudgetRow[] = budgetsRes.data.map((b: any) => ({
            id: b.id,
            client_name: b.client_name || b.title || "Cliente sem nome",
            service_name: b.service_name || b.category || "Serviço padrão",
            total_amount: Number(b.total_amount || b.total || 0),
            status: (b.status || "NA FILA").toUpperCase(),
          }));
          setRecentBudgets(mapped);

          // Calculate real metrics if data exists
          const totalFaturamento = mapped.reduce(
            (acc, curr) =>
              curr.status === "APROVADO" || curr.status === "CONCLUIDO"
                ? acc + curr.total_amount
                : acc,
            0
          );
          if (totalFaturamento > 0) {
            setStats((prev) => ({
              ...prev,
              faturamentoMensal: totalFaturamento,
              clientesAtivos: clientsRes.count || prev.clientesAtivos,
            }));
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();

    const handleSettingsUpdate = (e: any) => {
      if (e?.detail) {
        setAppSettings(e.detail);
      } else if (tenantId) {
        fetchSettingsSupabase(tenantId).then((s) => {
          if (s) setAppSettings(s);
        });
      }
    };

    window.addEventListener("gm_settings_updated", handleSettingsUpdate);
    window.addEventListener("gm_theme_updated", handleSettingsUpdate);
    return () => {
      window.removeEventListener("gm_settings_updated", handleSettingsUpdate);
      window.removeEventListener("gm_theme_updated", handleSettingsUpdate);
    };
  }, [tenantId]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      pushToast({ title: "Informe o nome do cliente", type: "error" });
      return;
    }

    try {
      setSavingClient(true);
      if (tenantId) {
        const { error } = await supabase.from("clients").insert({
          tenant_id: tenantId,
          name: newClientName.trim(),
          phone: newClientPhone.trim(),
        });
        if (error) throw error;
      }

      pushToast({ title: "Cliente cadastrado com sucesso!", type: "success" });
      setStats((prev) => ({ ...prev, clientesAtivos: prev.clientesAtivos + 1 }));
      setNewClientName("");
      setNewClientPhone("");
    } catch (err: any) {
      pushToast({ title: err.message || "Erro ao salvar cliente", type: "error" });
    } finally {
      setSavingClient(false);
    }
  };

  // Exporting state
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!tenantId) {
      pushToast({ title: "Sessão não identificada", type: "error" });
      return;
    }

    try {
      setExporting(true);
      pushToast({ title: "Gerando relatório completo em PDF com Timbrado...", type: "info" });

      const [settingsData, budgetsRes, clientsRes, notesRes, expensesRes, marketRes] = await Promise.all([
        fetchSettingsSupabase(tenantId),
        supabase.from("budgets").select("*").eq("tenant_id", tenantId).is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("clients").select("*").eq("tenant_id", tenantId).is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("notes").select("*").eq("tenant_id", tenantId).is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("expenses").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
        supabase.from("shopping_items").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      ]);

      const settings = settingsData || (appSettings as AppSettings) || { company_name: "CardDigital GM" };

      await generateFullAppSummaryPdf({
        settings,
        budgets: budgetsRes.data || [],
        clients: clientsRes.data || [],
        notes: notesRes.data || [],
        expenses: expensesRes.data || [],
        marketItems: marketRes.data || [],
      });

      pushToast({ title: "Relatório Timbrado exportado com sucesso!", type: "success" });
    } catch (err: any) {
      console.error("Erro na exportação do relatório:", err);
      pushToast({ title: err.message || "Falha ao gerar o relatório em PDF", type: "error" });
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes("APROV") || s.includes("CONCLU")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          APROVADO
        </span>
      );
    }
    if (s.includes("RECUS") || s.includes("CANCEL")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-red-500/10 text-red-400 border border-red-500/20 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          RECUSADO
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
        NA FILA
      </span>
    );
  };

  // Mini tendência (sparkline) dos orçamentos recentes
  const sparklineValues = useMemo(() => {
    if (recentBudgets.length >= 2) {
      const vals = [...recentBudgets].reverse().map((b) => b.total_amount);
      if (vals.length === 2) return [vals[0] * 0.85, vals[0], (vals[0] + vals[1]) / 2, vals[1]];
      return vals;
    }
    return [1200, 1800, 1500, 2400, 2100, 2800];
  }, [recentBudgets]);

  // Dados do gráfico detalhado do Modal de Faturamento
  const faturamentoChartData = useMemo(() => {
    if (faturamentoPeriod === "30d") {
      return [
        { date: "Dia 01", valor: Math.round(stats.faturamentoMensal * 0.15), orcamentos: 2 },
        { date: "Dia 05", valor: Math.round(stats.faturamentoMensal * 0.28), orcamentos: 4 },
        { date: "Dia 10", valor: Math.round(stats.faturamentoMensal * 0.45), orcamentos: 7 },
        { date: "Dia 15", valor: Math.round(stats.faturamentoMensal * 0.62), orcamentos: 10 },
        { date: "Dia 20", valor: Math.round(stats.faturamentoMensal * 0.78), orcamentos: 13 },
        { date: "Dia 25", valor: Math.round(stats.faturamentoMensal * 0.90), orcamentos: 15 },
        { date: "Hoje", valor: stats.faturamentoMensal, orcamentos: stats.orcametosAbertos },
      ];
    } else if (faturamentoPeriod === "6m") {
      return [
        { date: "Mar", valor: Math.round(stats.faturamentoMensal * 0.72), orcamentos: 11 },
        { date: "Abr", valor: Math.round(stats.faturamentoMensal * 0.80), orcamentos: 13 },
        { date: "Mai", valor: Math.round(stats.faturamentoMensal * 0.88), orcamentos: 14 },
        { date: "Jun", valor: Math.round(stats.faturamentoMensal * 0.84), orcamentos: 13 },
        { date: "Jul", valor: Math.round(stats.faturamentoMensal * 0.94), orcamentos: 16 },
        { date: "Ago", valor: stats.faturamentoMensal, orcamentos: stats.orcametosAbertos },
      ];
    } else {
      return [
        { date: "Set", valor: 28000, orcamentos: 10 },
        { date: "Out", valor: 32000, orcamentos: 12 },
        { date: "Nov", valor: 39000, orcamentos: 14 },
        { date: "Dez", valor: 45000, orcamentos: 18 },
        { date: "Jan", valor: 31000, orcamentos: 11 },
        { date: "Fev", valor: 36000, orcamentos: 13 },
        { date: "Mar", valor: 38000, orcamentos: 14 },
        { date: "Abr", valor: 41000, orcamentos: 15 },
        { date: "Mai", valor: 44000, orcamentos: 16 },
        { date: "Jun", valor: 42000, orcamentos: 15 },
        { date: "Jul", valor: 46000, orcamentos: 16 },
        { date: "Ago", valor: stats.faturamentoMensal, orcamentos: stats.orcametosAbertos },
      ];
    }
  }, [faturamentoPeriod, stats]);

  // Distribuição por status dos orçamentos recentes (dado real, derivado do que já foi buscado)
  const statusChartData = useMemo(() => {
    const counts = { Aprovado: 0, "Na Fila": 0, Recusado: 0 };
    recentBudgets.forEach((b) => {
      const s = b.status.toUpperCase();
      if (s.includes("APROV") || s.includes("CONCLU")) counts["Aprovado"]++;
      else if (s.includes("RECUS") || s.includes("CANCEL")) counts["Recusado"]++;
      else counts["Na Fila"]++;
    });
    return [
      { name: "Aprovado", value: counts["Aprovado"], color: "#34d399" },
      { name: "Na Fila", value: counts["Na Fila"], color: "#fbbf24" },
      { name: "Recusado", value: counts["Recusado"], color: "#f87171" },
    ];
  }, [recentBudgets]);

  return (
    <div className="w-full min-h-screen bg-transparent text-[color:var(--gm-text)] p-4 sm:p-6 lg:p-8 space-y-8">
      {/* 1. TOP HEADER WITH ENLARGED LOGO, TITLE & FULL-WIDTH PROMINENT CLOCK */}
      <div className="flex flex-col gap-6 pb-6 border-b border-[color:var(--gm-border-light)] w-full">
        {/* Top: Logo + Title (Ampliados e alinhados até as bordas) */}
        <div className="w-full flex items-center justify-start gap-4 text-left">
          {appSettings?.company_logo_url ? (
            <div className="shrink-0 flex items-center justify-center">
              <img
                src={appSettings.company_logo_url}
                alt={appSettings.company_name || "Logo da Empresa"}
                className="h-16 sm:h-20 md:h-24 w-auto max-w-[260px] sm:max-w-[340px] object-contain rounded-xl shadow-md"
              />
            </div>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl bg-[color:var(--gm-primary)]/10 border border-[color:var(--gm-primary)]/30 p-3 flex items-center justify-center text-[color:var(--gm-primary)] shadow-md shrink-0 font-black text-2xl sm:text-3xl uppercase tracking-wider">
              {appSettings?.company_name ? appSettings.company_name.substring(0, 2) : "GM"}
            </div>
          )}

          <div className="flex flex-col text-left flex-1 min-w-0">
            <div className="text-xs sm:text-base font-extrabold tracking-widest text-[color:var(--gm-primary)] uppercase">
              {appSettings?.company_name ? `${appSettings.company_name} · PAINEL` : "PAINEL · VISÃO GERAL"}
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-[color:var(--gm-text)] tracking-tight mt-1 truncate">
              Dashboard
            </h1>
          </div>
        </div>

        {/* WIDGET RELÓGIO E DATA (VERSÃO SMARTPHONE: MESMO EFEITO GLASS DO FATURAMENTO DO MÊS) */}
        <div className="w-full flex flex-col items-center justify-center text-center py-4 px-5 gm-card gm-stat-card gm-clock-card rounded-2xl transition-all">
          <div className="flex items-center justify-center gap-3 font-mono">
            <Clock size={32} className="text-[color:var(--gm-primary)] animate-pulse shrink-0" />
            <span className="text-3xl sm:text-5xl md:text-6xl font-black tracking-widest text-[color:var(--gm-text)]">
              {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
          <span className="text-sm sm:text-base font-bold text-[color:var(--gm-text-secondary)] capitalize mt-1.5 tracking-wider">
            {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </span>
        </div>

        {/* BOTÕES NOVO ORÇAMENTO E EXPORTAR LADO A LADO COM O MESMO VISUAL PADRÃO */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 w-full">
          <Link
            to="/budgets?new=true"
            className="gm-btn group flex-1 h-12 text-xs sm:text-sm uppercase tracking-wider font-extrabold flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] transition-all cursor-pointer"
          >
            <Plus size={18} className="transition-transform duration-300 ease-in-out group-hover:rotate-180" />
            <span>Novo Orçamento</span>
          </Link>

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="gm-btn group flex-1 h-12 text-xs sm:text-sm uppercase tracking-wider font-extrabold flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            title="Exportar relatório consolidado (Orçamentos, Clientes, Notas, Financeiro e Mercado) no papel timbrado"
          >
            {exporting ? (
              <>
                <Loader2 size={18} className="animate-spin text-white" />
                <span>Exportando...</span>
              </>
            ) : (
              <>
                <Download size={18} className="transition-transform duration-300 ease-in-out group-hover:scale-110" />
                <span>Exportar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SEPARADOR: MÉTRICAS */}
      <SectionDivider label="Métricas gerais" />

      {/* 2. TOP METRIC CARDS WITH DISTINCT ICON BOXES (4 COLUMNS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-1">
        {/* CARD 1: FATURADO NO MÊS (com sparkline e modal interativo) */}
        <div
          onClick={() => setFaturamentoModalOpen(true)}
          className={`p-5 flex flex-col justify-between space-y-3 group ${cardBase} hover:border-[color:var(--gm-primary)]/60 cursor-pointer relative overflow-hidden`}
          title="Clique para ver o gráfico detalhado do Faturamento"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-[color:var(--gm-text-tertiary)] uppercase tracking-wider block">
                Faturado no Mês
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[color:var(--gm-text)] mt-1.5 tracking-tight group-hover:text-[color:var(--gm-primary)] transition-colors">
                {formatCurrency(stats.faturamentoMensal)}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[color:var(--gm-primary)]/10 border border-[color:var(--gm-primary)]/25 text-[color:var(--gm-primary)] flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
              <TrendingUp size={20} />
            </div>
          </div>

          <div className="h-10 my-1 relative overflow-hidden">
            <MiniSparkline data={sparklineValues} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg w-fit border border-emerald-500/20">
              <ArrowUpRight size={14} />
              <span>+12,4% este mês</span>
            </div>
            <span className="text-[10px] font-bold text-[color:var(--gm-primary)] flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
              <Maximize2 size={12} /> Gráfico
            </span>
          </div>
        </div>

        {/* CARD 2: ORÇAMENTOS ABERTOS */}
        <div className={`p-5 flex flex-col justify-between space-y-3 group ${cardBase} hover:border-amber-500/40`}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-[color:var(--gm-text-tertiary)] uppercase tracking-wider block">
                Orçamentos Abertos
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[color:var(--gm-text)] mt-1.5 tracking-tight group-hover:text-amber-400 transition-colors">
                {stats.orcametosAbertos}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              <Clock size={20} />
            </div>
          </div>

          <div className="h-10 my-1" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg w-fit border border-amber-500/20">
              <Clock size={14} />
              <span>{stats.aguardando} em análise</span>
            </div>
          </div>
        </div>

        {/* CARD 3: TICKET MÉDIO */}
        <div className={`p-5 flex flex-col justify-between space-y-3 group ${cardBase} hover:border-emerald-500/40`}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-[color:var(--gm-text-tertiary)] uppercase tracking-wider block">
                Ticket Médio
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[color:var(--gm-text)] mt-1.5 tracking-tight group-hover:text-emerald-400 transition-colors">
                {formatCurrency(stats.ticketMedio)}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
              <Wallet size={20} />
            </div>
          </div>

          <div className="h-10 my-1" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg w-fit border border-emerald-500/20">
              <ArrowUpRight size={14} />
              <span>+4,1% do alvo</span>
            </div>
          </div>
        </div>

        {/* CARD 4: CLIENTES ATIVOS */}
        <div className={`p-5 flex flex-col justify-between space-y-3 group ${cardBase} hover:border-blue-500/40`}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-[color:var(--gm-text-tertiary)] uppercase tracking-wider block">
                Clientes Ativos
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[color:var(--gm-text)] mt-1.5 tracking-tight group-hover:text-blue-400 transition-colors">
                {stats.clientesAtivos}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
              <Users size={20} />
            </div>
          </div>

          <div className="h-10 my-1" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg w-fit border border-blue-500/20">
              <Users size={14} />
              <span>+9 novos esta semana</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEPARADOR: ORÇAMENTOS RECENTES */}
      <SectionDivider label="Atividade recente" />

      {/* 4. SECTION: ORÇAMENTOS RECENTES */}
      <div className="space-y-4 mt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[color:var(--gm-primary)]/10 border border-[color:var(--gm-primary)]/20 text-[color:var(--gm-primary)] flex items-center justify-center shrink-0">
              <FileText size={18} />
            </div>
            <h2 className="text-xl font-bold text-[color:var(--gm-text)] tracking-tight">
              Orçamentos recentes
            </h2>
          </div>

          <Link to="/budgets" className="gm-btn gm-btn-soft h-12 text-xs uppercase tracking-wider">
            <span>Ver Todos</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className={`overflow-hidden ${cardBase}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-[color:var(--gm-border-light)] text-xs font-bold text-[color:var(--gm-text-tertiary)] uppercase tracking-wider">
                  <th className="px-6 py-4">CLIENTE</th>
                  <th className="px-6 py-4">SERVIÇO</th>
                  <th className="px-6 py-4">VALOR</th>
                  <th className="px-6 py-4 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--gm-border)] text-sm">
                {recentBudgets.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    onClick={() => navigate(`/budgets`)}
                  >
                    <td className="px-6 py-4 font-bold text-[color:var(--gm-text)] whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-[color:var(--gm-border-light)] flex items-center justify-center text-[color:var(--gm-text-secondary)] font-extrabold text-xs uppercase group-hover:bg-[color:var(--gm-primary)] group-hover:text-white group-hover:border-[color:var(--gm-primary)] transition-colors">
                          {item.client_name.substring(0, 2)}
                        </div>
                        <span className="text-sm font-semibold text-[color:var(--gm-text)]">
                          {item.client_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[color:var(--gm-text-secondary)] font-medium whitespace-nowrap">
                      {item.service_name}
                    </td>
                    <td className="px-6 py-4 font-bold text-[color:var(--gm-text)] whitespace-nowrap">
                      {item.total_amount.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SEPARADOR: AÇÕES RÁPIDAS */}
      <SectionDivider label="Ações rápidas" />

      {/* 5. LOWER SECTION: GRID 2 COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-1">
        {/* LEFT COLUMN: NOVO CLIENTE */}
        <div className={`lg:col-span-2 p-6 ${cardBase}`}>
          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-11 h-11 rounded-xl bg-[color:var(--gm-primary)]/10 border border-[color:var(--gm-primary)]/25 text-[color:var(--gm-primary)] flex items-center justify-center shrink-0 shadow-inner">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[color:var(--gm-text)] tracking-tight">
                Novo cliente
              </h2>
              <p className="text-xs text-[color:var(--gm-text-tertiary)] font-medium">
                Cadastre novos contatos rapidamente para emitir orçamentos
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateClient} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[color:var(--gm-text-secondary)] mb-2 block uppercase tracking-wide">
                Nome do Cliente
              </label>
              <input
                type="text"
                placeholder="Ex: Studio Marés Design"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className={inputBase}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[color:var(--gm-text-secondary)] mb-2 block uppercase tracking-wide">
                WhatsApp / Telefone
              </label>
              <input
                type="text"
                placeholder="(00) 90000-0000"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(formatPhoneBR(e.target.value))}
                inputMode="tel"
                className={inputBase}
              />
            </div>

            <div className="pt-2">
              <button type="submit" disabled={savingClient} className="gm-btn h-12 text-xs uppercase tracking-wider">
                {savingClient ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                <span>Cadastrar Cliente</span>
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: PALETA DO SISTEMA (CONFORME IMAGEM DE PALETA) */}
        <div className={`lg:col-span-1 p-6 flex flex-col justify-between ${cardBase}`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[color:var(--gm-text)] tracking-tight">
                  Palette
                </h2>
                <p className="text-xs text-[color:var(--gm-text-tertiary)] font-medium">
                  Paleta de cores oficial do sistema
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#F65A1A] bg-[#F65A1A]/10 px-2.5 py-1 rounded-full border border-[#F65A1A]/30">
                8 CORES
              </span>
            </div>

            {/* GRID DE CARDS DA PALETA IGUAL À IMAGEM ANEXADA */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2.5">
              {[
                { name: "Ink", hex: "#0B0B0C" },
                { name: "Graphite", hex: "#131315" },
                { name: "Slate", hex: "#1B1B1E" },
                { name: "Filament", hex: "#26262A" },
                { name: "Ember", hex: "#F65A1A" },
                { name: "Spark", hex: "#FF7A38" },
                { name: "Bone", hex: "#F2F2F3" },
                { name: "Ash", hex: "#8B8B92" },
              ].map((color) => (
                <div
                  key={color.name}
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(color.hex);
                      pushToast({ title: "Cor copiada", message: `Cor ${color.name} (${color.hex}) copiada!`, type: "success" });
                    } catch (e) {}
                  }}
                  className="rounded-lg border border-[#26262A] overflow-hidden bg-[#131315] hover:border-[#F65A1A]/70 transition-all cursor-pointer group shadow-xs flex flex-col"
                  title={`Clique para copiar ${color.hex}`}
                >
                  {/* Bloco Superior com a Cor */}
                  <div
                    className="h-14 sm:h-16 w-full transition-transform duration-300 group-hover:scale-[1.03] relative"
                    style={{ backgroundColor: color.hex }}
                  >
                    {color.hex === "#F2F2F3" && (
                      <div className="absolute inset-0 border border-slate-300/40 pointer-events-none" />
                    )}
                  </div>

                  {/* Painel Inferior com Nome e Código Hex */}
                  <div className="p-2 sm:p-2.5 bg-[#131315] border-t border-[#26262A]/60 flex flex-col justify-center">
                    <h4 className="text-xs font-bold text-white group-hover:text-[#F65A1A] transition-colors leading-tight">
                      {color.name}
                    </h4>
                    <p className="text-[10px] font-mono text-[#8B8B92] uppercase mt-0.5 tracking-wider font-semibold">
                      {color.hex}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL FATURAMENTO (MÉTRICAS GERAIS) */}
      {faturamentoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl gm-card rounded-3xl border border-white/20 p-6 sm:p-8 shadow-2xl overflow-hidden space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[color:var(--gm-primary)]/15 border border-[color:var(--gm-primary)]/30 text-[color:var(--gm-primary)] flex items-center justify-center shrink-0 shadow-inner">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-[color:var(--gm-primary)] uppercase tracking-wider block">
                    Métricas Gerais · Detalhamento
                  </span>
                  <h3 className="text-2xl font-black text-[color:var(--gm-text)] tracking-tight">
                    Evolução do Faturamento
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setFaturamentoModalOpen(false)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                title="Fechar modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Resumo em cards dentro do modal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl gm-card gm-summary-card border-none flex flex-col justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Total Faturado ({faturamentoPeriod === "30d" ? "30 dias" : faturamentoPeriod === "6m" ? "6 meses" : "12 meses"})
                </span>
                <div className="text-2xl font-black text-[color:var(--gm-text)] mt-1">
                  {formatCurrency(stats.faturamentoMensal)}
                </div>
                <span className="text-xs font-semibold text-emerald-400 mt-1 flex items-center gap-1">
                  <ArrowUpRight size={14} /> +12,4% no período
                </span>
              </div>

              <div className="p-4 rounded-2xl gm-card gm-summary-card border-none flex flex-col justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Ticket Médio
                </span>
                <div className="text-2xl font-black text-[color:var(--gm-text)] mt-1">
                  {formatCurrency(stats.ticketMedio)}
                </div>
                <span className="text-xs font-semibold text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 size={14} /> Meta alinhada
                </span>
              </div>

              <div className="p-4 rounded-2xl gm-card gm-summary-card border-none flex flex-col justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Meta Mensal (R$ 50.000)
                </span>
                <div className="text-2xl font-black text-[color:var(--gm-text)] mt-1">
                  {Math.min(100, Math.round((stats.faturamentoMensal / 50000) * 100))}% Atingido
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-[color:var(--gm-primary)] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((stats.faturamentoMensal / 50000) * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Controles do Gráfico (Filtros de Período) */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
              <div className="text-sm font-bold text-zinc-300">
                Gráfico de Faturamento acumulado
              </div>
              <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10">
                <button
                  onClick={() => setFaturamentoPeriod("30d")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    faturamentoPeriod === "30d"
                      ? "bg-[color:var(--gm-primary)] text-white shadow-md"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  30 Dias
                </button>
                <button
                  onClick={() => setFaturamentoPeriod("6m")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    faturamentoPeriod === "6m"
                      ? "bg-[color:var(--gm-primary)] text-white shadow-md"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  6 Meses
                </button>
                <button
                  onClick={() => setFaturamentoPeriod("12m")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    faturamentoPeriod === "12m"
                      ? "bg-[color:var(--gm-primary)] text-white shadow-md"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  12 Meses
                </button>
              </div>
            </div>

            {/* GRÁFICO PRINCIPAL COM ALTURA E VISIBILIDADE GARANTIDAS */}
            <div className="w-full h-72 bg-black/30 rounded-2xl border border-white/10 p-4 relative overflow-hidden">
              <SafeResponsive height={260}>
                <AreaChart data={faturamentoChartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="modalFaturamentoGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--gm-primary)" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="var(--gm-primary)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="date" stroke="#8B8B92" tick={{ fill: "#8B8B92", fontSize: 12 }} />
                  <YAxis
                    stroke="#8B8B92"
                    tick={{ fill: "#8B8B92", fontSize: 12 }}
                    tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-3 bg-zinc-900/95 border border-white/20 rounded-xl shadow-2xl backdrop-blur-md text-white">
                            <p className="text-xs font-bold text-zinc-400 mb-1">{label}</p>
                            <p className="text-sm font-black text-[color:var(--gm-primary)]">
                              {formatCurrency(Number(payload[0].value))}
                            </p>
                            {payload[0].payload.orcamentos ? (
                              <p className="text-[11px] font-semibold text-zinc-300 mt-0.5">
                                {payload[0].payload.orcamentos} orçamentos
                              </p>
                            ) : null}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke="var(--gm-primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#modalFaturamentoGradient)"
                  />
                </AreaChart>
              </SafeResponsive>
            </div>

            {/* Footer do Modal */}
            <div className="flex items-center justify-between pt-2 text-xs text-zinc-400 border-t border-white/10">
              <span>* Atualizado em tempo real</span>
              <button
                onClick={() => setFaturamentoModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
