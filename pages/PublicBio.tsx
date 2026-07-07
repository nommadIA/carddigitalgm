import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import BioRenderer from "../components/bio/BioRenderer";
import { Sparkles, ArrowRight } from "lucide-react";

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
  const { tenantId } = useParams();
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
            .select("company_name, company_logo_url, pix_key, pix_type, bio_config, brand_primary, tenant_id, button_style")
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
            .select("company_name, company_logo_url, pix_key, pix_type, bio_config, brand_primary, tenant_id, button_style");

          if (error) {
            console.error("Erro RLS/Supabase ao listar:", error);
            setErrorDetails(error.message);
          } else if (allSettings) {
            // Sort to prioritize settings with real tenant_id first, and with richer bio_config
            const sortedSettings = [...allSettings].sort((a, b) => {
              // Row with non-null tenant_id is better
              const aHasTenant = a.tenant_id ? 1 : 0;
              const bHasTenant = b.tenant_id ? 1 : 0;
              if (aHasTenant !== bHasTenant) return bHasTenant - aHasTenant;

              // Row with bio_config is better
              const aHasBio = (a.bio_config && Object.keys(a.bio_config).length > 0) ? 1 : 0;
              const bHasBio = (b.bio_config && Object.keys(b.bio_config).length > 0) ? 1 : 0;
              if (aHasBio !== bHasBio) return bHasBio - aHasBio;

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

        if (fetchedData) {
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

    // Set a guaranteed cinematic timer of 2.5 seconds for the single-run logo animation to play fully
    const introTimer = setTimeout(() => {
      timerDone = true;
      checkCompletion();
    }, 2500);

    function checkCompletion() {
      if (apiDone && timerDone) {
        setData(fetchedDataResult);
        setApiLoading(false);
        // Start the elegant fade-out transition of the overlay
        setIntroExiting(true);
        // Fully remove the splash screen overlay from the DOM after transition complete (500ms)
        setTimeout(() => {
          setIntroFinished(true);
        }, 500);
      }
    }

    load();

    return () => clearTimeout(introTimer);
  }, [tenantId]);

  // If loading is finished but no data found, display the Page Not Found error layout
  if (!apiLoading && !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0c] text-white p-6 relative overflow-hidden animate-[gm-fade-in_0.5s_ease-out_forwards]">
        {/* Decorative ambient spots */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#32BCAD]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#32BCAD]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-md w-full bg-[#121215] border border-white/5 rounded-[2rem] p-6 text-center space-y-6 shadow-2xl relative z-10">
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
          <details className="bg-[#32BCAD]/5 border border-[#32BCAD]/20 rounded-2xl p-4 text-left cursor-pointer group transition-all duration-300 overflow-hidden">
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
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050507] transition-opacity duration-500 ease-in-out ${
            introExiting ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
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
