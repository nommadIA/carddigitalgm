import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GlassDatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
  themeColor?: string;
}

export const GlassDatePicker: React.FC<GlassDatePickerProps> = ({
  value = '',
  onChange,
  disabled = false,
  className = '',
  title = 'Data',
  style,
  themeColor
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);

  // Parse or default current date
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

  const [selectedDate, setSelectedDate] = useState<Date>(parseValueDate(value));
  const [viewDate, setViewDate] = useState<Date>(parseValueDate(value));

  useEffect(() => {
    const d = parseValueDate(value);
    setSelectedDate(d);
    setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [value, isOpen]);

  // Position calendar relative to input container
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const updatePosition = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        
        const dropdownHeight = 295; // height of the picker
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        const placement = (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) ? 'top' : 'bottom';
        
        const top = placement === 'bottom' 
          ? rect.bottom + 6 
          : rect.top - dropdownHeight - 6;
          
        const targetCenterX = rect.left + rect.width / 2;
        let left = targetCenterX - 110; // width is 220px, left offset is half
        
        const minLeft = 12;
        const maxLeft = window.innerWidth - 220 - 12;
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
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleTodayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    setSelectedDate(today);
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const formatOutputDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleDaySelect = (e: React.MouseEvent, day: number) => {
    e.stopPropagation();
    const newDate = new Date(year, month, day);
    setSelectedDate(newDate);
    // Auto confirm on select double-click style or direct selection
    const formatted = formatOutputDate(newDate);
    onChange(formatted);
    setIsOpen(false);
  };

  // Helper arrays for building monthly grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const prevMonthDays = new Date(year, month, 0).getDate();

  const daysArray: { day: number; isCurrentMonth: boolean; key: string }[] = [];

  // Previous month fill-in days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysArray.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      key: `prev-${prevMonthDays - i}`
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push({
      day: d,
      isCurrentMonth: true,
      key: `curr-${d}`
    });
  }

  // Next month fill-in days to complete 42-cell calendar grid
  const remainingCells = 42 - daysArray.length;
  for (let n = 1; n <= remainingCells; n++) {
    daysArray.push({
      day: n,
      isCurrentMonth: false,
      key: `next-${n}`
    });
  }

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const monthsNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const formatDisplayValue = (valString: string): string => {
    if (!valString) return 'dd/mm/aaaa';
    const parts = valString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return valString;
  };

  const isToday = (dayNum: number, isCurr: boolean) => {
    if (!isCurr) return false;
    const now = new Date();
    return now.getDate() === dayNum && now.getMonth() === month && now.getFullYear() === year;
  };

  const isSelected = (dayNum: number, isCurr: boolean) => {
    if (!isCurr) return false;
    return selectedDate.getDate() === dayNum && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Target input display */}
      <div 
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`cursor-pointer select-none transition-all ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
        style={style}
      >
        <span>{formatDisplayValue(value)}</span>
      </div>

      {typeof window !== 'undefined' && document.body && createPortal(
        <AnimatePresence>
          {isOpen && dropdownPos && (() => {
            const orangeColor = themeColor || 'var(--gm-primary, #FF6900)';
            return (
              <>
                {/* Overlay Backdrop to capture outside clicks */}
                <div 
                  className="fixed inset-0 z-[99998] cursor-default bg-black/40 backdrop-blur-[1px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                />
                <motion.div
                  ref={dropdownRef}
                  initial={{ opacity: 0, y: dropdownPos.placement === 'top' ? 15 : -15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: dropdownPos.placement === 'top' ? 15 : -15, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                  className="fixed z-[99999] w-72 max-w-[90vw] bg-[#141517] border border-zinc-800 rounded-xl p-4 space-y-3.5 shadow-[0_25px_50px_rgba(0,0,0,0.95)] text-left glass-datepicker-dropdown"
                  style={{
                    top: `${dropdownPos.top}px`,
                    left: `${dropdownPos.left}px`,
                    borderTopWidth: '3px',
                    borderTopColor: '#FF6900',
                  }}
                >
                  {/* Header with control */}
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <span className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5 text-orange-500">
                      <CalendarIcon size={13} className="text-orange-500" />
                      {title || 'Data do Lembrete'}
                    </span>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800 transition-all cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
  
                  {/* Calendar Navigation */}
                  <div className="flex items-center justify-between px-1 py-1 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                    <button 
                      type="button"
                      onClick={handlePrevMonth}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-extrabold text-white tracking-wider uppercase">
                      {monthsNames[month]} <span className="text-orange-400 font-mono">{year}</span>
                    </span>
                    <button 
                      type="button"
                      onClick={handleNextMonth}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
  
                  {/* Calendar Grid */}
                  <div className="p-1 select-none">
                    {/* Weekday labels */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                      {weekDays.map((d, index) => (
                        <span key={index} className="text-[10px] font-black text-zinc-500 font-mono">
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
                            className={`h-7 w-7 mx-auto rounded-lg text-[11px] font-black font-mono flex items-center justify-center transition-all cursor-pointer ${
                              isCurrentMonth 
                                ? selected
                                  ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/40 scale-105'
                                  : today
                                  ? 'border border-orange-500 text-orange-400 hover:bg-orange-500/20'
                                  : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                                : 'opacity-15 pointer-events-none text-zinc-600'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
  
                  {/* Action footer */}
                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleTodayClick}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-orange-400 hover:text-orange-300 bg-orange-950/30 border border-orange-900/40 transition-all text-center cursor-pointer"
                    >
                      Hoje
                    </button>
                    {value && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChange('');
                          setIsOpen(false);
                        }}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-red-400 hover:text-red-300 bg-red-950/30 border border-red-900/40 transition-all text-center cursor-pointer"
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
                      className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-zinc-300 hover:text-white bg-zinc-800/80 border border-zinc-700/60 transition-all text-center ml-auto cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                </motion.div>
              </>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
