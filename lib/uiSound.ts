/**
 * uiSound.ts - Efeitos Sonoros de Reação e Interações do App
 *
 * Sons gerados dinamicamente via Web Audio API de alta fidelidade:
 * - 0 latência (tempo de resposta imediato < 5ms)
 * - 0 dependência de arquivos externos ou rede
 * - Funciona offline em smartphones e desktop
 * - Galeria completa com efeitos originais de iPhone (iOS Apple), Xiaomi (MIUI / HyperOS) e CardDigital GM
 */

export type UiSoundType =
  | "tap"
  | "click"
  | "pop"
  | "toggle_on"
  | "toggle_off"
  | "success"
  | "delete"
  | "tab"
  | "modal_open"
  | "modal_close"
  | "alert"
  | "hover"
  | "typing";

export type OperaGxKeyType = "key" | "space" | "enter" | "backspace";

export interface ButtonSoundPreset {
  id: string;
  name: string;
  brand: "apple" | "xiaomi" | "gm" | "minimal";
  brandLabel: string;
  description: string;
}

export interface HoverSoundPreset {
  id: string;
  name: string;
  brand: "gm" | "minimal" | "opera" | "xiaomi" | "apple" | "cyber";
  brandLabel: string;
  description: string;
}

export interface TypingSoundPreset {
  id: string;
  name: string;
  brand: "opera" | "mechanical" | "vintage" | "cyber" | "apple";
  brandLabel: string;
  description: string;
}

export const HOVER_SOUND_PRESETS: HoverSoundPreset[] = [
  {
    id: "roulette_cyber",
    name: "Roleta Tech Cyberpunk",
    brand: "gm",
    brandLabel: "Padrão GM",
    description: "Pulsos mecânicos sequenciais com microvariação simulando roleta digital de alta precisão",
  },
  {
    id: "optic_tick",
    name: "Micro-Tick Óptico",
    brand: "minimal",
    brandLabel: "Ultra-Discreto",
    description: "Pulso cirúrgico a 3200Hz, simulando micro-switch óptico instantâneo e silencioso",
  },
  {
    id: "scifi_pip",
    name: "Seletor Cibernético",
    brand: "opera",
    brandLabel: "Opera GX FX",
    description: "Pip sci-fi ressonante com filtro bandpass a 1800Hz e eco metálico cibernético",
  },
  {
    id: "xiaomi_bubble_hover",
    name: "Gota Elástica",
    brand: "xiaomi",
    brandLabel: "Xiaomi HyperOS",
    description: "Micro-bolha aveludada inspirada no feedback tátil de seleção do Xiaomi HyperOS",
  },
  {
    id: "apple_taptic_air",
    name: "Taptic Air",
    brand: "apple",
    brandLabel: "Apple iOS",
    description: "Micro-feedback de baixa frequência (340Hz) aveludado, imitando trackpad Force Touch",
  },
  {
    id: "radar_neon",
    name: "Sonar Radar Neon",
    brand: "cyber",
    brandLabel: "Synthwave HUD",
    description: "Ressonância harmônica dupla e etérea estilo HUD de ficção científica",
  },
];

export const TYPING_SOUND_PRESETS: TypingSoundPreset[] = [
  {
    id: "opera_gx",
    name: "Opera GX Classic",
    brand: "opera",
    brandLabel: "Opera GX Oficial",
    description: "O autêntico teclado gamer: chave cibernética, sub-grave no Espaço e confirmação sci-fi no Enter",
  },
  {
    id: "cherry_blue",
    name: "Cherry MX Blue",
    brand: "mechanical",
    brandLabel: "Mecânico Clicky",
    description: "Estalo nítido de clique duplo mecânico com retorno tátil metálico agudo e ressonância de placa",
  },
  {
    id: "linear_thock",
    name: "Linear Lubrificado (Thock)",
    brand: "mechanical",
    brandLabel: "Custom Keyboard",
    description: "Batida aveludada grave, macia e densa ('thock') com amortecimento acústico de teclas PBT",
  },
  {
    id: "typewriter",
    name: "Máquina de Escrever",
    brand: "vintage",
    brandLabel: "Vintage Retrô",
    description: "Impacto percussivo mecânico vintage com campainha clássica no Enter e alavanca no Backspace",
  },
  {
    id: "terminal_matrix",
    name: "Terminal Hacker Sci-Fi",
    brand: "cyber",
    brandLabel: "Cyberpunk Terminal",
    description: "Bips eletrônicos sintetizados em altíssima velocidade inspirados em consoles Matrix/Hacker",
  },
  {
    id: "apple_magic",
    name: "Apple Magic Keyboard",
    brand: "apple",
    brandLabel: "Apple macOS",
    description: "Toque de tesoura chiclet macio, amortecido, discreto e silencioso das teclas do MacBook Pro",
  },
];

export const BUTTON_SOUND_PRESETS: ButtonSoundPreset[] = [
  {
    id: "iphone_haptic",
    name: "iPhone • Haptic Tap",
    brand: "apple",
    brandLabel: "Apple iOS",
    description: "Micro-clique tátil háptico Taptic Engine suave dos botões do iPhone",
  },
  {
    id: "iphone_keyboard",
    name: "iPhone • Teclado & Bloqueio",
    brand: "apple",
    brandLabel: "Apple iOS",
    description: "Estalo acústico seco e firme característico das teclas e bloqueio Apple",
  },
  {
    id: "iphone_pop",
    name: "iPhone • Pop & Sent",
    brand: "apple",
    brandLabel: "Apple iOS",
    description: "Efeito aveludado e dinâmico de envio e confirmação do iMessage / AirDrop",
  },
  {
    id: "iphone_switch",
    name: "iPhone • Chave Háptica",
    brand: "apple",
    brandLabel: "Apple iOS",
    description: "Duplo micro-toque rápido e dinâmico de interruptores e seletores iOS",
  },
  {
    id: "xiaomi_waterdrop",
    name: "Xiaomi • Gota D'água",
    brand: "xiaomi",
    brandLabel: "Xiaomi MIUI",
    description: "O lendário som cristalino e relaxante de gota d'água da Xiaomi MIUI",
  },
  {
    id: "xiaomi_crisp",
    name: "Xiaomi • Crisp Click",
    brand: "xiaomi",
    brandLabel: "Xiaomi MIUI",
    description: "Toque nítido, seco e estalado de alta precisão dos botões Xiaomi",
  },
  {
    id: "xiaomi_bubble",
    name: "Xiaomi • Bolha & Switch",
    brand: "xiaomi",
    brandLabel: "Xiaomi HyperOS",
    description: "Efeito sonoro elástico e moderno com ressonância acústica do HyperOS",
  },
  {
    id: "xiaomi_wood",
    name: "Xiaomi • Madeira Natural",
    brand: "xiaomi",
    brandLabel: "Xiaomi Nature",
    description: "Estalo orgânico amadeirado percussivo do pacote Natureza Xiaomi",
  },
  {
    id: "carddigital_pro",
    name: "CardDigital GM Pro",
    brand: "gm",
    brandLabel: "GM Oficial",
    description: "Resposta mecânica calibrada de alta fidelidade para o sistema GM",
  },
  {
    id: "minimal_tick",
    name: "Micro-Tick Minimalista",
    brand: "minimal",
    brandLabel: "Ultra-Discreto",
    description: "Frequência rápida e cirúrgica para navegação silenciosa e ágil",
  },
];

let sharedAudioCtx: AudioContext | null = null;
let lastSoundTime = 0;
let isListenerInitialized = false;

/**
 * Obtém ou inicializa o AudioContext compartilhado de forma segura
 */
function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return null;
      sharedAudioCtx = new AudioCtxClass();
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Verifica se os sons de interface estão silenciados
 */
export function isUiSoundMuted(): boolean {
  try {
    return localStorage.getItem("gm.uiSoundsMuted") === "true";
  } catch {
    return false;
  }
}

/**
 * Ativa ou desativa os efeitos sonoros de interface
 */
export function setUiSoundMuted(muted: boolean): void {
  try {
    localStorage.setItem("gm.uiSoundsMuted", muted ? "true" : "false");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gm.uiSoundChanged", { detail: { muted } }));
    }
  } catch {}
}

/**
 * Verifica se os sons tech de hover (passar o mouse) estão silenciados
 */
export function isHoverSoundMuted(): boolean {
  try {
    return localStorage.getItem("gm.hoverSoundsMuted") === "true";
  } catch {
    return false;
  }
}

/**
 * Ativa ou desativa os sons tech de hover (passar o mouse)
 */
export function setHoverSoundMuted(muted: boolean): void {
  try {
    localStorage.setItem("gm.hoverSoundsMuted", muted ? "true" : "false");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gm.uiSoundChanged", { detail: { hoverMuted: muted } }));
    }
  } catch {}
}

/**
 * Verifica se os sons de digitação estilo Opera GX estão silenciados
 */
export function isTypingSoundMuted(): boolean {
  try {
    return localStorage.getItem("gm.typingSoundsMuted") === "true";
  } catch {
    return false;
  }
}

/**
 * Ativa ou desativa os sons de digitação estilo Opera GX
 */
export function setTypingSoundMuted(muted: boolean): void {
  try {
    localStorage.setItem("gm.typingSoundsMuted", muted ? "true" : "false");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gm.uiSoundChanged", { detail: { typingMuted: muted } }));
    }
  } catch {}
}

/**
 * Obtém o preset de som de botão ativo
 */
export function getButtonSoundPreset(): string {
  try {
    return localStorage.getItem("gm.buttonSoundPreset") || "iphone_haptic";
  } catch {
    return "iphone_haptic";
  }
}

/**
 * Define o preset de som de botão ativo
 */
export function setButtonSoundPreset(presetId: string): void {
  try {
    localStorage.setItem("gm.buttonSoundPreset", presetId);
  } catch {}
}

/**
 * Obtém o preset de som de hover ativo
 */
export function getHoverSoundPreset(): string {
  try {
    return localStorage.getItem("gm.hoverSoundPreset") || "roulette_cyber";
  } catch {
    return "roulette_cyber";
  }
}

/**
 * Define o preset de som de hover ativo
 */
export function setHoverSoundPreset(presetId: string): void {
  try {
    localStorage.setItem("gm.hoverSoundPreset", presetId);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gm.uiSoundChanged", { detail: { hoverPreset: presetId } }));
    }
  } catch {}
}

/**
 * Obtém o preset de som de digitação ativo
 */
export function getTypingSoundPreset(): string {
  try {
    return localStorage.getItem("gm.typingSoundPreset") || "opera_gx";
  } catch {
    return "opera_gx";
  }
}

/**
 * Define o preset de som de digitação ativo
 */
export function setTypingSoundPreset(presetId: string): void {
  try {
    localStorage.setItem("gm.typingSoundPreset", presetId);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gm.uiSoundChanged", { detail: { typingPreset: presetId } }));
    }
  } catch {}
}

/**
 * Obtém o volume das reações sonoras (0.1 a 1.0)
 */
export function getUiSoundVolume(): number {
  try {
    const vol = localStorage.getItem("gm.uiSoundVolume");
    if (vol !== null) {
      const parsed = parseFloat(vol);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
    }
    return 0.75;
  } catch {
    return 0.75;
  }
}

/**
 * Define o volume das reações sonoras
 */
export function setUiSoundVolume(vol: number): void {
  try {
    const clamped = Math.max(0.05, Math.min(1, vol));
    localStorage.setItem("gm.uiSoundVolume", clamped.toString());
  } catch {}
}

/**
 * Síntese acústica autêntica para cada preset de botão (iPhone, Xiaomi e GM)
 */
function synthesizePreset(ctx: AudioContext, presetId: string, masterVol: number): void {
  const t0 = ctx.currentTime;

  switch (presetId) {
    case "iphone_haptic": {
      // iPhone Taptic Engine: clique tátil sutil, aveludado e com rápida compressão
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.setValueAtTime(175, t0);
      osc.frequency.exponentialRampToValueAtTime(65, t0 + 0.022);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(420, t0);

      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.42 * masterVol, t0 + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.024);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0);
      osc.stop(t0 + 0.026);
      break;
    }

    case "iphone_keyboard": {
      // iPhone Teclado & Bloqueio: estalo mecânico seco, de plástico rígido e acústica fechada
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(1450, t0);
      osc.frequency.exponentialRampToValueAtTime(260, t0 + 0.024);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1850, t0);
      filter.Q.setValueAtTime(2.6, t0);

      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.38 * masterVol, t0 + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.028);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0);
      osc.stop(t0 + 0.03);
      break;
    }

    case "iphone_pop": {
      // iPhone Pop & Sent: bolha aveludada ascendente com decaimento harmônico
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(310, t0);
      osc.frequency.exponentialRampToValueAtTime(940, t0 + 0.034);

      sub.type = "sine";
      sub.frequency.setValueAtTime(620, t0);
      sub.frequency.exponentialRampToValueAtTime(1880, t0 + 0.034);

      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.36 * masterVol, t0 + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.052);

      osc.connect(gain);
      sub.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0);
      sub.start(t0);
      osc.stop(t0 + 0.06);
      sub.stop(t0 + 0.06);
      break;
    }

    case "iphone_switch": {
      // iPhone Chave Háptica: duplo micro-tick ultraleve em 540Hz e 880Hz
      const freqs = [540, 880];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = t0 + idx * 0.026;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.32 * masterVol, start + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.035);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.04);
      });
      break;
    }

    case "xiaomi_waterdrop": {
      // Xiaomi MIUI Gota D'água: sweep límpido ascendente 580Hz -> 1720Hz com eco de água
      const osc = ctx.createOscillator();
      const harmonic = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(580, t0);
      osc.frequency.exponentialRampToValueAtTime(1720, t0 + 0.055);

      harmonic.type = "sine";
      harmonic.frequency.setValueAtTime(1160, t0);
      harmonic.frequency.exponentialRampToValueAtTime(3440, t0 + 0.055);

      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.42 * masterVol, t0 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);

      osc.connect(gain);
      harmonic.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0);
      harmonic.start(t0);
      osc.stop(t0 + 0.15);
      harmonic.stop(t0 + 0.15);
      break;
    }

    case "xiaomi_crisp": {
      // Xiaomi MIUI Crisp Click: toque seco, nítido e estalado
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(1050, t0);
      osc.frequency.exponentialRampToValueAtTime(320, t0 + 0.019);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1500, t0);
      filter.Q.setValueAtTime(2.2, t0);

      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.38 * masterVol, t0 + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.022);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0);
      osc.stop(t0 + 0.025);
      break;
    }

    case "xiaomi_bubble": {
      // Xiaomi HyperOS Bolha: elástico, redondo e moderno
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(270, t0);
      osc.frequency.exponentialRampToValueAtTime(740, t0 + 0.038);

      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.4 * masterVol, t0 + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.065);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0);
      osc.stop(t0 + 0.07);
      break;
    }

    case "xiaomi_wood": {
      // Xiaomi Madeira Natural: estalo percussivo orgânico
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(460, t0);
      osc1.frequency.exponentialRampToValueAtTime(190, t0 + 0.028);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(690, t0);
      osc2.frequency.exponentialRampToValueAtTime(320, t0 + 0.028);

      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.45 * masterVol, t0 + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.032);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t0);
      osc2.start(t0);
      osc1.stop(t0 + 0.035);
      osc2.stop(t0 + 0.035);
      break;
    }

    case "minimal_tick": {
      // Micro-Tick Minimalista: clique cirúrgico de 12ms
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1550, t0);
      osc.frequency.exponentialRampToValueAtTime(580, t0 + 0.013);

      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.24 * masterVol, t0 + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.015);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0);
      osc.stop(t0 + 0.018);
      break;
    }

    case "carddigital_pro":
    default: {
      // CardDigital GM Pro: micro-switch mecânico encorpado
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.setValueAtTime(820, t0);
      osc.frequency.exponentialRampToValueAtTime(140, t0 + 0.024);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1200, t0);
      filter.Q.setValueAtTime(1.8, t0);

      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.35 * masterVol, t0 + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.028);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0);
      osc.stop(t0 + 0.03);
      break;
    }
  }
}

/**
 * Toca diretamente a demonstração de um preset específico de botão
 */
export function previewButtonSoundPreset(presetId: string, customVolume?: number): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const masterVol = customVolume !== undefined ? customVolume : getUiSoundVolume();
  try {
    synthesizePreset(ctx, presetId, masterVol);
  } catch {}
}

/**
 * Executa um efeito sonoro sintetizado específico de reação
 */
export function playUiSound(type: UiSoundType = "tap", customVolume?: number): void {
  if (isUiSoundMuted()) return;

  const now = performance.now();
  // Throttle para evitar sobreposição caótica em cliques múltiplos rápidos (< 35ms)
  if (now - lastSoundTime < 35 && type !== "success" && type !== "alert") {
    return;
  }
  lastSoundTime = now;

  const ctx = getAudioContext();
  if (!ctx) return;

  const masterVol = (customVolume !== undefined ? customVolume : getUiSoundVolume());
  const t0 = ctx.currentTime;

  try {
    switch (type) {
      case "tap":
      case "click": {
        // Toca o preset configurado pelo usuário (iPhone, Xiaomi ou GM)
        const activePreset = getButtonSoundPreset();
        synthesizePreset(ctx, activePreset, masterVol);
        break;
      }

      case "pop": {
        // Bolha suave e elástica (ótimo para tags, badges, chips e filtros)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(320, t0);
        osc.frequency.exponentialRampToValueAtTime(740, t0 + 0.038);

        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.38 * masterVol, t0 + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t0);
        osc.stop(t0 + 0.055);
        break;
      }

      case "toggle_on": {
        // Duplo tom ascendente alegre para ativação de chave/switch
        const freqs = [480, 880];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = t0 + idx * 0.032;

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.3 * masterVol, start + 0.004);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.045);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.05);
        });
        break;
      }

      case "toggle_off": {
        // Duplo tom descendente aveludado para desativação de chave/switch
        const freqs = [780, 420];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = t0 + idx * 0.028;

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.24 * masterVol, start + 0.004);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.045);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.05);
        });
        break;
      }

      case "success": {
        // Acorde harmônico cristalino e otimista de confirmação (Salvar, Copiar, Aprovar)
        const notes = [659.25, 987.77, 1318.51]; // E5, B5, E6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = t0 + idx * 0.045;

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.38 * masterVol, start + 0.006);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.25);
        });
        break;
      }

      case "delete": {
        // Tom grave sutil descendente para exclusões ou cancelamentos
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(260, t0);
        osc.frequency.exponentialRampToValueAtTime(75, t0 + 0.07);

        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.4 * masterVol, t0 + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t0);
        osc.stop(t0 + 0.1);
        break;
      }

      case "tab": {
        // Micro-tick de alta frequência limpo para navegação e abas
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(1400, t0);
        osc.frequency.exponentialRampToValueAtTime(600, t0 + 0.016);

        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.25 * masterVol, t0 + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t0);
        osc.stop(t0 + 0.025);
        break;
      }

      case "modal_open": {
        // Abertura com sweep aveludado ascendente
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(380, t0);
        osc.frequency.exponentialRampToValueAtTime(720, t0 + 0.06);

        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.3 * masterVol, t0 + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t0);
        osc.stop(t0 + 0.1);
        break;
      }

      case "modal_close": {
        // Fechamento discreto descendente
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(540, t0);
        osc.frequency.exponentialRampToValueAtTime(280, t0 + 0.04);

        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.26 * masterVol, t0 + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t0);
        osc.stop(t0 + 0.06);
        break;
      }

      case "alert": {
        // Alerta duplo suave de aviso
        const freqs = [840, 640];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = t0 + idx * 0.06;

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.35 * masterVol, start + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.08);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.09);
        });
        break;
      }

      case "hover": {
        playTechHoverSound(customVolume);
        break;
      }

      case "typing": {
        playOperaGxTypingSound("key", customVolume);
        break;
      }
    }
  } catch (err) {
    // Falha silenciosa para nunca interromper a UI
  }
}

// Atalhos convenientes
playUiSound.tap = () => playUiSound("tap");
playUiSound.click = () => playUiSound("click");
playUiSound.pop = () => playUiSound("pop");
playUiSound.success = () => playUiSound("success");
playUiSound.delete = () => playUiSound("delete");
playUiSound.tab = () => playUiSound("tab");
playUiSound.modalOpen = () => playUiSound("modal_open");
playUiSound.modalClose = () => playUiSound("modal_close");
playUiSound.alert = () => playUiSound("alert");
playUiSound.hover = (customVol?: number) => playTechHoverSound(customVol);
playUiSound.typing = (keyType?: OperaGxKeyType, customVol?: number) => playOperaGxTypingSound(keyType, customVol);
playUiSound.toggle = (active: boolean) => playUiSound(active ? "toggle_on" : "toggle_off");

let rouletteStep = 0;
const ROULETTE_PITCHES = [2050, 2250, 2450, 2150, 2350, 2550, 2200, 2400];

/**
 * Síntese acústica autêntica para cada preset de hover no desktop
 */
function synthesizeHoverPreset(ctx: AudioContext, presetId: string, masterVol: number): void {
  const t0 = ctx.currentTime;
  try {
    switch (presetId) {
      case "optic_tick": {
        // Micro-Tick Óptico: pulso ultra-seco e cirúrgico a 3200Hz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = "sine";
        osc.frequency.setValueAtTime(3200, t0);

        filter.type = "highpass";
        filter.frequency.setValueAtTime(2600, t0);
        filter.Q.setValueAtTime(2.2, t0);

        const vol = 0.15 * masterVol;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(vol, t0 + 0.0005);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.008);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t0);
        osc.stop(t0 + 0.01);
        break;
      }

      case "scifi_pip": {
        // Seletor Cibernético Opera GX FX: pip sci-fi com filtro bandpass a 1800Hz e leve ressonância
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(1850, t0);
        osc.frequency.exponentialRampToValueAtTime(920, t0 + 0.018);

        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1700, t0);
        filter.Q.setValueAtTime(4.2, t0);

        const vol = 0.22 * masterVol;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(vol, t0 + 0.001);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t0);
        osc.stop(t0 + 0.022);
        break;
      }

      case "xiaomi_bubble_hover": {
        // Gota Elástica Xiaomi HyperOS: micro-bolha aveludada
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(480, t0);
        osc.frequency.exponentialRampToValueAtTime(890, t0 + 0.022);

        const vol = 0.2 * masterVol;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(vol, t0 + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.024);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t0);
        osc.stop(t0 + 0.026);
        break;
      }

      case "apple_taptic_air": {
        // Taptic Air Apple iOS: micro-feedback suave de 340Hz imitando Force Touch trackpad
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = "sine";
        osc.frequency.setValueAtTime(320, t0);
        osc.frequency.exponentialRampToValueAtTime(110, t0 + 0.022);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(420, t0);

        const vol = 0.28 * masterVol;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(vol, t0 + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.024);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t0);
        osc.stop(t0 + 0.026);
        break;
      }

      case "radar_neon": {
        // Sonar Radar Neon Synthwave: tom harmônico duplo etéreo
        const notes = [1760, 2637];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();
          const start = t0 + idx * 0.008;

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, start);

          filter.type = "bandpass";
          filter.frequency.setValueAtTime(freq, start);
          filter.Q.setValueAtTime(3.5, start);

          const vol = 0.16 * masterVol;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(vol, start + 0.001);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.025);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.028);
        });
        break;
      }

      case "roulette_cyber":
      default: {
        // Roleta Tech Cyberpunk GM: pulsos mecânicos sequenciais com microvariação
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        rouletteStep = (rouletteStep + 1) % ROULETTE_PITCHES.length;
        const baseFreq = ROULETTE_PITCHES[rouletteStep] + (Math.random() * 90 - 45);

        osc.type = "triangle";
        osc.frequency.setValueAtTime(baseFreq, t0);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.42, t0 + 0.012);

        filter.type = "bandpass";
        filter.frequency.setValueAtTime(baseFreq * 0.96, t0);
        filter.Q.setValueAtTime(4.2, t0);

        const vol = 0.16 * masterVol;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(vol, t0 + 0.001);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.014);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t0);
        osc.stop(t0 + 0.016);
        break;
      }
    }
  } catch {}
}

/**
 * Toca diretamente a demonstração de um preset específico de hover
 */
export function previewHoverSoundPreset(presetId: string, customVolume?: number): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const masterVol = customVolume !== undefined ? customVolume : getUiSoundVolume();
  try {
    synthesizeHoverPreset(ctx, presetId, masterVol);
  } catch {}
}

/**
 * Toca o efeito sonoro de roleta tech / seletor moderno ao passar o mouse por componentes (Desktop)
 */
export function playTechHoverSound(customVolume?: number, presetOverride?: string): void {
  if (isUiSoundMuted() || isHoverSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const masterVol = customVolume !== undefined ? customVolume : getUiSoundVolume();
  const activePreset = presetOverride || getHoverSoundPreset();
  synthesizeHoverPreset(ctx, activePreset, masterVol);
}

/**
 * Síntese acústica autêntica para cada preset de digitação (Opera GX, Mecânico, Vintage, Cyberpunk, Apple)
 */
function synthesizeTypingPreset(
  ctx: AudioContext,
  presetId: string,
  keyType: OperaGxKeyType,
  masterVol: number
): void {
  const t0 = ctx.currentTime;
  try {
    switch (presetId) {
      case "cherry_blue": {
        // Cherry MX Blue: clique duplo estalado e mola metálica
        switch (keyType) {
          case "space": {
            const oscSub = ctx.createOscillator();
            const gainSub = ctx.createGain();
            oscSub.type = "sine";
            oscSub.frequency.setValueAtTime(180, t0);
            oscSub.frequency.exponentialRampToValueAtTime(45, t0 + 0.035);

            gainSub.gain.setValueAtTime(0, t0);
            gainSub.gain.linearRampToValueAtTime(0.42 * masterVol, t0 + 0.002);
            gainSub.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
            oscSub.connect(gainSub);
            gainSub.connect(ctx.destination);
            oscSub.start(t0);
            oscSub.stop(t0 + 0.045);

            const oscClack = ctx.createOscillator();
            const gainClack = ctx.createGain();
            oscClack.type = "triangle";
            oscClack.frequency.setValueAtTime(2600, t0);
            oscClack.frequency.exponentialRampToValueAtTime(800, t0 + 0.016);
            gainClack.gain.setValueAtTime(0, t0);
            gainClack.gain.linearRampToValueAtTime(0.38 * masterVol, t0 + 0.001);
            gainClack.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02);
            oscClack.connect(gainClack);
            gainClack.connect(ctx.destination);
            oscClack.start(t0);
            oscClack.stop(t0 + 0.022);
            break;
          }
          case "enter": {
            // Impacto sólido com ressonância de mola
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(2400, t0);
            osc.frequency.exponentialRampToValueAtTime(520, t0 + 0.025);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.4 * masterVol, t0 + 0.001);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.035);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.04);

            // Ringing metálico
            const oscRing = ctx.createOscillator();
            const gainRing = ctx.createGain();
            oscRing.type = "sine";
            oscRing.frequency.setValueAtTime(1820, t0 + 0.004);
            gainRing.gain.setValueAtTime(0, t0 + 0.004);
            gainRing.gain.linearRampToValueAtTime(0.18 * masterVol, t0 + 0.006);
            gainRing.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
            oscRing.connect(gainRing);
            gainRing.connect(ctx.destination);
            oscRing.start(t0 + 0.004);
            oscRing.stop(t0 + 0.075);
            break;
          }
          case "backspace": {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(2100, t0);
            osc.frequency.exponentialRampToValueAtTime(650, t0 + 0.018);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.34 * masterVol, t0 + 0.001);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.022);
            break;
          }
          case "key":
          default: {
            // Clique duplo característico Cherry Blue
            const pitch = 2700 + (Math.random() * 200 - 100);
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = "triangle";
            osc1.frequency.setValueAtTime(pitch, t0);
            osc1.frequency.exponentialRampToValueAtTime(1100, t0 + 0.012);
            gain1.gain.setValueAtTime(0, t0);
            gain1.gain.linearRampToValueAtTime(0.35 * masterVol, t0 + 0.001);
            gain1.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.014);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(t0);
            osc1.stop(t0 + 0.016);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(1950, t0 + 0.003);
            gain2.gain.setValueAtTime(0, t0 + 0.003);
            gain2.gain.linearRampToValueAtTime(0.24 * masterVol, t0 + 0.004);
            gain2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(t0 + 0.003);
            osc2.stop(t0 + 0.022);
            break;
          }
        }
        break;
      }

      case "linear_thock": {
        // Linear Lubrificado / Thock Profundo: grave, macio, amortecido
        switch (keyType) {
          case "space": {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            osc.type = "sine";
            osc.frequency.setValueAtTime(140, t0);
            osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.045);
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(260, t0);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.5 * masterVol, t0 + 0.002);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.048);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.05);
            break;
          }
          case "enter": {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            osc.type = "sine";
            osc.frequency.setValueAtTime(210, t0);
            osc.frequency.exponentialRampToValueAtTime(75, t0 + 0.035);
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(380, t0);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.45 * masterVol, t0 + 0.002);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.038);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.04);
            break;
          }
          case "backspace": {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            osc.type = "sine";
            osc.frequency.setValueAtTime(240, t0);
            osc.frequency.exponentialRampToValueAtTime(110, t0 + 0.02);
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(420, t0);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.38 * masterVol, t0 + 0.002);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.024);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.026);
            break;
          }
          case "key":
          default: {
            const pitch = 280 + (Math.random() * 40 - 20);
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            osc.type = "sine";
            osc.frequency.setValueAtTime(pitch, t0);
            osc.frequency.exponentialRampToValueAtTime(115, t0 + 0.024);
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(480, t0);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.4 * masterVol, t0 + 0.002);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.026);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.028);
            break;
          }
        }
        break;
      }

      case "typewriter": {
        // Máquina de Escrever Vintage: percussão mecânica com campainha no Enter
        switch (keyType) {
          case "enter": {
            // A clássica campainha de fim de linha "Ding!"
            const bell = ctx.createOscillator();
            const bellGain = ctx.createGain();
            bell.type = "sine";
            bell.frequency.setValueAtTime(2093, t0); // C7
            bellGain.gain.setValueAtTime(0, t0);
            bellGain.gain.linearRampToValueAtTime(0.45 * masterVol, t0 + 0.002);
            bellGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
            bell.connect(bellGain);
            bellGain.connect(ctx.destination);
            bell.start(t0);
            bell.stop(t0 + 0.3);

            // Clank de alavanca
            const clank = ctx.createOscillator();
            const clankGain = ctx.createGain();
            clank.type = "triangle";
            clank.frequency.setValueAtTime(320, t0);
            clank.frequency.exponentialRampToValueAtTime(90, t0 + 0.035);
            clankGain.gain.setValueAtTime(0, t0);
            clankGain.gain.linearRampToValueAtTime(0.3 * masterVol, t0 + 0.002);
            clankGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
            clank.connect(clankGain);
            clankGain.connect(ctx.destination);
            clank.start(t0);
            clank.stop(t0 + 0.045);
            break;
          }
          case "space": {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(290, t0);
            osc.frequency.exponentialRampToValueAtTime(80, t0 + 0.03);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.38 * masterVol, t0 + 0.002);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.035);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.04);
            break;
          }
          case "backspace": {
            // Catraca mecânica de retorno
            const freqs = [1450, 1220];
            freqs.forEach((f, i) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              const start = t0 + i * 0.015;
              osc.type = "triangle";
              osc.frequency.setValueAtTime(f, start);
              osc.frequency.exponentialRampToValueAtTime(400, start + 0.01);
              gain.gain.setValueAtTime(0, start);
              gain.gain.linearRampToValueAtTime(0.3 * masterVol, start + 0.001);
              gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.012);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(start);
              osc.stop(start + 0.015);
            });
            break;
          }
          case "key":
          default: {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            const pitch = 1150 + (Math.random() * 120 - 60);
            osc.type = "triangle";
            osc.frequency.setValueAtTime(pitch, t0);
            osc.frequency.exponentialRampToValueAtTime(320, t0 + 0.024);
            filter.type = "bandpass";
            filter.frequency.setValueAtTime(850, t0);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.36 * masterVol, t0 + 0.001);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.026);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.028);
            break;
          }
        }
        break;
      }

      case "terminal_matrix": {
        // Terminal Hacker Sci-Fi: bips cibernéticos sintéticos
        switch (keyType) {
          case "enter": {
            // Arpeggio de comando executado
            const notes = [987, 1318, 1975];
            notes.forEach((freq, idx) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              const start = t0 + idx * 0.022;
              osc.type = "sine";
              osc.frequency.setValueAtTime(freq, start);
              gain.gain.setValueAtTime(0, start);
              gain.gain.linearRampToValueAtTime(0.32 * masterVol, start + 0.001);
              gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.035);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(start);
              osc.stop(start + 0.04);
            });
            break;
          }
          case "space": {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "square";
            osc.frequency.setValueAtTime(110, t0);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.35 * masterVol, t0 + 0.002);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.035);
            break;
          }
          case "backspace": {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "square";
            osc.frequency.setValueAtTime(620, t0);
            osc.frequency.exponentialRampToValueAtTime(260, t0 + 0.022);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.3 * masterVol, t0 + 0.001);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.025);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.028);
            break;
          }
          case "key":
          default: {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            const pitch = 1350 + (Math.random() * 400 - 200);
            osc.type = "square";
            osc.frequency.setValueAtTime(pitch, t0);
            filter.type = "bandpass";
            filter.frequency.setValueAtTime(pitch, t0);
            filter.Q.setValueAtTime(3.8, t0);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.28 * masterVol, t0 + 0.001);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.015);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.017);
            break;
          }
        }
        break;
      }

      case "apple_magic": {
        // Apple Magic Keyboard: chiclet sutil, silencioso e amortecido
        switch (keyType) {
          case "enter": {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(640, t0);
            osc.frequency.exponentialRampToValueAtTime(260, t0 + 0.016);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.3 * masterVol, t0 + 0.001);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.018);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.02);
            break;
          }
          case "space": {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(260, t0);
            osc.frequency.exponentialRampToValueAtTime(110, t0 + 0.022);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.32 * masterVol, t0 + 0.001);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.024);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.026);
            break;
          }
          case "backspace": {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(560, t0);
            osc.frequency.exponentialRampToValueAtTime(240, t0 + 0.015);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.26 * masterVol, t0 + 0.001);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.016);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.018);
            break;
          }
          case "key":
          default: {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const pitch = 780 + (Math.random() * 60 - 30);
            osc.type = "sine";
            osc.frequency.setValueAtTime(pitch, t0);
            osc.frequency.exponentialRampToValueAtTime(320, t0 + 0.014);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.28 * masterVol, t0 + 0.001);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.015);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.017);
            break;
          }
        }
        break;
      }

      case "opera_gx":
      default: {
        // Opera GX Teclado Gamer Oficial
        switch (keyType) {
          case "space": {
            const oscSub = ctx.createOscillator();
            const gainSub = ctx.createGain();
            oscSub.type = "sine";
            oscSub.frequency.setValueAtTime(220, t0);
            oscSub.frequency.exponentialRampToValueAtTime(55, t0 + 0.038);
            gainSub.gain.setValueAtTime(0, t0);
            gainSub.gain.linearRampToValueAtTime(0.42 * masterVol, t0 + 0.002);
            gainSub.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
            oscSub.connect(gainSub);
            gainSub.connect(ctx.destination);
            oscSub.start(t0);
            oscSub.stop(t0 + 0.05);

            const oscClack = ctx.createOscillator();
            const gainClack = ctx.createGain();
            const filterClack = ctx.createBiquadFilter();
            oscClack.type = "triangle";
            oscClack.frequency.setValueAtTime(1350, t0);
            oscClack.frequency.exponentialRampToValueAtTime(380, t0 + 0.018);
            filterClack.type = "bandpass";
            filterClack.frequency.setValueAtTime(1450, t0);
            filterClack.Q.setValueAtTime(3.2, t0);
            gainClack.gain.setValueAtTime(0, t0);
            gainClack.gain.linearRampToValueAtTime(0.3 * masterVol, t0 + 0.001);
            gainClack.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.022);
            oscClack.connect(filterClack);
            filterClack.connect(gainClack);
            gainClack.connect(ctx.destination);
            oscClack.start(t0);
            oscClack.stop(t0 + 0.025);
            break;
          }
          case "enter": {
            const notes = [784, 1174.66];
            notes.forEach((freq, idx) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              const filter = ctx.createBiquadFilter();
              const start = t0 + idx * 0.024;
              osc.type = "triangle";
              osc.frequency.setValueAtTime(freq, start);
              filter.type = "bandpass";
              filter.frequency.setValueAtTime(freq * 1.08, start);
              filter.Q.setValueAtTime(3.4, start);
              gain.gain.setValueAtTime(0, start);
              gain.gain.linearRampToValueAtTime(0.35 * masterVol, start + 0.002);
              gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.04);
              osc.connect(filter);
              filter.connect(gain);
              gain.connect(ctx.destination);
              osc.start(start);
              osc.stop(start + 0.045);
            });
            break;
          }
          case "backspace": {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(1650, t0);
            osc.frequency.exponentialRampToValueAtTime(460, t0 + 0.02);
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(1400, t0);
            filter.Q.setValueAtTime(2.2, t0);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.32 * masterVol, t0 + 0.001);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.022);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.025);
            break;
          }
          case "key":
          default: {
            const pitchRatio = Math.pow(2, (Math.random() * 5 - 2.5) / 12);
            const baseFreq = 1680 * pitchRatio;
            const oscHigh = ctx.createOscillator();
            const gainHigh = ctx.createGain();
            const filterHigh = ctx.createBiquadFilter();
            oscHigh.type = "triangle";
            oscHigh.frequency.setValueAtTime(baseFreq, t0);
            oscHigh.frequency.exponentialRampToValueAtTime(baseFreq * 0.35, t0 + 0.016);
            filterHigh.type = "bandpass";
            filterHigh.frequency.setValueAtTime(baseFreq * 1.05, t0);
            filterHigh.Q.setValueAtTime(3.8, t0);
            gainHigh.gain.setValueAtTime(0, t0);
            gainHigh.gain.linearRampToValueAtTime(0.33 * masterVol, t0 + 0.001);
            gainHigh.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.018);
            oscHigh.connect(filterHigh);
            filterHigh.connect(gainHigh);
            gainHigh.connect(ctx.destination);
            oscHigh.start(t0);
            oscHigh.stop(t0 + 0.02);

            const oscBody = ctx.createOscillator();
            const gainBody = ctx.createGain();
            const bodyFreq = 490 * pitchRatio;
            oscBody.type = "sine";
            oscBody.frequency.setValueAtTime(bodyFreq, t0);
            oscBody.frequency.exponentialRampToValueAtTime(bodyFreq * 0.5, t0 + 0.024);
            gainBody.gain.setValueAtTime(0, t0);
            gainBody.gain.linearRampToValueAtTime(0.25 * masterVol, t0 + 0.002);
            gainBody.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.028);
            oscBody.connect(gainBody);
            gainBody.connect(ctx.destination);
            oscBody.start(t0);
            oscBody.stop(t0 + 0.03);
            break;
          }
        }
        break;
      }
    }
  } catch {}
}

/**
 * Toca diretamente a demonstração de um preset específico de digitação
 */
export function previewTypingSoundPreset(
  presetId: string,
  keyType: OperaGxKeyType = "key",
  customVolume?: number
): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const masterVol = customVolume !== undefined ? customVolume : getUiSoundVolume();
  try {
    synthesizeTypingPreset(ctx, presetId, keyType, masterVol);
  } catch {}
}

/**
 * Síntese acústica de digitação mecânica tech futurista inspirada no Opera GX
 */
export function playOperaGxTypingSound(
  keyType: OperaGxKeyType = "key",
  customVolume?: number,
  presetOverride?: string
): void {
  if (isUiSoundMuted() || isTypingSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const masterVol = customVolume !== undefined ? customVolume : getUiSoundVolume();
  const activePreset = presetOverride || getTypingSoundPreset();
  synthesizeTypingPreset(ctx, activePreset, keyType, masterVol);
}

/**
 * Inicializa o interceptador global de reações sonoras para botões, controles,
 * hover tech no desktop e digitação futurista Opera GX em todo o app.
 */
export function initGlobalUiSoundListener(): () => void {
  if (typeof window === "undefined" || isListenerInitialized) {
    return () => {};
  }
  isListenerInitialized = true;

  let lastHoverTime = 0;
  let lastHoveredEl: HTMLElement | null = null;
  let lastKeyTime = 0;

  // Interceptador de cliques em botões e controles
  const handlePointerDown = (e: MouseEvent | TouchEvent) => {
    try {
      const target = (e.target as HTMLElement | null);
      if (!target) return;

      // Desbloqueia o AudioContext no primeiro gesto do usuário
      if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
        sharedAudioCtx.resume().catch(() => {});
      }

      // Procura o elemento interativo mais próximo
      const interactiveEl = target.closest<HTMLElement>(
        'button, [role="button"], [role="tab"], [role="switch"], a[href], summary, input[type="checkbox"], input[type="radio"], [data-sound]'
      );

      if (!interactiveEl) return;

      // Ignora se o elemento for desabilitado
      if (
        interactiveEl.hasAttribute("disabled") ||
        interactiveEl.getAttribute("aria-disabled") === "true" ||
        interactiveEl.classList.contains("pointer-events-none") ||
        interactiveEl.classList.contains("opacity-50")
      ) {
        return;
      }

      // Ignora se explicitamente marcado para silêncio
      const soundAttr = interactiveEl.getAttribute("data-sound");
      if (soundAttr === "none" || soundAttr === "false" || soundAttr === "mute") {
        return;
      }

      // Som específico via atributo data-sound
      if (soundAttr && soundAttr in { tap: 1, click: 1, pop: 1, toggle_on: 1, toggle_off: 1, success: 1, delete: 1, tab: 1, modal_open: 1, modal_close: 1, alert: 1 }) {
        playUiSound(soundAttr as UiSoundType);
        return;
      }

      // Chave ou switch
      if (interactiveEl instanceof HTMLInputElement && interactiveEl.type === "checkbox") {
        // Será alternado: se está checked antes do clique, vai virar false
        playUiSound(!interactiveEl.checked ? "toggle_on" : "toggle_off");
        return;
      }
      if (interactiveEl.getAttribute("role") === "switch") {
        const isChecked = interactiveEl.getAttribute("aria-checked") === "true";
        playUiSound(!isChecked ? "toggle_on" : "toggle_off");
        return;
      }

      // Abas e itens de navegação
      if (
        interactiveEl.getAttribute("role") === "tab" ||
        interactiveEl.classList.contains("tab-btn") ||
        interactiveEl.closest("nav") !== null ||
        interactiveEl.closest(".bottom-nav") !== null
      ) {
        playUiSound("tab");
        return;
      }

      // Botões de fechar modal / janelas
      const label = (
        interactiveEl.getAttribute("aria-label") ||
        interactiveEl.getAttribute("title") ||
        interactiveEl.textContent ||
        ""
      ).toLowerCase();

      if (
        label.includes("fechar") ||
        label.includes("close") ||
        interactiveEl.classList.contains("toast-close")
      ) {
        playUiSound("modal_close");
        return;
      }

      // Botões de exclusão, lixeira ou perigo
      if (
        label.includes("excluir") ||
        label.includes("remover") ||
        label.includes("apagar") ||
        label.includes("deletar") ||
        interactiveEl.classList.contains("text-red-500") ||
        interactiveEl.classList.contains("bg-red-500")
      ) {
        playUiSound("delete");
        return;
      }

      // Botões de confirmação / salvar / copiar
      if (
        label.includes("salvar") ||
        label.includes("concluir") ||
        label.includes("aprovar") ||
        label.includes("copiar")
      ) {
        playUiSound("success");
        return;
      }

      // Botão ou controle padrão -> Toque / clique tátil configurado
      playUiSound("tap");
    } catch {
      // Falha silenciosa
    }
  };

  // Interceptador de hover tech (roleta / seletor moderno no Desktop)
  const handleMouseOver = (e: MouseEvent) => {
    try {
      if (isUiSoundMuted() || isHoverSoundMuted()) return;

      // Verifica se é ambiente desktop com cursor fino (mouse)
      const isFinePointer =
        typeof window !== "undefined" && window.matchMedia
          ? window.matchMedia("(hover: hover) and (pointer: fine)").matches
          : typeof window !== "undefined" && window.innerWidth >= 1024;

      if (!isFinePointer) return;

      const now = performance.now();
      if (now - lastHoverTime < 28) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactiveEl = target.closest<HTMLElement>(
        'button, [role="button"], [role="tab"], [role="switch"], a[href], summary, select, input[type="checkbox"], input[type="radio"], [data-sound], [data-hover], .cursor-pointer, .tab-btn, .gm-btn, .gm-btn-soft'
      );

      if (!interactiveEl || interactiveEl === lastHoveredEl) return;
      lastHoveredEl = interactiveEl;
      lastHoverTime = now;

      if (
        interactiveEl.hasAttribute("disabled") ||
        interactiveEl.getAttribute("aria-disabled") === "true" ||
        interactiveEl.classList.contains("pointer-events-none") ||
        interactiveEl.classList.contains("opacity-50") ||
        interactiveEl.getAttribute("data-sound") === "none" ||
        interactiveEl.getAttribute("data-hover") === "none"
      ) {
        return;
      }

      playTechHoverSound();
    } catch {}
  };

  // Interceptador de digitação tech futurista estilo Opera GX
  const handleKeyDown = (e: KeyboardEvent) => {
    try {
      if (isUiSoundMuted() || isTypingSoundMuted()) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isTypingField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable ||
        Boolean(
          target.closest(
            'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="range"]), textarea, [contenteditable="true"]'
          )
        );

      if (!isTypingField) return;

      // Ignora teclas modificadoras sozinhas
      if (
        [
          "Shift",
          "Control",
          "Alt",
          "Meta",
          "CapsLock",
          "NumLock",
          "ScrollLock",
          "Escape",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(e.key)
      ) {
        return;
      }

      const now = performance.now();
      if (e.repeat && now - lastKeyTime < 45) {
        return;
      }
      lastKeyTime = now;

      if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
        sharedAudioCtx.resume().catch(() => {});
      }

      if (e.key === "Enter") {
        playOperaGxTypingSound("enter");
      } else if (e.key === " " || e.key === "Spacebar") {
        playOperaGxTypingSound("space");
      } else if (e.key === "Backspace" || e.key === "Delete") {
        playOperaGxTypingSound("backspace");
      } else {
        playOperaGxTypingSound("key");
      }
    } catch {}
  };

  window.addEventListener("click", handlePointerDown, { passive: true, capture: true });
  window.addEventListener("mouseover", handleMouseOver, { passive: true, capture: true });
  window.addEventListener("keydown", handleKeyDown, { passive: true, capture: true });

  return () => {
    window.removeEventListener("click", handlePointerDown, { capture: true });
    window.removeEventListener("mouseover", handleMouseOver, { capture: true });
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
    isListenerInitialized = false;
  };
}
