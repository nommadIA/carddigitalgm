import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Check, Copy, CheckCircle2, Sliders, Palette, Grid, Sparkles } from "lucide-react";

// ==========================================
// UTILITÁRIOS MATEMÁTICOS DE COR (HSV <-> RGB <-> HEX)
// ==========================================

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
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

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;

  if (max !== min) {
    switch (max) {
      case rN:
        h = (gN - bN) / d + (gN < bN ? 6 : 0);
        break;
      case gN:
        h = (bN - rN) / d + 2;
        break;
      case bN:
        h = (rN - gN) / d + 4;
        break;
    }
    h *= 60;
  }

  return {
    h: Math.round(h) % 360,
    s: Math.round(s),
    v: Math.round(v),
  };
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const sN = Math.max(0, Math.min(100, s)) / 100;
  const vN = Math.max(0, Math.min(100, v)) / 100;
  const c = vN * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vN - c;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hsvToHex(h: number, s: number, v: number): string {
  const rgb = hsvToRgb(h, s, v);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

export interface ColorSwatchItem {
  hex: string;
  name: string;
}

interface AdobeStyleColorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  color: string;
  onChange: (hex: string) => void;
  title: string;
  companionColor?: string; // Cor secundária para o ícone de sobreposição Adobe (ex: cor de fundo ou cor do QR)
  allowTransparent?: boolean;
  isTransparent?: boolean;
  onToggleTransparent?: (transparent: boolean) => void;
  swatches?: ColorSwatchItem[];
}

export const AdobeStyleColorPicker: React.FC<AdobeStyleColorPickerProps> = ({
  isOpen,
  onClose,
  color,
  onChange,
  title,
  companionColor = "#000000",
  allowTransparent = false,
  isTransparent = false,
  onToggleTransparent,
  swatches = [],
}) => {
  // Tabs: "cor" (espectro Adobe), "amostras" (swatches rápidas), "degrades" (presets elegantes)
  const [activeTab, setActiveTab] = useState<"cor" | "amostras" | "degrades">("cor");

  // Estado HSV interno
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>({ h: 20, s: 95, v: 99 });
  const [inputText, setInputText] = useState<string>(color);
  const [copied, setCopied] = useState(false);

  // Refs para cálculo de coordenadas de arraste
  const satValRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const isDraggingSatVal = useRef(false);
  const isDraggingHue = useRef(false);

  // Inicializa HSV a partir da cor atual
  useEffect(() => {
    if (isOpen) {
      if (!isTransparent && color && color !== "transparent") {
        const rgb = hexToRgb(color);
        const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        setHsv(newHsv);
        setInputText(color.toUpperCase());
      } else {
        setInputText("TRANSPARENTE");
      }
    }
  }, [isOpen, color, isTransparent]);

  // Atualiza coordenadas no painel 2D de Saturação e Brilho
  const updateSatValFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      if (!satValRef.current) return;
      const rect = satValRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

      const newS = Math.round((x / rect.width) * 100);
      const newV = Math.round((1 - y / rect.height) * 100);

      setHsv((prev) => {
        const updated = { ...prev, s: newS, v: newV };
        const newHex = hsvToHex(updated.h, updated.s, updated.v);
        setInputText(newHex);
        if (isTransparent && onToggleTransparent) {
          onToggleTransparent(false);
        }
        onChange(newHex);
        return updated;
      });
    },
    [onChange, isTransparent, onToggleTransparent]
  );

  // Atualiza matiz (Hue) da barra vertical (0 a 360°)
  // O espectro visual do topo ao fundo: Vermelho -> Magenta -> Azul -> Ciano -> Verde -> Amarelo -> Vermelho (ou 360° -> 0°)
  const updateHueFromEvent = useCallback(
    (clientY: number) => {
      if (!hueRef.current) return;
      const rect = hueRef.current.getBoundingClientRect();
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      const pct = y / rect.height; // 0 (topo) a 1 (fundo)

      // No Photoshop (imagem de referência): Topo é Vermelho (0/360), Magenta (300), Azul (240), Ciano (180), Verde (120), Amarelo (60), Vermelho (0)
      const newH = Math.round((1 - pct) * 360) % 360;

      setHsv((prev) => {
        const updated = { ...prev, h: newH };
        const newHex = hsvToHex(updated.h, updated.s, updated.v);
        setInputText(newHex);
        if (isTransparent && onToggleTransparent) {
          onToggleTransparent(false);
        }
        onChange(newHex);
        return updated;
      });
    },
    [onChange, isTransparent, onToggleTransparent]
  );

  // Listeners globais de ponteiro para arraste suave
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isDraggingSatVal.current) {
        updateSatValFromEvent(e.clientX, e.clientY);
      } else if (isDraggingHue.current) {
        updateHueFromEvent(e.clientY);
      }
    };

    const handlePointerUp = () => {
      isDraggingSatVal.current = false;
      isDraggingHue.current = false;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [updateSatValFromEvent, updateHueFromEvent]);

  // Edição manual de HEX
  const handleHexInputChange = (val: string) => {
    setInputText(val);
    let clean = val.trim();
    if (!clean.startsWith("#")) clean = "#" + clean;
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
      const rgb = hexToRgb(clean);
      const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setHsv(newHsv);
      if (isTransparent && onToggleTransparent) {
        onToggleTransparent(false);
      }
      onChange(clean.toUpperCase());
    }
  };

  const currentHex = isTransparent ? "transparent" : hsvToHex(hsv.h, hsv.s, hsv.v);
  const rgbValues = hsvToRgb(hsv.h, hsv.s, hsv.v);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl bg-[#1e1e24] border border-white/20 shadow-[0_30px_70px_rgba(0,0,0,0.95)] backdrop-blur-2xl flex flex-col text-white animate-in zoom-in-95 duration-150 overflow-hidden select-text"
        style={{ width: "350px", maxWidth: "calc(100vw - 32px)", margin: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================
            BARRA DE ABAS SUPERIOR (ESTILO ADOBE: Cor | Amostras | Degradês)
        ======================================================== */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#16161b] px-3 pt-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("cor")}
              className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors cursor-pointer border-t border-x ${
                activeTab === "cor"
                  ? "bg-[#1e1e24] text-white border-white/20 border-b-transparent -mb-[1px]"
                  : "bg-transparent text-slate-400 hover:text-white border-transparent"
              }`}
            >
              Cor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("amostras")}
              className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors cursor-pointer border-t border-x ${
                activeTab === "amostras"
                  ? "bg-[#1e1e24] text-white border-white/20 border-b-transparent -mb-[1px]"
                  : "bg-transparent text-slate-400 hover:text-white border-transparent"
              }`}
            >
              Amostras
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("degrades")}
              className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors cursor-pointer border-t border-x ${
                activeTab === "degrades"
                  ? "bg-[#1e1e24] text-white border-white/20 border-b-transparent -mb-[1px]"
                  : "bg-transparent text-slate-400 hover:text-white border-transparent"
              }`}
            >
              Degradês
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 -mt-1 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Fechar"
          >
            <X size={15} />
          </button>
        </div>

        {/* ========================================================
            CORPO DO PAINEL DE CORES
        ======================================================== */}
        <div className="p-4 flex flex-col gap-3.5">
          {/* Header com título e ícone duplo sobreposto do Adobe */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Ícone clássico Adobe de Amostras Sobrepostas (Primeiro plano vs Fundo) */}
              <div className="relative w-8 h-8 shrink-0">
                {/* Quadrado do fundo (secundário) */}
                <div
                  className="absolute bottom-0 right-0 w-5 h-5 rounded-sm border border-white/40 shadow-sm"
                  style={{
                    backgroundColor:
                      companionColor === "transparent" ? "#334155" : companionColor,
                  }}
                  title="Cor secundária"
                />
                {/* Quadrado do primeiro plano (ativo) */}
                <div
                  className="absolute top-0 left-0 w-5 h-5 rounded-sm border-2 border-white shadow-md z-10"
                  style={{
                    backgroundColor: isTransparent ? "transparent" : currentHex,
                  }}
                  title="Cor ativa"
                />
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-black text-white uppercase tracking-wider">{title}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {isTransparent ? "Transparente" : currentHex}
                </span>
              </div>
            </div>

            {/* Alternador de transparência (se permitido) */}
            {allowTransparent && onToggleTransparent && (
              <button
                type="button"
                onClick={() => onToggleTransparent(!isTransparent)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  isTransparent
                    ? "bg-amber-500/25 border-amber-500/60 text-amber-300 shadow-sm"
                    : "bg-white/5 border-white/15 text-slate-300 hover:text-white"
                }`}
              >
                {isTransparent ? "Transparente ✓" : "Tornar Transparente"}
              </button>
            )}
          </div>

          {/* ========================================================
              ABA 1: ESPECTRO PROFISSIONAL ADOBE
          ======================================================== */}
          {activeTab === "cor" && (
            <div className="flex flex-col gap-3">
              {/* Container de Espectro 2D + Barra de Matiz (Hue) */}
              <div className="flex items-stretch gap-3">
                {/* 1. QUADRADO 2D (SATURAÇÃO X BRILHO) */}
                <div
                  ref={satValRef}
                  onPointerDown={(e) => {
                    isDraggingSatVal.current = true;
                    updateSatValFromEvent(e.clientX, e.clientY);
                  }}
                  className="relative flex-1 h-[210px] rounded-xl overflow-hidden cursor-crosshair border border-white/20 shadow-inner touch-none"
                  style={{
                    backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
                  }}
                >
                  {/* Gradiente Horizontal (Branco -> Transparente) */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(to right, #ffffff, transparent)",
                    }}
                  />
                  {/* Gradiente Vertical (Transparente -> Preto) */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(to top, #000000, transparent)",
                    }}
                  />

                  {/* Retículo / Indicador Circular Adobe */}
                  <div
                    className="absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.9)] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      left: `${hsv.s}%`,
                      top: `${100 - hsv.v}%`,
                    }}
                  />
                </div>

                {/* 2. BARRA VERTICAL DE MATIZ (HUE SLIDER - ADOBE STYLE) */}
                <div
                  ref={hueRef}
                  onPointerDown={(e) => {
                    isDraggingHue.current = true;
                    updateHueFromEvent(e.clientY);
                  }}
                  className="relative w-6 h-[210px] rounded-xl overflow-visible cursor-pointer border border-white/20 shadow-inner touch-none shrink-0"
                  style={{
                    background:
                      "linear-gradient(to bottom, #ff0000 0%, #ff00ff 17%, #0000ff 33%, #00ffff 50%, #00ff00 67%, #ffff00 83%, #ff0000 100%)",
                  }}
                >
                  {/* Marcador triangular do Hue */}
                  <div
                    className="absolute -left-1.5 -right-1.5 h-1.5 border-y-2 border-white shadow-[0_0_3px_black] pointer-events-none -translate-y-1/2 bg-black/40"
                    style={{
                      top: `${((360 - hsv.h) / 360) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Informações Numéricas e Campo HEX */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* Campo HEX */}
                <div className="flex items-center gap-1.5 px-3 h-10 rounded-xl bg-black/70 border-2 border-white/20 focus-within:border-[var(--gm-primary)]">
                  <span className="text-xs font-mono text-[var(--gm-primary)] font-black">#</span>
                  <input
                    type="text"
                    maxLength={7}
                    value={inputText}
                    onChange={(e) => handleHexInputChange(e.target.value)}
                    placeholder="FE540B"
                    className="w-full bg-transparent text-white font-mono text-xs sm:text-sm uppercase outline-none font-black tracking-wider"
                  />
                </div>

                {/* Valores RGB */}
                <div className="flex items-center justify-around px-2 py-1.5 rounded-xl bg-black/50 border border-white/10 text-[10px] font-mono text-slate-300">
                  <span>R:{rgbValues.r}</span>
                  <span>G:{rgbValues.g}</span>
                  <span>B:{rgbValues.b}</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              ABA 2: AMOSTRAS (SWATCHES RÁPIDAS)
          ======================================================== */}
          {activeTab === "amostras" && (
            <div className="flex flex-col gap-2.5 animate-in fade-in duration-150">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                Amostras Otimizadas de Contraste
              </span>

              <div className="grid grid-cols-5 gap-2.5 py-1 justify-items-center max-h-[220px] overflow-y-auto">
                {swatches.map((item) => {
                  const isSelected =
                    !isTransparent && currentHex.toUpperCase() === item.hex.toUpperCase();
                  return (
                    <button
                      key={item.hex}
                      type="button"
                      onClick={() => {
                        const rgb = hexToRgb(item.hex);
                        const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
                        setHsv(newHsv);
                        setInputText(item.hex);
                        if (isTransparent && onToggleTransparent) {
                          onToggleTransparent(false);
                        }
                        onChange(item.hex);
                      }}
                      className={`rounded-xl border transition-all flex items-center justify-center cursor-pointer shadow-xs ${
                        isSelected
                          ? "ring-2 ring-white scale-105 border-white shadow-orange-500/30"
                          : "border-white/15 hover:border-white/50 hover:scale-105 opacity-90 hover:opacity-100"
                      }`}
                      style={{ width: "44px", height: "44px", backgroundColor: item.hex }}
                      title={`${item.name} (${item.hex})`}
                    >
                      {isSelected && (
                        <Check
                          size={16}
                          className={
                            item.hex === "#FFFFFF" || item.hex === "#F8FAFC"
                              ? "text-black stroke-[3.5]"
                              : "text-white stroke-[3.5]"
                          }
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================
              ABA 3: DEGRADÊS & TONS PRÉ-CONFIGURADOS
          ======================================================== */}
          {activeTab === "degrades" && (
            <div className="flex flex-col gap-2.5 animate-in fade-in duration-150">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                Tons Recomendados para QR Codes
              </span>

              <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto">
                {[
                  { name: "Laranja GM Pro", hex: "#FE540B", desc: "Assinatura" },
                  { name: "Preto Absoluto", hex: "#000000", desc: "Máxima Leitura" },
                  { name: "Azul Profundo", hex: "#1D4ED8", desc: "Executivo" },
                  { name: "Esmeralda Escuro", hex: "#047857", desc: "Ecológico" },
                  { name: "Violeta Nobre", hex: "#6D28D9", desc: "Criativo" },
                  { name: "Dourado Nobre", hex: "#B45309", desc: "Premium" },
                  { name: "Vermelho Carmim", hex: "#BE123C", desc: "Intenso" },
                  { name: "Branco Puro", hex: "#FFFFFF", desc: "Fundo Padrão" },
                ].map((item) => (
                  <button
                    key={item.hex}
                    type="button"
                    onClick={() => {
                      const rgb = hexToRgb(item.hex);
                      const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
                      setHsv(newHsv);
                      setInputText(item.hex);
                      if (isTransparent && onToggleTransparent) {
                        onToggleTransparent(false);
                      }
                      onChange(item.hex);
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-2.5 transition-all cursor-pointer text-left"
                  >
                    <span
                      className="w-6 h-6 rounded-lg border border-white/30 shrink-0 shadow-xs"
                      style={{ backgroundColor: item.hex }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold text-white truncate">{item.name}</span>
                      <span className="text-[9px] text-slate-400 font-mono">{item.hex}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Botão de Fechar / Concluir */}
          <button
            type="button"
            onClick={onClose}
            className="w-full h-10 rounded-xl bg-[var(--gm-primary)] hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center mt-1"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// =======================================================================
// COMPONENTE EMBARCADO INLINE: PAINEL EVIDENTE DE COR (ESTILO ADOBE)
// Renderizado diretamente no container do QR Code, abaixo do título
// =======================================================================

export interface EmbeddedAdobeColorPickerProps {
  color: string;
  onChange: (hex: string) => void;
  title: string;
  subtitle?: string;
  companionColor?: string;
  allowTransparent?: boolean;
  isTransparent?: boolean;
  onToggleTransparent?: (transparent: boolean) => void;
  swatches?: ColorSwatchItem[];
  defaultTab?: "cor" | "amostras" | "degrades";
}

export const EmbeddedAdobeColorPicker: React.FC<EmbeddedAdobeColorPickerProps> = ({
  color,
  onChange,
  title,
  subtitle,
  companionColor = "#000000",
  allowTransparent = false,
  isTransparent = false,
  onToggleTransparent,
  swatches = [],
  defaultTab = "cor",
}) => {
  const [activeTab, setActiveTab] = useState<"cor" | "amostras" | "degrades">(defaultTab);
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>({ h: 20, s: 95, v: 99 });
  const [inputText, setInputText] = useState<string>(color);

  const satValRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const isDraggingSatVal = useRef(false);
  const isDraggingHue = useRef(false);

  // Sincroniza estado com a cor atual
  useEffect(() => {
    if (!isTransparent && color && color !== "transparent") {
      const rgb = hexToRgb(color);
      const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setHsv(newHsv);
      setInputText(color.toUpperCase());
    } else {
      setInputText("TRANSPARENTE");
    }
  }, [color, isTransparent]);

  const updateSatValFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      if (!satValRef.current) return;
      const rect = satValRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

      const newS = Math.round((x / rect.width) * 100);
      const newV = Math.round((1 - y / rect.height) * 100);

      setHsv((prev) => {
        const updated = { ...prev, s: newS, v: newV };
        const newHex = hsvToHex(updated.h, updated.s, updated.v);
        setInputText(newHex);
        if (isTransparent && onToggleTransparent) {
          onToggleTransparent(false);
        }
        onChange(newHex);
        return updated;
      });
    },
    [onChange, isTransparent, onToggleTransparent]
  );

  const updateHueFromEvent = useCallback(
    (clientY: number) => {
      if (!hueRef.current) return;
      const rect = hueRef.current.getBoundingClientRect();
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      const pct = y / rect.height;
      const newH = Math.round((1 - pct) * 360) % 360;

      setHsv((prev) => {
        const updated = { ...prev, h: newH };
        const newHex = hsvToHex(updated.h, updated.s, updated.v);
        setInputText(newHex);
        if (isTransparent && onToggleTransparent) {
          onToggleTransparent(false);
        }
        onChange(newHex);
        return updated;
      });
    },
    [onChange, isTransparent, onToggleTransparent]
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isDraggingSatVal.current) {
        updateSatValFromEvent(e.clientX, e.clientY);
      } else if (isDraggingHue.current) {
        updateHueFromEvent(e.clientY);
      }
    };

    const handlePointerUp = () => {
      isDraggingSatVal.current = false;
      isDraggingHue.current = false;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [updateSatValFromEvent, updateHueFromEvent]);

  const handleHexInputChange = (val: string) => {
    let clean = val.trim().replace(/#/g, "");
    setInputText("#" + clean);
    if (/^[0-9A-Fa-f]{6}$/.test(clean)) {
      const formatted = "#" + clean.toUpperCase();
      const rgb = hexToRgb(formatted);
      const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setHsv(newHsv);
      if (isTransparent && onToggleTransparent) {
        onToggleTransparent(false);
      }
      onChange(formatted);
    }
  };

  const currentHex = isTransparent ? "transparent" : hsvToHex(hsv.h, hsv.s, hsv.v);
  const rgbValues = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const displayHex = isTransparent ? "TRANSP" : (currentHex.startsWith("#") ? currentHex.slice(1) : currentHex);

  // Paleta rápida de 7 cores calibradas
  const quickSwatches = allowTransparent
    ? [
        { hex: "#FFFFFF", name: "Branco Puro" },
        { hex: "transparent", name: "Transparente" },
        { hex: "#000000", name: "Preto Absoluto" },
        { hex: "#F8FAFC", name: "Off-White" },
        { hex: "#E2E8F0", name: "Cinza Claro" },
        { hex: "#1E293B", name: "Grafite" },
        { hex: "#0F172A", name: "Azul Noturno" },
      ]
    : [
        { hex: "#000000", name: "Preto Absoluto" },
        { hex: "#FE540B", name: "Laranja GM" },
        { hex: "#1D4ED8", name: "Azul Real" },
        { hex: "#047857", name: "Verde Esmeralda" },
        { hex: "#7C3AED", name: "Violeta" },
        { hex: "#DC2626", name: "Vermelho" },
        { hex: "#F59E0B", name: "Âmbar" },
      ];

  return (
    <div className="rounded-2xl bg-black/60 border border-white/12 p-3.5 sm:p-4 flex flex-col justify-between gap-3 shadow-inner h-full transition-all">
      {/* 1. CABEÇALHO DO BLOCO: TÍTULO, AMOSTRA SOBREPOSTA E HEX AMPLIADO (LINHA ÚNICA ALINHADA) */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10 min-h-[50px]">
        <div className="flex items-center gap-3 min-w-0">
          {/* Amostras sobrepostas clássicas Adobe */}
          <div className="relative w-8 h-8 shrink-0">
            <div
              className="absolute bottom-0 right-0 w-5 h-5 rounded-md border border-white/30 shadow-xs"
              style={{
                background: companionColor === "transparent" ? "repeating-conic-gradient(#475569 0% 25%, #1e293b 0% 50%) 50% / 6px 6px" : companionColor,
              }}
              title="Cor Secundária"
            />
            <div
              className="absolute top-0 left-0 w-5 h-5 rounded-md border-2 border-white shadow-sm z-10"
              style={{
                background: isTransparent ? "repeating-conic-gradient(#475569 0% 25%, #1e293b 0% 50%) 50% / 6px 6px" : currentHex,
              }}
              title="Cor Ativa"
            />
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider truncate">
              {title}
            </span>
            <span className="text-[11px] text-slate-400 font-mono font-medium truncate">
              {isTransparent ? "Transparente" : currentHex}
            </span>
          </div>
        </div>

        {/* Controles de Direita: Alternador Transparente + Input HEX Ampliado */}
        <div className="flex items-center gap-2 shrink-0">
          {allowTransparent && onToggleTransparent && (
            <button
              type="button"
              onClick={() => onToggleTransparent(!isTransparent)}
              className={`h-11 px-3 sm:px-3.5 rounded-xl border text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center justify-center ${
                isTransparent
                  ? "bg-amber-500/25 border-amber-500/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                  : "bg-white/5 border-white/15 text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              {isTransparent ? "Transp. ✓" : "Transparente"}
            </button>
          )}

          {/* Campo HEX Ampliado com Maior Destaque e Tipografia Forte */}
          <div className="flex items-center gap-1.5 px-3.5 h-11 rounded-xl bg-black/80 border-2 border-white/20 focus-within:border-[var(--gm-primary)] focus-within:ring-2 focus-within:ring-[var(--gm-primary)]/20 shadow-inner transition-all">
            <span className="text-sm font-mono text-[var(--gm-primary)] font-black select-none">#</span>
            <input
              type="text"
              maxLength={6}
              disabled={isTransparent}
              value={displayHex}
              onChange={(e) => handleHexInputChange(e.target.value)}
              placeholder="FE540B"
              className="w-20 sm:w-24 bg-transparent text-white font-mono text-sm sm:text-base uppercase outline-none font-black tracking-wider disabled:opacity-40"
            />
          </div>
        </div>
      </div>

      {/* 2. ABAS SUPERIORES ESTILO ADOBE (Segmented Control) */}
      <div className="flex items-center justify-between p-1 rounded-xl bg-black/40 border border-white/10">
        <div className="flex items-center gap-1">
          {[
            { id: "cor", label: "Espectro" },
            { id: "amostras", label: "Amostras" },
            { id: "degrades", label: "Tons" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white/20 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-[10px] font-mono text-slate-400 pr-1.5 hidden sm:inline">
          {isTransparent ? "ALFA: 0%" : `R:${rgbValues.r} G:${rgbValues.g} B:${rgbValues.b}`}
        </span>
      </div>

      {/* 3. CONTEÚDO DA ABA ATIVA */}
      {activeTab === "cor" && (
        <div className="flex flex-col gap-2.5">
          {/* Espectro 2D + Barra de Matiz */}
          <div className="flex items-stretch gap-2.5">
            {/* Quadrado 2D de Saturação x Brilho */}
            <div
              ref={satValRef}
              onPointerDown={(e) => {
                isDraggingSatVal.current = true;
                updateSatValFromEvent(e.clientX, e.clientY);
              }}
              className="relative flex-1 h-[155px] rounded-xl overflow-hidden cursor-crosshair border border-white/15 shadow-inner touch-none"
              style={{
                background: isTransparent
                  ? "repeating-conic-gradient(#334155 0% 25%, #1e293b 0% 50%) 50% / 12px 12px"
                  : `hsl(${hsv.h}, 100%, 50%)`,
              }}
            >
              {!isTransparent ? (
                <>
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(to right, #ffffff, transparent)",
                    }}
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(to top, #000000, transparent)",
                    }}
                  />
                  <div
                    className="absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.9)] -translate-x-1/2 -translate-y-1/2 pointer-events-none ring-1 ring-black/40"
                    style={{
                      left: `${hsv.s}%`,
                      top: `${100 - hsv.v}%`,
                    }}
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black/50 backdrop-blur-xs">
                  <span className="text-[11px] font-black text-amber-300">Fundo Transparente Ativo</span>
                  <p className="text-[9px] text-slate-300 mt-0.5">Clique na barra ou abaixo para cor sólida</p>
                </div>
              )}
            </div>

            {/* Barra Vertical de Matiz (Hue) */}
            <div
              ref={hueRef}
              onPointerDown={(e) => {
                isDraggingHue.current = true;
                updateHueFromEvent(e.clientY);
              }}
              className="relative w-5 sm:w-6 h-[155px] rounded-xl overflow-visible cursor-pointer border border-white/15 shadow-inner touch-none shrink-0"
              style={{
                background:
                  "linear-gradient(to bottom, #ff0000 0%, #ff00ff 17%, #0000ff 33%, #00ffff 50%, #00ff00 67%, #ffff00 83%, #ff0000 100%)",
              }}
            >
              <div
                className="absolute -left-1 -right-1 h-2 rounded-full border-2 border-white shadow-[0_0_3px_black] pointer-events-none -translate-y-1/2 bg-black/60"
                style={{
                  top: `${((360 - hsv.h) / 360) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Faixa de Amostras Rápidas (7 cores calibradas com bordas nítidas) */}
          <div className="flex items-center justify-between gap-1.5 pt-0.5">
            {quickSwatches.map((item) => {
              const isSelected =
                item.hex === "transparent"
                  ? isTransparent
                  : !isTransparent && currentHex.toUpperCase() === item.hex.toUpperCase();

              return (
                <button
                  key={item.hex}
                  type="button"
                  onClick={() => {
                    if (item.hex === "transparent") {
                      if (onToggleTransparent) onToggleTransparent(true);
                    } else {
                      const rgb = hexToRgb(item.hex);
                      const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
                      setHsv(newHsv);
                      setInputText(item.hex);
                      if (isTransparent && onToggleTransparent) {
                        onToggleTransparent(false);
                      }
                      onChange(item.hex);
                    }
                  }}
                  className={`flex-1 h-7 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-xs ${
                    isSelected
                      ? "ring-2 ring-white scale-105 border-white shadow-sm"
                      : "border-white/20 hover:border-white/50 hover:scale-105 opacity-90 hover:opacity-100"
                  }`}
                  style={{
                    background:
                      item.hex === "transparent"
                        ? "repeating-conic-gradient(#475569 0% 25%, #1e293b 0% 50%) 50% / 6px 6px"
                        : item.hex,
                  }}
                  title={item.name}
                >
                  {isSelected && (
                    <Check
                      size={13}
                      className={
                        item.hex === "#FFFFFF" || item.hex === "#F8FAFC" || item.hex === "transparent"
                          ? "text-black stroke-[3.5]"
                          : "text-white stroke-[3.5]"
                      }
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "amostras" && (
        <div className="flex flex-col gap-2 animate-in fade-in duration-150 h-[190px]">
          <div className="grid grid-cols-5 gap-2 py-1 justify-items-center overflow-y-auto max-h-[185px]">
            {swatches.map((item) => {
              const isSelected =
                !isTransparent && currentHex.toUpperCase() === item.hex.toUpperCase();
              return (
                <button
                  key={item.hex}
                  type="button"
                  onClick={() => {
                    const rgb = hexToRgb(item.hex);
                    const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
                    setHsv(newHsv);
                    setInputText(item.hex);
                    if (isTransparent && onToggleTransparent) {
                      onToggleTransparent(false);
                    }
                    onChange(item.hex);
                  }}
                  className={`w-10 h-10 rounded-xl border transition-all flex items-center justify-center cursor-pointer shadow-xs ${
                    isSelected
                      ? "ring-2 ring-white scale-105 border-white shadow-orange-500/30"
                      : "border-white/20 hover:border-white/50 hover:scale-105 opacity-90 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: item.hex }}
                  title={`${item.name} (${item.hex})`}
                >
                  {isSelected && (
                    <Check
                      size={15}
                      className={
                        item.hex === "#FFFFFF" || item.hex === "#F8FAFC"
                          ? "text-black stroke-[3.5]"
                          : "text-white stroke-[3.5]"
                      }
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "degrades" && (
        <div className="flex flex-col gap-2 animate-in fade-in duration-150 h-[190px]">
          <div className="grid grid-cols-2 gap-1.5 overflow-y-auto max-h-[185px]">
            {[
              { name: "Laranja GM", hex: "#FE540B" },
              { name: "Preto Absoluto", hex: "#000000" },
              { name: "Azul Profundo", hex: "#1D4ED8" },
              { name: "Esmeralda", hex: "#047857" },
              { name: "Violeta Nobre", hex: "#6D28D9" },
              { name: "Dourado", hex: "#B45309" },
              { name: "Carmim", hex: "#BE123C" },
              { name: "Branco Puro", hex: "#FFFFFF" },
            ].map((item) => (
              <button
                key={item.hex}
                type="button"
                onClick={() => {
                  const rgb = hexToRgb(item.hex);
                  const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
                  setHsv(newHsv);
                  setInputText(item.hex);
                  if (isTransparent && onToggleTransparent) {
                    onToggleTransparent(false);
                  }
                  onChange(item.hex);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-2 transition-all cursor-pointer text-left"
              >
                <span
                  className="w-5 h-5 rounded-md border border-white/30 shrink-0 shadow-xs"
                  style={{ backgroundColor: item.hex }}
                />
                <span className="text-[11px] font-bold text-white truncate">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
