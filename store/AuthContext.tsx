import React, { createContext, useContext, useEffect, useState, useMemo, PropsWithChildren } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { ADMIN_EMAIL } from '../constants';
import { forceSavePushToken } from '../services/pushFCM';

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

const ALLOWED_ADMINS = [ADMIN_EMAIL, "admin@carddigital.com"];

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const initializeUser = async (sessionUser: any) => {
    try {
      if (!sessionUser || !sessionUser.email) {
        setUser(null);
        setTenantId(null);
        setIsAdmin(false);
        return;
      }

      const email = sessionUser.email.toLowerCase();
      const userIsAdmin = ALLOWED_ADMINS.includes(email);
      setIsAdmin(userIsAdmin);

      const profile: UserProfile = {
        id: sessionUser.id,
        email: email,
        full_name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name,
        avatar_url: sessionUser.user_metadata?.avatar_url,
        is_admin: userIsAdmin,
        role: userIsAdmin ? 'admin' : 'user'
      };

      setUser(profile);

      // --- TENANT ---
      const { data: tenants, error } = await supabase.rpc("get_my_tenants");
      if (error) {
        console.error("Erro ao buscar tenants:", error);
        return;
      }

      let activeTenantId = tenants?.[0]?.tenant_id;

      if (!activeTenantId) {
        const { data: newTenantId, error: createError } = await supabase.rpc("create_tenant", {
          p_name: "Minha Conta"
        });

        if (createError) {
          console.error("Erro ao criar tenant inicial:", createError);
          return;
        }
        activeTenantId = newTenantId;
      }

      setTenantId(activeTenantId);

      // ✅ PUSH (FORÇADO) após ter tenant e user
      try {
      } catch (e) {
        console.warn("[PUSH] falhou:", e);
      }

    } catch (e) {
      console.error("Auth init error:", e);
    } finally {
      setChecked(true);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) initializeUser(data.session?.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) initializeUser(session?.user);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    const REDIRECT_URL = `${window.location.origin}/#/auth/callback`;
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
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTenantId(null);
    setIsAdmin(false);
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