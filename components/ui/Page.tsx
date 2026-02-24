
import React from "react";

interface PageProps {
  title: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function Page({ title, subtitle, actions, children }: PageProps) {
  return (
    <div className="animate-fade-in">
      <div className="gm-header">
        <div className="gm-title">
          {typeof title === 'string' ? <h1>{title}</h1> : title}
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="gm-row">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
