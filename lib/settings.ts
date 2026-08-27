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
  brand_title?: string | null;
  brand_subtitle?: string | null;
  brand_icon?: string | null;
  brand_button?: string | null;

  menu_primary?: string | null;
  menu_bg?: string | null;
  menu_title?: string | null;
  menu_subtitle?: string | null;
  menu_icon?: string | null;
  menu_button?: string | null;

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

  mobile_app_background_url?: string | null;
  mobile_app_background_fit?: string | null;
  mobile_app_background_opacity?: number | null;
  mobile_app_background_pos_x?: string;
  mobile_app_background_pos_y?: string;
  mobile_app_background_scale?: number;
  mobile_app_background_blur?: number;

  app_scale?: number | null;
  mobile_scale?: number | null;

  button_style?: string | null; // glass-1, glass-2, solid, vazado, etc.
  button_bg?: string | null;
  button_border?: string | null;
  button_text?: string | null;
  button_icon?: string | null;

  button_config_light?: { style?: string; bg?: string; border?: string; text?: string; icon?: string } | null;
  button_config_dark?: { style?: string; bg?: string; border?: string; text?: string; icon?: string } | null;

  // Alarm Settings
  budget_approved_reminder_enabled?: boolean | null;
  budget_approved_reminder_times?: string[] | null;

  // Bio Info
  bio_config?: Record<string, any> | null;

  created_at?: string;
  updated_at?: string;
};

export const DEFAULT_REMINDER_TIMES = ["09:00", "13:00", "17:00"];

const LOCAL_KEY = "gm.settings.cache.v1";

/**
 * ✅ DEFAULT com shape certo (inclui timbrado_url)
 * Mantém também chaves antigas por compatibilidade.
 */
export const DEFAULT_SETTINGS: AppSettings & any = {
  company_name: "",
  pix_type: "CPF",
  pix_key: "",
  brand_primary: "#FE540B",
  brand_accent: "#FE540B",
  brand_bg: "#0B0B0C",
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
  
  mobile_app_background_url: null,
  mobile_app_background_fit: "cover",
  mobile_app_background_opacity: 0.18,
  mobile_app_background_pos_x: "50%",
  mobile_app_background_pos_y: "50%",
  mobile_app_background_scale: 1.2,
  mobile_app_background_blur: 10,

  app_scale: 1.0,
  mobile_scale: 1.0,
  button_style: "solid",
  budget_approved_reminder_enabled: false,
  budget_approved_reminder_times: DEFAULT_REMINDER_TIMES,
  bio_config: {},

  // compat antigos (se algum código ainda usar)
  primary_color: "#FF7B17",
  background_url: "",
  logo_url: "",
};

export function hexToRgb(hex: string) {
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

export function getTenantStorageKey(tenantId?: string | null): string {
  const tid = tenantId || (typeof localStorage !== "undefined" ? localStorage.getItem("tenant_id") : null);
  return tid ? `gm.settings.cache.${tid}` : LOCAL_KEY;
}

export function applySettingsToDOM(s: AppSettings, persist = true, tenantId?: string | null) {
  const root = document.documentElement;

  // O app é 100% Dark Theme / Dark Glassmorphic (não existe tema claro)
  root.setAttribute("data-theme", "dark");
  root.classList.remove("gm-light", "light");
  root.classList.add("gm-dark", "dark");
  localStorage.setItem("theme", "dark");

  const tid = tenantId || s.tenant_id || (typeof localStorage !== "undefined" ? localStorage.getItem("tenant_id") : null);
  const tenantColors = s.bio_config?.theme_colors_dark;
  const tenantLocalColors = tid && typeof localStorage !== "undefined" ? JSON.parse(localStorage.getItem(`gm_colors_dark_${tid}`) || "null") : null;
  const globalLocalColors = typeof localStorage !== "undefined" ? JSON.parse(localStorage.getItem("gm_colors_dark") || "null") : null;
  const savedDark = tenantLocalColors || globalLocalColors || tenantColors;

  let primary = savedDark?.primary || s.brand_primary || "#FE540B";
  let accent = savedDark?.accent || s.brand_accent || primary || "#FF7A38";
  let bg = savedDark?.bg || s.brand_bg || "#0B0B0C";
  let title = savedDark?.title || "#FFFFFF";
  let subtitle = savedDark?.subtitle || "#CBD5E1";
  let icon = savedDark?.icon || primary;
  let button = savedDark?.button || primary;

  let menu_primary = savedDark?.menu_primary || primary;
  let menu_bg = savedDark?.menu_bg || "#131315";
  let menu_title = savedDark?.menu_title || "#FFFFFF";
  let menu_subtitle = savedDark?.menu_subtitle || "#CBD5E1";
  let menu_icon = savedDark?.menu_icon || primary;
  let menu_button = savedDark?.menu_button || primary;

  // No modo preview (!persist), respeita as cores passadas no objeto s sem sobreescrever com localStorage
  if (!persist) {
    if (s.brand_primary) primary = s.brand_primary;
    if (s.brand_accent) accent = s.brand_accent;
    if (s.brand_bg) bg = s.brand_bg;
    if (s.brand_title) title = s.brand_title;
    if (s.brand_subtitle) subtitle = s.brand_subtitle;
    if (s.brand_icon) icon = s.brand_icon;
    else if (s.brand_primary) icon = s.brand_primary;
    if (s.brand_button) button = s.brand_button;
    else if (s.brand_primary) button = s.brand_primary;

    if (s.menu_primary) menu_primary = s.menu_primary;
    else if (s.brand_primary) menu_primary = s.brand_primary;
    if (s.menu_bg) menu_bg = s.menu_bg;
    if (s.menu_title) menu_title = s.menu_title;
    if (s.menu_subtitle) menu_subtitle = s.menu_subtitle;
    if (s.menu_icon) menu_icon = s.menu_icon;
    else if (s.brand_primary) menu_icon = s.brand_primary;
    if (s.menu_button) menu_button = s.menu_button;
    else if (s.brand_primary) menu_button = s.brand_primary;
  }

  if (primary) {
    root.style.setProperty("--gm-primary", primary);
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--brand-primary", primary);
    
    // Atualiza a cor da barra de status do celular
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", primary);
    }
    
    const rgb = hexToRgb(primary);
    if (rgb) {
      root.style.setProperty("--gm-primary-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }

    // Calcula e aplica a cor de contraste para o texto sobre o primário
    const contrast = getContrastColor(primary);
    root.style.setProperty("--gm-primary-foreground", contrast);
  }

  if (accent) {
    root.style.setProperty("--gm-accent", accent);
    root.style.setProperty("--brand-accent", accent);

    const rgb = hexToRgb(accent);
    if (rgb) {
      root.style.setProperty("--gm-accent-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
  }

  if (bg) {
    root.style.setProperty("--gm-bg", bg);
    root.style.setProperty("--bg", bg);
    root.style.setProperty("--brand-bg", bg);
  }

  if (title) {
    root.style.setProperty("--gm-title", title);
    root.style.setProperty("--text", title);
  }

  if (subtitle) {
    root.style.setProperty("--gm-subtitle", subtitle);
    root.style.setProperty("--text-secondary", subtitle);
  }

  if (icon) {
    root.style.setProperty("--gm-icon", icon);
  }

  if (button) {
    root.style.setProperty("--gm-button", button);
  }

  if (menu_primary) {
    root.style.setProperty("--gm-menu-primary", menu_primary);
  }

  if (menu_bg) {
    root.style.setProperty("--gm-menu-bg", menu_bg);
  }

  if (menu_title) {
    root.style.setProperty("--gm-menu-title", menu_title);
  }

  if (menu_subtitle) {
    root.style.setProperty("--gm-menu-subtitle", menu_subtitle);
  }

  if (menu_icon) {
    root.style.setProperty("--gm-menu-icon", menu_icon);
  }

  if (menu_button) {
    root.style.setProperty("--gm-menu-button", menu_button);
  }

  if (s.font_family) {
    root.style.setProperty("--gm-font", s.font_family);
    root.style.setProperty("--app-font", s.font_family);
  }

  // Configuração dos botões (Modo Escuro / Vidro Fosco Dark)
  const tenantBtn = s.button_config_dark || s.bio_config?.button_config_dark;
  const tenantLocalBtn = tid && typeof localStorage !== "undefined" ? JSON.parse(localStorage.getItem(`gm_button_dark_${tid}`) || "null") : null;
  const savedBtnDark = tenantBtn || tenantLocalBtn;

  let btnStyle = savedBtnDark?.style || s.button_style || "vazado";
  let btnBg = savedBtnDark?.bg ?? (s.button_bg || "transparent");
  let btnBorder = savedBtnDark?.border || s.button_border || primary || "#FF7B17";
  let btnText = savedBtnDark?.text || s.button_text || "#FFFFFF";
  let btnIcon = savedBtnDark?.icon || s.button_icon || primary || "#FF7B17";

  root.setAttribute("data-button-style", btnStyle);
  if (btnBg) root.style.setProperty("--gm-btn-bg", btnBg);
  if (btnBorder) root.style.setProperty("--gm-btn-border", btnBorder);
  if (btnText) root.style.setProperty("--gm-btn-text", btnText);
  else root.style.removeProperty("--gm-btn-text");
  if (btnIcon) root.style.setProperty("--gm-btn-icon", btnIcon);
  else root.style.removeProperty("--gm-btn-icon");

  // Background do app (imagem/video)
  const isVideo = s.app_background_url?.toLowerCase().endsWith(".mp4") || s.app_background_url?.toLowerCase().endsWith(".webm");
  
  if (isVideo) {
    root.style.setProperty("--gm-app-bg-url", "none");
  } else {
    root.style.setProperty("--gm-app-bg-url", s.app_background_url ? `url("${s.app_background_url}")` : "none");
  }
  
  if (s.app_background_url || s.mobile_app_background_url) {
    root.classList.add("gm-has-bg");
    document.body?.classList.add("gm-has-bg");
  } else {
    root.classList.remove("gm-has-bg");
    document.body?.classList.remove("gm-has-bg");
  }
  
  const videoEl = document.getElementById("gm-video-bg") as HTMLVideoElement;
  if (videoEl) {
    if (isVideo && s.app_background_url) {
      if (videoEl.src !== s.app_background_url) {
        videoEl.src = s.app_background_url;
      }
      videoEl.style.display = "block";
    } else {
      videoEl.style.display = "none";
      videoEl.src = "";
    }
  }

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

  // Mobile backgrounds
  root.style.setProperty("--gm-mobile-bg-url", s.mobile_app_background_url ? `url("${s.mobile_app_background_url}")` : (s.app_background_url ? `url("${s.app_background_url}")` : "none"));
  root.style.setProperty("--gm-mobile-bg-fit", String(s.mobile_app_background_fit || s.app_background_fit || "cover"));
  root.style.setProperty("--gm-mobile-bg-opacity", String(s.mobile_app_background_opacity ?? s.app_background_opacity ?? 0));
  root.style.setProperty("--gm-mobile-bg-pos-x", s.mobile_app_background_pos_x || s.app_background_pos_x || "50%");
  root.style.setProperty("--gm-mobile-bg-pos-y", s.mobile_app_background_pos_y || s.app_background_pos_y || "50%");
  root.style.setProperty("--gm-mobile-bg-scale", String(s.mobile_app_background_scale ?? s.app_background_scale ?? 1));
  root.style.setProperty("--gm-mobile-bg-blur", (s.mobile_app_background_blur ?? s.app_background_blur ?? 10) + "px");

  // ✅ auto-dimming do blur (Mobile)
  const mop = Number(s.mobile_app_background_opacity ?? s.app_background_opacity ?? 0);
  const mblur = Number(s.mobile_app_background_blur ?? s.app_background_blur ?? 10);
  const mfactor = clamp(mop * 1.2, 0.25, 1);
  const meffectiveBlur = Math.round(mblur * mfactor);
  root.style.setProperty("--gm-mobile-bg-blur-effective", `${meffectiveBlur}px`);

  // ✅ Escala Global do App (Zoom - Padronizado e proporcional)
  let scale = Number(s.app_scale ?? 1.0);
  if (!Number.isFinite(scale) || scale > 1.35 || scale < 0.75) scale = 1.0;

  let mobileScale = Number(s.mobile_scale ?? 1.0);
  if (!Number.isFinite(mobileScale) || mobileScale > 1.35 || mobileScale < 0.75) mobileScale = 1.0;
  
  s.app_scale = scale;
  s.mobile_scale = mobileScale;

  root.style.setProperty("--gm-app-scale", String(scale));
  root.style.setProperty("--gm-mobile-scale", String(mobileScale));

  if (persist) {
    try {
      writeSettingsLocal(s, tid);
      if (tid) {
        if (savedDark) localStorage.setItem(`gm_colors_dark_${tid}`, JSON.stringify(savedDark));
        if (savedBtnDark) localStorage.setItem(`gm_button_dark_${tid}`, JSON.stringify(savedBtnDark));
      }
    } catch {}
  }

  try {
    window.dispatchEvent(new CustomEvent("gm_settings_updated", { detail: s }));
    window.dispatchEvent(new Event("gm_theme_updated"));
  } catch {}
}

export function writeSettingsLocal(s: AppSettings, tenantId?: string | null) {
  try {
    const tidKey = getTenantStorageKey(tenantId || s.tenant_id);
    localStorage.setItem(tidKey, JSON.stringify(s));
    localStorage.setItem(LOCAL_KEY, JSON.stringify(s));
  } catch {}
}

export function readSettingsLocal(tenantId?: string | null): AppSettings | null {
  try {
    const tidKey = getTenantStorageKey(tenantId);
    let raw = localStorage.getItem(tidKey);
    if (!raw && tidKey !== LOCAL_KEY) {
      raw = localStorage.getItem(LOCAL_KEY);
    }
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
  
  // Extrai customizações de botão de bio_config se existirem
  if (data?.bio_config && typeof data.bio_config === "object") {
    if (!settings.button_style && data.bio_config.button_style) settings.button_style = data.bio_config.button_style;
    if (!settings.button_bg && data.bio_config.button_bg) settings.button_bg = data.bio_config.button_bg;
    if (!settings.button_border && data.bio_config.button_border) settings.button_border = data.bio_config.button_border;
    if (!settings.button_text && data.bio_config.button_text) settings.button_text = data.bio_config.button_text;
    if (!settings.button_icon && data.bio_config.button_icon) settings.button_icon = data.bio_config.button_icon;
  }

  // Fallback para button_style
  if (!settings.button_style) {
    const localStyle = localStorage.getItem("gm_button_style_fallback");
    if (localStyle) settings.button_style = localStyle;
  }

  if (!settings.button_bg) {
    const localBg = localStorage.getItem("gm_button_bg");
    if (localBg) settings.button_bg = localBg;
  }
  if (!settings.button_border) {
    const localBorder = localStorage.getItem("gm_button_border");
    if (localBorder) settings.button_border = localBorder;
  }
  if (!settings.button_text) {
    const localText = localStorage.getItem("gm_button_text");
    if (localText) settings.button_text = localText;
  }
  if (!settings.button_icon) {
    const localIcon = localStorage.getItem("gm_button_icon");
    if (localIcon) settings.button_icon = localIcon;
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
    const { data: sess } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    const owner = sess.session?.user?.id;

    // 1) tenta direto pelo tenant
    if (tenantId) {
      const { data: byTenant, error: errTenant } = await withTimeout<any>(
        supabase.from("app_settings").select("*").eq("tenant_id", tenantId).maybeSingle() as any,
        4000
      ).catch((err) => {
        return { data: null, error: err };
      });

      if (errTenant) {
        const errorMsg = errTenant?.message || String(errTenant);
        const isQuiet = errorMsg.includes("Failed to fetch") || errorMsg.includes("Timeout") || errorMsg.includes("Tempo limite");
        if (!isQuiet) {
          console.warn("fetchSettings warn (tenant):", errorMsg);
        }
        const local = readSettingsLocal(tenantId);
        if (local) return local;
      } else if (byTenant) {
        const merged = mergeWithFallbacks(byTenant);
        writeSettingsLocal(merged, tenantId);
        return merged;
      }

      // 2) fallback: tenta por owner (geralmente tenant_id null)
      if (owner) {
        const { data: byOwner, error: errOwner } = await withTimeout<any>(
          supabase.from("app_settings").select("*").eq("owner", owner).maybeSingle() as any,
          4000
        ).catch((err) => {
          return { data: null, error: err };
        });

        if (errOwner) {
          const errorMsg = errOwner?.message || String(errOwner);
          const isQuiet = errorMsg.includes("Failed to fetch") || errorMsg.includes("Timeout") || errorMsg.includes("Tempo limite");
          if (!isQuiet) {
            console.warn("fetchSettings warn (owner):", errorMsg);
          }
          const local = readSettingsLocal(tenantId);
          if (local) return local;
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

          let migrated: any = null;
          let errUpsert: any = null;
          try {
            const res = await supabase
              .from("app_settings")
              .upsert(clone, { onConflict: "tenant_id" })
              .select("*")
              .single();
            migrated = res.data;
            errUpsert = res.error;
          } catch (err) {
            errUpsert = err;
          }

          if (errUpsert) {
            console.error("settings migrate error:", errUpsert);
            const fallbackOwner = mergeWithFallbacks(byOwner);
            writeSettingsLocal(fallbackOwner, tenantId);
            return fallbackOwner;
          }

          const merged = mergeWithFallbacks(migrated);
          writeSettingsLocal(merged, tenantId);
          return merged;
        }
      }

      const local = readSettingsLocal(tenantId);
      if (local) return local;
      return DEFAULT_SETTINGS;
    }

    // (sem tenantId) comportamento antigo
    let q = supabase.from("app_settings").select("*").limit(1);

    if (owner) q = q.eq("owner", owner);
    else q = q.is("tenant_id", null);

    const { data, error } = await withTimeout<any>(q.maybeSingle() as any, 4000).catch((err) => {
      return { data: null, error: err };
    });

    if (error) {
      const errorMsg = error?.message || String(error);
      const isQuiet = errorMsg.includes("Failed to fetch") || errorMsg.includes("Timeout") || errorMsg.includes("Tempo limite");
      if (!isQuiet) {
        console.warn("fetchSettings warn:", errorMsg);
      }
      const local = readSettingsLocal(null);
      if (local) return local;
      return DEFAULT_SETTINGS;
    }

    const merged = mergeWithFallbacks(data);
    writeSettingsLocal(merged, null);
    return merged;
  } catch (e: any) {
    const errorMsg = e?.message || String(e);
    const isQuiet = errorMsg.includes("Failed to fetch") || errorMsg.includes("Timeout") || errorMsg.includes("Tempo limite");
    if (!isQuiet) {
      console.warn("fetchSettings warn:", errorMsg);
    }
    const local = readSettingsLocal(tenantId);
    if (local) return local;
    return DEFAULT_SETTINGS;
  }
}

export async function upsertSettingsSupabase(tenantId: string | null, patch: Partial<AppSettings>) {
  const { data: sess } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  const owner = sess.session?.user?.id || null;

  const payload: AppSettings = {
    ...patch,
    tenant_id: tenantId || null,
    owner,
  };

  // Garante que as configurações dos botões fiquem salvas também no JSON bio_config para nunca perder
  const bioCfg = (payload.bio_config && typeof payload.bio_config === "object") ? { ...payload.bio_config } : {};
  if (payload.button_config_light !== undefined) bioCfg.button_config_light = payload.button_config_light;
  if (payload.button_config_dark !== undefined) bioCfg.button_config_dark = payload.button_config_dark;
  if (payload.button_style !== undefined) bioCfg.button_style = payload.button_style;
  if (payload.button_bg !== undefined) bioCfg.button_bg = payload.button_bg;
  if (payload.button_border !== undefined) bioCfg.button_border = payload.button_border;
  if (payload.button_text !== undefined) bioCfg.button_text = payload.button_text;
  if (payload.button_icon !== undefined) bioCfg.button_icon = payload.button_icon;
  payload.bio_config = bioCfg;

  if (payload.app_background_opacity != null) {
    const v = Number(payload.app_background_opacity);
    payload.app_background_opacity = Number.isFinite(v) ? v : 0.18;
  }

  // normaliza horários
  if (payload.budget_approved_reminder_times) {
    payload.budget_approved_reminder_times = normalizeReminderTimes(payload.budget_approved_reminder_times);
  }

  const tid = tenantId || payload.tenant_id;
  if (tid) {
    if (payload.button_config_dark) localStorage.setItem(`gm_button_dark_${tid}`, JSON.stringify(payload.button_config_dark));
  }

  // Removemos chaves de colunas virtuais/dinâmicas para enviar ao Supabase sem gerar aviso PGRST204 de coluna ausente
  const dbPayload = { ...payload };
  delete (dbPayload as any).button_config_light;
  delete (dbPayload as any).button_config_dark;
  delete (dbPayload as any).button_bg;
  delete (dbPayload as any).button_border;
  delete (dbPayload as any).button_text;
  delete (dbPayload as any).button_icon;
  delete (dbPayload as any).button_style;

  let dbData: any = null;

  const res = await supabase
    .from("app_settings")
    .upsert(dbPayload, { onConflict: "tenant_id" })
    .select("*")
    .maybeSingle();

  if (res.error) {
    console.info("Info do salvamento no Supabase (configurações salvas localmente e no bio_config):", res.error);
  } else {
    dbData = res.data;
  }

  const settings = { ...DEFAULT_SETTINGS, ...(dbData || {}), ...payload } as AppSettings;
  writeSettingsLocal(settings, tenantId);

  applySettingsToDOM(settings, true, tenantId);
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