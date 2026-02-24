
import React, { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { APP_NAME } from '../constants';
import { Loader2, ArrowLeft, CheckCircle2, User, Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { motion } from 'framer-motion';

const Register = () => {
  const { signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    
    if (password !== confirmPassword) {
        setErrorMessage('As senhas não coincidem.');
        return;
    }

    if (password.length < 6) {
        setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
        return;
    }

    setIsLoading(true);
    try {
      await signUpWithEmail(email, password, fullName);
      setSuccessMessage('Conta criada com sucesso! Verifique seu e-mail ou faça login.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="gm-layout flex-col items-center justify-center p-4 min-h-screen relative overflow-hidden">
      
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
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotate: 10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative inline-block mb-4"
            >
              <div className="absolute inset-0 bg-[var(--gm-primary)] blur-xl opacity-20 rounded-full"></div>
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative z-10">
                <UserPlus size={32} className="text-[var(--gm-primary)]" />
              </div>
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white mb-2"
            >
              Criar Conta
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm opacity-60"
            >
              Junte-se ao {APP_NAME}
            </motion.p>
          </div>

          {successMessage ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center"
              >
                  <div className="flex justify-center mb-4">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                      >
                        <CheckCircle2 size={48} className="text-green-500" />
                      </motion.div>
                  </div>
                  <h3 className="text-green-400 font-bold text-xl mb-2">Sucesso!</h3>
                  <p className="text-slate-300 text-sm mb-6">{successMessage}</p>
                  <Link to="/login" className="gm-btn w-full inline-flex items-center justify-center">Ir para Login &rarr;</Link>
              </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-1"
                >
                  <label className="gm-label ml-1 text-xs uppercase tracking-wider font-bold opacity-60">Nome Completo</label>
                  <div className="relative group">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                    >
                      <User size={20} className="text-slate-400 group-focus-within:text-[var(--gm-primary)] transition-colors" />
                    </motion.div>
                    <input 
                      className="gm-input !pl-12 h-14 text-base bg-black/20 border-white/5 focus:bg-black/40 focus:border-[var(--gm-primary)]/50 transition-all rounded-2xl w-full"
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
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
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
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
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                  className="space-y-1"
                >
                  <label className="gm-label ml-1 text-xs uppercase tracking-wider font-bold opacity-60">Confirmar Senha</label>
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
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </motion.div>

                {errorMessage && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-red-200 text-sm text-center p-4 rounded-2xl border border-red-500/20 bg-red-500/10"
                  >
                      {errorMessage}
                  </motion.div>
                )}

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="gm-btn gm-border-loop w-full h-14 text-lg font-bold mt-6 shadow-lg shadow-[var(--gm-primary)]/20 rounded-2xl"
                >
                  {isLoading ? <Loader2 size={24} className="animate-spin" /> : "Criar Conta"}
                </motion.button>
            </form>
          )}

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-8 pt-6 border-t border-white/10 text-center"
          >
            <Link to="/login" className="inline-flex items-center text-slate-400 hover:text-white text-sm transition-colors gap-2 group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Voltar para Login
            </Link>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Register;
