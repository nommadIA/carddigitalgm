
import { useEffect, useState } from "react";

type ThemeMode = "dark" | "light" | "auto";

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>("auto");

  // Detecta sistema
  const getSystemTheme = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

  const applyTheme = (theme: "dark" | "light") => {
    const root = document.documentElement;

    if (theme === "light") {
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("gm-theme") as ThemeMode | null;

    if (saved) {
      setMode(saved);
      if (saved === "auto") {
        applyTheme(getSystemTheme());
      } else {
        applyTheme(saved as "dark" | "light");
      }
    } else {
      applyTheme(getSystemTheme());
    }
  }, []);

  useEffect(() => {
    if (mode === "auto") {
      applyTheme(getSystemTheme());
    } else {
      applyTheme(mode as "dark" | "light");
    }
    localStorage.setItem("gm-theme", mode);
  }, [mode]);

  return { mode, setMode };
}
