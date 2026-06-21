import React, { useState, useEffect } from "react";
import { Page } from "../components/ui/Page";
import { Link } from "react-router-dom";
import { Copy, Check, Info, Plus, Trash, Eye, X, Upload, ChevronDown, ChevronUp, Save, Smartphone, Layout, Link as LinkIcon, ShoppingBag, MapPin } from "lucide-react";
import { useAuth } from "../store/AuthContext";
import { fetchSettingsSupabase, upsertSettingsSupabase, AppSettings } from "../lib/settings";
import { pushToast } from "../store/toast";
import BioRenderer, { getPlatformIcon } from "../components/bio/BioRenderer";
import { supabase } from "../lib/supabase";
import imageCompression from "browser-image-compression";

export default function Bio() {
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Accordion state
  const [openSections, setOpenSections] = useState({
    basic: true,
    appearance: true,
    contacts: true,
    otherLinks: true,
    catalog: true,
    address: true,
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
    custom_links: [] as any[],
    theme: "dark",
    color: "",
    catalog_title: "Catálogo",
    catalog_items: [] as any[],
    bg_image_url: "",
  });

  const uploadImage = async (file: File): Promise<string> => {
    if (!tenantId) throw new Error("Sem tenant id");
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };
    const compressed = await imageCompression(file, options);
    
    const ext = file.name.split(".").pop();
    const filename = `bio_image_${Date.now()}_${Math.random().toString(36).substring(2,8)}.${ext}`;
    const path = `${tenantId}/bio/${filename}`;
    
    const { error } = await supabase.storage.from("tenant-assets").upload(path, compressed, { contentType: file.type });
    if (error) throw error;
    
    const { data } = supabase.storage.from("tenant-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      pushToast({ type: "info", title: "Upload", message: "Enviando imagem de fundo..." });
      const url = await uploadImage(e.target.files[0]);
      handleChange("bg_image_url", url);
      pushToast({ type: "success", title: "Sucesso", message: "Imagem enviada" });
    } catch(err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao enviar imagem" });
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
      if (res && res.error && String(JSON.stringify(res.error)).includes("bio_config")) {
         pushToast({ type: "error", title: "Atenção (Requer SQL)", message: "A coluna bio_config não existe. Execute o db_setup.sql no seu Supabase!" });
      } else if (res && res.error) {
         pushToast({ type: "error", title: "Erro", message: "Falha ao salvar." });
      } else {
         pushToast({ type: "success", title: "Salvo", message: "Sua Bio foi atualizada com sucesso!" });
      }
    } catch (e: any) {
      pushToast({ type: "error", title: "Erro", message: e.message || "Falha ao salvar." });
    }
    setSaving(false);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#/bio/${tenantId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    pushToast({ type: "success", title: "Copiado", message: "Link da bio copiado!" });
  };

  const handleChange = (field: string, value: string) => {
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
      catalog_items: [...prev.catalog_items, { id: Date.now().toString(), name: '', price: '', image_url: '', url: '' }]
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

  if (loading) {
    return <Page title="Minha Bio"><div className="p-4 text-slate-400">Carregando...</div></Page>;
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
    <Page title="Minha Bio">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 pb-20 items-start">
        
        {/* COLUNA ESQUERDA */}
        <div className="space-y-6">
          <div className="gm-card p-4 sm:p-6 text-center space-y-4 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-rose-500" />
             <h3 className="text-lg font-bold text-white">Sua Página Pública</h3>
             <p className="text-slate-400 text-sm">Essa é a página que você pode enviar para seus clientes como um cartão de visitas digital ou Link na Bio.</p>
             
             <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
               <button onClick={handleCopyLink} className="gm-btn gm-btn-primary flex items-center justify-center min-w-[200px]">
                 {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                 {copied ? "Link Copiado!" : "Copiar Link Público"}
               </button>
               <Link to={`/bio/${tenantId}`} target="_blank" className="gm-btn gm-btn-outline flex items-center justify-center">
                 Ver Tela Inteira
               </Link>
             </div>
          </div>

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
                <input type="text" className="gm-input" value={bioConfig.title} onChange={e => handleChange("title", e.target.value)} placeholder="Ex: GM Edificação" />
              </div>
              <div>
                <label className="gm-label">Descrição Curta</label>
                <input type="text" className="gm-input" value={bioConfig.description} onChange={e => handleChange("description", e.target.value)} placeholder="Sua frase de destaque..." />
              </div>
            </div>
            )}
          </div>

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
                  <input type="text" className="gm-input flex-1" value={bioConfig.color || settings?.brand_primary || "#ff7a00"} onChange={e => handleChange("color", e.target.value)} />
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
              <div className="sm:col-span-2">
                <label className="gm-label">Imagem de Fundo (Fica atrás da bio)</label>
                <div className="flex gap-2">
                  <input type="text" className="gm-input flex-1" value={bioConfig.bg_image_url || ''} onChange={e => handleChange("bg_image_url", e.target.value)} placeholder="https://... ou faça upload" />
                  <label className="gm-btn gm-btn-outline flex items-center justify-center cursor-pointer shrink-0">
                    <Upload className="w-4 h-4 mr-2" /> Upload
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadBg} />
                  </label>
                </div>
              </div>
            </div>
            )}
          </div>

        </div>

        {/* COLUNA DIREITA */}
        <div className="space-y-6">

          <div className="gm-card p-4 sm:p-6 space-y-4">
            <button
               onClick={() => toggleSection('contacts')}
               className="w-full flex justify-between items-center text-lg font-semibold text-white"
            >
              <span>Contatos e Redes</span>
              {openSections.contacts ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {openSections.contacts && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 pt-2">
              <div>
                <label className="gm-label">WhatsApp (com DDD)</label>
                <input type="text" className="gm-input" value={bioConfig.whatsapp} onChange={e => handleChange("whatsapp", e.target.value)} placeholder="Ex: 11999999999" />
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
                  className="flex items-center text-orange-500 hover:text-orange-400 text-sm font-medium"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </button>
              </div>
            
            {bioConfig.custom_links.length === 0 ? (
               <div className="text-center py-4 text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
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
                         className="absolute top-2 right-2 text-slate-500 hover:text-red-400 p-1"
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
                             className="gm-input w-full !py-2" 
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
                <input type="text" className="gm-input" value={bioConfig.website} onChange={e => handleChange("website", e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className="gm-label">URL do Portfólio</label>
                <input type="text" className="gm-input" value={bioConfig.portfolio_url} onChange={e => handleChange("portfolio_url", e.target.value)} placeholder="https://seu-portfolio.com" />
              </div>
              <div>
                <label className="gm-label">URL do Catálogo (PDF ou site)</label>
                <input type="text" className="gm-input" value={bioConfig.catalog_url} onChange={e => handleChange("catalog_url", e.target.value)} placeholder="https://link-do-catalogo.com" />
              </div>
            </div>
            </div>
            )}
          </div>

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
              <div className="flex justify-end mb-4">
                <button 
                  onClick={addCatalogItem}
                  className="text-sm text-orange-500 hover:text-orange-400 flex items-center font-medium"
                >
                  <Plus className="w-4 h-4 mr-1" /> Adicionar Produto
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <label className="gm-label">Título da Seção de Catálogo</label>
                <input type="text" className="gm-input" value={bioConfig.catalog_title || 'Catálogo'} onChange={e => handleChange("catalog_title", e.target.value)} placeholder="Ex: Meus Produtos" />
              </div>
            </div>

            {bioConfig.catalog_items?.length === 0 ? (
               <div className="text-center py-4 text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
                 Nenhum produto no catálogo. Clique em "Adicionar" para exibir fotos e preços.
               </div>
            ) : (
               <div className="space-y-4">
                 {bioConfig.catalog_items?.map((item) => (
                   <div key={item.id} className="p-4 bg-[var(--gm-bg)] rounded-xl border border-slate-800/80 space-y-3 relative group">
                     <button 
                       onClick={() => removeCatalogItem(item.id)}
                       className="absolute top-2 right-2 text-slate-500 hover:text-red-400 p-1 bg-black/20 rounded-full"
                     >
                       <Trash className="w-4 h-4" />
                     </button>
                     
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                       <div className="sm:col-span-2">
                         <label className="text-xs text-slate-400 mb-1 block">Nome do Produto/Serviço</label>
                         <input 
                           type="text" 
                           className="gm-input w-full !py-2" 
                           value={item.name} 
                           onChange={e => updateCatalogItem(item.id, 'name', e.target.value)} 
                           placeholder="Ex: Tênis Nike Air"
                         />
                       </div>
                       <div className="sm:col-span-2">
                         <label className="text-xs text-slate-400 mb-1 block">Descrição do Produto</label>
                         <textarea 
                           className="gm-input w-full !py-2 text-sm" 
                           value={item.description || ''} 
                           onChange={e => updateCatalogItem(item.id, 'description', e.target.value)} 
                           placeholder="Ex: Tênis em couro, ótimo para corridas."
                           rows={2}
                         />
                       </div>
                       <div>
                         <label className="text-xs text-slate-400 mb-1 block">Preço (opcional)</label>
                         <input 
                           type="text" 
                           className="gm-input w-full !py-2" 
                           value={item.price} 
                           onChange={e => updateCatalogItem(item.id, 'price', e.target.value)} 
                           placeholder="Ex: R$ 199,90"
                         />
                       </div>
                       <div>
                         <label className="text-xs text-slate-400 mb-1 block">Imagem</label>
                         <div className="flex gap-2">
                           <input 
                             type="text" 
                             className="gm-input flex-1 !py-2" 
                             value={item.image_url} 
                             onChange={e => updateCatalogItem(item.id, 'image_url', e.target.value)} 
                             placeholder="URL..."
                           />
                           <label className="gm-btn gm-btn-outline px-3 flex items-center justify-center cursor-pointer shrink-0">
                             <Upload className="w-4 h-4" />
                             <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadProductImage(item.id, e)} />
                           </label>
                         </div>
                       </div>
                       <div className="sm:col-span-2">
                         <label className="text-xs text-slate-400 mb-1 block">Link Direto (WhatsApp/Compra)</label>
                         <input 
                           type="text" 
                           className="gm-input w-full !py-2" 
                           value={item.url} 
                           onChange={e => updateCatalogItem(item.id, 'url', e.target.value)} 
                           placeholder="Opcional. Link para ir ao clicar"
                         />
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
            )}
            </div>
            )}
          </div>

          <div className="gm-card p-4 sm:p-6 space-y-4">
            <button
               onClick={() => toggleSection('address')}
               className="w-full flex justify-between items-center text-lg font-semibold text-white group"
            >
              <span className="flex items-center gap-2"><MapPin className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" /> Endereço e Pagamento</span>
              {openSections.address ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {openSections.address && (
            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-2 pt-2">
              <div>
                <label className="gm-label">Nome do Endereço Completo</label>
                <textarea className="gm-input min-h-[50px]" value={bioConfig.address} onChange={e => handleChange("address", e.target.value)} placeholder="Rua XYZ, 123 - Cidade/UF" />
              </div>
              <div>
                <label className="gm-label">Link de Localização (Google Maps / Waze)</label>
                <input type="text" className="gm-input" value={bioConfig.address_url || ''} onChange={e => handleChange("address_url", e.target.value)} placeholder="https://maps.app.goo.gl/..." />
                <p className="text-xs text-slate-500 mt-1">Ao clicar no endereço, o cliente abriá este link.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="gm-label">Tipo de Chave PIX</label>
                  <select className="gm-input" value={bioConfig.pix_type} onChange={e => handleChange("pix_type", e.target.value)}>
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="Email">E-mail</option>
                    <option value="Telefone">Telefone</option>
                    <option value="Chave Aleatória">Chave Aleatória</option>
                  </select>
                </div>
                <div>
                  <label className="gm-label">Chave PIX</label>
                  <input type="text" className="gm-input" value={bioConfig.pix_key} onChange={e => handleChange("pix_key", e.target.value)} />
                </div>
              </div>
            </div>
            )}
          </div>

          <div className="flex justify-end pt-4 pb-8">
            <button
              onClick={handleSave}
              disabled={saving}
              className="gm-btn gm-btn-primary min-w-[140px]"
            >
              {saving ? "Salvando..." : "Salvar Minha Bio"}
            </button>
          </div>
        </div>
      </div>

      {/* FLOATING SAVE BUTTON */}
      <button 
        onClick={handleSave}
        disabled={saving}
        className="fixed bottom-[96px] right-6 lg:bottom-[104px] lg:right-10 z-[80] w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(34,197,94,0.3)] transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
      >
        <Save className="w-6 h-6" />
      </button>

      {/* FLOATING PREVIEW BUTTON */}
      <button 
        onClick={() => setPreviewOpen(true)}
        className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-[80] w-14 h-14 bg-[var(--gm-primary)] hover:bg-[var(--gm-primary-40)] text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(255,102,0,0.5)] transition-all duration-300 hover:scale-110"
      >
        <Eye className="w-6 h-6" />
      </button>

      {/* PREVIEW MODAL */}
      {previewOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-[360px] h-[85vh] max-h-[800px] animate-in zoom-in-95 duration-300">
            {/* Close Button */}
            <button 
              onClick={() => setPreviewOpen(false)}
              className="absolute -top-12 right-0 md:-right-12 w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center transition-colors shadow-xl"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Smartphone frame */}
            <div className="w-full h-full border-[10px] border-slate-900 rounded-[3rem] shadow-2xl overflow-hidden bg-[#0a0a0c] relative">
               <div className="absolute top-0 w-full h-6 bg-slate-900 z-10 flex justify-center items-center rounded-b-[1.5rem] px-4">
                  <div className="w-16 h-4 bg-black rounded-full" />
               </div>
               
               <div className="w-full h-full pt-6">
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
      )}
    </Page>
  );
}
