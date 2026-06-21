import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import BioRenderer from "../components/bio/BioRenderer";

export default function PublicBio() {
  const { tenantId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!tenantId) return;
      const { data } = await supabase
        .from("app_settings")
        .select("company_name, company_logo_url, pix_key, pix_type, bio_config, brand_primary")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (data) {
        setData(data);
        if (data.brand_primary) {
          document.documentElement.style.setProperty("--primary", data.brand_primary);
        }
      }
      setLoading(false);
    }
    load();
  }, [tenantId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] text-slate-400">Carregando...</div>;
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] text-slate-400">Página não encontrada</div>;
  }

  return <BioRenderer data={data} asPreview={false} />;
}
