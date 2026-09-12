import React, { createContext, useContext, useEffect, useMemo, useState, PropsWithChildren } from 'react';
import { supabase, purgeSupabaseAuthStorage } from '../lib/supabase';
import { UserProfile } from '../types';
import { ADMIN_EMAIL } from '../constants';
import { fetchSettingsSupabase, applySettingsToDOM, DEFAULT_SETTINGS } from '../lib/settings';

interface AuthContextType {
  user: UserProfile | null;
  tenantId: string | null;
  loading: boolean;
  checked: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_ADMINS = [ADMIN_EMAIL, "admin@carddigital.com"].filter(Boolean).map(e => String(e).toLowerCase());

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const lastUserIdRef = React.useRef<string | null | undefined>(undefined);

  const initializeUser = async (sessionUser: any) => {
    const currentId = sessionUser?.id || null;
    if (lastUserIdRef.current === currentId && checked) {
      return;
    }
    lastUserIdRef.current = currentId;

    try {
      if (!sessionUser?.email) {
        setUser(null);
        setTenantId(null);
        setIsAdmin(false);
        localStorage.removeItem("tenant_id");
        return;
      }

      const email = String(sessionUser.email).toLowerCase();
      const userIsAdmin = ALLOWED_ADMINS.includes(email);
      setIsAdmin(userIsAdmin);

      const profile: UserProfile = {
        id: sessionUser.id,
        email,
        full_name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name,
        avatar_url: sessionUser.user_metadata?.avatar_url,
        is_admin: userIsAdmin,
        role: userIsAdmin ? 'admin' : 'user'
      };

      setUser(profile);

      // tenantId via RPC
      let tenants: any = null;
      let error: any = null;
      try {
        let res = await supabase.rpc("get_my_tenants");
        if (res.error && String(res.error?.message || res.error).includes("future")) {
          // Token clock skew: wait 400ms and retry once
          await new Promise((r) => setTimeout(r, 400));
          res = await supabase.rpc("get_my_tenants");
        }
        tenants = res.data;
        error = res.error;
      } catch (err) {
        error = err;
      }

      if (error) {
        const errorMsg = error?.message || String(error);
        if (!errorMsg.includes("Failed to fetch") && !errorMsg.includes("future") && !errorMsg.includes("JWT")) {
          console.warn("Erro ao buscar tenants:", errorMsg);
        }
        // não trava o app — usa tenant salvo se existir
        const cachedTenant = localStorage.getItem("tenant_id");
        setTenantId(cachedTenant || null);
        return;
      }

      let activeTenantId = tenants?.[0]?.tenant_id as string | undefined;

      if (!activeTenantId) {
        let newTenantId: any = null;
        let createError: any = null;
        try {
          const res = await supabase.rpc("create_tenant", {
            p_name: "Minha Conta"
          });
          newTenantId = res.data;
          createError = res.error;
        } catch (err) {
          createError = err;
        }

        if (createError) {
          const createMsg = createError?.message || String(createError);
          if (!createMsg.includes("Failed to fetch")) {
            console.warn("Erro ao criar tenant inicial:", createMsg);
          }
          const cachedTenant = localStorage.getItem("tenant_id");
          setTenantId(cachedTenant || null);
          return;
        }
        activeTenantId = newTenantId as any;
      }

      setTenantId(activeTenantId || null);
      if (activeTenantId) {
        localStorage.setItem("tenant_id", activeTenantId);
        fetchSettingsSupabase(activeTenantId).then((s) => {
          if (s) applySettingsToDOM(s, true, activeTenantId);
        }).catch(() => {});
      }

    } catch (e) {
      console.error("Auth init error:", e);
      setTenantId(null);
      localStorage.removeItem("tenant_id");
    } finally {
      setChecked(true);
    }
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.replace(`${window.location.origin}/update-password`);
      }
      if (event === 'SIGNED_OUT') {
        if (mounted) initializeUser(null);
        return;
      }
      if (mounted) initializeUser(session?.user);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    const REDIRECT_URL = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: REDIRECT_URL,
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    });
    if (error) throw error;
  };

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    purgeSupabaseAuthStorage();
    setUser(null);
    setTenantId(null);
    setIsAdmin(false);
    try {
      localStorage.removeItem("tenant_id");
      localStorage.removeItem("gm.settings.cache.v1");
      localStorage.removeItem("gm_colors_dark");
      localStorage.removeItem("gm_button_dark");
      localStorage.removeItem("gm.notifications");
      localStorage.removeItem("gm.isNewUser");
    } catch {}
    applySettingsToDOM(DEFAULT_SETTINGS, false, null);
  };

  const value = useMemo(() => ({
    user,
    tenantId,
    loading: !checked,
    checked,
    isAdmin,
    signInWithGoogle,
    signInWithPassword,
    signUpWithEmail,
    signOut
  }), [user, tenantId, checked, isAdmin]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};