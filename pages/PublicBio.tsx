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
  const [loading, setLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!tenantId) return;
      setLoading(true);
      setErrorDetails(null);

      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
        let fetchedData = null;

        if (isUUID) {
          const { data, error } = await supabase
            .from("app_settings")
            .select("company_name, company_logo_url, pix_key, pix_type, bio_config, brand_primary, tenant_id")
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
            .select("company_name, company_logo_url, pix_key, pix_type, bio_config, brand_primary, tenant_id");

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
          setData(fetchedData);
          if (fetchedData.brand_primary) {
            document.documentElement.style.setProperty("--primary", fetchedData.brand_primary);
          }
        }
      } catch (err: any) {
        console.error("Falha ao recuperar a bio:", err);
        setErrorDetails(err.message || String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0c] text-slate-400 gap-3">
        <div className="w-10 h-10 rounded-full border-t-2 border-orange-500 animate-spin" />
        <span className="text-sm font-medium tracking-wide">Carregando CardDigital GM...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0c] text-white p-6 relative overflow-hidden">
        {/* Decorative ambient spots */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-md w-full bg-[#121215] border border-white/5 rounded-[2rem] p-6 text-center space-y-6 shadow-2xl relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/10 text-[#ff7a00]">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Página não encontrada</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Não conseguimos encontrar as configurações públicas correspondentes a este link.
            </p>
          </div>

          {/* Help instructions for the administrator (Expandable) */}
          <details className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 text-left cursor-pointer group transition-all duration-300 overflow-hidden">
            <summary className="text-xs font-bold uppercase tracking-wider text-orange-400 select-none outline-none list-none flex items-center justify-between">
              <span>Suporte e Diagnóstico Técnico</span>
              <span className="text-[10px] text-orange-500 group-open:rotate-180 transition-transform duration-200">▼</span>
            </summary>
            
            <div className="mt-3 space-y-3 pt-3 border-t border-orange-500/10 cursor-default" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs text-slate-300 leading-relaxed">
                O link público requer que as políticas de acesso do Supabase (RLS) do seu projeto permitam leitura pública (SELECT) para a tabela <code className="bg-black/40 text-orange-300 px-1 py-0.5 rounded">app_settings</code>. 
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

  return <BioRenderer data={data} asPreview={false} />;
}
