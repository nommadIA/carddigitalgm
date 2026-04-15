import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card } from "../components/ui/Card";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if we have a session. If not, maybe the token is invalid or expired.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError("Sessão inválida ou expirada. Solicite a recuperação de senha novamente.");
      }
    });
  }, []);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setMessage("Senha atualizada com sucesso! Redirecionando...");
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Erro ao atualizar a senha.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0a0a0a] relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-[460px] relative z-10"
      >
        <Card
          className="p-8 md:p-10 bg-black/40 backdrop-blur-2xl border-white/10 shadow-2xl relative overflow-hidden"
          style={{ borderRadius: 32 }}
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Nova Senha</h2>
            <p className="text-sm text-slate-400">Digite sua nova senha abaixo.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-200 text-sm mb-6 text-center">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-green-200 text-sm mb-6 text-center">
              {message}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1">
              <label className="gm-label ml-1 text-xs uppercase tracking-wider font-bold opacity-60">Nova Senha</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                  <Lock size={20} className="text-slate-400 group-focus-within:text-[var(--gm-primary)] transition-colors" />
                </div>
                <input
                  className="gm-input !pl-12 !pr-12 h-14 text-base bg-black/40 backdrop-blur-md border-[var(--gm-primary)]/40 focus:bg-black/60 focus:border-[var(--gm-primary)] transition-all rounded-2xl w-full text-white"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || !!message}
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

            <div className="space-y-1">
              <label className="gm-label ml-1 text-xs uppercase tracking-wider font-bold opacity-60">Confirmar Nova Senha</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                  <Lock size={20} className="text-slate-400 group-focus-within:text-[var(--gm-primary)] transition-colors" />
                </div>
                <input
                  className="gm-input !pl-12 !pr-12 h-14 text-base bg-black/40 backdrop-blur-md border-[var(--gm-primary)]/40 focus:bg-black/60 focus:border-[var(--gm-primary)] transition-all rounded-2xl w-full text-white"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading || !!message}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="gm-btn w-full h-14 mt-4"
              disabled={isLoading || !!message || !password || !confirmPassword}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  Atualizando...
                </span>
              ) : (
                "Atualizar Senha"
              )}
            </button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
