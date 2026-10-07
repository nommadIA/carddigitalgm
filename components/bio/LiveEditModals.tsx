import React, { useState, useEffect } from "react";
import { 
  X, 
  Upload, 
  Check, 
  Trash2, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Palette, 
  Sparkles, 
  Phone, 
  Mail, 
  MapPin, 
  MessageCircle, 
  Instagram, 
  Send, 
  DollarSign, 
  Plus, 
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Monitor,
  Smartphone
} from "lucide-react";
import { uploadBioAsset } from "../../services/storageService";
import { pushToast } from "../../store/toast";

// Common Modal Wrapper
function ModalWrapper({
  title,
  subtitle,
  isOpen,
  onClose,
  children,
  maxWidth = "max-w-xl"
}: {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className={`w-full ${maxWidth} max-h-[90vh] rounded-[2rem] fora border border-white/10 text-white shadow-2xl flex flex-col overflow-hidden my-auto animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#161722]">
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2 text-white">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {children}
        </div>
      </div>
    </div>
  );
}

// 1. HERO BANNER & TEXT MODAL
export function HeroEditModal({
  isOpen,
  onClose,
  tenantId,
  data,
  onUpdate
}: {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
  data: any;
  onUpdate: (updates: {
    hero_title?: string;
    description?: string;
    description_align?: "left" | "center" | "right";
    description_bold?: boolean;
    description_italic?: boolean;
    description_font?: string;
    description_size?: string;
    hero_button_label?: string;
    hero_button_action?: string;
    banner_img_url_1?: string;
    mobile_banner_img_url_1?: string;
  }) => void;
}) {
  const bio = data?.bio_config || data || {};
  const [heroTitle, setHeroTitle] = useState(bio.hero_title || bio.title || data?.company_name || "");
  const [heroDesc, setHeroDesc] = useState(bio.description || "");
  const [bannerDesktop, setBannerDesktop] = useState(bio.banner_img_url_1 || bio.desktop_banner_img_url || bio.banner_url || "");
  const [bannerMobile, setBannerMobile] = useState(bio.mobile_banner_img_url_1 || "");
  const [buttonLabel, setButtonLabel] = useState(bio.hero_button_label || "Conheça nossos Serviços");
  const [descAlign, setDescAlign] = useState<"left" | "center" | "right">(bio.description_align || "left");
  const [descBold, setDescBold] = useState(!!bio.description_bold);
  const [descItalic, setDescItalic] = useState(!!bio.description_italic);
  const [descSize, setDescSize] = useState(bio.description_size || "16 pt");
  const [descFont, setDescFont] = useState(bio.description_font || "ui");

  useEffect(() => {
    if (isOpen) {
      const b = data?.bio_config || data || {};
      setHeroTitle(b.hero_title || b.title || data?.company_name || "");
      setHeroDesc(b.description || "");
      setBannerDesktop(b.banner_img_url_1 || b.desktop_banner_img_url || b.banner_url || "");
      setBannerMobile(b.mobile_banner_img_url_1 || "");
      setButtonLabel(b.hero_button_label || "Conheça nossos Serviços");
      setDescAlign(b.description_align || "left");
      setDescBold(!!b.description_bold);
      setDescItalic(!!b.description_italic);
      setDescSize(b.description_size || "16 pt");
      setDescFont(b.description_font || "ui");
    }
  }, [isOpen, data]);

  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);

  const handleDesktopFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDesktop(true);
    try {
      const url = await uploadBioAsset(tenantId, file, "hero_desktop");
      setBannerDesktop(url);
      onUpdate({ banner_img_url_1: url });
      pushToast({ type: "success", title: "Banner carregado!", message: "Imagem do banner atualizada." });
    } catch (err: any) {
      console.error(err);
      pushToast({ type: "error", title: "Erro no upload", message: err.message || "Falha ao enviar banner." });
    } finally {
      setUploadingDesktop(false);
    }
  };

  const handleMobileFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMobile(true);
    try {
      const url = await uploadBioAsset(tenantId, file, "hero_mobile");
      setBannerMobile(url);
      onUpdate({ mobile_banner_img_url_1: url });
      pushToast({ type: "success", title: "Banner mobile carregado!", message: "Imagem mobile atualizada." });
    } catch (err: any) {
      console.error(err);
      pushToast({ type: "error", title: "Erro no upload", message: err.message || "Falha ao enviar banner." });
    } finally {
      setUploadingMobile(false);
    }
  };

  const handleApply = () => {
    onUpdate({
      hero_title: heroTitle,
      description: heroDesc,
      banner_img_url_1: bannerDesktop,
      mobile_banner_img_url_1: bannerMobile,
      hero_button_label: buttonLabel,
      description_align: descAlign,
      description_bold: descBold,
      description_italic: descItalic,
      description_size: descSize,
      description_font: descFont,
    });
    onClose();
  };

  return (
    <ModalWrapper
      title="Editar Banner Principal & Apresentação"
      subtitle="Altere a imagem de fundo, título e texto de destaque do seu site em tempo real"
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        
        {/* Banner Images */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Imagem do Banner (Fundo)
          </label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Desktop Banner */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Versão Computador (Desktop)</span>
              </div>
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center group">
                {bannerDesktop ? (
                  <img src={bannerDesktop} alt="Banner Desktop" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-3 text-slate-500 text-xs">
                    <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    Sem imagem definida
                  </div>
                )}
                
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer p-2">
                  <Upload className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">{uploadingDesktop ? "Enviando..." : "Trocar Imagem"}</span>
                  <input type="file" accept="image/*,video/mp4" className="hidden" onChange={handleDesktopFile} disabled={uploadingDesktop} />
                </label>
              </div>
              <input
                type="text"
                placeholder="Ou cole a URL da imagem..."
                value={bannerDesktop}
                onChange={(e) => {
                  setBannerDesktop(e.target.value);
                  onUpdate({ banner_img_url_1: e.target.value });
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-[#FE540B]"
              />
            </div>

            {/* Mobile Banner */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Versão Celular (Opcional)</span>
              </div>
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center group">
                {bannerMobile || bannerDesktop ? (
                  <img src={bannerMobile || bannerDesktop} alt="Banner Mobile" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-3 text-slate-500 text-xs">
                    <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    Usa o desktop por padrão
                  </div>
                )}
                
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer p-2">
                  <Upload className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">{uploadingMobile ? "Enviando..." : "Trocar Imagem Mobile"}</span>
                  <input type="file" accept="image/*,video/mp4" className="hidden" onChange={handleMobileFile} disabled={uploadingMobile} />
                </label>
              </div>
              <input
                type="text"
                placeholder="URL para celular (opcional)..."
                value={bannerMobile}
                onChange={(e) => {
                  setBannerMobile(e.target.value);
                  onUpdate({ mobile_banner_img_url_1: e.target.value });
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-[#FE540B]"
              />
            </div>
          </div>
        </div>

        {/* Hero Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Título Principal
          </label>
          <input
            type="text"
            value={heroTitle}
            onChange={(e) => {
              setHeroTitle(e.target.value);
              onUpdate({ hero_title: e.target.value });
            }}
            placeholder="Ex: GM edificação"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-[#FE540B]"
          />
        </div>

        {/* Hero Description & Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Texto de Apresentação / Slogan
            </label>
            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setDescBold(!descBold);
                  onUpdate({ description_bold: !descBold });
                }}
                className={`p-1.5 rounded transition-colors ${descBold ? 'bg-[#FE540B] text-white' : 'text-slate-400 hover:text-white'}`}
                title="Negrito"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDescItalic(!descItalic);
                  onUpdate({ description_italic: !descItalic });
                }}
                className={`p-1.5 rounded transition-colors ${descItalic ? 'bg-[#FE540B] text-white' : 'text-slate-400 hover:text-white'}`}
                title="Itálico"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-3.5 bg-white/20 mx-0.5" />
              <button
                type="button"
                onClick={() => {
                  setDescAlign("left");
                  onUpdate({ description_align: "left" });
                }}
                className={`p-1.5 rounded transition-colors ${descAlign === "left" ? 'bg-[#FE540B] text-white' : 'text-slate-400 hover:text-white'}`}
                title="Alinhar à esquerda"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDescAlign("center");
                  onUpdate({ description_align: "center" });
                }}
                className={`p-1.5 rounded transition-colors ${descAlign === "center" ? 'bg-[#FE540B] text-white' : 'text-slate-400 hover:text-white'}`}
                title="Centralizar"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDescAlign("right");
                  onUpdate({ description_align: "right" });
                }}
                className={`p-1.5 rounded transition-colors ${descAlign === "right" ? 'bg-[#FE540B] text-white' : 'text-slate-400 hover:text-white'}`}
                title="Alinhar à direita"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <textarea
            rows={5}
            value={heroDesc}
            onChange={(e) => {
              setHeroDesc(e.target.value);
              onUpdate({ description: e.target.value });
            }}
            placeholder="Apresente sua empresa de forma impactante..."
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-sm text-slate-200 outline-none focus:border-[#FE540B] leading-relaxed"
          />

          {/* Size & Font selectors */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Tamanho do Texto</label>
              <select
                value={descSize}
                onChange={(e) => {
                  setDescSize(e.target.value);
                  onUpdate({ description_size: e.target.value });
                }}
                className="w-full bg-[#1c1d28] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
              >
                <option value="12 pt">Pequeno (12 pt)</option>
                <option value="14 pt">Médio (14 pt)</option>
                <option value="16 pt">Padrão (16 pt)</option>
                <option value="18 pt">Grande (18 pt)</option>
                <option value="20 pt">Muito Grande (20 pt)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Fonte da Apresentação</label>
              <select
                value={descFont}
                onChange={(e) => {
                  setDescFont(e.target.value);
                  onUpdate({ description_font: e.target.value });
                }}
                className="w-full bg-[#1c1d28] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
              >
                <option value="ui">Inter / Padrão</option>
                <option value="modern">Plus Jakarta Sans</option>
                <option value="elegant">Raleway</option>
                <option value="funnel">Funnel Display</option>
                <option value="classic">Montserrat</option>
                <option value="tech">JetBrains Mono</option>
              </select>
            </div>
          </div>
        </div>

        {/* Hero CTA Button */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Botão de Ação Principal
          </label>
          <input
            type="text"
            value={buttonLabel}
            onChange={(e) => {
              setButtonLabel(e.target.value);
              onUpdate({ hero_button_label: e.target.value });
            }}
            placeholder="Ex: Conheça nossos Serviços"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-[#FE540B]"
          />
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-[#FE540B] hover:bg-[#ff6d29] text-white text-xs font-bold transition-colors shadow-lg cursor-pointer"
          >
            Aplicar Alterações
          </button>
        </div>

      </div>
    </ModalWrapper>
  );
}

// 2. LOGO AND IDENTITY MODAL
export function LogoModal({
  isOpen,
  onClose,
  tenantId,
  companyName,
  logoUrl,
  onUpdate
}: {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
  companyName: string;
  logoUrl: string;
  onUpdate: (updates: { company_name?: string; company_logo_url?: string; website_logo_url?: string; logo_url?: string }) => void;
}) {
  const [name, setName] = useState(companyName || "");
  const [logo, setLogo] = useState(logoUrl || "");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(companyName || "");
      setLogo(logoUrl || "");
    }
  }, [isOpen, companyName, logoUrl]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadBioAsset(tenantId, file, "logo");
      setLogo(url);
      onUpdate({ website_logo_url: url, logo_url: url });
      pushToast({ type: "success", title: "Logo do Website atualizado!", message: "Sua logomarca exclusiva do site está pronta." });
    } catch (err: any) {
      console.error(err);
      pushToast({ type: "error", title: "Erro no upload", message: err.message || "Falha ao enviar logo." });
    } finally {
      setUploading(false);
    }
  };

  const handleApply = () => {
    onUpdate({ company_name: name, website_logo_url: logo, logo_url: logo });
    onClose();
  };

  return (
    <ModalWrapper
      title="Logomarca do Website"
      subtitle="Atualize o logotipo exclusivo para exibição no seu website (não altera a logomarca do aplicativo interno)"
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="space-y-5">
        
        {/* Logo preview and upload */}
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-black/30 border border-white/10 gap-4">
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center p-2 shadow-inner group">
            {logo ? (
              <img src={logo} alt="Logo da Empresa" className="w-full h-full object-contain" />
            ) : (
              <ImageIcon className="w-10 h-10 text-slate-500" />
            )}

            <label className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer">
              <Upload className="w-5 h-5 mb-1 text-[#FE540B]" />
              <span className="text-[10px] font-bold">{uploading ? "Enviando..." : "Substituir"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-[#FE540B]" />
            <span>{uploading ? "Carregando..." : "Fazer Upload de Logo"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>

        {/* Company Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Nome da Empresa / Marca
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              onUpdate({ company_name: e.target.value });
            }}
            placeholder="Ex: GM edificação"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-[#FE540B]"
          />
        </div>

        {/* Direct URL */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-slate-400">Ou cole o link direto da imagem:</label>
          <input
            type="text"
            value={logo}
            onChange={(e) => {
              setLogo(e.target.value);
              onUpdate({ website_logo_url: e.target.value, logo_url: e.target.value });
            }}
            placeholder="https://..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-[#FE540B]"
          />
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-[#FE540B] hover:bg-[#ff6d29] text-white text-xs font-bold transition-colors shadow-lg cursor-pointer"
          >
            Salvar
          </button>
        </div>

      </div>
    </ModalWrapper>
  );
}

// 3. THEME & COLORS MODAL
export function ThemeColorsModal({
  isOpen,
  onClose,
  brandColor,
  theme,
  buttonStyle,
  onUpdate
}: {
  isOpen: boolean;
  onClose: () => void;
  brandColor: string;
  theme: string;
  buttonStyle?: string;
  onUpdate: (updates: { brand_primary?: string; theme?: string; button_style?: string }) => void;
}) {
  const [activeColor, setActiveColor] = useState(brandColor || "#FE540B");
  const [activeTheme, setActiveTheme] = useState(theme || "dark");
  const [activeBtnStyle, setActiveBtnStyle] = useState(buttonStyle || "vazado");

  useEffect(() => {
    if (isOpen) {
      setActiveColor(brandColor || "#FE540B");
      setActiveTheme(theme || "dark");
      setActiveBtnStyle(buttonStyle || "vazado");
    }
  }, [isOpen, brandColor, theme, buttonStyle]);

  const presetColors = [
    { name: "Laranja GM", hex: "#FE540B" },
    { name: "Verde Esmeralda", hex: "#10B981" },
    { name: "Azul Royal", hex: "#2563EB" },
    { name: "Ciano Neon", hex: "#06B6D4" },
    { name: "Roxo Elétrico", hex: "#8B5CF6" },
    { name: "Rosa Choque", hex: "#EC4899" },
    { name: "Dourado", hex: "#F59E0B" },
    { name: "Grafite", hex: "#4B5563" },
  ];

  const handleColorChange = (hex: string) => {
    setActiveColor(hex);
    onUpdate({ brand_primary: hex });
  };

  const handleThemeChange = (thm: string) => {
    setActiveTheme(thm);
    onUpdate({ theme: thm });
  };

  return (
    <ModalWrapper
      title="Cores, Tema & Estilo"
      subtitle="Personalize a identidade visual e o estilo do seu site"
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="space-y-6">
        
        {/* Brand Color */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Cor Principal da Marca (Destaque)
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-2.5">
            {presetColors.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => handleColorChange(c.hex)}
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-xs font-medium cursor-pointer ${
                  activeColor.toLowerCase() === c.hex.toLowerCase()
                    ? "border-white bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.15)] text-white font-bold"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                <span className="w-4 h-4 rounded-full shrink-0 shadow" style={{ backgroundColor: c.hex }} />
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-slate-400">Personalizado:</span>
            <input
              type="color"
              value={activeColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border border-white/20"
            />
            <input
              type="text"
              value={activeColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-28 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono uppercase"
            />
          </div>
        </div>

        {/* Theme */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Modo de Exibição do Site
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "dark", label: "Escuro (Dark)", desc: "Fundo preto e grafite profundo" },
              { key: "glass", label: "Vidro Fosco", desc: "Efeito translúcido sofisticado" },
              { key: "light", label: "Claro (Light)", desc: "Fundo branco elegante" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => handleThemeChange(t.key)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTheme === t.key
                    ? "border-[#FE540B] bg-[#FE540B]/10 text-white font-bold"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                <div className="text-xs font-bold">{t.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Button Style */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Estilo dos Botões
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "vazado", label: "Vazado", desc: "Borda colorida e fundo translúcido" },
              { key: "solid", label: "Sólido", desc: "Cor cheia com alto contraste" },
              { key: "glass", label: "Vidro", desc: "Efeito fosco moderno" },
            ].map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => {
                  setActiveBtnStyle(b.key);
                  onUpdate({ button_style: b.key });
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activeBtnStyle === b.key
                    ? "border-[#FE540B] bg-[#FE540B]/10 text-white font-bold"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                <div className="text-xs font-bold">{b.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{b.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#FE540B] hover:bg-[#ff6d29] text-white text-xs font-bold transition-colors shadow-lg cursor-pointer"
          >
            Concluir
          </button>
        </div>

      </div>
    </ModalWrapper>
  );
}

// 4. CONTACTS & SOCIAL MODAL
export function ContactsModal({
  isOpen,
  onClose,
  data,
  onUpdate
}: {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onUpdate: (updates: {
    whatsapp?: string;
    instagram?: string;
    telegram?: string;
    email?: string;
    phone?: string;
    address?: string;
    address_url?: string;
  }) => void;
}) {
  const bio = data?.bio_config || data || {};
  const [whatsapp, setWhatsapp] = useState(bio.whatsapp || "");
  const [instagram, setInstagram] = useState(bio.instagram || "");
  const [telegram, setTelegram] = useState(bio.telegram || "");
  const [email, setEmail] = useState(bio.email || "");
  const [phone, setPhone] = useState(bio.phone || "");
  const [address, setAddress] = useState(bio.address || "");
  const [addressUrl, setAddressUrl] = useState(bio.address_url || "");

  useEffect(() => {
    if (isOpen) {
      const b = data?.bio_config || data || {};
      setWhatsapp(b.whatsapp || "");
      setInstagram(b.instagram || "");
      setTelegram(b.telegram || "");
      setEmail(b.email || "");
      setPhone(b.phone || "");
      setAddress(b.address || "");
      setAddressUrl(b.address_url || "");
    }
  }, [isOpen, data]);

  const handleApply = () => {
    onUpdate({
      whatsapp,
      instagram,
      telegram,
      email,
      phone,
      address,
      address_url: addressUrl,
    });
    onClose();
  };

  return (
    <ModalWrapper
      title="Contatos & Redes Sociais"
      subtitle="Defina os canais de atendimento exibidos no topo e no rodapé do site"
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="space-y-4">
        
        {/* WhatsApp */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            WhatsApp (com DDD)
          </label>
          <input
            type="text"
            value={whatsapp}
            onChange={(e) => {
              setWhatsapp(e.target.value);
              onUpdate({ whatsapp: e.target.value });
            }}
            placeholder="Ex: 11999998888"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#FE540B]"
          />
        </div>

        {/* Instagram */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Instagram className="w-3.5 h-3.5 text-pink-400" />
            Instagram (Usuário ou Link)
          </label>
          <input
            type="text"
            value={instagram}
            onChange={(e) => {
              setInstagram(e.target.value);
              onUpdate({ instagram: e.target.value });
            }}
            placeholder="Ex: @gmedificacao ou link completo"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#FE540B]"
          />
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-sky-400" />
            E-mail de Contato
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              onUpdate({ email: e.target.value });
            }}
            placeholder="Ex: contato@empresa.com"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#FE540B]"
          />
        </div>

        {/* Telefone */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-amber-400" />
            Telefone Comercial
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              onUpdate({ phone: e.target.value });
            }}
            placeholder="Ex: (11) 4002-8922"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#FE540B]"
          />
        </div>

        {/* Telegram */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-blue-400" />
            Telegram
          </label>
          <input
            type="text"
            value={telegram}
            onChange={(e) => {
              setTelegram(e.target.value);
              onUpdate({ telegram: e.target.value });
            }}
            placeholder="Ex: @usuario ou link"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#FE540B]"
          />
        </div>

        {/* Endereço */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-red-400" />
            Endereço Físico
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              onUpdate({ address: e.target.value });
            }}
            placeholder="Ex: Av. Paulista, 1000 - São Paulo, SP"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#FE540B]"
          />
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-[#FE540B] hover:bg-[#ff6d29] text-white text-xs font-bold transition-colors shadow-lg cursor-pointer"
          >
            Salvar Contatos
          </button>
        </div>

      </div>
    </ModalWrapper>
  );
}

// 5. PRODUCT / SERVICE MODAL (Add or Edit)
export function ProductModal({
  isOpen,
  onClose,
  tenantId,
  productToEdit,
  catalogItems,
  onSaveProduct
}: {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
  productToEdit: any | null;
  catalogItems: any[];
  onSaveProduct: (newCatalogItems: any[]) => void;
}) {
  const [name, setName] = useState(productToEdit?.name || "");
  const [price, setPrice] = useState(productToEdit?.price || "");
  const [description, setDescription] = useState(productToEdit?.description || "");
  const [images, setImages] = useState<string[]>(productToEdit?.images || (productToEdit?.image_url ? [productToEdit.image_url] : [""]));
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadBioAsset(tenantId, file, "product");
      setImages(prev => [url, ...prev.filter(Boolean)]);
      pushToast({ type: "success", title: "Foto enviada!", message: "Imagem do produto adicionada." });
    } catch (err: any) {
      console.error(err);
      pushToast({ type: "error", title: "Erro no upload", message: err.message || "Falha ao enviar imagem." });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      pushToast({ type: "error", title: "Nome obrigatório", message: "Informe o nome do serviço ou produto." });
      return;
    }

    const cleanImages = images.filter(Boolean);
    const updatedItem = {
      id: productToEdit?.id || Date.now().toString(),
      name: name.trim(),
      price: price.trim(),
      description: description.trim(),
      images: cleanImages,
      image_url: cleanImages[0] || "",
      options: productToEdit?.options || []
    };

    let updatedList: any[] = [];
    if (productToEdit) {
      updatedList = catalogItems.map((p) => (p.id === productToEdit.id ? updatedItem : p));
    } else {
      updatedList = [updatedItem, ...catalogItems];
    }

    onSaveProduct(updatedList);
    onClose();
  };

  return (
    <ModalWrapper
      title={productToEdit ? "Editar Produto / Serviço" : "Novo Produto / Serviço"}
      subtitle="Exiba seus serviços no catálogo do website"
      isOpen={isOpen}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Images */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Fotos do Produto / Serviço
          </label>
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {images.filter(Boolean).map((img, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 group">
                <img src={img} alt="Foto" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages(images.filter((_, i) => i !== idx))}
                  className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <label className="w-20 h-20 rounded-xl border-2 border-dashed border-white/20 hover:border-[#FE540B] flex flex-col items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0">
              <Plus className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-bold">{uploading ? "..." : "Adicionar"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Nome do Serviço / Produto</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Criação de Identidade Visual"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-bold outline-none focus:border-[#FE540B]"
          />
        </div>

        {/* Price */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Preço ou Condição</label>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Ex: R$ 850,00 ou Sob Consulta"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-emerald-400 font-bold outline-none focus:border-[#FE540B]"
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Descrição Detalhada</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o que está incluso, prazos ou especificações..."
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-[#FE540B]"
          />
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-[#FE540B] hover:bg-[#ff6d29] text-white text-xs font-bold transition-colors shadow-lg cursor-pointer"
          >
            {productToEdit ? "Salvar Alterações" : "Adicionar Produto"}
          </button>
        </div>

      </form>
    </ModalWrapper>
  );
}

// 6. PORTFOLIO ITEM MODAL (Add or Edit with Desktop & Smartphone tabs - REGRA 1)
export function PortfolioModal({
  isOpen,
  onClose,
  tenantId,
  projectToEdit,
  portfolioItems,
  onSavePortfolio
}: {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
  projectToEdit: any | null;
  portfolioItems: any[];
  onSavePortfolio: (newPortfolioItems: any[]) => void;
}) {
  const [tab, setTab] = useState<"desktop" | "smartphone">("desktop");

  // Desktop fields
  const [title, setTitle] = useState(projectToEdit?.title || "");
  const [desc, setDesc] = useState(projectToEdit?.description || "");
  const [mainBannerDesktop, setMainBannerDesktop] = useState(projectToEdit?.main_banner_url || "");
  const [desktopImages, setDesktopImages] = useState<string[]>(
    projectToEdit?.layers?.map((l: any) => l.image_url) || (projectToEdit?.image_url ? [projectToEdit.image_url] : [])
  );

  // Smartphone fields
  const [titleMobile, setTitleMobile] = useState(projectToEdit?.title_mobile || "");
  const [descMobile, setDescMobile] = useState(projectToEdit?.description_mobile || "");
  const [mainBannerMobile, setMainBannerMobile] = useState(projectToEdit?.main_banner_mobile_url || "");
  const [mobileImages, setMobileImages] = useState<string[]>(
    projectToEdit?.mobile_layers?.map((l: any) => l.image_url) || []
  );

  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [uploadingBannerDesktop, setUploadingBannerDesktop] = useState(false);
  const [uploadingBannerMobile, setUploadingBannerMobile] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(projectToEdit?.title || "");
      setDesc(projectToEdit?.description || "");
      setMainBannerDesktop(projectToEdit?.main_banner_url || "");
      setDesktopImages(
        projectToEdit?.layers?.map((l: any) => l.image_url) || (projectToEdit?.image_url ? [projectToEdit.image_url] : [])
      );

      setTitleMobile(projectToEdit?.title_mobile || "");
      setDescMobile(projectToEdit?.description_mobile || "");
      setMainBannerMobile(projectToEdit?.main_banner_mobile_url || "");
      setMobileImages(
        projectToEdit?.mobile_layers?.map((l: any) => l.image_url) || []
      );
    }
  }, [isOpen, projectToEdit]);

  // Upload Desktop Layer
  const handleDesktopImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDesktop(true);
    try {
      const url = await uploadBioAsset(tenantId, file, "portfolio_desk");
      setDesktopImages(prev => [...prev, url]);
      pushToast({ type: "success", title: "Foto desktop adicionada!" });
    } catch (err: any) {
      console.error(err);
      pushToast({ type: "error", title: "Erro no upload", message: err.message || "Falha ao enviar foto." });
    } finally {
      setUploadingDesktop(false);
    }
  };

  // Upload Mobile Layer
  const handleMobileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMobile(true);
    try {
      const url = await uploadBioAsset(tenantId, file, "portfolio_mob");
      setMobileImages(prev => [...prev, url]);
      pushToast({ type: "success", title: "Foto smartphone adicionada!" });
    } catch (err: any) {
      console.error(err);
      pushToast({ type: "error", title: "Erro no upload", message: err.message || "Falha ao enviar foto." });
    } finally {
      setUploadingMobile(false);
    }
  };

  // Upload Desktop Main Banner
  const handleMainBannerDesktopUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBannerDesktop(true);
    try {
      const url = await uploadBioAsset(tenantId, file, "portfolio_main_desk");
      setMainBannerDesktop(url);
      pushToast({ type: "success", title: "Banner desktop atualizado!" });
    } catch (err: any) {
      console.error(err);
      pushToast({ type: "error", title: "Erro no upload", message: err.message || "Falha ao enviar banner." });
    } finally {
      setUploadingBannerDesktop(false);
    }
  };

  // Upload Mobile Main Banner
  const handleMainBannerMobileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBannerMobile(true);
    try {
      const url = await uploadBioAsset(tenantId, file, "portfolio_main_mob");
      setMainBannerMobile(url);
      pushToast({ type: "success", title: "Banner smartphone atualizado!" });
    } catch (err: any) {
      console.error(err);
      pushToast({ type: "error", title: "Erro no upload", message: err.message || "Falha ao enviar banner." });
    } finally {
      setUploadingBannerMobile(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !titleMobile.trim()) {
      pushToast({ type: "error", title: "Título obrigatório", message: "Preencha o título do projeto." });
      return;
    }

    const cleanDesktopImages = desktopImages.filter(Boolean);
    const cleanMobileImages = mobileImages.filter(Boolean);

    const layers = cleanDesktopImages.map((img, idx) => ({
      id: `desk_${Date.now()}_${idx}`,
      image_url: img
    }));

    const mobileLayers = cleanMobileImages.map((img, idx) => ({
      id: `mob_${Date.now()}_${idx}`,
      image_url: img
    }));

    // REGRA 1: Preserva e salva ambos separadamente, sem vazar desktop para mobile ou vice-versa
    const updatedProject = {
      ...(projectToEdit || {}),
      id: projectToEdit?.id || Date.now().toString(),
      title: title.trim() || (projectToEdit?.title || ""),
      title_mobile: titleMobile.trim() || (projectToEdit?.title_mobile || ""),
      description: desc.trim(),
      description_mobile: descMobile.trim() || (projectToEdit?.description_mobile || ""),
      main_banner_url: mainBannerDesktop || cleanDesktopImages[0] || (projectToEdit?.main_banner_url || ""),
      main_banner_mobile_url: mainBannerMobile || cleanMobileImages[0] || (projectToEdit?.main_banner_mobile_url || ""),
      image_url: cleanDesktopImages[0] || cleanMobileImages[0] || (projectToEdit?.image_url || ""),
      layers: layers,
      mobile_layers: mobileLayers,
    };

    let updatedList: any[] = [];
    if (projectToEdit) {
      updatedList = portfolioItems.map((p) => (p.id === projectToEdit.id ? updatedProject : p));
    } else {
      updatedList = [updatedProject, ...portfolioItems];
    }

    onSavePortfolio(updatedList);
    onClose();
  };

  return (
    <ModalWrapper
      title={projectToEdit ? "Editar Projeto do Portfólio" : "Novo Projeto para o Portfólio"}
      subtitle="Configure imagens e textos exclusivos para Computador e Smartphone (Regra 1)"
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Seletor de Versão: COMPUTADOR vs SMARTPHONE (Regra 1) */}
        <div className="grid grid-cols-2 p-1 bg-black/50 border border-white/10 rounded-2xl">
          <button
            type="button"
            onClick={() => setTab("desktop")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              tab === "desktop"
                ? "bg-[#FE540B] text-white shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Versão Computador (Desktop)</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("smartphone")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              tab === "smartphone"
                ? "bg-[#FE540B] text-white shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Versão Smartphone (Celular)</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* ABA 1: VERSÃO COMPUTADOR (DESKTOP)                        */}
        {/* ========================================================= */}
        {tab === "desktop" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Title Desktop */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Título do Projeto (Desktop) *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Fachada Residencial Alto Padrão"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none focus:border-[#FE540B]"
              />
            </div>

            {/* Description Desktop */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Descrição do Projeto (Desktop)
              </label>
              <textarea
                rows={3}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Detalhes técnicos, materiais e conceito para visualização no computador..."
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-[#FE540B]"
              />
            </div>

            {/* Banner Principal Desktop (16:9 widescreen) */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Banner Principal Desktop (Topo Widescreen 16:9)
                </label>
                {mainBannerDesktop && (
                  <button
                    type="button"
                    onClick={() => setMainBannerDesktop("")}
                    className="text-xs text-red-400 hover:text-red-300 font-bold cursor-pointer"
                  >
                    Remover
                  </button>
                )}
              </div>

              {mainBannerDesktop ? (
                <div className="relative aspect-video max-h-48 rounded-xl overflow-hidden bg-black/40 border border-white/10">
                  <img src={mainBannerDesktop} alt="Banner Principal Desktop" className="w-full h-full object-cover" />
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-video max-h-40 rounded-xl border-2 border-dashed border-white/15 hover:border-[#FE540B] bg-white/[0.02] cursor-pointer transition-colors p-4 text-center">
                  <Upload className="w-5 h-5 text-zinc-400 mb-1" />
                  <span className="text-xs text-zinc-300 font-bold">
                    {uploadingBannerDesktop ? "Enviando..." : "Enviar Banner Principal Desktop (1920x600 ou 16:9)"}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleMainBannerDesktopUpload} disabled={uploadingBannerDesktop} />
                </label>
              )}
            </div>

            {/* Banners Internos Desktop (Galeria / Layers) */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Imagens da Galeria Desktop ({desktopImages.length})
              </label>
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {desktopImages.map((img, idx) => (
                  <div key={idx} className="relative w-24 h-20 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 group">
                    <img src={img} alt="Projeto Desktop" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setDesktopImages(desktopImages.filter((_, i) => i !== idx))}
                      className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <label className="w-24 h-20 rounded-xl border-2 border-dashed border-white/20 hover:border-[#FE540B] flex flex-col items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0">
                  <Plus className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold">{uploadingDesktop ? "..." : "Adicionar Foto"}</span>
                  <input type="file" accept="image/*,video/mp4" className="hidden" onChange={handleDesktopImageUpload} disabled={uploadingDesktop} />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 2: VERSÃO SMARTPHONE (CELULAR)                        */}
        {/* ========================================================= */}
        {tab === "smartphone" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Title Mobile */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                Título do Projeto no Smartphone
              </label>
              <input
                type="text"
                value={titleMobile}
                onChange={(e) => setTitleMobile(e.target.value)}
                placeholder={title ? `Deixe em branco para usar "${title}"` : "Ex: Fachada Residencial Celular"}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none focus:border-[#FE540B]"
              />
              <p className="text-[11px] text-zinc-400">
                Se deixado em branco, utiliza o título da versão Desktop automaticamente.
              </p>
            </div>

            {/* Description Mobile */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                Descrição no Smartphone
              </label>
              <textarea
                rows={3}
                value={descMobile}
                onChange={(e) => setDescMobile(e.target.value)}
                placeholder={desc ? "Deixe em branco para usar a mesma descrição do Desktop..." : "Descrição resumida para telas de celular..."}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-[#FE540B]"
              />
            </div>

            {/* Banner Principal Smartphone (6:5 ou 9:16 vertical) */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  Banner Principal Smartphone (Proporção 6:5 ou 9:16)
                </label>
                {mainBannerMobile && (
                  <button
                    type="button"
                    onClick={() => setMainBannerMobile("")}
                    className="text-xs text-red-400 hover:text-red-300 font-bold cursor-pointer"
                  >
                    Remover
                  </button>
                )}
              </div>

              {mainBannerMobile ? (
                <div className="relative aspect-[6/5] max-h-48 max-w-[200px] rounded-xl overflow-hidden bg-black/40 border border-white/10">
                  <img src={mainBannerMobile} alt="Banner Principal Smartphone" className="w-full h-full object-cover" />
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-[6/5] max-h-40 max-w-[200px] rounded-xl border-2 border-dashed border-white/15 hover:border-[#FE540B] bg-white/[0.02] cursor-pointer transition-colors p-4 text-center">
                  <Upload className="w-5 h-5 text-zinc-400 mb-1" />
                  <span className="text-xs text-zinc-300 font-bold">
                    {uploadingBannerMobile ? "Enviando..." : "Enviar Banner Smartphone"}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleMainBannerMobileUpload} disabled={uploadingBannerMobile} />
                </label>
              )}
            </div>

            {/* Banners Internos Smartphone (Galeria / Mobile Layers) */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <label className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                Imagens da Galeria Smartphone ({mobileImages.length})
              </label>
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {mobileImages.map((img, idx) => (
                  <div key={idx} className="relative w-20 h-24 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 group">
                    <img src={img} alt="Projeto Smartphone" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setMobileImages(mobileImages.filter((_, i) => i !== idx))}
                      className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <label className="w-20 h-24 rounded-xl border-2 border-dashed border-white/20 hover:border-[#FE540B] flex flex-col items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0">
                  <Plus className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold">{uploadingMobile ? "..." : "Adicionar Celular"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleMobileImageUpload} disabled={uploadingMobile} />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#FE540B] hover:bg-[#ff6d29] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{projectToEdit ? "Salvar Alterações do Projeto" : "Concluir e Salvar no Portfólio"}</span>
          </button>
        </div>

      </form>
    </ModalWrapper>
  );
}

// 7. PIX PAYMENT MODAL
export function PixEditModal({
  isOpen,
  onClose,
  data,
  onUpdate
}: {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onUpdate: (updates: { pix_key?: string; pix_type?: string }) => void;
}) {
  const bio = data?.bio_config || {};
  const [pixKey, setPixKey] = useState(bio.pix_key || data?.pix_key || "");
  const [pixType, setPixType] = useState(bio.pix_type || data?.pix_type || "CPF");

  const handleApply = () => {
    onUpdate({ pix_key: pixKey, pix_type: pixType });
    onClose();
  };

  return (
    <ModalWrapper
      title="Configurar Chave PIX"
      subtitle="Permita que clientes copiem sua chave PIX com um clique"
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="space-y-4">
        
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Tipo de Chave</label>
          <select
            value={pixType}
            onChange={(e) => {
              setPixType(e.target.value);
              onUpdate({ pix_type: e.target.value });
            }}
            className="w-full bg-[#1b1c27] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
          >
            <option value="CPF">CPF</option>
            <option value="CNPJ">CNPJ</option>
            <option value="EMAIL">E-mail</option>
            <option value="TELEFONE">Telefone</option>
            <option value="ALEATORIA">Chave Aleatória</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Chave PIX</label>
          <input
            type="text"
            value={pixKey}
            onChange={(e) => {
              setPixKey(e.target.value);
              onUpdate({ pix_key: e.target.value });
            }}
            placeholder="Digite sua chave PIX..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono outline-none focus:border-[#FE540B]"
          />
        </div>

        <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-[#FE540B] hover:bg-[#ff6d29] text-white text-xs font-bold transition-colors shadow-lg cursor-pointer"
          >
            Salvar PIX
          </button>
        </div>

      </div>
    </ModalWrapper>
  );
}
