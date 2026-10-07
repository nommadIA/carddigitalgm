import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Lock,
  Unlock,
  ShieldCheck,
  Delete,
  AlertCircle,
  X,
  KeyRound,
  CheckCircle2,
  Sparkles,
  Mail,
  Send,
  ArrowLeft,
  Loader2,
  Key,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  verifySecurityPin,
  saveSecurityPin,
  requestPinResetLink,
  verifyEmergencyPinResetCode,
  maskEmail,
  clearPinResetData,
} from "../../lib/securityPin";
import { playUiSound } from "../../lib/uiSound";
import { readSettingsLocal } from "../../lib/settings";
import { BorderBeam } from "../ui/BorderBeam";
import {
  isEffectActiveFor,
  getEffectFor,
  getEffectStrength,
  readBgEffectConfig,
  BgEffectConfig,
} from "../../lib/backgroundEffects";

interface BackgroundInfo {
  url: string;
  isVideo: boolean;
  fit: string;
  pos_x: string;
  pos_y: string;
  scale: number;
}

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

function resolveAppBackground(): BackgroundInfo {
  const isMobile = isMobileDevice();
  try {
    const s = readSettingsLocal();
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
          : Number(s?.app_background_scale ?? 1),
      };
    }
  } catch {}

  // Checagem nas variáveis CSS do root caso tenham sido injetadas
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
              : 1,
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
    scale: isMobile ? 1.15 : 1,
  };
}

export type PinModalMode = "verify" | "setup" | "change";

interface PinLockModalProps {
  open: boolean;
  mode?: PinModalMode;
  email?: string;
  userName?: string;
  title?: string;
  description?: string;
  onSuccess: () => void;
  onCancel?: () => void;
  isPreviewMode?: boolean;
}

export default function PinLockModal({
  open,
  mode = "verify",
  email,
  userName,
  title,
  description,
  onSuccess,
  onCancel,
  isPreviewMode = false,
}: PinLockModalProps) {
  const [currentMode, setCurrentMode] = useState<PinModalMode>(mode);
  const [pin, setPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [setupStep, setSetupStep] = useState<"create" | "confirm">("create");
  const [changeStep, setChangeStep] = useState<"verify_current" | "create_new" | "confirm_new">("verify_current");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [phase, setPhase] = useState<"locking" | "normal" | "unlocking">("normal");

  // Estado da visualização de "Esqueci meu PIN"
  const [isForgotView, setIsForgotView] = useState<boolean>(false);
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);
  const [resetSentSuccess, setResetSentSuccess] = useState<boolean>(false);
  const [resetStatusMsg, setResetStatusMsg] = useState<string>("");
  const [emergencyCodeInput, setEmergencyCodeInput] = useState<string>("");

  // Estado do plano de fundo cadastrado da aplicação
  const [bgInfo, setBgInfo] = useState<BackgroundInfo>(() => resolveAppBackground());

  // Estado e sincronização dos Efeitos Dinâmicos de Fundo
  const [bgEffect, setBgEffect] = useState<BgEffectConfig>(() => readBgEffectConfig());
  const [lockMouse, setLockMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    setBgInfo(resolveAppBackground());
    setBgEffect(readBgEffectConfig());

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
    window.addEventListener("gm-bg-effect-changed", handleBgEffectUpdate);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("gm:settings_updated", handleUpdate);
      window.removeEventListener("gm:theme_synced", handleUpdate);
      window.removeEventListener("gm-bg-effect-changed", handleBgEffectUpdate);
    };
  }, [open]);

  // Sincroniza modo recebido por props
  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  // Reset estado ao abrir com animação de bloqueio inicial se for modo "verify"
  useEffect(() => {
    if (open) {
      setPin("");
      setConfirmPin("");
      setSetupStep("create");
      setChangeStep("verify_current");
      setErrorMsg("");
      setIsShaking(false);
      setIsForgotView(false);
      setResetSentSuccess(false);
      setEmergencyCodeInput("");
      setResetStatusMsg("");

      if (currentMode === "verify") {
        setPhase("locking");
        try {
          playUiSound("modal_open");
        } catch {
          // ignore
        }
        const timer = setTimeout(() => {
          setPhase("normal");
        }, 700);
        return () => clearTimeout(timer);
      } else {
        setPhase("normal");
      }
    }
  }, [open, currentMode]);

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setIsShaking(true);
    try {
      playUiSound("alert");
    } catch {
      // ignore
    }
    setTimeout(() => {
      setIsShaking(false);
      setPin("");
      if (currentMode === "setup" && setupStep === "confirm") {
        setSetupStep("create");
        setConfirmPin("");
      }
      if (currentMode === "change" && changeStep === "confirm_new") {
        setChangeStep("create_new");
        setConfirmPin("");
      }
    }, 500);
  };

  const handleDigit = useCallback(
    (digit: string) => {
      if (phase === "unlocking" || isForgotView) return;
      setErrorMsg("");

      if (currentMode === "verify") {
        if (pin.length < 4) {
          const nextPin = pin + digit;
          setPin(nextPin);
          try {
            playUiSound("tap");
          } catch {
            // ignore
          }

          if (nextPin.length === 4) {
            // Validar com animação de desbloqueio
            setTimeout(() => {
              if (verifySecurityPin(nextPin, email)) {
                setPhase("unlocking");
                try {
                  playUiSound("success");
                } catch {
                  // ignore
                }
                setTimeout(() => {
                  onSuccess();
                }, 850);
              } else {
                triggerError("PIN incorreto. Tente novamente.");
              }
            }, 120);
          }
        }
      } else if (currentMode === "change") {
        // FLUXO DE ALTERAÇÃO: 1) Verificar PIN atual -> 2) Criar novo PIN -> 3) Confirmar novo PIN
        if (changeStep === "verify_current") {
          if (pin.length < 4) {
            const nextPin = pin + digit;
            setPin(nextPin);
            try {
              playUiSound("tap");
            } catch {
              // ignore
            }

            if (nextPin.length === 4) {
              setTimeout(() => {
                if (verifySecurityPin(nextPin, email)) {
                  try {
                    playUiSound("success");
                  } catch {
                    // ignore
                  }
                  // PIN atual confirmado! Avança para digitar o novo PIN
                  setPin("");
                  setChangeStep("create_new");
                } else {
                  triggerError("PIN atual incorreto. Tente novamente.");
                }
              }, 120);
            }
          }
        } else if (changeStep === "create_new") {
          if (pin.length < 4) {
            const nextPin = pin + digit;
            setPin(nextPin);
            try {
              playUiSound("tap");
            } catch {
              // ignore
            }

            if (nextPin.length === 4) {
              setConfirmPin(nextPin);
              setTimeout(() => {
                setChangeStep("confirm_new");
                setPin("");
              }, 200);
            }
          }
        } else {
          // Confirmar novo PIN
          if (pin.length < 4) {
            const nextPin = pin + digit;
            setPin(nextPin);
            try {
              playUiSound("tap");
            } catch {
              // ignore
            }

            if (nextPin.length === 4) {
              setTimeout(() => {
                if (nextPin === confirmPin) {
                  saveSecurityPin(nextPin, email);
                  setPhase("unlocking");
                  try {
                    playUiSound("success");
                  } catch {
                    // ignore
                  }
                  setTimeout(() => {
                    onSuccess();
                  }, 850);
                } else {
                  triggerError("Os novos PINs digitados não conferem. Crie novamente.");
                }
              }, 150);
            }
          }
        }
      } else {
        // Modo SETUP (primeira configuração)
        if (setupStep === "create") {
          if (pin.length < 4) {
            const nextPin = pin + digit;
            setPin(nextPin);
            try {
              playUiSound("tap");
            } catch {
              // ignore
            }

            if (nextPin.length === 4) {
              setConfirmPin(nextPin);
              setTimeout(() => {
                setSetupStep("confirm");
                setPin("");
              }, 200);
            }
          }
        } else {
          // Confirm step
          if (pin.length < 4) {
            const nextPin = pin + digit;
            setPin(nextPin);
            try {
              playUiSound("tap");
            } catch {
              // ignore
            }

            if (nextPin.length === 4) {
              setTimeout(() => {
                if (nextPin === confirmPin) {
                  saveSecurityPin(nextPin, email);
                  setPhase("unlocking");
                  try {
                    playUiSound("success");
                  } catch {
                    // ignore
                  }
                  setTimeout(() => {
                    onSuccess();
                  }, 850);
                } else {
                  triggerError("Os PINs digitados não conferem. Crie novamente.");
                }
              }, 150);
            }
          }
        }
      }
    },
    [pin, confirmPin, setupStep, changeStep, currentMode, email, onSuccess, phase, isForgotView]
  );

  const handleDelete = useCallback(() => {
    if (phase === "unlocking" || isForgotView) return;
    setErrorMsg("");
    setPin((prev) => prev.slice(0, -1));
    try {
      playUiSound("delete");
    } catch {
      // ignore
    }
  }, [phase, isForgotView]);

  // Suporte a teclado físico (números 0-9, Backspace, Esc)
  useEffect(() => {
    if (!open || isForgotView) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleDelete();
      } else if (e.key === "Escape" && onCancel && phase !== "unlocking") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleDigit, handleDelete, onCancel, phase, isForgotView]);

  // Envio inteligente de link de redefinição por e-mail
  const handleSendResetLink = async () => {
    if (!email) {
      setErrorMsg("E-mail do usuário não localizado para envio.");
      return;
    }
    setIsSendingReset(true);
    setErrorMsg("");
    try {
      const res = await requestPinResetLink(email);
      setResetSentSuccess(true);
      setResetStatusMsg(res.message);
      try {
        playUiSound("success");
      } catch {}
    } catch (err: any) {
      setErrorMsg(err?.message || "Erro ao solicitar redefinição de PIN.");
      try {
        playUiSound("alert");
      } catch {}
    } finally {
      setIsSendingReset(false);
    }
  };

  // Validação manual do código temporário de emergência
  const handleVerifyEmergencyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setErrorMsg("");

    if (emergencyCodeInput.trim().length !== 6) {
      setErrorMsg("Digite o código de 6 dígitos completo.");
      try {
        playUiSound("alert");
      } catch {}
      return;
    }

    if (verifyEmergencyPinResetCode(email, emergencyCodeInput.trim())) {
      try {
        playUiSound("success");
      } catch {}
      clearPinResetData(email);
      // Muda para criar um novo PIN
      setCurrentMode("setup");
      setSetupStep("create");
      setIsForgotView(false);
      setPin("");
      setConfirmPin("");
    } else {
      setErrorMsg("Código inválido ou expirado. Verifique os dígitos.");
      try {
        playUiSound("alert");
      } catch {}
    }
  };

  if (!open) return null;

  const isUnlocking = phase === "unlocking";
  const isLocking = phase === "locking";
  const isLockEffectActive = isEffectActiveFor("lockscreen", bgEffect);
  const lockEffectType = getEffectFor("lockscreen", bgEffect);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    if (!isLockEffectActive || lockEffectType !== "mouse") return;
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    setLockMouse({ x: nx * 14, y: -ny * 10 });
  };

  // Computa animação dinâmica do plano de fundo na tela de bloqueio
  const getBgAnimationConfig = () => {
    if (isUnlocking) {
      return {
        animate: { scale: 1.15, opacity: 0 },
        transition: { duration: 0.7, ease: "easeOut" },
      };
    }
    if (isLocking) {
      return {
        animate: { scale: [1.08, 1], opacity: 1 },
        transition: { duration: 0.6, ease: "easeOut" },
      };
    }
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

  const modalContent = (
    <div
      onPointerMove={handlePointerMove}
      className="gm-pin-lock-overlay fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 select-none overflow-hidden"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100%",
        minHeight: "100dvh",
        maxHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflow: "hidden",
        touchAction: "none",
        zIndex: 999999,
        boxSizing: "border-box",
      }}
    >
      {/* BANNER FLUTUANTE EXCLUSIVO QUANDO EM MODO DE PRÉVIA */}
      {isPreviewMode && (
        <div className="absolute top-5 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[100000] flex items-center justify-between gap-3.5 px-4 py-2.5 rounded-2xl bg-black/80 border border-emerald-500/40 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-xs animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            <span className="font-extrabold text-white uppercase tracking-wider text-[11px] sm:text-xs">
              Prévia do Bloqueio:
            </span>
            <span className="text-emerald-400 font-extrabold capitalize bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30 text-[11px]">
              {lockEffectType === "prism" ? "Refração Prismática 3D" : lockEffectType}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel || onSuccess}
            className="px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold transition-all cursor-pointer border border-white/20 text-xs flex items-center gap-1 active:scale-95"
          >
            <span>Fechar Prévia</span>
          </button>
        </div>
      )}
      {/* ========================================================================= */}
      {/* BACKGROUND COM EFEITO DINÂMICO ESCOLHIDO NA GALERIA */}
      {/* (SE ESTENDE E ADAPTA AO FORMATO SMARTPHONE - 100% PREENCHIMENTO SEM BORDAS) */}
      {/* ========================================================================= */}
      <div 
        className="fixed -inset-[6%] sm:-inset-[4%] pointer-events-none overflow-hidden z-0 flex items-center justify-center w-[112%] sm:w-[108%] h-[112%] sm:h-[108%] min-h-[112dvh] min-w-[112dvw] select-none"
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
      >
        {/* CAMADA AURORA LUMINESCENTE (QUANDO EFEITO AURORA ATIVO NA TELA DE BLOQUEIO) */}
        {isLockEffectActive && lockEffectType === "aurora" && (
          <div className="gm-bg-aurora-layer" />
        )}

        {/* CAMADA PRISMA (QUANDO EFEITO PRISMA ATIVO NA TELA DE BLOQUEIO) */}
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

        {/* OVERLAY ESCURECEDOR SUAVE E TRANSPARENTE (COM BLUR LEVE, MANTENDO A IMAGEM VISÍVEL E NÍTIDA) */}
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] pointer-events-none" />

        {/* GRADIENTE VERTICAL DE PROFUNDIDADE PARA O FORMATO ALONGADO DO SMARTPHONE */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
      </div>

      {/* FLASH SUAVE DE SEGURANÇA NO TRAVAMENTO */}
      {isLocking && (
        <motion.div
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 bg-gradient-radial from-[var(--gm-primary,#FE540B)]/20 to-transparent pointer-events-none z-[1]"
        />
      )}

      {/* AURA RADIANTE NO DESBLOQUEIO */}
      {isUnlocking && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.45, 0], scale: [0.8, 1.3, 1.6] }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-0 bg-gradient-radial from-[var(--gm-primary,#FE540B)]/30 via-orange-500/15 to-transparent pointer-events-none z-[1]"
        />
      )}

      {/* ========================================================================= */}
      {/* CARD DO MODAL: PADRÃO BLUR APPLE DO APP COM RASTRO SUTIL NA BORDA SUPERIOR */}
      {/* ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: isLocking ? -15 : 15 }}
        animate={
          isUnlocking
            ? { opacity: [1, 1, 0], scale: [1, 1.03, 1.06], y: [0, -8, -20] }
            : isLocking
            ? { opacity: 1, scale: [0.94, 1.02, 1], y: [-15, 2, 0] }
            : { opacity: 1, scale: 1, x: 0, y: 0 }
        }
        exit={{ opacity: 0, scale: 0.95, y: -15 }}
        transition={{
          duration: isUnlocking ? 0.6 : 0.35,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="gm-pin-lock-card gm-pin-modal-card gm-pin-card-compact apple-glass-card relative w-full rounded-[24px] sm:rounded-[30px] border border-white/[0.12] p-4 sm:p-5.5 shadow-[0_30px_90px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.12)] flex flex-col items-center text-center overflow-hidden font-sans select-none z-10 m-auto"
        style={{
          width: "100%",
          maxWidth: "340px",
          maxHeight: "calc(100dvh - 32px)",
          margin: "auto",
          marginLeft: "auto",
          marginRight: "auto",
          marginTop: "auto",
          marginBottom: "auto",
          alignSelf: "center",
          justifySelf: "center",
          boxSizing: "border-box",
          background: "rgba(18, 18, 24, 0.72)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
      >
        {/* ========================================================================= */}
        {/* RASTRO SUTIL DE LUZ PERCORRENDO TODA A BORDA DA CAIXA (APPLE GLASS STYLE) */}
        {/* ========================================================================= */}
        <BorderBeam duration={7} borderWidth={1.2} color="#ffffff" />

        {/* BRILHO AMBIENTE PREDEFINIDO NO APP DISCRETO */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[var(--gm-primary,#FE540B)]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-[var(--gm-primary,#FE540B)]/10 rounded-full blur-3xl pointer-events-none" />

        {onCancel && !isUnlocking && (
          <button
            type="button"
            onClick={onCancel}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center transition-all cursor-pointer z-20"
            title="Fechar"
          >
            <X size={16} />
          </button>
        )}

        {/* ========================================================================= */}
        {/* FLUXO INTELIGENTE: ESQUECI MEU PIN (REDEFINIÇÃO POR E-MAIL) */}
        {/* ========================================================================= */}
        {isForgotView ? (
          <div className="w-full flex flex-col items-center animate-fade-in">
            {/* Ícone de E-mail de Segurança com a cor predefinida do app */}
            <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/15 flex items-center justify-center mb-3 shadow-[0_10px_25px_rgba(0,0,0,0.4)] text-[var(--gm-primary,#FE540B)] shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-[var(--gm-primary,#FE540B)]/20 to-transparent" />
              <Mail size={24} className="relative z-10 text-[var(--gm-primary,#FE540B)]" />
            </div>

            <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              Redefinir PIN de Acesso
            </h3>

            <p className="text-xs text-zinc-300/80 mt-1 mb-3 px-1 leading-relaxed">
              Enviaremos um link e código de autorização seguro para o e-mail cadastrado nesta conta:
            </p>

            {/* E-mail Mascarado */}
            <div className="w-full py-2 px-3 rounded-xl bg-white/[0.06] border border-white/15 text-xs font-mono text-zinc-200 mb-4 truncate shadow-inner flex items-center justify-center gap-2">
              <ShieldCheck size={14} className="text-[var(--gm-primary,#FE540B)] shrink-0" />
              <span className="truncate">{maskEmail(email)}</span>
            </div>

            {/* Feedback de Envio com Sucesso */}
            {resetSentSuccess ? (
              <div className="w-full flex flex-col gap-3 mb-4 animate-fade-in">
                <div className="p-3 rounded-xl bg-white/[0.06] border border-[var(--gm-primary,#FE540B)]/40 text-left shadow-md">
                  <div className="flex items-center gap-2 text-[var(--gm-primary,#FE540B)] font-bold text-xs mb-1">
                    <CheckCircle2 size={15} />
                    <span>Link Enviado com Sucesso!</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    Verifique sua caixa de entrada e spam. Clique no link recebido para criar seu novo PIN diretamente neste app.
                  </p>
                </div>

                {/* Formulário de Código de Emergência */}
                <form onSubmit={handleVerifyEmergencyCode} className="w-full flex flex-col gap-2">
                  <label className="text-[11px] text-zinc-400 font-medium">
                    Ou digite o código de 6 dígitos recebido:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={emergencyCodeInput}
                      onChange={(e) =>
                        setEmergencyCodeInput(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="000000"
                      className="flex-1 h-11 rounded-xl bg-white/10 border border-white/20 text-center font-mono text-base tracking-widest text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--gm-primary,#FE540B)] focus:ring-1 focus:ring-[var(--gm-primary,#FE540B)]"
                    />
                    <button
                      type="submit"
                      className="h-11 px-4 rounded-xl bg-[var(--gm-primary,#FE540B)] text-white font-extrabold text-xs uppercase tracking-wider hover:brightness-110 active:scale-98 transition cursor-pointer shadow-md shrink-0"
                    >
                      Validar
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSendResetLink}
                disabled={isSendingReset}
                className="w-full h-12 rounded-xl bg-[var(--gm-primary,#FE540B)] text-white font-extrabold text-xs uppercase tracking-wider hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2 shadow-lg shadow-[var(--gm-primary,#FE540B)]/25 cursor-pointer disabled:opacity-50 mb-4"
              >
                {isSendingReset ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Enviando Link...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} className="text-white" />
                    <span>Enviar Link para o E-mail</span>
                  </>
                )}
              </button>
            )}

            {/* Mensagem de Erro se houver */}
            {errorMsg && (
              <div className="text-xs text-rose-400 font-semibold mb-3 flex items-center justify-center gap-1.5 animate-fade-in">
                <AlertCircle size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Voltar ao Teclado */}
            <button
              type="button"
              onClick={() => {
                setIsForgotView(false);
                setErrorMsg("");
              }}
              className="text-xs text-zinc-400 hover:text-[var(--gm-primary,#FE540B)] flex items-center justify-center gap-1.5 py-1.5 transition-colors duration-200 cursor-pointer font-medium"
            >
              <ArrowLeft size={13} />
              <span>Voltar para digitação do PIN</span>
            </button>
          </div>
        ) : (
          /* ========================================================================= */
          /* FLUXO NORMAL: DIGITAÇÃO DO PIN E ESTILO APPLE PREDEFINIDO NO APP */
          /* ========================================================================= */
          <>
            {/* CÁPSULA DE STATUS ANIMADA */}
            <AnimatePresence mode="wait">
              {isUnlocking ? (
                <motion.div
                  key="status-unlocked"
                  initial={{ opacity: 0, y: -8, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-[var(--gm-primary,#FE540B)]/20 text-[var(--gm-primary,#FE540B)] border border-[var(--gm-primary,#FE540B)]/50 mb-3 shadow-[0_0_20px_rgba(254,84,11,0.3)]"
                >
                  <CheckCircle2 size={13} className="text-[var(--gm-primary,#FE540B)] animate-pulse" />
                  <span>{currentMode === "change" ? "PIN ATUALIZADO" : "ACESSO AUTORIZADO"}</span>
                </motion.div>
              ) : isLocking ? (
                <motion.div
                  key="status-locking"
                  initial={{ opacity: 0, y: -8, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-white/10 text-zinc-300 border border-white/15 mb-3"
                >
                  <Lock size={12} className="text-zinc-300" />
                  <span>APP BLOQUEADO</span>
                </motion.div>
              ) : currentMode === "change" && changeStep === "verify_current" ? (
                <motion.div
                  key="status-change-current"
                  initial={{ opacity: 0, y: -8, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-white/10 text-zinc-300 border border-white/15 mb-3"
                >
                  <KeyRound size={12} className="text-zinc-400" />
                  <span>PASSO 1 DE 2: PIN ATUAL</span>
                </motion.div>
              ) : currentMode === "change" && changeStep === "create_new" ? (
                <motion.div
                  key="status-change-new"
                  initial={{ opacity: 0, y: -8, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-[var(--gm-primary,#FE540B)]/20 text-[var(--gm-primary,#FE540B)] border border-[var(--gm-primary,#FE540B)]/40 mb-3"
                >
                  <KeyRound size={12} className="text-[var(--gm-primary,#FE540B)]" />
                  <span>PASSO 2 DE 2: NOVO PIN</span>
                </motion.div>
              ) : currentMode === "change" && changeStep === "confirm_new" ? (
                <motion.div
                  key="status-change-confirm"
                  initial={{ opacity: 0, y: -8, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-[var(--gm-primary,#FE540B)]/20 text-[var(--gm-primary,#FE540B)] border border-[var(--gm-primary,#FE540B)]/40 mb-3"
                >
                  <KeyRound size={12} className="text-[var(--gm-primary,#FE540B)]" />
                  <span>CONFIRMAR NOVO PIN</span>
                </motion.div>
              ) : (
                <motion.div
                  key="status-normal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-6 mb-1"
                />
              )}
            </AnimatePresence>

            {/* CADEADO APPLE COM COR PREDEFINIDA NO APP E MOVIMENTO MECÂNICO */}
            <div className="relative flex items-center justify-center mb-1.5 sm:mb-2">
              {/* ONDAS DE CHOQUE RADIAIS - BLOQUEIO */}
              {isLocking && (
                <>
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0.9 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="absolute w-12 h-12 rounded-full border-2 border-[var(--gm-primary,#FE540B)] pointer-events-none shadow-[0_0_20px_var(--gm-primary,#FE540B)]"
                  />
                  <motion.div
                    initial={{ scale: 0.4, opacity: 0.7 }}
                    animate={{ scale: 1.7, opacity: 0 }}
                    transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 }}
                    className="absolute w-12 h-12 rounded-full bg-[var(--gm-primary,#FE540B)]/20 pointer-events-none"
                  />
                </>
              )}

              {/* ONDAS DE CHOQUE RADIAIS - DESBLOQUEIO */}
              {isUnlocking && (
                <>
                  <motion.div
                    initial={{ scale: 0.6, opacity: 1 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute w-12 h-12 rounded-full border-2 border-[var(--gm-primary,#FE540B)] pointer-events-none shadow-[0_0_30px_var(--gm-primary,#FE540B)]"
                  />
                  <motion.div
                    initial={{ scale: 0.35, opacity: 0.8 }}
                    animate={{ scale: 2.0, opacity: 0 }}
                    transition={{ duration: 0.65, ease: "easeOut", delay: 0.08 }}
                    className="absolute w-12 h-12 rounded-full bg-[var(--gm-primary,#FE540B)]/25 pointer-events-none"
                  />
                </>
              )}

              {/* CORPO DO CADEADO ESTILO APPLE GLASS */}
              <motion.div
                animate={
                  isLocking
                    ? { scale: [0.92, 1.06, 1], y: [-4, 2, 0] }
                    : isUnlocking
                    ? { scale: [0.96, 1.15, 1.08], y: [0, -4, -2] }
                    : { scale: 1, y: 0 }
                }
                transition={{
                  duration: 0.45,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`w-12 h-12 sm:w-13 sm:h-13 rounded-[18px] flex items-center justify-center shrink-0 relative transition-all duration-300 border ${
                  isUnlocking
                    ? "bg-white/10 border-white/25 shadow-[0_0_30px_rgba(254,84,11,0.45)] text-[var(--gm-primary,#FE540B)]"
                    : "bg-white/[0.06] border-white/12 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-[var(--gm-primary,#FE540B)]"
                }`}
                style={{ width: "48px", height: "48px" }}
              >
                {/* AURA SUTIL */}
                <motion.div
                  animate={{
                    opacity: [0.25, 0.5, 0.25],
                    scale: [0.95, 1.05, 0.95],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2.5,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 rounded-[18px] bg-[var(--gm-primary,#FE540B)]/15 blur-md pointer-events-none"
                />

                {(currentMode === "setup" || (currentMode === "change" && changeStep !== "verify_current")) && !isUnlocking ? (
                  <KeyRound size={22} className="text-[var(--gm-primary,#FE540B)] relative z-10" />
                ) : (
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="overflow-visible relative z-10"
                    style={{ filter: "drop-shadow(0 0 8px rgba(254,84,11,0.5))" }}
                  >
                    {/* HASTE DO CADEADO (SHACKLE) COM MOVIMENTO MECÂNICO FÍSICO */}
                    <motion.path
                      d="M7 11V7a5 5 0 0 1 10 0v4"
                      stroke="var(--gm-primary, #FE540B)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      animate={
                        isUnlocking
                          ? { y: -7, rotate: -25, originX: "7px", originY: "11px" }
                          : isLocking
                          ? { y: [-6, 1, 0], rotate: 0 }
                          : { y: 0, rotate: 0 }
                      }
                      transition={{
                        duration: 0.45,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                    {/* CORPO DO CADEADO */}
                    <rect
                      x="4"
                      y="11"
                      width="16"
                      height="11"
                      rx="3"
                      stroke="var(--gm-primary, #FE540B)"
                      strokeWidth="2.2"
                      fill="var(--gm-primary, #FE540B)"
                      fillOpacity="0.20"
                    />
                    {/* FECHADURA */}
                    <motion.circle
                      cx="12"
                      cy="15.5"
                      r="1.4"
                      fill="var(--gm-primary, #FE540B)"
                      animate={isUnlocking ? { scale: [1, 1.4, 1.2] } : {}}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                    <motion.path
                      d="M12 17v2"
                      stroke="var(--gm-primary, #FE540B)"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </motion.div>
            </div>

            {/* TÍTULO E INSTRUÇÃO DINÂMICOS */}
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight transition-colors duration-300">
              {isUnlocking
                ? (currentMode === "change" ? "PIN Alterado com Sucesso!" : "Acesso Liberado!")
                : currentMode === "change"
                ? changeStep === "verify_current"
                  ? "Informe o PIN Atual"
                  : changeStep === "create_new"
                  ? "Criar Novo PIN"
                  : "Confirmar Novo PIN"
                : title ||
                  (currentMode === "setup"
                    ? setupStep === "create"
                      ? "Definir PIN de Segurança"
                      : "Confirme o seu PIN"
                    : "PIN de Segurança")}
            </h3>

            <p className="text-[11px] sm:text-xs text-zinc-300/80 mt-0.5 mb-2 px-1 leading-snug line-clamp-2">
              {isUnlocking ? (
                <span className="text-[var(--gm-primary,#FE540B)] font-semibold flex items-center justify-center gap-1.5 animate-pulse">
                  <Sparkles size={13} />{" "}
                  {currentMode === "change" ? "Gravando novo PIN..." : "Carregando..."}
                </span>
              ) : currentMode === "change" ? (
                changeStep === "verify_current"
                  ? "Digite seu PIN atual de 4 dígitos para autorizar a alteração."
                  : changeStep === "create_new"
                  ? "PIN atual verificado! Digite o novo PIN de 4 dígitos."
                  : "Digite os mesmos 4 dígitos novamente para confirmar."
              ) : (
                description ||
                (currentMode === "setup"
                  ? setupStep === "create"
                    ? "Digite 4 dígitos que você lembrará facilmente."
                    : "Digite os mesmos 4 dígitos para confirmar."
                  : userName
                  ? `Olá, ${userName}. Digite os 4 dígitos para continuar.`
                  : "Digite seu PIN de 4 dígitos para autorizar o acesso com as credenciais salvas.")
              )}
            </p>

            {/* 4 PONTOS / BUBBLES DO PIN */}
            <div className="relative mb-2 flex flex-col items-center">
              <motion.div
                animate={isShaking ? { x: [-12, 12, -9, 9, -4, 4, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="flex items-center justify-center gap-2.5 relative z-10"
              >
                {[0, 1, 2, 3].map((index) => {
                  const filled = pin.length > index;
                  return (
                    <motion.div
                      key={index}
                      animate={
                        isUnlocking
                          ? {
                              scale: [1, 1.35, 1.2],
                              backgroundColor: "var(--gm-primary, #FE540B)",
                              borderColor: "var(--gm-primary, #FE540B)",
                            }
                          : {}
                      }
                      transition={{ delay: index * 0.06, duration: 0.3, ease: "easeOut" }}
                      className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 transition-all duration-200 ${
                        isUnlocking
                          ? "bg-[var(--gm-primary,#FE540B)] border-[var(--gm-primary,#FE540B)] shadow-[0_0_18px_var(--gm-primary,#FE540B)]"
                          : filled
                          ? "bg-[var(--gm-primary,#FE540B)] border-[var(--gm-primary,#FE540B)] scale-110 shadow-[0_0_14px_var(--gm-primary,#FE540B)]"
                          : isShaking
                          ? "border-rose-500 bg-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.6)]"
                          : "border-white/35 bg-white/5"
                      }`}
                    />
                  );
                })}
              </motion.div>

              {/* LINHA DE ENERGIA CONECTANDO OS PONTOS NO DESBLOQUEIO */}
              {isUnlocking && (
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="absolute top-1 h-0.5 w-28 bg-[var(--gm-primary,#FE540B)] shadow-[0_0_14px_var(--gm-primary,#FE540B)] rounded-full pointer-events-none"
                />
              )}
            </div>

            {/* MENSAGEM DE ERRO */}
            {errorMsg && (
              <div className="text-[11px] text-rose-400 font-semibold mb-1.5 flex items-center justify-center gap-1.5 animate-fade-in">
                <AlertCircle size={13} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* TECLADO NUMÉRICO VIRTUAL APPLE GLASS */}
            <div
              className={`gm-pin-keypad grid grid-cols-3 gap-2 w-full max-w-[280px] sm:max-w-[304px] transition-all duration-300 ${
                isUnlocking ? "opacity-25 pointer-events-none scale-95" : "opacity-100"
              }`}
              style={{
                width: "100%",
                maxWidth: "284px",
                marginLeft: "auto",
                marginRight: "auto",
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "8px",
                boxSizing: "border-box",
              }}
            >
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleDigit(num)}
                  className="gm-pin-key h-[44px] min-h-[44px] sm:h-[48px] sm:min-h-[48px] rounded-[14px] bg-white/[0.08] hover:bg-white/[0.15] active:bg-[var(--gm-primary,#FE540B)]/30 border border-white/12 hover:border-white/25 active:scale-95 transition-all text-[19px] sm:text-[20px] font-semibold text-white flex items-center justify-center cursor-pointer shadow-none touch-manipulation select-none"
                  style={{
                    height: "44px",
                    minHeight: "44px",
                    fontSize: "19px",
                    borderRadius: "14px",
                    lineHeight: "1",
                  }}
                >
                  {num}
                </button>
              ))}

              {/* BOTÃO CANCELAR */}
              <div 
                className="h-[44px] min-h-[44px] sm:h-[48px] sm:min-h-[48px] flex items-center justify-center"
                style={{ height: "44px", minHeight: "44px" }}
              >
                {onCancel ? (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="text-[11px] text-zinc-400 hover:text-white uppercase font-bold tracking-wider transition px-1.5 py-1.5 cursor-pointer touch-manipulation active:scale-95"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>

              {/* DÍGITO 0 */}
              <button
                type="button"
                onClick={() => handleDigit("0")}
                className="gm-pin-key h-[44px] min-h-[44px] sm:h-[48px] sm:min-h-[48px] rounded-[14px] bg-white/[0.08] hover:bg-white/[0.15] active:bg-[var(--gm-primary,#FE540B)]/30 border border-white/12 hover:border-white/25 active:scale-95 transition-all text-[19px] sm:text-[20px] font-semibold text-white flex items-center justify-center cursor-pointer shadow-none touch-manipulation select-none"
                style={{
                  height: "44px",
                  minHeight: "44px",
                  fontSize: "19px",
                  borderRadius: "14px",
                  lineHeight: "1",
                }}
              >
                0
              </button>

              {/* BOTÃO APAGAR (BACKSPACE) */}
              <button
                type="button"
                onClick={handleDelete}
                disabled={pin.length === 0}
                className="gm-pin-key h-[44px] min-h-[44px] sm:h-[48px] sm:min-h-[48px] rounded-[14px] bg-white/[0.05] hover:bg-white/[0.12] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 transition-all flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer touch-manipulation select-none"
                style={{
                  height: "44px",
                  minHeight: "44px",
                  borderRadius: "14px",
                }}
                title="Apagar"
              >
                <Delete size={18} />
              </button>
            </div>

            {/* BOTÃO ESQUECI MEU PIN (VISÍVEL NO MODO VERIFY OU NA VERIFICAÇÃO DO PIN ATUAL NO MODO CHANGE) */}
            {((currentMode === "verify") || (currentMode === "change" && changeStep === "verify_current")) && !isUnlocking && (
              <div className="mt-1.5 sm:mt-2 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotView(true);
                    setErrorMsg("");
                  }}
                  className="text-xs hover:scale-105 text-zinc-400 hover:text-[var(--gm-primary,#FE540B)] font-medium no-underline hover:no-underline transition-all duration-200 cursor-pointer bg-transparent hover:bg-transparent focus:bg-transparent active:bg-transparent border-0 outline-none p-1 select-none shadow-none touch-manipulation"
                >
                  Esqueci meu PIN
                </button>
              </div>
            )}

            {/* DICA DE TECLADO FÍSICO (SOMENTE NO DESKTOP) */}
            <p className="text-[9.5px] text-zinc-400/80 mt-1 select-none hidden sm:block">
              Você também pode digitar pelo teclado numérico
            </p>
          </>
        )}
      </motion.div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
}
