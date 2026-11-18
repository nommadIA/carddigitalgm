
import React from "react";

interface PageProps {
  title: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function Page({ title, subtitle, actions, children, className }: PageProps) {
  const showHeader = Boolean(title || subtitle || actions);

  return (
    <div className={`min-h-full flex flex-col w-full min-w-0 ${className || ""}`}>
      {showHeader && (
        <div className="gm-header flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 pb-4 border-b border-[#26262A]">
          <div className="gm-title min-w-0 flex-1">
            {typeof title === "string" ? (
              title ? (
                <h1 className="text-[clamp(1.5rem,2.4vw,2rem)] font-black tracking-tight text-white flex items-center gap-2.5 leading-tight">
                  {title}
                </h1>
              ) : null
            ) : (
              title
            )}
            {subtitle && (
              <p className="gm-subtitle-text text-sm font-medium text-[#CBD5E1] mt-1.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="gm-row w-full sm:w-auto shrink-0 flex flex-wrap items-center gap-2.5">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col pb-4 sm:pb-6">{children}</div>
    </div>
  );
}
