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

  app_scale?: number | null;
  mobile_scale?: number | null;

  button_style?: string | null; // glass-1, glass-2, etc.

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
  app_scale: 2.0,
  mobile_scale: 1.5,
  button_style: "solid",
  budget_approved_reminder_enabled: false,
  budget_approved_reminder_times: DEFAULT_REMINDER_TIMES,

  // compat antigos (se algum código ainda usar)
  primary_color: "#ff7a00",
  background_url: "",
  logo_url: "",
};

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function getContrastColor(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  // Formula de luminosidade (YIQ)
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff";
}

export function applySettingsToDOM(s: AppSettings, persist = true) {
  const root = document.documentElement;

  if (s.brand_primary) {
    root.style.setProperty("--gm-primary", s.brand_primary);
    root.style.setProperty("--brand-primary", s.brand_primary);
    
    const rgb = hexToRgb(s.brand_primary);
    if (rgb) {
      root.style.setProperty("--gm-primary-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }

    // Calcula e aplica a cor de contraste para o texto sobre o primário
    const contrast = getContrastColor(s.brand_primary);
    root.style.setProperty("--gm-primary-foreground", contrast);
  }

  if (s.brand_accent) {
    root.style.setProperty("--gm-accent", s.brand_accent);
    root.style.setProperty("--brand-accent", s.brand_accent);

    const rgb = hexToRgb(s.brand_accent);
    if (rgb) {
      root.style.setProperty("--gm-accent-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
  }

  if (s.brand_bg) {
    root.style.setProperty("--gm-bg", s.brand_bg);
    root.style.setProperty("--brand-bg", s.brand_bg);
  }

  if (s.font_family) {
    root.style.setProperty("--gm-font", s.font_family);
    root.style.setProperty("--app-font", s.font_family);
  }

  if (s.button_style) {
    root.setAttribute("data-button-style", s.button_style);
  } else {
    const fallback = localStorage.getItem("gm_button_style_fallback") || "solid";
    root.setAttribute("data-button-style", fallback);
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

  // ✅ Escala Global do App (Zoom)
  const scale = s.app_scale ?? Number(localStorage.getItem("gm_app_scale_fallback") || 2.0);
  const mobileScale = s.mobile_scale ?? 1.5;
  
  root.style.setProperty("--gm-app-scale", String(scale));
  root.style.setProperty("--gm-mobile-scale", String(mobileScale));
  
  // Se o usuário quer que o máximo (2) seja o tamanho normal (100%), multiplicamos por 50
  // root.style.fontSize = `${scale * 50}%`; // Removido, agora é feito no CSS via media query

  if (persist) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(s));
    } catch {}
  }
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

async function withTimeout<T>(p: Promise<T>, ms = 3000): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("Timeout")), ms)),
  ]);
}

function mergeWithFallbacks(data: any): AppSettings {
  const settings = { ...DEFAULT_SETTINGS, ...(data || {}) };
  
  // Fallback para button_style
  if (!data?.button_style) {
    const localStyle = localStorage.getItem("gm_button_style_fallback");
    if (localStyle) settings.button_style = localStyle;
  }
  
  // Fallback para app_scale
  if (data?.app_scale === undefined || data?.app_scale === null) {
    const localScale = localStorage.getItem("gm_app_scale_fallback");
    if (localScale) settings.app_scale = Number(localScale);
  }

  // Fallback para mobile_scale
  if (data?.mobile_scale === undefined || data?.mobile_scale === null) {
    const localMobileScale = localStorage.getItem("gm_mobile_scale_fallback");
    if (localMobileScale) settings.mobile_scale = Number(localMobileScale);
  }
  
  return settings;
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
      // Tentamos buscar as configurações. Se falhar por coluna inexistente, tentamos sem button_style.
      const { data: byTenant, error: errTenant } = await withTimeout<any>(
        supabase.from("app_settings").select("*").eq("tenant_id", tenantId).maybeSingle() as any,
        15000
      );

      if (errTenant) {
        if (errTenant.code === "PGRST204" || errTenant.message?.includes("button_style") || errTenant.message?.includes("app_scale") || errTenant.message?.includes("mobile_scale") || errTenant.code === "42703") {
           const { data: retryData } = await supabase
             .from("app_settings")
             .select("id, tenant_id, owner, company_name, pix_key, pix_type, brand_primary, brand_accent, brand_bg, font_family, avatar_url, company_logo_url, company_logo_scale, timbrado_url, theme_presets, app_background_url, app_background_fit, app_background_opacity, app_background_pos_x, app_background_pos_y, app_background_scale, app_background_blur, budget_approved_reminder_enabled, budget_approved_reminder_times")
             .eq("tenant_id", tenantId)
             .maybeSingle();
           if (retryData) {
             return mergeWithFallbacks(retryData);
           }
        }
        console.warn("fetchSettings warn (tenant):", errTenant);
      } else if (byTenant) {
        return mergeWithFallbacks(byTenant);
      }

      // 2) fallback: tenta por owner (geralmente tenant_id null)
      if (owner) {
        const { data: byOwner, error: errOwner } = await withTimeout<any>(
          supabase.from("app_settings").select("*").eq("owner", owner).maybeSingle() as any,
          15000
        );

        if (errOwner) {
          if (errOwner.code === "PGRST204" || errOwner.message?.includes("button_style") || errOwner.message?.includes("app_scale") || errOwner.message?.includes("mobile_scale") || errOwner.code === "42703") {
             const { data: retryData } = await supabase
               .from("app_settings")
               .select("id, tenant_id, owner, company_name, pix_key, pix_type, brand_primary, brand_accent, brand_bg, font_family, avatar_url, company_logo_url, company_logo_scale, timbrado_url, theme_presets, app_background_url, app_background_fit, app_background_opacity, app_background_pos_x, app_background_pos_y, app_background_scale, app_background_blur, budget_approved_reminder_enabled, budget_approved_reminder_times")
               .eq("owner", owner)
               .maybeSingle();
             if (retryData) {
               return mergeWithFallbacks(retryData);
             }
          }
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
            .select("id, tenant_id, owner, company_name, pix_key, pix_type, brand_primary, brand_accent, brand_bg, font_family, avatar_url, company_logo_url, company_logo_scale, timbrado_url, theme_presets, app_background_url, app_background_fit, app_background_opacity, app_background_pos_x, app_background_pos_y, app_background_scale, app_background_blur, budget_approved_reminder_enabled, budget_approved_reminder_times, app_scale, button_style")
            .single();

          if (errUpsert) {
            if (errUpsert.code === "PGRST204" || errUpsert.message?.includes("button_style") || errUpsert.message?.includes("app_scale") || errUpsert.message?.includes("mobile_scale") || errUpsert.code === "42703") {
               const { button_style, app_scale, mobile_scale, ...safeClone } = clone as any;
               const { data: retryMigrate } = await supabase
                 .from("app_settings")
                 .upsert(safeClone, { onConflict: "tenant_id" })
                 .select("id, tenant_id, owner, company_name, pix_key, pix_type, brand_primary, brand_accent, brand_bg, font_family, avatar_url, company_logo_url, company_logo_scale, timbrado_url, theme_presets, app_background_url, app_background_fit, app_background_opacity, app_background_pos_x, app_background_pos_y, app_background_scale, app_background_blur, budget_approved_reminder_enabled, budget_approved_reminder_times")
                 .single();
               if (retryMigrate) return mergeWithFallbacks(retryMigrate);
            }
            console.error("settings migrate error:", errUpsert);
            // se falhar migração, pelo menos devolve o do owner para não travar
            return mergeWithFallbacks(byOwner);
          }

          return mergeWithFallbacks(migrated);
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

    return mergeWithFallbacks(data);
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

  // Sempre salva no localStorage para garantir
  if (payload.button_style) {
    localStorage.setItem("gm_button_style_fallback", payload.button_style);
  }
  if (payload.app_scale != null) {
    localStorage.setItem("gm_app_scale_fallback", String(payload.app_scale));
  }
  if (payload.mobile_scale != null) {
    localStorage.setItem("gm_mobile_scale_fallback", String(payload.mobile_scale));
  }

  // Remove button_style do payload se soubermos que a coluna não existe (opcional, mas evita erro no console)
  // Como não sabemos, vamos tentar. Se falhar, avisamos.
  const { data, error } = await supabase
    .from("app_settings")
    .upsert(payload, { onConflict: "tenant_id" })
    .select("*")
    .single();

  if (error) {
    // Se falhar por coluna inexistente, tenta salvar sem o button_style ou app_scale
    if (error.code === "PGRST204" || error.message?.includes("button_style") || error.message?.includes("app_scale") || error.message?.includes("mobile_scale") || error.code === "42703") {
       const { button_style, app_scale, mobile_scale, ...safePayload } = payload as any;
       const { data: retryData, error: retryErr } = await supabase
         .from("app_settings")
         .upsert(safePayload, { onConflict: "tenant_id" })
         .select("id, tenant_id, owner, company_name, pix_key, pix_type, brand_primary, brand_accent, brand_bg, font_family, avatar_url, company_logo_url, company_logo_scale, timbrado_url, theme_presets, app_background_url, app_background_fit, app_background_opacity, app_background_pos_x, app_background_pos_y, app_background_scale, app_background_blur, budget_approved_reminder_enabled, budget_approved_reminder_times")
         .single();
       
       if (retryErr) {
         console.error("Erro crítico ao salvar configurações (retry):", retryErr);
         throw retryErr;
       }
       
       // Salva localmente já que não deu no DB
       if (button_style) {
         localStorage.setItem("gm_button_style_fallback", button_style);
       }
       if (app_scale != null) {
         localStorage.setItem("gm_app_scale_fallback", String(app_scale));
       }
       if (mobile_scale != null) {
         localStorage.setItem("gm_mobile_scale_fallback", String(mobile_scale));
       }
       
       const settings = { 
         ...retryData, 
         button_style: button_style || localStorage.getItem("gm_button_style_fallback"),
         app_scale: app_scale ?? Number(localStorage.getItem("gm_app_scale_fallback") || 2.0),
         mobile_scale: mobile_scale ?? Number(localStorage.getItem("gm_mobile_scale_fallback") || 1.5)
       } as AppSettings;
       applySettingsToDOM(settings);
       return settings;
    }
    console.error("Erro ao salvar configurações:", error);
    throw error;
  }

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