import React, { useEffect, useMemo, useState } from "react";
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
  Moon,
  Sun,
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
  root.setAttribute("data-theme", mode);
  root.classList.toggle("gm-light", mode === "light");
  root.classList.toggle("gm-dark", mode === "dark");
  localStorage.setItem("theme", mode);
}

export default function Sidebar() {
  const { signOut } = useAuth();
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("theme") as ThemeMode | null;
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  const toggleMode = () => setMode((m) => (m === "dark" ? "light" : "dark"));

  const IconMode = useMemo(() => (mode === "dark" ? Sun : Moon), [mode]);

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
          className="gm-btn gm-btn-soft w-full justify-between items-center text-xs font-semibold py-2 px-3 rounded-lg bg-[#151515] hover:bg-[#1C1C1C] border border-[#222222] transition-colors"
          onClick={toggleMode}
          type="button"
        >
          <div className="flex items-center gap-2 text-zinc-300">
            <IconMode size={16} className={mode === "light" ? "text-orange-500" : "text-emerald-400"} />
            <span>{mode === "dark" ? "Tema Escuro" : "Tema Claro"}</span>
          </div>
          <div
            className={`relative shrink-0 w-8 h-4 rounded-full p-0.5 transition-all duration-200 border flex items-center ${
              mode === "dark"
                ? "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                : "bg-zinc-600 border-zinc-500"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-out ${
                mode === "dark" ? "translate-x-3.5" : "translate-x-0"
              }`}
            />
          </div>
        </button>

        <button
          className="w-full flex items-center gap-2 px-3 py-2 mt-2 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
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
