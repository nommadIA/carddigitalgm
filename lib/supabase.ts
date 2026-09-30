import { createClient } from "@supabase/supabase-js";

// ✅ Fallback ANON (pública) — garante que o app nunca quebra mesmo se .env falhar no Google Labs
const FALLBACK_SUPABASE_URL = "https://hbvqfpqnuzvzcvhnickt.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhidnFmcHFudXp2emN2aG5pY2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5OTMxMTYsImV4cCI6MjA4NTU2OTExNn0.xftLYM7LyvJcLfN56G394hqdWJXF7-wCvc10yWVO8D8";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

// Função utilitária para limpar tokens do Supabase expirados ou corrompidos
export function purgeSupabaseAuthStorage() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("sb-") || k.includes("auth-token") || k.includes("supabase.auth.token"))) {
        localStorage.removeItem(k);
      }
    }
  } catch {}
}

// 1. Interceptar e neutralizar erros de refresh token expirado que são comportamentos normais de logout
if (typeof window !== "undefined") {
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    const text = args
      .map((a) => (typeof a === "object" ? a?.message || JSON.stringify(a) : String(a)))
      .join(" ");

    if (
      text.includes("Invalid Refresh Token") ||
      text.includes("Refresh Token Not Found") ||
      text.includes("invalid_grant") ||
      text.includes("Failed to fetch") ||
      text.includes("NetworkError")
    ) {
      console.warn("Supabase auth session expirada ou aviso de rede capturado:", text);
      if (text.includes("Refresh Token") || text.includes("invalid_grant")) {
        purgeSupabaseAuthStorage();
      }
      return;
    }
    originalConsoleError.apply(console, args);
  };

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    const msg = reason?.message || String(reason || "");
    if (
      msg.includes("Invalid Refresh Token") ||
      msg.includes("Refresh Token Not Found") ||
      msg.includes("invalid_grant") ||
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.includes("Load failed")
    ) {
      event.preventDefault();
      if (msg.includes("Refresh Token") || msg.includes("invalid_grant")) {
        purgeSupabaseAuthStorage();
      }
      console.warn("Rejeição de rede ou refresh token tratada com sucesso:", msg);
    }
  });
}

// 2. Trava sequencial em memória: evita concorrência entre getSession e onAuthStateChange,
// que causava consumo duplo e invalidação simultânea do mesmo refresh token
let refreshLockChain: Promise<any> = Promise.resolve();

const sequentialLock = async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
  const prevLock = refreshLockChain;
  let release: () => void;
  refreshLockChain = new Promise<void>((resolve) => {
    release = resolve;
  });

  try {
    await prevLock.catch(() => {});
    return await fn();
  } finally {
    release!();
  }
};

// 3. Fetch seguro para autenticação que expurga imediatamente o token local se o backend rejeitar
const safeAuthFetch: typeof fetch = async (input, init) => {
  try {
    const response = await fetch(input, init);
    if (!response.ok) {
      const urlStr = typeof input === "string" ? input : (input as Request).url || "";
      if (urlStr.includes("/auth/v1/token") && urlStr.includes("grant_type=refresh_token")) {
        const cloned = response.clone();
        const json = await cloned.json().catch(() => null);
        if (
          json &&
          (json.error === "invalid_grant" ||
            String(json.error_description || "").includes("Refresh Token"))
        ) {
          purgeSupabaseAuthStorage();
        }
      }
    }
    return response;
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes("Refresh Token")) {
      console.warn("Supabase fetch token refresh:", err);
    }
    // Retry once for transient network failures
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      try {
        await new Promise((r) => setTimeout(r, 400));
        return await fetch(input, init);
      } catch (retryErr: any) {
        console.warn("Supabase fetch network status:", retryErr?.message || retryErr);
        throw retryErr;
      }
    }
    throw err;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: sequentialLock,
  },
  global: {
    fetch: safeAuthFetch,
  },
});
