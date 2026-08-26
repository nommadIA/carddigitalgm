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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
            drag="y"
            dragConstraints={{ top: 0, bottom: 160 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 45 || info.velocity.y > 180) {
                setExpanded(false);
              }
            }}
            className="fixed bottom-0 left-0 right-0 w-full z-[800] gm-bottom-nav backdrop-blur-2xl border-t border-white/15 border-b-0 border-x-0 !rounded-t-[28px] !rounded-b-none pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+400px+12px)] -mb-[400px] shadow-none select-none overflow-hidden"
            style={{
              zIndex: 800,
              borderTopLeftRadius: "28px",
              borderTopRightRadius: "28px",
              borderBottomLeftRadius: "0px",
              borderBottomRightRadius: "0px",
              backdropFilter: "blur(28px) saturate(180%)",
              WebkitBackdropFilter: "blur(28px) saturate(180%)",
              background: "rgba(10, 10, 14, 0.45)",
            }}
          >
            {/* BARRA SUPERIOR CENTRALIZADA (CLIQUE OU ARRASTE PARA OCULTAR) */}
            <div
              className="w-full flex justify-center py-1.5 cursor-pointer group active:opacity-80 transition-opacity"
              onClick={() => setExpanded(false)}
              title="Toque ou arraste para baixo para ocultar o menu"
              role="button"
              tabIndex={0}
            >
              <div className="w-12 h-1.5 rounded-full bg-white/20 group-hover:bg-white/40 active:scale-95 transition-all" />
            </div>

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
                            {/* Ícone na cor laranja (var(--gm-primary)) */}
                            <Icon
                              size={22}
                              style={active ? { color: "var(--gm-primary)" } : undefined}
                              className={`transition-all duration-200 ${
                                active
                                  ? "scale-110"
                                  : "text-zinc-400 group-hover:text-zinc-200 group-hover:scale-105"
                              }`}
                            />
                            {/* Texto BRANCO centralizado */}
                            <span
                              className={`text-[10px] sm:text-[11px] tracking-tight mt-1 text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-full ${
                                active
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
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-zinc-950/75 dark:bg-zinc-950/75 backdrop-blur-2xl border border-white/15 shadow-xl text-white font-black text-xs uppercase tracking-wider hover:border-white/30 active:scale-95 transition-all cursor-pointer group"
              aria-label="Expandir Menu"
              title="Expandir Menu (Gaveteiro)"
              style={{
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
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
