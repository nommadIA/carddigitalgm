import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/AuthContext';
import { Page } from "../components/ui/Page";
import { Grid } from "../components/ui/Grid";
import { Card } from "../components/ui/Card";
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Pin, PinOff, Trash2, Edit2, X, Save, Clock, GripHorizontal, Palette, Share2, CornerRightDown, RefreshCcw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Note } from '../types';
import ReactMarkdown from 'react-markdown';
import { addAlarmsForBudget, toggleAlarmsForBudget, checkAlarms, removeAlarmsForBudget } from '../lib/alarmSystem';

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

  function openNewNote() {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setColor(COLORS[0]);
    setIsPinned(false);
    setReminderTime('');
    setModalOpen(true);
  }

  function openEdit(note: Note) {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color || COLORS[0]);
    setIsPinned(note.is_pinned);
    setReminderTime(note.reminder_time || '');
    setModalOpen(true);
  }

  async function handleSave() {
    if (!tenantId) return;

    const payload = {
      tenant_id: tenantId,
      title,
      content,
      color,
      is_pinned: isPinned,
      reminder_time: reminderTime || null,
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
      
      // Update Alarm Schedule if reminder format is 00:00
      if (savedNote) {
         if (savedNote.reminder_time && /^\d{2}:\d{2}$/.test(savedNote.reminder_time)) {
            // Re-schedule alarms
            addAlarmsForBudget(savedNote.id, savedNote.title || 'Nota', [savedNote.reminder_time], 'NOTE');
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
                      borderColor: note.color || '#334155',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      boxShadow: `0 0 20px ${(note.color || '#334155')}40, inset 0 0 20px ${(note.color || '#334155')}20`
                    }}
                  >
                    {/* Pin Toggle */}
                    <button 
                      onClick={(e) => togglePin(note, e)}
                      className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-10"
                    >
                      {note.is_pinned ? <Pin size={20} fill="currentColor" /> : <PinOff size={20} />}
                    </button>
                    
                    {/* Title */}
                    <h3 className="font-bold text-lg text-white mb-1 pr-8 leading-tight">
                      {note.title || 'Sem título'}
                    </h3>

                    {/* Body Preview */}
                    <div className={`text-white/70 text-sm overflow-hidden flex-1 relative ${isExpanded ? '' : 'max-h-[140px]'}`}>
                      <div className={`markdown-body text-sm leading-relaxed ${isExpanded ? '' : 'line-clamp-4'}`}>
                        <ReactMarkdown>
                          {note.content || '...'}
                        </ReactMarkdown>
                      </div>
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
                        {note.reminder_time && (
                          <span className="text-[10px] text-[var(--gm-accent)] uppercase flex items-center gap-1 font-bold tracking-widest mt-0.5">
                            <Clock size={10} className="text-[#ff6600] animate-pulse" />
                            {note.reminder_time}
                          </span>
                        )}
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
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSoftDelete(note.id);
                            }}
                            className="text-red-500 hover:text-red-400 p-2 bg-red-500/10 rounded-xl transition-all hover:scale-110 hover:bg-red-500/20 z-20 relative pointer-events-auto"
                            title="Mover para Lixeira"
                          >
                            <Trash2 size={18} />
                          </button>
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
                      className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isPinned ? 'bg-[var(--gm-primary)]/20 text-[var(--gm-primary)]' : 'hover:bg-white/5 text-white/40'}`}
                    >
                      <Pin size={18} fill={isPinned ? "currentColor" : "none"} />
                    </button>
                    <button onClick={() => setModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-white/40">
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Content Editor */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide relative" 
                  style={{ 
                    backgroundColor: 'transparent',
                    boxShadow: `inset 0 0 40px ${color}15`
                  }}
                >
                   <textarea
                     className="w-full h-full min-h-[300px] bg-transparent resize-none outline-none text-white/90 placeholder:text-white/40"
                     placeholder="Escreva sua nota aqui... (suporta markdown básico)"
                     value={content}
                     onChange={(e) => setContent(e.target.value)}
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
                  <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide w-full md:max-w-[50%] p-2">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-8 h-8 rounded-full border-[3px] transition-transform duration-300 shrink-0 flex-none ${color === c ? 'scale-[1.2]' : 'scale-100 hover:scale-[1.15]'}`}
                        style={{ 
                          backgroundColor: c,
                          borderColor: color === c ? '#fff' : 'transparent',
                          boxShadow: `0 0 15px ${c}90`,
                          zIndex: color === c ? 10 : 1
                        }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
                    {/* Reminder */}
                    <div className="flex items-center gap-3 bg-black/40 p-2 rounded-xl border border-white/5">
                      <Clock size={16} className={reminderTime ? "text-[#ff6600] animate-pulse ml-1" : "text-white/50 ml-1"} />
                      <input 
                        type="time" 
                        className="bg-transparent text-white/80 outline-none text-sm font-mono border-none"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                      />
                    </div>

                    <button 
                      onClick={handleSave}
                      className="px-8 py-3 rounded-xl font-bold flex items-center justify-center transition-all shadow-lg text-white bg-green-500 hover:bg-green-600 shadow-green-500/20 hover:shadow-green-500/40 transform hover:-translate-y-0.5"
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
    </Page>
  );
}
