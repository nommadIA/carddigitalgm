import React from "react";
import { useAuth } from "../store/AuthContext";
import { forceSavePushToken } from "../services/pushFCM";

export default function EnablePushButton() {
  const { tenantId, user } = useAuth();
  const [status, setStatus] = React.useState<string>("");

  const onEnable = async () => {
    try {
      if (!tenantId || !user?.id) {
        setStatus("Faça login primeiro.");
        return;
      }

      setStatus("Solicitando permissão...");
      const result = (await forceSavePushToken(tenantId, user.id)) as { ok: boolean; reason?: string };

      if (!result.ok) {
        if (result.reason === "permission_denied") {
          setStatus("Permissão NEGADA. Verifique bloqueio do Chrome.");
        } else if (result.reason === "empty_token") {
          setStatus("Token vazio. Verifique VAPID / SW.");
        } else {
          setStatus("Falha ao salvar. Veja console.");
        }
        return;
      }

      setStatus("✅ Notificações ativadas e token salvo!");
    } catch (e: any) {
      setStatus("Erro: " + (e?.message || String(e)));
    }
  };

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button
        onClick={onEnable}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.18)",
          background: "rgba(255,140,0,.18)",
          color: "#fff",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        🔔 Ativar Notificações
      </button>

      {status ? (
        <span style={{ color: "rgba(255,255,255,.85)", fontSize: 13 }}>{status}</span>
      ) : null}
    </div>
  );
}