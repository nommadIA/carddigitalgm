import React from "react";

interface GridProps {
  cols?: number;
  className?: string;
  children?: React.ReactNode;
}

export function Grid({ cols = 1, className = "", children }: GridProps) {
  let colClass = "";
  if (cols === 2) colClass = "gm-grid-2";
  if (cols === 3) colClass = "gm-grid-3";
  if (cols === 4) colClass = "gm-grid-4";

  return (
    <div className={`gm-grid ${colClass} ${className}`}>
      {children}
    </div>
  );
}