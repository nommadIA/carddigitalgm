
import React, { useEffect, useState } from "react";
import NewClientModal from "./NewClientModal";
import { supabase } from "../../lib/supabase";
import { Client } from "../../types";

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

  if (loading) return null; // Or a spinner

  return (
    <NewClientModal
      open={true}
      onClose={onBack}
      onSuccess={onSuccess}
      clientToEdit={client}
    />
  );
}
