
// components/ui/Layout.tsx
import { WhatsAppIcon } from "./WhatsAppIcon";
import { WhatsAppSelectorModal } from "./WhatsAppSelectorModal";
import { openWhatsapp } from "../../services/whatsApp";
import AppTutorial from "./AppTutorial";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  playNotificationSound,
  isUiSoundMuted,
  setUiSoundMuted,
  playUiSound,
} from "../../lib/audio";
import {
  isEffectActiveFor,
  getEffectFor,
  getEffectStrength,
  readBgEffectConfig,
  applyBgEffectToRoot,
  BgEffectConfig,
} from "../../lib/backgroundEffects";
import { useAuth } from "../../store/AuthContext";
import { fetchSettingsSupabase, applySettingsToDOM, readSettingsLocal } from "../../lib/settings";
import { initSyncHub, getSavedNotifications, saveNotifications } from "../../lib/syncHub";
import AlarmToast from "./AlarmToast";
import SmartphonePermissionModal from "./SmartphonePermissionModal";
import NotificationCheckinModal from "../notifications/NotificationCheckinModal";
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

  const sidebarRef = useRef<HTMLElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);

  const EXPANDED_SIDEBAR_WIDTH = 224;
  const COLLAPSED_SIDEBAR_WIDTH = 56;

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("gm.sidebar") === "1");
  const sidebarWidth = collapsed ? COLLAPSED_SIDEBAR_WIDTH : EXPANDED_SIDEBAR_WIDTH;

  useEffect(() => {
    if (typeof document !== "undefined") {
      const updateSidebarWidth = () => {
        document.documentElement.style.setProperty(
          "--gm-sidebar-width",
          window.innerWidth >= 768 ? `${sidebarWidth}px` : "0px"
        );
      };
      updateSidebarWidth();
      window.addEventListener("resize", updateSidebarWidth);
      return () => window.removeEventListener("resize", updateSidebarWidth);
    }
  }, [sidebarWidth]);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("gm.sidebar", next ? "1" : "0");
      return next;
    });
  };

  const [showTutorial, setShowTutorial] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);

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
    try { playNotificationSound(); } catch (e) {}
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

    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "auto" });
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);
  
  // ✅ 2) Search na Sidebar
  const [menuSearch, setMenuSearch] = useState("");
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");

  const settingsCacheRef = useRef<any>(null);

  const toggleTheme = () => {
    setThemeMode("dark");
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.remove("gm-light", "light");
    document.documentElement.classList.add("gm-dark", "dark");
    localStorage.setItem("theme", "dark");
  };

  useEffect(() => localStorage.setItem("gm.sidebar", collapsed ? "1" : "0"), [collapsed]);

  useEffect(() => {
    localStorage.setItem("theme", "dark");
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.remove("gm-light", "light");
    document.documentElement.classList.add("gm-dark", "dark");

    const savedBtnStyle = localStorage.getItem("gm_button_style_fallback") || "vazado";
    document.documentElement.setAttribute("data-button-style", savedBtnStyle);
  }, []);

  useEffect(() => {
    const handleThemeUpdate = (e: any) => {
      localStorage.setItem("theme", "dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("gm-light", "light");
      document.documentElement.classList.add("gm-dark", "dark");
      setThemeMode("dark");

      if (e?.detail) {
        // Aplica cores do evento de preview diretamente sem ler cache antigo
        applySettingsToDOM(
          {
            brand_primary: e.detail.primary,
            brand_accent: e.detail.accent,
            brand_bg: e.detail.bg,
            brand_title: e.detail.title,
            brand_subtitle: e.detail.subtitle,
            brand_icon: e.detail.icon,
            brand_button: e.detail.button || e.detail.primary,
            menu_primary: e.detail.menu_primary || e.detail.primary,
            menu_bg: e.detail.menu_bg || e.detail.bg,
            menu_title: e.detail.menu_title || e.detail.title,
            menu_subtitle: e.detail.menu_subtitle || e.detail.subtitle,
            menu_icon: e.detail.menu_icon || e.detail.icon,
            menu_button: e.detail.menu_button || e.detail.primary,
          },
          false
        );
      }
    };

    window.addEventListener("gm_theme_updated", handleThemeUpdate);
    return () => window.removeEventListener("gm_theme_updated", handleThemeUpdate);
  }, [tenantId]);

  const [appSettings, setAppSettings] = useState<any>(() => readSettingsLocal());

  useEffect(() => {
    // Inicializa a sincronização em tempo real simultânea entre Desktop & Smartphone
    const cleanupSync = initSyncHub(tenantId);

    fetchSettingsSupabase(tenantId)
      .then((s) => {
        if (s) {
          settingsCacheRef.current = s;
          setAppSettings(s);
          applySettingsToDOM(s);
        }
      })
      .catch(() => {});

    const handleSettingsUpdate = (e: any) => {
      if (e?.detail) {
        setAppSettings(e.detail);
      } else if (tenantId) {
        fetchSettingsSupabase(tenantId).then((s) => {
          if (s) setAppSettings(s);
        });
      }
    };

    const handleNotificationsChanged = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setNotifications(e.detail);
      } else {
        const saved = getSavedNotifications();
        if (saved.length > 0) setNotifications(saved);
      }
    };

    window.addEventListener("gm_settings_updated", handleSettingsUpdate);
    window.addEventListener("gm_notifications_changed", handleNotificationsChanged);

    return () => {
      cleanupSync();
      window.removeEventListener("gm_settings_updated", handleSettingsUpdate);
      window.removeEventListener("gm_notifications_changed", handleNotificationsChanged);
    };
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

  // Navegação por Gesto de Arrastar (Swipe) e Touch Lateral Esquerda/Direita para mudar de tela
  const currentNavIndex = useMemo(() => {
    return nav.findIndex((it) => {
      if (it.to === "/") return location.pathname === "/";
      return location.pathname.startsWith(it.to);
    });
  }, [nav, location.pathname]);

  const [pageToast, setPageToast] = useState<{ label: string; dir: "left" | "right" } | null>(null);

  const goToPrevPage = () => {
    const hasOpenModal = Boolean(
      document.querySelector('[role="dialog"], .gm-modal, .fixed.inset-0:not(.pointer-events-none)')
    );
    if (hasOpenModal) return;

    const idx = currentNavIndex >= 0 ? currentNavIndex : 0;
    const prevIdx = idx <= 0 ? nav.length - 1 : idx - 1;
    const target = nav[prevIdx];
    setPageToast({ label: target.label, dir: "left" });
    navigate(target.to);
  };

  const goToNextPage = () => {
    const hasOpenModal = Boolean(
      document.querySelector('[role="dialog"], .gm-modal, .fixed.inset-0:not(.pointer-events-none)')
    );
    if (hasOpenModal) return;

    const idx = currentNavIndex >= 0 ? currentNavIndex : 0;
    const nextIdx = idx >= nav.length - 1 ? 0 : idx + 1;
    const target = nav[nextIdx];
    setPageToast({ label: target.label, dir: "right" });
    navigate(target.to);
  };

  useEffect(() => {
    if (!pageToast) return;
    const timer = setTimeout(() => setPageToast(null), 900);
    return () => clearTimeout(timer);
  }, [pageToast]);

  const handleSwipeLeft = () => {
    goToNextPage();
  };

  const handleSwipeRight = () => {
    goToPrevPage();
  };

  const swipeMainRef = useSwipeNav<HTMLElement>({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    thresholdPx: 80,
    restraintPx: 60,
    allowedTimeMs: 450,
  });

  const setMainRefs = (el: HTMLElement | null) => {
    mainRef.current = el;
    swipeMainRef.current = el;
  };

  // Reseta a rolagem vertical para o topo sempre que o usuário troca de rota e atualiza indicadores de rolagem
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, left: 0, behavior: "instant" as any });
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as any });

    const checkScroll = () => {
      const el = mainRef.current || (document.querySelector('.gm-main') as HTMLElement);
      if (el) {
        const currentY = el.scrollTop || window.scrollY || 0;
        const maxScroll = el.scrollHeight - el.clientHeight;
        setCanScrollUp(currentY > 60);
        setCanScrollDown(maxScroll > 20 && currentY < maxScroll - 40);
      }
    };

    const timer = setTimeout(checkScroll, 200);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Efeito de Parallax Suave Contínuo no Plano de Fundo (Mouse + Scroll)
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const isMobileDevice =
      typeof window !== "undefined" &&
      (window.innerWidth < 768 || ("ontouchstart" in window && window.innerWidth < 1024));

    if (reduced || isMobileDevice) {
      document.documentElement.style.setProperty("--gm-app-bg-parallax-y", "0px");
      document.documentElement.style.setProperty("--gm-app-bg-parallax-x", "0px");
      document.documentElement.style.setProperty("--gm-app-bg-parallax-y-mouse", "0px");
      document.documentElement.style.setProperty("--gm-app-bg-depth-scale", "1.04");
      return;
    }

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    // Scroll targets
    let targetScrollY = 0;
    let currentScrollY = 0;
    let targetDepth = 1.04;
    let currentDepth = 1.04;

    // Mouse targets
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    let raf = 0;
    let isRunning = false;

    // Constantes de física ultra suave (damping suave, sem solavancos)
    const SCROLL_STRENGTH = 0.045; // Suave e contínuo ao rolar
    const MAX_SCROLL_Y = 160;
    const BASE_DEPTH = 1.04;
    const DEPTH_GAIN = 0.000015;
    const MAX_DEPTH_ADD = 0.035;

    const MOUSE_MAX_X = 14;
    const MOUSE_MAX_Y = 10;

    const getScrollTop = () => {
      const mainEl = mainRef.current;
      const mainScroll = mainEl ? mainEl.scrollTop : 0;
      const winScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      return Math.max(mainScroll, winScroll);
    };

    const updateScrollTargets = () => {
      const st = getScrollTop();
      targetScrollY = clamp(-st * SCROLL_STRENGTH, -MAX_SCROLL_Y, MAX_SCROLL_Y);
      targetDepth = BASE_DEPTH + clamp(st * DEPTH_GAIN, 0, MAX_DEPTH_ADD);
    };

    const tick = () => {
      // Interpolação amortecida suave (smooth ease-out)
      currentScrollY = lerp(currentScrollY, targetScrollY, 0.045);
      currentDepth = lerp(currentDepth, targetDepth, 0.045);
      currentMouseX = lerp(currentMouseX, targetMouseX, 0.04);
      currentMouseY = lerp(currentMouseY, targetMouseY, 0.04);

      document.documentElement.style.setProperty("--gm-app-bg-parallax-y", `${currentScrollY.toFixed(2)}px`);
      document.documentElement.style.setProperty("--gm-app-bg-depth-scale", `${currentDepth.toFixed(3)}`);
      document.documentElement.style.setProperty("--gm-app-bg-parallax-x", `${currentMouseX.toFixed(2)}px`);
      document.documentElement.style.setProperty("--gm-app-bg-parallax-y-mouse", `${currentMouseY.toFixed(2)}px`);

      const diffScroll = Math.abs(currentScrollY - targetScrollY);
      const diffDepth = Math.abs(currentDepth - targetDepth);
      const diffMouseX = Math.abs(currentMouseX - targetMouseX);
      const diffMouseY = Math.abs(currentMouseY - targetMouseY);

      if (diffScroll > 0.02 || diffDepth > 0.0005 || diffMouseX > 0.02 || diffMouseY > 0.02) {
        raf = requestAnimationFrame(tick);
      } else {
        isRunning = false;
      }
    };

    const startAnimation = () => {
      if (!isRunning) {
        isRunning = true;
        raf = requestAnimationFrame(tick);
      }
    };

    let activeScrollElement: HTMLElement | null = null;

    const onScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.scrollHeight && target.scrollHeight > target.clientHeight + 10) {
        if (activeScrollElement !== target) {
          if (activeScrollElement) {
            activeScrollElement.removeAttribute('data-active-scroll');
          }
          activeScrollElement = target;
          activeScrollElement.setAttribute('data-active-scroll', 'true');
        }
      }

      updateScrollTargets();
      startAnimation();

      if (target) {
        const currentY = target.scrollTop || window.scrollY || 0;
        const maxScroll = (target.scrollHeight || document.documentElement.scrollHeight) - (target.clientHeight || window.innerHeight);
        setCanScrollUp(currentY > 60);
        setCanScrollDown(maxScroll > 20 && currentY < maxScroll - 40);
      }
    };

    const onMouseMove = (e: MouseEvent | PointerEvent) => {
      // Ignora eventos de toque no mobile para não interferir na rolagem
      if ("pointerType" in e && e.pointerType === "touch") return;

      // Verifica se o efeito do mouse está habilitado para a Área de Trabalho
      const currentCfg = bgEffectRef.current;
      const isMouseActive = isEffectActiveFor("desktop", currentCfg) && getEffectFor("desktop", currentCfg) === "mouse";
      if (!isMouseActive) {
        if (targetMouseX !== 0 || targetMouseY !== 0) {
          targetMouseX = 0;
          targetMouseY = 0;
          startAnimation();
        }
        return;
      }

      // Coordenadas normalizadas [-1, 1]
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;

      // Nível de força configurado para o Parallax do Mouse
      const strength = (getEffectStrength("desktop", "mouse", currentCfg) || 100) / 100;
      const effectiveMaxX = MOUSE_MAX_X * strength;
      const effectiveMaxY = MOUSE_MAX_Y * strength;

      // Movimento suave proporcional e orgânico
      targetMouseX = clamp(nx * effectiveMaxX, -effectiveMaxX, effectiveMaxX);
      targetMouseY = clamp(-ny * effectiveMaxY, -effectiveMaxY, effectiveMaxY);

      startAnimation();
    };

    const onMouseLeave = () => {
      // Retorna com calma para o centro se o mouse sair da janela
      targetMouseX = 0;
      targetMouseY = 0;
      startAnimation();
    };

    // Inicialização
    updateScrollTargets();
    startAnimation();

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("pointermove", onMouseMove, { passive: true });
    window.addEventListener("mouseleave", onMouseLeave, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true } as any);
      window.removeEventListener("pointermove", onMouseMove as any);
      window.removeEventListener("mouseleave", onMouseLeave);
      if (raf) cancelAnimationFrame(raf);
      document.documentElement.style.setProperty("--gm-app-bg-parallax-y", "0px");
      document.documentElement.style.setProperty("--gm-app-bg-parallax-x", "0px");
      document.documentElement.style.setProperty("--gm-app-bg-parallax-y-mouse", "0px");
      document.documentElement.style.setProperty("--gm-app-bg-depth-scale", `${BASE_DEPTH}`);
    };
  }, []);

  // Estado e sincronização em tempo real dos Efeitos Dinâmicos de Fundo
  const [bgEffect, setBgEffect] = useState<BgEffectConfig>(() => readBgEffectConfig());
  const bgEffectRef = useRef<BgEffectConfig>(bgEffect);
  bgEffectRef.current = bgEffect;

  useEffect(() => {
    applyBgEffectToRoot(bgEffect);

    const handleBgEffect = (e: any) => {
      if (e?.detail) {
        setBgEffect(e.detail);
        applyBgEffectToRoot(e.detail);
      } else {
        const next = readBgEffectConfig();
        setBgEffect(next);
        applyBgEffectToRoot(next);
      }
    };

    window.addEventListener("gm-bg-effect-changed", handleBgEffect);
    return () => window.removeEventListener("gm-bg-effect-changed", handleBgEffect);
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);
  const [uiSoundsActive, setUiSoundsActive] = useState(() => !isUiSoundMuted());

  useEffect(() => {
    const handleSoundChange = (e: any) => {
      if (e?.detail?.muted !== undefined) {
        setUiSoundsActive(!e.detail.muted);
      } else {
        setUiSoundsActive(!isUiSoundMuted());
      }
    };
    window.addEventListener("gm.uiSoundChanged", handleSoundChange);
    return () => window.removeEventListener("gm.uiSoundChanged", handleSoundChange);
  }, []);

  const toggleUiSounds = () => {
    const nextState = !uiSoundsActive;
    if (nextState) {
      setUiSoundMuted(false);
      setUiSoundsActive(true);
      playUiSound("toggle_on");
    } else {
      playUiSound("toggle_off");
      setUiSoundMuted(true);
      setUiSoundsActive(false);
    }
  };

  const handleSyncClick = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 900);
    window.dispatchEvent(new CustomEvent("open-smartphone-permissions"));
    window.dispatchEvent(new CustomEvent("trigger-app-sync"));
  };

  const renderSoundToggleButton = (isCollapsed = false) => {
    if (isCollapsed) {
      return (
        <button
          type="button"
          onClick={toggleUiSounds}
          title={`Sons dos Botões: ${uiSoundsActive ? "Ativado (ON)" : "Desativado (OFF)"}`}
          aria-label={`Sons dos Botões: ${uiSoundsActive ? "Ativado (ON)" : "Desativado (OFF)"}`}
          className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border ${
            uiSoundsActive
              ? "bg-emerald-500/20 text-white border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white opacity-70"
          }`}
        >
          {uiSoundsActive ? (
            <Volume2 size={18} className="animate-pulse text-white" />
          ) : (
            <VolumeX size={18} className="text-white" />
          )}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={toggleUiSounds}
        title={`Sons dos Botões: clique para ${uiSoundsActive ? "desligar (off)" : "ligar (on)"}`}
        aria-label={`Sons dos Botões: clique para ${uiSoundsActive ? "desligar (off)" : "ligar (on)"}`}
        className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-between transition-all duration-300 cursor-pointer select-none group active:scale-[0.98] ${
          uiSoundsActive
            ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.35)] hover:bg-emerald-500/25"
            : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-300 opacity-60 hover:opacity-85"
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              uiSoundsActive
                ? "bg-emerald-500 text-white font-bold shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                : "bg-white/10 text-white"
            }`}
          >
            {uiSoundsActive ? (
              <Volume2 size={15} className="stroke-[2.5] text-white" />
            ) : (
              <VolumeX size={15} className="text-white" />
            )}
          </div>
          <span
            className={`text-xs tracking-wide uppercase transition-colors ${
              uiSoundsActive ? "font-black text-emerald-300" : "font-semibold text-slate-400"
            }`}
          >
            Sons dos Botões
          </span>
        </div>

        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase transition-all ${
            uiSoundsActive
              ? "bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
              : "bg-black/40 text-slate-500 border border-white/10"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              uiSoundsActive ? "bg-slate-950 animate-ping" : "bg-slate-600"
            }`}
          />
          {uiSoundsActive ? "ON" : "OFF"}
        </div>
      </button>
    );
  };

  const renderSyncButton = (extraBtnClass = "") => (
    <button
      type="button"
      onClick={handleSyncClick}
      title="Sincronização do App"
      aria-label="Sincronização do App"
      className={`w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] aspect-square rounded-xl flex items-center justify-center hover:!text-white active:scale-90 transition-all duration-200 relative cursor-pointer bg-transparent border-0 outline-none shrink-0 grow-0 self-center group p-0 overflow-hidden ${extraBtnClass}`}
      style={{
        width: '36px',
        height: '36px',
        minWidth: '36px',
        minHeight: '36px',
        maxWidth: '36px',
        maxHeight: '36px',
        borderRadius: '10px',
        aspectRatio: '1 / 1',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        margin: '0',
        boxSizing: 'border-box',
        overflow: 'hidden',
        color: "var(--gm-menu-icon, var(--gm-menu-primary, var(--gm-primary, #FE540B)))",
      }}
    >
      <RefreshCw 
        size={20} 
        className={`text-current shrink-0 transition-transform duration-700 ${isSyncing ? "animate-spin" : "group-hover:rotate-180"}`} 
      />
    </button>
  );

  const renderBellButton = (extraBtnClass = "") => (
    <button
      type="button"
      onClick={handleBellClick}
      title="Atualizações e Informações"
      aria-label="Atualizações e Informações"
      className={`w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] aspect-square rounded-xl flex items-center justify-center hover:!text-white active:scale-90 transition-all duration-200 relative cursor-pointer bg-transparent border-0 outline-none shrink-0 grow-0 self-center group p-0 overflow-hidden ${extraBtnClass}`}
      style={{
        width: '36px',
        height: '36px',
        minWidth: '36px',
        minHeight: '36px',
        maxWidth: '36px',
        maxHeight: '36px',
        borderRadius: '10px',
        aspectRatio: '1 / 1',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        margin: '0',
        boxSizing: 'border-box',
        overflow: 'hidden',
        color: "var(--gm-menu-icon, var(--gm-menu-primary, var(--gm-primary, #FE540B)))",
      }}
    >
      <Bell size={20} className="animate-swing text-current shrink-0" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-transparent group-hover:border-white transition-colors" />
      )}
    </button>
  );

  const renderLogoutButton = (extraBtnClass = "") => (
    <button 
      type="button"
      onClick={signOut}
      title="Sair"
      aria-label="Sair"
      className={`w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] aspect-square rounded-xl flex items-center justify-center hover:!text-white active:scale-90 transition-all duration-200 cursor-pointer bg-transparent border-0 outline-none shrink-0 grow-0 self-center group p-0 overflow-hidden ${extraBtnClass}`}
      style={{
        width: '36px',
        height: '36px',
        minWidth: '36px',
        minHeight: '36px',
        maxWidth: '36px',
        maxHeight: '36px',
        borderRadius: '10px',
        aspectRatio: '1 / 1',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        margin: '0',
        boxSizing: 'border-box',
        overflow: 'hidden',
        color: "var(--gm-menu-icon, var(--gm-menu-primary, var(--gm-primary, #FE540B)))",
      }}
    >
      <LogOut size={20} className="text-current shrink-0 group-hover:scale-110 transition-transform" />
    </button>
  );

  const renderSoundButton = (extraBtnClass = "") => (
    <button
      type="button"
      onClick={toggleUiSounds}
      title={uiSoundsActive ? "Sons do App: Ativados (toque para desativar)" : "Sons do App: Desativados (toque para ativar)"}
      aria-label={uiSoundsActive ? "Sons do App Ativados" : "Sons do App Desativados"}
      className={`w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] aspect-square rounded-xl flex items-center justify-center hover:!text-white active:scale-90 transition-all duration-200 relative cursor-pointer bg-transparent border-0 outline-none shrink-0 grow-0 self-center group p-0 overflow-hidden ${extraBtnClass}`}
      style={{
        width: '36px',
        height: '36px',
        minWidth: '36px',
        minHeight: '36px',
        maxWidth: '36px',
        maxHeight: '36px',
        borderRadius: '10px',
        aspectRatio: '1 / 1',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        margin: '0',
        boxSizing: 'border-box',
        overflow: 'hidden',
        color: uiSoundsActive
          ? "var(--gm-menu-icon, var(--gm-menu-primary, var(--gm-primary, #FE540B)))"
          : "rgba(148, 163, 184, 0.65)",
      }}
    >
      {uiSoundsActive ? (
        <Volume2 size={20} className="text-current shrink-0 group-hover:scale-110 transition-transform" />
      ) : (
        <VolumeX size={20} className="text-current shrink-0 group-hover:scale-110 transition-transform" />
      )}
      {uiSoundsActive && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-transparent group-hover:border-white transition-colors shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
      )}
    </button>
  );

  const renderHeaderActionButtons = (extraClass = "") => (
    <div className={`flex items-center gap-1.5 sm:gap-2 shrink-0 ${extraClass}`}>
      {renderSoundButton()}
      {renderSyncButton()}
      {renderBellButton()}
      {renderLogoutButton()}
    </div>
  );

  return (
    <div className="gm-layout">
      {/* CAMADA DINÂMICA AURORA BEAM GLOW (Quando efeito Aurora ativo na Área de Trabalho) */}
      {isEffectActiveFor("desktop", bgEffect) && getEffectFor("desktop", bgEffect) === "aurora" && (
        <div className="gm-bg-aurora-layer" />
      )}

      {/* CAMADA DINÂMICA PRISMA GLOW (Quando efeito Prisma ativo na Área de Trabalho) */}
      {isEffectActiveFor("desktop", bgEffect) && getEffectFor("desktop", bgEffect) === "prism" && (
        <div className="gm-bg-prism-layer" />
      )}

      {/* Novo componente de alarmes para orçamentos aprovados */}
      <AlarmToast />

      {/* Modal de Permissões para Smartphone (Notificações em tempo real simultâneas) */}
      <SmartphonePermissionModal />

      {/* Tutorial Onboarding do Aplicativo */}
      {showTutorial && <AppTutorial onClose={() => setShowTutorial(false)} />}

      {/* MOBILE TOP HEADER - FROSTED GLASS TRANSLUCENT */}
      <header 
        className="fixed top-0 left-0 right-0 w-full h-16 z-[100] flex md:hidden items-center justify-between px-4 bg-black/10 dark:bg-black/10 backdrop-blur-md border-b border-white/10 shadow-none gm-mobile-header select-none"
        style={{
          zIndex: 100,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          background: "rgba(10, 10, 14, 0.15)",
        }}
      >
        <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center shrink-0">
              <div className="w-8 h-8 rounded-lg border border-white/15 flex items-center justify-center overflow-hidden shadow-none bg-black/40 !p-0">
                <img 
                  src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg" 
                  alt="Logo CardDigital GM" 
                  className="w-full h-full object-cover scale-[1.3] transform"
                />
              </div>
            </div>
            <div className="flex flex-col leading-tight">
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  CardDigital <span className="text-[var(--gm-primary)] font-black">GM</span>
                </span>
            </div>
        </div>

        {/* Botões do cabeçalho mobile: caixas quadradas 1:1 com bordas levemente arredondadas e ícones na cor laranja */}
        {renderHeaderActionButtons()}
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside
        ref={sidebarRef}
        style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px` }}
        className={`sidebar gm-sidebar ${collapsed ? "collapsed" : ""} hidden md:flex shrink-0 relative`}
      >
        {/* Toggle Button on the right edge (Seta de expansão fixa: no hover apenas muda cor e leve escala sem sair do lugar) */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            right: "-10px",
            zIndex: 70,
            pointerEvents: "auto"
          }}
          className="flex items-center justify-center"
        >
          <button
            type="button"
            onClick={toggleSidebar}
            className="w-5 h-9 rounded-full bg-black/85 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-[var(--gm-primary)] hover:border-[var(--gm-primary)] hover:scale-105 active:scale-95 transition-all duration-150 shadow-xl backdrop-blur-md cursor-pointer outline-none !m-0 !p-0"
            style={{
              transformOrigin: "center center"
            }}
            title={collapsed ? "Expandir menu" : "Encolher menu"}
            aria-label={collapsed ? "Expandir menu" : "Encolher menu"}
          >
            {collapsed ? (
              <ChevronRight size={13} className="stroke-[2.5]" />
            ) : (
              <ChevronLeft size={13} className="stroke-[2.5]" />
            )}
          </button>
        </div>

        <div className="sidebar-inner flex flex-col h-full w-full">
          {/* Header */}
          <header className="flex items-center gap-3.5 px-4 py-4 border-b border-white/10 shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-none bg-black/40 border border-white/15 !p-0">
              <img 
                src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg" 
                alt="Logo Official CardDigital GM" 
                className="w-full h-full object-cover logo-icon scale-[1.3] transform"
              />
            </div>
            {!collapsed && (
              <div className="flex items-center gap-1 leading-none overflow-hidden logo-text">
                <span className="text-base font-bold text-[var(--gm-menu-title)] truncate">
                  CardDigital <span className="gm-logo-highlight font-black transition-colors duration-200" style={{ color: "var(--gm-menu-primary, var(--gm-primary, #FE540B))" }}>GM</span>
                </span>
              </div>
            )}
          </header>

          {/* Navigation List - Espaçamento enxuto, organizado e uniforme */}
          <ul className="flex flex-col py-2 px-2 gap-1.5 overflow-y-auto overflow-x-hidden">
            {filteredNav.map(({ to, label, icon: Icon }) => (
              <li key={to} className="w-full">
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `sidebar-btn w-full h-10 flex items-center gap-3 px-3 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                      isActive
                        ? "active font-semibold text-white bg-white/10 border border-white/10 shadow-sm"
                        : "text-white/80 hover:text-white hover:bg-white/5"
                    } ${collapsed ? "justify-center !px-0" : ""}`
                  }
                  title={collapsed ? label : undefined}
                >
                  <Icon 
                    size={17} 
                    className="shrink-0 transition-colors duration-200" 
                    style={{ color: "var(--gm-menu-icon, var(--gm-menu-primary, var(--gm-primary, #FE540B)))" }}
                  />
                  {!collapsed && <p className="truncate text-left">{label}</p>}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Footer - Linha de divisão logo abaixo dos 9 botões com visual organizado e centralizado */}
          <div className="sidebar-footer p-2.5 border-t border-white/10 shrink-0 flex flex-col gap-2">
            {collapsed ? (
              <div className="flex flex-col items-center gap-2 w-full py-1">
                {renderSyncButton()}
                {renderBellButton()}
                {renderLogoutButton()}
                <div className="w-6 h-[1px] bg-white/10 my-0.5" />
                {renderSoundToggleButton(true)}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 w-full">
                {/* Linha 1: Fileira com Sincronização do App, Notificações e Sair em 3 caixas proporcionais */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  <button
                    type="button"
                    onClick={handleSyncClick}
                    title="Sincronização do App"
                    aria-label="Sincronização do App"
                    className="h-10 w-full rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 active:scale-95 group"
                    style={{
                      color: "var(--gm-menu-icon, var(--gm-menu-primary, var(--gm-primary, #FE540B)))",
                    }}
                  >
                    <RefreshCw 
                      size={18} 
                      className={`text-current shrink-0 transition-transform duration-700 ${isSyncing ? "animate-spin" : "group-hover:rotate-180"}`} 
                    />
                  </button>

                  <button
                    type="button"
                    onClick={handleBellClick}
                    title="Atualizações e Informações"
                    aria-label="Atualizações e Informações"
                    className="h-10 w-full rounded-xl flex items-center justify-center transition-all duration-200 relative cursor-pointer border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 active:scale-95 group"
                    style={{
                      color: "var(--gm-menu-icon, var(--gm-menu-primary, var(--gm-primary, #FE540B)))",
                    }}
                  >
                    <Bell size={18} className="animate-swing text-current shrink-0" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-black/40" />
                    )}
                  </button>

                  <button 
                    type="button"
                    onClick={signOut}
                    title="Sair"
                    aria-label="Sair"
                    className="h-10 w-full rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 active:scale-95 group"
                    style={{
                      color: "var(--gm-menu-icon, var(--gm-menu-primary, var(--gm-primary, #FE540B)))",
                    }}
                  >
                    <LogOut size={18} className="text-current shrink-0 group-hover:scale-110 transition-transform" />
                  </button>
                </div>

                {/* Linha 2: Botão grande pegando as extremidades da caixa do menu (Sons dos Botões ON / OFF) */}
                {renderSoundToggleButton(false)}

                <div className="mt-0.5 text-[10px] text-center pointer-events-none tracking-tight leading-none whitespace-nowrap flex items-center justify-center gap-1 text-slate-400">
                  <span className="text-[10px] text-slate-400 font-normal">Desenvolvido por</span>
                  <span className="text-[10px] font-bold text-[var(--gm-menu-title)]">CardDigital</span>
                  <span className="text-[10px] font-bold gm-logo-highlight transition-colors duration-200" style={{ color: "var(--gm-menu-primary, var(--gm-primary, #FE540B))" }}>GM</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main 
        ref={setMainRefs}
        className="gm-main flex-1 min-w-0 flex flex-col items-center justify-start h-full min-h-0 overflow-y-auto w-full p-0 scroll-smooth"
      >
        <div className="gm-container w-full max-w-[1440px] mx-auto flex flex-col items-stretch px-4 sm:px-8 md:px-10 lg:px-12 xl:px-16 pt-20 md:pt-10 lg:pt-12 pb-[calc(var(--bottom-nav-height,84px)+36px)] md:pb-16">
          {children}
        </div>
      </main>
      
      {/* FLOATING ACTION & SCROLL INDICATORS */}
      {createPortal(
        <>
          {/* WHATSAPP SUPPORT BUTTON (EXCLUSIVO NA PÁGINA DO DASHBOARD NO CANTO INFERIOR DIREITO) */}
          <AnimatePresence mode="wait">
            {location.pathname === "/" && (
              <motion.div
                key="dashboard-whatsapp-floating-btn"
                initial={{ scale: 0, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0, y: 15 }}
                transition={{ type: "spring", damping: 22, stiffness: 350 }}
                className="fixed bottom-[calc(var(--bottom-nav-height,96px)+16px)] md:bottom-7 right-4 md:right-7 z-[10002] pointer-events-auto"
              >
                <button
                  type="button"
                  onClick={() => {
                    openWhatsapp("5598981120686", "Olá! CardDigital GM, preciso de outras informações.");
                  }}
                  className="flex items-center justify-center w-12 h-12 md:w-13 md:h-13 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white border border-white/25 shadow-[0_8px_28px_rgba(37,211,102,0.45)] hover:shadow-[0_12px_36px_rgba(37,211,102,0.65)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none"
                  aria-label="Ajuda via WhatsApp"
                  title="Ajuda via WhatsApp"
                >
                  <WhatsAppIcon size={26} className="text-white pointer-events-none" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SCROLL INDICATOR ARROWS (CENTERED VERTICALLY IN THE MIDDLE OF THE SCREEN ON THE RIGHT - NO BOX/BACKGROUND, ONLY ARROW STROKE) */}
          <div 
            className="fixed right-1.5 sm:right-2.5 md:right-4 top-1/2 -translate-y-1/2 z-[10001] flex flex-col items-center gap-2 pointer-events-none select-none" 
            style={{ zIndex: 10001 }}
          >
              {/* BACK TO TOP ARROW (PURE CHEVRON STROKE) */}
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
                className={`transition-all duration-300 flex items-center justify-center p-1.5 bg-transparent border-0 shadow-none pointer-events-auto cursor-pointer focus:outline-none group ${
                  canScrollUp ? "opacity-85 hover:opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
                }`}
                aria-label="Rolar para o topo"
                title="Rolar para o topo"
              >
                <ChevronUp 
                  size={34} 
                  strokeWidth={2.8} 
                  className="text-[var(--gm-primary,#FE540B)] drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] group-hover:scale-125 group-active:scale-90 transition-transform duration-200" 
                />
              </button>

              {/* SCROLL DOWN ARROW (PURE CHEVRON STROKE) */}
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
                  className={`transition-all duration-300 flex items-center justify-center p-1.5 bg-transparent border-0 shadow-none pointer-events-auto cursor-pointer focus:outline-none group ${
                    canScrollDown ? "opacity-85 hover:opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
                  }`}
                  aria-label="Rolar para baixo"
                  title="Rolar para baixo"
                >
                  <ChevronDown 
                    size={34} 
                    strokeWidth={2.8} 
                    className="text-[var(--gm-primary,#FE540B)] drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] group-hover:scale-125 group-active:scale-90 transition-transform duration-200" 
                  />
                </button>
              )}
            </div>

          {/* HUD TOAST INDICADOR DE TROCA DE PÁGINA */}
          <AnimatePresence>
            {pageToast && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className="fixed top-[72px] left-1/2 -translate-x-1/2 z-[10000] pointer-events-none md:hidden"
              >
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-950/90 backdrop-blur-xl border border-white/20 text-white text-xs font-bold shadow-2xl">
                  {pageToast.dir === "left" && <ChevronLeft size={14} className="text-[var(--gm-primary)]" />}
                  <span className="tracking-tight">{pageToast.label}</span>
                  {pageToast.dir === "right" && <ChevronRight size={14} className="text-[var(--gm-primary)]" />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}

      <BottomNav />
      <ToastHost />

      {/* UPDATE DIALOG MODAL (NOTIFICAÇÕES CENTER EXPANDIDO) */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-3 sm:p-6 bg-black/75 animate-fade-in" style={{ zIndex: 1000000 }}>
          <div className="relative w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl gm-push-glass-card rounded-[28px] border border-white/20 p-5 sm:p-7 shadow-[0_30px_90px_rgba(0,0,0,0.85)] flex flex-col gap-4.5 text-white overflow-hidden font-sans max-h-[90vh]">
            
            {/* Specular reflection overlay */}
            <div className="absolute inset-0 pointer-events-none rounded-[28px] bg-gradient-to-b from-white/[0.12] via-transparent to-black/30" />
            
            {/* Ambient Glow */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-[var(--gm-primary)]/15 rounded-full blur-3xl pointer-events-none" />
            
            {/* Header */}
            <div className="flex items-center justify-between shrink-0 pb-3.5 border-b border-white/10 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl barra border border-white/15 flex items-center justify-center text-zinc-300 relative shadow-none">
                  <Bell size={20} className={unreadCount > 0 ? "text-[var(--gm-primary)]" : "text-zinc-400"} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black animate-pulse" />
                  )}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base sm:text-lg tracking-tight text-white mb-0 uppercase">Notificações</h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/15">
                      Central Push
                    </span>
                  </div>
                  <span className="text-xs font-bold text-zinc-400 tracking-wide uppercase">
                    {unreadCount > 0 ? `${unreadCount} pendentes` : "Tudo em dia"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="w-9 h-9 rounded-full barra hover:bg-white/15 flex items-center justify-center transition-all text-zinc-400 hover:text-white border border-white/10 shadow-none cursor-pointer"
                onClick={() => setShowUpdateModal(false)}
                title="Fechar Notificações"
              >
                <X size={16} />
              </button>
            </div>

            {/* Botão de Check-in de Notificações nos 4 Estados (Expandido) */}
            <button
              type="button"
              onClick={() => {
                setShowUpdateModal(false);
                setShowCheckinModal(true);
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-[var(--gm-primary)]/35 bg-[var(--gm-primary)]/10 hover:bg-[var(--gm-primary)]/20 text-xs font-black text-white flex items-center justify-between transition-all cursor-pointer shadow-none shrink-0 relative z-10 group"
            >
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--gm-primary)] animate-pulse" />
                <span className="uppercase tracking-wide">Check-in de Notificações (4 Estados)</span>
              </span>
              <span className="text-[10px] uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold group-hover:scale-105 transition-transform">
                Aberto · Minimizado · 2º Plano · Fechado
              </span>
            </button>

            {/* Tabs Filter Bar */}
            <div className="flex items-center gap-1.5 barra border border-white/10 rounded-xl p-1.5 shrink-0 shadow-none relative z-10">
              <button
                type="button"
                onClick={() => setActiveTab("todas")}
                className={`py-2 rounded-lg text-center text-xs font-black transition-all flex-1 cursor-pointer ${
                  activeTab === "todas"
                    ? "bg-[var(--gm-primary)] text-white border border-[var(--gm-primary)]/40 shadow-none"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("nao_lidas")}
                className={`py-2 rounded-lg text-center text-xs font-black transition-all flex-1 cursor-pointer ${
                  activeTab === "nao_lidas"
                    ? "bg-[var(--gm-primary)] text-white border border-[var(--gm-primary)]/40 shadow-none"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Não lidas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("diretas")}
                className={`py-2 rounded-lg text-center text-xs font-black transition-all flex-1 cursor-pointer ${
                  activeTab === "diretas"
                    ? "bg-[var(--gm-primary)] text-white border border-[var(--gm-primary)]/40 shadow-none"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Diretas
              </button>
            </div>

            {/* Marcar todas como lidas Button */}
            {unreadCount > 0 && (
              <div className="flex justify-end shrink-0 px-1 -mt-1 relative z-10">
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs font-black text-[var(--gm-primary)] hover:text-orange-400 transition-all uppercase tracking-wider flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Check size={12} className="stroke-[3]" />
                  Marcar todas como lidas
                </button>
              </div>
            )}

            {/* Notifications Feed Viewport */}
            <div className="overflow-y-auto pr-0.5 space-y-3 max-h-[380px] no-scrollbar text-left flex-1 min-h-[220px] flex flex-col relative z-10">
              {filteredNotifications.length > 0 ? (
                <div className="space-y-3 w-full">
                  {filteredNotifications.map((noti) => (
                    <div
                      key={noti.id}
                      onClick={() => toggleRead(noti.id)}
                      className={`group relative p-3 border rounded-xl hover:bg-white/5 transition-all flex gap-3 cursor-pointer select-none shadow-none ${
                        noti.read
                          ? "barra border-white/5 opacity-70"
                          : "barra border-white/15 hover:border-[var(--gm-primary)]/40"
                      }`}
                    >
                      {/* Badge Icon / Logo cadastrado do usuário */}
                      <div className="shrink-0 mt-0.5">
                        {noti.icon || appSettings?.company_logo_url ? (
                          <div className={`w-8 h-8 rounded-lg overflow-hidden border flex items-center justify-center p-0.5 ${
                            noti.read ? "border-white/10 opacity-70 bg-black/40" : "border-white/20 bg-black/60 shadow-sm"
                          }`}>
                            <img
                              src={noti.icon || appSettings?.company_logo_url || ""}
                              alt=""
                              className="w-full h-full object-contain rounded-md"
                            />
                          </div>
                        ) : noti.type === "direct" ? (
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                            noti.read 
                              ? "barra border-white/10 text-zinc-500" 
                              : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                          }`}>
                            <MessageSquare size={14} />
                          </div>
                        ) : noti.type === "update" ? (
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                            noti.read
                              ? "barra border-white/10 text-zinc-500"
                              : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                          }`}>
                            <Sparkles size={14} className={noti.read ? "" : "animate-pulse"} />
                          </div>
                        ) : (
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                            noti.read
                              ? "barra border-white/10 text-zinc-500"
                              : "bg-orange-500/10 border-orange-500/25 text-orange-400"
                          }`}>
                            <Clock size={14} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-white/10">
                          {appSettings?.company_logo_url ? (
                            <img src={appSettings.company_logo_url} alt={appSettings?.company_name || "Empresa"} className="w-3.5 h-3.5 object-contain rounded shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] flex items-center justify-center text-[8px] font-black uppercase shrink-0">
                              {appSettings?.company_name ? appSettings.company_name.substring(0, 2) : "GM"}
                            </div>
                          )}
                          <span className="text-[10px] font-extrabold text-[var(--gm-primary)] uppercase tracking-wider truncate">
                            {appSettings?.company_name || "GM Edificação"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <h4 className={`text-[11.5px] font-black tracking-wide ${noti.read ? "text-zinc-300" : "text-white"}`}>
                            {noti.title}
                          </h4>
                          <span className="text-[8.5px] font-bold text-zinc-400 tracking-normal shrink-0">
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
                  <div className="w-14 h-14 rounded-xl barra border border-white/10 flex items-center justify-center text-zinc-400 shadow-none">
                    <Bell size={24} className="opacity-40" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-white">Tudo em dia!</h4>
                    <p className="text-[11px] text-zinc-400 font-bold leading-relaxed">Você está em dia com tudo</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer watermark & CTA close */}
            <div className="shrink-0 border-t border-white/10 pt-3 flex items-center justify-between text-[10px] font-bold text-zinc-400 tracking-wider relative z-10">
              <span className="flex items-center gap-1">
                <span className="text-white font-black tracking-normal">CardDigital</span>
                <span className="text-[var(--gm-primary)] font-black tracking-normal">GM</span>
                <span className="text-zinc-500 font-medium px-0.5">•</span>
                <span className="text-zinc-400 lowercase tracking-wide">Notificações</span>
              </span>
              <button
                type="button"
                className="px-3.5 py-1.5 barra border border-white/10 hover:bg-white/15 text-zinc-300 hover:text-white rounded-xl text-[9px] font-black transition-all uppercase tracking-widest shrink-0 shadow-none cursor-pointer"
                onClick={() => setShowUpdateModal(false)}
              >
                Fechar
              </button>
            </div>
            
          </div>
        </div>
      )}
      <WhatsAppSelectorModal />
      <NotificationCheckinModal
        isOpen={showCheckinModal}
        onClose={() => setShowCheckinModal(false)}
      />
    </div>
  );
}
