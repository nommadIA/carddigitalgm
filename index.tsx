// ✅ Fallback seguro (SOMENTE ANON) p/ ambientes que não carregam .env (Google Labs)
(window as any).__SUPABASE__ = {
  url: "https://hbvqfpqnuzvzcvhnickt.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhidnFmcHFudXp2emN2aG5pY2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5OTMxMTYsImV4cCI6MjA4NTU2OTExNn0.xftLYM7LyvJcLfN56G394hqdWJXF7-wCvc10yWVO8D8",
};
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import "./index.css"; // Ensure CSS is imported
import { supabase } from "./lib/supabase";
import { fetchSettingsSupabase, applySettingsToDOM, readSettingsLocal } from "./lib/settings";

declare global {
  interface Window {
    __GM_APP_READY__?: () => void;
    __GM_SPLASH_STATUS__?: (text: string) => void;
    __GM_SPLASH_SET_USER__?: (name?: string, avatarUrl?: string) => void;
    loginWithGoogleGM?: () => Promise<void>;
  }
}

async function bootReal() {
  // 1) aplica cache local (tema/fonte) imediato para evitar flash
  const cached = readSettingsLocal();
  if (cached) applySettingsToDOM(cached);

  // 2) Tenta carregar dados mínimos na splash
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (user) {
      const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
      const avatarUrl = user.user_metadata?.avatar_url;

      window.__GM_SPLASH_SET_USER__?.(name, avatarUrl);
      window.__GM_SPLASH_STATUS__?.("Sincronizando preferências…");

      // Puxa settings remotos em paralelo para agilizar
      fetchSettingsSupabase().then(settings => {
        if (settings) applySettingsToDOM(settings);
      }).catch(() => {});
    }
  } catch (err) {
    console.warn("Boot session check failed, proceeding to React mount.");
  }
}

// Inicia o boot mas não bloqueia a renderização do React
bootReal();

// Registro do Service Worker para PWA/Netlify
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(console.error);
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
