
import React, { useEffect, useMemo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Page } from "../components/ui/Page";
import { Card } from "../components/ui/Card";
import { Grid } from "../components/ui/Grid";
import { supabase } from "../lib/supabase";
import { fetchSettingsSupabase, readSettingsLocal } from "../lib/settings";
import { softDelete as softDeleteApi, restore as restoreApi } from "../lib/trash";
import { useAuth } from "../store/AuthContext";
import { scheduleApprovedBudgetReminders, removeAlarmsForBudget, getBudgetRemindersEnabled, getBudgetReminderTimes, syncAlarmsWithBudgets } from "../lib/alarmSystem";
import { generateOrcamentoPdf } from "../services/pdfService";
import { buildWhatsappMessage, openWhatsapp } from "../services/whatsApp";
import { useLocation, useNavigate } from "react-router-dom";
import NewBudgetModal from "./budgets/NewBudgetModal";
import ReminderConfigModal from "../components/budgets/ReminderConfigModal";
import ExpandedBudgetRow from "../components/budgets/ExpandedBudgetRow";
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
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { WhatsAppIcon } from "../components/ui/WhatsAppIcon";
import { SectionDivider } from "../components/ui/SectionDivider";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import SafeResponsive from "../components/ui/SafeResponsive";

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
  { value: "CONCLUIDO", label: "CONCLUÍDOS" },
  { value: "CANCELADO", label: "CANCELADOS" },
];

type TabKey = "AGUARDANDO" | "APROVADO" | "CONCLUIDOS" | "CANCELADOS" | "LIXEIRA";

function normalizeStatus(s?: string | null) {
  const v = (s || "AGUARDANDO").toString().toUpperCase().trim();
  if (v.includes("CONCL")) return "CONCLUIDO";
  if (v.includes("APRO")) return "APROVADO";
  if (v.includes("CANC")) return "CANCELADO";
  if (v.includes("AGUAR")) return "AGUARDANDO";
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

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

function VirtualizedBudgetList({
  items,
  highlightedId,
  expandedRows,
  toggleRow,
  tab,
  updateStatusInstant,
  setEditId,
  handleShare,
  sharing,
  softDelete,
  restore,
  confirmHardDelete,
}: {
  items: BudgetRow[];
  highlightedId: string | null;
  expandedRows: Set<string>;
  toggleRow: (id: string) => void;
  tab: TabKey;
  updateStatusInstant: (id: string, status: string) => void;
  setEditId: (id: string) => void;
  handleShare: (r: BudgetRow) => void;
  sharing: string | null;
  softDelete: (id: string) => void;
  restore: (id: string) => void;
  confirmHardDelete: (id: string) => void;
}) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 68,
    overscan: 10,
  });

  const listBtnClass = (tone: "neutral" | "green" | "red" | "orange" = "neutral") => {
    const base = "gm-btn gm-budget-action-btn w-10 h-10 flex items-center justify-center shrink-0";
    if (tone === "orange") return `${base} gm-btn-soft text-amber-500`;
    if (tone === "green") return `${base} gm-btn-soft text-emerald-500`;
    if (tone === "red") return `${base} gm-btn-soft text-red-500`;
    return `${base} gm-btn-soft`;
  };

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="text-sm min-w-full">
          <div className="hidden sm:grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 border-b border-white/10 font-bold opacity-60 uppercase tracking-wider text-xs bg-black/20">
            <div>Data</div>
            <div>Descrição</div>
            <div className="text-right">Ações</div>
          </div>

          <div
            ref={parentRef}
            className="overflow-y-auto max-h-[650px] no-scrollbar relative"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const r = items[virtualRow.index];
                if (!r) return null;
                const created = r.created_at ? new Date(r.created_at) : null;
                const isHighlighted = r.id === highlightedId;

                return (
                  <div
                    key={r.id}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    id={`budget-row-${r.id}`}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                      isHighlighted ? "gm-highlighted-row-glass" : ""
                    }`}
                  >
                    <div className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto] gap-2 sm:gap-4 px-4 py-3 sm:items-center">
                      <div className="flex justify-between sm:contents">
                        <div className="flex items-center gap-2 text-slate-400 font-mono text-xs sm:text-sm">
                          <button
                            onClick={() => toggleRow(r.id)}
                            className="p-1 hover:bg-white/10 rounded-md transition-colors text-[var(--gm-primary)] animate-pulse hover:animate-none"
                          >
                            <ChevronDown
                              size={18}
                              className={`transition-transform duration-300 ${expandedRows.has(r.id) ? "rotate-180" : ""}`}
                            />
                          </button>
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
                              {tab === "CANCELADOS" && (
                                <button
                                  className="gm-btn gm-budget-action-btn bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-400 text-xs py-1 px-3 flex items-center gap-1.5 h-10"
                                  title="Restaurar Orçamento (Voltar para Aguardando)"
                                  onClick={() => updateStatusInstant(r.id, "AGUARDANDO")}
                                  type="button"
                                >
                                  <RotateCcw size={15} />
                                  <span className="font-bold">Restaurar</span>
                                </button>
                              )}
                              <button className={listBtnClass("orange")} title="Editar" onClick={() => setEditId(r.id)} type="button">
                                <Pencil size={16} />
                              </button>
                              <button
                                className={listBtnClass("green")}
                                title="Enviar via WhatsApp / Compartilhar"
                                onClick={() => handleShare(r)}
                                type="button"
                                disabled={sharing === r.id}
                              >
                                {sharing === r.id ? (
                                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <WhatsAppIcon size={16} />
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
                                className="gm-btn gm-budget-action-btn h-10 w-10 rounded-xl bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/20 hover:bg-[var(--gm-primary)] hover:text-white text-[var(--gm-primary)] transition-all flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(255,123,0,0.1)]"
                                title="Excluir Definitivamente"
                                onClick={() => confirmHardDelete(r.id)}
                                type="button"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {expandedRows.has(r.id) && <ExpandedBudgetRow budgetId={r.id} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function VirtualizedBudgetGrid({
  items,
  highlightedId,
  tab,
  updateStatusInstant,
  setEditId,
  handleShare,
  sharing,
  handlePdf,
  setReminderConfigOpen,
  softDelete,
  restore,
  confirmHardDelete,
  isMobile,
}: {
  items: BudgetRow[];
  highlightedId: string | null;
  tab: TabKey;
  updateStatusInstant: (id: string, status: string) => void;
  setEditId: (id: string) => void;
  handleShare: (r: BudgetRow) => void;
  sharing: string | null;
  handlePdf: (id: string, tenant_id: string) => void;
  setReminderConfigOpen: (open: boolean) => void;
  softDelete: (id: string) => void;
  restore: (id: string) => void;
  confirmHardDelete: (id: string) => void;
  isMobile: boolean;
}) {
  const columns = isMobile ? 1 : 2;
  const rowCount = Math.ceil(items.length / columns);
  const parentRef = React.useRef<HTMLDivElement>(null);

  const gridVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 220,
    overscan: 6,
  });

  const iconBtn = (tone: "neutral" | "green" | "red" | "orange" = "neutral") => {
    const base = "gm-btn gm-budget-action-btn flex-1 h-10 flex items-center justify-center gap-2";
    if (tone === "orange") return `${base} gm-btn-soft text-amber-500`;
    if (tone === "green") return `${base} gm-btn-soft text-emerald-500`;
    if (tone === "red") return `${base} gm-btn-soft text-red-500`;
    return `${base} gm-btn-soft`;
  };

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto max-h-[720px] pr-1 no-scrollbar relative"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div
        style={{
          height: `${gridVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {gridVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowIndex = virtualRow.index;
          const rowItems = items.slice(rowIndex * columns, rowIndex * columns + columns);

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={gridVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="pb-3"
            >
              <div className={`grid ${columns === 2 ? "grid-cols-2" : "grid-cols-1"} gap-3`}>
                {rowItems.map((r) => {
                  const created = r.created_at ? new Date(r.created_at) : null;
                  const currentStatus = normalizeStatus(r.status);

                  const sortedOptions = [
                    ...STATUS_OPTIONS.filter((o) => o.value === currentStatus),
                    ...STATUS_OPTIONS.filter((o) => o.value !== currentStatus),
                  ];

                  const isHighlighted = r.id === highlightedId;

                  return (
                    <Card
                      key={r.id}
                      id={`budget-card-${r.id}`}
                      className={`gm-budget-card flex flex-col justify-between !p-4 transition-all duration-300 ${
                        isHighlighted ? "gm-highlighted-budget-glass" : ""
                      }`}
                    >
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
                        {/* cápsulas de status uniformes e expandidas até o final */}
                        <div className="grid grid-cols-4 gap-2 w-full">
                          {sortedOptions.map((opt) => {
                            const isActive = currentStatus === opt.value;
                            const activeCls = pillClass(opt.value);
                            const inactiveCls =
                              "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200";

                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatusInstant(r.id, opt.value);
                                }}
                                className={`w-full h-8 px-1 rounded-full text-[10px] sm:text-[11px] font-extrabold tracking-tight transition-all truncate flex items-center justify-center border ${
                                  isActive ? activeCls + " shadow-md" : inactiveCls
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* ações compactas */}
                        <div className="flex items-center gap-2">
                          {(tab as any) !== "LIXEIRA" ? (
                            <>
                              <button className={iconBtn("orange")} title="Editar" onClick={() => setEditId(r.id)} type="button">
                                <Pencil size={16} />
                              </button>

                              <button
                                className={iconBtn("orange")}
                                title="Enviar via WhatsApp / Compartilhar"
                                onClick={() => handleShare(r)}
                                type="button"
                                disabled={sharing === r.id}
                              >
                                {sharing === r.id ? (
                                  <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <WhatsAppIcon size={16} />
                                )}
                              </button>

                              <button
                                className={iconBtn("neutral")}
                                title="PDF"
                                onClick={() => handlePdf(r.id, r.tenant_id)}
                                type="button"
                              >
                                <FileDown size={16} />
                              </button>

                              <button
                                className={iconBtn("neutral")}
                                title="Lembretes"
                                onClick={() => setReminderConfigOpen(true)}
                                type="button"
                              >
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
                                className="gm-btn gm-budget-action-btn h-10 w-12 rounded-xl bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/20 hover:bg-[var(--gm-primary)] hover:text-white text-[var(--gm-primary)] transition-all flex items-center justify-center shadow-[0_0_10px_rgba(255,123,0,0.1)]"
                                title="Excluir Definitivo"
                                onClick={() => confirmHardDelete(r.id)}
                                type="button"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Budgets() {
  const { tenantId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    const params = new URLSearchParams(location.search || window.location.search || hashQuery);
    if (params.get("new") === "true") {
      setNewOpen(true);
    }
  }, [location.search]);

  // Listen for query parameter 'id' to highlight a budget from notification clicks
  useEffect(() => {
    const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    const params = new URLSearchParams(location.search || window.location.search || hashQuery);
    const id = params.get("id");
    if (id && rows.length > 0) {
      const budget = rows.find(r => r.id === id);
      if (budget) {
        if (budget.deleted_at) {
          setTab("LIXEIRA");
        } else {
          const norm = normalizeStatus(budget.status);
          if (norm === "AGUARDANDO") {
            setTab("AGUARDANDO");
          } else if (norm === "APROVADO") {
            setTab("APROVADO");
          } else if (norm === "CONCLUIDO") {
            setTab("CONCLUIDOS");
          } else if (norm === "CANCELADO") {
            setTab("CANCELADOS");
          } else {
            setTab("AGUARDANDO");
          }
        }
        
        // Highlight the selected budget card without opening the editor modal
        setHighlightedId(id);

        // Wait a brief moment for React to change tabs and render the DOM elements, then scroll smoothly
        setTimeout(() => {
          const element = document.getElementById(`budget-card-${id}`) || document.getElementById(`budget-row-${id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);

        // Keep highlighted for 2.5 seconds, then clear state and cleanup query param from the URL
        const timer = setTimeout(() => {
          setHighlightedId(null);
          
          const currentHash = window.location.hash;
          if (currentHash.includes('?')) {
            const [base, query] = currentHash.split('?');
            const p = new URLSearchParams(query);
            if (p.has("id")) {
              p.delete("id");
              const remaining = p.toString();
              window.location.hash = remaining ? `${base}?${remaining}` : base;
            }
          }
          
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.has("id")) {
            urlParams.delete("id");
            const remaining = urlParams.toString();
            navigate(
              {
                pathname: location.pathname,
                search: remaining ? `?${remaining}` : "",
              },
              { replace: true }
            );
          }
        }, 2500);

        return () => clearTimeout(timer);
      }
    }
  }, [location, rows]);

  const handleCloseEdit = () => {
    setEditId(null);
    const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    const params = new URLSearchParams(location.search || window.location.search || hashQuery);
    if (params.has("id")) {
      params.delete("id");
      const search = params.toString();
      if (window.location.hash.includes('?id=')) {
        const baseHash = window.location.hash.split('?')[0];
        window.location.hash = search ? `${baseHash}?${search}` : baseHash;
      } else {
        navigate(
          {
            pathname: location.pathname,
            search: search ? `?${search}` : "",
          },
          { replace: true }
        );
      }
    }
  };

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

  // Resumo por status (todos os orçamentos não excluídos) — usado no gráfico do topo
  const statusSummary = useMemo(() => {
    const active = rows.filter((r) => !r.deleted_at);
    const groups: Record<string, { count: number; total: number }> = {
      AGUARDANDO: { count: 0, total: 0 },
      APROVADO: { count: 0, total: 0 },
      CONCLUIDO: { count: 0, total: 0 },
      CANCELADO: { count: 0, total: 0 },
    };
    active.forEach((r) => {
      const status = normalizeStatus(r.status);
      if (!groups[status]) groups[status] = { count: 0, total: 0 };
      groups[status].count += 1;
      groups[status].total += Number(r.total_amount || 0);
    });

    const colorFor = (status: string) => {
      if (status === "APROVADO") return "#34d399";
      if (status === "CONCLUIDO") return "var(--gm-primary)";
      if (status === "CANCELADO") return "#f87171";
      return "#fbbf24"; // AGUARDANDO
    };

    const labelFor = (status: string) => {
      if (status === "AGUARDANDO") return "Aguard.";
      if (status === "APROVADO") return "Aprov.";
      if (status === "CONCLUIDO") return "Concl.";
      if (status === "CANCELADO") return "Cancel.";
      return status;
    };

    return {
      chartData: Object.entries(groups).map(([status, v]) => ({
        name: labelFor(status),
        value: v.total,
        count: v.count,
        color: colorFor(status),
      })),
      totalAtivo: groups.AGUARDANDO.total + groups.APROVADO.total,
      countAtivo: groups.AGUARDANDO.count + groups.APROVADO.count,
      totalConcluido: groups.CONCLUIDO.total,
      countConcluido: groups.CONCLUIDO.count,
    };
  }, [rows]);

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
          payment_method: fullBudget.payment_method,
          payment_link: fullBudget.payment_link,
          installments: fullBudget.installments,
          interestRate: fullBudget.interest_rate,
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
        subtotal: fullBudget.subtotal,
        discount: fullBudget.discount,
        payment_method: fullBudget.payment_method,
        payment_link: fullBudget.payment_link,
        installments: fullBudget.installments,
        interest_rate: fullBudget.interest_rate,
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
    const base = "gm-btn gm-budget-action-btn flex-1 h-10 flex items-center justify-center gap-2";
    if (tone === "orange") return `${base} gm-btn-soft text-amber-500`;
    if (tone === "green") return `${base} gm-btn-soft text-emerald-500`;
    if (tone === "red") return `${base} gm-btn-soft text-red-500`;
    return `${base} gm-btn-soft`;
  };

  return (
    <Page
      title="Orçamentos"
      actions={
        <button className="gm-btn h-12 text-xs uppercase tracking-wider" type="button" onClick={() => setNewOpen(true)}>
          <Plus size={16} />
          Novo Orçamento
        </button>
      }
    >
      {/* ✅ Resumo geral (dado real, calculado a partir de todos os orçamentos ativos) */}
      <div className="mb-6 space-y-4">
        <SectionDivider label="Resumo" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="gm-dashboard-card rounded-2xl p-5 shadow-lg">
            <div className="text-xs font-bold text-[color:var(--gm-text-tertiary)] uppercase tracking-wider">
              Em aberto (aguardando + aprovado)
            </div>
            <div className="text-2xl font-extrabold text-[color:var(--gm-text)] mt-1.5">
              {CURRENCY.format(statusSummary.totalAtivo)}
            </div>
            <div className="text-xs text-[color:var(--gm-text-tertiary)] mt-1">{statusSummary.countAtivo} orçamento(s)</div>
          </div>

          <div className="gm-dashboard-card rounded-2xl p-5 shadow-lg">
            <div className="text-xs font-bold text-[color:var(--gm-text-tertiary)] uppercase tracking-wider">
              Concluídos
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1.5">
              {CURRENCY.format(statusSummary.totalConcluido)}
            </div>
            <div className="text-xs text-[color:var(--gm-text-tertiary)] mt-1">{statusSummary.countConcluido} orçamento(s)</div>
          </div>

          <div className="gm-dashboard-card rounded-2xl p-5 shadow-lg sm:col-span-1 col-span-1 overflow-hidden">
            <div className="text-xs font-bold text-[color:var(--gm-text-tertiary)] uppercase tracking-wider mb-2">
              Valor por status
            </div>
            <div className="h-28 relative overflow-hidden w-full">
              <SafeResponsive height={112}>
                <BarChart data={statusSummary.chartData} barSize={22} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#888" fontSize={9} tickLine={false} axisLine={false} interval={0} />
                  <YAxis hide domain={[0, (dataMax: number) => (dataMax > 0 ? dataMax * 1.2 : 100)]} />
                  <Tooltip
                    formatter={(val: number) => CURRENCY.format(val)}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{ backgroundColor: "#0f1117", border: "1px solid #30363d", borderRadius: "8px", color: "#fff", fontSize: 12 }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusSummary.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </SafeResponsive>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Tabs + Busca */}
      <div className="mb-6 space-y-4">
        <SectionDivider label="Filtros" />
        <DraggableScroll className="mb-4 pb-2">
          {[
            { key: "AGUARDANDO", label: "AGUARDANDO", statusVal: "AGUARDANDO" },
            { key: "APROVADO", label: "APROVADO", statusVal: "APROVADO" },
            { key: "CONCLUIDOS", label: "CONCLUÍDOS", statusVal: "CONCLUIDO" },
            { key: "CANCELADOS", label: "CANCELADOS", statusVal: "CANCELADO" },
          ].map((item) => {
            const active = tab === item.key;
            const activeCls = pillClass(item.statusVal);
            const inactiveCls =
              "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200";

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key as TabKey)}
                className={`snap-start shrink-0 w-[110px] h-8 rounded-full text-[11px] font-extrabold tracking-tight transition-all whitespace-nowrap flex items-center justify-center border ${
                  active ? activeCls + " shadow-md" : inactiveCls
                }`}
              >
                {item.label}
              </button>
            );
          })}

          {/* Lixeira separada */}
          <button
            type="button"
            onClick={() => setTab("LIXEIRA")}
            className={`snap-start shrink-0 w-[110px] h-8 rounded-full text-[11px] font-extrabold tracking-tight transition-all whitespace-nowrap flex items-center justify-center border ${
              tab === "LIXEIRA"
                ? pillClass("CANCELADO") + " shadow-md"
                : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200"
            }`}
          >
            LIXEIRA
          </button>
        </DraggableScroll>

        <div className="relative gm-dashboard-card !p-0 rounded-2xl overflow-hidden">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            className="w-full !pl-12 pr-4 py-3.5 bg-transparent border-none text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--gm-primary)] transition-all rounded-2xl"
            placeholder="Buscar por cliente ou valor..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs text-slate-400 px-1">
        <SectionDivider label="Lista de orçamentos" />
        <span className="shrink-0 ml-4 px-2.5 py-1 rounded-full bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/20 text-[var(--gm-primary)] font-bold flex items-center gap-1.5">
          <Zap size={13} /> Virtual Scroll ({filtered.length})
        </span>
      </div>
      <div style={{ height: 8 }} />

      {loading ? (
        <Grid cols={2}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="gm-budget-card" style={{ minHeight: 220 } as any}>
              Carregando...
            </Card>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Card className="gm-dashboard-card text-center p-12 opacity-90 rounded-2xl">Nenhum orçamento encontrado.</Card>
      ) : tab === "CONCLUIDOS" || tab === "CANCELADOS" || tab === "LIXEIRA" ? (
        <VirtualizedBudgetList
          items={filtered}
          highlightedId={highlightedId}
          expandedRows={expandedRows}
          toggleRow={toggleRow}
          tab={tab}
          updateStatusInstant={updateStatusInstant}
          setEditId={setEditId}
          handleShare={handleShare}
          sharing={sharing}
          softDelete={softDelete}
          restore={restore}
          confirmHardDelete={confirmHardDelete}
        />
      ) : (
        <VirtualizedBudgetGrid
          items={filtered}
          highlightedId={highlightedId}
          tab={tab}
          updateStatusInstant={updateStatusInstant}
          setEditId={setEditId}
          handleShare={handleShare}
          sharing={sharing}
          handlePdf={handlePdf}
          setReminderConfigOpen={setReminderConfigOpen}
          softDelete={softDelete}
          restore={restore}
          confirmHardDelete={confirmHardDelete}
          isMobile={isMobile}
        />
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
          onClose={handleCloseEdit} 
          onSuccess={() => { handleCloseEdit(); load(); }} 
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
          <div className="gm-card w-full max-w-md rounded-lg overflow-hidden animate-slide-up !border-white/10" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-lg font-bold">Compartilhar Orçamento</h3>
              <button onClick={() => setShareData(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-3">
              <button 
                onClick={() => {
                  openWhatsapp("", shareData.message);
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
          <div className="gm-card w-full max-w-sm rounded-[32px] overflow-hidden !border-white/10 relative z-10 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-[var(--gm-primary)]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[var(--gm-primary)]/20 shadow-[0_0_15px_var(--gm-primary-10)]">
                <Trash2 size={32} className="text-[var(--gm-primary)]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Excluir Definitivamente?</h3>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                Esta ação não pode ser desfeita. O orçamento será removido permanentemente do sistema.
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
    </Page>
  );
}
