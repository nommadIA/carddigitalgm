
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { Page } from "../components/ui/Page";
import { Card } from "../components/ui/Card";
import NewClientPage from "./clients/NewClientPage";
import EditClientPage from "./clients/EditClientPage";
import { softDelete as softDeleteApi, restore as restoreApi } from "../lib/trash";
import { Plus, Pencil, Trash2, Copy, ShieldAlert, Mail, RotateCcw, ChevronDown, ChevronUp, User } from "lucide-react";
import { WhatsAppIcon } from "../components/ui/WhatsAppIcon";
import { useAuth } from "../store/AuthContext";
import { openWhatsapp } from "../services/whatsApp";
import ExpandedClientRow from "../components/clients/ExpandedClientRow";

type ClientRow = {
  id: string;
  tenant_id: string;
  name: string;
  whatsapp?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  cpf_cnpj?: string | null;
  deleted_at?: string | null;
  created_at?: string | null;
};

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function fmtPhoneBR(raw?: string | null) {
  const d = onlyDigits(raw || "");
  if (!d) return "";
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return raw || "";
}

function initialFromName(name: string) {
  const t = (name || "").trim();
  return (t[0] || "?").toUpperCase();
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

function openWhatsApp(phoneDigits: string) {
  const d = onlyDigits(phoneDigits);
  if (!d) return;
  const normalized = d.startsWith("55") ? d : `55${d}`;
  openWhatsapp(normalized, "");
}

// ✅ hook simples para responsivo (sem depender de CSS externo)
function useIsMobile(breakpoint = 860) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

export default function Clients() {
  const { tenantId } = useAuth();
  const isMobile = useIsMobile(860);

  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<"ATIVOS" | "LIXEIRA">("ATIVOS");
  const [q, setQ] = useState("");

  const [openNewPage, setOpenNewPage] = useState(false);
  const [editPageId, setEditPageId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  // Hard delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1700);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("clients-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function load() {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRows((data || []) as ClientRow[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = tab === "LIXEIRA" ? rows.filter((r) => !!r.deleted_at) : rows.filter((r) => !r.deleted_at);
    
    let result = base;
    if (needle) {
      result = base.filter((r) => {
        const blob = [r.name, r.whatsapp, r.phone, r.email, r.address, r.cpf_cnpj]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(needle);
      });
    }
    
    // Sort alphabetically by name
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, tab, q]);

  async function softDelete(id: string) {
    try {
      await softDeleteApi("clients", id);
      setToast("Movido para lixeira");
      load();
    } catch (e: any) {
      alert(e?.message || "Erro ao excluir.");
    }
  }

  async function restore(id: string) {
    try {
      await restoreApi("clients", id);
      load();
    } catch (e: any) {
      alert(e?.message || "Erro ao restaurar.");
    }
  }

  const confirmHardDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  async function hardDelete() {
    if (!deleteConfirmId) return;
    try {
      await supabase.from("clients").delete().eq("id", deleteConfirmId);
      setDeleteConfirmId(null);
      load();
    } catch (e: any) {
      alert(e?.message || "Erro ao excluir definitivamente.");
    }
  }

  // ✅ PÁGINA Novo
  if (openNewPage) {
    return (
      <NewClientPage
        onBack={() => setOpenNewPage(false)}
        onSuccess={() => {
          setOpenNewPage(false);
          load();
        }}
      />
    );
  }

  // ✅ PÁGINA Editar
  if (editPageId) {
    return (
      <EditClientPage
        clientId={editPageId}
        onBack={() => setEditPageId(null)}
        onSuccess={() => {
          setEditPageId(null);
          load();
        }}
      />
    );
  }

  // estilos premium
  const avatarStyle: React.CSSProperties = {
    height: isMobile ? 36 : 40,
    width: isMobile ? 36 : 40,
    borderRadius: isMobile ? 12 : 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
    color: "rgba(255,255,255,0.9)",
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.30)",
    flexShrink: 0,
  };

  const gridWrap: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
    gap: 12,
  };

  return (
    <div style={{ position: "relative" }}>
      <Page
        title="Clientes"
        actions={
          <button className="gm-btn" type="button" onClick={() => setOpenNewPage(true)}>
            <Plus size={16} />
            Novo Cliente
          </button>
        }
      >
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex-1">
              <input
                className="gm-input"
                placeholder="Pesquisar por nome, telefone ou e-mail"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <button type="button" className={`gm-tab ${tab === "ATIVOS" ? "active" : ""}`} onClick={() => setTab("ATIVOS")}>
                Ativos
              </button>
              <button 
                type="button" 
                className={`flex-1 h-10 px-4 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 whitespace-nowrap border-2 ${
                  tab === "LIXEIRA"
                    ? "bg-[var(--gm-primary)]/20 border-[var(--gm-primary)] text-[var(--gm-primary)] shadow-[0_0_20px_var(--gm-primary-20)]"
                    : "bg-black/40 border-[var(--gm-primary)]/20 text-[var(--gm-primary)] hover:bg-[var(--gm-primary)]/10 hover:border-[var(--gm-primary)]/40 hover:text-[var(--gm-primary)] shadow-none"
                }`}
                onClick={() => setTab("LIXEIRA")}
              >
                Lixeira
              </button>
            </div>
          </div>
        </Card>

        <div style={{ height: 12 }} />

        {loading ? (
          <div style={gridWrap}>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">Carregando...</Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center opacity-70 border-dashed">Nenhum cliente encontrado.</Card>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="text-sm min-w-full">
                <div className="hidden sm:grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 border-b border-white/10 font-bold opacity-60 uppercase tracking-wider text-xs">
                  <div>Avatar</div>
                  <div>Cliente</div>
                  <div className="text-right">Ações</div>
                </div>
                <div className="pb-2">
                  {filtered.map((c) => {
                    const wppDigits = onlyDigits(c.whatsapp || c.phone || "");
                    const prettyWpp = fmtPhoneBR(c.whatsapp || c.phone || "");
                    const hasWpp = wppDigits.length >= 10;

                    const listBtnClass = (tone: "neutral" | "green" | "red" | "orange" = "neutral") => {
                      const base = "gm-btn w-10 h-10 flex items-center justify-center shrink-0";
                      if (tone === "orange") return `${base} gm-btn-soft`;
                      if (tone === "green") return `${base} gm-btn-soft`;
                      if (tone === "red") return `${base} bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/20 hover:bg-[var(--gm-primary)] hover:text-white text-[var(--gm-primary)] shadow-[0_0_8px_rgba(255,123,0,0.1)]`;
                      return `${base} gm-btn-soft`;
                    };

                    return (
                      <div key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <div className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto] gap-2 sm:gap-4 px-4 py-3 sm:items-center">
                          <div className="flex justify-between sm:contents">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleRow(c.id)}
                                className="p-1 hover:bg-white/10 rounded-md transition-colors text-[var(--gm-primary)] animate-pulse hover:animate-none"
                              >
                                <ChevronDown size={18} className={`transition-transform duration-300 ${expandedRows.has(c.id) ? "rotate-180" : ""}`} />
                              </button>
                              <div style={avatarStyle}>
                                <User size={isMobile ? 18 : 20} className="text-[var(--gm-primary)]" />
                              </div>
                              <div className="sm:hidden font-extrabold text-white truncate text-sm">
                                {c.name}
                              </div>
                            </div>
                          </div>
                          
                          <div className="font-medium truncate hidden sm:block">
                            <div className="font-extrabold text-white text-base truncate">{c.name}</div>
                            <div className="mt-1 text-xs text-slate-400 flex items-center gap-3">
                              {prettyWpp ? <span className="flex items-center gap-1"><WhatsAppIcon size={12} /> {prettyWpp}</span> : null}
                              {c.email ? <span className="flex items-center gap-1"><Mail size={12} /> {c.email}</span> : null}
                            </div>
                          </div>

                          <div className="sm:hidden mt-2 text-xs text-slate-400 flex flex-col gap-1">
                            {prettyWpp ? <span className="flex items-center gap-1"><WhatsAppIcon size={12} /> {prettyWpp}</span> : null}
                            {c.email ? <span className="flex items-center gap-1"><Mail size={12} /> {c.email}</span> : null}
                          </div>

                          <div className="flex items-center gap-2 justify-between sm:justify-end mt-2 sm:mt-0">
                            <div className="flex items-center gap-2">
                              {tab === "LIXEIRA" ? (
                                <>
                                  <button className={listBtnClass("green")} title="Restaurar" type="button" onClick={() => restore(c.id)}>
                                    <RotateCcw size={16} />
                                  </button>
                                  <button
                                    className="h-10 w-10 rounded-xl bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/20 hover:bg-[var(--gm-primary)] hover:text-white text-[var(--gm-primary)] transition-all flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(255,123,0,0.1)]"
                                    title="Excluir definitivo"
                                    type="button"
                                    onClick={() => confirmHardDelete(c.id)}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button className={listBtnClass("orange")} title="Editar" type="button" onClick={() => setEditPageId(c.id)}>
                                    <Pencil size={16} />
                                  </button>

                                  <button
                                    className={`${listBtnClass("green")} ${!hasWpp ? 'opacity-50' : ''}`}
                                    title={hasWpp ? "WhatsApp" : "Sem WhatsApp"}
                                    type="button"
                                    onClick={() => {
                                      if (!hasWpp) return setToast("Sem WhatsApp cadastrado");
                                      openWhatsApp(wppDigits);
                                    }}
                                  >
                                    <WhatsAppIcon size={16} />
                                  </button>

                                  <button
                                    className={listBtnClass("neutral")}
                                    title="Copiar telefone"
                                    type="button"
                                    onClick={async () => {
                                      const txt = prettyWpp || "";
                                      if (!txt) return setToast("Sem telefone");
                                      const ok = await copyToClipboard(txt);
                                      setToast(ok ? "Telefone copiado" : "Falha ao copiar");
                                    }}
                                  >
                                    <Copy size={16} />
                                  </button>

                                  <button
                                    className={listBtnClass("neutral")}
                                    title="Copiar e-mail"
                                    type="button"
                                    onClick={async () => {
                                      const txt = (c.email || "").trim();
                                      if (!txt) return setToast("Sem e-mail");
                                      const ok = await copyToClipboard(txt);
                                      setToast(ok ? "E-mail copiado" : "Falha ao copiar");
                                    }}
                                  >
                                    <Mail size={16} />
                                  </button>

                                  <button className={listBtnClass("red")} title="Mover para lixeira" type="button" onClick={() => softDelete(c.id)}>
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {expandedRows.has(c.id) && <ExpandedClientRow clientId={c.id} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        )}
      </Page>

      {/* Toast simples */}
      {toast ? (
        <div
          style={{
            position: "fixed",
            bottom: 18,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99999,
            padding: "10px 14px",
            borderRadius: 14,
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
            fontWeight: 900,
            fontSize: 13,
          }}
        >
          {toast}
        </div>
      ) : null}

      {/* Hard Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteConfirmId(null)}>
          <div className="gm-card w-full max-w-sm rounded-[32px] overflow-hidden !border-white/10 relative z-10 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-[var(--gm-primary)]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[var(--gm-primary)]/20 shadow-[0_0_15px_var(--gm-primary-10)]">
                <Trash2 size={32} className="text-[var(--gm-primary)]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Excluir Definitivamente?</h3>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                Esta ação não pode ser desfeita. O cliente será removido permanentemente do sistema.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="gm-btn gm-btn-outline flex-1 h-12 rounded-xl text-xs uppercase tracking-widest font-black"
                >
                  Cancelar
                </button>
                <button
                  onClick={hardDelete}
                  className="gm-btn flex-1 h-12 rounded-xl text-xs uppercase tracking-widest font-black shadow-[0_4px_15px_rgba(255,122,0,0.3)]"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
