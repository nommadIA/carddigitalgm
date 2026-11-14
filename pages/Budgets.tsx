
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Page } from "../components/ui/Page";
import { Card } from "../components/ui/Card";
import { Grid } from "../components/ui/Grid";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { fetchSettingsSupabase, readSettingsLocal } from "../lib/settings";
import { readBudgetsLocal, writeBudgetsLocal } from "../lib/budgetsCache";
import { softDelete as softDeleteApi, restore as restoreApi } from "../lib/trash";
import { useAuth } from "../store/AuthContext";
import { scheduleApprovedBudgetReminders, removeAlarmsForBudget, getBudgetRemindersEnabled, getBudgetReminderTimes, syncAlarmsWithBudgets } from "../lib/alarmSystem";
import { broadcastAppNotification } from "../lib/syncHub";
import { generateOrcamentoPdf } from "../services/pdfService";
import { buildWhatsappMessage, openWhatsapp } from "../services/whatsApp";
import { useLocation, useNavigate } from "react-router-dom";
import NewBudgetModal from "./budgets/NewBudgetModal";
import ReminderConfigModal from "../components/budgets/ReminderConfigModal";
import ExpandedBudgetRow from "../components/budgets/ExpandedBudgetRow";
import { SignalBottomGradient } from "../components/ui/SignalBottomGradient";
import { ForgeSpecCard } from "../components/ui/ForgeSpecCard";
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
  FileText,
  LayoutGrid,
  List,
  CheckCircle2,
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

const BUDGET_TABS: Array<{ key: TabKey; label: string; dotColor: string }> = [
  { key: "AGUARDANDO", label: "AGUARDANDO", dotColor: "bg-amber-500" },
  { key: "APROVADO", label: "APROVADO", dotColor: "bg-blue-500" },
  { key: "CONCLUIDOS", label: "CONCLUÍDOS", dotColor: "bg-emerald-500" },
  { key: "CANCELADOS", label: "CANCELADOS", dotColor: "bg-rose-500" },
  { key: "LIXEIRA", label: "LIXEIRA", dotColor: "bg-zinc-400" },
];

const ELASTIC_SPRING = {
  type: "spring" as const,
  stiffness: 340,
  damping: 24,
  mass: 0.8,
};

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

const MONTHS = [
  { key: 0, label: "JAN", full: "Janeiro" },
  { key: 1, label: "FEV", full: "Fevereiro" },
  { key: 2, label: "MAR", full: "Março" },
  { key: 3, label: "ABR", full: "Abril" },
  { key: 4, label: "MAI", full: "Maio" },
  { key: 5, label: "JUN", full: "Junho" },
  { key: 6, label: "JUL", full: "Julho" },
  { key: 7, label: "AGO", full: "Agosto" },
  { key: 8, label: "SET", full: "Setembro" },
  { key: 9, label: "OUT", full: "Outubro" },
  { key: 10, label: "NOV", full: "Novembro" },
  { key: 11, label: "DEZ", full: "Dezembro" },
];

function VirtualizedBudgetList({
  items,
  highlightedId,
  expandedRows,
  toggleRow,
  tab,
  updateStatusInstant,
  setEditId,
  setDuplicateId,
  handleShare,
  sharing,
  softDelete,
  restore,
  confirmHardDelete,
  setReminderConfigOpen,
  stopSignal,
  handlePdf,
}: {
  items: BudgetRow[];
  highlightedId: string | null;
  expandedRows: Set<string>;
  toggleRow: (id: string) => void;
  tab: TabKey;
  updateStatusInstant: (id: string, status: string) => void;
  setEditId: (id: string) => void;
  setDuplicateId?: (id: string) => void;
  handleShare: (r: BudgetRow) => void;
  sharing: string | null;
  softDelete: (id: string) => void;
  restore: (id: string) => void;
  confirmHardDelete: (id: string) => void;
  setReminderConfigOpen?: (open: boolean) => void;
  stopSignal?: (id: string) => void;
  handlePdf?: (id: string, tenant_id: string) => void;
}) {
  const listBtnClass = (tone: "neutral" | "green" | "red" | "orange" = "orange") => {
    const base = "gm-budget-action-btn w-8 h-8 !p-0 flex items-center justify-center shrink-0 rounded-[6px] transition-all duration-150 cursor-pointer border";
    if (tone === "orange") return `${base} border-[#26262A] hover:border-[#b33a0e] text-[#f4ecd8] bg-[#1B1B1E] hover:bg-[#b33a0e] hover:text-[#f4ecd8] shadow-none`;
    if (tone === "green") return `${base} border-[#26262A] hover:border-emerald-500 text-emerald-400 bg-[#1B1B1E] hover:bg-emerald-600 hover:text-white shadow-none`;
    if (tone === "red") return `${base} border-[#26262A] hover:border-red-500 text-red-400 bg-[#1B1B1E] hover:bg-red-600 hover:text-white shadow-none`;
    return `${base} border-[#26262A] hover:border-[#b33a0e] text-[#f4ecd8] bg-[#1B1B1E] hover:bg-[#b33a0e] hover:text-[#f4ecd8] shadow-none`;
  };

  if (!items || items.length === 0) {
    return (
      <div className="w-full rounded-lg border border-[#26262A] p-10 sm:p-14 md:p-16 min-h-[220px] sm:min-h-[260px] flex flex-col items-center justify-center text-center gap-4 bg-[#131315] shadow-none select-none">
        <p className="text-sm sm:text-base text-slate-200 font-semibold leading-relaxed">
          Nenhum orçamento para exibir nesta lista.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full pb-10">
      {/* CABEÇALHO DO MODO LISTA NO DESKTOP */}
      <div className="hidden lg:block w-full overflow-x-auto no-scrollbar">
        <div className="flex items-center min-w-[1260px] xl:min-w-0 w-full px-4 py-2.5 text-xs font-black uppercase tracking-wider select-none bg-[#131315] border border-[#26262A] rounded-md">
          <div className="flex items-center gap-3 w-[330px] xl:w-[350px] shrink-0">
            <span className="w-7 text-center text-slate-400">EXP.</span>
            <span className="w-24 text-left text-[var(--gm-primary)] font-black">EMISSÃO</span>
            <span className="text-left text-[var(--gm-primary)] font-black">CLIENTE</span>
          </div>
          <div className="text-left w-[470px] shrink-0 pl-8">
            <span className="text-[var(--gm-primary)] font-black">STATUS DO ORÇAMENTO</span>
          </div>
          <div className="text-left w-[240px] shrink-0 pl-16">
            <span className="text-[var(--gm-primary)] font-black">VALOR TOTAL</span>
          </div>
          <div className="ml-auto text-right pr-2 min-w-[170px]">
            <span className="text-[var(--gm-primary)] font-black">AÇÕES</span>
          </div>
        </div>
      </div>

      {items.map((r) => {
        if (!r || !r.id) return null;
        const created = r.created_at ? new Date(r.created_at) : null;
        const isValidDate = created && !isNaN(created.getTime());
        const formattedDate = isValidDate ? created.toLocaleDateString("pt-BR") : "-";

        const isHighlighted = r.id === highlightedId;
        const isExpanded = Boolean(expandedRows && typeof expandedRows.has === "function" && expandedRows.has(r.id));

        const clientDisplayName = typeof r.client_name === "string" && r.client_name.trim()
          ? r.client_name.trim()
          : (r.client_name && typeof r.client_name === "object" ? ((r.client_name as any).name || "CLIENTE") : String(r.client_name || "CLIENTE"));

        const budgetTitle = r.title || "Orçamento";
        const totalFormatted = CURRENCY.format(Number(r.total_amount || 0));

        const currentStatus = normalizeStatus(r.status);
        const isConcluido = currentStatus === "CONCLUIDO";
        const isAprovado = currentStatus === "APROVADO";
        const isCancelado = currentStatus === "CANCELADO";

        return (
          <div
            key={r.id}
            id={`budget-row-${r.id}`}
            onMouseEnter={() => stopSignal?.(r.id)}
            onTouchStart={() => stopSignal?.(r.id)}
            onClick={() => stopSignal?.(r.id)}
            className={`gm-budget-row bg-[#131315] rounded-md px-3.5 sm:px-4 py-2.5 transition-all duration-200 relative border border-[#26262A] hover:border-[#3F3F46] hover:bg-[#1B1B1E] !min-h-0 min-h-0 h-auto !h-auto ${
              isHighlighted ? "gm-signal-bottom-container" : ""
            }`}
          >
            <SignalBottomGradient
              active={isHighlighted}
              onDismiss={() => stopSignal?.(r.id)}
            />

            {/* LINHA PRINCIPAL DA BARRA EM UMA LINHA SÓ */}
            <div className="w-full overflow-x-auto no-scrollbar">
              <div className="flex items-center min-w-[1260px] xl:min-w-0 w-full min-h-0 py-0.5">
                {/* IDENTIFICAÇÃO: EXPANSÃO + EMISSÃO + CLIENTE (COLUNA FIXA) */}
                <div className="flex items-center gap-2.5 sm:gap-3 w-[330px] xl:w-[350px] shrink-0 min-w-0">
                  {/* SETA DE EXPANSÃO DESTACADA */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(r.id);
                    }}
                    className={`w-7 h-7 !w-7 !h-7 !p-0 p-0 rounded-[4px] flex items-center justify-center transition-all duration-200 border cursor-pointer shrink-0 ${
                      isExpanded
                        ? "bg-[var(--gm-primary)] text-white border-[var(--gm-primary)] scale-105"
                        : "bg-[#1B1B1E] text-[var(--gm-primary)] border-[#26262A] hover:border-[var(--gm-primary)] hover:bg-[var(--gm-primary)]/15 hover:text-white"
                    } active:scale-95`}
                    title={isExpanded ? "Recolher informações do orçamento" : `Expandir detalhes: ${clientDisplayName} • ${budgetTitle}`}
                    aria-expanded={isExpanded}
                  >
                    <ChevronDown
                      size={15}
                      className={`transition-transform duration-300 stroke-[2.5] ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* EMISSÃO 24/08/2026 */}
                  <div
                    onClick={() => toggleRow(r.id)}
                    className="flex items-center gap-1.5 shrink-0 cursor-pointer select-none whitespace-nowrap"
                    title={`Data de Emissão: ${formattedDate}`}
                  >
                    <span className="text-[11px] font-black text-[var(--gm-primary)] uppercase tracking-wider">
                      EMISSÃO
                    </span>
                    <span className="text-xs font-mono tabular-nums font-bold text-white">
                      {formattedDate}
                    </span>
                  </div>

                  <span className="text-white/20 text-xs select-none shrink-0">•</span>

                  {/* CLIENTE: DRA. VANESSA CARLA */}
                  <div
                    onClick={() => toggleRow(r.id)}
                    className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer select-none"
                    title={`Cliente: ${clientDisplayName}`}
                  >
                    <span className="text-[11px] font-black text-[var(--gm-primary)] uppercase tracking-wider shrink-0">
                      CLIENTE:
                    </span>
                    <span className="text-xs font-black text-white uppercase tracking-tight truncate">
                      {clientDisplayName}
                    </span>
                  </div>
                </div>

                {/* CÁPSULAS DE STATUS - ALINHADAS À ESQUERDA */}
                <div className="flex items-center justify-start gap-1.5 w-[470px] shrink-0 pl-8">
                  {STATUS_OPTIONS.map((opt) => {
                    const isActive = currentStatus === opt.value;
                    const activeCls = pillClass(opt.value);
                    const inactiveCls = "bg-[#0B0B0C] border border-[#26262A] text-zinc-400 hover:bg-[#1B1B1E] hover:text-zinc-200";
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatusInstant(r.id, opt.value);
                        }}
                        className={`gm-status-capsule h-7 px-2.5 rounded-[4px] text-[11px] font-extrabold tracking-tight transition-all flex items-center justify-center border cursor-pointer shrink-0 text-center whitespace-nowrap ${
                          isActive ? activeCls : inactiveCls
                        }`}
                        title={`Alterar status para ${opt.label}`}
                      >
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* VALOR TOTAL - AFASTADO PARA A DIREITA E ALINHADO À ESQUERDA */}
                <div
                  onClick={() => toggleRow(r.id)}
                  className="flex items-center justify-start gap-1.5 w-[240px] shrink-0 pl-16 whitespace-nowrap cursor-pointer select-none"
                  title="Valor Total"
                >
                  <span className="text-[11px] font-black text-[var(--gm-primary)] uppercase tracking-wider">
                    VALOR:
                  </span>
                  <span className="text-sm sm:text-base font-black tabular-nums text-white leading-none">
                    {totalFormatted}
                  </span>
                  <span className="text-[11px] font-black text-[var(--gm-primary)] uppercase tracking-wider">
                    TOTAL
                  </span>
                </div>

                {/* BOTÕES DE AÇÃO DISTRIBUÍDOS HORIZONTALMENTE EM UMA LINHA SÓ */}
                <div className="ml-auto flex items-center gap-1 sm:gap-1.5 flex-nowrap justify-end shrink-0 pr-2">
                  {tab !== "LIXEIRA" ? (
                    <>
                      {(isConcluido || tab === "CONCLUIDOS") ? (
                        /* ORÇAMENTOS CONCLUÍDOS: 4 BOTÕES (USAR MODELO, GERAR PDF, WHATSAPP, LIXEIRA) */
                        <>
                          {setDuplicateId && (
                            <button
                              className={listBtnClass("orange")}
                              title="Usar como modelo para novo orçamento"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDuplicateId(r.id);
                              }}
                              type="button"
                            >
                              <Copy size={15} />
                            </button>
                          )}

                          {handlePdf && (
                            <button
                              className={listBtnClass("orange")}
                              title="Baixar PDF"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePdf(r.id, r.tenant_id);
                              }}
                              type="button"
                            >
                              <FileDown size={15} />
                            </button>
                          )}

                          <button
                            className={listBtnClass("green")}
                            title="Enviar via WhatsApp / Compartilhar"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare(r);
                            }}
                            type="button"
                            disabled={sharing === r.id}
                          >
                            {sharing === r.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <WhatsAppIcon size={15} />
                            )}
                          </button>

                          <button
                            className={listBtnClass("red")}
                            title="Mover para Lixeira"
                            onClick={(e) => {
                              e.stopPropagation();
                              softDelete(r.id);
                            }}
                            type="button"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      ) : (
                        /* DEMAIS STATUS: EDITAR, WHATSAPP, PDF, LEMBRETES, LIXEIRA */
                        <>
                          <button
                            className={listBtnClass("orange")}
                            title="Editar Orçamento"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditId(r.id);
                            }}
                            type="button"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            className={listBtnClass("green")}
                            title="Enviar via WhatsApp / Compartilhar"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare(r);
                            }}
                            type="button"
                            disabled={sharing === r.id}
                          >
                            {sharing === r.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <WhatsAppIcon size={15} />
                            )}
                          </button>

                          {handlePdf && (
                            <button
                              className={listBtnClass("orange")}
                              title="Baixar PDF"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePdf(r.id, r.tenant_id);
                              }}
                              type="button"
                            >
                              <FileDown size={15} />
                            </button>
                          )}

                          {setReminderConfigOpen && (
                            <button
                              className={listBtnClass("orange")}
                              title="Lembretes / Programar"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReminderConfigOpen(true);
                              }}
                              type="button"
                            >
                              <Bell size={15} />
                            </button>
                          )}

                          <button
                            className={listBtnClass("red")}
                            title="Mover para Lixeira"
                            onClick={(e) => {
                              e.stopPropagation();
                              softDelete(r.id);
                            }}
                            type="button"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        className={listBtnClass("green")}
                        title="Restaurar Orçamento"
                        onClick={(e) => {
                          e.stopPropagation();
                          restore(r.id);
                        }}
                        type="button"
                      >
                        <RotateCcw size={15} />
                      </button>

                      <button
                        className={listBtnClass("red")}
                        title="Excluir Definitivamente"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmHardDelete(r.id);
                        }}
                        type="button"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* PAINEL DE EXPANSÃO DETALHADO */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-white/10 animate-in fade-in duration-200">
                <ExpandedBudgetRow
                  budgetId={r.id}
                  initialRow={r}
                  tab={tab}
                  onEdit={() => setEditId(r.id)}
                  onShare={() => handleShare(r)}
                  onPdf={handlePdf ? () => handlePdf(r.id, r.tenant_id) : undefined}
                  onDuplicate={setDuplicateId ? () => setDuplicateId(r.id) : undefined}
                  onReminder={setReminderConfigOpen ? () => setReminderConfigOpen(true) : undefined}
                  onDelete={() => softDelete(r.id)}
                  onRestore={() => restore(r.id)}
                  onConfirmHardDelete={() => confirmHardDelete(r.id)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VirtualizedBudgetGrid({
  items,
  highlightedId,
  tab,
  updateStatusInstant,
  setEditId,
  setDuplicateId,
  handleShare,
  sharing,
  handlePdf,
  setReminderConfigOpen,
  softDelete,
  restore,
  confirmHardDelete,
  isMobile,
  stopSignal,
}: {
  items: BudgetRow[];
  highlightedId: string | null;
  tab: TabKey;
  updateStatusInstant: (id: string, status: string) => void;
  setEditId: (id: string) => void;
  setDuplicateId?: (id: string) => void;
  handleShare: (r: BudgetRow) => void;
  sharing: string | null;
  handlePdf: (id: string, tenant_id: string) => void;
  setReminderConfigOpen: (open: boolean) => void;
  softDelete: (id: string) => void;
  restore: (id: string) => void;
  confirmHardDelete: (id: string) => void;
  isMobile: boolean;
  stopSignal?: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8 sm:pb-4">
      {items.map((r) => {
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
            onMouseEnter={() => stopSignal?.(r.id)}
            onTouchStart={() => stopSignal?.(r.id)}
            onClick={() => stopSignal?.(r.id)}
            className={`gm-budget-card bg-[#131315] border-[#26262A] rounded-lg flex flex-col justify-between !p-4 transition-all duration-300 relative ${
              isHighlighted ? "gm-signal-bottom-container" : ""
            }`}
          >
            <SignalBottomGradient
              active={isHighlighted}
              onDismiss={() => stopSignal?.(r.id)}
            />
            {/* HEADER estruturado e equilibrado */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-black truncate text-white text-[15px] sm:text-base tracking-tight uppercase">
                  {(r.client_name || "CLIENTE").toUpperCase()}
                </div>
                <div className="text-xs sm:text-sm truncate mt-0.5 font-bold text-zinc-300">
                  {r.title || "Orçamento"}
                </div>

                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#0B0B0C] border border-[#26262A] text-zinc-200 text-[11px] sm:text-xs font-bold tabular-nums">
                    <Calendar size={13} className="text-[var(--gm-primary)] shrink-0" />
                    <span>{created ? created.toLocaleDateString("pt-BR") : "-"}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#0B0B0C] border border-[#26262A] text-zinc-200 text-[11px] sm:text-xs font-bold tabular-nums">
                    <Clock size={13} className="text-[var(--gm-primary)] shrink-0" />
                    <span>{r.delivery_days ?? 5} dias úteis</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 pl-1">
                <div className="font-black text-[17px] sm:text-[19px] text-[var(--gm-primary)] leading-tight tabular-nums">
                  {CURRENCY.format(Number(r.total_amount || 0))}
                </div>
                <div className="text-[11px] text-zinc-400 font-black uppercase tracking-wider mt-0.5">
                  Total
                </div>
              </div>
            </div>

            {/* FOOTER: cápsulas + 6 botões organizados */}
            <div className="mt-4 pt-3.5 border-t border-[#26262A] flex flex-col gap-2.5">
              {/* Cápsulas de status uniformes */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full">
                {sortedOptions.map((opt) => {
                  const isActive = currentStatus === opt.value;
                  const activeCls = pillClass(opt.value);
                  const inactiveCls =
                    "bg-[#0B0B0C] border border-[#26262A] text-zinc-300 hover:bg-[#1B1B1E] hover:text-white font-bold";

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateStatusInstant(r.id, opt.value);
                      }}
                      className={`gm-status-capsule w-full h-10 sm:h-8 min-h-[40px] sm:min-h-[32px] px-1 rounded-[4px] text-[11px] font-black tracking-tight transition-all truncate flex items-center justify-center border cursor-pointer ${
                        isActive ? activeCls : inactiveCls
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* 6 BOTÕES DE AÇÃO: ÍCONES EM REPOUSO (LARANJA), TROCA PELO NOME COM COR EXCLUSIVA NO HOVER */}
              {(tab as any) !== "LIXEIRA" ? (
                <div className="grid grid-cols-6 gap-1 sm:gap-1.5 w-full mt-1">
                  {/* 1. USAR MODELO - Hover: Laranja vívido (text-orange-400) */}
                  <button
                    type="button"
                    onClick={() => setDuplicateId?.(r.id)}
                    className="gm-grid-action-btn btn-modelo active:scale-95"
                    title="Modelo"
                  >
                    <span className="gm-grid-icon-wrap">
                      <Copy size={17} className="shrink-0" />
                    </span>
                    <span className="gm-grid-label-wrap">
                      <span className="sm:hidden">Mod</span>
                      <span className="hidden sm:inline">Modelo</span>
                    </span>
                  </button>

                  {/* 2. EDITAR - Hover: Âmbar / Amarelo ouro (text-amber-400) */}
                  <button
                    type="button"
                    onClick={() => setEditId(r.id)}
                    className="gm-grid-action-btn btn-editar active:scale-95"
                    title="Editar"
                  >
                    <span className="gm-grid-icon-wrap">
                      <Pencil size={17} className="shrink-0" />
                    </span>
                    <span className="gm-grid-label-wrap">
                      <span className="sm:hidden">Edit</span>
                      <span className="hidden sm:inline">Editar</span>
                    </span>
                  </button>

                  {/* 3. WHATSAPP - Hover: Verde esmeralda (text-emerald-400) */}
                  <button
                    type="button"
                    onClick={() => handleShare(r)}
                    disabled={sharing === r.id}
                    className="gm-grid-action-btn btn-whatsapp active:scale-95 disabled:opacity-50"
                    title="WhatsApp"
                  >
                    <span className="gm-grid-icon-wrap">
                      {sharing === r.id ? (
                        <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <WhatsAppIcon size={17} className="shrink-0" />
                      )}
                    </span>
                    <span className="gm-grid-label-wrap">
                      <span className="sm:hidden">Zap</span>
                      <span className="hidden sm:inline">WhatsApp</span>
                    </span>
                  </button>

                  {/* 4. BAIXAR PDF - Hover: Azul celeste (text-sky-400) */}
                  <button
                    type="button"
                    onClick={() => handlePdf(r.id, r.tenant_id)}
                    className="gm-grid-action-btn btn-baixar active:scale-95"
                    title="Baixar PDF"
                  >
                    <span className="gm-grid-icon-wrap">
                      <FileDown size={17} className="shrink-0" />
                    </span>
                    <span className="gm-grid-label-wrap">
                      <span className="sm:hidden">PDF</span>
                      <span className="hidden sm:inline">Baixar</span>
                    </span>
                  </button>

                  {/* 5. PROGRAMAR LEMBRETES - Hover: Roxo / Violeta neon (text-purple-400) */}
                  <button
                    type="button"
                    onClick={() => setReminderConfigOpen(true)}
                    className="gm-grid-action-btn btn-programar active:scale-95"
                    title="Programar"
                  >
                    <span className="gm-grid-icon-wrap">
                      <Bell size={17} className="shrink-0" />
                    </span>
                    <span className="gm-grid-label-wrap">
                      <span className="sm:hidden">Prog</span>
                      <span className="hidden sm:inline">Programar</span>
                    </span>
                  </button>

                  {/* 6. LIXEIRA - Hover: Vermelho coral (text-red-400) */}
                  <button
                    type="button"
                    onClick={() => softDelete(r.id)}
                    className="gm-grid-action-btn btn-lixeira active:scale-95"
                    title="Lixeira"
                  >
                    <span className="gm-grid-icon-wrap">
                      <Trash2 size={17} className="shrink-0" />
                    </span>
                    <span className="gm-grid-label-wrap">
                      <span className="sm:hidden">Lixo</span>
                      <span className="hidden sm:inline">Lixeira</span>
                    </span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 w-full mt-1">
                  <button
                    type="button"
                    onClick={() => restore(r.id)}
                    className="h-10 rounded-[6px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                    title="Restaurar orçamento"
                  >
                    <RotateCcw size={16} />
                    <span>Restaurar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmHardDelete(r.id)}
                    className="h-10 rounded-[6px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                    title="Excluir definitivamente"
                  >
                    <Trash2 size={16} />
                    <span>Excluir Definitivo</span>
                  </button>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default function Budgets() {
  const { tenantId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [rows, setRows] = useState<BudgetRow[]>(() => (readBudgetsLocal(tenantId) as BudgetRow[]) || []);
  const [loading, setLoading] = useState(false);

  const [tab, setTabState] = useState<TabKey>(() => {
    const saved = localStorage.getItem("gm_budgets_tab");
    if (saved && ["AGUARDANDO", "APROVADO", "CONCLUIDOS", "CANCELADOS", "LIXEIRA"].includes(saved)) {
      return saved as TabKey;
    }
    return "CONCLUIDOS";
  });

  const setTab = (newTab: TabKey) => {
    setTabState(newTab);
    localStorage.setItem("gm_budgets_tab", newTab);
  };

  const [q, setQ] = useState("");

  const currentCalMonth = useMemo(() => new Date().getMonth(), []);
  const [selectedMonth, setSelectedMonthState] = useState<number | "TODOS">(() => {
    const saved = localStorage.getItem("gm_budgets_month");
    if (saved === "TODOS") return "TODOS";
    if (saved !== null && !isNaN(Number(saved))) return Number(saved);
    return new Date().getMonth();
  });

  const setSelectedMonth = (m: number | "TODOS") => {
    setSelectedMonthState(m);
    localStorage.setItem("gm_budgets_month", String(m));
  };

  const [newOpen, setNewOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [reminderConfigOpen, setReminderConfigOpen] = useState(false);
  const [shareData, setShareData] = useState<{ budget: BudgetRow; message: string } | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  
  // Hard delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Modo de visualização (Grade ou Lista)
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try {
      const saved = localStorage.getItem("gm_budgets_view_mode");
      if (saved === "grid" || saved === "list") return saved;
    } catch {}
    return "grid";
  });

  const handleSetViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("gm_budgets_view_mode", mode);
    } catch {}
  };

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
    const viewParam = (params.get("view") || params.get("mode") || "").toLowerCase();
    if (viewParam === "list" || viewParam === "lista" || viewParam === "listas") {
      handleSetViewMode("list");
    } else if (viewParam === "grid" || viewParam === "grade") {
      handleSetViewMode("grid");
    }
  }, [location.search]);

  // Interrompe a sinalização quando o usuário passa o mouse ou clica no orçamento
  const stopSignal = (budgetId: string) => {
    if (highlightedId === budgetId) {
      setHighlightedId(null);
      try {
        sessionStorage.removeItem("gm_signal_item_id");
        sessionStorage.removeItem("gm_signal_item_type");
      } catch {}
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
    }
  };

  // Leva o usuário até o orçamento e ativa a sinalização de degradê inferior contínua
  const processHighlight = (id: string) => {
    if (!id || rows.length === 0) return;
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
      
      // Ativa a sinalização (permanece até clique ou hover do mouse)
      setHighlightedId(id);

      // Leva o usuário suavemente até o container do orçamento centralizado no visor
      const scrollToBudget = () => {
        const element = document.getElementById(`budget-card-${id}`) || document.getElementById(`budget-row-${id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };

      setTimeout(scrollToBudget, 100);
      setTimeout(scrollToBudget, 300);
      setTimeout(scrollToBudget, 650);
    }
  };

  // Escuta evento imediato disparado pelo botão 'Visualizar' na notificação
  useEffect(() => {
    const handleSignal = (e: any) => {
      const detail = e.detail;
      if (detail && detail.id && (detail.type === 'BUDGET' || !detail.type)) {
        processHighlight(detail.id);
      }
    };
    window.addEventListener("gm-signal-item", handleSignal);
    return () => window.removeEventListener("gm-signal-item", handleSignal);
  }, [rows]);

  // Escuta query parameter 'id' e sessionStorage ao entrar ou mudar rota
  useEffect(() => {
    const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    const params = new URLSearchParams(location.search || window.location.search || hashQuery);
    let id = params.get("id");
    if (!id) {
      try {
        const stored = sessionStorage.getItem("gm_signal_item_id");
        const type = sessionStorage.getItem("gm_signal_item_type");
        if (stored && (type === "BUDGET" || !type)) id = stored;
      } catch {}
    }
    if (id && rows.length > 0) {
      processHighlight(id);
    }
  }, [location.search, location.state, rows]);

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
    if (!shareData && !deleteConfirmId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShareData(null);
        setDeleteConfirmId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shareData, deleteConfirmId]);

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
    setLoading(rows.length === 0);
    try {
      let query = supabase.from("budgets").select("*").order("created_at", { ascending: false });
      if (tenantId) query = query.eq("tenant_id", tenantId);
      const { data, error } = await query;

      if (error) {
        const errorMsg = error?.message || String(error);
        const isQuiet = errorMsg.includes("Failed to fetch") || errorMsg.includes("tenant_memberships") || errorMsg.includes("42501");
        if (!isQuiet) {
          console.warn("[Budgets] Erro ao carregar orçamentos remotos:", errorMsg);
        }
        // Fallback para cache local
        const local = readBudgetsLocal(tenantId);
        if (local && local.length > 0) {
          setRows(local as BudgetRow[]);
          syncAlarmsWithBudgets(local);
        }
        return;
      }

      if (data) {
        setRows(data as BudgetRow[]);
        writeBudgetsLocal(data as BudgetRow[], tenantId);
        syncAlarmsWithBudgets(data);
      }
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      const isQuiet = errorMsg.includes("Failed to fetch") || errorMsg.includes("tenant_memberships") || errorMsg.includes("42501");
      if (!isQuiet) {
        console.warn("[Budgets] Erro no carregamento:", errorMsg);
      }
      const local = readBudgetsLocal(tenantId);
      if (local && local.length > 0) {
        setRows(local as BudgetRow[]);
      }
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    const isTrash = tab === "LIXEIRA";
    const base = rows.filter((r) => (isTrash ? !!r.deleted_at : !r.deleted_at));

    let byTab = (() => {
      if (isTrash) return base;
      if (tab === "AGUARDANDO") return base.filter((r) => normalizeStatus(r.status) === "AGUARDANDO");
      if (tab === "APROVADO") return base.filter((r) => normalizeStatus(r.status) === "APROVADO");
      if (tab === "CONCLUIDOS") return base.filter((r) => normalizeStatus(r.status) === "CONCLUIDO");
      if (tab === "CANCELADOS") return base.filter((r) => normalizeStatus(r.status) === "CANCELADO");
      return base;
    })();

    if (selectedMonth !== "TODOS") {
      byTab = byTab.filter((r) => {
        const dateStr = r.created_at || (r as any).updated_at;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getMonth() === selectedMonth;
      });
    }

    if (!needle) return byTab;

    return byTab.filter((r) => {
      const blob = [r.client_name, r.title, r.id, r.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(needle);
    });
  }, [rows, tab, q, selectedMonth]);

  // Total geral de orçamentos na aba ativa (sem filtro de mês)
  const totalInCurrentTab = useMemo(() => {
    const isTrash = tab === "LIXEIRA";
    const base = rows.filter((r) => (isTrash ? !!r.deleted_at : !r.deleted_at));
    if (isTrash) return base.length;
    if (tab === "AGUARDANDO") return base.filter((r) => normalizeStatus(r.status) === "AGUARDANDO").length;
    if (tab === "APROVADO") return base.filter((r) => normalizeStatus(r.status) === "APROVADO").length;
    if (tab === "CONCLUIDOS") return base.filter((r) => normalizeStatus(r.status) === "CONCLUIDO").length;
    if (tab === "CANCELADOS") return base.filter((r) => normalizeStatus(r.status) === "CANCELADO").length;
    return base.length;
  }, [rows, tab]);

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

      // Notificação simultânea nos 2 dispositivos
      if (nextNorm === "APROVADO") {
        broadcastAppNotification(tenantId, {
          title: "✅ Orçamento Aprovado",
          message: `${row?.client_name || "Cliente"} • R$ ${Number(row?.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          type: "budget",
          url: "/budgets",
        });
      } else if (nextNorm === "CONCLUIDO") {
        broadcastAppNotification(tenantId, {
          title: "🎉 Orçamento Concluído",
          message: `${row?.client_name || "Cliente"} foi finalizado com sucesso!`,
          type: "budget",
          url: "/budgets",
        });
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
    if (tone === "orange") return `${base} gm-btn-soft text-[var(--gm-primary)]`;
    if (tone === "green") return `${base} gm-btn-soft text-emerald-500`;
    if (tone === "red") return `${base} gm-btn-soft text-red-500`;
    return `${base} gm-btn-soft`;
  };

  return (
    <Page
      title="Orçamentos"
      actions={
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* SELETOR DE MODO NO CABEÇALHO DO TOPO (FORGE UI SYSTEM) */}
          <div className="flex items-center gap-1 p-1 bg-[#131315] border border-[#26262a] rounded-[4px] h-10">
            <button
              type="button"
              onClick={() => handleSetViewMode("grid")}
              aria-pressed={viewMode === "grid"}
              data-selected={viewMode === "grid"}
              className={`h-8 px-3 rounded-[4px] text-xs font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.96] flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider ${
                viewMode === "grid"
                  ? "gm-viewmode-btn-active !h-8 !px-3 font-bold text-white"
                  : "gm-viewmode-btn-inactive !h-8 !px-3"
              }`}
              title="Visualização em Grade de Cards"
            >
              <LayoutGrid size={14} className={viewMode === "grid" ? "shrink-0 text-white" : "shrink-0"} />
              <span>Grade</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode("list")}
              aria-pressed={viewMode === "list"}
              data-selected={viewMode === "list"}
              className={`h-8 px-3 rounded-[4px] text-xs font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.96] flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider ${
                viewMode === "list"
                  ? "gm-viewmode-btn-active !h-8 !px-3 font-bold text-white"
                  : "gm-viewmode-btn-inactive !h-8 !px-3"
              }`}
              title="Visualização em Listas com Linhas e Setas de Expansão"
            >
              <List size={14} className={viewMode === "list" ? "shrink-0 text-white" : "shrink-0"} />
              <span>Listas</span>
            </button>
          </div>

          {/* BOTÃO PRIMÁRIO: FORGE BUTTON */}
          <button 
            className="forge-btn forge-btn--primary !h-10 !px-4 !rounded-[6px] inline-flex items-center justify-center gap-2 active:scale-[0.96] transition-[transform,background-color,box-shadow] duration-150" 
            type="button" 
            onClick={() => setNewOpen(true)}
            title="Criar Novo Orçamento"
          >
            <span className="gm-plus-icon-wrapper inline-flex items-center justify-center shrink-0">
              <Plus size={16} strokeWidth={2.8} className="w-4 h-4 shrink-0 gm-btn-plus-black" stroke="#0b0b0c" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider">Novo Orçamento</span>
          </button>
        </div>
      }
    >
      {/* ✅ Resumo geral (dado real, calculado a partir de todos os orçamentos ativos) */}
      <div className="mb-6 space-y-4">
        <SectionDivider label="Resumo" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ForgeSpecCard
            id="01"
            title="EM ABERTO"
            status="FILA"
            statusLive={true}
            eyebrow="AGUARDANDO + APROVADO"
            figure={CURRENCY.format(statusSummary.totalAtivo)}
            tags={[
              { label: `${statusSummary.countAtivo} ORÇAMENTO(S)`, accent: true }
            ]}
            onClick={() => setTab("AGUARDANDO")}
          />

          <ForgeSpecCard
            id="02"
            title="CONCLUÍDOS"
            status="PAGO"
            statusLive={true}
            eyebrow="FINALIZADOS COM SUCESSO"
            figure={CURRENCY.format(statusSummary.totalConcluido)}
            tags={[
              { label: `${statusSummary.countConcluido} ORÇAMENTO(S)`, accent: true }
            ]}
            onClick={() => { setTab("CONCLUIDOS"); setSelectedMonth("TODOS"); }}
          />

          <div className="forge-spec">
            <div className="forge-spec__bar">
              <span className="forge-spec__id">03</span>
              <span className="forge-spec__title">VALOR POR STATUS</span>
              <span className="forge-spec__status">GRÁFICO</span>
            </div>
            <div className="forge-spec__body !py-3">
              <div className="h-28 relative overflow-hidden w-full">
                <SafeResponsive height={112}>
                  <BarChart data={statusSummary.chartData} barSize={22} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#888" fontSize={11} tickLine={false} axisLine={false} interval={0} />
                    <YAxis hide domain={[0, (dataMax: number) => (dataMax > 0 ? dataMax * 1.2 : 100)]} />
                    <Tooltip
                      formatter={(val: number) => CURRENCY.format(val)}
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      contentStyle={{ backgroundColor: "#141418", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[2, 2, 0, 0]}>
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
      </div>

      {/* ✅ Tabs + Busca + Divisor Mensal */}
      <div className="mb-6 space-y-4">
        <SectionDivider label="Filtros" />
        {/* ✅ Tabs de Status - Forge Tabs UI (From Uiverse.io by uiverse-astronaut) */}
        <div className="forge-tabs w-full overflow-x-auto no-scrollbar">
          {BUDGET_TABS.map((item, index) => {
            const isActive = tab === item.key;
            const num = String(index + 1).padStart(2, "0");
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  "forge-tabs__tab shrink-0 select-none !bg-transparent !shadow-none !border-0 !rounded-none !outline-none !transform-none",
                  isActive && "is-active !text-white"
                )}
                style={{
                  background: "transparent",
                  backgroundColor: "transparent",
                  boxShadow: "none",
                  border: 0,
                  outline: "none",
                  transform: "none",
                }}
              >
                <span className="forge-tabs__num">{num}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* ✅ Divisor Mensal de Busca (JAN a DEZ) em Container Forge UI */}
        <div
          className="space-y-2.5 p-3.5 rounded-lg bg-[#131315] border border-[#26262A] w-full relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs font-bold text-zinc-300 px-1">
            <span className="flex items-center gap-1.5 text-zinc-100 font-extrabold text-xs sm:text-sm">
              <Calendar size={15} className="text-[var(--gm-primary)]" />
              Filtrar por Mês
            </span>
            {selectedMonth !== "TODOS" ? (
              <span className="text-[var(--gm-primary)] font-extrabold flex items-center gap-1 text-xs">
                {MONTHS.find((m) => m.key === selectedMonth)?.full}{" "}
                {selectedMonth === currentCalMonth && (
                  <span className="text-[11px] uppercase px-1.5 py-0.5 rounded-[4px] bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] border border-[var(--gm-primary)]/30 font-bold ml-1">
                    Mês Atual
                  </span>
                )}
              </span>
            ) : (
              <span className="text-zinc-400 font-semibold text-[11px]">
                Exibindo todos os meses
              </span>
            )}
          </div>
          <div className="grid grid-cols-6 md:grid-cols-13 gap-1 sm:gap-1.5 w-full">
            {MONTHS.map((m) => {
              const isSelected = selectedMonth === m.key;
              const isCurrent = currentCalMonth === m.key;

              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSelectedMonth(m.key)}
                  className={cn(
                    "relative w-full h-8 sm:h-9 rounded-[6px] text-[11px] sm:text-xs tracking-tight flex items-center justify-center gap-1 cursor-pointer select-none transition-colors duration-200 border",
                    isSelected
                      ? "border-transparent bg-transparent text-white font-black"
                      : isCurrent
                      ? "bg-[var(--gm-primary,#FE540B)]/10 border-[var(--gm-primary,#FE540B)]/45 text-orange-400 font-bold hover:bg-[var(--gm-primary,#FE540B)]/15"
                      : "bg-[#0B0B0C] border-[#26262A] text-zinc-300 font-bold hover:border-[#3F3F46] hover:text-white hover:bg-[#1B1B1E]"
                  )}
                  title={`${m.full}${isCurrent ? " (Mês Atual no Calendário)" : ""}`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="active-month-capsule"
                      className="absolute inset-0 rounded-[6px] border-2 border-[var(--gm-primary,#FE540B)] bg-[var(--gm-primary,#FE540B)]/15 pointer-events-none"
                      initial={false}
                      transition={ELASTIC_SPRING}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1">
                    <span>{m.label}</span>
                    {isCurrent && (
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-200",
                          isSelected
                            ? "bg-white"
                            : "bg-[var(--gm-primary,#FE540B)]"
                        )}
                      />
                    )}
                  </span>
                </button>
              );
            })}

            {/* Opção TODOS os meses */}
            <button
              type="button"
              onClick={() => setSelectedMonth("TODOS")}
              className={cn(
                "relative col-span-6 md:col-span-1 w-full h-8 sm:h-9 rounded-[6px] text-[11px] sm:text-xs tracking-tight flex items-center justify-center cursor-pointer select-none transition-colors duration-200 border",
                selectedMonth === "TODOS"
                  ? "border-transparent bg-transparent text-white font-black"
                  : "bg-[#0B0B0C] border-[#26262A] text-zinc-300 font-bold hover:border-[#3F3F46] hover:text-white hover:bg-[#1B1B1E]"
              )}
            >
              {selectedMonth === "TODOS" && (
                <motion.div
                  layoutId="active-month-capsule"
                  className="absolute inset-0 rounded-[6px] border-2 border-[var(--gm-primary,#FE540B)] bg-[var(--gm-primary,#FE540B)]/15 pointer-events-none"
                  initial={false}
                  transition={ELASTIC_SPRING}
                />
              )}
              <span className="relative z-10">TODOS</span>
            </button>
          </div>
        </div>

        {/* ✅ Busca com Visual Padrão Glass Desfocado Apple */}
        <div className="gm-search-apple-glass">
          <Search className="gm-search-icon" size={18} />
          <input
            type="text"
            placeholder={
              tab === "CONCLUIDOS"
                ? "Buscar orçamentos concluídos..."
                : "Buscar por cliente ou valor..."
            }
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

      {/* ✅ Divisor de Seção dos Orçamentos */}
      <SectionDivider label="Orçamentos Cadastrados" />

      {/* ✅ 3 CÁPSULAS VERTICAIS - FORGE UI SYSTEM */}
      <div className="mb-4 flex flex-col gap-2 w-full text-xs text-slate-400">
        {/* CÁPSULA 1: ORÇAMENTOS (X) */}
        <div className="w-full px-4 py-3 min-h-[44px] rounded-[4px] bg-[#131315] border border-[#26262a] text-[#f2f2f3] font-semibold flex items-center justify-between select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-[1px] bg-[var(--gm-primary,#FE540B)]" />
            <FileText size={16} className="text-[var(--gm-primary,#FE540B)]" />
            <span className="text-xs font-semibold text-[#f2f2f3] tracking-wider uppercase font-mono">Orçamentos</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-[2px] bg-[var(--gm-primary,#FE540B)]/15 border border-[var(--gm-primary,#FE540B)]/30 text-[var(--gm-primary,#FE540B)] font-mono font-bold text-xs">
            {filtered.length}
          </span>
        </div>

        {/* CÁPSULA 2: MÊS SET */}
        <div
          onClick={() => {
            if (selectedMonth !== "TODOS") {
              setSelectedMonth("TODOS");
            }
          }}
          className={`w-full px-4 py-3 min-h-[44px] rounded-[4px] bg-[#131315] border border-[#26262a] flex items-center justify-between select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${
            selectedMonth !== "TODOS"
              ? "cursor-pointer hover:border-[#38383f] hover:bg-[#18181b] transition-colors"
              : ""
          }`}
          title={selectedMonth !== "TODOS" ? "Clique para exibir todos os orçamentos" : "Filtrado por mês"}
        >
          <div className="flex items-center gap-2.5">
            <Calendar size={16} className="text-[var(--gm-primary,#FE540B)]" />
            <span className="text-xs font-semibold text-[#8b8b92] uppercase font-mono tracking-wider">
              Mês:{" "}
              <strong className="text-[#f2f2f3] font-bold">
                {selectedMonth === "TODOS" ? "TODOS" : (MONTHS.find((m) => m.key === selectedMonth)?.label || "SET")}
              </strong>
            </span>
          </div>

          {selectedMonth !== "TODOS" ? (
            <span className="text-xs font-mono font-bold text-[var(--gm-primary,#FE540B)] px-2.5 py-0.5 rounded-[2px] bg-[var(--gm-primary,#FE540B)]/15 border border-[var(--gm-primary,#FE540B)]/30 hover:bg-[var(--gm-primary,#FE540B)]/25 transition-colors">
              VER TODOS ({totalInCurrentTab})
            </span>
          ) : (
            <span className="text-xs font-mono font-semibold text-[#8b8b92] px-2.5 py-0.5 rounded-[2px] bg-white/[0.04] border border-white/[0.08]">
              {totalInCurrentTab} orçamentos
            </span>
          )}
        </div>

        {/* CÁPSULA 3: GRADE E LISTA - FORGE BUTTON STYLE */}
        <div className="w-full grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleSetViewMode("grid")}
            aria-pressed={viewMode === "grid"}
            data-selected={viewMode === "grid"}
            className={`w-full h-10 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === "grid"
                ? "gm-viewmode-btn-active !h-10 text-white"
                : "gm-viewmode-btn-inactive !h-10"
            }`}
            title="Visualização em Grade de Cards"
          >
            <LayoutGrid size={15} className={viewMode === "grid" ? "shrink-0 text-white" : "shrink-0"} />
            <span>Grade</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetViewMode("list")}
            aria-pressed={viewMode === "list"}
            data-selected={viewMode === "list"}
            className={`w-full h-10 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === "list"
                ? "gm-viewmode-btn-active !h-10 text-white"
                : "gm-viewmode-btn-inactive !h-10"
            }`}
            title="Visualização em Listas com Linhas e Setas de Expansão"
          >
            <List size={15} className={viewMode === "list" ? "shrink-0 text-white" : "shrink-0"} />
            <span>Listas</span>
          </button>
        </div>
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
        <div className="w-full rounded-lg border border-[#26262A] p-10 sm:p-14 md:p-16 min-h-[240px] sm:min-h-[280px] flex flex-col items-center justify-center text-center gap-4 bg-[#131315] shadow-none select-none">
          <div className="w-12 h-12 rounded-md bg-[#0B0B0C] border border-[#26262A] flex items-center justify-center text-[var(--gm-primary)] shadow-none">
            <Calendar size={22} />
          </div>
          <p className="text-sm sm:text-base text-slate-200 font-semibold leading-relaxed max-w-lg px-4">
            Nenhum orçamento encontrado {selectedMonth !== "TODOS" ? `para ${MONTHS.find(m => m.key === selectedMonth)?.full}.` : "."}
          </p>
          {selectedMonth !== "TODOS" && totalInCurrentTab > 0 && (
            <button
              type="button"
              onClick={() => setSelectedMonth("TODOS")}
              className="forge-btn forge-btn--primary h-10 px-5 rounded-[6px] text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 cursor-pointer mt-1 whitespace-nowrap"
            >
              <Calendar size={15} />
              <span>Ver todos os meses ({totalInCurrentTab} no total)</span>
            </button>
          )}
        </div>
      ) : viewMode === "list" ? (
        <VirtualizedBudgetList
          items={filtered}
          highlightedId={highlightedId}
          expandedRows={expandedRows}
          toggleRow={toggleRow}
          tab={tab}
          updateStatusInstant={updateStatusInstant}
          setEditId={setEditId}
          setDuplicateId={setDuplicateId}
          handleShare={handleShare}
          sharing={sharing}
          softDelete={softDelete}
          restore={restore}
          confirmHardDelete={confirmHardDelete}
          setReminderConfigOpen={setReminderConfigOpen}
          stopSignal={stopSignal}
          handlePdf={handlePdf}
        />
      ) : (
        <VirtualizedBudgetGrid
          items={filtered}
          highlightedId={highlightedId}
          tab={tab}
          updateStatusInstant={updateStatusInstant}
          setEditId={setEditId}
          setDuplicateId={setDuplicateId}
          handleShare={handleShare}
          sharing={sharing}
          handlePdf={handlePdf}
          setReminderConfigOpen={setReminderConfigOpen}
          softDelete={softDelete}
          restore={restore}
          confirmHardDelete={confirmHardDelete}
          isMobile={isMobile}
          stopSignal={stopSignal}
        />
      )}

      {/* ✅ Folga generosa no rodapé da página em relação aos containers finais */}
      <div className="h-32 sm:h-40 w-full shrink-0 pointer-events-none" aria-hidden="true" />

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

      {/* Instance for creating new budget from template (duplicate) */}
      {duplicateId && (
        <NewBudgetModal 
          open={true}
          duplicateFromBudgetId={duplicateId}
          onClose={() => setDuplicateId(null)} 
          onSuccess={() => { setDuplicateId(null); load(); }} 
        />
      )}

      {/* Global Reminder Settings Modal */}
      <ReminderConfigModal 
        open={reminderConfigOpen} 
        onClose={() => setReminderConfigOpen(false)} 
      />

      {/* Share Options Modal */}
      {shareData && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={() => setShareData(null)}>
          <div className="w-full max-w-md rounded-lg overflow-hidden bg-[#131315] border border-[#26262A] shadow-2xl text-white" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#26262A] flex justify-between items-center bg-[#131315]">
              <h3 className="text-lg font-bold text-white">Compartilhar Orçamento</h3>
              <button
                type="button"
                onClick={() => setShareData(null)}
                className="w-9 h-9 rounded-[4px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] text-zinc-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer shrink-0"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 space-y-3">
              <button
                type="button"
                onClick={() => {
                  openWhatsapp("", shareData.message);
                  setShareData(null);
                }}
                className="w-full rounded-[6px] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] hover:border-[#3F3F46] flex items-center gap-3.5 p-3.5 transition-all cursor-pointer text-left"
              >
                <div className="shrink-0 w-10 h-10 rounded-[6px] bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <WhatsAppIcon size={20} className="text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-white leading-tight">WhatsApp</p>
                  <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">Enviar diretamente para um contato</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.open(`mailto:?subject=Orçamento - ${shareData.budget.client_name}&body=${encodeURIComponent(shareData.message)}`, "_blank");
                  setShareData(null);
                }}
                className="w-full rounded-[6px] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] hover:border-[#3F3F46] flex items-center gap-3.5 p-3.5 transition-all cursor-pointer text-left"
              >
                <div className="shrink-0 w-10 h-10 rounded-[6px] bg-[var(--gm-primary)]/15 border border-[var(--gm-primary)]/30 flex items-center justify-center">
                  <Mail size={20} className="text-[var(--gm-primary)]" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-white leading-tight">E-mail</p>
                  <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">Enviar por correio eletrônico</p>
                </div>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareData.message);
                    alert("Texto copiado para a área de transferência!");
                    setShareData(null);
                  } catch (err) {
                    alert("Erro ao copiar texto.");
                  }
                }}
                className="w-full rounded-[6px] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] hover:border-[#3F3F46] flex items-center gap-3.5 p-3.5 transition-all cursor-pointer text-left"
              >
                <div className="shrink-0 w-10 h-10 rounded-[6px] bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                  <Copy size={20} className="text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-white leading-tight">Copiar Texto</p>
                  <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">Copiar para colar em outro lugar</p>
                </div>
              </button>

              {navigator.share && (
                <button
                  type="button"
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
                  className="w-full rounded-[6px] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] hover:border-[#3F3F46] flex items-center gap-3.5 p-3.5 transition-all cursor-pointer text-left"
                >
                  <div className="shrink-0 w-10 h-10 rounded-[6px] bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                    <Share2 size={20} className="text-purple-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white leading-tight">Mais Opções</p>
                    <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">Menu de compartilhamento do sistema</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hard Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[1000] bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteConfirmId(null)}>
          <div className="w-full max-w-sm rounded-lg overflow-hidden bg-[#131315] border border-[#26262A] shadow-2xl relative z-10 text-white" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-md flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <Trash2 size={22} className="text-red-500" />
              </div>
              <h3 className="text-lg font-extrabold text-white mb-2">Excluir Definitivamente?</h3>
              <p className="text-zinc-400 text-xs mb-6 leading-relaxed font-mono">
                Esta ação não pode ser desfeita. O orçamento será removido permanentemente do sistema.
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="forge-btn forge-btn--secondary flex-1 h-10 rounded-[6px] text-xs uppercase tracking-wider font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <X size={14} />
                  <span>Cancelar</span>
                </button>
                <button
                  type="button"
                  onClick={hardDelete}
                  className="forge-btn bg-red-600 hover:bg-red-500 border border-red-600 text-white flex-1 h-10 rounded-[6px] text-xs uppercase tracking-wider font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Trash2 size={14} />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
