import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { Card } from "../components/ui/Card";
import { Lock, Mail, Loader2, Eye, EyeOff, ShieldCheck, Check, UserCheck, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "../lib/supabase";
import { readSettingsLocal } from "../lib/settings";
import SecurityVerifier from "../components/auth/SecurityVerifier";
import { isPinSecurityActive, setSessionUnlocked } from "../lib/securityPin";
import PinLockModal from "../components/auth/PinLockModal";
import {
  isEffectActiveFor,
  getEffectFor,
  getEffectStrength,
  readBgEffectConfig,
  BgEffectConfig,
} from "../lib/backgroundEffects";

const DEFAULT_ARCH_WALLPAPER =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80";

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.innerWidth <= 768 ||
    window.matchMedia("(max-width: 768px)").matches ||
    window.matchMedia("(orientation: portrait) and (max-width: 1024px)").matches
  );
}

function resolveAppBackground(forceMobile?: boolean): {
  url: string;
  isVideo: boolean;
  fit: string;
  pos_x: string;
  pos_y: string;
  scale: number;
} {
  const isMobile = forceMobile !== undefined ? forceMobile : isMobileDevice();
  try {
    const s = readSettingsLocal();
    // No smartphone, prioriza o background e configurações mobile dedicadas
    const candidate = isMobile
      ? (s?.mobile_app_background_url || s?.app_background_url)
      : (s?.app_background_url || s?.mobile_app_background_url);

    if (candidate && typeof candidate === "string" && candidate.trim().length > 0) {
      const cleanUrl = candidate.trim();
      const isVideo =
        cleanUrl.toLowerCase().endsWith(".mp4") ||
        cleanUrl.toLowerCase().endsWith(".webm");
      return {
        url: cleanUrl,
        isVideo,
        fit: isMobile
          ? (s?.mobile_app_background_fit || s?.app_background_fit || "cover")
          : (s?.app_background_fit || "cover"),
        pos_x: isMobile
          ? (s?.mobile_app_background_pos_x || s?.app_background_pos_x || "50%")
          : (s?.app_background_pos_x || "50%"),
        pos_y: isMobile
          ? (s?.mobile_app_background_pos_y || s?.app_background_pos_y || "50%")
          : (s?.app_background_pos_y || "50%"),
        scale: isMobile
          ? Number(s?.mobile_app_background_scale ?? s?.app_background_scale ?? 1.15)
          : Number(s?.app_background_scale ?? 1.1),
      };
    }
  } catch {}

  if (typeof window !== "undefined") {
    try {
      const root = document.documentElement;
      const cssMobileBg = isMobile ? getComputedStyle(root).getPropertyValue("--gm-mobile-bg-url")?.trim() : null;
      const cssBg = cssMobileBg && cssMobileBg !== "none" && cssMobileBg.startsWith("url(")
        ? cssMobileBg
        : getComputedStyle(root).getPropertyValue("--gm-app-bg-url")?.trim();

      if (cssBg && cssBg !== "none" && cssBg.startsWith("url(")) {
        const match = cssBg.match(/url\(["']?(.*?)["']?\)/);
        if (match && match[1]) {
          const isVideo =
            match[1].toLowerCase().endsWith(".mp4") ||
            match[1].toLowerCase().endsWith(".webm");
          return {
            url: match[1],
            isVideo,
            fit: isMobile
              ? (getComputedStyle(root).getPropertyValue("--gm-mobile-bg-fit")?.trim() || "cover")
              : (getComputedStyle(root).getPropertyValue("--gm-app-bg-fit")?.trim() || "cover"),
            pos_x: isMobile
              ? (getComputedStyle(root).getPropertyValue("--gm-mobile-bg-pos-x")?.trim() || "50%")
              : (getComputedStyle(root).getPropertyValue("--gm-app-bg-pos-x")?.trim() || "50%"),
            pos_y: isMobile
              ? (getComputedStyle(root).getPropertyValue("--gm-mobile-bg-pos-y")?.trim() || "50%")
              : (getComputedStyle(root).getPropertyValue("--gm-app-bg-pos-y")?.trim() || "50%"),
            scale: isMobile
              ? Number(getComputedStyle(root).getPropertyValue("--gm-mobile-bg-scale")?.trim() || 1.15)
              : 1.1,
          };
        }
      }
    } catch {}
  }

  return {
    url: DEFAULT_ARCH_WALLPAPER,
    isVideo: false,
    fit: "cover",
    pos_x: "50%",
    pos_y: "50%",
    scale: isMobile ? 1.15 : 1.1,
  };
}

export default function Login() {
  const { signInWithPassword, checked, user } = useAuth();
  const navigate = useNavigate();

  // Detecção de primeiro login / usuário novo vs cadastrado
  const [savedProfile, setSavedProfile] = useState<{
    email: string;
    logo: string;
    companyName: string;
    hasLoggedInOnce: boolean;
  }>(() => {
    try {
      const storedEmail = localStorage.getItem("gm_last_email") || localStorage.getItem("gm.last_email") || "";
      const storedLogo = localStorage.getItem("gm_last_user_logo") || "";
      const storedCompany = localStorage.getItem("gm_last_user_company") || "";
      const hasOnce = localStorage.getItem("gm_has_logged_in_once") === "true" || Boolean(storedEmail);
      return {
        email: storedEmail,
        logo: storedLogo,
        companyName: storedCompany,
        hasLoggedInOnce: hasOnce,
      };
    } catch {
      return { email: "", logo: "", companyName: "", hasLoggedInOnce: false };
    }
  });

  const [email, setEmail] = useState(() => savedProfile.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Estados da proteção por PIN
  const [protectWithPin, setProtectWithPin] = useState(false);
  const [showPinVerifyModal, setShowPinVerifyModal] = useState(false);
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);

  // Background oficial do App e Efeitos Dinâmicos de PIN e Segurança
  const [isMobile, setIsMobile] = useState<boolean>(() => isMobileDevice());
  const [bgInfo, setBgInfo] = useState(() => resolveAppBackground());
  const [bgEffect, setBgEffect] = useState<BgEffectConfig>(() => readBgEffectConfig());
  const [lockMouse, setLockMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const isLockEffectActive = isEffectActiveFor("lockscreen", bgEffect);
  const lockEffectType = getEffectFor("lockscreen", bgEffect);

  useEffect(() => {
    setBgInfo(resolveAppBackground());
    const handleUpdate = () => {
      const mobile = isMobileDevice();
      setIsMobile(mobile);
      setBgInfo(resolveAppBackground(mobile));
    };
    const handleBgEffectUpdate = (e: any) => {
      if (e?.detail) setBgEffect(e.detail);
      else setBgEffect(readBgEffectConfig());
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("gm:settings_updated", handleUpdate);
    window.addEventListener("gm:theme_synced", handleUpdate);
    window.addEventListener("gm:settings_updated", handleBgEffectUpdate);
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("orientationchange", handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("gm:settings_updated", handleUpdate);
      window.removeEventListener("gm:theme_synced", handleUpdate);
      window.removeEventListener("gm:settings_updated", handleBgEffectUpdate);
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("orientationchange", handleUpdate);
    };
  }, []);

  const settings = useMemo(() => readSettingsLocal(), []);

  const isPinActiveForUser = useMemo(() => {
    return isPinSecurityActive(email.trim());
  }, [email]);

  useEffect(() => {
    if (checked && user && !showPinSetupModal) navigate("/", { replace: true });
  }, [checked, user, showPinSetupModal, navigate]);

  const canSubmit = useMemo(
    () => {
      if (isForgotPassword) return email.trim().length > 3 && isVerified;
      return email.trim().length > 3 && password.length >= 3 && isVerified;
    },
    [email, password, isForgotPassword, isVerified]
  );

  // Parallax do mouse quando ativo na tela de bloqueio
  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    if (!isLockEffectActive || lockEffectType !== "mouse") return;
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    setLockMouse({ x: nx * 14, y: -ny * 10 });
  };

  // Animação dinâmica do background adaptada para celular e computador
  // Mantém o plano de fundo sempre vivo, cinematográfico e fluido em 100% da tela do smartphone
  const getBgAnimationConfig = () => {
    const lockStrength = (getEffectStrength("lockscreen", lockEffectType, bgEffect) || 100) / 100;
    // Efeito configurado ou padrão cinemático contínuo para nunca ficar estático
    const effect = isLockEffectActive ? lockEffectType : "drift";
    // Em celular touch screen, o efeito mouse converte-se organicamente para deriva contínua
    const effectiveEffect = (isMobile && effect === "mouse") ? "drift" : effect;
    const baseScale = isMobile ? Math.max(1.16, bgInfo.scale || 1.16) : Math.max(1.10, bgInfo.scale || 1.10);

    switch (effectiveEffect) {
      case "mouse":
        return {
          animate: {
            scale: baseScale + 0.05 * lockStrength,
            x: lockMouse.x * lockStrength,
            y: lockMouse.y * lockStrength,
            rotate: 0,
            opacity: 1,
          },
          transition: { type: "spring", stiffness: 120, damping: 20 },
        };
      case "pulse":
        return {
          animate: {
            scale: [baseScale, baseScale + (isMobile ? 0.08 : 0.065) * lockStrength, baseScale],
            opacity: [0.92, 1, 0.92],
            x: 0,
            y: 0,
            rotate: 0,
          },
          transition: {
            duration: isMobile ? 11 : 12,
            repeat: Infinity,
            ease: "easeInOut",
          },
        };
      case "drift":
      default:
        return {
          animate: {
            scale: [
              baseScale,
              baseScale + (isMobile ? 0.07 : 0.06) * lockStrength,
              baseScale + (isMobile ? 0.03 : 0.04) * lockStrength,
              baseScale + (isMobile ? 0.07 : 0.06) * lockStrength,
              baseScale,
            ],
            x: ["0%", `${(-2.2 * lockStrength).toFixed(2)}%`, `${(1.8 * lockStrength).toFixed(2)}%`, `${(-1.2 * lockStrength).toFixed(2)}%`, "0%"],
            y: ["0%", `${(1.8 * lockStrength).toFixed(2)}%`, `${(-1.6 * lockStrength).toFixed(2)}%`, `${(-2.0 * lockStrength).toFixed(2)}%`, "0%"],
            rotate: 0,
            opacity: 1,
          },
          transition: {
            duration: isMobile ? 24 : 28,
            repeat: Infinity,
            ease: "easeInOut",
          },
        };
      case "orbit":
        return {
          animate: {
            scale: [baseScale, baseScale + 0.05 * lockStrength, baseScale, baseScale + 0.05 * lockStrength, baseScale],
            x: ["0%", `${(1.6 * lockStrength).toFixed(2)}%`, "0%", `${(-1.6 * lockStrength).toFixed(2)}%`, "0%"],
            y: [`${(-1.8 * lockStrength).toFixed(2)}%`, "0%", `${(1.8 * lockStrength).toFixed(2)}%`, "0%", `${(-1.8 * lockStrength).toFixed(2)}%`],
            rotate: isMobile ? [0, 0.3 * lockStrength, 0, -0.3 * lockStrength, 0] : [0, 0.6 * lockStrength, 0, -0.6 * lockStrength, 0],
            opacity: 1,
          },
          transition: {
            duration: isMobile ? 20 : 22,
            repeat: Infinity,
            ease: "easeInOut",
          },
        };
      case "aurora":
        return {
          animate: {
            scale: [baseScale, baseScale + 0.05 * lockStrength, baseScale],
            x: [`${(-1.2 * lockStrength).toFixed(2)}%`, `${(1.2 * lockStrength).toFixed(2)}%`, `${(-1.2 * lockStrength).toFixed(2)}%`],
            y: [`${(-1 * lockStrength).toFixed(2)}%`, `${(1 * lockStrength).toFixed(2)}%`, `${(-1 * lockStrength).toFixed(2)}%`],
            rotate: 0,
            opacity: 1,
          },
          transition: {
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
          },
        };
      case "prism":
        return {
          animate: {
            scale: [baseScale, baseScale + 0.04 * lockStrength, baseScale + 0.02 * lockStrength, baseScale + 0.04 * lockStrength, baseScale],
            rotate: isMobile ? [0, 0.25 * lockStrength, 0, -0.25 * lockStrength, 0] : [0, 0.4 * lockStrength, 0, -0.4 * lockStrength, 0],
            x: ["0%", `${(1.2 * lockStrength).toFixed(2)}%`, `${(-1 * lockStrength).toFixed(2)}%`, "0%"],
            y: ["0%", `${(-1.2 * lockStrength).toFixed(2)}%`, `${(1.2 * lockStrength).toFixed(2)}%`, "0%"],
            opacity: [0.95, 1, 0.95],
          },
          transition: {
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          },
        };
    }
  };

  const bgAnim = getBgAnimationConfig();

  async function executeActualLogin() {
    setIsLoading(true);
    try {
      await signInWithPassword(email.trim(), password);
      setSessionUnlocked(true);

      // Salva dados de login para customizar a tela a partir da primeira vez
      try {
        localStorage.setItem("gm_has_logged_in_once", "true");
        localStorage.setItem("gm_last_email", email.trim());
        localStorage.setItem("gm.last_email", email.trim());
        if (settings?.company_logo_url) {
          localStorage.setItem("gm_last_user_logo", settings.company_logo_url);
        }
        if (settings?.company_name) {
          localStorage.setItem("gm_last_user_company", settings.company_name);
        }
      } catch {}

      // Se o usuário solicitou proteger com PIN e ainda não tem
      if (protectWithPin && !isPinActiveForUser) {
        setShowPinSetupModal(true);
        return;
      }

      navigate("/", { replace: true });
    } catch (err: any) {
      let msg = err?.message || "Erro ao conectar.";
      
      if (msg.includes("Invalid login credentials")) {
        msg = "E-mail ou senha incorretos.";
      } else if (msg.includes("Email not confirmed")) {
        msg = "Por favor, confirme seu e-mail antes de fazer login.";
      }
      
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  // Alternar para nova conta ou limpar perfil salvo
  const handleSwitchAccount = () => {
    setEmail("");
    setPassword("");
    setSavedProfile({
      email: "",
      logo: "",
      companyName: "",
      hasLoggedInOnce: false,
    });
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (isForgotPassword) {
      setIsLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/`,
        });
        if (error) throw error;
        setSuccessMessage("Link de recuperação enviado! Verifique seu e-mail.");
      } catch (err: any) {
        setErrorMessage(err?.message || "Erro ao enviar e-mail de recuperação.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Se este dispositivo já possui um PIN ativo para este usuário, exige o PIN primeiro
    if (isPinActiveForUser) {
      setShowPinVerifyModal(true);
      return;
    }

    await executeActualLogin();
  }

  const handlePinVerifySuccess = async () => {
    setShowPinVerifyModal(false);
    await executeActualLogin();
  };

  const handlePinSetupSuccess = () => {
    setShowPinSetupModal(false);
    setSessionUnlocked(true);
    navigate("/", { replace: true });
  };

  if (!checked) {
    return (
      <div className="gm-layout flex-col items-center justify-center p-6 min-h-screen">
        <Card className="gm-compact text-center" style={{ maxWidth: 420, width: "100%" }}>
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" />
            Carregando...
          </div>
        </Card>
      </div>
    );
  }

  const effectiveLogo = savedProfile.logo || settings?.company_logo_url;
  const isReturningUser = savedProfile.hasLoggedInOnce;

  return (
    <div 
      onPointerMove={handlePointerMove}
      className="gm-login-page-root min-h-[100dvh] h-[100dvh] w-full flex items-center justify-center p-3 sm:p-5 bg-[#0b0e14] relative overflow-hidden selection:bg-[var(--gm-primary)] selection:text-white"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        height: "100dvh",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* ========================================================================= */}
      {/* PLANO DE FUNDO ANIMADO DO APP - SE ESTENDE E ADAPTA AO FORMATO SMARTPHONE */}
      {/* ========================================================================= */}
      <div 
        className="gm-login-bg-container fixed -inset-[6%] sm:-inset-[4%] pointer-events-none overflow-hidden z-0 flex items-center justify-center select-none" 
        style={{
          position: "fixed",
          top: "-6%",
          left: "-6%",
          right: "-6%",
          bottom: "-6%",
          width: "112%",
          height: "112%",
          minHeight: "112dvh",
          minWidth: "112dvw",
          touchAction: "none",
        }}
        aria-hidden="true"
      >
        {/* Camada Aurora quando ativa na tela de bloqueio */}
        {isLockEffectActive && lockEffectType === "aurora" && (
          <div className="gm-bg-aurora-layer" />
        )}

        {/* Camada Prisma quando ativa na tela de bloqueio */}
        {isLockEffectActive && lockEffectType === "prism" && (
          <div className="gm-bg-prism-layer" />
        )}

        <motion.div
          animate={bgAnim.animate}
          transition={bgAnim.transition as any}
          className="w-full h-full will-change-transform"
          style={{ 
            transformOrigin: "center center",
            width: "100%",
            height: "100%",
          }}
        >
          {bgInfo.isVideo ? (
            <video
              src={bgInfo.url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{
                width: "100%",
                height: "100%",
                objectFit: (bgInfo.fit as any) || "cover",
                objectPosition: `${bgInfo.pos_x} ${bgInfo.pos_y}`,
              }}
            />
          ) : (
            <div
              className="w-full h-full transition-transform duration-1000"
              style={{
                width: "100%",
                height: "100%",
                backgroundImage: `url("${bgInfo.url}")`,
                backgroundSize: bgInfo.fit || "cover",
                backgroundPosition: `${bgInfo.pos_x} ${bgInfo.pos_y}`,
                backgroundRepeat: "no-repeat",
              }}
            />
          )}
        </motion.div>

        {/* Overlay escuro balanceado para garantir legibilidade e contraste com o card */}
        <div className="absolute inset-0 bg-black/60 sm:bg-black/55 backdrop-blur-[2px] pointer-events-none" />

        {/* Gradiente vertical de profundidade adaptado ao formato alongado do smartphone */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/65 pointer-events-none" />

        {/* Luzes de refração e profundidade Apple Glass adaptadas ao formato vertical da tela */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] sm:w-[500px] h-[72vw] sm:h-[500px] bg-gradient-to-br from-[var(--gm-primary)]/20 via-orange-600/10 to-transparent rounded-full blur-3xl opacity-80 pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[85vw] sm:w-[450px] h-[65vw] sm:h-[450px] bg-gradient-to-tr from-[var(--gm-primary)]/15 via-amber-500/10 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="gm-login-card-square gm-login-card-compact relative z-10 m-auto flex flex-col justify-center"
        style={{
          width: "100%",
          maxWidth: "380px",
          marginLeft: "auto",
          marginRight: "auto",
          boxSizing: "border-box",
        }}
      >
        <div
          className="gm-login-card-square gm-login-card-compact apple-glass-card p-4.5 sm:p-5.5 relative overflow-hidden rounded-[26px] sm:rounded-[28px] border border-white/15 shadow-2xl backdrop-blur-2xl"
          style={{
            width: "100%",
            maxWidth: "380px",
            maxHeight: "calc(100dvh - 24px)",
            marginLeft: "auto",
            marginRight: "auto",
            boxSizing: "border-box",
          }}
        >
          {/* CABEÇALHO COM LOGO - MINIATURA E TEXTOS AMPLIADOS PARA DESTAQUE VISUAL E HIERARQUIA AMIGÁVEL */}
          <div className="flex flex-col items-center mb-3 sm:mb-3.5">
            <motion.div 
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 180 }}
              className="relative mb-2.5 flex items-center justify-center"
            >
              <div className="gm-logo-box gm-login-logo-box" style={{ width: '64px', height: '64px' }}>
                <div className="gm-logo-glow-wrapper"></div>
                <div className="gm-logo-border-wrapper" style={{ borderRadius: '18px' }}></div>
                {effectiveLogo ? (
                  <img
                    src={effectiveLogo}
                    alt={savedProfile.companyName || settings?.company_name || "Logo"}
                    className="gm-logo"
                    style={{ borderRadius: '16px' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--gm-primary)] font-black text-2xl uppercase tracking-wider relative z-10">
                    {savedProfile.companyName || settings?.company_name ? (savedProfile.companyName || settings?.company_name).substring(0, 2) : "GM"}
                  </div>
                )}
              </div>
            </motion.div>

            <div className="flex items-center justify-center text-center leading-tight gap-1.5">
              <span className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
                {savedProfile.companyName || settings?.company_name ? (
                  savedProfile.companyName || settings?.company_name
                ) : (
                  <>CardDigital <span className="text-xl sm:text-2xl font-black text-[var(--gm-primary)]">GM</span></>
                )}
              </span>
            </div>
            <div className="text-xs sm:text-[13px] text-slate-300/90 font-medium tracking-wide mt-1">
              Acesso Restrito
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-red-200 text-xs sm:text-sm mb-2">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2.5 text-green-200 text-xs sm:text-sm mb-2">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3 sm:space-y-3.5">
            {/* PRÉVIA DE EMAIL / CAMPO DE EMAIL */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-0.5">
                <label className="gm-label text-xs sm:text-[13px] uppercase tracking-wider font-bold text-slate-300">
                  E-mail
                </label>
                {isReturningUser && savedProfile.email && (
                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="text-xs sm:text-[13px] text-[var(--gm-primary)] hover:underline font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Entrar com outro e-mail"
                  >
                    <RefreshCw size={13} />
                    <span>Trocar conta</span>
                  </button>
                )}
              </div>

              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                  {isReturningUser && savedProfile.email ? (
                    <UserCheck size={18} className="text-[var(--gm-primary)]" />
                  ) : (
                    <Mail size={18} className="text-slate-400 group-focus-within:text-[var(--gm-primary)] transition-colors" />
                  )}
                </div>
                <input
                  className="apple-glass-input !pl-12 !pr-4 h-11 sm:h-12 text-sm sm:text-base focus:border-[var(--gm-primary)] !outline-none !ring-0 focus:!ring-0 focus:!outline-none transition-all rounded-xl w-full text-white placeholder:text-zinc-500 placeholder:text-sm"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>

              {isReturningUser && savedProfile.email && (
                <div className="flex items-center gap-1.5 px-1 pt-0.5 text-xs text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Conta salva neste dispositivo</span>
                </div>
              )}
            </div>

            {!isForgotPassword && (
              <div className="space-y-1">
                <div className="flex justify-between items-center px-0.5">
                  <label className="gm-label text-xs sm:text-[13px] uppercase tracking-wider font-bold text-slate-300">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className="text-xs sm:text-[13px] text-[var(--gm-primary)] hover:underline font-medium cursor-pointer"
                    tabIndex={-1}
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                    <Lock size={18} className="text-slate-400 group-focus-within:text-[var(--gm-primary)] transition-colors" />
                  </div>
                  <input
                    className="apple-glass-input !pl-12 !pr-11 h-11 sm:h-12 text-sm sm:text-base focus:border-[var(--gm-primary)] !outline-none !ring-0 focus:!ring-0 focus:!outline-none transition-all rounded-xl w-full text-white placeholder:text-zinc-500 placeholder:text-sm"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors focus:outline-none p-1.5 cursor-pointer touch-manipulation"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {!isForgotPassword && (
              <div>
                <div
                  onClick={() => {
                    if (!isPinActiveForUser) {
                      setProtectWithPin(!protectWithPin);
                    }
                  }}
                  className={`w-full rounded-2xl px-3.5 py-2.5 flex items-center justify-between select-none transition-all duration-300 relative group touch-manipulation ${
                    !isPinActiveForUser ? "cursor-pointer" : ""
                  } ${
                    isPinActiveForUser || protectWithPin
                      ? "bg-gradient-to-r from-[var(--gm-primary,#FE540B)]/[0.14] via-orange-500/[0.08] to-transparent border border-[var(--gm-primary,#FE540B)]/50 shadow-[0_0_18px_-4px_rgba(254,84,11,0.3)]"
                      : "bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-white/20"
                  }`}
                >
                  {/* LADO ESQUERDO: Ícone e Título com visual de segurança do dispositivo */}
                  <div className="flex items-center gap-2.5 min-w-0 pr-1">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isPinActiveForUser || protectWithPin
                          ? "bg-[var(--gm-primary,#FE540B)] text-white shadow-sm shadow-orange-500/40"
                          : "bg-white/[0.06] text-zinc-400 group-hover:text-zinc-200 border border-white/10"
                      }`}
                    >
                      <Lock size={15} className="transition-transform duration-200" />
                    </div>

                    <div className="flex flex-col text-left justify-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white text-sm sm:text-[14.5px] font-semibold tracking-tight">
                          Proteger com PIN
                        </span>
                        {(isPinActiveForUser || protectWithPin) && (
                          <span className="inline-flex items-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--gm-primary,#FE540B)]/20 text-[var(--gm-primary,#FE540B)] border border-[var(--gm-primary,#FE540B)]/30">
                            Ativo
                          </span>
                        )}
                      </div>
                      {!isPinActiveForUser && (
                        <span className="text-xs sm:text-[12.5px] text-zinc-300 font-normal leading-tight mt-0.5">
                          Exigir 4 dígitos neste aparelho
                        </span>
                      )}
                    </div>
                  </div>

                  {/* LADO DIREITO: Switch Toggle Estilo Apple / Hardware */}
                  <div className="shrink-0 flex items-center">
                    <div
                      className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 flex items-center ${
                        isPinActiveForUser || protectWithPin
                          ? "bg-[var(--gm-primary,#FE540B)] shadow-[0_0_10px_rgba(254,84,11,0.5)] justify-end"
                          : "bg-zinc-800 border border-white/15 justify-start"
                      }`}
                    >
                      <motion.div
                        layout
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center"
                      >
                        {(isPinActiveForUser || protectWithPin) && (
                          <div className="w-2 h-2 rounded-full bg-[var(--gm-primary,#FE540B)]" />
                        )}
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Verificador de Segurança de Login (Estilo Google reCAPTCHA) */}
            <div>
              <SecurityVerifier onVerifyChange={setIsVerified} />
            </div>

            <button
              type="submit"
              className="gm-btn !bg-gradient-to-r !from-[#FF7A2A] !to-[#FE540B] !text-white !border-none font-bold w-full h-11 sm:h-12 shadow-lg shadow-orange-500/25 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center rounded-xl text-sm sm:text-base mt-1.5 touch-manipulation"
              disabled={!canSubmit || isLoading}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  <span>{isForgotPassword ? "Enviando..." : "Entrando..."}</span>
                </span>
              ) : (
                <span>{isForgotPassword ? "Enviar link de recuperação" : "Entrar na plataforma"}</span>
              )}
            </button>

            {isForgotPassword && (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className="w-full text-center text-xs sm:text-sm text-slate-300 hover:text-white transition-colors mt-2 py-1 font-medium"
              >
                Voltar para o login
              </button>
            )}

            {!isForgotPassword && (
              <div className="mt-3 pt-3 border-t border-white/10 text-center">
                <div className="text-xs sm:text-sm text-slate-300/85 mb-2 font-normal">Ainda não tem uma conta?</div>
                <Link
                  to="/register"
                  className="w-full inline-flex items-center justify-center gap-1.5 h-10 sm:h-11 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-all font-semibold text-xs sm:text-sm text-white/95 hover:text-white backdrop-blur-md shadow-sm active:scale-[0.99] touch-manipulation"
                >
                  Criar nova conta
                </Link>
              </div>
            )}
          </form>
        </div>
      </motion.div>

      {showPinVerifyModal && (
        <PinLockModal
          open={showPinVerifyModal}
          mode="verify"
          email={email.trim()}
          title="PIN de Segurança"
          description="Digite seu PIN de 4 dígitos para autorizar o acesso com as credenciais salvas."
          onSuccess={handlePinVerifySuccess}
          onCancel={() => setShowPinVerifyModal(false)}
        />
      )}

      {showPinSetupModal && (
        <PinLockModal
          open={showPinSetupModal}
          mode="setup"
          email={email.trim()}
          title="Criar PIN deste Dispositivo"
          description="Crie um PIN de 4 dígitos para proteger suas credenciais salvas neste aparelho (smartphone ou computador)."
          onSuccess={handlePinSetupSuccess}
          onCancel={() => {
            setShowPinSetupModal(false);
            navigate("/", { replace: true });
          }}
        />
      )}
    </div>
  );
}