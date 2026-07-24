import React, { useState } from "react";
import { 
  Paintbrush, 
  Sparkles, 
  Layout, 
  Smartphone, 
  Check, 
  MousePointerClick, 
  Info, 
  Layers, 
  Sliders, 
  Sun, 
  Moon,
  Type,
  Maximize2
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

type ColorKey = 
  | "primary" 
  | "bg" 
  | "title" 
  | "subtitle" 
  | "icon" 
  | "accent" 
  | "menu_primary" 
  | "menu_bg" 
  | "menu_title" 
  | "menu_subtitle" 
  | "menu_icon" 
  | "menu_button";

const PRESET_PALETTES = [
  {
    id: "orange",
    name: "Laranja GM",
    tag: "Padrão Vibrante",
    dot: "#FF6900",
    colors: {
      primary: "#FF6900",
      bg: "#0F1117",
      title: "#FFFFFF",
      subtitle: "#94A3B8",
      icon: "#FF6900",
      accent: "#FF6900",
      menu_primary: "#FF6900",
      menu_bg: "#0F1117",
      menu_title: "#FFFFFF",
      menu_subtitle: "#94A3B8",
      menu_icon: "#FF6900",
      menu_button: "#FF6900",
    }
  },
  {
    id: "blue",
    name: "Azul Tech",
    tag: "Corporativo",
    dot: "#0EA5E9",
    colors: {
      primary: "#0EA5E9",
      bg: "#0B132B",
      title: "#FFFFFF",
      subtitle: "#94A3B8",
      icon: "#38BDF8",
      accent: "#0EA5E9",
      menu_primary: "#0EA5E9",
      menu_bg: "#0F172A",
      menu_title: "#F8FAFC",
      menu_subtitle: "#64748B",
      menu_icon: "#38BDF8",
      menu_button: "#0EA5E9",
    }
  },
  {
    id: "emerald",
    name: "Esmeralda",
    tag: "Moderno",
    dot: "#10B981",
    colors: {
      primary: "#10B981",
      bg: "#06281E",
      title: "#ECFDF5",
      subtitle: "#A7F3D0",
      icon: "#34D399",
      accent: "#059669",
      menu_primary: "#10B981",
      menu_bg: "#021A13",
      menu_title: "#FFFFFF",
      menu_subtitle: "#6EE7B7",
      menu_icon: "#34D399",
      menu_button: "#059669",
    }
  },
  {
    id: "purple",
    name: "Roxo Neon",
    tag: "Elegante",
    dot: "#8B5CF6",
    colors: {
      primary: "#8B5CF6",
      bg: "#180E29",
      title: "#F3E8FF",
      subtitle: "#C084FC",
      icon: "#A855F7",
      accent: "#7C3AED",
      menu_primary: "#8B5CF6",
      menu_bg: "#0F071B",
      menu_title: "#FFFFFF",
      menu_subtitle: "#D8B4FE",
      menu_icon: "#A855F7",
      menu_button: "#7C3AED",
    }
  },
  {
    id: "light_clean",
    name: "Modo Claro",
    tag: "Clean Light",
    dot: "#2563EB",
    colors: {
      primary: "#2563EB",
      bg: "#FFFFFF",
      title: "#0F172A",
      subtitle: "#64748B",
      icon: "#2563EB",
      accent: "#2563EB",
      menu_primary: "#2563EB",
      menu_bg: "#F8FAFC",
      menu_title: "#1E293B",
      menu_subtitle: "#64748B",
      menu_icon: "#2563EB",
      menu_button: "#2563EB",
    }
  },
  {
    id: "dark_chumbo",
    name: "Chumbo Dark",
    tag: "Minimalista",
    dot: "#F97316",
    colors: {
      primary: "#F97316",
      bg: "#18181B",
      title: "#FAFAFA",
      subtitle: "#A1A1AA",
      icon: "#F97316",
      accent: "#F97316",
      menu_primary: "#F97316",
      menu_bg: "#09090B",
      menu_title: "#FFFFFF",
      menu_subtitle: "#71717A",
      menu_icon: "#F97316",
      menu_button: "#F97316",
    }
  }
];

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
  const [activeTab, setActiveTab] = useState<"body" | "menu">("body");
  const [activeHoverKey, setActiveHoverKey] = useState<ColorKey | null>(null);

  const applyPreset = (preset: typeof PRESET_PALETTES[0]) => {
    const c = preset.colors;
    setBrandPrimary(c.primary);
    updateDomColor("--gm-primary", c.primary);

    setBrandBg(c.bg);
    updateDomColor("--gm-bg", c.bg);

    setBrandTitle(c.title);
    updateDomColor("--gm-title", c.title);

    setBrandSubtitle(c.subtitle);
    updateDomColor("--gm-subtitle", c.subtitle);

    setBrandIcon(c.icon);
    updateDomColor("--gm-icon", c.icon);

    setBrandAccent(c.accent);
    updateDomColor("--gm-accent", c.accent);

    setMenuPrimary(c.menu_primary);
    updateDomColor("--gm-menu-primary", c.menu_primary);

    setMenuBg(c.menu_bg);
    updateDomColor("--gm-menu-bg", c.menu_bg);

    setMenuTitle(c.menu_title);
    updateDomColor("--gm-menu-title", c.menu_title);

    setMenuSubtitle(c.menu_subtitle);
    updateDomColor("--gm-menu-subtitle", c.menu_subtitle);

    setMenuIcon(c.menu_icon);
    updateDomColor("--gm-menu-icon", c.menu_icon);

    setMenuButton(c.menu_button);
    updateDomColor("--gm-menu-button", c.menu_button);
  };

  // Safe color validator for hex typing
  const handleHexInput = (
    value: string, 
    setter: (v: string) => void, 
    cssVar: string
  ) => {
    let clean = value.trim();
    if (!clean.startsWith("#") && clean.length > 0) {
      clean = "#" + clean;
    }
    setter(clean);
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
      updateDomColor(cssVar, clean);
    }
  };

  // Config cards definitions with explicit target explanations
  const bodyColorItems = [
    {
      key: "primary" as ColorKey,
      label: "Cor Principal",
      badge: "Destaques & Badges",
      cssVar: "--gm-primary",
      value: brandPrimary,
      setter: setBrandPrimary,
      description: "Define a cor de destaque principal, bordas ativas, tags, barras de progresso e seleções do app.",
      targetLocation: "Bordas ativas, selos de destaque, barras de progresso e focos no conteúdo."
    },
    {
      key: "bg" as ColorKey,
      label: "Cor de Fundo",
      badge: "Fundo das Páginas",
      cssVar: "--gm-bg",
      value: brandBg,
      setter: setBrandBg,
      description: "Define o plano de fundo geral das telas, container e cards de conteúdo.",
      targetLocation: "Fundo principal de todas as páginas e painéis de trabalho."
    },
    {
      key: "title" as ColorKey,
      label: "Cor dos Títulos",
      badge: "Textos Fortes / H1-H3",
      cssVar: "--gm-title",
      value: brandTitle,
      setter: setBrandTitle,
      description: "Aplica-se aos títulos de seções, cabeçalhos, nome de clientes e labels em negrito.",
      targetLocation: "Títulos H1, H2, H3, nomes de seções e textos com maior hierarquia visual."
    },
    {
      key: "subtitle" as ColorKey,
      label: "Cor dos Subtítulos",
      badge: "Textos Secundários",
      cssVar: "--gm-subtitle",
      value: brandSubtitle,
      setter: setBrandSubtitle,
      description: "Aplica-se a descrições auxiliares, datas, legendas de gráficos e rótulos de campos.",
      targetLocation: "Textos de apoio, legendas, placeholders, datas e estatísticas secundárias."
    },
    {
      key: "icon" as ColorKey,
      label: "Cor dos Ícones",
      badge: "Símbolos do Conteúdo",
      cssVar: "--gm-icon",
      value: brandIcon,
      setter: setBrandIcon,
      description: "Aplica-se aos ícones utilitários dentro dos formulários e tabelas do aplicativo.",
      targetLocation: "Ícones de formulários, botões secundários, avisos e detalhes no conteúdo."
    },
    {
      key: "accent" as ColorKey,
      label: "Cor dos Botões",
      badge: "Botões de Ação Principal",
      cssVar: "--gm-accent",
      value: brandAccent,
      setter: setBrandAccent,
      description: "Define a cor de fundo dos botões primários de confirmação e ações principais.",
      targetLocation: "Botões de Salvar, Confirmar, Criar Novo e ações de destaque."
    },
  ];

  const menuColorItems = [
    {
      key: "menu_primary" as ColorKey,
      label: "Cor Principal do Menu",
      badge: "Item Selecionado",
      cssVar: "--gm-menu-primary",
      value: menuPrimary,
      setter: setMenuPrimary,
      description: "Indica visualmente a página atual e a barra lateral de navegação ativa.",
      targetLocation: "Fundo do item selecionado no menu e linha indicadora vertical da barra lateral."
    },
    {
      key: "menu_bg" as ColorKey,
      label: "Cor de Fundo do Menu",
      badge: "Fundo da Sidebar",
      cssVar: "--gm-menu-bg",
      value: menuBg,
      setter: setMenuBg,
      description: "Plano de fundo exclusivo da barra lateral de navegação no lado esquerdo.",
      targetLocation: "Plano de fundo completo do menu lateral fixo."
    },
    {
      key: "menu_title" as ColorKey,
      label: "Cor dos Títulos do Menu",
      badge: "Nomes de Páginas",
      cssVar: "--gm-menu-title",
      value: menuTitle,
      setter: setMenuTitle,
      description: "Aplica-se ao nome das opções de navegação (Início, Orçamentos, Clientes, etc).",
      targetLocation: "Texto principal de cada botão do menu lateral e logo da empresa."
    },
    {
      key: "menu_subtitle" as ColorKey,
      label: "Cor dos Subtítulos do Menu",
      badge: "Legendas do Menu",
      cssVar: "--gm-menu-subtitle",
      value: menuSubtitle,
      setter: setMenuSubtitle,
      description: "Textos auxiliares da barra lateral (email do usuário, rodapé 'Desenvolvido por').",
      targetLocation: "Rodapé da barra lateral, email de login e observações secundárias do menu."
    },
    {
      key: "menu_icon" as ColorKey,
      label: "Cor dos Ícones do Menu",
      badge: "Ícones de Navegação",
      cssVar: "--gm-menu-icon",
      value: menuIcon,
      setter: setMenuIcon,
      description: "Aplica-se aos ícones posicionados ao lado de cada link da barra lateral.",
      targetLocation: "Ícones de casinha, pasta, usuário, cifrão e engrenagem no menu."
    },
    {
      key: "menu_button" as ColorKey,
      label: "Cor dos Botões do Menu",
      badge: "Botões do Rodapé",
      cssVar: "--gm-menu-button",
      value: menuButton,
      setter: setMenuButton,
      description: "Aplica-se aos botões inferiores da barra lateral (Tema Claro/Escuro, Sair).",
      targetLocation: "Botões de alternar tema, suporte, atualizações e fechar sessão na barra lateral."
    },
  ];

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      
      {/* 1. INDICADOR DE MODO DE TEMA */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
        isLightMode 
          ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200" 
          : "bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
            isLightMode ? "bg-amber-500 text-white" : "bg-blue-500 text-white"
          }`}>
            {isLightMode ? <Sun className="w-5 h-5 animate-spin-slow" /> : <Moon className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider">
                {isLightMode ? "Modo Claro Ativo" : "Modo Escuro Ativo"}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/40 dark:bg-black/30 border border-current/20">
                Personalização Ativa
              </span>
            </div>
            <p className="text-xs opacity-90 leading-normal font-medium mt-0.5">
              {isLightMode
                ? "Você está configurando a paleta exclusiva para o Modo Claro. Suas escolhas serão salvas e mantidas para o tema claro."
                : "Você está configurando a paleta exclusiva para o Modo Escuro. Suas escolhas serão salvas e mantidas para o tema escuro."
              }
            </p>
          </div>
        </div>
      </div>

      {/* 2. SIMULADOR INTERATIVO EM TEMPO REAL (MOCKUP LIVE APP) */}
      <div className="bg-slate-900 dark:bg-slate-950 p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl overflow-hidden text-white relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-[var(--gm-primary)] animate-pulse" />
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-200">
              Simulador em Tempo Real – Guia Visual de Onde Vai Cada Cor
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
            <MousePointerClick className="w-3 h-3 text-[var(--gm-primary)]" />
            Passe o mouse nas opções abaixo para destacar o elemento
          </span>
        </div>

        {/* INTERACTIVE MINI APP LAYOUT */}
        <div className="grid grid-cols-12 gap-3 min-h-[190px] rounded-2xl overflow-hidden p-2 bg-black/40 border border-slate-800/80">
          
          {/* MOCK SIDEBAR (4 cols) */}
          <div 
            onClick={() => setActiveTab("menu")}
            style={{ backgroundColor: menuBg }}
            className={`col-span-5 sm:col-span-4 p-3 rounded-xl border flex flex-col justify-between transition-all duration-300 relative cursor-pointer group/side ${
              activeHoverKey?.startsWith("menu_") 
                ? "border-[var(--gm-primary)] ring-2 ring-[var(--gm-primary)] shadow-[0_0_20px_var(--gm-primary)]" 
                : "border-slate-700/60"
            }`}
          >
            {/* Target Label Badge if active */}
            {activeHoverKey?.startsWith("menu_") && (
              <div className="absolute -top-3 left-2 bg-[var(--gm-primary)] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md animate-bounce z-20">
                📍 {menuColorItems.find(i => i.key === activeHoverKey)?.badge || "Menu Lateral"}
              </div>
            )}

            <div className="space-y-2.5">
              {/* Header Logo */}
              <div className="flex items-center gap-1.5 border-b border-white/10 pb-2">
                <div 
                  style={{ backgroundColor: menuIcon }}
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-transform ${
                    activeHoverKey === "menu_icon" ? "scale-125 ring-2 ring-white" : ""
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div className="min-w-0">
                  <div 
                    style={{ color: menuTitle }} 
                    className={`text-[10px] font-black leading-none truncate ${
                      activeHoverKey === "menu_title" ? "underline font-mono" : ""
                    }`}
                  >
                    CardDigital GM
                  </div>
                  <div 
                    style={{ color: menuSubtitle }} 
                    className={`text-[8px] opacity-80 leading-tight truncate ${
                      activeHoverKey === "menu_subtitle" ? "font-mono underline" : ""
                    }`}
                  >
                    Painel Pro
                  </div>
                </div>
              </div>

              {/* Active Menu Item */}
              <div 
                style={{ 
                  backgroundColor: `${menuPrimary}25`, 
                  borderColor: menuPrimary 
                }}
                className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all ${
                  activeHoverKey === "menu_primary" ? "ring-2 ring-white scale-105" : ""
                }`}
              >
                <div 
                  style={{ backgroundColor: menuPrimary }} 
                  className="w-1 h-3 rounded-full" 
                />
                <div 
                  style={{ color: menuIcon }} 
                  className="w-3 h-3 flex items-center justify-center"
                >
                  <Layout className="w-3 h-3" />
                </div>
                <span 
                  style={{ color: menuTitle }} 
                  className="text-[9px] font-bold truncate"
                >
                  Início
                </span>
              </div>

              {/* Inactive Menu Item */}
              <div className="flex items-center gap-2 p-1.5 rounded-lg opacity-70">
                <div 
                  style={{ color: menuSubtitle }} 
                  className="w-3 h-3 flex items-center justify-center"
                >
                  <Smartphone className="w-3 h-3" />
                </div>
                <span 
                  style={{ color: menuSubtitle }} 
                  className="text-[9px] font-medium truncate"
                >
                  Orçamentos
                </span>
              </div>
            </div>

            {/* Sidebar Footer Button */}
            <div 
              style={{ 
                backgroundColor: `${menuButton}20`, 
                borderColor: menuButton,
                color: menuTitle 
              }}
              className={`p-1.5 rounded-lg border text-[8px] font-bold text-center mt-2 flex items-center justify-center gap-1 ${
                activeHoverKey === "menu_button" ? "ring-2 ring-white scale-105" : ""
              }`}
            >
              <Sun className="w-2.5 h-2.5" /> Alternar Tema
            </div>
          </div>

          {/* MOCK MAIN CONTENT BODY (7 cols) */}
          <div 
            onClick={() => setActiveTab("body")}
            style={{ backgroundColor: brandBg }}
            className={`col-span-7 sm:col-span-8 p-3 rounded-xl border flex flex-col justify-between transition-all duration-300 relative cursor-pointer ${
              !activeHoverKey?.startsWith("menu_") && activeHoverKey !== null
                ? "border-[var(--gm-primary)] ring-2 ring-[var(--gm-primary)] shadow-[0_0_20px_var(--gm-primary)]" 
                : "border-slate-700/60"
            }`}
          >
            {/* Target Label Badge if active */}
            {!activeHoverKey?.startsWith("menu_") && activeHoverKey !== null && (
              <div className="absolute -top-3 left-2 bg-[var(--gm-primary)] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md animate-bounce z-20">
                📍 {bodyColorItems.find(i => i.key === activeHoverKey)?.badge || "Conteúdo Principal"}
              </div>
            )}

            <div className="space-y-2">
              {/* Header Title & Subtitle */}
              <div className="flex items-center justify-between border-b border-slate-700/40 pb-1.5">
                <div>
                  <div 
                    style={{ color: brandTitle }} 
                    className={`text-[11px] font-extrabold leading-tight ${
                      activeHoverKey === "title" ? "underline font-mono" : ""
                    }`}
                  >
                    Dashboard da Empresa
                  </div>
                  <div 
                    style={{ color: brandSubtitle }} 
                    className={`text-[8px] leading-tight ${
                      activeHoverKey === "subtitle" ? "underline font-mono" : ""
                    }`}
                  >
                    Resumo de orçamentos e clientes ativas
                  </div>
                </div>

                <div 
                  style={{ 
                    backgroundColor: `${brandPrimary}20`, 
                    color: brandPrimary,
                    borderColor: `${brandPrimary}50`
                  }}
                  className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${
                    activeHoverKey === "primary" ? "ring-2 ring-white scale-110" : ""
                  }`}
                >
                  Ativo
                </div>
              </div>

              {/* Sample Content Card */}
              <div 
                style={{ 
                  backgroundColor: isLightMode ? "#FFFFFF" : "#1E293B",
                  borderColor: `${brandPrimary}40`
                }}
                className="p-2 rounded-lg border space-y-1.5 shadow-xs"
              >
                <div className="flex items-center gap-1.5">
                  <div 
                    style={{ color: brandIcon }} 
                    className={`p-1 rounded-md bg-black/10 dark:bg-white/10 ${
                      activeHoverKey === "icon" ? "ring-2 ring-[var(--gm-primary)] scale-125" : ""
                    }`}
                  >
                    <Sliders className="w-3 h-3" />
                  </div>
                  <span 
                    style={{ color: brandTitle }} 
                    className="text-[9px] font-bold"
                  >
                    Painel de Indicadores
                  </span>
                </div>
                <p 
                  style={{ color: brandSubtitle }} 
                  className="text-[8px] line-clamp-1 opacity-90"
                >
                  Veja as estatísticas em tempo real com as cores personalizadas.
                </p>
              </div>
            </div>

            {/* Main Action Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                style={{ 
                  backgroundColor: brandAccent, 
                  color: "#FFFFFF" 
                }}
                className={`px-3 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1 shadow-md transition-all ${
                  activeHoverKey === "accent" ? "ring-2 ring-white scale-110" : ""
                }`}
              >
                <Check className="w-2.5 h-2.5" /> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PALETAS RÁPIDAS EM 1-CLIQUE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--gm-primary)] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> Paletas Prontas (Aplique em 1 Clique)
          </label>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            Altera automaticamente todas as cores em sintonia
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {PRESET_PALETTES.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="flex flex-col items-center p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white hover:bg-slate-50 dark:bg-slate-800/80 dark:hover:bg-slate-800 shadow-xs hover:shadow-sm transition-all duration-200 text-left cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 mb-1.5 w-full justify-between">
                <span 
                  className="w-4 h-4 rounded-full shadow-inner border border-black/10 shrink-0 group-hover:scale-110 transition-transform" 
                  style={{ backgroundColor: preset.dot }} 
                />
                <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">
                  {preset.tag}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate w-full text-center">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. SELEÇÃO DE SEÇÃO DE CORES (TABS) */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-700/60 pb-3 pt-2">
        <button
          type="button"
          onClick={() => setActiveTab("body")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "body"
              ? "bg-[var(--gm-primary)] text-white shadow-md scale-[1.02]"
              : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Paintbrush className="w-4 h-4" /> Cores do Conteúdo & Páginas
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("menu")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "menu"
              ? "bg-[var(--gm-primary)] text-white shadow-md scale-[1.02]"
              : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Layout className="w-4 h-4" /> Cores do Menu Lateral (Sidebar)
        </button>
      </div>

      {/* 5. GRID DE CARDS DE COR INDIVIDUAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {(activeTab === "body" ? bodyColorItems : menuColorItems).map((item) => (
          <div
            key={item.key}
            onMouseEnter={() => setActiveHoverKey(item.key)}
            onMouseLeave={() => setActiveHoverKey(null)}
            className={`p-3.5 rounded-2xl border transition-all duration-200 bg-white dark:bg-slate-800/80 flex flex-col justify-between shadow-xs hover:shadow-md ${
              activeHoverKey === item.key 
                ? "border-[var(--gm-primary)] ring-2 ring-[var(--gm-primary)]/30 scale-[1.01]" 
                : "border-slate-200/80 dark:border-slate-700/60"
            }`}
          >
            <div>
              {/* Header with Title and Target Badge */}
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 truncate">
                  {item.label}
                </span>
                <span className="text-[10px] font-black text-[var(--gm-primary)] bg-[var(--gm-primary)]/10 px-2 py-0.5 rounded-full border border-[var(--gm-primary)]/20 shrink-0">
                  {item.badge}
                </span>
              </div>

              {/* Explanatory description of where the color goes */}
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug mb-3">
                {item.description}
              </p>
            </div>

            {/* Color Swatch & Hex Code Input */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center gap-2.5">
              {/* Swatch Button opening browser color picker */}
              <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-600 shadow-xs shrink-0 cursor-pointer group">
                <input
                  type="color"
                  value={item.value || "#000000"}
                  onChange={(e) => {
                    const v = e.target.value;
                    item.setter(v);
                    updateDomColor(item.cssVar, v);
                  }}
                  className="absolute -top-3 -left-3 w-16 h-16 cursor-pointer opacity-0 z-10"
                />
                <div 
                  className="w-full h-full flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: item.value }}
                >
                  <Paintbrush className="w-4 h-4 text-white drop-shadow-md opacity-80" />
                </div>
              </div>

              {/* Direct Hex Code Text Box */}
              <div className="flex-1 min-w-0">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                  Código Hex
                </label>
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => handleHexInput(e.target.value, item.setter, item.cssVar)}
                  placeholder="#000000"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:border-[var(--gm-primary)] outline-none uppercase"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 6. FAMÍLIA DE FONTE */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-slate-700/60 space-y-3">
        <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--gm-primary)] flex items-center gap-1.5">
          <Type className="w-4 h-4" /> Tipografia Principal (Família de Fonte)
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            "Inter",
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
                className={`flex items-center justify-center p-3 rounded-xl border-2 transition-all h-12 shadow-xs hover:shadow-sm cursor-pointer ${
                  isActive
                    ? "border-[var(--gm-primary)] bg-[var(--gm-primary)]/10 text-[var(--gm-primary)] font-bold"
                    : "border-slate-200/80 dark:border-slate-700/60 bg-white hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                }`}
                style={{ fontFamily: font }}
              >
                <span className="text-sm font-medium truncate">
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
