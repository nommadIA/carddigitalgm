
export type ThemeMode = "dark" | "light";

const KEY = "gm_theme_mode";

export function getTheme(): ThemeMode {
  const saved = localStorage.getItem(KEY);
  if (saved === "light" || saved === "dark") return saved;

  // default: dark (seu app é dark-first)
  return "dark";
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute("data-theme", mode);
  localStorage.setItem(KEY, mode);
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = getTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
