import React, { useState } from "react";
import { 
  X, Mail, Lock, User, UserPlus, Phone, MapPin, Eye, EyeOff, 
  CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, FileText, Send, ExternalLink
} from "lucide-react";
import { signInCustomer, signUpCustomer, lookupViaCep, Customer } from "../../lib/customerService";
import { supabase } from "../../lib/supabase";
import { ADMIN_EMAIL } from "../../constants";

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
  brandColor?: string;
  tenantId?: string;
  companyAddress?: string;
  companyAddressUrl?: string;
  companyWhatsapp?: string;
  companyName?: string;
  companyEmail?: string;
}

export function CustomerAuthModal({
  isOpen,
  onClose,
  onSuccess,
  brandColor = "#FE540B",
  tenantId = "global",
  companyAddress,
  companyAddressUrl,
  companyWhatsapp = "98987505041",
  companyName = "GM Edificação",
  companyEmail = "gmedificacao@gmail.com",
}: CustomerAuthModalProps) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCpfCnpj, setRegCpfCnpj] = useState("");

  // Address fields
  const [regCep, setRegCep] = useState("");
  const [regStreet, setRegStreet] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [regComplement, setRegComplement] = useState("");
  const [regNeighborhood, setRegNeighborhood] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regState, setRegState] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);

  // Phone and CPF/CNPJ masks
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length === 0) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const formatCpfCnpj = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 14);
    if (digits.length <= 11) {
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
      if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    } else {
      if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    }
  };

  if (!isOpen) return null;

  const handleCepChange = async (cepInput: string) => {
    setRegCep(cepInput);
    const clean = cepInput.replace(/\D/g, "");
    if (clean.length === 8) {
      setLoadingCep(true);
      const res = await lookupViaCep(clean);
      setLoadingCep(false);
      if (res) {
        setRegStreet(res.street || "");
        setRegNeighborhood(res.neighborhood || "");
        setRegCity(res.city || "");
        setRegState(res.state || "");
      }
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setErrorMessage("Por favor, preencha seu e-mail e senha.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const res = await signInCustomer(loginEmail.trim(), loginPassword);
    setLoading(false);

    if (!res.success || !res.customer) {
      setErrorMessage(res.error || "E-mail ou senha incorretos.");
      return;
    }

    const cleanInputEmail = loginEmail.trim().toLowerCase();
    const cleanAdminEmail = (ADMIN_EMAIL || "gmedificacao@gmail.com").trim().toLowerCase();
    const isLoggingAsAdmin = cleanInputEmail === cleanAdminEmail || !!res.customer?.is_admin;

    if (isLoggingAsAdmin) {
      localStorage.setItem("gm_admin_authenticated", "true");
    }

    setSuccessMessage(isLoggingAsAdmin ? "Login de Administrador aprovado! Painel liberado." : "Login realizado com sucesso!");
    setTimeout(() => {
      onSuccess(res.customer!);
      onClose();
    }, 600);
  };

  const handleForgotPassword = async () => {
    if (!loginEmail.trim()) {
      setErrorMessage("Digite seu e-mail acima para recuperar sua senha.");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail.trim(), {
        redirectTo: window.location.origin,
      });
      setLoading(false);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage("Instruções de redefinição de senha foram enviadas para o seu e-mail!");
      }
    } catch {
      setLoading(false);
      setErrorMessage("Não foi possível enviar o link de redefinição. Tente novamente.");
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword || !regPhone.trim()) {
      setErrorMessage("Por favor, preencha nome, e-mail, WhatsApp e crie uma senha.");
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const hasAddress = regCep.trim() || regStreet.trim();
    const res = await signUpCustomer({
      full_name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      phone: regPhone.trim(),
      cpf_cnpj: regCpfCnpj.trim() || undefined,
      address: hasAddress ? {
        cep: regCep.trim() || undefined,
        street: regStreet.trim() || undefined,
        number: regNumber.trim() || undefined,
        complement: regComplement.trim() || undefined,
        neighborhood: regNeighborhood.trim() || undefined,
        city: regCity.trim() || undefined,
        state: regState.trim() || undefined,
      } : undefined,
      tenant_id: tenantId,
    });

    setLoading(false);

    if (!res.success || !res.customer) {
      setErrorMessage(res.error || "Não foi possível criar sua conta. Verifique os dados.");
      return;
    }

    setSuccessMessage("Conta criada com sucesso! Seja bem-vindo(a).");
    setTimeout(() => {
      onSuccess(res.customer!);
      onClose();
    }, 700);
  };

  const cleanWhatsapp = (companyWhatsapp || "98987505041").replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
    tab === "login"
      ? "Olá! Preciso de ajuda para acessar a Área do Cliente da GM Edificação."
      : "Olá! Gostaria de ajuda para realizar meu cadastro na GM Edificação."
  )}`;

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-start p-3 sm:p-6 sm:py-8 bg-black/80 backdrop-blur-2xl overflow-y-auto overscroll-contain gm-customer-modal-overlay"
      onClick={onClose}
    >
      {/* 1. Header: Title & Description (Idêntico ao Fale com a Gente) */}
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center text-center space-y-3 mb-6 sm:mb-8 pt-3 sm:pt-6 shrink-0 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-0 right-0 sm:right-2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer z-30 shadow-md"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-sans font-black tracking-tight leading-tight select-none text-white">
          {tab === "login" ? "Área do Cliente" : "Criar sua Conta de Cliente"}
        </h2>
        
        <p className="text-xs sm:text-sm md:text-base font-medium leading-relaxed max-w-2xl text-zinc-300">
          {tab === "login" 
            ? "Acesse para gerenciar seus pedidos, compras e atendimentos personalizados com rapidez e segurança." 
            : "Cadastre-se para comprar com agilidade, acompanhar o status das suas entregas e receber orçamentos exclusivos."}
        </p>
      </div>

      {/* 2. Main Grid: Form + Address/Map (Idêntico ao Fale com a Gente) */}
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-24 sm:mb-12">
        
        {/* Form Container (Col 1-7 or Col 1-12 if no address) */}
        <div 
          className={`w-full ${companyAddress ? "lg:col-span-7" : "lg:col-span-8 lg:col-start-3"} apple-glass-card p-5 sm:p-8 md:p-10 rounded-[2.5rem] text-white gm-customer-auth-container gm-customer-modal-container transition-all duration-300 relative`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Segmented Control - Tab Switcher */}
          <div className="w-full max-w-[320px] mx-auto mb-6 p-1 bg-black/60 backdrop-blur-md rounded-2xl border border-white/15 flex flex-row items-center gap-1 h-12 box-border">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className={`flex-1 h-full rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none flex items-center justify-center text-center whitespace-nowrap px-3 ${
                tab === "login" 
                  ? "bg-white text-zinc-950 shadow-md font-black" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Já sou Cliente
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("register");
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className={`flex-1 h-full rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none flex items-center justify-center text-center whitespace-nowrap px-3 ${
                tab === "register" 
                  ? "bg-white text-zinc-950 shadow-md font-black" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Criar Nova Conta
            </button>
          </div>

          {/* Card Sub-Header */}
          <div className="mb-6 flex items-center gap-3.5 pb-4 border-b border-white/10">
            <div 
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md shrink-0 border border-white/20 text-white"
              style={{ backgroundColor: brandColor || "#FE540B" }}
            >
              {tab === "register" ? (
                <UserPlus className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <User className="w-5 h-5 stroke-[2.5]" />
              )}
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {tab === "login" ? "Acesse sua Conta" : "Dados para Cadastro"}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400">
                {tab === "login" 
                  ? "Preencha suas credenciais para gerenciar pedidos e dados." 
                  : "Preencha suas informações para agilizar suas compras e pedidos."}
              </p>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3.5 mb-5 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center gap-2.5 text-red-300 text-xs sm:text-sm font-bold animate-in shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 mb-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs sm:text-sm font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* LOGIN FORM                                                     */}
          {/* ============================================================== */}
          {tab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  E-mail de Acesso <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-4 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Senha <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-4 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Sua senha secreta"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/10"
                    title={showPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-zinc-400 hover:text-[#FE540B] transition-colors cursor-pointer"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
              </div>

              {/* Submit & WhatsApp Action Buttons (Idênticos ao Fale com a Gente) */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="site-btn-pill w-full sm:w-auto px-8 sm:px-10 py-3.5 text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer font-black"
                  style={{ backgroundColor: brandColor || "#FE540B" }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Acessando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Entrar na Área do Cliente</span>
                    </>
                  )}
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-full font-black text-xs sm:text-sm flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <img 
                    src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20BRANCA/Whatsapp%20branco.svg" 
                    alt="WhatsApp" 
                    className="w-4 h-4 object-contain"
                  />
                  <span>Atendimento WhatsApp</span>
                </a>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* REGISTER FORM                                                  */}
          {/* ============================================================== */}
          {tab === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 sm:space-y-5">
              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Seu Nome Completo <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-zinc-400 absolute left-4 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Como podemos te chamar?"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                  />
                </div>
              </div>

              {/* E-mail e WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    E-mail de Acesso <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-4 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    WhatsApp / Telefone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="w-6 h-6 rounded-lg bg-[#25D366] flex items-center justify-center absolute left-3.5 pointer-events-none shadow-sm text-white">
                      <img 
                        src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20BRANCA/Whatsapp%20branco.svg" 
                        alt="WhatsApp" 
                        className="w-3.5 h-3.5 object-contain"
                      />
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder="(98) 98750-5041"
                      maxLength={15}
                      value={regPhone}
                      onChange={(e) => setRegPhone(formatPhone(e.target.value))}
                      className="w-full pl-12 pr-4 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* CPF/CNPJ e Senha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    CPF / CNPJ <span className="text-[10px] text-zinc-500 font-normal lowercase">(opcional)</span>
                  </label>
                  <div className="relative flex items-center">
                    <FileText className="w-4 h-4 text-zinc-400 absolute left-4 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      maxLength={18}
                      value={regCpfCnpj}
                      onChange={(e) => setRegCpfCnpj(formatCpfCnpj(e.target.value))}
                      className="w-full pl-11 pr-4 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Senha (Mín. 6 Dígitos) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-4 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Crie uma senha segura"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-11 pr-11 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/10"
                      title={showPassword ? "Ocultar senha" : "Ver senha"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Endereço Completo para Entregas */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                  <MapPin className="w-4 h-4 text-[#FE540B]" />
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    Endereço para Entregas <span className="text-xs font-normal text-zinc-400 lowercase">(opcional)</span>
                  </h4>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        CEP {loadingCep && <span className="text-[10px] text-orange-400 lowercase font-normal">(buscando...)</span>}
                      </label>
                      <input
                        type="text"
                        placeholder="00000-000"
                        maxLength={9}
                        value={regCep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        className="w-full px-4 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Número
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 120"
                        value={regNumber}
                        onChange={(e) => setRegNumber(e.target.value)}
                        className="w-full px-4 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Rua / Logradouro
                      </label>
                      <input
                        type="text"
                        placeholder="Rua, Avenida..."
                        value={regStreet}
                        onChange={(e) => setRegStreet(e.target.value)}
                        className="w-full px-4 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Complemento (opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Apto, Bloco, Casa..."
                        value={regComplement}
                        onChange={(e) => setRegComplement(e.target.value)}
                        className="w-full px-4 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Bairro
                      </label>
                      <input
                        type="text"
                        placeholder="Bairro"
                        value={regNeighborhood}
                        onChange={(e) => setRegNeighborhood(e.target.value)}
                        className="w-full px-4 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Cidade
                      </label>
                      <input
                        type="text"
                        placeholder="Cidade"
                        value={regCity}
                        onChange={(e) => setRegCity(e.target.value)}
                        className="w-full px-4 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Estado (UF)
                      </label>
                      <input
                        type="text"
                        placeholder="UF"
                        maxLength={2}
                        value={regState}
                        onChange={(e) => setRegState(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3.5 text-sm sm:text-base text-center uppercase border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit & WhatsApp Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="site-btn-pill w-full sm:w-auto px-8 sm:px-10 py-3.5 text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer font-black"
                  style={{ backgroundColor: brandColor || "#FE540B" }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Salvando dados...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Concluir Cadastro & Acessar</span>
                    </>
                  )}
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-full font-black text-xs sm:text-sm flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <img 
                    src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20BRANCA/Whatsapp%20branco.svg" 
                    alt="WhatsApp" 
                    className="w-4 h-4 object-contain"
                  />
                  <span>Atendimento WhatsApp</span>
                </a>
              </div>
            </form>
          )}
        </div>

        {/* Side Card: Map & Location (Col 8-12) - Idêntico ao Fale com a Gente */}
        <div className="w-full lg:col-span-5 flex flex-col gap-5">
          <div 
            className="p-6 sm:p-8 rounded-[2.5rem] border transition-all duration-300 apple-glass-card border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
                style={{ backgroundColor: brandColor || '#FE540B' }}
              >
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg sm:text-xl font-black text-white">
                  Nossa Localização & Atendimento
                </h4>
                <p className="text-xs text-zinc-400">Atendimento e suporte presencial</p>
              </div>
            </div>

            {companyAddress && (
              <p className="text-xs sm:text-sm font-medium mb-4 leading-relaxed text-zinc-300">
                {companyAddress}
              </p>
            )}

            {companyAddress ? (
              <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 shadow-md relative z-0 mb-4 bg-zinc-900 group/map">
                <iframe
                  title="Localização Comercial"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(companyAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  className="w-full h-full border-0 rounded-2xl pointer-events-none sm:pointer-events-auto"
                  allowFullScreen={false}
                  loading="lazy"
                />
                <div className="sm:hidden absolute inset-0 pointer-events-none flex items-end justify-center p-3">
                  <span className="px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-bold text-white/90 border border-white/15 shadow">
                    📍 Toque no botão abaixo para abrir a rota
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Atendimento online rápido em todo o Maranhão e envio de pedidos com nota fiscal e garantia.
                </p>
              </div>
            )}

            {companyAddress && (
              <a
                href={companyAddressUrl ? companyAddressUrl : `https://maps.google.com/?q=${encodeURIComponent(companyAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white transition-all border border-white/15 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] mb-3"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir no Google Maps</span>
              </a>
            )}

            {/* Direct WhatsApp Assistance Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <img 
                src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20BRANCA/Whatsapp%20branco.svg" 
                alt="WhatsApp" 
                className="w-4 h-4 object-contain"
              />
              <span>Atendimento Direto WhatsApp</span>
            </a>
          </div>

          {/* Commitment / Security Badge (Idêntico ao Fale com a Gente) */}
          <div 
            className="p-5 rounded-2xl bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 flex items-center gap-3.5 text-white/90"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs sm:text-sm font-black text-white">Atendimento Confiável & Dados Seguros</h5>
              <p className="text-xs text-zinc-400">Seus dados e pedidos são protegidos com criptografia e tratados com total prioridade e sigilo.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
