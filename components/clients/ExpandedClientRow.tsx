import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Loader2 } from "lucide-react";
import { CURRENCY_FORMATTER } from "../../constants";

export default function ExpandedClientRow({ clientId }: { clientId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: res } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();
      setData(res);
      setLoading(false);
    }
    load();
  }, [clientId]);

  if (loading) {
    return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-slate-500" /></div>;
  }

  if (!data) return <div className="p-4 text-slate-500">Erro ao carregar detalhes.</div>;

  return (
    <div className="p-4 sm:p-5 barra border-t border-white/10 text-sm shadow-none bg-white/[0.02] backdrop-blur-md">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white/[0.02] backdrop-blur-md p-3 rounded-xl border border-white/10">
          <div className="text-slate-400 text-xs uppercase font-bold tracking-wider">Endereço</div>
          <div className="font-medium text-white/90 mt-1">{data.address || "-"}</div>
        </div>
        <div className="bg-white/[0.02] backdrop-blur-md p-3 rounded-xl border border-white/10">
          <div className="text-slate-400 text-xs uppercase font-bold tracking-wider">CPF / CNPJ</div>
          <div className="font-medium text-white/90 mt-1">{data.cpf_cnpj || "-"}</div>
        </div>
        <div className="bg-white/[0.02] backdrop-blur-md p-3 rounded-xl border border-white/10">
          <div className="text-slate-400 text-xs uppercase font-bold tracking-wider">Cadastrado em</div>
          <div className="font-medium text-white/90 mt-1">
            {data.created_at ? new Date(data.created_at).toLocaleDateString("pt-BR") : "-"}
          </div>
        </div>
      </div>
    </div>
  );
}
