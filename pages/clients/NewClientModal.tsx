import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabase";
import { useAuth, MASTER_TENANT_ID } from "../../store/AuthContext";
import { Client } from "../../types";
import { X, User, Phone, Mail, FileText, MapPin, Check, Loader2 } from "lucide-react";

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

    if (
      res.error?.code === "23503" ||
      String(res.error?.message || "").includes("clients_user_id_fkey") ||
      String(res.error?.message || "").includes("foreign key")
    ) {
      if ("user_id" in current) {
        const next = { ...current };
        delete next.user_id;
        current = next;
        continue;
      }
    }

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
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatPhoneBR(v: string) {
  return formatWhatsappBR(v);
}

async function resolveValidUserId(tenantId: string | null): Promise<string | null> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id) return authData.user.id;
  } catch {}

  if (tenantId) {
    try {
      const { data: membership } = await supabase
        .from("tenant_memberships")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .limit(1)
        .maybeSingle();
      if (membership?.user_id) return membership.user_id;
    } catch {}
  }

  try {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("user_id")
      .not("user_id", "is", null)
      .limit(1)
      .maybeSingle();
    if (clientRow?.user_id) return clientRow.user_id;
  } catch {}

  try {
    const { data: userRow } = await supabase.from("users").select("id").limit(1).maybeSingle();
    if (userRow?.id) return userRow.id;
  } catch {}

  return null;
}

export default function NewClientModal({ open, onClose, onSuccess, clientToEdit }: Props) {
  const { user, tenantId } = useAuth();

  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!open) return;

    if (clientToEdit) {
      setName(clientToEdit.name || "");
      setWhatsapp(formatWhatsappBR(clientToEdit.whatsapp || ""));
      setPhone(formatPhoneBR(clientToEdit.phone || ""));
      setEmail(clientToEdit.email || "");
      setCpfCnpj((clientToEdit as any).cpf_cnpj || "");
      setAddress((clientToEdit as any).address || "");
    } else {
      setName("");
      setWhatsapp("");
      setPhone("");
      setEmail("");
      setCpfCnpj("");
      setAddress("");
    }
  }, [open, clientToEdit]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const canSave = useMemo(() => {
    const okName = name.trim().length >= 2;
    const okWpp = onlyDigits(whatsapp).length >= 10;
    return !!tenantId && okName && okWpp && !saving;
  }, [tenantId, name, whatsapp, saving]);

  async function handleSave() {
    if (!tenantId) return alert("Tenant não encontrado.");
    if (name.trim().length < 2) return alert("Informe o nome do cliente.");
    if (onlyDigits(whatsapp).length < 10) return alert("WhatsApp obrigatório (com DDD).");

    setSaving(true);
    try {
      const activeUserId = await resolveValidUserId(tenantId);

      const payload: any = {
        tenant_id: tenantId,
        name: name.trim(),
        whatsapp: onlyDigits(whatsapp),
        phone: onlyDigits(phone) || null,
        email: (email || "").trim() || null,
        address: (address || "").trim() || null,
        cpf_cnpj: (cpfCnpj || "").trim() || null,
      };

      if (activeUserId) {
        payload.user_id = activeUserId;
      }

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
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl lg:max-w-3xl rounded-lg border border-[#26262A] bg-[#131315] overflow-hidden shadow-2xl relative z-10 p-0 my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#26262A] flex items-start justify-between gap-4 bg-[#0B0B0C] shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight flex items-center gap-2.5">
              <User className="text-[var(--gm-primary)] shrink-0" size={22} />
              {clientToEdit ? "Editar Cliente" : "Novo Cliente"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 leading-relaxed">
              {clientToEdit ? "Atualize os dados do cliente abaixo" : "Cadastro rápido • WhatsApp obrigatório com DDD"}
            </p>
          </div>

          <button
            type="button"
            className="w-8 h-8 rounded-[4px] flex items-center justify-center text-slate-400 hover:text-white border border-[#26262A] bg-[#1B1B1E] hover:border-[#3F3F46] transition-all shrink-0 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Formulário */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User size={13} className="text-[var(--gm-primary)]" />
                Nome <span className="text-[var(--gm-primary)]">*</span>
              </label>
              <input
                className="w-full rounded-[4px] px-4 py-3 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--gm-primary)] transition-all shadow-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Nome completo ou Razão Social"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Phone size={13} className="text-[var(--gm-primary)]" />
                WhatsApp (obrigatório) <span className="text-[var(--gm-primary)]">*</span>
              </label>
              <input
                className="w-full rounded-[4px] px-4 py-3 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--gm-primary)] transition-all shadow-none tabular-nums"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatWhatsappBR(e.target.value))}
                placeholder="(98) 9xxxx-xxxx"
                inputMode="tel"
              />
              <div className="mt-1.5 text-[11px] text-slate-400 font-normal">DDD + número com 9 dígitos. Ex: (98) 98888-7777</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Phone size={13} className="text-slate-400" />
                Telefone fixo / recado (opcional)
              </label>
              <input
                className="w-full rounded-[4px] px-4 py-3 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--gm-primary)] transition-all shadow-none tabular-nums"
                value={phone}
                onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                placeholder="(98) xxxx-xxxx"
                inputMode="tel"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Mail size={13} className="text-slate-400" />
                E-mail (opcional)
              </label>
              <input
                className="w-full rounded-[4px] px-4 py-3 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--gm-primary)] transition-all shadow-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@exemplo.com"
                inputMode="email"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText size={13} className="text-slate-400" />
                CPF / CNPJ (opcional)
              </label>
              <input
                className="w-full rounded-[4px] px-4 py-3 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--gm-primary)] transition-all shadow-none tabular-nums"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                placeholder="000.000.000-00 ou 00.000.000/0001-00"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-400" />
                Endereço completo (opcional)
              </label>
              <input
                className="w-full rounded-[4px] px-4 py-3 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--gm-primary)] transition-all shadow-none"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, bairro, cidade - UF"
              />
            </div>
          </div>

          {/* Rodapé do modal */}
          <div className="pt-4 mt-6 border-t border-[#26262A] flex items-center justify-end gap-3 bg-transparent">
            <button
              type="button"
              className="h-10 px-5 rounded-[6px] text-xs font-bold uppercase tracking-wider text-[#F2F2F3] border border-[#26262A] bg-[#1B1B1E] hover:bg-[#26262A] inline-flex items-center justify-center gap-2 active:scale-[0.96] transition-[background-color,transform] duration-150 cursor-pointer whitespace-nowrap"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
            >
              <X size={14} className="shrink-0" />
              <span>Cancelar</span>
            </button>

            <button
              type="button"
              className="h-10 px-6 rounded-[6px] text-xs font-black uppercase tracking-wider text-[#0B0B0C] bg-[#F65A1A] hover:bg-[#FF7A38] border border-[#F65A1A] inline-flex items-center justify-center gap-2 active:scale-[0.96] transition-[background-color,border-color,transform] duration-150 shadow-[0_1px_3px_rgba(0,0,0,0.3)] disabled:bg-[#18181B] disabled:border-[#26262A] disabled:text-[#52525B] disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              disabled={!canSave}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSave();
              }}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin shrink-0" />
              ) : (
                <Check size={14} strokeWidth={2.8} className="shrink-0" />
              )}
              <span>{saving ? "Salvando..." : (clientToEdit ? "Atualizar Cliente" : "Salvar Cliente")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
