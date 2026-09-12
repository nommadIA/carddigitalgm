import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface GlassDatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
  themeColor?: string;
  placeholder?: string;
}

export const GlassDatePicker: React.FC<GlassDatePickerProps> = ({
  value = '',
  onChange,
  disabled = false,
  className = '',
  title = 'Data do Lembrete',
  style,
  themeColor,
  placeholder = 'DD/MM/AAAA',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);

  // Format YYYY-MM-DD to DD/MM/AAAA
  const isoToBr = (iso: string): string => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return iso;
  };

  // Convert DD/MM/AAAA to YYYY-MM-DD
  const brToIso = (br: string): string | null => {
    const clean = br.trim();
    const match = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const y = parseInt(match[3], 10);
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null;
    const testDate = new Date(y, m - 1, d);
    if (testDate.getFullYear() !== y || testDate.getMonth() !== m - 1 || testDate.getDate() !== d) {
      return null;
    }
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const [textValue, setTextValue] = useState<string>(() => isoToBr(value));

  // Parse date string to Date object
  const parseValueDate = (valString: string): Date => {
    if (!valString) return new Date();
    const parts = valString.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return new Date(y, m, d);
    }
    return new Date();
  };

  const [selectedDate, setSelectedDate] = useState<Date>(() => parseValueDate(value));
  const [viewDate, setViewDate] = useState<Date>(() => parseValueDate(value));

  // Sync with external value changes
  useEffect(() => {
    setTextValue(isoToBr(value));
    const d = parseValueDate(value);
    setSelectedDate(d);
    setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [value]);

  // Position calendar relative to input container
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const updatePosition = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        
        const dropdownHeight = 330;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        const placement = (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) ? 'top' : 'bottom';
        
        const top = placement === 'bottom' 
          ? rect.bottom + 6 
          : Math.max(12, rect.top - dropdownHeight - 6);
          
        const targetCenterX = rect.left + rect.width / 2;
        let left = targetCenterX - 145; // ~290px width
        
        const minLeft = 12;
        const maxLeft = window.innerWidth - 300 - 12;
        left = Math.max(minLeft, Math.min(maxLeft, left));
        
        setDropdownPos({ top, left, placement });
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, { capture: true, passive: true });
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, { capture: true } as any);
        window.removeEventListener('resize', updatePosition);
      };
    } else {
      setDropdownPos(null);
    }
  }, [isOpen]);

  // Calendar logic helpers
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const formatOutputDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleTodayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const today = new Date();
    setSelectedDate(today);
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    const formattedIso = formatOutputDate(today);
    setTextValue(isoToBr(formattedIso));
    onChange(formattedIso);
    setIsOpen(false);
  };

  const handleDaySelect = (e: React.MouseEvent, day: number) => {
    e.preventDefault();
    e.stopPropagation();
    const newDate = new Date(year, month, day);
    setSelectedDate(newDate);
    const formattedIso = formatOutputDate(newDate);
    setTextValue(isoToBr(formattedIso));
    onChange(formattedIso);
    setIsOpen(false);
  };

  // Keyboard typing with automatic DD/MM/AAAA mask
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    
    let formatted = '';
    if (digits.length <= 2) {
      formatted = digits;
    } else if (digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    }

    setTextValue(formatted);

    if (!formatted) {
      onChange('');
    } else if (formatted.length === 10) {
      const iso = brToIso(formatted);
      if (iso) {
        onChange(iso);
        const d = parseValueDate(iso);
        setSelectedDate(d);
        setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }
  };

  const handleInputBlur = () => {
    if (!textValue) {
      onChange('');
    } else {
      const iso = brToIso(textValue);
      if (iso) {
        onChange(iso);
      } else {
        // Revert to current valid value
        setTextValue(isoToBr(value));
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTextValue('');
    onChange('');
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Helper arrays for building monthly grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const daysArray: { day: number; isCurrentMonth: boolean; key: string }[] = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysArray.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      key: `prev-${prevMonthDays - i}`,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push({
      day: d,
      isCurrentMonth: true,
      key: `curr-${d}`,
    });
  }

  const remainingCells = 42 - daysArray.length;
  for (let n = 1; n <= remainingCells; n++) {
    daysArray.push({
      day: n,
      isCurrentMonth: false,
      key: `next-${n}`,
    });
  }

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const monthsNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const isToday = (dayNum: number, isCurr: boolean) => {
    if (!isCurr) return false;
    const now = new Date();
    return now.getDate() === dayNum && now.getMonth() === month && now.getFullYear() === year;
  };

  const isSelected = (dayNum: number, isCurr: boolean) => {
    if (!isCurr) return false;
    return selectedDate.getDate() === dayNum && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
  };

  const primaryColor = themeColor || 'var(--gm-primary, #FF6900)';

  return (
    <div className="relative w-full flex items-center" ref={containerRef}>
      {/* Real editable input with mask support */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={textValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const iso = brToIso(textValue);
            if (iso) onChange(iso);
            setIsOpen(false);
          } else if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        disabled={disabled}
        placeholder={placeholder}
        title={title}
        className={`${className} cursor-text tracking-wider selection:bg-orange-500/30 font-mono`}
        style={style}
      />

      {/* Right control buttons: Clear date (X) + Open Calendar button */}
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
            title="Limpar data"
          >
            <X size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) setIsOpen(!isOpen);
          }}
          className={`p-1.5 rounded-lg transition-all active:scale-95 cursor-pointer ${
            isOpen
              ? 'text-[var(--gm-primary,#FF6900)] bg-white/15 ring-1 ring-[var(--gm-primary,#FF6900)]/50'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title={isOpen ? 'Fechar calendário' : 'Abrir calendário'}
        >
          <CalendarIcon size={15} />
        </button>
      </div>

      {/* Calendar Portal with superior z-index (z-[10000060]) to always sit above modals */}
      {typeof window !== 'undefined' && document.body && createPortal(
        <AnimatePresence>
          {isOpen && dropdownPos && (
            <>
              {/* Click-away backdrop */}
              <div 
                className="fixed inset-0 z-[10000050] cursor-default bg-black/30 backdrop-blur-[1px]"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
              />
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: dropdownPos.placement === 'top' ? 12 : -12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: dropdownPos.placement === 'top' ? 12 : -12, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                className="fixed z-[10000060] w-76 max-w-[92vw] bg-[#121418]/98 border border-white/20 rounded-2xl p-4 space-y-3.5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-left backdrop-blur-2xl glass-datepicker-dropdown"
                style={{
                  top: `${dropdownPos.top}px`,
                  left: `${dropdownPos.left}px`,
                  borderTopWidth: '3px',
                  borderTopColor: primaryColor,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header with title & close */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5 text-[var(--gm-primary,#FF6900)]">
                    <CalendarIcon size={13} className="text-[var(--gm-primary,#FF6900)]" />
                    {title}
                  </span>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                    }}
                    className="text-white/50 hover:text-white p-1 rounded-md hover:bg-white/10 transition-all cursor-pointer"
                    title="Fechar calendário"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Calendar Navigation */}
                <div className="flex items-center justify-between px-1.5 py-1 bg-black/40 border border-white/10 rounded-xl">
                  <button 
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer active:scale-95"
                    title="Mês anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-extrabold text-white tracking-wider uppercase">
                    {monthsNames[month]} <span className="text-[var(--gm-primary,#FF6900)] font-mono font-bold">{year}</span>
                  </span>
                  <button 
                    type="button"
                    onClick={handleNextMonth}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer active:scale-95"
                    title="Próximo mês"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="p-0.5 select-none">
                  {/* Weekday labels */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                    {weekDays.map((d, index) => (
                      <span key={index} className="text-[10px] font-black text-white/40 font-mono">
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Monthly grid */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {daysArray.map(({ day, isCurrentMonth, key }) => {
                      const selected = isSelected(day, isCurrentMonth);
                      const today = isToday(day, isCurrentMonth);
                      
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={(e) => {
                            if (isCurrentMonth) handleDaySelect(e, day);
                          }}
                          className={`h-7.5 w-7.5 mx-auto rounded-lg text-xs font-black font-mono flex items-center justify-center transition-all cursor-pointer ${
                            isCurrentMonth 
                              ? selected
                                ? 'bg-[var(--gm-primary,#FF6900)] text-white shadow-lg shadow-orange-500/40 scale-105 ring-2 ring-white/30'
                                : today
                                ? 'border border-orange-500/80 text-orange-400 hover:bg-orange-500/20 font-extrabold'
                                : 'text-white/85 hover:bg-white/10 hover:text-white'
                              : 'opacity-20 pointer-events-none text-white/30'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action footer: Hoje, Limpar, Fechar */}
                <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleTodayClick}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 transition-all text-center cursor-pointer active:scale-95"
                  >
                    Hoje
                  </button>
                  {value && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all text-center cursor-pointer active:scale-95"
                    >
                      Limpar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-center ml-auto cursor-pointer active:scale-95"
                  >
                    Fechar
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

