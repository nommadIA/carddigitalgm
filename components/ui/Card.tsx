import React from "react";

export interface CardProps {
  title?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  key?: React.Key | null | undefined;
}

export const Card = ({ title, right, children, className = "", style, onClick }: CardProps) => {
  return (
    <div
      className={`gm-card ${className}`}
      onClick={onClick}
      style={{
        width: "100%",
        minWidth: 0,
        ...style
      }}
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