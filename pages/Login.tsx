import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { Card } from "../components/ui/Card";
import { Lock, Mail, Loader2, Eye, EyeOff, ShieldCheck, Check, UserCheck, RefreshCw, HelpCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedInputField } from "../components/forgeui/AnimatedInputField";

import { supabase } from "../lib/supabase";
import { readSettingsLocal } from "../lib/settings";
import SecurityVerifier from "../components/auth/SecurityVerifier";
import { isPinSecurityActive, setSessionUnlocked } from "../lib/securityPin";
import PinLockModal from "../components/auth/PinLockModal";
import { isUserAdminEmail } from "../constants";
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
  const { signInWithPassword, signInWithGoogle, loginAsMasterAdmin, checked, user } = useAuth();
  const navigate = useNavigate();

  // Detecção de primeiro login / usuário novo vs cadastrado
  const [savedProfile, setSavedProfile] = useState<{
    email: string;
    logo: string;
    companyName: string;
    hasLoggedInOnce: boolean;
    rememberCredentials: boolean;
  }>(() => {
    try {
      // Limpa resíduos legados de nommadart caso existam no navegador
      const lastEmail = (localStorage.getItem("gm_last_email") || localStorage.getItem("gm.last_email") || "").trim();
      if (lastEmail.toLowerCase().includes("nommadart")) {
        localStorage.removeItem("gm_last_email");
        localStorage.removeItem("gm.last_email");
        localStorage.removeItem("gm_last_user_logo");
        localStorage.removeItem("gm_last_user_company");
        localStorage.removeItem("gm_remember_credentials");
        localStorage.removeItem("gm_has_logged_in_once");
        return {
          email: "",
          logo: "",
          companyName: "",
          hasLoggedInOnce: false,
          rememberCredentials: false,
        };
      }

      const storedEmail = lastEmail;
      const storedLogo = localStorage.getItem("gm_last_user_logo") || "";
      const storedCompany = localStorage.getItem("gm_last_user_company") || "";
      const hasOnce = localStorage.getItem("gm_has_logged_in_once") === "true";
      const remember = localStorage.getItem("gm_remember_credentials") === "true";

      // A prévia só é exibida se o usuário JÁ fez login com sucesso neste navegador E deixou salvo
      const isValidSaved = Boolean(hasOnce && remember && storedEmail);

      return {
        email: isValidSaved ? storedEmail : "",
        logo: isValidSaved ? storedLogo : "",
        companyName: isValidSaved ? storedCompany : "",
        hasLoggedInOnce: hasOnce,
        rememberCredentials: remember,
      };
    } catch {
      return { email: "", logo: "", companyName: "", hasLoggedInOnce: false, rememberCredentials: false };
    }
  });

  const [rememberMe, setRememberMe] = useState<boolean>(() => Boolean(savedProfile.rememberCredentials ?? true));
  const [email, setEmail] = useState(() => savedProfile.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Estados da verificação por PIN (quando ativado em Configurações)
  const [showPinVerifyModal, setShowPinVerifyModal] = useState(false);

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
    if (checked && user) navigate("/", { replace: true });
  }, [checked, user, navigate]);

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

      // Salva dados de login SOMENTE se o usuário marcou para salvar credenciais
      try {
        if (rememberMe) {
          localStorage.setItem("gm_has_logged_in_once", "true");
          localStorage.setItem("gm_remember_credentials", "true");
          localStorage.setItem("gm_last_email", email.trim());
          localStorage.setItem("gm.last_email", email.trim());
          if (settings?.company_logo_url) {
            localStorage.setItem("gm_last_user_logo", settings.company_logo_url);
          }
          if (settings?.company_name) {
            localStorage.setItem("gm_last_user_company", settings.company_name);
          }
        } else {
          localStorage.removeItem("gm_last_email");
          localStorage.removeItem("gm.last_email");
          localStorage.removeItem("gm_last_user_logo");
          localStorage.removeItem("gm_last_user_company");
          localStorage.removeItem("gm_remember_credentials");
        }
      } catch {}

      navigate("/", { replace: true });
    } catch (err: any) {
      let msg = err?.message || "Erro ao conectar.";
      
      if (msg.includes("Invalid login credentials") || msg.includes("invalid_grant")) {
        msg = "E-mail ou senha incorretos.";
      } else if (msg.includes("Email not confirmed")) {
        msg = "Por favor, confirme seu e-mail antes de fazer login.";
      }
      
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  const handleDirectAdminLogin = () => {
    setEmail("gmedificacao@gmail.com");
    setPassword("");
    setErrorMessage("");
    setSuccessMessage("Conta Administrador Master (gmedificacao@gmail.com) selecionada. Digite sua senha para entrar.");
    setTimeout(() => {
      const pwdInput = document.getElementById("login-password") as HTMLInputElement;
      if (pwdInput) pwdInput.focus();
    }, 150);
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrorMessage("");
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Erro ao iniciar login com Google:", err);
      setErrorMessage(err?.message || "Erro ao conectar com Google. Verifique a configuração no Supabase.");
      setIsGoogleLoading(false);
    }
  };

  // Alternar para nova conta ou limpar perfil salvo
  const handleSwitchAccount = () => {
    setEmail("");
    setPassword("");
    try {
      localStorage.removeItem("gm_last_email");
      localStorage.removeItem("gm.last_email");
      localStorage.removeItem("gm_last_user_logo");
      localStorage.removeItem("gm_last_user_company");
      localStorage.removeItem("gm_remember_credentials");
      localStorage.removeItem("gm_has_logged_in_once");
    } catch {}
    setSavedProfile({
      email: "",
      logo: "",
      companyName: "",
      hasLoggedInOnce: false,
      rememberCredentials: false,
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

  // A prévia de avatares só será mostrada para o usuário que já fez cadastro e login uma vez, e deixou suas credenciais salvas no navegador
  const showSavedAvatarPreview = Boolean(
    savedProfile.hasLoggedInOnce &&
    savedProfile.rememberCredentials &&
    savedProfile.email &&
    savedProfile.email.trim().length > 0 &&
    !isForgotPassword
  );

  return (
    <div 
      onPointerMove={handlePointerMove}
      className="gm-login-page-root min-h-[100dvh] h-[100dvh] w-full flex flex-col lg:flex-row bg-[#08090b] text-[#f2f2f3] relative overflow-hidden selection:bg-[var(--gm-primary)] selection:text-white"
    >
      {/* ------------------------------------------------------------- */}
      {/* MOBILE BACKDROP: Fundo animado visível apenas em telas mobile */}
      {/* ------------------------------------------------------------- */}
      <div 
        className="lg:hidden fixed inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center select-none"
        aria-hidden="true"
      >
        <motion.div
          animate={bgAnim.animate}
          transition={bgAnim.transition as any}
          className="w-full h-full will-change-transform scale-[1.12]"
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
                objectFit: (bgInfo.fit as any) || "cover",
                objectPosition: `${bgInfo.pos_x} ${bgInfo.pos_y}`,
              }}
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `url("${bgInfo.url}")`,
                backgroundSize: bgInfo.fit || "cover",
                backgroundPosition: `${bgInfo.pos_x} ${bgInfo.pos_y}`,
                backgroundRepeat: "no-repeat",
              }}
            />
          )}
        </motion.div>
        <div className="absolute inset-0 bg-black/75 backdrop-blur-[4px]" />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LADO ESQUERDO: Painel de Credenciais Minimalista Forge        */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full lg:w-[480px] xl:w-[540px] 2xl:w-[580px] h-full flex flex-col justify-between shrink-0 bg-[#0c0d12]/95 lg:bg-[#0c0d12] lg:border-r border-white/10 relative z-20 overflow-y-auto px-6 sm:px-10 lg:px-12 xl:px-14 py-8 sm:py-10 shadow-2xl">
        {/* Topo: LOGO OFICIAL DO APP Card Digital GM (Sem avatar e sem área do assinante) */}
        <div className="flex items-center justify-between mb-5 sm:mb-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FE540B] flex items-center justify-center font-black text-white text-base shadow-lg shadow-[#FE540B]/30 shrink-0">
              GM
            </div>
            <div className="flex flex-col min-w-0">
              <div className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1 leading-tight">
                CardDigital <span className="text-[#FE540B] font-black" style={{ fontFamily: "'Funnel Display', sans-serif", fontWeight: 800 }}>GM</span>
              </div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
                Plataforma de Orçamentos
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Conexão Segura</span>
          </div>
        </div>

        {/* Centro: Formulário de Login */}
        <div className="my-auto py-2 max-w-[420px] w-full mx-auto">
          <div className="mb-5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {showSavedAvatarPreview ? "Bem-vindo de volta" : "Entrar na plataforma"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 font-normal">
              {showSavedAvatarPreview
                ? "Entre na sua conta para continuar criando."
                : "Digite seu e-mail e senha para acessar o sistema."}
            </p>
          </div>

          {/* AVATAR DO USUÁRIO SALVO: Exibido APENAS se já fez login antes e deixou credenciais salvas */}
          {showSavedAvatarPreview && (
            <div className="mb-4 p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-black/60 border border-[var(--gm-primary)]/40 flex items-center justify-center shadow-md">
                    {savedProfile.logo ? (
                      <img src={savedProfile.logo} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-[var(--gm-primary)] font-black text-sm uppercase">
                        {savedProfile.companyName
                          ? savedProfile.companyName.substring(0, 2)
                          : (savedProfile.email ? savedProfile.email.substring(0, 2) : "GM")}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0c0d12] flex items-center justify-center">
                    <Check size={9} strokeWidth={3} className="text-black" />
                  </div>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-white font-bold text-sm truncate">
                    {savedProfile.companyName || savedProfile.email.split("@")[0]}
                  </span>
                  <span className="text-zinc-400 text-xs truncate">
                    {savedProfile.email}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSwitchAccount}
                className="text-xs font-semibold text-[var(--gm-primary,#FE540B)] hover:underline shrink-0 flex items-center gap-1 cursor-pointer px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
                title="Entrar com outro usuário"
              >
                <RefreshCw size={11} />
                <span>Trocar</span>
              </button>
            </div>
          )}

          {/* BOTÃO GOOGLE NO TOPO (Padrão visual Designers Hub) */}
          {!isForgotPassword && (
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading || isGoogleLoading}
              className="w-full h-11 sm:h-12 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] text-white font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm hover:border-white/25 disabled:opacity-50 disabled:cursor-not-allowed group touch-manipulation mb-3.5"
            >
              {isGoogleLoading ? (
                <Loader2 size={18} className="animate-spin text-white" />
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isGoogleLoading ? "Conectando ao Google..." : "Continuar com Google"}</span>
            </button>
          )}

          {/* DIVISOR FORGE */}
          {!isForgotPassword && (
            <div className="relative my-3 flex items-center justify-center">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#0c0d12] px-3 text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-zinc-500 shrink-0">
                ou com e-mail
              </span>
              <div className="border-t border-white/10 w-full" />
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-red-200 text-xs sm:text-sm mb-3">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2.5 text-green-200 text-xs sm:text-sm mb-3">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            {/* CAMPO DE E-MAIL COM ESTILO FORGE-FIELD */}
            <AnimatedInputField
              id="login-email"
              name="email"
              type="email"
              label="E-mail"
              value={email}
              onChange={setEmail}
              placeholder="seu@email.com"
              demoPlaceholder="gmedificacao@gmail.com"
              required
              autoComplete="email"
              isValid={/\S+@\S+\.\S+/.test(email.trim())}
              strokeColor="#10b981"
              icon={
                isReturningUser && savedProfile.email ? (
                  <UserCheck size={16} className="text-[var(--gm-primary)]" />
                ) : (
                  <Mail size={16} />
                )
              }
            />

            {/* CAMPO DE SENHA COM ESTILO FORGE-FIELD */}
            {!isForgotPassword && (
              <AnimatedInputField
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                label="Senha"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                demoPlaceholder="••••••••"
                required
                autoComplete="current-password"
                isValid={password.length >= 6}
                strokeColor="#10b981"
                icon={<Lock size={16} />}
                headerRight={
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className="text-[11px] font-mono uppercase tracking-wider text-[var(--gm-primary)] hover:underline font-medium cursor-pointer"
                    tabIndex={-1}
                  >
                    Esqueceu a senha?
                  </button>
                }
                rightAction={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#8b8b92] hover:text-[#f2f2f3] transition-colors focus:outline-none p-1 cursor-pointer touch-manipulation flex items-center justify-center rounded"
                    tabIndex={-1}
                    title={showPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            )}

            {!isForgotPassword && (
              <label className="flex items-center gap-2.5 px-1 py-1 cursor-pointer select-none text-xs text-zinc-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-[#13151b] text-[var(--gm-primary,#FE540B)] focus:ring-0 focus:ring-offset-0 accent-[var(--gm-primary,#FE540B)] cursor-pointer"
                />
                <span className="font-medium tracking-wide">Salvar credenciais neste navegador</span>
              </label>
            )}

            {/* Verificador de Segurança */}
            <div>
              <SecurityVerifier onVerifyChange={setIsVerified} />
            </div>

            {/* Botão de Entrar (Padrão Forge High-Contrast) */}
            <button
              type="submit"
              className="login-submit-btn w-full h-12 rounded-xl bg-[var(--gm-btn-bg,var(--gm-primary,#FE540B))] text-white font-bold text-sm shadow-[0_4px_16px_rgba(var(--gm-primary-rgb,254,84,11),0.25)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center mt-1 uppercase tracking-wider disabled:cursor-not-allowed"
              disabled={!canSubmit || isLoading || isGoogleLoading}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
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
              <div className="pt-2 text-center">
                <Link
                  to="/register"
                  className="w-full inline-flex items-center justify-center h-12 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 transition-all font-semibold text-xs tracking-wide text-zinc-300 hover:text-white active:scale-[0.99]"
                >
                  Ainda não tem conta? <span className="text-[var(--gm-primary,#FE540B)] ml-1.5 font-bold underline underline-offset-4">Criar conta</span>
                </Link>
              </div>
            )}
          </form>
        </div>

        {/* Rodapé da esquerda: Termos */}
        <div className="pt-4 text-center text-[11px] text-zinc-500 font-normal">
          Ao continuar você concorda com nossos{" "}
          <span className="underline hover:text-zinc-400 cursor-pointer">Termos</span> e{" "}
          <span className="underline hover:text-zinc-400 cursor-pointer">Política de Privacidade</span>.
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LADO DIREITO: Fundo Animado Rolando + Visual Hero (Designers Hub) */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden lg:flex flex-1 relative h-full overflow-hidden bg-black flex-col justify-between p-10 xl:p-14 2xl:p-16 select-none">
        {/* Camada do background rolando animado */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <motion.div
            animate={bgAnim.animate}
            transition={bgAnim.transition as any}
            className="w-full h-full will-change-transform scale-[1.08]"
            style={{ transformOrigin: "center center", width: "100%", height: "100%" }}
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
                  objectFit: (bgInfo.fit as any) || "cover",
                  objectPosition: `${bgInfo.pos_x} ${bgInfo.pos_y}`,
                }}
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `url("${bgInfo.url}")`,
                  backgroundSize: bgInfo.fit || "cover",
                  backgroundPosition: `${bgInfo.pos_x} ${bgInfo.pos_y}`,
                  backgroundRepeat: "no-repeat",
                }}
              />
            )}
          </motion.div>

          {/* Gradientes cinematográficos e vinheta tipo magma */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/25 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c0d12] via-transparent to-black/60 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-br from-[#FE540B]/20 via-orange-600/10 to-transparent rounded-full blur-3xl opacity-75 pointer-events-none" />
        </div>

        {/* Topo do painel direito: Badge */}
        <div className="relative z-10 flex justify-end w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-zinc-300 text-xs font-medium shadow-lg">
            <Sparkles size={13} className="text-[#FE540B] animate-pulse" />
            <span>Vídeo em tempo real</span>
          </div>
        </div>

        {/* Rodapé do painel direito: Tipografia de impacto e tags */}
        <div className="relative z-10 flex items-end justify-between w-full">
          <div className="max-w-xl">
            <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#FE540B] font-bold mb-2">
              GM EDIFICAÇÃO • PLATAFORMA
            </div>
            <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-black text-white tracking-tight leading-[1.1] mb-3">
              Seu estúdio criativo, de volta em um clique.
            </h2>
            <p className="text-zinc-300/90 text-sm xl:text-base font-normal leading-relaxed mb-6 max-w-lg">
              Geração de propostas comerciais, controle financeiro, gestão de clientes e produção gráfica numa única plataforma.
            </p>

            {/* Tags pills */}
            <div className="flex flex-wrap items-center gap-2">
              {["Orçamentos", "Propostas", "Gráfica", "Financeiro", "Clientes", "Contratos"].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 text-white/90 border border-white/10 backdrop-blur-md transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Botão de suporte flutuante */}
          <div className="hidden xl:block">
            <a
              href="https://wa.me/5598984242784"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-zinc-300 hover:text-white hover:border-white/30 text-xs font-medium transition-all shadow-lg cursor-pointer"
            >
              <HelpCircle size={14} className="text-zinc-400" />
              <span>Suporte</span>
            </a>
          </div>
        </div>
      </div>

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

    </div>
  );
}