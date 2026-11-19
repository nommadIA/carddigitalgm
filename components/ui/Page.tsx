
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
        <div className="gm-header flex flex-col md:flex-row items-center justify-between gap-2.5 md:gap-4 mb-4 md:mb-6 pb-3 md:pb-4 border-b border-[#26262A]">
          <div className="gm-title w-full md:w-auto min-w-0 flex-1 flex flex-col items-center text-center md:items-start md:text-left">
            {typeof title === "string" ? (
              title ? (
                <h1 className="w-full md:w-auto text-[clamp(1.25rem,3.6vw,1.95rem)] font-black tracking-tight text-white flex items-center justify-center md:justify-start gap-2 leading-tight text-center md:text-left">
                  {title}
                </h1>
              ) : null
            ) : (
              title
            )}
            {subtitle && (
              <p className="gm-subtitle-text text-xs md:text-sm font-medium text-[#CBD5E1] mt-1 md:mt-1.5 leading-relaxed text-center md:text-left">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="gm-row w-full md:w-auto shrink-0 flex flex-wrap items-center justify-center md:justify-end gap-2 md:gap-2.5">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col pb-4 sm:pb-6">{children}</div>
    </div>
  );
}
