
import React, { useEffect, useMemo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { supabase } from "../lib/supabase";
import { Page } from "../components/ui/Page";
import { Card } from "../components/ui/Card";
import NewClientPage from "./clients/NewClientPage";
import EditClientPage from "./clients/EditClientPage";
import { softDelete as softDeleteApi, restore as restoreApi } from "../lib/trash";
import { Plus, Pencil, Trash2, Copy, ShieldAlert, Mail, RotateCcw, ChevronDown, ChevronUp, User, Users, Zap, TrendingUp, BarChart3, Search, X } from "lucide-react";
import { WhatsAppIcon } from "../components/ui/WhatsAppIcon";
import { useAuth } from "../store/AuthContext";
import { openWhatsapp } from "../services/whatsApp";
import ExpandedClientRow from "../components/clients/ExpandedClientRow";
import { SectionDivider } from "../components/ui/SectionDivider";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import SafeResponsive from "../components/ui/SafeResponsive";
import { ForgeSpecCard } from "../components/ui/ForgeSpecCard";

const cardBase =
  "relative rounded-lg transition-all bg-[#131315] border border-[#26262A] hover:border-[#3F3F46] overflow-hidden";
const inputBase =
  "w-full rounded-[4px] px-4 py-3 text-sm text-[color:var(--gm-text)] placeholder-zinc-500 focus:outline-none focus:border-[color:var(--gm-primary)] transition-all border border-[#26262A] shadow-none bg-[#0B0B0C]";

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

function VirtualizedClientList({
  items,
  expandedRows,
  toggleRow,
  tab,
  isMobile,
  avatarStyle,
  restore,
  confirmHardDelete,
  setEditPageId,
  openWhatsApp,
  copyToClipboard,
  setToast,
  softDelete,
}: {
  items: ClientRow[];
  expandedRows: Set<string>;
  toggleRow: (id: string) => void;
  tab: "ATIVOS" | "LIXEIRA";
  isMobile: boolean;
  avatarStyle: React.CSSProperties;
  restore: (id: string) => void;
  confirmHardDelete: (id: string) => void;
  setEditPageId: (id: string) => void;
  openWhatsApp: (phone: string) => void;
  copyToClipboard: (text: string) => Promise<boolean>;
  setToast: (msg: string) => void;
  softDelete: (id: string) => void;
}) {
  const listBtnClass = (tone: "neutral" | "green" | "red" | "orange" = "neutral") => {
    const base = "!w-9 !h-9 !min-w-[36px] !max-w-[36px] !rounded-[4px] !p-0 flex items-center justify-center shrink-0 transition-all duration-150 group border border-[#26262a] shadow-none bg-[#131315] hover:bg-[#1f1f23] cursor-pointer text-[#f2f2f3]";
    if (tone === "orange") return `${base} btn-action-edit text-[var(--gm-primary,#FE540B)] hover:border-[var(--gm-primary,#FE540B)]/60 hover:text-white hover:bg-[var(--gm-primary,#FE540B)]/20`;
    if (tone === "green") return `${base} btn-whatsapp text-[#25D366] hover:border-[#25D366]/60 hover:text-white hover:bg-[#25D366]/20`;
    if (tone === "red") return `${base} btn-action-delete text-rose-400 hover:border-rose-500/60 hover:text-white hover:bg-rose-500/20`;
    return `${base} btn-action-neutral text-[#8b8b92] hover:border-[#38383f] hover:text-white hover:bg-[#1b1b1e]`;
  };

  return (
    <div className={`overflow-hidden ${cardBase}`}>
      <div className="overflow-x-auto">
        <div className="text-sm min-w-full">
          <div className="hidden sm:grid grid-cols-[auto_1fr_auto] gap-4 px-6 py-4 border-b border-[#26262A] font-bold text-xs text-[#8B8B92] uppercase tracking-wider bg-[#0B0B0C]">
            <div>Avatar</div>
            <div>Cliente</div>
            <div className="text-right">Ações</div>
          </div>

          <div className="w-full divide-y divide-white/10">
            {items.map((c) => {
              const wppDigits = onlyDigits(c.whatsapp || c.phone || "");
              const prettyWpp = fmtPhoneBR(c.whatsapp || c.phone || "");
              const hasWpp = wppDigits.length >= 10;

              return (
                <div
                  key={c.id}
                  className="hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto] gap-2 sm:gap-4 px-6 py-4 sm:items-center">
                    <div className="flex justify-between sm:contents">
                      <div className="flex items-center gap-3">
                        {/* SETA DE EXPANSÃO: QUADRADO LARANJA (IDÊNTICO AO CARD DE ORÇAMENTOS RECENTES NO DASHBOARD) */}
                        <button
                          type="button"
                          onClick={() => toggleRow(c.id)}
                          className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-[4px] bg-[var(--gm-primary,#FE540B)] text-[#0b0b0c] flex items-center justify-center shadow-sm cursor-pointer transition-transform duration-200 hover:brightness-110 active:scale-95 shrink-0"
                          title={expandedRows.has(c.id) ? "Recolher detalhes" : "Expandir detalhes"}
                        >
                          <ChevronDown
                            size={15}
                            strokeWidth={3}
                            className={`transition-transform duration-300 stroke-[#0b0b0c] ${expandedRows.has(c.id) ? "rotate-180" : ""}`}
                          />
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
                        {prettyWpp ? (
                          <span className="flex items-center gap-1.5">
                            <WhatsAppIcon size={14} className="text-[var(--gm-primary)] shrink-0" /> {prettyWpp}
                          </span>
                        ) : null}
                        {c.email ? (
                          <span className="flex items-center gap-1.5">
                            <Mail size={13} className="text-slate-400 shrink-0" /> {c.email}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="sm:hidden mt-2 text-xs text-slate-400 flex flex-col gap-1">
                      {prettyWpp ? (
                        <span className="flex items-center gap-1.5">
                          <WhatsAppIcon size={14} className="text-[var(--gm-primary)] shrink-0" /> {prettyWpp}
                        </span>
                      ) : null}
                      {c.email ? (
                        <span className="flex items-center gap-1.5">
                          <Mail size={13} className="text-slate-400 shrink-0" /> {c.email}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 justify-between sm:justify-end mt-2 sm:mt-0">
                      <div className="flex items-center gap-2">
                        {tab === "LIXEIRA" ? (
                          <>
                            <button className={listBtnClass("green")} title="Restaurar" type="button" onClick={() => restore(c.id)}>
                              <RotateCcw size={18} className="shrink-0 text-emerald-400 group-hover:text-white" />
                            </button>
                            <button
                              className={listBtnClass("red")}
                              title="Excluir definitivo"
                              type="button"
                              onClick={() => confirmHardDelete(c.id)}
                            >
                              <Trash2 size={18} className="shrink-0 text-red-400 group-hover:text-white" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button className={listBtnClass("orange")} title="Editar" type="button" onClick={() => setEditPageId(c.id)}>
                              <Pencil size={18} className="shrink-0 text-[#f4ecd8] group-hover:text-[#f4ecd8]" />
                            </button>

                            <button
                              className={`${listBtnClass("green")} ${!hasWpp ? "opacity-50" : ""}`}
                              title={hasWpp ? "WhatsApp" : "Sem WhatsApp"}
                              type="button"
                              onClick={() => {
                                if (!hasWpp) return setToast("Sem WhatsApp cadastrado");
                                openWhatsApp(wppDigits);
                              }}
                            >
                              <WhatsAppIcon size={18} className="shrink-0 text-emerald-400 group-hover:text-white" />
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
                              <Copy size={18} className="shrink-0 text-[#f4ecd8] group-hover:text-[#f4ecd8]" />
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
                              <Mail size={18} className="shrink-0 text-[#f4ecd8] group-hover:text-[#f4ecd8]" />
                            </button>

                            <button className={listBtnClass("red")} title="Mover para lixeira" type="button" onClick={() => softDelete(c.id)}>
                              <Trash2 size={18} className="shrink-0 text-red-400 group-hover:text-white" />
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
    </div>
  );
}

export default function Clients() {
  const { tenantId } = useAuth();
  const isMobile = useIsMobile(860);

  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(false);

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
    if (!deleteConfirmId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeleteConfirmId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteConfirmId]);

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

  // Resumo: clientes ativos, novos nos últimos 30 dias e cadastros por mês (dado real)
  const clientSummary = useMemo(() => {
    const active = rows.filter((r) => !r.deleted_at);
    const now = new Date();
    const in30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const novos30d = active.filter((r) => r.created_at && new Date(r.created_at) >= in30d).length;

    const monthLabels: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      });
    }
    const counts: Record<string, number> = {};
    active.forEach((r) => {
      if (!r.created_at) return;
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    return {
      totalAtivos: active.length,
      novos30d,
      chartData: monthLabels.map((m) => ({ name: m.label, value: counts[m.key] || 0 })),
    };
  }, [rows]);

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
    color: "#ffffff",
    background: "#18181b",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "none",
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
          <button 
            className="forge-btn forge-btn--primary !h-[38px] !px-3.5 !rounded-[6px] text-[11.5px] font-semibold uppercase tracking-[0.05em] inline-flex items-center justify-center gap-2 active:scale-[0.96] transition-[transform,background-color,box-shadow] duration-150 group cursor-pointer" 
            type="button" 
            onClick={() => setOpenNewPage(true)}
          >
            <span className="gm-plus-icon-wrapper inline-flex items-center justify-center shrink-0">
              <Plus size={14} strokeWidth={2.5} className="w-3.5 h-3.5 shrink-0 gm-btn-plus-black" stroke="#0b0b0c" />
            </span>
            <span>NOVO CLIENTE</span>
          </button>
        }
      >
        <div className="mb-4 space-y-4">
          <SectionDivider label="Resumo" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ForgeSpecCard
              id="01"
              title="CLIENTES ATIVOS"
              status="TOTAL"
              statusLive={true}
              eyebrow="BASE CADASTRADA"
              figure={clientSummary.totalAtivos}
              unit="BASE"
              tags={[
                { label: "CRM ATIVO", accent: true }
              ]}
            />

            <ForgeSpecCard
              id="02"
              title="NOVOS · 30 DIAS"
              status="MÊS"
              statusLive={true}
              eyebrow="CRESCIMENTO RECENTE"
              figure={clientSummary.novos30d}
              unit="NOVOS"
              tags={[
                { label: `+${clientSummary.novos30d} CADASTRADOS`, accent: true }
              ]}
            />

            <div className="forge-spec">
              <div className="forge-spec__bar">
                <span className="forge-spec__id">03</span>
                <span className="forge-spec__title">CADASTROS POR MÊS</span>
                <span className="forge-spec__status">HISTÓRICO</span>
              </div>
              <div className="forge-spec__body !py-3">
                <div className="h-20 relative overflow-hidden w-full">
                  <SafeResponsive height={80}>
                    <BarChart data={clientSummary.chartData} barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="#666" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis hide allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        contentStyle={{ backgroundColor: "#141418", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "4px", color: "#fff", fontSize: 12, boxShadow: "none" }}
                      />
                      <Bar dataKey="value" name="Clientes" radius={[2, 2, 0, 0]} fill="var(--gm-primary, #FE540B)" />
                    </BarChart>
                  </SafeResponsive>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs + Busca Padrão Orçamentos */}
        <div className="mb-6 space-y-4">
          <SectionDivider label="Filtros" />
          
          {/* Tabs Ativos / Lixeira - Padrão Cápsulas Orçamentos */}
          <div className="grid grid-cols-2 gap-2 w-full">
            {[
              { key: "ATIVOS", label: "ATIVOS" },
              { key: "LIXEIRA", label: "LIXEIRA" },
            ].map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key as any)}
                  className={`w-full h-9 rounded-[6px] text-[11px] sm:text-xs font-black tracking-tight transition-all uppercase flex items-center justify-center border cursor-pointer ${
                    active
                      ? "bg-[var(--gm-primary)]/15 text-[var(--gm-primary)] border-[var(--gm-primary)]/40 shadow-none font-black"
                      : "bg-[#0B0B0C] border-[#26262A] text-slate-300 hover:bg-[#1B1B1E] hover:text-white font-bold"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Busca com Visual Padrão Glass Desfocado Apple - Idêntica a Orçamentos */}
          <div className="gm-search-apple-glass">
            <Search className="gm-search-icon" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou e-mail..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="gm-search-clear gm-search-apple-glass-clear"
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between text-xs text-slate-400 px-1">
          <SectionDivider label="Lista de clientes" />
          <span className="shrink-0 ml-4 px-2.5 py-1 rounded-[4px] bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/20 text-[var(--gm-primary)] font-bold flex items-center gap-1.5 shadow-none tabular-nums">
            <Users size={13} /> Clientes ({filtered.length})
          </span>
        </div>
        <div style={{ height: 8 }} />

        {loading ? (
          <div style={gridWrap}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`p-6 ${cardBase}`}>Carregando...</div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="w-full rounded-lg border border-[#26262A] p-10 sm:p-14 md:p-16 min-h-[220px] sm:min-h-[260px] flex flex-col items-center justify-center text-center gap-4 bg-[#131315] shadow-none select-none">
            <div className="w-12 h-12 rounded-md bg-[#0B0B0C] border border-[#26262A] flex items-center justify-center text-[var(--gm-primary)] shadow-none">
              <Users size={22} />
            </div>
            <p className="text-sm sm:text-base text-slate-200 font-semibold leading-relaxed">
              Nenhum cliente encontrado.
            </p>
          </div>
        ) : (
          <div>
            <VirtualizedClientList
              items={filtered}
              expandedRows={expandedRows}
              toggleRow={toggleRow}
              tab={tab}
              isMobile={isMobile}
              avatarStyle={avatarStyle}
              restore={restore}
              confirmHardDelete={confirmHardDelete}
              setEditPageId={setEditPageId}
              openWhatsApp={openWhatsApp}
              copyToClipboard={copyToClipboard}
              setToast={setToast}
              softDelete={softDelete}
            />
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
            padding: "10px 18px",
            borderRadius: 12,
            background: "#18181b",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#ffffff",
            boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          {toast}
        </div>
      ) : null}

      {/* Hard Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[1000] bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}>
          <div className={`w-full max-w-sm rounded-lg overflow-hidden border border-[#26262A] shadow-2xl relative z-10 ${cardBase}`} onClick={e => e.stopPropagation()}>
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-[var(--gm-primary)]/10 rounded-md flex items-center justify-center mx-auto mb-6 border border-[var(--gm-primary)]/25 shadow-none">
                <Trash2 size={28} className="text-[var(--gm-primary)]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Excluir Definitivamente?</h3>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                Esta ação não pode ser desfeita. O cliente será removido permanentemente do sistema.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 h-11 rounded-[6px] text-xs uppercase tracking-widest font-black border border-[#26262A] shadow-none bg-[#1B1B1E] hover:bg-[#26262A] text-white cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <X size={15} />
                  <span>Cancelar</span>
                </button>
                <button
                  type="button"
                  onClick={hardDelete}
                  className="flex-1 h-11 rounded-[6px] text-xs uppercase tracking-widest font-black shadow-none bg-[var(--gm-btn-bg,var(--gm-primary,#FE540B))] text-[var(--gm-primary-foreground,#0b0b0c)] hover:brightness-110 cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <Trash2 size={15} />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
