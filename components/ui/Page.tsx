
import React from "react";

interface PageProps {
  title: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function Page({ title, subtitle, actions, children, className }: PageProps) {
  const showHeader = title || subtitle || actions;

  return (
    <div className={`animate-fade-in min-h-full flex flex-col ${className || ""}`}>
      {showHeader && (
        <div className="gm-header flex flex-row items-center justify-between gap-4 mb-4 pb-2 border-b border-slate-200/60 dark:border-white/10">
          <div className="gm-title min-w-0 flex-1">
            {typeof title === 'string' ? (
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                {title}
              </h1>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="gm-row shrink-0 flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </div>
  );
}
