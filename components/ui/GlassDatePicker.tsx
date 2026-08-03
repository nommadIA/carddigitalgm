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
                          const fallbackColor = '#ff7b00';
                          const customColor = themeColor || fallbackColor;
                          return (
                            <>
                              {/* Overlay Backdrop to capture outside clicks */}
                              <div 
                                className="fixed inset-0 z-[99998] cursor-default bg-black/5 backdrop-blur-[0.5px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsOpen(false);
                                }}
                              />
                              <motion.div
                                ref={dropdownRef}
                                initial={{ opacity: 0, y: dropdownPos.placement === 'top' ? 10 : -10, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: dropdownPos.placement === 'top' ? 10 : -10, scale: 0.97 }}
                                transition={{ type: 'spring', damping: 22, stiffness: 380 }}
                                className="fixed z-[99999] w-[220px] rounded-xl overflow-hidden shadow-lg text-left glass-datepicker-dropdown"
                                style={{
                                  top: `${dropdownPos.top}px`,
                                  left: `${dropdownPos.left}px`,
                                  background: 'rgba(20, 24, 33, 0.96)',
                                  backdropFilter: 'blur(16px)',
                                  border: `1px solid ${customColor}50`,
                                  boxShadow: `0 8px 32px rgba(0, 0, 0, 0.75), inset 0 0 12px ${customColor}22`,
                                }}
                              >
                                {/* Header with control */}
                                <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-black/35">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 flex items-center gap-1">
                                    <CalendarIcon size={10} style={{ color: customColor }} />
                                    {title}
                                  </span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsOpen(false);
                                    }}
                                    className="text-white/40 hover:text-white p-0.5 rounded-full hover:bg-white/5 transition-all"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                
                                {/* Calendar Navigation */}
                                <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/5 bg-black/10">
                                  <button 
                                    onClick={handlePrevMonth}
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all"
                                  >
                                    <ChevronLeft size={14} />
                                  </button>
                                  <span className="text-xs font-bold text-white tracking-wide">
                                    {monthsNames[month]} <span className="opacity-40">{year}</span>
                                  </span>
                                  <button 
                                    onClick={handleNextMonth}
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all"
                                  >
                                    <ChevronRight size={14} />
                                  </button>
                                </div>
                
                                {/* Calendar Grid */}
                                <div className="p-2 select-none">
                                  {/* Weekday labels */}
                                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                    {weekDays.map((d, index) => (
                                      <span key={index} className="text-[9px] font-bold text-white/30 font-mono">
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
                                        <div
                                          key={key}
                                          onClick={(e) => {
                                            if (isCurrentMonth) handleDaySelect(e, day);
                                          }}
                                          className={`h-5 w-5 mx-auto rounded-md text-[10px] font-bold font-mono flex items-center justify-center transition-all ${
                                            isCurrentMonth 
                                              ? 'cursor-pointer hover:bg-white/10' 
                                              : 'opacity-15 pointer-events-none'
                                          }`}
                                          style={{
                                            backgroundColor: selected ? customColor : undefined,
                                            boxShadow: selected ? `0 4px 12px ${customColor}40` : undefined,
                                            borderColor: today && !selected ? customColor : undefined,
                                            borderWidth: today && !selected ? '1px' : undefined,
                                            color: selected ? '#000000' : today ? customColor : 'rgba(255, 255, 255, 0.8)'
                                          }}
                                        >
                                          {day}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                
                                {/* Action footer */}
                                <div className="p-2 border-t border-white/5 bg-black/15 flex gap-1.5">
                                  <button
                                    onClick={handleTodayClick}
                                    className="flex-1 py-1 rounded-lg text-[10px] font-bold transition-all text-center hover:bg-white/5"
                                    style={{
                                      color: customColor,
                                      borderColor: `${customColor}30`,
                                      borderWidth: '1px'
                                    }}
                                  >
                                    Hoje
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsOpen(false);
                                    }}
                                    className="flex-1 py-1 rounded-lg text-[10px] font-bold text-white/40 hover:text-white/70 hover:bg-white/5 border border-white/5 transition-all text-center"
                                  >
                                    Sair
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
