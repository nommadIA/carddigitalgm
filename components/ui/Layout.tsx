
// components/ui/Layout.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  FileText,
  Users,
  Receipt,
  ShoppingCart,
  BrainCircuit,
  Wallet,
  Settings,
  Moon,
  ChevronLeft,
  LogOut,
  Search,
  X
} from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import { fetchSettingsSupabase, applySettingsToDOM } from "../../lib/settings";
import AlarmToast from "./AlarmToast";
import { ToastHost } from "./Toast";
import BottomNav from "./BottomNav";

export default function Layout({ children }: { children?: React.ReactNode }) {
  const { signOut, tenantId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("gm.sidebar") === "1");

  // ✅ 1) Transição entre páginas
  const [pageVisible, setPageVisible] = useState(false);
  
  // ✅ 2) Search na Sidebar
  const [menuSearch, setMenuSearch] = useState("");

  useEffect(() => localStorage.setItem("gm.sidebar", collapsed ? "1" : "0"), [collapsed]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  // Efeito de transição de rota
  useEffect(() => {
    setPageVisible(false);
    const t = setTimeout(() => setPageVisible(true), 120); // Delay suave
    return () => clearTimeout(t);
  }, [location.pathname]);

  // ✅ Carrega settings por TENANT
  useEffect(() => {
    fetchSettingsSupabase(tenantId)
      .then((s) => {
        if (s) applySettingsToDOM(s);
      })
      .catch(() => {});
  }, [tenantId]);

  const nav = useMemo(
    () => [
      { to: "/", label: "Dashboard", icon: LayoutGrid },
      { to: "/budgets", label: "Orçamentos", icon: FileText },
      { to: "/clients", label: "Clientes", icon: Users },
      { to: "/expenses", label: "Despesas", icon: Receipt },
      { to: "/market", label: "Mercado", icon: ShoppingCart },
      { to: "/financial", label: "Financeiro", icon: Wallet },
      { to: "/configuracoes", label: "Configurações", icon: Settings }
    ],
    []
  );

  const filteredNav = useMemo(() => {
    if (!menuSearch) return nav;
    return nav.filter(n => n.label.toLowerCase().includes(menuSearch.toLowerCase()));
  }, [nav, menuSearch]);

  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    swipeRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dt = Date.now() - start.t;

    if (Math.abs(dy) > Math.abs(dx)) return;

    if (Math.abs(dx) < 90) return;
    if (dt > 650) return;

    const idx = nav.findIndex((n) => location.pathname === n.to);
    if (idx < 0) return;

    if (dx < 0 && idx < nav.length - 1) navigate(nav[idx + 1].to);
    if (dx > 0 && idx > 0) navigate(nav[idx - 1].to);
  };

  useEffect(() => {
    const el = mainRef.current as HTMLElement | null;
    if (!el) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      document.documentElement.style.setProperty("--gm-app-bg-parallax-y", "0px");
      document.documentElement.style.setProperty("--gm-app-bg-depth-scale", "1.04");
      return;
    }

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    let targetY = 0;
    let currentY = 0;
    let targetDepth = 1.04;
    let currentDepth = 1.04;
    let raf = 0;

    const STRENGTH = 0.038;
    const MAX_Y = 80;
    const BASE_DEPTH = 1.04;
    const DEPTH_GAIN = 0.000012;
    const MAX_DEPTH_ADD = 0.03;

    const updateTargets = () => {
      const st = el.scrollTop || 0;
      targetY = clamp(-st * STRENGTH, -MAX_Y, MAX_Y);
      const d = BASE_DEPTH + clamp(st * DEPTH_GAIN, 0, MAX_DEPTH_ADD);
      targetDepth = d;
    };

    const tick = () => {
      raf = 0;
      currentY = lerp(currentY, targetY, 0.06);
      currentDepth = lerp(currentDepth, targetDepth, 0.06);

      document.documentElement.style.setProperty("--gm-app-bg-parallax-y", `${currentY.toFixed(2)}px`);
      document.documentElement.style.setProperty("--gm-app-bg-depth-scale", `${currentDepth.toFixed(3)}`);

      if (Math.abs(currentY - targetY) > 0.08 || Math.abs(currentDepth - targetDepth) > 0.001) {
        raf = requestAnimationFrame(tick);
      }
    };

    const onScroll = () => {
      updateTargets();
      if (!raf) raf = requestAnimationFrame(tick);
    };

    updateTargets();
    tick();

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      document.documentElement.style.setProperty("--gm-app-bg-parallax-y", "0px");
      document.documentElement.style.setProperty("--gm-app-bg-depth-scale", `${BASE_DEPTH}`);
    };
  }, []);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const isTouch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

    if (reduced || isTouch) {
      document.documentElement.style.setProperty("--gm-app-bg-parallax-x", "0px");
      document.documentElement.style.setProperty("--gm-app-bg-parallax-y-mouse", "0px");
      return;
    }

    const MAX_X = 10;
    const MAX_Y = 4;
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;
    let raf = 0;

    const tick = () => {
      raf = 0;
      currentX = lerp(currentX, targetX, 0.08);
      currentY = lerp(currentY, targetY, 0.08);

      document.documentElement.style.setProperty("--gm-app-bg-parallax-x", `${currentX.toFixed(2)}px`);
      document.documentElement.style.setProperty("--gm-app-bg-parallax-y-mouse", `${currentY.toFixed(2)}px`);

      if (Math.abs(currentX - targetX) > 0.05 || Math.abs(currentY - targetY) > 0.05) {
        raf = requestAnimationFrame(tick);
      }
    };

    let idleTimer: any;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      clearTimeout(idleTimer);

      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;

      targetX = clamp(nx * MAX_X, -MAX_X, MAX_X);
      targetY = clamp(-ny * MAX_Y, -MAX_Y, MAX_Y);

      if (!raf) raf = requestAnimationFrame(tick);

      idleTimer = setTimeout(() => {
        targetX = 0;
        targetY = 0;
        if (!raf) raf = requestAnimationFrame(tick);
      }, 250);
    };

    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onMove as any);
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(idleTimer);
      document.documentElement.style.setProperty("--gm-app-bg-parallax-x", "0px");
      document.documentElement.style.setProperty("--gm-app-bg-parallax-y-mouse", "0px");
    };
  }, []);

  return (
    <div className="gm-layout">
      {/* Novo componente de alarmes para orçamentos aprovados */}
      <AlarmToast />

      {/* MOBILE TOP HEADER */}
      <div className="fixed top-0 left-0 right-0 h-16 z-[100] flex md:hidden items-center justify-between px-4 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 shadow-lg">
        <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center overflow-hidden shadow-md">
                <img 
                  src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg" 
                  alt="Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">CardDigital</span>
                <span className="text-lg font-bold text-white">GM <span className="text-[var(--gm-primary)]">SISTEMAS</span></span>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
                className="gm-btn gm-btn-icon gm-btn-danger"
                onClick={signOut}
                aria-label="Sair"
            >
                <LogOut size={18} />
            </button>
        </div>
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside className={`gm-sidebar ${collapsed ? "collapsed" : ""} hidden md:flex`}>
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-1 mb-2">
             <div className="relative flex items-center justify-center shrink-0">
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                  <img 
                    src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg" 
                    alt="Logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 leading-none">
                  <span className="text-sm font-light text-slate-200 tracking-tight">CardDigital</span>
                  <span className="text-lg font-semibold text-[var(--gm-primary)]">GM</span>
              </div>
          </div>
        )}

        <div className="gm-row">
          <button
            className="gm-btn gm-btn-icon hidden md:flex"
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label="Recolher sidebar"
          >
            <ChevronLeft size={18} style={{ transform: collapsed ? "rotate(180deg)" : "none" }} />
          </button>
          <div className="gm-right" />
        </div>

        {!collapsed && (
          <div className="px-1 py-2 flex flex-col gap-3">
             <div className="flex items-center justify-between gap-2 px-1">
                <div className="font-extrabold tracking-tight text-sm">Menu</div>
            </div>

            <div className="relative hidden md:block">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                className="gm-input h-9 text-sm !pl-9"
                placeholder="Buscar menu..."
                value={menuSearch}
                onChange={e => setMenuSearch(e.target.value)}
                />
                {menuSearch && (
                <button 
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    onClick={() => setMenuSearch("")}
                >
                    <X size={12} />
                </button>
                )}
            </div>
          </div>
        )}

        <nav className="gm-nav">
          {filteredNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? "active" : "")}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="gm-sidebar-footer">
          <button className="gm-btn" type="button" onClick={signOut} title="Sair">
            <LogOut size={18} className="text-white" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <main 
        ref={mainRef}
        className={`gm-main transition-all duration-300 ease-out transform ${
            pageVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
        onPointerDown={onPointerDown} 
        onPointerUp={onPointerUp}
      >
        <div className="gm-container">{children}</div>
      </main>

      <BottomNav />
      <ToastHost />
    </div>
  );
}
