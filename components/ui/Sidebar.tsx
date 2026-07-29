
import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  Receipt,
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
  { to: "/", label: "Início", icon: LayoutDashboard },
  { to: "/budgets", label: "Orçamentos", icon: FileText },
  { to: "/clients", label: "Clientes", icon: Users },
  { to: "/expenses", label: "Despesas", icon: Receipt },
  { to: "/market", label: "Mercado", icon: ShoppingCart },
  { to: "/notes", label: "Notas", icon: StickyNote },
  { to: "/minha-bio", label: "Bio", icon: Smartphone },
  { to: "/financial", label: "Financeiro", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  // Use data-theme attribute which is standard in this app
  root.setAttribute("data-theme", mode);
  // Also toggle classes for CSS targeting specific to premium styling
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
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="text-xl font-bold tracking-tight text-[var(--gm-menu-title)]">CardDigital <span className="gm-logo-highlight text-[var(--gm-menu-primary)] font-black">GM</span></div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Enterprise</div>
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
            >
              <Icon size={18} />
              <span>{it.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="gm-sidebar-footer">
        <button className="gm-btn gm-btn-soft w-full justify-between items-center" onClick={toggleMode} type="button">
          <div className="flex items-center gap-2">
            <IconMode size={18} className={mode === "light" ? "text-orange-500" : "text-emerald-400"} />
            <span className={mode === "light" ? "text-orange-600 dark:text-orange-500 font-bold" : ""}>
              {mode === "dark" ? "Tema Escuro" : "Tema Claro"}
            </span>
          </div>
          <div
            className={`relative shrink-0 w-9 h-5 rounded-full p-0.5 transition-all duration-200 border flex items-center ${
              mode === "dark"
                ? "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                : "bg-emerald-600 border-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.35)]"
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-out flex items-center justify-center ${
                mode === "dark" ? "translate-x-4" : "translate-x-0"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            </div>
          </div>
        </button>
        
        <button 
          className="gm-btn gm-btn-soft w-full justify-start mt-2 text-red-400 hover:text-red-300" 
          onClick={signOut} 
          type="button"
          title="Sair"
        >
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}
