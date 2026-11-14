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
    <div className="min-h-[100dvh] min-h-screen w-full flex items-center justify-center p-3.5 sm:p-6 bg-[#0B0B0C] relative overflow-x-hidden selection:bg-[var(--gm-primary)] selection:text-white" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Background Wallpaper */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center" aria-hidden="true">
        <div
          className="w-full h-full bg-cover bg-center scale-[1.02]"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80")`,
            backgroundPosition: "50% 50%",
          }}
        />
        <div className="absolute inset-0 bg-black/75 pointer-events-none" />
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
          className="gm-login-card-square gm-login-card-compact bg-[#131315] p-6 sm:p-8 relative overflow-hidden rounded-lg border border-[#26262A] shadow-2xl"
          style={{
            width: "100%",
            maxWidth: "440px",
            marginLeft: "auto",
            marginRight: "auto",
            boxSizing: "border-box",
          }}
        >
          <div className="text-center mb-7">
            <div className="w-12 h-12 rounded-md bg-[var(--gm-primary)]/15 border border-[var(--gm-primary)]/30 text-[var(--gm-primary)] flex items-center justify-center mx-auto mb-3">
              <Lock size={22} />
            </div>
            <h2 className="text-2xl font-black text-white mb-1 tracking-tight">Nova Senha</h2>
            <p className="text-xs sm:text-sm text-[#8B8B92] font-medium">Digite e confirme sua nova senha de acesso.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-md p-4 text-red-200 text-sm mb-6 text-center">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-md p-4 text-emerald-200 text-sm mb-6 text-center">
              {message}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1">
              <label className="gm-label ml-1 text-[11px] uppercase tracking-wider font-bold text-[#8B8B92]">Nova Senha</label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10">
                  <Lock size={18} className="text-[#8B8B92] group-focus-within:text-[var(--gm-primary)] transition-colors" />
                </div>
                <input
                  className="gm-input !pl-11 !pr-11 h-12 text-sm bg-[#0B0B0C] border border-[#26262A] focus:border-[var(--gm-primary)] transition-colors rounded-[4px] w-full text-white"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || !!message}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8B8B92] hover:text-white transition-colors focus:outline-none cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="gm-label ml-1 text-[11px] uppercase tracking-wider font-bold text-[#8B8B92]">Confirmar Nova Senha</label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10">
                  <Lock size={18} className="text-[#8B8B92] group-focus-within:text-[var(--gm-primary)] transition-colors" />
                </div>
                <input
                  className="gm-input !pl-11 !pr-11 h-12 text-sm bg-[#0B0B0C] border border-[#26262A] focus:border-[var(--gm-primary)] transition-colors rounded-[4px] w-full text-white"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading || !!message}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8B8B92] hover:text-white transition-colors focus:outline-none cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="gm-btn w-full h-11 rounded-[6px] mt-4"
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
