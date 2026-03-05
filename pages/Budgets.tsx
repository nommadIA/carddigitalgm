
import React, { useEffect, useMemo, useState } from "react";
import { Page } from "../components/ui/Page";
import { Card } from "../components/ui/Card";
import { Grid } from "../components/ui/Grid";
import { supabase } from "../lib/supabase";
import { fetchSettingsSupabase, readSettingsLocal } from "../lib/settings";
import { softDelete as softDeleteApi, restore as restoreApi } from "../lib/trash";
import { useAuth } from "../store/AuthContext";
import { scheduleApprovedBudgetReminders, removeAlarmsForBudget, getBudgetRemindersEnabled, getBudgetReminderTimes } from "../lib/alarmSystem";
import { generateOrcamentoPdf } from "../services/pdfService";
import { buildWhatsappMessage } from "../services/whatsApp";
import { useLocation } from "react-router-dom";
import NewBudgetModal from "./budgets/NewBudgetModal";
import ReminderConfigModal from "../components/budgets/ReminderConfigModal";
import {
  Plus,
  Pencil,
  Trash2,
  Share2,
  FileDown,
  Calendar,
  Clock,
  RotateCcw,
  ShieldAlert,
  Bell,
} from "lucide-react";

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
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/25 hover:bg-yellow-500/20";
    case "APROVADO":
      return "bg-green-500/10 text-green-400 border-green-500/25 hover:bg-green-500/20";
    case "PRODUCAO":
      return "bg-orange-500/10 text-orange-400 border-orange-500/25 hover:bg-orange-500/20";
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

    const { error } = await supabase.from("budgets").update({ status: nextNorm }).eq("id", id);
    if (error) {
      alert("Erro ao atualizar status.");
      load();
      return;
    }

    // ✅ lembretes quando APROVADO (mantém até CONCLUÍDO ou desativar manual)
    try {
      const row = rows.find((r) => r.id === id);
      const enabled = getBudgetRemindersEnabled();
      // Ajuste para pegar tempos do localStorage corretamente
      const times = getBudgetReminderTimes();

      if (nextNorm === "APROVADO" && enabled && row) {
        scheduleApprovedBudgetReminders(id, row.client_name || "Cliente");
      }

      // sai de aprovado => remove
      if (nextNorm !== "APROVADO") removeAlarmsForBudget(id);

      // concluiu => remove (garantia)
      if (nextNorm === "CONCLUIDO") removeAlarmsForBudget(id);
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
          dueLabel: fullBudget.due_days ? `${fullBudget.due_days} dias úteis` : undefined,
        },
        items,
        settings!
      );
    } catch (err: any) {
      alert(err?.message || "Erro ao gerar PDF.");
    }
  };

  const handleShare = async (r: BudgetRow) => {
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
      });

      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    } catch (e) {
      console.error(e);
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
    const base =
      "flex-1 h-10 rounded-xl border transition-all flex items-center justify-center gap-2 font-extrabold";
    if (tone === "orange")
      return `${base} bg-orange-500/10 border-orange-500/25 text-orange-300 hover:bg-orange-500/20`;
    if (tone === "green")
      return `${base} bg-green-500/10 border-green-500/25 text-green-300 hover:bg-green-500/20`;
    if (tone === "red")
      return `${base} bg-red-500/10 border-red-500/25 text-red-300 hover:bg-red-500/20`;
    return `${base} bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20`;
  };

  return (
    <Page
      title="Orçamentos"
      actions={
        <button className="gm-btn gm-border-loop" type="button" onClick={() => setNewOpen(true)}>
          <Plus size={16} />
          Novo Orçamento
        </button>
      }
    >
      {/* ✅ Tabs + Busca */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 6,
          marginBottom: 16,
          scrollbarWidth: "none",
        }}
        className="no-scrollbar"
      >
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
              style={{
                position: "relative",
                padding: "10px 18px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.5,
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
                border: active
                  ? "1px solid var(--gm-primary)"
                  : "1px solid rgba(255,255,255,0.08)",
                background: active
                  ? "rgba(255,140,0,0.15)"
                  : "rgba(255,255,255,0.03)",
                color: active ? "var(--gm-primary)" : "rgba(255,255,255,0.6)",
              }}
            >
              {label}
            </button>
          );
        })}

        {/* Lixeira separada */}
        <button
          onClick={() => setTab("LIXEIRA")}
          style={{
            padding: "10px 18px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: "nowrap",
            border: "1px solid rgba(255,0,0,0.3)",
            background: "rgba(255,0,0,0.08)",
            color: "#ff4d4f",
          }}
        >
          LIXEIRA
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Buscar por cliente ou valor..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "white",
            fontSize: 14,
            outline: "none",
          }}
        />
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
                        <span>{r.due_days ?? 5} dias úteis</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-[18px]" style={{ color: ORANGE }}>
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
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 snap-x scroll-smooth items-center rounded-xl p-1">
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
                      </div>
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

                        <button className={iconBtn("green")} title="WhatsApp" onClick={() => handleShare(r)} type="button">
                          <Share2 size={16} />
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
    </Page>
  );
}
