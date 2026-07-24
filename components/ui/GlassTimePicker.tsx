import React from 'react';

interface GlassTimePickerProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}

export const GlassTimePicker: React.FC<GlassTimePickerProps> = ({
  value = '',
  onChange,
  disabled = false,
  className = '',
  placeholder = '--:--',
  style
}) => {
  return (
    <div className={`relative w-full flex items-center ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
      <input
        type="time"
        value={value || ""}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full bg-transparent font-mono text-sm leading-none focus:outline-none focus:ring-0 border-none select-none cursor-pointer ${className}`}
        style={{
          outline: 'none',
          boxShadow: 'none',
          ...style
        }}
      />
    </div>
  );
};
