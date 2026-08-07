import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  ShoppingCart,
  Smartphone,
  BarChart3,
  Settings,
  StickyNote,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../store/AuthContext";

type ThemeMode = "dark" | "light";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/budgets", label: "Orçamentos", icon: FileText },
  { to: "/clients", label: "Clientes", icon: Users },
  { to: "/financial", label: "Financeiro", icon: BarChart3 },
  { to: "/market", label: "Mercado", icon: ShoppingCart },
  { to: "/notes", label: "Notas", icon: StickyNote },
  { to: "/minha-bio", label: "Bio / Portfólio", icon: Smartphone },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute("data-theme", "dark");
  root.classList.remove("gm-light", "light");
  root.classList.add("gm-dark", "dark");
  localStorage.setItem("theme", "dark");
}

export default function Sidebar() {
  const { signOut } = useAuth();

  useEffect(() => {
    applyTheme("dark");
  }, []);

  return (
    <div className="gm-sidebar">
      <div className="mb-8 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FF5A1A] flex items-center justify-center font-black text-white text-base shadow-md shadow-[#FF5A1A]/30 shrink-0">
            GM
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-1 truncate">
              CardDigital <span className="text-[#FF5A1A]">GM</span>
            </div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Forge System
            </div>
          </div>
        </div>
      </div>

      <nav className="gm-nav" aria-label="Menu">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              title={it.label}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-transparent text-white font-bold border-l-2 border-[#FF5A1A]"
                    : "text-zinc-400 hover:text-white bg-transparent"
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              <span>{it.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="gm-sidebar-footer mt-auto pt-6 border-t border-[#222222]">
        <button
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          onClick={signOut}
          type="button"
          title="Sair"
        >
          <LogOut size={16} />
          <span>Sair da Conta</span>
        </button>
      </div>
    </div>
  );
}
