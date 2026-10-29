import React, { useState, useEffect, useRef } from "react";
import { 
  Check, ShieldCheck, Sparkles, ArrowRight, Settings, QrCode, CreditCard, 
  ExternalLink, HelpCircle, Users, Award, Lock, Star, Calculator, 
  TrendingUp, TrendingDown, RotateCcw, Percent 
} from "lucide-react";
import { Page } from "../components/ui/Page";
import { SectionDivider } from "../components/ui/SectionDivider";
import { useAuth } from "../store/AuthContext";
import { 
  PlanId, PLANS_DATA, getStoredPlansConfig, fetchPlansConfigFromCloud, 
  getUserSubscription, savePlansConfig, setUserSubscription 
} from "../lib/subscriptionPlans";
import PlanCheckoutModal from "../components/plans/PlanCheckoutModal";
import ModalResizeHandles from "../components/ui/ModalResizeHandles";
import { useModalResize } from "../hooks/useModalResize";
import { pushToast } from "../store/toast";
import { CURRENCY_FORMATTER } from "../constants";

export default function Plans() {
  const { user, tenantId, isAdmin } = useAuth();
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<PlanId | null>(null);
  const [subscription, setSubscription] = useState(() => getUserSubscription(tenantId, user?.email));
  const [config, setConfig] = useState(() => getStoredPlansConfig());

  // Redimensionador de container (Igual ao de Notas)
  const adminModalRef = useRef<HTMLDivElement | null>(null);
  const {
    modalCustomSize: adminModalSize,
    handleResizeStart: handleAdminResizeStart,
    handleResetSize: handleAdminResetSize,
  } = useModalResize({
    storageKey: "gm_plans_admin_modal_size_v1",
    defaultWidth: 760,
    defaultHeight: 700,
    minWidth: 420,
    minHeight: 380,
    modalRef: adminModalRef,
  });

  // Modal de edição administrativa dos planos
  const [isAdminEditOpen, setIsAdminEditOpen] = useState(false);
  const [editPriceBasico, setEditPriceBasico] = useState(config.priceBasico);
  const [editPriceIntermediario, setEditPriceIntermediario] = useState(config.priceIntermediario);
  const [editPriceAvancado, setEditPriceAvancado] = useState(config.priceAvancado);
  const [editPixKey, setEditPixKey] = useState(config.pixKey);
  const [editReceiverName, setEditReceiverName] = useState(config.pixReceiverName);
  const [editLinkBasico, setEditLinkBasico] = useState(config.linkBasico || "");
  const [editLinkIntermediario, setEditLinkIntermediario] = useState(config.linkIntermediario || "");
  const [editLinkAvancado, setEditLinkAvancado] = useState(config.linkAvancado || "");
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Calculadora de porcentagem simultânea para os 3 planos
  const [percentValue, setPercentValue] = useState<string>("10");
  const [roundToNineSeven, setRoundToNineSeven] = useState<boolean>(false);

  const handleApplyPercent = (type: "increase" | "discount", customPct?: number) => {
    const rawPct = customPct !== undefined ? customPct : parseFloat(percentValue.replace(",", "."));
    if (isNaN(rawPct) || rawPct <= 0) {
      pushToast({
        title: "Porcentagem Inválida",
        message: "Digite um valor percentual válido (ex: 10).",
        type: "info",
      });
      return;
    }

    const multiplier = type === "increase" ? 1 + rawPct / 100 : 1 - rawPct / 100;

    const calcPrice = (current: number) => {
      let val = current * multiplier;
      if (val < 0.01) val = 0.01;
      if (roundToNineSeven) {
        return Math.floor(val) + 0.97;
      }
      return Number(val.toFixed(2));
    };

    const newBasico = calcPrice(editPriceBasico);
    const newInter = calcPrice(editPriceIntermediario);
    const newAvancado = calcPrice(editPriceAvancado);

    setEditPriceBasico(newBasico);
    setEditPriceIntermediario(newInter);
    setEditPriceAvancado(newAvancado);

    pushToast({
      title: type === "increase" ? `+${rawPct}% Aplicado!` : `-${rawPct}% Aplicado!`,
      message: `Os 3 planos foram recalculados simultaneamente: R$ ${newBasico.toFixed(2)} / R$ ${newInter.toFixed(2)} / R$ ${newAvancado.toFixed(2)}`,
      type: "success",
    });
  };

  const handleResetToConfigPrices = () => {
    setEditPriceBasico(config.priceBasico);
    setEditPriceIntermediario(config.priceIntermediario);
    setEditPriceAvancado(config.priceAvancado);
    pushToast({
      title: "Preços Restaurados",
      message: "Os valores voltaram aos padrões cadastrados.",
      type: "info",
    });
  };

  const handleOpenAdminEdit = async () => {
    // Busca dados mais recentes da nuvem para garantir preenchimento atualizado
    const fresh = await fetchPlansConfigFromCloud(tenantId);
    setConfig(fresh);
    setEditPriceBasico(fresh.priceBasico);
    setEditPriceIntermediario(fresh.priceIntermediario);
    setEditPriceAvancado(fresh.priceAvancado);
    setEditPixKey(fresh.pixKey || "");
    setEditReceiverName(fresh.pixReceiverName || "");
    setEditLinkBasico(fresh.linkBasico || "");
    setEditLinkIntermediario(fresh.linkIntermediario || "");
    setEditLinkAvancado(fresh.linkAvancado || "");
    setIsAdminEditOpen(true);
  };

  useEffect(() => {
    let isMounted = true;
    const syncPlans = () => {
      setSubscription(getUserSubscription(tenantId, user?.email));
      const freshConfig = getStoredPlansConfig();
      setConfig(freshConfig);
    };
    syncPlans();

    // Sincroniza em segundo plano com a nuvem (Supabase) para carregar links e preços globais
    fetchPlansConfigFromCloud(tenantId).then((cloudConfig) => {
      if (isMounted && cloudConfig) {
        setConfig(cloudConfig);
      }
    }).catch(() => {});

    window.addEventListener("gm_settings_updated", syncPlans);
    window.addEventListener("gm_plans_config_updated", syncPlans);
    return () => {
      isMounted = false;
      window.removeEventListener("gm_settings_updated", syncPlans);
      window.removeEventListener("gm_plans_config_updated", syncPlans);
    };
  }, [tenantId, user]);

  const handleOpenCheckout = (planId: PlanId) => {
    setSelectedPlanForCheckout(planId);
  };

  const handleSaveAdminConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAdmin(true);
    const ok = await savePlansConfig(tenantId, {
      priceBasico: Number(editPriceBasico),
      priceIntermediario: Number(editPriceIntermediario),
      priceAvancado: Number(editPriceAvancado),
      pixKey: editPixKey.trim(),
      pixReceiverName: editReceiverName.trim(),
      linkBasico: editLinkBasico.trim(),
      linkIntermediario: editLinkIntermediario.trim(),
      linkAvancado: editLinkAvancado.trim(),
    });
    setSavingAdmin(false);
    if (ok) {
      const savedConfig = getStoredPlansConfig();
      setConfig(savedConfig);
      setIsAdminEditOpen(false);
      pushToast({
        title: "Configurações de Planos Salvas!",
        message: "Os preços e links de checkout foram salvos e disponibilizados para todos os usuários.",
        type: "success",
      });
    } else {
      pushToast({
        title: "Erro ao salvar",
        message: "Não foi possível sincronizar com o banco de dados.",
        type: "error",
      });
    }
  };

  return (
    <Page title="Planos & Assinatura">
      <div className="w-full flex flex-col gap-8 pb-16">
        {/* BANNER SUPERIOR INFORMATIVO COM ALTO CONTRASTE */}
        <div 
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl border border-zinc-800 relative overflow-hidden"
          style={{
            background: "#121215",
            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 12px 36px rgba(0, 0, 0, 0.5)"
          }}
        >
          <div className="flex flex-col gap-2 relative z-10">
            <div className="flex items-center gap-2 flex-wrap">
              {isAdmin ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/25 text-amber-300 border border-amber-500/50 uppercase tracking-wider shadow-sm">
                  <Award size={14} />
                  <span>Acesso Master Administrador</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[var(--gm-primary)]/25 text-[var(--gm-primary)] border border-[var(--gm-primary)]/50 uppercase tracking-wider shadow-sm">
                  <Star size={14} />
                  <span>Plano Atual: {subscription.planName}</span>
                </span>
              )}
              <span className="text-xs text-slate-200 font-semibold">
                Conta: <strong className="text-white bg-white/10 px-2 py-0.5 rounded-md">{user?.email || "Usuário"}</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1 drop-shadow-md">
              Escolha o plano ideal para a sua rotina
            </h1>
            <p className="text-sm sm:text-base text-slate-100 max-w-2xl leading-relaxed drop-shadow-sm font-medium">
              Estrutura com 3 planos flexíveis: do básico para testes ao intermediário e avançado com recursos ilimitados, orçamentos rápidos e gestão completa.
            </p>
          </div>

          {/* Botão de Gestão do Administrador */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAdminEdit}
              className="py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 relative z-10 border border-amber-400/40"
            >
              <Settings size={18} />
              <span>Gerenciar Preços & Chave Pix (ADM)</span>
            </button>
          )}
        </div>

        {/* =========================================================================
            OS 3 CARDS DE PLANOS (DESIGN COM ALTO CONTRASTE E LEGIBILIDADE MÁXIMA)
            - Card 1: Essencial (Básico)
            - Card 2: Criador (Intermediário - Card Escuro / Destaque Central)
            - Card 3: Profissional (Avançado)
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* 1. PLANO BÁSICO (ESSENCIAL) */}
          <div 
            className="flex flex-col justify-between p-6 sm:p-8 rounded-2xl border border-zinc-800 relative overflow-hidden transition-all duration-300 hover:border-zinc-700 shadow-xl"
            style={{
              background: "#121215",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 14px 40px rgba(0, 0, 0, 0.5)"
            }}
          >
            <div className="flex flex-col gap-6">
              {/* Header do Card */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-sky-400">
                  {PLANS_DATA.basico.badge}
                </span>
                <h3 className="text-2xl font-black text-white tracking-tight drop-shadow-sm">
                  {PLANS_DATA.basico.name}
                </h3>
                <p className="text-xs text-slate-200 leading-relaxed min-h-[36px] font-medium">
                  {PLANS_DATA.basico.tagline}
                </p>
              </div>

              {/* Preço */}
              <div className="flex flex-col gap-1 bg-black/40 p-4 rounded-2xl border border-white/10">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-black text-slate-300">R$</span>
                  <span className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-sm">
                    {config.priceBasico.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-xs font-bold text-slate-300">/mês</span>
                </div>
                <span className="text-xs text-slate-300 font-semibold">Assinatura mensal</span>
              </div>

              {/* Botão de Ação */}
              <button
                type="button"
                onClick={() => handleOpenCheckout("basico")}
                className="w-full py-3.5 px-4 rounded-md border border-[#26262A] hover:border-[#3F3F46] bg-[#131315] hover:bg-[#1B1B1E] text-[#F2F2F3] font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer active:scale-[0.98] shadow-sm"
              >
                {subscription.planId === "basico" ? "Plano selecionado" : "Começar no Essencial"}
              </button>

              <span className="text-xs text-slate-300 text-center font-medium -mt-2">
                Ideal para testes e pequenas rotinas
              </span>

              <div className="w-full h-[1px] bg-white/15 my-1" />

              {/* Cota Destaque */}
              <div className="flex items-baseline gap-2.5 bg-black/30 p-3 rounded-md border border-white/5">
                <span className="text-3xl font-black text-sky-400">
                  {PLANS_DATA.basico.quotaLabel}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-white leading-tight">orçamentos por mês</span>
                  <span className="text-xs text-slate-300 font-medium">Renovação mensal da cota</span>
                </div>
              </div>

              {/* Checklist de Recursos com Alto Contraste */}
              <ul className="flex flex-col gap-3 text-xs text-slate-100 font-semibold">
                {PLANS_DATA.basico.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2.5">
                    <Check size={16} className="text-sky-400 shrink-0 stroke-[2.5]" />
                    <span className="leading-snug">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rodapé com badges */}
            <div className="border-t border-white/15 pt-4 mt-6 flex items-center justify-between text-xs text-slate-200 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400 shadow-sm shadow-sky-400/50" />
                Pix & Cartão
              </span>
              <span className="text-emerald-400 font-black">Ativação Imediata</span>
            </div>
          </div>

          {/* 2. PLANO INTERMEDIÁRIO (CRIADOR - CARD DESTACADO FORGE UI) */}
          <div 
            className="flex flex-col justify-between p-6 sm:p-8 rounded-2xl border-2 border-[#F65A1A] relative overflow-hidden transition-all duration-300 shadow-[0_20px_60px_-10px_rgba(246,90,26,0.35)] scale-[1.02] z-10"
            style={{
              background: "#131315",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 22px 60px -10px rgba(246, 90, 26, 0.35)"
            }}
          >
            {/* Tag Flutuante Mais Popular */}
            <div className="absolute top-4 right-5">
              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#F65A1A] text-[#0B0B0C] shadow-sm flex items-center gap-1 border border-[#F65A1A]">
                <Sparkles size={12} className="text-[#0B0B0C]" />
                <span>Mais Escolhido</span>
              </span>
            </div>

            <div className="flex flex-col gap-6">
              {/* Header do Card */}
              <div className="flex flex-col gap-1.5 pr-20">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#F65A1A]">
                  {PLANS_DATA.intermediario.badge}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
                  {PLANS_DATA.intermediario.name}
                </h3>
                <p className="text-xs text-slate-100 leading-relaxed min-h-[36px] font-medium">
                  {PLANS_DATA.intermediario.tagline}
                </p>
              </div>

              {/* Preço */}
              <div className="flex flex-col gap-1 bg-black/50 p-4 rounded-xl border border-[#F65A1A]/40 shadow-inner">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-black text-slate-200">R$</span>
                  <span className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-sm">
                    {config.priceIntermediario.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-xs font-bold text-slate-200">/mês</span>
                </div>
                <span className="text-xs text-slate-200 font-semibold">Assinatura mensal</span>
              </div>

              {/* Botão de Ação Destacado */}
              <button
                type="button"
                onClick={() => handleOpenCheckout("intermediario")}
                className="w-full py-4 px-4 rounded-md border border-[#F65A1A] bg-[#F65A1A] hover:bg-[#FF7A38] text-[#0B0B0C] font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-150 cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.3),0_4px_14px_rgba(246,90,26,0.3)]"
              >
                <Check size={18} className="text-[#0B0B0C] stroke-[3]" />
                <span>
                  {subscription.planId === "intermediario" ? "Seu plano atual" : "Escolher Plano Criador"}
                </span>
              </button>

              <span className="text-xs text-slate-200 text-center font-medium -mt-2">
                O mais equilibrado para quem produz e fatura diariamente
              </span>

              <div className="w-full h-[1px] bg-white/20 my-1" />

              {/* Cota Destaque */}
              <div className="flex items-baseline gap-2.5 bg-black/40 p-3 rounded-xl border border-white/10">
                <span className="text-3xl font-black text-[var(--gm-primary)] drop-shadow-sm">
                  {PLANS_DATA.intermediario.quotaLabel}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-white leading-tight">orçamentos por mês</span>
                  <span className="text-xs text-slate-200 font-medium">Produção ativa para o dia a dia</span>
                </div>
              </div>

              {/* Checklist de Recursos */}
              <ul className="flex flex-col gap-3 text-xs text-white font-semibold">
                {PLANS_DATA.intermediario.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2.5">
                    <Check size={16} className="text-[var(--gm-primary)] shrink-0 stroke-[3]" />
                    <span className="leading-snug">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rodapé com badges */}
            <div className="border-t border-white/20 pt-4 mt-6 flex items-center justify-between text-xs text-slate-200 font-bold">
              <span className="flex items-center gap-1.5 text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--gm-primary)] animate-pulse shadow-sm shadow-orange-500/50" />
                Pix Instantâneo & Cartão
              </span>
              <span className="text-emerald-400 font-black">Liberação na hora</span>
            </div>
          </div>

          {/* 3. PLANO AVANÇADO (PROFISSIONAL) */}
          <div 
            className="flex flex-col justify-between p-6 sm:p-8 rounded-2xl border border-zinc-800 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/50 shadow-xl"
            style={{
              background: "#121215",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 14px 40px rgba(0, 0, 0, 0.5)"
            }}
          >
            <div className="flex flex-col gap-6">
              {/* Header do Card */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                  {PLANS_DATA.avancado.badge}
                </span>
                <h3 className="text-2xl font-black text-white tracking-tight drop-shadow-sm">
                  {PLANS_DATA.avancado.name}
                </h3>
                <p className="text-xs text-slate-200 leading-relaxed min-h-[36px] font-medium">
                  {PLANS_DATA.avancado.tagline}
                </p>
              </div>

              {/* Preço */}
              <div className="flex flex-col gap-1 bg-black/40 p-4 rounded-2xl border border-white/10">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-black text-slate-300">R$</span>
                  <span className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-sm">
                    {config.priceAvancado.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-xs font-bold text-slate-300">/mês</span>
                </div>
                <span className="text-xs text-slate-300 font-semibold">Assinatura mensal</span>
              </div>

              {/* Botão de Ação: Fazer Upgrade -> */}
              <button
                type="button"
                onClick={() => handleOpenCheckout("avancado")}
                className="w-full py-3.5 px-4 rounded-md border border-[#26262A] hover:border-[#3F3F46] bg-[#131315] hover:bg-[#1B1B1E] text-[#F2F2F3] font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>Fazer upgrade</span>
                <ArrowRight size={16} className="text-[#F65A1A]" />
              </button>

              <span className="text-xs text-slate-300 text-center font-medium -mt-2">
                Acesso total irrestrito para alta produtividade
              </span>

              <div className="w-full h-[1px] bg-white/15 my-1" />

              {/* Cota Destaque */}
              <div className="flex items-baseline gap-2.5 bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-3xl font-black text-emerald-400">
                  {PLANS_DATA.avancado.quotaLabel}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-white leading-tight">orçamentos ilimitados</span>
                  <span className="text-xs text-slate-300 font-medium">Sem limites de cadastros</span>
                </div>
              </div>

              {/* Checklist de Recursos */}
              <ul className="flex flex-col gap-3 text-xs text-slate-100 font-semibold">
                {PLANS_DATA.avancado.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                    <span className="leading-snug">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rodapé com badges */}
            <div className="border-t border-white/15 pt-4 mt-6 flex items-center justify-between text-xs text-slate-200 font-bold">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                Tudo Liberado
              </span>
              <span className="text-white font-bold">Suporte Prioritário VIP</span>
            </div>
          </div>
        </div>

        {/* RODAPÉ COM BANDEIRAS DE PAGAMENTO (COMO NO PRINT DO USUÁRIO) */}
        <div className="flex flex-col items-center justify-center gap-3 pt-6 border-t border-white/10 text-center text-zinc-400">
          <p className="text-xs leading-relaxed max-w-xl">
            Valores de catálogo exibidos. A ativação ocorre imediatamente após a confirmação do pagamento via Pix ou Cartão.
          </p>

          <div className="flex items-center gap-4 text-xs font-bold text-zinc-300 flex-wrap justify-center opacity-85">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <Lock size={13} className="text-emerald-400" />
              <span>Checkout Criptografado</span>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-emerald-400">
              ❖ Pix Instantâneo
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[#009EE3]">
              Mercado Pago
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[#635BFF]">
              Stripe
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white">
               Pay & G Pay
            </span>
          </div>
        </div>

        {/* =========================================================================
            GUIA PARA O PROPRIETÁRIO: PLATAFORMAS GRATUITAS PARA VENDER O APP
           ========================================================================= */}
        <SectionDivider label="Guia de Monetização e Plataformas Gratuitas" />

        <div className="p-6 sm:p-8 rounded-3xl border border-white/10 glass-card flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--gm-primary)]/15 border border-[var(--gm-primary)]/30 text-[var(--gm-primary)] flex items-center justify-center shrink-0">
              <HelpCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Como receber pagamentos para vendas do App sem mensalidade fixa
              </h3>
              <p className="text-xs text-zinc-400">
                Plataformas 100% gratuitas para criar conta, onde você paga apenas uma pequena porcentagem por venda aprovada.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Mercado Pago */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-[#009EE3] text-base">1. Mercado Pago</h4>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Mais Recomendado
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Conta gratuita sem mensalidade. Permite criar <strong>Links de Pagamento</strong> e QR Code Pix instantâneo com taxa super baixa (~0.99% no Pix). O dinheiro cai na hora na sua conta.
                </p>
              </div>
              <div className="text-[11px] text-zinc-400 bg-black/30 p-2.5 rounded-xl border border-white/5">
                <strong>No App:</strong> Cole o link de pagamento de cada plano no modal de edição do ADM.
              </div>
            </div>

            {/* 2. Asaas */}
            <div className="p-5 rounded-2xl bg-black/40 border border-white/15 flex flex-col justify-between gap-4 shadow-lg">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-amber-300 text-base">2. Asaas</h4>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Recorrência
                  </span>
                </div>
                <p className="text-xs text-slate-100 leading-relaxed font-medium">
                  Sem mensalidade. Especialista em <strong className="text-white">assinaturas recorrentes mensais</strong>. Cobra o cliente automaticamente todo mês no cartão ou manda cobrança Pix no WhatsApp.
                </p>
              </div>
              <div className="text-xs text-slate-200 bg-black/50 p-2.5 rounded-xl border border-white/10 font-medium">
                <strong className="text-amber-300">No App:</strong> Crie um link de assinatura no Asaas e configure nos planos.
              </div>
            </div>

            {/* 3. Pix Direto do Banco */}
            <div className="p-5 rounded-2xl bg-black/40 border border-white/15 flex flex-col justify-between gap-4 shadow-lg">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-emerald-400 text-base">3. Pix Direto (0% Taxa)</h4>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Taxa Zero
                  </span>
                </div>
                <p className="text-xs text-slate-100 leading-relaxed font-medium">
                  Já integrado nativamente no app! O cliente escaneia o QR Code ou copia a chave Pix e você recebe <strong className="text-white">100% do valor limpo</strong> na sua conta bancária sem intermediários.
                </p>
              </div>
              <div className="text-xs text-slate-200 bg-black/50 p-2.5 rounded-xl border border-white/10 font-medium">
                <strong className="text-emerald-400">No App:</strong> Já pronto com botão para o cliente enviar o comprovante no WhatsApp!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE CHECKOUT / PAGAMENTO */}
      {selectedPlanForCheckout && (
        <PlanCheckoutModal
          isOpen={Boolean(selectedPlanForCheckout)}
          onClose={() => setSelectedPlanForCheckout(null)}
          selectedPlanId={selectedPlanForCheckout}
          onPlanActivated={() => {
            setSubscription(getUserSubscription(tenantId, user?.email));
          }}
        />
      )}

      {/* MODAL DE EDIÇÃO DE CONFIGURAÇÕES DOS PLANOS (EXCLUSIVO PARA O ADMINISTRADOR)
          Container horizontal ampliado, cápsulas de porcentagem organizadas, campos de links arredondados (rounded-2xl) e sem botão SQL */}
      {isAdminEditOpen && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          style={{
            background: "rgba(0, 0, 0, 0.80)",
          }}
          onClick={() => setIsAdminEditOpen(false)}
        >
          <div
            ref={adminModalRef}
            className="w-full rounded-2xl p-5 sm:p-7 relative flex flex-col gap-5 text-white border border-amber-500/40 shadow-2xl select-text"
            style={{
              width: adminModalSize.width ? `min(${adminModalSize.width}px, 94vw)` : "95%",
              maxWidth: adminModalSize.width ? `min(${adminModalSize.width}px, 94vw)` : "760px",
              height: adminModalSize.height ? `min(${adminModalSize.height}px, 92vh)` : undefined,
              maxHeight: adminModalSize.height ? `min(${adminModalSize.height}px, 92vh)` : "90vh",
              overflowY: "auto",
              background: "#141418",
              boxShadow: "0 25px 65px -12px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Redimensionador de Caixa/Container (Igual ao de Notas) com os 4 cantos e bordas */}
            <ModalResizeHandles
              onResizeStart={handleAdminResizeStart}
              onResetSize={handleAdminResetSize}
              accentColor="#F59E0B"
            />
            {/* Header Amplo, Elegante e de Alto Contraste */}
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl font-black text-white leading-tight">Configurar Planos & Pagamentos</h3>
                  <p className="text-xs text-slate-300 font-medium">Edite valores, chave Pix e links de checkout dos planos para todos os usuários</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminEditOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center cursor-pointer transition-colors"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdminConfig} className="flex flex-col gap-5 text-xs">
              {/* 1. CALCULADORA DE PORCENTAGEM SIMULTÂNEA + CÁPSULAS BEM ORGANIZADAS */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-100 text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-2">
                    <span>Valores Mensais de Assinatura</span>
                    <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      Simultâneo ou Individual
                    </span>
                  </span>
                </div>

                {/* Bloco da Calculadora Simultânea */}
                <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-amber-500/30 flex flex-col gap-3.5 shadow-inner">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <Calculator size={15} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block">
                          Calculadora Simultânea (%)
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          Recalcula os 3 planos simultaneamente mantendo a proporção
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetToConfigPrices}
                      className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1.5 font-semibold transition-colors cursor-pointer bg-white/5 hover:bg-white/10 px-3 py-1 rounded-xl border border-white/10"
                      title="Restaurar valores aos padrões cadastrados"
                    >
                      <RotateCcw size={12} />
                      <span>Restaurar Padrões</span>
                    </button>
                  </div>

                  {/* Input de Porcentagem e Botões Aumentar / Desconto */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.5"
                        min="0.1"
                        max="500"
                        value={percentValue}
                        onChange={(e) => setPercentValue(e.target.value)}
                        placeholder="Ex: 10"
                        className="w-full h-10 pl-3 pr-8 rounded-xl bg-[#08090f] border border-white/25 text-white font-black text-sm outline-none focus:border-amber-400 text-center"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-amber-400 pointer-events-none">
                        %
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyPercent("increase")}
                      className="h-10 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
                      title="Aumentar todos os 3 planos com a porcentagem digitada"
                    >
                      <TrendingUp size={14} />
                      <span>+ Aumentar (% digitada)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyPercent("discount")}
                      className="h-10 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
                      title="Aplicar desconto em todos os 3 planos com a porcentagem digitada"
                    >
                      <TrendingDown size={14} />
                      <span>- Desconto (% digitada)</span>
                    </button>
                  </div>

                  {/* Cápsulas de Porcentagem Organizadas e Estendidas até a Outra Borda do Container */}
                  <div className="flex flex-col gap-2.5 pt-2.5 border-t border-white/10 w-full">
                    {/* Linha 1: Acréscimos Rápidos (+) - Estendidas até a outra borda */}
                    <div className="flex items-center gap-2.5 w-full">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 shrink-0 flex items-center gap-1 w-24">
                        <TrendingUp size={11} />
                        <span>Acréscimos:</span>
                      </span>
                      <div className="flex-1 grid grid-cols-7 gap-1.5 sm:gap-2 w-full">
                        {[5, 10, 15, 20, 25, 30, 50].map((pct) => (
                          <button
                            key={`inc-${pct}`}
                            type="button"
                            onClick={() => handleApplyPercent("increase", pct)}
                            className="w-full py-1.5 px-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/35 text-[11px] sm:text-xs font-black cursor-pointer transition-all active:scale-95 hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] text-center flex items-center justify-center"
                          >
                            +{pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Linha 2: Descontos Rápidos (-) - Estendidas até a outra borda */}
                    <div className="flex items-center gap-2.5 w-full">
                      <span className="text-[10px] uppercase font-bold text-rose-400 shrink-0 flex items-center gap-1 w-24">
                        <TrendingDown size={11} />
                        <span>Descontos:</span>
                      </span>
                      <div className="flex-1 grid grid-cols-7 gap-1.5 sm:gap-2 w-full">
                        {[5, 10, 15, 20, 25, 30, 50].map((pct) => (
                          <button
                            key={`disc-${pct}`}
                            type="button"
                            onClick={() => handleApplyPercent("discount", pct)}
                            className="w-full py-1.5 px-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/35 text-[11px] sm:text-xs font-black cursor-pointer transition-all active:scale-95 hover:shadow-[0_0_12px_rgba(244,63,94,0.3)] text-center flex items-center justify-center"
                          >
                            -{pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Linha 3: Opção de Arredondamento Inteligente */}
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={roundToNineSeven}
                          onChange={(e) => setRoundToNineSeven(e.target.checked)}
                          className="rounded border-white/20 text-amber-500 focus:ring-0 bg-black/40 cursor-pointer w-4 h-4"
                        />
                        <span>Arredondar preço com final comercial <strong className="text-amber-300">,97</strong> (ex: R$ 39,97)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Os 3 Campos de Preço Individuais (Grid Responsivo de 3 Colunas) */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-xs text-slate-300 font-medium">
                    Ou ajuste o valor exato de cada plano individualmente:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-2xl bg-[#07090e] border border-sky-500/30 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="font-extrabold text-sky-400 text-xs uppercase tracking-wider">
                          Plano Básico
                        </label>
                        <span className="text-[10px] text-sky-300 font-bold bg-sky-500/20 px-1.5 py-0.5 rounded-md">
                          Essencial
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={editPriceBasico}
                          onChange={(e) => setEditPriceBasico(Number(e.target.value))}
                          className="w-full h-10 pl-9 pr-3 rounded-xl bg-black/60 border border-white/20 text-white font-black text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all text-center"
                          required
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#07090e] border border-[var(--gm-primary)]/40 flex flex-col gap-1.5 shadow-[0_0_15px_rgba(254,84,11,0.1)]">
                      <div className="flex items-center justify-between">
                        <label className="font-extrabold text-[var(--gm-primary)] text-xs uppercase tracking-wider">
                          Plano Criador
                        </label>
                        <span className="text-[10px] text-orange-300 font-bold bg-[var(--gm-primary)]/20 px-1.5 py-0.5 rounded-md">
                          Mais Popular
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={editPriceIntermediario}
                          onChange={(e) => setEditPriceIntermediario(Number(e.target.value))}
                          className="w-full h-10 pl-9 pr-3 rounded-xl bg-black/60 border border-white/20 text-white font-black text-sm outline-none focus:border-[var(--gm-primary)] focus:ring-1 focus:ring-[var(--gm-primary)] transition-all text-center"
                          required
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#07090e] border border-emerald-500/30 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="font-extrabold text-emerald-400 text-xs uppercase tracking-wider">
                          Plano Avançado
                        </label>
                        <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded-md">
                          Acesso Total
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={editPriceAvancado}
                          onChange={(e) => setEditPriceAvancado(Number(e.target.value))}
                          className="w-full h-10 pl-9 pr-3 rounded-xl bg-black/60 border border-white/20 text-white font-black text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all text-center"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. CHAVE PIX E BENEFICIÁRIO (RECEBIMENTO INSTANTÂNEO 0% TAXA) */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/15">
                <span className="font-extrabold text-slate-100 text-xs uppercase tracking-wider flex items-center gap-2">
                  <span>Recebimento via Pix (Taxa 0%)</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-[#07090e] border border-white/15 flex flex-col gap-1">
                    <label className="font-bold text-slate-200 text-xs">Chave Pix</label>
                    <input
                      type="text"
                      value={editPixKey}
                      onChange={(e) => setEditPixKey(e.target.value)}
                      placeholder="E-mail, CNPJ ou telefone"
                      className="h-10 px-3.5 rounded-xl bg-black/60 border border-white/20 text-white font-mono text-xs outline-none focus:border-[var(--gm-primary)] transition-all"
                      required
                    />
                  </div>
                  <div className="p-3 rounded-2xl bg-[#07090e] border border-white/15 flex flex-col gap-1">
                    <label className="font-bold text-slate-200 text-xs">Nome do Beneficiário</label>
                    <input
                      type="text"
                      value={editReceiverName}
                      onChange={(e) => setEditReceiverName(e.target.value)}
                      placeholder="GM EDIFICACAO"
                      className="h-10 px-3.5 rounded-xl bg-black/60 border border-white/20 text-white font-bold text-xs outline-none focus:border-[var(--gm-primary)] transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 3. LINKS DE CHECKOUT EXTERNOS (MERCADO PAGO / STRIPE / ASAAS) COM CAMPOS BEM ARREDONDADOS (rounded-2xl) */}
              <div className="flex flex-col gap-3 pt-2 border-t border-white/15">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-extrabold text-white uppercase tracking-wider text-xs block">
                      Links de Checkout Externos (Mercado Pago, Stripe, Asaas)
                    </span>
                    <span className="text-[11px] text-slate-300 font-medium block">
                      Permite que seus clientes paguem com cartão de crédito via checkout direto
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    Checkout Automático
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {/* Link Plano Básico */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#07090e] border border-sky-500/25 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-400 font-black text-[11px] uppercase tracking-wider">
                          Plano Básico
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">Link de Pagamento / Assinatura</span>
                      </div>
                      {editLinkBasico.trim() && (
                        <a
                          href={editLinkBasico.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-sky-300 hover:text-white flex items-center gap-1 font-bold bg-sky-500/15 px-2 py-1 rounded-lg border border-sky-500/30 transition-colors"
                        >
                          <ExternalLink size={11} />
                          <span>Testar Link</span>
                        </a>
                      )}
                    </div>
                    <input
                      type="url"
                      value={editLinkBasico}
                      onChange={(e) => setEditLinkBasico(e.target.value)}
                      placeholder="https://mpago.la/... (Cole o link de checkout do Mercado Pago / Stripe)"
                      className="w-full h-11 px-4 rounded-2xl bg-black/60 border border-white/20 text-white font-mono text-xs outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all placeholder:text-slate-500"
                    />
                  </div>

                  {/* Link Plano Criador */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#07090e] border border-[var(--gm-primary)]/35 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] font-black text-[11px] uppercase tracking-wider">
                          Plano Criador
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">Link de Pagamento / Assinatura (Mais Popular)</span>
                      </div>
                      {editLinkIntermediario.trim() && (
                        <a
                          href={editLinkIntermediario.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-orange-300 hover:text-white flex items-center gap-1 font-bold bg-orange-500/15 px-2 py-1 rounded-lg border border-orange-500/30 transition-colors"
                        >
                          <ExternalLink size={11} />
                          <span>Testar Link</span>
                        </a>
                      )}
                    </div>
                    <input
                      type="url"
                      value={editLinkIntermediario}
                      onChange={(e) => setEditLinkIntermediario(e.target.value)}
                      placeholder="https://mpago.la/... (Cole o link de checkout do Mercado Pago / Stripe)"
                      className="w-full h-11 px-4 rounded-2xl bg-black/60 border border-white/20 text-white font-mono text-xs outline-none focus:border-[var(--gm-primary)] focus:ring-1 focus:ring-[var(--gm-primary)] transition-all placeholder:text-slate-500"
                    />
                  </div>

                  {/* Link Plano Avançado */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#07090e] border border-emerald-500/25 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-[11px] uppercase tracking-wider">
                          Plano Avançado
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">Link de Pagamento / Assinatura (Acesso Total)</span>
                      </div>
                      {editLinkAvancado.trim() && (
                        <a
                          href={editLinkAvancado.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-300 hover:text-white flex items-center gap-1 font-bold bg-emerald-500/15 px-2 py-1 rounded-lg border border-emerald-500/30 transition-colors"
                        >
                          <ExternalLink size={11} />
                          <span>Testar Link</span>
                        </a>
                      )}
                    </div>
                    <input
                      type="url"
                      value={editLinkAvancado}
                      onChange={(e) => setEditLinkAvancado(e.target.value)}
                      placeholder="https://mpago.la/... (Cole o link de checkout do Mercado Pago / Stripe)"
                      className="w-full h-11 px-4 rounded-2xl bg-black/60 border border-white/20 text-white font-mono text-xs outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Rodapé de Ações - Limpo, Seguro e Sem Botão SQL */}
              <div className="pt-3 flex gap-3 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsAdminEditOpen(false)}
                  className="flex-1 h-11 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold cursor-pointer transition-colors text-xs sm:text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAdmin}
                  className="flex-1 h-11 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black uppercase tracking-wider cursor-pointer shadow-lg shadow-amber-500/25 active:scale-95 transition-all text-xs sm:text-sm flex items-center justify-center gap-2"
                >
                  {savingAdmin ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Salvando e Sincronizando...</span>
                    </>
                  ) : (
                    <span>Salvar Alterações</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Page>
  );
}
