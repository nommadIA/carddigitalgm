
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
import { broadcastAppNotification } from "../lib/syncHub";
import { generateOrcamentoPdf } from "../services/pdfService";
import { buildWhatsappMessage, openWhatsapp } from "../services/whatsApp";
import { useLocation, useNavigate } from "react-router-dom";
import NewBudgetModal from "./budgets/NewBudgetModal";
import ReminderConfigModal from "../components/budgets/ReminderConfigModal";
import ExpandedBudgetRow from "../components/budgets/ExpandedBudgetRow";
import { SignalBottomGradient } from "../components/ui/SignalBottomGradient";
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
    const base = "gm-budget-action-btn fora w-7.5 h-7.5 sm:w-8 sm:h-8 !p-0 flex items-center justify-center shrink-0 rounded-xl transition-all duration-200 cursor-pointer border";
    if (tone === "orange") return `${base} border-[var(--gm-primary)]/40 text-[var(--gm-primary)] bg-white/[0.02] hover:bg-[var(--gm-primary)] hover:text-white hover:border-[var(--gm-primary)] shadow-none hover:scale-105 active:scale-95`;
    if (tone === "green") return `${base} border-emerald-500/40 text-emerald-400 bg-white/[0.02] hover:bg-emerald-500 hover:text-white hover:border-emerald-500 shadow-none hover:scale-105 active:scale-95`;
    if (tone === "red") return `${base} border-red-500/40 text-red-400 bg-white/[0.02] hover:bg-red-500 hover:text-white hover:border-red-500 shadow-none hover:scale-105 active:scale-95`;
    return `${base} border-[var(--gm-primary)]/40 text-[var(--gm-primary)] bg-white/[0.02] hover:bg-white/15 hover:text-white hover:border-white/30 shadow-none hover:scale-105 active:scale-95`;
  };

  if (!items || items.length === 0) {
    return (
      <div className="w-full fora rounded-2xl border border-white/10 p-10 sm:p-14 md:p-16 min-h-[220px] sm:min-h-[260px] flex flex-col items-center justify-center text-center gap-4 bg-white/[0.02] backdrop-blur-md shadow-none select-none">
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
        <div className="flex items-center justify-between gap-4 min-w-[940px] xl:min-w-0 w-full px-4 py-2 text-xs font-black uppercase tracking-wider select-none bg-white/[0.02] border border-white/5 rounded-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 shrink-0">
            <span className="w-7 text-center text-slate-400">EXP.</span>
            <span className="w-28 text-left text-[var(--gm-primary)] font-black">EMISSÃO</span>
            <span className="text-left text-[var(--gm-primary)] font-black">CLIENTE</span>
          </div>
          <div className="text-center flex-1">
            <span className="text-[var(--gm-primary)] font-black">STATUS DO ORÇAMENTO</span>
          </div>
          <div className="text-center shrink-0 w-36">
            <span className="text-[var(--gm-primary)] font-black">VALOR TOTAL</span>
          </div>
          <div className="text-right shrink-0 pr-1 min-w-[170px]">
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
            className={`gm-budget-row barra rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 transition-all duration-200 relative border border-white/10 hover:border-white/20 hover:bg-white/[0.03] !min-h-0 min-h-0 h-auto !h-auto ${
              isHighlighted ? "gm-signal-bottom-container" : ""
            }`}
          >
            <SignalBottomGradient
              active={isHighlighted}
              onDismiss={() => stopSignal?.(r.id)}
            />

            {/* LINHA PRINCIPAL DA BARRA EM UMA LINHA SÓ */}
            <div className="w-full overflow-x-auto no-scrollbar">
              <div className="flex items-center justify-between gap-3 sm:gap-4 min-w-[940px] xl:min-w-0 w-full min-h-0 py-0.5">
                {/* IDENTIFICAÇÃO: EXPANSÃO + EMISSÃO + CLIENTE (EM UMA LINHA SÓ) */}
                <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
                  {/* SETA DE EXPANSÃO DESTACADA */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(r.id);
                    }}
                    className={`w-7 h-7 !w-7 !h-7 !p-0 p-0 rounded-lg flex items-center justify-center transition-all duration-200 border cursor-pointer shrink-0 backdrop-blur-md ${
                      isExpanded
                        ? "bg-[var(--gm-primary)] text-white border-[var(--gm-primary)] shadow-[0_0_12px_rgba(246,90,26,0.6)] scale-105"
                        : "bg-white/[0.06] text-[var(--gm-primary)] border-white/15 hover:border-[var(--gm-primary)] hover:bg-[var(--gm-primary)]/15 hover:text-white"
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
                    <span className="text-[10px] sm:text-[11px] font-black text-[var(--gm-primary)] uppercase tracking-wider">
                      EMISSÃO
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {formattedDate}
                    </span>
                  </div>

                  <span className="text-white/20 text-xs select-none">•</span>

                  {/* CLIENTE: DRA. VANESSA CARLA */}
                  <div
                    onClick={() => toggleRow(r.id)}
                    className="flex items-center gap-1.5 min-w-0 max-w-[190px] sm:max-w-[240px] xl:max-w-[300px] cursor-pointer select-none"
                    title={`Cliente: ${clientDisplayName}`}
                  >
                    <span className="text-[10px] sm:text-[11px] font-black text-[var(--gm-primary)] uppercase tracking-wider shrink-0">
                      CLIENTE:
                    </span>
                    <span className="text-xs font-black text-white uppercase tracking-tight truncate">
                      {clientDisplayName}
                    </span>
                  </div>
                </div>

                {/* CÁPSULAS DE STATUS */}
                <div className="flex items-center justify-center gap-1.5 shrink-0 px-1">
                  {STATUS_OPTIONS.map((opt) => {
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
                        className={`gm-status-capsule fora h-6.5 sm:h-7 px-2 sm:px-2.5 rounded-full text-[9.5px] sm:text-[10px] font-extrabold tracking-tight transition-all flex items-center justify-center border cursor-pointer shrink-0 text-center whitespace-nowrap ${
                          isActive ? activeCls : inactiveCls
                        }`}
                        title={`Alterar status para ${opt.label}`}
                      >
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* VALOR: R$ 450,00 TOTAL */}
                <div
                  onClick={() => toggleRow(r.id)}
                  className="flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer select-none"
                  title="Valor Total"
                >
                  <span className="text-[10px] sm:text-[11px] font-black text-[var(--gm-primary)] uppercase tracking-wider">
                    VALOR:
                  </span>
                  <span className="text-sm sm:text-base font-black text-white leading-none">
                    {totalFormatted}
                  </span>
                  <span className="text-[9.5px] font-black text-[var(--gm-primary)] uppercase tracking-wider">
                    TOTAL
                  </span>
                </div>

                {/* BOTÕES DE AÇÃO DISTRIBUÍDOS HORIZONTALMENTE EM UMA LINHA SÓ */}
                <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap justify-end shrink-0">
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
            className={`gm-budget-card barra flex flex-col justify-between !p-4 transition-all duration-300 relative ${
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
                <div className="text-xs sm:text-sm truncate mt-0.5 font-medium text-slate-300">
                  {r.title || "Orçamento"}
                </div>

                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300 text-[11px] sm:text-xs font-semibold">
                    <Calendar size={13} className="text-[var(--gm-primary)] shrink-0" />
                    <span>{created ? created.toLocaleDateString("pt-BR") : "-"}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300 text-[11px] sm:text-xs font-semibold">
                    <Clock size={13} className="text-[var(--gm-primary)] shrink-0" />
                    <span>{r.delivery_days ?? 5} dias úteis</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 pl-1">
                <div className="font-black text-[17px] sm:text-[19px] text-[var(--gm-primary)] leading-tight">
                  {CURRENCY.format(Number(r.total_amount || 0))}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">
                  Total
                </div>
              </div>
            </div>

            {/* FOOTER: cápsulas + 6 botões organizados */}
            <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-col gap-2.5">
              {/* Cápsulas de status uniformes */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full">
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
                      className={`gm-status-capsule fora w-full h-7 sm:h-7.5 px-1 rounded-full text-[9.5px] sm:text-[10.5px] font-extrabold tracking-tight transition-all truncate flex items-center justify-center border ${
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
                    className="h-11 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer active:scale-95"
                    title="Restaurar orçamento"
                  >
                    <RotateCcw size={16} />
                    <span>Restaurar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmHardDelete(r.id)}
                    className="h-11 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all cursor-pointer active:scale-95"
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

  const [rows, setRows] = useState<BudgetRow[]>([]);
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
          {/* SELETOR DE MODO NO CABEÇALHO DO TOPO (SEM CONTAINER MODAL POR TRÁS) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSetViewMode("grid")}
              className={`h-11 sm:h-12 px-4 sm:px-5 rounded-2xl text-xs font-black transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                viewMode === "grid"
                  ? "gm-viewmode-btn-active"
                  : "gm-viewmode-btn-inactive"
              } active:scale-95`}
              title="Visualização em Grade de Cards"
            >
              <LayoutGrid size={16} className={viewMode === "grid" ? "text-white" : "text-[var(--gm-primary)]"} />
              <span className="text-white">Grade</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode("list")}
              className={`h-11 sm:h-12 px-4 sm:px-5 rounded-2xl text-xs font-black transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                viewMode === "list"
                  ? "gm-viewmode-btn-active"
                  : "gm-viewmode-btn-inactive"
              } active:scale-95`}
              title="Visualização em Listas com Linhas e Setas de Expansão"
            >
              <List size={16} className={viewMode === "list" ? "text-white" : "text-[var(--gm-primary)]"} />
              <span className="text-white">Listas</span>
            </button>
          </div>

          <button className="gm-btn fora h-11 sm:h-12 text-xs uppercase tracking-wider font-extrabold" type="button" onClick={() => setNewOpen(true)}>
            <Plus size={16} />
            Novo Orçamento
          </button>
        </div>
      }
    >
      {/* ✅ Resumo geral (dado real, calculado a partir de todos os orçamentos ativos) */}
      <div className="mb-6 space-y-4">
        <SectionDivider label="Resumo" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div 
            onClick={() => setTab("AGUARDANDO")}
            className="gm-dashboard-card barra rounded-2xl p-5 cursor-pointer hover:border-[var(--gm-primary)]/40 transition-all active:scale-[0.99]"
            title="Clique para ver os orçamentos em aberto"
          >
            <div className="text-xs font-bold text-[color:var(--gm-text-tertiary)] uppercase tracking-wider">
              Em aberto (aguardando + aprovado)
            </div>
            <div className="text-2xl font-extrabold text-[color:var(--gm-text)] mt-1.5">
              {CURRENCY.format(statusSummary.totalAtivo)}
            </div>
            <div className="text-xs text-[color:var(--gm-text-tertiary)] mt-1">{statusSummary.countAtivo} orçamento(s)</div>
          </div>

          <div 
            onClick={() => { setTab("CONCLUIDOS"); setSelectedMonth("TODOS"); }}
            className="gm-dashboard-card barra rounded-2xl p-5 cursor-pointer hover:border-emerald-500/40 transition-all active:scale-[0.99]"
            title="Clique para ver todos os orçamentos concluídos"
          >
            <div className="text-xs font-bold text-[color:var(--gm-text-tertiary)] uppercase tracking-wider">
              Concluídos
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1.5">
              {CURRENCY.format(statusSummary.totalConcluido)}
            </div>
            <div className="text-xs text-[color:var(--gm-text-tertiary)] mt-1">{statusSummary.countConcluido} orçamento(s)</div>
          </div>

          <div className="gm-dashboard-card barra rounded-2xl p-5 sm:col-span-1 col-span-1 overflow-hidden">
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
                    contentStyle={{ backgroundColor: "rgba(18, 18, 22, 0.85)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#fff", fontSize: 12, backdropFilter: "blur(12px)" }}
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

      {/* ✅ Tabs + Busca + Divisor Mensal */}
      <div className="mb-6 space-y-4">
        <SectionDivider label="Filtros" />
        <DraggableScroll className="pb-1">
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
                className={`gm-filter-tab fora snap-start shrink-0 w-[110px] h-8 rounded-full text-[11px] font-extrabold tracking-tight transition-all whitespace-nowrap flex items-center justify-center border ${
                  active ? activeCls : inactiveCls
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
            className={`gm-filter-tab fora snap-start shrink-0 w-[110px] h-8 rounded-full text-[11px] font-extrabold tracking-tight transition-all whitespace-nowrap flex items-center justify-center border ${
              tab === "LIXEIRA"
                ? pillClass("CANCELADO")
                : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200"
            }`}
          >
            LIXEIRA
          </button>
        </DraggableScroll>

        {/* ✅ Divisor Mensal de Busca (JAN a DEZ) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Calendar size={13} className="text-[var(--gm-primary)]" />
              Filtrar por Mês
            </span>
            {selectedMonth !== "TODOS" && (
              <span className="text-[var(--gm-primary)] font-extrabold flex items-center gap-1">
                {MONTHS.find((m) => m.key === selectedMonth)?.full}{" "}
                {selectedMonth === currentCalMonth && (
                  <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] border border-[var(--gm-primary)]/30 font-bold ml-1">
                    Mês Atual
                  </span>
                )}
              </span>
            )}
          </div>
          <DraggableScroll className="pb-1">
            {MONTHS.map((m) => {
              const isSelected = selectedMonth === m.key;
              const isCurrent = currentCalMonth === m.key;

              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSelectedMonth(m.key)}
                  className={`gm-filter-tab fora relative snap-start shrink-0 px-3.5 h-8 rounded-xl text-[11px] font-extrabold tracking-tight transition-all whitespace-nowrap flex items-center justify-center gap-1.5 border cursor-pointer ${
                    isSelected
                      ? "bg-[var(--gm-primary)] border-[var(--gm-primary)] text-white shadow-lg shadow-[var(--gm-primary)]/20"
                      : isCurrent
                      ? "bg-[var(--gm-primary)]/10 border-[var(--gm-primary)]/40 text-[var(--gm-primary)] hover:bg-[var(--gm-primary)]/20"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                  }`}
                  title={`${m.full}${isCurrent ? " (Mês Atual no Calendário)" : ""}`}
                >
                  <span>{m.label}</span>
                  {isCurrent && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? "bg-white" : "bg-[var(--gm-primary)] animate-pulse"
                      }`}
                    />
                  )}
                </button>
              );
            })}

            {/* Opção TODOS os meses */}
            <button
              type="button"
              onClick={() => setSelectedMonth("TODOS")}
              className={`gm-filter-tab fora snap-start shrink-0 px-4 h-8 rounded-xl text-[11px] font-extrabold tracking-tight transition-all whitespace-nowrap flex items-center justify-center border cursor-pointer ${
                selectedMonth === "TODOS"
                  ? "bg-[var(--gm-primary)] border-[var(--gm-primary)] text-white shadow-lg shadow-[var(--gm-primary)]/20"
                  : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              TODOS
            </button>
          </DraggableScroll>
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

      {/* ✅ 3 CÁPSULAS VERTICAIS PEGANDO A EXTREMIDADE DA TELA DO APP */}
      <div className="mb-4 flex flex-col gap-2.5 w-full text-xs text-slate-400">
        {/* CÁPSULA 1: ORÇAMENTOS (X) - 100% LARGURA PEGANDO AS EXTREMIDADES DA TELA */}
        <div className="w-full px-4 py-3 rounded-2xl gm-search-glass text-white font-extrabold flex items-center justify-between shadow-lg select-none">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--gm-primary)] animate-pulse shadow-[0_0_8px_var(--gm-primary)]" />
            <FileText size={18} className="text-[var(--gm-primary)]" />
            <span className="text-sm font-black text-white tracking-tight uppercase">Orçamentos</span>
          </div>
          <span className="px-3 py-1 rounded-xl bg-[var(--gm-primary)]/20 border border-[var(--gm-primary)]/40 text-[var(--gm-primary)] font-black text-xs sm:text-sm">
            ({filtered.length})
          </span>
        </div>

        {/* CÁPSULA 2: MÊS SET (VER TODOS OS 55) - 100% LARGURA PEGANDO AS EXTREMIDADES DA TELA */}
        <div
          onClick={() => {
            if (selectedMonth !== "TODOS") {
              setSelectedMonth("TODOS");
            }
          }}
          className={`w-full px-4 py-3 rounded-2xl gm-search-glass flex items-center justify-between shadow-lg select-none ${
            selectedMonth !== "TODOS"
              ? "cursor-pointer hover:border-[var(--gm-primary)]/50 active:scale-[0.99]"
              : ""
          }`}
          title={selectedMonth !== "TODOS" ? "Clique para exibir todos os orçamentos" : "Filtrado por mês"}
        >
          <div className="flex items-center gap-2.5">
            <Calendar size={18} className="text-[var(--gm-primary)]" />
            <span className="text-xs sm:text-sm font-bold text-slate-200">
              Mês:{" "}
              <strong className="text-[var(--gm-primary)] font-black uppercase text-sm">
                {selectedMonth === "TODOS" ? "TODOS" : (MONTHS.find((m) => m.key === selectedMonth)?.label || "SET")}
              </strong>
            </span>
          </div>

          {selectedMonth !== "TODOS" ? (
            <span className="text-xs font-black text-[var(--gm-primary)] px-3 py-1 rounded-xl bg-[var(--gm-primary)]/15 border border-[var(--gm-primary)]/30 hover:bg-[var(--gm-primary)]/25 transition-colors">
              (Ver todos os {totalInCurrentTab})
            </span>
          ) : (
            <span className="text-xs font-extrabold text-slate-400 px-3 py-1 rounded-xl bg-white/5 border border-white/10">
              ({totalInCurrentTab} orçamentos)
            </span>
          )}
        </div>

        {/* CÁPSULA 3: GRADE E LISTA - SEM CONTAINER MODAL POR TRÁS */}
        <div className="w-full grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleSetViewMode("grid")}
            className={`w-full py-3.5 rounded-2xl text-xs sm:text-sm font-black transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === "grid"
                ? "gm-viewmode-btn-active scale-100"
                : "gm-viewmode-btn-inactive"
            } active:scale-95`}
            title="Visualização em Grade de Cards"
          >
            <LayoutGrid size={18} className={viewMode === "grid" ? "text-white" : "text-[var(--gm-primary)]"} />
            <span className="text-white">Grade</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetViewMode("list")}
            className={`w-full py-3.5 rounded-2xl text-xs sm:text-sm font-black transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === "list"
                ? "gm-viewmode-btn-active scale-100"
                : "gm-viewmode-btn-inactive"
            } active:scale-95`}
            title="Visualização em Listas com Linhas e Setas de Expansão"
          >
            <List size={18} className={viewMode === "list" ? "text-white" : "text-[var(--gm-primary)]"} />
            <span className="text-white">Listas</span>
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
        <div className="w-full fora rounded-2xl border border-white/10 p-10 sm:p-14 md:p-16 min-h-[240px] sm:min-h-[280px] flex flex-col items-center justify-center text-center gap-4 bg-white/[0.02] backdrop-blur-md shadow-none select-none">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--gm-primary)] shadow-none">
            <Calendar size={22} />
          </div>
          <p className="text-sm sm:text-base text-slate-200 font-semibold leading-relaxed max-w-lg px-4">
            Nenhum orçamento encontrado {selectedMonth !== "TODOS" ? `para ${MONTHS.find(m => m.key === selectedMonth)?.full}.` : "."}
          </p>
          {selectedMonth !== "TODOS" && totalInCurrentTab > 0 && (
            <button
              type="button"
              onClick={() => setSelectedMonth("TODOS")}
              className="gm-btn bg-[var(--gm-primary)] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 hover:opacity-90 transition-all shadow-md active:scale-95 cursor-pointer mt-1"
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
