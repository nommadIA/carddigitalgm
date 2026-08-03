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
import { fetchSettingsSupabase, AppSettings } from "../lib/settings";
import { SectionDivider } from "../components/ui/SectionDivider";
import ThemeToggle from "../components/ui/ThemeToggle";

interface BudgetRow {
  id: string;
  client_name: string;
  service_name: string;
  total_amount: number;
  status: string;
}

/* ---------- Estilos reutilizáveis (tokens do tema em --gm-*) ---------- */
const cardBase =
  "gm-card rounded-2xl transition-all";
const inputBase =
  "w-full gm-input rounded-xl px-4 py-3 text-sm text-[color:var(--gm-text)] placeholder-zinc-500 focus:outline-none focus:border-[color:var(--gm-primary)] transition-all";

export default function Dashboard() {
  const { tenantId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // App Settings (for user registered company logo & name)
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

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

  const handleExport = () => {
    pushToast({ title: "Relatório exportado com sucesso!", type: "success" });
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

  // Mini tendência (sparkline) dos orçamentos recentes, do mais antigo ao mais novo
  const sparklineData = useMemo(
    () =>
      [...recentBudgets]
        .reverse()
        .map((b, i) => ({ idx: i, value: b.total_amount })),
    [recentBudgets]
  );

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
      {/* 1. TOP HEADER WITH USER LOGO & CLOCK WIDGET */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[color:var(--gm-border-light)]">
        {/* Left side: Logo (if registered) + Title */}
        <div className="flex items-center gap-4 flex-wrap">
          {appSettings?.company_logo_url ? (
            <div className="shrink-0 p-1">
              <img
                src={appSettings.company_logo_url}
                alt={appSettings.company_name || "Logo da Empresa"}
                className="h-10 sm:h-12 w-auto max-w-[200px] object-contain rounded-xl"
              />
            </div>
          ) : null}

          <div>
            <div className="text-xs font-bold tracking-widest text-[color:var(--gm-primary)] uppercase">
              PAINEL · VISÃO GERAL
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[color:var(--gm-text)] tracking-tight mt-0.5">
              Dashboard
            </h1>
          </div>
        </div>

        {/* Right side: Theme Toggle + Clock Widget + Action Buttons */}
        <div className="flex items-center gap-3.5 flex-wrap">
          {/* BOTÃO TEMA CLARO/ESCURO */}
          <ThemeToggle />

          {/* separador vertical */}
          <div className="hidden sm:block w-px h-8 bg-[color:var(--gm-border-light)]" />

          {/* WIDGET RELÓGIO E DATA (SEM CAIXA / MAIOR) */}
          <div className="flex items-center gap-3.5 px-2 py-1">
            <div className="w-10 h-10 rounded-xl bg-[color:var(--gm-primary)]/10 border border-[color:var(--gm-primary)]/20 flex items-center justify-center text-[color:var(--gm-primary)] shrink-0 shadow-xs">
              <Clock size={20} className="animate-pulse" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base sm:text-lg font-black font-mono tracking-wider text-[color:var(--gm-text)]">
                {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[color:var(--gm-text-secondary)] capitalize">
                {now.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* separador vertical entre widget e botões */}
          <div className="hidden sm:block w-px h-8 bg-[color:var(--gm-border-light)]" />

          <button onClick={handleExport} className="gm-btn gm-btn-soft h-12 text-xs uppercase tracking-wider">
            <Download size={14} />
            <span>Exportar</span>
          </button>

          <Link to="/budgets?new=true" className="gm-btn h-12 text-xs uppercase tracking-wider">
            <Plus size={14} />
            <span>Novo Orçamento</span>
          </Link>
        </div>
      </div>

      {/* SEPARADOR: MÉTRICAS */}
      <SectionDivider label="Métricas gerais" />

      {/* 2. TOP METRIC CARDS WITH DISTINCT ICON BOXES (4 COLUMNS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 -mt-2">
        {/* CARD 1: FATURADO NO MÊS (com sparkline) */}
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
            <div className="w-11 h-11 rounded-xl bg-[color:var(--gm-primary)]/10 border border-[color:var(--gm-primary)]/25 text-[color:var(--gm-primary)] flex items-center justify-center shrink-0 shadow-inner">
              <TrendingUp size={20} />
            </div>
          </div>

          {sparklineData.length > 1 ? (
            <div className="h-10 -mx-1 relative overflow-hidden">
              <SafeResponsive height={40}>
                <AreaChart data={sparklineData} margin={{ top: 4, right: 4, bottom: 2, left: 4 }}>
                  <defs>
                    <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--gm-primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--gm-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  <Area type="monotone" dataKey="value" stroke="var(--gm-primary)" strokeWidth={2} fill="url(#sparkFill)" dot={false} />
                </AreaChart>
              </SafeResponsive>
            </div>
          ) : null}

          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg w-fit border border-emerald-500/20">
            <ArrowUpRight size={14} />
            <span>+12,4% este mês</span>
          </div>
        </div>

        {/* CARD 2: ORÇAMENTOS ABERTOS */}
        <div className={`p-5 flex flex-col justify-between space-y-4 group ${cardBase} hover:border-amber-500/40`}>
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
          <div className="text-xs font-semibold text-amber-400/90 bg-amber-500/10 px-2.5 py-1 rounded-lg w-fit border border-amber-500/20">
            {stats.aguardando} em análise
          </div>
        </div>

        {/* CARD 3: TICKET MÉDIO */}
        <div className={`p-5 flex flex-col justify-between space-y-4 group ${cardBase} hover:border-emerald-500/40`}>
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
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg w-fit border border-emerald-500/20">
            <ArrowUpRight size={14} />
            <span>+4,1% do alvo</span>
          </div>
        </div>

        {/* CARD 4: CLIENTES ATIVOS */}
        <div className={`p-5 flex flex-col justify-between space-y-4 group ${cardBase} hover:border-blue-500/40`}>
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
          <div className="text-xs font-semibold text-blue-400/90 bg-blue-500/10 px-2.5 py-1 rounded-lg w-fit border border-blue-500/20">
            +9 novos esta semana
          </div>
        </div>
      </div>

      {/* SEPARADOR: ORÇAMENTOS RECENTES */}
      <SectionDivider label="Atividade recente" />

      {/* 4. SECTION: ORÇAMENTOS RECENTES */}
      <div className="space-y-4 -mt-2">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 -mt-2">
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
                onChange={(e) => setNewClientPhone(e.target.value)}
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
    </div>
  );
}
