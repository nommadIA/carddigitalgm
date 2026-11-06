
import { useEffect } from "react";

type ThemePrefs = {
  brand_primary?: string;
  brand_accent?: string;
  brand_bg?: string;
};

function safeHex(v?: string | null) {
  if (!v) return "";
  const s = v.trim();
  if (/^#([0-9a-fA-F]{6})$/.test(s)) return s;
  return "";
}

export default function ThemeSync({ prefs }: { prefs?: ThemePrefs }) {
  useEffect(() => {
    if (!prefs) return;
    
    const targets = [document.documentElement, document.body].filter(Boolean) as HTMLElement[];

    const primary = safeHex(prefs.brand_primary);
    const accent = safeHex(prefs.brand_accent);
    const background = safeHex(prefs.brand_bg);

    if (primary) {
      targets.forEach((target) => {
        target.style.setProperty("--gm-primary", primary);
        target.style.setProperty("--primary", primary);
        target.style.setProperty("--brand-primary", primary);
        target.style.setProperty("--color-accent", primary);
        target.style.setProperty("--color-ember", primary);
        target.style.setProperty("--gm-btn-bg", primary);
        target.style.setProperty("--gm-btn-border", primary);
        target.style.setProperty("--gm-menu-primary", primary);
        target.style.setProperty("--gm-menu-icon", primary);
        target.style.setProperty("--gm-menu-button", primary);
        target.style.setProperty("--gm-icon", primary);
        target.style.setProperty("--gm-button", primary);
      });

      // HEX to RGB
      const r = parseInt(primary.slice(1, 3), 16);
      const g = parseInt(primary.slice(3, 5), 16);
      const b = parseInt(primary.slice(5, 7), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        const rgb = `${r}, ${g}, ${b}`;
        const yiq = (r * 299 + g * 587 + b * 114) / 1000;
        const fg = yiq >= 128 ? "#0B0B0C" : "#FFFFFF";

        targets.forEach((target) => {
          target.style.setProperty("--gm-primary-rgb", rgb);
          target.style.setProperty("--color-ember-halo", `rgba(${rgb}, 0.25)`);
          target.style.setProperty("--gm-primary-foreground", fg);
          target.style.setProperty("--gm-primary-10", `rgba(${rgb}, 0.1)`);
          target.style.setProperty("--gm-primary-20", `rgba(${rgb}, 0.2)`);
          target.style.setProperty("--gm-primary-30", `rgba(${rgb}, 0.3)`);
          target.style.setProperty("--gm-primary-soft", `rgba(${rgb}, 0.14)`);
        });
      }
    }
    if (accent) {
      targets.forEach((target) => {
        target.style.setProperty("--gm-accent", accent);
        target.style.setProperty("--brand-accent", accent);
        target.style.setProperty("--color-spark", accent);
        target.style.setProperty("--gm-primary-hover", accent);
      });
      const ar = parseInt(accent.slice(1, 3), 16);
      const ag = parseInt(accent.slice(3, 5), 16);
      const ab = parseInt(accent.slice(5, 7), 16);
      if (!isNaN(ar) && !isNaN(ag) && !isNaN(ab)) {
        const argb = `${ar}, ${ag}, ${ab}`;
        targets.forEach((target) => {
          target.style.setProperty("--gm-accent-rgb", argb);
          target.style.setProperty("--gm-accent-10", `rgba(${argb}, 0.1)`);
          target.style.setProperty("--gm-accent-20", `rgba(${argb}, 0.2)`);
        });
      }
    }
    if (background) {
      targets.forEach((target) => {
        target.style.setProperty("--gm-bg", background);
        target.style.setProperty("--brand-bg", background);
      });
    }

  }, [prefs?.brand_primary, prefs?.brand_accent, prefs?.brand_bg]);

  return null;
}

