import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  FileText,
  Users,
  Wallet,
  Receipt,
  ShoppingCart,
  StickyNote,
  Smartphone,
  Settings,
  ChevronUp,
  GripHorizontal,
  Crown,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import GoldCrownIcon from "./GoldCrownIcon";
import { usePlanAccess } from "../../hooks/usePlanAccess";
import { FeatureKey } from "../../lib/subscriptionPlans";

// Todos os ícones do menu da aplicação para o seletor horizontal
const allNavItems: Array<{ to: string; label: string; icon: any; feature?: FeatureKey }> = [
  { to: "/", label: "Início", icon: LayoutGrid },
  { to: "/budgets", label: "Orçamentos", icon: FileText, feature: "budgets" },
  { to: "/clients", label: "Clientes", icon: Users, feature: "clients" },
  { to: "/expenses", label: "Despesas", icon: Receipt, feature: "expenses" },
  { to: "/market", label: "Mercado", icon: ShoppingCart, feature: "market" },
  { to: "/notes", label: "Notas", icon: StickyNote, feature: "notes" },
  { to: "/financial", label: "Financeiro", icon: Wallet, feature: "financial" },
  { to: "/minha-bio", label: "Bio", icon: Smartphone, feature: "bio" },
  { to: "/planos", label: "Planos", icon: Crown },
  { to: "/configuracoes", label: "Ajustes", icon: Settings },
];

export default function BottomNav() {
  const { canAccess } = usePlanAccess();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [expanded, setExpanded] = useState(true);
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  // Efeito elástico ao puxar para cima com retorno suave à origem e base 100% selada na borda
  const stretchValue = useMotionValue(0);
  const translateYValue = useMotionValue(0);

  const springStretch = useSpring(stretchValue, { stiffness: 650, damping: 40, mass: 0.55 });
  const springTranslateY = useSpring(translateYValue, { stiffness: 650, damping: 40, mass: 0.55 });

  const heightAnim = useTransform(
    springStretch,
    (s) => `calc(76px + env(safe-area-inset-bottom, 0px) + ${s}px)`
  );
  const handleWidthAnim = useTransform(springStretch, [0, 60], [48, 64]);
  const handleTopPaddingAnim = useTransform(springStretch, [0, 60], [6, 14]);

  useEffect(() => {
    if (expanded) {
      stretchValue.set(0);
      translateYValue.set(0);
    }
  }, [expanded, stretchValue, translateYValue]);

  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Alinhamento inteligente do menu: se for um dos 5 primeiros ícones, mantém Início até Mercado 100% visíveis
  useEffect(() => {
    if (!expanded || !isMobile || !scrollRef.current) return;

    const activeIndex = allNavItems.findIndex(
      (it) =>
        location.pathname === it.to ||
        (it.to !== "/" && location.pathname.startsWith(it.to))
    );

    if (activeIndex <= 4) {
      scrollRef.current.scrollTo({ left: 0, behavior: "auto" });
    } else if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [location.pathname, expanded, isMobile]);

  // Suporte a arrastar com mouse/touch para o seletor horizontal
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  if (!mounted || !isMobile) return null;

  const navContent = (
    <div className="md:hidden">
      <AnimatePresence initial={false}>
        {expanded ? (
          /* MENU EXPANDIDO MOBILE: BARRA LARANJA COM ÍCONES BRANCOS E LEGENDAS PRETAS */
          <motion.nav
            key="expanded-menu"
            initial={{ y: 84, opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 84, opacity: 0 }}
            transition={{ type: "spring", stiffness: 680, damping: 42, mass: 0.55 }}
            onPan={(_, info) => {
              if (info.offset.y < 0) {
                translateYValue.set(0);
                const pullUp = -info.offset.y;
                const elastic = Math.min(65, pullUp * 0.38);
                stretchValue.set(elastic);
              } else {
                stretchValue.set(0);
                translateYValue.set(info.offset.y);
              }
            }}
            onPanEnd={(_, info) => {
              if (info.offset.y > 45 || info.velocity.y > 180) {
                setExpanded(false);
              } else {
                stretchValue.set(0);
                translateYValue.set(0);
              }
            }}
            className="fixed bottom-0 left-0 right-0 w-full z-[800] gm-bottom-nav !rounded-t-[16px] !rounded-b-none pb-[calc(env(safe-area-inset-bottom,0px)+8px)] select-none"
            style={{
              y: springTranslateY,
              height: heightAnim,
              zIndex: 800,
              "--gm-mobile-nav-height": "76px",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              borderBottomLeftRadius: "0px",
              borderBottomRightRadius: "0px",
              borderLeft: "none",
              borderRight: "none",
              borderBottom: "none",
            } as unknown as React.CSSProperties}
          >

            {/* ALÇA SUPERIOR CENTRALIZADA (PUXAR P/ CIMA EXPANDE ALTURA / TOQUE OCULTA) */}
            <motion.div
              style={{ paddingTop: handleTopPaddingAnim }}
              className="w-full flex justify-center pb-1.5 cursor-pointer group active:opacity-80 transition-opacity duration-100 touch-none"
              onClick={() => setExpanded(false)}
              title="Toque ou arraste para baixo para ocultar o menu"
              role="button"
              tabIndex={0}
            >
              <motion.div
                style={{ width: handleWidthAnim }}
                className="h-1.5 rounded-full bg-white/25 group-hover:bg-white/40 active:scale-95 transition-colors duration-100"
              />
            </motion.div>

            {/* CONTAINER DO SELETOR COM 5 ÍCONES VISÍVEIS POR PADRÃO */}
            <div className="relative w-full max-w-lg mx-auto">
              <div
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                className="flex items-center overflow-x-auto px-1.5 py-1.5 no-scrollbar snap-x touch-pan-x cursor-grab active:cursor-grabbing select-none w-full gap-0.5"
              >
                {allNavItems.map((it) => {
                  const Icon = it.icon;
                  const isPlanos = it.to === "/planos";
                  const isLocked = it.feature ? !canAccess(it.feature).allowed : false;
                  const isActive =
                    location.pathname === it.to ||
                    (it.to !== "/" && location.pathname.startsWith(it.to));

                  return (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      end={it.to === "/"}
                      ref={isActive ? activeItemRef : undefined}
                      className={({ isActive: navActive }) =>
                        `gm-bottom-nav-item shrink-0 snap-start basis-1/5 min-w-[20%] flex flex-col items-center justify-center min-h-[50px] px-1 py-1 bg-transparent border-0 transition-[opacity,transform] duration-100 relative group cursor-pointer active:scale-95 ${
                          isActive || navActive
                            ? "is-active font-extrabold"
                            : "font-semibold"
                        }`
                      }
                    >
                      {({ isActive: navActive }) => {
                        const active = isActive || navActive;
                        return (
                          <>
                            {isLocked && (
                              <Lock
                                size={10}
                                strokeWidth={2.5}
                                style={{ color: "#D4D4D8" }}
                                className="gm-bottom-nav-lock absolute top-1 right-2.5 text-[#D4D4D8] opacity-80 pointer-events-none"
                              />
                            )}
                            {isPlanos ? (
                              <GoldCrownIcon
                                size={20}
                                style={{ color: "var(--gm-primary, #FE540B)" }}
                                className={`my-0.5 text-[var(--gm-primary,#FE540B)] ${
                                  active ? "opacity-100" : "opacity-85"
                                }`}
                              />
                            ) : (
                              <Icon
                                size={20}
                                strokeWidth={active ? 2.4 : 1.85}
                                style={{ color: "var(--gm-primary, #FE540B)" }}
                                className={`text-[var(--gm-primary,#FE540B)] ${
                                  isLocked ? "opacity-55" : active ? "opacity-100" : "opacity-85"
                                }`}
                              />
                            )}
                            <span
                              style={{ color: active ? "#FFFFFF" : "#D4D4D8" }}
                              className={`text-[11px] tracking-tight mt-1 text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-full ${
                                active
                                  ? "text-white font-extrabold opacity-100"
                                  : isLocked
                                    ? "text-zinc-300 font-semibold opacity-55"
                                    : "text-zinc-200 font-semibold opacity-90"
                              }`}
                            >
                              {it.label}
                            </span>
                          </>
                        );
                      }}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </motion.nav>
        ) : (
          /* MENU OCULTO - BOTÃO FLUTUANTE LARANJA GLASSMORPHISM COM BLUR REAL */
          <motion.div
            key="collapsed-menu-trigger"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 700, damping: 42, mass: 0.5 }}
            className="fixed bottom-3 inset-x-0 flex justify-center pointer-events-none z-[800]"
            style={{ zIndex: 800 }}
          >
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="gm-bottom-menu-trigger pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full text-[#0B0B0C] font-extrabold text-xs uppercase tracking-wider active:scale-95 transition-transform duration-100 cursor-pointer group"
              style={{ color: "#0B0B0C" }}
              aria-label="Expandir Menu"
              title="Expandir Menu (Gaveteiro)"
            >
              <GripHorizontal
                size={16}
                style={{ color: "#FFFFFF" }}
                className="text-white shrink-0"
              />
              <span className="text-[#0B0B0C] font-extrabold tracking-widest text-[11px] whitespace-nowrap">MENU</span>
              <ChevronUp
                size={15}
                style={{ color: "#FFFFFF" }}
                className="text-white shrink-0"
              />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(navContent, document.body);
}
