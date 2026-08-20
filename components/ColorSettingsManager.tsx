import React, { useState } from "react";
import { 
  Type,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Sliders,
  Check,
  Building2,
  Users,
  Palette,
  Layers,
  ArrowRight,
  Edit3
} from "lucide-react";
import { hexToRgb, getContrastColor } from "../lib/settings";
import { ColorSpectrumModal } from "./ui/ColorSpectrumModal";

export interface ColorSettingsManagerProps {
  // App Body Colors
  brandPrimary: string;
  setBrandPrimary: (v: string) => void;
  brandBg: string;
  setBrandBg: (v: string) => void;
  brandTitle: string;
  setBrandTitle: (v: string) => void;
  brandSubtitle: string;
  setBrandSubtitle: (v: string) => void;
  brandIcon: string;
  setBrandIcon: (v: string) => void;
  brandAccent: string;
  setBrandAccent: (v: string) => void;

  // Sidebar Menu Colors
  menuPrimary: string;
  setMenuPrimary: (v: string) => void;
  menuBg: string;
  setMenuBg: (v: string) => void;
  menuTitle: string;
  setMenuTitle: (v: string) => void;
  menuSubtitle: string;
  setMenuSubtitle: (v: string) => void;
  menuIcon: string;
  setMenuIcon: (v: string) => void;
  menuButton: string;
  setMenuButton: (v: string) => void;

  // Font
  fontFamily: string;
  setFontFamily: (v: string) => void;
  setPreviewFont: (v: string | null) => void;

  // Helper
  updateDomColor: (cssVar: string, value: string) => void;
}

// 10 TEMAS PRONTOS E HARMONIZADOS PARA TODO O APLICATIVO (1-CLIQUE)
export const PRESET_THEMES = [
  {
    id: "orange",
    name: "Laranja CardDigital",
    badge: "Oficial",
    desc: "Laranja oficial de alto impacto com superfícies grafite e contraste industrial.",
    primary: "#FE540B",
    accent: "#FF7A38",
    bg: "#0B0B0C",
    title: "#FFFFFF",
    subtitle: "#8B8B92",
    icon: "#FE540B",
    menuBg: "#131315",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#8B8B92",
    menuIcon: "#FE540B",
  },
  {
    id: "emerald",
    name: "Verde Esmeralda Pro",
    badge: "Finanças",
    desc: "Esmeralda vivo, fundo dark floresta e acentos menta de alta precisão.",
    primary: "#10B981",
    accent: "#34D399",
    bg: "#08100C",
    title: "#FFFFFF",
    subtitle: "#94A3B8",
    icon: "#10B981",
    menuBg: "#0D1912",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#6EE7B7",
    menuIcon: "#10B981",
  },
  {
    id: "cyan",
    name: "Azul Elétrico Neon",
    badge: "Tech",
    desc: "Ciano tecnológico, fundo dark oceano e detalhes em azul elétrico futurista.",
    primary: "#06B6D4",
    accent: "#38BDF8",
    bg: "#060D18",
    title: "#FFFFFF",
    subtitle: "#94A3B8",
    icon: "#06B6D4",
    menuBg: "#0A1524",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#7DD3FC",
    menuIcon: "#06B6D4",
  },
  {
    id: "purple",
    name: "Roxo Cyberpunk",
    badge: "Design",
    desc: "Violeta intenso neon, superfícies cósmicas e alto contraste criativo.",
    primary: "#8B5CF6",
    accent: "#A855F7",
    bg: "#0A0618",
    title: "#FFFFFF",
    subtitle: "#A78BFA",
    icon: "#8B5CF6",
    menuBg: "#120A24",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#C4B5FD",
    menuIcon: "#8B5CF6",
  },
  {
    id: "gold",
    name: "Ouro Executivo / Âmbar",
    badge: "Premium",
    desc: "Dourado nobre âmbar com fundo escuro quente e acabamento luxuoso.",
    primary: "#F59E0B",
    accent: "#FBBF24",
    bg: "#0C0A06",
    title: "#FFFFFF",
    subtitle: "#A8A29E",
    icon: "#F59E0B",
    menuBg: "#171309",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#FDE68A",
    menuIcon: "#F59E0B",
  },
  {
    id: "crimson",
    name: "Vermelho Carmim / Rubi",
    badge: "Energia",
    desc: "Vermelho carmim vibrante com alto impacto visual e elegância refinada.",
    primary: "#E11D48",
    accent: "#FB7185",
    bg: "#0F060A",
    title: "#FFFFFF",
    subtitle: "#FDA4AF",
    icon: "#E11D48",
    menuBg: "#1A0A12",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#FECDD3",
    menuIcon: "#E11D48",
  },
  {
    id: "sapphire",
    name: "Azul Real / Safira",
    badge: "Corporativo",
    desc: "Azul Safira corporativo moderno com presença sólida e confiável.",
    primary: "#2563EB",
    accent: "#60A5FA",
    bg: "#060A14",
    title: "#FFFFFF",
    subtitle: "#93C5FD",
    icon: "#2563EB",
    menuBg: "#0C1220",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#BFDBFE",
    menuIcon: "#2563EB",
  },
  {
    id: "magenta",
    name: "Rosa Choque / Magenta",
    badge: "Criativo",
    desc: "Magenta neon moderno para marcas inovadoras, dinâmicas e contemporâneas.",
    primary: "#D946EF",
    accent: "#F472B6",
    bg: "#0E0512",
    title: "#FFFFFF",
    subtitle: "#F0ABFC",
    icon: "#D946EF",
    menuBg: "#180920",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#F5D0FE",
    menuIcon: "#D946EF",
  },
  {
    id: "lime",
    name: "Verde Lima / Volt",
    badge: "Performance",
    desc: "Verde lima energético de alto contraste para máxima visibilidade e agilidade.",
    primary: "#84CC16",
    accent: "#A3E635",
    bg: "#0A0E05",
    title: "#FFFFFF",
    subtitle: "#BEF264",
    icon: "#84CC16",
    menuBg: "#121808",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#D9F99D",
    menuIcon: "#84CC16",
  },
  {
    id: "titanium",
    name: "Titânio / Monocromo Pro",
    badge: "Minimalista",
    desc: "Titânio e grafite neutro para visual ultra clean, técnico e sofisticado.",
    primary: "#94A3B8",
    accent: "#CBD5E1",
    bg: "#0B0F19",
    title: "#FFFFFF",
    subtitle: "#64748B",
    icon: "#94A3B8",
    menuBg: "#131B2E",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#94A3B8",
    menuIcon: "#94A3B8",
  },
];

// VALORES PADRÃO DO TEMA OFICIAL LARANJA
export const DEFAULT_ORANGE_DARK = {
  primary: "#FE540B",
  accent: "#FF7A38",
  bg: "#0B0B0C",
  title: "#FFFFFF",
  subtitle: "#8B8B92",
  icon: "#FE540B",
  button: "#FE540B",
  menu_primary: "#FE540B",
  menu_bg: "#131315",
  menu_title: "#FFFFFF",
  menu_subtitle: "#8B8B92",
  menu_icon: "#FE540B",
  menu_button: "#FE540B",
};

export const ColorSettingsManager: React.FC<ColorSettingsManagerProps> = ({
  brandPrimary,
  setBrandPrimary,
  brandBg,
  setBrandBg,
  brandTitle,
  setBrandTitle,
  brandSubtitle,
  setBrandSubtitle,
  brandIcon,
  setBrandIcon,
  brandAccent,
  setBrandAccent,
  menuPrimary,
  setMenuPrimary,
  menuBg,
  setMenuBg,
  menuTitle,
  setMenuTitle,
  menuSubtitle,
  setMenuSubtitle,
  menuIcon,
  setMenuIcon,
  menuButton,
  setMenuButton,
  fontFamily,
  setFontFamily,
  setPreviewFont,
  updateDomColor
}) => {
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  // Estado reativo do ID do tema selecionado (atualiza a UI instantaneamente ao clicar)
  const [activeThemeId, setActiveThemeId] = useState<string>(() => {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("gm_selected_theme_id");
      if (stored) return stored;
      // Tenta inferir pelo brandPrimary
      const match = PRESET_THEMES.find(t => t.primary.toLowerCase() === brandPrimary?.toLowerCase());
      if (match) return match.id;
    }
    return "orange";
  });

  // Estado do Modal de Ajuste com Barra de Espectro
  const [spectrumModal, setSpectrumModal] = useState<{
    isOpen: boolean;
    initialColor: string;
    title: string;
    subtitle: string;
    themeId?: string;
    field?: string;
  }>({
    isOpen: false,
    initialColor: "#FF7B17",
    title: "Ajustar Matiz",
    subtitle: "Arraste a barra de espectro para alterar a matiz em tempo real.",
  });

  // Função auxiliar de aplicação imediata direta no DOM de todas as variáveis
  const applyAllCssVariables = (colors: {
    primary: string;
    accent: string;
    bg: string;
    title: string;
    subtitle: string;
    icon: string;
    button: string;
    menu_primary: string;
    menu_bg: string;
    menu_title: string;
    menu_subtitle: string;
    menu_icon: string;
    menu_button: string;
  }) => {
    const root = document.documentElement;

    const setVar = (name: string, val: string) => {
      root.style.setProperty(name, val);
      root.style.setProperty(name, val, "important");
    };

    setVar("--gm-primary", colors.primary);
    setVar("--primary", colors.primary);
    setVar("--brand-primary", colors.primary);
    
    const rgbPrimary = hexToRgb(colors.primary);
    if (rgbPrimary) {
      setVar("--gm-primary-rgb", `${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}`);
    }
    setVar("--gm-primary-foreground", getContrastColor(colors.primary));

    setVar("--gm-accent", colors.accent);
    setVar("--brand-accent", colors.accent);
    const rgbAccent = hexToRgb(colors.accent);
    if (rgbAccent) {
      setVar("--gm-accent-rgb", `${rgbAccent.r}, ${rgbAccent.g}, ${rgbAccent.b}`);
    }

    setVar("--gm-bg", colors.bg);
    setVar("--bg", colors.bg);
    setVar("--brand-bg", colors.bg);

    setVar("--gm-title", colors.title);
    setVar("--text", colors.title);
    setVar("--gm-subtitle", colors.subtitle);
    setVar("--text-secondary", colors.subtitle);

    setVar("--gm-icon", colors.icon);
    setVar("--gm-button", colors.button);

    setVar("--gm-menu-primary", colors.menu_primary);
    setVar("--gm-menu-bg", colors.menu_bg);
    setVar("--gm-menu-title", colors.menu_title);
    setVar("--gm-menu-subtitle", colors.menu_subtitle);
    setVar("--gm-menu-icon", colors.menu_icon);
    setVar("--gm-menu-button", colors.menu_button);

    setVar("--gm-btn-bg", colors.primary);
    setVar("--gm-btn-border", colors.primary);
    setVar("--gm-btn-icon", colors.primary);

    // Atualiza a meta tag do navegador móvel
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", colors.primary);
    }
  };

  // Reseta todas as cores para o Padrão Tema Laranja Oficial (modo prévia)
  const resetToDefaultOrange = () => {
    setActiveThemeId("orange");

    setBrandPrimary(DEFAULT_ORANGE_DARK.primary);
    setBrandBg(DEFAULT_ORANGE_DARK.bg);
    setBrandTitle(DEFAULT_ORANGE_DARK.title);
    setBrandSubtitle(DEFAULT_ORANGE_DARK.subtitle);
    setBrandIcon(DEFAULT_ORANGE_DARK.icon);
    setBrandAccent(DEFAULT_ORANGE_DARK.accent);

    setMenuPrimary(DEFAULT_ORANGE_DARK.menu_primary);
    setMenuBg(DEFAULT_ORANGE_DARK.menu_bg);
    setMenuTitle(DEFAULT_ORANGE_DARK.menu_title);
    setMenuSubtitle(DEFAULT_ORANGE_DARK.menu_subtitle);
    setMenuIcon(DEFAULT_ORANGE_DARK.menu_icon);
    setMenuButton(DEFAULT_ORANGE_DARK.menu_button);

    // Aplica no DOM em tempo real (prévia instantânea)
    applyAllCssVariables(DEFAULT_ORANGE_DARK);

    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  // Aplica um tema pré-definido em tempo real como PRÉVIA (sem persistir até clicar em Salvar)
  const applyPresetTheme = (preset: typeof PRESET_THEMES[0]) => {
    // 1. Atualiza estado reativo do botão ativo imediatamente
    setActiveThemeId(preset.id);

    // 2. Atualiza os estados React locais
    setBrandPrimary(preset.primary);
    setBrandBg(preset.bg);
    setBrandTitle(preset.title);
    setBrandSubtitle(preset.subtitle);
    setBrandIcon(preset.icon);
    setBrandAccent(preset.accent);

    setMenuPrimary(preset.primary);
    setMenuBg(preset.menuBg);
    setMenuTitle(preset.menuTitle);
    setMenuSubtitle(preset.menuSubtitle);
    setMenuIcon(preset.menuIcon);
    setMenuButton(preset.primary);

    const currentConfig = {
      primary: preset.primary,
      accent: preset.accent,
      bg: preset.bg,
      title: preset.title,
      subtitle: preset.subtitle,
      icon: preset.icon,
      button: preset.primary,
      menu_primary: preset.primary,
      menu_bg: preset.menuBg,
      menu_title: preset.menuTitle,
      menu_subtitle: preset.menuSubtitle,
      menu_icon: preset.menuIcon,
      menu_button: preset.primary,
    };

    // 3. Aplica todas as variáveis CSS no DOM instantaneamente (Prévia em tempo real)
    applyAllCssVariables(currentConfig);

    // 4. Notifica o usuário que a prévia está ativa e precisa salvar
    setSavedSuccess(preset.name);
    setTimeout(() => setSavedSuccess(null), 3500);
  };

  // Aplica cor do Modal de Espectro
  const handleApplySpectrumColor = (newHex: string) => {
    if (spectrumModal.field) {
      const field = spectrumModal.field;
      if (field === "brandPrimary") {
        setBrandPrimary(newHex);
        updateDomColor?.("brand_primary", newHex);
      } else if (field === "brandAccent") {
        setBrandAccent(newHex);
        updateDomColor?.("brand_accent", newHex);
      } else if (field === "brandBg") {
        setBrandBg(newHex);
        updateDomColor?.("brand_bg", newHex);
      } else if (field === "menuBg") {
        setMenuBg(newHex);
        updateDomColor?.("menu_bg", newHex);
      } else if (field === "brandIcon") {
        setBrandIcon(newHex);
        updateDomColor?.("brand_icon", newHex);
      } else if (field === "menuIcon") {
        setMenuIcon(newHex);
        updateDomColor?.("menu_icon", newHex);
      } else if (field === "brandTitle") {
        setBrandTitle(newHex);
        updateDomColor?.("brand_title", newHex);
      } else if (field === "brandSubtitle") {
        setBrandSubtitle(newHex);
        updateDomColor?.("brand_subtitle", newHex);
      }
    } else {
      // Ajuste de Matiz do Tema Geral
      setBrandPrimary(newHex);
      setBrandAccent(newHex);
      setMenuPrimary(newHex);
      setMenuButton(newHex);

      const currentConfig = {
        primary: newHex,
        accent: newHex,
        bg: brandBg || activeTheme.bg,
        title: brandTitle || activeTheme.title,
        subtitle: brandSubtitle || activeTheme.subtitle,
        icon: newHex,
        button: newHex,
        menu_primary: newHex,
        menu_bg: menuBg || activeTheme.menuBg,
        menu_title: menuTitle || activeTheme.menuTitle,
        menu_subtitle: menuSubtitle || activeTheme.menuSubtitle,
        menu_icon: newHex,
        menu_button: newHex,
      };
      applyAllCssVariables(currentConfig);
      setSavedSuccess(`Matiz Personalizada (${newHex})`);
      setTimeout(() => setSavedSuccess(null), 3500);
    }
  };

  const activeTheme = PRESET_THEMES.find(t => t.id === activeThemeId) || PRESET_THEMES[0];

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      
      {/* BANNER PRINCIPAL DE HEADER COM RESET E STATUS */}
      <div 
        className="p-6 sm:p-7 rounded-2xl border transition-all duration-300 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${activeTheme.primary}12 0%, rgba(18, 18, 22, 0.85) 60%)`,
          borderColor: "rgba(255, 255, 255, 0.12)"
        }}
      >
        <div className="flex items-center gap-4 relative z-10">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg font-black text-xl transition-all duration-300"
            style={{ 
              backgroundColor: brandPrimary || activeTheme.primary, 
              color: "#FFFFFF",
              boxShadow: `0 8px 24px -4px ${brandPrimary || activeTheme.primary}60`
            }}
          >
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span 
                className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 drop-shadow-xs transition-colors duration-300"
                style={{ color: brandPrimary || activeTheme.primary }}
              >
                <Sparkles size={14} /> Temas Globais de Cores (1-Clique)
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-extrabold bg-white/10 border border-white/20 text-zinc-300">
                10 Paletas Harmonizadas Prontas
              </span>
            </div>
            <p className="text-xs text-zinc-300 font-medium mt-1">
              Clique em qualquer tema abaixo para transformar menus, botões, ícones e telas em tempo real.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0 relative z-10">
          {/* BOTÃO AJUSTAR MATIZ (ESPECTRO) */}
          <button
            type="button"
            onClick={() => setSpectrumModal({
              isOpen: true,
              initialColor: brandPrimary || activeTheme.primary,
              title: "Ajustar Matiz do Tema",
              subtitle: "Arraste a barra de espectro para mudar o tom de cor principal do tema em tempo real.",
            })}
            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Abrir barra de espectro de matiz"
          >
            <Sliders size={15} className="text-[var(--gm-primary)]" /> Ajustar Matiz (Espectro)
          </button>

          {/* RESET DE CORES */}
          <button
            type="button"
            onClick={resetToDefaultOrange}
            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Restaurar padrão Laranja Oficial"
          >
            <RotateCcw size={15} /> Resetar Padrão
          </button>
        </div>
      </div>

      {/* MENSAGENS DE CONFIRMAÇÃO */}
      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black flex items-center justify-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} /> Prévia em tempo real: Tema &ldquo;{savedSuccess}&rdquo; aplicado! Clique em &ldquo;Salvar Alterações&rdquo; no rodapé para gravar em definitivo.
        </div>
      )}

      {resetSuccess && (
        <div className="p-3.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 text-xs font-black flex items-center justify-center gap-2 animate-in fade-in duration-200">
          <RotateCcw size={16} /> Prévia redefinida para o padrão Laranja CardDigital! Clique em &ldquo;Salvar Alterações&rdquo; para confirmar.
        </div>
      )}

      {/* SEÇÃO PRINCIPAL: OS 10 TEMAS E PALETAS PRONTAS (1-CLIQUE) */}
      <div 
        className="p-6 sm:p-8 rounded-3xl border transition-all duration-300 space-y-6 shadow-2xl"
        style={{
          background: "rgba(18, 18, 22, 0.65)",
          borderColor: "rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(20px)"
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-wider text-white flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-[var(--gm-primary)]" /> 
              Selecione o Tema de Cores do Aplicativo (10 Opções)
            </h2>
            <p className="text-xs text-zinc-400 font-medium mt-1">
              Mudança imediata: ao clicar, todas as cores se adaptam em todos os elementos do app.
            </p>
          </div>

          <div 
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold self-start sm:self-auto transition-all duration-300"
            style={{
              background: `linear-gradient(135deg, ${activeTheme.primary}1A, rgba(20, 20, 24, 0.7))`,
              borderColor: `${activeTheme.primary}50`
            }}
          >
            <span className="text-zinc-300">Tema Ativo:</span>
            <span 
              className="w-2.5 h-2.5 rounded-full animate-pulse shadow-sm"
              style={{ backgroundColor: activeTheme.primary }}
            />
            <span 
              className="uppercase font-black"
              style={{ color: activeTheme.primary }}
            >
              {activeTheme.name}
            </span>
          </div>
        </div>

        {/* GRID DOS 10 TEMAS DE CORES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {PRESET_THEMES.map((preset) => {
            const isSelected = activeThemeId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => applyPresetTheme(preset)}
                className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 text-left relative overflow-hidden group hover:scale-[1.02] active:scale-[0.99] ${
                  isSelected
                    ? "ring-2 shadow-xl"
                    : "hover:border-white/25 hover:shadow-md"
                }`}
                style={{
                  background: isSelected 
                    ? `radial-gradient(circle at top left, ${preset.primary}22 0%, rgba(18, 18, 22, 0.95) 80%)`
                    : "rgba(18, 18, 22, 0.55)",
                  borderColor: isSelected ? preset.primary : "rgba(255, 255, 255, 0.08)",
                  boxShadow: isSelected 
                    ? `0 0 24px -4px ${preset.primary}45, inset 0 1px 0 rgba(255, 255, 255, 0.15)` 
                    : undefined,
                }}
              >
                {/* Indicador de Seleção Ativa com Ícone */}
                {isSelected && (
                  <div 
                    className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full text-white flex items-center justify-center shadow-md animate-in zoom-in duration-150"
                    style={{ backgroundColor: preset.primary }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}

                {/* Topo do Card com Amostras e Badge */}
                <div className="flex items-center justify-between w-full pr-5">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="w-4 h-4 rounded-full border border-white/40 shadow-sm transition-transform group-hover:scale-110" 
                      style={{ 
                        backgroundColor: preset.primary,
                        boxShadow: `0 0 8px ${preset.primary}60`
                      }} 
                      title="Cor Primária"
                    />
                    <span 
                      className="w-4 h-4 rounded-full border border-white/20" 
                      style={{ backgroundColor: preset.menuBg }} 
                      title="Superfície / Menu"
                    />
                    <span 
                      className="w-4 h-4 rounded-full border border-white/20" 
                      style={{ backgroundColor: preset.bg }} 
                      title="Fundo Canvas"
                    />
                  </div>
                  <span 
                    className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border transition-colors"
                    style={{ 
                      backgroundColor: `${preset.primary}22`,
                      color: preset.primary,
                      borderColor: `${preset.primary}40`
                    }}
                  >
                    {preset.badge}
                  </span>
                </div>

                {/* Nome do Tema e Descrição */}
                <div className="space-y-1 mt-1">
                  <h3 
                    className="text-sm font-bold transition-colors leading-tight"
                    style={{ color: isSelected ? "#FFFFFF" : "#F4F4F5" }}
                  >
                    {preset.name}
                  </h3>
                  <p className="text-[11px] text-[#8B8B92] leading-snug font-medium line-clamp-2">
                    {preset.desc}
                  </p>
                </div>

                {/* Faixa Gradiente Ilustrativa da Paleta */}
                <div 
                  className="w-full h-1.5 rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: `linear-gradient(90deg, ${preset.primary} 0%, ${preset.accent} 50%, ${preset.menuBg} 100%)`
                  }}
                />

                {/* Ações: HEX e Botão de Ajustar Matiz */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono font-bold text-zinc-400">
                  <span>HEX {preset.primary}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      applyPresetTheme(preset);
                      setSpectrumModal({
                        isOpen: true,
                        initialColor: preset.primary,
                        title: `Ajustar Matiz: ${preset.name}`,
                        subtitle: "Arraste a barra de espectro para mudar o tom da paleta deste tema.",
                        themeId: preset.id,
                      });
                    }}
                    className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white font-sans text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                    title="Ajustar com espectro"
                  >
                    <Sliders size={10} /> Ajustar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PALETA DE AMOSTRAS DO TEMA ATIVO (RESUMO VISUAL EM TEMPO REAL COM AJUSTE DE COR) */}
      <div 
        className="p-6 sm:p-7 rounded-3xl border space-y-5 shadow-2xl transition-all duration-300"
        style={{
          background: "rgba(18, 18, 22, 0.65)",
          borderColor: "rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(20px)"
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-[var(--gm-primary)]" />
              Palette & Amostras Ativas
            </h3>
            <p className="text-xs text-[#8B8B92] font-medium mt-0.5">
              Distribuição harmônica das cores ativas no sistema em tempo real. Clique em qualquer card para ajustar a cor com o espectro.
            </p>
          </div>
          <span 
            className="text-xs font-mono font-bold px-3.5 py-1 rounded-full border tracking-wider transition-colors duration-300"
            style={{
              backgroundColor: `${brandPrimary || activeTheme.primary}18`,
              color: brandPrimary || activeTheme.primary,
              borderColor: `${brandPrimary || activeTheme.primary}40`
            }}
          >
            8 ELEMENTOS SINCRONIZADOS
          </span>
        </div>

        {/* GRID DE CARDS DA PALETA */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {[
            { name: "Canvas / Fundo", hex: brandBg || activeTheme.bg, desc: "Fundo Geral", field: "brandBg" },
            { name: "Menu Surface", hex: menuBg || activeTheme.menuBg, desc: "Fundo Sidebar", field: "menuBg" },
            { name: "Primária / Botões", hex: brandPrimary || activeTheme.primary, desc: "Ação Principal", field: "brandPrimary" },
            { name: "Destaque / Accent", hex: brandAccent || activeTheme.accent, desc: "Realce & Alertas", field: "brandAccent" },
            { name: "Ícones App", hex: brandIcon || brandPrimary || activeTheme.primary, desc: "Ícones do Sistema", field: "brandIcon" },
            { name: "Ícones Menu", hex: menuIcon || menuPrimary || activeTheme.primary, desc: "Ícones da Sidebar", field: "menuIcon" },
            { name: "Títulos (Display)", hex: brandTitle || activeTheme.title, desc: "Tipografia H1, H2", field: "brandTitle" },
            { name: "Subtítulos / Muted", hex: brandSubtitle || activeTheme.subtitle, desc: "Textos Secundários", field: "brandSubtitle" },
          ].map((item) => (
            <div
              key={item.name}
              onClick={() => setSpectrumModal({
                isOpen: true,
                initialColor: item.hex,
                title: `Ajustar Cor: ${item.name}`,
                subtitle: "Arraste a barra de espectro para escolher a cor desejada.",
                field: item.field,
              })}
              className="rounded-2xl border border-white/10 overflow-hidden transition-all duration-300 flex flex-col relative group hover:border-[var(--gm-primary)] cursor-pointer"
              style={{ background: "rgba(18, 18, 22, 0.55)" }}
              title="Clique para ajustar com a barra de espectro"
            >
              {/* Bloco Superior com a Cor Solid */}
              <div
                className="h-16 sm:h-20 w-full transition-all duration-300 relative flex items-center justify-center"
                style={{ backgroundColor: item.hex }}
              >
                {(item.hex.toUpperCase() === "#F2F2F3" || item.hex.toUpperCase() === "#FFFFFF") && (
                  <div className="absolute inset-0 border border-slate-300/40 pointer-events-none" />
                )}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white flex items-center gap-1 backdrop-blur-xs">
                  <Palette size={11} /> Ajustar
                </div>
              </div>

              {/* Painel Inferior do Card com Nome e Código Hex */}
              <div className="p-3 border-t border-white/10 flex flex-col justify-center bg-zinc-900/60">
                <h4 className="text-xs font-bold text-white leading-tight truncate">
                  {item.name}
                </h4>
                <p className="text-[11px] font-mono font-semibold text-[#8B8B92] uppercase mt-0.5 tracking-wider">
                  {item.hex}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>



      {/* SEÇÃO DA TIPOGRAFIA (FAMÍLIA DE FONTE) */}
      <div 
        className="p-6 rounded-2xl border space-y-4 shadow-xl"
        style={{
          background: "rgba(18, 18, 22, 0.65)",
          borderColor: "rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(20px)"
        }}
      >
        <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--gm-primary)] flex items-center gap-2">
          <Type className="w-4 h-4" /> Tipografia Principal do Aplicativo
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            "Inter",
            "Space Grotesk",
            "Roboto",
            "Montserrat",
            "Open Sans",
            "Raleway",
            "Funnel Display",
            "Plus Jakarta Sans",
            "Hubot Sans",
            "Poppins"
          ].map((font) => {
            const isActive = fontFamily === font;
            return (
              <button
                key={font}
                type="button"
                onClick={() => setFontFamily(font)}
                onMouseEnter={() => setPreviewFont(font)}
                onMouseLeave={() => setPreviewFont(null)}
                onTouchStart={() => setPreviewFont(font)}
                onTouchEnd={() => setPreviewFont(null)}
                className={`flex items-center justify-center p-3 rounded-xl border transition-all h-12 cursor-pointer ${
                  isActive
                    ? "border-[var(--gm-primary)] text-[var(--gm-primary)] font-bold ring-2 ring-[var(--gm-primary)]/20"
                    : "border-white/10 hover:border-white/20 text-slate-200"
                }`}
                style={{ 
                  fontFamily: font,
                  background: isActive 
                    ? `linear-gradient(145deg, ${brandPrimary || activeTheme.primary}18, rgba(18, 18, 22, 0.9))`
                    : "rgba(18, 18, 22, 0.5)"
                }}
              >
                <span className="text-xs font-semibold truncate">
                  {font}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MODAL DE ESPECTRO INTERATIVO PARA TEMAS E CORES */}
      <ColorSpectrumModal
        isOpen={spectrumModal.isOpen}
        onClose={() => setSpectrumModal(prev => ({ ...prev, isOpen: false }))}
        initialColor={spectrumModal.initialColor}
        title={spectrumModal.title}
        subtitle={spectrumModal.subtitle}
        onApply={handleApplySpectrumColor}
      />

    </div>
  );
};
