
import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  Receipt,
  ShoppingCart,
  Sparkles,
  BarChart3,
  Settings,
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
  { to: "/expenses", label: "Despesas", icon: Receipt },
  { to: "/market", label: "Mercado", icon: ShoppingCart },
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
            <div className="text-xl font-bold tracking-tight">CardDigital <span className="text-[#ff7a00]">GM</span></div>
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
        <button className="gm-btn gm-btn-soft w-full justify-start" onClick={toggleMode} type="button">
          <IconMode size={18} />
          <span>{mode === "dark" ? "Modo claro" : "Modo escuro"}</span>
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
