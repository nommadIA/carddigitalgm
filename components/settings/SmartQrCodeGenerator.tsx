import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  QrCode,
  Link as LinkIcon,
  Download,
  Sparkles,
  Zap,
  Image as ImageIcon,
  Check,
  Copy,
  ExternalLink,
  RotateCcw,
  Sliders,
  Palette,
  FileText,
  FileCode,
  Maximize2,
  Trash2,
  Upload,
  Layers,
  Smartphone,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowLeftRight,
  Wand2,
  ShieldCheck,
  Info,
  ChevronDown,
  X,
} from "lucide-react";
import {
  renderQrToCanvas,
  downloadQrAsPng,
  downloadQrAsJpg,
  downloadQrAsSvg,
  downloadQrAsEps,
  downloadQrAsPdf,
  shortenUrlSmart,
  QrModuleShape,
  QrEyeShape,
  QrCodeOptions,
  getQrMatrix,
} from "../../services/qrCodeGeneratorService";
import { pushToast } from "../../store/toast";
import { playUiSound } from "../../lib/audio";
import { useAuth } from "../../store/AuthContext";
import { EmbeddedAdobeColorPicker, AdobeStyleColorPicker } from "./AdobeStyleColorPicker";

const OFFICIAL_GM_LOGO =
  "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg";

/**
 * Funções utilitárias de Luminância e Contraste Inteligente (Padrão WCAG / ISO)
 */
function getLuminance(hexColor: string): number {
  if (!hexColor || hexColor === "transparent") return 0.05;
  const clean = hexColor.replace("#", "");
  if (clean.length < 6) return 0.5;
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(fgHex: string, bgHex: string): number {
  const lum1 = getLuminance(fgHex);
  const lum2 = bgHex === "transparent" ? 0.05 : getLuminance(bgHex);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Cores individuais sugeridas para o QR Code (20 opções inteligentes de alto contraste)
const FG_COLORS = [
  { name: "Laranja GM", hex: "#FE540B" },
  { name: "Âmbar Solar", hex: "#F59E0B" },
  { name: "Dourado Gold", hex: "#FFD700" },
  { name: "Verde Lima", hex: "#84CC16" },
  { name: "Verde Esmeralda", hex: "#10B981" },
  { name: "Verde Menta", hex: "#2DD4BF" },
  { name: "Ciano Neon", hex: "#06B6D4" },
  { name: "Azul Celeste", hex: "#38BDF8" },
  { name: "Azul Royal", hex: "#2563EB" },
  { name: "Azul Cobalto", hex: "#1D4ED8" },
  { name: "Índigo", hex: "#6366F1" },
  { name: "Roxo Neon", hex: "#A855F7" },
  { name: "Magenta", hex: "#D946EF" },
  { name: "Rosa Pink", hex: "#EC4899" },
  { name: "Coral Intenso", hex: "#F43F5E" },
  { name: "Vermelho Rubi", hex: "#EF4444" },
  { name: "Bronze Cobre", hex: "#B45309" },
  { name: "Grafite Escuro", hex: "#334155" },
  { name: "Preto Puro", hex: "#000000" },
  { name: "Branco Puro", hex: "#FFFFFF" },
];

// Cores individuais sugeridas para o Fundo (16 opções inteligentes funcionais)
const BG_COLORS = [
  { name: "Dark GM", hex: "#0C0D12" },
  { name: "Preto Puro", hex: "#000000" },
  { name: "Ardósia Noturna", hex: "#0F172A" },
  { name: "Azul Meia-Noite", hex: "#0A1120" },
  { name: "Marinho Profundo", hex: "#0B132B" },
  { name: "Verde Noturno", hex: "#051811" },
  { name: "Roxo Noturno", hex: "#11081D" },
  { name: "Vinho Escuro", hex: "#18080B" },
  { name: "Café Noturno", hex: "#1A0F0A" },
  { name: "Grafite Escuro", hex: "#1E293B" },
  { name: "Cinza Aço", hex: "#334155" },
  { name: "Branco Puro", hex: "#FFFFFF" },
  { name: "Gelo Suave", hex: "#F8FAFC" },
  { name: "Creme Quente", hex: "#FEFCE8" },
  { name: "Areia Clean", hex: "#F5F5F0" },
  { name: "Menta Suave", hex: "#F0FDF4" },
];

export default function SmartQrCodeGenerator() {
  const { tenantId, user } = useAuth();

  // Estados principais
  const [inputUrl, setInputUrl] = useState<string>("https://carddigitalgm.com");
  const [activeUrl, setActiveUrl] = useState<string>("https://carddigitalgm.com");
  const [autoShorten, setAutoShorten] = useState<boolean>(true);
  const [shortening, setShortening] = useState<boolean>(false);
  const [shortenedUrl, setShortenedUrl] = useState<string | null>(null);

  // Formatos e Estilos dos Módulos
  const [moduleShape, setModuleShape] = useState<QrModuleShape>("rounded");
  const [eyeShape, setEyeShape] = useState<QrEyeShape>("rounded");

  // Cores e Fundo Inteligentes
  const [fgColor, setFgColor] = useState<string>("#FE540B");
  const [bgColor, setBgColor] = useState<string>("#0C0D12");
  const [isTransparent, setIsTransparent] = useState<boolean>(false);
  const [fgInputText, setFgInputText] = useState<string>("#FE540B");
  const [bgInputText, setBgInputText] = useState<string>("#0C0D12");
  const [fgPickerOpen, setFgPickerOpen] = useState<boolean>(false);
  const [bgPickerOpen, setBgPickerOpen] = useState<boolean>(false);

  // Logotipo
  const [logoMode, setLogoMode] = useState<"none" | "official" | "custom">("official");
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const [logoSizePercent, setLogoSizePercent] = useState<number>(22);
  const [logoShape, setLogoShape] = useState<"circle" | "square">("circle");

  // Downloads
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Atalho da Minha Bio
  const bioUrl = `https://carddigitalgm.com/bio/${tenantId || "sua-bio"}`;

  // Sincroniza inputs de texto HEX quando estado muda
  useEffect(() => {
    setFgInputText(fgColor.toUpperCase());
  }, [fgColor]);

  useEffect(() => {
    setBgInputText(bgColor.toUpperCase());
  }, [bgColor]);

  // Cálculo Dinâmico de Contraste e Legibilidade
  const contrastRatio = useMemo(() => {
    return getContrastRatio(fgColor, isTransparent ? "transparent" : bgColor);
  }, [fgColor, bgColor, isTransparent]);

  const contrastStatus = useMemo(() => {
    if (contrastRatio >= 4.5) return "optimal";
    if (contrastRatio >= 3.0) return "acceptable";
    return "warning";
  }, [contrastRatio]);

  // Efeito para encurtar link inteligente quando o link muda
  useEffect(() => {
    let isCancelled = false;
    const trimmed = inputUrl.trim();

    if (!trimmed) {
      setActiveUrl("https://carddigitalgm.com");
      setShortenedUrl(null);
      return;
    }

    if (autoShorten && trimmed.length > 35 && (trimmed.startsWith("http://") || trimmed.startsWith("https://"))) {
      setShortening(true);
      const timer = setTimeout(async () => {
        const res = await shortenUrlSmart(trimmed);
        if (!isCancelled) {
          setShortening(false);
          if (res.reduced && res.shortUrl !== trimmed) {
            setShortenedUrl(res.shortUrl);
            setActiveUrl(res.shortUrl);
          } else {
            setShortenedUrl(null);
            setActiveUrl(trimmed);
          }
        }
      }, 500);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
      };
    } else {
      setShortenedUrl(null);
      setActiveUrl(trimmed);
      setShortening(false);
    }
  }, [inputUrl, autoShorten]);

  // Logotipo selecionado atual
  const effectiveLogoUrl =
    logoMode === "none"
      ? null
      : logoMode === "official"
      ? OFFICIAL_GM_LOGO
      : customLogoUrl;

  // Atualiza renderização no Canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const effectiveBg = isTransparent ? "transparent" : bgColor;

    renderQrToCanvas(canvasRef.current, {
      text: activeUrl || "https://carddigitalgm.com",
      fgColor,
      bgColor: effectiveBg,
      moduleShape,
      eyeShape,
      logoUrl: effectiveLogoUrl,
      logoSizePercent,
      logoShape,
      size: 1024,
      margin: 3,
    });
  }, [
    activeUrl,
    fgColor,
    bgColor,
    isTransparent,
    moduleShape,
    eyeShape,
    effectiveLogoUrl,
    logoSizePercent,
    logoShape,
  ]);

  // Upload de Logotipo Personalizado
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      pushToast({
        title: "Arquivo muito grande",
        message: "O logotipo deve ter no máximo 5MB.",
        type: "error",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setCustomLogoUrl(event.target.result);
        setLogoMode("custom");
        playUiSound("toggle_on");
        pushToast({
          title: "Logotipo Carregado!",
          message: "Seu logotipo foi aplicado com proteção central no QR Code.",
          type: "success",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Matriz atual para cálculo de densidade
  const { size: moduleCount } = getQrMatrix(activeUrl, effectiveLogoUrl ? "H" : "M");
  const rawMatrix = getQrMatrix(inputUrl, effectiveLogoUrl ? "H" : "M");
  const moduleSavings = rawMatrix.size > moduleCount ? rawMatrix.size - moduleCount : 0;

  // Inverter Cores com 1 Clique
  const handleInvertColors = () => {
    playUiSound("tab");
    if (isTransparent) {
      setIsTransparent(false);
      setBgColor(fgColor);
      setFgColor("#FFFFFF");
    } else {
      const prevFg = fgColor;
      const prevBg = bgColor;
      setFgColor(prevBg);
      setBgColor(prevFg);
    }
    pushToast({
      title: "Cores Invertidas",
      message: "A cor do QR Code e a cor do fundo foram invertidas.",
      type: "info",
    });
  };

  // Otimização Automática de Contraste Inteligente (Garante funcionalidade 100%)
  const handleAutoOptimizeContrast = () => {
    playUiSound("success");
    setIsTransparent(false);
    const lum = getLuminance(fgColor);
    if (lum > 0.4) {
      // Cor clara -> Fundo Dark para contraste máximo
      setBgColor("#0C0D12");
    } else {
      // Cor escura -> Fundo Branco para contraste máximo
      setBgColor("#FFFFFF");
    }
    pushToast({
      title: "Contraste Otimizado!",
      message: "O fundo foi ajustado para garantir leitura instantânea por qualquer câmera.",
      type: "success",
    });
  };

  // Validador e aplicador de HEX manual
  const handleFgHexChange = (val: string) => {
    setFgInputText(val);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      setFgColor(val);
    }
  };

  const handleBgHexChange = (val: string) => {
    setBgInputText(val);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      setBgColor(val);
      setIsTransparent(false);
    }
  };

  // Função centralizada para disparar downloads
  const handleDownload = async (format: "pdf" | "eps" | "svg" | "png" | "jpg") => {
    try {
      setDownloadingFormat(format);
      playUiSound("toggle_on");
      const effectiveBg = isTransparent ? "transparent" : bgColor;
      const opts: QrCodeOptions = {
        text: activeUrl || "https://carddigitalgm.com",
        fgColor,
        bgColor: effectiveBg,
        moduleShape,
        eyeShape,
        logoUrl: effectiveLogoUrl,
        logoSizePercent,
        logoShape,
        margin: 3,
      };

      const baseName = `qrcode-carddigital-${Date.now()}`;

      if (format === "png") {
        await downloadQrAsPng(opts, `${baseName}.png`);
      } else if (format === "jpg") {
        await downloadQrAsJpg(opts, `${baseName}.jpg`);
      } else if (format === "svg") {
        downloadQrAsSvg(opts, `${baseName}.svg`);
      } else if (format === "eps") {
        downloadQrAsEps(opts, `${baseName}.eps`);
      } else if (format === "pdf") {
        await downloadQrAsPdf(opts, `${baseName}.pdf`);
      }

      pushToast({
        title: `Download ${format.toUpperCase()} Concluído!`,
        message: `O arquivo vetorial/imagem em formato ${format.toUpperCase()} foi gerado com sucesso.`,
        type: "success",
      });
    } catch (err) {
      console.error(err);
      pushToast({
        title: "Erro ao exportar",
        message: "Não foi possível gerar o arquivo selecionado.",
        type: "error",
      });
    } finally {
      setTimeout(() => setDownloadingFormat(null), 800);
    }
  };

  return (
    <div className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-7 md:p-8 space-y-6 sm:space-y-7 w-full border border-white/10 bg-white/[0.03] backdrop-blur-xl animate-in fade-in duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_8px_32px_0_rgba(0,0,0,0.25)]">
      {/* Barra de Cabeçalho / Título da Seção */}
      <div className="py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2 rounded-2xl px-4 sm:px-6 border border-white/10 bg-black/60 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--gm-primary)]/20 border border-[var(--gm-primary)]/40 flex items-center justify-center text-[var(--gm-primary)] shadow-[0_0_15px_rgba(254,84,11,0.25)] shrink-0">
            <QrCode className="w-5 h-5 text-[var(--gm-primary)]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>GERADOR DE QR CODE INTELIGENTE</span>
              <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30 normal-case hidden sm:inline-block">
                HD & Vetorial
              </span>
            </h3>
            <p className="text-xs text-slate-300 font-medium">
              Gere QR Codes a partir de qualquer link, com encurtamento inteligente, formatos modernos, cores inteligentes de alta legibilidade, logo central e exportação em 5 formatos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-3 py-1 rounded-full border border-[var(--gm-primary)]/20 whitespace-nowrap">
            PDF • EPS • SVG • PNG • JPG
          </span>
        </div>
      </div>

      {/* BLOCO SUPERIOR: CONFIGURAÇÕES E PRÉVIA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: Link, Formatos e Cores Inteligentes (7 colunas) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* 1. CAMPO DE LINK COM ENCURTADOR INTELIGENTE */}
          <div className="p-4 sm:p-5 rounded-2xl bg-black/50 border border-white/10 flex flex-col gap-3 shadow-inner">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <LinkIcon size={14} className="text-[var(--gm-primary)]" />
                <span>Link de Destino do QR Code</span>
              </label>

              {/* Botão de Encurtamento Inteligente */}
              <button
                type="button"
                onClick={() => setAutoShorten((prev) => !prev)}
                className={`text-[11px] font-black px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                  autoShorten
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                    : "bg-white/5 border-white/15 text-slate-400 hover:text-white"
                }`}
                title="Quando ativado, encurta links longos para reduzir o número de quadradinhos do QR Code"
              >
                <Zap size={12} className={autoShorten ? "text-emerald-400 animate-pulse" : "text-slate-400"} />
                <span>Encurtar Link (Menos Quadradinhos): {autoShorten ? "ATIVADO" : "DESATIVADO"}</span>
              </button>
            </div>

            {/* Input Principal do Link */}
            <div className="relative">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://seusite.com, link do WhatsApp ou bio..."
                className="w-full h-12 pl-4 pr-10 rounded-xl bg-black/70 border border-white/20 text-white font-mono text-xs sm:text-sm outline-none focus:border-[var(--gm-primary)] transition-all placeholder:text-slate-500"
              />
              {inputUrl && (
                <button
                  type="button"
                  onClick={() => setInputUrl("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-1"
                  title="Limpar link"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Atalhos Rápidos com 1 clique */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Inserir rápido:</span>
              <button
                type="button"
                onClick={() => setInputUrl(bioUrl)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
              >
                <Smartphone size={11} className="text-[var(--gm-primary)]" />
                <span>Minha Bio / Portfólio</span>
              </button>

              <button
                type="button"
                onClick={() => setInputUrl("https://wa.me/5598999999999?text=Ol%C3%A1%2C%20gostaria%20de%20um%20or%C3%A7amento")}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
              >
                <span>WhatsApp com Mensagem</span>
              </button>

              <button
                type="button"
                onClick={() => setInputUrl("https://carddigitalgm.com/planos")}
                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Página de Planos</span>
              </button>
            </div>

            {/* Card Informativo de Otimização Inteligente */}
            {shortening ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-amber-400" />
                <span>Otimizando e encurtando link para reduzir quadradinhos...</span>
              </div>
            ) : shortenedUrl ? (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-white text-xs flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={13} />
                    <span>Link Otimizado com Sucesso!</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md">
                    {inputUrl.length} carac. → {shortenedUrl.length} carac.
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/10">
                  <span className="font-mono text-xs text-slate-200 truncate flex-1">{shortenedUrl}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(shortenedUrl);
                      pushToast({ title: "Copiado!", message: "Link encurtado copiado para a área de transferência.", type: "success" });
                    }}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/20 cursor-pointer"
                  >
                    Copiar
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  {moduleSavings > 0 ? `Economia de ${moduleSavings} linhas/colunas de módulos. O QR Code ficou mais limpo, nítido e fácil de ler!` : "Módulos reduzidos para leitura instantânea."}
                </p>
              </div>
            ) : null}
          </div>

          {/* 2. FORMATOS VISUAIS DOS MÓDULOS E CANTOS */}
          <div className="p-4 sm:p-5 rounded-2xl bg-black/50 border border-white/10 flex flex-col gap-4 shadow-inner">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Sliders size={14} className="text-[var(--gm-primary)]" />
              <span>Formatos e Estilos dos Módulos</span>
            </span>

            {/* Módulos de Dados */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-slate-400 font-semibold">Formato dos Pontos (Quadradinhos):</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "rounded", label: "Arredondado", desc: "Suave e Moderno" },
                  { id: "dots", label: "Pontos (Dots)", desc: "Círculos Fluidos" },
                  { id: "square", label: "Clássico", desc: "Quadrados Retos" },
                  { id: "fluid", label: "Fluido", desc: "Módulos Conectados" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setModuleShape(item.id as QrModuleShape)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
                      moduleShape === item.id
                        ? "bg-[var(--gm-primary)]/20 border-[var(--gm-primary)] text-white shadow-[0_0_12px_rgba(254,84,11,0.25)]"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span className="text-xs font-black">{item.label}</span>
                    <span className="text-[10px] text-slate-400 font-medium leading-none">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Olhos de Detecção dos Cantos */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
              <span className="text-[11px] text-slate-400 font-semibold">Formato dos Cantos (Olhos de Leitura):</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "rounded", label: "Squircle", desc: "Cantos Curvos" },
                  { id: "circle", label: "Circular", desc: "Anéis Concéntricos" },
                  { id: "square", label: "Quadrado", desc: "Clássico Industrial" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setEyeShape(item.id as QrEyeShape)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
                      eyeShape === item.id
                        ? "bg-[var(--gm-primary)]/20 border-[var(--gm-primary)] text-white shadow-[0_0_12px_rgba(254,84,11,0.25)]"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span className="text-xs font-black">{item.label}</span>
                    <span className="text-[10px] text-slate-400 font-medium leading-none">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. SISTEMA DE CORES INTELIGENTE (ALTO CONTRASTE & LEITURA FUNCIONAL) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-black/50 border border-white/10 flex flex-col gap-4 shadow-inner">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Palette size={14} className="text-[var(--gm-primary)]" />
                <span>Opções de Cores Inteligentes (Alta Legibilidade)</span>
              </span>

              {/* Botões de Ações Rápidas de Cor */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInvertColors}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Trocar a cor do QR Code com a cor do fundo"
                >
                  <ArrowLeftRight size={12} className="text-amber-400" />
                  <span>Inverter Cores</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoOptimizeContrast}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="Ajusta automaticamente o melhor contraste para que o QR Code seja 100% legível por câmeras"
                >
                  <Wand2 size={12} className="text-amber-300" />
                  <span>Auto-Ajustar Contraste</span>
                </button>
              </div>
            </div>

            {/* Banner Validador de Contraste e Legibilidade Funcional */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                contrastStatus === "optimal"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : contrastStatus === "acceptable"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-rose-500/15 border-rose-500/40 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {contrastStatus === "optimal" ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                ) : contrastStatus === "acceptable" ? (
                  <Info size={16} className="text-amber-400 shrink-0" />
                ) : (
                  <AlertTriangle size={16} className="text-rose-400 shrink-0 animate-bounce" />
                )}

                <div className="flex flex-col">
                  <span className="text-xs font-black">
                    {contrastStatus === "optimal"
                      ? "Contraste Excelente (Leitura 100% Funcional)"
                      : contrastStatus === "acceptable"
                      ? "Contraste Moderado (Funcional na tela)"
                      : "Alerta: Baixo Contraste (Risco de Falha na Leitura)"}
                  </span>
                  <span className="text-[10px] text-slate-300">
                    {contrastStatus === "optimal"
                      ? `Taxa de contraste ${contrastRatio.toFixed(1)}:1 — Qualquer câmera e scanner lerá instantaneamente.`
                      : contrastStatus === "acceptable"
                      ? `Taxa de contraste ${contrastRatio.toFixed(1)}:1 — Para impressão em papel, sugerimos aumentar o contraste.`
                      : `Taxa de contraste ${contrastRatio.toFixed(1)}:1 é baixa! Clique em "Auto-Ajustar Contraste" para corrigir.`}
                  </span>
                </div>
              </div>

              {contrastStatus === "warning" && (
                <button
                  type="button"
                  onClick={handleAutoOptimizeContrast}
                  className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-black shrink-0 cursor-pointer shadow-sm"
                >
                  Corrigir Agora
                </button>
              )}
            </div>

            {/* CONFIGURAÇÕES DE CORES EVIDENTES (QR CODE E FUNDO) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 items-stretch">
              {/* 1. CONFIGURAÇÃO EVIDENTE: COR DO QR CODE */}
              <div className="flex flex-col h-full">
                <EmbeddedAdobeColorPicker
                  color={fgColor}
                  onChange={(newHex) => {
                    setFgColor(newHex);
                    setFgInputText(newHex);
                  }}
                  title="Cor do QR Code"
                  subtitle="Módulos & Olhos"
                  companionColor={isTransparent ? "#334155" : bgColor}
                  swatches={FG_COLORS}
                  defaultTab="cor"
                />
              </div>

              {/* 2. CONFIGURAÇÃO EVIDENTE: COR DO FUNDO */}
              <div className="flex flex-col h-full">
                <EmbeddedAdobeColorPicker
                  color={isTransparent ? "transparent" : bgColor}
                  onChange={(newHex) => {
                    setBgColor(newHex);
                    setBgInputText(newHex);
                    setIsTransparent(false);
                  }}
                  title="Cor do Fundo"
                  subtitle="Área de Respiro"
                  companionColor={fgColor}
                  allowTransparent={true}
                  isTransparent={isTransparent}
                  onToggleTransparent={(transparent) => {
                    setIsTransparent(transparent);
                  }}
                  swatches={BG_COLORS}
                  defaultTab="cor"
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: Pré-visualização Ao Vivo em Alta Resolução (5 colunas) */}
        <div className="lg:col-span-5 flex flex-col gap-5 sticky top-20">
          <div className="p-5 sm:p-6 rounded-3xl bg-black/70 border border-white/15 flex flex-col items-center justify-center gap-4 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Eye size={14} className="text-[var(--gm-primary)]" />
                <span>Prévia do QR Code</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {moduleCount}x{moduleCount} módulos • Nível H (30%)
              </span>
            </div>

            {/* Canvas do QR Code em Alta Resolução */}
            <div
              className={`p-3 rounded-2xl border flex items-center justify-center transition-all shadow-xl ${
                isTransparent
                  ? "bg-[radial-gradient(#ffffff22_1px,transparent_1px)] [background-size:12px_12px] bg-black/40 border-dashed border-white/25"
                  : "bg-black/60 border-white/20"
              }`}
            >
              <canvas
                ref={canvasRef}
                className="w-64 h-64 sm:w-72 sm:h-72 object-contain rounded-xl drop-shadow-md"
              />
            </div>

            {/* Resumo do Destino */}
            <div className="w-full text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Destino do Link:</span>
              <p className="text-xs font-mono text-[var(--gm-primary)] truncate max-w-full font-bold">
                {activeUrl}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO INFERIOR: MODAL LOGOTIPO E MODAL BAIXAR QR CODE (PERFEITAMENTE ALINHADOS 50/50) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch w-full pt-1">
        {/* MODAL 1: LOGOTIPO NO CENTRO DO QR CODE (Perfeitamente alinhado em altura e largura com o modal de download) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-black/50 border border-white/10 flex flex-col justify-between gap-4 shadow-inner h-full">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <ImageIcon size={14} className="text-[var(--gm-primary)]" />
                <span>Logotipo no Centro do QR Code</span>
              </span>
              <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                Proteção Central Nível H
              </span>
            </div>

            <p className="text-xs text-slate-400 font-medium">
              Insira o logotipo oficial ou a sua marca própria no centro do QR Code sem comprometer a leitura.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Opção 1: Sem Logo */}
              <button
                type="button"
                onClick={() => setLogoMode("none")}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                  logoMode === "none"
                    ? "bg-[var(--gm-primary)]/20 border-[var(--gm-primary)] text-white shadow-sm ring-1 ring-[var(--gm-primary)]"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <span className="text-xs font-black">Sem Logotipo</span>
                <span className="text-[10px] text-slate-400">QR Code Limpo</span>
              </button>

              {/* Opção 2: Logo Oficial GM */}
              <button
                type="button"
                onClick={() => setLogoMode("official")}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                  logoMode === "official"
                    ? "bg-[var(--gm-primary)]/20 border-[var(--gm-primary)] text-white shadow-sm ring-1 ring-[var(--gm-primary)]"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <div className="w-5 h-5 rounded-md bg-black border border-white/20 overflow-hidden flex items-center justify-center">
                  <img src={OFFICIAL_GM_LOGO} alt="GM" className="w-4 h-4 object-contain" />
                </div>
                <span className="text-xs font-black">Logo CardDigital GM</span>
                <span className="text-[10px] text-slate-400">Oficial do Sistema</span>
              </button>

              {/* Opção 3: Upload do Meu Logo */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                  logoMode === "custom"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm ring-1 ring-emerald-500"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Upload size={16} className="text-emerald-400" />
                <span className="text-xs font-black">
                  {customLogoUrl ? "Alterar Logo" : "Upload do Meu Logo"}
                </span>
                <span className="text-[10px] text-slate-400">PNG, JPG ou SVG</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Ajustes Finos do Logotipo (Tamanho e Moldura) */}
          {logoMode !== "none" ? (
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-white/10 flex-wrap mt-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold">Tamanho do Logo:</span>
                {[
                  { label: "P", val: 18 },
                  { label: "M", val: 22 },
                  { label: "G", val: 26 },
                  { label: "GG", val: 30 },
                ].map((s) => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => setLogoSizePercent(s.val)}
                    className={`w-7 h-7 rounded-lg text-xs font-black border cursor-pointer ${
                      logoSizePercent === s.val
                        ? "bg-[var(--gm-primary)] border-[var(--gm-primary)] text-white shadow-sm"
                        : "bg-white/5 border-white/15 text-slate-400 hover:text-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold">Moldura:</span>
                <button
                  type="button"
                  onClick={() => setLogoShape("circle")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black border cursor-pointer ${
                    logoShape === "circle"
                      ? "bg-[var(--gm-primary)] border-[var(--gm-primary)] text-white shadow-sm"
                      : "bg-white/5 border-white/15 text-slate-400 hover:text-white"
                  }`}
                >
                  Circular
                </button>
                <button
                  type="button"
                  onClick={() => setLogoShape("square")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black border cursor-pointer ${
                    logoShape === "square"
                      ? "bg-[var(--gm-primary)] border-[var(--gm-primary)] text-white shadow-sm"
                      : "bg-white/5 border-white/15 text-slate-400 hover:text-white"
                  }`}
                >
                  Quadrada
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>Nenhum logotipo inserido no momento. O QR Code gerado será 100% puro e minimalista.</span>
            </div>
          )}
        </div>

        {/* MODAL 2: BAIXAR QR CODE (5 FORMATOS) (Alinhamento simétrico 50/50 com o modal Logotipo) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-[var(--gm-primary)]/40 flex flex-col justify-between gap-4 shadow-[0_0_20px_rgba(254,84,11,0.12)] h-full">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Download size={14} className="text-[var(--gm-primary)]" />
                <span>Baixar QR Code (5 Formatos)</span>
              </span>
              <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                Resolução 2048px / Vetorial
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
              Escolha o formato ideal para impressão em gráficas, aplicação em artes, cartões de visita ou envio digital:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* 1. PDF */}
              <button
                type="button"
                onClick={() => handleDownload("pdf")}
                disabled={Boolean(downloadingFormat)}
                className="h-11 px-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:brightness-110 text-white font-extrabold text-xs flex items-center justify-between shadow-md active:scale-95 transition-all cursor-pointer border border-rose-400/30"
                title="Documento PDF A4 pronto para impressão de alta qualidade"
              >
                <div className="flex items-center gap-2">
                  <FileText size={16} />
                  <span>Baixar PDF</span>
                </div>
                <span className="text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded">.PDF</span>
              </button>

              {/* 2. EPS */}
              <button
                type="button"
                onClick={() => handleDownload("eps")}
                disabled={Boolean(downloadingFormat)}
                className="h-11 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-white font-extrabold text-xs flex items-center justify-between shadow-md active:scale-95 transition-all cursor-pointer border border-amber-400/30"
                title="Formato PostScript Vetorial EPSF-3.0 profissional para Illustrator, Corel e Gráficas"
              >
                <div className="flex items-center gap-2">
                  <FileCode size={16} />
                  <span>Baixar EPS</span>
                </div>
                <span className="text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded">.EPS</span>
              </button>

              {/* 3. SVG */}
              <button
                type="button"
                onClick={() => handleDownload("svg")}
                disabled={Boolean(downloadingFormat)}
                className="h-11 px-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-700 hover:brightness-110 text-white font-extrabold text-xs flex items-center justify-between shadow-md active:scale-95 transition-all cursor-pointer border border-purple-400/30"
                title="Vetor puro SVG escalável infinitamente sem perda de resolução"
              >
                <div className="flex items-center gap-2">
                  <CodeIcon size={16} />
                  <span>Baixar SVG</span>
                </div>
                <span className="text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded">.SVG</span>
              </button>

              {/* 4. PNG */}
              <button
                type="button"
                onClick={() => handleDownload("png")}
                disabled={Boolean(downloadingFormat)}
                className="h-11 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 text-white font-extrabold text-xs flex items-center justify-between shadow-md active:scale-95 transition-all cursor-pointer border border-emerald-400/30"
                title="Imagem PNG em ultra-alta resolução 2048x2048 com suporte a transparência"
              >
                <div className="flex items-center gap-2">
                  <ImageIcon size={16} />
                  <span>Baixar PNG</span>
                </div>
                <span className="text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded">.PNG</span>
              </button>
            </div>
          </div>

          {/* 5. JPG (Largura total com destaque) */}
          <div className="pt-2 border-t border-white/10 mt-2">
            <button
              type="button"
              onClick={() => handleDownload("jpg")}
              disabled={Boolean(downloadingFormat)}
              className="w-full h-11 px-4 rounded-xl bg-[#14161f] hover:bg-[#1c1f2b] text-white border border-white/20 font-extrabold text-xs flex items-center justify-between active:scale-95 transition-all cursor-pointer shadow-sm hover:border-[var(--gm-primary)]/50"
              title="Imagem JPG de alta qualidade para redes sociais, cartões e envio rápido"
            >
              <div className="flex items-center gap-2">
                <FileImage size={16} className="text-[var(--gm-primary)]" />
                <span>Baixar Imagem JPG (Alta Qualidade)</span>
              </div>
              <span className="text-[10px] font-mono bg-black/40 px-2 py-0.5 rounded text-slate-300">.JPG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function FileImage({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <circle cx="10" cy="13" r="2" />
      <path d="m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 21" />
    </svg>
  );
}
