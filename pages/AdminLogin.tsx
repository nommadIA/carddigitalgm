import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { Card } from "../components/ui/Card";
import { Lock, Mail, Loader2, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedInputField } from "../components/forgeui/AnimatedInputField";
import { isUserAdminEmail } from "../constants";
import { supabase } from "../lib/supabase";

export default function AdminLogin() {
  const { user, checked, signInWithPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("gmedificacao@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Se o usuário já estiver logado como admin, redireciona para a área administrativa
  useEffect(() => {
    if (checked && user && isUserAdminEmail(user.email)) {
      navigate("/admin/usuarios", { replace: true });
    }
  }, [checked, user, navigate]);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const cleanEmail = email.trim().toLowerCase();

    // 1. Validação estrita de e-mail de administrador
    if (!isUserAdminEmail(cleanEmail)) {
      setErrorMessage("Acesso Negado: Este portal é restrito exclusivamente ao Administrador Master (gmedificacao@gmail.com). Se você é um cliente, use o login padrão em /login.");
      return;
    }

    if (!password) {
      setErrorMessage("Por favor, digite sua senha de administrador.");
      return;
    }

    setIsLoading(true);
    try {
      // 2. Autenticação real com o Supabase Auth
      await signInWithPassword(cleanEmail, password);

      // Marca sessão de master admin
      localStorage.setItem("gm_master_admin_session", "true");
      setSuccessMessage("Credenciais administrativas verificadas com sucesso! Entrando...");

      setTimeout(() => {
        navigate("/admin/usuarios", { replace: true });
      }, 700);
    } catch (err: any) {
      console.error("Erro na autenticação de admin:", err);
      let msg = err?.message || "Erro ao autenticar administrador.";
      if (msg.includes("Invalid login credentials") || msg.includes("invalid_grant")) {
        msg = "Senha incorreta para a conta de administrador.";
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0B0B0C] text-[#F2F2F3] relative overflow-hidden select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Top Badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] bg-[#131315] border border-[#FE540B]/40 text-[#FE540B] text-xs font-black uppercase tracking-widest">
            <ShieldCheck size={14} />
            <span>Portal Restrito do Administrador Master</span>
          </div>
        </div>

        <Card
          className="p-6 sm:p-8 rounded-lg border border-[#26262A] bg-[#131315] relative overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-md bg-[#FE540B] flex items-center justify-center font-black text-white text-xl mb-3">
              GM
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Acesso Exclusivo ADM
            </h1>
            <p className="text-xs text-[#8B8B92] mt-1 max-w-xs">
              Portal confidencial de gerenciamento, aprovações de assinaturas e controle do aplicativo.
            </p>
          </div>

          {/* Feedback messages */}
          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-4 p-3 rounded-md bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5"
              >
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-4 p-3 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5"
              >
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleAdminSubmit} className="flex flex-col gap-4">
            {/* E-mail Master */}
            <div>
              <label className="block text-[11px] font-bold text-[#8B8B92] uppercase tracking-wider mb-1.5">
                E-mail Administrativo
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="gmedificacao@gmail.com"
                  className="w-full h-11 pl-10 pr-4 rounded-[4px] bg-[#0B0B0C] border border-[#26262A] focus:border-[#FE540B] text-white text-sm outline-none transition-colors placeholder:text-[#52525B] font-medium"
                />
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B8B92]" />
              </div>
            </div>

            {/* Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-[#8B8B92] uppercase tracking-wider">
                  Senha Master
                </label>
                <span className="text-[11px] text-[#FE540B] font-semibold">
                  Autenticação com Supabase
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Digite sua senha de administrador"
                  className="w-full h-11 pl-10 pr-10 rounded-[4px] bg-[#0B0B0C] border border-[#26262A] focus:border-[#FE540B] text-white text-sm outline-none transition-colors placeholder:text-[#52525B] font-medium"
                />
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B8B92]" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8B92] hover:text-white transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 mt-2 rounded-[6px] bg-[#FE540B] hover:brightness-110 text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin text-white" />
                  <span>Validando Credenciais...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Entrar no Painel Master</span>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 pt-5 border-t border-[#26262A] flex flex-col items-center gap-3 text-center">
            <div className="text-[11px] text-[#8B8B92]">
              Link de acesso exclusivo do administrador.
            </div>
            <Link
              to="/login"
              className="text-xs text-[#CBD5E1] hover:text-white transition-colors flex items-center gap-1 font-medium"
            >
              <span>Voltar para o Login de Clientes</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </Card>

        {/* Informações de Segurança */}
        <div className="mt-4 text-center text-[11px] text-[#8B8B92] font-mono">
          CardDigital GM • Terminal Administrativo Seguro
        </div>
      </motion.div>
    </div>
  );
}
