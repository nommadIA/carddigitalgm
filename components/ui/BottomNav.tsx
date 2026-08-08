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
  const [expanded, setExpanded] = useState(true);
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Centraliza automaticamente o item ativo no seletor horizontal ao mudar de rota ou expandir
  useEffect(() => {
    if (expanded && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [location.pathname, expanded]);

  if (!mounted) return null;

  const navContent = (
    <div className="md:hidden">
      <AnimatePresence mode="wait">
        {expanded ? (
          /* MENU EXPANDIDO (GAVETEIRO) COM EFEITO GLASS BLUR E BARRA LARANJA NO TOPO */
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
            className="fixed bottom-0 left-0 right-0 z-[999999] bg-[#121316] backdrop-blur-2xl border-t border-white/10 shadow-[0_-12px_40px_rgba(0,0,0,0.9)] rounded-t-3xl pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] select-none touch-none after:absolute after:top-full after:left-0 after:right-0 after:h-24 after:bg-[#121316]"
            style={{ zIndex: 999999 }}
          >
            {/* BARRA SUPERIOR LARANJA CENTRALIZADA (CLIQUE OU ARRASTE PARA OCULTAR) */}
            <div
              className="w-full flex justify-center py-1 cursor-pointer group active:opacity-80 transition-opacity"
              onClick={() => setExpanded(false)}
              title="Toque ou arraste para baixo para ocultar o menu"
              role="button"
              tabIndex={0}
            >
              <div className="w-12 h-1.5 rounded-full bg-[color:var(--gm-primary)] group-hover:scale-105 active:scale-95 transition-all" />
            </div>

            {/* CONTAINER DO SELETOR DE ARRASTAR ESQUERDA/DIREITA */}
            <div className="relative w-full max-w-lg mx-auto touch-pan-x">
              {/* Degradês sutis nas bordas para sinalizar visualmente a rolagem horizontal */}
              <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#121316] to-transparent z-10 pointer-events-none rounded-l-3xl" />
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#121316] to-transparent z-10 pointer-events-none rounded-r-3xl" />

              {/* SELETOR ARRASTÁVEL COM ÍCONES LARANJA E TEXTO BRANCO */}
              <div
                ref={scrollRef}
                className="flex items-center gap-1.5 overflow-x-auto px-5 py-1 no-scrollbar snap-x touch-pan-x scroll-smooth"
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
                        `shrink-0 snap-center flex flex-col items-center justify-center min-w-[64px] px-2 py-1.5 rounded-xl transition-all relative group cursor-pointer ${
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
                            {/* Ícone na cor laranja (var(--gm-primary)) limpo e sem efeito neon */}
                            <Icon
                              size={21}
                              style={active ? { color: "var(--gm-primary)" } : undefined}
                              className={`transition-all duration-200 ${
                                active
                                  ? "scale-110"
                                  : "text-zinc-400 group-hover:text-zinc-200 group-hover:scale-105"
                              }`}
                            />
                            {/* Texto BRANCO */}
                            <span
                              className={`text-[10.5px] tracking-tight mt-1 whitespace-nowrap ${
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
            className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[999999]"
            style={{ zIndex: 999999 }}
          >
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#121316]/92 backdrop-blur-2xl border border-white/20 text-white font-black text-xs uppercase tracking-wider shadow-[0_8px_30px_rgba(0,0,0,0.85)] hover:border-[color:var(--gm-primary)] active:scale-95 transition-all cursor-pointer group"
              aria-label="Expandir Menu"
              title="Expandir Menu (Gaveteiro)"
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
