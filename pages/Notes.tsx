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
  "fora rounded-2xl transition-all border border-white/10 shadow-none bg-white/[0.02] backdrop-blur-md";
const inputBase =
  "w-full gm-input barra rounded-xl px-4 py-3 text-sm text-[color:var(--gm-text)] placeholder-zinc-500 focus:outline-none focus:border-[color:var(--gm-primary)] transition-all border border-white/10 shadow-none bg-white/[0.02] backdrop-blur-md";

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

  // Auto-Save Configuration State (10, 15, 30 min or disabled)
  const [autoSaveInterval, setAutoSaveInterval] = useState<"disabled" | "10" | "15" | "30">(() => {
    return (localStorage.getItem("gm_note_autosave_interval_v1") as any) || "10";
  });
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaveSuccessActive, setIsSaveSuccessActive] = useState(false);

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
      // Background auto-save without closing modal
      if (title || content) {
        handleSave(true);
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

  async function handleSave(keepOpen = false) {
    const isCompleted = normalizeStatus(noteStatus).includes("CONCLU");

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

      // Update Alarm Schedule if reminder format is valid
      if (savedNote) {
        if (!isCompleted && savedNote.reminder_time) {
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

      // Transmissão simultânea de notificação para todos os dispositivos
      try {
        broadcastAppNotification(tenantId, {
          title: editingNote ? "📝 Nota Atualizada" : "📝 Nova Nota Criada",
          message: savedNote?.title || "Nota salva com sucesso",
          type: "note",
          url: "/notes",
        });
      } catch (e) {}

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

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  const WORKFLOW_STATUSES = [
    "A FAZER",
    "PRODUÇÃO",
    "CONCLUÍDOS",
    "LIXEIRA",
  ] as const;

  return (
    <Page
      title="Notas"
      className="relative min-h-full"
      actions={
        <button
          onClick={openNewNote}
          className="gm-btn group h-12 px-5 fora rounded-2xl border border-white/10 hover:border-[var(--gm-primary)] text-xs sm:text-sm uppercase tracking-wider font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer bg-white/[0.02] hover:bg-white/[0.07] backdrop-blur-md text-white shadow-none shrink-0"
        >
          <Plus size={18} className="text-[var(--gm-primary)] transition-transform duration-300 ease-in-out group-hover:rotate-180" />
          <span>Criar Nota</span>
        </button>
      }
    >
      <div className="w-full space-y-6 pb-20 sm:pb-28 md:pb-36 mb-12">
        {/* Tabs + Busca Padrão Orçamentos */}
        <div className="mb-6 space-y-3">
          <SectionDivider label="Filtros e Categorias" />

          {/* Linha 1: Categorias Principais */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: "ALL", label: "TODAS AS NOTAS" },
              { id: "NOTE", label: "NOTAS GERAIS" },
              { id: "PRODUCTION", label: "NOTAS DE PRODUÇÃO" },
            ].map((tabItem) => {
              const isActive = mainTab === tabItem.id;
              return (
                <button
                  key={tabItem.id}
                  type="button"
                  onClick={() => setMainTab(tabItem.id as any)}
                  className={`gm-filter-tab fora snap-start shrink-0 px-4 h-8 rounded-full text-[11px] font-extrabold tracking-tight transition-all whitespace-nowrap flex items-center justify-center border cursor-pointer ${
                    isActive
                      ? "bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] border-[var(--gm-primary)]/40 shadow-none"
                      : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                  }`}
                >
                  {tabItem.label}
                </button>
              );
            })}
          </div>

          {/* Linha 2: Sub-Tabs de Status / Workflow */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {WORKFLOW_STATUSES.map((t) => {
              const isActive = noteTab === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNoteTab(t as any)}
                  className={`gm-filter-tab fora snap-start shrink-0 w-[110px] h-8 rounded-full text-[11px] font-extrabold tracking-tight transition-all whitespace-nowrap flex items-center justify-center border cursor-pointer ${
                    isActive
                      ? "bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] border-[var(--gm-primary)]/40 shadow-none"
                      : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {/* Busca com Visual Padrão Glass Desfocado Apple - Idêntica a Orçamentos */}
          <div className="gm-search-apple-glass">
            <Search className="gm-search-icon" size={18} />
            <input
              type="text"
              placeholder="Buscar notas por título, conteúdo ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="gm-search-clear gm-search-apple-glass-clear"
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
            <div className="w-full fora rounded-2xl border border-white/10 p-10 sm:p-14 md:p-16 min-h-[220px] sm:min-h-[260px] flex flex-col items-center justify-center text-center gap-4 bg-white/[0.02] backdrop-blur-md shadow-none select-none">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--gm-primary)] shadow-none">
                <FileText size={22} />
              </div>
              <p className="text-sm sm:text-base text-slate-200 font-semibold leading-relaxed">
                Nenhuma nota encontrada.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
            {filteredNotes.map((note) => {
              const isExpanded = expandedNotes.has(note.id);
              const isLong =
                (note.content?.length || 0) > 200 ||
                (note.content?.split("\n").length || 0) > 4;
              const noteColor = "var(--gm-primary, #FF6900)";

              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                  className="col-span-1 h-full"
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
                    className={`p-6 relative gap-3 flex flex-col transition-all cursor-pointer group hover:scale-[1.01] h-full gm-note-card ${cardBase} hover:border-[var(--gm-primary)]/40 hover:bg-white/[0.05] ${
                      isExpanded
                        ? "overflow-y-auto custom-scroll max-h-[60vh] md:max-h-[80vh]"
                        : "overflow-hidden min-h-[280px]"
                    } ${
                      note.id === highlightedId
                        ? "gm-signal-bottom-container"
                        : ""
                    }`}
                  >
                    {/* Efeito de Sinalização de Degradê: Canto Inferior Esquerdo -> Canto Inferior Direito (só para com clique ou mouse por cima) */}
                    <SignalBottomGradient
                      active={note.id === highlightedId}
                      onDismiss={() => stopSignal(note.id)}
                    />
                    {/* Visual de Pinar Nota: sempre no canto superior direito, cor sólida laranja do app somente quando fixada */}
                    <button
                      type="button"
                      onClick={(e) => togglePin(note, e)}
                      className={`gm-note-pin-btn group/pin ${note.is_pinned ? "pinned" : ""}`}
                      title={note.is_pinned ? "Desafixar nota" : "Fixar nota no topo"}
                    >
                      <Pin
                        size={15}
                        className={
                          note.is_pinned
                            ? "rotate-[-30deg] transition-transform"
                            : "rotate-0 transition-transform"
                        }
                      />
                    </button>

                    {/* Title */}
                    <div className="flex flex-col gap-1 pr-11">
                      <h3 className="font-bold text-lg text-white leading-tight mt-1">
                        {note.title || "Sem título"}
                      </h3>

                      {(note.delivery_date || note.responsible_name) && (
                        <div className="flex flex-col gap-0.5 mt-1 text-xs text-white/60">
                          {note.delivery_date && (
                            <div className="flex items-center gap-1.5 font-mono text-[10px]">
                              <Clock size={12} style={{ color: noteColor }} />
                              {note.delivery_date
                                .split("-")
                                .reverse()
                                .join("/")}{" "}
                              {note.delivery_time && `às ${note.delivery_time}`}
                            </div>
                          )}
                          {note.responsible_name && (
                            <div className="flex items-center gap-1.5 font-mono text-[10px]">
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
                    </div>

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
                            className="w-full h-32 rounded-xl overflow-hidden mt-1 shrink-0 relative bg-black/40 border border-white/10 cursor-pointer group/thumb shadow-md"
                            title="Clique para ampliar miniatura com fundo desfocado"
                          >
                            <img
                              src={cardLayouts[0]}
                              alt="Layout Thumbnail"
                              className="w-full h-full object-cover opacity-90 group-hover/thumb:opacity-100 group-hover/thumb:scale-105 transition-all duration-300"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold flex items-center gap-1">
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
                              className="w-full h-full rounded-lg overflow-hidden relative bg-black/40 border border-white/10 group/thumb cursor-pointer shadow-sm"
                              title={`Clique para ampliar miniatura ${lIdx + 1}`}
                            >
                              <img
                                src={lUrl}
                                alt={`Layout ${lIdx + 1}`}
                                className="w-full h-full object-cover opacity-90 group-hover/thumb:opacity-100 group-hover/thumb:scale-105 transition-all duration-300"
                              />
                              <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/75 text-[9px] font-mono text-white/90 border border-white/15 backdrop-blur-sm">
                                {lIdx + 1}
                              </span>
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <ZoomIn size={13} className="text-white drop-shadow-md" />
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Body Preview */}
                    <div
                      className={`text-white/70 text-sm overflow-hidden flex-1 relative ${isExpanded ? "" : "max-h-[140px]"}`}
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
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all transform hover:scale-110"
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
                    <div className="mt-auto pt-4 flex flex-col gap-3 border-t border-white/10 opacity-80 group-hover:opacity-100 transition-opacity relative z-10 w-full">
                      {/* Text details for high contrast and perfect legibility */}
                      <div className="flex flex-col gap-1.5 min-w-0 w-full text-left">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-white/50 tracking-wider">
                          <span>Criado em:</span>
                          <span className="font-mono text-white/90">
                            {new Date(note.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        {!normalizeStatus(note.status).includes("CONCLU") && note.reminder_time &&
                          (() => {
                            const hasSpace = note.reminder_time.includes(" ");
                            return (
                              <div
                                className="flex items-start gap-2 font-bold tracking-wider mt-1 text-[9px]"
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
                                      className="animate-pulse"
                                      style={{ color: noteColor }}
                                    />
                                  ) : (
                                    <Clock
                                      size={12}
                                      className="animate-pulse"
                                      style={{ color: noteColor }}
                                    />
                                  )}
                                </div>
                                <div className="flex flex-col gap-0.5 leading-tight min-w-0 w-full">
                                  <span className="uppercase text-white/40 tracking-widest font-mono text-[8px]">
                                    {hasSpace ? "Lembrete Único" : "Lembrete Diário"}
                                  </span>
                                  <span className="text-white font-mono tracking-normal text-[10px] break-words">
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

                      {/* Action buttons on their own line with generous spacing */}
                      <div className="flex items-center justify-between gap-2.5 w-full pt-2.5 border-t border-white/10">
                        {/* Status label / Seletor rápido de status em cápsula Apple Glass Vidro Desfocado */}
                        {note.status ? (
                          <div
                            className="gm-status-apple-glass group shrink-0 select-none"
                            onClick={(e) => e.stopPropagation()}
                            title="Alterar status (ao marcar como Concluído, o alarme e lembrete zeram)"
                          >
                            {/* Ponto indicador luminoso de status */}
                            <span
                              className={`gm-status-dot w-2 h-2 rounded-full shrink-0 mr-2 transition-all ${
                                normalizeStatus(note.status).includes("CONCLU")
                                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                                  : normalizeStatus(note.status).includes("PROD")
                                  ? "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                                  : "bg-[var(--gm-primary)] shadow-[0_0_8px_rgba(255,105,0,0.8)]"
                              }`}
                            />

                            {/* Texto em destaque Apple Glass branco puro */}
                            <span className="gm-status-text text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-white whitespace-nowrap">
                              {note.status.replace(/_/g, " ")}
                            </span>

                            {/* Chevron elegante Apple */}
                            <ChevronDown
                              size={12}
                              className="text-white/70 group-hover:text-white transition-colors ml-2 shrink-0 pointer-events-none"
                            />

                            {/* Select invisível cobrindo a cápsula para acionamento nativo perfeito */}
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

                        <div className="flex items-center gap-3 shrink-0 note-actions">
                          {noteTab === "LIXEIRA" ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestore(note.id);
                                }}
                                className="p-1 cursor-pointer bg-transparent border-none shadow-none text-emerald-400 hover:text-emerald-300 hover:scale-115 active:scale-95 transition-all outline-none"
                                title="Restaurar"
                              >
                                <RefreshCcw size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(note.id);
                                }}
                                className="p-1 cursor-pointer bg-transparent border-none shadow-none text-red-400 hover:text-red-300 hover:scale-115 active:scale-95 transition-all outline-none"
                                title="Excluir Definitivamente"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShareClick(note);
                                }}
                                className="p-1 cursor-pointer bg-transparent border-none shadow-none text-[var(--gm-primary)] hover:opacity-100 hover:scale-115 active:scale-95 transition-all outline-none"
                                title="Compartilhar Nota"
                              >
                                <Share2 size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePdf(note);
                                }}
                                className="p-1 cursor-pointer bg-transparent border-none shadow-none text-[var(--gm-primary)] hover:opacity-100 hover:scale-115 active:scale-95 transition-all outline-none"
                                title="Baixar / Exportar PDF"
                              >
                                <Download size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSoftDelete(note.id);
                                }}
                                className="p-1 cursor-pointer bg-transparent border-none shadow-none text-white/50 hover:text-red-400 hover:scale-115 active:scale-95 transition-all outline-none"
                                title="Mover para Lixeira"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
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
                  className="absolute inset-0 bg-black/60 backdrop-blur-md"
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
                      <p className="text-sm text-white/60">
                        Selecione o tipo de nota que deseja criar.
                      </p>
                    </div>
                    <button
                      onClick={() => setNewNoteModalOpen(false)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white barra border border-white/10 bg-white/[0.02] hover:bg-white/[0.07] backdrop-blur-md transition-colors cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => openNewNoteModal("note")}
                      className="flex flex-col items-start gap-4 p-6 rounded-2xl barra border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-[var(--gm-primary)]/40 backdrop-blur-md transition-all text-left group cursor-pointer shadow-none"
                    >
                      <div className="p-3 bg-[var(--gm-primary)]/15 text-[var(--gm-primary)] border border-[var(--gm-primary)]/30 backdrop-blur-md rounded-xl group-hover:scale-110 transition-transform">
                        <Edit2 size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white mb-1">Nota</h3>
                        <p className="text-sm text-white/60">
                          Anotações e lembretes com alarmes gerais.
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => openNewNoteModal("production")}
                      className="flex flex-col items-start gap-4 p-6 rounded-2xl barra border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-[var(--gm-primary)]/40 backdrop-blur-md transition-all text-left group cursor-pointer shadow-none"
                    >
                      <div className="p-3 bg-[var(--gm-primary)]/15 text-[var(--gm-primary)] border border-[var(--gm-primary)]/30 backdrop-blur-md rounded-xl group-hover:scale-110 transition-transform">
                        <Palette size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white mb-1">
                          Produção
                        </h3>
                        <p className="text-sm text-white/60">
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
                  className="absolute inset-0 bg-black/80 md:bg-black/70 backdrop-blur-md z-0"
                  onClick={() => setModalOpen(false)}
                />

                {/* Modal Main Window */}
                <motion.div
                  ref={modalRef}
                  initial={{ y: "100%", opacity: 0, scale: 0.96 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: "100%", opacity: 0, scale: 0.96 }}
                  transition={{ type: "spring", damping: 26, stiffness: 320 }}
                  className="gm-note-modal relative w-full sm:w-[94%] rounded-none sm:rounded-3xl flex flex-col overflow-hidden border border-white/15 shadow-2xl bg-[#0c0f17]/95 backdrop-blur-2xl text-white z-10 m-auto h-[100dvh] sm:h-auto"
                  style={{
                    width: window.innerWidth >= 768 ? (modalCustomSize.width ? `${modalCustomSize.width}px` : "min(1152px, 94vw)") : "100vw",
                    height: window.innerWidth >= 768 ? (modalCustomSize.height ? `${modalCustomSize.height}px` : undefined) : "100dvh",
                    maxWidth: window.innerWidth >= 768 ? "calc(100vw - var(--gm-sidebar-width, 224px) - 24px)" : "100vw",
                    maxHeight: window.innerWidth < 768 ? "100dvh" : modalCustomSize.height ? `${modalCustomSize.height}px` : "92vh",
                    borderWidth: window.innerWidth < 768 ? "0px" : "1px",
                    borderStyle: "solid",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Indicador de puxar estilo iOS no Smartphone */}
                  <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

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
                        <div 
                          className="bg-[#0b1b11]/95 text-white font-black text-xs md:text-sm px-7 py-4 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl border-2 border-green-500 flex items-center gap-3 text-center"
                          style={{
                            boxShadow: "0 0 45px rgba(34, 197, 94, 0.65), 0 25px 60px rgba(0, 0, 0, 0.95)"
                          }}
                        >
                          <span className="relative flex h-3.5 w-3.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-80" />
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500" />
                          </span>
                          <span className="tracking-wide uppercase text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)] font-black text-sm">
                            {toastMessage}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Header / Barra de Título Estilo Apple */}
                  <div
                    className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between shrink-0 relative z-20 bg-[#121622]/90 backdrop-blur-xl border-b border-white/10"
                    style={{
                      borderBottomColor: `${color}40`,
                    }}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                      <input
                        type="text"
                        className="gm-note-title-input bg-black/35 hover:bg-black/55 focus:bg-black/70 border border-white/10 hover:border-white/20 focus:border-[var(--gm-primary,#FF6900)] rounded-xl outline-none pl-5 sm:pl-6 pr-4 py-2 sm:py-2.5 font-bold text-base sm:text-lg text-white w-full placeholder:text-white/30 tracking-tight transition-all focus:ring-0 focus:outline-none"
                        style={{ outline: "none", boxShadow: "none" }}
                        placeholder="Título da nota"
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
                        onClick={() => setIsPinned(!isPinned)}
                        className={`gm-note-modal-pin-btn w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full transition-all cursor-pointer border ${
                          isPinned ? "pinned" : ""
                        }`}
                        title={isPinned ? "Desafixar nota" : "Fixar nota no topo"}
                      >
                        <Pin
                          size={16}
                          className={
                            isPinned
                              ? "rotate-[-30deg] transition-transform"
                              : "rotate-0 transition-transform"
                          }
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalOpen(false)}
                        className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white active:scale-95 transition-all cursor-pointer"
                        title="Fechar nota"
                      >
                        <X size={17} />
                      </button>
                    </div>
                  </div>

                  {/* Navegação Superior por Abas (Segmented Control Estilo Apple) */}
                  <div className="px-3 sm:px-6 py-2 bg-[#090c12]/95 backdrop-blur-md border-b border-white/10 select-none shrink-0 z-20">
                    <div className="grid grid-cols-3 gap-1 w-full bg-black/40 p-1 rounded-xl border border-white/10">
                      {/* Aba 1: Nota & Texto */}
                      <button
                        type="button"
                        onClick={() => setEditorTab("note")}
                        className={`py-2 px-2 sm:px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                          editorTab === "note"
                            ? "bg-[var(--gm-primary,#FF6900)] text-white shadow-lg shadow-orange-500/30 border border-orange-400/50 ring-1 ring-orange-500/30"
                            : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        <FileText size={14} className="shrink-0" />
                        <span className="truncate">NOTA</span>
                      </button>

                      {/* Aba 2: Layouts & Fotos */}
                      <button
                        type="button"
                        onClick={() => setEditorTab("layouts")}
                        className={`py-2 px-2 sm:px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                          editorTab === "layouts"
                            ? "bg-[var(--gm-primary,#FF6900)] text-white shadow-lg shadow-orange-500/30 border border-orange-400/50 ring-1 ring-orange-500/30"
                            : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        <ImageIcon size={14} className="shrink-0" />
                        <span className="truncate">LAYOUTS</span>
                        {layoutUrls.length > 0 && (
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                              editorTab === "layouts"
                                ? "bg-black/40 text-white"
                                : "bg-white/20 text-white"
                            }`}
                          >
                            {layoutUrls.length}
                          </span>
                        )}
                      </button>

                      {/* Aba 3: Configurações & Prazos */}
                      <button
                        type="button"
                        onClick={() => setEditorTab("settings")}
                        className={`py-2 px-2 sm:px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                          editorTab === "settings"
                            ? "bg-[var(--gm-primary,#FF6900)] text-white shadow-lg shadow-orange-500/30 border border-orange-400/50 ring-1 ring-orange-500/30"
                            : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        <Sliders size={14} className="shrink-0" />
                        <span className="truncate">CONFIGURAÇÕES</span>
                        {(deliveryDate || deliveryTime) && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Text Formatting Toolbar (Visível na aba de Nota) */}
                  {editorTab === "note" && (
                    <div
                      className="flex flex-col gap-2 px-2 md:px-5 py-2 bg-[#090b10] border-b border-white/10 select-none shrink-0 relative z-30"
                      style={{ borderColor: `${color}30` }}
                    >
                      {/* Core Formatting Controls Group */}
                      <div className="flex items-center overflow-x-auto no-scrollbar flex-nowrap md:flex-wrap justify-start md:justify-center gap-1.5 md:gap-2 py-0.5 relative z-30 touch-pan-x">
                        {/* Bold */}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyBold();
                          }}
                          className="py-1.5 px-3 rounded-lg hover:bg-white/15 text-white font-extrabold text-sm transition-all hover:scale-105 active:scale-95 bg-white/5 text-center flex items-center justify-center min-h-[38px] min-w-[38px]"
                          title="Negrito"
                        >
                          B
                        </button>

                        {/* Italic */}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyItalic();
                          }}
                          className="py-1.5 px-3 rounded-lg hover:bg-white/15 text-white italic font-serif text-sm transition-all hover:scale-105 active:scale-95 bg-white/5 text-center flex items-center justify-center min-h-[38px] min-w-[38px]"
                          title="Itálico"
                        >
                          I
                        </button>

                        {/* Underline */}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyUnderline();
                          }}
                          className="p-2.5 rounded-lg hover:bg-white/15 text-white transition-all hover:scale-105 active:scale-95 bg-white/5 text-center flex items-center justify-center min-h-[38px] min-w-[38px]"
                          title="Sublinhar"
                        >
                          <Underline size={15} />
                        </button>

                        {/* Strikethrough */}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyStrikeThrough();
                          }}
                          className="p-2.5 rounded-lg hover:bg-white/15 text-white transition-all hover:scale-105 active:scale-95 bg-white/5 text-center flex items-center justify-center min-h-[38px] min-w-[38px]"
                          title="Tachado"
                        >
                          <Strikethrough size={15} />
                        </button>

                        {/* Cores do Texto Botão (Abre a caixinha de configurações de cores à frente de tudo) */}
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              saveCurrentSelection();
                              setColorPickerOpen(!colorPickerOpen);
                              setHighlighterPickerOpen(false);
                              setFontSelectorOpen(false);
                            }}
                            className={`py-1.5 px-2.5 rounded-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 min-h-[38px] cursor-pointer ${
                              colorPickerOpen
                                ? "bg-[var(--gm-primary,#FE540B)]/25 text-white border border-[var(--gm-primary,#FE540B)]/60 shadow-lg shadow-orange-500/20"
                                : "bg-white/5 hover:bg-white/15 text-white"
                            }`}
                            title="Cor do Texto (Abrir configurações de cores)"
                          >
                            <Palette size={15} className="text-white/80" />
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm shrink-0"
                              style={{ backgroundColor: selectedTextColor }}
                            />
                            <ChevronDown size={11} className="text-white/40" />
                          </button>
                        </div>

                        {/* Galeria de Fontes Botão */}
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              saveCurrentSelection();
                              setFontSelectorOpen(!fontSelectorOpen);
                              setColorPickerOpen(false);
                              setHighlighterPickerOpen(false);
                            }}
                            className={`py-1.5 px-3 rounded-lg text-[12px] transition-all tracking-wide hover:scale-105 active:scale-95 font-bold flex items-center justify-center gap-1.5 min-h-[38px] cursor-pointer ${
                              fontSelectorOpen
                                ? "bg-[var(--gm-primary,#FE540B)]/25 text-white border border-[var(--gm-primary,#FE540B)]/60 shadow-lg shadow-orange-500/20"
                                : "bg-white/5 hover:bg-white/15 text-white"
                            }`}
                            title="Galeria de Fontes"
                          >
                            <Type size={13} className="text-white/80" />
                            <span>Fontes</span>
                            <ChevronDown size={12} className="text-white/40" />
                          </button>
                        </div>

                        {/* Size Cycle */}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            cycleFontSize();
                          }}
                          className="py-1.5 px-3.5 rounded-lg hover:bg-white/15 text-white text-[11px] transition-all tracking-wide hover:scale-105 active:scale-95 bg-white/5 font-semibold flex items-center justify-center gap-1.5 min-h-[38px]"
                          title="Tamanho da Fonte"
                        >
                          <span className="text-white/60 text-[11px] font-bold">Aa</span>
                          <span className="font-extrabold text-[10px] bg-white/10 px-1.5 py-0.5 rounded uppercase text-white">
                            {fontSizeMode === "P"
                              ? "Peq"
                              : fontSizeMode === "M"
                                ? "Méd"
                                : "Grd"}
                          </span>
                        </button>

                        <div className="h-5 w-[1px] bg-white/10 mx-1 shrink-0" />

                        {/* Align Left */}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyAlign("left");
                          }}
                          className="p-2.5 rounded-lg hover:bg-white/15 text-white transition-all hover:scale-105 active:scale-95 bg-white/5 flex items-center justify-center min-h-[38px] min-w-[38px]"
                          title="Alinhar à Esquerda"
                        >
                          <AlignLeft size={15} />
                        </button>

                        {/* Align Center */}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyAlign("center");
                          }}
                          className="p-2.5 rounded-lg hover:bg-white/15 text-white transition-all hover:scale-105 active:scale-95 bg-white/5 flex items-center justify-center min-h-[38px] min-w-[38px]"
                          title="Centralizar"
                        >
                          <AlignCenter size={15} />
                        </button>

                        {/* Align Right */}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyAlign("right");
                          }}
                          className="p-2.5 rounded-lg hover:bg-white/15 text-white transition-all hover:scale-105 active:scale-95 bg-white/5 flex items-center justify-center min-h-[38px] min-w-[38px]"
                          title="Alinhar à Direita"
                        >
                          <AlignRight size={15} />
                        </button>

                        {/* Align Justify */}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyAlign("justify");
                          }}
                          className="p-2.5 rounded-lg hover:bg-white/15 text-white transition-all hover:scale-105 active:scale-95 bg-white/5 flex items-center justify-center min-h-[38px] min-w-[38px]"
                          title="Justificar"
                        >
                          <AlignJustify size={15} />
                        </button>

                        <div className="h-5 w-[1px] bg-white/10 mx-1 shrink-0" />

                        {/* Bullet List */}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyList("bullet");
                          }}
                          className="p-2.5 rounded-lg hover:bg-white/15 text-white transition-all hover:scale-105 active:scale-95 bg-white/5 flex items-center justify-center min-h-[38px] min-w-[38px]"
                          title="Lista de Marcadores"
                        >
                          <List size={15} />
                        </button>

                        {/* Numbered List */}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyList("ordered");
                          }}
                          className="p-2.5 rounded-lg hover:bg-white/15 text-white transition-all hover:scale-105 active:scale-95 bg-white/5 flex items-center justify-center min-h-[38px] min-w-[38px]"
                          title="Lista Numerada"
                        >
                          <ListOrdered size={15} />
                        </button>

                        <div className="h-5 w-[1px] bg-white/10 mx-1 shrink-0" />

                        {/* Highlighter Botão */}
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              saveCurrentSelection();
                              setHighlighterPickerOpen(!highlighterPickerOpen);
                              setColorPickerOpen(false);
                              setFontSelectorOpen(false);
                            }}
                            className={`py-1.5 px-2.5 rounded-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 min-h-[38px] cursor-pointer ${
                              highlighterPickerOpen
                                ? "bg-[var(--gm-primary,#FE540B)]/25 text-white border border-[var(--gm-primary,#FE540B)]/60 shadow-lg shadow-orange-500/20"
                                : "bg-white/5 hover:bg-white/15 text-white"
                            }`}
                            title="Marcador de Texto"
                          >
                            <Highlighter size={15} className="text-white/80" />
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm shrink-0"
                              style={{ backgroundColor: selectedHighlightColor || "transparent" }}
                            />
                            <ChevronDown size={11} className="text-white/40" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

              {/* Scrollable Area com visual Apple, espaçamento harmônico e containers limpos */}
              <div
                className="flex-1 overflow-y-auto custom-scroll min-h-0 relative flex flex-col p-3.5 sm:p-5 gap-4"
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
                    className="flex flex-col gap-3.5 flex-1 min-h-0"
                  >
                    {/* Pílulas de Contexto Rápido Apple (Tipo, Status, Prazo, Alarme, Layouts) */}
                    <div className="flex items-center justify-between flex-wrap gap-2 px-0.5 py-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Tipo da Nota */}
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-white/[0.06] text-white/90 border border-white/10">
                          {noteType === "production" ? "PRODUÇÃO" : "GERAL"}
                        </span>

                        {/* Status */}
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[var(--gm-primary)]/15 text-[var(--gm-primary)] border border-[var(--gm-primary)]/30">
                          {noteStatus.replace(/_/g, " ")}
                        </span>

                        {/* Prazo */}
                        {deliveryDate && (
                          <span className="inline-flex text-[10px] font-bold text-orange-300 items-center gap-1 bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20">
                            <Calendar size={11} />
                            {deliveryDate.split("-").reverse().join("/")}
                            {deliveryTime ? ` às ${deliveryTime}` : ""}
                          </span>
                        )}

                        {/* Responsável */}
                        {responsibleName && (
                          <span className="inline-flex text-[10px] font-bold text-white/70 items-center gap-1 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/10 truncate max-w-[130px]">
                            <User size={11} />
                            {responsibleName}
                          </span>
                        )}
                      </div>

                      {/* Botão Atalho para Configurações */}
                      <button
                        id="btn-note-adjust-settings"
                        type="button"
                        onClick={() => setEditorTab("settings")}
                        className="shrink-0 ml-auto sm:ml-0 flex items-center justify-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[var(--gm-primary,#FE540B)] to-orange-500 hover:from-orange-500 hover:to-[var(--gm-primary,#FE540B)] !text-white font-bold text-xs sm:text-[13px] tracking-wide shadow-[0_4px_16px_rgba(254,84,11,0.35)] border border-white/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer whitespace-nowrap min-w-[185px]"
                        title="Ajustar configurações e prazos da nota"
                      >
                        <Sliders size={13} className="shrink-0 !text-white" strokeWidth={2.2} />
                        <span className="whitespace-nowrap font-bold !text-white">Ajustar configurações</span>
                      </button>
                    </div>

                    {/* Prévias compactas de layouts se houver (para visualização rápida no smartphone) */}
                    {layoutUrls.length > 0 && (
                      <div className="flex items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-white/[0.025] border border-white/10 backdrop-blur-md">
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                          {layoutUrls.slice(0, 6).map((url, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                setZoomImage({ url, index: idx });
                                setZoomScale(1);
                              }}
                              className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden border border-white/20 shrink-0 cursor-pointer group hover:scale-105 transition-all"
                              title={`Ver layout ${idx + 1}`}
                            >
                              <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 right-0 bg-black/75 text-[9px] font-bold px-1 rounded-tl text-white">
                                #{idx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditorTab("layouts")}
                          className="text-xs font-bold text-[var(--gm-primary,#FF6900)] hover:underline whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-all cursor-pointer"
                        >
                          Ver Layouts ({layoutUrls.length}) →
                        </button>
                      </div>
                    )}

                    {/* Apple Notes Writing Card - Sem contorno laranja duplicado ao focar/clicar */}
                    <div className="gm-note-editor-card flex flex-col flex-1 w-full rounded-2xl bg-white/[0.025] border border-white/10 transition-all p-3.5 sm:p-5 min-h-[280px] shadow-sm">
                      {/* Barra superior de controle do editor: Desfazer / Refazer e contador */}
                      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/5 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white/60">Texto da Nota</span>
                          <span className="text-[10px] text-white/35 font-mono">
                            {content ? content.replace(/<[^>]+>/g, "").trim().length : 0} carac.
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Botão Desfazer (Undo) - Essencial para Smartphone */}
                          <button
                            type="button"
                            onClick={performUndo}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all active:scale-90 cursor-pointer"
                            title="Desfazer (Undo)"
                          >
                            <Undo2 size={14} />
                          </button>

                          {/* Botão Refazer (Redo) - Essencial para Smartphone */}
                          <button
                            type="button"
                            onClick={performRedo}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all active:scale-90 cursor-pointer"
                            title="Refazer (Redo)"
                          >
                            <Redo2 size={14} />
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
                        className="gm-note-editor-content w-full flex-1 min-h-[220px] bg-transparent !outline-none text-white/95 focus:!outline-none focus-visible:!outline-none border-none focus:border-none ring-0 focus:ring-0 relative empty:before:content-[attr(placeholder)] before:text-white/30 before:pointer-events-none before:absolute before:left-0 before:top-0 text-[15.5px] sm:text-[16.5px] font-normal leading-relaxed"
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
                    <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/[0.025] backdrop-blur-md flex flex-col gap-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <ImageIcon size={16} className="text-[var(--gm-primary,#FF6900)]" />
                          <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                            Layouts & Anexos
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                            layoutUrls.length >= 6
                              ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                              : "bg-white/5 text-white/60 border-white/10"
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
                              className="bg-black/50 border border-white/10 rounded-xl text-sm text-white pl-9 pr-3 py-2.5 outline-none focus:border-[var(--gm-primary,#FF6900)] w-full disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            />
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={14} />
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
                              className="bg-[var(--gm-primary,#FF6900)] hover:brightness-110 rounded-xl text-xs font-bold text-white px-4 py-2.5 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-md shadow-orange-500/20"
                            >
                              <Plus size={14} />
                              <span>Adicionar</span>
                            </button>
                          )}
                        </div>

                        {/* Botão de Enviar Imagens do Smartphone */}
                        <label
                          className={`bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl text-xs font-bold text-white px-4 py-2.5 outline-none cursor-pointer flex items-center justify-center gap-2 transition-all shrink-0 shadow-sm active:scale-95 ${
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
                        <div className="flex items-center justify-between pt-1 text-[11px] text-white/40">
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
                              className={`relative flex items-center justify-center rounded-2xl overflow-hidden group shadow-xl bg-black/40 border transition-all duration-300 cursor-pointer select-none aspect-video sm:aspect-auto ${
                                isDragOver
                                  ? "border-[var(--gm-primary,#FF6900)] scale-[1.02] ring-2 ring-orange-500/40"
                                  : isDragged
                                    ? "opacity-40 border-dashed border-white/40"
                                    : "border-white/10 hover:border-white/30"
                              }`}
                              title="Toque para ampliar com Zoom ou arraste para reorganizar"
                            >
                              <img
                                src={url}
                                alt={`Layout ${idx + 1}`}
                                className="w-full h-full object-cover rounded-2xl transition-transform duration-500 group-hover:scale-105 pointer-events-none max-h-[300px]"
                              />

                              {/* Badge Canto Superior Esquerdo: Posição */}
                              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-20 pointer-events-none">
                                <span className="w-6 h-6 rounded-lg bg-black/75 backdrop-blur-md text-white/90 text-[10px] font-black flex items-center justify-center border border-white/20 shadow-md">
                                  #{idx + 1}
                                </span>
                                {idx === 0 && (
                                  <span className="px-2 py-0.5 rounded-lg bg-[var(--gm-primary,#FF6900)] text-white text-[9px] font-black uppercase shadow-md">
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
                                  className="w-7 h-7 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90 backdrop-blur-md"
                                  title={`Excluir layout ${idx + 1}`}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>

                              {/* Overlay com Zoom Indicator */}
                              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <span className="px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 shadow-xl">
                                  <ZoomIn size={13} className="text-[var(--gm-primary,#FF6900)]" />
                                  Ver com Zoom
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-12 px-4 text-white/30 gap-3 bg-white/[0.02] rounded-2xl border border-white/10">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                          <ImageIcon size={22} />
                        </div>
                        <div className="flex flex-col gap-1 max-w-sm">
                          <span className="text-sm font-bold text-white/70">Nenhum layout adicionado</span>
                          <span className="text-xs text-white/40">
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
                    className="flex flex-col gap-4 flex-1 min-h-0"
                  >
                    {/* Card 1: Classificação e Responsável */}
                    <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/[0.025] backdrop-blur-md flex flex-col gap-3.5">
                      <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                        <Palette size={15} className="text-[var(--gm-primary,#FF6900)]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                          Classificação & Responsável
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        {/* Tipo da Nota */}
                        <div className="flex flex-col gap-1.5 w-full">
                          <label className="text-xs font-semibold text-white/60">
                            Tipo da Nota
                          </label>
                          <div className="relative">
                            <select
                              value={noteType}
                              onChange={(e) => {
                                setNoteType(e.target.value as any);
                                setNoteStatus("a fazer");
                              }}
                              className="w-full appearance-none bg-black/50 border border-white/10 rounded-xl text-sm text-white pl-3.5 pr-10 h-[44px] outline-none focus:border-[var(--gm-primary,#FF6900)] cursor-pointer font-semibold transition-all"
                            >
                              <option value="note">GERAL</option>
                              <option value="production">PRODUÇÃO</option>
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={15} />
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex flex-col gap-1.5 w-full">
                          <label className="text-xs font-semibold text-white/60">
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
                              className="w-full appearance-none bg-black/50 border border-white/10 rounded-xl text-sm text-white pl-3.5 pr-10 h-[44px] outline-none focus:border-[var(--gm-primary,#FF6900)] cursor-pointer font-semibold transition-all"
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
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={15} />
                          </div>
                        </div>

                        {/* Responsável */}
                        <div className="flex flex-col gap-1.5 w-full">
                          <label className="text-xs font-semibold text-white/60">
                            Responsável
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Nome do responsável"
                              value={responsibleName}
                              onChange={(e) => setResponsibleName(e.target.value)}
                              className="bg-black/50 border border-white/10 rounded-xl text-sm text-white pl-9 pr-3.5 h-[44px] outline-none focus:border-[var(--gm-primary,#FF6900)] w-full font-semibold transition-all"
                            />
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={15} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Prazos de Entrega */}
                    <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/[0.025] backdrop-blur-md flex flex-col gap-3.5">
                      <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                        <Calendar size={15} className="text-[var(--gm-primary,#FF6900)]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                          Prazo & Horário de Entrega
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Prazo de Entrega */}
                        <div className="flex flex-col gap-1.5 w-full">
                          <label className="text-xs font-semibold text-white/60">
                            Data de Entrega
                          </label>
                          <div className="relative">
                            <GlassDatePicker
                              value={deliveryDate}
                              onChange={setDeliveryDate}
                              className="w-full bg-black/50 border border-white/10 rounded-xl text-sm text-white pl-9 pr-14 h-[44px] flex items-center outline-none focus:border-[var(--gm-primary,#FF6900)] font-semibold transition-all"
                              title="Prazo de Entrega"
                              themeColor={color}
                              placeholder="DD/MM/AAAA"
                            />
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={15} />
                          </div>
                        </div>

                        {/* Horário de Entrega */}
                        <div className="flex flex-col gap-1.5 w-full">
                          <label className="text-xs font-semibold text-white/60">
                            Horário de Entrega
                          </label>
                          <div className="relative">
                            <GlassTimePicker
                              value={deliveryTime}
                              onChange={setDeliveryTime}
                              className="w-full bg-black/50 border border-white/10 rounded-xl text-sm text-white pl-9 pr-3.5 h-[44px] outline-none focus:border-[var(--gm-primary,#FF6900)] font-semibold transition-all"
                            />
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={15} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Action Bar com Exibidor Sutil de Detalhes Inferiores (DATA, HORÁRIOS, SALVAR AUTO) e Botões Fixos */}
              <div
                className="p-3 md:p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-2.5 shrink-0 relative z-20 bg-[#0d1017]"
                style={{
                  borderTop: `1px solid ${color}40`,
                }}
              >
                {/* Botão Ocultar / Expandir em Largura Total (Extremidades) */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !bottomDetailsVisible;
                    setBottomDetailsVisible(next);
                    try {
                      localStorage.setItem("gm_note_bottom_details_visible_v1", String(next));
                    } catch (e) {}
                  }}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/10 text-white/80 hover:text-white text-xs font-black uppercase tracking-wider flex items-center justify-between gap-2 transition-all cursor-pointer border border-white/10 hover:border-white/20 active:scale-[0.99] min-h-[44px] shadow-sm"
                  title={bottomDetailsVisible ? "Ocultar Informações Extras" : "Expandir Informações Extras (Data, Horários e Salvar Auto)"}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {bottomDetailsVisible ? (
                      <Eye size={18} className="text-[#FF6900] shrink-0 drop-shadow-[0_0_10px_rgba(255,105,0,0.85)]" strokeWidth={2.4} />
                    ) : (
                      <EyeOff size={18} className="text-zinc-500 shrink-0" strokeWidth={2} />
                    )}
                    <span className="font-extrabold tracking-wider truncate text-xs">
                      DATA, HORÁRIOS PROGRAMADOS E SALVAR AUTO
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {/* Badge da Data Programada */}
                    {reminderDate ? (
                      <span className="inline-flex items-center gap-1 text-[11px] bg-orange-500/20 text-orange-400 border border-orange-500/35 px-2.5 py-1 rounded-lg font-mono font-bold whitespace-nowrap shadow-sm shadow-orange-500/10">
                        <Calendar size={12} className="shrink-0 text-orange-400" />
                        {reminderDate.split("-").reverse().join("/")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 font-mono px-1.5 py-0.5 rounded bg-white/[0.02]">
                        Sem data
                      </span>
                    )}

                    {/* Badge dos Horários Programados */}
                    {(() => {
                      const activeTimes = [reminderTime, reminderTime2, reminderTime3].filter(Boolean);
                      if (activeTimes.length > 0) {
                        return (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 px-2.5 py-1 rounded-lg font-mono font-bold whitespace-nowrap shadow-sm shadow-green-500/10">
                            <Clock size={12} className="shrink-0 text-emerald-400" />
                            {activeTimes.join(" • ")}
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 font-mono px-1.5 py-0.5 rounded bg-white/[0.02]">
                          Sem horário
                        </span>
                      );
                    })()}

                    {/* Badge do Salvamento Automático */}
                    {(() => {
                      const isOff = autoSaveInterval === "disabled";
                      return (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-mono font-bold whitespace-nowrap border ${
                            isOff
                              ? "bg-white/[0.04] text-zinc-500 border-white/10"
                              : "bg-blue-500/20 text-blue-400 border-blue-500/35 shadow-sm shadow-blue-500/10"
                          }`}
                        >
                          Auto: {isOff ? "Off" : `${autoSaveInterval}min`}
                        </span>
                      );
                    })()}

                    <span className="text-white/50 text-[11px] font-bold ml-0.5">
                      {bottomDetailsVisible ? "▲" : "▼"}
                    </span>
                  </div>
                </button>

                {/* Detalhes Expansíveis Opcionais (DATA, HORÁRIOS e SALVAR AUTO) */}
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
                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-1">
                        {/* Lembrete Data */}
                        <div className="relative flex-1 w-full">
                          <GlassDatePicker
                            className="w-full bg-black/60 hover:bg-black/80 border border-white/15 hover:border-white/30 rounded-xl text-[13px] font-bold text-white pl-10 pr-16 py-3 outline-none transition-all flex items-center min-h-[46px] shadow-sm"
                            value={reminderDate}
                            onChange={setReminderDate}
                            title="Data do Lembrete"
                            style={{ borderColor: "rgba(255,255,255,0.15)" }}
                            themeColor={color}
                            placeholder="DD/MM/AAAA"
                          />
                          <Calendar
                            size={16}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none"
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
                                className="w-full bg-black/60 hover:bg-black/80 border border-white/15 hover:border-white/30 rounded-xl text-[13px] font-black uppercase text-white px-4 py-3 outline-none transition-all flex items-center justify-between min-h-[46px] shadow-sm cursor-pointer"
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <Clock
                                    size={17}
                                    className={`shrink-0 ${hasActiveClocks ? "text-green-400 animate-pulse" : "text-white/70"}`}
                                  />
                                  <span className="truncate text-white font-black tracking-wide uppercase">
                                    {hasActiveClocks
                                      ? [reminderTime, reminderTime2, reminderTime3].filter(Boolean).join(" • ")
                                      : "Horários Programados"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {hasActiveClocks && (
                                    <span 
                                      className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black bg-green-500 text-black shadow-sm"
                                    >
                                      {activeClocksCount}
                                    </span>
                                  )}
                                  <ChevronUp size={16} className={`text-white/70 transition-transform ${clocksExpanded ? "rotate-180" : ""}`} />
                                </div>
                              </button>

                              {/* Modal de Horários / Alertas Apple Style - Renderizado via Portal para nunca ser cortado */}
                              {typeof document !== "undefined" &&
                                createPortal(
                                  <AnimatePresence>
                                    {clocksExpanded && (
                                      <div className="fixed inset-0 z-[10000050] flex items-center justify-center p-4 overflow-hidden pointer-events-auto">
                                        {/* Backdrop transparente/desfocado para fechar ao clicar fora */}
                                        <motion.div
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          exit={{ opacity: 0 }}
                                          className="absolute inset-0 bg-black/75 backdrop-blur-md z-0"
                                          onClick={() => setClocksExpanded(false)}
                                        />

                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.92, y: 15 }}
                                          animate={{ opacity: 1, scale: 1, y: 0 }}
                                          exit={{ opacity: 0, scale: 0.92, y: 15 }}
                                          transition={{ type: "spring", stiffness: 450, damping: 28 }}
                                          className="relative w-84 max-w-[92vw] bg-[#121418]/98 border border-white/20 rounded-2xl p-5 space-y-4 shadow-[0_30px_70px_rgba(0,0,0,0.95)] text-left z-10"
                                          style={{
                                            borderTopWidth: "3px",
                                            borderTopColor: "var(--gm-primary, #FF6900)",
                                            backdropFilter: "blur(24px) saturate(190%)",
                                            WebkitBackdropFilter: "blur(24px) saturate(190%)",
                                          }}
                                        >
                                          <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                            <span className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5 text-[var(--gm-primary,#FF6900)]">
                                              <Clock size={15} className={hasActiveClocks ? "animate-pulse text-[var(--gm-primary,#FF6900)]" : "text-[var(--gm-primary,#FF6900)]"} />
                                              Configurar Horários
                                            </span>
                                            <div className="flex items-center gap-2">
                                              <span className="text-[10px] bg-white/10 border border-white/10 text-white/80 px-2 py-0.5 rounded-md font-black uppercase tracking-widest">
                                                Diário
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => setClocksExpanded(false)}
                                                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
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
                                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: reminderTime ? 'var(--gm-primary, #FF6900)' : '#52525b' }} />
                                                  Horário 1
                                                </span>
                                                {reminderTime && (
                                                  <button
                                                    type="button"
                                                    onClick={() => setReminderTime("")}
                                                    className="text-red-400 hover:text-red-300 font-bold transition-all text-[10px] uppercase tracking-wider bg-red-950/40 px-2 py-0.5 rounded border border-red-900/40 cursor-pointer"
                                                  >
                                                    Limpar
                                                  </button>
                                                )}
                                              </div>
                                              <div className="relative">
                                                <GlassTimePicker
                                                  value={reminderTime}
                                                  onChange={setReminderTime}
                                                  className="w-full appearance-none bg-zinc-900/90 border border-zinc-700/70 hover:border-zinc-500 rounded-xl text-xs text-white pl-9 pr-3 py-2.5 outline-none focus:border-zinc-400"
                                                  title="Definir Horário 1"
                                                />
                                                <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: reminderTime ? 'var(--gm-primary, #FF6900)' : '#71717a' }} />
                                              </div>
                                            </div>

                                            {/* SLOT 2 */}
                                            <div className="flex flex-col gap-1.5">
                                              <div className="flex items-center justify-between text-[11px] text-zinc-300 font-extrabold uppercase tracking-wider">
                                                <span className="flex items-center gap-1.5">
                                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: reminderTime2 ? 'var(--gm-primary, #FF6900)' : '#52525b' }} />
                                                  Horário 2
                                                </span>
                                                {reminderTime2 && (
                                                  <button
                                                    type="button"
                                                    onClick={() => setReminderTime2("")}
                                                    className="text-red-400 hover:text-red-300 font-bold transition-all text-[10px] uppercase tracking-wider bg-red-950/40 px-2 py-0.5 rounded border border-red-900/40 cursor-pointer"
                                                  >
                                                    Limpar
                                                  </button>
                                                )}
                                              </div>
                                              <div className="relative">
                                                <GlassTimePicker
                                                  value={reminderTime2}
                                                  onChange={setReminderTime2}
                                                  className="w-full appearance-none bg-zinc-900/90 border border-zinc-700/70 hover:border-zinc-500 rounded-xl text-xs text-white pl-9 pr-3 py-2.5 outline-none focus:border-zinc-400"
                                                  title="Definir Horário 2"
                                                />
                                                <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: reminderTime2 ? 'var(--gm-primary, #FF6900)' : '#71717a' }} />
                                              </div>
                                            </div>

                                            {/* SLOT 3 */}
                                            <div className="flex flex-col gap-1.5">
                                              <div className="flex items-center justify-between text-[11px] text-zinc-300 font-extrabold uppercase tracking-wider">
                                                <span className="flex items-center gap-1.5">
                                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: reminderTime3 ? 'var(--gm-primary, #FF6900)' : '#52525b' }} />
                                                  Horário 3
                                                </span>
                                                {reminderTime3 && (
                                                  <button
                                                    type="button"
                                                    onClick={() => setReminderTime3("")}
                                                    className="text-red-400 hover:text-red-300 font-bold transition-all text-[10px] uppercase tracking-wider bg-red-950/40 px-2 py-0.5 rounded border border-red-900/40 cursor-pointer"
                                                  >
                                                    Limpar
                                                  </button>
                                                )}
                                              </div>
                                              <div className="relative">
                                                <GlassTimePicker
                                                  value={reminderTime3}
                                                  onChange={setReminderTime3}
                                                  className="w-full appearance-none bg-zinc-900/90 border border-zinc-700/70 hover:border-zinc-500 rounded-xl text-xs text-white pl-9 pr-3 py-2.5 outline-none focus:border-zinc-400"
                                                  title="Definir Horário 3"
                                                />
                                                <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: reminderTime3 ? 'var(--gm-primary, #FF6900)' : '#71717a' }} />
                                              </div>
                                            </div>
                                          </div>

                                          {/* Botão Confirmar Limpo */}
                                          <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => setClocksExpanded(false)}
                                              className="flex-1 px-3 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition-all uppercase tracking-wider cursor-pointer"
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
                                              className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 border border-green-500/30 active:scale-95 rounded-xl text-xs font-black text-white transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-green-600/30 cursor-pointer"
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

                      {/* Linha 2: Salvar Auto - Cápsulas estendendo até a borda direita */}
                      <div className="w-full flex items-center gap-3 bg-black/40 border border-white/10 p-2.5 rounded-xl">
                        <span className="text-white/70 font-black uppercase tracking-wider text-[11px] whitespace-nowrap shrink-0">
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
                              className={`w-full py-1.5 rounded-lg text-xs font-black transition-all text-center cursor-pointer ${
                                autoSaveInterval === item.val
                                  ? "bg-[var(--gm-primary,#FF6900)] text-white shadow-md shadow-orange-500/30"
                                  : "bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/10"
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

                {/* Linha FIXA dos Botões: Fechar e Salvar Nota Lado a Lado 50%/50% */}
                <div className="w-full grid grid-cols-2 gap-3 pt-0.5">
                  {/* Botão FECHAR: Fica Laranja no Hover */}
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider text-white/90 bg-black/60 hover:bg-[#FF6900] border border-white/15 hover:border-[#FF6900] hover:text-white hover:shadow-[0_0_20px_rgba(255,105,0,0.5)] transition-all flex items-center justify-center cursor-pointer active:scale-95 min-h-[46px]"
                  >
                    FECHAR
                  </button>

                  {/* Botão SALVAR: Fica Verde no Hover, e Verde por 2 segundos com animação moderna e suave ao clicar */}
                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    className={`relative overflow-hidden w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 ease-out border min-h-[46px] cursor-pointer active:scale-95 ${
                      isSaveSuccessActive
                        ? "bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 border-green-300 text-white shadow-[0_0_30px_rgba(34,197,94,0.75),inset_0_1px_1px_rgba(255,255,255,0.4)] scale-[1.02]"
                        : "bg-black/60 hover:bg-emerald-600 border-white/15 hover:border-emerald-400 text-white/90 hover:text-white hover:shadow-[0_0_22px_rgba(16,185,129,0.5)]"
                    }`}
                  >
                    {/* Efeito feixe de luz suave quando ativo */}
                    {isSaveSuccessActive && (
                      <div 
                        className="absolute inset-0 pointer-events-none opacity-40 bg-gradient-to-r from-transparent via-white to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"
                      />
                    )}
                    <Check 
                      size={16} 
                      className={`shrink-0 transition-all duration-500 ${
                        isSaveSuccessActive ? "scale-125 text-white stroke-[2.5]" : ""
                      }`} 
                    />
                    <span className="transition-all duration-300">
                      {isSaveSuccessActive ? "SALVO COM SUCESSO!" : "SALVAR NOTA"}
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
            {/* 1. Caixinha de Configuração e Escolha de Cores do Texto */}
            {colorPickerOpen && (
              <div
                className="fixed inset-0 z-[10000050] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setColorPickerOpen(false);
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 15 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="relative w-full max-w-[340px] bg-[#111520] border border-white/20 rounded-3xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col gap-4 text-white"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {/* Cabeçalho */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-[var(--gm-primary,#FE540B)] shrink-0">
                        <Palette size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black tracking-wide text-white">Cor do Texto</h4>
                        <p className="text-[10px] text-white/50">Escolha a cor para o texto</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setColorPickerOpen(false);
                      }}
                      className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                      title="Fechar"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Amostra da cor atual + Botão Redefinir para Padrão */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-5 h-5 rounded-full border-2 border-white/50 shadow-sm shrink-0"
                        style={{ backgroundColor: selectedTextColor }}
                      />
                      <span className="text-xs font-bold text-white/90">
                        {TEXT_COLORS.find((c) => c.hex.toLowerCase() === selectedTextColor.toLowerCase())?.label || "Personalizada"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedTextColor("#ffffff");
                        applyStyleToSelection({ color: "#ffffff" });
                        setColorPickerOpen(false);
                      }}
                      className="text-xs font-bold text-white/70 hover:text-white px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                      title="Redefinir para Branco"
                    >
                      Branco (Padrão)
                    </button>
                  </div>

                  {/* Grid de Cores do Texto - Grandes e fáceis de tocar no Smartphone */}
                  <div className="grid grid-cols-5 gap-3 py-1">
                    {TEXT_COLORS.map((col) => {
                      const isActive = selectedTextColor.toLowerCase() === col.hex.toLowerCase();
                      return (
                        <button
                          key={col.hex}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedTextColor(col.hex);
                            applyStyleToSelection({ color: col.hex });
                            setColorPickerOpen(false);
                          }}
                          className={`w-12 h-12 rounded-2xl border-2 transition-all duration-150 flex items-center justify-center cursor-pointer shadow-md ${
                            isActive
                              ? "scale-105 ring-4 ring-[var(--gm-primary,#FE540B)]/60 border-white shadow-orange-500/40"
                              : "hover:scale-105 border-white/20 hover:border-white/60 opacity-90 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: col.hex }}
                          title={col.label}
                        >
                          {isActive && (
                            <Check
                              size={18}
                              className={col.hex === "#ffffff" || col.hex === "#cbd5e1" ? "text-black stroke-[3.5]" : "text-white stroke-[3.5]"}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            )}

            {/* 2. Caixinha de Configuração do Marcador de Texto */}
            {highlighterPickerOpen && (
              <div
                className="fixed inset-0 z-[10000050] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setHighlighterPickerOpen(false);
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 15 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="relative w-full max-w-[340px] bg-[#111520] border border-white/20 rounded-3xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col gap-4 text-white"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {/* Cabeçalho */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shrink-0">
                        <Highlighter size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black tracking-wide text-white">Marcador de Texto</h4>
                        <p className="text-[10px] text-white/50">Realce palavras com cores</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setHighlighterPickerOpen(false);
                      }}
                      className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                      title="Fechar"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Amostra do marcador + Limpar */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-5 h-5 rounded-full border-2 border-white/50 shadow-sm shrink-0"
                        style={{ backgroundColor: selectedHighlightColor || "transparent" }}
                      />
                      <span className="text-xs font-bold text-white/90">
                        {HIGHLIGHT_COLORS.find((c) => c.hex.toLowerCase() === selectedHighlightColor.toLowerCase())?.label || "Sem marcação"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedHighlightColor("");
                        removeHighlight();
                        setHighlighterPickerOpen(false);
                      }}
                      className="text-xs font-bold text-red-400 hover:text-red-300 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                      title="Remover marcação do texto selecionado"
                    >
                      <Eraser size={12} />
                      <span>Limpar</span>
                    </button>
                  </div>

                  {/* Grid de 10 Cores de Marcação */}
                  <div className="grid grid-cols-5 gap-3 py-1">
                    {HIGHLIGHT_COLORS.map((col) => {
                      const isActive = selectedHighlightColor.toLowerCase() === col.hex.toLowerCase();
                      return (
                        <button
                          key={col.hex}
                          type="button"
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
                          className={`w-12 h-12 rounded-2xl border-2 transition-all duration-150 flex items-center justify-center cursor-pointer shadow-md ${
                            isActive
                              ? "scale-105 ring-4 ring-yellow-400/60 border-white shadow-yellow-500/40"
                              : "hover:scale-105 border-white/20 hover:border-white/60 opacity-90 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: col.hex }}
                          title={col.label}
                        >
                          {isActive && (
                            <Check size={18} className="text-black stroke-[3.5]" />
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
                className="fixed inset-0 z-[10000050] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none"
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
                  className="relative w-full max-w-[360px] max-h-[85vh] bg-[#111520] border border-white/20 rounded-3xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col gap-3 text-white"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {/* Cabeçalho */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                        <Type size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black tracking-wide text-white">Galeria de Fontes</h4>
                        <p className="text-[10px] text-white/50">Tipografia para o texto</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFontSelectorOpen(false);
                      }}
                      className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                      title="Fechar"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Lista de Fontes com Rolagem Suave */}
                  <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[360px] custom-scroll pr-1">
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
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          applyStyleToSelection({ "font-family": f.value });
                          setFontSelectorOpen(false);
                        }}
                        className="text-left w-full px-3.5 py-2.5 rounded-xl text-sm text-white/90 hover:text-white hover:bg-white/10 active:bg-[var(--gm-primary,#FE540B)]/20 transition-all flex items-center justify-between border border-transparent hover:border-white/10 cursor-pointer"
                        style={{ fontFamily: f.value }}
                      >
                        <span className="font-semibold">{f.label}</span>
                        <span className="text-[11px] text-white/40 uppercase tracking-wider font-mono">Aa Bb Cc</span>
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
                  backgroundColor: "rgba(0, 0, 0, 0.88)",
                  backdropFilter: "blur(36px) saturate(200%)",
                  WebkitBackdropFilter: "blur(36px) saturate(200%)",
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setZoomImage(null);
                    setZoomScale(1);
                  }
                }}
              >
                {/* Barra Superior do Visualizador de Zoom */}
                <div className="w-full max-w-4xl flex items-center justify-between gap-4 bg-zinc-900/90 border border-white/15 px-4 py-2.5 rounded-2xl backdrop-blur-md shadow-2xl z-20">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black tracking-widest uppercase px-3 py-1 rounded-lg bg-[var(--gm-primary,#FF6900)] text-white shadow-md">
                      LAYOUT {zoomImage.index + 1} DE {layoutUrls.length}
                    </span>
                    <span className="text-xs font-bold text-white/70 hidden sm:inline-block">
                      Zoom: {Math.round(zoomScale * 100)}%
                    </span>
                  </div>

                  {/* Controles de Zoom */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setZoomScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all cursor-pointer"
                      title="Diminuir Zoom (-)"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomScale(1)}
                      className="px-2.5 py-1 text-xs font-bold rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all cursor-pointer"
                      title="Ajustar ao tamanho padrão (100%)"
                    >
                      100%
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomScale((s) => Math.min(4, +(s + 0.25).toFixed(2)))}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all cursor-pointer"
                      title="Aumentar Zoom (+)"
                    >
                      <ZoomIn size={16} />
                    </button>
                    <a
                      href={zoomImage.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all ml-1"
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
                      className="p-2 rounded-xl bg-red-600/90 hover:bg-red-500 text-white transition-all ml-2 cursor-pointer shadow-lg active:scale-95"
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
                      className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/70 hover:bg-black/95 border border-white/20 hover:border-white/40 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-2xl z-30 cursor-pointer backdrop-blur-md"
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
                      className="max-w-[90vw] max-h-[75vh] object-contain rounded-xl shadow-2xl cursor-zoom-in transition-transform duration-200"
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
                      className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/70 hover:bg-black/95 border border-white/20 hover:border-white/40 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-2xl z-30 cursor-pointer backdrop-blur-md"
                      title="Próximo Layout (Seta Direita →)"
                    >
                      <ChevronRight size={24} />
                    </button>
                  )}
                </div>

                {/* Rodapé do Visualizador com Dicas de Navegação */}
                <div className="w-full max-w-md flex items-center justify-center text-center text-white/50 text-[11px] font-semibold py-1.5 px-4 bg-zinc-900/70 border border-white/10 rounded-full backdrop-blur-sm z-20">
                  <span>Navegue com <span className="text-white/80 font-bold">←</span> <span className="text-white/80 font-bold">→</span> • Zoom <span className="text-white/80 font-bold">+</span> / <span className="text-white/80 font-bold">-</span> • <span className="text-white/80 font-bold">ESC</span> para fechar</span>
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
                  className="absolute inset-0 bg-black/60 backdrop-blur-md"
                  onClick={() => setDeleteConfirmId(null)}
                />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className={`p-6 relative w-full max-w-md ${cardBase} border-red-500/30 text-white`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-md flex items-center justify-center shrink-0">
                      <AlertTriangle className="text-red-500" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        Excluir Definitivamente?
                      </h3>
                      <p className="text-white/60 text-sm mt-1">
                        Esta ação não pode ser desfeita. A nota será removida
                        permanentemente do sistema.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="flex-1 px-4 py-3 rounded-xl font-medium text-white/70 hover:text-white barra border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] backdrop-blur-md transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleHardDeleteConfirm}
                      className="flex-1 px-4 py-3 rounded-xl font-medium bg-red-500/80 hover:bg-red-500 text-white border border-red-400/40 backdrop-blur-md transition-all shadow-none cursor-pointer"
                    >
                      Excluir
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
                className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
                onClick={() => setNoteShareData(null)}
              >
                <div
                  className={`w-full max-w-md rounded-2xl overflow-hidden relative z-10 ${cardBase} text-white`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.03]">
                    <h3 className="text-lg font-bold text-white">
                      Compartilhar Nota
                    </h3>
                    <button
                      onClick={() => setNoteShareData(null)}
                      className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors text-white/50 hover:text-white cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-6 space-y-3">
                    <button
                      onClick={() => {
                        const cleanMessage = htmlToPlainFormatedText(
                          noteShareData.message,
                        );
                        openWhatsapp("", cleanMessage);
                        setNoteShareData(null);
                      }}
                      className="w-full rounded-xl barra border border-white/10 shadow-none bg-white/[0.02] hover:bg-white/[0.07] hover:border-[var(--gm-primary)]/40 backdrop-blur-md flex items-center gap-4 p-4 transition-all cursor-pointer group"
                    >
                      <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                        <WhatsAppIcon
                          size={22}
                          className="text-emerald-400"
                        />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-white group-hover:text-[var(--gm-primary)] leading-tight transition-colors">
                          WhatsApp
                        </p>
                        <p className="text-[11px] text-white/50 leading-tight mt-0.5">
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
                      className="w-full rounded-xl barra border border-white/10 shadow-none bg-white/[0.02] hover:bg-white/[0.07] hover:border-[var(--gm-primary)]/40 backdrop-blur-md flex items-center gap-4 p-4 transition-all cursor-pointer group"
                    >
                      <div className="shrink-0 w-10 h-10 rounded-xl bg-[var(--gm-primary)]/15 border border-[var(--gm-primary)]/30 flex items-center justify-center">
                        <Mail size={20} className="text-[var(--gm-primary)]" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-white group-hover:text-[var(--gm-primary)] leading-tight transition-colors">
                          E-mail
                        </p>
                        <p className="text-[11px] text-white/50 leading-tight mt-0.5">
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
                      className="w-full rounded-xl barra border border-white/10 shadow-none bg-white/[0.02] hover:bg-white/[0.07] hover:border-[var(--gm-primary)]/40 backdrop-blur-md flex items-center gap-4 p-4 transition-all cursor-pointer group"
                    >
                      <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                        <Copy size={20} className="text-blue-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-white group-hover:text-[var(--gm-primary)] leading-tight transition-colors">
                          Copiar Texto
                        </p>
                        <p className="text-[11px] text-white/50 leading-tight mt-0.5">
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
                        className="w-full rounded-xl barra border border-white/10 shadow-none bg-white/[0.02] hover:bg-white/[0.07] hover:border-[var(--gm-primary)]/40 backdrop-blur-md flex items-center gap-4 p-4 transition-all cursor-pointer group"
                      >
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                          <Share2 size={20} className="text-purple-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-white group-hover:text-[var(--gm-primary)] leading-tight transition-colors">
                            Mais Opções
                          </p>
                          <p className="text-[11px] text-white/50 leading-tight mt-0.5">
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
    </Page>
  );
}
