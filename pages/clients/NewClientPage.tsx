
import React from "react";
import NewClientModal from "./NewClientModal";

// Since NewClientModal logic is already robust (validation, supabase inserts, responsive styles),
// we reuse it by wrapping it in a container that fits the "Full Page" paradigm requested in Clients.tsx.
// Or effectively, we can just export NewClientModal as default if it handles full screen overlay correctly.
// The current NewClientModal uses a fixed overlay z-9999.
// So simpler approach: Just reuse NewClientModal but ensure it is always "open".

export default function NewClientPage({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  return (
    <NewClientModal
      open={true}
      onClose={onBack}
      onSuccess={onSuccess}
    />
  );
}
