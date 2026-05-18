
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const items = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/budgets", label: "Orç.", icon: FileText },
  { to: "/clients", label: "Client", icon: Users },
  { to: "/expenses", label: "Desp.", icon: Receipt },
  { to: "/market", label: "Mkt", icon: ShoppingCart },
  { to: "/financial", label: "Fin.", icon: BarChart3 },
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
              className="bg-[var(--gm-primary)] text-white text-sm font-black uppercase tracking-wider px-12 py-2.5 rounded-t-2xl rounded-b-none shadow-lg shadow-black/50"
            >
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
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-[10002] bg-[rgba(15,15,15,0.85)] backdrop-blur-[16px] saturate-[1.5] border-t border-white/10 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.6)] touch-none"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 50 || velocity.y > 500) {
                setIsVisible(false);
              }
            }}
          >
            <div className="w-full flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-40 h-1.5 bg-white/20 rounded-full" />
            </div>
            
            <div className="flex items-center gap-1 overflow-x-auto px-3 pb-2 no-scrollbar" style={{ scrollSnapType: 'x mandatory' }}>
              {items.map((it) => {
                const Icon = it.icon;
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    onClick={() => setIsVisible(false)}
                    className={({ isActive }) =>
                      `flex flex-col items-center justify-center min-w-[72px] h-[64px] rounded-2xl transition-all duration-300 scroll-snap-align-start ${
                        isActive 
                          ? "text-white" 
                          : "text-slate-500 hover:text-slate-300 active:scale-90"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={`p-1.5 transition-all ${isActive ? 'text-[var(--gm-primary)] drop-shadow-[0_0_8px_var(--gm-primary-30)]' : ''}`}>
                          <Icon size={22} />
                        </div>
                        <span className={`text-[11px] font-bold mt-0.5 tracking-tight ${isActive ? 'opacity-100' : 'opacity-60'}`}>
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
