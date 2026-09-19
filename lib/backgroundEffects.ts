/**
 * lib/backgroundEffects.ts
 * Gerenciador de Efeitos Dinâmicos do Plano de Fundo
 * Suporta configuração e ativação INDEPENDENTE para Área de Trabalho e Tela de Bloqueio.
 * Performance e física otimizadas para velocidade nativa Apple iOS (60fps / 120fps).
 */

export type BgEffectType = "mouse" | "pulse" | "drift" | "aurora" | "orbit" | "prism";
export type BgTargetScope = "desktop" | "lockscreen";

export interface BgEffectItem {
  id: BgEffectType;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  iconName: string;
}

export interface BgEffectConfig {
  // Configurações independentes para Área de Trabalho
  desktopEnabled: boolean;
  desktopEffect: BgEffectType;
  desktopStrengths?: Partial<Record<BgEffectType, number>>; // Força de 20% a 150% (padrão 100%)

  // Configurações independentes para Tela de Bloqueio
  lockscreenEnabled: boolean;
  lockscreenEffect: BgEffectType;
  lockscreenStrengths?: Partial<Record<BgEffectType, number>>; // Força de 20% a 150% (padrão 100%)

  // Campos de compatibilidade
  enabled?: boolean;
  type?: BgEffectType;
  scope?: "both" | "lockscreen" | "desktop";
}

export const BG_EFFECT_ITEMS: BgEffectItem[] = [
  {
    id: "mouse",
    name: "Parallax do Mouse",
    badge: "Interativo",
    tagline: "Acompanha a posição do cursor",
    description: "Deslocamento orgânico e suave do fundo guiado pelo movimento do mouse em tempo real.",
    iconName: "MousePointer2",
  },
  {
    id: "pulse",
    name: "Respiração Cósmica",
    badge: "Orgânico",
    tagline: "Pulso rítmico e expansão contínua",
    description: "Micro-respiração fluida com oscilação sutil de escala e profundidade a cada ciclo.",
    iconName: "Activity",
  },
  {
    id: "drift",
    name: "Deriva Cinemática",
    badge: "Cinemático",
    tagline: "Estilo Ken Burns em movimento contínuo",
    description: "Varredura panorâmica contínua e suave, revelando nuances da imagem com elegância de cinema.",
    iconName: "Compass",
  },
  {
    id: "aurora",
    name: "Feixe Aurora Luminescente",
    badge: "Luminoso",
    tagline: "Rastro de feixe de luz e glow dinâmico",
    description: "Ondas luminescentes sutis e rastros de luz no tom predefinido do app deslizando pelo plano de fundo.",
    iconName: "Rainbow",
  },
  {
    id: "orbit",
    name: "Pêndulo Orbital",
    badge: "Flutuante",
    tagline: "Órbita tridimensional e rotação suave",
    description: "Trajetória elíptica com micro-inclinação angular que confere profundidade tridimensional.",
    iconName: "Orbit",
  },
  {
    id: "prism",
    name: "Refração Prismática 3D",
    badge: "Espectral",
    tagline: "Dispersão de luz e micro-inclinação 3D",
    description: "Transição de luz prismática, micro-inclinação tridimensional e dispersão cromática suave inspirada no Apple Glass.",
    iconName: "Layers",
  },
];

const STORAGE_KEY = "gm.bg_effect.config.v2";
const LEGACY_STORAGE_KEY = "gm.bg_effect.config.v1";

export function readBgEffectConfig(): BgEffectConfig {
  const defaultConfig: BgEffectConfig = {
    desktopEnabled: true,
    desktopEffect: "mouse",
    desktopStrengths: {
      mouse: 100,
      pulse: 100,
      drift: 100,
      aurora: 100,
      orbit: 100,
      prism: 100,
    },
    lockscreenEnabled: true,
    lockscreenEffect: "drift",
    lockscreenStrengths: {
      mouse: 100,
      pulse: 100,
      drift: 100,
      aurora: 100,
      orbit: 100,
      prism: 100,
    },
    enabled: true,
    type: "mouse",
    scope: "both",
  };

  if (typeof window === "undefined") {
    return defaultConfig;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        desktopEnabled: typeof parsed.desktopEnabled === "boolean" ? parsed.desktopEnabled : true,
        desktopEffect: (["mouse", "pulse", "drift", "aurora", "orbit", "prism"].includes(parsed.desktopEffect)
          ? parsed.desktopEffect
          : "mouse") as BgEffectType,
        desktopStrengths: parsed.desktopStrengths && typeof parsed.desktopStrengths === "object"
          ? parsed.desktopStrengths
          : defaultConfig.desktopStrengths,
        lockscreenEnabled: typeof parsed.lockscreenEnabled === "boolean" ? parsed.lockscreenEnabled : true,
        lockscreenEffect: (["mouse", "pulse", "drift", "aurora", "orbit", "prism"].includes(parsed.lockscreenEffect)
          ? parsed.lockscreenEffect
          : "drift") as BgEffectType,
        lockscreenStrengths: parsed.lockscreenStrengths && typeof parsed.lockscreenStrengths === "object"
          ? parsed.lockscreenStrengths
          : defaultConfig.lockscreenStrengths,
        enabled: parsed.desktopEnabled || parsed.lockscreenEnabled,
        type: parsed.desktopEffect || "mouse",
        scope: "both",
      };
    }

    // Migração de v1 para v2
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      const legacyType: BgEffectType = (["mouse", "pulse", "drift", "aurora", "orbit"].includes(legacy.type)
        ? legacy.type
        : "mouse") as BgEffectType;
      const legacyEnabled = legacy.enabled !== false;
      const legacyScope = legacy.scope || "both";

      const migrated: BgEffectConfig = {
        desktopEnabled: legacyEnabled && (legacyScope === "both" || legacyScope === "desktop"),
        desktopEffect: legacyType,
        lockscreenEnabled: legacyEnabled && (legacyScope === "both" || legacyScope === "lockscreen"),
        lockscreenEffect: legacyType === "mouse" ? "drift" : legacyType,
        enabled: legacyEnabled,
        type: legacyType,
        scope: legacyScope,
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      } catch {}

      return migrated;
    }
  } catch {}

  return defaultConfig;
}

export function saveBgEffectConfig(config: Partial<BgEffectConfig>): BgEffectConfig {
  const current = readBgEffectConfig();
  const next: BgEffectConfig = {
    desktopEnabled:
      typeof config.desktopEnabled === "boolean" ? config.desktopEnabled : current.desktopEnabled,
    desktopEffect: config.desktopEffect || current.desktopEffect,
    desktopStrengths: config.desktopStrengths
      ? { ...(current.desktopStrengths || {}), ...config.desktopStrengths }
      : current.desktopStrengths,
    lockscreenEnabled:
      typeof config.lockscreenEnabled === "boolean" ? config.lockscreenEnabled : current.lockscreenEnabled,
    lockscreenEffect: config.lockscreenEffect || current.lockscreenEffect,
    lockscreenStrengths: config.lockscreenStrengths
      ? { ...(current.lockscreenStrengths || {}), ...config.lockscreenStrengths }
      : current.lockscreenStrengths,
    // Sincroniza campos de compatibilidade
    enabled:
      typeof config.desktopEnabled === "boolean" || typeof config.lockscreenEnabled === "boolean"
        ? Boolean((config.desktopEnabled ?? current.desktopEnabled) || (config.lockscreenEnabled ?? current.lockscreenEnabled))
        : current.enabled,
    type: config.desktopEffect || current.desktopEffect,
    scope: "both",
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // Salva também na chave legada para retrocompatibilidade
      localStorage.setItem(
        LEGACY_STORAGE_KEY,
        JSON.stringify({
          enabled: next.desktopEnabled || next.lockscreenEnabled,
          type: next.desktopEffect,
          scope: next.desktopEnabled && next.lockscreenEnabled ? "both" : next.desktopEnabled ? "desktop" : "lockscreen",
        })
      );

      // Aplica atributos globais no DOM
      applyBgEffectToRoot(next);

      // Dispara evento instantâneo com física de resposta imediata
      window.dispatchEvent(
        new CustomEvent("gm-bg-effect-changed", { detail: next })
      );
    } catch {}
  }

  return next;
}

/**
 * Retorna a força configurada (em %, de 20 a 150) para um efeito específico em um determinado escopo
 */
export function getEffectStrength(
  target: BgTargetScope,
  effectId: BgEffectType,
  config?: BgEffectConfig
): number {
  const c = config || readBgEffectConfig();
  const map = target === "desktop" ? c.desktopStrengths : c.lockscreenStrengths;
  if (map && typeof map[effectId] === "number" && !isNaN(map[effectId]!)) {
    return Math.min(Math.max(map[effectId]!, 20), 150);
  }
  return 100;
}

/**
 * Atualiza e salva a força de um determinado efeito
 */
export function saveEffectStrength(
  target: BgTargetScope,
  effectId: BgEffectType,
  strength: number
): BgEffectConfig {
  const current = readBgEffectConfig();
  const clamped = Math.min(Math.max(Math.round(strength), 20), 150);
  if (target === "desktop") {
    const updated = { ...(current.desktopStrengths || {}), [effectId]: clamped };
    return saveBgEffectConfig({ desktopStrengths: updated });
  } else {
    const updated = { ...(current.lockscreenStrengths || {}), [effectId]: clamped };
    return saveBgEffectConfig({ lockscreenStrengths: updated });
  }
}

/**
 * Retorna se o efeito está ativo para um determinado destino (desktop ou lockscreen)
 */
export function isEffectActiveFor(
  target: BgTargetScope,
  config?: BgEffectConfig
): boolean {
  const c = config || readBgEffectConfig();
  if (target === "desktop") {
    return Boolean(c.desktopEnabled);
  }
  return Boolean(c.lockscreenEnabled);
}

/**
 * Retorna qual o efeito configurado para um determinado destino (desktop ou lockscreen)
 */
export function getEffectFor(
  target: BgTargetScope,
  config?: BgEffectConfig
): BgEffectType {
  const c = config || readBgEffectConfig();
  return target === "desktop" ? c.desktopEffect : c.lockscreenEffect;
}

/**
 * Aplica os atributos de estado, efeito e nível de força na tag html para consumo de CSS acelerado por GPU
 */
export function applyBgEffectToRoot(config?: BgEffectConfig) {
  if (typeof document === "undefined") return;
  const c = config || readBgEffectConfig();
  const root = document.documentElement;

  const desktopActive = isEffectActiveFor("desktop", c);
  const desktopEffect = getEffectFor("desktop", c);
  const desktopStrength = getEffectStrength("desktop", desktopEffect, c);

  root.setAttribute("data-bg-effect-desktop", desktopActive ? desktopEffect : "none");
  root.setAttribute("data-bg-effect-active", desktopActive ? "true" : "false");
  root.style.setProperty("--gm-bg-effect-strength", String(desktopStrength / 100));
  root.style.setProperty("--gm-bg-effect-strength-pct", `${desktopStrength}%`);

  const lockscreenActive = isEffectActiveFor("lockscreen", c);
  const lockscreenEffect = getEffectFor("lockscreen", c);
  const lockStrength = getEffectStrength("lockscreen", lockscreenEffect, c);
  root.setAttribute("data-bg-effect-lockscreen", lockscreenActive ? lockscreenEffect : "none");
  root.style.setProperty("--gm-bg-effect-lock-strength", String(lockStrength / 100));
}
