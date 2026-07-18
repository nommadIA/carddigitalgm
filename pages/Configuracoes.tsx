// pages/Configuracoes.tsx
import React, { useEffect, useMemo, useState } from "react";
import Select from "../components/ui/Select";
import { Page } from "../components/ui/Page";
import { Card } from "../components/ui/Card";
import { ScaleSlider } from "../components/ScaleSlider";
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
  Volume2,
  VolumeX,
  Music,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSwipeNav } from "../hooks/useSwipeNav";
import { playNotificationSound, NOTIFICATION_SOUNDS } from "../lib/audio";

type Fit = "cover" | "contain";

const TIMBRADO_MODEL_URL =
  "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/Modelo%20Timbrado/TIMBRADO%20GABARITO.png";

import imageCompression from "browser-image-compression";

export default function Configuracoes() {
  const { tenantId, user } = useAuth();
  const navigate = useNavigate();

  const [activeSound, setActiveSound] = useState(() => {
    return localStorage.getItem("gm.notificationSound") || "classic_chord";
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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

  const [brandPrimary, setBrandPrimary] = useState("#32BCAD");
  const [brandAccent, setBrandAccent] = useState("#32BCAD");
  const [brandBg, setBrandBg] = useState("#0f1117");
  const [brandTitle, setBrandTitle] = useState("#FFFFFF");
  const [brandSubtitle, setBrandSubtitle] = useState("#94A3B8");
  const [brandIcon, setBrandIcon] = useState("#32BCAD");

  // Cores independentes do Menu / Barra Lateral
  const [menuPrimary, setMenuPrimary] = useState("#32BCAD");
  const [menuBg, setMenuBg] = useState("#0f1117");
  const [menuTitle, setMenuTitle] = useState("#FFFFFF");
  const [menuSubtitle, setMenuSubtitle] = useState("#94A3B8");
  const [menuIcon, setMenuIcon] = useState("#32BCAD");
  const [menuButton, setMenuButton] = useState("#32BCAD");

  const [fontFamily, setFontFamily] = useState("Inter");
  const [previewFont, setPreviewFont] = useState<string | null>(null);
  const [buttonStyle, setButtonStyle] = useState("solid");

  const [isLightMode, setIsLightMode] = useState(() => localStorage.getItem("theme") === "light");

  useEffect(() => {
    const handleThemeChange = () => {
      const light = localStorage.getItem("theme") === "light";
      if (light !== isLightMode) {
        setIsLightMode(light);
      }
    };
    const interval = setInterval(handleThemeChange, 500);
    return () => clearInterval(interval);
  }, [isLightMode]);

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
            setBrandPrimary(savedDark?.primary || s.brand_primary || "#32BCAD");
            setBrandAccent(savedDark?.accent || s.brand_accent || "#32BCAD");
            setBrandBg(savedDark?.bg || s.brand_bg || "#0f1117");
            setBrandTitle(savedDark?.title || "#FFFFFF");
            setBrandSubtitle(savedDark?.subtitle || "#94A3B8");
            setBrandIcon(savedDark?.icon || s.brand_accent || "#32BCAD");

            setMenuPrimary(savedDark?.menu_primary || s.brand_primary || "#32BCAD");
            setMenuBg(savedDark?.menu_bg || s.brand_bg || "#0f1117");
            setMenuTitle(savedDark?.menu_title || "#FFFFFF");
            setMenuSubtitle(savedDark?.menu_subtitle || "#94A3B8");
            setMenuIcon(savedDark?.menu_icon || s.brand_accent || "#32BCAD");
            setMenuButton(savedDark?.menu_button || s.brand_accent || "#32BCAD");
          }
        }
      } catch (err) {}
    };
    if (tenantId) {
      syncCurrentColors();
    }
  }, [isLightMode, tenantId]);

  // Aplica as cores em tempo real no DOM ao alterar nas configurações
  useEffect(() => {
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
          button_style: buttonStyle,
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
    buttonStyle,
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

  // ✅ Desabilita rolagem vertical na página de configurações (Smartphone)
  useEffect(() => {
    const mainEl = document.querySelector(".gm-main") as HTMLElement;
    if (viewMode === "smartphone") {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      if (mainEl) mainEl.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      if (mainEl) mainEl.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      if (mainEl) mainEl.style.overflow = "";
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
    setLoading(true);
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
          setBrandPrimary(savedDark?.primary || s.brand_primary || "#32BCAD");
          setBrandAccent(savedDark?.accent || s.brand_accent || "#32BCAD");
          setBrandBg(savedDark?.bg || s.brand_bg || "#0f1117");
          setBrandTitle(savedDark?.title || "#FFFFFF");
          setBrandSubtitle(savedDark?.subtitle || "#94A3B8");
          setBrandIcon(savedDark?.icon || s.brand_accent || "#32BCAD");

          setMenuPrimary(savedDark?.menu_primary || s.brand_primary || "#32BCAD");
          setMenuBg(savedDark?.menu_bg || s.brand_bg || "#0f1117");
          setMenuTitle(savedDark?.menu_title || "#FFFFFF");
          setMenuSubtitle(savedDark?.menu_subtitle || "#94A3B8");
          setMenuIcon(savedDark?.menu_icon || s.brand_accent || "#32BCAD");
          setMenuButton(savedDark?.menu_button || s.brand_accent || "#32BCAD");
        }
        
        setFontFamily(s.font_family || "Inter");
        setButtonStyle(
          s.button_style ||
            localStorage.getItem("gm_button_style_fallback") ||
            "solid",
        );

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

        button_style: buttonStyle,
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

  async function onUploadLogo(file: File) {
    if (!tenantId) return;
    setUploadingLogo(true);
    try {
      const url = await uploadTenantAsset(tenantId, file, "logo");
      setCompanyLogoUrl(url);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function onUploadAvatar(file: File) {
    if (!tenantId) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadTenantAsset(tenantId, file, "avatar");
      setAvatarUrl(url);
    } finally {
      setUploadingAvatar(false);
    }
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
      bg: "#0F172A",
      foreground: "#0f172a",
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
    { id: "solid", name: "Sólido" },
    { id: "neon", name: "Neon Jateado" },
  ];

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
            className="gm-btn w-auto justify-center !h-10 !px-6 !text-sm !rounded-xl !bg-gradient-to-r !from-green-500 !to-emerald-600 !text-white hover:!from-green-600 hover:!to-emerald-700 disabled:!opacity-50 transition-all font-extrabold active:scale-95 shadow-[0_4px_14px_rgba(34,197,94,0.4)] hover:shadow-[0_6px_20px_rgba(34,197,94,0.6)] flex items-center gap-2 border-none"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Salvar</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <div
        className={`flex flex-col ${viewMode === "smartphone" ? "h-[calc(100dvh-180px)] md:h-[calc(100dvh-170px)]" : ""}`}
      >
        {/* CONTENT */}
        <div
          className={`flex-1 ${viewMode === "desktop" ? "pb-24" : "overflow-hidden"} p-0 md:p-6 lg:p-8 glass-scrollbar`}
        >
          {loading ? (
            <Card className="text-center p-10">Carregando...</Card>
          ) : (viewMode as any) === "desktop" ? (
            <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 pb-6 items-stretch">
              {/* ROW 1 */}
              <div className="flex flex-col h-full">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Palette size={20} className="text-[var(--gm-primary)]" />{" "}
                  Personalização
                </h2>
                <Card className="flex flex-col flex-1 border border-black/10 dark:border-white/10 shadow-sm rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md transition-all duration-300 py-6 px-6 relative overflow-hidden group">
                  <div className="flex flex-col gap-8 h-full flex-1">
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <div className="w-32 h-32 rounded-2xl bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden flex items-center justify-center relative shrink-0">
                        {uploadingLogo ? (
                          <Loader2
                            size={32}
                            className="animate-spin text-slate-400"
                          />
                        ) : companyLogoUrl ? (
                          <img
                            src={companyLogoUrl}
                            alt="Logo"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <ImageIcon
                            size={32}
                            className="opacity-50 text-slate-400"
                          />
                        )}
                      </div>
                      <label
                        className={`gm-btn w-full max-w-xs py-2 flex items-center justify-center gap-2 cursor-pointer ${uploadingLogo ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        {uploadingLogo ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <FileImage size={16} />
                        )}
                        {uploadingLogo ? "Enviando..." : "Alterar Logo"}
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

                    <div className="h-px bg-slate-200 dark:bg-slate-700 w-full shrink-0"></div>

                    <div className="space-y-4 flex-1 flex flex-col justify-center">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)]">
                          Nome da empresa
                        </label>
                        <input
                          className="gm-input py-2 text-sm h-10 w-full"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-4">
                        {viewMode === "desktop" && (
                          <div className="space-y-1.5">
                            <label className="text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)] flex items-center gap-2">
                              <Monitor size={14} /> Escala Desktop
                            </label>
                            <ScaleSlider
                              value={appScale}
                              onChange={setAppScale}
                            />
                          </div>
                        )}
                        {viewMode === "smartphone" && (
                          <div className="space-y-1.5">
                            <label className="text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)] flex items-center gap-2">
                              <Smartphone size={14} /> Escala Smartphone
                            </label>
                            <ScaleSlider
                              value={mobileScale}
                              onChange={setMobileScale}
                              isMobile
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="h-px bg-slate-200 dark:bg-slate-700 w-full shrink-0"></div>

                    <div className="flex-1 flex flex-col justify-center">
                      <label className="text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-3 block">
                        Misturador de Cores
                      </label>

                      {/* INDICADOR DE MODO DO MISTURADOR DE CORES */}
                      <div className={`mb-3.5 p-3 rounded-xl border flex items-start gap-2.5 ${
                        isLightMode 
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300" 
                          : "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-300"
                      }`}>
                        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 animate-pulse ${
                          isLightMode ? "bg-amber-500" : "bg-blue-400"
                        }`} />
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase tracking-wider">
                            {isLightMode 
                              ? "Modo Claro Ativo" 
                              : "Modo Escuro Ativo"
                            }
                          </span>
                          <span className="text-[10px] leading-relaxed opacity-90">
                            {isLightMode
                              ? "Você está configurando as cores exclusivas para o Modo Claro. Ao salvar, as preferências deste modo serão aplicadas separadamente do modo escuro."
                              : "Você está configurando as cores exclusivas para o Modo Escuro. Ao salvar, as preferências deste modo serão aplicadas separadamente do modo claro."
                            }
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Cor Principal */}
                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                            <input
                              type="color"
                              value={brandPrimary}
                              onChange={(e) => setBrandPrimary(e.target.value)}
                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold leading-tight truncate">
                              Cor Principal
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                              {brandPrimary}
                            </div>
                          </div>
                        </div>

                        {/* Cor de Fundo */}
                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                            <input
                              type="color"
                              value={brandBg}
                              onChange={(e) => setBrandBg(e.target.value)}
                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold leading-tight truncate">
                              Cor de Fundo
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                              {brandBg}
                            </div>
                          </div>
                        </div>

                        {/* Cor dos Títulos */}
                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                            <input
                              type="color"
                              value={brandTitle}
                              onChange={(e) => setBrandTitle(e.target.value)}
                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold leading-tight truncate">
                              Cor dos Títulos
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                              {brandTitle}
                            </div>
                          </div>
                        </div>

                        {/* Cor dos Subtítulos */}
                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                            <input
                              type="color"
                              value={brandSubtitle}
                              onChange={(e) => setBrandSubtitle(e.target.value)}
                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold leading-tight truncate">
                              Cor dos Subtítulos
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                              {brandSubtitle}
                            </div>
                          </div>
                        </div>

                        {/* Cor dos Ícones */}
                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                            <input
                              type="color"
                              value={brandIcon}
                              onChange={(e) => setBrandIcon(e.target.value)}
                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold leading-tight truncate">
                              Cor dos Ícones
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                              {brandIcon}
                            </div>
                          </div>
                        </div>

                        {/* Cor dos Botões */}
                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                            <input
                              type="color"
                              value={brandAccent}
                              onChange={(e) => setBrandAccent(e.target.value)}
                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold leading-tight truncate">
                              Cor dos Botões
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                              {brandAccent}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex flex-col h-full">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Paintbrush size={20} className="text-[var(--gm-primary)]" />{" "}
                  Cores & Fonte
                </h2>
                <Card className="flex flex-col flex-1 border border-black/10 dark:border-white/10 shadow-sm rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md transition-all duration-300 py-6 px-6 relative overflow-hidden group">
                  <div className="flex flex-col gap-8 h-full flex-1">
                    <div className="flex-1 flex flex-col justify-center">
                      <label className="text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-3 block">
                        Estilo dos Botões
                      </label>
                      <div className="flex flex-col gap-3">
                        {BUTTON_STYLES.map((s) => {
                          const isActive = buttonStyle === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setButtonStyle(s.id)}
                              className={`flex flex-col items-center justify-between p-4 rounded-xl border-2 transition-all h-28 shadow-sm hover:shadow-md ${
                                isActive
                                  ? "border-[var(--gm-primary)] bg-[var(--gm-primary-10)]"
                                  : "border-slate-200 dark:border-slate-700/60 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800"
                              }`}
                            >
                              <div
                                className={`w-full py-3 text-sm font-bold rounded-xl flex items-center justify-center ${
                                  s.id === "solid"
                                    ? "bg-[var(--gm-primary)] text-white"
                                    : "bg-transparent border border-[var(--gm-primary)] text-[var(--gm-primary)]"
                                }`}
                              >
                                Preview
                              </div>
                              <span
                                className={`text-xs font-bold uppercase tracking-wider ${isActive ? "text-[var(--gm-primary)]" : "text-slate-500"}`}
                              >
                                {s.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="h-px bg-slate-200 dark:bg-slate-700 w-full shrink-0"></div>

                    <div className="flex-1 flex flex-col justify-center">
                      <label className="text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-3 block">
                        Família de Fonte
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          "Inter",
                          "Roboto",
                          "Montserrat",
                          "Open Sans",
                          "Raleway",
                          "Funnel Display",
                          "Plus Jakarta Sans",
                          "Hubot Sans",
                        ].map((font) => {
                          const isActive = fontFamily === font;
                          return (
                            <button
                              key={font}
                              type="button"
                              onClick={() => setFontFamily(font)}
                              onMouseEnter={() => setPreviewFont(font)}
                              onMouseLeave={() => setPreviewFont(null)}
                              onTouchStart={() => setPreviewFont(font)}
                              onTouchEnd={() => setPreviewFont(null)}
                              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all h-12 shadow-sm hover:shadow ${
                                isActive
                                  ? "border-[var(--gm-primary)] bg-[var(--gm-primary-10)]"
                                  : "border-slate-200 dark:border-slate-700/60 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800"
                              }`}
                              style={{ fontFamily: font }}
                            >
                              <span
                                className={`text-sm font-medium ${isActive ? "text-[var(--gm-primary)] font-bold" : "text-slate-700 dark:text-slate-300"}`}
                              >
                                {font}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="h-px bg-slate-200 dark:bg-slate-700 w-full shrink-0"></div>

                    <div className="flex-1 flex flex-col justify-center">
                      <label className="text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-3 block">
                        Misturador de Cores do Menu (Barra Lateral)
                      </label>

                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Cor Principal */}
                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                            <input
                              type="color"
                              value={menuPrimary}
                              onChange={(e) => setMenuPrimary(e.target.value)}
                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold leading-tight truncate">
                              Cor Principal
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                              {menuPrimary}
                            </div>
                          </div>
                        </div>

                        {/* Cor de Fundo */}
                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                            <input
                              type="color"
                              value={menuBg}
                              onChange={(e) => setMenuBg(e.target.value)}
                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold leading-tight truncate">
                              Cor de Fundo
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                              {menuBg}
                            </div>
                          </div>
                        </div>

                        {/* Cor dos Títulos */}
                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                            <input
                              type="color"
                              value={menuTitle}
                              onChange={(e) => setMenuTitle(e.target.value)}
                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold leading-tight truncate">
                              Cor dos Títulos
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                              {menuTitle}
                            </div>
                          </div>
                        </div>

                        {/* Duas Legendas */}
                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                            <input
                              type="color"
                              value={menuSubtitle}
                              onChange={(e) => setMenuSubtitle(e.target.value)}
                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold leading-tight truncate">
                              Duas Legendas
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                              {menuSubtitle}
                            </div>
                          </div>
                        </div>

                        {/* Cor dos Ícones */}
                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                            <input
                              type="color"
                              value={menuIcon}
                              onChange={(e) => setMenuIcon(e.target.value)}
                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold leading-tight truncate">
                              Cor dos Ícones
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                              {menuIcon}
                            </div>
                          </div>
                        </div>

                        {/* Cor dos Botões */}
                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                            <input
                              type="color"
                              value={menuButton}
                              onChange={(e) => setMenuButton(e.target.value)}
                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold leading-tight truncate">
                              Cor dos Botões
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                              {menuButton}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* ROW 2 */}
              <div className="flex flex-col h-full">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <ImageIcon size={20} className="text-[var(--gm-primary)]" />{" "}
                  Plano de Fundo (
                  {viewMode === "smartphone" ? "Smartphone" : "Desktop"})
                </h2>
                <Card className="flex flex-col flex-1 border border-black/10 dark:border-white/10 shadow-sm rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md transition-all duration-300 py-6 px-6 relative overflow-hidden group">
                  <div className="flex flex-col h-full flex-1">
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 shrink-0">
                      <div>
                        <div className="font-semibold text-sm">
                          Plano de fundo
                        </div>
                        <div className="gm-muted text-[10px]">
                          Ative para aparecer no app
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`gm-btn py-1.5 px-3 text-xs`}
                        onClick={() => {
                          if (viewMode === "smartphone") {
                            setMobileBgEnabled((v) => {
                              const next = !v;
                              if (next && mobileBgOpacity <= 0)
                                setMobileBgOpacity(mobileBgOpacityPrev);
                              else if (!next && mobileBgOpacity > 0)
                                setMobileBgOpacityPrev(mobileBgOpacity);
                              return next;
                            });
                          } else {
                            setBgEnabled((v) => {
                              const next = !v;
                              if (next && bgOpacity <= 0)
                                setBgOpacity(bgOpacityPrev);
                              else if (!next && bgOpacity > 0)
                                setBgOpacityPrev(bgOpacity);
                              return next;
                            });
                          }
                        }}
                      >
                        {(
                          viewMode === "smartphone"
                            ? mobileBgEnabled
                            : bgEnabled
                        )
                          ? "Ativo"
                          : "Desativado"}
                      </button>
                    </div>

                    <div className="mt-4 space-y-4 flex-1 flex flex-col justify-center">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)]">
                          Ajuste
                        </label>
                        <Select
                          className="gm-input py-2 text-sm h-10 w-full"
                          value={
                            viewMode === "smartphone" ? mobileBgFit : bgFit
                          }
                          onChange={(val) => {
                            if (viewMode === "smartphone")
                              setMobileBgFit(String(val) as Fit);
                            else setBgFit(String(val) as Fit);
                          }}
                          options={[
                            { value: "cover", label: "Cortar (cover)" },
                            { value: "contain", label: "Conter (contain)" },
                          ]}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)]">
                          Opacidade (
                          {Math.round(
                            (viewMode === "smartphone"
                              ? mobileBgOpacity
                              : bgOpacity) * 100,
                          )}
                          %)
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          className="w-full h-1.5 accent-[var(--gm-primary)]"
                          value={
                            viewMode === "smartphone"
                              ? mobileBgOpacity
                              : bgOpacity
                          }
                          onChange={(e) => {
                            if (viewMode === "smartphone")
                              setMobileBgOpacity(Number(e.target.value));
                            else setBgOpacity(Number(e.target.value));
                          }}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)]">
                          Zoom (
                          {viewMode === "smartphone" ? mobileBgScale : bgScale}
                          x)
                        </label>
                        <input
                          type="range"
                          min={0.5}
                          max={5}
                          step={0.1}
                          className="w-full h-1.5 accent-[var(--gm-primary)]"
                          value={
                            viewMode === "smartphone" ? mobileBgScale : bgScale
                          }
                          onChange={(e) => {
                            if (viewMode === "smartphone")
                              setMobileBgScale(Number(e.target.value));
                            else setBgScale(Number(e.target.value));
                          }}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)]">
                          Desfoque (
                          {viewMode === "smartphone" ? mobileBgBlur : bgBlur}px)
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={24}
                          step={1}
                          className="w-full h-1.5 accent-[var(--gm-primary)]"
                          value={
                            viewMode === "smartphone" ? mobileBgBlur : bgBlur
                          }
                          onChange={(e) => {
                            if (viewMode === "smartphone")
                              setMobileBgBlur(Number(e.target.value));
                            else setBgBlur(Number(e.target.value));
                          }}
                        />
                      </div>

                      <div className="pt-2">
                        <div className="text-[10px] leading-tight text-slate-500 dark:text-slate-400 mb-3 text-center">
                          Formatos aceitos: JPG, PNG, WEBP, GIF, MP4 (Máx.
                          15MB).
                          <br />
                          As imagens contam com otimização automática.
                        </div>
                        {(viewMode === "smartphone" ? mobileBgUrl : bgUrl) && (
                          <div className="mb-4 rounded-xl overflow-hidden border border-[var(--gm-primary)]/20 relative aspect-video shadow-[0_0_15px_rgba(255,123,0,0.1)] group">
                            {uploadingBackground ? (
                              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                                <Loader2
                                  size={32}
                                  className="animate-spin text-[var(--gm-primary)] mb-2"
                                />
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                                  Processando...
                                </span>
                              </div>
                            ) : null}
                            {(
                              (viewMode === "smartphone"
                                ? mobileBgUrl
                                : bgUrl) || ""
                            )
                              .toLowerCase()
                              .endsWith(".mp4") ||
                            (
                              (viewMode === "smartphone"
                                ? mobileBgUrl
                                : bgUrl) || ""
                            )
                              .toLowerCase()
                              .endsWith(".webm") ? (
                              <video
                                src={
                                  (viewMode === "smartphone"
                                    ? mobileBgUrl
                                    : bgUrl) || ""
                                }
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                                style={{ transform: "translate3d(0, 0, 0)", backfaceVisibility: "hidden" }}
                                controlsList="nodownload"
                                disablePictureInPicture
                                onContextMenu={(e) => e.preventDefault()}
                              />
                            ) : (
                              <img
                                src={
                                  (viewMode === "smartphone"
                                    ? mobileBgUrl
                                    : bgUrl) || ""
                                }
                                alt="Background"
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        )}
                        {!(viewMode === "smartphone" ? mobileBgUrl : bgUrl) &&
                          uploadingBackground && (
                            <div className="mb-4 rounded-xl overflow-hidden border border-[var(--gm-primary)]/20 relative aspect-video shadow-[0_0_15px_rgba(255,123,0,0.1)] bg-black/10 flex flex-col items-center justify-center backdrop-blur-sm">
                              <Loader2
                                size={32}
                                className="animate-spin text-[var(--gm-primary)] mb-2"
                              />
                              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                                Processando...
                              </span>
                            </div>
                          )}
                        <label
                          className={`gm-btn w-full py-2 flex items-center justify-center gap-2 cursor-pointer ${uploadingBackground ? "opacity-50 pointer-events-none" : ""}`}
                        >
                          {uploadingBackground ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <FileImage size={16} />
                          )}
                          {uploadingBackground
                            ? "Enviando..."
                            : "Upload Background"}
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
                </Card>
              </div>

              <div className="flex flex-col h-full">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <CreditCard size={20} className="text-[var(--gm-primary)]" />{" "}
                  Dados de Pagamento
                </h2>
                <Card className="flex flex-col flex-1 border border-black/10 dark:border-white/10 shadow-sm rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md transition-all duration-300 py-6 px-6 relative overflow-hidden group">
                  <div className="flex flex-col gap-6 h-full flex-1">
                    <div className="shrink-0">
                      <div className="font-bold text-sm uppercase tracking-wider text-[var(--gm-primary)] mb-1">
                        Dados de Pagamento (Pix)
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        ✅ QR e “Copia e Cola” gerados aqui funcionam em{" "}
                        <b>qualquer banco</b> (Itaú, Nubank, Caixa, BB,
                        Bradesco, Santander, Inter, etc.)
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 shrink-0">
                      <div>
                        <label className="text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-1 block">
                          Tipo de chave
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
                            { value: "RANDOM", label: "Aleatória" },
                          ]}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-1 block">
                          Chave Pix
                        </label>
                        <input
                          type="text"
                          className="gm-input py-2 text-sm h-10 w-full"
                          placeholder="Sua chave Pix"
                          value={pixKey}
                          onChange={(e) => setPixKey(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                      Dica: e-mail deve ser minúsculo e sem espaços (o sistema
                      pode ajustar).
                    </div>

                    {/* ✅ Preview do QR + Copia e Cola */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-4 border-t border-black/10 dark:border-white/10 flex-1">
                      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/10 dark:bg-black/40 backdrop-blur-md p-4 h-full flex flex-col">
                        <div className="text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-3">
                          QR Code Pix (universal)
                        </div>
                        {pixQrPreview ? (
                          <div className="bg-white rounded-xl p-3 w-fit mx-auto flex-1 flex items-center justify-center">
                            <img
                              src={pixQrPreview}
                              alt="QR Pix (Preview)"
                              className="w-[180px] h-auto"
                            />
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 text-center py-8 flex-1 flex items-center justify-center">
                            Informe uma chave Pix para gerar o QR.
                          </div>
                        )}

                        {pixQrPreview && (
                          <button
                            type="button"
                            className="gm-btn-soft w-full mt-4 justify-center py-2"
                            onClick={() => {
                              const a = document.createElement("a");
                              a.href = pixQrPreview;
                              a.download = "pix_qr_configuracoes.png";
                              a.click();
                            }}
                          >
                            <Download size={16} />
                            Baixar QR
                          </button>
                        )}
                      </div>

                      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/10 dark:bg-black/40 backdrop-blur-md p-4 h-full flex flex-col">
                        <div className="text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-3">
                          Pix “Copia e Cola”
                        </div>

                        {!pixPayloadPreview ? (
                          <div className="text-xs text-slate-500 text-center py-8 flex-1 flex items-center justify-center">
                            Informe uma chave Pix para gerar o código.
                          </div>
                        ) : (
                          <div className="flex flex-col h-full justify-between flex-1">
                            <div className="text-[10px] leading-relaxed font-mono break-all bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-lg p-3 text-slate-600 dark:text-slate-300 mb-4 max-h-[140px] overflow-y-auto">
                              {pixPayloadPreview}
                            </div>

                            <button
                              type="button"
                              className="gm-btn w-full justify-center py-2 mt-auto"
                              onClick={async () => {
                                const ok = await copyText(pixPayloadPreview);
                                if (ok) {
                                  setPixCopied(true);
                                  setTimeout(() => setPixCopied(false), 1500);
                                } else {
                                  alert(
                                    "Não foi possível copiar automaticamente. Copie manualmente acima.",
                                  );
                                }
                              }}
                            >
                              {pixCopied ? (
                                <Check size={16} />
                              ) : (
                                <Copy size={16} />
                              )}
                              {pixCopied ? "Copiado!" : "Copiar código"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center mt-2 shrink-0">
                      Observação: este QR é <b>estático</b>. O banco do cliente
                      pode digitar o valor ao pagar, ou você pode gerar com
                      valor na tela de orçamento (como já existe no seu
                      PixModal).
                    </div>
                  </div>
                </Card>
              </div>

              {/* ROW 3 */}
              <div className="flex flex-col h-full">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <FileText size={20} className="text-[var(--gm-primary)]" />{" "}
                  Timbrado
                </h2>
                <Card className="flex flex-col flex-1 border border-black/10 dark:border-white/10 shadow-sm rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md transition-all duration-300 py-4 px-4 relative overflow-hidden group">
                  <div className="flex flex-col gap-4 h-full flex-1 justify-center">
                    <div className="w-full">
                      <label className="text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-4 block text-center">
                        Timbrado A4 (PDF/JPG/PNG)
                      </label>
                      <div className="flex items-start gap-8 justify-center">
                        <div className="flex flex-col items-center gap-3 flex-1 max-w-[200px]">
                          <span className="text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)]">
                            Seu Timbrado
                          </span>
                          <div className="w-full aspect-[1/1.414] rounded bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden flex items-center justify-center relative shrink-0">
                            {uploadingTimbrado ? (
                              <Loader2
                                size={48}
                                className="animate-spin text-slate-400"
                              />
                            ) : timbradoUrl ? (
                              <img
                                src={timbradoUrl}
                                alt="Timbrado"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileText
                                size={48}
                                className="opacity-50 text-slate-400"
                              />
                            )}
                          </div>
                          <label
                            className={`gm-btn w-full py-2 flex items-center justify-center gap-2 cursor-pointer ${uploadingTimbrado ? "opacity-50 pointer-events-none" : ""}`}
                          >
                            {uploadingTimbrado ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <FileImage size={14} />
                            )}
                            {uploadingTimbrado
                              ? "Enviando..."
                              : "Importar timbrado"}
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
                        <div className="flex flex-col items-center gap-3 flex-1 max-w-[200px]">
                          <span className="text-sm font-bold uppercase tracking-wider text-[var(--gm-primary)]">
                            Gabarito
                          </span>
                          <div className="w-full aspect-[1/1.414] rounded bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden flex items-center justify-center relative shrink-0">
                            <img
                              src={TIMBRADO_MODEL_URL}
                              alt="Gabarito"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <a
                            href={TIMBRADO_MODEL_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gm-btn w-full py-2 flex items-center justify-center gap-2"
                          >
                            <Download size={14} />
                            Baixar gabarito
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex flex-col h-full">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Bell size={20} className="text-[var(--gm-primary)]" />{" "}
                  Notificações Push
                </h2>
                <Card className="flex flex-col flex-1 border border-black/10 dark:border-white/10 shadow-sm rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md transition-all duration-300 py-6 px-6 relative overflow-hidden group items-center justify-center text-center">
                  <div className="flex flex-col items-center justify-center w-full max-w-[280px] mx-auto flex-1 space-y-4">
                    {/* Background Glow */}
                    <div
                      className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl rounded-full opacity-20 ${pushPermission === "granted" ? "bg-emerald-500" : "bg-amber-500"}`}
                    />

                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center border transition-all duration-300 mx-auto ${
                        pushActive && pushPermission === "granted"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-inner animate-pulse"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-500"
                      }`}
                    >
                      <Bell
                        size={24}
                        className={testing ? "animate-bounce" : ""}
                      />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                        Configurar Notificações
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-normal">
                        Defina suas preferências de alerta do dispositivo em
                        tempo real.
                      </p>
                    </div>

                    <div className="w-full flex flex-col gap-3 pt-1">
                      {/* SWITCH 1: PERMISSION / RECEBER ALERTAS */}
                      <div className="w-full flex items-center justify-between p-3 bg-black/5 dark:bg-black/30 rounded-xl border border-black/5 dark:border-white/5">
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Notificações Push
                          </p>
                          <p
                            className={`text-[9px] font-semibold uppercase ${pushActive && pushPermission === "granted" ? "text-emerald-500" : "text-amber-500"}`}
                          >
                            {pushActive && pushPermission === "granted"
                              ? "Ativo (ligado)"
                              : "Desativado (desligado)"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (pushPermission !== "granted") {
                              const permission =
                                await Notification.requestPermission();
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
                              localStorage.setItem(
                                "gm.pushActive",
                                nextActive ? "true" : "false",
                              );
                            }
                          }}
                          className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-all duration-300 outline-none ${
                            pushActive && pushPermission === "granted"
                              ? "bg-emerald-500 justify-end"
                              : "bg-slate-300 dark:bg-slate-700 justify-start"
                          }`}
                          aria-label="Toggle Push Notifications Desktop"
                        >
                          <motion.div
                            layout
                            className="w-5 h-5 bg-white rounded-full shadow-md"
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 30,
                            }}
                          />
                        </button>
                      </div>

                      {/* SWITCH 2: MUTED / SONS DE NOTIFICAÇÃO */}
                      <div className="w-full flex items-center justify-between p-3 bg-black/5 dark:bg-black/30 rounded-xl border border-black/5 dark:border-white/5">
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Sons de Alerta
                          </p>
                          <p
                            className={`text-[9px] font-semibold uppercase ${!notificationsMuted ? "text-emerald-500" : "text-amber-500"}`}
                          >
                            {!notificationsMuted
                              ? "Ativo (ligado)"
                              : "Desativado (desligado)"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !notificationsMuted;
                            localStorage.setItem(
                              "gm.notificationsMuted",
                              next ? "true" : "false",
                            );
                            setNotificationsMuted(next);
                          }}
                          className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-all duration-300 outline-none ${
                            !notificationsMuted
                              ? "bg-emerald-500 justify-end"
                              : "bg-slate-300 dark:bg-slate-700 justify-start"
                          }`}
                          aria-label="Toggle Warning Sounds Desktop"
                        >
                          <motion.div
                            layout
                            className="w-5 h-5 bg-white rounded-full shadow-md"
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 30,
                            }}
                          />
                        </button>
                      </div>

                      {/* SINGLE ACTION BUTTON: TEST NOTIFICATION (SHAKING) */}
                      <motion.button
                        type="button"
                        animate={
                          shakeTest
                            ? { x: [-6, 6, -6, 6, -4, 4, -2, 2, 0] }
                            : {}
                        }
                        transition={{ duration: 0.4 }}
                        disabled={testing}
                        onClick={async () => {
                          setShakeTest(true);
                          setTimeout(() => setShakeTest(false), 450);

                          if (pushPermission !== "granted") {
                            const permission =
                              await Notification.requestPermission();
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
                        style={{
                          backgroundColor: "var(--gm-primary)",
                        }}
                        className="py-3 flex items-center justify-center gap-1.5 text-xs font-bold w-full transition-all text-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:brightness-110 active:scale-[0.98] outline-none mt-2"
                      >
                        {testing ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Bell size={13} />
                        )}
                        {testing
                          ? "Testando..."
                          : "Enviar Notificação de Teste"}
                      </motion.button>
                    </div>
                  </div>
                </Card>
              </div>

              {/* ROW 4 - SONS DE NOTIFICAÇÃO */}
              <div className="flex flex-col h-full lg:col-span-2">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Volume2 size={20} className="text-[var(--gm-primary)]" />{" "}
                  Sons de Notificação (Notas e Orçamentos)
                </h2>
                <Card className="border border-black/10 dark:border-white/10 shadow-sm rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md transition-all duration-300 py-6 px-6 relative overflow-hidden">
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4 max-w-2xl leading-relaxed">
                    Escolha o toque de sua preferência para alarmes, rascunhos e
                    finalização de orçamentos. Clique em qualquer som para
                    escutar uma demonstração instantânea e definir como padrão
                    do seu aplicativo CardDigital.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {NOTIFICATION_SOUNDS.map((sound) => {
                      const isSelected = activeSound === sound.id;
                      return (
                        <button
                          key={sound.id}
                          onClick={() => {
                            localStorage.setItem(
                              "gm.notificationSound",
                              sound.id,
                            );
                            setActiveSound(sound.id);
                            try {
                              playNotificationSound(sound.id);
                            } catch (e) {}
                          }}
                          className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "bg-[var(--gm-primary)]/10 border-[var(--gm-primary)] text-[var(--gm-primary)] shadow-[0_0_15px_rgba(var(--gm-primary-rgb),0.1)]"
                              : "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-black/10 dark:hover:border-white/10 hover:bg-black/10 dark:hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "bg-[var(--gm-primary)] text-white"
                                  : "bg-black/10 dark:bg-white/10 text-slate-500 dark:text-zinc-400"
                              }`}
                            >
                              <Music size={18} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold leading-tight">
                                {sound.name}
                              </h4>
                              <p className="text-[10px] opacity-75 leading-normal mt-0.5 max-w-[280px]">
                                {sound.description}
                              </p>
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "border-[var(--gm-primary)]"
                                : "border-slate-300 dark:border-zinc-600"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2.5 h-2.5 rounded-full bg-[var(--gm-primary)]" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* ROW 5 - TUTORIAL */}
              <div className="flex flex-col h-full lg:col-span-2">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <HelpCircle size={20} className="text-[var(--gm-primary)]" /> Tutorial do Aplicativo
                </h2>
                <Card className="flex flex-col flex-1 border border-black/10 dark:border-white/10 shadow-sm rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md transition-all duration-300 py-6 px-6 relative overflow-hidden group items-center justify-center text-center">
                  <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto flex-1">
                    <div className="w-16 h-16 rounded-full bg-[var(--gm-primary)]/10 text-[var(--gm-primary)] flex items-center justify-center mb-4">
                      <Sparkles size={32} />
                    </div>
                    <div className="space-y-2 mb-6 shrink-0">
                      <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                        Passo a Passo Interativo
                      </h4>
                      <p className="text-xs text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                        Quer rever as principais funções e usabilidade do painel principal? Inicie o assistente de onboarding.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        localStorage.removeItem("gm.tutorialCompleted");
                        localStorage.setItem("gm.tutorialForceStart", "true");
                        navigate("/");
                      }}
                      className="gm-btn py-3 px-6 flex items-center justify-center gap-2 text-sm w-full transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Sparkles size={16} />
                      Iniciar Tutorial do App
                    </button>
                  </div>
                </Card>
              </div>

            </div>
          ) : (
            <div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col h-full min-h-0 bg-transparent">
              {/* TABS DE CONFIGURAÇÃO DE CADA TELA EM TEMPO REAL */}
              <div className="flex gap-1.5 overflow-x-auto px-2 py-3 no-scrollbar shrink-0 border-b border-black/10 dark:border-white/10 mb-2">
                {[
                  { id: 0, label: "Identidade", icon: Palette },
                  { id: 1, label: "Fundo", icon: ImageIcon },
                  { id: 2, label: "Cores & Botão", icon: Paintbrush },
                  { id: 3, label: "Pix", icon: CreditCard },
                  { id: 4, label: "Timbrado", icon: FileText },
                  { id: 5, label: "Notificar", icon: Bell },
                  { id: 6, label: "Toques", icon: Volume2 },
                  { id: 7, label: "Manual", icon: HelpCircle },
                ].map((tab) => {
                  const TabIcon = tab.icon;
                  const isSelected = tab.id === currentScreen;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setDirection(tab.id > currentScreen ? 1 : -1);
                        setCurrentScreen(tab.id);
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all duration-300 select-none whitespace-nowrap outline-none ${
                        isSelected
                          ? "bg-[var(--gm-primary)] text-white border-[var(--gm-primary)] shadow-[0_0_12px_rgba(var(--gm-primary-rgb),0.25)] scale-105"
                          : "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 text-slate-600 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10 active:scale-95"
                      }`}
                    >
                      <TabIcon
                        size={12}
                        className={
                          isSelected ? "text-white" : "text-[var(--gm-primary)]"
                        }
                      />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="relative overflow-hidden w-full pt-1 flex-1 flex flex-col min-h-0">
                <motion.div
                  className="relative flex items-start flex-1 min-h-0"
                  initial={false}
                >
                  <motion.div
                    className="flex w-full items-start h-full min-h-0"
                    animate={{ x: `-${currentScreen * 100}%` }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  >
                    <div
                      ref={swipeRef}
                      className="flex w-full items-start h-full min-h-0"
                      style={{ touchAction: "pan-y" }}
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
                        const isActive = index === currentScreen;
                        return (
                          <motion.div
                            key={index}
                            className="w-full shrink-0 px-2 flex flex-col justify-start h-full overflow-y-auto no-scrollbar min-h-0 pb-24"
                            animate={{
                              filter: isActive ? "blur(0px)" : "blur(4px)",
                              opacity: isActive ? 1 : 0.5,
                              scale: isActive ? 1 : 0.95,
                            }}
                            transition={{ duration: 0.3 }}
                          >
                            <div 
                              className="w-full flex-shrink-0 flex flex-col gap-5 py-6 px-5 rounded-[2rem] relative mb-8 shadow-2xl transition-all gm-settings-card"
                              style={{ 
                                backgroundColor: 'rgba(17, 19, 24, 0.7)',
                                backdropFilter: 'blur(12px)',
                                borderColor: brandPrimary || '#32BCAD',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                boxShadow: `0 0 20px ${brandPrimary || '#32BCAD'}40, inset 0 0 20px ${brandPrimary || '#32BCAD'}20`
                              }}
                            >
                              {index === 0 && (
                                <>
                                  <div className="flex items-center justify-between mb-1 shrink-0">
                                    <h2 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-wider">
                                      <Palette
                                        size={16}
                                        className="text-[var(--gm-primary)]"
                                      />{" "}
                                      Identidade Visual
                                    </h2>
                                  </div>

                                  <div className="flex flex-col gap-3">
                                    <div className="flex flex-col w-full py-2 flex flex-col items-center">
                                      <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 overflow-hidden flex items-center justify-center relative shrink-0">
                                        {uploadingLogo ? (
                                          <Loader2
                                            size={24}
                                            className="animate-spin text-slate-400"
                                          />
                                        ) : companyLogoUrl ? (
                                          <img
                                            src={companyLogoUrl}
                                            alt="Logo"
                                            className="w-full h-full object-contain"
                                          />
                                        ) : (
                                          <ImageIcon
                                            size={24}
                                            className="opacity-50 text-slate-400"
                                          />
                                        )}
                                      </div>
                                      <label
                                        className={`gm-btn w-full mt-3 py-2 flex items-center justify-center gap-2 cursor-pointer ${uploadingLogo ? "opacity-50 pointer-events-none" : ""}`}
                                      >
                                        {uploadingLogo ? (
                                          <Loader2
                                            size={16}
                                            className="animate-spin"
                                          />
                                        ) : (
                                          <FileImage size={16} />
                                        )}
                                        {uploadingLogo
                                          ? "Enviando..."
                                          : "Alterar Logo"}
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

                                    <div className="flex flex-col w-full py-2">
                                      <div className="space-y-4">
                                        <div className="space-y-1.5">
                                          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--gm-primary)]">
                                            Nome da empresa
                                          </label>
                                          <input
                                            className="gm-input py-2 text-sm h-10 w-full"
                                            value={companyName}
                                            onChange={(e) =>
                                              setCompanyName(e.target.value)
                                            }
                                          />
                                        </div>

                                        <div className="space-y-1.5">
                                          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--gm-primary)] flex items-center gap-2">
                                            <Smartphone size={14} /> Escala
                                            Smartphone
                                          </label>
                                          <ScaleSlider
                                            value={mobileScale}
                                            onChange={setMobileScale}
                                            isMobile
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex flex-col w-full py-2">
                                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-3 block text-center">
                                        Família de Fonte
                                      </label>
                                      <div className="grid grid-cols-2 gap-2">
                                        {[
                                          "Inter",
                                          "Roboto",
                                          "Montserrat",
                                          "Open Sans",
                                          "Raleway",
                                          "Funnel Display",
                                          "Plus Jakarta Sans",
                                          "Hubot Sans",
                                        ].map((font) => {
                                          const isActive = fontFamily === font;
                                          return (
                                            <button
                                              key={font}
                                              type="button"
                                              onClick={() =>
                                                setFontFamily(font)
                                              }
                                              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all h-12 ${
                                                isActive
                                                  ? "border-[var(--gm-primary)] bg-[var(--gm-primary-10)] text-[var(--gm-primary)] font-bold"
                                                  : "border-black/5 dark:border-white/5 bg-black/5 dark:bg-black/20 text-slate-700 dark:text-slate-300"
                                              }`}
                                              style={{ fontFamily: font }}
                                            >
                                              <span className="text-[11px] truncate max-w-full">
                                                {font}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                              {index === 1 && (
                                <>
                                  <div className="flex items-center justify-between mb-1 shrink-0">
                                    <h2 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-wider">
                                      <ImageIcon
                                        size={16}
                                        className="text-[var(--gm-primary)]"
                                      />{" "}
                                      Plano de Fundo
                                    </h2>
                                  </div>

                                  <div className="flex flex-col gap-3">
                                    <div className="flex flex-col w-full py-2">
                                      <div className="space-y-4">
                                        <div className="flex items-center justify-between bg-black/5 dark:bg-black/35 p-3 rounded-lg border border-black/5 dark:border-white/5">
                                          <div>
                                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                                              Plano de fundo
                                            </div>
                                            <div className="text-[9px] text-slate-500">
                                              Exibir no smartphone
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setMobileBgEnabled(
                                                !mobileBgEnabled,
                                              )
                                            }
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                              mobileBgEnabled
                                                ? "bg-[var(--gm-primary)] text-white shadow-md shadow-[var(--gm-primary-30)]"
                                                : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                                            }`}
                                          >
                                            {mobileBgEnabled
                                              ? "Ativo"
                                              : "Inativo"}
                                          </button>
                                        </div>

                                        <div className="space-y-1.5">
                                          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--gm-primary)] flex justify-between">
                                            <span>Opacidade</span>
                                            <span className="text-[var(--gm-primary)]">
                                              {Math.round(
                                                mobileBgOpacity * 100,
                                              )}
                                              %
                                            </span>
                                          </label>
                                          <input
                                            type="range"
                                            min={0}
                                            max={1}
                                            step={0.01}
                                            className="w-full h-2 accent-[var(--gm-primary)]"
                                            value={mobileBgOpacity}
                                            onChange={(e) =>
                                              setMobileBgOpacity(
                                                Number(e.target.value),
                                              )
                                            }
                                          />
                                        </div>

                                        <div className="space-y-1.5">
                                          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--gm-primary)] flex justify-between">
                                            <span>Zoom</span>
                                            <span className="text-[var(--gm-primary)]">
                                              {mobileBgScale}x
                                            </span>
                                          </label>
                                          <input
                                            type="range"
                                            min={0.5}
                                            max={5}
                                            step={0.1}
                                            className="w-full h-2 accent-[var(--gm-primary)]"
                                            value={mobileBgScale}
                                            onChange={(e) =>
                                              setMobileBgScale(
                                                Number(e.target.value),
                                              )
                                            }
                                          />
                                        </div>

                                        <div className="space-y-1.5">
                                          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--gm-primary)] flex justify-between">
                                            <span>Desfoque</span>
                                            <span className="text-[var(--gm-primary)]">
                                              {mobileBgBlur}px
                                            </span>
                                          </label>
                                          <input
                                            type="range"
                                            min={0}
                                            max={24}
                                            step={1}
                                            className="w-full h-2 accent-[var(--gm-primary)]"
                                            value={mobileBgBlur}
                                            onChange={(e) =>
                                              setMobileBgBlur(
                                                Number(e.target.value),
                                              )
                                            }
                                          />
                                        </div>

                                        <div className="pt-2 flex flex-col gap-3">
                                          {mobileBgUrl && (
                                            <div className="w-full flex justify-center py-2">
                                              <div className="rounded-3xl border-4 border-zinc-850 dark:border-zinc-750 relative aspect-[9/16] w-[210px] bg-black/20 shadow-2xl overflow-y-auto no-scrollbar flex flex-col scroll-smooth">
                                                {uploadingBackground && (
                                                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                                                    <Loader2
                                                      size={24}
                                                      className="animate-spin text-[var(--gm-primary)] mb-1"
                                                    />
                                                    <span className="text-[9px] font-bold text-white uppercase tracking-wider text-center">
                                                      Processando...
                                                    </span>
                                                  </div>
                                                )}
                                                <div className="w-full h-auto flex flex-col shrink-0 min-h-full">
                                                  {mobileBgUrl
                                                    .toLowerCase()
                                                    .endsWith(".mp4") ||
                                                  mobileBgUrl
                                                    .toLowerCase()
                                                    .endsWith(".webm") ? (
                                                    <video
                                                      src={mobileBgUrl}
                                                      autoPlay
                                                      loop
                                                      muted
                                                      playsInline
                                                      className="w-full h-auto block"
                                                      style={{ transform: "translate3d(0, 0, 0)", backfaceVisibility: "hidden" }}
                                                      controlsList="nodownload"
                                                      disablePictureInPicture
                                                      onContextMenu={(e) => e.preventDefault()}
                                                    />
                                                  ) : (
                                                    <img
                                                      src={mobileBgUrl}
                                                      alt="Background"
                                                      className="w-full h-auto block"
                                                    />
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          {!mobileBgUrl &&
                                            uploadingBackground && (
                                              <div className="w-full flex justify-center py-2">
                                                <div className="rounded-3xl border-4 border-zinc-850 dark:border-zinc-750 relative aspect-[9/16] w-[210px] bg-black/20 flex flex-col items-center justify-center backdrop-blur-sm shadow-2xl font-sans">
                                                  <Loader2
                                                    size={24}
                                                    className="animate-spin text-[var(--gm-primary)] mb-1"
                                                  />
                                                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider text-center">
                                                    Processando...
                                                  </span>
                                                </div>
                                              </div>
                                            )}

                                          <label
                                            className={`gm-btn w-full py-2.5 flex items-center justify-center gap-2 cursor-pointer text-sm font-bold shadow-md ${uploadingBackground ? "opacity-50 pointer-events-none" : ""}`}
                                          >
                                            {uploadingBackground ? (
                                              <Loader2
                                                size={16}
                                                className="animate-spin"
                                              />
                                            ) : (
                                              <FileImage size={16} />
                                            )}
                                            {uploadingBackground
                                              ? "Enviando..."
                                              : "Upload Novo Background"}
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
                                </>
                              )}
                              {index === 2 && (
                                <>
                                  <div className="flex items-center justify-between mb-1 shrink-0">
                                    <h2 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-wider">
                                      <Paintbrush
                                        size={16}
                                        className="text-[var(--gm-primary)]"
                                      />{" "}
                                      Cores & Botões
                                    </h2>
                                  </div>

                                  <div className="flex flex-col gap-3">
                                    <div className="flex flex-col w-full py-2">
                                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-3 block">
                                        Misturador de Cores
                                      </label>
                                      
                                      {/* INDICADOR DE MODO DO MISTURADOR DE CORES */}
                                      <div className={`mb-3.5 p-3 rounded-xl border flex items-start gap-2.5 ${
                                        isLightMode 
                                          ? "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300" 
                                          : "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-300"
                                      }`}>
                                        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 animate-pulse ${
                                          isLightMode ? "bg-amber-500" : "bg-blue-400"
                                        }`} />
                                        <div className="flex flex-col">
                                          <span className="text-xs font-black uppercase tracking-wider">
                                            {isLightMode 
                                              ? "Modo Claro Ativo" 
                                              : "Modo Escuro Ativo"
                                            }
                                          </span>
                                          <span className="text-[10px] leading-relaxed opacity-90">
                                            {isLightMode
                                              ? "Você está configurando as cores exclusivas para o Modo Claro. Ao salvar, as preferências deste modo serão aplicadas separadamente do modo escuro."
                                              : "Você está configurando as cores exclusivas para o Modo Escuro. Ao salvar, as preferências deste modo serão aplicadas separadamente do modo claro."
                                            }
                                          </span>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2.5">
                                        {/* Cor Principal */}
                                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                                            <input
                                              type="color"
                                              value={brandPrimary}
                                              onChange={(e) =>
                                                setBrandPrimary(e.target.value)
                                              }
                                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-bold leading-tight truncate">
                                              Cor Principal
                                            </div>
                                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                                              {brandPrimary}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Cor de Fundo */}
                                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                                            <input
                                              type="color"
                                              value={brandBg}
                                              onChange={(e) =>
                                                setBrandBg(e.target.value)
                                              }
                                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-bold leading-tight truncate">
                                              Cor de Fundo
                                            </div>
                                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                                              {brandBg}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Cor dos Títulos */}
                                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                                            <input
                                              type="color"
                                              value={brandTitle}
                                              onChange={(e) =>
                                                setBrandTitle(e.target.value)
                                              }
                                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-bold leading-tight truncate">
                                              Cor dos Títulos
                                            </div>
                                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                                              {brandTitle}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Cor dos Subtítulos */}
                                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                                            <input
                                              type="color"
                                              value={brandSubtitle}
                                              onChange={(e) =>
                                                setBrandSubtitle(e.target.value)
                                              }
                                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-bold leading-tight truncate">
                                              Cor dos Subtítulos
                                            </div>
                                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                                              {brandSubtitle}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Cor dos Ícones */}
                                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                                            <input
                                              type="color"
                                              value={brandIcon}
                                              onChange={(e) =>
                                                setBrandIcon(e.target.value)
                                              }
                                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-bold leading-tight truncate">
                                              Cor dos Ícones
                                            </div>
                                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                                              {brandIcon}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Cor dos Botões */}
                                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                                            <input
                                              type="color"
                                              value={brandAccent}
                                              onChange={(e) =>
                                                setBrandAccent(e.target.value)
                                              }
                                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-bold leading-tight truncate">
                                              Cor dos Botões
                                            </div>
                                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                                              {brandAccent}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex flex-col w-full py-2">
                                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--gm-primary)] mb-3 block">
                                        Estilo dos Botões
                                      </label>
                                      <div className="grid grid-cols-2 gap-3">
                                        {BUTTON_STYLES.map((s) => {
                                          const isActive = buttonStyle === s.id;
                                          return (
                                            <button
                                              key={s.id}
                                              type="button"
                                              onClick={() =>
                                                setButtonStyle(s.id)
                                              }
                                              className={`flex flex-col items-center justify-between p-3 rounded-xl border transition-all h-24 ${
                                                isActive
                                                  ? "border-[var(--gm-primary)] bg-[var(--gm-primary-10)]"
                                                  : "border-black/5 dark:border-white/5 bg-black/5 dark:bg-black/35"
                                              }`}
                                            >
                                              <div
                                                className={`w-full py-2 text-xs font-bold rounded-lg flex items-center justify-center ${
                                                  s.id === "solid"
                                                    ? "bg-[var(--gm-primary)] text-white"
                                                    : "bg-transparent border border-[var(--gm-primary)] text-[var(--gm-primary)]"
                                                }`}
                                              >
                                                Preview
                                              </div>
                                              <span
                                                className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-[var(--gm-primary)]" : "text-slate-500"}`}
                                              >
                                                {s.name}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    <div className="flex flex-col w-full py-2">
                                      <div className="h-px bg-slate-200 dark:bg-slate-700 w-full my-1 shrink-0"></div>
                                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--gm-primary)] my-3 block">
                                        Misturador de Cores do Menu
                                      </label>
                                      
                                      <div className="grid grid-cols-2 gap-2.5">
                                        {/* Cor Principal */}
                                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                                            <input
                                              type="color"
                                              value={menuPrimary}
                                              onChange={(e) =>
                                                setMenuPrimary(e.target.value)
                                              }
                                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-bold leading-tight truncate">
                                              Cor Principal
                                            </div>
                                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                                              {menuPrimary}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Cor de Fundo */}
                                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                                            <input
                                              type="color"
                                              value={menuBg}
                                              onChange={(e) =>
                                                setMenuBg(e.target.value)
                                              }
                                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-bold leading-tight truncate">
                                              Cor de Fundo
                                            </div>
                                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                                              {menuBg}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Cor dos Títulos */}
                                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                                            <input
                                              type="color"
                                              value={menuTitle}
                                              onChange={(e) =>
                                                setMenuTitle(e.target.value)
                                              }
                                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-bold leading-tight truncate">
                                              Cor dos Títulos
                                            </div>
                                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                                              {menuTitle}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Duas Legendas */}
                                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                                            <input
                                              type="color"
                                              value={menuSubtitle}
                                              onChange={(e) =>
                                                setMenuSubtitle(e.target.value)
                                              }
                                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-bold leading-tight truncate">
                                              Duas Legendas
                                            </div>
                                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                                              {menuSubtitle}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Cor dos Ícones */}
                                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                                            <input
                                              type="color"
                                              value={menuIcon}
                                              onChange={(e) =>
                                                setMenuIcon(e.target.value)
                                              }
                                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-bold leading-tight truncate">
                                              Cor dos Ícones
                                            </div>
                                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                                              {menuIcon}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Cor dos Botões */}
                                        <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow transition-all duration-200 group/item">
                                          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md shrink-0 transition-transform duration-200 group-hover/item:scale-105">
                                            <input
                                              type="color"
                                              value={menuButton}
                                              onChange={(e) =>
                                                setMenuButton(e.target.value)
                                              }
                                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-bold leading-tight truncate">
                                              Cor dos Botões
                                            </div>
                                            <div className="text-[9px] text-slate-500 uppercase font-mono">
                                              {menuButton}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                              {index === 3 && (
                                <>
                                  <div className="flex items-center justify-between mb-1 shrink-0">
                                    <h2 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-wider">
                                      <CreditCard
                                        size={16}
                                        className="text-[var(--gm-primary)]"
                                      />{" "}
                                      Configurações Pix
                                    </h2>
                                  </div>

                                  <div className="flex flex-col gap-3">
                                    <div className="flex flex-col w-full py-2">
                                      <div className="space-y-3">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--gm-primary)]">
                                            Tipo de Chave
                                          </label>
                                          <Select
                                            className="gm-input py-1 text-xs h-9 w-full"
                                            value={pixType}
                                            onChange={(val) =>
                                              setPixType(String(val))
                                            }
                                            options={[
                                              { value: "CPF", label: "CPF" },
                                              { value: "CNPJ", label: "CNPJ" },
                                              {
                                                value: "EMAIL",
                                                label: "E-mail",
                                              },
                                              {
                                                value: "PHONE",
                                                label: "Telefone",
                                              },
                                              {
                                                value: "RANDOM",
                                                label: "Aleatória",
                                              },
                                            ]}
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--gm-primary)]">
                                            Chave Pix
                                          </label>
                                          <input
                                            className="gm-input py-1 text-xs h-9 w-full"
                                            value={pixKey}
                                            onChange={(e) =>
                                              setPixKey(e.target.value)
                                            }
                                            placeholder="Sua chave Pix"
                                          />
                                        </div>

                                        {pixQrPreview && (
                                          <div className="mt-2 flex flex-col items-center justify-center p-3 bg-black/5 dark:bg-black/35 rounded-xl border border-black/5 dark:border-white/5 w-full font-sans">
                                            <img
                                              src={pixQrPreview}
                                              alt="QR Pix"
                                              className="w-[180px] h-[180px] rounded-xl shadow-lg mb-3 object-contain bg-white p-2"
                                            />
                                            <button
                                              type="button"
                                              className="gm-btn w-full justify-center py-2 text-xs font-bold"
                                              onClick={() => {
                                                const a =
                                                  document.createElement("a");
                                                a.href = pixQrPreview;
                                                a.download =
                                                  "pix_qr_configuracoes.png";
                                                a.click();
                                              }}
                                            >
                                              <Download size={12} />
                                              Baixar QR Code
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                              {index === 4 && (
                                <>
                                  <div className="flex items-center justify-between mb-1 shrink-0">
                                    <h2 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-wider">
                                      <FileText
                                        size={16}
                                        className="text-[var(--gm-primary)]"
                                      />{" "}
                                      Documento Timbrado
                                    </h2>
                                  </div>

                                  <div className="flex flex-col gap-3">
                                    <div className="flex flex-col w-full py-2">
                                      <div className="grid grid-cols-2 gap-4 w-full">
                                        {/* Importar Timbrado */}
                                        <div className="flex flex-col items-center gap-2 w-full">
                                          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--gm-primary)] text-center h-4 flex items-center">
                                            Importar Timbrado
                                          </span>
                                          <div className="w-full aspect-[1/1.414] rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-350 dark:border-zinc-705 overflow-hidden flex items-center justify-center relative shrink-0 shadow-inner">
                                            {uploadingTimbrado ? (
                                              <Loader2
                                                size={18}
                                                className="animate-spin text-[var(--gm-primary)]"
                                              />
                                            ) : timbradoUrl ? (
                                              <img
                                                src={timbradoUrl}
                                                alt="Timbrado"
                                                className="w-full h-full object-contain"
                                              />
                                            ) : (
                                              <FileText
                                                size={20}
                                                className="opacity-45 text-slate-400"
                                              />
                                            )}
                                          </div>
                                          <label
                                            className={`gm-btn w-full py-2 flex items-center justify-center gap-1.5 cursor-pointer text-[10px] uppercase font-bold tracking-wider ${uploadingTimbrado ? "opacity-50 pointer-events-none" : ""}`}
                                          >
                                            {uploadingTimbrado ? (
                                              <Loader2
                                                size={12}
                                                className="animate-spin"
                                              />
                                            ) : (
                                              <FileImage size={11} />
                                            )}
                                            {uploadingTimbrado
                                              ? "Enviando..."
                                              : "Importar"}
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

                                        {/* Gabarito A4 */}
                                        <div className="flex flex-col items-center gap-2 w-full">
                                          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--gm-primary)] text-center h-4 flex items-center font-sans">
                                            Gabarito A4
                                          </span>
                                          <div className="w-full aspect-[1/1.414] rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-350 dark:border-zinc-705 overflow-hidden flex items-center justify-center relative shrink-0 shadow-inner">
                                            <img
                                              src={TIMBRADO_MODEL_URL}
                                              alt="Gabarito"
                                              className="w-full h-full object-contain"
                                            />
                                          </div>
                                          <a
                                            href={TIMBRADO_MODEL_URL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="gm-btn w-full py-2 flex items-center justify-center gap-1.5 text-[10px] uppercase font-bold tracking-wider"
                                          >
                                            <Download size={11} />
                                            Baixar Modelo
                                          </a>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                              {index === 5 && (
                                <>
                                  <div className="flex items-center justify-between mb-1 shrink-0">
                                    <h2 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-wider">
                                      <Bell
                                        size={16}
                                        className="text-[var(--gm-primary)]"
                                      />{" "}
                                      Notificações Push
                                    </h2>
                                  </div>

                                  <div className="flex flex-col gap-3">
                                    <div className="flex flex-col w-full py-2 relative overflow-hidden flex flex-col items-center justify-center text-center h-auto min-h-[280px]">
                                      {/* Background glow */}
                                      <div
                                        className={`absolute -top-10 -right-10 w-24 h-24 blur-2xl rounded-full opacity-10 ${pushPermission === "granted" ? "bg-emerald-500" : "bg-amber-500"}`}
                                      />

                                      <div className="flex flex-col items-center justify-center text-center w-full max-w-[260px] mx-auto space-y-4">
                                        <div
                                          className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-300 mx-auto ${
                                            pushPermission === "granted"
                                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-inner animate-pulse"
                                              : "bg-amber-500/10 border-amber-500/30 text-amber-500"
                                          }`}
                                        >
                                          <Bell size={24} />
                                        </div>

                                        <div className="space-y-1">
                                          <h4 className="text-sm font-bold text-slate-800 dark:text-white text-center uppercase tracking-wider">
                                            Configurar Notificações
                                          </h4>
                                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-normal text-center">
                                            Defina suas preferências de alerta
                                            do dispositivo em tempo real.
                                          </p>
                                        </div>

                                        <div className="w-full flex flex-col gap-3 pt-1">
                                          {/* SWITCH 1: PERMISSION / RECEBER ALERTAS */}
                                          <div className="w-full flex items-center justify-between p-3 bg-black/5 dark:bg-black/30 rounded-xl border border-black/5 dark:border-white/5">
                                            <div className="text-left">
                                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                Notificações Push
                                              </p>
                                              <p
                                                className={`text-[9px] font-semibold uppercase ${pushActive && pushPermission === "granted" ? "text-emerald-500" : "text-amber-500"}`}
                                              >
                                                {pushActive &&
                                                pushPermission === "granted"
                                                  ? "Ativo (ligado)"
                                                  : "Desativado (desligado)"}
                                              </p>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                if (
                                                  pushPermission !== "granted"
                                                ) {
                                                  const permission =
                                                    await Notification.requestPermission();
                                                  setPushPermission(permission);
                                                  if (
                                                    permission === "granted"
                                                  ) {
                                                    setPushActive(true);
                                                    localStorage.setItem(
                                                      "gm.pushActive",
                                                      "true",
                                                    );
                                                  } else {
                                                    setPushActive(false);
                                                    localStorage.setItem(
                                                      "gm.pushActive",
                                                      "false",
                                                    );
                                                  }
                                                } else {
                                                  const nextActive =
                                                    !pushActive;
                                                  setPushActive(nextActive);
                                                  localStorage.setItem(
                                                    "gm.pushActive",
                                                    nextActive
                                                      ? "true"
                                                      : "false",
                                                  );
                                                }
                                              }}
                                              className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-all duration-300 outline-none ${
                                                pushActive &&
                                                pushPermission === "granted"
                                                  ? "bg-emerald-500 justify-end"
                                                  : "bg-slate-300 dark:bg-slate-700 justify-start"
                                              }`}
                                              aria-label="Toggle Push Notifications"
                                            >
                                              <motion.div
                                                layout
                                                className="w-5 h-5 bg-white rounded-full shadow-md"
                                                transition={{
                                                  type: "spring",
                                                  stiffness: 500,
                                                  damping: 30,
                                                }}
                                              />
                                            </button>
                                          </div>

                                          {/* SWITCH 2: MUTED / SONS DE NOTIFICAÇÃO */}
                                          <div className="w-full flex items-center justify-between p-3 bg-black/5 dark:bg-black/30 rounded-xl border border-black/5 dark:border-white/5">
                                            <div className="text-left">
                                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                Sons de Alerta
                                              </p>
                                              <p
                                                className={`text-[9px] font-semibold uppercase ${!notificationsMuted ? "text-emerald-500" : "text-amber-500"}`}
                                              >
                                                {!notificationsMuted
                                                  ? "Ativo (ligado)"
                                                  : "Desativado (desligado)"}
                                              </p>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const next =
                                                  !notificationsMuted;
                                                localStorage.setItem(
                                                  "gm.notificationsMuted",
                                                  next ? "true" : "false",
                                                );
                                                setNotificationsMuted(next);
                                              }}
                                              className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-all duration-300 outline-none ${
                                                !notificationsMuted
                                                  ? "bg-emerald-500 justify-end"
                                                  : "bg-slate-300 dark:bg-slate-700 justify-start"
                                              }`}
                                              aria-label="Toggle Warning Sounds"
                                            >
                                              <motion.div
                                                layout
                                                className="w-5 h-5 bg-white rounded-full shadow-md"
                                                transition={{
                                                  type: "spring",
                                                  stiffness: 500,
                                                  damping: 30,
                                                }}
                                              />
                                            </button>
                                          </div>

                                          {/* SINGLE ACTION BUTTON: TEST NOTIFICATION (SHAKING) */}
                                          <motion.button
                                            type="button"
                                            animate={
                                              shakeTest
                                                ? {
                                                    x: [
                                                      -6, 6, -6, 6, -4, 4, -2,
                                                      2, 0,
                                                    ],
                                                  }
                                                : {}
                                            }
                                            transition={{ duration: 0.4 }}
                                            disabled={testing}
                                            onClick={async () => {
                                              setShakeTest(true);
                                              setTimeout(
                                                () => setShakeTest(false),
                                                450,
                                              );

                                              // Still try to send if permission granted
                                              if (
                                                pushPermission !== "granted"
                                              ) {
                                                // Prompt permission automatically if they click without it
                                                const permission =
                                                  await Notification.requestPermission();
                                                setPushPermission(permission);
                                                if (permission !== "granted")
                                                  return;
                                              }

                                              // If permission is granted but pushActive was off, turn it on!
                                              if (!pushActive) {
                                                setPushActive(true);
                                                localStorage.setItem(
                                                  "gm.pushActive",
                                                  "true",
                                                );
                                              }

                                              setTesting(true);
                                              try {
                                                playNotificationSound(
                                                  activeSound,
                                                );
                                              } catch (e) {}
                                              if (
                                                "serviceWorker" in navigator
                                              ) {
                                                const reg =
                                                  await navigator.serviceWorker
                                                    .ready;
                                                reg.active?.postMessage(
                                                  "TEST_NOTIFICATION",
                                                );
                                              }
                                              setTimeout(
                                                () => setTesting(false),
                                                1000,
                                              );
                                            }}
                                            style={{
                                              backgroundColor:
                                                "var(--gm-primary)",
                                            }}
                                            className="py-3 flex items-center justify-center gap-1.5 text-xs font-bold w-full transition-all text-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:brightness-110 active:scale-[0.98] outline-none mt-2"
                                          >
                                            {testing ? (
                                              <Loader2
                                                size={13}
                                                className="animate-spin"
                                              />
                                            ) : (
                                              <Bell size={13} />
                                            )}
                                            {testing
                                              ? "Testando..."
                                              : "Enviar Notificação de Teste"}
                                          </motion.button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                              {index === 6 && (
                                <>
                                  <div className="flex items-center justify-between mb-1 shrink-0">
                                    <h2 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-wider">
                                      <Volume2
                                        size={16}
                                        className="text-[var(--gm-primary)]"
                                      />{" "}
                                      Toques de Notificação
                                    </h2>
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    <div className="!border-none !shadow-none bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl p-4">
                                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 mb-3 leading-relaxed">
                                        Selecione seu som padrão. Toque para
                                        salvar e ouvir em tempo real:
                                      </p>

                                      <div className="space-y-1.5">
                                        {NOTIFICATION_SOUNDS.map((sound) => {
                                          const isSelected =
                                            activeSound === sound.id;
                                          return (
                                            <button
                                              key={sound.id}
                                              type="button"
                                              onClick={() => {
                                                localStorage.setItem(
                                                  "gm.notificationSound",
                                                  sound.id,
                                                );
                                                setActiveSound(sound.id);
                                                try {
                                                  playNotificationSound(
                                                    sound.id,
                                                  );
                                                } catch (e) {}
                                              }}
                                              className={`flex items-center justify-between p-2.5 rounded-xl border text-left w-full transition-all duration-300 ${
                                                isSelected
                                                  ? "bg-[var(--gm-primary)]/10 border-[var(--gm-primary)] text-[var(--gm-primary)] shadow-sm font-semibold"
                                                  : "bg-white/50 dark:bg-zinc-900/50 border-black/5 dark:border-white/5 text-slate-700 dark:text-slate-300 active:bg-black/10 dark:active:bg-white/10"
                                              }`}
                                            >
                                              <div className="flex items-center gap-2.5 min-w-0">
                                                <div
                                                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                                    isSelected
                                                      ? "bg-[var(--gm-primary)] text-white"
                                                      : "bg-black/10 dark:bg-white/10 text-slate-500 dark:text-zinc-400"
                                                  }`}
                                                >
                                                  <Music size={12} />
                                                </div>
                                                <div className="min-w-0">
                                                  <h4 className="text-[11px] font-bold leading-tight truncate">
                                                    {sound.name}
                                                  </h4>
                                                  <p className="text-[9px] opacity-75 leading-normal truncate max-w-[200px]">
                                                    {sound.description}
                                                  </p>
                                                </div>
                                              </div>

                                              <div
                                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                                  isSelected
                                                    ? "border-[var(--gm-primary)]"
                                                    : "border-slate-300 dark:border-zinc-600"
                                                }`}
                                              >
                                                {isSelected && (
                                                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--gm-primary)]" />
                                                )}
                                              </div>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                              {index === 7 && (
                                <>
                                  <div className="flex items-center justify-between mb-1 shrink-0">
                                    <h2 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-wider">
                                      <HelpCircle
                                        size={16}
                                        className="text-[var(--gm-primary)]"
                                      />{" "}
                                      Tutorial Interativo
                                    </h2>
                                  </div>

                                  <div className="flex flex-col gap-3">
                                    <div className="flex flex-col w-full py-2 relative overflow-hidden flex flex-col items-center justify-center text-center h-auto">
                                      <div className="w-12 h-12 rounded-full bg-[var(--gm-primary)]/10 text-[var(--gm-primary)] flex items-center justify-center mb-3">
                                        <Sparkles size={24} />
                                      </div>
                                      <div className="space-y-1.5 mb-5 shrink-0">
                                        <h4 className="text-base font-bold text-slate-800 dark:text-white">
                                          Aprenda em Segundos
                                        </h4>
                                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 max-w-[240px] mx-auto leading-relaxed">
                                          Quer rever as principais funções e
                                          usabilidade do painel principal?
                                          Inicie o assistente virtual passo a
                                          passo agora.
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          localStorage.removeItem(
                                            "gm.tutorialCompleted",
                                          );
                                          localStorage.setItem(
                                            "gm.tutorialForceStart",
                                            "true",
                                          );
                                          navigate("/");
                                        }}
                                        className="gm-btn py-2.5 px-6 flex items-center justify-center gap-2 text-xs w-full transition-all hover:scale-[1.02] active:scale-[0.98]"
                                      >
                                        <Sparkles size={14} />
                                        Iniciar Tutorial
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
