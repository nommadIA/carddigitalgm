import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../store/AuthContext";
import { Client } from "../../types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientToEdit?: Client | null;
};

function isMissingColumnError(err: any) {
  const msg = String(err?.message || "");
  return msg.includes("Could not find the") || String(err?.code || "") === "PGRST204";
}

function stripMissingColumn(payload: any, err: any) {
  const msg = String(err?.message || "");
  const m = msg.match(/Could not find the '(.+?)' column/);
  const col = m?.[1];
  if (col && payload && Object.prototype.hasOwnProperty.call(payload, col)) {
    const next = { ...payload };
    delete next[col];
    return next;
  }
  return payload;
}

async function insertClientWithAutoStrip(payload: any) {
  let current = { ...payload };
  for (let i = 0; i < 6; i++) {
    const res = await supabase.from("clients").insert(current).select().single();
    if (!res.error) return res.data;

    if (isMissingColumnError(res.error)) {
      const next = stripMissingColumn(current, res.error);
      if (JSON.stringify(next) === JSON.stringify(current)) throw res.error;
      current = next;
      continue;
    }
    throw res.error;
  }
  throw new Error("Falha ao inserir cliente (schema incompatível).");
}

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

function formatWhatsappBR(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatPhoneBR(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return d;
}
const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(0, 0, 0, 0.8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

const modal: React.CSSProperties = {
  width: 860,
  maxWidth: "100%",
  borderRadius: 22,
  background: "rgba(24, 24, 27, 0.95)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  overflow: "hidden",
  color: "#FFFFFF",
};

const leftAccent: React.CSSProperties = {
  width: 6,
  background: "var(--gm-primary, #FF6900)",
};

const header: React.CSSProperties = {
  padding: "20px 24px 14px 24px",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
};

const title: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 20,
  color: "#FFFFFF",
};

const subtitle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  color: "#94a3b8",
};

const closeBtn: React.CSSProperties = {
  borderRadius: 12,
  padding: "8px 16px",
  background: "rgba(255, 255, 255, 0.08)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  color: "#cbd5e1",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const body: React.CSSProperties = {
  padding: "20px 24px",
};

const card: React.CSSProperties = {
  borderRadius: 18,
  background: "rgba(18, 18, 20, 0.65)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  padding: 20,
};

const label: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.025em",
};

const input: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  padding: "10px 14px",
  background: "rgba(0, 0, 0, 0.4)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  color: "#FFFFFF",
  outline: "none",
  fontSize: 14,
  fontWeight: 500,
};

const hint: React.CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  color: "#64748b",
  fontWeight: 500,
};

const footer: React.CSSProperties = {
  marginTop: 20,
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  paddingTop: 12,
  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
};

const btnGhost: React.CSSProperties = {
  borderRadius: 12,
  padding: "10px 18px",
  fontWeight: 700,
  background: "rgba(255, 255, 255, 0.08)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  color: "#cbd5e1",
  fontSize: 13,
  cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  borderRadius: 12,
  padding: "10px 22px",
  fontWeight: 800,
  background: "var(--gm-primary, #FF6900)",
  border: "none",
  color: "#FFFFFF",
  fontSize: 13,
  cursor: "pointer",
  boxShadow: "0 4px 16px rgba(255, 105, 0, 0.35)",
};

export default function NewClientModal({ open, onClose, onSuccess, clientToEdit }: Props) {
  const { tenantId } = useAuth();

  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!open) return;
    setSaving(false);
    
    if (clientToEdit) {
      setName(clientToEdit.name || "");
      setWhatsapp(formatWhatsappBR(clientToEdit.whatsapp || ""));
      setPhone(formatPhoneBR(clientToEdit.phone || ""));
      setEmail(clientToEdit.email || "");
      setCpfCnpj(clientToEdit.cpf_cnpj || "");
      setAddress(clientToEdit.address || "");
    } else {
      setName("");
      setWhatsapp("");
      setPhone("");
      setEmail("");
      setCpfCnpj("");
      setAddress("");
    }
  }, [open, clientToEdit]);

  const canSave = useMemo(() => {
    const okName = name.trim().length >= 2;
    const okWpp = onlyDigits(whatsapp).length >= 10; // 10 ou 11
    return !!tenantId && okName && okWpp && !saving;
  }, [tenantId, name, whatsapp, saving]);

  async function handleSave() {
    if (!tenantId) return alert("Tenant não encontrado.");
    if (name.trim().length < 2) return alert("Informe o nome do cliente.");
    if (onlyDigits(whatsapp).length < 10) return alert("WhatsApp obrigatório (com DDD).");

    setSaving(true);
    try {
      // ✅ payload “seguro” + auto-strip se colunas não existirem
      const payload: any = {
        tenant_id: tenantId,
        name: name.trim(),
        whatsapp: onlyDigits(whatsapp),
        phone: onlyDigits(phone) || null,
        email: (email || "").trim() || null,
        address: (address || "").trim() || null,
        cpf_cnpj: (cpfCnpj || "").trim() || null,
      };

      if (clientToEdit) {
        const { error } = await supabase
          .from("clients")
          .update(payload)
          .eq("id", clientToEdit.id);
        
        if (error) throw error;
      } else {
        await insertClientWithAutoStrip(payload);
      }

      onSuccess();
    } catch (e: any) {
      console.error("create/update client error:", e);
      alert(`Falha ao salvar cliente.\n${e?.message || "Verifique Supabase."}`);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div style={overlay} onClick={onClose}>
      <div style={{ display: "flex", width: "100%", maxWidth: modal.width as any }} onClick={(e) => e.stopPropagation()}>
        <div style={leftAccent} />
        <div style={modal}>
          <div style={header}>
            <div>
              <div style={title}>{clientToEdit ? "Editar Cliente" : "Novo Cliente"}</div>
              <div style={subtitle}>
                {clientToEdit ? "Atualize os dados abaixo" : "Cadastro rápido • WhatsApp obrigatório • Estilo “glass” premium"}
              </div>
            </div>

            <button
              type="button"
              style={closeBtn}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
            >
              Fechar
            </button>
          </div>

          <div className="p-0 md:p-[0_18px_18px_18px]">
            <div style={card}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div style={label}>Nome</div>
                  <input
                    style={input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João Silva / Empresa X"
                  />
                </div>

                <div>
                  <div style={label}>WhatsApp (obrigatório)</div>
                  <input
                    style={input}
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatWhatsappBR(e.target.value))}
                    placeholder="(98) 9xxxx-xxxx"
                    inputMode="tel"
                  />
                  <div style={hint}>Dica: só números com DDD. (98) 9xxxx-xxxx</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <div style={label}>Telefone (opcional)</div>
                  <input
                    style={input}
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                    placeholder="(98) xxxx-xxxx"
                    inputMode="tel"
                  />
                </div>

                <div>
                  <div style={label}>E-mail (opcional)</div>
                  <input
                    style={input}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: atendimento@empresa.com"
                    inputMode="email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <div style={label}>CPF/CNPJ (opcional)</div>
                  <input
                    style={input}
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    placeholder="Somente se quiser"
                  />
                </div>

                <div>
                  <div style={label}>Endereço (opcional)</div>
                  <input
                    style={input}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, nº, bairro, cidade - UF"
                  />
                </div>
              </div>

              <div style={footer}>
                <button
                  type="button"
                  style={btnGhost}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  style={{ ...btnPrimary, opacity: canSave ? 1 : 0.65, cursor: canSave ? "pointer" : "not-allowed" }}
                  disabled={!canSave}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSave();
                  }}
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>

            <div style={{ height: 6 }} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}