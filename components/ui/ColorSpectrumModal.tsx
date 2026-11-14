import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  onPreview?: (colorHex: string) => void;
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
  onPreview,
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
    onPreview?.(newHex);
  };

  const handleSaturationChange = (newSat: number) => {
    setSaturation(newSat);
    const newHex = hslToHex(hue, newSat, lightness);
    setCustomHexInput(newHex);
    onPreview?.(newHex);
  };

  const handleLightnessChange = (newLight: number) => {
    setLightness(newLight);
    const newHex = hslToHex(hue, saturation, newLight);
    setCustomHexInput(newHex);
    onPreview?.(newHex);
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
      onPreview?.(clean);
    }
  };

  const handleApplyQuickSwatch = (hex: string) => {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    setHue(hsl.h);
    setSaturation(hsl.s);
    setLightness(hsl.l);
    setCustomHexInput(hex);
    onPreview?.(hex);
  };

  const handleReset = () => {
    setHue(startingHsl.h);
    setSaturation(startingHsl.s);
    setLightness(startingHsl.l);
    setCustomHexInput(startingHex);
    onPreview?.(startingHex);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(label);
    setTimeout(() => setCopiedFormat(null), 1800);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-fade-in"
      onClick={onClose}
      style={{ zIndex: 99999 }}
    >
      <div
        className="w-full flex flex-col rounded-lg border border-[#26262A] bg-[#131315] shadow-2xl relative my-auto overflow-hidden gm-modal"
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "88vh",
          background: "#131315",
          borderColor: "#26262A",
          borderWidth: "1px",
          borderStyle: "solid",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* HEADER DO MODAL */}
        <div 
          className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#26262A] bg-[#0B0B0C]/60 shrink-0"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 border border-[#26262A] transition-colors duration-150"
              style={{
                backgroundColor: currentColorHex,
              }}
            >
              <Palette className="w-5 h-5 text-white drop-shadow" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-[#F2F2F3] tracking-tight leading-tight truncate">
                {title}
              </h2>
              <p className="text-[13px] text-[#8B8B92] mt-0.5 leading-snug line-clamp-1">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-[4px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] hover:border-[#3F3F46] text-[#8B8B92] hover:text-[#F2F2F3] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="Fechar"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-5 items-start custom-scroll max-h-[calc(90vh-140px)]">
          
          {/* COLUNA ESQUERDA */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* PRÉVIA VISUAL DE COMPARAÇÃO */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#8B8B92] uppercase tracking-wider">
                <span>Comparativo de Cor</span>
                <span className="text-emerald-400 flex items-center gap-1 font-bold text-[11px]">
                  <Sparkles size={12} /> Em Tempo Real
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-md border border-[#26262A] overflow-hidden flex flex-col">
                  <div
                    className="h-20 sm:h-24 w-full transition-colors duration-150 flex items-center justify-center relative"
                    style={{ backgroundColor: currentColorHex }}
                  >
                    <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded-[4px] bg-black/75 text-white border border-white/20">
                      {currentColorHex}
                    </span>
                  </div>
                  <div className="py-1.5 px-2.5 bg-[#0B0B0C] border-t border-[#26262A] flex items-center justify-between text-[11px]">
                    <span className="text-[#F2F2F3] font-bold">Nova Cor</span>
                    <span className="font-mono text-emerald-400 font-bold">ATIVA</span>
                  </div>
                </div>

                <div className="rounded-md border border-[#26262A] overflow-hidden flex flex-col">
                  <div
                    className="h-20 sm:h-24 w-full flex items-center justify-center relative"
                    style={{ backgroundColor: startingHex }}
                  >
                    <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded-[4px] bg-black/75 text-white/90 border border-white/15">
                      {startingHex}
                    </span>
                  </div>
                  <div className="py-1.5 px-2.5 bg-[#0B0B0C] border-t border-[#26262A] flex items-center justify-between text-[11px]">
                    <span className="text-[#8B8B92] font-medium">Original</span>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="font-bold text-[var(--gm-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                      title="Restaurar cor inicial"
                    >
                      <RotateCcw size={11} /> Restaurar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CÓDIGOS DE CONVERSÃO */}
            <div className="p-3.5 rounded-md bg-[#0B0B0C] border border-[#26262A] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B8B92]">
                  Códigos de Conversão
                </span>
                {copiedFormat && (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-[4px] border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 size={12} /> {copiedFormat} Copiado
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div 
                  onClick={() => handleCopy(currentColorHex, "HEX")}
                  className="p-2 rounded-[4px] bg-[#131315] hover:bg-[#1B1B1E] border border-[#26262A] flex flex-col justify-between cursor-pointer transition-colors group"
                  title="Clique para copiar HEX"
                >
                  <div className="flex items-center justify-between text-[#8B8B92] text-[11px] font-bold">
                    <span>HEX</span>
                    <Copy size={11} className="opacity-0 group-hover:opacity-100 transition-opacity text-white" />
                  </div>
                  <span className="font-bold text-white text-xs mt-0.5 truncate tabular-nums">
                    {currentColorHex}
                  </span>
                </div>

                <div 
                  onClick={() => handleCopy(`rgb(${currentRgb.r}, ${currentRgb.g}, ${currentRgb.b})`, "RGB")}
                  className="p-2 rounded-[4px] bg-[#131315] hover:bg-[#1B1B1E] border border-[#26262A] flex flex-col justify-between cursor-pointer transition-colors group"
                  title="Clique para copiar RGB"
                >
                  <div className="flex items-center justify-between text-[#8B8B92] text-[11px] font-bold">
                    <span>RGB</span>
                    <Copy size={11} className="opacity-0 group-hover:opacity-100 transition-opacity text-white" />
                  </div>
                  <span className="font-bold text-white text-xs mt-0.5 truncate tabular-nums">
                    {currentRgb.r}, {currentRgb.g}, {currentRgb.b}
                  </span>
                </div>

                <div 
                  onClick={() => handleCopy(`${currentCmyk.c}%, ${currentCmyk.m}%, ${currentCmyk.y}%, ${currentCmyk.k}%`, "CMYK")}
                  className="p-2 rounded-[4px] bg-[#131315] hover:bg-[#1B1B1E] border border-[#26262A] flex flex-col justify-between cursor-pointer transition-colors group"
                  title="Clique para copiar CMYK"
                >
                  <div className="flex items-center justify-between text-[#8B8B92] text-[11px] font-bold">
                    <span>CMYK</span>
                    <Copy size={11} className="opacity-0 group-hover:opacity-100 transition-opacity text-white" />
                  </div>
                  <span className="font-bold text-white text-xs mt-0.5 truncate tabular-nums">
                    {currentCmyk.c}%, {currentCmyk.m}%
                  </span>
                </div>
              </div>
            </div>

            {/* PALETAS & AMOSTRAS RÁPIDAS */}
            <div className="space-y-2 p-3.5 rounded-md bg-[#0B0B0C] border border-[#26262A]">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#8B8B92] uppercase tracking-wider">
                <span>Amostras Populares</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {QUICK_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.name}
                    type="button"
                    onClick={() => handleApplyQuickSwatch(swatch.hex)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-[4px] bg-[#131315] hover:bg-[#1B1B1E] border border-[#26262A] hover:border-[#3F3F46] transition-colors text-[11px] font-medium text-[#F2F2F3] cursor-pointer active:scale-95"
                    title={swatch.name}
                  >
                    <span
                      className="w-3 h-3 rounded-[2px] border border-white/30 shrink-0"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span className="truncate">{swatch.name}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* COLUNA DIREITA */}
          <div className="lg:col-span-7 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3.5">
              
              {/* 1. MATIZ */}
              <div className="p-3.5 sm:p-4 rounded-md bg-[#0B0B0C] border border-[#26262A] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-[13px] font-bold text-[#F2F2F3] flex items-center gap-2">
                    <span 
                      className="w-3.5 h-3.5 rounded-[3px] border border-white/40 shrink-0"
                      style={{ backgroundColor: currentColorHex }}
                    />
                    <span>1. Espectro de Matiz</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-[#F2F2F3] bg-[#1B1B1E] px-2.5 py-0.5 rounded-[4px] border border-[#26262A] tabular-nums">
                    {hue}° / 360°
                  </span>
                </div>
                
                <div className="pt-0.5">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={hue}
                    onChange={(e) => handleHueChange(Number(e.target.value))}
                    onInput={(e) => handleHueChange(Number((e.target as HTMLInputElement).value))}
                    className="spectrum-slider w-full cursor-pointer"
                    title="Arraste para alterar a matiz da cor"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-semibold text-[#8B8B92] pt-0.5">
                  <span>0° Vermelho</span>
                  <span>120° Verde</span>
                  <span>240° Azul</span>
                  <span>360°</span>
                </div>
              </div>

              {/* 2. SATURAÇÃO */}
              <div className="p-3.5 sm:p-4 rounded-md bg-[#0B0B0C] border border-[#26262A] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-[13px] font-bold text-[#F2F2F3] flex items-center gap-2">
                    <Sliders size={14} className="text-[var(--gm-primary)]" />
                    <span>2. Saturação</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-[#F2F2F3] bg-[#1B1B1E] px-2.5 py-0.5 rounded-[4px] border border-[#26262A] tabular-nums">
                    {saturation}%
                  </span>
                </div>

                <div className="pt-0.5">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={saturation}
                    onChange={(e) => handleSaturationChange(Number(e.target.value))}
                    onInput={(e) => handleSaturationChange(Number((e.target as HTMLInputElement).value))}
                    className="custom-range-slider w-full border border-[#26262A]"
                    style={{
                      background: `linear-gradient(to right, hsl(${hue}, 0%, ${lightness}%), hsl(${hue}, 100%, ${lightness}%))`
                    }}
                    title="Ajustar intensidade da cor"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-semibold text-[#8B8B92] pt-0.5">
                  <span>Cinza (0%)</span>
                  <span>Pura e Vibrante (100%)</span>
                </div>
              </div>

              {/* 3. LUMINOSIDADE */}
              <div className="p-3.5 sm:p-4 rounded-md bg-[#0B0B0C] border border-[#26262A] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-[13px] font-bold text-[#F2F2F3] flex items-center gap-2">
                    <Sparkles size={14} className="text-[var(--gm-primary)]" />
                    <span>3. Luminosidade</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-[#F2F2F3] bg-[#1B1B1E] px-2.5 py-0.5 rounded-[4px] border border-[#26262A] tabular-nums">
                    {lightness}%
                  </span>
                </div>

                <div className="pt-0.5">
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={lightness}
                    onChange={(e) => handleLightnessChange(Number(e.target.value))}
                    onInput={(e) => handleLightnessChange(Number((e.target as HTMLInputElement).value))}
                    className="custom-range-slider w-full border border-[#26262A]"
                    style={{
                      background: `linear-gradient(to right, #000000, hsl(${hue}, ${saturation}%, 50%), #ffffff)`
                    }}
                    title="Ajustar nível de brilho claro/escuro"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-semibold text-[#8B8B92] pt-0.5">
                  <span>Escuro (10%)</span>
                  <span>Médio (50%)</span>
                  <span>Claro (90%)</span>
                </div>
              </div>

              {/* 4. ENTRADA MANUAL HEX */}
              <div className="p-3.5 rounded-md bg-[#0B0B0C] border border-[#26262A] flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#CBD5E1] w-full sm:w-auto">
                  <Hash size={15} className="text-[var(--gm-primary)]" />
                  <span>Código Hexadecimal:</span>
                </div>

                <div className="relative w-full sm:w-44">
                  <input
                    type="text"
                    maxLength={7}
                    value={customHexInput}
                    onChange={(e) => handleDirectHexChange(e.target.value)}
                    placeholder="#FE540B"
                    className="w-full h-9 bg-[#131315] border border-[#26262A] rounded-[4px] px-3 pr-8 text-xs sm:text-sm font-mono font-bold text-white uppercase text-center focus:outline-none focus:border-[var(--gm-primary)] transition-colors"
                  />
                  <div 
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-[3px] border border-white/30"
                    style={{ backgroundColor: currentColorHex }}
                  />
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[#26262A] bg-[#0B0B0C]/60 shrink-0 flex flex-col sm:flex-row-reverse items-stretch sm:items-center justify-start sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              onApply(currentColorHex);
              onClose();
            }}
            className="w-full sm:w-auto h-10 px-6 rounded-[6px] font-black text-xs uppercase tracking-wider text-white flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-[filter,transform] duration-150 cursor-pointer select-none order-1 sm:order-2 whitespace-nowrap"
            style={{
              backgroundColor: currentColorHex,
              border: `1px solid ${currentColorHex}`,
            }}
          >
            <Check size={16} strokeWidth={2.5} />
            <span>Aplicar Cor Selecionada</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto h-10 px-5 rounded-[6px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] hover:border-[#3F3F46] text-[#F2F2F3] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-center select-none order-2 sm:order-1 whitespace-nowrap"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
