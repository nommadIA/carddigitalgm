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
import { fetchSettingsSupabase, applySettingsToDOM, readSettingsLocal, DEFAULT_SETTINGS } from "./lib/settings";

declare global {
  interface Window {
    __GM_APP_READY__?: () => void;
    __GM_SPLASH_STATUS__?: (text: string) => void;
    __GM_SPLASH_SET_USER__?: (name?: string, avatarUrl?: string) => void;
    loginWithGoogleGM?: () => Promise<void>;
  }
}

async function bootReal() {
  // 1) Aplica cache local ou DEFAULT_SETTINGS oficial do ADM imediatamente
  const cached = readSettingsLocal();
  if (cached) {
    applySettingsToDOM(cached);
  } else {
    applySettingsToDOM(DEFAULT_SETTINGS, false);
  }

  // 2) Sincroniza personalização oficial do Master Admin (gmedificacao@gmail.com)
  try {
    const res = await supabase.auth.getSession().catch(() => null);
    const session = res?.data?.session;
    const user = session?.user;
    const tid = typeof localStorage !== "undefined" ? localStorage.getItem("tenant_id") : null;

    if (user) {
      const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
      const avatarUrl = user.user_metadata?.avatar_url;

      window.__GM_SPLASH_SET_USER__?.(name, avatarUrl);
      window.__GM_SPLASH_STATUS__?.("Sincronizando preferências…");

      fetchSettingsSupabase(tid).then(settings => {
        if (settings) applySettingsToDOM(settings);
      }).catch(() => {});
    } else {
      // Mesmo deslogado (telas de login e registro), carrega a personalização oficial do Master Admin
      fetchSettingsSupabase(null).then(settings => {
        if (settings) applySettingsToDOM(settings);
      }).catch(() => {});
    }
  } catch (err) {
    console.warn("Boot session check failed, proceeding to React mount.");
  }
}

// Inicia o boot mas não bloqueia a renderização do React
bootReal();

// Registro do Service Worker para PWA/Push Notifications
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    try {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        // Inicia sincronização de alarmes em segundo plano
        if (reg && reg.active) {
          reg.active.postMessage({ type: 'START_BACKGROUND_SYNC' });
        }
      }).catch((err) => {
        console.warn("ServiceWorker registration skipped:", err?.message || err);
      });
    } catch (err) {
      console.warn("ServiceWorker init error:", err);
    }
    
    // Listen for navigation messages from the service worker (for pushes)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'NAVIGATE' && event.data.url) {
        const parts = event.data.url.split('/#');
        if (parts.length > 1) {
          window.location.hash = parts[1];
        }
      }
    });
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
