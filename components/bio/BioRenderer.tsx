import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Lenis from "lenis";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { Globe, Instagram, Facebook, Mail, Phone, MapPin, Copy, Box, FileText, Check, CheckCircle2, MessageCircle, Send, Linkedin, Twitter, Youtube, Link as LinkIcon, Music, Headphones, Github, ShoppingCart, Store, Utensils, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Share2, X, Trash2, ShoppingBag, Plus, Minus, CreditCard, User, Truck, Lock, ShieldCheck, Eye, EyeOff, ZoomIn , Layout, ExternalLink, Menu, Home, Maximize2, Minimize2, Edit3, Sparkles, Palette, ArrowRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { WhatsAppIcon } from "../ui/WhatsAppIcon";
import { upsertSettingsSupabase, AppSettings } from "../../lib/settings";
import { pushToast } from "../../store/toast";
import LiveAdminBar from "./LiveAdminBar";
import { 
  HeroEditModal, 
  LogoModal, 
  ThemeColorsModal, 
  ContactsModal, 
  ProductModal, 
  PortfolioModal, 
  PixEditModal 
} from "./LiveEditModals";
import { QuickTextEditorModal, ElementType, TextEditorFormatting } from "./QuickTextEditorModal";
import { EditableItem } from "./EditableItem";
import { SitePillButton } from "./SitePillButton";
import { CustomerAuthModal } from "./CustomerAuthModal";
import { CustomerDashboardModal } from "./CustomerDashboardModal";
import { CustomerAreaSection } from "./CustomerAreaSection";
import { OrderPaymentModal } from "./OrderPaymentModal";
import { AdminOrdersModal } from "./AdminOrdersModal";
import { AdminHubModal } from "./AdminHubModal";
import { Customer, getCachedCustomer, setCachedCustomer, saveCustomerOrder, CustomerOrder } from "../../lib/customerService";
import { createOrderPayment } from "../../lib/paymentService";
import { ADMIN_EMAIL } from "../../constants";

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

export const BrandPinterestIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.357-.053.224-.174.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.229 7.462-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
  </svg>
);

export const BrandXIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export const BrandThreadsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.186 24C5.466 24 0 18.534 0 11.814 0 5.094 5.466 0 12.186 0c6.687 0 12.128 5.378 12.186 12.062v.27c-.035 3.32-1.365 6.471-3.743 8.87a12.098 12.098 0 0 1-8.443 3.522v-2.073c2.72 0 5.342-1.045 7.337-2.923 1.996-1.878 3.11-4.453 3.14-7.224a10.114 10.114 0 0 0-10.134-10.37C6.61 2.134 2.134 6.61 2.134 12.186c0 5.576 4.476 10.052 10.052 10.052 2.68 0 5.234-1.047 7.189-2.948l1.458 1.472C18.498 22.956 15.42 24 12.186 24z"/>
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
  instant = false,
  forceBlack = false
}: {
  itemKey: string;
  label: string;
  theme: string;
  sizeClass?: string;
  fallbackIcon: React.ComponentType<any>;
  disableScale?: boolean;
  instant?: boolean;
  forceBlack?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isDark = forceBlack ? false : (theme === 'dark' || theme === 'glass');
  const hasCustom = !!customSocialIcons[itemKey];

  const handleMouseEnter = () => setHovered(true);
  const handleMouseLeave = () => setHovered(false);

  if (hasCustom) {
    const urls = customSocialIcons[itemKey];
    const srcUrl = hovered ? urls.orange : (forceBlack ? urls.black : (isDark ? urls.white : urls.black));

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
    : (forceBlack ? "text-black" : (isDark ? "text-white" : "text-black"));

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

function TopBarSocialIcon({ 
  item,
  theme = "dark",
  asPreview = false
}: { 
  item: { id: string; title: string; href: string; icon: any };
  theme?: string;
  asPreview?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isLight = theme === "light";
  const customUrls = customSocialIcons[item.id];
  const IconComp = item.icon || (item.id === 'whatsapp' ? BrandWhatsAppIcon : MessageCircle);
  const isWhatsapp = item.id === 'whatsapp';

  // Versão dark: textos e ícones brancos (#ffffff) por padrão, hover laranja (#FE540B)
  // Versão light: ícones escuros por padrão, hover laranja (#FE540B)
  const defaultColor = isLight ? "#18181b" : "#ffffff";
  const currentColor = hovered ? "#FE540B" : defaultColor;

  return (
    <a 
      href={asPreview ? undefined : item.href} 
      target="_blank" 
      rel="noreferrer" 
      title={item.title} 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { if (asPreview) e.preventDefault(); }}
      className={`topbar-social-link group flex items-center justify-center p-1 rounded-md transition-all duration-200 hover:scale-115 cursor-pointer ${isLight ? 'text-zinc-900' : 'text-white'} hover:!text-[#FE540B]`}
      style={{
        color: currentColor,
      }}
    >
      {customUrls && !imgError ? (
        <img 
          src={hovered ? customUrls.orange : (isLight ? customUrls.black : customUrls.white)}
          alt={item.title}
          className="w-5.5 h-5.5 sm:w-6 sm:h-6 object-contain transition-transform duration-200 pointer-events-none"
          onError={() => setImgError(true)}
        />
      ) : (
        <IconComp 
          className={`w-5.5 h-5.5 sm:w-6 sm:h-6 transition-colors duration-200 ${isLight ? 'text-zinc-900' : 'text-white'} group-hover:!text-[#FE540B]`} 
          size={24}
          strokeWidth={isWhatsapp ? undefined : 2.2}
          style={{ 
            color: currentColor,
            stroke: isWhatsapp || item.id === 'facebook' ? 'none' : currentColor,
            fill: isWhatsapp || item.id === 'facebook' ? currentColor : undefined
          }} 
        />
      )}
    </a>
  );
}

type DesktopNavKey = "inicio" | "sobre" | "produtos" | "portfolio" | "contato" | "cliente";

function WebsiteDesktopNav({
  activeView,
  setActiveView,
  setActivePortfolioId,
  theme = "dark",
  orangeColor = "#FE540B",
  userSocialLinks = [],
  asPreview = false,
  hasCatalog = true,
  hasPortfolio = true,
  hasAbout = true,
  currentActiveSection = "inicio",
  onNavigateSection,
  currentCustomer = null,
  onOpenCustomerArea,
}: {
  activeView: string;
  setActiveView: (view: "bio" | "contact" | "portfolio" | "customer") => void;
  setActivePortfolioId: (id: string | null) => void;
  theme?: string;
  orangeColor?: string;
  userSocialLinks?: any[];
  asPreview?: boolean;
  hasCatalog?: boolean;
  hasPortfolio?: boolean;
  hasAbout?: boolean;
  currentActiveSection?: DesktopNavKey;
  onNavigateSection?: (section: DesktopNavKey) => void;
  currentCustomer?: Customer | null;
  onOpenCustomerArea?: () => void;
}) {
  const [hoveredNav, setHoveredNav] = useState<DesktopNavKey | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  const navItems: { key: DesktopNavKey; label: string; show: boolean }[] = ([
    { key: "inicio" as DesktopNavKey, label: "Início", show: true },
    { key: "sobre" as DesktopNavKey, label: "Sobre", show: hasAbout !== false },
    { key: "produtos" as DesktopNavKey, label: "Produtos", show: hasCatalog !== false },
    { key: "portfolio" as DesktopNavKey, label: "Portfólio", show: hasPortfolio !== false },
    { key: "contato" as DesktopNavKey, label: "Contato", show: true },
  ] as { key: DesktopNavKey; label: string; show: boolean }[]).filter(i => i.show);

  const activeTarget: DesktopNavKey = activeView === "contact" 
    ? "contato" 
    : activeView === "portfolio" 
      ? "portfolio" 
      : activeView === "customer"
        ? "cliente"
        : (currentActiveSection || "inicio");

  const currentIndicator: DesktopNavKey = hoveredNav || activeTarget;

  const isLight = theme === "light";
  // Versão dark: textos brancos (#ffffff) por padrão, selecionado / hover fica laranja (#FE540B)
  const navDefaultColor = isLight ? "#18181b" : "#ffffff";

  const [coords, setCoords] = useState<{ x: number; y: number; width: number; ready: boolean }>({
    x: 0,
    y: 0,
    width: 0,
    ready: false
  });

  useEffect(() => {
    const updatePosition = () => {
      const container = containerRef.current;
      const targetText = textRefs.current[currentIndicator] || textRefs.current["inicio"];
      if (container && targetText) {
        const containerRect = container.getBoundingClientRect();
        const textRect = targetText.getBoundingClientRect();
        if (textRect.width > 0) {
          setCoords({
            x: textRect.left - containerRect.left,
            y: textRect.bottom - containerRect.top + 4,
            width: textRect.width,
            ready: true
          });
        }
      }
    };

    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    const timer1 = setTimeout(updatePosition, 50);
    const timer2 = setTimeout(updatePosition, 150);
    const timer3 = setTimeout(updatePosition, 400);
    window.addEventListener("resize", updatePosition);

    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(updatePosition);
    }

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        updatePosition();
      });
      if (containerRef.current) ro.observe(containerRef.current);
      Object.values(textRefs.current).forEach((el) => {
        if (el) ro?.observe(el);
      });
    }

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener("resize", updatePosition);
      if (ro) ro.disconnect();
    };
  }, [currentIndicator, activeTarget, navItems.length]);

  return (
    <div 
      ref={containerRef}
      className="flex items-center gap-6 sm:gap-8 lg:gap-10 relative selection:bg-[#FE540B] selection:text-white"
      onMouseLeave={() => setHoveredNav(null)}
      onPointerLeave={() => setHoveredNav(null)}
    >
      {navItems.map((item) => {
        const isCurrentActive = activeTarget === item.key;
        const isHovered = hoveredNav === item.key;
        const isHighlighted = isHovered || (!hoveredNav && isCurrentActive);

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              if (onNavigateSection) {
                onNavigateSection(item.key);
              } else {
                if (item.key === "contato") {
                  setActiveView("contact");
                } else if (item.key === "portfolio") {
                  setActiveView("portfolio");
                } else {
                  setActiveView("bio");
                  setActivePortfolioId(null);
                }
              }
            }}
            onMouseEnter={() => setHoveredNav(item.key)}
            onMouseMove={() => setHoveredNav(item.key)}
            onPointerEnter={() => setHoveredNav(item.key)}
            className="topbar-nav-link website-nav-btn relative !p-0 !px-0 py-1 text-base sm:text-lg font-bold transition-colors duration-200 cursor-pointer !bg-transparent !shadow-none !border-none select-none hover:!text-[#FE540B] inline-flex items-center justify-center"
            style={{
              background: 'transparent',
              backgroundColor: 'transparent',
              boxShadow: 'none',
              border: 'none',
              outline: 'none',
              padding: 0,
              color: isHighlighted ? orangeColor : navDefaultColor
            }}
          >
            <span 
              ref={(el) => { textRefs.current[item.key] = el; }} 
              className={`inline-block relative transition-colors duration-200 ${isHighlighted ? '!text-[#FE540B]' : isLight ? 'text-zinc-900' : 'text-white'} hover:!text-[#FE540B]`}
            >
              {item.label}
            </span>
          </button>
        );
      })}

      {/* Barra laranja que pega EXATAMENTE a área e largura do item ativo / selecionado */}
      {coords.ready && (
        <motion.span 
          className="absolute h-[3px] rounded-full pointer-events-none shadow-[0_0_8px_rgba(254,84,11,0.6)]"
          initial={false}
          animate={{
            x: coords.x,
            y: coords.y,
            width: coords.width,
            backgroundColor: orangeColor
          }}
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
          style={{ left: 0, top: 0 }}
        />
      )}

      {/* Social Icons na barra superior com adaptação e inversão de cores por tema */}
      {userSocialLinks.length > 0 && (
        <>
          <div className="w-1.5 sm:w-2" />
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {userSocialLinks.map((item) => (
              <TopBarSocialIcon key={item.id} item={item} theme={theme} asPreview={asPreview} />
            ))}
          </div>
        </>
      )}

      {/* Botão Área do Cliente no Topbar Desktop */}
      {onOpenCustomerArea && (
        <div className="flex items-center ml-2 sm:ml-3">
          <button
            type="button"
            onClick={onOpenCustomerArea}
            className={`group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black transition-all shadow-sm cursor-pointer select-none border ${
              activeView === 'customer'
                ? 'bg-[#FE540B] text-white border-[#FE540B] shadow-md'
                : currentCustomer
                  ? 'bg-orange-500/15 text-orange-400 border-orange-500/30 hover:bg-orange-500/25'
                  : isLight
                    ? 'bg-black text-white hover:bg-zinc-800 border-black hover:text-[#FE540B]'
                    : 'bg-white/10 text-white hover:bg-white/20 border-white/15 hover:border-[#FE540B]/40 hover:text-[#FE540B]'
            }`}
            title={currentCustomer ? `Área do Cliente: ${currentCustomer.full_name}` : "Entrar ou cadastrar"}
          >
            <User className={`w-3.5 h-3.5 transition-colors duration-200 ${activeView === 'customer' ? 'text-white' : currentCustomer ? 'text-[#FE540B]' : 'text-white group-hover:text-[#FE540B]'}`} />
            <span className={`truncate max-w-[120px] transition-colors duration-200 ${activeView === 'customer' ? 'text-white' : 'group-hover:text-[#FE540B]'}`}>
              {currentCustomer ? currentCustomer.full_name.split(' ')[0] : 'Área do Cliente'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function BioRenderer({ data, asPreview = false, previewMode }: { data: any, asPreview?: boolean, previewMode?: "smartphone" | "pc" }) {
  const navigate = useNavigate();
  const { user, tenantId: userTenantId, isAdmin: authContextIsAdmin } = useAuth();

  // Real-time live editing state
  const [currentData, setCurrentData] = useState(data);
  const [isLiveEditMode, setIsLiveEditMode] = useState(false);
  const [previewAsVisitor, setPreviewAsVisitor] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingLive, setIsSavingLive] = useState(false);

  // Edit Modals state
  const [isHeroModalOpen, setIsHeroModalOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [productModalState, setProductModalState] = useState<{ isOpen: boolean; product: any | null }>({ isOpen: false, product: null });
  const [portfolioModalState, setPortfolioModalState] = useState<{ isOpen: boolean; project: any | null }>({ isOpen: false, project: null });
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);

  // Customer Area State
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(() => getCachedCustomer());
  const [isCustomerAuthModalOpen, setIsCustomerAuthModalOpen] = useState(false);
  const [isCustomerDashboardOpen, setIsCustomerDashboardOpen] = useState(false);
  const [activePaymentOrder, setActivePaymentOrder] = useState<CustomerOrder | null>(null);
  const [isAdminOrdersModalOpen, setIsAdminOrdersModalOpen] = useState(false);
  const [isAdminHubOpen, setIsAdminHubOpen] = useState(false);

  // Validação de acesso administrativo: apenas com conta e login autenticados do aplicativo
  const isUserAdmin = Boolean(
    (user?.email && (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || user.email.toLowerCase() === "admin@carddigital.com" || user.is_admin || user.role === 'admin' || authContextIsAdmin)) ||
    (currentCustomer?.email && (currentCustomer.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || currentCustomer.email.toLowerCase() === "admin@carddigital.com")) ||
    isLiveEditMode ||
    (typeof window !== "undefined" && localStorage.getItem("gm_admin_authenticated") === "true")
  );

  // Auto-fill checkout fields when customer is logged in
  useEffect(() => {
    if (currentCustomer) {
      if (currentCustomer.full_name) setOrderName(prev => prev || currentCustomer.full_name);
      if (currentCustomer.phone) setOrderPhone(prev => prev || currentCustomer.phone || "");
      if (currentCustomer.cpf_cnpj) setOrderCpfCnpj(prev => prev || currentCustomer.cpf_cnpj || "");
      const addr = [
        currentCustomer.street,
        currentCustomer.number ? `Nº ${currentCustomer.number}` : "",
        currentCustomer.complement,
        currentCustomer.neighborhood,
        currentCustomer.city,
        currentCustomer.state,
      ].filter(Boolean).join(", ");
      if (addr) setDeliveryAddress(prev => prev || addr);
    }
  }, [currentCustomer]);

  const handleOpenCustomerArea = () => {
    setActiveView("customer");
    setActivePortfolioId(null);
    setCurrentActiveSection("cliente" as DesktopNavKey);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    }
  };

  // Quick Text/Element Editor Modal state
  const [quickEditorState, setQuickEditorState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    elementType: ElementType;
    initialText: string;
    initialFormatting?: TextEditorFormatting;
    targetField: string;
  }>({
    isOpen: false,
    title: "",
    elementType: "title",
    initialText: "",
    targetField: "",
  });

  const handleQuickEditorSave = (newText: string, formatting: TextEditorFormatting) => {
    const field = quickEditorState.targetField;
    if (field === "hero_title") {
      handleUpdateBioConfig({
        hero_title: newText,
        title: newText,
        title_font: formatting.font,
        title_size: formatting.size,
        title_color: formatting.color,
      });
      setCurrentData((prev: any) => ({
        ...prev,
        company_name: newText,
      }));
    } else if (field === "description") {
      handleUpdateBioConfig({
        description: newText,
        description_mobile: newText,
        description_bold: formatting.bold,
        description_italic: formatting.italic,
        description_size: formatting.size,
        description_size_mobile: formatting.size,
        description_font: formatting.font,
        description_font_mobile: formatting.font,
        description_align: formatting.align,
        description_align_mobile: formatting.align,
        description_color: formatting.color,
      });
    } else if (field === "hero_button") {
      handleUpdateBioConfig({
        hero_button_label: newText,
        hero_button_action: formatting.buttonAction,
        hero_button_url: formatting.buttonUrl,
        hero_button_style: formatting.buttonStyle,
      });
    } else if (field === "catalog_title") {
      handleUpdateBioConfig({
        catalog_title: newText,
      });
    } else if (field === "portfolio_title") {
      handleUpdateBioConfig({
        portfolio_title: newText,
      });
    } else if (field === "about_title") {
      handleUpdateBioConfig({
        about_title: newText,
        about_title_size: formatting.size,
        about_title_font: formatting.font,
        about_title_align: formatting.align,
        about_title_bold: formatting.bold,
      });
    } else if (field === "about_description") {
      handleUpdateBioConfig({
        about_description: newText,
        about_desc_size: formatting.size,
        about_desc_font: formatting.font,
        about_desc_align: formatting.align,
        about_desc_bold: formatting.bold,
        about_desc_italic: formatting.italic,
      });
    } else if (field === "about_highlight") {
      handleUpdateBioConfig({
        about_highlight: newText,
        about_highlight_size: formatting.size,
        about_highlight_font: formatting.font,
        about_highlight_align: formatting.align,
        about_highlight_bold: formatting.bold,
      });
    } else if (field === "footer") {
      handleUpdateBioConfig({
        footer_text: newText,
      });
    }
  };

  useEffect(() => {
    if (data) {
      setCurrentData(data);
    }
  }, [data]);

  const bio = currentData?.bio_config || {};
  const bgAnimation = bio.bg_animation || "parallax";

  // Handlers for Live Editing
  const handleUpdateBioConfig = (bioUpdates: Record<string, any>) => {
    setCurrentData((prev: any) => {
      const updatedBio = { ...(prev?.bio_config || {}), ...bioUpdates };
      return {
        ...prev,
        bio_config: updatedBio,
        company_name: bioUpdates.title !== undefined ? bioUpdates.title : prev?.company_name,
        brand_primary: bioUpdates.color !== undefined ? bioUpdates.color : prev?.brand_primary,
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleUpdateHero = (updates: any) => {
    handleUpdateBioConfig(updates);
  };

  const handleUpdateLogoAndName = (updates: { company_name?: string; company_logo_url?: string; website_logo_url?: string; logo_url?: string }) => {
    const newWebsiteLogo = updates.website_logo_url || updates.logo_url || updates.company_logo_url;
    setCurrentData((prev: any) => {
      const updatedBio = { 
        ...(prev?.bio_config || {}), 
        title: updates.company_name !== undefined ? updates.company_name : prev?.bio_config?.title,
        logo_url: newWebsiteLogo !== undefined ? newWebsiteLogo : prev?.bio_config?.logo_url,
        website_logo_url: newWebsiteLogo !== undefined ? newWebsiteLogo : (prev?.bio_config?.website_logo_url || prev?.bio_config?.logo_url),
      };
      return {
        ...prev,
        // Preserva o logo interno do aplicativo (company_logo_url). O logo do site fica em bio_config!
        company_name: updates.company_name !== undefined ? updates.company_name : prev?.company_name,
        bio_config: updatedBio,
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleUpdateThemeColors = (updates: { brand_primary?: string; theme?: string; button_style?: string }) => {
    setCurrentData((prev: any) => {
      const updatedBio = { 
        ...(prev?.bio_config || {}),
        color: updates.brand_primary !== undefined ? updates.brand_primary : prev?.bio_config?.color,
        theme: updates.theme !== undefined ? updates.theme : prev?.bio_config?.theme,
        button_style: updates.button_style !== undefined ? updates.button_style : prev?.bio_config?.button_style,
      };
      return {
        ...prev,
        brand_primary: updates.brand_primary !== undefined ? updates.brand_primary : prev?.brand_primary,
        button_style: updates.button_style !== undefined ? updates.button_style : prev?.button_style,
        bio_config: updatedBio,
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleUpdateContacts = (updates: any) => {
    handleUpdateBioConfig(updates);
  };

  const handleSaveProductList = (newCatalogItems: any[]) => {
    handleUpdateBioConfig({ catalog_items: newCatalogItems });
  };

  const handleDeleteProduct = (productId: string) => {
    const currentItems = bio.catalog_items || [];
    const newItems = currentItems.filter((i: any) => i.id !== productId);
    handleUpdateBioConfig({ catalog_items: newItems });
    pushToast({ type: "info", title: "Produto removido" });
  };

  const handleSavePortfolioList = (newPortfolioItems: any[]) => {
    handleUpdateBioConfig({ portfolio_items: newPortfolioItems });
  };

  const handleDeletePortfolioProject = (projectId: string) => {
    const currentItems = bio.portfolio_items || [];
    const newItems = currentItems.filter((i: any) => i.id !== projectId);
    handleUpdateBioConfig({ portfolio_items: newItems });
    pushToast({ type: "info", title: "Projeto removido" });
  };

  const handleSaveLiveChanges = async () => {
    setIsSavingLive(true);
    try {
      const targetTenant = currentData?.tenant_id || userTenantId || "global";
      const bioConfig = currentData?.bio_config || {};
      const payload: Partial<AppSettings> = {
        company_name: currentData?.company_name,
        brand_primary: currentData?.brand_primary || bioConfig?.color,
        button_style: currentData?.button_style || bioConfig?.button_style,
        pix_key: bioConfig?.pix_key || currentData?.pix_key,
        pix_type: bioConfig?.pix_type || currentData?.pix_type,
        bio_config: bioConfig,
      };
      await upsertSettingsSupabase(targetTenant, payload);
      setHasUnsavedChanges(false);
      pushToast({
        type: "success",
        title: "Site Salvo com Sucesso!",
        message: "Todas as alterações foram salvas e publicadas em tempo real."
      });
    } catch (err: any) {
      console.error("Erro ao salvar live bio:", err);
      pushToast({
        type: "error",
        title: "Erro ao Salvar",
        message: err.message || "Não foi possível salvar as alterações no banco de dados."
      });
    } finally {
      setIsSavingLive(false);
    }
  };

  const handleRevertLiveChanges = () => {
    setCurrentData(data);
    setHasUnsavedChanges(false);
    pushToast({
      type: "info",
      title: "Alterações Descartadas",
      message: "O site voltou ao estado original salvo anteriormente."
    });
  };

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

  const [activeView, setActiveView] = useState<"bio" | "contact" | "portfolio" | "customer">("bio");
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChatWidgetOpen, setIsChatWidgetOpen] = useState(false);
  const [isChatIconVisible, setIsChatIconVisible] = useState(false);
  const [isHoveringChat, setIsHoveringChat] = useState(false);

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

  useEffect(() => {
    if (activeView === "contact" && !isMobileView) {
      setIsChatWidgetOpen(false);
      setIsChatIconVisible(false);
      const timer = setTimeout(() => {
        setIsChatIconVisible(true);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setIsChatIconVisible(false);
      setIsChatWidgetOpen(false);
    }
  }, [activeView, isMobileView]);
  
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

  const [catalogTouchStartX, setCatalogTouchStartX] = useState<number | null>(null);

  const handleCatalogTouchStart = (e: React.TouchEvent) => {
    setCatalogTouchStartX(e.touches[0].clientX);
  };

  const handleCatalogTouchEnd = (e: React.TouchEvent) => {
    if (catalogTouchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = catalogTouchStartX - touchEndX;
    if (deltaX > 40 && maxCatalogIndex > 0) {
      setCatalogIndex((prev) => (prev >= maxCatalogIndex ? 0 : prev + 1));
    } else if (deltaX < -40 && maxCatalogIndex > 0) {
      setCatalogIndex((prev) => (prev <= 0 ? maxCatalogIndex : prev - 1));
    }
    setCatalogTouchStartX(null);
  };

  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState("");
  const [needsActivation, setNeedsActivation] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [lastWhatsappUrl, setLastWhatsappUrl] = useState("");

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (!digits) return "";
    if (digits.length <= 2) {
      return `(${digits}`;
    }
    if (digits.length <= 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

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

  const getFontSizePt = (size?: string) => {
    const resolved = size ? (size === "sm" ? "12 pt" : size === "base" ? "14 pt" : size === "lg" ? "16 pt" : size === "xl" ? "24 pt" : size) : "16 pt";
    switch (resolved) {
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

  const getMobileFontSizePt = (size?: string) => {
    const resolved = size ? (size === "sm" ? "12 pt" : size === "base" ? "14 pt" : size === "lg" ? "16 pt" : size === "xl" ? "24 pt" : size) : "16 pt";
    switch (resolved) {
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

  const getFontFamilyStyle = (font?: string) => {
    switch (font) {
      case "tech": return "'JetBrains Mono', monospace";
      case "modern": return "'Plus Jakarta Sans', sans-serif";
      case "elegant": return "'Raleway', sans-serif";
      case "funnel": return "'Funnel Display', sans-serif";
      case "classic": return "'Montserrat', sans-serif";
      case "space": return "'Space Grotesk', sans-serif";
      case "syne": return "'Syne', sans-serif";
      case "ui":
      default:
        return "'Inter', sans-serif";
    }
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

  // Auto-fill checkout fields when customer is logged in
  useEffect(() => {
    if (currentCustomer) {
      if (currentCustomer.full_name && !orderName) setOrderName(currentCustomer.full_name);
      if (currentCustomer.phone && !orderPhone) setOrderPhone(currentCustomer.phone);
      if (currentCustomer.cpf_cnpj && !orderCpfCnpj) setOrderCpfCnpj(currentCustomer.cpf_cnpj);
      if (currentCustomer.street && !deliveryAddress) {
        const fullAddr = `${currentCustomer.street}${currentCustomer.number ? `, Nº ${currentCustomer.number}` : ''}${currentCustomer.complement ? ` (${currentCustomer.complement})` : ''}${currentCustomer.neighborhood ? ` - ${currentCustomer.neighborhood}` : ''}${currentCustomer.city ? ` - ${currentCustomer.city}/${currentCustomer.state || ''}` : ''}${currentCustomer.cep ? ` - CEP: ${currentCustomer.cep}` : ''}`;
        setDeliveryAddress(fullAddr);
        setDeliveryOption("delivery");
      }
    }
  }, [currentCustomer]);

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
    
    // Salvar o pedido no banco de dados Supabase para a Área do Cliente
    saveCustomerOrder({
      tenant_id: currentData?.tenant_id || userTenantId || "global",
      customer_id: currentCustomer?.id || null,
      customer_name: orderName.trim(),
      customer_email: currentCustomer?.email || (bio.email || "cliente@website.com"),
      customer_phone: orderPhone.trim() || null,
      customer_cpf_cnpj: orderCpfCnpj.trim() || null,
      shipping_address: deliveryOption === "delivery" ? { address: deliveryAddress.trim() } : { pickup: true },
      items: cart.map(item => ({
        id: item.product.id || Date.now().toString(),
        name: item.product.name,
        price: item.selectedOption ? parsePrice(item.selectedOption.price) : parsePrice(item.product.price),
        quantity: item.quantity,
        image_url: item.product.image_url,
        selectedOption: item.selectedOption,
      })),
      subtotal: cartTotalPrice,
      total: cartTotalPrice,
      payment_method: pixKey ? "pix" : cardUrl ? "credit_card" : "whatsapp",
      notes: deliveryOption === "delivery" ? `Entrega em casa: ${deliveryAddress.trim()}` : "Retirada no local",
    }).then(res => {
      if (res.success && res.order) {
        createOrderPayment({
          order_id: res.order.id,
          customer_id: currentCustomer?.id || null,
          tenant_id: currentData?.tenant_id || userTenantId || "global",
          payment_method: pixKey ? "pix" : cardUrl ? "credit_card" : "whatsapp",
          amount: cartTotalPrice,
          pix_code: pixKey || undefined,
        }).catch(() => {});
      }
    }).catch(err => console.warn("Erro ao salvar pedido no Supabase:", err));

    window.open(whatsappUrl, "_blank");
  };

  const handleCheckoutDirectPayment = async () => {
    if (!orderName.trim()) {
      setCustomAlert({
        title: companyName,
        message: "Por favor, informe seu nome completo para o pedido."
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

    try {
      const res = await saveCustomerOrder({
        tenant_id: currentData?.tenant_id || userTenantId || "global",
        customer_id: currentCustomer?.id || null,
        customer_name: orderName.trim(),
        customer_email: currentCustomer?.email || (bio.email || "cliente@website.com"),
        customer_phone: orderPhone.trim() || null,
        customer_cpf_cnpj: orderCpfCnpj.trim() || null,
        shipping_address: deliveryOption === "delivery" ? { address: deliveryAddress.trim() } : { pickup: true },
        items: cart.map(item => ({
          id: item.product.id || Date.now().toString(),
          name: item.product.name,
          price: item.selectedOption ? parsePrice(item.selectedOption.price) : parsePrice(item.product.price),
          quantity: item.quantity,
          image_url: item.product.image_url,
          selectedOption: item.selectedOption,
        })),
        subtotal: cartTotalPrice,
        total: cartTotalPrice,
        payment_method: pixKey ? "pix" : "credit_card",
        notes: deliveryOption === "delivery" ? `Entrega em casa: ${deliveryAddress.trim()}` : "Retirada no local",
      });

      if (res.success && res.order) {
        // Registra pagamento seguro na tabela order_payments
        await createOrderPayment({
          order_id: res.order.id,
          customer_id: currentCustomer?.id || null,
          tenant_id: currentData?.tenant_id || userTenantId || "global",
          payment_method: pixKey ? "pix" : "credit_card",
          amount: cartTotalPrice,
          pix_code: pixKey || undefined,
        });

        // Limpa o carrinho e abre tela de pagamento seguro
        setCart([]);
        setIsCartOpen(false);
        setActivePaymentOrder(res.order);
        pushToast({
          type: "success",
          title: "Pedido Criado!",
          message: `Pedido #${res.order.order_number} criado com sucesso! Escolha sua forma de pagamento abaixo.`
        });
      } else {
        pushToast({
          type: "error",
          title: "Erro ao gerar pedido",
          message: res.error || "Não foi possível registrar seu pedido."
        });
      }
    } catch (err: any) {
      pushToast({
        type: "error",
        title: "Erro",
        message: err?.message || "Falha ao processar pedido."
      });
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      setContactError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setContactSubmitting(true);
    setContactError("");
    setContactSuccess(false);
    setNeedsActivation(false);

    // Dynamic recipient email from bio configuration (trimmed to avoid spaces issues)
    const recipientEmail = (bio.email || data?.email || "gmedificacao@gmail.com").trim();
    setSubmittedEmail(recipientEmail);

    // Dynamic WhatsApp number for direct delivery
    const targetPhone = (bio.whatsapp || bio.phone || data?.whatsapp || data?.phone || "98987505041").replace(/\D/g, "");
    const cleanPhone = targetPhone.startsWith("55") ? targetPhone : (targetPhone ? `55${targetPhone}` : "5598987505041");
    const textMsg = `*Novo Contato via Site - GM edificação*\n\n` +
      `👤 *Nome:* ${contactName.trim()}\n` +
      `📧 *E-mail:* ${contactEmail.trim()}\n` +
      `📱 *WhatsApp/Tel:* ${contactPhone.trim() || "Não informado"}\n` +
      `📌 *Assunto:* ${contactSubject.trim() || "Contato via site"}\n\n` +
      `💬 *Mensagem:*\n${contactMessage.trim()}`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(textMsg)}`;
    setLastWhatsappUrl(whatsappUrl);

    // Direct WhatsApp window trigger for instant response
    try {
      window.open(whatsappUrl, "_blank");
    } catch (openErr) {
      console.warn("Could not auto-open WhatsApp tab:", openErr);
    }

    // Background FormSubmit notification attempt (with 3.5s timeout)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      await fetch(`https://formsubmit.co/ajax/${recipientEmail}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          name: contactName.trim(),
          email: contactEmail.trim(),
          phone: contactPhone.trim() || "Não informado",
          subject: contactSubject.trim() || `Contato via site`,
          message: contactMessage.trim(),
          _subject: `Novo contato de ${contactName.trim()} pelo site: ${contactSubject.trim() || 'Mensagem Geral'}`
        })
      });
      clearTimeout(timeoutId);
    } catch (err) {
      // Ignored: FormSubmit server issue should not block the user since message is handled via WhatsApp
      console.warn("FormSubmit background notification:", err);
    }

    // Always succeed! The message is safely dispatched and the user has full access
    setContactSuccess(true);
    setContactSubmitting(false);
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setContactSubject("");
    setContactMessage("");
  };

  // Website logo has priority for the website. If not set, fallback to app logo/avatar
  const gmOfficialLogo = "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/logo.jpg?t=1790426179060";
  const websiteLogo = (bio as any)?.website_logo_url || (bio as any)?.logo_url || (currentData?.bio_config as any)?.website_logo_url || (currentData?.bio_config as any)?.logo_url || (currentData as any)?.website_logo_url;
  const logo = websiteLogo || currentData?.company_logo_url || bio.logo || currentData?.avatar_url || gmOfficialLogo;
  const companyName = (isMobileView && bio.title_mobile) 
    ? bio.title_mobile 
    : (bio.title || currentData?.company_name || "Perfil");
  const desc = (isMobileView && bio.description_mobile) 
    ? bio.description_mobile 
    : (bio.description || "");
  const brandColor = bio.color || currentData?.brand_primary || "#FE540B";
  const brandBg = bio.bg_color || currentData?.brand_bg;
  const brandTitle = bio.title_color || currentData?.brand_title;
  const brandSubtitle = bio.subtitle_color || currentData?.brand_subtitle;
  const brandIcon = bio.icon_color || currentData?.brand_icon || brandColor;
  const brandAccent = bio.accent_color || bio.button_color || currentData?.brand_accent || currentData?.brand_button || brandColor;
  const rawTheme = (bio.theme || "dark").toLowerCase();
  const theme: string = rawTheme === "light" ? "light" : "dark";
  const buttonStyle = currentData?.button_style || bio.button_style || "solid";
  const isWebsiteLayout = true;

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
      setLoginSuccess("Login de Administrador aprovado!");
      
      setTimeout(() => {
        setIsLoginOpen(false);
        setIsLiveEditMode(true);
        setPreviewAsVisitor(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        pushToast({
          type: "success",
          title: "Modo Administrador Ativado!",
          message: "Você agora pode alterar qualquer informação do seu site em tempo real!"
        });
      }, 700);
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
    const url = `${window.location.origin}/${getCustomSlug()}`;
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
      bg: "bg-[#050505]",
      textTitle: "text-white font-extrabold",
      textDesc: "text-zinc-300",
      iconBg: "bg-zinc-900",
      cardBg: "bg-zinc-950/80 backdrop-blur-md",
      cardBgHover: "hover:bg-zinc-900/90",
      cardBorder: "border-zinc-800/80",
      cardBorderHover: "hover:border-[#FE540B]/50",
      cardTitle: "text-white font-extrabold",
      cardSub: "text-zinc-400",
      pixSubtitle: "text-zinc-300"
    },
    light: {
      bg: "bg-slate-50",
      textTitle: "text-slate-900 font-extrabold",
      textDesc: "text-slate-600",
      iconBg: "bg-white shadow-sm",
      cardBg: "bg-white shadow-sm",
      cardBgHover: "hover:bg-slate-50 hover:shadow-md",
      cardBorder: "border-slate-200 shadow-sm",
      cardBorderHover: "hover:border-[#FE540B]/50 hover:shadow-md",
      cardTitle: "text-slate-800 font-extrabold",
      cardSub: "text-slate-500",
      pixSubtitle: "text-slate-600"
    }
  };

  const t = theme === "light" ? themeClasses.light : themeClasses.dark;

  


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

  const defaultArchitectureBanner = currentData?.app_background_url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80";

  // 1 ÚNICO PLANO DE FUNDO UNIFICADO (SITE 1 BACKGROUND)
  const singleSiteMobileBg = bio.mobile_banner_img_url_1 
    || currentData?.mobile_app_background_url 
    || bio.bg_mobile_image_url 
    || bio.banner_img_url_1 
    || currentData?.app_background_url 
    || bio.bg_image_url 
    || defaultArchitectureBanner;

  const singleSiteDesktopBg = bio.banner_img_url_1 
    || currentData?.app_background_url 
    || bio.bg_image_url 
    || bio.mobile_banner_img_url_1 
    || currentData?.mobile_app_background_url 
    || bio.bg_mobile_image_url 
    || defaultArchitectureBanner;

  const effectiveSingleBg = (asPreview && previewMode === 'smartphone') || isMobileView 
    ? singleSiteMobileBg 
    : (asPreview && previewMode === 'pc' ? singleSiteDesktopBg : (isMobileDevice ? singleSiteMobileBg : singleSiteDesktopBg));

  const scrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(true);
  const [currentActiveSection, setCurrentActiveSection] = useState<DesktopNavKey>("inicio");

  // Lenis Inertial Smooth Scrolling (details.so/vault/page-transition-03)
  useEffect(() => {
    const scrollContainer = mainScrollRef.current;
    if (!scrollContainer) return;

    let lenis: Lenis | null = null;
    let removeWheel: (() => void) | null = null;
    try {
      lenis = new Lenis({
        wrapper: scrollContainer,
        lerp: 0.08, // Ultra-suave e inercial exatamente como orleansbrandao.com.br
        duration: 1.35,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.6,
        wheelMultiplier: 0.95,
        syncTouch: true,
        infinite: false,
      });

      lenisRef.current = lenis;

      lenis.on('scroll', () => {
        handleScroll();
      });

      let animationFrameId: number;
      const raf = (time: number) => {
        lenis?.raf(time);
        animationFrameId = requestAnimationFrame(raf);
      };
      animationFrameId = requestAnimationFrame(raf);

      // Handle window wheel dispatch if cursor is over header or margin
      const onWindowWheel = (e: WheelEvent) => {
        if (scrollContainer && !scrollContainer.contains(e.target as Node)) {
          scrollContainer.scrollTop += e.deltaY;
        }
      };
      window.addEventListener("wheel", onWindowWheel, { passive: true });
      removeWheel = () => window.removeEventListener("wheel", onWindowWheel);

      return () => {
        cancelAnimationFrame(animationFrameId);
        if (removeWheel) removeWheel();
        lenis?.destroy();
        lenisRef.current = null;
      };
    } catch (err) {
      console.warn("Lenis init skipped:", err);
    }
  }, [activeView, activePortfolioId]);

  // Cinematic Curtain Wipe & Parallax Transition (Inspirado em orleansbrandao.com.br)
  const overlapTransitionVariants = {
    initial: {
      opacity: 0.8,
      clipPath: "inset(12% 0% 0% 0%)",
      y: 24,
      scale: 0.99,
    },
    animate: {
      opacity: 1,
      clipPath: "inset(0% 0% 0% 0%)",
      y: 0,
      scale: 1,
      transition: {
        duration: 0.65,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
    exit: {
      opacity: 0,
      clipPath: "inset(0% 0% 12% 0%)",
      y: -14,
      transition: {
        duration: 0.25,
        ease: "easeIn" as const,
      },
    },
  };

  const smoothScrollToTarget = (target: number | HTMLElement, align: 'center' | 'top' = 'center') => {
    if (typeof target === 'number') {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(target, {
          duration: 1.25,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
      }
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ top: target, behavior: 'smooth' });
      }
      window.scrollTo({ top: target, left: 0, behavior: 'smooth' });
      document.documentElement.scrollTo({ top: target, left: 0, behavior: 'smooth' });
      document.body.scrollTo({ top: target, left: 0, behavior: 'smooth' });
      return;
    } else if (target) {
      const winHeight = window.innerHeight || 800;
      const targetRect = target.getBoundingClientRect();
      const targetHeight = targetRect.height || 400;

      // Posiciona a seção perfeitamente no centro da tela ("MOSTRA UMA SESSÃO DO SITE NO CENTRO DA TELA")
      const idealOffset = align === 'center'
        ? Math.max(85, (winHeight - targetHeight) / 2)
        : 85;

      let calculatedY = 0;
      const container = mainScrollRef.current;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        calculatedY = targetRect.top - containerRect.top + container.scrollTop - idealOffset;
      } else {
        calculatedY = targetRect.top + window.scrollY - idealOffset;
      }

      calculatedY = Math.max(0, calculatedY);

      if (lenisRef.current) {
        lenisRef.current.scrollTo(calculatedY, {
          duration: 1.25,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
      }
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ top: calculatedY, behavior: 'smooth' });
      }
      window.scrollTo({ top: calculatedY, left: 0, behavior: 'smooth' });
      document.documentElement.scrollTo({ top: calculatedY, left: 0, behavior: 'smooth' });
      document.body.scrollTo({ top: calculatedY, left: 0, behavior: 'smooth' });

      try {
        target.scrollIntoView({ behavior: 'smooth', block: align === 'center' ? 'center' : 'start' });
      } catch (e) {
        // fallback
      }
    }
  };

  const handleDesktopNavClick = (section: DesktopNavKey) => {
    setCurrentActiveSection(section);
    if (section === 'inicio') {
      if (activeView !== 'bio') {
        setActiveView('bio');
        setActivePortfolioId(null);
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (lenisRef.current) {
        lenisRef.current.scrollTo(0, { immediate: true });
      }
    } else if (section === 'sobre') {
      if (activeView !== 'bio') {
        setActiveView('bio');
        setActivePortfolioId(null);
        setTimeout(() => {
          const el = document.getElementById('about-company-section');
          if (el) smoothScrollToTarget(el);
        }, 180);
      } else {
        const el = document.getElementById('about-company-section');
        if (el) smoothScrollToTarget(el);
      }
    } else if (section === 'produtos') {
      if (activeView !== 'bio') {
        setActiveView('bio');
        setActivePortfolioId(null);
        setTimeout(() => {
          const el = document.getElementById('catalog-section');
          if (el) smoothScrollToTarget(el);
        }, 180);
      } else {
        const el = document.getElementById('catalog-section');
        if (el) smoothScrollToTarget(el);
      }
    } else if (section === 'portfolio') {
      if (activeView !== 'bio') {
        setActiveView('bio');
        setActivePortfolioId(null);
        setTimeout(() => {
          const el = document.getElementById('portfolio-section');
          if (el) smoothScrollToTarget(el);
        }, 180);
      } else {
        const el = document.getElementById('portfolio-section');
        if (el) smoothScrollToTarget(el);
      }
    } else if (section === 'contato') {
      if (activeView !== 'contact') {
        setActiveView('contact');
        setActivePortfolioId(null);
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (lenisRef.current) {
        lenisRef.current.scrollTo(0, { immediate: true });
      }
    } else if (section === 'cliente') {
      handleOpenCustomerArea();
    }
  };

  const handleScroll = () => {
    const el = mainScrollRef.current;
    if (el) {
      setCanScrollUp(el.scrollTop > 50);
      setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 50);
      setScrollTop(el.scrollTop);

      if (activeView === 'contact') {
        setCurrentActiveSection('contato');
        return;
      }
      if (activeView === 'customer') {
        setCurrentActiveSection('cliente');
        return;
      }
      if (activeView === 'portfolio') {
        setCurrentActiveSection('portfolio');
        return;
      }

      const scrollPos = el.scrollTop + 220;
      const portfolioEl = document.getElementById('portfolio-section');
      const catalogEl = document.getElementById('catalog-section');
      const aboutEl = document.getElementById('about-company-section');

      if (portfolioEl && scrollPos >= portfolioEl.offsetTop) {
        setCurrentActiveSection('portfolio');
      } else if (catalogEl && scrollPos >= catalogEl.offsetTop) {
        setCurrentActiveSection('produtos');
      } else if (aboutEl && scrollPos >= aboutEl.offsetTop) {
        setCurrentActiveSection('sobre');
      } else {
        setCurrentActiveSection('inicio');
      }
    }
  };

  const handleLogoClick = () => {
    setActiveView("bio");
    smoothScrollToTarget(0);
  };

  const updateScrollAvailability = () => {
    const el = mainScrollRef.current;
    const winScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const winHeight = window.innerHeight || 800;
    const docHeight = Math.max(
      document.body.scrollHeight, 
      document.documentElement.scrollHeight,
      el ? el.scrollHeight : 0
    );

    const elScroll = el ? el.scrollTop : 0;
    const elHeight = el ? el.clientHeight : 0;
    const elScrollHeight = el ? el.scrollHeight : 0;

    const effectiveScroll = Math.max(elScroll, winScroll);
    setCanScrollUp(effectiveScroll > 40);

    const canDown = (el && elScrollHeight > elHeight && elScroll + elHeight < elScrollHeight - 40) ||
                    (winScroll + winHeight < docHeight - 40);
    setCanScrollDown(canDown);
  };

  // Navegação suave entre seções: 1 clique mostra a seção centralizada na tela
  const advanceToNextSection = () => {
    // Se houver modal com scroll aberto (ex: Área do Cliente), rola suavemente para baixo no modal
    const modalContainer = (document.querySelector('.gm-customer-modal-overlay') ||
                            document.querySelector('.gm-customer-auth-container') ||
                            document.querySelector('.gm-customer-dashboard-container') ||
                            document.querySelector('.gm-note-modal')) as HTMLElement | null;
    if (modalContainer && (modalContainer.scrollHeight > modalContainer.clientHeight + 20)) {
      const scrollStep = Math.max(220, modalContainer.clientHeight * 0.65);
      modalContainer.scrollBy({ top: scrollStep, behavior: 'smooth' });
      return;
    }

    if (activeView === "contact" || activeView === "customer") {
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        mainScrollRef.current?.scrollHeight || 0
      );
      smoothScrollToTarget(docHeight, 'top');
      return;
    }

    const currentScroll = (mainScrollRef.current?.scrollTop || window.scrollY || 0);
    const winHeight = window.innerHeight || 800;
    const aboutEl = document.getElementById("about-company-section");
    const catalogEl = document.getElementById("catalog-section");
    const portfolioEl = document.getElementById("portfolio-section");

    const getElCenterScroll = (element: HTMLElement | null) => {
      if (!element) return Infinity;
      const rect = element.getBoundingClientRect();
      const parentRect = mainScrollRef.current?.getBoundingClientRect();
      const absoluteTop = parentRect
        ? (mainScrollRef.current?.scrollTop || 0) + rect.top - parentRect.top
        : window.scrollY + rect.top;
      const targetHeight = rect.height || 400;
      const offset = Math.max(85, (winHeight - targetHeight) / 2);
      return Math.max(0, absoluteTop - offset);
    };

    const aboutCenterY = getElCenterScroll(aboutEl);
    const catalogCenterY = getElCenterScroll(catalogEl);
    const portfolioCenterY = getElCenterScroll(portfolioEl);

    // 1 clique = SOBRE centralizado na tela
    if (currentScroll < aboutCenterY - 100 && aboutEl) {
      smoothScrollToTarget(aboutEl, 'center');
    } 
    // Outro clique = PRODUTOS centralizado na tela
    else if (currentScroll < catalogCenterY - 100 && catalogEl) {
      smoothScrollToTarget(catalogEl, 'center');
    } 
    // Outro clique = PORTFÓLIO centralizado na tela
    else if (currentScroll < portfolioCenterY - 100 && portfolioEl) {
      smoothScrollToTarget(portfolioEl, 'center');
    } 
    // Outro clique = CONTATO
    else {
      handleDesktopNavClick("contato");
    }
  };

  // Seta para cima (subir): 1 clique = voltar ao topo da tela do website
  const retreatToPrevSection = () => {
    // Se houver modal com scroll aberto e rolado para baixo, volta ao topo do modal
    const modalContainer = (document.querySelector('.gm-customer-modal-overlay') ||
                            document.querySelector('.gm-customer-auth-container') ||
                            document.querySelector('.gm-customer-dashboard-container') ||
                            document.querySelector('.gm-note-modal')) as HTMLElement | null;
    if (modalContainer && modalContainer.scrollTop > 20) {
      modalContainer.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (activeView !== "bio") {
      setActiveView("bio");
      setActivePortfolioId(null);
    }
    smoothScrollToTarget(0, 'top');
  };

  useEffect(() => {
    const el = mainScrollRef.current;
    updateScrollAvailability();

    const handleWinScroll = () => {
      updateScrollAvailability();
    };

    window.addEventListener("scroll", handleWinScroll, { passive: true });
    window.addEventListener("resize", handleWinScroll, { passive: true });
    window.addEventListener("touchmove", handleWinScroll, { passive: true });
    window.addEventListener("touchend", handleWinScroll, { passive: true });

    if (el) {
      el.addEventListener("scroll", handleWinScroll, { passive: true });
      el.addEventListener("touchmove", handleWinScroll, { passive: true });
    }

    let resizeObserver: ResizeObserver | null = null;
    if (el) {
      resizeObserver = new ResizeObserver(() => {
        updateScrollAvailability();
      });
      resizeObserver.observe(el);
    }

    const timer1 = setTimeout(updateScrollAvailability, 150);
    const timer2 = setTimeout(updateScrollAvailability, 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener("scroll", handleWinScroll);
      window.removeEventListener("resize", handleWinScroll);
      window.removeEventListener("touchmove", handleWinScroll);
      window.removeEventListener("touchend", handleWinScroll);
      if (el) {
        el.removeEventListener("scroll", handleWinScroll);
        el.removeEventListener("touchmove", handleWinScroll);
      }
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [data, isCartOpen, selectedProduct, activeView, activePortfolioId]);

  useEffect(() => {
    if (activeView === "portfolio" && activePortfolioId) {
      const timer = setTimeout(() => {
        smoothScrollToTarget(0);
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
    }, 4500);

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
            ? "absolute right-full mr-3 top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-[999]"
            : `flex ${asPreview ? 'absolute' : 'fixed'} right-2.5 sm:right-4 md:right-5 top-1/2 -translate-y-1/2 z-[9999] flex flex-col items-center pointer-events-none transition-all duration-300`
        }
      >
        <div className="flex flex-col items-center gap-1.5 p-1 sm:p-1.5 rounded-full bg-black/65 hover:bg-black/85 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.6)] transition-all duration-300 pointer-events-auto">
          {/* Seta para Cima */}
          <button
            type="button"
            onClick={() => {
              const scrollDelta = (mainScrollRef.current?.clientHeight || window.innerHeight) * 0.75;
              if (lenisRef.current) {
                lenisRef.current.scrollTo(Math.max(0, lenisRef.current.scroll - scrollDelta), {
                  duration: 1.0,
                  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
                });
              }
              if (mainScrollRef.current && mainScrollRef.current.scrollHeight > mainScrollRef.current.clientHeight) {
                mainScrollRef.current.scrollBy({ top: -scrollDelta, behavior: "smooth" });
              }
              window.scrollBy({ top: -scrollDelta, behavior: "smooth" });
              document.documentElement.scrollBy({ top: -scrollDelta, behavior: "smooth" });
              document.body.scrollBy({ top: -scrollDelta, behavior: "smooth" });
            }}
            className={`transition-all duration-300 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.18] border border-white/10 hover:border-white/30 text-white shadow-md cursor-pointer hover:scale-110 active:scale-95 group relative ${
              canScrollUp ? "opacity-100" : "opacity-45 hover:opacity-80"
            }`}
            style={{ color: brandColor || "#FE540B" }}
            title="Rolar para cima"
            aria-label="Rolar para cima"
          >
            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
          </button>

          {/* Divisor sutil */}
          <div className="w-3.5 h-[1px] bg-white/20 my-0.5" />

          {/* Seta para Baixo */}
          <button
            type="button"
            onClick={() => {
              const scrollDelta = (mainScrollRef.current?.clientHeight || window.innerHeight) * 0.75;
              if (lenisRef.current) {
                lenisRef.current.scrollTo(lenisRef.current.scroll + scrollDelta, {
                  duration: 1.0,
                  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
                });
              }
              if (mainScrollRef.current && mainScrollRef.current.scrollHeight > mainScrollRef.current.clientHeight) {
                mainScrollRef.current.scrollBy({ top: scrollDelta, behavior: "smooth" });
              }
              window.scrollBy({ top: scrollDelta, behavior: "smooth" });
              document.documentElement.scrollBy({ top: scrollDelta, behavior: "smooth" });
              document.body.scrollBy({ top: scrollDelta, behavior: "smooth" });
            }}
            className={`transition-all duration-300 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.18] border border-white/10 hover:border-white/30 text-white shadow-md cursor-pointer hover:scale-110 active:scale-95 group relative ${
              canScrollDown ? "opacity-100" : "opacity-45 hover:opacity-80"
            }`}
            style={{ color: brandColor || "#FE540B" }}
            title="Rolar para baixo"
            aria-label="Rolar para baixo"
          >
            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div 
      data-website-root="true"
      data-site-preview="true"
      className={`gm-website-fullscreen site-full-viewport gm-website-viewport gm-site-fullscreen w-full min-w-full ${!asPreview ? "fixed inset-0" : "relative h-full"} overflow-hidden ${t.bg} selection-brand site-font-${siteFont} site-size-${siteFontSize} flex flex-col items-center justify-start`}
      style={{
        margin: 0,
        padding: 0,
        border: 0,
        borderRadius: 0,
        boxShadow: "none",
        boxSizing: "border-box"
      }}
    >
      {/* Real-time Live Admin Toolbar */}
      {isLiveEditMode && (
        <LiveAdminBar
          companyName={companyName || "Site"}
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSavingLive}
          previewAsVisitor={previewAsVisitor}
          onTogglePreviewAsVisitor={() => setPreviewAsVisitor(!previewAsVisitor)}
          onSave={handleSaveLiveChanges}
          onRevert={handleRevertLiveChanges}
          onOpenThemeModal={() => setIsThemeModalOpen(true)}
          onOpenAddModal={(type) => {
            if (type === "product") setProductModalState({ isOpen: true, product: null });
            else if (type === "portfolio") setPortfolioModalState({ isOpen: true, project: null });
            else if (type === "link") setIsContactsModalOpen(true);
          }}
          onExitEditMode={() => {
            setIsLiveEditMode(false);
            setPreviewAsVisitor(false);
          }}
          onOpenFullDashboard={() => navigate("/")}
          onOpenOrdersModal={() => setIsAdminHubOpen(true)}
        />
      )}
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
        .bio-desc-font-ui, .bio-desc-font-ui * {
          font-family: 'Inter', sans-serif !important;
        }
        .bio-desc-font-tech, .bio-desc-font-tech * {
          font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
        }
        .bio-desc-font-modern, .bio-desc-font-modern * {
          font-family: 'Plus Jakarta Sans', sans-serif !important;
        }
        .bio-desc-font-elegant, .bio-desc-font-elegant * {
          font-family: 'Raleway', sans-serif !important;
        }
        .bio-desc-font-funnel, .bio-desc-font-funnel * {
          font-family: 'Funnel Display', sans-serif !important;
        }
        .bio-desc-font-classic, .bio-desc-font-classic * {
          font-family: 'Montserrat', sans-serif !important;
        }
        .bio-desc-font-space, .bio-desc-font-space * {
          font-family: 'Space Grotesk', sans-serif !important;
        }
        .bio-desc-font-syne, .bio-desc-font-syne * {
          font-family: 'Syne', sans-serif !important;
        }
        .site-hero-description, .site-hero-description * {
          font-size: var(--desc-fs-mobile, 14pt) !important;
        }
        @media (min-width: 768px) {
          .site-hero-description, .site-hero-description * {
            font-size: var(--desc-fs-desktop, 16pt) !important;
          }
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
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
          background: transparent !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        /* Desktop Modern Custom Scrollbar */
        .desktop-scroll {
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          scrollbar-width: thin;
          scrollbar-color: rgba(254, 84, 11, 0.45) rgba(0, 0, 0, 0.15);
        }
        .desktop-scroll::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .desktop-scroll::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.25);
        }
        .desktop-scroll::-webkit-scrollbar-thumb {
          background: rgba(254, 84, 11, 0.45);
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .desktop-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(254, 84, 11, 0.85);
          background-clip: padding-box;
        }
      `}</style>
      
      {/* 1 ÚNICO BACKGROUND PARA TODO O SITE (SITE 1 BACKGROUND) */}
      {effectiveSingleBg && (
        <div 
          className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat transition-all duration-300 select-none"
          style={{ 
            backgroundImage: `url(${effectiveSingleBg})`,
            backgroundPosition: "center center",
            backgroundSize: "cover"
          }} 
        />
      )}
      {/* Camada sutil e elegante para contraste e legibilidade perfeita em todo o site */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-black/60 backdrop-blur-[1px]" />

      {/* Film Grain Cinematic Overlay (Inspirado no estilo orleansbrandao.com.br) */}
      <div 
        className="fixed inset-0 pointer-events-none z-[1] opacity-[0.038] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '180px 180px'
        }}
        aria-hidden="true"
      />

      {/* Background Animated Gradient / Aurora opcional */}
      {bgAnimation === "aurora" && (
        <div className={`fixed inset-0 z-0 pointer-events-none transition-all duration-1000 ${theme === "dark" || theme === "glass" ? "animate-aurora opacity-35" : "animate-aurora-light opacity-30"}`} />
      )}

      {/* Background Floating Particles / Aura opcional */}
      {bgAnimation === "particles" && (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-30 transition-all duration-1000">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full blur-3xl animate-blob1" style={{ backgroundColor: `${brandColor || '#fe540b'}22` }} />
          <div className="absolute top-2/3 right-1/4 w-96 h-96 rounded-full blur-3xl animate-blob2" style={{ backgroundColor: `${brandColor || '#fe540b'}15` }} />
          <div className="absolute bottom-10 left-1/3 w-80 h-80 rounded-full blur-3xl animate-blob3" style={{ backgroundColor: `${brandColor || '#fe540b'}18` }} />
        </div>
      )}

      <div 
        ref={mainScrollRef}
        onScroll={handleScroll}
        data-website-root="true"
        data-site-preview="true"
        className={`w-full min-w-full h-full relative z-10 overflow-y-auto overflow-x-hidden ${isMobileView ? "no-scrollbar" : "desktop-scroll"} ${isLiveEditMode ? "pt-12 sm:pt-14" : ""} flex flex-col items-center`}
        style={{
          margin: 0,
          padding: 0,
          border: 0,
          borderRadius: 0,
          boxSizing: "border-box"
        }}
      >
        <div 
          data-website-root="true"
          data-site-preview="true"
          className="relative z-10 animate-in fade-in duration-500 pb-0 w-full min-w-full flex flex-col items-center min-h-full"
          style={{
            margin: 0,
            padding: 0,
            border: 0,
            borderRadius: 0,
            boxSizing: "border-box"
          }}
        >
          <div 
            data-website-root="true"
            data-site-preview="true"
            className="w-full min-w-full flex-1 flex flex-col items-center"
            style={{
              margin: 0,
              padding: 0,
              border: 0,
              borderRadius: 0,
              boxSizing: "border-box"
            }}
          >
          
          {/* Header & Banner Wrapper to overlay profile on top of the banner when enabled */}
          <div 
            data-website-root="true"
            data-site-preview="true"
            className="flex flex-col w-full min-w-full items-center"
            style={{
              margin: 0,
              padding: 0,
              border: 0,
              borderRadius: 0,
              boxSizing: "border-box"
            }}
          >
            {(() => {
              // Logo cadastrado pelo usuário/conta (GM Edificação) com fallback para o logo oficial cadastrado da GM Edificação
              const gmDefaultLogo = "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/logo.jpg?t=1790426179060";
              const userLogo = websiteLogo || currentData?.company_logo_url || bio.logo || currentData?.avatar_url;
              const effectiveLogo = userLogo || gmDefaultLogo;

              // Banner padrão profissional de arquitetura/engenharia caso o usuário ainda não tenha configurado banners no BIO Editor
              const defaultArchitectureBanner = currentData?.app_background_url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80";

              const desktopBanner = bio.banner_img_url_1 || defaultArchitectureBanner;
              const mobileBanner = bio.mobile_banner_img_url_1 || bio.banner_img_url_1 || currentData?.mobile_app_background_url || desktopBanner;
              const finalDesktop = desktopBanner || mobileBanner;
              const finalMobile = mobileBanner || desktopBanner;

              const isWebsiteLayout = true;

              // Extrai redes sociais reais configuradas pelo usuário
              const userSocialLinks: { id: string; title: string; href: string; icon: any }[] = [];
              if (bio.whatsapp) {
                const cleanPhone = bio.whatsapp.replace(/\D/g, "");
                userSocialLinks.push({
                  id: "whatsapp",
                  title: "WhatsApp",
                  href: `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : "55" + cleanPhone}`,
                  icon: WhatsAppIcon
                });
              }
              if (bio.instagram) {
                const igHandle = bio.instagram.replace(/^@/, "").trim();
                const igUrl = igHandle.startsWith("http") ? igHandle : `https://instagram.com/${igHandle}`;
                userSocialLinks.push({
                  id: "instagram",
                  title: "Instagram",
                  href: igUrl,
                  icon: BrandInstagramIcon
                });
              }
              if (bio.facebook) {
                const fbUrl = bio.facebook.startsWith("http") ? bio.facebook : `https://facebook.com/${bio.facebook}`;
                userSocialLinks.push({
                  id: "facebook",
                  title: "Facebook",
                  href: fbUrl,
                  icon: Facebook
                });
              }
              if (bio.website) {
                const siteUrl = bio.website.startsWith("http") ? bio.website : `https://${bio.website}`;
                userSocialLinks.push({
                  id: "website",
                  title: "Website",
                  href: siteUrl,
                  icon: Globe
                });
              }
              if (bio.email || (data?.pix_key && data.pix_key.includes("@"))) {
                const emailAddr = bio.email || data?.pix_key;
                userSocialLinks.push({
                  id: "email",
                  title: "E-mail",
                  href: `mailto:${emailAddr}`,
                  icon: Mail
                });
              }
              if (bio.linkedin) {
                const liUrl = bio.linkedin.startsWith("http") ? bio.linkedin : `https://linkedin.com/in/${bio.linkedin}`;
                userSocialLinks.push({
                  id: "linkedin",
                  title: "LinkedIn",
                  href: liUrl,
                  icon: Linkedin
                });
              }
              if (bio.phone) {
                userSocialLinks.push({
                  id: "phone",
                  title: "Telefone",
                  href: `tel:${bio.phone.replace(/\D/g, "")}`,
                  icon: Phone
                });
              }

              const currentPortfolioItem = activePortfolioId ? (bio.portfolio_items || []).find((p: any) => p.id === activePortfolioId) : null;
              const hasDesktopLayersForBanner = !!currentPortfolioItem?.layers && currentPortfolioItem.layers.length > 0;
              const hasMobileLayersForBanner = !!currentPortfolioItem?.mobile_layers && currentPortfolioItem.mobile_layers.length > 0;
              const firstDesktopLayerUrl = hasDesktopLayersForBanner ? currentPortfolioItem.layers[0].image_url : null;
              const firstMobileLayerUrl = hasMobileLayersForBanner ? currentPortfolioItem.mobile_layers[0].image_url : null;

              const portfolioDesktopBanner = currentPortfolioItem?.main_banner_url || firstDesktopLayerUrl || firstMobileLayerUrl || currentPortfolioItem?.image_url;
              const portfolioMobileBanner = currentPortfolioItem?.main_banner_mobile_url || currentPortfolioItem?.main_banner_url || firstMobileLayerUrl || firstDesktopLayerUrl || currentPortfolioItem?.image_url;

              const hasBanners = (bio.show_banners && (desktopBanner || mobileBanner)) || (activeView === "portfolio") || isWebsiteLayout;

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
                          className={`mt-1.5 site-hero-description ${getResponsiveFontSizeClass(bio.description_size, bio.description_size_mobile)} max-w-4xl leading-relaxed whitespace-pre-wrap tracking-wide ${descMarginClass} ${descAlignClass} ${descBoldClass} ${descItalicClass} ${descFontClass} ${isOverBanner ? "!text-white [&_*]:!text-white drop-shadow-sm" : `${t.textDesc}`}`}
                          style={{
                            '--desc-fs-desktop': getFontSizePt(bio.description_size || "16 pt"),
                            '--desc-fs-mobile': getMobileFontSizePt(bio.description_size_mobile || bio.description_size || "16 pt"),
                            fontSize: isMobileView ? getMobileFontSizePt(bio.description_size_mobile || bio.description_size || "16 pt") : getFontSizePt(bio.description_size || "16 pt"),
                            fontFamily: getFontFamilyStyle((asPreview && previewMode === 'smartphone') ? (bio.description_font_mobile || bio.description_font || "ui") : (bio.description_font || "ui")),
                          } as React.CSSProperties}
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
                          className="site-btn-pill px-6 py-2.5 text-xs sm:text-sm shadow-md w-full sm:w-auto"
                        >
                          <span>Veja nosso Portfólio</span>
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
                    <div className={`${asPreview && previewMode === 'smartphone' ? 'hidden' : asPreview && previewMode === 'pc' ? 'block' : 'hidden md:block'} w-full h-24 sm:h-28 md:h-32 ${theme === 'light' ? 'bg-white text-zinc-900 border-b border-zinc-200' : 'bg-[#050505] text-white border-b border-white/10'} flex items-center justify-between px-6 md:px-12 relative z-30 transition-all selection:bg-[#FE540B] selection:text-white`}>
                      <div className="flex items-center gap-3.5 sm:gap-4 md:gap-5 cursor-pointer hover:opacity-90 transition-opacity shrink-0 min-w-max" onClick={handleLogoClick}>
                        {logo ? (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-[68px] lg:h-[68px] flex items-center justify-center shrink-0">
                            <img 
                              src={logo} 
                              alt={companyName || "GM Edificação"} 
                              className="w-full h-full max-w-full max-h-full object-contain object-center shrink-0 select-none pointer-events-none block" 
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = gmOfficialLogo;
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center font-black text-2xl sm:text-3xl md:text-4xl text-white shadow-sm shrink-0" style={{ backgroundColor: brandColor || "#FE540B" }}>
                            {(companyName || "GM").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className={`font-black text-2xl sm:text-3xl md:text-[1.85rem] lg:text-[2.05rem] tracking-tight select-none whitespace-nowrap shrink-0 ${theme === 'light' ? '!text-zinc-900' : '!text-white'}`}>
                          {bio.title || companyName || "GM Edificação"}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <WebsiteDesktopNav 
                          activeView={activeView as string}
                          setActiveView={setActiveView}
                          setActivePortfolioId={setActivePortfolioId}
                          theme={theme}
                          orangeColor={brandColor || "#FE540B"}
                          userSocialLinks={userSocialLinks}
                          asPreview={asPreview}
                          hasCatalog={!!(bio.catalog_items && bio.catalog_items.length > 0) || isLiveEditMode}
                          hasPortfolio={!!(bio.portfolio_items && bio.portfolio_items.length > 0) || isLiveEditMode}
                          hasAbout={bio.show_about !== false}
                          currentActiveSection={currentActiveSection}
                          onNavigateSection={handleDesktopNavClick}
                          currentCustomer={currentCustomer}
                          onOpenCustomerArea={handleOpenCustomerArea}
                        />
                      </div>
                      
                      {/* Thin animated bar */}
                      <div 
                        className="w-full h-[3px] absolute bottom-0 left-0 right-0 z-50 pointer-events-none"
                        style={{
                          background: `linear-gradient(90deg, #FE540B, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, #FE540B)`,
                          backgroundSize: '300% 300%',
                          animation: 'color-loop 5s ease infinite',
                          boxShadow: 'none',
                          bottom: 0
                        }}
                      />
                    </div>

                    {/* Minimal Mobile Top Navbar */}
                    <div className={`${asPreview && previewMode === 'pc' ? 'hidden' : asPreview && previewMode === 'smartphone' ? 'block' : 'block md:hidden'} w-full h-22 sm:h-26 min-h-[88px] sm:min-h-[100px] ${theme === 'light' ? 'bg-white text-zinc-900 border-b border-zinc-200' : 'bg-[#0a0a0c] text-white border-b border-white/10'} flex items-center justify-between px-6 sm:px-8 relative z-30 selection:bg-[#FE540B] selection:text-white transition-all`}>
                      <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity shrink-0 min-w-0" onClick={handleLogoClick}>
                        {logo ? (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
                            <img 
                              src={logo} 
                              alt={companyName} 
                              className="w-full h-full max-w-full max-h-full object-contain object-center shrink-0 select-none pointer-events-none block" 
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = gmOfficialLogo;
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-lg sm:text-xl text-white shrink-0" style={{ backgroundColor: brandColor || "#FE540B" }}>
                            {companyName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className={`font-bold text-lg sm:text-xl tracking-tight whitespace-nowrap truncate shrink-0 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>{companyName}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button 
                          onClick={() => setActiveView("bio")} 
                          className={`text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                            (activeView as string) === "bio" 
                              ? "!text-[#FE540B] border-b-2 border-[#FE540B]" 
                              : `${theme === 'light' ? 'text-zinc-900' : 'text-white'} hover:!text-[#FE540B]`
                          }`}
                        >
                          Início
                        </button>
                        <button 
                          onClick={() => setActiveView("contact")} 
                          className={`text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                            (activeView as string) === "contact" 
                              ? "!text-[#FE540B] border-b-2 border-[#FE540B]" 
                              : `${theme === 'light' ? 'text-zinc-900' : 'text-white'} hover:!text-[#FE540B]`
                          }`}
                        >
                          Contato
                        </button>
                        {/* Área do Cliente (Mobile) */}
                        <button
                          type="button"
                          onClick={handleOpenCustomerArea}
                          className="p-1 px-2 rounded-full bg-black/5 hover:bg-black/10 text-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="Área do Cliente"
                        >
                          <User className="w-3.5 h-3.5 text-[#FE540B]" />
                        </button>
                      </div>
                      
                      {/* Thin animated bar */}
                      <div 
                        className="w-full h-[3px] absolute bottom-0 left-0 right-0 z-50 pointer-events-none"
                        style={{
                          background: `linear-gradient(90deg, #FE540B, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, #FE540B)`,
                          backgroundSize: '300% 300%',
                          animation: 'color-loop 5s ease infinite',
                          boxShadow: 'none',
                          bottom: 0
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
                    <div className={`${asPreview && previewMode === 'smartphone' ? 'hidden' : asPreview && previewMode === 'pc' ? 'flex' : 'hidden md:flex'} w-full ${activeView === "contact" || activeView === "customer" ? "h-auto" : "min-h-screen md:h-screen md:h-[100dvh]"} flex-col overflow-hidden`}>
                      {/* Desktop Top Navbar */}
                      <div className={`w-full shrink-0 ${isWebsiteLayout ? (theme === 'dark' || theme === 'glass' ? 'h-24 sm:h-28 md:h-32 bg-[#050505] text-white border-b border-white/10' : 'h-24 sm:h-28 md:h-32 bg-white text-zinc-900 border-b border-zinc-200') : 'h-36 sm:h-40 md:h-[140px] bg-white/10 dark:bg-black/20 backdrop-blur-md'} flex items-center justify-between px-6 md:px-12 relative z-30 transition-all selection:bg-[#FE540B] selection:text-white`}>
                        <EditableItem
                          isEditMode={isLiveEditMode && !previewAsVisitor}
                          label="Editar Logo & Nome"
                          onClick={() => setIsLogoModalOpen(true)}
                          className="p-1 -ml-1 inline-block shrink-0"
                        >
                          <div className="flex items-center gap-3.5 sm:gap-4 md:gap-5 cursor-pointer hover:opacity-90 transition-opacity shrink-0 min-w-max" onClick={(e) => {
                            if (isLiveEditMode && !previewAsVisitor) {
                              e.stopPropagation();
                              setIsLogoModalOpen(true);
                              return;
                            }
                            handleLogoClick();
                          }}>
                            {effectiveLogo ? (
                              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-[68px] lg:h-[68px] flex items-center justify-center shrink-0">
                                <img 
                                  src={effectiveLogo} 
                                  alt={companyName || "GM Edificação"} 
                                  className="w-full h-full max-w-full max-h-full object-contain object-center shrink-0 select-none pointer-events-none block" 
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = gmDefaultLogo;
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center font-black text-2xl sm:text-3xl md:text-4xl text-white shadow-sm shrink-0" style={{ backgroundColor: brandColor || "#FE540B" }}>
                                {(companyName || "GM").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className={`font-black text-2xl sm:text-3xl md:text-[1.85rem] lg:text-[2.05rem] tracking-tight select-none whitespace-nowrap shrink-0 ${isWebsiteLayout ? (theme === 'dark' || theme === 'glass' ? '!text-white' : '!text-zinc-900') : (theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900')}`}>
                              {bio.title || companyName || "GM Edificação"}
                            </span>
                            {isLiveEditMode && !previewAsVisitor && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsLogoModalOpen(true);
                                  }}
                                className="ml-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FE540B] text-white text-xs font-black shadow-lg hover:scale-105 transition-all cursor-pointer z-50"
                                title="Editar Logo e Nome da Empresa"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Editar Logo</span>
                              </button>
                            )}
                          </div>
                        </EditableItem>

                        <div className="flex items-center">
                          <WebsiteDesktopNav 
                            activeView={activeView as string}
                            setActiveView={setActiveView}
                            setActivePortfolioId={setActivePortfolioId}
                            theme={theme}
                            orangeColor={brandColor || "#FE540B"}
                            userSocialLinks={userSocialLinks}
                            asPreview={asPreview}
                            hasCatalog={!!(bio.catalog_items && bio.catalog_items.length > 0) || isLiveEditMode}
                            hasPortfolio={!!(bio.portfolio_items && bio.portfolio_items.length > 0) || isLiveEditMode}
                            hasAbout={bio.show_about !== false}
                            currentActiveSection={currentActiveSection}
                            onNavigateSection={handleDesktopNavClick}
                            currentCustomer={currentCustomer}
                            onOpenCustomerArea={handleOpenCustomerArea}
                          />
                        </div>
                        
                        {/* Barrinha fina neon multicolorida encostada na parte inferior da barra superior de uma extremidade a outra - perfeitamente rente, sem vazado */}
                        <div 
                          className="w-full h-[3px] absolute bottom-0 left-0 right-0 z-50 pointer-events-none"
                          style={{
                            background: `linear-gradient(90deg, #FE540B, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, #FE540B)`,
                            backgroundSize: '300% 300%',
                            animation: 'color-loop 5s ease infinite',
                            boxShadow: 'none',
                            bottom: 0
                          }}
                        />
                      </div>

                      {/* Desktop Hero Section - BANNER OCUPANDO TODA A VISÃO DA TELA DO NAVEGADOR DESKTOP */}
                      {isWebsiteLayout && activeView !== "contact" && activeView !== "portfolio" && activeView !== "customer" ? (
                        <div className="w-full flex-1 min-h-0 bg-black relative overflow-hidden flex items-center group/hero">
                          {/* Banner Principal ocupando toda a área marcada (100% de ponta a ponta, com animação suave de escala ao mudar de tela) */}
                          <motion.img 
                            key={`desktop-hero-banner-${activeView}`}
                            initial={{ scale: 1.08, opacity: 0.85 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
                            src={bio.banner_img_url_1 || bio.desktop_banner_img_url || bio.banner_url || currentData?.app_background_url || defaultArchitectureBanner} 
                            alt={companyName || "GM Edificação"} 
                            className="w-full h-full object-cover object-center select-none absolute inset-0 z-0 will-change-transform overlap-parallax-bg" 
                            style={{
                              transform: `translate3d(0, ${scrollTop * 0.22}px, 0)`
                            }}
                            referrerPolicy="no-referrer" 
                          />

                          {/* Live Edit Floating Control for Banner */}
                          {isLiveEditMode && !previewAsVisitor && (
                            <div className="absolute top-6 right-8 z-30 flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => setIsHeroModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-black/80 hover:bg-black border border-[#FE540B] text-white text-xs font-black shadow-2xl backdrop-blur-md hover:scale-105 transition-all cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4 text-[#FE540B]" />
                                <span>Editar Banner & Textos</span>
                              </button>
                            </div>
                          )}

                          {/* Leve sombreado suave da esquerda para a direita destacando o texto sobreposto */}
                          <div 
                            className="hidden md:block absolute inset-0 z-10 pointer-events-none"
                            style={{
                              background: 'linear-gradient(90deg, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.58) 26%, rgba(0, 0, 0, 0.38) 46%, rgba(0, 0, 0, 0.18) 64%, rgba(0, 0, 0, 0.04) 80%, transparent 92%)',
                            }}
                          />

                          {/* Leve sombreado suave para telas menores / mobile */}
                          <div 
                            className="md:hidden absolute inset-0 z-10 pointer-events-none"
                            style={{
                              background: 'linear-gradient(to right, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.50) 48%, rgba(0, 0, 0, 0.18) 82%, transparent 100%)',
                            }}
                          />

                          {/* Conteúdo de Texto sobreposto na frente do esfumaçado e do banner - afastado para a direita conforme marcação com linha vermelha */}
                          <div 
                            className="w-full md:w-[65%] lg:w-[58%] xl:w-[52%] 2xl:w-[48%] flex flex-col justify-center py-14 md:py-20 px-6 sm:px-10 md:pl-[12vw] lg:pl-[15vw] xl:pl-[16vw] 2xl:pl-[17vw] md:pr-8 z-20 relative transition-all duration-75 ease-out will-change-transform"
                            style={{
                              transform: `translate3d(0, ${scrollTop * 0.12}px, 0)`,
                              opacity: Math.max(0, 1 - scrollTop / 750)
                            }}
                          >
                            {isLiveEditMode && !previewAsVisitor && (
                              <div className="mb-3">
                                <button
                                  type="button"
                                  onClick={() => setIsHeroModalOpen(true)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FE540B] text-white text-xs font-black shadow-md hover:scale-105 transition-all cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Editar Título & Descrição</span>
                                </button>
                              </div>
                            )}
                            <EditableItem
                              isEditMode={isLiveEditMode && !previewAsVisitor}
                              label="Editar Título"
                              onClick={() => {
                                setQuickEditorState({
                                  isOpen: true,
                                  title: "Editar Título Principal",
                                  subtitle: "Altere o título de destaque na tela inicial do site",
                                  elementType: "title",
                                  initialText: bio.hero_title || bio.title || companyName || "GM edificação",
                                  initialFormatting: {
                                    font: bio.title_font || bio.hero_title_font || "syne",
                                    size: bio.title_size || "36 pt",
                                    color: bio.title_color || "#FFFFFF",
                                    align: "left",
                                    bold: true
                                  },
                                  targetField: "hero_title",
                                });
                              }}
                              className="inline-block p-1.5 -ml-1.5"
                            >
                              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[62px] font-black tracking-tight text-white leading-[1.08] select-none drop-shadow-md">
                                {bio.hero_title || bio.title || companyName || "GM edificação"}
                              </h1>
                            </EditableItem>

                            <EditableItem
                              isEditMode={isLiveEditMode && !previewAsVisitor}
                              label="Editar Apresentação & Formatação"
                              onClick={() => {
                                const isMobileHero = (asPreview && previewMode === 'smartphone') || isMobileView;
                                const heroDescAlign = isMobileHero
                                  ? (bio.description_align_mobile || bio.description_align || "left")
                                  : (bio.description_align || "left");
                                const isDescBold = isMobileHero
                                  ? (bio.description_bold_mobile !== undefined ? bio.description_bold_mobile : !!bio.description_bold)
                                  : !!bio.description_bold;
                                const isDescItalic = isMobileHero
                                  ? (bio.description_italic_mobile !== undefined ? bio.description_italic_mobile : !!bio.description_italic)
                                  : !!bio.description_italic;
                                const activeDescFont = isMobileHero
                                  ? (bio.description_font_mobile || bio.description_font || "syne")
                                  : (bio.description_font || "syne");

                                setQuickEditorState({
                                  isOpen: true,
                                  title: "Editar Apresentação & Formatação",
                                  subtitle: "Altere o texto, selecione trechos para negritar ou colorir e ajuste o tamanho",
                                  elementType: "description",
                                  initialText: bio.description || desc || "",
                                  initialFormatting: {
                                    font: activeDescFont,
                                    size: bio.description_size || "16 pt",
                                    align: (heroDescAlign as any) || "left",
                                    bold: isDescBold,
                                    italic: isDescItalic,
                                    color: bio.description_color || "#E4E4E7",
                                  },
                                  targetField: "description",
                                });
                              }}
                              className="p-2 -ml-2 block mt-2"
                            >
                              {(() => {
                                const isMobileHero = (asPreview && previewMode === 'smartphone') || isMobileView;
                                const heroDescAlign = isMobileHero
                                  ? (bio.description_align_mobile || bio.description_align || "left")
                                  : (bio.description_align || "left");
                                const heroDescAlignClass = heroDescAlign === "left" ? "text-left" : heroDescAlign === "right" ? "text-right" : "text-center";

                                const isDescBold = isMobileHero
                                  ? (bio.description_bold_mobile !== undefined ? bio.description_bold_mobile : !!bio.description_bold)
                                  : !!bio.description_bold;
                                const heroDescBoldClass = isDescBold ? "font-bold" : "font-normal";

                                const isDescItalic = isMobileHero
                                  ? (bio.description_italic_mobile !== undefined ? bio.description_italic_mobile : !!bio.description_italic)
                                  : !!bio.description_italic;
                                const heroDescItalicClass = isDescItalic ? "italic" : "not-italic";

                                const activeDescFont = isMobileHero
                                  ? (bio.description_font_mobile || bio.description_font || "ui")
                                  : (bio.description_font || "ui");
                                const heroDescFontClass = `bio-desc-font-${activeDescFont}`;

                                const deskPt = getFontSizePt(bio.description_size || "16 pt");
                                const mobPt = getMobileFontSizePt(bio.description_size_mobile || bio.description_size || "16 pt");
                                const heroSizeClass = getFontSizeClass(bio.description_size || "16 pt");

                                return (
                                  <div 
                                    className={`mt-4 site-hero-description leading-relaxed max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl text-zinc-100 drop-shadow-sm whitespace-pre-wrap ${heroSizeClass} ${heroDescFontClass} ${heroDescBoldClass} ${heroDescItalicClass} ${heroDescAlignClass}`}
                                    style={{
                                      '--desc-fs-desktop': deskPt,
                                      '--desc-fs-mobile': mobPt,
                                      fontSize: isMobileView ? mobPt : deskPt,
                                      fontFamily: getFontFamilyStyle(activeDescFont),
                                    } as React.CSSProperties}
                                    dangerouslySetInnerHTML={{ 
                                      __html: desc || `GM edificação, Design Feroz` 
                                    }}
                                  />
                                );
                              })()}
                            </EditableItem>
                            
                            <div className="mt-8 sm:mt-10 flex gap-4">
                              <SitePillButton
                                label={bio.hero_button_label || "Conheça nossos Serviços"}
                                isEditMode={isLiveEditMode && !previewAsVisitor}
                                editLabel="Editar Botão"
                                onEdit={() => {
                                  setQuickEditorState({
                                    isOpen: true,
                                    title: "Editar Botão de Ação",
                                    subtitle: "Altere o texto do botão e a ação ao clicar",
                                    elementType: "button",
                                    initialText: bio.hero_button_label || "Conheça nossos Serviços",
                                    initialFormatting: {
                                      buttonAction: bio.hero_button_action || "portfolio",
                                      buttonUrl: bio.hero_button_url || "",
                                      buttonStyle: bio.hero_button_style || "glow",
                                      color: brandColor,
                                    },
                                    targetField: "hero_button",
                                  });
                                }}
                                onClick={() => {
                                  const el = document.getElementById("portfolio-section") || document.getElementById("catalog-section");
                                  if (el) {
                                    el.scrollIntoView({ behavior: 'smooth' });
                                  } else {
                                    setActiveView("contact");
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={`w-full relative group ${isWebsiteLayout ? 'bg-black overflow-hidden' : 'bg-black/10'} transition-[height] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          activeView === "contact" || activeView === "customer" 
                            ? "h-[26vh] sm:h-[28vh] min-h-[190px] max-h-[280px]" 
                            : activeView === "portfolio"
                              ? "md:h-screen md:min-h-[600px]"
                              : "md:h-[calc(105.3vh-140px)] md:min-h-[500px]"
                        }`}>
                          <div className="w-full h-full relative overflow-hidden">
                            <motion.img 
                              key={`desktop-sub-banner-${activeView}-${activePortfolioId || ''}`}
                              initial={{ scale: 1.08, opacity: 0.85 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
                              src={activeView === "contact" || activeView === "customer" ? (bio.contact_banner_img_url || finalDesktop) : (activeView === "portfolio" ? (portfolioDesktopBanner || finalDesktop) : finalDesktop)} 
                              alt="Banner Desktop" 
                              className="w-full h-full object-cover absolute inset-0 will-change-transform" 
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
                                  {activeView !== "portfolio" && (
                                    <div className={`absolute inset-0 z-10 ${heroAlign === 'center' ? 'bg-black/40' : heroAlign === 'right' ? 'bg-gradient-to-l from-black/80 via-black/40 to-transparent' : 'bg-gradient-to-r from-black/80 via-black/40 to-transparent'}`} />
                                  )}
                                  
                                  {/* Overlaid Profile Content (Hero Text) */}
                                  <AnimatePresence>
                                    {activeView !== "contact" && activeView !== "portfolio" && activeView !== "customer" && (
                                      <motion.div 
                                        key="desktop-banner-hero-content"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                                        transition={{ duration: 0.35, ease: "easeOut" }}
                                        className="absolute inset-0 z-20 flex flex-col justify-center py-6 pointer-events-auto"
                                      >
                                        <div className={`w-full max-w-[1240px] mx-auto px-6 md:px-12 flex flex-col ${heroAlign === 'center' ? 'items-center text-center' : heroAlign === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
                                          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight !text-white leading-tight drop-shadow-md max-w-2xl">
                                            {bio.title || companyName}
                                          </h1>
                                          {desc && (() => {
                                            const activeDescFont = bio.description_font || "ui";
                                            const deskPt = getFontSizePt(bio.description_size || "16 pt");
                                            const mobPt = getMobileFontSizePt(bio.description_size_mobile || bio.description_size || "16 pt");
                                            const heroSizeClass = getFontSizeClass(bio.description_size || "16 pt");
                                            return (
                                              <div 
                                                className={`mt-5 text-zinc-300 drop-shadow-sm max-w-2xl leading-relaxed whitespace-pre-wrap ${heroSizeClass} bio-desc-font-${activeDescFont} ${heroBold ? 'font-bold' : 'font-normal'} ${heroItalic ? 'italic' : ''}`}
                                                style={{
                                                  '--desc-fs-desktop': deskPt,
                                                  '--desc-fs-mobile': mobPt,
                                                  fontSize: isMobileView ? mobPt : deskPt,
                                                  fontFamily: getFontFamilyStyle(activeDescFont),
                                                } as React.CSSProperties}
                                                dangerouslySetInnerHTML={{ __html: desc }}
                                              />
                                            );
                                          })()}
                                          
                                          <div className="mt-8 flex">
                                            <SitePillButton
                                              label={bio.hero_button_label || "Conheça nossos Serviços"}
                                              isEditMode={isLiveEditMode && !previewAsVisitor}
                                              editLabel="Editar Botão"
                                              onEdit={() => {
                                                setQuickEditorState({
                                                  isOpen: true,
                                                  title: "Editar Botão de Ação",
                                                  subtitle: "Altere o texto do botão e a ação ao clicar",
                                                  elementType: "button",
                                                  initialText: bio.hero_button_label || "Conheça nossos Serviços",
                                                  initialFormatting: {
                                                    buttonAction: bio.hero_button_action || "portfolio",
                                                    buttonUrl: bio.hero_button_url || "",
                                                    buttonStyle: bio.hero_button_style || "glow",
                                                    color: brandColor,
                                                  },
                                                  targetField: "hero_button",
                                                });
                                              }}
                                              onClick={() => {
                                                const el = document.getElementById("portfolio-section") || document.getElementById("catalog-section");
                                                if (el) {
                                                  smoothScrollToTarget(el);
                                                } else {
                                                  handleDesktopNavClick("contato");
                                                }
                                              }}
                                            />
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mobile Banner overlay - Full screen smartphone format 1080x1920 sem cortes */}
                  {finalMobile && (
                    <div 
                      className={`${asPreview && previewMode === 'pc' ? 'hidden' : asPreview && previewMode === 'smartphone' ? 'flex' : 'flex md:hidden'} w-full min-w-full flex-col items-center relative group transition-all duration-300`}
                    >
                      {/* Mobile Top Navbar with Edge-to-Edge Elegance - Altura vertical aumentada conforme solicitado */}
                      <div className={`w-full shrink-0 h-22 sm:h-26 md:h-28 min-h-[88px] sm:min-h-[100px] ${isWebsiteLayout ? (theme === 'dark' || theme === 'glass' ? 'bg-black/50 text-white border-b border-white/10 backdrop-blur-md' : 'bg-white/95 text-zinc-900 border-b border-zinc-200 backdrop-blur-md') : 'bg-white/15 dark:bg-black/25 backdrop-blur-md'} flex items-center justify-between px-6 sm:px-8 relative z-40 selection:bg-[#FE540B] selection:text-white transition-all duration-300`}>
                        <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer min-w-0 shrink-0" onClick={handleLogoClick}>
                          {effectiveLogo ? (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
                              <img 
                                src={effectiveLogo} 
                                alt={companyName || "GM Edificação"} 
                                className="w-full h-full max-w-full max-h-full object-contain object-center shrink-0 select-none pointer-events-none block" 
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = gmDefaultLogo;
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-xl sm:text-2xl text-white shadow-sm shrink-0" style={{ backgroundColor: brandColor || "#FE540B" }}>
                              {(companyName || "GM").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className={`font-black text-xl sm:text-2xl tracking-tight select-none whitespace-nowrap truncate max-w-[170px] xs:max-w-[220px] sm:max-w-[300px] shrink-0 ${isWebsiteLayout ? (theme === 'dark' || theme === 'glass' ? '!text-white' : '!text-zinc-900') : (theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900')}`}>
                            {bio.title || companyName || "GM Edificação"}
                          </span>
                          {isLiveEditMode && !previewAsVisitor && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsLogoModalOpen(true);
                              }}
                              className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FE540B] text-white text-[10px] font-bold shadow-md cursor-pointer shrink-0 z-50"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Logo</span>
                            </button>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          {/* Botão Área do Cliente Mobile direto na barra */}
                          <button
                            type="button"
                            onClick={handleOpenCustomerArea}
                            className={`group h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-full flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer border ${
                              activeView === 'customer'
                                ? 'bg-[#FE540B] text-white border-[#FE540B] shadow-md'
                                : theme === 'dark' || theme === 'glass'
                                  ? 'bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-[#FE540B]/40 hover:text-[#FE540B]' 
                                  : 'bg-black/5 hover:bg-black/10 text-slate-800 border-black/10 hover:text-[#FE540B]'
                            }`}
                            title="Área do Cliente"
                          >
                            <User className={`w-4 h-4 transition-colors duration-200 shrink-0 ${activeView === 'customer' ? 'text-white' : theme === 'dark' || theme === 'glass' ? 'text-white group-hover:text-[#FE540B]' : 'text-zinc-800 group-hover:text-[#FE540B]'}`} />
                            <span className={`hidden xs:inline truncate max-w-[70px] transition-colors duration-200 ${activeView === 'customer' ? 'text-white' : theme === 'dark' || theme === 'glass' ? 'text-white group-hover:text-[#FE540B]' : 'text-zinc-800 group-hover:text-[#FE540B]'}`}>
                              {currentCustomer ? currentCustomer.full_name.split(' ')[0] : 'Entrar'}
                            </span>
                          </button>

                          <button 
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                            className={`group min-w-[42px] min-h-[42px] flex items-center justify-center p-2 rounded-xl hover:opacity-90 transition-all focus:outline-none cursor-pointer z-40 relative ${isWebsiteLayout ? (theme === 'dark' || theme === 'glass' ? 'text-white hover:text-[#FE540B]' : 'text-zinc-900 hover:text-[#FE540B]') : (theme === 'dark' || theme === 'glass' ? 'text-white hover:text-[#FE540B]' : 'text-slate-900 hover:text-[#FE540B]')}`}
                            aria-label="Abrir menu de navegação"
                          >
                            {isMobileMenuOpen ? (
                              <X className="w-6 h-6 stroke-[2.5] text-white group-hover:text-[#FE540B] transition-colors duration-200" />
                            ) : (
                              <Menu className="w-6 h-6 stroke-[2.5] text-white group-hover:text-[#FE540B] transition-colors duration-200" />
                            )}
                          </button>
                        </div>

                        {/* Hamburger Slide Down Dropdown Menu */}
                        {isMobileMenuOpen && (
                          <div className={`absolute top-full inset-x-0 z-50 flex flex-col p-6 space-y-2 shadow-2xl animate-in slide-in-from-top-4 duration-300 border-b ${isWebsiteLayout ? (theme === 'dark' || theme === 'glass' ? 'bg-[#0a0a0c]/98 backdrop-blur-2xl border-white/10 text-white' : 'bg-white/98 backdrop-blur-2xl border-zinc-200 text-zinc-900') : (theme === 'dark' || theme === 'glass' ? 'bg-zinc-950/98 backdrop-blur-2xl border-white/10 text-white' : 'bg-white border-zinc-100')}`}>
                            <button 
                              onClick={() => {
                                handleDesktopNavClick("inicio");
                                setIsMobileMenuOpen(false);
                              }}
                              className={`text-left text-base font-bold uppercase tracking-wider py-3 border-b ${theme === 'dark' || theme === 'glass' ? 'border-white/10 text-white hover:text-[#FE540B]' : 'border-zinc-100 text-zinc-900 hover:text-[#FE540B]'} !bg-transparent !shadow-none !rounded-none ${activeView === 'bio' && currentActiveSection === 'inicio' ? '!text-[#FE540B]' : ''} transition-colors`}
                            >
                              Início
                            </button>

                            <button 
                              onClick={() => {
                                handleDesktopNavClick("sobre");
                                setIsMobileMenuOpen(false);
                              }}
                              className={`text-left text-base font-bold uppercase tracking-wider py-3 border-b ${theme === 'dark' || theme === 'glass' ? 'border-white/10 text-white hover:text-[#FE540B]' : 'border-zinc-100 text-zinc-900 hover:text-[#FE540B]'} !bg-transparent !shadow-none !rounded-none ${currentActiveSection === 'sobre' ? '!text-[#FE540B]' : ''} transition-colors`}
                            >
                              Sobre a Empresa
                            </button>

                            {((bio.catalog_items && bio.catalog_items.length > 0) || isLiveEditMode) && (
                              <button 
                                onClick={() => {
                                  handleDesktopNavClick("produtos");
                                  setIsMobileMenuOpen(false);
                                }}
                                className={`text-left text-base font-bold uppercase tracking-wider py-3 border-b ${theme === 'dark' || theme === 'glass' ? 'border-white/10 text-white hover:text-[#FE540B]' : 'border-zinc-100 text-zinc-900 hover:text-[#FE540B]'} !bg-transparent !shadow-none !rounded-none ${currentActiveSection === 'produtos' ? '!text-[#FE540B]' : ''} transition-colors`}
                              >
                                Nossos Produtos
                              </button>
                            )}

                            {((bio.portfolio_items && bio.portfolio_items.length > 0) || isLiveEditMode) && (
                              <button 
                                onClick={() => {
                                  handleDesktopNavClick("portfolio");
                                  setIsMobileMenuOpen(false);
                                }}
                                className={`text-left text-base font-bold uppercase tracking-wider py-3 border-b ${theme === 'dark' || theme === 'glass' ? 'border-white/10 text-white hover:text-[#FE540B]' : 'border-zinc-100 text-zinc-900 hover:text-[#FE540B]'} !bg-transparent !shadow-none !rounded-none ${currentActiveSection === 'portfolio' ? '!text-[#FE540B]' : ''} transition-colors`}
                              >
                                Portfólio
                              </button>
                            )}

                            <button 
                              onClick={() => {
                                handleDesktopNavClick("contato");
                                setIsMobileMenuOpen(false);
                              }}
                              className={`text-left text-base font-bold uppercase tracking-wider py-3 border-b ${theme === 'dark' || theme === 'glass' ? 'border-white/10 text-white hover:text-[#FE540B]' : 'border-zinc-100 text-zinc-900 hover:text-[#FE540B]'} !bg-transparent !shadow-none !rounded-none ${activeView === 'contact' ? '!text-[#FE540B]' : ''} transition-colors`}
                            >
                              Contato
                            </button>

                            <button 
                              onClick={() => {
                                handleOpenCustomerArea();
                                setIsMobileMenuOpen(false);
                              }}
                              className={`group flex items-center gap-2.5 text-left text-base font-bold uppercase tracking-wider py-3 border-b ${theme === 'dark' || theme === 'glass' ? 'border-white/10 text-white hover:text-[#FE540B]' : 'border-zinc-100 text-zinc-900 hover:text-[#FE540B]'} !bg-transparent !shadow-none !rounded-none ${activeView === 'customer' ? '!text-[#FE540B]' : ''} transition-colors`}
                            >
                              <User className={`w-5 h-5 transition-colors duration-200 ${activeView === 'customer' ? 'text-[#FE540B]' : 'text-white group-hover:text-[#FE540B]'}`} />
                              <span className={`transition-colors duration-200 ${activeView === 'customer' ? 'text-[#FE540B]' : 'group-hover:text-[#FE540B]'}`}>{currentCustomer ? `Minha Conta (${currentCustomer.full_name.split(' ')[0]})` : 'Área do Cliente (Entrar / Cadastrar)'}</span>
                            </button>
                            
                            {userSocialLinks.length > 0 && (
                              <div className={`flex items-center gap-4 pt-4 ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>
                                {userSocialLinks.map((item) => (
                                  <TopBarSocialIcon key={item.id} item={item} theme={theme} asPreview={asPreview} />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Barrinha fina neon multicolorida encostada na parte inferior da barra superior de uma extremidade a outra - perfeitamente rente, sem vazado */}
                        <div 
                          className="w-full h-[3px] absolute bottom-0 left-0 right-0 z-50 pointer-events-none"
                          style={{
                            background: `linear-gradient(90deg, #FE540B, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, #FE540B)`,
                            backgroundSize: '300% 300%',
                            animation: 'color-loop 5s ease infinite',
                            boxShadow: 'none',
                            bottom: 0
                          }}
                        />
                      </div>

                      {/* Main Banner Hero Area - Fluido, adaptado para smartphone (1080x1920) sobre o 1 único background do site */}
                      <div className={`w-full relative overflow-hidden transition-all duration-500 ease-in-out ${
                        activeView === "portfolio" 
                          ? "min-h-screen w-full py-0 px-0"
                          : activeView === "contact" || activeView === "customer"
                            ? "aspect-[16/9] min-h-[220px] sm:min-h-[280px] w-full flex flex-col items-center justify-center text-center px-4"
                            : "w-full min-h-[480px] sm:min-h-[540px] flex flex-col items-center justify-center text-center relative px-4 pt-8 pb-14 sm:py-16"
                      }`}>
                        {/* Imagem do banner principal e de sub-telas com animação suave de escala ao trocar de tela */}
                        <motion.img 
                          key={`mobile-banner-${activeView}-${activePortfolioId || ''}`}
                          initial={{ scale: 1.08, opacity: 0.85 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
                          src={
                            activeView === "contact" || activeView === "customer"
                              ? (bio.contact_banner_img_url || finalMobile) 
                              : activeView === "portfolio" 
                                ? (portfolioMobileBanner || finalMobile) 
                                : (bio.mobile_banner_img_url_1 || bio.banner_img_url_1 || bio.desktop_banner_img_url || bio.banner_url || currentData?.mobile_app_background_url || currentData?.app_background_url || defaultArchitectureBanner)
                          } 
                          alt={companyName || "GM Edificação"} 
                          className="w-full h-full object-cover object-center select-none absolute inset-0 z-0 pointer-events-none will-change-transform" 
                          style={{
                            transform: `translate3d(0, ${scrollTop * 0.22}px, 0)`
                          }}
                          referrerPolicy="no-referrer" 
                        />

                        {/* Sombreado suave / Gradiente no banner mobile para contraste e leitura perfeita dos textos e botões */}
                        {activeView !== "contact" && activeView !== "portfolio" && activeView !== "customer" && (
                          <div 
                            className="absolute inset-0 z-10 pointer-events-none"
                            style={{
                              background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.78) 0%, rgba(0, 0, 0, 0.52) 45%, rgba(0, 0, 0, 0.82) 100%)'
                            }}
                          />
                        )}

                        {(activeView === "contact" || activeView === "customer") && (
                          <div className="absolute inset-0 z-10 pointer-events-none bg-black/40" />
                        )}

                        {/* Live Edit Button for Mobile Banner */}
                        {isLiveEditMode && !previewAsVisitor && (
                          <div className="absolute top-3 right-3 z-30">
                            <button
                              type="button"
                              onClick={() => setIsHeroModalOpen(true)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/85 border border-[#FE540B] text-white text-[11px] font-bold shadow-xl backdrop-blur-md cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#FE540B]" />
                              <span>Editar Banner</span>
                            </button>
                          </div>
                        )}
                        
                        {/* Overlaid Hero Content - Distribuído perfeitamente no smartphone com todos os elementos integrados */}
                        {activeView !== "contact" && activeView !== "portfolio" && activeView !== "customer" && (
                          <div 
                            className="relative z-20 w-full max-w-xl mx-auto flex flex-col items-center text-center py-2 sm:py-4 gap-4 sm:gap-6 transition-all duration-75 ease-out will-change-transform"
                            style={{
                              transform: `translate3d(0, ${scrollTop * 0.12}px, 0)`,
                              opacity: Math.max(0, 1 - scrollTop / 650)
                            }}
                          >
                            {/* Bloco 1: Título de Destaque no Topo do Banner Mobile */}
                            {(() => {
                              const heroTitle = bio.hero_title_mobile || bio.hero_title || bio.title_mobile || bio.title;
                              if (!heroTitle) return null;

                              return (
                                <div className="w-full mx-auto px-2 shrink-0">
                                  <EditableItem
                                    isEditMode={isLiveEditMode && !previewAsVisitor}
                                    label="Editar Título"
                                    onClick={() => {
                                      setQuickEditorState({
                                        isOpen: true,
                                        title: "Editar Título Principal",
                                        subtitle: "Altere o título de destaque na tela inicial do site",
                                        elementType: "title",
                                        initialText: heroTitle || companyName || "GM edificação",
                                        initialFormatting: {
                                          font: bio.title_font || bio.hero_title_font || "syne",
                                          size: "26 pt",
                                          color: "#FFFFFF",
                                          align: "center",
                                          bold: true
                                        },
                                        targetField: "hero_title",
                                      });
                                    }}
                                    className="inline-block p-1"
                                  >
                                    <h1 
                                      className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight !text-white leading-tight select-none max-w-full drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] bio-desc-font-${bio.title_font || bio.hero_title_font || "syne"}`}
                                      style={{
                                        fontFamily: getFontFamilyStyle(bio.title_font || bio.hero_title_font || "syne")
                                      }}
                                    >
                                      {heroTitle}
                                    </h1>
                                  </EditableItem>
                                </div>
                              );
                            })()}
                            
                            {/* Bloco 2: Apresentação fluida diretamente sobre o plano de fundo (sem caixa/container/modal) */}
                            <div className="w-full mx-auto px-2 sm:px-4">
                              <EditableItem
                                isEditMode={isLiveEditMode && !previewAsVisitor}
                                label="Editar Apresentação & Formatação"
                                onClick={() => {
                                  setQuickEditorState({
                                    isOpen: true,
                                    title: "Editar Apresentação & Formatação",
                                    subtitle: "Altere o texto, selecione trechos para negritar ou colorir e ajuste o tamanho",
                                    elementType: "description",
                                    initialText: bio.description_mobile || bio.description || desc || "GM edificação, Design Feroz",
                                    initialFormatting: {
                                      font: bio.description_font_mobile || bio.description_font || "syne",
                                      size: bio.description_size_mobile || bio.description_size || "16 pt",
                                      align: "center",
                                      bold: false,
                                      italic: false,
                                      color: "#FFFFFF",
                                    },
                                    targetField: "description",
                                  });
                                }}
                                className="w-full inline-block"
                              >
                                {(() => {
                                  const activeDescFont = bio.description_font_mobile || bio.description_font || "syne";
                                  const heroDescAlign = bio.description_align_mobile || bio.description_align || "center";
                                  const heroDescAlignClass = heroDescAlign === "left" ? "text-left" : heroDescAlign === "right" ? "text-right" : "text-center";
                                  const isDescBold = bio.description_bold_mobile !== undefined ? bio.description_bold_mobile : !!bio.description_bold;
                                  const isDescItalic = bio.description_italic_mobile !== undefined ? bio.description_italic_mobile : !!bio.description_italic;
                                  const mobPt = getMobileFontSizePt(bio.description_size_mobile || bio.description_size || "16 pt");
                                  const heroSizeClass = getFontSizeClass(bio.description_size_mobile || bio.description_size || "16 pt");

                                  return (
                                    <div 
                                      className={`site-hero-description leading-relaxed w-full mx-auto text-zinc-100 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] whitespace-pre-wrap ${heroSizeClass} bio-desc-font-${activeDescFont} ${isDescBold ? "font-bold" : "font-normal"} ${isDescItalic ? "italic" : "not-italic"} ${heroDescAlignClass}`}
                                      style={{
                                        fontSize: mobPt,
                                        fontFamily: getFontFamilyStyle(activeDescFont),
                                        color: bio.description_color || "#F4F4F5"
                                      }}
                                      dangerouslySetInnerHTML={{ 
                                        __html: bio.description_mobile || bio.description || desc || "GM edificação, Design Feroz" 
                                      }}
                                    />
                                  );
                                })()}
                              </EditableItem>
                            </div>

                            {/* Bloco 3: Botão de Ação e Indicador de Rolagem integrado na visualização */}
                            <div className="w-full flex flex-col items-center gap-3 pt-2 shrink-0">
                              <SitePillButton
                                label={bio.hero_button_label || "Conheça nossos Serviços"}
                                isEditMode={isLiveEditMode && !previewAsVisitor}
                                editLabel="Editar Botão"
                                onEdit={() => {
                                  setQuickEditorState({
                                    isOpen: true,
                                    title: "Editar Botão de Ação",
                                    subtitle: "Altere o texto do botão e a ação ao clicar",
                                    elementType: "button",
                                    initialText: bio.hero_button_label || "Conheça nossos Serviços",
                                    initialFormatting: {
                                      buttonAction: bio.hero_button_action || "portfolio",
                                      buttonUrl: bio.hero_button_url || "",
                                      buttonStyle: bio.hero_button_style || "glow",
                                      color: brandColor,
                                    },
                                    targetField: "hero_button",
                                  });
                                }}
                                onClick={() => {
                                  const el = document.getElementById("portfolio-section") || document.getElementById("catalog-section");
                                  if (el) {
                                    smoothScrollToTarget(el);
                                  } else {
                                    handleDesktopNavClick("contato");
                                  }
                                }}
                              />

                              {/* Seta de rolagem do website central - perfeitamente estática no centro, sem sombra, branca e muda para laranja no hover */}
                              <button 
                                type="button"
                                className="pt-2 pb-1 flex flex-col items-center justify-center cursor-pointer group/scroll bg-transparent border-0 outline-none p-0 select-none transition-colors duration-200 focus:outline-none"
                                onClick={() => {
                                  const el = document.getElementById("about-company-section") || document.getElementById("catalog-section") || document.getElementById("portfolio-section");
                                  if (el) {
                                    smoothScrollToTarget(el);
                                  }
                                }}
                                title="Rolar para baixo"
                                aria-label="Rolar para baixo"
                                style={{ transform: "none" }}
                              >
                                <span className="text-[10px] sm:text-[11px] font-bold text-white/80 uppercase tracking-widest mb-0.5 select-none transition-colors duration-200 group-hover/scroll:text-[#FE540B]">
                                  Role para ver mais
                                </span>
                                <ChevronDown 
                                  className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover/scroll:text-[#FE540B] transition-colors duration-200 stroke-[2.5]" 
                                  style={{ filter: "none", boxShadow: "none", textShadow: "none", transform: "none" }}
                                />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div className="w-full min-w-full px-0 mx-0 mt-0 space-y-0 flex flex-col items-center">

          <AnimatePresence mode="wait">
          {activeView === "portfolio" ? (
            <motion.div 
              key="portfolio-view"
              variants={overlapTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full pb-10 overlap-transition-view"
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
                                 className="relative flex-1 aspect-[2.2/1] sm:aspect-[3/1] md:aspect-[3.8/1] min-h-[120px] sm:min-h-[150px] rounded-lg overflow-hidden border portfolio-card-upscale cursor-pointer bg-zinc-950/20 group flex items-center justify-start"
                                 style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                               >
                                 {prevCoverImg ? (
                                   <OptimizedMedia 
                                     src={prevCoverImg} 
                                     alt={prevPortfolio.title || ""} 
                                     className="absolute inset-0 w-full h-full object-cover portfolio-media-upscale" 
                                     isCover={true}
                                   />
                                 ) : (
                                   <div className="absolute inset-0 w-full h-full bg-black/40" />
                                 )}
                                 <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent flex flex-row items-center gap-4 p-4 sm:p-6 md:p-8 lg:p-10 text-white">
                                       <ChevronLeft className="w-6 h-6 sm:w-10 sm:h-10 md:w-14 md:h-14 lg:w-18 lg:h-18 text-white/95 transition-transform duration-300 group-hover:-translate-x-2 shrink-0" />
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
                                 className="relative flex-1 aspect-[2.2/1] sm:aspect-[3/1] md:aspect-[3.8/1] min-h-[120px] sm:min-h-[150px] rounded-lg overflow-hidden border portfolio-card-upscale cursor-pointer bg-zinc-950/20 group flex items-center justify-end"
                                 style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                               >
                                 {nextCoverImg ? (
                                   <OptimizedMedia 
                                     src={nextCoverImg} 
                                     alt={nextPortfolio.title || ""} 
                                     className="absolute inset-0 w-full h-full object-cover portfolio-media-upscale" 
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
                                       <ChevronRight className="w-6 h-6 sm:w-10 sm:h-10 md:w-14 md:h-14 lg:w-18 lg:h-18 text-white/95 transition-transform duration-300 group-hover:translate-x-2 shrink-0" />
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
                                   className="relative flex-1 aspect-[2.2/1] sm:aspect-[3/1] md:aspect-[3.8/1] min-h-[120px] sm:min-h-[150px] rounded-lg overflow-hidden border portfolio-card-upscale cursor-pointer bg-zinc-950/20 group flex items-center justify-start"
                                   style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                                 >
                                   {prevCoverImg ? (
                                     <OptimizedMedia 
                                       src={prevCoverImg} 
                                       alt={prevPortfolio.title || ""} 
                                       className="absolute inset-0 w-full h-full object-cover portfolio-media-upscale" 
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
                                   className="relative flex-1 aspect-[2.2/1] sm:aspect-[3/1] md:aspect-[3.8/1] min-h-[120px] sm:min-h-[150px] rounded-lg overflow-hidden border portfolio-card-upscale cursor-pointer bg-zinc-950/20 group flex items-center justify-end"
                                   style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                                 >
                                   {nextCoverImg ? (
                                     <OptimizedMedia 
                                       src={nextCoverImg} 
                                       alt={nextPortfolio.title || ""} 
                                       className="absolute inset-0 w-full h-full object-cover portfolio-media-upscale" 
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
              variants={overlapTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full shrink-0 pt-8 sm:pt-14 pb-16 sm:pb-24 flex flex-col items-center overlap-transition-view"
            >
              <div id="contact-section" className="w-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col items-center gap-8 sm:gap-12 shrink-0">
                
                {/* 1. Header: Title & Description */}
                <div className="w-full flex flex-col items-center text-center space-y-3 max-w-3xl mx-auto">
                  <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-sans font-black tracking-tight leading-tight select-none ${isWebsiteLayout || theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>
                    {bio.contact_title || "Fale com a gente"}
                  </h2>
                  
                  <p className={`text-xs sm:text-sm md:text-base font-medium leading-relaxed max-w-2xl ${isWebsiteLayout || theme === 'dark' || theme === 'glass' ? 'text-zinc-300' : 'text-slate-600'}`}>
                    {bio.contact_desc || "Estamos prontos para atender você. Escolha um canal de atendimento direto abaixo ou envie sua mensagem pelo formulário."}
                  </p>
                </div>

                {/* 2. Main Grid: Form + Address/Map */}
                <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Form Container (Col 1-7 or 1-12) */}
                  <div className={`w-full ${bio.address ? "lg:col-span-7" : "lg:col-span-8 lg:col-start-3"} transition-all duration-300 ${
                    isWebsiteLayout || theme === 'glass' || theme === 'dark'
                      ? 'apple-glass-card p-6 sm:p-8 md:p-10 rounded-[2.5rem]'
                      : 'p-6 sm:p-8 md:p-10 rounded-[2.5rem] border border-zinc-200/80 bg-white/70 backdrop-blur-xl shadow-lg'
                  }`}>
                    <div className="mb-6 flex items-center gap-3.5">
                      <div 
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md shrink-0 bg-[#25D366] border border-white/20"
                      >
                        <img 
                          src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20BRANCA/Whatsapp%20branco.svg" 
                          alt="WhatsApp" 
                          className="w-6 h-6 object-contain pointer-events-none select-none"
                        />
                      </div>
                      <div>
                        <h3 className={`text-xl sm:text-2xl font-black ${isWebsiteLayout || theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>
                          Envie uma Mensagem
                        </h3>
                        <p className={`text-xs sm:text-sm ${isWebsiteLayout || theme === 'dark' || theme === 'glass' ? 'text-zinc-400' : 'text-slate-500'}`}>
                          Preencha as informações e responderemos em breve.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleContactSubmit} className="space-y-4 sm:space-y-5">
                      {contactSuccess ? (
                        <div className="py-8 sm:py-10 text-center space-y-6">
                          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center shadow-lg">
                            <Check className="w-8 h-8 stroke-[3]" />
                          </div>
                          
                          <div className="space-y-2 max-w-xl mx-auto">
                            <h4 className={`text-xl sm:text-2xl font-black text-center ${isWebsiteLayout || theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>
                              Mensagem Enviada com Sucesso!
                            </h4>
                            <p className={`text-xs sm:text-sm text-center ${isWebsiteLayout || theme === 'dark' || theme === 'glass' ? 'text-slate-300' : 'text-slate-600'}`}>
                              Obrigado pelo contato! Seus dados foram registrados com sucesso. O atendimento pelo WhatsApp foi preparado para agilizar a sua resposta.
                            </p>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                            {lastWhatsappUrl && (
                              <a 
                                href={lastWhatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto px-6 py-3.5 rounded-full font-black text-xs sm:text-sm flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white shadow-lg transition-all active:scale-95 cursor-pointer"
                              >
                                <img 
                                  src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20BRANCA/Whatsapp%20branco.svg" 
                                  alt="WhatsApp" 
                                  className="w-4 h-4 object-contain"
                                />
                                <span>Abrir no WhatsApp</span>
                              </a>
                            )}

                            <a 
                              href={`mailto:${submittedEmail}?subject=${encodeURIComponent(contactSubject || 'Contato pelo site')}&body=${encodeURIComponent(`Nome: ${contactName}\nEmail: ${contactEmail}\nTelefone: ${contactPhone}\n\nMensagem:\n${contactMessage}`)}`}
                              className="w-full sm:w-auto px-6 py-3.5 rounded-full font-black text-xs sm:text-sm flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 shadow-md transition-all active:scale-95 cursor-pointer"
                            >
                              <Send className="w-4 h-4" />
                              <span>Enviar também por E-mail</span>
                            </a>
                          </div>

                          <div className="pt-2 text-center">
                            <button 
                              type="button" 
                              onClick={() => { setContactSuccess(false); setNeedsActivation(false); }}
                              className="site-btn-pill px-8 py-3 text-xs sm:text-sm uppercase tracking-wider cursor-pointer"
                              style={{ backgroundColor: brandColor || "#FE540B" }}
                            >
                              Enviar outra mensagem
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {contactError && (
                            <div className="bg-red-500/15 border border-red-500/30 rounded-2xl p-4 text-red-300 text-xs sm:text-sm font-bold animate-pulse">
                              {contactError}
                            </div>
                          )}

                          {/* Name Field */}
                          <div>
                            <label htmlFor="contact_name" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                              Seu Nome Completo *
                            </label>
                            <input 
                              type="text"
                              id="contact_name"
                              required
                              placeholder="Como podemos te chamar?"
                              value={contactName}
                              onChange={(e) => setContactName(e.target.value)}
                              className={`w-full px-4 sm:px-5 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl ${
                                isWebsiteLayout || theme === 'glass' || theme === 'dark'
                                  ? 'apple-glass-input'
                                  : 'backdrop-blur-xl bg-white/70 border-black/10 focus:border-black/30 text-slate-900 placeholder-zinc-400 shadow-sm focus:ring-2 focus:ring-black/10'
                              }`}
                            />
                          </div>

                          {/* Email & Phone Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="contact_email" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                E-mail para Contato *
                              </label>
                              <input 
                                type="email"
                                id="contact_email"
                                required
                                placeholder="seu@email.com"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                className={`w-full px-4 sm:px-5 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl ${
                                  isWebsiteLayout || theme === 'glass' || theme === 'dark'
                                    ? 'apple-glass-input'
                                    : 'backdrop-blur-xl bg-white/70 border-black/10 focus:border-black/30 text-slate-900 placeholder-zinc-400 shadow-sm focus:ring-2 focus:ring-black/10'
                                }`}
                              />
                            </div>

                            <div>
                              <label htmlFor="contact_phone" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                WhatsApp / Telefone
                              </label>
                              <input 
                                type="tel"
                                id="contact_phone"
                                placeholder="(98) 98750-5041"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(formatPhoneNumber(e.target.value))}
                                maxLength={15}
                                className={`w-full px-4 sm:px-5 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl ${
                                  isWebsiteLayout || theme === 'glass' || theme === 'dark'
                                    ? 'apple-glass-input'
                                    : 'backdrop-blur-xl bg-white/70 border-black/10 focus:border-black/30 text-slate-900 placeholder-zinc-400 shadow-sm focus:ring-2 focus:ring-black/10'
                                }`}
                              />
                              <span className="block text-[11px] text-zinc-400/80 mt-1 font-medium">Sugestão: (98) 98750-5041</span>
                            </div>
                          </div>

                          {/* Subject Field */}
                          <div>
                            <label htmlFor="contact_subject" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                              Assunto
                            </label>
                            <input 
                              type="text"
                              id="contact_subject"
                              placeholder="Orçamento, Dúvida ou Parceria"
                              value={contactSubject}
                              onChange={(e) => setContactSubject(e.target.value)}
                              className={`w-full px-4 sm:px-5 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl ${
                                isWebsiteLayout || theme === 'glass' || theme === 'dark'
                                  ? 'apple-glass-input'
                                  : 'backdrop-blur-xl bg-white/70 border-black/10 focus:border-black/30 text-slate-900 placeholder-zinc-400 shadow-sm focus:ring-2 focus:ring-black/10'
                              }`}
                            />
                          </div>

                          {/* Message Field */}
                          <div>
                            <label htmlFor="contact_message" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                              Sua Mensagem *
                            </label>
                            <textarea 
                              id="contact_message"
                              required
                              rows={5}
                              placeholder="Escreva sua mensagem com detalhes sobre o que precisa..."
                              value={contactMessage}
                              onChange={(e) => setContactMessage(e.target.value)}
                              className={`w-full px-4 sm:px-5 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 resize-none rounded-2xl leading-relaxed ${
                                isWebsiteLayout || theme === 'glass' || theme === 'dark'
                                  ? 'apple-glass-input'
                                  : 'backdrop-blur-xl bg-white/70 border-black/10 focus:border-black/30 text-slate-900 placeholder-zinc-400 shadow-sm focus:ring-2 focus:ring-black/10'
                              }`}
                            />
                          </div>

                          {/* Submit Button */}
                          <div className="pt-2 flex justify-start">
                            <button
                              type="submit"
                              disabled={contactSubmitting}
                              className="site-btn-pill w-full sm:w-auto px-8 sm:px-10 py-3.5 text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer font-black"
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
                                <>
                                  <Send className="w-4 h-4" />
                                  <span>Enviar Mensagem</span>
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </form>
                  </div>

                  {/* Side Card: Map & Location (Col 8-12) */}
                  {bio.address && (
                    <div className="w-full lg:col-span-5 flex flex-col gap-5">
                      <div className={`p-6 sm:p-8 rounded-[2.5rem] border transition-all duration-300 ${
                        isWebsiteLayout || theme === 'glass' || theme === 'dark'
                          ? 'apple-glass-card border-white/10'
                          : 'border-zinc-200/80 bg-white/70 backdrop-blur-xl shadow-lg'
                      }`}>
                        <div className="flex items-center gap-3 mb-4">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
                            style={{ backgroundColor: brandColor || '#FE540B' }}
                          >
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className={`text-lg sm:text-xl font-black ${isWebsiteLayout || theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>
                              Nossa Localização
                            </h4>
                            <p className="text-xs text-zinc-400">Venha nos fazer uma visita</p>
                          </div>
                        </div>

                        <p className={`text-xs sm:text-sm font-medium mb-4 leading-relaxed ${isWebsiteLayout || theme === 'dark' || theme === 'glass' ? 'text-zinc-300' : 'text-slate-700'}`}>
                          {bio.address}
                        </p>

                        <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 shadow-md relative z-0 mb-4 bg-zinc-900 group/map">
                          <iframe
                            title="Localização Comercial"
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(bio.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                            className="w-full h-full border-0 rounded-2xl pointer-events-none sm:pointer-events-auto"
                            allowFullScreen={false}
                            loading="lazy"
                          />
                          {/* Dica para mobile sem travar a rolagem vertical do site */}
                          <div className="sm:hidden absolute inset-0 pointer-events-none flex items-end justify-center p-3">
                            <span className="px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-bold text-white/90 border border-white/15 shadow">
                              📍 Toque no botão abaixo para abrir a rota
                            </span>
                          </div>
                        </div>

                        <a
                          href={bio.address_url ? bio.address_url : `https://maps.google.com/?q=${encodeURIComponent(bio.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white transition-all border border-white/15 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir no Google Maps</span>
                        </a>
                      </div>

                      {/* Commitment / Security Badge */}
                      <div className="p-5 rounded-2xl bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 flex items-center gap-3.5 text-white/90">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="text-xs sm:text-sm font-black text-white">Atendimento Confiável</h5>
                          <p className="text-xs text-zinc-400">Respondemos com prioridade todas as solicitações e orçamentos.</p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Footer spacing */}
              <div className="w-full h-12 sm:h-20 shrink-0" />
            </motion.div>
          ) : activeView === "customer" ? (
            <motion.div 
              key="customer-view"
              variants={overlapTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full shrink-0 pt-8 sm:pt-14 pb-16 sm:pb-24 flex flex-col items-center overlap-transition-view"
            >
              <CustomerAreaSection
                currentCustomer={currentCustomer}
                onCustomerUpdated={(updated) => setCurrentCustomer(updated)}
                onCustomerAuthSuccess={(cust) => {
                  setCurrentCustomer(cust);
                  pushToast({ type: "success", title: "Olá!", message: `Bem-vindo(a), ${cust.full_name.split(' ')[0]}!` });
                }}
                onLogout={() => {
                  setCurrentCustomer(null);
                  localStorage.removeItem("gm_admin_authenticated");
                  pushToast({ type: "info", title: "Até logo", message: "Você saiu da sua conta de cliente." });
                }}
                brandColor={brandColor || "#FE540B"}
                theme={theme}
                isWebsiteLayout={isWebsiteLayout}
                companyAddress={bio.address}
                companyAddressUrl={bio.address_url}
                companyWhatsapp={bio.whatsapp || bio.phone || ""}
                companyName={companyName || "GM Edificação"}
                companyEmail={bio.email || submittedEmail || "gmedificacao@gmail.com"}
                pixKey={pixKey}
                pixType={pixType}
                cardUrl={cardUrl}
                tenantId={currentData?.tenant_id || userTenantId || "global"}
                isAdmin={isUserAdmin}
                onOpenAdminOrders={isUserAdmin ? () => setIsAdminHubOpen(true) : undefined}
                onSelectPaymentOrder={(order) => setActivePaymentOrder(order)}
              />

              {/* Footer spacing */}
              <div className="w-full h-12 sm:h-20 shrink-0" />
            </motion.div>
          ) : (
            <motion.div
              key="bio-view"
              variants={overlapTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full overlap-transition-view"
            >
              {/* 3. Contacts & Links Stack (Harmonized, wider container blocks - rendered only if active links exist) */}
              {Boolean(bio.portfolio_url || bio.catalog_url || bio.website || (customLinks && customLinks.length > 0 && customLinks.some((l: any) => l.url || l.value))) && (
                <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid gap-3 sm:gap-4.5 grid-cols-1 sm:grid-cols-2">
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
              )}

              {/* 3.5. "Sobre sua empresa" Section */}
              {bio.show_about !== false && (
                <div 
                  id="about-company-section" 
                  className="relative z-20 w-full py-14 sm:py-20 md:py-28 border-t border-b border-white/10 bg-black/40 backdrop-blur-md scroll-mt-20 md:scroll-mt-36 animate-fade-in"
                >
              {/* Content Wrapper - Enquadramento horizontal amplo sem caixa conforme solicitado pelo usuário */}
              <div className="relative z-10 max-w-6xl w-full mx-auto px-6 sm:px-10 md:px-16 flex flex-col items-center justify-center text-center space-y-6 sm:space-y-8 h-full">
                {/* Title */}
                <EditableItem
                  isEditMode={isLiveEditMode && !previewAsVisitor}
                  label="Editar Título Sobre"
                  onClick={() => {
                    setQuickEditorState({
                      isOpen: true,
                      title: "Editar Título 'Sobre a Empresa'",
                      subtitle: "Altere o título da seção de apresentação",
                      elementType: "title",
                      initialText: bio.about_title || `Sobre a ${companyName || 'Sua Empresa'}`,
                      initialFormatting: {
                        font: bio.about_title_font || "funnel",
                        size: bio.about_title_size || "30 pt",
                        align: bio.about_title_align || "center",
                        bold: bio.about_title_bold !== false,
                      },
                      targetField: "about_title",
                    });
                  }}
                  className="w-full inline-block p-1"
                >
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
                    <span className="scroll-reveal-mask">
                      <span className="scroll-reveal-inner">
                        {(bio.about_title || `Sobre a ${companyName || 'Sua Empresa'}`).toUpperCase()}
                      </span>
                    </span>
                  </h2>
                </EditableItem>

                {/* Main Description - Área de texto ampla horizontalmente conforme marcação do usuário */}
                {(bio.about_description || !bio.about_title) && (
                  <EditableItem
                    isEditMode={isLiveEditMode && !previewAsVisitor}
                    label="Editar Descrição Sobre"
                    onClick={() => {
                      setQuickEditorState({
                        isOpen: true,
                        title: "Editar Descrição 'Sobre a Empresa'",
                        subtitle: "Altere o texto institucional da empresa",
                        elementType: "description",
                        initialText: bio.about_description || `A GM edificação é uma agência criativa que transforma ideias em experiências visuais, marcas e conteúdos que comunicam, conectam e geram impacto. Especializada em Design Gráfico, Branding, Identidade Visual, Motion Design, Design 3D, Social Media e Produção de Conteúdo, a GM edificação combina criatividade, estratégia e tecnologia para desenvolver projetos únicos, profissionais e alinhados à essência de cada cliente. Mais do que criar uma arte, construímos conceitos.`,
                        initialFormatting: {
                          font: bio.about_desc_font || "ui",
                          size: bio.about_desc_size || "16 pt",
                          align: bio.about_desc_align || "center",
                          bold: !!bio.about_desc_bold,
                          italic: !!bio.about_desc_italic,
                        },
                        targetField: "about_description",
                      });
                    }}
                    className="w-full max-w-5xl lg:max-w-6xl inline-block p-1"
                  >
                    <p 
                      className={`leading-relaxed sm:leading-[1.8] max-w-5xl lg:max-w-6xl w-full mx-auto tracking-normal text-base sm:text-lg md:text-xl lg:text-[1.24rem] ${
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
                      {bio.about_description || `A GM edificação é uma agência criativa que transforma ideias em experiências visuais, marcas e conteúdos que comunicam, conectam e geram impacto. Especializada em Design Gráfico, Branding, Identidade Visual, Motion Design, Design 3D, Social Media e Produção de Conteúdo, a GM edificação combina criatividade, estratégia e tecnologia para desenvolver projetos únicos, profissionais e alinhados à essência de cada cliente. Mais do que criar uma arte, construímos conceitos.`}
                    </p>
                  </EditableItem>
                )}

                {/* Highlight text (Bold) */}
                {(bio.about_highlight || !bio.about_title) && (
                  <EditableItem
                    isEditMode={isLiveEditMode && !previewAsVisitor}
                    label="Editar Destaque Sobre"
                    onClick={() => {
                      setQuickEditorState({
                        isOpen: true,
                        title: "Editar Chamada de Destaque",
                        subtitle: "Altere a frase de impacto e convite para ação",
                        elementType: "description",
                        initialText: bio.about_highlight || `Edificamos ideias. Criamos impacto. Design Feroz. 🦁`,
                        initialFormatting: {
                          font: bio.about_highlight_font || "ui",
                          size: bio.about_highlight_size || "16 pt",
                          align: bio.about_highlight_align || "center",
                          bold: bio.about_highlight_bold !== false,
                          italic: !!bio.about_highlight_italic,
                        },
                        targetField: "about_highlight",
                      });
                    }}
                    className="w-full max-w-4xl inline-block p-1"
                  >
                    <p 
                      className={`tracking-normal max-w-4xl w-full mx-auto text-base sm:text-lg md:text-xl font-bold ${
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
                      {bio.about_highlight || `Edificamos ideias. Criamos impacto. Design Feroz. 🦁`}
                    </p>
                  </EditableItem>
                )}

                {/* Orange rounded-full button identical to the print */}
                <div className="pt-2">
                  <SitePillButton
                    label={bio.about_btn_text || 'Fale Conosco'}
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
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. Products Catalog Section */}
          {((bio.catalog_items && bio.catalog_items.length > 0) || isLiveEditMode) && (
            <div 
              id="catalog-section" 
              className="relative z-30 w-full py-12 sm:py-20 md:py-28 border-t border-b border-white/5 bg-black/30 backdrop-blur-md scroll-mt-20 md:scroll-mt-36"
            >
              <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 space-y-6 sm:space-y-8">
              <div className="flex items-center justify-between px-2">
                <EditableItem
                  isEditMode={isLiveEditMode && !previewAsVisitor}
                  label="Editar Título dos Produtos"
                  onClick={() => {
                    setQuickEditorState({
                      isOpen: true,
                      title: "Editar Título dos Produtos",
                      subtitle: "Altere o título da seção de catálogo",
                      elementType: "section_title",
                      initialText: bio.catalog_title || "Nossos Produtos",
                      initialFormatting: {
                        color: brandColor,
                      },
                      targetField: "catalog_title",
                    });
                  }}
                  className="p-1 -ml-1 inline-block"
                >
                  <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${t.textTitle}`}>
                    <span className="scroll-reveal-mask">
                      <span className="scroll-reveal-inner">
                        {bio.catalog_title || "Nossos Produtos"}
                      </span>
                    </span>
                  </h2>
                </EditableItem>
                {isLiveEditMode && !previewAsVisitor && (
                  <button
                    type="button"
                    onClick={() => setProductModalState({ isOpen: true, product: null })}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FE540B] text-white text-xs font-black shadow-md hover:scale-105 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Produto</span>
                  </button>
                )}
              </div>
              
              <div 
                className="relative w-full overflow-hidden px-2 sm:px-12 py-4"
                onTouchStart={handleCatalogTouchStart}
                onTouchEnd={handleCatalogTouchEnd}
              >
                <div className="overflow-hidden w-full py-2 -my-2">
                  <div 
                    className="flex transition-transform duration-500 ease-in-out will-change-transform"
                    style={{
                      transform: `translate3d(-${catalogIndex * (isMobileView ? 100 : 100 / 3)}%, 0px, 0px)`
                    }}
                  >
                    {(bio.catalog_items || []).map((item: any) => {
                      return (
                        <div 
                          key={item.id} 
                          className={`${isMobileView ? 'w-full' : 'w-1/3'} flex-shrink-0 p-2.5 sm:p-3 flex flex-col`}
                        >
                          <EditableItem
                            isEditMode={isLiveEditMode && !previewAsVisitor}
                            label={`Editar: ${item.name || "Produto"}`}
                            onClick={() => setProductModalState({ isOpen: true, product: item })}
                            className="h-full flex flex-col flex-1"
                          >
                            <div 
                              onClick={() => {
                                if (isLiveEditMode && !previewAsVisitor) {
                                  setProductModalState({ isOpen: true, product: item });
                                  return;
                                }
                                setSelectedProduct(item);
                                setActiveImageIndex(0);
                              }}
                              className={`overflow-hidden rounded-[2rem] border catalog-card-upscale flex flex-col h-full cursor-pointer group ${t.cardBg} ${t.cardBorder} catalog-card-item flex-1 relative`}
                            >
                              {/* Live Edit overlay buttons on each product card */}
                              {isLiveEditMode && !previewAsVisitor && (
                                <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setProductModalState({ isOpen: true, product: item });
                                    }}
                                    className="p-1.5 rounded-full bg-black/85 hover:bg-black text-white hover:text-[#FE540B] shadow-md cursor-pointer transition-colors"
                                    title="Editar Produto"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteProduct(item.id);
                                    }}
                                    className="p-1.5 rounded-full bg-black/85 hover:bg-black text-white hover:text-red-400 shadow-md cursor-pointer transition-colors"
                                    title="Excluir Produto"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            {item.image_url ? (() => {
                              const isItemPng = item.image_url.toLowerCase().includes('.png') || item.image_url.toLowerCase().includes('image/png') || item.image_url.toLowerCase().includes('format=png');
                              return (
                                <div className="w-full aspect-square overflow-hidden relative flex items-center justify-center rounded-[1.5rem] border" style={{ backgroundColor: isItemPng ? '#ffffff' : theme === 'dark' ? `${brandColor}08` : '#ffffff', borderColor: theme === 'dark' ? `${brandColor}15` : 'rgba(0,0,0,0.05)' }}>
                                  <OptimizedMedia src={item.image_url} alt={item.name} className={`w-full h-full ${isItemPng ? 'object-contain p-3.5' : 'object-cover'} catalog-media-upscale`} width={500} isCover={!isItemPng} />
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
                        </EditableItem>
                      </div>
                    );
                    })}
                  </div>
                </div>

                {/* Side Navigation Arrows (Desktop & Smartphone) */}
                {maxCatalogIndex > 0 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCatalogIndex((prev) => (prev <= 0 ? maxCatalogIndex : prev - 1));
                      }}
                      className="flex absolute left-0.5 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-12 sm:h-12 min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] rounded-full items-center justify-center bg-zinc-950/90 hover:bg-black border border-white/20 hover:border-[#FE540B]/80 text-white shadow-xl transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
                      aria-label="Produto anterior"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: brandColor || '#FE540B' }} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCatalogIndex((prev) => (prev >= maxCatalogIndex ? 0 : prev + 1));
                      }}
                      className="flex absolute right-0.5 sm:right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-12 sm:h-12 min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] rounded-full items-center justify-center bg-zinc-950/90 hover:bg-black border border-white/20 hover:border-[#FE540B]/80 text-white shadow-xl transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
                      aria-label="Próximo produto"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: brandColor || '#FE540B' }} />
                    </button>
                  </>
                )}

                {/* Carousel Pagination Controls */}
                {maxCatalogIndex > 0 && (
                  <div className="flex justify-center items-center gap-2 pt-4 pb-2">
                    {Array.from({ length: maxCatalogIndex + 1 }).map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCatalogIndex(dotIdx);
                        }}
                        className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer shrink-0 ${
                          catalogIndex === dotIdx 
                            ? "w-8 bg-[#FE540B] shadow-[0_0_12px_rgba(254,84,11,0.6)]" 
                            : "w-2.5 bg-white/25 hover:bg-white/50"
                        }`}
                        aria-label={`Ver slide de produtos ${dotIdx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              </div>
            </div>
          )}



          
          {/* Portfólio Section */}
          {((bio.portfolio_items && bio.portfolio_items.length > 0) || isLiveEditMode) && (
            <div 
              id="portfolio-section" 
              className="relative z-40 w-full py-12 sm:py-20 md:py-28 border-t border-b border-white/5 bg-black/40 backdrop-blur-md scroll-mt-20 md:scroll-mt-36"
            >
              <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 space-y-6 sm:space-y-8">
              <div className="flex items-center justify-between px-2">
                <EditableItem
                  isEditMode={isLiveEditMode && !previewAsVisitor}
                  label="Editar Título do Portfólio"
                  onClick={() => {
                    setQuickEditorState({
                      isOpen: true,
                      title: "Editar Título do Portfólio",
                      subtitle: "Altere o título da seção de portfólio de projetos",
                      elementType: "section_title",
                      initialText: bio.portfolio_title || "Nosso Portfólio",
                      initialFormatting: {
                        color: brandColor,
                      },
                      targetField: "portfolio_title",
                    });
                  }}
                  className="p-1 -ml-1 inline-block"
                >
                  <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${t.textTitle}`}>
                    <span className="scroll-reveal-mask">
                      <span className="scroll-reveal-inner">
                        {bio.portfolio_title || "Nosso Portfólio"}
                      </span>
                    </span>
                  </h2>
                </EditableItem>
                {isLiveEditMode && !previewAsVisitor && (
                  <button
                    type="button"
                    onClick={() => setPortfolioModalState({ isOpen: true, project: null })}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FE540B] text-white text-xs font-black shadow-md hover:scale-105 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Projeto</span>
                  </button>
                )}
              </div>
              
              <div className={`grid gap-5 sm:gap-6 ${isMobileView ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                {(bio.portfolio_items || []).map((item: any) => {
                   const isNewFormat = !!item.layers;
                   const hasDesktopLayers = !!item.layers && item.layers.length > 0;
                   const hasMobileLayers = !!item.mobile_layers && item.mobile_layers.length > 0;
                   const coverImg = isMobileView
                     ? (hasMobileLayers ? item.mobile_layers[0].image_url : (hasDesktopLayers ? item.layers[0].image_url : item.image_url))
                     : (hasDesktopLayers ? item.layers[0].image_url : (hasMobileLayers ? item.mobile_layers[0].image_url : item.image_url));
                   
                   return (
                     <EditableItem
                       key={item.id}
                       isEditMode={isLiveEditMode && !previewAsVisitor}
                       label={`Editar: ${item.title || "Projeto"}`}
                       onClick={() => setPortfolioModalState({ isOpen: true, project: item })}
                       className="relative aspect-[4/3] sm:aspect-square w-full rounded-2xl sm:rounded-[1.5rem]"
                     >
                       <div 
                         onClick={() => {
                           if (isLiveEditMode && !previewAsVisitor) {
                             setPortfolioModalState({ isOpen: true, project: item });
                             return;
                           }
                           setActivePortfolioId(item.id);
                           setActiveView("portfolio");
                           smoothScrollToTarget(0);
                         }}
                         className="relative aspect-[4/3] sm:aspect-square w-full rounded-2xl sm:rounded-[1.5rem] overflow-hidden border portfolio-card-upscale cursor-pointer bg-zinc-950/20 group flex items-center justify-center"
                       style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                     >
                       {/* Live Edit controls for portfolio project card */}
                       {isLiveEditMode && !previewAsVisitor && (
                         <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
                           <button
                             type="button"
                             onClick={(e) => {
                               e.stopPropagation();
                               setPortfolioModalState({ isOpen: true, project: item });
                             }}
                             className="p-1.5 rounded-full bg-black/85 hover:bg-black text-white hover:text-[#FE540B] shadow-md cursor-pointer transition-colors"
                             title="Editar Projeto"
                           >
                             <Edit3 className="w-3.5 h-3.5" />
                           </button>
                           <button
                             type="button"
                             onClick={(e) => {
                               e.stopPropagation();
                               handleDeletePortfolioProject(item.id);
                             }}
                             className="p-1.5 rounded-full bg-black/85 hover:bg-black text-white hover:text-red-400 shadow-md cursor-pointer transition-colors"
                             title="Excluir Projeto"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                         </div>
                       )}
                       {coverImg ? (
                         <OptimizedMedia 
                           src={coverImg} 
                           alt={item.title || "Portfolio item"} 
                           className="w-full h-full object-cover portfolio-media-upscale" 
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
                     </EditableItem>
                   );
                })}
              </div>
              </div>
            </div>
          )}

            </motion.div>
          )}
          </AnimatePresence>

          {/* 6. Admin Area / Login Footer Trigger */}
          <footer className="relative z-20 w-full shrink-0 mt-0 py-12 sm:py-16 bg-black/90 backdrop-blur-xl border-t border-white/10 text-center space-y-6 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto px-6 space-y-6">
              <EditableItem
                isEditMode={isLiveEditMode && !previewAsVisitor}
                label="Editar Nome & Rodapé"
                onClick={() => setIsLogoModalOpen(true)}
                className="inline-block p-1"
              >
                <div className="text-sm sm:text-base font-bold tracking-wider opacity-90">
                  <span className={theme === 'dark' || theme === 'glass' ? "text-white font-extrabold" : "text-zinc-900 font-extrabold"}>
                    {companyName ? companyName.toUpperCase() : "GM EDIFICAÇÃO"}®
                  </span>{' '}
                  <span style={{ color: brandColor || "#FE540B" }} className="font-extrabold">2026</span>
                </div>
              </EditableItem>
              <div className="flex flex-col items-center gap-3">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-lg mx-auto">
                  {/* Botão Acesso ao Painel Admin */}
                  <button 
                    type="button"
                    onClick={() => {
                      if (isUserAdmin) {
                        setIsAdminHubOpen(true);
                      } else {
                        setIsLoginOpen(true);
                        pushToast({
                          type: "info",
                          title: "Login de Administrador",
                          message: "Entre com seu e-mail e senha de administrador para habilitar o acesso."
                        });
                      }
                    }}
                    className="w-full sm:w-[240px] h-11 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer px-4 rounded-full border border-white/15 bg-black/40 hover:bg-white/10 backdrop-blur-sm shadow-md text-xs sm:text-sm font-black"
                    title="Acessar Painel do Administrador"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#FE540B] shrink-0" style={{ color: brandColor || "#FE540B" }} />
                    <span 
                      className="bg-clip-text text-transparent drop-shadow-sm font-funnel truncate"
                      style={{
                        backgroundImage: `linear-gradient(90deg, ${brandColor || '#FE540B'}, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, ${brandColor || '#FE540B'})`,
                        backgroundSize: '300% 300%',
                        animation: 'color-loop 5s ease infinite',
                      }}
                    >
                      Painel do Administrador
                    </span>
                  </button>

                  {/* Botão Modo Editor Visual */}
                  <button 
                    type="button"
                    onClick={() => {
                      if (user) {
                        setIsLiveEditMode(!isLiveEditMode);
                        pushToast({
                          title: !isLiveEditMode ? "Modo Edição em Tempo Real" : "Modo Visitante",
                          message: !isLiveEditMode ? "Você pode agora editar textos, banners, fotos e produtos diretamente no site!" : "Modo de edição desativado.",
                          type: !isLiveEditMode ? "success" : "info"
                        });
                      } else {
                        setIsLoginOpen(true);
                      }
                    }}
                    className="w-full sm:w-[240px] h-11 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer px-4 rounded-full border border-white/15 bg-black/40 hover:bg-white/10 backdrop-blur-sm shadow-md text-xs sm:text-sm font-black"
                    title="Modo Editor Visual"
                  >
                    <Lock className="w-4 h-4 text-[#FE540B] shrink-0" />
                    <span 
                      className="bg-clip-text text-transparent drop-shadow-sm font-funnel truncate"
                      style={{
                        backgroundImage: `linear-gradient(90deg, ${brandColor || '#FE540B'}, #ff8c00, #22c55e, #32BCAD, #8b5cf6, #ec4899, ${brandColor || '#FE540B'})`,
                        backgroundSize: '300% 300%',
                        animation: 'color-loop 5s ease infinite',
                      }}
                    >
                      {isLiveEditMode ? "Sair do Modo Editor" : "Modo Editor Visual"}
                    </span>
                  </button>
                </div>

                {user && (
                  <button
                    onClick={() => navigate("/")}
                    className="text-xs text-zinc-400 hover:text-white underline cursor-pointer transition-colors mt-1"
                  >
                    Ir para Dashboard Geral do Sistema
                  </button>
                )}
              </div>
            </div>
          </footer>
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
                {(data as any)?.logo_url ? (
                  <img 
                    src={(data as any).logo_url} 
                    alt={(data as any)?.title || "Logo"} 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--gm-primary)] font-black text-2xl uppercase tracking-wider">
                    {(data as any)?.title ? (data as any).title.substring(0, 2) : "GM"}
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-extrabold tracking-tight mb-2 text-white">
              Acesso Autorizado! 🚀
            </h3>
            <p className="text-sm font-semibold opacity-80 mb-6 font-funnel uppercase tracking-wider" style={{ color: "#FE540B" }}>
              {(data as any)?.title || "CardDigital GM"}
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
                <div className={`grid items-stretch ${isMobileView ? 'grid-cols-1 gap-6' : 'grid-cols-1 md:grid-cols-12 gap-6 md:gap-10'}`}>
                  
                  {/* LEFT COLUMN: Image Gallery (Span 5) */}
                  <div 
                    className={`${isMobileView ? '' : 'md:col-span-5 md:pr-8 md:border-r'} flex flex-col justify-start space-y-4 items-center`}
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
                  <div className={`${isMobileView ? '' : 'md:col-span-7 md:pl-6'} flex flex-col justify-between h-full space-y-6`}>
                    
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

                          {/* Right column: Comprar Já */}
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

                        {/* Status da Conta do Cliente no Checkout */}
                        {currentCustomer ? (
                          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2.5 text-xs text-emerald-400">
                            <div className="flex items-center gap-2 min-w-0">
                              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                              <span className="truncate">
                                Conectado como <strong>{currentCustomer.full_name}</strong>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsCustomerDashboardOpen(true)}
                              className="text-[11px] font-bold text-white underline hover:opacity-80 shrink-0 cursor-pointer"
                            >
                              Meus Pedidos
                            </button>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-between gap-2 text-xs text-orange-300">
                            <div className="flex items-center gap-2 min-w-0">
                              <User className="w-4 h-4 shrink-0 text-orange-400" />
                              <span className="text-[11px] sm:text-xs">
                                Já é cliente? <strong>Faça Login</strong> para preencher rápido.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsCustomerAuthModalOpen(true)}
                              className="px-2.5 py-1 rounded-lg bg-orange-500 text-white font-bold text-[11px] shrink-0 hover:bg-orange-600 transition-colors cursor-pointer"
                            >
                              Entrar
                            </button>
                          </div>
                        )}
                        
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
                    <div className="space-y-2.5">
                      <button 
                        type="button"
                        onClick={handleCheckoutDirectPayment}
                        className="w-full flex items-center justify-center p-4 rounded-xl text-white font-black text-sm transition-all shadow-lg hover:brightness-110 active:scale-[0.98] cursor-pointer"
                        style={{ backgroundColor: brandColor }}
                      >
                        <CreditCard className="w-5 h-5 mr-2" />
                        Finalizar & Pagar com Segurança
                      </button>

                      <button 
                        type="button"
                        onClick={handleCheckoutWhatsApp}
                        className="w-full flex items-center justify-center p-3 rounded-xl text-white font-black text-xs sm:text-sm transition-all shadow hover:brightness-110 active:scale-[0.98] cursor-pointer bg-green-600 hover:bg-green-700"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Finalizar e Enviar via WhatsApp
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => setCheckoutStep("cart")}
                        className="w-full py-1.5 text-xs font-bold opacity-60 hover:opacity-100 transition-opacity cursor-pointer text-center"
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

      {/* Seta Descer no Meio da Página: FIXA no rodapé central da tela (oculta quando modal está aberto para não sobrepor formulários) */}
      {!isCartOpen && typeof document !== "undefined" && createPortal(
        <button
          type="button"
          onClick={advanceToNextSection}
          className={`psd-down !fixed !left-0 !right-0 !mx-auto !bottom-5 sm:!bottom-7 !z-[10000030] !bg-transparent !border-none !outline-none !shadow-none !ring-0 focus:!ring-0 focus:!outline-none hover:!bg-transparent hover:!border-none hover:!shadow-none !transform-none hover:!transform-none active:!transform-none ${
            !isCustomerAuthModalOpen && !isCustomerDashboardOpen && (canScrollDown || activeView === "bio" || activeView === "contact" || activeView === "customer")
              ? "opacity-100 pointer-events-auto" 
              : "opacity-0 pointer-events-none !hidden"
          }`}
          style={{
            zIndex: 10000030,
            background: "transparent",
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            boxShadow: "none",
            boxSizing: "border-box",
            position: "fixed",
            left: 0,
            right: 0,
            marginLeft: "auto",
            marginRight: "auto",
            width: "48px",
            height: "48px",
            transform: "none",
            transition: "opacity 0.3s ease",
          }}
          aria-label="Avançar para próxima tela"
        >
          <div className="psd-down-bounce">
            <i />
            <i />
          </div>
        </button>,
        document.body
      )}

      {/* Container Flutuante Inferior Direito: Seta Subir + Botão WhatsApp */}
      {!isCartOpen && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed bottom-5 right-4 sm:bottom-8 sm:right-8 !z-[10000030] flex flex-col items-center gap-2.5 sm:gap-3 pointer-events-none transition-all duration-300"
          style={{ zIndex: 10000030 }}
        >
          {/* Seta Subir Seção: Estilo idêntico à seta do meio, porém voltada para cima (oculta em modais) */}
          <button
            type="button"
            onClick={retreatToPrevSection}
            className={`psd-up transition-all duration-300 ${
              !isCustomerAuthModalOpen && !isCustomerDashboardOpen
                ? "pointer-events-auto opacity-100 !opacity-100"
                : "pointer-events-none opacity-0 !opacity-0 !hidden"
            }`}
            style={{ opacity: !isCustomerAuthModalOpen && !isCustomerDashboardOpen ? 1 : 0, pointerEvents: !isCustomerAuthModalOpen && !isCustomerDashboardOpen ? "auto" : "none", zIndex: 10000030 }}
            title="Subir para o topo"
            aria-label="Subir para seção anterior"
          >
            <div className="psd-up-bounce">
              <i />
              <i />
            </div>
          </button>

          {/* Botão do WhatsApp (Mesmo tamanho exato: 58px no mobile / 68px no desktop) */}
          <button
            type="button"
            onClick={() => {
              if (activeView === "contact" && bio.chat_balloon_enabled !== false && !isMobileView) {
                setIsChatWidgetOpen(true);
              } else {
                const whatsappClean = (bio.whatsapp || bio.phone || "98987505041").replace(/\D/g, "");
                const fullPhone = whatsappClean.startsWith("55") ? whatsappClean : `55${whatsappClean}`;
                const textMsg = bio.chat_balloon_qr_msg || "Olá! Estou vindo do site GM edificação, quero saber mais.";
                window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(textMsg)}`, "_blank");
              }
            }}
            className="w-[56px] h-[56px] sm:w-[68px] sm:h-[68px] rounded-full flex items-center justify-center text-white cursor-pointer shadow-[0_12px_32px_rgba(37,211,102,0.5)] hover:shadow-[0_16px_40px_rgba(37,211,102,0.7)] transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-white/30 pointer-events-auto bg-[#25D366]"
            title="Abrir WhatsApp"
            aria-label="Abrir WhatsApp"
          >
            <img 
              src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20BRANCA/Whatsapp%20branco.svg" 
              alt="WhatsApp" 
              className="w-7 h-7 sm:w-[38px] sm:h-[38px] object-contain pointer-events-none select-none"
            />
          </button>
        </div>,
        document.body
      )}

      {/* Floating Chat Inteligente (only visible on Contact page, desktop version and if enabled) */}
      {activeView === "contact" && bio.chat_balloon_enabled !== false && !isMobileView && (
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
            const effectiveLogo = logo || currentData?.company_logo_url || "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/logo.jpg?t=1790426179060";

            return (
              <AnimatePresence mode="wait">
                {isChatIconVisible && (
                  isChatWidgetOpen ? (
                    /* Modal Caixa de Diálogo Aberta no Meio da Tela com Fundo Translúcido Seguro */
                    <div 
                      key="chat-dialog-modal-wrapper"
                      className={`hidden md:flex ${asPreview && previewMode === 'smartphone' ? 'absolute' : 'fixed'} inset-0 z-[200] items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-sm pointer-events-auto`}
                      onClick={() => setIsChatWidgetOpen(false)}
                    >
                      <motion.div 
                        key="chat-balloon-open"
                        initial={{ opacity: 0, scale: 0.88, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.88, y: 20, transition: { duration: 0.15, ease: "easeInOut" } }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full max-w-[340px] sm:max-w-[380px] h-[480px] sm:h-[520px] max-h-[85vh] rounded-[2.2rem] sm:rounded-[2.6rem] shadow-[0_25px_70px_rgba(0,0,0,0.65)] border border-white/20 flex flex-col justify-between overflow-hidden bg-[#FBF7F4] relative z-10"
                        style={{ fontFamily: "Inter, sans-serif" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header com estilo Join.chat */}
                        <div 
                          className="px-6 py-4.5 sm:px-7 sm:py-5 flex items-center justify-between shadow-sm shrink-0"
                          style={{ 
                            backgroundColor: brandThemeColor,
                            color: bio.chat_balloon_text_color || "#FFFFFF"
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-black tracking-wide">
                              {bio.chat_balloon_title || "Chat CardDigital GM"}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold opacity-90 mt-0.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                              Atendimento Online
                            </span>
                          </div>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsChatWidgetOpen(false);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/15 hover:bg-black/25 transition-all cursor-pointer"
                            style={{ color: bio.chat_balloon_text_color || "#FFFFFF" }}
                            title="Fechar Chat"
                          >
                            <X className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>

                        {/* Conversa & Ações - Altura vertical ampliada e centralizada */}
                        <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between gap-4">
                          {/* Área do Balão de Fala */}
                          <div className="flex items-start gap-3.5 pt-2">
                            {/* Avatar com logo da empresa */}
                            <div className="shrink-0 relative mt-0.5">
                              {effectiveLogo ? (
                                <img 
                                  src={effectiveLogo} 
                                  alt={companyName} 
                                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-white shadow-md" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div 
                                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-white border border-slate-200 text-xs font-black uppercase shadow-sm"
                                  style={{ color: brandThemeColor }}
                                >
                                  {companyName.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>

                            {/* Balão de fala */}
                            <div 
                              className="relative bg-white text-slate-800 p-4 sm:p-5 rounded-[1.3rem] rounded-tl-none shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08)] border border-slate-100/70 text-xs sm:text-sm font-medium leading-relaxed max-w-[220px] sm:max-w-[260px]"
                            >
                              <div className="absolute left-[-5px] top-4 w-2.5 h-2.5 bg-white rotate-45 border-l border-t border-slate-100/70" />
                              <div className="space-y-1.5 text-slate-700 whitespace-pre-wrap">
                                {bio.chat_balloon_text ? (
                                  bio.chat_balloon_text
                                ) : (
                                  <>
                                    <div className="flex items-center gap-1 font-bold text-slate-900 text-sm">
                                      Olá <span className="animate-bounce">👋</span>
                                    </div>
                                    <div className="text-slate-600 font-medium">
                                      Sou Denis, como posso te ajudar hoje?
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Mensagem de canal direto */}
                          <div className="px-3.5 py-2.5 rounded-xl bg-orange-50/80 border border-orange-200/50 text-[11px] text-zinc-600 text-center font-medium">
                            💬 Canal de atendimento oficial com resposta imediata.
                          </div>

                          {/* QR Code opcional em telas maiores */}
                          {bio.chat_balloon_show_qrcode !== false && qrUrl && (
                            <div className="hidden sm:flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-slate-100 shadow-xs">
                              <div className="w-[110px] h-[110px] bg-white p-1 rounded-xl">
                                <img 
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}`}
                                  alt="WhatsApp QR Code"
                                  className="w-full h-full object-contain select-none pointer-events-none"
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-slate-500 mt-1">Escaneie o código com a câmera</span>
                            </div>
                          )}

                          {/* Botão de Ação: Abrir Chat no WhatsApp */}
                          <div className="pt-2">
                            <button 
                              type="button"
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
                              className="w-full py-4 px-6 rounded-full font-black text-xs sm:text-sm flex items-center justify-center gap-2 border-[2px] border-slate-950 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg text-white"
                              style={{ 
                                backgroundColor: brandThemeColor,
                                color: bio.chat_balloon_text_color || "#FFFFFF"
                              }}
                            >
                              <span>{bio.chat_balloon_button_text || "Abrir chat"}</span>
                              <Send className="w-4 h-4 ml-1.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  ) : null
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

      {/* Real-time Live Admin Modals */}
      <HeroEditModal
        isOpen={isHeroModalOpen}
        onClose={() => setIsHeroModalOpen(false)}
        data={bio}
        tenantId={currentData?.tenant_id || userTenantId || "global"}
        onUpdate={handleUpdateHero}
      />

      <LogoModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
        companyName={companyName || ""}
        logoUrl={websiteLogo || ""}
        tenantId={currentData?.tenant_id || userTenantId || "global"}
        onUpdate={handleUpdateLogoAndName}
      />

      <ThemeColorsModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        brandColor={brandColor}
        theme={theme}
        buttonStyle={buttonStyle}
        onUpdate={handleUpdateThemeColors}
      />

      <ContactsModal
        isOpen={isContactsModalOpen}
        onClose={() => setIsContactsModalOpen(false)}
        data={bio}
        onUpdate={handleUpdateContacts}
      />

      <ProductModal
        isOpen={productModalState.isOpen}
        onClose={() => setProductModalState({ isOpen: false, product: null })}
        productToEdit={productModalState.product}
        catalogItems={bio.catalog_items || []}
        tenantId={currentData?.tenant_id || userTenantId || "global"}
        onSaveProduct={handleSaveProductList}
      />

      <PortfolioModal
        isOpen={portfolioModalState.isOpen}
        onClose={() => setPortfolioModalState({ isOpen: false, project: null })}
        projectToEdit={portfolioModalState.project}
        portfolioItems={bio.portfolio_items || []}
        tenantId={currentData?.tenant_id || userTenantId || "global"}
        onSavePortfolio={handleSavePortfolioList}
      />

      <PixEditModal
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
        data={bio}
        onUpdate={(updates) => {
          handleUpdateBioConfig(updates);
        }}
      />

      {/* Real-time Inline Element/Text Editor */}
      <QuickTextEditorModal
        isOpen={quickEditorState.isOpen}
        onClose={() => setQuickEditorState((prev) => ({ ...prev, isOpen: false }))}
        title={quickEditorState.title}
        subtitle={quickEditorState.subtitle}
        elementType={quickEditorState.elementType}
        initialText={quickEditorState.initialText}
        initialFormatting={quickEditorState.initialFormatting}
        onSave={handleQuickEditorSave}
        brandColor={brandColor || "#FE540B"}
      />

      {/* Customer Auth Modal (Login & Cadastro) */}
      <CustomerAuthModal
        isOpen={isCustomerAuthModalOpen}
        onClose={() => setIsCustomerAuthModalOpen(false)}
        onSuccess={(cust) => {
          setCurrentCustomer(cust);
          setIsCustomerAuthModalOpen(false);
          pushToast({ type: "success", title: "Olá!", message: `Bem-vindo(a), ${cust.full_name.split(' ')[0]}!` });
        }}
        brandColor={brandColor || "#FE540B"}
        tenantId={currentData?.tenant_id || userTenantId || "global"}
        companyAddress={bio.address}
        companyAddressUrl={bio.address_url}
        companyWhatsapp={bio.whatsapp || bio.phone || ""}
        companyName={companyName || "GM Edificação"}
        companyEmail={bio.email || submittedEmail || "gmedificacao@gmail.com"}
      />

      {/* Customer Dashboard Modal (Meus Pedidos & Perfil) */}
      {currentCustomer && (
        <CustomerDashboardModal
          isOpen={isCustomerDashboardOpen}
          onClose={() => setIsCustomerDashboardOpen(false)}
          customer={currentCustomer}
          onCustomerUpdated={(updated) => {
            setCurrentCustomer(updated);
          }}
          onLogout={() => {
            setCurrentCustomer(null);
            localStorage.removeItem("gm_admin_authenticated");
            pushToast({ type: "info", title: "Até logo", message: "Você saiu da sua conta de cliente." });
          }}
          brandColor={brandColor || "#FE540B"}
          pixKey={pixKey}
          pixType={pixType}
          cardUrl={cardUrl}
          companyWhatsapp={bio.whatsapp || bio.phone || ""}
          companyName={companyName || "GM Edificação"}
          companyAddress={bio.address}
          companyAddressUrl={bio.address_url}
          companyEmail={bio.email || submittedEmail || "gmedificacao@gmail.com"}
          onOpenAdminOrders={isUserAdmin ? () => setIsAdminHubOpen(true) : undefined}
          isAdmin={isUserAdmin}
        />
      )}

      {/* Modal de Pagamento Seguro Direto (Criado no Checkout do Carrinho) */}
      <OrderPaymentModal
        isOpen={!!activePaymentOrder}
        onClose={() => setActivePaymentOrder(null)}
        order={activePaymentOrder}
        pixKey={pixKey}
        pixType={pixType}
        cardUrl={cardUrl}
        brandColor={brandColor || "#FE540B"}
        companyName={companyName || "GM Edificação"}
        companyWhatsapp={bio.whatsapp || bio.phone || ""}
        onPaymentUpdated={() => {
          // Quando atualizado, fecha o modal ou recarrega dados
        }}
      />

      {/* Modal de Gestão de Pedidos para o Administrador / Lojista */}
      <AdminOrdersModal
        isOpen={isAdminOrdersModalOpen}
        onClose={() => setIsAdminOrdersModalOpen(false)}
        tenantId={currentData?.tenant_id || userTenantId || "global"}
        brandColor={brandColor || "#FE540B"}
        companyName={companyName || "GM Edificação"}
        companyWhatsapp={bio.whatsapp || bio.phone || ""}
      />

      {/* Modal Principal do Administrador (Pedidos em Andamento, Aprovação de Comprovante Pix, Clientes e Gestão da Loja) */}
      <AdminHubModal
        isOpen={isAdminHubOpen}
        onClose={() => setIsAdminHubOpen(false)}
        tenantId={currentData?.tenant_id || userTenantId || "global"}
        brandColor={brandColor || "#FE540B"}
        companyName={companyName || "GM Edificação"}
        companyWhatsapp={bio.whatsapp || bio.phone || ""}
        companyEmail={bio.email || "gmedificacao@gmail.com"}
        pixKey={pixKey}
        pixType={pixType}
        isLiveEditMode={isLiveEditMode}
        onOpenLiveEdit={() => {
          setIsAdminHubOpen(false);
          setIsLiveEditMode(true);
          setPreviewAsVisitor(false);
        }}
        onOpenThemeModal={() => {
          setIsAdminHubOpen(false);
          setIsThemeModalOpen(true);
        }}
        onUpdatePixConfig={(newKey, newType) => {
          setCurrentData((prev: any) => ({
            ...prev,
            pix_key: newKey,
            pix_type: newType,
            bio_config: {
              ...(prev?.bio_config || {}),
              pix_key: newKey,
              pix_type: newType,
            }
          }));
          setHasUnsavedChanges(true);
        }}
      />
      </div>
    </div>
  );
}
