import { useEffect, useState, useRef } from 'react';

export const usePullToRefresh = (onRefresh: () => void) => {
  const [pullProgress, setPullProgress] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  
  useEffect(() => {
    let startY = 0;
    let isAtTop = true;
    let currentY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      const target = e.target as HTMLElement;
      
      const scrollable = target.closest('.overflow-y-auto') || target.closest('.overflow-y-scroll');
      if (scrollable) {
        isAtTop = scrollable.scrollTop <= 0;
      } else {
        isAtTop = window.scrollY <= 0;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTop) return;
      currentY = e.touches[0].clientY;
      const yDiff = currentY - startY;
      
      if (yDiff > 0 && yDiff < 200) {
        setPullProgress(yDiff);
        if (yDiff > 40 && !isPulling) {
            setIsPulling(true);
        }
        
        // Prevent default scrolling if we are actively pulling down
        if (e.cancelable && yDiff > 10) {
            e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (currentY - startY > 120) {
        onRefresh();
      }
      setPullProgress(0);
      setIsPulling(false);
      currentY = 0;
      startY = 0;
    };

    // Use passive: false so we can preventDefault
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, isPulling]);

  return { pullProgress, isPulling };
};
