import React, { useState, useEffect, useRef } from "react";
import { Page } from "../components/ui/Page";
import { Link } from "react-router-dom";
import { Copy, Check, Info, Plus, Trash, Eye, X, Upload, ChevronDown, ChevronUp, ChevronLeft, Save, Smartphone, Monitor, Layout, Link as LinkIcon, ShoppingBag, MapPin, Sparkles, Globe, Phone, CreditCard, List, PlusCircle, Trash2, RotateCcw, Edit3, AlignLeft, AlignCenter, AlignRight, Bold, Italic, ArrowLeft, CheckCircle2, Loader2, Image as ImageIcon } from "lucide-react";
import { useAuth } from "../store/AuthContext";
import { fetchSettingsSupabase, upsertSettingsSupabase, readSettingsLocal, AppSettings, DEFAULT_GM_BIO_CONFIG } from "../lib/settings";
import { pushToast } from "../store/toast";
import BioRenderer, { getPlatformIcon } from "../components/bio/BioRenderer";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import { compressImage } from "../lib/imageCompressor";

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
  const { tenantId, user } = useAuth();
  const cachedSettings = readSettingsLocal();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(cachedSettings);
  const [iconPickerOpen, setIconPickerOpen] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"smartphone" | "pc">("smartphone");
  const [selectedView, setSelectedView] = useState<"none" | "smartphone" | "computador">("smartphone");
  const [isDocked, setIsDocked] = useState(false);
  const isDraggingRef = useRef(false);

  // Tab control inside Catalog
  const [catalogTab, setCatalogTab] = useState<'list' | 'add' | 'trash'>('list');
  // Track expanded catalog item IDs for edit view list
  const [expandedCatalogItems, setExpandedCatalogItems] = useState<string[]>([]);
  // Local state for deleted catalog items (trash bin)
  const [deletedCatalogItems, setDeletedCatalogItems] = useState<any[]>([]);
  const [deletedPortfolioItems, setDeletedPortfolioItems] = useState<any[]>([]);
  const [expandedPortfolioItems, setExpandedPortfolioItems] = useState<string[]>([]);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
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
    setOpenSections(prev => {
      const isOpen = !prev[section];
      const next = {
        portfolio: false,
        basic: false,
        appearance: false,
        contacts: false,
        otherLinks: false,
        catalog: false,
        address: false,
        payment: false,
        contactSection: false,
      };
      next[section] = isOpen;
      return next;
    });
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

  // Campos principais inicializados com o estado restaurado do website (08/10/2026)
  const [bioConfig, setBioConfig] = useState<Record<string, any>>({
    ...DEFAULT_GM_BIO_CONFIG,
    hero_button_style: "glow",
  });

  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef("");
  const [basicInfoTab, setBasicInfoTab] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    if (selectedView === "computador") {
      setBasicInfoTab("desktop");
    } else if (selectedView === "smartphone") {
      setBasicInfoTab("mobile");
    }
  }, [selectedView]);
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
        handleChange(basicInfoTab === "desktop" ? "description" : "description_mobile", html);
      }
      setTimeout(updateSelectionStates, 0);
    } else {
      if (basicInfoTab === "desktop") {
        handleChange("description_bold", !bioConfig.description_bold);
      } else {
        handleChange("description_bold_mobile", !bioConfig.description_bold_mobile);
      }
    }
  };

  const handleItalicClick = () => {
    if (hasActiveSelection()) {
      document.execCommand('italic', false);
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        lastHtmlRef.current = html;
        handleChange(basicInfoTab === "desktop" ? "description" : "description_mobile", html);
      }
      setTimeout(updateSelectionStates, 0);
    } else {
      if (basicInfoTab === "desktop") {
        handleChange("description_italic", !bioConfig.description_italic);
      } else {
        handleChange("description_italic_mobile", !bioConfig.description_italic_mobile);
      }
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
            handleChange(basicInfoTab === "desktop" ? "description" : "description_mobile", html);
          }
          setTimeout(updateSelectionStates, 0);
        } catch (err) {
          console.error("Error formatting selection font", err);
        }
      }
    } else {
      if (basicInfoTab === "desktop") {
        handleChange("description_font", fontValue);
      } else {
        handleChange("description_font_mobile", fontValue);
      }
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
    } else {
      const compressedFile = await compressImage(file, { quality: isHighQuality ? 0.92 : 0.83 });
      compressed = compressedFile;
      ext = compressedFile.name.split('.').pop()?.toLowerCase() || "jpg";
      contentType = compressedFile.type;
    }
    
    const isValidUuid = (val: string | null | undefined) => 
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
    const targetFolder = isValidUuid(tenantId) ? tenantId : (isValidUuid(user?.id) ? user?.id : "6f4ee596-eb5e-415f-9189-d571ad85ed95");
    const filename = `bio_image_${Date.now()}_${Math.random().toString(36).substring(2,8)}.${ext}`;
    const path = `${targetFolder}/bio/${filename}`;
    
    const { error } = await supabase.storage.from("tenant-assets").upload(path, compressed, { contentType });
    if (error) {
      console.error("Erro upload tenant-assets:", error);
      const fallback = await supabase.storage.from("branding").upload(path, compressed, { contentType }).catch(() => ({ error: true, data: null }));
      if (!fallback.error) {
        const { data } = supabase.storage.from("branding").getPublicUrl(path);
        return data.publicUrl;
      }
      throw error;
    }
    
    const { data } = supabase.storage.from("tenant-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  
  
  const autoSavePortfolioItems = async (items: any[]) => {
    const tid = tenantId || settings?.tenant_id || (typeof localStorage !== "undefined" ? localStorage.getItem("tenant_id") : null);
    if (!tid) return;
    try {
      const updatedBio = {
        ...bioConfig,
        portfolio_items: items,
      };
      await upsertSettingsSupabase(tid, {
        bio_config: updatedBio,
      });
      setBioConfig(prev => ({
        ...prev,
        portfolio_items: items,
      }));
    } catch (err) {
      console.warn("Auto save portfolio warn:", err);
    }
  };

  const handleUploadMultiplePortfolioProjects = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files).slice(0, 5) as File[];
    if (files.length === 0) return;
    try {
      pushToast({ 
        type: "info", 
        title: "Upload Múltiplo Portfólio", 
        message: `Enviando ${files.length} ${files.length === 1 ? 'imagem de portfólio' : 'imagens de portfólio'} (até 5)...` 
      });
      const urls = await Promise.all(files.map(f => uploadImage(f)));
      const current = bioConfig.portfolio_items || [];
      const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
      
      const newItems = urls.map((url, i) => {
        const newId = (Date.now() + i).toString();
        return {
          id: newId,
          title: `Portfólio ${normalized.length + i + 1}`,
          image_url: url,
          main_banner_url: url,
          main_banner_mobile_url: url,
          layers: [{ id: `${newId}_layer_0`, image_url: url }],
          mobile_layers: [{ id: `${newId}_mobile_0`, image_url: url }]
        };
      });
      
      const updated = [...normalized, ...newItems];
      handleChange("portfolio_items", updated);
      await autoSavePortfolioItems(updated);
      
      if (newItems.length > 0) {
        setExpandedPortfolioItems([newItems[0].id]);
        setIsAboutExpanded(false);
      }
      
      pushToast({ 
        type: "success", 
        title: "Sucesso", 
        message: `${newItems.length} novos ${newItems.length === 1 ? 'portfólio criado' : 'portfólios criados'} com sucesso!` 
      });
    } catch (err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao criar projetos de portfólio em lote" });
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleAddPortfolioCollection = () => {
    const current = bioConfig.portfolio_items || [];
    const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
    const newId = Date.now().toString();
    const newItem = {
      id: newId,
      title: `Portfólio ${normalized.length + 1}`,
      layers: [],
      mobile_layers: []
    };
    const updated = [...normalized, newItem];
    handleChange("portfolio_items", updated);
    autoSavePortfolioItems(updated);
    setExpandedPortfolioItems(prev => [...prev, newId]);
    setIsAboutExpanded(false);
  };

  const handleUpdatePortfolioCollection = (id: string, updates: any) => {
    const current = bioConfig.portfolio_items || [];
    const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
    const updated = normalized.map((p: any) => p.id === id ? { ...p, ...updates } : p);
    handleChange("portfolio_items", updated);
    autoSavePortfolioItems(updated);
  };

  const handleRemovePortfolioCollection = (id: string) => {
    const current = bioConfig.portfolio_items || [];
    const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
    const itemToDelete = normalized.find((i: any) => i.id === id);
    if (itemToDelete) {
      setDeletedPortfolioItems(prev => [...prev, itemToDelete]);
    }
    const updated = normalized.filter((p: any) => p.id !== id);
    handleChange("portfolio_items", updated);
    autoSavePortfolioItems(updated);
  };

  const restorePortfolioCollection = (id: string) => {
    const itemToRestore = deletedPortfolioItems.find(i => i.id === id);
    if (itemToRestore) {
      const current = bioConfig.portfolio_items || [];
      const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
      const updated = [...normalized, itemToRestore];
      handleChange("portfolio_items", updated);
      autoSavePortfolioItems(updated);
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
    const files = Array.from(e.target.files).slice(0, 5) as File[];
    if (files.length === 0) return;
    try {
      pushToast({ 
        type: "info", 
        title: "Upload", 
        message: `Enviando ${files.length} ${files.length === 1 ? 'banner desktop' : 'banners desktop'} (até 5)...` 
      });
      const urls = await Promise.all(files.map(f => uploadImage(f)));
      
      const current = bioConfig.portfolio_items || [];
      const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
      
      const newLayers = urls.map((url, i) => ({
        id: (Date.now() + i).toString() + Math.random().toString(36).substring(2, 6),
        image_url: url
      }));

      const updatedList = normalized.map((p: any) => {
        if (p.id === portfolioId) {
          return {
            ...p,
            layers: [...(p.layers || []), ...newLayers]
          };
        }
        return p;
      });
      handleChange("portfolio_items", updatedList);
      await autoSavePortfolioItems(updatedList);
      
      pushToast({ 
        type: "success", 
        title: "Sucesso", 
        message: `${newLayers.length} ${newLayers.length === 1 ? 'banner adicionado' : 'banners adicionados'} e salvos` 
      });
    } catch(err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao enviar banners" });
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleRemovePortfolioLayer = async (portfolioId: string, layerId: string) => {
    const current = bioConfig.portfolio_items || [];
    const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
    
    const updatedList = normalized.map((p: any) => {
      if (p.id === portfolioId) {
        return {
          ...p,
          layers: (p.layers || []).filter((l: any) => l.id !== layerId)
        };
      }
      return p;
    });
    handleChange("portfolio_items", updatedList);
    await autoSavePortfolioItems(updatedList);
  };

  const handleUploadPortfolioMobileLayer = async (portfolioId: string, e: any) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files).slice(0, 5) as File[];
    if (files.length === 0) return;
    try {
      pushToast({ 
        type: "info", 
        title: "Upload", 
        message: `Enviando ${files.length} ${files.length === 1 ? 'banner smartphone' : 'banners smartphone'} (até 5)...` 
      });
      const urls = await Promise.all(files.map(f => uploadImage(f)));
      
      const current = bioConfig.portfolio_items || [];
      const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
      
      const newMobileLayers = urls.map((url, i) => ({
        id: (Date.now() + i).toString() + Math.random().toString(36).substring(2, 6),
        image_url: url
      }));

      const updatedList = normalized.map((p: any) => {
        if (p.id === portfolioId) {
          return {
            ...p,
            mobile_layers: [...(p.mobile_layers || []), ...newMobileLayers]
          };
        }
        return p;
      });
      handleChange("portfolio_items", updatedList);
      await autoSavePortfolioItems(updatedList);
      
      pushToast({ 
        type: "success", 
        title: "Sucesso", 
        message: `${newMobileLayers.length} ${newMobileLayers.length === 1 ? 'banner smartphone adicionado' : 'banners smartphone adicionados'} e salvos` 
      });
    } catch(err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao enviar banners smartphone" });
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleRemovePortfolioMobileLayer = async (portfolioId: string, layerId: string) => {
    const current = bioConfig.portfolio_items || [];
    const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
    
    const updatedList = normalized.map((p: any) => {
      if (p.id === portfolioId) {
        return {
          ...p,
          mobile_layers: (p.mobile_layers || []).filter((l: any) => l.id !== layerId)
        };
      }
      return p;
    });
    handleChange("portfolio_items", updatedList);
    await autoSavePortfolioItems(updatedList);
  };

  const handleUploadPortfolioMainBanner = async (portfolioId: string, e: any) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      pushToast({ type: "info", title: "Upload", message: "Enviando banner principal..." });
      const url = await uploadImage(e.target.files[0]);
      
      const current = bioConfig.portfolio_items || [];
      const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
      
      const updatedList = normalized.map((p: any) => {
        if (p.id === portfolioId) {
          return {
            ...p,
            main_banner_url: url
          };
        }
        return p;
      });
      handleChange("portfolio_items", updatedList);
      await autoSavePortfolioItems(updatedList);
      
      pushToast({ type: "success", title: "Sucesso", message: "Banner principal atualizado e salvo" });
    } catch(err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao enviar banner" });
    }
  };

  const handleRemovePortfolioMainBanner = async (portfolioId: string) => {
    const current = bioConfig.portfolio_items || [];
    const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
    
    const updatedList = normalized.map((p: any) => {
      if (p.id === portfolioId) {
        return {
          ...p,
          main_banner_url: ""
        };
      }
      return p;
    });
    handleChange("portfolio_items", updatedList);
    await autoSavePortfolioItems(updatedList);
  };

  const handleUploadPortfolioMainMobileBanner = async (portfolioId: string, e: any) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      pushToast({ type: "info", title: "Upload", message: "Enviando banner smartphone principal..." });
      const url = await uploadImage(e.target.files[0]);
      
      const current = bioConfig.portfolio_items || [];
      const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
      
      const updatedList = normalized.map((p: any) => {
        if (p.id === portfolioId) {
          return {
            ...p,
            main_banner_mobile_url: url
          };
        }
        return p;
      });
      handleChange("portfolio_items", updatedList);
      await autoSavePortfolioItems(updatedList);
      
      pushToast({ type: "success", title: "Sucesso", message: "Banner smartphone atualizado e salvo" });
    } catch(err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao enviar banner" });
    }
  };

  const handleRemovePortfolioMainMobileBanner = async (portfolioId: string) => {
    const current = bioConfig.portfolio_items || [];
    const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio', layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
    
    const updatedList = normalized.map((p: any) => {
      if (p.id === portfolioId) {
        return {
          ...p,
          main_banner_mobile_url: ""
        };
      }
      return p;
    });
    handleChange("portfolio_items", updatedList);
    await autoSavePortfolioItems(updatedList);
  };


  const handleUploadPortfolioItem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      pushToast({ type: "info", title: "Upload", message: "Enviando imagem do portfólio..." });
      const url = await uploadImage(e.target.files[0]);
      
      const newItem = {
        id: Date.now().toString(),
        title: "Portfólio",
        image_url: url,
        layers: [{ id: Date.now().toString(), image_url: url }],
        mobile_layers: [{ id: Date.now().toString() + "_mob", image_url: url }]
      };
      
      const current = bioConfig.portfolio_items || [];
      const updatedList = [...current, newItem];
      handleChange("portfolio_items", updatedList);
      await autoSavePortfolioItems(updatedList);
      
      pushToast({ type: "success", title: "Sucesso", message: "Imagem enviada e salva" });
    } catch(err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao enviar imagem" });
    }
  };

  const handleRemovePortfolioItem = async (id: string) => {
    const current = bioConfig.portfolio_items || [];
    const updatedList = current.filter((item: any) => item.id !== id);
    handleChange("portfolio_items", updatedList);
    await autoSavePortfolioItems(updatedList);
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

  const handleUploadAboutBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      pushToast({ type: "info", title: "Upload", message: "Enviando banner institucional..." });
      const url = await uploadImage(e.target.files[0]);
      handleChange("about_banner_url", url);
      pushToast({ type: "success", title: "Sucesso", message: "Banner de fundo enviado" });
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
    const s = await fetchSettingsSupabase(tenantId);
    if (s) {
      setSettings(s);
      const isGM = !s.company_name || s.company_name.toLowerCase().includes("gm");
      const baseConfig: Record<string, any> = isGM ? DEFAULT_GM_BIO_CONFIG : {};
      const incoming: Record<string, any> = s.bio_config || {};

      setBioConfig(prev => ({
        ...baseConfig,
        ...prev,
        ...incoming,
        title: incoming.title || prev.title || baseConfig.title || "GM edificação",
        title_mobile: incoming.title_mobile || prev.title_mobile || baseConfig.title_mobile || "GM edificação",
        title_font: incoming.title_font || prev.title_font || baseConfig.title_font || "syne",
        title_font_mobile: incoming.title_font_mobile || prev.title_font_mobile || baseConfig.title_font_mobile || "syne",
        title_size: incoming.title_size || prev.title_size || baseConfig.title_size || "36 pt",
        title_size_mobile: incoming.title_size_mobile || prev.title_size_mobile || baseConfig.title_size_mobile || "26 pt",
        title_color: incoming.title_color || prev.title_color || baseConfig.title_color || "#FFFFFF",
        hero_title: incoming.hero_title || incoming.title || prev.hero_title || baseConfig.hero_title || "GM edificação",
        hero_title_mobile: incoming.hero_title_mobile || incoming.hero_title || incoming.title_mobile || incoming.title || prev.hero_title_mobile || baseConfig.hero_title_mobile || "GM edificação",
        description: incoming.description || prev.description || baseConfig.description || "GM edificação, Design Feroz",
        description_mobile: incoming.description_mobile || incoming.description || prev.description_mobile || baseConfig.description_mobile || "GM edificação, Design Feroz",
        description_font: incoming.description_font || prev.description_font || baseConfig.description_font || "syne",
        description_font_mobile: incoming.description_font_mobile || prev.description_font_mobile || baseConfig.description_font_mobile || "syne",
        description_size: incoming.description_size || prev.description_size || baseConfig.description_size || "18 pt",
        description_size_mobile: incoming.description_size_mobile || prev.description_size_mobile || baseConfig.description_size_mobile || "16 pt",
        description_bold: incoming.description_bold !== undefined ? incoming.description_bold : (baseConfig.description_bold !== undefined ? baseConfig.description_bold : true),
        description_bold_mobile: incoming.description_bold_mobile !== undefined ? incoming.description_bold_mobile : (baseConfig.description_bold_mobile !== undefined ? baseConfig.description_bold_mobile : true),
        description_color: incoming.description_color || prev.description_color || baseConfig.description_color || "#E4E4E7",
        show_banners: isGM ? true : (incoming.show_banners !== undefined ? incoming.show_banners : (baseConfig.show_banners !== undefined ? baseConfig.show_banners : true)),
        banner_img_url_1: incoming.banner_img_url_1 || prev.banner_img_url_1 || baseConfig.banner_img_url_1 || "",
        mobile_banner_img_url_1: incoming.mobile_banner_img_url_1 || prev.mobile_banner_img_url_1 || baseConfig.mobile_banner_img_url_1 || "",
        contact_banner_img_url: incoming.contact_banner_img_url || prev.contact_banner_img_url || baseConfig.contact_banner_img_url || "",
        about_banner_url: incoming.about_banner_url || prev.about_banner_url || baseConfig.about_banner_url || "",
        website_logo_url: incoming.website_logo_url || prev.website_logo_url || baseConfig.website_logo_url || "",
        logo_url: incoming.logo_url || prev.logo_url || baseConfig.logo_url || "",
        show_about: incoming.show_about !== undefined ? incoming.show_about : true,
        about_title: incoming.about_title || prev.about_title || baseConfig.about_title || "SOBRE A GM EDIFICAÇÃO",
        about_description: incoming.about_description || prev.about_description || baseConfig.about_description || "",
        about_highlight: incoming.about_highlight || prev.about_highlight || baseConfig.about_highlight || "",
        about_btn_text: incoming.about_btn_text || prev.about_btn_text || baseConfig.about_btn_text || "Fale Conosco",
        about_btn_link: incoming.about_btn_link || prev.about_btn_link || baseConfig.about_btn_link || "https://wa.me/5598988402049",
        about_title_font: incoming.about_title_font || prev.about_title_font || baseConfig.about_title_font || "funnel",
        about_title_size: incoming.about_title_size || prev.about_title_size || baseConfig.about_title_size || "30 pt",
        about_title_bold: incoming.about_title_bold !== undefined ? incoming.about_title_bold : true,
        about_desc_font: incoming.about_desc_font || prev.about_desc_font || baseConfig.about_desc_font || "ui",
        about_desc_size: incoming.about_desc_size || prev.about_desc_size || baseConfig.about_desc_size || "16 pt",
        about_highlight_font: incoming.about_highlight_font || prev.about_highlight_font || baseConfig.about_highlight_font || "ui",
        about_highlight_size: incoming.about_highlight_size || prev.about_highlight_size || baseConfig.about_highlight_size || "16 pt",
        about_highlight_bold: incoming.about_highlight_bold !== undefined ? incoming.about_highlight_bold : true,
        button_style: incoming.button_style || prev.button_style || baseConfig.button_style || "solid",
        button_bg: incoming.button_bg || prev.button_bg || baseConfig.button_bg || "#FE540B",
        button_border: incoming.button_border || prev.button_border || baseConfig.button_border || "#FE540B",
        button_text: incoming.button_text || prev.button_text || baseConfig.button_text || "#FFFFFF",
        button_icon: incoming.button_icon || prev.button_icon || baseConfig.button_icon || "#FFFFFF",
        custom_links: (incoming.custom_links && incoming.custom_links.length > 0) ? incoming.custom_links : (prev.custom_links && prev.custom_links.length > 0 ? prev.custom_links : baseConfig.custom_links || []),
        catalog_items: incoming.catalog_items || prev.catalog_items || baseConfig.catalog_items || [],
        catalog_title: incoming.catalog_title || prev.catalog_title || baseConfig.catalog_title || "Catálogo de Serviços",
        portfolio_items: (incoming.portfolio_items && incoming.portfolio_items.length > 0) ? incoming.portfolio_items : (prev.portfolio_items && prev.portfolio_items.length > 0 ? prev.portfolio_items : baseConfig.portfolio_items || []),
        portfolio_title: incoming.portfolio_title || prev.portfolio_title || baseConfig.portfolio_title || "Portfólio",
      }));
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      // ✅ ISOLAMENTO ESTRITO: O website bio salva exclusivamente a sua bio_config e website_logo_url
      // sem sobrescrever dados do app principal (como company_name, pix_key ou plano de fundo do app)
      const payload: Partial<AppSettings> = {
        website_logo_url: (bioConfig as any)?.website_logo_url || (bioConfig as any)?.logo_url || null,
        bio_config: bioConfig,
      };

      const res = await upsertSettingsSupabase(tenantId, payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
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
    const url = `${window.location.origin}/${getCustomSlug()}`;
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

  const handleUploadMultipleProductImages = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>, startIndex = -1) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files).slice(0, 5) as File[];
    if (files.length === 0) return;
    try {
      pushToast({ 
        type: "info", 
        title: "Upload Múltiplo", 
        message: `Enviando ${files.length} ${files.length === 1 ? 'imagem do produto' : 'imagens do produto'} (até 5)...` 
      });
      const urls = await Promise.all(files.map(f => uploadImage(f, true)));
      
      setBioConfig(prev => {
        const updatedItems = (prev.catalog_items || []).map(item => {
          if (item.id === itemId) {
            let currentImages = [...(item.images || (item.image_url ? [item.image_url] : []))].filter(Boolean);
            if (startIndex >= 0 && startIndex < currentImages.length) {
              for (let i = 0; i < urls.length; i++) {
                if (startIndex + i < 8) {
                  currentImages[startIndex + i] = urls[i];
                }
              }
            } else {
              for (const url of urls) {
                if (currentImages.length < 8) {
                  currentImages.push(url);
                }
              }
            }
            if (currentImages.length === 0) currentImages = [''];
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
      
      pushToast({ 
        type: "success", 
        title: "Sucesso", 
        message: `${urls.length} ${urls.length === 1 ? 'imagem adicionada' : 'imagens adicionadas'} com sucesso` 
      });
    } catch(err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao enviar imagens do produto" });
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleUploadProductImageAtIndex = async (itemId: string, index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (e.target.files.length > 1) {
      return handleUploadMultipleProductImages(itemId, e, index);
    }
    try {
      pushToast({ type: "info", title: "Upload", message: "Enviando imagem do produto (alta qualidade)..." });
      const url = await uploadImage(e.target.files[0], true);
      updateCatalogItemImage(itemId, index, url);
      pushToast({ type: "success", title: "Sucesso", message: "Imagem de produto enviada" });
    } catch(err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao enviar imagem" });
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleUploadMultipleNewProductImages = async (e: React.ChangeEvent<HTMLInputElement>, startIndex = -1) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files).slice(0, 5) as File[];
    if (files.length === 0) return;
    try {
      pushToast({ 
        type: "info", 
        title: "Upload Múltiplo", 
        message: `Enviando ${files.length} ${files.length === 1 ? 'imagem' : 'imagens'} (até 5)...` 
      });
      const urls = await Promise.all(files.map(f => uploadImage(f, true)));
      
      setNewProduct(prev => {
        let currentImages = [...prev.images].filter(Boolean);
        if (startIndex >= 0 && startIndex < currentImages.length) {
          for (let i = 0; i < urls.length; i++) {
            if (startIndex + i < 8) {
              currentImages[startIndex + i] = urls[i];
            }
          }
        } else {
          for (const url of urls) {
            if (currentImages.length < 8) {
              currentImages.push(url);
            }
          }
        }
        if (currentImages.length === 0) currentImages = [''];
        return { ...prev, images: currentImages };
      });
      
      pushToast({ 
        type: "success", 
        title: "Sucesso", 
        message: `${urls.length} ${urls.length === 1 ? 'imagem adicionada' : 'imagens adicionadas'}` 
      });
    } catch(err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao enviar imagens" });
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleUploadNewProductImageAtIndex = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (e.target.files.length > 1) {
      return handleUploadMultipleNewProductImages(e, index);
    }
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
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleUploadMultipleCatalogBatch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files).slice(0, 5) as File[];
    if (files.length === 0) return;
    try {
      pushToast({ 
        type: "info", 
        title: "Upload Múltiplo Catálogo", 
        message: `Enviando ${files.length} ${files.length === 1 ? 'imagem de produto' : 'imagens de produto'} (até 5)...` 
      });
      const urls = await Promise.all(files.map(f => uploadImage(f, true)));
      const current = bioConfig.catalog_items || [];
      
      const newItems = urls.map((url, i) => {
        const newId = (Date.now() + i).toString();
        return {
          id: newId,
          name: `Produto ${current.length + i + 1}`,
          price: '0,00',
          description: '',
          image_url: url,
          images: [url],
          options: []
        };
      });
      
      const updated = [...current, ...newItems];
      handleChange("catalog_items", updated);
      setCatalogTab('list');
      
      pushToast({ 
        type: "success", 
        title: "Sucesso", 
        message: `${newItems.length} ${newItems.length === 1 ? 'produto adicionado' : 'produtos adicionados'} com sucesso!` 
      });
    } catch (err) {
      pushToast({ type: "error", title: "Erro", message: "Erro ao criar produtos em lote" });
    } finally {
      if (e.target) e.target.value = '';
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

  const hasActiveSection = Object.values(openSections).some(Boolean);

  const getSectionBtnClass = (isOpen: boolean) => {
    const base = "relative flex items-center justify-between pl-7 pr-4 py-3 rounded-xl border text-left transition-all duration-200 cursor-pointer text-xs sm:text-sm font-bold shadow-none group backdrop-blur-md";
    if (isOpen) {
      return `${base} fora bg-[var(--primary-color)]/20 border-[var(--primary-color)] text-[var(--primary-color)] dark:text-white font-black w-full shadow-[0_0_15px_rgba(254,84,11,0.25)] ring-1 ring-[var(--primary-color)]/50`;
    }
    return `${base} fora border-white/10 text-slate-700 dark:text-slate-200 hover:border-[var(--primary-color)] hover:text-[var(--primary-color)] dark:hover:text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10`;
  };

  return (
    <Page title="">
      <div 
        className="w-full pb-2 sm:pb-0 space-y-6"
        style={{
          '--primary-color': primaryColor,
          '--primary-color-hover': `${primaryColor}cc`,
          '--primary-color-10': `${primaryColor}1a`,
          '--primary-color-20': `${primaryColor}33`,
          '--primary-color-60': `${primaryColor}99`,
        } as React.CSSProperties}>

        {/* HEADER PANEL SPANNING FULL WIDTH */}
        <div className="gm-card fora p-4 sm:p-6 pb-7 sm:pb-9 text-center space-y-4 relative overflow-hidden rounded-2xl border border-white/10 shadow-none backdrop-blur-md">
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
           <h3 className="text-xl sm:text-2xl font-bold dark:text-white text-zinc-800 flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap">
              <span 
                className="text-2xl sm:text-3xl font-black bg-clip-text text-transparent select-none tracking-tight"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${primaryColor}, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, ${primaryColor})`,
                  backgroundSize: '300% 300%',
                  animation: 'color-loop 5s ease infinite',
                }}
              >
                BiO
              </span>
              <span className="text-zinc-400 dark:text-zinc-600 text-xl sm:text-2xl font-light mx-0.5">|</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg barra border border-white/15 flex items-center justify-center overflow-hidden shadow-none shrink-0 p-1 bg-black/40">
                {(bioConfig as any).website_logo_url || (bioConfig as any).logo_url || settings?.company_logo_url ? (
                  <img 
                    src={(bioConfig as any).website_logo_url || (bioConfig as any).logo_url || settings?.company_logo_url} 
                    alt="Logo da Empresa" 
                    className="max-w-[70%] max-h-[70%] w-auto h-auto object-contain mx-auto my-auto block select-none"
                  />
                ) : (
                  <span className="text-[var(--gm-primary)] font-black text-[10px] sm:text-xs">
                    {(settings?.company_name || bioConfig.title || "GM").substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-lg sm:text-xl font-bold dark:text-white text-zinc-800 tracking-wide">
                {settings?.company_name || bioConfig.title || "CardDigital GM"}
              </span>
           </h3>
           <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Essa é a página que você pode enviar para seus clientes como um cartão de visitas digital ou Link na Bio.</p>
           
           <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2.5 pt-2 w-full max-w-2xl mx-auto">
              <button 
                onClick={handleCopyLink} 
                className="w-full sm:w-[180px] h-10 px-3.5 rounded-md font-black text-xs uppercase tracking-wider flex items-center justify-center border border-[#26262A] bg-[#131315] hover:bg-[#1B1B1E] active:scale-95 text-[#F2F2F3] transition-all cursor-pointer shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 mr-2 text-emerald-400" /> : <Copy className="w-4 h-4 mr-2 text-[#8B8B92]" />}
                {copied ? "Link Copiado!" : "Copiar Link"}
              </button>
              <a 
                href={`${window.location.origin}/${getCustomSlug()}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-full sm:w-[180px] h-10 px-3.5 rounded-md font-black text-xs uppercase tracking-wider flex items-center justify-center border border-[#26262A] bg-[#131315] hover:bg-[#1B1B1E] active:scale-95 text-[#F2F2F3] transition-all cursor-pointer shadow-sm"
              >
                <Globe className="w-4 h-4 mr-2 text-[#8B8B92]" /> Ver Tela Inteira
              </a>
              <button 
                onClick={() => setPreviewOpen(true)} 
                className="w-full sm:w-[180px] h-10 px-3.5 rounded-md font-black text-xs uppercase tracking-wider flex items-center justify-center border border-[#26262A] bg-[#131315] hover:bg-[#1B1B1E] active:scale-95 text-[#F2F2F3] transition-all cursor-pointer shadow-sm"
              >
                <Eye className="w-4 h-4 mr-2 text-[#8B8B92]" /> Visualizar Prévia
              </button>
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="w-full sm:w-[190px] h-10 px-4 rounded-md font-black text-xs uppercase tracking-wider flex items-center justify-center border border-[#F65A1A] bg-[#F65A1A] hover:bg-[#FF7A38] active:scale-95 text-[#0B0B0C] shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4 mr-2 text-[#0B0B0C]" /> {saving ? "Salvando..." : "Salvar Alterações"}
              </button>
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

          <div className="flex flex-col gap-6 items-stretch w-full animate-in fade-in duration-300">
            {/* SVG Gradient Definition matching the BiO text gradient animation */}
            <svg width="0" height="0" className="absolute pointer-events-none">
              <defs>
                <linearGradient id="bio-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff8c00">
                    <animate 
                      attributeName="stop-color" 
                      values="#ff8c00; #22c55e; #32BCAD; #8b5cf6; #ec4899; #ff8c00" 
                      dur="5s" 
                      repeatCount="indefinite" 
                    />
                  </stop>
                  <stop offset="100%" stopColor="#22c55e">
                    <animate 
                      attributeName="stop-color" 
                      values="#22c55e; #32BCAD; #8b5cf6; #ec4899; #ff8c00; #22c55e" 
                      dur="5s" 
                      repeatCount="indefinite" 
                    />
                  </stop>
                </linearGradient>
              </defs>
            </svg>

            {/* BARRA DE SELEÇÃO DE DISPOSITIVO (SMARTPHONE / COMPUTADOR) */}
            <div className="gm-card fora flex flex-col sm:flex-row items-center justify-between p-4 sm:p-5 rounded-2xl border border-white/12 shadow-none backdrop-blur-xl gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-black uppercase tracking-wider text-[var(--primary-color)] flex items-center gap-2">
                  <Layout className="w-4 h-4" /> Versão da Página BiO:
                </span>
                <div className="flex items-center gap-1.5 p-1 rounded-2xl barra border border-white/10 bg-black/40 backdrop-blur-xl w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedView("smartphone");
                      setPreviewMode("smartphone");
                    }}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                      selectedView === "smartphone"
                        ? "bg-[var(--primary-color)] text-white shadow-lg shadow-[var(--primary-color)]/30 scale-[1.02]"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Bio Smartphone (Mobile)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedView("computador");
                      setPreviewMode("pc");
                    }}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                      selectedView === "computador"
                        ? "bg-[var(--primary-color)] text-white shadow-lg shadow-[var(--primary-color)]/30 scale-[1.02]"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                    <span>Bio Computador (Desktop)</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                <span className="text-xs font-semibold text-zinc-400">
                  Editando agora: <strong className="text-white font-bold">{selectedView === "smartphone" ? "Versão Celular & Mobile" : "Versão Desktop & Computador"}</strong>
                </span>
              </div>
            </div>

            {/* SUBDIVISÃO SUPERIOR: Menu em Grade Completa de 9 Seções (Sempre Visível) */}
            <div className="gm-card fora flex flex-col gap-3 p-4 sm:p-5 rounded-2xl border border-white/12 shadow-none backdrop-blur-xl">
              <div className="flex items-center justify-between px-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--primary-color)]" />
                  <span className="text-xs font-extrabold text-[var(--primary-color)] uppercase tracking-wider">Painel do Editor de Seções BiO</span>
                </div>
                <span className="text-xs text-zinc-400 font-medium">
                  {hasActiveSection 
                    ? "Clique em qualquer seção para alternar ou fechar" 
                    : "Selecione uma seção abaixo para editar"}
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {/* 1. Informações Básicas */}
                <button
                  type="button"
                  onClick={() => toggleSection('basic')}
                  className={getSectionBtnClass(openSections.basic)}
                >
                  {openSections.basic && (
                    <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--primary-color)] rounded-full shadow-[0_0_8px_var(--primary-color)]" />
                  )}
                  <span className="flex items-center gap-3">
                    <Info className={`w-4.5 h-4.5 transition-transform duration-200 ${openSections.basic ? 'text-[var(--primary-color)] scale-110' : 'text-[var(--primary-color)] opacity-85 group-hover:scale-110'}`} />
                    INFORMAÇÕES BÁSICAS
                  </span>
                  <div className="flex items-center gap-2">
                    {openSections.basic && (
                      <span className="text-[10px] text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-full border border-[var(--primary-color)]/20 uppercase tracking-wide font-bold animate-pulse">ATIVO</span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${openSections.basic ? 'text-[var(--primary-color)] rotate-180' : 'text-zinc-400 group-hover:text-[var(--primary-color)]'}`} />
                  </div>
                </button>

                {/* 2. Aparência do Site */}
                <button
                  type="button"
                  onClick={() => toggleSection('appearance')}
                  className={getSectionBtnClass(openSections.appearance)}
                >
                  {openSections.appearance && (
                    <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--primary-color)] rounded-full shadow-[0_0_8px_var(--primary-color)]" />
                  )}
                  <span className="flex items-center gap-3">
                    <Eye className={`w-4.5 h-4.5 transition-transform duration-200 ${openSections.appearance ? 'text-[var(--primary-color)] scale-110' : 'text-[var(--primary-color)] opacity-85 group-hover:scale-110'}`} />
                    APARÊNCIA DO SITE
                  </span>
                  <div className="flex items-center gap-2">
                    {openSections.appearance && (
                      <span className="text-[10px] text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-full border border-[var(--primary-color)]/20 uppercase tracking-wide font-bold animate-pulse">ATIVO</span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${openSections.appearance ? 'text-[var(--primary-color)] rotate-180' : 'text-zinc-400 group-hover:text-[var(--primary-color)]'}`} />
                  </div>
                </button>

                {/* 3. Contatos e Redes */}
                <button
                  type="button"
                  onClick={() => toggleSection('contacts')}
                  className={getSectionBtnClass(openSections.contacts)}
                >
                  {openSections.contacts && (
                    <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--primary-color)] rounded-full shadow-[0_0_8px_var(--primary-color)]" />
                  )}
                  <span className="flex items-center gap-3">
                    <Phone className={`w-4.5 h-4.5 transition-transform duration-200 ${openSections.contacts ? 'text-[var(--primary-color)] scale-110' : 'text-[var(--primary-color)] opacity-85 group-hover:scale-110'}`} />
                    CONTATOS E REDES
                  </span>
                  <div className="flex items-center gap-2">
                    {openSections.contacts && (
                      <span className="text-[10px] text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-full border border-[var(--primary-color)]/20 uppercase tracking-wide font-bold animate-pulse">ATIVO</span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${openSections.contacts ? 'text-[var(--primary-color)] rotate-180' : 'text-zinc-400 group-hover:text-[var(--primary-color)]'}`} />
                  </div>
                </button>

                {/* 4. Outros Links */}
                <button
                  type="button"
                  onClick={() => toggleSection('otherLinks')}
                  className={getSectionBtnClass(openSections.otherLinks)}
                >
                  {openSections.otherLinks && (
                    <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--primary-color)] rounded-full shadow-[0_0_8px_var(--primary-color)]" />
                  )}
                  <span className="flex items-center gap-3">
                    <LinkIcon className={`w-4.5 h-4.5 transition-transform duration-200 ${openSections.otherLinks ? 'text-[var(--primary-color)] scale-110' : 'text-[var(--primary-color)] opacity-85 group-hover:scale-110'}`} />
                    OUTROS LINKS
                  </span>
                  <div className="flex items-center gap-2">
                    {openSections.otherLinks && (
                      <span className="text-[10px] text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-full border border-[var(--primary-color)]/20 uppercase tracking-wide font-bold animate-pulse">ATIVO</span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${openSections.otherLinks ? 'text-[var(--primary-color)] rotate-180' : 'text-zinc-400 group-hover:text-[var(--primary-color)]'}`} />
                  </div>
                </button>

                {/* 5. Catálogo de Produtos */}
                <button
                  type="button"
                  onClick={() => toggleSection('catalog')}
                  className={getSectionBtnClass(openSections.catalog)}
                >
                  {openSections.catalog && (
                    <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--primary-color)] rounded-full shadow-[0_0_8px_var(--primary-color)]" />
                  )}
                  <span className="flex items-center gap-3">
                    <ShoppingBag className={`w-4.5 h-4.5 transition-transform duration-200 ${openSections.catalog ? 'text-[var(--primary-color)] scale-110' : 'text-[var(--primary-color)] opacity-85 group-hover:scale-110'}`} />
                    CATÁLOGO DE PRODUTOS
                  </span>
                  <div className="flex items-center gap-2">
                    {openSections.catalog && (
                      <span className="text-[10px] text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-full border border-[var(--primary-color)]/20 uppercase tracking-wide font-bold animate-pulse">ATIVO</span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${openSections.catalog ? 'text-[var(--primary-color)] rotate-180' : 'text-zinc-400 group-hover:text-[var(--primary-color)]'}`} />
                  </div>
                </button>

                {/* 6. Portfólio */}
                <button
                  type="button"
                  onClick={() => toggleSection('portfolio')}
                  className={getSectionBtnClass(openSections.portfolio)}
                >
                  {openSections.portfolio && (
                    <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--primary-color)] rounded-full shadow-[0_0_8px_var(--primary-color)]" />
                  )}
                  <span className="flex items-center gap-3">
                    <Layout className={`w-4.5 h-4.5 transition-transform duration-200 ${openSections.portfolio ? 'text-[var(--primary-color)] scale-110' : 'text-[var(--primary-color)] opacity-85 group-hover:scale-110'}`} />
                    PORTFÓLIO
                  </span>
                  <div className="flex items-center gap-2">
                    {openSections.portfolio && (
                      <span className="text-[10px] text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-full border border-[var(--primary-color)]/20 uppercase tracking-wide font-bold animate-pulse">ATIVO</span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${openSections.portfolio ? 'text-[var(--primary-color)] rotate-180' : 'text-zinc-400 group-hover:text-[var(--primary-color)]'}`} />
                  </div>
                </button>

                {/* 7. Pagamento */}
                <button
                  type="button"
                  onClick={() => toggleSection('payment')}
                  className={getSectionBtnClass(openSections.payment)}
                >
                  {openSections.payment && (
                    <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--primary-color)] rounded-full shadow-[0_0_8px_var(--primary-color)]" />
                  )}
                  <span className="flex items-center gap-3">
                    <CreditCard className={`w-4.5 h-4.5 transition-transform duration-200 ${openSections.payment ? 'text-[var(--primary-color)] scale-110' : 'text-[var(--primary-color)] opacity-85 group-hover:scale-110'}`} />
                    DADOS DE PAGAMENTO (PIX)
                  </span>
                  <div className="flex items-center gap-2">
                    {openSections.payment && (
                      <span className="text-[10px] text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-full border border-[var(--primary-color)]/20 uppercase tracking-wide font-bold animate-pulse">ATIVO</span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${openSections.payment ? 'text-[var(--primary-color)] rotate-180' : 'text-zinc-400 group-hover:text-[var(--primary-color)]'}`} />
                  </div>
                </button>

                {/* 8. Endereço */}
                <button
                  type="button"
                  onClick={() => toggleSection('address')}
                  className={getSectionBtnClass(openSections.address)}
                >
                  {openSections.address && (
                    <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--primary-color)] rounded-full shadow-[0_0_8px_var(--primary-color)]" />
                  )}
                  <span className="flex items-center gap-3">
                    <MapPin className={`w-4.5 h-4.5 transition-transform duration-200 ${openSections.address ? 'text-[var(--primary-color)] scale-110' : 'text-[var(--primary-color)] opacity-85 group-hover:scale-110'}`} />
                    ENDEREÇO E LOCALIZAÇÃO
                  </span>
                  <div className="flex items-center gap-2">
                    {openSections.address && (
                      <span className="text-[10px] text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-full border border-[var(--primary-color)]/20 uppercase tracking-wide font-bold animate-pulse">ATIVO</span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${openSections.address ? 'text-[var(--primary-color)] rotate-180' : 'text-zinc-400 group-hover:text-[var(--primary-color)]'}`} />
                  </div>
                </button>

                {/* 9. Chat/Contato */}
                <button
                  type="button"
                  onClick={() => toggleSection('contactSection')}
                  className={getSectionBtnClass(openSections.contactSection)}
                >
                  {openSections.contactSection && (
                    <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--primary-color)] rounded-full shadow-[0_0_8px_var(--primary-color)]" />
                  )}
                  <span className="flex items-center gap-3">
                    <Sparkles className={`w-4.5 h-4.5 transition-transform duration-200 ${openSections.contactSection ? 'text-[var(--primary-color)] scale-110' : 'text-[var(--primary-color)] opacity-85 group-hover:scale-110'}`} />
                    CHAT CARDDIGITAL GM
                  </span>
                  <div className="flex items-center gap-2">
                    {openSections.contactSection && (
                      <span className="text-[10px] text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-full border border-[var(--primary-color)]/20 uppercase tracking-wide font-bold animate-pulse">ATIVO</span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${openSections.contactSection ? 'text-[var(--primary-color)] rotate-180' : 'text-zinc-400 group-hover:text-[var(--primary-color)]'}`} />
                  </div>
                </button>
              </div>
            </div>

            {/* Placeholder quando nenhuma seção está expandida */}
            {!Object.values(openSections).some(Boolean) && (
              <div className="gm-card fora flex flex-col items-center justify-center py-16 px-4 border border-white/10 rounded-2xl text-center shadow-none backdrop-blur-md animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] flex items-center justify-center mb-4 border border-[var(--primary-color)]/20 shadow-none">
                  <Sparkles className="w-8 h-8 animate-pulse text-[var(--primary-color)]" />
                </div>
                <h3 className="text-xl font-extrabold text-zinc-800 dark:text-white mb-2">Painel de Edição BiO</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md leading-relaxed font-medium">
                  Clique em qualquer uma das seções acima para abrir seu respectivo painel de configuração e editar de ponta a ponta.
                </p>
              </div>
            )}


            {/* 1. INFORMAÇÕES BÁSICAS */}
            {openSections.basic && (
              <div className="gm-card fora border border-white/10 p-4 sm:p-6 rounded-2xl space-y-5 shadow-none backdrop-blur-md w-full animate-in fade-in duration-300">
                <div className="sticky top-0 z-20 barra py-2 sm:py-2.5 px-3 sm:px-4 border-b border-white/10 flex items-center justify-between mb-3 rounded-xl shadow-none">
                  <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-zinc-800 dark:text-white uppercase tracking-wider">
                    <Info className="w-4.5 h-4.5 text-[var(--primary-color)] animate-pulse" />
                    INFORMAÇÕES BÁSICAS
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-full border border-[var(--primary-color)]/20 shadow-none">
                    Edição Ativa
                  </span>
                </div>
                
                <div className="flex flex-col gap-5">

                {/* Logomarca Exclusiva do Website */}
                <div className="p-5 sm:p-6 rounded-2xl border border-white/10 fora flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-none">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl barra border-2 border-dashed border-white/20 overflow-hidden flex items-center justify-center shrink-0 group">
                    {(bioConfig as any).website_logo_url || (bioConfig as any).logo_url ? (
                      <img 
                        src={(bioConfig as any).website_logo_url || (bioConfig as any).logo_url} 
                        alt="Logo Website" 
                        className="w-full h-full object-contain p-2" 
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-zinc-500">
                        <ImageIcon size={28} className="opacity-60 text-[var(--primary-color)]" />
                        <span className="text-[10px] font-bold">Sem Imagem</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col items-start gap-2.5 text-left w-full">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--primary-color)] flex items-center gap-1.5">
                      <Sparkles size={14} /> Logomarca Exclusiva do Website
                    </span>
                    <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
                      Esta imagem será exibida exclusivamente no cabeçalho e rodapé do seu site público. Ela é independente da logomarca do aplicativo interno.
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5 pt-1 w-full">
                      <label className="gm-btn py-2 px-4 text-xs font-bold flex items-center gap-2 cursor-pointer rounded-xl border border-[var(--primary-color)]/40 bg-[var(--primary-color)]/10 text-[var(--primary-color)] hover:bg-[var(--primary-color)] hover:text-white transition-all shadow-none">
                        <Upload size={14} />
                        <span>Carregar Logo do Website</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            try {
                              pushToast({ type: "info", title: "Upload", message: "Enviando logo do website..." });
                              const url = await uploadImage(f);
                              handleChange("logo_url", url);
                              handleChange("website_logo_url", url);
                              pushToast({ type: "success", title: "Sucesso", message: "Logo do website atualizado!" });
                            } catch (err: any) {
                              pushToast({ type: "error", title: "Erro", message: err.message || "Erro no upload" });
                            }
                          }}
                        />
                      </label>
                      {((bioConfig as any).website_logo_url || (bioConfig as any).logo_url) && (
                        <button
                          type="button"
                          onClick={() => {
                            handleChange("logo_url", "");
                            handleChange("website_logo_url", "");
                            pushToast({ type: "info", title: "Removido", message: "Logo do website removido." });
                          }}
                          className="px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl border border-red-500/20 transition-all cursor-pointer"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
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
                   <p className="text-xs text-zinc-400 mt-1.5 ml-1">
                     Se deixado em branco, será utilizado o título configurado na versão Desktop.
                   </p>
                 )}
               </div>
               <div>
                 <label className="gm-label">{basicInfoTab === "desktop" ? "Descrição (Desktop)" : "Descrição (Smartphone)"}</label>
                 <div ref={editorRef} contentEditable onInput={handleEditorInput} onBlur={handleEditorInput} className={`gm-input bio-desc-editor min-h-[160px] !py-3 w-full transition-all duration-200 overflow-y-auto whitespace-pre-wrap outline-none border border-white/10 focus:border-[var(--primary-color)] rounded-xl resize-y overflow-auto ${
                    (basicInfoTab === "desktop" ? bioConfig.description_align : (bioConfig.description_align_mobile || "center")) === "left" ? "text-left" : (basicInfoTab === "desktop" ? bioConfig.description_align : (bioConfig.description_align_mobile || "center")) === "right" ? "text-right" : "text-center"
                  } ${
                    (basicInfoTab === "desktop" ? bioConfig.description_bold : bioConfig.description_bold_mobile) ? "font-bold" : "font-medium"
                  } ${
                    (basicInfoTab === "desktop" ? bioConfig.description_italic : bioConfig.description_italic_mobile) ? "italic" : "not-italic"
                  } ${getFontSizeClass(basicInfoTab === "desktop" ? bioConfig.description_size : (bioConfig.description_size_mobile || "lg"))} bio-desc-font-${(basicInfoTab === "desktop" ? bioConfig.description_font : (bioConfig.description_font_mobile || "ui"))}`} data-placeholder={basicInfoTab === "desktop" ? "Sua frase de destaque..." : "Deixe em branco para usar a mesma descrição do Desktop..."} style={{ outline: 'none' }}></div>
                  {basicInfoTab === "mobile" && (
                    <p className="text-xs text-zinc-400 mt-1.5 ml-1 mb-2">
                      Se deixado em branco, será utilizada a descrição configurada na versão Desktop.
                    </p>
                  )}
                  
                  {/* Barra de Formatação */}
                  <div className="flex flex-wrap items-center gap-3 bg-[#0d0e12]/60 p-3 rounded-lg border border-white/5 mt-2">
                    {/* Alinhamento */}
                    <div className="flex items-center gap-1 bg-[#161920] p-1 rounded-xl border border-white/5 shadow-inner">
                      <button
                        type="button"
                        onClick={() => handleChange(basicInfoTab === "desktop" ? "description_align" : "description_align_mobile", "left")}
                        className={`p-2 rounded-lg transition-all duration-200 ${((basicInfoTab === "desktop" ? bioConfig.description_align : bioConfig.description_align_mobile) === 'left') ? 'bg-[var(--primary-color)] text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                        title="Alinhar à Esquerda"
                      >
                        <AlignLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange(basicInfoTab === "desktop" ? "description_align" : "description_align_mobile", "center")}
                        className={`p-2 rounded-lg transition-all duration-200 ${((basicInfoTab === "desktop" ? bioConfig.description_align : bioConfig.description_align_mobile) === 'center' || !(basicInfoTab === "desktop" ? bioConfig.description_align : bioConfig.description_align_mobile)) ? 'bg-[var(--primary-color)] text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                        title="Centralizado"
                      >
                        <AlignCenter className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange(basicInfoTab === "desktop" ? "description_align" : "description_align_mobile", "right")}
                        className={`p-2 rounded-lg transition-all duration-200 ${((basicInfoTab === "desktop" ? bioConfig.description_align : bioConfig.description_align_mobile) === 'right') ? 'bg-[var(--primary-color)] text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
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
                        className={`p-2 rounded-lg transition-all duration-200 ${((basicInfoTab === "desktop" ? bioConfig.description_bold : bioConfig.description_bold_mobile) || isSelectionBold) ? 'bg-[var(--primary-color)] text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                        title="Negrito"
                      >
                        <Bold className="w-4 h-4 font-bold" />
                      </button>
                      <button
                        type="button"
                        onClick={handleItalicClick}
                        className={`p-2 rounded-lg transition-all duration-200 ${((basicInfoTab === "desktop" ? bioConfig.description_italic : bioConfig.description_italic_mobile) || isSelectionItalic) ? 'bg-[var(--primary-color)] text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
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
                           (basicInfoTab === "desktop"
                             ? (bioConfig.description_size && bioConfig.description_size !== "lg" && bioConfig.description_size !== "16 pt")
                             : (bioConfig.description_size_mobile && bioConfig.description_size_mobile !== "lg" && bioConfig.description_size_mobile !== "16 pt")
                           )
                             ? 'border-[var(--primary-color)] text-[var(--primary-color)] bg-[var(--primary-color)]/5'
                             : 'border-white/10'
                         }`}
                         value={getSelectSizeValue(basicInfoTab === "desktop" ? bioConfig.description_size : (bioConfig.description_size_mobile || "lg"))}
                         onChange={e => handleChange(basicInfoTab === "desktop" ? "description_size" : "description_size_mobile", e.target.value)}
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

                {/* Botão de Ação Principal (Conheça nossos Serviços) */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--primary-color)]" /> Botão de Ação Principal (Conheça nossos Serviços)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="gm-label font-semibold text-[11px]">Texto do Botão</label>
                      <input 
                        type="text" 
                        className="gm-input font-medium !py-2" 
                        value={bioConfig.hero_button_label !== undefined ? bioConfig.hero_button_label : "Conheça nossos Serviços"} 
                        onChange={e => handleChange("hero_button_label", e.target.value)} 
                        placeholder="Conheça nossos Serviços" 
                      />
                    </div>
                    <div>
                      <label className="gm-label font-semibold text-[11px]">Ação ao Clicar</label>
                      <select 
                        className="gm-input font-medium !py-2"
                        value={bioConfig.hero_button_action || "portfolio"}
                        onChange={e => handleChange("hero_button_action", e.target.value)}
                      >
                        <option value="portfolio">Rolar até Portfólio / Catálogo</option>
                        <option value="contact">Ir para Seção de Contato</option>
                        <option value="url">Abrir Link Externo</option>
                      </select>
                    </div>
                  </div>
                  {bioConfig.hero_button_action === "url" && (
                    <div>
                      <label className="gm-label font-semibold text-[11px]">Link de Destino (URL)</label>
                      <input 
                        type="text" 
                        className="gm-input font-medium !py-2" 
                        value={bioConfig.hero_button_url || ""} 
                        onChange={e => handleChange("hero_button_url", e.target.value)} 
                        placeholder="https://..." 
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

            {/* 2. APARÊNCIA DO SITE */}
            {openSections.appearance && (
              <div className="gm-card fora border border-white/10 p-4 sm:p-6 rounded-2xl space-y-5 shadow-none backdrop-blur-md w-full animate-in fade-in duration-300">
                <div className="sticky top-0 z-20 barra py-2 sm:py-2.5 px-3 sm:px-4 border-b border-white/10 flex items-center justify-between mb-3 rounded-xl shadow-none">
                  <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-zinc-800 dark:text-white uppercase tracking-wider">
                    <Eye className="w-4.5 h-4.5 text-[var(--primary-color)] animate-pulse" />
                    APARÊNCIA DO SITE
                  </span>
                  <span className="text-[10px] sm:text-xs font-semibold text-zinc-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10 shadow-none">
                    Edição Ativa
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 pt-2">
              <div>
                <label className="gm-label">Cor de Destaque</label>
                <div className="flex items-center gap-2">
                  <input type="color" className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent" value={bioConfig.color || settings?.brand_primary || "#FF6900"} onChange={e => handleChange("color", e.target.value)} />
                  <input type="text" className="gm-input flex-1 font-mono text-sm" value={bioConfig.color || settings?.brand_primary || "#FF6900"} onChange={e => handleChange("color", e.target.value)} />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Se vazio, usará a cor principal do sistema.</p>
              </div>
              <div>
                <label className="gm-label">Tema Visual</label>
                <select 
                  className="gm-input w-full font-medium" 
                  value={bioConfig.theme === "light" ? "light" : "dark"} 
                  onChange={e => handleChange("theme", e.target.value)}
                >
                  <option value="dark">Escuro</option>
                  <option value="light">Claro</option>
                </select>
              </div>
              <div>
                <label className="gm-label flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5 text-zinc-400" /> Fonte do Site (Computador)</label>
                <select className="gm-input w-full" value={bioConfig.site_font || "inter"} onChange={e => handleChange("site_font", e.target.value)}>
                  <option value="space">Space Grotesk (Moderno / Tech)</option>
                  <option value="syne">Syne (Display / Moderno)</option>
                  <option value="inter">Inter (Padrão)</option>
                  <option value="serif">Playfair Display (Serif/Editorial)</option>
                  <option value="mono">JetBrains Mono (Código/Técnico)</option>
                  <option value="montserrat">Montserrat (Clean/Moderno)</option>
                  <option value="jakarta">Plus Jakarta Sans (Elegante)</option>
                </select>
              </div>
              <div>
                <label className="gm-label flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5 text-zinc-400" /> Tamanho da Fonte (Computador)</label>
                <select className="gm-input w-full" value={bioConfig.site_font_size || "md"} onChange={e => handleChange("site_font_size", e.target.value)}>
                  <option value="sm">Pequeno</option>
                  <option value="md">Médio (Padrão)</option>
                  <option value="lg">Grande</option>
                  <option value="xl">Extra Grande</option>
                </select>
              </div>
              <div>
                <label className="gm-label flex items-center gap-1.5 text-[var(--primary-color)]"><Smartphone className="w-3.5 h-3.5" /> Fonte do Site (Celular)</label>
                <select className="gm-input w-full border-[var(--primary-color-40)] focus:border-[var(--primary-color)]" value={bioConfig.site_font_mobile || bioConfig.site_font || "inter"} onChange={e => handleChange("site_font_mobile", e.target.value)}>
                  <option value="space">Space Grotesk (Moderno / Tech)</option>
                  <option value="syne">Syne (Display / Moderno)</option>
                  <option value="inter">Inter (Padrão)</option>
                  <option value="serif">Playfair Display (Serif/Editorial)</option>
                  <option value="mono">JetBrains Mono (Código/Técnico)</option>
                  <option value="montserrat">Montserrat (Clean/Moderno)</option>
                  <option value="jakarta">Plus Jakarta Sans (Elegante)</option>
                </select>
              </div>
              <div>
                <label className="gm-label flex items-center gap-1.5 text-[var(--primary-color)]"><Smartphone className="w-3.5 h-3.5" /> Tamanho da Fonte (Celular)</label>
                <select className="gm-input w-full border-[var(--primary-color-40)] focus:border-[var(--primary-color)]" value={bioConfig.site_font_size_mobile || bioConfig.site_font_size || "md"} onChange={e => handleChange("site_font_size_mobile", e.target.value)}>
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
              {selectedView === "computador" && (
                <div className="sm:col-span-2 border-t border-white/10 pt-4 mt-2 space-y-4">
                  <div className="space-y-4 fora p-4 sm:p-5 rounded-2xl border border-white/10 shadow-none">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                      <span className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Layout className="w-4 h-4 text-[var(--primary-color)]" /> Mídias Versão Desktop (Computador)
                      </span>
                      <span className="text-[10px] font-semibold text-zinc-400 barra px-2.5 py-1 rounded-full border border-white/10 shadow-none">
                        Tamanho Sugerido: <strong className="text-[var(--primary-color)]">1920x500 px</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                    {/* Plano de Fundo Desktop */}
                    <div className="space-y-2 barra p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between shadow-none">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-zinc-300">Plano de Fundo Desktop</span>
                          {bioConfig.bg_image_url && (
                            <button 
                              type="button" 
                              onClick={() => handleChange("bg_image_url", "")} 
                              className="text-red-500 hover:text-red-400 text-[10px] font-bold cursor-pointer"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                        
                        {bioConfig.bg_image_url ? (
                          <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-none">
                            <OptimizedImage src={bioConfig.bg_image_url} alt="Plano de Fundo Desktop" className="w-full h-full object-cover" width={800} />
                          </div>
                        ) : (
                          <div className="w-full aspect-video rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-zinc-500 text-[10px] font-medium bg-black/10">
                            <Layout className="w-4 h-4 mb-1 opacity-40 text-[var(--primary-color)]" />
                            Sem plano de fundo desktop
                          </div>
                        )}
                      </div>
                      <div className="pt-2">
                        <label className="w-full gm-btn gm-btn-outline !py-4 gap-1.5 text-xs flex items-center justify-center cursor-pointer border border-[var(--primary-color-60)] hover:border-[var(--primary-color)] hover:bg-[var(--primary-color-10)] transition-all shadow-none">
                          <Upload className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                          <span className="font-bold text-white">Upload</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadBg(false, e)} />
                        </label>
                      </div>
                    </div>

                    {/* Banner Desktop Principal */}
                    <div className="space-y-2 barra p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between shadow-none">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-zinc-300">Banner Desktop Principal</span>
                          {bioConfig.banner_img_url_1 && (
                            <button 
                              type="button" 
                              onClick={() => handleChange("banner_img_url_1", "")} 
                              className="text-red-500 hover:text-red-400 text-[10px] font-bold cursor-pointer"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                        
                        {bioConfig.banner_img_url_1 ? (
                          <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-none">
                            <OptimizedImage src={bioConfig.banner_img_url_1} alt="Banner Desktop" className="w-full h-full object-cover" width={800} />
                          </div>
                        ) : (
                          <div className="w-full aspect-video rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-zinc-500 text-[10px] font-medium bg-black/10">
                            <Sparkles className="w-4 h-4 mb-1 opacity-40 text-[var(--primary-color)]" />
                            Sem banner desktop
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        <label className="w-full gm-btn gm-btn-outline !py-4 gap-1.5 text-xs flex items-center justify-center cursor-pointer border border-[var(--primary-color-60)] hover:border-[var(--primary-color)] hover:bg-[var(--primary-color-10)] transition-all shadow-none">
                          <Upload className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                          <span className="font-bold text-white">Upload</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadBanner(1, false, e)} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Seção Smartphone (Plano de Fundo & Banner Principal) */}
              {selectedView === "smartphone" && (
                <div className="sm:col-span-2 border-t border-white/10 pt-4 mt-2 space-y-4">
                  <div className="space-y-4 fora p-4 sm:p-5 rounded-2xl border border-white/10 shadow-none">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-[var(--primary-color)]" /> Mídias Versão Smartphone (Celular)
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400 barra px-2.5 py-1 rounded-full border border-white/10 shadow-none">
                      Plano de Fundo: <strong className="text-[var(--primary-color)]">1080x1920 px (9:16)</strong> | Banner Principal: <strong className="text-[var(--primary-color)]">1080x900 px (6:5)</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Plano de Fundo Smartphone */}
                    <div className="space-y-2 barra p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between shadow-none">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-zinc-300">Plano de Fundo Smartphone</span>
                          {bioConfig.bg_mobile_image_url && (
                            <button 
                              type="button" 
                              onClick={() => handleChange("bg_mobile_image_url", "")} 
                              className="text-red-500 hover:text-red-400 text-[10px] font-bold cursor-pointer"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                        
                        {bioConfig.bg_mobile_image_url ? (
                          <div className="w-full aspect-[9/16] rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-none">
                            <OptimizedImage src={bioConfig.bg_mobile_image_url} alt="Plano de Fundo Smartphone" className="w-full h-full object-cover" width={240} />
                          </div>
                        ) : (
                          <div className="w-full aspect-[9/16] rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-zinc-500 text-[10px] font-medium bg-black/10">
                            <Smartphone className="w-4 h-4 mb-1 opacity-40 text-[var(--primary-color)]" />
                            Sem plano de fundo smartphone
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        <label className="w-full gm-btn gm-btn-outline !py-4 gap-1.5 text-xs flex items-center justify-center cursor-pointer border border-[var(--primary-color-60)] hover:border-[var(--primary-color)] hover:bg-[var(--primary-color-10)] transition-all shadow-none">
                          <Upload className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                          <span className="font-bold text-white">Upload</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadBg(true, e)} />
                        </label>
                      </div>
                    </div>

                    {/* Banner Smartphone Principal */}
                    <div className="space-y-2 barra p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between shadow-none">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-zinc-300">Banner Smartphone Principal (1080x900 px)</span>
                          {bioConfig.mobile_banner_img_url_1 && (
                            <button 
                              type="button" 
                              onClick={() => handleChange("mobile_banner_img_url_1", "")} 
                              className="text-red-500 hover:text-red-400 text-[10px] font-bold cursor-pointer"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                        
                        {bioConfig.mobile_banner_img_url_1 ? (
                          <div className="w-full aspect-[6/5] rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-none">
                            <OptimizedImage src={bioConfig.mobile_banner_img_url_1} alt="Banner Smartphone" className="w-full h-full object-cover" width={240} />
                          </div>
                        ) : (
                          <div className="w-full aspect-[6/5] rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-zinc-500 text-[10px] font-medium bg-black/10">
                            <Sparkles className="w-4 h-4 mb-1 opacity-40 text-[var(--primary-color)]" />
                            Sem banner smartphone
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        <label className="w-full gm-btn gm-btn-outline !py-4 gap-1.5 text-xs flex items-center justify-center cursor-pointer border border-[var(--primary-color-60)] hover:border-[var(--primary-color)] hover:bg-[var(--primary-color-10)] transition-all shadow-none">
                          <Upload className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                          <span className="font-bold text-white">Upload</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadBanner(1, true, e)} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Toggle Exibir Banners */}
              <div className="sm:col-span-2 border-t border-white/10 pt-4 mt-2 flex items-center justify-between">
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
                    onChange={e => handleChange("show_banners", e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-600 after:border-zinc-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)] peer-checked:after:bg-white peer-checked:after:border-white"></div>
                </label>
              </div>

              {/* Toggle Menu de Texto no Topo */}
              <div className="sm:col-span-2 border-t border-white/10 pt-4 mt-2 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">
                    <List className="w-4 h-4 text-[var(--primary-color)]" /> Menu de Texto no Topo (Início, Sobre, etc.)
                  </span>
                  <p className="text-[11px] text-zinc-400">Por padrão, a barra do topo exibe exclusivamente os ícones dos links cadastrados.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={!!bioConfig.show_nav_links}
                    onChange={e => handleChange("show_nav_links", e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-600 after:border-zinc-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)] peer-checked:after:bg-white peer-checked:after:border-white"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 3. CONTATOS E REDES */}
        {openSections.contacts && (
          <div className="gm-card fora border border-white/10 p-4 sm:p-6 rounded-2xl space-y-5 shadow-none backdrop-blur-md w-full animate-in fade-in duration-300">
            <div className="sticky top-0 z-20 barra py-2 sm:py-2.5 px-3 sm:px-4 border-b border-white/10 flex items-center justify-between mb-3 rounded-xl shadow-none">
              <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-zinc-800 dark:text-white uppercase tracking-wider">
                <Phone className="w-4.5 h-4.5 text-[var(--primary-color)] animate-pulse" />
                CONTATOS E REDES
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-full border border-[var(--primary-color)]/20 shadow-none">
                Edição Ativa
              </span>
            </div>
            
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
          </div>
        )}

        {/* 4. OUTROS LINKS */}
        {openSections.otherLinks && (
          <div className="gm-card fora border border-white/10 p-4 sm:p-6 rounded-2xl space-y-5 shadow-none backdrop-blur-md w-full animate-in fade-in duration-300">
            <div className="sticky top-0 z-20 barra py-2 sm:py-2.5 px-3 sm:px-4 border-b border-white/10 flex items-center justify-between mb-3 rounded-xl shadow-none">
              <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-zinc-800 dark:text-white uppercase tracking-wider">
                <LinkIcon className="w-4.5 h-4.5 text-[var(--primary-color)] animate-pulse" />
                OUTROS LINKS
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-full border border-[var(--primary-color)]/20 shadow-none">
                Edição Ativa
              </span>
            </div>
            
            <div className="animate-in fade-in slide-in-from-top-2 pt-2">
              <div className="flex justify-end mb-4">
                <button 
                  onClick={addCustomLink}
                  className="flex items-center text-[var(--primary-color)] hover:text-[var(--primary-color-hover)] text-sm font-medium bg-[var(--primary-color-10)] px-3 py-1.5 rounded-lg border border-[var(--primary-color-20)] transition-all hover:bg-[var(--primary-color-20)] cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </button>
              </div>
            
            {bioConfig.custom_links.length === 0 ? (
               <div className="text-center py-6 text-zinc-500 text-sm border border-dashed border-white/10 rounded-xl">
                 Nenhum link adicional. Clique em "Adicionar" para inserir links customizados.
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {bioConfig.custom_links.map((link) => {
                   const CurrentIcon = getPlatformIcon(link.platform);
                   return (
                     <div key={link.id} className="p-4 fora rounded-2xl border border-white/10 space-y-3 relative group shadow-none">
                       <button 
                         onClick={() => removeCustomLink(link.id)}
                         className="absolute top-2 right-2 text-zinc-500 hover:text-red-400 p-1 bg-black/30 rounded-full hover:bg-red-500/20 transition-all cursor-pointer"
                       >
                         <Trash className="w-4 h-4" />
                       </button>
                       
                       <div className="grid grid-cols-1 gap-3 pt-2">
                         <div>
                           <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">Ícone & Tipo de Link</label>
                           <div className="relative">
                             <button
                               onClick={() => setIconPickerOpen(iconPickerOpen === link.id ? null : link.id)}
                               className="w-full text-left gm-input flex items-center justify-between !py-2.5 text-sm"
                             >
                               <div className="flex items-center gap-2">
                                 <CurrentIcon className="w-4 h-4 text-[var(--gm-primary)]" />
                                 <span className="text-sm">{platforms.find(p => p.value === link.platform)?.label || 'Link Geral'}</span>
                               </div>
                               <Plus className={`w-4 h-4 transition-transform ${iconPickerOpen === link.id ? 'rotate-45' : ''}`} />
                             </button>
                             
                             {iconPickerOpen === link.id && (
                               <div className="absolute z-20 mt-1 w-full fora border border-white/10 rounded-2xl p-3 shadow-none backdrop-blur-xl">
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
                                         className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-colors cursor-pointer ${link.platform === p.value ? 'bg-[var(--gm-primary)]/10 border-[var(--gm-primary)] text-[var(--gm-primary)]' : 'border-transparent hover:bg-white/5 text-zinc-300'}`}
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
                           <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">Título do Botão</label>
                           <input 
                             type="text" 
                             className="gm-input w-full !py-2.5 text-sm" 
                             value={link.label} 
                             onChange={e => updateCustomLink(link.id, 'label', e.target.value)} 
                             placeholder="Ex: Meu Portfólio"
                           />
                         </div>
                         <div>
                           <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">Subtítulo (opcional)</label>
                           <input 
                             type="text" 
                             className="gm-input w-full !py-2.5 text-sm" 
                             value={link.value || ''} 
                             onChange={e => updateCustomLink(link.id, 'value', e.target.value)} 
                             placeholder="Ex: @gmedificacao"
                           />
                         </div>
                         <div>
                           <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">URL (Link do botão)</label>
                           <input 
                             type="text" 
                             className="gm-input w-full !py-2.5 text-sm font-mono" 
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
            
            <div className="grid grid-cols-1 gap-4 pt-4 border-t border-white/10">
              <div>
                <label className="gm-label">Site Principal URL</label>
                <input type="text" className="gm-input font-mono text-sm" value={bioConfig.website} onChange={e => handleChange("website", e.target.value)} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="gm-label">URL do Portfólio</label>
                  <input type="text" className="gm-input font-mono text-sm" value={bioConfig.portfolio_url} onChange={e => handleChange("portfolio_url", e.target.value)} placeholder="https://seu-portfolio.com" />
                </div>
                <div>
                  <label className="gm-label">URL do Catálogo (PDF ou site)</label>
                  <input type="text" className="gm-input font-mono text-sm" value={bioConfig.catalog_url} onChange={e => handleChange("catalog_url", e.target.value)} placeholder="https://link-do-catalogo.com" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* 5. CATÁLOGO DE PRODUTOS */}
        {openSections.catalog && (
          <div className="gm-card fora border border-white/10 p-4 sm:p-6 rounded-2xl space-y-5 shadow-none backdrop-blur-md w-full animate-in fade-in duration-300">
            <div className="sticky top-0 z-20 barra py-2 sm:py-2.5 px-3 sm:px-4 border-b border-white/10 flex items-center justify-between mb-3 rounded-xl shadow-none">
              <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-zinc-800 dark:text-white uppercase tracking-wider">
                <ShoppingBag className="w-4.5 h-4.5 text-[var(--primary-color)] animate-pulse" />
                CATÁLOGO DE PRODUTOS
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-full border border-[var(--primary-color)]/20 shadow-none">
                Edição Ativa
              </span>
            </div>
            
            <div className="animate-in fade-in slide-in-from-top-2 pt-2 space-y-5">
              {/* Seção Título do Catálogo */}
              <div className="w-full sm:max-w-sm">
                <label className="gm-label">Título da Seção de Catálogo</label>
                <input type="text" className="gm-input" value={bioConfig.catalog_title || 'Catálogo'} onChange={e => handleChange("catalog_title", e.target.value)} placeholder="Ex: Meus Produtos" />
              </div>

              {/* TABS DE CONTROLE DO CATÁLOGO */}
              <div className="flex border-b border-white/10 gap-1 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setCatalogTab('list')}
                  className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                    catalogTab === 'list' 
                      ? 'border-[var(--primary-color)] text-[var(--primary-color)] bg-[var(--primary-color)]/5' 
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
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
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Cadastrar Novo
                </button>
                <label 
                  className="px-3 py-1.5 my-auto text-xs font-bold border rounded-xl border-white/10 hover:border-[var(--primary-color)] text-zinc-300 hover:text-white bg-black/40 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-none hover:bg-[var(--primary-color)]/20"
                  title="Envie até 5 fotos para criar produtos rápidos de uma vez"
                >
                  <Upload className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                  <span>Subir até 5 fotos</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleUploadMultipleCatalogBatch} />
                </label>
                <button
                  type="button"
                  onClick={() => setCatalogTab('trash')}
                  className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ml-auto ${
                    catalogTab === 'trash' 
                      ? 'border-red-500 text-red-400 bg-red-500/5' 
                      : 'border-transparent text-zinc-400 hover:text-red-400/80'
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
                    <div className="text-center py-10 text-zinc-500 text-sm border border-dashed border-white/10 rounded-2xl space-y-3">
                      <ShoppingBag className="w-12 h-12 opacity-30 mx-auto text-[var(--primary-color)]" />
                      <p className="font-medium text-zinc-400">Nenhum produto cadastrado no momento.</p>
                      <button 
                        type="button"
                        onClick={() => setCatalogTab('add')}
                        className="text-xs bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] text-white px-4 py-2 rounded-xl font-bold transition-all shadow-none cursor-pointer"
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
                            className="fora rounded-2xl border border-white/10 overflow-hidden transition-all duration-200 shadow-none"
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
                              className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 select-none transition-colors"
                            >
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                {firstImage ? (
                                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden p-0.5 shrink-0 shadow-none">
                                    <OptimizedImage 
                                      src={firstImage} 
                                      alt={item.name} 
                                      className="max-w-full max-h-full object-contain" 
                                      width={80}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-black/20 border border-white/10 flex items-center justify-center text-zinc-600 shrink-0">
                                    <ShoppingBag className="w-5 h-5 opacity-40" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1 pr-2">
                                  <h4 className="font-bold text-sm text-zinc-200 truncate">{item.name || <span className="italic text-zinc-500 font-normal">Sem Nome</span>}</h4>
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
                                  className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-xl transition-all mr-1 cursor-pointer"
                                  title="Mover para lixeira"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                                
                                {/* EXPANSION INDICATOR */}
                                <div className="text-zinc-400 hover:text-zinc-200 p-2 rounded-xl">
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
                              <div className="p-4 sm:p-5 barra border-t border-white/10 space-y-5 animate-in fade-in duration-200 shadow-none">
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">Nome do Produto/Serviço</label>
                                    <input 
                                      type="text" 
                                      className="gm-input w-full !py-2.5 font-medium text-sm" 
                                      value={item.name} 
                                      onChange={e => updateCatalogItem(item.id, 'name', e.target.value)} 
                                      placeholder="Ex: Tênis Nike Air"
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">Preço (opcional)</label>
                                      <input 
                                        type="text" 
                                        className="gm-input w-full !py-2.5 text-[var(--primary-color)] font-mono font-bold text-sm" 
                                        value={item.price} 
                                        onChange={e => updateCatalogItem(item.id, 'price', formatBRL(e.target.value))} 
                                        placeholder="R$ 0,00"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">Link Direto (WhatsApp/Compra)</label>
                                      <input 
                                        type="text" 
                                        className="gm-input w-full !py-2.5 text-sm font-mono" 
                                        value={item.url} 
                                        onChange={e => updateCatalogItem(item.id, 'url', e.target.value)} 
                                        placeholder="Opcional. Link para ir ao clicar"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">Descrição do Produto</label>
                                    <textarea 
                                      className="gm-input w-full !py-2.5 min-h-[100px] resize-y text-sm" 
                                      value={item.description || ''} 
                                      onChange={e => updateCatalogItem(item.id, 'description', e.target.value)}
                                      placeholder="Ex: Tênis em couro, ótimo para corridas."
                                    />
                                  </div>

                                  {/* CADASTRO POR QUANTIDADE / VARIAÇÕES */}
                                  <div className="border-t border-white/10 pt-4 mt-2">
                                    <div className="flex items-center justify-between mb-3">
                                      <label className="text-sm font-extrabold text-zinc-300 block tracking-wide uppercase">Cadastro por Quantidade / Variações</label>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentOptions = item.options || [];
                                          const updatedOptions = [...currentOptions, { id: Date.now().toString(), quantity: '', price: '' }];
                                          updateCatalogItem(item.id, 'options', updatedOptions);
                                        }}
                                        className="text-xs text-[var(--primary-color)] hover:text-[var(--primary-color-hover)] flex items-center font-bold bg-[var(--primary-color-10)] hover:bg-[var(--primary-color-20)] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Opção
                                      </button>
                                    </div>
                                    
                                    {(item.options || []).length > 0 ? (
                                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                                        {(item.options || []).map((opt: any, optIdx: number) => (
                                          <div key={opt.id || optIdx} className="flex gap-2 items-center w-full">
                                            <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
                                              <input
                                                type="text"
                                                placeholder="Ex: 500 UND"
                                                className="gm-input w-full !py-2 text-sm font-semibold pl-3"
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
                                                className="gm-input w-full !py-2 text-sm text-[var(--primary-color)] font-mono font-bold pl-3"
                                                value={opt.price}
                                                onChange={e => {
                                                  const updated = (item.options || []).map((o: any, idx: number) => 
                                                    idx === optIdx ? { ...o, price: formatBRL(e.target.value) } : o
                                                  );
                                                  updateCatalogItem(item.id, 'options', updated);
                                                }}
                                              />
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updated = (item.options || []).filter((_: any, idx: number) => idx !== optIdx);
                                                updateCatalogItem(item.id, 'options', updated);
                                              }}
                                              className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-lg transition-all shrink-0 cursor-pointer"
                                              title="Remover Opção"
                                            >
                                              <Trash className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-zinc-500 leading-normal">Se o seu produto tem preços que variam por quantidade (ex: 250, 500, 1000 cartões), adicione as opções acima. Caso contrário, use apenas o preço fixo padrão.</p>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-4 border-t border-white/10 pt-5">
                                  <div className="font-sans space-y-3">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <label className="text-sm font-bold text-zinc-300 block">Fotos do Produto (Máximo 8)</label>
                                      <div className="flex items-center gap-2">
                                        <label 
                                          className="text-xs bg-black/40 hover:bg-[var(--primary-color)] text-white px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 border border-white/15 transition-colors font-bold shadow-none hover:bg-[var(--primary-color)]/20"
                                          title="Envie até 5 fotos de uma vez"
                                        >
                                          <Upload className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                                          <span>Subir até 5 fotos</span>
                                          <input 
                                            type="file" 
                                            multiple 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={(e) => handleUploadMultipleProductImages(item.id, e)} 
                                          />
                                        </label>
                                        {((item.images || (item.image_url ? [item.image_url] : [""])).length < 8) && (
                                          <button 
                                            type="button"
                                            onClick={() => addCatalogItemImageSlot(item.id)}
                                            className="text-xs text-[var(--primary-color)] hover:text-[var(--primary-color-hover)] flex items-center font-semibold bg-[var(--primary-color-10)] hover:bg-[var(--primary-color-20)] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                                          >
                                            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Foto
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {(item.images || (item.image_url ? [item.image_url] : [""])).map((imgUrl, idx) => (
                                        <div key={idx} className="fora p-4 rounded-2xl border border-white/10 space-y-4 flex flex-col justify-between shadow-none">
                                          {/* 1. FOTO MINIATURA */}
                                          <div className="flex items-center gap-3.5">
                                            {imgUrl ? (
                                              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden border border-white/10 bg-black/40 shrink-0 group/img shadow-none flex items-center justify-center p-1">
                                                <OptimizedImage 
                                                  src={imgUrl} 
                                                  alt={"Foto " + (idx + 1)} 
                                                  className="max-w-full max-h-full object-contain" 
                                                  width={200}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => removeCatalogItemImage(item.id, idx)}
                                                  className="absolute top-1 right-1 bg-black/85 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors cursor-pointer"
                                                  title="Remover Foto"
                                                >
                                                  <X className="w-2.5 h-2.5" />
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center bg-black/40 text-zinc-600 shrink-0">
                                                <ShoppingBag className="w-8 h-8 opacity-45 text-[var(--primary-color)]" />
                                              </div>
                                            )}
                                            <div className="space-y-0.5">
                                              <p className="text-sm font-black text-zinc-200">Foto {idx + 1} de 8</p>
                                              <p className="text-xs text-zinc-400 font-medium">
                                                {imgUrl ? "⚡ Miniatura carregada" : "⚠️ Nenhuma imagem vinculada"}
                                              </p>
                                            </div>
                                          </div>
                                          
                                          {/* 2. ÁREA LINK WEB IMAGEM */}
                                          <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-zinc-500 tracking-wider block">Link Web da Imagem</label>
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
                                            <label className="gm-btn gm-btn-outline w-full px-3 py-2.5 text-xs flex items-center justify-center cursor-pointer gap-1.5 hover:bg-[var(--primary-color)]/15 border border-white/10 shadow-none">
                                              <Upload className="w-4 h-4" />
                                              <span className="font-bold">Upload</span>
                                              <input 
                                                type="file" 
                                                multiple
                                                accept="image/*,video/mp4"
                                                className="hidden" 
                                                onChange={(e) => handleUploadProductImageAtIndex(item.id, idx, e)} 
                                              />
                                            </label>
                                            <button
                                              type="button"
                                              onClick={() => removeCatalogItemImage(item.id, idx)}
                                              className="gm-btn w-full border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 px-3 py-2.5 text-xs flex items-center justify-center gap-1.5 shadow-none cursor-pointer"
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
                <div className="fora p-4 sm:p-5 rounded-2xl border border-white/10 space-y-5 animate-in fade-in duration-200 shadow-none">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h3 className="text-sm font-extrabold text-zinc-200 flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-[var(--primary-color)]" />
                      Novo Cadastro de Produto
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">Nome do Produto/Serviço *</label>
                      <input 
                        type="text" 
                        className="gm-input w-full !py-2.5 font-medium text-sm" 
                        value={newProduct.name} 
                        onChange={e => setNewProduct(prev => ({ ...prev, name: e.target.value }))} 
                        placeholder="Ex: Tênis Nike Air"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">Preço (opcional)</label>
                        <input 
                          type="text" 
                          className="gm-input w-full !py-2.5 text-[var(--primary-color)] font-mono font-bold text-sm" 
                          value={newProduct.price} 
                          onChange={e => setNewProduct(prev => ({ ...prev, price: formatBRL(e.target.value) }))} 
                          placeholder="R$ 0,00"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">Link Direto (WhatsApp/Compra)</label>
                        <input 
                          type="text" 
                          className="gm-input w-full !py-2.5 text-sm font-mono" 
                          value={newProduct.url} 
                          onChange={e => setNewProduct(prev => ({ ...prev, url: e.target.value }))} 
                          placeholder="Opcional. Link para ir ao clicar"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">Descrição do Produto</label>
                      <textarea 
                        className="gm-input w-full !py-2.5 min-h-[100px] resize-y text-sm" 
                        value={newProduct.description} 
                        onChange={e => setNewProduct(prev => ({ ...prev, description: e.target.value }))} 
                        placeholder="Ex: Tênis em couro, ótimo para corridas."
                      />
                    </div>

                    {/* CADASTRO POR QUANTIDADE / VARIAÇÕES (DRAFT FORM) */}
                    <div className="border-t border-white/10 pt-4 mt-2">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-extrabold text-zinc-300 block tracking-wide uppercase">Cadastro por Quantidade / Variações</label>
                        <button
                          type="button"
                          onClick={addNewProductOption}
                          className="text-xs text-[var(--primary-color)] hover:text-[var(--primary-color-hover)] flex items-center font-bold bg-[var(--primary-color-10)] hover:bg-[var(--primary-color-20)] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add Opção
                        </button>
                      </div>
                      
                      {(newProduct.options || []).length > 0 ? (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                          {newProduct.options.map((opt: any, optIdx: number) => (
                            <div key={opt.id || optIdx} className="flex gap-2 items-center w-full">
                              <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
                                <input
                                  type="text"
                                  placeholder="Ex: 500 UND"
                                  className="gm-input w-full !py-2 text-sm font-semibold pl-3"
                                  value={opt.quantity}
                                  onChange={e => updateNewProductOption(optIdx, 'quantity', e.target.value)}
                                />
                                <input
                                  type="text"
                                  placeholder="R$ 0,00"
                                  className="gm-input w-full !py-2 text-sm text-[var(--primary-color)] font-mono font-bold pl-3"
                                  value={opt.price}
                                  onChange={e => updateNewProductOption(optIdx, 'price', formatBRL(e.target.value))}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeNewProductOption(optIdx)}
                                className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-lg transition-all shrink-0 cursor-pointer"
                                title="Remover Opção"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-zinc-500 leading-normal">Se o seu produto tem preços que variam por quantidade (ex: 250, 500, 1000 cartões), adicione as opções acima. Caso contrário, use apenas o preço fixo padrão.</p>
                      )}
                    </div>

                    {/* FOTOS DO NOVO PRODUTO */}
                    <div className="space-y-4 border-t border-white/10 pt-5">
                      <div className="font-sans space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <label className="text-sm font-bold text-zinc-300 block">Fotos do Produto (Máximo 8)</label>
                          <div className="flex items-center gap-2">
                            <label 
                              className="text-xs bg-black/40 hover:bg-[var(--primary-color)] text-white px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 border border-white/15 transition-colors font-bold shadow-none hover:bg-[var(--primary-color)]/20"
                              title="Envie até 5 fotos de uma vez"
                            >
                              <Upload className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                              <span>Subir até 5 fotos</span>
                              <input 
                                type="file" 
                                multiple 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleUploadMultipleNewProductImages(e)} 
                              />
                            </label>
                            {newProduct.images.length < 8 && (
                              <button 
                                type="button"
                                onClick={addNewProductImageSlot}
                                className="text-xs text-[var(--primary-color)] hover:text-[var(--primary-color-hover)] flex items-center font-semibold bg-[var(--primary-color-10)] hover:bg-[var(--primary-color-20)] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Foto
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {newProduct.images.map((imgUrl, idx) => (
                            <div key={idx} className="barra p-4 rounded-2xl border border-white/10 space-y-4 flex flex-col justify-between shadow-none">
                              {/* 1. FOTO MINIATURA */}
                              <div className="flex items-center gap-3.5">
                                {imgUrl ? (
                                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden border border-white/10 bg-black/40 shrink-0 group/img shadow-none flex items-center justify-center p-1">
                                    <OptimizedImage 
                                      src={imgUrl} 
                                      alt={"Foto " + (idx + 1)} 
                                      className="max-w-full max-h-full object-contain" 
                                      width={200}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeNewProductImageSlot(idx)}
                                      className="absolute top-1 right-1 bg-black/85 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors cursor-pointer"
                                      title="Remover Foto"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center bg-black/40 text-zinc-600 shrink-0">
                                    <ShoppingBag className="w-8 h-8 opacity-45 text-[var(--primary-color)]" />
                                  </div>
                                )}
                                <div className="space-y-0.5">
                                  <p className="text-sm font-black text-zinc-200">Foto {idx + 1} de 8</p>
                                  <p className="text-xs text-zinc-400 font-medium">
                                    {imgUrl ? "⚡ Miniatura carregada" : "⚠️ Nenhuma imagem vinculada"}
                                  </p>
                                </div>
                              </div>
                              
                              {/* 2. ÁREA LINK WEB IMAGEM */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-500 tracking-wider block">Link Web da Imagem</label>
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
                                <label className="gm-btn gm-btn-outline w-full px-3 py-2.5 text-xs flex items-center justify-center cursor-pointer gap-1.5 hover:bg-[var(--primary-color)]/15 border border-white/10 shadow-none">
                                  <Upload className="w-4 h-4" />
                                  <span className="font-bold">Upload</span>
                                  <input 
                                    type="file" 
                                    multiple
                                    accept="image/*,video/mp4"
                                    className="hidden" 
                                    onChange={(e) => handleUploadNewProductImageAtIndex(idx, e)} 
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeNewProductImageSlot(idx)}
                                  className="gm-btn w-full border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 px-3 py-2.5 text-xs flex items-center justify-center gap-1.5 shadow-none cursor-pointer"
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

                    <div className="pt-4 border-t border-white/10 flex justify-end">
                      <button
                        type="button"
                        onClick={handleCreateProduct}
                        className="bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-none flex items-center gap-2 cursor-pointer"
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
                <div className="fora p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4 animate-in fade-in duration-200 shadow-none">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h3 className="text-xs font-extrabold text-zinc-200 flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-400" />
                      Lixeira de Produtos
                    </h3>
                    {deletedCatalogItems.length > 0 && (
                      <button
                        type="button"
                        onClick={clearTrash}
                        className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-none"
                      >
                        Esvaziar Lixeira
                      </button>
                    )}
                  </div>

                  {deletedCatalogItems.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 text-sm border border-dashed border-white/10 rounded-2xl space-y-2">
                      <Trash2 className="w-10 h-10 opacity-20 mx-auto text-zinc-400" />
                      <p>A lixeira está vazia.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/10">
                      {deletedCatalogItems.map((item, idx) => (
                        <div key={item.id || idx} className="py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-zinc-300 truncate">{item.name || 'Sem Nome'}</h4>
                            <p className="text-xs text-zinc-500 font-mono mt-0.5">{item.price || 'Sem Preço'}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => restoreCatalogItem(item.id)}
                              className="text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-none"
                              title="Restaurar item"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restaurar
                            </button>
                            <button
                              type="button"
                              onClick={() => permanentlyDeleteCatalogItem(item.id)}
                              className="text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-none"
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

        {/* 6. PORTFÓLIO */}
        {openSections.portfolio && (
          <div className="gm-card fora border border-white/10 p-4 sm:p-6 rounded-2xl space-y-5 shadow-none backdrop-blur-md w-full animate-in fade-in duration-300">
            <div className="sticky top-0 z-20 barra py-2 sm:py-2.5 px-3 sm:px-4 border-b border-white/10 flex items-center justify-between mb-3 rounded-xl shadow-none">
              <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-zinc-800 dark:text-white uppercase tracking-wider">
                <Layout className="w-4.5 h-4.5 text-[var(--primary-color)] animate-pulse" />
                PORTFÓLIO
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-full border border-[var(--primary-color)]/20 shadow-none">
                Edição Ativa
              </span>
            </div>
            
            <div className="animate-in fade-in slide-in-from-top-2 pt-2 space-y-5">
              {/* Seção Título do Portfólio */}
              <div className="w-full sm:max-w-sm">
                <label className="gm-label">Título da Seção</label>
                <input type="text" className="gm-input" value={bioConfig.portfolio_title || 'Portfólio'} onChange={e => handleChange("portfolio_title", e.target.value)} placeholder="Ex: Meu Portfólio" />
              </div>

              {/* UPLOAD E LISTA DE ITENS */}
              <div className="space-y-4 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mt-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setActivePortfolioTab("active")}
                      className={`text-sm font-bold pb-2 border-b-2 transition-colors cursor-pointer ${activePortfolioTab === "active" ? "border-[var(--primary-color)] text-white" : "border-transparent text-zinc-400 hover:text-zinc-300"}`}
                    >
                      Portfólios Ativos
                    </button>
                    <button
                      onClick={() => setActivePortfolioTab("trash")}
                      className={`text-sm font-bold pb-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${activePortfolioTab === "trash" ? "border-red-500 text-red-400" : "border-transparent text-zinc-400 hover:text-red-400"}`}
                    >
                      <Trash2 className="w-4 h-4" />
                      Lixeira ({deletedPortfolioItems.length})
                    </button>
                  </div>
                  
                  {activePortfolioTab === "active" && (
                    <div className="flex items-center gap-2">
                      <label 
                        className="gm-btn gm-btn-outline px-3 py-1.5 text-[10px] flex items-center justify-center cursor-pointer hover:bg-[var(--primary-color)] hover:text-white transition-colors border border-white/10 shadow-none gap-1"
                        title="Envie até 5 fotos para criar portfólios de uma vez"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir até 5 fotos</span>
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleUploadMultiplePortfolioProjects} />
                      </label>
                      <button 
                        onClick={handleAddPortfolioCollection}
                        className="gm-btn gm-btn-outline px-3 py-1.5 text-[10px] flex items-center justify-center cursor-pointer hover:bg-[var(--primary-color)] hover:text-white transition-colors border border-white/10 shadow-none"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <span>Novo Portfólio</span>
                      </button>
                    </div>
                  )}
                </div>
                
                {activePortfolioTab === "active" ? (
                  <div className="space-y-4">
                    {(() => {
                      const current = bioConfig.portfolio_items || [];
                      const normalized = current.map((p: any) => p.image_url && !p.layers ? { id: p.id, title: 'Portfólio ' + p.id.slice(-3), layers: [{ id: Date.now().toString() + Math.random(), image_url: p.image_url }] } : p);
                      
                      const hasActivePortfolioItem = normalized.some((item: any) => expandedPortfolioItems.includes(item.id));
                      const activePortfolioItem = normalized.find((item: any) => expandedPortfolioItems.includes(item.id));

                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {/* BOTÃO SOBRE SUA EMPRESA */}
                            <div 
                              onClick={() => {
                                setIsAboutExpanded(!isAboutExpanded);
                                setExpandedPortfolioItems([]);
                              }}
                              className={`relative flex items-center justify-between pl-7 pr-3 py-[10px] rounded-xl border text-left transition-all duration-200 cursor-pointer text-xs sm:text-sm font-medium select-none shadow-none ${
                                isAboutExpanded 
                                  ? 'bg-[var(--primary-color)]/10 border-[var(--primary-color)]/30 text-white' 
                                  : 'fora border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              {isAboutExpanded && (
                                <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--primary-color)] rounded-full" />
                              )}
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <Layout className={`w-4 h-4 transition-transform duration-200 ${isAboutExpanded ? 'text-[var(--primary-color)] scale-110' : 'text-zinc-400'}`} />
                                <span className="font-bold uppercase tracking-wider text-zinc-200 truncate text-[11px] sm:text-xs">Sobre sua empresa</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase shadow-none ${bioConfig.show_about !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>
                                  {bioConfig.show_about !== false ? 'Ativo' : 'Oculto'}
                                </span>
                                {isAboutExpanded && (
                                  <span className="text-[8px] text-zinc-400 bg-black/40 px-1.5 py-0.5 rounded border border-white/10 uppercase tracking-wide font-bold animate-pulse">ABERTO</span>
                                )}
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isAboutExpanded ? 'text-[var(--primary-color)] rotate-180' : 'text-zinc-500'}`} />
                              </div>
                            </div>

                            {/* ITENS DE PORTFÓLIO */}
                            {normalized.map((item: any) => {
                              const isExpanded = expandedPortfolioItems.includes(item.id);
                              const displayTitle = selectedView === "smartphone" 
                                ? (item.title_mobile !== undefined ? item.title_mobile : (item.title || 'Portfólio Sem Nome'))
                                : (item.title || 'Portfólio Sem Nome');

                              return (
                                <div 
                                  key={item.id}
                                  onClick={() => {
                                    setIsAboutExpanded(false);
                                    setExpandedPortfolioItems(prev => 
                                      prev.includes(item.id) ? [] : [item.id]
                                    );
                                  }}
                                  className={`relative flex items-center justify-between pl-7 pr-3 py-[10px] rounded-xl border text-left transition-all duration-200 cursor-pointer text-xs sm:text-sm font-medium select-none shadow-none ${
                                    isExpanded 
                                      ? 'bg-[var(--primary-color)]/10 border-[var(--primary-color)]/30 text-white' 
                                      : 'fora border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
                                  }`}
                                >
                                  {isExpanded && (
                                    <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3.5px] h-[16px] bg-[var(--primary-color)] rounded-full" />
                                  )}
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    {selectedView === "smartphone" ? (
                                      <Smartphone className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'text-[var(--primary-color)] scale-110' : 'text-zinc-400'}`} />
                                    ) : (
                                      <Monitor className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'text-[var(--primary-color)] scale-110' : 'text-zinc-400'}`} />
                                    )}
                                    <span className="font-bold uppercase tracking-wider text-zinc-200 truncate text-[11px] sm:text-xs">{displayTitle || "Sem título"}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemovePortfolioCollection(item.id);
                                      }}
                                      className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                                      title="Excluir Portfólio (Move para Lixeira)"
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                    </button>
                                    {isExpanded && (
                                      <span className="text-[8px] text-zinc-400 bg-black/40 px-1.5 py-0.5 rounded border border-white/10 uppercase tracking-wide font-bold animate-pulse">ABERTO</span>
                                    )}
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'text-[var(--primary-color)] rotate-180' : 'text-zinc-500'}`} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* MENSAGEM SE NÃO HOUVER PORTFÓLIOS */}
                          {normalized.length === 0 && !isAboutExpanded && (
                            <div className="py-8 text-center text-zinc-500 text-xs border border-dashed border-white/10 rounded-2xl fora">
                              Nenhum portfólio criado ainda. Clique em "+ Novo Portfólio" acima para criar o seu primeiro projeto.
                            </div>
                          )}

                          {/* EDITOR SOBRE SUA EMPRESA */}
                          {isAboutExpanded && (
                            <div className="p-4 sm:p-6 space-y-6 fora border border-white/10 rounded-2xl animate-in fade-in duration-200 text-zinc-300 shadow-none">
                              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <span className="flex items-center gap-2 text-sm font-extrabold text-white uppercase tracking-wider">
                                  <Layout className="w-4.5 h-4.5 text-[var(--primary-color)]" />
                                  Sobre Sua Empresa
                                </span>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="checkbox" 
                                    id="show_about" 
                                    checked={bioConfig.show_about !== false} 
                                    onChange={e => handleChange("show_about", e.target.checked)}
                                    className="w-4 h-4 rounded text-[var(--primary-color)] bg-black/40 border-white/10 focus:ring-0 cursor-pointer" 
                                  />
                                  <label htmlFor="show_about" className="text-xs font-bold text-white cursor-pointer select-none">Exibir no site</label>
                                </div>
                              </div>

                              {bioConfig.show_about !== false && (
                                <div className="space-y-5 animate-in fade-in duration-200">
                                  {/* Conteúdo da Seção */}
                                  <div className="space-y-6">
                                    <div>
                                      <label className="gm-label font-bold text-xs mb-1.5 block">Título Principal</label>
                                      <input 
                                        type="text" 
                                        className={`gm-input transition-all ${(bioConfig.about_title_align || "center") === "left" ? "text-left" : (bioConfig.about_title_align || "center") === "right" ? "text-right" : "text-center"} ${(bioConfig.about_title_bold !== false) ? "font-bold" : "font-medium"} ${(bioConfig.about_title_italic) ? "italic" : "not-italic"} ${getFontSizeClass(bioConfig.about_title_size || "30 pt")} bio-desc-font-${bioConfig.about_title_font || "funnel"}`}
                                        value={bioConfig.about_title || ''} 
                                        onChange={e => handleChange("about_title", e.target.value)} 
                                        placeholder="Sobre a nossa empresa" 
                                      />
                                      <div className="flex flex-wrap items-center gap-2 barra p-2 rounded-xl border border-white/10 mt-2 shadow-none">
                                        <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-white/10 shadow-none">
                                          <button type="button" onClick={() => handleChange("about_title_align", "left")} className={`p-1.5 rounded-md transition-colors ${(bioConfig.about_title_align || 'center') === 'left' ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><AlignLeft className="w-4 h-4" /></button>
                                          <button type="button" onClick={() => handleChange("about_title_align", "center")} className={`p-1.5 rounded-md transition-colors ${(bioConfig.about_title_align || 'center') === 'center' ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><AlignCenter className="w-4 h-4" /></button>
                                          <button type="button" onClick={() => handleChange("about_title_align", "right")} className={`p-1.5 rounded-md transition-colors ${(bioConfig.about_title_align || 'center') === 'right' ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><AlignRight className="w-4 h-4" /></button>
                                        </div>
                                        <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-white/10 shadow-none">
                                          <button type="button" onClick={() => handleChange("about_title_bold", !bioConfig.about_title_bold)} className={`p-1.5 rounded-md transition-colors ${bioConfig.about_title_bold ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><Bold className="w-4 h-4 font-bold" /></button>
                                          <button type="button" onClick={() => handleChange("about_title_italic", !bioConfig.about_title_italic)} className={`p-1.5 rounded-md transition-colors ${bioConfig.about_title_italic ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><Italic className="w-4 h-4 italic" /></button>
                                        </div>
                                        <div className="flex-1 min-w-[140px]">
                                          <select className="gm-input !h-8 !py-0 !px-2 text-xs font-semibold rounded-lg bg-black/30 border border-white/10 text-zinc-300 w-full" value={bioConfig.about_title_font || "funnel"} onChange={e => handleChange("about_title_font", e.target.value)}>
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
                                          <select className="gm-input !h-8 !py-0 !px-2 text-xs font-semibold rounded-lg bg-black/30 border border-white/10 text-zinc-300 w-full" value={bioConfig.about_title_size || "30 pt"} onChange={e => handleChange("about_title_size", e.target.value)}>
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

                                    <div>
                                      <label className="gm-label font-bold text-xs mb-1.5 block">Texto / Descrição Principal</label>
                                      <textarea 
                                        className={`gm-input min-h-[100px] !py-2 resize-y transition-all ${(bioConfig.about_desc_align || "center") === "left" ? "text-left" : (bioConfig.about_desc_align || "center") === "right" ? "text-right" : "text-center"} ${bioConfig.about_desc_bold ? "font-bold" : "font-normal"} ${bioConfig.about_desc_italic ? "italic" : "not-italic"} ${getFontSizeClass(bioConfig.about_desc_size || "16 pt")} bio-desc-font-${bioConfig.about_desc_font || "ui"}`}
                                        value={bioConfig.about_description || ''} 
                                        onChange={e => handleChange("about_description", e.target.value)} 
                                        placeholder="Acreditamos que o design é mais do que aparência..." 
                                      />
                                      <div className="flex flex-wrap items-center gap-2 barra p-2 rounded-xl border border-white/10 mt-2 shadow-none">
                                        <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-white/10 shadow-none">
                                          <button type="button" onClick={() => handleChange("about_desc_align", "left")} className={`p-1.5 rounded-md transition-colors ${(bioConfig.about_desc_align || 'center') === 'left' ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><AlignLeft className="w-4 h-4" /></button>
                                          <button type="button" onClick={() => handleChange("about_desc_align", "center")} className={`p-1.5 rounded-md transition-colors ${(bioConfig.about_desc_align || 'center') === 'center' ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><AlignCenter className="w-4 h-4" /></button>
                                          <button type="button" onClick={() => handleChange("about_desc_align", "right")} className={`p-1.5 rounded-md transition-colors ${(bioConfig.about_desc_align || 'center') === 'right' ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><AlignRight className="w-4 h-4" /></button>
                                        </div>
                                        <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-white/10 shadow-none">
                                          <button type="button" onClick={() => handleChange("about_desc_bold", !bioConfig.about_desc_bold)} className={`p-1.5 rounded-md transition-colors ${bioConfig.about_desc_bold ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><Bold className="w-4 h-4 font-bold" /></button>
                                          <button type="button" onClick={() => handleChange("about_desc_italic", !bioConfig.about_desc_italic)} className={`p-1.5 rounded-md transition-colors ${bioConfig.about_desc_italic ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><Italic className="w-4 h-4 italic" /></button>
                                        </div>
                                        <div className="flex-1 min-w-[140px]">
                                          <select className="gm-input !h-8 !py-0 !px-2 text-xs font-semibold rounded-lg bg-black/30 border border-white/10 text-zinc-300 w-full" value={bioConfig.about_desc_font || "ui"} onChange={e => handleChange("about_desc_font", e.target.value)}>
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
                                          <select className="gm-input !h-8 !py-0 !px-2 text-xs font-semibold rounded-lg bg-black/30 border border-white/10 text-zinc-300 w-full" value={bioConfig.about_desc_size || "16 pt"} onChange={e => handleChange("about_desc_size", e.target.value)}>
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

                                    <div>
                                      <label className="gm-label font-bold text-xs mb-1.5 block">Texto de Destaque Inferior (Negrito)</label>
                                      <input 
                                        type="text" 
                                        className={`gm-input transition-all ${(bioConfig.about_highlight_align || "center") === "left" ? "text-left" : (bioConfig.about_highlight_align || "center") === "right" ? "text-right" : "text-center"} ${(bioConfig.about_highlight_bold !== false) ? "font-bold" : "font-medium"} ${(bioConfig.about_highlight_italic) ? "italic" : "not-italic"} ${getFontSizeClass(bioConfig.about_highlight_size || "16 pt")} bio-desc-font-${bioConfig.about_highlight_font || "ui"}`}
                                        value={bioConfig.about_highlight || ''} 
                                        onChange={e => handleChange("about_highlight", e.target.value)} 
                                        placeholder="Comece sua jornada conosco. Vamos criar algo inesquecível." 
                                      />
                                      <div className="flex flex-wrap items-center gap-2 barra p-2 rounded-xl border border-white/10 mt-2 shadow-none">
                                        <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-white/10 shadow-none">
                                          <button type="button" onClick={() => handleChange("about_highlight_align", "left")} className={`p-1.5 rounded-md transition-colors ${(bioConfig.about_highlight_align || 'center') === 'left' ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><AlignLeft className="w-4 h-4" /></button>
                                          <button type="button" onClick={() => handleChange("about_highlight_align", "center")} className={`p-1.5 rounded-md transition-colors ${(bioConfig.about_highlight_align || 'center') === 'center' ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><AlignCenter className="w-4 h-4" /></button>
                                          <button type="button" onClick={() => handleChange("about_highlight_align", "right")} className={`p-1.5 rounded-md transition-colors ${(bioConfig.about_highlight_align || 'center') === 'right' ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><AlignRight className="w-4 h-4" /></button>
                                        </div>
                                        <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-white/10 shadow-none">
                                          <button type="button" onClick={() => handleChange("about_highlight_bold", !bioConfig.about_highlight_bold)} className={`p-1.5 rounded-md transition-colors ${bioConfig.about_highlight_bold ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><Bold className="w-4 h-4 font-bold" /></button>
                                          <button type="button" onClick={() => handleChange("about_highlight_italic", !bioConfig.about_highlight_italic)} className={`p-1.5 rounded-md transition-colors ${bioConfig.about_highlight_italic ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><Italic className="w-4 h-4 italic" /></button>
                                        </div>
                                        <div className="flex-1 min-w-[140px]">
                                          <select className="gm-input !h-8 !py-0 !px-2 text-xs font-semibold rounded-lg bg-black/30 border border-white/10 text-zinc-300 w-full" value={bioConfig.about_highlight_font || "ui"} onChange={e => handleChange("about_highlight_font", e.target.value)}>
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
                                          <select className="gm-input !h-8 !py-0 !px-2 text-xs font-semibold rounded-lg bg-black/30 border border-white/10 text-zinc-300 w-full" value={bioConfig.about_highlight_size || "16 pt"} onChange={e => handleChange("about_highlight_size", e.target.value)}>
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
                                  </div>

                                  {/* Botão de Ação */}
                                  <div className="space-y-3 pt-3 border-t border-white/10">
                                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                      <Phone className="w-3.5 h-3.5 text-[var(--primary-color)]" /> Botão Fale Conosco (WhatsApp)
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <label className="gm-label font-semibold text-[11px]">Texto do Botão</label>
                                        <input 
                                          type="text" 
                                          className="gm-input font-medium !py-2" 
                                          value={bioConfig.about_btn_text || 'Fale Conosco'} 
                                          onChange={e => handleChange("about_btn_text", e.target.value)} 
                                          placeholder="Fale Conosco" 
                                        />
                                      </div>
                                      <div>
                                        <label className="gm-label font-semibold text-[11px]">Link Personalizado do WhatsApp (Opcional)</label>
                                        <input 
                                          type="text" 
                                          className="gm-input font-medium text-xs !py-2" 
                                          value={bioConfig.about_btn_link || ''} 
                                          onChange={e => handleChange("about_btn_link", e.target.value)} 
                                          placeholder="Ex: https://wa.me/5511999999999" 
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {!isAboutExpanded && hasActivePortfolioItem && activePortfolioItem && (() => {
                            const item = activePortfolioItem;
                            return (
                              <div className="p-4 sm:p-6 space-y-6 fora border border-white/10 rounded-2xl animate-in fade-in duration-200 shadow-none">
                                {selectedView === "smartphone" ? (
                                  <>
                                    {/* Versão Smartphone do Portfólio */}
                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                      <div className="flex-1 w-full">
                                        <label className="gm-label mb-1 text-xs text-[var(--primary-color)] flex items-center gap-1.5 font-bold tracking-wider">
                                          <Smartphone className="w-3.5 h-3.5" /> Título Smartphone
                                        </label>
                                        <input 
                                          type="text" 
                                          className="bg-transparent text-white font-bold text-sm sm:text-base outline-none border-b border-transparent focus:border-white/20 pb-1 w-full"
                                          value={item.title_mobile !== undefined ? item.title_mobile : (item.title || '')}
                                          onChange={e => handleUpdatePortfolioCollection(item.id, { title_mobile: e.target.value })}
                                          placeholder="Nome do Portfólio no Celular (ex: Jah do Açaí)"
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePortfolioCollection(item.id)}
                                        className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors self-end sm:self-auto shrink-0 flex items-center gap-2 font-bold text-xs cursor-pointer shadow-none"
                                        title="Excluir Portfólio (Move para Lixeira)"
                                      >
                                        <Trash className="w-4 h-4" />
                                        <span>Excluir Portfólio</span>
                                      </button>
                                    </div>
                                    
                                    <div className="barra p-3 sm:p-4 rounded-2xl border border-white/10 shadow-none">
                                      <div className="mb-6">
                                        <label className="gm-label mb-2 block text-xs flex items-center gap-1.5 font-bold text-zinc-300">
                                          Descrição do Portfólio (Smartphone)
                                        </label>
                                        <textarea 
                                          className={`gm-input min-h-[120px] w-full resize-y rounded-xl p-3 bg-black/30 border border-white/10 focus:border-[var(--primary-color)] outline-none transition-colors ${(item.description_align_mobile || item.description_align || "left") === "left" ? "text-left" : (item.description_align_mobile || item.description_align) === "right" ? "text-right" : "text-center"} ${(item.description_bold_mobile !== undefined ? item.description_bold_mobile : item.description_bold) ? "font-bold" : "font-medium"} ${(item.description_italic_mobile !== undefined ? item.description_italic_mobile : item.description_italic) ? "italic" : "not-italic"} ${getFontSizeClass(item.description_size_mobile || item.description_size || "16 pt")} bio-desc-font-${item.description_font_mobile || item.description_font || "ui"}`}
                                          value={item.description_mobile !== undefined ? item.description_mobile : (item.description || '')}
                                          onChange={(e) => handleUpdatePortfolioCollection(item.id, { description_mobile: e.target.value })}
                                          placeholder="Descreva o projeto para exibição em smartphones..."
                                        />
                                        <div className="flex flex-wrap items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/10 mt-2 shadow-none">
                                          <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-white/10 shadow-none">
                                            <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_align_mobile: "left" })} className={`p-1.5 rounded-md transition-colors ${(item.description_align_mobile || item.description_align || 'left') === 'left' ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><AlignLeft className="w-4 h-4" /></button>
                                            <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_align_mobile: "center" })} className={`p-1.5 rounded-md transition-colors ${(item.description_align_mobile || item.description_align) === 'center' ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><AlignCenter className="w-4 h-4" /></button>
                                            <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_align_mobile: "right" })} className={`p-1.5 rounded-md transition-colors ${(item.description_align_mobile || item.description_align) === 'right' ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><AlignRight className="w-4 h-4" /></button>
                                          </div>
                                          <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-white/10 shadow-none">
                                            <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_bold_mobile: !(item.description_bold_mobile !== undefined ? item.description_bold_mobile : item.description_bold) })} className={`p-1.5 rounded-md transition-colors ${(item.description_bold_mobile !== undefined ? item.description_bold_mobile : item.description_bold) ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><Bold className="w-4 h-4 font-bold" /></button>
                                            <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_italic_mobile: !(item.description_italic_mobile !== undefined ? item.description_italic_mobile : item.description_italic) })} className={`p-1.5 rounded-md transition-colors ${(item.description_italic_mobile !== undefined ? item.description_italic_mobile : item.description_italic) ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><Italic className="w-4 h-4 italic" /></button>
                                          </div>
                                          <div className="flex-1 min-w-[140px]">
                                            <select className="gm-input !h-8 !py-0 !px-2 text-xs font-semibold rounded-lg bg-black/30 border border-white/10 text-zinc-300 w-full" value={item.description_font_mobile || item.description_font || "ui"} onChange={e => handleUpdatePortfolioCollection(item.id, { description_font_mobile: e.target.value })}>
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
                                            <select className="gm-input !h-8 !py-0 !px-2 text-xs font-semibold rounded-lg bg-black/30 border border-white/10 text-zinc-300 w-full" value={item.description_size_mobile || item.description_size || "16 pt"} onChange={e => handleUpdatePortfolioCollection(item.id, { description_size_mobile: e.target.value })}>
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
                                      
                                      <div className="space-y-6 pt-4 border-t border-white/10">
                                        {/* Section for Portfolio Main Banner (Smartphone) */}
                                        <div className="space-y-4">
                                          <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold text-zinc-200">Banner Principal do Portfólio (Smartphone)</span>
                                            <span className="text-[10px] text-zinc-400 font-medium">Este banner substituirá o banner da empresa quando este portfólio estiver aberto no site versão celular.</span>
                                          </div>
                                          
                                          <div className="space-y-2 max-w-sm">
                                            <div className="flex items-center justify-between">
                                              <span className="text-[11px] font-semibold text-zinc-400">Smartphone (1080x900 px) - Proporção 6:5</span>
                                              {item.main_banner_mobile_url && (
                                                <button 
                                                  type="button" 
                                                  onClick={() => handleRemovePortfolioMainMobileBanner(item.id)}
                                                  className="text-[10px] text-red-400 hover:text-red-300 font-bold cursor-pointer"
                                                >
                                                  Remover
                                                </button>
                                              )}
                                            </div>
                                            {item.main_banner_mobile_url ? (
                                              <div className="relative aspect-[6/5] max-w-[200px] rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-none">
                                                <img src={item.main_banner_mobile_url} alt="Main Banner Mobile" className="w-full h-full object-cover" />
                                              </div>
                                            ) : (
                                              <label className="flex flex-col items-center justify-center aspect-[6/5] max-w-[200px] rounded-2xl border-2 border-dashed border-white/10 hover:border-[var(--primary-color)] bg-black/20 cursor-pointer transition-colors text-center p-4 shadow-none">
                                                <Upload className="w-5 h-5 text-zinc-400 mb-1" />
                                                <span className="text-xs text-zinc-300 font-bold">Enviar Banner Smartphone</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadPortfolioMainMobileBanner(item.id, e)} />
                                              </label>
                                            )}
                                          </div>
                                        </div>

                                        {/* Section for Smartphone Banners */}
                                        <div className="space-y-3 pt-4 border-t border-white/10">
                                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                            <div className="flex flex-col">
                                              <span className="text-xs font-semibold text-zinc-300">Banners Internos Smartphone ({item.mobile_layers?.length || 0})</span>
                                              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Tamanho Recomendado: 1080x1920 px (Proporção 9:16)</span>
                                            </div>
                                            <label className="text-xs bg-black/30 hover:bg-[var(--primary-color)] hover:text-white text-zinc-300 px-3 py-2 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 w-full sm:w-auto font-bold border border-white/10 hover:border-transparent shadow-none">
                                              <Upload className="w-4 h-4" />
                                              Adicionar Banners Smartphone (até 5)
                                              <input type="file" multiple accept="image/*,video/mp4" className="hidden" onChange={(e) => handleUploadPortfolioMobileLayer(item.id, e)} />
                                            </label>
                                          </div>
                                          
                                          {item.mobile_layers && item.mobile_layers.length > 0 ? (
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                              {(item.mobile_layers || []).map((layer: any) => (
                                                <div key={layer.id} className="relative group aspect-[9/16] max-w-[120px] rounded-xl overflow-hidden bg-black/40 border border-white/10 mx-auto w-full shadow-none">
                                                  <OptimizedImage src={layer.image_url} alt="Layer Smartphone" className="w-full h-full object-cover" width={150} />
                                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleRemovePortfolioMobileLayer(item.id, layer.id)}
                                                      className="text-red-400 hover:text-red-300 p-2 flex flex-col items-center gap-1 font-bold text-xs cursor-pointer"
                                                    >
                                                      <Trash className="w-4 h-4" />
                                                      Remover
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="py-4 text-center text-zinc-500 text-xs border border-dashed border-white/10 rounded-2xl">
                                              Nenhum banner smartphone inserido neste portfólio.
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* Versão Desktop (Computador) do Portfólio */}
                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                      <div className="flex-1 w-full">
                                        <label className="gm-label mb-1 text-xs text-[var(--primary-color)] flex items-center gap-1.5 font-bold tracking-wider">
                                          <Monitor className="w-3.5 h-3.5" /> Título Desktop
                                        </label>
                                        <input 
                                          type="text" 
                                          className="bg-transparent text-white font-bold text-sm sm:text-base outline-none border-b border-transparent focus:border-white/20 pb-1 w-full"
                                          value={item.title || ''}
                                          onChange={e => handleUpdatePortfolioCollection(item.id, { title: e.target.value })}
                                          placeholder="Nome do Portfólio no Computador (ex: Jah do Açaí)"
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePortfolioCollection(item.id)}
                                        className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors self-end sm:self-auto shrink-0 flex items-center gap-2 font-bold text-xs cursor-pointer shadow-none"
                                        title="Excluir Portfólio (Move para Lixeira)"
                                      >
                                        <Trash className="w-4 h-4" />
                                        <span>Excluir Portfólio</span>
                                      </button>
                                    </div>
                                    
                                    <div className="barra p-3 sm:p-4 rounded-2xl border border-white/10 shadow-none">
                                      <div className="mb-6">
                                        <label className="gm-label mb-2 block text-xs flex items-center gap-1.5 font-bold text-zinc-300">
                                          Descrição do Portfólio (Computador)
                                        </label>
                                        <textarea 
                                          className={`gm-input min-h-[120px] w-full resize-y rounded-xl p-3 bg-black/30 border border-white/10 focus:border-[var(--primary-color)] outline-none transition-colors ${item.description_align === "left" ? "text-left" : item.description_align === "right" ? "text-right" : "text-center"} ${item.description_bold ? "font-bold" : "font-medium"} ${item.description_italic ? "italic" : "not-italic"} ${getFontSizeClass(item.description_size)} bio-desc-font-${item.description_font || "ui"}`}
                                          value={item.description || ''}
                                          onChange={(e) => handleUpdatePortfolioCollection(item.id, { description: e.target.value })}
                                          placeholder="Descreva o projeto para exibição em computadores..."
                                        />
                                        <div className="flex flex-wrap items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/10 mt-2 shadow-none">
                                          <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-white/10 shadow-none">
                                            <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_align: "left" })} className={`p-1.5 rounded-md transition-colors ${(!item.description_align || item.description_align === 'left') ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><AlignLeft className="w-4 h-4" /></button>
                                            <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_align: "center" })} className={`p-1.5 rounded-md transition-colors ${item.description_align === 'center' ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><AlignCenter className="w-4 h-4" /></button>
                                            <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_align: "right" })} className={`p-1.5 rounded-md transition-colors ${item.description_align === 'right' ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><AlignRight className="w-4 h-4" /></button>
                                          </div>
                                          <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-white/10 shadow-none">
                                            <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_bold: !item.description_bold })} className={`p-1.5 rounded-md transition-colors ${item.description_bold ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><Bold className="w-4 h-4 font-bold" /></button>
                                            <button type="button" onClick={() => handleUpdatePortfolioCollection(item.id, { description_italic: !item.description_italic })} className={`p-1.5 rounded-md transition-colors ${item.description_italic ? 'bg-[var(--primary-color)] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}><Italic className="w-4 h-4 italic" /></button>
                                          </div>
                                          <div className="flex-1 min-w-[140px]">
                                            <select className="gm-input !h-8 !py-0 !px-2 text-xs font-semibold rounded-lg bg-black/30 border border-white/10 text-zinc-300 w-full" value={item.description_font || "ui"} onChange={e => handleUpdatePortfolioCollection(item.id, { description_font: e.target.value })}>
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
                                            <select className="gm-input !h-8 !py-0 !px-2 text-xs font-semibold rounded-lg bg-black/30 border border-white/10 text-zinc-300 w-full" value={item.description_size || "16 pt"} onChange={e => handleUpdatePortfolioCollection(item.id, { description_size: e.target.value })}>
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
                                      
                                      <div className="space-y-6 pt-4 border-t border-white/10">
                                        {/* Section for Portfolio Main Banner (Desktop) */}
                                        <div className="space-y-4">
                                          <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold text-zinc-200">Banner Principal do Portfólio (Desktop)</span>
                                            <span className="text-[10px] text-zinc-400 font-medium">Este banner substituirá o banner da empresa quando este portfólio estiver aberto no site versão computador.</span>
                                          </div>
                                          
                                          <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                              <span className="text-[11px] font-semibold text-zinc-400">Desktop (Tamanho Lógico e Funcional: 1920x500 px a 1920x800 px para preenchimento widescreen perfeito)</span>
                                              {item.main_banner_url && (
                                                <button 
                                                  type="button" 
                                                  onClick={() => handleRemovePortfolioMainBanner(item.id)}
                                                  className="text-[10px] text-red-400 hover:text-red-300 font-bold cursor-pointer"
                                                >
                                                  Remover
                                                </button>
                                              )}
                                            </div>
                                            {item.main_banner_url ? (
                                              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-none">
                                                <img src={item.main_banner_url} alt="Main Banner Desktop" className="w-full h-full object-cover" />
                                              </div>
                                            ) : (
                                              <label className="flex flex-col items-center justify-center aspect-video rounded-2xl border-2 border-dashed border-white/10 hover:border-[var(--primary-color)] bg-black/20 cursor-pointer transition-colors text-center p-4 shadow-none">
                                                <Upload className="w-5 h-5 text-zinc-400 mb-1" />
                                                <span className="text-xs text-zinc-300 font-bold">Enviar Banner Desktop</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadPortfolioMainBanner(item.id, e)} />
                                              </label>
                                            )}
                                          </div>
                                        </div>

                                        {/* Section for Desktop Banners */}
                                        <div className="space-y-3">
                                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                            <div className="flex flex-col">
                                              <span className="text-xs font-semibold text-zinc-300">Banners Internos Desktop ({item.layers?.length || 0})</span>
                                              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Tamanho Lógico e Funcional: 1600x900 px (Proporção 16:9) ou 1600x560 px para encaixe excelente nas proporções do computador</span>
                                            </div>
                                            <label className="text-xs bg-black/30 hover:bg-[var(--primary-color)] hover:text-white text-zinc-300 px-3 py-2 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 w-full sm:w-auto font-bold border border-white/10 hover:border-transparent shadow-none">
                                              <Upload className="w-4 h-4" />
                                              Adicionar Banners Desktop (até 5)
                                              <input type="file" multiple accept="image/*,video/mp4" className="hidden" onChange={(e) => handleUploadPortfolioLayer(item.id, e)} />
                                            </label>
                                          </div>
                                          
                                          {item.layers && item.layers.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                              {(item.layers || []).map((layer: any) => (
                                                <div key={layer.id} className="relative group aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10 shadow-none">
                                                  <OptimizedImage src={layer.image_url} alt="Layer Desktop" className="w-full h-full object-cover" width={300} />
                                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleRemovePortfolioLayer(item.id, layer.id)}
                                                      className="text-red-400 hover:text-red-300 p-2 flex flex-col items-center gap-1 font-bold text-xs cursor-pointer"
                                                    >
                                                      <Trash className="w-4 h-4" />
                                                      Remover
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="py-4 text-center text-zinc-500 text-xs border border-dashed border-white/10 rounded-2xl">
                                              Nenhum banner desktop inserido neste portfólio.
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })()}
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
                          className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-none"
                        >
                          Esvaziar Lixeira
                        </button>
                      )}
                    </div>
                    {deletedPortfolioItems.length === 0 ? (
                      <div className="text-center py-10 text-zinc-500 text-sm border border-dashed border-white/10 rounded-2xl space-y-2">
                        <Trash2 className="w-10 h-10 opacity-20 mx-auto text-zinc-400" />
                        <p>A lixeira está vazia.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/10">
                        {deletedPortfolioItems.map((item: any, idx: number) => (
                          <div key={item.id || idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="min-w-0 flex-1 flex items-center gap-3">
                              {item.layers && item.layers[0] && (
                                <div className="w-10 h-10 rounded-xl bg-black/40 overflow-hidden border border-white/10 shrink-0 shadow-none">
                                  <img src={item.layers[0].image_url} alt="" className="w-full h-full object-cover" />
                                </div>
                              )}
                              <h4 className="font-bold text-sm text-zinc-300 truncate">{item.title || 'Portfólio Excluído'}</h4>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => restorePortfolioCollection(item.id)}
                                className="text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer flex-1 justify-center sm:flex-none shadow-none"
                                title="Restaurar portfólio"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Restaurar
                              </button>
                              <button
                                type="button"
                                onClick={() => permanentlyDeletePortfolioCollection(item.id)}
                                className="text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer flex-1 justify-center sm:flex-none shadow-none"
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
          </div>
        )}

        {/* 7. DADOS DE PAGAMENTO (PIX) */}
        {openSections.payment && (
          <div className="gm-card fora border border-white/10 p-4 sm:p-6 rounded-2xl space-y-5 shadow-none backdrop-blur-md w-full animate-in fade-in duration-300">
            <div className="sticky top-0 z-20 barra py-2 sm:py-2.5 px-3 sm:px-4 border-b border-white/10 flex items-center justify-between mb-3 rounded-xl shadow-none">
              <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-zinc-800 dark:text-white uppercase tracking-wider">
                <CreditCard className="w-4.5 h-4.5 text-[var(--primary-color)] animate-pulse" />
                DADOS DE PAGAMENTO (PIX)
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-full border border-[var(--primary-color)]/20 shadow-none">
                Edição Ativa
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-5 animate-in fade-in slide-in-from-top-2 pt-2">
              <div className="space-y-4">
                <div>
                  <label className="gm-label font-semibold">Como deseja receber / Chave PIX</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">Tipo de Chave PIX</label>
                      <select className="gm-input !py-2.5 text-sm" value={bioConfig.pix_type} onChange={e => handleChange("pix_type", e.target.value)}>
                        <option value="CPF">CPF</option>
                        <option value="CNPJ">CNPJ</option>
                        <option value="Email">E-mail</option>
                        <option value="Telefone">Telefone</option>
                        <option value="Chave Aleatória">Chave Aleatória</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-zinc-300 mb-1.5 block">Chave PIX</label>
                      <input type="text" className="gm-input !py-2.5 text-sm" value={bioConfig.pix_key} onChange={e => handleChange("pix_key", e.target.value)} placeholder="Chave do PIX..." />
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <label className="gm-label font-semibold">Link para Pagamento (Cartão de Crédito URL)</label>
                  <input type="text" className="gm-input font-mono text-sm !py-2.5" value={bioConfig.card_url || ''} onChange={e => handleChange("card_url", e.target.value)} placeholder="https://link.mercadopago.com/... ou stripe..." />
                  <p className="text-xs text-zinc-500 mt-1">Ao receber o clique no botão do cartão de crédito, o cliente será redirecionado para este link de pagamento.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 8. ENDEREÇO E LOCALIZAÇÃO */}
        {openSections.address && (
          <div className="gm-card fora border border-white/10 p-4 sm:p-6 rounded-2xl space-y-5 shadow-none backdrop-blur-md w-full animate-in fade-in duration-300">
            <div className="sticky top-0 z-20 barra py-2 sm:py-2.5 px-3 sm:px-4 border-b border-white/10 flex items-center justify-between mb-3 rounded-xl shadow-none">
              <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-zinc-800 dark:text-white uppercase tracking-wider">
                <MapPin className="w-4.5 h-4.5 text-[var(--primary-color)] animate-pulse" />
                ENDEREÇO E LOCALIZAÇÃO
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-full border border-[var(--primary-color)]/20 shadow-none">
                Edição Ativa
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-5 animate-in fade-in slide-in-from-top-2 pt-2">
              <div className="space-y-4">
                <div>
                  <label className="gm-label font-semibold">Nome do Endereço Completo</label>
                  <textarea className="gm-input min-h-[70px] !py-2.5 resize-y text-sm" value={bioConfig.address} onChange={e => handleChange("address", e.target.value)} placeholder="Rua XYZ, 123 - Cidade/UF" />
                </div>
                <div>
                  <label className="gm-label font-semibold">Link de Localização (Google Maps / Waze)</label>
                  <input type="text" className="gm-input font-mono text-sm !py-2.5" value={bioConfig.address_url || ''} onChange={e => handleChange("address_url", e.target.value)} placeholder="https://maps.app.goo.gl/..." />
                  <p className="text-xs text-zinc-500 mt-1">Ao receber o clique no endereço, o cliente abrirá esta localização.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 9. CHAT CARDDIGITAL GM */}
        {openSections.contactSection && (
          <div className="gm-card fora border border-white/10 p-4 sm:p-6 rounded-2xl space-y-5 shadow-none backdrop-blur-md w-full animate-in fade-in duration-300">
            <div className="sticky top-0 z-20 barra py-2 sm:py-2.5 px-3 sm:px-4 border-b border-white/10 flex items-center justify-between mb-3 rounded-xl shadow-none">
              <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-zinc-800 dark:text-white uppercase tracking-wider">
                <Sparkles className="w-4.5 h-4.5 text-[var(--primary-color)] animate-pulse" />
                CHAT CARDDIGITAL GM
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-full border border-[var(--primary-color)]/20 shadow-none">
                Edição Ativa
              </span>
            </div>
            
            {true && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 pt-2 text-zinc-600 dark:text-zinc-300">
                {/* Banner de Contato */}
                <div className="space-y-4 fora p-4 sm:p-5 rounded-2xl border border-white/10 shadow-none">
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                    <Layout className="w-4 h-4 text-[var(--primary-color)]" /> Banner da Página de Contato
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Envie um banner exclusivo para a página de contato do seu site (caso vazio, usará o banner principal).</p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2 barra p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between shadow-none">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-zinc-300">Imagem do Banner</span>
                          {bioConfig.contact_banner_img_url && (
                            <button 
                              type="button" 
                              onClick={() => handleChange("contact_banner_img_url", "")} 
                              className="text-red-500 hover:text-red-400 text-[10px] font-bold cursor-pointer"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                        
                        {bioConfig.contact_banner_img_url ? (
                          <div className="w-full aspect-[16/6] rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-none">
                            <OptimizedImage src={bioConfig.contact_banner_img_url} alt="Banner Contato" className="w-full h-full object-cover" width={800} />
                          </div>
                        ) : (
                          <div className="w-full aspect-[16/6] rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-zinc-500 text-[10px] font-medium bg-black/10">
                            <Layout className="w-5 h-5 mb-1 opacity-40 text-[var(--primary-color)]" />
                            Sem banner de contato personalizado
                          </div>
                        )}
                      </div>
                      <div className="pt-2">
                        <label className="w-full gm-btn gm-btn-outline !py-4 gap-1.5 text-xs flex items-center justify-center cursor-pointer border border-[var(--primary-color-60)] hover:border-[var(--primary-color)] hover:bg-[var(--primary-color-10)] transition-all shadow-none">
                          <Upload className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                          <span className="font-bold text-white">Upload Banner de Contato</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleUploadContactBanner} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Textos da Página de Contato */}
                <div className="space-y-4 fora p-4 sm:p-5 rounded-2xl border border-white/10 shadow-none">
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-white flex items-center gap-2">
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
                <div className="space-y-4 fora p-4 sm:p-5 rounded-2xl border border-white/10 shadow-none">
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--primary-color)]" /> Balão do Chat Flutuante (WhatsApp)
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Personalize o widget do Join.chat exibido na página de contato do seu site.</p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 barra p-3.5 rounded-2xl border border-white/10 shadow-none">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="chat_balloon_enabled" 
                        checked={bioConfig.chat_balloon_enabled !== false} 
                        onChange={e => handleChange("chat_balloon_enabled", e.target.checked)}
                        className="w-4 h-4 rounded text-[var(--primary-color)] bg-white dark:bg-zinc-850 border-white/10 focus:ring-0 cursor-pointer" 
                      />
                      <label htmlFor="chat_balloon_enabled" className="text-xs font-bold text-zinc-700 dark:text-white cursor-pointer select-none">Habilitar Chat Balão</label>
                    </div>
                    <div className="sm:border-l border-white/10 sm:pl-4 flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="chat_balloon_show_qrcode" 
                        checked={bioConfig.chat_balloon_show_qrcode !== false} 
                        onChange={e => handleChange("chat_balloon_show_qrcode", e.target.checked)}
                        className="w-4 h-4 rounded text-[var(--primary-color)] bg-white dark:bg-zinc-850 border-white/10 focus:ring-0 cursor-pointer" 
                      />
                      <label htmlFor="chat_balloon_show_qrcode" className="text-xs font-bold text-zinc-700 dark:text-white cursor-pointer select-none">Mostrar QR Code ao passar o mouse (PC)</label>
                    </div>
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
                        className="gm-input min-h-[140px] !py-2.5 resize-y" 
                        value={bioConfig.chat_balloon_text || ''} 
                        onChange={e => handleChange("chat_balloon_text", e.target.value)} 
                        placeholder="Ex: Olá 👋&#10;Sou Denis, como posso te ajudar hoje?" 
                      />
                    </div>
                    <div className="space-y-4">
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
                      <div>
                        <label className="gm-label font-semibold">Link de Contato para QR Code</label>
                        <input 
                          type="text" 
                          className="gm-input font-medium text-xs" 
                          value={bioConfig.chat_balloon_qr_link || ""} 
                          onChange={e => handleChange("chat_balloon_qr_link", e.target.value)} 
                          placeholder="Deixe em branco para usar o WhatsApp padrão" 
                        />
                      </div>
                      <div>
                        <label className="gm-label font-semibold">Mensagem automática do WhatsApp (QR Code)</label>
                        <input 
                          type="text" 
                          className="gm-input font-medium text-xs" 
                          value={bioConfig.chat_balloon_qr_msg || ""} 
                          onChange={e => handleChange("chat_balloon_qr_msg", e.target.value)} 
                          placeholder="Ex: Olá! Estou vindo do site GM edificação..." 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        </div>

      {/* FLOATING ACTION PANEL WITH TOUCH SWIPE-LEFT/RIGHT TO COLLAPSE AND CLICK-TO-EXPAND */}
      <div className="fixed top-1/2 -tranzinc-y-1/2 right-0 z-[80] select-none pointer-events-none flex flex-col items-end">
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
              title="Clique ou arraste para a esquerda para abrir o botão Salvar"
            >
              <div className="flex flex-col gap-2 py-8 pl-10 pr-1 bg-transparent select-none">
                <div className="w-3.5 h-20 rounded-full bg-[var(--gm-primary)] shadow-xl transition-all group-hover:w-5 flex items-center justify-center text-white border border-orange-300/40">
                  <Save size={15} className="opacity-90 animate-pulse text-white" />
                </div>
              </div>
            </motion.div>
          ) : (
            /* Expanded format: Directly draggable circular buttons with hover labels */
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
                if (info.offset.x > 30 || info.offset.x < -30) {
                  setIsDocked(true);
                }
                setTimeout(() => {
                  isDraggingRef.current = false;
                }, 100);
              }}
              whileDrag={{ scale: 0.95, opacity: 0.9 }}
              className="pointer-events-auto flex flex-col gap-3 pr-3 sm:pr-5 items-end justify-center cursor-grab active:cursor-grabbing"
            >
              <AnimatePresence>
                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 20 }}
                    className="flex items-center gap-2 text-[var(--gm-primary)] bg-white/95 dark:bg-zinc-900/95 border border-[var(--gm-primary)]/40 px-3.5 py-2 rounded-lg text-xs font-black shadow-lg backdrop-blur-md"
                  >
                    <CheckCircle2 size={16} className="text-[var(--gm-primary)] animate-bounce" />
                    <span>Bio Salva!</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* SAVE BUTTON */}
              <div className="relative group flex items-center">
                <span className="absolute right-16 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-zinc-900/95 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap pointer-events-none border border-zinc-800/80 backdrop-blur-sm">
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </span>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDraggingRef.current) return;
                    handleSave();
                  }}
                  disabled={saving}
                  className="gm-floating-save-btn !p-0 w-14 h-14 hover:brightness-110 active:translate-y-0.5 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 border border-white/20 cursor-pointer outline-none"
                  style={{ backgroundColor: (bioConfig as any).brand_color || bioConfig.color || 'var(--gm-primary)' }}
                  title="Salvar todas as alterações da Bio"
                >
                  {saving ? (
                    <Loader2 className="w-6 h-6 animate-spin text-white shrink-0" />
                  ) : saveSuccess ? (
                    <CheckCircle2 className="w-6 h-6 text-white animate-bounce shrink-0" />
                  ) : (
                    <Save className="w-6 h-6 text-white shrink-0" />
                  )}
                </button>
              </div>

              {/* PREVIEW BUTTON */}
              <div className="relative group flex items-center">
                <span className="absolute right-16 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-zinc-900/95 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap pointer-events-none border border-zinc-800/80 backdrop-blur-sm">
                  Visualizar Prévia
                </span>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDraggingRef.current) return;
                    setPreviewOpen(true);
                  }}
                  className="w-14 h-14 bg-[var(--gm-primary)] hover:brightness-110 active:scale-95 text-white rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(255,105,0,0.45)] hover:shadow-[0_12px_32px_rgba(255,105,0,0.65)] transition-all duration-300 border border-orange-300/40 cursor-pointer outline-none"
                  title="Visualizar Prévia"
                >
                  <Eye className="w-6 h-6 text-white transition-transform duration-200" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* PREVIEW 100% FULL SCREEN - SEM MODAL, SEM CÁPSULA, SEM CONTAINER */}
      {previewOpen && (
        <div 
          data-website-root="true"
          data-site-preview="true"
          className="gm-website-fullscreen site-full-viewport gm-website-viewport gm-site-fullscreen fixed inset-0 z-[99999] w-screen h-screen bg-black overflow-hidden m-0 p-0 border-0 rounded-none flex flex-col animate-in fade-in duration-200"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            maxWidth: '100vw',
            height: '100%',
            maxHeight: '100dvh',
            margin: 0,
            padding: 0,
            border: 0,
            borderRadius: 0,
            boxShadow: 'none'
          }}
        >
          {/* Top Device Switcher & Exit Toolbar - Minimal floating header */}
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100001] bg-zinc-950/90 backdrop-blur-xl border border-white/20 p-1.5 rounded-full flex items-center gap-1.5 shadow-2xl pointer-events-auto">
            <button
              type="button"
              onClick={() => setPreviewMode("smartphone")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                previewMode === "smartphone"
                  ? "bg-[var(--primary-color)] text-white shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>SMARTPHONE (1080×1920)</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("pc")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                previewMode === "pc"
                  ? "bg-[var(--primary-color)] text-white shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <Layout className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>DESKTOP PC</span>
            </button>
          </div>

          {/* Floating Exit Button */}
          <button 
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="fixed top-3 right-3 sm:right-5 z-[100001] bg-zinc-900/90 hover:bg-red-600 text-white font-black px-3.5 py-2 sm:px-4 sm:py-2 rounded-full flex items-center justify-center gap-1.5 shadow-2xl transition-all duration-300 pointer-events-auto border border-white/20 cursor-pointer text-xs sm:text-sm backdrop-blur-md"
            title="Voltar ao Editor"
          >
            <X className="w-4 h-4" />
            <span>Voltar ao Editor</span>
          </button>

          {/* 100% Full Screen Website Viewport - Centralizado e pegando as extremidades da tela na versão smartphone */}
          <div 
            data-website-root="true"
            data-site-preview="true"
            className="w-full h-full flex-1 overflow-hidden relative bg-black m-0 p-0 border-0 rounded-none flex flex-col items-center justify-start"
            style={{
              margin: 0,
              padding: 0,
              border: 0,
              borderRadius: 0,
              boxShadow: 'none',
              width: '100%',
              maxWidth: '100%'
            }}
          >
            <div 
              data-website-root="true"
              data-site-preview="true"
              className={`h-full flex flex-col items-center justify-start relative transition-all duration-300 ${
                previewMode === "smartphone"
                  ? "w-full sm:max-w-[440px] md:max-w-[460px] mx-auto shadow-2xl"
                  : "w-full max-w-full"
              }`}
              style={{
                margin: '0 auto',
                padding: 0,
                border: 0,
                borderRadius: 0,
                boxSizing: 'border-box'
              }}
            >
              <BioRenderer 
                asPreview={true}
                previewMode={previewMode}
                data={{
                  tenant_id: tenantId || settings?.tenant_id,
                  company_name: settings?.company_name,
                  company_logo_url: settings?.company_logo_url,
                  website_logo_url: (bioConfig as any)?.website_logo_url || (bioConfig as any)?.logo_url,
                  pix_key: bioConfig.pix_key || settings?.pix_key,
                  pix_type: bioConfig.pix_type || settings?.pix_type,
                  brand_primary: settings?.brand_primary,
                  bio_config: bioConfig
                }} 
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </Page>
  );
}
