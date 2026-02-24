
// lib/settings.ts
import { supabase } from "./supabase";

export type ThemePreset = {
  name: string;
  brand_primary: string;
  brand_accent: string;
  brand_bg: string;
  font_family: string;
};

export type AppSettings = {
  id?: string;
  tenant_id?: string | null;
  owner?: string | null;

  company_name?: string | null;
  pix_key?: string | null;
  pix_type?: string | null;

  brand_primary?: string | null;
  brand_accent?: string | null;
  brand_bg?: string | null;
  font_family?: string | null;

  avatar_url?: string | null;
  company_logo_url?: string | null;
  company_logo_scale?: number;
  timbrado_url?: string | null;

  theme_presets?: ThemePreset[] | any;

  app_background_url?: string | null;
  app_background_fit?: string | null; // cover/contain
  app_background_opacity?: number | null;
  app_background_pos_x?: string;
  app_background_pos_y?: string;
  app_background_scale?: number;
  app_background_blur?: number;
  
  // Alarm Settings
  budget_approved_reminder_enabled?: boolean | null;
  budget_approved_reminder_times?: string[] | null;

  created_at?: string;
  updated_at?: string;
};

export const DEFAULT_REMINDER_TIMES = ['09:00', '13:00', '17:00'];

const LOCAL_KEY = "gm.settings.cache.v1";

export function applySettingsToDOM(s: AppSettings) {
  const root = document.documentElement;

  if (s.brand_primary) {
    root.style.setProperty("--gm-primary", s.brand_primary);
    root.style.setProperty("--brand-primary", s.brand_primary);
  }
  
  if (s.brand_accent) {
    root.style.setProperty("--gm-accent", s.brand_accent);
    root.style.setProperty("--brand-accent", s.brand_accent);
  }

  if (s.brand_bg) {
    root.style.setProperty("--gm-bg", s.brand_bg);
    root.style.setProperty("--brand-bg", s.brand_bg);
  }

  if (s.font_family) {
    root.style.setProperty("--gm-font", s.font_family);
    root.style.setProperty("--app-font", s.font_family);
  }

  // Background do app (imagem)
  root.style.setProperty("--gm-app-bg-url", s.app_background_url ? `url("${s.app_background_url}")` : "none");
  root.style.setProperty("--gm-app-bg-fit", String(s.app_background_fit || "cover"));
  root.style.setProperty("--gm-app-bg-opacity", String(s.app_background_opacity ?? 0));
  root.style.setProperty("--gm-app-bg-pos-x", s.app_background_pos_x || "50%");
  root.style.setProperty("--gm-app-bg-pos-y", s.app_background_pos_y || "50%");
  root.style.setProperty("--gm-app-bg-scale", String(s.app_background_scale ?? 1));
  root.style.setProperty("--gm-app-bg-blur", (s.app_background_blur ?? 10) + "px");

  // ✅ auto-dimming do blur
  const op = Number(s.app_background_opacity ?? 0);
  const blur = Number(s.app_background_blur ?? 10);
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const factor = clamp(op * 1.2, 0.25, 1);
  const effectiveBlur = Math.round(blur * factor);
  root.style.setProperty("--gm-app-bg-blur-effective", `${effectiveBlur}px`);

  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(s));
  } catch {}
}

export function readSettingsLocal(): AppSettings | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const DEFAULT_SETTINGS: any = {
  primary_color: "#ff7a00",
  background_url: "",
  logo_url: "",
  company_name: "GM edificação",
};

async function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("Timeout")), ms)),
  ]);
}

export async function fetchSettingsSupabase(tenantId?: string | null) {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const owner = sess.session?.user?.id;

    let q = supabase.from("app_settings").select("*").limit(1);

    if (tenantId) q = q.eq("tenant_id", tenantId);
    else if (owner) q = q.eq("owner", owner);
    else q = q.is("tenant_id", null);

    const { data, error } = await withTimeout<any>(q.maybeSingle() as any, 8000);

    if (error) {
      console.error("fetchSettings error:", error);
      return DEFAULT_SETTINGS;
    }

    return (data as AppSettings) || DEFAULT_SETTINGS;
  } catch (e: any) {
    console.error("fetchSettings error:", e?.message || e);
    return DEFAULT_SETTINGS; // ✅ nunca trava
  }
}

export async function upsertSettingsSupabase(
  tenantId: string | null,
  patch: Partial<AppSettings>
) {
  const { data: sess } = await supabase.auth.getSession();
  const owner = sess.session?.user?.id || null;

  const payload: AppSettings = {
    ...patch,
    tenant_id: tenantId || null,
    owner
  };

  if (payload.app_background_opacity != null) {
    const v = Number(payload.app_background_opacity);
    payload.app_background_opacity = Number.isFinite(v) ? v : 0.18;
  }

  // normaliza horários
  if (payload.budget_approved_reminder_times) {
    payload.budget_approved_reminder_times = normalizeReminderTimes(payload.budget_approved_reminder_times);
  }

  const { data, error } = await supabase
    .from("app_settings")
    .upsert(payload, { onConflict: "tenant_id" })
    .select("*")
    .single();

  if (error) throw error;

  const settings = data as AppSettings;
  applySettingsToDOM(settings);
  return settings;
}

// Aliases for compatibility with new modules
export const getAppSettings = (tenantId: string) => fetchSettingsSupabase(tenantId);
export const upsertAppSettings = (tenantId: string, patch: Partial<AppSettings>) => upsertSettingsSupabase(tenantId, patch);

export function normalizeReminderTimes(times?: string[] | null): string[] {
  const safe = (times && times.length ? times : DEFAULT_REMINDER_TIMES).slice(0, 3);
  while (safe.length < 3) safe.push(DEFAULT_REMINDER_TIMES[safe.length] || '09:00');
  return safe.map(t => (t || '').trim()).map(t => (/^\d{2}:\d{2}$/.test(t) ? t : '09:00'));
}
