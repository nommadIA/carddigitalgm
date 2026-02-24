
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
  { to: "/ai-hub", label: "Receitas IA", icon: Sparkles },
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
    <div className="gm-sidebar-shell">
      <div className="gm-sidebar-top">
        <div className="gm-brand">
          <div className="gm-brand-mark">G</div>
          <div className="gm-brand-text">
            <div className="gm-brand-title">GM Pro</div>
            <div className="gm-brand-sub">Enterprise</div>
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
              className={({ isActive }) =>
                `gm-nav-item ${isActive ? "is-active" : ""}`
              }
              title={it.label}
            >
              <span className="gm-nav-icon">
                <Icon size={18} />
              </span>
              <span className="gm-nav-label">{it.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="gm-sidebar-bottom">
        <button className="gm-theme-toggle" onClick={toggleMode} type="button">
          <span className="gm-theme-toggle-icon">
            <IconMode size={18} />
          </span>
          <span className="gm-theme-toggle-label">
            {mode === "dark" ? "Modo claro" : "Modo escuro"}
          </span>
        </button>
        
        <button 
          className="gm-theme-toggle mt-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 border-red-500/20" 
          onClick={signOut} 
          type="button"
          title="Sair"
        >
          <span className="gm-theme-toggle-icon">
            <LogOut size={18} />
          </span>
          <span className="gm-theme-toggle-label">Sair</span>
        </button>
      </div>
    </div>
  );
}
