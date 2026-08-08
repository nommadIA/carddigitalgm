import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';

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
  searchable?: boolean;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  disabled = false,
  className = "",
  style = {},
  searchable = false
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const lowerQuery = searchQuery.toLowerCase();
    return options.filter(opt => opt.label.toLowerCase().includes(lowerQuery));
  }, [options, searchable, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, searchable]);

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
          className="absolute z-[999999] top-[calc(100%+6px)] left-0 w-full max-h-80 overflow-hidden flex flex-col rounded-xl bg-[#18181b] border border-white/20 shadow-2xl"
          style={{
            WebkitBackdropFilter: "blur(24px)",
            backdropFilter: "blur(24px)",
            padding: 0, // Reset padding for the dropdown
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {searchable && (
            <div className="p-2.5 border-b border-white/10 shrink-0 bg-black/40">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gm-primary)]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full bg-black/50 border border-white/15 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[var(--gm-primary)] transition-colors"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          <div className="overflow-y-auto custom-scrollbar flex-1 max-h-60 divide-y divide-white/5">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-sm text-slate-400 text-center font-medium">Nenhum resultado encontrado</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(value) === String(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between hover:bg-[var(--gm-primary)]/20 active:bg-[var(--gm-primary)]/30 ${isSelected ? 'bg-[var(--gm-primary)]/15 text-[var(--gm-primary)] font-bold' : 'text-slate-100 hover:text-white'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-[var(--gm-primary)] shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
