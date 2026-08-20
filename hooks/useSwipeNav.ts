import { useEffect, useRef } from "react";

type Options = {
  enabled?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  thresholdPx?: number;      // distância mínima do swipe
  restraintPx?: number;      // tolerância vertical
  allowedTimeMs?: number;    // tempo máximo do gesto
  stopPropagation?: boolean; // parar propagação do evento
};

export function useSwipeNav<T extends HTMLElement>({
  enabled = true,
  onSwipeLeft,
  onSwipeRight,
  thresholdPx = 50,
  restraintPx = 100,
  allowedTimeMs = 500,
  stopPropagation = false,
}: Options) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;

    const isInteractiveTarget = (target: EventTarget | null) => {
      const node = target as HTMLElement | null;
      if (!node) return false;
      return Boolean(
        node.closest(
          "input, textarea, select, button, a, [data-no-swipe], .no-swipe, .gm-date-picker-popup"
        )
      );
    };

    const onTouchStart = (e: TouchEvent) => {
      if (isInteractiveTarget(e.target)) return;
      if (stopPropagation) e.stopPropagation();
      const t = e.changedTouches[0];
      tracking = true;
      startX = t.pageX;
      startY = t.pageY;
      startTime = Date.now();
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      if (stopPropagation) e.stopPropagation();
      tracking = false;

      const t = e.changedTouches[0];
      const distX = t.pageX - startX;
      const distY = t.pageY - startY;
      const elapsed = Date.now() - startTime;
      const absX = Math.abs(distX);
      const absY = Math.abs(distY);

      if (elapsed > allowedTimeMs) return;

      // Swipe Horizontal predominante
      if (absX >= thresholdPx && absX >= absY * 1.5 && absY <= restraintPx) {
        if (distX < 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, onSwipeLeft, onSwipeRight, thresholdPx, restraintPx, allowedTimeMs, stopPropagation]);

  return ref;
}

