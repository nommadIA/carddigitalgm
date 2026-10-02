import React, { useState } from "react";
import { useAuth } from "../store/AuthContext";
import { Loader2, ArrowLeft, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { motion } from "framer-motion";

const DEFAULT_ARCH_WALLPAPER =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80";

export default function Register() {
  const { signUpWithEmail } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) return setErrorMessage("As senhas não coincidem.");
    if (password.length < 6) return setErrorMessage("A senha deve ter pelo menos 6 caracteres.");

    setIsLoading(true);
    try {
      await signUpWithEmail(email, password, fullName);
      localStorage.setItem("gm.isNewUser", "true");
      setTimeout(() => navigate("/login"), 800);
    } catch (err: any) {
      let msg = err?.message || "Erro ao criar conta.";
      
      // Traduzir erros comuns do Supabase
      if (msg.includes("email rate limit exceeded") || msg.includes("rate limit")) {
        msg = "Limite de e-mails excedido. Tente novamente mais tarde.";
      } else if (msg.includes("Error sending confirmation email")) {
        msg = "Erro ao enviar e-mail de confirmação. Verifique as configurações de SMTP no Supabase.";
      } else if (msg.includes("User already registered")) {
        msg = "Este e-mail já está cadastrado.";
      } else if (msg.includes("Password should be at least")) {
        msg = "A senha deve ter pelo menos 6 caracteres.";
      }
      
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] min-h-screen w-full flex items-center justify-center p-3.5 sm:p-6 bg-[#0a0a0a] relative overflow-x-hidden selection:bg-[var(--gm-primary)] selection:text-white" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Background Wallpaper */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center" aria-hidden="true">
        <div
          className="w-full h-full bg-cover bg-center scale-[1.02]"
          style={{
            backgroundImage: `url("${DEFAULT_ARCH_WALLPAPER}")`,
            backgroundPosition: "50% 50%",
          }}
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] bg-gradient-to-br from-[var(--gm-primary)]/20 via-orange-600/10 to-transparent rounded-full blur-3xl opacity-80" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="gm-login-card-square gm-login-card-compact relative z-10 m-auto flex flex-col justify-center"
        style={{
          width: "100%",
          maxWidth: "440px",
          marginLeft: "auto",
          marginRight: "auto",
          boxSizing: "border-box",
        }}
      >
        <Card
          className="gm-login-card-square gm-login-card-compact apple-glass-card p-6 sm:p-8 relative overflow-hidden rounded-3xl border border-white/15 shadow-2xl backdrop-blur-2xl"
          style={{
            width: "100%",
            maxWidth: "440px",
            marginLeft: "auto",
            marginRight: "auto",
            boxSizing: "border-box",
          }}
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
                className="w-24 h-24 rounded-lg shadow-lg shadow-black/60 hover:scale-105 transition-transform duration-500 relative z-10"
              />
            </motion.div>

            <div className="text-4xl font-light text-white leading-none">
              <span className="opacity-95">CardDigital</span>{" "}
              <span className="text-[var(--gm-primary)] font-bold">GM</span>
            </div>
            <div className="text-sm opacity-60 mt-3">Crie sua conta para começar</div>
          </div>

          {errorMessage && (
            <div className="text-red-200 text-sm text-center p-4 rounded-lg border border-red-500/20 bg-red-500/10 mb-4">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="gm-label ml-1 text-xs uppercase tracking-wider font-bold opacity-60">Nome Completo</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                  <User size={20} className="text-slate-400 group-focus-within:text-[var(--gm-primary)] transition-colors" />
                </div>
                <input
                  className="gm-input !pl-12 h-14 text-base focus:border-[var(--gm-primary)] !outline-none !ring-0 focus:!ring-0 focus:!outline-none transition-all rounded-lg w-full text-white"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="gm-label ml-1 text-xs uppercase tracking-wider font-bold opacity-60">E-mail</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                  <Mail size={20} className="text-slate-400 group-focus-within:text-[var(--gm-primary)] transition-colors" />
                </div>
                <input
                  className="gm-input !pl-12 h-14 text-base focus:border-[var(--gm-primary)] !outline-none !ring-0 focus:!ring-0 focus:!outline-none transition-all rounded-lg w-full text-white"
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
                  className="gm-input !pl-12 !pr-12 h-14 text-base focus:border-[var(--gm-primary)] !outline-none !ring-0 focus:!ring-0 focus:!outline-none transition-all rounded-lg w-full text-white"
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

            <div className="space-y-1">
              <label className="gm-label ml-1 text-xs uppercase tracking-wider font-bold opacity-60">Confirmar Senha</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                  <Lock size={20} className="text-slate-400 group-focus-within:text-[var(--gm-primary)] transition-colors" />
                </div>
                <input
                  className="gm-input !pl-12 h-14 text-base focus:border-[var(--gm-primary)] !outline-none !ring-0 focus:!ring-0 focus:!outline-none transition-all rounded-lg w-full text-white"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="gm-btn !bg-gradient-to-r !from-[#FF7A2A] !to-[#FE540B] !text-white !border-none font-bold w-full h-14 shadow-lg shadow-orange-500/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center rounded-lg text-base"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  Criando...
                </span>
              ) : (
                "Criar Conta"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <Link to="/login" className="inline-flex items-center text-slate-400 hover:text-white text-sm transition-colors gap-2 group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Voltar para Login
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}