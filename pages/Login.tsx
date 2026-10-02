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

function resolveAppBackground(): { url: string; isVideo: boolean; fit: string; pos_x: string; pos_y: string } {
  try {
    const s = readSettingsLocal();
    const candidate = s?.app_background_url || s?.mobile_app_background_url;
    if (candidate && typeof candidate === "string" && candidate.trim().length > 0) {
      const cleanUrl = candidate.trim();
      const isVideo =
        cleanUrl.toLowerCase().endsWith(".mp4") ||
        cleanUrl.toLowerCase().endsWith(".webm");
      return {
        url: cleanUrl,
        isVideo,
        fit: s?.app_background_fit || "cover",
        pos_x: s?.app_background_pos_x || "50%",
        pos_y: s?.app_background_pos_y || "50%",
      };
    }
  } catch {}

  if (typeof window !== "undefined") {
    try {
      const root = document.documentElement;
      const cssBg = getComputedStyle(root).getPropertyValue("--gm-app-bg-url")?.trim();
      if (cssBg && cssBg !== "none" && cssBg.startsWith("url(")) {
        const match = cssBg.match(/url\(["']?(.*?)["']?\)/);
        if (match && match[1]) {
          const isVideo =
            match[1].toLowerCase().endsWith(".mp4") ||
            match[1].toLowerCase().endsWith(".webm");
          return {
            url: match[1],
            isVideo,
            fit: getComputedStyle(root).getPropertyValue("--gm-app-bg-fit")?.trim() || "cover",
            pos_x: getComputedStyle(root).getPropertyValue("--gm-app-bg-pos-x")?.trim() || "50%",
            pos_y: getComputedStyle(root).getPropertyValue("--gm-app-bg-pos-y")?.trim() || "50%",
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
  const [bgInfo, setBgInfo] = useState(() => resolveAppBackground());
  const [bgEffect, setBgEffect] = useState<BgEffectConfig>(() => readBgEffectConfig());
  const [lockMouse, setLockMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const isLockEffectActive = isEffectActiveFor("lockscreen", bgEffect);
  const lockEffectType = getEffectFor("lockscreen", bgEffect);

  useEffect(() => {
    setBgInfo(resolveAppBackground());
    const handleUpdate = () => {
      setBgInfo(resolveAppBackground());
    };
    const handleBgEffectUpdate = (e: any) => {
      if (e?.detail) setBgEffect(e.detail);
      else setBgEffect(readBgEffectConfig());
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("gm:settings_updated", handleUpdate);
    window.addEventListener("gm:theme_synced", handleUpdate);
    window.addEventListener("gm:settings_updated", handleBgEffectUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("gm:settings_updated", handleUpdate);
      window.removeEventListener("gm:theme_synced", handleUpdate);
      window.removeEventListener("gm:settings_updated", handleBgEffectUpdate);
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

  // Animação dinâmica idêntica à de PIN e Segurança
  const getBgAnimationConfig = () => {
    if (!isLockEffectActive) {
      return {
        animate: { scale: 1, x: 0, y: 0, rotate: 0, opacity: 1 },
        transition: { duration: 0.4 },
      };
    }

    const lockStrength = (getEffectStrength("lockscreen", lockEffectType, bgEffect) || 100) / 100;

    switch (lockEffectType) {
      case "mouse":
        return {
          animate: {
            scale: 1 + 0.05 * lockStrength,
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
            scale: [1, 1 + 0.065 * lockStrength, 1],
            opacity: [0.92, 1, 0.92],
            x: 0,
            y: 0,
            rotate: 0,
          },
          transition: {
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          },
        };
      case "drift":
        return {
          animate: {
            scale: [1 + 0.02 * lockStrength, 1 + 0.07 * lockStrength, 1 + 0.04 * lockStrength, 1 + 0.07 * lockStrength, 1 + 0.02 * lockStrength],
            x: ["0%", `${(-2 * lockStrength).toFixed(2)}%`, `${(1.6 * lockStrength).toFixed(2)}%`, `${(-1 * lockStrength).toFixed(2)}%`, "0%"],
            y: ["0%", `${(1.4 * lockStrength).toFixed(2)}%`, `${(-1.4 * lockStrength).toFixed(2)}%`, `${(-1.8 * lockStrength).toFixed(2)}%`, "0%"],
            rotate: 0,
            opacity: 1,
          },
          transition: {
            duration: 28,
            repeat: Infinity,
            ease: "easeInOut",
          },
        };
      case "orbit":
        return {
          animate: {
            scale: [1 + 0.03 * lockStrength, 1 + 0.06 * lockStrength, 1 + 0.03 * lockStrength, 1 + 0.06 * lockStrength, 1 + 0.03 * lockStrength],
            x: ["0%", `${(1.8 * lockStrength).toFixed(2)}%`, "0%", `${(-1.8 * lockStrength).toFixed(2)}%`, "0%"],
            y: [`${(-1.5 * lockStrength).toFixed(2)}%`, "0%", `${(1.5 * lockStrength).toFixed(2)}%`, "0%", `${(-1.5 * lockStrength).toFixed(2)}%`],
            rotate: [0, 0.6 * lockStrength, 0, -0.6 * lockStrength, 0],
            opacity: 1,
          },
          transition: {
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
          },
        };
      case "aurora":
        return {
          animate: {
            scale: [1 + 0.02 * lockStrength, 1 + 0.05 * lockStrength, 1 + 0.02 * lockStrength],
            x: [`${(-1 * lockStrength).toFixed(2)}%`, `${(1 * lockStrength).toFixed(2)}%`, `${(-1 * lockStrength).toFixed(2)}%`],
            y: [`${(-0.6 * lockStrength).toFixed(2)}%`, `${(0.6 * lockStrength).toFixed(2)}%`, `${(-0.6 * lockStrength).toFixed(2)}%`],
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
            scale: [1 + 0.02 * lockStrength, 1 + 0.05 * lockStrength, 1 + 0.03 * lockStrength, 1 + 0.05 * lockStrength, 1 + 0.02 * lockStrength],
            rotate: [0, 0.4 * lockStrength, 0, -0.4 * lockStrength, 0],
            x: ["0%", `${(1.2 * lockStrength).toFixed(2)}%`, `${(-1 * lockStrength).toFixed(2)}%`, "0%"],
            y: ["0%", `${(-1 * lockStrength).toFixed(2)}%`, `${(1 * lockStrength).toFixed(2)}%`, "0%"],
            opacity: [0.95, 1, 0.95],
          },
          transition: {
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          },
        };
      default:
        return {
          animate: { scale: 1, x: 0, y: 0, rotate: 0, opacity: 1 },
          transition: { duration: 0.4 },
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
      className="min-h-[100dvh] min-h-screen w-full flex items-center justify-center p-3.5 sm:p-6 bg-[#0b0e14] relative overflow-x-hidden selection:bg-[var(--gm-primary)] selection:text-white"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        width: "100%",
      }}
    >
      {/* ========================================================================= */}
      {/* PLANO DE FUNDO CONDICIONAL: NOVO USUÁRIO (PONTINHOS) vs RETORNANDO (ANIMADO) */}
      {/* ========================================================================= */}
      {!isReturningUser ? (
        /* NOVO USUÁRIO: GRADE COM PONTINHOS ANIMADOS QUE APARECE NA INTRO DO APP */
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#0b0e14]" aria-hidden="true">
          <div className="gm-dotted-grid">
            {Array.from({ length: 480 }).map((_, i) => (
              <div
                key={i}
                className="gm-grid-dot"
                style={{
                  animationDelay: `${((i % 24) * 0.18 + Math.floor(i / 24) * 0.12).toFixed(2)}s`,
                }}
              />
            ))}
          </div>
          {/* Suave brilho e vinheta ambiente no centro */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-[var(--gm-primary)]/15 via-orange-600/8 to-transparent rounded-full blur-3xl opacity-75 pointer-events-none" />
        </div>
      ) : (
        /* USUÁRIO RETORNANDO: PLANO DE FUNDO ANIMADO EXATO DE PIN E SEGURANÇA */
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center" aria-hidden="true">
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
            style={{ transformOrigin: "center center" }}
          >
            {bgInfo.isVideo ? (
              <video
                src={bgInfo.url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full bg-cover bg-center scale-[1.02] transition-transform duration-1000"
                style={{
                  backgroundImage: `url("${bgInfo.url}")`,
                  backgroundPosition: `${bgInfo.pos_x} ${bgInfo.pos_y}`,
                }}
              />
            )}
          </motion.div>

          {/* Overlay escuro balanceado para garantir legibilidade e contraste com o card */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-none" />

          {/* Luzes de refração e profundidade para o Apple Glass Blur */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] bg-gradient-to-br from-[var(--gm-primary)]/20 via-orange-600/10 to-transparent rounded-full blur-3xl opacity-80" />
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[320px] h-[240px] bg-gradient-to-tr from-white/[0.04] to-transparent rounded-full blur-3xl" />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="gm-login-card-square gm-login-card-compact relative z-10 m-auto flex flex-col justify-center"
        style={{
          width: "100%",
          maxWidth: "440px",
          marginLeft: "auto",
          marginRight: "auto",
          boxSizing: "border-box",
        }}
      >
        <div
          className="gm-login-card-square gm-login-card-compact apple-glass-card p-5.5 sm:p-7 relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/15 shadow-2xl backdrop-blur-2xl"
          style={{
            width: "100%",
            maxWidth: "440px",
            marginLeft: "auto",
            marginRight: "auto",
            boxSizing: "border-box",
          }}
        >
          {/* CABEÇALHO COM LOGO - COMPACTO E ELEGANTE (LOGO CADASTRADO QUANDO DISPONÍVEL) */}
          <div className="flex flex-col items-center mb-4 sm:mb-5">
            <motion.div 
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 180 }}
              className="relative mb-2 flex items-center justify-center"
            >
              <div className="gm-logo-box" style={{ width: '58px', height: '58px' }}>
                <div className="gm-logo-glow-wrapper"></div>
                <div className="gm-logo-border-wrapper"></div>
                {effectiveLogo ? (
                  <img
                    src={effectiveLogo}
                    alt={savedProfile.companyName || settings?.company_name || "Logo"}
                    className="gm-logo"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--gm-primary)] font-black text-xl uppercase tracking-wider relative z-10">
                    {savedProfile.companyName || settings?.company_name ? (savedProfile.companyName || settings?.company_name).substring(0, 2) : "GM"}
                  </div>
                )}
              </div>
            </motion.div>

            <div className="flex items-center justify-center text-center leading-tight gap-1.5">
              <span className="text-lg sm:text-xl font-light text-slate-200 tracking-tight">
                {savedProfile.companyName || settings?.company_name ? (
                  savedProfile.companyName || settings?.company_name
                ) : (
                  <>CardDigital <span className="text-xl sm:text-2xl font-semibold text-[var(--gm-primary)]">GM</span></>
                )}
              </span>
            </div>
            <div className="text-[9px] sm:text-[10px] opacity-50 mt-0.5 uppercase tracking-[0.2em] font-bold">Acesso Restrito</div>
          </div>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-red-200 text-xs mb-2.5">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2.5 text-green-200 text-xs mb-2.5">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-2.5">
            {/* PRÉVIA DE EMAIL / CAMPO DE EMAIL */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-0.5">
                <label className="gm-label text-[10px] sm:text-[10.5px] uppercase tracking-wider font-bold opacity-60">
                  E-mail
                </label>
                {isReturningUser && savedProfile.email && (
                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="text-[10px] text-[var(--gm-primary)] hover:underline font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Entrar com outro e-mail"
                  >
                    <RefreshCw size={10} />
                    <span>Trocar conta</span>
                  </button>
                )}
              </div>

              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                  {isReturningUser && savedProfile.email ? (
                    <UserCheck size={15} className="text-[var(--gm-primary)]" />
                  ) : (
                    <Mail size={15} className="text-slate-400 group-focus-within:text-[var(--gm-primary)] transition-colors" />
                  )}
                </div>
                <input
                  className="apple-glass-input !pl-9.5 h-10 text-xs sm:text-sm focus:border-[var(--gm-primary)] !outline-none !ring-0 focus:!ring-0 focus:!outline-none transition-all rounded-xl w-full text-white"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>

              {isReturningUser && savedProfile.email && (
                <div className="flex items-center gap-1 px-1 pt-0.5 text-[10px] text-emerald-400/90 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Conta salva neste dispositivo</span>
                </div>
              )}
            </div>

            {!isForgotPassword && (
              <div className="space-y-1">
                <div className="flex justify-between items-center ml-0.5">
                  <label className="gm-label text-[10px] sm:text-[10.5px] uppercase tracking-wider font-bold opacity-60">Senha</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className="text-[10px] sm:text-[11px] text-[var(--gm-primary)] hover:underline opacity-80"
                    tabIndex={-1}
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                    <Lock size={15} className="text-slate-400 group-focus-within:text-[var(--gm-primary)] transition-colors" />
                  </div>
                  <input
                    className="apple-glass-input !pl-9.5 !pr-9.5 h-10 text-xs sm:text-sm focus:border-[var(--gm-primary)] !outline-none !ring-0 focus:!ring-0 focus:!outline-none transition-all rounded-xl w-full text-white"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            {!isForgotPassword && (
              <div className="pt-0.5">
                <div
                  onClick={() => {
                    if (!isPinActiveForUser) {
                      setProtectWithPin(!protectWithPin);
                    }
                  }}
                  className={`w-full rounded-xl px-2.5 py-2 flex items-center justify-between select-none transition-all duration-300 relative group ${
                    !isPinActiveForUser ? "cursor-pointer" : ""
                  } ${
                    isPinActiveForUser || protectWithPin
                      ? "bg-gradient-to-r from-[var(--gm-primary,#FE540B)]/[0.12] via-orange-500/[0.06] to-transparent border border-[var(--gm-primary,#FE540B)]/50 shadow-[0_0_20px_-4px_rgba(254,84,11,0.25)]"
                      : "bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20"
                  }`}
                >
                  {/* LADO ESQUERDO: Ícone e Título com visual de segurança do dispositivo */}
                  <div className="flex items-center gap-2 min-w-0 pr-1.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isPinActiveForUser || protectWithPin
                          ? "bg-[var(--gm-primary,#FE540B)] text-white shadow-sm shadow-orange-500/40 scale-105"
                          : "bg-white/[0.06] text-zinc-400 group-hover:text-zinc-200 border border-white/10"
                      }`}
                    >
                      <Lock size={13} className="transition-transform duration-200" />
                    </div>

                    <div className="flex flex-col text-left justify-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white text-xs font-semibold tracking-tight">
                          Proteger com PIN
                        </span>
                        {(isPinActiveForUser || protectWithPin) && (
                          <span className="inline-flex items-center text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-[var(--gm-primary,#FE540B)]/20 text-[var(--gm-primary,#FE540B)] border border-[var(--gm-primary,#FE540B)]/30">
                            Ativo
                          </span>
                        )}
                      </div>
                      <span className="text-[9.5px] text-zinc-400 leading-tight">
                        {isPinActiveForUser
                          ? "Bloqueio ativado para credenciais salvas"
                          : "Exigir 4 dígitos neste aparelho"}
                      </span>
                    </div>
                  </div>

                  {/* LADO DIREITO: Switch Toggle Estilo Apple / Hardware */}
                  <div className="shrink-0 flex items-center">
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 flex items-center ${
                        isPinActiveForUser || protectWithPin
                          ? "bg-[var(--gm-primary,#FE540B)] shadow-[0_0_12px_rgba(254,84,11,0.5)] justify-end"
                          : "bg-zinc-800 border border-white/15 justify-start"
                      }`}
                    >
                      <motion.div
                        layout
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="w-4 h-4 rounded-full bg-white shadow-md flex items-center justify-center"
                      >
                        {(isPinActiveForUser || protectWithPin) && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--gm-primary,#FE540B)]" />
                        )}
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Verificador de Segurança de Login (Estilo Google reCAPTCHA) */}
            <div className="pt-0.5">
              <SecurityVerifier onVerifyChange={setIsVerified} />
            </div>

            <button
              type="submit"
              className="gm-btn !bg-gradient-to-r !from-[#FF7A2A] !to-[#FE540B] !text-white !border-none font-bold w-full h-10.5 sm:h-11 shadow-md shadow-orange-500/25 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center rounded-xl text-xs sm:text-sm mt-1.5"
              disabled={!canSubmit || isLoading}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={15} />
                  {isForgotPassword ? "Enviando..." : "Entrando..."}
                </span>
              ) : (
                isForgotPassword ? "Enviar link de recuperação" : "Entrar na plataforma"
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
                className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors mt-2"
              >
                Voltar para o login
              </button>
            )}

            {!isForgotPassword && (
              <div className="mt-3 pt-3 border-t border-white/10 text-center">
                <div className="text-[10px] opacity-60 mb-1.5">Ainda não tem uma conta?</div>
                <Link
                  to="/register"
                  className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-all font-semibold text-xs text-white/90 hover:text-white backdrop-blur-md shadow-sm active:scale-[0.99]"
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