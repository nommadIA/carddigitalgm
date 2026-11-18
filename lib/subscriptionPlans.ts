// lib/subscriptionPlans.ts
import { isUserAdminEmail } from "../constants";
import { AppSettings, readSettingsLocal, writeSettingsLocal, upsertSettingsSupabase } from "./settings";
import { buildPixPayload } from "./pix";
import { supabase } from "./supabase";

export type PlanId = "basico" | "intermediario" | "avancado";
export type SubscriptionStatus = "teste" | "solicitou_liberacao" | "ativo" | "expirado" | "adm";

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
  maxExpensesPerMonth: number | "ilimitado";
  maxMarketItems: number | "ilimitado";
  maxNotes: number | "ilimitado";
  allowPdfTimbrado: boolean;
  allowBioWebsite: boolean;
  allowExpenses: boolean;
  allowExpensesRecurringImport: boolean;
  allowMarket: boolean;
  allowNotes: boolean;
  allowWhatsapp: boolean;
  allowFinancialDRE: boolean;
  allowFinanceExport: boolean;
  allowAlarms: boolean;
  allowRealtimeAlarms: boolean;
  allowConsolidatedPdf: boolean;
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
  whatsappContact: "5598981120686",
};

export const PLANS_DATA: Record<PlanId, PlanDefinition> = {
  basico: {
    id: "basico",
    name: "Essencial",
    tagline: "O essencial de forma reduzida para orçamentos, clientes, despesas e financeiro.",
    price: 24.97,
    billingCycle: "Assinatura mensal",
    buttonLabel: "Assinar Essencial",
    quotaLabel: "15",
    quotaSublabel: "orçamentos por mês\nRenovação mensal da cota",
    badge: "Plano Inicial",
    accentColor: "#38bdf8",
    features: [
      "Até 15 orçamentos por mês (PDF simples)",
      "Gestão reduzida de até 20 clientes ativos",
      "Despesas reduzidas (até 15 lançamentos/mês)",
      "Mercado reduzido (até 15 itens na lista)",
      "Resumo Financeiro mensal básico",
      "Envio no WhatsApp em 1 clique",
    ],
    integrationBadges: ["Pix", "Mercado Pago"],
    maxBudgetsPerMonth: 15,
    maxClients: 20,
    maxExpensesPerMonth: 15,
    maxMarketItems: 15,
    maxNotes: 0,
    allowPdfTimbrado: false,
    allowBioWebsite: false,
    allowExpenses: true,
    allowExpensesRecurringImport: false,
    allowMarket: true,
    allowNotes: false,
    allowWhatsapp: true,
    allowFinancialDRE: true,
    allowFinanceExport: false,
    allowAlarms: false,
    allowRealtimeAlarms: false,
    allowConsolidatedPdf: false,
  },
  intermediario: {
    id: "intermediario",
    name: "Criador",
    tagline: "Mais espaço para criar com todos os módulos ativos em capacidade intermediária.",
    price: 39.97,
    billingCycle: "Assinatura mensal",
    buttonLabel: "Assinar Criador",
    isPopular: true,
    quotaLabel: "100",
    quotaSublabel: "orçamentos por mês\nRenovação mensal da cota",
    badge: "Mais Popular",
    accentColor: "#FE540B",
    features: [
      "Até 100 orçamentos por mês",
      "Gestão de até 150 clientes ativos",
      "Papel Timbrado A4 Oficial nos orçamentos",
      "Notas e Produção liberadas (até 30 notas)",
      "Despesas (até 60/mês) e Mercado (até 50 itens)",
      "Relatórios Financeiros, DRE e salvamento mensal",
      "Minha Bio / Portfólio Website liberada",
      "Alarmes locais no navegador e WhatsApp 1 clique",
    ],
    integrationBadges: ["Pix", "Mercado Pago", "Stripe"],
    maxBudgetsPerMonth: 100,
    maxClients: 150,
    maxExpensesPerMonth: 60,
    maxMarketItems: 50,
    maxNotes: 30,
    allowPdfTimbrado: true,
    allowBioWebsite: true,
    allowExpenses: true,
    allowExpensesRecurringImport: true,
    allowMarket: true,
    allowNotes: true,
    allowWhatsapp: true,
    allowFinancialDRE: true,
    allowFinanceExport: true,
    allowAlarms: true,
    allowRealtimeAlarms: false,
    allowConsolidatedPdf: false,
  },
  avancado: {
    id: "avancado",
    name: "Profissional",
    tagline: "100% dos recursos, módulos, alarmes em tempo real multi-dispositivos e cotas ilimitadas.",
    price: 79.97,
    billingCycle: "Assinatura mensal",
    buttonLabel: "Fazer upgrade →",
    quotaLabel: "∞",
    quotaSublabel: "orçamentos ilimitados\nProdução ilimitada sem travas",
    badge: "Acesso Total",
    accentColor: "#10b981",
    features: [
      "100% dos módulos e recursos liberados sem limites",
      "Orçamentos, clientes, despesas, mercado e notas ilimitados",
      "Minha Bio / Portfólio Website completo e ilimitado",
      "Notificações Push e alarmes em tempo real multi-dispositivos",
      "Exportação consolidada em PDF de todos os módulos",
      "Papel Timbrado A4 e Relatório DRE completo",
      "Personalização total de logo, cores e visual",
      "Suporte VIP prioritário direto com o desenvolvedor",
    ],
    integrationBadges: ["Pix", "Mercado Pago", "Stripe", "Asaas"],
    maxBudgetsPerMonth: "ilimitado",
    maxClients: "ilimitado",
    maxExpensesPerMonth: "ilimitado",
    maxMarketItems: "ilimitado",
    maxNotes: "ilimitado",
    allowPdfTimbrado: true,
    allowBioWebsite: true,
    allowExpenses: true,
    allowExpensesRecurringImport: true,
    allowMarket: true,
    allowNotes: true,
    allowWhatsapp: true,
    allowFinancialDRE: true,
    allowFinanceExport: true,
    allowAlarms: true,
    allowRealtimeAlarms: true,
    allowConsolidatedPdf: true,
  },
};

export interface UserSubscriptionState {
  planId: PlanId | "adm";
  planName: string;
  status: SubscriptionStatus;
  isActive: boolean;
  isSuperAdmin: boolean;
  expiresAt: string | null;
  daysRemaining: number | "ilimitado";
  activatedAt: string;
  requestedPlanId?: PlanId | null;
  notes?: string | null;
}

const STORAGE_PLAN_KEY = "gm_user_plan_state";

export const MASTER_TENANT_ID = "6f4ee596-eb5e-415f-9189-d571ad85ed95";
export const MASTER_RECORD_ID = "dd5ab0ff-3e7c-4031-9b14-c6a6eb66922f";

export function normalizePlanId(raw?: string | null): PlanId | "adm" {
  const val = String(raw || "").toLowerCase().trim();
  if (val === "adm" || val === "admin" || val === "master") return "adm";
  if (val === "basico" || val === "essencial" || val === "basic") return "basico";
  if (val === "avancado" || val === "profissional" || val === "pro" || val === "enterprise") return "avancado";
  return "intermediario";
}

function getEmailStorageKey(email?: string | null): string | null {
  const clean = String(email || "").trim().toLowerCase();
  return clean ? `${STORAGE_PLAN_KEY}_email_${clean}` : null;
}

export function computeSubscriptionSnapshot(raw: {
  planId?: string | null;
  planName?: string | null;
  status?: string | null;
  isActive?: boolean;
  expiresAt?: string | null;
  daysRemaining?: number | "ilimitado" | null;
  activatedAt?: string | null;
  requestedPlanId?: PlanId | null;
  notes?: string | null;
  userEmail?: string | null;
}): UserSubscriptionState {
  if (isUserAdminEmail(raw.userEmail) || raw.planId === "adm" || raw.status === "adm") {
    return {
      planId: "adm",
      planName: "Administrador Master",
      status: "adm",
      isActive: true,
      isSuperAdmin: true,
      expiresAt: null,
      daysRemaining: "ilimitado",
      activatedAt: raw.activatedAt || new Date().toISOString(),
      requestedPlanId: null,
      notes: raw.notes || null,
    };
  }

  const planId = normalizePlanId(raw.planId) as PlanId;
  const statusRaw = String(raw.status || "").toLowerCase().trim();
  let status: SubscriptionStatus =
    statusRaw === "ativo" || statusRaw === "active"
      ? "ativo"
      : statusRaw === "expirado" || statusRaw === "expired" || statusRaw === "blocked"
      ? "expirado"
      : statusRaw === "solicitou_liberacao" || statusRaw === "pending"
      ? "solicitou_liberacao"
      : "teste";

  let daysRemaining = typeof raw.daysRemaining === "number" ? raw.daysRemaining : 7;
  let isActive = raw.isActive !== false;

  if (status === "expirado") {
    daysRemaining = 0;
    isActive = false;
  } else if (raw.expiresAt) {
    const expiresDate = new Date(raw.expiresAt);
    if (!Number.isNaN(expiresDate.getTime())) {
      const diffMs = expiresDate.getTime() - Date.now();
      const calculatedDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(0, calculatedDays);
      isActive = daysRemaining > 0;
      if (daysRemaining <= 0 && status !== "solicitou_liberacao") {
        status = "expirado";
      }
    }
  } else if (status === "solicitou_liberacao") {
    // Sem data de expiração válida e aguardando liberação -> bloqueado até aprovação do ADM
    daysRemaining = 0;
    isActive = false;
  }

  const baseName = PLANS_DATA[planId]?.name || "Criador";
  const planName =
    raw.planName ||
    (status === "teste" ? `${baseName} (Teste ${daysRemaining}d)` : status === "expirado" ? `${baseName} (Expirado)` : baseName);

  return {
    planId,
    planName,
    status,
    isActive,
    isSuperAdmin: false,
    expiresAt: raw.expiresAt || null,
    daysRemaining,
    activatedAt: raw.activatedAt || new Date().toISOString(),
    requestedPlanId: raw.requestedPlanId || null,
    notes: raw.notes || null,
  };
}

export function saveLocalUserSubscription(
  state: UserSubscriptionState,
  tenantId?: string | null,
  userEmail?: string | null
): void {
  try {
    const tid = tenantId || "default";
    const serialized = JSON.stringify(state);
    localStorage.setItem(`${STORAGE_PLAN_KEY}_${tid}`, serialized);
    const emailKey = getEmailStorageKey(userEmail);
    if (emailKey) {
      localStorage.setItem(emailKey, serialized);
    }
    window.dispatchEvent(new CustomEvent("gm_plan_updated", { detail: state }));
  } catch {}
}

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
 */
export async function fetchPlansConfigFromCloud(tenantId?: string | null): Promise<PlansConfig> {
  try {
    const { data: masterRow } = await supabase
      .from("app_settings")
      .select("app_plans_config, bio_config")
      .eq("tenant_id", MASTER_TENANT_ID)
      .maybeSingle();

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
        : customRow?.bio_config?.plans_config && Object.keys(customRow.bio_config.plans_config).length > 0
        ? customRow.bio_config.plans_config
        : masterRow?.app_plans_config && Object.keys(masterRow.app_plans_config).length > 0
        ? masterRow.app_plans_config
        : masterRow?.bio_config?.plans_config;

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

    try {
      localStorage.setItem("gm_plans_config_v1", JSON.stringify(updated));
      localStorage.setItem("gm_plans_config_master", JSON.stringify(updated));
      localStorage.setItem(`gm_plans_config_${MASTER_TENANT_ID}`, JSON.stringify(updated));
      if (tenantId) {
        localStorage.setItem(`gm_plans_config_${tenantId}`, JSON.stringify(updated));
      }

      const tidToUpdate = tenantId || MASTER_TENANT_ID;
      const currentSettings = readSettingsLocal(tidToUpdate) || readSettingsLocal(MASTER_TENANT_ID) || {};
      const existingBio =
        currentSettings?.bio_config && typeof currentSettings.bio_config === "object"
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

      window.dispatchEvent(new CustomEvent("gm_plans_config_updated", { detail: updated }));
      window.dispatchEvent(new CustomEvent("gm_settings_updated", { detail: updatedSettings }));
    } catch (errLocal) {
      console.warn("Aviso ao salvar localmente gm_plans_config:", errLocal);
    }

    const tidToSave = tenantId || MASTER_TENANT_ID;
    const currentSettings = readSettingsLocal(tidToSave);
    const existingBio =
      currentSettings?.bio_config && typeof currentSettings.bio_config === "object"
        ? currentSettings.bio_config
        : {};
    const existingPlansObj =
      (currentSettings as any)?.app_plans_config && typeof (currentSettings as any).app_plans_config === "object"
        ? (currentSettings as any).app_plans_config
        : {};

    const mergedPlansConfig = {
      ...existingPlansObj,
      ...updated,
    };

    const payload = {
      app_plans_config: mergedPlansConfig,
      bio_config: {
        ...existingBio,
        plans_config: updated,
      },
    };

    await upsertSettingsSupabase(tidToSave, payload as any).catch(() => {});

    try {
      await supabase.from("app_settings").update(payload).eq("id", MASTER_RECORD_ID);
    } catch {}

    if (tidToSave !== MASTER_TENANT_ID) {
      try {
        await supabase.from("app_settings").update(payload).eq("tenant_id", MASTER_TENANT_ID);
      } catch {}
    }

    return true;
  } catch (e) {
    console.error("Erro ao salvar configurações dos planos:", e);
    return true;
  }
}

/**
 * Retorna o plano ativo do usuário autenticado (com prioridade para e-mail / registro mestre / tenant cache)
 */
export function getUserSubscription(tenantId?: string | null, userEmail?: string | null): UserSubscriptionState {
  const isAdmin = isUserAdminEmail(userEmail);

  if (isAdmin) {
    return computeSubscriptionSnapshot({
      planId: "adm",
      status: "adm",
      userEmail,
    });
  }

  const cleanEmail = String(userEmail || "").trim().toLowerCase();

  // 1) Verifica cache por e-mail e por tenant
  try {
    const emailKey = getEmailStorageKey(cleanEmail);
    const tid = tenantId || "default";
    const raw = (emailKey ? localStorage.getItem(emailKey) : null) || localStorage.getItem(`${STORAGE_PLAN_KEY}_${tid}`);

    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.planId) {
        return computeSubscriptionSnapshot({ ...parsed, userEmail });
      }
    }

    // 2) Fallback: verifica registro local consolidado de usuários do ADM
    const registryRaw = localStorage.getItem("gm_users_registry_v1");
    if (registryRaw && (cleanEmail || tenantId)) {
      const registry = JSON.parse(registryRaw);
      if (Array.isArray(registry)) {
        const found = registry.find(
          (u: any) =>
            (cleanEmail && String(u.email || "").toLowerCase() === cleanEmail) ||
            (tenantId && u.tenantId === tenantId)
        );
        if (found) {
          const snap = computeSubscriptionSnapshot({
            planId: found.planId,
            planName: found.planName,
            status: found.status,
            expiresAt: found.expiresAt,
            daysRemaining: found.daysRemaining,
            activatedAt: found.createdAt,
            requestedPlanId: found.requestedPlanId,
            notes: found.notes,
            userEmail,
          });
          return snap;
        }
      }
    }
  } catch {}

  // 3) Padrão para novos usuários em teste: Plano Criador (7 dias de teste grátis)
  const activatedDate = new Date();
  const trialExpiresDate = new Date();
  trialExpiresDate.setDate(activatedDate.getDate() + 7);

  const initialTrialState = computeSubscriptionSnapshot({
    planId: "intermediario",
    planName: "Criador (Teste 7 Dias)",
    status: "teste",
    isActive: true,
    expiresAt: trialExpiresDate.toISOString(),
    daysRemaining: 7,
    activatedAt: activatedDate.toISOString(),
    userEmail,
  });

  try {
    const tid = tenantId || "default";
    localStorage.setItem(`${STORAGE_PLAN_KEY}_${tid}`, JSON.stringify(initialTrialState));
    const emailKey = getEmailStorageKey(cleanEmail);
    if (emailKey) {
      localStorage.setItem(emailKey, JSON.stringify(initialTrialState));
    }
  } catch {}

  return initialTrialState;
}

/**
 * Sincroniza ativamente o plano do usuário com o Supabase (`public.subscriptions` + `app_settings.users_registry`)
 */
export async function syncUserSubscriptionFromCloud(
  tenantId?: string | null,
  userEmail?: string | null
): Promise<UserSubscriptionState> {
  if (isUserAdminEmail(userEmail)) {
    return getUserSubscription(tenantId, userEmail);
  }

  const cleanEmail = String(userEmail || "").trim().toLowerCase();
  if (!cleanEmail && !tenantId) {
    return getUserSubscription(tenantId, userEmail);
  }

  let cloudRecord: any = null;

  try {
    // 1) Consulta tabela dedicada public.subscriptions
    if (cleanEmail) {
      const { data: subByEmail } = await supabase
        .from("subscriptions")
        .select("*")
        .ilike("user_email", cleanEmail)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subByEmail) cloudRecord = subByEmail;
    }

    if (!cloudRecord && tenantId) {
      const { data: subByTenant } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subByTenant) cloudRecord = subByTenant;
    }
  } catch {}

  try {
    // 2) Consulta users_registry no registro mestre app_settings (fonte do painel ADM /admin/usuarios)
    const { data: masterRow } = await supabase
      .from("app_settings")
      .select("app_plans_config")
      .eq("id", MASTER_RECORD_ID)
      .maybeSingle();

    const registry = masterRow?.app_plans_config?.users_registry;
    if (Array.isArray(registry)) {
      try {
        localStorage.setItem("gm_users_registry_v1", JSON.stringify(registry));
      } catch {}

      const foundInRegistry = registry.find(
        (u: any) =>
          (cleanEmail && String(u.email || "").toLowerCase() === cleanEmail) ||
          (tenantId && u.tenantId === tenantId)
      );

      if (foundInRegistry) {
        const regTime = new Date(
          masterRow?.app_plans_config?.users_registry_updated_at || foundInRegistry.createdAt || 0
        ).getTime();
        const subTime = new Date(cloudRecord?.updated_at || cloudRecord?.created_at || 0).getTime();

        if (!cloudRecord || regTime >= subTime) {
          cloudRecord = {
            plan_id: foundInRegistry.planId,
            plan_name: foundInRegistry.planName,
            status: foundInRegistry.status,
            expires_at: foundInRegistry.expiresAt,
            days_remaining: foundInRegistry.daysRemaining,
            starts_at: foundInRegistry.createdAt,
            requested_plan_id: foundInRegistry.requestedPlanId,
            notes: foundInRegistry.notes,
          };
        }
      }
    }
  } catch {}

  if (cloudRecord) {
    const synced = computeSubscriptionSnapshot({
      planId: cloudRecord.plan_id,
      planName: cloudRecord.plan_name,
      status: cloudRecord.status,
      expiresAt: cloudRecord.expires_at,
      daysRemaining: cloudRecord.days_remaining,
      activatedAt: cloudRecord.starts_at || cloudRecord.created_at,
      requestedPlanId: cloudRecord.requested_plan_id,
      notes: cloudRecord.notes,
      userEmail: cleanEmail,
    });
    saveLocalUserSubscription(synced, tenantId, cleanEmail);
    return synced;
  }

  return getUserSubscription(tenantId, userEmail);
}

/**
 * Atualiza o plano de um tenant localmente e emite evento
 */
export function setUserSubscription(
  tenantId: string | null,
  planId: PlanId | "adm",
  durationDays = 30,
  userEmail?: string | null
): UserSubscriptionState {
  const now = new Date();
  const expires = new Date();
  expires.setDate(now.getDate() + durationDays);

  const state = computeSubscriptionSnapshot({
    planId,
    planName: planId === "adm" ? "Administrador Master" : PLANS_DATA[planId].name,
    status: planId === "adm" ? "adm" : "ativo",
    isActive: true,
    expiresAt: planId === "adm" ? null : expires.toISOString(),
    daysRemaining: planId === "adm" ? "ilimitado" : durationDays,
    activatedAt: now.toISOString(),
    userEmail,
  });

  saveLocalUserSubscription(state, tenantId, userEmail);
  return state;
}

export type FeatureKey =
  | "budgets"
  | "clients"
  | "expenses"
  | "expenses_recurring"
  | "market"
  | "notes"
  | "financial"
  | "finance_export"
  | "bio"
  | "pdf_timbrado"
  | "whatsapp"
  | "alarms"
  | "realtime_alarms"
  | "consolidated_pdf";

export type QuotaKey =
  | "budgets_monthly"
  | "clients"
  | "expenses_monthly"
  | "market_items"
  | "notes";

/**
 * Verifica se o usuário tem permissão para acessar determinado recurso do app
 */
export function checkFeatureAccess(
  subscription: UserSubscriptionState,
  feature: FeatureKey
): {
  allowed: boolean;
  requiredPlan: PlanId;
  reason?: string;
} {
  if (subscription.isSuperAdmin || subscription.planId === "adm") {
    return { allowed: true, requiredPlan: "basico" };
  }

  if (
    !subscription.isActive ||
    subscription.status === "expirado" ||
    (typeof subscription.daysRemaining === "number" && subscription.daysRemaining <= 0)
  ) {
    const isPending = subscription.status === "solicitou_liberacao";
    return {
      allowed: false,
      requiredPlan: "intermediario",
      reason: isPending
        ? "Sua solicitação de liberação está em análise. Assim que for aprovada, o acesso será liberado automaticamente."
        : "Sua assinatura ou período de teste de 7 dias expirou. Renove ou escolha um plano na tela de Planos para continuar utilizando.",
    };
  }

  const currentPlan = normalizePlanId(subscription.planId) as PlanId;
  const planDef = PLANS_DATA[currentPlan] || PLANS_DATA.intermediario;

  switch (feature) {
    case "expenses":
      if (!planDef.allowExpenses) {
        return {
          allowed: false,
          requiredPlan: "basico",
          reason: "O módulo Despesas requer um plano ativo.",
        };
      }
      return { allowed: true, requiredPlan: "basico" };

    case "expenses_recurring":
      if (!planDef.allowExpensesRecurringImport) {
        return {
          allowed: false,
          requiredPlan: "intermediario",
          reason: "A importação automática de despesas recorrentes está disponível a partir do Plano Criador.",
        };
      }
      return { allowed: true, requiredPlan: "intermediario" };

    case "financial":
      if (!planDef.allowFinancialDRE) {
        return {
          allowed: false,
          requiredPlan: "basico",
          reason: "O módulo Financeiro requer um plano ativo.",
        };
      }
      return { allowed: true, requiredPlan: "basico" };

    case "finance_export":
      if (!planDef.allowFinanceExport) {
        return {
          allowed: false,
          requiredPlan: "intermediario",
          reason: "A exportação em PDF do DRE e o salvamento de histórico financeiro mensal estão disponíveis a partir do Plano Criador.",
        };
      }
      return { allowed: true, requiredPlan: "intermediario" };

    case "bio":
      if (!planDef.allowBioWebsite) {
        return {
          allowed: false,
          requiredPlan: "intermediario",
          reason: "A Minha Bio / Portfólio Website está bloqueada no Plano Essencial. Faça upgrade para o Plano Criador ou Profissional.",
        };
      }
      return { allowed: true, requiredPlan: "intermediario" };

    case "notes":
      if (!planDef.allowNotes) {
        return {
          allowed: false,
          requiredPlan: "intermediario",
          reason: "O módulo Notas e Produção está bloqueado no Plano Essencial. Faça upgrade para o Plano Criador ou Profissional.",
        };
      }
      return { allowed: true, requiredPlan: "intermediario" };

    case "pdf_timbrado":
      if (!planDef.allowPdfTimbrado) {
        return {
          allowed: false,
          requiredPlan: "intermediario",
          reason: "A exportação e personalização de Papel Timbrado A4 Oficial exigem o Plano Criador ou Profissional.",
        };
      }
      return { allowed: true, requiredPlan: "intermediario" };

    case "alarms":
      if (!planDef.allowAlarms) {
        return {
          allowed: false,
          requiredPlan: "intermediario",
          reason: "Alarmes e lembretes programados de prazos estão disponíveis a partir do Plano Criador.",
        };
      }
      return { allowed: true, requiredPlan: "intermediario" };

    case "realtime_alarms":
      if (!planDef.allowRealtimeAlarms) {
        return {
          allowed: false,
          requiredPlan: "avancado",
          reason: "Notificações Push remotas e alarmes em tempo real multi-dispositivos são exclusivos do Plano Profissional.",
        };
      }
      return { allowed: true, requiredPlan: "avancado" };

    case "consolidated_pdf":
      if (!planDef.allowConsolidatedPdf) {
        return {
          allowed: false,
          requiredPlan: "avancado",
          reason: "A exportação consolidada em PDF de todos os módulos é exclusiva do Plano Profissional.",
        };
      }
      return { allowed: true, requiredPlan: "avancado" };

    case "market":
      if (!planDef.allowMarket) {
        return {
          allowed: false,
          requiredPlan: "basico",
          reason: "O módulo Mercado requer um plano ativo.",
        };
      }
      return { allowed: true, requiredPlan: "basico" };

    case "whatsapp":
      if (!planDef.allowWhatsapp) {
        return {
          allowed: false,
          requiredPlan: "basico",
          reason: "O envio via WhatsApp requer um plano ativo.",
        };
      }
      return { allowed: true, requiredPlan: "basico" };

    case "budgets":
    case "clients":
    default:
      return { allowed: true, requiredPlan: "basico" };
  }
}

/**
 * Verifica se o usuário atingiu a cota numérica do seu plano (Orçamentos, Clientes, Despesas, Mercado ou Notas)
 */
export function checkQuotaAccess(
  subscription: UserSubscriptionState,
  quotaType: QuotaKey,
  currentCount: number
): {
  allowed: boolean;
  limit: number | "ilimitado";
  current: number;
  requiredPlan: PlanId;
  reason?: string;
} {
  if (subscription.isSuperAdmin || subscription.planId === "adm") {
    return {
      allowed: true,
      limit: "ilimitado",
      current: currentCount,
      requiredPlan: "basico",
    };
  }

  if (
    !subscription.isActive ||
    subscription.status === "expirado" ||
    (typeof subscription.daysRemaining === "number" && subscription.daysRemaining <= 0)
  ) {
    return {
      allowed: false,
      limit: 0,
      current: currentCount,
      requiredPlan: "intermediario",
      reason: "Sua assinatura ou período de teste expirou. Renove ou escolha um plano na tela de Planos para continuar.",
    };
  }

  const currentPlan = normalizePlanId(subscription.planId) as PlanId;
  const planDef = PLANS_DATA[currentPlan] || PLANS_DATA.intermediario;
  const nextPlan: PlanId = currentPlan === "basico" ? "intermediario" : "avancado";

  if (quotaType === "budgets_monthly") {
    const limit = planDef.maxBudgetsPerMonth;
    if (limit === "ilimitado") {
      return { allowed: true, limit: "ilimitado", current: currentCount, requiredPlan: "avancado" };
    }
    if (currentCount >= limit) {
      return {
        allowed: false,
        limit,
        current: currentCount,
        requiredPlan: nextPlan,
        reason: `Você atingiu o limite de ${limit} orçamentos neste mês no Plano ${planDef.name}. Faça upgrade para o Plano ${PLANS_DATA[nextPlan].name} para continuar emitindo.`,
      };
    }
    return { allowed: true, limit, current: currentCount, requiredPlan: currentPlan };
  }

  if (quotaType === "expenses_monthly") {
    const limit = planDef.maxExpensesPerMonth;
    if (limit === "ilimitado") {
      return { allowed: true, limit: "ilimitado", current: currentCount, requiredPlan: "avancado" };
    }
    if (currentCount >= limit) {
      return {
        allowed: false,
        limit,
        current: currentCount,
        requiredPlan: nextPlan,
        reason: `Você atingiu o limite reduzido de ${limit} despesas por mês no Plano ${planDef.name}. Faça upgrade para o Plano ${PLANS_DATA[nextPlan].name} para ampliar ou liberar sem limites.`,
      };
    }
    return { allowed: true, limit, current: currentCount, requiredPlan: currentPlan };
  }

  if (quotaType === "market_items") {
    const limit = planDef.maxMarketItems;
    if (limit === "ilimitado") {
      return { allowed: true, limit: "ilimitado", current: currentCount, requiredPlan: "avancado" };
    }
    if (currentCount >= limit) {
      return {
        allowed: false,
        limit,
        current: currentCount,
        requiredPlan: nextPlan,
        reason: `Você atingiu o limite reduzido de ${limit} itens no Mercado do Plano ${planDef.name}. Faça upgrade para o Plano ${PLANS_DATA[nextPlan].name} para ampliar sua lista.`,
      };
    }
    return { allowed: true, limit, current: currentCount, requiredPlan: currentPlan };
  }

  if (quotaType === "notes") {
    const limit = planDef.maxNotes;
    if (limit === "ilimitado") {
      return { allowed: true, limit: "ilimitado", current: currentCount, requiredPlan: "avancado" };
    }
    if (currentCount >= limit) {
      return {
        allowed: false,
        limit,
        current: currentCount,
        requiredPlan: nextPlan,
        reason: `Você atingiu o limite de ${limit} notas ativas do Plano ${planDef.name}. Faça upgrade para o Plano ${PLANS_DATA[nextPlan].name} para criar notas ilimitadas.`,
      };
    }
    return { allowed: true, limit, current: currentCount, requiredPlan: currentPlan };
  }

  // clients quota
  const limit = planDef.maxClients;
  if (limit === "ilimitado") {
    return { allowed: true, limit: "ilimitado", current: currentCount, requiredPlan: "avancado" };
  }
  if (currentCount >= limit) {
    return {
      allowed: false,
      limit,
      current: currentCount,
      requiredPlan: nextPlan,
      reason: `Você atingiu o limite de ${limit} clientes ativos do Plano ${planDef.name}. Faça upgrade para o Plano ${PLANS_DATA[nextPlan].name} para ampliar ou cadastrar sem limites.`,
    };
  }
  return { allowed: true, limit, current: currentCount, requiredPlan: currentPlan };
}

/**
 * Gera o código Pix Copia e Cola formatado para o plano escolhido
 */
export function generatePlanPixPayment(
  planId: PlanId,
  config?: PlansConfig
): {
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
      message: `Assinatura Plano ${plan.name} - App GM`,
    });

    return {
      payload,
      amount,
      planName: plan.name,
      pixKey: cfg.pixKey,
    };
  } catch {
    return {
      payload: cfg.pixKey,
      amount,
      planName: plan.name,
      pixKey: cfg.pixKey,
    };
  }
}
