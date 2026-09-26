import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { Card } from "../components/ui/Card";
import { Lock, Mail, Loader2, Eye, EyeOff, ShieldCheck, Check } from "lucide-react";
import { motion } from "framer-motion";

import { supabase } from "../lib/supabase";
import { readSettingsLocal } from "../lib/settings";
import SecurityVerifier from "../components/auth/SecurityVerifier";
import { isPinSecurityActive, setSessionUnlocked } from "../lib/securityPin";
import PinLockModal from "../components/auth/PinLockModal";

export default function Login() {
  const { signInWithPassword, checked, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Estados da proteção por PIN
  const [protectWithPin, setProtectWithPin] = useState(false);
  const [showPinVerifyModal, setShowPinVerifyModal] = useState(false);
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);

  const settings = useMemo(() => readSettingsLocal(), []);

  const isPinActiveForUser = useMemo(() => {
    return isPinSecurityActive(email.trim());
  }, [email]);

  useEffect(() => {
    if (checked && user && !showPinSetupModal) navigate("/", { replace: true });
  }, [checked, user, showPinSetupModal, navigate]);

  const canSubmit = useMemo(
    () => {
      if (isForgotPassword) return email.trim().length > 3 && isVerified;
      return email.trim().length > 3 && password.length >= 3 && isVerified;
    },
    [email, password, isForgotPassword, isVerified]
  );

  async function executeActualLogin() {
    setIsLoading(true);
    try {
      await signInWithPassword(email.trim(), password);
      setSessionUnlocked(true);

      // Se o usuário solicitou proteger com PIN e ainda não tem
      if (protectWithPin && !isPinActiveForUser) {
        setShowPinSetupModal(true);
        return;
      }
    } catch (err: any) {
      let msg = err?.message || "Erro ao conectar.";
      
      if (msg.includes("Invalid login credentials")) {
        msg = "E-mail ou senha incorretos.";
      } else if (msg.includes("Email not confirmed")) {
        msg = "Por favor, confirme seu e-mail antes de fazer login.";
      }
      
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (isForgotPassword) {
      setIsLoading(true);
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

    // Se este dispositivo já possui um PIN ativo para este usuário, exige o PIN primeiro
    if (isPinActiveForUser) {
      setShowPinVerifyModal(true);
      return;
    }

    await executeActualLogin();
  }

  const handlePinVerifySuccess = async () => {
    setShowPinVerifyModal(false);
    await executeActualLogin();
  };

  const handlePinSetupSuccess = () => {
    setShowPinSetupModal(false);
    setSessionUnlocked(true);
    navigate("/", { replace: true });
  };

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 py-8 bg-[#0a0a0a] relative overflow-y-auto">
      {/* Luzes de refração e profundidade para o Apple Glass Blur */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] bg-gradient-to-br from-[var(--gm-primary)]/15 via-orange-600/10 to-transparent rounded-full blur-3xl opacity-75" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/4 w-[500px] h-[400px] bg-gradient-to-tr from-white/[0.04] to-transparent rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-[560px] relative z-10"
      >
        <div
          className="apple-glass-card p-8 md:p-12 relative overflow-hidden rounded-2xl md:rounded-[2rem] border border-white/15 shadow-2xl"
        >
          {/* CABEÇALHO COM LOGO - EFEITO ORIGINAL PRESERVADO INTACTO */}
          <div className="flex flex-col items-center mb-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
              className="relative mb-6 flex items-center justify-center"
            >
              <div className="gm-logo-box" style={{ width: '104px', height: '104px' }}>
                <div className="gm-logo-glow-wrapper"></div>
                <div className="gm-logo-border-wrapper"></div>
                {settings?.company_logo_url ? (
                  <img
                    src={settings.company_logo_url}
                    alt={settings.company_name || "Logo"}
                    className="gm-logo"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--gm-primary)] font-black text-3xl uppercase tracking-wider relative z-10">
                    {settings?.company_name ? settings.company_name.substring(0, 2) : "GM"}
                  </div>
                )}
              </div>
            </motion.div>

            <div className="flex items-center justify-center text-center leading-none gap-2">
              <span className="text-3xl font-light text-slate-200 tracking-tight">
                {settings?.company_name ? settings.company_name : <>CardDigital <span className="text-4xl font-semibold text-[var(--gm-primary)]">GM</span></>}
              </span>
            </div>
            <div className="text-sm opacity-50 mt-4 uppercase tracking-[0.2em] font-bold">Acesso Restrito</div>
          </div>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-200 text-sm mb-4">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-200 text-sm mb-4">
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
                  className="apple-glass-input !pl-12 h-14 text-base focus:border-[var(--gm-primary)] !outline-none !ring-0 focus:!ring-0 focus:!outline-none transition-all rounded-xl w-full text-white"
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
                    className="apple-glass-input !pl-12 !pr-12 h-14 text-base focus:border-[var(--gm-primary)] !outline-none !ring-0 focus:!ring-0 focus:!outline-none transition-all rounded-xl w-full text-white"
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

            {!isForgotPassword && (
              <div className="pt-1">
                <div
                  onClick={() => {
                    if (!isPinActiveForUser) {
                      setProtectWithPin(!protectWithPin);
                    }
                  }}
                  className={`w-full rounded-2xl px-4 py-3 flex items-center justify-between select-none transition-all duration-300 relative group ${
                    !isPinActiveForUser ? "cursor-pointer" : ""
                  } ${
                    isPinActiveForUser || protectWithPin
                      ? "bg-gradient-to-r from-[var(--gm-primary,#FE540B)]/[0.12] via-orange-500/[0.06] to-transparent border border-[var(--gm-primary,#FE540B)]/50 shadow-[0_0_24px_-4px_rgba(254,84,11,0.25)]"
                      : "bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20"
                  }`}
                >
                  {/* LADO ESQUERDO: Ícone e Título com visual de segurança do dispositivo */}
                  <div className="flex items-center gap-3.5 min-w-0 pr-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isPinActiveForUser || protectWithPin
                          ? "bg-[var(--gm-primary,#FE540B)] text-white shadow-md shadow-orange-500/40 scale-105"
                          : "bg-white/[0.06] text-zinc-400 group-hover:text-zinc-200 border border-white/10"
                      }`}
                    >
                      <Lock size={19} className="transition-transform duration-200" />
                    </div>

                    <div className="flex flex-col text-left justify-center">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm sm:text-[15px] font-semibold tracking-tight">
                          Proteger este dispositivo com PIN
                        </span>
                        {(isPinActiveForUser || protectWithPin) && (
                          <span className="hidden sm:inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--gm-primary,#FE540B)]/20 text-[var(--gm-primary,#FE540B)] border border-[var(--gm-primary,#FE540B)]/30">
                            Ativo
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        {isPinActiveForUser
                          ? "Bloqueio ativado para credenciais salvas"
                          : "Exigir 4 dígitos ao abrir no celular ou computador"}
                      </span>
                    </div>
                  </div>

                  {/* LADO DIREITO: Switch Toggle Estilo Apple / Hardware */}
                  <div className="shrink-0 flex items-center">
                    <div
                      className={`w-12 h-7 rounded-full p-0.5 transition-all duration-300 flex items-center ${
                        isPinActiveForUser || protectWithPin
                          ? "bg-[var(--gm-primary,#FE540B)] shadow-[0_0_14px_rgba(254,84,11,0.5)] justify-end"
                          : "bg-zinc-800 border border-white/15 justify-start"
                      }`}
                    >
                      <motion.div
                        layout
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center"
                      >
                        {(isPinActiveForUser || protectWithPin) && (
                          <div className="w-2 h-2 rounded-full bg-[var(--gm-primary,#FE540B)]" />
                        )}
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Verificador de Segurança de Login (Estilo Google reCAPTCHA) */}
            <div className="pt-1">
              <SecurityVerifier onVerifyChange={setIsVerified} />
            </div>

            <button
              type="submit"
              className="gm-btn !bg-gradient-to-r !from-[#FF7A2A] !to-[#FE540B] !text-white !border-none font-bold w-full h-14 shadow-lg shadow-orange-500/25 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center rounded-xl text-base"
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
                  className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-all font-semibold text-white/90 hover:text-white backdrop-blur-md shadow-sm active:scale-[0.99]"
                >
                  Criar nova conta
                </Link>
              </div>
            )}
          </form>
        </div>
      </motion.div>

      {showPinVerifyModal && (
        <PinLockModal
          open={showPinVerifyModal}
          mode="verify"
          email={email.trim()}
          title="PIN de Segurança"
          description="Digite seu PIN de 4 dígitos para autorizar o acesso com as credenciais salvas."
          onSuccess={handlePinVerifySuccess}
          onCancel={() => setShowPinVerifyModal(false)}
        />
      )}

      {showPinSetupModal && (
        <PinLockModal
          open={showPinSetupModal}
          mode="setup"
          email={email.trim()}
          title="Criar PIN deste Dispositivo"
          description="Crie um PIN de 4 dígitos para proteger suas credenciais salvas neste aparelho (smartphone ou computador)."
          onSuccess={handlePinSetupSuccess}
          onCancel={() => {
            setShowPinSetupModal(false);
            navigate("/", { replace: true });
          }}
        />
      )}
    </div>
  );
}