// lib/syncHub.ts
import { supabase } from "./supabase";
import { AppSettings, applySettingsToDOM, writeSettingsLocal, fetchSettingsSupabase } from "./settings";
import { triggerRealNotification, getUserRegisteredLogo } from "./realNotification";
import { playNotificationSound } from "./audio";

export interface SyncNotificationItem {
  id: string;
  title: string;
  message: string;
  type?: "budget" | "expense" | "note" | "market" | "alarm" | "system" | "direct";
  createdAt: string;
  read?: boolean;
  url?: string;
  amount?: number | string;
  icon?: string;
  sourceDevice?: string;
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
    triggerRealNotification({
      title: noti.title,
      body: noti.message,
      url: noti.url || "/",
      icon: noti.icon || getUserRegisteredLogo() || undefined,
      inAppToast: true,
    });
  }
}

/**
 * Transmite uma notificação para TODOS os dispositivos do mesmo usuário / tenant
 */
export async function broadcastAppNotification(
  tenantId: string | null | undefined,
  notiData: Omit<SyncNotificationItem, "id" | "createdAt"> & { id?: string }
) {
  const registeredUserLogo = getUserRegisteredLogo();
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

  // 3. Dispara via Supabase Realtime para outros dispositivos (smartphone/desktop)
  if (currentRealtimeChannel && tenantId) {
    try {
      await currentRealtimeChannel.send({
        type: "broadcast",
        event: "NOTIFICATION_BROADCAST",
        payload: {
          notification: finalNotification,
          sessionId: DEVICE_SESSION_ID,
          tenantId,
        },
      });
    } catch (e) {
      console.warn("[SyncHub] Erro ao transmitir notificação via Supabase:", e);
    }
  }
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
  if (currentRealtimeChannel && tenantId) {
    try {
      await currentRealtimeChannel.send({
        type: "broadcast",
        event: "BACKGROUND_BROADCAST",
        payload: {
          bg: bgPayload,
          sessionId: DEVICE_SESSION_ID,
          tenantId,
        },
      });
    } catch (e) {
      console.warn("[SyncHub] Erro ao transmitir background via Supabase:", e);
    }
  }
}

/**
 * Inicializa a escuta em tempo real para sincronização simultânea Desktop <-> Smartphone
 */
export function initSyncHub(tenantId: string | null | undefined) {
  if (!tenantId || typeof window === "undefined") return () => {};

  if (currentTenantId === tenantId && currentRealtimeChannel) {
    return () => {};
  }

  currentTenantId = tenantId;

  // 1. Escuta local via BroadcastChannel
  const handleLocalMessage = (event: MessageEvent) => {
    if (!event.data || event.data.sessionId === DEVICE_SESSION_ID) return;

    if (event.data.type === "NOTIFICATION_BROADCAST" && event.data.notification) {
      recordAndTriggerNotification(event.data.notification, true);
    }

    if (event.data.type === "BACKGROUND_BROADCAST" && event.data.bg) {
      handleIncomingBackgroundSync(event.data.bg, tenantId);
    }
  };

  if (localBroadcastChannel) {
    localBroadcastChannel.onmessage = handleLocalMessage;
  }

  // 2. Conecta ao canal Supabase Realtime
  const channelName = `tenant_sync_${tenantId}`;
  const channel = supabase.channel(channelName, {
    config: {
      broadcast: { self: false },
    },
  });

  channel
    // Escuta notificações de outros dispositivos
    .on("broadcast", { event: "NOTIFICATION_BROADCAST" }, ({ payload }) => {
      if (payload?.sessionId === DEVICE_SESSION_ID) return;
      if (payload?.notification) {
        recordAndTriggerNotification(payload.notification, true);
      }
    })
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
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("[SyncHub] Sincronização em tempo real ativa para o tenant:", tenantId);
      }
    });

  currentRealtimeChannel = channel;

  return () => {
    if (currentRealtimeChannel) {
      supabase.removeChannel(currentRealtimeChannel);
      currentRealtimeChannel = null;
      currentTenantId = null;
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
