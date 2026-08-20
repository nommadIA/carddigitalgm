import React, { useState, useEffect } from "react";
import { 
  Palette, 
  X, 
  Check, 
  RotateCcw, 
  Copy, 
  Sparkles,
  Sliders,
  CheckCircle2,
  Hash
} from "lucide-react";

interface ColorSpectrumModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialColor: string;
  title?: string;
  subtitle?: string;
  onApply: (colorHex: string) => void;
}

// Utility: Hex to RGB
function hexToRgb(hex: string) {
  let c = hex.replace("#", "").trim();
  if (c.length === 3) {
    c = c.split("").map((x) => x + x).join("");
  }
  if (c.length !== 6) return { r: 254, g: 84, b: 11 };
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Utility: RGB to HSL
function rgbToHsl(r: number, g: number, b: number) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Utility: HSL to HEX
function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h <= 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const val = Math.round((n + m) * 255);
    const hex = Math.max(0, Math.min(255, val)).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// Utility: RGB to CMYK
function rgbToCmyk(r: number, g: number, b: number) {
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
}

const QUICK_SWATCHES = [
  { name: "Laranja", hex: "#FE540B" },
  { name: "Verde Lima", hex: "#84CC16" },
  { name: "Esmeralda", hex: "#10B981" },
  { name: "Ciano", hex: "#06B6D4" },
  { name: "Azul Real", hex: "#2563EB" },
  { name: "Roxo", hex: "#8B5CF6" },
  { name: "Magenta", hex: "#D946EF" },
  { name: "Carmim", hex: "#E11D48" },
  { name: "Dourado", hex: "#F59E0B" },
  { name: "Titânio", hex: "#94A3B8" },
  { name: "Branco", hex: "#FFFFFF" },
  { name: "Preto", hex: "#0B0B0C" },
];

export const ColorSpectrumModal: React.FC<ColorSpectrumModalProps> = ({
  isOpen,
  onClose,
  initialColor,
  title = "Ajustar Matiz & Cores",
  subtitle = "Arraste a barra de espectro para mudar o tom da cor e refine a saturação ou luminosidade.",
  onApply,
}) => {
  // Normalize color to Hex
  const getCleanHex = (c: string) => {
    if (!c || c === "transparent" || c === "TRANSPARENT") return "#FE540B";
    if (c.startsWith("#")) return c.toUpperCase();
    if (c.startsWith("rgb")) {
      const parts = c.match(/\d+/g);
      if (parts && parts.length >= 3) {
        const r = parseInt(parts[0], 10);
        const g = parseInt(parts[1], 10);
        const b = parseInt(parts[2], 10);
        const toHex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      }
    }
    return "#FE540B";
  };

  const startingHex = getCleanHex(initialColor);
  const startingRgb = hexToRgb(startingHex);
  const startingHsl = rgbToHsl(startingRgb.r, startingRgb.g, startingRgb.b);

  const [hue, setHue] = useState<number>(startingHsl.h);
  const [saturation, setSaturation] = useState<number>(startingHsl.s);
  const [lightness, setLightness] = useState<number>(startingHsl.l);
  const [customHexInput, setCustomHexInput] = useState<string>(startingHex);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Sync state when initialColor changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const clean = getCleanHex(initialColor);
      const rgb = hexToRgb(clean);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      setHue(hsl.h);
      setSaturation(hsl.s);
      setLightness(hsl.l);
      setCustomHexInput(clean);
    }
  }, [isOpen, initialColor]);

  // Derived current Color
  const currentColorHex = hslToHex(hue, saturation, lightness);
  const currentRgb = hexToRgb(currentColorHex);
  const currentCmyk = rgbToCmyk(currentRgb.r, currentRgb.g, currentRgb.b);

  const handleHueChange = (newHue: number) => {
    setHue(newHue);
    const newHex = hslToHex(newHue, saturation, lightness);
    setCustomHexInput(newHex);
  };

  const handleSaturationChange = (newSat: number) => {
    setSaturation(newSat);
    const newHex = hslToHex(hue, newSat, lightness);
    setCustomHexInput(newHex);
  };

  const handleLightnessChange = (newLight: number) => {
    setLightness(newLight);
    const newHex = hslToHex(hue, saturation, newLight);
    setCustomHexInput(newHex);
  };

  const handleDirectHexChange = (inputVal: string) => {
    setCustomHexInput(inputVal);
    let clean = inputVal.trim();
    if (!clean.startsWith("#")) clean = "#" + clean;
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
      const rgb = hexToRgb(clean);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      setHue(hsl.h);
      setSaturation(hsl.s);
      setLightness(hsl.l);
    }
  };

  const handleApplyQuickSwatch = (hex: string) => {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    setHue(hsl.h);
    setSaturation(hsl.s);
    setLightness(hsl.l);
    setCustomHexInput(hex);
  };

  const handleReset = () => {
    setHue(startingHsl.h);
    setSaturation(startingHsl.s);
    setLightness(startingHsl.l);
    setCustomHexInput(startingHex);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(label);
    setTimeout(() => setCopiedFormat(null), 1800);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 lg:p-10 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* CONTAINER PRINCIPAL EXPANDIDO NO DESKTOP (MAX-W-5XL / 6XL) E OTIMIZADO PARA SMARTPHONE */}
      <div
        className="w-full max-w-5xl xl:max-w-6xl max-h-[92vh] flex flex-col rounded-3xl border border-white/20 shadow-2xl relative my-auto animate-in zoom-in-95 duration-200 overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(24, 24, 28, 0.98) 0%, rgba(12, 12, 14, 0.99) 100%)",
          boxShadow: `0 28px 70px -15px ${currentColorHex}45, 0 0 0 1px rgba(255, 255, 255, 0.12)`,
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        {/* HEADER DO MODAL (ESTRUTURA AMPLA, ELEGANTE E RESPONSIVA) */}
        <div className="flex items-center justify-between gap-4 p-5 sm:p-7 border-b border-white/10 shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3.5 sm:gap-4.5 min-w-0">
            <div 
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-xl border border-white/25 transition-all duration-200"
              style={{
                backgroundColor: currentColorHex,
                boxShadow: `0 8px 26px -4px ${currentColorHex}80`
              }}
            >
              <Palette className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-md" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight truncate sm:whitespace-normal">
                {title}
              </h2>
              <p className="text-xs sm:text-sm lg:text-base text-slate-300 font-medium mt-0.5 sm:mt-1 leading-snug line-clamp-2 sm:line-clamp-none">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2.5 sm:p-3 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 transition-colors shrink-0 cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* CORPO DO MODAL: 2 COLUNAS NO DESKTOP, COLUNA ÚNICA FLUÍDA NO SMARTPHONE */}
        <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto flex-1 space-y-6 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8 items-start">
          
          {/* ========================================================
              COLUNA ESQUERDA (DESKTOP lg:col-span-5): PRÉVIAS & CÓDIGOS
          ======================================================== */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* PRÉVIA VISUAL DE COMPARAÇÃO (NOVA COR VS ORIGINAL) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                <span>Comparativo de Cor</span>
                <span className="text-emerald-400 flex items-center gap-1 font-extrabold text-[11px]">
                  <Sparkles size={12} /> Em Tempo Real
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Nova Cor */}
                <div className="rounded-2xl border border-white/20 overflow-hidden shadow-lg flex flex-col">
                  <div
                    className="h-28 sm:h-32 lg:h-36 w-full transition-colors duration-150 flex items-center justify-center relative group"
                    style={{ backgroundColor: currentColorHex }}
                  >
                    <span 
                      className="text-xs sm:text-sm font-mono font-black uppercase px-3 py-1.5 rounded-xl bg-black/70 text-white backdrop-blur-md border border-white/20 shadow-lg"
                    >
                      {currentColorHex}
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-900/90 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-white font-bold">Nova Cor</span>
                    <span className="text-[11px] font-mono text-emerald-400 font-extrabold flex items-center gap-1">
                      <Sparkles size={11} /> ATIVA
                    </span>
                  </div>
                </div>

                {/* Cor Original */}
                <div className="rounded-2xl border border-white/10 overflow-hidden opacity-90 hover:opacity-100 transition-opacity flex flex-col">
                  <div
                    className="h-28 sm:h-32 lg:h-36 w-full flex items-center justify-center relative"
                    style={{ backgroundColor: startingHex }}
                  >
                    <span className="text-xs sm:text-sm font-mono font-bold uppercase px-3 py-1.5 rounded-xl bg-black/70 text-white/90 backdrop-blur-md border border-white/15">
                      {startingHex}
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-900/70 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Original</span>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-[11px] font-bold text-[var(--gm-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                      title="Restaurar cor inicial"
                    >
                      <RotateCcw size={11} /> Restaurar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CÓDIGOS DE CONVERSÃO FORMATADOS (HEX, RGB, CMYK) COM CLIQUE PARA COPIAR */}
            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Códigos de Conversão
                </span>
                {copiedFormat && (
                  <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 animate-in fade-in flex items-center gap-1">
                    <CheckCircle2 size={12} /> {copiedFormat} Copiado!
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                {/* HEX */}
                <div 
                  onClick={() => handleCopy(currentColorHex, "HEX")}
                  className="p-2.5 sm:p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col justify-between cursor-pointer transition-colors group"
                  title="Clique para copiar HEX"
                >
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold">
                    <span>HEX</span>
                    <Copy size={11} className="opacity-0 group-hover:opacity-100 transition-opacity text-white" />
                  </div>
                  <span className="font-extrabold text-white text-xs sm:text-sm mt-1 truncate">
                    {currentColorHex}
                  </span>
                </div>

                {/* RGB */}
                <div 
                  onClick={() => handleCopy(`rgb(${currentRgb.r}, ${currentRgb.g}, ${currentRgb.b})`, "RGB")}
                  className="p-2.5 sm:p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col justify-between cursor-pointer transition-colors group"
                  title="Clique para copiar RGB"
                >
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold">
                    <span>RGB</span>
                    <Copy size={11} className="opacity-0 group-hover:opacity-100 transition-opacity text-white" />
                  </div>
                  <span className="font-extrabold text-white text-xs mt-1 truncate">
                    {currentRgb.r}, {currentRgb.g}, {currentRgb.b}
                  </span>
                </div>

                {/* CMYK */}
                <div 
                  onClick={() => handleCopy(`${currentCmyk.c}%, ${currentCmyk.m}%, ${currentCmyk.y}%, ${currentCmyk.k}%`, "CMYK")}
                  className="p-2.5 sm:p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col justify-between cursor-pointer transition-colors group"
                  title="Clique para copiar CMYK"
                >
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold">
                    <span>CMYK</span>
                    <Copy size={11} className="opacity-0 group-hover:opacity-100 transition-opacity text-white" />
                  </div>
                  <span className="font-extrabold text-white text-xs mt-1 truncate">
                    {currentCmyk.c}%, {currentCmyk.m}%
                  </span>
                </div>
              </div>
            </div>

            {/* PALETAS & AMOSTRAS RÁPIDAS */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                <span>Amostras Populares</span>
                <span className="text-[11px] text-slate-400 font-normal">Toque para selecionar</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {QUICK_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.name}
                    type="button"
                    onClick={() => handleApplyQuickSwatch(swatch.hex)}
                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 transition-all text-xs font-medium text-slate-200 cursor-pointer group active:scale-95"
                    title={swatch.name}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0 group-hover:scale-110 transition-transform shadow-xs"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span className="truncate text-[11px]">{swatch.name}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* ========================================================
              COLUNA DIREITA (DESKTOP lg:col-span-7): SLIDERS & CONTROLES
          ======================================================== */}
          <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
            
            <div className="space-y-5">
              
              {/* 1. BARRA DE ESPECTRO DE MATIZ (RAINBOW SPECTRUM SLIDER 0° - 360°) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/15 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <label className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2.5">
                    <span 
                      className="w-4 h-4 rounded-full border-2 border-white shadow-md shrink-0"
                      style={{ backgroundColor: currentColorHex }}
                    />
                    <span>1. Espectro de Matiz (Tom / Matriz)</span>
                  </label>
                  <span className="text-xs sm:text-sm font-mono font-black text-white bg-white/15 px-3 py-1 rounded-xl border border-white/20">
                    {hue}° / 360°
                  </span>
                </div>
                
                <div className="pt-1">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={hue}
                    onChange={(e) => handleHueChange(Number(e.target.value))}
                    className="spectrum-slider w-full cursor-pointer"
                    title="Arraste para alterar a matiz da cor"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pt-1">
                  <span>0° Vermelho</span>
                  <span>120° Verde</span>
                  <span>240° Azul</span>
                  <span>360° Vermelho</span>
                </div>
              </div>

              {/* 2. SATURAÇÃO (INTENSIDADE 0% A 100%) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/15 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <label className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                    <Sliders size={16} className="text-[var(--gm-primary)]" />
                    <span>2. Saturação (Intensidade da Cor)</span>
                  </label>
                  <span className="text-xs sm:text-sm font-mono font-black text-white bg-white/15 px-3 py-1 rounded-xl border border-white/20">
                    {saturation}%
                  </span>
                </div>

                <div className="pt-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={saturation}
                    onChange={(e) => handleSaturationChange(Number(e.target.value))}
                    className="custom-range-slider w-full border border-white/15 shadow-inner"
                    style={{
                      background: `linear-gradient(to right, hsl(${hue}, 0%, ${lightness}%), hsl(${hue}, 100%, ${lightness}%))`
                    }}
                    title="Ajustar intensidade da cor"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pt-0.5">
                  <span>Escala de Cinza (0%)</span>
                  <span>Cor Pura e Vibrante (100%)</span>
                </div>
              </div>

              {/* 3. LUMINOSIDADE / BRILHO (CLARO / ESCURO 10% A 90%) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/15 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <label className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-[var(--gm-primary)]" />
                    <span>3. Luminosidade (Claro / Escuro)</span>
                  </label>
                  <span className="text-xs sm:text-sm font-mono font-black text-white bg-white/15 px-3 py-1 rounded-xl border border-white/20">
                    {lightness}%
                  </span>
                </div>

                <div className="pt-1">
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={lightness}
                    onChange={(e) => handleLightnessChange(Number(e.target.value))}
                    className="custom-range-slider w-full border border-white/15 shadow-inner"
                    style={{
                      background: `linear-gradient(to right, #000000, hsl(${hue}, ${saturation}%, 50%), #ffffff)`
                    }}
                    title="Ajustar nível de brilho claro/escuro"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pt-0.5">
                  <span>Escuro / Profundo (10%)</span>
                  <span>Médio (50%)</span>
                  <span>Claro / Pastel (90%)</span>
                </div>
              </div>

              {/* 4. ENTRADA MANUAL DIRETA DE CÓDIGO HEX */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 w-full sm:w-auto">
                  <Hash size={16} className="text-[var(--gm-primary)]" />
                  <span>Digitar código Hexadecimal:</span>
                </div>

                <div className="relative w-full sm:w-48">
                  <input
                    type="text"
                    maxLength={7}
                    value={customHexInput}
                    onChange={(e) => handleDirectHexChange(e.target.value)}
                    placeholder="#FE540B"
                    className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-sm font-mono font-black text-white uppercase text-center focus:outline-none focus:border-[var(--gm-primary)] transition-colors"
                  />
                  <div 
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-white/30"
                    style={{ backgroundColor: currentColorHex }}
                  />
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* RODAPÉ DO MODAL (BOTÕES COM TOQUE ERGONÔMICO MÍNIMO DE 44PX/48PX E FOCO PRIORITÁRIO NO MOBILE) */}
        <div className="p-4 sm:p-6 lg:p-7 border-t border-white/10 bg-white/[0.02] shrink-0 flex flex-col sm:flex-row-reverse items-stretch sm:items-center justify-start sm:justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              onApply(currentColorHex);
              onClose();
            }}
            className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2.5 shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer select-none order-1 sm:order-2"
            style={{
              backgroundColor: currentColorHex,
              boxShadow: `0 10px 30px -5px ${currentColorHex}90`,
            }}
          >
            <Check size={20} strokeWidth={3} />
            <span>Aplicar Cor Selecionada</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/15 text-slate-200 hover:text-white font-bold text-sm transition-all cursor-pointer text-center select-none order-2 sm:order-1"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
};
