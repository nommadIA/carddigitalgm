import React, { useState, useRef, useEffect } from "react";
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

// 10 TEMAS PRONTOS E HARMONIZADOS PARA TODO O APLICATIVO (1-CLIQUE) COM ALTO CONTRASTE E UI APPLE
export const PRESET_THEMES = [
  {
    id: "orange",
    name: "Laranja CardDigital",
    badge: "OFICIAL",
    desc: "Laranja oficial de alto impacto com superfícies grafite e contraste industrial.",
    legend: "Laranja #FE540B • Grafite #0B0B0C • Fogo #FF7A38",
    primary: "#FE540B",
    accent: "#FF7A38",
    bg: "#0B0B0C",
    title: "#FFFFFF",
    subtitle: "#E2E8F0",
    icon: "#FE540B",
    menuBg: "#131315",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#E2E8F0",
    menuIcon: "#FE540B",
  },
  {
    id: "emerald",
    name: "Verde Esmeralda Pro",
    badge: "FINANÇAS",
    desc: "Esmeralda vivo, fundo dark floresta e acentos menta de alta precisão.",
    legend: "Esmeralda #10B981 • Floresta #08100C • Menta #34D399",
    primary: "#10B981",
    accent: "#34D399",
    bg: "#08100C",
    title: "#FFFFFF",
    subtitle: "#E2E8F0",
    icon: "#10B981",
    menuBg: "#0D1912",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#A7F3D0",
    menuIcon: "#10B981",
  },
  {
    id: "cyan",
    name: "Azul Elétrico Neon",
    badge: "TECH",
    desc: "Ciano tecnológico, fundo dark oceano e detalhes em azul elétrico futurista.",
    legend: "Ciano #06B6D4 • Oceano #060D18 • Sky Neon #38BDF8",
    primary: "#06B6D4",
    accent: "#38BDF8",
    bg: "#060D18",
    title: "#FFFFFF",
    subtitle: "#E2E8F0",
    icon: "#06B6D4",
    menuBg: "#0A1524",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#BAE6FD",
    menuIcon: "#06B6D4",
  },
  {
    id: "purple",
    name: "Roxo Cyberpunk",
    badge: "DESIGN",
    desc: "Violeta intenso neon, superfícies cósmicas e alto contraste criativo.",
    legend: "Violeta #8B5CF6 • Cósmico #0A0618 • Púrpura #A855F7",
    primary: "#8B5CF6",
    accent: "#A855F7",
    bg: "#0A0618",
    title: "#FFFFFF",
    subtitle: "#E2E8F0",
    icon: "#8B5CF6",
    menuBg: "#120A24",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#DDD6FE",
    menuIcon: "#8B5CF6",
  },
  {
    id: "gold",
    name: "Ouro Executivo / Âmbar",
    badge: "PREMIUM",
    desc: "Dourado nobre âmbar com fundo escuro quente e acabamento luxuoso.",
    legend: "Dourado #F59E0B • Âmbar Dark #0C0A06 • Ouro #FBBF24",
    primary: "#F59E0B",
    accent: "#FBBF24",
    bg: "#0C0A06",
    title: "#FFFFFF",
    subtitle: "#E2E8F0",
    icon: "#F59E0B",
    menuBg: "#171309",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#FDE68A",
    menuIcon: "#F59E0B",
  },
  {
    id: "crimson",
    name: "Vermelho Carmim / Rubi",
    badge: "ENERGIA",
    desc: "Vermelho carmim vibrante com alto impacto visual e elegância refinada.",
    legend: "Carmim #E11D48 • Rubi Dark #0F060A • Coral #FB7185",
    primary: "#E11D48",
    accent: "#FB7185",
    bg: "#0F060A",
    title: "#FFFFFF",
    subtitle: "#E2E8F0",
    icon: "#E11D48",
    menuBg: "#1A0A12",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#FECDD3",
    menuIcon: "#E11D48",
  },
  {
    id: "sapphire",
    name: "Azul Real / Safira",
    badge: "CORPORATIVO",
    desc: "Azul Safira corporativo moderno com presença sólida e confiável.",
    legend: "Azul Safira #2563EB • Marinho #060A14 • Royal #60A5FA",
    primary: "#2563EB",
    accent: "#60A5FA",
    bg: "#060A14",
    title: "#FFFFFF",
    subtitle: "#E2E8F0",
    icon: "#2563EB",
    menuBg: "#0C1220",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#BFDBFE",
    menuIcon: "#2563EB",
  },
  {
    id: "magenta",
    name: "Rosa Choque / Magenta",
    badge: "CRIATIVO",
    desc: "Magenta neon moderno para marcas inovadoras, dinâmicas e contemporâneas.",
    legend: "Magenta #D946EF • Dark Violet #0E0512 • Pink #F472B6",
    primary: "#D946EF",
    accent: "#F472B6",
    bg: "#0E0512",
    title: "#FFFFFF",
    subtitle: "#E2E8F0",
    icon: "#D946EF",
    menuBg: "#180920",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#F5D0FE",
    menuIcon: "#D946EF",
  },
  {
    id: "lime",
    name: "Verde Lima / Volt",
    badge: "PERFORMANCE",
    desc: "Verde lima energético de alto contraste para máxima visibilidade e agilidade.",
    legend: "Lima Volt #84CC16 • Musgo Dark #0A0E05 • Acento #A3E635",
    primary: "#84CC16",
    accent: "#A3E635",
    bg: "#0A0E05",
    title: "#FFFFFF",
    subtitle: "#E2E8F0",
    icon: "#84CC16",
    menuBg: "#121808",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#D9F99D",
    menuIcon: "#84CC16",
  },
  {
    id: "titanium",
    name: "Titânio / Monocromo Pro",
    badge: "MINIMALISTA",
    desc: "Titânio e grafite neutro para visual ultra clean, técnico e sofisticado.",
    legend: "Titânio #94A3B8 • Grafite Dark #0B0F19 • Platina #CBD5E1",
    primary: "#94A3B8",
    accent: "#CBD5E1",
    bg: "#0B0F19",
    title: "#FFFFFF",
    subtitle: "#E2E8F0",
    icon: "#94A3B8",
    menuBg: "#131B2E",
    menuTitle: "#FFFFFF",
    menuSubtitle: "#CBD5E1",
    menuIcon: "#94A3B8",
  },
];

// VALORES PADRÃO DO TEMA OFICIAL LARANJA COM ALTO CONTRASTE
export const DEFAULT_ORANGE_DARK = {
  primary: "#FE540B",
  accent: "#FF7A38",
  bg: "#0B0B0C",
  title: "#FFFFFF",
  subtitle: "#E2E8F0",
  icon: "#FE540B",
  button: "#FE540B",
  menu_primary: "#FE540B",
  menu_bg: "#131315",
  menu_title: "#FFFFFF",
  menu_subtitle: "#E2E8F0",
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

  // Estado do tema em prévia por hover (passar o mouse)
  const [hoveredThemeId, setHoveredThemeId] = useState<string | null>(null);

  // Refs de controle para evitar perda de estado durante preview em tempo real (hover/drag)
  const activePresetRef = useRef<typeof PRESET_THEMES[0]>(
    PRESET_THEMES.find(t => t.id === activeThemeId) || PRESET_THEMES[0]
  );
  const isHoverPreviewingRef = useRef<boolean>(false);

  const currentConfigRef = useRef({
    primary: brandPrimary || DEFAULT_ORANGE_DARK.primary,
    accent: brandAccent || DEFAULT_ORANGE_DARK.accent,
    bg: brandBg || DEFAULT_ORANGE_DARK.bg,
    title: brandTitle || DEFAULT_ORANGE_DARK.title,
    subtitle: brandSubtitle || DEFAULT_ORANGE_DARK.subtitle,
    icon: brandIcon || DEFAULT_ORANGE_DARK.icon,
    button: brandPrimary || DEFAULT_ORANGE_DARK.primary,
    menu_primary: menuPrimary || DEFAULT_ORANGE_DARK.menu_primary,
    menu_bg: menuBg || DEFAULT_ORANGE_DARK.menu_bg,
    menu_title: menuTitle || DEFAULT_ORANGE_DARK.menu_title,
    menu_subtitle: menuSubtitle || DEFAULT_ORANGE_DARK.menu_subtitle,
    menu_icon: menuIcon || DEFAULT_ORANGE_DARK.menu_icon,
    menu_button: menuButton || DEFAULT_ORANGE_DARK.menu_button,
  });

  // Sincroniza o ref de configuração atual com as props quando não estiver em hover
  useEffect(() => {
    if (!isHoverPreviewingRef.current) {
      currentConfigRef.current = {
        primary: brandPrimary || currentConfigRef.current.primary,
        accent: brandAccent || currentConfigRef.current.accent,
        bg: brandBg || currentConfigRef.current.bg,
        title: brandTitle || currentConfigRef.current.title,
        subtitle: brandSubtitle || currentConfigRef.current.subtitle,
        icon: brandIcon || currentConfigRef.current.icon,
        button: brandPrimary || currentConfigRef.current.button,
        menu_primary: menuPrimary || currentConfigRef.current.menu_primary,
        menu_bg: menuBg || currentConfigRef.current.menu_bg,
        menu_title: menuTitle || currentConfigRef.current.menu_title,
        menu_subtitle: menuSubtitle || currentConfigRef.current.menu_subtitle,
        menu_icon: menuIcon || currentConfigRef.current.menu_icon,
        menu_button: menuButton || currentConfigRef.current.menu_button,
      };
    }
  }, [
    brandPrimary,
    brandAccent,
    brandBg,
    brandTitle,
    brandSubtitle,
    brandIcon,
    menuPrimary,
    menuBg,
    menuTitle,
    menuSubtitle,
    menuIcon,
    menuButton
  ]);

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

    // Dispara evento global de sincronização
    try {
      window.dispatchEvent(new CustomEvent("gm_theme_updated", { detail: colors }));
    } catch (e) {}
  };

  // Prévia instantânea ao passar o mouse ou arrastar por cima do tema (hover/drag)
  const handlePreviewThemeHover = (preset: typeof PRESET_THEMES[0]) => {
    isHoverPreviewingRef.current = true;
    setHoveredThemeId(preset.id);
    const previewConfig = {
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
    applyAllCssVariables(previewConfig);
  };

  // Restaura o tema ativo quando o mouse sai do card (leave), caso não tenha clicado
  const handleRevertThemePreview = () => {
    if (!isHoverPreviewingRef.current) return;
    isHoverPreviewingRef.current = false;
    setHoveredThemeId(null);
    applyAllCssVariables(currentConfigRef.current);
  };

  // Reseta todas as cores para o Padrão Tema Laranja Oficial (modo prévia)
  const resetToDefaultOrange = () => {
    isHoverPreviewingRef.current = false;
    setActiveThemeId("orange");
    setHoveredThemeId(null);
    activePresetRef.current = PRESET_THEMES[0];

    currentConfigRef.current = { ...DEFAULT_ORANGE_DARK };

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
    // 1. Atualiza estado reativo do botão ativo e refs imediatamente
    isHoverPreviewingRef.current = false;
    activePresetRef.current = preset;
    setActiveThemeId(preset.id);
    setHoveredThemeId(null);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("gm_selected_theme_id", preset.id);
    }

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
    currentConfigRef.current = currentConfig;

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

    // 3. Aplica todas as variáveis CSS no DOM instantaneamente (Prévia em tempo real em todos os elementos)
    applyAllCssVariables(currentConfig);

    // 4. Sincroniza callbacks DOM do componente pai
    updateDomColor?.("brand_primary", preset.primary);
    updateDomColor?.("brand_accent", preset.accent);
    updateDomColor?.("brand_bg", preset.bg);
    updateDomColor?.("brand_title", preset.title);
    updateDomColor?.("brand_subtitle", preset.subtitle);
    updateDomColor?.("brand_icon", preset.icon);
    updateDomColor?.("menu_bg", preset.menuBg);
    updateDomColor?.("menu_icon", preset.menuIcon);
    updateDomColor?.("menu_title", preset.menuTitle);
    updateDomColor?.("menu_subtitle", preset.menuSubtitle);

    // 5. Notifica o usuário que a prévia está ativa e precisa salvar
    setSavedSuccess(preset.name);
    setTimeout(() => setSavedSuccess(null), 3500);
  };

  // Aplica cor do Modal de Espectro
  const handleApplySpectrumColor = (newHex: string) => {
    isHoverPreviewingRef.current = false;
    if (spectrumModal.field) {
      const field = spectrumModal.field;
      if (field === "brandPrimary") {
        setBrandPrimary(newHex);
        updateDomColor?.("brand_primary", newHex);
        currentConfigRef.current.primary = newHex;
        currentConfigRef.current.button = newHex;
        applyAllCssVariables(currentConfigRef.current);
      } else if (field === "brandAccent") {
        setBrandAccent(newHex);
        updateDomColor?.("brand_accent", newHex);
        currentConfigRef.current.accent = newHex;
        applyAllCssVariables(currentConfigRef.current);
      } else if (field === "brandBg") {
        setBrandBg(newHex);
        updateDomColor?.("brand_bg", newHex);
        currentConfigRef.current.bg = newHex;
        applyAllCssVariables(currentConfigRef.current);
      } else if (field === "menuBg") {
        setMenuBg(newHex);
        updateDomColor?.("menu_bg", newHex);
        currentConfigRef.current.menu_bg = newHex;
        applyAllCssVariables(currentConfigRef.current);
      } else if (field === "brandIcon") {
        setBrandIcon(newHex);
        updateDomColor?.("brand_icon", newHex);
        currentConfigRef.current.icon = newHex;
        applyAllCssVariables(currentConfigRef.current);
      } else if (field === "menuIcon") {
        setMenuIcon(newHex);
        updateDomColor?.("menu_icon", newHex);
        currentConfigRef.current.menu_icon = newHex;
        applyAllCssVariables(currentConfigRef.current);
      } else if (field === "brandTitle") {
        setBrandTitle(newHex);
        updateDomColor?.("brand_title", newHex);
        currentConfigRef.current.title = newHex;
        applyAllCssVariables(currentConfigRef.current);
      } else if (field === "brandSubtitle") {
        setBrandSubtitle(newHex);
        updateDomColor?.("brand_subtitle", newHex);
        currentConfigRef.current.subtitle = newHex;
        applyAllCssVariables(currentConfigRef.current);
      }
    } else {
      // Ajuste de Matiz do Tema Geral
      setBrandPrimary(newHex);
      setBrandAccent(newHex);
      setMenuPrimary(newHex);
      setMenuButton(newHex);
      setBrandIcon(newHex);
      setMenuIcon(newHex);

      updateDomColor?.("brand_primary", newHex);
      updateDomColor?.("brand_accent", newHex);
      updateDomColor?.("brand_icon", newHex);
      updateDomColor?.("menu_icon", newHex);
      updateDomColor?.("menu_primary", newHex);
      updateDomColor?.("menu_button", newHex);

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
      currentConfigRef.current = currentConfig;
      applyAllCssVariables(currentConfig);
      setSavedSuccess(`Matiz Personalizada (${newHex})`);
      setTimeout(() => setSavedSuccess(null), 3500);
    }
  };

  const activeTheme = PRESET_THEMES.find(t => t.id === activeThemeId) || PRESET_THEMES[0];
  const currentDisplayTheme = hoveredThemeId 
    ? (PRESET_THEMES.find(t => t.id === hoveredThemeId) || activeTheme) 
    : activeTheme;

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
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold self-start sm:self-auto transition-all duration-300 shadow-md"
            style={{
              background: `linear-gradient(135deg, ${currentDisplayTheme.primary}22, rgba(20, 20, 24, 0.8))`,
              borderColor: `${currentDisplayTheme.primary}60`
            }}
          >
            <span className="text-zinc-300">{hoveredThemeId ? "Prévia (Hover):" : "Tema Ativo:"}</span>
            <span 
              className="w-2.5 h-2.5 rounded-full animate-pulse shadow-sm"
              style={{ backgroundColor: currentDisplayTheme.primary }}
            />
            <span 
              className="uppercase font-black tracking-wide"
              style={{ color: currentDisplayTheme.primary }}
            >
              {currentDisplayTheme.name}
            </span>
          </div>
        </div>

        {/* GRID DOS 10 TEMAS DE CORES COM PRÉVIA INSTANTÂNEA AO PASSAR O MOUSE OU CLICAR (UI APPLE) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {PRESET_THEMES.map((preset) => {
            const isSelected = activeThemeId === preset.id;
            const isHovered = hoveredThemeId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => applyPresetTheme(preset)}
                onMouseEnter={() => handlePreviewThemeHover(preset)}
                onMouseMove={() => {
                  if (hoveredThemeId !== preset.id) {
                    handlePreviewThemeHover(preset);
                  }
                }}
                onPointerEnter={() => handlePreviewThemeHover(preset)}
                onTouchStart={() => handlePreviewThemeHover(preset)}
                onMouseLeave={handleRevertThemePreview}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 text-left relative overflow-hidden group hover:scale-[1.02] active:scale-[0.99] ${
                  isSelected
                    ? "ring-2 shadow-2xl"
                    : isHovered
                    ? "ring-1 shadow-xl"
                    : "hover:border-white/30 hover:shadow-lg"
                }`}
                style={{
                  background: isSelected 
                    ? `radial-gradient(circle at top left, ${preset.primary}28 0%, rgba(18, 18, 22, 0.95) 85%)`
                    : isHovered
                    ? `radial-gradient(circle at top left, ${preset.primary}20 0%, rgba(22, 22, 28, 0.92) 85%)`
                    : "rgba(18, 18, 22, 0.65)",
                  borderColor: isSelected ? preset.primary : isHovered ? `${preset.primary}90` : "rgba(255, 255, 255, 0.12)",
                  boxShadow: isSelected 
                    ? `0 0 28px -4px ${preset.primary}50, inset 0 1px 0 rgba(255, 255, 255, 0.2)` 
                    : isHovered
                    ? `0 0 20px -4px ${preset.primary}40, inset 0 1px 0 rgba(255, 255, 255, 0.1)`
                    : undefined,
                  backdropFilter: "blur(16px)",
                }}
              >
                {/* Indicador de Seleção Ativa com Ícone */}
                {isSelected && (
                  <div 
                    className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full text-white flex items-center justify-center shadow-lg animate-in zoom-in duration-150 z-10"
                    style={{ 
                      backgroundColor: preset.primary,
                      boxShadow: `0 0 12px ${preset.primary}80`
                    }}
                    title="Tema Ativo Selecionado"
                  >
                    <Check size={12} strokeWidth={3.5} />
                  </div>
                )}

                {/* Indicador de Prévia no Hover */}
                {!isSelected && isHovered && (
                  <div 
                    className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold text-white uppercase tracking-wider animate-pulse shadow-md z-10"
                    style={{ backgroundColor: preset.primary }}
                  >
                    PRÉVIA
                  </div>
                )}

                {/* Topo do Card: Amostras Apple (3 Cápsulas/Pills Circulares) e Badge Apple */}
                <div className="flex items-center justify-between w-full pr-5">
                  <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-full border border-white/10 backdrop-blur-md">
                    {/* Amostra 1: Primária */}
                    <span 
                      className="w-4 h-4 rounded-full border border-white/50 shadow-sm transition-transform group-hover:scale-110" 
                      style={{ 
                        backgroundColor: preset.primary,
                        boxShadow: `0 0 10px ${preset.primary}90`
                      }} 
                      title={`Primária: ${preset.primary}`}
                    />
                    {/* Amostra 2: Acento */}
                    <span 
                      className="w-4 h-4 rounded-full border border-white/40 shadow-xs" 
                      style={{ 
                        backgroundColor: preset.accent,
                        boxShadow: `0 0 6px ${preset.accent}60`
                      }} 
                      title={`Acento: ${preset.accent}`}
                    />
                    {/* Amostra 3: Fundo/Superfície */}
                    <span 
                      className="w-4 h-4 rounded-full border border-white/30 shadow-xs" 
                      style={{ 
                        backgroundColor: preset.bg,
                        boxShadow: `inset 0 0 4px rgba(255,255,255,0.2)`
                      }} 
                      title={`Fundo: ${preset.bg}`}
                    />
                  </div>
                  <span 
                    className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border backdrop-blur-sm transition-all"
                    style={{ 
                      backgroundColor: `${preset.primary}25`,
                      color: "#FFFFFF",
                      borderColor: `${preset.primary}60`,
                      textShadow: "0 1px 2px rgba(0,0,0,0.6)"
                    }}
                  >
                    {preset.badge}
                  </span>
                </div>

                {/* Nome do Tema (Clean e Moderno) */}
                <div className="pt-0.5">
                  <h3 className="text-[13px] font-bold transition-colors leading-tight text-white truncate">
                    {preset.name}
                  </h3>
                </div>

                {/* Faixa Gradiente Ilustrativa da Paleta com Brilho Apple */}
                <div 
                  className="w-full h-1.5 rounded-full opacity-90 group-hover:opacity-100 transition-all shadow-inner"
                  style={{
                    background: `linear-gradient(90deg, ${preset.primary} 0%, ${preset.accent} 50%, ${preset.menuBg} 100%)`,
                    boxShadow: `0 0 8px ${preset.primary}40`
                  }}
                />

                {/* Ações: Código HEX em 1 linha e Botão Ajustar abaixo */}
                <div className="pt-2 border-t border-white/10 flex flex-col gap-2 w-full">
                  {/* Linha Única HEX */}
                  <div className="w-full py-1.5 px-2.5 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between text-[11px] font-mono font-bold text-slate-200">
                    <span className="text-slate-400 text-[10px] font-sans font-semibold">HEX</span>
                    <span className="text-white font-extrabold tracking-wide">{preset.primary}</span>
                  </div>

                  {/* Botão de Ajustar Abaixo */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      applyPresetTheme(preset);
                      setSpectrumModal({
                        isOpen: true,
                        initialColor: preset.primary,
                        title: `Ajustar: ${preset.name}`,
                        subtitle: "Arraste a barra de espectro para personalizar a paleta deste tema.",
                        themeId: preset.id,
                      });
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-sans font-bold text-[11px] flex items-center justify-center gap-1.5 border border-white/15 hover:border-[var(--gm-primary)] transition-all cursor-pointer shadow-xs"
                    title="Ajustar com espectro"
                  >
                    <Sliders size={13} style={{ color: preset.primary }} />
                    <span>Ajustar</span>
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
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-[var(--gm-primary)]" />
              Palette & Amostras Ativas
            </h3>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Distribuição harmônica das cores ativas no sistema em tempo real. Clique em qualquer card para ajustar a cor com o espectro.
            </p>
          </div>
          <span 
            className="text-xs font-mono font-bold px-3.5 py-1 rounded-full border tracking-wider transition-colors duration-300"
            style={{
              backgroundColor: `${brandPrimary || activeTheme.primary}20`,
              color: "#FFFFFF",
              borderColor: `${brandPrimary || activeTheme.primary}50`
            }}
          >
            8 ELEMENTOS SINCRONIZADOS
          </span>
        </div>

        {/* GRID DE CARDS DA PALETA COM PRÉVIA INSTANTÂNEA E ALTO CONTRASTE */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {[
            { name: "Canvas / Fundo", hex: hoveredThemeId ? currentDisplayTheme.bg : (brandBg || activeTheme.bg), desc: "Fundo Geral", field: "brandBg" },
            { name: "Menu Surface", hex: hoveredThemeId ? currentDisplayTheme.menuBg : (menuBg || activeTheme.menuBg), desc: "Fundo Sidebar", field: "menuBg" },
            { name: "Primária / Botões", hex: hoveredThemeId ? currentDisplayTheme.primary : (brandPrimary || activeTheme.primary), desc: "Ação Principal", field: "brandPrimary" },
            { name: "Destaque / Accent", hex: hoveredThemeId ? currentDisplayTheme.accent : (brandAccent || activeTheme.accent), desc: "Realce & Alertas", field: "brandAccent" },
            { name: "Ícones App", hex: hoveredThemeId ? currentDisplayTheme.icon : (brandIcon || brandPrimary || activeTheme.primary), desc: "Ícones do Sistema", field: "brandIcon" },
            { name: "Ícones Menu", hex: hoveredThemeId ? currentDisplayTheme.icon : (menuIcon || menuPrimary || activeTheme.primary), desc: "Ícones da Sidebar", field: "menuIcon" },
            { name: "Títulos (Display)", hex: hoveredThemeId ? currentDisplayTheme.title : (brandTitle || activeTheme.title), desc: "Tipografia H1, H2", field: "brandTitle" },
            { name: "Subtítulos / Muted", hex: hoveredThemeId ? currentDisplayTheme.subtitle : (brandSubtitle || activeTheme.subtitle), desc: "Textos Secundários", field: "brandSubtitle" },
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
              className="rounded-2xl border border-white/15 overflow-hidden transition-all duration-300 flex flex-col relative group hover:border-[var(--gm-primary)] cursor-pointer shadow-lg hover:scale-[1.02]"
              style={{ background: "rgba(18, 18, 22, 0.65)" }}
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
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 px-3 py-1 rounded-lg text-[11px] font-bold text-white flex items-center gap-1.5 backdrop-blur-md shadow-md">
                  <Palette size={12} /> Ajustar
                </div>
              </div>

              {/* Painel Inferior do Card com Nome e Código Hex */}
              <div className="p-3 border-t border-white/10 flex flex-col justify-center bg-zinc-900/80">
                <h4 className="text-xs font-bold text-white leading-tight truncate">
                  {item.name}
                </h4>
                <p className="text-[11px] font-mono font-bold text-slate-300 uppercase mt-0.5 tracking-wider">
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
        onPreview={handleApplySpectrumColor}
        onApply={handleApplySpectrumColor}
      />

    </div>
  );
};
