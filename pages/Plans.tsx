import React, { useState, useEffect, useRef } from "react";
import { 
  Check, X, ShieldCheck, Sparkles, ArrowRight, Settings, QrCode, CreditCard, 
  ExternalLink, HelpCircle, Users, Award, Lock, Star, Calculator, 
  TrendingUp, TrendingDown, RotateCcw, Percent, ChevronDown, ChevronUp,
  FileText, Smartphone, Bell, Flame, MessageCircle, CheckCircle2,
  Clock, Zap, Building2, Layers
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

  // Estado para acordeões expansíveis (Comparativo e FAQ)
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Redimensionador de container do modal administrativo
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

    fetchPlansConfigFromCloud(tenantId).then((cloudConfig) => {
      if (isMounted && cloudConfig) {
        setConfig(cloudConfig);
      }
    }).catch(() => {});

    window.addEventListener("gm_settings_updated", syncPlans);
    window.addEventListener("gm_plans_config_updated", syncPlans);
    window.addEventListener("gm_plan_updated", syncPlans);
    return () => {
      isMounted = false;
      window.removeEventListener("gm_settings_updated", syncPlans);
      window.removeEventListener("gm_plans_config_updated", syncPlans);
      window.removeEventListener("gm_plan_updated", syncPlans);
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

  // Perguntas Frequentes estruturadas
  const FAQ_ITEMS = [
    {
      q: "Como funciona a opção de teste grátis de 7 dias?",
      a: "Ao criar sua conta, você recebe automaticamente 7 dias de acesso completo ao Plano Criador para experimentar orçamentos, clientes, impressão em papel timbrado oficial e relatórios. Não solicitamos cartão de crédito para iniciar o teste.",
    },
    {
      q: "Como posso pagar a assinatura do meu plano?",
      a: "Você pode pagar via Pix instantâneo com código QR Code / Copia e Cola diretamente no aplicativo (com ativação imediata) ou via Cartão de Crédito com parcelamento ou cobrança recorrente segura.",
    },
    {
      q: "Posso trocar de plano ou fazer upgrade depois?",
      a: "Sim! Você pode fazer upgrade do Plano Essencial para o Criador ou Profissional a qualquer momento. A liberação dos novos limites e ferramentas é instantânea.",
    },
    {
      q: "E se eu quiser cancelar minha assinatura?",
      a: "Não há carência, fidelidade ou multas. Você tem total liberdade para cancelar sua assinatura quando desejar diretamente pelo aplicativo ou falando com o nosso suporte.",
    },
    {
      q: "O que acontece com os meus dados se o plano expirar?",
      a: "Seus dados de orçamentos, clientes e tabelas de preços ficam 100% seguros e preservados. Ao reativar qualquer plano, tudo volta a ficar disponível imediatamente.",
    },
    {
      q: "Como recebo atendimento e suporte?",
      a: "Nosso suporte é humanizado e realizado diretamente via WhatsApp por especialistas que entendem a rotina de quem produz e fecha obras.",
    },
  ];

  return (
    <Page title="Planos & Assinatura">
      <div className="w-full flex flex-col gap-8 pb-20 select-text">
        {/* =========================================================================
            1. HERO BANNER FORGE DESIGN (Inspirado no Designers Hub, adaptado para GM)
           ========================================================================= */}
        <div 
          className="relative w-full rounded-2xl p-6 sm:p-10 border border-[#26262a] overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #121215 0%, #0d0d0f 100%)",
            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 16px 40px rgba(0, 0, 0, 0.6)"
          }}
        >
          {/* Efeito Glow Ember Forge de fundo */}
          <div 
            className="absolute -right-20 -top-20 w-96 h-96 rounded-full pointer-events-none opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, #f65a1a 0%, transparent 70%)" }}
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col gap-3 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#1b1b1e] text-[#f65a1a] border border-[#2f2f34]">
                  GM Edificação • Planos Oficiais
                </span>
                <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-white/5 text-zinc-400 border border-white/10">
                  Feito para Construtores & Prestadores
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#f2f2f3] tracking-tight leading-tight">
                Seu próximo passo profissional.
              </h1>

              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed font-normal">
                Orçamentos rápidos em PDF A4 timbrado, catálogo de materiais, controle de clientes, despesas e envio no WhatsApp em 1 clique. Escolha o ritmo da sua produção.
              </p>

              <div className="flex items-center gap-3 pt-2 text-xs font-mono text-zinc-400 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#f65a1a]" />
                  Planos mensais
                </span>
                <span className="text-zinc-600">•</span>
                <span>Cancele quando quiser</span>
                <span className="text-zinc-600">•</span>
                <span className="text-emerald-400 font-bold">Ativação imediata via Pix & Cartão</span>
              </div>
            </div>

            {/* Ações do Topo / Acesso ADM */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              {isAdmin && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleOpenAdminEdit}
                    className="py-3 px-4 rounded bg-[#f65a1a] hover:bg-[#ff6f33] text-[#09090b] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#f65a1a]/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-[#f65a1a]"
                  >
                    <Settings size={15} />
                    <span>Configurar Planos & Preços (ADM)</span>
                  </button>

                  <a
                    href="/admin/usuarios"
                    className="py-3 px-4 rounded bg-[#1b1b1e] hover:bg-[#25252a] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-[#2f2f34] hover:border-amber-500/40 transition-all cursor-pointer shadow-sm"
                  >
                    <Users size={15} className="text-amber-400" />
                    <span>Gerenciar Usuários & Liberações</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. CARD DE STATUS DO PLANO ATUAL (SEU PLANO ATUAL)
           ========================================================================= */}
        <div 
          className="w-full p-5 sm:p-6 rounded-xl border border-[#26262a] flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{
            background: "#121215",
            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)"
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#1b1b1e] border border-[#2f2f34] text-[#f65a1a] flex items-center justify-center shrink-0">
              {subscription.isSuperAdmin ? (
                <Award size={24} className="text-amber-400" />
              ) : (
                <CheckCircle2 size={24} className="text-[#f65a1a]" />
              )}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-white/5 text-zinc-400 border border-white/10">
                  SEU PLANO ATUAL
                </span>
                {subscription.isSuperAdmin && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Acesso Master Ilimitado
                  </span>
                )}
              </div>

              <h3 className="text-lg sm:text-xl font-black text-[#f2f2f3]">
                {subscription.planName}
              </h3>

              <p className="text-xs text-zinc-400">
                {subscription.isSuperAdmin ? (
                  "Conta administrativa principal liberada com acesso permanente e irrestrito a todos os módulos."
                ) : (
                  <>
                    Consulte o estado da sua assinatura em cobrança •{" "}
                    {subscription.expiresAt ? (
                      <>Fim do período: <strong className="text-zinc-200">{new Date(subscription.expiresAt).toLocaleDateString("pt-BR")}</strong> • </>
                    ) : null}
                    <strong className="text-[#f65a1a]">
                      {subscription.daysRemaining === "ilimitado" ? "Acesso Ilimitado" : `${subscription.daysRemaining} dias restantes`}
                    </strong>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenCheckout("intermediario")}
              className="py-2.5 px-4 rounded border border-[#2f2f34] bg-[#18181b] hover:bg-[#202024] text-zinc-200 hover:text-white font-mono text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Gerenciar assinatura</span>
              <ArrowRight size={14} className="text-[#f65a1a]" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            3. OS 3 CARDS DE PLANOS (FORGE OBSIDIAN CARDS COM BORDA NÍTIDA)
               - Essencial (Para o dia a dia)
               - Criador (Mais espaço para criar • Card Destacado)
               - Profissional (Mais completo • Com acesso total)
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* 1. PLANO ESSENCIAL (BÁSICO) */}
          <div 
            className="flex flex-col justify-between p-6 sm:p-8 rounded-xl border border-[#26262a] relative overflow-hidden transition-all duration-200 hover:border-[#38383e]"
            style={{
              background: "#121215",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)"
            }}
          >
            <div className="flex flex-col gap-6">
              {/* Tag Superior */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  PARA O DIA A DIA
                </span>
                <h3 className="text-2xl font-black text-[#f2f2f3] tracking-tight">
                  {PLANS_DATA.basico.name}
                </h3>
                <p className="text-xs text-zinc-400 min-h-[36px] leading-relaxed">
                  {PLANS_DATA.basico.tagline}
                </p>
              </div>

              {/* Preço */}
              <div className="flex items-baseline gap-1 py-1">
                <span className="text-sm font-black text-zinc-400">R$</span>
                <span className="text-4xl sm:text-5xl font-black text-[#f2f2f3] tracking-tight">
                  {config.priceBasico.toFixed(2).replace(".", ",")}
                </span>
                <span className="text-xs text-zinc-400 font-mono">/mês</span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono -mt-4">
                Assinatura mensal flexível
              </span>

              {/* Botão de Assinatura */}
              <button
                type="button"
                onClick={() => handleOpenCheckout("basico")}
                className="w-full py-3.5 px-4 rounded border border-[#2f2f34] bg-[#18181b] hover:bg-[#202024] hover:border-zinc-500 text-zinc-200 hover:text-white font-mono text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Assinar Essencial</span>
                <ArrowRight size={14} className="text-zinc-400" />
              </button>
              <span className="text-[10px] text-zinc-500 text-center font-mono -mt-3">
                Revise as condições antes de confirmar
              </span>

              <div className="w-full h-[1px] bg-[#26262a] my-1" />

              {/* Cota Destaque */}
              <div className="flex items-baseline gap-2.5 bg-[#0e0e10] p-3 rounded border border-[#26262a]">
                <span className="text-3xl font-black text-sky-400 font-mono">
                  {PLANS_DATA.basico.quotaLabel}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-[#f2f2f3] leading-tight">orçamentos por mês</span>
                  <span className="text-[10px] text-zinc-400 font-mono">Renovação mensal da cota</span>
                </div>
              </div>

              {/* Checklist de Recursos Incluídos */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Ferramentas Incluídas
                </span>
                <ul className="flex flex-col gap-2.5 text-xs text-zinc-300">
                  {PLANS_DATA.basico.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <Check size={15} className="text-sky-400 shrink-0 mt-0.5 stroke-[2.5]" />
                      <span className="leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Não incluídas */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[#26262a]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                  Não Incluídas no Básico
                </span>
                <ul className="flex flex-col gap-2 text-xs text-zinc-500">
                  <li className="flex items-center gap-2.5">
                    <X size={14} className="text-zinc-600 shrink-0" />
                    <span>Papel Timbrado A4 Oficial</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <X size={14} className="text-zinc-600 shrink-0" />
                    <span>Controle de Despesas & Relatórios DRE</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <X size={14} className="text-zinc-600 shrink-0" />
                    <span>Minha Bio / Portfólio Website</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Rodapé do Card */}
            <div className="border-t border-[#26262a] pt-4 mt-6 flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                Pix & Cartão
              </span>
              <span className="text-emerald-400 font-bold">Ativação Imediata</span>
            </div>
          </div>

          {/* 2. PLANO CRIADOR (INTERMEDIÁRIO - CARD PRINCIPAL / MAIS POPULAR) */}
          <div 
            className="flex flex-col justify-between p-6 sm:p-8 rounded-xl border-2 border-[#f65a1a] relative overflow-hidden transition-all duration-200 shadow-[0_16px_50px_-10px_rgba(246,90,26,0.3)] scale-[1.02] z-10"
            style={{
              background: "#161619",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 20px 50px -10px rgba(246, 90, 26, 0.25)"
            }}
          >
            {/* Tag Flutuante Mais Escolhido */}
            <div className="absolute top-4 right-4">
              <span className="px-2.5 py-1 rounded text-[10px] font-mono font-black uppercase tracking-wider bg-[#f65a1a] text-[#09090b] flex items-center gap-1 shadow-md">
                <Sparkles size={11} className="text-[#09090b]" />
                <span>Mais Escolhido</span>
              </span>
            </div>

            <div className="flex flex-col gap-6">
              {/* Header do Card */}
              <div className="flex flex-col gap-1.5 pr-24">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#f65a1a]">
                  MAIS ESPAÇO PARA CRIAR
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-[#f2f2f3] tracking-tight">
                  {PLANS_DATA.intermediario.name}
                </h3>
                <p className="text-xs text-zinc-300 min-h-[36px] leading-relaxed">
                  {PLANS_DATA.intermediario.tagline}
                </p>
              </div>

              {/* Preço */}
              <div className="flex items-baseline gap-1 py-1">
                <span className="text-sm font-black text-zinc-300">R$</span>
                <span className="text-4xl sm:text-5xl font-black text-[#f2f2f3] tracking-tight">
                  {config.priceIntermediario.toFixed(2).replace(".", ",")}
                </span>
                <span className="text-xs text-zinc-300 font-mono">/mês</span>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono -mt-4">
                Assinatura mensal mais vendida
              </span>

              {/* Botão de Ação Destacado Forge */}
              <button
                type="button"
                onClick={() => handleOpenCheckout("intermediario")}
                className="w-full py-4 px-4 rounded border border-[#f65a1a] bg-[#f65a1a] hover:bg-[#ff6f33] text-[#09090b] font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-150 cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.3),0_4px_14px_rgba(246,90,26,0.35)]"
              >
                <Check size={18} className="text-[#09090b] stroke-[3]" />
                <span>
                  {subscription.planId === "intermediario" ? "Seu plano atual" : "Assinar Criador"}
                </span>
              </button>
              <span className="text-[10px] text-zinc-400 text-center font-mono -mt-3">
                O mais equilibrado para quem produz e fatura diariamente
              </span>

              <div className="w-full h-[1px] bg-white/10 my-1" />

              {/* Cota Destaque */}
              <div className="flex items-baseline gap-2.5 bg-[#0e0e10] p-3 rounded border border-[#f65a1a]/30 shadow-inner">
                <span className="text-3xl font-black text-[#f65a1a] font-mono">
                  {PLANS_DATA.intermediario.quotaLabel}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-[#f2f2f3] leading-tight">orçamentos por mês</span>
                  <span className="text-[10px] text-zinc-300 font-mono">Produção ativa para o dia a dia</span>
                </div>
              </div>

              {/* Checklist de Recursos */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#f65a1a]">
                  Tudo Liberado no Criador
                </span>
                <ul className="flex flex-col gap-2.5 text-xs text-white">
                  {PLANS_DATA.intermediario.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <Check size={15} className="text-[#f65a1a] shrink-0 mt-0.5 stroke-[3]" />
                      <span className="leading-snug font-medium">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Rodapé com badges */}
            <div className="border-t border-[#26262a] pt-4 mt-6 flex items-center justify-between text-xs font-mono text-zinc-300">
              <span className="flex items-center gap-1.5 text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f65a1a] animate-pulse shadow-sm shadow-[#f65a1a]/50" />
                Pix Instantâneo & Cartão
              </span>
              <span className="text-emerald-400 font-bold">Liberação na hora</span>
            </div>
          </div>

          {/* 3. PLANO PROFISSIONAL (AVANÇADO) */}
          <div 
            className="flex flex-col justify-between p-6 sm:p-8 rounded-xl border border-[#26262a] relative overflow-hidden transition-all duration-200 hover:border-emerald-500/50"
            style={{
              background: "#121215",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)"
            }}
          >
            <div className="flex flex-col gap-6">
              {/* Header do Card */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  MAIS COMPLETO • ACESSO TOTAL
                </span>
                <h3 className="text-2xl font-black text-[#f2f2f3] tracking-tight">
                  {PLANS_DATA.avancado.name}
                </h3>
                <p className="text-xs text-zinc-400 min-h-[36px] leading-relaxed">
                  {PLANS_DATA.avancado.tagline}
                </p>
              </div>

              {/* Preço */}
              <div className="flex items-baseline gap-1 py-1">
                <span className="text-sm font-black text-zinc-400">R$</span>
                <span className="text-4xl sm:text-5xl font-black text-[#f2f2f3] tracking-tight">
                  {config.priceAvancado.toFixed(2).replace(".", ",")}
                </span>
                <span className="text-xs text-zinc-400 font-mono">/mês</span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono -mt-4">
                Assinatura sem limites de produção
              </span>

              {/* Botão de Assinatura */}
              <button
                type="button"
                onClick={() => handleOpenCheckout("avancado")}
                className="w-full py-3.5 px-4 rounded border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white font-mono text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Assinar Profissional</span>
                <ArrowRight size={14} className="text-emerald-400" />
              </button>
              <span className="text-[10px] text-zinc-500 text-center font-mono -mt-3">
                Acesso total irrestrito para alta produtividade
              </span>

              <div className="w-full h-[1px] bg-[#26262a] my-1" />

              {/* Cota Destaque */}
              <div className="flex items-baseline gap-2.5 bg-[#0e0e10] p-3 rounded border border-[#26262a]">
                <span className="text-3xl font-black text-emerald-400 font-mono">
                  {PLANS_DATA.avancado.quotaLabel}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-[#f2f2f3] leading-tight">orçamentos ilimitados</span>
                  <span className="text-[10px] text-zinc-400 font-mono">Sem limites de cadastros</span>
                </div>
              </div>

              {/* Checklist de Recursos */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Benefícios Exclusivos Profissional
                </span>
                <ul className="flex flex-col gap-2.5 text-xs text-zinc-300">
                  {PLANS_DATA.avancado.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <Check size={15} className="text-emerald-400 shrink-0 mt-0.5 stroke-[2.5]" />
                      <span className="leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Rodapé com badges */}
            <div className="border-t border-[#26262a] pt-4 mt-6 flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                Tudo Ilimitado
              </span>
              <span className="text-white font-bold">Suporte VIP Prioritário</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. GUIA INFORMATIVO: COMO ADQUIRIR E ATIVAR SEU PLANO (3 PASSOS)
           ========================================================================= */}
        <div 
          className="w-full p-6 sm:p-8 rounded-xl border border-[#26262a] flex flex-col gap-6"
          style={{ background: "#121215" }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#f65a1a]">
              PROCESSO SIMPLES & SEGURO
            </span>
            <h3 className="text-lg sm:text-2xl font-black text-[#f2f2f3] tracking-tight">
              Como adquirir e ativar seu plano em 3 passos
            </h3>
            <p className="text-xs text-zinc-400">
              Sem burocracia. O sistema é ativado e atualizado imediatamente após a confirmação.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-[#18181b] border border-[#26262a] flex flex-col gap-2">
              <span className="text-xs font-mono font-black text-[#f65a1a]">01. ESCOLHA O PLANO</span>
              <h4 className="text-sm font-bold text-white">Selecione seu ritmo</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Clique no botão de assinatura do plano Essencial, Criador ou Profissional de acordo com a sua demanda mensal de orçamentos.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#18181b] border border-[#26262a] flex flex-col gap-2">
              <span className="text-xs font-mono font-black text-[#f65a1a]">02. PAGAMENTO INSTANTÂNEO</span>
              <h4 className="text-sm font-bold text-white">Pix ou Cartão</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Pague diretamente com QR Code Pix com valor automático ou utilize seu cartão de crédito com faturamento mensal protegido.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#18181b] border border-[#26262a] flex flex-col gap-2">
              <span className="text-xs font-mono font-black text-[#f65a1a]">03. LIBERAÇÃO IMEDIATA</span>
              <h4 className="text-sm font-bold text-white">Comece a produzir</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Seu plano é validado e todas as funcionalidades correspondentes ficam prontas para você fechar propostas e gerenciar clientes.
              </p>
            </div>
          </div>

          {/* Bandeiras de Segurança */}
          <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-[#26262a] text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Lock size={13} className="text-emerald-400" />
              <span>Checkout Seguro Criptografado</span>
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-emerald-400 font-bold">❖ Pix Instantâneo</span>
              <span>•</span>
              <span className="text-[#009ee3] font-bold">Mercado Pago</span>
              <span>•</span>
              <span className="text-[#635bff] font-bold">Stripe</span>
              <span>•</span>
              <span>Cartão de Crédito</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            5. ACORDEÃO RETRÁTIL: COMPARE OS DETALHES DE CADA PLANO
           ========================================================================= */}
        <div 
          className="w-full rounded-xl border border-[#26262a] overflow-hidden"
          style={{ background: "#121215" }}
        >
          <button
            type="button"
            onClick={() => setIsCompareOpen(!isCompareOpen)}
            className="w-full p-5 sm:p-6 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-[#18181b] border border-[#2f2f34] text-[#f65a1a] flex items-center justify-center shrink-0">
                <Layers size={18} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#f2f2f3]">
                  Compare os detalhes
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Veja a tabela completa do que está incluído em cada plano
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-[#f65a1a]">
              <span>{isCompareOpen ? "Ocultar comparativo" : "Ver comparativo"}</span>
              {isCompareOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {isCompareOpen && (
            <div className="p-5 sm:p-6 border-t border-[#26262a] overflow-x-auto">
              <table className="w-full min-w-[620px] text-xs text-left">
                <thead>
                  <tr className="border-b border-[#26262a] text-zinc-400 font-mono text-[11px] uppercase">
                    <th className="py-3 px-2">Recurso / Módulo</th>
                    <th className="py-3 px-2 text-center text-sky-400">Essencial</th>
                    <th className="py-3 px-2 text-center text-[#f65a1a] font-bold">Criador (Popular)</th>
                    <th className="py-3 px-2 text-center text-emerald-400">Profissional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26262a] text-zinc-300">
                  <tr>
                    <td className="py-3 px-2 font-bold text-white">Cota Mensal de Orçamentos</td>
                    <td className="py-3 px-2 text-center">15 / mês</td>
                    <td className="py-3 px-2 text-center font-bold text-[#f65a1a]">100 / mês</td>
                    <td className="py-3 px-2 text-center font-bold text-emerald-400">Ilimitados (∞)</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-white">Base de Clientes Cadastrados</td>
                    <td className="py-3 px-2 text-center">Até 20 clientes</td>
                    <td className="py-3 px-2 text-center font-bold text-white">Ilimitados</td>
                    <td className="py-3 px-2 text-center font-bold text-emerald-400">Ilimitados</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-white">Papel Timbrado A4 Oficial</td>
                    <td className="py-3 px-2 text-center"><X size={15} className="mx-auto text-zinc-600" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-[#f65a1a]" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-emerald-400" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-white">Envio no WhatsApp em 1 clique</td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-sky-400" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-[#f65a1a]" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-emerald-400" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-white">Controle de Despesas & Categorias</td>
                    <td className="py-3 px-2 text-center"><X size={15} className="mx-auto text-zinc-600" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-[#f65a1a]" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-emerald-400" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-white">DRE & Relatórios Analíticos</td>
                    <td className="py-3 px-2 text-center"><X size={15} className="mx-auto text-zinc-600" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-[#f65a1a]" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-emerald-400" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-white">Catálogo de Mercado & Materiais</td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-sky-400" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-[#f65a1a]" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-emerald-400" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-white">Minha Bio / Portfólio Website</td>
                    <td className="py-3 px-2 text-center"><X size={15} className="mx-auto text-zinc-600" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-[#f65a1a]" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-emerald-400" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-white">Alarmes & Notificações de Prazos</td>
                    <td className="py-3 px-2 text-center"><X size={15} className="mx-auto text-zinc-600" /></td>
                    <td className="py-3 px-2 text-center">Básico</td>
                    <td className="py-3 px-2 text-center font-bold text-emerald-400">Tempo Real VIP</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-white">Suporte Humanizado</td>
                    <td className="py-3 px-2 text-center">E-mail</td>
                    <td className="py-3 px-2 text-center font-bold text-white">WhatsApp Direto</td>
                    <td className="py-3 px-2 text-center font-bold text-emerald-400">VIP Prioritário</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* =========================================================================
            6. PERGUNTAS FREQUENTES (FAQ) - ANTES DE ESCOLHER
           ========================================================================= */}
        <div 
          className="w-full p-6 sm:p-8 rounded-xl border border-[#26262a] flex flex-col gap-6"
          style={{ background: "#121215" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#f65a1a]">
                SEM COMPLICAÇÃO
              </span>
              <h3 className="text-lg sm:text-2xl font-black text-[#f2f2f3] tracking-tight">
                Antes de escolher.
              </h3>
              <p className="text-xs text-zinc-400">
                Respostas para decidir com tranquilidade.
              </p>
            </div>

            <a
              href={`https://wa.me/${config.whatsappContact}?text=Ol%C3%A1%2C+tenho+d%C3%BAvidas+sobre+os+planos+do+CardDigital+GM`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-4 rounded border border-[#2f2f34] bg-[#18181b] hover:bg-[#202024] text-zinc-200 hover:text-white font-mono text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 self-start sm:self-auto"
            >
              <MessageCircle size={15} className="text-[#25D366]" />
              <span>Falar com o suporte</span>
              <ArrowRight size={14} className="text-[#f65a1a]" />
            </a>
          </div>

          <div className="flex flex-col divide-y divide-[#26262a] border-t border-[#26262a]">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={item.q} className="py-4">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left gap-4 cursor-pointer group"
                  >
                    <span className="text-xs sm:text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">
                      ► {item.q}
                    </span>
                    <span className="text-zinc-500 group-hover:text-[#f65a1a] transition-colors shrink-0">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="mt-2.5 pl-4 text-xs text-zinc-400 leading-relaxed font-normal animate-in fade-in duration-150">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
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

      {/* MODAL DE EDIÇÃO DE CONFIGURAÇÕES DOS PLANOS (EXCLUSIVO PARA O ADMINISTRADOR) */}
      {isAdminEditOpen && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          style={{ background: "rgba(0, 0, 0, 0.85)" }}
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
            <ModalResizeHandles
              onResizeStart={handleAdminResizeStart}
              onResetSize={handleAdminResetSize}
              accentColor="#F59E0B"
            />
            {/* Header Amplo */}
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0">
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
              {/* 1. CALCULADORA DE PORCENTAGEM SIMULTÂNEA */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-100 text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-2">
                    <span>Valores Mensais de Assinatura</span>
                    <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      Simultâneo ou Individual
                    </span>
                  </span>
                </div>

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
                    >
                      <TrendingUp size={14} />
                      <span>+ Aumentar (% digitada)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyPercent("discount")}
                      className="h-10 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
                    >
                      <TrendingDown size={14} />
                      <span>- Desconto (% digitada)</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5 pt-2.5 border-t border-white/10 w-full">
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
                            className="h-8 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-black transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
                          >
                            +{pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full">
                      <span className="text-[10px] uppercase font-bold text-rose-400 shrink-0 flex items-center gap-1 w-24">
                        <TrendingDown size={11} />
                        <span>Descontos:</span>
                      </span>
                      <div className="flex-1 grid grid-cols-7 gap-1.5 sm:gap-2 w-full">
                        {[5, 10, 15, 20, 25, 30, 50].map((pct) => (
                          <button
                            key={`dec-${pct}`}
                            type="button"
                            onClick={() => handleApplyPercent("discount", pct)}
                            className="h-8 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-black transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
                          >
                            -{pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preços Individuais dos 3 Planos */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/15 flex flex-col gap-1.5 shadow-md">
                    <span className="text-sky-400 font-extrabold text-[11px] uppercase">
                      1. Essencial (R$)
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editPriceBasico}
                      onChange={(e) => setEditPriceBasico(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 px-3 rounded-xl bg-[#08090f] border border-white/25 text-white font-black text-sm outline-none focus:border-sky-400"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black/40 border-2 border-[var(--gm-primary)] flex flex-col gap-1.5 shadow-lg">
                    <span className="text-[var(--gm-primary)] font-extrabold text-[11px] uppercase flex items-center gap-1">
                      <span>2. Criador (R$)</span>
                      <span className="text-[9px] bg-[var(--gm-primary)]/20 px-1.5 py-0.2 rounded-full">Popular</span>
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editPriceIntermediario}
                      onChange={(e) => setEditPriceIntermediario(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 px-3 rounded-xl bg-[#08090f] border border-[var(--gm-primary)] text-white font-black text-sm outline-none focus:ring-1 focus:ring-[var(--gm-primary)]"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/15 flex flex-col gap-1.5 shadow-md">
                    <span className="text-emerald-400 font-extrabold text-[11px] uppercase">
                      3. Profissional (R$)
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editPriceAvancado}
                      onChange={(e) => setEditPriceAvancado(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 px-3 rounded-xl bg-[#08090f] border border-white/25 text-white font-black text-sm outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* 2. CHAVE PIX & NOME DO RECEBEDOR */}
              <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-black/40 border border-white/15 shadow-md">
                <span className="font-extrabold text-slate-100 text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-2">
                  <QrCode size={15} className="text-emerald-400" />
                  <span>Chave Pix Oficial para Recebimento</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-300 font-bold">Chave Pix (E-mail, CPF, CNPJ ou Celular)</label>
                    <input
                      type="text"
                      value={editPixKey}
                      onChange={(e) => setEditPixKey(e.target.value)}
                      placeholder="Ex: carddigitalgm@gmail.com"
                      className="w-full h-10 px-3 rounded-xl bg-[#08090f] border border-white/25 text-white font-semibold text-xs outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-300 font-bold">Nome do Titular / Razão Social</label>
                    <input
                      type="text"
                      value={editReceiverName}
                      onChange={(e) => setEditReceiverName(e.target.value)}
                      placeholder="Ex: GM EDIFICACAO"
                      className="w-full h-10 px-3 rounded-xl bg-[#08090f] border border-white/25 text-white font-semibold text-xs outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* 3. LINKS EXTERNOS DE CHECKOUT (MERCADO PAGO / STRIPE / ASAAS) */}
              <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-black/40 border border-white/15 shadow-md">
                <span className="font-extrabold text-slate-100 text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-2">
                  <CreditCard size={15} className="text-sky-400" />
                  <span>Links de Pagamento com Cartão / Boleto (Opcional)</span>
                </span>
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-sky-300 font-bold">Link de Checkout - Plano Essencial</label>
                    <input
                      type="url"
                      value={editLinkBasico}
                      onChange={(e) => setEditLinkBasico(e.target.value)}
                      placeholder="https://mpago.la/... ou https://buy.stripe.com/..."
                      className="w-full h-10 px-3 rounded-xl bg-[#08090f] border border-white/25 text-white font-mono text-xs outline-none focus:border-sky-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-[var(--gm-primary)] font-bold">Link de Checkout - Plano Criador</label>
                    <input
                      type="url"
                      value={editLinkIntermediario}
                      onChange={(e) => setEditLinkIntermediario(e.target.value)}
                      placeholder="https://mpago.la/... ou https://buy.stripe.com/..."
                      className="w-full h-10 px-3 rounded-xl bg-[#08090f] border border-[var(--gm-primary)] text-white font-mono text-xs outline-none focus:ring-1 focus:ring-[var(--gm-primary)]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-emerald-300 font-bold">Link de Checkout - Plano Profissional</label>
                    <input
                      type="url"
                      value={editLinkAvancado}
                      onChange={(e) => setEditLinkAvancado(e.target.value)}
                      placeholder="https://mpago.la/... ou https://buy.stripe.com/..."
                      className="w-full h-10 px-3 rounded-xl bg-[#08090f] border border-white/25 text-white font-mono text-xs outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* Botão de Salvar Alterações */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsAdminEditOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAdmin}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-amber-500/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {savingAdmin ? "Salvando..." : "Salvar Configurações Globais"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Page>
  );
}
