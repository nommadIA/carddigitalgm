import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/AuthContext';
import { Page } from "../components/ui/Page";
import { Grid } from "../components/ui/Grid";
import { Card } from "../components/ui/Card";
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Pin, PinOff, Trash2, Edit2, X, Save, Clock, GripHorizontal, Palette, Share2, CornerRightDown, RefreshCcw, ChevronDown, ChevronUp, AlertTriangle, Copy, Mail, Calendar } from 'lucide-react';
import { Note } from '../types';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { WhatsAppIcon } from '../components/ui/WhatsAppIcon';
import { addAlarmsForBudget, toggleAlarmsForBudget, checkAlarms, removeAlarmsForBudget } from '../lib/alarmSystem';

function htmlToPlainFormatedText(html: string): string {
  if (!html) return '';

  if (typeof document === 'undefined') {
    // Fallback if not inside a browser
    let text = html.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/div>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<[^>]+>/g, '');
    return text.trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  function convertNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toUpperCase();

      if (tagName === 'BR') {
        return '\n';
      }

      let isBold = ['B', 'STRONG'].includes(tagName);
      let isItalic = ['I', 'EM'].includes(tagName);

      const style = el.getAttribute('style') || '';
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

      let innerText = '';
      el.childNodes.forEach(child => {
        innerText += convertNode(child);
      });

      // If it's a block-level HTML element, make sure it has proper flow
      const isBlock = ['DIV', 'P'].includes(tagName);
      if (isBlock) {
        if (innerText && !innerText.endsWith('\n')) {
          innerText += '\n';
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

    return '';
  }

  let finalTxt = '';
  body.childNodes.forEach(child => {
    finalTxt += convertNode(child);
  });

  return finalTxt.trim();
}

export default function Notes() {
  const { tenantId, user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState<'ATIVAS' | 'LIXEIRA'>('ATIVAS');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  
  // Note Form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#334155'); // default slate-800 format
  const [isPinned, setIsPinned] = useState(false);
  const [reminderTime, setReminderTime] = useState(''); // e.g. "14:30"
  const [reminderDate, setReminderDate] = useState(''); // e.g. "2026-05-20"
  const [noteShareData, setNoteShareData] = useState<{ note: Note; message: string } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [selectedTextColor, setSelectedTextColor] = useState('#ffffff');
  const [fontSizeMode, setFontSizeMode] = useState<'P' | 'M' | 'G'>('M');

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
      setSelectedTextColor('#ffffff'); 
    }
  }, [modalOpen]);
  
  const COLORS = [
    '#334155', // Slate
    '#ff003c', // Red Neon
    '#ff6600', // Orange Neon
    '#00ff66', // Green Neon
    '#00e5ff', // Cyan Neon
    '#b400ff', // Violet Neon
    '#ff00a0'  // Pink Neon
  ];

  useEffect(() => {
    if (tenantId) loadNotes();
  }, [tenantId]);

  async function loadNotes() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error && error.code === '42P01') {
        // Table doesn't exist yet, mock it for now since user needs to run the setup script
        console.warn('Notes table does not exist yet. Please run the SQL setup script.');
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
    const shouldPush = force || (now - lastPushTimeRef.current > 1500) || diff > 5;

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
    if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined") {
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
    if (contentRef.current && !contentRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    if (range.collapsed) {
      // If no selection, insert styled span and place cursor inside
      const span = document.createElement('span');
      Object.entries(styles).forEach(([styleName, styleValue]) => {
        span.style.setProperty(styleName, styleValue);
      });
      span.innerHTML = '&#8203;'; // zero-width space
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
            if (styleName === 'color' && element.tagName === 'FONT') {
              element.removeAttribute('color');
            }
          });
        }
        node.childNodes.forEach(cleanNodeStyles);
      };
      
      cleanNodeStyles(fragment);

      // Create new wrapping span
      const span = document.createElement('span');
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
    document.execCommand('bold', false);
    if (contentRef.current) {
      const val = contentRef.current.innerHTML;
      setContent(val);
      pushToHistory(val, true);
    }
  };

  const applyItalic = () => {
    document.execCommand('italic', false);
    if (contentRef.current) {
      const val = contentRef.current.innerHTML;
      setContent(val);
      pushToHistory(val, true);
    }
  };

  const cycleFontSize = () => {
    let nextSize: 'P' | 'M' | 'G' = 'M';
    let sizeValue = '16px';
    
    if (fontSizeMode === 'M') {
      nextSize = 'G';
      sizeValue = '22px';
    } else if (fontSizeMode === 'G') {
      nextSize = 'P';
      sizeValue = '12px';
    } else {
      nextSize = 'M';
      sizeValue = '16px';
    }
    
    setFontSizeMode(nextSize);
    applyStyleToSelection({ 'font-size': sizeValue });
  };

  function openNewNote() {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setColor(COLORS[0]);
    setIsPinned(false);
    setReminderTime('');
    setReminderDate('');
    setFontSizeMode('M');
    setModalOpen(true);
  }

  function openEdit(note: Note) {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color || COLORS[0]);
    setIsPinned(note.is_pinned);
    setFontSizeMode('M');
    
    if (note.reminder_time && note.reminder_time.includes(' ')) {
      const [rDate, rTime] = note.reminder_time.split(' ');
      setReminderDate(rDate || '');
      setReminderTime(rTime || '');
    } else {
      setReminderDate('');
      setReminderTime(note.reminder_time || '');
    }
    setModalOpen(true);
  }

  async function handleSave() {
    if (!tenantId) return;

    const savedReminder = reminderDate && reminderTime 
      ? `${reminderDate} ${reminderTime}` 
      : (reminderTime || null);

    const payload = {
      tenant_id: tenantId,
      title,
      content,
      color,
      is_pinned: isPinned,
      reminder_time: savedReminder,
      updated_at: new Date().toISOString()
    };

    let savedNote: Note | null = null;
    
    try {
      if (editingNote) {
        const { data, error } = await supabase
          .from('notes')
          .update(payload)
          .eq('id', editingNote.id)
          .select()
          .single();
        if (error) throw error;
        savedNote = data;
        setNotes(prev => prev.map(n => n.id === editingNote.id ? data : n));
      } else {
        const { data, error } = await supabase
          .from('notes')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        savedNote = data;
        setNotes(prev => [data, ...prev]);
      }
      
      // Update Alarm Schedule if reminder format is valid
      if (savedNote) {
         if (savedNote.reminder_time) {
            const hasDate = savedNote.reminder_time.includes(' ');
            if (hasDate) {
              const [rDate, rTime] = savedNote.reminder_time.split(' ');
              addAlarmsForBudget(savedNote.id, savedNote.title || 'Nota', [rTime], 'NOTE', undefined, rDate);
            } else if (/^\d{2}:\d{2}$/.test(savedNote.reminder_time)) {
              addAlarmsForBudget(savedNote.id, savedNote.title || 'Nota', [savedNote.reminder_time], 'NOTE', undefined, null);
            } else {
              removeAlarmsForBudget(savedNote.id);
            }
         } else {
            removeAlarmsForBudget(savedNote.id);
         }
      }
    } catch (e: any) {
      alert("Falha ao salvar a nota. Verifique se as permissões/tabelas no Supabase foram criadas.\n\n" + e.message);
    }

    setModalOpen(false);
  }

  async function togglePin(note: Note, e: React.MouseEvent) {
    e.stopPropagation();
    const next = !note.is_pinned;
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, is_pinned: next } : n));
    try {
      await supabase.from('notes').update({ is_pinned: next }).eq('id', note.id);
    } catch(e) {}
  }

  function toggleExpand(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSoftDelete(id: string) {
    const now = new Date().toISOString();
    setNotes(prev => prev.map(n => n.id === id ? { ...n, deleted_at: now } : n));
    removeAlarmsForBudget(id);
    try {
      await supabase.from('notes').update({ deleted_at: now }).eq('id', id);
    } catch(e) {}
  }

  async function handleRestore(id: string) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, deleted_at: null } : n));
    try {
      await supabase.from('notes').update({ deleted_at: null }).eq('id', id);
    } catch(e) {}
  }

  function handleShareClick(note: Note) {
    const titleText = note.title || 'Sem título';
    const contentText = note.content || '';
    const message = `*${titleText}*\n\n${contentText}`;
    setNoteShareData({ note, message });
  }

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  async function handleHardDeleteConfirm() {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setNotes(prev => prev.filter(n => n.id !== id));
    try {
      await supabase.from('notes').delete().eq('id', id);
    } catch(e) {}
    setDeleteConfirmId(null);
  }

  const filteredNotes = useMemo(() => {
    const isTrash = tab === 'LIXEIRA';
    let base = notes.filter(n => isTrash ? !!n.deleted_at : !n.deleted_at);
    
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      base = base.filter(n => 
        (n.title && n.title.toLowerCase().includes(q)) || 
        (n.content && n.content.toLowerCase().includes(q))
      );
    }

    // Sort by pinned
    base.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return base;
  }, [notes, searchTerm, tab]);

  return (
    <Page title="Notes" className="animate-fade-in relative min-h-screen">
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:max-w-md gm-btn !p-0 !cursor-text hover:!scale-100 active:!scale-100 !transform-none !justify-start h-14 rounded-2xl overflow-hidden shadow-lg border-2 border-transparent focus-within:border-[var(--gm-primary)] transition-colors">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 z-10 pointer-events-none" size={20} />
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

        <div className="flex items-center gap-2 border-b border-white/5 pb-2 overflow-x-auto scrollbar-hide">
          {['ATIVAS', 'LIXEIRA'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={`px-4 py-2 font-bold text-sm rounded-xl transition-all whitespace-nowrap ${tab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
            >
              {t === 'ATIVAS' ? 'Notas Ativas' : 'Lixeira'}
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
              const isLong = (note.content?.length || 0) > 200 || (note.content?.split('\n').length || 0) > 4;
              const noteColor = note.color || '#334155';

              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                  className="col-span-1"
                  onClick={() => openEdit(note)}
                >
                  <div 
                    className={`rounded-3xl p-6 relative gap-4 flex flex-col transition-all cursor-pointer group hover:scale-[1.02] ${isExpanded ? '' : 'h-[280px]'}`}
                    style={{ 
                      backgroundColor: 'rgba(17, 19, 24, 0.7)',
                      backdropFilter: 'blur(12px)',
                      borderColor: noteColor,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      boxShadow: `0 0 20px ${noteColor}40, inset 0 0 20px ${noteColor}20`
                    }}
                  >
                    {/* Pin Toggle */}
                    <button 
                      onClick={(e) => togglePin(note, e)}
                      className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-10"
                      style={{ color: note.is_pinned ? noteColor : 'rgba(255, 255, 255, 0.5)' }}
                    >
                      {note.is_pinned ? <Pin size={20} fill={noteColor} /> : <PinOff size={20} />}
                    </button>
                    
                    {/* Title */}
                    <h3 className="font-bold text-lg text-white mb-1 pr-8 leading-tight">
                      {note.title || 'Sem título'}
                    </h3>

                    {/* Body Preview */}
                    <div className={`text-white/70 text-sm overflow-hidden flex-1 relative ${isExpanded ? '' : 'max-h-[140px]'}`}>
                      <div 
                        className={`markdown-body text-sm leading-relaxed ${isExpanded ? '' : 'line-clamp-4'}`}
                        dangerouslySetInnerHTML={{ __html: note.content || '...' }}
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
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    )}

                    {/* Footer: Reminder + Actions */}
                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/10 opacity-60 group-hover:opacity-100 transition-opacity relative z-10">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/50 uppercase tracking-widest font-mono">
                          {new Date(note.created_at).toLocaleDateString()}
                        </span>
                        {note.reminder_time && (() => {
                          const hasSpace = note.reminder_time.includes(' ');
                          let displayStr = note.reminder_time;
                          if (hasSpace) {
                            const [rDate, rTime] = note.reminder_time.split(' ');
                            if (rDate && rTime) {
                              const [y, m, d] = rDate.split('-');
                              displayStr = `${d}/${m}/${y} @ ${rTime}`;
                            }
                          } else {
                            displayStr = `Diário @ ${note.reminder_time}`;
                          }
                          return (
                            <span 
                              className="text-[10px] uppercase flex items-center gap-1 font-bold tracking-widest mt-0.5" 
                              title={hasSpace ? "Lembrete Único" : "Lembrete Diário"}
                              style={{ color: noteColor }}
                            >
                              {hasSpace ? (
                                <Calendar size={11} className="animate-pulse" style={{ color: noteColor }} />
                              ) : (
                                <Clock size={11} className="animate-pulse" style={{ color: noteColor }} />
                              )}
                              {displayStr}
                            </span>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-2">
                        {tab === 'LIXEIRA' ? (
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

      {/* Editor Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />
            
            <motion.div 
              initial={{ y: '100%', opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '100%', opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden"
              style={{ 
                maxHeight: '90vh',
                backgroundColor: 'rgba(17, 19, 24, 0.9)',
                backdropFilter: 'blur(16px)',
                borderColor: color || '#334155',
                borderWidth: '1px',
                borderStyle: 'solid',
                boxShadow: `0 0 40px ${color}50, inset 0 0 30px ${color}20`
              }}
            >
               <div className="p-4 flex items-center justify-between shrink-0"
                 style={{ borderBottom: `1px solid ${color}40`, backgroundColor: `${color}10` }}
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
                        backgroundColor: isPinned ? `${color}30` : 'transparent',
                        color: isPinned ? color : 'rgba(255, 255, 255, 0.4)'
                      }}
                    >
                      <Pin size={18} fill={isPinned ? color : "none"} />
                    </button>
                    <button onClick={() => setModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-white/40">
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Text Formatting Toolbar */}
                <div className="flex flex-wrap items-center gap-3 px-6 py-3 bg-black/45 border-b border-white/5 select-none shrink-0" style={{ borderColor: `${color}30` }}>
                  <div className="flex items-center gap-2 border-r border-white/10 pr-3">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyBold();
                      }}
                      className="p-2 px-4 rounded-xl hover:bg-white/15 text-white font-black text-sm transition-all hover:scale-105 active:scale-95 bg-white/5"
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
                      className="p-2 px-4 rounded-xl hover:bg-white/15 text-white italic font-serif text-sm transition-all hover:scale-105 active:scale-95 bg-white/5"
                      title="Itálico"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyStyleToSelection({
                          'font-family': "'Caveat', cursive"
                        });
                      }}
                      className="p-2 px-4 rounded-xl hover:bg-white/15 text-white text-sm transition-all tracking-wide hover:scale-105 active:scale-95 bg-white/5 font-semibold"
                      style={{ fontFamily: 'Caveat, cursive' }}
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
                      className="p-2 px-4 rounded-xl hover:bg-white/15 text-white text-sm transition-all tracking-wide hover:scale-105 active:scale-95 bg-white/5 font-semibold flex items-center gap-1.5"
                      title="Alternar Tamanho (Pequeno, Médio, Grande)"
                    >
                      <span className="text-white/60 text-xs">Aa</span>
                      <span className="font-bold text-[10px] bg-white/10 px-1.5 py-0.5 rounded uppercase text-white/90">
                        {fontSizeMode === 'P' ? 'Peq' : fontSizeMode === 'M' ? 'Méd' : 'Grd'}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                    <span className="text-xs uppercase text-white/50 font-semibold tracking-wider font-sans mr-1 shrink-0">Cores:</span>
                    {[
                      '#ffffff', // White
                      '#ff003c', // Red
                      '#ff6600', // Orange
                      '#ffff00', // Yellow
                      '#00ff66', // Green
                      '#00e5ff', // Cyan
                      '#b400ff', // Violet
                      '#ff00a0'  // Pink
                    ].map(hex => {
                      const isActive = selectedTextColor === hex;
                      return (
                        <button
                          key={hex}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedTextColor(hex);
                            applyStyleToSelection({ 'color': hex });
                          }}
                          className={`rounded-full border-2 border-solid transition-all duration-300 shrink-0 ${
                            isActive 
                              ? 'w-[22px] h-[22px] border-white z-10 opacity-100' 
                              : 'w-[18px] h-[18px] border-white/20 hover:scale-105 hover:border-white/50 opacity-40 hover:opacity-90 hover:filter-none'
                          }`}
                          style={{ 
                            backgroundColor: hex, 
                            filter: isActive ? 'none' : 'blur(0.8px)',
                            boxShadow: isActive ? 'inset 0 0 4px rgba(255,255,255,0.6)' : 'none'
                          }}
                          title={`Cor ${hex}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Content Editor */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide relative" 
                  style={{ 
                    backgroundColor: 'transparent',
                    boxShadow: `inset 0 0 40px ${color}15`
                  }}
                >
                   <div
                     ref={(el) => {
                       contentRef.current = el;
                       if (el && el.innerHTML !== content) {
                         el.innerHTML = content;
                       }
                     }}
                     key={editingNote ? editingNote.id : 'new-note'}
                     contentEditable
                     onKeyDown={(e) => {
                       // Custom Undo/Redo key interception for contentEditable to keep state perfectly synchronized
                       if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
                         e.preventDefault();
                         performUndo();
                       } else if (
                         ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
                         ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
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
                     className="w-full h-full min-h-[300px] bg-transparent outline-none text-white/90 focus:outline-none relative empty:before:content-[attr(placeholder)] before:text-white/30 before:pointer-events-none before:absolute before:left-0 before:top-0"
                     {...{ placeholder: "Escreva sua nota aqui..." }}
                     style={{ minHeight: '300px' }}
                   />
                </div>

                {/* Action Bar */}
                <div className="p-5 flex flex-col md:flex-row items-center justify-between gap-6 shrink-0 relative z-20"
                  style={{ 
                    borderTop: `1px solid ${color}40`,
                    backgroundColor: 'rgba(0,0,0,0.5)'
                  }}
                >
                  {/* Colors */}
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide w-full md:max-w-[50%] p-2">
                    {COLORS.map(c => {
                      const isActive = color === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`rounded-full border-2 border-solid transition-all duration-300 shrink-0 flex-none ${
                            isActive 
                              ? 'w-[22px] h-[22px] border-white z-10 opacity-100' 
                              : 'w-[18px] h-[18px] border-white/20 hover:scale-105 hover:border-white/50 opacity-40 hover:opacity-90 hover:filter-none'
                          }`}
                          style={{ 
                            backgroundColor: c,
                            filter: isActive ? 'none' : 'blur(0.8px)',
                            boxShadow: isActive ? 'inset 0 0 4px rgba(255,255,255,0.6)' : 'none'
                          }}
                        />
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 justify-end">
                    {/* Lembrete Data */}
                    <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/5" style={{ borderColor: `${color}20` }}>
                      <Calendar 
                        size={15} 
                        className="ml-1 transition-all animate-none" 
                        style={{ 
                          color: color
                        }} 
                      />
                      <input 
                        type="date" 
                        className="bg-transparent text-white/80 outline-none text-xs font-mono border-none [color-scheme:dark] shrink-0"
                        value={reminderDate}
                        onChange={(e) => setReminderDate(e.target.value)}
                        title="Data do Lembrete"
                      />
                    </div>

                    {/* Lembrete Hora */}
                    <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/5" style={{ borderColor: `${color}20` }}>
                      <Clock 
                        size={15} 
                        className="ml-1 transition-all animate-none" 
                        style={{ 
                          color: color
                        }} 
                      />
                      <input 
                        type="time" 
                        className="bg-transparent text-white/80 outline-none text-xs font-mono border-none [color-scheme:dark] shrink-0"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        title="Hora do Lembrete"
                      />
                    </div>

                    <button 
                      onClick={handleSave}
                      className="px-6 py-2.5 rounded-xl font-bold flex items-center justify-center transition-all shadow-lg text-white bg-green-500 hover:bg-green-600 shadow-green-500/20 hover:shadow-green-500/40 transform hover:-translate-y-0.5 ml-2"
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
                  <h3 className="text-xl font-bold text-white">Excluir Definitivamente?</h3>
                  <p className="text-white/60 text-sm mt-1">
                    Esta ação não pode ser desfeita. A nota será removida permanentemente do sistema.
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
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setNoteShareData(null)}>
            <div className="gm-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative z-10 !border-white/10" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h3 className="text-lg font-bold text-white">Compartilhar Nota</h3>
                <button onClick={() => setNoteShareData(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-3">
                <button 
                  onClick={() => {
                    const cleanMessage = htmlToPlainFormatedText(noteShareData.message);
                    window.open(`https://wa.me/?text=${encodeURIComponent(cleanMessage)}`, "_blank");
                    setNoteShareData(null);
                  }}
                  className="w-full gm-btn gm-btn-outline !justify-start !pl-4 gap-4 py-4 hover:brightness-110 active:scale-98 transition-all"
                >
                  <div className="shrink-0">
                    <WhatsAppIcon size={24} className="text-[var(--gm-primary)]" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[var(--gm-primary)] leading-tight animate-pulse hover:animate-none">WhatsApp</p>
                    <p className="text-[10px] text-white/60 leading-tight mt-0.5">Enviar diretamente para um contato</p>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    const cleanMessage = htmlToPlainFormatedText(noteShareData.message);
                    const subject = encodeURIComponent(noteShareData.note.title || 'Nota');
                    window.open(`mailto:?subject=${subject}&body=${encodeURIComponent(cleanMessage)}`, "_blank");
                    setNoteShareData(null);
                  }}
                  className="w-full gm-btn gm-btn-outline !justify-start !pl-4 gap-4 py-4 hover:brightness-110 active:scale-98 transition-all"
                >
                  <div className="shrink-0">
                    <Mail size={24} className="text-[var(--gm-primary)]" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[var(--gm-primary)] leading-tight">E-mail</p>
                    <p className="text-[10px] text-white/60 leading-tight mt-0.5">Enviar por correio eletrônico</p>
                  </div>
                </button>

                <button 
                  onClick={async () => {
                    try {
                      const cleanMessage = htmlToPlainFormatedText(noteShareData.message);
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
                    <p className="font-bold text-[var(--gm-primary)] leading-tight">Copiar Texto</p>
                    <p className="text-[10px] text-white/60 leading-tight mt-0.5">Copiar para colar em outro lugar</p>
                  </div>
                </button>

                {navigator.share && (
                  <button 
                    onClick={async () => {
                      try {
                        const cleanMessage = htmlToPlainFormatedText(noteShareData.message);
                        await navigator.share({
                          title: noteShareData.note.title || 'Nota',
                          text: cleanMessage,
                        });
                        setNoteShareData(null);
                      } catch (err) {
                        if ((err as Error).name !== 'AbortError') {
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
                      <p className="font-bold text-[var(--gm-primary)] leading-tight">Mais Opções</p>
                      <p className="text-[10px] text-white/60 leading-tight mt-0.5">Menu de compartilhamento do sistema</p>
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
