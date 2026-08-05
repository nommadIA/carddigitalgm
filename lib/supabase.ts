import { createClient } from "@supabase/supabase-js";

// ✅ Fallback ANON (pública) — garante que o app nunca quebra mesmo se .env falhar no Google Labs
const FALLBACK_SUPABASE_URL = "https://hbvqfpqnuzvzcvhnickt.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhidnFmcHFudXp2emN2aG5pY2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5OTMxMTYsImV4cCI6MjA4NTU2OTExNn0.xftLYM7LyvJcLfN56G394hqdWJXF7-wCvc10yWVO8D8";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
      return await fn();
    },
  },
});
