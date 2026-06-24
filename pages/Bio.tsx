import React, { useState, useEffect, useRef } from "react";
import { Page } from "../components/ui/Page";
import { Link } from "react-router-dom";
import { Copy, Check, Info, Plus, Trash, Eye, X, Upload, ChevronDown, ChevronUp, Save, Smartphone, Layout, Link as LinkIcon, ShoppingBag, MapPin, Sparkles, Globe, Phone, CreditCard } from "lucide-react";
import { useAuth } from "../store/AuthContext";
import { fetchSettingsSupabase, upsertSettingsSupabase, AppSettings } from "../lib/settings";
import { pushToast } from "../store/toast";
import BioRenderer, { getPlatformIcon } from "../components/bio/BioRenderer";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "motion/react";

const formatBRL = (value: string): string => {
  const clean = value.replace(/\D/g, "");
  if (!clean) return "";
  const cents = parseInt(clean, 10);
  if (isNaN(cents)) return "";
  const valueInReais = cents / 100;
  return valueInReais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
};

export default function Bio() {
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"smartphone" | "pc">("smartphone");
  const [isDocked, setIsDocked] = useState(false);
  const isDraggingRef = useRef(false);

  // Accordion state
  const [openSections, setOpenSections] = useState({
    basic: false,
    appearance: false,
    contacts: false,
    otherLinks: false,
    catalog: false,
    address: false,
    payment: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Campos principais
  const [bioConfig, setBioConfig] = useState({
    title: "",
    description: "",
    phone: "",
    email: "",
    whatsapp: "",
    instagram: "",
    facebook: "",
    website: "",
    portfolio_url: "",
    catalog_url: "",
    address: "",
    address_url: "", // NEW
    pix_key: "",
    pix_type: "CPF",
    card_url: "", // NEW
    custom_links: [] as any[],
    theme: "dark",
    color: "",
    catalog_title: "Catálogo",
    catalog_items: [] as any[],
    bg_image_url: "",
    bg_mobile_image_url: "",
    show_banners: false,
    banner_img_url_1: "",
    banner_img_url_2: "",
    banner_img_url_3: "",
    mobile_banner_img_url_1: "",
    mobile_banner_img_url_2: "",
    mobile_banner_img_url_3: "",
  });

  const compressImageFidelity = (file: File, maxWidth = 1200, maxQuality = 0.82): Promise<Blob | File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/")) {
        resolve(file);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }
          
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }
          
          // Preenchar com fundo branco para garantir que transparências de PNGs fiquem bonitas em JPEG
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          
          // Desenhar a imagem no canvas com as novas dimensões
          ctx.drawImage(img, 0, 0, width, height);
          
          // Exportar para JPEG de alta performance e tamanho reduzido
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            maxQuality
          );
        };
        
        img.onerror = () => {
          resolve(file);
        };
        
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        resolve(file);
      };
      reader.readAsDataURL(file);
    });
  };

  const uploadImage = async (file: File, isHighQuality = false): Promise<string> => {
    if (!tenantId) throw new Error("Sem tenant id");
    
    let compressed;
    let ext;
    let contentType;
    
    // Se for PNG ou GIF, preservamos o arquivo original de forma lossless para manter fundos transparentes (PNG) e animações (GIF)
    if (file.type === "image/png" || file.type === "image/gif") {
      ext = file.type === "image/png" ? "png" : "gif";
      contentType = file.type;
      compressed = file; 
    } else {
      ext = "jpg";
      contentType = "image/jpeg";
      if (isHighQuality) {
        compressed = await compressImageFidelity(file, 2400, 0.95);
      } else {
        compressed = await compressImageFidelity(file, 1200, 0.82);
      }
    }
    
    const filename = `bio_image_${Date.now()}_${Math.random().toString(36).substring(2,8)}.${ext}`;
    const path = `${tenantId}/bio/${filename}`;
    
    const { error } = await supabase.storage.from("tenant-assets").upload(path, compressed, { contentType });
    if (error) throw error;
    
    const { data } = supabase.storage.from("tenant-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleUploadBg = async (isMobile: boolean, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      pushToast({ type: "info", title: "Upload", message: "Enviando imagem de fundo..." });
      const url = await uploadImage(e.target.files[0]);
      handleChange(isMobile ? "bg_mobile_image_url" : "bg_image_url", url);
      pushToast({ type: "success", title: "Sucesso", message: "Imagem enviada" });
    } catch(err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao enviar imagem" });
    }
  };

  const handleUploadBanner = async (index: 1 | 2 | 3, isMobile: boolean, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      const typeLabel = isMobile ? "Smartphone" : "Desktop";
      pushToast({ type: "info", title: "Upload", message: `Enviando Banner ${typeLabel} ${index}...` });
      const url = await uploadImage(e.target.files[0]);
      const fieldName = isMobile ? `mobile_banner_img_url_${index}` : `banner_img_url_${index}`;
      handleChange(fieldName, url);
      pushToast({ type: "success", title: "Sucesso", message: `Banner ${typeLabel} ${index} enviado!` });
    } catch(err) {
      console.error(err);
      pushToast({ type: "error", title: "Erro", message: `Erro ao enviar Banner ${index}` });
    }
  };

  const handleUploadProductImage = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      pushToast({ type: "info", title: "Upload", message: "Enviando imagem do produto..." });
      const url = await uploadImage(e.target.files[0]);
      updateCatalogItem(id, "image_url", url);
      pushToast({ type: "success", title: "Sucesso", message: "Imagem de produto enviada" });
    } catch(err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao enviar imagem" });
    }
  };

  const loadData = async () => {
    if (!tenantId) return;
    setLoading(true);
    const s = await fetchSettingsSupabase(tenantId);
    setSettings(s);
    if (s?.bio_config) {
      setBioConfig({
        ...bioConfig,
        ...s.bio_config,
        custom_links: s.bio_config.custom_links || [],
        catalog_items: s.bio_config.catalog_items || [],
        catalog_title: s.bio_config.catalog_title || "Catálogo",
      });
    } else {
      // Tentar pegar infos já existentes caso não tenha bio_config configurada
      setBioConfig({
        ...bioConfig,
        title: s?.company_name || "",
        pix_key: s?.pix_key || "",
        pix_type: s?.pix_type || "CPF",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const payload: Partial<AppSettings> = {
        company_name: bioConfig.title || settings?.company_name, 
        pix_key: bioConfig.pix_key,
        pix_type: bioConfig.pix_type,
        bio_config: bioConfig,
      };

      const res = await upsertSettingsSupabase(tenantId, payload);
      pushToast({ type: "success", title: "Salvo", message: "Sua Bio foi atualizada com sucesso!" });
    } catch (e: any) {
      console.error("Save bio error:", e);
      const errStr = String(JSON.stringify(e));
      if (errStr.includes("bio_config")) {
         pushToast({ type: "error", title: "Atenção (Requer SQL)", message: "A coluna bio_config não existe. Execute o db_setup.sql no seu Supabase!" });
      } else {
         pushToast({ type: "error", title: "Erro", message: e.message || "Falha ao salvar." });
      }
    }
    setSaving(false);
  };

  const sanitizeSlug = (name: string) => {
    if (!name) return "";
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const getCustomSlug = () => {
    const title = bioConfig.title || settings?.company_name || "";
    const suffix = sanitizeSlug(title);
    if (suffix === "gm-edificacao" || suffix === "carddigitalgm-gm-edificacao" || suffix === "gmedificacao") {
      return "gmedificacao";
    }
    return suffix ? suffix : tenantId;
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#/bio/${getCustomSlug()}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    pushToast({ type: "success", title: "Copiado", message: "Link da bio copiado!" });
  };

  const handleChange = (field: string, value: any) => {
    setBioConfig(prev => ({ ...prev, [field]: value }));
  };

  const addCustomLink = () => {
    setBioConfig(prev => ({
      ...prev,
      custom_links: [...prev.custom_links, { id: Date.now().toString(), platform: 'website', label: '', url: '', value: '' }]
    }));
  };

  const removeCustomLink = (id: string) => {
    setBioConfig(prev => ({
      ...prev,
      custom_links: prev.custom_links.filter(l => l.id !== id)
    }));
  };

  const updateCustomLink = (id: string, field: string, value: string) => {
    setBioConfig(prev => ({
      ...prev,
      custom_links: prev.custom_links.map(l => l.id === id ? { ...l, [field]: value } : l)
    }));
  };

  const addCatalogItem = () => {
    setBioConfig(prev => ({
      ...prev,
      catalog_items: [...prev.catalog_items, { id: Date.now().toString(), name: '', price: '', image_url: '', url: '', description: '', images: [''] }]
    }));
  };

  const removeCatalogItem = (id: string) => {
    setBioConfig(prev => ({
      ...prev,
      catalog_items: prev.catalog_items.filter(i => i.id !== id)
    }));
  };

  const updateCatalogItem = (id: string, field: string, value: string) => {
    setBioConfig(prev => ({
      ...prev,
      catalog_items: prev.catalog_items.map(i => i.id === id ? { ...i, [field]: value } : i)
    }));
  };

  const updateCatalogItemImage = (itemId: string, index: number, value: string) => {
    setBioConfig(prev => {
      const updatedItems = (prev.catalog_items || []).map(item => {
        if (item.id === itemId) {
          const currentImages = [...(item.images || (item.image_url ? [item.image_url] : ['']))];
          currentImages[index] = value;
          const primaryUrl = currentImages[0] || '';
          return { 
            ...item, 
            image_url: primaryUrl, 
            images: currentImages 
          };
        }
        return item;
      });
      return { ...prev, catalog_items: updatedItems };
    });
  };

  const addCatalogItemImageSlot = (itemId: string) => {
    setBioConfig(prev => {
      const updatedItems = (prev.catalog_items || []).map(item => {
        if (item.id === itemId) {
          const currentImages = [...(item.images || (item.image_url ? [item.image_url] : ['']))];
          if (currentImages.length < 4) {
            currentImages.push('');
            return { ...item, images: currentImages };
          }
        }
        return item;
      });
      return { ...prev, catalog_items: updatedItems };
    });
  };

  const removeCatalogItemImage = (itemId: string, index: number) => {
    setBioConfig(prev => {
      const updatedItems = (prev.catalog_items || []).map(item => {
        if (item.id === itemId) {
          const currentImages = [...(item.images || (item.image_url ? [item.image_url] : ['']))];
          currentImages.splice(index, 1);
          if (currentImages.length === 0) {
            currentImages.push('');
          }
          const primaryUrl = currentImages[0] || '';
          return { 
            ...item, 
            image_url: primaryUrl, 
            images: currentImages 
          };
        }
        return item;
      });
      return { ...prev, catalog_items: updatedItems };
    });
  };

  const handleUploadProductImageAtIndex = async (itemId: string, index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      pushToast({ type: "info", title: "Upload", message: "Enviando imagem do produto (alta qualidade)..." });
      const url = await uploadImage(e.target.files[0], true);
      updateCatalogItemImage(itemId, index, url);
      pushToast({ type: "success", title: "Sucesso", message: "Imagem de produto enviada" });
    } catch(err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao enviar imagem" });
    }
  };

  if (loading) {
    return <Page title="BIO CardDigital GM"><div className="p-4 text-slate-400">Carregando...</div></Page>;
  }

  const platforms = [
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'telegram', label: 'Telegram' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'twitter', label: 'Twitter' },
    { value: 'spotify', label: 'Spotify' },
    { value: 'github', label: 'GitHub' },
    { value: 'email', label: 'E-mail' },
    { value: 'phone', label: 'Telefone' },
    { value: 'website', label: 'Link Geral' },
    { value: 'ecommerce', label: 'Loja Virtual' },
    { value: 'food', label: 'Cardápio / Food' },
    { value: 'address', label: 'Localização' },
  ];

  return (
    <Page title="BIO CardDigital GM">
      <div className="w-full max-w-6xl mx-auto pb-20 space-y-6">

        {/* HEADER PANEL SPANNING FULL WIDTH */}
        <div className="gm-card p-4 sm:p-6 text-center space-y-4 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-rose-500" />
           <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-orange-400" /> BIO CardDigital GM
           </h3>
           <p className="text-slate-400 text-sm">Essa é a página que você pode enviar para seus clientes como um cartão de visitas digital ou Link na Bio.</p>
           
           <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
             <button onClick={handleCopyLink} className="gm-btn gm-btn-primary flex items-center justify-center min-w-[200px]">
               {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
               {copied ? "Link Copiado!" : "Copiar Link Público"}
             </button>
             <Link to={`/bio/${getCustomSlug()}`} target="_blank" className="gm-btn gm-btn-outline flex items-center justify-center min-w-[200px]">
               <Globe className="w-4 h-4 mr-2" /> Ver Tela Inteira
             </Link>
           </div>
        </div>

        <div className="flex flex-col gap-6 items-stretch w-full max-w-4xl mx-auto">
        
          {/* 1. INFORMAÇÕES BÁSICAS */}
          <div className="gm-card p-4 sm:p-6 space-y-4">
            <button
               onClick={() => toggleSection('basic')}
               className="w-full flex justify-between items-center text-lg font-semibold text-white group"
            >
               <span className="flex items-center gap-2"><Info className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" /> Informações Básicas</span>
               {openSections.basic ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            {openSections.basic && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 pt-2">
              <div>
                <label className="gm-label">Título / Nome da Empresa</label>
                <input type="text" className="gm-input font-medium" value={bioConfig.title} onChange={e => handleChange("title", e.target.value)} placeholder="Ex: GM Edificação" />
              </div>
              <div>
                <label className="gm-label">Descrição Curta</label>
                <input type="text" className="gm-input" value={bioConfig.description} onChange={e => handleChange("description", e.target.value)} placeholder="Sua frase de destaque..." />
              </div>
            </div>
            )}
          </div>

          {/* 3. APARÊNCIA DA BIO */}
          <div className="gm-card p-4 sm:p-6 space-y-4">
            <button
               onClick={() => toggleSection('appearance')}
               className="w-full flex justify-between items-center text-lg font-semibold text-white group"
            >
               <span className="flex items-center gap-2"><Eye className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" /> Aparência da Bio</span>
               {openSections.appearance ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {openSections.appearance && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 pt-2">
              <div>
                <label className="gm-label">Cor de Destaque</label>
                <div className="flex items-center gap-2">
                  <input type="color" className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent" value={bioConfig.color || settings?.brand_primary || "#ff7a00"} onChange={e => handleChange("color", e.target.value)} />
                  <input type="text" className="gm-input flex-1 font-mono text-sm" value={bioConfig.color || settings?.brand_primary || "#ff7a00"} onChange={e => handleChange("color", e.target.value)} />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Se vazio, usará a cor principal do sistema.</p>
              </div>
              <div>
                <label className="gm-label">Tema Visual</label>
                <select className="gm-input w-full" value={bioConfig.theme} onChange={e => handleChange("theme", e.target.value)}>
                  <option value="dark">Escuro (Padrão)</option>
                  <option value="light">Claro</option>
                  <option value="glass">Glassmorphism (Vidro)</option>
                </select>
              </div>
              {/* Seção Desktop (Plano de Fundo & Banner Principal) */}
              <div className="sm:col-span-2 border-t border-zinc-800/80 pt-4 mt-2 space-y-4">
                <div className="space-y-4 bg-zinc-900/40 p-4 sm:p-5 rounded-3xl border border-zinc-800/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/50 pb-2.5">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Layout className="w-4 h-4 text-orange-400" /> Mídias Versão Desktop (Computador)
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800/60 px-2.5 py-1 rounded-full border border-zinc-700/30">
                      Tamanho Sugerido: <strong className="text-orange-400">1920x500 px</strong> (Proporção 21:9)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Plano de Fundo Desktop */}
                    <div className="space-y-2 bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-800/80 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-zinc-300">Plano de Fundo Desktop</span>
                          {bioConfig.bg_image_url && (
                            <button 
                              type="button" 
                              onClick={() => handleChange("bg_image_url", "")} 
                              className="text-red-500 hover:text-red-400 text-[10px] font-bold"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                        
                        {bioConfig.bg_image_url ? (
                          <div className="w-full aspect-[21/9] rounded-lg overflow-hidden border border-zinc-800 bg-black/40">
                            <img src={bioConfig.bg_image_url} alt="Plano de Fundo Desktop" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <div className="w-full aspect-[21/9] rounded-lg border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 text-[10px] font-medium bg-black/10">
                            <Layout className="w-4 h-4 mb-1 opacity-40 text-orange-400" />
                            Sem plano de fundo desktop
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1.5 pt-3">
                        <input 
                          type="text" 
                          className="gm-input !py-1.5 !px-2 text-[10px] font-mono flex-1" 
                          value={bioConfig.bg_image_url || ''} 
                          onChange={e => handleChange("bg_image_url", e.target.value)} 
                          placeholder="URL ou Upload" 
                        />
                        <label className="gm-btn gm-btn-outline shrink-0 !py-1.5 !px-4 gap-1.5 text-xs flex items-center justify-center cursor-pointer border border-orange-500/60 hover:border-orange-500 hover:bg-orange-500/10 transition-all">
                          <Upload className="w-3.5 h-3.5 text-orange-500" />
                          <span className="font-bold text-white">Upload</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadBg(false, e)} />
                        </label>
                      </div>
                    </div>

                    {/* Banner Desktop Principal */}
                    <div className="space-y-2 bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-800/80 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-zinc-300">Banner Desktop Principal</span>
                          {bioConfig.banner_img_url_1 && (
                            <button 
                              type="button" 
                              onClick={() => handleChange("banner_img_url_1", "")} 
                              className="text-red-500 hover:text-red-400 text-[10px] font-bold"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                        
                        {bioConfig.banner_img_url_1 ? (
                          <div className="w-full aspect-[21/9] rounded-lg overflow-hidden border border-zinc-800 bg-black/40">
                            <img src={bioConfig.banner_img_url_1} alt="Banner Desktop" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <div className="w-full aspect-[21/9] rounded-lg border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 text-[10px] font-medium bg-black/10">
                            <Sparkles className="w-4 h-4 mb-1 opacity-40 text-orange-400" />
                            Sem banner desktop
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1.5 pt-3">
                        <input 
                          type="text" 
                          className="gm-input !py-1.5 !px-2 text-[10px] font-mono flex-1" 
                          value={bioConfig.banner_img_url_1 || ''} 
                          onChange={e => handleChange("banner_img_url_1", e.target.value)} 
                          placeholder="URL ou Upload" 
                        />
                        <label className="gm-btn gm-btn-outline shrink-0 !py-1.5 !px-4 gap-1.5 text-xs flex items-center justify-center cursor-pointer border border-orange-500/60 hover:border-orange-500 hover:bg-orange-500/10 transition-all">
                          <Upload className="w-3.5 h-3.5 text-orange-500" />
                          <span className="font-bold text-white">Upload</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadBanner(1, false, e)} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção Smartphone (Plano de Fundo & Banner Principal) */}
              <div className="sm:col-span-2 border-t border-zinc-800/80 pt-4 mt-2 space-y-4">
                <div className="space-y-4 bg-zinc-900/40 p-4 sm:p-5 rounded-3xl border border-zinc-800/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/50 pb-2.5">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-orange-400" /> Mídias Versão Smartphone (Celular)
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800/60 px-2.5 py-1 rounded-full border border-zinc-700/30">
                      Tamanho Sugerido: <strong className="text-orange-400">1080x1920 px</strong> (Proporção 9:16)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Plano de Fundo Smartphone */}
                    <div className="space-y-2 bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-800/80 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-zinc-300">Plano de Fundo Smartphone</span>
                          {bioConfig.bg_mobile_image_url && (
                            <button 
                              type="button" 
                              onClick={() => handleChange("bg_mobile_image_url", "")} 
                              className="text-red-500 hover:text-red-400 text-[10px] font-bold"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                        
                        {bioConfig.bg_mobile_image_url ? (
                          <div className="w-full aspect-[9/16] rounded-lg overflow-hidden border border-zinc-800 bg-black/40 max-w-[140px] mx-auto">
                            <img src={bioConfig.bg_mobile_image_url} alt="Plano de Fundo Smartphone" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <div className="w-full aspect-[9/16] rounded-lg border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 text-[10px] font-medium bg-black/10 max-w-[140px] mx-auto">
                            <Smartphone className="w-4 h-4 mb-1 opacity-40 text-orange-400" />
                            Sem plano de fundo smartphone
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1.5 pt-3">
                        <input 
                          type="text" 
                          className="gm-input !py-1.5 !px-2 text-[10px] font-mono flex-1" 
                          value={bioConfig.bg_mobile_image_url || ''} 
                          onChange={e => handleChange("bg_mobile_image_url", e.target.value)} 
                          placeholder="URL ou Upload" 
                        />
                        <label className="gm-btn gm-btn-outline shrink-0 !py-1.5 !px-4 gap-1.5 text-xs flex items-center justify-center cursor-pointer border border-orange-500/60 hover:border-orange-500 hover:bg-orange-500/10 transition-all">
                          <Upload className="w-3.5 h-3.5 text-orange-500" />
                          <span className="font-bold text-white">Upload</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadBg(true, e)} />
                        </label>
                      </div>
                    </div>

                    {/* Banner Smartphone Principal */}
                    <div className="space-y-2 bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-800/80 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-zinc-300">Banner Smartphone Principal</span>
                          {bioConfig.mobile_banner_img_url_1 && (
                            <button 
                              type="button" 
                              onClick={() => handleChange("mobile_banner_img_url_1", "")} 
                              className="text-red-500 hover:text-red-400 text-[10px] font-bold"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                        
                        {bioConfig.mobile_banner_img_url_1 ? (
                          <div className="w-full aspect-[9/16] rounded-lg overflow-hidden border border-zinc-800 bg-black/40 max-w-[140px] mx-auto">
                            <img src={bioConfig.mobile_banner_img_url_1} alt="Banner Smartphone" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <div className="w-full aspect-[9/16] rounded-lg border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 text-[10px] font-medium bg-black/10 max-w-[140px] mx-auto">
                            <Sparkles className="w-4 h-4 mb-1 opacity-40 text-orange-400" />
                            Sem banner smartphone
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1.5 pt-3">
                        <input 
                          type="text" 
                          className="gm-input !py-1.5 !px-2 text-[10px] font-mono flex-1" 
                          value={bioConfig.mobile_banner_img_url_1 || ''} 
                          onChange={e => handleChange("mobile_banner_img_url_1", e.target.value)} 
                          placeholder="URL ou Upload" 
                        />
                        <label className="gm-btn gm-btn-outline shrink-0 !py-1.5 !px-4 gap-1.5 text-xs flex items-center justify-center cursor-pointer border border-orange-500/60 hover:border-orange-500 hover:bg-orange-500/10 transition-all">
                          <Upload className="w-3.5 h-3.5 text-orange-500" />
                          <span className="font-bold text-white">Upload</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadBanner(1, true, e)} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toggle Exibir Banners */}
              <div className="sm:col-span-2 border-t border-zinc-800/80 pt-4 mt-2 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-orange-400" /> Exibir Banners de Destaque no Site
                  </span>
                  <p className="text-[11px] text-zinc-400">Ative para exibir o carrossel de banners promocionais no topo do seu site.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={!!bioConfig.show_banners}
                    onChange={(e) => handleChange("show_banners", e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
            </div>
            )}
          </div>

          {/* 2. CONTATOS E REDES */}
          <div className="gm-card p-4 sm:p-6 space-y-4">
            <button
               onClick={() => toggleSection('contacts')}
               className="w-full flex justify-between items-center text-lg font-semibold text-white group"
            >
              <span className="flex items-center gap-2"><Phone className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" /> Contatos e Redes</span>
              {openSections.contacts ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {openSections.contacts && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 pt-2">
              <div>
                <label className="gm-label">WhatsApp (com DDD)</label>
                <input type="text" className="gm-input font-medium" value={bioConfig.whatsapp} onChange={e => handleChange("whatsapp", e.target.value)} placeholder="Ex: 11999999999" />
              </div>
              <div>
                <label className="gm-label">E-mail Comercial</label>
                <input type="email" className="gm-input" value={bioConfig.email} onChange={e => handleChange("email", e.target.value)} />
              </div>
              <div>
                <label className="gm-label">Instagram (URL ou @)</label>
                <input type="text" className="gm-input" value={bioConfig.instagram} onChange={e => handleChange("instagram", e.target.value)} />
              </div>
              <div>
                <label className="gm-label">Facebook</label>
                <input type="text" className="gm-input" value={bioConfig.facebook} onChange={e => handleChange("facebook", e.target.value)} />
              </div>
            </div>
            )}
          </div>

          {/* 4. OUTROS LINKS */}
          <div className="gm-card p-4 sm:p-6 space-y-4">
            <button
               onClick={() => toggleSection('otherLinks')}
               className="w-full flex justify-between items-center text-lg font-semibold text-white group"
            >
              <span className="flex items-center gap-2"><LinkIcon className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" /> Outros Links</span>
              {openSections.otherLinks ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {openSections.otherLinks && (
            <div className="animate-in fade-in slide-in-from-top-2 pt-2">
              <div className="flex justify-end mb-4">
                <button 
                  onClick={addCustomLink}
                  className="flex items-center text-orange-500 hover:text-orange-400 text-sm font-medium bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20 transition-all hover:bg-orange-500/20"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </button>
              </div>
            
            {bioConfig.custom_links.length === 0 ? (
               <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
                 Nenhum link adicional. Clique em "Adicionar" para inserir links customizados.
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {bioConfig.custom_links.map((link) => {
                   const CurrentIcon = getPlatformIcon(link.platform);
                   return (
                     <div key={link.id} className="p-4 bg-[var(--gm-bg)] rounded-xl border border-slate-800/80 space-y-3 relative group">
                       <button 
                         onClick={() => removeCustomLink(link.id)}
                         className="absolute top-2 right-2 text-slate-500 hover:text-red-400 p-1 bg-black/30 rounded-full hover:bg-red-500/20 transition-all"
                       >
                         <Trash className="w-4 h-4" />
                       </button>
                       
                       <div className="grid grid-cols-1 gap-3 pt-2">
                         <div>
                           <label className="text-xs text-slate-400 mb-1 block">Ícone & Tipo de Link</label>
                           <div className="relative">
                             <button
                               onClick={() => setIconPickerOpen(iconPickerOpen === link.id ? null : link.id)}
                               className="w-full text-left gm-input flex items-center justify-between !py-2"
                             >
                               <div className="flex items-center gap-2">
                                 <CurrentIcon className="w-4 h-4 text-[var(--gm-primary)]" />
                                 <span className="text-sm">{platforms.find(p => p.value === link.platform)?.label || 'Link Geral'}</span>
                               </div>
                               <Plus className={`w-4 h-4 transition-transform ${iconPickerOpen === link.id ? 'rotate-45' : ''}`} />
                             </button>
                             
                             {iconPickerOpen === link.id && (
                               <div className="absolute z-20 mt-1 w-full bg-[var(--gm-bg)] border border-slate-700/50 rounded-xl p-3 shadow-2xl">
                                 <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto no-scrollbar">
                                   {platforms.map(p => {
                                     const PIcon = getPlatformIcon(p.value);
                                     return (
                                       <button
                                         key={p.value}
                                         onClick={() => {
                                           updateCustomLink(link.id, 'platform', p.value);
                                           if (!link.label) updateCustomLink(link.id, 'label', p.label);
                                           setIconPickerOpen(null);
                                         }}
                                         title={p.label}
                                         className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-colors ${link.platform === p.value ? 'bg-[var(--gm-primary)]/10 border-[var(--gm-primary)] text-[var(--gm-primary)]' : 'border-transparent hover:bg-slate-800/50 text-slate-300'}`}
                                       >
                                         <PIcon className="w-5 h-5 mb-1" />
                                         <span className="text-[9px] truncate w-full text-center">{p.label}</span>
                                       </button>
                                     );
                                   })}
                                 </div>
                               </div>
                             )}
                           </div>
                         </div>
                         <div>
                           <label className="text-xs text-slate-400 mb-1 block">Título do Botão</label>
                           <input 
                             type="text" 
                             className="gm-input w-full !py-2" 
                             value={link.label} 
                             onChange={e => updateCustomLink(link.id, 'label', e.target.value)} 
                             placeholder="Ex: Meu Portfólio"
                           />
                         </div>
                         <div>
                           <label className="text-xs text-slate-400 mb-1 block">Subtítulo (opcional)</label>
                           <input 
                             type="text" 
                             className="gm-input w-full !py-2" 
                             value={link.value || ''} 
                             onChange={e => updateCustomLink(link.id, 'value', e.target.value)} 
                             placeholder="Ex: @gmedificacao"
                           />
                         </div>
                         <div>
                           <label className="text-xs text-slate-400 mb-1 block">URL (Link do botão)</label>
                           <input 
                             type="text" 
                             className="gm-input w-full !py-2 text-sm font-mono" 
                             value={link.url} 
                             onChange={e => updateCustomLink(link.id, 'url', e.target.value)} 
                             placeholder="https://..."
                           />
                         </div>
                       </div>
                     </div>
                   );
                 })}
               </div>
            )}
            
            <div className="grid grid-cols-1 gap-4 pt-4 border-t border-slate-800">
              <div>
                <label className="gm-label">Site Principal URL</label>
                <input type="text" className="gm-input font-mono text-xs" value={bioConfig.website} onChange={e => handleChange("website", e.target.value)} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="gm-label">URL do Portfólio</label>
                  <input type="text" className="gm-input font-mono text-xs" value={bioConfig.portfolio_url} onChange={e => handleChange("portfolio_url", e.target.value)} placeholder="https://seu-portfolio.com" />
                </div>
                <div>
                  <label className="gm-label">URL do Catálogo (PDF ou site)</label>
                  <input type="text" className="gm-input font-mono text-xs" value={bioConfig.catalog_url} onChange={e => handleChange("catalog_url", e.target.value)} placeholder="https://link-do-catalogo.com" />
                </div>
              </div>
            </div>
            </div>
            )}
          </div>

          {/* 7. CATÁLOGO DE PRODUTOS (FULL WIDTH lg:col-span-2) */}
          <div className="gm-card p-4 sm:p-6 space-y-4">
            <button
               onClick={() => toggleSection('catalog')}
               className="w-full flex justify-between items-center text-lg font-semibold text-white group"
            >
              <span className="flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" /> Catálogo de Produtos</span>
              {openSections.catalog ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {openSections.catalog && (
            <div className="animate-in fade-in slide-in-from-top-2 pt-2">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800/60">
                <div className="w-full sm:max-w-sm">
                  <label className="gm-label">Título da Seção de Catálogo</label>
                  <input type="text" className="gm-input" value={bioConfig.catalog_title || 'Catálogo'} onChange={e => handleChange("catalog_title", e.target.value)} placeholder="Ex: Meus Produtos" />
                </div>
                <button 
                  onClick={addCatalogItem}
                  className="w-full sm:w-auto text-sm bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center font-semibold px-4 py-2.5 rounded-xl transition-all"
                >
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Produto
                </button>
              </div>

            {bioConfig.catalog_items?.length === 0 ? (
               <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl space-y-2">
                 <ShoppingBag className="w-10 h-10 opacity-35 mx-auto text-orange-500" />
                 <p>Nenhum produto no catálogo. Clique em "Adicionar Produto" para exibir fotos e preços.</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 gap-5">
                 {bioConfig.catalog_items?.map((item) => (
                   <div key={item.id} className="p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800/80 space-y-4 relative group hover:border-orange-500/20 transition-all">
                     <button 
                       onClick={() => removeCatalogItem(item.id)}
                       className="absolute top-3 right-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-full transition-all"
                       title="Remover Produto"
                     >
                       <Trash className="w-4 h-4" />
                     </button>
                     
                     <div className="flex flex-col gap-6 pt-3">
                       {/* LADO ESQUERDO DO CONTAINER: Nome, Preço, Link Direto, Descrição */}
                       <div className="space-y-4">
                         <div>
                           <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Nome do Produto/Serviço</label>
                           <input 
                             type="text" 
                             className="gm-input w-full !py-2.5 font-medium" 
                             value={item.name} 
                             onChange={e => updateCatalogItem(item.id, 'name', e.target.value)} 
                             placeholder="Ex: Tênis Nike Air"
                           />
                         </div>

                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           <div>
                             <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Preço (opcional)</label>
                             <input 
                               type="text" 
                               className="gm-input w-full !py-2.5 text-orange-400 font-mono font-bold" 
                               value={item.price} 
                               onChange={e => updateCatalogItem(item.id, 'price', formatBRL(e.target.value))} 
                               placeholder="R$ 0,00"
                             />
                           </div>
                           <div>
                             <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Link Direto (WhatsApp/Compra)</label>
                             <input 
                               type="text" 
                               className="gm-input w-full !py-2.5 text-xs font-mono" 
                               value={item.url} 
                               onChange={e => updateCatalogItem(item.id, 'url', e.target.value)} 
                               placeholder="Opcional. Link para ir ao clicar"
                             />
                           </div>
                         </div>

                         <div>
                           <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Descrição do Produto</label>
                           <textarea 
                              className="gm-input w-full !py-2.5 min-h-[100px] resize-none overflow-y-hidden" 
                              value={item.description || ''} 
                              onChange={e => {
                                updateCatalogItem(item.id, 'description', e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                              }}
                              ref={el => {
                                if (el) {
                                  el.style.height = 'auto';
                                  el.style.height = el.scrollHeight + 'px';
                                }
                              }}
                              placeholder="Ex: Tênis em couro, ótimo para corridas."
                            />
                         </div>
                       </div>

                       <div className="space-y-4 border-t border-zinc-800/65 pt-5">
                          <div className="font-sans space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-bold text-slate-300 block">Fotos do Produto (Máximo 4)</label>
                              {((item.images || (item.image_url ? [item.image_url] : [""])).length < 4) && (
                                <button 
                                  type="button"
                                  onClick={() => addCatalogItemImageSlot(item.id)}
                                  className="text-xs text-orange-500 hover:text-orange-400 flex items-center font-semibold bg-orange-500/10 hover:bg-orange-500/20 px-2.5 py-1.5 rounded-lg transition-all"
                                >
                                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Foto
                                </button>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(item.images || (item.image_url ? [item.image_url] : [""])).map((imgUrl, idx) => (
                                <div key={idx} className="bg-black/50 p-4 rounded-2xl border border-zinc-800 space-y-4 flex flex-col justify-between">
                                  {/* 1. FOTO MINIATURA */}
                                  <div className="flex items-center gap-3.5">
                                    {imgUrl ? (
                                      <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border border-zinc-300 bg-white shrink-0 group/img shadow-md flex items-center justify-center p-1">
                                        <img 
                                          src={imgUrl} 
                                          alt={"Foto " + (idx + 1)} 
                                          className="max-w-full max-h-full object-contain" 
                                          referrerPolicy="no-referrer"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => removeCatalogItemImage(item.id, idx)}
                                          className="absolute top-1 right-1 bg-black/85 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
                                          title="Remover Foto"
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center justify-center bg-black/40 text-slate-600 shrink-0">
                                        <ShoppingBag className="w-8 h-8 opacity-45 text-orange-400" />
                                      </div>
                                    )}
                                    <div className="space-y-0.5">
                                      <p className="text-sm font-black text-slate-200">Foto {idx + 1} de 4</p>
                                      <p className="text-xs text-slate-400 font-medium">
                                        {imgUrl ? "⚡ Miniatura carregada" : "⚠️ Nenhuma imagem vinculada"}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* 2. ÁREA LINK WEB IMAGEM */}
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Link Web da Imagem</label>
                                    <input 
                                      type="text" 
                                      className="gm-input w-full !py-2 text-xs font-mono" 
                                      value={imgUrl || ""} 
                                      onChange={e => updateCatalogItemImage(item.id, idx, e.target.value)} 
                                      placeholder={"Cole o link da foto " + (idx + 1) + "..."}
                                    />
                                  </div>

                                  {/* 3. UPLOAD e EXCLUIR */}
                                  <div className="grid grid-cols-2 gap-3 w-full">
                                    <label className="gm-btn gm-btn-outline w-full px-3 py-2.5 text-xs flex items-center justify-center cursor-pointer gap-1.5 hover:bg-orange-500/15">
                                      <Upload className="w-4 h-4" />
                                      <span className="font-bold">Upload</span>
                                      <input 
                                        type="file" 
                                        accept="image/*"
                                        className="hidden" 
                                        onChange={(e) => handleUploadProductImageAtIndex(item.id, idx, e)} 
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => removeCatalogItemImage(item.id, idx)}
                                      className="gm-btn w-full border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 px-3 py-2.5 text-xs flex items-center justify-center gap-1.5"
                                      title="Excluir Foto"
                                    >
                                      <Trash className="w-4 h-4 text-red-400" />
                                      <span className="font-bold">Excluir</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                     </div>
                   </div>
                 ))}
               </div>
            )}
            </div>
            )}
          </div>

          {/* 5. DADOS DE PAGAMENTO (PIX) */}
          <div className="gm-card p-4 sm:p-6 space-y-4">
            <button
               onClick={() => toggleSection('payment')}
               className="w-full flex justify-between items-center text-lg font-semibold text-white group"
            >
              <span className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" /> Dados de Pagamento (PIX)</span>
              {openSections.payment ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {openSections.payment && (
            <div className="grid grid-cols-1 gap-5 animate-in fade-in slide-in-from-top-2 pt-2">
              <div className="space-y-4">
                <div>
                  <label className="gm-label font-semibold">Como deseja receber / Chave PIX</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-medium mb-1 block">Tipo de Chave PIX</label>
                      <select className="gm-input !py-2" value={bioConfig.pix_type} onChange={e => handleChange("pix_type", e.target.value)}>
                        <option value="CPF">CPF</option>
                        <option value="CNPJ">CNPJ</option>
                        <option value="Email">E-mail</option>
                        <option value="Telefone">Telefone</option>
                        <option value="Chave Aleatória">Chave Aleatória</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-medium mb-1 block">Chave PIX</label>
                      <input type="text" className="gm-input !py-2 text-sm" value={bioConfig.pix_key} onChange={e => handleChange("pix_key", e.target.value)} placeholder="Chave do PIX..." />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800/60 pt-4">
                  <label className="gm-label font-semibold">Link para Pagamento (Cartão de Crédito URL)</label>
                  <input type="text" className="gm-input font-mono text-xs !py-2.5" value={bioConfig.card_url || ''} onChange={e => handleChange("card_url", e.target.value)} placeholder="https://link.mercadopago.com/... ou stripe..." />
                  <p className="text-xs text-slate-500 mt-1">Ao receber o clique no botão do cartão de crédito, o cliente será redirecionado para este link de pagamento.</p>
                </div>
              </div>
            </div>
            )}
          </div>

          {/* 6. ENDEREÇO E LOCALIZAÇÃO */}
          <div className="gm-card p-4 sm:p-6 space-y-4">
            <button
               onClick={() => toggleSection('address')}
               className="w-full flex justify-between items-center text-lg font-semibold text-white group"
            >
              <span className="flex items-center gap-2"><MapPin className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" /> Endereço e Localização</span>
              {openSections.address ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {openSections.address && (
            <div className="grid grid-cols-1 gap-5 animate-in fade-in slide-in-from-top-2 pt-2">
              <div className="space-y-4">
                <div>
                  <label className="gm-label font-semibold">Nome do Endereço Completo</label>
                  <textarea className="gm-input min-h-[70px] !py-2.5" value={bioConfig.address} onChange={e => handleChange("address", e.target.value)} placeholder="Rua XYZ, 123 - Cidade/UF" />
                </div>
                <div>
                  <label className="gm-label font-semibold">Link de Localização (Google Maps / Waze)</label>
                  <input type="text" className="gm-input font-mono text-xs !py-2.5" value={bioConfig.address_url || ''} onChange={e => handleChange("address_url", e.target.value)} placeholder="https://maps.app.goo.gl/..." />
                  <p className="text-xs text-slate-500 mt-1">Ao receber o clique no endereço, o cliente abrirá esta localização.</p>
                </div>
              </div>
            </div>
            )}
          </div>

        </div>

      {/* FLOATING ACTION PANEL WITH TOUCH SWIPE-LEFT/RIGHT TO COLLAPSE AND CLICK-TO-EXPAND */}
      <div className="fixed top-1/2 -translate-y-1/2 right-0 z-[80] select-none pointer-events-none flex flex-col items-end">
        <AnimatePresence mode="wait">
          {isDocked ? (
            /* Docked State: Thin vertical color bars fixed on the right edge with high touch sensitivity */
            <motion.div
              key="docked"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              drag="x"
              dragConstraints={{ left: -150, right: 0 }}
              dragElastic={0.15}
              onDragStart={() => {
                isDraggingRef.current = true;
              }}
              onDragEnd={(e, info) => {
                // Drag left (negative offset X) to restore button visual
                if (info.offset.x < -20) {
                  setIsDocked(false);
                }
                setTimeout(() => {
                  isDraggingRef.current = false;
                }, 100);
              }}
              onClick={() => {
                if (isDraggingRef.current) return;
                setIsDocked(false);
              }}
              whileDrag={{ scale: 1.02 }}
              className="pointer-events-auto cursor-grab active:cursor-grabbing flex flex-col items-end group"
            >
              {/* Very generous transparent touch/click padding extending to the left */}
              <div className="flex flex-col gap-2 py-8 pl-12 pr-2 bg-transparent select-none">
                {/* green track segment for Save - completely glued to right edge */}
                <div className="w-3 h-16 rounded-full bg-green-500 transition-all group-hover:w-4 group-hover:bg-green-400" />
                {/* orange track segment for View - completely glued to right edge */}
                <div className="w-3 h-16 rounded-full bg-orange-500 transition-all group-hover:w-4 group-hover:bg-orange-400" />
              </div>
            </motion.div>
          ) : (
            /* Expanded format: Directly draggable circular buttons, swipe left or right to dock, no anchor/labels */
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              drag="x"
              dragConstraints={{ left: -100, right: 100 }}
              dragElastic={0.15}
              onDragStart={() => {
                isDraggingRef.current = true;
              }}
              onDragEnd={(e, info) => {
                // Swipe left or right to dock (info.offset.x > 30 is swiping right, info.offset.x < -30 is swiping left)
                if (info.offset.x > 30 || info.offset.x < -30) {
                  setIsDocked(true);
                }
                setTimeout(() => {
                  isDraggingRef.current = false;
                }, 100);
              }}
              whileDrag={{ scale: 0.95, opacity: 0.9 }}
              className="pointer-events-auto flex flex-col gap-4 pr-4 pb-4 items-center justify-center cursor-grab active:cursor-grabbing"
            >
              {/* SAVE BUTTON (Circular format) */}
              <div className="relative group">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDraggingRef.current) return;
                    handleSave();
                  }}
                  disabled={saving}
                  className="w-14 h-14 bg-green-500 hover:bg-green-600 active:scale-95 text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(34,197,94,0.4)] transition-all duration-300 hover:scale-110 disabled:opacity-50"
                >
                  <Save className="w-6 h-6" />
                </button>
              </div>

              {/* PREVIEW BUTTON (Circular format) */}
              <div className="relative group">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDraggingRef.current) return;
                    setPreviewOpen(true);
                  }}
                  className="w-14 h-14 bg-[var(--gm-primary)] hover:bg-[var(--gm-primary-40)] active:scale-95 text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(255,102,0,0.6)] transition-all duration-300 hover:scale-110"
                >
                  <Eye className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* PREVIEW MODAL */}
      {previewOpen && (
        <div 
          onClick={() => setPreviewOpen(false)}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          {/* Top Center Device Switcher */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 p-1.5 rounded-full flex items-center gap-1.5 shadow-2xl pointer-events-auto"
          >
            <button
              onClick={() => setPreviewMode("smartphone")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                previewMode === "smartphone"
                  ? "bg-orange-500 text-white shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              SMARTPHONE
            </button>
            <button
              onClick={() => setPreviewMode("pc")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                previewMode === "pc"
                  ? "bg-orange-500 text-white shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Layout className="w-4 h-4" />
              DESKTOP PC
            </button>
          </div>

          {/* Viewport Floating Close Button - Highly visible and guaranteed to display inside developer/user iframe/tab */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setPreviewOpen(false);
            }}
            className="fixed top-4 right-4 z-[120] bg-slate-800/90 hover:bg-red-600 text-white font-bold px-4 py-2.5 rounded-full flex items-center justify-center gap-2 shadow-2xl transition-all duration-300 pointer-events-auto border border-white/10"
          >
            <X className="w-5 h-5" />
            <span className="text-sm">Fechar</span>
          </button>

          {previewMode === "smartphone" ? (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[360px] h-[85vh] max-h-[800px] animate-in zoom-in-95 duration-300 cursor-default"
            >
              {/* Close Button above phone - fallback copy */}
              <button 
                onClick={() => setPreviewOpen(false)}
                className="absolute -top-12 right-0 w-10 h-10 bg-slate-800 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-xl border border-white/10"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Smartphone frame */}
              <div className="w-full h-full p-2 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[3rem] shadow-2xl relative">
                {/* Quick internal close button directly inside the smartphone bezel */}
                <button 
                  onClick={() => setPreviewOpen(false)}
                  className="absolute top-4 right-4 z-35 w-8 h-8 bg-black/70 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all border border-white/10"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="w-full h-full overflow-hidden rounded-[2.6rem] bg-[#0a0a0c] relative">
                    {/* Notch Minimalista */}
                    <div className="absolute top-0 w-full h-6 z-20 flex justify-center items-start">
                       <div className="w-24 h-5 bg-black rounded-b-xl flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]" />
                       </div>
                    </div>
                    
                    <div className="w-full h-full">
                       <BioRenderer 
                         asPreview={true}
                         data={{
                           company_name: settings?.company_name,
                           company_logo_url: settings?.company_logo_url,
                           pix_key: bioConfig.pix_key || settings?.pix_key,
                           pix_type: bioConfig.pix_type || settings?.pix_type,
                           brand_primary: settings?.brand_primary,
                           bio_config: bioConfig
                         }} 
                       />
                    </div>
                </div>
              </div>
            </div>
          ) : (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl h-[85vh] max-h-[850px] animate-in zoom-in-95 duration-300 cursor-default bg-[#0a0a0c] border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Browser Top Window Controls */}
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/80 block"></span>
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80 block"></span>
                  <span className="w-3 h-3 rounded-full bg-green-500/80 block"></span>
                  
                  <div className="ml-4 px-3 py-1 bg-zinc-950/80 rounded-md text-[10px] font-mono text-zinc-400 select-all flex items-center gap-1.5 border border-zinc-800">
                    <Globe className="w-3 h-3 text-zinc-500" />
                    <span>https://gmedificacao.bio/{tenantId || "preview"}</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => setPreviewOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-red-600/10 hover:text-red-500 transition-colors cursor-pointer text-zinc-400"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* PC Content frame */}
              <div className="flex-1 overflow-auto bg-[#0a0a0c]">
                 <BioRenderer 
                   asPreview={true}
                   data={{
                     company_name: settings?.company_name,
                     company_logo_url: settings?.company_logo_url,
                     pix_key: bioConfig.pix_key || settings?.pix_key,
                     pix_type: bioConfig.pix_type || settings?.pix_type,
                     brand_primary: settings?.brand_primary,
                     bio_config: bioConfig
                   }} 
                 />
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </Page>
  );
}
