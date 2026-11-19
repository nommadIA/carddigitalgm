import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/AuthContext";
import { broadcastAppNotification } from "../lib/syncHub";
import { Page } from "../components/ui/Page";
import { Grid } from "../components/ui/Grid";
import { Card } from "../components/ui/Card";
import { SignalBottomGradient } from "../components/ui/SignalBottomGradient";
import { SectionDivider } from "../components/ui/SectionDivider";
import { motion, AnimatePresence } from "motion/react";
import { usePlanAccess } from "../hooks/usePlanAccess";
import PlanLockedNotice from "../components/plans/PlanLockedNotice";
import { PlanId } from "../lib/subscriptionPlans";
import {
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  Edit2,
  X,
  Save,
  Clock,
  GripHorizontal,
  Palette,
  Share2,
  Download,
  CornerRightDown,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Copy,
  Mail,
  Calendar,
  Image as ImageIcon,
  Loader2,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Highlighter,
  Upload,
  Type,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Eraser,
  FileText,
  SlidersHorizontal,
  User,
  Sliders,
  Sparkles,
  Undo2,
  Redo2,
} from "lucide-react";
import { Note } from "../types";
import { generateNotePdf } from "../services/pdfService";

export const HIGHLIGHT_COLORS = [
  { hex: "#fef08a", label: "Amarelo Flúor" },
  { hex: "#fde047", label: "Amarelo Ouro" },
  { hex: "#bbf7d0", label: "Verde Menta" },
  { hex: "#86efac", label: "Verde Lima" },
  { hex: "#cffafe", label: "Azul Celeste" },
  { hex: "#7dd3fc", label: "Ciano Piscina" },
  { hex: "#fbcfe8", label: "Rosa Pastel" },
  { hex: "#f472b6", label: "Rosa Choque" },
  { hex: "#fed7aa", label: "Laranja Suave" },
  { hex: "#e9d5ff", label: "Roxo Lavanda" },
];

export const TEXT_COLORS = [
  { hex: "#ffffff", label: "Branco" },
  { hex: "#ef4444", label: "Vermelho" },
  { hex: "#f97316", label: "Laranja" },
  { hex: "#eab308", label: "Amarelo" },
  { hex: "#22c55e", label: "Verde" },
  { hex: "#06b6d4", label: "Ciano" },
  { hex: "#3b82f6", label: "Azul Royal" },
  { hex: "#a855f7", label: "Roxo" },
  { hex: "#ec4899", label: "Rosa" },
  { hex: "#cbd5e1", label: "Cinza Claro" },
];

export function parseLayoutUrls(val?: string | null): string[] {
  if (!val) return [];
  const trimmed = val.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean).slice(0, 6);
    } catch (e) {}
  }
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export function serializeLayoutUrls(urls: string[]): string {
  const valid = urls.map((u) => u.trim()).filter(Boolean).slice(0, 6);
  if (valid.length === 0) return "";
  if (valid.length === 1) return valid[0];
  return valid.join(",");
}

const NOTE_STATUSES = ["A FAZER", "PRODUÇÃO", "CONCLUÍDOS", "LIXEIRA"];
const PROD_STATUSES = ["A FAZER", "PRODUÇÃO", "CONCLUÍDOS", "LIXEIRA"];
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { WhatsAppIcon } from "../components/ui/WhatsAppIcon";
import {
  addAlarmsForBudget,
  toggleAlarmsForBudget,
  checkAlarms,
  removeAlarmsForBudget,
  syncAlarmsWithNotes,
} from "../lib/alarmSystem";
import { uploadNoteAsset } from "../services/storageService";
import imageCompression from "browser-image-compression";
import { GlassTimePicker } from "../components/ui/GlassTimePicker";
import { GlassDatePicker } from "../components/ui/GlassDatePicker";
import { openWhatsapp } from "../services/whatsApp";

import jsPDF from "jspdf";

const cardBase =
  "relative rounded-lg border border-[#26262A] bg-[#131315] overflow-hidden transition-all";
const inputBase =
  "w-full gm-input rounded-[4px] px-4 py-3 text-sm text-[color:var(--gm-text)] placeholder-zinc-500 focus:outline-none focus:border-[color:var(--gm-primary)] transition-all border border-[#26262A] bg-[#0B0B0C]";

function htmlToPlainFormatedText(html: string): string {
  if (!html) return "";

  if (typeof document === "undefined") {
    // Fallback if not inside a browser
    let text = html.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<\/div>/gi, "\n");
    text = text.replace(/<\/p>/gi, "\n");
    text = text.replace(/<[^>]+>/g, "");
    return text.trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const body = doc.body;

  function convertNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toUpperCase();

      if (tagName === "BR") {
        return "\n";
      }

      let isBold = ["B", "STRONG"].includes(tagName);
      let isItalic = ["I", "EM"].includes(tagName);

      const style = el.getAttribute("style") || "";
      if (style) {
        if (/font-weight:\s*(bold|700|800|900)/i.test(style)) {
          isBold = true;
        }
        if (/font-style:\s*italic/i.test(style)) {
          isItalic = true;
        }
        if (/font-family:\s*['"]?Caveat['"']?/i.test(style)) {
          isItalic = true; // map cursive font to italic for messaging markdown
        }
      }

      let innerText = "";
      el.childNodes.forEach((child) => {
        innerText += convertNode(child);
      });

      // If it's a block-level HTML element, make sure it has proper flow
      const isBlock = ["DIV", "P"].includes(tagName);
      if (isBlock) {
        if (innerText && !innerText.endsWith("\n")) {
          innerText += "\n";
        }
      }

      // Apply formatting around the non-whitespace "core" portion
      // This is crucial for WhatsApp markdown, which fails if spaces are immediately inside the wrappers
      if (isBold || isItalic) {
        const match = innerText.match(/^(\s*)([\s\S]*?)(\s*)$/);
        if (match) {
          const leading = match[1];
          let core = match[2];
          const trailing = match[3];

          if (core) {
            if (isBold) {
              core = `*${core}*`;
            }
            if (isItalic) {
              core = `_${core}_`;
            }
          }
          return leading + core + trailing;
        }
      }

      return innerText;
    }

    return "";
  }

  let finalTxt = "";
  body.childNodes.forEach((child) => {
    finalTxt += convertNode(child);
  });

  return finalTxt.trim();
}

export default function Notes() {
  const { tenantId, user } = useAuth();
  const { subscription, canAccess, checkQuota, isExpired } = usePlanAccess();
  const notesAccess = canAccess("notes");
  const alarmsAccess = canAccess("alarms");
  const [lockModal, setLockModal] = useState<{
    title: string;
    reason?: string;
    requiredPlan?: PlanId;
  } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [mainTab, setMainTab] = useState<"ALL" | "NOTE" | "PRODUCTION">("ALL");
  const [noteTab, setNoteTab] = useState<
    "A FAZER" | "PRODUÇÃO" | "CONCLUÍDOS" | "LIXEIRA"
  >("A FAZER");
  const [newNoteModalOpen, setNewNoteModalOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Interrompe a sinalização quando o usuário passa o mouse ou clica na nota
  const stopSignal = (noteId: string) => {
    if (highlightedId === noteId) {
      setHighlightedId(null);
      try {
        sessionStorage.removeItem("gm_signal_item_id");
        sessionStorage.removeItem("gm_signal_item_type");
      } catch {}
      const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
      const params = new URLSearchParams(location.search || window.location.search || hashQuery);
      if (params.has("id")) {
        params.delete("id");
        const newSearch = params.toString();
        const baseHash = window.location.hash.split('?')[0];
        if (window.location.hash.includes('?id=')) {
          window.location.hash = newSearch ? `${baseHash}?${newSearch}` : baseHash;
        } else {
          window.history.replaceState({}, '', window.location.pathname + (newSearch ? `?${newSearch}` : ''));
        }
      }
    }
  };

  // Leva o usuário até a nota e ativa a sinalização contínua de degradê inferior
  const processHighlight = (id: string) => {
    if (!id || notes.length === 0) return;
    const noteToOpen = notes.find((n) => n.id === id);
    if (noteToOpen) {
      // Ajusta abas para que a nota esteja visível
      const typeStr = (noteToOpen.type || "note").toUpperCase();
      if (typeStr === "PRODUCTION" || typeStr === "PRODUÇÃO") {
        setMainTab("PRODUCTION");
      } else {
        setMainTab("NOTE");
      }

      if (noteToOpen.deleted_at) {
        setNoteTab("LIXEIRA");
      } else {
        const normStatus = normalizeStatus(noteToOpen.status || "a fazer");
        if (normStatus === "PRODUCAO" || normStatus === "EM PRODUCAO") {
          setNoteTab("PRODUÇÃO");
        } else if (normStatus === "CONCLUIDOS" || normStatus === "CONCLUIDO") {
          setNoteTab("CONCLUÍDOS");
        } else {
          setNoteTab("A FAZER");
        }
      }

      // Ativa o sinalizador da nota (permanece até clique ou hover do mouse)
      setHighlightedId(id);

      // Leva o usuário suavemente até a nota centralizada no visor
      const scrollToTarget = () => {
        const element = document.getElementById(`note-card-${id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };

      setTimeout(scrollToTarget, 100);
      setTimeout(scrollToTarget, 300);
      setTimeout(scrollToTarget, 650);
    }
  };

  // Escuta evento imediato disparado pelo botão 'Visualizar' na notificação
  useEffect(() => {
    const handleSignal = (e: any) => {
      const detail = e.detail;
      if (detail && detail.id && (detail.type === 'NOTE' || !detail.type)) {
        processHighlight(detail.id);
      }
    };
    window.addEventListener("gm-signal-item", handleSignal);
    return () => window.removeEventListener("gm-signal-item", handleSignal);
  }, [notes]);

  // Escuta URL e sessionStorage para sinalizar nota
  useEffect(() => {
    const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    const params = new URLSearchParams(location.search || window.location.search || hashQuery);
    let id = params.get("id");
    if (!id) {
      try {
        const stored = sessionStorage.getItem("gm_signal_item_id");
        const type = sessionStorage.getItem("gm_signal_item_type");
        if (stored && (type === "NOTE" || !type)) id = stored;
      } catch {}
    }
    if (id && notes.length > 0) {
      processHighlight(id);
    }
  }, [location.search, location.state, notes]);

  // Clean up URL parameter when the editor modal is closed
  useEffect(() => {
    if (!modalOpen) {
      const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
      const params = new URLSearchParams(location.search || window.location.search || hashQuery);
      if (params.has("id")) {
        params.delete("id");
        const newSearch = params.toString();
        
        // Clear from hash directly if it was part of the hash to ensure HashRouter syncs
        if (window.location.hash.includes('?id=')) {
          const baseHash = window.location.hash.split('?')[0];
          window.location.hash = newSearch ? `${baseHash}?${newSearch}` : baseHash;
        } else {
          navigate(
            {
              pathname: location.pathname,
              search: newSearch ? `?${newSearch}` : "",
            },
            { replace: true }
          );
        }
      }
    }
  }, [modalOpen, location.pathname, location.search, navigate]);

  // Note Form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("#334155"); // default slate-800 format
  const [isPinned, setIsPinned] = useState(false);
  const [reminderTime, setReminderTime] = useState(""); // e.g. "14:30"
  const [reminderTime2, setReminderTime2] = useState(""); // Second alarm
  const [reminderTime3, setReminderTime3] = useState(""); // Third alarm
  const [clocksExpanded, setClocksExpanded] = useState(false); // expands upwards
  const [reminderDate, setReminderDate] = useState(""); // e.g. "2026-05-20"
  const [noteType, setNoteType] = useState<"note" | "production">("note");
  const [noteStatus, setNoteStatus] = useState("a fazer");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [layoutUrls, setLayoutUrls] = useState<string[]>([]);
  const [layoutUrlInput, setLayoutUrlInput] = useState("");
  const [uploadingLayout, setUploadingLayout] = useState(false);
  const isUploadingPasteRef = useRef(false);
  const layoutUrl = serializeLayoutUrls(layoutUrls);
  const [noteShareData, setNoteShareData] = useState<{
    note: Note;
    message: string;
  } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const saveCurrentSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (
        contentRef.current &&
        contentRef.current.contains(range.commonAncestorContainer)
      ) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  };

  const restoreSelection = () => {
    if (!savedRangeRef.current) return;
    const sel = window.getSelection();
    if (sel) {
      try {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current.cloneRange());
      } catch (e) {
        // Range might have become detached, ignore
      }
    }
  };

  const [selectedTextColor, setSelectedTextColor] = useState("#ffffff");
  const [selectedHighlightColor, setSelectedHighlightColor] = useState("#fef08a");
  const [fontSizeMode, setFontSizeMode] = useState<"P" | "M" | "G">("M");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [highlighterPickerOpen, setHighlighterPickerOpen] = useState(false);
  const [fontSelectorOpen, setFontSelectorOpen] = useState(false);

  // Aba ativa no editor de notas (organização otimizada para smartphones e telas maiores)
  const [editorTab, setEditorTab] = useState<"note" | "layouts" | "settings">("note");

  // Exibidor sutil para a parte debaixo da nota (Data, Horários, Salvar Auto)
  const [bottomDetailsVisible, setBottomDetailsVisible] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("gm_note_bottom_details_visible_v1");
      if (saved !== null) return saved === "true";
    } catch (e) {}
    return true; // Padrão visível para acesso rápido aos controles de data, horários e autosave
  });

  // Exibidor sutil para configurações superiores da nota (Tipo, Status, Prazo, Responsável, Horário)
  const [topDetailsVisible, setTopDetailsVisible] = useState(false);

  // Expansor/Ocultador da seção de prévia de layouts e digitação
  const [layoutPreviewsVisible, setLayoutPreviewsVisible] = useState(true);
  const [typingSectionVisible, setTypingSectionVisible] = useState(true);

  // Modal de Zoom em Alta Resolução e Detalhes da Imagem de Prévia (estilo Apple Lightbox)
  const [zoomImage, setZoomImage] = useState<{ url: string; index: number } | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  // Arrastar e Soltar para Reorganização das Prévias de Layout
  const [draggedLayoutIdx, setDraggedLayoutIdx] = useState<number | null>(null);
  const [dragOverLayoutIdx, setDragOverLayoutIdx] = useState<number | null>(null);

  // Redimensionador do Modal de Notas (largura e altura livre com 4 guias nos 4 cantos e 4 bordas)
  const modalRef = useRef<HTMLDivElement>(null);
  const [modalCustomSize, setModalCustomSize] = useState<{ width?: number; height?: number }>(() => {
    try {
      const saved = localStorage.getItem("gm_note_modal_custom_size_v1");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });
  const isResizingModalRef = useRef(false);

  // Função universal de redimensionamento ultra-leve, liso e fluido (60-120 FPS direto no DOM via requestAnimationFrame)
  const handleModalResizeStart = (
    e: React.PointerEvent,
    direction: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingModalRef.current = true;

    const modalEl = modalRef.current || (document.querySelector(".gm-note-modal") as HTMLElement);
    if (!modalEl) return;

    // Trava ponteiro se suportado para rastreio contínuo mesmo fora da janela
    try {
      if ((e.currentTarget as any).setPointerCapture) {
        (e.currentTarget as any).setPointerCapture(e.pointerId);
      }
    } catch (err) {}

    const rect = modalEl.getBoundingClientRect();
    const startW = rect.width;
    const startH = rect.height;
    const startX = e.clientX;
    const startY = e.clientY;

    // Desativa transições temporárias e seleções de texto para fluidez absoluta
    modalEl.style.transition = "none";
    modalEl.style.willChange = "width, height, max-height";
    document.body.style.userSelect = "none";
    (document.body.style as any).webkitUserSelect = "none";

    const cursorMap: Record<string, string> = {
      nw: "nwse-resize",
      se: "nwse-resize",
      ne: "nesw-resize",
      sw: "nesw-resize",
      n: "ns-resize",
      s: "ns-resize",
      e: "ew-resize",
      w: "ew-resize",
    };
    document.body.style.cursor = cursorMap[direction] || "crosshair";

    let lastW = startW;
    let lastH = startH;
    let rafId: number | null = null;

    const onPointerMove = (moveEv: PointerEvent) => {
      if (!isResizingModalRef.current) return;
      moveEv.preventDefault();
      const deltaX = moveEv.clientX - startX;
      const deltaY = moveEv.clientY - startY;

      let newW = startW;
      let newH = startH;

      // Redimensionamento bidirecional suave centrado
      if (direction === "se") {
        newW = startW + deltaX * 2;
        newH = startH + deltaY * 2;
      } else if (direction === "sw") {
        newW = startW - deltaX * 2;
        newH = startH + deltaY * 2;
      } else if (direction === "ne") {
        newW = startW + deltaX * 2;
        newH = startH - deltaY * 2;
      } else if (direction === "nw") {
        newW = startW - deltaX * 2;
        newH = startH - deltaY * 2;
      } else if (direction === "e") {
        newW = startW + deltaX * 2;
      } else if (direction === "w") {
        newW = startW - deltaX * 2;
      } else if (direction === "s") {
        newH = startH + deltaY * 2;
      } else if (direction === "n") {
        newH = startH - deltaY * 2;
      }

      // Limites: Tamanho mínimo aceitável até as extremidades máximas da área útil (entre menu e borda direita)
      const sidebarW = window.innerWidth >= 768 ? (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--gm-sidebar-width")) || 224) : 0;
      const workspaceW = Math.max(340, window.innerWidth - sidebarW);
      const minW = 400;
      const maxW = Math.max(minW, workspaceW - 24);
      const minH = 340;
      const maxH = Math.max(minH, window.innerHeight - 24);

      const clampedW = Math.round(Math.max(minW, Math.min(maxW, newW)));
      const clampedH = Math.round(Math.max(minH, Math.min(maxH, newH)));

      lastW = clampedW;
      lastH = clampedH;

      // Executa no frame de renderização nativo para taxa de quadros perfeita (sem re-render do React durante o arraste)
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          if (modalEl) {
            modalEl.style.width = `${lastW}px`;
            modalEl.style.height = `${lastH}px`;
            modalEl.style.maxHeight = `${lastH}px`;
          }
          rafId = null;
        });
      }
    };

    const onPointerUp = (upEv: PointerEvent) => {
      isResizingModalRef.current = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      try {
        if ((e.currentTarget as any).releasePointerCapture) {
          (e.currentTarget as any).releasePointerCapture(upEv.pointerId);
        }
      } catch (err) {}

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      if (modalEl) {
        modalEl.style.transition = "";
        modalEl.style.willChange = "";
      }
      document.body.style.userSelect = "";
      (document.body.style as any).webkitUserSelect = "";
      document.body.style.cursor = "";

      // Salva o novo tamanho definitivo no State do React e no LocalStorage apenas no soltar (Drop)
      setModalCustomSize({ width: lastW, height: lastH });
      try {
        localStorage.setItem("gm_note_modal_custom_size_v1", JSON.stringify({ width: lastW, height: lastH }));
      } catch (err) {}
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  // Restaura o tamanho do modal para as dimensões padrões
  const handleResetModalSize = () => {
    setModalCustomSize({});
    try {
      localStorage.removeItem("gm_note_modal_custom_size_v1");
    } catch (e) {}
    const modalEl = modalRef.current || (document.querySelector(".gm-note-modal") as HTMLElement);
    if (modalEl) {
      modalEl.style.width = "";
      modalEl.style.height = "";
      modalEl.style.maxHeight = "";
    }
    showToast("Tamanho do editor restaurado ao padrão");
  };

  // Keyboard shortcut listener for Lightbox Zoom modal
  useEffect(() => {
    if (!zoomImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setZoomImage(null);
        setZoomScale(1);
      } else if (e.key === "ArrowLeft" && layoutUrls.length > 1) {
        setZoomImage((curr) => {
          if (!curr) return null;
          const prevIdx = (curr.index - 1 + layoutUrls.length) % layoutUrls.length;
          return { url: layoutUrls[prevIdx], index: prevIdx };
        });
        setZoomScale(1);
      } else if (e.key === "ArrowRight" && layoutUrls.length > 1) {
        setZoomImage((curr) => {
          if (!curr) return null;
          const nextIdx = (curr.index + 1) % layoutUrls.length;
          return { url: layoutUrls[nextIdx], index: nextIdx };
        });
        setZoomScale(1);
      } else if (e.key === "+" || e.key === "=") {
        setZoomScale((s) => Math.min(4, s + 0.25));
      } else if (e.key === "-") {
        setZoomScale((s) => Math.max(0.5, s - 0.25));
      } else if (e.key === "0") {
        setZoomScale(1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomImage, layoutUrls]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Unified Escape key dismissal for topmost modal/popover (outside lightbox)
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || zoomImage) return;
      if (colorPickerOpen) {
        setColorPickerOpen(false);
      } else if (highlighterPickerOpen) {
        setHighlighterPickerOpen(false);
      } else if (fontSelectorOpen) {
        setFontSelectorOpen(false);
      } else if (clocksExpanded) {
        setClocksExpanded(false);
      } else if (deleteConfirmId) {
        setDeleteConfirmId(null);
      } else if (noteShareData) {
        setNoteShareData(null);
      } else if (newNoteModalOpen) {
        setNewNoteModalOpen(false);
      } else if (modalOpen) {
        setModalOpen(false);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [
    zoomImage,
    colorPickerOpen,
    highlighterPickerOpen,
    fontSelectorOpen,
    clocksExpanded,
    deleteConfirmId,
    noteShareData,
    newNoteModalOpen,
    modalOpen,
  ]);

  // Auto-Save Configuration State (10, 15, 30 min or disabled)
  const [autoSaveInterval, setAutoSaveInterval] = useState<"disabled" | "10" | "15" | "30">(() => {
    return (localStorage.getItem("gm_note_autosave_interval_v1") as any) || "10";
  });
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaveSuccessActive, setIsSaveSuccessActive] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const isSavingNoteRef = useRef(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Auto-Save background timer while editor modal is open
  useEffect(() => {
    if (!modalOpen || autoSaveInterval === "disabled") return;

    const minutes = parseInt(autoSaveInterval, 10);
    if (isNaN(minutes) || minutes <= 0) return;

    const ms = minutes * 60 * 1000;
    const timer = setInterval(() => {
      // Background auto-save without closing modal or dispatching OS notifications
      if ((title || content) && !isSavingNoteRef.current) {
        handleSave(true, true);
      }
    }, ms);

    return () => clearInterval(timer);
  }, [modalOpen, autoSaveInterval, title, content, color, isPinned, reminderTime, reminderTime2, reminderTime3, reminderDate, noteType, noteStatus, deliveryDate, deliveryTime, responsibleName, layoutUrls, editingNote]);

  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      if (!newNoteModalOpen && !modalOpen) return;
      if (isUploadingPasteRef.current) return;

      const el = document.activeElement;
      if (
        el &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA") &&
        el !== contentRef.current
      ) {
        const hasImage = Array.from(e.clipboardData?.items || []).some((item) =>
          item.type.includes("image"),
        );
        if (!hasImage) return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      let imageItem: DataTransferItem | null = null;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          imageItem = items[i];
          break;
        }
      }

      if (!imageItem) return;

      e.preventDefault();
      e.stopPropagation();

      const file = imageItem.getAsFile();
      if (!file || !tenantId) return;

      if (layoutUrls.length >= 6) {
        showToast("Limite máximo de 6 layouts atingido!");
        return;
      }

      isUploadingPasteRef.current = true;
      setUploadingLayout(true);
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        const url = await uploadNoteAsset(tenantId, compressedFile);

        // Imagens vão EXCLUSIVAMENTE para o campo de Layout, com deduplicação
        setLayoutUrls((prev) => (prev.includes(url) ? prev : [...prev, url].slice(0, 6)));
        showToast("Layout adicionado com sucesso!");
      } catch (err) {
        alert("Erro ao colar imagem para o layout: " + err);
      } finally {
        setUploadingLayout(false);
        isUploadingPasteRef.current = false;
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [tenantId, newNoteModalOpen, modalOpen, layoutUrls]);

  // Custom Undo/Redo/History for Content Editor
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const lastPushTimeRef = useRef<number>(0);
  const isUndoRedoActionRef = useRef<boolean>(false);

  useEffect(() => {
    if (modalOpen) {
      historyRef.current = [content];
      historyIndexRef.current = 0;
      lastPushTimeRef.current = Date.now();
      setSelectedTextColor("#ffffff");
    }
  }, [modalOpen]);

  // Sincronização em tempo real de qualquer remoção de elementos (como imagens) no editor
  useEffect(() => {
    if (!modalOpen || !contentRef.current) return;
    const observer = new MutationObserver(() => {
      if (contentRef.current) {
        const val = contentRef.current.innerHTML;
        setContent(val);
      }
    });
    observer.observe(contentRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [modalOpen, editingNote]);

  const COLORS = [
    "#334155", // Slate
    "#ff003c", // Red Neon
    "#ff6600", // Orange Neon
    "#00ff66", // Green Neon
    "#00e5ff", // Cyan Neon
    "#b400ff", // Violet Neon
    "#ff00a0", // Pink Neon
  ];

  useEffect(() => {
    loadNotes();
  }, [tenantId]);

  async function loadNotes() {
    setLoading(true);
    try {
      // Buscar todas as notas no banco de dados para garantir restauração de notas de produção e de todas as contas
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error && error.code === "42P01") {
        console.warn(
          "Notes table does not exist yet. Please run the SQL setup script.",
        );
        setNotes([]);
      } else if (data) {
        const mappedData = data.map(n => {
          const st = normalizeStatus(n.status);
          const isCompleted = st === "CONCLUIDOS" || st === "CONCLUIDO" || st.includes("CONCLU");
          if (st === "APROVADO") {
            return { ...n, type: "production" as any, status: "PRODUÇÃO" };
          }
          if (st === "AGUARDANDO") {
            return { ...n, status: "A FAZER" };
          }
          // Se a nota já está concluída, zera o lembrete para não exibir nem soar alarme
          if (isCompleted && n.reminder_time) {
            return { ...n, reminder_time: null };
          }
          return n;
        });
        setNotes(mappedData);
        syncAlarmsWithNotes(mappedData);
        
        const toMigrate = data.filter(n => normalizeStatus(n.status) === "APROVADO" || normalizeStatus(n.status) === "AGUARDANDO");
        for (const note of toMigrate) {
          const st = normalizeStatus(note.status);
          const updates = st === "APROVADO" 
            ? { type: "production", status: "PRODUÇÃO" }
            : { status: "A FAZER" };
          supabase.from("notes").update(updates).eq("id", note.id).then();
        }

        // Zera no banco e remove alarmes de notas concluídas que ainda tinham reminder_time salvo
        const completedWithReminders = data.filter(n => {
          const st = normalizeStatus(n.status);
          return (st === "CONCLUIDOS" || st === "CONCLUIDO" || st.includes("CONCLU")) && n.reminder_time;
        });
        for (const note of completedWithReminders) {
          removeAlarmsForBudget(note.id);
          supabase.from("notes").update({ reminder_time: null }).eq("id", note.id).then();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const pushToHistory = (newVal: string, force = false) => {
    if (isUndoRedoActionRef.current) return;
    const now = Date.now();
    const index = historyIndexRef.current;
    const stack = historyRef.current;

    // Discard redos
    const cleanStack = stack.slice(0, index + 1);

    // Skip duplicates
    if (cleanStack[index] === newVal) return;

    // Push if force/milestone, elapsed time exceeds 1.5s, or typing character difference exceeds 5
    const lastValLen = cleanStack[index]?.length || 0;
    const diff = Math.abs(lastValLen - newVal.length);
    const shouldPush =
      force || now - lastPushTimeRef.current > 1500 || diff > 5;

    if (shouldPush) {
      cleanStack.push(newVal);
      if (cleanStack.length > 100) cleanStack.shift();
      historyRef.current = cleanStack;
      historyIndexRef.current = cleanStack.length - 1;
      lastPushTimeRef.current = now;
    } else {
      if (cleanStack.length > 0) {
        cleanStack[cleanStack.length - 1] = newVal;
        historyRef.current = cleanStack;
      }
    }
  };

  const placeCursorAtEnd = (el: HTMLElement) => {
    el.focus();
    if (
      typeof window.getSelection !== "undefined" &&
      typeof document.createRange !== "undefined"
    ) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  };

  const performUndo = () => {
    const index = historyIndexRef.current;
    const stack = historyRef.current;
    if (index > 0) {
      isUndoRedoActionRef.current = true;
      const prevContent = stack[index - 1];
      historyIndexRef.current = index - 1;
      setContent(prevContent);
      if (contentRef.current) {
        contentRef.current.innerHTML = prevContent;
        placeCursorAtEnd(contentRef.current);
      }
      isUndoRedoActionRef.current = false;
    }
  };

  const performRedo = () => {
    const index = historyIndexRef.current;
    const stack = historyRef.current;
    if (index < stack.length - 1) {
      isUndoRedoActionRef.current = true;
      const nextContent = stack[index + 1];
      historyIndexRef.current = index + 1;
      setContent(nextContent);
      if (contentRef.current) {
        contentRef.current.innerHTML = nextContent;
        placeCursorAtEnd(contentRef.current);
      }
      isUndoRedoActionRef.current = false;
    }
  };

  const applyStyleToSelection = (styles: Record<string, string>) => {
    restoreSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    // Make sure the selection is actually inside our editor
    if (
      contentRef.current &&
      !contentRef.current.contains(range.commonAncestorContainer)
    ) {
      return;
    }

    if (range.collapsed) {
      // If no selection, insert styled span and place cursor inside
      const span = document.createElement("span");
      Object.entries(styles).forEach(([styleName, styleValue]) => {
        span.style.setProperty(styleName, styleValue);
      });
      span.innerHTML = "&#8203;"; // zero-width space
      range.insertNode(span);

      const newRange = document.createRange();
      if (span.firstChild) {
        newRange.setStart(span.firstChild, 1);
      } else {
        newRange.selectNodeContents(span);
      }
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
      savedRangeRef.current = newRange.cloneRange();
    } else {
      const fragment = range.extractContents();

      // Clean up previous occurrences of these style properties inside the fragment
      const cleanNodeStyles = (node: Node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          Object.keys(styles).forEach((styleName) => {
            element.style.removeProperty(styleName);
            if (styleName === "color" && element.tagName === "FONT") {
              element.removeAttribute("color");
            }
          });
        }
        node.childNodes.forEach(cleanNodeStyles);
      };

      cleanNodeStyles(fragment);

      // Create new wrapping span
      const span = document.createElement("span");
      Object.entries(styles).forEach(([styleName, styleValue]) => {
        span.style.setProperty(styleName, styleValue);
      });
      span.appendChild(fragment);

      range.insertNode(span);

      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(newRange);
      savedRangeRef.current = newRange.cloneRange();
    }

    if (contentRef.current) {
      const val = contentRef.current.innerHTML;
      setContent(val);
      pushToHistory(val, true);
    }
  };

  const applyBold = () => {
    document.execCommand("bold", false);
    if (contentRef.current) {
      const val = contentRef.current.innerHTML;
      setContent(val);
      pushToHistory(val, true);
    }
  };

  const applyItalic = () => {
    document.execCommand("italic", false);
    if (contentRef.current) {
      const val = contentRef.current.innerHTML;
      setContent(val);
      pushToHistory(val, true);
    }
  };

  const applyUnderline = () => {
    document.execCommand("underline", false);
    if (contentRef.current) {
      const val = contentRef.current.innerHTML;
      setContent(val);
      pushToHistory(val, true);
    }
  };

  const applyStrikeThrough = () => {
    document.execCommand("strikeThrough", false);
    if (contentRef.current) {
      const val = contentRef.current.innerHTML;
      setContent(val);
      pushToHistory(val, true);
    }
  };

  const applyAlign = (align: "left" | "center" | "right" | "justify") => {
    const cmd = align === "left" ? "justifyLeft" : align === "center" ? "justifyCenter" : align === "right" ? "justifyRight" : "justifyFull";
    document.execCommand(cmd, false);
    if (contentRef.current) {
      const val = contentRef.current.innerHTML;
      setContent(val);
      pushToHistory(val, true);
    }
  };

  const applyList = (type: "bullet" | "ordered") => {
    const cmd = type === "bullet" ? "insertUnorderedList" : "insertOrderedList";
    document.execCommand(cmd, false);
    if (contentRef.current) {
      const val = contentRef.current.innerHTML;
      setContent(val);
      pushToHistory(val, true);
    }
  };

  const removeHighlight = () => {
    restoreSelection();
    const selection = window.getSelection();
    if (!contentRef.current) return;

    const cleanHighlightProps = (el: HTMLElement) => {
      el.style.removeProperty("background-color");
      el.style.removeProperty("background");
      el.style.removeProperty("border-radius");
      el.style.removeProperty("padding");
      el.removeAttribute("data-highlight");
      if (el.tagName === "MARK") {
        const parent = el.parentNode;
        while (el.firstChild) {
          parent?.insertBefore(el.firstChild, el);
        }
        el.remove();
      } else if (el.tagName === "SPAN") {
        const remainingStyle = el.getAttribute("style");
        if (!remainingStyle || remainingStyle.trim() === "") {
          const parent = el.parentNode;
          while (el.firstChild) {
            parent?.insertBefore(el.firstChild, el);
          }
          el.remove();
        }
      }
    };

    // Tentar comandos padrão do navegador primeiro
    try {
      document.execCommand("hiliteColor", false, "transparent");
    } catch (e) {}
    try {
      document.execCommand("backColor", false, "transparent");
    } catch (e) {}

    const hasSelection =
      selection &&
      selection.rangeCount > 0 &&
      contentRef.current.contains(selection.getRangeAt(0).commonAncestorContainer);

    if (hasSelection && selection) {
      const range = selection.getRangeAt(0);

      if (range.collapsed) {
        // Cursor pontual: limpa o elemento em que o cursor está
        let current: Node | null = range.startContainer;
        let cleanedAny = false;
        while (current && current !== contentRef.current) {
          if (current.nodeType === Node.ELEMENT_NODE) {
            const el = current as HTMLElement;
            if (
              el.style.backgroundColor ||
              el.style.background ||
              el.tagName === "MARK"
            ) {
              cleanHighlightProps(el);
              cleanedAny = true;
            }
          }
          current = current.parentNode;
        }

        if (!cleanedAny) {
          // Se não havia marcação sob o cursor, limpa todas as marcações da nota
          const allHighlighted = contentRef.current.querySelectorAll(
            "mark, [style*='background-color'], [style*='background']"
          );
          allHighlighted.forEach((node) => cleanHighlightProps(node as HTMLElement));
        }
      } else {
        // Seleção com texto:
        // 1. Limpa ancestrais que englobam a seleção
        let ancestor: Node | null = range.commonAncestorContainer;
        while (ancestor && ancestor !== contentRef.current) {
          if (ancestor.nodeType === Node.ELEMENT_NODE) {
            const el = ancestor as HTMLElement;
            if (
              el.style.backgroundColor ||
              el.style.background ||
              el.tagName === "MARK"
            ) {
              cleanHighlightProps(el);
            }
          }
          ancestor = ancestor.parentNode;
        }

        // 2. Extrai e limpa todos os nós dentro do fragmento da seleção
        const fragment = range.extractContents();
        const cleanNodeTree = (node: Node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            cleanHighlightProps(node as HTMLElement);
          }
          Array.from(node.childNodes).forEach(cleanNodeTree);
        };
        cleanNodeTree(fragment);
        range.insertNode(fragment);
        savedRangeRef.current = range.cloneRange();
      }
    } else {
      // Se não havia seleção ativa, limpa todas as marcações da nota
      const allHighlighted = contentRef.current.querySelectorAll(
        "mark, [style*='background-color'], [style*='background']"
      );
      allHighlighted.forEach((node) => cleanHighlightProps(node as HTMLElement));
    }

    if (contentRef.current) {
      const val = contentRef.current.innerHTML;
      setContent(val);
      pushToHistory(val, true);
    }
  };

  const applyHighlight = (bgColor: string) => {
    if (!bgColor || bgColor === "transparent") {
      removeHighlight();
      return;
    }
    applyStyleToSelection({
      "background-color": bgColor,
      "border-radius": "4px",
      padding: "2.5px 7px",
      "box-decoration-break": "clone",
      "-webkit-box-decoration-break": "clone",
      display: "inline-block",
      "vertical-align": "middle",
      "text-align": "center",
      "line-height": "1.25",
      position: "relative",
      "z-index": "1",
      "box-sizing": "border-box",
    });
  };

  const cycleFontSize = () => {
    let nextSize: "P" | "M" | "G" = "M";
    let sizeValue = "16px";

    if (fontSizeMode === "M") {
      nextSize = "G";
      sizeValue = "22px";
    } else if (fontSizeMode === "G") {
      nextSize = "P";
      sizeValue = "12px";
    } else {
      nextSize = "M";
      sizeValue = "16px";
    }

    setFontSizeMode(nextSize);
    applyStyleToSelection({ "font-size": sizeValue });
  };

  const normalizeStatus = (s: string | undefined | null) => {
    if (!s) return "";
    return s
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  function openNewNote() {
    const activeNotesCount = notes.filter((n) => !n.deleted_at).length;
    const qCheck = checkQuota("notes", activeNotesCount);
    if (!qCheck.allowed) {
      setLockModal({
        title: "Limite de Notas Atingido",
        reason: qCheck.reason,
        requiredPlan: qCheck.requiredPlan || "avancado",
      });
      return;
    }
    setNewNoteModalOpen(true);
  }

  function openNewNoteModal(type: "note" | "production") {
    setNewNoteModalOpen(false);
    setEditingNote(null);
    setTitle("");
    setContent("");
    setColor(COLORS[0]);
    setIsPinned(false);
    setReminderTime("");
    setReminderTime2("");
    setReminderTime3("");
    setClocksExpanded(false);
    setReminderDate("");
    setFontSizeMode("M");
    setNoteType(type);
    setNoteStatus("a fazer");
    setDeliveryDate("");
    setDeliveryTime("");
    setResponsibleName("");
    setLayoutUrls([]);
    setLayoutUrlInput("");
    setEditorTab("note");
    setModalOpen(true);
  }

  function openEdit(note: Note) {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color || COLORS[0]);
    setIsPinned(note.is_pinned);
    setFontSizeMode("M");
    setNoteType(note.type || "note");
    setNoteStatus(
      note.status || "a fazer",
    );
    setDeliveryDate(note.delivery_date || "");
    setDeliveryTime(note.delivery_time || "");
    setResponsibleName(note.responsible_name || "");
    setLayoutUrls(parseLayoutUrls(note.layout_url));
    setLayoutUrlInput("");
    setEditorTab("note");

    const isCompleted = normalizeStatus(note.status).includes("CONCLU");
    if (isCompleted) {
      setReminderDate("");
      setReminderTime("");
      setReminderTime2("");
      setReminderTime3("");
    } else if (note.reminder_time && note.reminder_time.includes(" ")) {
      const parts = note.reminder_time.split(" ");
      const rDate = parts[0] || "";
      const rTime = parts.slice(1).join(" ") || "";
      setReminderDate(rDate);
      const times = rTime ? rTime.split(",") : [];
      setReminderTime(times[0] || "");
      setReminderTime2(times[1] || "");
      setReminderTime3(times[2] || "");
      setBottomDetailsVisible(true);
    } else if (note.reminder_time && note.reminder_time.includes("-") && !note.reminder_time.includes(":")) {
      // Data ISO pura (YYYY-MM-DD)
      setReminderDate(note.reminder_time);
      setReminderTime("");
      setReminderTime2("");
      setReminderTime3("");
      setBottomDetailsVisible(true);
    } else {
      setReminderDate("");
      const times = note.reminder_time ? note.reminder_time.split(",") : [];
      setReminderTime(times[0] || "");
      setReminderTime2(times[1] || "");
      setReminderTime3(times[2] || "");
      if (times.length > 0) setBottomDetailsVisible(true);
    }
    setClocksExpanded(false);
    setModalOpen(true);
  }

  async function handleSave(_keepOpen = false, isAutoSave = false) {
    if (isSavingNoteRef.current) return;
    isSavingNoteRef.current = true;
    setIsSavingNote(true);

    const isCompleted = normalizeStatus(noteStatus).includes("CONCLU");
    const wasEditing = Boolean(editingNote);

    const activeTimes = isCompleted ? [] : [reminderTime, reminderTime2, reminderTime3].filter(Boolean);
    const timeStr = activeTimes.join(",");

    const savedReminder =
      !isCompleted && reminderDate
        ? (timeStr ? `${reminderDate} ${timeStr}` : reminderDate)
        : (!isCompleted && timeStr ? timeStr : null);

    // Garante que o conteúdo salvo seja exatamente o DOM atual do editor (sem imagens excluídas)
    const currentEditorContent = contentRef.current ? contentRef.current.innerHTML : content;
    setContent(currentEditorContent);

    const payload: any = {
      title: title || "Sem título",
      content: currentEditorContent,
      color,
      is_pinned: isPinned,
      reminder_time: savedReminder,
      type: noteType,
      status: noteStatus,
      delivery_date: deliveryDate || null,
      delivery_time: deliveryTime || null,
      responsible_name: responsibleName || null,
      layout_url: layoutUrl || null,
      updated_at: new Date().toISOString(),
    };

    if (tenantId) {
      payload.tenant_id = tenantId;
    }

    let savedNote: Note | null = null;

    try {
      let result;
      if (editingNote) {
        result = await supabase
          .from("notes")
          .update(payload)
          .eq("id", editingNote.id)
          .select()
          .single();
          
        if (result.error && result.error.code === "42703") {
          // Retry without layout_url
          const { layout_url, ...fallbackPayload } = payload;
          result = await supabase.from("notes").update(fallbackPayload).eq("id", editingNote.id).select().single();
        }
        if (result.error) throw result.error;
        savedNote = result.data;
        setNotes((prev) =>
          prev.map((n) => (n.id === editingNote.id ? result.data : n)),
        );
      } else {
        result = await supabase
          .from("notes")
          .insert(payload)
          .select()
          .single();
          
        if (result.error && result.error.code === "42703") {
           // Retry without layout_url
           const { layout_url, ...fallbackPayload } = payload;
           result = await supabase.from("notes").insert(fallbackPayload).select().single();
        }
        if (result.error) throw result.error;
        savedNote = result.data;
        setNotes((prev) => [result.data, ...prev]);
        setEditingNote(result.data);
      }

      // Update Alarm Schedule if reminder format is valid AND plan permits alarms
      if (savedNote) {
        if (alarmsAccess.allowed && !isCompleted && savedNote.reminder_time) {
          const hasDate = savedNote.reminder_time.includes(" ");
          let rDate: string | null = null;
          let rTimeStr = savedNote.reminder_time;
          if (hasDate) {
            const parts = savedNote.reminder_time.split(" ");
            rDate = parts[0] || null;
            rTimeStr = parts.slice(1).join(" ") || "";
          }
          const times = rTimeStr.split(",").filter((t) => /^\d{2}:\d{2}$/.test(t));
          if (times.length > 0) {
            addAlarmsForBudget(
              savedNote.id,
              savedNote.title || "Nota",
              times,
              "NOTE",
              undefined,
              rDate,
            );
          } else {
            removeAlarmsForBudget(savedNote.id);
          }
        } else {
          removeAlarmsForBudget(savedNote.id);
        }
      }

      if (isCompleted) {
        setReminderDate("");
        setReminderTime("");
        setReminderTime2("");
        setReminderTime3("");
      }

      const nowStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setLastAutoSavedAt(nowStr);
      showToast(`Nota salva com sucesso! (${nowStr})`);

      // Transmissão simultânea de notificação apenas em salvamento manual
      if (!isAutoSave) {
        try {
          broadcastAppNotification(tenantId, {
            title: wasEditing ? "📝 Nota Atualizada" : "📝 Nova Nota Criada",
            message: savedNote?.title || "Nota salva com sucesso",
            type: "note",
            url: "/notes",
          });
        } catch (e) {}
      }

      // Ativa efeito verde neon no botão salvar por 2 segundos
      setIsSaveSuccessActive(true);
      setTimeout(() => {
        setIsSaveSuccessActive(false);
      }, 2000);

      // A nota NÃO fecha ao salvar (só fecha com o botão Fechar ou 'X')
    } catch (e: any) {
      console.error(e);
      alert(
        "Falha ao salvar a nota. Verifique se as permissões/tabelas no Supabase foram criadas.\n\n" +
          e.message,
      );
    } finally {
      isSavingNoteRef.current = false;
      setIsSavingNote(false);
    }
  }

  async function togglePin(note: Note, e: React.MouseEvent) {
    e.stopPropagation();
    const next = !note.is_pinned;
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, is_pinned: next } : n)),
    );
    try {
      await supabase
        .from("notes")
        .update({ is_pinned: next })
        .eq("id", note.id);
    } catch (e) {}
  }

  function toggleExpand(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSoftDelete(id: string) {
    const now = new Date().toISOString();
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, deleted_at: now } : n)),
    );
    removeAlarmsForBudget(id);
    try {
      await supabase.from("notes").update({ deleted_at: now }).eq("id", id);
    } catch (e) {}
  }

  async function handleRestore(id: string) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, deleted_at: null } : n)),
    );
    try {
      await supabase.from("notes").update({ deleted_at: null }).eq("id", id);
    } catch (e) {}
  }

  async function handleQuickStatusChange(note: Note, newStatus: string, e: React.SyntheticEvent) {
    e.stopPropagation();
    const isCompleted = normalizeStatus(newStatus).includes("CONCLU");
    const updates: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (isCompleted) {
      updates.reminder_time = null;
      removeAlarmsForBudget(note.id);
    }

    const updatedNotes = notes.map((n) =>
      n.id === note.id ? { ...n, ...updates } : n
    );
    setNotes(updatedNotes);
    syncAlarmsWithNotes(updatedNotes);

    try {
      await supabase.from("notes").update(updates).eq("id", note.id);
      showToast(
        isCompleted
          ? "Nota marcada como Concluído: lembrete e alarme zerados!"
          : `Status alterado para ${newStatus.replace(/_/g, " ").toUpperCase()}`
      );
    } catch (err) {
      console.error(err);
      showToast("Erro ao atualizar status da nota");
    }
  }

  function handleShareClick(note: Note) {
    const titleText = note.title || "Sem título";
    const contentText = note.content || "";
    const message = `*${titleText}*\n\n${contentText}`;
    setNoteShareData({ note, message });
  }

  const handlePdf = async (note: Note) => {
    try {
      let settings: any = null;
      if (tenantId) {
        const { fetchSettingsSupabase } = await import("../lib/settings");
        settings = await fetchSettingsSupabase(tenantId);
      }
      if (!settings) {
        settings = { company_name: "CardDigital GM", timbrado_url: "" };
      }
      await generateNotePdf(note, settings);
    } catch (e: any) {
      alert("Erro ao gerar PDF: " + (e?.message || "Erro desconhecido"));
    }
  };

  async function handleHardDeleteConfirm() {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    removeAlarmsForBudget(id);
    try {
      await supabase.from("notes").delete().eq("id", id);
    } catch (e) {}
    setDeleteConfirmId(null);
  }

  const filteredNotes = useMemo(() => {
    let base = notes;

    if (mainTab === "NOTE") {
      base = base.filter((n) => (n.type || "note").toLowerCase() === "note");
    } else if (mainTab === "PRODUCTION") {
      base = base.filter((n) => (n.type || "note").toLowerCase() === "production");
    }

    const activeTab = noteTab;
    const isTrash = activeTab === "LIXEIRA";

    if (isTrash) {
      base = base.filter((n) => !!n.deleted_at);
    } else {
      base = base.filter((n) => !n.deleted_at);

      const normalizedActiveTab = normalizeStatus(activeTab);
      base = base.filter((n) => {
        let st = normalizeStatus(n.status || "a fazer");
        if (normalizedActiveTab === "PRODUCAO" && (st === "EM PRODUCAO" || st === "PRODUCAO")) return true;
        return st === normalizedActiveTab;
      });
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      base = base.filter(
        (n) =>
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.content && n.content.toLowerCase().includes(q)) ||
          (n.responsible_name && n.responsible_name.toLowerCase().includes(q))
      );
    }

    // Sort by pinned
    base.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return base;
  }, [notes, searchTerm, mainTab, noteTab]);

  const noteCounts = useMemo(() => {
    const notDeleted = notes.filter((n) => !n.deleted_at);
    const deleted = notes.filter((n) => !!n.deleted_at);

    const baseForStatus = notDeleted.filter((n) => {
      if (mainTab === "NOTE") return (n.type || "note").toLowerCase() === "note";
      if (mainTab === "PRODUCTION") return (n.type || "note").toLowerCase() === "production";
      return true;
    });

    const baseForTrash = deleted.filter((n) => {
      if (mainTab === "NOTE") return (n.type || "note").toLowerCase() === "note";
      if (mainTab === "PRODUCTION") return (n.type || "note").toLowerCase() === "production";
      return true;
    });

    return {
      all: notDeleted.length,
      general: notDeleted.filter((n) => (n.type || "note").toLowerCase() === "note").length,
      production: notDeleted.filter((n) => (n.type || "note").toLowerCase() === "production").length,
      aFazer: baseForStatus.filter((n) => {
        const st = normalizeStatus(n.status || "a fazer");
        return st === "A FAZER";
      }).length,
      producao: baseForStatus.filter((n) => {
        const st = normalizeStatus(n.status || "a fazer");
        return st === "PRODUCAO" || st === "EM PRODUCAO";
      }).length,
      concluidos: baseForStatus.filter((n) => {
        const st = normalizeStatus(n.status || "a fazer");
        return st === "CONCLUIDOS" || st === "CONCLUIDO";
      }).length,
      lixeira: baseForTrash.length,
    };
  }, [notes, mainTab]);

  const CATEGORY_TABS = [
    { id: "ALL", label: "TODAS AS NOTAS", icon: FileText, count: noteCounts.all },
    { id: "NOTE", label: "NOTAS GERAIS", icon: FileText, count: noteCounts.general },
    { id: "PRODUCTION", label: "NOTAS DE PRODUÇÃO", icon: SlidersHorizontal, count: noteCounts.production },
  ] as const;

  const STATUS_TABS = [
    { id: "A FAZER", label: "A FAZER", icon: Clock, count: noteCounts.aFazer, tone: "orange" },
    { id: "PRODUÇÃO", label: "PRODUÇÃO", icon: RefreshCcw, count: noteCounts.producao, tone: "amber" },
    { id: "CONCLUÍDOS", label: "CONCLUÍDOS", icon: Check, count: noteCounts.concluidos, tone: "green" },
    { id: "LIXEIRA", label: "LIXEIRA", icon: Trash2, count: noteCounts.lixeira, tone: "red" },
  ] as const;

  if (!notesAccess.allowed) {
    return (
      <Page title="Notas">
        <PlanLockedNotice
          variant="page"
          title="Acesso às Notas Bloqueado"
          reason={notesAccess.reason}
          requiredPlan={notesAccess.requiredPlan || "intermediario"}
          currentPlanName={subscription.planName}
          isExpired={isExpired}
        />
      </Page>
    );
  }

  return (
    <Page
      title="Notas"
      className="relative min-h-full"
      actions={
        <button
          type="button"
          onClick={openNewNote}
          className="forge-btn forge-btn--primary w-full md:w-auto !h-11 !min-h-[44px] !px-5 !rounded-[6px] text-sm font-bold uppercase tracking-[0.05em] inline-flex items-center justify-center gap-2.5 active:scale-[0.96] transition-[transform,background-color,box-shadow] duration-150 group cursor-pointer"
        >
          <span className="gm-plus-icon-wrapper inline-flex items-center justify-center shrink-0">
            <Plus size={20} strokeWidth={2.6} className="w-5 h-5 shrink-0 gm-btn-plus-black text-[#0B0B0C]" />
          </span>
          <span className="text-sm font-bold">Criar Nota</span>
        </button>
      }
    >
      <div className="w-full space-y-6 pb-4">
        {/* Tabs + Busca Padrão Orçamentos */}
        <div className="mb-6 space-y-3">
          <SectionDivider label="Filtros e Categorias" />

          {/* Card Contêiner Forge UI para Filtros e Categorias */}
          <div className="p-3 sm:p-4 rounded-lg bg-[#131315] border border-[#26262A] w-full space-y-3 sm:space-y-3.5">
            {/* Linha 1: Categorias Principais (Tipo de Nota) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-sm bg-[var(--gm-primary)]" />
                  Tipo de Nota
                </span>
                <span className="text-[11px] font-bold text-zinc-400 tabular-nums">
                  {noteCounts.all} {noteCounts.all === 1 ? "nota ativa" : "notas ativas"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                {CATEGORY_TABS.map((tabItem) => {
                  const isActive = mainTab === tabItem.id;
                  const Icon = tabItem.icon;
                  return (
                    <button
                      key={tabItem.id}
                      type="button"
                      aria-pressed={isActive}
                      data-selected={isActive}
                      onClick={() => setMainTab(tabItem.id as any)}
                      className={`w-full h-10 rounded-[6px] text-xs font-black tracking-tight transition-all uppercase flex items-center justify-between px-3.5 border cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "bg-[var(--gm-primary)]/15 text-white border-[var(--gm-primary)]/60"
                          : "bg-[#0B0B0C] border-[#26262A] text-zinc-300 hover:bg-[#1B1B1E] hover:text-white hover:border-[#3F3F46]"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Icon size={14} className={isActive ? "text-white shrink-0" : "text-zinc-400 shrink-0"} />
                        <span className="truncate">{tabItem.label}</span>
                      </span>
                      <span
                        className={`text-[11px] font-black px-2 py-0.5 rounded-[4px] border shrink-0 transition-colors tabular-nums ${
                          isActive
                            ? "bg-[var(--gm-primary)]/20 text-white border-[var(--gm-primary)]/50"
                            : "bg-[#131315] text-zinc-400 border-[#26262A]"
                        }`}
                      >
                        {tabItem.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Linha Divisória Fina */}
            <div className="border-t border-[#26262A]" />

            {/* Linha 2: Status do Fluxo / Lixeira */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-sm bg-zinc-400" />
                  Status do Fluxo
                </span>
                {noteTab === "LIXEIRA" && noteCounts.lixeira > 0 && (
                  <span className="text-[11px] font-bold text-rose-400 tabular-nums">
                    {noteCounts.lixeira} na lixeira
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                {STATUS_TABS.map((t) => {
                  const isActive = noteTab === t.id;
                  const Icon = t.icon;
                  
                  let activeClasses = "bg-[var(--gm-primary)]/15 text-[var(--gm-primary)] border-[var(--gm-primary)]/60";
                  let badgeActiveClasses = "bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] border-[var(--gm-primary)]/50";
                  
                  if (t.tone === "green") {
                    activeClasses = "bg-emerald-500/15 text-emerald-400 border-emerald-500/50";
                    badgeActiveClasses = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
                  } else if (t.tone === "red") {
                    activeClasses = "bg-rose-500/15 text-rose-400 border-rose-500/50";
                    badgeActiveClasses = "bg-rose-500/20 text-rose-300 border-rose-500/40";
                  } else if (t.tone === "amber") {
                    activeClasses = "bg-amber-500/15 text-amber-300 border-amber-500/50";
                    badgeActiveClasses = "bg-amber-500/20 text-amber-200 border-amber-500/40";
                  }

                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={isActive}
                      data-selected={isActive}
                      onClick={() => setNoteTab(t.id as any)}
                      className={`w-full h-10 rounded-[6px] text-xs font-black tracking-tight transition-all uppercase flex items-center justify-between px-3 border cursor-pointer whitespace-nowrap ${
                        isActive
                          ? activeClasses
                          : "bg-[#0B0B0C] border-[#26262A] text-zinc-300 hover:bg-[#1B1B1E] hover:text-white hover:border-[#3F3F46]"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 sm:gap-2 truncate">
                        <Icon size={14} className={isActive ? "text-white shrink-0" : "text-zinc-400 shrink-0"} />
                        <span className="truncate">{t.label}</span>
                      </span>
                      <span
                        className={`text-[11px] font-black px-1.5 sm:px-2 py-0.5 rounded-[4px] border shrink-0 transition-colors tabular-nums ${
                          isActive
                            ? badgeActiveClasses
                            : "bg-[#131315] text-zinc-400 border-[#26262A]"
                        }`}
                      >
                        {t.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Busca Padrão Forge UI */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
            <input
              type="text"
              placeholder="Buscar notas por título, conteúdo ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 rounded-[6px] bg-[#0B0B0C] border border-[#26262A] focus:border-[var(--gm-primary)] pl-10 pr-10 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-[4px] bg-[#131315] hover:bg-[#1B1B1E] border border-[#26262A] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[var(--gm-primary)]" />
        </div>
      ) : (
        <>
          <SectionDivider label="Minhas Anotações" />
          {filteredNotes.length === 0 ? (
            <div className="w-full rounded-lg border border-[#26262A] p-10 sm:p-14 md:p-16 min-h-[220px] sm:min-h-[260px] flex flex-col items-center justify-center text-center gap-4 bg-[#131315] select-none">
              <div className="w-12 h-12 rounded-md bg-[#0B0B0C] border border-[#26262A] flex items-center justify-center text-[var(--gm-primary)]">
                <FileText size={22} />
              </div>
              <p className="text-sm sm:text-base text-zinc-200 font-semibold leading-relaxed">
                Nenhuma nota encontrada.
              </p>
            </div>
          ) : (
            <div className="gm-notes-grid-stack md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6">
              <AnimatePresence>
            {filteredNotes.map((note, idx) => {
              const isExpanded = expandedNotes.has(note.id);
              const isLong =
                (note.content?.length || 0) > 200 ||
                (note.content?.split("\n").length || 0) > 4;
              const noteColor = "var(--gm-primary, #FF6900)";
              const normNoteStatus = normalizeStatus(note.status || "a fazer");

              const statusToneClass = normNoteStatus.includes("CONCLU")
                ? "gm-note-status--concluido"
                : normNoteStatus.includes("PROD")
                ? "gm-note-status--producao"
                : normNoteStatus.includes("LIX") || noteTab === "LIXEIRA"
                ? "gm-note-status--lixeira"
                : "gm-note-status--afazer";

              const folderHeaderClass = normNoteStatus.includes("CONCLU")
                ? "bg-gradient-to-r from-[#09291E]/95 via-[#0E261D]/85 to-[#131315] border-emerald-500/35"
                : normNoteStatus.includes("PROD")
                ? "bg-gradient-to-r from-[#0C2538]/95 via-[#102130]/85 to-[#131315] border-sky-500/35"
                : normNoteStatus.includes("LIX") || noteTab === "LIXEIRA"
                ? "bg-gradient-to-r from-[#2D1014]/95 via-[#201014]/85 to-[#131315] border-red-500/35"
                : "bg-gradient-to-r from-[#3E1807]/95 via-[#25120A]/85 to-[#131315] border-[var(--gm-primary,#FE540B)]/40";

              const folderDotClass = normNoteStatus.includes("CONCLU")
                ? "bg-emerald-400"
                : normNoteStatus.includes("PROD")
                ? "bg-sky-400"
                : normNoteStatus.includes("LIX") || noteTab === "LIXEIRA"
                ? "bg-rose-400"
                : "bg-[var(--gm-primary,#FE540B)]";

              const stackStyle = {
                "--note-stack-top": `calc(70px + env(safe-area-inset-top, 0px) + ${Math.min(idx, 3) * 44}px)`,
                "--note-stack-z": 10 + idx,
              } as React.CSSProperties;

              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={stackStyle}
                  className={`gm-note-grid-card ${statusToneClass} col-span-1 md:h-full`}
                  onMouseEnter={() => stopSignal(note.id)}
                  onTouchStart={() => stopSignal(note.id)}
                  onClick={() => {
                    stopSignal(note.id);
                    openEdit(note);
                  }}
                >
                    <div
                      id={`note-card-${note.id}`}
                      onMouseEnter={() => stopSignal(note.id)}
                      onTouchStart={() => stopSignal(note.id)}
                      className={`!p-0 relative flex flex-col transition-all cursor-pointer group md:h-full gm-note-card ${cardBase} hover:border-[#3F3F46] hover:bg-[#1B1B1E] ${
                        isExpanded
                          ? "overflow-y-auto custom-scroll max-h-[60vh] md:max-h-[80vh]"
                          : "overflow-hidden md:min-h-[280px]"
                      } ${
                        note.id === highlightedId
                          ? "gm-signal-bottom-container"
                          : ""
                      }`}
                    >
                      {/* Efeito de Sinalização de Degradê: Canto Inferior Esquerdo -> Canto Inferior Direito */}
                      <SignalBottomGradient
                        active={note.id === highlightedId}
                        onDismiss={() => stopSignal(note.id)}
                      />

                      {/* ABA SUPERIOR DE PASTA (SEMPRE VISÍVEL NO EMPILHAMENTO EM CASCATA) */}
                      <div className={`min-h-[46px] pl-3.5 pr-12 py-2 border-b flex items-center justify-between gap-2 relative ${folderHeaderClass}`}>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${folderDotClass}`} />
                          <h3 className="font-black text-xs sm:text-sm text-white leading-tight truncate uppercase tracking-tight">
                            {note.title || "Sem título"}
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-zinc-400 shrink-0 tabular-nums">
                          #{String(idx + 1).padStart(2, "0")}
                        </span>

                        {/* Visual de Pinar Nota */}
                        <button
                          type="button"
                          onClick={(e) => togglePin(note, e)}
                          className={`gm-note-pin-btn group/pin ${note.is_pinned ? "pinned" : ""}`}
                          title={note.is_pinned ? "Desafixar nota" : "Fixar nota no topo"}
                        >
                          <Pin
                            size={14}
                            className={
                              note.is_pinned
                                ? "rotate-[-30deg] transition-transform"
                                : "rotate-0 transition-transform"
                            }
                          />
                        </button>
                      </div>

                      {/* Corpo do Card */}
                      <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1">
                        {(note.delivery_date || note.responsible_name) && (
                          <div className="flex flex-col gap-0.5 text-xs text-zinc-400">
                            {note.delivery_date && (
                              <div className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums">
                                <Clock size={12} style={{ color: noteColor }} />
                                {note.delivery_date
                                  .split("-")
                                  .reverse()
                                  .join("/")}{" "}
                                {note.delivery_time && `às ${note.delivery_time}`}
                              </div>
                            )}
                            {note.responsible_name && (
                              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                <span
                                  style={{ color: noteColor }}
                                  className="uppercase font-bold tracking-widest"
                                >
                                  Resp:
                                </span>
                                {note.responsible_name}
                              </div>
                            )}
                          </div>
                        )}

                      {/* Layouts Thumbnail Preview (up to 6 side-by-side) */}
                      {(() => {
                        const cardLayouts = parseLayoutUrls(note.layout_url);
                        if (cardLayouts.length === 0) return null;
                        if (cardLayouts.length === 1) {
                          return (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomImage({ url: cardLayouts[0], index: 0 });
                                setZoomScale(1);
                              }}
                              className="w-full h-32 rounded-md overflow-hidden mt-1 shrink-0 relative bg-[#0B0B0C] border border-[#26262A] cursor-pointer group/thumb"
                              title="Clique para ampliar miniatura"
                            >
                              <img
                                src={cardLayouts[0]}
                                alt="Layout Thumbnail"
                                className="w-full h-full object-cover opacity-90 group-hover/thumb:opacity-100 group-hover/thumb:scale-105 transition-all duration-300"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <span className="px-2.5 py-1 rounded-[4px] bg-[#131315] border border-[#26262A] text-white text-[11px] font-bold flex items-center gap-1">
                                  <ZoomIn size={12} className="text-[var(--gm-primary,#FF6900)]" />
                                  Ampliar
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div
                            className={`w-full mt-1 shrink-0 grid gap-1.5 ${
                              cardLayouts.length === 2
                                ? "grid-cols-2 h-28"
                                : cardLayouts.length === 3
                                  ? "grid-cols-3 h-24"
                                  : cardLayouts.length === 4
                                    ? "grid-cols-2 grid-rows-2 h-36"
                                    : "grid-cols-3 grid-rows-2 h-36"
                            }`}
                          >
                            {cardLayouts.map((lUrl, lIdx) => (
                              <div
                                key={lIdx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomImage({ url: lUrl, index: lIdx });
                                  setZoomScale(1);
                                }}
                                className="w-full h-full rounded-[4px] overflow-hidden relative bg-[#0B0B0C] border border-[#26262A] group/thumb cursor-pointer"
                                title={`Clique para ampliar miniatura ${lIdx + 1}`}
                              >
                                <img
                                  src={lUrl}
                                  alt={`Layout ${lIdx + 1}`}
                                  className="w-full h-full object-cover opacity-90 group-hover/thumb:opacity-100 group-hover/thumb:scale-105 transition-all duration-300"
                                />
                                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-[4px] bg-black/80 text-[11px] font-mono text-white border border-[#26262A] tabular-nums">
                                  {lIdx + 1}
                                </span>
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                  <ZoomIn size={13} className="text-white" />
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Body Preview */}
                      <div
                        className={`text-zinc-300 text-sm overflow-hidden flex-1 relative ${isExpanded ? "" : "max-h-[140px]"}`}
                      >
                        <div
                          className={`markdown-body text-sm leading-relaxed ${isExpanded ? "" : "line-clamp-4"}`}
                          dangerouslySetInnerHTML={{
                            __html: note.content || "...",
                          }}
                        />
                      </div>

                      {/* Expand Arrow for long text */}
                      {isLong && (
                        <div className="flex justify-center -mt-2 mb-2">
                          <button
                            onClick={(e) => toggleExpand(note.id, e)}
                            className="w-8 h-8 rounded-[6px] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
                            title={isExpanded ? "Recolher texto" : "Expandir texto"}
                          >
                            {isExpanded ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Footer: Reminder + Actions */}
                      <div className="mt-auto pt-4 flex flex-col gap-3 border-t border-[#26262A] relative z-10 w-full">
                        {/* Text details */}
                        <div className="flex flex-col gap-1.5 min-w-0 w-full text-left">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 tracking-wider">
                            <span>Criado em:</span>
                            <span className="font-mono text-zinc-200 tabular-nums">
                              {new Date(note.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          {!normalizeStatus(note.status).includes("CONCLU") && note.reminder_time &&
                            (() => {
                              const hasSpace = note.reminder_time.includes(" ");
                              return (
                                <div
                                  className="flex items-start gap-2 font-bold tracking-wider mt-1 text-[11px]"
                                  title={
                                    hasSpace
                                      ? "Lembrete Único"
                                      : "Lembrete Diário"
                                  }
                                  style={{ color: noteColor }}
                                >
                                  <div className="mt-0.5 shrink-0">
                                    {hasSpace ? (
                                      <Calendar
                                        size={12}
                                        style={{ color: noteColor }}
                                      />
                                    ) : (
                                      <Clock
                                        size={12}
                                        style={{ color: noteColor }}
                                      />
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-0.5 leading-tight min-w-0 w-full">
                                    <span className="uppercase text-zinc-400 tracking-wider font-mono text-[11px]">
                                      {hasSpace ? "Lembrete Único" : "Lembrete Diário"}
                                    </span>
                                    <span className="text-white font-mono tracking-normal text-[11px] break-words tabular-nums">
                                      {hasSpace ? (
                                        (() => {
                                          const [rDate, rTime] =
                                            note.reminder_time.split(" ");
                                          if (rDate && rTime) {
                                            const [y, m, d] = rDate.split("-");
                                            const formattedTimes = rTime.replace(/,/g, " • ");
                                            return `${d}/${m}/${y} às ${formattedTimes}`;
                                          }
                                          return note.reminder_time;
                                        })()
                                      ) : (
                                        note.reminder_time.replace(/,/g, " • ")
                                      )}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between gap-2.5 w-full pt-2.5 border-t border-[#26262A]">
                          {note.status ? (
                            <div
                              className="relative inline-flex items-center px-2.5 py-1.5 rounded-[4px] bg-[#0B0B0C] border border-[#26262A] hover:border-[#3F3F46] group shrink-0 select-none transition-colors"
                              onClick={(e) => e.stopPropagation()}
                              title="Alterar status (ao marcar como Concluído, o alarme e lembrete zeram)"
                            >
                              <span
                                className={`w-2 h-2 rounded-sm shrink-0 mr-2 ${
                                  normalizeStatus(note.status).includes("CONCLU")
                                    ? "bg-emerald-400"
                                    : normalizeStatus(note.status).includes("PROD")
                                    ? "bg-sky-400"
                                    : "bg-[var(--gm-primary)]"
                                }`}
                              />

                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-white whitespace-nowrap">
                                {note.status.replace(/_/g, " ")}
                              </span>

                              <ChevronDown
                                size={12}
                                className="text-zinc-400 group-hover:text-white transition-colors ml-2 shrink-0 pointer-events-none"
                              />

                              <select
                                value={note.status.toLowerCase()}
                                onChange={(e) => handleQuickStatusChange(note, e.target.value, e)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                title="Alterar status"
                              >
                                <option value="a fazer" className="bg-zinc-900 text-white font-bold py-1">A FAZER</option>
                                <option value="produção" className="bg-zinc-900 text-white font-bold py-1">PRODUÇÃO</option>
                                <option value="concluídos" className="bg-zinc-900 text-white font-bold py-1">CONCLUÍDOS</option>
                              </select>
                            </div>
                          ) : (
                            <div />
                          )}

                          <div className="flex items-center gap-2 shrink-0 note-actions">
                            {noteTab === "LIXEIRA" ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRestore(note.id);
                                  }}
                                  className="w-8 h-8 rounded-[6px] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] flex items-center justify-center cursor-pointer text-emerald-400 hover:text-emerald-300 transition-colors"
                                  title="Restaurar"
                                >
                                  <RefreshCcw size={15} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(note.id);
                                  }}
                                  className="w-8 h-8 rounded-[6px] bg-[#0B0B0C] hover:bg-red-500/15 border border-[#26262A] hover:border-red-500/40 flex items-center justify-center cursor-pointer text-red-400 hover:text-red-300 transition-colors"
                                  title="Excluir Definitivamente"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShareClick(note);
                                  }}
                                  className="w-8 h-8 rounded-[6px] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] flex items-center justify-center cursor-pointer text-[var(--gm-primary)] transition-colors"
                                  title="Compartilhar Nota"
                                >
                                  <Share2 size={15} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePdf(note);
                                  }}
                                  className="w-8 h-8 rounded-[6px] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] flex items-center justify-center cursor-pointer text-[var(--gm-primary)] transition-colors"
                                  title="Baixar / Exportar PDF"
                                >
                                  <Download size={15} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSoftDelete(note.id);
                                  }}
                                  className="w-8 h-8 rounded-[6px] bg-[#0B0B0C] hover:bg-red-500/15 border border-[#26262A] hover:border-red-500/40 flex items-center justify-center cursor-pointer text-zinc-400 hover:text-red-400 transition-colors"
                                  title="Mover para Lixeira"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          )}
          </>
        )}
        </div>

        {/* Selection Modal */}
        {typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {newNoteModalOpen && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                    onClick={() => setNewNoteModalOpen(false)}
                  />
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className={`p-6 sm:p-8 w-full max-w-xl flex flex-col relative z-10 ${cardBase} text-white`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-xl font-bold text-white mb-1">
                          Nova Nota
                        </h2>
                        <p className="text-sm text-zinc-400">
                          Selecione o tipo de nota que deseja criar.
                        </p>
                      </div>
                      <button
                        onClick={() => setNewNoteModalOpen(false)}
                        className="w-9 h-9 rounded-[4px] flex items-center justify-center text-zinc-400 hover:text-white border border-[#26262A] bg-[#0B0B0C] hover:bg-[#1B1B1E] transition-colors cursor-pointer"
                        title="Fechar"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={() => openNewNoteModal("note")}
                        className="flex flex-col items-start gap-4 p-6 rounded-md border border-[#26262A] bg-[#0B0B0C] hover:bg-[#1B1B1E] hover:border-[var(--gm-primary)]/50 transition-all text-left group cursor-pointer"
                      >
                        <div className="p-3 bg-[var(--gm-primary)]/15 text-[var(--gm-primary)] border border-[var(--gm-primary)]/30 rounded-md group-hover:scale-105 transition-transform">
                          <Edit2 size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-white mb-1">Nota</h3>
                          <p className="text-sm text-zinc-400">
                            Anotações e lembretes com alarmes gerais.
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={() => openNewNoteModal("production")}
                        className="flex flex-col items-start gap-4 p-6 rounded-md border border-[#26262A] bg-[#0B0B0C] hover:bg-[#1B1B1E] hover:border-[var(--gm-primary)]/50 transition-all text-left group cursor-pointer"
                      >
                        <div className="p-3 bg-[var(--gm-primary)]/15 text-[var(--gm-primary)] border border-[var(--gm-primary)]/30 rounded-md group-hover:scale-105 transition-transform">
                          <Palette size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-white mb-1">
                            Produção
                          </h3>
                          <p className="text-sm text-zinc-400">
                            Acompanhamento e prazos de produções.
                          </p>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>,
            document.body
          )}

      {/* Editor Modal */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {modalOpen && (
              <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-0 sm:p-3 md:p-4 md:pl-[calc(var(--gm-sidebar-width,224px)+16px)] overflow-hidden gm-note-modal-overlay">
                {/* Dark blur backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/75 backdrop-blur-sm z-0"
                  onClick={() => setModalOpen(false)}
                />

                {/* Modal Main Window */}
                <motion.div
                  ref={modalRef}
                  initial={{ y: "100%", opacity: 0, scale: 0.96 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: "100%", opacity: 0, scale: 0.96 }}
                  transition={{ type: "spring", damping: 26, stiffness: 320 }}
                  className="gm-note-modal relative w-full sm:w-[94%] rounded-xl sm:rounded-lg flex flex-col overflow-hidden border border-[#26262A] shadow-2xl bg-[#131315] text-white z-10 m-auto"
                  style={{
                    width: window.innerWidth >= 768 ? (modalCustomSize.width ? `${modalCustomSize.width}px` : "min(1152px, 94vw)") : "100%",
                    height: window.innerWidth >= 768 ? (modalCustomSize.height ? `${modalCustomSize.height}px` : undefined) : "100%",
                    maxWidth: window.innerWidth >= 768 ? "calc(100vw - var(--gm-sidebar-width, 224px) - 24px)" : "100%",
                    maxHeight: window.innerWidth < 768 ? "calc(100dvh - 12px)" : modalCustomSize.height ? `${modalCustomSize.height}px` : "92vh",
                    borderWidth: "1px",
                    borderStyle: "solid",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Indicador sutil mobile */}
                  <div className="w-8 h-[2.5px] rounded-full bg-white/20 mx-auto mt-1.5 mb-0.5 sm:hidden shrink-0" />

                  {/* Toast Feedback Flutuante no CENTRO da Nota */}
                  <AnimatePresence>
                    {toastMessage && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.75, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: -10 }}
                        transition={{ type: "spring", stiffness: 450, damping: 25 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[150] pointer-events-none"
                      >
                        <div className="bg-[#0B0B0C] text-white font-black text-xs md:text-sm px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-lg shadow-2xl border border-emerald-500/60 flex items-center gap-2.5 text-center">
                          <span className="h-2 w-2 rounded-sm bg-emerald-500 shrink-0" />
                          <span className="tracking-wide uppercase text-emerald-400 font-black text-xs sm:text-sm">
                            {toastMessage}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Header / Barra de Título */}
                  <div
                    className="px-3 sm:px-6 py-2 sm:py-3.5 flex items-center justify-between gap-2 shrink-0 relative z-20 bg-[#131315] border-b border-[#26262A]"
                    style={{
                      borderBottomColor: `${color}40`,
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="text"
                        className="gm-note-title-input bg-[#0B0B0C] border border-[#26262A] hover:border-[#3F3F46] focus:border-[var(--gm-primary,#FF6900)] rounded-[4px] outline-none px-3 py-1.5 sm:px-4 sm:py-2.5 h-9 sm:h-11 font-bold text-sm sm:text-lg text-white w-full placeholder:text-zinc-500 tracking-tight transition-all focus:ring-0 focus:outline-none"
                        style={{ outline: "none", boxShadow: "none" }}
                        placeholder="Título da nota..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSave(true);
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <button
                        type="button"
                        data-icon-btn="true"
                        onClick={() => setIsPinned(!isPinned)}
                        className={`gm-note-modal-pin-btn w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-[4px] transition-all cursor-pointer border ${
                          isPinned ? "pinned" : "bg-[#0B0B0C] border-[#26262A] hover:bg-[#1B1B1E] text-zinc-400 hover:text-white"
                        }`}
                        title={isPinned ? "Desafixar nota" : "Fixar nota no topo"}
                      >
                        <Pin
                          size={15}
                          className={
                            isPinned
                              ? "rotate-[-30deg] transition-transform"
                              : "rotate-0 transition-transform"
                          }
                        />
                      </button>
                      <button
                        type="button"
                        data-icon-btn="true"
                        onClick={() => setModalOpen(false)}
                        className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-[4px] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] text-zinc-400 hover:text-white transition-all cursor-pointer"
                        title="Fechar nota"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Navegação Superior por Abas */}
                  <div className="px-3 sm:px-6 py-1.5 sm:py-2 bg-[#131315] border-b border-[#26262A] select-none shrink-0 z-20">
                    <div className="grid grid-cols-3 gap-1 w-full bg-[#0B0B0C] p-1 rounded-md border border-[#26262A]">
                      {/* Aba 1: Nota & Texto */}
                      <button
                        type="button"
                        data-note-tool-btn="true"
                        aria-pressed={editorTab === "note"}
                        data-selected={editorTab === "note"}
                        onClick={() => setEditorTab("note")}
                        className={`py-1.5 sm:py-2 px-1.5 sm:px-4 rounded-[4px] text-[10px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer select-none whitespace-nowrap min-h-[30px] sm:min-h-[34px] ${
                          editorTab === "note"
                            ? "bg-[var(--gm-primary,#FF6900)] text-white border border-[var(--gm-primary,#FF6900)]"
                            : "text-zinc-400 hover:text-white hover:bg-[#1B1B1E] border border-transparent"
                        }`}
                      >
                        <FileText size={12} className={editorTab === "note" ? "shrink-0 text-white sm:w-[14px] sm:h-[14px]" : "shrink-0 sm:w-[14px] sm:h-[14px]"} />
                        <span>NOTA</span>
                      </button>

                      {/* Aba 2: Layouts & Fotos */}
                      <button
                        type="button"
                        data-note-tool-btn="true"
                        aria-pressed={editorTab === "layouts"}
                        data-selected={editorTab === "layouts"}
                        onClick={() => setEditorTab("layouts")}
                        className={`py-1.5 sm:py-2 px-1.5 sm:px-4 rounded-[4px] text-[10px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer select-none whitespace-nowrap min-h-[30px] sm:min-h-[34px] ${
                          editorTab === "layouts"
                            ? "bg-[var(--gm-primary,#FF6900)] text-white border border-[var(--gm-primary,#FF6900)]"
                            : "text-zinc-400 hover:text-white hover:bg-[#1B1B1E] border border-transparent"
                        }`}
                      >
                        <ImageIcon size={12} className={editorTab === "layouts" ? "shrink-0 text-white sm:w-[14px] sm:h-[14px]" : "shrink-0 sm:w-[14px] sm:h-[14px]"} />
                        <span>LAYOUTS</span>
                        {layoutUrls.length > 0 && (
                          <span
                            className={`text-[9.5px] sm:text-[11px] font-black px-1 py-0.25 rounded-[3px] tabular-nums leading-none ${
                              editorTab === "layouts"
                                ? "bg-black/25 text-white"
                                : "bg-[#1B1B1E] text-white"
                            }`}
                          >
                            {layoutUrls.length}
                          </span>
                        )}
                      </button>

                      {/* Aba 3: Configurações & Prazos */}
                      <button
                        type="button"
                        data-note-tool-btn="true"
                        aria-pressed={editorTab === "settings"}
                        data-selected={editorTab === "settings"}
                        onClick={() => setEditorTab("settings")}
                        className={`py-1.5 sm:py-2 px-1.5 sm:px-4 rounded-[4px] text-[10px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer select-none whitespace-nowrap min-h-[30px] sm:min-h-[34px] ${
                          editorTab === "settings"
                            ? "bg-[var(--gm-primary,#FF6900)] text-white border border-[var(--gm-primary,#FF6900)]"
                            : "text-zinc-400 hover:text-white hover:bg-[#1B1B1E] border border-transparent"
                        }`}
                      >
                        <Sliders size={12} className={editorTab === "settings" ? "shrink-0 text-white sm:w-[14px] sm:h-[14px]" : "shrink-0 sm:w-[14px] sm:h-[14px]"} />
                        <span>CONFIGURAÇÕES</span>
                        {(deliveryDate || deliveryTime) && (
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-sm bg-emerald-400 shrink-0" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Text Formatting Toolbar (Organizada em grupos nítidos e 100% visível no mobile) */}
                  {editorTab === "note" && (
                    <div
                      className="flex flex-col gap-1.5 px-3 sm:px-6 py-2 bg-[#0B0B0C] border-b border-[#26262A] select-none shrink-0 relative z-30"
                      style={{ borderColor: `${color}30` }}
                    >
                      {/* Cabeçalho compacto de Configurações de Texto */}
                      <div className="flex items-center justify-between gap-2 md:hidden">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Formatação de Texto
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#131315] border border-[#26262A]">
                            <span
                              className="w-2.5 h-2.5 rounded-[2px] border border-white/40"
                              style={{ backgroundColor: selectedTextColor }}
                            />
                            <span className="text-zinc-300 uppercase">Cor</span>
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#131315] border border-[#26262A] text-zinc-300">
                            Tam: {fontSizeMode === "P" ? "Peq" : fontSizeMode === "M" ? "Méd" : "Grd"}
                          </span>
                        </div>
                      </div>

                      {/* Linhas de ferramentas visíveis sem corte lateral no mobile */}
                      <div className="flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-center gap-1.5 relative z-30">
                        {/* Linha 1 Mobile: Estilo (B I U S) + Cor + Fontes + Tamanho */}
                        <div className="flex items-center justify-between sm:justify-start md:justify-center gap-1.5 flex-wrap">
                          {/* Grupo Estilo: B / I / U / S */}
                          <div className="inline-flex items-center bg-[#131315] border border-[#26262A] rounded-[5px] p-0.5 gap-0.5">
                            <button
                              type="button"
                              data-note-tool-btn="true"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                applyBold();
                              }}
                              className="h-[28px] w-[28px] sm:h-[32px] sm:w-[32px] rounded-[3px] hover:bg-[#1B1B1E] text-white font-extrabold text-xs sm:text-sm transition-colors flex items-center justify-center cursor-pointer"
                              title="Negrito"
                            >
                              B
                            </button>
                            <button
                              type="button"
                              data-note-tool-btn="true"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                applyItalic();
                              }}
                              className="h-[28px] w-[28px] sm:h-[32px] sm:w-[32px] rounded-[3px] hover:bg-[#1B1B1E] text-white italic font-serif text-xs sm:text-sm transition-colors flex items-center justify-center cursor-pointer"
                              title="Itálico"
                            >
                              I
                            </button>
                            <button
                              type="button"
                              data-note-tool-btn="true"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                applyUnderline();
                              }}
                              className="h-[28px] w-[28px] sm:h-[32px] sm:w-[32px] rounded-[3px] hover:bg-[#1B1B1E] text-white transition-colors flex items-center justify-center cursor-pointer"
                              title="Sublinhar"
                            >
                              <Underline size={13} className="sm:w-[15px] sm:h-[15px]" />
                            </button>
                            <button
                              type="button"
                              data-note-tool-btn="true"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                applyStrikeThrough();
                              }}
                              className="h-[28px] w-[28px] sm:h-[32px] sm:w-[32px] rounded-[3px] hover:bg-[#1B1B1E] text-white transition-colors flex items-center justify-center cursor-pointer"
                              title="Tachado"
                            >
                              <Strikethrough size={13} className="sm:w-[15px] sm:h-[15px]" />
                            </button>
                          </div>

                          {/* Botões Visuais: Cor + Fontes + Tamanho */}
                          <div className="flex items-center gap-1 sm:gap-1.5 flex-1 sm:flex-none justify-end sm:justify-start">
                            {/* Cores do Texto */}
                            <button
                              type="button"
                              data-note-tool-btn="true"
                              aria-pressed={colorPickerOpen}
                              data-selected={colorPickerOpen}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                saveCurrentSelection();
                                setColorPickerOpen(!colorPickerOpen);
                                setHighlighterPickerOpen(false);
                                setFontSelectorOpen(false);
                              }}
                              className={`h-[30px] sm:h-[34px] px-2 sm:px-2.5 rounded-[5px] border transition-colors flex items-center gap-1 sm:gap-1.5 cursor-pointer text-[11px] font-bold ${
                                colorPickerOpen
                                  ? "bg-[var(--gm-primary,#FE540B)]/20 text-white border-[var(--gm-primary,#FE540B)]/60"
                                  : "bg-[#131315] hover:bg-[#1B1B1E] border-[#26262A] text-white"
                              }`}
                              title="Cor do Texto (Abrir configurações de cores)"
                            >
                              <Palette size={13} className={colorPickerOpen ? "text-white" : "text-zinc-300"} />
                              <span
                                className="w-3 h-3 rounded-[2px] border border-white/40 shrink-0"
                                style={{ backgroundColor: selectedTextColor }}
                              />
                              <span className="hidden xs:inline sm:inline">Cor</span>
                              <ChevronDown size={10} className={colorPickerOpen ? "text-white" : "text-zinc-400"} />
                            </button>

                            {/* Galeria de Fontes */}
                            <button
                              type="button"
                              data-note-tool-btn="true"
                              aria-pressed={fontSelectorOpen}
                              data-selected={fontSelectorOpen}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                saveCurrentSelection();
                                setFontSelectorOpen(!fontSelectorOpen);
                                setColorPickerOpen(false);
                                setHighlighterPickerOpen(false);
                              }}
                              className={`h-[30px] sm:h-[34px] px-2 sm:px-3 rounded-[5px] border text-[11px] sm:text-xs transition-colors font-bold flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap ${
                                fontSelectorOpen
                                  ? "bg-[var(--gm-primary,#FE540B)]/20 text-white border-[var(--gm-primary,#FE540B)]/60"
                                  : "bg-[#131315] hover:bg-[#1B1B1E] border-[#26262A] text-white"
                              }`}
                              title="Galeria de Fontes"
                            >
                              <Type size={12} className={fontSelectorOpen ? "text-white" : "text-zinc-300"} />
                              <span>Fontes</span>
                              <ChevronDown size={10} className={fontSelectorOpen ? "text-white" : "text-zinc-400"} />
                            </button>

                            {/* Size Cycle */}
                            <button
                              type="button"
                              data-note-tool-btn="true"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                cycleFontSize();
                              }}
                              className="h-[30px] sm:h-[34px] px-2 sm:px-2.5 rounded-[5px] bg-[#131315] hover:bg-[#1B1B1E] border border-[#26262A] text-white text-[10.5px] sm:text-[11px] transition-colors font-semibold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                              title="Alternar Tamanho da Fonte"
                            >
                              <span className="text-zinc-400 font-bold">Aa</span>
                              <span className="font-extrabold bg-[#1B1B1E] px-1.5 py-0.25 rounded-[3px] uppercase text-white">
                                {fontSizeMode === "P"
                                  ? "Peq"
                                  : fontSizeMode === "M"
                                    ? "Méd"
                                    : "Grd"}
                              </span>
                            </button>
                          </div>
                        </div>

                        <div className="hidden md:block h-5 w-[1px] bg-[#26262A] mx-0.5 shrink-0" />

                        {/* Linha 2 Mobile: Alinhamento + Listas + Marcador */}
                        <div className="flex items-center justify-between sm:justify-start md:justify-center gap-1.5 flex-wrap">
                          {/* Grupo Alinhamento */}
                          <div className="inline-flex items-center bg-[#131315] border border-[#26262A] rounded-[5px] p-0.5 gap-0.5">
                            <button
                              type="button"
                              data-note-tool-btn="true"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                applyAlign("left");
                              }}
                              className="h-[28px] w-[28px] sm:h-[32px] sm:w-[32px] rounded-[3px] hover:bg-[#1B1B1E] text-white transition-colors flex items-center justify-center cursor-pointer"
                              title="Alinhar à Esquerda"
                            >
                              <AlignLeft size={13} className="sm:w-[15px] sm:h-[15px]" />
                            </button>
                            <button
                              type="button"
                              data-note-tool-btn="true"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                applyAlign("center");
                              }}
                              className="h-[28px] w-[28px] sm:h-[32px] sm:w-[32px] rounded-[3px] hover:bg-[#1B1B1E] text-white transition-colors flex items-center justify-center cursor-pointer"
                              title="Centralizar"
                            >
                              <AlignCenter size={13} className="sm:w-[15px] sm:h-[15px]" />
                            </button>
                            <button
                              type="button"
                              data-note-tool-btn="true"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                applyAlign("right");
                              }}
                              className="h-[28px] w-[28px] sm:h-[32px] sm:w-[32px] rounded-[3px] hover:bg-[#1B1B1E] text-white transition-colors flex items-center justify-center cursor-pointer"
                              title="Alinhar à Direita"
                            >
                              <AlignRight size={13} className="sm:w-[15px] sm:h-[15px]" />
                            </button>
                            <button
                              type="button"
                              data-note-tool-btn="true"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                applyAlign("justify");
                              }}
                              className="h-[28px] w-[28px] sm:h-[32px] sm:w-[32px] rounded-[3px] hover:bg-[#1B1B1E] text-white transition-colors flex items-center justify-center cursor-pointer"
                              title="Justificar"
                            >
                              <AlignJustify size={13} className="sm:w-[15px] sm:h-[15px]" />
                            </button>
                          </div>

                          {/* Grupo Listas + Marcador */}
                          <div className="flex items-center gap-1 sm:gap-1.5 flex-1 sm:flex-none justify-end sm:justify-start">
                            <div className="inline-flex items-center bg-[#131315] border border-[#26262A] rounded-[5px] p-0.5 gap-0.5">
                              <button
                                type="button"
                                data-note-tool-btn="true"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  applyList("bullet");
                                }}
                                className="h-[28px] w-[28px] sm:h-[32px] sm:w-[32px] rounded-[3px] hover:bg-[#1B1B1E] text-white transition-colors flex items-center justify-center cursor-pointer"
                                title="Lista de Marcadores"
                              >
                                <List size={13} className="sm:w-[15px] sm:h-[15px]" />
                              </button>
                              <button
                                type="button"
                                data-note-tool-btn="true"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  applyList("ordered");
                                }}
                                className="h-[28px] w-[28px] sm:h-[32px] sm:w-[32px] rounded-[3px] hover:bg-[#1B1B1E] text-white transition-colors flex items-center justify-center cursor-pointer"
                                title="Lista Numerada"
                              >
                                <ListOrdered size={13} className="sm:w-[15px] sm:h-[15px]" />
                              </button>
                            </div>

                            {/* Highlighter / Marcador de Texto */}
                            <button
                              type="button"
                              data-note-tool-btn="true"
                              aria-pressed={highlighterPickerOpen}
                              data-selected={highlighterPickerOpen}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                saveCurrentSelection();
                                setHighlighterPickerOpen(!highlighterPickerOpen);
                                setColorPickerOpen(false);
                                setFontSelectorOpen(false);
                              }}
                              className={`h-[30px] sm:h-[34px] px-2 sm:px-2.5 rounded-[5px] border transition-colors flex items-center gap-1 sm:gap-1.5 cursor-pointer text-[11px] font-bold ${
                                highlighterPickerOpen
                                  ? "bg-[var(--gm-primary,#FE540B)]/20 text-white border-[var(--gm-primary,#FE540B)]/60"
                                  : "bg-[#131315] hover:bg-[#1B1B1E] border-[#26262A] text-white"
                              }`}
                              title="Marcador de Texto"
                            >
                              <Highlighter size={13} className={highlighterPickerOpen ? "text-white" : "text-zinc-300"} />
                              <span
                                className="w-3 h-3 rounded-[2px] border border-white/40 shrink-0"
                                style={{ backgroundColor: selectedHighlightColor || "transparent" }}
                              />
                              <span>Grifar</span>
                              <ChevronDown size={10} className={highlighterPickerOpen ? "text-white" : "text-zinc-400"} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

              {/* Scrollable Area com visual Apple, espaçamento harmônico e containers limpos */}
              <div
                className="flex-1 overflow-y-auto custom-scroll min-h-0 relative flex flex-col p-3 sm:p-5 gap-3 sm:gap-4"
                style={{
                  backgroundColor: "transparent",
                  boxShadow: `inset 0 0 50px ${color}10`,
                }}
              >
                {/* ========================================================================= */}
                {/* ABA 1: NOTA & DIGITAÇÃO */}
                {/* ========================================================================= */}
                {editorTab === "note" && (
                  <motion.div
                    key="tab-note"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col gap-2.5 sm:gap-3.5 flex-1 min-h-0"
                  >
                    {/* Contexto Rápido */}
                    <div className="flex items-center justify-between flex-wrap gap-1.5 sm:gap-2 px-0.5">
                      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                        {/* Tipo da Nota */}
                        <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-[4px] bg-[#0B0B0C] text-zinc-200 border border-[#26262A]">
                          {noteType === "production" ? "PRODUÇÃO" : "GERAL"}
                        </span>

                        {/* Status */}
                        <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-[4px] bg-[var(--gm-primary)]/15 text-[var(--gm-primary)] border border-[var(--gm-primary)]/35">
                          {noteStatus.replace(/_/g, " ")}
                        </span>

                        {/* Prazo */}
                        {deliveryDate && (
                          <span className="inline-flex text-[10px] sm:text-[11px] font-bold text-orange-300 items-center gap-1 bg-orange-500/10 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-[4px] border border-orange-500/25 tabular-nums">
                            <Calendar size={10} className="sm:w-[11px] sm:h-[11px]" />
                            {deliveryDate.split("-").reverse().join("/")}
                            {deliveryTime ? ` às ${deliveryTime}` : ""}
                          </span>
                        )}

                        {/* Responsável */}
                        {responsibleName && (
                          <span className="inline-flex text-[10px] sm:text-[11px] font-bold text-zinc-300 items-center gap-1 bg-[#0B0B0C] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-[4px] border border-[#26262A] truncate max-w-[120px] sm:max-w-[140px]">
                            <User size={10} className="sm:w-[11px] sm:h-[11px]" />
                            {responsibleName}
                          </span>
                        )}
                      </div>

                      {/* Botão Atalho para Configurações */}
                      <button
                        id="btn-note-adjust-settings"
                        type="button"
                        data-note-tool-btn="true"
                        onClick={() => setEditorTab("settings")}
                        className="shrink-0 flex items-center justify-center gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 h-7 sm:h-8 rounded-[5px] bg-[#1B1B1E] hover:bg-[#F65A1A] text-zinc-200 hover:text-[#0B0B0C] font-bold text-[10.5px] sm:text-xs uppercase tracking-wide border border-[#26262A] hover:border-[#F65A1A] transition-colors cursor-pointer whitespace-nowrap"
                        title="Ajustar configurações e prazos da nota"
                      >
                        <Sliders size={12} className="shrink-0" strokeWidth={2.3} />
                        <span className="sm:hidden">Configurar</span>
                        <span className="hidden sm:inline">Ajustar configurações</span>
                      </button>
                    </div>

                    {/* Prévias compactas de layouts se houver */}
                    {layoutUrls.length > 0 && (
                      <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-md bg-[#0B0B0C] border border-[#26262A]">
                        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
                          {layoutUrls.slice(0, 6).map((url, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                setZoomImage({ url, index: idx });
                                setZoomScale(1);
                              }}
                              className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-[4px] overflow-hidden border border-[#26262A] hover:border-[#3F3F46] shrink-0 cursor-pointer transition-colors"
                              title={`Ver layout ${idx + 1}`}
                            >
                              <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 right-0 bg-black/80 text-[10px] font-mono font-bold px-1 rounded-tl text-white tabular-nums">
                                #{idx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          data-note-tool-btn="true"
                          onClick={() => setEditorTab("layouts")}
                          className="text-[11px] sm:text-xs font-bold text-[var(--gm-primary,#FF6900)] hover:underline whitespace-nowrap shrink-0 px-2 py-1 rounded-[4px] bg-[#131315] hover:bg-[#1B1B1E] border border-[#26262A] transition-colors cursor-pointer"
                        >
                          Layouts ({layoutUrls.length}) →
                        </button>
                      </div>
                    )}

                    {/* Writing Card */}
                    <div className="gm-note-editor-card flex flex-col flex-1 w-full rounded-md bg-[#0B0B0C] border border-[#26262A] transition-colors p-3 sm:p-5 min-h-[210px] sm:min-h-[280px]">
                      {/* Barra superior de controle do editor */}
                      <div className="flex items-center justify-between pb-2 mb-2 sm:pb-2.5 sm:mb-2.5 border-b border-[#26262A] flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] sm:text-xs font-semibold text-zinc-400">Texto da Nota</span>
                          <span className="text-[10.5px] sm:text-[11px] text-zinc-500 font-mono tabular-nums">
                            {content ? content.replace(/<[^>]+>/g, "").trim().length : 0} carac.
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            data-icon-btn="true"
                            onClick={performUndo}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-[4px] bg-[#131315] hover:bg-[#1B1B1E] border border-[#26262A] text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                            title="Desfazer (Undo)"
                          >
                            <Undo2 size={13} />
                          </button>

                          <button
                            type="button"
                            data-icon-btn="true"
                            onClick={performRedo}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-[4px] bg-[#131315] hover:bg-[#1B1B1E] border border-[#26262A] text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                            title="Refazer (Redo)"
                          >
                            <Redo2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Editor ContentEditable */}
                      <div
                        ref={(el) => {
                          contentRef.current = el;
                          if (el && el.innerHTML !== content) {
                            el.innerHTML = content;
                          }
                        }}
                        key={editingNote ? editingNote.id : "new-note"}
                        contentEditable
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          const deleteBtn = target.closest(".note-img-delete");
                          if (deleteBtn) {
                            e.preventDefault();
                            e.stopPropagation();
                            const wrapper = deleteBtn.closest(".note-img-wrapper");
                            if (wrapper) {
                              wrapper.remove();
                              if (contentRef.current) {
                                const val = contentRef.current.innerHTML;
                                setContent(val);
                                pushToHistory(val, true);
                              }
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (
                            (e.ctrlKey || e.metaKey) &&
                            !e.shiftKey &&
                            e.key.toLowerCase() === "z"
                          ) {
                            e.preventDefault();
                            performUndo();
                          } else if (
                            ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
                            ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
                          ) {
                            e.preventDefault();
                            performRedo();
                          }
                        }}
                        onKeyUp={() => {
                          saveCurrentSelection();
                          if (contentRef.current) {
                            const val = contentRef.current.innerHTML;
                            if (val !== content) {
                              setContent(val);
                            }
                          }
                        }}
                        onMouseUp={() => saveCurrentSelection()}
                        onPointerUp={() => saveCurrentSelection()}
                        onTouchEnd={() => saveCurrentSelection()}
                        onSelect={() => saveCurrentSelection()}
                        onCut={() => {
                          setTimeout(() => {
                            if (contentRef.current) {
                              const val = contentRef.current.innerHTML;
                              setContent(val);
                              pushToHistory(val, true);
                              saveCurrentSelection();
                            }
                          }, 10);
                        }}
                        onInput={(e) => {
                          const val = e.currentTarget.innerHTML;
                          setContent(val);
                          pushToHistory(val);
                          saveCurrentSelection();
                        }}
                        className="gm-note-editor-content w-full flex-1 min-h-[180px] sm:min-h-[220px] bg-transparent !outline-none text-white/95 focus:!outline-none focus-visible:!outline-none border-none focus:border-none ring-0 focus:ring-0 relative empty:before:content-[attr(placeholder)] before:text-white/30 before:pointer-events-none before:absolute before:left-0 before:top-0 text-[13.5px] sm:text-[15.5px] font-normal leading-relaxed"
                        style={{ outline: "none", boxShadow: "none" }}
                        {...{ placeholder: "Escreva seu texto aqui..." }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* ========================================================================= */}
                {/* ABA 2: LAYOUTS & FOTOS */}
                {/* ========================================================================= */}
                {editorTab === "layouts" && (
                  <motion.div
                    key="tab-layouts"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col gap-4 flex-1 min-h-0"
                  >
                    {/* Card para Adicionar Layouts */}
                    <div className="p-4 sm:p-5 rounded-md border border-[#26262A] bg-[#0B0B0C] flex flex-col gap-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <ImageIcon size={16} className="text-[var(--gm-primary,#FF6900)]" />
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                            Layouts & Anexos
                          </span>
                        </div>
                        <span
                          className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-[4px] border tabular-nums ${
                            layoutUrls.length >= 6
                              ? "bg-orange-500/20 text-orange-400 border-orange-500/35"
                              : "bg-[#131315] text-zinc-300 border-[#26262A]"
                          }`}
                        >
                          {layoutUrls.length}/6 layouts
                        </span>
                      </div>

                      {/* Input de URL e Botão de Adicionar */}
                      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
                        <div className="relative flex-1 flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              placeholder={
                                layoutUrls.length >= 6
                                  ? "Limite máximo de 6 layouts atingido"
                                  : "Cole o link da imagem para o layout..."
                              }
                              disabled={layoutUrls.length >= 6}
                              value={layoutUrlInput}
                              onChange={(e) => setLayoutUrlInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && layoutUrlInput.trim()) {
                                  e.preventDefault();
                                  if (layoutUrls.length >= 6) {
                                    showToast("Limite máximo de 6 layouts atingido!");
                                    return;
                                  }
                                  const val = layoutUrlInput.trim();
                                  setLayoutUrls((prev) =>
                                    prev.includes(val) ? prev : [...prev, val].slice(0, 6)
                                  );
                                  setLayoutUrlInput("");
                                  showToast("Layout adicionado!");
                                }
                              }}
                              className="bg-[#131315] border border-[#26262A] rounded-[4px] text-sm text-white pl-9 pr-3 py-2.5 outline-none focus:border-[var(--gm-primary,#FF6900)] w-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            />
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
                          </div>

                          {layoutUrlInput.trim() && (
                            <button
                              type="button"
                              disabled={layoutUrls.length >= 6}
                              onClick={() => {
                                if (layoutUrls.length >= 6) {
                                  showToast("Limite máximo de 6 layouts atingido!");
                                  return;
                                }
                                const val = layoutUrlInput.trim();
                                setLayoutUrls((prev) =>
                                  prev.includes(val) ? prev : [...prev, val].slice(0, 6)
                                );
                                setLayoutUrlInput("");
                                showToast("Layout adicionado!");
                              }}
                              className="bg-[#F65A1A] hover:bg-[#FF7A38] rounded-[6px] text-xs font-black text-[#0B0B0C] px-4 py-2.5 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer whitespace-nowrap"
                            >
                              <Plus size={14} />
                              <span>Adicionar</span>
                            </button>
                          )}
                        </div>

                        {/* Botão de Enviar Imagens do Smartphone */}
                        <label
                          className={`bg-[#131315] hover:bg-[#1B1B1E] border border-[#26262A] hover:border-[#3F3F46] rounded-[6px] text-xs font-bold text-white px-4 py-2.5 outline-none cursor-pointer flex items-center justify-center gap-2 transition-colors shrink-0 whitespace-nowrap ${
                            uploadingLayout || layoutUrls.length >= 6 ? "opacity-50 pointer-events-none" : ""
                          }`}
                        >
                          {uploadingLayout ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Upload size={14} className="text-[var(--gm-primary,#FF6900)]" />
                          )}
                          <span>{uploadingLayout ? "Enviando fotos..." : "Enviar do Smartphone"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            multiple
                            disabled={uploadingLayout || layoutUrls.length >= 6}
                            onChange={async (e) => {
                              const files = e.target.files;
                              if (files && files.length > 0 && tenantId) {
                                const availableSlots = 6 - layoutUrls.length;
                                if (availableSlots <= 0) {
                                  showToast("Limite máximo de 6 layouts atingido!");
                                  return;
                                }
                                const filesToUpload = Array.from(files).slice(0, availableSlots);
                                setUploadingLayout(true);
                                try {
                                  const options = {
                                    maxSizeMB: 1,
                                    maxWidthOrHeight: 1600,
                                    useWebWorker: true,
                                  };
                                  const uploadedUrls: string[] = [];
                                  for (const file of filesToUpload) {
                                    const compressedFile = await imageCompression(file, options);
                                    const url = await uploadNoteAsset(tenantId, compressedFile);
                                    if (url) {
                                      uploadedUrls.push(url);
                                    }
                                  }
                                  setLayoutUrls((prev) => {
                                    const uniqueNew = uploadedUrls.filter((u) => !prev.includes(u));
                                    return [...prev, ...uniqueNew].slice(0, 6);
                                  });
                                  showToast(`${uploadedUrls.length} layout(s) enviado(s) com sucesso!`);
                                } catch (err) {
                                  alert("Erro ao enviar layout(s).");
                                } finally {
                                  setUploadingLayout(false);
                                  e.target.value = "";
                                }
                              }
                            }}
                          />
                        </label>
                      </div>

                      {layoutUrls.length > 1 && (
                        <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Move size={12} /> Toque e arraste para reordenar
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setLayoutUrls([]);
                              setLayoutUrlInput("");
                            }}
                            className="text-red-400 hover:text-red-300 font-bold hover:underline cursor-pointer"
                          >
                            Remover todos
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Grid com Prévias dos Layouts */}
                    {layoutUrls.length > 0 ? (
                      <div
                        className={`w-full py-1 grid gap-3.5 ${
                          layoutUrls.length === 1
                            ? "grid-cols-1"
                            : layoutUrls.length === 2
                              ? "grid-cols-1 sm:grid-cols-2"
                              : "grid-cols-2 sm:grid-cols-3"
                        }`}
                      >
                        {layoutUrls.map((url, idx) => {
                          const isDragged = draggedLayoutIdx === idx;
                          const isDragOver = dragOverLayoutIdx === idx;

                          return (
                            <div
                              key={`${url}-${idx}`}
                              draggable
                              onDragStart={(e) => {
                                setDraggedLayoutIdx(idx);
                                e.dataTransfer.setData("text/plain", `${idx}`);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                if (dragOverLayoutIdx !== idx) setDragOverLayoutIdx(idx);
                              }}
                              onDragLeave={() => {
                                if (dragOverLayoutIdx === idx) setDragOverLayoutIdx(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedLayoutIdx === null || draggedLayoutIdx === idx) {
                                  setDraggedLayoutIdx(null);
                                  setDragOverLayoutIdx(null);
                                  return;
                                }
                                setLayoutUrls((prev) => {
                                  const copy = [...prev];
                                  const [item] = copy.splice(draggedLayoutIdx, 1);
                                  copy.splice(idx, 0, item);
                                  return copy;
                                });
                                setDraggedLayoutIdx(null);
                                setDragOverLayoutIdx(null);
                                showToast(`Layout reorganizado para a posição ${idx + 1}`);
                              }}
                              onDragEnd={() => {
                                setDraggedLayoutIdx(null);
                                setDragOverLayoutIdx(null);
                              }}
                              onClick={() => {
                                setZoomImage({ url, index: idx });
                                setZoomScale(1);
                              }}
                              className={`relative flex items-center justify-center rounded-md overflow-hidden group bg-[#0B0B0C] border transition-all duration-300 cursor-pointer select-none aspect-video sm:aspect-auto ${
                                isDragOver
                                  ? "border-[var(--gm-primary,#FF6900)] ring-2 ring-orange-500/40"
                                  : isDragged
                                    ? "opacity-40 border-dashed border-zinc-400"
                                    : "border-[#26262A] hover:border-[#3F3F46]"
                              }`}
                              title="Toque para ampliar com Zoom ou arraste para reorganizar"
                            >
                              <img
                                src={url}
                                alt={`Layout ${idx + 1}`}
                                className="w-full h-full object-cover rounded-md transition-transform duration-500 group-hover:scale-105 pointer-events-none max-h-[300px]"
                              />

                              {/* Badge Canto Superior Esquerdo: Posição */}
                              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-20 pointer-events-none">
                                <span className="px-2 py-0.5 rounded-[4px] bg-black/80 text-white text-[11px] font-mono font-black flex items-center justify-center border border-[#26262A] tabular-nums">
                                  #{idx + 1}
                                </span>
                                {idx === 0 && (
                                  <span className="px-2 py-0.5 rounded-[4px] bg-[var(--gm-primary,#FF6900)] text-[#0B0B0C] text-[11px] font-black uppercase">
                                    Principal
                                  </span>
                                )}
                              </div>

                              {/* Botão de Excluir */}
                              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLayoutUrls((prev) => prev.filter((_, i) => i !== idx));
                                    showToast(`Layout ${idx + 1} removido`);
                                  }}
                                  className="w-7 h-7 rounded-[4px] bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors cursor-pointer"
                                  title={`Excluir layout ${idx + 1}`}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>

                              {/* Overlay com Zoom Indicator */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <span className="px-3 py-1.5 rounded-[4px] bg-[#131315] border border-[#26262A] text-white text-xs font-bold flex items-center gap-1.5">
                                  <ZoomIn size={13} className="text-[var(--gm-primary,#FF6900)]" />
                                  Ver com Zoom
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-12 px-4 text-zinc-400 gap-3 bg-[#0B0B0C] rounded-md border border-[#26262A]">
                        <div className="w-12 h-12 rounded-md bg-[#131315] border border-[#26262A] flex items-center justify-center text-zinc-400">
                          <ImageIcon size={22} />
                        </div>
                        <div className="flex flex-col gap-1 max-w-sm">
                          <span className="text-sm font-bold text-zinc-200">Nenhum layout adicionado</span>
                          <span className="text-xs text-zinc-400">
                            Adicione links de imagens ou envie fotos do smartphone para acompanhar referências visuais nesta nota.
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ========================================================================= */}
                {/* ABA 3: CONFIGURAÇÕES & PRAZOS */}
                {/* ========================================================================= */}
                {editorTab === "settings" && (
                  <motion.div
                    key="tab-settings"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col gap-3 sm:gap-4 flex-1 min-h-0"
                  >
                    {/* Card 1: Classificação e Responsável */}
                    <div className="p-3 sm:p-5 rounded-md border border-[#26262A] bg-[#0B0B0C] flex flex-col gap-2.5 sm:gap-3.5">
                      <div className="flex items-center gap-2 pb-1.5 sm:pb-2 border-b border-[#26262A]">
                        <Palette size={14} className="text-[var(--gm-primary,#FF6900)]" />
                        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-200">
                          Classificação & Responsável
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
                        {/* Tipo da Nota */}
                        <div className="flex flex-col gap-1 w-full">
                          <label className="text-[11px] sm:text-xs font-semibold text-zinc-400">
                            Tipo da Nota
                          </label>
                          <div className="relative">
                            <select
                              value={noteType}
                              onChange={(e) => {
                                setNoteType(e.target.value as any);
                                setNoteStatus("a fazer");
                              }}
                              className="w-full appearance-none bg-[#131315] border border-[#26262A] rounded-[4px] text-xs sm:text-sm text-white pl-3 pr-9 h-9 sm:h-[44px] outline-none focus:border-[var(--gm-primary,#FF6900)] cursor-pointer font-semibold transition-colors"
                            >
                              <option value="note">GERAL</option>
                              <option value="production">PRODUÇÃO</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex flex-col gap-1 w-full">
                          <label className="text-[11px] sm:text-xs font-semibold text-zinc-400">
                            Status
                          </label>
                          <div className="relative">
                            <select
                              value={noteStatus}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNoteStatus(val);
                                const isComp = normalizeStatus(val).includes("CONCLU");
                                if (isComp) {
                                  setReminderTime("");
                                  setReminderTime2("");
                                  setReminderTime3("");
                                  setReminderDate("");
                                  if (editingNote) {
                                    removeAlarmsForBudget(editingNote.id);
                                  }
                                  showToast("Status Concluído: lembrete e alarme zerados!");
                                }
                              }}
                              className="w-full appearance-none bg-[#131315] border border-[#26262A] rounded-[4px] text-xs sm:text-sm text-white pl-3 pr-9 h-9 sm:h-[44px] outline-none focus:border-[var(--gm-primary,#FF6900)] cursor-pointer font-semibold transition-colors"
                            >
                              {noteType === "note"
                                ? NOTE_STATUSES.filter((s) => s !== "LIXEIRA").map((s) => (
                                    <option key={s} value={s.toLowerCase()}>
                                      {s}
                                    </option>
                                  ))
                                : PROD_STATUSES.filter((s) => s !== "LIXEIRA").map((s) => (
                                    <option key={s} value={s.toLowerCase()}>
                                      {s}
                                    </option>
                                  ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
                          </div>
                        </div>

                        {/* Responsável */}
                        <div className="flex flex-col gap-1 w-full">
                          <label className="text-[11px] sm:text-xs font-semibold text-zinc-400">
                            Responsável
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Nome do responsável"
                              value={responsibleName}
                              onChange={(e) => setResponsibleName(e.target.value)}
                              className="bg-[#131315] border border-[#26262A] rounded-[4px] text-xs sm:text-sm text-white pl-8 pr-3 h-9 sm:h-[44px] outline-none focus:border-[var(--gm-primary,#FF6900)] w-full font-semibold transition-colors"
                            />
                            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Prazos de Entrega */}
                    <div className="p-3 sm:p-5 rounded-md border border-[#26262A] bg-[#0B0B0C] flex flex-col gap-2.5 sm:gap-3.5">
                      <div className="flex items-center gap-2 pb-1.5 sm:pb-2 border-b border-[#26262A]">
                        <Calendar size={14} className="text-[var(--gm-primary,#FF6900)]" />
                        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-200">
                          Prazo & Horário de Entrega
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                        {/* Prazo de Entrega */}
                        <div className="flex flex-col gap-1 w-full">
                          <label className="text-[11px] sm:text-xs font-semibold text-zinc-400">
                            Data de Entrega
                          </label>
                          <div className="relative">
                            <GlassDatePicker
                              value={deliveryDate}
                              onChange={setDeliveryDate}
                              className="w-full bg-[#131315] border border-[#26262A] rounded-[4px] text-xs sm:text-sm text-white pl-8 pr-12 h-9 sm:h-[44px] flex items-center outline-none focus:border-[var(--gm-primary,#FF6900)] font-semibold transition-colors"
                              title="Prazo de Entrega"
                              themeColor={color}
                              placeholder="DD/MM/AAAA"
                            />
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
                          </div>
                        </div>

                        {/* Horário de Entrega */}
                        <div className="flex flex-col gap-1 w-full">
                          <label className="text-[11px] sm:text-xs font-semibold text-zinc-400">
                            Horário de Entrega
                          </label>
                          <div className="relative">
                            <GlassTimePicker
                              value={deliveryTime}
                              onChange={setDeliveryTime}
                              className="w-full bg-[#131315] border border-[#26262A] rounded-[4px] text-xs sm:text-sm text-white pl-8 pr-3 h-9 sm:h-[44px] outline-none focus:border-[var(--gm-primary,#FF6900)] font-semibold transition-colors"
                            />
                            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Action Bar com Exibidor de Detalhes Inferiores e Botões Fixos */}
              <div
                className="px-3 py-2.5 md:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-2 shrink-0 relative z-20 bg-[#131315] border-t border-[#26262A]"
                style={{
                  borderTopColor: `${color}40`,
                }}
              >
                {/* Botão Ocultar / Expandir */}
                <button
                  type="button"
                  data-note-tool-btn="true"
                  onClick={() => {
                    const next = !bottomDetailsVisible;
                    setBottomDetailsVisible(next);
                    try {
                      localStorage.setItem("gm_note_bottom_details_visible_v1", String(next));
                    } catch (e) {}
                  }}
                  className="w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-md bg-[#0B0B0C] hover:bg-[#1B1B1E] text-zinc-200 hover:text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 transition-colors cursor-pointer border border-[#26262A] hover:border-[#3F3F46]"
                  title={bottomDetailsVisible ? "Ocultar Informações Extras" : "Expandir Informações Extras (Data, Horários e Salvar Auto)"}
                >
                  <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0 w-full sm:w-auto">
                    <div className="flex items-center gap-2 min-w-0">
                      {bottomDetailsVisible ? (
                        <Eye size={14} className="text-[#FF6900] shrink-0 sm:w-4 sm:h-4" strokeWidth={2.4} />
                      ) : (
                        <EyeOff size={14} className="text-zinc-500 shrink-0 sm:w-4 sm:h-4" strokeWidth={2} />
                      )}
                      <span className="font-extrabold tracking-wide truncate text-[10.5px] sm:text-xs sm:hidden">
                        LEMBRETES & AUTO-SAVE
                      </span>
                      <span className="font-extrabold tracking-wider truncate text-xs hidden sm:inline">
                        DATA, HORÁRIOS PROGRAMADOS E SALVAR AUTO
                      </span>
                    </div>
                    <span className="text-zinc-400 text-[10px] font-bold sm:hidden">
                      {bottomDetailsVisible ? "▲" : "▼"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-start sm:justify-end">
                    {/* Badge da Data Programada */}
                    {reminderDate ? (
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] bg-orange-500/15 text-orange-400 border border-orange-500/35 px-2 py-0.5 rounded-[4px] font-mono font-bold whitespace-nowrap tabular-nums">
                        <Calendar size={11} className="shrink-0 text-orange-400" />
                        {reminderDate.split("-").reverse().join("/")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-zinc-400 font-mono px-1.5 py-0.5 rounded-[4px] bg-[#131315] border border-[#26262A]">
                        Sem data
                      </span>
                    )}

                    {/* Badge dos Horários Programados */}
                    {(() => {
                      const activeTimes = [reminderTime, reminderTime2, reminderTime3].filter(Boolean);
                      if (activeTimes.length > 0) {
                        return (
                          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 px-2 py-0.5 rounded-[4px] font-mono font-bold whitespace-nowrap tabular-nums">
                            <Clock size={11} className="shrink-0 text-emerald-400" />
                            {activeTimes.join(" • ")}
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-zinc-400 font-mono px-1.5 py-0.5 rounded-[4px] bg-[#131315] border border-[#26262A]">
                          Sem horário
                        </span>
                      );
                    })()}

                    {/* Badge do Salvamento Automático */}
                    {(() => {
                      const isOff = autoSaveInterval === "disabled";
                      return (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-[4px] font-mono font-bold whitespace-nowrap border tabular-nums ${
                            isOff
                              ? "bg-[#131315] text-zinc-400 border-[#26262A]"
                              : "bg-blue-500/15 text-blue-400 border-blue-500/35"
                          }`}
                        >
                          Auto: {isOff ? "Off" : `${autoSaveInterval}min`}
                        </span>
                      );
                    })()}

                    <span className="text-zinc-400 text-[11px] font-bold ml-0.5 hidden sm:inline">
                      {bottomDetailsVisible ? "▲" : "▼"}
                    </span>
                  </div>
                </button>

                {/* Detalhes Expansíveis Opcionais */}
                <AnimatePresence>
                  {bottomDetailsVisible && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                      className="overflow-hidden flex flex-col gap-3 w-full"
                    >
                      {/* Linha 1: Data do Lembrete & Horários */}
                      {!alarmsAccess.allowed ? (
                        <div className="pt-1">
                          <PlanLockedNotice
                            variant="inline"
                            title="Alarmes e Lembretes Programados Bloqueados"
                            reason={alarmsAccess.reason}
                            requiredPlan={alarmsAccess.requiredPlan || "intermediario"}
                            currentPlanName={subscription.planName}
                            isExpired={isExpired}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-1">
                          {/* Lembrete Data */}
                          <div className="relative flex-1 w-full">
                            <GlassDatePicker
                              className="w-full bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] hover:border-[#3F3F46] rounded-[4px] text-[13px] font-bold text-white pl-10 pr-16 py-3 outline-none transition-colors flex items-center min-h-[46px]"
                              value={reminderDate}
                              onChange={setReminderDate}
                              title="Data do Lembrete"
                              themeColor={color}
                              placeholder="DD/MM/AAAA"
                            />
                            <Calendar
                              size={16}
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                            />
                          </div>

                          {/* Lembrete Horários Alarme */}
                          {(() => {
                            const activeClocksCount = [reminderTime, reminderTime2, reminderTime3].filter(Boolean).length;
                            const hasActiveClocks = activeClocksCount > 0;
                            return (
                              <div className="relative flex-1 w-full">
                                <button
                                  type="button"
                                  onClick={() => setClocksExpanded(!clocksExpanded)}
                                  className="w-full bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] hover:border-[#3F3F46] rounded-[4px] text-[13px] font-black uppercase text-white px-4 py-3 outline-none transition-colors flex items-center justify-between min-h-[46px] cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <Clock
                                      size={17}
                                      className={`shrink-0 ${hasActiveClocks ? "text-emerald-400" : "text-zinc-400"}`}
                                    />
                                    <span className="truncate text-white font-black tracking-wide uppercase tabular-nums">
                                      {hasActiveClocks
                                        ? [reminderTime, reminderTime2, reminderTime3].filter(Boolean).join(" • ")
                                        : "Horários Programados"}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {hasActiveClocks && (
                                      <span className="px-1.5 py-0.5 rounded-[4px] flex items-center justify-center text-[11px] font-black bg-emerald-500 text-[#0B0B0C] tabular-nums">
                                        {activeClocksCount}
                                      </span>
                                    )}
                                    <ChevronUp size={16} className={`text-zinc-400 transition-transform ${clocksExpanded ? "rotate-180" : ""}`} />
                                  </div>
                                </button>

                                {/* Modal de Horários / Alertas - Renderizado via Portal */}
                                {typeof document !== "undefined" &&
                                  createPortal(
                                    <AnimatePresence>
                                      {clocksExpanded && (
                                      <div className="fixed inset-0 z-[10000050] flex items-center justify-center p-4 overflow-hidden pointer-events-auto">
                                        <motion.div
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          exit={{ opacity: 0 }}
                                          className="absolute inset-0 bg-black/75 backdrop-blur-sm z-0"
                                          onClick={() => setClocksExpanded(false)}
                                        />

                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.92, y: 15 }}
                                          animate={{ opacity: 1, scale: 1, y: 0 }}
                                          exit={{ opacity: 0, scale: 0.92, y: 15 }}
                                          transition={{ type: "spring", stiffness: 450, damping: 28 }}
                                          className="relative w-84 max-w-[92vw] bg-[#131315] border border-[#26262A] rounded-lg p-5 space-y-4 shadow-2xl text-left z-10"
                                          style={{
                                            borderTopWidth: "3px",
                                            borderTopColor: "var(--gm-primary, #FF6900)",
                                          }}
                                        >
                                          <div className="flex items-center justify-between pb-3 border-b border-[#26262A]">
                                            <span className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5 text-[var(--gm-primary,#FF6900)]">
                                              <Clock size={15} className="text-[var(--gm-primary,#FF6900)]" />
                                              Configurar Horários
                                            </span>
                                            <div className="flex items-center gap-2">
                                              <span className="text-[11px] bg-[#0B0B0C] border border-[#26262A] text-zinc-300 px-2 py-0.5 rounded-[4px] font-black uppercase tracking-wider">
                                                Diário
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => setClocksExpanded(false)}
                                                className="w-8 h-8 rounded-[4px] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                                title="Fechar"
                                              >
                                                <X size={15} />
                                              </button>
                                            </div>
                                          </div>

                                          <div className="space-y-3.5 text-xs text-white">
                                            {/* SLOT 1 */}
                                            <div className="flex flex-col gap-1.5">
                                              <div className="flex items-center justify-between text-[11px] text-zinc-300 font-extrabold uppercase tracking-wider">
                                                <span className="flex items-center gap-1.5">
                                                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: reminderTime ? 'var(--gm-primary, #FF6900)' : '#52525b' }} />
                                                  Horário 1
                                                </span>
                                                {reminderTime && (
                                                  <button
                                                    type="button"
                                                    onClick={() => setReminderTime("")}
                                                    className="text-red-400 hover:text-red-300 font-bold transition-colors text-[11px] uppercase tracking-wider bg-red-950/40 px-2 py-0.5 rounded-[4px] border border-red-900/40 cursor-pointer"
                                                  >
                                                    Limpar
                                                  </button>
                                                )}
                                              </div>
                                              <div className="relative">
                                                <GlassTimePicker
                                                  value={reminderTime}
                                                  onChange={setReminderTime}
                                                  className="w-full appearance-none bg-[#0B0B0C] border border-[#26262A] hover:border-[#3F3F46] rounded-[4px] text-xs text-white pl-9 pr-3 py-2.5 outline-none focus:border-[var(--gm-primary)]"
                                                  title="Definir Horário 1"
                                                />
                                                <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: reminderTime ? 'var(--gm-primary, #FF6900)' : '#71717a' }} />
                                              </div>
                                            </div>

                                            {/* SLOT 2 */}
                                            <div className="flex flex-col gap-1.5">
                                              <div className="flex items-center justify-between text-[11px] text-zinc-300 font-extrabold uppercase tracking-wider">
                                                <span className="flex items-center gap-1.5">
                                                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: reminderTime2 ? 'var(--gm-primary, #FF6900)' : '#52525b' }} />
                                                  Horário 2
                                                </span>
                                                {reminderTime2 && (
                                                  <button
                                                    type="button"
                                                    onClick={() => setReminderTime2("")}
                                                    className="text-red-400 hover:text-red-300 font-bold transition-colors text-[11px] uppercase tracking-wider bg-red-950/40 px-2 py-0.5 rounded-[4px] border border-red-900/40 cursor-pointer"
                                                  >
                                                    Limpar
                                                  </button>
                                                )}
                                              </div>
                                              <div className="relative">
                                                <GlassTimePicker
                                                  value={reminderTime2}
                                                  onChange={setReminderTime2}
                                                  className="w-full appearance-none bg-[#0B0B0C] border border-[#26262A] hover:border-[#3F3F46] rounded-[4px] text-xs text-white pl-9 pr-3 py-2.5 outline-none focus:border-[var(--gm-primary)]"
                                                  title="Definir Horário 2"
                                                />
                                                <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: reminderTime2 ? 'var(--gm-primary, #FF6900)' : '#71717a' }} />
                                              </div>
                                            </div>

                                            {/* SLOT 3 */}
                                            <div className="flex flex-col gap-1.5">
                                              <div className="flex items-center justify-between text-[11px] text-zinc-300 font-extrabold uppercase tracking-wider">
                                                <span className="flex items-center gap-1.5">
                                                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: reminderTime3 ? 'var(--gm-primary, #FF6900)' : '#52525b' }} />
                                                  Horário 3
                                                </span>
                                                {reminderTime3 && (
                                                  <button
                                                    type="button"
                                                    onClick={() => setReminderTime3("")}
                                                    className="text-red-400 hover:text-red-300 font-bold transition-colors text-[11px] uppercase tracking-wider bg-red-950/40 px-2 py-0.5 rounded-[4px] border border-red-900/40 cursor-pointer"
                                                  >
                                                    Limpar
                                                  </button>
                                                )}
                                              </div>
                                              <div className="relative">
                                                <GlassTimePicker
                                                  value={reminderTime3}
                                                  onChange={setReminderTime3}
                                                  className="w-full appearance-none bg-[#0B0B0C] border border-[#26262A] hover:border-[#3F3F46] rounded-[4px] text-xs text-white pl-9 pr-3 py-2.5 outline-none focus:border-[var(--gm-primary)]"
                                                  title="Definir Horário 3"
                                                />
                                                <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: reminderTime3 ? 'var(--gm-primary, #FF6900)' : '#71717a' }} />
                                              </div>
                                            </div>
                                          </div>

                                          {/* Botões */}
                                          <div className="pt-3 border-t border-[#26262A] flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => setClocksExpanded(false)}
                                              className="flex-1 px-3 py-2.5 bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] rounded-[6px] text-xs font-bold text-zinc-200 hover:text-white transition-colors uppercase tracking-wider cursor-pointer whitespace-nowrap"
                                            >
                                              Fechar
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                handleSave(true);
                                                setClocksExpanded(false);
                                                showToast("Horários configurados com sucesso!");
                                              }}
                                              className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/40 rounded-[6px] text-xs font-black text-white transition-colors uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                                            >
                                              <Check size={14} />
                                              Confirmar
                                            </button>
                                          </div>
                                        </motion.div>
                                      </div>
                                    )}
                                  </AnimatePresence>,
                                  document.body
                                )}
                            </div>
                          );
                        })()}
                      </div>
                      )}

                      {/* Linha 2: Salvar Auto */}
                      <div className="w-full flex items-center gap-3 bg-[#0B0B0C] border border-[#26262A] p-2.5 rounded-md">
                        <span className="text-zinc-400 font-black uppercase tracking-wider text-[11px] whitespace-nowrap shrink-0">
                          SALVAR AUTO:
                        </span>
                        <div className="flex-1 grid grid-cols-4 gap-1.5">
                          {[
                            { val: "10", label: "10 min" },
                            { val: "15", label: "15 min" },
                            { val: "30", label: "30 min" },
                            { val: "disabled", label: "Off" },
                          ].map((item) => (
                            <button
                              key={item.val}
                              type="button"
                              onClick={() => {
                                setAutoSaveInterval(item.val as any);
                                localStorage.setItem("gm_note_autosave_interval_v1", item.val);
                                showToast(`Salvamento automático: ${item.label}`);
                              }}
                              className={`w-full py-1.5 rounded-[4px] text-xs font-black transition-colors text-center cursor-pointer whitespace-nowrap ${
                                autoSaveInterval === item.val
                                  ? "bg-[var(--gm-primary,#FF6900)] text-[#0B0B0C]"
                                  : "bg-[#131315] text-zinc-400 hover:text-white hover:bg-[#1B1B1E] border border-[#26262A]"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Linha FIXA dos Botões */}
                <div className="w-full grid grid-cols-2 gap-2.5 sm:gap-3 pt-0.5">
                  <button
                    type="button"
                    data-note-tool-btn="true"
                    onClick={() => setModalOpen(false)}
                    className="w-full h-9 sm:h-11 rounded-[6px] text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#F2F2F3] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] hover:border-[#3F3F46] transition-colors flex items-center justify-center cursor-pointer whitespace-nowrap"
                  >
                    FECHAR
                  </button>

                  <button
                    type="button"
                    data-note-tool-btn="true"
                    disabled={isSavingNote}
                    onClick={() => handleSave(true)}
                    className={`relative overflow-hidden w-full h-9 sm:h-11 rounded-[6px] text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-2 transition-colors duration-200 border cursor-pointer whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed ${
                      isSaveSuccessActive
                        ? "bg-emerald-500 border-emerald-500 text-[#0B0B0C]"
                        : "bg-[#F65A1A] hover:bg-[#FF7A38] border-[#F65A1A] text-[#0B0B0C]"
                    }`}
                  >
                    <Check
                      size={14}
                      className={`shrink-0 transition-transform duration-300 sm:w-4 sm:h-4 ${
                        isSaveSuccessActive ? "scale-125 text-[#0B0B0C] stroke-[3]" : "text-[#0B0B0C] stroke-[2.75]"
                      }`}
                    />
                    <span className="text-[#0B0B0C] font-black">
                      {isSavingNote ? "SALVANDO..." : isSaveSuccessActive ? "SALVO!" : "SALVAR NOTA"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Quatro Guias de Redimensionamento Idênticas nos 4 Cantos + 4 Bordas */}
              {/* Canto 1: Superior Esquerdo (NW) */}
              <div
                onPointerDown={(e) => handleModalResizeStart(e, "nw")}
                onDoubleClick={handleResetModalSize}
                className="hidden md:flex absolute top-0 left-0 w-8 h-8 items-start justify-start p-1.5 cursor-nwse-resize select-none z-40 group touch-none"
                title="Clique e arraste para redimensionar (Duplo clique para restaurar tamanho)"
              >
                <div className="w-5 h-5 flex items-center justify-center rounded-tl-md transition-all duration-200 group-hover:scale-110">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    className="text-white/40 group-hover:text-[var(--gm-primary,#FF6900)] transition-all duration-200 drop-shadow-sm group-hover:drop-shadow-[0_0_8px_rgba(255,105,0,0.8)]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <line x1="2" y1="12" x2="12" y2="2" />
                    <line x1="2" y1="7" x2="7" y2="2" />
                  </svg>
                </div>
              </div>

              {/* Canto 2: Superior Direito (NE) */}
              <div
                onPointerDown={(e) => handleModalResizeStart(e, "ne")}
                onDoubleClick={handleResetModalSize}
                className="hidden md:flex absolute top-0 right-0 w-8 h-8 items-start justify-end p-1.5 cursor-nesw-resize select-none z-40 group touch-none"
                title="Clique e arraste para redimensionar (Duplo clique para restaurar tamanho)"
              >
                <div className="w-5 h-5 flex items-center justify-center rounded-tr-md transition-all duration-200 group-hover:scale-110">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    className="text-white/40 group-hover:text-[var(--gm-primary,#FF6900)] transition-all duration-200 drop-shadow-sm group-hover:drop-shadow-[0_0_8px_rgba(255,105,0,0.8)]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <line x1="2" y1="2" x2="12" y2="12" />
                    <line x1="7" y1="2" x2="12" y2="7" />
                  </svg>
                </div>
              </div>

              {/* Canto 3: Inferior Esquerdo (SW) */}
              <div
                onPointerDown={(e) => handleModalResizeStart(e, "sw")}
                onDoubleClick={handleResetModalSize}
                className="hidden md:flex absolute bottom-0 left-0 w-8 h-8 items-end justify-start p-1.5 cursor-nesw-resize select-none z-40 group touch-none"
                title="Clique e arraste para redimensionar (Duplo clique para restaurar tamanho)"
              >
                <div className="w-5 h-5 flex items-center justify-center rounded-bl-md transition-all duration-200 group-hover:scale-110">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    className="text-white/40 group-hover:text-[var(--gm-primary,#FF6900)] transition-all duration-200 drop-shadow-sm group-hover:drop-shadow-[0_0_8px_rgba(255,105,0,0.8)]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <line x1="2" y1="2" x2="12" y2="12" />
                    <line x1="2" y1="7" x2="7" y2="12" />
                  </svg>
                </div>
              </div>

              {/* Canto 4: Inferior Direito (SE) */}
              <div
                onPointerDown={(e) => handleModalResizeStart(e, "se")}
                onDoubleClick={handleResetModalSize}
                className="hidden md:flex absolute bottom-0 right-0 w-8 h-8 items-end justify-end p-1.5 cursor-nwse-resize select-none z-40 group touch-none"
                title="Clique e arraste para redimensionar (Duplo clique para restaurar tamanho)"
              >
                <div className="w-5 h-5 flex items-center justify-center rounded-br-md transition-all duration-200 group-hover:scale-110">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    className="text-white/40 group-hover:text-[var(--gm-primary,#FF6900)] transition-all duration-200 drop-shadow-sm group-hover:drop-shadow-[0_0_8px_rgba(255,105,0,0.8)]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <line x1="2" y1="12" x2="12" y2="2" />
                    <line x1="7" y1="12" x2="12" y2="7" />
                  </svg>
                </div>
              </div>

              {/* Guias das 4 Bordas Laterais e Verticais */}
              {/* Borda Superior (N) */}
              <div
                onPointerDown={(e) => handleModalResizeStart(e, "n")}
                onDoubleClick={handleResetModalSize}
                className="hidden md:block absolute top-0 left-10 right-10 h-2 cursor-ns-resize select-none z-30 hover:bg-[var(--gm-primary,#FF6900)]/25 transition-colors touch-none"
                title="Redimensionar altura (topo) - Duplo clique para restaurar"
              />

              {/* Borda Inferior (S) */}
              <div
                onPointerDown={(e) => handleModalResizeStart(e, "s")}
                onDoubleClick={handleResetModalSize}
                className="hidden md:block absolute bottom-0 left-10 right-10 h-2 cursor-ns-resize select-none z-30 hover:bg-[var(--gm-primary,#FF6900)]/25 transition-colors touch-none"
                title="Redimensionar altura (base) - Duplo clique para restaurar"
              />

              {/* Borda Esquerda (W) */}
              <div
                onPointerDown={(e) => handleModalResizeStart(e, "w")}
                onDoubleClick={handleResetModalSize}
                className="hidden md:block absolute top-10 bottom-10 left-0 w-2 cursor-ew-resize select-none z-30 hover:bg-[var(--gm-primary,#FF6900)]/25 transition-colors touch-none"
                title="Redimensionar largura (esquerda) - Duplo clique para restaurar"
              />

              {/* Borda Direita (E) */}
              <div
                onPointerDown={(e) => handleModalResizeStart(e, "e")}
                onDoubleClick={handleResetModalSize}
                className="hidden md:block absolute top-10 bottom-10 right-0 w-2 cursor-ew-resize select-none z-30 hover:bg-[var(--gm-primary,#FF6900)]/25 transition-colors touch-none"
                title="Redimensionar largura (direita) - Duplo clique para restaurar"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}

      {/* Modais de Configurações de Texto à Frente de Tudo (Cores, Fontes, Marcador) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {/* 1. Miniatura de Seletor de Cores do Texto */}
            {colorPickerOpen && (
              <div
                className="fixed inset-0 z-[10000050] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm select-none pointer-events-auto"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setColorPickerOpen(false);
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 10 }}
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  className="relative bg-[#131315] border border-[#26262A] rounded-lg p-3.5 sm:p-4 shadow-2xl flex flex-col gap-2.5 sm:gap-3 text-white"
                  style={{ width: "296px", maxWidth: "calc(100vw - 32px)", margin: "auto" }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {/* Cabeçalho da Miniatura */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#26262A]">
                    <div className="flex items-center gap-1.5">
                      <Palette size={13} className="text-[var(--gm-primary,#FE540B)]" />
                      <span className="text-[11px] sm:text-xs font-black tracking-wide text-white">Cor do Texto</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        data-note-tool-btn="true"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedTextColor("#ffffff");
                          applyStyleToSelection({ color: "#ffffff" });
                          setColorPickerOpen(false);
                        }}
                        className="text-[10.5px] font-bold text-zinc-300 hover:text-white px-2 py-0.5 rounded-[4px] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] transition-colors cursor-pointer"
                        title="Redefinir para Branco"
                      >
                        Padrão
                      </button>
                      <button
                        type="button"
                        data-icon-btn="true"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setColorPickerOpen(false);
                        }}
                        className="w-7 h-7 rounded-[4px] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Fechar"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Amostra da cor atual */}
                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-[4px] bg-[#0B0B0C] border border-[#26262A] text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-sm border border-white/40 shrink-0"
                        style={{ backgroundColor: selectedTextColor }}
                      />
                      <span className="font-mono text-[10.5px] text-white uppercase tabular-nums">{selectedTextColor}</span>
                    </div>
                    <span className="text-[10.5px] text-zinc-400 font-medium">
                      {TEXT_COLORS.find((c) => c.hex.toLowerCase() === selectedTextColor.toLowerCase())?.label || "Personalizada"}
                    </span>
                  </div>

                  {/* Grid de Cores Rápidas */}
                  <div className="grid grid-cols-5 gap-1.5 py-0.5 justify-items-center">
                    {TEXT_COLORS.map((col) => {
                      const isActive = selectedTextColor.toLowerCase() === col.hex.toLowerCase();
                      return (
                        <button
                          key={col.hex}
                          type="button"
                          data-icon-btn="true"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedTextColor(col.hex);
                            applyStyleToSelection({ color: col.hex });
                            setColorPickerOpen(false);
                          }}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-[4px] border transition-all flex items-center justify-center cursor-pointer ${
                            isActive
                              ? "ring-2 ring-white border-white"
                              : "border-[#26262A] hover:border-white/50 opacity-90 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: col.hex }}
                          title={col.label}
                        >
                          {isActive && (
                            <Check
                              size={14}
                              className={col.hex === "#ffffff" || col.hex === "#cbd5e1" ? "text-black stroke-[3.5]" : "text-white stroke-[3.5]"}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Seletor Livre Hex e Color Picker Customizado */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#26262A]">
                    <input
                      type="color"
                      value={selectedTextColor}
                      onChange={(e) => {
                        setSelectedTextColor(e.target.value);
                        applyStyleToSelection({ color: e.target.value });
                      }}
                      className="w-7 h-7 rounded-[4px] cursor-pointer bg-transparent border-0 p-0 shrink-0"
                      title="Escolher qualquer cor"
                    />
                    <input
                      type="text"
                      maxLength={7}
                      value={selectedTextColor}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedTextColor(val);
                        if (/^#[0-9A-F]{6}$/i.test(val)) {
                          applyStyleToSelection({ color: val });
                        }
                      }}
                      placeholder="#FFFFFF"
                      className="flex-1 h-7 px-2.5 rounded-[4px] bg-[#0B0B0C] border border-[#26262A] text-white font-mono text-[11px] uppercase outline-none focus:border-[var(--gm-primary,#FE540B)]"
                    />
                  </div>
                </motion.div>
              </div>
            )}

            {/* 2. Miniatura de Seletor de Marcador de Texto */}
            {highlighterPickerOpen && (
              <div
                className="fixed inset-0 z-[10000050] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm select-none pointer-events-auto"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setHighlighterPickerOpen(false);
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 10 }}
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  className="relative bg-[#131315] border border-[#26262A] rounded-lg p-3.5 sm:p-4 shadow-2xl flex flex-col gap-2.5 sm:gap-3 text-white"
                  style={{ width: "296px", maxWidth: "calc(100vw - 32px)", margin: "auto" }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {/* Cabeçalho da Miniatura */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#26262A]">
                    <div className="flex items-center gap-1.5">
                      <Highlighter size={13} className="text-yellow-400" />
                      <span className="text-[11px] sm:text-xs font-black tracking-wide text-white">Marcador de Texto</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        data-note-tool-btn="true"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedHighlightColor("");
                          removeHighlight();
                          setHighlighterPickerOpen(false);
                        }}
                        className="text-[10.5px] font-bold text-red-400 hover:text-red-300 px-2 py-0.5 rounded-[4px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 transition-colors cursor-pointer flex items-center gap-1"
                        title="Remover marcação"
                      >
                        <Eraser size={11} />
                        <span>Limpar</span>
                      </button>
                      <button
                        type="button"
                        data-icon-btn="true"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setHighlighterPickerOpen(false);
                        }}
                        className="w-7 h-7 rounded-[4px] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Fechar"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Amostra do marcador */}
                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-[4px] bg-[#0B0B0C] border border-[#26262A] text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-sm border border-white/40 shrink-0"
                        style={{ backgroundColor: selectedHighlightColor || "transparent" }}
                      />
                      <span className="font-mono text-[10.5px] text-white uppercase tabular-nums">{selectedHighlightColor || "Sem cor"}</span>
                    </div>
                    <span className="text-[10.5px] text-zinc-400 font-medium">
                      {HIGHLIGHT_COLORS.find((c) => c.hex.toLowerCase() === selectedHighlightColor.toLowerCase())?.label || "Sem marcação"}
                    </span>
                  </div>

                  {/* Grid de 10 Cores de Marcação */}
                  <div className="grid grid-cols-5 gap-1.5 py-0.5 justify-items-center">
                    {HIGHLIGHT_COLORS.map((col) => {
                      const isActive = selectedHighlightColor.toLowerCase() === col.hex.toLowerCase();
                      return (
                        <button
                          key={col.hex}
                          type="button"
                          data-icon-btn="true"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isActive) {
                              setSelectedHighlightColor("");
                              removeHighlight();
                            } else {
                              setSelectedHighlightColor(col.hex);
                              applyHighlight(col.hex);
                            }
                            setHighlighterPickerOpen(false);
                          }}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-[4px] border transition-all flex items-center justify-center cursor-pointer ${
                            isActive
                              ? "ring-2 ring-yellow-400 border-white"
                              : "border-[#26262A] hover:border-white/50 opacity-90 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: col.hex }}
                          title={col.label}
                        >
                          {isActive && (
                            <Check size={14} className="text-black stroke-[3.5]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            )}

            {/* 3. Modal / Galeria de Fontes */}
            {fontSelectorOpen && (
              <div
                className="fixed inset-0 z-[10000050] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setFontSelectorOpen(false);
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 15 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="relative w-full max-w-[340px] max-h-[82vh] bg-[#131315] border border-[#26262A] rounded-lg p-3.5 sm:p-5 shadow-2xl flex flex-col gap-2.5 sm:gap-3 text-white"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {/* Cabeçalho */}
                  <div className="flex items-center justify-between border-b border-[#26262A] pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[4px] bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                        <Type size={15} />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black tracking-wide text-white">Galeria de Fontes</h4>
                        <p className="text-[10.5px] sm:text-[11px] text-zinc-400">Tipografia para o texto selecionado</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      data-icon-btn="true"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFontSelectorOpen(false);
                      }}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-[4px] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Fechar"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Lista de Fontes com Rolagem Suave */}
                  <div className="flex flex-col gap-1 overflow-y-auto max-h-[340px] custom-scroll pr-1">
                    {[
                      { name: "Inter", value: "Inter, sans-serif", label: "Inter (Padrão)" },
                      { name: "Plus Jakarta Sans", value: "'Plus Jakarta Sans', sans-serif", label: "Plus Jakarta" },
                      { name: "Montserrat", value: "Montserrat, sans-serif", label: "Montserrat" },
                      { name: "Raleway", value: "Raleway, sans-serif", label: "Raleway" },
                      { name: "Playfair Display", value: "'Playfair Display', serif", label: "Playfair (Serif)" },
                      { name: "Hubot Sans", value: "'Hubot Sans', sans-serif", label: "Hubot Sans" },
                      { name: "Funnel Display", value: "'Funnel Display', sans-serif", label: "Funnel Display" },
                      { name: "Open Sans", value: "'Open Sans', sans-serif", label: "Open Sans" },
                      { name: "Roboto", value: "Roboto, sans-serif", label: "Roboto" },
                      { name: "Fira Code", value: "'Fira Code', monospace", label: "Fira Code (Mono)" },
                    ].map((f) => (
                      <button
                        key={f.name}
                        type="button"
                        data-note-tool-btn="true"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          applyStyleToSelection({ "font-family": f.value });
                          setFontSelectorOpen(false);
                        }}
                        className="text-left w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-zinc-200 hover:text-white hover:bg-[#1B1B1E] active:bg-[var(--gm-primary,#FE540B)]/20 transition-colors flex items-center justify-between border border-transparent hover:border-[#26262A] cursor-pointer"
                        style={{ fontFamily: f.value }}
                      >
                        <span className="font-semibold">{f.label}</span>
                        <span className="text-[10px] sm:text-[11px] text-zinc-500 uppercase tracking-wider font-mono">Aa Bb Cc</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Lightbox / Visualizador de Imagem com Zoom e Detalhes estilo Apple */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {zoomImage && (
              <div
                className="fixed inset-0 z-[9999999] flex flex-col items-center justify-between p-4 md:p-6 select-none animate-fadeIn"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.95)",
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setZoomImage(null);
                    setZoomScale(1);
                  }
                }}
              >
                {/* Barra Superior do Visualizador de Zoom */}
                <div className="w-full max-w-4xl flex items-center justify-between gap-4 bg-[#131315] border border-[#26262A] px-4 py-2.5 rounded-lg shadow-2xl z-20">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black tracking-widest uppercase px-3 py-1 rounded-[4px] bg-[var(--gm-primary,#FF6900)] text-[#0B0B0C] tabular-nums">
                      LAYOUT {zoomImage.index + 1} DE {layoutUrls.length}
                    </span>
                    <span className="text-xs font-bold text-zinc-300 hidden sm:inline-block tabular-nums">
                      Zoom: {Math.round(zoomScale * 100)}%
                    </span>
                  </div>

                  {/* Controles de Zoom */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setZoomScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}
                      className="p-2 rounded-[4px] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      title="Diminuir Zoom (-)"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomScale(1)}
                      className="px-2.5 py-1.5 text-xs font-bold rounded-[4px] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] text-zinc-300 hover:text-white transition-colors cursor-pointer tabular-nums"
                      title="Ajustar ao tamanho padrão (100%)"
                    >
                      100%
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomScale((s) => Math.min(4, +(s + 0.25).toFixed(2)))}
                      className="p-2 rounded-[4px] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      title="Aumentar Zoom (+)"
                    >
                      <ZoomIn size={16} />
                    </button>
                    <a
                      href={zoomImage.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-[4px] bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] text-zinc-300 hover:text-white transition-colors ml-1"
                      title="Abrir imagem original em nova aba"
                    >
                      <Maximize2 size={16} />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setZoomImage(null);
                        setZoomScale(1);
                      }}
                      className="w-9 h-9 rounded-[4px] bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors ml-2 cursor-pointer"
                      title="Fechar visualizador (ESC)"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Container Central com a Imagem em Alta Resolução */}
                <div className="flex-1 w-full max-w-6xl flex items-center justify-center relative overflow-hidden py-4">
                  {/* Botão Anterior se houver múltiplos layouts */}
                  {layoutUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const prevIdx = (zoomImage.index - 1 + layoutUrls.length) % layoutUrls.length;
                        setZoomImage({ url: layoutUrls[prevIdx], index: prevIdx });
                        setZoomScale(1);
                      }}
                      className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-[6px] bg-[#131315] hover:bg-[#1B1B1E] border border-[#26262A] hover:border-[#3F3F46] text-white flex items-center justify-center transition-colors shadow-2xl z-30 cursor-pointer"
                      title="Layout Anterior (Seta Esquerda ←)"
                    >
                      <ChevronLeft size={24} />
                    </button>
                  )}

                  {/* Imagem Ampliada com Transform Zoom */}
                  <div className="relative max-w-full max-h-full overflow-auto flex items-center justify-center p-2 custom-scroll">
                    <motion.img
                      key={zoomImage.url}
                      src={zoomImage.url}
                      alt={`Layout Ampliado ${zoomImage.index + 1}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: zoomScale }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="max-w-[90vw] max-h-[75vh] object-contain rounded-md shadow-2xl cursor-zoom-in transition-transform duration-200"
                      onClick={() => setZoomScale((s) => (s >= 2 ? 1 : +(s + 0.5).toFixed(2)))}
                    />
                  </div>

                  {/* Botão Próximo se houver múltiplos layouts */}
                  {layoutUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextIdx = (zoomImage.index + 1) % layoutUrls.length;
                        setZoomImage({ url: layoutUrls[nextIdx], index: nextIdx });
                        setZoomScale(1);
                      }}
                      className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-[6px] bg-[#131315] hover:bg-[#1B1B1E] border border-[#26262A] hover:border-[#3F3F46] text-white flex items-center justify-center transition-colors shadow-2xl z-30 cursor-pointer"
                      title="Próximo Layout (Seta Direita →)"
                    >
                      <ChevronRight size={24} />
                    </button>
                  )}
                </div>

                {/* Rodapé do Visualizador com Dicas de Navegação */}
                <div className="w-full max-w-md flex items-center justify-center text-center text-zinc-400 text-[11px] font-semibold py-1.5 px-4 bg-[#131315] border border-[#26262A] rounded-[4px] z-20">
                  <span>Navegue com <span className="text-white font-bold">←</span> <span className="text-white font-bold">→</span> • Zoom <span className="text-white font-bold">+</span> / <span className="text-white font-bold">-</span> • <span className="text-white font-bold">ESC</span> para fechar</span>
                </div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Delete Confirmation Modal */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {deleteConfirmId && (
              <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                  onClick={() => setDeleteConfirmId(null)}
                />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className={`p-6 relative w-full max-w-md ${cardBase} border-red-500/40 text-white`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-md bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0">
                      <AlertTriangle className="text-red-500" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        Excluir Definitivamente?
                      </h3>
                      <p className="text-zinc-400 text-sm mt-1">
                        Esta ação não pode ser desfeita. A nota será removida
                        permanentemente do sistema.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="flex-1 px-4 py-2.5 rounded-[6px] font-bold text-xs uppercase tracking-wider text-zinc-200 hover:text-white border border-[#26262A] bg-[#0B0B0C] hover:bg-[#1B1B1E] transition-colors cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <X size={15} />
                      <span>Cancelar</span>
                    </button>
                    <button
                      onClick={handleHardDeleteConfirm}
                      className="flex-1 px-4 py-2.5 rounded-[6px] font-bold text-xs uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white border border-red-500/40 transition-colors cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Trash2 size={15} />
                      <span>Excluir</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Share Modal */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {noteShareData && (
              <div
                className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
                onClick={() => setNoteShareData(null)}
              >
                <div
                  className={`w-full max-w-md rounded-lg overflow-hidden relative z-10 ${cardBase} text-white`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-5 border-b border-[#26262A] flex justify-between items-center bg-[#131315]">
                    <h3 className="text-lg font-bold text-white">
                      Compartilhar Nota
                    </h3>
                    <button
                      onClick={() => setNoteShareData(null)}
                      className="w-9 h-9 flex items-center justify-center bg-[#0B0B0C] hover:bg-[#1B1B1E] border border-[#26262A] rounded-[4px] transition-colors text-zinc-400 hover:text-white cursor-pointer"
                      title="Fechar"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="p-5 space-y-2.5">
                    <button
                      onClick={() => {
                        const cleanMessage = htmlToPlainFormatedText(
                          noteShareData.message,
                        );
                        openWhatsapp("", cleanMessage);
                        setNoteShareData(null);
                      }}
                      className="w-full rounded-[6px] border border-[#26262A] bg-[#0B0B0C] hover:bg-[#1B1B1E] hover:border-[var(--gm-primary)]/50 flex items-center gap-4 p-4 transition-colors cursor-pointer group"
                    >
                      <div className="shrink-0 w-10 h-10 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                        <WhatsAppIcon
                          size={22}
                          className="text-emerald-400"
                        />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-white group-hover:text-[var(--gm-primary)] leading-tight transition-colors">
                          WhatsApp
                        </p>
                        <p className="text-xs text-zinc-400 leading-tight mt-0.5">
                          Enviar diretamente para um contato
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        const cleanMessage = htmlToPlainFormatedText(
                          noteShareData.message,
                        );
                        const subject = encodeURIComponent(
                          noteShareData.note.title || "Nota",
                        );
                        window.open(
                          `mailto:?subject=${subject}&body=${encodeURIComponent(cleanMessage)}`,
                          "_blank",
                        );
                        setNoteShareData(null);
                      }}
                      className="w-full rounded-[6px] border border-[#26262A] bg-[#0B0B0C] hover:bg-[#1B1B1E] hover:border-[var(--gm-primary)]/50 flex items-center gap-4 p-4 transition-colors cursor-pointer group"
                    >
                      <div className="shrink-0 w-10 h-10 rounded-md bg-[var(--gm-primary)]/15 border border-[var(--gm-primary)]/30 flex items-center justify-center">
                        <Mail size={20} className="text-[var(--gm-primary)]" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-white group-hover:text-[var(--gm-primary)] leading-tight transition-colors">
                          E-mail
                        </p>
                        <p className="text-xs text-zinc-400 leading-tight mt-0.5">
                          Enviar por correio eletrônico
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          const cleanMessage = htmlToPlainFormatedText(
                            noteShareData.message,
                          );
                          await navigator.clipboard.writeText(cleanMessage);
                          alert("Texto copiado para a área de transferência!");
                          setNoteShareData(null);
                        } catch (err) {
                          alert("Erro ao copiar texto.");
                        }
                      }}
                      className="w-full rounded-[6px] border border-[#26262A] bg-[#0B0B0C] hover:bg-[#1B1B1E] hover:border-[var(--gm-primary)]/50 flex items-center gap-4 p-4 transition-colors cursor-pointer group"
                    >
                      <div className="shrink-0 w-10 h-10 rounded-md bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                        <Copy size={20} className="text-blue-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-white group-hover:text-[var(--gm-primary)] leading-tight transition-colors">
                          Copiar Texto
                        </p>
                        <p className="text-xs text-zinc-400 leading-tight mt-0.5">
                          Copiar para colar em outro lugar
                        </p>
                      </div>
                    </button>

                    {navigator.share && (
                      <button
                        onClick={async () => {
                          try {
                            const cleanMessage = htmlToPlainFormatedText(
                              noteShareData.message,
                            );
                            await navigator.share({
                              title: noteShareData.note.title || "Nota",
                              text: cleanMessage,
                            });
                            setNoteShareData(null);
                          } catch (err) {
                            if ((err as Error).name !== "AbortError") {
                              alert("Erro ao compartilhar.");
                            }
                          }
                        }}
                        className="w-full rounded-[6px] border border-[#26262A] bg-[#0B0B0C] hover:bg-[#1B1B1E] hover:border-[var(--gm-primary)]/50 flex items-center gap-4 p-4 transition-colors cursor-pointer group"
                      >
                        <div className="shrink-0 w-10 h-10 rounded-md bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                          <Share2 size={20} className="text-purple-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-white group-hover:text-[var(--gm-primary)] leading-tight transition-colors">
                            Mais Opções
                          </p>
                          <p className="text-xs text-zinc-400 leading-tight mt-0.5">
                            Compartilhamento nativo do dispositivo
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      <PlanLockedNotice
        variant="modal"
        isOpen={Boolean(lockModal)}
        onClose={() => setLockModal(null)}
        title={lockModal?.title || "Recurso Bloqueado no Plano Atual"}
        reason={lockModal?.reason}
        requiredPlan={lockModal?.requiredPlan || "avancado"}
        currentPlanName={subscription.planName}
        isExpired={isExpired}
      />
    </Page>
  );
}
