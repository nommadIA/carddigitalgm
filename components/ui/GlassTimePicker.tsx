import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Clock, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GlassTimePickerProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}

const selectTickSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.003);
    
    gainNode.gain.setValueAtTime(0.008, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.005);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.006);
  } catch (e) {
    // Audio blocked
  }
};

export const GlassTimePicker: React.FC<GlassTimePickerProps> = ({
  value = '12:00',
  onChange,
  disabled = false,
  className = '',
  title = 'Hora',
  placeholder = '--:--',
  style
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);

  // Parse current value
  const initialTime = value || '12:00';
  const [tempHour, setTempHour] = useState(parseInt(initialTime.split(':')[0], 10) || 0);
  const [tempMinute, setTempMinute] = useState(parseInt(initialTime.split(':')[1], 10) || 0);

  // Infinite cyclic scrolling configuration
  const CYCLES = 12; // 12 full cycles of hours and minutes
  const MID_CYCLE = 6;
  const ITEM_HEIGHT = 40; 

  const duplicatedHours = Array.from({ length: 24 * CYCLES }, (_, i) => i % 24);
  const duplicatedMinutes = Array.from({ length: 60 * CYCLES }, (_, i) => i % 60);

  useEffect(() => {
    if (isOpen) {
      const parsed = (value || '12:00').split(':');
      const h = parseInt(parsed[0], 10) || 0;
      const m = parseInt(parsed[1], 10) || 0;
      setTempHour(h);
      setTempMinute(m);
      prevHourRef.current = h;
      prevMinuteRef.current = m;

      // Scroll after render to center active item in the middle cycle with smooth-behavior overridden temporarily
      setTimeout(() => {
        if (hoursRef.current) {
          hoursRef.current.style.scrollBehavior = 'auto';
          hoursRef.current.scrollTop = (MID_CYCLE * 24 + h) * ITEM_HEIGHT;
          hoursRef.current.style.scrollBehavior = 'smooth';
        }
        if (minutesRef.current) {
          minutesRef.current.style.scrollBehavior = 'auto';
          minutesRef.current.scrollTop = (MID_CYCLE * 60 + m) * ITEM_HEIGHT;
          minutesRef.current.style.scrollBehavior = 'smooth';
        }
      }, 50);
    }
  }, [isOpen, value]);

  // Dynamic position updater
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const updatePosition = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        
        const dropdownHeight = 220; // smaller overall height
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        const placement = (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) ? 'top' : 'bottom';
        
        const top = placement === 'bottom' 
          ? rect.bottom + 6 
          : rect.top - dropdownHeight - 6;
        
        const targetCenterX = rect.left + rect.width / 2;
        let left = targetCenterX - 100; // centered (200px wide)
        
        const minLeft = 12;
        const maxLeft = window.innerWidth - 200 - 12;
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

  const prevHourRef = useRef<number>(tempHour);
  const prevMinuteRef = useRef<number>(tempMinute);
  const isAdjustingRef = useRef<{ hours: boolean; minutes: boolean }>({ hours: false, minutes: false });

  const handleScroll = (type: 'hours' | 'minutes') => {
    const el = type === 'hours' ? hoursRef.current : minutesRef.current;
    if (!el || isAdjustingRef.current[type]) return;

    const scrollY = el.scrollTop;
    const index = Math.round(scrollY / ITEM_HEIGHT);
    const limit = type === 'hours' ? 24 : 60;

    const rawVal = index % limit;
    const actualVal = rawVal < 0 ? rawVal + limit : rawVal;

    // Boundary silent jumping for infinite rolling
    if (index < 3 * limit) {
      isAdjustingRef.current[type] = true;
      el.style.scrollBehavior = 'auto';
      const offsetIndex = MID_CYCLE * limit + actualVal;
      el.scrollTop = offsetIndex * ITEM_HEIGHT;
      el.style.scrollBehavior = 'smooth';
      setTimeout(() => {
        isAdjustingRef.current[type] = false;
      }, 40);
      return;
    } else if (index >= 9 * limit) {
      isAdjustingRef.current[type] = true;
      el.style.scrollBehavior = 'auto';
      const offsetIndex = MID_CYCLE * limit + actualVal;
      el.scrollTop = offsetIndex * ITEM_HEIGHT;
      el.style.scrollBehavior = 'smooth';
      setTimeout(() => {
        isAdjustingRef.current[type] = false;
      }, 40);
      return;
    }

    if (type === 'hours') {
      if (actualVal !== prevHourRef.current) {
        setTempHour(actualVal);
        prevHourRef.current = actualVal;
        selectTickSound();
      }
    } else {
      if (actualVal !== prevMinuteRef.current) {
        setTempMinute(actualVal);
        prevMinuteRef.current = actualVal;
        selectTickSound();
      }
    }
  };

  const selectValueAndClose = () => {
    const formattedHour = String(tempHour).padStart(2, '0');
    const formattedMinute = String(tempMinute).padStart(2, '0');
    onChange(`${formattedHour}:${formattedMinute}`);
    setIsOpen(false);
  };

  const handleOptionClick = (type: 'hours' | 'minutes', indexInDuplicated: number) => {
    const el = type === 'hours' ? hoursRef.current : minutesRef.current;
    if (el) {
      el.scrollTo({
        top: indexInDuplicated * ITEM_HEIGHT,
        behavior: 'smooth'
      });
    }
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
        <span className="font-mono">{value || placeholder}</span>
      </div>

      {typeof window !== 'undefined' && document.body && createPortal(
        <AnimatePresence>
          {isOpen && dropdownPos && (
            <>
              {/* Full-screen backdrop to intercept clicks outside */}
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
                className="fixed z-[99999] w-[200px] rounded-xl overflow-hidden shadow-2xl text-left"
                style={{
                  top: `${dropdownPos.top}px`,
                  left: `${dropdownPos.left}px`,
                  background: 'rgba(20, 24, 33, 0.95)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 123, 0, 0.3)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7), inset 0 0 12px rgba(255, 123, 0, 0.12)',
                }}
              >
                {/* Header (Very Minimalist: Smaller, cleaner) */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-black/35">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 flex items-center gap-1">
                    <Clock size={10} className="text-[#ff7b00]" />
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

                {/* Selector Core Area (Shortened to 120px to display 3 rows exactly: 40px * 3) */}
                <div className="relative flex items-center h-[120px] px-2 select-none">
                  {/* Absolute Center Active overlay bar */}
                  <div 
                    className="absolute left-2 right-2 h-[40px] pointer-events-none rounded-lg border border-[#ff7b00]/25"
                    style={{
                      top: '40px', // exactly centered
                      background: 'linear-gradient(90deg, rgba(255,123,0,0.04), rgba(255,123,0,0.08), rgba(255,123,0,0.04))',
                    }}
                  />

                  {/* Hours Column */}
                  <div 
                    ref={hoursRef}
                    onScroll={() => handleScroll('hours')}
                    className="flex-1 h-full overflow-y-auto no-scrollbar"
                    style={{
                      scrollSnapType: 'y mandatory',
                      paddingTop: '40px',   // centered top offset
                      paddingBottom: '40px', // centered bottom offset
                      scrollBehavior: 'smooth'
                    }}
                  >
                    {duplicatedHours.map((h, index) => {
                      const isSelected = h === tempHour;
                      return (
                        <div
                          key={index}
                          onClick={() => handleOptionClick('hours', index)}
                          className={`h-[40px] flex items-center justify-center text-base font-mono font-bold transition-all duration-150 cursor-pointer ${
                            isSelected ? 'text-[#ff7b00] scale-105' : 'text-white/30 hover:text-white/60'
                          }`}
                          style={{ scrollSnapAlign: 'center' }}
                        >
                          {String(h).padStart(2, '0')}
                        </div>
                      );
                    })}
                  </div>

                  {/* Divider */}
                  <div className="text-sm font-mono text-white/35 font-bold px-1 pointer-events-none">
                    :
                  </div>

                  {/* Minutes Column */}
                  <div 
                    ref={minutesRef}
                    onScroll={() => handleScroll('minutes')}
                    className="flex-1 h-full overflow-y-auto no-scrollbar"
                    style={{
                      scrollSnapType: 'y mandatory',
                      paddingTop: '40px',   // centered top offset
                      paddingBottom: '40px', // centered bottom offset
                      scrollBehavior: 'smooth'
                    }}
                  >
                    {duplicatedMinutes.map((m, index) => {
                      const isSelected = m === tempMinute;
                      return (
                        <div
                          key={index}
                          onClick={() => handleOptionClick('minutes', index)}
                          className={`h-[40px] flex items-center justify-center text-base font-mono font-bold transition-all duration-150 cursor-pointer ${
                            isSelected ? 'text-[#ff7b00] scale-105' : 'text-white/30 hover:text-white/60'
                          }`}
                          style={{ scrollSnapAlign: 'center' }}
                        >
                          {String(m).padStart(2, '0')}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer buttons (Compact & modern) */}
                <div className="p-2 border-t border-white/5 bg-black/15 flex gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                    }}
                    className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-white/40 hover:text-white/70 hover:bg-white/5 border border-white/5 transition-all text-center"
                  >
                    Sair
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectValueAndClose();
                    }}
                    className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-white bg-gradient-to-r from-[#ff6a00] to-[#ff8c00] hover:brightness-110 transition-all flex items-center justify-center gap-0.5 shadow-lg shadow-orange-500/10 focus:ring-1 focus:ring-orange-500/50 outline-none"
                  >
                    <Check size={10} className="stroke-[3]" />
                    Ok
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
