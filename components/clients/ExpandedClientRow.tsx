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
    <div className="p-4 bg-black/20 border-t border-white/5 text-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <div className="text-slate-500 text-xs uppercase font-bold">Endereço</div>
          <div className="font-medium text-white/90">{data.address || "-"}</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs uppercase font-bold">CPF / CNPJ</div>
          <div className="font-medium text-white/90">{data.cpf_cnpj || "-"}</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs uppercase font-bold">Cadastrado em</div>
          <div className="font-medium text-white/90">
            {data.created_at ? new Date(data.created_at).toLocaleDateString("pt-BR") : "-"}
          </div>
        </div>
      </div>
    </div>
  );
}
