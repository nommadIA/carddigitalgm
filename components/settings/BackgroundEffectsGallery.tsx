import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MousePointer2,
  Activity,
  Compass,
  Sparkles,
  Orbit,
  Check,
  Power,
  Lock,
  Monitor,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Layers,
  Play,
  Maximize2,
  Sparkle,
  CheckCircle2,
  Radio,
  ExternalLink,
  Rainbow,
  Gauge,
} from "lucide-react";
import {
  BG_EFFECT_ITEMS,
  BgEffectConfig,
  BgEffectType,
  BgTargetScope,
  readBgEffectConfig,
  saveBgEffectConfig,
  getEffectFor,
  isEffectActiveFor,
  getEffectStrength,
  saveEffectStrength,
} from "../../lib/backgroundEffects";
import { playUiSound } from "../../lib/uiSound";
import { readSettingsLocal } from "../../lib/settings";
import PinLockModal from "../auth/PinLockModal";

interface BackgroundEffectsGalleryProps {
  tenantId?: string | null;
  onSaveToBackend?: (config: BgEffectConfig) => void;
}

interface BackgroundInfo {
  url: string;
  isVideo: boolean;
  fit: string;
  pos_x: string;
  pos_y: string;
  scale: number;
}

function resolveCurrentBackground(): BackgroundInfo {
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
        scale: s?.app_background_scale ?? 1,
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
            scale: 1,
          };
        }
      }
    } catch {}
  }

  return {
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920&auto=format&fit=crop",
    isVideo: false,
    fit: "cover",
    pos_x: "50%",
    pos_y: "50%",
    scale: 1,
  };
}

export function BackgroundEffectsGallery({
  tenantId,
  onSaveToBackend,
}: BackgroundEffectsGalleryProps) {
  const [config, setConfig] = useState<BgEffectConfig>(() => readBgEffectConfig());
  const [activeTab, setActiveTab] = useState<BgTargetScope>("desktop");
  const [previewHover, setPreviewHover] = useState<BgEffectType | null>(null);
  const [liveToast, setLiveToast] = useState<{ effectName: string; scope: string } | null>(null);
  const [testLockModalOpen, setTestLockModalOpen] = useState(false);
  const [mirrorLockOnDesktop, setMirrorLockOnDesktop] = useState(false);
  const [bgInfo] = useState<BackgroundInfo>(() => resolveCurrentBackground());

  // Coordenadas simuladas para o preview do mouse interativo no card de vitrine
  const [mockMouse, setMockMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const handleSync = (e: any) => {
      if (e?.detail) setConfig(e.detail);
      else setConfig(readBgEffectConfig());
    };
    window.addEventListener("gm-bg-effect-changed", handleSync);
    return () => window.removeEventListener("gm-bg-effect-changed", handleSync);
  }, []);

  // Quando o espelhamento de bloqueio na área de trabalho for alterado
  useEffect(() => {
    if (mirrorLockOnDesktop) {
      document.documentElement.setAttribute("data-bg-effect-desktop", config.lockscreenEffect);
      return () => {
        const saved = readBgEffectConfig();
        if (saved.desktopEnabled) {
          document.documentElement.setAttribute("data-bg-effect-desktop", saved.desktopEffect);
        } else {
          document.documentElement.removeAttribute("data-bg-effect-desktop");
        }
      };
    }
  }, [mirrorLockOnDesktop, config.lockscreenEffect]);

  const updateConfig = (
    partial: Partial<BgEffectConfig>,
    soundType: "click" | "toggle_on" | "toggle_off" = "click"
  ) => {
    try {
      playUiSound(soundType);
    } catch {}
    const next = saveBgEffectConfig(partial);
    setConfig(next);
    if (onSaveToBackend) onSaveToBackend(next);
  };

  const getEffectIcon = (id: BgEffectType, className = "w-5 h-5") => {
    switch (id) {
      case "mouse":
        return <MousePointer2 className={className} />;
      case "pulse":
        return <Activity className={className} />;
      case "drift":
        return <Compass className={className} />;
      case "aurora":
        return <Rainbow className={className} />;
      case "orbit":
        return <Orbit className={className} />;
      case "prism":
        return <Layers className={className} />;
    }
  };

  const handleStrengthChange = (effectId: BgEffectType, newStrength: number) => {
    try {
      playUiSound("click");
    } catch {}
    const next = saveEffectStrength(activeTab, effectId, newStrength);
    setConfig(next);
    if (onSaveToBackend) onSaveToBackend(next);
  };

  // Efeito e status do ambiente atualmente selecionado na aba
  const isCurrentTabActive = isEffectActiveFor(activeTab, config);
  const currentTabEffect = getEffectFor(activeTab, config);

  const toggleTabEffect = (target: BgTargetScope) => {
    if (target === "desktop") {
      const nextState = !config.desktopEnabled;
      updateConfig(
        { desktopEnabled: nextState },
        nextState ? "toggle_on" : "toggle_off"
      );
    } else {
      const nextState = !config.lockscreenEnabled;
      updateConfig(
        { lockscreenEnabled: nextState },
        nextState ? "toggle_on" : "toggle_off"
      );
    }
  };

  // CLIQUEI NO EFEITO: aplica imediatamente em tempo real!
  const setTabEffect = (target: BgTargetScope, effectId: BgEffectType) => {
    const item = BG_EFFECT_ITEMS.find((e) => e.id === effectId);
    if (target === "desktop") {
      updateConfig(
        {
          desktopEnabled: true,
          desktopEffect: effectId,
        },
        "click"
      );
      setLiveToast({
        effectName: item?.name || effectId,
        scope: "Área de Trabalho",
      });
    } else {
      updateConfig(
        {
          lockscreenEnabled: true,
          lockscreenEffect: effectId,
        },
        "click"
      );
      setLiveToast({
        effectName: item?.name || effectId,
        scope: "Tela de Bloqueio",
      });
    }

    setTimeout(() => {
      setLiveToast(null);
    }, 4000);
  };

  const desktopItem = BG_EFFECT_ITEMS.find((e) => e.id === config.desktopEffect) || BG_EFFECT_ITEMS[0];
  const lockItem = BG_EFFECT_ITEMS.find((e) => e.id === config.lockscreenEffect) || BG_EFFECT_ITEMS[2];
  const currentItem = BG_EFFECT_ITEMS.find((e) => e.id === currentTabEffect) || BG_EFFECT_ITEMS[0];
  const currentTabStrength = getEffectStrength(activeTab, currentTabEffect, config);

  // Animação calculada para a vitrine interativa
  const getStageAnimation = (effectId: BgEffectType) => {
    const strengthMultiplier = (getEffectStrength(activeTab, effectId, config) || 100) / 100;
    switch (effectId) {
      case "mouse":
        return {
          animate: {
            scale: 1 + 0.06 * strengthMultiplier,
            x: mockMouse.x * 12 * strengthMultiplier,
            y: mockMouse.y * 12 * strengthMultiplier,
            rotate: 0,
          },
          transition: { type: "spring", stiffness: 140, damping: 22 },
        };
      case "pulse":
        return {
          animate: {
            scale: [1, 1 + 0.08 * strengthMultiplier, 1],
            opacity: [0.92, 1, 0.92],
          },
          transition: { duration: 4.5, repeat: Infinity, ease: "easeInOut" },
        };
      case "drift":
        return {
          animate: {
            scale: [1 + 0.02 * strengthMultiplier, 1 + 0.09 * strengthMultiplier, 1 + 0.04 * strengthMultiplier, 1 + 0.09 * strengthMultiplier, 1 + 0.02 * strengthMultiplier],
            x: ["0%", `${(-4 * strengthMultiplier).toFixed(1)}%`, `${(3 * strengthMultiplier).toFixed(1)}%`, `${(-2 * strengthMultiplier).toFixed(1)}%`, "0%"],
            y: ["0%", `${(3 * strengthMultiplier).toFixed(1)}%`, `${(-3 * strengthMultiplier).toFixed(1)}%`, `${(-4 * strengthMultiplier).toFixed(1)}%`, "0%"],
          },
          transition: { duration: 12, repeat: Infinity, ease: "easeInOut" },
        };
      case "aurora":
        return {
          animate: {
            scale: [1 + 0.02 * strengthMultiplier, 1 + 0.06 * strengthMultiplier, 1 + 0.02 * strengthMultiplier],
            x: [`${(-2 * strengthMultiplier).toFixed(1)}%`, `${(2 * strengthMultiplier).toFixed(1)}%`, `${(-2 * strengthMultiplier).toFixed(1)}%`],
            y: [`${(-1 * strengthMultiplier).toFixed(1)}%`, `${(1 * strengthMultiplier).toFixed(1)}%`, `${(-1 * strengthMultiplier).toFixed(1)}%`],
          },
          transition: { duration: 6, repeat: Infinity, ease: "easeInOut" },
        };
      case "orbit":
        return {
          animate: {
            scale: [1 + 0.02 * strengthMultiplier, 1 + 0.07 * strengthMultiplier, 1 + 0.02 * strengthMultiplier, 1 + 0.07 * strengthMultiplier, 1 + 0.02 * strengthMultiplier],
            x: ["0%", `${(3 * strengthMultiplier).toFixed(1)}%`, "0%", `${(-3 * strengthMultiplier).toFixed(1)}%`, "0%"],
            y: [`${(-3 * strengthMultiplier).toFixed(1)}%`, "0%", `${(3 * strengthMultiplier).toFixed(1)}%`, "0%", `${(-3 * strengthMultiplier).toFixed(1)}%`],
            rotate: [0, 1.2 * strengthMultiplier, 0, -1.2 * strengthMultiplier, 0],
          },
          transition: { duration: 8, repeat: Infinity, ease: "easeInOut" },
        };
      case "prism":
        return {
          animate: {
            scale: [1 + 0.02 * strengthMultiplier, 1 + 0.08 * strengthMultiplier, 1 + 0.03 * strengthMultiplier, 1 + 0.08 * strengthMultiplier, 1 + 0.02 * strengthMultiplier],
            rotate: [0, 0.8 * strengthMultiplier, 0, -0.8 * strengthMultiplier, 0],
            x: ["0%", `${(2 * strengthMultiplier).toFixed(1)}%`, `${(-2 * strengthMultiplier).toFixed(1)}%`, "0%"],
            y: ["0%", `${(-2 * strengthMultiplier).toFixed(1)}%`, `${(2 * strengthMultiplier).toFixed(1)}%`, "0%"],
            filter: [
              "hue-rotate(0deg) saturate(1.05)",
              `hue-rotate(${(15 * strengthMultiplier).toFixed(0)}deg) saturate(${(1 + 0.25 * strengthMultiplier).toFixed(2)})`,
              `hue-rotate(${(-12 * strengthMultiplier).toFixed(0)}deg) saturate(${(1 + 0.15 * strengthMultiplier).toFixed(2)})`,
              "hue-rotate(0deg) saturate(1.05)",
            ],
          },
          transition: { duration: 7, repeat: Infinity, ease: "easeInOut" },
        };
      default:
        return {
          animate: { scale: 1, x: 0, y: 0 },
          transition: { duration: 0.3 },
        };
    }
  };

  const stageAnim = getStageAnimation(currentTabEffect);

  return (
    <div className="flex flex-col gap-6 pt-2">
      {/* ========================================================================= */}
      {/* TOAST DE FEEDBACK IMEDIATO: CLIQUEI NO EFEITO, PRÉVIA EM TEMPO REAL ATIVA */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {liveToast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            className="fixed top-20 right-4 md:right-8 z-[10005] flex items-center gap-3 px-4 py-3 rounded-2xl bg-zinc-900/95 border border-emerald-500/50 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl text-white select-none max-w-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-black flex items-center gap-1.5 text-emerald-400 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Prévia ao Vivo Ativa!</span>
              </div>
              <div className="text-xs text-zinc-300 mt-0.5">
                Efeito <strong>{liveToast.effectName}</strong> em execução no <strong>{liveToast.scope}</strong>.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* CABEÇALHO DA GALERIA APPLE GLASS */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 fora p-4 sm:p-5 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--gm-primary)]" />
            <span className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-white uppercase tracking-wider">
              Galeria de Efeitos do Plano de Fundo (6 Efeitos)
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Clique em qualquer efeito para <strong>ver a prévia em tempo real instantaneamente</strong> antes de salvar. Configure efeitos independentes para a <strong>Área de Trabalho</strong> e <strong>Tela de Bloqueio</strong>.
          </div>
        </div>

        {/* INDICADOR GLOBAL DE ATIVAÇÃO */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">Status:</span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold">
            <span
              className={`w-2 h-2 rounded-full ${
                config.desktopEnabled || config.lockscreenEnabled
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                  : "bg-zinc-600"
              }`}
            />
            <span className={config.desktopEnabled || config.lockscreenEnabled ? "text-emerald-400" : "text-zinc-400"}>
              {config.desktopEnabled && config.lockscreenEnabled
                ? "Ambos Ativos"
                : config.desktopEnabled
                ? "Desktop Ativo"
                : config.lockscreenEnabled
                ? "Bloqueio Ativo"
                : "Desativados"}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAINEL DUPLO RESUMO COM SWITCH INDEPENDENTE ESTILO APPLE iOS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* CARD AMBIENTE 1: ÁREA DE TRABALHO */}
        <div
          onClick={() => {
            try { playUiSound("tab"); } catch {}
            setActiveTab("desktop");
          }}
          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 relative select-none ${
            activeTab === "desktop"
              ? "border-[var(--gm-primary)] bg-[var(--gm-primary)]/10 shadow-[0_0_24px_rgba(254,84,11,0.18)]"
              : "border-white/10 fora hover:border-white/20 hover:bg-white/[0.03]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                config.desktopEnabled
                  ? "bg-[var(--gm-primary)] text-white shadow-[0_0_12px_rgba(254,84,11,0.35)]"
                  : "bg-white/5 text-zinc-500"
              }`}
            >
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  Área de Trabalho
                </span>
                {activeTab === "desktop" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] border border-[var(--gm-primary)]/30">
                    Editando
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                <span>Efeito:</span>
                <span className="font-bold text-slate-300">
                  {config.desktopEnabled ? desktopItem.name : "Desativado"}
                </span>
              </div>
            </div>
          </div>

          {/* SWITCH NATIVO APPLE iOS PARA DESKTOP */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              toggleTabEffect("desktop");
            }}
            title={config.desktopEnabled ? "Clique para desativar efeito no Desktop" : "Clique para ativar efeito no Desktop"}
            className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 cursor-pointer flex items-center shrink-0 ${
              config.desktopEnabled ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" : "bg-zinc-700"
            }`}
          >
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              className={`w-5 h-5 rounded-full bg-white shadow-md transform ${
                config.desktopEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </div>
        </div>

        {/* CARD AMBIENTE 2: TELA DE BLOQUEIO */}
        <div
          onClick={() => {
            try { playUiSound("tab"); } catch {}
            setActiveTab("lockscreen");
          }}
          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 relative select-none ${
            activeTab === "lockscreen"
              ? "border-[var(--gm-primary)] bg-[var(--gm-primary)]/10 shadow-[0_0_24px_rgba(254,84,11,0.18)]"
              : "border-white/10 fora hover:border-white/20 hover:bg-white/[0.03]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                config.lockscreenEnabled
                  ? "bg-[var(--gm-primary)] text-white shadow-[0_0_12px_rgba(254,84,11,0.35)]"
                  : "bg-white/5 text-zinc-500"
              }`}
            >
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  Tela de Bloqueio (PIN)
                </span>
                {activeTab === "lockscreen" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] border border-[var(--gm-primary)]/30">
                    Editando
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                <span>Efeito:</span>
                <span className="font-bold text-slate-300">
                  {config.lockscreenEnabled ? lockItem.name : "Desativado"}
                </span>
              </div>
            </div>
          </div>

          {/* SWITCH NATIVO APPLE iOS PARA TELA DE BLOQUEIO */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              toggleTabEffect("lockscreen");
            }}
            title={config.lockscreenEnabled ? "Clique para desativar efeito no Bloqueio" : "Clique para ativar efeito no Bloqueio"}
            className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 cursor-pointer flex items-center shrink-0 ${
              config.lockscreenEnabled ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" : "bg-zinc-700"
            }`}
          >
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              className={`w-5 h-5 rounded-full bg-white shadow-md transform ${
                config.lockscreenEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEGMENTED CONTROL NATIVO APPLE iOS PARA SELEÇÃO DO AMBIENTE EM EDIÇÃO */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="inline-flex p-1 rounded-xl bg-black/40 border border-white/10 self-start">
          <button
            type="button"
            onClick={() => {
              try { playUiSound("tab"); } catch {}
              setActiveTab("desktop");
            }}
            className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "desktop"
                ? "bg-[var(--gm-primary)] text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Área de Trabalho ({config.desktopEnabled ? desktopItem.name : "Off"})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              try { playUiSound("tab"); } catch {}
              setActiveTab("lockscreen");
            }}
            className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "lockscreen"
                ? "bg-[var(--gm-primary)] text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Tela de Bloqueio ({config.lockscreenEnabled ? lockItem.name : "Off"})</span>
          </button>
        </div>

        {/* STATUS DO AMBIENTE ATIVO */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-zinc-400">
            Ambiente selecionado: <strong className="text-white">{activeTab === "desktop" ? "Área de Trabalho" : "Tela de Bloqueio"}</strong>
          </span>
          <button
            type="button"
            onClick={() => toggleTabEffect(activeTab)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
              isCurrentTabActive
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"
            }`}
          >
            {isCurrentTabActive ? "● Ativado (Clique para pausar)" : "○ Desativado (Clique para ativar)"}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VITRINE DE PRÉVIA EM TEMPO REAL AO VIVO (LIVE SHOWCASE STAGE) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-white/10 fora p-4 sm:p-5 backdrop-blur-md relative overflow-hidden flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
              <span>Prévia em Tempo Real:</span>
              <span className="text-[var(--gm-primary)] font-bold">{currentItem.name}</span>
            </span>
          </div>

          {/* BOTÕES DE AÇÃO RÁPIDA NA PRÉVIA */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === "lockscreen" ? (
              <>
                <button
                  type="button"
                  onClick={() => setMirrorLockOnDesktop(!mirrorLockOnDesktop)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                    mirrorLockOnDesktop
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                      : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10"
                  }`}
                  title="Espelha o efeito da tela de bloqueio na janela inteira da área de trabalho agora mesmo"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{mirrorLockOnDesktop ? "Espelhado no Fundo (Ativo)" : "Espelhar no Fundo Agora"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    try { playUiSound("click"); } catch {}
                    setTestLockModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[var(--gm-primary)] hover:brightness-110 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-[0_4px_16px_rgba(254,84,11,0.3)] cursor-pointer active:scale-95"
                  title="Abre a tela de bloqueio real para testar o efeito com o teclado PIN e wallpaper"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Testar Bloqueio em Tela Cheia</span>
                </button>
              </>
            ) : (
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>O fundo deste app já está se movendo com este efeito</span>
              </span>
            )}
          </div>
        </div>

        {/* STAGE DISPLAY DO MONITOR / TELA COM O WALLPAPER DO USUÁRIO */}
        <div
          onPointerMove={(e) => {
            if (currentTabEffect === "mouse") {
              const rect = e.currentTarget.getBoundingClientRect();
              const normX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
              const normY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
              setMockMouse({ x: normX, y: normY });
            }
          }}
          onPointerLeave={() => {
            setMockMouse({ x: 0, y: 0 });
          }}
          className="w-full h-44 sm:h-52 rounded-xl overflow-hidden relative border border-white/15 bg-black flex items-center justify-center select-none shadow-inner group"
        >
          {/* CAMADA DE FUNDO WALLPAPER ANIMANDO DE FORMA CONTÍNUA */}
          <motion.div
            animate={stageAnim.animate}
            transition={stageAnim.transition as any}
            className="absolute inset-[-12%] w-[124%] h-[124%] will-change-transform"
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
                className="w-full h-full bg-cover bg-center"
                style={{
                  backgroundImage: `url("${bgInfo.url}")`,
                  backgroundPosition: `${bgInfo.pos_x} ${bgInfo.pos_y}`,
                }}
              />
            )}
          </motion.div>

          {/* EFEITOS DE CAMADA ESPECIAIS (AURORA / PRISM) NO STAGE */}
          {currentTabEffect === "aurora" && (
            <motion.div
              animate={{
                x: ["-80%", "80%"],
                opacity: [
                  0.18 * (currentTabStrength / 100),
                  0.55 * (currentTabStrength / 100),
                  0.18 * (currentTabStrength / 100),
                ],
              }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/30 via-[var(--gm-primary)]/50 via-purple-500/35 to-transparent skew-x-12 blur-lg pointer-events-none"
            />
          )}

          {currentTabEffect === "prism" && (
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1 + 0.05 * (currentTabStrength / 100), 1],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              style={{ opacity: 0.35 * (currentTabStrength / 100) }}
              className="absolute inset-[-20%] w-[140%] h-[140%] bg-[conic-gradient(from_0deg,rgba(254,84,11,0.6),rgba(168,85,247,0.5),rgba(59,130,246,0.5),rgba(16,185,129,0.5),rgba(254,84,11,0.6))] blur-2xl pointer-events-none"
            />
          )}

          {/* OVERLAY SUTIL */}
          <div className="absolute inset-0 bg-black/30 pointer-events-none" />

          {/* ELEMENTOS SIMULADOS DO AMBIENTE (DESKTOP OU TELA DE BLOQUEIO) */}
          {activeTab === "lockscreen" ? (
            <div className="relative z-10 flex flex-col items-center justify-center text-center p-3 pointer-events-none">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center mb-1 text-white shadow-lg">
                <Lock className="w-4 h-4 text-[var(--gm-primary)]" />
              </div>
              <div className="text-white text-base sm:text-lg font-black tracking-tight drop-shadow-md">
                12:45
              </div>
              <div className="text-[10px] text-zinc-300 font-semibold tracking-wider uppercase drop-shadow">
                Tela de Bloqueio PIN Protegida
              </div>
              <div className="mt-2 flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full border border-white/40 bg-white/10 backdrop-blur-xs"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col items-center justify-center text-center p-3 pointer-events-none">
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center mb-1.5 text-white shadow-lg">
                <Monitor className="w-4 h-4 text-[var(--gm-primary)]" />
              </div>
              <div className="text-white text-xs sm:text-sm font-black tracking-tight drop-shadow-md">
                Área de Trabalho do Sistema
              </div>
              <div className="text-[10px] text-emerald-400 font-bold drop-shadow flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Simulação do Efeito {currentItem.name} em 60fps</span>
              </div>
              {currentTabEffect === "mouse" && (
                <div className="text-[9px] text-zinc-300/90 mt-1 bg-black/50 px-2 py-0.5 rounded-md border border-white/10">
                  Passe o cursor aqui dentro para sentir o Parallax
                </div>
              )}
            </div>
          )}

          {/* BADGES FLUTUANTES NO CANTO DA VITRINE */}
          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/75 border border-white/15 text-[10px] font-bold text-zinc-300 backdrop-blur-md flex items-center gap-1.5 z-20 shadow-md">
            <Gauge className="w-3 h-3 text-[var(--gm-primary)]" />
            <span>Força: <strong className="text-white">{currentTabStrength}%</strong></span>
          </div>

          <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/75 border border-white/15 text-[10px] font-bold text-zinc-200 backdrop-blur-md flex items-center gap-1.5 z-20 shadow-md">
            {getEffectIcon(currentTabEffect, "w-3 h-3 text-[var(--gm-primary)]")}
            <span>{currentItem.name} ({currentItem.badge})</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GRID DOS 6 EFEITOS PARA O AMBIENTE ATIVO */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--gm-primary)] flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>
              Escolha o Efeito para {activeTab === "desktop" ? "a Área de Trabalho" : "a Tela de Bloqueio"} (6 Opções)
            </span>
          </label>
          <span className="text-[11px] text-zinc-400">
            {isCurrentTabActive ? (
              <span className="text-emerald-400 font-medium">● Ao vivo no app</span>
            ) : (
              <span className="text-zinc-500">○ Ative para ver a animação</span>
            )}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {BG_EFFECT_ITEMS.map((effect) => {
            const isSelectedForThisTab = currentTabEffect === effect.id;
            const isAssignedToOtherTab =
              activeTab === "desktop"
                ? config.lockscreenEnabled && config.lockscreenEffect === effect.id
                : config.desktopEnabled && config.desktopEffect === effect.id;
            const effectStrength = getEffectStrength(activeTab, effect.id, config);

            return (
              <div
                key={effect.id}
                onMouseEnter={() => setPreviewHover(effect.id)}
                onMouseLeave={() => setPreviewHover(null)}
                onClick={() => setTabEffect(activeTab, effect.id)}
                className={`relative rounded-2xl border p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden group select-none ${
                  !isCurrentTabActive ? "opacity-60 hover:opacity-100" : ""
                } ${
                  isSelectedForThisTab && isCurrentTabActive
                    ? "border-[var(--gm-primary)] bg-[var(--gm-primary)]/10 shadow-[0_10px_30px_rgba(254,84,11,0.22)] ring-1 ring-[var(--gm-primary)]/40"
                    : "border-white/10 fora hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                {/* MINI PREVIEW DA ANIMAÇÃO DO EFEITO COM ACELERAÇÃO NATIVA */}
                <div className="w-full h-24 rounded-xl overflow-hidden mb-3 relative bg-black/50 border border-white/5 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black opacity-80" />

                  {/* ANIMAÇÃO 1: MOUSE PARALLAX */}
                  {effect.id === "mouse" && (
                    <motion.div
                      animate={{
                        x: [-12, 12, -8, 10, -12],
                        y: [-8, 8, 10, -6, -8],
                      }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      className="w-16 h-16 rounded-xl border border-white/20 bg-[var(--gm-primary)]/20 backdrop-blur-xs flex items-center justify-center shadow-lg"
                    >
                      <MousePointer2 className="w-5 h-5 text-[var(--gm-primary)]" />
                    </motion.div>
                  )}

                  {/* ANIMAÇÃO 2: PULSE / RESPIRAÇÃO */}
                  {effect.id === "pulse" && (
                    <motion.div
                      animate={{
                        scale: [0.94, 1.16, 0.94],
                        opacity: [0.65, 1, 0.65],
                      }}
                      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                      className="w-16 h-16 rounded-xl border border-white/20 bg-[var(--gm-primary)]/25 backdrop-blur-xs flex items-center justify-center shadow-[0_0_25px_rgba(254,84,11,0.4)]"
                    >
                      <Activity className="w-5 h-5 text-[var(--gm-primary)]" />
                    </motion.div>
                  )}

                  {/* ANIMAÇÃO 3: DERIVA CINEMÁTICA */}
                  {effect.id === "drift" && (
                    <motion.div
                      animate={{
                        x: ["-18%", "18%", "-18%"],
                        y: ["-10%", "10%", "-10%"],
                        scale: [1, 1.14, 1],
                      }}
                      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                      className="w-16 h-16 rounded-xl border border-white/20 bg-[var(--gm-primary)]/20 backdrop-blur-xs flex items-center justify-center shadow-lg"
                    >
                      <Compass className="w-5 h-5 text-[var(--gm-primary)]" />
                    </motion.div>
                  )}

                  {/* ANIMAÇÃO 4: FEIXE AURORA LUMINESCENTE */}
                  {effect.id === "aurora" && (
                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                      <motion.div
                        animate={{
                          x: ["-85%", "85%"],
                          opacity: [0.35, 0.9, 0.35],
                          scaleY: [0.85, 1.25, 0.85],
                        }}
                        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/35 via-[var(--gm-primary)]/50 via-purple-500/40 to-transparent skew-x-12 blur-xs"
                      />
                      <motion.div
                        animate={{
                          x: ["60%", "-60%"],
                          opacity: [0.2, 0.7, 0.2],
                        }}
                        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/25 via-[var(--gm-primary)]/40 to-transparent -skew-x-12 blur-sm"
                      />
                      <motion.div
                        animate={{
                          scale: [1, 1.1, 1],
                          rotate: [0, 2, -2, 0],
                        }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                        className="w-16 h-16 rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 via-[var(--gm-primary)]/25 to-purple-600/20 backdrop-blur-xs flex items-center justify-center z-10 shadow-[0_0_25px_rgba(16,185,129,0.35)]"
                      >
                        <Rainbow className="w-6 h-6 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                      </motion.div>
                    </div>
                  )}

                  {/* ANIMAÇÃO 5: PÊNDULO ORBITAL */}
                  {effect.id === "orbit" && (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 rounded-full border border-dashed border-[var(--gm-primary)]/40 flex items-center justify-center"
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--gm-primary)] absolute -top-1 shadow-[0_0_8px_rgba(254,84,11,0.9)]" />
                      </motion.div>
                      <Orbit className="w-5 h-5 text-white/70 absolute" />
                    </div>
                  )}

                  {/* ANIMAÇÃO 6: REFRAÇÃO PRISMÁTICA 3D (NOVO EFEITO!) */}
                  {effect.id === "prism" && (
                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                      <motion.div
                        animate={{
                          rotate: [0, 180, 360],
                          scale: [1, 1.1, 1],
                        }}
                        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 opacity-50 bg-[conic-gradient(from_0deg,rgba(254,84,11,0.6),rgba(168,85,247,0.5),rgba(59,130,246,0.5),rgba(16,185,129,0.5),rgba(254,84,11,0.6))] blur-sm"
                      />
                      <motion.div
                        animate={{
                          rotate: [0, 4, -4, 0],
                          scale: [1, 1.06, 1],
                        }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                        className="w-16 h-16 rounded-xl border border-white/25 bg-white/10 backdrop-blur-md flex items-center justify-center z-10 shadow-[0_0_20px_rgba(255,255,255,0.25)]"
                      >
                        <Layers className="w-5 h-5 text-white" />
                      </motion.div>
                    </div>
                  )}

                  {/* TAGS DE BADGE ESTILO APPLE */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-[10px] font-bold text-zinc-300 backdrop-blur-md">
                    {effect.badge}
                  </div>

                  {/* BADGE DE ATIVO NESTE AMBIENTE */}
                  {isSelectedForThisTab && isCurrentTabActive && (
                    <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.6)]">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Ativo no {activeTab === "desktop" ? "Desktop" : "Bloqueio"}</span>
                    </div>
                  )}

                  {/* BADGE DE ATIVO NO OUTRO AMBIENTE */}
                  {isAssignedToOtherTab && !isSelectedForThisTab && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-zinc-800/90 text-zinc-300 border border-white/10 text-[10px] font-semibold flex items-center gap-1 backdrop-blur-md">
                      <span>Ativo no {activeTab === "desktop" ? "Bloqueio" : "Desktop"}</span>
                    </div>
                  )}
                </div>

                {/* INFORMAÇÕES DO EFEITO */}
                <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-white/5 text-[var(--gm-primary)]">
                        {getEffectIcon(effect.id, "w-4 h-4")}
                      </div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {effect.name}
                      </h4>
                    </div>

                    <p className="text-[11px] font-semibold text-[var(--gm-primary)] mt-1">
                      {effect.tagline}
                    </p>

                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                      {effect.description}
                    </p>
                  </div>

                  {/* NIVELADOR DE FORÇA EM CADA EFEITO (APPLE SLIDER & PRESETS) */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 p-2.5 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-2 backdrop-blur-xs select-none"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                        <Gauge className="w-3 h-3 text-[var(--gm-primary)]" />
                        <span>Nível de Força</span>
                      </div>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                          effectStrength >= 115
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/35"
                            : effectStrength >= 75
                            ? "bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] border-[var(--gm-primary)]/35"
                            : "bg-blue-500/20 text-blue-300 border-blue-500/35"
                        }`}
                      >
                        {effectStrength}% • {
                          effectStrength <= 40 ? "Sutil" :
                          effectStrength <= 75 ? "Suave" :
                          effectStrength <= 110 ? "Padrão" : "Intenso"
                        }
                      </span>
                    </div>

                    {/* SLIDER RANGE ESTILO APPLE */}
                    <div className="relative flex items-center w-full px-0.5">
                      <input
                        type="range"
                        min={20}
                        max={150}
                        step={5}
                        value={effectStrength}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          handleStrengthChange(effect.id, val);
                        }}
                        className="w-full h-1.5 bg-zinc-800/90 rounded-lg appearance-none cursor-pointer accent-[var(--gm-primary)] hover:brightness-110 transition-all focus:outline-none"
                        aria-label={`Nível de força do efeito ${effect.name}`}
                      />
                    </div>

                    {/* PRESETS RÁPIDOS DE TOQUE */}
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      {[
                        { label: "Sutil", val: 35 },
                        { label: "Suave", val: 65 },
                        { label: "Padrão", val: 100 },
                        { label: "Intenso", val: 140 },
                      ].map((preset) => {
                        const isPresetActive = Math.abs(effectStrength - preset.val) <= 5;
                        return (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => handleStrengthChange(effect.id, preset.val)}
                            className={`flex-1 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer text-center active:scale-95 ${
                              isPresetActive
                                ? "bg-[var(--gm-primary)] text-white shadow-xs"
                                : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5"
                            }`}
                            title={`Ajustar força para ${preset.val}% (${preset.label})`}
                          >
                            {preset.val}%
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* BOTÃO DE AÇÃO RÁPIDO */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between mt-2">
                    <span className="text-[10px] text-zinc-500">
                      {isSelectedForThisTab && isCurrentTabActive
                        ? "Prévia ativa em tempo real"
                        : `Clique para ver prévia no ${activeTab === "desktop" ? "Desktop" : "Bloqueio"}`}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTabEffect(activeTab, effect.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer active:scale-95 ${
                        isSelectedForThisTab && isCurrentTabActive
                          ? "bg-[var(--gm-primary)] text-white shadow-sm"
                          : "bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10"
                      }`}
                    >
                      {isSelectedForThisTab && isCurrentTabActive ? "Em Uso" : "Testar / Usar"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE TESTE DA TELA DE BLOQUEIO EM TELA CHEIA */}
      {testLockModalOpen && (
        <PinLockModal
          open={testLockModalOpen}
          mode="verify"
          isPreviewMode={true}
          title="Prévia da Tela de Bloqueio"
          description="Você está visualizando o efeito em tempo real com o teclado PIN na velocidade nativa Apple iOS."
          onSuccess={() => setTestLockModalOpen(false)}
          onCancel={() => setTestLockModalOpen(false)}
        />
      )}
    </div>
  );
}
