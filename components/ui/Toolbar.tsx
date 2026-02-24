
import React from "react";

export function Toolbar({
  left,
  right,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="gm-card" style={{ padding: 16 }}>
      <div className="gm-row" style={{ justifyContent: "space-between", width: "100%" }}>
        <div className="gm-row">{left}</div>
        <div className="gm-row">{right}</div>
      </div>
    </div>
  );
}
