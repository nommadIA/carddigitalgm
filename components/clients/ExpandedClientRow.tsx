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
    <div className="p-4 sm:p-5 bg-[#131315] border-t border-[#26262A] text-sm shadow-none">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-[#0B0B0C] p-3.5 rounded-md border border-[#26262A]">
          <div className="text-[#8B8B92] text-[11px] uppercase font-bold tracking-wider">Endereço</div>
          <div className="font-medium text-[#F2F2F3] mt-1">{data.address || "-"}</div>
        </div>
        <div className="bg-[#0B0B0C] p-3.5 rounded-md border border-[#26262A]">
          <div className="text-[#8B8B92] text-[11px] uppercase font-bold tracking-wider">CPF / CNPJ</div>
          <div className="font-medium text-[#F2F2F3] font-mono tabular-nums mt-1">{data.cpf_cnpj || "-"}</div>
        </div>
        <div className="bg-[#0B0B0C] p-3.5 rounded-md border border-[#26262A]">
          <div className="text-[#8B8B92] text-[11px] uppercase font-bold tracking-wider">Cadastrado em</div>
          <div className="font-medium text-[#F2F2F3] tabular-nums mt-1">
            {data.created_at ? new Date(data.created_at).toLocaleDateString("pt-BR") : "-"}
          </div>
        </div>
      </div>
    </div>
  );
}
