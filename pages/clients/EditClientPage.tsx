
import React, { useEffect, useState } from "react";
import NewClientModal from "./NewClientModal";
import { supabase } from "../../lib/supabase";
import { Client } from "../../types";
import { Loader2 } from "lucide-react";

export default function EditClientPage({ clientId, onBack, onSuccess }: { clientId: string; onBack: () => void; onSuccess: () => void }) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("clients").select("*").eq("id", clientId).single()
      .then(({ data }) => {
        if (data) setClient(data as Client);
        setLoading(false);
      });
  }, [clientId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm">
        <div className="p-6 rounded-lg border border-[#26262A] flex items-center gap-3 shadow-2xl bg-[#131315]">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--gm-primary)]" />
          <span className="text-white text-sm font-semibold">Carregando cliente...</span>
        </div>
      </div>
    );
  }

  return (
    <NewClientModal
      open={true}
      onClose={onBack}
      onSuccess={onSuccess}
      clientToEdit={client}
    />
  );
}
