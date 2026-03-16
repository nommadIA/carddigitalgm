
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
      <div className="gm-header flex-col md:flex-row items-start md:items-center gap-4">
        <div className="gm-title w-full md:w-auto">
          {typeof title === 'string' ? <h1>{title}</h1> : title}
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="gm-row w-full md:w-auto justify-start md:justify-end">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
