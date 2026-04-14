import React, { useState, useEffect } from "react";

export const ScaleSlider = ({ value, onChange, isMobile }: { value: number, onChange: (v: number) => void, isMobile?: boolean }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setLocalValue(val);
    document.documentElement.style.setProperty(isMobile ? "--gm-mobile-scale" : "--gm-app-scale", String(val));
  };

  const handleCommit = () => {
    onChange(localValue);
  };

  return (
    <div className="flex items-center gap-3 bg-black/10 dark:bg-black/40 backdrop-blur-md p-2 rounded-xl border border-black/10 dark:border-white/10">
      <input 
        type="range" 
        min={0.7} 
        max={3} 
        step={0.05} 
        className="flex-1 h-1.5 accent-[var(--gm-primary)]" 
        value={localValue} 
        onChange={handleInput}
        onMouseUp={handleCommit}
        onTouchEnd={handleCommit}
      />
      <div className="w-10 text-center font-bold text-xs text-[var(--gm-primary)]">{localValue}x</div>
    </div>
  );
};
