
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  ArrowRight,
  CheckCircle2,
  Loader2,
  Briefcase,
  ShoppingCart,
  Wallet,
  TrendingUp,
  Plus
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12
    }
  }
};
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/AuthContext';
import { fetchSettingsSupabase, AppSettings } from '../lib/settings';
import { Page } from "../components/ui/Page";
import { Card } from "../components/ui/Card";
import { Grid } from "../components/ui/Grid";
import CountUp from "../components/ui/CountUp";
import { pushToast } from "../store/toast";

const Dashboard = () => {
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState<AppSettings | null>(null);

  const [stats, setStats] = useState({
    faturamento: 0,
    clientes: 0,
    projetos: 0,
    fila: 0,
    fazendo: 0,
    pronto: 0
  });

  useEffect(() => {
    async function loadData() {
      if (!tenantId) return;
      setLoading(true);

      fetchSettingsSupabase(tenantId).then(setBranding).catch(() => {});

      const { data: budgets } = await supabase
        .from("budgets")
        .select("*")
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      const { data: clients } = await supabase
        .from("clients")
        .select("*")
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (budgets) {
        const faturamento = budgets.reduce(
          (acc: number, item: any) =>
            (item.status === "CONCLUIDO") 
              ? acc + Number(item.total_amount || item.total || 0) 
              : acc,
          0
        );

        setStats({
          faturamento,
          clientes: clients?.length || 0,
          projetos: budgets.length,
          fila: budgets.filter((b: any) => ["AGUARDANDO"].includes((b.status||'').toUpperCase())).length,
          fazendo: budgets.filter((b: any) => ["APROVADO", "PRODUCAO", "FAZENDO"].includes((b.status||'').toUpperCase())).length,
          pronto: budgets.filter((b: any) => ["CONCLUIDO", "PRONTO"].includes((b.status||'').toUpperCase())).length
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
            {[1,2,3].map(i => <Card key={i} className="h-32 flex items-center justify-center"><Loader2 className="animate-spin text-slate-500" /></Card>)}
        </Grid>
      </Page>
    );
  }

  // ✅ Custom Header com Logo
  const headerContent = (
    <div className="flex items-center gap-4">
      <div className="relative flex items-center justify-center shrink-0">
        <div className="gm-neon-glow w-16 h-16"></div>
        <div className="gm-neon-box w-14 h-14 rounded-2xl">
          <img 
            src={branding?.company_logo_url || "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg"} 
            alt="Logo da Empresa" 
            className="gm-neon-logo"
          />
        </div>
      </div>
      <div className="flex flex-col justify-center">
        <h1 className="text-2xl font-bold leading-tight text-white">
          {branding?.company_name || "Visão Geral"}
        </h1>
        <p className="text-sm opacity-70 mt-1">Resumo de desempenho e atividades recentes</p>
      </div>
    </div>
  );

  return (
    <Page 
        title={headerContent}
        subtitle="" 
        actions={
            <button 
              onClick={() => {
                window.location.reload();
                pushToast({ type: "info", title: "Atualizando", message: "Recarregando dados..." });
              }} 
              className="gm-btn"
            >
                Atualizar
            </button>
        }
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* 
            ==================================================
            1) TOPO: 3 DIVISÕES ALINHADAS & PADRONIZADAS (Laranja Scale)
            ==================================================
        */}
        <Grid cols={3} className="mb-8 gap-4">
          
          {/* CARD 1: FATURAMENTO (Laranja Padrão) */}
          <motion.div variants={itemVariants}>
            <Card className="hover:border-[var(--gm-primary)] transition-all duration-300 py-5 px-6 flex flex-col justify-center h-full">
              <div className="flex items-center justify-between gap-4">
                 <div className="flex flex-col gap-1 min-w-0">
                   <h3 className="text-slate-400 text-[11px] font-bold uppercase tracking-wider truncate">Faturamento Estimado</h3>
                   <div className="font-extrabold text-2xl text-[var(--gm-primary)] tracking-tight truncate">
                      <CountUp 
                        value={stats.faturamento} 
                        format={(n)=> n.toLocaleString("pt-BR",{style:"currency",currency:"BRL", maximumFractionDigits: 2, minimumFractionDigits: 2})} 
                      />
                   </div>
                   <p className="text-[10px] text-slate-500 font-medium truncate">Total acumulado (Concluídos)</p>
                 </div>

                 <div className="w-12 h-12 flex items-center justify-center bg-[var(--gm-primary)]/10 rounded-2xl text-[var(--gm-primary)] border border-[var(--gm-primary)]/20 shrink-0">
                   <Wallet size={24} />
                 </div>
              </div>
            </Card>
          </motion.div>

          {/* CARD 2: CLIENTES ATIVOS (Laranja Claro - orange-400) */}
          <motion.div variants={itemVariants}>
            <Card className="hover:border-orange-400 transition-all duration-300 py-5 px-6 flex flex-col justify-center h-full">
              <div className="flex items-center justify-between gap-4">
                 <div className="flex flex-col gap-1 min-w-0">
                   <h3 className="text-slate-400 text-[11px] font-bold uppercase tracking-wider truncate">Clientes Ativos</h3>
                   <div className="font-extrabold text-2xl text-orange-400 tracking-tight truncate">
                      <CountUp value={stats.clientes} format={(n) => Math.floor(n).toString()} />
                   </div>
                   <p className="text-[10px] text-slate-500 font-medium truncate">Base total de cadastros</p>
                 </div>

                 <div className="w-12 h-12 flex items-center justify-center bg-orange-400/10 rounded-2xl text-orange-400 border border-orange-400/20 shrink-0">
                   <Users size={24} />
                 </div>
              </div>
            </Card>
          </motion.div>

          {/* CARD 3: PROJETOS (Laranja Mais Claro - orange-200/amber-200) */}
          <motion.div variants={itemVariants}>
            <Card className="hover:border-orange-200 transition-all duration-300 py-5 px-6 flex flex-col justify-center h-full">
              <div className="flex items-center justify-between gap-4">
                 <div className="flex flex-col gap-1 min-w-0">
                   <h3 className="text-slate-400 text-[11px] font-bold uppercase tracking-wider truncate">Projetos em Andamento</h3>
                   <div className="font-extrabold text-2xl text-orange-200 tracking-tight truncate">
                      <CountUp value={stats.projetos} format={(n) => Math.floor(n).toString()} />
                   </div>
                   <p className="text-[10px] text-slate-500 font-medium truncate">Total de orçamentos</p>
                 </div>

                 <div className="w-12 h-12 flex items-center justify-center bg-orange-200/10 rounded-2xl text-orange-200 border border-orange-200/20 shrink-0">
                   <Briefcase size={24} />
                 </div>
              </div>
            </Card>
          </motion.div>
        </Grid>

        {/* 
            ==================================================
            2) FLUXO DE PRODUÇÃO (PADRONIZADO & COLORIDO)
            ==================================================
        */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp size={20} className="text-slate-400" /> Fluxo de Produção
            </h2>
            <Link to="/budgets" className="text-[var(--gm-primary)] text-xs font-bold flex items-center gap-1 hover:underline uppercase tracking-wide bg-[var(--gm-primary)]/10 px-3 py-1.5 rounded-full">
               Gerenciar <ArrowRight size={14} />
            </Link>
          </div>
          
          <Grid cols={3} className="gap-4">
              {/* NA FILA (BRANCO/DARK) - Relógio SVG com Ponteiro Animado */}
              <motion.div variants={itemVariants}>
                <Card className="border border-white/20 hover:border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.08)] transition-all duration-300 py-4 px-5 relative overflow-hidden group">
                   <div className="flex items-center justify-between relative z-10">
                      <div>
                        <h3 className="text-white/80 text-[11px] font-bold uppercase tracking-wider mb-1">Na Fila</h3>
                        <div className="font-extrabold text-2xl text-white tracking-tight">
                            <CountUp value={stats.fila} format={(n) => Math.floor(n).toString()} />
                        </div>
                        <p className="text-[10px] text-white/50 mt-1 font-medium">Aguardando aprovação</p>
                      </div>
                      <div className="p-2.5 bg-white/10 rounded-xl text-white border border-white/20 shrink-0">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12" /> {/* Ponteiro de Horas (Fixo em 12h) */}
                          <line x1="12" y1="12" x2="16" y2="12" className="animate-clock-hand" /> {/* Ponteiro de Minutos (Animado) */}
                        </svg>
                      </div>
                   </div>
                </Card>
              </motion.div>

              {/* FAZENDO (LARANJA) - Animação Spin (já existe) */}
              <motion.div variants={itemVariants}>
                <Card className="border border-orange-500/30 hover:border-orange-500/60 shadow-[0_0_20px_rgba(249,115,22,0.15)] transition-all duration-300 py-4 px-5 relative overflow-hidden group">
                   <div className="flex items-center justify-between relative z-10">
                      <div>
                        <h3 className="text-orange-400/90 text-[11px] font-bold uppercase tracking-wider mb-1">Fazendo</h3>
                        <div className="font-extrabold text-2xl text-orange-500 tracking-tight">
                            <CountUp value={stats.fazendo} format={(n) => Math.floor(n).toString()} />
                        </div>
                        <p className="text-[10px] text-orange-500/60 mt-1 font-medium">Em produção ativa</p>
                      </div>
                      <div className="p-2.5 bg-orange-500/10 rounded-xl text-orange-500 border border-orange-500/20 shrink-0">
                        <Loader2 size={22} className="animate-spin" />
                      </div>
                   </div>
                </Card>
              </motion.div>

              {/* PRONTO (VERDE) - Animação Heartbeat */}
              <motion.div variants={itemVariants}>
                <Card className="border border-green-500/30 hover:border-green-500/60 shadow-[0_0_20px_rgba(34,197,94,0.15)] transition-all duration-300 py-4 px-5 relative overflow-hidden group">
                   <div className="flex items-center justify-between relative z-10">
                      <div>
                        <h3 className="text-green-400/90 text-[11px] font-bold uppercase tracking-wider mb-1">Pronto</h3>
                        <div className="font-extrabold text-2xl text-green-500 tracking-tight">
                            <CountUp value={stats.pronto} format={(n) => Math.floor(n).toString()} />
                        </div>
                        <p className="text-[10px] text-green-500/60 mt-1 font-medium">Finalizados / Entregues</p>
                      </div>
                      <div className="p-2.5 bg-green-500/10 rounded-xl text-green-500 border border-green-500/20 shrink-0">
                        <CheckCircle2 size={22} className="animate-heartbeat" />
                      </div>
                   </div>
                </Card>
              </motion.div>
          </Grid>
        </div>

        {/* 
            ==================================================
            3) ATALHOS (GRID 2x2 Mobile / 4x1 Desktop)
            ==================================================
        */}
        <div>
           <h2 className="text-lg font-bold mb-4 px-1">Atalhos</h2>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Novo Orçamento */}
              <motion.div variants={itemVariants}>
                <Link to="/budgets?new=true" className="group block h-full">
                    <Card className="aspect-square hover:border-[var(--gm-primary)] transition-all group-hover:-translate-y-1 p-0 flex flex-col items-center justify-center gap-3 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl h-full border border-slate-200 dark:border-white/5">
                        <div className="text-slate-500 dark:text-slate-400 group-hover:text-[var(--gm-primary)] bg-white/50 dark:bg-white/5 p-3.5 rounded-2xl transition-colors shadow-inner border border-slate-200 dark:border-white/5">
                            <Plus size={24}/>
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Novo Orçamento</h3>
                            <p className="text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-wide">Projetos</p>
                        </div>
                    </Card>
                </Link>
              </motion.div>

              {/* Clientes */}
              <motion.div variants={itemVariants}>
                <Link to="/clients" className="group block h-full">
                    <Card className="aspect-square hover:border-[var(--gm-primary)] transition-all group-hover:-translate-y-1 p-0 flex flex-col items-center justify-center gap-3 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl h-full border border-slate-200 dark:border-white/5">
                        <div className="text-slate-500 dark:text-slate-400 group-hover:text-[var(--gm-primary)] bg-white/50 dark:bg-white/5 p-3.5 rounded-2xl transition-colors shadow-inner border border-slate-200 dark:border-white/5">
                            <Users size={24}/>
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Clientes</h3>
                            <p className="text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-wide">Contatos</p>
                        </div>
                    </Card>
                </Link>
              </motion.div>

              {/* Financeiro */}
              <motion.div variants={itemVariants}>
                <Link to="/financial" className="group block h-full">
                    <Card className="aspect-square hover:border-[var(--gm-primary)] transition-all group-hover:-translate-y-1 p-0 flex flex-col items-center justify-center gap-3 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl h-full border border-slate-200 dark:border-white/5">
                        <div className="text-slate-500 dark:text-slate-400 group-hover:text-[var(--gm-primary)] bg-white/50 dark:bg-white/5 p-3.5 rounded-2xl transition-colors shadow-inner border border-slate-200 dark:border-white/5">
                            <Wallet size={24}/>
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Financeiro</h3>
                            <p className="text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-wide">Relatórios</p>
                        </div>
                    </Card>
                </Link>
              </motion.div>

              {/* Mercado */}
              <motion.div variants={itemVariants}>
                <Link to="/market" className="group block h-full">
                    <Card className="aspect-square hover:border-[var(--gm-primary)] transition-all group-hover:-translate-y-1 p-0 flex flex-col items-center justify-center gap-3 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl h-full border border-slate-200 dark:border-white/5">
                        <div className="text-slate-500 dark:text-slate-400 group-hover:text-[var(--gm-primary)] bg-white/50 dark:bg-white/5 p-3.5 rounded-2xl transition-colors shadow-inner border border-slate-200 dark:border-white/5">
                            <ShoppingCart size={24}/>
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Mercado</h3>
                            <p className="text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-wide">Compras</p>
                        </div>
                    </Card>
                </Link>
              </motion.div>
           </div>
        </div>
      </motion.div>
    </Page>
  );
};

export default Dashboard;
