// lib/settings.ts
import { supabase } from "./supabase";
import { applyBgEffectToRoot, saveBgEffectConfig, readBgEffectConfig, BgEffectConfig } from "./backgroundEffects";

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
  website_logo_url?: string | null;
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

  // Background Dynamic Effects Gallery
  bg_effect_enabled?: boolean | null;
  bg_effect_type?: string | null;
  bg_effect_scope?: string | null;
  bg_effect_desktop_enabled?: boolean | null;
  bg_effect_desktop_type?: string | null;
  bg_effect_lockscreen_enabled?: boolean | null;
  bg_effect_lockscreen_type?: string | null;

  // Bio Info
  bio_config?: Record<string, any> | null;

  // Planos & Checkout
  app_plans_config?: Record<string, any> | null;

  created_at?: string;
  updated_at?: string;
};

export const DEFAULT_REMINDER_TIMES = ["09:00", "13:00", "17:00"];

const LOCAL_KEY = "gm.settings.cache.v1";

/**
 * ✅ Configuração Completa e Restaurada da Bio do Website (Referente a 08/10/2026)
 */
export const DEFAULT_GM_BIO_CONFIG: Record<string, any> = {
  title: "GM edificação",
  title_mobile: "GM edificação",
  title_font: "syne",
  title_font_mobile: "syne",
  title_size: "36 pt",
  title_size_mobile: "26 pt",
  title_color: "#FFFFFF",
  hero_title: "GM edificação",
  hero_title_mobile: "GM edificação",
  description: "GM edificação, Design Feroz",
  description_mobile: "GM edificação, Design Feroz",
  description_align: "left",
  description_align_mobile: "center",
  description_bold: true,
  description_bold_mobile: true,
  description_italic: false,
  description_italic_mobile: false,
  description_font: "syne",
  description_font_mobile: "syne",
  description_size: "18 pt",
  description_size_mobile: "16 pt",
  description_color: "#E4E4E7",
  phone: "(98) 98840-2049",
  email: "gmedificacao@gmail.com",
  whatsapp: "5598988402049",
  instagram: "gmedificacao",
  facebook: "",
  telegram: "",
  linkedin: "",
  tiktok: "",
  website: "https://gmedificacao.com",
  portfolio_url: "",
  catalog_url: "",
  address: "São Luís - MA",
  address_url: "",
  pix_key: "carddigitalgm@gmail.com",
  pix_type: "CNPJ",
  card_url: "",
  bg_image_url: "",
  bg_mobile_image_url: "",
  theme: "dark",
  color: "#FE540B",
  show_banners: true,
  show_nav_links: false,
  banner_img_url_1: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/background_1787217210889.jpg?t=1787217210889",
  banner_img_url_2: "",
  banner_img_url_3: "",
  mobile_banner_img_url_1: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/background_1787213992954.webp?t=1787213992954",
  mobile_banner_img_url_2: "",
  mobile_banner_img_url_3: "",
  contact_banner_img_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/background_1787217210889.jpg?t=1787217210889",
  contact_title: "Fale com a nossa equipe",
  contact_desc: "Estamos prontos para atender você e transformar o seu projeto em realidade.",
  about_banner_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/background_1787217210889.jpg?t=1787217210889",
  show_about: true,
  about_title: "SOBRE A GM EDIFICAÇÃO",
  about_description: "A GM edificação é uma agência criativa que transforma ideias em experiências visuais, marcas e conteúdos que comunicam, conectam e geram impacto. Especializada em Design Gráfico, Branding, Identidade Visual, Motion Design, Design 3D, Social Media e Produção de Conteúdo, a GM edificação combina criatividade, estratégia e tecnologia para desenvolver projetos únicos, profissionais e alinhados à essência de cada cliente. Mais do que criar uma arte, construímos conceitos.",
  about_highlight: "Edificamos ideias. Criamos impacto. Design Feroz. 🦁",
  about_btn_text: "Fale Conosco",
  about_btn_link: "https://wa.me/5598988402049",
  about_title_align: "center",
  about_title_bold: true,
  about_title_italic: false,
  about_title_font: "funnel",
  about_title_size: "30 pt",
  about_desc_align: "center",
  about_desc_bold: false,
  about_desc_italic: false,
  about_desc_font: "ui",
  about_desc_size: "16 pt",
  about_highlight_align: "center",
  about_highlight_bold: true,
  about_highlight_italic: false,
  about_highlight_font: "ui",
  about_highlight_size: "16 pt",
  website_logo_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/logo_1790345925228_lq174s.svg",
  logo_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/logo_1790345925228_lq174s.svg",
  hero_button_label: "Conheça nossos Serviços",
  hero_button_action: "portfolio",
  hero_button_url: "",
  site_font: "syne",
  site_font_size: "18 pt",
  site_font_mobile: "syne",
  site_font_size_mobile: "16 pt",
  bg_animation: "parallax",
  button_style: "solid",
  button_bg: "#FE540B",
  button_border: "#FE540B",
  button_text: "#FFFFFF",
  button_icon: "#FFFFFF",
  theme_colors_dark: {
    bg: "#0B0B0C",
    icon: "#FE540B",
    title: "#FFFFFF",
    accent: "#FF7A38",
    button: "#FF7A38",
    menu_bg: "#131315",
    primary: "#FE540B",
    subtitle: "#E2E8F0",
    menu_icon: "#FE540B",
    menu_title: "#FFFFFF",
    menu_button: "#FE540B",
    menu_primary: "#FE540B",
    menu_subtitle: "#E2E8F0"
  },
  button_config_dark: {
    bg: "#FE540B",
    icon: "#FFFFFF",
    text: "#FFFFFF",
    style: "solid",
    border: "#FE540B"
  },
  chat_balloon_enabled: true,
  chat_balloon_show_qrcode: true,
  chat_balloon_qr_link: "https://wa.me/5598988402049",
  chat_balloon_qr_msg: "Olá! Estou vindo do site GM edificação, quero saber mais.",
  chat_balloon_bg_color: "#FE540B",
  chat_balloon_text_color: "#FFFFFF",
  chat_balloon_text: "Olá 👋\nSou Denis, como posso te ajudar hoje?",
  chat_balloon_button_text: "Abrir chat",
  catalog_title: "Catálogo de Serviços",
  catalog_items: [],
  portfolio_title: "Portfólio",
  portfolio_items: [
    {
      id: "portfolio-lolla-coiffeur",
      title: "Lolla Coiffeur - Espaço de Beleza",
      image_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1791305212249_22vaka.webp",
      layers: [
        { id: "layer-lolla-1", image_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1791305212249_22vaka.webp" },
        { id: "layer-lolla-2", image_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1790794170659_gbz30c.webp" }
      ],
      description: "Identidade visual e posicionamento de marca para o Espaço de Beleza Lolla Coiffeur. Criação de comunicação visual moderna, peças digitais e materiais de alta fidelidade para captação de clientes.",
      description_align: "left",
      description_bold: true,
      description_italic: false,
      description_font: "funnel",
      description_size: "16 pt"
    },
    {
      id: "portfolio-guerreiros-cross",
      title: "Guerreiros Cross - Guerra de Troia",
      image_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1791305236624_2rozol.webp",
      layers: [
        { id: "layer-cross-1", image_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1791305230215_av82js.webp" },
        { id: "layer-cross-2", image_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1791305236624_2rozol.webp" },
        { id: "layer-cross-3", image_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1790794105721_9egh0h.webp" }
      ],
      description: "Identidade e campanha do Treinão Aberto Guerra de Troia em comemoração ao Dia da Mulher. Comunicação de alto impacto e energia para a academia Guerreiros Cross.",
      description_align: "left",
      description_bold: true,
      description_italic: false,
      description_font: "funnel",
      description_size: "16 pt"
    },
    {
      id: "portfolio-satcom",
      title: "Satcom - Internet Fibra Óptica",
      image_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1791305256146_9hcell.jpg",
      layers: [
        { id: "layer-satcom-1", image_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1791305247987_an4mrd.jpg" },
        { id: "layer-satcom-2", image_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1791305256146_9hcell.jpg" },
        { id: "layer-satcom-3", image_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1790794120207_zzjjgl.jpg" }
      ],
      description: "Campanhas publicitárias e banners promocionais de Ultra Velocidade Fibra Óptica para a operadora Satcom.",
      description_align: "left",
      description_bold: true,
      description_italic: false,
      description_font: "funnel",
      description_size: "16 pt"
    }
  ],
  custom_links: [
    {
      id: "link-whatsapp-orcamento",
      label: "Fale com Denis no WhatsApp",
      url: "https://wa.me/5598988402049?text=Ol%C3%A1%21%20Gostaria%20de%20um%20or%C3%A7amento%20com%20a%20GM%20edifica%C3%A7%C3%A3o.",
      platform: "whatsapp",
      value: ""
    },
    {
      id: "link-instagram-oficial",
      label: "Instagram Oficial @gmedificacao",
      url: "https://instagram.com/gmedificacao",
      platform: "instagram",
      value: ""
    },
    {
      id: "link-portfolio",
      label: "Ver Nosso Portfólio de Projetos",
      url: "#portfolio-section",
      platform: "website",
      value: ""
    }
  ]
};

/**
 * ✅ DEFAULT com shape certo (inclui timbrado_url e bio completa)
 * Mantém também chaves antigas por compatibilidade.
 */
export const DEFAULT_SETTINGS: AppSettings & any = {
  company_name: "GM edificação",
  pix_type: "CNPJ",
  pix_key: "carddigitalgm@gmail.com",
  brand_primary: "#FE540B",
  brand_accent: "#FF7A38",
  brand_bg: "#0B0B0C",
  font_family: "Space Grotesk",
  avatar_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/logo.jpg?t=1790426179060",
  company_logo_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/logo.jpg?t=1790426179060",
  website_logo_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/logo_1790345925228_lq174s.svg",
  timbrado_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/timbrados/64a22c15-806c-4ad3-ac1c-c1628f02bba5/timbrado_a4.jpg",
  theme_presets: [],
  app_background_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/background_1787217210889.jpg?t=1787217210889",
  app_background_fit: "cover",
  app_background_opacity: 1,
  app_background_pos_x: "50%",
  app_background_pos_y: "50%",
  app_background_scale: 1.05,
  app_background_blur: 0,
  
  mobile_app_background_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/background_1787213992954.webp?t=1787213992954",
  mobile_app_background_fit: "cover",
  mobile_app_background_opacity: 1,
  mobile_app_background_pos_x: "50%",
  mobile_app_background_pos_y: "50%",
  mobile_app_background_scale: 1.05,
  mobile_app_background_blur: 0,

  app_scale: 1.0,
  mobile_scale: 1.0,
  button_style: "solid",
  button_bg: "#FE540B",
  button_border: "#FE540B",
  button_text: "#FFFFFF",
  button_icon: "#FFFFFF",
  budget_approved_reminder_enabled: false,
  budget_approved_reminder_times: DEFAULT_REMINDER_TIMES,
  bio_config: DEFAULT_GM_BIO_CONFIG,

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
    if (document.body) {
      document.body.style.backgroundColor = bg;
    }
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
  const bgOpacityNum = Number(s.app_background_opacity ?? 0);
  const isBgActive = Boolean(s.app_background_url && bgOpacityNum > 0);

  const mobileBgOpacityNum = Number(s.mobile_app_background_opacity ?? s.app_background_opacity ?? 0);
  const isMobileBgActive = Boolean((s.mobile_app_background_url || s.app_background_url) && mobileBgOpacityNum > 0);
  
  if (isVideo && isBgActive) {
    root.style.setProperty("--gm-app-bg-url", "none");
  } else {
    root.style.setProperty("--gm-app-bg-url", isBgActive && s.app_background_url ? `url("${s.app_background_url}")` : "none");
  }
  
  if (isBgActive || isMobileBgActive) {
    root.classList.add("gm-has-bg");
    document.body?.classList.add("gm-has-bg");
  } else {
    root.classList.remove("gm-has-bg");
    document.body?.classList.remove("gm-has-bg");
  }
  
  const videoEl = document.getElementById("gm-video-bg") as HTMLVideoElement;
  if (videoEl) {
    if (isVideo && isBgActive && s.app_background_url) {
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
  const effectiveBgOpacity = isBgActive ? (bgOpacityNum <= 0.25 ? 1 : bgOpacityNum) : 0;
  root.style.setProperty("--gm-app-bg-opacity", String(effectiveBgOpacity));
  root.style.setProperty("--gm-app-bg-pos-x", s.app_background_pos_x || "50%");
  root.style.setProperty("--gm-app-bg-pos-y", s.app_background_pos_y || "50%");
  const resolvedScale = Math.max(Number(s.app_background_scale ?? 1.05), 1.05);
  root.style.setProperty("--gm-app-bg-scale", String(resolvedScale));
  root.style.setProperty("--gm-app-bg-blur", (s.app_background_blur ?? 0) + "px");

  // ✅ auto-dimming do blur
  const op = isBgActive ? effectiveBgOpacity : 0;
  const blur = Number(s.app_background_blur ?? 0);
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const factor = clamp(op * 1.2, 0.25, 1);
  const effectiveBlur = Math.round(blur * factor);
  root.style.setProperty("--gm-app-bg-blur-effective", `${effectiveBlur}px`);

  // Mobile backgrounds
  const mobileBgUrlResolved = isMobileBgActive ? (s.mobile_app_background_url || s.app_background_url) : null;
  root.style.setProperty("--gm-mobile-bg-url", mobileBgUrlResolved ? `url("${mobileBgUrlResolved}")` : "none");
  root.style.setProperty("--gm-mobile-bg-fit", String(s.mobile_app_background_fit || s.app_background_fit || "cover"));
  const effectiveMobileOpacity = isMobileBgActive ? (mobileBgOpacityNum <= 0.25 ? 1 : mobileBgOpacityNum) : 0;
  root.style.setProperty("--gm-mobile-bg-opacity", String(effectiveMobileOpacity));
  root.style.setProperty("--gm-mobile-bg-pos-x", s.mobile_app_background_pos_x || s.app_background_pos_x || "50%");
  root.style.setProperty("--gm-mobile-bg-pos-y", s.mobile_app_background_pos_y || s.app_background_pos_y || "50%");
  const resolvedMobileScale = Math.max(Number(s.mobile_app_background_scale ?? 1.05), 1.05);
  root.style.setProperty("--gm-mobile-bg-scale", String(resolvedMobileScale));
  root.style.setProperty("--gm-mobile-bg-blur", (s.mobile_app_background_blur ?? s.app_background_blur ?? 0) + "px");

  // ✅ auto-dimming do blur (Mobile)
  const mop = isMobileBgActive ? mobileBgOpacityNum : 0;
  const mblur = Number(s.mobile_app_background_blur ?? s.app_background_blur ?? 0);
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

  // Aplica e sincroniza os efeitos dinâmicos de plano de fundo se definidos
  if (
    (s.bg_effect_desktop_enabled !== undefined && s.bg_effect_desktop_enabled !== null) ||
    (s.bg_effect_lockscreen_enabled !== undefined && s.bg_effect_lockscreen_enabled !== null)
  ) {
    saveBgEffectConfig({
      desktopEnabled: s.bg_effect_desktop_enabled !== undefined && s.bg_effect_desktop_enabled !== null ? Boolean(s.bg_effect_desktop_enabled) : undefined,
      desktopEffect: (s.bg_effect_desktop_type as any) || undefined,
      lockscreenEnabled: s.bg_effect_lockscreen_enabled !== undefined && s.bg_effect_lockscreen_enabled !== null ? Boolean(s.bg_effect_lockscreen_enabled) : undefined,
      lockscreenEffect: (s.bg_effect_lockscreen_type as any) || undefined,
    });
  } else if (s.bg_effect_enabled !== undefined && s.bg_effect_enabled !== null) {
    saveBgEffectConfig({
      enabled: Boolean(s.bg_effect_enabled),
      type: (s.bg_effect_type as any) || undefined,
      scope: (s.bg_effect_scope as any) || undefined,
    });
  } else {
    applyBgEffectToRoot();
  }

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
  const isGM = !data?.company_name || String(data?.company_name).toLowerCase().includes("gm");
  const fallbackBio = isGM ? DEFAULT_GM_BIO_CONFIG : {};
  
  const rawBio = (data?.bio_config && typeof data.bio_config === "object") ? data.bio_config : {};
  const mergedBio = {
    ...fallbackBio,
    ...rawBio,
    title: rawBio.title || (isGM ? DEFAULT_GM_BIO_CONFIG.title : (data?.company_name || "")),
    title_mobile: rawBio.title_mobile || rawBio.title || (isGM ? DEFAULT_GM_BIO_CONFIG.title_mobile : ""),
    title_font: rawBio.title_font || (isGM ? DEFAULT_GM_BIO_CONFIG.title_font : "syne"),
    title_font_mobile: rawBio.title_font_mobile || rawBio.title_font || (isGM ? DEFAULT_GM_BIO_CONFIG.title_font_mobile : "syne"),
    title_size: rawBio.title_size || (isGM ? DEFAULT_GM_BIO_CONFIG.title_size : "36 pt"),
    title_size_mobile: rawBio.title_size_mobile || rawBio.title_size || (isGM ? DEFAULT_GM_BIO_CONFIG.title_size_mobile : "26 pt"),
    title_color: rawBio.title_color || (isGM ? DEFAULT_GM_BIO_CONFIG.title_color : "#FFFFFF"),
    hero_title: rawBio.hero_title || rawBio.title || (isGM ? DEFAULT_GM_BIO_CONFIG.hero_title : ""),
    hero_title_mobile: rawBio.hero_title_mobile || rawBio.hero_title || rawBio.title_mobile || rawBio.title || (isGM ? DEFAULT_GM_BIO_CONFIG.hero_title_mobile : ""),
    description: rawBio.description || (isGM ? DEFAULT_GM_BIO_CONFIG.description : ""),
    description_mobile: rawBio.description_mobile || rawBio.description || (isGM ? DEFAULT_GM_BIO_CONFIG.description_mobile : ""),
    description_font: rawBio.description_font || (isGM ? DEFAULT_GM_BIO_CONFIG.description_font : "syne"),
    description_font_mobile: rawBio.description_font_mobile || rawBio.description_font || (isGM ? DEFAULT_GM_BIO_CONFIG.description_font_mobile : "syne"),
    description_size: rawBio.description_size || (isGM ? DEFAULT_GM_BIO_CONFIG.description_size : "18 pt"),
    description_size_mobile: rawBio.description_size_mobile || rawBio.description_size || (isGM ? DEFAULT_GM_BIO_CONFIG.description_size_mobile : "16 pt"),
    description_bold: rawBio.description_bold !== undefined ? rawBio.description_bold : (isGM ? DEFAULT_GM_BIO_CONFIG.description_bold : true),
    description_bold_mobile: rawBio.description_bold_mobile !== undefined ? rawBio.description_bold_mobile : (isGM ? DEFAULT_GM_BIO_CONFIG.description_bold_mobile : true),
    description_color: rawBio.description_color || (isGM ? DEFAULT_GM_BIO_CONFIG.description_color : "#E4E4E7"),
    show_banners: isGM ? true : (rawBio.show_banners !== undefined ? rawBio.show_banners : true),
    show_nav_links: rawBio.show_nav_links !== undefined ? rawBio.show_nav_links : false,
    banner_img_url_1: rawBio.banner_img_url_1 || (isGM ? DEFAULT_GM_BIO_CONFIG.banner_img_url_1 : ""),
    mobile_banner_img_url_1: rawBio.mobile_banner_img_url_1 || (isGM ? DEFAULT_GM_BIO_CONFIG.mobile_banner_img_url_1 : ""),
    contact_banner_img_url: rawBio.contact_banner_img_url || (isGM ? DEFAULT_GM_BIO_CONFIG.contact_banner_img_url : ""),
    about_banner_url: rawBio.about_banner_url || (isGM ? DEFAULT_GM_BIO_CONFIG.about_banner_url : ""),
    website_logo_url: rawBio.website_logo_url || data?.website_logo_url || (isGM ? DEFAULT_GM_BIO_CONFIG.website_logo_url : ""),
    logo_url: rawBio.logo_url || (isGM ? DEFAULT_GM_BIO_CONFIG.logo_url : ""),
    show_about: rawBio.show_about !== undefined ? rawBio.show_about : true,
    about_title: rawBio.about_title || (isGM ? DEFAULT_GM_BIO_CONFIG.about_title : "SOBRE A GM EDIFICAÇÃO"),
    about_description: rawBio.about_description || (isGM ? DEFAULT_GM_BIO_CONFIG.about_description : ""),
    about_highlight: rawBio.about_highlight || (isGM ? DEFAULT_GM_BIO_CONFIG.about_highlight : ""),
    about_btn_text: rawBio.about_btn_text || (isGM ? DEFAULT_GM_BIO_CONFIG.about_btn_text : "Fale Conosco"),
    about_btn_link: rawBio.about_btn_link || (isGM ? DEFAULT_GM_BIO_CONFIG.about_btn_link : "https://wa.me/5598988402049"),
    about_title_font: rawBio.about_title_font || (isGM ? DEFAULT_GM_BIO_CONFIG.about_title_font : "funnel"),
    about_title_size: rawBio.about_title_size || (isGM ? DEFAULT_GM_BIO_CONFIG.about_title_size : "30 pt"),
    about_title_bold: rawBio.about_title_bold !== undefined ? rawBio.about_title_bold : true,
    about_desc_font: rawBio.about_desc_font || (isGM ? DEFAULT_GM_BIO_CONFIG.about_desc_font : "ui"),
    about_desc_size: rawBio.about_desc_size || (isGM ? DEFAULT_GM_BIO_CONFIG.about_desc_size : "16 pt"),
    about_highlight_font: rawBio.about_highlight_font || (isGM ? DEFAULT_GM_BIO_CONFIG.about_highlight_font : "ui"),
    about_highlight_size: rawBio.about_highlight_size || (isGM ? DEFAULT_GM_BIO_CONFIG.about_highlight_size : "16 pt"),
    about_highlight_bold: rawBio.about_highlight_bold !== undefined ? rawBio.about_highlight_bold : true,
    button_style: rawBio.button_style || (isGM ? DEFAULT_GM_BIO_CONFIG.button_style : "solid"),
    button_bg: rawBio.button_bg || (isGM ? DEFAULT_GM_BIO_CONFIG.button_bg : "#FE540B"),
    button_border: rawBio.button_border || (isGM ? DEFAULT_GM_BIO_CONFIG.button_border : "#FE540B"),
    button_text: rawBio.button_text || (isGM ? DEFAULT_GM_BIO_CONFIG.button_text : "#FFFFFF"),
    button_icon: rawBio.button_icon || (isGM ? DEFAULT_GM_BIO_CONFIG.button_icon : "#FFFFFF"),
    custom_links: (rawBio.custom_links && rawBio.custom_links.length > 0) ? rawBio.custom_links : (isGM ? DEFAULT_GM_BIO_CONFIG.custom_links : []),
    portfolio_items: (rawBio.portfolio_items && rawBio.portfolio_items.length > 0) ? rawBio.portfolio_items : (isGM ? DEFAULT_GM_BIO_CONFIG.portfolio_items : []),
    portfolio_title: rawBio.portfolio_title || (isGM ? DEFAULT_GM_BIO_CONFIG.portfolio_title : "Portfólio"),
    whatsapp: rawBio.whatsapp || (isGM ? DEFAULT_GM_BIO_CONFIG.whatsapp : ""),
    instagram: rawBio.instagram || (isGM ? DEFAULT_GM_BIO_CONFIG.instagram : ""),
    website: rawBio.website || (isGM ? DEFAULT_GM_BIO_CONFIG.website : ""),
    email: rawBio.email || (isGM ? DEFAULT_GM_BIO_CONFIG.email : ""),
    address: rawBio.address || (isGM ? DEFAULT_GM_BIO_CONFIG.address : ""),
    pix_key: rawBio.pix_key || (isGM ? DEFAULT_GM_BIO_CONFIG.pix_key : ""),
    pix_type: rawBio.pix_type || (isGM ? DEFAULT_GM_BIO_CONFIG.pix_type : "CNPJ"),
    chat_balloon_enabled: rawBio.chat_balloon_enabled !== undefined ? rawBio.chat_balloon_enabled : true,
    chat_balloon_show_qrcode: rawBio.chat_balloon_show_qrcode !== undefined ? rawBio.chat_balloon_show_qrcode : true,
    chat_balloon_qr_link: rawBio.chat_balloon_qr_link || (isGM ? DEFAULT_GM_BIO_CONFIG.chat_balloon_qr_link : ""),
    chat_balloon_qr_msg: rawBio.chat_balloon_qr_msg || (isGM ? DEFAULT_GM_BIO_CONFIG.chat_balloon_qr_msg : ""),
    chat_balloon_bg_color: rawBio.chat_balloon_bg_color || (isGM ? DEFAULT_GM_BIO_CONFIG.chat_balloon_bg_color : "#FE540B"),
    chat_balloon_text_color: rawBio.chat_balloon_text_color || (isGM ? DEFAULT_GM_BIO_CONFIG.chat_balloon_text_color : "#FFFFFF"),
    chat_balloon_text: rawBio.chat_balloon_text || (isGM ? DEFAULT_GM_BIO_CONFIG.chat_balloon_text : ""),
    chat_balloon_button_text: rawBio.chat_balloon_button_text || (isGM ? DEFAULT_GM_BIO_CONFIG.chat_balloon_button_text : "Abrir chat"),
  };

  // ✅ ISOLAMENTO ESTRITO: O app possui suas próprias configurações e o website bio possui as suas
  const rawPlans = data?.app_plans_config || data?.bio_config?.plans_config;
  const settings: AppSettings = { 
    ...DEFAULT_SETTINGS, 
    ...(data || {}),
    app_plans_config: (rawPlans && typeof rawPlans === "object") ? rawPlans : null,
    company_name: data?.company_name || (isGM ? "GM edificação" : ""),
    bio_config: mergedBio
  };

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

// Cache em memória e deduplicação de requisições em voo (SWR)
const settingsInFlight = new Map<string, Promise<AppSettings | null>>();
let memorySettingsCache: { key: string; data: AppSettings; time: number } | null = null;

export function invalidateSettingsMemoryCache() {
  memorySettingsCache = null;
  settingsInFlight.clear();
}

/**
 * ✅ FIX PRINCIPAL:
 * - Se pedir por tenantId e não existir registro, tenta buscar por owner.
 * - Se achar por owner (tenant_id null), MIGRA/CLONA para o tenant automaticamente.
 * Isso resolve o erro do timbrado no PDF sem você refazer upload.
 */
export async function fetchSettingsSupabase(tenantId?: string | null): Promise<AppSettings | null> {
  const cacheKey = tenantId || "default";

  // 1) Retorno imediato do cache em memória se recente (< 15 segundos)
  if (memorySettingsCache && memorySettingsCache.key === cacheKey && (Date.now() - memorySettingsCache.time < 15000)) {
    return memorySettingsCache.data;
  }

  // 2) Deduplicação de chamadas simultâneas (evita disparar 4 requests repetidos ao Supabase)
  if (settingsInFlight.has(cacheKey)) {
    return settingsInFlight.get(cacheKey)!;
  }

  const promise = (async () => {
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
        const isQuiet = errorMsg.includes("Failed to fetch") || errorMsg.includes("Timeout") || errorMsg.includes("Tempo limite") || errorMsg.includes("tenant_memberships") || errorMsg.includes("42501");
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

      // 2) fallback: tenta por owner (seleciona o registro ativo, ignorando duplicatas antigas vazias)
      if (owner) {
        const { data: ownerRows, error: errOwner } = await withTimeout<any>(
          supabase.from("app_settings").select("*").eq("owner", owner).order("updated_at", { ascending: false }) as any,
          4000
        ).catch((err) => {
          return { data: null, error: err };
        });

        if (errOwner) {
          const errorMsg = errOwner?.message || String(errOwner);
          const isQuiet = errorMsg.includes("Failed to fetch") || errorMsg.includes("Timeout") || errorMsg.includes("Tempo limite") || errorMsg.includes("tenant_memberships") || errorMsg.includes("42501");
          if (!isQuiet) {
            console.warn("fetchSettings warn (owner):", errorMsg);
          }
          const local = readSettingsLocal(tenantId);
          if (local) return local;
          return DEFAULT_SETTINGS;
        }

        const byOwner = Array.isArray(ownerRows)
          ? ownerRows.find((r: any) => r.id !== "19609c6b-85a3-4fb1-a40a-18250554fc62" && (r.website_logo_url || r.company_logo_url || (r.bio_config && Object.keys(r.bio_config).length > 2))) || ownerRows[0]
          : ownerRows;

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

    // (sem tenantId) busca pelo registro ativo mais recente
    let q = supabase.from("app_settings").select("*").order("updated_at", { ascending: false });

    if (owner) q = q.eq("owner", owner);
    else q = q.is("tenant_id", null);

    const { data: rowsData, error } = await withTimeout<any>(q as any, 4000).catch((err) => {
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

    const data = Array.isArray(rowsData) 
      ? rowsData.find((r: any) => r.id !== "19609c6b-85a3-4fb1-a40a-18250554fc62" && (r.website_logo_url || r.company_logo_url || (r.bio_config && Object.keys(r.bio_config).length > 2))) || rowsData[0]
      : rowsData;

    const merged = mergeWithFallbacks(data);
    writeSettingsLocal(merged, null);
    return merged;
  } catch (e: any) {
    const errorMsg = e?.message || String(e);
    const isQuiet = errorMsg.includes("Failed to fetch") || errorMsg.includes("Timeout") || errorMsg.includes("Tempo limite") || errorMsg.includes("tenant_memberships") || errorMsg.includes("42501");
    if (!isQuiet) {
      console.warn("fetchSettings warn:", errorMsg);
    }
    const local = readSettingsLocal(tenantId);
    if (local) return local;
    return DEFAULT_SETTINGS;
  }
  })();

  settingsInFlight.set(cacheKey, promise);
  try {
    const res = await promise;
    if (res) {
      memorySettingsCache = { key: cacheKey, data: res, time: Date.now() };
    }
    return res;
  } finally {
    settingsInFlight.delete(cacheKey);
  }
}

export async function upsertSettingsSupabase(tenantId: string | null, patch: Partial<AppSettings>) {
  invalidateSettingsMemoryCache();
  const { data: sess } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  const owner = sess.session?.user?.id || null;

  const isValidUuid = (val: string | null | undefined) => 
    Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

  const validTenantId = isValidUuid(tenantId) ? tenantId : (isValidUuid(patch.tenant_id) ? patch.tenant_id : null);

  const payload: AppSettings = {
    ...patch,
    tenant_id: validTenantId,
    owner,
  };

  // ✅ REGRA FUNDAMENTAL: Alterações no app não afetam o website bio, e vice-versa.
  const tidKey = tenantId || payload.tenant_id;
  const cached = readSettingsLocal(tidKey);
  const isGM = !payload.company_name || String(payload.company_name).toLowerCase().includes("gm");
  const baseBio = isGM ? DEFAULT_GM_BIO_CONFIG : {};
  const currentBio = (cached?.bio_config && typeof cached.bio_config === "object") ? cached.bio_config : {};

  if (patch.bio_config !== undefined) {
    // Salvamento explícito originado da bio: mescla com os defaults preservando dados
    payload.bio_config = {
      ...baseBio,
      ...currentBio,
      ...patch.bio_config
    };
  } else {
    // Salvamento veio do app (Configurações, Orçamentos, etc.): NÃO toca na bio_config nem injeta botões do app nela!
    payload.bio_config = Object.keys(currentBio).length > 0 ? currentBio : (isGM ? baseBio : null);
  }

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

  // Busca se já existe um registro para o tenantId ou owner para atualizar diretamente pelo ID
  // Isso evita erros de Postgres quando a tabela app_settings não possui constraint UNIQUE em tenant_id
  let existingRecordId: string | null = null;
  try {
    if (validTenantId) {
      const { data: found } = await supabase
        .from("app_settings")
        .select("id")
        .eq("tenant_id", validTenantId)
        .limit(1)
        .maybeSingle();
      if (found?.id) {
        existingRecordId = found.id;
      }
    }
    
    if (!existingRecordId && owner) {
      const { data: foundByOwner } = await supabase
        .from("app_settings")
        .select("id")
        .eq("owner", owner)
        .limit(1)
        .maybeSingle();
      if (foundByOwner?.id) {
        existingRecordId = foundByOwner.id;
      }
    }
  } catch (errCheck) {
    console.warn("Aviso ao verificar registro existente em app_settings:", errCheck);
  }

  if (existingRecordId) {
    // 1) UPDATE direto pelo id (100% seguro contra erro 42P10 de ON CONFLICT)
    let updateRes = await supabase
      .from("app_settings")
      .update(dbPayload)
      .eq("id", existingRecordId)
      .select("*")
      .maybeSingle();

    // Se falhou por ausência da coluna app_plans_config, retenta sem a coluna (já salvo dentro de bio_config)
    if (updateRes.error && (dbPayload as any).app_plans_config) {
      const errMsg = String(updateRes.error.message || "");
      if (errMsg.includes("app_plans_config") || updateRes.error.code === "PGRST204" || updateRes.error.code === "42703") {
        const cleanPayload = { ...dbPayload };
        delete (cleanPayload as any).app_plans_config;
        updateRes = await supabase
          .from("app_settings")
          .update(cleanPayload)
          .eq("id", existingRecordId)
          .select("*")
          .maybeSingle();
      }
    }

    if (!updateRes.error && updateRes.data) {
      dbData = updateRes.data;
    } else if (updateRes.error) {
      console.warn("Aviso no update de app_settings:", updateRes.error);
      const fallbackPayload = { ...dbPayload };
      delete (fallbackPayload as any).app_plans_config;
      const upsertFallback = await supabase
        .from("app_settings")
        .upsert({ ...fallbackPayload, id: existingRecordId })
        .select("*")
        .maybeSingle();
      if (!upsertFallback.error && upsertFallback.data) {
        dbData = upsertFallback.data;
      }
    }
  } else {
    // 2) INSERT novo registro se ainda não existir
    let insertRes = await supabase
      .from("app_settings")
      .insert(dbPayload)
      .select("*")
      .maybeSingle();

    if (insertRes.error && (dbPayload as any).app_plans_config) {
      const cleanPayload = { ...dbPayload };
      delete (cleanPayload as any).app_plans_config;
      insertRes = await supabase
        .from("app_settings")
        .insert(cleanPayload)
        .select("*")
        .maybeSingle();
    }

    if (!insertRes.error && insertRes.data) {
      dbData = insertRes.data;
    } else {
      // Se falhou insert (possível race condition ou constraint), tenta upsert
      const cleanPayload = { ...dbPayload };
      delete (cleanPayload as any).app_plans_config;
      const upsertRes = await supabase
        .from("app_settings")
        .upsert(cleanPayload, { onConflict: "tenant_id" })
        .select("*")
        .maybeSingle();
      if (!upsertRes.error && upsertRes.data) {
        dbData = upsertRes.data;
      } else {
        console.warn("Aviso no salvamento de app_settings no Supabase:", insertRes?.error || upsertRes?.error);
      }
    }
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