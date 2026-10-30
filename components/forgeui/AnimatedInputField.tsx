"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoMdCheckmark } from "react-icons/io";
import { cn } from "../../lib/utils";

interface AnimatedInputFieldProps {
  id?: string;
  name?: string;
  label?: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  demoPlaceholder?: string;
  icon?: React.ReactNode;
  rightAction?: React.ReactNode;
  isValid?: boolean;
  required?: boolean;
  autoComplete?: string;
  disabled?: boolean;
  className?: string;
  strokeColor?: string;
  headerRight?: React.ReactNode;
  hint?: React.ReactNode;
}

export const AnimatedInputField: React.FC<AnimatedInputFieldProps> = ({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  demoPlaceholder,
  icon,
  rightAction,
  isValid = false,
  required = false,
  autoComplete,
  disabled = false,
  className,
  strokeColor = "#10b981",
  headerRight,
  hint,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [demoText, setDemoText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Efeito sutil de typewriter placeholder quando o campo está vazio e não focado
  useEffect(() => {
    if (!demoPlaceholder || value.length > 0 || isFocused) {
      setDemoText("");
      return;
    }

    let isMounted = true;
    let idx = 0;
    let forward = true;
    let timeout: any = null;

    const tick = () => {
      if (!isMounted) return;
      if (forward) {
        if (idx <= demoPlaceholder.length) {
          setDemoText(demoPlaceholder.slice(0, idx));
          idx++;
          timeout = setTimeout(tick, 90);
        } else {
          timeout = setTimeout(() => {
            forward = false;
            tick();
          }, 2400);
        }
      } else {
        if (idx > 0) {
          idx--;
          setDemoText(demoPlaceholder.slice(0, idx));
          timeout = setTimeout(tick, 45);
        } else {
          timeout = setTimeout(() => {
            forward = true;
            tick();
          }, 1200);
        }
      }
    };

    timeout = setTimeout(tick, 800);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [demoPlaceholder, value, isFocused]);

  return (
    <div className={cn("forge-field w-full", className)}>
      {/* Label no padrão Uiverse.io forge-field__label */}
      {(label || headerRight) && (
        <div className="flex items-center justify-between mb-2 px-0.5">
          {label && (
            <label
              htmlFor={id}
              className="forge-field__label !mb-0 select-none cursor-pointer"
            >
              {label}
            </label>
          )}
          {headerRight}
        </div>
      )}

      {/* Caixa de Digitação com o padrão Forge Premium (h-12 / 48px, rounded-xl) */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "w-full h-12 px-3.5 sm:px-4 flex items-center justify-between gap-3 cursor-text",
          "rounded-xl border transition-all duration-[140ms] ease-[cubic-bezier(0.2,0.65,0.25,1)]",
          "selection:bg-[var(--gm-primary,#FE540B)] selection:text-white",
          isFocused
            ? "bg-[#101116] border-[var(--gm-primary,#FE540B)] shadow-[0_0_0_2px_rgba(var(--gm-primary-rgb,254,84,11),0.25)]"
            : "bg-[#14151b] border-white/10 hover:border-white/20"
        )}
      >
        {/* Lado Esquerdo: Ícone + Input */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 h-full relative">
          {icon && (
            <div
              className={cn(
                "shrink-0 transition-colors duration-[120ms]",
                isFocused ? "text-[var(--gm-primary,#FE540B)]" : "text-[#8b8b92]"
              )}
            >
              {icon}
            </div>
          )}

          <div className="relative flex-1 min-w-0 h-full flex items-center">
            <input
              ref={inputRef}
              id={id}
              name={name}
              type={type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isFocused ? "" : (demoPlaceholder ? "" : placeholder)}
              required={required}
              autoComplete={autoComplete}
              disabled={disabled}
              className={cn(
                "forge-clean-input !bg-transparent !border-0 !border-none !outline-none !shadow-none !p-0 !m-0 !ring-0",
                "w-full h-full text-[#f2f2f3] text-[14px] font-medium leading-normal",
                "placeholder:text-[#5a5a60] placeholder:font-normal placeholder:text-[14px]",
                "selection:bg-[var(--gm-primary,#FE540B)] selection:text-white",
                type === "password" && value.length > 0 && "tracking-widest"
              )}
            />

            {/* Digitador / Typewriter Placeholder quando o campo está vazio e não focado */}
            {!isFocused && value.length === 0 && demoPlaceholder && (
              <div className="absolute inset-0 flex items-center pointer-events-none select-none text-[#5a5a60] text-[14px]">
                <span>{demoText}</span>
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="inline-block w-[2px] h-3.5 bg-[var(--gm-primary,#FE540B)] ml-0.5 rounded-sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Ações Extras (ex: Ver/Ocultar Senha) + Checkmark se verificado */}
        <div className="flex items-center gap-2 shrink-0">
          {rightAction}

          {/* Círculo indicador / verificado */}
          <AnimatePresence>
            {isValid ? (
              <motion.div
                key="forge-verified"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-5 h-5 rounded-full bg-[#10b981] flex items-center justify-center text-white shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                title="Verificado"
              >
                <IoMdCheckmark className="w-3.5 h-3.5 text-white stroke-[2]" />
              </motion.div>
            ) : value.length > 0 ? (
              <div className="w-1.5 h-1.5 rounded-full bg-[#5a5a60]" />
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Dica / Hint no padrão forge-field__hint */}
      {hint && <div className="forge-field__hint">{hint}</div>}
    </div>
  );
};

export default AnimatedInputField;
