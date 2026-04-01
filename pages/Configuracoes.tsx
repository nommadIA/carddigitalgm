// pages/Configuracoes.tsx
import React, { useEffect, useMemo, useState } from "react";
import Select from "../components/ui/Select";
import { Page } from "../components/ui/Page";
import { Card } from "../components/ui/Card";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSwipeNav } from "../hooks/useSwipeNav";

type Fit = "cover" | "contain";

const TIMBRADO_MODEL_URL =
  "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/Modelo%20Timbrado/TIMBRADO%20GABARITO.png";

export default function Configuracoes() {
  const { tenantId, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingTimbrado, setUploadingTimbrado] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "smartphone">(
    window.innerWidth >= 1024 ? "desktop" : "smartphone"
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

  const pushSupported = "Notification" in window && "serviceWorker" in navigator;
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    pushSupported ? Notification.permission : "denied"
  );

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

  const [brandPrimary, setBrandPrimary] = useState("#ff7b00");
  const [brandAccent, setBrandAccent] = useState("#ff9a1a");
  const [brandBg, setBrandBg] = useState("#0f1117");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [buttonStyle, setButtonStyle] = useState("solid");

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

  // ✅ Aplica as configurações em tempo real para preview (sem persistir no localStorage)
  useEffect(() => {
    if (!loading) {
      applySettingsToDOM(
        {
          brand_primary: brandPrimary,
          brand_accent: brandAccent,
          brand_bg: brandBg,
          font_family: fontFamily,
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
  ]);

  // ✅ Desabilita rolagem vertical na página de configurações (Smartphone)
  useEffect(() => {
    const mainEl = document.querySelector('.gm-main') as HTMLElement;
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

        setBrandPrimary(s.brand_primary || "#ff7b00");
        setBrandAccent(s.brand_accent || "#ff9a1a");
        setBrandBg(s.brand_bg || "#0f1117");
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

        const as = Number(s.app_scale ?? 1.0);
        setAppScale(Number.isFinite(as) && as > 0 ? as : 1.0);
        setOriginalScale(Number.isFinite(as) && as > 0 ? as : 1.0);

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

        app_scale: Math.min(2, Math.max(0.5, appScale)),
        mobile_scale: Math.min(3, Math.max(0.5, mobileScale)),

        button_style: buttonStyle,
        theme_presets: presets,
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

  async function onUploadBackground(file: File) {
    if (!tenantId) return;
    const url = await uploadTenantAsset(tenantId, file, "background");
    setBgUrl(url);
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

  function exportJson() {
    const obj = {
      companyName,
      pixType,
      pixKey,
      brandPrimary,
      brandAccent,
      brandBg,
      fontFamily,
      companyLogoUrl,
      avatarUrl,
      timbradoUrl,
      bgUrl,
      bgFit,
      bgOpacity,
      bgScale,
      bgBlur,
      bgPosX,
      bgPosY,
      appScale,
      mobileScale,
      presets,
    };

    const blob = new Blob([JSON.stringify(obj, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "carddigital-gm-config.json";
    a.click();
    URL.revokeObjectURL(a.href);
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
    { id: "solid", name: "Preenchido Sólido" },
    { id: "neon", name: "Neon Frosted" },
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
      actions={
        <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
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
            className="gm-btn w-auto justify-center !h-10 !px-6 !text-sm !rounded-md !bg-orange-500 !text-white !border-none hover:!bg-orange-600"
            onClick={exportJson}
            title="Exportar JSON"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Exportar JSON</span><span className="inline sm:hidden font-bold">Exportar</span>
          </button>

          <button
            type="button"
            className="gm-btn w-auto justify-center !h-10 !px-6 !text-sm !rounded-md !bg-orange-500 !text-white !border-none hover:!bg-orange-600"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span className="hidden sm:inline">{saving ? "Salvando..." : "Salvar Configurações"}</span><span className="inline sm:hidden font-bold">{saving ? "Salvando..." : "Salvar"}</span>
          </button>
        </div>
      }
    >
      <div className={`flex flex-col ${viewMode === "smartphone" ? "h-[calc(100dvh-170px)]" : ""}`}>
        {/* CONTENT */}
        <div className={`flex-1 ${viewMode === "desktop" ? "pb-24" : "overflow-hidden"} p-0 md:p-6 lg:p-8 glass-scrollbar`}>
          {loading ? (
            <Card className="text-center p-10">Carregando...</Card>
          ) : viewMode === "desktop" ? (
            <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 pb-6 items-stretch">
              
              {/* ROW 1 */}
              <div className="flex flex-col h-full">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Palette size={20} className="text-slate-400" /> Personalização
                </h2>
                <Card className="flex-1 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl bg-white dark:bg-slate-800 transition-all duration-300 py-6 px-6 relative overflow-hidden group">
                  <div className="flex flex-col gap-8 h-full">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden flex items-center justify-center relative shrink-0">
                        {uploadingLogo ? (
                          <Loader2 size={24} className="animate-spin text-slate-400" />
                        ) : companyLogoUrl ? (
                          <img src={companyLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon size={24} className="opacity-50 text-slate-400" />
                        )}
                      </div>
                      <label className={`gm-btn w-full max-w-xs py-2 flex items-center justify-center gap-2 cursor-pointer ${uploadingLogo ? "opacity-50 pointer-events-none" : ""}`}>
                        {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={16} />}
                        {uploadingLogo ? "Enviando..." : "Alterar Logo"}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadLogo(f); }} />
                      </label>
                    </div>

                    <div className="h-px bg-slate-200 dark:bg-slate-700 w-full"></div>

                    <div className="space-y-4 flex-1">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nome da empresa</label>
                        <input className="gm-input py-2 text-sm h-10 w-full" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Escala Global (Desktop)</label>
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                          <input type="range" min={0.7} max={3} step={0.05} className="flex-1 h-1.5 accent-[var(--gm-primary)]" value={appScale} onChange={(e) => setAppScale(Number(e.target.value))} />
                          <div className="w-10 text-center font-bold text-xs text-[var(--gm-primary)]">{appScale}x</div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Escala Global (Celular)</label>
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                          <input type="range" min={0.7} max={3} step={0.05} className="flex-1 h-1.5 accent-[var(--gm-primary)]" value={mobileScale} onChange={(e) => setMobileScale(Number(e.target.value))} />
                          <div className="w-10 text-center font-bold text-xs text-[var(--gm-primary)]">{mobileScale}x</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex flex-col h-full">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Paintbrush size={20} className="text-slate-400" /> Cores do App
                </h2>
                <Card className="flex-1 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl bg-white dark:bg-slate-800 transition-all duration-300 py-6 px-6 relative overflow-hidden group">
                  <div className="flex flex-col gap-8 h-full">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 block">Misturador de Cores</label>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700 shrink-0">
                            <input type="color" value={brandPrimary} onChange={(e) => setBrandPrimary(e.target.value)} className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-bold">Cor Principal</div>
                            <div className="text-xs text-slate-500 uppercase">{brandPrimary}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700 shrink-0">
                            <input type="color" value={brandAccent} onChange={(e) => setBrandAccent(e.target.value)} className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-bold">Cor Secundária</div>
                            <div className="text-xs text-slate-500 uppercase">{brandAccent}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700 shrink-0">
                            <input type="color" value={brandBg} onChange={(e) => setBrandBg(e.target.value)} className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-bold">Cor de Fundo</div>
                            <div className="text-xs text-slate-500 uppercase">{brandBg}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-slate-200 dark:bg-slate-700 w-full"></div>

                    <div className="flex-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 block">Estilo dos Botões</label>
                      <div className="grid grid-cols-2 gap-3">
                        {BUTTON_STYLES.map((s) => {
                          const isActive = buttonStyle === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setButtonStyle(s.id)}
                              className={`flex flex-col items-center justify-between p-3 rounded-xl border-2 transition-all h-20 ${
                                isActive ? "border-[var(--gm-primary)] bg-[var(--gm-primary-10)]" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                              }`}
                            >
                              <div className={`w-full py-1.5 text-[10px] font-bold rounded-md flex items-center justify-center ${
                                s.id === "solid" ? "bg-[var(--gm-primary)] text-white" : "bg-transparent border border-[var(--gm-primary)] text-[var(--gm-primary)]"
                              }`}>Preview</div>
                              <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? "text-[var(--gm-primary)]" : "text-slate-500"}`}>
                                {s.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* ROW 2 */}
              <div className="flex flex-col h-full">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <ImageIcon size={20} className="text-slate-400" /> Plano de Fundo
                </h2>
                <Card className="flex-1 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl bg-white dark:bg-slate-800 transition-all duration-300 py-6 px-6 relative overflow-hidden group">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3">
                      <div>
                        <div className="font-semibold text-sm">Plano de fundo</div>
                        <div className="gm-muted text-[10px]">Ative para aparecer no app</div>
                      </div>
                      <button
                        type="button"
                        className={`gm-btn py-1.5 px-3 text-xs`}
                        onClick={() => {
                          setBgEnabled((v) => {
                            const next = !v;
                            if (next && bgOpacity <= 0) setBgOpacity(bgOpacityPrev);
                            else if (!next && bgOpacity > 0) setBgOpacityPrev(bgOpacity);
                            return next;
                          });
                        }}
                      >
                        {bgEnabled ? "Ativo" : "Desativado"}
                      </button>
                    </div>

                    <div className="mt-4 space-y-4 flex-1">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ajuste</label>
                        <Select 
                          className="gm-input py-2 text-sm h-10 w-full" 
                          value={bgFit} 
                          onChange={(val) => setBgFit(String(val) as Fit)}
                          options={[
                            { value: "cover", label: "Cortar (cover)" },
                            { value: "contain", label: "Conter (contain)" }
                          ]}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Opacidade ({Math.round(bgOpacity * 100)}%)</label>
                        <input type="range" min={0} max={1} step={0.01} className="w-full h-1.5 accent-[var(--gm-primary)]" value={bgOpacity} onChange={(e) => setBgOpacity(Number(e.target.value))} />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Zoom ({bgScale}x)</label>
                        <input type="range" min={0.5} max={5} step={0.1} className="w-full h-1.5 accent-[var(--gm-primary)]" value={bgScale} onChange={(e) => setBgScale(Number(e.target.value))} />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Desfoque ({bgBlur}px)</label>
                        <input type="range" min={0} max={24} step={1} className="w-full h-1.5 accent-[var(--gm-primary)]" value={bgBlur} onChange={(e) => setBgBlur(Number(e.target.value))} />
                      </div>

                      <div className="pt-2">
                        {bgUrl && (
                          <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative aspect-video shadow-sm">
                            <img src={bgUrl} alt="Background" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <label className="gm-btn w-full py-2 flex items-center justify-center gap-2 cursor-pointer">
                          <FileImage size={16} />
                          Upload Background
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadBackground(f); }} />
                        </label>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex flex-col h-full">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <CreditCard size={20} className="text-slate-400" /> Dados de Pagamento
                </h2>
                <Card className="flex-1 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl bg-white dark:bg-slate-800 transition-all duration-300 py-6 px-6 relative overflow-hidden group">
                  <div className="flex flex-col gap-6 h-full">
                    <div>
                      <div className="font-bold text-[10px] uppercase tracking-wider text-slate-500 mb-1">Dados de Pagamento (Pix)</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        ✅ QR e “Copia e Cola” gerados aqui funcionam em{" "}
                        <b>qualquer banco</b> (Itaú, Nubank, Caixa, BB, Bradesco,
                        Santander, Inter, etc.)
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Tipo de chave</label>
                        <Select
                          className="gm-input py-2 text-sm h-10 w-full"
                          value={pixType}
                          onChange={(val) => setPixType(String(val))}
                          options={[
                            { value: "CPF", label: "CPF" },
                            { value: "CNPJ", label: "CNPJ" },
                            { value: "EMAIL", label: "E-mail" },
                            { value: "PHONE", label: "Telefone" },
                            { value: "RANDOM", label: "Aleatória" }
                          ]}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Chave Pix</label>
                        <input
                          type="text"
                          className="gm-input py-2 text-sm h-10 w-full"
                          placeholder="Sua chave Pix"
                          value={pixKey}
                          onChange={(e) => setPixKey(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Dica: e-mail deve ser minúsculo e sem espaços (o sistema pode
                      ajustar).
                    </div>

                    {/* ✅ Preview do QR + Copia e Cola */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-4 border-t border-slate-200 dark:border-slate-700 flex-1">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 h-full flex flex-col">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
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

                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 h-full flex flex-col">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                          Pix “Copia e Cola”
                        </div>

                        {!pixPayloadPreview ? (
                          <div className="text-xs text-slate-500 text-center py-8 flex-1 flex items-center justify-center">
                            Informe uma chave Pix para gerar o código.
                          </div>
                        ) : (
                          <div className="flex flex-col h-full justify-between flex-1">
                            <div className="text-[10px] leading-relaxed font-mono break-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-600 dark:text-slate-300 mb-4 max-h-[140px] overflow-y-auto">
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
                              {pixCopied ? <Check size={16} /> : <Copy size={16} />}
                              {pixCopied ? "Copiado!" : "Copiar código"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center mt-2">
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
                  <FileText size={20} className="text-slate-400" /> Timbrado
                </h2>
                <Card className="flex-1 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl bg-white dark:bg-slate-800 transition-all duration-300 py-6 px-6 relative overflow-hidden group">
                  <div className="flex flex-col gap-8 h-full">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 block">Timbrado A4 (PDF/JPG/PNG)</label>
                      <div className="flex items-start gap-6 justify-center">
                        <div className="flex flex-col items-center gap-3 flex-1">
                          <span className="text-[10px] font-semibold text-slate-500">Seu Timbrado</span>
                          <div className="w-24 h-36 rounded bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden flex items-center justify-center relative shrink-0">
                            {uploadingTimbrado ? <Loader2 size={24} className="animate-spin text-slate-400" /> : timbradoUrl ? <img src={timbradoUrl} alt="Timbrado" className="w-full h-full object-cover" /> : <FileText size={32} className="opacity-50 text-slate-400" />}
                          </div>
                          <label className={`gm-btn w-full py-2 flex items-center justify-center gap-2 cursor-pointer ${uploadingTimbrado ? "opacity-50 pointer-events-none" : ""}`}>
                            {uploadingTimbrado ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />}
                            {uploadingTimbrado ? "Enviando..." : "Importar timbrado"}
                            <input type="file" accept="image/*,application/pdf" className="hidden" disabled={uploadingTimbrado} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadTimbrado(f); }} />
                          </label>
                        </div>
                        <div className="flex flex-col items-center gap-3 flex-1">
                          <span className="text-[10px] font-semibold text-slate-500">Gabarito</span>
                          <div className="w-24 h-36 rounded bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden flex items-center justify-center relative shrink-0">
                            <img src={TIMBRADO_MODEL_URL} alt="Gabarito" className="w-full h-full object-cover" />
                          </div>
                          <a href={TIMBRADO_MODEL_URL} target="_blank" rel="noopener noreferrer" className="gm-btn w-full py-2 flex items-center justify-center gap-2">
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
                  <Bell size={20} className="text-slate-400" /> Notificações Push
                </h2>
                <Card className="flex-1 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl bg-white dark:bg-slate-800 transition-all duration-300 py-6 px-4 relative overflow-hidden group flex flex-col items-center justify-center text-center">
                  {/* Background Glow */}
                  <div className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl rounded-full opacity-20 ${pushPermission === "granted" ? "bg-emerald-500" : "bg-amber-500"}`} />
                  
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border-2 transition-all duration-500 ${
                    pushPermission === "granted" 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]" 
                      : "bg-amber-500/10 border-amber-500/30 text-amber-500 animate-pulse"
                  }`}>
                    <Bell size={32} />
                  </div>

                  <div className="space-y-2 mb-6">
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                      {pushPermission === "granted" ? "Notificações Ativas" : "Permissão Necessária"}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                      {pushPermission === "granted" 
                        ? "Você receberá alertas importantes diretamente no seu dispositivo." 
                        : "Ative as notificações para não perder atualizações em tempo real."}
                    </p>
                  </div>

                  {pushPermission !== "granted" && (
                    <button
                      onClick={async () => { const permission = await Notification.requestPermission(); setPushPermission(permission); }}
                      className="gm-btn py-3 px-6 flex items-center justify-center gap-2 text-sm w-full transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Bell size={16} />
                      Permitir Notificações
                    </button>
                  )}

                  <button
                    disabled={testing || pushPermission !== "granted"}
                    onClick={async () => {
                      setTesting(true);
                      if ("serviceWorker" in navigator) {
                        const reg = await navigator.serviceWorker.ready;
                        reg.active?.postMessage("TEST_NOTIFICATION");
                        setTimeout(() => setTesting(false), 1000);
                      }
                    }}
                    className={`gm-btn-soft mt-3 py-3 flex items-center justify-center gap-2 text-sm w-full transition-all ${
                      pushPermission !== "granted" ? "opacity-50 grayscale" : ""
                    }`}
                  >
                    {testing ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
                    {testing ? "Enviando teste..." : "Enviar Notificação de Teste"}
                  </button>
                </Card>
              </div>

            </div>
) : (
        <div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col h-full min-h-0">
          
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
                  style={{ touchAction: 'pan-y' }}
                >
                {[0, 1, 2].map((index) => {
                  const isActive = index === currentScreen;
                  return (
                    <motion.div
                      key={index}
                      className="w-full shrink-0 px-2 flex flex-col justify-start h-full overflow-y-auto no-scrollbar min-h-0 pb-24"
                      animate={{ 
                        filter: isActive ? "blur(0px)" : "blur(4px)", 
                        opacity: isActive ? 1 : 0.5,
                        scale: isActive ? 1 : 0.95
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="w-full flex-shrink-0 flex flex-col gap-6 pb-8">
                        {index === 0 && (
                          <>
                            
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <Palette size={20} className="text-slate-400" /> Personalização
                      </h2>
                    </div>

                    <div className="flex flex-col gap-2 h-auto">
                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-5 px-4 relative overflow-hidden group flex flex-col justify-center h-auto">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden flex items-center justify-center relative shrink-0">
                            {uploadingLogo ? (
                              <Loader2 size={24} className="animate-spin text-slate-400" />
                            ) : companyLogoUrl ? (
                              <img src={companyLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                              <ImageIcon size={24} className="opacity-50 text-slate-400" />
                            )}
                          </div>
                          <label className={`gm-btn w-full py-2 flex items-center justify-center gap-2 cursor-pointer ${uploadingLogo ? "opacity-50 pointer-events-none" : ""}`}>
                            {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={16} />}
                            {uploadingLogo ? "Enviando..." : "Alterar Logo"}
                            <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadLogo(f); }} />
                          </label>
                        </div>
                      </Card>

                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-5 px-4 relative overflow-hidden group flex flex-col justify-center h-auto">
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nome da empresa</label>
                            <input className="gm-input py-2 text-sm h-10" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Escala Global (Desktop)</label>
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                              <input type="range" min={0.7} max={3} step={0.05} className="flex-1 h-1.5 accent-[var(--gm-primary)]" value={appScale} onChange={(e) => setAppScale(Number(e.target.value))} />
                              <div className="w-10 text-center font-bold text-xs text-[var(--gm-primary)]">{appScale}x</div>
                            </div>
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Escala Global (Celular)</label>
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                              <input type="range" min={0.7} max={3} step={0.05} className="flex-1 h-1.5 accent-[var(--gm-primary)]" value={mobileScale} onChange={(e) => setMobileScale(Number(e.target.value))} />
                              <div className="w-10 text-center font-bold text-xs text-[var(--gm-primary)]">{mobileScale}x</div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  
                            
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <ImageIcon size={20} className="text-slate-400" /> Plano de Fundo
                      </h2>
                    </div>

                    <div className="flex flex-col gap-2 h-auto">
                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-5 px-4 relative overflow-hidden group flex flex-col justify-center h-auto">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">Plano de fundo</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">Ative para aparecer no app</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setBgEnabled(!bgEnabled)}
                              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                bgEnabled ? "bg-[var(--gm-primary)] text-white shadow-md shadow-[var(--gm-primary-30)]" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                              }`}
                            >
                              {bgEnabled ? "Ativo" : "Inativo"}
                            </button>
                          </div>



                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex justify-between">
                              <span>Opacidade</span>
                              <span className="text-[var(--gm-primary)]">{Math.round(bgOpacity * 100)}%</span>
                            </label>
                            <input type="range" min={0} max={100} step={1} className="w-full h-2 accent-[var(--gm-primary)]" value={bgOpacity} onChange={(e) => setBgOpacity(Number(e.target.value))} />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex justify-between">
                              <span>Zoom</span>
                              <span className="text-[var(--gm-primary)]">{bgScale}x</span>
                            </label>
                            <input type="range" min={1} max={2} step={0.1} className="w-full h-2 accent-[var(--gm-primary)]" value={bgScale} onChange={(e) => setBgScale(Number(e.target.value))} />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex justify-between">
                              <span>Desfoque</span>
                              <span className="text-[var(--gm-primary)]">{bgBlur}px</span>
                            </label>
                            <input type="range" min={0} max={24} step={1} className="w-full h-2 accent-[var(--gm-primary)]" value={bgBlur} onChange={(e) => setBgBlur(Number(e.target.value))} />
                          </div>

                          <div className="pt-4">
                            <label className="gm-btn w-full py-4 flex items-center justify-center gap-2 cursor-pointer text-base shadow-lg shadow-[var(--gm-primary-20)]">
                              <FileImage size={20} />
                              Upload Background
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadBackground(f); }} />
                            </label>
                          </div>
                        </div>
                      </Card>
                    </div>
                  
                            
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <Paintbrush size={20} className="text-slate-400" /> Cores do App
                      </h2>
                    </div>

                    <div className="flex flex-col gap-2 h-auto">
                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-5 px-4 relative overflow-hidden group flex flex-col justify-center h-auto">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 block">Misturador de Cores</label>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700 shrink-0">
                              <input type="color" value={brandPrimary} onChange={(e) => setBrandPrimary(e.target.value)} className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-bold">Cor Principal</div>
                              <div className="text-xs text-slate-500 uppercase">{brandPrimary}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700 shrink-0">
                              <input type="color" value={brandAccent} onChange={(e) => setBrandAccent(e.target.value)} className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-bold">Cor Secundária</div>
                              <div className="text-xs text-slate-500 uppercase">{brandAccent}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700 shrink-0">
                              <input type="color" value={brandBg} onChange={(e) => setBrandBg(e.target.value)} className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-bold">Cor de Fundo</div>
                              <div className="text-xs text-slate-500 uppercase">{brandBg}</div>
                            </div>
                          </div>
                        </div>
                      </Card>

                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-5 px-4 relative overflow-hidden group flex flex-col justify-center h-auto">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 block">Estilo dos Botões</label>
                        <div className="grid grid-cols-2 gap-3">
                          {BUTTON_STYLES.map((s) => {
                            const isActive = buttonStyle === s.id;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setButtonStyle(s.id)}
                                className={`flex flex-col items-center justify-between p-3 rounded-xl border-2 transition-all h-20 ${
                                  isActive ? "border-[var(--gm-primary)] bg-[var(--gm-primary-10)]" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                                }`}
                              >
                                <div className={`w-full py-1.5 text-[10px] font-bold rounded-md flex items-center justify-center ${
                                  s.id === "solid" ? "bg-[var(--gm-primary)] text-white" : "bg-transparent border border-[var(--gm-primary)] text-[var(--gm-primary)]"
                                }`}>Preview</div>
                                <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? "text-[var(--gm-primary)]" : "text-slate-500"}`}>
                                  {s.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </Card>
                    </div>
                  
                            
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <Type size={20} className="text-slate-400" /> Fonte do App
                      </h2>
                    </div>

                    <div className="flex flex-col gap-2 h-auto">
                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-5 px-4 relative overflow-hidden group flex flex-col justify-center h-auto">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 block text-center">Família de Fonte</label>
                        <div className="grid grid-cols-2 gap-3">
                          {["Inter", "Roboto", "Poppins", "Montserrat", "Open Sans", "Lato", "Oswald", "Raleway"].map((font) => {
                            const isActive = fontFamily === font;
                            return (
                              <button
                                key={font}
                                type="button"
                                onClick={() => setFontFamily(font)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all h-20 ${
                                  isActive ? "border-[var(--gm-primary)] bg-[var(--gm-primary-10)]" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                                }`}
                                style={{ fontFamily: font }}
                              >
                                <span className={`text-base font-medium ${isActive ? "text-[var(--gm-primary)]" : "text-slate-700 dark:text-slate-300"}`}>
                                  {font}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </Card>
                    </div>
                  
                          </>
                        )}
                        {index === 1 && (
                          <>
                            
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <CreditCard size={20} className="text-slate-400" /> Pix (Pagamento)
                      </h2>
                    </div>

                    <div className="flex flex-col gap-2 h-auto">
                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-5 px-4 relative overflow-hidden group flex flex-col justify-center h-auto">
                        <div className="space-y-2">
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Tipo de Chave</label>
                            <Select 
                              className="gm-input py-2 text-sm h-10 w-full" 
                              value={pixType} 
                              onChange={(val) => setPixType(String(val))}
                              options={[
                                { value: "CPF", label: "CPF" },
                                { value: "CNPJ", label: "CNPJ" },
                                { value: "EMAIL", label: "E-mail" },
                                { value: "PHONE", label: "Telefone" },
                                { value: "RANDOM", label: "Aleatória" }
                              ]}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Chave Pix</label>
                            <input className="gm-input py-2 text-sm h-10 w-full" value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="Sua chave Pix" />
                          </div>

                          {pixQrPreview && (
                            <div className="mt-4 flex flex-col items-center justify-center p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 w-full">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">QR Code Pix</div>
                              <img src={pixQrPreview} alt="QR Pix" className="w-32 h-32 rounded-xl shadow-md mb-4 object-contain bg-white p-2" />
                              <button
                                  type="button"
                                  className="gm-btn w-full justify-center py-3 text-sm font-bold shadow-lg shadow-[var(--gm-primary-20)]"
                                  onClick={() => {
                                    const a = document.createElement("a");
                                    a.href = pixQrPreview;
                                    a.download = "pix_qr_configuracoes.png";
                                    a.click();
                                  }}
                                >
                                  <Download size={14} />
                                  Baixar QR
                                </button>
                            </div>
                          )}

                        </div>
                      </Card>
                    </div>
                  
                            
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <FileText size={20} className="text-slate-400" /> Timbrado
                      </h2>
                    </div>

                    <div className="flex flex-col gap-2 h-auto">
                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-5 px-4 relative overflow-hidden group flex flex-col justify-center h-auto">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start gap-2 justify-center">
                            <div className="flex flex-col items-center gap-2 flex-1">
                              <span className="text-[10px] font-semibold text-white bg-slate-800/50 px-2 py-1 rounded-md">Seu Timbrado</span>
                              <div className="w-36 h-52 rounded bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden flex items-center justify-center relative shrink-0">
                                {uploadingTimbrado ? <Loader2 size={24} className="animate-spin text-slate-400" /> : timbradoUrl ? <img src={timbradoUrl} alt="Timbrado" className="w-full h-full object-cover" /> : <FileText size={32} className="opacity-50 text-slate-400" />}
                              </div>
                              <label className={`gm-btn w-full py-2 flex items-center justify-center gap-2 cursor-pointer ${uploadingTimbrado ? "opacity-50 pointer-events-none" : ""}`}>
                                {uploadingTimbrado ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />}
                                {uploadingTimbrado ? "Enviando..." : "Importar"}
                                <input type="file" accept="image/*,application/pdf" className="hidden" disabled={uploadingTimbrado} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadTimbrado(f); }} />
                              </label>
                            </div>
                            <div className="flex flex-col items-center gap-2 flex-1">
                              <span className="text-[10px] font-semibold text-white bg-slate-800/50 px-2 py-1 rounded-md">Gabarito</span>
                              <div className="w-36 h-52 rounded bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden flex items-center justify-center relative shrink-0">
                                <img src={TIMBRADO_MODEL_URL} alt="Gabarito" className="w-full h-full object-cover" />
                              </div>
                              <a href={TIMBRADO_MODEL_URL} target="_blank" rel="noopener noreferrer" className="gm-btn w-full py-2 flex items-center justify-center gap-2">
                                <Download size={14} />
                                Baixar
                              </a>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  
                          </>
                        )}
                        {index === 2 && (
                          <>
                            
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <Bell size={20} className="text-slate-400" /> Notificações Push
                      </h2>
                    </div>

                    <div className="flex flex-col gap-2 h-auto">
                      <Card className="!border-none !shadow-none bg-white dark:bg-slate-800 transition-all duration-300 py-3 px-3 relative overflow-hidden group flex flex-col items-center justify-center text-center h-auto">
                        {/* Background Glow */}
                        <div className={`absolute -top-10 -right-10 w-48 h-48 blur-3xl rounded-full opacity-20 ${pushPermission === "granted" ? "bg-emerald-500" : "bg-amber-500"}`} />
                        
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 border-2 transition-all duration-500 ${
                          pushPermission === "granted" 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]" 
                            : "bg-amber-500/10 border-amber-500/30 text-amber-500 animate-pulse"
                        }`}>
                          <Bell size={48} />
                        </div>

                        <div className="space-y-3 mb-8">
                          <h4 className="text-2xl font-bold text-slate-800 dark:text-white">
                            {pushPermission === "granted" ? "Notificações Ativas" : "Permissão Necessária"}
                          </h4>
                          <p className="text-sm text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                            {pushPermission === "granted" 
                              ? "Você receberá alertas importantes diretamente no seu dispositivo." 
                              : "Ative as notificações para não perder atualizações em tempo real."}
                          </p>
                        </div>

                        {pushPermission !== "granted" && (
                          <button
                            onClick={async () => {
                              const permission = await Notification.requestPermission();
                              setPushPermission(permission);
                            }}
                            className="gm-btn w-full py-4 text-base font-bold shadow-lg shadow-[var(--gm-primary-20)]"
                          >
                            Permitir Notificações
                          </button>
                        )}

                        <button
                          disabled={testing || pushPermission !== "granted"}
                          onClick={async () => {
                            setTesting(true);
                            if ("serviceWorker" in navigator) {
                              const reg = await navigator.serviceWorker.ready;
                              reg.active?.postMessage("TEST_NOTIFICATION");
                              setTimeout(() => setTesting(false), 1000);
                            }
                          }}
                          className={`gm-btn-soft mt-4 py-4 flex items-center justify-center gap-2 text-base font-bold w-full transition-all ${
                            pushPermission !== "granted" ? "opacity-50 grayscale" : ""
                          }`}
                        >
                          {testing ? <Loader2 size={20} className="animate-spin" /> : <Bell size={20} />}
                          {testing ? "Enviando teste..." : "Enviar Notificação de Teste"}
                        </button>
                      </Card>
                    </div>
                  
                          </>
                        )}
                      </div>
                    </motion.div>
                  )
                })}

                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* PAGINATION DOTS */}
          <div className="flex justify-center fixed left-0 right-0 z-[110] pointer-events-none pagination-dots-container">
            <div className="flex gap-1.5 pointer-events-auto">
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDirection(idx > currentScreen ? 1 : -1);
                    setCurrentScreen(idx);
                  }}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    idx === currentScreen ? "w-4 bg-[#ff6600] shadow-[0_0_8px_#ff6600]" : "w-1 bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </Page>
  );
}