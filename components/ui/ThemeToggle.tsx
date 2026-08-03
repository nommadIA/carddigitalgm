import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { fetchSettingsSupabase, applySettingsToDOM } from "../../lib/settings";
import { useAuth } from "../../store/AuthContext";

export function toggleTheme(tenantId?: string | null) {
  const current = localStorage.getItem("theme") === "dark" ? "dark" : "light";
  const nextTheme = current === "dark" ? "light" : "dark";
  localStorage.setItem("theme", nextTheme);
  document.documentElement.setAttribute("data-theme", nextTheme);
  document.documentElement.classList.toggle("gm-light", nextTheme === "light");
  document.documentElement.classList.toggle("gm-dark", nextTheme === "dark");
  document.documentElement.classList.toggle("dark", nextTheme === "dark");

  if (tenantId) {
    fetchSettingsSupabase(tenantId)
      .then((s) => {
        if (s) applySettingsToDOM(s);
      })
      .catch(() => {});
  }

  window.dispatchEvent(new CustomEvent("gm_theme_updated"));
  return nextTheme;
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { tenantId } = useAuth();
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return localStorage.getItem("theme") === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem("theme") === "dark" ? "dark" : "light";
      setTheme(saved);
    };
    window.addEventListener("gm_theme_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("gm_theme_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newTheme = toggleTheme(tenantId);
    setTheme(newTheme);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`relative inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer border select-none h-12 shadow-xs ${
        theme === "dark"
          ? "bg-zinc-900/90 border-emerald-500/40 text-emerald-400 hover:border-emerald-400 hover:bg-zinc-900"
          : "bg-white border-orange-500/40 text-orange-600 hover:border-orange-500 hover:bg-orange-50/50"
      } ${className}`}
      title={theme === "dark" ? "Tema Escuro Ativo (Clique para mudar para Tema Claro)" : "Tema Claro Ativo (Clique para mudar para Tema Escuro)"}
      aria-label="Alternar Tema Claro/Escuro"
    >
      <div className="flex items-center gap-2 shrink-0">
        {theme === "dark" ? (
          <Moon size={18} className="text-emerald-400 shrink-0" />
        ) : (
          <Sun size={18} className="text-orange-500 shrink-0 animate-spin-slow" />
        )}
        <div className="flex flex-col text-left leading-tight">
          <span className="text-[9px] font-black uppercase tracking-wider opacity-60">
            Tema
          </span>
          <span className="text-xs font-black uppercase tracking-wide">
            {theme === "dark" ? "Escuro" : "Claro"}
          </span>
        </div>
      </div>

      <div
        className={`relative shrink-0 w-8 h-4.5 rounded-full p-0.5 border flex items-center transition-colors duration-200 ${
          theme === "dark"
            ? "bg-emerald-500/20 border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
            : "bg-orange-500/20 border-orange-500/60 shadow-[0_0_8px_rgba(255,105,0,0.3)]"
        }`}
      >
        <div
          className={`w-3.5 h-3.5 rounded-full shadow-md transform transition-transform duration-200 ease-out ${
            theme === "dark"
              ? "translate-x-3.5 bg-emerald-400"
              : "translate-x-0 bg-orange-500"
          }`}
        />
      </div>
    </button>
  );
}
