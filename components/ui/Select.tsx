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
      <span className={`truncate pr-2 ${selectedOption ? 'text-[var(--gm-primary)] font-bold' : 'text-[#8B8B92]'}`}>
        {selectedOption ? selectedOption.label : placeholder}
      </span>
      <ChevronDown size={16} className={`shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180 text-[var(--gm-primary)]' : 'text-[#8B8B92]'}`} />

      {isOpen && (
        <div 
          className="absolute z-[999999] top-[calc(100%+6px)] left-0 w-full max-h-80 overflow-hidden flex flex-col rounded-md bg-[#131315] border border-[#26262A] shadow-2xl"
          style={{ padding: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {searchable && (
            <div className="p-2.5 border-b border-[#26262A] shrink-0 bg-[#0B0B0C]">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gm-primary)]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full h-9 bg-[#131315] border border-[#26262A] rounded-[4px] pl-9 pr-3 text-sm text-[#F2F2F3] placeholder-[#8B8B92] focus:outline-none focus:border-[var(--gm-primary)] transition-colors"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          <div className="overflow-y-auto custom-scrollbar flex-1 max-h-60 divide-y divide-[#26262A]">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-sm text-[#8B8B92] text-center font-medium">Nenhum resultado encontrado</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(value) === String(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors flex items-center justify-between hover:bg-[#1B1B1E] cursor-pointer ${isSelected ? 'bg-[var(--gm-primary)]/15 text-[var(--gm-primary)] font-bold' : 'text-[#F2F2F3]'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-[2px] bg-[var(--gm-primary)] shrink-0 ml-2" />
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
