import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { Globe, Instagram, Facebook, Mail, Phone, MapPin, Copy, Box, FileText, Check, MessageCircle, Send, Linkedin, Twitter, Youtube, Link as LinkIcon, Music, Headphones, Github, ShoppingCart, Store, Utensils, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Share2, X, Trash2, ShoppingBag, Plus, Minus, CreditCard, User, Truck, Lock, Eye, EyeOff, ZoomIn , Layout, ExternalLink, Menu, Home, Maximize2, Minimize2 } from "lucide-react";
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
  <svg viewBox="0 0 84.54 85.23" fill="currentColor" {...props}>
    <path 
      fillRule="evenodd"
      clipRule="evenodd"
      d="M33.62 26l-1.01 -2.74c-0.56,-1.5 -1.02,-1.49 -1.5,-1.48 -0.1,0 -0.19,0.01 -0.28,0 -0.33,-0.01 -0.68,-0.05 -1.04,-0.08 -0.34,-0.03 -0.68,-0.07 -1.03,-0.08 -0.03,0 -0.05,-0 -0.08,-0 -0.45,0 -1.44,0.12 -2.36,1.05l-0.22 0.22c-1.15,1.14 -3.53,3.49 -3.71,8.22 -0.18,4.72 2.92,9.56 3.87,10.93 0.05,0.07 0.13,0.19 0.24,0.38 4.84,7.81 11,13.64 17.33,16.41 8.78,3.85 10.26,3.55 11.56,3.28 0.32,-0.06 0.63,-0.13 1.01,-0.15 1.73,-0.09 6.02,-2.21 6.92,-4.46 0.92,-2.3 0.98,-4.23 0.85,-4.58 -0.1,-0.19 -0.6,-0.45 -1.18,-0.75l-0.58 -0.31c-1.21,-0.66 -6.26,-3.39 -7.18,-3.76 -0.95,-0.39 -1.22,-0.42 -1.69,0.23 -0.92,1.27 -3.6,4.14 -3.63,4.17 -1.11,1.18 -2.26,0.79 -3.14,0.31 -0.16,-0.09 -0.39,-0.2 -0.67,-0.33 -1.48,-0.71 -4.54,-2.17 -7.95,-5.46 -3.07,-2.95 -5.11,-6.48 -5.85,-7.87 -0.84,-1.56 0.15,-2.47 0.69,-2.96 0.31,-0.29 0.68,-0.71 1.05,-1.12 0.21,-0.23 0.41,-0.46 0.61,-0.68 0.42,-0.45 0.6,-0.79 0.88,-1.31l0.17 -0.32c0.22,-0.4 0.21,-0.77 -0.04,-1.32 -0.17,-0.37 -0.95,-2.49 -2.03,-5.44l0 0z"
    />
    <path 
      fillRule="evenodd"
      clipRule="evenodd"
      d="M84.54 41.68c0,-22.98 -18.7,-41.68 -41.68,-41.68 -22.98,0 -41.67,18.7 -41.67,41.68 0,7.6 2.07,15.04 5.98,21.52l0.15 0.25 -7.33 21.78 22.48 -7.2 0.24 0.13c6.14,3.39 13.1,5.18 20.14,5.18 22.98,0 41.68,-18.7 41.68,-41.68l0 0zm-75.61 34.74l0 0 4.7 -13.98c-4.34,-6.09 -6.64,-13.27 -6.64,-20.76 0,-19.78 16.09,-35.88 35.87,-35.88 19.78,0 35.88,16.09 35.88,35.88 0,19.78 -16.09,35.88 -35.88,35.88 -6.93,0 -13.66,-1.99 -19.48,-5.77l-14.46 4.63 0 0z"
    />
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

export function OptimizedMedia({ 
  src, 
  alt, 
  className, 
  width = 1200, 
  quality = 75,
  isCover = false,
  loading = "lazy",
  onClick
}: { 
  src: string; 
  alt: string; 
  className?: string; 
  width?: number; 
  quality?: number;
  isCover?: boolean;
  loading?: "lazy" | "eager";
  onClick?: () => void;
}) {
  const isVideo = !!(src && (src.endsWith(".mp4") || src.includes(".mp4?") || src.includes("video/mp4") || src.endsWith(".webm") || src.includes(".webm?") || src.includes("video/webm")));
  const isGif = !!(src && (src.endsWith(".gif") || src.includes(".gif?") || src.includes("image/gif")));

  const [mediaSrc, setMediaSrc] = useState(() => {
    if (src && src.includes("/storage/v1/object/public/") && !isVideo && !isGif) {
      return src.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") + `?width=${width}&quality=${quality}`;
    }
    return src;
  });

  const handleError = () => {
    if (mediaSrc !== src) {
      setMediaSrc(src);
    }
  };

  useEffect(() => {
    if (src && src.includes("/storage/v1/object/public/") && !isVideo && !isGif) {
      setMediaSrc(src.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") + `?width=${width}&quality=${quality}`);
    } else {
      setMediaSrc(src);
    }
  }, [src, width, quality, isVideo, isGif]);

  if (isVideo) {
    return (
      <video
        src={src}
        className={className}
        muted
        loop
        playsInline
        autoPlay
        controls={!isCover}
        controlsList="nodownload"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        preload="auto"
        style={{
          transform: "translate3d(0, 0, 0)",
          backfaceVisibility: "hidden",
          ...(isCover ? { pointerEvents: "none" } : {})
        }}
        onClick={onClick}
      />
    );
  }

  return (
    <img 
      src={mediaSrc} 
      alt={alt} 
      className={className} 
      onError={handleError} 
      referrerPolicy="no-referrer" 
      loading={loading}
      onClick={onClick}
    />
  );
}

const customSocialIcons: Record<string, { white: string; orange: string; black: string }> = {
  whatsapp: {
    white: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20BRANCA/Whatsapp%20branco.svg",
    orange: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20LARANJA/Whatsapp%20laranja.svg",
    black: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20PRETO/Whatsapp%20preto.svg"
  },
  instagram: {
    white: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20BRANCA/Intagram%20branco.svg",
    orange: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20LARANJA/Instagram%20laranja.svg",
    black: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20PRETO/Instagram%20preto.svg"
  },
  telegram: {
    white: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20BRANCA/telegram%20branco.svg",
    orange: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20LARANJA/Telegram%20laranja.svg",
    black: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20PRETO/Telegram%20preto.svg"
  },
  email: {
    white: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20BRANCA/email%20branco.svg",
    orange: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20LARANJA/Email%20laranja.svg",
    black: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20PRETO/email%20preto.svg"
  },
  facebook: {
    white: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20BRANCA/facebook%20branco.svg",
    orange: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20LARANJA/Facebook%20laranja.svg",
    black: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20PRETO/Facebook%20preto.svg"
  },
  address: {
    white: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20BRANCA/Localizacao%20branco.svg",
    orange: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20LARANJA/Localizacao%20laranja.svg",
    black: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20PRETO/Localizacao%20preto.svg"
  }
};

function InteractiveSocialIcon({
  itemKey,
  label,
  theme,
  sizeClass = "w-5.5 h-5.5 sm:w-6 sm:h-6",
  fallbackIcon: FallbackIcon,
  disableScale = false,
  instant = false
}: {
  itemKey: string;
  label: string;
  theme: string;
  sizeClass?: string;
  fallbackIcon: React.ComponentType<any>;
  disableScale?: boolean;
  instant?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isDark = theme === 'dark' || theme === 'glass';
  const hasCustom = !!customSocialIcons[itemKey];

  const handleMouseEnter = () => setHovered(true);
  const handleMouseLeave = () => setHovered(false);

  if (hasCustom) {
    const urls = customSocialIcons[itemKey];
    const srcUrl = hovered ? urls.orange : (isDark ? urls.white : urls.black);

    return (
      <div 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="flex items-center justify-center cursor-pointer"
      >
        <img
          src={srcUrl}
          alt={label}
          className={`${sizeClass} object-contain ${instant ? 'transition-none duration-0' : 'transition-all duration-300'} ${disableScale ? '' : 'transform ' + (hovered ? 'scale-110' : '')}`}
        />
      </div>
    );
  }

  const colorClass = hovered
    ? "text-[#FE540B]"
    : (isDark ? "text-white" : "text-slate-900");

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`${instant ? 'transition-none duration-0' : 'transition-colors duration-300'} flex items-center justify-center cursor-pointer`}
    >
      <FallbackIcon className={`${sizeClass} ${instant ? 'transition-none duration-0' : 'transition-colors duration-300'} ${colorClass}`} />
    </div>
  );
}

export default function BioRenderer({ data, asPreview = false, previewMode }: { data: any, asPreview?: boolean, previewMode?: "smartphone" | "pc" }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const bio = data?.bio_config || {};
  const bgAnimation = bio.bg_animation || "parallax";

  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedProductOption, setSelectedProductOption] = useState<any | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [portfolioLightbox, setPortfolioLightbox] = useState<{ images: string[], currentIndex: number } | null>(null);
  const [lightboxFit, setLightboxFit] = useState<"cover" | "contain">("cover");

  // Keyboard navigation for portfolio lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!portfolioLightbox) return;
      if (e.key === "Escape") {
        setPortfolioLightbox(null);
      } else if (e.key === "ArrowRight") {
        setPortfolioLightbox(prev => {
          if (!prev) return null;
          const nextIdx = (prev.currentIndex + 1) % prev.images.length;
          return { ...prev, currentIndex: nextIdx };
        });
      } else if (e.key === "ArrowLeft") {
        setPortfolioLightbox(prev => {
          if (!prev) return null;
          const prevIdx = (prev.currentIndex - 1 + prev.images.length) % prev.images.length;
          return { ...prev, currentIndex: prevIdx };
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [portfolioLightbox]);

  const [activeView, setActiveView] = useState<"bio" | "contact" | "portfolio">("bio");
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChatWidgetOpen, setIsChatWidgetOpen] = useState(false);
  const [isChatIconVisible, setIsChatIconVisible] = useState(false);
  const [isHoveringChat, setIsHoveringChat] = useState(false);

  useEffect(() => {
    if (activeView === "contact") {
      setIsChatWidgetOpen(false);
      setIsChatIconVisible(false);
      const timer = setTimeout(() => {
        setIsChatIconVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setIsChatIconVisible(false);
      setIsChatWidgetOpen(false);
    }
  }, [activeView]);
  const [contactName, setContactName] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [catalogIndex, setCatalogIndex] = useState(0);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileUA = /android|iphone|ipad|ipod|windows phone/i.test(userAgent);
      const isMobileWidth = window.innerWidth < 1024;
      setIsMobileDevice(isMobileUA || isMobileWidth);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isMobileView = isMobileDevice || (asPreview && previewMode === 'smartphone');
  
  const siteFont = isMobileView ? (bio.site_font_mobile || bio.site_font || "inter") : (bio.site_font || "inter");
  const siteFontSize = isMobileView ? (bio.site_font_size_mobile || bio.site_font_size || "md") : (bio.site_font_size || "md");
  
  const maxCatalogIndex = bio.catalog_items 
    ? (isMobileView 
        ? Math.max(0, bio.catalog_items.length - 1) 
        : Math.max(0, bio.catalog_items.length - 3)) 
    : 0;

  useEffect(() => {
    if (maxCatalogIndex <= 0) return;
    const interval = setInterval(() => {
      setCatalogIndex((prev) => (prev >= maxCatalogIndex ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [maxCatalogIndex]);

  useEffect(() => {
    setCatalogIndex(0);
  }, [bio.catalog_items?.length, isMobileView]);
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState("");
  const [needsActivation, setNeedsActivation] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const customSvgs: Record<string, string> = {
    whatsapp: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20BRANCA/Whatsapp%20branco.svg",
    telegram: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/telegram.svg",
    instagram: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/instagram.svg",
    facebook: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/facebook.svg",
    email: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/email.svg",
    address: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/localizacao.svg"
  };

  const socialIcons = [
    { 
      key: "whatsapp", 
      icon: BrandWhatsAppIcon, 
      label: "WhatsApp", 
      value: bio.whatsapp, 
      href: bio.whatsapp 
        ? (isMobileDevice 
            ? `whatsapp://send?phone=${bio.whatsapp.replace(/\D/g, '')}` 
            : `https://api.whatsapp.com/send?phone=${bio.whatsapp.replace(/\D/g, '')}`) 
        : undefined, 
      svgUrl: customSvgs.whatsapp 
    },
    { 
      key: "instagram", 
      icon: BrandInstagramIcon, 
      label: "Instagram", 
      value: bio.instagram, 
      href: bio.instagram 
        ? (isMobileDevice 
            ? `instagram://user?username=${bio.instagram.replace('@','').split('/').pop()?.split('?')[0]}` 
            : (bio.instagram.includes('http') ? bio.instagram : `https://instagram.com/${bio.instagram.replace('@','')}`)) 
        : undefined, 
      svgUrl: customSvgs.instagram 
    },
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

  const getResponsiveFontSizeClass = (desktopSize?: string, mobileSize?: string) => {
    const resolvedDesktop = desktopSize ? (desktopSize === "sm" ? "12 pt" : desktopSize === "base" ? "14 pt" : desktopSize === "lg" ? "16 pt" : desktopSize === "xl" ? "24 pt" : desktopSize) : "16 pt";
    const resolvedMobile = mobileSize ? (mobileSize === "sm" ? "12 pt" : mobileSize === "base" ? "14 pt" : mobileSize === "lg" ? "16 pt" : mobileSize === "xl" ? "24 pt" : mobileSize) : resolvedDesktop;

    const getRawMobileValue = (sz: string) => {
      switch (sz) {
        case "10 pt": return "10pt";
        case "12 pt": return "11pt";
        case "14 pt": return "12pt";
        case "16 pt": return "14pt";
        case "18 pt": return "15pt";
        case "20 pt": return "16pt";
        case "24 pt": return "18pt";
        case "30 pt": return "22pt";
        case "36 pt": return "26pt";
        case "48 pt": return "32pt";
        default: return "14pt";
      }
    };

    const getRawDesktopValue = (sz: string) => {
      switch (sz) {
        case "10 pt": return "10pt";
        case "12 pt": return "12pt";
        case "14 pt": return "14pt";
        case "16 pt": return "16pt";
        case "18 pt": return "18pt";
        case "20 pt": return "20pt";
        case "24 pt": return "24pt";
        case "30 pt": return "30pt";
        case "36 pt": return "36pt";
        case "48 pt": return "48pt";
        default: return "16pt";
      }
    };

    const mobileVal = getRawMobileValue(resolvedMobile);
    const desktopVal = getRawDesktopValue(resolvedDesktop);

    if (asPreview) {
      if (previewMode === "smartphone") {
        return `text-[${mobileVal}]`;
      } else if (previewMode === "pc") {
        return `text-[${desktopVal}]`;
      }
    }

    return `text-[${mobileVal}] sm:text-[${desktopVal}]`;
  };

  // Shopping Cart state
  const [cart, setCart] = useState<{ product: any, quantity: number, selectedOption?: any }[]>(() => {
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
  const [showAppRedirectScreen, setShowAppRedirectScreen] = useState(false);

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
      if (selectedProduct.options && selectedProduct.options.length > 0) {
        setSelectedProductOption(selectedProduct.options[0]);
      } else {
        setSelectedProductOption(null);
      }
    } else {
      setSelectedProductOption(null);
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
    const clientName = data?.company_name || bio.title || "GM Edificação";
    
    // Dynamically update document title to show company name
    document.title = clientName;

    const updateMetaTag = (property: string, content: string) => {
      let element = document.querySelector(`meta[property='${property}']`) || document.querySelector(`meta[name='${property}']`);
      if (!element) {
        element = document.createElement("meta");
        if (property.startsWith("og:")) {
          element.setAttribute("property", property);
        } else {
          element.setAttribute("name", property);
        }
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    const descriptionText = "Orçamentos, serviços e atendimento em um único lugar.\nDesign de Marcas | Material Gráfico | Comunicação Visual\n\nAcesse nosso site de forma rápida e segura!";

    updateMetaTag("description", descriptionText);
    updateMetaTag("og:title", clientName);
    updateMetaTag("og:description", descriptionText);
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

  const addToCart = (product: any, qty: number = 1, selectedOption?: any) => {
    setCart(prev => {
      const existing = prev.find(item => 
        item.product.id === product.id && 
        (!selectedOption ? !item.selectedOption : item.selectedOption?.id === selectedOption.id)
      );
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id && 
          (!selectedOption ? !item.selectedOption : item.selectedOption?.id === selectedOption.id)
            ? { ...item, quantity: item.quantity + qty } 
            : item
        );
      }
      return [...prev, { product, quantity: qty, selectedOption }];
    });
  };

  const removeFromCart = (productId: string, optionId?: string) => {
    setCart(prev => prev.filter(item => 
      !(item.product.id === productId && (!optionId || item.selectedOption?.id === optionId))
    ));
  };

  const updateCartQuantity = (productId: string, qty: number, optionId?: string) => {
    if (qty <= 0) {
      removeFromCart(productId, optionId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.product.id === productId && (!optionId || item.selectedOption?.id === optionId)
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
  const cartTotalPrice = cart.reduce((sum, item) => {
    const unitPrice = item.selectedOption ? parsePrice(item.selectedOption.price) : parsePrice(item.product.price);
    return sum + (unitPrice * item.quantity);
  }, 0);

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
      const unitPrice = item.selectedOption ? parsePrice(item.selectedOption.price) : parsePrice(item.product.price);
      const itemTotal = unitPrice * item.quantity;
      const itemImage = item.product.image_url ? `\n  📸 Foto: ${item.product.image_url}` : "";
      const optionLabel = item.selectedOption ? ` (${item.selectedOption.quantity})` : "";
      return `• *${item.product.name}${optionLabel}* (x${item.quantity}) - ${formatPrice(itemTotal)}${itemImage}`;
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
  const companyName = (isMobileView && bio.title_mobile) 
    ? bio.title_mobile 
    : (bio.title || data?.company_name || "Perfil");
  const desc = (isMobileView && bio.description_mobile) 
    ? bio.description_mobile 
    : (bio.description || "");
  const brandColor = bio.color || data?.brand_primary || "#32BCAD";
  const brandBg = bio.bg_color || data?.brand_bg;
  const brandTitle = bio.title_color || data?.brand_title;
  const brandSubtitle = bio.subtitle_color || data?.brand_subtitle;
  const brandIcon = bio.icon_color || data?.brand_icon || brandColor;
  const brandAccent = bio.accent_color || bio.button_color || data?.brand_accent || data?.brand_button || brandColor;
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
      
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

      setTimeout(() => {
        setIsLoginOpen(false);
        if (isMobileDevice && !isStandalone) {
          setShowAppRedirectScreen(true);
        } else {
          // No app instalado ou desktop, vai direto para a home
          navigate("/");
        }
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
      const title = bio.title || data?.company_name || "";
      const suffix = sanitizeSlug(title);
      if (suffix === "gm-edificacao" || suffix === "carddigitalgm-gm-edificacao" || suffix === "gmedificacao") {
        return "gmedificacao";
      }
      return suffix ? suffix : (data?.tenant_id || "gmedificacao");
    };
    const url = `https://carddigitalgmapp.netlify.app/${getCustomSlug()}`;
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
    const isOutline = buttonStyle === "outline" || buttonStyle === "vazado";
    const isNeon = buttonStyle === "neon";

    // Dynamic styles based on buttonStyle
    const containerStyle = isOutline ? {
      backgroundColor: 'transparent',
      borderColor: brandColor,
      borderWidth: '2px',
    } : isNeon ? {
      borderColor: brandColor,
      backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.35)' : 'rgba(255, 255, 255, 0.75)',
    } : {
      backgroundColor: brandColor,
      borderColor: brandColor,
    };

    const textStyle = isOutline ? {
      color: theme === 'dark' ? '#ffffff' : '#0f172a',
    } : isNeon ? {
      color: brandColor,
    } : {
      color: '#ffffff',
    };

    const iconStyle = isOutline ? {
      color: brandColor,
      backgroundColor: theme === 'dark' ? `${brandColor}20` : `${brandColor}15`,
    } : isNeon ? {
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
        if (mainScrollRef.current) {
          mainScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
        document.body.scrollTo({ top: 0, behavior: "smooth" });
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
        .site-size-sm { font-size: 15.5px !important; }
        .site-size-md { font-size: 17.5px !important; }
        .site-size-lg { font-size: 19.5px !important; }
        .site-size-xl { font-size: 21.5px !important; }

        @media (max-width: 768px) {
          .site-size-sm { font-size: 13.5px !important; }
          .site-size-md { font-size: 14.5px !important; }
          .site-size-lg { font-size: 16px !important; }
          .site-size-xl { font-size: 17.5px !important; }
        }

        .site-size-sm .text-xs { font-size: 0.7rem !important; }
        .site-size-sm .text-sm { font-size: 0.8rem !important; }
        .site-size-sm .text-base { font-size: 0.9rem !important; }
        .site-size-sm .text-lg { font-size: 1.0rem !important; }
        .site-size-sm .text-xl { font-size: 1.15rem !important; }
        .site-size-sm .text-2xl { font-size: 1.35rem !important; }
        .site-size-sm .text-3xl { font-size: 1.65rem !important; }
        .site-size-sm .text-4xl { font-size: 2.1rem !important; }
        .site-size-sm .text-5xl { font-size: 2.6rem !important; }

        .site-size-lg .text-xs { font-size: 0.85rem !important; }
        .site-size-lg .text-sm { font-size: 1.0rem !important; }
        .site-size-lg .text-base { font-size: 1.15rem !important; }
        .site-size-lg .text-lg { font-size: 1.3rem !important; }
        .site-size-lg .text-xl { font-size: 1.45rem !important; }
        .site-size-lg .text-2xl { font-size: 1.75rem !important; }
        .site-size-lg .text-3xl { font-size: 2.3rem !important; }
        .site-size-lg .text-4xl { font-size: 2.9rem !important; }
        .site-size-lg .text-5xl { font-size: 3.6rem !important; }

        .site-size-xl .text-xs { font-size: 0.9rem !important; }
        .site-size-xl .text-sm { font-size: 1.05rem !important; }
        .site-size-xl .text-base { font-size: 1.25rem !important; }
        .site-size-xl .text-lg { font-size: 1.45rem !important; }
        .site-size-xl .text-xl { font-size: 1.65rem !important; }
        .site-size-xl .text-2xl { font-size: 1.95rem !important; }
        .site-size-xl .text-3xl { font-size: 2.6rem !important; }
        .site-size-xl .text-4xl { font-size: 3.3rem !important; }
        .site-size-xl .text-5xl { font-size: 4.1rem !important; }

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

              const currentPortfolioItem = activePortfolioId ? (bio.portfolio_items || []).find((p: any) => p.id === activePortfolioId) : null;
              const hasDesktopLayersForBanner = !!currentPortfolioItem?.layers && currentPortfolioItem.layers.length > 0;
              const hasMobileLayersForBanner = !!currentPortfolioItem?.mobile_layers && currentPortfolioItem.mobile_layers.length > 0;
              const firstDesktopLayerUrl = hasDesktopLayersForBanner ? currentPortfolioItem.layers[0].image_url : null;
              const firstMobileLayerUrl = hasMobileLayersForBanner ? currentPortfolioItem.mobile_layers[0].image_url : null;

              const portfolioDesktopBanner = currentPortfolioItem?.main_banner_url || firstDesktopLayerUrl || firstMobileLayerUrl || currentPortfolioItem?.image_url;
              const portfolioMobileBanner = currentPortfolioItem?.main_banner_mobile_url || currentPortfolioItem?.main_banner_url || firstMobileLayerUrl || firstDesktopLayerUrl || currentPortfolioItem?.image_url;

              const hasBanners = (bio.show_banners && (desktopBanner || mobileBanner)) || (activeView === "portfolio");

              // Helper to render the Profile Header with optional over-banner styles
              const renderProfileHeader = (isOverBanner: boolean) => {
                const mobAlign = bio.description_align_mobile || "center";
                const deskAlign = bio.description_align || "center";
                const mobAlignClass = mobAlign === "left" ? "text-left" : mobAlign === "right" ? "text-right" : "text-center";
                const deskAlignClass = deskAlign === "left" ? "sm:text-left" : deskAlign === "right" ? "sm:text-right" : "sm:text-center";
                const descAlignClass = asPreview 
                  ? (previewMode === "smartphone" ? mobAlignClass : (deskAlign === "left" ? "text-left" : deskAlign === "right" ? "text-right" : "text-center"))
                  : `${mobAlignClass} ${deskAlignClass}`;

                const mobBold = bio.description_bold_mobile ? "font-bold" : "font-semibold";
                const deskBold = bio.description_bold ? "sm:font-bold" : "sm:font-semibold";
                const descBoldClass = asPreview
                  ? (previewMode === "smartphone" ? mobBold : (bio.description_bold ? "font-bold" : "font-semibold"))
                  : `${mobBold} ${deskBold}`;

                const mobItalic = bio.description_italic_mobile ? "italic" : "not-italic";
                const deskItalic = bio.description_italic ? "sm:italic" : "sm:not-italic";
                const descItalicClass = asPreview
                  ? (previewMode === "smartphone" ? mobItalic : (bio.description_italic ? "italic" : "not-italic"))
                  : `${mobItalic} ${deskItalic}`;

                const mobFont = `bio-desc-font-${bio.description_font_mobile || "ui"}`;
                const deskFont = `sm:bio-desc-font-${bio.description_font || "ui"}`;
                const descFontClass = asPreview
                  ? (previewMode === "smartphone" ? mobFont : `bio-desc-font-${bio.description_font || "ui"}`)
                  : `${mobFont} ${deskFont}`;

                const mobMargin = mobAlign === "left" ? "mr-auto ml-0" : mobAlign === "right" ? "ml-auto mr-0" : "mx-auto";
                const deskMargin = deskAlign === "left" ? "sm:mr-auto sm:ml-0" : deskAlign === "right" ? "sm:ml-auto sm:mr-0" : "sm:mx-auto";
                const descMarginClass = asPreview 
                  ? (previewMode === "smartphone" ? mobMargin : (deskAlign === "left" ? "mr-auto" : deskAlign === "right" ? "ml-auto" : "mx-auto"))
                  : `${mobMargin} ${deskMargin}`;

                return (
                  <div className={`text-center space-y-3.5 sm:space-y-4 ${isOverBanner ? "relative z-20 text-white w-full px-4" : "pt-2"}`}>
                    <div 
                      className={`w-20 h-20 sm:w-28 sm:h-28 mx-auto rounded-full overflow-hidden border-[3px] flex items-center justify-center p-1 shadow-lg relative ${isOverBanner ? "bg-black/35 backdrop-blur-md border-white/40" : t.iconBg}`} 
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
                      <h1 className={`text-2xl sm:text-3xl md:text-5xl font-black tracking-tight ${isOverBanner ? "!text-white drop-shadow-md" : t.textTitle}`}>{companyName}</h1>
                      {desc && (
                        <div 
                          className={`mt-1.5 ${getResponsiveFontSizeClass(bio.description_size, bio.description_size_mobile)} max-w-4xl leading-relaxed whitespace-pre-wrap tracking-wide ${descMarginClass} ${descAlignClass} ${descBoldClass} ${descItalicClass} ${descFontClass} ${isOverBanner ? "!text-white [&_*]:!text-white drop-shadow-sm" : `${t.textDesc}`}`}
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
                          className={`flex items-center justify-center px-6 py-2.5 rounded-full text-xs sm:text-sm font-extrabold shadow-[0_6px_20px_0_rgba(0,0,0,0.15)] cursor-pointer transition-all duration-300 transform hover:scale-105 active:scale-95 !text-white [&_*]:!text-white bg-gradient-to-r w-full sm:w-auto`}
                          style={{ 
                            backgroundImage: `linear-gradient(to right, ${brandColor}, ${brandColor}dd)`,
                            color: '#ffffff',
                          }}
                        >
                          <span className="!text-white">Veja nosso Portfólio</span>
                        </button>
                      )}

                      <button 
                        onClick={handleShareBio}
                        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-extrabold border shadow-sm cursor-pointer transition-all duration-200 transform active:scale-95 bio-button w-full sm:w-auto ${isOverBanner ? "bg-white/10 hover:bg-white/20 !text-white border-white/20 backdrop-blur-sm [&_*]:!text-white" : `${t.cardBg} ${t.cardBgHover} ${t.cardBorder}`}`}
                        style={{ 
                          color: isOverBanner ? '#ffffff' : brandColor, 
                          borderColor: isOverBanner ? 'rgba(255,255,255,0.25)' : `${brandColor}40`
                        }}
                      >
                        <Share2 className="w-4 h-4 !text-white" />
                        <span className={isOverBanner ? "!text-white" : ""}>{copiedShare ? "Link Copiado!" : "Compartilhar Bio"}</span>
                      </button>
                    </div>

                    {/* Redes sociais clicáveis pequenos */}
                    {socialIcons.length > 0 && (
                      <div className="flex flex-wrap justify-center items-center gap-3 pt-3">
                        {socialIcons.map((item) => {
                          const formattedHref = formatExternalUrl(item.href);
                          return (
                            <a
                              key={item.key}
                              href={asPreview ? undefined : formattedHref}
                              target="_blank"
                              rel="noreferrer"
                              title={item.label}
                              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 border transform hover:scale-110 hover:border-[#FE540B]/50 active:scale-95 shadow-lg backdrop-blur-md"
                              style={{
                                backgroundColor: 'rgba(12, 12, 15, 0.75)',
                                borderColor: 'rgba(255, 255, 255, 0.12)',
                              }}
                              onClick={(e) => { if (asPreview) e.preventDefault(); }}
                            >
                              <InteractiveSocialIcon 
                                itemKey={item.key} 
                                label={item.label} 
                                theme="dark" 
                                sizeClass="w-7 h-7 sm:w-8 sm:h-8"
                                fallbackIcon={item.icon} 
                              />
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
                    <div className={`${asPreview && previewMode === 'smartphone' ? 'hidden' : asPreview && previewMode === 'pc' ? 'block' : 'hidden md:block'} w-full h-32 sm:h-36 bg-white/10 dark:bg-black/20 backdrop-blur-md border-b border-black/5 dark:border-white/5 flex items-center justify-between px-6 md:px-12 relative z-30`}>
                      <div className="flex items-center gap-4 cursor-pointer hover:opacity-85 transition-opacity" onClick={handleLogoClick}>
                        {logo ? (
                          <img src={logo} alt={companyName} className="h-16 sm:h-[72px] w-auto object-contain rounded-md shadow-sm" />
                        ) : (
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-lg flex items-center justify-center font-bold text-2xl sm:text-3xl text-white" style={{ backgroundColor: brandColor }}>
                            {companyName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className={`font-extrabold text-2xl sm:text-3xl tracking-tight ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>{companyName}</span>
                      </div>
                      <div className="flex items-center">
                        <div className="flex items-center gap-7 sm:gap-8 md:gap-9">
                          <button 
                            onClick={() => {
                              setActiveView("bio");
                              setActivePortfolioId(null);
                            }} 
                            className={`relative py-1 text-base sm:text-lg font-medium transition-all duration-300 cursor-pointer group ${
                              (activeView as string) === "bio" 
                                ? `opacity-100 font-semibold ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}` 
                                : `opacity-60 hover:opacity-100 ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`
                            } hover:text-[#FE540B]`}
                          >
                            Início
                            <span className="absolute bottom-[-2px] left-0 right-0 h-[2.5px] bg-[#FE540B] transition-transform duration-300 origin-left scale-x-0 group-hover:scale-x-100" style={{ transform: (activeView as string) === 'bio' ? 'scaleX(1)' : undefined }} />
                          </button>

                          <button 
                            onClick={() => setActiveView("contact")} 
                            className={`relative py-1 text-base sm:text-lg font-medium transition-all duration-300 cursor-pointer group ${
                              (activeView as string) === "contact" 
                                ? `opacity-100 font-semibold ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}` 
                                : `opacity-60 hover:opacity-100 ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`
                            } hover:text-[#FE540B]`}
                          >
                            Contato
                            <span className="absolute bottom-[-2px] left-0 right-0 h-[2.5px] bg-[#FE540B] transition-transform duration-300 origin-left scale-x-0 group-hover:scale-x-100" style={{ transform: (activeView as string) === 'contact' ? 'scaleX(1)' : undefined }} />
                          </button>

                          <button 
                            onClick={() => {
                              const el = document.getElementById("portfolio-section");
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth' });
                              } else {
                                setActiveView("bio");
                                setTimeout(() => {
                                  const el2 = document.getElementById("portfolio-section");
                                  if (el2) el2.scrollIntoView({ behavior: 'smooth' });
                                }, 120);
                              }
                            }} 
                            className={`relative py-1 text-base sm:text-lg font-medium transition-all duration-300 cursor-pointer group ${
                              (activeView as string) === "portfolio" 
                                ? `opacity-100 font-semibold ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}` 
                                : `opacity-60 hover:opacity-100 ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`
                            } hover:text-[#FE540B]`}
                          >
                            Vitrine
                            <span className="absolute bottom-[-2px] left-0 right-0 h-[2.5px] bg-[#FE540B] transition-transform duration-300 origin-left scale-x-0 group-hover:scale-x-100" style={{ transform: (activeView as string) === 'portfolio' ? 'scaleX(1)' : undefined }} />
                          </button>

                          <button 
                            onClick={handleShareBio} 
                            className={`text-base sm:text-lg font-medium transition-colors flex items-center gap-3.5 cursor-pointer duration-300 ${
                              theme === 'dark' || theme === 'glass' 
                                ? 'text-white opacity-70 hover:opacity-100 hover:text-[#FE540B]' 
                                : 'text-slate-900 opacity-70 hover:opacity-100 hover:text-[#FE540B]'
                            }`}
                          >
                            <Share2 className="w-5 h-5 transition-colors duration-300" style={{ color: "inherit" }} /> 
                            <span>Compartilhar</span>
                          </button>
                        </div>

                        {socialIcons.filter(item => item.value && item.href).length > 0 && (
                          <div className="w-10 sm:w-12 md:w-14 lg:w-16" />
                        )}

                        {(() => {
                          const activeSocials = socialIcons.filter(item => item.value && item.href);
                          if (activeSocials.length === 0) return null;
                          return (
                            <div className="flex items-center gap-5 sm:gap-6 md:gap-7">
                              {activeSocials.map((item) => (
                                <a 
                                  key={item.key} 
                                  href={asPreview ? undefined : formatExternalUrl(item.href)} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  title={item.label} 
                                  className="flex items-center justify-center cursor-pointer transition-none" 
                                  onClick={(e) => { if (asPreview) e.preventDefault(); }}
                                >
                                  <InteractiveSocialIcon 
                                    itemKey={item.key} 
                                    label={item.label} 
                                    theme={theme} 
                                    sizeClass="w-5.5 h-5.5 sm:w-6 sm:h-6"
                                    fallbackIcon={item.icon} 
                                    instant={true}
                                  />
                                </a>
                              ))}
                            </div>
                          );
                        })()}
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
                    <div className={`${asPreview && previewMode === 'pc' ? 'hidden' : asPreview && previewMode === 'smartphone' ? 'block' : 'block md:hidden'} w-full h-[96px] bg-white/10 dark:bg-black/20 backdrop-blur-md border-b border-black/5 dark:border-white/5 flex items-center justify-between px-4 relative z-30`}>
                      <div className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity" onClick={handleLogoClick}>
                        {logo ? (
                          <img src={logo} alt={companyName} className="h-12 w-auto object-contain rounded-md" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base text-white" style={{ backgroundColor: brandColor }}>
                            {companyName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className={`font-extrabold text-base tracking-tight ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>{companyName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setActiveView("bio")} 
                          className={`text-sm font-medium transition-all hover:opacity-100 cursor-pointer ${
                            (activeView as string) === "bio" 
                              ? "opacity-100 border-b-2 font-semibold border-slate-900 dark:border-white text-slate-900 dark:text-white" 
                              : "opacity-60 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          Início
                        </button>
                        <button 
                          onClick={() => setActiveView("contact")} 
                          className={`text-sm font-medium transition-all hover:opacity-100 cursor-pointer ${
                            (activeView as string) === "contact" 
                              ? "opacity-100 border-b-2 font-semibold border-slate-900 dark:border-white text-slate-900 dark:text-white" 
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
                      <div className="w-full h-36 sm:h-40 md:h-[140px] bg-white/10 dark:bg-black/20 backdrop-blur-md border-b border-black/5 dark:border-white/5 flex items-center justify-between px-6 md:px-12 relative z-30">
                        <div className="flex items-center gap-4 cursor-pointer hover:opacity-85 transition-opacity" onClick={handleLogoClick}>
                          {logo ? (
                            <img src={logo} alt={companyName} className="h-16 sm:h-20 w-auto object-contain rounded-md shadow-sm transition-all" />
                          ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center font-bold text-2xl sm:text-3xl text-white shadow-sm" style={{ backgroundColor: brandColor }}>
                              {companyName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className={`font-extrabold text-2xl sm:text-3xl tracking-tight ${theme === 'dark' || theme === 'glass' || hasBanners ? 'text-white' : 'text-slate-900'}`}>{companyName}</span>
                        </div>
                        <div className="flex items-center">
                          {/* Navigation Links Group */}
                          <div className="flex items-center gap-7 sm:gap-8 md:gap-9">
                            {/* Início */}
                            <button 
                              onClick={() => {
                                setActiveView("bio");
                                setActivePortfolioId(null);
                              }} 
                              className={`relative py-1 text-base sm:text-lg font-medium transition-all duration-300 cursor-pointer group ${
                                (activeView as string) === "bio" 
                                  ? `opacity-100 font-semibold ${theme === 'dark' || theme === 'glass' || hasBanners ? 'text-white' : 'text-slate-900'}` 
                                  : `opacity-60 hover:opacity-100 ${theme === 'dark' || theme === 'glass' || hasBanners ? 'text-white' : 'text-slate-900'}`
                              } hover:text-[#FE540B]`}
                            >
                              Início
                              <span className="absolute bottom-[-2px] left-0 right-0 h-[2.5px] bg-[#FE540B] transition-transform duration-300 origin-left scale-x-0 group-hover:scale-x-100" style={{ transform: (activeView as string) === 'bio' ? 'scaleX(1)' : undefined }} />
                            </button>

                            {/* Contato */}
                            <button 
                              onClick={() => setActiveView("contact")} 
                              className={`relative py-1 text-base sm:text-lg font-medium transition-all duration-300 cursor-pointer group ${
                                (activeView as string) === "contact" 
                                  ? `opacity-100 font-semibold ${theme === 'dark' || theme === 'glass' || hasBanners ? 'text-white' : 'text-slate-900'}` 
                                  : `opacity-60 hover:opacity-100 ${theme === 'dark' || theme === 'glass' || hasBanners ? 'text-white' : 'text-slate-900'}`
                              } hover:text-[#FE540B]`}
                            >
                              Contato
                              <span className="absolute bottom-[-2px] left-0 right-0 h-[2.5px] bg-[#FE540B] transition-transform duration-300 origin-left scale-x-0 group-hover:scale-x-100" style={{ transform: (activeView as string) === 'contact' ? 'scaleX(1)' : undefined }} />
                            </button>

                            {/* Vitrine */}
                            <button 
                              onClick={() => {
                                const el = document.getElementById("portfolio-section");
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth' });
                                } else {
                                  setActiveView("bio");
                                  setTimeout(() => {
                                    const el2 = document.getElementById("portfolio-section");
                                    if (el2) el2.scrollIntoView({ behavior: 'smooth' });
                                  }, 120);
                                }
                              }} 
                              className={`relative py-1 text-base sm:text-lg font-medium transition-all duration-300 cursor-pointer group ${
                                (activeView as string) === "portfolio" 
                                  ? `opacity-100 font-semibold ${theme === 'dark' || theme === 'glass' || hasBanners ? 'text-white' : 'text-slate-900'}` 
                                  : `opacity-60 hover:opacity-100 ${theme === 'dark' || theme === 'glass' || hasBanners ? 'text-white' : 'text-slate-900'}`
                              } hover:text-[#FE540B]`}
                            >
                              Vitrine
                              <span className="absolute bottom-[-2px] left-0 right-0 h-[2.5px] bg-[#FE540B] transition-transform duration-300 origin-left scale-x-0 group-hover:scale-x-100" style={{ transform: (activeView as string) === 'portfolio' ? 'scaleX(1)' : undefined }} />
                            </button>
                          </div>

                          {/* Beautiful Distancing Spacer matches the second screenshot */}
                          <div className="w-12 sm:w-16 md:w-20 lg:w-24" />

                          {/* Social Icons Group */}
                          <div className="flex items-center gap-5 sm:gap-6 md:gap-7">
                            {socialIcons.length > 0 && socialIcons.map((item) => {
                              return (
                                <a 
                                  key={item.key} 
                                  href={asPreview ? undefined : formatExternalUrl(item.href)} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  title={item.label} 
                                  className="flex items-center justify-center cursor-pointer transition-none" 
                                  onClick={(e) => { if (asPreview) e.preventDefault(); }}
                                 >
                                  <InteractiveSocialIcon 
                                    itemKey={item.key} 
                                    label={item.label} 
                                    theme={theme} 
                                    sizeClass="w-5.5 h-5.5 sm:w-6 sm:h-6"
                                    fallbackIcon={item.icon} 
                                    instant={true}
                                  />
                                </a>
                              )
                            })}
                          </div>
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
                      <div className={`w-full relative group bg-black/10 transition-all duration-1000 ease-in-out ${
                        activeView === "contact" 
                          ? "md:h-[35vh] md:min-h-[250px]" 
                          : activeView === "portfolio"
                            ? "md:h-screen md:min-h-[600px]"
                            : "md:h-[calc(105.3vh-140px)] md:min-h-[500px]"
                      }`} style={{}}>
                        <div className="w-full h-full relative">
                          <img 
                            src={activeView === "contact" ? (bio.contact_banner_img_url || finalDesktop) : (activeView === "portfolio" ? (portfolioDesktopBanner || finalDesktop) : finalDesktop)} 
                            alt="Banner Desktop" 
                            className="w-full h-full object-cover absolute inset-0" 
                            referrerPolicy="no-referrer" 
                          />
                          
                          {(() => {
                            const heroAlign = asPreview
                              ? (previewMode === "smartphone" ? (bio.description_align_mobile || "center") : (bio.description_align || "center"))
                              : (bio.description_align || "center");

                            const heroBold = asPreview
                              ? (previewMode === "smartphone" ? bio.description_bold_mobile : bio.description_bold)
                              : bio.description_bold;

                            const heroItalic = asPreview
                              ? (previewMode === "smartphone" ? bio.description_italic_mobile : bio.description_italic)
                              : bio.description_italic;

                            return (
                              <>
                                {/* Gradient overlay for text readability */}
                                {activeView !== "contact" && activeView !== "portfolio" && (
                                  <div className={`absolute inset-0 z-10 ${heroAlign === 'center' ? 'bg-black/40' : heroAlign === 'right' ? 'bg-gradient-to-l from-black/80 via-black/40 to-transparent' : 'bg-gradient-to-r from-black/80 via-black/40 to-transparent'}`} />
                                )}
                                
                                {/* Overlaid Profile Content (Hero Text) */}
                                {activeView !== "contact" && activeView !== "portfolio" && (
                                  <div className="absolute inset-0 z-20 flex flex-col justify-center py-6">
                                    <div className={`w-full max-w-[1150px] mx-auto px-4 md:px-8 lg:px-12 flex flex-col ${heroAlign === 'center' ? 'items-center text-center' : heroAlign === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
                                       <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight !text-white drop-shadow-md max-w-2xl leading-tight">
                                         {companyName}
                                       </h1>
                                       {desc && (
                                         <div 
                                           className={`mt-4 text-base md:text-lg lg:text-xl !text-white [&_*]:!text-white drop-shadow-sm max-w-2xl leading-relaxed whitespace-pre-wrap ${heroBold ? 'font-bold' : 'font-medium'} ${heroItalic ? 'italic' : ''}`}
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
                                             className="flex items-center px-8 py-3.5 rounded-full text-lg font-extrabold shadow-lg cursor-pointer transition-all duration-300 transform hover:scale-105 active:scale-95 !text-white [&_*]:!text-white bg-gradient-to-r"
                                             style={{ 
                                               backgroundImage: `linear-gradient(to right, ${brandColor}, ${brandColor}dd)`,
                                               color: '#ffffff',
                                             }}
                                           >
                                             <span className="!text-white">Veja nosso Portfólio</span>
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
                              className={`text-left text-sm font-medium uppercase tracking-wider py-3 border-b ${theme === 'dark' || theme === 'glass' ? 'border-white/10 text-white hover:text-white/85' : 'border-zinc-100 text-zinc-800'} ${activeView === 'bio' ? 'text-[#FE540B] dark:text-[#FE540B]' : ''}`}
                            >
                              Início
                            </button>
                            <button 
                              onClick={() => {
                                setActiveView("contact");
                                setIsMobileMenuOpen(false);
                              }}
                              className={`text-left text-sm font-medium uppercase tracking-wider py-3 border-b ${theme === 'dark' || theme === 'glass' ? 'border-white/10 text-white hover:text-white/85' : 'border-zinc-100 text-zinc-800'} ${activeView === 'contact' ? 'text-[#FE540B] dark:text-[#FE540B]' : ''}`}
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
                                className={`text-left text-sm font-medium uppercase tracking-wider py-3 border-b ${theme === 'dark' || theme === 'glass' ? 'border-white/10 text-white hover:text-white/85' : 'border-zinc-100 text-zinc-800'}`}
                              >
                                Portfólio
                              </button>
                            )}
                            
                            {socialIcons.length > 0 && (
                              <div className="flex items-center gap-3 pt-2.5">
                                {socialIcons.map((item) => {
                                  return (
                                    <a 
                                      key={item.key} 
                                      href={asPreview ? undefined : formatExternalUrl(item.href)} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      title={item.label} 
                                      className={`w-8.5 h-8.5 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer border ${theme === 'dark' || theme === 'glass' ? 'bg-zinc-900 border-white/10' : 'bg-zinc-50 border-zinc-100'}`} 
                                      onClick={(e) => { if (asPreview) e.preventDefault(); }}
                                    >
                                      <InteractiveSocialIcon 
                                        itemKey={item.key} 
                                        label={item.label} 
                                        theme={theme} 
                                        sizeClass="w-4.5 h-4.5"
                                        fallbackIcon={item.icon} 
                                      />
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
                      <div className={`w-full relative overflow-hidden transition-all duration-1000 ease-in-out ${
                        activeView === "portfolio" 
                          ? "h-screen w-full py-0 px-0"
                          : activeView === "contact"
                            ? (isMobileView ? "aspect-[16/10] min-h-[320px] py-10 px-6 flex flex-col items-center justify-center text-center" : "aspect-[21/9] sm:aspect-auto min-h-[220px] sm:min-h-[260px] py-6 px-6 flex flex-col items-center justify-center text-center")
                            : (isMobileView ? "h-screen w-full py-20 px-6 flex flex-col items-center justify-center text-center" : "aspect-[6/5] sm:aspect-auto min-h-[320px] sm:min-h-[500px] py-14 px-6 flex flex-col items-center justify-center text-center")
                      }`}>
                        <img 
                          src={activeView === "contact" ? (bio.contact_banner_img_url || finalMobile) : (activeView === "portfolio" ? (portfolioMobileBanner || finalMobile) : finalMobile)} 
                          alt="Banner Mobile" 
                          className="w-full h-full object-cover absolute inset-0 z-0" 
                          referrerPolicy="no-referrer" 
                        />
                        
                        {/* High-Contrast Progressive Black Gradient Overlay for Impeccable Readability */}
                        {activeView !== "portfolio" && (
                          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/85 z-10" />
                        )}
                        
                        {/* Overlaid Hero Content - Centered with title, about section, and button on top of the banner */}
                        {activeView !== "contact" && activeView !== "portfolio" && (() => {
                          const mobAlign = bio.description_align_mobile || "center";
                          const mobAlignClass = mobAlign === "left" ? "text-left items-start" : mobAlign === "right" ? "text-right items-end" : "text-center items-center";
                          const mobBold = bio.description_bold_mobile ? "font-bold" : "font-medium";
                          const mobItalic = bio.description_italic_mobile ? "italic" : "not-italic";
                          const mobFont = `bio-desc-font-${bio.description_font_mobile || "ui"}`;
                          const mobSize = getResponsiveFontSizeClass(bio.description_size, bio.description_size_mobile);

                          return (
                            <div className={`relative z-20 w-full flex flex-col justify-center ${mobAlignClass} space-y-6 px-4`}>
                              <h1 className="text-[34px] sm:text-[38px] font-black tracking-tight !text-white leading-[1.1] select-none max-w-[95%] drop-shadow-md">
                                {bio.title_mobile || bio.title || companyName || "Criando marcas que conectam"}
                              </h1>
                              
                              {desc && (
                                <div className={`w-full flex flex-col ${mobAlignClass} space-y-3.5 pt-6 max-w-sm border-t border-white/10 mt-6`}>
                                  <h2 className="hidden sm:block text-xl sm:text-2xl font-black tracking-tight !text-white font-sans uppercase">
                                    Sobre a
                                  </h2>
                                  <div 
                                    className={`leading-relaxed !text-white [&_*]:!text-white whitespace-pre-wrap font-sans drop-shadow-sm px-2 ${mobSize} ${mobBold} ${mobItalic} ${mobFont}`}
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
                                className="px-8 py-3.5 bg-[#FE540B] hover:bg-[#ff3d00] !text-white [&_*]:!text-white rounded-full text-base font-extrabold shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer mt-4"
                                style={{ color: '#ffffff' }}
                              >
                                <span className="!text-white">Veja nosso Portfólio</span>
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div className={activeView === "portfolio" 
            ? "w-full px-0 mx-0 mt-0 space-y-0" 
            : `${isMobileView ? "space-y-6" : "max-w-[1150px] mx-auto px-4 md:px-8 lg:px-12 mt-6 sm:mt-10 space-y-6 sm:space-y-8"} w-full`
          }>

          <AnimatePresence mode="wait">
          {activeView === "portfolio" ? (
            <motion.div 
              key="portfolio-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full pb-10"
            >
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
                  const hasDesktopLayers = !!portfolioItem.layers && portfolioItem.layers.length > 0;
                  const hasMobileLayers = !!portfolioItem.mobile_layers && portfolioItem.mobile_layers.length > 0;
                  const images = isMobileView
                    ? (hasMobileLayers ? portfolioItem.mobile_layers : (hasDesktopLayers ? portfolioItem.layers : [{ id: portfolioItem.id, image_url: portfolioItem.image_url }]))
                    : (hasDesktopLayers ? portfolioItem.layers : (hasMobileLayers ? portfolioItem.mobile_layers : [{ id: portfolioItem.id, image_url: portfolioItem.image_url }]));
                  
                  const finalAlign = isMobileView 
                    ? (portfolioItem.description_align_mobile || portfolioItem.description_align || "left")
                    : (portfolioItem.description_align || "left");
                  const finalBold = isMobileView 
                    ? (portfolioItem.description_bold_mobile !== undefined ? portfolioItem.description_bold_mobile : portfolioItem.description_bold)
                    : portfolioItem.description_bold;
                  const finalItalic = isMobileView 
                    ? (portfolioItem.description_italic_mobile !== undefined ? portfolioItem.description_italic_mobile : portfolioItem.description_italic)
                    : portfolioItem.description_italic;
                  const finalFont = isMobileView 
                    ? (portfolioItem.description_font_mobile || portfolioItem.description_font || "ui")
                    : (portfolioItem.description_font || "ui");
                  const finalSize = isMobileView 
                    ? (portfolioItem.description_size_mobile || portfolioItem.description_size || "16 pt")
                    : (portfolioItem.description_size || "16 pt");

                  const descriptionAlignClass = finalAlign === "left" ? "text-left" : finalAlign === "right" ? "text-right" : "text-center";
                  const descriptionBoldClass = finalBold ? "font-bold" : "font-medium";
                  const descriptionItalicClass = finalItalic ? "italic" : "not-italic";
                  const descriptionFontClass = `bio-desc-font-${finalFont}`;
                  const descriptionSizeClass = getFontSizeClass(finalSize);

                  return (
                     <div className="space-y-0 w-full" id="portfolio-detail-section">
                        <div 
                          className="max-w-[1600px] mx-auto w-full px-4 md:px-8 lg:px-12 py-6 sm:py-10 flex flex-row gap-4 items-stretch justify-between"
                        >
                           {/* Previous portfolio item card */}
                           {prevPortfolio ? (() => {
                             const isPrevNewFormat = !!prevPortfolio.layers;
                             const prevHasDesktop = !!prevPortfolio.layers && prevPortfolio.layers.length > 0;
                             const prevHasMobile = !!prevPortfolio.mobile_layers && prevPortfolio.mobile_layers.length > 0;
                             const prevCoverImg = isMobileView
                               ? (prevPortfolio.main_banner_mobile_url || prevPortfolio.main_banner_url || (prevHasMobile ? prevPortfolio.mobile_layers[0].image_url : (prevHasDesktop ? prevPortfolio.layers[0].image_url : prevPortfolio.image_url)))
                               : (prevPortfolio.main_banner_url || (prevHasDesktop ? prevPortfolio.layers[0].image_url : (prevHasMobile ? prevPortfolio.mobile_layers[0].image_url : prevPortfolio.image_url)));
                             return (
                               <div 
                                 onClick={() => { 
                                   setActivePortfolioId(prevPortfolio.id); 
                                   window.scrollTo({ top: 0, behavior: 'smooth' });
                                   document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
                                   document.body.scrollTo({ top: 0, behavior: 'smooth' });
                                   if (mainScrollRef.current) {
                                     mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                   }
                                 }} 
                                 className="relative flex-1 aspect-[2.5/1] sm:aspect-[3.5/1] md:aspect-[4.5/1] rounded-lg overflow-hidden border shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer bg-zinc-950/20 group flex items-center justify-start"
                                 style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                               >
                                 {prevCoverImg ? (
                                   <OptimizedMedia 
                                     src={prevCoverImg} 
                                     alt={prevPortfolio.title || ""} 
                                     className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                     isCover={true}
                                   />
                                 ) : (
                                   <div className="absolute inset-0 w-full h-full bg-black/40" />
                                 )}
                                 <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent flex flex-row items-center gap-4 p-4 sm:p-6 md:p-8 lg:p-10 text-white">
                                       <ChevronLeft className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 text-white/95 transition-transform duration-300 group-hover:-translate-x-2 shrink-0" />
                                       <div className="flex flex-col justify-center min-w-0">
                                         <div className="text-base sm:text-lg md:text-2xl lg:text-3xl xl:text-4xl font-black tracking-tight line-clamp-1">
                                           {prevPortfolio.title}
                                         </div>
                                       </div>
                                     </div>
                               </div>
                             );
                           })() : <div className="flex-1 opacity-0 pointer-events-none" />}

                           {/* Next portfolio item card */}
                           {nextPortfolio ? (() => {
                             const isNextNewFormat = !!nextPortfolio.layers;
                             const nextHasDesktop = !!nextPortfolio.layers && nextPortfolio.layers.length > 0;
                             const nextHasMobile = !!nextPortfolio.mobile_layers && nextPortfolio.mobile_layers.length > 0;
                             const nextCoverImg = isMobileView
                               ? (nextPortfolio.main_banner_mobile_url || nextPortfolio.main_banner_url || (nextHasMobile ? nextPortfolio.mobile_layers[0].image_url : (nextHasDesktop ? nextPortfolio.layers[0].image_url : nextPortfolio.image_url)))
                               : (nextPortfolio.main_banner_url || (nextHasDesktop ? nextPortfolio.layers[0].image_url : (nextHasMobile ? nextPortfolio.mobile_layers[0].image_url : nextPortfolio.image_url)));
                             return (
                               <div 
                                 onClick={() => { 
                                   setActivePortfolioId(nextPortfolio.id); 
                                   window.scrollTo({ top: 0, behavior: 'smooth' });
                                   document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
                                   document.body.scrollTo({ top: 0, behavior: 'smooth' });
                                   if (mainScrollRef.current) {
                                     mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                   }
                                 }} 
                                 className="relative flex-1 aspect-[2.5/1] sm:aspect-[3.5/1] md:aspect-[4.5/1] rounded-lg overflow-hidden border shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer bg-zinc-950/20 group flex items-center justify-end"
                                 style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                               >
                                 {nextCoverImg ? (
                                   <OptimizedMedia 
                                     src={nextCoverImg} 
                                     alt={nextPortfolio.title || ""} 
                                     className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                     isCover={true}
                                   />
                                 ) : (
                                   <div className="absolute inset-0 w-full h-full bg-black/40" />
                                 )}
                                 <div className="absolute inset-0 bg-gradient-to-l from-black/85 via-black/45 to-transparent flex flex-row items-center justify-end gap-4 p-4 sm:p-6 md:p-8 lg:p-10 text-white text-right">
                                       <div className="flex flex-col justify-center min-w-0">
                                         <div className="text-base sm:text-lg md:text-2xl lg:text-3xl xl:text-4xl font-black tracking-tight line-clamp-1">
                                           {nextPortfolio.title}
                                         </div>
                                       </div>
                                       <ChevronRight className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 text-white/95 transition-transform duration-300 group-hover:translate-x-2 shrink-0" />
                                     </div>
                               </div>
                             );
                           })() : <div className="flex-1 opacity-0 pointer-events-none" />}
                        </div>
                        
                        <div className="max-w-[1600px] mx-auto w-full px-4 md:px-8 lg:px-12 pb-12 sm:pb-20">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-start">
                            <h2 className={`text-4xl sm:text-5xl md:text-6xl font-black tracking-tight ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>
                              {(isMobileView && portfolioItem.title_mobile) ? portfolioItem.title_mobile : (portfolioItem.title || "Portfólio")}
                            </h2>
                            {((isMobileView && portfolioItem.description_mobile !== undefined) ? portfolioItem.description_mobile : portfolioItem.description) && (
                              <div className={`whitespace-pre-wrap ${descriptionAlignClass} ${descriptionBoldClass} ${descriptionItalicClass} ${descriptionSizeClass} ${descriptionFontClass} ${theme === 'dark' || theme === 'glass' ? 'text-slate-300' : 'text-slate-700'}`}>
                                {(isMobileView && portfolioItem.description_mobile !== undefined) ? portfolioItem.description_mobile : portfolioItem.description}
                              </div>
                            )}
                          </div>
                        </div>

                        {bgAnimation === "sticky-gallery" ? (
                          <div className="relative w-full px-0 mx-0">
                            {images.map((img, idx) => (
                              <div 
                                key={img.id || idx} 
                                className="sticky top-0 h-screen w-full bg-black overflow-hidden relative"
                                style={{
                                  zIndex: idx + 1,
                                }}
                              >
                                <OptimizedMedia 
                                  src={img.image_url} 
                                  alt={`Banner ${idx+1}`} 
                                  className="absolute inset-0 w-full h-full object-cover block cursor-zoom-in transition-transform hover:scale-[1.01] duration-500" 
                                  loading={idx === 0 ? "eager" : "lazy"} 
                                  onClick={() => {
                                    const imageUrls = images.map((i: any) => i.image_url);
                                    setPortfolioLightbox({
                                      images: imageUrls,
                                      currentIndex: idx
                                    });
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="w-full flex flex-col items-center gap-0 px-0 mx-0">
                             {images.map((img, idx) => (
                               <OptimizedMedia 
                                 key={img.id || idx} 
                                 src={img.image_url} 
                                 alt={`Banner ${idx+1}`} 
                                 className="w-full h-auto block cursor-zoom-in transition-transform hover:scale-[1.01] duration-300 rounded-none border-0 shadow-none"
                                 loading={idx === 0 ? "eager" : "lazy"} 
                                 onClick={() => {
                                   const imageUrls = images.map((i: any) => i.image_url);
                                   setPortfolioLightbox({
                                     images: imageUrls,
                                     currentIndex: idx
                                   });
                                 }}
                               />
                             ))}
                          </div>
                        )}

                        {(prevPortfolio || nextPortfolio) && (
                          <div 
                            className="max-w-[1600px] mx-auto w-full px-4 md:px-8 lg:px-12 py-16 flex flex-row gap-4 items-stretch justify-between"
                          >
                             {/* Previous portfolio item card */}
                             {prevPortfolio ? (() => {
                               const isPrevNewFormat = !!prevPortfolio.layers;
                               const prevHasDesktop = !!prevPortfolio.layers && prevPortfolio.layers.length > 0;
                               const prevHasMobile = !!prevPortfolio.mobile_layers && prevPortfolio.mobile_layers.length > 0;
                               const prevCoverImg = isMobileView
                                 ? (prevHasMobile ? prevPortfolio.mobile_layers[0].image_url : (prevHasDesktop ? prevPortfolio.layers[0].image_url : prevPortfolio.image_url))
                                 : (prevHasDesktop ? prevPortfolio.layers[0].image_url : (prevHasMobile ? prevPortfolio.mobile_layers[0].image_url : prevPortfolio.image_url));
                               return (
                                 <div 
                                   onClick={() => { 
                                     setActivePortfolioId(prevPortfolio.id); 
                                     window.scrollTo({ top: 0, behavior: 'smooth' });
                                     document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
                                     document.body.scrollTo({ top: 0, behavior: 'smooth' });
                                     if (mainScrollRef.current) {
                                       mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                     }
                                   }} 
                                   className="relative flex-1 aspect-[2.5/1] sm:aspect-[3.5/1] md:aspect-[4.5/1] rounded-lg overflow-hidden border shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer bg-zinc-950/20 group flex items-center justify-start"
                                   style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                                 >
                                   {prevCoverImg ? (
                                     <OptimizedMedia 
                                       src={prevCoverImg} 
                                       alt={prevPortfolio.title || ""} 
                                       className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                       isCover={true}
                                     />
                                   ) : (
                                     <div className="absolute inset-0 w-full h-full bg-black/40" />
                                   )}
                                   <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent flex flex-row items-center gap-4 p-4 sm:p-6 md:p-8 lg:p-10 text-white">
                                      <ChevronLeft className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 text-white/95 transition-transform duration-300 group-hover:-translate-x-2 shrink-0" />
                                      <div className="flex flex-col justify-center min-w-0">
                                        <div className="text-base sm:text-lg md:text-2xl lg:text-3xl xl:text-4xl font-black tracking-tight line-clamp-1">
                                          {prevPortfolio.title}
                                        </div>
                                      </div>
                                    </div>
                                 </div>
                               );
                             })() : <div className="flex-1 opacity-0 pointer-events-none" />}

                             {/* Next portfolio item card */}
                             {nextPortfolio ? (() => {
                               const isNextNewFormat = !!nextPortfolio.layers;
                               const nextHasDesktop = !!nextPortfolio.layers && nextPortfolio.layers.length > 0;
                               const nextHasMobile = !!nextPortfolio.mobile_layers && nextPortfolio.mobile_layers.length > 0;
                               const nextCoverImg = isMobileView
                                 ? (nextHasMobile ? nextPortfolio.mobile_layers[0].image_url : (nextHasDesktop ? nextPortfolio.layers[0].image_url : nextPortfolio.image_url))
                                 : (nextHasDesktop ? nextPortfolio.layers[0].image_url : (nextHasMobile ? nextPortfolio.mobile_layers[0].image_url : nextPortfolio.image_url));
                               return (
                                 <div 
                                   onClick={() => { 
                                     setActivePortfolioId(nextPortfolio.id); 
                                     window.scrollTo({ top: 0, behavior: 'smooth' });
                                     document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
                                     document.body.scrollTo({ top: 0, behavior: 'smooth' });
                                     if (mainScrollRef.current) {
                                       mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                     }
                                   }} 
                                   className="relative flex-1 aspect-[2.5/1] sm:aspect-[3.5/1] md:aspect-[4.5/1] rounded-lg overflow-hidden border shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer bg-zinc-950/20 group flex items-center justify-end"
                                   style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                                 >
                                   {nextCoverImg ? (
                                     <OptimizedMedia 
                                       src={nextCoverImg} 
                                       alt={nextPortfolio.title || ""} 
                                       className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                       isCover={true}
                                     />
                                   ) : (
                                     <div className="absolute inset-0 w-full h-full bg-black/40" />
                                   )}
                                   <div className="absolute inset-0 bg-gradient-to-l from-black/85 via-black/45 to-transparent flex flex-row items-center justify-end gap-4 p-4 sm:p-6 md:p-8 lg:p-10 text-white text-right">
                                      <div className="flex flex-col justify-center min-w-0">
                                        <div className="text-base sm:text-lg md:text-2xl lg:text-3xl xl:text-4xl font-black tracking-tight line-clamp-1">
                                          {nextPortfolio.title}
                                        </div>
                                      </div>
                                      <ChevronRight className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 text-white/95 transition-transform duration-300 group-hover:translate-x-2 shrink-0" />
                                    </div>
                                 </div>
                               );
                             })() : <div className="flex-1 opacity-0 pointer-events-none" />}
                          </div>
                        )}
                     </div>
                  );
               })()}
            </motion.div>
          ) : activeView === "contact" ? (
            <motion.div 
              key="contact-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="py-6 sm:py-12 w-full flex flex-col items-center"
            >
              <div className="flex flex-col items-center gap-10 lg:gap-14 max-w-6xl w-full mx-auto px-4 sm:px-6">
                
                {/* Title & Text */}
                <div className="w-full flex flex-col items-center text-center space-y-6 overflow-hidden">
                  <h2 className={`text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-sans font-black tracking-tight leading-none whitespace-nowrap select-none ${theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>
                    {bio.contact_title || "Fale com a gente"}
                  </h2>
                  {bio.contact_desc && (
                    <p className={`text-base sm:text-lg lg:text-xl font-medium leading-relaxed opacity-85 max-w-2xl ${theme === 'dark' || theme === 'glass' ? 'text-zinc-300' : 'text-slate-600'}`}>
                      {bio.contact_desc}
                    </p>
                  )}
                </div>

                {/* Right column: Form */}
                <div className={`w-full max-w-5xl ${
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
                            <div className={`p-5 rounded-lg border text-sm text-left leading-relaxed ${
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
                                  ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-white/30 rounded-lg'
                                  : theme === 'dark' 
                                    ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-700 rounded-lg' 
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
                                  ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-white/30 rounded-lg'
                                  : theme === 'dark' 
                                    ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-700 rounded-lg' 
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
                                  ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-white/30 rounded-lg'
                                  : theme === 'dark' 
                                    ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-700 rounded-lg' 
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

              {/* Footer spacing */}
              <div className="mt-16" />
            </motion.div>
          ) : (
            <motion.div
              key="bio-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
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

          {/* 3.5. "Sobre sua empresa" Section */}
          {bio.show_about !== false && (
            <div 
              id="about-company-section" 
              className="relative w-full my-6 animate-fade-in"
            >
              {/* Content Wrapper */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-10 md:py-16 max-w-none w-full mx-auto space-y-6 md:space-y-8 h-full">
                {/* Title */}
                <h2 
                  className={`tracking-tight select-none leading-tight ${
                    theme === 'light' ? 'text-zinc-900' : 'text-white'
                  } ${
                    (bio.about_title_align || 'center') === 'left' ? 'text-left w-full' : (bio.about_title_align || 'center') === 'right' ? 'text-right w-full' : 'text-center w-full'
                  } ${
                    bio.about_title_bold !== false ? 'font-extrabold' : 'font-normal'
                  } ${
                    bio.about_title_italic ? 'italic' : 'not-italic'
                  } ${
                    getFontSizeClass(bio.about_title_size || "30 pt")
                  } bio-desc-font-${bio.about_title_font || "funnel"}`}
                >
                  {(bio.about_title || `Sobre a ${companyName || 'Sua Empresa'}`).toUpperCase()}
                </h2>

                {/* Main Description */}
                {(bio.about_description || !bio.about_title) && (
                  <p 
                    className={`leading-relaxed max-w-none w-full mx-auto tracking-wide ${
                      theme === 'light' ? 'text-zinc-600' : 'text-zinc-200/95'
                    } ${
                      (bio.about_desc_align || 'center') === 'left' ? 'text-left w-full' : (bio.about_desc_align || 'center') === 'right' ? 'text-right w-full' : 'text-center w-full'
                    } ${
                      bio.about_desc_bold ? 'font-bold' : 'font-normal'
                    } ${
                      bio.about_desc_italic ? 'italic' : 'not-italic'
                    } ${
                      getFontSizeClass(bio.about_desc_size || "16 pt")
                    } bio-desc-font-${bio.about_desc_font || "ui"}`}
                  >
                    {bio.about_description || `Acreditamos que o design é mais do que aparência – é comunicação, engajamento e construção de confiança. Trabalhamos para criar marcas que deixem uma impressão duradoura e que transmitam seu propósito de forma clara e consistente.`}
                  </p>
                )}

                {/* Highlight text (Bold) */}
                {(bio.about_highlight || !bio.about_title) && (
                  <p 
                    className={`tracking-wide max-w-none w-full mx-auto ${
                      theme === 'light' ? 'text-zinc-800' : 'text-white'
                    } ${
                      (bio.about_highlight_align || 'center') === 'left' ? 'text-left w-full' : (bio.about_highlight_align || 'center') === 'right' ? 'text-right w-full' : 'text-center w-full'
                    } ${
                      bio.about_highlight_bold !== false ? 'font-extrabold' : 'font-normal'
                    } ${
                      bio.about_highlight_italic ? 'italic' : 'not-italic'
                    } ${
                      getFontSizeClass(bio.about_highlight_size || "16 pt")
                    } bio-desc-font-${bio.about_highlight_font || "ui"}`}
                  >
                    {bio.about_highlight || `Comece sua jornada com a ${companyName || 'Sua Empresa'}. Vamos criar algo inesquecível.`}
                  </p>
                )}

                {/* Orange rounded-full button identical to the print */}
                <div className="pt-2">
                  <a
                    href={(() => {
                      if (bio.about_btn_link) {
                        return bio.about_btn_link;
                      }
                      const whatsappClean = (bio.whatsapp || bio.phone || "").replace(/\D/g, "");
                      if (!whatsappClean) return "#";
                      const whatsappNumber = whatsappClean.startsWith('55') || whatsappClean.length > 11 ? whatsappClean : `55${whatsappClean}`;
                      return `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent("Olá! Estou vindo do site, quero saber mais sobre sua empresa.")}`;
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-10 py-4 rounded-full text-base sm:text-lg font-bold text-white transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
                    style={{
                      backgroundColor: brandColor || '#FE540B'
                    }}
                  >
                    {bio.about_btn_text || 'Fale Conosco'}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* 4. Products Catalog Section */}
          {bio.catalog_items && bio.catalog_items.length > 0 && (
            <div id="catalog-section" className="pt-4 space-y-4 relative w-full">
              <div className="flex items-center justify-between px-2">
                {bio.catalog_title && <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${t.textTitle}`}>{bio.catalog_title}</h2>}
              </div>
              
              <div className="relative w-full overflow-hidden px-1 sm:px-12 py-4">
                <div className="overflow-hidden w-full">
                  <div 
                    className="flex transition-transform duration-500 ease-in-out will-change-transform"
                    style={{
                      transform: `translate3d(-${catalogIndex * (isMobileView ? 100 : 100 / 3)}%, 0px, 0px)`
                    }}
                  >
                    {bio.catalog_items.map((item: any) => {
                      return (
                        <div 
                          key={item.id} 
                          className={`${isMobileView ? 'w-full' : 'w-1/3'} flex-shrink-0 p-2.5 sm:p-3 flex flex-col`}
                        >
                          <div 
                            onClick={() => {
                              setSelectedProduct(item);
                              setActiveImageIndex(0);
                            }}
                            className={`overflow-hidden rounded-[2rem] border transition-[transform,box-shadow,border-color] duration-300 flex flex-col h-full cursor-pointer hover:shadow-lg group ${t.cardBg} ${t.cardBorder} catalog-card-item flex-1`}
                          >
                            {item.image_url ? (() => {
                              const isItemPng = item.image_url.toLowerCase().includes('.png') || item.image_url.toLowerCase().includes('image/png') || item.image_url.toLowerCase().includes('format=png');
                              return (
                                <div className="w-full aspect-square overflow-hidden relative flex items-center justify-center p-1.5 rounded-[1.5rem] border" style={{ backgroundColor: isItemPng ? '#ffffff' : theme === 'dark' ? `${brandColor}08` : '#ffffff', borderColor: theme === 'dark' ? `${brandColor}15` : 'rgba(0,0,0,0.05)' }}>
                                  <OptimizedMedia src={item.image_url} alt={item.name} className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105" width={400} isCover={true} />
                                </div>
                              );
                            })() : (
                              <div className={`w-full aspect-square ${t.iconBg} flex items-center justify-center`}>
                                <ShoppingCart className="w-10 h-10 opacity-20 text-slate-400" />
                              </div>
                            )}
                            <div className="p-5 flex flex-col flex-1 space-y-2">
                              <div className={`font-black text-lg sm:text-xl line-clamp-1 ${t.cardTitle}`}>{item.name || 'Produto sem nome'}</div>
                              {item.description && <div className={`text-sm leading-relaxed line-clamp-2 ${t.cardSub}`}>{item.description}</div>}
                              <div className="mt-auto pt-3 flex items-center justify-between border-t border-white/5" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                                <span className="font-black text-lg sm:text-xl" style={{ color: brandColor }}>{item.price}</span>
                                <span className="text-xs sm:text-sm font-extrabold px-4 py-2 rounded-full border transition-[color,background-color,border-color] duration-200 details-btn">Ver Detalhes</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {maxCatalogIndex > 0 && (
                  <>
                    {/* Left Arrow */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCatalogIndex((prev) => (prev <= 0 ? maxCatalogIndex : prev - 1));
                      }}
                      className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 text-white shadow-xl transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
                    >
                      <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: brandColor || '#FE540B' }} />
                    </button>

                    {/* Right Arrow */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCatalogIndex((prev) => (prev >= maxCatalogIndex ? 0 : prev + 1));
                      }}
                      className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 text-white shadow-xl transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
                    >
                      <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: brandColor || '#FE540B' }} />
                    </button>
                  </>
                )}
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
                   const hasDesktopLayers = !!item.layers && item.layers.length > 0;
                   const hasMobileLayers = !!item.mobile_layers && item.mobile_layers.length > 0;
                   const coverImg = isMobileView
                     ? (hasMobileLayers ? item.mobile_layers[0].image_url : (hasDesktopLayers ? item.layers[0].image_url : item.image_url))
                     : (hasDesktopLayers ? item.layers[0].image_url : (hasMobileLayers ? item.mobile_layers[0].image_url : item.image_url));
                   
                   return (
                     <div 
                       key={item.id}
                       onClick={() => {
                         setActivePortfolioId(item.id);
                         setActiveView("portfolio");
                         window.scrollTo({ top: 0, behavior: 'smooth' });
                         document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
                         document.body.scrollTo({ top: 0, behavior: 'smooth' });
                         if (mainScrollRef.current) {
                           mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                         }
                       }}
                       className="relative aspect-square w-full rounded-[1.5rem] overflow-hidden border shadow-lg hover:shadow-lg transition-all duration-300 cursor-pointer bg-zinc-950/20 group flex items-center justify-center"
                       style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                     >
                       {coverImg ? (
                         <OptimizedMedia 
                           src={coverImg} 
                           alt={item.title || "Portfolio item"} 
                           className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                           isCover={true}
                         />
                       ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center bg-black/5 dark:bg-white/5">
                           <Layout className="w-8 h-8 opacity-20 mb-2" />
                         </div>
                       )}
                       
                       {/* Overlay with Portfolio Title */}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-95 transition-all duration-300 flex flex-col justify-end p-5 sm:p-6 group-hover:from-black/100 group-hover:via-black/45">
                         <div className="flex items-center justify-between w-full">
                           <div className="flex flex-col space-y-1.5 pr-4">
                             <span className="text-white font-black text-lg sm:text-xl md:text-2xl tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] leading-tight transition-all duration-300 group-hover:translate-x-0.5">
                               {(isMobileView && item.title_mobile) ? item.title_mobile : (item.title || "Portfólio")}
                             </span>
                             {(isMobileView && hasMobileLayers) ? (
                               <span className="text-white/80 text-xs sm:text-sm font-bold opacity-90">
                                 {item.mobile_layers.length} {item.mobile_layers.length === 1 ? 'mídia' : 'mídias'}
                               </span>
                             ) : (isNewFormat && item.layers && (
                               <span className="text-white/80 text-xs sm:text-sm font-bold opacity-90">
                                 {item.layers.length} {item.layers.length === 1 ? 'mídia' : 'mídias'}
                               </span>
                             ))}
                           </div>
                           
                           {/* Beautifully animated arrow > */}
                           <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-white/10 text-white border border-white/20 backdrop-blur-md shadow-lg transition-all duration-300 group-hover:bg-white/20 group-hover:scale-110 group-hover:border-white/45 group-hover:translate-x-1 shrink-0">
                             <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:scale-110" />
                           </div>
                         </div>
                       </div>
                       

                     </div>
                   );
                })}
              </div>
            </div>
          )}

            </motion.div>
          )}
          </AnimatePresence>

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
                onClick={() => {
                  if (user) {
                    navigate("/");
                  } else {
                    setIsLoginOpen(true);
                  }
                }}
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
            className={`w-full max-w-md rounded-[2rem] border overflow-hidden shadow-lg flex flex-col ${
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

      {/* PWA / MOBILE APP LAUNCH REDIRECT MODAL */}
      {showAppRedirectScreen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
          <div 
            className={`w-full max-w-md rounded-[2.5rem] border p-8 flex flex-col items-center text-center shadow-lg relative ${
              theme === 'glass'
                ? 'bg-[#0a0b10]/80 backdrop-blur-3xl border-white/12 text-white shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8)]'
                : theme === 'dark'
                  ? 'bg-[#0d0e12] border-zinc-800 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Ambient background glow matching CardDigital GM */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#FE540B]/10 rounded-full blur-[60px] pointer-events-none" />

            {/* Glowing Logo Icon */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-[#FE540B]/20 rounded-lg blur-md scale-105" />
              <div className="relative w-20 h-20 rounded-lg border border-white/10 bg-[#0c0d12] flex items-center justify-center p-2.5 overflow-hidden">
                <img 
                  src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg" 
                  alt="CardDigital GM" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-extrabold tracking-tight mb-2 text-white">
              Acesso Autorizado! 🚀
            </h3>
            <p className="text-sm font-semibold opacity-80 mb-6 font-funnel uppercase tracking-wider" style={{ color: "#FE540B" }}>
              CardDigital GM
            </p>

            {/* Content text */}
            <div className="space-y-4 mb-8 text-xs sm:text-sm leading-relaxed text-left bg-white/5 dark:bg-black/25 p-5 rounded-[1.5rem] border border-white/5 text-slate-300">
              <p className="font-semibold text-center text-white">
                Como você está acessando de um celular, recomendamos usar o aplicativo instalado:
              </p>
              <div className="space-y-2 mt-3 text-[11px] opacity-80 border-t border-white/5 pt-3">
                <div className="flex items-start gap-2">
                  <span className="text-[#FE540B] font-bold">1.</span>
                  <span>Se o aplicativo já está instalado no seu smartphone, toque no botão abaixo para tentar abri-lo diretamente ou abra pelo ícone de atalho na sua tela inicial.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#FE540B] font-bold">2.</span>
                  <span>Caso prefira usar no próprio navegador por enquanto, basta clicar em <strong>"Continuar no Navegador"</strong>.</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="w-full space-y-3">
              <button
                onClick={() => {
                  // Direct standard web link opening, triggering installed PWA deep-linking on supported browsers
                  window.location.href = window.location.origin + "/";
                }}
                className="w-full py-4 px-6 rounded-lg text-white font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                style={{ backgroundColor: "#FE540B" }}
              >
                <ExternalLink className="w-5 h-5" />
                <span>Abrir no Aplicativo Instalado</span>
              </button>

              <button
                onClick={() => {
                  setShowAppRedirectScreen(false);
                  navigate("/");
                }}
                className={`w-full py-3.5 px-6 rounded-lg text-xs font-bold transition-all border hover:bg-white/5 active:scale-[0.98] cursor-pointer ${
                  theme === 'glass' || theme === 'dark'
                    ? 'border-white/10 text-white/70 hover:text-white'
                    : 'border-slate-200 text-slate-600 hover:text-slate-900 bg-slate-50'
                }`}
              >
                Continuar no Navegador
              </button>
            </div>
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

        const isPngImage = (url?: string) => {
          if (!url) return false;
          const lower = url.toLowerCase();
          return lower.includes('.png') || lower.includes('image/png') || lower.includes('format=png');
        };

        const isMainPng = isPngImage(activeImageUrl);

        return (
          <div className="fixed inset-0 z-[150] flex items-start md:items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto py-6 sm:py-10 animate-fade-in" onClick={() => setSelectedProduct(null)}>
            <div 
              className={`w-full max-w-lg md:max-w-[1200px] lg:max-w-[1400px] xl:max-w-[1500px] rounded-[2rem] border overflow-hidden md:overflow-visible shadow-lg flex flex-col h-auto md:max-h-none ${
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
                <span className="text-sm font-bold tracking-wider opacity-85">Detalhes do produto</span>
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="p-1.5 rounded-full hover:bg-slate-500/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Container (Grid with Left/Right split on Desktop) */}
              <div className="overflow-y-auto md:overflow-visible flex-1 no-scrollbar p-5 md:p-8">
                <div className={`grid items-stretch ${asPreview && previewMode === 'smartphone' ? 'grid-cols-1 gap-6' : 'grid-cols-1 md:grid-cols-12 gap-6 md:gap-10'}`}>
                  
                  {/* LEFT COLUMN: Image Gallery (Span 5) */}
                  <div 
                    className={`${asPreview && previewMode === 'smartphone' ? '' : 'md:col-span-5 md:pr-8 md:border-r'} flex flex-col justify-start space-y-4 items-center`}
                    style={{ borderColor: theme === 'glass' ? 'rgba(255,255,255,0.1)' : theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                  >
                    <div className="w-full max-w-[280px] sm:max-w-[360px] md:max-w-[380px] lg:max-w-[420px] xl:max-w-[450px] mx-auto flex flex-col space-y-5">
                      <div 
                        className="relative w-full aspect-square rounded-[24px] overflow-hidden border flex items-center justify-center p-3 group shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] transition-all duration-300" 
                        style={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: theme === 'glass' ? 'rgba(255,255,255,0.1)' : theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' 
                        }}
                      >
                        {activeImageUrl ? (
                          <OptimizedMedia 
                            src={activeImageUrl} 
                            alt={selectedProduct.name} 
                            className="max-w-full max-h-full object-contain cursor-zoom-in transition-transform duration-300 hover:scale-102" 
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
                            className="absolute bottom-4 right-4 p-2.5 rounded-full bg-black/75 hover:bg-black/90 text-white border border-white/10 transition-all hover:scale-110 active:scale-95 shadow-xl flex items-center justify-center cursor-pointer z-20 group"
                            title="Ver imagem ampliada"
                          >
                            <ZoomIn className="w-5 h-5" style={{ color: brandColor || '#ff6900' }} />
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

                      {/* Thumbnails Gallery Row - Centered with flex row */}
                      {productImages.length > 1 && (
                        <div className="w-full">
                          <div className="flex flex-wrap items-center justify-center gap-3">
                            {productImages.map((img: string, idx: number) => {
                              const isActive = activeImageIndex === idx;

                              const buttonStyle: React.CSSProperties = isActive ? {
                                background: `linear-gradient(90deg, ${brandColor || '#FE540B'}, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, ${brandColor || '#FE540B'})`,
                                backgroundSize: '300% 300%',
                                animation: 'color-loop 5s ease infinite',
                                padding: '3px',
                                boxShadow: `0 8px 24px -4px rgba(0,0,0,0.45), 0 0 16px ${brandColor || '#FE540B'}55`,
                              } : {
                                backgroundColor: '#ffffff',
                              };

                              return (
                                <button
                                  key={idx}
                                  onClick={() => setActiveImageIndex(idx)}
                                  className={`relative aspect-square w-[80px] h-[80px] sm:w-[95px] sm:h-[95px] rounded-lg overflow-hidden transition-all flex items-center justify-center cursor-pointer ${
                                    isActive 
                                      ? 'scale-102 opacity-100' 
                                      : 'opacity-50 hover:opacity-100 border border-black/5 dark:border-white/10'
                                  }`}
                                  style={buttonStyle}
                                >
                                  {isActive ? (
                                    <div className="w-full h-full rounded-[13px] flex items-center justify-center overflow-hidden bg-white p-0.5">
                                      <OptimizedMedia 
                                        src={img} 
                                        alt={`Thumbnail ${idx + 1}`} 
                                        className="w-full h-full object-cover rounded-[11px]" 
                                        width={150} 
                                        isCover={true} 
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-full h-full rounded-[14px] flex items-center justify-center overflow-hidden bg-white p-0.5">
                                      <OptimizedMedia 
                                        src={img} 
                                        alt={`Thumbnail ${idx + 1}`} 
                                        className="w-full h-full object-cover rounded-[12px]" 
                                        width={150} 
                                        isCover={true} 
                                      />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Info & Actions (Span 7) */}
                  <div className={`${asPreview && previewMode === 'smartphone' ? '' : 'md:col-span-7 md:pl-6'} flex flex-col justify-between h-full space-y-6`}>
                    
                    {/* Product Meta details */}
                    <div className="space-y-4 text-left">
                      <h3 className="text-2xl font-black tracking-tight leading-tight">{selectedProduct.name || 'Produto sem nome'}</h3>
                      
                      {(selectedProductOption?.price || selectedProduct.price) && (
                        <div className="space-y-1.5 animate-in fade-in duration-300">
                          <div className="text-3xl font-black tracking-tight" style={{ color: brandColor || '#ff6900' }}>
                            {selectedProductOption ? selectedProductOption.price : selectedProduct.price}
                          </div>
                          {selectedProductOption && (
                            <div className="text-xs font-bold tracking-wide text-zinc-400 flex items-center gap-1.5 bg-white/5 py-1 px-2.5 rounded-lg border border-white/5 w-fit">
                              <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: brandColor || '#ff6900' }} />
                              Opção selecionada: <span className="text-white font-black">{selectedProductOption.quantity}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* VARIATIONS / OPTIONS SELECTOR */}
                      {selectedProduct.options && selectedProduct.options.length > 0 && (
                        <div className="pt-2">
                          <span className="text-xs font-bold tracking-wide opacity-60 block mb-2.5">Selecione a quantidade / variação</span>
                          <div className="grid grid-cols-2 gap-2.5">
                            {selectedProduct.options.map((opt: any) => {
                              const isSelected = selectedProductOption?.id === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setSelectedProductOption(opt)}
                                  className={`p-3.5 rounded-lg border text-left transition-all relative flex flex-col justify-between cursor-pointer group ${
                                    isSelected 
                                      ? 'text-white' 
                                      : 'border-white/5 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-white/10 text-zinc-300'
                                  }`}
                                  style={isSelected ? { 
                                    borderColor: brandColor, 
                                    backgroundColor: `${brandColor}12`,
                                    boxShadow: `0 0 0 1px ${brandColor}, 0 0 12px ${brandColor}25`
                                  } : undefined}
                                >
                                  <span className="text-[10px] font-semibold tracking-wide block opacity-50 mb-1 group-hover:opacity-75 transition-opacity">Qtd / opção</span>
                                  <span className="text-sm font-black block truncate leading-tight mb-2 text-white">{opt.quantity}</span>
                                  <span className="text-xs font-bold block mt-auto" style={{ color: isSelected ? (brandColor || '#ff6900') : '#a1a1aa' }}>{opt.price}</span>
                                  {isSelected && (
                                    <span 
                                      className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full animate-pulse" 
                                      style={{ backgroundColor: brandColor || '#ff6900' }} 
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {selectedProduct.description && (
                        <div className="pt-2">
                          <span className="text-xs font-bold tracking-wide opacity-60 block mb-1.5">Descrição e outras informações</span>
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
                        <span className="text-sm font-bold opacity-80 tracking-wide">Quantidade</span>
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
                        <div className="grid grid-cols-2 gap-4">
                          {/* Left column: Adicionar & Ver no Site Original */}
                          <div className="flex flex-col gap-2.5">
                            <button 
                              onClick={() => {
                                addToCart(selectedProduct, productQuantity, selectedProductOption);
                                setSelectedProduct(null);
                              }}
                              className={`w-full flex items-center justify-center py-4 px-3 rounded-lg font-black text-xs sm:text-sm whitespace-nowrap transition-all shadow-md border cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                                theme === 'glass'
                                  ? 'bg-white/10 hover:bg-white/15 text-white border-white/10'
                                  : theme === 'dark' 
                                    ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border-zinc-800' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                              }`}
                            >
                              <Plus className="w-4 h-4 mr-1.5 shrink-0" />
                              Adicionar
                            </button>

                            {productLink && (
                              <a 
                                href={productLink}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full flex items-center justify-center py-2.5 text-xs font-bold opacity-65 hover:opacity-100 transition-opacity"
                              >
                                <Globe className="w-4 h-4 mr-1.5 shrink-0" />
                                Ver no Site Original
                              </a>
                            )}
                          </div>

                          {/* Right column: Comprar Já & Voltar ao Catálogo */}
                          <div className="flex flex-col gap-2.5">
                            <button 
                              onClick={() => {
                                addToCart(selectedProduct, productQuantity, selectedProductOption);
                                setSelectedProduct(null);
                                setIsCartOpen(true);
                              }}
                              className="w-full flex items-center justify-center py-4 px-3 rounded-lg text-white font-black text-xs sm:text-sm whitespace-nowrap transition-all shadow-md hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] cursor-pointer"
                              style={{ backgroundColor: brandColor || '#ff6900' }}
                            >
                              <ShoppingCart className="w-4 h-4 mr-1.5 shrink-0" />
                              Comprar Já
                            </button>

                            <button 
                              onClick={() => {
                                setSelectedProduct(null);
                                setTimeout(() => {
                                  const el = document.getElementById("catalog-section");
                                  if (el) {
                                    el.scrollIntoView({ behavior: "smooth" });
                                  }
                                }, 100);
                              }}
                              className={`w-full py-3.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
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
            <OptimizedMedia 
              src={zoomedImage} 
              alt="Imagem detalhada" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-lg animate-scale-up" 
            />
          </div>
        </div>
      )}

      {/* Portfolio Fullscreen Lightbox Overlay */}
      {portfolioLightbox && (
        <div 
          className="fixed inset-0 z-[250] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in cursor-default select-none"
          onClick={() => setPortfolioLightbox(null)}
        >
          {/* Top panel with details / close button */}
          <div className="absolute top-0 inset-x-0 p-5 flex items-center justify-between z-30 bg-gradient-to-b from-black/60 to-transparent">
            {portfolioLightbox.images.length > 1 ? (
              <span className="text-white/80 font-mono text-sm bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full">
                {portfolioLightbox.currentIndex + 1} / {portfolioLightbox.images.length}
              </span>
            ) : (
              <div />
            )}
            
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxFit(prev => prev === "cover" ? "contain" : "cover");
                }}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-xs sm:text-sm transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-lg flex items-center gap-2 border border-white/5"
                title={lightboxFit === "cover" ? "Ajustar à tela (Ver imagem inteira)" : "Preencher tela (Fullscreen sem bordas)"}
              >
                {lightboxFit === "cover" ? (
                  <>
                    <Minimize2 className="w-4 h-4" />
                    <span>Ajustar à Tela</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4" />
                    <span>Preencher Tela</span>
                  </>
                )}
              </button>

              <button 
                onClick={() => setPortfolioLightbox(null)}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-lg flex items-center justify-center border border-white/5"
                title="Fechar (Esc)"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Main image content area */}
          <div 
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Nav Arrow */}
            {portfolioLightbox.images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPortfolioLightbox(prev => {
                    if (!prev) return null;
                    const prevIdx = (prev.currentIndex - 1 + prev.images.length) % prev.images.length;
                    return { ...prev, currentIndex: prevIdx };
                  });
                }}
                className="absolute left-4 sm:left-6 md:left-10 p-3 sm:p-4 rounded-full bg-black/40 hover:bg-black/60 hover:scale-110 active:scale-90 border border-white/10 text-white transition-all cursor-pointer z-30 shadow-lg flex items-center justify-center"
                title="Imagem Anterior (Seta Esquerda)"
              >
                <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
            )}

            {/* Centered Image */}
            <div className={`relative w-full h-full flex items-center justify-center ${lightboxFit === 'contain' ? 'p-4 sm:p-8 md:p-12 max-w-[95vw] max-h-[85vh]' : ''}`}>
              <OptimizedMedia 
                src={portfolioLightbox.images[portfolioLightbox.currentIndex]} 
                alt={`Imagem de portfólio ${portfolioLightbox.currentIndex + 1}`} 
                className={`select-none pointer-events-none animate-scale-up transition-all duration-300 ${
                  lightboxFit === 'cover' 
                    ? 'w-full h-full object-cover shadow-lg' 
                    : 'max-w-full max-h-[80vh] object-contain rounded-lg sm:rounded-xl shadow-lg'
                }`} 
              />
            </div>

            {/* Right Nav Arrow */}
            {portfolioLightbox.images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPortfolioLightbox(prev => {
                    if (!prev) return null;
                    const nextIdx = (prev.currentIndex + 1) % prev.images.length;
                    return { ...prev, currentIndex: nextIdx };
                  });
                }}
                className="absolute right-4 sm:right-6 md:right-10 p-3 sm:p-4 rounded-full bg-black/40 hover:bg-black/60 hover:scale-110 active:scale-90 border border-white/10 text-white transition-all cursor-pointer z-30 shadow-lg flex items-center justify-center"
                title="Próxima Imagem (Seta Direita)"
              >
                <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails navigation for multi-image portfolios */}
          {portfolioLightbox.images.length > 1 && (
            <div 
              className="absolute bottom-6 inset-x-0 flex justify-center gap-2 px-4 py-2 overflow-x-auto max-w-full z-30"
              onClick={(e) => e.stopPropagation()}
            >
              {portfolioLightbox.images.map((imgUrl, thumbIdx) => (
                <button
                  key={thumbIdx}
                  onClick={() => setPortfolioLightbox(prev => prev ? { ...prev, currentIndex: thumbIdx } : null)}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer flex-shrink-0 ${
                    portfolioLightbox.currentIndex === thumbIdx 
                      ? 'border-orange-500 scale-110 shadow-lg' 
                      : 'border-white/20 opacity-50 hover:opacity-100 hover:border-white/55'
                  }`}
                  style={portfolioLightbox.currentIndex === thumbIdx && brandColor ? { borderColor: brandColor } : {}}
                >
                  <img 
                    src={imgUrl} 
                    alt={`Miniatura ${thumbIdx + 1}`} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Shopping Cart FAB Button */}
      {cartTotalItems > 0 && activeView !== "contact" && (
        <button
          onClick={() => {
            setCheckoutStep("cart");
            setIsCartOpen(true);
          }}
          className={`fixed bottom-6 right-20 z-[140] flex items-center gap-2 px-5 py-4 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform font-bold text-white cursor-pointer group`}
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
            className={`w-[88%] sm:w-full max-w-md h-full flex flex-col shadow-lg pointer-events-auto relative pl-[6px] animate-in slide-in-from-right duration-300 ${
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
                        const itemPriceParsed = item.selectedOption ? parsePrice(item.selectedOption.price) : parsePrice(item.product.price);
                        const itemTotal = itemPriceParsed * item.quantity;
                        const optionLabel = item.selectedOption ? ` (${item.selectedOption.quantity})` : "";
                        return (
                          <div 
                            key={idx}
                            className={`flex gap-4 p-4 rounded-lg border transition-all ${
                              theme === 'glass'
                                ? 'bg-white/5 border-white/10 text-white'
                                : theme === 'dark' 
                                  ? 'bg-zinc-900/60 border-zinc-800' 
                                  : 'bg-slate-50 border-slate-200/60'
                            }`}
                          >
                            {/* Product Thumbnail */}
                            <div 
                              className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border flex items-center justify-center p-1" 
                              style={{ 
                                backgroundColor: theme === 'glass' ? 'rgba(255,255,255,0.02)' : theme === 'dark' ? `${brandColor}08` : '#ffffff', 
                                borderColor: theme === 'glass' ? 'rgba(255,255,255,0.08)' : theme === 'dark' ? `${brandColor}15` : 'rgba(0,0,0,0.05)' 
                              }}
                            >
                              {item.product.image_url ? (
                                <OptimizedMedia src={item.product.image_url} alt={item.product.name} className="max-w-full max-h-full object-contain" width={150} isCover={true} />
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
                                  <h4 className="font-extrabold text-sm sm:text-base truncate pr-1">{item.product.name}{optionLabel}</h4>
                                  <p className="text-[11px] opacity-60 mt-0.5">Unitário: {formatPrice(itemPriceParsed)}</p>
                                </div>
                                <button 
                                  onClick={() => removeFromCart(item.product.id, item.selectedOption?.id)}
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
                                    onClick={() => updateCartQuantity(item.product.id, item.quantity - 1, item.selectedOption?.id)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-sm font-bold cursor-pointer"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-6 text-center font-black text-xs">{item.quantity}</span>
                                  <button 
                                    onClick={() => updateCartQuantity(item.product.id, item.quantity + 1, item.selectedOption?.id)}
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
                      <div className="space-y-5 bg-black/5 dark:bg-white/5 p-4 rounded-lg border border-slate-200/50 dark:border-white/10 shadow-sm">
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
                            className={`w-full px-4 py-3.5 rounded-lg text-base font-medium border focus:outline-none transition-all shadow-sm focus:ring-2 focus:ring-brand focus-border-brand ${
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
                            className={`w-full px-4 py-3.5 rounded-lg text-base font-medium border focus:outline-none transition-all shadow-sm focus:ring-2 focus:ring-brand focus-border-brand ${
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
                            className={`w-full px-4 py-3.5 rounded-lg text-base font-medium border focus:outline-none transition-all shadow-sm focus:ring-2 focus:ring-brand focus-border-brand ${
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
                          <div className="grid grid-cols-2 gap-2 bg-slate-200/50 dark:bg-black/25 p-1.5 rounded-lg border border-slate-300/60 dark:border-white/10">
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
                              className={`w-full px-4 py-3 rounded-lg text-base font-medium border focus:outline-none transition-all resize-none shadow-sm focus:ring-2 focus:ring-brand focus-border-brand ${
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
                              <div className="rounded-lg border overflow-hidden shadow-sm transition-all duration-300 border-slate-200 dark:border-white/10 bg-white/5 dark:bg-black/10">
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
                                    
                                    <div className="bg-white p-3.5 rounded-lg inline-block shadow-md border border-slate-200">
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
                                      className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-black transition-all duration-300 hover:shadow-md hover:brightness-110 cursor-pointer text-white border-0 shadow-sm"
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
                              <div className="rounded-lg border overflow-hidden shadow-sm transition-all duration-300 border-slate-200 dark:border-white/10 bg-white/5 dark:bg-black/10">
                                {/* Accordion Header */}
                                <button
                                  type="button"
                                  onClick={() => setIsCardExpanded(!isCardExpanded)}
                                  className="w-full flex items-center justify-between p-4 font-black text-sm tracking-wide transition-all duration-200 text-left cursor-pointer hover:bg-slate-500/10 active:scale-[0.99]"
                                  style={{ borderLeft: `4px solid ${brandColor || '#FE540B'}` }}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${brandColor || '#FE540B'}20` }}>
                                      <CreditCard className="w-5 h-5" style={{ color: brandColor || '#FE540B' }} />
                                    </div>
                                    <span className="text-slate-800 dark:text-slate-100 text-base font-extrabold uppercase">PAGAR COM CARTÃO</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${brandColor || '#FE540B'}20`, color: brandColor || '#FE540B' }}>Cartão de Crédito</span>
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
                                      className="w-full flex items-center justify-center py-4 px-4 rounded-xl text-sm font-black text-white transition-all duration-300 hover:shadow-lg border-0 shadow-md"
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
                      className="w-full flex items-center justify-center p-4 rounded-lg text-white font-black text-sm transition-all shadow-lg hover:brightness-110 active:scale-[0.98] cursor-pointer"
                      style={{ backgroundColor: brandColor }}
                    >
                      Avançar para Entrega
                      <ChevronRight className="w-5 h-5 ml-1.5" />
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <button 
                        onClick={handleCheckoutWhatsApp}
                        className="w-full flex items-center justify-center p-4 rounded-lg text-white font-black text-sm transition-all shadow-lg hover:brightness-110 active:scale-[0.98] cursor-pointer bg-green-600 hover:bg-green-700"
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
          {/* Custom style sheet injected safely for laser scanner and custom transitions */}
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes qr-scan {
              0% { top: 6% }
              100% { top: 94% }
            }
            .animate-qr-scan {
              animation: qr-scan 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }
          `}} />

          {(() => {
            const getChatQrUrl = () => {
              if (bio.chat_balloon_qr_link) {
                return formatExternalUrl(bio.chat_balloon_qr_link) || "";
              }
              const whatsappClean = (bio.whatsapp || bio.phone || "").replace(/\D/g, "");
              if (!whatsappClean) {
                return "";
              }
              const textMsg = bio.chat_balloon_qr_msg || "Olá! Estou vindo do site GM edificação, quero saber mais.";
              return `https://api.whatsapp.com/send?phone=${whatsappClean}&text=${encodeURIComponent(textMsg)}`;
            };

            const qrUrl = getChatQrUrl();
            const brandThemeColor = bio.chat_balloon_bg_color || "#FE540B";

            return (
              <AnimatePresence mode="wait">
                {isChatIconVisible && (
                  isChatWidgetOpen ? (
                    /* Big Chat Widget with hover QR Code overlay (exactly matching the print style!) */
                    <motion.div 
                      key="chat-balloon-open"
                      initial={{ opacity: 0, scale: 0.8, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 15, transition: { duration: 0.15, ease: "easeInOut" } }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="chat-widget-hoverable fixed bottom-4 right-4 sm:bottom-6 sm:right-20 z-[150] w-[calc(100%-2rem)] max-w-[285px] sm:max-w-none sm:w-[310px] rounded-[2rem] sm:rounded-[2.2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] border border-slate-200/50 flex flex-col justify-between overflow-visible bg-[#FBF7F4] transition-all duration-300"
                    style={{
                      fontFamily: "Inter, sans-serif"
                    }}
                  >
                    {/* 2. QR Code Overlay Card (Fades in/out on hover of button - identical to print layout) */}
                    <div 
                      onClick={() => {
                        if (qrUrl) {
                          window.open(qrUrl, "_blank");
                        }
                      }}
                      onMouseEnter={() => setIsHoveringChat(true)}
                      onMouseLeave={() => setIsHoveringChat(false)}
                      className={`absolute -top-[195px] right-[20px] z-[160] w-[165px] h-[190px] bg-white rounded-[2rem] shadow-[0_15px_45px_rgba(0,0,0,0.22)] border border-slate-100/60 flex flex-col items-center justify-center p-3 cursor-pointer transition-all duration-300 ease-out origin-bottom ${
                        isHoveringChat && bio.chat_balloon_show_qrcode !== false
                          ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                          : "opacity-0 scale-95 translate-y-3 pointer-events-none"
                      }`}
                    >
                      {/* Clean, high-fidelity QR Code block - perfectly centered */}
                      <div className="bg-white p-1.5 rounded-xl flex items-center justify-center border border-slate-50/50 w-[115px] h-[115px] aspect-square mb-1.5 shrink-0">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl || "https://carddigitalgm.com")}`}
                          alt="WhatsApp QR Code"
                          className="w-full h-full object-contain select-none pointer-events-none"
                        />
                      </div>
                      
                      {/* Styled label matching "Scan the code" under the code */}
                      <span className="text-[11px] font-semibold text-slate-500 tracking-tight leading-none select-none">
                        Scan the code
                      </span>

                      {/* Speech bubble pointy arrow at the bottom of the QR card */}
                      <div 
                        className="absolute bottom-[-6px] right-[40px] w-3.5 h-3.5 bg-white rotate-45 border-r border-b border-slate-100" 
                        style={{ boxShadow: "3px 3px 6px rgba(0,0,0,0.03)" }}
                      />
                    </div>

                    {/* 3. Primary Chat Box Shell */}
                    <div className="w-full h-full flex flex-col justify-between rounded-[2rem] sm:rounded-[2.2rem] overflow-hidden border border-slate-100/10">
                      {/* Header with Join.chat style */}
                      <div 
                        className="px-4.5 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between shadow-sm shrink-0"
                        style={{ 
                          backgroundColor: brandThemeColor,
                          color: bio.chat_balloon_text_color || "#FFFFFF"
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11.5px] sm:text-[12.5px] opacity-95 font-semibold leading-none tracking-wide">
                            Chat CardDigital GM
                          </span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsChatWidgetOpen(false);
                          }}
                          className="w-6.5 h-6.5 flex items-center justify-center rounded-full bg-black/15 hover:bg-black/25 transition-all cursor-pointer"
                          style={{ color: bio.chat_balloon_text_color || "#FFFFFF" }}
                          title="Fechar Chat"
                        >
                          <X className="w-3 h-3 stroke-[2.5]" />
                        </button>
                      </div>

                      {/* Conversation & Action Area */}
                      <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between gap-3 shrink-0">
                        {/* Speech Bubble Area */}
                        <div className="flex items-start gap-2.5">
                          {/* Avatar with company logo */}
                          <div className="shrink-0 relative mt-0.5">
                            {logo ? (
                              <img 
                                src={logo} 
                                alt={companyName} 
                                className="w-7.5 h-7.5 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-white shadow-sm" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div 
                                className="w-7.5 h-7.5 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-white border border-slate-200 text-[10px] font-black uppercase shadow-sm"
                                style={{ color: brandThemeColor }}
                              >
                                {companyName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* Chat speech bubble */}
                          <div 
                            className="relative bg-white text-slate-800 p-3 sm:p-4 rounded-[1.1rem] sm:rounded-[1.4rem] rounded-tl-none shadow-[0_8px_22px_-6px_rgba(0,0,0,0.1)] border border-slate-100/50 text-[11.5px] sm:text-[12.5px] font-medium max-w-[185px] sm:max-w-[220px]"
                          >
                            {/* Speech bubble arrow pointing left */}
                            <div className="absolute left-[-4.5px] top-3.5 w-2 h-2 bg-white rotate-45 border-l border-t border-slate-100/50" />
                            <div className="space-y-1 text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {bio.chat_balloon_text ? (
                                bio.chat_balloon_text
                              ) : (
                                <>
                                  <div className="flex items-center gap-1 text-[12px] sm:text-[13px] font-bold text-slate-800">
                                    Olá <span className="animate-bounce">👋</span>
                                  </div>
                                  <div className="text-slate-600 font-medium">
                                    Como podemos te ajudar hoje?
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Open Chat Action Button with Thick Black Border */}
                        <div className="flex justify-end">
                          <button 
                            onClick={() => {
                              if (!qrUrl) {
                                setCustomAlert({
                                  title: "Contato não configurado",
                                  message: "O administrador não cadastrou um número de WhatsApp ou link para contato nesta Bio."
                                });
                                return;
                              }
                              window.open(qrUrl, "_blank");
                            }}
                            onMouseEnter={() => setIsHoveringChat(true)}
                            onMouseLeave={() => setIsHoveringChat(false)}
                            className="px-4.5 py-1.5 sm:px-5.5 sm:py-2 rounded-full font-extrabold text-[11px] sm:text-[12.5px] flex items-center gap-2 border-[2px] border-slate-950 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-md"
                            style={{ 
                              backgroundColor: brandThemeColor,
                              color: bio.chat_balloon_text_color || "#FFFFFF"
                            }}
                          >
                            <span>{bio.chat_balloon_button_text || "Abrir chat"}</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-white" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="22" y1="2" x2="11" y2="13"></line>
                              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  ) : (
                    /* Minimized state: floating button with smooth 1.5s scale 0 -> 1 transition */
                    <motion.div 
                      key="chat-balloon-closed"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0, transition: { duration: 0.15, ease: "easeInOut" } }}
                      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                      className="fixed bottom-6 right-6 sm:right-20 z-[140] flex items-center justify-center overflow-visible"
                    >
                      {/* Minimized round floating button with custom sizing & no pulsing / bouncing */}
                      <button
                        onClick={() => {
                          setIsChatWidgetOpen(true);
                        }}
                        className="w-[58px] h-[58px] sm:w-[66px] sm:h-[66px] rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 border border-white/15"
                        style={{ 
                          backgroundColor: "#25D366",
                        }}
                        title="Abrir Atendimento"
                      >
                        <img 
                          src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20BRANCA/Whatsapp%20branco.svg" 
                          alt="WhatsApp" 
                          className="w-8 h-8 sm:w-[38px] sm:h-[38px] object-contain"
                        />
                      </button>
                    </motion.div>
                  )
                )}
              </AnimatePresence>
            );
          })()}
        </>
      )}

      {/* Elegant Custom Alert Modal */}
      {customAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setCustomAlert(null)}>
          <div 
            className={`w-full max-w-sm rounded-[2rem] border overflow-hidden shadow-lg p-6 flex flex-col items-center text-center gap-4 animate-scale-up ${
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
