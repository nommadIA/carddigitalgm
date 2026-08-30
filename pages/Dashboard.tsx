import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Download,
  Plus,
  TrendingUp,
  Users,
  Clock,
  Timer,
  ArrowUpRight,
  Loader2,
  Wallet,
  FileText,
  UserPlus,
} from "lucide-react";
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

function formatDashboardDate(d: Date) {
  const raw = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return raw
    .replace(/^(\p{L})/u, (m) => m.toUpperCase())
    .replace(/(de\s+)(\p{L})/gu, (_, p1, p2) => p1 + p2.toUpperCase());
}

interface BudgetRow {
  id: string;
  client_name: string;
  service_name: string;
  total_amount: number;
  status: string;
}

/* ---------- Estilos reutilizáveis (tokens do tema em --gm-*) ---------- */
const cardBase =
  "fora rounded-2xl transition-all border border-white/10 shadow-none";
const inputBase =
  "w-full gm-input barra rounded-xl px-4 py-3 text-sm text-[color:var(--gm-text)] placeholder-zinc-500 focus:outline-none focus:border-[color:var(--gm-primary)] transition-all border border-white/10 shadow-none";

export default function Dashboard() {
  const { tenantId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // App Settings (for user registered company logo & name)
  const [appSettings, setAppSettings] = useState<AppSettings | null>(() => readSettingsLocal());

  // Live Clock & Date Widget State
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time analog clock hand angles
  const clockSeconds = now.getSeconds();
  const clockMinutes = now.getMinutes();
  const clockHours = now.getHours();
  const clockSecondDeg = clockSeconds * 6;
  const clockMinuteDeg = clockMinutes * 6 + clockSeconds * 0.1;
  const clockHourDeg = (clockHours % 12) * 30 + clockMinutes * 0.5;

  // Form state for "Novo cliente"
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [savingClient, setSavingClient] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    faturamentoMensal: 0,
    orcametosAbertos: 0,
    aguardando: 0,
    ticketMedio: 0,
    clientesAtivos: 0,
  });

  // Recent budgets list (starts empty for new accounts)
  const [recentBudgets, setRecentBudgets] = useState<BudgetRow[]>([]);

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

        let budgetsQuery = supabase
          .from("budgets")
          .select("*")
          .order("created_at", { ascending: false });

        if (tenantId) {
          budgetsQuery = budgetsQuery.eq("tenant_id", tenantId);
        }

        let clientsQuery = supabase
          .from("clients")
          .select("id", { count: "exact", head: true });

        if (tenantId) {
          clientsQuery = clientsQuery.eq("tenant_id", tenantId);
        }

        const [budgetsRes, clientsRes] = await Promise.all([
          budgetsQuery,
          clientsQuery,
        ]);

        const allBudgets = (budgetsRes.data || []).filter((b: any) => !b.deleted_at);
        const mapped: BudgetRow[] = allBudgets.slice(0, 5).map((b: any) => ({
          id: b.id,
          client_name: b.client_name || b.title || b.customer_name || "Cliente",
          service_name: b.service_name || b.category || b.items?.[0]?.description || b.items?.[0]?.name || "Orçamento",
          total_amount: Number(b.total_amount || b.total || 0),
          status: (b.status || "AGUARDANDO").toUpperCase(),
        }));
        setRecentBudgets(mapped);

        // Calculate real metrics directly from user's tenant budgets
        let faturamento = 0;
        let abertos = 0;
        let aguardando = 0;
        let countAprovados = 0;
        let totalGeral = 0;

        for (const b of allBudgets) {
          const status = (b.status || "").toString().toUpperCase().trim();
          const valor = Number(b.total_amount || b.total || 0);
          totalGeral += valor;

          if (
            status.includes("APROV") ||
            status.includes("CONCL") ||
            status.includes("FINAL") ||
            status.includes("PROD") ||
            status.includes("PRONTO")
          ) {
            faturamento += valor;
            countAprovados += 1;
          } else if (status.includes("AGUAR") || status.includes("ENVI")) {
            aguardando += 1;
          } else if (!status.includes("CANC")) {
            abertos += 1;
          }
        }

        const displayFaturamento = faturamento > 0 ? faturamento : (countAprovados === 0 && allBudgets.length > 0 ? totalGeral : faturamento);
        const divisor = countAprovados > 0 ? countAprovados : allBudgets.length;
        const ticketMedio = divisor > 0 ? Math.round(displayFaturamento / divisor) : 0;
        const totalClientes = clientsRes.count || 0;

        setStats({
          faturamentoMensal: displayFaturamento,
          orcametosAbertos: abertos,
          aguardando: aguardando,
          ticketMedio: ticketMedio,
          clientesAtivos: totalClientes,
        });
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
    <div className="w-full bg-transparent text-[color:var(--gm-text)] space-y-6">
      {/* 1. TOP HEADER WITH USER LOGO & TITLE */}
      <div className="w-full flex items-center justify-start gap-4 text-left">
        {appSettings?.company_logo_url ? (
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22 rounded-2xl !p-0 flex items-center justify-center shadow-md shrink-0 overflow-hidden border border-white/15 bg-black/40">
            <img
              src={appSettings.company_logo_url}
              alt={appSettings.company_name || "Logo da Empresa"}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22 rounded-2xl bg-[color:var(--gm-primary)]/10 border border-[color:var(--gm-primary)]/30 p-3 flex items-center justify-center text-[color:var(--gm-primary)] shadow-md shrink-0 font-black text-2xl sm:text-3xl uppercase tracking-wider">
            {appSettings?.company_name ? appSettings.company_name.substring(0, 2) : "GM"}
          </div>
        )}

        <div className="flex flex-col text-left flex-1 min-w-0">
          <div className="text-xs sm:text-sm font-extrabold tracking-widest text-[color:var(--gm-primary)] uppercase">
            {appSettings?.company_name ? `${appSettings.company_name} · PAINEL` : "PAINEL"}
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-[color:var(--gm-text)] tracking-tight mt-1 truncate">
            Dashboard
          </h1>
        </div>
      </div>

      {/* 2. CARD DO RELÓGIO DIGITAL CENTRALIZADO (COMO NO PRINT DO USUÁRIO) */}
      <div className={`p-6 sm:p-8 flex flex-col items-center justify-center text-center ${cardBase} bg-white/[0.02] backdrop-blur-md`}>
        <div className="flex items-center justify-center gap-3 sm:gap-4 text-white">
          <Clock size={28} className="text-slate-400 shrink-0" />
          <span className="text-4xl sm:text-5xl md:text-6xl font-black font-mono tracking-widest text-white drop-shadow-md">
            {now.toLocaleTimeString("pt-BR", { hour12: false })}
          </span>
        </div>
        <div className="mt-2 text-sm sm:text-base font-semibold text-slate-400 tracking-wide">
          {formatDashboardDate(now)}
        </div>
      </div>

      {/* 3. BOTÕES NOVO ORÇAMENTO E EXPORTAR LADO A LADO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
        <Link
          to="/budgets?new=true"
          className="gm-btn group h-14 fora rounded-2xl border border-white/10 text-xs sm:text-sm uppercase tracking-wider font-extrabold flex items-center justify-center gap-2 hover:border-[color:var(--gm-primary)] transition-all cursor-pointer bg-white/5 hover:bg-white/10 text-white shadow-none"
        >
          <Plus size={18} className="transition-transform duration-300 ease-in-out group-hover:rotate-180 text-[color:var(--gm-primary)]" />
          <span>NOVO ORÇAMENTO</span>
        </Link>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="gm-btn group h-14 fora rounded-2xl border border-white/10 text-xs sm:text-sm uppercase tracking-wider font-extrabold flex items-center justify-center gap-2 hover:border-[color:var(--gm-primary)] transition-all cursor-pointer bg-white/5 hover:bg-white/10 text-white shadow-none disabled:opacity-60 disabled:cursor-not-allowed"
          title="Exportar relatório consolidado (Orçamentos, Clientes, Notas, Financeiro e Mercado) no papel timbrado"
        >
          {exporting ? (
            <>
              <Loader2 size={18} className="animate-spin text-white" />
              <span>EXPORTANDO...</span>
            </>
          ) : (
            <>
              <Download size={18} className="transition-transform duration-300 ease-in-out group-hover:scale-110 text-[color:var(--gm-primary)]" />
              <span>EXPORTAR</span>
            </>
          )}
        </button>
      </div>

      {/* SEPARADOR: MÉTRICAS */}
      <SectionDivider label="Métricas gerais" />

      {/* 4. TOP METRIC CARDS WITH DISTINCT ICON BOXES (4 COLUMNS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-1">
        {/* CARD 1: FATURADO NO MÊS */}
        <div className={`p-5 flex flex-col justify-between space-y-3 group ${cardBase} hover:border-[color:var(--gm-primary)]/40`}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-[color:var(--gm-text-tertiary)] uppercase tracking-wider block">
                Faturado no Mês
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[color:var(--gm-text)] mt-1.5 tracking-tight group-hover:text-[color:var(--gm-primary)] transition-colors">
                {formatCurrency(stats.faturamentoMensal)}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl barra border border-[color:var(--gm-primary)]/25 text-[color:var(--gm-primary)] flex items-center justify-center shrink-0 shadow-none">
              <TrendingUp size={20} />
            </div>
          </div>

          <div className="h-10 my-1" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg w-fit border border-emerald-500/20">
              <ArrowUpRight size={14} />
              <span>+12,4% este mês</span>
            </div>
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
            <div className="w-11 h-11 rounded-xl barra border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0 shadow-none">
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
            <div className="w-11 h-11 rounded-xl barra border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0 shadow-none">
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
            <div className="w-11 h-11 rounded-xl barra border border-blue-500/25 text-blue-400 flex items-center justify-center shrink-0 shadow-none">
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
            <div className="w-9 h-9 rounded-xl barra border border-[color:var(--gm-primary)]/20 text-[color:var(--gm-primary)] flex items-center justify-center shrink-0 shadow-none">
              <FileText size={18} />
            </div>
            <h2 className="text-xl font-bold text-[color:var(--gm-text)] tracking-tight">
              Orçamentos recentes
            </h2>
          </div>

          <Link to="/budgets" className="gm-btn gm-btn-soft h-12 text-xs uppercase tracking-wider shadow-none">
            <span>Ver Todos</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className={`overflow-hidden ${cardBase}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="barra border-b border-white/10 text-xs font-bold text-[color:var(--gm-text-tertiary)] uppercase tracking-wider">
                  <th className="px-6 py-4">CLIENTE</th>
                  <th className="px-6 py-4">SERVIÇO</th>
                  <th className="px-6 py-4">VALOR</th>
                  <th className="px-6 py-4 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {recentBudgets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-xs font-semibold text-[color:var(--gm-text-secondary)]">
                      Nenhum orçamento emitido ainda. Clique em "Novo Orçamento" para começar.
                    </td>
                  </tr>
                ) : (
                  recentBudgets.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                      onClick={() => navigate(`/budgets`)}
                    >
                      <td className="px-6 py-4 font-bold text-[color:var(--gm-text)] whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg barra border border-white/10 flex items-center justify-center text-[color:var(--gm-text-secondary)] font-extrabold text-xs uppercase group-hover:bg-[color:var(--gm-primary)] group-hover:text-white group-hover:border-[color:var(--gm-primary)] transition-colors shadow-none">
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SEPARADOR: AÇÕES RÁPIDAS */}
      <SectionDivider label="Ações rápidas" />

      {/* 5. LOWER SECTION: GRID 2 COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-1 mb-8 sm:mb-12 md:mb-16">
        {/* LEFT COLUMN: NOVO CLIENTE */}
        <div className={`lg:col-span-2 p-6 ${cardBase}`}>
          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-11 h-11 rounded-xl barra border border-[color:var(--gm-primary)]/25 text-[color:var(--gm-primary)] flex items-center justify-center shrink-0 shadow-none">
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
              <button type="submit" disabled={savingClient} className="gm-btn h-12 text-xs uppercase tracking-wider shadow-none">
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
                  className="rounded-xl border border-white/10 overflow-hidden barra hover:border-[#F65A1A]/70 transition-all cursor-pointer group shadow-none flex flex-col"
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
                  <div className="p-2 sm:p-2.5 barra border-t border-white/10 flex flex-col justify-center">
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
    </div>
  );
}
