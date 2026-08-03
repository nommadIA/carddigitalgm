import React from "react";

/**
 * Separador de seção: rótulo em caixa alta + linha fina.
 * Usado para organizar páginas em blocos visuais claros (Dashboard, Orçamentos, etc.)
 */
export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-[11px] font-bold tracking-widest text-[color:var(--gm-text-tertiary)] uppercase whitespace-nowrap">
        {label}
      </span>
      <div className="h-px flex-1 bg-[color:var(--gm-border-light)]" />
    </div>
  );
}
