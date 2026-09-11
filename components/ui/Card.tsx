import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClick?: (e?: any) => void;
  style?: React.CSSProperties;
  key?: React.Key | null | undefined;
  id?: string;
}

export const Card = ({ title, right, children, className = "", style, onClick, id, ...rest }: CardProps) => {
  return (
    <div
      id={id}
      className={`gm-card ${onClick ? "cursor-pointer active:scale-[0.985] transition-transform duration-150" : ""} ${className}`}
      onClick={onClick}
      style={{
        width: "100%",
        minWidth: 0,
        ...style
      }}
      {...rest}
    >
      {(title || right) && (
        <div className="gm-card-header">
          <div className="gm-card-title">
            {title ? <h3>{title}</h3> : null}
          </div>
          {right ? <div>{right}</div> : null}
        </div>
      )}
      {children}
    </div>
  );
};