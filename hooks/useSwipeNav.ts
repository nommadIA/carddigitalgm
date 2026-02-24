import { useEffect, useRef } from "react";

type Options = {
  enabled?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  thresholdPx?: number;     // distância mínima
  restraintPx?: number;     // tolerância vertical
  allowedTimeMs?: number;   // tempo máximo
};

export function useSwipeNav<T extends HTMLElement>({
  enabled = true,
  onSwipeLeft,
  onSwipeRight,
  thresholdPx = 60,
  restraintPx = 80,
  allowedTimeMs = 450,
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
          "input, textarea, select, button, a, [data-no-swipe], .no-swipe"
        )
      );
    };

    const onTouchStart = (e: TouchEvent) => {
      if (isInteractiveTarget(e.target)) return;
      const t = e.changedTouches[0];
      tracking = true;
      startX = t.pageX;
      startY = t.pageY;
      startTime = Date.now();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return;
      // Se quiser bloquear “voltar página” do browser em iOS, mantenha:
      // e.preventDefault();
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;

      const t = e.changedTouches[0];
      const distX = t.pageX - startX;
      const distY = t.pageY - startY;
      const elapsed = Date.now() - startTime;

      if (elapsed > allowedTimeMs) return;
      if (Math.abs(distY) > restraintPx) return;
      if (Math.abs(distX) < thresholdPx) return;

      if (distX < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, onSwipeLeft, onSwipeRight, thresholdPx, restraintPx, allowedTimeMs]);

  return ref;
}