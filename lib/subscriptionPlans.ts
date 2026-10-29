// lib/subscriptionPlans.ts
import { isUserAdminEmail } from "../constants";
import { AppSettings, readSettingsLocal, writeSettingsLocal, upsertSettingsSupabase } from "./settings";
import { buildPixPayload } from "./pix";
import { supabase } from "./supabase";

export type PlanId = "basico" | "intermediario" | "avancado";

export interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  price: number; // em BRL
  billingCycle: string;
  buttonLabel: string;
  isPopular?: boolean;
  quotaLabel: string;
  quotaSublabel: string;
  badge?: string;
  accentColor: string;
  features: string[];
  integrationBadges: string[];
  maxBudgetsPerMonth: number | "ilimitado";
  maxClients: number | "ilimitado";
  allowPdfTimbrado: boolean;
  allowBioWebsite: boolean;
  allowRealtimeAlarms: boolean;
  allowFinancialDRE: boolean;
}

export interface PlansConfig {
  pixKey: string;
  pixType: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";
  pixReceiverName: string;
  pixCity: string;
  
  // Plataformas integradas sem mensalidade
  activeGateway: "pix" | "mercadopago" | "stripe" | "asaas";
  
  // Preços configuráveis
  priceBasico: number;
  priceIntermediario: number;
  priceAvancado: number;

  // Links de pagamento externos (Mercado Pago, Stripe, Asaas)
  linkBasico?: string;
  linkIntermediario?: string;
  linkAvancado?: string;

  // Instruções personalizadas de pagamento
  whatsappContact: string;
}

export const DEFAULT_PLANS_CONFIG: PlansConfig = {
  pixKey: "carddigitalgm@gmail.com",
  pixType: "EMAIL",
  pixReceiverName: "GM EDIFICACAO",
  pixCity: "SAO LUIS",
  activeGateway: "pix",
  priceBasico: 24.97,
  priceIntermediario: 39.97,
  priceAvancado: 79.97,
  linkBasico: "",
  linkIntermediario: "",
  linkAvancado: "",
  whatsappContact: "5598981120686"
};

export const PLANS_DATA: Record<PlanId, PlanDefinition> = {
  basico: {
    id: "basico",
    name: "Essencial",
    tagline: "O essencial para sua rotina criativa e testes.",
    price: 24.97,
    billingCycle: "Assinatura mensal",
    buttonLabel: "Começar no Essencial",
    quotaLabel: "15",
    quotaSublabel: "orçamentos por mês\nRenovação mensal da cota",
    badge: "Plano Inicial",
    accentColor: "#38bdf8",
    features: [
      "Até 15 orçamentos por mês",
      "Gestão de até 20 clientes",
      "Catálogo de serviços e produtos",
      "Exportação em PDF simples",
      "Bloco de notas pessoal",
      "Suporte via e-mail e comunidade"
    ],
    integrationBadges: ["Pix", "Mercado Pago"],
    maxBudgetsPerMonth: 15,
    maxClients: 20,
    allowPdfTimbrado: false,
    allowBioWebsite: false,
    allowRealtimeAlarms: false,
    allowFinancialDRE: false
  },
  intermediario: {
    id: "intermediario",
    name: "Criador",
    tagline: "Mais espaço para criar todos os dias com produção ativa.",
    price: 39.97,
    billingCycle: "Assinatura mensal",
    buttonLabel: "Seu plano atual",
    isPopular: true,
    quotaLabel: "100",
    quotaSublabel: "orçamentos por mês\nRenovação mensal da cota",
    badge: "Mais Popular",
    accentColor: "#FE540B",
    features: [
      "Até 100 orçamentos por mês",
      "Clientes e contatos ilimitados",
      "Exportação em Papel Timbrado A4 Oficial",
      "Envio de PDF e mensagem no WhatsApp em 1 clique",
      "Relatórios financeiros e DRE analítico",
      "Controle de despesas e categorias",
      "Catálogo de mercado e compras integrado",
      "Suporte humanizado priorizado"
    ],
    integrationBadges: ["Pix", "Mercado Pago", "Stripe"],
    maxBudgetsPerMonth: 100,
    maxClients: "ilimitado",
    allowPdfTimbrado: true,
    allowBioWebsite: true,
    allowRealtimeAlarms: true,
    allowFinancialDRE: true
  },
  avancado: {
    id: "avancado",
    name: "Profissional",
    tagline: "Mais créditos e ferramentas para uma produção intensa sem limites.",
    price: 79.97,
    billingCycle: "Assinatura mensal",
    buttonLabel: "Fazer upgrade →",
    quotaLabel: "∞",
    quotaSublabel: "orçamentos ilimitados\nProdução ilimitada sem travas",
    badge: "Acesso Total",
    accentColor: "#10b981",
    features: [
      "Orçamentos 100% ilimitados",
      "Clientes, itens e notas ilimitados",
      "Bio Link interativo com pedidos para clientes",
      "Notificações Push e alarmes de prazos em tempo real",
      "Exportação consolidada em PDF de todos os módulos",
      "Personalização total de logo, cores e visual",
      "Acesso simultâneo Smartphone e Desktop",
      "Suporte VIP prioritário direto com o desenvolvedor"
    ],
    integrationBadges: ["Pix", "Mercado Pago", "Stripe", "Asaas"],
    maxBudgetsPerMonth: "ilimitado",
    maxClients: "ilimitado",
    allowPdfTimbrado: true,
    allowBioWebsite: true,
    allowRealtimeAlarms: true,
    allowFinancialDRE: true
  }
};

export interface UserSubscriptionState {
  planId: PlanId | "adm";
  planName: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  expiresAt: string | null;
  daysRemaining: number | "ilimitado";
  activatedAt: string;
}

const STORAGE_PLAN_KEY = "gm_user_plan_state";

export const MASTER_TENANT_ID = "6f4ee596-eb5e-415f-9189-d571ad85ed95";
export const MASTER_RECORD_ID = "dd5ab0ff-3e7c-4031-9b14-c6a6eb66922f";

/**
 * Retorna as configurações dos planos do sistema salvas pelo ADM
 */
export function getStoredPlansConfig(settings?: AppSettings | null): PlansConfig {
  try {
    const s = settings || readSettingsLocal();
    const custom = 
      (s as any)?.app_plans_config || 
      (s as any)?.bio_config?.plans_config;

    if (custom && typeof custom === "object" && Object.keys(custom).length > 0) {
      return {
        ...DEFAULT_PLANS_CONFIG,
        ...custom,
        priceBasico: Number(custom.priceBasico ?? DEFAULT_PLANS_CONFIG.priceBasico),
        priceIntermediario: Number(custom.priceIntermediario ?? DEFAULT_PLANS_CONFIG.priceIntermediario),
        priceAvancado: Number(custom.priceAvancado ?? DEFAULT_PLANS_CONFIG.priceAvancado),
        linkBasico: custom.linkBasico || "",
        linkIntermediario: custom.linkIntermediario || "",
        linkAvancado: custom.linkAvancado || "",
      };
    }

    // Fallback em localStorage (chave padrão + chave master)
    const rawLocal = localStorage.getItem("gm_plans_config_v1") || localStorage.getItem("gm_plans_config_master");
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed && typeof parsed === "object") {
        return {
          ...DEFAULT_PLANS_CONFIG,
          ...parsed,
          priceBasico: Number(parsed.priceBasico ?? DEFAULT_PLANS_CONFIG.priceBasico),
          priceIntermediario: Number(parsed.priceIntermediario ?? DEFAULT_PLANS_CONFIG.priceIntermediario),
          priceAvancado: Number(parsed.priceAvancado ?? DEFAULT_PLANS_CONFIG.priceAvancado),
          linkBasico: parsed.linkBasico || "",
          linkIntermediario: parsed.linkIntermediario || "",
          linkAvancado: parsed.linkAvancado || "",
        };
      }
    }
  } catch {}
  return DEFAULT_PLANS_CONFIG;
}

/**
 * Busca ativamente a configuração de planos configurada pelo Master ADM no Supabase.
 * Isso garante que todos os usuários e clientes vejam os preços atualizados
 * e links de pagamento corretos sem depender de cache local prévio.
 */
export async function fetchPlansConfigFromCloud(tenantId?: string | null): Promise<PlansConfig> {
  try {
    // 1) Busca configurações do registro mestre oficial
    const { data: masterRow } = await supabase
      .from("app_settings")
      .select("app_plans_config, bio_config")
      .eq("tenant_id", MASTER_TENANT_ID)
      .maybeSingle();

    // 2) Se o usuário possui um tenantId específico diferente, verifica se há customização
    let customRow: any = null;
    if (tenantId && tenantId !== MASTER_TENANT_ID) {
      const { data: tenantData } = await supabase
        .from("app_settings")
        .select("app_plans_config, bio_config")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      customRow = tenantData;
    }

    const cloudPlans =
      customRow?.app_plans_config && Object.keys(customRow.app_plans_config).length > 0
        ? customRow.app_plans_config
        : (customRow?.bio_config?.plans_config && Object.keys(customRow.bio_config.plans_config).length > 0
          ? customRow.bio_config.plans_config
          : (masterRow?.app_plans_config && Object.keys(masterRow.app_plans_config).length > 0
            ? masterRow.app_plans_config
            : masterRow?.bio_config?.plans_config));

    if (cloudPlans && typeof cloudPlans === "object" && Object.keys(cloudPlans).length > 0) {
      const merged: PlansConfig = {
        ...DEFAULT_PLANS_CONFIG,
        ...cloudPlans,
        priceBasico: Number(cloudPlans.priceBasico ?? DEFAULT_PLANS_CONFIG.priceBasico),
        priceIntermediario: Number(cloudPlans.priceIntermediario ?? DEFAULT_PLANS_CONFIG.priceIntermediario),
        priceAvancado: Number(cloudPlans.priceAvancado ?? DEFAULT_PLANS_CONFIG.priceAvancado),
        linkBasico: cloudPlans.linkBasico || "",
        linkIntermediario: cloudPlans.linkIntermediario || "",
        linkAvancado: cloudPlans.linkAvancado || "",
      };

      // Atualiza caches locais
      try {
        localStorage.setItem("gm_plans_config_v1", JSON.stringify(merged));
        localStorage.setItem("gm_plans_config_master", JSON.stringify(merged));
        localStorage.setItem(`gm_plans_config_${MASTER_TENANT_ID}`, JSON.stringify(merged));
        if (tenantId) {
          localStorage.setItem(`gm_plans_config_${tenantId}`, JSON.stringify(merged));
        }
      } catch {}

      return merged;
    }
  } catch (err) {
    console.warn("Aviso ao buscar configurações de planos na nuvem:", err);
  }

  return getStoredPlansConfig();
}

/**
 * Salva as configurações de planos pelo ADM de forma resiliente
 * (Salva em LocalStorage + Supabase bio_config + Supabase app_plans_config)
 */
export async function savePlansConfig(tenantId: string | null, config: Partial<PlansConfig>): Promise<boolean> {
  try {
    const current = getStoredPlansConfig();
    const updated: PlansConfig = {
      ...current,
      ...config,
      priceBasico: Number(config.priceBasico ?? current.priceBasico),
      priceIntermediario: Number(config.priceIntermediario ?? current.priceIntermediario),
      priceAvancado: Number(config.priceAvancado ?? current.priceAvancado),
      pixKey: (config.pixKey ?? current.pixKey ?? "").trim(),
      pixReceiverName: (config.pixReceiverName ?? current.pixReceiverName ?? "").trim(),
      linkBasico: (config.linkBasico ?? current.linkBasico ?? "").trim(),
      linkIntermediario: (config.linkIntermediario ?? current.linkIntermediario ?? "").trim(),
      linkAvancado: (config.linkAvancado ?? current.linkAvancado ?? "").trim(),
    };

    // 1. Armazenamento local imediato (sempre garantido no navegador)
    try {
      localStorage.setItem("gm_plans_config_v1", JSON.stringify(updated));
      localStorage.setItem("gm_plans_config_master", JSON.stringify(updated));
      localStorage.setItem(`gm_plans_config_${MASTER_TENANT_ID}`, JSON.stringify(updated));
      if (tenantId) {
        localStorage.setItem(`gm_plans_config_${tenantId}`, JSON.stringify(updated));
      }

      // Atualiza o cache de configurações gerais para reflexão instantânea
      const tidToUpdate = tenantId || MASTER_TENANT_ID;
      const currentSettings = readSettingsLocal(tidToUpdate) || readSettingsLocal(MASTER_TENANT_ID) || {};
      const existingBio = (currentSettings?.bio_config && typeof currentSettings.bio_config === "object")
        ? currentSettings.bio_config
        : {};

      const updatedSettings: AppSettings = {
        ...currentSettings,
        app_plans_config: updated,
        bio_config: {
          ...existingBio,
          plans_config: updated,
        },
      };
      writeSettingsLocal(updatedSettings, tenantId);
      writeSettingsLocal(updatedSettings, MASTER_TENANT_ID);

      // Emite evento para que todos os componentes e telas abertas atualizem na hora
      window.dispatchEvent(new CustomEvent("gm_plans_config_updated", { detail: updated }));
      window.dispatchEvent(new CustomEvent("gm_settings_updated", { detail: updatedSettings }));
    } catch (errLocal) {
      console.warn("Aviso ao salvar localmente gm_plans_config:", errLocal);
    }

    // 2. Armazenamento na Nuvem (Supabase):
    const tidToSave = tenantId || MASTER_TENANT_ID;
    const currentSettings = readSettingsLocal(tidToSave);
    const existingBio = (currentSettings?.bio_config && typeof currentSettings.bio_config === "object")
      ? currentSettings.bio_config
      : {};

    const payload = {
      app_plans_config: updated,
      bio_config: {
        ...existingBio,
        plans_config: updated,
      },
    };

    // 2.1) Tentativa com upsertSettingsSupabase
    await upsertSettingsSupabase(tidToSave, payload as any).catch(() => {});

    // 2.2) Garantia de atualização direta no ID do registro mestre
    try {
      await supabase
        .from("app_settings")
        .update(payload)
        .eq("id", MASTER_RECORD_ID);
    } catch {}

    // 2.3) Se tidToSave for diferente do mestre, salva também no tenant mestre
    if (tidToSave !== MASTER_TENANT_ID) {
      try {
        await supabase
          .from("app_settings")
          .update(payload)
          .eq("tenant_id", MASTER_TENANT_ID);
      } catch {}
    }

    return true;
  } catch (e) {
    console.error("Erro ao salvar configurações dos planos:", e);
    return true;
  }
}

/**
 * Retorna o plano ativo do usuário autenticado
 * Se for o email do ADM (gmedificação@gmail.com / gmedificacao@gmail.com), retorna status MASTER ILIMITADO
 */
export function getUserSubscription(tenantId?: string | null, userEmail?: string | null): UserSubscriptionState {
  const isAdmin = isUserAdminEmail(userEmail);

  if (isAdmin) {
    return {
      planId: "adm",
      planName: "Administrador Master",
      isActive: true,
      isSuperAdmin: true,
      expiresAt: null,
      daysRemaining: "ilimitado",
      activatedAt: new Date().toISOString()
    };
  }

  // Busca plano salvo no dispositivo para o tenant
  try {
    const tid = tenantId || "default";
    const raw = localStorage.getItem(`${STORAGE_PLAN_KEY}_${tid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.planId) {
        return {
          planId: parsed.planId,
          planName: PLANS_DATA[parsed.planId as PlanId]?.name || "Criador",
          isActive: true,
          isSuperAdmin: false,
          expiresAt: parsed.expiresAt || null,
          daysRemaining: parsed.daysRemaining || 30,
          activatedAt: parsed.activatedAt || new Date().toISOString()
        };
      }
    }
  } catch {}

  // Padrão para novos usuários em teste: Plano Criador (Intermediário - 30 dias de cortesia)
  return {
    planId: "intermediario",
    planName: "Criador (Período de Testes)",
    isActive: true,
    isSuperAdmin: false,
    expiresAt: null,
    daysRemaining: 30,
    activatedAt: new Date().toISOString()
  };
}

/**
 * Atualiza o plano de um tenant
 */
export function setUserSubscription(
  tenantId: string | null,
  planId: PlanId | "adm",
  durationDays = 30
): UserSubscriptionState {
  const tid = tenantId || "default";
  const now = new Date();
  const expires = new Date();
  expires.setDate(now.getDate() + durationDays);

  const state: UserSubscriptionState = {
    planId,
    planName: planId === "adm" ? "Administrador Master" : PLANS_DATA[planId].name,
    isActive: true,
    isSuperAdmin: planId === "adm",
    expiresAt: expires.toISOString(),
    daysRemaining: durationDays,
    activatedAt: now.toISOString()
  };

  try {
    localStorage.setItem(`${STORAGE_PLAN_KEY}_${tid}`, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("gm_plan_updated", { detail: state }));
  } catch {}

  return state;
}

/**
 * Gera o código Pix Copia e Cola formatado para o plano escolhido
 */
export function generatePlanPixPayment(planId: PlanId, config?: PlansConfig): {
  payload: string;
  amount: number;
  planName: string;
  pixKey: string;
} {
  const cfg = config || DEFAULT_PLANS_CONFIG;
  const plan = PLANS_DATA[planId];
  
  let amount = cfg.priceIntermediario;
  if (planId === "basico") amount = cfg.priceBasico;
  if (planId === "avancado") amount = cfg.priceAvancado;

  try {
    const payload = buildPixPayload({
      pixKey: cfg.pixKey,
      merchantName: cfg.pixReceiverName || "GM EDIFICACAO",
      merchantCity: cfg.pixCity || "SAO LUIS",
      amount,
      txid: `PLANO${planId.toUpperCase().slice(0, 5)}`,
      message: `Assinatura Plano ${plan.name} - App GM`
    });

    return {
      payload,
      amount,
      planName: plan.name,
      pixKey: cfg.pixKey
    };
  } catch {
    // Fallback simples com a chave Pix pura caso a formatação falhe
    return {
      payload: cfg.pixKey,
      amount,
      planName: plan.name,
      pixKey: cfg.pixKey
    };
  }
}
