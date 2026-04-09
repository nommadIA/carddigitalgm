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
      type: "spring",
      stiffness: 100,
      damping: 12,
    },
  },
};
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

const Dashboard = () => {
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState<AppSettings | null>(null);

  // Responsive view toggle
  const [viewMode, setViewMode] = useState<"desktop" | "smartphone" | "tablet">(
    "desktop",
  );
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
        supabase.from("clients").select("*").eq("tenant_id", tenantId).is("deleted_at", null)
      ]);

      if (settingsRes) setBranding(settingsRes);
      
      const budgets = budgetsRes.data || [];
      const clients = clientsRes.data || [];

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
          clientesTotal: clients?.length || 0,
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
      <Page title="Dashboard" subtitle="Carregando informações...">
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
    <div className="flex items-center gap-3 md:gap-4">
      <div className="relative flex items-center justify-center shrink-0">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden shadow-lg">
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
      <div className="flex flex-col justify-center min-w-0">
        <h1 className="text-xl md:text-2xl font-bold leading-tight text-white truncate">
          {branding?.company_name || "Visão Geral"}
        </h1>
        <p className="text-[10px] md:text-sm opacity-70 mt-0.5 md:mt-1 truncate">
          Resumo de desempenho e atividades recentes
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
          <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-2 md:py-4 px-3 md:px-5 relative overflow-hidden group">
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
          <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-2 md:py-4 px-3 md:px-5 relative overflow-hidden group">
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
          <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-2 md:py-4 px-3 md:px-5 relative overflow-hidden group">
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
          <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-2 md:py-4 px-3 md:px-5 relative overflow-hidden group">
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
          <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-2 md:py-4 px-3 md:px-5 relative overflow-hidden group">
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
          <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-2 md:py-4 px-3 md:px-5 relative overflow-hidden group">
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
      <h2 className="text-lg font-bold mb-2 shrink-0">Atalhos</h2>
      <div className={viewMode === "smartphone" ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 md:grid-cols-4 gap-4"}>
        {/* Novo Orçamento */}
        <motion.div variants={itemVariants}>
          <Link to="/budgets?new=true" className="group block">
            <Card className="aspect-square gap-3 !border-none !shadow-none transition-all group-hover:-translate-y-1 p-0 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-3xl">
              <div className="w-[50px] h-[50px] flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-[var(--gm-primary)] transition-colors">
                <Plus size={25} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-sm md:text-base text-[var(--gm-primary)]">
                  Novo Orçamento
                </h3>
              </div>
            </Card>
          </Link>
        </motion.div>

        {/* Clientes */}
        <motion.div variants={itemVariants}>
          <Link to="/clients" className="group block">
            <Card className="aspect-square gap-3 !border-none !shadow-none transition-all group-hover:-translate-y-1 p-0 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-3xl">
              <div className="w-[50px] h-[50px] flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-[var(--gm-primary)] transition-colors">
                <Users size={25} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-sm md:text-base text-[var(--gm-primary)]">
                  Clientes
                </h3>
              </div>
            </Card>
          </Link>
        </motion.div>

        {/* Financeiro */}
        <motion.div variants={itemVariants}>
          <Link to="/financial" className="group block">
            <Card className="aspect-square gap-3 !border-none !shadow-none transition-all group-hover:-translate-y-1 p-0 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-3xl">
              <div className="w-[50px] h-[50px] flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-[var(--gm-primary)] transition-colors">
                <Wallet size={25} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-sm md:text-base text-[var(--gm-primary)]">
                  Financeiro
                </h3>
              </div>
            </Card>
          </Link>
        </motion.div>

        {/* Mercado */}
        <motion.div variants={itemVariants}>
          <Link to="/market" className="group block">
            <Card className="aspect-square gap-3 !border-none !shadow-none transition-all group-hover:-translate-y-1 p-0 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-3xl">
              <div className="w-[50px] h-[50px] flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-[var(--gm-primary)] transition-colors">
                <ShoppingCart size={25} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-sm md:text-base text-[var(--gm-primary)]">
                  Mercado
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
          <Card className="!border-none !shadow-none transition-all duration-300 py-2 md:py-5 px-3 md:px-6 flex flex-col justify-center h-full bg-white dark:bg-slate-800">
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
          <Card className="!border-none !shadow-none transition-all duration-300 py-2 md:py-5 px-3 md:px-6 flex flex-col justify-center h-full bg-white dark:bg-slate-800">
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
          <Card className="!border-none !shadow-none transition-all duration-300 py-2 md:py-5 px-3 md:px-6 flex flex-col justify-center h-full bg-white dark:bg-slate-800">
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

          {/* Pagination dots */}
          <div className="flex justify-center fixed left-0 right-0 z-[110] pointer-events-none pagination-dots-container">
            <div className="flex gap-1.5 pointer-events-auto">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > currentScreen ? 1 : -1);
                    setCurrentScreen(i);
                  }}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentScreen ? "w-4 bg-[#ff6600] shadow-[0_0_8px_#ff6600]" : "w-1 bg-white/50"
                  }`}
                />
              ))}
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
      actions={
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setViewMode("desktop")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "desktop" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}
              title="Desktop View"
            >
              <Monitor size={16} />
            </button>
            <button
              onClick={() => setViewMode("smartphone")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "smartphone" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}
              title="Smartphone View"
            >
              <Smartphone size={16} />
            </button>
          </div>
          <button
            onClick={() => {
              window.location.reload();
              pushToast({
                type: "info",
                title: "Atualizando",
                message: "Recarregando dados...",
              });
            }}
            className="gm-btn"
          >
            Atualizar
          </button>
        </div>
      }
    >
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
