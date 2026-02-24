
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-sm text-slate-400">Autenticando...</p>
    </div>
  );
};

export default AuthCallback;
