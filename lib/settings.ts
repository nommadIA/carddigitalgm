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

export const DEFAULT_REMINDER_TIMES = ["09:00", "13:00", "17:00"];

const LOCAL_KEY = "gm.settings.cache.v1";

/**
 * ✅ DEFAULT com shape certo (inclui timbrado_url)
 * Mantém também chaves antigas por compatibilidade.
 */
const DEFAULT_SETTINGS: AppSettings & any = {
  company_name: "GM edificação",
  pix_type: "CPF",
  pix_key: "",
  brand_primary: "#ff7a00",
  brand_accent: "#3B82F6",
  brand_bg: "#0b1220",
  font_family: "Inter",
  avatar_url: null,
  company_logo_url: null,
  timbrado_url: null,
  theme_presets: [],
  app_background_url: null,
  app_background_fit: "cover",
  app_background_opacity: 0.18,
  app_background_pos_x: "50%",
  app_background_pos_y: "50%",
  app_background_scale: 1,
  app_background_blur: 10,
  budget_approved_reminder_enabled: false,
  budget_approved_reminder_times: DEFAULT_REMINDER_TIMES,

  // compat antigos (se algum código ainda usar)
  primary_color: "#ff7a00",
  background_url: "",
  logo_url: "",
};

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

async function withTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("Timeout")), ms)),
  ]);
}

/**
 * ✅ FIX PRINCIPAL:
 * - Se pedir por tenantId e não existir registro, tenta buscar por owner.
 * - Se achar por owner (tenant_id null), MIGRA/CLONA para o tenant automaticamente.
 * Isso resolve o erro do timbrado no PDF sem você refazer upload.
 */
export async function fetchSettingsSupabase(tenantId?: string | null) {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const owner = sess.session?.user?.id;

    // 1) tenta direto pelo tenant
    if (tenantId) {
      const { data: byTenant, error: errTenant } = await withTimeout<any>(
        supabase.from("app_settings").select("*").eq("tenant_id", tenantId).maybeSingle() as any,
        15000
      );

      if (errTenant) {
        console.warn("fetchSettings warn (tenant):", errTenant);
        // continua fallback
      } else if (byTenant) {
        return (byTenant as AppSettings) || DEFAULT_SETTINGS;
      }

      // 2) fallback: tenta por owner (geralmente tenant_id null)
      if (owner) {
        const { data: byOwner, error: errOwner } = await withTimeout<any>(
          supabase.from("app_settings").select("*").eq("owner", owner).maybeSingle() as any,
          15000
        );

        if (errOwner) {
          console.warn("fetchSettings warn (owner):", errOwner);
          return DEFAULT_SETTINGS;
        }

        if (byOwner) {
          // 3) migra/clona para o tenant (sem id/created_at/updated_at)
          const clone: any = { ...(byOwner as any) };
          delete clone.id;
          delete clone.created_at;
          delete clone.updated_at;

          clone.tenant_id = tenantId;
          clone.owner = owner;

          const { data: migrated, error: errUpsert } = await supabase
            .from("app_settings")
            .upsert(clone, { onConflict: "tenant_id" })
            .select("*")
            .single();

          if (errUpsert) {
            console.error("settings migrate error:", errUpsert);
            // se falhar migração, pelo menos devolve o do owner para não travar
            return (byOwner as AppSettings) || DEFAULT_SETTINGS;
          }

          return (migrated as AppSettings) || DEFAULT_SETTINGS;
        }
      }

      return DEFAULT_SETTINGS;
    }

    // (sem tenantId) comportamento antigo
    let q = supabase.from("app_settings").select("*").limit(1);

    if (owner) q = q.eq("owner", owner);
    else q = q.is("tenant_id", null);

    const { data, error } = await withTimeout<any>(q.maybeSingle() as any, 15000);

    if (error) {
      console.warn("fetchSettings warn:", error);
      return DEFAULT_SETTINGS;
    }

    return (data as AppSettings) || DEFAULT_SETTINGS;
  } catch (e: any) {
    console.warn("fetchSettings warn:", e?.message || e);
    return DEFAULT_SETTINGS; // ✅ nunca trava
  }
}

export async function upsertSettingsSupabase(tenantId: string | null, patch: Partial<AppSettings>) {
  const { data: sess } = await supabase.auth.getSession();
  const owner = sess.session?.user?.id || null;

  const payload: AppSettings = {
    ...patch,
    tenant_id: tenantId || null,
    owner,
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

// Aliases for compatibility
export const getAppSettings = (tenantId: string) => fetchSettingsSupabase(tenantId);
export const upsertAppSettings = (tenantId: string, patch: Partial<AppSettings>) =>
  upsertSettingsSupabase(tenantId, patch);

export function normalizeReminderTimes(times?: string[] | null): string[] {
  const safe = (times && times.length ? times : DEFAULT_REMINDER_TIMES).slice(0, 3);
  while (safe.length < 3) safe.push(DEFAULT_REMINDER_TIMES[safe.length] || "09:00");
  return safe
    .map((t) => (t || "").trim())
    .map((t) => (/^\d{2}:\d{2}$/.test(t) ? t : "09:00"));
}