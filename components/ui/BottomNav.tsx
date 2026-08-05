import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
  X,
  ChevronLeft,
  ChevronRight,
  Menu,
  Sparkles,
  Plus,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Atalhos do rodapé fixo
const primaryItems = [
  { to: "/", label: "Início", icon: LayoutGrid },
  { to: "/budgets", label: "Orç.", icon: FileText },
  { to: "/clients", label: "Clientes", icon: Users },
  { to: "/financial", label: "Fin.", icon: Wallet },
];

// Seções organizadas em 4 páginas para deslizar para direita/esquerda no modal
const menuSectionsPages = [
  {
    id: "atalhos",
    title: "Atalhos Rápidos",
    subtitle: "Acesso rápido às principais funções",
    items: [
      { to: "/budgets", label: "Novo Orçamento", desc: "Criar e enviar proposta", icon: Plus, color: "#F65A1A" },
      { to: "/clients", label: "Clientes", desc: "Base de contatos e obras", icon: Users, color: "#3B82F6" },
      { to: "/financial", label: "Financeiro", desc: "Fluxo e balanço mensal", icon: Wallet, color: "#10B981" },
      { to: "/market", label: "Mercado", desc: "Lista de compras e insumos", icon: ShoppingCart, color: "#8B5CF6" },
      { to: "/notes", label: "Notas", desc: "Bloco de anotações rápidas", icon: StickyNote, color: "#F59E0B" },
      { to: "/minha-bio", label: "BIO", desc: "Cartão digital interativo", icon: Smartphone, color: "#EC4899" },
    ]
  },
  {
    id: "gestao",
    title: "Gestão & Vendas",
    subtitle: "Acompanhamento geral de negócios",
    items: [
      { to: "/", label: "Início / Painel", desc: "Visão geral e estatísticas", icon: LayoutGrid, color: "#F65A1A" },
      { to: "/budgets", label: "Orçamentos", desc: "Propostas e negociações", icon: FileText, color: "#3B82F6" },
      { to: "/clients", label: "Clientes", desc: "Gestão da carteira", icon: Users, color: "#10B981" },
      { to: "/notes", label: "Anotações", desc: "Notas e lembretes", icon: StickyNote, color: "#F59E0B" },
    ]
  },
  {
    id: "financeiro",
    title: "Financeiro & Contas",
    subtitle: "Entradas, saídas e movimentações",
    items: [
      { to: "/financial", label: "Financeiro", desc: "Fluxo de caixa geral", icon: Wallet, color: "#10B981" },
      { to: "/expenses", label: "Despesas", desc: "Controle de saídas e custos", icon: Receipt, color: "#EF4444" },
      { to: "/market", label: "Mercado", desc: "Cotações e materiais", icon: ShoppingCart, color: "#8B5CF6" },
    ]
  },
  {
    id: "configuracoes",
    title: "Sua Marca & Conta",
    subtitle: "Personalização e configurações",
    items: [
      { to: "/minha-bio", label: "Minha Bio", desc: "Seu cartão e links profissionais", icon: Smartphone, color: "#EC4899" },
      { to: "/configuracoes", label: "Configurações", desc: "Ajustes da conta e sistema", icon: Settings, color: "#6B7280" },
    ]
  }
];

export default function BottomNav() {
  const [mounted, setMounted] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Trava o scroll do fundo ao abrir a gaveta
  useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  // Atualiza a página ativa ao deslizar horizontalmente
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    if (clientWidth > 0) {
      const page = Math.round(scrollLeft / clientWidth);
      if (page !== activePageIndex && page >= 0 && page < menuSectionsPages.length) {
        setActivePageIndex(page);
      }
    }
  };

  const scrollToPage = (index: number) => {
    setActivePageIndex(index);
    if (scrollRef.current) {
      const width = scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({
        left: width * index,
        behavior: "smooth"
      });
    }
  };

  if (!mounted) return null;

  const navContent = (
    <>
      {/* BARRA FIXA INFERIOR NO SMARTPHONE */}
      <nav
        className="gm-bottom-nav flex md:hidden fixed bottom-0 left-0 right-0 z-[999999] px-3 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] backdrop-blur-2xl transition-colors duration-200"
        style={{ zIndex: 999999 }}
      >
        <div className="flex items-center justify-between gap-1 w-full max-w-md mx-auto">
          {/* ÍCONES DO MENU NO RODAPÉ */}
          <div className="flex items-center justify-around flex-1 gap-1">
            {primaryItems.map((it) => {
              const Icon = it.icon;
              const isActive = location.pathname === it.to || (it.to !== "/" && location.pathname.startsWith(it.to));
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === "/"}
                  className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all ${
                    isActive
                      ? "text-[color:var(--gm-primary)] font-black"
                      : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-xl transition-all ${
                      isActive
                        ? "bg-[color:var(--gm-primary)]/15 border border-[color:var(--gm-primary)]/40 text-[color:var(--gm-primary)] shadow-[0_0_12px_rgba(246,90,26,0.25)] scale-105"
                        : "bg-transparent text-slate-600 dark:text-zinc-400"
                    }`}
                  >
                    <Icon size={19} className={isActive ? "stroke-[2.5]" : "stroke-[1.8]"} />
                  </div>
                  <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? "font-black text-[color:var(--gm-primary)]" : "font-semibold opacity-85"}`}>
                    {it.label}
                  </span>
                </NavLink>
              );
            })}
          </div>

          {/* BOTÃO 'MENU' DESTAQUE LARANJA (EXATAMENTE COMO NO SEGUNDO PRINT) */}
          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-2xl bg-[color:var(--gm-primary)] text-white font-black text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(246,90,26,0.5)] active:scale-95 transition-all cursor-pointer shrink-0 border border-orange-400/30 ${
              moreOpen ? "ring-2 ring-white/80" : ""
            }`}
            aria-label={moreOpen ? "Ocultar menu" : "Mostrar menu"}
          >
            <Menu size={16} className="stroke-[3]" />
            <span>MENU</span>
          </button>
        </div>
      </nav>

      {/* GAVETA / MODAL DO MENU COM NAVEGAÇÃO DESLIZÁVEL (SWIPE) */}
      <AnimatePresence>
        {moreOpen && (
          <React.Fragment>
            {/* OVERLAY ESCURO COM BLUR */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md"
              onClick={() => setMoreOpen(false)}
            />

            {/* CONTEÚDO DA GAVETA (SLIDE-UP) */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-[1000000] bg-[#161619] border-t border-white/20 pb-[calc(env(safe-area-inset-bottom,16px)+16px)] rounded-t-[2rem] shadow-[0_-12px_40px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[88vh]"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, { offset, velocity }) => {
                if (offset.y > 80 || velocity.y > 600) {
                  setMoreOpen(false);
                }
              }}
            >
              {/* ALÇA DE ARRASTAR (PULL HANDLE) */}
              <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 bg-white/25 rounded-full transition-all hover:bg-white/50" />
              </div>

              {/* CABEÇALHO DA GAVETA */}
              <div className="flex items-center justify-between px-5 pt-1 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[color:var(--gm-primary)]/20 border border-[color:var(--gm-primary)]/40 text-[color:var(--gm-primary)] flex items-center justify-center">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white leading-tight tracking-tight">
                      Seções do Aplicativo
                    </h3>
                    <p className="text-[11px] font-medium text-zinc-400">
                      Deslize para a esquerda e direita para navegar
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                  aria-label="Fechar menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* INDICADOR DE PÁGINAS E NAVEGAÇÃO DE ABAS (1/4, 2/4, 3/4, 4/4) */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 border-b border-white/5 overflow-x-auto no-scrollbar gap-2">
                <div className="flex items-center gap-1.5">
                  {menuSectionsPages.map((page, idx) => {
                    const isActive = activePageIndex === idx;
                    return (
                      <button
                        key={page.id}
                        onClick={() => scrollToPage(idx)}
                        className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                          isActive
                            ? "bg-[color:var(--gm-primary)] text-white shadow-md shadow-[color:var(--gm-primary)]/40"
                            : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {page.title}
                      </button>
                    );
                  })}
                </div>

                {/* BADGE DE PAGINAÇÃO ESTILO PRINT 2: [ ▬▬ • • • | 1/4 ] */}
                <div className="flex items-center gap-2 bg-black/60 border border-white/15 px-3 py-1 rounded-full text-xs font-bold shrink-0">
                  <div className="flex items-center gap-1">
                    {menuSectionsPages.map((_, i) => (
                      <span
                        key={i}
                        className={`transition-all rounded-full ${
                          activePageIndex === i
                            ? "w-3.5 h-1.5 bg-[color:var(--gm-primary)]"
                            : "w-1.5 h-1.5 bg-white/30"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-white/30">|</span>
                  <span className="text-zinc-200 font-mono font-extrabold text-[11px]">
                    {activePageIndex + 1}/{menuSectionsPages.length}
                  </span>
                </div>
              </div>

              {/* ÁREA CARROSSEL DESLIZÁVEL COM GESTOS SWIPE (ESQUERDA / DIREITA) */}
              <div className="relative flex-1 min-h-0 overflow-hidden">
                <div
                  ref={scrollRef}
                  onScroll={handleScroll}
                  className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar w-full h-full py-3"
                  style={{ scrollSnapType: "x mandatory" }}
                >
                  {menuSectionsPages.map((page) => (
                    <div
                      key={page.id}
                      className="w-full shrink-0 snap-start px-4 flex flex-col space-y-3"
                    >
                      {/* Subtítulo da Seção */}
                      <div className="flex items-center justify-between px-1">
                        <div>
                          <span className="text-xs font-black text-[color:var(--gm-primary)] uppercase tracking-wider block">
                            {page.title}
                          </span>
                          <span className="text-[11px] text-zinc-400 font-medium">
                            {page.subtitle}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                          {page.items.length} opções
                        </span>
                      </div>

                      {/* GRID DE BOTÕES DE NAVEGAÇÃO DA PÁGINA */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {page.items.map((it) => {
                          const Icon = it.icon;
                          const isCurrent = location.pathname === it.to;

                          return (
                            <button
                              key={it.label + it.to}
                              type="button"
                              onClick={() => {
                                setMoreOpen(false);
                                navigate(it.to);
                              }}
                              className={`flex flex-col p-3.5 rounded-2xl border text-left transition-all active:scale-95 group relative overflow-hidden cursor-pointer ${
                                isCurrent
                                  ? "bg-[color:var(--gm-primary)]/20 border-[color:var(--gm-primary)] text-white shadow-lg shadow-[color:var(--gm-primary)]/20"
                                  : "bg-white/[0.04] border-white/10 hover:border-white/20 text-zinc-200 hover:bg-white/[0.08]"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div
                                  className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm"
                                  style={{
                                    backgroundColor: `${it.color}20`,
                                    borderColor: `${it.color}40`,
                                    color: it.color
                                  }}
                                >
                                  <Icon size={19} />
                                </div>
                                <ArrowRight size={14} className="text-zinc-500 group-hover:text-white transition-colors" />
                              </div>

                              <span className="text-sm font-black text-white tracking-tight mb-0.5">
                                {it.label}
                              </span>
                              <span className="text-[10.5px] font-medium text-zinc-400 line-clamp-1 leading-tight">
                                {it.desc}
                              </span>

                              {isCurrent && (
                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[color:var(--gm-primary)] animate-pulse" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* SETAS LATERAIS DE NAVEGAÇÃO */}
                {activePageIndex > 0 && (
                  <button
                    onClick={() => scrollToPage(activePageIndex - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/80 border border-white/20 text-white flex items-center justify-center shadow-lg backdrop-blur-md cursor-pointer active:scale-90 z-10"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}

                {activePageIndex < menuSectionsPages.length - 1 && (
                  <button
                    onClick={() => scrollToPage(activePageIndex + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/80 border border-white/20 text-white flex items-center justify-center shadow-lg backdrop-blur-md cursor-pointer active:scale-90 z-10"
                    aria-label="Próxima página"
                  >
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>

              {/* RODAPÉ DO MODAL / BOTÃO DE CONCLUÍDO E PAGINAÇÃO */}
              <div className="flex items-center justify-between px-6 pt-3 border-t border-white/10">
                <span className="text-[11px] font-bold text-zinc-400">
                  Página {activePageIndex + 1} de {menuSectionsPages.length}
                </span>

                <button
                  onClick={() => setMoreOpen(false)}
                  className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10 active:scale-95 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
    </>
  );

  return createPortal(navContent, document.body);
}

