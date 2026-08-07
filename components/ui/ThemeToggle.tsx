import React from "react";
import { fetchSettingsSupabase, applySettingsToDOM } from "../../lib/settings";

export function toggleTheme(tenantId?: string | null) {
  localStorage.setItem("theme", "dark");
  document.documentElement.setAttribute("data-theme", "dark");
  document.documentElement.classList.remove("gm-light", "light");
  document.documentElement.classList.add("gm-dark", "dark");

  if (tenantId) {
    fetchSettingsSupabase(tenantId)
      .then((s) => {
        if (s) applySettingsToDOM(s);
      })
      .catch(() => {});
  }

  window.dispatchEvent(new CustomEvent("gm_theme_updated"));
  return "dark";
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  return null;
}
