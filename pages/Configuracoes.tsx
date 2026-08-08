// pages/Configuracoes.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import Select from "../components/ui/Select";
import { Page } from "../components/ui/Page";
import { Card } from "../components/ui/Card";
import { SectionDivider } from "../components/ui/SectionDivider";
import { ScaleSlider } from "../components/ScaleSlider";
import { ColorSettingsManager } from "../components/ColorSettingsManager";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/AuthContext";
import {
  uploadTenantAsset,
  uploadTimbradoA4,
} from "../services/storageService";
import {
  applySettingsToDOM,
  fetchSettingsSupabase,
  upsertSettingsSupabase,
  readSettingsLocal,
  ThemePreset,
  hexToRgb,
  getContrastColor,
} from "../lib/settings";
import * as QRCode from "qrcode";
import { buildPixPayload } from "../lib/pix";
import { copyText } from "../lib/clipboard";
import {
  Download,
  Upload,
  Save,
  Image as ImageIcon,
  FileImage,
  FileText,
  Palette,
  Move,
  Copy,
  Check,
  Bell,
  RotateCcw,
  Loader2,
  CheckCircle2,
  User,
  Paintbrush,
  CreditCard,
  Type,
  Monitor,
  Smartphone,
  HelpCircle,
  Sparkles,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Music,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSwipeNav } from "../hooks/useSwipeNav";
import { playNotificationSound, NOTIFICATION_SOUNDS } from "../lib/audio";

type Fit = "cover" | "contain";

const TIMBRADO_MODEL_URL =
  "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/Modelo%20Timbrado/TIMBRADO%20GABARITO.png";

import imageCompression from "browser-image-compression";
import { compressImage } from "../lib/imageCompressor";

export default function Configuracoes() {
  const { tenantId, user } = useAuth();
  const navigate = useNavigate();

  const [activeSound, setActiveSound] = useState(() => {
    return localStorage.getItem("gm.notificationSound") || "classic_chord";
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Estados de Progresso, Prévia de Carregamento e Auto Compressão de Imagens
  const [logoProgress, setLogoProgress] = useState<number>(0);
  const [logoStatusText, setLogoStatusText] = useState<string>("");
  const [logoStats, setLogoStats] = useState<{ originalSize: string; compressedSize: string; reduction: string } | null>(null);

  const [avatarProgress, setAvatarProgress] = useState<number>(0);
  const [avatarStatusText, setAvatarStatusText] = useState<string>("");
  const [avatarStats, setAvatarStats] = useState<{ originalSize: string; compressedSize: string; reduction: string } | null>(null);
  const [uploadingTimbrado, setUploadingTimbrado] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [viewMode, setViewMode] = useState<string>(
    window.innerWidth >= 1024 ? "desktop" : "smartphone",
  );

  useEffect(() => {
    const handleResize = () => {
      setViewMode(window.innerWidth >= 1024 ? "desktop" : "smartphone");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState(0);

  const swipeRef = useSwipeNav<HTMLDivElement>({
    onSwipeLeft: () => paginate(1),
    onSwipeRight: () => paginate(-1),
    thresholdPx: 60,
    restraintPx: 100,
    stopPropagation: true,
  });

  const pushSupported =
    "Notification" in window && "serviceWorker" in navigator;
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    pushSupported ? Notification.permission : "denied",
  );
  const [pushActive, setPushActive] = useState(() => {
    return localStorage.getItem("gm.pushActive") !== "false";
  });
  const [notificationsMuted, setNotificationsMuted] = useState(() => {
    return localStorage.getItem("gm.notificationsMuted") === "true";
  });
  const [shakeTest, setShakeTest] = useState(false);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0.5,
      scale: 0.9,
      filter: "blur(4px)",
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0.5,
      scale: 0.9,
      filter: "blur(4px)",
    }),
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const paginate = (newDirection: number) => {
    const next = currentScreen + newDirection;
    if (next >= 0 && next <= 2) {
      setDirection(newDirection);
      setCurrentScreen(next);
    }
  };

  const [companyName, setCompanyName] = useState("GM edificação");
  const [pixType, setPixType] = useState("CPF");
  const [pixKey, setPixKey] = useState("");

  // Accordion state (Painel do Editor format - igual ao Bio)
  const [openSections, setOpenSections] = useState({
    personalization: false,
    colors: false,
    background: false,
    pix: false,
    timbrado: false,
    push: false,
    sounds: false,
    tutorial: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => {
      const isOpen = !prev[section];
      const next = {
        personalization: false,
        colors: false,
        background: false,
        pix: false,
        timbrado: false,
        push: false,
        sounds: false,
        tutorial: false,
      };
      next[section] = isOpen;
      return next;
    });

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('scroll'));
    }, 150);
  };

  const hasActiveSection = Object.values(openSections).some(Boolean);

  const getSectionBtnClass = (isOpen: boolean) => {
    return `group relative flex items-center justify-between p-3.5 sm:p-4 min-h-[48px] sm:min-h-[52px] rounded-lg border font-bold text-xs sm:text-sm tracking-wide transition-all duration-300 text-left outline-none cursor-pointer ${
      isOpen
        ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border-[var(--gm-primary)] shadow-md ring-2 ring-[var(--gm-primary)]/20 scale-[1.01]"
        : "bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-zinc-800/80 shadow-xs hover:shadow-md"
    }`;
  };

  const cachedSettings = readSettingsLocal();
  const isLightModeInitial = typeof localStorage !== "undefined" && localStorage.getItem("theme") === "light";
  const defaultOrangeInitial = isLightModeInitial ? "#FF6900" : "#FF7B17";

  const savedColorsInitial = isLightModeInitial
    ? (cachedSettings?.bio_config?.theme_colors_light || (typeof localStorage !== "undefined" ? JSON.parse(localStorage.getItem("gm_colors_light") || "null") : null))
    : (cachedSettings?.bio_config?.theme_colors_dark || (typeof localStorage !== "undefined" ? JSON.parse(localStorage.getItem("gm_colors_dark") || "null") : null));

  const initialPrimary = savedColorsInitial?.primary || (cachedSettings?.brand_primary && cachedSettings?.brand_primary !== "#32BCAD" ? cachedSettings.brand_primary : null) || defaultOrangeInitial;
  const initialAccent = savedColorsInitial?.accent || (cachedSettings?.brand_accent && cachedSettings?.brand_accent !== "#32BCAD" ? cachedSettings.brand_accent : null) || defaultOrangeInitial;
  const initialBg = savedColorsInitial?.bg || cachedSettings?.brand_bg || (isLightModeInitial ? "#FFFFFF" : "#0f1117");

  const [brandPrimary, setBrandPrimary] = useState(initialPrimary);
  const [brandAccent, setBrandAccent] = useState(initialAccent);
  const [brandBg, setBrandBg] = useState(initialBg);
  const [brandTitle, setBrandTitle] = useState(savedColorsInitial?.title || (isLightModeInitial ? "#1B1D22" : "#FFFFFF"));
  const [brandSubtitle, setBrandSubtitle] = useState(savedColorsInitial?.subtitle || (isLightModeInitial ? "#6B7280" : "#94A3B8"));
  const [brandIcon, setBrandIcon] = useState(savedColorsInitial?.icon || initialAccent);

  // Cores independentes do Menu / Barra Lateral
  const [menuPrimary, setMenuPrimary] = useState(savedColorsInitial?.menu_primary || initialPrimary);
  const [menuBg, setMenuBg] = useState(savedColorsInitial?.menu_bg || initialBg);
  const [menuTitle, setMenuTitle] = useState(savedColorsInitial?.menu_title || (isLightModeInitial ? "#1B1D22" : "#FFFFFF"));
  const [menuSubtitle, setMenuSubtitle] = useState(savedColorsInitial?.menu_subtitle || (isLightModeInitial ? "#6B7280" : "#94A3B8"));
  const [menuIcon, setMenuIcon] = useState(savedColorsInitial?.menu_icon || initialAccent);
  const [menuButton, setMenuButton] = useState(savedColorsInitial?.menu_button || initialAccent);

  const [fontFamily, setFontFamily] = useState("Inter");
  const [previewFont, setPreviewFont] = useState<string | null>(null);

  // Configuração independente do botão no Modo Claro (☀️)
  const [buttonStyleLight, setButtonStyleLight] = useState("vazado");
  const [buttonBgLight, setButtonBgLight] = useState("transparent");
  const [buttonBorderLight, setButtonBorderLight] = useState("#FF6900");
  const [buttonTextLight, setButtonTextLight] = useState("#18181B");
  const [buttonIconLight, setButtonIconLight] = useState("#FF6900");

  // Configuração independente do botão no Modo Escuro (🌙)
  const [buttonStyleDark, setButtonStyleDark] = useState("vazado");
  const [buttonBgDark, setButtonBgDark] = useState("transparent");
  const [buttonBorderDark, setButtonBorderDark] = useState("#FF7B17");
  const [buttonTextDark, setButtonTextDark] = useState("#FFFFFF");
  const [buttonIconDark, setButtonIconDark] = useState("#FF7B17");

  const [btnConfigTab] = useState<"light" | "dark">("dark");
  const [isLightMode] = useState<boolean>(false);

  // Painel Flutuante estilo Bio Editor
  const setIsDockedState = useState(false);
  const isDocked = setIsDockedState[0];
  const setIsDocked = setIsDockedState[1];
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const syncCurrentColors = async () => {
      try {
        const s = await fetchSettingsSupabase(tenantId);
        if (s) {
          if (isLightMode) {
            const savedLight = s.bio_config?.theme_colors_light || JSON.parse(localStorage.getItem("gm_colors_light") || "null");
            setBrandPrimary(savedLight?.primary || "#FF6900");
            setBrandAccent(savedLight?.accent || "#FF6900");
            setBrandBg(savedLight?.bg || "#FFFFFF");
            setBrandTitle(savedLight?.title || "#1B1D22");
            setBrandSubtitle(savedLight?.subtitle || "#6B7280");
            setBrandIcon(savedLight?.icon || "#FF6900");

            setMenuPrimary(savedLight?.menu_primary || "#FF6900");
            setMenuBg(savedLight?.menu_bg || "#FFFFFF");
            setMenuTitle(savedLight?.menu_title || "#1B1D22");
            setMenuSubtitle(savedLight?.menu_subtitle || "#6B7280");
            setMenuIcon(savedLight?.menu_icon || "#FF6900");
            setMenuButton(savedLight?.menu_button || "#FF6900");
          } else {
            const savedDark = s.bio_config?.theme_colors_dark || JSON.parse(localStorage.getItem("gm_colors_dark") || "null");
            const darkPrimary = savedDark?.primary || (s.brand_primary && s.brand_primary !== "#32BCAD" ? s.brand_primary : null) || "#FF7B17";
            const darkAccent = savedDark?.accent || (s.brand_accent && s.brand_accent !== "#32BCAD" ? s.brand_accent : null) || "#FF7B17";
            const darkBg = savedDark?.bg || (s.brand_bg && s.brand_bg !== "#0b1220" ? s.brand_bg : null) || "#0f1117";

            setBrandPrimary(darkPrimary);
            setBrandAccent(darkAccent);
            setBrandBg(darkBg);
            setBrandTitle(savedDark?.title || "#FFFFFF");
            setBrandSubtitle(savedDark?.subtitle || "#94A3B8");
            setBrandIcon(savedDark?.icon || darkAccent);

            setMenuPrimary(savedDark?.menu_primary || darkPrimary);
            setMenuBg(savedDark?.menu_bg || darkBg);
            setMenuTitle(savedDark?.menu_title || "#FFFFFF");
            setMenuSubtitle(savedDark?.menu_subtitle || "#94A3B8");
            setMenuIcon(savedDark?.menu_icon || darkAccent);
            setMenuButton(savedDark?.menu_button || darkAccent);
          }
        }
      } catch (err) {}
    };
    if (tenantId) {
      syncCurrentColors();
    }
  }, [isLightMode, tenantId]);

  // Helper ultra fluido para aplicar alterações de cores instantaneamente no DOM
  const updateDomColor = (cssVar: string, value: string) => {
    const root = document.documentElement;
    root.style.setProperty(cssVar, value);
    if (cssVar === "--gm-primary") {
      root.style.setProperty("--brand-primary", value);
      const rgb = hexToRgb(value);
      if (rgb) root.style.setProperty("--gm-primary-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      root.style.setProperty("--gm-primary-foreground", getContrastColor(value));
    } else if (cssVar === "--gm-accent") {
      root.style.setProperty("--brand-accent", value);
      root.style.setProperty("--gm-button", value);
      const rgb = hexToRgb(value);
      if (rgb) root.style.setProperty("--gm-accent-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    } else if (cssVar === "--gm-bg") {
      root.style.setProperty("--brand-bg", value);
    }
  };

  // Aplica as cores em tempo real no DOM ao alterar nas configurações
  useEffect(() => {
    if (loading) return;
    const root = document.documentElement;
    if (brandPrimary) {
      root.style.setProperty("--gm-primary", brandPrimary);
      root.style.setProperty("--brand-primary", brandPrimary);
      const rgb = hexToRgb(brandPrimary);
      if (rgb) {
        root.style.setProperty("--gm-primary-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      }
      const contrast = getContrastColor(brandPrimary);
      root.style.setProperty("--gm-primary-foreground", contrast);
    }
    if (brandAccent) {
      root.style.setProperty("--gm-accent", brandAccent);
      root.style.setProperty("--brand-accent", brandAccent);
      root.style.setProperty("--gm-button", brandAccent);
      const rgb = hexToRgb(brandAccent);
      if (rgb) {
        root.style.setProperty("--gm-accent-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      }
    }
    if (brandBg) {
      root.style.setProperty("--gm-bg", brandBg);
      root.style.setProperty("--brand-bg", brandBg);
    }
    if (brandTitle) {
      root.style.setProperty("--gm-title", brandTitle);
    }
    if (brandSubtitle) {
      root.style.setProperty("--gm-subtitle", brandSubtitle);
    }
    if (brandIcon) {
      root.style.setProperty("--gm-icon", brandIcon);
    }

    // Cores do menu lateral em tempo real
    if (menuPrimary) {
      root.style.setProperty("--gm-menu-primary", menuPrimary);
    }
    if (menuBg) {
      root.style.setProperty("--gm-menu-bg", menuBg);
    }
    if (menuTitle) {
      root.style.setProperty("--gm-menu-title", menuTitle);
    }
    if (menuSubtitle) {
      root.style.setProperty("--gm-menu-subtitle", menuSubtitle);
    }
    if (menuIcon) {
      root.style.setProperty("--gm-menu-icon", menuIcon);
    }
    if (menuButton) {
      root.style.setProperty("--gm-menu-button", menuButton);
    }
  }, [
    brandPrimary,
    brandAccent,
    brandBg,
    brandTitle,
    brandSubtitle,
    brandIcon,
    menuPrimary,
    menuBg,
    menuTitle,
    menuSubtitle,
    menuIcon,
    menuButton
  ]);

  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [timbradoUrl, setTimbradoUrl] = useState<string | null>(null);

  // Background Settings (salva no Supabase)
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgFit, setBgFit] = useState<Fit>("cover");
  const [bgOpacity, setBgOpacity] = useState<number>(0.18);
  const [bgScale, setBgScale] = useState<number>(1);
  const [bgBlur, setBgBlur] = useState<number>(10);

  // Position (0 a 100%)
  const [bgPosX, setBgPosX] = useState<number>(50);
  const [bgPosY, setBgPosY] = useState<number>(50);
  const [appScale, setAppScale] = useState<number>(1.0);
  const [mobileScale, setMobileScale] = useState<number>(1.5);
  const [originalScale, setOriginalScale] = useState<number>(1.0);

  const [bgEnabled, setBgEnabled] = useState<boolean>(true);
  const [bgOpacityPrev, setBgOpacityPrev] = useState<number>(0.18);

  // Smartphone Background Settings
  const [mobileBgUrl, setMobileBgUrl] = useState<string | null>(null);
  const [mobileBgFit, setMobileBgFit] = useState<Fit>("cover");
  const [mobileBgOpacity, setMobileBgOpacity] = useState<number>(0.18);
  const [mobileBgScale, setMobileBgScale] = useState<number>(1.2);
  const [mobileBgBlur, setMobileBgBlur] = useState<number>(10);
  const [mobileBgPosX, setMobileBgPosX] = useState<number>(50);
  const [mobileBgPosY, setMobileBgPosY] = useState<number>(50);
  const [mobileBgEnabled, setMobileBgEnabled] = useState<boolean>(true);
  const [mobileBgOpacityPrev, setMobileBgOpacityPrev] = useState<number>(0.18);

  // ✅ Aplica as configurações em tempo real para preview (sem persistir no localStorage)
  useEffect(() => {
    if (!loading) {
      applySettingsToDOM(
        {
          brand_primary: brandPrimary,
          brand_accent: brandAccent,
          brand_bg: brandBg,
          font_family: previewFont || fontFamily,
          button_config_light: {
            style: buttonStyleLight,
            bg: buttonBgLight,
            border: buttonBorderLight,
            text: buttonTextLight,
            icon: buttonIconLight,
          },
          button_config_dark: {
            style: buttonStyleDark,
            bg: buttonBgDark,
            border: buttonBorderDark,
            text: buttonTextDark,
            icon: buttonIconDark,
          },
          button_style: isLightMode ? buttonStyleLight : buttonStyleDark,
          button_bg: isLightMode ? buttonBgLight : buttonBgDark,
          button_border: isLightMode ? buttonBorderLight : buttonBorderDark,
          button_text: isLightMode ? buttonTextLight : buttonTextDark,
          button_icon: isLightMode ? buttonIconLight : buttonIconDark,
          app_scale: appScale,
          mobile_scale: mobileScale,
          app_background_url: bgUrl,
          app_background_fit: bgFit,
          app_background_opacity: bgEnabled ? bgOpacity : 0,
          app_background_pos_x: `${bgPosX}%`,
          app_background_pos_y: `${bgPosY}%`,
          app_background_scale: bgScale,
          app_background_blur: bgBlur,

          mobile_app_background_url: mobileBgUrl,
          mobile_app_background_fit: mobileBgFit,
          mobile_app_background_opacity: mobileBgEnabled ? mobileBgOpacity : 0,
          mobile_app_background_pos_x: `${mobileBgPosX}%`,
          mobile_app_background_pos_y: `${mobileBgPosY}%`,
          mobile_app_background_scale: mobileBgScale,
          mobile_app_background_blur: mobileBgBlur,
        },
        false,
      );
    }
  }, [
    loading,
    brandPrimary,
    brandAccent,
    brandBg,
    fontFamily,
    previewFont,
    buttonStyleLight,
    buttonBgLight,
    buttonBorderLight,
    buttonTextLight,
    buttonIconLight,
    buttonStyleDark,
    buttonBgDark,
    buttonBorderDark,
    buttonTextDark,
    buttonIconDark,
    isLightMode,
    appScale,
    mobileScale,
    bgUrl,
    bgFit,
    bgEnabled,
    bgOpacity,
    bgPosX,
    bgPosY,
    bgScale,
    bgBlur,
    mobileBgUrl,
    mobileBgFit,
    mobileBgEnabled,
    mobileBgOpacity,
    mobileBgPosX,
    mobileBgPosY,
    mobileBgScale,
    mobileBgBlur,
  ]);

  // ✅ Configura rolagem vertical suave com toque/deslizar na página de configurações e subpainéis
  useEffect(() => {
    const mainEl = document.querySelector(".gm-main") as HTMLElement;
    if (mainEl) {
      mainEl.style.overflowY = "auto";
      (mainEl.style as any).webkitOverflowScrolling = "touch";
      mainEl.style.scrollBehavior = "smooth";
      mainEl.style.touchAction = "pan-y";
    }
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [viewMode]);

  // ✅ Reverte para as configurações salvas se sair sem salvar
  useEffect(() => {
    return () => {
      const saved = localStorage.getItem("gm.settings.cache.v1");
      if (saved) {
        try {
          const s = JSON.parse(saved);
          applySettingsToDOM(s);
        } catch (e) {}
      }
    };
  }, []);

  // ✅ IMPORTANTE: Preview Scale (somente UI / não salva no Supabase)
  const [bgPreviewScale, setBgPreviewScale] = useState(1);

  const [presets, setPresets] = useState<ThemePreset[]>([]);

  // ✅ PIX Preview (Configurações)
  const [pixPayloadPreview, setPixPayloadPreview] = useState("");
  const [pixQrPreview, setPixQrPreview] = useState("");
  const [pixCopied, setPixCopied] = useState(false);

  const canSave = useMemo(() => !!tenantId && !saving, [tenantId, saving]);

  async function load() {
    try {
      // ✅ settings
      const s = await fetchSettingsSupabase(tenantId);
      if (s) {
        setCompanyName(s.company_name || "GM edificação");
        setPixType(s.pix_type || "CPF");
        setPixKey(s.pix_key || "");

        const activeIsLight = localStorage.getItem("theme") === "light";
        if (activeIsLight) {
          const savedLight = s.bio_config?.theme_colors_light || JSON.parse(localStorage.getItem("gm_colors_light") || "null");
          setBrandPrimary(savedLight?.primary || "#FF6900");
          setBrandAccent(savedLight?.accent || "#FF6900");
          setBrandBg(savedLight?.bg || "#FFFFFF");
          setBrandTitle(savedLight?.title || "#1B1D22");
          setBrandSubtitle(savedLight?.subtitle || "#6B7280");
          setBrandIcon(savedLight?.icon || "#FF6900");

          setMenuPrimary(savedLight?.menu_primary || "#FF6900");
          setMenuBg(savedLight?.menu_bg || "#FFFFFF");
          setMenuTitle(savedLight?.menu_title || "#1B1D22");
          setMenuSubtitle(savedLight?.menu_subtitle || "#6B7280");
          setMenuIcon(savedLight?.menu_icon || "#FF6900");
          setMenuButton(savedLight?.menu_button || "#FF6900");
        } else {
          const savedDark = s.bio_config?.theme_colors_dark || JSON.parse(localStorage.getItem("gm_colors_dark") || "null");
          const darkPrimary = savedDark?.primary || (s.brand_primary && s.brand_primary !== "#32BCAD" ? s.brand_primary : null) || "#FF7B17";
          const darkAccent = savedDark?.accent || (s.brand_accent && s.brand_accent !== "#32BCAD" ? s.brand_accent : null) || "#FF7B17";
          const darkBg = savedDark?.bg || (s.brand_bg && s.brand_bg !== "#0b1220" ? s.brand_bg : null) || "#0f1117";

          setBrandPrimary(darkPrimary);
          setBrandAccent(darkAccent);
          setBrandBg(darkBg);
          setBrandTitle(savedDark?.title || "#FFFFFF");
          setBrandSubtitle(savedDark?.subtitle || "#94A3B8");
          setBrandIcon(savedDark?.icon || darkAccent);

          setMenuPrimary(savedDark?.menu_primary || darkPrimary);
          setMenuBg(savedDark?.menu_bg || darkBg);
          setMenuTitle(savedDark?.menu_title || "#FFFFFF");
          setMenuSubtitle(savedDark?.menu_subtitle || "#94A3B8");
          setMenuIcon(savedDark?.menu_icon || darkAccent);
          setMenuButton(savedDark?.menu_button || darkAccent);
        }
        
        setFontFamily(s.font_family || "Inter");
        // Carrega configurações do botão no Modo Claro (☀️)
        const savedBtnLight = JSON.parse(localStorage.getItem("gm_button_light") || "null") || s.button_config_light || s.bio_config?.button_config_light;
        if (savedBtnLight) {
          setButtonStyleLight(savedBtnLight.style || "vazado");
          setButtonBgLight(savedBtnLight.bg ?? "transparent");
          setButtonBorderLight(savedBtnLight.border || "#FF6900");
          setButtonTextLight(savedBtnLight.text || "#18181B");
          setButtonIconLight(savedBtnLight.icon || "#FF6900");
        } else {
          setButtonStyleLight("vazado");
          setButtonBgLight("transparent");
          setButtonBorderLight("#FF6900");
          setButtonTextLight("#18181B");
          setButtonIconLight("#FF6900");
        }

        // Carrega configurações do botão no Modo Escuro (🌙)
        const savedBtnDark = JSON.parse(localStorage.getItem("gm_button_dark") || "null") || s.button_config_dark || s.bio_config?.button_config_dark;
        if (savedBtnDark) {
          setButtonStyleDark(savedBtnDark.style || "vazado");
          setButtonBgDark(savedBtnDark.bg ?? "transparent");
          setButtonBorderDark(savedBtnDark.border || "#FF7B17");
          setButtonTextDark(savedBtnDark.text || "#FFFFFF");
          setButtonIconDark(savedBtnDark.icon || "#FF7B17");
        } else {
          setButtonStyleDark("vazado");
          setButtonBgDark("transparent");
          setButtonBorderDark("#FF7B17");
          setButtonTextDark("#FFFFFF");
          setButtonIconDark("#FF7B17");
        }

        setCompanyLogoUrl(s.company_logo_url || null);
        setAvatarUrl(s.avatar_url || null);
        setTimbradoUrl(s.timbrado_url || null);

        setBgUrl(s.app_background_url || null);
        setBgFit((s.app_background_fit as Fit) || "cover");

        const op = Number(s.app_background_opacity ?? 0.18);
        setBgOpacity(op);
        setBgOpacityPrev(op > 0 ? op : 0.18);

        const sc = Number((s as any).app_background_scale ?? 1);
        setBgScale(Number.isFinite(sc) && sc > 0 ? sc : 1);

        const bl = Number((s as any).app_background_blur ?? 10);
        setBgBlur(Number.isFinite(bl) ? Math.min(24, Math.max(0, bl)) : 10);

        const px = parseFloat(s.app_background_pos_x || "50");
        setBgPosX(!isNaN(px) ? px : 50);

        const py = parseFloat(s.app_background_pos_y || "50");
        setBgPosY(!isNaN(py) ? py : 50);

        // Mobile BG
        setMobileBgUrl(
          s.mobile_app_background_url || s.app_background_url || null,
        );
        setMobileBgFit(
          (s.mobile_app_background_fit as Fit) ||
            (s.app_background_fit as Fit) ||
            "cover",
        );

        const mop = Number(
          s.mobile_app_background_opacity ?? s.app_background_opacity ?? 0.18,
        );
        setMobileBgOpacity(mop);
        setMobileBgOpacityPrev(mop > 0 ? mop : 0.18);
        setMobileBgEnabled(mop > 0);

        const msc = Number(s.mobile_app_background_scale ?? 1.2);
        setMobileBgScale(Number.isFinite(msc) && msc > 0 ? msc : 1.2);

        const mbl = Number(s.mobile_app_background_blur ?? 10);
        setMobileBgBlur(
          Number.isFinite(mbl) ? Math.min(24, Math.max(0, mbl)) : 10,
        );

        const mpx = parseFloat(s.mobile_app_background_pos_x || "50");
        setMobileBgPosX(!isNaN(mpx) ? mpx : 50);

        const mpy = parseFloat(s.mobile_app_background_pos_y || "50");
        setMobileBgPosY(!isNaN(mpy) ? mpy : 50);

        const as = Number(s.app_scale ?? 1.0);
        setAppScale(Number.isFinite(as) && as > 0 ? as : 1.0);
        setOriginalScale(Number.isFinite(as) && as > 0 ? as : 1.0);

        const ms = Number(s.mobile_scale ?? 1.5);
        setMobileScale(Number.isFinite(ms) && ms > 0 ? ms : 1.5);

        setBgEnabled(!!s.app_background_url && op > 0);

        setPresets(
          Array.isArray(s.theme_presets) ? (s.theme_presets as any) : [],
        );
        applySettingsToDOM(s);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // ✅ Gera QR + Copia e Cola na tela de Configurações (universal, qualquer banco)
  useEffect(() => {
    const key = (pixKey || "").trim();
    if (!key) {
      setPixPayloadPreview("");
      setPixQrPreview("");
      return;
    }

    try {
      const payload = buildPixPayload({
        pixKey: key,
        merchantName: companyName || "GM PRO",
        merchantCity: "SAO LUIS",
        // Sem valor aqui = QR estático genérico (o banco deixa digitar valor)
        txid: "***",
        message: "Pagamento via Pix",
      });

      setPixPayloadPreview(payload);

      QRCode.toDataURL(payload, { margin: 2, scale: 8 })
        .then(setPixQrPreview)
        .catch((e) => {
          console.error("Erro gerando QR Pix (Config)", e);
          setPixQrPreview("");
        });
    } catch (e) {
      console.error("Erro gerando payload Pix (Config)", e);
      setPixPayloadPreview("");
      setPixQrPreview("");
    }
  }, [pixKey, companyName]);

  async function handleSave() {
    if (!tenantId) return;
    setSaving(true);
    try {
      // Busca as configurações atuais para obter o bio_config atualizado
      const s = await fetchSettingsSupabase(tenantId);
      const currentBioConfig = s?.bio_config || {};
      const activeIsLight = localStorage.getItem("theme") === "light";

      // Salva no localStorage e no bio_config correspondente
      if (activeIsLight) {
        const payloadLight = { 
          primary: brandPrimary, 
          accent: brandAccent, 
          bg: brandBg,
          title: brandTitle,
          subtitle: brandSubtitle,
          icon: brandIcon,
          button: brandAccent,
          menu_primary: menuPrimary,
          menu_bg: menuBg,
          menu_title: menuTitle,
          menu_subtitle: menuSubtitle,
          menu_icon: menuIcon,
          menu_button: menuButton,
        };
        localStorage.setItem("gm_colors_light", JSON.stringify(payloadLight));
        currentBioConfig.theme_colors_light = payloadLight;
      } else {
        const payloadDark = { 
          primary: brandPrimary, 
          accent: brandAccent, 
          bg: brandBg,
          title: brandTitle,
          subtitle: brandSubtitle,
          icon: brandIcon,
          button: brandAccent,
          menu_primary: menuPrimary,
          menu_bg: menuBg,
          menu_title: menuTitle,
          menu_subtitle: menuSubtitle,
          menu_icon: menuIcon,
          menu_button: menuButton,
        };
        localStorage.setItem("gm_colors_dark", JSON.stringify(payloadDark));
        currentBioConfig.theme_colors_dark = payloadDark;
      }

      // Salva configurações de botão para ambos os temas
      const btnConfigLight = {
        style: buttonStyleLight,
        bg: buttonBgLight,
        border: buttonBorderLight,
        text: buttonTextLight,
        icon: buttonIconLight,
      };
      const btnConfigDark = {
        style: buttonStyleDark,
        bg: buttonBgDark,
        border: buttonBorderDark,
        text: buttonTextDark,
        icon: buttonIconDark,
      };

      localStorage.setItem("gm_button_light", JSON.stringify(btnConfigLight));
      localStorage.setItem("gm_button_dark", JSON.stringify(btnConfigDark));
      currentBioConfig.button_config_light = btnConfigLight;
      currentBioConfig.button_config_dark = btnConfigDark;

      const next = await upsertSettingsSupabase(tenantId, {
        company_name: companyName,
        pix_type: pixType,
        pix_key: pixKey,

        brand_primary: brandPrimary,
        brand_accent: brandAccent,
        brand_bg: brandBg,
        font_family: fontFamily,

        company_logo_url: companyLogoUrl,
        avatar_url: avatarUrl,
        timbrado_url: timbradoUrl,

        app_background_url: bgUrl,
        app_background_fit: bgFit,

        // toggle background: desligado = opacidade 0
        app_background_opacity: bgEnabled
          ? Math.min(1, Math.max(0, bgOpacity || bgOpacityPrev))
          : 0,
        app_background_scale: Math.min(5, Math.max(0.1, bgScale)),
        app_background_blur: Math.min(24, Math.max(0, bgBlur)),

        app_background_pos_x: `${bgPosX}%`,
        app_background_pos_y: `${bgPosY}%`,

        // Mobile BG Settings
        mobile_app_background_url: mobileBgUrl,
        mobile_app_background_fit: mobileBgFit,
        mobile_app_background_opacity: mobileBgEnabled
          ? Math.min(1, Math.max(0, mobileBgOpacity || mobileBgOpacityPrev))
          : 0,
        mobile_app_background_scale: Math.min(5, Math.max(0.1, mobileBgScale)),
        mobile_app_background_blur: Math.min(24, Math.max(0, mobileBgBlur)),
        mobile_app_background_pos_x: `${mobileBgPosX}%`,
        mobile_app_background_pos_y: `${mobileBgPosY}%`,

        app_scale: Math.min(2, Math.max(0.5, appScale)),
        mobile_scale: Math.min(3, Math.max(0.5, mobileScale)),

        button_config_light: btnConfigLight,
        button_config_dark: btnConfigDark,
        button_style: activeIsLight ? buttonStyleLight : buttonStyleDark,
        button_bg: activeIsLight ? buttonBgLight : buttonBgDark,
        button_border: activeIsLight ? buttonBorderLight : buttonBorderDark,
        button_text: activeIsLight ? buttonTextLight : buttonTextDark,
        button_icon: activeIsLight ? buttonIconLight : buttonIconDark,
        theme_presets: presets,
        bio_config: currentBioConfig, // Salva o bio_config atualizado
      });

      applySettingsToDOM(next);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  async function processAndUploadImageAsset(
    file: File,
    kind: "logo" | "avatar",
    setUploading: (u: boolean) => void,
    setProgress: (p: number) => void,
    setStatusText: (t: string) => void,
    setStats: (s: any) => void,
    setUrl: (url: string) => void
  ) {
    if (!tenantId) return;
    setUploading(true);
    setProgress(15);
    setStatusText("Prévia instantânea...");

    // 1. AUTO VISUALIZAÇÃO INSTANTÂNEA: exibe a imagem local na hora
    const localBlobUrl = URL.createObjectURL(file);
    setUrl(localBlobUrl);

    try {
      setProgress(35);
      setStatusText("Auto-comprimindo imagem...");

      let fileToUpload = file;
      const isSvg = file.type.includes("svg");
      const isGif = file.type.includes("gif");

      // 2. AUTO COMPRESSÃO DE IMAGEM
      if (file.type.startsWith("image/") && !isSvg && !isGif) {
        try {
          const options = {
            maxSizeMB: 0.8,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
            initialQuality: 0.85,
          };
          const compressed = await imageCompression(file, options);
          if (compressed && compressed.size < file.size) {
            fileToUpload = compressed;
          }
        } catch (e1) {
          try {
            fileToUpload = await compressImage(file, { quality: 0.85, maxDimension: 1200 });
          } catch (e2) {
            fileToUpload = file;
          }
        }
      }

      const origStr = formatBytes(file.size);
      const compStr = formatBytes(fileToUpload.size);
      const reductionPercent = file.size > 0 
        ? Math.max(0, Math.round(((file.size - fileToUpload.size) / file.size) * 100))
        : 0;

      if (fileToUpload.size < file.size) {
        setStats({
          originalSize: origStr,
          compressedSize: compStr,
          reduction: `${reductionPercent}% menor`,
        });
      } else {
        setStats({
          originalSize: origStr,
          compressedSize: compStr,
          reduction: "100% Otimizada",
        });
      }

      setProgress(65);
      setStatusText("Enviando para nuvem...");

      // 3. UPLOAD STORAGE
      const remoteUrl = await uploadTenantAsset(tenantId, fileToUpload, kind);
      const finalUrl = `${remoteUrl}?t=${Date.now()}`;

      setProgress(90);
      setStatusText("Sincronizando...");

      URL.revokeObjectURL(localBlobUrl);
      setUrl(finalUrl);

      setProgress(100);
      setStatusText("Carregado com sucesso!");

      setTimeout(() => {
        setProgress(0);
        setStatusText("");
      }, 3500);
    } catch (e: any) {
      console.error(`Erro no upload de ${kind}:`, e);
      setStatusText("Erro ao enviar");
      alert(e?.message || "Ocorreu um erro durante o upload da imagem.");
    } finally {
      setUploading(false);
    }
  }

  async function onUploadLogo(file: File) {
    await processAndUploadImageAsset(
      file,
      "logo",
      setUploadingLogo,
      setLogoProgress,
      setLogoStatusText,
      setLogoStats,
      setCompanyLogoUrl
    );
  }

  async function onUploadAvatar(file: File) {
    await processAndUploadImageAsset(
      file,
      "avatar",
      setUploadingAvatar,
      setAvatarProgress,
      setAvatarStatusText,
      setAvatarStats,
      setAvatarUrl
    );
  }

  const [uploadingBackground, setUploadingBackground] = useState(false);

  async function onUploadBackground(file: File) {
    if (!tenantId) return;
    setUploadingBackground(true);
    try {
      let fileToUpload = file;
      const isImage = file.type.startsWith("image/");
      const isGif = file.type === "image/gif";

      if (isImage && !isGif) {
        const options = {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.8,
        };
        try {
          fileToUpload = await imageCompression(file, options);
        } catch (e) {
          console.warn(
            "Compressão falhou, será enviado o arquivo original:",
            e,
          );
        }
      } else {
        if (file.size > 15 * 1024 * 1024) {
          throw new Error(
            "Arquivo muito grande. O limite máximo é 15MB para GIFs/Vídeos.",
          );
        }
      }

      const url = await uploadTenantAsset(tenantId, fileToUpload, "background");
      if (viewMode === "smartphone") {
        setMobileBgUrl(url);
      } else {
        setBgUrl(url);
      }
    } catch (e: any) {
      alert(e.message || "Erro no upload");
    } finally {
      setUploadingBackground(false);
    }
  }

  async function onUploadTimbrado(file: File) {
    try {
      setUploadingTimbrado(true);
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;
      const url = await uploadTimbradoA4(uid, file);
      setTimbradoUrl(url);
    } catch (error) {
      console.error("Erro ao enviar timbrado:", error);
    } finally {
      setUploadingTimbrado(false);
    }
  }

  async function importJson(file: File) {
    const raw = await file.text();
    const obj = JSON.parse(raw || "{}");

    setCompanyName(obj.companyName ?? companyName);
    setPixType(obj.pixType ?? pixType);
    setPixKey(obj.pixKey ?? pixKey);

    setBrandPrimary(obj.brandPrimary ?? brandPrimary);
    setBrandAccent(obj.brandAccent ?? brandAccent);
    setBrandBg(obj.brandBg ?? brandBg);
    setFontFamily(obj.fontFamily ?? fontFamily);

    setCompanyLogoUrl(obj.companyLogoUrl ?? companyLogoUrl);
    setAvatarUrl(obj.avatarUrl ?? avatarUrl);
    setTimbradoUrl(obj.timbradoUrl ?? timbradoUrl);

    setBgUrl(obj.bgUrl ?? bgUrl);
    setBgFit(obj.bgFit ?? bgFit);

    setBgOpacity(Number(obj.bgOpacity ?? bgOpacity));
    setBgScale(Number(obj.bgScale ?? bgScale));
    setBgBlur(Number(obj.bgBlur ?? bgBlur));

    setBgPosX(Number(obj.bgPosX ?? bgPosX));
    setBgPosY(Number(obj.bgPosY ?? bgPosY));

    setMobileBgUrl(obj.mobileBgUrl ?? mobileBgUrl);
    setMobileBgFit(obj.mobileBgFit ?? mobileBgFit);
    setMobileBgOpacity(Number(obj.mobileBgOpacity ?? mobileBgOpacity));
    setMobileBgScale(Number(obj.mobileBgScale ?? mobileBgScale));
    setMobileBgBlur(Number(obj.mobileBgBlur ?? mobileBgBlur));
    setMobileBgPosX(Number(obj.mobileBgPosX ?? mobileBgPosX));
    setMobileBgPosY(Number(obj.mobileBgPosY ?? mobileBgPosY));

    setAppScale(Number(obj.appScale ?? appScale));
    setMobileScale(Number(obj.mobileScale ?? mobileScale));

    setPresets(Array.isArray(obj.presets) ? obj.presets : presets);
  }

  function savePreset() {
    const name = prompt("Nome do preset (ex: GM Laranja)")?.trim();
    if (!name) return;

    const p: ThemePreset = {
      name,
      brand_primary: brandPrimary,
      brand_accent: brandAccent,
      brand_bg: brandBg,
      font_family: fontFamily,
    };
    setPresets((arr) => [p, ...arr].slice(0, 12));
  }

  function applyPreset(p: ThemePreset) {
    setBrandPrimary(p.brand_primary);
    setBrandAccent(p.brand_accent);
    setBrandBg(p.brand_bg);
    setFontFamily(p.font_family);
  }

  const PRESET_THEMES = [
    {
      name: "Sunset Orange",
      primary: "#ff7b00",
      accent: "#ff9a1a",
      bg: "#0f1117",
      foreground: "#ffffff",
    },
    {
      name: "Cyber Emerald",
      primary: "#00FF91",
      accent: "#00FF55",
      bg: "#0A110E",
      foreground: "#00331d",
    },
    {
      name: "Electric Violet",
      primary: "#8B5CF6",
      accent: "#C084FC",
      bg: "#0F0E17",
      foreground: "#ffffff",
    },
    {
      name: "Deep Sea Cyan",
      primary: "#00D1FF",
      accent: "#00F0FF",
      bg: "#0B1215",
      foreground: "#003540",
    },
    {
      name: "Royal Gold",
      primary: "#FFB800",
      accent: "#FFD600",
      bg: "#12110A",
      foreground: "#332500",
    },
    {
      name: "Crimson Red",
      primary: "#EF4444",
      accent: "#F87171",
      bg: "#110A0A",
      foreground: "#ffffff",
    },
    {
      name: "Midnight Blue",
      primary: "#3B82F6",
      accent: "#60A5FA",
      bg: "#0A0D14",
      foreground: "#ffffff",
    },
    {
      name: "Rose Quartz",
      primary: "#EC4899",
      accent: "#F472B6",
      bg: "#140A0F",
      foreground: "#ffffff",
    },
    {
      name: "Arctic Glass",
      primary: "#F8FAFC",
      accent: "#CBD5E1",
      bg: "#121215",
      foreground: "#121215",
    },
    {
      name: "Neon Pink",
      primary: "#FF00E5",
      accent: "#FF70F0",
      bg: "#120A14",
      foreground: "#ffffff",
    },
  ];

  const BUTTON_STYLES = [
    {
      id: "solid",
      name: "Botão Sólido Preenchido",
      desc: "Design limpo e moderno com preenchimento de cor sólida, alto contraste e presença marcante.",
      badge: "Sólido",
    },
    {
      id: "outline",
      name: "Botão Vazado com Contorno",
      desc: "Design elegante com fundo transparente, contorno refinado e visual leve e minimalista.",
      badge: "Vazado",
    },
    {
      id: "glass",
      name: "Botão Vidro (Glass)",
      desc: "Efeito moderno de vidro fosco translúcido (Glassmorphic) com desfoque de fundo e brilho cristalino sutil.",
      badge: "Vidro",
    },
  ];

  const updateButtonLight = (patch: {
    style?: string;
    bg?: string;
    border?: string;
    text?: string;
    icon?: string;
  }) => {
    const style = patch.style !== undefined ? patch.style : buttonStyleLight;
    const bg = patch.bg !== undefined ? patch.bg : buttonBgLight;
    const border = patch.border !== undefined ? patch.border : buttonBorderLight;
    const text = patch.text !== undefined ? patch.text : buttonTextLight;
    const icon = patch.icon !== undefined ? patch.icon : buttonIconLight;

    setButtonStyleLight(style);
    setButtonBgLight(bg);
    setButtonBorderLight(border);
    setButtonTextLight(text);
    setButtonIconLight(icon);

    const cfg = { style, bg, border, text, icon };
    localStorage.setItem("gm_button_light", JSON.stringify(cfg));

    if (isLightMode) {
      document.documentElement.setAttribute("data-button-style", style);
      document.documentElement.style.setProperty("--gm-btn-bg", bg);
      document.documentElement.style.setProperty("--gm-btn-border", border);
      document.documentElement.style.setProperty("--gm-btn-text", text);
      document.documentElement.style.setProperty("--gm-btn-icon", icon);
    }
  };

  const updateButtonDark = (patch: {
    style?: string;
    bg?: string;
    border?: string;
    text?: string;
    icon?: string;
  }) => {
    const style = patch.style !== undefined ? patch.style : buttonStyleDark;
    const bg = patch.bg !== undefined ? patch.bg : buttonBgDark;
    const border = patch.border !== undefined ? patch.border : buttonBorderDark;
    const text = patch.text !== undefined ? patch.text : buttonTextDark;
    const icon = patch.icon !== undefined ? patch.icon : buttonIconDark;

    setButtonStyleDark(style);
    setButtonBgDark(bg);
    setButtonBorderDark(border);
    setButtonTextDark(text);
    setButtonIconDark(icon);

    const cfg = { style, bg, border, text, icon };
    localStorage.setItem("gm_button_dark", JSON.stringify(cfg));

    if (!isLightMode) {
      document.documentElement.setAttribute("data-button-style", style);
      document.documentElement.style.setProperty("--gm-btn-bg", bg);
      document.documentElement.style.setProperty("--gm-btn-border", border);
      document.documentElement.style.setProperty("--gm-btn-text", text);
      document.documentElement.style.setProperty("--gm-btn-icon", icon);
    }
  };

  const handleButtonStyleChange = (newStyle: string) => {
    if (btnConfigTab === "light") {
      const defPrimary = brandPrimary || "#FF6900";
      let bg = "transparent";
      let border = defPrimary;
      let text = "#18181B";
      let icon = defPrimary;

      if (newStyle === "solid") {
        bg = defPrimary;
        border = defPrimary;
        text = "#FFFFFF";
        icon = "#FFFFFF";
      } else if (newStyle === "outline" || newStyle === "vazado") {
        bg = "transparent";
        border = defPrimary;
        text = "#18181B";
        icon = defPrimary;
      } else if (newStyle === "glass") {
        bg = "rgba(255, 255, 255, 0.4)";
        border = "rgba(255, 255, 255, 0.6)";
        text = "#18181B";
        icon = defPrimary;
      }
      updateButtonLight({ style: newStyle, bg, border, text, icon });
    } else {
      const defPrimary = brandPrimary || "#FF7B17";
      let bg = "transparent";
      let border = defPrimary;
      let text = "#FFFFFF";
      let icon = defPrimary;

      if (newStyle === "solid") {
        bg = defPrimary;
        border = defPrimary;
        text = "#FFFFFF";
        icon = "#FFFFFF";
      } else if (newStyle === "outline" || newStyle === "vazado") {
        bg = "transparent";
        border = defPrimary;
        text = "#FFFFFF";
        icon = defPrimary;
      } else if (newStyle === "glass") {
        bg = "rgba(255, 255, 255, 0.15)";
        border = "rgba(255, 255, 255, 0.3)";
        text = "#FFFFFF";
        icon = defPrimary;
      }
      updateButtonDark({ style: newStyle, bg, border, text, icon });
    }
  };

  const applyTheme = (theme: (typeof PRESET_THEMES)[0]) => {
    setBrandPrimary(theme.primary);
    setBrandAccent(theme.accent);
    setBrandBg(theme.bg);
  };

  const ColorPickerInput = ({
    label,
    value,
    onChange,
  }: {
    label: React.ReactNode;
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div>
      <label className="gm-label flex items-center gap-2">{label}</label>
      <div className="flex items-center gap-2">
        <div
          className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0 shadow-sm"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-[200%] h-[200%] -top-[50%] -left-[50%] p-0 border-0 cursor-pointer opacity-0"
            title="Escolher cor"
          />
        </div>
        <input
          className="gm-input uppercase font-mono text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
        />
      </div>
    </div>
  );

  return (
    <Page
      title="Configurações"
      className={viewMode === "smartphone" ? "-mt-7 md:mt-0 pt-0" : ""}
      actions={
        <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0 items-center">
          <AnimatePresence>
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-lg text-sm font-medium absolute -top-10 right-0 sm:static"
              >
                <Check size={16} />
                Salvo!
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            className="gm-btn w-auto justify-center h-12 px-6 text-sm rounded-xl disabled:opacity-50 transition-all font-extrabold active:scale-95 shadow-[0_4px_14px_rgba(255,105,0,0.25)] flex items-center gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save size={16} className="text-white" />
                <span>Salvar</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="flex flex-col flex-1 w-full">
        {/* CONTENT */}
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-6 pb-60">
          {loading ? (
            <Card className="text-center p-10">Carregando...</Card>
          ) : (
            <div className="w-full flex flex-col gap-6">
              {/* SUBDIVISÃO SUPERIOR: Menu de Cápsulas de Expansão do Painel de Configurações */}
              <SectionDivider label="Personalização do app" />
              <div className="gm-settings-card flex flex-col gap-3 bg-white dark:bg-zinc-900/60 p-4 sm:p-5 rounded-lg border border-slate-200/80 dark:border-zinc-800/80 shadow-xs backdrop-blur-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
                  <span className="text-xs font-extrabold text-[var(--gm-primary)] uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--gm-primary)] animate-pulse" />
                    PAINEL DE CONFIGURAÇÕES
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {hasActiveSection 
                      ? "Clique na cápsula ativa para recolher e exibir as outras opções" 
                      : "Selecione uma opção para expandir e editar"}
                  </span>
                </div>

                <div className={hasActiveSection ? "flex flex-col sm:flex-row gap-2.5 justify-center flex-wrap" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5"}>
                  {/* 1. Personalização */}
                  {(!hasActiveSection || openSections.personalization) && (
                    <button
                      type="button"
                      onClick={() => toggleSection('personalization')}
                      className={getSectionBtnClass(openSections.personalization)}
                    >
                      {openSections.personalization && (
                        <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--gm-primary)] rounded-full shadow-[0_0_8px_var(--gm-primary)]" />
                      )}
                      <span className="flex items-center gap-3">
                        <Palette className={"w-4 h-4 transition-transform duration-200 " + (openSections.personalization ? "text-[var(--gm-primary)] scale-110" : "text-[var(--gm-primary)] opacity-85 group-hover:scale-110")} />
                        PERSONALIZAÇÃO
                      </span>
                      <div className="flex items-center gap-2">
                        {openSections.personalization && (
                          <span className="text-[10px] text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--gm-primary)]/20 uppercase tracking-wide font-bold animate-pulse">RECOLHER</span>
                        )}
                        <ChevronDown className={"w-4 h-4 transition-transform duration-300 " + (openSections.personalization ? "text-[var(--gm-primary)] rotate-180" : "text-slate-400 group-hover:text-[var(--gm-primary)]")} />
                      </div>
                    </button>
                  )}

                  {/* 2. Cores & Fonte */}
                  {(!hasActiveSection || openSections.colors) && (
                    <button
                      type="button"
                      onClick={() => toggleSection('colors')}
                      className={getSectionBtnClass(openSections.colors)}
                    >
                      {openSections.colors && (
                        <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--gm-primary)] rounded-full shadow-[0_0_8px_var(--gm-primary)]" />
                      )}
                      <span className="flex items-center gap-3">
                        <Paintbrush className={"w-4 h-4 transition-transform duration-200 " + (openSections.colors ? "text-[var(--gm-primary)] scale-110" : "text-[var(--gm-primary)] opacity-85 group-hover:scale-110")} />
                        CORES & FONTE
                      </span>
                      <div className="flex items-center gap-2">
                        {openSections.colors && (
                          <span className="text-[10px] text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--gm-primary)]/20 uppercase tracking-wide font-bold animate-pulse">RECOLHER</span>
                        )}
                        <ChevronDown className={"w-4 h-4 transition-transform duration-300 " + (openSections.colors ? "text-[var(--gm-primary)] rotate-180" : "text-slate-400 group-hover:text-[var(--gm-primary)]")} />
                      </div>
                    </button>
                  )}

                  {/* 3. Imagem de Fundo */}
                  {(!hasActiveSection || openSections.background) && (
                    <button
                      type="button"
                      onClick={() => toggleSection('background')}
                      className={getSectionBtnClass(openSections.background)}
                    >
                      {openSections.background && (
                        <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--gm-primary)] rounded-full shadow-[0_0_8px_var(--gm-primary)]" />
                      )}
                      <span className="flex items-center gap-3">
                        <ImageIcon className={"w-4 h-4 transition-transform duration-200 " + (openSections.background ? "text-[var(--gm-primary)] scale-110" : "text-[var(--gm-primary)] opacity-85 group-hover:scale-110")} />
                        IMAGEM DE FUNDO
                      </span>
                      <div className="flex items-center gap-2">
                        {openSections.background && (
                          <span className="text-[10px] text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--gm-primary)]/20 uppercase tracking-wide font-bold animate-pulse">RECOLHER</span>
                        )}
                        <ChevronDown className={"w-4 h-4 transition-transform duration-300 " + (openSections.background ? "text-[var(--gm-primary)] rotate-180" : "text-slate-400 group-hover:text-[var(--gm-primary)]")} />
                      </div>
                    </button>
                  )}

                  {/* 4. Dados PIX */}
                  {(!hasActiveSection || openSections.pix) && (
                    <button
                      type="button"
                      onClick={() => toggleSection('pix')}
                      className={getSectionBtnClass(openSections.pix)}
                    >
                      {openSections.pix && (
                        <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--gm-primary)] rounded-full shadow-[0_0_8px_var(--gm-primary)]" />
                      )}
                      <span className="flex items-center gap-3">
                        <CreditCard className={"w-4 h-4 transition-transform duration-200 " + (openSections.pix ? "text-[var(--gm-primary)] scale-110" : "text-[var(--gm-primary)] opacity-85 group-hover:scale-110")} />
                        DADOS PIX
                      </span>
                      <div className="flex items-center gap-2">
                        {openSections.pix && (
                          <span className="text-[10px] text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--gm-primary)]/20 uppercase tracking-wide font-bold animate-pulse">RECOLHER</span>
                        )}
                        <ChevronDown className={"w-4 h-4 transition-transform duration-300 " + (openSections.pix ? "text-[var(--gm-primary)] rotate-180" : "text-slate-400 group-hover:text-[var(--gm-primary)]")} />
                      </div>
                    </button>
                  )}

                  {/* 5. Papel Timbrado */}
                  {(!hasActiveSection || openSections.timbrado) && (
                    <button
                      type="button"
                      onClick={() => toggleSection('timbrado')}
                      className={getSectionBtnClass(openSections.timbrado)}
                    >
                      {openSections.timbrado && (
                        <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--gm-primary)] rounded-full shadow-[0_0_8px_var(--gm-primary)]" />
                      )}
                      <span className="flex items-center gap-3">
                        <FileText className={"w-4 h-4 transition-transform duration-200 " + (openSections.timbrado ? "text-[var(--gm-primary)] scale-110" : "text-[var(--gm-primary)] opacity-85 group-hover:scale-110")} />
                        PAPEL TIMBRADO
                      </span>
                      <div className="flex items-center gap-2">
                        {openSections.timbrado && (
                          <span className="text-[10px] text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--gm-primary)]/20 uppercase tracking-wide font-bold animate-pulse">RECOLHER</span>
                        )}
                        <ChevronDown className={"w-4 h-4 transition-transform duration-300 " + (openSections.timbrado ? "text-[var(--gm-primary)] rotate-180" : "text-slate-400 group-hover:text-[var(--gm-primary)]")} />
                      </div>
                    </button>
                  )}

                  {/* 6. Notificações Push */}
                  {(!hasActiveSection || openSections.push) && (
                    <button
                      type="button"
                      onClick={() => toggleSection('push')}
                      className={getSectionBtnClass(openSections.push)}
                    >
                      {openSections.push && (
                        <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--gm-primary)] rounded-full shadow-[0_0_8px_var(--gm-primary)]" />
                      )}
                      <span className="flex items-center gap-3">
                        <Bell className={"w-4 h-4 transition-transform duration-200 " + (openSections.push ? "text-[var(--gm-primary)] scale-110" : "text-[var(--gm-primary)] opacity-85 group-hover:scale-110")} />
                        NOTIFICAÇÕES PUSH
                      </span>
                      <div className="flex items-center gap-2">
                        {openSections.push && (
                          <span className="text-[10px] text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--gm-primary)]/20 uppercase tracking-wide font-bold animate-pulse">RECOLHER</span>
                        )}
                        <ChevronDown className={"w-4 h-4 transition-transform duration-300 " + (openSections.push ? "text-[var(--gm-primary)] rotate-180" : "text-slate-400 group-hover:text-[var(--gm-primary)]")} />
                      </div>
                    </button>
                  )}

                  {/* 7. Sons do Sistema */}
                  {(!hasActiveSection || openSections.sounds) && (
                    <button
                      type="button"
                      onClick={() => toggleSection('sounds')}
                      className={getSectionBtnClass(openSections.sounds)}
                    >
                      {openSections.sounds && (
                        <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--gm-primary)] rounded-full shadow-[0_0_8px_var(--gm-primary)]" />
                      )}
                      <span className="flex items-center gap-3">
                        <Volume2 className={"w-4 h-4 transition-transform duration-200 " + (openSections.sounds ? "text-[var(--gm-primary)] scale-110" : "text-[var(--gm-primary)] opacity-85 group-hover:scale-110")} />
                        SONS DO SISTEMA
                      </span>
                      <div className="flex items-center gap-2">
                        {openSections.sounds && (
                          <span className="text-[10px] text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--gm-primary)]/20 uppercase tracking-wide font-bold animate-pulse">RECOLHER</span>
                        )}
                        <ChevronDown className={"w-4 h-4 transition-transform duration-300 " + (openSections.sounds ? "text-[var(--gm-primary)] rotate-180" : "text-slate-400 group-hover:text-[var(--gm-primary)]")} />
                      </div>
                    </button>
                  )}

                  {/* 8. Tutorial & Suporte */}
                  {(!hasActiveSection || openSections.tutorial) && (
                    <button
                      type="button"
                      onClick={() => toggleSection('tutorial')}
                      className={getSectionBtnClass(openSections.tutorial)}
                    >
                      {openSections.tutorial && (
                        <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--gm-primary)] rounded-full shadow-[0_0_8px_var(--gm-primary)]" />
                      )}
                      <span className="flex items-center gap-3">
                        <HelpCircle className={"w-4 h-4 transition-transform duration-200 " + (openSections.tutorial ? "text-[var(--gm-primary)] scale-110" : "text-[var(--gm-primary)] opacity-85 group-hover:scale-110")} />
                        TUTORIAL & SUPORTE
                      </span>
                      <div className="flex items-center gap-2">
                        {openSections.tutorial && (
                          <span className="text-[10px] text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--gm-primary)]/20 uppercase tracking-wide font-bold animate-pulse">RECOLHER</span>
                        )}
                        <ChevronDown className={"w-4 h-4 transition-transform duration-300 " + (openSections.tutorial ? "text-[var(--gm-primary)] rotate-180" : "text-slate-400 group-hover:text-[var(--gm-primary)]")} />
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Card quando nenhuma cápsula estiver aberta */}
              {!hasActiveSection && (
                <div className="gm-settings-card flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 rounded-[2.5rem] text-center shadow-xs backdrop-blur-md animate-in fade-in duration-300">
                  <div className="w-16 h-16 rounded-full bg-[var(--gm-primary)]/10 text-[var(--gm-primary)] flex items-center justify-center mb-4 border border-[var(--gm-primary)]/20 shadow-xs">
                    <Sparkles className="w-8 h-8 animate-pulse text-[var(--gm-primary)]" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-800 dark:text-white mb-2">Painel de Configurações</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed font-medium">
                    Clique em qualquer uma das cápsulas acima para abrir o painel correspondente e personalizar as opções do seu aplicativo.
                  </p>
                </div>
              )}

              {/* SEÇÃO 1: PERSONALIZAÇÃO */}
              {openSections.personalization && (
                <div className="gm-settings-card bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 p-4 sm:p-6 md:p-8 rounded-lg space-y-6 shadow-xs backdrop-blur-md w-full pb-10 animate-in fade-in duration-300">
                  <div className="sticky -top-4 sm:-top-6 md:-top-8 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md py-3 sm:py-4 border-b border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2.5 text-base sm:text-lg font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                      <Palette className="w-5 h-5 text-[var(--gm-primary)] shrink-0" />
                      <span>PERSONALIZAÇÃO</span>
                    </span>
                    <span className="text-xs font-bold text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-3 py-1 rounded-full border border-[var(--gm-primary)]/20 whitespace-nowrap">
                      Edição Ativa
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* LOGO DA EMPRESA */}
                    <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-lg border border-slate-200/80 dark:border-zinc-800/80">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)] flex items-center gap-1.5">
                        <FileImage size={14} /> Logo da Empresa
                      </span>
                      <div className="w-32 h-32 rounded-lg bg-slate-100 dark:bg-zinc-800/60 border-2 border-dashed border-slate-300 dark:border-zinc-700 overflow-hidden flex items-center justify-center relative shrink-0 shadow-inner group/logo">
                        {companyLogoUrl ? (
                          <img
                            src={companyLogoUrl}
                            alt="Logo"
                            className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover/logo:scale-105"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-400">
                            <ImageIcon size={28} className="opacity-50" />
                            <span className="text-[10px] font-semibold">Sem Logo</span>
                          </div>
                        )}

                        <AnimatePresence>
                          {uploadingLogo && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-zinc-900/85 backdrop-blur-md flex flex-col items-center justify-center p-2 text-white text-center z-10"
                            >
                              <Loader2 size={24} className="animate-spin text-[var(--gm-primary)] mb-1.5" />
                              <span className="text-[10px] font-bold leading-tight drop-shadow">
                                {logoStatusText || "Processando..."}
                              </span>
                              {logoProgress > 0 && (
                                <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden px-1">
                                  <div
                                    className="bg-gradient-to-r from-[var(--gm-primary)] to-emerald-400 h-full transition-all duration-300 rounded-full"
                                    style={{ width: logoProgress + "%" }}
                                  />
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <AnimatePresence>
                        {logoStats && !uploadingLogo && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20"
                          >
                            <Sparkles size={10} className="shrink-0 text-emerald-500 animate-pulse" />
                            <span>{logoStats.compressedSize} ({logoStats.reduction})</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <label
                        className={"gm-btn w-full py-2 px-3 text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow transition-all " + (uploadingLogo ? "opacity-50 pointer-events-none" : "")}
                      >
                        {uploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        <span>{uploadingLogo ? "Otimizando..." : "Alterar Logo"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingLogo}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onUploadLogo(f);
                          }}
                        />
                      </label>
                    </div>

                    {/* FOTO DE PERFIL / AVATAR */}
                    <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-lg border border-slate-200/80 dark:border-zinc-800/80">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)] flex items-center gap-1.5">
                        <User size={14} /> Imagem de Perfil
                      </span>
                      <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-zinc-800/60 border-2 border-dashed border-slate-300 dark:border-zinc-700 overflow-hidden flex items-center justify-center relative shrink-0 shadow-inner group/avatar">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="Foto de Perfil"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover/avatar:scale-105"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-400">
                            <User size={32} className="opacity-50" />
                            <span className="text-[10px] font-semibold">Sem Foto</span>
                          </div>
                        )}

                        <AnimatePresence>
                          {uploadingAvatar && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-zinc-900/85 backdrop-blur-md flex flex-col items-center justify-center p-2 text-white text-center z-10"
                            >
                              <Loader2 size={24} className="animate-spin text-[var(--gm-primary)] mb-1.5" />
                              <span className="text-[10px] font-bold leading-tight drop-shadow">
                                {avatarStatusText || "Processando..."}
                              </span>
                              {avatarProgress > 0 && (
                                <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden px-1">
                                  <div
                                    className="bg-gradient-to-r from-[var(--gm-primary)] to-emerald-400 h-full transition-all duration-300 rounded-full"
                                    style={{ width: avatarProgress + "%" }}
                                  />
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <AnimatePresence>
                        {avatarStats && !uploadingAvatar && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20"
                          >
                            <Sparkles size={10} className="shrink-0 text-emerald-500 animate-pulse" />
                            <span>{avatarStats.compressedSize} ({avatarStats.reduction})</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <label
                        className={"gm-btn w-full py-2 px-3 text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow transition-all " + (uploadingAvatar ? "opacity-50 pointer-events-none" : "")}
                      >
                        {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        <span>{uploadingAvatar ? "Otimizando..." : "Alterar Perfil"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingAvatar}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onUploadAvatar(f);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="h-px bg-slate-200 dark:bg-zinc-800/80 w-full"></div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)]">
                        Nome da Empresa / Profissional
                      </label>
                      <input
                        className="gm-input py-2 text-sm h-10 w-full"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)] flex items-center gap-2">
                          <Monitor size={14} /> Escala Desktop
                        </label>
                        <ScaleSlider value={appScale} onChange={setAppScale} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)] flex items-center gap-2">
                          <Smartphone size={14} /> Escala Smartphone
                        </label>
                        <ScaleSlider value={mobileScale} onChange={setMobileScale} isMobile />
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-slate-200 dark:bg-zinc-800/80 w-full"></div>

                  <div>
                    {/* CABEÇALHO DO PAINEL DE BOTÕES */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)] flex items-center gap-2">
                          <Sparkles size={16} />
                          Personalização dos Botões
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Configure o estilo e as cores dos botões do aplicativo.
                        </p>
                      </div>
                    </div>

                    {/* CAIXAS EXPANDIDAS DOS ESTILOS DE BOTÕES */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                      {BUTTON_STYLES.map((s) => {
                        const currentActiveStyle = btnConfigTab === "light" ? buttonStyleLight : buttonStyleDark;
                        const isActive = currentActiveStyle === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleButtonStyleChange(s.id)}
                            className={
                              "group relative flex flex-col justify-between p-5 sm:p-6 rounded-lg border-2 transition-all duration-150 cursor-pointer text-left shadow-xs hover:shadow-xl outline-none min-h-[240px] " +
                              (isActive
                                ? "border-[var(--gm-primary)] bg-[var(--gm-primary)]/10 ring-4 ring-[var(--gm-primary)]/20 shadow-lg scale-[1.01]"
                                : "border-slate-200/80 dark:border-zinc-800/80 bg-white hover:bg-slate-50 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/80")
                            }
                          >
                            <div className="w-full">
                              <div className="flex items-center justify-between w-full mb-2">
                                <span className={"text-sm font-black uppercase tracking-wider flex items-center gap-2 " + (isActive ? "text-[var(--gm-primary)]" : "text-slate-800 dark:text-slate-100")}>
                                  {isActive && <CheckCircle2 size={16} className="text-[var(--gm-primary)] shrink-0" />}
                                  {s.name}
                                </span>
                                {s.badge && (
                                  <span className={"text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider " + (isActive ? "bg-[var(--gm-primary)] text-white shadow-xs" : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300")}>
                                    {s.badge}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                                {s.desc}
                              </p>
                            </div>

                            {/* PREVIA DETALHADA EM EVIDENCIA DENTRO DA PROPRIA CAIXA SELETORA */}
                            <div className="gm-preview-container w-full p-4 rounded-lg bg-slate-900/90 dark:bg-zinc-950/95 border border-slate-800/80 dark:border-zinc-800/80 shadow-inner space-y-3" data-button-style={s.id}>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">
                                <span className="flex items-center gap-1.5">
                                  <Sparkles size={12} className="text-[var(--gm-primary)]" />
                                  Prévia ({btnConfigTab === "light" ? "Claro" : "Escuro"})
                                </span>
                                {isActive ? (
                                  <span className="text-emerald-400 font-black flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Ativo
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-semibold">Clique para ativar</span>
                                )}
                              </div>

                              {s.id === "solid" ? (
                                <div className="space-y-2.5">
                                  <div className="w-full py-2.5 px-4 rounded-xl font-extrabold text-xs text-white bg-[var(--gm-primary)] shadow-md flex items-center justify-center gap-2 transition-transform hover:scale-[1.01]">
                                    <Check size={14} className="text-white" />
                                    Principal Sólido
                                  </div>
                                </div>
                              ) : s.id === "glass" ? (
                                <div className="space-y-2.5">
                                  <div className="w-full py-2.5 px-4 rounded-xl font-extrabold text-xs text-white bg-white/20 backdrop-blur-md border border-white/40 shadow-lg flex items-center justify-center gap-2 transition-all hover:bg-white/30">
                                    <Sparkles size={14} className="text-[var(--gm-primary)]" />
                                    Principal Vidro
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2.5">
                                  <div className="w-full py-2.5 px-4 rounded-xl font-extrabold text-xs text-[var(--gm-primary)] bg-transparent border-2 border-[var(--gm-primary)] shadow-xs flex items-center justify-center gap-2 transition-all hover:bg-[var(--gm-primary)] hover:text-white">
                                    <Check size={14} className="text-[var(--gm-primary)]" />
                                    Principal Vazado
                                  </div>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* PAINEL DE PERSONALIZAÇÃO DE CORES DO BOTÃO DO TEMA SELECIONADO */}
                    <div className="mt-6 p-5 sm:p-6 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 space-y-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-zinc-800/80 pb-3">
                        <div>
                          <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--gm-primary)] flex items-center gap-2">
                            <Paintbrush size={16} /> Personalizar Cores do Botão - {btnConfigTab === "light" ? "Modo Claro ☀️" : "Modo Escuro 🌙"}
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Ajuste livremente o preenchimento, contorno, texto e ícone dos botões para o {btnConfigTab === "light" ? "Modo Claro" : "Modo Escuro"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (btnConfigTab === "light") {
                              const defPrimary = brandPrimary || "#FF6900";
                              updateButtonLight({
                                style: "vazado",
                                bg: "transparent",
                                border: defPrimary,
                                text: "#18181B",
                                icon: defPrimary,
                              });
                            } else {
                              const defPrimary = brandPrimary || "#FF7B17";
                              updateButtonDark({
                                style: "vazado",
                                bg: "transparent",
                                border: defPrimary,
                                text: "#FFFFFF",
                                icon: defPrimary,
                              });
                            }
                          }}
                          className="text-[11px] font-bold text-[var(--gm-primary)] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                        >
                          <RotateCcw size={12} /> Restaurar Padrões ({btnConfigTab === "light" ? "Claro" : "Escuro"})
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1. Cor do Preenchimento (Fundo) */}
                        <ColorPickerInput
                          label={
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                              <Palette size={14} className="text-[var(--gm-primary)]" />
                              Cor do Preenchimento (Fundo)
                            </span>
                          }
                          value={btnConfigTab === "light" ? buttonBgLight : buttonBgDark}
                          onChange={(val) => {
                            if (btnConfigTab === "light") updateButtonLight({ bg: val });
                            else updateButtonDark({ bg: val });
                          }}
                        />

                        {/* 2. Cor do Contorno (Borda) */}
                        <ColorPickerInput
                          label={
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                              <Sparkles size={14} className="text-[var(--gm-primary)]" />
                              Cor do Contorno (Borda)
                            </span>
                          }
                          value={btnConfigTab === "light" ? buttonBorderLight : buttonBorderDark}
                          onChange={(val) => {
                            if (btnConfigTab === "light") updateButtonLight({ border: val });
                            else updateButtonDark({ border: val });
                          }}
                        />

                        {/* 3. Cor do Texto */}
                        <ColorPickerInput
                          label={
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                              <Type size={14} className="text-[var(--gm-primary)]" />
                              Cor do Texto
                            </span>
                          }
                          value={btnConfigTab === "light" ? buttonTextLight : buttonTextDark}
                          onChange={(val) => {
                            if (btnConfigTab === "light") updateButtonLight({ text: val });
                            else updateButtonDark({ text: val });
                          }}
                        />

                        {/* 4. Cor do Ícone */}
                        <ColorPickerInput
                          label={
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                              <CheckCircle2 size={14} className="text-[var(--gm-primary)]" />
                              Cor do Ícone
                            </span>
                          }
                          value={btnConfigTab === "light" ? buttonIconLight : buttonIconDark}
                          onChange={(val) => {
                            if (btnConfigTab === "light") updateButtonLight({ icon: val });
                            else updateButtonDark({ icon: val });
                          }}
                        />
                      </div>

                      {/* DEMONSTRAÇÃO AO VIVO NO CANVAS DO TEMA CORRESPONDENTE */}
                      <div className="pt-2">
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
                          <span>Prévia Real do Botão no Canvas do {btnConfigTab === "light" ? "Modo Claro ☀️" : "Modo Escuro 🌙"}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            Ambiente Real Fiel
                          </span>
                        </label>
                        <div className={
                          "p-8 rounded-lg border flex flex-col items-center justify-center gap-3 shadow-inner relative overflow-hidden transition-all " +
                          (btnConfigTab === "light"
                            ? "bg-[#F7F8FA] border-[#E8EAF0] text-[#18181B]"
                            : "bg-[#0F1115] border-[#303747] text-[#FFFFFF]")
                        }>
                          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border opacity-70 mb-1" style={{
                            borderColor: btnConfigTab === "light" ? "#E8EAF0" : "#303747",
                            color: btnConfigTab === "light" ? "#686D76" : "#B6BDC8"
                          }}>
                            {btnConfigTab === "light" ? "Ambiente Modo Claro (#F7F8FA)" : "Ambiente Modo Escuro (#0F1115)"}
                          </span>

                          <button
                            type="button"
                            style={{
                              backgroundColor: btnConfigTab === "light" ? buttonBgLight : buttonBgDark,
                              background: btnConfigTab === "light" ? buttonBgLight : buttonBgDark,
                              borderColor: btnConfigTab === "light" ? buttonBorderLight : buttonBorderDark,
                              color: btnConfigTab === "light" ? buttonTextLight : buttonTextDark,
                              borderWidth: "2px",
                              borderStyle: "solid",
                              backdropFilter: (btnConfigTab === "light" ? buttonStyleLight : buttonStyleDark) === "glass" ? "blur(12px) saturate(180%)" : "none",
                              WebkitBackdropFilter: (btnConfigTab === "light" ? buttonStyleLight : buttonStyleDark) === "glass" ? "blur(12px) saturate(180%)" : "none",
                              boxShadow: (btnConfigTab === "light" ? buttonStyleLight : buttonStyleDark) === "glass" ? "0 8px 32px 0 rgba(0,0,0,0.2)" : (btnConfigTab === "light" ? buttonStyleLight : buttonStyleDark) === "solid" ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                            }}
                            className="px-6 py-3 rounded-xl font-extrabold text-sm flex items-center gap-2.5 transition-all hover:scale-105 cursor-pointer shadow-md"
                          >
                            <Sparkles size={16} style={{
                              color: btnConfigTab === "light" ? buttonIconLight : buttonIconDark,
                              stroke: btnConfigTab === "light" ? buttonIconLight : buttonIconDark
                            }} />
                            <span style={{ color: btnConfigTab === "light" ? buttonTextLight : buttonTextDark }}>
                              Botão {btnConfigTab === "light" ? "Modo Claro" : "Modo Escuro"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SEÇÃO 2: CORES & FONTE */}
              {openSections.colors && (
                <div className="gm-settings-card bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 p-4 sm:p-6 md:p-8 rounded-lg space-y-6 shadow-xs backdrop-blur-md w-full pb-10 animate-in fade-in duration-300">
                  <div className="sticky -top-4 sm:-top-6 md:-top-8 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md py-3 sm:py-4 border-b border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2.5 text-base sm:text-lg font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                      <Paintbrush className="w-5 h-5 text-[var(--gm-primary)] shrink-0" />
                      <span>CORES & FONTE</span>
                    </span>
                    <span className="text-xs font-bold text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-3 py-1 rounded-full border border-[var(--gm-primary)]/20 whitespace-nowrap">
                      Edição Ativa
                    </span>
                  </div>

                  <ColorSettingsManager
                    isLightMode={isLightMode}
                    brandPrimary={brandPrimary}
                    setBrandPrimary={setBrandPrimary}
                    brandBg={brandBg}
                    setBrandBg={setBrandBg}
                    brandTitle={brandTitle}
                    setBrandTitle={setBrandTitle}
                    brandSubtitle={brandSubtitle}
                    setBrandSubtitle={setBrandSubtitle}
                    brandIcon={brandIcon}
                    setBrandIcon={setBrandIcon}
                    brandAccent={brandAccent}
                    setBrandAccent={setBrandAccent}
                    menuPrimary={menuPrimary}
                    setMenuPrimary={setMenuPrimary}
                    menuBg={menuBg}
                    setMenuBg={setMenuBg}
                    menuTitle={menuTitle}
                    setMenuTitle={setMenuTitle}
                    menuSubtitle={menuSubtitle}
                    setMenuSubtitle={setMenuSubtitle}
                    menuIcon={menuIcon}
                    setMenuIcon={setMenuIcon}
                    menuButton={menuButton}
                    setMenuButton={setMenuButton}
                    fontFamily={fontFamily}
                    setFontFamily={setFontFamily}
                    setPreviewFont={setPreviewFont}
                    updateDomColor={updateDomColor}
                  />
                </div>
              )}

              {/* SEÇÃO 3: IMAGEM DE FUNDO */}
              {openSections.background && (
                <div className="gm-settings-card bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 p-4 sm:p-6 md:p-8 rounded-lg space-y-6 shadow-xs backdrop-blur-md w-full pb-10 animate-in fade-in duration-300">
                  <div className="sticky -top-4 sm:-top-6 md:-top-8 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md py-3 sm:py-4 border-b border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2.5 text-base sm:text-lg font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                      <ImageIcon className="w-5 h-5 text-[var(--gm-primary)] shrink-0" />
                      <span>IMAGEM DE FUNDO</span>
                    </span>
                    <span className="text-xs font-bold text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-3 py-1 rounded-full border border-[var(--gm-primary)]/20 whitespace-nowrap">
                      Edição Ativa
                    </span>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4">
                      <div>
                        <div className="font-bold text-sm text-slate-800 dark:text-white">
                          Exibir Plano de Fundo
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Ative para renderizar no fundo do aplicativo
                        </div>
                      </div>
                      <button
                        type="button"
                        className={"gm-btn py-1.5 px-4 text-xs font-bold transition-all " + ((viewMode === "smartphone" ? mobileBgEnabled : bgEnabled) ? "bg-emerald-600 text-white" : "bg-zinc-700 text-zinc-300")}
                        onClick={() => {
                          if (viewMode === "smartphone") {
                            setMobileBgEnabled((v) => {
                              const next = !v;
                              if (next && mobileBgOpacity <= 0) setMobileBgOpacity(mobileBgOpacityPrev || 0.18);
                              else if (!next && mobileBgOpacity > 0) setMobileBgOpacityPrev(mobileBgOpacity);
                              return next;
                            });
                          } else {
                            setBgEnabled((v) => {
                              const next = !v;
                              if (next && bgOpacity <= 0) setBgOpacity(bgOpacityPrev || 0.18);
                              else if (!next && bgOpacity > 0) setBgOpacityPrev(bgOpacity);
                              return next;
                            });
                          }
                        }}
                      >
                        {(viewMode === "smartphone" ? mobileBgEnabled : bgEnabled) ? "Ativo" : "Desativado"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)]">
                            Modo de Ajuste
                          </label>
                          <Select
                            className="gm-input py-2 text-sm h-10 w-full"
                            value={viewMode === "smartphone" ? mobileBgFit : bgFit}
                            onChange={(val) => {
                              if (viewMode === "smartphone") setMobileBgFit(String(val) as Fit);
                              else setBgFit(String(val) as Fit);
                            }}
                            options={[
                              { value: "cover", label: "Cortar e Preencher (cover)" },
                              { value: "contain", label: "Ajustar Inteira (contain)" },
                            ]}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)]">
                            Opacidade ({Math.round((viewMode === "smartphone" ? mobileBgOpacity : bgOpacity) * 100)}%)
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            className="w-full h-2 accent-[var(--gm-primary)] cursor-pointer"
                            value={viewMode === "smartphone" ? mobileBgOpacity : bgOpacity}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (viewMode === "smartphone") {
                                setMobileBgOpacity(val);
                                if (val > 0) setMobileBgEnabled(true);
                                else setMobileBgEnabled(false);
                              } else {
                                setBgOpacity(val);
                                if (val > 0) setBgEnabled(true);
                                else setBgEnabled(false);
                              }
                            }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)]">
                            Zoom ({viewMode === "smartphone" ? mobileBgScale : bgScale}x)
                          </label>
                          <input
                            type="range"
                            min={0.5}
                            max={5}
                            step={0.1}
                            className="w-full h-2 accent-[var(--gm-primary)] cursor-pointer"
                            value={viewMode === "smartphone" ? mobileBgScale : bgScale}
                            onChange={(e) => {
                              if (viewMode === "smartphone") setMobileBgScale(Number(e.target.value));
                              else setBgScale(Number(e.target.value));
                            }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)]">
                            Desfoque / Blur ({viewMode === "smartphone" ? mobileBgBlur : bgBlur}px)
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={24}
                            step={1}
                            className="w-full h-2 accent-[var(--gm-primary)] cursor-pointer"
                            value={viewMode === "smartphone" ? mobileBgBlur : bgBlur}
                            onChange={(e) => {
                              if (viewMode === "smartphone") setMobileBgBlur(Number(e.target.value));
                              else setBgBlur(Number(e.target.value));
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col justify-between p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-lg border border-slate-200/80 dark:border-zinc-800/80">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-2 block">
                            Preview da Imagem / Vídeo
                          </span>
                          {(viewMode === "smartphone" ? mobileBgUrl : bgUrl) ? (
                            <div className="mb-4 rounded-xl overflow-hidden border border-[var(--gm-primary)]/20 relative aspect-video shadow-xs group bg-black/40 flex items-center justify-center">
                              {!(viewMode === "smartphone" ? mobileBgEnabled : bgEnabled) && (
                                <div className="absolute inset-0 bg-black/70 z-10 flex items-center justify-center backdrop-blur-xs">
                                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider bg-red-950/80 px-3 py-1 rounded-md border border-red-500/30">
                                    Plano de Fundo Desativado
                                  </span>
                                </div>
                              )}
                              {uploadingBackground && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                                  <Loader2 size={32} className="animate-spin text-[var(--gm-primary)] mb-2" />
                                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Processando...</span>
                                </div>
                              )}
                              {((viewMode === "smartphone" ? mobileBgUrl : bgUrl) || "").toLowerCase().endsWith(".mp4") ||
                              ((viewMode === "smartphone" ? mobileBgUrl : bgUrl) || "").toLowerCase().endsWith(".webm") ? (
                                <video
                                  src={(viewMode === "smartphone" ? mobileBgUrl : bgUrl) || ""}
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                  className="w-full h-full transition-all duration-200"
                                  style={{
                                    objectFit: (viewMode === "smartphone" ? mobileBgFit : bgFit) as any,
                                    opacity: (viewMode === "smartphone" ? mobileBgEnabled : bgEnabled) ? (viewMode === "smartphone" ? mobileBgOpacity : bgOpacity) : 0.15,
                                    transform: `scale(${viewMode === "smartphone" ? mobileBgScale : bgScale})`,
                                    filter: `blur(${viewMode === "smartphone" ? mobileBgBlur : bgBlur}px)`
                                  }}
                                />
                              ) : (
                                <img
                                  src={(viewMode === "smartphone" ? mobileBgUrl : bgUrl) || ""}
                                  alt="Background"
                                  className="w-full h-full transition-all duration-200"
                                  style={{
                                    objectFit: (viewMode === "smartphone" ? mobileBgFit : bgFit) as any,
                                    opacity: (viewMode === "smartphone" ? mobileBgEnabled : bgEnabled) ? (viewMode === "smartphone" ? mobileBgOpacity : bgOpacity) : 0.15,
                                    transform: `scale(${viewMode === "smartphone" ? mobileBgScale : bgScale})`,
                                    filter: `blur(${viewMode === "smartphone" ? mobileBgBlur : bgBlur}px)`
                                  }}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="mb-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800/40 aspect-video flex flex-col items-center justify-center p-4 text-center">
                              <ImageIcon size={32} className="text-slate-400 mb-2 opacity-50" />
                              <span className="text-xs font-medium text-slate-500">Nenhuma imagem carregada</span>
                            </div>
                          )}
                        </div>

                        <label
                          className={"gm-btn w-full py-2.5 flex items-center justify-center gap-2 cursor-pointer " + (uploadingBackground ? "opacity-50 pointer-events-none" : "")}
                        >
                          {uploadingBackground ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={16} />}
                          <span className="font-bold text-xs">{uploadingBackground ? "Enviando..." : "Upload Background"}</span>
                          <input
                            type="file"
                            accept="image/*,video/mp4,video/webm"
                            className="hidden"
                            disabled={uploadingBackground}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) onUploadBackground(f);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SEÇÃO 4: DADOS PIX */}
              {openSections.pix && (
                <div className="gm-settings-card bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 p-4 sm:p-6 md:p-8 rounded-lg space-y-6 shadow-xs backdrop-blur-md w-full pb-10 animate-in fade-in duration-300">
                  <div className="sticky -top-4 sm:-top-6 md:-top-8 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md py-3 sm:py-4 border-b border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2.5 text-base sm:text-lg font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                      <CreditCard className="w-5 h-5 text-[var(--gm-primary)] shrink-0" />
                      <span>DADOS DE PAGAMENTO (PIX)</span>
                    </span>
                    <span className="text-xs font-bold text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-3 py-1 rounded-full border border-[var(--gm-primary)]/20 whitespace-nowrap">
                      Edição Ativa
                    </span>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-zinc-900/50 p-3.5 rounded-lg border border-slate-200/80 dark:border-zinc-800/80">
                      ✅ O QR Code e a chave “Copia e Cola” gerados aqui funcionam em <b>qualquer aplicativo bancário</b>.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-1.5 block">
                          Tipo de Chave Pix
                        </label>
                        <Select
                          className="gm-input py-2 text-sm h-10 w-full"
                          value={pixType}
                          onChange={(val) => setPixType(String(val))}
                          options={[
                            { value: "CPF", label: "CPF" },
                            { value: "CNPJ", label: "CNPJ" },
                            { value: "EMAIL", label: "E-mail" },
                            { value: "PHONE", label: "Telefone" },
                            { value: "RANDOM", label: "Chave Aleatória" },
                          ]}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-1.5 block">
                          Sua Chave Pix
                        </label>
                        <input
                          type="text"
                          className="gm-input py-2 text-sm h-10 w-full"
                          placeholder="Informe sua chave Pix"
                          value={pixKey}
                          onChange={(e) => setPixKey(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-900/50 p-5 flex flex-col items-center justify-between">
                        <div className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-3 self-start">
                          QR Code Pix Universal
                        </div>
                        {pixQrPreview ? (
                          <div className="bg-white rounded-lg p-4 shadow-sm my-2">
                            <img src={pixQrPreview} alt="QR Pix (Preview)" className="w-[180px] h-auto" />
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 text-center py-12">
                            Informe uma chave Pix válida acima para gerar o QR Code.
                          </div>
                        )}

                        {pixQrPreview && (
                          <button
                            type="button"
                            className="gm-btn-soft w-full mt-3 justify-center py-2 text-xs font-bold"
                            onClick={() => {
                              const a = document.createElement("a");
                              a.href = pixQrPreview;
                              a.download = "pix_qr_configuracoes.png";
                              a.click();
                            }}
                          >
                            <Download size={16} /> Baixar Imagem QR
                          </button>
                        )}
                      </div>

                      <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-900/50 p-5 flex flex-col justify-between">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-3">
                            Pix Copia e Cola
                          </div>
                          {!pixPayloadPreview ? (
                            <div className="text-xs text-slate-500 text-center py-12">
                              Informe uma chave Pix para gerar o código de cópia instantânea.
                            </div>
                          ) : (
                            <div className="text-[11px] leading-relaxed font-mono break-all bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 text-slate-700 dark:text-slate-300 max-h-[140px] overflow-y-auto shadow-inner">
                              {pixPayloadPreview}
                            </div>
                          )}
                        </div>

                        {pixPayloadPreview && (
                          <button
                            type="button"
                            className="gm-btn w-full justify-center py-2.5 text-xs font-bold mt-4"
                            onClick={async () => {
                              const ok = await copyText(pixPayloadPreview);
                              if (ok) {
                                setPixCopied(true);
                                setTimeout(() => setPixCopied(false), 1500);
                              } else {
                                alert("Não foi possível copiar automaticamente. Copie manualmente o código.");
                              }
                            }}
                          >
                            {pixCopied ? <Check size={16} /> : <Copy size={16} />}
                            {pixCopied ? "Copiado com Sucesso!" : "Copiar Código Pix"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SEÇÃO 5: PAPEL TIMBRADO */}
              {openSections.timbrado && (
                <div className="gm-settings-card bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 p-4 sm:p-6 md:p-8 rounded-lg space-y-6 shadow-xs backdrop-blur-md w-full pb-10 animate-in fade-in duration-300">
                  <div className="sticky -top-4 sm:-top-6 md:-top-8 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md py-3 sm:py-4 border-b border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2.5 text-base sm:text-lg font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                      <FileText className="w-5 h-5 text-[var(--gm-primary)] shrink-0" />
                      <span>PAPEL TIMBRADO</span>
                    </span>
                    <span className="text-xs font-bold text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-3 py-1 rounded-full border border-[var(--gm-primary)]/20 whitespace-nowrap">
                      Edição Ativa
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-6 text-center">
                      Timbrado A4 para Impressão e PDF
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-8 justify-center w-full max-w-xl">
                      <div className="flex flex-col items-center gap-3 flex-1 w-full">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)]">
                          Seu Timbrado Atual
                        </span>
                        <div className="w-full aspect-[1/1.414] rounded-lg bg-slate-100 dark:bg-zinc-800/60 border-2 border-dashed border-slate-300 dark:border-zinc-700 overflow-hidden flex items-center justify-center relative shadow-inner">
                          {uploadingTimbrado ? (
                            <Loader2 size={40} className="animate-spin text-[var(--gm-primary)]" />
                          ) : timbradoUrl ? (
                            <img src={timbradoUrl} alt="Timbrado" className="w-full h-full object-cover" />
                          ) : (
                            <FileText size={40} className="opacity-40 text-slate-400" />
                          )}
                        </div>
                        <label
                          className={"gm-btn w-full py-2.5 flex items-center justify-center gap-2 cursor-pointer " + (uploadingTimbrado ? "opacity-50 pointer-events-none" : "")}
                        >
                          {uploadingTimbrado ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />}
                          <span className="text-xs font-bold">{uploadingTimbrado ? "Enviando..." : "Importar Timbrado"}</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            disabled={uploadingTimbrado}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) onUploadTimbrado(f);
                            }}
                          />
                        </label>
                      </div>

                      <div className="flex flex-col items-center gap-3 flex-1 w-full">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)]">
                          Gabarito Padrão
                        </span>
                        <div className="w-full aspect-[1/1.414] rounded-lg bg-slate-100 dark:bg-zinc-800/60 border-2 border-dashed border-slate-300 dark:border-zinc-700 overflow-hidden flex items-center justify-center relative shadow-inner">
                          <img src={TIMBRADO_MODEL_URL} alt="Gabarito" className="w-full h-full object-cover" />
                        </div>
                        <a
                          href={TIMBRADO_MODEL_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gm-btn-soft w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold"
                        >
                          <Download size={14} /> Baixar Gabarito
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SEÇÃO 6: NOTIFICAÇÕES PUSH */}
              {openSections.push && (
                <div className="gm-settings-card bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 p-4 sm:p-6 md:p-8 rounded-lg space-y-6 shadow-xs backdrop-blur-md w-full pb-10 animate-in fade-in duration-300">
                  <div className="sticky -top-4 sm:-top-6 md:-top-8 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md py-3 sm:py-4 border-b border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2.5 text-base sm:text-lg font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                      <Bell className="w-5 h-5 text-[var(--gm-primary)] shrink-0" />
                      <span>NOTIFICAÇÕES PUSH</span>
                    </span>
                    <span className="text-xs font-bold text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-3 py-1 rounded-full border border-[var(--gm-primary)]/20 whitespace-nowrap">
                      Edição Ativa
                    </span>
                  </div>

                  <div className="flex flex-col items-center text-center max-w-md mx-auto space-y-5">
                    <div
                      className={"w-16 h-16 rounded-full flex items-center justify-center border transition-all duration-300 " + (pushActive && pushPermission === "granted" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-inner animate-pulse" : "bg-amber-500/10 border-amber-500/30 text-amber-500")}
                    >
                      <Bell size={28} className={testing ? "animate-bounce" : ""} />
                    </div>

                    <div>
                      <h4 className="text-base font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                        Alertas e Notificações do Dispositivo
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Ative os alertas push para receber avisos em tempo real diretamente no seu smartphone ou computador.
                      </p>
                    </div>

                    <div className="w-full flex flex-col gap-3 pt-2">
                      <div className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-zinc-900/50 rounded-lg border border-slate-200/80 dark:border-zinc-800/80">
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Notificações Push</p>
                          <p className={"text-[10px] font-semibold uppercase " + (pushActive && pushPermission === "granted" ? "text-emerald-500" : "text-amber-500")}>
                            {pushActive && pushPermission === "granted" ? "Ativo (Ligado)" : "Desativado (Desligado)"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (pushPermission !== "granted") {
                              const permission = await Notification.requestPermission();
                              setPushPermission(permission);
                              if (permission === "granted") {
                                setPushActive(true);
                                localStorage.setItem("gm.pushActive", "true");
                              } else {
                                setPushActive(false);
                                localStorage.setItem("gm.pushActive", "false");
                              }
                            } else {
                              const nextActive = !pushActive;
                              setPushActive(nextActive);
                              localStorage.setItem("gm.pushActive", nextActive ? "true" : "false");
                            }
                          }}
                          className={"w-11 h-6 flex items-center rounded-full p-0.5 transition-all duration-300 outline-none " + (pushActive && pushPermission === "granted" ? "bg-emerald-500 justify-end" : "bg-slate-300 dark:bg-zinc-800 justify-start")}
                        >
                          <motion.div layout className="w-5 h-5 bg-white rounded-full shadow-md" />
                        </button>
                      </div>

                      <div className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-zinc-900/50 rounded-lg border border-slate-200/80 dark:border-zinc-800/80">
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Sons de Alerta</p>
                          <p className={"text-[10px] font-semibold uppercase " + (!notificationsMuted ? "text-emerald-500" : "text-amber-500")}>
                            {!notificationsMuted ? "Ativo (Ligado)" : "Desativado (Desligado)"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !notificationsMuted;
                            localStorage.setItem("gm.notificationsMuted", next ? "true" : "false");
                            setNotificationsMuted(next);
                          }}
                          className={"w-11 h-6 flex items-center rounded-full p-0.5 transition-all duration-300 outline-none " + (!notificationsMuted ? "bg-emerald-500 justify-end" : "bg-slate-300 dark:bg-zinc-800 justify-start")}
                        >
                          <motion.div layout className="w-5 h-5 bg-white rounded-full shadow-md" />
                        </button>
                      </div>

                      <motion.button
                        type="button"
                        animate={shakeTest ? { x: [-6, 6, -6, 6, -4, 4, -2, 2, 0] } : {}}
                        transition={{ duration: 0.4 }}
                        disabled={testing}
                        onClick={async () => {
                          setShakeTest(true);
                          setTimeout(() => setShakeTest(false), 450);

                          if (pushPermission !== "granted") {
                            const permission = await Notification.requestPermission();
                            setPushPermission(permission);
                            if (permission !== "granted") return;
                          }

                          if (!pushActive) {
                            setPushActive(true);
                            localStorage.setItem("gm.pushActive", "true");
                          }

                          setTesting(true);
                          try {
                            playNotificationSound(activeSound);
                          } catch (e) {}
                          if ("serviceWorker" in navigator) {
                            const reg = await navigator.serviceWorker.ready;
                            reg.active?.postMessage("TEST_NOTIFICATION");
                          }
                          setTimeout(() => setTesting(false), 1000);
                        }}
                        className="gm-btn py-3 flex items-center justify-center gap-2 text-xs font-bold w-full transition-all text-white rounded-xl shadow-md hover:brightness-110 active:scale-[0.98] mt-2"
                      >
                        {testing ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
                        {testing ? "Testando Notificação..." : "Enviar Notificação de Teste"}
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}

              {/* SEÇÃO 7: SONS DO SISTEMA */}
              {openSections.sounds && (
                <div className="gm-settings-card bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 p-4 sm:p-6 md:p-8 rounded-lg space-y-6 shadow-xs backdrop-blur-md w-full pb-10 animate-in fade-in duration-300">
                  <div className="sticky -top-4 sm:-top-6 md:-top-8 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md py-3 sm:py-4 border-b border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2.5 text-base sm:text-lg font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                      <Volume2 className="w-5 h-5 text-[var(--gm-primary)] shrink-0" />
                      <span>SONS DO SISTEMA</span>
                    </span>
                    <span className="text-xs font-bold text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-3 py-1 rounded-full border border-[var(--gm-primary)]/20 whitespace-nowrap">
                      Edição Ativa
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Escolha o toque de sua preferência para alarmes, notificações e confirmações no aplicativo. Clique para escutar uma demonstração instantânea.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {NOTIFICATION_SOUNDS.map((sound) => {
                      const isSelected = activeSound === sound.id;
                      return (
                        <button
                          key={sound.id}
                          type="button"
                          onClick={() => {
                            localStorage.setItem("gm.notificationSound", sound.id);
                            setActiveSound(sound.id);
                            try {
                              playNotificationSound(sound.id);
                            } catch (e) {}
                          }}
                          className={"flex items-center justify-between p-4 rounded-lg border text-left transition-all " + (isSelected ? "bg-[var(--gm-primary)]/10 border-[var(--gm-primary)] text-[var(--gm-primary)] shadow-sm" : "bg-slate-50 dark:bg-zinc-900/50 border-slate-200/80 dark:border-zinc-800/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600")}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={"w-10 h-10 rounded-full flex items-center justify-center shrink-0 " + (isSelected ? "bg-[var(--gm-primary)] text-white" : "bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-slate-400")}
                            >
                              <Music size={18} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold leading-tight">{sound.name}</h4>
                              <p className="text-[10px] opacity-75 leading-normal mt-0.5 max-w-[240px]">{sound.description}</p>
                            </div>
                          </div>

                          <div
                            className={"w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 " + (isSelected ? "border-[var(--gm-primary)]" : "border-slate-300 dark:border-zinc-700")}
                          >
                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[var(--gm-primary)]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SEÇÃO 8: TUTORIAL & SUPORTE */}
              {openSections.tutorial && (
                <div className="gm-settings-card bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 p-4 sm:p-6 md:p-8 rounded-lg space-y-6 shadow-xs backdrop-blur-md w-full pb-10 animate-in fade-in duration-300">
                  <div className="sticky -top-4 sm:-top-6 md:-top-8 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md py-3 sm:py-4 border-b border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2.5 text-base sm:text-lg font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                      <HelpCircle className="w-5 h-5 text-[var(--gm-primary)] shrink-0" />
                      <span>TUTORIAL & SUPORTE</span>
                    </span>
                    <span className="text-xs font-bold text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-3 py-1 rounded-full border border-[var(--gm-primary)]/20 whitespace-nowrap">
                      Edição Ativa
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto py-4">
                    <div className="w-16 h-16 rounded-full bg-[var(--gm-primary)]/10 text-[var(--gm-primary)] flex items-center justify-center mb-4 border border-[var(--gm-primary)]/20">
                      <Sparkles size={32} />
                    </div>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                      Passo a Passo Interativo
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                      Deseja reiniciar o assistente virtual de onboarding para rever todas as funcionalidades e ferramentas do aplicativo?
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem("gm.tutorialCompleted");
                        localStorage.setItem("gm.tutorialForceStart", "true");
                        navigate("/");
                      }}
                      className="gm-btn py-3 px-6 flex items-center justify-center gap-2 text-xs font-bold w-full transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Sparkles size={16} />
                      Iniciar Tutorial do App
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* PAINEL / BOTÃO FLUTUANTE "SALVAR" NO LADO DIREITO DO APP (IGUAL O DA BIO EDITOR) */}
      <div className="fixed top-1/2 -translate-y-1/2 right-0 z-[9999] select-none pointer-events-none flex flex-col items-end">
        <AnimatePresence mode="wait">
          {isDocked ? (
            /* Estado Recolhido (Docked): Barra vertical de cor fixada na borda direita com sensibilidade a toque e arrasto */
            <motion.div
              key="docked"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              drag="x"
              dragConstraints={{ left: -150, right: 0 }}
              dragElastic={0.15}
              onDragStart={() => {
                isDraggingRef.current = true;
              }}
              onDragEnd={(e, info) => {
                if (info.offset.x < -20) {
                  setIsDocked(false);
                }
                setTimeout(() => {
                  isDraggingRef.current = false;
                }, 100);
              }}
              onClick={() => {
                if (isDraggingRef.current) return;
                setIsDocked(false);
              }}
              whileDrag={{ scale: 1.02 }}
              className="pointer-events-auto cursor-grab active:cursor-grabbing flex flex-col items-end group"
              title="Clique ou arraste para a esquerda para abrir o botão Salvar"
            >
              <div className="flex flex-col gap-2 py-8 pl-10 pr-1 bg-transparent select-none">
                <div className="w-3.5 h-20 rounded-full bg-[var(--gm-primary)] shadow-xl transition-all group-hover:w-5 flex items-center justify-center text-white border border-amber-300/40">
                  <Save size={15} className="opacity-90 animate-pulse text-white" />
                </div>
              </div>
            </motion.div>
          ) : (
            /* Estado Expandido: Botão circular flutuante arrastável no lado direito */
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              drag="x"
              dragConstraints={{ left: -100, right: 100 }}
              dragElastic={0.15}
              onDragStart={() => {
                isDraggingRef.current = true;
              }}
              onDragEnd={(e, info) => {
                if (info.offset.x > 30 || info.offset.x < -30) {
                  setIsDocked(true);
                }
                setTimeout(() => {
                  isDraggingRef.current = false;
                }, 100);
              }}
              whileDrag={{ scale: 0.95, opacity: 0.9 }}
              className="pointer-events-auto flex flex-col gap-3 pr-3 sm:pr-5 items-end justify-center cursor-grab active:cursor-grabbing"
            >
              <AnimatePresence>
                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 20 }}
                    className="flex items-center gap-2 text-[var(--gm-primary)] bg-white/95 dark:bg-zinc-900/95 border border-[var(--gm-primary)]/40 px-3.5 py-2 rounded-lg text-xs font-black shadow-lg backdrop-blur-md"
                  >
                    <CheckCircle2 size={16} className="text-[var(--gm-primary)] animate-bounce" />
                    <span>Configurações Salvas!</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative group flex items-center">
                <span className="absolute right-16 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-zinc-900/95 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap pointer-events-none border border-zinc-800/80 backdrop-blur-sm">
                  {saving ? "Salvando..." : "Salvar Configurações"}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDraggingRef.current) return;
                    handleSave();
                  }}
                  disabled={saving}
                  className="gm-floating-save-btn w-14 h-14 bg-[var(--gm-primary)] hover:brightness-110 active:scale-95 text-white rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(255,105,0,0.45)] hover:shadow-[0_12px_32px_rgba(255,105,0,0.65)] transition-all duration-300 hover:scale-110 disabled:opacity-50 border border-orange-300/40 cursor-pointer outline-none"
                  title="Salvar todas as alterações de configurações"
                >
                  {saving ? (
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  ) : saveSuccess ? (
                    <CheckCircle2 className="w-6 h-6 text-white animate-bounce" />
                  ) : (
                    <Save className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-200" />
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Page>
  );
}
