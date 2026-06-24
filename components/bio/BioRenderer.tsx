import React, { useState, useEffect, useRef } from "react";
import { Globe, Instagram, Facebook, Mail, Phone, MapPin, Copy, Box, FileText, Check, MessageCircle, Send, Linkedin, Twitter, Youtube, Link as LinkIcon, Music, Headphones, Github, ShoppingCart, Store, Utensils, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Share2, X, Trash2, ShoppingBag, Plus, Minus, CreditCard, User, Truck, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "../../lib/supabase";

export const formatExternalUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export const getPlatformIcon = (platform: string) => {
  switch (platform?.toLowerCase()) {
    case 'whatsapp': return MessageCircle;
    case 'telegram': return Send;
    case 'instagram': return Instagram;
    case 'facebook': return Facebook;
    case 'linkedin': return Linkedin;
    case 'twitter': return Twitter;
    case 'youtube': return Youtube;
    case 'tiktok': return Music;
    case 'spotify': return Headphones;
    case 'github': return Github;
    case 'ecommerce': return ShoppingCart;
    case 'store': return Store;
    case 'food': return Utensils;
    case 'email': return Mail;
    case 'phone': return Phone;
    case 'catalog': return FileText;
    case 'portfolio': return Box;
    case 'website': return Globe;
    case 'address': return MapPin;
    default: return LinkIcon;
  }
};

export default function BioRenderer({ data, asPreview = false }: { data: any, asPreview?: boolean }) {
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const bio = data?.bio_config || {};

  // Shopping Cart state
  const [cart, setCart] = useState<{ product: any, quantity: number }[]>(() => {
    try {
      const saved = localStorage.getItem(`cart_${bio.tenant_id || 'default'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderName, setOrderName] = useState("");
  const [orderPhone, setOrderPhone] = useState("");
  const [deliveryOption, setDeliveryOption] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "checkout">("cart");
  const [productQuantity, setProductQuantity] = useState(1);

  // Login Section State
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(`cart_${bio.tenant_id || 'default'}`, JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart, bio.tenant_id]);

  useEffect(() => {
    if (selectedProduct) {
      setProductQuantity(1);
    }
  }, [selectedProduct]);

  // Escape key listener to close cart or product detail modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCartOpen(false);
        setSelectedProduct(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setSelectedProduct, setIsCartOpen]);

  // Dynamically update favicon with client's general app logo
  useEffect(() => {
    const clientLogo = data?.company_logo_url;
    if (clientLogo) {
      const links = document.querySelectorAll("link[rel*='icon']");
      if (links.length > 0) {
        links.forEach(link => {
          (link as HTMLLinkElement).href = clientLogo;
        });
      } else {
        const newLink = document.createElement("link");
        newLink.rel = "icon";
        newLink.href = clientLogo;
        document.head.appendChild(newLink);
      }
    }
  }, [data?.company_logo_url]);

  const addToCart = (product: any, qty: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + qty } 
            : item
        );
      }
      return [...prev, { product, quantity: qty }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: qty } 
        : item
    ));
  };

  const clearCart = () => {
    setCart([]);
    setCheckoutStep("cart");
  };

  const parsePrice = (priceStr: string | number | undefined): number => {
    if (!priceStr) return 0;
    if (typeof priceStr === 'number') return priceStr;
    const cleaned = priceStr
      .toString()
      .replace(/[R$\s]/gi, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatPrice = (val: number): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotalPrice = cart.reduce((sum, item) => sum + (parsePrice(item.product.price) * item.quantity), 0);

  const handleCheckoutWhatsApp = () => {
    if (!orderName.trim()) {
      alert("Por favor, informe seu nome para o pedido.");
      return;
    }
    if (deliveryOption === "delivery" && !deliveryAddress.trim()) {
      alert("Por favor, preencha o endereço de entrega.");
      return;
    }

    const cleanedWhatsapp = (bio.whatsapp || bio.phone || "").replace(/\D/g, "");
    if (!cleanedWhatsapp) {
      alert("Desculpe, este estabelecimento não configurou um número de WhatsApp para receber pedidos.");
      return;
    }

    // Format items list
    const itemsText = cart.map(item => {
      const itemTotal = parsePrice(item.product.price) * item.quantity;
      return `• *${item.product.name}* (x${item.quantity}) - ${formatPrice(itemTotal)}`;
    }).join("\n");

    const header = `*🛍️ NOVO PEDIDO - ${companyName.toUpperCase()}*\n`;
    const clientDetails = `*Cliente:* ${orderName.trim()}\n${orderPhone.trim() ? `*Telefone:* ${orderPhone.trim()}\n` : ""}`;
    const deliveryDetails = deliveryOption === "delivery" 
      ? `*Entrega:* Receber em Casa 🚚\n*Endereço:* ${deliveryAddress.trim()}\n` 
      : `*Entrega:* Retirar no Local 🏪\n`;
    
    const totals = `\n*Total do Pedido: ${formatPrice(cartTotalPrice)}*`;
    
    let pixDetails = "";
    if (pixKey) {
      pixDetails = `\n\n*💳 FORMA DE PAGAMENTO:* PIX\n*Chave:* \`${pixKey}\` (${pixType})\n_Por favor, realize o pagamento e envie o comprovante de transferência junto com este pedido!_`;
    }

    const message = `${header}\n${clientDetails}${deliveryDetails}\n*PRODUTOS:*\n${itemsText}${totals}${pixDetails}\n\nAgradeço a preferência!`;
    const encoded = encodeURIComponent(message);
    const whatsappClean = (bio.whatsapp || bio.phone || '').replace(/\D/g, '');
    const whatsappNumber = whatsappClean.startsWith('55') || whatsappClean.length > 11 ? whatsappClean : `55${whatsappClean}`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encoded}`;
    
    window.open(whatsappUrl, "_blank");
  };
  const logo = data?.company_logo_url;
  const companyName = bio.title || data?.company_name || "Perfil";
  const desc = bio.description || "";
  const brandColor = bio.color || data?.brand_primary || "#ff7a00";
  const theme = bio.theme || "dark";

  const generatePixPayload = (key: string, name: string = "GM Edificacao", city: string = "SAO LUIS") => {
    const cleanKey = key.trim();
    const formatField = (id: string, val: string) => {
      const len = val.length.toString().padStart(2, '0');
      return `${id}${len}${val}`;
    };

    const gui = formatField("00", "br.gov.bcb.pix");
    const keyField = formatField("01", cleanKey);
    const merchantAccountInfo = formatField("26", `${gui}${keyField}`);

    let payload = "000201";
    payload += merchantAccountInfo;
    payload += "52040000";
    payload += "5303986";
    payload += "5802BR";
    const normalizedName = name.substring(0, 25).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const normalizedCity = city.substring(0, 15).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    payload += formatField("59", normalizedName || "CARDDIGITAL GM");
    payload += formatField("60", normalizedCity || "SAO LUIS");
    payload += "62070503***";
    payload += "6304";

    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      const charCode = payload.charCodeAt(i);
      crc ^= (charCode << 8);
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
    return payload + crcHex;
  };

  const pixKey = bio.pix_key || data?.pix_key;
  const pixType = bio.pix_type || data?.pix_type || "Chave";
  const pixBrCode = pixKey ? generatePixPayload(pixKey, companyName) : "";
  const cardUrl = bio.card_url || data?.card_url || "";

  const hexToRgb = (hex: string) => {
    let cleanHex = hex.replace("#", "");
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split("").map(c => c + c).join("");
    }
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? "255, 123, 0" : `${r}, ${g}, ${b}`;
  };
  const pulseColorRgb = hexToRgb(brandColor);

  useEffect(() => {
    let activeTouchElement: HTMLElement | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const button = element?.closest(".bio-button") as HTMLElement | null;
      
      if (button) {
        button.style.transform = "scale(1.045)";
        activeTouchElement = button;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const button = element?.closest(".bio-button") as HTMLElement | null;

      if (button !== activeTouchElement) {
        if (activeTouchElement) {
          activeTouchElement.style.transform = "";
        }
        if (button) {
          button.style.transform = "scale(1.045)";
        }
        activeTouchElement = button;
      }
    };

    const handleTouchEnd = () => {
      if (activeTouchElement) {
        activeTouchElement.style.transform = "";
        activeTouchElement = null;
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  const handleWebsiteLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginSuccess("");
    setLoginLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (error) throw error;
      setLoginSuccess("Login realizado com sucesso! Redirecionando...");
      setTimeout(() => {
        setIsLoginOpen(false);
        // Redireciona para o painel administrativo da bio
        window.location.hash = "/minha-bio";
      }, 1200);
    } catch (err: any) {
      console.error("Login error:", err);
      let msg = err?.message || "Credenciais inválidas.";
      if (msg.includes("Invalid login credentials") || msg.includes("invalid-credentials")) {
        msg = "E-mail ou senha incorretos.";
      } else if (msg.includes("Email not confirmed")) {
        msg = "Por favor, confirme seu e-mail antes de fazer login.";
      }
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleShareBio = () => {
    const url = window.location.href;
    if (navigator.share && !asPreview) {
      navigator.share({
        title: companyName,
        text: desc,
        url: url
      }).catch((err) => {
        console.log("Error sharing", err);
      });
    } else {
      navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const themeClasses = {
    dark: {
      bg: "bg-[#0a0a0c]",
      textTitle: "text-white",
      textDesc: "text-slate-400",
      iconBg: "bg-slate-900",
      cardBg: "bg-white/5",
      cardBgHover: "hover:bg-white/10",
      cardBorder: "border-white/5",
      cardBorderHover: "hover:border-white/20",
      cardTitle: "text-slate-100",
      cardSub: "text-slate-400",
      pixSubtitle: "text-slate-300"
    },
    light: {
      bg: "bg-slate-50",
      textTitle: "text-slate-900",
      textDesc: "text-slate-600",
      iconBg: "bg-white",
      cardBg: "bg-white",
      cardBgHover: "hover:bg-slate-50",
      cardBorder: "border-slate-200 shadow-sm",
      cardBorderHover: "hover:border-slate-300 hover:shadow-md",
      cardTitle: "text-slate-800",
      cardSub: "text-slate-500",
      pixSubtitle: "text-slate-600"
    },
    glass: {
      bg: "bg-gradient-to-br from-slate-900 via-[#0b1220] to-slate-800",
      textTitle: "text-white",
      textDesc: "text-slate-300",
      iconBg: "bg-white/10 backdrop-blur-md",
      cardBg: "bg-white/5 backdrop-blur-md",
      cardBgHover: "hover:bg-white/10",
      cardBorder: "border-white/10",
      cardBorderHover: "hover:border-white/30",
      cardTitle: "text-white",
      cardSub: "text-slate-300",
      pixSubtitle: "text-slate-300"
    }
  };

  const t = themeClasses[theme as keyof typeof themeClasses] || themeClasses.dark;

  const handleCopyPix = () => {
    const pix = bio.pix_key || data?.pix_key;
    if (!pix) return;
    navigator.clipboard.writeText(pix);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const ContactCard = ({ icon: Icon, title, value, href }: { icon: any, title: string, value?: string, href?: string }) => {
    if (!value && !href) return null;
    
    const Wrapper = href ? "a" : "div";
    const formattedHref = formatExternalUrl(href);
    
    return (
        // @ts-ignore
      <Wrapper 
        href={asPreview ? undefined : formattedHref}
        target={href ? "_blank" : undefined}
        rel={href ? "noreferrer" : undefined}
        className={`w-full flex items-center p-4 sm:p-5 rounded-full border group select-none cursor-pointer transition-all duration-300 transform active:scale-98 shadow-sm hover:shadow-md bio-button ${t.cardBg} ${t.cardBgHover} ${t.cardBorder} ${t.cardBorderHover}`}
        onClick={(e: any) => { if (asPreview && href) e.preventDefault(); }}
      >
        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${t.iconBg}`} style={{ color: brandColor, backgroundColor: theme === 'dark' ? `${brandColor}20` : undefined }}>
          <Icon className="w-5.5 h-5.5 sm:w-6 sm:h-6" />
        </div>
        <div className="flex-1 text-center pr-11 sm:pr-12">
          <div className={`text-lg sm:text-xl md:text-2xl font-black tracking-wide px-2 py-0.5 ${t.cardTitle}`}>{title}</div>
        </div>
      </Wrapper>
    );
  };

  const customLinks = bio.custom_links || [];
  const bgImg = bio.bg_image_url;
  const bgMobileImg = bio.bg_mobile_image_url;

  const scrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const handleScroll = () => {
    const el = mainScrollRef.current;
    if (el) {
      setCanScrollUp(el.scrollTop > 10);
      setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 10);
    }
  };

  useEffect(() => {
    const el = mainScrollRef.current;
    if (el) {
      const timer = setTimeout(() => {
        setCanScrollUp(el.scrollTop > 10);
        setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 10);
      }, 500);

      const resizeObserver = new ResizeObserver(() => {
        setCanScrollUp(el.scrollTop > 10);
        setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 10);
      });
      resizeObserver.observe(el);

      return () => {
        clearTimeout(timer);
        resizeObserver.disconnect();
      };
    }
  }, [data, isCartOpen, selectedProduct]);

  useEffect(() => {
    if (!bio.catalog_items || bio.catalog_items.length <= 1) return;
    
    let isReversing = false;
    let interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        const maxScroll = scrollWidth - clientWidth;
        const scrollAmount = clientWidth * 0.8;
        
        if (!isReversing && scrollLeft >= maxScroll - 10) {
           isReversing = true;
        } else if (isReversing && scrollLeft <= 10) {
           isReversing = false;
        }

        if (isReversing) {
           scrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else {
           scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [bio.catalog_items]);

  const scrollLeftNav = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -scrollRef.current.clientWidth * 0.8, behavior: 'smooth' });
    }
  };

  const scrollRightNav = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: scrollRef.current.clientWidth * 0.8, behavior: 'smooth' });
    }
  };

  return (
    <div 
      ref={mainScrollRef}
      onScroll={handleScroll}
      className={`w-full ${!asPreview ? "fixed inset-0 overflow-y-auto py-10 px-4 custom-scroll" : "relative h-full overflow-y-auto no-scrollbar py-6 px-4"} ${t.bg} selection-brand font-sans`}
    >
      <style>{`
        .selection-brand::selection, .selection-brand *::selection {
          background-color: ${brandColor}35 !important;
        }
        .focus-border-brand:focus {
          border-color: ${brandColor} !important;
          box-shadow: 0 0 0 2px ${brandColor}15 !important;
        }
        .catalog-card-item:hover {
          border-color: ${brandColor}60 !important;
        }
        .details-btn {
          color: ${brandColor} !important;
          background-color: ${brandColor}12 !important;
          border-color: ${brandColor}25 !important;
        }
        .group:hover .details-btn {
          background-color: ${brandColor}25 !important;
        }
        .hover-text-brand:hover {
          color: ${brandColor} !important;
        }
      `}</style>
      {/* Background Desktop */}
      {bgImg && (
        <div 
          className={`${asPreview ? "absolute" : "fixed"} inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 ${bgMobileImg ? "hidden md:block" : "block"}`} 
          style={{ backgroundImage: `url(${bgImg})`, backgroundAttachment: asPreview ? 'scroll' : 'fixed' }} 
        />
      )}
      {/* Background Smartphone */}
      {bgMobileImg && (
        <div 
          className={`${asPreview ? "absolute" : "fixed"} inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 block md:hidden`} 
          style={{ backgroundImage: `url(${bgMobileImg})`, backgroundAttachment: asPreview ? 'scroll' : 'fixed' }} 
        />
      )}
      <div className={`${asPreview ? "max-w-md mx-auto" : "max-w-[1150px] w-full mx-auto px-4 md:px-8 lg:px-12"} relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10`}>
        <div className="space-y-6 sm:space-y-8 w-full">
          
          {/* Header & Banner Wrapper to overlay profile on top of the banner when enabled */}
          <div className="flex flex-col gap-6 sm:gap-8 w-full">
            {(() => {
              const desktopBanner = bio.banner_img_url_1;
              const mobileBanner = bio.mobile_banner_img_url_1;
              const finalDesktop = desktopBanner || mobileBanner;
              const finalMobile = mobileBanner || desktopBanner;
              const hasBanners = bio.show_banners && (desktopBanner || mobileBanner);

              // Helper to render the Profile Header with optional over-banner styles
              const renderProfileHeader = (isOverBanner: boolean) => (
                <div className={`text-center space-y-4 ${isOverBanner ? "relative z-20 text-white w-full px-4" : "pt-2"}`}>
                  <div 
                    className={`w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full overflow-hidden border-[3px] flex items-center justify-center p-1 shadow-2xl relative ${isOverBanner ? "bg-black/30 backdrop-blur-sm border-white/50" : t.iconBg}`} 
                    style={{ borderColor: isOverBanner ? undefined : `${brandColor}50` }}
                  >
                    {logo ? (
                      <img src={logo} alt={companyName} className="w-full h-full object-contain rounded-full" />
                    ) : (
                      <div className="text-3xl font-bold" style={{ color: isOverBanner ? '#ffffff' : brandColor }}>
                        {companyName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="px-2 space-y-3">
                    <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight ${isOverBanner ? "text-white drop-shadow-md" : t.textTitle}`}>{companyName}</h1>
                    {desc && <p className={`mt-2 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed ${isOverBanner ? "text-zinc-100 drop-shadow-sm font-semibold" : `${t.textDesc} font-semibold`}`}>{desc}</p>}
                    
                    {/* Share Bio Button */}
                    <div className="pt-1 flex justify-center">
                      <button 
                        onClick={handleShareBio}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-extrabold border shadow-sm cursor-pointer transition-all duration-200 transform active:scale-95 bio-button ${isOverBanner ? "bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm" : `${t.cardBg} ${t.cardBgHover} ${t.cardBorder}`}`}
                        style={{ 
                          color: isOverBanner ? '#ffffff' : brandColor, 
                          borderColor: isOverBanner ? 'rgba(255,255,255,0.25)' : `${brandColor}40`
                        }}
                      >
                        <Share2 className="w-4 h-4" />
                        {copiedShare ? "Link Copiado!" : "Compartilhar Bio"}
                      </button>
                    </div>
                  </div>
                </div>
              );

              if (!hasBanners) {
                // If banners are disabled or non-existent, fallback to normal top header
                return renderProfileHeader(false);
              }

              return (
                <>
                  {/* Desktop Banner overlay (md:block hidden) */}
                  {finalDesktop && (
                    <div 
                      className="hidden md:block w-full rounded-[2rem] overflow-hidden border shadow-lg relative group aspect-[21/9] bg-black/10 transition-all duration-300" 
                      style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                    >
                      <div className="w-full h-full relative">
                        <img src={finalDesktop} alt="Banner Desktop" className="w-full h-full object-cover absolute inset-0" referrerPolicy="no-referrer" />
                        
                        {/* Leve sombra interna debaixo para cima (gradient overlay shadow) */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10 z-10" />
                        
                        {/* Overlaid Profile Content */}
                        <div className="absolute inset-0 z-20 flex flex-col justify-center items-center py-6">
                          {renderProfileHeader(true)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mobile Banner overlay (block md:hidden) */}
                  {finalMobile && (
                    <div 
                      className="block md:hidden w-full rounded-[2rem] overflow-hidden border shadow-lg relative group aspect-[9/16] bg-black/10 transition-all duration-300 max-w-sm mx-auto" 
                      style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                    >
                      <div className="w-full h-full relative">
                        <img src={finalMobile} alt="Banner Mobile" className="w-full h-full object-cover absolute inset-0" referrerPolicy="no-referrer" />
                        
                        {/* Leve sombra interna debaixo para cima */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10 z-10" />
                        
                        {/* Overlaid Profile Content */}
                        <div className="absolute inset-0 z-20 flex flex-col justify-center items-center py-8">
                          {renderProfileHeader(true)}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* 3. Contacts & Links Stack (Harmonized, wider container blocks) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5 pt-2">
            {/* Legacy contact fields */}
            <ContactCard icon={MessageCircle} title="WhatsApp" value={bio.whatsapp} href={bio.whatsapp ? `https://wa.me/${bio.whatsapp.replace(/\D/g, '')}` : undefined} />
            <ContactCard icon={Phone} title="Telefone" value={bio.phone} href={bio.phone ? `tel:${bio.phone.replace(/\D/g, '')}` : undefined} />
            <ContactCard icon={Mail} title="E-mail" value={bio.email} href={bio.email ? `mailto:${bio.email}` : undefined} />
            <ContactCard icon={Instagram} title="Instagram" value={bio.instagram} href={bio.instagram?.includes('http') ? bio.instagram : `https://instagram.com/${bio.instagram?.replace('@','')}`} />
            <ContactCard icon={Facebook} title="Facebook" value={bio.facebook} href={bio.facebook?.includes('http') ? bio.facebook : `https://facebook.com/${bio.facebook}`} />
            <ContactCard icon={Box} title="Portfólio" value={bio.portfolio_url ? 'Acessar Portfólio' : ''} href={bio.portfolio_url} />
            <ContactCard icon={FileText} title="Catálogo" value={bio.catalog_url ? 'Ver Catálogo' : ''} href={bio.catalog_url} />
            <ContactCard icon={Globe} title="Website" value={bio.website ? 'Visitar Site' : ''} href={bio.website} />

            {/* Dynamic Custom Links */}
            {customLinks.map((link: any) => {
              const Icon = getPlatformIcon(link.platform);
              return (
                <ContactCard 
                  key={link.id} 
                  icon={Icon} 
                  title={link.label || 'Link'} 
                  value={link.value || undefined} 
                  href={link.url} 
                />
              );
            })}
          </div>

          {/* 4. Products Catalog Section */}
          {bio.catalog_items && bio.catalog_items.length > 0 && (
            <div className="pt-4 space-y-4 relative">
              <div className="flex items-center justify-between px-2">
                {bio.catalog_title && <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${t.textTitle}`}>{bio.catalog_title}</h2>}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-2 items-stretch animate-fade-in">
                {bio.catalog_items.map((item: any) => {
                  return (
                    <div 
                      key={item.id}
                      onClick={() => {
                        setSelectedProduct(item);
                        setActiveImageIndex(0);
                      }}
                      className={`overflow-hidden rounded-[2rem] border transition-all duration-300 flex flex-col cursor-pointer hover:shadow-2xl hover:-translate-y-1 group ${t.cardBg} ${t.cardBorder} catalog-card-item`}
                    >
                      {item.image_url ? (
                        <div className="w-full aspect-square bg-white overflow-hidden relative flex items-center justify-center p-1.5 rounded-[1.5rem]">
                          <img src={item.image_url} alt={item.name} className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className={`w-full aspect-square ${t.iconBg} flex items-center justify-center`}>
                          <ShoppingCart className="w-10 h-10 opacity-20 text-slate-400" />
                        </div>
                      )}
                      <div className="p-5 flex flex-col flex-1 space-y-2">
                        <div className={`font-black text-lg sm:text-xl line-clamp-1 ${t.cardTitle}`}>{item.name || 'Produto sem nome'}</div>
                        {item.description && <div className={`text-sm leading-relaxed line-clamp-2 ${t.cardSub}`}>{item.description}</div>}
                        <div className="mt-auto pt-3 flex items-center justify-between border-t border-white/5" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                          <span className="font-black text-lg sm:text-xl" style={{ color: brandColor }}>{item.price}</span>
                          <span className="text-xs sm:text-sm font-extrabold px-4 py-2 rounded-full border transition-all details-btn">Ver Detalhes</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Payment Card Section */}
          {(pixKey || cardUrl) && (
            <div className={`p-6 sm:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group border w-full ${t.cardBg} ${t.cardBorder}`} style={{ backgroundColor: theme === 'dark' ? `${brandColor}10` : undefined }}>
              <div className="absolute top-0 left-0 w-full h-[4px] opacity-80 group-hover:opacity-100 transition-opacity" style={{ background: brandColor }} />
              
              <div className="flex flex-col md:flex-row items-stretch justify-between gap-6 sm:gap-8">
                {/* Left Side: Payment Info, Key Display and Copy Button */}
                <div className="flex-1 flex flex-col justify-between space-y-5 text-left w-full">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px',
                        borderRadius: '16px',
                        backgroundColor: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                      }}>
                        <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M38.8 50L50 38.8L61.2 50L50 61.2L38.8 50Z" fill="#32BCAD"/>
                          <path d="M50 15L85 50L50 85L15 50L50 15ZM25.6 50L50 74.4L74.4 50L50 25.6L25.6 50Z" fill="#32BCAD"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className={`font-black text-xl sm:text-2xl tracking-tight ${t.cardTitle}`}>Meios de Pagamento</h3>
                        <p className="text-xs sm:text-sm uppercase font-black text-teal-500 tracking-widest">Seguro • Rápido • Conveniente</p>
                      </div>
                    </div>
                    
                    <p className={`text-sm sm:text-base leading-relaxed font-medium ${t.pixSubtitle}`}>
                      {pixKey && cardUrl 
                        ? "Escolha a melhor forma para pagar: realize a transferência instantânea por PIX ou pague via Cartão de Crédito."
                        : pixKey 
                        ? "Realize pagamentos escaneando o código ao lado ou copiando a chave Pix comercial listada abaixo."
                        : "Realize o pagamento de forma segura através do link de pagamento via Cartão de Crédito."}
                    </p>
                  </div>

                  {pixKey && (
                    <div className="space-y-3">
                      <div className="bg-black/15 dark:bg-black/35 p-4 rounded-2xl border border-white/5 space-y-1 text-left" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <div className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Chave PIX ({pixType})</div>
                        <div className="text-base sm:text-lg md:text-xl font-mono font-black break-all select-all text-white" style={{ color: brandColor }}>
                          {pixKey}
                        </div>
                      </div>

                      <button 
                        onClick={handleCopyPix}
                        className={`w-full flex items-center justify-center p-4 sm:p-4.5 rounded-2xl font-black text-base sm:text-lg border transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-md bio-button ${t.iconBg}`}
                        style={{ 
                          color: brandColor, 
                          borderColor: `${brandColor}40`, 
                          backgroundColor: theme === 'dark' ? `${brandColor}15` : undefined
                        }}
                      >
                        {copiedPix ? <Check className="w-5 h-5 mr-2" /> : <Copy className="w-5 h-5 mr-2" />}
                        {copiedPix ? "Chave copiada!" : "Copiar Chave para Pix Copia e Cola"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Side: QR Code Box (only if pixKey exists) */}
                {pixKey && (
                  <div className="shrink-0 flex flex-col items-center justify-center gap-2 bg-black/5 dark:bg-black/20 p-5 rounded-[2rem] border border-white/5 w-full md:w-auto" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <div className="bg-white p-3 rounded-[1.5rem] w-40 h-40 flex items-center justify-center shadow-lg border border-slate-200/40">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=000000&data=${encodeURIComponent(pixKey)}`} 
                        alt="QR Code PIX" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-300 block tracking-wide text-center">Aponte a câmera para pagar</span>
                  </div>
                )}
              </div>

              {cardUrl && (
                <div className={pixKey ? "border-t border-dashed pt-4 border-slate-700/50 mt-6" : "mt-6"}>
                  <a 
                    href={cardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center p-4 sm:p-5 rounded-2xl font-black text-base sm:text-lg text-white transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-md border"
                    style={{ 
                      backgroundColor: brandColor,
                      borderColor: brandColor,
                      boxShadow: `0 4px 14px ${brandColor}40`
                    }}
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Pagar com Cartão de Crédito
                  </a>
                </div>
              )}
            </div>
          )}

          {/* 5.5 Address & Embedded Map Section (At the very bottom) */}
          {bio.address && (
            <div className="space-y-4 pt-4">
              <ContactCard 
                icon={MapPin} 
                title="Endereço" 
                value={bio.address} 
                href={bio.address_url ? bio.address_url : `https://maps.google.com/?q=${encodeURIComponent(bio.address)}`} 
              />
              
              <div 
                className="w-full aspect-video rounded-[2rem] overflow-hidden border shadow-inner relative z-0 animate-fade-in" 
                style={{ 
                  borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' 
                }}
              >
                <iframe
                  title="Localização Comercial"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(bio.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  className="w-full h-full border-0 rounded-[2rem]"
                  allowFullScreen={false}
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* 6. Admin Area / Login Footer Trigger */}
          <div className="pt-8 pb-4 text-center space-y-4">
            <div className="text-sm sm:text-base font-bold tracking-wider opacity-70 text-slate-400">
              Desenvolvido por <span className="font-extrabold" style={{ color: brandColor }}>CardDigital GM</span>
            </div>
            <div>
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold opacity-40 hover:opacity-100 hover-text-brand transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                Área Restrita / Login do Administrador
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* WEBSITE LOGIN MODAL OVERLAY */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setIsLoginOpen(false)}>
          <div 
            className={`w-full max-w-md rounded-[2rem] border overflow-hidden shadow-2xl flex flex-col ${theme === 'dark' ? 'bg-[#0e0e11] border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 flex items-center justify-between border-b" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5" style={{ color: brandColor }} />
                <span className="font-extrabold text-sm tracking-wide uppercase">Login do Administrador</span>
              </div>
              <button 
                onClick={() => setIsLoginOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-500/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleWebsiteLogin} className="p-6 space-y-4">
              <p className="text-xs text-slate-400">Entre com as suas credenciais para gerenciar a sua Bio CardDigital GM.</p>
              
              {loginError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-200 text-xs">
                  {loginError}
                </div>
              )}

              {loginSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-green-200 text-xs">
                  {loginSuccess}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider opacity-70">E-mail</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seu-email@dominio.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm border focus:outline-none transition-all focus-border-brand ${
                      theme === 'dark' 
                        ? 'bg-zinc-900 border-zinc-800 text-white' 
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider opacity-70">Senha</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Sua senha..."
                    className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm border focus:outline-none transition-all focus-border-brand ${
                      theme === 'dark' 
                        ? 'bg-zinc-900 border-zinc-800 text-white' 
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full flex items-center justify-center p-3.5 rounded-xl text-white font-bold transition-all shadow-md hover:brightness-110 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: brandColor }}
              >
                {loginLoading ? (
                  <span className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                ) : (
                  "Entrar no Painel"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Product Detail & Photo Gallery Modal */}
      {selectedProduct && (() => {
        const productImages = selectedProduct.images && selectedProduct.images.filter((img: string) => img.trim() !== "").length > 0
          ? selectedProduct.images.filter((img: string) => img.trim() !== "")
          : (selectedProduct.image_url ? [selectedProduct.image_url] : []);
        
        const activeImageUrl = productImages[activeImageIndex] || selectedProduct.image_url;
        const productLink = formatExternalUrl(selectedProduct.url);

        return (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setSelectedProduct(null)}>
            <div 
              className={`w-full max-w-lg rounded-[2rem] border overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                <span className="text-xs font-bold tracking-widest uppercase opacity-60">Detalhes do Produto</span>
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="p-1.5 rounded-full hover:bg-slate-500/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="overflow-y-auto flex-1 no-scrollbar p-5 space-y-5">
                {/* Image Gallery */}
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white border flex items-center justify-center p-2" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                  {activeImageUrl ? (
                    <img 
                      src={activeImageUrl} 
                      alt={selectedProduct.name} 
                      className="max-w-full max-h-full object-contain" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-30">
                      <ShoppingCart className="w-12 h-12 text-slate-400" />
                    </div>
                  )}

                  {/* Left / Right Gallery Arrows */}
                  {productImages.length > 1 && (
                    <>
                      <button 
                        onClick={() => setActiveImageIndex(prev => (prev - 1 + productImages.length) % productImages.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors shadow-lg z-10"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setActiveImageIndex(prev => (prev + 1) % productImages.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors shadow-lg z-10"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails Gallery Row */}
                {productImages.length > 1 && (
                  <div className="flex gap-2 justify-center overflow-x-auto pb-1 no-scrollbar">
                    {productImages.map((img: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 bg-white p-0.5 flex items-center justify-center ${activeImageIndex === idx ? 'scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        style={activeImageIndex === idx ? { borderColor: brandColor } : undefined}
                      >
                        <img src={img} alt={`Thumbnail ${idx + 1}`} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Product Meta */}
                <div className="space-y-3 pt-1">
                  <h3 className="text-xl font-extrabold tracking-tight">{selectedProduct.name || 'Produto sem nome'}</h3>
                  {selectedProduct.price && (
                    <div className="text-xl font-black" style={{ color: brandColor }}>{selectedProduct.price}</div>
                  )}
                  {selectedProduct.description && (
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${theme === 'dark' ? 'text-zinc-300' : 'text-slate-600'}`}>
                      {selectedProduct.description}
                    </p>
                  )}
                </div>

                {/* Quantity Selector */}
                <div className="pt-3 border-t" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold opacity-80">Quantidade</span>
                    <div className="flex items-center gap-1 bg-black/10 dark:bg-white/5 rounded-full p-1 border" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                      <button 
                        onClick={() => setProductQuantity(prev => Math.max(1, prev - 1))}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-lg transition-colors font-bold cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-bold text-sm">{productQuantity}</span>
                      <button 
                        onClick={() => setProductQuantity(prev => prev + 1)}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-lg transition-colors font-bold cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer (Action buttons) */}
              <div className="p-4 border-t flex flex-col gap-2 shrink-0" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      addToCart(selectedProduct, productQuantity);
                      setSelectedProduct(null);
                    }}
                    className={`flex-1 flex items-center justify-center p-3.5 rounded-xl font-bold transition-all shadow-md border cursor-pointer ${
                      theme === 'dark' 
                        ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border-zinc-800' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                    }`}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </button>
                  
                  <button 
                    onClick={() => {
                      addToCart(selectedProduct, productQuantity);
                      setSelectedProduct(null);
                      setIsCartOpen(true);
                    }}
                    className="flex-1 flex items-center justify-center p-3.5 rounded-xl text-white font-bold transition-all shadow-md hover:brightness-110 active:scale-[0.98] cursor-pointer"
                    style={{ backgroundColor: brandColor }}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Comprar Já
                  </button>
                </div>
                
                {productLink && (
                  <a 
                    href={productLink}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center py-2 text-xs font-semibold opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <Globe className="w-3.5 h-3.5 mr-1.5" />
                    Ver no Site Original
                  </a>
                )}
                
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className={`w-full py-2.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                    theme === 'dark' 
                      ? 'bg-transparent text-zinc-400 hover:text-white border-zinc-800 hover:bg-zinc-900' 
                      : 'bg-transparent text-slate-500 hover:text-slate-800 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Voltar ao Catálogo
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Shopping Cart FAB Button */}
      {cartTotalItems > 0 && (
        <button
          onClick={() => {
            setCheckoutStep("cart");
            setIsCartOpen(true);
          }}
          className={`fixed bottom-6 right-20 z-[140] flex items-center gap-2 px-5 py-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-transform font-bold text-white cursor-pointer group`}
          style={{ backgroundColor: brandColor }}
        >
          <div className="relative">
            <ShoppingBag className="w-6 h-6" />
            <span className="absolute -top-2.5 -right-2.5 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black shadow-md border border-white/10 group-hover:animate-pulse">
              {cartTotalItems}
            </span>
          </div>
          <span className="hidden sm:inline-block text-sm ml-1">{formatPrice(cartTotalPrice)}</span>
        </button>
      )}

      {/* Shopping Cart Drawer / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[160] flex justify-end bg-black/75 backdrop-blur-sm animate-fade-in" onClick={() => setIsCartOpen(false)}>
          <div 
            className={`w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 ${
              theme === 'dark' ? 'bg-[#0e0e11] text-white border-l border-zinc-800' : 'bg-white text-slate-900 border-l border-slate-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 flex items-center justify-between border-b" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" style={{ color: brandColor }} />
                <h3 className="font-extrabold text-lg">Seu Carrinho</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold" style={{ color: brandColor, backgroundColor: `${brandColor}15` }}>
                  {cartTotalItems} {cartTotalItems === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-500/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content area: Cart items list OR checkout form */}
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-500/10 flex items-center justify-center opacity-40">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-base">Seu carrinho está vazio</p>
                  <p className="text-xs opacity-60 max-w-[240px]">Adicione produtos do catálogo para iniciar seu pedido.</p>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white transition-all shadow-md hover:brightness-110 cursor-pointer"
                  style={{ backgroundColor: brandColor }}
                >
                  Continuar Navegando
                </button>
              </div>
            ) : (
              <>
                {/* Checkout flow steps indicator */}
                <div className="px-5 pt-4 pb-2 flex gap-2">
                  <button 
                    onClick={() => setCheckoutStep("cart")}
                    className={`flex-1 py-1.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      checkoutStep === "cart" 
                        ? "" 
                        : "border-transparent opacity-50"
                    }`}
                    style={checkoutStep === "cart" ? { borderColor: brandColor, color: brandColor } : undefined}
                  >
                    1. Carrinho
                  </button>
                  <button 
                    onClick={() => setCheckoutStep("checkout")}
                    className={`flex-1 py-1.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      checkoutStep === "checkout" 
                        ? "" 
                        : "border-transparent opacity-50"
                    }`}
                    style={checkoutStep === "checkout" ? { borderColor: brandColor, color: brandColor } : undefined}
                  >
                    2. Dados de Entrega
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-6">
                  {checkoutStep === "cart" ? (
                    <div className="space-y-4">
                      {cart.map((item, idx) => {
                        const itemPriceParsed = parsePrice(item.product.price);
                        const itemTotal = itemPriceParsed * item.quantity;
                        return (
                          <div 
                            key={idx}
                            className={`flex gap-4 p-4 rounded-3xl border transition-all ${
                              theme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200/60'
                            }`}
                          >
                            {/* Product Thumbnail */}
                            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white shrink-0 border border-black/5 flex items-center justify-center p-1">
                              {item.product.image_url ? (
                                <img src={item.product.image_url} alt={item.product.name} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-20">
                                  <ShoppingCart className="w-8 h-8 text-slate-400" />
                                </div>
                              )}
                            </div>

                            {/* Info & Quantity controls */}
                            <div className="flex-1 flex flex-col justify-between min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <div className="min-w-0">
                                  <h4 className="font-extrabold text-sm sm:text-base truncate pr-1">{item.product.name}</h4>
                                  <p className="text-[11px] opacity-60 mt-0.5">Unitário: {formatPrice(itemPriceParsed)}</p>
                                </div>
                                <button 
                                  onClick={() => removeFromCart(item.product.id)}
                                  className="text-red-500 hover:text-red-600 transition-colors p-1 cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              
                              <div className="flex items-end justify-between mt-2">
                                <div className="flex flex-col">
                                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">Subtotal</span>
                                  <span className="text-sm font-black" style={{ color: brandColor }}>{formatPrice(itemTotal)}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 bg-black/15 dark:bg-white/10 rounded-full p-1 border" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }}>
                                  <button 
                                    onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-sm font-bold cursor-pointer"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-6 text-center font-black text-xs">{item.quantity}</span>
                                  <button 
                                    onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-sm font-bold cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Clear cart action */}
                      <div className="flex justify-end pt-1">
                        <button 
                          onClick={clearCart}
                          className="text-xs font-bold opacity-60 hover:opacity-100 text-red-500 transition-opacity flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Limpar Todo o Carrinho
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5 animate-fade-in">
                      {/* Customer info form */}
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            Seu Nome <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            placeholder="Como podemos te chamar?"
                            value={orderName}
                            onChange={(e) => setOrderName(e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl text-sm border focus:outline-none transition-all focus-border-brand ${
                              theme === 'dark' 
                                ? 'bg-zinc-900 border-zinc-800 text-white' 
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" />
                            WhatsApp / Telefone para Contato
                          </label>
                          <input 
                            type="tel" 
                            placeholder="Ex: (99) 99999-9999"
                            value={orderPhone}
                            onChange={(e) => setOrderPhone(e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl text-sm border focus:outline-none transition-all focus-border-brand ${
                              theme === 'dark' 
                                ? 'bg-zinc-900 border-zinc-800 text-white' 
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>

                        {/* Delivery Option Selector */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5" />
                            Opção de Entrega <span className="text-red-500">*</span>
                          </label>
                          <div className="grid grid-cols-2 gap-2 bg-black/10 dark:bg-white/5 p-1 rounded-xl border" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                            <button
                              type="button"
                              onClick={() => setDeliveryOption("pickup")}
                              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                deliveryOption === "pickup"
                                  ? (theme === 'dark' ? 'bg-zinc-800 text-white shadow' : 'bg-white text-slate-900 shadow')
                                  : 'opacity-60 hover:opacity-100'
                              }`}
                            >
                              Retirar no Local
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeliveryOption("delivery")}
                              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                deliveryOption === "delivery"
                                  ? (theme === 'dark' ? 'bg-zinc-800 text-white shadow' : 'bg-white text-slate-900 shadow')
                                  : 'opacity-60 hover:opacity-100'
                              }`}
                            >
                              Receber em Casa
                            </button>
                          </div>
                        </div>

                        {/* Delivery Address fields */}
                        {deliveryOption === "delivery" && (
                          <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                            <label className="text-xs font-bold uppercase tracking-wider opacity-70">
                              Endereço Completo de Entrega <span className="text-red-500">*</span>
                            </label>
                            <textarea 
                              placeholder="Rua, número, bairro, cidade, referências..."
                              value={deliveryAddress}
                              onChange={(e) => setDeliveryAddress(e.target.value)}
                              rows={3}
                              className={`w-full px-4 py-3 rounded-xl text-sm border focus:outline-none transition-all resize-none focus-border-brand ${
                                theme === 'dark' 
                                  ? 'bg-zinc-900 border-zinc-800 text-white' 
                                  : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            />
                          </div>
                        )}
                      </div>

                      {/* Pix section inside the drawer */}
                      {pixKey && (
                        <div className={`p-4 rounded-2xl border space-y-3.5 text-center shadow-md relative overflow-hidden bg-black/10 dark:bg-white/5`} style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                          <div className="absolute top-0 left-0 w-full h-[3px]" style={{ background: brandColor }} />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-left">
                              <CreditCard className="w-4 h-4" style={{ color: brandColor }} />
                              <span className="text-xs font-bold uppercase tracking-wider">Pagamento via PIX</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-500/10 text-green-500">Opcional no site</span>
                          </div>
                          <p className="text-xs opacity-75 text-left leading-relaxed">
                            Pague agora escaneando ou copiando a chave PIX, finalize seu pedido e anexe o comprovante na mensagem!
                          </p>
                          <div className="bg-white p-2.5 rounded-xl inline-block shadow border">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(pixBrCode || pixKey)}`} 
                              alt="QR Code Pix"
                              className="w-28 h-28 object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] opacity-60">Chave PIX:</span>
                            <div className="font-extrabold text-xs break-all mt-0.5 select-all" style={{ color: brandColor }}>{pixKey}</div>
                          </div>
                          <button 
                            onClick={handleCopyPix}
                            className={`w-full flex items-center justify-center py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                              theme === 'dark' ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {copiedPix ? <Check className="w-4 h-4 mr-1.5 text-green-500" /> : <Copy className="w-4 h-4 mr-1.5" />}
                            {copiedPix ? "Chave copiada!" : "Copiar Chave PIX"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Drawer Footer with Cart totals & WhatsApp Checkout action */}
                <div className="p-6 border-t space-y-4 shrink-0 bg-black/10 dark:bg-black/40" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }}>
                  <div className="space-y-2 border-b pb-3" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center justify-between text-xs opacity-75">
                      <span>Subtotal dos itens:</span>
                      <span className="font-bold">{formatPrice(cartTotalPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs opacity-75">
                      <span>Entrega:</span>
                      <span className="font-bold text-green-500">A combinar / Grátis</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-extrabold text-sm uppercase tracking-wide opacity-80">Total do Pedido:</span>
                    <span className="text-2xl font-black tracking-tight" style={{ color: brandColor }}>{formatPrice(cartTotalPrice)}</span>
                  </div>

                  {checkoutStep === "cart" ? (
                    <button 
                      onClick={() => setCheckoutStep("checkout")}
                      className="w-full flex items-center justify-center p-4 rounded-2xl text-white font-black text-sm transition-all shadow-lg hover:brightness-110 active:scale-[0.98] cursor-pointer"
                      style={{ backgroundColor: brandColor }}
                    >
                      Avançar para Entrega
                      <ChevronRight className="w-5 h-5 ml-1.5" />
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <button 
                        onClick={handleCheckoutWhatsApp}
                        className="w-full flex items-center justify-center p-4 rounded-2xl text-white font-black text-sm transition-all shadow-lg hover:brightness-110 active:scale-[0.98] cursor-pointer bg-green-600 hover:bg-green-700"
                      >
                        <MessageCircle className="w-5 h-5 mr-2" />
                        Finalizar e Enviar via WhatsApp
                      </button>
                      
                      <button 
                        onClick={() => setCheckoutStep("cart")}
                        className="w-full py-2 text-xs font-bold opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        Voltar para o Carrinho
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Indicadores de rolagem vertical (Público & Preview) */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-2 pointer-events-none">
        {/* Seta para Cima */}
        <button
          type="button"
          onClick={() => {
            if (mainScrollRef.current) {
              mainScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className={`transition-all duration-300 flex items-center justify-center w-10 h-10 rounded-full bg-black/75 border border-zinc-800/80 shadow-lg pointer-events-auto cursor-pointer hover:scale-110 active:scale-95 ${
            canScrollUp ? "opacity-100 translate-y-0 animate-bounce" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
          style={{ color: brandColor }}
          title="Rolar para o topo"
        >
          <ChevronUp className="w-5 h-5" />
        </button>

        {/* Seta para Baixo */}
        <button
          type="button"
          onClick={() => {
            if (mainScrollRef.current) {
              mainScrollRef.current.scrollBy({ top: mainScrollRef.current.clientHeight * 0.7, behavior: "smooth" });
            }
          }}
          className={`transition-all duration-300 flex items-center justify-center w-10 h-10 rounded-full bg-black/75 border border-zinc-800/80 shadow-lg pointer-events-auto cursor-pointer hover:scale-110 active:scale-95 ${
            canScrollDown ? "opacity-100 translate-y-0 animate-bounce" : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
          style={{ color: brandColor }}
          title="Rolar para baixo"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
