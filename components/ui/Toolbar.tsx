
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
      <div className="flex items-center justify-between gap-3 w-full flex-wrap">
        <div className="flex items-center gap-2">{left}</div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </div>
  );
}
