
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
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList, Cell } from "recharts";
import SafeResponsive from "../components/ui/SafeResponsive";
import { ForgeSpecCard } from "../components/ui/ForgeSpecCard";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import { Lock } from "lucide-react";
import { usePlanAccess } from "../hooks/usePlanAccess";
import PlanLockedNotice from "../components/plans/PlanLockedNotice";
import { PlanId } from "../lib/subscriptionPlans";

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
          <div className="hidden sm:grid grid-cols-[auto_1fr_auto] gap-4 px-6 py-3.5 border-b border-[#26262A] font-bold text-xs text-[#8B8B92] uppercase tracking-wider bg-[#0B0B0C]">
            <div className="pl-10">Avatar</div>
            <div>Cliente</div>
            <div className="text-right">Ações</div>
          </div>

          <div className="w-full divide-y divide-white/10">
            {items.map((c) => {
              const wppDigits = onlyDigits(c.whatsapp || c.phone || "");
              const prettyWpp = fmtPhoneBR(c.whatsapp || c.phone || "");
              const hasWpp = wppDigits.length >= 10;
              const isExpanded = expandedRows.has(c.id);

              return (
                <div
                  key={c.id}
                  className="hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto] gap-2.5 sm:gap-4 px-4 sm:px-6 py-4 sm:items-center">
                    <div className="flex justify-between sm:contents">
                      <div className="flex items-center gap-3">
                        {/* SETA DE EXPANSÃO: QUADRADO LARANJA COM SETA PARA BAIXO */}
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          data-selected={isExpanded}
                          onClick={() => toggleRow(c.id)}
                          className="w-7 h-7 !w-7 !h-7 min-w-[28px] min-h-[28px] !p-0 rounded-[4px] bg-[var(--gm-primary,#FE540B)] border border-[var(--gm-primary,#FE540B)] flex items-center justify-center shadow-sm cursor-pointer transition-all duration-150 hover:brightness-110 active:scale-95 shrink-0"
                          title={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
                        >
                          <ChevronDown
                            size={16}
                            strokeWidth={2.75}
                            className={`gm-btn-icon-ink transition-transform duration-200 ${
                              isExpanded
                                ? "rotate-180 text-white stroke-white"
                                : "text-[#0B0B0C] stroke-[#0B0B0C]"
                            }`}
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
  const { subscription, checkQuota, isExpired } = usePlanAccess();
  const isMobile = useIsMobile(860);

  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [tab, setTab] = useState<"ATIVOS" | "LIXEIRA">("ATIVOS");
  const [q, setQ] = useState("");

  const [openNewPage, setOpenNewPage] = useState(false);
  const [editPageId, setEditPageId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [lockModal, setLockModal] = useState<{
    title: string;
    reason?: string;
    requiredPlan?: PlanId;
  } | null>(null);

  const activeClientsCount = useMemo(
    () => rows.filter((r) => !r.deleted_at).length,
    [rows]
  );
  const clientQuota = checkQuota("clients", activeClientsCount);

  const handleOpenNewClient = () => {
    if (isExpired) {
      setLockModal({
        title: "Assinatura Expirada",
        reason: "Seu período de teste ou assinatura expirou. Renove para cadastrar clientes.",
        requiredPlan: "basico",
      });
      return;
    }
    if (!clientQuota.allowed) {
      setLockModal({
        title: "Limite de Clientes Atingido",
        reason: clientQuota.reason,
        requiredPlan: clientQuota.requiredPlan || "intermediario",
      });
      return;
    }
    setOpenNewPage(true);
  };

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

    const monthLabels: { key: string; label: string; fullLabel: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const rawShort = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const label = rawShort.charAt(0).toUpperCase() + rawShort.slice(1);
      const rawFull = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      const fullLabel = rawFull.charAt(0).toUpperCase() + rawFull.slice(1);
      monthLabels.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label,
        fullLabel,
      });
    }
    const counts: Record<string, number> = {};
    active.forEach((r) => {
      if (!r.created_at) return;
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    const chartData = monthLabels.map((m) => ({
      name: m.label,
      fullLabel: m.fullLabel,
      value: counts[m.key] || 0,
    }));
    const totalSemestre = chartData.reduce((acc, item) => acc + item.value, 0);

    return {
      totalAtivos: active.length,
      novos30d,
      chartData,
      totalSemestre,
    };
  }, [rows]);

  const requestEditClient = (id: string) => {
    if (isExpired) {
      setLockModal({
        title: "Assinatura Expirada",
        reason: "Seu período de teste ou assinatura expirou. Renove ou escolha um plano na tela de Planos para editar clientes.",
        requiredPlan: "intermediario",
      });
      return;
    }
    setEditPageId(id);
  };

  async function softDelete(id: string) {
    if (isExpired) {
      setLockModal({
        title: "Assinatura Expirada",
        reason: "Seu período de teste ou assinatura expirou. Renove ou escolha um plano na tela de Planos para excluir clientes.",
        requiredPlan: "intermediario",
      });
      return;
    }
    try {
      await softDeleteApi("clients", id);
      setToast("Movido para lixeira");
      load();
    } catch (e: any) {
      alert(e?.message || "Erro ao excluir.");
    }
  }

  async function restore(id: string) {
    if (isExpired) {
      setLockModal({
        title: "Assinatura Expirada",
        reason: "Seu período de teste ou assinatura expirou. Renove ou escolha um plano na tela de Planos para restaurar clientes.",
        requiredPlan: "intermediario",
      });
      return;
    }
    try {
      await restoreApi("clients", id);
      load();
    } catch (e: any) {
      alert(e?.message || "Erro ao restaurar.");
    }
  }

  const confirmHardDelete = (id: string) => {
    if (isExpired) {
      setLockModal({
        title: "Assinatura Expirada",
        reason: "Seu período de teste ou assinatura expirou. Renove ou escolha um plano na tela de Planos para excluir clientes.",
        requiredPlan: "intermediario",
      });
      return;
    }
    setDeleteConfirmId(id);
  };

  async function hardDelete() {
    if (isExpired) {
      setDeleteConfirmId(null);
      setLockModal({
        title: "Assinatura Expirada",
        reason: "Seu período de teste ou assinatura expirou. Renove ou escolha um plano na tela de Planos para continuar.",
        requiredPlan: "intermediario",
      });
      return;
    }
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
    borderRadius: isMobile ? 6 : 8,
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
            className="forge-btn forge-btn--primary w-full sm:w-auto !h-11 !min-h-[44px] !px-5 !rounded-[6px] text-sm font-bold uppercase tracking-[0.05em] inline-flex items-center justify-center gap-2.5 active:scale-[0.96] transition-[transform,background-color,box-shadow] duration-150 group cursor-pointer" 
            type="button" 
            onClick={handleOpenNewClient}
          >
            {isExpired || !clientQuota.allowed ? (
              <Lock size={17} className="shrink-0 text-[#0b0b0c]" />
            ) : (
              <span className="gm-plus-icon-wrapper inline-flex items-center justify-center shrink-0">
                <Plus size={20} strokeWidth={2.6} className="w-5 h-5 shrink-0 gm-btn-plus-black text-[#0b0b0c]" />
              </span>
            )}
            <span className="text-sm font-bold">NOVO CLIENTE</span>
          </button>
        }
      >
        {isExpired && (
          <div className="mb-6">
            <PlanLockedNotice
              variant="inline"
              title="Assinatura Expirada — Ações Bloqueadas"
              reason="Sua assinatura ou período de teste expirou. Renove ou escolha um plano na tela de Planos para cadastrar, editar ou remover clientes."
              requiredPlan="intermediario"
              currentPlanName={subscription.planName}
              isExpired={true}
            />
          </div>
        )}
        <div className="mb-4 space-y-4">
          <SectionDivider label="Resumo" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            <ForgeSpecCard
              id="01"
              title="CLIENTES ATIVOS"
              status="TOTAL"
              statusLive={true}
              eyebrow="BASE CADASTRADA"
              figure={clientSummary.totalAtivos}
              unit="BASE"
              animationKey={tab}
              className="h-full"
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
              animationKey={tab}
              className="h-full"
              tags={[
                { label: <>+<AnimatedNumber value={clientSummary.novos30d} replayKey={tab} /> CADASTRADOS</>, accent: true }
              ]}
            />

            <div className="forge-spec h-full md:col-span-2 lg:col-span-1">
              <div className="forge-spec__bar">
                <span className="forge-spec__id">03</span>
                <span className="forge-spec__title">CADASTROS POR MÊS</span>
                <span className="forge-spec__status forge-spec__status--live tabular-nums">
                  <AnimatedNumber value={clientSummary.totalSemestre} replayKey={tab} /> / 6M
                </span>
              </div>
              <div className="forge-spec__body flex-1 flex flex-col justify-center !py-2.5 !px-3.5">
                <div className="h-[126px] relative w-full">
                  <SafeResponsive height={126}>
                    <BarChart
                      data={clientSummary.chartData}
                      barSize={22}
                      margin={{ top: 20, right: 8, left: 8, bottom: 2 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="name"
                        interval={0}
                        height={22}
                        tickLine={false}
                        axisLine={{ stroke: "#26262A" }}
                        tick={{ fill: "#CBD5E1", fontSize: 11, fontWeight: 600 }}
                      />
                      <YAxis
                        hide
                        allowDecimals={false}
                        domain={[0, (dataMax: number) => (dataMax > 0 ? Math.ceil(dataMax * 1.32) : 4)]}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        labelFormatter={(_label: any, payload: any) =>
                          payload?.[0]?.payload?.fullLabel || _label
                        }
                        formatter={(value: any) => [`${value} cliente${Number(value) === 1 ? "" : "s"}`, "Cadastros"]}
                        contentStyle={{
                          backgroundColor: "#131315",
                          border: "1px solid #26262A",
                          borderRadius: "6px",
                          color: "#F2F2F3",
                          fontSize: 12,
                          padding: "8px 10px",
                          boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
                        }}
                        itemStyle={{ color: "#F2F2F3", fontWeight: 700 }}
                        labelStyle={{ color: "var(--gm-primary, #FE540B)", fontWeight: 700, marginBottom: 2 }}
                      />
                      <Bar dataKey="value" name="Cadastros" radius={[4, 4, 0, 0]} maxBarSize={26}>
                        {clientSummary.chartData.map((entry, idx) => (
                          <Cell
                            key={`cell-${entry.name}-${idx}`}
                            fill={entry.value > 0 ? "var(--gm-primary, #FE540B)" : "#26262A"}
                          />
                        ))}
                        <LabelList
                          dataKey="value"
                          position="top"
                          offset={5}
                          formatter={(val: any) => (Number(val) > 0 ? String(val) : "")}
                          style={{
                            fill: "#F2F2F3",
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: "var(--font-mono, monospace)",
                          }}
                        />
                      </Bar>
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
                  aria-pressed={active}
                  data-selected={active}
                  onClick={() => setTab(item.key as any)}
                  className={`w-full h-11 rounded-[6px] text-sm font-bold tracking-wider transition-all uppercase flex items-center justify-center border cursor-pointer ${
                    active
                      ? "bg-[var(--gm-primary)]/15 text-white border-[var(--gm-primary)]/60 shadow-none font-black"
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

        <div className="mt-6 mb-3 flex items-center justify-between gap-3 text-xs text-slate-400 px-1">
          <SectionDivider label="Lista de clientes" className="!my-0 flex-1" />
          <span className="shrink-0 px-2.5 py-1 rounded-[4px] bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/20 text-[var(--gm-primary)] font-bold flex items-center gap-1.5 shadow-none tabular-nums">
            <Users size={13} /> Clientes ({filtered.length}{clientQuota.limit !== null ? ` / ${clientQuota.limit}` : ""})
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
              setEditPageId={requestEditClient}
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
      <PlanLockedNotice
        variant="modal"
        isOpen={Boolean(lockModal)}
        onClose={() => setLockModal(null)}
        title={lockModal?.title || "Recurso Bloqueado"}
        reason={lockModal?.reason}
        requiredPlan={lockModal?.requiredPlan || "intermediario"}
        currentPlanName={subscription.planName}
        isExpired={isExpired}
      />
    </div>
  );
}
