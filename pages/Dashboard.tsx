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
  User,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth, MASTER_TENANT_ID } from "../store/AuthContext";
import { pushToast } from "../store/toast";
import { fetchSettingsSupabase, readSettingsLocal, AppSettings } from "../lib/settings";
import { readBudgetsLocal, writeBudgetsLocal } from "../lib/budgetsCache";
import { SectionDivider } from "../components/ui/SectionDivider";
import { generateFullAppSummaryPdf } from "../services/pdfService";
import { BorderBeam } from "../components/ui/BorderBeam";
import { ForgeSpecCard } from "../components/ui/ForgeSpecCard";

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

/* ---------- Estilos reutilizáveis Forge UI ---------- */
const glassCardStyle: React.CSSProperties = {
  background: "#131315",
  borderRadius: "8px",
  border: "1px solid #26262A",
  boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 4px 20px -2px rgba(0, 0, 0, 0.5)",
  position: "relative",
  overflow: "hidden",
};

const cardBase =
  "relative rounded-lg p-6 border border-[#26262A] bg-[#131315] gm-card forge-card overflow-hidden transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_4px_20px_-2px_rgba(0,0,0,0.5)]";
const inputBase =
  "w-full gm-input rounded-md px-4 py-2.5 text-sm text-[#F2F2F3] placeholder-[#8B8B92] focus:outline-none focus:border-[#F65A1A] transition-all border border-[#26262A] bg-[#131315]";

export default function Dashboard() {
  const { user, tenantId } = useAuth();
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

        let rawBudgets = budgetsRes.data;
        if (!rawBudgets || budgetsRes.error) {
          rawBudgets = readBudgetsLocal(tenantId) || [];
        } else {
          writeBudgetsLocal(rawBudgets, tenantId);
        }

        const allBudgets = (rawBudgets || []).filter((b: any) => !b.deleted_at);
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
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        const isQuiet = errorMsg.includes("Failed to fetch") || errorMsg.includes("tenant_memberships") || errorMsg.includes("42501");
        if (!isQuiet) {
          console.warn("Aviso ao carregar dados do dashboard:", errorMsg);
        }
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
        let activeUserId = user?.id;
        try {
          const { data: authRes } = await supabase.auth.getUser();
          if (authRes?.user?.id) {
            activeUserId = authRes.user.id;
          }
        } catch {}

        if (!activeUserId) {
          activeUserId = user?.id || tenantId || MASTER_TENANT_ID;
        }

        const cleanPhone = newClientPhone.replace(/\D/g, "");
        const { error } = await supabase.from("clients").insert({
          tenant_id: tenantId,
          user_id: activeUserId,
          name: newClientName.trim(),
          phone: cleanPhone || newClientPhone.trim() || null,
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
        <span className="forge-badge forge-badge-nominal">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          APROVADO
        </span>
      );
    }
    if (s.includes("RECUS") || s.includes("CANCEL")) {
      return (
        <span className="forge-badge forge-badge-failed">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          RECUSADO
        </span>
      );
    }
    return (
      <span className="forge-badge forge-badge-live">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A38]" />
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

      {/* 2. CARD DO RELÓGIO DIGITAL CENTRALIZADO (FORGE SPEC UI) */}
      <div className="forge-spec relative overflow-hidden">
        <BorderBeam duration={6} borderWidth={1.2} color="#f65a1a" />
        <div className="forge-spec__bar">
          <span className="forge-spec__id">00</span>
          <span className="forge-spec__title">SISTEMA · HORA CERTA</span>
          <span className="forge-spec__status forge-spec__status--live">SYNC</span>
        </div>
        <div className="forge-spec__body flex flex-col items-center justify-center text-center py-6 sm:py-7">
          <div className="flex items-center justify-center gap-3 sm:gap-4 text-[#F2F2F3]">
            <Clock size={28} className="text-[#f65a1a] shrink-0" />
            <span className="text-4xl sm:text-5xl md:text-6xl font-black font-mono tracking-widest text-[#F2F2F3] drop-shadow-sm">
              {now.toLocaleTimeString("pt-BR", { hour12: false })}
            </span>
          </div>
          <div className="mt-2 text-xs sm:text-sm font-semibold font-mono tracking-wider text-[#8B8B92] uppercase">
            {formatDashboardDate(now)}
          </div>
        </div>
      </div>

      {/* 3. BOTÕES NOVO ORÇAMENTO E EXPORTAR LADO A LADO - TC PILL SYSTEM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
        {/* BOTÃO PRIMÁRIO: FORGE UI (IDÊNTICO AO BOTÃO GRADE) */}
        <Link
          to="/budgets?new=true"
          className="forge-btn forge-btn--primary w-full !h-[38px] !px-3.5 !rounded-[4px] text-[11.5px] font-semibold uppercase tracking-[0.05em] inline-flex items-center justify-center gap-2 group cursor-pointer shadow-none select-none"
          title="Novo Orçamento"
          aria-label="Novo Orçamento"
        >
          <span className="gm-plus-icon-wrapper inline-flex items-center justify-center shrink-0">
            <Plus size={15} strokeWidth={2.5} className="w-3.5 h-3.5 shrink-0 gm-btn-plus-black" stroke="#0b0b0c" />
          </span>
          <span className="text-[11.5px] font-semibold">
            Novo Orçamento
          </span>
        </Link>

        {/* BOTÃO SECUNDÁRIO: FORGE UI (IDÊNTICO AO BOTÃO LISTAS) */}
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="forge-btn forge-btn--secondary w-full !h-[38px] !px-3.5 !rounded-[4px] text-[11.5px] font-semibold uppercase tracking-[0.05em] inline-flex items-center justify-center gap-2 group cursor-pointer shadow-none select-none disabled:opacity-50 disabled:cursor-not-allowed"
          title="Exportar Relatório"
          aria-label="Exportar Relatório"
        >
          {exporting ? (
            <Loader2 size={14} className="w-3.5 h-3.5 animate-spin shrink-0" />
          ) : (
            <Download size={14} className="w-3.5 h-3.5 shrink-0 stroke-[2]" />
          )}
          <span className="text-[11.5px] font-semibold">
            Exportar Relatório
          </span>
        </button>
      </div>

      {/* SEPARADOR: MÉTRICAS */}
      <SectionDivider label="Métricas gerais" />

      {/* 4. TOP METRIC CARDS WITH FORGE-SPEC UI DESIGN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mt-1">
        {/* CARD 1: FATURADO NO MÊS */}
        <ForgeSpecCard
          id="01"
          title="FATURADO · MÊS"
          status="LIVE"
          statusLive={true}
          eyebrow="TOTAL APROVADO / CONCLUÍDO"
          figure={formatCurrency(stats.faturamentoMensal)}
          tags={[
            { label: "+12,4% ESTE MÊS", accent: true, icon: <ArrowUpRight size={13} className="text-[#f65a1a] stroke-[2.5]" /> },
            { label: "METAS 2026", accent: false }
          ]}
        />

        {/* CARD 2: ORÇAMENTOS ABERTOS */}
        <ForgeSpecCard
          id="02"
          title="ORÇAMENTOS · ABERTOS"
          status="FILA"
          statusLive={true}
          eyebrow="EM ANÁLISE / AGUARDANDO"
          figure={stats.orcametosAbertos}
          unit="ITENS"
          tags={[
            { label: `${stats.aguardando} EM ANÁLISE`, accent: true, icon: <Clock size={18} className="text-[#f65a1a] w-[18px] h-[18px]" /> },
            { label: "PENDENTE", accent: false }
          ]}
        />

        {/* CARD 3: TICKET MÉDIO */}
        <ForgeSpecCard
          id="03"
          title="TICKET MÉDIO"
          status="PROG"
          statusLive={true}
          eyebrow="MÉDIA POR CLIENTE"
          figure={formatCurrency(stats.ticketMedio)}
          tags={[
            { label: "+4,1% DO ALVO", accent: true, icon: <ArrowUpRight size={13} className="text-[#f65a1a] stroke-[2.5]" /> },
            { label: "ACIMA DA META", accent: false }
          ]}
        />

        {/* CARD 4: CLIENTES ATIVOS */}
        <ForgeSpecCard
          id="04"
          title="CLIENTES ATIVOS"
          status="TOTAL"
          statusLive={true}
          eyebrow="BASE CADASTRADA"
          figure={stats.clientesAtivos}
          unit="BASE"
          tags={[
            { label: "+9 NOVOS ESTA SEMANA", accent: true, icon: <Users size={18} className="text-[#f65a1a] w-[18px] h-[18px]" /> },
            { label: "CRM ATIVO", accent: false }
          ]}
        />
      </div>

      {/* SEPARADOR: ORÇAMENTOS RECENTES */}
      <SectionDivider label="Atividade recente" />

      {/* 4. SECTION: ORÇAMENTOS RECENTES */}
      <div className="space-y-4 mt-1">
        <div className="forge-spec overflow-hidden">
          <div className="forge-spec__bar">
            <span className="forge-spec__id">05</span>
            <span className="forge-spec__title">ORÇAMENTOS RECENTES</span>
            <Link
              to="/budgets"
              className="forge-btn forge-btn--primary gm-dash-primary-btn !h-7 !py-0 px-2.5 rounded-[4px] text-[11px] font-mono font-bold tracking-wider uppercase inline-flex items-center gap-1.5 cursor-pointer shadow-none group"
              title="Ver Todos os Orçamentos"
            >
              <ArrowUpRight size={13} className="shrink-0 stroke-[2.5]" />
              <span>VER TODOS</span>
            </Link>
          </div>

          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#26262a] text-xs font-mono font-bold text-[#8b8b92] uppercase tracking-wider bg-white/[0.01]">
                  <th className="px-6 py-3.5">CLIENTE</th>
                  <th className="px-6 py-3.5">SERVIÇO</th>
                  <th className="px-6 py-3.5">VALOR</th>
                  <th className="px-6 py-3.5 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26262a] text-sm">
                {recentBudgets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-xs font-semibold text-[#8b8b92]">
                      Nenhum orçamento emitido ainda. Clique em "Novo Orçamento" para começar.
                    </td>
                  </tr>
                ) : (
                  recentBudgets.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                      onClick={() => navigate(`/budgets`)}
                    >
                      <td className="px-6 py-3.5 font-bold text-[#f2f2f3] whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-[2px] border border-[#26262a] bg-[#1b1b1e] flex items-center justify-center text-[#8b8b92] font-mono font-bold text-[11px] uppercase group-hover:bg-[#f65a1a] group-hover:text-black group-hover:border-[#f65a1a] transition-colors">
                            {item.client_name.substring(0, 2)}
                          </div>
                          <span className="text-sm font-semibold text-[#f2f2f3]">
                            {item.client_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-[#8b8b92] font-medium whitespace-nowrap">
                        {item.service_name}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-[#f2f2f3] whitespace-nowrap">
                        {item.total_amount.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
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

      {/* 5. LOWER SECTION: GRID 2 COLUMNS (EQUAL SIZES) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-1 mb-8 sm:mb-12 md:mb-16">
        {/* LEFT COLUMN: NOVO CLIENTE */}
        <div className="forge-spec">
          <div className="forge-spec__bar">
            <span className="forge-spec__id">06</span>
            <span className="forge-spec__title">NOVO CLIENTE · CADASTRO</span>
            <span className="forge-spec__status">RÁPIDO</span>
          </div>
          <div className="forge-spec__body">
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="forge-field">
                <label className="forge-field__label">Nome do Cliente</label>
                <input
                  type="text"
                  placeholder="Ex: Nome ou empresa do cliente"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="forge-field__input"
                />
              </div>

              <div className="forge-field">
                <label className="forge-field__label">WhatsApp / Telefone</label>
                <input
                  type="text"
                  placeholder="(00) 90000-0000"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(formatPhoneBR(e.target.value))}
                  inputMode="tel"
                  className="forge-field__input"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingClient}
                  className="forge-btn forge-btn--primary w-full !h-[38px] !px-3.5 !rounded-[4px] text-[11.5px] font-semibold uppercase tracking-[0.05em] inline-flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-none select-none"
                >
                  {savingClient ? (
                    <Loader2 size={14} className="w-3.5 h-3.5 animate-spin shrink-0" />
                  ) : (
                    <span className="gm-plus-icon-wrapper inline-flex items-center justify-center shrink-0">
                      <Plus size={15} strokeWidth={2.5} className="w-3.5 h-3.5 shrink-0 gm-btn-plus-black" stroke="#0b0b0c" />
                    </span>
                  )}
                  <span className="text-[11.5px] font-semibold">
                    Cadastrar Cliente
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: PALETA DO SISTEMA (EQUAL SIZE TO NOVO CLIENTE) */}
        <div className={`p-6 flex flex-col justify-between ${cardBase}`} style={glassCardStyle}>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[color:var(--gm-text)] tracking-tight">
                  Paleta de Cores
                </h2>
                <p className="text-xs text-[color:var(--gm-text-tertiary)] font-medium">
                  Paleta de cores oficial do sistema
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#F65A1A] bg-[#F65A1A]/10 px-2.5 py-1 rounded-full border border-[#F65A1A]/30">
                8 CORES
              </span>
            </div>

            {/* GRID DE CARDS DA PALETA */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                  className="rounded-xl overflow-hidden hover:border-[#F65A1A]/70 transition-all cursor-pointer group shadow-none flex flex-col border border-white/10 bg-transparent"
                  title={`Clique para copiar ${color.hex}`}
                >
                  {/* Bloco Único/Superior com a Cor preenchendo o topo de ponta a ponta */}
                  <div
                    className="h-14 sm:h-16 w-full transition-transform duration-300 group-hover:scale-[1.03] relative"
                    style={{ backgroundColor: color.hex }}
                  >
                    {color.hex === "#F2F2F3" && (
                      <div className="absolute inset-0 border border-slate-300/40 pointer-events-none" />
                    )}
                  </div>

                  {/* Painel Inferior com Nome e Código Hex integrado sem borda interna duplicada */}
                  <div className="p-2 sm:p-2.5 bg-black/30 flex flex-col justify-center">
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
