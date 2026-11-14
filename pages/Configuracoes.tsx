// pages/Configuracoes.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import Select from "../components/ui/Select";
import { Page } from "../components/ui/Page";
import { Card } from "../components/ui/Card";
import { SectionDivider } from "../components/ui/SectionDivider";
import { ScaleSlider } from "../components/ScaleSlider";
import { ColorSettingsManager } from "../components/ColorSettingsManager";
import { ColorSpectrumModal } from "../components/ui/ColorSpectrumModal";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/AuthContext";
import { pushToast } from "../store/toast";
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
  SlidersHorizontal,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Music,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Square,
  MousePointerClick,
  Keyboard,
  ShieldCheck,
  Radio,
  Apple,
  Layers,
  Zap,
  Info,
  Crown,
  QrCode,
} from "lucide-react";
import SmartQrCodeGenerator from "../components/settings/SmartQrCodeGenerator";
import PixQrDownloadFormats from "../components/settings/PixQrDownloadFormats";
import SecurityPinSettings from "../components/ui/SecurityPinSettings";
import DatabasePermissionsCard from "../components/settings/DatabasePermissionsCard";
import { BackgroundEffectsGallery } from "../components/settings/BackgroundEffectsGallery";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSwipeNav } from "../hooks/useSwipeNav";
import {
  playNotificationSound,
  NOTIFICATION_SOUNDS,
  playUiSound,
  isUiSoundMuted,
  setUiSoundMuted,
  isHoverSoundMuted,
  setHoverSoundMuted,
  isTypingSoundMuted,
  setTypingSoundMuted,
  playTechHoverSound,
  playOperaGxTypingSound,
  getUiSoundVolume,
  setUiSoundVolume,
  getButtonSoundPreset,
  setButtonSoundPreset,
  previewButtonSoundPreset,
  BUTTON_SOUND_PRESETS,
  getHoverSoundPreset,
  setHoverSoundPreset,
  previewHoverSoundPreset,
  HOVER_SOUND_PRESETS,
  getTypingSoundPreset,
  setTypingSoundPreset,
  previewTypingSoundPreset,
  TYPING_SOUND_PRESETS,
} from "../lib/audio";
import { triggerRealNotification } from "../lib/realNotification";
import { broadcastBackgroundChange, broadcastAppNotification } from "../lib/syncHub";
import SmartphonePermissionModal from "../components/ui/SmartphonePermissionModal";
import NotificationCheckinModal from "../components/notifications/NotificationCheckinModal";

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

  const [activeButtonSound, setActiveButtonSound] = useState(() => getButtonSoundPreset());
  const [buttonCategoryFilter, setButtonCategoryFilter] = useState<"all" | "apple" | "xiaomi" | "gm">("all");

  const [activeHoverSound, setActiveHoverSound] = useState(() => getHoverSoundPreset());
  const [hoverCategoryFilter, setHoverCategoryFilter] = useState<"all" | "cyber" | "brands" | "clean">("all");

  const [activeTypingSound, setActiveTypingSound] = useState(() => getTypingSoundPreset());
  const [typingCategoryFilter, setTypingCategoryFilter] = useState<"all" | "gaming" | "mechanical" | "classic">("all");

  const [uiSoundsEnabled, setUiSoundsEnabled] = useState(() => !isUiSoundMuted());
  const [hoverSoundEnabled, setHoverSoundEnabled] = useState(() => !isHoverSoundMuted());
  const [typingSoundEnabled, setTypingSoundEnabled] = useState(() => !isTypingSoundMuted());
  const [testTypingText, setTestTypingText] = useState("");
  const [uiSoundVol, setUiSoundVol] = useState(() => getUiSoundVolume());

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
    const handleSoundToggle = (e: any) => {
      if (e?.detail?.muted !== undefined) {
        setUiSoundsEnabled(!e.detail.muted);
      } else {
        setUiSoundsEnabled(!isUiSoundMuted());
      }
      if (e?.detail?.hoverMuted !== undefined) {
        setHoverSoundEnabled(!e.detail.hoverMuted);
      } else {
        setHoverSoundEnabled(!isHoverSoundMuted());
      }
      if (e?.detail?.typingMuted !== undefined) {
        setTypingSoundEnabled(!e.detail.typingMuted);
      } else {
        setTypingSoundEnabled(!isTypingSoundMuted());
      }
      if (e?.detail?.hoverPreset !== undefined) {
        setActiveHoverSound(e.detail.hoverPreset);
      }
      if (e?.detail?.typingPreset !== undefined) {
        setActiveTypingSound(e.detail.typingPreset);
      }
      if (e?.detail?.buttonPreset !== undefined) {
        setActiveButtonSound(e.detail.buttonPreset);
      }
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("gm.uiSoundChanged", handleSoundToggle);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("gm.uiSoundChanged", handleSoundToggle);
    };
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
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);

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

  const [companyName, setCompanyName] = useState("");
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
    security: false,
    qrcode: false,
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
        security: false,
        qrcode: false,
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
    return `group relative flex items-center justify-between gap-4 pl-5 pr-4 py-3 min-h-[48px] sm:min-h-[52px] rounded-[6px] border font-bold text-xs sm:text-sm tracking-wide transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] text-left outline-none cursor-pointer shadow-none ${
      isOpen
        ? "w-full sm:w-auto sm:min-w-[320px] bg-[#1B1B1E] border-[var(--gm-primary)] text-[#F2F2F3] font-black"
        : "w-full bg-[#0B0B0C] border-[#26262A] text-[#CBD5E1] hover:border-[#3F3F46] hover:bg-[#1B1B1E] hover:text-white"
    }`;
  };

  const cachedSettings = readSettingsLocal();
  const defaultOrangeInitial = "#FF7B17";

  const savedColorsInitial = cachedSettings?.bio_config?.theme_colors_dark || (typeof localStorage !== "undefined" ? JSON.parse(localStorage.getItem("gm_colors_dark") || "null") : null);

  const initialPrimary = savedColorsInitial?.primary || (cachedSettings?.brand_primary && cachedSettings?.brand_primary !== "#32BCAD" ? cachedSettings.brand_primary : null) || defaultOrangeInitial;
  const initialAccent = savedColorsInitial?.accent || (cachedSettings?.brand_accent && cachedSettings?.brand_accent !== "#32BCAD" ? cachedSettings.brand_accent : null) || defaultOrangeInitial;
  const initialBg = savedColorsInitial?.bg || (cachedSettings?.brand_bg && cachedSettings?.brand_bg !== "#0b1220" ? cachedSettings.brand_bg : null) || "#0f1117";

  const [brandPrimary, setBrandPrimary] = useState(initialPrimary);
  const [brandAccent, setBrandAccent] = useState(initialAccent);
  const [brandBg, setBrandBg] = useState(initialBg);
  const [brandTitle, setBrandTitle] = useState(savedColorsInitial?.title || "#FFFFFF");
  const [brandSubtitle, setBrandSubtitle] = useState(savedColorsInitial?.subtitle || "#94A3B8");
  const [brandIcon, setBrandIcon] = useState(savedColorsInitial?.icon || initialAccent);

  // Cores independentes do Menu / Barra Lateral
  const [menuPrimary, setMenuPrimary] = useState(savedColorsInitial?.menu_primary || initialPrimary);
  const [menuBg, setMenuBg] = useState(savedColorsInitial?.menu_bg || initialBg);
  const [menuTitle, setMenuTitle] = useState(savedColorsInitial?.menu_title || "#FFFFFF");
  const [menuSubtitle, setMenuSubtitle] = useState(savedColorsInitial?.menu_subtitle || "#94A3B8");
  const [menuIcon, setMenuIcon] = useState(savedColorsInitial?.menu_icon || initialAccent);
  const [menuButton, setMenuButton] = useState(savedColorsInitial?.menu_button || initialAccent);

  const [fontFamily, setFontFamily] = useState("Inter");
  const [previewFont, setPreviewFont] = useState<string | null>(null);

  // Configuração de botões
  const [buttonStyleDark, setButtonStyleDark] = useState("vazado");
  const [buttonBgDark, setButtonBgDark] = useState("transparent");
  const [buttonBorderDark, setButtonBorderDark] = useState("#FF7B17");
  const [buttonTextDark, setButtonTextDark] = useState("#FFFFFF");
  const [buttonIconDark, setButtonIconDark] = useState("#FF7B17");

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
          const localSaved = typeof localStorage !== "undefined" ? JSON.parse(localStorage.getItem("gm_colors_dark") || "null") : null;
          const savedDark = localSaved || s.bio_config?.theme_colors_dark;
          const darkPrimary = savedDark?.primary || (s.brand_primary && s.brand_primary !== "#32BCAD" ? s.brand_primary : null) || "#FE540B";
          const darkAccent = savedDark?.accent || (s.brand_accent && s.brand_accent !== "#32BCAD" ? s.brand_accent : null) || "#FF7A38";
          const darkBg = savedDark?.bg || (s.brand_bg && s.brand_bg !== "#0b1220" ? s.brand_bg : null) || "#0B0B0C";

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
      } catch (err) {}
    };
    if (tenantId) {
      syncCurrentColors();
    }
  }, [tenantId]);

  // Helper ultra fluido para aplicar alterações de cores instantaneamente no DOM
  const updateDomColor = (cssVarOrKey: string, value: string) => {
    if (!value) return;
    const root = document.documentElement;
    const normalized = cssVarOrKey.startsWith("--") ? cssVarOrKey : `--${cssVarOrKey.replace(/_/g, "-")}`;

    // Mapeamento abrangente de variáveis
    if (
      normalized === "--brand-primary" ||
      normalized === "--gm-primary" ||
      cssVarOrKey === "brand_primary" ||
      cssVarOrKey === "primary"
    ) {
      root.style.setProperty("--gm-primary", value);
      root.style.setProperty("--primary", value);
      root.style.setProperty("--brand-primary", value);
      root.style.setProperty("--gm-btn-bg", value);
      root.style.setProperty("--gm-btn-border", value);
      root.style.setProperty("--gm-btn-icon", value);
      const rgb = hexToRgb(value);
      if (rgb) root.style.setProperty("--gm-primary-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      root.style.setProperty("--gm-primary-foreground", getContrastColor(value));
    } else if (
      normalized === "--brand-accent" ||
      normalized === "--gm-accent" ||
      cssVarOrKey === "brand_accent" ||
      cssVarOrKey === "accent"
    ) {
      root.style.setProperty("--gm-accent", value);
      root.style.setProperty("--brand-accent", value);
      root.style.setProperty("--gm-button", value);
      const rgb = hexToRgb(value);
      if (rgb) root.style.setProperty("--gm-accent-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    } else if (
      normalized === "--brand-bg" ||
      normalized === "--gm-bg" ||
      cssVarOrKey === "brand_bg" ||
      cssVarOrKey === "bg"
    ) {
      root.style.setProperty("--gm-bg", value);
      root.style.setProperty("--bg", value);
      root.style.setProperty("--brand-bg", value);
    } else if (
      normalized === "--brand-title" ||
      normalized === "--gm-title" ||
      cssVarOrKey === "brand_title" ||
      cssVarOrKey === "title"
    ) {
      root.style.setProperty("--gm-title", value);
      root.style.setProperty("--text", value);
    } else if (
      normalized === "--brand-subtitle" ||
      normalized === "--gm-subtitle" ||
      cssVarOrKey === "brand_subtitle" ||
      cssVarOrKey === "subtitle"
    ) {
      root.style.setProperty("--gm-subtitle", value);
      root.style.setProperty("--text-secondary", value);
    } else if (
      normalized === "--brand-icon" ||
      normalized === "--gm-icon" ||
      cssVarOrKey === "brand_icon" ||
      cssVarOrKey === "icon"
    ) {
      root.style.setProperty("--gm-icon", value);
    } else if (
      normalized === "--menu-primary" ||
      normalized === "--gm-menu-primary" ||
      cssVarOrKey === "menu_primary"
    ) {
      root.style.setProperty("--gm-menu-primary", value);
    } else if (
      normalized === "--menu-bg" ||
      normalized === "--gm-menu-bg" ||
      cssVarOrKey === "menu_bg"
    ) {
      root.style.setProperty("--gm-menu-bg", value);
    } else if (
      normalized === "--menu-title" ||
      normalized === "--gm-menu-title" ||
      cssVarOrKey === "menu_title"
    ) {
      root.style.setProperty("--gm-menu-title", value);
    } else if (
      normalized === "--menu-subtitle" ||
      normalized === "--gm-menu-subtitle" ||
      cssVarOrKey === "menu_subtitle"
    ) {
      root.style.setProperty("--gm-menu-subtitle", value);
    } else if (
      normalized === "--menu-icon" ||
      normalized === "--gm-menu-icon" ||
      cssVarOrKey === "menu_icon"
    ) {
      root.style.setProperty("--gm-menu-icon", value);
    } else if (
      normalized === "--menu-button" ||
      normalized === "--gm-menu-button" ||
      cssVarOrKey === "menu_button"
    ) {
      root.style.setProperty("--gm-menu-button", value);
    } else {
      root.style.setProperty(normalized, value);
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
          brand_title: brandTitle,
          brand_subtitle: brandSubtitle,
          brand_icon: brandIcon,
          brand_button: brandAccent,
          menu_primary: menuPrimary,
          menu_bg: menuBg,
          menu_title: menuTitle,
          menu_subtitle: menuSubtitle,
          menu_icon: menuIcon,
          menu_button: menuButton,
          font_family: previewFont || fontFamily,
          button_config_dark: {
            style: buttonStyleDark,
            bg: buttonBgDark,
            border: buttonBorderDark,
            text: buttonTextDark,
            icon: buttonIconDark,
          },
          button_style: buttonStyleDark,
          button_bg: buttonBgDark,
          button_border: buttonBorderDark,
          button_text: buttonTextDark,
          button_icon: buttonIconDark,
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
    brandTitle,
    brandSubtitle,
    brandIcon,
    menuPrimary,
    menuBg,
    menuTitle,
    menuSubtitle,
    menuIcon,
    menuButton,
    fontFamily,
    previewFont,
    buttonStyleDark,
    buttonBgDark,
    buttonBorderDark,
    buttonTextDark,
    buttonIconDark,
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
      const s = readSettingsLocal(tenantId);
      if (s) {
        applySettingsToDOM(s, false, tenantId);
      }
    };
  }, [tenantId]);

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
        setCompanyName(s.company_name || "");
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

      // Salva no localStorage e no bio_config
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
      localStorage.setItem("gm_theme_color", brandPrimary);
      if (tenantId) {
        localStorage.setItem(`gm_colors_dark_${tenantId}`, JSON.stringify(payloadDark));
      }
      currentBioConfig.theme_colors_dark = payloadDark;

      // Salva configurações de botão
      const btnConfigDark = {
        style: buttonStyleDark,
        bg: buttonBgDark,
        border: buttonBorderDark,
        text: buttonTextDark,
        icon: buttonIconDark,
      };

      localStorage.setItem("gm_button_dark", JSON.stringify(btnConfigDark));
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

        button_config_dark: btnConfigDark,
        button_style: buttonStyleDark,
        button_bg: buttonBgDark,
        button_border: buttonBorderDark,
        button_text: buttonTextDark,
        button_icon: buttonIconDark,
        theme_presets: presets,
        bio_config: currentBioConfig, // Salva o bio_config atualizado
      });

      applySettingsToDOM(next);

      // Sincroniza em tempo real o plano de fundo e tema com todos os outros dispositivos
      broadcastBackgroundChange(tenantId, {
        enabled: bgEnabled || mobileBgEnabled,
        bgUrl,
        bgOpacity: bgEnabled ? (bgOpacity || bgOpacityPrev) : 0,
        bgScale,
        bgBlur,
        bgFit,
        bgPosX: `${bgPosX}%`,
        bgPosY: `${bgPosY}%`,
        mobileBgUrl: mobileBgUrl || bgUrl,
        mobileBgOpacity: mobileBgEnabled ? (mobileBgOpacity || mobileBgOpacityPrev) : 0,
        mobileBgScale,
        mobileBgBlur,
        mobileBgFit,
        mobileBgPosX: `${mobileBgPosX}%`,
        mobileBgPosY: `${mobileBgPosY}%`,
        timestamp: Date.now(),
      });

      // Dispara eventos globais para que todos os componentes em aberto se atualizem
      window.dispatchEvent(new CustomEvent("gm_theme_updated", { detail: payloadDark }));
      window.dispatchEvent(new CustomEvent("gm_colors_updated", { detail: payloadDark }));
      window.dispatchEvent(new CustomEvent("gm_settings_updated", { detail: payloadDark }));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      console.error(e);
      pushToast({ type: "error", title: "Erro", message: e?.message || "Erro ao salvar." });
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
      pushToast({ type: "error", title: "Erro no upload", message: e?.message || "Ocorreu um erro durante o upload da imagem." });
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
      (url) => {
        setCompanyLogoUrl(url);
        setAvatarUrl(url);
      }
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
      pushToast({ type: "error", title: "Erro no upload", message: e.message || "Erro no upload" });
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

    document.documentElement.setAttribute("data-button-style", style);
    document.documentElement.style.setProperty("--gm-btn-bg", bg);
    document.documentElement.style.setProperty("--gm-btn-border", border);
    document.documentElement.style.setProperty("--gm-btn-text", text);
    document.documentElement.style.setProperty("--gm-btn-icon", icon);
  };

  const handleButtonStyleChange = (newStyle: string) => {
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
  };

  const applyTheme = (theme: (typeof PRESET_THEMES)[0]) => {
    setBrandPrimary(theme.primary);
    setBrandAccent(theme.accent);
    setBrandBg(theme.bg);
  };

  const parseColorToRgb = (colorStr: string) => {
    if (!colorStr || colorStr === "transparent" || colorStr === "TRANSPARENT") {
      return { r: 0, g: 0, b: 0, a: 0 };
    }
    const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
    if (rgbaMatch) {
      return {
        r: parseInt(rgbaMatch[1], 10),
        g: parseInt(rgbaMatch[2], 10),
        b: parseInt(rgbaMatch[3], 10),
        a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1,
      };
    }
    let hex = colorStr.trim().replace(/^#/, "");
    if (hex.length === 3) {
      hex = hex.split("").map((c) => c + c).join("");
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return {
        r: isNaN(r) ? 0 : r,
        g: isNaN(g) ? 0 : g,
        b: isNaN(b) ? 0 : b,
        a: isNaN(a) ? 1 : a,
      };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  };

  const rgbToCmyk = (r: number, g: number, b: number) => {
    if (r === 0 && g === 0 && b === 0) return { c: 0, m: 0, y: 0, k: 100 };
    const rN = r / 255;
    const gN = g / 255;
    const bN = b / 255;
    const k = 1 - Math.max(rN, gN, bN);
    if (k >= 0.999) return { c: 0, m: 0, y: 0, k: 100 };
    const c = Math.round(((1 - rN - k) / (1 - k)) * 100);
    const m = Math.round(((1 - gN - k) / (1 - k)) * 100);
    const y = Math.round(((1 - bN - k) / (1 - k)) * 100);
    const kPct = Math.round(k * 100);
    return { c, m, y, k: kPct };
  };

  const getColorFormats = (colorStr: string) => {
    if (!colorStr || colorStr === "transparent" || colorStr === "TRANSPARENT") {
      return {
        hex: "TRANSPARENT",
        rgb: "rgb(0, 0, 0)",
        cmyk: "0%, 0%, 0%, 100%",
      };
    }
    const { r, g, b, a } = parseColorToRgb(colorStr);
    const toHex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    const rgb = a !== undefined && a < 1 
      ? `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})` 
      : `rgb(${r}, ${g}, ${b})`;
    const { c, m, y, k } = rgbToCmyk(r, g, b);
    const cmyk = `${c}%, ${m}%, ${y}%, ${k}%`;
    return { hex, rgb, cmyk };
  };

  const ColorPickerInput = ({
    label,
    value,
    onChange,
  }: {
    label: React.ReactNode;
    value: string;
    onChange: (v: string) => void;
  }) => {
    const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
    const [isSpectrumOpen, setIsSpectrumOpen] = useState(false);
    const formats = getColorFormats(value);

    const handleCopy = (e: React.MouseEvent, text: string, formatLabel: string) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      setCopiedFormat(formatLabel);
      setTimeout(() => setCopiedFormat(null), 1800);
    };

    return (
      <>
        <div className="group relative flex flex-col rounded-lg border border-[#26262A] bg-[#131315] overflow-hidden hover:border-[var(--gm-primary)]/80 transition-colors shadow-none">
          {/* TOP: AMOSTRA DA COR CONFIGURADA GRANDE (CLIQUE NA COR -> AJUSTE DE CORES COM ESPECTRO) */}
          <div
            onClick={() => setIsSpectrumOpen(true)}
            className="relative w-full h-28 sm:h-32 overflow-hidden cursor-pointer flex flex-col items-center justify-center gap-2 p-2"
            style={{
              backgroundColor:
                value === "TRANSPARENT" || value === "transparent"
                  ? "transparent"
                  : value,
            }}
            title="Clique para ajustar a cor com a barra de espectro"
          >
            {(value === "TRANSPARENT" ||
              value === "transparent" ||
              value.includes("0.15") ||
              value.includes("0.3") ||
              value.includes("rgba") ||
              value.includes("RGBA")) && (
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:6px_6px] opacity-30 pointer-events-none" />
            )}

            {/* Botão de Destaque 'Ajustar Cor' no Centro */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSpectrumOpen(true);
              }}
              className="relative z-10 px-4 py-2 rounded-[6px] bg-[#0B0B0C]/90 hover:bg-[#1B1B1E] text-[#F2F2F3] font-extrabold text-xs flex items-center gap-2 border border-[#26262A] hover:border-[#3F3F46] transition-colors active:scale-95 cursor-pointer shadow-none"
              title="Clique para ajustar a cor"
            >
              <Palette size={15} className="text-[var(--gm-primary)]" />
              <span>Ajustar Cor</span>
            </button>
          </div>

          {/* BOTTOM: CÓDIGOS DE CORES SEPARADOS (HEX, RGB, CMYK) - SEM CAIXA INTERNA, CLIQUE PARA COPIAR */}
          <div className="p-3.5 sm:p-4 bg-[#0B0B0C] border-t border-[#26262A] flex flex-col justify-between gap-2.5 flex-1">
            {/* Header com Label e Badge de Copiado */}
            <div className="flex items-center justify-between text-xs font-bold text-[#F2F2F3] leading-tight">
              <span>{label}</span>
              {copiedFormat && (
                <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-[4px] border border-emerald-500/20 animate-in fade-in">
                  {copiedFormat} Copiado!
                </span>
              )}
            </div>

            {/* Lista de Códigos das Cores Separadas (HEX, RGB, CMYK) sem caixas internas de input */}
            <div className="space-y-1 pt-1 border-t border-[#26262A]">
              {/* HEX */}
              <div
                onClick={(e) => handleCopy(e, formats.hex, "HEX")}
                className="flex items-center justify-between text-[11px] font-mono tabular-nums cursor-pointer hover:bg-[#1B1B1E] px-2 py-1 rounded-[4px] transition-colors group/hex"
                title="Clique para copiar código HEX"
              >
                <span className="font-extrabold text-[#8B8B92] group-hover/hex:text-[var(--gm-primary)]">HEX:</span>
                <span className="font-bold text-[#F2F2F3] tracking-wider">{formats.hex}</span>
              </div>

              {/* RGB */}
              <div
                onClick={(e) => handleCopy(e, formats.rgb, "RGB")}
                className="flex items-center justify-between text-[11px] font-mono tabular-nums cursor-pointer hover:bg-[#1B1B1E] px-2 py-1 rounded-[4px] transition-colors group/rgb"
                title="Clique para copiar código RGB"
              >
                <span className="font-extrabold text-[#8B8B92] group-hover/rgb:text-[var(--gm-primary)]">RGB:</span>
                <span className="font-bold text-[#F2F2F3] tracking-wider">{formats.rgb}</span>
              </div>

              {/* CMYK */}
              <div
                onClick={(e) => handleCopy(e, formats.cmyk, "CMYK")}
                className="flex items-center justify-between text-[11px] font-mono tabular-nums cursor-pointer hover:bg-[#1B1B1E] px-2 py-1 rounded-[4px] transition-colors group/cmyk"
                title="Clique para copiar código CMYK"
              >
                <span className="font-extrabold text-[#8B8B92] group-hover/cmyk:text-[var(--gm-primary)]">CMYK:</span>
                <span className="font-bold text-[#F2F2F3] tracking-wider">{formats.cmyk}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL DE ESPECTRO INTERATIVO */}
        <ColorSpectrumModal
          isOpen={isSpectrumOpen}
          onClose={() => setIsSpectrumOpen(false)}
          initialColor={value}
          title="Ajustar Cor"
          subtitle="Arraste a barra de espectro para alterar a matiz ou refine a saturação e luminosidade."
          onPreview={(newHex) => onChange(newHex)}
          onApply={(newHex) => onChange(newHex)}
        />
      </>
    );
  };

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
            className="h-10 px-5 rounded-[6px] bg-[#F65A1A] hover:bg-[#FF7A38] text-[#0B0B0C] border border-[#F65A1A] text-xs uppercase tracking-wider font-black flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-none active:scale-95 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin text-[#0B0B0C]" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save size={16} className="text-[#0B0B0C]" />
                <span>Salvar</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="flex flex-col flex-1 w-full">
        {/* CONTENT */}
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-6 pb-2 sm:pb-0">
          {loading ? (
            <Card className="text-center p-10">Carregando...</Card>
          ) : (
            <div className="w-full flex flex-col gap-6">
              {/* SUBDIVISÃO SUPERIOR: Menu de Expansão do Painel de Configurações */}
              <SectionDivider label="Personalização do app" />
              <div className="relative rounded-lg border border-[#26262A] bg-[#131315] overflow-hidden flex flex-col gap-3 p-4 sm:p-5 shadow-none">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1 relative z-10">
                  <span className="text-xs font-black text-[var(--gm-primary)] uppercase tracking-wider flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[var(--gm-primary)]" />
                    PAINEL DE CONFIGURAÇÕES
                  </span>
                  <span className="text-xs text-[#8B8B92] font-medium">
                    {hasActiveSection 
                      ? "Clique na opção ativa para recolher e exibir as outras opções" 
                      : "Selecione uma opção para expandir e editar"}
                  </span>
                </div>

                <div className={hasActiveSection ? "flex flex-col sm:flex-row gap-2.5 justify-center flex-wrap" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5"}>
                  {/* 1. Personalização */}
                  {(!hasActiveSection || openSections.personalization) && (
                    <button
                      type="button"
                      aria-expanded={openSections.personalization}
                      data-selected={openSections.personalization}
                      onClick={() => toggleSection('personalization')}
                      className={getSectionBtnClass(openSections.personalization)}
                    >
                      {openSections.personalization && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--gm-primary)] rounded-[2px]" />
                      )}
                      <span className="flex items-center gap-3 min-w-0">
                        <Palette className={"w-4 h-4 shrink-0 transition-colors duration-150 " + (openSections.personalization ? "text-white" : "text-[var(--gm-primary)] opacity-85")} />
                        <span className="truncate">PERSONALIZAÇÃO</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {openSections.personalization && (
                          <span className="text-[11px] text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 uppercase tracking-wider font-bold whitespace-nowrap">RECOLHER</span>
                        )}
                        <ChevronDown className={"w-4 h-4 shrink-0 transition-transform duration-200 " + (openSections.personalization ? "text-white rotate-180" : "text-[#8B8B92] group-hover:text-[var(--gm-primary)]")} />
                      </div>
                    </button>
                  )}

                  {/* 2. Cores & Fonte */}
                  {(!hasActiveSection || openSections.colors) && (
                    <button
                      type="button"
                      aria-expanded={openSections.colors}
                      data-selected={openSections.colors}
                      onClick={() => toggleSection('colors')}
                      className={getSectionBtnClass(openSections.colors)}
                    >
                      {openSections.colors && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--gm-primary)] rounded-[2px]" />
                      )}
                      <span className="flex items-center gap-3 min-w-0">
                        <Paintbrush className={"w-4 h-4 shrink-0 transition-colors duration-150 " + (openSections.colors ? "text-white" : "text-[var(--gm-primary)] opacity-85")} />
                        <span className="truncate">CORES & FONTE</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {openSections.colors && (
                          <span className="text-[11px] text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 uppercase tracking-wider font-bold whitespace-nowrap">RECOLHER</span>
                        )}
                        <ChevronDown className={"w-4 h-4 shrink-0 transition-transform duration-200 " + (openSections.colors ? "text-white rotate-180" : "text-[#8B8B92] group-hover:text-[var(--gm-primary)]")} />
                      </div>
                    </button>
                  )}

                  {/* 3. Imagem de Fundo */}
                  {(!hasActiveSection || openSections.background) && (
                    <button
                      type="button"
                      aria-expanded={openSections.background}
                      data-selected={openSections.background}
                      onClick={() => toggleSection('background')}
                      className={getSectionBtnClass(openSections.background)}
                    >
                      {openSections.background && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--gm-primary)] rounded-[2px]" />
                      )}
                      <span className="flex items-center gap-3 min-w-0">
                        <ImageIcon className={"w-4 h-4 shrink-0 transition-colors duration-150 " + (openSections.background ? "text-white" : "text-[var(--gm-primary)] opacity-85")} />
                        <span className="truncate">IMAGEM DE FUNDO</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {openSections.background && (
                          <span className="text-[11px] text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 uppercase tracking-wider font-bold whitespace-nowrap">RECOLHER</span>
                        )}
                        <ChevronDown className={"w-4 h-4 shrink-0 transition-transform duration-200 " + (openSections.background ? "text-white rotate-180" : "text-[#8B8B92] group-hover:text-[var(--gm-primary)]")} />
                      </div>
                    </button>
                  )}

                  {/* 4. Dados PIX */}
                  {(!hasActiveSection || openSections.pix) && (
                    <button
                      type="button"
                      aria-expanded={openSections.pix}
                      data-selected={openSections.pix}
                      onClick={() => toggleSection('pix')}
                      className={getSectionBtnClass(openSections.pix)}
                    >
                      {openSections.pix && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--gm-primary)] rounded-[2px]" />
                      )}
                      <span className="flex items-center gap-3 min-w-0">
                        <CreditCard className={"w-4 h-4 shrink-0 transition-colors duration-150 " + (openSections.pix ? "text-white" : "text-[var(--gm-primary)] opacity-85")} />
                        <span className="truncate">DADOS PIX</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {openSections.pix && (
                          <span className="text-[11px] text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 uppercase tracking-wider font-bold whitespace-nowrap">RECOLHER</span>
                        )}
                        <ChevronDown className={"w-4 h-4 shrink-0 transition-transform duration-200 " + (openSections.pix ? "text-white rotate-180" : "text-[#8B8B92] group-hover:text-[var(--gm-primary)]")} />
                      </div>
                    </button>
                  )}

                  {/* 5. Papel Timbrado */}
                  {(!hasActiveSection || openSections.timbrado) && (
                    <button
                      type="button"
                      aria-expanded={openSections.timbrado}
                      data-selected={openSections.timbrado}
                      onClick={() => toggleSection('timbrado')}
                      className={getSectionBtnClass(openSections.timbrado)}
                    >
                      {openSections.timbrado && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--gm-primary)] rounded-[2px]" />
                      )}
                      <span className="flex items-center gap-3 min-w-0">
                        <FileText className={"w-4 h-4 shrink-0 transition-colors duration-150 " + (openSections.timbrado ? "text-white" : "text-[var(--gm-primary)] opacity-85")} />
                        <span className="truncate">PAPEL TIMBRADO</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {openSections.timbrado && (
                          <span className="text-[11px] text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 uppercase tracking-wider font-bold whitespace-nowrap">RECOLHER</span>
                        )}
                        <ChevronDown className={"w-4 h-4 shrink-0 transition-transform duration-200 " + (openSections.timbrado ? "text-white rotate-180" : "text-[#8B8B92] group-hover:text-[var(--gm-primary)]")} />
                      </div>
                    </button>
                  )}

                  {/* 6. Notificações Push */}
                  {(!hasActiveSection || openSections.push) && (
                    <button
                      type="button"
                      aria-expanded={openSections.push}
                      data-selected={openSections.push}
                      onClick={() => toggleSection('push')}
                      className={getSectionBtnClass(openSections.push)}
                    >
                      {openSections.push && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--gm-primary)] rounded-[2px]" />
                      )}
                      <span className="flex items-center gap-3 min-w-0">
                        <Bell className={"w-4 h-4 shrink-0 transition-colors duration-150 " + (openSections.push ? "text-white" : "text-[var(--gm-primary)] opacity-85")} />
                        <span className="truncate">NOTIFICAÇÕES PUSH</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {openSections.push && (
                          <span className="text-[11px] text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 uppercase tracking-wider font-bold whitespace-nowrap">RECOLHER</span>
                        )}
                        <ChevronDown className={"w-4 h-4 shrink-0 transition-transform duration-200 " + (openSections.push ? "text-white rotate-180" : "text-[#8B8B92] group-hover:text-[var(--gm-primary)]")} />
                      </div>
                    </button>
                  )}

                  {/* 7. Sons do Sistema */}
                  {(!hasActiveSection || openSections.sounds) && (
                    <button
                      type="button"
                      aria-expanded={openSections.sounds}
                      data-selected={openSections.sounds}
                      onClick={() => toggleSection('sounds')}
                      className={getSectionBtnClass(openSections.sounds)}
                    >
                      {openSections.sounds && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--gm-primary)] rounded-[2px]" />
                      )}
                      <span className="flex items-center gap-3 min-w-0">
                        <Volume2 className={"w-4 h-4 shrink-0 transition-colors duration-150 " + (openSections.sounds ? "text-white" : "text-[var(--gm-primary)] opacity-85")} />
                        <span className="truncate">SONS DO SISTEMA</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {openSections.sounds && (
                          <span className="text-[11px] text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 uppercase tracking-wider font-bold whitespace-nowrap">RECOLHER</span>
                        )}
                        <ChevronDown className={"w-4 h-4 shrink-0 transition-transform duration-200 " + (openSections.sounds ? "text-white rotate-180" : "text-[#8B8B92] group-hover:text-[var(--gm-primary)]")} />
                      </div>
                    </button>
                  )}

                  {/* 8. Tutorial & Suporte */}
                  {(!hasActiveSection || openSections.tutorial) && (
                    <button
                      type="button"
                      aria-expanded={openSections.tutorial}
                      data-selected={openSections.tutorial}
                      onClick={() => toggleSection('tutorial')}
                      className={getSectionBtnClass(openSections.tutorial)}
                    >
                      {openSections.tutorial && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--gm-primary)] rounded-[2px]" />
                      )}
                      <span className="flex items-center gap-3 min-w-0">
                        <HelpCircle className={"w-4 h-4 shrink-0 transition-colors duration-150 " + (openSections.tutorial ? "text-white" : "text-[var(--gm-primary)] opacity-85")} />
                        <span className="truncate">TUTORIAL & SUPORTE</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {openSections.tutorial && (
                          <span className="text-[11px] text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 uppercase tracking-wider font-bold whitespace-nowrap">RECOLHER</span>
                        )}
                        <ChevronDown className={"w-4 h-4 shrink-0 transition-transform duration-200 " + (openSections.tutorial ? "text-white rotate-180" : "text-[#8B8B92] group-hover:text-[var(--gm-primary)]")} />
                      </div>
                    </button>
                  )}

                  {/* 9. Segurança & PIN */}
                  {(!hasActiveSection || openSections.security) && (
                    <button
                      type="button"
                      aria-expanded={openSections.security}
                      data-selected={openSections.security}
                      onClick={() => toggleSection('security')}
                      className={getSectionBtnClass(openSections.security)}
                    >
                      {openSections.security && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--gm-primary)] rounded-[2px]" />
                      )}
                      <span className="flex items-center gap-3 min-w-0">
                        <ShieldCheck className={"w-4 h-4 shrink-0 transition-colors duration-150 " + (openSections.security ? "text-white" : "text-[var(--gm-primary)] opacity-85")} />
                        <span className="truncate">SEGURANÇA & PIN</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {openSections.security && (
                          <span className="text-[11px] text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 uppercase tracking-wider font-bold whitespace-nowrap">RECOLHER</span>
                        )}
                        <ChevronDown className={"w-4 h-4 shrink-0 transition-transform duration-200 " + (openSections.security ? "text-white rotate-180" : "text-[#8B8B92] group-hover:text-[var(--gm-primary)]")} />
                      </div>
                    </button>
                  )}

                  {/* 10. Gerador de QR Code Inteligente */}
                  {(!hasActiveSection || openSections.qrcode) && (
                    <button
                      type="button"
                      aria-expanded={openSections.qrcode}
                      data-selected={openSections.qrcode}
                      onClick={() => toggleSection('qrcode')}
                      className={getSectionBtnClass(openSections.qrcode)}
                    >
                      {openSections.qrcode && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--gm-primary)] rounded-[2px]" />
                      )}
                      <span className="flex items-center gap-3 min-w-0">
                        <QrCode className={"w-4 h-4 shrink-0 transition-colors duration-150 " + (openSections.qrcode ? "text-white" : "text-[var(--gm-primary)] opacity-85")} />
                        <span className="truncate">GERADOR DE QR CODE</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {openSections.qrcode && (
                          <span className="text-[11px] text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 uppercase tracking-wider font-bold whitespace-nowrap">RECOLHER</span>
                        )}
                        <ChevronDown className={"w-4 h-4 shrink-0 transition-transform duration-200 " + (openSections.qrcode ? "text-white rotate-180" : "text-[#8B8B92] group-hover:text-[var(--gm-primary)]")} />
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Card quando nenhuma seção estiver aberta */}
              {!hasActiveSection && (
                <div className="gm-settings-card bg-[#131315] flex flex-col items-center justify-center py-16 px-4 border border-[#26262A] rounded-lg text-center shadow-none animate-in fade-in duration-200">
                  <div className="w-14 h-14 rounded-md bg-[var(--gm-primary)]/10 text-[var(--gm-primary)] flex items-center justify-center mb-4 border border-[var(--gm-primary)]/25 shadow-none">
                    <SlidersHorizontal className="w-7 h-7 text-[var(--gm-primary)]" />
                  </div>
                  <h3 className="text-xl font-extrabold text-[#F2F2F3] mb-2">Painel de Configurações</h3>
                  <p className="text-sm text-[#8B8B92] max-w-md leading-relaxed font-medium">
                    Clique em qualquer uma das opções acima para abrir o painel correspondente e personalizar as configurações do seu aplicativo.
                  </p>
                </div>
              )}

              {/* SEÇÃO 1: PERSONALIZAÇÃO */}
              {openSections.personalization && (
                <div className="gm-settings-card bg-[#131315] border border-[#26262A] p-4 sm:p-6 rounded-lg space-y-6 shadow-none w-full pb-10 animate-in fade-in duration-200">
                  <div className="sticky top-0 z-20 bg-[#0B0B0C] py-2.5 px-3 sm:px-4 border border-[#26262A] flex items-center justify-between mb-3 rounded-md shadow-none">
                    <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-[#F2F2F3] uppercase tracking-wider">
                      <Palette className="w-4 h-4 text-[var(--gm-primary)] shrink-0" />
                      <span>PERSONALIZAÇÃO</span>
                    </span>
                    <span className="text-[11px] font-bold text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2.5 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 whitespace-nowrap">
                      Edição Ativa
                    </span>
                  </div>

                  <div className="w-full py-1">
                    {/* LOGO DA EMPRESA / FOTO DE PERFIL */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-5 sm:p-6 bg-[#0B0B0C] rounded-md border border-[#26262A] shadow-none w-full">
                      {/* LADO ESQUERDO: PRÉVIA DA IMAGEM LOGO + BOTÃO PARA SUBIR IMAGEM */}
                      <div className="flex flex-col items-center gap-3 shrink-0 w-full sm:w-auto">
                        {/* PRÉVIA IMAGEM LOGO */}
                        <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-md bg-[#131315] border border-dashed border-[#3F3F46] overflow-hidden flex items-center justify-center relative shrink-0 group/logo">
                          {companyLogoUrl ? (
                            <img
                              src={companyLogoUrl}
                              alt="Logo"
                              className="w-full h-full object-contain p-2.5"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-[#8B8B92]">
                              <ImageIcon size={36} className="opacity-50 text-[var(--gm-primary)]" />
                              <span className="text-xs font-bold text-[#8B8B92]">Sem Imagem</span>
                            </div>
                          )}

                          <AnimatePresence>
                            {uploadingLogo && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-[#0B0B0C]/90 flex flex-col items-center justify-center p-2 text-[#F2F2F3] text-center z-10"
                              >
                                <Loader2 size={24} className="animate-spin text-[var(--gm-primary)] mb-1.5" />
                                <span className="text-[11px] font-bold leading-tight">
                                  {logoStatusText || "Processando..."}
                                </span>
                                {logoProgress > 0 && (
                                  <div className="w-full bg-[#26262A] h-1.5 rounded-[2px] mt-2 overflow-hidden">
                                    <div
                                      className="bg-[var(--gm-primary)] h-full transition-all duration-300 rounded-[2px]"
                                      style={{ width: logoProgress + "%" }}
                                    />
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* BOTÃO PARA SUBIR LOGO ABAIXO DA FOTO DA LOGO */}
                        <label
                          className={"gm-btn py-2 px-4 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-none transition-colors rounded-[6px] border border-[var(--gm-primary)]/40 bg-[var(--gm-primary)]/10 text-[var(--gm-primary)] hover:bg-[var(--gm-primary)] hover:text-[#0B0B0C] w-full " + (uploadingLogo ? "opacity-50 pointer-events-none" : "")}
                        >
                          {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
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

                      {/* LADO DIREITO: TODAS AS INFORMAÇÕES DE TEXTO E ORIENTAÇÕES */}
                      <div className="flex-1 flex flex-col items-start text-left gap-3">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--gm-primary)] flex items-center gap-1.5">
                          <FileImage size={15} /> Logo do Aplicativo (Painel do Sistema)
                        </span>

                        <p className="text-xs sm:text-sm text-[#8B8B92] font-medium leading-relaxed">
                          Cadastre a imagem oficial da sua marca para exibição no aplicativo, menus internos, cabeçalhos e relatórios. O website público possui um logotipo próprio e independente configurável na página BiO.
                        </p>

                        <AnimatePresence>
                          {logoStats && !uploadingLogo && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-[4px] border border-emerald-500/20 tabular-nums"
                            >
                              <Sparkles size={12} className="shrink-0 text-emerald-400" />
                              <span>Imagem otimizada: {logoStats.compressedSize} ({logoStats.reduction})</span>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="pt-2 border-t border-[#26262A] w-full mt-1">
                          <span className="text-[11px] text-[#8B8B92] font-medium leading-relaxed block">
                            • Resolução sugerida: <strong className="text-[#CBD5E1]">512x512px</strong>
                          </span>
                          <span className="text-[11px] text-[#8B8B92] font-medium leading-relaxed block">
                            • Formatos aceitos: <strong className="text-[#CBD5E1]">PNG, JPG, WEBP e SVG</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-[#26262A] w-full"></div>

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

                  <div className="h-px bg-[#26262A] w-full"></div>

                  <div>
                    {/* CABEÇALHO DO PAINEL DE BOTÕES */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)] flex items-center gap-2">
                          <Sparkles size={16} />
                          Personalização dos Botões
                        </label>
                        <p className="text-xs text-[#8B8B92] mt-0.5">
                          Configure o estilo e as cores dos botões do aplicativo.
                        </p>
                      </div>
                    </div>

                    {/* CAIXAS EXPANDIDAS DOS ESTILOS DE BOTÕES */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
                      {BUTTON_STYLES.map((s) => {
                        const currentActiveStyle = buttonStyleDark;
                        const isActive = currentActiveStyle === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            aria-pressed={isActive}
                            data-selected={isActive}
                            onClick={() => handleButtonStyleChange(s.id)}
                            className={
                              "group relative flex flex-col justify-between p-5 rounded-md border transition-colors duration-150 cursor-pointer text-left outline-none min-h-[220px] shadow-none " +
                              (isActive
                                ? "bg-[#1B1B1E] border-[var(--gm-primary)]"
                                : "bg-[#0B0B0C] border-[#26262A] hover:border-[#3F3F46]")
                            }
                          >
                            <div className="w-full">
                              <div className="flex items-center justify-between w-full mb-2 gap-2">
                                <span className={"text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 " + (isActive ? "text-[#F2F2F3]" : "text-[#CBD5E1]")}>
                                  {isActive && (
                                    <span className="w-5 h-5 rounded-[4px] bg-[var(--gm-primary)] flex items-center justify-center text-white shrink-0">
                                      <Check size={12} strokeWidth={3} className="text-white" />
                                    </span>
                                  )}
                                  {s.name}
                                </span>
                                {s.badge && (
                                  <span className={"text-[11px] font-extrabold px-2 py-0.5 rounded-[4px] uppercase tracking-wider shrink-0 " + (isActive ? "bg-[var(--gm-primary)] text-white" : "bg-[#131315] border border-[#26262A] text-[#8B8B92]")}>
                                    {s.badge}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-[#8B8B92] font-medium leading-relaxed mb-4">
                                {s.desc}
                              </p>
                            </div>

                            {/* PREVIA DETALHADA DENTRO DA CAIXA SELETORA */}
                            <div className="gm-preview-container w-full p-3.5 rounded-md bg-[#131315] border border-[#26262A] space-y-3" data-button-style={s.id}>
                              <div className="flex items-center justify-between text-[11px] text-[#8B8B92] font-bold uppercase tracking-wider px-0.5">
                                <span className="flex items-center gap-1.5 text-[#F2F2F3]">
                                  <Sparkles size={12} className="text-[var(--gm-primary)]" />
                                  Prévia
                                </span>
                                {isActive ? (
                                  <span className="text-emerald-400 font-black flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-[2px] bg-emerald-400" />
                                    Ativo
                                  </span>
                                ) : (
                                  <span className="text-[#8B8B92] font-bold uppercase tracking-wider">Clique para ativar</span>
                                )}
                              </div>

                              {s.id === "solid" ? (
                                <div className="space-y-2.5">
                                  <div className="w-full py-2.5 px-4 rounded-[6px] font-extrabold text-xs text-white bg-[var(--gm-primary)] flex items-center justify-center gap-2">
                                    <Check size={14} className="text-white" />
                                    Principal Sólido
                                  </div>
                                </div>
                              ) : s.id === "glass" ? (
                                <div className="space-y-2.5">
                                  <div className="w-full py-2.5 px-4 rounded-[6px] font-extrabold text-xs text-white bg-white/10 border border-white/20 flex items-center justify-center gap-2">
                                    <Sparkles size={14} className="text-[var(--gm-primary)]" />
                                    Principal Vidro
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2.5">
                                  <div className="w-full py-2.5 px-4 rounded-[6px] font-extrabold text-xs text-[var(--gm-primary)] bg-transparent border-2 border-[var(--gm-primary)] flex items-center justify-center gap-2">
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
                  </div>
                </div>
              )}

              {/* SEÇÃO 2: CORES & FONTE */}
              {openSections.colors && (
                <div className="gm-settings-card bg-[#131315] border border-[#26262A] p-4 sm:p-6 rounded-lg space-y-6 shadow-none w-full pb-10 animate-in fade-in duration-200">
                  <div className="sticky top-0 z-20 bg-[#0B0B0C] py-2.5 px-3 sm:px-4 border border-[#26262A] flex items-center justify-between mb-3 rounded-md shadow-none">
                    <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-[#F2F2F3] uppercase tracking-wider">
                      <Paintbrush className="w-4 h-4 text-[var(--gm-primary)] shrink-0" />
                      <span>CORES & FONTE</span>
                    </span>
                    <span className="text-[11px] font-bold text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2.5 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 whitespace-nowrap">
                      Edição Ativa
                    </span>
                  </div>

                  <ColorSettingsManager
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
                <div className="gm-settings-card bg-[#131315] border border-[#26262A] p-4 sm:p-6 rounded-lg space-y-6 shadow-none w-full pb-10 animate-in fade-in duration-200">
                  <div className="sticky top-0 z-20 bg-[#0B0B0C] py-2.5 px-3 sm:px-4 border border-[#26262A] flex items-center justify-between mb-3 rounded-md shadow-none">
                    <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-[#F2F2F3] uppercase tracking-wider">
                      <ImageIcon className="w-4 h-4 text-[var(--gm-primary)] shrink-0" />
                      <span>IMAGEM DE FUNDO</span>
                    </span>
                    <span className="text-[11px] font-bold text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2.5 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 whitespace-nowrap">
                      Edição Ativa
                    </span>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between gap-3 rounded-md border border-[#26262A] bg-[#0B0B0C] p-4">
                      <div>
                        <div className="font-bold text-sm text-[#F2F2F3]">
                          Exibir Plano de Fundo (Smartphone & Desktop)
                        </div>
                        <div className="text-xs text-[#8B8B92]">
                          Ativa ou desativa o plano de fundo simultaneamente em todos os seus dispositivos
                        </div>
                      </div>
                      <button
                        type="button"
                        className={"gm-btn py-1.5 px-4 text-xs font-bold rounded-[6px] transition-colors " + ((bgEnabled || mobileBgEnabled) ? "bg-emerald-600 text-white" : "bg-[#1B1B1E] border border-[#26262A] text-[#CBD5E1]")}
                        onClick={async () => {
                          const next = !(bgEnabled || mobileBgEnabled);
                          setBgEnabled(next);
                          setMobileBgEnabled(next);

                          const targetOp = next ? (bgOpacity > 0 ? bgOpacity : bgOpacityPrev || 0.18) : 0;
                          const targetMobileOp = next ? (mobileBgOpacity > 0 ? mobileBgOpacity : mobileBgOpacityPrev || 0.18) : 0;

                          if (next) {
                            setBgOpacity(targetOp);
                            setMobileBgOpacity(targetMobileOp);
                          } else {
                            if (bgOpacity > 0) setBgOpacityPrev(bgOpacity);
                            if (mobileBgOpacity > 0) setMobileBgOpacityPrev(mobileBgOpacity);
                            setBgOpacity(0);
                            setMobileBgOpacity(0);
                          }

                          // Transmite em tempo real para os dois dispositivos (Smartphone e Desktop)
                          broadcastBackgroundChange(tenantId, {
                            enabled: next,
                            bgUrl,
                            bgOpacity: targetOp,
                            bgScale,
                            bgBlur,
                            bgFit,
                            bgPosX: `${bgPosX}%`,
                            bgPosY: `${bgPosY}%`,
                            mobileBgUrl: mobileBgUrl || bgUrl,
                            mobileBgOpacity: targetMobileOp,
                            mobileBgScale,
                            mobileBgBlur,
                            mobileBgFit,
                            mobileBgPosX: `${mobileBgPosX}%`,
                            mobileBgPosY: `${mobileBgPosY}%`,
                            timestamp: Date.now(),
                          });

                          if (tenantId) {
                            try {
                              await upsertSettingsSupabase(tenantId, {
                                app_background_url: bgUrl,
                                app_background_opacity: targetOp,
                                mobile_app_background_url: mobileBgUrl || bgUrl,
                                mobile_app_background_opacity: targetMobileOp,
                              });
                            } catch (e) {}
                          }
                        }}
                      >
                        {(bgEnabled || mobileBgEnabled) ? "Ativo (Ambos)" : "Desativado"}
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

                      <div className="flex flex-col justify-between p-4 bg-[#0B0B0C] rounded-md border border-[#26262A] shadow-none">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-2 block">
                            Preview da Imagem / Vídeo
                          </span>
                          {(viewMode === "smartphone" ? mobileBgUrl : bgUrl) ? (
                            <div className="mb-4 rounded-md overflow-hidden border border-[var(--gm-primary)]/25 relative aspect-video shadow-none group bg-[#131315] flex items-center justify-center">
                              {!(viewMode === "smartphone" ? mobileBgEnabled : bgEnabled) && (
                                <div className="absolute inset-0 bg-[#0B0B0C]/80 z-10 flex items-center justify-center">
                                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider bg-red-950/80 px-3 py-1 rounded-[4px] border border-red-500/30">
                                    Plano de Fundo Desativado
                                  </span>
                                </div>
                              )}
                              {uploadingBackground && (
                                <div className="absolute inset-0 bg-[#0B0B0C]/85 flex flex-col items-center justify-center z-20">
                                  <Loader2 size={32} className="animate-spin text-[var(--gm-primary)] mb-2" />
                                  <span className="text-[11px] font-bold text-[#F2F2F3] uppercase tracking-wider">Processando...</span>
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
                            <div className="mb-4 rounded-md border border-dashed border-[#3F3F46] bg-[#131315] aspect-video flex flex-col items-center justify-center p-4 text-center">
                              <ImageIcon size={32} className="text-[#8B8B92] mb-2 opacity-50" />
                              <span className="text-xs font-medium text-[#8B8B92]">Nenhuma imagem carregada</span>
                            </div>
                          )}
                        </div>

                        <label
                          className={"gm-btn w-full py-2.5 rounded-[6px] flex items-center justify-center gap-2 cursor-pointer " + (uploadingBackground ? "opacity-50 pointer-events-none" : "")}
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

                    {/* SEPARADOR SUTIL */}
                    <div className="border-t border-[#26262A]" />

                    {/* GALERIA DE EFEITOS DINÂMICOS DO PLANO DE FUNDO */}
                    <BackgroundEffectsGallery
                      tenantId={tenantId}
                      onSaveToBackend={async (effectCfg) => {
                        if (tenantId) {
                          try {
                            await upsertSettingsSupabase(tenantId, {
                              bg_effect_desktop_enabled: effectCfg.desktopEnabled,
                              bg_effect_desktop_type: effectCfg.desktopEffect,
                              bg_effect_lockscreen_enabled: effectCfg.lockscreenEnabled,
                              bg_effect_lockscreen_type: effectCfg.lockscreenEffect,
                              bg_effect_enabled: effectCfg.desktopEnabled || effectCfg.lockscreenEnabled,
                              bg_effect_type: effectCfg.desktopEffect,
                              bg_effect_scope: "both",
                            });
                          } catch (e) {}
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* SEÇÃO 4: DADOS PIX */}
              {openSections.pix && (
                <div className="gm-settings-card bg-[#131315] border border-[#26262A] p-4 sm:p-6 rounded-lg space-y-6 shadow-none w-full pb-10 animate-in fade-in duration-200">
                  <div className="sticky top-0 z-20 bg-[#0B0B0C] py-2.5 px-3 sm:px-4 border border-[#26262A] flex items-center justify-between mb-3 rounded-md shadow-none">
                    <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-[#F2F2F3] uppercase tracking-wider">
                      <CreditCard className="w-4 h-4 text-[var(--gm-primary)] shrink-0" />
                      <span>DADOS DE PAGAMENTO (PIX)</span>
                    </span>
                    <span className="text-[11px] font-bold text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2.5 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 whitespace-nowrap">
                      Edição Ativa
                    </span>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div className="text-xs text-[#8B8B92] bg-[#0B0B0C] p-3.5 rounded-md border border-[#26262A] flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                      <span>O QR Code e a chave “Copia e Cola” gerados aqui funcionam em <strong className="text-[#CBD5E1]">qualquer aplicativo bancário</strong>.</span>
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
                      <div className="rounded-md border border-[#26262A] bg-[#0B0B0C] p-5 flex flex-col items-center justify-center shadow-none">
                        <div className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-3 self-start">
                          QR Code Pix Universal
                        </div>
                        {pixQrPreview ? (
                          <div className="bg-white rounded-md p-4 my-auto flex items-center justify-center">
                            <img src={pixQrPreview} alt="QR Pix (Preview)" className="w-[180px] h-auto" />
                          </div>
                        ) : (
                          <div className="text-xs text-[#8B8B92] text-center py-12">
                            Informe uma chave Pix válida acima para gerar o QR Code.
                          </div>
                        )}
                      </div>

                      <div className="rounded-md border border-[#26262A] bg-[#0B0B0C] p-5 flex flex-col justify-between shadow-none">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-3">
                            Pix Copia e Cola
                          </div>
                          {!pixPayloadPreview ? (
                            <div className="text-xs text-[#8B8B92] text-center py-12">
                              Informe uma chave Pix para gerar o código de cópia instantânea.
                            </div>
                          ) : (
                            <div className="text-[11px] leading-relaxed font-mono break-all bg-[#131315] border border-[#26262A] rounded-md p-3 text-[#CBD5E1] max-h-[140px] overflow-y-auto">
                              {pixPayloadPreview}
                            </div>
                          )}
                        </div>

                        {pixPayloadPreview && (
                          <button
                            type="button"
                            className="gm-btn w-full justify-center py-2.5 text-xs font-bold rounded-[6px] mt-4"
                            onClick={async () => {
                              const ok = await copyText(pixPayloadPreview);
                              if (ok) {
                                setPixCopied(true);
                                setTimeout(() => setPixCopied(false), 1500);
                              } else {
                                pushToast({ type: "error", title: "Erro ao copiar", message: "Não foi possível copiar automaticamente. Copie manualmente o código." });
                              }
                            }}
                          >
                            {pixCopied ? <Check size={16} /> : <Copy size={16} />}
                            {pixCopied ? "Copiado com Sucesso!" : "Copiar Código Pix"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* OPÇÕES DE BAIXAR QR CODE PIX EM 5 FORMATOS */}
                    {pixPayloadPreview && (
                      <PixQrDownloadFormats
                        pixPayload={pixPayloadPreview}
                        pixKey={pixKey}
                        companyName={companyName}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* SEÇÃO 5: PAPEL TIMBRADO */}
              {openSections.timbrado && (
                <div className="gm-settings-card bg-[#131315] border border-[#26262A] p-4 sm:p-6 rounded-lg space-y-6 shadow-none w-full pb-10 animate-in fade-in duration-200">
                  <div className="sticky top-0 z-20 bg-[#0B0B0C] py-2.5 px-3 sm:px-4 border border-[#26262A] flex items-center justify-between mb-3 rounded-md shadow-none">
                    <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-[#F2F2F3] uppercase tracking-wider">
                      <FileText className="w-4 h-4 text-[var(--gm-primary)] shrink-0" />
                      <span>PAPEL TIMBRADO</span>
                    </span>
                    <span className="text-[11px] font-bold text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2.5 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 whitespace-nowrap">
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
                        <div className="w-full aspect-[1/1.414] rounded-md bg-[#0B0B0C] border border-dashed border-[#3F3F46] overflow-hidden flex items-center justify-center relative shadow-none">
                          {uploadingTimbrado ? (
                            <Loader2 size={40} className="animate-spin text-[var(--gm-primary)]" />
                          ) : timbradoUrl ? (
                            <img src={timbradoUrl} alt="Timbrado" className="w-full h-full object-cover" />
                          ) : (
                            <FileText size={40} className="opacity-40 text-[#8B8B92]" />
                          )}
                        </div>
                        <label
                          className={"gm-btn w-full py-2.5 rounded-[6px] flex items-center justify-center gap-2 cursor-pointer " + (uploadingTimbrado ? "opacity-50 pointer-events-none" : "")}
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
                        <div className="w-full aspect-[1/1.414] rounded-md bg-[#0B0B0C] border border-dashed border-[#3F3F46] overflow-hidden flex items-center justify-center relative shadow-none">
                          <img src={TIMBRADO_MODEL_URL} alt="Gabarito" className="w-full h-full object-cover" />
                        </div>
                        <a
                          href={TIMBRADO_MODEL_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gm-btn-soft w-full py-2.5 rounded-[6px] flex items-center justify-center gap-2 text-xs font-bold"
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
                <div
                  className="gm-settings-card bg-[#131315] border border-[#26262A] p-4 sm:p-6 rounded-lg space-y-6 shadow-none w-full pb-10 animate-in fade-in duration-200"
                >
                  {/* Barra de Cabeçalho Fixa */}
                  <div
                    className="sticky top-0 z-20 bg-[#0B0B0C] py-2.5 px-3 sm:px-4 border border-[#26262A] flex items-center justify-between mb-3 rounded-md shadow-none"
                  >
                    <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-[#F2F2F3] uppercase tracking-wider">
                      <Bell className="w-4 h-4 text-[var(--gm-primary)] shrink-0" />
                      <span>NOTIFICAÇÕES PUSH & ALERTAS</span>
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2.5 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 whitespace-nowrap">
                      Edição Ativa
                    </span>
                  </div>

                  {/* 1. HERO CARD: STATUS PRINCIPAL DO DISPOSITIVO */}
                  <div
                    className="relative w-full p-6 rounded-lg border border-[#26262A] bg-[#0B0B0C] text-center flex flex-col items-center gap-3.5 shadow-none"
                  >
                    <div
                      className={"relative z-10 w-14 h-14 rounded-md flex items-center justify-center border transition-colors duration-150 " + (pushActive && pushPermission === "granted" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-amber-500/15 border-amber-500/40 text-amber-400")}
                    >
                      <Bell size={26} />
                    </div>

                    <div className="space-y-1 relative z-10">
                      <h4 className="text-base sm:text-xl font-black text-[#F2F2F3] uppercase tracking-wider">
                        Alertas e Notificações do Dispositivo
                      </h4>
                      <p className="text-xs sm:text-sm text-[#8B8B92] max-w-2xl mx-auto leading-relaxed">
                        Ative as notificações push para receber alertas instantâneos de orçamentos aprovados, prazos e mensagens diretamente no smartphone e computador.
                      </p>
                    </div>

                    {/* Badge de Status Geral em Tempo Real */}
                    <div className="pt-1 relative z-10">
                      {pushActive && pushPermission === "granted" ? (
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[4px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                          <span className="w-2 h-2 rounded-[2px] bg-emerald-400" />
                          <span>Notificações Ativas e Prontas no Dispositivo</span>
                        </div>
                      ) : pushPermission === "denied" ? (
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[4px] bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold">
                          <span className="w-2 h-2 rounded-[2px] bg-red-400" />
                          <span>Permissão Bloqueada no Navegador (Ative nas Configurações)</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[4px] bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                          <span className="w-2 h-2 rounded-[2px] bg-amber-400" />
                          <span>Permissão Pendente no Navegador</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. GRID DE CONTROLES: NOTIFICAÇÕES E SONS */}
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Controle 1: Notificações Push */}
                    <div
                      className="relative p-5 rounded-md border border-[#26262A] bg-[#0B0B0C] hover:border-[#3F3F46] transition-colors flex items-center justify-between gap-4 shadow-none"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 relative z-10">
                        <div className="w-11 h-11 rounded-md bg-[var(--gm-primary)]/15 border border-[var(--gm-primary)]/30 text-[var(--gm-primary)] flex items-center justify-center shrink-0">
                          <Bell size={20} />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-xs sm:text-sm font-black text-[#F2F2F3] uppercase tracking-wide truncate">
                            Notificações Push
                          </p>
                          <p className={"text-[11px] font-bold uppercase " + (pushActive && pushPermission === "granted" ? "text-emerald-400" : "text-amber-400")}>
                            {pushActive && pushPermission === "granted" ? "Ativo (Ligado)" : "Desativado"}
                          </p>
                          <span className="text-[11px] text-[#8B8B92] block pt-0.5">Alertas em 1º plano, 2º plano e barra de tarefas</span>
                        </div>
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
                        className={"w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 outline-none shrink-0 cursor-pointer relative z-10 " + (pushActive && pushPermission === "granted" ? "bg-emerald-500 justify-end" : "bg-[#26262A] justify-start")}
                      >
                        <motion.div layout className="w-5 h-5 bg-white rounded-full" />
                      </button>
                    </div>

                    {/* Controle 2: Sons de Alerta */}
                    <div
                      className="relative p-5 rounded-md border border-[#26262A] bg-[#0B0B0C] hover:border-[#3F3F46] transition-colors flex items-center justify-between gap-4 shadow-none"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 relative z-10">
                        <div className="w-11 h-11 rounded-md bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
                          <Volume2 size={20} />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-xs sm:text-sm font-black text-[#F2F2F3] uppercase tracking-wide truncate">
                            Sons de Alerta
                          </p>
                          <p className={"text-[11px] font-bold uppercase " + (!notificationsMuted ? "text-emerald-400" : "text-amber-400")}>
                            {!notificationsMuted ? "Ativo (Ligado)" : "Silenciado (Mudo)"}
                          </p>
                          <span className="text-[11px] text-[#8B8B92] block pt-0.5">Toques sonoros de confirmação e alarmes</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const next = !notificationsMuted;
                          localStorage.setItem("gm.notificationsMuted", next ? "true" : "false");
                          setNotificationsMuted(next);
                        }}
                        className={"w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 outline-none shrink-0 cursor-pointer relative z-10 " + (!notificationsMuted ? "bg-emerald-500 justify-end" : "bg-[#26262A] justify-start")}
                      >
                        <motion.div layout className="w-5 h-5 bg-white rounded-full" />
                      </button>
                    </div>
                  </div>

                  {/* 3. CARD DESTAQUE: CHECK-IN DE NOTIFICAÇÕES NOS 4 ESTADOS */}
                  <div
                    className="relative w-full p-5 sm:p-6 rounded-lg border border-[#26262A] bg-[#0B0B0C] space-y-5 shadow-none"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#26262A] pb-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-[var(--gm-primary)]/15 border border-[var(--gm-primary)]/30 flex items-center justify-center text-[var(--gm-primary)] shrink-0">
                          <Radio size={18} />
                        </div>
                        <div className="text-left">
                          <h5 className="text-xs sm:text-base font-black text-[#F2F2F3] uppercase tracking-wider">
                            Check-in de Notificações nos 4 Estados
                          </h5>
                          <p className="text-xs text-[#8B8B92]">
                            Auditoria e teste em tempo real das condições de entrega do aplicativo
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-[4px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 self-start sm:self-auto tabular-nums">
                        4 Estados Suportados
                      </span>
                    </div>

                    {/* Grade dos 4 Estados */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-left w-full relative z-10">
                      <div
                        className="relative p-3.5 rounded-md border border-[#26262A] bg-[#131315] space-y-1.5 shadow-none"
                      >
                        <div className="flex items-center gap-1.5 relative z-10">
                          <span className="w-2 h-2 rounded-[2px] bg-emerald-400" />
                          <span className="text-xs font-black text-[#F2F2F3] uppercase">1. Aberto</span>
                        </div>
                        <span className="text-[11px] font-extrabold text-emerald-400 block uppercase tracking-wide relative z-10">Em Tela (1º Plano)</span>
                        <p className="text-[11px] text-[#8B8B92] leading-relaxed relative z-10">Banner no app, áudio espacial e vibração no celular</p>
                      </div>

                      <div
                        className="relative p-3.5 rounded-md border border-[#26262A] bg-[#131315] space-y-1.5 shadow-none"
                      >
                        <div className="flex items-center gap-1.5 relative z-10">
                          <span className="w-2 h-2 rounded-[2px] bg-amber-400" />
                          <span className="text-xs font-black text-[#F2F2F3] uppercase">2. Minimizado</span>
                        </div>
                        <span className="text-[11px] font-extrabold text-amber-400 block uppercase tracking-wide relative z-10">Janela Oculta</span>
                        <p className="text-[11px] text-[#8B8B92] leading-relaxed relative z-10">Alerta nativo no Windows, macOS, Android e iOS</p>
                      </div>

                      <div
                        className="relative p-3.5 rounded-md border border-[#26262A] bg-[#131315] space-y-1.5 shadow-none"
                      >
                        <div className="flex items-center gap-1.5 relative z-10">
                          <span className="w-2 h-2 rounded-[2px] bg-blue-400" />
                          <span className="text-xs font-black text-[#F2F2F3] uppercase">3. 2º Plano</span>
                        </div>
                        <span className="text-[11px] font-extrabold text-blue-400 block uppercase tracking-wide relative z-10">Tela Bloqueada</span>
                        <p className="text-[11px] text-[#8B8B92] leading-relaxed relative z-10">Service Worker mantém sincronia e alarmes ativos</p>
                      </div>

                      <div
                        className="relative p-3.5 rounded-md border border-[#26262A] bg-[#131315] space-y-1.5 shadow-none"
                      >
                        <div className="flex items-center gap-1.5 relative z-10">
                          <span className="w-2 h-2 rounded-[2px] bg-purple-400" />
                          <span className="text-xs font-black text-[#F2F2F3] uppercase">4. Fechado</span>
                        </div>
                        <span className="text-[11px] font-extrabold text-purple-400 block uppercase tracking-wide relative z-10">Push Remoto</span>
                        <p className="text-[11px] text-[#8B8B92] leading-relaxed relative z-10">Web Push FCM acorda o aparelho mesmo fechado</p>
                      </div>
                    </div>

                    {/* Botão de Abertura do Modal de Check-in */}
                    <button
                      type="button"
                      onClick={() => setShowCheckinModal(true)}
                      className="relative rounded-[6px] border border-[#26262A] bg-[#131315] hover:bg-[#1B1B1E] hover:border-[#3F3F46] w-full py-3.5 px-5 text-xs sm:text-sm font-black text-[#F2F2F3] flex items-center justify-between gap-3 transition-colors cursor-pointer group active:scale-[0.99] shadow-none"
                    >
                      <div className="flex items-center gap-3 relative z-10">
                        <Radio size={17} className="text-[var(--gm-primary)]" />
                        <span className="font-black tracking-wide uppercase">
                          Abrir Painel de Check-in e Diagnóstico dos 4 Estados
                        </span>
                      </div>
                      <ChevronRight size={18} className="text-[#8B8B92] group-hover:translate-x-1 transition-transform relative z-10" />
                    </button>
                  </div>

                  {/* 4. GRID DE AÇÕES RÁPIDAS DE TESTE E PERMISSÕES */}
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Botão de Teste Simultâneo */}
                    <motion.button
                      type="button"
                      animate={shakeTest ? { x: [-6, 6, -6, 6, -4, 4, -2, 2, 0] } : {}}
                      transition={{ duration: 0.4 }}
                      disabled={testing}
                      onClick={async () => {
                        setShakeTest(true);
                        setTimeout(() => setShakeTest(false), 450);

                        if (pushPermission !== "granted" && typeof Notification !== "undefined") {
                          try {
                            const permission = await Notification.requestPermission();
                            setPushPermission(permission);
                          } catch (e) {}
                        }

                        if (!pushActive) {
                          setPushActive(true);
                          localStorage.setItem("gm.pushActive", "true");
                        }

                        setTesting(true);
                        try {
                          // 1. Dispara localmente
                          await triggerRealNotification({
                            title: "CardDigital GM · Notificação Simultânea",
                            body: "Notificação funcionando simultaneamente no Smartphone e Desktop!",
                            soundId: activeSound,
                          });

                          // 2. Dispara simultaneamente para todos os dispositivos logados na mesma conta
                          broadcastAppNotification(tenantId, {
                            title: "CardDigital GM · Teste Simultâneo",
                            message: "Notificação disparada e sincronizada em todos os seus dispositivos!",
                            type: "system",
                          });
                        } catch (e) {
                          console.error("[Notification Test]", e);
                        } finally {
                          setTimeout(() => setTesting(false), 1200);
                        }
                      }}
                      className="gm-btn py-3.5 px-5 flex items-center justify-center gap-3 text-xs sm:text-sm font-black w-full transition-colors text-white rounded-[6px] shadow-none active:scale-[0.98] cursor-pointer"
                    >
                      {testing ? <Loader2 size={17} className="animate-spin" /> : <Bell size={17} />}
                      <span>{testing ? "Disparando nos Dispositivos..." : "Enviar Notificação de Teste Simultânea"}</span>
                    </motion.button>

                    {/* Botão de Permissões */}
                    <button
                      type="button"
                      onClick={() => setShowPermissionModal(true)}
                      className="relative rounded-[6px] border border-[#26262A] bg-[#0B0B0C] hover:bg-[#1B1B1E] hover:border-[#3F3F46] py-3.5 px-5 text-xs sm:text-sm font-bold text-[#CBD5E1] hover:text-white flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-none active:scale-[0.98]"
                    >
                      <Sparkles size={16} className="text-[var(--gm-primary)] relative z-10" />
                      <span className="relative z-10">Permissões de Voz, Câmera e Áudio</span>
                    </button>
                  </div>

                  {/* 5. DICA INFORMATIVA DE COMPATIBILIDADE IPHONE APPLE (iOS) */}
                  <div
                    className="relative rounded-md border border-[#26262A] bg-[#0B0B0C] w-full p-4 flex items-start gap-3.5 text-left shadow-none"
                  >
                    <div className="w-9 h-9 rounded-md bg-[#131315] border border-[#26262A] flex items-center justify-center shrink-0 text-[#F2F2F3] relative z-10">
                      <Apple size={18} />
                    </div>
                    <div className="space-y-0.5 relative z-10">
                      <p className="text-xs sm:text-sm font-black text-[#F2F2F3] uppercase tracking-wide">
                        Compatibilidade com Apple iPhone (iOS)
                      </p>
                      <p className="text-[11px] sm:text-xs text-[#8B8B92] leading-relaxed">
                        No iPhone/iPad (iOS 16.4+), para receber notificações com o app fechado, abra pelo Safari, toque no ícone de <strong className="text-[#CBD5E1]">Compartilhar</strong> (quadrado com seta para cima) e escolha <strong className="text-[#CBD5E1]">"Adicionar à Tela de Início"</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SEÇÃO 7: SONS DO SISTEMA */}
              {openSections.sounds && (
                <div className="gm-settings-card bg-[#131315] border border-[#26262A] p-4 sm:p-6 rounded-lg space-y-6 shadow-none w-full pb-10 animate-in fade-in duration-200">
                  <div className="sticky top-0 z-20 bg-[#0B0B0C] py-2.5 px-3 sm:px-4 border border-[#26262A] flex items-center justify-between mb-3 rounded-md shadow-none">
                    <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-[#F2F2F3] uppercase tracking-wider">
                      <Volume2 className="w-4 h-4 text-[var(--gm-primary)] shrink-0" />
                      <span>SONS DO SISTEMA</span>
                    </span>
                    <span className="text-[11px] font-bold text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2.5 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 whitespace-nowrap">
                      Edição Ativa
                    </span>
                  </div>

                  {/* BLOCO: GALERIA DE EFEITOS SONOROS DE BOTÕES (IPHONE, XIAOMI & GM) */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#26262A]">
                      <div>
                        <div className="flex items-center gap-2">
                          <Smartphone size={18} className="text-[var(--gm-primary)]" />
                          <h4 className="text-sm sm:text-base font-black text-[#F2F2F3] uppercase tracking-wider">
                            Galeria de Efeitos Sonoros de Botões (iPhone & Xiaomi)
                          </h4>
                        </div>
                        <p className="text-xs text-[#8B8B92] mt-1">
                          Escolha o estilo tátil e acústico para cliques em botões, abas e interruptores do app. Sons autênticos de iPhone (iOS Apple), Xiaomi (MIUI / HyperOS) e CardDigital GM.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !uiSoundsEnabled;
                          setUiSoundsEnabled(nextState);
                          setUiSoundMuted(!nextState);
                          if (nextState) {
                            playUiSound("toggle_on");
                          } else {
                            playUiSound("toggle_off");
                          }
                        }}
                        className={`h-9 px-4 rounded-[6px] text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer shrink-0 border ${
                          uiSoundsEnabled
                            ? "bg-[var(--gm-primary)]/15 text-orange-400 border-[var(--gm-primary)]/40"
                            : "bg-[#0B0B0C] text-[#8B8B92] border-[#26262A] hover:bg-[#1B1B1E]"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-[2px] ${
                            uiSoundsEnabled ? "bg-emerald-400" : "bg-[#8B8B92]"
                          }`}
                        />
                        {uiSoundsEnabled ? "Sons Ativados" : "Sons Silenciados"}
                      </button>
                    </div>

                    {/* Filtros por Marca / Categoria */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { id: "all" as const, label: "Todos os Sons", count: BUTTON_SOUND_PRESETS.length },
                        { id: "apple" as const, label: "iPhone (Apple iOS)", count: 4 },
                        { id: "xiaomi" as const, label: "Xiaomi (MIUI / HyperOS)", count: 4 },
                        { id: "gm" as const, label: "CardDigital GM & Minimal", count: 2 },
                      ].map((tab) => {
                        const isCurrent = buttonCategoryFilter === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              setButtonCategoryFilter(tab.id);
                              playUiSound("tab");
                            }}
                            className={`px-3 py-1.5 rounded-[6px] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border ${
                              isCurrent
                                ? "bg-[var(--gm-primary)] text-white border-[var(--gm-primary)]"
                                : "bg-[#0B0B0C] hover:bg-[#1B1B1E] text-[#8B8B92] hover:text-[#CBD5E1] border-[#26262A]"
                            }`}
                          >
                            <span>{tab.label}</span>
                            <span
                              className={`text-[11px] px-1.5 py-0.5 rounded-[4px] font-black tabular-nums ${
                                isCurrent ? "bg-black/30 text-white" : "bg-[#1B1B1E] text-[#8B8B92]"
                              }`}
                            >
                              {tab.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Grade de Efeitos de Botões (Estrutura idêntica à Galeria de Notificações) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {BUTTON_SOUND_PRESETS.filter((p) => {
                        if (buttonCategoryFilter === "all") return true;
                        if (buttonCategoryFilter === "gm") return p.brand === "gm" || p.brand === "minimal";
                        return p.brand === buttonCategoryFilter;
                      }).map((preset) => {
                        const isSelected = activeButtonSound === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            aria-pressed={isSelected}
                            data-selected={isSelected}
                            onClick={() => {
                              localStorage.setItem("gm.buttonSoundPreset", preset.id);
                              setButtonSoundPreset(preset.id);
                              setActiveButtonSound(preset.id);
                              try {
                                previewButtonSoundPreset(preset.id);
                              } catch (e) {}
                            }}
                            className={
                              "flex items-center justify-between p-4 rounded-md border text-left transition-colors cursor-pointer shadow-none " +
                              (isSelected
                                ? "bg-[#1B1B1E] border-[var(--gm-primary)] text-[var(--gm-primary)]"
                                : "bg-[#0B0B0C] border-[#26262A] text-[#CBD5E1] hover:border-[#3F3F46] hover:bg-[#1B1B1E]")
                            }
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={
                                  "w-10 h-10 rounded-md flex items-center justify-center shrink-0 " +
                                  (isSelected
                                    ? "bg-[var(--gm-primary)] text-white"
                                    : "bg-[#131315] border border-[#26262A] text-[#8B8B92]")
                                }
                              >
                                {preset.brand === "apple" ? (
                                  <Smartphone size={18} className={isSelected ? "text-white" : ""} />
                                ) : preset.brand === "xiaomi" ? (
                                  <Sparkles size={18} className={isSelected ? "text-white" : ""} />
                                ) : (
                                  <Volume2 size={18} className={isSelected ? "text-white" : ""} />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold leading-tight text-[#F2F2F3]">
                                    {preset.name}
                                  </h4>
                                  <span className="text-[11px] px-1.5 py-0.5 rounded-[4px] font-bold tracking-wider uppercase bg-[#131315] border border-[#26262A] text-[#8B8B92]">
                                    {preset.brandLabel}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#8B8B92] leading-normal mt-0.5 max-w-[240px]">
                                  {preset.description}
                                </p>
                              </div>
                            </div>

                            <div
                              className={
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 " +
                                (isSelected
                                  ? "border-[var(--gm-primary)]"
                                  : "border-[#3F3F46]")
                              }
                            >
                              {isSelected && (
                                <div className="w-2.5 h-2.5 rounded-full bg-[var(--gm-primary)]" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Faixa de Teste Rápido de Reações Adicionais */}
                    <div className="p-3.5 rounded-md border border-[#26262A] bg-[#0B0B0C] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={15} className="text-[var(--gm-primary)] shrink-0" />
                        <span className="text-xs font-bold text-[#CBD5E1]">
                          Testar Outras Reações do App:
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { id: "success" as const, label: "Sucesso / Salvar" },
                          { id: "toggle_on" as const, label: "Ligar Switch" },
                          { id: "toggle_off" as const, label: "Desligar" },
                          { id: "tab" as const, label: "Troca de Aba" },
                          { id: "delete" as const, label: "Excluir" },
                          { id: "alert" as const, label: "Aviso" },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => playUiSound(item.id)}
                            className="px-2.5 py-1 rounded-[6px] border border-[#26262A] bg-[#131315] hover:bg-[#1B1B1E] hover:border-[#3F3F46] active:scale-95 text-[11px] font-bold text-[#CBD5E1] transition-colors cursor-pointer"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* BLOCO: GALERIA DE SONS AO PASSAR O MOUSE (HOVER & ROLETA DESKTOP) */}
                    <div className="pt-5 border-t border-[#26262A] space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#26262A]">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <MousePointerClick size={18} className="text-[var(--gm-primary)]" />
                            <h4 className="text-sm sm:text-base font-black text-[#F2F2F3] uppercase tracking-wider">
                              Galeria de Sons ao Passar o Mouse (Hover & Roleta Desktop)
                            </h4>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-[4px] bg-[var(--gm-primary)]/10 text-[var(--gm-primary)] border border-[var(--gm-primary)]/25">
                              Desktop Tech
                            </span>
                          </div>
                          <p className="text-xs text-[#8B8B92] mt-1 leading-relaxed">
                            Escolha o estilo sonoro emitido ao passar o mouse sobre botões, abas, links e cards interativos no computador. Sons de roleta mecânica, micro-switch óptico, Xiaomi HyperOS, Apple Taptic e radar futurista.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const next = !hoverSoundEnabled;
                            setHoverSoundEnabled(next);
                            setHoverSoundMuted(!next);
                            if (next) {
                              playTechHoverSound();
                            }
                          }}
                          className={`h-9 px-4 rounded-[6px] text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer shrink-0 border ${
                            hoverSoundEnabled
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/35"
                              : "bg-[#0B0B0C] text-[#8B8B92] border-[#26262A] hover:bg-[#1B1B1E]"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-[2px] ${
                              hoverSoundEnabled ? "bg-emerald-400" : "bg-[#8B8B92]"
                            }`}
                          />
                          {hoverSoundEnabled ? "Hover Ativo" : "Hover Silenciado"}
                        </button>
                      </div>

                      {/* Filtros por Categoria de Hover */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { id: "all" as const, label: "Todos os Sons", count: HOVER_SOUND_PRESETS.length },
                          { id: "cyber" as const, label: "Roleta & Cyberpunk", count: 2 },
                          { id: "clean" as const, label: "Minimal & Óptico", count: 2 },
                          { id: "brands" as const, label: "Marcas (Xiaomi & Apple)", count: 2 },
                        ].map((tab) => {
                          const isCurrent = hoverCategoryFilter === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => {
                                setHoverCategoryFilter(tab.id);
                                playUiSound("tab");
                              }}
                              className={`px-3 py-1.5 rounded-[6px] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border ${
                                isCurrent
                                  ? "bg-[var(--gm-primary)] text-white border-[var(--gm-primary)]"
                                  : "bg-[#0B0B0C] hover:bg-[#1B1B1E] text-[#8B8B92] hover:text-[#CBD5E1] border-[#26262A]"
                              }`}
                            >
                              <span>{tab.label}</span>
                              <span
                                className={`text-[11px] px-1.5 py-0.5 rounded-[4px] font-black tabular-nums ${
                                  isCurrent ? "bg-black/30 text-white" : "bg-[#1B1B1E] text-[#8B8B92]"
                                }`}
                              >
                                {tab.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Grade de Efeitos de Hover */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {HOVER_SOUND_PRESETS.filter((p) => {
                          if (hoverCategoryFilter === "all") return true;
                          if (hoverCategoryFilter === "cyber") return p.id === "roulette_cyber" || p.id === "radar_neon";
                          if (hoverCategoryFilter === "clean") return p.id === "optic_tick" || p.id === "scifi_pip";
                          if (hoverCategoryFilter === "brands") return p.id === "xiaomi_bubble_hover" || p.id === "apple_taptic_air";
                          return true;
                        }).map((preset) => {
                          const isSelected = activeHoverSound === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              aria-pressed={isSelected}
                              data-selected={isSelected}
                              onClick={() => {
                                localStorage.setItem("gm.hoverSoundPreset", preset.id);
                                setHoverSoundPreset(preset.id);
                                setActiveHoverSound(preset.id);
                                try {
                                  previewHoverSoundPreset(preset.id);
                                } catch (e) {}
                              }}
                              className={
                                "flex items-center justify-between p-4 rounded-md border text-left transition-colors cursor-pointer shadow-none " +
                                (isSelected
                                  ? "bg-[#1B1B1E] border-[var(--gm-primary)] text-[var(--gm-primary)]"
                                  : "bg-[#0B0B0C] border-[#26262A] text-[#CBD5E1] hover:border-[#3F3F46] hover:bg-[#1B1B1E]")
                              }
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={
                                    "w-10 h-10 rounded-md flex items-center justify-center shrink-0 " +
                                    (isSelected
                                      ? "bg-[var(--gm-primary)] text-white"
                                      : "bg-[#131315] border border-[#26262A] text-[#8B8B92]")
                                  }
                                >
                                  {preset.id.includes("apple") ? (
                                    <Smartphone size={18} className={isSelected ? "text-white" : ""} />
                                  ) : preset.id.includes("xiaomi") ? (
                                    <Sparkles size={18} className={isSelected ? "text-white" : ""} />
                                  ) : preset.id.includes("radar") ? (
                                    <Volume2 size={18} className={isSelected ? "text-white" : ""} />
                                  ) : (
                                    <MousePointerClick size={18} className={isSelected ? "text-white" : ""} />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-bold leading-tight text-[#F2F2F3]">
                                      {preset.name}
                                    </h4>
                                    <span className="text-[11px] px-1.5 py-0.5 rounded-[4px] font-bold tracking-wider uppercase bg-[#131315] border border-[#26262A] text-[#8B8B92]">
                                      {preset.brandLabel}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[#8B8B92] leading-normal mt-0.5 max-w-[240px]">
                                    {preset.description}
                                  </p>
                                </div>
                              </div>

                              <div
                                className={
                                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 " +
                                  (isSelected
                                    ? "border-[var(--gm-primary)]"
                                    : "border-[#3F3F46]")
                                }
                              >
                                {isSelected && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--gm-primary)]" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Demonstração Interativa do Som de Roleta Selecionado */}
                      <div className="p-3.5 rounded-md border border-[#26262A] bg-[#0B0B0C] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Sparkles size={15} className="text-cyan-400 shrink-0" />
                          <span className="text-xs font-bold text-[#CBD5E1]">
                            Demonstração do Efeito de Hover Selecionado:
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              // Sequência simulando uma roleta girando com o preset ativo
                              [0, 35, 75, 120, 175, 240, 320].forEach((delay) => {
                                setTimeout(() => previewHoverSoundPreset(activeHoverSound), delay);
                              });
                            }}
                            className="px-3 py-1.5 rounded-[6px] border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-bold text-cyan-300 transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                          >
                            <span>Girar Roleta ({HOVER_SOUND_PRESETS.find(p => p.id === activeHoverSound)?.name || "Tech"})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => previewHoverSoundPreset(activeHoverSound)}
                            className="px-3 py-1.5 rounded-[6px] border border-[#26262A] bg-[#131315] hover:bg-[#1B1B1E] text-xs font-bold text-[#CBD5E1] transition-colors cursor-pointer active:scale-95"
                          >
                            <span>Disparo Único</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* BLOCO: GALERIA DE SONS DE DIGITAÇÃO TECH FUTURISTA (OPERA GX & MECÂNICOS) */}
                    <div className="pt-5 border-t border-[#26262A] space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#26262A]">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Keyboard size={18} className="text-[var(--gm-primary)]" />
                            <h4 className="text-sm sm:text-base font-black text-[#F2F2F3] uppercase tracking-wider">
                              Galeria de Sons de Digitação Tech (Estilo Opera GX)
                            </h4>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-[4px] bg-orange-500/10 text-orange-400 border border-orange-500/20">
                              Cyberpunk FX
                            </span>
                          </div>
                          <p className="text-xs text-[#8B8B92] mt-1 leading-relaxed">
                            Escolha o timbre acústico para digitação nos campos do sistema. Perfis como Opera GX original, switches Cherry MX Blue, Linear lubrificado (Thock), Máquina de Escrever mecânica, Terminal Matrix e Apple Magic Keyboard.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const next = !typingSoundEnabled;
                            setTypingSoundEnabled(next);
                            setTypingSoundMuted(!next);
                            if (next) {
                              playOperaGxTypingSound("enter");
                            }
                          }}
                          className={`h-9 px-4 rounded-[6px] text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer shrink-0 border ${
                            typingSoundEnabled
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/35"
                              : "bg-[#0B0B0C] text-[#8B8B92] border-[#26262A] hover:bg-[#1B1B1E]"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-[2px] ${
                              typingSoundEnabled ? "bg-emerald-400" : "bg-[#8B8B92]"
                            }`}
                          />
                          {typingSoundEnabled ? "Digitação Ativa" : "Digitação Silenciada"}
                        </button>
                      </div>

                      {/* Filtros por Categoria de Digitação */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { id: "all" as const, label: "Todos os Teclados", count: TYPING_SOUND_PRESETS.length },
                          { id: "gaming" as const, label: "Opera GX & Cyber", count: 2 },
                          { id: "mechanical" as const, label: "Mecânicos & Thock", count: 2 },
                          { id: "classic" as const, label: "Máquina & Apple", count: 2 },
                        ].map((tab) => {
                          const isCurrent = typingCategoryFilter === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => {
                                setTypingCategoryFilter(tab.id);
                                playUiSound("tab");
                              }}
                              className={`px-3 py-1.5 rounded-[6px] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border ${
                                isCurrent
                                  ? "bg-[var(--gm-primary)] text-white border-[var(--gm-primary)]"
                                  : "bg-[#0B0B0C] hover:bg-[#1B1B1E] text-[#8B8B92] hover:text-[#CBD5E1] border-[#26262A]"
                              }`}
                            >
                              <span>{tab.label}</span>
                              <span
                                className={`text-[11px] px-1.5 py-0.5 rounded-[4px] font-black tabular-nums ${
                                  isCurrent ? "bg-black/30 text-white" : "bg-[#1B1B1E] text-[#8B8B92]"
                                }`}
                              >
                                {tab.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Grade de Efeitos de Digitação */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {TYPING_SOUND_PRESETS.filter((p) => {
                          if (typingCategoryFilter === "all") return true;
                          if (typingCategoryFilter === "gaming") return p.brand === "opera" || p.brand === "cyber";
                          if (typingCategoryFilter === "mechanical") return p.brand === "mechanical";
                          if (typingCategoryFilter === "classic") return p.brand === "vintage" || p.brand === "apple";
                          return true;
                        }).map((preset) => {
                          const isSelected = activeTypingSound === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              aria-pressed={isSelected}
                              data-selected={isSelected}
                              onClick={() => {
                                localStorage.setItem("gm.typingSoundPreset", preset.id);
                                setTypingSoundPreset(preset.id);
                                setActiveTypingSound(preset.id);
                                try {
                                  previewTypingSoundPreset(preset.id, "enter");
                                } catch (e) {}
                              }}
                              className={
                                "flex items-center justify-between p-4 rounded-md border text-left transition-colors cursor-pointer shadow-none " +
                                (isSelected
                                  ? "bg-[#1B1B1E] border-[var(--gm-primary)] text-[var(--gm-primary)]"
                                  : "bg-[#0B0B0C] border-[#26262A] text-[#CBD5E1] hover:border-[#3F3F46] hover:bg-[#1B1B1E]")
                              }
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={
                                    "w-10 h-10 rounded-md flex items-center justify-center shrink-0 " +
                                    (isSelected
                                      ? "bg-[var(--gm-primary)] text-white"
                                      : "bg-[#131315] border border-[#26262A] text-[#8B8B92]")
                                  }
                                >
                                  {preset.id.includes("opera") ? (
                                    <Sparkles size={18} className={isSelected ? "text-white" : ""} />
                                  ) : preset.id.includes("apple") ? (
                                    <Smartphone size={18} className={isSelected ? "text-white" : ""} />
                                  ) : (
                                    <Keyboard size={18} className={isSelected ? "text-white" : ""} />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-bold leading-tight text-[#F2F2F3]">
                                      {preset.name}
                                    </h4>
                                    <span className="text-[11px] px-1.5 py-0.5 rounded-[4px] font-bold tracking-wider uppercase bg-[#131315] border border-[#26262A] text-[#8B8B92]">
                                      {preset.brandLabel}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[#8B8B92] leading-normal mt-0.5 max-w-[240px]">
                                    {preset.description}
                                  </p>
                                </div>
                              </div>

                              <div
                                className={
                                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 " +
                                  (isSelected
                                    ? "border-[var(--gm-primary)]"
                                    : "border-[#3F3F46]")
                                }
                              >
                                {isSelected && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--gm-primary)]" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Campo Interativo para Testar Digitação ao Vivo */}
                      <div className="p-3.5 rounded-md border border-[#26262A] bg-[#0B0B0C] space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <label className="text-xs font-bold text-[#CBD5E1] flex items-center gap-2 flex-wrap">
                            <span>Teste ao Vivo: Digite no campo abaixo</span>
                            <span className="text-[11px] font-semibold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-[4px] border border-orange-500/20">
                              Perfil: {TYPING_SOUND_PRESETS.find(p => p.id === activeTypingSound)?.name || "Ativo"}
                            </span>
                          </label>
                          <span className="text-[11px] text-[#8B8B92]">
                            Pressione teclas, Espaço, Enter ou Backspace
                          </span>
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            value={testTypingText}
                            onChange={(e) => setTestTypingText(e.target.value)}
                            placeholder="Digite aqui para escutar o perfil sonoro de teclado ativo..."
                            className="w-full h-11 px-3.5 rounded-[6px] border border-[#26262A] bg-[#131315] text-sm font-medium text-[#F2F2F3] placeholder:text-[#8B8B92] focus:outline-none focus:border-[var(--gm-primary)] transition-colors"
                          />
                          {testTypingText && (
                            <button
                              type="button"
                              onClick={() => {
                                setTestTypingText("");
                                playOperaGxTypingSound("backspace");
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#CBD5E1] hover:text-white px-2.5 py-1 rounded-[4px] bg-[#1B1B1E] border border-[#26262A] cursor-pointer"
                            >
                              Limpar
                            </button>
                          )}
                        </div>

                        {/* Botões Rápidos de Amostra das Teclas para o Perfil Ativo */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[11px] font-bold text-[#8B8B92] mr-1">
                            Amostras:
                          </span>
                          <button
                            type="button"
                            onClick={() => previewTypingSoundPreset(activeTypingSound, "key")}
                            className="px-2.5 py-1 rounded-[6px] border border-[#26262A] bg-[#131315] hover:bg-[#1B1B1E] hover:border-[#3F3F46] text-[11px] font-bold text-[#CBD5E1] transition-colors cursor-pointer active:scale-95"
                          >
                            Tecla Regular
                          </button>
                          <button
                            type="button"
                            onClick={() => previewTypingSoundPreset(activeTypingSound, "space")}
                            className="px-2.5 py-1 rounded-[6px] border border-[#26262A] bg-[#131315] hover:bg-[#1B1B1E] hover:border-[#3F3F46] text-[11px] font-bold text-[#CBD5E1] transition-colors cursor-pointer active:scale-95"
                          >
                            Barra de Espaço (Sub-Grave)
                          </button>
                          <button
                            type="button"
                            onClick={() => previewTypingSoundPreset(activeTypingSound, "enter")}
                            className="px-2.5 py-1 rounded-[6px] border border-[#26262A] bg-[#131315] hover:bg-[#1B1B1E] hover:border-[#3F3F46] text-[11px] font-bold text-[#CBD5E1] transition-colors cursor-pointer active:scale-95"
                          >
                            Enter (Confirmação)
                          </button>
                          <button
                            type="button"
                            onClick={() => previewTypingSoundPreset(activeTypingSound, "backspace")}
                            className="px-2.5 py-1 rounded-[6px] border border-[#26262A] bg-[#131315] hover:bg-[#1B1B1E] hover:border-[#3F3F46] text-[11px] font-bold text-[#CBD5E1] transition-colors cursor-pointer active:scale-95"
                          >
                            Backspace (Apagar)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SEPARADOR E TÍTULO DA GALERIA DE NOTIFICAÇÕES */}
                  <div className="pt-4 border-t border-[#26262A]">
                    <div className="flex items-center gap-2 mb-1">
                      <Music size={18} className="text-[var(--gm-primary)]" />
                      <h4 className="text-sm sm:text-base font-black text-[#F2F2F3] uppercase tracking-wider">
                        Toques de Notificações & Alarmes
                      </h4>
                    </div>
                    <p className="text-xs text-[#8B8B92] leading-relaxed">
                      Escolha o toque de sua preferência para alarmes, notificações e confirmações no aplicativo. Clique para escutar uma demonstração instantânea.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {NOTIFICATION_SOUNDS.map((sound) => {
                      const isSelected = activeSound === sound.id;
                      return (
                        <button
                          key={sound.id}
                          type="button"
                          aria-pressed={isSelected}
                          data-selected={isSelected}
                          onClick={() => {
                            localStorage.setItem("gm.notificationSound", sound.id);
                            setActiveSound(sound.id);
                            try {
                              playNotificationSound(sound.id);
                            } catch (e) {}
                          }}
                          className={"flex items-center justify-between p-4 rounded-md border text-left transition-colors cursor-pointer shadow-none " + (isSelected ? "bg-[#1B1B1E] border-[var(--gm-primary)] text-[var(--gm-primary)]" : "bg-[#0B0B0C] border-[#26262A] text-[#CBD5E1] hover:border-[#3F3F46] hover:bg-[#1B1B1E]")}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={"w-10 h-10 rounded-md flex items-center justify-center shrink-0 " + (isSelected ? "bg-[var(--gm-primary)] text-white" : "bg-[#131315] border border-[#26262A] text-[#8B8B92]")}
                            >
                              <Music size={18} className={isSelected ? "text-white" : ""} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold leading-tight text-[#F2F2F3]">{sound.name}</h4>
                              <p className="text-[11px] text-[#8B8B92] leading-normal mt-0.5 max-w-[240px]">{sound.description}</p>
                            </div>
                          </div>

                          <div
                            className={"w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 " + (isSelected ? "border-[var(--gm-primary)]" : "border-[#3F3F46]")}
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
                <div className="gm-settings-card bg-[#131315] border border-[#26262A] p-4 sm:p-6 rounded-lg space-y-6 shadow-none w-full pb-10 animate-in fade-in duration-200">
                  <div className="sticky top-0 z-20 bg-[#0B0B0C] py-2.5 px-3 sm:px-4 border border-[#26262A] flex items-center justify-between mb-3 rounded-md shadow-none">
                    <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-[#F2F2F3] uppercase tracking-wider">
                      <HelpCircle className="w-4 h-4 text-[var(--gm-primary)] shrink-0" />
                      <span>TUTORIAL & SUPORTE</span>
                    </span>
                    <span className="text-[11px] font-bold text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2.5 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 whitespace-nowrap">
                      Edição Ativa
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto py-4">
                    <div className="w-14 h-14 rounded-md bg-[var(--gm-primary)]/10 text-[var(--gm-primary)] flex items-center justify-center mb-4 border border-[var(--gm-primary)]/25">
                      <Sparkles size={28} />
                    </div>
                    <h4 className="text-lg font-bold text-[#F2F2F3] mb-2">
                      Passo a Passo Interativo
                    </h4>
                    <p className="text-xs text-[#8B8B92] leading-relaxed mb-6">
                      Deseja reiniciar o assistente virtual de onboarding para rever todas as funcionalidades e ferramentas do aplicativo?
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem("gm.tutorialCompleted");
                        localStorage.setItem("gm.tutorialForceStart", "true");
                        navigate("/");
                      }}
                      className="gm-btn py-3 px-6 rounded-[6px] flex items-center justify-center gap-2 text-xs font-bold w-full transition-colors active:scale-[0.98]"
                    >
                      <Sparkles size={16} />
                      Iniciar Tutorial do App
                    </button>
                  </div>
                </div>
              )}

              {/* SEÇÃO 9: SEGURANÇA & PIN */}
              {openSections.security && (
                <div className="gm-settings-card bg-[#131315] border border-[#26262A] p-4 sm:p-6 rounded-lg space-y-6 shadow-none w-full pb-10 animate-in fade-in duration-200">
                  <div className="sticky top-0 z-20 bg-[#0B0B0C] py-2.5 px-3 sm:px-4 border border-[#26262A] flex items-center justify-between mb-3 rounded-md shadow-none">
                    <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-[#F2F2F3] uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4 text-[var(--gm-primary)] shrink-0" />
                      <span>SEGURANÇA & PIN DO DISPOSITIVO</span>
                    </span>
                    <span className="text-[11px] font-bold text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2.5 py-0.5 rounded-[4px] border border-[var(--gm-primary)]/25 whitespace-nowrap">
                      PIN & Sessões Ativas
                    </span>
                  </div>

                  <SecurityPinSettings />

                  <div className="pt-2 border-t border-[#26262A]">
                    <DatabasePermissionsCard />
                  </div>
                </div>
              )}

              {/* SEÇÃO 10: GERADOR DE QR CODE */}
              {openSections.qrcode && (
                <div className="w-full animate-in fade-in duration-200 mt-5 sm:mt-6">
                  <SmartQrCodeGenerator />
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* BOTÃO FLUTUANTE "SALVAR" NO CANTO INFERIOR DIREITO DA TELA DO APP */}
      <div 
        className="fixed bottom-[calc(var(--bottom-nav-height,96px)+16px)] md:bottom-7 right-4 md:right-7 z-[10002] select-none pointer-events-auto flex items-center gap-3"
      >
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 16 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 16 }}
              className="flex items-center gap-2 text-[var(--gm-primary,#FE540B)] bg-[#131315] border border-[var(--gm-primary,#FE540B)]/40 px-3.5 py-2 rounded-md text-xs font-black shadow-lg"
            >
              <CheckCircle2 size={16} className="text-[var(--gm-primary,#FE540B)]" />
              <span>Configurações Salvas!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative group flex items-center">
          <span className="absolute right-[calc(100%+12px)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-[#131315] text-[#F2F2F3] text-xs font-extrabold px-3 py-1.5 rounded-md shadow-lg whitespace-nowrap pointer-events-none border border-[#26262A] z-30">
            {saving ? "Salvando..." : "Salvar Configurações"}
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="gm-floating-save-btn !p-0 w-12 h-12 md:w-14 md:h-14 hover:brightness-110 active:translate-y-0.5 text-white rounded-lg flex items-center justify-center transition-all duration-150 disabled:opacity-50 border border-[#26262A] cursor-pointer outline-none shadow-lg"
            style={{
              backgroundColor: "var(--gm-primary, #FE540B)"
            }}
            title="Salvar todas as alterações de configurações"
          >
            {saving ? (
              <Loader2 className="w-6 h-6 animate-spin text-white shrink-0" />
            ) : saveSuccess ? (
              <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
            ) : (
              <Save className="w-6 h-6 text-white shrink-0" />
            )}
          </button>
        </div>
      </div>

      <SmartphonePermissionModal
        forceOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
      />

      <NotificationCheckinModal
        isOpen={showCheckinModal}
        onClose={() => setShowCheckinModal(false)}
      />
    </Page>
  );
}
