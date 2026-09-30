import React, { useState } from "react";
import { 
  X, Mail, Lock, User, Phone, MapPin, Eye, EyeOff, 
  CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, FileText, ChevronDown, ChevronUp
} from "lucide-react";
import { signInCustomer, signUpCustomer, lookupViaCep, Customer } from "../../lib/customerService";
import { ADMIN_EMAIL } from "../../constants";

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
  brandColor?: string;
  tenantId?: string;
}

export function CustomerAuthModal({
  isOpen,
  onClose,
  onSuccess,
  brandColor = "#FE540B",
  tenantId = "global",
}: CustomerAuthModalProps) {
  const [tab, setTab] = useState<"login" | "register">("register");
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
  const [showAddressFields, setShowAddressFields] = useState(false);
  const [regCep, setRegCep] = useState("");
  const [regStreet, setRegStreet] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [regComplement, setRegComplement] = useState("");
  const [regNeighborhood, setRegNeighborhood] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regState, setRegState] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);

  // Submit button hover state for identical SitePillButton effect
  const [btnHover, setBtnHover] = useState(false);

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

    const res = await signInCustomer(loginEmail, loginPassword, tenantId);
    setLoading(false);

    if (!res.success || !res.customer) {
      setErrorMessage(res.error || "E-mail ou senha incorretos.");
      return;
    }

    const isLoggingAsAdmin = loginEmail.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() || loginEmail.trim().toLowerCase() === "admin@carddigital.com";
    if (isLoggingAsAdmin) {
      localStorage.setItem("gm_admin_authenticated", "true");
    }

    setSuccessMessage(isLoggingAsAdmin ? "Login de Administrador aprovado! Painel de gestão liberado." : "Login realizado com sucesso!");
    setTimeout(() => {
      onSuccess(res.customer!);
      onClose();
    }, 600);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setErrorMessage("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage("A senha deve conter no mínimo 6 dígitos.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const res = await signUpCustomer({
      full_name: regName,
      email: regEmail,
      password: regPassword,
      phone: regPhone,
      cpf_cnpj: regCpfCnpj,
      address: showAddressFields ? {
        cep: regCep,
        street: regStreet,
        number: regNumber,
        complement: regComplement,
        neighborhood: regNeighborhood,
        city: regCity,
        state: regState,
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

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto gm-customer-modal-overlay"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl sm:max-w-2xl bg-[#0f1016]/98 border border-white/12 rounded-[2.25rem] p-6 sm:p-9 shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative my-auto max-h-[92vh] overflow-y-auto text-white gm-customer-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 sm:top-6 sm:right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer z-10"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header with Badge */}
        <div className="text-center space-y-2 mb-6 sm:mb-8">
          <div 
            className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-lg"
            style={{ 
              backgroundColor: `${brandColor}20`, 
              border: `1px solid ${brandColor}40`,
              boxShadow: `0 8px 24px ${brandColor}25`
            }}
          >
            <User className="w-7 h-7" style={{ color: brandColor }} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {tab === "login" ? "Área do Cliente" : "Criar sua Conta"}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium max-w-md mx-auto leading-relaxed">
            {tab === "login" 
              ? "Acesse para acompanhar pedidos e finalizar compras mais rápido" 
              : "Preencha seus dados para fazer pedidos e comprar no site"}
          </p>
        </div>

        {/* Tab Toggle (Large Rounded Pill) */}
        <div className="p-1.5 bg-black/50 rounded-full border border-white/10 mb-7 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setErrorMessage("");
              setSuccessMessage("");
            }}
            className={`h-12 rounded-full text-xs sm:text-sm font-black transition-all cursor-pointer select-none flex items-center justify-center ${
              tab === "login" 
                ? "bg-white text-zinc-950 shadow-md scale-[1.01]" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Já sou Cliente (Entrar)
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setErrorMessage("");
              setSuccessMessage("");
            }}
            className={`h-12 rounded-full text-xs sm:text-sm font-black transition-all cursor-pointer select-none flex items-center justify-center ${
              tab === "register" 
                ? "bg-white text-zinc-950 shadow-md scale-[1.01]" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Criar Nova Conta
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-4 mb-5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-xs sm:text-sm font-semibold animate-in shake">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 mb-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-xs sm:text-sm font-semibold animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* LOGIN FORM                                                     */}
        {/* ============================================================== */}
        {tab === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider mb-2">
                E-mail de Acesso <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <Mail className="w-5 h-5 text-zinc-500 absolute left-4.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full h-14 pl-13 pr-5 rounded-2xl bg-[#14151e] border border-white/12 text-white placeholder-zinc-500 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#FE540B] focus:ring-2 focus:ring-[#FE540B]/25 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider mb-2">
                Senha <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <Lock className="w-5 h-5 text-zinc-500 absolute left-4.5 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Sua senha secreta"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full h-14 pl-13 pr-13 rounded-2xl bg-[#14151e] border border-white/12 text-white placeholder-zinc-500 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#FE540B] focus:ring-2 focus:ring-[#FE540B]/25 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/5"
                  title={showPassword ? "Ocultar senha" : "Ver senha"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              className="w-full h-14 sm:h-15 rounded-full font-black text-base sm:text-lg tracking-wide transition-all duration-200 shadow-xl cursor-pointer flex items-center justify-center gap-2.5 mt-6 border-0 select-none"
              style={{
                backgroundColor: btnHover ? "#FFFFFF" : brandColor,
                color: btnHover ? brandColor : "#FFFFFF",
                boxShadow: btnHover 
                  ? "0 8px 25px rgba(255,255,255,0.3)" 
                  : `0 6px 22px ${brandColor}40`,
                transform: btnHover ? "scale(1.01)" : "none",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Acessando...</span>
                </>
              ) : (
                <>
                  <span>Entrar na Área do Cliente</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ============================================================== */}
        {/* REGISTER FORM                                                  */}
        {/* ============================================================== */}
        {tab === "register" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4 sm:space-y-5">
            {/* Nome Completo (100% de largura para máximo conforto) */}
            <div>
              <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider mb-2">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <User className="w-5 h-5 text-zinc-500 absolute left-4.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Denis Silva"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full h-14 pl-13 pr-5 rounded-2xl bg-[#14151e] border border-white/12 text-white placeholder-zinc-500 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#FE540B] focus:ring-2 focus:ring-[#FE540B]/25 transition-all"
                />
              </div>
            </div>

            {/* E-mail (100% de largura para caber qualquer e-mail sem cortar) */}
            <div>
              <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider mb-2">
                E-mail <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <Mail className="w-5 h-5 text-zinc-500 absolute left-4.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full h-14 pl-13 pr-5 rounded-2xl bg-[#14151e] border border-white/12 text-white placeholder-zinc-500 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#FE540B] focus:ring-2 focus:ring-[#FE540B]/25 transition-all"
                />
              </div>
            </div>

            {/* WhatsApp e CPF/CNPJ lado a lado com espaçamento generoso */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider mb-2">
                  WhatsApp / Celular
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-5 h-5 text-zinc-500 absolute left-4.5 pointer-events-none" />
                  <input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full h-14 pl-13 pr-5 rounded-2xl bg-[#14151e] border border-white/12 text-white placeholder-zinc-500 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#FE540B] focus:ring-2 focus:ring-[#FE540B]/25 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider mb-2">
                  CPF / CNPJ <span className="text-[10px] text-zinc-500 font-normal lowercase">(opcional)</span>
                </label>
                <div className="relative flex items-center">
                  <FileText className="w-5 h-5 text-zinc-500 absolute left-4.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={regCpfCnpj}
                    onChange={(e) => setRegCpfCnpj(e.target.value)}
                    className="w-full h-14 pl-13 pr-5 rounded-2xl bg-[#14151e] border border-white/12 text-white placeholder-zinc-500 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#FE540B] focus:ring-2 focus:ring-[#FE540B]/25 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Senha (100% de largura) */}
            <div>
              <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider mb-2">
                Senha de Acesso (Mínimo 6 Dígitos) <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <Lock className="w-5 h-5 text-zinc-500 absolute left-4.5 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Crie uma senha segura"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full h-14 pl-13 pr-13 rounded-2xl bg-[#14151e] border border-white/12 text-white placeholder-zinc-500 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#FE540B] focus:ring-2 focus:ring-[#FE540B]/25 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/5"
                  title={showPassword ? "Ocultar senha" : "Ver senha"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Card de Expansão de Endereço */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAddressFields(!showAddressFields)}
                className="w-full p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-xs sm:text-sm font-bold text-zinc-300 hover:text-white flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4" style={{ color: brandColor }} />
                  <span>Cadastrar endereço de entrega (opcional)</span>
                </div>
                {showAddressFields ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </button>
            </div>

            {showAddressFields && (
              <div className="space-y-3.5 p-5 rounded-3xl bg-black/40 border border-white/10 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                      CEP {loadingCep && <span className="text-[10px] text-orange-400 lowercase font-normal">(buscando...)</span>}
                    </label>
                    <input
                      type="text"
                      placeholder="00000-000"
                      maxLength={9}
                      value={regCep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl bg-[#14151e] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#FE540B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Número
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 120"
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl bg-[#14151e] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#FE540B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Rua / Logradouro
                  </label>
                  <input
                    type="text"
                    placeholder="Rua, Avenida..."
                    value={regStreet}
                    onChange={(e) => setRegStreet(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-[#14151e] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#FE540B]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Bairro
                    </label>
                    <input
                      type="text"
                      placeholder="Bairro"
                      value={regNeighborhood}
                      onChange={(e) => setRegNeighborhood(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl bg-[#14151e] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#FE540B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Cidade / UF
                    </label>
                    <input
                      type="text"
                      placeholder="Cidade - UF"
                      value={regCity ? `${regCity}${regState ? ` / ${regState}` : ""}` : ""}
                      onChange={(e) => setRegCity(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl bg-[#14151e] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#FE540B]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button (Identical to SitePillButton in style, size and hover) */}
            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              className="w-full h-14 sm:h-15 rounded-full font-black text-base sm:text-lg tracking-wide transition-all duration-200 shadow-xl cursor-pointer flex items-center justify-center gap-2.5 mt-6 border-0 select-none"
              style={{
                backgroundColor: btnHover ? "#FFFFFF" : brandColor,
                color: btnHover ? brandColor : "#FFFFFF",
                boxShadow: btnHover 
                  ? "0 8px 25px rgba(255,255,255,0.3)" 
                  : `0 6px 22px ${brandColor}40`,
                transform: btnHover ? "scale(1.01)" : "none",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Criando Conta...</span>
                </>
              ) : (
                <>
                  <span>Concluir Cadastro & Acessar</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
