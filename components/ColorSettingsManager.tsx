import React, { useState } from "react";
import { 
  Sun, 
  Moon,
  Type,
  CheckCircle2,
  RotateCcw,
  Palette,
  Sparkles,
  Sliders,
  Check,
  Building2,
  Info
} from "lucide-react";

export interface ColorSettingsManagerProps {
  isLightMode: boolean;
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

// 8 CORES OFICIAIS DO SISTEMA (CONFORME IMAGEM DE PALETA)
export const BASE_ORANGE_PALETTE = [
  { name: "Ink", hex: "#0B0B0C", desc: "Fundo Profundo / Canvas Dark", category: "Neutral Dark" },
  { name: "Graphite", hex: "#131315", desc: "Superfície de Cards / Painel", category: "Neutral Dark" },
  { name: "Slate", hex: "#1B1B1E", desc: "Superfície Secundária / Hover", category: "Neutral Dark" },
  { name: "Filament", hex: "#26262A", desc: "Bordas & Elementos Neutros", category: "Neutral Dark" },
  { name: "Ember", hex: "#F65A1A", desc: "Cor Primária / Destaque Principal", category: "Accent" },
  { name: "Spark", hex: "#FF7A38", desc: "Destaque Secundário / Hover Ativo", category: "Accent" },
  { name: "Bone", hex: "#F2F2F3", desc: "Texto Principal / Fundo Claro", category: "Light / Text" },
  { name: "Ash", hex: "#8B8B92", desc: "Texto Secundário / Subtítulos", category: "Muted Text" },
];

// VALORES PADRÃO INTELIGENTES PARA MODO CLARO E MODO ESCURO
export const DEFAULT_ORANGE_LIGHT = {
  primary: "#F65A1A",
  accent: "#FF7A38",
  bg: "#F2F2F3",
  title: "#0B0B0C",
  subtitle: "#8B8B92",
  icon: "#F65A1A",
  button: "#F65A1A",
  menu_primary: "#F65A1A",
  menu_bg: "#F65A1A",
  menu_title: "#FFFFFF",
  menu_subtitle: "rgba(255, 255, 255, 0.85)",
  menu_icon: "#FFFFFF",
  menu_button: "#F65A1A",
};

export const DEFAULT_ORANGE_DARK = {
  primary: "#F65A1A",
  accent: "#FF7A38",
  bg: "#0B0B0C",
  title: "#F2F2F3",
  subtitle: "#8B8B92",
  icon: "#F65A1A",
  button: "#F65A1A",
  menu_primary: "#F65A1A",
  menu_bg: "#131315",
  menu_title: "#F2F2F3",
  menu_subtitle: "#8B8B92",
  menu_icon: "#8B8B92",
  menu_button: "#F65A1A",
};

export const ColorSettingsManager: React.FC<ColorSettingsManagerProps> = ({
  isLightMode,
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
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  // Função auxiliar para atualizar uma cor específica e propagar para DOM + LocalStorage
  const handleUpdateSingleColor = (
    key: "primary" | "bg" | "title" | "subtitle" | "icon" | "accent" | "menuBg" | "menuTitle" | "menuSubtitle" | "menuIcon",
    value: string
  ) => {
    switch (key) {
      case "primary":
        setBrandPrimary(value);
        setMenuButton(value);
        updateDomColor("--gm-primary", value);
        updateDomColor("--gm-button", value);
        break;
      case "bg":
        setBrandBg(value);
        updateDomColor("--gm-bg", value);
        break;
      case "title":
        setBrandTitle(value);
        updateDomColor("--gm-title", value);
        break;
      case "subtitle":
        setBrandSubtitle(value);
        updateDomColor("--gm-subtitle", value);
        break;
      case "icon":
        setBrandIcon(value);
        updateDomColor("--gm-icon", value);
        break;
      case "accent":
        setBrandAccent(value);
        updateDomColor("--gm-accent", value);
        break;
      case "menuBg":
        setMenuBg(value);
        updateDomColor("--gm-menu-bg", value);
        break;
      case "menuTitle":
        setMenuTitle(value);
        updateDomColor("--gm-menu-title", value);
        break;
      case "menuSubtitle":
        setMenuSubtitle(value);
        updateDomColor("--gm-menu-subtitle", value);
        break;
      case "menuIcon":
        setMenuIcon(value);
        updateDomColor("--gm-menu-icon", value);
        break;
    }

    // Salva no LocalStorage
    const currentConfig = {
      primary: key === "primary" ? value : brandPrimary,
      accent: key === "accent" ? value : brandAccent,
      bg: key === "bg" ? value : brandBg,
      title: key === "title" ? value : brandTitle,
      subtitle: key === "subtitle" ? value : brandSubtitle,
      icon: key === "icon" ? value : brandIcon,
      button: key === "primary" ? value : brandPrimary,
      menu_primary: key === "primary" ? value : brandPrimary,
      menu_bg: key === "menuBg" ? value : menuBg,
      menu_title: key === "menuTitle" ? value : menuTitle,
      menu_subtitle: key === "menuSubtitle" ? value : menuSubtitle,
      menu_icon: key === "menuIcon" ? value : menuIcon,
      menu_button: key === "primary" ? value : brandPrimary,
    };

    const storageKey = isLightMode ? "gm_colors_light" : "gm_colors_dark";
    localStorage.setItem(storageKey, JSON.stringify(currentConfig));
    window.dispatchEvent(new Event("gm_theme_updated"));

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Reseta todas as cores para o Padrão Tema Laranja Oficial
  const resetToDefaultOrange = () => {
    localStorage.removeItem("gm_colors_light");
    localStorage.removeItem("gm_colors_dark");
    localStorage.removeItem("gm_selected_theme_id");

    const defaultColors = isLightMode ? DEFAULT_ORANGE_LIGHT : DEFAULT_ORANGE_DARK;

    setBrandPrimary(defaultColors.primary);
    setBrandBg(defaultColors.bg);
    setBrandTitle(defaultColors.title);
    setBrandSubtitle(defaultColors.subtitle);
    setBrandIcon(defaultColors.icon);
    setBrandAccent(defaultColors.accent);

    setMenuPrimary(defaultColors.menu_primary);
    setMenuBg(defaultColors.menu_bg);
    setMenuTitle(defaultColors.menu_title);
    setMenuSubtitle(defaultColors.menu_subtitle);
    setMenuIcon(defaultColors.menu_icon);
    setMenuButton(defaultColors.menu_button);

    // Atualiza DOM
    updateDomColor("--gm-primary", defaultColors.primary);
    updateDomColor("--gm-accent", defaultColors.accent);
    updateDomColor("--gm-bg", defaultColors.bg);
    updateDomColor("--gm-title", defaultColors.title);
    updateDomColor("--gm-subtitle", defaultColors.subtitle);
    updateDomColor("--gm-icon", defaultColors.icon);
    updateDomColor("--gm-button", defaultColors.button);

    updateDomColor("--gm-menu-primary", defaultColors.menu_primary);
    updateDomColor("--gm-menu-bg", defaultColors.menu_bg);
    updateDomColor("--gm-menu-title", defaultColors.menu_title);
    updateDomColor("--gm-menu-subtitle", defaultColors.menu_subtitle);
    updateDomColor("--gm-menu-icon", defaultColors.menu_icon);
    updateDomColor("--gm-menu-button", defaultColors.menu_button);

    window.dispatchEvent(new Event("gm_theme_updated"));

    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2500);
  };

  // Alternância Inteligente Modo Claro / Modo Escuro
  const toggleSmartThemeMode = () => {
    const newMode = isLightMode ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newMode);
    document.documentElement.classList.toggle("gm-light", newMode === "light");
    document.documentElement.classList.toggle("gm-dark", newMode === "dark");
    document.documentElement.classList.toggle("dark", newMode === "dark");
    localStorage.setItem("theme", newMode);

    // Aplica paleta inteligente correspondente ao modo
    const targetColors = newMode === "light" ? DEFAULT_ORANGE_LIGHT : DEFAULT_ORANGE_DARK;

    setBrandPrimary(targetColors.primary);
    setBrandBg(targetColors.bg);
    setBrandTitle(targetColors.title);
    setBrandSubtitle(targetColors.subtitle);
    setBrandIcon(targetColors.icon);
    setBrandAccent(targetColors.accent);

    setMenuPrimary(targetColors.menu_primary);
    setMenuBg(targetColors.menu_bg);
    setMenuTitle(targetColors.menu_title);
    setMenuSubtitle(targetColors.menu_subtitle);
    setMenuIcon(targetColors.menu_icon);
    setMenuButton(targetColors.menu_button);

    updateDomColor("--gm-primary", targetColors.primary);
    updateDomColor("--gm-accent", targetColors.accent);
    updateDomColor("--gm-bg", targetColors.bg);
    updateDomColor("--gm-title", targetColors.title);
    updateDomColor("--gm-subtitle", targetColors.subtitle);
    updateDomColor("--gm-icon", targetColors.icon);
    updateDomColor("--gm-button", targetColors.button);

    updateDomColor("--gm-menu-primary", targetColors.menu_primary);
    updateDomColor("--gm-menu-bg", targetColors.menu_bg);
    updateDomColor("--gm-menu-title", targetColors.menu_title);
    updateDomColor("--gm-menu-subtitle", targetColors.menu_subtitle);
    updateDomColor("--gm-menu-icon", targetColors.menu_icon);
    updateDomColor("--gm-menu-button", targetColors.menu_button);

    window.dispatchEvent(new Event("gm_theme_updated"));
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      
      {/* BANNER PRINCIPAL DE HEADER COM MODO CLARO/ESCURO INTELIGENTE E RESET */}
      <div className={
        isLightMode 
          ? "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white p-6 sm:p-7 rounded-lg border border-orange-400/40 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
          : "bg-zinc-900/95 text-white p-6 sm:p-7 rounded-lg border border-zinc-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
      }>
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-lg bg-white text-[#FF6900] flex items-center justify-center shrink-0 shadow-lg font-black text-xl">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-amber-200 dark:text-amber-400 flex items-center gap-1.5 drop-shadow-xs">
                <Sparkles size={14} /> Tema Laranja CardDigital Padrão
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-extrabold bg-white/20 border border-white/30 text-white">
                Laranja, Branco, Cinza Claro, Cinza Escuro & Preto
              </span>
            </div>
            <p className="text-xs text-white/90 dark:text-zinc-300 font-medium mt-1">
              Personalize individualmente a cor de títulos, subtítulos, ícones e fundos. Alternância inteligente de alto contraste.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
          {/* RESET DE CORES */}
          <button
            type="button"
            onClick={resetToDefaultOrange}
            className="w-full sm:w-auto px-4 py-3 rounded-lg bg-white/20 hover:bg-white/30 border border-white/30 text-white text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            title="Restaurar padrão Laranja Oficial"
          >
            <RotateCcw size={16} /> Resetar Cores
          </button>
        </div>
      </div>

      {/* PALETA BASE DE 8 CORES OFICIAIS (VISUAL CONFORME IMAGEM DE PALETA) */}
      <div className={
        isLightMode
          ? "bg-white p-6 rounded-lg border border-slate-200/90 shadow-sm space-y-4"
          : "bg-[#0B0B0C] p-6 rounded-lg border border-[#26262A] space-y-4 shadow-sm"
      }>
        <div className={
          isLightMode
            ? "flex items-center justify-between border-b border-slate-200 pb-3"
            : "flex items-center justify-between border-b border-[#26262A] pb-3"
        }>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#F65A1A]" />
              Palette
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#8B8B92]">
              Paleta oficial do sistema. Clique em qualquer amostra para aplicar ou copiar.
            </p>
          </div>
          <span className="text-xs font-bold font-mono text-[#F65A1A] bg-[#F65A1A]/10 px-3 py-1 rounded-full border border-[#F65A1A]/30">
            8 CORES SISTÊMICAS
          </span>
        </div>

        {/* GRID DE CARDS DA PALETA IGUAL À IMAGEM DE REFERÊNCIA */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {BASE_ORANGE_PALETTE.map((color) => (
            <div
              key={color.name}
              onClick={() => {
                try {
                  navigator.clipboard.writeText(color.hex);
                } catch (e) {}
              }}
              className="rounded-lg border border-[#26262A] overflow-hidden bg-[#131315] hover:border-[#F65A1A]/70 transition-all cursor-pointer group shadow-sm flex flex-col"
              title={`Clique para copiar ${color.hex}`}
            >
              {/* Bloco Superior com a Cor */}
              <div
                className="h-20 sm:h-24 w-full transition-transform duration-300 group-hover:scale-[1.02] relative"
                style={{ backgroundColor: color.hex }}
              >
                {/* Borda interna sutil para cores claras como Bone */}
                {color.hex === "#F2F2F3" && (
                  <div className="absolute inset-0 border border-slate-300/40 pointer-events-none" />
                )}
              </div>

              {/* Painel Inferior do Card com Nome e Hex */}
              <div className="p-3.5 bg-[#131315] border-t border-[#26262A]/60 flex flex-col justify-center">
                <h4 className="text-sm font-bold text-white group-hover:text-[#F65A1A] transition-colors">
                  {color.name}
                </h4>
                <p className="text-xs font-mono text-[#8B8B92] uppercase mt-0.5 tracking-wider font-semibold">
                  {color.hex}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EDITOR INDIVIDUAL DE CADA COR DO APLICATIVO */}
      <div className={
        isLightMode
          ? "bg-white p-6 sm:p-8 rounded-lg border border-slate-200/90 shadow-sm space-y-6"
          : "bg-zinc-900/90 p-6 sm:p-8 rounded-lg border border-zinc-800 space-y-6 shadow-sm"
      }>
        <div className={
          isLightMode
            ? "flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-5"
            : "flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-5"
        }>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-wider text-[#FF6900] flex items-center gap-2.5">
              <Sliders className="w-5 h-5 text-[#FF6900]" /> 
              Editar Cada Cor do Aplicativo
            </h2>
            <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium mt-1">
              Ajuste precisamente a cor de cada elemento visual. As alterações são aplicadas instantaneamente no modo {isLightMode ? "Claro" : "Escuro"}.
            </p>
          </div>

          <div className={
            isLightMode
              ? "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 self-start sm:self-auto shadow-2xs"
              : "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-200 self-start sm:self-auto"
          }>
            <span>Modo:</span>
            <span className="uppercase font-black text-[#FF6900]">
              {isLightMode ? "Claro Minimalista" : "Escuro OLED"}
            </span>
          </div>
        </div>

        {/* MENSAGENS DE CONFIRMAÇÃO */}
        {savedSuccess && (
          <div className="p-3.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-black flex items-center justify-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 size={16} /> Cor atualizada com sucesso no aplicativo!
          </div>
        )}

        {resetSuccess && (
          <div className="p-3.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-xs font-black flex items-center justify-center gap-2 animate-in fade-in duration-200">
            <RotateCcw size={16} /> Cores resetadas para o padrão oficial Laranja!
          </div>
        )}

        {/* GRID DE CONTROLES DE CORES DO CORPO DO APP */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            1. CORES PRINCIPAIS DO APLICATIVO
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* 1. COR PRIMÁRIA / DESTAQUE */}
            <div className={
              isLightMode
                ? "p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3 shadow-2xs"
                : "p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-3"
            }>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    Cor Primária / Destaque
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Botões principais e badges
                  </span>
                </div>
                <div 
                  className="w-8 h-8 rounded-xl shadow-xs border border-slate-300/80 dark:border-black/20 shrink-0" 
                  style={{ backgroundColor: brandPrimary }}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandPrimary || "#FF6900"}
                  onChange={(e) => handleUpdateSingleColor("primary", e.target.value)}
                  className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0 overflow-hidden shrink-0 shadow-2xs"
                />
                <input
                  type="text"
                  value={brandPrimary || "#FF6900"}
                  onChange={(e) => handleUpdateSingleColor("primary", e.target.value)}
                  className={
                    isLightMode
                      ? "w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold uppercase text-slate-900 shadow-2xs focus:border-[#FF6900] focus:ring-1 focus:ring-[#FF6900]"
                      : "w-full px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-mono font-bold uppercase text-white"
                  }
                />
              </div>
            </div>

            {/* 2. FUNDO DO APLICATIVO */}
            <div className={
              isLightMode
                ? "p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3 shadow-2xs"
                : "p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-3"
            }>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    Fundo do Aplicativo (Canvas)
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Fundo de tela e containers
                  </span>
                </div>
                <div 
                  className="w-8 h-8 rounded-xl shadow-xs border border-slate-300/80 dark:border-black/20 shrink-0" 
                  style={{ backgroundColor: brandBg }}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandBg || "#FFFBF7"}
                  onChange={(e) => handleUpdateSingleColor("bg", e.target.value)}
                  className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0 overflow-hidden shrink-0 shadow-2xs"
                />
                <input
                  type="text"
                  value={brandBg || "#FFFBF7"}
                  onChange={(e) => handleUpdateSingleColor("bg", e.target.value)}
                  className={
                    isLightMode
                      ? "w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold uppercase text-slate-900 shadow-2xs focus:border-[#FF6900] focus:ring-1 focus:ring-[#FF6900]"
                      : "w-full px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-mono font-bold uppercase text-white"
                  }
                />
              </div>
            </div>

            {/* 3. TÍTULOS E CABEÇALHOS */}
            <div className={
              isLightMode
                ? "p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3 shadow-2xs"
                : "p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-3"
            }>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    Títulos e Cabeçalhos
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Títulos H1, H2, H3
                  </span>
                </div>
                <div 
                  className="w-8 h-8 rounded-xl shadow-xs border border-slate-300/80 dark:border-black/20 shrink-0" 
                  style={{ backgroundColor: brandTitle }}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandTitle || "#18181B"}
                  onChange={(e) => handleUpdateSingleColor("title", e.target.value)}
                  className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0 overflow-hidden shrink-0 shadow-2xs"
                />
                <input
                  type="text"
                  value={brandTitle || "#18181B"}
                  onChange={(e) => handleUpdateSingleColor("title", e.target.value)}
                  className={
                    isLightMode
                      ? "w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold uppercase text-slate-900 shadow-2xs focus:border-[#FF6900] focus:ring-1 focus:ring-[#FF6900]"
                      : "w-full px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-mono font-bold uppercase text-white"
                  }
                />
              </div>
            </div>

            {/* 4. SUBTÍTULOS E TEXTOS */}
            <div className={
              isLightMode
                ? "p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3 shadow-2xs"
                : "p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-3"
            }>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    Subtítulos e Parágrafos
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Descrições e labels
                  </span>
                </div>
                <div 
                  className="w-8 h-8 rounded-xl shadow-xs border border-slate-300/80 dark:border-black/20 shrink-0" 
                  style={{ backgroundColor: brandSubtitle }}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandSubtitle || "#475569"}
                  onChange={(e) => handleUpdateSingleColor("subtitle", e.target.value)}
                  className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0 overflow-hidden shrink-0 shadow-2xs"
                />
                <input
                  type="text"
                  value={brandSubtitle || "#475569"}
                  onChange={(e) => handleUpdateSingleColor("subtitle", e.target.value)}
                  className={
                    isLightMode
                      ? "w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold uppercase text-slate-900 shadow-2xs focus:border-[#FF6900] focus:ring-1 focus:ring-[#FF6900]"
                      : "w-full px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-mono font-bold uppercase text-white"
                  }
                />
              </div>
            </div>

            {/* 5. ÍCONES DO SISTEMA */}
            <div className={
              isLightMode
                ? "p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3 shadow-2xs"
                : "p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-3"
            }>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    Ícones do Sistema
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Ícones gerais do app
                  </span>
                </div>
                <div 
                  className="w-8 h-8 rounded-xl shadow-xs border border-slate-300/80 dark:border-black/20 shrink-0" 
                  style={{ backgroundColor: brandIcon }}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandIcon || "#FF6900"}
                  onChange={(e) => handleUpdateSingleColor("icon", e.target.value)}
                  className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0 overflow-hidden shrink-0 shadow-2xs"
                />
                <input
                  type="text"
                  value={brandIcon || "#FF6900"}
                  onChange={(e) => handleUpdateSingleColor("icon", e.target.value)}
                  className={
                    isLightMode
                      ? "w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold uppercase text-slate-900 shadow-2xs focus:border-[#FF6900] focus:ring-1 focus:ring-[#FF6900]"
                      : "w-full px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-mono font-bold uppercase text-white"
                  }
                />
              </div>
            </div>

            {/* 6. COR DE ACENTO */}
            <div className={
              isLightMode
                ? "p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3 shadow-2xs"
                : "p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-3"
            }>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    Cor de Acento / Alertas
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Bordas ativas e realces
                  </span>
                </div>
                <div 
                  className="w-8 h-8 rounded-xl shadow-xs border border-slate-300/80 dark:border-black/20 shrink-0" 
                  style={{ backgroundColor: brandAccent }}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandAccent || "#FF3300"}
                  onChange={(e) => handleUpdateSingleColor("accent", e.target.value)}
                  className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0 overflow-hidden shrink-0 shadow-2xs"
                />
                <input
                  type="text"
                  value={brandAccent || "#FF3300"}
                  onChange={(e) => handleUpdateSingleColor("accent", e.target.value)}
                  className={
                    isLightMode
                      ? "w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold uppercase text-slate-900 shadow-2xs focus:border-[#FF6900] focus:ring-1 focus:ring-[#FF6900]"
                      : "w-full px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-mono font-bold uppercase text-white"
                  }
                />
              </div>
            </div>

          </div>
        </div>

        {/* GRID DE CONTROLES DO MENU LATERAL / SIDEBAR */}
        <div className={
          isLightMode
            ? "space-y-4 pt-4 border-t border-slate-200"
            : "space-y-4 pt-4 border-t border-zinc-800"
        }>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            2. CORES DA BARRA LATERAL / MENU
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. FUNDO DO MENU */}
            <div className={
              isLightMode
                ? "p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3 shadow-2xs"
                : "p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-3"
            }>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    Fundo do Menu
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Sidebar background
                  </span>
                </div>
                <div 
                  className="w-8 h-8 rounded-xl shadow-xs border border-slate-300/80 dark:border-black/20 shrink-0" 
                  style={{ backgroundColor: menuBg }}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={menuBg || "#FF6900"}
                  onChange={(e) => handleUpdateSingleColor("menuBg", e.target.value)}
                  className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0 overflow-hidden shrink-0 shadow-2xs"
                />
                <input
                  type="text"
                  value={menuBg || "#FF6900"}
                  onChange={(e) => handleUpdateSingleColor("menuBg", e.target.value)}
                  className={
                    isLightMode
                      ? "w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold uppercase text-slate-900 shadow-2xs focus:border-[#FF6900] focus:ring-1 focus:ring-[#FF6900]"
                      : "w-full px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-mono font-bold uppercase text-white"
                  }
                />
              </div>
            </div>

            {/* 2. TÍTULO DO MENU */}
            <div className={
              isLightMode
                ? "p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3 shadow-2xs"
                : "p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-3"
            }>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    Título do Menu
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Itens principais
                  </span>
                </div>
                <div 
                  className="w-8 h-8 rounded-xl shadow-xs border border-slate-300/80 dark:border-black/20 shrink-0" 
                  style={{ backgroundColor: menuTitle }}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={menuTitle || "#FFFFFF"}
                  onChange={(e) => handleUpdateSingleColor("menuTitle", e.target.value)}
                  className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0 overflow-hidden shrink-0 shadow-2xs"
                />
                <input
                  type="text"
                  value={menuTitle || "#FFFFFF"}
                  onChange={(e) => handleUpdateSingleColor("menuTitle", e.target.value)}
                  className={
                    isLightMode
                      ? "w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold uppercase text-slate-900 shadow-2xs focus:border-[#FF6900] focus:ring-1 focus:ring-[#FF6900]"
                      : "w-full px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-mono font-bold uppercase text-white"
                  }
                />
              </div>
            </div>

            {/* 3. SUBTÍTULO DO MENU */}
            <div className={
              isLightMode
                ? "p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3 shadow-2xs"
                : "p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-3"
            }>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    Subtítulo do Menu
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Descrições secundárias
                  </span>
                </div>
                <div 
                  className="w-8 h-8 rounded-xl shadow-xs border border-slate-300/80 dark:border-black/20 shrink-0" 
                  style={{ backgroundColor: menuSubtitle }}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={menuSubtitle || "#F8FAFC"}
                  onChange={(e) => handleUpdateSingleColor("menuSubtitle", e.target.value)}
                  className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0 overflow-hidden shrink-0 shadow-2xs"
                />
                <input
                  type="text"
                  value={menuSubtitle || "#F8FAFC"}
                  onChange={(e) => handleUpdateSingleColor("menuSubtitle", e.target.value)}
                  className={
                    isLightMode
                      ? "w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold uppercase text-slate-900 shadow-2xs focus:border-[#FF6900] focus:ring-1 focus:ring-[#FF6900]"
                      : "w-full px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-mono font-bold uppercase text-white"
                  }
                />
              </div>
            </div>

            {/* 4. ÍCONES DO MENU */}
            <div className={
              isLightMode
                ? "p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3 shadow-2xs"
                : "p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-3"
            }>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    Ícones do Menu
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Ícones na barra lateral
                  </span>
                </div>
                <div 
                  className="w-8 h-8 rounded-xl shadow-xs border border-slate-300/80 dark:border-black/20 shrink-0" 
                  style={{ backgroundColor: menuIcon }}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={menuIcon || "#FFFFFF"}
                  onChange={(e) => handleUpdateSingleColor("menuIcon", e.target.value)}
                  className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0 overflow-hidden shrink-0 shadow-2xs"
                />
                <input
                  type="text"
                  value={menuIcon || "#FFFFFF"}
                  onChange={(e) => handleUpdateSingleColor("menuIcon", e.target.value)}
                  className={
                    isLightMode
                      ? "w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold uppercase text-slate-900 shadow-2xs focus:border-[#FF6900] focus:ring-1 focus:ring-[#FF6900]"
                      : "w-full px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-mono font-bold uppercase text-white"
                  }
                />
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* SEÇÃO DA TIPOGRAFIA (FAMÍLIA DE FONTE) */}
      <div className={
        isLightMode
          ? "bg-white p-6 rounded-lg border border-slate-200/90 shadow-sm space-y-4"
          : "bg-zinc-900/90 p-6 rounded-lg border border-zinc-800 space-y-4 shadow-xs"
      }>
        <label className="text-xs font-extrabold uppercase tracking-wider text-[#FF6900] flex items-center gap-2">
          <Type className="w-4 h-4" /> Tipografia Principal do Aplicativo
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                className={`flex items-center justify-center p-3 rounded-lg border-2 transition-all h-12 shadow-2xs hover:shadow-xs cursor-pointer ${
                  isActive
                    ? "border-[#FF6900] bg-[#FF6900]/10 text-[#FF6900] font-bold"
                    : isLightMode
                    ? "border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
                    : "border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-800 text-slate-200"
                }`}
                style={{ fontFamily: font }}
              >
                <span className="text-xs font-semibold truncate">
                  {font}
                </span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
