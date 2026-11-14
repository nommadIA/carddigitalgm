import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

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
      className="fixed inset-0 z-[100] flex flex-col items-center justify-start p-3 sm:p-6 sm:py-8 bg-black/80 backdrop-blur-sm overflow-y-auto overscroll-contain gm-customer-modal-overlay"
      onClick={onClose}
    >
      {/* 1. Header: Title & Description */}
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center text-center space-y-3 mb-6 sm:mb-8 pt-3 sm:pt-6 shrink-0 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-0 right-0 sm:right-2 w-8 h-8 rounded-[4px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer z-30"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-sans font-black tracking-tight leading-tight select-none text-white">
          {tab === "login" ? "Área do Cliente" : "Criar sua Conta de Cliente"}
        </h2>
        
        <p className="text-xs sm:text-sm md:text-base font-medium leading-relaxed max-w-2xl text-zinc-300">
          {tab === "login" 
            ? "Acesse para gerenciar seus pedidos, compras e atendimentos personalizados com rapidez e segurança." 
            : "Cadastre-se para comprar com agilidade, acompanhar o status das suas entregas e receber orçamentos exclusivos."}
        </p>
      </div>

      {/* 2. Main Grid: Form + Address/Map */}
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-24 sm:mb-12">
        
        {/* Form Container */}
        <div 
          className={`w-full ${companyAddress ? "lg:col-span-7" : "lg:col-span-8 lg:col-start-3"} bg-[#131315] border border-[#26262A] p-5 sm:p-7 rounded-lg text-white gm-customer-auth-container gm-customer-modal-container transition-colors relative`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Segmented Control - Tab Switcher */}
          <div className="w-full max-w-[320px] mx-auto mb-6 p-1 bg-[#0B0B0C] rounded-md border border-[#26262A] flex flex-row items-center gap-1 h-11 box-border">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className={`flex-1 h-full rounded-[4px] text-xs sm:text-sm font-bold transition-colors cursor-pointer select-none flex items-center justify-center text-center whitespace-nowrap px-3 ${
                tab === "login" 
                  ? "bg-white text-zinc-950 font-extrabold" 
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
              className={`flex-1 h-full rounded-[4px] text-xs sm:text-sm font-bold transition-colors cursor-pointer select-none flex items-center justify-center text-center whitespace-nowrap px-3 ${
                tab === "register" 
                  ? "bg-white text-zinc-950 font-extrabold" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Criar Nova Conta
            </button>
          </div>

          {/* Card Sub-Header */}
          <div className="mb-6 flex items-center gap-3.5 pb-4 border-b border-[#26262A]">
            <div 
              className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 text-white"
              style={{ backgroundColor: brandColor || "#FE540B" }}
            >
              {tab === "register" ? (
                <UserPlus className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white">
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
            <div className="p-3.5 mb-5 rounded-md bg-red-500/15 border border-red-500/30 flex items-center gap-2.5 text-red-300 text-xs sm:text-sm font-bold animate-in shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 mb-5 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs sm:text-sm font-bold animate-in fade-in">
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
                    className="w-full h-11 pl-11 pr-4 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Senha <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Sua senha secreta"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full h-11 pl-11 pr-11 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-[4px] hover:bg-[#1B1B1E]"
                    title={showPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end pt-1.5">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-zinc-400 hover:text-[#FE540B] transition-colors cursor-pointer"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
              </div>

              {/* Submit Action Button */}
              <div className="pt-2 flex justify-start">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 h-11 rounded-[6px] text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer font-black text-white whitespace-nowrap shrink-0 transition-all hover:brightness-110 disabled:opacity-60"
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
                    className="w-full h-11 pl-11 pr-4 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium"
                  />
                </div>
              </div>

              {/* E-mail e WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    E-mail de Acesso <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full h-11 pl-11 pr-4 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    WhatsApp / Telefone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="w-6 h-6 rounded-[4px] bg-[#25D366] flex items-center justify-center absolute left-3 pointer-events-none text-white">
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
                      className="w-full h-11 pl-12 pr-4 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* CPF/CNPJ e Senha */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        CPF / CNPJ <span className="text-[11px] text-zinc-500 font-normal lowercase">(opcional)</span>
                      </label>
                      <div className="relative flex items-center">
                        <FileText className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="000.000.000-00"
                          maxLength={18}
                          value={regCpfCnpj}
                          onChange={(e) => setRegCpfCnpj(formatCpfCnpj(e.target.value))}
                          className="w-full pl-10 pr-4 py-3 text-sm bg-[#0B0B0C] border border-[#26262A] text-white focus:border-[#FE540B] focus:outline-none transition-colors rounded-[4px] font-medium tabular-nums"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Senha (Mín. 6 Dígitos) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="Crie uma senha segura"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-3 text-sm bg-[#0B0B0C] border border-[#26262A] text-white focus:border-[#FE540B] focus:outline-none transition-colors rounded-[4px] font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-[4px] hover:bg-[#1B1B1E]"
                          title={showPassword ? "Ocultar senha" : "Ver senha"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

              {/* Endereço Completo para Entregas */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#26262A]">
                  <MapPin className="w-4 h-4 text-[#FE540B]" />
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    Endereço para Entregas <span className="text-xs font-normal text-zinc-400 lowercase">(opcional)</span>
                  </h4>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        CEP {loadingCep && <span className="text-[11px] text-orange-400 lowercase font-normal">(buscando...)</span>}
                      </label>
                      <input
                        type="text"
                        placeholder="00000-000"
                        maxLength={9}
                        value={regCep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        className="w-full px-3.5 py-3 text-sm bg-[#0B0B0C] border border-[#26262A] text-white focus:border-[#FE540B] focus:outline-none transition-colors rounded-[4px] font-medium tabular-nums"
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
                        className="w-full px-3.5 py-3 text-sm bg-[#0B0B0C] border border-[#26262A] text-white focus:border-[#FE540B] focus:outline-none transition-colors rounded-[4px] font-medium"
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
                        className="w-full px-3.5 py-3 text-sm bg-[#0B0B0C] border border-[#26262A] text-white focus:border-[#FE540B] focus:outline-none transition-colors rounded-[4px] font-medium"
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
                        className="w-full px-3.5 py-3 text-sm bg-[#0B0B0C] border border-[#26262A] text-white focus:border-[#FE540B] focus:outline-none transition-colors rounded-[4px] font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Bairro
                      </label>
                      <input
                        type="text"
                        placeholder="Bairro"
                        value={regNeighborhood}
                        onChange={(e) => setRegNeighborhood(e.target.value)}
                        className="w-full px-3.5 py-3 text-sm bg-[#0B0B0C] border border-[#26262A] text-white focus:border-[#FE540B] focus:outline-none transition-colors rounded-[4px] font-medium"
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
                        className="w-full px-3.5 py-3 text-sm bg-[#0B0B0C] border border-[#26262A] text-white focus:border-[#FE540B] focus:outline-none transition-colors rounded-[4px] font-medium"
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
                        className="w-full px-3.5 py-3 text-sm text-center uppercase bg-[#0B0B0C] border border-[#26262A] text-white focus:border-[#FE540B] focus:outline-none transition-colors rounded-[4px] font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Action Button */}
              <div className="pt-4 flex justify-start">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-7 py-3 rounded-[6px] text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer font-bold text-white transition-opacity hover:opacity-90"
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
              </div>
            </form>
          )}
        </div>

        {/* Side Card: Map & Location */}
        <div className={`w-full ${companyAddress ? "lg:col-span-5" : "lg:col-span-8 lg:col-start-3"} flex flex-col gap-5`}>
          <div 
            className="p-5 sm:p-6 rounded-lg border transition-colors bg-[#131315] border-[#26262A]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-md flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: brandColor || '#FE540B' }}
              >
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-extrabold text-white">
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
              <div className="w-full aspect-[4/3] rounded-md overflow-hidden border border-[#26262A] relative z-0 mb-4 bg-[#0B0B0C] group/map">
                <iframe
                  title="Localização Comercial"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(companyAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  className="w-full h-full border-0 rounded-md pointer-events-none sm:pointer-events-auto"
                  allowFullScreen={false}
                  loading="lazy"
                />
                <div className="sm:hidden absolute inset-0 pointer-events-none flex items-end justify-center p-3">
                  <span className="px-3 py-1 rounded-[4px] bg-[#0B0B0C]/90 text-[11px] font-bold text-white border border-[#26262A]">
                    Toque no botão abaixo para abrir a rota
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-md bg-[#0B0B0C] border border-[#26262A] mb-4">
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
                className="w-full py-2.5 px-4 rounded-[6px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 bg-[#1B1B1E] hover:bg-[#26262A] text-white transition-colors border border-[#26262A] cursor-pointer mb-3"
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
              className="w-full py-2.5 px-4 rounded-[6px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white transition-colors cursor-pointer"
            >
              <img 
                src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20BRANCA/Whatsapp%20branco.svg" 
                alt="WhatsApp" 
                className="w-4 h-4 object-contain"
              />
              <span>Atendimento Direto WhatsApp</span>
            </a>
          </div>

          {/* Commitment / Security Badge */}
          <div 
            className="p-4 rounded-md bg-[#131315] border border-[#26262A] flex items-center gap-3.5 text-white/90"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs sm:text-sm font-extrabold text-white">Atendimento Confiável & Dados Seguros</h5>
              <p className="text-xs text-zinc-400">Seus dados e pedidos são protegidos com criptografia e tratados com total prioridade e sigilo.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
