import React, { useState, useEffect, useRef } from "react";
import { Page } from "../components/ui/Page";
import { Link } from "react-router-dom";
import { Copy, Check, Info, Plus, Trash, Eye, X, Upload, ChevronDown, ChevronUp, Save, Smartphone, Monitor, Layout, Link as LinkIcon, ShoppingBag, MapPin, Sparkles, Globe, Phone, CreditCard, List, PlusCircle, Trash2, RotateCcw, Edit3, AlignLeft, AlignCenter, AlignRight, Bold, Italic } from "lucide-react";
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

function OptimizedImage({ src, alt, className, width = 360 }: { src: string; alt: string; className?: string; width?: number }) {
  const isVideo = !!(src && (src.endsWith(".mp4") || src.includes(".mp4?") || src.includes("video/mp4") || src.endsWith(".webm") || src.includes(".webm?") || src.includes("video/webm")));
  const isGif = !!(src && (src.endsWith(".gif") || src.includes(".gif?") || src.includes("image/gif")));

  const [imgSrc, setImgSrc] = useState(() => {
    if (src && src.includes("/storage/v1/object/public/") && !isVideo && !isGif) {
      return src.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") + `?width=${width}&quality=75`;
    }
    return src;
  });

  const handleError = () => {
    if (imgSrc !== src) {
      setImgSrc(src);
    }
  };

  useEffect(() => {
    if (src && src.includes("/storage/v1/object/public/") && !isVideo && !isGif) {
      setImgSrc(src.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") + `?width=${width}&quality=75`);
    } else {
      setImgSrc(src);
    }
  }, [src, width, isVideo, isGif]);

  if (isVideo) {
    return (
      <video
        src={src}
        className={className}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        controlsList="nodownload"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        style={{ transform: "translate3d(0, 0, 0)", backfaceVisibility: "hidden" }}
      />
    );
  }

  return (
    <img 
      src={imgSrc} 
      alt={alt} 
      className={className} 
      onError={handleError} 
      referrerPolicy="no-referrer" 
      loading="lazy"
    />
  );
}

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

  // Tab control inside Catalog
  const [catalogTab, setCatalogTab] = useState<'list' | 'add' | 'trash'>('list');
  // Track expanded catalog item IDs for edit view list
  const [expandedCatalogItems, setExpandedCatalogItems] = useState<string[]>([]);
  // Local state for deleted catalog items (trash bin)
  const [deletedCatalogItems, setDeletedCatalogItems] = useState<any[]>([]);
  const [deletedPortfolioItems, setDeletedPortfolioItems] = useState<any[]>([]);
  const [activePortfolioTab, setActivePortfolioTab] = useState<"active" | "trash">("active");
  const [editingPortfolioItem, setEditingPortfolioItem] = useState<any>(null);

  // State for adding a new catalog item form
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    url: '',
    description: '',
    images: [''],
    options: [] as any[]
  });

  // Accordion state
  const [openSections, setOpenSections] = useState({
    portfolio: false,
    basic: false,
    appearance: false,
    contacts: false,
    otherLinks: false,
    catalog: false,
    address: false,
    payment: false,
    contactSection: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getSelectSizeValue = (size?: string) => {
    if (!size) return "16 pt";
    if (size === "sm") return "12 pt";
    if (size === "base") return "14 pt";
    if (size === "lg") return "16 pt";
    if (size === "xl") return "24 pt";
    return size;
  };

  const getFontSizeClass = (size?: string) => {
    const resolvedSize = size ? (size === "sm" ? "12 pt" : size === "base" ? "14 pt" : size === "lg" ? "16 pt" : size === "xl" ? "24 pt" : size) : "16 pt";
    switch (resolvedSize) {
      case "10 pt": return "text-[10pt]";
      case "12 pt": return "text-[11pt] sm:text-[12pt]";
      case "14 pt": return "text-[12pt] sm:text-[14pt]";
      case "16 pt": return "text-[14pt] sm:text-[16pt]";
      case "18 pt": return "text-[15pt] sm:text-[18pt]";
      case "20 pt": return "text-[16pt] sm:text-[20pt]";
      case "24 pt": return "text-[18pt] sm:text-[24pt]";
      case "30 pt": return "text-[22pt] sm:text-[30pt]";
      case "36 pt": return "text-[26pt] sm:text-[36pt]";
      case "48 pt": return "text-[32pt] sm:text-[48pt]";
      default:
        return "text-[14pt] sm:text-[16pt]";
    }
  };

  // Campos principais
  const [bioConfig, setBioConfig] = useState({
    title: "",
    title_mobile: "",
    description: "",
    description_mobile: "",
    description_align: "center" as "center" | "left" | "right",
    description_bold: false,
    description_italic: false,
    description_font: "ui",
    description_size: "lg",
    phone: "",
    email: "",
    whatsapp: "",
    instagram: "",
    facebook: "",
    telegram: "",
    linkedin: "",
    tiktok: "",
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
    portfolio_title: "Portfólio",
    portfolio_items: [] as any[],
    bg_image_url: "",
    bg_mobile_image_url: "",
    show_banners: false,
    banner_img_url_1: "",
    banner_img_url_2: "",
    banner_img_url_3: "",
    mobile_banner_img_url_1: "",
    mobile_banner_img_url_2: "",
    mobile_banner_img_url_3: "",
    site_font: "inter",
    site_font_size: "md",
    bg_animation: "parallax",
    contact_banner_img_url: "",
    contact_title: "",
    contact_desc: "",
    chat_balloon_enabled: true,
    chat_balloon_bg_color: "#FE540B",
    chat_balloon_text_color: "#FFFFFF",
    chat_balloon_text: "Olá 👋\nSou Denis, como posso te ajudar hoje?",
    chat_balloon_button_text: "Abrir chat",
  });

  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef("");
  const [basicInfoTab, setBasicInfoTab] = useState<"desktop" | "mobile">("desktop");
  const [isSelectionBold, setIsSelectionBold] = useState(false);
  const [isSelectionItalic, setIsSelectionItalic] = useState(false);
  const [selectionFont, setSelectionFont] = useState<string>("");

  const updateSelectionStates = () => {
    try {
      setIsSelectionBold(document.queryCommandState('bold'));
      setIsSelectionItalic(document.queryCommandState('italic'));

      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current) {
        let node = sel.anchorNode;
        let detectedFont = "";
        while (node && node !== editorRef.current) {
          if (node instanceof HTMLElement) {
            const fontClass = Array.from(node.classList).find(c => c.startsWith('bio-desc-font-'));
            if (fontClass) {
              detectedFont = fontClass.replace('bio-desc-font-', '');
              break;
            }
          }
          node = node.parentNode;
        }
        setSelectionFont(detectedFont);
      } else {
        setSelectionFont("");
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      if (editorRef.current && (document.activeElement === editorRef.current || editorRef.current.contains(document.activeElement))) {
        updateSelectionStates();
      } else {
        setIsSelectionBold(false);
        setIsSelectionItalic(false);
        setSelectionFont("");
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      const currentHTML = editorRef.current.innerHTML;
      const targetDesc = basicInfoTab === "desktop" ? (bioConfig.description || "") : (bioConfig.description_mobile || "");
      if (targetDesc !== lastHtmlRef.current || currentHTML !== targetDesc) {
        editorRef.current.innerHTML = targetDesc;
        lastHtmlRef.current = targetDesc;
      }
    }
  }, [bioConfig.description, bioConfig.description_mobile, openSections.basic, basicInfoTab]);

  const hasActiveSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
    if (editorRef.current) {
      return editorRef.current.contains(sel.anchorNode);
    }
    return false;
  };

  const handleBoldClick = () => {
    if (hasActiveSelection()) {
      document.execCommand('bold', false);
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        lastHtmlRef.current = html;
        handleChange("description", html);
      }
      setTimeout(updateSelectionStates, 0);
    } else {
      handleChange("description_bold", !bioConfig.description_bold);
    }
  };

  const handleItalicClick = () => {
    if (hasActiveSelection()) {
      document.execCommand('italic', false);
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        lastHtmlRef.current = html;
        handleChange("description", html);
      }
      setTimeout(updateSelectionStates, 0);
    } else {
      handleChange("description_italic", !bioConfig.description_italic);
    }
  };

  const handleFontChange = (fontValue: string) => {
    if (hasActiveSelection()) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const span = document.createElement("span");
        span.className = `bio-desc-font-${fontValue}`;
        
        let fontFamilyStr = "";
        if (fontValue === "ui") fontFamilyStr = "'Inter', sans-serif";
        else if (fontValue === "tech") fontFamilyStr = "'JetBrains Mono', monospace";
        else if (fontValue === "modern") fontFamilyStr = "'Plus Jakarta Sans', sans-serif";
        else if (fontValue === "elegant") fontFamilyStr = "'Raleway', sans-serif";
        else if (fontValue === "classic") fontFamilyStr = "'Montserrat', sans-serif";
        else if (fontValue === "funnel") fontFamilyStr = "'Funnel Display', sans-serif";
        
        if (fontFamilyStr) {
          span.style.fontFamily = fontFamilyStr;
        }

        try {
          span.appendChild(range.extractContents());
          range.insertNode(span);
          if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            lastHtmlRef.current = html;
            handleChange("description", html);
          }
          setTimeout(updateSelectionStates, 0);
        } catch (err) {
          console.error("Error formatting selection font", err);
        }
      }
    } else {
      handleChange("description_font", fontValue);
    }
  };

  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
    const html = e.currentTarget.innerHTML;
    lastHtmlRef.current = html;
    if (basicInfoTab === "desktop") {
      handleChange("description", html);
    } else {
      handleChange("description_mobile", html);
    }
  };

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

  const compressVideoFidelity = (file: File): Promise<Blob | File> => {
    return new Promise((resolve) => {
      if (
        typeof window === "undefined" ||
        !window.MediaRecorder ||
        !HTMLCanvasElement.prototype.captureStream
      ) {
        console.warn("MediaRecorder ou captureStream não suportado pelo navegador. Usando arquivo original.");
        resolve(file);
        return;
      }

      pushToast({ 
        type: "info", 
        title: "Otimizando Vídeo", 
        message: "Iniciando compressão de alta fidelidade..." 
      });

      const video = document.createElement("video");
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;

      video.onloadedmetadata = () => {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const duration = video.duration || 5;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
          return;
        }

        const stream = canvas.captureStream(24);
        
        let mimeType = "video/webm;codecs=vp9";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "video/webm;codecs=vp8";
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "video/webm";
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "video/mp4";
        }

        const targetBitrate = 1200000; // 1.2 Mbps - excelente equilíbrio de fidelidade, resolução e leveza para web
        const options = {
          mimeType,
          videoBitsPerSecond: targetBitrate,
        };

        try {
          const mediaRecorder = new MediaRecorder(stream, options);
          const chunks: Blob[] = [];

          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          mediaRecorder.onstop = () => {
            URL.revokeObjectURL(objectUrl);
            const compressedBlob = new Blob(chunks, { type: mimeType });
            
            if (compressedBlob.size > 100) {
              const originalSizeMB = (file.size / (1024 * 1024)).toFixed(1);
              const compressedSizeMB = (compressedBlob.size / (1024 * 1024)).toFixed(1);
              pushToast({
                type: "success",
                title: "Vídeo Otimizado",
                message: `Resolução: ${width}x${height}. Tamanho reduzido de ${originalSizeMB}MB para ${compressedSizeMB}MB!`
              });
              resolve(compressedBlob);
            } else {
              resolve(file);
            }
          };

          // Rodar em velocidade normal para garantir que nenhuma frame seja pulada ou travada durante a captura do canvas!
          video.playbackRate = 1.0; 

          video.onplay = () => {
            mediaRecorder.start();
            
            const drawFrame = () => {
              if (video.paused || video.ended) {
                if (mediaRecorder.state !== "inactive") {
                  mediaRecorder.stop();
                }
                return;
              }
              
              ctx.drawImage(video, 0, 0, width, height);
              requestAnimationFrame(drawFrame);
            };

            drawFrame();
          };

          video.onended = () => {
            if (mediaRecorder.state !== "inactive") {
              mediaRecorder.stop();
            }
          };

          video.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(file);
          };

          video.play().catch((err) => {
            console.error("Erro ao reproduzir vídeo para compressão:", err);
            URL.revokeObjectURL(objectUrl);
            resolve(file);
          });

        } catch (recorderError) {
          console.error("Erro ao instanciar MediaRecorder:", recorderError);
          URL.revokeObjectURL(objectUrl);
          resolve(file);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
    });
  };

  const uploadImage = async (file: File, isHighQuality = false): Promise<string> => {
    if (!tenantId) throw new Error("Sem tenant id");
    
    let compressed;
    let ext;
    let contentType;
    
    const isVideo = file.type.startsWith("video/") || file.name.endsWith(".mp4") || file.name.endsWith(".webm");
    
    if (isVideo) {
      // Se o vídeo for menor ou igual a 12MB, não roda compressão para preservar a fluidez original de 60FPS
      if (file.size <= 12 * 1024 * 1024) {
        compressed = file;
        ext = file.name.split('.').pop()?.toLowerCase() || "mp4";
        contentType = file.type || `video/${ext}`;
      } else {
        try {
          compressed = await compressVideoFidelity(file);
          if (compressed.type && compressed.type.includes("webm")) {
            ext = "webm";
            contentType = "video/webm";
          } else if (compressed.type && compressed.type.includes("mp4")) {
            ext = "mp4";
            contentType = "video/mp4";
          } else {
            ext = "mp4";
            contentType = "video/mp4";
          }
        } catch (err) {
          console.error("Erro ao comprimir vídeo, enviando original:", err);
          compressed = file;
          ext = file.name.split('.').pop()?.toLowerCase() || "mp4";
          contentType = file.type || `video/${ext}`;
        }
      }
    } else if (file.type === "image/png" || file.type === "image/gif") {
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

  
  
  const handleAddPortfolioCollection = () => {
    const current = bioConfig.portfolio_items || [];
    const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
    const newItem = {
      id: Date.now().toString(),
      title: `Portfólio ${normalized.length + 1}`,
      layers: []
    };
    handleChange("portfolio_items", [...normalized, newItem]);
  };

  const handleUpdatePortfolioCollection = (id: string, updates: any) => {
    const current = bioConfig.portfolio_items || [];
    const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
    handleChange("portfolio_items", normalized.map((p: any) => p.id === id ? { ...p, ...updates } : p));
  };

  const handleRemovePortfolioCollection = (id: string) => {
    const current = bioConfig.portfolio_items || [];
    const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
    const itemToDelete = normalized.find((i: any) => i.id === id);
    if (itemToDelete) {
      setDeletedPortfolioItems(prev => [...prev, itemToDelete]);
    }
    handleChange("portfolio_items", normalized.filter((p: any) => p.id !== id));
  };

  const restorePortfolioCollection = (id: string) => {
    const itemToRestore = deletedPortfolioItems.find(i => i.id === id);
    if (itemToRestore) {
      const current = bioConfig.portfolio_items || [];
      const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
      handleChange("portfolio_items", [...normalized, itemToRestore]);
      setDeletedPortfolioItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const permanentlyDeletePortfolioCollection = (id: string) => {
    setDeletedPortfolioItems(prev => prev.filter(i => i.id !== id));
  };

  const clearPortfolioTrash = () => {
    setDeletedPortfolioItems([]);
  };

  const handleUploadPortfolioLayer = async (portfolioId: string, e: any) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      pushToast({ type: "info", title: "Upload", message: "Enviando banner..." });
      const url = await uploadImage(e.target.files[0]);
      
      const current = bioConfig.portfolio_items || [];
      const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
      
      handleChange("portfolio_items", normalized.map((p: any) => {
        if (p.id === portfolioId) {
          return {
            ...p,
            layers: [...(p.layers || []), { id: Date.now().toString(), image_url: url }]
          };
        }
        return p;
      }));
      
      pushToast({ type: "success", title: "Sucesso", message: "Banner adicionado" });
    } catch(err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao enviar banner" });
    }
  };

  const handleRemovePortfolioLayer = (portfolioId: string, layerId: string) => {
    const current = bioConfig.portfolio_items || [];
    const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
    
    handleChange("portfolio_items", normalized.map((p: any) => {
      if (p.id === portfolioId) {
        return {
          ...p,
          layers: (p.layers || []).filter((l: any) => l.id !== layerId)
        };
      }
      return p;
    }));
  };

  const handleUploadPortfolioMobileLayer = async (portfolioId: string, e: any) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      pushToast({ type: "info", title: "Upload", message: "Enviando banner smartphone..." });
      const url = await uploadImage(e.target.files[0]);
      
      const current = bioConfig.portfolio_items || [];
      const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
      
      handleChange("portfolio_items", normalized.map((p: any) => {
        if (p.id === portfolioId) {
          return {
            ...p,
            mobile_layers: [...(p.mobile_layers || []), { id: Date.now().toString(), image_url: url }]
          };
        }
        return p;
      }));
      
      pushToast({ type: "success", title: "Sucesso", message: "Banner smartphone adicionado" });
    } catch(err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao enviar banner smartphone" });
    }
  };

  const handleRemovePortfolioMobileLayer = (portfolioId: string, layerId: string) => {
    const current = bioConfig.portfolio_items || [];
    const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
    
    handleChange("portfolio_items", normalized.map((p: any) => {
      if (p.id === portfolioId) {
        return {
          ...p,
          mobile_layers: (p.mobile_layers || []).filter((l: any) => l.id !== layerId)
        };
      }
      return p;
    }));
  };


  const handleUploadPortfolioItem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      pushToast({ type: "info", title: "Upload", message: "Enviando imagem do portfólio..." });
      const url = await uploadImage(e.target.files[0]);
      
      const newItem = {
        id: Date.now().toString(),
        image_url: url
      };
      
      const current = bioConfig.portfolio_items || [];
      handleChange("portfolio_items", [...current, newItem]);
      
      pushToast({ type: "success", title: "Sucesso", message: "Imagem enviada" });
    } catch(err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao enviar imagem" });
    }
  };

  const handleRemovePortfolioItem = (id: string) => {
    const current = bioConfig.portfolio_items || [];
    handleChange("portfolio_items", current.filter((item: any) => item.id !== id));
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

  const handleUploadContactBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      pushToast({ type: "info", title: "Upload", message: "Enviando banner de contato..." });
      const url = await uploadImage(e.target.files[0]);
      handleChange("contact_banner_img_url", url);
      pushToast({ type: "success", title: "Sucesso", message: "Banner de contato enviado" });
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
        portfolio_items: s.bio_config.portfolio_items || [],
        portfolio_title: s.bio_config.portfolio_title || "Portfólio",
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
    const url = `${window.location.origin}/bio/${getCustomSlug()}`;
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
    const itemToRemove = bioConfig.catalog_items.find(i => i.id === id);
    if (itemToRemove) {
      setDeletedCatalogItems(prev => [...prev, itemToRemove]);
    }
    setBioConfig(prev => ({
      ...prev,
      catalog_items: prev.catalog_items.filter(i => i.id !== id)
    }));
    pushToast({ type: "info", title: "Lixeira", message: "Produto movido para a lixeira." });
  };

  const restoreCatalogItem = (id: string) => {
    const itemToRestore = deletedCatalogItems.find(i => i.id === id);
    if (itemToRestore) {
      setBioConfig(prev => ({
        ...prev,
        catalog_items: [...prev.catalog_items, itemToRestore]
      }));
      setDeletedCatalogItems(prev => prev.filter(i => i.id !== id));
      pushToast({ type: "success", title: "Restaurado", message: "Produto restaurado com sucesso!" });
    }
  };

  const permanentlyDeleteCatalogItem = (id: string) => {
    setDeletedCatalogItems(prev => prev.filter(i => i.id !== id));
    pushToast({ type: "info", title: "Excluído", message: "Produto excluído permanentemente." });
  };

  const clearTrash = () => {
    setDeletedCatalogItems([]);
    pushToast({ type: "info", title: "Lixeira", message: "Lixeira esvaziada." });
  };

  const updateCatalogItem = (id: string, field: string, value: any) => {
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
          if (currentImages.length < 8) {
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

  const handleUploadNewProductImageAtIndex = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      pushToast({ type: "info", title: "Upload", message: "Enviando imagem do produto..." });
      const url = await uploadImage(e.target.files[0], true);
      
      setNewProduct(prev => {
        const currentImages = [...prev.images];
        currentImages[index] = url;
        return { ...prev, images: currentImages };
      });
      
      pushToast({ type: "success", title: "Sucesso", message: "Imagem de produto enviada" });
    } catch(err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao enviar imagem" });
    }
  };

  const addNewProductImageSlot = () => {
    setNewProduct(prev => {
      if (prev.images.length < 8) {
        return { ...prev, images: [...prev.images, ''] };
      }
      return prev;
    });
  };

  const removeNewProductImageSlot = (index: number) => {
    setNewProduct(prev => {
      const currentImages = [...prev.images];
      currentImages.splice(index, 1);
      if (currentImages.length === 0) {
        currentImages.push('');
      }
      return { ...prev, images: currentImages };
    });
  };

  const addNewProductOption = () => {
    setNewProduct(prev => ({
      ...prev,
      options: [...(prev.options || []), { id: Date.now().toString(), quantity: '', price: '' }]
    }));
  };

  const removeNewProductOption = (idx: number) => {
    setNewProduct(prev => ({
      ...prev,
      options: (prev.options || []).filter((_, i) => i !== idx)
    }));
  };

  const updateNewProductOption = (idx: number, field: string, value: any) => {
    setNewProduct(prev => ({
      ...prev,
      options: (prev.options || []).map((o, i) => i === idx ? { ...o, [field]: value } : o)
    }));
  };

  const handleCreateProduct = () => {
    if (!newProduct.name.trim()) {
      pushToast({ type: 'error', title: 'Erro', message: 'Por favor, insira o nome do produto.' });
      return;
    }
    
    setBioConfig(prev => ({
      ...prev,
      catalog_items: [
        ...(prev.catalog_items || []), 
        { 
          id: Date.now().toString(), 
          name: newProduct.name, 
          price: newProduct.price, 
          image_url: newProduct.images[0] || '', 
          url: newProduct.url, 
          description: newProduct.description, 
          images: newProduct.images || [''], 
          options: newProduct.options || [] 
        }
      ]
    }));
    
    // Reset form
    setNewProduct({
      name: '',
      price: '',
      url: '',
      description: '',
      images: [''],
      options: []
    });
    
    setCatalogTab('list');
    pushToast({ type: 'success', title: 'Sucesso', message: 'Produto cadastrado com sucesso!' });
  };

  const primaryColor = settings?.brand_primary || "#FF6900";

  if (loading) {
    return (
      <Page title="BIO CardDigital GM">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: primaryColor }} />
        </div>
      </Page>
    );
  }

  const platforms = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'whatsapp', label: 'WhatsApp' },
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
      <div 
        className="w-full max-w-6xl mx-auto pb-20 space-y-6"
        style={{
          '--primary-color': primaryColor,
          '--primary-color-hover': `${primaryColor}cc`,
          '--primary-color-10': `${primaryColor}1a`,
          '--primary-color-20': `${primaryColor}33`,
          '--primary-color-60': `${primaryColor}99`,
        } as React.CSSProperties}>

        {/* HEADER PANEL SPANNING FULL WIDTH */}
        <div className="gm-card p-4 sm:p-6 pb-7 sm:pb-9 text-center space-y-4 relative overflow-hidden">
           <style>{`
             @keyframes color-loop {
               0% { background-position: 0% 50%; }
               50% { background-position: 100% 50%; }
               100% { background-position: 0% 50%; }
             }
             .bio-desc-font-ui {
               font-family: 'Inter', sans-serif !important;
             }
             .bio-desc-font-tech {
               font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
             }
             .bio-desc-font-modern {
               font-family: 'Plus Jakarta Sans', sans-serif !important;
             }
             .bio-desc-font-elegant {
               font-family: 'Raleway', sans-serif !important;
             }
             .bio-desc-font-funnel {
               font-family: 'Funnel Display', sans-serif !important;
             }
.bio-desc-editor:empty::before { content: attr(data-placeholder); color: #64748b; pointer-events: none; display: inline-block; }
             .bio-desc-font-classic {
               font-family: 'Montserrat', sans-serif !important;
             }
             .bio-desc-editor *, 
             [class*="bio-desc-font-"] * {
               background: transparent !important;
               background-color: transparent !important;
               text-shadow: none !important;
               box-shadow: none !important;
             }
             .bio-desc-editor,
             [class*="bio-desc-font-"] {
               text-shadow: none !important;
               box-shadow: none !important;
             }
           `}</style>
           <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2.5 flex-wrap">
              <span 
                className="text-3xl font-black bg-clip-text text-transparent select-none"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${primaryColor}, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, ${primaryColor})`,
                  backgroundSize: '300% 300%',
                  animation: 'color-loop 5s ease infinite',
                }}
              >
                BiO
              </span>
              <span className="text-zinc-600 text-2xl font-light mx-0.5">|</span>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center overflow-hidden shadow-md">
                <img 
                  src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg" 
                  alt="Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-lg font-bold text-white tracking-wide">
                CardDigital <span className="text-[#ff7a00]">GM</span>
              </span>
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

           <div 
             style={{
               position: 'absolute',
               bottom: 0,
               left: 0,
               right: 0,
               height: '8px',
               zIndex: 10,
               background: `linear-gradient(90deg, ${primaryColor}, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, ${primaryColor})`,
               backgroundSize: '300% 300%',
               animation: 'color-loop 5s ease infinite',
             }}
           />
        </div>

        <div className="flex flex-col gap-6 items-stretch w-full max-w-4xl mx-auto">
        
          {/* 1. INFORMAÇÕES BÁSICAS */}
          <div className="gm-card p-4 sm:p-6 space-y-4">
            <button
               onClick={() => toggleSection('basic')}
               className="w-full flex justify-between items-center text-lg font-semibold text-white group"
            >
               <span className="flex items-center gap-2"><Info className="w-5 h-5 text-[var(--primary-color)] group-hover:scale-110 transition-transform" /> Informações Básicas</span>
               {openSections.basic ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            {openSections.basic && (
             <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 pt-2">
               
               {/* Seletor de Versão (Desktop / Smartphone) */}
               <div className="flex bg-[#0d0e12]/80 p-1 rounded-2xl border border-white/5 w-fit gap-1 shadow-inner self-start">
                 <button
                   type="button"
                   onClick={() => setBasicInfoTab("desktop")}
                   className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                     basicInfoTab === "desktop"
                       ? "bg-[var(--primary-color)] text-white shadow-md"
                       : "text-slate-400 hover:text-white hover:bg-white/5"
                   }`}
                 >
                   <Monitor className="w-4 h-4" />
                   Desktop
                 </button>
                 <button
                   type="button"
                   onClick={() => setBasicInfoTab("mobile")}
                   className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                     basicInfoTab === "mobile"
                       ? "bg-[var(--primary-color)] text-white shadow-md"
                       : "text-slate-400 hover:text-white hover:bg-white/5"
                   }`}
                 >
                   <Smartphone className="w-4 h-4" />
                   Smartphone (Mobile)
                 </button>
               </div>

               <div>
                 <label className="gm-label">
                   {basicInfoTab === "desktop" ? "Título / Nome da Empresa (Desktop)" : "Título / Nome da Empresa (Smartphone)"}
                 </label>
                 <input 
                   type="text" 
                   className="gm-input font-medium" 
                   value={basicInfoTab === "desktop" ? bioConfig.title : (bioConfig.title_mobile || "")} 
                   onChange={e => handleChange(basicInfoTab === "desktop" ? "title" : "title_mobile", e.target.value)} 
                   placeholder={basicInfoTab === "desktop" ? "Ex: GM Edificação" : "Deixe em branco para usar o mesmo do Desktop"} 
                 />
                 {basicInfoTab === "mobile" && (
                   <p className="text-xs text-slate-400 mt-1.5 ml-1">
                     Se deixado em branco, será utilizado o título configurado na versão Desktop.
                   </p>
                 )}
               </div>
               <div>
                 <label className="gm-label">{basicInfoTab === "desktop" ? "Descrição (Desktop)" : "Descrição (Smartphone)"}</label>
                 <div ref={editorRef} contentEditable onInput={handleEditorInput} onBlur={handleEditorInput} className={`gm-input bio-desc-editor min-h-[160px] !py-3 w-full transition-all duration-200 overflow-y-auto whitespace-pre-wrap outline-none border border-white/10 focus:border-[var(--primary-color)] rounded-xl ${
                    bioConfig.description_align === "left" ? "text-left" : bioConfig.description_align === "right" ? "text-right" : "text-center"
                  } ${
                    bioConfig.description_bold ? "font-bold" : "font-medium"
                  } ${
                    bioConfig.description_italic ? "italic" : "not-italic"
                  } ${getFontSizeClass(bioConfig.description_size)} bio-desc-font-${bioConfig.description_font || "ui"}`} data-placeholder={basicInfoTab === "desktop" ? "Sua frase de destaque..." : "Deixe em branco para usar a mesma descrição do Desktop..."} style={{ outline: 'none' }}></div>
                  {basicInfoTab === "mobile" && (
                    <p className="text-xs text-slate-400 mt-1.5 ml-1 mb-2">
                      Se deixado em branco, será utilizada a descrição configurada na versão Desktop.
                    </p>
                  )}
                  
                  {/* Barra de Formatação */}
                  <div className="flex flex-wrap items-center gap-3 bg-[#0d0e12]/60 p-3 rounded-2xl border border-white/5 mt-2">
                    {/* Alinhamento */}
                    <div className="flex items-center gap-1 bg-[#161920] p-1 rounded-xl border border-white/5 shadow-inner">
                      <button
                        type="button"
                        onClick={() => handleChange("description_align", "left")}
                        className={`p-2 rounded-lg transition-all duration-200 ${(!bioConfig.description_align || bioConfig.description_align === 'left') ? 'bg-[var(--primary-color)] text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        title="Alinhar à Esquerda"
                      >
                        <AlignLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange("description_align", "center")}
                        className={`p-2 rounded-lg transition-all duration-200 ${bioConfig.description_align === 'center' ? 'bg-[var(--primary-color)] text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        title="Centralizado"
                      >
                        <AlignCenter className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange("description_align", "right")}
                        className={`p-2 rounded-lg transition-all duration-200 ${bioConfig.description_align === 'right' ? 'bg-[var(--primary-color)] text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        title="Alinhar à Direita"
                      >
                        <AlignRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Estilos */}
                    <div className="flex items-center gap-1 bg-[#161920] p-1 rounded-xl border border-white/5 shadow-inner">
                      <button
                        type="button"
                        onClick={handleBoldClick}
                        className={`p-2 rounded-lg transition-all duration-200 ${(bioConfig.description_bold || isSelectionBold) ? 'bg-[var(--primary-color)] text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        title="Negrito"
                      >
                        <Bold className="w-4 h-4 font-bold" />
                      </button>
                      <button
                        type="button"
                        onClick={handleItalicClick}
                        className={`p-2 rounded-lg transition-all duration-200 ${(bioConfig.description_italic || isSelectionItalic) ? 'bg-[var(--primary-color)] text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        title="Itálico"
                      >
                        <Italic className="w-4 h-4 italic" />
                      </button>
                    </div>

                    {/* Fonte */}
                    <div className="flex-1 min-w-[180px]">
                      <select
                        className={`gm-input !h-10 !py-0 !px-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                          ((selectionFont || bioConfig.description_font || "ui") !== "ui")
                            ? 'border-[var(--primary-color)] text-[var(--primary-color)] bg-[var(--primary-color)]/5'
                            : 'border-white/10'
                        }`}
                        value={selectionFont || bioConfig.description_font || "ui"}
                        onChange={e => handleFontChange(e.target.value)}
                      >
                        <option value="ui">Inter (Sistema UI)</option>
                        <option value="funnel">Funnel Display (Arredondada)</option>
                        <option value="tech">JetBrains Mono (Tecnológica)</option>
                        <option value="modern">Plus Jakarta Sans (Moderna)</option>
                        <option value="elegant">Raleway (Elegante)</option>
                        <option value="classic">Montserrat (Mais Utilizada)</option>
                      </select>
                    </div>

                    {/* Tamanho da Fonte */}
                    <div className="flex-1 min-w-[150px]">
                      <select
                        className={`gm-input !h-10 !py-0 !px-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                          (bioConfig.description_size && bioConfig.description_size !== "lg" && bioConfig.description_size !== "16 pt")
                            ? 'border-[var(--primary-color)] text-[var(--primary-color)] bg-[var(--primary-color)]/5'
                            : 'border-white/10'
                        }`}
                        value={getSelectSizeValue(bioConfig.description_size)}
                        onChange={e => handleChange("description_size", e.target.value)}
                      >
                        <option value="10 pt">10 pt</option>
                        <option value="12 pt">12 pt</option>
                        <option value="14 pt">14 pt</option>
                        <option value="16 pt">16 pt (Padrão)</option>
                        <option value="18 pt">18 pt</option>
                        <option value="20 pt">20 pt</option>
                        <option value="24 pt">24 pt</option>
                        <option value="30 pt">30 pt</option>
                        <option value="36 pt">36 pt</option>
                        <option value="48 pt">48 pt</option>
                      </select>
                    </div>
                  </div>
               </div>
             </div>
             )}
          </div>

          {/* 3. APARÊNCIA DO SITE */}
          <div className="gm-card p-4 sm:p-6 space-y-4">
            <button
               onClick={() => toggleSection('appearance')}
               className="w-full flex justify-between items-center text-lg font-semibold text-white group"
            >
               <span className="flex items-center gap-2"><Eye className="w-5 h-5 text-[var(--primary-color)] group-hover:scale-110 transition-transform" /> Aparência do Site</span>
               {openSections.appearance ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {openSections.appearance && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 pt-2">
              <div>
                <label className="gm-label">Cor de Destaque</label>
                <div className="flex items-center gap-2">
                  <input type="color" className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent" value={bioConfig.color || settings?.brand_primary || "#FF6900"} onChange={e => handleChange("color", e.target.value)} />
                  <input type="text" className="gm-input flex-1 font-mono text-sm" value={bioConfig.color || settings?.brand_primary || "#FF6900"} onChange={e => handleChange("color", e.target.value)} />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Se vazio, usará a cor principal do sistema.</p>
              </div>
              <div>
                <label className="gm-label">Tema Visual</label>
                <select className="gm-input w-full" value={bioConfig.theme} onChange={e => handleChange("theme", e.target.value)}>
                  <option value="dark">Escuro (Padrão)</option>
                  <option value="light">Claro</option>
                </select>
              </div>
              <div>
                <label className="gm-label">Fonte do Site</label>
                <select className="gm-input w-full" value={bioConfig.site_font || "inter"} onChange={e => handleChange("site_font", e.target.value)}>
                  <option value="inter">Inter (Padrão)</option>
                  <option value="space">Space Grotesk (Tech/Moderno)</option>
                  <option value="serif">Playfair Display (Serif/Editorial)</option>
                  <option value="mono">JetBrains Mono (Código/Técnico)</option>
                  <option value="montserrat">Montserrat (Clean/Moderno)</option>
                  <option value="jakarta">Plus Jakarta Sans (Elegante)</option>
                </select>
              </div>
              <div>
                <label className="gm-label">Tamanho da Fonte</label>
                <select className="gm-input w-full" value={bioConfig.site_font_size || "md"} onChange={e => handleChange("site_font_size", e.target.value)}>
                  <option value="sm">Pequeno</option>
                  <option value="md">Médio (Padrão)</option>
                  <option value="lg">Grande</option>
                  <option value="xl">Extra Grande</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="gm-label">Efeitos do Site</label>
                <select className="gm-input w-full" value={bioConfig.bg_animation || "parallax"} onChange={e => handleChange("bg_animation", e.target.value)}>
                  <option value="parallax">Rolagem Suave / Parallax (Acompanha a rolagem vertical)</option>
                  <option value="particles">Partículas Flutuantes / Aura (Névoa flutuante moderna)</option>
                  <option value="aurora">Gradiente Animado / Aurora (Loop de degradê dinâmico)</option>
                  <option value="sticky-gallery">Efeito Sticky na Galeria (Imagens empilhadas ao rolar)</option>
                </select>
              </div>
              {/* Seção Desktop (Plano de Fundo & Banner Principal) */}
              <div className="sm:col-span-2 border-t border-zinc-800/80 pt-4 mt-2 space-y-4">
                <div className="space-y-4 bg-zinc-900/40 p-4 sm:p-5 rounded-3xl border border-zinc-800/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/50 pb-2.5">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Layout className="w-4 h-4 text-[var(--primary-color)]" /> Mídias Versão Desktop (Computador)
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800/60 px-2.5 py-1 rounded-full border border-zinc-700/30">
                      Tamanho Sugerido: <strong className="text-[var(--primary-color)]">1920x500 px</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
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
                          <div className="w-full rounded-lg overflow-hidden border border-zinc-800 bg-black/40 relative" style={{ aspectRatio: "1920 / 500" }}>
                            <OptimizedImage src={bioConfig.bg_image_url} alt="Plano de Fundo Desktop" className="absolute inset-0 w-full h-full object-cover" width={800} />
                          </div>
                        ) : (
                          <div className="w-full rounded-lg border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 text-[10px] font-medium bg-black/10" style={{ aspectRatio: "1920 / 500" }}>
                            <Layout className="w-4 h-4 mb-1 opacity-40 text-[var(--primary-color)]" />
                            Sem plano de fundo desktop
                          </div>
                        )}
                      </div>
                      <div className="pt-2">
                        <label className="w-full gm-btn gm-btn-outline !py-4 gap-1.5 text-xs flex items-center justify-center cursor-pointer border border-[var(--primary-color-60)] hover:border-[var(--primary-color)] hover:bg-[var(--primary-color-10)] transition-all">
                          <Upload className="w-3.5 h-3.5 text-[var(--primary-color)]" />
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
                          <div className="w-full rounded-lg overflow-hidden border border-zinc-800 bg-black/40 relative" style={{ aspectRatio: "1920 / 500" }}>
                            <OptimizedImage src={bioConfig.banner_img_url_1} alt="Banner Desktop" className="absolute inset-0 w-full h-full object-cover" width={800} />
                          </div>
                        ) : (
                          <div className="w-full rounded-lg border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 text-[10px] font-medium bg-black/10" style={{ aspectRatio: "1920 / 500" }}>
                            <Sparkles className="w-4 h-4 mb-1 opacity-40 text-[var(--primary-color)]" />
                            Sem banner desktop
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        <label className="w-full gm-btn gm-btn-outline !py-4 gap-1.5 text-xs flex items-center justify-center cursor-pointer border border-[var(--primary-color-60)] hover:border-[var(--primary-color)] hover:bg-[var(--primary-color-10)] transition-all">
                          <Upload className="w-3.5 h-3.5 text-[var(--primary-color)]" />
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
                      <Smartphone className="w-4 h-4 text-[var(--primary-color)]" /> Mídias Versão Smartphone (Celular)
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800/60 px-2.5 py-1 rounded-full border border-zinc-700/30">
                      Tamanho Sugerido: <strong className="text-[var(--primary-color)]">1080x1920 px</strong> (Proporção 9:16)
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
                          <div className="w-full aspect-[9/16] rounded-lg overflow-hidden border border-zinc-800 bg-black/40 flex items-center justify-center p-1">
                            <OptimizedImage src={bioConfig.bg_mobile_image_url} alt="Plano de Fundo Smartphone" className="max-w-full max-h-full object-contain" width={240} />
                          </div>
                        ) : (
                          <div className="w-full aspect-[9/16] rounded-lg border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 text-[10px] font-medium bg-black/10">
                            <Smartphone className="w-4 h-4 mb-1 opacity-40 text-[var(--primary-color)]" />
                            Sem plano de fundo smartphone
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        <label className="w-full gm-btn gm-btn-outline !py-4 gap-1.5 text-xs flex items-center justify-center cursor-pointer border border-[var(--primary-color-60)] hover:border-[var(--primary-color)] hover:bg-[var(--primary-color-10)] transition-all">
                          <Upload className="w-3.5 h-3.5 text-[var(--primary-color)]" />
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
                          <div className="w-full aspect-[9/16] rounded-lg overflow-hidden border border-zinc-800 bg-black/40 flex items-center justify-center p-1">
                            <OptimizedImage src={bioConfig.mobile_banner_img_url_1} alt="Banner Smartphone" className="max-w-full max-h-full object-contain" width={240} />
                          </div>
                        ) : (
                          <div className="w-full aspect-[9/16] rounded-lg border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 text-[10px] font-medium bg-black/10">
                            <Sparkles className="w-4 h-4 mb-1 opacity-40 text-[var(--primary-color)]" />
                            Sem banner smartphone
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        <label className="w-full gm-btn gm-btn-outline !py-4 gap-1.5 text-xs flex items-center justify-center cursor-pointer border border-[var(--primary-color-60)] hover:border-[var(--primary-color)] hover:bg-[var(--primary-color-10)] transition-all">
                          <Upload className="w-3.5 h-3.5 text-[var(--primary-color)]" />
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
                    <Sparkles className="w-4 h-4 text-[var(--primary-color)]" /> Exibir Banners de Destaque no Site
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
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
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
              <span className="flex items-center gap-2"><Phone className="w-5 h-5 text-[var(--primary-color)] group-hover:scale-110 transition-transform" /> Contatos e Redes</span>
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
              <div>
                <label className="gm-label">Telegram (URL ou @)</label>
                <input type="text" className="gm-input" value={bioConfig.telegram || ""} onChange={e => handleChange("telegram", e.target.value)} placeholder="Ex: @seuusuario" />
              </div>
              <div>
                <label className="gm-label">LinkedIn (URL ou @)</label>
                <input type="text" className="gm-input" value={bioConfig.linkedin || ""} onChange={e => handleChange("linkedin", e.target.value)} placeholder="Ex: linkedin.com/in/seuusuario" />
              </div>
              <div>
                <label className="gm-label">TikTok (URL ou @)</label>
                <input type="text" className="gm-input" value={bioConfig.tiktok || ""} onChange={e => handleChange("tiktok", e.target.value)} placeholder="Ex: @seuusuario" />
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
              <span className="flex items-center gap-2"><LinkIcon className="w-5 h-5 text-[var(--primary-color)] group-hover:scale-110 transition-transform" /> Outros Links</span>
              {openSections.otherLinks ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {openSections.otherLinks && (
            <div className="animate-in fade-in slide-in-from-top-2 pt-2">
              <div className="flex justify-end mb-4">
                <button 
                  onClick={addCustomLink}
                  className="flex items-center text-[var(--primary-color)] hover:text-[var(--primary-color-hover)] text-sm font-medium bg-[var(--primary-color-10)] px-3 py-1.5 rounded-lg border border-[var(--primary-color-20)] transition-all hover:bg-[var(--primary-color-20)]"
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
              <span className="flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-[var(--primary-color)] group-hover:scale-110 transition-transform" /> Catálogo de Produtos</span>
              {openSections.catalog ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {openSections.catalog && (
            <div className="animate-in fade-in slide-in-from-top-2 pt-2 space-y-5">
              {/* Seção Título do Catálogo */}
              <div className="w-full sm:max-w-sm">
                <label className="gm-label">Título da Seção de Catálogo</label>
                <input type="text" className="gm-input" value={bioConfig.catalog_title || 'Catálogo'} onChange={e => handleChange("catalog_title", e.target.value)} placeholder="Ex: Meus Produtos" />
              </div>

              {/* TABS DE CONTROLE DO CATÁLOGO */}
              <div className="flex border-b border-zinc-800 gap-1 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setCatalogTab('list')}
                  className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                    catalogTab === 'list' 
                      ? 'border-[var(--primary-color)] text-[var(--primary-color)] bg-[var(--primary-color)]/5' 
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Produtos Cadastrados ({bioConfig.catalog_items?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogTab('add')}
                  className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                    catalogTab === 'add' 
                      ? 'border-[var(--primary-color)] text-[var(--primary-color)] bg-[var(--primary-color)]/5' 
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Cadastrar Novo
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogTab('trash')}
                  className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ml-auto ${
                    catalogTab === 'trash' 
                      ? 'border-red-500 text-red-400 bg-red-500/5' 
                      : 'border-transparent text-slate-400 hover:text-red-400/80'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  Lixeira ({deletedCatalogItems.length})
                </button>
              </div>

              {/* CONTEÚDO DA TAB: LISTA DE PRODUTOS CADASTRADOS */}
              {catalogTab === 'list' && (
                <div className="space-y-4">
                  {(!bioConfig.catalog_items || bioConfig.catalog_items.length === 0) ? (
                    <div className="text-center py-10 text-slate-500 text-sm border border-dashed border-slate-800 rounded-2xl space-y-3">
                      <ShoppingBag className="w-12 h-12 opacity-30 mx-auto text-[var(--primary-color)]" />
                      <p className="font-medium text-slate-400">Nenhum produto cadastrado no momento.</p>
                      <button 
                        type="button"
                        onClick={() => setCatalogTab('add')}
                        className="text-xs bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] text-white px-4 py-2 rounded-xl font-bold transition-all"
                      >
                        Cadastrar Primeiro Produto
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bioConfig.catalog_items.map((item) => {
                        const isExpanded = expandedCatalogItems.includes(item.id);
                        const firstImage = item.images?.[0] || item.image_url;
                        return (
                          <div 
                            key={item.id} 
                            className="bg-zinc-950/40 rounded-2xl border border-zinc-850/80 overflow-hidden transition-all duration-200 hover:border-zinc-800"
                          >
                            {/* ITEM HEADER (CLICK TO EXPAND) */}
                            <div 
                              onClick={() => {
                                setExpandedCatalogItems(prev => 
                                  prev.includes(item.id) 
                                    ? prev.filter(id => id !== item.id) 
                                    : [...prev, item.id]
                                );
                              }}
                              className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-900/30 select-none transition-colors"
                            >
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                {firstImage ? (
                                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-zinc-800 flex items-center justify-center overflow-hidden p-0.5 shrink-0">
                                    <OptimizedImage 
                                      src={firstImage} 
                                      alt={item.name} 
                                      className="max-w-full max-h-full object-contain" 
                                      width={80}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-600 shrink-0">
                                    <ShoppingBag className="w-5 h-5 opacity-40" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1 pr-2">
                                  <h4 className="font-bold text-sm text-slate-200 truncate">{item.name || <span className="italic text-slate-500 font-normal">Sem Nome</span>}</h4>
                                  <p className="text-xs text-[var(--primary-color)] font-mono font-bold mt-0.5">{item.price || 'Preço sob consulta'}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1 shrink-0 ml-3">
                                {/* REMOVE BUTTON */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeCatalogItem(item.id);
                                  }}
                                  className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-xl transition-all mr-1"
                                  title="Mover para lixeira"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                                
                                {/* EXPANSION INDICATOR */}
                                <div className="text-slate-400 hover:text-slate-200 p-2 rounded-xl">
                                  {isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-[var(--primary-color)]" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5" />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* ITEM EDIT DETAILS (COLLAPSIBLE CONTENT) */}
                            {isExpanded && (
                              <div className="p-4 sm:p-5 bg-zinc-900/40 border-t border-zinc-900/60 space-y-5 animate-in fade-in duration-200">
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
                                        className="gm-input w-full !py-2.5 text-[var(--primary-color)] font-mono font-bold" 
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

                                  {/* CADASTRO POR QUANTIDADE / VARIAÇÕES */}
                                  <div className="border-t border-zinc-800/40 pt-4 mt-2">
                                    <div className="flex items-center justify-between mb-3">
                                      <label className="text-xs font-extrabold text-slate-400 block uppercase tracking-wider">Cadastro por Quantidade / Variações</label>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentOptions = item.options || [];
                                          const updatedOptions = [...currentOptions, { id: Date.now().toString(), quantity: '', price: '' }];
                                          updateCatalogItem(item.id, 'options', updatedOptions);
                                        }}
                                        className="text-xs text-[var(--primary-color)] hover:text-[var(--primary-color-hover)] flex items-center font-bold bg-[var(--primary-color-10)] hover:bg-[var(--primary-color-20)] px-2.5 py-1 rounded-lg transition-all"
                                      >
                                        <Plus className="w-3 h-3 mr-1" /> Add Opção
                                      </button>
                                    </div>
                                    
                                    {(item.options || []).length > 0 ? (
                                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                                        {(item.options || []).map((opt: any, optIdx: number) => (
                                          <div key={opt.id || optIdx} className="flex gap-2 items-center">
                                            <input
                                              type="text"
                                              placeholder="Ex: 250 un"
                                              className="gm-input flex-1 !py-1.5 text-xs font-semibold"
                                              value={opt.quantity}
                                              onChange={e => {
                                                const updated = (item.options || []).map((o: any, idx: number) => 
                                                  idx === optIdx ? { ...o, quantity: e.target.value } : o
                                                );
                                                updateCatalogItem(item.id, 'options', updated);
                                              }}
                                            />
                                            <input
                                              type="text"
                                              placeholder="R$ 0,00"
                                              className="gm-input w-28 !py-1.5 text-xs text-[var(--primary-color)] font-mono font-bold"
                                              value={opt.price}
                                              onChange={e => {
                                                const updated = (item.options || []).map((o: any, idx: number) => 
                                                  idx === optIdx ? { ...o, price: formatBRL(e.target.value) } : o
                                                );
                                                updateCatalogItem(item.id, 'options', updated);
                                              }}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updated = (item.options || []).filter((_: any, idx: number) => idx !== optIdx);
                                                updateCatalogItem(item.id, 'options', updated);
                                              }}
                                              className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded-lg transition-all"
                                              title="Remover Opção"
                                            >
                                              <Trash className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-slate-500 leading-normal">Se o seu produto tem preços que variam por quantidade (ex: 250, 500, 1000 cartões), adicione as opções acima. Caso contrário, use apenas o preço fixo padrão.</p>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-4 border-t border-zinc-800/65 pt-5">
                                  <div className="font-sans space-y-3">
                                    <div className="flex items-center justify-between">
                                      <label className="text-sm font-bold text-slate-300 block">Fotos do Produto (Máximo 8)</label>
                                      {((item.images || (item.image_url ? [item.image_url] : [""])).length < 8) && (
                                        <button 
                                          type="button"
                                          onClick={() => addCatalogItemImageSlot(item.id)}
                                          className="text-xs text-[var(--primary-color)] hover:text-[var(--primary-color-hover)] flex items-center font-semibold bg-[var(--primary-color-10)] hover:bg-[var(--primary-color-20)] px-2.5 py-1.5 rounded-lg transition-all"
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
                                                <OptimizedImage 
                                                  src={imgUrl} 
                                                  alt={"Foto " + (idx + 1)} 
                                                  className="max-w-full max-h-full object-contain" 
                                                  width={200}
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
                                                <ShoppingBag className="w-8 h-8 opacity-45 text-[var(--primary-color)]" />
                                              </div>
                                            )}
                                            <div className="space-y-0.5">
                                              <p className="text-sm font-black text-slate-200">Foto {idx + 1} de 8</p>
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
                                            <label className="gm-btn gm-btn-outline w-full px-3 py-2.5 text-xs flex items-center justify-center cursor-pointer gap-1.5 hover:bg-[var(--primary-color)]/15">
                                              <Upload className="w-4 h-4" />
                                              <span className="font-bold">Upload</span>
                                              <input 
                                                type="file" 
                                                accept="image/*,video/mp4"
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
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* CONTEÚDO DA TAB: CADASTRAR NOVO PRODUTO */}
              {catalogTab === 'add' && (
                <div className="bg-zinc-950/40 p-4 sm:p-5 rounded-2xl border border-zinc-850/80 space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                    <h3 className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-[var(--primary-color)]" />
                      Novo Cadastro de Produto
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Nome do Produto/Serviço *</label>
                      <input 
                        type="text" 
                        className="gm-input w-full !py-2.5 font-medium" 
                        value={newProduct.name} 
                        onChange={e => setNewProduct(prev => ({ ...prev, name: e.target.value }))} 
                        placeholder="Ex: Tênis Nike Air"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Preço (opcional)</label>
                        <input 
                          type="text" 
                          className="gm-input w-full !py-2.5 text-[var(--primary-color)] font-mono font-bold" 
                          value={newProduct.price} 
                          onChange={e => setNewProduct(prev => ({ ...prev, price: formatBRL(e.target.value) }))} 
                          placeholder="R$ 0,00"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Link Direto (WhatsApp/Compra)</label>
                        <input 
                          type="text" 
                          className="gm-input w-full !py-2.5 text-xs font-mono" 
                          value={newProduct.url} 
                          onChange={e => setNewProduct(prev => ({ ...prev, url: e.target.value }))} 
                          placeholder="Opcional. Link para ir ao clicar"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Descrição do Produto</label>
                      <textarea 
                        className="gm-input w-full !py-2.5 min-h-[100px] resize-none" 
                        value={newProduct.description} 
                        onChange={e => setNewProduct(prev => ({ ...prev, description: e.target.value }))} 
                        placeholder="Ex: Tênis em couro, ótimo para corridas."
                      />
                    </div>

                    {/* CADASTRO POR QUANTIDADE / VARIAÇÕES (DRAFT FORM) */}
                    <div className="border-t border-zinc-800/40 pt-4 mt-2">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-extrabold text-slate-400 block uppercase tracking-wider">Cadastro por Quantidade / Variações</label>
                        <button
                          type="button"
                          onClick={addNewProductOption}
                          className="text-xs text-[var(--primary-color)] hover:text-[var(--primary-color-hover)] flex items-center font-bold bg-[var(--primary-color-10)] hover:bg-[var(--primary-color-20)] px-2.5 py-1 rounded-lg transition-all"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add Opção
                        </button>
                      </div>
                      
                      {(newProduct.options || []).length > 0 ? (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                          {newProduct.options.map((opt: any, optIdx: number) => (
                            <div key={opt.id || optIdx} className="flex gap-2 items-center">
                              <input
                                type="text"
                                placeholder="Ex: 250 un"
                                className="gm-input flex-1 !py-1.5 text-xs font-semibold"
                                value={opt.quantity}
                                onChange={e => updateNewProductOption(optIdx, 'quantity', e.target.value)}
                              />
                              <input
                                type="text"
                                placeholder="R$ 0,00"
                                className="gm-input w-28 !py-1.5 text-xs text-[var(--primary-color)] font-mono font-bold"
                                value={opt.price}
                                onChange={e => updateNewProductOption(optIdx, 'price', formatBRL(e.target.value))}
                              />
                              <button
                                type="button"
                                onClick={() => removeNewProductOption(optIdx)}
                                className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Remover Opção"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 leading-normal">Se o seu produto tem preços que variam por quantidade (ex: 250, 500, 1000 cartões), adicione as opções acima. Caso contrário, use apenas o preço fixo padrão.</p>
                      )}
                    </div>

                    {/* FOTOS DO NOVO PRODUTO */}
                    <div className="space-y-4 border-t border-zinc-800/65 pt-5">
                      <div className="font-sans space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-bold text-slate-300 block">Fotos do Produto (Máximo 8)</label>
                          {newProduct.images.length < 8 && (
                            <button 
                              type="button"
                              onClick={addNewProductImageSlot}
                              className="text-xs text-[var(--primary-color)] hover:text-[var(--primary-color-hover)] flex items-center font-semibold bg-[var(--primary-color-10)] hover:bg-[var(--primary-color-20)] px-2.5 py-1.5 rounded-lg transition-all"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Foto
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {newProduct.images.map((imgUrl, idx) => (
                            <div key={idx} className="bg-black/50 p-4 rounded-2xl border border-zinc-800 space-y-4 flex flex-col justify-between">
                              {/* 1. FOTO MINIATURA */}
                              <div className="flex items-center gap-3.5">
                                {imgUrl ? (
                                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border border-zinc-300 bg-white shrink-0 group/img shadow-md flex items-center justify-center p-1">
                                    <OptimizedImage 
                                      src={imgUrl} 
                                      alt={"Foto " + (idx + 1)} 
                                      className="max-w-full max-h-full object-contain" 
                                      width={200}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeNewProductImageSlot(idx)}
                                      className="absolute top-1 right-1 bg-black/85 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
                                      title="Remover Foto"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center justify-center bg-black/40 text-slate-600 shrink-0">
                                    <ShoppingBag className="w-8 h-8 opacity-45 text-[var(--primary-color)]" />
                                  </div>
                                )}
                                <div className="space-y-0.5">
                                  <p className="text-sm font-black text-slate-200">Foto {idx + 1} de 8</p>
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
                                  onChange={e => {
                                    const current = [...newProduct.images];
                                    current[idx] = e.target.value;
                                    setNewProduct(prev => ({ ...prev, images: current }));
                                  }} 
                                  placeholder={"Cole o link da foto " + (idx + 1) + "..."}
                                />
                              </div>

                              {/* 3. UPLOAD e EXCLUIR */}
                              <div className="grid grid-cols-2 gap-3 w-full">
                                <label className="gm-btn gm-btn-outline w-full px-3 py-2.5 text-xs flex items-center justify-center cursor-pointer gap-1.5 hover:bg-[var(--primary-color)]/15">
                                  <Upload className="w-4 h-4" />
                                  <span className="font-bold">Upload</span>
                                  <input 
                                    type="file" 
                                    accept="image/*,video/mp4"
                                    className="hidden" 
                                    onChange={(e) => handleUploadNewProductImageAtIndex(idx, e)} 
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeNewProductImageSlot(idx)}
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

                    <div className="pt-4 border-t border-zinc-900 flex justify-end">
                      <button
                        type="button"
                        onClick={handleCreateProduct}
                        className="bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        Cadastrar Produto
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTEÚDO DA TAB: LIXEIRA */}
              {catalogTab === 'trash' && (
                <div className="bg-zinc-950/40 p-4 sm:p-5 rounded-2xl border border-zinc-850/80 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                    <h3 className="text-xs font-extrabold text-slate-200 flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-400" />
                      Lixeira de Produtos
                    </h3>
                    {deletedCatalogItems.length > 0 && (
                      <button
                        type="button"
                        onClick={clearTrash}
                        className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                      >
                        Esvaziar Lixeira
                      </button>
                    )}
                  </div>

                  {deletedCatalogItems.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm border border-dashed border-slate-800 rounded-2xl space-y-2">
                      <Trash2 className="w-10 h-10 opacity-20 mx-auto text-slate-400" />
                      <p>A lixeira está vazia.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-900">
                      {deletedCatalogItems.map((item, idx) => (
                        <div key={item.id || idx} className="py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-slate-300 truncate">{item.name || 'Sem Nome'}</h4>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{item.price || 'Sem Preço'}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => restoreCatalogItem(item.id)}
                              className="text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Restaurar item"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restaurar
                            </button>
                            <button
                              type="button"
                              onClick={() => permanentlyDeleteCatalogItem(item.id)}
                              className="text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Excluir permanentemente"
                            >
                              <Trash className="w-3.5 h-3.5" />
                              Excluir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            )}
          </div>

                    {/* SEÇÃO DE PORTFÓLIO */}
          <div className="gm-card p-4 sm:p-6 space-y-4">
            <button
               onClick={() => toggleSection('portfolio')}
               className="w-full flex justify-between items-center text-lg font-semibold text-white group"
            >
              <span className="flex items-center gap-2"><Layout className="w-5 h-5 text-[var(--primary-color)] group-hover:scale-110 transition-transform" /> Portfólio</span>
              {openSections.portfolio ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {openSections.portfolio && (
            <div className="animate-in fade-in slide-in-from-top-2 pt-2 space-y-5">
              {/* Seção Título do Portfólio */}
              <div className="w-full sm:max-w-sm">
                <label className="gm-label">Título da Seção</label>
                <input type="text" className="gm-input" value={bioConfig.portfolio_title || 'Portfólio'} onChange={e => handleChange("portfolio_title", e.target.value)} placeholder="Ex: Meu Portfólio" />
              </div>

              {/* UPLOAD E LISTA DE ITENS */}
              <div className="space-y-4 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mt-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setActivePortfolioTab("active")}
                      className={`text-sm font-bold pb-2 border-b-2 transition-colors cursor-pointer ${activePortfolioTab === "active" ? "border-[var(--primary-color)] text-white" : "border-transparent text-slate-400 hover:text-slate-300"}`}
                    >
                      Portfólios Ativos
                    </button>
                    <button
                      onClick={() => setActivePortfolioTab("trash")}
                      className={`text-sm font-bold pb-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${activePortfolioTab === "trash" ? "border-red-500 text-red-400" : "border-transparent text-slate-400 hover:text-red-400"}`}
                    >
                      <Trash2 className="w-4 h-4" />
                      Lixeira ({deletedPortfolioItems.length})
                    </button>
                  </div>
                  
                  {activePortfolioTab === "active" && (
                    <button 
                      onClick={handleAddPortfolioCollection}
                      className="gm-btn gm-btn-outline px-3 py-1.5 text-[10px] flex items-center justify-center cursor-pointer hover:bg-[var(--primary-color)] hover:text-white transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>Novo Portfólio</span>
                    </button>
                  )}
                </div>
                
                {activePortfolioTab === "active" ? (
                  <div className="space-y-4">
                    {(() => {
                      const current = bioConfig.portfolio_items || [];
                      const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio ' + p.id.slice(-3), layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
                      
                      if (normalized.length === 0) {
                        return (
                          <div className="py-8 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
                            Nenhum portfólio criado ainda.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {normalized.map((item: any) => (
                            <div key={item.id} className="border border-zinc-800 bg-zinc-900/40 rounded-xl overflow-hidden p-4 space-y-4">
                              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                <div className="flex-1 w-full">
                                  <input 
                                    type="text" 
                                    className="bg-transparent text-white font-bold text-sm sm:text-base outline-none border-b border-transparent focus:border-zinc-700 pb-1 w-full"
                                    value={item.title || ''}
                                    onChange={e => handleUpdatePortfolioCollection(item.id, { title: e.target.value })}
                                    placeholder="Nome do Portfólio (ex: Portfólio 1)"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePortfolioCollection(item.id)}
                                  className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors self-end sm:self-auto shrink-0 flex items-center gap-2"
                                  title="Excluir Portfólio (Move para Lixeira)"
                                >
                                  <Trash className="w-4 h-4" />
                                  <span className="text-xs font-bold sm:hidden">Excluir</span>
                                </button>
                              </div>
                              
                              <div className="bg-zinc-950/50 p-3 sm:p-4 rounded-xl border border-zinc-800/50">
                                <div className="mb-6">
                                  <label className="gm-label mb-2 block text-xs">Descrição do Portfólio</label>
                                  <textarea 
                                    className={`gm-input min-h-[120px] w-full resize-y rounded-xl p-3 bg-zinc-900/50 border border-zinc-800 focus:border-[var(--primary-color)] outline-none transition-colors ${item.description_align === "left" ? "text-left" : item.description_align === "right" ? "text-right" : "text-center"} ${item.description_bold ? "font-bold" : "font-medium"} ${item.description_italic ? "italic" : "not-italic"} ${getFontSizeClass(item.description_size)} bio-desc-font-${item.description_font || "ui"}`}
                                    value={item.description || ''}
                                    onChange={(e) => handleUpdatePortfolioCollection(item.id, { description: e.target.value })}
                                    placeholder="Descreva o projeto..."
                                  />
                                  <div className="flex flex-wrap items-center gap-2 bg-[#0d0e12]/60 p-2 rounded-xl border border-zinc-800/50 mt-2">
                                    <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800 shadow-inner">
                                      <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_align: "left" })} className={`p-1.5 rounded-md transition-colors ${(!item.description_align || item.description_align === 'left') ? 'bg-[var(--primary-color)] text-white' : 'text-slate-400 hover:text-white hover:bg-zinc-700'}`}><AlignLeft className="w-4 h-4" /></button>
                                      <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_align: "center" })} className={`p-1.5 rounded-md transition-colors ${item.description_align === 'center' ? 'bg-[var(--primary-color)] text-white' : 'text-slate-400 hover:text-white hover:bg-zinc-700'}`}><AlignCenter className="w-4 h-4" /></button>
                                      <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_align: "right" })} className={`p-1.5 rounded-md transition-colors ${item.description_align === 'right' ? 'bg-[var(--primary-color)] text-white' : 'text-slate-400 hover:text-white hover:bg-zinc-700'}`}><AlignRight className="w-4 h-4" /></button>
                                    </div>
                                    <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800 shadow-inner">
                                      <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_bold: !item.description_bold })} className={`p-1.5 rounded-md transition-colors ${item.description_bold ? 'bg-[var(--primary-color)] text-white' : 'text-slate-400 hover:text-white hover:bg-zinc-700'}`}><Bold className="w-4 h-4 font-bold" /></button>
                                      <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_italic: !item.description_italic })} className={`p-1.5 rounded-md transition-colors ${item.description_italic ? 'bg-[var(--primary-color)] text-white' : 'text-slate-400 hover:text-white hover:bg-zinc-700'}`}><Italic className="w-4 h-4 italic" /></button>
                                    </div>
                                    <div className="flex-1 min-w-[140px]">
                                      <select className="gm-input !h-8 !py-0 !px-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-slate-300 w-full" value={item.description_font || "ui"} onChange={e => handleUpdatePortfolioCollection(item.id, { description_font: e.target.value })}>
                                        <option value="ui">Inter (Sistema)</option>
                                        <option value="funnel">Funnel (Títulos)</option>
                                        <option value="roboto">Roboto</option>
                                        <option value="montserrat">Montserrat</option>
                                        <option value="poppins">Poppins</option>
                                        <option value="playfair">Playfair Display</option>
                                        <option value="outfit">Outfit</option>
                                      </select>
                                    </div>
                                    <div className="w-[80px]">
                                      <select className="gm-input !h-8 !py-0 !px-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-slate-300 w-full" value={item.description_size || "16 pt"} onChange={e => handleUpdatePortfolioCollection(item.id, { description_size: e.target.value })}>
                                        <option value="10 pt">10 pt</option>
                                        <option value="12 pt">12 pt</option>
                                        <option value="14 pt">14 pt</option>
                                        <option value="16 pt">16 pt</option>
                                        <option value="18 pt">18 pt</option>
                                        <option value="20 pt">20 pt</option>
                                        <option value="24 pt">24 pt</option>
                                        <option value="30 pt">30 pt</option>
                                        <option value="36 pt">36 pt</option>
                                        <option value="48 pt">48 pt</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-6 pt-4 border-t border-zinc-800/50">
                                  {/* Section for Desktop Banners */}
                                  <div className="space-y-3">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                      <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-slate-300">Banners Internos Desktop ({item.layers?.length || 0})</span>
                                        <span className="text-[10px] text-zinc-500 font-medium mt-0.5">Recomendado: 1600x900px</span>
                                      </div>
                                      <label className="text-xs bg-zinc-800 hover:bg-[var(--primary-color)] hover:text-white text-slate-300 px-3 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-2 w-full sm:w-auto font-bold border border-zinc-700 hover:border-transparent">
                                        <Upload className="w-4 h-4" />
                                        Adicionar Banner Desktop
                                        <input type="file" accept="image/*,video/mp4" className="hidden" onChange={(e) => handleUploadPortfolioLayer(item.id, e)} />
                                      </label>
                                    </div>
                                    
                                    {item.layers && item.layers.length > 0 ? (
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {(item.layers || []).map((layer: any) => (
                                          <div key={layer.id} className="relative group aspect-video rounded-lg overflow-hidden bg-black border border-zinc-800">
                                            <OptimizedImage src={layer.image_url} alt="Layer Desktop" className="w-full h-full object-cover" width={300} />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                              <button
                                                type="button"
                                                onClick={() => handleRemovePortfolioLayer(item.id, layer.id)}
                                                className="text-red-400 hover:text-red-300 p-2 flex flex-col items-center gap-1 font-bold text-xs"
                                              >
                                                <Trash className="w-4 h-4" />
                                                Remover
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="py-4 text-center text-zinc-600 text-xs border border-dashed border-zinc-800 rounded-lg">
                                        Nenhum banner desktop inserido neste portfólio.
                                      </div>
                                    )}
                                  </div>

                                  {/* Section for Smartphone Banners */}
                                  <div className="space-y-3 pt-4 border-t border-zinc-800/20">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                      <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-slate-300">Banners Internos Smartphone ({item.mobile_layers?.length || 0})</span>
                                        <span className="text-[10px] text-zinc-500 font-medium mt-0.5">Recomendado: 1080x1920px (Proporção 9:16)</span>
                                      </div>
                                      <label className="text-xs bg-zinc-800 hover:bg-[var(--primary-color)] hover:text-white text-slate-300 px-3 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-2 w-full sm:w-auto font-bold border border-zinc-700 hover:border-transparent">
                                        <Upload className="w-4 h-4" />
                                        Adicionar Banner Smartphone
                                        <input type="file" accept="image/*,video/mp4" className="hidden" onChange={(e) => handleUploadPortfolioMobileLayer(item.id, e)} />
                                      </label>
                                    </div>
                                    
                                    {item.mobile_layers && item.mobile_layers.length > 0 ? (
                                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                        {(item.mobile_layers || []).map((layer: any) => (
                                          <div key={layer.id} className="relative group aspect-[9/16] max-w-[120px] rounded-lg overflow-hidden bg-black border border-zinc-800 mx-auto w-full">
                                            <OptimizedImage src={layer.image_url} alt="Layer Smartphone" className="w-full h-full object-cover" width={150} />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                              <button
                                                type="button"
                                                onClick={() => handleRemovePortfolioMobileLayer(item.id, layer.id)}
                                                className="text-red-400 hover:text-red-300 p-2 flex flex-col items-center gap-1 font-bold text-xs"
                                              >
                                                <Trash className="w-4 h-4" />
                                                Remover
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="py-4 text-center text-zinc-600 text-xs border border-dashed border-zinc-800 rounded-lg">
                                        Nenhum banner smartphone inserido neste portfólio.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      {deletedPortfolioItems.length > 0 && (
                        <button
                          type="button"
                          onClick={clearPortfolioTrash}
                          className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                        >
                          Esvaziar Lixeira
                        </button>
                      )}
                    </div>
                    {deletedPortfolioItems.length === 0 ? (
                      <div className="text-center py-10 text-slate-500 text-sm border border-dashed border-slate-800 rounded-2xl space-y-2">
                        <Trash2 className="w-10 h-10 opacity-20 mx-auto text-slate-400" />
                        <p>A lixeira está vazia.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-900">
                        {deletedPortfolioItems.map((item: any, idx: number) => (
                          <div key={item.id || idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="min-w-0 flex-1 flex items-center gap-3">
                              {item.layers && item.layers[0] && (
                                <div className="w-10 h-10 rounded-lg bg-black overflow-hidden border border-zinc-800 shrink-0">
                                  <img src={item.layers[0].image_url} alt="" className="w-full h-full object-cover" />
                                </div>
                              )}
                              <h4 className="font-bold text-sm text-slate-300 truncate">{item.title || 'Portfólio Excluído'}</h4>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => restorePortfolioCollection(item.id)}
                                className="text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer flex-1 justify-center sm:flex-none"
                                title="Restaurar portfólio"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Restaurar
                              </button>
                              <button
                                type="button"
                                onClick={() => permanentlyDeletePortfolioCollection(item.id)}
                                className="text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer flex-1 justify-center sm:flex-none"
                                title="Excluir permanentemente"
                              >
                                <Trash className="w-3.5 h-3.5" />
                                Excluir
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            )}
          </div>

{/* 5. DADOS DE PAGAMENTO (PIX) */}
          <div className="gm-card p-4 sm:p-6 space-y-4">
            <button
               onClick={() => toggleSection('payment')}
               className="w-full flex justify-between items-center text-lg font-semibold text-white group"
            >
              <span className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-[var(--primary-color)] group-hover:scale-110 transition-transform" /> Dados de Pagamento (PIX)</span>
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
              <span className="flex items-center gap-2"><MapPin className="w-5 h-5 text-[var(--primary-color)] group-hover:scale-110 transition-transform" /> Endereço e Localização</span>
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

          {/* SEÇÃO DA PÁGINA DE CONTATO & CHAT */}
          <div className="gm-card p-4 sm:p-6 space-y-4">
            <button
               type="button"
               onClick={() => toggleSection('contactSection')}
               className="w-full flex justify-between items-center text-lg font-semibold text-white group"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--primary-color)] group-hover:scale-110 transition-transform" /> 
                Página de Contato & Balão de Chat
              </span>
              {openSections.contactSection ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {openSections.contactSection && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 pt-2 text-zinc-300">
                {/* Banner de Contato */}
                <div className="space-y-4 bg-zinc-905/40 p-4 sm:p-5 rounded-3xl border border-zinc-800/60">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layout className="w-4 h-4 text-[var(--primary-color)]" /> Banner da Página de Contato
                  </h4>
                  <p className="text-xs text-slate-400">Envie um banner exclusivo para a página de contato do seu site (caso vazio, usará o banner principal).</p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2 bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-800/80 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-zinc-300">Imagem do Banner</span>
                          {bioConfig.contact_banner_img_url && (
                            <button 
                              type="button" 
                              onClick={() => handleChange("contact_banner_img_url", "")} 
                              className="text-red-500 hover:text-red-400 text-[10px] font-bold"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                        
                        {bioConfig.contact_banner_img_url ? (
                          <div className="w-full rounded-lg overflow-hidden border border-zinc-800 bg-black/40 relative" style={{ aspectRatio: "16 / 6" }}>
                            <OptimizedImage src={bioConfig.contact_banner_img_url} alt="Banner Contato" className="absolute inset-0 w-full h-full object-cover" width={800} />
                          </div>
                        ) : (
                          <div className="w-full rounded-lg border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 text-[10px] font-medium bg-black/10" style={{ aspectRatio: "16 / 6" }}>
                            <Layout className="w-5 h-5 mb-1 opacity-40 text-[var(--primary-color)]" />
                            Sem banner de contato personalizado
                          </div>
                        )}
                      </div>
                      <div className="pt-2">
                        <label className="w-full gm-btn gm-btn-outline !py-4 gap-1.5 text-xs flex items-center justify-center cursor-pointer border border-[var(--primary-color-60)] hover:border-[var(--primary-color)] hover:bg-[var(--primary-color-10)] transition-all">
                          <Upload className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                          <span className="font-bold text-white">Upload Banner de Contato</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleUploadContactBanner} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Textos da Página de Contato */}
                <div className="space-y-4 bg-zinc-905/40 p-4 sm:p-5 rounded-3xl border border-zinc-800/60">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-[var(--primary-color)]" /> Textos da Página de Contato
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="gm-label font-semibold">Título Principal da Página (ex: Fale com a gente)</label>
                      <input 
                        type="text" 
                        className="gm-input font-medium" 
                        value={bioConfig.contact_title || ''} 
                        onChange={e => handleChange("contact_title", e.target.value)} 
                        placeholder="Fale com a gente (Padrão)" 
                      />
                    </div>
                    <div>
                      <label className="gm-label font-semibold">Subtítulo ou Descrição (opcional)</label>
                      <input 
                        type="text" 
                        className="gm-input font-medium" 
                        value={bioConfig.contact_desc || ''} 
                        onChange={e => handleChange("contact_desc", e.target.value)} 
                        placeholder="Diga algo sobre como podemos te ajudar..." 
                      />
                    </div>
                  </div>
                </div>

                {/* Configurações do Balão do Chat */}
                <div className="space-y-4 bg-zinc-905/40 p-4 sm:p-5 rounded-3xl border border-zinc-800/60">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--primary-color)]" /> Balão do Chat Flutuante (WhatsApp)
                  </h4>
                  <p className="text-xs text-slate-400">Personalize o widget do Join.chat exibido na página de contato do seu site.</p>
                  
                  <div className="flex items-center gap-3 bg-zinc-950/40 p-3 rounded-2xl border border-zinc-800">
                    <input 
                      type="checkbox" 
                      id="chat_balloon_enabled" 
                      checked={bioConfig.chat_balloon_enabled !== false} 
                      onChange={e => handleChange("chat_balloon_enabled", e.target.checked)}
                      className="w-4 h-4 rounded text-[var(--primary-color)] bg-zinc-850 border-zinc-700 focus:ring-0 cursor-pointer" 
                    />
                    <label htmlFor="chat_balloon_enabled" className="text-xs font-bold text-white cursor-pointer select-none">Habilitar Balão de Chat Join.chat</label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="gm-label font-semibold">Cor de Fundo do Balão</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent" 
                          value={bioConfig.chat_balloon_bg_color || "#FE540B"} 
                          onChange={e => handleChange("chat_balloon_bg_color", e.target.value)} 
                        />
                        <input 
                          type="text" 
                          className="gm-input flex-1 font-mono text-sm" 
                          value={bioConfig.chat_balloon_bg_color || "#FE540B"} 
                          onChange={e => handleChange("chat_balloon_bg_color", e.target.value)} 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="gm-label font-semibold">Cor do Texto (Botão/Cabeçalho)</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent" 
                          value={bioConfig.chat_balloon_text_color || "#FFFFFF"} 
                          onChange={e => handleChange("chat_balloon_text_color", e.target.value)} 
                        />
                        <input 
                          type="text" 
                          className="gm-input flex-1 font-mono text-sm" 
                          value={bioConfig.chat_balloon_text_color || "#FFFFFF"} 
                          onChange={e => handleChange("chat_balloon_text_color", e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="gm-label font-semibold">Texto do Balão do Chat</label>
                      <textarea 
                        className="gm-input min-h-[90px] !py-2.5" 
                        value={bioConfig.chat_balloon_text || ''} 
                        onChange={e => handleChange("chat_balloon_text", e.target.value)} 
                        placeholder="Ex: Olá 👋&#10;Sou Denis, como posso te ajudar hoje?" 
                      />
                    </div>
                    <div>
                      <label className="gm-label font-semibold">Texto do Botão de Ação</label>
                      <input 
                        type="text" 
                        className="gm-input font-medium" 
                        value={bioConfig.chat_balloon_button_text || "Abrir chat"} 
                        onChange={e => handleChange("chat_balloon_button_text", e.target.value)} 
                        placeholder="Ex: Abrir chat" 
                      />
                    </div>
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
                {/* green/teal track segment for View - completely glued to right edge */}
                <div className="w-3 h-16 rounded-full bg-[var(--primary-color)] transition-all group-hover:w-4 group-hover:bg-[var(--primary-color-hover)]" />
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
                  className="w-14 h-14 bg-green-500 hover:bg-green-600 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 disabled:opacity-50"
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
                  className="w-14 h-14 bg-[var(--gm-primary)] hover:bg-[var(--gm-primary-40)] active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
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
                  ? "bg-[var(--primary-color)] text-white shadow-md"
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
                  ? "bg-[var(--primary-color)] text-white shadow-md"
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
                         previewMode="smartphone"
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
              <div className="flex-1 overflow-hidden relative">
                 <BioRenderer 
                   asPreview={true}
                   previewMode="pc"
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
