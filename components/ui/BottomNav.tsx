
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  Receipt,
  ShoppingCart,
  BarChart3,
  Settings,
  StickyNote,
  Smartphone,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const items = [
  { to: "/", label: "Início", icon: LayoutDashboard },
  { to: "/budgets", label: "Orç.", icon: FileText },
  { to: "/clients", label: "Client", icon: Users },
  { to: "/expenses", label: "Desp.", icon: Receipt },
  { to: "/market", label: "Mkt", icon: ShoppingCart },
  { to: "/notes", label: "Notas", icon: StickyNote },
  { to: "/financial", label: "Fin.", icon: BarChart3 },
  { to: "/minha-bio", label: "Bio", icon: Smartphone },
  { to: "/configuracoes", label: "Conf.", icon: Settings },
];

export default function BottomNav() {
  const [isVisible, setIsVisible] = useState(false);
  React.useEffect(() => {
    if (isVisible) {
      document.body.classList.add('bottom-nav-visible');
    } else {
      document.body.classList.remove('bottom-nav-visible');
    }
    return () => document.body.classList.remove('bottom-nav-visible');
  }, [isVisible]);

  return (
    <>
      <AnimatePresence>
        {!isVisible && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-[10001] flex justify-center"
          >
            <button
              onClick={() => setIsVisible(true)}
              className="bg-[var(--gm-primary)] text-white text-xs font-black uppercase tracking-widest px-10 py-3 rounded-t-2xl rounded-b-none shadow-[0_-4px_20px_rgba(255,105,0,0.35)] backdrop-blur-md active:scale-95 transition-transform duration-150 flex items-center gap-2 border-t border-x border-white/20"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              MENU
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 32 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-[10002] bg-[#0c0e12]/90 dark:bg-[#0c0e12]/92 backdrop-blur-2xl saturate-[1.8] border-t border-white/12 pb-[calc(env(safe-area-inset-bottom,12px)+10px)] shadow-[0_-12px_48px_rgba(0,0,0,0.7)] touch-none rounded-t-3xl"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 50 || velocity.y > 500) {
                setIsVisible(false);
              }
            }}
          >
            <div className="w-full flex justify-center pt-2.5 pb-2 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1 bg-white/25 rounded-full transition-all hover:bg-white/40" />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto px-4 pb-2 no-scrollbar" style={{ scrollSnapType: 'x mandatory' }}>
              {items.map((it) => {
                const Icon = it.icon;
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    onClick={() => setIsVisible(false)}
                    className={({ isActive }) =>
                      `flex flex-col items-center justify-center min-w-[74px] h-[66px] rounded-2xl transition-all duration-200 scroll-snap-align-start active:scale-95 ${
                        isActive 
                          ? "bg-white/10 text-white border border-white/15 shadow-sm" 
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={`p-1 transition-all ${isActive ? 'text-[var(--gm-primary)] scale-110 drop-shadow-[0_0_10px_rgba(255,105,0,0.5)]' : 'opacity-70'}`}>
                          <Icon size={22} />
                        </div>
                        <span className={`text-[11px] font-bold mt-0.5 tracking-tight ${isActive ? 'text-white font-extrabold' : 'opacity-65'}`}>
                          {it.label}
                        </span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
