
import React from "react";

interface PageProps {
  title: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function Page({ title, subtitle, actions, children }: PageProps) {
  return (
    <div className="animate-fade-in min-h-full flex flex-col">
      <div className="gm-header flex-col items-start justify-between gap-4">
        <div className="gm-title flex-1 min-w-0 w-full">
          {typeof title === 'string' ? <h1>{title}</h1> : title}
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="gm-row shrink-0 w-full overflow-x-auto no-scrollbar pb-1">{actions}</div>}
      </div>
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </div>
  );
}
