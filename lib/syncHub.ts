// lib/syncHub.ts
import { supabase } from "./supabase";
import { AppSettings, applySettingsToDOM, writeSettingsLocal, fetchSettingsSupabase } from "./settings";
import { triggerRealNotification, getUserRegisteredLogo } from "./realNotification";
import { playNotificationSound } from "./audio";

export interface SyncNotificationItem {
  id: string;
  title: string;
  message: string;
  type?: "budget" | "expense" | "note" | "market" | "alarm" | "system" | "direct" | "update";
  createdAt: string;
  read?: boolean;
  url?: string;
  amount?: number | string;
  icon?: string;
  sourceDevice?: string;
  skipInAppToast?: boolean;
}

export interface SyncBackgroundPayload {
  enabled: boolean;
  bgUrl?: string | null;
  bgOpacity?: number;
  bgScale?: number;
  bgBlur?: number;
  bgFit?: string;
  bgPosX?: string;
  bgPosY?: string;
  mobileBgUrl?: string | null;
  mobileBgOpacity?: number;
  mobileBgScale?: number;
  mobileBgBlur?: number;
  mobileBgFit?: string;
  mobileBgPosX?: string;
  mobileBgPosY?: string;
  timestamp: number;
}

// Local in-memory / multi-tab channel
let localBroadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    localBroadcastChannel = new BroadcastChannel("gm_app_multidevice_sync");
  }
} catch (e) {}

// Supabase Realtime channel instance
let currentRealtimeChannel: any = null;
let currentTenantId: string | null = null;
let currentUserEmail: string | null = null;

const DELIVERED_REMOTE_IDS_KEY = "gm.delivered_remote_notif_ids";

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getDeliveredRemoteIds(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DELIVERED_REMOTE_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function markDeliveredRemoteId(id: string) {
  if (typeof localStorage === "undefined" || !id) return;
  try {
    const set = getDeliveredRemoteIds();
    set.add(id);
    const list = Array.from(set).slice(-200);
    localStorage.setItem(DELIVERED_REMOTE_IDS_KEY, JSON.stringify(list));
  } catch {}
}

// Unique device identifier for this session to prevent echo loops
export const DEVICE_SESSION_ID = "dev_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);

/**
 * Retorna as notificações salvas no cache
 */
export function getSavedNotifications(): SyncNotificationItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem("gm.notifications");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Salva a lista de notificações no cache e dispara evento local
 */
export function saveNotifications(list: SyncNotificationItem[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem("gm.notifications", JSON.stringify(list.slice(0, 100)));
    window.dispatchEvent(new CustomEvent("gm_notifications_changed", { detail: list }));
  } catch {}
}

/**
 * Registra uma nova notificação localmente e dispara efeitos (som, toast, OS push)
 */
export function recordAndTriggerNotification(noti: SyncNotificationItem, notifyUser = true) {
  const current = getSavedNotifications();
  // Evita duplicatas pelo ID
  if (current.some((n) => n.id === noti.id)) return;

  const updated = [noti, ...current].slice(0, 100);
  saveNotifications(updated);

  if (notifyUser) {
    // 1. Tocar som oficial
    try {
      playNotificationSound();
    } catch {}

    // 2. Disparar notificação nativa (sistema operacional / service worker / mobile)
    // Se o tipo for alarme ou tiver skipInAppToast, não gera toast genérico duplo no ToastHost
    // pois o AlarmToast já cuida da exibição do card rico oficial
    const shouldShowInAppToast = noti.type !== "alarm" && !noti.skipInAppToast;

    triggerRealNotification({
      title: noti.title,
      body: noti.message,
      url: noti.url || "/",
      icon: noti.icon || getUserRegisteredLogo() || undefined,
      inAppToast: shouldShowInAppToast,
    });
  }
}

/**
 * Transmite mensagem via Supabase Realtime utilizando explicitamente httpSend()
 * para entregas via REST, em total conformidade com as diretrizes do Supabase Realtime,
 * eliminando definitivamente o aviso de fallback automático e descontinuação do método send().
 */
async function sendChannelBroadcast(
  channel: any,
  event: string,
  payload: any
): Promise<boolean> {
  if (!channel) return false;

  // 1. Verifica se a conexão WebSocket do canal está ativa e pronta para envio
  const isSocketReady =
    typeof channel._canPush === "function"
      ? Boolean(channel._canPush())
      : channel.state === "joined" && Boolean(channel.socket?.isConnected?.());

  // Se o WebSocket estiver pronto, envia diretamente via canal de tempo real
  if (isSocketReady) {
    try {
      await channel.send({
        type: "broadcast",
        event,
        payload,
      });
      return true;
    } catch {
      // Falha pontual no socket; continua para tentar via REST silenciosamente
    }
  }

  // 2. Se o WebSocket ainda não estiver aberto, tenta via httpSend REST
  if (typeof channel.httpSend === "function") {
    try {
      // Garante autenticação atualizada se houver sessão ativa
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      if (data?.session?.access_token && typeof supabase.realtime?.setAuth === "function") {
        await supabase.realtime.setAuth(data.session.access_token).catch(() => {});
      }

      await channel.httpSend(event, payload);
      return true;
    } catch (httpErr: any) {
      // Falhas de autorização (ex.: RLS ou políticas REST do Realtime) são esperadas para sessões anônimas/locais
      // O BroadcastChannel local já garante a sincronização em tempo real entre abas no mesmo navegador.
      const errMsg = String(httpErr?.message || httpErr || "");
      if (errMsg.toLowerCase().includes("unauthorized") || errMsg.includes("401")) {
        return false;
      }
    }
  }

  // 3. Fallback final via send() convencional se o socket puder trafegar
  try {
    if (channel.state === "joined") {
      await channel.send({
        type: "broadcast",
        event,
        payload,
      });
      return true;
    }
  } catch {}

  return false;
}

/**
 * Transmite uma notificação para TODOS os dispositivos do mesmo usuário / tenant logado
 */
export async function broadcastAppNotification(
  tenantId: string | null | undefined,
  notiData: Omit<SyncNotificationItem, "id" | "createdAt"> & { id?: string; skipInAppToast?: boolean }
) {
  const registeredUserLogo = getUserRegisteredLogo();
  const isAlarm = notiData.type === "alarm";
  const finalNotification: SyncNotificationItem = {
    id: notiData.id || "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    title: notiData.title,
    message: notiData.message,
    type: notiData.type || "system",
    createdAt: new Date().toISOString(),
    read: false,
    url: notiData.url || "/",
    amount: notiData.amount,
    icon: notiData.icon || registeredUserLogo || undefined,
    sourceDevice: DEVICE_SESSION_ID,
    skipInAppToast: isAlarm || Boolean(notiData.skipInAppToast),
  };

  // 1. Grava e dispara localmente
  recordAndTriggerNotification(finalNotification, true);

  // 2. Dispara no BroadcastChannel (outras abas no mesmo dispositivo)
  if (localBroadcastChannel) {
    try {
      localBroadcastChannel.postMessage({
        type: "NOTIFICATION_BROADCAST",
        notification: finalNotification,
        sessionId: DEVICE_SESSION_ID,
      });
    } catch {}
  }

  // 3. Dispara via Supabase Realtime para outros dispositivos (smartphone/desktop) do mesmo tenant
  const targetChannel =
    tenantId && currentRealtimeChannel && currentTenantId === tenantId
      ? currentRealtimeChannel
      : null;

  if (targetChannel && tenantId) {
    await sendChannelBroadcast(targetChannel, "NOTIFICATION_BROADCAST", {
      notification: finalNotification,
      sessionId: DEVICE_SESSION_ID,
      tenantId,
    });
  } else if (tenantId) {
    try {
      const transient = supabase.channel(`tenant_sync_${tenantId}`);
      await sendChannelBroadcast(transient, "NOTIFICATION_BROADCAST", {
        notification: finalNotification,
        sessionId: DEVICE_SESSION_ID,
        tenantId,
      });
      supabase.removeChannel(transient);
    } catch {}
  }
}

export interface RemoteUserNotificationPayload {
  targetTenantId?: string | null;
  targetEmail?: string | null;
  title: string;
  message: string;
  type?: "system" | "direct" | "update" | "alarm";
  url?: string;
  createdBy?: string | null;
}

/**
 * Envia uma notificação DIRECIONADA para o app/dispositivo instalado de um usuário específico.
 * - Salva na tabela persistente `public.user_notifications` (entrega garantida mesmo se o app estiver fechado)
 * - Transmite instantaneamente via Supabase Realtime no canal do usuário alvo (sem disparar na tela do Admin remetente)
 */
export async function sendRemoteUserNotification(
  payload: RemoteUserNotificationPayload
): Promise<{ ok: boolean; dbSaved: boolean; realtimeSent: boolean; id: string }> {
  const cleanEmail = payload.targetEmail ? payload.targetEmail.trim().toLowerCase() : null;
  const cleanTenantId =
    payload.targetTenantId && /^[0-9a-f-]{36}$/i.test(payload.targetTenantId)
      ? payload.targetTenantId
      : null;

  const notifId = generateUuid();
  const createdAt = new Date().toISOString();

  const finalNotification: SyncNotificationItem = {
    id: notifId,
    title: payload.title,
    message: payload.message,
    type: payload.type || "system",
    createdAt,
    read: false,
    url: payload.url || "/planos",
    sourceDevice: DEVICE_SESSION_ID,
  };

  let dbSaved = false;
  let realtimeSent = false;

  // 1. Persistência na tabela `public.user_notifications` para entrega imediata (postgres_changes) e offline (PWA fechado)
  try {
    const insertRow: Record<string, any> = {
      id: notifId,
      tenant_id: cleanTenantId,
      user_email: cleanEmail,
      title: payload.title,
      message: payload.message,
      type: payload.type || "system",
      url: payload.url || "/planos",
      read: false,
      created_by: payload.createdBy || null,
      created_at: createdAt,
    };

    const { error } = await supabase.from("user_notifications").insert(insertRow);
    if (!error) {
      dbSaved = true;
    }
  } catch (err) {
    console.warn("[SyncHub] Aviso ao gravar em user_notifications:", err);
  }

  // 2. Broadcast Realtime direto para os dispositivos online do usuário alvo
  const targetsCurrentSession =
    (cleanTenantId && currentTenantId && cleanTenantId === currentTenantId) ||
    (cleanEmail && currentUserEmail && cleanEmail === currentUserEmail);

  if (targetsCurrentSession) {
    markDeliveredRemoteId(notifId);
    recordAndTriggerNotification(finalNotification, true);
    realtimeSent = true;
  } else {
    const targetChannelName = cleanTenantId
      ? `tenant_sync_${cleanTenantId}`
      : cleanEmail
      ? `user_sync_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`
      : null;

    if (targetChannelName) {
      let transientChannel: any = null;
      try {
        transientChannel = supabase.channel(targetChannelName, {
          config: { broadcast: { self: false } },
        });

        realtimeSent = await sendChannelBroadcast(transientChannel, "NOTIFICATION_BROADCAST", {
          notification: finalNotification,
          sessionId: DEVICE_SESSION_ID,
          tenantId: cleanTenantId,
          targetEmail: cleanEmail,
        });

        // Se REST httpSend falhou (ex: WebSocket exigido), tenta conectar brevemente e enviar
        if (!realtimeSent) {
          realtimeSent = await new Promise<boolean>((resolve) => {
            let settled = false;
            const timeout = setTimeout(() => {
              if (!settled) {
                settled = true;
                resolve(false);
              }
            }, 2200);

            transientChannel.subscribe(async (status: string) => {
              if (status === "SUBSCRIBED" && !settled) {
                settled = true;
                clearTimeout(timeout);
                try {
                  await transientChannel.send({
                    type: "broadcast",
                    event: "NOTIFICATION_BROADCAST",
                    payload: {
                      notification: finalNotification,
                      sessionId: DEVICE_SESSION_ID,
                      tenantId: cleanTenantId,
                      targetEmail: cleanEmail,
                    },
                  });
                  resolve(true);
                } catch {
                  resolve(false);
                }
              } else if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && !settled) {
                settled = true;
                clearTimeout(timeout);
                resolve(false);
              }
            });
          });
        }
      } catch {
      } finally {
        if (transientChannel) {
          setTimeout(() => {
            try {
              supabase.removeChannel(transientChannel);
            } catch {}
          }, 400);
        }
      }
    }
  }

  return {
    ok: dbSaved || realtimeSent,
    dbSaved,
    realtimeSent,
    id: notifId,
  };
}

/**
 * Transmite a alteração de Background (Ligar/Desligar/Imagem) para todos os dispositivos
 */
export async function broadcastBackgroundChange(
  tenantId: string | null | undefined,
  bgPayload: SyncBackgroundPayload
) {
  // 1. Dispara localmente
  if (localBroadcastChannel) {
    try {
      localBroadcastChannel.postMessage({
        type: "BACKGROUND_BROADCAST",
        bg: bgPayload,
        sessionId: DEVICE_SESSION_ID,
      });
    } catch {}
  }

  // 2. Dispara via Supabase Realtime
  let channel = currentRealtimeChannel;
  if (!channel && tenantId) {
    try {
      channel = supabase.channel(`tenant_sync_${tenantId}`);
      channel.subscribe();
      currentRealtimeChannel = channel;
    } catch {}
  }

  if (channel && tenantId) {
    await sendChannelBroadcast(channel, "BACKGROUND_BROADCAST", {
      bg: bgPayload,
      sessionId: DEVICE_SESSION_ID,
      tenantId,
    });
  }
}

function handleIncomingRemoteNotificationRow(row: any, allowAlertSound = true) {
  if (!row?.id) return;
  const rowId = String(row.id);
  const delivered = getDeliveredRemoteIds();
  if (delivered.has(rowId)) return;

  markDeliveredRemoteId(rowId);

  const createdMs = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  const ageHours = (Date.now() - createdMs) / 3600000;
  const shouldRing = allowAlertSound && ageHours <= 72;

  recordAndTriggerNotification(
    {
      id: rowId,
      title: row.title || "CardDigital GM",
      message: row.message || "",
      type: row.type || "system",
      createdAt: row.created_at || new Date().toISOString(),
      read: false,
      url: row.url || "/planos",
      icon: getUserRegisteredLogo() || undefined,
    },
    shouldRing
  );

  if (row.url === "/planos" || row.type === "system") {
    window.dispatchEvent(new CustomEvent("gm_remote_plan_changed"));
  }
}

export async function pullRemoteUserNotifications(
  tenantId?: string | null,
  userEmail?: string | null
): Promise<void> {
  const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : null;
  if (!tenantId && !cleanEmail) return;

  try {
    const safeEmail = cleanEmail ? cleanEmail.replace(/[,()]/g, "") : null;
    let query = supabase
      .from("user_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (tenantId && safeEmail) {
      query = query.or(`tenant_id.eq.${tenantId},user_email.ilike.${safeEmail}`);
    } else if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    } else if (safeEmail) {
      query = query.ilike("user_email", safeEmail);
    }

    const { data, error } = await query;
    if (error || !Array.isArray(data) || data.length === 0) return;

    // Processa em ordem cronológica crescente para manter a mais recente no topo da lista
    const ordered = [...data].reverse();
    ordered.forEach((row) => {
      handleIncomingRemoteNotificationRow(row, true);
    });
  } catch {
    // Tabela opcional até execução do SQL no Supabase
  }
}

/**
 * Inicializa a escuta em tempo real para sincronização simultânea Desktop <-> Smartphone
 * e entrega de notificações direcionadas de plano/pagamento/avisos ao usuário.
 */
export function initSyncHub(
  tenantId: string | null | undefined,
  userEmail?: string | null
) {
  const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : null;
  if ((!tenantId && !cleanEmail) || typeof window === "undefined") return () => {};

  if (currentTenantId === (tenantId || null) && currentUserEmail === cleanEmail && currentRealtimeChannel) {
    return () => {};
  }

  if (currentRealtimeChannel) {
    try {
      supabase.removeChannel(currentRealtimeChannel);
    } catch {}
    currentRealtimeChannel = null;
  }

  currentTenantId = tenantId || null;
  currentUserEmail = cleanEmail;

  // 1. Escuta local via BroadcastChannel
  const handleLocalMessage = (event: MessageEvent) => {
    if (!event.data || event.data.sessionId === DEVICE_SESSION_ID) return;

    if (event.data.type === "NOTIFICATION_BROADCAST" && event.data.notification) {
      if (event.data.notification.id) {
        markDeliveredRemoteId(String(event.data.notification.id));
      }
      recordAndTriggerNotification(event.data.notification, true);
    }

    if (event.data.type === "BACKGROUND_BROADCAST" && event.data.bg && tenantId) {
      handleIncomingBackgroundSync(event.data.bg, tenantId);
    }
  };

  if (localBroadcastChannel) {
    localBroadcastChannel.onmessage = handleLocalMessage;
  }

  // 2. Busca imediata de notificações pendentes no Supabase (caso o app estivesse fechado)
  void pullRemoteUserNotifications(tenantId, cleanEmail);

  const handleResumeCheck = () => {
    if (document.visibilityState === "visible") {
      void pullRemoteUserNotifications(tenantId, cleanEmail);
    }
  };

  window.addEventListener("focus", handleResumeCheck);
  document.addEventListener("visibilitychange", handleResumeCheck);
  const pollTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      void pullRemoteUserNotifications(tenantId, cleanEmail);
    }
  }, 45000);

  // 3. Conecta ao canal Supabase Realtime
  const channelName = tenantId
    ? `tenant_sync_${tenantId}`
    : `user_sync_${(cleanEmail || "anon").replace(/[^a-z0-9]/g, "_")}`;

  const channel = supabase.channel(channelName, {
    config: {
      broadcast: { self: false },
    },
  });

  channel
    // Escuta notificações broadcast em tempo real
    .on("broadcast", { event: "NOTIFICATION_BROADCAST" }, ({ payload }) => {
      if (payload?.sessionId === DEVICE_SESSION_ID) return;
      if (payload?.targetEmail && cleanEmail && String(payload.targetEmail).toLowerCase() !== cleanEmail) {
        return;
      }
      if (payload?.notification) {
        if (payload.notification.id) {
          markDeliveredRemoteId(String(payload.notification.id));
        }
        recordAndTriggerNotification(payload.notification, true);
        if (payload.notification.url === "/planos" || payload.notification.type === "system") {
          window.dispatchEvent(new CustomEvent("gm_remote_plan_changed"));
        }
      }
    })
    // Escuta notificações persistidas na tabela public.user_notifications
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "user_notifications",
      },
      (payload) => {
        const row = payload.new as any;
        if (!row) return;
        const rowEmail = String(row.user_email || "").trim().toLowerCase();
        const matchesTenant = Boolean(tenantId && row.tenant_id && row.tenant_id === tenantId);
        const matchesEmail = Boolean(cleanEmail && rowEmail && rowEmail === cleanEmail);
        if (!matchesTenant && !matchesEmail) return;

        handleIncomingRemoteNotificationRow(row, true);
      }
    )
    // Escuta alterações de assinatura/plano em tempo real na tabela public.subscriptions
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "subscriptions",
      },
      (payload) => {
        const row = (payload.new || payload.old) as any;
        if (!row) return;
        const rowEmail = String(row.user_email || "").trim().toLowerCase();
        const matchesTenant = Boolean(tenantId && row.tenant_id && row.tenant_id === tenantId);
        const matchesEmail = Boolean(cleanEmail && rowEmail && rowEmail === cleanEmail);
        if (!matchesTenant && !matchesEmail) return;

        window.dispatchEvent(new CustomEvent("gm_remote_plan_changed"));
      }
    );

  if (tenantId) {
    channel
      // Escuta alterações de background (ligado/desligado/imagem) de outros dispositivos
      .on("broadcast", { event: "BACKGROUND_BROADCAST" }, ({ payload }) => {
        if (payload?.sessionId === DEVICE_SESSION_ID) return;
        if (payload?.bg) {
          handleIncomingBackgroundSync(payload.bg, tenantId);
        }
      })
      // Escuta alterações diretamente no banco de dados na tabela app_settings
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_settings",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if (payload.new) {
            const newSettings = payload.new as AppSettings;
            writeSettingsLocal(newSettings, tenantId);
            applySettingsToDOM(newSettings, true, tenantId);
            window.dispatchEvent(new CustomEvent("gm_settings_updated", { detail: newSettings }));
          }
        }
      );
  }

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      console.log("[SyncHub] Sincronização em tempo real ativa para:", tenantId || cleanEmail);
    }
  });

  currentRealtimeChannel = channel;

  return () => {
    window.removeEventListener("focus", handleResumeCheck);
    document.removeEventListener("visibilitychange", handleResumeCheck);
    window.clearInterval(pollTimer);
    if (currentRealtimeChannel === channel) {
      supabase.removeChannel(channel);
      currentRealtimeChannel = null;
      currentTenantId = null;
      currentUserEmail = null;
    }
  };
}

/**
 * Trata o recebimento de sincronização de background de outro dispositivo
 */
async function handleIncomingBackgroundSync(bg: SyncBackgroundPayload, tenantId: string) {
  try {
    const current = await fetchSettingsSupabase(tenantId);
    const updated: AppSettings = {
      ...(current || {}),
      app_background_url: bg.bgUrl !== undefined ? bg.bgUrl : current?.app_background_url,
      app_background_opacity: bg.enabled ? (bg.bgOpacity ?? 0.18) : 0,
      app_background_scale: bg.bgScale ?? current?.app_background_scale ?? 1,
      app_background_blur: bg.bgBlur ?? current?.app_background_blur ?? 10,
      app_background_fit: bg.bgFit ?? current?.app_background_fit ?? "cover",
      app_background_pos_x: bg.bgPosX ?? current?.app_background_pos_x ?? "50%",
      app_background_pos_y: bg.bgPosY ?? current?.app_background_pos_y ?? "50%",

      mobile_app_background_url: bg.mobileBgUrl !== undefined ? bg.mobileBgUrl : current?.mobile_app_background_url,
      mobile_app_background_opacity: bg.enabled ? (bg.mobileBgOpacity ?? 0.18) : 0,
      mobile_app_background_scale: bg.mobileBgScale ?? current?.mobile_app_background_scale ?? 1.2,
      mobile_app_background_blur: bg.mobileBgBlur ?? current?.mobile_app_background_blur ?? 10,
      mobile_app_background_fit: bg.mobileBgFit ?? current?.mobile_app_background_fit ?? "cover",
      mobile_app_background_pos_x: bg.mobileBgPosX ?? current?.mobile_app_background_pos_x ?? "50%",
      mobile_app_background_pos_y: bg.mobileBgPosY ?? current?.mobile_app_background_pos_y ?? "50%",
    };

    writeSettingsLocal(updated, tenantId);
    applySettingsToDOM(updated, true, tenantId);
    window.dispatchEvent(new CustomEvent("gm_settings_updated", { detail: updated }));
  } catch (e) {
    console.warn("[SyncHub] Erro ao aplicar sincronização de background recebida:", e);
  }
}
