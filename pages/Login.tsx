import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { Card } from "../components/ui/Card";
import { Lock, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

import { supabase } from "../lib/supabase";

export default function Login() {
  const { signInWithPassword, checked, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  useEffect(() => {
    if (checked && user) navigate("/", { replace: true });
  }, [checked, user, navigate]);

  const canSubmit = useMemo(
    () => {
      if (isForgotPassword) return email.trim().length > 3;
      return email.trim().length > 3 && password.length >= 3;
    },
    [email, password, isForgotPassword]
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    if (isForgotPassword) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/`,
        });
        if (error) throw error;
        setSuccessMessage("Link de recuperação enviado! Verifique seu e-mail.");
      } catch (err: any) {
        setErrorMessage(err?.message || "Erro ao enviar e-mail de recuperação.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      await signInWithPassword(email.trim(), password);
    } catch (err: any) {
      let msg = err?.message || "Erro ao conectar.";
      
      if (msg.includes("Invalid login credentials")) {
        msg = "E-mail ou senha incorretos.";
      } else if (msg.includes("Email not confirmed")) {
        msg = "Por favor, confirme seu e-mail antes de fazer login.";
      }
      
      setErrorMessage(msg);
      setIsLoading(false);
    }
  }

  if (!checked) {
    return (
      <div className="gm-layout flex-col items-center justify-center p-6 min-h-screen">
        <Card className="gm-compact text-center" style={{ maxWidth: 420, width: "100%" }}>
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" />
            Carregando...
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="gm-layout flex-col items-center justify-center p-4 min-h-screen relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-[560px] relative z-10"
      >
        <Card
          className="p-8 md:p-12 bg-black/40 backdrop-blur-2xl border-white/10 shadow-2xl relative overflow-hidden"
          style={{ borderRadius: 32 }}
        >
          {/* CABEÇALHO COMO ANTES */}
          <div className="flex flex-col items-center mb-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
              className="relative mb-6 flex items-center justify-center"
            >
              <div className="gm-logo-box" style={{ width: '110px', height: '110px' }}>
                <div className="gm-logo-glow-wrapper"></div>
                <div className="gm-logo-border-wrapper"></div>
                <img
                  src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg"
                  alt="Logo CardDigital GM"
                  className="gm-logo"
                />
              </div>
            </motion.div>

            <div className="flex items-center justify-center text-center leading-none gap-2">
              <span className="text-3xl font-light text-slate-200 tracking-tight">CardDigital</span>
              <span className="text-4xl font-semibold text-[var(--gm-primary)] drop-shadow-[0_0_15px_rgba(255,122,0,0.3)]">GM</span>
            </div>
            <div className="text-sm opacity-50 mt-4 uppercase tracking-[0.2em] font-bold">Acesso Restrito</div>
          </div>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-200 text-sm mb-4">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-green-200 text-sm mb-4">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="gm-label ml-1 text-xs uppercase tracking-wider font-bold opacity-60">E-mail</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                  <Mail size={20} className="text-slate-400 group-focus-within:text-[var(--gm-primary)] transition-colors" />
                </div>
                <input
                  className="gm-input !pl-12 h-14 text-base bg-black/20 border-white/5 focus:bg-black/40 focus:border-[var(--gm-primary)]/50 transition-all rounded-2xl w-full"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="gm-label text-xs uppercase tracking-wider font-bold opacity-60">Senha</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className="text-xs text-[var(--gm-primary)] hover:underline opacity-80"
                    tabIndex={-1}
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                    <Lock size={20} className="text-slate-400 group-focus-within:text-[var(--gm-primary)] transition-colors" />
                  </div>
                  <input
                    className="gm-input !pl-12 !pr-12 h-14 text-base bg-black/20 border-white/5 focus:bg-black/40 focus:border-[var(--gm-primary)]/50 transition-all rounded-2xl w-full"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="gm-btn w-full h-14"
              disabled={!canSubmit || isLoading}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  {isForgotPassword ? "Enviando..." : "Entrando..."}
                </span>
              ) : (
                isForgotPassword ? "Enviar link de recuperação" : "Entrar na plataforma"
              )}
            </button>

            {isForgotPassword && (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className="w-full text-center text-sm text-slate-400 hover:text-white transition-colors mt-4"
              >
                Voltar para o login
              </button>
            )}

            {!isForgotPassword && (
              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <div className="text-xs opacity-60 mb-3">Ainda não tem uma conta?</div>
                <Link
                  to="/register"
                  className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition font-semibold"
                >
                  Criar nova conta
                </Link>
              </div>
            )}
          </form>
        </Card>
      </motion.div>
    </div>
  );
}