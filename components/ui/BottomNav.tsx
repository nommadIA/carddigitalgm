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
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import GoldCrownIcon from "./GoldCrownIcon";

// Todos os ícones do menu da aplicação para o seletor horizontal
const allNavItems = [
  { to: "/", label: "Início", icon: LayoutGrid },
  { to: "/budgets", label: "Orçamentos", icon: FileText },
  { to: "/clients", label: "Clientes", icon: Users },
  { to: "/expenses", label: "Despesas", icon: Receipt },
  { to: "/market", label: "Mercado", icon: ShoppingCart },
  { to: "/notes", label: "Notas", icon: StickyNote },
  { to: "/financial", label: "Financeiro", icon: Wallet },
  { to: "/minha-bio", label: "Bio", icon: Smartphone },
  { to: "/planos", label: "Planos", icon: Crown },
  { to: "/configuracoes", label: "Ajustes", icon: Settings },
];

export default function BottomNav() {
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

  const springStretch = useSpring(stretchValue, { stiffness: 420, damping: 28 });
  const springTranslateY = useSpring(translateYValue, { stiffness: 420, damping: 28 });

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
      // 5 primeiros ícones: reseta para o início para que fiquem os 5 perfeitamente alinhados e visíveis
      scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
    } else if (activeItemRef.current) {
      // Se for um item além dos 5 primeiros (ex: Notas, Financeiro, Bio, Ajustes), traz para a visão
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
      <AnimatePresence mode="wait">
        {expanded ? (
          /* MENU EXPANDIDO COM EFEITO GLASS BLUR E 5 PRIMEIROS ÍCONES ALINHADOS */
          <motion.nav
            key="expanded-menu"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            onPan={(_, info) => {
              if (info.offset.y < 0) {
                // Puxar para cima: a base permanece 100% reta e fixa na borda (translateY = 0)
                // e a altura expande elasticamente
                translateYValue.set(0);
                const pullUp = -info.offset.y;
                const elastic = Math.min(65, pullUp * 0.38);
                stretchValue.set(elastic);
              } else {
                // Puxar para baixo: altura normal, translada para baixo para colapsar
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
            className="fixed bottom-0 left-0 right-0 w-full z-[800] gm-bottom-nav bg-[#131315] border-t border-[#26262A] border-b-0 border-x-0 !rounded-t-[14px] !rounded-b-none pb-[calc(env(safe-area-inset-bottom,0px)+8px)] shadow-none select-none overflow-hidden"
            style={{
              y: springTranslateY,
              height: heightAnim,
              zIndex: 800,
              "--gm-mobile-nav-height": "76px",
              borderTopLeftRadius: "14px",
              borderTopRightRadius: "14px",
              borderBottomLeftRadius: "0px",
              borderBottomRightRadius: "0px",
              borderLeft: "none",
              borderRight: "none",
              borderBottom: "none",
              background: "#131315",
            } as unknown as React.CSSProperties}
          >
            {/* FUNDO SELADO (ZERO FRESTA NA BASE) */}
            <div
              className="gm-bottom-nav-skirt"
              style={{
                borderTopLeftRadius: "14px",
                borderTopRightRadius: "14px",
                borderBottomLeftRadius: "0px",
                borderBottomRightRadius: "0px",
                background: "#131315",
              }}
            />

            {/* ALÇA SUPERIOR CENTRALIZADA (PUXAR P/ CIMA EXPANDE ALTURA / TOQUE OCULTA) */}
            <motion.div
              style={{ paddingTop: handleTopPaddingAnim }}
              className="w-full flex justify-center pb-1.5 cursor-pointer group active:opacity-80 transition-opacity touch-none"
              onClick={() => setExpanded(false)}
              title="Toque ou arraste para baixo para ocultar o menu"
              role="button"
              tabIndex={0}
            >
              <motion.div
                style={{ width: handleWidthAnim }}
                className="h-1.5 rounded-full bg-white/25 group-hover:bg-white/45 active:scale-95 transition-colors"
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
                className="flex items-center overflow-x-auto px-1 py-1.5 no-scrollbar snap-x touch-pan-x scroll-smooth cursor-grab active:cursor-grabbing select-none w-full"
              >
                {allNavItems.map((it) => {
                  const Icon = it.icon;
                  const isPlanos = it.to === "/planos";
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
                        `shrink-0 snap-start basis-1/5 min-w-[20%] flex flex-col items-center justify-center min-h-[50px] px-1 py-1 rounded-xl transition-all relative group cursor-pointer ${
                          isActive || navActive
                            ? "text-white font-black"
                            : "text-zinc-300 hover:text-white font-medium"
                        }`
                      }
                    >
                      {({ isActive: navActive }) => {
                        const active = isActive || navActive;
                        return (
                          <>
                            {/* Ícone na cor dinâmica do tema ou Dourado com animação Gold se for Planos */}
                            {isPlanos ? (
                              <GoldCrownIcon size={22} className="my-0.5" />
                            ) : (
                              <Icon
                                size={22}
                                style={{ color: "var(--gm-menu-icon, var(--gm-primary, #FE540B))" }}
                                className={`transition-all duration-200 ${
                                  active
                                    ? "scale-110 opacity-100 drop-shadow-sm"
                                    : "opacity-75 group-hover:opacity-100 group-hover:scale-105"
                                }`}
                              />
                            )}
                            {/* Texto centralizado (Dourado sutil para Planos) */}
                            <span
                              className={`text-[10px] sm:text-[11px] tracking-tight mt-1 text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-full ${
                                isPlanos
                                  ? "text-amber-300 font-bold"
                                  : active
                                  ? "text-white font-black drop-shadow-xs"
                                  : "text-zinc-300 font-medium opacity-85 group-hover:opacity-100 group-hover:text-white"
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
          /* MENU OCULTO - BOTÃO FLUTUANTE DO GAVETEIRO COM PONTINHOS LARANJA NEON E NOME "MENU" */
          <motion.div
            key="collapsed-menu-trigger"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[800]"
            style={{ zIndex: 800 }}
          >
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-full barra fora text-white font-black text-xs uppercase tracking-wider hover:border-white/30 active:scale-95 transition-all cursor-pointer group shadow-none border border-white/15"
              aria-label="Expandir Menu"
              title="Expandir Menu (Gaveteiro)"
              style={{
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
              }}
            >
              {/* Pontinhos em Laranja */}
              <GripHorizontal
                size={18}
                className="text-[color:var(--gm-primary)] group-hover:scale-110 transition-transform"
              />
              <span className="text-white font-black tracking-widest text-[11px]">MENU</span>
              <ChevronUp
                size={15}
                className="text-[color:var(--gm-primary)] group-hover:-translate-y-0.5 transition-transform"
              />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(navContent, document.body);
}
