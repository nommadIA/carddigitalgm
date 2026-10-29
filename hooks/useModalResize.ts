import { useState, useRef, useEffect, useCallback } from "react";
import { ResizeDirection } from "../components/ui/ModalResizeHandles";

interface UseModalResizeOptions {
  storageKey: string;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  modalRef: React.RefObject<HTMLElement | null>;
}

export function useModalResize({
  storageKey,
  defaultWidth,
  defaultHeight,
  minWidth = 380,
  minHeight = 320,
  modalRef,
}: UseModalResizeOptions) {
  const [modalCustomSize, setModalCustomSize] = useState<{ width?: number; height?: number }>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.width || parsed.height)) {
          return { width: parsed.width, height: parsed.height };
        }
      }
    } catch {}
    return defaultWidth || defaultHeight ? { width: defaultWidth, height: defaultHeight } : {};
  });

  const isResizingRef = useRef(false);

  const handleResizeStart = useCallback(
    (e: React.PointerEvent, direction: ResizeDirection) => {
      e.preventDefault();
      e.stopPropagation();
      isResizingRef.current = true;

      const modalEl = modalRef.current;
      if (!modalEl) return;

      try {
        if ((e.currentTarget as any).setPointerCapture) {
          (e.currentTarget as any).setPointerCapture(e.pointerId);
        }
      } catch {}

      const rect = modalEl.getBoundingClientRect();
      const startW = rect.width;
      const startH = rect.height;
      const startX = e.clientX;
      const startY = e.clientY;

      modalEl.style.transition = "none";
      modalEl.style.willChange = "width, height, max-height";
      document.body.style.userSelect = "none";
      (document.body.style as any).webkitUserSelect = "none";

      const cursorMap: Record<string, string> = {
        nw: "nwse-resize",
        se: "nwse-resize",
        ne: "nesw-resize",
        sw: "nesw-resize",
        n: "ns-resize",
        s: "ns-resize",
        e: "ew-resize",
        w: "ew-resize",
      };
      document.body.style.cursor = cursorMap[direction] || "crosshair";

      let lastW = startW;
      let lastH = startH;
      let rafId: number | null = null;

      const onPointerMove = (moveEv: PointerEvent) => {
        if (!isResizingRef.current) return;
        moveEv.preventDefault();
        const deltaX = moveEv.clientX - startX;
        const deltaY = moveEv.clientY - startY;

        let newW = startW;
        let newH = startH;

        if (direction === "se") {
          newW = startW + deltaX * 2;
          newH = startH + deltaY * 2;
        } else if (direction === "sw") {
          newW = startW - deltaX * 2;
          newH = startH + deltaY * 2;
        } else if (direction === "ne") {
          newW = startW + deltaX * 2;
          newH = startH - deltaY * 2;
        } else if (direction === "nw") {
          newW = startW - deltaX * 2;
          newH = startH - deltaY * 2;
        } else if (direction === "e") {
          newW = startW + deltaX * 2;
        } else if (direction === "w") {
          newW = startW - deltaX * 2;
        } else if (direction === "s") {
          newH = startH + deltaY * 2;
        } else if (direction === "n") {
          newH = startH - deltaY * 2;
        }

        const maxW = Math.max(minWidth, window.innerWidth - 32);
        const maxH = Math.max(minHeight, window.innerHeight - 32);

        const clampedW = Math.round(Math.max(minWidth, Math.min(maxW, newW)));
        const clampedH = Math.round(Math.max(minHeight, Math.min(maxH, newH)));

        lastW = clampedW;
        lastH = clampedH;

        if (!rafId) {
          rafId = requestAnimationFrame(() => {
            if (modalEl) {
              modalEl.style.width = `${lastW}px`;
              modalEl.style.maxWidth = `${lastW}px`;
              modalEl.style.height = `${lastH}px`;
              modalEl.style.maxHeight = `${lastH}px`;
            }
            rafId = null;
          });
        }
      };

      const onPointerUp = (upEv: PointerEvent) => {
        isResizingRef.current = false;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }

        try {
          if ((e.currentTarget as any).releasePointerCapture) {
            (e.currentTarget as any).releasePointerCapture(upEv.pointerId);
          }
        } catch {}

        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);

        if (modalEl) {
          modalEl.style.transition = "";
          modalEl.style.willChange = "";
        }
        document.body.style.userSelect = "";
        (document.body.style as any).webkitUserSelect = "";
        document.body.style.cursor = "";

        setModalCustomSize({ width: lastW, height: lastH });
        try {
          localStorage.setItem(storageKey, JSON.stringify({ width: lastW, height: lastH }));
        } catch {}
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    },
    [minHeight, minWidth, modalRef, storageKey]
  );

  const handleResetSize = useCallback(() => {
    setModalCustomSize({});
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    if (modalRef.current) {
      modalRef.current.style.width = "";
      modalRef.current.style.maxWidth = "";
      modalRef.current.style.height = "";
      modalRef.current.style.maxHeight = "";
    }
  }, [modalRef, storageKey]);

  return {
    modalCustomSize,
    handleResizeStart,
    handleResetSize,
  };
}
