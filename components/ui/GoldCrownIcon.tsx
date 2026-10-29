import React from "react";

interface GoldCrownIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Ícone da Coroa em Planos:
 * - Dourada pura e brilhante (#FFD700)
 * - Animação suave de pulsar levemente
 * - Sem esfumaçado, blur ou sombras atrás
 */
export default function GoldCrownIcon({ size = 20, className = "", style }: GoldCrownIconProps) {
  return (
    <span 
      className={`inline-flex items-center justify-center shrink-0 select-none gm-gold-crown-container ${className}`}
      style={{
        filter: "none",
        boxShadow: "none",
        background: "transparent",
        ...style,
      }}
      aria-label="Planos"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="gm-gold-crown-svg shrink-0"
        style={{
          filter: "none",
          overflow: "visible",
        }}
      >
        {/* Corpo da Coroa em tom dourado puro */}
        <path
          d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"
          fill="#FFD700"
          fillOpacity="0.32"
          stroke="#FFD700"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Linha da base da coroa */}
        <path
          d="M5 20h14"
          stroke="#FFD700"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Joias luminosas nos ápices da coroa */}
        <circle cx="12" cy="4" r="1.3" fill="#FFF9A6" stroke="#FFD700" strokeWidth="0.8" />
        <circle cx="2" cy="4" r="1.1" fill="#FFF9A6" stroke="#FFD700" strokeWidth="0.8" />
        <circle cx="22" cy="4" r="1.1" fill="#FFF9A6" stroke="#FFD700" strokeWidth="0.8" />
      </svg>
    </span>
  );
}
