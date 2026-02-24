
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { ADMIN_EMAIL } from "../constants";
import { Card } from "../components/ui/Card";
import { Lock, Mail, ArrowRight, Loader2, Eye, EyeOff, UserPlus, LogIn } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const { signInWithPassword, checked, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState(ADMIN_EMAIL || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (checked && isAdmin) navigate("/", { replace: true });
  }, [checked, isAdmin, navigate]);

  const canSubmit = useMemo(
    () => email.trim().length > 3 && password.length >= 3,
    [email, password]
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);
    try {
      await signInWithPassword(email.trim(), password);
      // AuthContext handles state update
    } catch (err: any) {
      const msg = err?.message || "Erro ao conectar.";
      setErrorMessage(
        msg.includes("Invalid login credentials") ? "Credenciais inválidas." : msg
      );
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
      
      {/* Container aumentado para comportar logo e inputs confortavelmente */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[520px] relative z-10"
      >
        <Card 
          className="p-8 md:p-12 bg-black/40 backdrop-blur-2xl border-white/10 shadow-2xl relative overflow-hidden" 
          style={{ borderRadius: 32 }}
        >
          {/* Cabeçalho unificado dentro do card */}
          <div className="flex flex-col items-center mb-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-[var(--gm-primary)] blur-2xl opacity-20 rounded-full"></div>
              <img
                src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/brand_assets_logo/FIVE%20ICON%20CARDDIGITAL%20GM.svg"
                alt="Logo CardDigital GM"
                className="w-32 h-32 rounded-[2rem] shadow-2xl shadow-black/60 mb-6 hover:scale-105 transition-transform duration-500 relative z-10"
              />
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-4xl text-white tracking-tight flex items-center gap-2"
            >
              <span className="font-light opacity-90">CardDigital</span>
              <span className="font-bold text-[var(--gm-primary)]">GM</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-slate-400 mt-2 text-sm"
            >
              Acesse sua conta para continuar
            </motion.p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-1"
            >
              <label className="gm-label ml-1 text-xs uppercase tracking-wider font-bold opacity-60">E-mail</label>
              <div className="relative group">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                >
                  <Mail size={20} className="text-slate-400 group-focus-within:text-[var(--gm-primary)] transition-colors" />
                </motion.div>
                <input
                  className="gm-input !pl-12 h-14 text-base bg-black/20 border-white/5 focus:bg-black/40 focus:border-[var(--gm-primary)]/50 transition-all rounded-2xl w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-1"
            >
              <label className="gm-label ml-1 text-xs uppercase tracking-wider font-bold opacity-60">Senha</label>
              <div className="relative group">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                >
                  <Lock size={20} className="text-slate-400 group-focus-within:text-[var(--gm-primary)] transition-colors" />
                </motion.div>
                <input
                  className="gm-input !pl-12 !pr-12 h-14 text-base bg-black/20 border-white/5 focus:bg-black/40 focus:border-[var(--gm-primary)]/50 transition-all rounded-2xl w-full"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                />
                {/* Botão do Olho */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </motion.div>

            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200 text-center font-medium"
              >
                {errorMessage}
              </motion.div>
            )}

            <motion.button 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group gm-btn w-full gm-border-loop text-lg h-14 mt-2 font-bold shadow-lg shadow-[var(--gm-primary)]/20 rounded-2xl relative overflow-hidden" 
              type="submit" 
              disabled={!canSubmit || isLoading}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    <LogIn size={22} className="transition-transform duration-300 group-hover:scale-110" />
                    Entrar na plataforma
                    <ArrowRight 
                      size={20} 
                      className="transition-transform duration-300 group-hover:translate-x-2 opacity-70" 
                    />
                  </>
                )}
              </span>
            </motion.button>
          </form>

          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.8 }}
            className="mt-8 pt-6 border-t border-white/10 text-center"
          >
            <p className="text-slate-400 text-sm mb-4">Ainda não tem uma conta?</p>
            <Link 
              to="/register" 
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all w-full border border-white/5 hover:border-[var(--gm-primary)]/30 group"
            >
              <motion.div
                whileHover={{ rotate: 15 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <UserPlus size={18} className="text-[var(--gm-primary)]" />
              </motion.div>
              Criar nova conta
            </Link>
          </motion.div>
        </Card>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-8 text-xs text-slate-500 opacity-40 font-medium tracking-wide"
      >
        &copy; {new Date().getFullYear()} CardDigital GM Pro • Enterprise System
      </motion.div>
    </div>
  );
}
