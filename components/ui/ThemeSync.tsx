
import { useEffect } from "react";

type ThemePrefs = {
  brand_primary?: string;
  brand_accent?: string;
  brand_bg?: string;
};

function safeHex(v?: string) {
  if (!v) return "";
  const s = v.trim();
  if (/^#([0-9a-fA-F]{6})$/.test(s)) return s;
  return "";
}

export default function ThemeSync({ prefs }: { prefs?: ThemePrefs }) {
  useEffect(() => {
    if (!prefs) return;
    
    const root = document.documentElement;

    const primary = safeHex(prefs.brand_primary);
    const accent = safeHex(prefs.brand_accent);
    const background = safeHex(prefs.brand_bg);

    if (primary) root.style.setProperty("--gm-primary", primary);
    if (accent) root.style.setProperty("--gm-accent", accent);
    if (background) root.style.setProperty("--gm-bg", background);

  }, [prefs?.brand_primary, prefs?.brand_accent, prefs?.brand_bg]);

  return null;
}
