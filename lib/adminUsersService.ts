// lib/adminUsersService.ts
import { supabase } from "./supabase";
import {
  PlanId,
  PLANS_DATA,
  MASTER_TENANT_ID,
  MASTER_RECORD_ID,
  DEFAULT_PLANS_CONFIG,
  computeSubscriptionSnapshot,
  saveLocalUserSubscription,
} from "./subscriptionPlans";
import { isUserAdminEmail } from "../constants";

export type UserSubscriptionStatus = "teste" | "solicitou_liberacao" | "ativo" | "expirado" | "adm";

export interface RegisteredUserRecord {
  id: string; // ID do usuário ou tenant
  tenantId?: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  status: UserSubscriptionStatus;
  planId: PlanId | "adm";
  planName: string;
  daysRemaining: number | "ilimitado";
  expiresAt: string | null;
  requestedAt?: string | null;
  requestedPlanId?: PlanId | null;
  requestedGateway?: string | null;
  receiptSent?: boolean;
  notes?: string;
  avatarUrl?: string;
}

const LOCAL_REGISTRY_KEY = "gm_users_registry_v1";

/**
 * Usuários iniciais conhecidos para compor o registro master
 */
const INITIAL_KNOWN_USERS: RegisteredUserRecord[] = [
  {
    id: "64a22c15-806c-4ad3-ac1c-c1628f02bba5",
    tenantId: MASTER_TENANT_ID,
    name: "GM Edificação (Administrador Master)",
    email: "gmedificacao@gmail.com",
    createdAt: "2026-02-03T07:32:33.910Z",
    status: "adm",
    planId: "adm",
    planName: "Administrador Master",
    daysRemaining: "ilimitado",
    expiresAt: null,
    notes: "Conta oficial do proprietário e desenvolvedor",
  },
  {
    id: "6ead6174-5a1f-4938-b626-f65e78dd9395",
    tenantId: "72122076-7048-4bc0-b127-727f2fa1db3c",
    name: "PROSSEGUE Ronda Patrimonial",
    email: "prosseguesegurancaprivada@gmail.com",
    phone: "5598984242784",
    createdAt: "2026-07-03T15:28:43.903Z",
    status: "ativo",
    planId: "intermediario",
    planName: "Criador",
    daysRemaining: 28,
    expiresAt: new Date(Date.now() + 28 * 86400000).toISOString(),
    notes: "Empresa de vigilância patrimonial e monitoramento",
  },
  {
    id: "6188ba37-317f-4085-a4cb-e21e54ca87f1",
    tenantId: "4f2924fa-6d57-4c63-a5e7-96d8823b1c40",
    name: "Tec. Ana Paula Furtado",
    email: "anapaulasevero387@gmail.com",
    createdAt: "2026-03-22T02:24:17.076Z",
    status: "teste",
    planId: "intermediario",
    planName: "Criador (Teste 7 Dias)",
    daysRemaining: 4,
    expiresAt: new Date(Date.now() + 4 * 86400000).toISOString(),
    notes: "Usuário em período experimental ativo",
  },
  {
    id: "37dd350c-932c-4da0-90ac-2609c8abb76e",
    tenantId: "8c691376-026a-4e75-abe3-7fbc83eeadc2",
    name: "Thiago Ferreira Viana",
    email: "thiago.ferreira.viana@gmail.com",
    createdAt: "2026-03-19T03:48:46.011Z",
    status: "solicitou_liberacao",
    planId: "intermediario",
    planName: "Criador",
    requestedPlanId: "intermediario",
    requestedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    receiptSent: true,
    daysRemaining: 0,
    expiresAt: null,
    notes: "Enviou comprovante via Pix e solicitou liberação do plano Criador",
  },
];

/**
 * Sincroniza um registro individual com a tabela dedicada public.subscriptions (se existir no Supabase)
 */
async function syncSingleRecordToSubscriptionsTable(user: RegisteredUserRecord): Promise<void> {
  if (!user?.email) return;
  const cleanEmail = user.email.trim().toLowerCase();

  try {
    const payload: Record<string, any> = {
      user_email: cleanEmail,
      user_name: user.name || cleanEmail.split("@")[0],
      phone: user.phone || null,
      plan_id: user.planId || "intermediario",
      status: user.status || "teste",
      gateway: user.requestedGateway || "pix",
      starts_at: user.createdAt || new Date().toISOString(),
      expires_at: user.expiresAt || null,
      requested_plan_id: user.requestedPlanId || null,
      requested_at: user.requestedAt || null,
      notes: user.notes || null,
      updated_at: new Date().toISOString(),
    };

    if (user.tenantId && /^[0-9a-f-]{36}$/i.test(user.tenantId)) {
      payload.tenant_id = user.tenantId;
    }
    if (user.id && /^[0-9a-f-]{36}$/i.test(user.id)) {
      payload.user_id = user.id;
    }

    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .ilike("user_email", cleanEmail)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from("subscriptions").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("subscriptions").insert(payload);
    }
  } catch {
    // Resiliente caso a migração SQL ainda não tenha adicionado as colunas extras
    try {
      const minimalPayload: Record<string, any> = {
        user_email: cleanEmail,
        plan_id: user.planId || "intermediario",
        status: user.status || "teste",
        gateway: user.requestedGateway || "pix",
        starts_at: user.createdAt || new Date().toISOString(),
        expires_at: user.expiresAt || null,
      };
      if (user.tenantId && /^[0-9a-f-]{36}$/i.test(user.tenantId)) {
        minimalPayload.tenant_id = user.tenantId;
      }

      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .ilike("user_email", cleanEmail)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        await supabase.from("subscriptions").update(minimalPayload).eq("id", existing.id);
      } else {
        await supabase.from("subscriptions").insert(minimalPayload);
      }
    } catch {}
  }

  // Atualiza cache local da assinatura para este email/tenant
  try {
    const snap = computeSubscriptionSnapshot({
      planId: user.planId,
      planName: user.planName,
      status: user.status,
      expiresAt: user.expiresAt,
      daysRemaining: user.daysRemaining,
      activatedAt: user.createdAt,
      requestedPlanId: user.requestedPlanId,
      notes: user.notes,
      userEmail: cleanEmail,
    });
    saveLocalUserSubscription(snap, user.tenantId || null, cleanEmail);
  } catch {}
}

/**
 * Lê o registro de usuários do LocalStorage
 */
export function getLocalUsersRegistry(): RegisteredUserRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_REGISTRY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return INITIAL_KNOWN_USERS;
}

/**
 * Salva o registro de usuários localmente e sincroniza na nuvem
 */
export async function saveUsersRegistry(users: RegisteredUserRecord[]): Promise<boolean> {
  try {
    // 1. Salva localmente
    localStorage.setItem(LOCAL_REGISTRY_KEY, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent("gm_users_registry_updated", { detail: users }));

    // 2. Salva no Supabase app_settings registro mestre
    try {
      const { data: current } = await supabase
        .from("app_settings")
        .select("app_plans_config")
        .eq("id", MASTER_RECORD_ID)
        .maybeSingle();

      const existingConfig = current?.app_plans_config || DEFAULT_PLANS_CONFIG;
      const updatedConfig = {
        ...existingConfig,
        users_registry: users,
        users_registry_updated_at: new Date().toISOString(),
      };

      await supabase
        .from("app_settings")
        .update({ app_plans_config: updatedConfig })
        .eq("id", MASTER_RECORD_ID);
    } catch (cloudErr) {
      console.warn("Aviso ao persistir users_registry no Supabase:", cloudErr);
    }

    return true;
  } catch (err) {
    console.error("Erro ao salvar registro de usuários:", err);
    return false;
  }
}

/**
 * Busca a lista consolidada de usuários cadastrados
 * Integrando Supabase (subscriptions + app_settings) com o registro mestre
 */
export async function fetchConsolidatedUsers(): Promise<RegisteredUserRecord[]> {
  let list = getLocalUsersRegistry();

  try {
    // 1. Busca do registro mestre em app_settings
    const { data: masterRow } = await supabase
      .from("app_settings")
      .select("app_plans_config")
      .eq("id", MASTER_RECORD_ID)
      .maybeSingle();

    if (masterRow?.app_plans_config?.users_registry && Array.isArray(masterRow.app_plans_config.users_registry)) {
      list = masterRow.app_plans_config.users_registry;
    }

    // 2. Mescla com tabela dedicada public.subscriptions (se existir)
    try {
      const { data: subsRows } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (Array.isArray(subsRows) && subsRows.length > 0) {
        subsRows.forEach((sub: any) => {
          const email = String(sub.user_email || "").trim().toLowerCase();
          if (!email) return;

          const existingIdx = list.findIndex((u) => u.email.toLowerCase() === email);
          const isMaster = isUserAdminEmail(email);
          const snap = computeSubscriptionSnapshot({
            planId: sub.plan_id,
            status: sub.status,
            expiresAt: sub.expires_at,
            activatedAt: sub.starts_at || sub.created_at,
            requestedPlanId: sub.requested_plan_id,
            notes: sub.notes,
            userEmail: email,
          });

          if (existingIdx >= 0) {
            const cur = list[existingIdx];
            const subUpdated = new Date(sub.updated_at || sub.created_at || 0).getTime();
            const curTime = new Date(masterRow?.app_plans_config?.users_registry_updated_at || cur.createdAt || 0).getTime();

            if (subUpdated > curTime) {
              list[existingIdx] = {
                ...cur,
                tenantId: sub.tenant_id || cur.tenantId,
                name: sub.user_name || cur.name,
                phone: sub.phone || cur.phone,
                status: snap.status,
                planId: snap.planId,
                planName: snap.planName,
                daysRemaining: snap.daysRemaining,
                expiresAt: snap.expiresAt,
                requestedPlanId: sub.requested_plan_id ?? cur.requestedPlanId,
                requestedAt: sub.requested_at ?? cur.requestedAt,
                notes: sub.notes ?? cur.notes,
              };
            }
          } else {
            list.push({
              id: sub.user_id || sub.id,
              tenantId: sub.tenant_id || undefined,
              name: sub.user_name || email.split("@")[0] || "Usuário Cadastrado",
              email,
              phone: sub.phone || undefined,
              createdAt: sub.created_at || new Date().toISOString(),
              status: isMaster ? "adm" : snap.status,
              planId: isMaster ? "adm" : snap.planId,
              planName: isMaster ? "Administrador Master" : snap.planName,
              daysRemaining: isMaster ? "ilimitado" : snap.daysRemaining,
              expiresAt: isMaster ? null : snap.expiresAt,
              requestedPlanId: sub.requested_plan_id || null,
              requestedAt: sub.requested_at || null,
              notes: sub.notes || undefined,
            });
          }
        });
      }
    } catch {}

    // 3. Consulta outras configurações cadastradas para capturar novos tenants
    const { data: allSettings } = await supabase
      .from("app_settings")
      .select("id, tenant_id, owner, company_name, created_at, bio_config");

    if (allSettings && allSettings.length > 0) {
      allSettings.forEach((setting) => {
        const email = setting.bio_config?.email || "";
        const name = setting.company_name || setting.bio_config?.title || "Usuário Cadastrado";
        const tid = setting.tenant_id;
        const exists = list.some((u) => (email && u.email.toLowerCase() === email.toLowerCase()) || (tid && u.tenantId === tid));

        if (!exists && email) {
          const isMaster = isUserAdminEmail(email);
          list.push({
            id: setting.owner || setting.id,
            tenantId: tid,
            name,
            email,
            createdAt: setting.created_at || new Date().toISOString(),
            status: isMaster ? "adm" : "teste",
            planId: isMaster ? "adm" : "intermediario",
            planName: isMaster ? "Administrador Master" : "Criador (Teste 7 Dias)",
            daysRemaining: isMaster ? "ilimitado" : 7,
            expiresAt: isMaster ? null : new Date(Date.now() + 7 * 86400000).toISOString(),
          });
        }
      });
    }

    // Recalcula status e dias restantes baseados nas datas
    const now = Date.now();
    list = list.map((u) => {
      if (u.status === "adm" || isUserAdminEmail(u.email)) {
        return {
          ...u,
          status: "adm" as const,
          planId: "adm" as const,
          planName: "Administrador Master",
          daysRemaining: "ilimitado" as const,
          expiresAt: null,
        };
      }

      if (u.status === "solicitou_liberacao") {
        return u;
      }

      if (u.status === "expirado") {
        return {
          ...u,
          daysRemaining: 0,
        };
      }

      if (u.expiresAt) {
        const expTime = new Date(u.expiresAt).getTime();
        const diffDays = Math.ceil((expTime - now) / 86400000);
        if (diffDays <= 0) {
          return {
            ...u,
            status: "expirado" as const,
            daysRemaining: 0,
          };
        }
        return {
          ...u,
          daysRemaining: diffDays,
        };
      }

      return u;
    });

    localStorage.setItem(LOCAL_REGISTRY_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn("Aviso ao sincronizar usuários cadastrados da nuvem:", err);
  }

  return list;
}

/**
 * Registra ou atualiza um usuário quando ele se cadastra ou faz login no app
 */
export async function registerOrUpdateUser(info: {
  id?: string;
  email: string;
  name?: string;
  tenantId?: string;
  phone?: string;
}): Promise<void> {
  if (!info.email) return;
  const cleanEmail = info.email.trim().toLowerCase();
  const isMaster = isUserAdminEmail(cleanEmail);

  const list = getLocalUsersRegistry();
  const existingIndex = list.findIndex((u) => u.email.toLowerCase() === cleanEmail);

  let targetRecord: RegisteredUserRecord;

  if (existingIndex >= 0) {
    const existing = list[existingIndex];
    targetRecord = {
      ...existing,
      id: info.id || existing.id,
      tenantId: info.tenantId || existing.tenantId,
      name: info.name && info.name !== "Usuário Cadastrado" ? info.name : existing.name,
      phone: info.phone || existing.phone,
    };
    list[existingIndex] = targetRecord;
  } else {
    const now = new Date();
    const expires = new Date();
    expires.setDate(now.getDate() + 7);

    targetRecord = {
      id: info.id || `usr_${Date.now()}`,
      tenantId: info.tenantId,
      name: info.name || cleanEmail.split("@")[0] || "Novo Usuário",
      email: cleanEmail,
      phone: info.phone,
      createdAt: now.toISOString(),
      status: isMaster ? "adm" : "teste",
      planId: isMaster ? "adm" : "intermediario",
      planName: isMaster ? "Administrador Master" : "Criador (Teste 7 Dias)",
      daysRemaining: isMaster ? "ilimitado" : 7,
      expiresAt: isMaster ? null : expires.toISOString(),
    };
    list.unshift(targetRecord);
  }

  await saveUsersRegistry(list);
  await syncSingleRecordToSubscriptionsTable(targetRecord);
}

/**
 * Registra a solicitação de liberação do app após pagamento via Pix ou Cartão
 */
export async function recordPaymentActivationRequest(req: {
  email: string;
  name?: string;
  planId: PlanId;
  tenantId?: string;
  gateway?: string;
}): Promise<boolean> {
  const cleanEmail = req.email.trim().toLowerCase();
  const list = getLocalUsersRegistry();
  const plan = PLANS_DATA[req.planId];
  const now = new Date().toISOString();

  const existingIndex = list.findIndex((u) => u.email.toLowerCase() === cleanEmail);
  let targetRecord: RegisteredUserRecord;

  if (existingIndex >= 0) {
    targetRecord = {
      ...list[existingIndex],
      tenantId: req.tenantId || list[existingIndex].tenantId,
      status: "solicitou_liberacao",
      requestedPlanId: req.planId,
      requestedAt: now,
      requestedGateway: req.gateway || "pix",
      receiptSent: true,
      notes: `Solicitou liberação do plano ${plan.name} após pagamento.`,
    };
    list[existingIndex] = targetRecord;
  } else {
    targetRecord = {
      id: `usr_${Date.now()}`,
      tenantId: req.tenantId,
      name: req.name || cleanEmail.split("@")[0] || "Cliente Solicitante",
      email: cleanEmail,
      createdAt: now,
      status: "solicitou_liberacao",
      planId: req.planId,
      planName: plan.name,
      daysRemaining: 0,
      expiresAt: null,
      requestedPlanId: req.planId,
      requestedAt: now,
      requestedGateway: req.gateway || "pix",
      receiptSent: true,
      notes: `Solicitou liberação do plano ${plan.name} após pagamento.`,
    };
    list.unshift(targetRecord);
  }

  const ok = await saveUsersRegistry(list);
  await syncSingleRecordToSubscriptionsTable(targetRecord);
  return ok;
}

/**
 * Libera o acesso de um usuário (Aprovação pelo Administrador Master)
 */
export async function approveUserAccess(
  emailOrId: string,
  planId: PlanId,
  durationDays = 30,
  adminNotes?: string
): Promise<boolean> {
  const list = getLocalUsersRegistry();
  const user = list.find((u) => u.id === emailOrId || u.email.toLowerCase() === emailOrId.toLowerCase());

  if (!user) return false;

  const plan = PLANS_DATA[planId];
  const now = new Date();
  const expires = new Date();
  expires.setDate(now.getDate() + durationDays);

  let updatedUser: RegisteredUserRecord | null = null;
  const updatedList = list.map((u) => {
    if (u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase()) {
      updatedUser = {
        ...u,
        status: "ativo" as const,
        planId,
        planName: plan.name,
        daysRemaining: durationDays,
        expiresAt: expires.toISOString(),
        requestedPlanId: null,
        requestedAt: null,
        notes: adminNotes || `Liberado pelo Administrador em ${now.toLocaleDateString("pt-BR")}`,
      };
      return updatedUser;
    }
    return u;
  });

  const ok = await saveUsersRegistry(updatedList);
  if (updatedUser) {
    await syncSingleRecordToSubscriptionsTable(updatedUser);
  }
  return ok;
}

/**
 * Estende o período de teste de um usuário
 */
export async function extendUserTrial(
  emailOrId: string,
  extraDays = 7,
  adminNotes?: string
): Promise<boolean> {
  const list = getLocalUsersRegistry();
  const user = list.find((u) => u.id === emailOrId || u.email.toLowerCase() === emailOrId.toLowerCase());

  if (!user) return false;

  const currentRemaining = typeof user.daysRemaining === "number" ? user.daysRemaining : 0;
  const newDays = Math.max(0, currentRemaining) + extraDays;

  const expires = new Date();
  expires.setDate(expires.getDate() + newDays);

  let updatedUser: RegisteredUserRecord | null = null;
  const updatedList = list.map((u) => {
    if (u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase()) {
      updatedUser = {
        ...u,
        status: "teste" as const,
        daysRemaining: newDays,
        expiresAt: expires.toISOString(),
        notes: adminNotes || `Período de teste estendido em +${extraDays} dias pelo ADM`,
      };
      return updatedUser;
    }
    return u;
  });

  const ok = await saveUsersRegistry(updatedList);
  if (updatedUser) {
    await syncSingleRecordToSubscriptionsTable(updatedUser);
  }
  return ok;
}

/**
 * Expira ou bloqueia o acesso de um usuário
 */
export async function expireUserAccess(emailOrId: string, reason?: string): Promise<boolean> {
  const list = getLocalUsersRegistry();
  const user = list.find((u) => u.id === emailOrId || u.email.toLowerCase() === emailOrId.toLowerCase());

  if (!user || isUserAdminEmail(user.email)) return false;

  let updatedUser: RegisteredUserRecord | null = null;
  const updatedList = list.map((u) => {
    if (u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase()) {
      updatedUser = {
        ...u,
        status: "expirado" as const,
        daysRemaining: 0,
        expiresAt: new Date().toISOString(),
        notes: reason || "Acesso expirado / bloqueado pelo administrador.",
      };
      return updatedUser;
    }
    return u;
  });

  const ok = await saveUsersRegistry(updatedList);
  if (updatedUser) {
    await syncSingleRecordToSubscriptionsTable(updatedUser);
  }
  return ok;
}

/**
 * Remove um usuário do registro
 */
export async function deleteUserFromRegistry(emailOrId: string): Promise<boolean> {
  const list = getLocalUsersRegistry();
  const target = list.find((u) => u.id === emailOrId || u.email.toLowerCase() === emailOrId.toLowerCase());
  const filtered = list.filter((u) => {
    if (isUserAdminEmail(u.email)) return true; // Nunca remove o Master ADM
    return u.id !== emailOrId && u.email.toLowerCase() !== emailOrId.toLowerCase();
  });

  const ok = await saveUsersRegistry(filtered);

  if (target?.email && !isUserAdminEmail(target.email)) {
    try {
      await supabase.from("subscriptions").delete().ilike("user_email", target.email.trim().toLowerCase());
    } catch {}
  }

  return ok;
}
