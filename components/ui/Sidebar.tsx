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
          <div className="w-9 h-9 rounded-lg bg-[#FF5A1A] flex items-center justify-center font-black text-white text-base shadow-md shadow-[#FF5A1A]/30 shrink-0">
            GM
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1 truncate">
              CardDigital <span className="text-[#FE540B] font-black" style={{ fontFamily: "'Funnel Display', sans-serif", fontWeight: 800 }}>GM</span>
            </div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
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
              title={it.label}
              className={({ isActive }) =>
                `flex items-center px-4 py-2.5 rounded-lg text-sm font-bold relative transition-colors ${
                  isActive
                    ? "text-white font-extrabold"
                    : "text-[#b4b7c2] hover:text-white hover:bg-white/[0.04]"
                }`
              }
            >
              {/* Barra laranja na borda esquerda do item ativo */}
              <span
                className={`sidebar-window-indicator ${
                  location.pathname === it.to || (it.to !== "/" && location.pathname.startsWith(it.to))
                    ? "!opacity-100 !bg-[#FE540B]"
                    : "!opacity-0 pointer-events-none"
                }`}
                aria-hidden="true"
              />
              {it.to === "/planos" ? (
                <GoldCrownIcon size={19} />
              ) : (
                <Icon size={19} className="shrink-0 text-[#FE540B] stroke-[2]" />
              )}
              <span className={`ml-3 truncate ${it.to === "/planos" ? "text-amber-300 font-bold" : it.to === "/admin/usuarios" ? "text-[#FE540B] font-bold" : ""}`}>{it.label}</span>
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
