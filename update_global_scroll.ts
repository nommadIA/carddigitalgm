import fs from 'fs';

const layoutPath = 'components/ui/Layout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

const scrollListenerOld = `    let lastScrollY = el.scrollTop;
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
    };

    updateTargets();
    tick();

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);`;

const scrollListenerNew = `    let lastScrollY = 0;
    let scrollTimeout: any;
    let activeScrollElement: HTMLElement | null = null;

    const onScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      
      // Ignore scrolls from elements that are not scrollable or very small
      if (!target || !target.scrollHeight || target.scrollHeight <= target.clientHeight + 10) return;
      
      // If we're scrolling a different element, reset
      if (activeScrollElement !== target) {
        activeScrollElement = target;
        lastScrollY = target.scrollTop;
      }

      // Update parallax if it's the main container
      if (target === el) {
        updateTargets();
        if (!raf) raf = requestAnimationFrame(tick);
      }

      const currentScrollY = target.scrollTop;
      const maxScroll = target.scrollHeight - target.clientHeight;
      
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
    };

    updateTargets();
    tick();

    // Use capture: true to catch all scroll events on the page
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true } as any);`;

layoutContent = layoutContent.replace(scrollListenerOld, scrollListenerNew);

// Update back to top button to scroll the active element
layoutContent = layoutContent.replace(
  'onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}',
  `onClick={() => {
          const scrollableElements = document.querySelectorAll('.overflow-y-auto, .gm-main');
          scrollableElements.forEach(el => el.scrollTo({ top: 0, behavior: "smooth" }));
        }}`
);

fs.writeFileSync(layoutPath, layoutContent);
console.log('Updated Layout.tsx for global scroll tracking');
