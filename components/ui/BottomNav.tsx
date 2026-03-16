
import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  Receipt,
  ShoppingCart,
  BrainCircuit,
  BarChart3,
  Settings,
} from "lucide-react";

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
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-slate-950/80 backdrop-blur-xl border-t border-white/5 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-1 overflow-x-auto px-3 py-2 no-scrollbar" style={{ scrollSnapType: 'x mandatory' }}>
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-[72px] h-[64px] rounded-2xl transition-all duration-300 scroll-snap-align-start ${
                  isActive 
                    ? "text-[var(--gm-primary)] bg-white/5 shadow-inner" 
                    : "text-slate-500 hover:text-slate-300 active:scale-90"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-[var(--gm-primary)]/10' : ''}`}>
                    <Icon size={20} />
                  </div>
                  <span className={`text-[10px] font-bold mt-0.5 tracking-tight ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                    {it.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
