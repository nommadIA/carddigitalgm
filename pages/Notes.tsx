import React, { useState, useEffect, useMemo, useRef } from "react";
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
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [mainTab, setMainTab] = useState<"NOTE" | "PRODUCTION">("NOTE");
  const [noteTab, setNoteTab] = useState<
    "AGUARDANDO" | "APROVADO" | "CONCLUÍDOS" | "CANCELADOS" | "LIXEIRA"
  >("AGUARDANDO");
  const [prodTab, setProdTab] = useState<
    "A FAZER" | "PRODUÇÃO" | "CONCLUÍDOS" | "CANCELADOS" | "LIXEIRA"
  >("A FAZER");
  const [newNoteModalOpen, setNewNoteModalOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Note Form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("#334155"); // default slate-800 format
  const [isPinned, setIsPinned] = useState(false);
  const [reminderTime, setReminderTime] = useState(""); // e.g. "14:30"
  const [reminderDate, setReminderDate] = useState(""); // e.g. "2026-05-20"
  const [noteType, setNoteType] = useState<"note" | "production">("note");
  const [noteStatus, setNoteStatus] = useState("aguardando");
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
        setNotes(data);
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
    setReminderDate("");
    setFontSizeMode("M");
    setNoteType(type);
    setNoteStatus(type === "note" ? "aguardando" : "a fazer");
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
      note.status || (note.type === "production" ? "a fazer" : "aguardando"),
    );
    setDeliveryDate(note.delivery_date || "");
    setDeliveryTime(note.delivery_time || "");
    setResponsibleName(note.responsible_name || "");
    setLayoutUrl(note.layout_url || "");

    if (note.reminder_time && note.reminder_time.includes(" ")) {
      const [rDate, rTime] = note.reminder_time.split(" ");
      setReminderDate(rDate || "");
      setReminderTime(rTime || "");
    } else {
      setReminderDate("");
      setReminderTime(note.reminder_time || "");
    }
    setModalOpen(true);
  }

  async function handleSave() {
    if (!tenantId) return;

    const savedReminder =
      reminderDate && reminderTime
        ? `${reminderDate} ${reminderTime}`
        : reminderTime || null;

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
      if (editingNote) {
        const { data, error } = await supabase
          .from("notes")
          .update(payload)
          .eq("id", editingNote.id)
          .select()
          .single();
        if (error) throw error;
        savedNote = data;
        setNotes((prev) =>
          prev.map((n) => (n.id === editingNote.id ? data : n)),
        );
      } else {
        const { data, error } = await supabase
          .from("notes")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        savedNote = data;
        setNotes((prev) => [data, ...prev]);
      }

      // Update Alarm Schedule if reminder format is valid
      if (savedNote) {
        if (savedNote.reminder_time) {
          const hasDate = savedNote.reminder_time.includes(" ");
          if (hasDate) {
            const [rDate, rTime] = savedNote.reminder_time.split(" ");
            addAlarmsForBudget(
              savedNote.id,
              savedNote.title || "Nota",
              [rTime],
              "NOTE",
              undefined,
              rDate,
            );
          } else if (/^\d{2}:\d{2}$/.test(savedNote.reminder_time)) {
            addAlarmsForBudget(
              savedNote.id,
              savedNote.title || "Nota",
              [savedNote.reminder_time],
              "NOTE",
              undefined,
              null,
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
        let fetchUrl = imageUrl;
        try {
          let res = await fetch(fetchUrl);
          let textSample = "";
          if (res.ok) {
            const peekContent = await res.clone().text();
            textSample = peekContent.slice(0, 100).toLowerCase();
          }
          if (!res.ok || textSample.includes("<html")) {
            let bucket = null;
            if (
              imageUrl.includes("/public/timbrados/") ||
              imageUrl.includes("/authenticated/timbrados/")
            )
              bucket = "timbrados";
            else if (
              imageUrl.includes("/public/tenant-assets/") ||
              imageUrl.includes("/authenticated/tenant-assets/")
            )
              bucket = "tenant-assets";

            if (bucket) {
              const parts = imageUrl.split(`/public/${bucket}/`);
              const signParts = imageUrl.split(`/authenticated/${bucket}/`);
              let path = null;
              if (parts.length > 1) path = parts[1];
              else if (signParts.length > 1) path = signParts[1];

              if (path) {
                // remove query string like ?t=123
                path = path.split("?")[0];
                const { data } = await supabase.storage
                  .from(bucket)
                  .createSignedUrl(path, 60 * 10);
                if (data?.signedUrl) {
                  fetchUrl = data.signedUrl;
                  res = await fetch(fetchUrl);
                }
              }
            }
          }

          const blob = await res.blob();
          return new Promise<{ base64: string; type: string }>(
            (resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = reader.result as string;
                let type = "JPEG";
                if (result.startsWith("data:image/png")) type = "PNG";
                else if (result.startsWith("data:image/webp")) type = "WEBP";
                resolve({ base64: result, type });
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            },
          );
        } catch (e) {
          throw e;
        }
      };

      const renderTimbrado = async () => {
        if (timbradoUrl) {
          try {
            const { base64, type } = await getBase64ImageFormatUrl(timbradoUrl);
            doc.addImage(base64, type, 0, 0, 210, 297);
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

      if (note.layout_url) {
        try {
          const { base64, type } = await getBase64ImageFormatUrl(
            note.layout_url,
          );
          const finalHeight = 70;

          if (currentY + finalHeight > 220) {
            doc.addPage();
            await renderTimbrado();
            currentY = 40;
          }

          doc.addImage(base64, type, 20, currentY, 170, finalHeight);
          currentY += finalHeight + 10;
        } catch (e) {
          console.error("Failed to load layout image for PDF");
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
          n.status || (mainTab === "NOTE" ? "aguardando" : "a fazer"),
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

    return base;
  }, [notes, searchTerm, mainTab, noteTab, prodTab]);

  const NOTE_STATUSES = [
    "AGUARDANDO",
    "APROVADO",
    "CONCLUÍDOS",
    "CANCELADOS",
    "LIXEIRA",
  ] as const;
  const PROD_STATUSES = [
    "A FAZER",
    "PRODUÇÃO",
    "CONCLUÍDOS",
    "CANCELADOS",
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

        {/* Main Tab Separator */}
        <div className="flex items-center gap-2 md:gap-4 bg-white/5 p-1 md:p-2 rounded-2xl w-full md:w-fit self-center md:self-start">
          <button
            onClick={() => setMainTab("NOTE")}
            className={`px-4 py-2 md:px-6 md:py-2.5 rounded-xl font-bold flex-1 md:flex-none transition-all text-sm md:text-base ${mainTab === "NOTE" ? "bg-[var(--gm-primary)] text-white shadow-lg" : "text-white/60 hover:text-white hover:bg-white/5"}`}
          >
            NOTAS
          </button>
          <button
            onClick={() => setMainTab("PRODUCTION")}
            className={`px-4 py-2 md:px-6 md:py-2.5 rounded-xl font-bold flex-1 md:flex-none transition-all text-sm md:text-base ${mainTab === "PRODUCTION" ? "bg-[var(--gm-primary)] text-white shadow-lg" : "text-white/60 hover:text-white hover:bg-white/5"}`}
          >
            NOTAS DE PRODUÇÃO
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
              const noteColor = note.color || "#334155";

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
                    className={`rounded-3xl p-6 relative gap-3 flex flex-col transition-all cursor-pointer group hover:scale-[1.02] h-full ${isExpanded ? "overflow-y-auto custom-scroll max-h-[60vh] md:max-h-[80vh]" : "overflow-hidden min-h-[280px]"}`}
                    style={{
                      backgroundColor: "rgba(17, 19, 24, 0.7)",
                      backdropFilter: "blur(12px)",
                      borderColor: noteColor,
                      borderWidth: "1px",
                      borderStyle: "solid",
                      boxShadow: `0 0 20px ${noteColor}40, inset 0 0 20px ${noteColor}20`,
                    }}
                  >
                    {/* Pin Toggle */}
                    <button
                      onClick={(e) => togglePin(note, e)}
                      className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-10"
                      style={{
                        color: note.is_pinned
                          ? noteColor
                          : "rgba(255, 255, 255, 0.5)",
                      }}
                    >
                      {note.is_pinned ? (
                        <Pin size={20} fill={noteColor} />
                      ) : (
                        <PinOff size={20} />
                      )}
                    </button>

                    {/* Title */}
                    <div className="flex flex-col gap-1 pr-8">
                      {note.status && (
                        <div className="flex items-center">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                            style={{
                              backgroundColor: `${noteColor}20`,
                              color: noteColor,
                              border: `1px solid ${noteColor}40`,
                            }}
                          >
                            {note.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      )}
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
                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/10 opacity-60 group-hover:opacity-100 transition-opacity relative z-10">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/50 uppercase tracking-widest font-mono">
                          {new Date(note.created_at).toLocaleDateString()}
                        </span>
                        {note.reminder_time &&
                          (() => {
                            const hasSpace = note.reminder_time.includes(" ");
                            let displayStr = note.reminder_time;
                            if (hasSpace) {
                              const [rDate, rTime] =
                                note.reminder_time.split(" ");
                              if (rDate && rTime) {
                                const [y, m, d] = rDate.split("-");
                                displayStr = `${d}/${m}/${y} @ ${rTime}`;
                              }
                            } else {
                              displayStr = `Diário @ ${note.reminder_time}`;
                            }
                            return (
                              <span
                                className="text-[10px] uppercase flex items-center gap-1 font-bold tracking-widest mt-0.5"
                                title={
                                  hasSpace
                                    ? "Lembrete Único"
                                    : "Lembrete Diário"
                                }
                                style={{ color: noteColor }}
                              >
                                {hasSpace ? (
                                  <Calendar
                                    size={11}
                                    className="animate-pulse"
                                    style={{ color: noteColor }}
                                  />
                                ) : (
                                  <Clock
                                    size={11}
                                    className="animate-pulse"
                                    style={{ color: noteColor }}
                                  />
                                )}
                                {displayStr}
                              </span>
                            );
                          })()}
                      </div>

                      <div className="flex items-center gap-2">
                        {(mainTab === "NOTE" ? noteTab : prodTab) ===
                        "LIXEIRA" ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestore(note.id);
                              }}
                              className="text-green-400 hover:text-green-300 p-2 bg-green-500/10 rounded-xl transition-all hover:scale-110 hover:bg-green-500/20 z-20 relative pointer-events-auto"
                              title="Restaurar"
                            >
                              <RefreshCcw size={18} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(note.id);
                              }}
                              className="text-red-500 hover:text-red-400 p-2 bg-red-500/10 rounded-xl transition-all hover:scale-110 hover:bg-red-500/20 z-20 relative pointer-events-auto"
                              title="Excluir Definitivamente"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareClick(note);
                              }}
                              className="p-2 rounded-xl transition-all hover:scale-110 z-20 relative pointer-events-auto text-[var(--gm-accent)]"
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
                              <Share2 size={18} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePdf(note);
                              }}
                              className="p-2 rounded-xl transition-all hover:scale-110 z-20 relative pointer-events-auto text-[var(--gm-accent)]"
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
                              {/* Lucide FileDown icon logic since it might not be imported directly, reusing another or importing. Let's use Download or similar if needed. We have Mail, Copy, AlertTriangle. Let's just use text or download icon. Wait, I will use Copy. No, I'll add a simple SVG. */}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
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
                              className="p-2 rounded-xl transition-all hover:scale-110 z-20 relative pointer-events-auto text-[var(--gm-accent)]"
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
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
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
              className="relative w-full h-[100dvh] md:h-auto md:max-w-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
              style={{
                maxHeight: window.innerWidth < 768 ? "100dvh" : "90vh",
                backgroundColor: "rgba(17, 19, 24, 0.95)",
                backdropFilter: "blur(16px)",
                borderColor: color || "#334155",
                borderWidth: window.innerWidth < 768 ? "0px" : "1px",
                borderTopWidth: window.innerWidth < 768 ? "2px" : "1px",
                borderStyle: "solid",
                boxShadow: `0 0 40px ${color}50, inset 0 0 30px ${color}20`,
              }}
            >
              <div
                className="p-4 flex items-center justify-between shrink-0"
                style={{
                  borderBottom: `1px solid ${color}40`,
                  backgroundColor: `${color}10`,
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
                className="flex flex-col gap-3 px-6 py-3 bg-black/45 border-b border-white/5 select-none shrink-0"
                style={{ borderColor: `${color}30` }}
              >
                <div className="flex w-full items-center gap-2">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyBold();
                    }}
                    className="flex-1 py-2 px-3 rounded-xl hover:bg-white/15 text-white font-black text-sm transition-all hover:scale-105 active:scale-95 bg-white/5 text-center flex items-center justify-center min-h-[36px]"
                    title="Negrito"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyItalic();
                    }}
                    className="flex-1 py-2 px-3 rounded-xl hover:bg-white/15 text-white italic font-serif text-sm transition-all hover:scale-105 active:scale-95 bg-white/5 text-center flex items-center justify-center min-h-[36px]"
                    title="Itálico"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyStyleToSelection({
                        "font-family": "'Caveat', cursive",
                      });
                    }}
                    className="py-2 px-3 rounded-xl hover:bg-white/15 text-white text-xs transition-all tracking-wide hover:scale-105 active:scale-95 bg-white/5 font-semibold text-center flex items-center justify-center min-h-[36px]"
                    style={{ fontFamily: "Caveat, cursive", flex: 1.4 }}
                    title="Cursiva"
                  >
                    Cursiva
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      cycleFontSize();
                    }}
                    className="py-2 px-3 rounded-xl hover:bg-white/15 text-white text-xs transition-all tracking-wide hover:scale-105 active:scale-95 bg-white/5 font-semibold flex items-center justify-center gap-1 min-h-[36px]"
                    style={{ flex: 1.4 }}
                    title="Alternar Tamanho (Pequeno, Médio, Grande)"
                  >
                    <span className="text-white/60 text-xs">Aa</span>
                    <span className="font-bold text-[9px] bg-white/10 px-1.5 py-0.5 rounded uppercase text-white/90">
                      {fontSizeMode === "P"
                        ? "Peq"
                        : fontSizeMode === "M"
                          ? "Méd"
                          : "Grd"}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                  <span className="text-xs uppercase text-white/50 font-semibold tracking-wider font-sans mr-1 shrink-0">
                    Cores:
                  </span>
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
                          setSelectedTextColor(hex);
                          applyStyleToSelection({ color: hex });
                        }}
                        className={`rounded-full border-2 border-solid transition-all duration-300 shrink-0 ${
                          isActive
                            ? "w-[22px] h-[22px] border-white z-10 opacity-100"
                            : "w-[18px] h-[18px] border-white/20 hover:scale-105 hover:border-white/50 opacity-40 hover:opacity-90 hover:filter-none"
                        }`}
                        style={{
                          backgroundColor: hex,
                          filter: isActive ? "none" : "blur(0.8px)",
                          boxShadow: isActive
                            ? "inset 0 0 4px rgba(255,255,255,0.6)"
                            : "none",
                        }}
                        title={`Cor ${hex}`}
                      />
                    );
                  })}
                </div>
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
                <div className="p-4 md:px-6 py-4 border-b border-white/5 bg-black/20 flex flex-wrap gap-4 shrink-0">
                  <div className="flex flex-col gap-1 w-[100%] sm:w-auto flex-1 md:flex-none">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                      Tipo da Nota
                    </label>
                    <div className="relative">
                      <select
                        value={noteType}
                        onChange={(e) => {
                          setNoteType(e.target.value as any);
                          setNoteStatus(
                            e.target.value === "note"
                              ? "aguardando"
                              : "a fazer",
                          );
                        }}
                        className="w-full appearance-none bg-black/40 border border-white/10 rounded-lg text-sm text-white px-3 py-2.5 pr-10 outline-none focus:border-white/30 cursor-pointer"
                      >
                        <option value="note">Geral (Nota)</option>
                        <option value="production">Produção</option>
                      </select>
                      <ChevronDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                        size={16}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 w-[100%] sm:w-auto flex-1 md:flex-none">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                      Status
                    </label>
                    <div className="relative">
                      <select
                        value={noteStatus}
                        onChange={(e) => setNoteStatus(e.target.value)}
                        className="w-full appearance-none bg-black/40 border border-white/10 rounded-lg text-sm text-white px-3 py-2.5 pr-10 outline-none focus:border-white/30 cursor-pointer"
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

                  <div className="flex flex-col gap-1 w-full sm:w-auto">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                      Prazo de Entrega
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1 min-w-[140px]">
                        <GlassDatePicker
                          value={deliveryDate}
                          onChange={setDeliveryDate}
                          className="w-full appearance-none bg-black/40 border border-white/10 rounded-lg text-sm text-white pl-10 pr-3 py-2.5 outline-none focus:border-white/30 select-none"
                          title="Prazo"
                        />
                        <Calendar
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                          size={16}
                        />
                      </div>
                      <div className="relative flex-1 min-w-[100px]">
                        <GlassTimePicker
                          value={deliveryTime}
                          onChange={setDeliveryTime}
                          className="w-full appearance-none bg-black/40 border border-white/10 rounded-lg text-sm text-white pl-10 pr-3 py-2.5 outline-none focus:border-white/30"
                        />
                        <Clock
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                          size={16}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 w-full sm:flex-1">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                      Responsável
                    </label>
                    <input
                      type="text"
                      placeholder="Nome do responsável"
                      value={responsibleName}
                      onChange={(e) => setResponsibleName(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-lg text-sm text-white px-3 py-2.5 outline-none focus:border-white/30 w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1 w-full sm:w-auto">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                      Layout
                    </label>
                    <div className="flex items-center gap-2 w-full">
                      <label
                        className={`bg-black/40 border border-white/10 rounded-lg text-sm text-white px-3 py-2.5 outline-none hover:bg-white/5 cursor-pointer flex items-center w-full justify-center gap-2 h-auto transition-all ${uploadingLayout ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        {uploadingLayout ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <ImageIcon size={16} />
                        )}
                        {uploadingLayout ? "Enviando..." : "Enviar Mídia"}
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
                </div>

                {/* Content Editor */}
                <div className="p-6 flex flex-col gap-4 relative flex-1 touch-pan-y">
                  {layoutUrl && (
                    <div
                      className="w-full relative group rounded-2xl overflow-hidden border border-white/10 shrink-0 shadow-xl"
                      style={{ backgroundColor: "transparent" }}
                    >
                      <img
                        src={layoutUrl}
                        alt="Layout"
                        className="w-full h-auto max-h-[600px] object-cover"
                      />
                      <button
                        onClick={() => setLayoutUrl("")}
                        className="absolute top-4 right-4 bg-black/60 hover:bg-red-500/80 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all text-white backdrop-blur-md"
                        title="Remover Layout"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
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
                    className="w-full h-full min-h-[150px] md:min-h-[300px] bg-transparent outline-none text-white/90 focus:outline-none relative empty:before:content-[attr(placeholder)] before:text-white/30 before:pointer-events-none before:absolute before:left-0 before:top-0"
                    {...{ placeholder: "Escreva sua nota aqui..." }}
                    style={{ minHeight: "150px" }}
                  />
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
                {/* Colors */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide w-full md:max-w-[50%] p-2">
                  {COLORS.map((c) => {
                    const isActive = color === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`rounded-full border-2 border-solid transition-all duration-300 shrink-0 flex-none ${
                          isActive
                            ? "w-[22px] h-[22px] border-white z-10 opacity-100"
                            : "w-[18px] h-[18px] border-white/20 hover:scale-105 hover:border-white/50 opacity-40 hover:opacity-90 hover:filter-none"
                        }`}
                        style={{
                          backgroundColor: c,
                          filter: isActive ? "none" : "blur(0.8px)",
                          boxShadow: isActive
                            ? "inset 0 0 4px rgba(255,255,255,0.6)"
                            : "none",
                        }}
                      />
                    );
                  })}
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto shrink-0 justify-end">
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    {/* Lembrete Data */}
                    <div className="relative flex-1">
                      <GlassDatePicker
                        className="w-full bg-black/40 border border-white/5 rounded-xl text-xs sm:text-sm text-white/80 pl-9 pr-3 py-2.5 outline-none transition-all flex items-center min-h-[42px] select-none"
                        value={reminderDate}
                        onChange={setReminderDate}
                        title="Data do Lembrete"
                        style={{ borderColor: `${color}20` }}
                      />
                      <Calendar
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                        style={{ color: color }}
                      />
                    </div>

                    {/* Lembrete Hora */}
                    <div className="relative flex-1">
                      <GlassTimePicker
                        className="w-full bg-black/40 border border-white/5 rounded-xl text-xs sm:text-sm text-white/80 pl-9 pr-3 py-2.5 outline-none transition-all flex items-center min-h-[42px]"
                        value={reminderTime}
                        onChange={setReminderTime}
                        title="Hora do Lembrete"
                        style={{ borderColor: `${color}20` }}
                      />
                      <Clock
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                        style={{ color: color }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    className="w-full md:w-auto px-6 py-2.5 rounded-xl font-bold flex items-center justify-center transition-all shadow-lg text-white bg-green-500 hover:bg-green-600 shadow-green-500/20 hover:shadow-green-500/40 transform hover:-translate-y-0.5 md:ml-1"
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
                  className="w-full gm-btn gm-btn-outline !justify-start !pl-4 gap-4 py-4 hover:brightness-110 active:scale-98 transition-all"
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
                  className="w-full gm-btn gm-btn-outline !justify-start !pl-4 gap-4 py-4 hover:brightness-110 active:scale-98 transition-all"
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
                  className="w-full gm-btn gm-btn-outline !justify-start !pl-4 gap-4 py-4 hover:brightness-110 active:scale-98 transition-all"
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
                    className="w-full gm-btn gm-btn-outline !justify-start !pl-4 gap-4 py-4 hover:brightness-110 active:scale-98 transition-all"
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
