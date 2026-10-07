
import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthCallback = () => {
  useEffect(() => {
    const handleAuthCallback = async () => {
      // Força verificação da sessão e limpa URL
      await supabase.auth.getSession();
      window.location.replace('/');
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0c] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-none" />
      <div className="fora apple-glass-card p-8 rounded-3xl border border-white/15 flex flex-col items-center justify-center text-center shadow-2xl backdrop-blur-2xl relative z-10 max-w-sm w-full mx-4">
        <div className="w-12 h-12 border-4 border-[var(--gm-primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
        <h3 className="text-lg font-bold text-white mb-1">CardDigital GM</h3>
        <p className="text-xs text-slate-300 font-medium">Autenticando sessão com segurança...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
