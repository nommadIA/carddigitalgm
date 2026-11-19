import React, { useState, useEffect, useRef } from "react";
import { 
  Check, X, ShieldCheck, Sparkles, ArrowRight, Settings, QrCode, CreditCard, 
  ExternalLink, HelpCircle, Users, Award, Lock, Star, Calculator, 
  TrendingUp, TrendingDown, RotateCcw, Percent, ChevronDown, ChevronUp, ChevronRight,
  FileText, Smartphone, Bell, Flame, MessageCircle, CheckCircle2,
  Clock, Zap, Building2, Layers
} from "lucide-react";
import { Page } from "../components/ui/Page";
import { SectionDivider } from "../components/ui/SectionDivider";
import { useAuth } from "../store/AuthContext";
import { 
  PlanId, PLANS_DATA, getStoredPlansConfig, fetchPlansConfigFromCloud, 
  savePlansConfig
} from "../lib/subscriptionPlans";
import { usePlanAccess } from "../hooks/usePlanAccess";
import { supabase } from "../lib/supabase";
import { readBudgetsLocal } from "../lib/budgetsCache";
import PlanCheckoutModal from "../components/plans/PlanCheckoutModal";
import ModalResizeHandles from "../components/ui/ModalResizeHandles";
import { useModalResize } from "../hooks/useModalResize";
import { pushToast } from "../store/toast";
import { CURRENCY_FORMATTER } from "../constants";

export default function Plans() {
  const { user, tenantId, isAdmin } = useAuth();
  const { subscription, isExpired, refreshLocal, refreshCloud } = usePlanAccess();
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<PlanId | null>(null);
  const [config, setConfig] = useState(() => getStoredPlansConfig());
  const [usageStats, setUsageStats] = useState({ monthlyBudgets: 0, activeClients: 0 });

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
      const freshConfig = getStoredPlansConfig();
      setConfig(freshConfig);
    };
    syncPlans();
    void refreshCloud();

    fetchPlansConfigFromCloud(tenantId).then((cloudConfig) => {
      if (isMounted && cloudConfig) {
        setConfig(cloudConfig);
      }
    }).catch(() => {});

    // Carrega uso real de orçamentos no mês e clientes ativos para exibir progresso da cota
    async function loadUsage() {
      if (!tenantId) return;
      try {
        const now = new Date();
        const curMonth = now.getMonth();
        const curYear = now.getFullYear();

        const [budgetsRes, clientsRes] = await Promise.all([
          supabase.from("budgets").select("id, created_at, deleted_at").eq("tenant_id", tenantId),
          supabase.from("clients").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).is("deleted_at", null),
        ]);

        const rawBudgets = budgetsRes.data || readBudgetsLocal(tenantId) || [];
        const monthlyBudgets = rawBudgets.filter((b: any) => {
          if (b.deleted_at) return false;
          if (!b.created_at) return false;
          const d = new Date(b.created_at);
          return d.getMonth() === curMonth && d.getFullYear() === curYear;
        }).length;

        const activeClients = clientsRes.count ?? 0;
        if (isMounted) {
          setUsageStats({ monthlyBudgets, activeClients });
        }
      } catch {}
    }
    void loadUsage();

    window.addEventListener("gm_settings_updated", syncPlans);
    window.addEventListener("gm_plans_config_updated", syncPlans);
    return () => {
      isMounted = false;
      window.removeEventListener("gm_settings_updated", syncPlans);
      window.removeEventListener("gm_plans_config_updated", syncPlans);
    };
  }, [tenantId, user, refreshCloud]);

  useEffect(() => {
    if (!isAdminEditOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsAdminEditOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAdminEditOpen]);

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
      <div className="w-full flex flex-col gap-5 sm:gap-8 pb-16 sm:pb-20 select-text">
        {/* =========================================================================
            1. HERO BANNER FORGE DESIGN (Inspirado no Designers Hub, adaptado para GM)
           ========================================================================= */}
        <div 
          className="relative w-full rounded-xl p-4 sm:p-8 lg:p-10 border border-[#26262A] bg-[#131315] overflow-hidden"
        >
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
            <div className="flex flex-col gap-2.5 sm:gap-3 max-w-2xl min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-[4px] text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider bg-[#1B1B1E] text-[var(--gm-primary,#FE540B)] border border-[#26262A]">
                  GM Edificação • Planos Oficiais
                </span>
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-[4px] text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider bg-[#0B0B0C] text-[#8B8B92] border border-[#26262A]">
                  Construtores & Prestadores
                </span>
              </div>

              <h1 className="text-[clamp(1.325rem,3.6vw,2.3rem)] leading-[1.15] font-black text-[#F2F2F3] tracking-tight">
                Seu próximo passo profissional.
              </h1>

              <p className="text-xs sm:text-sm md:text-base text-[#8B8B92] leading-relaxed font-normal">
                Orçamentos rápidos em PDF A4 timbrado, catálogo de materiais, controle de clientes, despesas e envio no WhatsApp em 1 clique. Escolha o ritmo da sua produção.
              </p>

              <div className="flex items-center gap-x-2.5 gap-y-1 pt-1 sm:pt-2 text-[10.5px] sm:text-xs font-mono text-[#8B8B92] flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--gm-primary,#FE540B)] shrink-0" />
                  Planos mensais
                </span>
                <span className="text-[#3F3F46]">•</span>
                <span>Cancele quando quiser</span>
                <span className="text-[#3F3F46] hidden sm:inline">•</span>
                <span className="text-emerald-400 font-bold">Ativação imediata via Pix & Cartão</span>
              </div>
            </div>

            {/* Ações do Topo / Acesso ADM */}
            {isAdmin && (
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full lg:w-auto shrink-0">
                <button
                  type="button"
                  onClick={handleOpenAdminEdit}
                  className="gm-wrap-btn w-full lg:w-auto min-h-[40px] sm:h-11 px-3.5 sm:px-5 py-2 rounded-[6px] bg-[var(--gm-btn-bg,var(--gm-primary,#FE540B))] hover:brightness-110 text-[var(--gm-primary-foreground,#0B0B0C)] font-bold text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.97] transition-all cursor-pointer border border-[var(--gm-btn-border,var(--gm-primary,#FE540B))] whitespace-normal sm:whitespace-nowrap text-center leading-tight"
                >
                  <Settings size={16} className="shrink-0" />
                  <span>Configurar Planos & Preços (ADM)</span>
                </button>

                <a
                  href="/admin/usuarios"
                  className="gm-wrap-btn w-full lg:w-auto min-h-[40px] sm:h-11 px-3.5 sm:px-5 py-2 rounded-[6px] bg-[#1B1B1E] hover:bg-[#26262A] text-white font-bold text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-[#26262A] hover:border-amber-500/40 active:scale-[0.97] transition-all cursor-pointer whitespace-normal sm:whitespace-nowrap text-center leading-tight"
                >
                  <Users size={16} className="text-amber-400 shrink-0" />
                  <span>Gerenciar Usuários & Liberações</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            2. CARD DE STATUS DO PLANO ATUAL (SEU PLANO ATUAL + USO DE COTAS)
           ========================================================================= */}
        <div 
          className="w-full p-4 sm:p-6 rounded-xl border border-[#26262A] bg-[#131315] flex flex-col gap-3.5 sm:gap-5"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-md bg-[#0B0B0C] border border-[#26262A] text-[var(--gm-primary,#FE540B)] flex items-center justify-center shrink-0">
                {subscription.isSuperAdmin ? (
                  <Award size={20} className="text-amber-400" />
                ) : isExpired ? (
                  <Lock size={20} className="text-red-400" />
                ) : (
                  <CheckCircle2 size={20} className="text-[var(--gm-primary,#FE540B)]" />
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-[4px] text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider bg-[#0B0B0C] text-[#8B8B92] border border-[#26262A]">
                    SEU PLANO ATUAL
                  </span>
                  {subscription.isSuperAdmin ? (
                    <span className="px-2 py-0.5 rounded-[4px] text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Acesso Master Ilimitado
                    </span>
                  ) : subscription.status === "solicitou_liberacao" ? (
                    <span className="px-2 py-0.5 rounded-[4px] text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Aguardando Liberação ADM
                    </span>
                  ) : isExpired ? (
                    <span className="px-2 py-0.5 rounded-[4px] text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30">
                      Expirado • Bloqueado
                    </span>
                  ) : subscription.status === "teste" ? (
                    <span className="px-2 py-0.5 rounded-[4px] text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
                      Período de Teste Ativo
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-[4px] text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Assinatura Ativa
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-xl font-black text-[#F2F2F3] leading-tight">
                  {subscription.planName}
                </h3>

                <p className="text-[11px] sm:text-xs text-[#8B8B92] tabular-nums leading-relaxed">
                  {subscription.isSuperAdmin ? (
                    "Conta administrativa principal liberada com acesso permanente e irrestrito a todos os módulos."
                  ) : (
                    <>
                      Status em tempo real da sua conta •{" "}
                      {subscription.expiresAt ? (
                        <>Vencimento: <strong className="text-[#CBD5E1]">{new Date(subscription.expiresAt).toLocaleDateString("pt-BR")}</strong> • </>
                      ) : null}
                      <strong className={isExpired ? "text-red-400" : "text-[var(--gm-primary,#FE540B)]"}>
                        {subscription.daysRemaining === "ilimitado"
                          ? "Acesso Ilimitado"
                          : isExpired
                          ? "Expirado (0 dias restantes)"
                          : `${subscription.daysRemaining} dias restantes`}
                      </strong>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={() =>
                  handleOpenCheckout(
                    subscription.planId === "basico"
                      ? "intermediario"
                      : subscription.planId === "intermediario"
                      ? "avancado"
                      : "intermediario"
                  )
                }
                className="w-full md:w-auto h-9 sm:h-10 px-4 rounded-[6px] border border-[#26262A] hover:border-[#3F3F46] bg-[#1B1B1E] hover:bg-[#26262A] text-[#CBD5E1] hover:text-white font-mono text-[11px] sm:text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>{isExpired ? "Renovar assinatura" : "Gerenciar assinatura"}</span>
                <ArrowRight size={14} className="text-[var(--gm-primary,#FE540B)]" />
              </button>
            </div>
          </div>

          {/* Medidores reais de uso do plano */}
          {!subscription.isSuperAdmin && subscription.planId !== "adm" && (() => {
            const planDef = PLANS_DATA[subscription.planId] || PLANS_DATA.intermediario;
            const bLimit = planDef.maxBudgetsPerMonth;
            const cLimit = planDef.maxClients;
            const bPct = bLimit === "ilimitado" ? 100 : Math.min(100, Math.round((usageStats.monthlyBudgets / bLimit) * 100));
            const cPct = cLimit === "ilimitado" ? 100 : Math.min(100, Math.round((usageStats.activeClients / cLimit) * 100));

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-3 sm:pt-4 border-t border-[#26262A]">
                <div className="p-2.5 sm:p-3 rounded-md bg-[#0B0B0C] border border-[#26262A] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono">
                    <span className="text-[#8B8B92] uppercase font-bold">Orçamentos no mês</span>
                    <span className="font-black text-[#F2F2F3] tabular-nums">
                      {usageStats.monthlyBudgets} / {bLimit === "ilimitado" ? "∞ Ilimitado" : bLimit}
                    </span>
                  </div>
                  {bLimit !== "ilimitado" && (
                    <div className="w-full h-1.5 rounded-full bg-[#1B1B1E] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          bPct >= 100 ? "bg-red-500" : bPct >= 80 ? "bg-amber-400" : "bg-[var(--gm-primary,#FE540B)]"
                        }`}
                        style={{ width: `${bPct}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="p-2.5 sm:p-3 rounded-md bg-[#0B0B0C] border border-[#26262A] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono">
                    <span className="text-[#8B8B92] uppercase font-bold">Clientes cadastrados</span>
                    <span className="font-black text-[#F2F2F3] tabular-nums">
                      {usageStats.activeClients} / {cLimit === "ilimitado" ? "∞ Ilimitado" : cLimit}
                    </span>
                  </div>
                  {cLimit !== "ilimitado" && (
                    <div className="w-full h-1.5 rounded-full bg-[#1B1B1E] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          cPct >= 100 ? "bg-red-500" : cPct >= 80 ? "bg-amber-400" : "bg-sky-400"
                        }`}
                        style={{ width: `${cPct}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* =========================================================================
            3. OS 3 CARDS DE PLANOS — PASTAS EMPILHADAS CLICÁVEIS NO MOBILE / GRID DESKTOP
               - Essencial (Sky Folder Tab • z-10)
               - Criador (Orange Folder Tab • Mais Escolhido • z-20)
               - Profissional (Emerald Folder Tab • Acesso Total • z-30)
           ========================================================================= */}
        <div className="flex flex-col gap-1.5 xl:hidden px-0.5">
          <div className="flex items-center justify-between gap-2 text-[10.5px] font-mono uppercase tracking-wider text-[#8B8B92]">
            <span className="flex items-center gap-1.5">
              <Layers size={12} className="text-[var(--gm-primary,#FE540B)]" />
              <span>Deslize para alternar os planos</span>
            </span>
            <span className="text-[#CBD5E1] font-bold">Toque em qualquer card</span>
          </div>
        </div>

        <div className="gm-plans-stack xl:grid xl:grid-cols-3 xl:gap-6 items-stretch">
          {/* 1. PLANO ESSENCIAL (BÁSICO) */}
          <div
            role="button"
            tabIndex={0}
            data-no-scale="true"
            onClick={() => handleOpenCheckout("basico")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleOpenCheckout("basico");
              }
            }}
            aria-label={`Selecionar ${PLANS_DATA.basico.name}`}
            className="gm-plan-folder-card gm-plan-folder-card--1 flex flex-col justify-between rounded-2xl xl:rounded-xl border border-sky-500/40 hover:border-sky-400/75 bg-[#131315] relative overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            {/* Aba Superior de Pasta (Sempre visível ao empilhar no mobile) */}
            <div className="min-h-[54px] px-4 sm:px-6 py-2.5 bg-gradient-to-r from-[#0C2538] via-[#102F47] to-[#131C26] border-b border-sky-500/35 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                <span className="text-[11px] font-mono font-black uppercase tracking-wider text-sky-300 truncate">
                  01 · Essencial
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 tabular-nums">
                <span className="text-xs sm:text-sm font-black text-white">
                  R$ {config.priceBasico.toFixed(2).replace(".", ",")}
                  <span className="text-[10px] font-mono font-normal text-sky-200/80">/mês</span>
                </span>
                <ChevronRight size={15} className="text-sky-300 shrink-0" />
              </div>
            </div>

            <div className="p-4 sm:p-6 xl:p-7 flex flex-col justify-between flex-1 gap-4 sm:gap-5">
              <div className="flex flex-col gap-3.5 sm:gap-5">
                {/* Título e Subtítulo */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-sky-400">
                    PARA O DIA A DIA
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-[#F2F2F3] tracking-tight">
                    {PLANS_DATA.basico.name}
                  </h3>
                  <p className="text-xs text-[#8B8B92] leading-relaxed">
                    {PLANS_DATA.basico.tagline}
                  </p>
                </div>

                {/* Preço */}
                <div className="flex items-baseline gap-1 tabular-nums">
                  <span className="text-xs sm:text-sm font-black text-[#8B8B92]">R$</span>
                  <span className="text-3xl sm:text-4xl 2xl:text-5xl font-black text-[#F2F2F3] tracking-tight">
                    {config.priceBasico.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-xs text-[#8B8B92] font-mono">/mês</span>
                </div>
                <span className="text-[10.5px] sm:text-[11px] text-[#8B8B92] font-mono -mt-2.5 sm:-mt-3.5">
                  Assinatura mensal flexível • Clique no card para assinar
                </span>

                {/* Botão de Assinatura */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCheckout("basico");
                  }}
                  className="w-full h-10 sm:h-11 px-4 sm:px-5 rounded-[6px] border border-[#26262A] bg-[#1B1B1E] hover:bg-[#26262A] hover:border-sky-400/50 text-[#CBD5E1] hover:text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-colors duration-150 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {subscription.planId === "basico" && !isExpired ? (
                    <>
                      <Check size={17} className="text-sky-400" />
                      <span>Seu plano atual</span>
                    </>
                  ) : (
                    <>
                      <span>{subscription.planId === "basico" && isExpired ? "Renovar Essencial" : "Assinar Essencial"}</span>
                      <ArrowRight size={17} className="text-sky-400" />
                    </>
                  )}
                </button>

                <div className="w-full h-[1px] bg-[#26262A]" />

                {/* Cota Destaque */}
                <div className="flex items-baseline gap-2.5 bg-[#0B0B0C] p-2.5 sm:p-3 rounded-md border border-[#26262A] tabular-nums">
                  <span className="text-2xl sm:text-3xl font-black text-sky-400 font-mono">
                    {PLANS_DATA.basico.quotaLabel}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-[#F2F2F3] leading-tight">orçamentos por mês</span>
                    <span className="text-[10.5px] sm:text-[11px] text-[#8B8B92] font-mono">Renovação mensal da cota</span>
                  </div>
                </div>

                {/* Checklist de Recursos Incluídos */}
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <span className="text-[10.5px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-[#8B8B92]">
                    Ferramentas Incluídas
                  </span>
                  <ul className="flex flex-col gap-1.5 sm:gap-2.5 text-[11.5px] sm:text-xs text-[#CBD5E1]">
                    {PLANS_DATA.basico.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Check size={14} className="text-sky-400 shrink-0 mt-0.5 stroke-[2.5]" />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Não incluídas */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-[#26262A]">
                  <span className="text-[10.5px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-[#8B8B92]">
                    Não Incluídas no Essencial
                  </span>
                  <ul className="flex flex-col gap-1.5 text-[11px] sm:text-xs text-[#8B8B92]">
                    <li className="flex items-center gap-2">
                      <X size={13} className="text-red-400/80 shrink-0" />
                      <span>Minha Bio / Portfólio Website (Bloqueado)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <X size={13} className="text-red-400/80 shrink-0" />
                      <span>Bloco de Notas, Timbrado A4 & DRE em PDF</span>
                    </li>
                    <li className="hidden xl:flex items-center gap-2">
                      <X size={13} className="text-zinc-600 shrink-0" />
                      <span>Alarmes Multi-dispositivos & Exportação Consolidada</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Rodapé do Card */}
              <div className="border-t border-[#26262A] pt-3 sm:pt-4 mt-2 flex items-center justify-between text-[11px] sm:text-xs font-mono text-[#8B8B92]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  Pix & Cartão
                </span>
                <span className="text-emerald-400 font-bold">Ativação Imediata</span>
              </div>
            </div>
          </div>

          {/* 2. PLANO CRIADOR (INTERMEDIÁRIO - CARD PRINCIPAL / MAIS POPULAR) */}
          <div
            role="button"
            tabIndex={0}
            data-no-scale="true"
            onClick={() => handleOpenCheckout("intermediario")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleOpenCheckout("intermediario");
              }
            }}
            aria-label={`Selecionar ${PLANS_DATA.intermediario.name}`}
            className="gm-plan-folder-card gm-plan-folder-card--2 flex flex-col justify-between rounded-2xl xl:rounded-xl border-2 border-[var(--gm-primary,#FE540B)] bg-[#131315] relative overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gm-primary,#FE540B)]"
          >
            {/* Aba Superior de Pasta Laranja (Sempre visível ao empilhar no mobile) */}
            <div className="min-h-[54px] px-4 sm:px-6 py-2.5 bg-gradient-to-r from-[#451906] via-[#652408] to-[#261209] border-b border-[var(--gm-primary,#FE540B)]/55 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-mono font-black uppercase tracking-wider text-white truncate">
                  02 · Criador
                </span>
                <span className="px-1.5 py-0.5 rounded-[4px] text-[9.5px] font-mono font-black uppercase tracking-wider bg-[var(--gm-primary,#FE540B)] text-[#0B0B0C] flex items-center gap-1 shrink-0">
                  <Sparkles size={10} className="text-current" />
                  <span>Mais Escolhido</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                <span className="text-xs sm:text-sm font-black text-white">
                  R$ {config.priceIntermediario.toFixed(2).replace(".", ",")}
                  <span className="text-[10px] font-mono font-normal text-orange-200/80">/mês</span>
                </span>
                <ChevronRight size={15} className="text-[var(--gm-primary,#FE540B)] shrink-0" />
              </div>
            </div>

            <div className="p-4 sm:p-6 xl:p-7 flex flex-col justify-between flex-1 gap-4 sm:gap-5">
              <div className="flex flex-col gap-3.5 sm:gap-5">
                {/* Header do Card */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--gm-primary,#FE540B)]">
                    MAIS ESPAÇO PARA CRIAR
                  </span>
                  <h3 className="text-xl sm:text-2xl xl:text-3xl font-black text-[#F2F2F3] tracking-tight">
                    {PLANS_DATA.intermediario.name}
                  </h3>
                  <p className="text-xs text-[#CBD5E1] leading-relaxed">
                    {PLANS_DATA.intermediario.tagline}
                  </p>
                </div>

                {/* Preço */}
                <div className="flex items-baseline gap-1 tabular-nums">
                  <span className="text-xs sm:text-sm font-black text-[#CBD5E1]">R$</span>
                  <span className="text-3xl sm:text-4xl 2xl:text-5xl font-black text-[#F2F2F3] tracking-tight">
                    {config.priceIntermediario.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-xs text-[#CBD5E1] font-mono">/mês</span>
                </div>
                <span className="text-[10.5px] sm:text-[11px] text-[#8B8B92] font-mono -mt-2.5 sm:-mt-3.5">
                  Assinatura mensal mais vendida • Toque para assinar
                </span>

                {/* Botão de Ação Destacado Forge */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCheckout("intermediario");
                  }}
                  className="w-full h-10 sm:h-11 px-4 sm:px-5 rounded-[6px] border border-[var(--gm-btn-border,var(--gm-primary,#FE540B))] bg-[var(--gm-btn-bg,var(--gm-primary,#FE540B))] hover:brightness-110 text-[var(--gm-primary-foreground,#0B0B0C)] font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Check size={18} className="text-current stroke-[2.8]" />
                  <span>
                    {subscription.planId === "intermediario" && !isExpired
                      ? "Seu plano atual"
                      : subscription.planId === "intermediario" && isExpired
                      ? "Renovar Criador"
                      : "Assinar Criador"}
                  </span>
                </button>

                <div className="w-full h-[1px] bg-[#26262A]" />

                {/* Cota Destaque */}
                <div className="flex items-baseline gap-2.5 bg-[#0B0B0C] p-2.5 sm:p-3 rounded-md border border-[var(--gm-primary,#FE540B)]/35 tabular-nums">
                  <span className="text-2xl sm:text-3xl font-black text-[var(--gm-primary,#FE540B)] font-mono">
                    {PLANS_DATA.intermediario.quotaLabel}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-[#F2F2F3] leading-tight">orçamentos por mês</span>
                    <span className="text-[10.5px] sm:text-[11px] text-[#CBD5E1] font-mono">Produção ativa para o dia a dia</span>
                  </div>
                </div>

                {/* Checklist de Recursos */}
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <span className="text-[10.5px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--gm-primary,#FE540B)]">
                    Recursos Liberados
                  </span>
                  <ul className="flex flex-col gap-1.5 sm:gap-2.5 text-[11.5px] sm:text-xs text-white">
                    {PLANS_DATA.intermediario.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Check size={14} className="text-[var(--gm-primary,#FE540B)] shrink-0 mt-0.5 stroke-[3]" />
                        <span className="leading-snug font-medium">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Rodapé com badges */}
              <div className="border-t border-[#26262A] pt-3 sm:pt-4 mt-2 flex items-center justify-between text-[11px] sm:text-xs font-mono text-[#CBD5E1]">
                <span className="flex items-center gap-1.5 text-white">
                  <span className="w-2 h-2 rounded-full bg-[var(--gm-primary,#FE540B)]" />
                  Pix & Cartão
                </span>
                <span className="text-emerald-400 font-bold">Liberação na hora</span>
              </div>
            </div>
          </div>

          {/* 3. PLANO PROFISSIONAL (AVANÇADO) */}
          <div
            role="button"
            tabIndex={0}
            data-no-scale="true"
            onClick={() => handleOpenCheckout("avancado")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleOpenCheckout("avancado");
              }
            }}
            aria-label={`Selecionar ${PLANS_DATA.avancado.name}`}
            className="gm-plan-folder-card gm-plan-folder-card--3 flex flex-col justify-between rounded-2xl xl:rounded-xl border border-emerald-500/45 hover:border-emerald-400/80 bg-[#131315] relative overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {/* Aba Superior de Pasta Esmeralda (Sempre visível ao empilhar no mobile) */}
            <div className="min-h-[54px] px-4 sm:px-6 py-2.5 bg-gradient-to-r from-[#09291E] via-[#0E3B2B] to-[#11201A] border-b border-emerald-500/35 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-[11px] font-mono font-black uppercase tracking-wider text-emerald-300 truncate">
                  03 · Profissional
                </span>
                <span className="px-1.5 py-0.5 rounded-[4px] text-[9.5px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 shrink-0">
                  VIP
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                <span className="text-xs sm:text-sm font-black text-white">
                  R$ {config.priceAvancado.toFixed(2).replace(".", ",")}
                  <span className="text-[10px] font-mono font-normal text-emerald-200/80">/mês</span>
                </span>
                <ChevronRight size={15} className="text-emerald-300 shrink-0" />
              </div>
            </div>

            <div className="p-4 sm:p-6 xl:p-7 flex flex-col justify-between flex-1 gap-4 sm:gap-5">
              <div className="flex flex-col gap-3.5 sm:gap-5">
                {/* Header do Card */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                    MAIS COMPLETO • ACESSO TOTAL
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-[#F2F2F3] tracking-tight">
                    {PLANS_DATA.avancado.name}
                  </h3>
                  <p className="text-xs text-[#8B8B92] leading-relaxed">
                    {PLANS_DATA.avancado.tagline}
                  </p>
                </div>

                {/* Preço */}
                <div className="flex items-baseline gap-1 tabular-nums">
                  <span className="text-xs sm:text-sm font-black text-[#8B8B92]">R$</span>
                  <span className="text-3xl sm:text-4xl 2xl:text-5xl font-black text-[#F2F2F3] tracking-tight">
                    {config.priceAvancado.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-xs text-[#8B8B92] font-mono">/mês</span>
                </div>
                <span className="text-[10.5px] sm:text-[11px] text-[#8B8B92] font-mono -mt-2.5 sm:-mt-3.5">
                  Assinatura sem limites de produção • Toque para assinar
                </span>

                {/* Botão de Assinatura */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCheckout("avancado");
                  }}
                  className="w-full h-10 sm:h-11 px-4 sm:px-5 rounded-[6px] border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-colors duration-150 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {subscription.planId === "avancado" && !isExpired ? (
                    <>
                      <Check size={17} className="text-emerald-400" />
                      <span>Seu plano atual</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {subscription.planId === "avancado" && isExpired
                          ? "Renovar Profissional"
                          : subscription.planId !== "adm"
                          ? "Fazer Upgrade"
                          : "Assinar Profissional"}
                      </span>
                      <ArrowRight size={17} className="text-emerald-400" />
                    </>
                  )}
                </button>

                <div className="w-full h-[1px] bg-[#26262A]" />

                {/* Cota Destaque */}
                <div className="flex items-baseline gap-2.5 bg-[#0B0B0C] p-2.5 sm:p-3 rounded-md border border-[#26262A] tabular-nums">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                    {PLANS_DATA.avancado.quotaLabel}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-[#F2F2F3] leading-tight">orçamentos ilimitados</span>
                    <span className="text-[10.5px] sm:text-[11px] text-[#8B8B92] font-mono">Sem limites de cadastros</span>
                  </div>
                </div>

                {/* Checklist de Recursos */}
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <span className="text-[10.5px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                    Benefícios Exclusivos Profissional
                  </span>
                  <ul className="flex flex-col gap-1.5 sm:gap-2.5 text-[11.5px] sm:text-xs text-[#CBD5E1]">
                    {PLANS_DATA.avancado.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0 mt-0.5 stroke-[2.5]" />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Rodapé com badges */}
              <div className="border-t border-[#26262A] pt-3 sm:pt-4 mt-2 flex items-center justify-between text-[11px] sm:text-xs font-mono text-[#8B8B92]">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Tudo Ilimitado
                </span>
                <span className="text-white font-bold">Suporte VIP Prioritário</span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. GUIA INFORMATIVO: COMO ADQUIRIR E ATIVAR SEU PLANO (3 PASSOS)
           ========================================================================= */}
        <div 
          className="w-full p-4 sm:p-8 rounded-xl border border-[#26262A] bg-[#131315] flex flex-col gap-4 sm:gap-6"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[10.5px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--gm-primary,#FE540B)]">
              PROCESSO SIMPLES & SEGURO
            </span>
            <h3 className="text-base sm:text-2xl font-black text-[#F2F2F3] tracking-tight">
              Como adquirir e ativar seu plano em 3 passos
            </h3>
            <p className="text-xs text-[#8B8B92]">
              Sem burocracia. O sistema é ativado e atualizado imediatamente após a confirmação.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-md bg-[#0B0B0C] border border-[#26262A] flex flex-col gap-1.5 sm:gap-2">
              <span className="text-[11px] sm:text-xs font-mono font-black text-[var(--gm-primary,#FE540B)]">01. ESCOLHA O PLANO</span>
              <h4 className="text-xs sm:text-sm font-bold text-white">Selecione seu ritmo</h4>
              <p className="text-[11.5px] sm:text-xs text-[#8B8B92] leading-relaxed">
                Clique no card ou botão de assinatura do plano Essencial, Criador ou Profissional conforme sua demanda mensal.
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-md bg-[#0B0B0C] border border-[#26262A] flex flex-col gap-1.5 sm:gap-2">
              <span className="text-[11px] sm:text-xs font-mono font-black text-[var(--gm-primary,#FE540B)]">02. PAGAMENTO INSTANTÂNEO</span>
              <h4 className="text-xs sm:text-sm font-bold text-white">Pix ou Cartão</h4>
              <p className="text-[11.5px] sm:text-xs text-[#8B8B92] leading-relaxed">
                Pague diretamente com QR Code Pix com valor automático ou utilize seu cartão de crédito com faturamento mensal protegido.
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-md bg-[#0B0B0C] border border-[#26262A] flex flex-col gap-1.5 sm:gap-2">
              <span className="text-[11px] sm:text-xs font-mono font-black text-[var(--gm-primary,#FE540B)]">03. LIBERAÇÃO IMEDIATA</span>
              <h4 className="text-xs sm:text-sm font-bold text-white">Comece a produzir</h4>
              <p className="text-[11.5px] sm:text-xs text-[#8B8B92] leading-relaxed">
                Seu plano é validado e todas as funcionalidades correspondentes ficam prontas para você fechar propostas e gerenciar clientes.
              </p>
            </div>
          </div>

          {/* Bandeiras de Segurança */}
          <div className="flex items-center justify-between flex-wrap gap-2.5 sm:gap-4 pt-3 sm:pt-4 border-t border-[#26262A] text-[11px] sm:text-xs font-mono text-[#8B8B92]">
            <span className="flex items-center gap-1.5">
              <Lock size={13} className="text-emerald-400" />
              <span>Checkout Seguro Criptografado</span>
            </span>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="text-emerald-400 font-bold">❖ Pix Instantâneo</span>
              <span>•</span>
              <span className="text-[#009ee3] font-bold">Mercado Pago</span>
              <span>•</span>
              <span className="text-[#635bff] font-bold">Stripe</span>
              <span>•</span>
              <span>Cartão</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            5. ACORDEÃO RETRÁTIL: COMPARE OS DETALHES DE CADA PLANO
           ========================================================================= */}
        <div 
          className="w-full rounded-xl border border-[#26262A] bg-[#131315] overflow-hidden"
        >
          <button
            type="button"
            aria-expanded={isCompareOpen}
            onClick={() => setIsCompareOpen(!isCompareOpen)}
            className="w-full p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between text-left hover:bg-[#1B1B1E] transition-colors cursor-pointer gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-md bg-[#0B0B0C] border border-[#26262A] text-[var(--gm-primary,#FE540B)] flex items-center justify-center shrink-0">
                <Layers size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-lg font-black text-[#F2F2F3]">
                  Compare os detalhes
                </h3>
                <p className="text-[11px] sm:text-xs text-[#8B8B92] font-mono">
                  Veja a tabela completa do que está incluído em cada plano
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2 font-mono text-[11px] sm:text-xs text-[var(--gm-primary,#FE540B)] shrink-0 whitespace-nowrap w-full sm:w-auto pt-2 sm:pt-0 border-t border-[#26262A] sm:border-t-0">
              <span>{isCompareOpen ? "Ocultar comparativo" : "Ver comparativo"}</span>
              {isCompareOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {isCompareOpen && (
            <div className="p-4 sm:p-6 border-t border-[#26262A] overflow-x-auto">
              <table className="w-full min-w-[620px] text-xs text-left tabular-nums">
                <thead>
                  <tr className="border-b border-[#26262A] text-[#8B8B92] font-mono text-[11px] uppercase">
                    <th className="py-3 px-2">Recurso / Módulo</th>
                    <th className="py-3 px-2 text-center text-sky-400">Essencial</th>
                    <th className="py-3 px-2 text-center text-[var(--gm-primary,#FE540B)] font-bold">Criador (Popular)</th>
                    <th className="py-3 px-2 text-center text-emerald-400">Profissional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26262A] text-[#CBD5E1]">
                  <tr>
                    <td className="py-3 px-2 font-bold text-white">Cota Mensal de Orçamentos</td>
                    <td className="py-3 px-2 text-center">15 / mês</td>
                    <td className="py-3 px-2 text-center font-bold text-[var(--gm-primary,#FE540B)]">100 / mês</td>
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
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-[var(--gm-primary,#FE540B)]" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-emerald-400" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-white">Envio no WhatsApp em 1 clique</td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-sky-400" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-[var(--gm-primary,#FE540B)]" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-emerald-400" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-white">Controle de Despesas & Categorias</td>
                    <td className="py-3 px-2 text-center"><X size={15} className="mx-auto text-zinc-600" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-[var(--gm-primary,#FE540B)]" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-emerald-400" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-white">DRE & Relatórios Analíticos</td>
                    <td className="py-3 px-2 text-center"><X size={15} className="mx-auto text-zinc-600" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-[var(--gm-primary,#FE540B)]" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-emerald-400" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-white">Catálogo de Mercado & Materiais</td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-sky-400" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-[var(--gm-primary,#FE540B)]" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-emerald-400" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-white">Minha Bio / Portfólio Website</td>
                    <td className="py-3 px-2 text-center"><X size={15} className="mx-auto text-zinc-600" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-[var(--gm-primary,#FE540B)]" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-emerald-400" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-white">Exportação Consolidada PDF (Todos os Módulos)</td>
                    <td className="py-3 px-2 text-center"><X size={15} className="mx-auto text-zinc-600" /></td>
                    <td className="py-3 px-2 text-center"><X size={15} className="mx-auto text-zinc-600" /></td>
                    <td className="py-3 px-2 text-center"><Check size={16} className="mx-auto text-emerald-400" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-white">Alarmes & Notificações Push em Tempo Real</td>
                    <td className="py-3 px-2 text-center"><X size={15} className="mx-auto text-zinc-600" /></td>
                    <td className="py-3 px-2 text-center">Básico (Local)</td>
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
          className="w-full p-4 sm:p-8 rounded-xl border border-[#26262A] bg-[#131315] flex flex-col gap-4 sm:gap-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10.5px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--gm-primary,#FE540B)]">
                SEM COMPLICAÇÃO
              </span>
              <h3 className="text-base sm:text-2xl font-black text-[#F2F2F3] tracking-tight">
                Antes de escolher.
              </h3>
              <p className="text-xs text-[#8B8B92]">
                Respostas para decidir com tranquilidade.
              </p>
            </div>

            <a
              href={`https://wa.me/${config.whatsappContact}?text=Ol%C3%A1%2C+tenho+d%C3%BAvidas+sobre+os+planos+do+CardDigital+GM`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto h-9 sm:h-10 px-4 rounded-[6px] border border-[#26262A] hover:border-[#3F3F46] bg-[#1B1B1E] hover:bg-[#26262A] text-[#CBD5E1] hover:text-white font-mono text-[11px] sm:text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0 whitespace-nowrap"
            >
              <MessageCircle size={15} className="text-[#25D366]" />
              <span>Falar com o suporte</span>
              <ArrowRight size={14} className="text-[var(--gm-primary,#FE540B)]" />
            </a>
          </div>

          <div className="flex flex-col divide-y divide-[#26262A] border-t border-[#26262A]">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={item.q} className="py-3.5 sm:py-4">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left gap-3 sm:gap-4 cursor-pointer group"
                  >
                    <span className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-bold text-[#CBD5E1] group-hover:text-white transition-colors">
                      <ChevronRight size={14} className={`shrink-0 text-[var(--gm-primary,#FE540B)] transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`} />
                      <span>{item.q}</span>
                    </span>
                    <span className="text-[#8B8B92] group-hover:text-[var(--gm-primary,#FE540B)] transition-colors shrink-0">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="mt-2 sm:mt-2.5 pl-4 text-[11.5px] sm:text-xs text-[#8B8B92] leading-relaxed font-normal animate-in fade-in duration-150">
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
            refreshLocal();
            void refreshCloud();
          }}
        />
      )}

      {/* MODAL DE EDIÇÃO DE CONFIGURAÇÕES DOS PLANOS (EXCLUSIVO PARA O ADMINISTRADOR) */}
      {isAdminEditOpen && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsAdminEditOpen(false)}
        >
          <div
            ref={adminModalRef}
            role="dialog"
            aria-modal="true"
            className="w-full rounded-lg p-5 sm:p-7 relative flex flex-col gap-5 text-[#F2F2F3] bg-[#131315] border border-[#26262A] shadow-2xl select-text"
            style={{
              width: adminModalSize.width ? `min(${adminModalSize.width}px, 94vw)` : "95%",
              maxWidth: adminModalSize.width ? `min(${adminModalSize.width}px, 94vw)` : "760px",
              height: adminModalSize.height ? `min(${adminModalSize.height}px, 92vh)` : undefined,
              maxHeight: adminModalSize.height ? `min(${adminModalSize.height}px, 92vh)` : "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalResizeHandles
              onResizeStart={handleAdminResizeStart}
              onResetSize={handleAdminResetSize}
              accentColor="#F59E0B"
            />
            {/* Header Amplo */}
            <div className="flex items-center justify-between border-b border-[#26262A] pb-4 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Settings size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-black text-white leading-tight">Configurar Planos & Pagamentos</h3>
                  <p className="text-xs text-[#8B8B92] font-medium">Edite valores, chave Pix e links de checkout dos planos para todos os usuários</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminEditOpen(false)}
                className="w-8 h-8 rounded-[4px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] hover:border-[#3F3F46] text-[#8B8B92] hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                title="Fechar"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveAdminConfig} className="flex flex-col gap-5 text-xs">
              {/* 1. CALCULADORA DE PORCENTAGEM SIMULTÂNEA */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-extrabold text-[#F2F2F3] text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-2 flex-wrap">
                    <span>Valores Mensais de Assinatura</span>
                    <span className="text-[11px] text-amber-300 font-bold bg-amber-500/15 px-2.5 py-0.5 rounded-[4px] border border-amber-500/30">
                      Simultâneo ou Individual
                    </span>
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-md bg-[#0B0B0C] border border-amber-500/30 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                        <Calculator size={15} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block">
                          Calculadora Simultânea (%)
                        </span>
                        <span className="text-[11px] text-[#8B8B92] font-medium block">
                          Recalcula os 3 planos simultaneamente mantendo a proporção
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetToConfigPrices}
                      className="text-[11px] text-[#CBD5E1] hover:text-white flex items-center gap-1.5 font-semibold transition-colors cursor-pointer bg-[#1B1B1E] hover:bg-[#26262A] px-3 py-1.5 rounded-[6px] border border-[#26262A] whitespace-nowrap"
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
                        className="w-full h-10 pl-3 pr-8 rounded-[4px] bg-[#131315] border border-[#26262A] text-white font-black text-sm outline-none focus:border-amber-400 text-center tabular-nums"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-amber-400 pointer-events-none">
                        %
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyPercent("increase")}
                      className="h-10 px-4 rounded-[6px] bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                    >
                      <TrendingUp size={14} />
                      <span>+ Aumentar (% digitada)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyPercent("discount")}
                      className="h-10 px-4 rounded-[6px] bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                    >
                      <TrendingDown size={14} />
                      <span>- Desconto (% digitada)</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5 pt-2.5 border-t border-[#26262A] w-full tabular-nums">
                    <div className="flex items-center gap-2.5 w-full">
                      <span className="text-[11px] uppercase font-bold text-emerald-400 shrink-0 flex items-center gap-1 w-24">
                        <TrendingUp size={11} />
                        <span>Acréscimos:</span>
                      </span>
                      <div className="flex-1 grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2 w-full">
                        {[5, 10, 15, 20, 25, 30, 50].map((pct) => (
                          <button
                            key={`inc-${pct}`}
                            type="button"
                            onClick={() => handleApplyPercent("increase", pct)}
                            className="h-8 rounded-[4px] bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-black transition-colors cursor-pointer active:scale-95"
                          >
                            +{pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full">
                      <span className="text-[11px] uppercase font-bold text-rose-400 shrink-0 flex items-center gap-1 w-24">
                        <TrendingDown size={11} />
                        <span>Descontos:</span>
                      </span>
                      <div className="flex-1 grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2 w-full">
                        {[5, 10, 15, 20, 25, 30, 50].map((pct) => (
                          <button
                            key={`dec-${pct}`}
                            type="button"
                            onClick={() => handleApplyPercent("discount", pct)}
                            className="h-8 rounded-[4px] bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-black transition-colors cursor-pointer active:scale-95"
                          >
                            -{pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preços Individuais dos 3 Planos */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
                  <div className="p-3.5 rounded-md bg-[#0B0B0C] border border-[#26262A] flex flex-col gap-1.5">
                    <span className="text-sky-400 font-extrabold text-[11px] uppercase">
                      1. Essencial (R$)
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editPriceBasico}
                      onChange={(e) => setEditPriceBasico(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 px-3 rounded-[4px] bg-[#131315] border border-[#26262A] text-white font-black text-sm outline-none focus:border-sky-400"
                    />
                  </div>

                  <div className="p-3.5 rounded-md bg-[#0B0B0C] border-2 border-[var(--gm-primary)] flex flex-col gap-1.5">
                    <span className="text-[var(--gm-primary)] font-extrabold text-[11px] uppercase flex items-center gap-1.5">
                      <span>2. Criador (R$)</span>
                      <span className="text-[11px] bg-[var(--gm-primary)]/20 px-1.5 py-0.5 rounded-[4px]">Popular</span>
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editPriceIntermediario}
                      onChange={(e) => setEditPriceIntermediario(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 px-3 rounded-[4px] bg-[#131315] border border-[var(--gm-primary)] text-white font-black text-sm outline-none focus:ring-1 focus:ring-[var(--gm-primary)]"
                    />
                  </div>

                  <div className="p-3.5 rounded-md bg-[#0B0B0C] border border-[#26262A] flex flex-col gap-1.5">
                    <span className="text-emerald-400 font-extrabold text-[11px] uppercase">
                      3. Profissional (R$)
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editPriceAvancado}
                      onChange={(e) => setEditPriceAvancado(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 px-3 rounded-[4px] bg-[#131315] border border-[#26262A] text-white font-black text-sm outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* 2. CHAVE PIX & NOME DO RECEBEDOR */}
              <div className="flex flex-col gap-2.5 p-4 rounded-md bg-[#0B0B0C] border border-[#26262A]">
                <span className="font-extrabold text-[#F2F2F3] text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-2">
                  <QrCode size={15} className="text-emerald-400" />
                  <span>Chave Pix Oficial para Recebimento</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-[#CBD5E1] font-bold">Chave Pix (E-mail, CPF, CNPJ ou Celular)</label>
                    <input
                      type="text"
                      value={editPixKey}
                      onChange={(e) => setEditPixKey(e.target.value)}
                      placeholder="Ex: carddigitalgm@gmail.com"
                      className="w-full h-10 px-3 rounded-[4px] bg-[#131315] border border-[#26262A] text-white font-semibold text-xs outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-[#CBD5E1] font-bold">Nome do Titular / Razão Social</label>
                    <input
                      type="text"
                      value={editReceiverName}
                      onChange={(e) => setEditReceiverName(e.target.value)}
                      placeholder="Ex: GM EDIFICACAO"
                      className="w-full h-10 px-3 rounded-[4px] bg-[#131315] border border-[#26262A] text-white font-semibold text-xs outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* 3. LINKS EXTERNOS DE CHECKOUT (MERCADO PAGO / STRIPE / ASAAS) */}
              <div className="flex flex-col gap-2.5 p-4 rounded-md bg-[#0B0B0C] border border-[#26262A]">
                <span className="font-extrabold text-[#F2F2F3] text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-2">
                  <CreditCard size={15} className="text-sky-400" />
                  <span>Links de Pagamento com Cartão / Boleto (Opcional)</span>
                </span>
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-sky-300 font-bold">Link de Checkout - Plano Essencial</label>
                    <input
                      type="url"
                      value={editLinkBasico}
                      onChange={(e) => setEditLinkBasico(e.target.value)}
                      placeholder="https://mpago.la/... ou https://buy.stripe.com/..."
                      className="w-full h-10 px-3 rounded-[4px] bg-[#131315] border border-[#26262A] text-white font-mono text-xs outline-none focus:border-sky-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-[var(--gm-primary)] font-bold">Link de Checkout - Plano Criador</label>
                    <input
                      type="url"
                      value={editLinkIntermediario}
                      onChange={(e) => setEditLinkIntermediario(e.target.value)}
                      placeholder="https://mpago.la/... ou https://buy.stripe.com/..."
                      className="w-full h-10 px-3 rounded-[4px] bg-[#131315] border border-[var(--gm-primary)] text-white font-mono text-xs outline-none focus:ring-1 focus:ring-[var(--gm-primary)]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-emerald-300 font-bold">Link de Checkout - Plano Profissional</label>
                    <input
                      type="url"
                      value={editLinkAvancado}
                      onChange={(e) => setEditLinkAvancado(e.target.value)}
                      placeholder="https://mpago.la/... ou https://buy.stripe.com/..."
                      className="w-full h-10 px-3 rounded-[4px] bg-[#131315] border border-[#26262A] text-white font-mono text-xs outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* Botão de Salvar Alterações */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#26262A]">
                <button
                  type="button"
                  onClick={() => setIsAdminEditOpen(false)}
                  className="h-10 px-5 rounded-[6px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] text-[#CBD5E1] hover:text-white font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAdmin}
                  className="h-10 px-6 rounded-[6px] bg-amber-500 hover:bg-amber-400 text-[#0B0B0C] font-black text-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
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
