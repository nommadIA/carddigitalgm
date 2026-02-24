
import React from "react";

type Props = {
  title?: string;
  height?: number; // px
  className?: string;
  children?: React.ReactNode;
};

export default function ChartBox({ title, height = 260, className = "", children }: Props) {
  return (
    <div className={["w-full min-w-0", className].filter(Boolean).join(" ")}>
      {title ? <div className="mb-2 text-sm font-semibold text-white/80">{title}</div> : null}

      {/* O PONTO CRÍTICO: altura REAL + min-height */}
      <div
        className="w-full min-w-0"
        style={{ height, minHeight: height }}
      >
        {children}
      </div>
    </div>
  );
}
