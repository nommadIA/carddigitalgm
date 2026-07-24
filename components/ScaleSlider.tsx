import React, { useState, useEffect } from "react";

export const ScaleSlider = ({ value, onChange, isMobile }: { value: number, onChange: (v: number) => void, isMobile?: boolean }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (!isNaN(val)) {
      setLocalValue(val);
      document.documentElement.style.setProperty(isMobile ? "--gm-mobile-scale" : "--gm-app-scale", String(val));
    }
  };

  const handleCommit = () => {
    let finalVal = localValue;
    if (finalVal < 0.7) finalVal = 0.7;
    if (finalVal > 3) finalVal = 3;
    setLocalValue(finalVal);
    onChange(finalVal);
  };

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-slate-800/80 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
      <input 
        type="range" 
        min={0.7} 
        max={3} 
        step={0.05} 
        className="flex-1 h-2 accent-[var(--gm-primary)] cursor-pointer" 
        value={localValue} 
        onChange={handleInput}
        onMouseUp={handleCommit}
        onTouchEnd={handleCommit}
      />
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="number"
          min={0.7}
          max={3}
          step={0.01}
          className="w-16 bg-slate-50 dark:bg-slate-900 text-center font-bold text-sm text-[var(--gm-primary)] rounded-lg border border-slate-200 dark:border-slate-700/60 focus:border-[var(--gm-primary)] focus:outline-none h-8 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={localValue}
          onChange={handleInput}
          onBlur={handleCommit}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCommit();
          }}
        />
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">x</span>
      </div>
    </div>
  );
};
