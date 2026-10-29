import React from "react";

export type ResizeDirection = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

interface ModalResizeHandlesProps {
  onResizeStart: (e: React.PointerEvent, direction: ResizeDirection) => void;
  onResetSize?: () => void;
  accentColor?: string;
  className?: string;
}

export const ModalResizeHandles: React.FC<ModalResizeHandlesProps> = ({
  onResizeStart,
  onResetSize,
  accentColor = "var(--gm-primary, #FE540B)",
  className = "",
}) => {
  return (
    <>
      {/* Canto 1: Superior Esquerdo (NW) */}
      <div
        onPointerDown={(e) => onResizeStart(e, "nw")}
        onDoubleClick={onResetSize}
        className={`hidden md:flex absolute top-0 left-0 w-8 h-8 items-start justify-start p-1.5 cursor-nwse-resize select-none z-40 group touch-none ${className}`}
        title="Clique e arraste para redimensionar (Duplo clique para restaurar)"
      >
        <div className="w-5 h-5 flex items-center justify-center rounded-tl-md transition-all duration-200 group-hover:scale-110">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            className="text-white/40 transition-all duration-200 drop-shadow-sm group-hover:drop-shadow-[0_0_8px_rgba(254,84,11,0.8)]"
            style={{ color: undefined }}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <line x1="2" y1="12" x2="12" y2="2" />
            <line x1="2" y1="7" x2="7" y2="2" />
          </svg>
        </div>
      </div>

      {/* Canto 2: Superior Direito (NE) */}
      <div
        onPointerDown={(e) => onResizeStart(e, "ne")}
        onDoubleClick={onResetSize}
        className={`hidden md:flex absolute top-0 right-0 w-8 h-8 items-start justify-end p-1.5 cursor-nesw-resize select-none z-40 group touch-none ${className}`}
        title="Clique e arraste para redimensionar (Duplo clique para restaurar)"
      >
        <div className="w-5 h-5 flex items-center justify-center rounded-tr-md transition-all duration-200 group-hover:scale-110">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            className="text-white/40 transition-all duration-200 drop-shadow-sm group-hover:drop-shadow-[0_0_8px_rgba(254,84,11,0.8)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <line x1="2" y1="2" x2="12" y2="12" />
            <line x1="7" y1="2" x2="12" y2="7" />
          </svg>
        </div>
      </div>

      {/* Canto 3: Inferior Esquerdo (SW) */}
      <div
        onPointerDown={(e) => onResizeStart(e, "sw")}
        onDoubleClick={onResetSize}
        className={`hidden md:flex absolute bottom-0 left-0 w-8 h-8 items-end justify-start p-1.5 cursor-nesw-resize select-none z-40 group touch-none ${className}`}
        title="Clique e arraste para redimensionar (Duplo clique para restaurar)"
      >
        <div className="w-5 h-5 flex items-center justify-center rounded-bl-md transition-all duration-200 group-hover:scale-110">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            className="text-white/40 transition-all duration-200 drop-shadow-sm group-hover:drop-shadow-[0_0_8px_rgba(254,84,11,0.8)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <line x1="2" y1="2" x2="12" y2="12" />
            <line x1="2" y1="7" x2="7" y2="12" />
          </svg>
        </div>
      </div>

      {/* Canto 4: Inferior Direito (SE) */}
      <div
        onPointerDown={(e) => onResizeStart(e, "se")}
        onDoubleClick={onResetSize}
        className={`hidden md:flex absolute bottom-0 right-0 w-8 h-8 items-end justify-end p-1.5 cursor-nwse-resize select-none z-40 group touch-none ${className}`}
        title="Clique e arraste para redimensionar (Duplo clique para restaurar)"
      >
        <div className="w-5 h-5 flex items-center justify-center rounded-br-md transition-all duration-200 group-hover:scale-110">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            className="text-white/40 transition-all duration-200 drop-shadow-sm group-hover:drop-shadow-[0_0_8px_rgba(254,84,11,0.8)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <line x1="2" y1="12" x2="12" y2="2" />
            <line x1="7" y1="12" x2="12" y2="7" />
          </svg>
        </div>
      </div>

      {/* Guias das 4 Bordas Laterais e Verticais */}
      <div
        onPointerDown={(e) => onResizeStart(e, "n")}
        onDoubleClick={onResetSize}
        className="hidden md:block absolute top-0 left-10 right-10 h-2 cursor-ns-resize select-none z-30 hover:bg-[#FE540B]/25 transition-colors touch-none"
        title="Redimensionar altura (topo) - Duplo clique para restaurar"
      />
      <div
        onPointerDown={(e) => onResizeStart(e, "s")}
        onDoubleClick={onResetSize}
        className="hidden md:block absolute bottom-0 left-10 right-10 h-2 cursor-ns-resize select-none z-30 hover:bg-[#FE540B]/25 transition-colors touch-none"
        title="Redimensionar altura (base) - Duplo clique para restaurar"
      />
      <div
        onPointerDown={(e) => onResizeStart(e, "w")}
        onDoubleClick={onResetSize}
        className="hidden md:block absolute top-10 bottom-10 left-0 w-2 cursor-ew-resize select-none z-30 hover:bg-[#FE540B]/25 transition-colors touch-none"
        title="Redimensionar largura (esquerda) - Duplo clique para restaurar"
      />
      <div
        onPointerDown={(e) => onResizeStart(e, "e")}
        onDoubleClick={onResetSize}
        className="hidden md:block absolute top-10 bottom-10 right-0 w-2 cursor-ew-resize select-none z-30 hover:bg-[#FE540B]/25 transition-colors touch-none"
        title="Redimensionar largura (direita) - Duplo clique para restaurar"
      />
    </>
  );
};

export default ModalResizeHandles;
