
// components/ui/Layout.tsx
import { WhatsAppIcon } from "./WhatsAppIcon";
import { WhatsAppSelectorModal } from "./WhatsAppSelectorModal";
import { openWhatsapp } from "../../services/whatsApp";
import AppTutorial from "./AppTutorial";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  Sun,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
  X,
  ArrowDown,
  ArrowUp,
  ChevronUp,
  ChevronDown,
  StickyNote,
  Bell,
  Sparkles,
  MessageSquare,
  Clock,
  Check,
  CheckCircle2,
  Smartphone
} from "lucide-react";
import { playNotificationSound } from "../../lib/audio";
import { useAuth } from "../../store/AuthContext";
import { fetchSettingsSupabase, applySettingsToDOM } from "../../lib/settings";
import AlarmToast from "./AlarmToast";
import { ToastHost } from "./Toast";
import BottomNav from "./BottomNav";

const DEFAULT_NOTIFICATIONS = [
  {
    id: "n1",
    title: "Novo Orçamento Aprovado",
    message: "O cliente Bolhas Lavanderia visualizou e aprovou o layout enviado. O status foi atualizado para Fazendo.",
    time: "Há 10 min",
    read: false,
    type: "direct"
  },
  {
    id: "n2",
    title: "Controles de Som & Mute",
    message: "Novidade: Adicionado botão 'Silenciar Som' para silenciar/ativar instantaneamente todos os toques de alerta nas configurações.",
    time: "Há 1 hora",
    read: false,
    type: "update"
  },
  {
    id: "n3",
    title: "Alerta de Lembrete Diário",
    message: "Seu lembrete programado de conferência de notas das 10:26 disparou com sucesso.",
    time: "Há 2 horas",
    read: false,
    type: "alert"
  },
  {
    id: "n4",
    title: "WhatsApp Conectado",
    message: "O canal de atendimento via WhatsApp foi sincronizado e o suporte instantâneo está pronto.",
    time: "Há 4 horas",
    read: true,
    type: "direct"
  },
  {
    id: "n5",
    title: "Layout Mobile Alinhado",
    message: "Os cabeçalhos de configurações no smartphone começam sempre abaixo do logo, garantindo posicionamento perfeito.",
    time: "Há 1 dia",
    read: true,
    type: "update"
  },
  {
    id: "n6",
    title: "Dots do Carrossel Style",
    message: "O passador de abas mobile agora é composto por uma linda cápsula escura fosca com as bolinhas indicatórias flutuantes estilo Glassmorphic.",
    time: "Há 2 dias",
    read: true,
    type: "update"
  }
];
import { useSwipeNav } from "../../hooks/useSwipeNav";
import { pushToast } from "../../store/toast";

export default function Layout({ children }: { children?: React.ReactNode }) {
  const { signOut, tenantId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("gm.sidebar") === "1");
  const [showTutorial, setShowTutorial] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const [notifications, setNotifications] = useState<any[]>(() => {
    const cached = localStorage.getItem("gm.notifications");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // fall through
      }
    }
    return DEFAULT_NOTIFICATIONS;
  });

  const [activeTab, setActiveTab] = useState<"todas" | "nao_lidas" | "diretas">("todas");

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem("gm.notifications", JSON.stringify(notifications));
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === "todas") return notifications;
    if (activeTab === "nao_lidas") return notifications.filter((n) => !n.read);
    if (activeTab === "diretas") return notifications.filter((n) => n.type === "direct");
    return notifications;
  }, [notifications, activeTab]);

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
    pushToast({
      type: "success",
      title: "Notificações",
      message: "Todas as mensagens foram marcadas como lidas!",
      ttl: 3000
    });
  };

  const handleBellClick = () => {
    setShowUpdateModal(true);
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("CardDigital GM • Nova Versão", {
          body: "A versão v2.1.0 foi ativada com sucesso! Conectado e funcionando em tempo real.",
          icon: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg"
        });
        try { playNotificationSound(); } catch (e) {}
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            new Notification("CardDigital GM • Novo!", {
              body: "Agora você receberá alertas de nova versão fora do aplicativo.",
              icon: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg"
            });
            try { playNotificationSound(); } catch (e) {}
          }
        });
      }
    }
  };

  useEffect(() => {
    const isNewUser = localStorage.getItem("gm.isNewUser") === "true";
    const isForce = localStorage.getItem("gm.tutorialForceStart") === "true";
    if ((isNewUser || isForce) && location.pathname === "/") {
      setShowTutorial(true);
      if (isNewUser) {
        localStorage.removeItem("gm.isNewUser");
      }
    } else {
      setShowTutorial(false);
    }
  }, [location.pathname]);
  
  // ✅ 2) Search na Sidebar
  const [menuSearch, setMenuSearch] = useState("");
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const [themeMode, setThemeMode] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" ? "dark" : "light";
  });

  const settingsCacheRef = useRef<any>(null);

  const toggleTheme = () => {
    const nextTheme = themeMode === "dark" ? "light" : "dark";
    setThemeMode(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    document.documentElement.classList.toggle("gm-light", nextTheme === "light");
    document.documentElement.classList.toggle("gm-dark", nextTheme === "dark");
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem("theme", nextTheme);
    
    // Re-aplica imediatamente as cores personalizadas do novo tema
    if (settingsCacheRef.current) {
      applySettingsToDOM(settingsCacheRef.current);
    } else {
      fetchSettingsSupabase(tenantId)
        .then((s) => {
          if (s) {
            settingsCacheRef.current = s;
            applySettingsToDOM(s);
          }
        })
        .catch(() => {});
    }
  };

  useEffect(() => localStorage.setItem("gm.sidebar", collapsed ? "1" : "0"), [collapsed]);

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    document.documentElement.classList.toggle("gm-light", saved === "light");
    document.documentElement.classList.toggle("gm-dark", saved === "dark");
    document.documentElement.classList.toggle("dark", saved === "dark");
    if (saved !== themeMode) {
      setThemeMode(saved as "dark" | "light");
    }

    const savedBtnStyle = localStorage.getItem("gm_button_style_fallback") || "vazado";
    document.documentElement.setAttribute("data-button-style", savedBtnStyle);
  }, []);

  useEffect(() => {
    const handleThemeUpdate = () => {
      const saved = localStorage.getItem("theme") || "light";
      document.documentElement.setAttribute("data-theme", saved);
      document.documentElement.classList.toggle("gm-light", saved === "light");
      document.documentElement.classList.toggle("gm-dark", saved === "dark");
      document.documentElement.classList.toggle("dark", saved === "dark");
      setThemeMode(saved as "dark" | "light");

      if (settingsCacheRef.current) {
        applySettingsToDOM(settingsCacheRef.current);
      } else {
        fetchSettingsSupabase(tenantId)
          .then((s) => {
            if (s) {
              settingsCacheRef.current = s;
              applySettingsToDOM(s);
            }
          })
          .catch(() => {});
      }
    };

    window.addEventListener("gm_theme_updated", handleThemeUpdate);
    return () => window.removeEventListener("gm_theme_updated", handleThemeUpdate);
  }, [tenantId]);

  // ✅ Carrega settings por TENANT
  useEffect(() => {
    fetchSettingsSupabase(tenantId)
      .then((s) => {
        if (s) {
          settingsCacheRef.current = s;
          applySettingsToDOM(s);
        }
      })
      .catch(() => {});
  }, [tenantId]);



  const nav = useMemo(
    () => [
      { to: "/", label: "Início", icon: LayoutGrid },
      { to: "/budgets", label: "Orçamentos", icon: FileText },
      { to: "/clients", label: "Clientes", icon: Users },
      { to: "/expenses", label: "Despesas", icon: Receipt },
      { to: "/market", label: "Mercado", icon: ShoppingCart },
      { to: "/notes", label: "Notas", icon: StickyNote },
      { to: "/financial", label: "Financeiro", icon: Wallet },
      { to: "/minha-bio", label: "Bio", icon: Smartphone },
      { to: "/configuracoes", label: "Configurações", icon: Settings }
    ],
    []
  );

  const filteredNav = useMemo(() => {
    if (!menuSearch) return nav;
    return nav.filter(n => n.label.toLowerCase().includes(menuSearch.toLowerCase()));
  }, [nav, menuSearch]);

  const mainRef = useRef<HTMLElement | null>(null);

  // Swipe Navigation Logic
  const currentIndex = nav.findIndex(n => n.to === location.pathname);
  
  const handleSwipeLeft = () => {
    if (currentIndex >= 0 && currentIndex < nav.length - 1) {
      navigate(nav[currentIndex + 1].to);
    }
  };

  const handleSwipeRight = () => {
    if (currentIndex > 0) {
      navigate(nav[currentIndex - 1].to);
    }
  };

  const swipeRef = useSwipeNav<HTMLDivElement>({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    thresholdPx: 80, // Aumentado um pouco para evitar swipes acidentais
    restraintPx: 100, // Permitir um pouco mais de movimento vertical
  });

  // Merge refs
  const setRefs = (node: HTMLDivElement | null) => {
    mainRef.current = node;
    if (swipeRef) {
      swipeRef.current = node;
    }
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

    let lastScrollY = 0;
    let activeScrollElement: HTMLElement | null = null;

    const onScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      
      // Ignore scrolls from elements that are not scrollable or very small
      if (!target || !target.scrollHeight || target.scrollHeight <= target.clientHeight + 10) return;
      
      // If we're scrolling a different element, reset
      if (activeScrollElement !== target) {
        if (activeScrollElement) {
          activeScrollElement.removeAttribute('data-active-scroll');
        }
        activeScrollElement = target;
        activeScrollElement.setAttribute('data-active-scroll', 'true');
        lastScrollY = target.scrollTop;
      }

      // Update parallax if it's the main container
      if (target === el) {
        updateTargets();
        if (!raf) raf = requestAnimationFrame(tick);
      }

      const currentScrollY = target.scrollTop;
      const maxScroll = target.scrollHeight - target.clientHeight;
      
      setCanScrollUp(currentScrollY > 100);
      setCanScrollDown(maxScroll > 0 && currentScrollY < maxScroll - 50);
      
      lastScrollY = currentScrollY;
    };

    // Check periodically to update indicators even if not scrolling (e.g., on mount or resize)
    const checkScroll = () => {
      let target = activeScrollElement;
      if (!target || !document.contains(target)) {
        // Try to find the scrollable element marked with data-active-scroll
        target = document.querySelector('[data-active-scroll="true"]') as HTMLElement;
        
        if (!target) {
          const centerEl = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
          if (centerEl) {
            let curr: HTMLElement | null = centerEl as HTMLElement;
            while (curr && curr !== document.body) {
              if (curr.scrollHeight > curr.clientHeight + 10 && 
                  (window.getComputedStyle(curr).overflowY === 'auto' || window.getComputedStyle(curr).overflowY === 'scroll' || curr.classList.contains('gm-main'))) {
                target = curr;
                break;
              }
              curr = curr.parentElement;
            }
          }
        }

        // Fallback
        if (!target) {
          const elements = document.querySelectorAll('.overflow-y-auto, .gm-main, [style*="overflow-y: auto"], [style*="overflowY: auto"]');
          for (let i = elements.length - 1; i >= 0; i--) {
            const el = elements[i] as HTMLElement;
            if (el.scrollHeight > el.clientHeight + 10) {
              target = el;
              break;
            }
          }
        }
      }

      if (target) {
        const currentScrollY = target.scrollTop;
        const maxScroll = target.scrollHeight - target.clientHeight;
        const nextUp = currentScrollY > 20;
        const nextDown = maxScroll > 10 && currentScrollY < maxScroll - 20;
        setCanScrollUp(prev => prev !== nextUp ? nextUp : prev);
        setCanScrollDown(prev => prev !== nextDown ? nextDown : prev);
      } else {
        setCanScrollUp(false);
        setCanScrollDown(false);
      }
    };

    updateTargets();
    checkScroll();
    tick();

    // Use capture: true to catch all scroll events on the page
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true } as any);
      window.removeEventListener("resize", checkScroll);
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

      {/* Tutorial Onboarding do Aplicativo */}
      {showTutorial && <AppTutorial onClose={() => setShowTutorial(false)} />}

      {/* GESTO GLOBAL DE VOLTAR (BORDAS LATERAIS) */}
      <div 
        className="fixed top-0 left-0 w-3 h-full z-[9999] pointer-events-auto touch-none"
        onPointerDown={(e) => {
          const startX = e.clientX;
          const onPointerUp = (upEvent: PointerEvent) => {
            const diffX = upEvent.clientX - startX;
            if (diffX > 50) {
              navigate(-1);
            }
            window.removeEventListener('pointerup', onPointerUp);
          };
          window.addEventListener('pointerup', onPointerUp);
        }}
      />
      <div 
        className="fixed top-0 right-0 w-3 h-full z-[9999] pointer-events-auto touch-none"
        onPointerDown={(e) => {
          const startX = e.clientX;
          const onPointerUp = (upEvent: PointerEvent) => {
            const diffX = startX - upEvent.clientX;
            if (diffX > 50) {
              navigate(-1);
            }
            window.removeEventListener('pointerup', onPointerUp);
          };
          window.addEventListener('pointerup', onPointerUp);
        }}
      />

      {/* MOBILE TOP HEADER */}
      <div className="fixed top-0 left-0 right-0 h-16 z-[100] flex md:hidden items-center justify-between px-4 bg-black/40 backdrop-blur-[20px] saturate-[1.8] border-b border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center overflow-hidden shadow-md">
                <img 
                  src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg" 
                  alt="Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="flex flex-col leading-tight">
                <span className="text-lg font-bold text-slate-900 dark:text-white">CardDigital <span className="text-[var(--gm-primary)] font-black">GM</span></span>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button
                type="button"
                className="gm-btn gm-btn-icon relative bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/30 text-[var(--gm-primary)] hover:bg-[var(--gm-primary)]/20 transition-all"
                onClick={toggleTheme}
                title={themeMode === "dark" ? "Alternar para Tema Claro" : "Alternar para Tema Escuro"}
                aria-label="Alternar Tema Claro/Escuro"
                style={{ width: '38px', height: '38px', borderRadius: '10px' }}
            >
                {themeMode === "dark" ? (
                  <Sun size={18} className="text-amber-400" />
                ) : (
                  <Moon size={18} className="text-[var(--gm-primary)]" />
                )}
            </button>

            <button
                type="button"
                className="gm-btn gm-btn-icon relative bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/30 text-[var(--gm-primary)]"
                onClick={handleBellClick}
                title="Atualizações e Informações"
                aria-label="Atualizações e Informações"
                style={{ width: '38px', height: '38px', borderRadius: '10px' }}
            >
                <Bell size={18} className="animate-swing" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-black animate-pulse" />
            </button>

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
      <aside className={`gm-sidebar ${collapsed ? "collapsed" : ""} hidden md:flex !relative`}>
        {/* Overlapping vertical border collapse/expand Toggle Button - White circle in Light theme, Black circle in Dark theme, with Orange border & Orange chevron arrow */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-1/2 -translate-y-1/2 -right-[11px] w-[22px] h-[22px] rounded-full border-[2.5px] border-[var(--gm-primary)] flex items-center justify-center text-[var(--gm-primary)] transition-all z-[100] shadow-[0_2px_10px_rgba(0,0,0,0.3)] cursor-pointer shrink-0"
          style={{
            backgroundColor: themeMode === "dark" ? "#000000" : "#ffffff",
            borderColor: "var(--gm-primary)",
            color: "var(--gm-primary)"
          }}
          type="button"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? (
            <ChevronRight size={12} className="animate-arrow-right text-[var(--gm-primary)]" />
          ) : (
            <ChevronLeft size={12} className="animate-arrow-left text-[var(--gm-primary)]" />
          )}
        </button>

        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-1 mb-4">
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
                  <span className="text-lg font-bold text-[var(--gm-menu-title)]">CardDigital <span className="gm-logo-highlight text-[var(--gm-menu-primary)] font-black">GM</span></span>
              </div>
          </div>
        ) : (
          <div className="flex justify-center mt-2 mb-6">
            <div className="relative flex items-center justify-center shrink-0">
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                  <img 
                    src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg" 
                    alt="Logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
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

        <div className="gm-sidebar-footer w-full flex flex-col pb-4 gap-2 mt-auto">
          {collapsed ? (
            <div className="gm-nav w-full">
              {/* Tema Claro/Escuro (Collapsed) */}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  toggleTheme();
                }}
                className="relative flex items-center justify-center p-1.5"
                title={themeMode === "dark" ? "Tema Escuro Ativo (Clique para alternar)" : "Tema Claro Ativo (Clique para alternar)"}
              >
                <div
                  role="switch"
                  aria-checked={themeMode === "dark"}
                  className={`relative shrink-0 w-9 h-5 rounded-full p-0.5 cursor-pointer transition-all duration-200 border flex items-center ${
                    themeMode === "dark"
                      ? "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      : "bg-emerald-600 border-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.35)]"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-out flex items-center justify-center ${
                      themeMode === "dark" ? "translate-x-4" : "translate-x-0"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  </div>
                </div>
              </a>

              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleBellClick();
                }}
                className="active"
                title="Notificações e Atualizações"
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  <Bell size={18} className={unreadCount > 0 ? "animate-swing" : ""} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black flex items-center justify-center animate-pulse" />
                  )}
                </div>
              </a>

              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  signOut();
                }}
                className="active"
                title="Sair"
                aria-label="Sair"
              >
                <LogOut size={18} className="transition-transform" />
              </a>
            </div>
          ) : (
            <div className="gm-nav w-full">
              {/* Tema Claro/Escuro (Expanded) */}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  toggleTheme();
                }}
                className="text-left flex items-center justify-between w-full gap-2 p-1.5 rounded-xl transition-all"
                title={themeMode === "dark" ? "Alternar para Tema Claro" : "Alternar para Tema Escuro"}
              >
                <div className="relative shrink-0 flex items-center gap-2.5 min-w-0">
                  {themeMode === "dark" ? (
                    <Moon size={18} className="text-emerald-400 shrink-0" />
                  ) : (
                    <Sun size={18} className="text-orange-500 shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0 gap-0.5">
                    <span className={`text-xs font-black leading-tight ${
                      themeMode === "dark" ? "text-slate-200 dark:text-zinc-200" : "text-orange-600 dark:text-orange-500"
                    }`}>
                      Tema {themeMode === "dark" ? "Escuro" : "Claro"}
                    </span>
                    <div>
                      {themeMode === "dark" ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[7.5px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                          ATIVO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[7.5px] font-black uppercase tracking-wider bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                          <span className="w-1 h-1 rounded-full bg-orange-500 animate-pulse" />
                          ATIVO
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chave Verde Clicável (Toggle Switch) */}
                <div
                  role="switch"
                  aria-checked={themeMode === "dark"}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleTheme();
                  }}
                  className={`relative shrink-0 w-9 h-5 rounded-full p-0.5 cursor-pointer transition-all duration-200 border flex items-center ${
                    themeMode === "dark"
                      ? "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      : "bg-emerald-600 border-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.35)]"
                  }`}
                  title={themeMode === "dark" ? "Tema Escuro Ativo - Clique para alterar" : "Tema Claro Ativo - Clique para alterar"}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-out flex items-center justify-center ${
                      themeMode === "dark" ? "translate-x-4" : "translate-x-0"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  </div>
                </div>
              </a>

              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleBellClick();
                }}
                className="active text-left"
                title="Notificações e Atualizações"
              >
                <div className="relative shrink-0 flex items-center">
                  <Bell size={18} className={unreadCount > 0 ? "animate-swing" : ""} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black animate-pulse" />
                  )}
                </div>
                <span className="text-sm flex-1 text-left">Atualizações</span>
                {unreadCount > 0 ? (
                  <span className="shrink-0 px-2 py-0.5 text-[9px] font-black uppercase bg-red-500 text-white rounded-md z-10">
                    {unreadCount} Novas
                  </span>
                ) : (
                  <span className="shrink-0 px-2 py-0.5 text-[8.5px] font-extrabold uppercase bg-neutral-800 text-zinc-400 rounded-md z-10">
                    Em dia
                  </span>
                )}
              </a>

              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  signOut();
                }}
                className="active text-left"
                title="Sair"
              >
                <LogOut size={18} className="transition-transform hover:scale-110" />
                <span className="text-sm text-left">Sair</span>
              </a>
              <div className="mt-4 text-[11px] text-slate-500 text-center opacity-60 pointer-events-none">
                <i>Desenvolvido por</i> <span className="font-bold text-[var(--gm-menu-title)]">CardDigital</span> <span className="font-bold text-[var(--gm-menu-primary)] gm-logo-highlight">GM</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main 
        ref={setRefs}
        className="gm-main"
      >
        <div className="gm-container min-h-full flex flex-col">{children}</div>
      </main>
      
      {/* SCROLL INDICATORS CONTAINER */}
      {createPortal(
        <div className="fixed right-4 bottom-24 z-[10001] flex flex-col gap-3 pointer-events-none" style={{ zIndex: 10001 }}>
          {/* WHATSAPP SUPPORT BUTTON (GLASS) */}
          {location.pathname === "/" && (
            <button
              onClick={() => openWhatsapp("5598981120686", "Olá! CardDigital GM, preciso de outras informações.")}
              className="transition-all duration-200 flex items-center justify-center w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#20ba5a] border border-white/20 shadow-[0_4px_16px_rgba(37,211,102,0.4)] pointer-events-auto cursor-pointer"
              aria-label="Ajuda via WhatsApp"
              title="Ajuda via WhatsApp"
            >
              <WhatsAppIcon size={24} className="text-white" />
            </button>
          )}

          {/* BACK TO TOP BUTTON (GLASS) */}
          <button
            onClick={() => {
              const activeEl = document.querySelector('[data-active-scroll="true"]');
              if (activeEl) {
                activeEl.scrollTo({ top: 0, behavior: "smooth" });
              } else {
                const scrollableElements = document.querySelectorAll('.overflow-y-auto, .gm-main, [style*="overflow-y: auto"], [style*="overflowY: auto"]');
                scrollableElements.forEach(el => el.scrollTo({ top: 0, behavior: "smooth" }));
              }
            }}
            className={`transition-all duration-300 flex items-center justify-center w-10 h-10 rounded-full bg-zinc-900/90 dark:bg-zinc-900/90 border border-[var(--gm-primary)]/50 shadow-xl pointer-events-auto cursor-pointer ${
              canScrollUp ? "opacity-90 hover:opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            }`}
            aria-label="Voltar ao topo"
            title="Rolar para o topo"
          >
            <ChevronUp size={20} className="text-[var(--gm-primary)] animate-pulse" />
          </button>

          {/* SCROLL DOWN INDICATOR (GLASS) */}
          {location.pathname !== '/' && (
            <button 
              onClick={() => {
                let target = document.querySelector('[data-active-scroll="true"]') as HTMLElement;
                if (!target) {
                  const elements = document.querySelectorAll('.overflow-y-auto, .gm-main, [style*="overflow-y: auto"], [style*="overflowY: auto"]');
                  for (let i = elements.length - 1; i >= 0; i--) {
                    const el = elements[i] as HTMLElement;
                    if (el.scrollHeight > el.clientHeight + 10) {
                      target = el;
                      break;
                    }
                  }
                }
                if (target) {
                  target.scrollBy({ top: Math.min(target.clientHeight * 0.7, 320), behavior: "smooth" });
                }
              }}
              className={`transition-all duration-300 flex items-center justify-center w-10 h-10 rounded-full bg-zinc-900/90 dark:bg-zinc-900/90 border border-[var(--gm-primary)]/50 shadow-xl pointer-events-auto cursor-pointer ${
                canScrollDown ? "opacity-90 hover:opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
              }`}
              aria-label="Rolar para baixo"
              title="Rolar para baixo"
            >
              <ChevronDown size={20} className="text-[var(--gm-primary)] animate-bounce" />
            </button>
          )}
        </div>,
        document.body
      )}

      <BottomNav />
      <ToastHost />

      {/* UPDATE DIALOG MODAL (NOTIFICAÇÕES CENTER) */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" style={{ zIndex: 1000000 }}>
          <div className="relative w-full max-w-md bg-[#131416]/98 border border-zinc-800 rounded-2xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col gap-4 text-white overflow-hidden font-sans">
            
            {/* Ambient Glow */}
            <div className="absolute -top-12 -left-12 w-28 h-28 bg-[var(--gm-primary)]/20 rounded-full blur-2xl pointer-events-none" />
            
            {/* Header */}
            <div className="flex items-center justify-between shrink-0 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800/40 border border-zinc-700/60 flex items-center justify-center text-zinc-300 relative">
                  <Bell size={18} className={unreadCount > 0 ? "text-[var(--gm-primary)]" : "text-zinc-400"} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-black animate-pulse" />
                  )}
                </div>
                <div className="text-left">
                  <h3 className="font-extrabold text-base tracking-tight text-white mb-0">Notificações</h3>
                  <span className="text-[10px] font-bold text-zinc-400 tracking-wide uppercase">
                    {unreadCount > 0 ? `${unreadCount} pendentes` : "Tudo em dia"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 flex items-center justify-center transition-all text-zinc-400 hover:text-white border border-zinc-700/60"
                onClick={() => setShowUpdateModal(false)}
                title="Fechar Notificações"
              >
                <X size={14} />
              </button>
            </div>

            {/* Tabs Filter Bar */}
            <div className="flex items-center gap-1 bg-zinc-950/80 border border-zinc-900 rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("todas")}
                className={`py-1.5 rounded-lg text-center text-xs font-black transition-all flex-1 ${
                  activeTab === "todas"
                    ? "bg-[#25262a] text-white border border-zinc-700/50 shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("nao_lidas")}
                className={`py-1.5 rounded-lg text-center text-xs font-black transition-all flex-1 ${
                  activeTab === "nao_lidas"
                    ? "bg-[#25262a] text-white border border-zinc-700/50 shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Não lidas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("diretas")}
                className={`py-1.5 rounded-lg text-center text-xs font-black transition-all flex-1 ${
                  activeTab === "diretas"
                    ? "bg-[#25262a] text-white border border-zinc-700/50 shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Diretas
              </button>
            </div>

            {/* Marcar todas como lidas Button */}
            {unreadCount > 0 && (
              <div className="flex justify-end shrink-0 px-1 -mt-1">
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[10px] font-black text-[var(--gm-primary)] hover:text-orange-400 transition-all uppercase tracking-wider flex items-center gap-1 hover:underline"
                >
                  <Check size={11} className="stroke-[3]" />
                  Marcar todas como lidas
                </button>
              </div>
            )}

            {/* Notifications Feed Viewport */}
            <div className="overflow-y-auto pr-0.5 space-y-3 max-h-[320px] no-scrollbar text-left flex-1 min-h-[220px] flex flex-col">
              {filteredNotifications.length > 0 ? (
                <div className="space-y-3 w-full">
                  {filteredNotifications.map((noti) => (
                    <div
                      key={noti.id}
                      onClick={() => toggleRead(noti.id)}
                      className={`group relative p-3 border rounded-xl hover:bg-zinc-800/40 transition-all flex gap-3 cursor-pointer select-none ${
                        noti.read
                          ? "bg-zinc-900/30 border-zinc-800/40 opacity-70"
                          : "bg-zinc-900/70 border-emerald-500/15 hover:border-emerald-500/30"
                      }`}
                    >
                      {/* Badge Icon based on Type */}
                      <div className="shrink-0 mt-0.5">
                        {noti.type === "direct" && (
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                            noti.read 
                              ? "bg-zinc-800/40 border-zinc-700/40 text-zinc-500" 
                              : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                          }`}>
                            <MessageSquare size={14} />
                          </div>
                        )}
                        {noti.type === "update" && (
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                            noti.read
                              ? "bg-zinc-800/40 border-zinc-700/40 text-zinc-500"
                              : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                          }`}>
                            <Sparkles size={14} className={noti.read ? "" : "animate-pulse"} />
                          </div>
                        )}
                        {noti.type === "alert" && (
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                            noti.read
                              ? "bg-zinc-800/40 border-zinc-700/40 text-zinc-500"
                              : "bg-orange-500/10 border-orange-500/25 text-orange-400"
                          }`}>
                            <Clock size={14} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-0.5 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-[11.5px] font-black tracking-wide ${noti.read ? "text-zinc-300" : "text-white"}`}>
                            {noti.title}
                          </h4>
                          <span className="text-[8.5px] font-bold text-zinc-550 tracking-normal shrink-0">
                            {noti.time}
                          </span>
                        </div>
                        <p className={`text-[10px] leading-relaxed break-words pr-2 ${noti.read ? "text-zinc-400 font-medium" : "text-zinc-200 font-extrabold"}`}>
                          {noti.message}
                        </p>
                      </div>

                      {/* Unread circle toggle */}
                      {!noti.read && (
                        <span className="absolute top-3.5 right-3.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* EMPTY STATE - MATCHING SCREENSHOT EXACTLY */
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3 animate-fade-in my-auto mx-auto w-full h-full min-h-[200px]">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800/25 border border-zinc-850 flex items-center justify-center text-zinc-550">
                    <Bell size={24} className="opacity-30" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-white">Tudo em dia!</h4>
                    <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">Você está em dia com tudo</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer watermark & CTA close */}
            <div className="shrink-0 border-t border-zinc-800/80 pt-3 flex items-center justify-between text-[10px] font-bold text-zinc-500 tracking-wider">
              <span className="flex items-center gap-1">
                <span className="text-white font-black tracking-normal">CardDigital</span>
                <span className="text-[var(--gm-primary)] font-black tracking-normal">GM</span>
                <span className="text-zinc-650 font-medium px-0.5">•</span>
                <span className="text-zinc-500 lowercase tracking-wide">Notificações</span>
              </span>
              <button
                type="button"
                className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 text-zinc-300 hover:text-white rounded-xl text-[9px] font-black transition-all uppercase tracking-widest shrink-0"
                onClick={() => setShowUpdateModal(false)}
              >
                Fechar
              </button>
            </div>
            
          </div>
        </div>
      )}
      <WhatsAppSelectorModal />
    </div>
  );
}
