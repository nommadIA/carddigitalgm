import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export type AnimatedTabsProps = {
  tabs?: Array<{ key: string; label: string; icon?: React.ReactNode; dotColor?: string } | string>;
  activeTab?: string;
  onChange?: (tab: string) => void;
  variant?: "default" | "underline";
  className?: string;
};

const defaultTabs = ["Home", "Components", "Docs", "Templates"];

export const AnimatedTabs = ({
  tabs = defaultTabs,
  activeTab: controlledActiveTab,
  onChange,
  variant = "default",
  className,
}: AnimatedTabsProps) => {
  const [internalActiveTab, setInternalActiveTab] = useState(
    typeof tabs[0] === "string" ? tabs[0] : tabs[0]?.key || ""
  );

  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const handleSelect = (tabKey: string) => {
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(tabKey);
    }
    onChange?.(tabKey);
  };

  const normalizedTabs = tabs.map((t) =>
    typeof t === "string" ? { key: t, label: t } : t
  );

  if (variant === "underline") {
    return (
      <div className={cn("relative flex items-center border-b border-white/10", className)}>
        {normalizedTabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleSelect(tab.key)}
              className={cn(
                "relative flex h-10 items-center px-4 text-xs sm:text-sm font-bold transition-colors duration-200 cursor-pointer select-none",
                isActive
                  ? "text-[var(--gm-primary)]"
                  : "text-zinc-400 hover:text-white",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab-underline"
                  className="bg-[var(--gm-primary)] absolute right-0 bottom-0 left-0 h-0.5"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative mx-auto flex w-fit items-center rounded-full border border-white/[0.08] bg-[#121215] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className
      )}
    >
      {normalizedTabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleSelect(tab.key)}
            className={cn(
              "relative flex h-8 items-center rounded-full px-3.5 text-xs font-black uppercase tracking-wider transition-colors duration-200 cursor-pointer select-none",
              isActive
                ? "text-zinc-950 font-black"
                : "text-zinc-400 hover:text-white",
            )}
          >
            {isActive && (
              <motion.div
                layoutId="active-tab-background"
                className="absolute inset-0 rounded-full bg-white shadow-[0_2px_12px_rgba(255,255,255,0.25)]"
                initial={false}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.dotColor && (
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", tab.dotColor)} />
              )}
              {tab.icon}
              <span>{tab.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default AnimatedTabs;
