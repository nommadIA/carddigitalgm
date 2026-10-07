import React from "react";
import { BorderBeam } from "./BorderBeam";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClick?: (e?: any) => void;
  style?: React.CSSProperties;
  key?: React.Key | null | undefined;
  id?: string;
  borderBeam?: boolean;
}

export const Card = ({
  title,
  right,
  children,
  className = "",
  style,
  onClick,
  id,
  borderBeam = true,
  ...rest
}: CardProps) => {
  return (
    <div
      id={id}
      className={`relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden transition-all ${
        onClick ? "cursor-pointer active:scale-[0.985] transition-transform duration-150" : ""
      } ${className}`}
      onClick={onClick}
      style={{
        width: "100%",
        minWidth: 0,
        ...style
      }}
      {...rest}
    >
      {/* Feixe de Luz BorderBeam nos containers */}
      {borderBeam && <BorderBeam duration={6} borderWidth={1.2} color="#ffffff" />}

      {(title || right) && (
        <div className="gm-card-header relative z-10">
          <div className="gm-card-title">
            {title ? <h3>{title}</h3> : null}
          </div>
          {right ? <div>{right}</div> : null}
        </div>
      )}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
};