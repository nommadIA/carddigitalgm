import React from "react";

/**
 * Separador de seção limpo com efeito glass na cor branca (sem sombras):
 * - Nome com efeito glass branco puro
 * - Linha com efeito glass branco, sem sombras
 */
export function SectionDivider({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`gm-section-divider ${className}`}>
      <span className="gm-section-title">{label}</span>
      <div className="gm-section-line" />
    </div>
  );
}

