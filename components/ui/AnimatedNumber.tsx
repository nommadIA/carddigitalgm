import React, { useEffect, useRef, useState } from "react";

export interface UseCountUpOptions {
  duration?: number;
  replayKey?: string | number | boolean;
  replayOnVisibility?: boolean;
  enabled?: boolean;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Animates a numeric value smoothly from 0 on mount (and on replayKey/visibility change)
 * or from its current displayed value whenever `target` changes.
 */
export function useCountUp(target: number, options: UseCountUpOptions = {}): number {
  const {
    duration = 820,
    replayKey,
    replayOnVisibility = true,
    enabled = true,
  } = options;

  const safeTarget = Number.isFinite(target) ? target : 0;
  const [display, setDisplay] = useState<number>(() =>
    !enabled || prefersReducedMotion() ? safeTarget : 0
  );

  const currentRef = useRef<number>(display);
  const rafRef = useRef<number | null>(null);
  const lastReplayKeyRef = useRef(replayKey);
  const lastVisibilityNonceRef = useRef(0);
  const [visibilityNonce, setVisibilityNonce] = useState(0);

  // Keep ref in sync
  currentRef.current = display;

  // Replay from 0 when returning to the browser window/tab after being hidden
  useEffect(() => {
    if (!replayOnVisibility || !enabled || typeof document === "undefined") return;
    let wasHidden = document.visibilityState === "hidden";

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        wasHidden = true;
      } else if (document.visibilityState === "visible" && wasHidden) {
        wasHidden = false;
        setVisibilityNonce((n) => n + 1);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [replayOnVisibility, enabled]);

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      setDisplay(safeTarget);
      currentRef.current = safeTarget;
      return;
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const replayTriggered =
      lastReplayKeyRef.current !== replayKey ||
      lastVisibilityNonceRef.current !== visibilityNonce;
    lastReplayKeyRef.current = replayKey;
    lastVisibilityNonceRef.current = visibilityNonce;

    const from = replayTriggered ? 0 : currentRef.current;

    if (replayTriggered) {
      currentRef.current = 0;
      setDisplay(0);
    }

    if (Math.abs(safeTarget - from) < 1e-6) {
      setDisplay(safeTarget);
      currentRef.current = safeTarget;
      return;
    }

    let startTime: number | null = null;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / Math.max(120, duration), 1);
      // Ease-out cubic for crisp deceleration into the final number
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (safeTarget - from) * eased;

      currentRef.current = next;
      setDisplay(next);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        currentRef.current = safeTarget;
        setDisplay(safeTarget);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [safeTarget, duration, replayKey, visibilityNonce, enabled]);

  return display;
}

export interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  currency?: boolean;
  currencyPrefix?: string;
  prefix?: string;
  suffix?: string;
  duration?: number;
  replayKey?: string | number | boolean;
  replayOnVisibility?: boolean;
  className?: string;
  formatter?: (val: number) => string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 0,
  currency = false,
  currencyPrefix,
  prefix = "",
  suffix = "",
  duration = 820,
  replayKey,
  replayOnVisibility = true,
  className,
  formatter,
}) => {
  const animated = useCountUp(value, {
    duration,
    replayKey,
    replayOnVisibility,
  });

  const formatted = React.useMemo(() => {
    const isFinal = Math.abs(animated - value) < 1e-6;
    const raw = isFinal ? value : animated;

    if (formatter) {
      return formatter(raw);
    }

    if (currency) {
      if (currencyPrefix !== undefined) {
        const negative = raw < 0;
        const absVal = Math.abs(raw);
        const rounded =
          decimals === 0 ? Math.round(absVal) : Number(absVal.toFixed(decimals));
        const numStr = rounded.toLocaleString("pt-BR", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
        return `${negative ? "-" : ""}${currencyPrefix}${numStr}${suffix}`;
      }
      return `${raw.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;
    }

    const rounded =
      decimals === 0 ? Math.round(raw) : Number(raw.toFixed(decimals));
    return `${prefix}${rounded.toLocaleString("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`;
  }, [animated, value, decimals, currency, currencyPrefix, prefix, suffix, formatter]);

  return <span className={className ? `tabular-nums ${className}` : "tabular-nums"}>{formatted}</span>;
};

export interface ParsedMetricFigure {
  numericValue: number;
  decimals: number;
  isCurrency: boolean;
  currencyPrefix: string;
  prefix: string;
  suffix: string;
}

/**
 * Extracts a numeric value and Brazilian formatting metadata from `figure`
 * (supports raw numbers, "R$ 31.680", "R$ 31.549,90", "-R$ 120,50", "32", etc.)
 */
export function parseMetricFigure(figure: React.ReactNode): ParsedMetricFigure | null {
  if (typeof figure === "number") {
    if (!Number.isFinite(figure)) return null;
    const str = String(figure);
    const decMatch = str.match(/\.(\d+)$/);
    return {
      numericValue: figure,
      decimals: decMatch ? decMatch[1].length : 0,
      isCurrency: false,
      currencyPrefix: "",
      prefix: "",
      suffix: "",
    };
  }

  if (typeof figure !== "string") return null;

  const trimmed = figure.trim();
  if (!trimmed) return null;

  // Match Brazilian currency e.g. "R$ 31.680", "R$\u00A031.549,90", "-R$ 120,00"
  const brlMatch = trimmed.match(/^(-?\s*R\$[\s\u00A0]*)(-?)([\d.]+(?:,\d+)?)(.*)$/);
  if (brlMatch) {
    const [, rawLead, innerSign, numToken, suffix] = brlMatch;
    const isNegative = rawLead.includes("-") || innerSign === "-";
    const cleanLead = rawLead.replace("-", "");
    const commaIdx = numToken.indexOf(",");
    const decimals = commaIdx >= 0 ? numToken.length - commaIdx - 1 : 0;
    const normalized = Number(numToken.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(normalized)) return null;

    return {
      numericValue: isNegative ? -normalized : normalized,
      decimals,
      isCurrency: true,
      currencyPrefix: cleanLead,
      prefix: "",
      suffix: suffix || "",
    };
  }

  // Match plain formatted number e.g. "32", "1.250", "+9", "45,5%"
  const numMatch = trimmed.match(/^([+-]?)([\d.]+(?:,\d+)?)(.*)$/);
  if (numMatch) {
    const [, sign, numToken, suffix] = numMatch;
    // Only auto-parse if the suffix is empty or a simple unit/percent (not dates or IDs like "14/11/2026")
    if (suffix && (suffix.startsWith("/") || suffix.startsWith(":") || suffix.startsWith("-"))) {
      return null;
    }
    const commaIdx = numToken.indexOf(",");
    const decimals = commaIdx >= 0 ? numToken.length - commaIdx - 1 : 0;
    const normalized = Number(numToken.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(normalized)) return null;

    return {
      numericValue: sign === "-" ? -normalized : normalized,
      decimals,
      isCurrency: false,
      currencyPrefix: "",
      prefix: sign === "+" ? "+" : "",
      suffix: suffix || "",
    };
  }

  return null;
}

export default AnimatedNumber;
