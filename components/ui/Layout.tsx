
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
  Crown,
  Radio,
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
import GoldCrownIcon from "./GoldCrownIcon";

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
    if (!showUpdateModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowUpdateModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showUpdateModal]);

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
      { to: "/planos", label: "Planos", icon: Crown },
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

    // Constantes de física ultra suave (damping suave, sem solavancos e sem falhas nas bordas)
    const SCROLL_STRENGTH = 0.015; // Suave e contínuo ao rolar
    const MAX_SCROLL_Y = 24; // Mantém o deslocamento restrito à margem de sangria (bleed), sem expor bordas
    const BASE_DEPTH = 1.05;
    const DEPTH_GAIN = 0.00001;
    const MAX_DEPTH_ADD = 0.025;

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
          title={uiSoundsActive ? "Sons dos Botões: Ligados" : "Sons dos Botões: Desligados"}
          aria-label={uiSoundsActive ? "Sons dos Botões Ligados" : "Sons dos Botões Desligados"}
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-[6px] flex items-center justify-center transition-all duration-150 relative cursor-pointer bg-[#131315] hover:bg-[#1B1B1E] border border-[#26262A] hover:border-[#38383F] active:scale-[0.95] shadow-none"
        >
          {uiSoundsActive ? (
            <Volume2 size={18} className="text-[var(--gm-menu-icon,var(--gm-primary,#FE540B))]" />
          ) : (
            <VolumeX size={18} className="text-[#8B8B92]" />
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
        className="w-full h-11 px-3 rounded-[6px] border border-[#26262A] bg-[#131315] hover:bg-[#1B1B1E] hover:border-[#38383F] flex items-center justify-between gap-2 active:scale-[0.97] transition-[background-color,border-color,transform] duration-150 cursor-pointer select-none group shadow-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-[4px] flex items-center justify-center shrink-0 transition-all ${
              uiSoundsActive
                ? "bg-[var(--gm-menu-icon,var(--gm-primary,#FE540B))]/15 text-[var(--gm-menu-icon,var(--gm-primary,#FE540B))]"
                : "bg-white/5 text-[#8B8B92]"
            }`}
          >
            {uiSoundsActive ? (
              <Volume2 size={16} className="text-current" />
            ) : (
              <VolumeX size={16} className="text-[#8B8B92]" />
            )}
          </div>
          <span className="text-[11px] font-mono font-semibold tracking-wide uppercase text-[#F2F2F3] truncate whitespace-nowrap text-left">
            Sons dos Botões
          </span>
        </div>

        <div
          className={`flex items-center justify-center px-2 py-1 rounded-[4px] text-[10px] font-mono font-bold tracking-wider uppercase shrink-0 transition-all ${
            uiSoundsActive
              ? "bg-[var(--gm-btn-bg,var(--gm-primary,#FE540B))] text-[#0B0B0C]"
              : "bg-[#18181B] text-[#8B8B92] border border-[#26262A]"
          }`}
        >
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
      className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-[6px] flex items-center justify-center hover:!text-white active:scale-95 transition-[background-color,border-color,transform] duration-150 relative cursor-pointer bg-[#131315] hover:bg-[#1B1B1E] border border-[#26262A] hover:border-[#3F3F46] shrink-0 grow-0 self-center group p-0 overflow-hidden shadow-none ${extraBtnClass}`}
      style={{
        width: '40px',
        height: '40px',
        minWidth: '40px',
        minHeight: '40px',
        borderRadius: '6px',
        color: "var(--gm-menu-icon, var(--gm-menu-primary, var(--gm-primary, #FE540B)))",
      }}
    >
      <RefreshCw 
        size={17} 
        className={`text-current shrink-0 transition-transform duration-500 ${isSyncing ? "animate-spin" : "group-hover:rotate-90"}`} 
      />
    </button>
  );

  const renderBellButton = (extraBtnClass = "") => (
    <button
      type="button"
      onClick={handleBellClick}
      title="Atualizações e Informações"
      aria-label="Atualizações e Informações"
      className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-[6px] flex items-center justify-center hover:!text-white active:scale-95 transition-[background-color,border-color,transform] duration-150 relative cursor-pointer bg-[#131315] hover:bg-[#1B1B1E] border border-[#26262A] hover:border-[#3F3F46] shrink-0 grow-0 self-center group p-0 overflow-hidden shadow-none ${extraBtnClass}`}
      style={{
        width: '40px',
        height: '40px',
        minWidth: '40px',
        minHeight: '40px',
        borderRadius: '6px',
        color: "var(--gm-menu-icon, var(--gm-menu-primary, var(--gm-primary, #FE540B)))",
      }}
    >
      <Bell size={17} className="text-current shrink-0" />
      {unreadCount > 0 && (
        <span 
          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#131315]" 
        />
      )}
    </button>
  );

  const renderLogoutButton = (extraBtnClass = "") => (
    <button 
      type="button"
      onClick={signOut}
      title="Sair"
      aria-label="Sair"
      className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-[6px] flex items-center justify-center hover:!text-white active:scale-95 transition-[background-color,border-color,transform] duration-150 cursor-pointer bg-[#131315] hover:bg-[#1B1B1E] border border-[#26262A] hover:border-[#3F3F46] shrink-0 grow-0 self-center group p-0 overflow-hidden shadow-none ${extraBtnClass}`}
      style={{
        width: '40px',
        height: '40px',
        minWidth: '40px',
        minHeight: '40px',
        borderRadius: '6px',
        color: "var(--gm-menu-icon, var(--gm-menu-primary, var(--gm-primary, #FE540B)))",
      }}
    >
      <LogOut size={17} className="text-current shrink-0" />
    </button>
  );

  const renderSoundButton = (extraBtnClass = "") => (
    <button
      type="button"
      onClick={toggleUiSounds}
      title={uiSoundsActive ? "Sons do App: Ativados (toque para desativar)" : "Sons do App: Desativados (toque para ativar)"}
      aria-label={uiSoundsActive ? "Sons do App Ativados" : "Sons do App Desativados"}
      className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-[6px] flex items-center justify-center hover:!text-white active:scale-95 transition-[background-color,border-color,transform] duration-150 relative cursor-pointer bg-[#131315] hover:bg-[#1B1B1E] border border-[#26262A] hover:border-[#3F3F46] shrink-0 grow-0 self-center group p-0 overflow-hidden shadow-none ${extraBtnClass}`}
      style={{
        width: '40px',
        height: '40px',
        minWidth: '40px',
        minHeight: '40px',
        borderRadius: '6px',
        color: uiSoundsActive
          ? "var(--gm-menu-icon, var(--gm-menu-primary, var(--gm-primary, #F65A1A)))"
          : "#8B8B92",
      }}
    >
      {uiSoundsActive ? (
        <Volume2 size={17} className="text-current shrink-0" />
      ) : (
        <VolumeX size={17} className="text-current shrink-0" />
      )}
      {uiSoundsActive && (
        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
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
    <div className="gm-layout bg-[#0B0B0C] text-[#F2F2F3]">
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

      {/* MOBILE TOP HEADER - FORGE SOLID INK HEADER */}
      <header 
        className="fixed top-0 left-0 right-0 w-full h-16 z-[100] flex md:hidden items-center justify-between px-4 bg-[#0B0B0C] border-b border-[#26262A] shadow-none gm-mobile-header select-none"
        style={{
          zIndex: 100,
          background: "#0B0B0C",
          borderBottom: "1px solid #26262A",
        }}
      >
        <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center shrink-0">
              <div className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center overflow-hidden shadow-none bg-[#18181B] p-1">
                <img 
                  src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg" 
                  alt="Logo CardDigital GM" 
                  className="w-full h-full object-cover scale-[1.2] transform"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 leading-none">
              <span 
                className="text-base font-extrabold text-white tracking-wide select-none flex items-center gap-1.5"
                style={{ fontFamily: "'Funnel Display', sans-serif" }}
              >
                <span className="text-white">CardDigital</span>
                <span 
                  className="font-black text-[#FE540B] text-lg inline-block"
                  style={{ fontFamily: "'Funnel Display', sans-serif", fontWeight: 800 }}
                >
                  GM
                </span>
              </span>
            </div>
        </div>

        {/* Botões do cabeçalho mobile: caixas sólidas Forge com micro-bordas #26262A e ícones laranja */}
        {renderHeaderActionButtons()}
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside
        ref={sidebarRef}
        style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px` }}
        className={`sidebar gm-sidebar fora ${collapsed ? "collapsed" : ""} hidden md:flex shrink-0 relative`}
      >
        {/* Toggle Button on the right edge (Seta de expansão com cápsula escura e chevron laranja igual ao print) */}
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
            className="w-5 h-8 rounded-[4px] bg-[#131315] border border-[#26262A] flex items-center justify-center text-[var(--gm-menu-icon,var(--gm-primary,#FE540B))] active:scale-95 transition-all duration-120 shadow-none hover:bg-[#1B1B1E] hover:border-[#38383F] cursor-pointer outline-none !m-0 !p-0"
            style={{
              transformOrigin: "center center"
            }}
            title={collapsed ? "Expandir menu" : "Encolher menu"}
            aria-label={collapsed ? "Expandir menu" : "Encolher menu"}
          >
            {collapsed ? (
              <ChevronRight size={13} className="stroke-[2.5] text-[var(--gm-menu-icon,var(--gm-primary,#FE540B))]" />
            ) : (
              <ChevronLeft size={13} className="stroke-[2.5] text-[var(--gm-menu-icon,var(--gm-primary,#FE540B))]" />
            )}
          </button>
        </div>

        <div className="sidebar-inner flex flex-col h-full w-full bg-[#0B0B0C]">
          {/* Header exatamente como no print */}
          <header className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[#26262A] shrink-0 bg-[#0B0B0C]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-none bg-[#18181B] border border-white/10 p-1">
              <img 
                src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg" 
                alt="Logo Official CardDigital GM" 
                className="w-full h-full object-cover logo-icon scale-[1.2] transform"
              />
            </div>
            {!collapsed && (
              <div className="flex items-center gap-1.5 leading-none overflow-hidden logo-text">
                <span 
                  className="font-extrabold text-white text-[15px] tracking-wide select-none flex items-center gap-1.5"
                  style={{ fontFamily: "'Funnel Display', sans-serif" }}
                >
                  <span className="text-white">CardDigital</span>
                  <span 
                    className="font-black text-[#FE540B] text-[16px] inline-block tracking-normal"
                    style={{ fontFamily: "'Funnel Display', sans-serif", fontWeight: 800 }}
                  >
                    GM
                  </span>
                </span>
              </div>
            )}
          </header>

          {/* Navigation List - Forge UI */}
          <ul className="flex-1 flex flex-col py-3 px-2 gap-1 overflow-y-auto no-scrollbar select-none w-full">
            {filteredNav.map(({ to, label, icon: Icon }) => {
              return (
                <li key={to} className="w-full flex items-center relative">
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `sidebar-btn group relative w-full h-10 flex items-center rounded-[6px] ${
                        collapsed ? "justify-center !px-0" : "justify-start text-left px-3 gap-3"
                      } active:scale-[0.97] transition-[background-color,color,border-color,transform] duration-150 ${
                        isActive
                          ? "active bg-[#18181B] text-[#F2F2F3] font-bold border-l-[3px] border-[var(--gm-menu-primary,var(--gm-primary,#FE540B))]"
                          : "text-[#8B8B92] hover:text-[#F2F2F3] hover:bg-[#131315] border-l-[3px] border-transparent"
                      }`
                    }
                    title={collapsed ? label : undefined}
                  >
                    {/* Barra de destaque na extremidade esquerda do item ativo */}
                    <span
                      className="sidebar-window-indicator"
                      aria-hidden="true"
                    />

                    {to === "/planos" ? (
                      <GoldCrownIcon size={18} />
                    ) : (
                      <Icon 
                        size={18} 
                        className="shrink-0 text-[var(--gm-menu-icon,var(--gm-menu-primary,var(--gm-primary,#FE540B)))] stroke-[1.75] transition-colors duration-150" 
                      />
                    )}

                    {!collapsed && (
                      <span className={`truncate text-left text-[13px] font-mono tracking-wider uppercase font-semibold leading-tight whitespace-nowrap ${to === "/planos" ? "text-amber-300" : ""}`}>
                        {label}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>

          {/* Footer - Forge UI Organizado */}
          <div className="sidebar-footer p-3.5 border-t border-[#26262A] shrink-0 flex flex-col gap-2.5 mt-auto w-full bg-[#0B0B0C]">
            {collapsed ? (
              <div className="flex flex-col items-center gap-2 w-full py-1">
                {renderSyncButton()}
                {renderBellButton()}
                {renderLogoutButton()}
                <div className="w-7 h-[1px] bg-[#26262A] my-0.5" />
                {renderSoundToggleButton(true)}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 w-full">
                {/* Linha 1: 3 Caixas sólidas Forge */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  <button
                    type="button"
                    onClick={handleSyncClick}
                    title="Sincronização do App"
                    aria-label="Sincronização do App"
                    className="h-10 w-full rounded-[6px] flex items-center justify-center transition-[background-color,border-color,transform] duration-150 cursor-pointer border border-[#26262A] bg-[#131315] hover:bg-[#1B1B1E] hover:border-[#3F3F46] active:scale-95 group shadow-none"
                  >
                    <RefreshCw 
                      size={17} 
                      className={`text-[var(--gm-menu-icon,var(--gm-menu-primary,var(--gm-primary,#FE540B)))] shrink-0 transition-transform duration-500 ${isSyncing ? "animate-spin" : "group-hover:rotate-90"}`} 
                    />
                  </button>

                  <button
                    type="button"
                    onClick={handleBellClick}
                    title="Atualizações e Informações"
                    aria-label="Atualizações e Informações"
                    className="h-10 w-full rounded-[6px] flex items-center justify-center transition-[background-color,border-color,transform] duration-150 relative cursor-pointer border border-[#26262A] bg-[#131315] hover:bg-[#1B1B1E] hover:border-[#3F3F46] active:scale-95 group shadow-none"
                  >
                    <Bell size={17} className="text-[var(--gm-menu-icon,var(--gm-menu-primary,var(--gm-primary,#FE540B)))] shrink-0" />
                    {unreadCount > 0 && (
                      <span 
                        className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#131315]" 
                      />
                    )}
                  </button>

                  <button 
                    type="button"
                    onClick={signOut}
                    title="Sair da Conta"
                    aria-label="Sair da Conta"
                    className="h-10 w-full rounded-[6px] flex items-center justify-center transition-[background-color,border-color,transform] duration-150 cursor-pointer border border-[#26262A] bg-[#131315] hover:bg-[#1B1B1E] hover:border-[#3F3F46] active:scale-95 group shadow-none"
                  >
                    <LogOut size={17} className="text-[var(--gm-menu-icon,var(--gm-menu-primary,var(--gm-primary,#FE540B)))] shrink-0" />
                  </button>
                </div>

                {/* Linha 2: Botão SONS DOS BOTÕES estilo Forge */}
                {renderSoundToggleButton(false)}

                {/* Linha 3: Rodapé empilhado sem colisão horizontal */}
                <div className="pt-1.5 pb-0.5 text-center pointer-events-none select-none flex flex-col items-center gap-0.5">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#8B8B92] leading-tight">
                    Desenvolvido por
                  </span>
                  <span
                    className="text-[13px] font-extrabold leading-tight flex items-center justify-center gap-1 whitespace-nowrap"
                    style={{ fontFamily: "'Funnel Display', sans-serif" }}
                  >
                    <span className="text-[#F2F2F3]">CardDigital</span>
                    <span className="font-black text-[#FE540B]">GM</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main 
        ref={setMainRefs}
        className="gm-main flex-1 min-w-0 flex flex-col items-center justify-start h-full min-h-0 overflow-y-auto w-full p-0 scroll-smooth relative"
      >
        {/* CAMADA DO PLANO DE FUNDO DENTRO DO MAIN: Garante que o backdrop-filter dos containers/cards desfoque o background no Chrome e Safari */}
        <div className="gm-main-bg-layer" aria-hidden="true" />
        {isEffectActiveFor("desktop", bgEffect) && getEffectFor("desktop", bgEffect) === "aurora" && (
          <div className="gm-bg-aurora-layer" style={{ zIndex: 0 }} aria-hidden="true" />
        )}
        {isEffectActiveFor("desktop", bgEffect) && getEffectFor("desktop", bgEffect) === "prism" && (
          <div className="gm-bg-prism-layer" style={{ zIndex: 0 }} aria-hidden="true" />
        )}

        <div className="gm-container w-full max-w-[1440px] mx-auto flex flex-col items-stretch px-4 sm:px-8 md:px-10 lg:px-12 xl:px-16 pt-20 md:pt-10 lg:pt-12 pb-[calc(var(--bottom-nav-height,84px)+36px)] md:pb-16 relative z-10">
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
                  className="gm-floating-whatsapp-btn !p-0 flex items-center justify-center w-12 h-12 rounded-[6px] bg-[#25D366] hover:bg-[#20ba5a] text-white border border-white/20 shadow-[0_6px_20px_rgba(0,0,0,0.45)] active:scale-[0.95] transition-[background-color,transform] duration-150 cursor-pointer focus:outline-none"
                  aria-label="Ajuda via WhatsApp"
                  title="Ajuda via WhatsApp"
                >
                  <WhatsAppIcon size={24} className="text-white shrink-0 pointer-events-none" />
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
                  className="text-[var(--gm-primary,#FE540B)] drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] group-active:scale-90 transition-transform duration-200" 
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
                    className="text-[var(--gm-primary,#FE540B)] drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] group-active:scale-90 transition-transform duration-200" 
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
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#131315] border border-[#26262A] text-[#F2F2F3] text-xs font-bold shadow-xl">
                  {pageToast.dir === "left" && <ChevronLeft size={14} className="text-[var(--gm-primary)]" />}
                  <span className="tracking-tight whitespace-nowrap">{pageToast.label}</span>
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
        <div 
          className="fixed inset-0 z-[1000000] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-fade-in" 
          style={{ zIndex: 1000000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowUpdateModal(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-2xl rounded-lg border border-[#26262A] bg-[#131315] gm-modal overflow-hidden p-5 sm:p-6 flex flex-col gap-4 text-[#F2F2F3] font-sans max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 shrink-0 pb-3.5 border-b border-[#26262A] relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-md bg-[#1B1B1E] border border-[#26262A] flex items-center justify-center text-[#8B8B92] relative shrink-0">
                  <Bell size={18} className={unreadCount > 0 ? "text-[var(--gm-primary)]" : "text-[#8B8B92]"} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-[#1B1B1E]" />
                  )}
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-base sm:text-lg tracking-tight text-white mb-0">
                      Notificações
                    </h3>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#1B1B1E] text-[#8B8B92] border border-[#26262A]">
                      Central Push
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#8B8B92] tracking-wide">
                    {unreadCount > 0 ? `${unreadCount} pendentes` : "Tudo em dia"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="w-9 h-9 rounded-[4px] bg-[#1B1B1E] hover:bg-[#26262A] flex items-center justify-center transition-colors text-[#8B8B92] hover:text-white border border-[#26262A] hover:border-[#3F3F46] shrink-0 cursor-pointer"
                onClick={() => setShowUpdateModal(false)}
                title="Fechar Notificações"
                aria-label="Fechar Notificações"
              >
                <X size={16} />
              </button>
            </div>

            {/* Botão de Check-in de Notificações nos 4 Estados */}
            <button
              type="button"
              onClick={() => {
                setShowUpdateModal(false);
                setShowCheckinModal(true);
              }}
              className="w-full py-2.5 px-3.5 rounded-[6px] border border-[var(--gm-primary)]/40 bg-[var(--gm-primary)]/10 hover:bg-[var(--gm-primary)]/15 text-xs font-bold text-[#F2F2F3] flex items-center justify-between gap-2 active:scale-[0.98] transition-[background-color,border-color,transform] duration-150 cursor-pointer shrink-0 relative z-10"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Radio size={15} className="text-[var(--gm-primary)] shrink-0" />
                <span className="uppercase tracking-wide truncate">Check-in de Notificações (4 Estados)</span>
              </span>
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-[4px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold shrink-0 hidden sm:inline-block">
                Aberto · Minimizado · 2º Plano · Fechado
              </span>
            </button>

            {/* Tabs Filter Bar */}
            <div className="flex items-center gap-1.5 border border-[#26262A] bg-[#0B0B0C] rounded-md p-1 shrink-0 relative z-10">
              <button
                type="button"
                aria-pressed={activeTab === "todas"}
                data-selected={activeTab === "todas"}
                onClick={() => setActiveTab("todas")}
                className={`h-8 px-3 rounded-[4px] text-center text-xs font-bold uppercase tracking-wider transition-colors flex-1 cursor-pointer whitespace-nowrap ${
                  activeTab === "todas"
                    ? "bg-[var(--gm-primary,#FE540B)] text-white font-black"
                    : "text-[#8B8B92] hover:text-[#F2F2F3] hover:bg-[#1B1B1E]"
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                aria-pressed={activeTab === "nao_lidas"}
                data-selected={activeTab === "nao_lidas"}
                onClick={() => setActiveTab("nao_lidas")}
                className={`h-8 px-3 rounded-[4px] text-center text-xs font-bold uppercase tracking-wider transition-colors flex-1 cursor-pointer whitespace-nowrap ${
                  activeTab === "nao_lidas"
                    ? "bg-[var(--gm-primary,#FE540B)] text-white font-black"
                    : "text-[#8B8B92] hover:text-[#F2F2F3] hover:bg-[#1B1B1E]"
                }`}
              >
                Não lidas
              </button>
              <button
                type="button"
                aria-pressed={activeTab === "diretas"}
                data-selected={activeTab === "diretas"}
                onClick={() => setActiveTab("diretas")}
                className={`h-8 px-3 rounded-[4px] text-center text-xs font-bold uppercase tracking-wider transition-colors flex-1 cursor-pointer whitespace-nowrap ${
                  activeTab === "diretas"
                    ? "bg-[var(--gm-primary,#FE540B)] text-white font-black"
                    : "text-[#8B8B92] hover:text-[#F2F2F3] hover:bg-[#1B1B1E]"
                }`}
              >
                Diretas
              </button>
            </div>

            {/* Marcar todas como lidas Button */}
            {unreadCount > 0 && (
              <div className="flex justify-end shrink-0 px-0.5 relative z-10">
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs font-bold text-[var(--gm-primary)] hover:underline uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} className="stroke-[2.5]" />
                  Marcar todas como lidas
                </button>
              </div>
            )}

            {/* Notifications Feed Viewport */}
            <div className="overflow-y-auto pr-0.5 space-y-2.5 max-h-[380px] no-scrollbar text-left flex-1 min-h-[220px] flex flex-col relative z-10">
              {filteredNotifications.length > 0 ? (
                <div className="space-y-2.5 w-full">
                  {filteredNotifications.map((noti) => (
                    <div
                      key={noti.id}
                      onClick={() => toggleRead(noti.id)}
                      className={`group relative p-3.5 border rounded-md hover:bg-[#1B1B1E] transition-colors flex gap-3 cursor-pointer select-none ${
                        noti.read
                          ? "bg-[#0B0B0C]/60 border-[#26262A] opacity-75"
                          : "bg-[#1B1B1E]/60 border-[#3F3F46] hover:border-[var(--gm-primary)]/50"
                      }`}
                    >
                      {/* Badge Icon */}
                      <div className="shrink-0 mt-0.5">
                        {noti.icon || appSettings?.company_logo_url ? (
                          <div className={`w-8 h-8 rounded-[4px] overflow-hidden border flex items-center justify-center p-0.5 ${
                            noti.read ? "border-[#26262A] opacity-75 bg-[#0B0B0C]" : "border-[#3F3F46] bg-[#0B0B0C]"
                          }`}>
                            <img
                              src={noti.icon || appSettings?.company_logo_url || ""}
                              alt=""
                              className="w-full h-full object-contain rounded-[3px]"
                            />
                          </div>
                        ) : noti.type === "direct" ? (
                          <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center border ${
                            noti.read 
                              ? "bg-[#131315] border-[#26262A] text-[#8B8B92]" 
                              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          }`}>
                            <MessageSquare size={15} />
                          </div>
                        ) : noti.type === "update" ? (
                          <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center border ${
                            noti.read
                              ? "bg-[#131315] border-[#26262A] text-[#8B8B92]"
                              : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          }`}>
                            <Sparkles size={15} />
                          </div>
                        ) : (
                          <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center border ${
                            noti.read
                              ? "bg-[#131315] border-[#26262A] text-[#8B8B92]"
                              : "bg-orange-500/10 border-orange-500/30 text-orange-400"
                          }`}>
                            <Clock size={15} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 pb-1 border-b border-[#26262A]">
                          {appSettings?.company_logo_url ? (
                            <img src={appSettings.company_logo_url} alt={appSettings?.company_name || "Empresa"} className="w-4 h-4 object-contain rounded-[3px] shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-[3px] bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] flex items-center justify-center text-[11px] font-black uppercase shrink-0">
                              {appSettings?.company_name ? appSettings.company_name.substring(0, 2) : "GM"}
                            </div>
                          )}
                          <span className="text-[11px] font-bold text-[var(--gm-primary)] uppercase tracking-wider truncate">
                            {appSettings?.company_name || "GM Edificação"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-[13px] font-bold tracking-tight ${noti.read ? "text-[#CBD5E1]" : "text-white"}`}>
                            {noti.title}
                          </h4>
                          <span className="text-[11px] font-mono text-[#8B8B92] shrink-0 tabular-nums">
                            {noti.time}
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed break-words pr-3 ${noti.read ? "text-[#8B8B92]" : "text-[#CBD5E1]"}`}>
                          {noti.message}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!noti.read && (
                        <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-emerald-400 rounded-full" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3 my-auto mx-auto w-full h-full min-h-[200px]">
                  <div className="w-12 h-12 rounded-md bg-[#1B1B1E] border border-[#26262A] flex items-center justify-center text-[#8B8B92]">
                    <Bell size={22} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">Tudo em dia</h4>
                    <p className="text-xs text-[#8B8B92] leading-relaxed">Você não possui notificações nesta aba.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-[#26262A] pt-3.5 flex items-center justify-between text-xs text-[#8B8B92] relative z-10">
              <span className="flex items-center gap-1.5 font-mono">
                <span className="text-white font-bold">CardDigital</span>
                <span className="text-[var(--gm-primary)] font-black">GM</span>
                <span aria-hidden="true">·</span>
                <span>Notificações</span>
              </span>
              <button
                type="button"
                className="h-9 px-4 bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] hover:border-[#3F3F46] text-[#F2F2F3] rounded-[4px] text-xs font-bold transition-colors uppercase tracking-wider shrink-0 cursor-pointer whitespace-nowrap"
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
