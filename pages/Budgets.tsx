
import React, { useEffect, useMemo, useState } from "react";
import { Page } from "../components/ui/Page";
import { Card } from "../components/ui/Card";
import { Grid } from "../components/ui/Grid";
import { supabase } from "../lib/supabase";
import { fetchSettingsSupabase, readSettingsLocal } from "../lib/settings";
import { softDelete as softDeleteApi, restore as restoreApi } from "../lib/trash";
import { useAuth } from "../store/AuthContext";
import { scheduleApprovedBudgetReminders, removeAlarmsForBudget, getBudgetRemindersEnabled, getBudgetReminderTimes, syncAlarmsWithBudgets } from "../lib/alarmSystem";
import { generateOrcamentoPdf } from "../services/pdfService";
import { buildWhatsappMessage } from "../services/whatsApp";
import { useLocation } from "react-router-dom";
import NewBudgetModal from "./budgets/NewBudgetModal";
import ReminderConfigModal from "../components/budgets/ReminderConfigModal";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Share2,
  FileDown,
  Calendar,
  Clock,
  RotateCcw,
  ShieldAlert,
  Bell,
  Copy,
  Mail,
  X,
} from "lucide-react";
import { WhatsAppIcon } from "../components/ui/WhatsAppIcon";

// ✅ Componente para Scroll por Arrastre (Mouse/Touch) sem barra visível
const DraggableScroll = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!ref.current) return;
    setIsDown(true);
    setStartX(e.pageX - ref.current.offsetLeft);
    setScrollLeft(ref.current.scrollLeft);
  };

  const onMouseLeave = () => setIsDown(false);
  const onMouseUp = () => setIsDown(false);

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDown || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX) * 2; // velocidade do scroll
    ref.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      onMouseLeave={onMouseLeave}
      onMouseUp={onMouseUp}
      onMouseMove={onMouseMove}
      className={`flex gap-2 overflow-x-auto no-scrollbar pb-1 snap-x scroll-smooth items-center rounded-xl p-1 cursor-grab active:cursor-grabbing ${className}`}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {children}
    </div>
  );
};

const CURRENCY = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const ORANGE = "rgba(255,122,0,1)"; // ✅ sem azul

type BudgetRow = {
  id: string;
  tenant_id: string;
  client_name: string;
  title?: string | null;
  status?: string | null;
  total_amount: number;
  created_at?: string;
  due_days?: number | null;
  delivery_days?: number | null;
  validity_days?: number | null;
  deleted_at?: string | null;
};

// ✅ Status oficiais
const STATUS_OPTIONS = [
  { value: "AGUARDANDO", label: "AGUARDANDO" },
  { value: "APROVADO", label: "APROVADO" },
  { value: "PRODUCAO", label: "PRODUÇÃO" },
  { value: "CONCLUIDO", label: "CONCLUÍDOS" },
  { value: "CANCELADO", label: "CANCELADOS" },
];

type TabKey = "AGUARDANDO" | "APROVADO" | "PRODUCAO" | "CONCLUIDOS" | "CANCELADOS" | "LIXEIRA";

function normalizeStatus(s?: string | null) {
  const v = (s || "AGUARDANDO").toString().toUpperCase().trim();
  if (v.includes("CONCL")) return "CONCLUIDO";
  if (v.includes("APRO")) return "APROVADO";
  if (v.includes("CANC")) return "CANCELADO";
  if (v.includes("AGUAR")) return "AGUARDANDO";
  if (v.includes("PROD") || v.includes("FAZ") || v.includes("EM ")) return "PRODUCAO";
  return v;
}

// ✅ cores de cápsula por status (sem azul)
function pillClass(status: string) {
  switch (status) {
    case "AGUARDANDO":
      return "bg-[var(--gm-primary)]/10 text-[var(--gm-primary)] border-[var(--gm-primary)]/25 hover:bg-[var(--gm-primary)]/20";
    case "APROVADO":
      return "bg-[var(--gm-accent)]/10 text-[var(--gm-accent)] border-[var(--gm-accent)]/25 hover:bg-[var(--gm-accent)]/20";
    case "PRODUCAO":
      return "bg-[var(--gm-primary)]/10 text-[var(--gm-primary)] border-[var(--gm-primary)]/25 hover:bg-[var(--gm-primary)]/20";
    case "CONCLUIDO":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20";
    case "CANCELADO":
      return "bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/20";
    default:
      return "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10";
  }
}

export default function Budgets() {
  const { tenantId } = useAuth();
  const location = useLocation();

  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<TabKey>("AGUARDANDO");
  const [q, setQ] = useState("");

  const [newOpen, setNewOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [reminderConfigOpen, setReminderConfigOpen] = useState(false);
  const [shareData, setShareData] = useState<{ budget: BudgetRow; message: string } | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  
  // Hard delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("new") === "true") {
      setNewOpen(true);
    }
  }, [location.search]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("budgets-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "budgets",
          ...(tenantId ? { filter: `tenant_id=eq.${tenantId}` } : {}),
        } as any,
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function load() {
    setLoading(true);
    try {
      let query = supabase.from("budgets").select("*").order("created_at", { ascending: false });
      if (tenantId) query = query.eq("tenant_id", tenantId);
      const { data, error } = await query;
      if (error) throw error;
      setRows((data || []) as BudgetRow[]);
      
      // ✅ Sincroniza os alarmes com a lista real de orçamentos
      if (data) {
        syncAlarmsWithBudgets(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    const isTrash = tab === "LIXEIRA";
    const base = rows.filter((r) => (isTrash ? !!r.deleted_at : !r.deleted_at));

    const byTab = (() => {
      if (isTrash) return base;
      if (tab === "AGUARDANDO") return base.filter((r) => normalizeStatus(r.status) === "AGUARDANDO");
      if (tab === "APROVADO") return base.filter((r) => normalizeStatus(r.status) === "APROVADO");
      if (tab === "PRODUCAO") return base.filter((r) => normalizeStatus(r.status) === "PRODUCAO");
      if (tab === "CONCLUIDOS") return base.filter((r) => normalizeStatus(r.status) === "CONCLUIDO");
      if (tab === "CANCELADOS") return base.filter((r) => normalizeStatus(r.status) === "CANCELADO");
      return base;
    })();

    if (!needle) return byTab;

    return byTab.filter((r) => {
      const blob = [r.client_name, r.title, r.id, r.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(needle);
    });
  }, [rows, tab, q]);

  const updateStatusInstant = async (id: string, next: string) => {
    const nextNorm = normalizeStatus(next);

    // UI otimista
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, status: nextNorm } : r)));

    const updatePayload: any = { status: nextNorm };
    if (nextNorm === "CONCLUIDO") {
      updatePayload.completed_at = new Date().toISOString();
    }

    const { error } = await supabase.from("budgets").update(updatePayload).eq("id", id);
    if (error) {
      alert("Erro ao atualizar status.");
      load();
      return;
    }

    // ✅ lembretes quando APROVADO (mantém até CONCLUÍDO ou desativar manual)
    try {
      const row = rows.find((r) => r.id === id);
      const enabled = getBudgetRemindersEnabled();

      if ((nextNorm === "APROVADO" || nextNorm === "PRODUCAO") && enabled && row) {
        scheduleApprovedBudgetReminders(id, row.client_name || "Cliente", row.delivery_days || 5);
      }

      if (nextNorm === "CONCLUIDO" || nextNorm === "CANCELADO" || nextNorm === "LIXEIRA" || nextNorm === "AGUARDANDO") {
        removeAlarmsForBudget(id);
      }
    } catch {}
  };

  const handlePdf = async (id: string, tenant_id: string) => {
    try {
      const { data: fullBudget, error } = await supabase
        .from("budgets")
        .select("*, items:budget_items(*)")
        .eq("id", id)
        .single();
      if (error) throw error;

      const settings = await fetchSettingsSupabase(tenant_id);

      const items = (fullBudget.items || []).map((i: any) => ({
        titulo: i.description,
        qtd: i.quantity,
        valor_unit: i.unit_price,
        width: i.width,
        height: i.height,
        isPrint: String(i.service_type || "").toUpperCase().includes("IMP"),
      }));

      await generateOrcamentoPdf(
        {
          id: fullBudget.id,
          cliente_nome: fullBudget.client_name,
          total: fullBudget.total_amount,
          subtotal: fullBudget.subtotal,
          discount: fullBudget.discount,
          created_at: fullBudget.created_at,
          dueLabel: fullBudget.delivery_days ? `${fullBudget.delivery_days} dias úteis` : undefined,
          delivery_days: fullBudget.delivery_days,
          validity_days: fullBudget.validity_days,
        },
        items,
        settings!
      );
    } catch (err: any) {
      alert(err?.message || "Erro ao gerar PDF.");
    }
  };

  const handleShare = async (r: BudgetRow) => {
    setSharing(r.id);
    try {
      const { data: fullBudget } = await supabase
        .from("budgets")
        .select("*, items:budget_items(*)")
        .eq("id", r.id)
        .single();

      const settings = await fetchSettingsSupabase(r.tenant_id);

      const items = (fullBudget?.items || []).map((i: any) => ({
        titulo: i.description,
        qtd: i.quantity,
        valor_unit: i.unit_price,
        width: i.width,
        height: i.height,
        isPrint: String(i.service_type || "").toUpperCase().includes("IMP"),
      }));

      const msg = buildWhatsappMessage({
        clienteNome: r.client_name,
        orcamentoId: r.id,
        total: r.total_amount,
        settings: settings!,
        items,
        delivery_days: r.delivery_days,
        validity_days: r.validity_days,
      });

      setShareData({ budget: r, message: msg });
    } catch (e) {
      console.error(e);
      alert("Erro ao preparar compartilhamento.");
    } finally {
      setSharing(null);
    }
  };

  const softDelete = async (id: string) => {
    try {
      await softDeleteApi("budgets", id);
      load();
    } catch (e: any) {
      alert(e?.message || "Erro ao excluir.");
    }
  };

  const restore = async (id: string) => {
    try {
      await restoreApi("budgets", id);
      load();
    } catch (e: any) {
      alert(e?.message || "Erro ao restaurar.");
    }
  };

  const confirmHardDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const hardDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await supabase.from("budget_items").delete().eq("budget_id", deleteConfirmId);
      await supabase.from("budgets").delete().eq("id", deleteConfirmId);
      setDeleteConfirmId(null);
      load();
    } catch (e: any) {
      alert(e?.message || "Erro ao excluir definitivamente.");
    }
  };

  // botões compactos
  const iconBtn = (tone: "neutral" | "green" | "red" | "orange" = "neutral") => {
    const base = "gm-btn flex-1 h-10 flex items-center justify-center gap-2";
    if (tone === "orange") return `${base} gm-btn-soft`;
    if (tone === "green") return `${base} gm-btn-soft`;
    if (tone === "red") return `${base} gm-btn-danger`;
    return `${base} gm-btn-soft`;
  };

  return (
    <Page
      title="Orçamentos"
      actions={
        <button className="gm-btn" type="button" onClick={() => setNewOpen(true)}>
          <Plus size={16} />
          Novo Orçamento
        </button>
      }
    >
      {/* ✅ Tabs + Busca */}
      <div className="mb-6">
        <DraggableScroll className="mb-4 pb-2">
          {[
            "AGUARDANDO",
            "APROVADO",
            "PRODUCAO",
            "CONCLUIDOS",
            "CANCELADOS",
          ].map((status) => {
            const active = tab === status;
            const label = status === "PRODUCAO" ? "PRODUÇÃO" : status === "CONCLUIDOS" ? "CONCLUÍDOS" : status;

            return (
              <button
                key={status}
                onClick={() => setTab(status as TabKey)}
                className={`relative px-5 py-2.5 rounded-full text-xs font-bold tracking-wider transition-all duration-300 whitespace-nowrap border ${
                  active 
                    ? "bg-[var(--gm-primary)]/15 border-[var(--gm-primary)] text-[var(--gm-primary)] shadow-[0_0_15px_var(--gm-primary-10)]" 
                    : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10"
                }`}
              >
                {label}
              </button>
            );
          })}

          {/* Lixeira separada */}
          <button
            onClick={() => setTab("LIXEIRA")}
            className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-wider transition-all duration-300 whitespace-nowrap border ${
              tab === "LIXEIRA"
                ? "bg-red-500/15 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                : "bg-red-500/5 border-red-500/20 text-red-400 hover:bg-red-500/10"
            }`}
          >
            LIXEIRA
          </button>
        </DraggableScroll>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            className="gm-input !pl-14 py-3.5 bg-white/5 border-white/10 focus:border-[var(--gm-primary)] transition-all rounded-2xl"
            placeholder="Buscar por cliente ou valor..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div style={{ height: 14 }} />

      {loading ? (
        <Grid cols={2}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="gm-budget-card" style={{ minHeight: 220 } as any}>
              Carregando...
            </Card>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Card className="text-center p-10 border-dashed opacity-70">Nenhum orçamento encontrado.</Card>
      ) : (tab === "CONCLUIDOS" || tab === "CANCELADOS" || tab === "LIXEIRA") ? (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="text-sm min-w-full">
              <div className="hidden sm:grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 border-b border-white/10 font-bold opacity-60 uppercase tracking-wider text-xs">
                <div>Data</div>
                <div>Descrição</div>
                <div className="text-right">Ações</div>
              </div>
              <div className="pb-2">
                {filtered.map((r) => {
                  const created = r.created_at ? new Date(r.created_at) : null;
                  
                  const listBtnClass = (tone: "neutral" | "green" | "red" | "orange" = "neutral") => {
                    const base = "gm-btn w-10 h-10 flex items-center justify-center shrink-0";
                    if (tone === "orange") return `${base} gm-btn-soft`;
                    if (tone === "green") return `${base} gm-btn-soft`;
                    if (tone === "red") return `${base} gm-btn-danger`;
                    return `${base} gm-btn-soft`;
                  };

                  return (
                    <div
                      key={r.id}
                      className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto] gap-2 sm:gap-4 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors sm:items-center"
                    >
                      <div className="flex justify-between sm:contents">
                        <div className="text-slate-400 font-mono text-xs sm:text-sm">
                          {created ? created.toLocaleDateString("pt-BR") : "-"}
                        </div>
                        <div className="sm:hidden text-right font-bold text-[var(--gm-primary)]">
                          {CURRENCY.format(Number(r.total_amount || 0))}
                        </div>
                      </div>
                      <div className="font-medium truncate">
                        <span className="font-extrabold text-white mr-2">{(r.client_name || "CLIENTE").toUpperCase()}</span>
                        <span className="text-slate-300">{r.title || "Orçamento"}</span>
                      </div>
                      <div className="flex items-center gap-2 justify-between sm:justify-end mt-2 sm:mt-0">
                        <div className="hidden sm:block text-right font-bold text-[var(--gm-primary)] mr-4">
                          {CURRENCY.format(Number(r.total_amount || 0))}
                        </div>
                        <div className="flex items-center gap-2">
                          {tab !== "LIXEIRA" ? (
                            <>
                              <button className={listBtnClass("orange")} title="Editar" onClick={() => setEditId(r.id)} type="button">
                                <Pencil size={16} />
                              </button>
                              <button 
                                className={listBtnClass("green")} 
                                title="Compartilhar" 
                                onClick={() => handleShare(r)} 
                                type="button"
                                disabled={sharing === r.id}
                              >
                                {sharing === r.id ? (
                                  <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Share2 size={16} />
                                )}
                              </button>
                              <button className={listBtnClass("red")} title="Lixeira" onClick={() => softDelete(r.id)} type="button">
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button className={listBtnClass("green")} title="Restaurar" onClick={() => restore(r.id)} type="button">
                                <RotateCcw size={16} />
                              </button>
                              <button
                                className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-300 transition-all flex items-center justify-center shrink-0"
                                title="Excluir Definitivamente"
                                onClick={() => hardDelete(r.id)}
                                type="button"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Grid cols={2}>
          {filtered.map((r) => {
            const created = r.created_at ? new Date(r.created_at) : null;
            const currentStatus = normalizeStatus(r.status);

            const sortedOptions = [
              ...STATUS_OPTIONS.filter((o) => o.value === currentStatus),
              ...STATUS_OPTIONS.filter((o) => o.value !== currentStatus),
            ];

            return (
              <Card key={r.id} className="gm-budget-card flex flex-col justify-between !p-4">
                {/* HEADER compacto */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-extrabold truncate text-white text-[15px]">
                      {(r.client_name || "CLIENTE").toUpperCase()}
                    </div>
                    <div className="gm-muted text-sm truncate mt-1 font-medium text-slate-300">
                      {r.title || "Orçamento"}
                    </div>

                    <div className="flex items-center gap-4 mt-2 gm-muted text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{created ? created.toLocaleDateString("pt-BR") : "-"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{r.delivery_days ?? 5} dias úteis</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-[18px] text-[var(--gm-primary)]">
                      {CURRENCY.format(Number(r.total_amount || 0))}
                    </div>
                    <div className="gm-muted text-xs">Total</div>
                  </div>
                </div>

                {/* FOOTER em 2 linhas (caps + ações) */}
                <div className="mt-5 pt-4 border-t border-white/5 flex flex-col gap-3">
                  {/* cápsulas de status */}
                  <div>
                    {tab !== "LIXEIRA" ? (
                      <DraggableScroll>
                        {sortedOptions.map((opt) => {
                          const isActive = currentStatus === opt.value;
                          const activeCls = pillClass(opt.value);
                          const inactiveCls = "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200";

                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatusInstant(r.id, opt.value);
                              }}
                              className={`snap-start shrink-0 px-3 py-1.5 rounded-full text-[11px] font-extrabold tracking-wide transition-all whitespace-nowrap border ${
                                isActive ? activeCls + " shadow-md" : inactiveCls
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </DraggableScroll>
                    ) : (
                      <div className="w-full bg-red-500/10 border border-red-500/20 rounded-xl p-2 text-center">
                        <span className="text-xs font-extrabold text-red-400 uppercase tracking-widest">Na Lixeira</span>
                      </div>
                    )}
                  </div>

                  {/* ações compactas (sem azul) */}
                  <div className="flex items-center gap-2">
                    {tab !== "LIXEIRA" ? (
                      <>
                        <button className={iconBtn("orange")} title="Editar" onClick={() => setEditId(r.id)} type="button">
                          <Pencil size={16} />
                        </button>

                        <button 
                          className={iconBtn("green")} 
                          title="Compartilhar" 
                          onClick={() => handleShare(r)} 
                          type="button"
                          disabled={sharing === r.id}
                        >
                          {sharing === r.id ? (
                            <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Share2 size={16} />
                          )}
                        </button>

                        <button className={iconBtn("neutral")} title="PDF" onClick={() => handlePdf(r.id, r.tenant_id)} type="button">
                          <FileDown size={16} />
                        </button>

                        <button className={iconBtn("neutral")} title="Lembretes" onClick={() => setReminderConfigOpen(true)} type="button">
                          <Bell size={16} />
                        </button>

                        <button className={iconBtn("red")} title="Lixeira" onClick={() => softDelete(r.id)} type="button">
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button className={iconBtn("green")} title="Restaurar" onClick={() => restore(r.id)} type="button">
                          <RotateCcw size={16} /> Restaurar
                        </button>

                        <button
                          className="h-10 w-12 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-300 transition-all flex items-center justify-center"
                          title="Excluir Definitivo"
                          onClick={() => confirmHardDelete(r.id)}
                          type="button"
                        >
                          <ShieldAlert size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </Grid>
      )}

      {/* Instance for creating new budget (persistent state) */}
      <NewBudgetModal 
        open={newOpen} 
        onClose={() => setNewOpen(false)} 
        onSuccess={() => { setNewOpen(false); load(); }} 
      />

      {/* Instance for editing budget (mounts on demand) */}
      {editId && (
        <NewBudgetModal 
          open={true}
          budgetToEditId={editId}
          onClose={() => setEditId(null)} 
          onSuccess={() => { setEditId(null); load(); }} 
        />
      )}

      {/* Global Reminder Settings Modal */}
      <ReminderConfigModal 
        open={reminderConfigOpen} 
        onClose={() => setReminderConfigOpen(false)} 
      />

      {/* Share Options Modal */}
      {shareData && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShareData(null)}>
          <div className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-lg font-bold">Compartilhar Orçamento</h3>
              <button onClick={() => setShareData(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-3">
              <button 
                onClick={() => {
                  window.open(`https://wa.me/?text=${encodeURIComponent(shareData.message)}`, "_blank");
                  setShareData(null);
                }}
                className="w-full gm-btn gm-btn-outline !justify-start !pl-3 gap-3 py-4"
              >
                <div className="shrink-0">
                  <WhatsAppIcon size={24} className="text-[var(--gm-primary)]" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-[var(--gm-primary)] leading-tight">WhatsApp</p>
                  <p className="text-[10px] text-white/70 leading-tight">Enviar diretamente para um contato</p>
                </div>
              </button>

              <button 
                onClick={() => {
                  window.open(`mailto:?subject=Orçamento - ${shareData.budget.client_name}&body=${encodeURIComponent(shareData.message)}`, "_blank");
                  setShareData(null);
                }}
                className="w-full gm-btn gm-btn-outline !justify-start !pl-3 gap-3 py-4"
              >
                <div className="shrink-0">
                  <Mail size={24} className="text-[var(--gm-primary)]" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-[var(--gm-primary)] leading-tight">E-mail</p>
                  <p className="text-[10px] text-white/70 leading-tight">Enviar por correio eletrônico</p>
                </div>
              </button>

              <button 
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareData.message);
                    alert("Texto copiado para a área de transferência!");
                    setShareData(null);
                  } catch (err) {
                    alert("Erro ao copiar texto.");
                  }
                }}
                className="w-full gm-btn gm-btn-outline !justify-start !pl-3 gap-3 py-4"
              >
                <div className="shrink-0">
                  <Copy size={24} className="text-[var(--gm-primary)]" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-[var(--gm-primary)] leading-tight">Copiar Texto</p>
                  <p className="text-[10px] text-white/70 leading-tight">Copiar para colar em outro lugar</p>
                </div>
              </button>

              {navigator.share && (
                <button 
                  onClick={async () => {
                    try {
                      await navigator.share({
                        title: `Orçamento - ${shareData.budget.client_name}`,
                        text: shareData.message,
                      });
                      setShareData(null);
                    } catch (err) {
                      if ((err as Error).name !== 'AbortError') {
                        alert("Erro ao compartilhar.");
                      }
                    }
                  }}
                  className="w-full gm-btn gm-btn-outline !justify-start !pl-3 gap-3 py-4"
                >
                  <div className="shrink-0">
                    <Share2 size={24} className="text-[var(--gm-primary)]" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[var(--gm-primary)] leading-tight">Mais Opções</p>
                    <p className="text-[10px] text-white/70 leading-tight">Menu de compartilhamento do sistema</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
                Esta ação não pode ser desfeita. O orçamento será removido permanentemente do sistema.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="gm-btn gm-btn-outline flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={hardDelete}
                  className="gm-btn gm-btn-danger flex-1"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
