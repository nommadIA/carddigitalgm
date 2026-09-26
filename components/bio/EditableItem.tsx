import React from "react";
import { Edit3 } from "lucide-react";

interface EditableItemProps {
  isEditMode: boolean;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  className?: string;
  badgePosition?: "top-left" | "top-right" | "bottom-right" | "bottom-left" | "inline";
}

export function EditableItem({
  isEditMode,
  label,
  onClick,
  children,
  className = "",
  badgePosition = "top-left"
}: EditableItemProps) {
  if (!isEditMode) {
    return <>{children}</>;
  }

  const badgePositionClass = {
    "top-left": "top-2 left-2",
    "top-right": "top-2 right-2",
    "bottom-right": "bottom-2 right-2",
    "bottom-left": "bottom-2 left-2",
    "inline": "relative ml-2"
  }[badgePosition];

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={`relative group/editable cursor-pointer rounded-2xl transition-all duration-200 outline outline-1 outline-dashed outline-amber-500/40 hover:outline-2 hover:outline-[#FE540B] hover:bg-[#FE540B]/[0.04] hover:shadow-[0_0_25px_rgba(254,84,11,0.2)] ${className}`}
      title={`Clique para editar: ${label}`}
    >
      {/* Floating Micro Badge */}
      <div 
        className={`absolute ${badgePositionClass} z-40 opacity-0 group-hover/editable:opacity-100 transition-all duration-200 pointer-events-none transform -translate-y-1 group-hover/editable:translate-y-0`}
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/90 text-white text-[11px] font-bold border border-[#FE540B] shadow-2xl backdrop-blur-md whitespace-nowrap">
          <Edit3 className="w-3 h-3 text-[#FE540B]" />
          <span>{label}</span>
        </span>
      </div>

      {children}
    </div>
  );
}
