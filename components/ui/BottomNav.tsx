
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0b1220]/60 backdrop-blur-2xl border-t border-white/5 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.3)] transition-all duration-300">
      <div className="flex items-center gap-1 overflow-x-auto px-2 py-2 no-scrollbar" style={{ scrollSnapType: 'x mandatory' }}>
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-[70px] h-[60px] rounded-xl transition-all scroll-snap-align-start ${
                  isActive 
                    ? "text-[var(--gm-primary)] bg-white/5 font-bold" 
                    : "text-slate-400 hover:text-slate-200"
                }`
              }
            >
              <Icon size={20} className="mb-1" />
              <span className="text-[10px] tracking-tight">{it.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}