import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { Card } from "../components/ui/Card";
import { Lock, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const { signInWithPassword, checked, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (checked && user) navigate("/", { replace: true });
  }, [checked, user, navigate]);

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
          <div className="flex flex-col items-center mb-8">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative mb-5"
            >
              <div className="absolute inset-0 bg-[var(--gm-primary)] blur-2xl opacity-20 rounded-full"></div>
              <img
                src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/brand_assets_logo/FIVE%20ICON%20CARDDIGITAL%20GM.svg"
                alt="Logo CardDigital GM"
                className="w-24 h-24 rounded-3xl shadow-2xl shadow-black/60 hover:scale-105 transition-transform duration-500 relative z-10"
              />
            </motion.div>

            <div className="text-4xl font-light text-white leading-none">
              <span className="opacity-95">CardDigital</span>{" "}
              <span className="text-[var(--gm-primary)] font-bold">GM</span>
            </div>
            <div className="text-sm opacity-60 mt-3">Acesse sua conta para continuar</div>
          </div>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-200 text-sm mb-4">
              {errorMessage}
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

            <div className="space-y-1">
              <label className="gm-label ml-1 text-xs uppercase tracking-wider font-bold opacity-60">Senha</label>
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

            <button
              type="submit"
              className="gm-btn w-full h-14 rounded-2xl font-bold"
              disabled={!canSubmit || isLoading}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  Entrando...
                </span>
              ) : (
                "Entrar na plataforma"
              )}
            </button>

            <div className="mt-6 pt-6 border-t border-white/10 text-center">
              <div className="text-xs opacity-60 mb-3">Ainda não tem uma conta?</div>
              <Link
                to="/register"
                className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition font-semibold"
              >
                Criar nova conta
              </Link>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}