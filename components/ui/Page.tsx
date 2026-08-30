
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
        <div className="gm-header flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-200/60 dark:border-white/10">
          <div className="gm-title min-w-0 flex-1">
            {typeof title === 'string' ? (
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                {title}
              </h1>
            ) : (
              title
            )}
            {subtitle && (
              <p className="gm-subtitle-text text-sm sm:text-base md:text-lg font-medium text-slate-500 dark:text-slate-300 mt-1.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="gm-row shrink-0 flex flex-wrap items-center gap-2 sm:gap-3">{actions}</div>}
        </div>
      )}
      <div className="flex-1 min-h-0 flex flex-col pb-4 sm:pb-6 md:pb-8">{children}</div>
    </div>
  );
}
