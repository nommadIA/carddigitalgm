import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ResponsiveContainer } from "recharts";

/**
 * Recharts às vezes calcula width/height como -1 quando o container está
 * "invisível" no primeiro paint (transição/rota/overflow).
 * Esse wrapper só libera o gráfico quando temos dimensões reais e passa
 * números fixos para o ResponsiveContainer (evita o warning de -1).
 */
export default function SafeResponsive({
  height = 300,
  children,
}: {
  height?: number;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const raf = useRef<number | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const measure = () => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();

    // Em alguns cenários (display:none / mount inicial), pode vir 0 ou até -1.
    const w = Math.max(0, Math.floor(rect.width));
    const h = Math.max(0, Math.floor(rect.height));

    // Só considera pronto se realmente tiver espaço.
    if (w > 8 && h > 8) setSize({ w, h });
    else setSize(null);
  };

  useLayoutEffect(() => {
    measure();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(measure);
    });

    ro.observe(el);

    // mede novamente após mount e após micro-transições
    const t1 = window.setTimeout(measure, 60);
    const t2 = window.setTimeout(measure, 220);
    const t3 = window.setTimeout(measure, 600);

    return () => {
      ro.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="gm-chart"
      style={{
        height,
        minHeight: height,
        width: "100%",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      {size ? (
        <ResponsiveContainer width={size.w} height={size.h}>
          {children as any}
        </ResponsiveContainer>
      ) : (
        <div style={{ height, width: "100%" }} />
      )}
    </div>
  );
}