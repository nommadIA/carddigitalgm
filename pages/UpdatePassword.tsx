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
    <div className="min-h-[100dvh] min-h-screen w-full flex items-center justify-center p-3.5 sm:p-6 bg-[#0a0a0a] relative overflow-x-hidden selection:bg-[var(--gm-primary)] selection:text-white" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Background Wallpaper com desfoque e profundidade padrão */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center" aria-hidden="true">
        <div
          className="w-full h-full bg-cover bg-center scale-[1.02]"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80")`,
            backgroundPosition: "50% 50%",
          }}
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] bg-gradient-to-br from-[var(--gm-primary)]/20 via-orange-600/10 to-transparent rounded-full blur-3xl opacity-80" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="gm-login-card-square gm-login-card-compact relative z-10 m-auto flex flex-col justify-center w-full max-w-[440px]"
        style={{
          width: "100%",
          maxWidth: "440px",
          marginLeft: "auto",
          marginRight: "auto",
          boxSizing: "border-box",
        }}
      >
        <Card
          className="gm-login-card-square gm-login-card-compact apple-glass-card fora p-6 sm:p-8 relative overflow-hidden rounded-3xl border border-white/15 shadow-2xl backdrop-blur-2xl"
          style={{
            width: "100%",
            maxWidth: "440px",
            marginLeft: "auto",
            marginRight: "auto",
            boxSizing: "border-box",
          }}
        >
          <div className="text-center mb-7">
            <div className="w-12 h-12 rounded-2xl bg-[var(--gm-primary)]/15 border border-[var(--gm-primary)]/30 text-[var(--gm-primary)] flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Lock size={22} />
            </div>
            <h2 className="text-2xl font-black text-white mb-1 tracking-tight">Nova Senha</h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">Digite e confirme sua nova senha de acesso.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-200 text-sm mb-6 text-center">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-200 text-sm mb-6 text-center">
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
                  className="gm-input !pl-12 !pr-12 h-14 text-base bg-black/40 backdrop-blur-md border-[var(--gm-primary)]/40 focus:bg-black/60 focus:border-[var(--gm-primary)] transition-all rounded-lg w-full text-white"
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
                  className="gm-input !pl-12 !pr-12 h-14 text-base bg-black/40 backdrop-blur-md border-[var(--gm-primary)]/40 focus:bg-black/60 focus:border-[var(--gm-primary)] transition-all rounded-lg w-full text-white"
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
