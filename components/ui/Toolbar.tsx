
import React from "react";

export function Toolbar({
  left,
  right,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="gm-card gm-compact">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 w-full">
        <div className="flex flex-wrap items-center gap-2 min-w-0">{left}</div>
        <div className="flex flex-wrap items-center gap-2 min-w-0 sm:justify-end">{right}</div>
      </div>
    </div>
  );
}
