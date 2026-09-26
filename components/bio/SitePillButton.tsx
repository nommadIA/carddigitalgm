import React, { useState } from "react";
import { Edit3 } from "lucide-react";

interface SitePillButtonProps {
  label: string;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  target?: string;
  rel?: string;
  className?: string;
  style?: React.CSSProperties;
  isEditMode?: boolean;
  onEdit?: () => void;
  editLabel?: string;
}

export function SitePillButton({
  label,
  onClick,
  href,
  target,
  rel,
  className = "",
  style = {},
  isEditMode = false,
  onEdit,
  editLabel = "Editar Botão"
}: SitePillButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const isWhiteState = isHovered || isPressed;

  const dynamicStyle: React.CSSProperties = {
    backgroundColor: isWhiteState ? "#FFFFFF" : "#FE540B",
    color: isWhiteState ? "#FE540B" : "#FFFFFF",
    border: "none",
    outline: "none",
    boxShadow: isWhiteState 
      ? "0 8px 24px 0 rgba(0, 0, 0, 0.25)" 
      : "0 4px 14px 0 rgba(0, 0, 0, 0.2)",
    transform: isPressed 
      ? "translateY(0) scale(0.97)" 
      : isHovered 
        ? "translateY(-1px) scale(1.02)" 
        : "none",
    borderRadius: "9999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    cursor: "pointer",
    textDecoration: "none",
    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
    userSelect: "none",
    WebkitAppearance: "none",
    appearance: "none",
    ...style
  };

  const handlers = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => {
      setIsHovered(false);
      setIsPressed(false);
    },
    onMouseDown: () => setIsPressed(true),
    onMouseUp: () => setIsPressed(false),
    onTouchStart: () => setIsPressed(true),
    onTouchEnd: () => setIsPressed(false),
  };

  const buttonContent = (
    <span 
      style={{ 
        color: isWhiteState ? "#FE540B" : "#FFFFFF", 
        transition: "color 0.25s ease",
        fontWeight: 800,
        letterSpacing: "0.01em"
      }}
    >
      {label}
    </span>
  );

  const buttonElement = href ? (
    <a
      href={href}
      target={target}
      rel={rel}
      onClick={onClick}
      className={`site-btn-pill px-10 py-4 text-base sm:text-lg select-none ${className}`}
      style={dynamicStyle}
      {...handlers}
    >
      {buttonContent}
    </a>
  ) : (
    <button
      type="button"
      onClick={onClick}
      className={`site-btn-pill px-10 py-4 text-base sm:text-lg select-none ${className}`}
      style={dynamicStyle}
      {...handlers}
    >
      {buttonContent}
    </button>
  );

  if (isEditMode && onEdit) {
    return (
      <div className="relative inline-flex items-center gap-2 group/editbtn">
        {buttonElement}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/85 border border-[#FE540B] text-white text-xs font-bold shadow-lg hover:bg-black hover:scale-105 transition-all cursor-pointer z-50 shrink-0"
          title={editLabel}
        >
          <Edit3 className="w-3.5 h-3.5 text-[#FE540B]" />
          <span>{editLabel}</span>
        </button>
      </div>
    );
  }

  return buttonElement;
}
