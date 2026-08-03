
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
  MoreHorizontal,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// 4 destinos mais usados ficam sempre visíveis; o resto mora em "Mais"
const primaryItems = [
  { to: "/", label: "Início", icon: LayoutDashboard },
  { to: "/budgets", label: "Orç.", icon: FileText },
  { to: "/clients", label: "Client", icon: Users },
  { to: "/financial", label: "Fin.", icon: BarChart3 },
];

const moreItems = [
  { to: "/expenses", label: "Despesas", icon: Receipt },
  { to: "/market", label: "Mercado", icon: ShoppingCart },
  { to: "/notes", label: "Anotações", icon: StickyNote },
  { to: "/minha-bio", label: "Minha Bio", icon: Smartphone },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);

  // mantém o comportamento de recolher os pagination-dots quando o painel "Mais" está aberto
  React.useEffect(() => {
    if (moreOpen) {
      document.body.classList.add("bottom-nav-visible");
    } else {
      document.body.classList.remove("bottom-nav-visible");
    }
    return () => document.body.classList.remove("bottom-nav-visible");
  }, [moreOpen]);

  const tabClass = (isActive: boolean) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-w-0 transition-colors cursor-pointer ${
      isActive ? "text-[color:var(--gm-primary)]" : "text-[color:var(--gm-text-tertiary)] hover:text-[color:var(--gm-text-secondary)]"
    }`;

  return (
    <>
      {/* BARRA PERSISTENTE — sempre visível, sem precisar tocar em "MENU" antes de navegar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[10001] bg-[color:var(--gm-surface)] border-t border-[color:var(--gm-border)] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_20px_rgba(0,0,0,0.25)]">
        <div className="flex items-stretch justify-between px-1">
          {primaryItems.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink key={it.to} to={it.to} end={it.to === "/"} className={({ isActive }) => tabClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <Icon size={20} className={isActive ? "scale-110 transition-transform" : "transition-transform"} />
                    <span className={`text-[10px] tracking-tight ${isActive ? "font-black" : "font-bold opacity-80"}`}>
                      {it.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}

          <button type="button" onClick={() => setMoreOpen(true)} className={tabClass(moreOpen)}>
            <MoreHorizontal size={20} />
            <span className="text-[10px] font-bold tracking-tight opacity-80">Mais</span>
          </button>
        </div>
      </nav>

      {/* PAINEL "MAIS" — as demais seções, abertas sob demanda por cima da barra fixa */}
      <AnimatePresence>
        {moreOpen && (
          <React.Fragment>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-[10002] bg-black/50"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-[10003] bg-[color:var(--gm-surface)] border-t border-[color:var(--gm-border)] pb-[calc(env(safe-area-inset-bottom,12px)+10px)] touch-none rounded-t-2xl"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.y > 50 || velocity.y > 500) {
                  setMoreOpen(false);
                }
              }}
            >
              <div className="w-full flex justify-center pt-2.5 pb-2 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1 bg-white/25 rounded-full transition-all hover:bg-white/40" />
              </div>

              <div className="flex items-center justify-between px-4 pb-3">
                <span className="text-[11px] font-bold tracking-widest text-[color:var(--gm-text-tertiary)] uppercase">
                  Mais opções
                </span>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-[color:var(--gm-text-tertiary)] transition-colors"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 px-4 pb-4">
                {moreItems.map((it) => {
                  const Icon = it.icon;
                  return (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        `flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border transition-all active:scale-95 ${
                          isActive
                            ? "bg-[color:var(--gm-primary)] text-white border-transparent shadow-md shadow-[color:var(--gm-primary)]/30"
                            : "bg-white/[0.03] border-[color:var(--gm-border-light)] text-[color:var(--gm-text-secondary)] hover:bg-white/[0.06]"
                        }`
                      }
                    >
                      <Icon size={20} />
                      <span className="text-[11px] font-bold text-center leading-tight">{it.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
    </>
  );
}
