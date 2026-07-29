import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/AuthContext";
import { Page } from "../components/ui/Page";
import { Grid } from "../components/ui/Grid";
import { Card } from "../components/ui/Card";
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
} from "lucide-react";
import { Note } from "../types";
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [mainTab, setMainTab] = useState<"NOTE" | "PRODUCTION">("NOTE");
  const [noteTab, setNoteTab] = useState<
    "A FAZER" | "CONCLUÍDOS" | "LIXEIRA"
  >("A FAZER");
  const [prodTab, setProdTab] = useState<
    "A FAZER" | "PRODUÇÃO" | "CONCLUÍDOS" | "LIXEIRA"
  >("A FAZER");
  const [newNoteModalOpen, setNewNoteModalOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Listen for query parameter 'id' to open note
  useEffect(() => {
    const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    const params = new URLSearchParams(location.search || window.location.search || hashQuery);
    const id = params.get("id");
    if (id && notes.length > 0) {
      const noteToOpen = notes.find((n) => n.id === id);
      if (noteToOpen) {
        // Automatically switch main tabs and category tabs to show note context smoothly
        const typeStr = (noteToOpen.type || "note").toUpperCase();
        if (typeStr === "PRODUCTION" || typeStr === "PRODUÇÃO") {
          setMainTab("PRODUCTION");
          if (noteToOpen.deleted_at) {
            setProdTab("LIXEIRA");
          } else {
            const normStatus = normalizeStatus(noteToOpen.status || "a fazer");
            if (normStatus === "PRODUCAO" || normStatus === "EM PRODUCAO") {
              setProdTab("PRODUÇÃO");
            } else if (normStatus === "CONCLUIDOS" || normStatus === "CONCLUIDO") {
              setProdTab("CONCLUÍDOS");
            } else {
              setProdTab("A FAZER");
            }
          }
        } else {
          setMainTab("NOTE");
          if (noteToOpen.deleted_at) {
            setNoteTab("LIXEIRA");
          } else {
            const normStatus = normalizeStatus(noteToOpen.status || "a fazer");
            if (normStatus === "CONCLUIDOS" || normStatus === "CONCLUIDO") {
              setNoteTab("CONCLUÍDOS");
            } else {
              setNoteTab("A FAZER");
            }
          }
        }

        // Highlight the selected note
        setHighlightedId(id);

        // Wait a brief moment for React to change tabs and render the DOM elements, then scroll smoothly
        const scrollTimer = setTimeout(() => {
          const element = document.getElementById(`note-card-${id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);

        // Open the editor after a brief delay to let the user see the gorgeous diagnostic highlight animation sweep
        const openTimer = setTimeout(() => {
          openEdit(noteToOpen);
        }, 1000);

        // Keep highlighted for 6 seconds, then clear state
        const clearHighlightTimer = setTimeout(() => {
          setHighlightedId(null);
        }, 6000);

        return () => {
          clearTimeout(scrollTimer);
          clearTimeout(openTimer);
          clearTimeout(clearHighlightTimer);
        };
      }
    }
  }, [location, notes]);

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
  const [layoutUrl, setLayoutUrl] = useState("");
  const [uploadingLayout, setUploadingLayout] = useState(false);
  const [noteShareData, setNoteShareData] = useState<{
    note: Note;
    message: string;
  } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [selectedTextColor, setSelectedTextColor] = useState("#ffffff");
  const [fontSizeMode, setFontSizeMode] = useState<"P" | "M" | "G">("M");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [fontSelectorOpen, setFontSelectorOpen] = useState(false);

  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      if (!newNoteModalOpen && !modalOpen) return;

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

      let hasImageItem = false;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          hasImageItem = true;
          break;
        }
      }

      if (hasImageItem) {
        e.preventDefault();
      } else {
        return;
      }

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          let file = items[i].getAsFile();
          if (!file || !tenantId) continue;

          setUploadingLayout(true);
          try {
            const options = {
              maxSizeMB: 1,
              maxWidthOrHeight: 1600,
              useWebWorker: true,
            };
            const compressedFile = await imageCompression(file, options);
            const url = await uploadNoteAsset(tenantId, compressedFile);

            const imgHtml = `<span contenteditable="false" class="note-img-wrapper group" style="position: relative; display: inline-block; max-width: 100%; min-width: 100px; min-height: 100px; padding: 4px; border: 1px dashed rgba(255,255,255,0.3); border-radius: 8px; resize: both; overflow: hidden; margin-top: 10px; margin-bottom: 10px; background: rgba(0,0,0,0.2);"><span class="note-img-number" style="position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.8); color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; justify-content: center; align-items: center; font-size: 12px; font-weight: bold; pointer-events: none; z-index: 10; border: 1px solid rgba(255,255,255,0.2);"></span><button class="note-img-delete" onclick="this.parentElement.remove()" style="position: absolute; top: 12px; right: 12px; background: rgba(255,0,0,0.8); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; width: 28px; height: 28px; cursor: pointer; display: flex; justify-content: center; align-items: center; z-index: 10; font-size: 14px; font-weight: bold; opacity: 0.8;">✕</button><img src="${url}" alt="pasted layout" style="width: 100%; height: 100%; object-fit: contain; display: block;" /></span>&nbsp;`;

            if (document.activeElement === contentRef.current) {
              document.execCommand("insertHTML", false, imgHtml);
            } else {
              if (contentRef.current) {
                contentRef.current.innerHTML += `<br>${imgHtml}`;
              }
            }

            if (contentRef.current) {
              const val = contentRef.current.innerHTML;
              setContent(val);
              pushToHistory(val, true);
            }
          } catch (err) {
            alert("Erro ao colar imagem: " + err);
          } finally {
            setUploadingLayout(false);
          }
        }
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [tenantId, newNoteModalOpen, modalOpen]);

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
    if (tenantId) loadNotes();
  }, [tenantId]);

  async function loadNotes() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error && error.code === "42P01") {
        // Table doesn't exist yet, mock it for now since user needs to run the setup script
        console.warn(
          "Notes table does not exist yet. Please run the SQL setup script.",
        );
        setNotes([]);
      } else if (data) {
        const mappedData = data.map(n => {
          const st = normalizeStatus(n.status);
          if (st === "APROVADO") {
            return { ...n, type: "production" as any, status: "PRODUÇÃO" };
          }
          if (st === "AGUARDANDO") {
            return { ...n, status: "A FAZER" };
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

  const applyHighlight = (bgColor: string) => {
    applyStyleToSelection({ "background-color": bgColor });
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
    setLayoutUrl("");
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
    setLayoutUrl(note.layout_url || "");

    if (note.reminder_time && note.reminder_time.includes(" ")) {
      const parts = note.reminder_time.split(" ");
      const rDate = parts[0] || "";
      const rTime = parts.slice(1).join(" ") || "";
      setReminderDate(rDate);
      const times = rTime ? rTime.split(",") : [];
      setReminderTime(times[0] || "");
      setReminderTime2(times[1] || "");
      setReminderTime3(times[2] || "");
    } else {
      setReminderDate("");
      const times = note.reminder_time ? note.reminder_time.split(",") : [];
      setReminderTime(times[0] || "");
      setReminderTime2(times[1] || "");
      setReminderTime3(times[2] || "");
    }
    setClocksExpanded(false);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!tenantId) return;

    const activeTimes = [reminderTime, reminderTime2, reminderTime3].filter(Boolean);
    const timeStr = activeTimes.join(",");

    const savedReminder =
      reminderDate && timeStr
        ? `${reminderDate} ${timeStr}`
        : timeStr || null;

    const payload = {
      tenant_id: tenantId,
      title,
      content,
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
      }

      // Update Alarm Schedule if reminder format is valid
      if (savedNote) {
        if (savedNote.reminder_time) {
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
    } catch (e: any) {
      alert(
        "Falha ao salvar a nota. Verifique se as permissões/tabelas no Supabase foram criadas.\n\n" +
          e.message,
      );
    }

    setModalOpen(false);
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

  function handleShareClick(note: Note) {
    const titleText = note.title || "Sem título";
    const contentText = note.content || "";
    const message = `*${titleText}*\n\n${contentText}`;
    setNoteShareData({ note, message });
  }

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handlePdf = async (note: Note) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      let timbradoUrl = "";
      if (tenantId) {
        const { fetchSettingsSupabase } = await import("../lib/settings");
        const settings = await fetchSettingsSupabase(tenantId);
        if (settings && settings.timbrado_url) {
          timbradoUrl = settings.timbrado_url;
        }
      }

      const getBase64ImageFormatUrl = async (imageUrl: string) => {
        if (!imageUrl) return null;
        if (imageUrl.startsWith("data:")) {
          let type = "JPEG";
          if (imageUrl.startsWith("data:image/png")) type = "PNG";
          else if (imageUrl.startsWith("data:image/webp")) type = "WEBP";
          return { base64: imageUrl, type };
        }

        let fetchUrl = imageUrl;
        try {
          let bucket: string | null = null;
          let path: string | null = null;

          if (imageUrl.includes("/storage/v1/object/")) {
            const match = imageUrl.match(/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)\/(.+)$/);
            if (match) {
              bucket = match[1];
              path = match[2].split("?")[0];
            }
          } else {
            if (
              imageUrl.includes("/public/timbrados/") ||
              imageUrl.includes("/authenticated/timbrados/")
            ) {
              bucket = "timbrados";
            } else if (
              imageUrl.includes("/public/tenant-assets/") ||
              imageUrl.includes("/authenticated/tenant-assets/")
            ) {
              bucket = "tenant-assets";
            }

            if (bucket) {
              const parts = imageUrl.split(`/public/${bucket}/`);
              const signParts = imageUrl.split(`/authenticated/${bucket}/`);
              let rawPath = null;
              if (parts.length > 1) rawPath = parts[1];
              else if (signParts.length > 1) rawPath = signParts[1];
              if (rawPath) {
                path = rawPath.split("?")[0];
              }
            }
          }

          // Directly try supabase storage download first to avoid CORS / public permissions wall
          if (bucket && path) {
            try {
              const { data, error } = await supabase.storage
                .from(bucket)
                .download(path);
              if (!error && data) {
                const result = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(data);
                });
                let type = "JPEG";
                if (result.startsWith("data:image/png")) type = "PNG";
                else if (result.startsWith("data:image/webp")) type = "WEBP";
                return { base64: result, type };
              }
            } catch (errSupabase) {
              console.error("Supabase direct download failed, fallback to url fetch", errSupabase);
            }
          }

          let res = await fetch(fetchUrl);
          let textSample = "";
          if (res.ok) {
            const peekContent = await res.clone().text();
            textSample = peekContent.slice(0, 100).toLowerCase();
          }
          if (!res.ok || textSample.includes("<html")) {
            if (bucket && path) {
              const { data } = await supabase.storage
                .from(bucket)
                .createSignedUrl(path, 60 * 10);
              if (data?.signedUrl) {
                fetchUrl = data.signedUrl;
                res = await fetch(fetchUrl);
              }
            }
          }

          const blob = await res.blob();
          const base64Str = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          let type = "JPEG";
          if (base64Str.startsWith("data:image/png")) type = "PNG";
          else if (base64Str.startsWith("data:image/webp")) type = "WEBP";
          return { base64: base64Str, type };
        } catch (e) {
          console.error("Failed to load and convert image to base64 for PDF", e);
          return null;
        }
      };

      const renderTimbrado = async () => {
        if (timbradoUrl) {
          try {
            const resImg = await getBase64ImageFormatUrl(timbradoUrl);
            if (resImg) {
              const { base64, type } = resImg;
              doc.addImage(base64, type, 0, 0, 210, 297);
            }
          } catch (e) {
            console.error("Failed to load timbrado", e);
          }
        }
      };

      await renderTimbrado();

      const title = note.title || "Sem título";
      const cleanContent = htmlToPlainFormatedText(note.content || "")
        .replace(/\*/g, "")
        .replace(/_/g, "");

      let currentY = 35;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(0);
      doc.text(title, 20, currentY);

      currentY += 8;
      doc.setFontSize(10);
      doc.setTextColor(50);

      const addInfoLine = (label: string, value: string) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, 20, currentY);
        const labelWidth = doc.getTextWidth(label + " ");
        doc.setFont("helvetica", "normal");
        doc.text(value, 20 + labelWidth, currentY);
        currentY += 6;
      };

      addInfoLine("Criado em:", new Date(note.created_at).toLocaleDateString());

      if (note.delivery_date) {
        addInfoLine(
          "Prazo:",
          `${note.delivery_date.split("-").reverse().join("/")} ${note.delivery_time || ""}`,
        );
      }
      if (note.responsible_name) {
        addInfoLine("Responsável:", note.responsible_name);
      }

      currentY += 6;
      doc.setTextColor(30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);

      const splitText = doc.splitTextToSize(cleanContent, 170);
      // Small adjustment for line height
      doc.text(splitText, 20, currentY, { lineHeightFactor: 1.5 });

      currentY += splitText.length * 6.5 + 10;

      // Extract all images from layouts and body content to render in a 2-column grid
      const imagesToRender: string[] = [];
      if (note.layout_url) {
        imagesToRender.push(note.layout_url);
      }

      try {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = note.content || "";
        const imgElements = tempDiv.getElementsByTagName("img");
        for (let i = 0; i < imgElements.length; i++) {
          const src = imgElements[i].getAttribute("src");
          if (src && !imagesToRender.includes(src)) {
            imagesToRender.push(src);
          }
        }
      } catch (err) {
        console.error("Error extracting embedded images from content for PDF:", err);
      }

      if (imagesToRender.length > 0) {
        // Render optional title for attachments
        if (currentY + 15 > 240) {
          doc.addPage();
          await renderTimbrado();
          currentY = 40;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(80);
        doc.text("Mídias e Anexos:", 20, currentY);
        currentY += 8;

        // Load all image data to prepare sizing
        interface ImageItem {
          base64: string;
          type: string;
          width: number;
          height: number;
        }
        
        const loadedImages: ImageItem[] = [];
        for (const imgUrl of imagesToRender) {
          try {
            const resImg = await getBase64ImageFormatUrl(imgUrl);
            if (resImg) {
              const { base64, type } = resImg;
              const dimensions = await new Promise<{ w: number; h: number }>((resolve) => {
                const imgObj = new Image();
                imgObj.onload = () => resolve({ w: imgObj.naturalWidth, h: imgObj.naturalHeight });
                imgObj.onerror = () => resolve({ w: 400, h: 300 });
                imgObj.src = base64;
              });
              loadedImages.push({
                base64,
                type,
                width: dimensions.w || 400,
                height: dimensions.h || 300
              });
            }
          } catch (eImg) {
            console.error("Error preprocessing image for PDF:", imgUrl, eImg);
          }
        }

        // Render images in pairs (2 per row)
        const colWidth = 82;
        const colGap = 6;
        const maxImgHeight = 65; // Max height to keep them smaller and elegant

        for (let i = 0; i < loadedImages.length; i += 2) {
          const img1 = loadedImages[i];
          const img2 = loadedImages[i + 1];

          const aspectRatio1 = img1.height / img1.width;
          const h1 = Math.min(colWidth * aspectRatio1, maxImgHeight);

          let h2 = 0;
          if (img2) {
            const aspectRatio2 = img2.height / img2.width;
            h2 = Math.min(colWidth * aspectRatio2, maxImgHeight);
          }

          const rowHeight = Math.max(h1, h2);

          // Check overflow
          if (currentY + rowHeight > 240) {
            doc.addPage();
            await renderTimbrado();
            currentY = 40;
          }

          // Draw Image 1 (Left Column)
          try {
            // Draw subtle frame border around image
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.15);
            doc.rect(20, currentY, colWidth, h1);
            doc.addImage(img1.base64, img1.type, 20.2, currentY + 0.2, colWidth - 0.4, h1 - 0.4);
          } catch (errAdd) {
            console.error("Error drawing image 1 inside cell:", errAdd);
          }

          // Draw Image 2 (Right Column) if exists
          if (img2) {
            try {
              doc.rect(20 + colWidth + colGap, currentY, colWidth, h2);
              doc.addImage(img2.base64, img2.type, 20 + colWidth + colGap + 0.2, currentY + 0.2, colWidth - 0.4, h2 - 0.4);
            } catch (errAdd) {
              console.error("Error drawing image 2 inside cell:", errAdd);
            }
          }

          currentY += rowHeight + 8;
        }
      }

      let sigY = Math.max(currentY + 20, 220);

      if (sigY > 260) {
        doc.addPage();
        await renderTimbrado();
        sigY = 240;
      }

      doc.setLineWidth(0.3);
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      // Assinatura Recebedor
      doc.line(20, sigY - 5, 95, sigY - 5);
      doc.text("Assinatura do Recebedor", 20, sigY + 2);

      // Assinatura Responsável
      doc.line(115, sigY - 5, 190, sigY - 5);
      doc.text("Assinatura do Responsável", 115, sigY + 2);

      doc.save(`Nota_${title.replace(/\s+/g, "_")}.pdf`);
    } catch (e: any) {
      alert("Erro ao gerar PDF: " + e.message);
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
    let base = notes.filter(
      (n) => (n.type || "note").toUpperCase() === mainTab,
    );

    const activeTab = mainTab === "NOTE" ? noteTab : prodTab;
    const isTrash = activeTab === "LIXEIRA";

    if (isTrash) {
      base = base.filter((n) => !!n.deleted_at);
    } else {
      base = base.filter((n) => !n.deleted_at);

      const normalizedActiveTab = normalizeStatus(activeTab);
      base = base.filter((n) => {
        let st = normalizeStatus(
          n.status || "a fazer",
        );
        if (normalizedActiveTab === "PRODUCAO" && st === "EM PRODUCAO")
          return true;
        return st === normalizedActiveTab;
      });
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      base = base.filter(
        (n) =>
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.content && n.content.toLowerCase().includes(q)),
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

    console.log("Filtered notes:", { mainTab, activeTab, normalizedActiveTab: normalizeStatus(activeTab), results: base.length, allNotes: notes });

    return base;
  }, [notes, searchTerm, mainTab, noteTab, prodTab]);

  const NOTE_STATUSES = [
    "A FAZER",
    "CONCLUÍDOS",
    "LIXEIRA",
  ] as const;
  const PROD_STATUSES = [
    "A FAZER",
    "PRODUÇÃO",
    "CONCLUÍDOS",
    "LIXEIRA",
  ] as const;

  return (
    <Page title="Notes" className="animate-fade-in relative min-h-screen">
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:max-w-md gm-btn !p-0 !cursor-text hover:!scale-100 active:!scale-100 !transform-none !justify-start h-14 rounded-2xl overflow-hidden shadow-lg border-2 border-transparent focus-within:border-[var(--gm-primary)] transition-colors">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 z-10 pointer-events-none"
              size={20}
            />
            <input
              type="text"
              className="pl-12 h-full w-full bg-transparent outline-none border-none text-white placeholder:text-white/40 text-base relative z-20"
              placeholder="Pesquisar notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={openNewNote}
            className="flex items-center gap-2 gm-btn px-6 py-4 rounded-2xl shrink-0 w-full md:w-auto shadow-lg"
          >
            <Plus size={20} />
            <span>Criar Nota</span>
          </button>
        </div>

        {/* Workflow Tabs */}
        <div className="flex items-center gap-2 border-b border-white/5 pb-2 overflow-x-auto scrollbar-hide">
          {mainTab === "NOTE"
            ? NOTE_STATUSES.map((t) => (
                <button
                  key={t}
                  onClick={() => setNoteTab(t as any)}
                  className={`px-4 py-2 font-bold text-xs md:text-sm rounded-xl transition-all whitespace-nowrap ${noteTab === t ? "bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] border border-[var(--gm-primary)]/50" : "text-white/40 border border-transparent hover:text-white/80 hover:bg-white/5"}`}
                >
                  {t}
                </button>
              ))
            : PROD_STATUSES.map((t) => (
                <button
                  key={t}
                  onClick={() => setProdTab(t as any)}
                  className={`px-4 py-2 font-bold text-xs md:text-sm rounded-xl transition-all whitespace-nowrap ${prodTab === t ? "bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] border border-[var(--gm-primary)]/50" : "text-white/40 border border-transparent hover:text-white/80 hover:bg-white/5"}`}
                >
                  {t}
                </button>
              ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[var(--gm-primary)]" />
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
                  onClick={() => openEdit(note)}
                >
                  <div
                    id={`note-card-${note.id}`}
                    className={`rounded-3xl p-6 relative gap-3 flex flex-col transition-all cursor-pointer group hover:scale-[1.02] h-full gm-note-card ${
                      isExpanded
                        ? "overflow-y-auto custom-scroll max-h-[60vh] md:max-h-[80vh]"
                        : "overflow-hidden min-h-[280px]"
                    } ${note.id === highlightedId ? "gm-highlighted-budget-glass" : ""}`}
                    style={{
                      backgroundColor: "var(--gm-card, rgba(17, 19, 24, 0.8))",
                      backdropFilter: "blur(12px)",
                      borderColor: "var(--gm-primary, #FF6900)",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    {/* Pin Toggle */}
                    <button
                      onClick={(e) => togglePin(note, e)}
                      className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-10 animate-fade-in"
                      style={{
                        color: note.is_pinned
                          ? noteColor
                          : "rgba(255, 255, 255, 0.5)",
                      }}
                    >
                      {note.is_pinned ? (
                        <Pin size={13} fill={noteColor} />
                      ) : (
                        <PinOff size={13} />
                      )}
                    </button>

                    {/* Title */}
                    <div className="flex flex-col gap-1 pr-8">
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

                    {note.layout_url && (
                      <div className="w-full h-32 rounded-xl overflow-hidden mt-1 shrink-0 relative bg-black/40 border border-white/5">
                        <img
                          src={note.layout_url}
                          alt="Layout Thumbnail"
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    )}

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
                      {/* Fade out bottom of long text */}
                      {!isExpanded && isLong && (
                        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#111318] to-transparent pointer-events-none"></div>
                      )}
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
                        {note.reminder_time &&
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
                      <div className="flex items-center justify-between gap-2.5 w-full pt-2.5 border-t border-white/5">
                        {/* Status label displayed next to action buttons */}
                        {note.status ? (
                          <div className="flex items-center">
                            <span
                              className="text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md shrink-0 select-none"
                              style={{
                                backgroundColor: `${noteColor}15`,
                                color: noteColor,
                                border: `1px solid ${noteColor}32`,
                              }}
                            >
                              {note.status.replace(/_/g, " ")}
                            </span>
                          </div>
                        ) : (
                          <div />
                        )}

                        <div className="flex items-center gap-1.5 shrink-0">
                          {(mainTab === "NOTE" ? noteTab : prodTab) ===
                          "LIXEIRA" ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestore(note.id);
                                }}
                                className="text-green-400 hover:text-green-300 h-8 w-8 flex items-center justify-center bg-green-500/10 rounded-lg transition-all hover:scale-105 hover:bg-green-500/20 z-20 relative pointer-events-auto"
                                title="Restaurar"
                              >
                                <RefreshCcw size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(note.id);
                                }}
                                className="text-red-500 hover:text-red-400 h-8 w-8 flex items-center justify-center bg-red-500/10 rounded-lg transition-all hover:scale-105 hover:bg-red-500/20 z-20 relative pointer-events-auto"
                                title="Excluir Definitivamente"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShareClick(note);
                                }}
                                className="h-8 w-8 flex items-center justify-center rounded-lg transition-all hover:scale-105 z-20 relative pointer-events-auto text-[var(--gm-accent)]"
                                style={{
                                  color: noteColor,
                                  backgroundColor: `${noteColor}1a`,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = `${noteColor}33`;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = `${noteColor}1a`;
                                }}
                                title="Compartilhar Nota"
                              >
                                <Share2 size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePdf(note);
                                }}
                                className="h-8 w-8 flex items-center justify-center rounded-lg transition-all hover:scale-105 z-20 relative pointer-events-auto text-[var(--gm-accent)]"
                                style={{
                                  color: noteColor,
                                  backgroundColor: `${noteColor}1a`,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = `${noteColor}33`;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = `${noteColor}1a`;
                                }}
                                title="Exportar PDF"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                  <polyline points="7 10 12 15 17 10"></polyline>
                                  <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSoftDelete(note.id);
                                }}
                                className="h-8 w-8 flex items-center justify-center rounded-lg transition-all hover:scale-105 z-20 relative pointer-events-auto text-[var(--gm-accent)]"
                                style={{
                                  color: noteColor,
                                  backgroundColor: `${noteColor}1a`,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = `${noteColor}33`;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = `${noteColor}1a`;
                                }}
                                title="Mover para Lixeira"
                              >
                                <Trash2 size={14} />
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

      {/* Selection Modal */}
      <AnimatePresence>
        {newNoteModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setNewNoteModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="gm-card p-6 w-full max-w-xl flex flex-col relative z-10 border-white/10"
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
                  className="p-2 text-white/50 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => openNewNoteModal("note")}
                  className="flex flex-col items-start gap-4 p-6 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left group"
                >
                  <div className="p-3 bg-[#ff6600]/20 text-[#ff6600] rounded-xl group-hover:scale-110 transition-transform">
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
                  className="flex flex-col items-start gap-4 p-6 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left group"
                >
                  <div className="p-3 bg-[#ff6600]/20 text-[#ff6600] rounded-xl group-hover:scale-110 transition-transform">
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
      </AnimatePresence>

      {/* Editor Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[1000] flex md:items-center justify-center md:p-4 bg-black/90 md:bg-transparent backdrop-blur-md md:backdrop-blur-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm hidden md:block"
              onClick={() => setModalOpen(false)}
            />

            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full h-[100dvh] md:h-auto md:max-w-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden gm-note-modal"
              style={{
                maxHeight: window.innerWidth < 768 ? "100dvh" : "90vh",
                backgroundColor: "var(--gm-card, rgba(17, 19, 24, 0.95))",
                backdropFilter: "blur(16px)",
                borderColor: "var(--gm-primary, #FF6900)",
                borderWidth: window.innerWidth < 768 ? "0px" : "1px",
                borderTopWidth: window.innerWidth < 768 ? "2px" : "1px",
                borderStyle: "solid",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
              }}
            >
              <div
                className="p-4 md:px-6 flex items-center justify-between shrink-0"
                style={{
                  borderBottom: "1px solid var(--gm-primary, #FF6900)",
                  backgroundColor: "rgba(255, 105, 0, 0.08)",
                }}
              >
                <div className="flex items-center gap-3 w-full">
                  <input
                    type="text"
                    className="bg-transparent border-none outline-none font-bold text-lg text-white w-full placeholder:text-white/30"
                    placeholder="Título da nota"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <button
                    onClick={() => setIsPinned(!isPinned)}
                    className="w-10 h-10 flex items-center justify-center rounded-full transition-all"
                    style={{
                      backgroundColor: isPinned ? `${color}30` : "transparent",
                      color: isPinned ? color : "rgba(255, 255, 255, 0.4)",
                    }}
                  >
                    <Pin size={18} fill={isPinned ? color : "none"} />
                  </button>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-white/40"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Text Formatting Toolbar */}
              <div
                className="flex flex-col gap-3 px-4 md:px-6 py-3 bg-black/45 border-b border-white/5 select-none shrink-0"
                style={{ borderColor: `${color}30` }}
              >
                {/* Core Formatting Controls Group */}
                <div className="flex flex-wrap items-center justify-center gap-2 py-1 relative z-30">
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

                  {/* Cores do Texto Dropdown */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setColorPickerOpen(!colorPickerOpen);
                        setFontSelectorOpen(false);
                      }}
                      className="py-1.5 px-2.5 rounded-lg hover:bg-white/15 text-white transition-all hover:scale-105 active:scale-95 bg-white/5 flex items-center gap-1.5 min-h-[38px]"
                      title="Cor do Texto"
                    >
                      <Palette size={15} className="text-white/60" />
                      <span
                        className="w-3 h-3 rounded-full border border-white/30"
                        style={{ backgroundColor: selectedTextColor }}
                      />
                      <ChevronDown size={11} className="text-white/40" />
                    </button>

                    {colorPickerOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-[9990]"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setColorPickerOpen(false);
                          }}
                        />
                        <div className="absolute top-10 left-0 bg-[#141821]/95 border border-white/10 p-2 rounded-xl flex flex-col gap-1.5 shadow-2xl z-[9991] backdrop-blur-md min-w-[124px]">
                          <div className="px-1 py-0.5 text-[8px] font-extrabold uppercase tracking-widest text-white/30 border-b border-white/5">
                            Cor do Texto
                          </div>
                          <div className="grid grid-cols-4 gap-1.5 p-0.5">
                            {[
                              "#ffffff", // White
                              "#ff003c", // Red
                              "#ff6600", // Orange
                              "#ffff00", // Yellow
                              "#00ff66", // Green
                              "#00e5ff", // Cyan
                              "#b400ff", // Violet
                              "#ff00a0", // Pink
                            ].map((hex) => {
                              const isActive = selectedTextColor === hex;
                              return (
                                <button
                                  key={hex}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedTextColor(hex);
                                    applyStyleToSelection({ color: hex });
                                    setColorPickerOpen(false);
                                  }}
                                  className={`w-5 h-5 rounded-full border border-solid transition-all duration-200 shrink-0 ${
                                    isActive
                                      ? "border-white scale-105 z-10"
                                      : "border-white/20 hover:border-white/45 opacity-60 hover:opacity-100"
                                  }`}
                                  style={{
                                    backgroundColor: hex,
                                    boxShadow: isActive ? `0 0 6px ${hex}` : "none",
                                  }}
                                  title={hex}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Font Gallery Dropdown */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFontSelectorOpen(!fontSelectorOpen);
                        setColorPickerOpen(false);
                      }}
                      className="py-1.5 px-3.5 rounded-lg hover:bg-white/15 text-white text-[12px] transition-all tracking-wide hover:scale-105 active:scale-95 bg-white/5 font-bold flex items-center justify-center gap-1.5 min-h-[38px]"
                      title="Galeria de Fontes"
                    >
                      <Type size={13} className="text-white/60" />
                      <span>Fontes</span>
                      <ChevronDown size={12} className="text-white/40" />
                    </button>

                    {fontSelectorOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-[9990]"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFontSelectorOpen(false);
                          }}
                        />
                        <div className="absolute top-11 left-0 bg-[#141821]/95 border border-white/10 p-2 rounded-xl flex flex-col gap-0.5 shadow-2xl z-[9995] backdrop-blur-md min-w-[200px] max-h-[280px] overflow-y-auto scrollbar-hide">
                          <div className="px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-white/40 border-b border-white/5 mb-1.5">
                            Selecione a Fonte
                          </div>
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
                              className="text-left w-full px-3 py-2 rounded-lg text-[13px] text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                              style={{ fontFamily: f.value }}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
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

                  {/* Highlighter Text Option Group */}
                  <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg shrink-0 mr-1.5">
                    <Highlighter size={13} className="text-white/60 mr-1" />
                    {[
                      { hex: "transparent", label: "Limpar" },
                      { hex: "#fef08a", label: "Amarelo" },
                      { hex: "#bbf7d0", label: "Verde" },
                      { hex: "#fbcfe8", label: "Rosa" },
                      { hex: "#cffafe", label: "Azul" },
                    ].map((marker) => (
                      <button
                        key={marker.hex}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyHighlight(marker.hex);
                        }}
                        className="w-5 h-5 rounded-full border border-white/20 transition-all hover:scale-110"
                        style={{
                          backgroundColor: marker.hex === "transparent" ? "rgba(255,255,255,0.1)" : marker.hex,
                        }}
                        title={`Marcador ${marker.label}`}
                      />
                    ))}
                  </div>


                </div>

                {/* Formatar Texto Opções Extra */}
              </div>

              {/* Scrollable Area */}
              <div
                className="flex-1 overflow-y-auto custom-scroll min-h-0 relative flex flex-col"
                style={{
                  backgroundColor: "transparent",
                  boxShadow: `inset 0 0 40px ${color}15`,
                }}
              >
                {/* Metadata Fields */}
                <div className="p-4 md:px-6 py-4 border-b border-white/5 bg-black/20 flex flex-col gap-4 shrink-0 w-full animate-fadeIn">
                  {/* Linha Superior: Tipo de Nota, Status e Prazo de Entrega */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Tipo da Nota */}
                    <div className="flex flex-col gap-1 w-full">
                      <label className="text-[10px] uppercase tracking-widest text-white/45 font-bold">
                        Tipo da Nota
                      </label>
                      <div className="relative">
                        <select
                          value={noteType}
                          onChange={(e) => {
                            setNoteType(e.target.value as any);
                            setNoteStatus(
                              e.target.value === "note"
                                ? "a fazer"
                                : "a fazer",
                            );
                          }}
                          className="w-full appearance-none bg-black/40 border border-white/10 rounded-lg text-[14px] text-white pl-3.5 pr-10 h-[44px] outline-none focus:border-white/30 cursor-pointer font-bold transition-all"
                        >
                          <option value="note">GERAL</option>
                          <option value="production">PRODUÇÃO</option>
                        </select>
                        <ChevronDown
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                          size={16}
                        />
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex flex-col gap-1 w-full">
                      <label className="text-[10px] uppercase tracking-widest text-white/45 font-bold">
                        Status
                      </label>
                      <div className="relative">
                        <select
                          value={noteStatus}
                          onChange={(e) => setNoteStatus(e.target.value)}
                          className="w-full appearance-none bg-black/40 border border-white/10 rounded-lg text-[14px] text-white pl-3.5 pr-10 h-[44px] outline-none focus:border-white/30 cursor-pointer font-bold transition-all"
                        >
                          {noteType === "note"
                            ? NOTE_STATUSES.filter((s) => s !== "LIXEIRA").map(
                                (s) => (
                                  <option key={s} value={s.toLowerCase()}>
                                    {s}
                                  </option>
                                ),
                              )
                            : PROD_STATUSES.filter((s) => s !== "LIXEIRA").map(
                                (s) => (
                                  <option key={s} value={s.toLowerCase()}>
                                    {s}
                                  </option>
                                ),
                              )}
                        </select>
                        <ChevronDown
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                          size={16}
                        />
                      </div>
                    </div>

                    {/* Prazo de Entrega */}
                    <div className="flex flex-col gap-1 w-full">
                      <label className="text-[10px] uppercase tracking-widest text-white/45 font-bold">
                        Prazo de Entrega
                      </label>
                      <div className="relative">
                        <GlassDatePicker
                          value={deliveryDate}
                          onChange={setDeliveryDate}
                          className="w-full bg-black/40 border border-white/10 rounded-lg text-[14px] text-white pl-9 pr-3.5 h-[44px] flex items-center outline-none focus:border-white/30 select-none font-bold transition-all"
                          title="Prazo"
                          themeColor={color}
                        />
                        <Calendar
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                          size={14}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Linha Inferior: Responsável e Horário de Entrega */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Responsável */}
                    <div className="flex flex-col gap-1 w-full md:col-span-2 animate-fadeIn">
                      <label className="text-[10px] uppercase tracking-widest text-white/45 font-bold">
                        Responsável
                      </label>
                      <input
                        type="text"
                        placeholder="Nome do responsável"
                        value={responsibleName}
                        onChange={(e) => setResponsibleName(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-lg text-[14px] text-white px-3.5 h-[44px] outline-none focus:border-white/30 w-full font-bold transition-all"
                      />
                    </div>

                    {/* Horário de Entrega */}
                    <div className="flex flex-col gap-1 w-full animate-fadeIn">
                      <label className="text-[10px] uppercase tracking-widest text-white/45 font-bold">
                        Horário de Entrega
                      </label>
                      <div className="relative">
                        <GlassTimePicker
                          value={deliveryTime}
                          onChange={setDeliveryTime}
                          className="w-full bg-black/40 border border-white/10 rounded-lg text-[14px] text-white pl-9 pr-3.5 h-[44px] outline-none focus:border-white/30 font-bold transition-all"
                        />
                        <Clock
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                          size={14}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Campo para Inserção do Layout */}
                <div className="p-4 md:px-6 py-4 border-b border-white/5 bg-black/10 flex flex-col gap-2 shrink-0">
                  <span className="text-[10px] uppercase tracking-widest text-white/45 font-bold font-mono">
                    Campo para Inserção do Layout
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Cole aqui a URL/link da imagem para o layout..."
                        value={layoutUrl}
                        onChange={(e) => setLayoutUrl(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-lg text-sm text-white pl-9 pr-3 py-2.5 outline-none focus:border-white/30 w-full"
                      />
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={14} />
                    </div>

                    <label
                      className={`bg-orange-600/15 hover:bg-orange-600/25 border border-orange-500/25 rounded-lg text-sm text-orange-300 px-4 py-2.5 outline-none cursor-pointer flex items-center justify-center gap-2 transition-all shrink-0 ${uploadingLayout ? "opacity-50 pointer-events-none" : ""}`}
                    >
                      {uploadingLayout ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                      <span>{uploadingLayout ? "Enviando..." : "Enviar Layout"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        multiple
                        disabled={uploadingLayout}
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (files && files.length > 0 && tenantId) {
                            setUploadingLayout(true);
                            try {
                              let firstUrl = layoutUrl;
                              const options = {
                                maxSizeMB: 1,
                                maxWidthOrHeight: 1600,
                                useWebWorker: true,
                              };
                              for (let i = 0; i < files.length; i++) {
                                const compressedFile = await imageCompression(
                                  files[i],
                                  options,
                                );
                                const url = await uploadNoteAsset(
                                  tenantId,
                                  compressedFile,
                                );

                                const imgHtml = `<span contenteditable="false" class="note-img-wrapper group" style="position: relative; display: inline-block; max-width: 100%; min-width: 100px; min-height: 100px; padding: 4px; border: 1px dashed rgba(255,255,255,0.3); border-radius: 8px; resize: both; overflow: hidden; margin-top: 10px; margin-bottom: 10px; background: rgba(0,0,0,0.2);"><span class="note-img-number" style="position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.8); color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; justify-content: center; align-items: center; font-size: 12px; font-weight: bold; pointer-events: none; z-index: 10; border: 1px solid rgba(255,255,255,0.2);"></span><button class="note-img-delete" onclick="this.parentElement.remove()" style="position: absolute; top: 12px; right: 12px; background: rgba(255,0,0,0.8); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; width: 28px; height: 28px; cursor: pointer; display: flex; justify-content: center; align-items: center; z-index: 10; font-size: 14px; font-weight: bold; opacity: 0.8;">✕</button><img src="${url}" alt="layout" style="width: 100%; height: 100%; object-fit: contain; display: block;" /></span>&nbsp;`;

                                if (!firstUrl) {
                                  firstUrl = url;
                                  setLayoutUrl(url);
                                } else {
                                  if (contentRef.current) {
                                    contentRef.current.innerHTML += `<br>${imgHtml}`;
                                  }
                                }
                              }
                              if (contentRef.current) {
                                const val = contentRef.current.innerHTML;
                                setContent(val);
                                pushToHistory(val, true);
                              }
                            } catch (err) {
                              alert("Erro ao enviar layout.");
                            } finally {
                              setUploadingLayout(false);
                              e.target.value = "";
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Stacked Layout Block: Layout Top (Large) & Typing Editor Bottom */}
                <div className="p-4 md:p-6 flex flex-col gap-6 flex-1 touch-pan-y">
                  {/* Row 1: Layout Preview Panel */}
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] uppercase tracking-widest text-white/45 font-bold font-sans">
                        LAYOUT
                      </span>
                      {layoutUrl && (
                        <button
                          type="button"
                          onClick={() => setLayoutUrl("")}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-extrabold flex items-center gap-1.5 transition-all active:scale-95 shadow-md border border-red-500/20 cursor-pointer animate-fadeIn"
                          title="Remover Layout"
                        >
                          <Trash2 size={12} />
                          REMOVER
                        </button>
                      )}
                    </div>
                    <div className="w-full rounded-xl border border-white/5 bg-black/25 p-4 flex flex-col items-center justify-center relative overflow-hidden group min-h-[220px]">
                      {layoutUrl ? (
                        <div className="w-full flex justify-center items-center py-2 animate-fadeIn">
                          <img
                            src={layoutUrl}
                            alt="Layout"
                            className="w-full max-h-[380px] md:max-h-[580px] object-contain rounded-lg shadow-md"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-6 text-white/20 gap-2">
                          <ImageIcon size={36} className="text-white/10 animate-pulse" />
                          <span className="text-xs font-bold text-white/40 tracking-wider">NENHUM LAYOUT CARREGADO</span>
                          <span className="text-[10.5px] text-white/20 max-w-[280px]">Adicione um link ou faça upload de uma imagem acima para visualizar o layout aqui.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Content Text Typing Panel */}
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest text-white/45 font-bold font-sans">
                        DIGITAÇÃO
                      </span>
                    </div>

                    <div className="w-full rounded-xl border border-white/5 bg-black/15 p-4 focus-within:border-white/12 transition-all flex flex-col min-h-[220px] h-auto">
                      <div
                        ref={(el) => {
                          contentRef.current = el;
                          if (el && el.innerHTML !== content) {
                            el.innerHTML = content;
                          }
                        }}
                        key={editingNote ? editingNote.id : "new-note"}
                        contentEditable
                        onKeyDown={(e) => {
                          if (
                            (e.ctrlKey || e.metaKey) &&
                            !e.shiftKey &&
                            e.key.toLowerCase() === "z"
                          ) {
                            e.preventDefault();
                            performUndo();
                          } else if (
                            ((e.ctrlKey || e.metaKey) &&
                              e.key.toLowerCase() === "y") ||
                          ((e.ctrlKey || e.metaKey) &&
                            e.shiftKey &&
                            e.key.toLowerCase() === "z")
                          ) {
                            e.preventDefault();
                            performRedo();
                          }
                        }}
                        onInput={(e) => {
                          const val = e.currentTarget.innerHTML;
                          setContent(val);
                          pushToHistory(val);
                        }}
                        className="w-full h-auto min-h-[180px] bg-transparent outline-none text-white/95 focus:outline-none relative empty:before:content-[attr(placeholder)] before:text-white/30 before:pointer-events-none before:absolute before:left-0 before:top-0 text-[15.5px] md:text-[16.5px] font-medium leading-relaxed"
                        {...{ placeholder: "Escreva seu texto aqui..." }}
                        style={{ minHeight: "180px" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div
                className="p-4 pb-28 md:pb-5 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 shrink-0 relative z-20"
                style={{
                  borderTop: `1px solid ${color}40`,
                  backgroundColor: "rgba(0,0,0,0.5)",
                }}
              >
                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto flex-1">
                  <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                    {/* Lembrete Data */}
                    <div className="relative flex-1">
                      <GlassDatePicker
                        className="w-full bg-black/40 border border-white/5 rounded-xl text-[15.5px] font-bold text-white/95 pl-10 pr-3.5 py-2.5 outline-none transition-all flex items-center min-h-[46px] select-none"
                        value={reminderDate}
                        onChange={setReminderDate}
                        title="Data do Lembrete"
                        style={{ borderColor: `${color}20` }}
                        themeColor={color}
                      />
                      <Calendar
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                        style={{ color: color }}
                      />
                    </div>

                    {/* Lembrete Horários Alarme (Expansível para Cima) */}
                    {(() => {
                      const activeClocksCount = [reminderTime, reminderTime2, reminderTime3].filter(Boolean).length;
                      const hasActiveClocks = activeClocksCount > 0;
                      return (
                        <div className="relative flex-1 min-w-[120px] sm:min-w-[140px]">
                          <button
                            type="button"
                            onClick={() => setClocksExpanded(!clocksExpanded)}
                            className="w-full bg-black/40 border hover:bg-black/50 rounded-xl text-[15.5px] font-bold text-white/95 px-3.5 py-2.5 outline-none transition-all flex items-center justify-between min-h-[46px]"
                            style={{ 
                              borderColor: clocksExpanded 
                                ? (hasActiveClocks ? '#22c55e' : color) 
                                : (hasActiveClocks ? 'rgba(34, 197, 94, 0.4)' : `${color}20`),
                              boxShadow: hasActiveClocks ? '0 0 10px rgba(34, 197, 94, 0.15)' : 'none'
                            }}
                          >
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <Clock
                                size={16}
                                className={`shrink-0 ${hasActiveClocks ? "text-green-500 animate-pulse" : "text-white/50"}`}
                                style={{ color: hasActiveClocks ? '#22c55e' : color }}
                              />
                              <span className={`truncate ${hasActiveClocks ? "text-green-400 font-bold" : "text-white/80"}`}>
                                Horários
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* numeral count badge */}
                              {hasActiveClocks && (
                                <span 
                                  className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-black"
                                  style={{ 
                                    backgroundColor: '#22c55e', 
                                    color: "#000",
                                    textShadow: "0 1px 0 rgba(255,255,255,0.4)" 
                                  }}
                                >
                                  {activeClocksCount}
                                </span>
                              )}
                              {clocksExpanded ? (
                                <ChevronDown size={14} className="text-white/70" />
                              ) : (
                                <ChevronUp size={14} className="text-white/70 animate-[bounce_2s_infinite]" />
                              )}
                            </div>
                          </button>

                          {/* Expandable Panel (Upward) */}
                          <AnimatePresence>
                            {clocksExpanded && (
                              <motion.div
                                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                                className="absolute bottom-full right-0 mb-3 w-64 bg-[#141517] border border-zinc-800 rounded-2xl p-4 space-y-4 z-[100] shadow-[0_25px_50px_rgba(0,0,0,0.95)] text-left"
                                style={{ borderTopWidth: '3px', borderTopColor: hasActiveClocks ? '#22c55e' : color }}
                              >
                                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                                  <span className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: hasActiveClocks ? '#22c55e' : color }}>
                                    <Clock size={13} className={hasActiveClocks ? "animate-pulse" : ""} />
                                    Configurar Alertas
                                  </span>
                                  <span className="text-[10px] bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 px-2 py-0.5 rounded-md font-black uppercase tracking-widest">
                                    Diário
                                  </span>
                                </div>

                                <div className="space-y-3.5 text-xs text-white">
                                  {/* SLOT 1 */}
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between text-[11px] text-zinc-300 font-extrabold uppercase tracking-wider">
                                      <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: reminderTime ? (hasActiveClocks ? '#22c55e' : color) : '#3f3f46' }} />
                                        Horário 1
                                      </span>
                                      {reminderTime && (
                                        <button
                                          type="button"
                                          onClick={() => setReminderTime("")}
                                          className="text-red-400 hover:text-red-300 font-bold transition-all text-[10px] uppercase tracking-wider bg-red-950/30 px-1.5 py-0.5 rounded border border-red-900/30"
                                        >
                                          Limpar
                                        </button>
                                      )}
                                    </div>
                                    <div className="relative">
                                      <GlassTimePicker
                                        value={reminderTime}
                                        onChange={setReminderTime}
                                        className="w-full appearance-none bg-zinc-900/80 border border-zinc-700/60 hover:border-zinc-500 rounded-xl text-xs text-white pl-9 pr-3 py-2 outline-none focus:border-zinc-400"
                                        title="Definir Horário 1"
                                      />
                                      <Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-450 pointer-events-none" style={{ color: reminderTime ? (hasActiveClocks ? '#22c55e' : color) : '#71717a' }} />
                                    </div>
                                  </div>

                                  {/* SLOT 2 */}
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between text-[11px] text-zinc-300 font-extrabold uppercase tracking-wider">
                                      <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: reminderTime2 ? (hasActiveClocks ? '#22c55e' : color) : '#3f3f46' }} />
                                        Horário 2
                                      </span>
                                      {reminderTime2 && (
                                        <button
                                          type="button"
                                          onClick={() => setReminderTime2("")}
                                          className="text-red-400 hover:text-red-300 font-bold transition-all text-[10px] uppercase tracking-wider bg-red-950/30 px-1.5 py-0.5 rounded border border-red-900/30"
                                        >
                                          Limpar
                                        </button>
                                      )}
                                    </div>
                                    <div className="relative">
                                      <GlassTimePicker
                                        value={reminderTime2}
                                        onChange={setReminderTime2}
                                        className="w-full appearance-none bg-zinc-900/80 border border-zinc-700/60 hover:border-zinc-500 rounded-xl text-xs text-white pl-9 pr-3 py-2 outline-none focus:border-zinc-400"
                                        title="Definir Horário 2"
                                      />
                                      <Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-450 pointer-events-none" style={{ color: reminderTime2 ? (hasActiveClocks ? '#22c55e' : color) : '#71717a' }} />
                                    </div>
                                  </div>

                                  {/* SLOT 3 */}
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between text-[11px] text-zinc-300 font-extrabold uppercase tracking-wider">
                                      <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: reminderTime3 ? (hasActiveClocks ? '#22c55e' : color) : '#3f3f46' }} />
                                        Horário 3
                                      </span>
                                      {reminderTime3 && (
                                        <button
                                          type="button"
                                          onClick={() => setReminderTime3("")}
                                          className="text-red-400 hover:text-red-300 font-bold transition-all text-[10px] uppercase tracking-wider bg-red-950/30 px-1.5 py-0.5 rounded border border-red-900/30"
                                        >
                                          Limpar
                                        </button>
                                      )}
                                    </div>
                                    <div className="relative">
                                      <GlassTimePicker
                                        value={reminderTime3}
                                        onChange={setReminderTime3}
                                        className="w-full appearance-none bg-zinc-900/80 border border-zinc-700/60 hover:border-zinc-500 rounded-xl text-xs text-white pl-9 pr-3 py-2 outline-none focus:border-zinc-400"
                                        title="Definir Horário 3"
                                      />
                                      <Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-450 pointer-events-none" style={{ color: reminderTime3 ? (hasActiveClocks ? '#22c55e' : color) : '#71717a' }} />
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-3 border-t border-zinc-800 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setClocksExpanded(false)}
                                    className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 active:scale-95 rounded-xl text-[10px] font-black text-zinc-200 hover:text-white transition-all uppercase tracking-widest"
                                  >
                                    Fechar
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="w-full md:w-auto">
                  <button
                    onClick={handleSave}
                    className="w-full md:w-auto px-8 py-3 rounded-xl text-base font-extrabold flex items-center justify-center transition-all shadow-xl text-white bg-green-500 hover:bg-green-600 shadow-green-500/25 hover:shadow-green-500/45 md:ml-1"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeleteConfirmId(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1a1b1e] border border-red-500/20 rounded-2xl p-6 relative w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
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
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-white/70 hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleHardDeleteConfirm}
                  className="flex-1 px-4 py-3 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {noteShareData && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setNoteShareData(null)}
          >
            <div
              className="gm-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative z-10 !border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h3 className="text-lg font-bold text-white">
                  Compartilhar Nota
                </h3>
                <button
                  onClick={() => setNoteShareData(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
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
                  className="w-full gm-btn gm-btn-outline !justify-start !pl-4 gap-4 py-4 hover:brightness-110 transition-all"
                >
                  <div className="shrink-0">
                    <WhatsAppIcon
                      size={24}
                      className="text-[var(--gm-primary)]"
                    />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[var(--gm-primary)] leading-tight animate-pulse hover:animate-none">
                      WhatsApp
                    </p>
                    <p className="text-[10px] text-white/60 leading-tight mt-0.5">
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
                  className="w-full gm-btn gm-btn-outline !justify-start !pl-4 gap-4 py-4 hover:brightness-110 transition-all"
                >
                  <div className="shrink-0">
                    <Mail size={24} className="text-[var(--gm-primary)]" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[var(--gm-primary)] leading-tight">
                      E-mail
                    </p>
                    <p className="text-[10px] text-white/60 leading-tight mt-0.5">
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
                  className="w-full gm-btn gm-btn-outline !justify-start !pl-4 gap-4 py-4 hover:brightness-110 transition-all"
                >
                  <div className="shrink-0">
                    <Copy size={24} className="text-[var(--gm-primary)]" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[var(--gm-primary)] leading-tight">
                      Copiar Texto
                    </p>
                    <p className="text-[10px] text-white/60 leading-tight mt-0.5">
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
                    className="w-full gm-btn gm-btn-outline !justify-start !pl-4 gap-4 py-4 hover:brightness-110 transition-all"
                  >
                    <div className="shrink-0">
                      <Share2 size={24} className="text-[var(--gm-primary)]" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-[var(--gm-primary)] leading-tight">
                        Mais Opções
                      </p>
                      <p className="text-[10px] text-white/60 leading-tight mt-0.5">
                        Menu de compartilhamento do sistema
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </Page>
  );
}
