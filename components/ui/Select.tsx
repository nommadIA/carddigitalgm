import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  disabled = false,
  className = "",
  style = {}
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <div 
      className={`relative flex items-center justify-between text-left focus:outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`} 
      ref={containerRef} 
      style={style}
      onClick={() => !disabled && setIsOpen(!isOpen)}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          setIsOpen(!isOpen);
        }
      }}
    >
      <span className={`truncate pr-2 ${selectedOption ? 'text-[var(--gm-primary)] font-bold' : 'text-slate-400'}`}>
        {selectedOption ? selectedOption.label : placeholder}
      </span>
      <ChevronDown size={18} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180 text-[var(--gm-primary)]' : 'text-slate-400'}`} />

      {isOpen && (
        <div 
          className="absolute z-[10000] top-[calc(100%+8px)] left-0 w-full max-h-60 overflow-y-auto rounded-xl bg-black/80 backdrop-blur-2xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] custom-scrollbar"
          style={{
            WebkitBackdropFilter: "blur(24px)",
            backdropFilter: "blur(24px)",
            padding: 0, // Reset padding for the dropdown
          }}
        >
          {options.length === 0 ? (
            <div className="p-3 text-sm text-slate-400 text-center">Nenhuma opção</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-white/10 ${String(value) === String(opt.value) ? 'bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] font-bold' : 'text-white'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
