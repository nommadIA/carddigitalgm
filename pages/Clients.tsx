
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { Page } from "../components/ui/Page";
import { Card } from "../components/ui/Card";
import NewClientPage from "./clients/NewClientPage";
import EditClientPage from "./clients/EditClientPage";
import { softDelete as softDeleteApi, restore as restoreApi } from "../lib/trash";
import { Plus, Pencil, Trash2, Copy, MessageCircle, ShieldAlert } from "lucide-react";
import { useAuth } from "../store/AuthContext";

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
  window.open(`https://wa.me/${normalized}`, "_blank", "noopener,noreferrer");
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
    if (!needle) return base;

    return base.filter((r) => {
      const blob = [r.name, r.whatsapp, r.phone, r.email, r.address, r.cpf_cnpj]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(needle);
    });
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

  const iconBtnBase: React.CSSProperties = {
    height: isMobile ? 38 : 40,
    width: isMobile ? 38 : 40,
    borderRadius: isMobile ? 12 : 14,
    background: "rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.82)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const iconBtnGreen: React.CSSProperties = {
    ...iconBtnBase,
    background: "rgba(0,255,120,0.08)",
    border: "1px solid rgba(0,255,120,0.20)",
    color: "rgba(160,255,200,0.95)",
  };

  const iconBtnBlue: React.CSSProperties = {
    ...iconBtnBase,
    background: "rgba(120,180,255,0.08)",
    border: "1px solid rgba(120,180,255,0.20)",
    color: "rgba(200,230,255,0.95)",
  };

  const iconBtnRed: React.CSSProperties = {
    ...iconBtnBase,
    background: "rgba(255,0,0,0.08)",
    border: "1px solid rgba(255,0,0,0.20)",
    color: "rgba(255,200,200,0.95)",
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
          <button className="gm-btn gm-border-loop" type="button" onClick={() => setOpenNewPage(true)}>
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
              <button type="button" className={`gm-tab ${tab === "LIXEIRA" ? "active" : ""}`} onClick={() => setTab("LIXEIRA")}>
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
          <div style={gridWrap}>
            {filtered.map((c) => {
              const wppDigits = onlyDigits(c.whatsapp || c.phone || "");
              const prettyWpp = fmtPhoneBR(c.whatsapp || c.phone || "");
              const hasWpp = wppDigits.length >= 10;

              // linha compacta para mobile
              const metaLine = [
                prettyWpp ? `📱 ${prettyWpp}` : "",
                c.email ? `✉️ ${c.email}` : "",
              ].filter(Boolean);

              return (
                <Card key={c.id} className={isMobile ? "p-4" : "p-5"}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex" style={{ gap: 10, minWidth: 0 }}>
                      <div style={avatarStyle}>{initialFromName(c.name)}</div>

                      <div className="min-w-0">
                        <div className="font-extrabold text-white truncate" style={{ fontSize: isMobile ? 14 : 16 }}>
                          {c.name}
                        </div>

                        {/* Desktop: detalhes em 3 linhas / Mobile: 1 linha compacta */}
                        {isMobile ? (
                          <div className="mt-2 text-xs text-white/60 truncate">
                            {metaLine.length ? metaLine.join("  •  ") : "Sem dados adicionais"}
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-white/60 space-y-1">
                            {prettyWpp ? <div>📱 {prettyWpp}</div> : <div className="opacity-60">📱 Sem telefone</div>}
                            {c.email ? <div>✉️ {c.email}</div> : null}
                            {c.address ? <div>📍 {c.address}</div> : null}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Desktop: ações ao lado / Mobile: fica abaixo (linha compacta) */}
                    {!isMobile ? (
                      <div className="flex gap-2" style={{ flexShrink: 0 }}>
                        {tab === "LIXEIRA" ? (
                          <>
                            <button style={iconBtnGreen} title="Restaurar" type="button" onClick={() => restore(c.id)}>↩️</button>
                            <button style={iconBtnRed} title="Excluir definitivo" type="button" onClick={() => confirmHardDelete(c.id)}>
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button style={iconBtnBlue} title="Editar" type="button" onClick={() => setEditPageId(c.id)}>
                              <Pencil size={16} />
                            </button>

                            <button
                              style={hasWpp ? iconBtnGreen : iconBtnBase}
                              title={hasWpp ? "WhatsApp" : "Sem WhatsApp"}
                              type="button"
                              onClick={() => {
                                if (!hasWpp) return setToast("Sem WhatsApp cadastrado");
                                openWhatsApp(wppDigits);
                              }}
                            >
                              <MessageCircle size={16} />
                            </button>

                            <button
                              style={iconBtnBase}
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
                              style={iconBtnBase}
                              title="Copiar e-mail"
                              type="button"
                              onClick={async () => {
                                const txt = (c.email || "").trim();
                                if (!txt) return setToast("Sem e-mail");
                                const ok = await copyToClipboard(txt);
                                setToast(ok ? "E-mail copiado" : "Falha ao copiar");
                              }}
                            >
                              @
                            </button>

                            <button style={iconBtnRed} title="Mover para lixeira" type="button" onClick={() => softDelete(c.id)}>
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* ✅ Mobile: linha de ações (compacta, touch-friendly) */}
                  {isMobile ? (
                    <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {tab === "LIXEIRA" ? (
                        <>
                          <button style={iconBtnGreen} title="Restaurar" type="button" onClick={() => restore(c.id)}>↩️</button>
                          <button style={iconBtnRed} title="Excluir definitivo" type="button" onClick={() => confirmHardDelete(c.id)}>
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button style={iconBtnBlue} title="Editar" type="button" onClick={() => setEditPageId(c.id)}>
                            <Pencil size={16} />
                          </button>

                          <button
                            style={hasWpp ? iconBtnGreen : iconBtnBase}
                            title={hasWpp ? "WhatsApp" : "Sem WhatsApp"}
                            type="button"
                            onClick={() => {
                              if (!hasWpp) return setToast("Sem WhatsApp cadastrado");
                              openWhatsApp(wppDigits);
                            }}
                          >
                            <MessageCircle size={16} />
                          </button>

                          <button
                            style={iconBtnBase}
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
                            style={iconBtnBase}
                            title="Copiar e-mail"
                            type="button"
                            onClick={async () => {
                              const txt = (c.email || "").trim();
                              if (!txt) return setToast("Sem e-mail");
                              const ok = await copyToClipboard(txt);
                              setToast(ok ? "E-mail copiado" : "Falha ao copiar");
                            }}
                          >
                            @
                          </button>

                          <button style={iconBtnRed} title="Lixeira" type="button" onClick={() => softDelete(c.id)}>
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
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
          <div className="bg-slate-900 border border-red-500/30 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <ShieldAlert size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Excluir Definitivamente?</h3>
              <p className="text-slate-400 text-sm mb-6">
                Esta ação não pode ser desfeita. O cliente será removido permanentemente do sistema.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 text-slate-300 font-medium hover:bg-white/5 rounded-xl transition-colors border border-white/10"
                >
                  Cancelar
                </button>
                <button
                  onClick={hardDelete}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all"
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
