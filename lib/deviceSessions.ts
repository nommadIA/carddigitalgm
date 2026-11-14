// lib/deviceSessions.ts
// Gerenciamento multi-dispositivo de sessões ativas, detecção de app instalado (PWA/Desktop)
// e desvinculação remota sincronizada via Supabase (app_settings.app_plans_config)

import { supabase } from "./supabase";
import { readSettingsLocal, writeSettingsLocal, MASTER_TENANT_ID, MASTER_RECORD_ID } from "./settings";
import { isPinSecurityActive } from "./securityPin";

export interface DeviceSession {
  deviceId: string;
  email: string;
  userId?: string;
  deviceCategory: "desktop" | "mobile" | "tablet";
  os: string;
  browser: string;
  deviceLabel: string;
  isPwaInstalled: boolean;
  screenResolution: string;
  pinEnabled: boolean;
  firstSeenAt: string;
  lastActiveAt: string;
  loginEpoch: number;
  appOrigin: string;
}

export interface DeviceSessionsCloudPayload {
  sessions: DeviceSession[];
  revokedDevices: Record<string, string>;
}

const DEVICE_ID_KEY = "gm_device_unique_id_v1";
const LOGIN_EPOCH_KEY = "gm_device_login_epoch_v1";
const LOCAL_SESSIONS_PREFIX = "gm_device_sessions_cache_";
const LAST_HEARTBEAT_TS_KEY = "gm_device_last_cloud_sync_ts";

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let existing = localStorage.getItem(DEVICE_ID_KEY);
    if (!existing) {
      existing = generateUuid();
      localStorage.setItem(DEVICE_ID_KEY, existing);
    }
    return existing;
  } catch {
    return "local_device";
  }
}

export function getDeviceLoginEpoch(): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const raw = localStorage.getItem(LOGIN_EPOCH_KEY);
    const parsed = raw ? Number(raw) : 0;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    const now = Date.now();
    localStorage.setItem(LOGIN_EPOCH_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

export function markNewDeviceLoginSession(): number {
  const now = Date.now();
  try {
    localStorage.setItem(LOGIN_EPOCH_KEY, String(now));
    localStorage.removeItem(LAST_HEARTBEAT_TS_KEY);
  } catch {}
  return now;
}

export function detectCurrentDeviceProfile(email: string, userId?: string): DeviceSession {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const platformHint =
    typeof navigator !== "undefined"
      ? String((navigator as any).userAgentData?.platform || navigator.platform || "")
      : "";
  const combined = `${ua} ${platformHint}`.toLowerCase();

  let os = "Sistema Desconhecido";
  if (/windows nt 10|windows nt 11|win32|win64|windows/i.test(combined)) os = "Windows";
  else if (/ipad|tablet|playbook|silk/i.test(combined)) os = "iPadOS / Tablet";
  else if (/iphone|ipod|ios/i.test(combined)) os = "iOS";
  else if (/android/i.test(combined)) os = "Android";
  else if (/cros/i.test(combined)) os = "ChromeOS";
  else if (/mac os x|macintosh|darwin/i.test(combined)) os = "macOS";
  else if (/linux|x11|ubuntu|fedora|debian/i.test(combined)) os = "Linux";

  let deviceCategory: "desktop" | "mobile" | "tablet" = "desktop";
  if (/ipad|tablet/i.test(combined) || (/android/i.test(combined) && !/mobile/i.test(combined))) {
    deviceCategory = "tablet";
  } else if (/iphone|ipod|android.*mobile|mobile|blackberry|iemobile|opera mini/i.test(combined)) {
    deviceCategory = "mobile";
  }

  let browser = "Navegador Web";
  if (/edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = "Opera";
  else if (/firefox|fxios/i.test(ua)) browser = "Mozilla Firefox";
  else if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) browser = "Google Chrome";
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = "Safari";

  const isPwaInstalled =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.matchMedia?.("(display-mode: window-controls-overlay)")?.matches ||
      (navigator as any)?.standalone === true);

  const categoryPrefix =
    deviceCategory === "desktop"
      ? "Computador"
      : deviceCategory === "tablet"
      ? "Tablet"
      : "Celular";

  const deviceLabel = `${categoryPrefix} ${os} · ${browser}`;
  const screenResolution =
    typeof window !== "undefined" && window.screen
      ? `${window.screen.width}×${window.screen.height}`
      : "--";

  const appOrigin = typeof window !== "undefined" ? window.location.hostname : "";
  const nowIso = new Date().toISOString();

  return {
    deviceId: getOrCreateDeviceId(),
    email: (email || "").trim().toLowerCase(),
    userId,
    deviceCategory,
    os,
    browser,
    deviceLabel,
    isPwaInstalled: Boolean(isPwaInstalled),
    screenResolution,
    pinEnabled: isPinSecurityActive(email),
    firstSeenAt: nowIso,
    lastActiveAt: nowIso,
    loginEpoch: getDeviceLoginEpoch(),
    appOrigin,
  };
}

function getLocalCacheKey(tenantId?: string | null, email?: string): string {
  const scope = tenantId || (email ? email.trim().toLowerCase() : "default");
  return `${LOCAL_SESSIONS_PREFIX}${scope}`;
}

export function readLocalDeviceSessions(tenantId?: string | null, email?: string): DeviceSessionsCloudPayload {
  try {
    const raw = localStorage.getItem(getLocalCacheKey(tenantId, email));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
        revokedDevices: parsed?.revokedDevices && typeof parsed.revokedDevices === "object" ? parsed.revokedDevices : {},
      };
    }
  } catch {}
  return { sessions: [], revokedDevices: {} };
}

function writeLocalDeviceSessions(
  payload: DeviceSessionsCloudPayload,
  tenantId?: string | null,
  email?: string
) {
  try {
    localStorage.setItem(getLocalCacheKey(tenantId, email), JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("gm:device_sessions_updated", { detail: payload.sessions }));
  } catch {}
}

function isValidUuid(val?: string | null): boolean {
  return Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
}

function normalizeEmailMatch(a?: string, b?: string): boolean {
  if (!a || !b) return true;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function sortSessions(sessions: DeviceSession[], currentDeviceId: string): DeviceSession[] {
  return [...sessions].sort((a, b) => {
    if (a.deviceId === currentDeviceId) return -1;
    if (b.deviceId === currentDeviceId) return 1;
    return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
  });
}

async function fetchCloudSettingsRow(tenantId: string | null, userId?: string): Promise<{
  rowId: string | null;
  appPlansConfig: Record<string, any>;
}> {
  const validTid = isValidUuid(tenantId) ? tenantId : null;

  if (validTid) {
    const { data, error } = await supabase
      .from("app_settings")
      .select("id, app_plans_config")
      .eq("tenant_id", validTid)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        rowId: data.id,
        appPlansConfig:
          data.app_plans_config && typeof data.app_plans_config === "object"
            ? data.app_plans_config
            : {},
      };
    }
  }

  if (tenantId === MASTER_TENANT_ID) {
    const { data, error } = await supabase
      .from("app_settings")
      .select("id, app_plans_config")
      .eq("id", MASTER_RECORD_ID)
      .maybeSingle();

    if (!error && data) {
      return {
        rowId: data.id,
        appPlansConfig:
          data.app_plans_config && typeof data.app_plans_config === "object"
            ? data.app_plans_config
            : {},
      };
    }
  }

  if (isValidUuid(userId)) {
    const { data, error } = await supabase
      .from("app_settings")
      .select("id, app_plans_config")
      .eq("owner", userId)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        rowId: data.id,
        appPlansConfig:
          data.app_plans_config && typeof data.app_plans_config === "object"
            ? data.app_plans_config
            : {},
      };
    }
  }

  return { rowId: null, appPlansConfig: {} };
}

async function persistCloudSessionsPayload(params: {
  tenantId: string | null;
  userId?: string;
  rowId: string | null;
  existingAppPlansConfig: Record<string, any>;
  payload: DeviceSessionsCloudPayload;
}): Promise<boolean> {
  const { tenantId, userId, rowId, existingAppPlansConfig, payload } = params;

  // Prune revoked entries older than 30 days to keep JSON compact
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const cleanedRevoked: Record<string, string> = {};
  for (const [devId, ts] of Object.entries(payload.revokedDevices || {})) {
    const ms = new Date(ts).getTime();
    if (Number.isFinite(ms) && ms > thirtyDaysAgo) {
      cleanedRevoked[devId] = ts;
    }
  }

  const nextAppPlansConfig = {
    ...(existingAppPlansConfig || {}),
    device_sessions: payload.sessions,
    revoked_devices: cleanedRevoked,
    device_sessions_updated_at: new Date().toISOString(),
  };

  // Keep local settings cache in sync so other saves preserve device_sessions
  try {
    const cachedSettings = readSettingsLocal(tenantId);
    if (cachedSettings) {
      writeSettingsLocal(
        {
          ...cachedSettings,
          app_plans_config: nextAppPlansConfig,
        },
        tenantId
      );
    }
  } catch {}

  if (rowId) {
    const { error } = await supabase
      .from("app_settings")
      .update({ app_plans_config: nextAppPlansConfig })
      .eq("id", rowId);
    return !error;
  }

  if (isValidUuid(tenantId)) {
    const insertData: Record<string, any> = {
      tenant_id: tenantId,
      app_plans_config: nextAppPlansConfig,
    };
    if (isValidUuid(userId)) {
      insertData.owner = userId;
    }
    const { error } = await supabase.from("app_settings").insert(insertData);
    return !error;
  }

  return false;
}

export function extractPayloadFromConfig(
  appPlansConfig: Record<string, any>,
  email?: string
): DeviceSessionsCloudPayload {
  const rawSessions: DeviceSession[] = Array.isArray(appPlansConfig?.device_sessions)
    ? appPlansConfig.device_sessions
    : [];
  const filteredSessions = email
    ? rawSessions.filter((s) => normalizeEmailMatch(s.email, email))
    : rawSessions;

  const revokedDevices: Record<string, string> =
    appPlansConfig?.revoked_devices && typeof appPlansConfig.revoked_devices === "object"
      ? appPlansConfig.revoked_devices
      : {};

  return {
    sessions: filteredSessions,
    revokedDevices,
  };
}

/**
 * Registra ou atualiza o heartbeat deste dispositivo na nuvem e verifica se foi desvinculado remotamente.
 */
export async function registerOrHeartbeatDeviceSession(params: {
  tenantId: string | null;
  userId?: string;
  email: string;
  forceWrite?: boolean;
}): Promise<{ revoked: boolean; sessions: DeviceSession[] }> {
  const { tenantId, userId, email, forceWrite = false } = params;
  const currentDeviceId = getOrCreateDeviceId();
  const currentLoginEpoch = getDeviceLoginEpoch();
  const profile = detectCurrentDeviceProfile(email, userId);

  try {
    const { rowId, appPlansConfig } = await fetchCloudSettingsRow(tenantId, userId);
    const cloud = extractPayloadFromConfig(appPlansConfig);

    // Verifica se este dispositivo foi explicitamente desvinculado após o início da sessão atual
    const revokedIso = cloud.revokedDevices[currentDeviceId];
    if (revokedIso) {
      const revokedMs = new Date(revokedIso).getTime();
      if (Number.isFinite(revokedMs) && revokedMs > currentLoginEpoch) {
        writeLocalDeviceSessions(cloud, tenantId, email);
        return {
          revoked: true,
          sessions: sortSessions(
            cloud.sessions.filter((s) => normalizeEmailMatch(s.email, email)),
            currentDeviceId
          ),
        };
      }
    }

    const existingIdx = cloud.sessions.findIndex(
      (s) => s.deviceId === currentDeviceId && normalizeEmailMatch(s.email, email)
    );
    const existing = existingIdx >= 0 ? cloud.sessions[existingIdx] : null;

    const updatedCurrent: DeviceSession = {
      ...profile,
      firstSeenAt: existing?.firstSeenAt || profile.firstSeenAt,
      lastActiveAt: new Date().toISOString(),
    };

    const mergedAllSessions = [...cloud.sessions];
    if (existingIdx >= 0) {
      mergedAllSessions[existingIdx] = updatedCurrent;
    } else {
      mergedAllSessions.unshift(updatedCurrent);
    }

    // Limpa marcação de revogação antiga caso o usuário tenha feito um novo login válido depois
    const nextRevoked = { ...cloud.revokedDevices };
    if (nextRevoked[currentDeviceId]) {
      delete nextRevoked[currentDeviceId];
    }

    const nextPayload: DeviceSessionsCloudPayload = {
      sessions: mergedAllSessions,
      revokedDevices: nextRevoked,
    };

    // Escreve na nuvem se é sessão nova, mudou algo relevante (PWA/PIN) ou passou > 45s do último heartbeat
    let lastSyncTs = 0;
    try {
      lastSyncTs = Number(localStorage.getItem(LAST_HEARTBEAT_TS_KEY) || "0");
    } catch {}

    const changed =
      !existing ||
      existing.isPwaInstalled !== updatedCurrent.isPwaInstalled ||
      existing.pinEnabled !== updatedCurrent.pinEnabled ||
      existing.browser !== updatedCurrent.browser ||
      existing.os !== updatedCurrent.os;

    const shouldWriteCloud = forceWrite || changed || Date.now() - lastSyncTs > 45000;

    if (shouldWriteCloud) {
      const ok = await persistCloudSessionsPayload({
        tenantId,
        userId,
        rowId,
        existingAppPlansConfig: appPlansConfig,
        payload: nextPayload,
      });
      if (ok) {
        try {
          localStorage.setItem(LAST_HEARTBEAT_TS_KEY, String(Date.now()));
        } catch {}
      }
    }

    const userSessions = sortSessions(
      mergedAllSessions.filter((s) => normalizeEmailMatch(s.email, email)),
      currentDeviceId
    );
    writeLocalDeviceSessions({ sessions: userSessions, revokedDevices: nextRevoked }, tenantId, email);

    return { revoked: false, sessions: userSessions };
  } catch {
    const cached = readLocalDeviceSessions(tenantId, email);
    const idx = cached.sessions.findIndex((s) => s.deviceId === currentDeviceId);
    const nextList = [...cached.sessions];
    if (idx >= 0) {
      nextList[idx] = { ...profile, firstSeenAt: nextList[idx].firstSeenAt };
    } else {
      nextList.unshift(profile);
    }
    const sorted = sortSessions(nextList, currentDeviceId);
    writeLocalDeviceSessions({ sessions: sorted, revokedDevices: cached.revokedDevices }, tenantId, email);
    return { revoked: false, sessions: sorted };
  }
}

/**
 * Busca a lista atualizada de computadores e dispositivos com sessão ativa.
 */
export async function fetchActiveDeviceSessions(params: {
  tenantId: string | null;
  userId?: string;
  email?: string;
}): Promise<DeviceSession[]> {
  const { tenantId, userId, email } = params;
  const currentDeviceId = getOrCreateDeviceId();

  try {
    const { appPlansConfig } = await fetchCloudSettingsRow(tenantId, userId);
    const cloud = extractPayloadFromConfig(appPlansConfig, email);
    const sorted = sortSessions(cloud.sessions, currentDeviceId);
    writeLocalDeviceSessions({ sessions: sorted, revokedDevices: cloud.revokedDevices }, tenantId, email);
    return sorted;
  } catch {
    const cached = readLocalDeviceSessions(tenantId, email);
    return sortSessions(cached.sessions, currentDeviceId);
  }
}

/**
 * Desvincula um computador/dispositivo específico (atual ou remoto).
 */
export async function unlinkDeviceSession(params: {
  tenantId: string | null;
  userId?: string;
  email?: string;
  targetDeviceId: string;
}): Promise<{ ok: boolean; isCurrentDevice: boolean; sessions: DeviceSession[] }> {
  const { tenantId, userId, email, targetDeviceId } = params;
  const currentDeviceId = getOrCreateDeviceId();
  const isCurrentDevice = targetDeviceId === currentDeviceId;

  try {
    const { rowId, appPlansConfig } = await fetchCloudSettingsRow(tenantId, userId);
    const cloud = extractPayloadFromConfig(appPlansConfig);

    const nextSessions = cloud.sessions.filter((s) => s.deviceId !== targetDeviceId);
    const nextRevoked = {
      ...cloud.revokedDevices,
      [targetDeviceId]: new Date().toISOString(),
    };

    await persistCloudSessionsPayload({
      tenantId,
      userId,
      rowId,
      existingAppPlansConfig: appPlansConfig,
      payload: { sessions: nextSessions, revokedDevices: nextRevoked },
    });

    const userSessions = sortSessions(
      nextSessions.filter((s) => normalizeEmailMatch(s.email, email)),
      currentDeviceId
    );
    writeLocalDeviceSessions({ sessions: userSessions, revokedDevices: nextRevoked }, tenantId, email);

    return { ok: true, isCurrentDevice, sessions: userSessions };
  } catch {
    return {
      ok: false,
      isCurrentDevice,
      sessions: readLocalDeviceSessions(tenantId, email).sessions,
    };
  }
}

/**
 * Desvincula todos os outros computadores/dispositivos conectados à conta, mantendo apenas este.
 */
export async function unlinkAllOtherDevices(params: {
  tenantId: string | null;
  userId?: string;
  email: string;
}): Promise<{ ok: boolean; unlinkedCount: number; sessions: DeviceSession[] }> {
  const { tenantId, userId, email } = params;
  const currentDeviceId = getOrCreateDeviceId();

  try {
    const { rowId, appPlansConfig } = await fetchCloudSettingsRow(tenantId, userId);
    const cloud = extractPayloadFromConfig(appPlansConfig);

    const nowIso = new Date().toISOString();
    const nextRevoked = { ...cloud.revokedDevices };
    let unlinkedCount = 0;

    const keptSessions = cloud.sessions.filter((s) => {
      if (!normalizeEmailMatch(s.email, email)) return true;
      if (s.deviceId === currentDeviceId) return true;
      nextRevoked[s.deviceId] = nowIso;
      unlinkedCount += 1;
      return false;
    });

    await persistCloudSessionsPayload({
      tenantId,
      userId,
      rowId,
      existingAppPlansConfig: appPlansConfig,
      payload: { sessions: keptSessions, revokedDevices: nextRevoked },
    });

    // Encerra outros refresh tokens no Supabase Auth quando houver sessão JWT ativa
    try {
      await supabase.auth.signOut({ scope: "others" });
    } catch {}

    const userSessions = sortSessions(
      keptSessions.filter((s) => normalizeEmailMatch(s.email, email)),
      currentDeviceId
    );
    writeLocalDeviceSessions({ sessions: userSessions, revokedDevices: nextRevoked }, tenantId, email);

    return { ok: true, unlinkedCount, sessions: userSessions };
  } catch {
    return {
      ok: false,
      unlinkedCount: 0,
      sessions: readLocalDeviceSessions(tenantId, email).sessions,
    };
  }
}

/**
 * Remove este dispositivo da lista ativa quando o usuário clica em Sair.
 */
export async function removeCurrentDeviceOnSignOut(params: {
  tenantId: string | null;
  userId?: string;
  email?: string;
}): Promise<void> {
  const { tenantId, userId, email } = params;
  const currentDeviceId = getOrCreateDeviceId();
  try {
    const { rowId, appPlansConfig } = await fetchCloudSettingsRow(tenantId, userId);
    if (!rowId) return;
    const cloud = extractPayloadFromConfig(appPlansConfig);
    const nextSessions = cloud.sessions.filter(
      (s) => !(s.deviceId === currentDeviceId && normalizeEmailMatch(s.email, email))
    );
    await persistCloudSessionsPayload({
      tenantId,
      userId,
      rowId,
      existingAppPlansConfig: appPlansConfig,
      payload: { sessions: nextSessions, revokedDevices: cloud.revokedDevices },
    });
  } catch {}
}
