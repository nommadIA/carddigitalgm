import React, { useState, useEffect, useRef } from "react";
import { Globe, Instagram, Facebook, Mail, Phone, MapPin, Copy, Box, FileText, Check, MessageCircle, Send, Linkedin, Twitter, Youtube, Link as LinkIcon, Music, Headphones, Github, ShoppingCart, Store, Utensils, ChevronLeft, ChevronRight } from "lucide-react";

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

  const bio = data?.bio_config || {};
  const logo = data?.company_logo_url;
  const companyName = bio.title || data?.company_name || "Perfil";
  const desc = bio.description || "";
  const brandColor = bio.color || data?.brand_primary || "#ff7a00";
  const theme = bio.theme || "dark";

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
    
    return (
        // @ts-ignore
      <Wrapper 
        href={asPreview ? undefined : href}
        target={href ? "_blank" : undefined}
        rel={href ? "noreferrer" : undefined}
        className={`w-full flex items-center p-3 sm:p-4 transition-all rounded-full border group select-none cursor-pointer ${t.cardBg} ${t.cardBgHover} ${t.cardBorder} ${t.cardBorderHover}`}
        onClick={(e: any) => { if (asPreview && href) e.preventDefault(); }}
      >
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${t.iconBg}`} style={{ color: brandColor, backgroundColor: theme === 'dark' ? `${brandColor}20` : undefined }}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="flex-1 text-center pr-10 sm:pr-12">
          <div className={`text-sm sm:text-base font-semibold truncate px-2 ${t.cardTitle}`}>{title}</div>
          {value && title.toLowerCase() !== value.toLowerCase() && (
            <div className={`text-[10px] sm:text-xs font-medium truncate px-2 mt-0.5 ${t.cardSub}`}>{value}</div>
          )}
        </div>
      </Wrapper>
    );
  };

  const pixKey = bio.pix_key || data?.pix_key;
  const pixType = bio.pix_type || data?.pix_type;
  const customLinks = bio.custom_links || [];
  const bgImg = bio.bg_image_url;

  const scrollRef = useRef<HTMLDivElement>(null);

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
    }, 3000);

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
      className={`w-full h-full relative ${t.bg} ${!asPreview ? 'min-h-screen py-10 px-4' : 'overflow-y-auto no-scrollbar py-6 px-4'} selection:bg-orange-500/30 font-sans`}
    >
      {bgImg && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20" 
          style={{ backgroundImage: `url(${bgImg})` }} 
        />
      )}
      <div className="max-w-md mx-auto relative z-10 space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
        
        {/* Profile Header */}
        <div className="text-center space-y-3 pt-2">
          <div className={`w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full overflow-hidden border-[3px] flex items-center justify-center p-1 shadow-2xl relative ${t.iconBg}`} style={{ borderColor: `${brandColor}50` }}>
            {logo ? (
              <img src={logo} alt={companyName} className="w-full h-full object-contain rounded-full" />
            ) : (
              <div className="text-3xl font-bold" style={{ color: brandColor }}>
                {companyName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="px-2">
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${t.textTitle}`}>{companyName}</h1>
            {desc && <p className={`mt-2 text-sm max-w-xs mx-auto leading-relaxed ${t.textDesc}`}>{desc}</p>}
          </div>
        </div>

        {/* Contacts Grid */}
        <div className="flex flex-col gap-3 pt-2">
          {/* Legacy fields display */}
          <ContactCard icon={MessageCircle} title="WhatsApp" value={bio.whatsapp} href={bio.whatsapp ? `https://wa.me/${bio.whatsapp.replace(/\D/g, '')}` : undefined} />
          <ContactCard icon={Phone} title="Telefone" value={bio.phone} href={bio.phone ? `tel:${bio.phone.replace(/\D/g, '')}` : undefined} />
          <ContactCard icon={Mail} title="E-mail" value={bio.email} href={bio.email ? `mailto:${bio.email}` : undefined} />
          <ContactCard icon={Instagram} title="Instagram" value={bio.instagram} href={bio.instagram?.includes('http') ? bio.instagram : `https://instagram.com/${bio.instagram?.replace('@','')}`} />
          <ContactCard icon={Facebook} title="Facebook" value={bio.facebook} href={bio.facebook?.includes('http') ? bio.facebook : `https://facebook.com/${bio.facebook}`} />
          <ContactCard icon={MapPin} title="Endereço" value={bio.address} href={bio.address_url ? bio.address_url : (bio.address ? `https://maps.google.com/?q=${encodeURIComponent(bio.address)}` : undefined)} />
          <ContactCard icon={Box} title="Portfólio" value={bio.portfolio_url ? 'Acessar Portfólio' : ''} href={bio.portfolio_url} />
          <ContactCard icon={FileText} title="Catálogo" value={bio.catalog_url ? 'Ver Catálogo' : ''} href={bio.catalog_url} />
          <ContactCard icon={Globe} title="Website" value={bio.website ? 'Visitar Site' : ''} href={bio.website} />

          {/* Dynamic Links */}
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

        {/* Catalog Section */}
        {bio.catalog_items && bio.catalog_items.length > 0 && (
          <div className="pt-4 space-y-3 relative group/catalog">
            <div className="flex items-center justify-between px-2">
              {bio.catalog_title && <h2 className={`text-lg font-bold ${t.textTitle}`}>{bio.catalog_title}</h2>}
            </div>
            
            <div className="relative">
              {bio.catalog_items.length > 1 && (
                <>
                  <button onClick={(e) => { e.preventDefault(); scrollLeftNav(); }} className={`absolute -left-3 top-1/2 -translate-y-1/2 z-10 p-1.5 sm:p-2 rounded-full shadow-xl bg-black/40 backdrop-blur-md text-white hover:opacity-100 opacity-90 transition-opacity border border-white/20`} style={{ backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)', color: theme === 'dark' ? 'white' : 'black' }}>
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={(e) => { e.preventDefault(); scrollRightNav(); }} className={`absolute -right-3 top-1/2 -translate-y-1/2 z-10 p-1.5 sm:p-2 rounded-full shadow-xl bg-black/40 backdrop-blur-md text-white hover:opacity-100 opacity-90 transition-opacity border border-white/20`} style={{ backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)', color: theme === 'dark' ? 'white' : 'black' }}>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
              <div 
                ref={scrollRef}
                className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 no-scrollbar items-stretch"
              >
              {bio.catalog_items.map((item: any) => (
                <a 
                  key={item.id}
                  href={asPreview ? undefined : (item.url || undefined)}
                  target={item.url ? "_blank" : undefined}
                  rel={item.url ? "noreferrer" : undefined}
                  onClick={(e: any) => { if (asPreview && item.url) e.preventDefault(); }}
                  className={`snap-center shrink-0 w-[80%] max-w-[260px] block overflow-hidden rounded-2xl border transition-all flex flex-col ${t.cardBg} ${t.cardBorder} ${item.url ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'}`}
                >
                  {item.image_url ? (
                    <div className={`w-full aspect-square ${t.iconBg}`}>
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`w-full aspect-square ${t.iconBg} flex items-center justify-center`}>
                      <ShoppingCart className="w-8 h-8 opacity-20 text-slate-400" />
                    </div>
                  )}
                  <div className="p-3 flex flex-col flex-1">
                    <div className={`font-semibold text-sm truncate ${t.cardTitle}`}>{item.name || 'Produto sem nome'}</div>
                    {item.description && <div className={`text-xs mt-1 line-clamp-2 ${t.cardSub}`}>{item.description}</div>}
                    <div className="mt-auto pt-1.5 font-bold text-[13px]" style={{ color: brandColor }}>{item.price}</div>
                  </div>
                </a>
              ))}
              </div>
            </div>
          </div>
        )}

        {/* PIX */}
        {pixKey && (
          <div className={`p-5 sm:p-6 rounded-[2rem] text-center space-y-4 shadow-xl mt-4 relative overflow-hidden group border ${t.cardBg} ${t.cardBorder}`} style={{ backgroundColor: theme === 'dark' ? `${brandColor}10` : undefined }}>
            <div className="absolute top-0 left-0 w-full h-[4px] opacity-80 group-hover:opacity-100 transition-opacity" style={{ background: brandColor }} />
            <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full mb-1 ${t.iconBg}`} style={{ backgroundColor: theme === 'dark' ? `${brandColor}20` : undefined }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: brandColor,
                maskImage: 'url(https://upload.wikimedia.org/wikipedia/commons/5/50/Pix_%28Brazil%29_logo.svg)',
                WebkitMaskImage: 'url(https://upload.wikimedia.org/wikipedia/commons/5/50/Pix_%28Brazil%29_logo.svg)',
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center'
              }} />
            </div>
            <div>
              <h4 className={`font-bold text-lg ${t.cardTitle}`}>Faça um PIX</h4>
              <p className={`text-sm mt-1 ${t.pixSubtitle}`}>Chave {pixType}:</p>
              <p className="font-bold break-all mt-1" style={{ color: brandColor }}>{pixKey}</p>
            </div>
            <button 
              onClick={handleCopyPix}
              className={`w-full flex items-center justify-center p-3 sm:p-4 rounded-xl transition-all font-bold border hover:scale-[1.02] ${t.iconBg}`}
              style={{ color: brandColor, borderColor: `${brandColor}40`, backgroundColor: theme === 'dark' ? `${brandColor}20` : undefined }}
            >
              {copiedPix ? <Check className="w-5 h-5 mr-2" /> : <Copy className="w-5 h-5 mr-2" />}
              {copiedPix ? "Chave copiada!" : "Copiar Chave"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
