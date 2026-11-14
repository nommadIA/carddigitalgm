
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B0C] text-[#F2F2F3] relative overflow-hidden">
      <div className="bg-[#131315] p-8 rounded-lg border border-[#26262A] flex flex-col items-center justify-center text-center shadow-2xl relative z-10 max-w-sm w-full mx-4">
        <div className="w-11 h-11 border-4 border-[var(--gm-primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-lg font-bold text-white mb-1">CardDigital GM</h3>
        <p className="text-xs text-[#8B8B92] font-medium">Autenticando sessão com segurança...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
