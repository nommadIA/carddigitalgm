import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import BioRenderer from "../components/bio/BioRenderer";
import { Sparkles, ArrowRight } from "lucide-react";
import { DEFAULT_GM_BIO_CONFIG } from "../lib/settings";

// Helper function to sanitize name into a URL-friendly slug
function sanitizeSlug(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents/diacritics
    .replace(/[^a-z0-9]/g, "-")      // replace spaces/special chars with hyphens
    .replace(/-+/g, "-")             // collapse multiple hyphens
    .replace(/^-|-$/g, "");          // trim trailing hyphens
}

export default function PublicBio() {
  const { tenantId: routeTenantId } = useParams();

  // Custom subdomain detection logic
  const getSubdomainTenantId = () => {
    const hostname = window.location.hostname;
    
    // Ignore common system/development hostnames
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.includes(".run.app") || // AI Studio previews
      hostname === "carddigitalgmapp.netlify.app" ||
      hostname === "carddigitalgm.netlify.app"
    ) {
      return null;
    }

    // If it's a Netlify subdomain (e.g., gmedificacao.netlify.app)
    if (hostname.endsWith(".netlify.app")) {
      const subdomain = hostname.split(".")[0];
      return subdomain;
    }

    // For custom domains (e.g., gmedificacao.com, www.gmedificacao.com, or gmedificacao.carddigitalgm.com.br)
    let cleanHost = hostname;
    if (cleanHost.startsWith("www.")) {
      cleanHost = cleanHost.slice(4);
    }

    const parts = cleanHost.split(".");
    if (parts.length > 0) {
      return parts[0];
    }

    return null;
  };

  // Fallback to extracting the tenantId from the first segment of the pathname
  const getPathTenantId = () => {
    const segment = window.location.pathname.split('/').filter(Boolean)[0];
    if (segment) {
      const reserved = [
        'pix', 'login', 'register', 'bio', 'auth', 'update-password', 
        'budgets', 'clients', 'expenses', 'market', 'notes', 'financial', 
        'minha-bio', 'configuracoes', 'dashboard'
      ];
      if (!reserved.includes(segment.toLowerCase())) {
        return segment;
      }
    }
    return null;
  };

  const tenantId = routeTenantId || getSubdomainTenantId() || getPathTenantId();
  const [data, setData] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [introExiting, setIntroExiting] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    let apiDone = false;
    let timerDone = false;
    let fetchedDataResult: any = null;

    async function load() {
      if (!tenantId) return;
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
        let fetchedData = null;

        if (isUUID) {
          const { data, error } = await supabase
            .from("app_settings")
            .select("*")
            .eq("tenant_id", tenantId)
            .maybeSingle();

          if (error) {
            console.error("Erro RLS/Supabase:", error);
            setErrorDetails(error.message);
          } else {
            fetchedData = data;
          }
        } else {
          // Look up by slug: carddigitalgm-[name], resolving in a hyphen-insensitive way
          const cleanParam = tenantId.toLowerCase().replace(/^carddigitalgm-/, "").replace(/-/g, "");

          const { data: allSettings, error } = await supabase
            .from("app_settings")
            .select("*");

          if (error) {
            console.error("Erro RLS/Supabase ao listar:", error);
            setErrorDetails(error.message);
          } else if (allSettings) {
            // Exclude obsolete duplicate row and sort to prioritize active settings with logo/avatar first
            const validSettings = allSettings.filter(s => s.id !== "19609c6b-85a3-4fb1-a40a-18250554fc62" && s.tenant_id !== "d79bb193-0927-4b56-bcba-83e2b2bef9c6");
            const sortedSettings = [...validSettings].sort((a, b) => {
              // Row with registered logo or avatar is highest priority
              const aHasLogo = (a.company_logo_url || a.avatar_url) ? 1 : 0;
              const bHasLogo = (b.company_logo_url || b.avatar_url) ? 1 : 0;
              if (aHasLogo !== bHasLogo) return bHasLogo - aHasLogo;

              // Row with bio_config is next
              const aHasBio = (a.bio_config && Object.keys(a.bio_config).length > 0) ? 1 : 0;
              const bHasBio = (b.bio_config && Object.keys(b.bio_config).length > 0) ? 1 : 0;
              if (aHasBio !== bHasBio) return bHasBio - aHasBio;

              // Row with non-null tenant_id is next
              const aHasTenant = a.tenant_id ? 1 : 0;
              const bHasTenant = b.tenant_id ? 1 : 0;
              if (aHasTenant !== bHasTenant) return bHasTenant - aHasTenant;

              return 0;
            });

            fetchedData = sortedSettings.find(s => {
              const compSlug = sanitizeSlug(s.company_name).replace(/-/g, "");
              const bioTitleSlug = s.bio_config?.title ? sanitizeSlug(s.bio_config.title).replace(/-/g, "") : "";
              const resolvedTitleSlug = sanitizeSlug(s.bio_config?.title || s.company_name || "").replace(/-/g, "");
              return compSlug === cleanParam || bioTitleSlug === cleanParam || resolvedTitleSlug === cleanParam;
            });
          }
        }

        // Se for GM edificação ou se tenantId tiver "gm", assegura fallback completo restaurado
        const isGM = !tenantId || tenantId.toLowerCase().includes("gm") || (fetchedData?.company_name || "").toLowerCase().includes("gm");

        if (!fetchedData && isGM) {
          fetchedData = {
            company_name: "GM edificação",
            brand_primary: "#FE540B",
            brand_accent: "#FF7A38",
            brand_bg: "#0B0B0C",
            company_logo_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/logo.jpg?t=1790426179060",
            website_logo_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/logo_1790345925228_lq174s.svg",
            app_background_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/background_1787217210889.jpg?t=1787217210889",
            mobile_app_background_url: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/background_1787213992954.webp?t=1787213992954",
            pix_key: "carddigitalgm@gmail.com",
            pix_type: "CNPJ",
            bio_config: DEFAULT_GM_BIO_CONFIG,
            button_style: "solid",
            tenant_id: "6f4ee596-eb5e-415f-9189-d571ad85ed95"
          };
        }

        if (fetchedData) {
          const rawBio = fetchedData.bio_config || {};
          const fallbackBio = isGM ? DEFAULT_GM_BIO_CONFIG : {};

          fetchedData.bio_config = {
            ...fallbackBio,
            ...rawBio,
            title: rawBio.title || (isGM ? DEFAULT_GM_BIO_CONFIG.title : (fetchedData.company_name || "")),
            title_mobile: rawBio.title_mobile || rawBio.title || (isGM ? DEFAULT_GM_BIO_CONFIG.title_mobile : ""),
            title_font: rawBio.title_font || (isGM ? DEFAULT_GM_BIO_CONFIG.title_font : "syne"),
            title_font_mobile: rawBio.title_font_mobile || rawBio.title_font || (isGM ? DEFAULT_GM_BIO_CONFIG.title_font_mobile : "syne"),
            title_size: rawBio.title_size || (isGM ? DEFAULT_GM_BIO_CONFIG.title_size : "36 pt"),
            title_size_mobile: rawBio.title_size_mobile || rawBio.title_size || (isGM ? DEFAULT_GM_BIO_CONFIG.title_size_mobile : "26 pt"),
            title_color: rawBio.title_color || (isGM ? DEFAULT_GM_BIO_CONFIG.title_color : "#FFFFFF"),
            hero_title: rawBio.hero_title || rawBio.title || (isGM ? DEFAULT_GM_BIO_CONFIG.hero_title : ""),
            hero_title_mobile: rawBio.hero_title_mobile || rawBio.hero_title || rawBio.title_mobile || rawBio.title || (isGM ? DEFAULT_GM_BIO_CONFIG.hero_title_mobile : ""),
            description: rawBio.description || (isGM ? DEFAULT_GM_BIO_CONFIG.description : ""),
            description_mobile: rawBio.description_mobile || rawBio.description || (isGM ? DEFAULT_GM_BIO_CONFIG.description_mobile : ""),
            description_font: rawBio.description_font || (isGM ? DEFAULT_GM_BIO_CONFIG.description_font : "syne"),
            description_font_mobile: rawBio.description_font_mobile || rawBio.description_font || (isGM ? DEFAULT_GM_BIO_CONFIG.description_font_mobile : "syne"),
            description_size: rawBio.description_size || (isGM ? DEFAULT_GM_BIO_CONFIG.description_size : "18 pt"),
            description_size_mobile: rawBio.description_size_mobile || rawBio.description_size || (isGM ? DEFAULT_GM_BIO_CONFIG.description_size_mobile : "16 pt"),
            description_bold: rawBio.description_bold !== undefined ? rawBio.description_bold : (isGM ? DEFAULT_GM_BIO_CONFIG.description_bold : true),
            description_bold_mobile: rawBio.description_bold_mobile !== undefined ? rawBio.description_bold_mobile : (isGM ? DEFAULT_GM_BIO_CONFIG.description_bold_mobile : true),
            description_color: rawBio.description_color || (isGM ? DEFAULT_GM_BIO_CONFIG.description_color : "#E4E4E7"),
            show_banners: isGM ? true : (rawBio.show_banners !== undefined ? rawBio.show_banners : true),
            banner_img_url_1: rawBio.banner_img_url_1 || (isGM ? DEFAULT_GM_BIO_CONFIG.banner_img_url_1 : ""),
            mobile_banner_img_url_1: rawBio.mobile_banner_img_url_1 || (isGM ? DEFAULT_GM_BIO_CONFIG.mobile_banner_img_url_1 : ""),
            contact_banner_img_url: rawBio.contact_banner_img_url || (isGM ? DEFAULT_GM_BIO_CONFIG.contact_banner_img_url : ""),
            about_banner_url: rawBio.about_banner_url || (isGM ? DEFAULT_GM_BIO_CONFIG.about_banner_url : ""),
            website_logo_url: rawBio.website_logo_url || fetchedData.website_logo_url || (isGM ? DEFAULT_GM_BIO_CONFIG.website_logo_url : ""),
            logo_url: rawBio.logo_url || (isGM ? DEFAULT_GM_BIO_CONFIG.logo_url : ""),
            show_about: rawBio.show_about !== undefined ? rawBio.show_about : true,
            about_title: rawBio.about_title || (isGM ? DEFAULT_GM_BIO_CONFIG.about_title : "SOBRE A GM EDIFICAÇÃO"),
            about_description: rawBio.about_description || (isGM ? DEFAULT_GM_BIO_CONFIG.about_description : ""),
            about_highlight: rawBio.about_highlight || (isGM ? DEFAULT_GM_BIO_CONFIG.about_highlight : ""),
            about_btn_text: rawBio.about_btn_text || (isGM ? DEFAULT_GM_BIO_CONFIG.about_btn_text : "Fale Conosco"),
            about_btn_link: rawBio.about_btn_link || (isGM ? DEFAULT_GM_BIO_CONFIG.about_btn_link : "https://wa.me/5598988402049"),
            about_title_font: rawBio.about_title_font || (isGM ? DEFAULT_GM_BIO_CONFIG.about_title_font : "funnel"),
            about_title_size: rawBio.about_title_size || (isGM ? DEFAULT_GM_BIO_CONFIG.about_title_size : "30 pt"),
            about_title_bold: rawBio.about_title_bold !== undefined ? rawBio.about_title_bold : true,
            about_desc_font: rawBio.about_desc_font || (isGM ? DEFAULT_GM_BIO_CONFIG.about_desc_font : "ui"),
            about_desc_size: rawBio.about_desc_size || (isGM ? DEFAULT_GM_BIO_CONFIG.about_desc_size : "16 pt"),
            about_highlight_font: rawBio.about_highlight_font || (isGM ? DEFAULT_GM_BIO_CONFIG.about_highlight_font : "ui"),
            about_highlight_size: rawBio.about_highlight_size || (isGM ? DEFAULT_GM_BIO_CONFIG.about_highlight_size : "16 pt"),
            about_highlight_bold: rawBio.about_highlight_bold !== undefined ? rawBio.about_highlight_bold : true,
            button_style: rawBio.button_style || (isGM ? DEFAULT_GM_BIO_CONFIG.button_style : "solid"),
            button_bg: rawBio.button_bg || (isGM ? DEFAULT_GM_BIO_CONFIG.button_bg : "#FE540B"),
            button_border: rawBio.button_border || (isGM ? DEFAULT_GM_BIO_CONFIG.button_border : "#FE540B"),
            button_text: rawBio.button_text || (isGM ? DEFAULT_GM_BIO_CONFIG.button_text : "#FFFFFF"),
            button_icon: rawBio.button_icon || (isGM ? DEFAULT_GM_BIO_CONFIG.button_icon : "#FFFFFF"),
            custom_links: (rawBio.custom_links && rawBio.custom_links.length > 0) ? rawBio.custom_links : (isGM ? DEFAULT_GM_BIO_CONFIG.custom_links : []),
            portfolio_items: (rawBio.portfolio_items && rawBio.portfolio_items.length > 0) ? rawBio.portfolio_items : (isGM ? DEFAULT_GM_BIO_CONFIG.portfolio_items : []),
            portfolio_title: rawBio.portfolio_title || (isGM ? DEFAULT_GM_BIO_CONFIG.portfolio_title : "Portfólio"),
            whatsapp: rawBio.whatsapp || (isGM ? DEFAULT_GM_BIO_CONFIG.whatsapp : ""),
            instagram: rawBio.instagram || (isGM ? DEFAULT_GM_BIO_CONFIG.instagram : ""),
            website: rawBio.website || (isGM ? DEFAULT_GM_BIO_CONFIG.website : ""),
            email: rawBio.email || (isGM ? DEFAULT_GM_BIO_CONFIG.email : ""),
            address: rawBio.address || (isGM ? DEFAULT_GM_BIO_CONFIG.address : ""),
            pix_key: rawBio.pix_key || (isGM ? DEFAULT_GM_BIO_CONFIG.pix_key : ""),
            pix_type: rawBio.pix_type || (isGM ? DEFAULT_GM_BIO_CONFIG.pix_type : "CNPJ"),
            chat_balloon_enabled: rawBio.chat_balloon_enabled !== undefined ? rawBio.chat_balloon_enabled : true,
            chat_balloon_show_qrcode: rawBio.chat_balloon_show_qrcode !== undefined ? rawBio.chat_balloon_show_qrcode : true,
            chat_balloon_qr_link: rawBio.chat_balloon_qr_link || (isGM ? DEFAULT_GM_BIO_CONFIG.chat_balloon_qr_link : ""),
            chat_balloon_qr_msg: rawBio.chat_balloon_qr_msg || (isGM ? DEFAULT_GM_BIO_CONFIG.chat_balloon_qr_msg : ""),
            chat_balloon_bg_color: rawBio.chat_balloon_bg_color || (isGM ? DEFAULT_GM_BIO_CONFIG.chat_balloon_bg_color : "#FE540B"),
            chat_balloon_text_color: rawBio.chat_balloon_text_color || (isGM ? DEFAULT_GM_BIO_CONFIG.chat_balloon_text_color : "#FFFFFF"),
            chat_balloon_text: rawBio.chat_balloon_text || (isGM ? DEFAULT_GM_BIO_CONFIG.chat_balloon_text : ""),
            chat_balloon_button_text: rawBio.chat_balloon_button_text || (isGM ? DEFAULT_GM_BIO_CONFIG.chat_balloon_button_text : "Abrir chat"),
          };

          if (!fetchedData.website_logo_url && isGM) {
            fetchedData.website_logo_url = DEFAULT_GM_BIO_CONFIG.website_logo_url;
          }
          if (!fetchedData.company_logo_url && fetchedData.avatar_url) {
            fetchedData.company_logo_url = fetchedData.avatar_url;
          }
          if (isGM && !fetchedData.company_logo_url) {
            fetchedData.company_logo_url = "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/logo.jpg?t=1790426179060";
          }
          fetchedDataResult = fetchedData;
          if (fetchedData.brand_primary) {
            document.documentElement.style.setProperty("--primary", fetchedData.brand_primary);
          }
        }
      } catch (err: any) {
        console.error("Falha ao recuperar a bio:", err);
        setErrorDetails(err.message || String(err));
      } finally {
        apiDone = true;
        checkCompletion();
      }
    }

    // Arranque ultrarrápido (650ms) mantendo a suave e elegante animação de transição
    const introTimer = setTimeout(() => {
      timerDone = true;
      checkCompletion();
    }, 650);

    function checkCompletion() {
      if (apiDone && timerDone) {
        setData(fetchedDataResult);
        setApiLoading(false);
        // Transição suave de fade-out do splash overlay
        setIntroExiting(true);
        setTimeout(() => {
          setIntroFinished(true);
        }, 350);
      }
    }

    load();

    return () => clearTimeout(introTimer);
  }, [tenantId]);

  // If loading is finished but no data found, display the Page Not Found error layout
  if (!apiLoading && !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0c] text-white p-6 relative overflow-y-auto animate-[gm-fade-in_0.5s_ease-out_forwards]">
        {/* Decorative ambient spots */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#32BCAD]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#32BCAD]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-md w-full fora apple-glass-card border border-white/15 rounded-[2rem] p-6 text-center space-y-6 shadow-2xl backdrop-blur-2xl relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#32BCAD]/10 text-[#32BCAD]">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Página não encontrada</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Não conseguimos encontrar as configurações públicas correspondentes a este link.
            </p>
          </div>

          {/* Help instructions for the administrator (Expandable) */}
          <details className="bg-[#32BCAD]/5 border border-[#32BCAD]/20 rounded-lg p-4 text-left cursor-pointer group transition-all duration-300 overflow-hidden">
            <summary className="text-xs font-bold uppercase tracking-wider text-[#32BCAD] select-none outline-none list-none flex items-center justify-between">
              <span>Suporte e Diagnóstico Técnico</span>
              <span className="text-[10px] text-[#32BCAD] group-open:rotate-180 transition-transform duration-200">▼</span>
            </summary>
            
            <div className="mt-3 space-y-3 pt-3 border-t border-[#32BCAD]/10 cursor-default" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs text-slate-300 leading-relaxed">
                O link público requer que as políticas de acesso do Supabase (RLS) do seu projeto permitam leitura pública (SELECT) para a tabela <code className="bg-black/40 text-[#32BCAD] px-1 py-0.5 rounded">app_settings</code>. 
              </p>
              <div className="text-xs text-slate-400 space-y-1">
                <span className="block font-medium">Como resolver no Painel do Supabase:</span>
                <ol className="list-decimal pl-4 space-y-1 mt-1 text-slate-300">
                  <li>Vá no menu <strong className="text-white">SQL Editor</strong> do seu Supabase.</li>
                  <li>Cole e execute o trecho abaixo para liberar o acesso:</li>
                </ol>
              </div>
              <pre className="bg-black/60 p-3 rounded-lg text-[10px] text-green-400 overflow-x-auto font-mono select-all">
drop policy if exists "settings_select" on public.app_settings;

create policy "settings_select" on public.app_settings
  for select using (true);
              </pre>
            </div>
          </details>

          <div className="text-[10px] text-slate-500 font-mono">
            {errorDetails ? `Log do Sistema: ${errorDetails}` : `Link buscado: ${tenantId}`}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Global CSS style block that is always mounted to ensure styles never disappear when overlay unmounts */}
      <style>{`
        @keyframes gm-draw-reveal {
          0% {
            clip-path: inset(0 100% 0 0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          45% {
            clip-path: inset(0 0 0 0);
            opacity: 1;
          }
          75% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes gm-solid-fade {
          0%, 40% {
            opacity: 0;
          }
          60%, 75% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes gm-fade-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Render actual Bio component directly to avoid wrapping layout issues */}
      {data && <BioRenderer data={data} asPreview={false} />}
  

      {/* Cinematic Splash Overlay containing only the animated logo */}
      {!introFinished && (
        <div 
          data-website-root="true"
          className={`gm-website-fullscreen site-full-viewport gm-website-viewport gm-site-fullscreen fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050507] transition-opacity duration-500 ease-in-out ${
            introExiting ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
          style={{
            position: 'fixed',
            inset: 0,
            margin: 0,
            padding: 0,
            border: 0,
            borderRadius: 0,
            boxShadow: 'none'
          }}
        >
          {/* Center Logo Area - Increased size slightly */}
          <div className="relative w-56 h-56 flex items-center justify-center select-none">
            {/* Traced Logo (Trim Path Draw effect) */}
            <img 
              src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/sign/Logo%20GM/marca%20GM%20SVG%20tracado.svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NDdiYWI0ZC1iZTIwLTRhNDItYWY4Ny0zMGRmNTMwNzU0YjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2dvIEdNL21hcmNhIEdNIFNWRyB0cmFjYWRvLnN2ZyIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3ODI0MDIxNTIsImV4cCI6MzMzMTg0MDIxNTJ9.bhVqyQnf_8qjJ2XZir_Szwk-MWCSulVeqnCJ0ZMt9Gw"
              alt="GM Traced Draw"
              className="absolute w-44 h-44 z-10"
              style={{
                animation: 'gm-draw-reveal 2.5s cubic-bezier(0.25, 1, 0.5, 1) forwards',
              }}
            />

            {/* Solid Logo (Fill effect) */}
            <img 
              src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/sign/Logo%20GM/marca%20GM%20SVG%20solido.svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NDdiYWI0ZC1iZTIwLTRhNDItYWY4Ny0zMGRmNTMwNzU0YjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2dvIEdNL21hcmNhIEdNIFNWRyBzb2xpZG8uc3ZnIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4MjQwMjEzNSwiZXhwIjozMzMxODQwMjEzNX0.eNOkFVBpwHIymayUxliixXaD5k3YQCKV-BzZ81QMNuw"
              alt="GM Solid"
              className="absolute w-44 h-44 z-20"
              style={{
                animation: 'gm-solid-fade 2.5s cubic-bezier(0.25, 1, 0.5, 1) forwards',
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
