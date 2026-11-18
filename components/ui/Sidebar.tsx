import React, { useEffect } from "react";
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
  Crown,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import GoldCrownIcon from "./GoldCrownIcon";

type ThemeMode = "dark" | "light";

const baseItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/budgets", label: "Orçamentos", icon: FileText },
  { to: "/clients", label: "Clientes", icon: Users },
  { to: "/expenses", label: "Despesas", icon: Receipt },
  { to: "/financial", label: "Financeiro", icon: BarChart3 },
  { to: "/market", label: "Mercado", icon: ShoppingCart },
  { to: "/notes", label: "Notas", icon: StickyNote },
  { to: "/minha-bio", label: "Bio / Portfólio", icon: Smartphone },
  { to: "/planos", label: "Planos", icon: Crown },
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
  const { signOut, isAdmin } = useAuth();

  const items = React.useMemo(() => {
    if (isAdmin) {
      const cloned = [...baseItems];
      // Insere "Gestão Usuários" logo após Planos para o Master ADM
      const planosIndex = cloned.findIndex((i) => i.to === "/planos");
      cloned.splice(planosIndex + 1, 0, {
        to: "/admin/usuarios",
        label: "Gestão Usuários",
        icon: ShieldCheck,
      });
      return cloned;
    }
    return baseItems;
  }, [isAdmin]);

  useEffect(() => {
    applyTheme("dark");
  }, []);

  return (
    <div className="gm-sidebar">
      <div className="mb-6 px-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[6px] bg-[#FE540B] flex items-center justify-center font-black text-[#0B0B0C] text-base shrink-0">
            GM
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1 truncate">
              CardDigital <span className="text-[#FE540B] font-black" style={{ fontFamily: "'Funnel Display', sans-serif", fontWeight: 800 }}>GM</span>
            </div>
            <div className="text-[11px] font-bold text-[#8B8B92] uppercase tracking-widest">
              Forge System
            </div>
          </div>
        </div>
      </div>

      <nav className="gm-nav flex flex-col gap-1 select-none" aria-label="Menu">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === "/"}
              title={it.label}
              className={({ isActive }) =>
                `gm-nav-item sidebar-btn flex items-center text-sm font-semibold relative whitespace-nowrap ${
                  isActive
                    ? "is-active active font-bold"
                    : ""
                }`
              }
            >
              {it.to === "/planos" ? (
                <GoldCrownIcon size={18} />
              ) : (
                <Icon size={18} className="shrink-0 stroke-[1.75]" />
              )}
              <span className={`truncate ${it.to === "/admin/usuarios" ? "text-[var(--gm-primary,#FE540B)] font-bold" : ""}`}>{it.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="gm-sidebar-footer mt-auto pt-4 border-t border-white/[0.08]">
        <button
          className="gm-top-action gm-glass-btn w-full h-10 flex items-center justify-center gap-2 px-3 rounded-[8px] text-xs font-bold uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors cursor-pointer"
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
