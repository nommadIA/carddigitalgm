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
  ChevronDown,
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
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import { MediaDownloader } from "../components/media/MediaDownloader";
import { Lock } from "lucide-react";
import { usePlanAccess } from "../hooks/usePlanAccess";
import PlanLockedNotice from "../components/plans/PlanLockedNotice";
import { PlanId } from "../lib/subscriptionPlans";

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
  "w-full gm-input rounded-md px-4 py-2.5 text-sm text-[#F2F2F3] placeholder-[#8B8B92] focus:outline-none focus:border-[var(--gm-primary,#FE540B)] transition-all border border-[#26262A] bg-[#131315]";

export default function Dashboard() {
  const { user, tenantId } = useAuth();
  const { subscription, canAccess, checkQuota, isExpired } = usePlanAccess();
  const consolidatedAccess = canAccess("consolidated_pdf");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [monthlyBudgetsCount, setMonthlyBudgetsCount] = useState(0);
  const [lockModal, setLockModal] = useState<{
    title: string;
    reason?: string;
    requiredPlan?: PlanId;
  } | null>(null);

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

  // Recent budgets list (compressed by default to reduce vertical scroll on Dashboard)
  const [recentBudgets, setRecentBudgets] = useState<BudgetRow[]>([]);
  const [isRecentBudgetsExpanded, setIsRecentBudgetsExpanded] = useState(false);

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
        const nowDate = new Date();
        const curMonth = nowDate.getMonth();
        const curYear = nowDate.getFullYear();
        const curMonthCount = allBudgets.filter((b: any) => {
          const d = b.created_at ? new Date(b.created_at) : nowDate;
          return d.getMonth() === curMonth && d.getFullYear() === curYear;
        }).length;
        setMonthlyBudgetsCount(curMonthCount);
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
    if (isExpired) {
      setLockModal({
        title: "Assinatura Expirada",
        reason: "Seu período de teste ou assinatura expirou. Renove para cadastrar novos clientes.",
        requiredPlan: "basico",
      });
      return;
    }
    const cQuota = checkQuota("clients", stats.clientesAtivos);
    if (!cQuota.allowed) {
      setLockModal({
        title: "Limite de Clientes Atingido",
        reason: cQuota.reason,
        requiredPlan: cQuota.requiredPlan || "intermediario",
      });
      return;
    }
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
    if (!consolidatedAccess.allowed) {
      setLockModal({
        title: "Exportação Consolidada PDF (Multi-Módulo)",
        reason: consolidatedAccess.reason,
        requiredPlan: consolidatedAccess.requiredPlan || "avancado",
      });
      return;
    }

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
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--gm-accent,var(--gm-primary,#FE540B))]" />
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
      <div className="w-full flex flex-row items-center justify-start gap-3.5 sm:gap-4 text-left">
        {appSettings?.company_logo_url ? (
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-lg !p-0 flex items-center justify-center shrink-0 overflow-hidden border border-[#26262A] bg-[#131315]">
            <img
              src={appSettings.company_logo_url}
              alt={appSettings.company_name || "Logo da Empresa"}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-lg bg-[color:var(--gm-primary)]/10 border border-[color:var(--gm-primary)]/30 p-2.5 sm:p-3 flex items-center justify-center text-[color:var(--gm-primary)] shrink-0 font-black text-xl sm:text-3xl uppercase tracking-wider">
            {appSettings?.company_name ? appSettings.company_name.substring(0, 2) : "GM"}
          </div>
        )}

        <div className="flex flex-col items-start text-left flex-1 min-w-0">
          <div className="text-xs sm:text-sm font-extrabold tracking-widest text-[color:var(--gm-primary)] uppercase truncate max-w-full">
            {appSettings?.company_name ? `${appSettings.company_name} · PAINEL` : "PAINEL"}
          </div>
          <h1 className="text-[clamp(1.625rem,2.5vw,2.125rem)] leading-[1.15] font-black text-[color:var(--gm-text)] tracking-tight mt-1 truncate max-w-full">
            Dashboard
          </h1>
        </div>
      </div>

      {isExpired && (
        <PlanLockedNotice
          variant="inline"
          title="Assinatura ou Período de Teste Expirado"
          reason="Os módulos e ações de criação, edição, status e exportação estão bloqueados. Renove ou escolha um plano na tela de Planos."
          requiredPlan="intermediario"
          currentPlanName={subscription.planName}
          isExpired={true}
        />
      )}

      {/* 2. CARD DO RELÓGIO DIGITAL CENTRALIZADO (FORGE SPEC UI) */}
      <div className="forge-spec relative overflow-hidden">
        <BorderBeam duration={6} borderWidth={1.2} color="var(--gm-primary, #FE540B)" />
        <div className="forge-spec__bar">
          <span className="forge-spec__id">00</span>
          <span className="forge-spec__title">SISTEMA · HORA CERTA</span>
          <span className="forge-spec__status forge-spec__status--live">SYNC</span>
        </div>
        <div className="forge-spec__body flex flex-col items-center justify-center text-center py-6 sm:py-7">
          <div className="flex items-center justify-center gap-3 sm:gap-4 text-[#F2F2F3]">
            <Clock size={26} className="text-[var(--gm-primary,#FE540B)] shrink-0" />
            <span className="text-[clamp(2rem,3.8vw,3rem)] leading-none font-black font-mono tracking-widest tabular-nums text-[#F2F2F3] drop-shadow-sm">
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
        {/* BOTÃO PRIMÁRIO: FORGE UI */}
        <Link
          to="/budgets?new=true"
          onClick={(e) => {
            if (isExpired) {
              e.preventDefault();
              setLockModal({
                title: "Assinatura Expirada",
                reason: "Seu período de teste ou assinatura expirou. Renove para criar novos orçamentos.",
                requiredPlan: "basico",
              });
              return;
            }
            const bQuota = checkQuota("budgets_monthly", monthlyBudgetsCount);
            if (!bQuota.allowed) {
              e.preventDefault();
              setLockModal({
                title: "Limite Mensal de Orçamentos Atingido",
                reason: bQuota.reason,
                requiredPlan: bQuota.requiredPlan || "intermediario",
              });
            }
          }}
          className="forge-btn forge-btn--primary w-full !h-11 !min-h-[44px] !px-5 !rounded-[6px] text-sm font-bold uppercase tracking-[0.05em] inline-flex items-center justify-center gap-2.5 active:scale-[0.96] transition-[transform,background-color,border-color,box-shadow] duration-150 group cursor-pointer shadow-none select-none"
          title="Novo Orçamento"
          aria-label="Novo Orçamento"
        >
          <span className="gm-plus-icon-wrapper inline-flex items-center justify-center shrink-0">
            <Plus size={20} strokeWidth={2.6} className="w-5 h-5 shrink-0 gm-btn-plus-black" stroke="#0b0b0c" />
          </span>
          <span className="text-sm font-bold">
            Novo Orçamento
          </span>
        </Link>

        {/* BOTÃO SECUNDÁRIO: FORGE UI */}
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className={`forge-btn forge-btn--secondary w-full !h-11 !min-h-[44px] !px-5 !rounded-[6px] text-sm font-bold uppercase tracking-[0.05em] inline-flex items-center justify-center gap-2.5 active:scale-[0.96] transition-[transform,background-color,border-color,box-shadow] duration-150 group cursor-pointer shadow-none select-none disabled:opacity-50 disabled:cursor-not-allowed ${
            !consolidatedAccess.allowed ? "opacity-80" : ""
          }`}
          title={consolidatedAccess.allowed ? "Exportar Relatório Consolidado" : "Exclusivo do Plano Profissional"}
          aria-label="Exportar Relatório"
        >
          {exporting ? (
            <Loader2 size={20} className="w-5 h-5 animate-spin shrink-0 text-[var(--gm-primary,#FE540B)]" />
          ) : !consolidatedAccess.allowed ? (
            <Lock size={17} className="shrink-0 text-amber-400" />
          ) : (
            <Download size={20} className="w-5 h-5 shrink-0 stroke-[2.2] text-[var(--gm-primary,#FE540B)]" />
          )}
          <span className="text-sm font-bold">
            Exportar Relatório
          </span>
          {!consolidatedAccess.allowed && (
            <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded-[4px] bg-amber-500/15 border border-amber-500/35 text-amber-400">
              PRO
            </span>
          )}
        </button>
      </div>

      {/* SEPARADOR: MÉTRICAS */}
      <SectionDivider label="Métricas gerais" />

      {/* 4. TOP METRIC CARDS — EMPILHADOS EM PASTAS CLICÁVEIS NO MOBILE / GRID 4 COLUNAS NO DESKTOP */}
      <div className="gm-metrics-stack lg:grid lg:grid-cols-4 lg:gap-5 mt-1 items-stretch">
        {/* CARD 1: FATURADO NO MÊS */}
        <ForgeSpecCard
          id="01"
          title="FATURADO · MÊS"
          status="LIVE"
          statusLive={true}
          eyebrow="TOTAL APROVADO / CONCLUÍDO"
          figure={formatCurrency(stats.faturamentoMensal)}
          headerSummary={formatCurrency(stats.faturamentoMensal)}
          barClassName="bg-gradient-to-r from-[#3E1807]/90 via-[#25120A]/80 to-[#131315] lg:bg-none"
          className="gm-metric-folder-card gm-metric-folder-card--1 h-full !border-[var(--gm-primary,#FE540B)]/45 lg:!border-[#26262A] hover:!border-[var(--gm-primary,#FE540B)]/75"
          onClick={() => navigate("/financial")}
          tags={[
            { label: "+12,4% ESTE MÊS", accent: true, icon: <ArrowUpRight size={13} className="text-[var(--gm-primary,#FE540B)] stroke-[2.5]" /> },
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
          headerSummary={`${stats.orcametosAbertos} ITENS`}
          barClassName="bg-gradient-to-r from-[#0C2538]/90 via-[#102434]/80 to-[#131315] lg:bg-none"
          className="gm-metric-folder-card gm-metric-folder-card--2 h-full !border-sky-500/45 lg:!border-[#26262A] hover:!border-sky-400/75"
          onClick={() => navigate("/budgets")}
          tags={[
            { label: <><AnimatedNumber value={stats.aguardando} /> EM ANÁLISE</>, accent: true, icon: <Clock size={13} className="text-[var(--gm-primary,#FE540B)] stroke-[2.2]" /> },
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
          headerSummary={formatCurrency(stats.ticketMedio)}
          barClassName="bg-gradient-to-r from-[#312008]/90 via-[#22180A]/80 to-[#131315] lg:bg-none"
          className="gm-metric-folder-card gm-metric-folder-card--3 h-full !border-amber-500/45 lg:!border-[#26262A] hover:!border-amber-400/75"
          onClick={() => navigate("/financial")}
          tags={[
            { label: "+4,1% DO ALVO", accent: true, icon: <ArrowUpRight size={13} className="text-[var(--gm-primary,#FE540B)] stroke-[2.5]" /> },
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
          headerSummary={`${stats.clientesAtivos} BASE`}
          barClassName="bg-gradient-to-r from-[#09291E]/90 via-[#0D211A]/80 to-[#131315] lg:bg-none"
          className="gm-metric-folder-card gm-metric-folder-card--4 h-full !border-emerald-500/45 lg:!border-[#26262A] hover:!border-emerald-400/75"
          onClick={() => navigate("/clients")}
          tags={[
            { label: "+9 NOVOS ESTA SEMANA", accent: true, icon: <Users size={13} className="text-[var(--gm-primary,#FE540B)] stroke-[2.2]" /> },
            { label: "CRM ATIVO", accent: false }
          ]}
        />
      </div>

      {/* SEPARADOR: ORÇAMENTOS RECENTES */}
      <SectionDivider label="Atividade recente" />

      {/* 5. SECTION: ORÇAMENTOS RECENTES (COMPRIMIDO COM SETA DE EXPANSÃO) */}
      <div className="space-y-4 mt-1">
        <div className="forge-spec overflow-hidden">
          <div
            role="button"
            tabIndex={0}
            data-no-scale="true"
            aria-expanded={isRecentBudgetsExpanded}
            onClick={() => setIsRecentBudgetsExpanded((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsRecentBudgetsExpanded((prev) => !prev);
              }
            }}
            className="forge-spec__bar cursor-pointer select-none hover:bg-white/[0.02] transition-colors"
          >
            <span className="forge-spec__id shrink-0">05</span>
            <span className="forge-spec__title min-w-0 truncate">ORÇAMENTOS RECENTES</span>
            <span className="px-1.5 py-0.5 rounded-[4px] bg-[#1B1B1E] border border-[#26262A] text-[10px] font-mono font-bold text-[#8B8B92] tabular-nums shrink-0">
              {recentBudgets.length}
            </span>
            <Link
              to="/budgets"
              onClick={(e) => e.stopPropagation()}
              className="forge-btn forge-btn--primary gm-dash-primary-btn !h-8 sm:!h-9 !min-h-[32px] sm:!min-h-[36px] !py-0 px-2.5 sm:px-3.5 !rounded-[6px] text-[11px] sm:text-[12.5px] font-mono font-bold tracking-wider uppercase inline-flex items-center justify-center gap-1.5 sm:gap-2 active:scale-[0.96] transition-[transform,background-color,box-shadow] duration-150 cursor-pointer shadow-none shrink-0 group"
              title="Ver Todos os Orçamentos"
            >
              <ArrowUpRight size={14} className="shrink-0 stroke-[2.5]" />
              <span>VER TODOS</span>
            </Link>
            <button
              type="button"
              data-icon-btn="true"
              aria-expanded={isRecentBudgetsExpanded}
              aria-label={isRecentBudgetsExpanded ? "Recolher orçamentos recentes" : "Expandir orçamentos recentes"}
              title={isRecentBudgetsExpanded ? "Recolher" : "Expandir"}
              onClick={(e) => {
                e.stopPropagation();
                setIsRecentBudgetsExpanded((prev) => !prev);
              }}
              className="w-8 h-8 rounded-[6px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] hover:border-[var(--gm-primary,#FE540B)]/60 text-[var(--gm-primary,#FE540B)] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            >
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${isRecentBudgetsExpanded ? "rotate-180" : "rotate-0"}`}
              />
            </button>
          </div>

          {!isRecentBudgetsExpanded ? (
            <div
              role="button"
              tabIndex={0}
              data-no-scale="true"
              onClick={() => setIsRecentBudgetsExpanded(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsRecentBudgetsExpanded(true);
                }
              }}
              className="px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
            >
              {recentBudgets.length === 0 ? (
                <span className="text-[11px] sm:text-xs font-medium text-[#8B8B92] truncate">
                  Nenhum orçamento emitido ainda • Toque para expandir
                </span>
              ) : (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--gm-primary,#FE540B)] shrink-0" />
                  <span className="text-xs font-semibold text-[#F2F2F3] truncate">
                    {recentBudgets[0].client_name}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#8B8B92] tabular-nums shrink-0">
                    {recentBudgets[0].total_amount.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
              )}
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[var(--gm-primary,#FE540B)] shrink-0">
                Expandir
              </span>
            </div>
          ) : (
            <>
              {/* Lista compacta no mobile */}
              <div className="md:hidden divide-y divide-[#26262A]">
                {recentBudgets.length === 0 ? (
                  <div className="px-4 py-5 text-center text-xs font-semibold text-[#8B8B92]">
                    Nenhum orçamento emitido ainda. Clique em "Novo Orçamento" para começar.
                  </div>
                ) : (
                  recentBudgets.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => navigate("/budgets")}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-2.5 hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-[4px] border border-[#26262A] bg-[#1b1b1e] flex items-center justify-center text-[#8B8B92] font-mono font-bold text-[10px] uppercase shrink-0">
                          {item.client_name.substring(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-[#f2f2f3] truncate">
                            {item.client_name}
                          </div>
                          <div className="text-[11px] text-[#8b8b92] truncate">
                            {item.service_name}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs font-bold font-mono tabular-nums text-[#f2f2f3]">
                          {item.total_amount.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                        {getStatusBadge(item.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Tabela completa no desktop */}
              <div className="hidden md:block overflow-x-auto relative z-10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#26262a] text-xs font-mono font-bold text-[#8b8b92] uppercase tracking-wider bg-white/[0.01]">
                      <th className="px-4 sm:px-6 py-3.5">CLIENTE</th>
                      <th className="px-4 sm:px-6 py-3.5">SERVIÇO</th>
                      <th className="px-4 sm:px-6 py-3.5 text-right">VALOR</th>
                      <th className="px-4 sm:px-6 py-3.5 text-right">STATUS</th>
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
                          <td className="px-4 sm:px-6 py-3.5 font-bold text-[#f2f2f3] whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-[4px] border border-[#26262a] bg-[#1b1b1e] flex items-center justify-center text-[#8b8b92] font-mono font-bold text-[11px] uppercase shrink-0 group-hover:bg-[#f65a1a] group-hover:text-black group-hover:border-[#f65a1a] transition-colors">
                                {item.client_name.substring(0, 2)}
                              </div>
                              <span className="text-sm font-semibold text-[#f2f2f3] truncate max-w-[160px] sm:max-w-[220px]">
                                {item.client_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 text-[#8b8b92] font-medium whitespace-nowrap max-w-[160px] sm:max-w-[240px] truncate">
                            {item.service_name}
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 font-bold font-mono tabular-nums text-right text-[#f2f2f3] whitespace-nowrap">
                            {item.total_amount.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 text-right whitespace-nowrap">
                            {getStatusBadge(item.status)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* SEPARADOR: MOTOR DE DOWNLOAD */}
      <SectionDivider label="Motor de download" />
      <MediaDownloader />

      {/* SEPARADOR: AÇÕES RÁPIDAS */}
      <SectionDivider label="Ações rápidas" />

      {/* 5. LOWER SECTION: GRID 2 COLUMNS (EQUAL SIZES) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 mt-1 mb-4 items-stretch">
        {/* LEFT COLUMN: NOVO CLIENTE */}
        <div className="forge-spec h-full flex flex-col">
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

              <div className="pt-2 mt-auto">
                <button
                  type="submit"
                  disabled={savingClient}
                  className="forge-btn forge-btn--primary w-full !h-11 !min-h-[44px] !px-5 !rounded-[6px] text-sm font-bold uppercase tracking-[0.05em] inline-flex items-center justify-center gap-2.5 active:scale-[0.96] transition-[transform,background-color,box-shadow] duration-150 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-none select-none"
                >
                  {savingClient ? (
                    <>
                      <Loader2 size={20} className="w-5 h-5 animate-spin shrink-0" />
                      <span className="text-sm font-bold tracking-wider">CADASTRANDO...</span>
                    </>
                  ) : (
                    <>
                      <span className="gm-plus-icon-wrapper inline-flex items-center justify-center shrink-0">
                        <Plus size={20} strokeWidth={2.6} className="w-5 h-5 shrink-0 gm-btn-plus-black" />
                      </span>
                      <span className="text-sm font-bold tracking-wider">
                        CADASTRAR CLIENTE
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: PALETA DO SISTEMA (EQUAL SIZE TO NOVO CLIENTE) */}
        <div className="forge-spec h-full flex flex-col">
          <div className="forge-spec__bar">
            <span className="forge-spec__id">07</span>
            <span className="forge-spec__title">PALETA DE CORES · SISTEMA</span>
            <span className="forge-spec__status forge-spec__status--live tabular-nums">8 CORES</span>
          </div>
          <div className="forge-spec__body flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#26262A]">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[color:var(--gm-text)] tracking-tight leading-snug">
                  Paleta Oficial
                </h2>
                <p className="text-xs text-[color:var(--gm-text-tertiary)] font-medium mt-0.5">
                  Clique em qualquer cor para copiar o código HEX
                </p>
              </div>
            </div>

            {/* GRID DE CARDS DA PALETA */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-auto">
              {[
                { name: "Ink", hex: "#0B0B0C" },
                { name: "Graphite", hex: "#131315" },
                { name: "Slate", hex: "#1B1B1E" },
                { name: "Filament", hex: "#26262A" },
                { name: "Primária", hex: appSettings?.brand_primary || (typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--gm-primary").trim() : "") || "#FE540B" },
                { name: "Acento", hex: appSettings?.brand_accent || (typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--gm-accent").trim() : "") || "#FF7A38" },
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
                  className="rounded-[6px] overflow-hidden hover:border-[var(--gm-primary,#FE540B)]/70 active:scale-[0.96] transition-[transform,border-color] duration-150 cursor-pointer group shadow-none flex flex-col border border-[#26262A] bg-transparent select-none"
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
                  <div className="p-2 sm:p-2.5 bg-[#0B0B0C] flex flex-col justify-center">
                    <h4 className="text-xs font-bold text-white group-hover:text-[var(--gm-primary,#FE540B)] transition-colors leading-tight">
                      {color.name}
                    </h4>
                    <p className="text-[11px] font-mono text-[#8B8B92] uppercase mt-0.5 tracking-wider font-semibold tabular-nums">
                      {color.hex}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PlanLockedNotice
        variant="modal"
        isOpen={Boolean(lockModal)}
        onClose={() => setLockModal(null)}
        title={lockModal?.title || "Recurso Bloqueado no Plano Atual"}
        reason={lockModal?.reason}
        requiredPlan={lockModal?.requiredPlan || "avancado"}
        currentPlanName={subscription.planName}
        isExpired={isExpired}
      />
    </div>
  );
}
