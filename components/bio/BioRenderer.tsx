import React, { useState, useEffect, useRef } from "react";
import { Globe, Instagram, Facebook, Mail, Phone, MapPin, Copy, Box, FileText, Check, MessageCircle, Send, Linkedin, Twitter, Youtube, Link as LinkIcon, Music, Headphones, Github, ShoppingCart, Store, Utensils, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Share2, X, Trash2, ShoppingBag, Plus, Minus, CreditCard, User, Truck, Lock, Eye, EyeOff, ZoomIn , Layout, ExternalLink, Menu, Home } from "lucide-react";
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

export const BrandWhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <path d="M15.05 13.52c-.17-.11-.47-.23-.62-.29-.15-.06-.26-.1-.36.03-.13.17-.4.48-.52.61-.1.12-.2.13-.37.07a4.93 4.93 0 0 1-1.42-.9c-.55-.49-.92-1.09-1.02-1.29-.11-.18 0-.28.07-.36.08-.08.18-.21.27-.32.09-.1.12-.17.18-.3a.4.4 0 0 0-.01-.39c-.04-.1-.36-.88-.49-1.22-.13-.32-.27-.28-.36-.28h-.27c-.15 0-.39.06-.59.28-.2.22-.76.75-.76 1.83s.77 2.12.88 2.27c.1.15 1.52 2.37 3.69 3.32.52.22.92.36 1.24.46.52.17.99.14 1.36.09.41-.06 1.27-.52 1.45-1 .18-.49.18-.91.13-1-.05-.09-.2-.14-.42-.25z" />
  </svg>
);

export const BrandTelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m21.13 2.87-17.5 9.17a.5.5 0 0 0-.07.91l4.81 2.21 3.12 5.92a.5.5 0 0 0 .9.03l1.52-2.95 4.3 3.3a.5.5 0 0 0 .8-.32l2.9-17.5a.5.5 0 0 0-.18-.67z" />
    <path d="m9.38 13.87 4.13-4.85" />
  </svg>
);

export const BrandInstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export const getPlatformIcon = (platform: string) => {
  switch (platform?.toLowerCase()) {
    case 'whatsapp': return BrandWhatsAppIcon;
    case 'telegram': return BrandTelegramIcon;
    case 'instagram': return BrandInstagramIcon;
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

export default function BioRenderer({ data, asPreview = false, previewMode }: { data: any, asPreview?: boolean, previewMode?: "smartphone" | "pc" }) {
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<"bio" | "contact" | "portfolio">("bio");
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChatWidgetOpen, setIsChatWidgetOpen] = useState(true);
  const [contactName, setContactName] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState("");
  const [needsActivation, setNeedsActivation] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const bio = data?.bio_config || {};
  const siteFont = bio.site_font || "inter";
  const siteFontSize = bio.site_font_size || "md";
  const bgAnimation = bio.bg_animation || "parallax";

  const customSvgs: Record<string, string> = {
    whatsapp: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/whatsapp.svg",
    telegram: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/telegram.svg",
    instagram: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/instagram.svg",
    facebook: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/facebook.svg",
    email: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/email.svg",
    address: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/localizacao.svg"
  };

  const socialIcons = [
    { key: "whatsapp", icon: BrandWhatsAppIcon, label: "WhatsApp", value: bio.whatsapp, href: bio.whatsapp ? `https://api.whatsapp.com/send?phone=${bio.whatsapp.replace(/\D/g, '')}` : undefined, svgUrl: customSvgs.whatsapp },
    { key: "instagram", icon: BrandInstagramIcon, label: "Instagram", value: bio.instagram, href: bio.instagram ? (bio.instagram.includes('http') ? bio.instagram : `https://instagram.com/${bio.instagram.replace('@','')}`) : undefined, svgUrl: customSvgs.instagram },
    { key: "telegram", icon: BrandTelegramIcon, label: "Telegram", value: bio.telegram, href: bio.telegram ? (bio.telegram.includes('http') ? bio.telegram : `https://t.me/${bio.telegram.replace('@', '')}`) : undefined, svgUrl: customSvgs.telegram },
    { key: "email", icon: Mail, label: "E-mail", value: bio.email, href: bio.email ? `mailto:${bio.email}` : undefined, svgUrl: customSvgs.email },
    { key: "facebook", icon: Facebook, label: "Facebook", value: bio.facebook, href: bio.facebook ? (bio.facebook.includes('http') ? bio.facebook : `https://facebook.com/${bio.facebook}`) : undefined, svgUrl: customSvgs.facebook },
    { key: "linkedin", icon: Linkedin, label: "LinkedIn", value: bio.linkedin, href: bio.linkedin ? (bio.linkedin.includes('http') ? bio.linkedin : `https://linkedin.com/in/${bio.linkedin}`) : undefined },
    { key: "tiktok", icon: Music, label: "TikTok", value: bio.tiktok, href: bio.tiktok ? (bio.tiktok.includes('http') ? bio.tiktok : `https://tiktok.com/@${bio.tiktok.replace('@','')}`) : undefined },
    { key: "phone", icon: Phone, label: "Telefone", value: bio.phone, href: bio.phone ? `tel:${bio.phone.replace(/\D/g, '')}` : undefined },
    { key: "address", icon: MapPin, label: "Endereço", value: bio.address, href: bio.address_url ? bio.address_url : (bio.address ? `https://maps.google.com/?q=${encodeURIComponent(bio.address)}` : undefined), svgUrl: customSvgs.address }
  ].filter(item => item.value);

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
  const [orderCpfCnpj, setOrderCpfCnpj] = useState("");
  const [customAlert, setCustomAlert] = useState<{ title: string; message: string } | null>(null);
  const [deliveryOption, setDeliveryOption] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "checkout">("cart");
  const [productQuantity, setProductQuantity] = useState(1);
  const [isPixExpanded, setIsPixExpanded] = useState(false);
  const [isCardExpanded, setIsCardExpanded] = useState(false);

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

  // Dynamically update favicon and Open Graph meta tags with client's general app logo and name
  useEffect(() => {
    const clientLogo = data?.company_logo_url;
    const clientName = data?.company_name || bio.title || "GM EDIFICAÇÃO";
    
    // Dynamically update document title
    document.title = `Informações do seu pedido - ${clientName}`;

    const updateMetaTag = (property: string, content: string) => {
      let element = document.querySelector(`meta[property='${property}']`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute("property", property);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    updateMetaTag("og:title", `Informações do seu pedido - ${clientName}`);
    updateMetaTag("og:description", "Acesse nosso catálogo e faça seu pedido de forma rápida e segura!");
    if (clientLogo) {
      updateMetaTag("og:image", clientLogo);
    }

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
  }, [data?.company_logo_url, data?.company_name, bio.title]);

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
      setCustomAlert({
        title: companyName,
        message: "Por favor, informe seu nome e preencha os dados para o pedido."
      });
      return;
    }
    if (deliveryOption === "delivery" && !deliveryAddress.trim()) {
      setCustomAlert({
        title: companyName,
        message: "Por favor, preencha o endereço de entrega."
      });
      return;
    }

    const cleanedWhatsapp = (bio.whatsapp || bio.phone || "").replace(/\D/g, "");
    if (!cleanedWhatsapp) {
      setCustomAlert({
        title: companyName,
        message: "Desculpe, este estabelecimento não configurou um número de WhatsApp para receber pedidos."
      });
      return;
    }

    // Format items list
    const itemsText = cart.map(item => {
      const itemTotal = parsePrice(item.product.price) * item.quantity;
      const itemImage = item.product.image_url ? `\n  📸 Foto: ${item.product.image_url}` : "";
      return `• *${item.product.name}* (x${item.quantity}) - ${formatPrice(itemTotal)}${itemImage}`;
    }).join("\n");

    const header = `*🛍️ NOVO PEDIDO - ${companyName.toUpperCase()}*\n`;
    const storeUrl = window.location.href.split('?')[0].split('&')[0];
    const storeLink = `🔗 *Site:* ${storeUrl}\n`;
    const clientDetails = `*Cliente:* ${orderName.trim()}\n${orderPhone.trim() ? `*Telefone:* ${orderPhone.trim()}\n` : ""}${orderCpfCnpj.trim() ? `*CPF/CNPJ:* ${orderCpfCnpj.trim()}\n` : ""}`;
    const deliveryDetails = deliveryOption === "delivery" 
      ? `*Entrega:* Receber em Casa 🚚\n*Endereço:* ${deliveryAddress.trim()}\n` 
      : `*Entrega:* Retirar no Local 🏪\n`;
    
    const totals = `\n*Total do Pedido: ${formatPrice(cartTotalPrice)}*`;
    
    let paymentDetails = "";
    if (pixKey) {
      if (pixKey.startsWith("000201")) {
        paymentDetails = `\n\n*💳 FORMA DE PAGAMENTO:* PIX\n*PIX Copia e Cola:*\n${pixKey}\n\n_Por favor, realize o pagamento e envie o comprovante de transferência junto com este pedido!_`;
      } else {
        paymentDetails = `\n\n*💳 FORMA DE PAGAMENTO:* PIX\n*Chave:* ${pixKey} (${pixType})\n\n_Por favor, realize o pagamento e envie o comprovante de transferência junto com este pedido!_`;
      }
    }
    if (cardUrl) {
      paymentDetails += `\n\n*💳 FORMA DE PAGAMENTO:* CARTÃO DE CRÉDITO\n*Link de Pagamento:* ${cardUrl}`;
    }

    const message = `${header}${storeLink}\n${clientDetails}${deliveryDetails}\n*PRODUTOS:*\n${itemsText}${totals}${paymentDetails}\n\nAgradeço a preferência!`;
    const encoded = encodeURIComponent(message);
    const whatsappClean = (bio.whatsapp || bio.phone || '').replace(/\D/g, '');
    const whatsappNumber = whatsappClean.startsWith('55') || whatsappClean.length > 11 ? whatsappClean : `55${whatsappClean}`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encoded}`;
    
    window.open(whatsappUrl, "_blank");
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      setContactError("Por favor, preencha todos os campos.");
      return;
    }

    setContactSubmitting(true);
    setContactError("");
    setContactSuccess(false);
    setNeedsActivation(false);

    // Dynamic recipient email from bio configuration (trimmed to avoid spaces issues)
    const recipientEmail = (bio.email || data?.email || "gmedificacao@gmail.com").trim();
    setSubmittedEmail(recipientEmail);

    try {
      const response = await fetch(`https://formsubmit.co/ajax/${recipientEmail}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          message: contactMessage,
          _subject: `Novo contato de ${contactName} pelo site`
        })
      });

      const result = await response.json();
      const isTrueSuccess = result.success === "true" || result.success === true;

      if (isTrueSuccess || response.ok) {
        // If result.success is false/not true, FormSubmit typically needs activation on the recipient email
        if (!isTrueSuccess) {
          setNeedsActivation(true);
        } else {
          setNeedsActivation(false);
        }
        setContactSuccess(true);
        setContactName("");
        setContactEmail("");
        setContactMessage("");
      } else {
        setContactError(result.message || "Ocorreu um erro ao enviar sua mensagem. Tente novamente mais tarde.");
      }
    } catch (err) {
      console.error("Erro ao enviar contato:", err);
      setContactError("Não foi possível enviar a mensagem no momento. Verifique sua conexão.");
    } finally {
      setContactSubmitting(false);
    }
  };

  const logo = data?.company_logo_url;
  const companyName = bio.title || data?.company_name || "Perfil";
  const desc = bio.description || "";
  const brandColor = bio.color || data?.brand_primary || "#32BCAD";
  const theme = bio.theme || "dark";
  const buttonStyle = data?.button_style || "solid";

  const generatePixPayload = (key: string, name: string = "GM Edificacao", city: string = "SAO LUIS") => {
    if (!key) return "";
    let cleanKey = key.trim();
    
    // If it's already a full Pix Copia e Cola (BR Code)
    if (cleanKey.startsWith("000201") && cleanKey.length > 50) {
      return cleanKey;
    }

    const typeStr = (pixType || "").toLowerCase();
    
    // Auto-detect or use explicit type
    const isEmail = cleanKey.includes("@") || typeStr.includes("email") || typeStr.includes("e-mail");
    const isEvp = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cleanKey) || typeStr.includes("aleat");
    
    if (isEmail) {
      // Keep email as is
    } else if (isEvp) {
      // Keep random key as is
    } else {
      // Strip all non-digits
      const digits = cleanKey.replace(/\D/g, "");
      
      if (typeStr.includes("telefone") || typeStr.includes("phone") || (digits.length >= 10 && digits.length <= 11 && !digits.startsWith("0") && !typeStr.includes("cpf") && !typeStr.includes("cnpj"))) {
        // Brazilian phone number format: +55 + DDD + Number
        if (digits.startsWith("55") && digits.length >= 12) {
          cleanKey = `+${digits}`;
        } else {
          cleanKey = `+55${digits}`;
        }
      } else {
        // Default to just numbers (CPF, CNPJ)
        cleanKey = digits;
      }
    }

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
      bg: "bg-gradient-to-br from-slate-950 via-[#0a0d14] to-slate-900",
      textTitle: "text-white",
      textDesc: "text-slate-300",
      iconBg: "bg-white/8 backdrop-blur-2xl border border-white/8 shadow-md",
      cardBg: "bg-white/[0.04] backdrop-blur-2xl border border-white/8 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]",
      cardBgHover: "hover:bg-white/[0.08] hover:border-white/15",
      cardBorder: "border-white/8",
      cardBorderHover: "hover:border-white/20",
      cardTitle: "text-white font-extrabold",
      cardSub: "text-slate-300",
      pixSubtitle: "text-slate-300"
    }
  };

  const t = themeClasses[theme as keyof typeof themeClasses] || themeClasses.dark;

  


  const handleCopyPix = () => {
    const pix = pixBrCode || bio.pix_key || data?.pix_key;
    if (!pix) return;
    navigator.clipboard.writeText(pix);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const ContactCard = ({ icon: Icon, title, value, href }: { icon: any, title: string, value?: string, href?: string }) => {
    if (!value && !href) return null;
    
    const Wrapper = href ? "a" : "div";
    const formattedHref = formatExternalUrl(href);
    const isNeon = buttonStyle === "neon";

    // Dynamic styles based on buttonStyle
    const containerStyle = isNeon ? {
      borderColor: brandColor,
      backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.35)' : 'rgba(255, 255, 255, 0.75)',
    } : {
      backgroundColor: brandColor,
      borderColor: brandColor,
    };

    const textStyle = isNeon ? {
      color: brandColor,
    } : {
      color: '#ffffff',
    };

    const iconStyle = isNeon ? {
      color: brandColor,
      backgroundColor: theme === 'dark' ? `${brandColor}20` : `${brandColor}10`,
    } : {
      color: brandColor,
      backgroundColor: '#ffffff',
    };
    
    return (
        // @ts-ignore
      <Wrapper 
        href={asPreview ? undefined : formattedHref}
        target={href ? "_blank" : undefined}
        rel={href ? "noreferrer" : undefined}
        className={`w-full flex items-center p-4 sm:p-5 rounded-full border group select-none cursor-pointer transition-all duration-300 transform active:scale-98 shadow-sm hover:shadow-md bio-button`}
        style={containerStyle}
        onClick={(e: any) => { if (asPreview && href) e.preventDefault(); }}
      >
        <div 
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform" 
          style={iconStyle}
        >
          <Icon className="w-5.5 h-5.5 sm:w-6 sm:h-6" />
        </div>
        <div className="flex-1 text-center pr-11 sm:pr-12">
          <div 
            className="text-lg sm:text-xl md:text-2xl font-black tracking-wide px-2 py-0.5" 
            style={textStyle}
          >
            {title}
          </div>
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
      setScrollTop(el.scrollTop);
    }
  };

  const handleLogoClick = () => {
    setActiveView("bio");
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
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
    if (activeView === "portfolio" && activePortfolioId) {
      const timer = setTimeout(() => {
        const el = document.getElementById("portfolio-detail-section");
        if (el && mainScrollRef.current) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeView, activePortfolioId]);

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

  const renderScrollButtons = (isInsideCart: boolean) => {
    return (
      <div 
        className={
          isInsideCart 
            ? "absolute right-full mr-4 bottom-6 flex flex-col gap-2.5 pointer-events-none z-[999]"
            : "fixed right-6 bottom-6 z-[999] flex flex-col gap-2.5 pointer-events-none transition-all duration-300"
        }
      >
        {/* Seta para Cima */}
        <button
          type="button"
          onClick={() => {
            if (mainScrollRef.current) {
              mainScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className={`transition-all duration-300 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/75 border border-zinc-800/80 shadow-lg pointer-events-auto cursor-pointer hover:scale-110 active:scale-95 ${
            canScrollUp ? "opacity-100 translate-y-0 animate-bounce" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
          style={{ color: brandColor }}
          title="Rolar para o topo"
        >
          <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Seta para Baixo */}
        <button
          type="button"
          onClick={() => {
            if (mainScrollRef.current) {
              mainScrollRef.current.scrollBy({ top: mainScrollRef.current.clientHeight * 0.7, behavior: "smooth" });
            }
          }}
          className={`transition-all duration-300 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/75 border border-zinc-800/80 shadow-lg pointer-events-auto cursor-pointer hover:scale-110 active:scale-95 ${
            canScrollDown ? "opacity-100 translate-y-0 animate-bounce" : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
          style={{ color: brandColor }}
          title="Rolar para baixo"
        >
          <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    );
  };

  return (
    <div 
      className={`w-full ${!asPreview ? "fixed inset-0" : "relative h-full"} overflow-hidden ${t.bg} selection-brand site-font-${siteFont} site-size-${siteFontSize}`}
      style={{ zoom: '0.95' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@400;500;700&family=Montserrat:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        /* Fonts for Site */
        .site-font-inter, .site-font-inter button, .site-font-inter input, .site-font-inter textarea, .site-font-inter select, .site-font-inter span, .site-font-inter p, .site-font-inter h1, .site-font-inter h2, .site-font-inter h3, .site-font-inter h4, .site-font-inter h5, .site-font-inter h6 {
          font-family: 'Inter', sans-serif !important;
        }
        .site-font-space, .site-font-space button, .site-font-space input, .site-font-space textarea, .site-font-space select, .site-font-space span, .site-font-space p, .site-font-space h1, .site-font-space h2, .site-font-space h3, .site-font-space h4, .site-font-space h5, .site-font-space h6 {
          font-family: 'Space Grotesk', sans-serif !important;
        }
        .site-font-serif, .site-font-serif button, .site-font-serif input, .site-font-serif textarea, .site-font-serif select, .site-font-serif span, .site-font-serif p, .site-font-serif h1, .site-font-serif h2, .site-font-serif h3, .site-font-serif h4, .site-font-serif h5, .site-font-serif h6 {
          font-family: 'Playfair Display', serif !important;
        }
        .site-font-mono, .site-font-mono button, .site-font-mono input, .site-font-mono textarea, .site-font-mono select, .site-font-mono span, .site-font-mono p, .site-font-mono h1, .site-font-mono h2, .site-font-mono h3, .site-font-mono h4, .site-font-mono h5, .site-font-mono h6 {
          font-family: 'JetBrains Mono', monospace !important;
        }
        .site-font-montserrat, .site-font-montserrat button, .site-font-montserrat input, .site-font-montserrat textarea, .site-font-montserrat select, .site-font-montserrat span, .site-font-montserrat p, .site-font-montserrat h1, .site-font-montserrat h2, .site-font-montserrat h3, .site-font-montserrat h4, .site-font-montserrat h5, .site-font-montserrat h6 {
          font-family: 'Montserrat', sans-serif !important;
        }
        .site-font-jakarta, .site-font-jakarta button, .site-font-jakarta input, .site-font-jakarta textarea, .site-font-jakarta select, .site-font-jakarta span, .site-font-jakarta p, .site-font-jakarta h1, .site-font-jakarta h2, .site-font-jakarta h3, .site-font-jakarta h4, .site-font-jakarta h5, .site-font-jakarta h6 {
          font-family: 'Plus Jakarta Sans', sans-serif !important;
        }

        /* Font Size Scales */
        .site-size-sm { font-size: 14px !important; }
        .site-size-md { font-size: 16px !important; }
        .site-size-lg { font-size: 18px !important; }
        .site-size-xl { font-size: 20px !important; }

        .site-size-sm .text-xs { font-size: 0.65rem !important; }
        .site-size-sm .text-sm { font-size: 0.75rem !important; }
        .site-size-sm .text-base { font-size: 0.85rem !important; }
        .site-size-sm .text-lg { font-size: 0.95rem !important; }
        .site-size-sm .text-xl { font-size: 1.1rem !important; }
        .site-size-sm .text-2xl { font-size: 1.3rem !important; }
        .site-size-sm .text-3xl { font-size: 1.6rem !important; }
        .site-size-sm .text-4xl { font-size: 2rem !important; }
        .site-size-sm .text-5xl { font-size: 2.5rem !important; }

        .site-size-lg .text-xs { font-size: 0.8rem !important; }
        .site-size-lg .text-sm { font-size: 0.95rem !important; }
        .site-size-lg .text-base { font-size: 1.1rem !important; }
        .site-size-lg .text-lg { font-size: 1.25rem !important; }
        .site-size-lg .text-xl { font-size: 1.4rem !important; }
        .site-size-lg .text-2xl { font-size: 1.7rem !important; }
        .site-size-lg .text-3xl { font-size: 2.2rem !important; }
        .site-size-lg .text-4xl { font-size: 2.8rem !important; }
        .site-size-lg .text-5xl { font-size: 3.5rem !important; }

        .site-size-xl .text-xs { font-size: 0.85rem !important; }
        .site-size-xl .text-sm { font-size: 1rem !important; }
        .site-size-xl .text-base { font-size: 1.2rem !important; }
        .site-size-xl .text-lg { font-size: 1.4rem !important; }
        .site-size-xl .text-xl { font-size: 1.6rem !important; }
        .site-size-xl .text-2xl { font-size: 1.9rem !important; }
        .site-size-xl .text-3xl { font-size: 2.5rem !important; }
        .site-size-xl .text-4xl { font-size: 3.2rem !important; }
        .site-size-xl .text-5xl { font-size: 4rem !important; }

        /* Background Animations */
        @keyframes aurora-bg {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-aurora {
          background: linear-gradient(-45deg, ${brandColor}15, ${brandColor}05, #111318, #181b22);
          background-size: 300% 300%;
          animation: aurora-bg 12s ease infinite;
        }
        .animate-aurora-light {
          background: linear-gradient(-45deg, ${brandColor}08, ${brandColor}03, #f8fafc, #f1f5f9);
          background-size: 300% 300%;
          animation: aurora-bg 12s ease infinite;
        }

        @keyframes blob-drift-1 {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes blob-drift-2 {
          0% { transform: translate(0px, 0px) scale(1.1); }
          50% { transform: translate(-40px, 40px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1.1); }
        }
        @keyframes blob-drift-3 {
          0% { transform: translate(0px, 0px) scale(0.9); }
          50% { transform: translate(50px, -20px) scale(1.15); }
          100% { transform: translate(0px, 0px) scale(0.9); }
        }
        .animate-blob1 { animation: blob-drift-1 12s infinite alternate ease-in-out; }
        .animate-blob2 { animation: blob-drift-2 16s infinite alternate ease-in-out; }
        .animate-blob3 { animation: blob-drift-3 14s infinite alternate ease-in-out; }

        @keyframes color-loop {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes vertical-color-loop {
          0% { background-position: 50% 0%; }
          50% { background-position: 50% 100%; }
          100% { background-position: 50% 0%; }
        }
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
          border-color: ${brandColor}35 !important;
          transition: all 0.2s ease-in-out !important;
        }
        .group:hover .details-btn {
          background-color: ${brandColor} !important;
          color: #ffffff !important;
          border-color: ${brandColor} !important;
        }
        .hover-text-brand:hover {
          color: ${brandColor} !important;
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
        .bio-desc-font-classic {
          font-family: 'Montserrat', sans-serif !important;
        }
        [class*="bio-desc-font-"] * {
          background: transparent !important;
          background-color: transparent !important;
          text-shadow: none !important;
          box-shadow: none !important;
        }
        [class*="bio-desc-font-"] {
          text-shadow: none !important;
          box-shadow: none !important;
        }

        /* Optimize images and vector icons rendering for absolute crispness */
        img, svg {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: auto;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          transform: translateZ(0);
        }
        /* Smooth, hardware-accelerated scroll and rendering */
        .custom-scroll, .no-scrollbar {
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }
      `}</style>
      
      {/* Background Animated Gradient / Aurora */}
      {bgAnimation === "aurora" && (
        <div className={`absolute inset-0 z-0 transition-all duration-1000 ${theme === "dark" || theme === "glass" ? "animate-aurora" : "animate-aurora-light"}`} />
      )}

      {/* Background Floating Particles / Aura */}
      {bgAnimation === "particles" && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-45 transition-all duration-1000">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full blur-3xl animate-blob1" style={{ backgroundColor: `${brandColor || '#fe540b'}22` }} />
          <div className="absolute top-2/3 right-1/4 w-96 h-96 rounded-full blur-3xl animate-blob2" style={{ backgroundColor: `${brandColor || '#fe540b'}15` }} />
          <div className="absolute bottom-10 left-1/3 w-80 h-80 rounded-full blur-3xl animate-blob3" style={{ backgroundColor: `${brandColor || '#fe540b'}18` }} />
        </div>
      )}

      {/* Background Desktop (supports Parallax) */}
      {bgImg && (
        <div 
          className={`absolute z-0 bg-cover bg-center bg-no-repeat opacity-20 transition-all duration-75 ease-out ${
            bgAnimation === "parallax" 
              ? "-top-[15%] -bottom-[15%] left-0 right-0 h-[130%] scale-[1.15]" 
              : "inset-0"
          } ${bgMobileImg ? (asPreview && previewMode === 'smartphone' ? 'hidden' : asPreview && previewMode === 'pc' ? 'block' : 'hidden md:block') : "block"}`} 
          style={{ 
            backgroundImage: `url(${bgImg})`,
            transform: bgAnimation === "parallax" ? `translate3d(0, ${Math.max(-150, -scrollTop * 0.06)}px, 0)` : 'none'
          }} 
        />
      )}
      {/* Background Smartphone (supports Parallax) */}
      {bgMobileImg && (
        <div 
          className={`absolute z-0 bg-cover bg-center bg-no-repeat opacity-20 transition-all duration-75 ease-out ${
            bgAnimation === "parallax" 
              ? "-top-[15%] -bottom-[15%] left-0 right-0 h-[130%] scale-[1.15]" 
              : "inset-0"
          } ${asPreview && previewMode === 'pc' ? 'hidden' : asPreview && previewMode === 'smartphone' ? 'block' : 'block md:hidden'}`} 
          style={{ 
            backgroundImage: `url(${bgMobileImg})`,
            transform: bgAnimation === "parallax" ? `translate3d(0, ${Math.max(-120, -scrollTop * 0.06)}px, 0)` : 'none'
          }} 
        />
      )}

      <div 
        ref={mainScrollRef}
        onScroll={handleScroll}
        className={`w-full h-full relative z-10 overflow-y-auto overflow-x-hidden ${!asPreview ? "custom-scroll" : "no-scrollbar"}`}
      >
        <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 w-full">
          <div className="w-full">
          
          {/* Header & Banner Wrapper to overlay profile on top of the banner when enabled */}
          <div className="flex flex-col w-full">
            {(() => {
              const desktopBanner = bio.banner_img_url_1;
              const mobileBanner = bio.mobile_banner_img_url_1;
              const finalDesktop = desktopBanner || mobileBanner;
              const finalMobile = mobileBanner || desktopBanner;
              const hasBanners = bio.show_banners && (desktopBanner || mobileBanner);

              // Helper to render the Profile Header with optional over-banner styles
              const renderProfileHeader = (isOverBanner: boolean) => {
                const descAlignClass = bio.description_align === "left" ? "text-left" : bio.description_align === "right" ? "text-right" : "text-center";
                const descBoldClass = bio.description_bold ? "font-bold" : "font-semibold";
                const descItalicClass = bio.description_italic ? "italic" : "not-italic";
                const descFontClass = `bio-desc-font-${bio.description_font || "ui"}`;
                const descMarginClass = bio.description_align === "left" ? "mr-auto" : bio.description_align === "right" ? "ml-auto" : "mx-auto";

                return (
                  <div className={`text-center space-y-3.5 sm:space-y-4 ${isOverBanner ? "relative z-20 text-white w-full px-4" : "pt-2"}`}>
                    <div 
                      className={`w-20 h-20 sm:w-28 sm:h-28 mx-auto rounded-full overflow-hidden border-[3px] flex items-center justify-center p-1 shadow-2xl relative ${isOverBanner ? "bg-black/35 backdrop-blur-md border-white/40" : t.iconBg}`} 
                      style={{ borderColor: isOverBanner ? undefined : `${brandColor}50` }}
                    >
                      {logo ? (
                        <img src={logo} alt={companyName} className="w-full h-full object-contain rounded-full" />
                      ) : (
                        <div className="text-2xl sm:text-3xl font-bold" style={{ color: isOverBanner ? '#ffffff' : brandColor }}>
                          {companyName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="px-2 space-y-2 sm:space-y-3">
                      <h1 className={`text-2xl sm:text-3xl md:text-5xl font-black tracking-tight ${isOverBanner ? "text-white drop-shadow-md" : t.textTitle}`}>{companyName}</h1>
                      {desc && (
                        <div 
                          className={`mt-1.5 ${getFontSizeClass(bio.description_size)} max-w-4xl leading-relaxed whitespace-pre-wrap tracking-wide ${descMarginClass} ${descAlignClass} ${descBoldClass} ${descItalicClass} ${descFontClass} ${isOverBanner ? "text-zinc-100/95 drop-shadow-sm" : `${t.textDesc}`}`}
                          dangerouslySetInnerHTML={{ __html: desc }}
                        />
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="pt-2 flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-2.5 w-full max-w-[280px] sm:max-w-none mx-auto">
                      {bio.portfolio_items && bio.portfolio_items.length > 0 && (
                        <button 
                          onClick={() => {
                            const el = document.getElementById("portfolio-section");
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={`flex items-center justify-center px-6 py-2.5 rounded-full text-xs sm:text-sm font-extrabold shadow-[0_6px_20px_0_rgba(0,0,0,0.15)] cursor-pointer transition-all duration-300 transform hover:scale-105 active:scale-95 text-white bg-gradient-to-r w-full sm:w-auto`}
                          style={{ 
                            backgroundImage: `linear-gradient(to right, ${brandColor}, ${brandColor}dd)`,
                          }}
                        >
                          Veja nosso Portfólio
                        </button>
                      )}

                      <button 
                        onClick={handleShareBio}
                        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-extrabold border shadow-sm cursor-pointer transition-all duration-200 transform active:scale-95 bio-button w-full sm:w-auto ${isOverBanner ? "bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm" : `${t.cardBg} ${t.cardBgHover} ${t.cardBorder}`}`}
                        style={{ 
                          color: isOverBanner ? '#ffffff' : brandColor, 
                          borderColor: isOverBanner ? 'rgba(255,255,255,0.25)' : `${brandColor}40`
                        }}
                      >
                        <Share2 className="w-4 h-4" />
                        {copiedShare ? "Link Copiado!" : "Compartilhar Bio"}
                      </button>
                    </div>

                    {/* Redes sociais clicáveis pequenos */}
                    {socialIcons.length > 0 && (
                      <div className="flex flex-wrap justify-center items-center gap-3 pt-3">
                        {socialIcons.map((item) => {
                          const IconComp = item.icon;
                          const formattedHref = formatExternalUrl(item.href);
                          return (
                            <a
                              key={item.key}
                              href={asPreview ? undefined : formattedHref}
                              target="_blank"
                              rel="noreferrer"
                              title={item.label}
                              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 border transform hover:scale-110 hover:border-orange-500/50 active:scale-95 shadow-lg backdrop-blur-md"
                              style={{
                                backgroundColor: 'rgba(12, 12, 15, 0.75)',
                                borderColor: 'rgba(255, 255, 255, 0.12)',
                              }}
                              onClick={(e) => { if (asPreview) e.preventDefault(); }}
                            >
                              {item.svgUrl ? (
                                <img 
                                  src={item.svgUrl} 
                                  alt={item.label} 
                                  className="w-7 h-7 sm:w-8 sm:h-8 object-contain" 
                                />
                              ) : (
                                <IconComp className="w-5 h-5 sm:w-5.5 sm:h-5.5" style={{ color: brandColor || '#ff6900' }} />
                              )}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              };

              if (!hasBanners) {
                return (
                  <div className="w-full flex flex-col space-y-6">
                    {/* Minimal Desktop Top Navbar */}
                    <div className={`${asPreview && previewMode === 'smartphone' ? 'hidden' : asPreview && previewMode === 'pc' ? 'block' : 'hidden md:block'} w-full h-28 sm:h-32 bg-white/10 dark:bg-black/20 backdrop-blur-md border-b border-black/5 dark:border-white/5 flex items-center justify-between px-6 md:px-12 relative z-30`}>
                      <div className="flex items-center gap-4 cursor-pointer hover:opacity-85 transition-opacity" onClick={handleLogoClick}>
                        {logo ? (
                          <img src={logo} alt={companyName} className="h-14 sm:h-16 w-auto object-contain rounded-md shadow-sm" />
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-xl sm:text-2xl text-white" style={{ backgroundColor: brandColor }}>
                            {companyName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className={`font-extrabold text-xl sm:text-2xl tracking-tight ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>{companyName}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-5 mr-4 border-r border-black/10 dark:border-white/10 pr-6">
                          <button 
                            onClick={() => setActiveView("bio")} 
                            className={`text-base font-bold transition-all hover:opacity-100 cursor-pointer ${
                              (activeView as string) === "bio" 
                                ? "opacity-100 border-b-2 font-black" 
                                : "opacity-60"
                            } ${theme === 'dark' || theme === 'glass' ? 'text-white border-white' : 'text-slate-900 border-slate-900'}`}
                          >
                            Início
                          </button>
                          <button 
                            onClick={() => setActiveView("contact")} 
                            className={`text-base font-bold transition-all hover:opacity-100 cursor-pointer ${
                              (activeView as string) === "contact" 
                                ? "opacity-100 border-b-2 font-black" 
                                : "opacity-60"
                            } ${theme === 'dark' || theme === 'glass' ? 'text-white border-white' : 'text-slate-900 border-slate-900'}`}
                          >
                            Contato
                          </button>
                        </div>
                        <button onClick={handleShareBio} className={`text-base font-bold opacity-70 hover:opacity-100 transition-opacity flex items-center gap-2 cursor-pointer ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>
                          <Share2 className="w-5 h-5" /> Compartilhar
                        </button>
                      </div>
                      
                      {/* Thin animated bar */}
                      <div 
                        className="w-full h-[3px] absolute bottom-0 left-0 right-0 z-50"
                        style={{
                          background: `linear-gradient(90deg, ${brandColor}, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, ${brandColor})`,
                          backgroundSize: '300% 300%',
                          animation: 'color-loop 5s ease infinite',
                        }}
                      />
                    </div>

                    {/* Minimal Mobile Top Navbar */}
                    <div className={`${asPreview && previewMode === 'pc' ? 'hidden' : asPreview && previewMode === 'smartphone' ? 'block' : 'block md:hidden'} w-full h-[88px] bg-white/10 dark:bg-black/20 backdrop-blur-md border-b border-black/5 dark:border-white/5 flex items-center justify-between px-4 relative z-30`}>
                      <div className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity" onClick={handleLogoClick}>
                        {logo ? (
                          <img src={logo} alt={companyName} className="h-10 w-auto object-contain rounded-md" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white" style={{ backgroundColor: brandColor }}>
                            {companyName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className={`font-extrabold text-sm tracking-tight ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>{companyName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setActiveView("bio")} 
                          className={`text-xs font-bold transition-all hover:opacity-100 cursor-pointer ${
                            (activeView as string) === "bio" 
                              ? "opacity-100 border-b-2 font-black border-slate-900 dark:border-white text-slate-900 dark:text-white" 
                              : "opacity-60 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          Início
                        </button>
                        <button 
                          onClick={() => setActiveView("contact")} 
                          className={`text-xs font-bold transition-all hover:opacity-100 cursor-pointer ${
                            (activeView as string) === "contact" 
                              ? "opacity-100 border-b-2 font-black border-slate-900 dark:border-white text-slate-900 dark:text-white" 
                              : "opacity-60 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          Contato
                        </button>
                      </div>
                      
                      {/* Thin animated bar */}
                      <div 
                        className="w-full h-[3px] absolute bottom-0 left-0 right-0 z-50"
                        style={{
                          background: `linear-gradient(90deg, ${brandColor}, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, ${brandColor})`,
                          backgroundSize: '300% 300%',
                          animation: 'color-loop 5s ease infinite',
                        }}
                      />
                    </div>

                    {activeView === "bio" && renderProfileHeader(false)}
                  </div>
                );
              }

              return (
                <>
                  {/* Desktop Banner overlay */}
                  {finalDesktop && (
                    <div className={`${asPreview && previewMode === 'smartphone' ? 'hidden' : asPreview && previewMode === 'pc' ? 'block' : 'hidden md:block'} w-full flex flex-col`}>
                      {/* Desktop Top Navbar */}
                      <div className="w-full h-24 sm:h-28 bg-white/10 dark:bg-black/20 backdrop-blur-md border-b border-black/5 dark:border-white/5 flex items-center justify-between px-6 md:px-12 relative z-30">
                        <div className="flex items-center gap-4 cursor-pointer hover:opacity-85 transition-opacity" onClick={handleLogoClick}>
                          {logo ? (
                            <img src={logo} alt={companyName} className="h-10 sm:h-12 w-auto object-contain rounded-md shadow-sm transition-all" />
                          ) : (
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center font-bold text-lg sm:text-xl text-white shadow-sm" style={{ backgroundColor: brandColor }}>
                              {companyName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className={`font-extrabold text-lg sm:text-xl tracking-tight ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>{companyName}</span>
                        </div>
                        <div className="flex items-center gap-6">
                           {/* Navigation Menu */}
                           <div className="flex items-center gap-4 mr-4 border-r border-black/10 dark:border-white/10 pr-6">
                             <button 
                               onClick={() => setActiveView("bio")} 
                               className={`text-sm sm:text-base font-bold transition-all hover:opacity-100 cursor-pointer ${
                                 (activeView as string) === "bio" 
                                   ? "opacity-100 border-b-2 font-black" 
                                   : "opacity-60"
                               } ${theme === 'dark' || theme === 'glass' ? 'text-white border-white' : 'text-slate-900 border-slate-900'}`}
                             >
                               Início
                             </button>
                             <button 
                               onClick={() => setActiveView("contact")} 
                               className={`text-sm sm:text-base font-bold transition-all hover:opacity-100 cursor-pointer ${
                                 (activeView as string) === "contact" 
                                   ? "opacity-100 border-b-2 font-black" 
                                   : "opacity-60"
                               } ${theme === 'dark' || theme === 'glass' ? 'text-white border-white' : 'text-slate-900 border-slate-900'}`}
                             >
                               Contato
                             </button>
                           </div>

                           <button onClick={handleShareBio} className={`text-sm sm:text-base font-bold opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1.5 cursor-pointer ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>
                             <Share2 className="w-4 h-4" /> Compartilhar
                           </button>
                           {socialIcons.length > 0 && (
                             <div className="flex items-center gap-4 border-l border-black/10 dark:border-white/10 pl-6">
                               {socialIcons.map((item) => {
                                 const IconComp = item.icon;
                                 const colorToUse = "#FE540B"; // Bright orange as requested
                                 return (
                                   <a 
                                     key={item.key} 
                                     href={asPreview ? undefined : formatExternalUrl(item.href)} 
                                     target="_blank" 
                                     rel="noreferrer" 
                                     title={item.label} 
                                     className="flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer" 
                                     onClick={(e) => { if (asPreview) e.preventDefault(); }}
                                   >
                                     {item.svgUrl ? (
                                       <img 
                                         src={item.svgUrl} 
                                         alt={item.label} 
                                         className="w-6 h-6 sm:w-6.5 sm:h-6.5 object-contain" 
                                       />
                                     ) : (
                                       <IconComp className="w-5 h-5 sm:w-5.5 sm:h-5.5" style={{ color: colorToUse }} />
                                     )}
                                   </a>
                                 )
                               })}
                             </div>
                           )}
                        </div>
                        
                        {/* Thin animated bar */}
                        <div 
                          className="w-full h-[3px] absolute bottom-0 left-0 right-0 z-50"
                          style={{
                            background: `linear-gradient(90deg, ${brandColor}, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, ${brandColor})`,
                            backgroundSize: '300% 300%',
                            animation: 'color-loop 5s ease infinite',
                          }}
                        />
                      </div>

                      {/* Desktop Hero Section */}
                      <div className="w-full relative group bg-black/10 transition-all duration-300" style={{ aspectRatio: "1920 / 680" }}>
                        <div className="w-full h-full relative">
                          <img 
                            src={activeView === "contact" ? (bio.contact_banner_img_url || finalDesktop) : finalDesktop} 
                            alt="Banner Desktop" 
                            className="w-full h-full object-cover absolute inset-0" 
                            referrerPolicy="no-referrer" 
                          />
                          
                          {/* Gradient overlay for text readability */}
                          {activeView !== "contact" && (
                            <div className={`absolute inset-0 z-10 ${bio.description_align === 'center' ? 'bg-black/40' : bio.description_align === 'right' ? 'bg-gradient-to-l from-black/80 via-black/40 to-transparent' : 'bg-gradient-to-r from-black/80 via-black/40 to-transparent'}`} />
                          )}
                          
                          {/* Overlaid Profile Content (Hero Text) */}
                          {activeView !== "contact" && (
                            <div className="absolute inset-0 z-20 flex flex-col justify-center py-6">
                              <div className={`w-full max-w-[1150px] mx-auto px-4 md:px-8 lg:px-12 flex flex-col ${bio.description_align === 'center' ? 'items-center text-center' : bio.description_align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
                                 <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-2xl leading-tight">
                                   {companyName}
                                 </h1>
                                 {desc && (
                                   <div 
                                     className={`mt-4 text-base md:text-lg lg:text-xl text-zinc-100 max-w-2xl leading-relaxed whitespace-pre-wrap ${bio.description_bold ? 'font-bold' : 'font-medium'} ${bio.description_italic ? 'italic' : ''}`}
                                     dangerouslySetInnerHTML={{ __html: desc }}
                                   />
                                 )}
                                 
                                 {bio.portfolio_items && bio.portfolio_items.length > 0 && (
                                   <div className="mt-8 flex">
                                     <button 
                                       onClick={() => {
                                         const el = document.getElementById("portfolio-section");
                                         if (el) el.scrollIntoView({ behavior: 'smooth' });
                                       }}
                                       className="flex items-center px-8 py-3.5 rounded-full text-lg font-extrabold shadow-lg cursor-pointer transition-all duration-300 transform hover:scale-105 active:scale-95 text-white bg-gradient-to-r"
                                       style={{ 
                                         backgroundImage: `linear-gradient(to right, ${brandColor}, ${brandColor}dd)`,
                                       }}
                                     >
                                       Veja nosso Portfólio
                                     </button>
                                   </div>
                                 )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mobile Banner overlay */}
                  {finalMobile && (
                    <div 
                      className={`${asPreview && previewMode === 'pc' ? 'hidden' : asPreview && previewMode === 'smartphone' ? 'block' : 'block md:hidden'} w-full relative group transition-all duration-300 flex flex-col`}
                    >
                      {/* Mobile Top Navbar with Desktop Glass/Blur Effect */}
                      <div className="w-full h-[88px] bg-white/10 dark:bg-black/20 backdrop-blur-md border-b border-black/5 dark:border-white/5 flex items-center justify-between px-5 relative z-40">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={handleLogoClick}>
                          {logo ? (
                            <img src={logo} alt={companyName} className="h-7 w-auto object-contain rounded" />
                          ) : (
                            <svg className={`w-5.5 h-6.5 shrink-0 ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-[#FE540B]'}`} viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M4 6C4 3.79086 5.79086 2 8 2H14C16.2091 2 18 3.79086 18 6V20C18 22.2091 16.2091 24 14 24H8C5.79086 24 4 22.2091 4 20V12H11V16H8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          <span className={`font-extrabold text-[15px] sm:text-base tracking-tight truncate ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>{companyName}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <button 
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                            className={`p-2 -mr-2 hover:opacity-75 transition-opacity focus:outline-none cursor-pointer z-40 relative ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}
                          >
                            {isMobileMenuOpen ? (
                              <X className="w-6 h-6 stroke-[2.5]" />
                            ) : (
                              <Menu className="w-6 h-6 stroke-[2.5]" />
                            )}
                          </button>
                        </div>

                        {/* Hamburger Slide Down Dropdown Menu */}
                        {isMobileMenuOpen && (
                          <div className={`absolute top-[88px] inset-x-0 z-50 flex flex-col p-6 space-y-4 shadow-xl animate-in slide-in-from-top-4 duration-300 border-b ${theme === 'dark' || theme === 'glass' ? 'bg-zinc-950/95 backdrop-blur-md border-white/10' : 'bg-white border-zinc-100'}`}>
                            <button 
                              onClick={() => {
                                setActiveView("bio");
                                setIsMobileMenuOpen(false);
                                setActivePortfolioId(null);
                              }}
                              className={`text-left text-sm font-bold uppercase tracking-wider py-3 border-b ${theme === 'dark' || theme === 'glass' ? 'border-white/10 text-white hover:text-white/85' : 'border-zinc-100 text-zinc-800'} ${activeView === 'bio' ? 'text-[#FE540B] dark:text-[#FE540B]' : ''}`}
                            >
                              Início
                            </button>
                            <button 
                              onClick={() => {
                                setActiveView("contact");
                                setIsMobileMenuOpen(false);
                              }}
                              className={`text-left text-sm font-bold uppercase tracking-wider py-3 border-b ${theme === 'dark' || theme === 'glass' ? 'border-white/10 text-white hover:text-white/85' : 'border-zinc-100 text-zinc-800'} ${activeView === 'contact' ? 'text-[#FE540B] dark:text-[#FE540B]' : ''}`}
                            >
                              Contato
                            </button>
                            {bio.portfolio_items && bio.portfolio_items.length > 0 && (
                              <button 
                                onClick={() => {
                                  setIsMobileMenuOpen(false);
                                  const el = document.getElementById("portfolio-section");
                                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className={`text-left text-sm font-bold uppercase tracking-wider py-3 border-b ${theme === 'dark' || theme === 'glass' ? 'border-white/10 text-white hover:text-white/85' : 'border-zinc-100 text-zinc-800'}`}
                              >
                                Portfólio
                              </button>
                            )}
                            
                            {socialIcons.length > 0 && (
                              <div className="flex items-center gap-3.5 pt-3">
                                {socialIcons.map((item) => {
                                  const IconComp = item.icon;
                                  return (
                                    <a 
                                      key={item.key} 
                                      href={asPreview ? undefined : formatExternalUrl(item.href)} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      title={item.label} 
                                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer border ${theme === 'dark' || theme === 'glass' ? 'bg-zinc-900 border-white/10' : 'bg-zinc-50 border-zinc-100'}`} 
                                      onClick={(e) => { if (asPreview) e.preventDefault(); }}
                                    >
                                      {item.svgUrl ? (
                                        <img 
                                          src={item.svgUrl} 
                                          alt={item.label} 
                                          className="w-5.5 h-5.5 object-contain" 
                                        />
                                      ) : (
                                        <IconComp className={`w-5 h-5 ${theme === 'dark' || theme === 'glass' ? 'text-zinc-300' : 'text-zinc-700'}`} />
                                      )}
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Thin animated bar */}
                        <div 
                          className="w-full h-[3px] absolute bottom-0 left-0 right-0 z-50"
                          style={{
                            background: `linear-gradient(90deg, ${brandColor}, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, ${brandColor})`,
                            backgroundSize: '300% 300%',
                            animation: 'color-loop 5s ease infinite',
                          }}
                        />
                      </div>

                      {/* Main Banner Hero Area */}
                      <div className="w-full relative min-h-[500px] py-14 px-6 flex flex-col items-center justify-center text-center overflow-hidden">
                        <img 
                          src={activeView === "contact" ? (bio.contact_banner_img_url || finalMobile) : finalMobile} 
                          alt="Banner Mobile" 
                          className="w-full h-full object-cover absolute inset-0 z-0" 
                          referrerPolicy="no-referrer" 
                        />
                        
                        {/* High-Contrast Progressive Black Gradient Overlay for Impeccable Readability */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/85 z-10" />
                        
                        {/* Overlaid Hero Content - Centered with title, about section, and button on top of the banner */}
                        {activeView !== "contact" && (
                          <div className="relative z-20 w-full flex flex-col items-center justify-center text-center space-y-6">
                            <h1 className="text-[34px] sm:text-[38px] font-black tracking-tight text-white leading-[1.1] select-none max-w-[95%] text-center drop-shadow-md">
                              {bio.title || companyName || "Criando marcas que conectam"}
                            </h1>
                            
                            {desc && (
                              <div className="w-full flex flex-col items-center space-y-3.5 pt-6 max-w-sm border-t border-white/10 mt-6">
                                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans uppercase">
                                  Sobre a
                                </h2>
                                <div 
                                  className="text-[16px] sm:text-lg font-bold leading-relaxed text-zinc-100 whitespace-pre-wrap font-sans text-center drop-shadow-sm px-2"
                                  dangerouslySetInnerHTML={{ __html: desc }}
                                />
                              </div>
                            )}

                            <button 
                              onClick={() => {
                                const el = document.getElementById("portfolio-section");
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth' });
                                } else {
                                  setActiveView("bio");
                                }
                              }}
                              className="px-8 py-3.5 bg-[#FE540B] hover:bg-[#ff3d00] text-white rounded-full text-base font-extrabold shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer mt-4"
                            >
                              Veja nosso Portfólio
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div className={`${asPreview && previewMode !== 'pc' ? (activeView === "portfolio" ? "-mx-4 w-[calc(100%+2rem)]" : "") : activeView === "portfolio" ? "w-full max-w-none px-0 mt-2 sm:mt-4" : "max-w-[1150px] mx-auto px-4 md:px-8 lg:px-12 mt-6 sm:mt-10"} space-y-6 sm:space-y-8 w-full`}>

          {activeView === "portfolio" ? (
            <div className="animate-fade-in w-full pb-10">
               {(() => {
                  let portfolioItem = null;
                  if (bio.portfolio_items) {
                     portfolioItem = bio.portfolio_items.find((p) => p.id === activePortfolioId);
                  }
                  if (!portfolioItem) {
                    return <div className="text-center py-10">Portfólio não encontrado.</div>;
                  }
                  const currentIndex = (bio.portfolio_items || []).findIndex((p: any) => p.id === activePortfolioId);
                  const prevPortfolio = currentIndex > 0 ? bio.portfolio_items[currentIndex - 1] : null;
                  const nextPortfolio = currentIndex !== -1 && currentIndex < (bio.portfolio_items || []).length - 1 ? bio.portfolio_items[currentIndex + 1] : null;
                  
                  const isNewFormat = !!portfolioItem.layers;
                  const images = isNewFormat ? portfolioItem.layers : [{ id: portfolioItem.id, image_url: portfolioItem.image_url }];
                  
                  const descriptionAlignClass = portfolioItem.description_align === "left" ? "text-left" : portfolioItem.description_align === "right" ? "text-right" : "text-center";
                  const descriptionBoldClass = portfolioItem.description_bold ? "font-bold" : "font-medium";
                  const descriptionItalicClass = portfolioItem.description_italic ? "italic" : "not-italic";
                  const descriptionFontClass = `bio-desc-font-${portfolioItem.description_font || "ui"}`;
                  const descriptionSizeClass = getFontSizeClass(portfolioItem.description_size);

                  return (
                     <div className="space-y-0 w-full" id="portfolio-detail-section">
                        <div 
                          className="max-w-[1600px] mx-auto w-full px-4 md:px-8 lg:px-12 py-6 sm:py-10 flex items-center justify-between font-bold text-xl sm:text-2xl md:text-3xl"
                          style={{ color: brandColor || 'var(--primary-color)' }}
                        >
                           {/* Previous portfolio item button */}
                           {prevPortfolio ? (
                             <button 
                               onClick={() => { 
                                 setActivePortfolioId(prevPortfolio.id); 
                               }} 
                               className="hover:opacity-70 transition-opacity flex items-center gap-2 cursor-pointer"
                             >
                               <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" /> {prevPortfolio.title || "Anterior"}
                             </button>
                           ) : (
                             <div />
                           )}

                           {/* Next portfolio item button */}
                           {nextPortfolio ? (
                             <button 
                               onClick={() => { 
                                 setActivePortfolioId(nextPortfolio.id); 
                               }} 
                               className="hover:opacity-70 transition-opacity flex items-center gap-2 cursor-pointer text-right"
                             >
                               {nextPortfolio.title || "Próximo"} <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                             </button>
                           ) : (
                             <div />
                           )}
                        </div>
                        
                        <div className="max-w-[1600px] mx-auto w-full px-4 md:px-8 lg:px-12 pb-12 sm:pb-20">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-start">
                            <h2 className={`text-4xl sm:text-5xl md:text-6xl font-black tracking-tight ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>
                              {portfolioItem.title || "Portfólio"}
                            </h2>
                            {portfolioItem.description && (
                              <div className={`whitespace-pre-wrap ${descriptionAlignClass} ${descriptionBoldClass} ${descriptionItalicClass} ${descriptionSizeClass} ${descriptionFontClass} ${theme === 'dark' || theme === 'glass' ? 'text-slate-300' : 'text-slate-700'}`}>
                                {portfolioItem.description}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="w-full flex flex-col items-center">
                           {images.map((img, idx) => (
                             <img key={img.id || idx} src={img.image_url} alt={`Banner ${idx+1}`} className="w-full max-w-[1600px] h-auto object-contain block mx-auto" loading={idx === 0 ? "eager" : "lazy"} />
                           ))}
                        </div>

                        {(prevPortfolio || nextPortfolio) && (
                          <div className="max-w-[1600px] mx-auto w-full px-4 md:px-8 lg:px-12 py-16 flex items-center justify-between font-bold text-xl sm:text-2xl md:text-3xl" style={{ color: brandColor || 'var(--primary-color)' }}>
                             {prevPortfolio ? (
                                <button onClick={() => { setActivePortfolioId(prevPortfolio.id); if (mainScrollRef.current) mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:opacity-70 transition-opacity flex items-center gap-2 cursor-pointer">
                                  <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" /> {prevPortfolio.title || "Anterior"}
                                </button>
                             ) : <div />}

                             {nextPortfolio ? (
                                <button onClick={() => { setActivePortfolioId(nextPortfolio.id); if (mainScrollRef.current) mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:opacity-70 transition-opacity flex items-center gap-2 cursor-pointer text-right">
                                  {nextPortfolio.title || "Próximo"} <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                                </button>
                             ) : <div />}
                          </div>
                        )}
                     </div>
                  );
               })()}
            </div>
          ) : activeView === "contact" ? (
            <div className="animate-fade-in py-6 sm:py-12 w-full">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center max-w-6xl mx-auto px-2 sm:px-6">
                
                {/* Left column: Title, Text */}
                <div className="lg:col-span-5 flex flex-col space-y-10">
                  <div className="space-y-6">
                    <h2 className={`text-5xl sm:text-6xl lg:text-7xl font-sans font-black tracking-tight leading-none ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>
                      {bio.contact_title || "Fale com a gente"}
                    </h2>
                    {bio.contact_desc && (
                      <p className={`text-base sm:text-lg font-medium leading-relaxed opacity-85 ${theme === 'dark' || theme === 'glass' ? 'text-zinc-300' : 'text-slate-600'}`}>
                        {bio.contact_desc}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right column: Form */}
                <div className={`lg:col-span-7 ${
                  theme === 'glass'
                    ? 'p-6 sm:p-10 rounded-[2.5rem] border bg-[#0a0b10]/45 backdrop-blur-2xl border-white/10 shadow-xl'
                    : theme === 'dark'
                      ? 'p-6 sm:p-10 rounded-[2.5rem] border bg-zinc-950/80 border-zinc-800 shadow-xl'
                      : 'p-0 bg-transparent border-0 shadow-none'
                }`}>
                  <form onSubmit={handleContactSubmit} className="space-y-6">
                    {contactSuccess ? (
                      <div className="py-12 text-left sm:text-center space-y-6">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 mx-auto flex items-center justify-center font-bold">
                          <Check className="w-8 h-8" />
                        </div>
                        
                        {needsActivation ? (
                          <div className="space-y-4 max-w-xl mx-auto">
                            <h4 className={`text-xl sm:text-2xl font-black text-center ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>
                              Atenção: Ative seu e-mail!
                            </h4>
                            <div className={`p-5 rounded-2xl border text-sm text-left leading-relaxed ${
                              theme === 'glass' || theme === 'dark'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                : 'bg-amber-50 border-amber-200 text-amber-900'
                            }`}>
                              <p className="font-bold mb-2">📌 Passos obrigatórios para receber as mensagens no seu e-mail:</p>
                              <ol className="list-decimal list-inside space-y-2 font-medium opacity-90">
                                <li>Acesse a sua caixa de entrada do e-mail: <strong className="underline break-all">{submittedEmail}</strong></li>
                                <li>Procure por uma mensagem enviada por <strong className="underline">FormSubmit</strong> (verifique também a pasta de <strong>Spam / Lixo Eletrônico</strong> ou abas como "Promoções" ou "Social").</li>
                                <li>Clique no botão verde escrito <strong className="uppercase">"Activate Form"</strong> (Ativar Formulário).</li>
                                <li>Pronto! Depois de clicar nesse botão uma única vez, todas as mensagens seguintes dos seus clientes chegarão direto na sua caixa de entrada de forma imediata e gratuita.</li>
                              </ol>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 max-w-xl mx-auto">
                            <h4 className={`text-xl sm:text-2xl font-black text-center ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>
                              Mensagem Enviada!
                            </h4>
                            <p className={`text-sm text-center ${theme === 'dark' || theme === 'glass' ? 'text-slate-400' : 'text-slate-600'}`}>
                              Obrigado pelo contato. Recebemos seus dados e responderemos o mais rápido possível no e-mail cadastrado (<strong className="break-all">{submittedEmail}</strong>).
                            </p>
                          </div>
                        )}

                        <div className="text-center">
                          <button 
                            type="button" 
                            onClick={() => { setContactSuccess(false); setNeedsActivation(false); }}
                            className="px-6 py-2.5 rounded-full text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 cursor-pointer inline-block"
                            style={{ backgroundColor: brandColor || "#FE540B" }}
                          >
                            Enviar nova mensagem
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {contactError && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 text-red-300 text-xs font-bold animate-pulse">
                            {contactError}
                          </div>
                        )}

                        <div className="space-y-6">
                                                  {/* Name Field */}
                          <div>
                            <input 
                              type="text"
                              id="contact_name"
                              required
                              placeholder="Nome"
                              value={contactName}
                              onChange={(e) => setContactName(e.target.value)}
                              className={`w-full px-6 py-5 text-base sm:text-lg border focus:outline-none transition-all focus:ring-0 ${
                                theme === 'glass'
                                  ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-white/30 rounded-2xl'
                                  : theme === 'dark' 
                                    ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-700 rounded-2xl' 
                                    : 'bg-transparent border-zinc-300 text-slate-900 placeholder-zinc-400 focus:border-[#FE540B] rounded-none'
                              }`}
                              style={{ borderColor: (theme === 'glass' || theme === 'dark') ? undefined : undefined }}
                            />
                          </div>

                          {/* Email Field */}
                          <div>
                            <input 
                              type="email"
                              id="contact_email"
                              required
                              placeholder="Email"
                              value={contactEmail}
                              onChange={(e) => setContactEmail(e.target.value)}
                              className={`w-full px-6 py-5 text-base sm:text-lg border focus:outline-none transition-all focus:ring-0 ${
                                theme === 'glass'
                                  ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-white/30 rounded-2xl'
                                  : theme === 'dark' 
                                    ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-700 rounded-2xl' 
                                    : 'bg-transparent border-zinc-300 text-slate-900 placeholder-zinc-400 focus:border-[#FE540B] rounded-none'
                              }`}
                            />
                          </div>

                          {/* Message Field */}
                          <div>
                            <textarea 
                              id="contact_message"
                              required
                              rows={12}
                              placeholder="Mensagem"
                              value={contactMessage}
                              onChange={(e) => setContactMessage(e.target.value)}
                              className={`w-full px-6 py-5 text-base sm:text-lg border focus:outline-none transition-all focus:ring-0 resize-none ${
                                theme === 'glass'
                                  ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-white/30 rounded-2xl'
                                  : theme === 'dark' 
                                    ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-700 rounded-2xl' 
                                    : 'bg-transparent border-zinc-300 text-slate-900 placeholder-zinc-400 focus:border-[#FE540B] rounded-none'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-start">
                          <button
                            type="submit"
                            disabled={contactSubmitting}
                            className={`w-full sm:w-auto font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                              theme === 'glass' || theme === 'dark'
                                ? 'px-8 py-4 rounded-xl text-white shadow-lg hover:scale-[1.03] active:scale-[0.98]'
                                : 'px-10 py-3.5 rounded-full text-white hover:brightness-110 active:scale-95 shadow-sm uppercase tracking-wider'
                            }`}
                            style={{ backgroundColor: brandColor || "#FE540B" }}
                          >
                            {contactSubmitting ? (
                              <>
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Enviando...</span>
                              </>
                            ) : (
                              <span>Enviar</span>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                </div>

              </div>

              {/* Centered Footer Social Icons & Copyright */}
              {(() => {
                const activeSocials = socialIcons.filter(item => item.value && item.href);
                return (
                  <div className="mt-24 pt-10 border-t border-black/5 dark:border-white/5 flex flex-col items-center justify-center gap-5 text-center max-w-6xl mx-auto px-4">
                    {activeSocials.length > 0 && (
                      <div className="flex items-center justify-center gap-6">
                        {activeSocials.map((item) => {
                          const IconComp = item.icon;
                          const colorToUse = "#FE540B";
                          return (
                            <a 
                              key={item.key} 
                              href={asPreview ? undefined : formatExternalUrl(item.href)} 
                              target="_blank" 
                              rel="noreferrer" 
                              title={item.label} 
                              className="transition-all duration-300 hover:scale-115 cursor-pointer" 
                              onClick={(e) => { if (asPreview) e.preventDefault(); }}
                            >
                              {item.svgUrl ? (
                                <img 
                                  src={item.svgUrl} 
                                  alt={item.label} 
                                  className="w-6 h-6 sm:w-6.5 sm:h-6.5 object-contain" 
                                />
                              ) : (
                                <IconComp className="w-5 h-5 sm:w-5.5 sm:h-5.5" style={{ color: colorToUse }} />
                              )}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <>
              {/* 3. Contacts & Links Stack (Harmonized, wider container blocks) */}
          <div className={`grid gap-4.5 pt-2 ${asPreview && previewMode === 'smartphone' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {/* Legacy contact fields - Portfolio, Catalog, and Website remain as buttons */}
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
              
              <div className={`grid gap-6 pb-2 items-stretch animate-fade-in ${asPreview && previewMode === 'smartphone' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
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
                        <div className="w-full aspect-square overflow-hidden relative flex items-center justify-center p-1.5 rounded-[1.5rem] border" style={{ backgroundColor: theme === 'dark' ? `${brandColor}08` : '#ffffff', borderColor: theme === 'dark' ? `${brandColor}15` : 'rgba(0,0,0,0.05)' }}>
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



          
          {/* Portfólio Section */}
          {bio.portfolio_items && bio.portfolio_items.length > 0 && (
            <div id="portfolio-section" className="pt-4 space-y-4 relative">
              <div className="flex items-center justify-between px-2">
                {bio.portfolio_title && <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${t.textTitle}`}>{bio.portfolio_title}</h2>}
              </div>
              
              <div className={`grid gap-6 ${asPreview && previewMode === 'smartphone' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                {bio.portfolio_items.map((item: any) => {
                   const isNewFormat = !!item.layers;
                   const coverImg = isNewFormat && item.layers.length > 0 ? item.layers[0].image_url : item.image_url;
                   
                   return (
                     <div 
                       key={item.id}
                       onClick={() => {
                         setActivePortfolioId(item.id);
                         setActiveView("portfolio");
                         if (mainScrollRef.current) mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                       }}
                       className="relative aspect-square w-full rounded-[1.5rem] overflow-hidden border shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer bg-zinc-950/20 group flex items-center justify-center"
                       style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                     >
                       {coverImg ? (
                         <img 
                           src={coverImg} 
                           alt={item.title || "Portfolio item"} 
                           className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                           referrerPolicy="no-referrer" 
                         />
                       ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center bg-black/5 dark:bg-white/5">
                           <Layout className="w-8 h-8 opacity-20 mb-2" />
                         </div>
                       )}
                       
                       {/* Overlay with Portfolio Title */}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 transition-opacity flex flex-col justify-end p-4">
                         <span className="text-white font-bold text-sm sm:text-base drop-shadow-md">
                           {item.title || "Portfólio"}
                         </span>
                         {isNewFormat && item.layers && (
                           <span className="text-white/70 text-xs font-semibold">
                             {item.layers.length} {item.layers.length === 1 ? 'imagem' : 'imagens'}
                           </span>
                         )}
                       </div>
                       

                     </div>
                   );
                })}
              </div>
            </div>
          )}

            </>
          )}

          {/* 5.5 Address & Embedded Map Section (At the very bottom, rendered only on Contato view) */}
          {activeView === "contact" && bio.address && (
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
          <div className="pt-8 pb-8 text-center space-y-6">
            <div className="text-sm sm:text-base font-bold tracking-wider opacity-90">
              <span className="text-white">GM</span>{' '}
              <span style={{ color: "#FE540B" }}>edificação®</span>{' '}
              <span className="text-zinc-400">2026</span>
              <span className="text-zinc-500">.</span>
            </div>
            <div>
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="inline-flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
              >
                <Lock className="w-5 h-5 text-white/50" />
                <span 
                  className="text-base font-black bg-clip-text text-transparent drop-shadow-sm font-funnel"
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${brandColor}, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, ${brandColor})`,
                    backgroundSize: '300% 300%',
                    animation: 'color-loop 5s ease infinite',
                  }}
                >
                  Área Restrita / Login do Administrador
                </span>
              </button>
            </div>
        </div>
          </div>

        </div>
      </div>

      {/* WEBSITE LOGIN MODAL OVERLAY */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setIsLoginOpen(false)}>
          <div 
            className={`w-full max-w-md rounded-[2rem] border overflow-hidden shadow-2xl flex flex-col ${
              theme === 'glass'
                ? 'bg-[#0a0b10]/65 backdrop-blur-3xl border-white/12 text-white shadow-[0_24px_50px_-12px_rgba(0,0,0,0.6)]'
                : theme === 'dark'
                  ? 'bg-[#0e0e11] border-zinc-800 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 flex items-center justify-between border-b" style={{ borderColor: theme === 'glass' ? 'rgba(255,255,255,0.08)' : theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
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
                      theme === 'glass'
                        ? 'bg-white/5 border-white/10 text-white focus:bg-white/10'
                        : theme === 'dark' 
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
                      theme === 'glass'
                        ? 'bg-white/5 border-white/10 text-white focus:bg-white/10'
                        : theme === 'dark' 
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
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setSelectedProduct(null)}>
            <div 
              className={`w-full max-w-lg md:max-w-5xl lg:max-w-6xl rounded-[2rem] border overflow-hidden shadow-2xl flex flex-col max-h-[92vh] ${
                theme === 'glass'
                  ? 'bg-[#0a0b10]/65 backdrop-blur-3xl border-white/12 text-white shadow-[0_24px_50px_-12px_rgba(0,0,0,0.6)]'
                  : theme === 'dark' 
                    ? 'bg-[#0f0f12] border-zinc-800/80 text-white' 
                    : 'bg-white border-slate-200 text-slate-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 flex items-center justify-between border-b shrink-0" style={{ borderColor: theme === 'glass' ? 'rgba(255,255,255,0.08)' : theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                <span className="text-xs font-bold tracking-widest uppercase opacity-60">Detalhes do Produto</span>
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="p-1.5 rounded-full hover:bg-slate-500/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Container (Grid with Left/Right split on Desktop) */}
              <div className="overflow-y-auto flex-1 no-scrollbar p-5 md:p-8">
                <div className={`grid items-stretch ${asPreview && previewMode === 'smartphone' ? 'grid-cols-1 gap-6' : 'grid-cols-1 md:grid-cols-12 gap-6 md:gap-10'}`}>
                  
                  {/* LEFT COLUMN: Image Gallery (Span 7) */}
                  <div 
                    className={`${asPreview && previewMode === 'smartphone' ? '' : 'md:col-span-7 md:pr-8 md:border-r'} flex flex-col justify-start space-y-4`}
                    style={{ borderColor: theme === 'glass' ? 'rgba(255,255,255,0.1)' : theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                  >
                    <div 
                       className="relative aspect-square w-full rounded-2xl overflow-hidden border flex items-center justify-center p-2 group shadow-inner" 
                      style={{ 
                        backgroundColor: theme === 'glass' ? 'rgba(255,255,255,0.02)' : theme === 'dark' ? `${brandColor}08` : '#ffffff', 
                        borderColor: theme === 'glass' ? 'rgba(255,255,255,0.08)' : theme === 'dark' ? `${brandColor}15` : 'rgba(0,0,0,0.08)' 
                      }}
                    >
                      {activeImageUrl ? (
                        <img 
                          src={activeImageUrl} 
                          alt={selectedProduct.name} 
                          className="max-w-full max-h-full object-contain cursor-zoom-in transition-transform duration-300 hover:scale-102" 
                          referrerPolicy="no-referrer"
                          onClick={() => setZoomedImage(activeImageUrl)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-30">
                          <ShoppingCart className="w-12 h-12 text-slate-400" />
                        </div>
                      )}

                      {/* Lupa / Zoom Icon Button */}
                      {activeImageUrl && (
                        <button
                          onClick={() => setZoomedImage(activeImageUrl)}
                          className="absolute bottom-3.5 right-3.5 p-3 rounded-full bg-black/75 hover:bg-black/90 text-white border border-white/10 transition-all hover:scale-110 active:scale-95 shadow-xl flex items-center justify-center cursor-pointer z-20 group"
                          title="Ver imagem ampliada (Lupa)"
                        >
                          <ZoomIn className="w-5.5 h-5.5 text-orange-500" style={{ color: brandColor || '#ff6900' }} />
                        </button>
                      )}

                      {/* Left / Right Gallery Arrows */}
                      {productImages.length > 1 && (
                        <>
                          <button 
                            onClick={() => setActiveImageIndex(prev => (prev - 1 + productImages.length) % productImages.length)}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 text-white hover:bg-black/95 transition-colors shadow-lg z-10 cursor-pointer"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => setActiveImageIndex(prev => (prev + 1) % productImages.length)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 text-white hover:bg-black/95 transition-colors shadow-lg z-10 cursor-pointer"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Thumbnails Gallery Row - Miniatura grande */}
                    {productImages.length > 1 && (
                      <div className={`grid gap-4 pt-2 ${asPreview && previewMode === 'smartphone' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3'}`}>
                        {productImages.map((img: string, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => setActiveImageIndex(idx)}
                            className={`relative aspect-[4/3] w-full rounded-2xl overflow-hidden border-[3px] transition-all p-1 flex items-center justify-center cursor-pointer ${
                              activeImageIndex === idx 
                                ? 'scale-102 shadow-lg opacity-100' 
                                : 'opacity-50 hover:opacity-100 border-white/5'
                            }`}
                            style={{
                              backgroundColor: theme === 'glass' ? 'rgba(255,255,255,0.03)' : theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                              borderColor: activeImageIndex === idx ? brandColor : 'transparent'
                            }}
                          >
                            <img src={img} alt={`Thumbnail ${idx + 1}`} className="max-w-full max-h-full object-contain rounded-lg" referrerPolicy="no-referrer" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN: Info & Actions (Span 5) */}
                  <div className={`${asPreview && previewMode === 'smartphone' ? '' : 'md:col-span-5 md:pl-2'} flex flex-col justify-between h-full space-y-6`}>
                    
                    {/* Product Meta details */}
                    <div className="space-y-4 text-left">
                      <h3 className="text-2xl font-black tracking-tight leading-tight">{selectedProduct.name || 'Produto sem nome'}</h3>
                      
                      {selectedProduct.price && (
                        <div className="text-3xl font-black" style={{ color: brandColor || '#ff6900' }}>
                          {selectedProduct.price}
                        </div>
                      )}
                      
                      {selectedProduct.description && (
                        <div className="pt-2">
                          <span className="text-xs font-bold uppercase tracking-widest opacity-40 block mb-1.5">Descrição e Outras Informações</span>
                          <p className={`text-sm sm:text-base leading-relaxed whitespace-pre-wrap ${theme === 'glass' ? 'text-zinc-200' : theme === 'dark' ? 'text-zinc-300' : 'text-slate-600'}`}>
                            {selectedProduct.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Area inside Right Column: Quantity and Buttons */}
                    <div className="space-y-5 pt-5 border-t" style={{ borderColor: theme === 'glass' ? 'rgba(255,255,255,0.08)' : theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                      
                      {/* Quantity Selector */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold opacity-80 uppercase tracking-wider">Quantidade</span>
                        <div className="flex items-center gap-1.5 bg-black/10 dark:bg-white/5 rounded-full p-1 border" style={{ borderColor: theme === 'glass' ? 'rgba(255,255,255,0.08)' : theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                          <button 
                            onClick={() => setProductQuantity(prev => Math.max(1, prev - 1))}
                            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-lg transition-colors font-bold cursor-pointer"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-12 text-center font-bold text-sm">{productQuantity}</span>
                          <button 
                            onClick={() => setProductQuantity(prev => prev + 1)}
                            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-lg transition-colors font-bold cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Combined Action Buttons */}
                      <div className="flex flex-col gap-2.5 pt-1">
                        <div className="flex gap-3">
                          <button 
                            onClick={() => {
                              addToCart(selectedProduct, productQuantity);
                              setSelectedProduct(null);
                            }}
                            className={`flex-1 flex items-center justify-center p-4 rounded-2xl font-black transition-all shadow-md border cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                              theme === 'glass'
                                ? 'bg-white/10 hover:bg-white/15 text-white border-white/10'
                                : theme === 'dark' 
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
                            className="flex-1 flex items-center justify-center p-4 rounded-2xl text-white font-black transition-all shadow-md hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] cursor-pointer"
                            style={{ backgroundColor: brandColor || '#ff6900' }}
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
                            className="w-full flex items-center justify-center py-2.5 text-xs font-bold opacity-60 hover:opacity-100 transition-opacity"
                          >
                            <Globe className="w-4 h-4 mr-2" />
                            Ver no Site Original
                          </a>
                        )}
                        
                        <button 
                          onClick={() => setSelectedProduct(null)}
                          className={`w-full py-3.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                            theme === 'glass'
                              ? 'bg-transparent text-zinc-300 hover:text-white border-white/10 hover:bg-white/5'
                              : theme === 'dark' 
                                ? 'bg-transparent text-zinc-400 hover:text-white border-zinc-800 hover:bg-zinc-900' 
                                : 'bg-transparent text-slate-500 hover:text-slate-800 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Voltar ao Catálogo
                        </button>
                      </div>

                    </div>

                  </div>

                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Zoomed Image Lightbox Overlay */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <button 
            onClick={() => setZoomedImage(null)}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer z-10 shadow-lg"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={zoomedImage} 
              alt="Imagem detalhada" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-scale-up" 
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* Floating Shopping Cart FAB Button */}
      {cartTotalItems > 0 && activeView !== "contact" && (
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
        <div className="fixed inset-0 z-[160] flex justify-end pointer-events-none animate-fade-in" onClick={() => setIsCartOpen(false)}>
          <div 
            className={`w-[88%] sm:w-full max-w-md h-full flex flex-col shadow-2xl pointer-events-auto relative pl-[6px] animate-in slide-in-from-right duration-300 ${
              theme === 'glass'
                ? 'bg-[#0a0b10]/65 backdrop-blur-3xl border-l border-white/12 text-white shadow-[-10px_0_40px_rgba(0,0,0,0.5)]'
                : theme === 'dark' 
                  ? 'bg-[#0e0e11] text-white border-l border-zinc-800' 
                  : 'bg-white text-slate-900 border-l border-slate-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated Left Border/Bar with the same color-loop effect as the Pix button */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-[6px] z-10"
              style={{
                background: `linear-gradient(180deg, ${brandColor}, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, ${brandColor})`,
                backgroundSize: '100% 300%',
                animation: 'vertical-color-loop 5s ease infinite',
              }}
            />
            
            {/* Render Scroll Buttons pinned to the left edge of the drawer */}
            {renderScrollButtons(true)}
            {/* Drawer Header */}
            <div className="p-5 flex items-center justify-between border-b" style={{ borderColor: theme === 'glass' ? 'rgba(255,255,255,0.08)' : theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
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
                    className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer border ${
                      checkoutStep === "cart" 
                        ? theme === 'glass' ? 'bg-white/15 border-white/15 text-white' : 'bg-black/5 dark:bg-white/10' 
                        : 'border-transparent opacity-50 hover:opacity-80'
                    }`}
                    style={checkoutStep === "cart" && theme !== 'glass' ? { borderColor: brandColor, color: brandColor } : undefined}
                  >
                    1. Carrinho
                  </button>
                  <button 
                    onClick={() => setCheckoutStep("checkout")}
                    className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer border ${
                      checkoutStep === "checkout" 
                        ? theme === 'glass' ? 'bg-white/15 border-white/15 text-white' : 'bg-black/5 dark:bg-white/10' 
                        : 'border-transparent opacity-50 hover:opacity-80'
                    }`}
                    style={checkoutStep === "checkout" && theme !== 'glass' ? { borderColor: brandColor, color: brandColor } : undefined}
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
                              theme === 'glass'
                                ? 'bg-white/5 border-white/10 text-white'
                                : theme === 'dark' 
                                  ? 'bg-zinc-900/60 border-zinc-800' 
                                  : 'bg-slate-50 border-slate-200/60'
                            }`}
                          >
                            {/* Product Thumbnail */}
                            <div 
                              className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border flex items-center justify-center p-1" 
                              style={{ 
                                backgroundColor: theme === 'glass' ? 'rgba(255,255,255,0.02)' : theme === 'dark' ? `${brandColor}08` : '#ffffff', 
                                borderColor: theme === 'glass' ? 'rgba(255,255,255,0.08)' : theme === 'dark' ? `${brandColor}15` : 'rgba(0,0,0,0.05)' 
                              }}
                            >
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
                                
                                <div className="flex items-center gap-2 bg-black/15 dark:bg-white/10 rounded-full p-1 border" style={{ borderColor: theme === 'glass' ? 'rgba(255,255,255,0.12)' : theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }}>
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
                    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100">
                      {/* Customer info form */}
                      <div className="space-y-5 bg-black/5 dark:bg-white/5 p-4 rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-sm">
                        <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 pb-1.5 border-b border-slate-200 dark:border-white/10">
                          Identificação e Entrega
                        </h4>
                        
                        <div className="space-y-1.5">
                          <label className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                            <User className="w-4 h-4 text-emerald-500" />
                            Seu Nome <span className="text-red-500 font-bold">*</span>
                          </label>
                          <input 
                            type="text" 
                            placeholder="Como podemos te chamar?"
                            value={orderName}
                            onChange={(e) => setOrderName(e.target.value)}
                            className={`w-full px-4 py-3.5 rounded-2xl text-base font-medium border focus:outline-none transition-all shadow-sm focus:ring-2 focus:ring-brand focus-border-brand ${
                              theme === 'glass'
                                ? 'bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/15'
                                : theme === 'dark' 
                                  ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500' 
                                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                            }`}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                            <Phone className="w-4 h-4 text-emerald-500" />
                            WhatsApp / Telefone para Contato <span className="text-red-500 font-bold">*</span>
                          </label>
                          <input 
                            type="tel" 
                            placeholder="Ex: (99) 99999-9999"
                            value={orderPhone}
                            onChange={(e) => setOrderPhone(e.target.value)}
                            className={`w-full px-4 py-3.5 rounded-2xl text-base font-medium border focus:outline-none transition-all shadow-sm focus:ring-2 focus:ring-brand focus-border-brand ${
                              theme === 'glass'
                                ? 'bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/15'
                                : theme === 'dark' 
                                  ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500' 
                                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                            }`}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-emerald-500" />
                            CPF / CNPJ <span className="text-xs text-slate-400 dark:text-slate-400 font-normal">(Opcional)</span>
                          </label>
                          <input 
                            type="text" 
                            placeholder="Ex: 000.000.000-00 ou 00.000.000/0000-00"
                            value={orderCpfCnpj}
                            onChange={(e) => setOrderCpfCnpj(e.target.value)}
                            className={`w-full px-4 py-3.5 rounded-2xl text-base font-medium border focus:outline-none transition-all shadow-sm focus:ring-2 focus:ring-brand focus-border-brand ${
                              theme === 'glass'
                                ? 'bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/15'
                                : theme === 'dark' 
                                  ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500' 
                                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                            }`}
                          />
                        </div>

                        {/* Delivery Option Selector */}
                        <div className="space-y-2">
                          <label className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-emerald-500" />
                            Opção de Entrega <span className="text-red-500 font-bold">*</span>
                          </label>
                          <div className="grid grid-cols-2 gap-2 bg-slate-200/50 dark:bg-black/25 p-1.5 rounded-2xl border border-slate-300/60 dark:border-white/10">
                            <button
                              type="button"
                              onClick={() => setDeliveryOption("pickup")}
                              className={`py-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                                deliveryOption === "pickup"
                                  ? (theme === 'glass' ? 'bg-white/20 text-white shadow' : theme === 'dark' ? 'bg-zinc-800 text-white shadow' : 'bg-white text-slate-900 shadow-md border border-slate-200')
                                  : 'opacity-70 hover:opacity-100 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              Retirar no Local
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeliveryOption("delivery")}
                              className={`py-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                                deliveryOption === "delivery"
                                  ? (theme === 'glass' ? 'bg-white/20 text-white shadow' : theme === 'dark' ? 'bg-zinc-800 text-white shadow' : 'bg-white text-slate-900 shadow-md border border-slate-200')
                                  : 'opacity-70 hover:opacity-100 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              Receber em Casa
                            </button>
                          </div>
                        </div>

                        {/* Delivery Address fields */}
                        {deliveryOption === "delivery" && (
                          <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                            <label className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-red-500" />
                              Endereço Completo de Entrega <span className="text-red-500 font-bold">*</span>
                            </label>
                            <textarea 
                              placeholder="Digite sua rua, número, bairro, cidade, referências..."
                              value={deliveryAddress}
                              onChange={(e) => setDeliveryAddress(e.target.value)}
                              rows={3}
                              className={`w-full px-4 py-3 rounded-2xl text-base font-medium border focus:outline-none transition-all resize-none shadow-sm focus:ring-2 focus:ring-brand focus-border-brand ${
                                theme === 'glass'
                                  ? 'bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/15'
                                  : theme === 'dark' 
                                    ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500' 
                                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                          </div>
                        )}
                      </div>

                      {/* Meios de Pagamento section inside the drawer with elegant Accordions */}
                      {(pixKey || cardUrl) && (
                        <div className="space-y-4 pt-1">
                          <label className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5 px-1">
                            <CreditCard className="w-4 h-4 text-brand" style={{ color: brandColor }} />
                            Selecione o Meio de Pagamento
                          </label>

                          <div className="space-y-3">
                            {/* Pix Accordion */}
                            {pixKey && (
                              <div className="rounded-2xl border overflow-hidden shadow-sm transition-all duration-300 border-slate-200 dark:border-white/10 bg-white/5 dark:bg-black/10">
                                {/* Accordion Header */}
                                <button
                                  type="button"
                                  onClick={() => setIsPixExpanded(!isPixExpanded)}
                                  className="w-full flex items-center justify-between p-4 font-black text-sm tracking-wide transition-all duration-200 text-left cursor-pointer hover:bg-slate-500/10 active:scale-[0.99]"
                                  style={{ borderLeft: `4px solid ${brandColor || '#32BCAD'}` }}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="bg-teal-500/10 dark:bg-teal-500/20 p-1.5 rounded-lg">
                                      <svg className="w-5 h-5 text-teal-500" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M38.8 50L50 38.8L61.2 50L50 61.2L38.8 50Z" fill="currentColor"/>
                                        <path d="M50 15L85 50L50 85L15 50L50 15ZM25.6 50L50 74.4L74.4 50L50 25.6L25.6 50Z" fill="currentColor"/>
                                      </svg>
                                    </div>
                                    <span className="text-slate-800 dark:text-slate-100 text-base font-extrabold uppercase">PAGAR VIA PIX</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20">Imediato</span>
                                    {isPixExpanded ? (
                                      <ChevronUp className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                    ) : (
                                      <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                    )}
                                  </div>
                                </button>

                                {/* Accordion Body */}
                                {isPixExpanded && (
                                  <div className="p-5 border-t border-slate-100 dark:border-white/5 bg-slate-100/30 dark:bg-white/5 text-center space-y-4 animate-slide-down">
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 text-left leading-relaxed">
                                      Escaneie o código QR ou clique para copiar a chave Pix abaixo. Efetue a transferência e anexe o comprovante na finalização do pedido!
                                    </p>
                                    
                                    <div className="bg-white p-3.5 rounded-2xl inline-block shadow-md border border-slate-200">
                                      <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pixBrCode || pixKey)}`} 
                                        alt="QR Code Pix"
                                        className="w-36 h-36 object-contain"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>

                                    <div className="bg-black/5 dark:bg-black/30 p-4 rounded-xl border border-slate-200/50 dark:border-white/5 space-y-1.5 text-left">
                                      <div className="text-[11px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-wider">Chave Copia e Cola / Chave PIX:</div>
                                      <div className="text-sm font-mono font-black break-all select-all text-slate-800 dark:text-slate-100" style={{ color: brandColor }}>
                                        {pixKey}
                                      </div>
                                    </div>

                                    <button 
                                      type="button"
                                      onClick={handleCopyPix}
                                      className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-black transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-md hover:brightness-110 active:scale-[0.98] cursor-pointer text-white border-0 shadow-sm"
                                      style={{ 
                                        background: `linear-gradient(90deg, ${brandColor}, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, ${brandColor})`,
                                        backgroundSize: '300% 300%',
                                        animation: 'color-loop 5s ease infinite',
                                      }}
                                    >
                                      {copiedPix ? <Check className="w-5 h-5 mr-1.5 font-bold" /> : <Copy className="w-5 h-5 mr-1.5 font-bold" />}
                                      <span className="font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
                                        {copiedPix ? "Chave copiada!" : "Copiar Chave Pix Copia e Cola"}
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Credit Card Accordion */}
                            {cardUrl && (
                              <div className="rounded-2xl border overflow-hidden shadow-sm transition-all duration-300 border-slate-200 dark:border-white/10 bg-white/5 dark:bg-black/10">
                                {/* Accordion Header */}
                                <button
                                  type="button"
                                  onClick={() => setIsCardExpanded(!isCardExpanded)}
                                  className="w-full flex items-center justify-between p-4 font-black text-sm tracking-wide transition-all duration-200 text-left cursor-pointer hover:bg-slate-500/10 active:scale-[0.99]"
                                  style={{ borderLeft: `4px solid ${brandColor || '#32BCAD'}` }}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="bg-blue-500/10 dark:bg-blue-500/20 p-1.5 rounded-lg">
                                      <CreditCard className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <span className="text-slate-800 dark:text-slate-100 text-base font-extrabold uppercase">PAGAR COM CARTÃO</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 dark:bg-blue-500/20">Cartão de Crédito</span>
                                    {isCardExpanded ? (
                                      <ChevronUp className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                    ) : (
                                      <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                    )}
                                  </div>
                                </button>

                                {/* Accordion Body */}
                                {isCardExpanded && (
                                  <div className="p-5 border-t border-slate-100 dark:border-white/5 bg-slate-100/30 dark:bg-white/5 text-center space-y-4 animate-slide-down">
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 text-left leading-relaxed">
                                      Clique no botão abaixo para abrir a página de pagamento seguro e efetuar o pagamento via Cartão de Crédito.
                                    </p>
                                    
                                    <a 
                                      href={cardUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-full flex items-center justify-center py-4 px-4 rounded-xl text-sm font-black text-white transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] border-0 shadow-md"
                                      style={{ 
                                        backgroundColor: brandColor,
                                        boxShadow: `0 4px 12px ${brandColor}40`
                                      }}
                                    >
                                      <CreditCard className="w-5 h-5 mr-1.5 font-bold" />
                                      <span className="font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
                                        Pagar com Cartão de Crédito
                                      </span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
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
      {!isCartOpen && renderScrollButtons(false)}

      {/* Floating Chat Inteligente (only visible on Contact page and if enabled) */}
      {activeView === "contact" && bio.chat_balloon_enabled !== false && (
        <>
          {isChatWidgetOpen ? (
            <div 
              className="fixed bottom-6 right-[76px] sm:right-20 z-[150] w-[calc(100%-5.5rem)] sm:w-full max-w-[340px] sm:max-w-[360px] rounded-[1.8rem] overflow-hidden shadow-[0_24px_50px_-12px_rgba(0,0,0,0.5)] border border-slate-100 animate-scale-up"
              style={{
                backgroundColor: "#FBF7F4",
                fontFamily: "Inter, sans-serif"
              }}
            >
              {/* Widget Header (Join.chat bar with custom color) */}
              <div 
                className="px-5 py-4 flex items-center justify-between"
                style={{ 
                  backgroundColor: bio.chat_balloon_bg_color || "#FE540B",
                  color: bio.chat_balloon_text_color || "#FFFFFF"
                }}
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[13px] font-black tracking-tight">Chat by CardDigital GM</span>
                </div>
                <button 
                  onClick={() => setIsChatWidgetOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/35 transition-all cursor-pointer"
                  style={{ color: bio.chat_balloon_text_color || "#FFFFFF" }}
                  title="Fechar Chat"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Widget Body */}
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  {/* Avatar with company logo */}
                  <div className="shrink-0 relative mt-1">
                    {logo ? (
                      <img 
                        src={logo} 
                        alt={companyName} 
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-white border-2 border-white text-xs font-black uppercase shadow-md"
                        style={{ color: bio.chat_balloon_bg_color || "#FE540B" }}
                      >
                        {companyName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Online indicator dot */}
                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-[#FBF7F4]" />
                  </div>

                  {/* Chat speech bubble */}
                  <div 
                    className="relative bg-white text-slate-800 p-4 rounded-[1.25rem] rounded-tl-none shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] border border-slate-100/40 text-sm font-semibold max-w-[240px]"
                  >
                    {/* Speech bubble arrow pointing left */}
                    <div className="absolute left-[-6px] top-0 w-3 h-3 bg-white rotate-45 border-l border-t border-slate-100/40" />
                    <div className="space-y-1 text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                      {bio.chat_balloon_text ? (
                        bio.chat_balloon_text
                      ) : (
                        <>
                          <div className="flex items-center gap-1 text-[14px]">
                            Olá <span className="animate-bounce">👋</span>
                          </div>
                          <div className="text-slate-600 text-[13.5px] font-semibold">
                            Sou Denis, como posso te ajudar hoje?
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Open Chat Action Button positioned in bottom-right style */}
                <div className="flex justify-end pt-1">
                  <button 
                    onClick={() => {
                      const whatsappClean = (bio.whatsapp || bio.phone || "").replace(/\D/g, "");
                      if (!whatsappClean) {
                        setCustomAlert({
                          title: "WhatsApp não configurado",
                          message: "O administrador não cadastrou um número de WhatsApp para contato nesta Bio."
                        });
                        return;
                      }
                      const textMsg = bio.chat_balloon_text || "Olá! Estou na sua página de contato e gostaria de iniciar um atendimento.";
                      const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappClean}&text=${encodeURIComponent(textMsg)}`;
                      window.open(whatsappUrl, "_blank");
                    }}
                    className="px-6 py-3 rounded-full font-extrabold text-[13px] sm:text-sm flex items-center gap-2.5 transition-all duration-300 hover:scale-105 hover:brightness-105 active:scale-95 cursor-pointer shadow-lg"
                    style={{ 
                      backgroundColor: bio.chat_balloon_bg_color || "#FE540B",
                      color: bio.chat_balloon_text_color || "#FFFFFF"
                    }}
                  >
                    <span>{bio.chat_balloon_button_text || "Abrir chat"}</span>
                    {/* Speech bubble outline circle */}
                    <div className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0" style={{ borderColor: `${bio.chat_balloon_text_color || '#FFFFFF'}aa` }}>
                      <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke={bio.chat_balloon_text_color || "#FFFFFF"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Minimized state: Beautiful chat balloon styled floating button */
            <button
              onClick={() => setIsChatWidgetOpen(true)}
              className="fixed bottom-6 right-[76px] sm:right-20 z-[140] flex items-center justify-center p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all text-white cursor-pointer group animate-bounce"
              style={{ backgroundColor: bio.chat_balloon_bg_color || "#25D366" }}
              title="Abrir Atendimento"
            >
              <MessageCircle className="w-7 h-7" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
              </span>
            </button>
          )}
        </>
      )}

      {/* Elegant Custom Alert Modal */}
      {customAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setCustomAlert(null)}>
          <div 
            className={`w-full max-w-sm rounded-[2rem] border overflow-hidden shadow-2xl p-6 flex flex-col items-center text-center gap-4 animate-scale-up ${
              theme === 'dark' 
                ? 'bg-zinc-950 border-zinc-800 text-white' 
                : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Elegant Header with Warn Icon */}
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-500 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <div className="space-y-1.5">
              <h4 className="text-base font-extrabold tracking-tight uppercase" style={{ color: brandColor }}>
                {customAlert.title}
              </h4>
              <p className="text-sm font-medium opacity-80 leading-relaxed max-w-xs">
                {customAlert.message}
              </p>
            </div>
            
            <button
              onClick={() => setCustomAlert(null)}
              className="w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: brandColor }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
