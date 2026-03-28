import fs from 'fs';

const layoutPath = 'components/ui/Layout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

// Add new icons
layoutContent = layoutContent.replace(
  'X\n} from "lucide-react";',
  'X,\n  ArrowDown,\n  ArrowUp,\n  ChevronUp\n} from "lucide-react";'
);

// Add state variables
layoutContent = layoutContent.replace(
  'const [menuSearch, setMenuSearch] = useState("");',
  `const [menuSearch, setMenuSearch] = useState("");
  const [scrollDir, setScrollDir] = useState<"up" | "down" | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);`
);

// Update scroll listener
const scrollListenerOld = `    const onScroll = () => {
      updateTargets();
      if (!raf) raf = requestAnimationFrame(tick);
    };`;

const scrollListenerNew = `    let lastScrollY = el.scrollTop;
    let scrollTimeout: any;

    const onScroll = () => {
      updateTargets();
      if (!raf) raf = requestAnimationFrame(tick);

      const currentScrollY = el.scrollTop;
      const maxScroll = el.scrollHeight - el.clientHeight;
      
      if (currentScrollY > lastScrollY && currentScrollY > 10) {
        setScrollDir("down");
      } else if (currentScrollY < lastScrollY && currentScrollY < maxScroll - 10) {
        setScrollDir("up");
      }
      
      lastScrollY = currentScrollY;
      setIsScrolling(true);
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
        setScrollDir(null);
      }, 800);

      // Show back to top if scrolled near bottom
      const isNearBottom = maxScroll > 0 && (maxScroll - currentScrollY < 50);
      setShowBackToTop(isNearBottom);
      
      if (isNearBottom || currentScrollY < 10) {
        setScrollDir(null);
      }
    };`;

layoutContent = layoutContent.replace(scrollListenerOld, scrollListenerNew);

// Add UI elements before <BottomNav />
const uiElements = `      {/* SCROLL INDICATOR (GLASS) */}
      <div 
        className={\`fixed right-4 top-1/2 -translate-y-1/2 z-[110] transition-all duration-300 pointer-events-none lg:hidden flex flex-col items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg \${
          isScrolling && scrollDir ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }\`}
      >
        {scrollDir === "up" ? (
          <ArrowUp size={20} className="text-white animate-pulse" />
        ) : scrollDir === "down" ? (
          <ArrowDown size={20} className="text-white animate-pulse" />
        ) : null}
      </div>

      {/* BACK TO TOP BUTTON (GLASS) */}
      <button
        onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
        className={\`fixed right-4 bottom-24 z-[110] transition-all duration-300 lg:hidden flex items-center justify-center w-12 h-12 rounded-full bg-[var(--gm-primary)]/80 backdrop-blur-md border border-white/20 shadow-[0_4px_20px_rgba(255,102,0,0.4)] \${
          showBackToTop ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-10 pointer-events-none"
        }\`}
        aria-label="Voltar ao topo"
      >
        <ChevronUp size={24} className="text-white" />
      </button>

      <BottomNav />`;

layoutContent = layoutContent.replace('<BottomNav />', uiElements);

fs.writeFileSync(layoutPath, layoutContent);
console.log('Updated Layout.tsx with scroll indicator and back to top button');
