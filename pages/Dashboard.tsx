import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Briefcase,
  ShoppingCart,
  Wallet,
  TrendingUp,
  Plus,
  Monitor,
  Smartphone,
  Tablet,
  ChevronLeft,
  ChevronRight,
  FileText,
  Sparkles,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 12,
    },
  },
};
import { RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/AuthContext";
import { syncAlarmsWithBudgets } from "../lib/alarmSystem";
import { fetchSettingsSupabase, AppSettings } from "../lib/settings";
import { Page } from "../components/ui/Page";
import { Card } from "../components/ui/Card";
import { Grid } from "../components/ui/Grid";
import CountUp from "../components/ui/CountUp";
import { pushToast } from "../store/toast";
import { useSwipeNav } from "../hooks/useSwipeNav";
import { usePullToRefresh } from "../hooks/usePullToRefresh";

const Dashboard = () => {
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState<AppSettings | null>(null);

  // Responsive view toggle
  const [viewMode, setViewMode] = useState<"desktop" | "smartphone" | "tablet">(
    () => window.innerWidth < 768 ? "smartphone" : "desktop"
  );

  const { pullProgress, isPulling } = usePullToRefresh(() => {
    window.location.reload();
  });

  useEffect(() => {
    const handleResize = () => setViewMode(window.innerWidth < 768 ? "smartphone" : "desktop");
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [currentScreen, setCurrentScreen] = useState(0); // 0: Faturamento/Fluxo, 1: Atalhos, 2: Resumo Total
  const [direction, setDirection] = useState(0);

  const paginate = (newDirection: number) => {
    const nextScreen = currentScreen + newDirection;
    if (nextScreen >= 0 && nextScreen <= 3) {
      setDirection(newDirection);
      setCurrentScreen(nextScreen);
    }
  };

  const swipeRef = useSwipeNav<HTMLDivElement>({
    onSwipeLeft: () => paginate(1),
    onSwipeRight: () => paginate(-1),
    thresholdPx: 60,
    restraintPx: 100,
    stopPropagation: true,
  });

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0.5,
      scale: 0.9,
      filter: "blur(4px)",
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0.5,
      scale: 0.9,
      filter: "blur(4px)",
    }),
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode("smartphone");
      } else if (window.innerWidth < 1024) {
        setViewMode("tablet");
      } else {
        setViewMode("desktop");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const mainEl = document.querySelector('.gm-main') as HTMLElement;
    if (viewMode === "smartphone") {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      if (mainEl) mainEl.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      if (mainEl) mainEl.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      if (mainEl) mainEl.style.overflow = "";
    };
  }, [viewMode]);

  const [stats, setStats] = useState({
    faturamentoMensal: 0,
    clientesTotal: 0,
    projetosAndamentoMensal: 0,
    fila: 0,
    fazendo: 0,
    pronto: 0,
    faturamentoTotal: 0,
    projetosConcluidosTotal: 0,
  });

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

  useEffect(() => {
    async function loadData() {
      if (!tenantId) return;
      setLoading(true);

      const [settingsRes, budgetsRes, clientsRes] = await Promise.all([
        fetchSettingsSupabase(tenantId).catch(() => null),
        supabase.from("budgets").select("*").eq("tenant_id", tenantId).is("deleted_at", null),
        supabase.from("clients").select("id", { count: 'exact', head: true }).eq("tenant_id", tenantId).is("deleted_at", null)
      ]);

      if (settingsRes) setBranding(settingsRes);
      
      const budgets = budgetsRes.data || [];
      const clientsCount = clientsRes.count || 0;

      if (budgets) {
        syncAlarmsWithBudgets(budgets);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const faturamentoTotal = budgets.reduce(
          (acc: number, item: any) =>
            normalizeStatus(item.status) === "CONCLUIDO"
              ? acc + Number(item.total_amount || item.total || 0)
              : acc,
          0,
        );

        const faturamentoMensal = budgets.reduce((acc: number, item: any) => {
          const dateToUse = item.completed_at ? new Date(item.completed_at) : new Date(item.created_at);
          return normalizeStatus(item.status) === "CONCLUIDO" && dateToUse >= startOfMonth
            ? acc + Number(item.total_amount || item.total || 0)
            : acc;
        }, 0);

        const projetosAndamentoMensal = budgets.filter((b: any) => {
          const createdAt = new Date(b.created_at);
          const isCurrentMonth = createdAt >= startOfMonth;
          const st = normalizeStatus(b.status);
          const isActive = st !== "CONCLUIDO" && st !== "CANCELADO" && st !== "PRONTO";
          return isCurrentMonth && isActive;
        }).length;

        const projetosConcluidosTotal = budgets.filter((b: any) => {
          const st = normalizeStatus(b.status);
          return st === "CONCLUIDO" || st === "PRONTO";
        }).length;

        setStats({
          faturamentoMensal,
          clientesTotal: clientsCount || 0,
          projetosAndamentoMensal,
          fila: budgets.filter((b: any) => normalizeStatus(b.status) === "AGUARDANDO").length,
          fazendo: budgets.filter((b: any) => {
            const st = normalizeStatus(b.status);
            return st === "APROVADO" || st === "PRODUCAO" || st === "FAZENDO";
          }).length,
          pronto: budgets.filter((b: any) => {
            const st = normalizeStatus(b.status);
            return st === "CONCLUIDO" || st === "PRONTO";
          }).length,
          faturamentoTotal,
          projetosConcluidosTotal,
        });
      }

      setLoading(false);
    }

    loadData();
  }, [tenantId]);

  if (loading) {
    return (
      <Page title="Início" subtitle="Carregando informações...">
        <Grid cols={3}>
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-32 flex items-center justify-center">
              <Loader2 className="animate-spin text-slate-500" />
            </Card>
          ))}
        </Grid>
      </Page>
    );
  }

  // ✅ Custom Header com Logo (Clean - Sem Neon)
  const headerContent = (
    <div className="flex items-center gap-3 md:gap-4 p-1">
      <div className="relative flex items-center justify-center shrink-0">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden shadow-lg">
          <img
            src={
              branding?.company_logo_url ||
              "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg"
            }
            alt="Logo da Empresa"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      <div className="flex flex-col justify-center min-w-0 pr-2">
        <h1 className="text-xl md:text-2xl font-bold leading-tight text-white whitespace-pre-wrap break-words line-clamp-2 md:whitespace-nowrap md:truncate">
          {branding?.company_name || "Visão Geral"}
        </h1>
        <p className="text-[11px] md:text-sm opacity-70 mt-0.5 md:mt-1 whitespace-normal break-words max-w-none">
          Resumo de desempenho e atividades
        </p>
      </div>
    </div>
  );

  const FaturamentoContent = (
    <div className="w-full flex-shrink-0 flex flex-col no-scrollbar">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Wallet size={20} className="text-slate-400" /> Faturamento Estimado
        </h2>
      </div>

      <div className={viewMode === "smartphone" ? "flex flex-col gap-2" : "grid grid-cols-3 gap-4"}>
        {/* CARD 1: FATURAMENTO */}
        <motion.div variants={itemVariants} className={viewMode === "smartphone" ? "w-full" : ""}>
          <Card className="  transition-all duration-300 py-2 md:py-4 px-3 md:px-5 relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <h3 className="text-white text-[13px] md:text-[14px] font-bold uppercase tracking-wider mb-0.5 md:mb-1">
                  Faturamento
                </h3>
                <div className="font-extrabold text-xl md:text-2xl text-[var(--gm-primary)] tracking-tight">
                  <CountUp
                    value={stats.faturamentoMensal}
                    format={(n) =>
                      n.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                      })
                    }
                  />
                </div>
                <p className="text-[12px] md:text-[13px] text-white mt-0.5 md:mt-1 font-medium">
                  Mês em andamento
                </p>
              </div>
              <div className="w-[50px] h-[50px] flex items-center justify-center text-[var(--gm-primary)] shrink-0">
                <Wallet className="w-[25px] h-[25px]" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* CARD 2: CLIENTES ATIVOS */}
        <motion.div variants={itemVariants} className={viewMode === "smartphone" ? "w-full" : ""}>
          <Card className="  transition-all duration-300 py-2 md:py-4 px-3 md:px-5 relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <h3 className="text-white text-[13px] md:text-[14px] font-bold uppercase tracking-wider mb-0.5 md:mb-1">
                  Clientes Ativos
                </h3>
                <div className="font-extrabold text-xl md:text-2xl text-[var(--gm-primary)] tracking-tight">
                  <CountUp
                    value={stats.clientesTotal}
                    format={(n) => Math.floor(n).toString()}
                  />
                </div>
                <p className="text-[12px] md:text-[13px] text-white mt-0.5 md:mt-1 font-medium">
                  Base total de cadastros
                </p>
              </div>
              <div className="w-[50px] h-[50px] flex items-center justify-center text-[var(--gm-primary)] shrink-0">
                <Users className="w-[25px] h-[25px]" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* CARD 3: PROJETOS */}
        <motion.div variants={itemVariants} className={viewMode === "smartphone" ? "w-full" : ""}>
          <Card className="  transition-all duration-300 py-2 md:py-4 px-3 md:px-5 relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <h3 className="text-white text-[13px] md:text-[14px] font-bold uppercase tracking-wider mb-0.5 md:mb-1">
                  Projetos em Andamento
                </h3>
                <div className="font-extrabold text-xl md:text-2xl text-[var(--gm-primary)] tracking-tight">
                  <CountUp
                    value={stats.projetosAndamentoMensal}
                    format={(n) => Math.floor(n).toString()}
                  />
                </div>
                <p className="text-[12px] md:text-[13px] text-white mt-0.5 md:mt-1 font-medium">
                  Projetos ativos do mês
                </p>
              </div>
              <div className="w-[50px] h-[50px] flex items-center justify-center text-[var(--gm-primary)] shrink-0">
                <Briefcase className="w-[25px] h-[25px]" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );

  const FluxoContent = (
    <div className="w-full flex-shrink-0 flex flex-col no-scrollbar">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp size={20} className="text-slate-400" /> Fluxo de
          Produção
        </h2>
        <Link
          to="/budgets"
          className="text-[var(--gm-primary)] text-xs font-bold flex items-center gap-1 hover:underline uppercase tracking-wide bg-[var(--gm-primary)]/10 px-3 py-1.5 rounded-full"
        >
          Gerenciar <ArrowRight size={14} />
        </Link>
      </div>

      <div className={viewMode === "smartphone" ? "flex flex-col gap-2" : "grid grid-cols-3 gap-4"}>
        {/* NA FILA (BRANCO/DARK) - Relógio SVG com Ponteiro Animado */}
        <motion.div variants={itemVariants} className={viewMode === "smartphone" ? "w-full" : ""}>
          <Card className="  transition-all duration-300 py-2 md:py-4 px-3 md:px-5 relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <h3 className="text-white text-[13px] md:text-[14px] font-bold uppercase tracking-wider mb-0.5 md:mb-1">
                  Na Fila
                </h3>
                <div className="font-extrabold text-xl md:text-2xl text-[var(--gm-primary)] tracking-tight">
                  <CountUp
                    value={stats.fila}
                    format={(n) => Math.floor(n).toString()}
                  />
                </div>
                <p className="text-[12px] md:text-[13px] text-white mt-0.5 md:mt-1 font-medium">
                  Aguardando aprovação
                </p>
              </div>
              <div className="w-[50px] h-[50px] flex items-center justify-center text-[var(--gm-primary)] shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-[25px] h-[25px]"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12" />{" "}
                  {/* Ponteiro de Horas (Fixo em 12h) */}
                  <line
                    x1="12"
                    y1="12"
                    x2="16"
                    y2="12"
                    className="animate-clock-hand"
                  />{" "}
                  {/* Ponteiro de Minutos (Animado) */}
                </svg>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className={viewMode === "smartphone" ? "w-full" : ""}>
          <Card className="  transition-all duration-300 py-2 md:py-4 px-3 md:px-5 relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <h3 className="text-white text-[13px] md:text-[14px] font-bold uppercase tracking-wider mb-0.5 md:mb-1">
                  Fazendo
                </h3>
                <div className="font-extrabold text-xl md:text-2xl text-[var(--gm-primary)] tracking-tight">
                  <CountUp
                    value={stats.fazendo}
                    format={(n) => Math.floor(n).toString()}
                  />
                </div>
                <p className="text-[12px] md:text-[13px] text-white mt-0.5 md:mt-1 font-medium">
                  Em produção ativa
                </p>
              </div>
              <div className="w-[50px] h-[50px] flex items-center justify-center text-[var(--gm-primary)] shrink-0">
                <Loader2 className="w-[25px] h-[25px] animate-spin" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className={viewMode === "smartphone" ? "w-full" : ""}>
          <Card className="  transition-all duration-300 py-2 md:py-4 px-3 md:px-5 relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <h3 className="text-white text-[13px] md:text-[14px] font-bold uppercase tracking-wider mb-0.5 md:mb-1">
                  Pronto
                </h3>
                <div className="font-extrabold text-xl md:text-2xl text-[var(--gm-primary)] tracking-tight">
                  <CountUp
                    value={stats.pronto}
                    format={(n) => Math.floor(n).toString()}
                  />
                </div>
                <p className="text-[12px] md:text-[13px] text-white mt-0.5 md:mt-1 font-medium">
                  Finalizados / Entregues
                </p>
              </div>
              <div className="w-[50px] h-[50px] flex items-center justify-center text-[var(--gm-primary)] shrink-0">
                <CheckCircle2 className="w-[25px] h-[25px] animate-heartbeat" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );

  const AtalhosContent = (
    <div className="w-full flex-shrink-0 flex flex-col no-scrollbar">
      <h2 className="text-lg font-bold mb-2 shrink-0 px-2 lg:px-0">Atalhos</h2>
      <div className={viewMode === "smartphone" ? "grid grid-cols-2 gap-4 px-2" : "grid grid-cols-2 md:grid-cols-5 gap-4 px-4 lg:px-0"}>
        {/* Novo Orçamento */}
        <motion.div variants={itemVariants}>
          <Link to="/budgets?new=true" className="group block">
            <Card className="aspect-square gap-2 transition-all duration-300 group-hover:-translate-y-2 p-2 flex flex-col items-center justify-center rounded-[2rem] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgba(255,123,0,0.15)]">
              <div className="w-[50px] h-[50px] md:w-[60px] md:h-[60px] flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-[var(--gm-primary)] transition-all duration-500 group-hover:scale-110 group-hover:rotate-[360deg] group-hover:drop-shadow-[0_0_8px_rgba(255,123,0,0.5)]">
                <Plus size={viewMode === "smartphone" ? 28 : 32} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-sm md:text-base text-[var(--gm-primary)] transition-colors duration-300 px-1">
                  Novo Orçamento
                </h3>
              </div>
            </Card>
          </Link>
        </motion.div>

        {/* Clientes */}
        <motion.div variants={itemVariants}>
          <Link to="/clients" className="group block">
            <Card className="aspect-square gap-2 transition-all duration-300 group-hover:-translate-y-2 p-2 flex flex-col items-center justify-center rounded-[2rem] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgba(255,123,0,0.15)]">
              <div className="w-[50px] h-[50px] md:w-[60px] md:h-[60px] flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-[var(--gm-primary)] transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,123,0,0.5)]">
                <Users size={viewMode === "smartphone" ? 28 : 32} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-sm md:text-base text-[var(--gm-primary)] transition-colors duration-300 px-1">
                  Clientes
                </h3>
              </div>
            </Card>
          </Link>
        </motion.div>

        {/* Financeiro */}
        <motion.div variants={itemVariants}>
          <Link to="/financial" className="group block">
            <Card className="aspect-square gap-2 transition-all duration-300 group-hover:-translate-y-2 p-2 flex flex-col items-center justify-center rounded-[2rem] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgba(255,123,0,0.15)]">
              <div className="w-[50px] h-[50px] md:w-[60px] md:h-[60px] flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-[var(--gm-primary)] transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,123,0,0.5)]">
                <Wallet size={viewMode === "smartphone" ? 28 : 32} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-sm md:text-base text-[var(--gm-primary)] transition-colors duration-300 px-1">
                  Financeiro
                </h3>
              </div>
            </Card>
          </Link>
        </motion.div>

        {/* Mercado */}
        <motion.div variants={itemVariants}>
          <Link to="/market" className="group block h-full">
            <Card className="h-full aspect-square md:aspect-auto gap-2 transition-all duration-300 group-hover:-translate-y-2 p-2 flex flex-col items-center justify-center rounded-[2rem] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgba(255,123,0,0.15)]">
              <div className="w-[50px] h-[50px] md:w-[60px] md:h-[60px] flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-[var(--gm-primary)] transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,123,0,0.5)]">
                <ShoppingCart size={viewMode === "smartphone" ? 28 : 32} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-sm md:text-base text-[var(--gm-primary)] transition-colors duration-300 px-1">
                  Mercado
                </h3>
              </div>
            </Card>
          </Link>
        </motion.div>

        {/* Notas */}
        <motion.div variants={itemVariants}>
          <Link to="/notes" className="group block h-full">
            <Card className="h-full aspect-square md:aspect-auto gap-2 transition-all duration-300 group-hover:-translate-y-2 p-2 flex flex-col items-center justify-center rounded-[2rem] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgba(255,123,0,0.15)]">
              <div className="w-[50px] h-[50px] md:w-[60px] md:h-[60px] flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-[var(--gm-primary)] transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,123,0,0.5)]">
                <FileText size={viewMode === "smartphone" ? 28 : 32} strokeWidth={1.5} />
              </div>
              <div className="text-center mt-1 md:mt-0">
                <h3 className="font-bold text-sm md:text-base text-[var(--gm-primary)] transition-colors duration-300 px-1">
                  Notas
                </h3>
              </div>
            </Card>
          </Link>
        </motion.div>

        {/* Minha Bio */}
        <motion.div variants={itemVariants} className={viewMode === "smartphone" ? "col-span-2" : ""}>
          <Link to="/minha-bio" className="group block h-full">
            <Card className="h-full gap-2 transition-all duration-300 group-hover:-translate-y-2 p-2 py-4 flex flex-col items-center justify-center rounded-[2rem] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgba(255,123,0,0.15)]">
              <div className="w-[44px] h-[44px] md:w-[60px] md:h-[60px] flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-[var(--gm-primary)] transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,123,0,0.5)]">
                <Sparkles size={viewMode === "smartphone" ? 26 : 32} strokeWidth={1.5} />
              </div>
              <div className="text-center mt-1 md:mt-0">
                <h3 className="font-bold text-sm md:text-base text-[var(--gm-primary)] transition-colors duration-300 mt-[-6px] md:mt-0 uppercase tracking-wider px-1">
                  Minha Bio
                </h3>
              </div>
            </Card>
          </Link>
        </motion.div>
      </div>
    </div>
  );

  const ResumoContent = (
    <div className="w-full flex-shrink-0 flex flex-col no-scrollbar">
      <h2 className="text-lg font-bold mb-2 shrink-0">Resumo Total</h2>
      <div className={viewMode === "smartphone" ? "flex flex-col gap-2" : "grid grid-cols-3 gap-4"}>
        {/* FATURAMENTO TOTAL */}
        <motion.div variants={itemVariants} className={viewMode === "smartphone" ? "w-full" : ""}>
          <Card className=" transition-all duration-300 py-2 md:py-5 px-3 md:px-6 flex flex-col justify-center h-full ">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5 md:gap-1 min-w-0">
                <h3 className="text-white text-[12px] md:text-[13px] font-bold uppercase tracking-widest truncate">
                  Faturamento Total
                </h3>
                <div className="text-lg md:text-xl font-black text-[var(--gm-primary)] truncate">
                  {stats.faturamentoTotal.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
                <p className="text-[11px] md:text-[12px] text-white mt-0.5 md:mt-1 truncate">
                  Histórico completo acumulado
                </p>
              </div>
              <div className="w-[50px] h-[50px] flex items-center justify-center text-[var(--gm-primary)] shrink-0">
                <Wallet className="w-[25px] h-[25px]" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* TOTAL CLIENTES */}
        <motion.div variants={itemVariants} className={viewMode === "smartphone" ? "w-full" : ""}>
          <Card className=" transition-all duration-300 py-2 md:py-5 px-3 md:px-6 flex flex-col justify-center h-full ">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5 md:gap-1 min-w-0">
                <h3 className="text-white text-[12px] md:text-[13px] font-bold uppercase tracking-widest truncate">
                  Total Clientes
                </h3>
                <div className="text-lg md:text-xl font-black text-[var(--gm-primary)] truncate">
                  {stats.clientesTotal}
                </div>
                <p className="text-[11px] md:text-[12px] text-white mt-0.5 md:mt-1 truncate">
                  Contatos ativos na base
                </p>
              </div>
              <div className="w-[50px] h-[50px] flex items-center justify-center text-[var(--gm-primary)] shrink-0">
                <Users className="w-[25px] h-[25px]" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* PROJETOS CONCLUÍDOS */}
        <motion.div variants={itemVariants} className={viewMode === "smartphone" ? "w-full" : ""}>
          <Card className=" transition-all duration-300 py-2 md:py-5 px-3 md:px-6 flex flex-col justify-center h-full ">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5 md:gap-1 min-w-0">
                <h3 className="text-white text-[12px] md:text-[13px] font-bold uppercase tracking-widest truncate">
                  Projetos Concluídos
                </h3>
                <div className="text-lg md:text-xl font-black text-[var(--gm-primary)] truncate">
                  {stats.projetosConcluidosTotal}
                </div>
                <p className="text-[11px] md:text-[12px] text-white mt-0.5 md:mt-1 truncate">
                  Total de entregas realizadas
                </p>
              </div>
              <div className="w-[50px] h-[50px] flex items-center justify-center text-[var(--gm-primary)] shrink-0">
                <CheckCircle2 className="w-[25px] h-[25px]" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (viewMode === "smartphone") {
      const screens = [AtalhosContent, FluxoContent, FaturamentoContent, ResumoContent];
      
      return (
        <div className="relative w-full max-w-[400px] mx-auto h-[calc(100dvh-180px)] mt-2 flex flex-col px-2">
          {/* Screens slider container */}
          <div className="flex-1 overflow-hidden flex flex-col relative">
            <motion.div
              className="flex w-full h-full"
              animate={{ x: `-${currentScreen * 100}%` }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            >
              <div
                ref={swipeRef}
                className="flex w-full h-full"
                style={{ touchAction: 'pan-y' }}
              >
                {screens.map((ScreenContent, index) => {
                const isActive = index === currentScreen;
                return (
                  <motion.div
                    key={index}
                    className="w-full h-full shrink-0 overflow-y-auto pb-24 px-2"
                    animate={{ 
                      filter: isActive ? "blur(0px)" : "blur(4px)", 
                      opacity: isActive ? 1 : 0.5,
                      scale: isActive ? 1 : 0.95
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {ScreenContent}
                  </motion.div>
                );
              })}
              </div>
            </motion.div>
          </div>

          {/* INDICADOR DE TELAS (PAGINAÇÃO) EXTREMAMENTE POLIDO E MINIMALISTA - AGORA ABAIXO DO BOTÃO NOTAS */}
          <div className="flex items-center justify-center gap-3 -mt-5 mb-8 shrink-0 bg-transparent py-1 z-20">
            <div className="flex items-center gap-2 bg-black/50 border border-white/[0.06] backdrop-blur-md px-4 py-1.5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.4)] animate-fadeIn">
              <div className="flex items-center gap-1.5">
                {screens.map((_, index) => {
                  const isActive = index === currentScreen;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setDirection(index > currentScreen ? 1 : -1);
                        setCurrentScreen(index);
                      }}
                      className={`h-[5px] rounded-full transition-all duration-300 cursor-pointer ${
                        isActive 
                          ? "w-5 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" 
                          : "w-[5px] bg-white/20 hover:bg-white/40"
                      }`}
                      aria-label={`Ir para a tela ${index + 1}`}
                    />
                  );
                })}
              </div>
              <div className="w-[1px] h-3 bg-white/10 mx-1" />
              <span className="text-[9.5px] text-white/40 font-mono font-bold select-none tracking-widest leading-none">
                {currentScreen + 1}/{screens.length}
              </span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full pb-20 px-4">
        <div className="w-full flex-shrink-0 mb-8">
          {FaturamentoContent}
        </div>
        <div className="w-full flex-shrink-0 mb-10">
          {FluxoContent}
        </div>
        <div className="w-full flex-shrink-0 mb-12">
          {AtalhosContent}
        </div>
        <div className="w-full flex-shrink-0 mb-6">
          {ResumoContent}
        </div>
      </div>
    );
  };

  return (
    <Page
      title={headerContent}
      subtitle=""
    >
      {/* Pull to refresh visual indicator */}
      {viewMode === "smartphone" && (
        <div 
          className="absolute top-2 left-0 right-0 flex justify-center z-50 pointer-events-none transition-all duration-150"
          style={{ 
            transform: `translateY(${Math.min(pullProgress / 1.5, 90)}px)`,
            opacity: pullProgress > 15 ? 1 : 0
          }}
        >
          <div className="bg-slate-950/90 backdrop-blur-md border border-[var(--gm-primary)]/40 py-2.5 px-4 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex items-center gap-2.5 transition-all border-dashed">
            <RefreshCw 
              className={`text-[var(--gm-primary)] ${pullProgress >= 110 ? 'animate-spin text-emerald-400' : ''}`} 
              style={{ 
                transform: pullProgress < 110 ? `rotate(${pullProgress * 3}deg)` : undefined,
                width: '16px', height: '16px'
              }} 
            />
            <span className="text-xs font-bold tracking-wide text-slate-100">
              {pullProgress >= 110 ? "Solte para atualizar!" : "Puxando para carregar..."}
            </span>
          </div>
        </div>
      )}
      
      <div className={`w-full ${viewMode === 'smartphone' ? 'h-full overflow-hidden' : ''}`}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="h-full"
        >
          {renderContent()}
        </motion.div>
      </div>
    </Page>
  );
};

export default Dashboard;
