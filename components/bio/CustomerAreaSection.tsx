import React, { useState, useEffect } from "react";
import { 
  User, UserPlus, Mail, Lock, Phone, FileText, MapPin, Eye, EyeOff, 
  CheckCircle2, AlertCircle, Loader2, Send, ExternalLink, ShoppingBag, 
  Clock, CreditCard, Copy, Check, ChevronUp, ChevronDown, Sparkles, MessageCircle, LogOut, ArrowRight, ShieldCheck
} from "lucide-react";
import { 
  Customer, 
  CustomerOrder, 
  signInCustomer, 
  signUpCustomer, 
  fetchCustomerOrders, 
  updateCustomerProfile, 
  signOutCustomer, 
  lookupViaCep 
} from "../../lib/customerService";
import { supabase } from "../../lib/supabase";
import { ADMIN_EMAIL } from "../../constants";

interface CustomerAreaSectionProps {
  currentCustomer: Customer | null;
  onCustomerUpdated: (customer: Customer) => void;
  onCustomerAuthSuccess: (customer: Customer) => void;
  onLogout: () => void;
  brandColor?: string;
  theme?: string;
  isWebsiteLayout?: boolean;
  companyAddress?: string;
  companyAddressUrl?: string;
  companyWhatsapp?: string;
  companyName?: string;
  companyEmail?: string;
  pixKey?: string;
  pixType?: string;
  cardUrl?: string;
  tenantId?: string;
  isAdmin?: boolean;
  onOpenAdminOrders?: () => void;
  onSelectPaymentOrder?: (order: CustomerOrder) => void;
}

export function CustomerAreaSection({
  currentCustomer,
  onCustomerUpdated,
  onCustomerAuthSuccess,
  onLogout,
  brandColor = "#FE540B",
  theme = "dark",
  isWebsiteLayout = true,
  companyAddress,
  companyAddressUrl,
  companyWhatsapp = "98987505041",
  companyName = "GM Edificação",
  companyEmail = "gmedificacao@gmail.com",
  pixKey,
  pixType,
  cardUrl,
  tenantId = "global",
  isAdmin = false,
  onOpenAdminOrders,
  onSelectPaymentOrder,
}: CustomerAreaSectionProps) {
  // Auth Tab (when logged out)
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCpfCnpj, setRegCpfCnpj] = useState("");
  const [regCep, setRegCep] = useState("");
  const [regStreet, setRegStreet] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [regComplement, setRegComplement] = useState("");
  const [regNeighborhood, setRegNeighborhood] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regState, setRegState] = useState("");
  const [regLoadingCep, setRegLoadingCep] = useState(false);

  // Dashboard state (when logged in)
  const [dashboardTab, setDashboardTab] = useState<"orders" | "profile">("orders");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);

  // Edit profile state
  const [editName, setEditName] = useState(currentCustomer?.full_name || "");
  const [editPhone, setEditPhone] = useState(currentCustomer?.phone || "");
  const [editCpfCnpj, setEditCpfCnpj] = useState(currentCustomer?.cpf_cnpj || "");
  const [editCep, setEditCep] = useState(currentCustomer?.cep || "");
  const [editStreet, setEditStreet] = useState(currentCustomer?.street || "");
  const [editNumber, setEditNumber] = useState(currentCustomer?.number || "");
  const [editComplement, setEditComplement] = useState(currentCustomer?.complement || "");
  const [editNeighborhood, setEditNeighborhood] = useState(currentCustomer?.neighborhood || "");
  const [editCity, setEditCity] = useState(currentCustomer?.city || "");
  const [editState, setEditState] = useState(currentCustomer?.state || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [editLoadingCep, setEditLoadingCep] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Masks
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

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  // Sync profile when currentCustomer changes
  useEffect(() => {
    if (currentCustomer?.id) {
      loadOrders(currentCustomer.id);
      setEditName(currentCustomer.full_name || "");
      setEditPhone(currentCustomer.phone || "");
      setEditCpfCnpj(currentCustomer.cpf_cnpj || "");
      setEditCep(currentCustomer.cep || "");
      setEditStreet(currentCustomer.street || "");
      setEditNumber(currentCustomer.number || "");
      setEditComplement(currentCustomer.complement || "");
      setEditNeighborhood(currentCustomer.neighborhood || "");
      setEditCity(currentCustomer.city || "");
      setEditState(currentCustomer.state || "");
    }
  }, [currentCustomer]);

  const loadOrders = async (customerId: string) => {
    setLoadingOrders(true);
    const list = await fetchCustomerOrders(customerId);
    setOrders(list);
    setLoadingOrders(false);
    if (list.length > 0 && !expandedOrderId) {
      setExpandedOrderId(list[0].id);
    }
  };

  // CEP Handlers
  const handleRegCepChange = async (cepInput: string) => {
    setRegCep(cepInput);
    const clean = cepInput.replace(/\D/g, "");
    if (clean.length === 8) {
      setRegLoadingCep(true);
      const res = await lookupViaCep(clean);
      setRegLoadingCep(false);
      if (res) {
        setRegStreet(res.street || "");
        setRegNeighborhood(res.neighborhood || "");
        setRegCity(res.city || "");
        setRegState(res.state || "");
      }
    }
  };

  const handleEditCepChange = async (cepInput: string) => {
    setEditCep(cepInput);
    const clean = cepInput.replace(/\D/g, "");
    if (clean.length === 8) {
      setEditLoadingCep(true);
      const res = await lookupViaCep(clean);
      setEditLoadingCep(false);
      if (res) {
        setEditStreet(res.street || "");
        setEditNeighborhood(res.neighborhood || "");
        setEditCity(res.city || "");
        setEditState(res.state || "");
      }
    }
  };

  // Auth Handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setAuthError("Por favor, preencha seu e-mail e senha.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");

    const res = await signInCustomer(loginEmail.trim(), loginPassword);
    setAuthLoading(false);

    if (!res.success || !res.customer) {
      setAuthError(res.error || "E-mail ou senha incorretos.");
      return;
    }

    const cleanInputEmail = loginEmail.trim().toLowerCase();
    const cleanAdminEmail = (ADMIN_EMAIL || "gmedificacao@gmail.com").trim().toLowerCase();
    const isLoggingAsAdmin = cleanInputEmail === cleanAdminEmail || !!res.customer?.is_admin;

    if (isLoggingAsAdmin) {
      localStorage.setItem("gm_admin_authenticated", "true");
    }

    setAuthSuccess("Login realizado com sucesso!");
    setTimeout(() => {
      onCustomerAuthSuccess(res.customer!);
    }, 400);
  };

  const handleForgotPassword = async () => {
    if (!loginEmail.trim()) {
      setAuthError("Digite seu e-mail acima para recuperar sua senha.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail.trim(), {
        redirectTo: window.location.origin,
      });
      setAuthLoading(false);
      if (error) {
        setAuthError(error.message);
      } else {
        setAuthSuccess("Link de redefinição de senha enviado para o seu e-mail!");
      }
    } catch {
      setAuthLoading(false);
      setAuthError("Não foi possível enviar o link. Tente novamente.");
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword || !regPhone.trim()) {
      setAuthError("Por favor, preencha nome, e-mail, WhatsApp e crie uma senha.");
      return;
    }

    if (regPassword.length < 6) {
      setAuthError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");

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

    setAuthLoading(false);

    if (!res.success || !res.customer) {
      setAuthError(res.error || "Não foi possível criar sua conta. Verifique os dados.");
      return;
    }

    setAuthSuccess("Conta criada com sucesso! Seja bem-vindo(a).");
    setTimeout(() => {
      onCustomerAuthSuccess(res.customer!);
    }, 500);
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer?.id) return;
    if (!editName.trim()) {
      setProfileMsg({ type: "error", text: "Informe seu nome completo." });
      return;
    }

    setSavingProfile(true);
    setProfileMsg(null);

    const res = await updateCustomerProfile(currentCustomer.id, {
      full_name: editName.trim(),
      phone: editPhone.trim() || null,
      cpf_cnpj: editCpfCnpj.trim() || null,
      cep: editCep.trim() || null,
      street: editStreet.trim() || null,
      number: editNumber.trim() || null,
      complement: editComplement.trim() || null,
      neighborhood: editNeighborhood.trim() || null,
      city: editCity.trim() || null,
      state: editState.trim() || null,
    });

    setSavingProfile(false);

    if (res.success && res.customer) {
      setProfileMsg({ type: "success", text: "Dados atualizados com sucesso!" });
      onCustomerUpdated(res.customer);
      setTimeout(() => setProfileMsg(null), 4000);
    } else {
      setProfileMsg({ type: "error", text: res.error || "Não foi possível atualizar os dados." });
    }
  };

  const handleCopyPix = (orderId: string, keyVal: string) => {
    if (!keyVal) return;
    navigator.clipboard.writeText(keyVal);
    setCopiedPixId(orderId);
    setTimeout(() => setCopiedPixId(null), 3000);
  };

  const handleOpenWhatsAppOrder = (order: CustomerOrder) => {
    const cleanPhone = (companyWhatsapp || "98987505041").replace(/\D/g, "");
    const msg = `Olá! Sou ${currentCustomer?.full_name || 'cliente'}, gostaria de saber mais sobre o meu pedido #${order.order_number} no valor de ${formatBRL(order.total)}.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const cleanWhatsapp = (companyWhatsapp || "98987505041").replace(/\D/g, "");
  const generalWhatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
    currentCustomer 
      ? `Olá! Sou ${currentCustomer.full_name}, cliente da GM Edificação, e gostaria de atendimento.`
      : "Olá! Gostaria de informações sobre o atendimento e pedidos na GM Edificação."
  )}`;

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "preparando":
        return <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">Em Preparo</span>;
      case "enviado":
        return <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">Enviado / A Caminho</span>;
      case "entregue":
        return <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Entregue / Concluído</span>;
      case "cancelado":
        return <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">Cancelado</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">Aguardando Confirmação</span>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="px-2.5 py-0.5 rounded-[4px] text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Pago
          </span>
        );
      case "in_process":
        return (
          <span className="px-2.5 py-0.5 rounded-[4px] text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Em Análise
          </span>
        );
      case "failed":
      case "rejected":
        return (
          <span className="px-2.5 py-0.5 rounded-[4px] text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Não Aprovado
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-[4px] text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Aguardando Pagamento
          </span>
        );
    }
  };

  return (
    <div id="customer-section" className="w-full max-w-5xl mx-auto px-6 sm:px-10 md:px-16 lg:px-24 flex flex-col items-center gap-8 sm:gap-12 shrink-0 pb-28 sm:pb-36">
      
      {/* 1. Header: Title & Description */}
      <div className="w-full flex flex-col items-center text-center space-y-3 max-w-2xl mx-auto px-2">
        <h2 className={`text-2xl sm:text-3xl md:text-4xl font-sans font-black tracking-tight leading-tight select-none ${isWebsiteLayout || theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>
          {currentCustomer ? `Área do Cliente` : authTab === "login" ? "Área do Cliente" : "Criar sua Conta de Cliente"}
        </h2>
        
        <p className={`text-xs sm:text-sm md:text-base font-medium leading-relaxed max-w-2xl ${isWebsiteLayout || theme === 'dark' || theme === 'glass' ? 'text-zinc-300' : 'text-slate-600'}`}>
          {currentCustomer 
            ? `Olá, ${currentCustomer.full_name.split(' ')[0]}! Acompanhe o andamento dos seus pedidos, atualize seus dados de entrega e tenha atendimento prioritário com nossa equipe.`
            : authTab === "login"
              ? "Acesse para gerenciar seus pedidos, compras e atendimentos personalizados com rapidez e segurança."
              : "Cadastre-se para comprar com agilidade, acompanhar o status das suas entregas e receber orçamentos exclusivos."}
        </p>
      </div>

      {/* 2. Container Vertical */}
      <div className="w-full max-w-[660px] mx-auto flex flex-col items-center gap-8 sm:gap-10">
        
        {/* Main Content Container */}
        <div className={`w-full transition-all duration-300 ${
          isWebsiteLayout || theme === 'glass' || theme === 'dark'
            ? 'bg-[#131315] border border-[#26262A] p-6 sm:p-8 rounded-lg shadow-2xl'
            : 'p-6 sm:p-8 rounded-lg border border-zinc-200 bg-white shadow-lg'
        }`}>

          {currentCustomer ? (
            <div className="space-y-6">
              {isAdmin && onOpenAdminOrders && (
                <div className="p-4 rounded-md bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[6px] bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-amber-200">Acesso Administrativo Liberado</h4>
                      <p className="text-xs text-zinc-300">Acesse o painel completo de gestão de pedidos, estoque e site.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenAdminOrders}
                    className="px-4 h-9 rounded-[6px] text-xs font-black text-black bg-amber-400 hover:bg-amber-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <span>Painel Admin</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Segmented Control - Dashboard Tabs */}
              <div className="w-full max-w-[340px] mx-auto p-1 bg-[#0B0B0C] rounded-md border border-[#26262A] flex flex-row items-center gap-1 h-11 box-border">
                <button
                  type="button"
                  onClick={() => setDashboardTab("orders")}
                  className={`flex-1 h-full rounded-[4px] text-xs sm:text-sm font-bold transition-colors cursor-pointer select-none flex items-center justify-center gap-1.5 text-center whitespace-nowrap px-3 ${
                    dashboardTab === "orders" 
                      ? "bg-white text-zinc-950 font-black" 
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span className="tabular-nums">Pedidos ({orders.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDashboardTab("profile")}
                  className={`flex-1 h-full rounded-[4px] text-xs sm:text-sm font-bold transition-colors cursor-pointer select-none flex items-center justify-center gap-1.5 text-center whitespace-nowrap px-3 ${
                    dashboardTab === "profile" 
                      ? "bg-white text-zinc-950 font-black" 
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Meus Dados</span>
                </button>
              </div>

              {/* Subheader */}
              <div className="flex items-center justify-between pb-4 border-b border-[#26262A]">
                <div className="flex items-center gap-3.5">
                  <div 
                    className="w-10 h-10 rounded-[6px] flex items-center justify-center shrink-0 border border-white/15 text-white"
                    style={{ backgroundColor: brandColor || "#FE540B" }}
                  >
                    {dashboardTab === "orders" ? (
                      <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
                    ) : (
                      <User className="w-5 h-5 stroke-[2.2]" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white">
                      {dashboardTab === "orders" ? "Histórico de Compras & Pedidos" : "Dados Cadastrais & Endereço"}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400">
                      {dashboardTab === "orders" 
                        ? "Acompanhe entregas, notas fiscais e comprovantes em tempo real." 
                        : "Atualize seu endereço para agilizar o envio dos seus pedidos."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3 h-8 rounded-[6px] text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                  title="Sair da Conta"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>

              {/* TAB 1: ORDERS */}
              {dashboardTab === "orders" && (
                <div className="space-y-4">
                  {loadingOrders ? (
                    <div className="py-14 flex flex-col items-center justify-center gap-3 text-zinc-400">
                      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                      <span className="text-sm font-semibold">Carregando seus pedidos...</span>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="py-12 text-center space-y-4">
                      <div className="w-14 h-14 rounded-md bg-[#0B0B0C] border border-[#26262A] flex items-center justify-center mx-auto text-zinc-500">
                        <ShoppingBag className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white">Nenhum pedido realizado ainda</h4>
                        <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
                          Navegue pelos produtos no catálogo do site e faça seu primeiro pedido com entrega rápida!
                        </p>
                      </div>
                      <a
                        href="#catalog-section"
                        className="px-6 h-11 rounded-[6px] text-xs uppercase tracking-wider cursor-pointer font-black text-white inline-flex items-center gap-2 mt-2 whitespace-nowrap shrink-0 transition-all hover:brightness-110"
                        style={{ backgroundColor: brandColor || "#FE540B" }}
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Ver Catálogo de Produtos</span>
                      </a>
                    </div>
                  ) : (
                    orders.map((order) => {
                      const isExpanded = expandedOrderId === order.id;
                      return (
                        <div 
                          key={order.id} 
                          className="p-4 sm:p-5 rounded-md bg-[#0B0B0C] border border-[#26262A] hover:border-[#3F3F46] transition-colors space-y-4"
                        >
                          <div 
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          >
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-base sm:text-lg font-black text-white tabular-nums">
                                  Pedido #{order.order_number}
                                </span>
                                {getOrderStatusBadge(order.order_status)}
                                {getPaymentStatusBadge(order.payment_status)}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-zinc-400 font-medium tabular-nums">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                  {formatDate(order.created_at)}
                                </span>
                                <span>•</span>
                                <span>{order.items?.length || 0} item(ns)</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#26262A]">
                              <div className="text-right">
                                <span className="text-[11px] uppercase font-bold text-zinc-400 block tracking-wider">Total</span>
                                <span className="text-lg sm:text-xl font-black tabular-nums" style={{ color: brandColor }}>
                                  {formatBRL(order.total)}
                                </span>
                              </div>
                              <div className="w-8 h-8 rounded-[4px] bg-[#131315] border border-[#26262A] flex items-center justify-center text-zinc-400">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="pt-4 border-t border-[#26262A] space-y-4 animate-in fade-in duration-200">
                              <div className="space-y-2">
                                <span className="text-[11px] font-black text-zinc-300 uppercase tracking-wider block">
                                  Itens do Pedido:
                                </span>
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                  {(order.items || []).map((it, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-md bg-[#131315] border border-[#26262A] text-xs sm:text-sm">
                                      <div className="flex items-center gap-3 min-w-0">
                                        {it.image_url ? (
                                          <img src={it.image_url} alt={it.name} className="w-11 h-11 rounded-[4px] object-cover shrink-0 border border-[#26262A]" />
                                        ) : (
                                          <div className="w-11 h-11 rounded-[4px] bg-[#1B1B1E] flex items-center justify-center shrink-0 text-zinc-400">
                                            <ShoppingBag className="w-5 h-5" />
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <p className="font-bold text-white truncate max-w-[220px] sm:max-w-xs">{it.name}</p>
                                          <p className="text-xs text-zinc-400 mt-0.5 tabular-nums">
                                            Quantidade: <strong>{it.quantity}</strong> {it.selectedOption?.quantity ? `(${it.selectedOption.quantity})` : ""}
                                          </p>
                                        </div>
                                      </div>
                                      <span className="font-black text-white shrink-0 text-sm tabular-nums">
                                        {formatBRL(Number(it.price) * it.quantity)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {order.shipping_address && (
                                <div className="p-3.5 rounded-md bg-[#131315] border border-[#26262A] text-xs sm:text-sm space-y-1">
                                  <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-red-400" /> Endereço de Entrega:
                                  </span>
                                  <p className="text-zinc-400 leading-relaxed">
                                    {typeof order.shipping_address === "string" 
                                      ? order.shipping_address 
                                      : `${order.shipping_address.street || ""} ${order.shipping_address.number ? `Nº ${order.shipping_address.number}` : ""} ${order.shipping_address.neighborhood || ""} - ${order.shipping_address.city || ""}`.trim() || "Retirar no local / A combinar"}
                                  </p>
                                </div>
                              )}

                              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#26262A]">
                                {onSelectPaymentOrder && (
                                  <button
                                    type="button"
                                    onClick={() => onSelectPaymentOrder(order)}
                                    className="px-4 h-9 rounded-[6px] text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer font-black text-white whitespace-nowrap shrink-0 transition-all hover:brightness-110"
                                    style={{ backgroundColor: brandColor || "#FE540B" }}
                                  >
                                    <CreditCard className="w-4 h-4" />
                                    <span>
                                      {order.payment_status === "paid" 
                                        ? "Detalhes do Pagamento" 
                                        : "Pagar Agora / Comprovante"}
                                    </span>
                                  </button>
                                )}

                                {pixKey && order.payment_status === "pending" && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPix(order.id, pixKey)}
                                    className="px-4 h-9 rounded-[6px] text-xs font-black bg-[#1B1B1E] hover:bg-[#26262A] text-white flex items-center gap-2 transition-colors cursor-pointer border border-[#26262A] whitespace-nowrap shrink-0"
                                  >
                                    {copiedPixId === order.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                    <span>{copiedPixId === order.id ? "Pix Copiado!" : "Copiar Chave Pix"}</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleOpenWhatsAppOrder(order)}
                                  className="px-4 h-9 rounded-[6px] text-xs font-black bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                >
                                  <img 
                                    src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20BRANCA/Whatsapp%20branco.svg" 
                                    alt="WhatsApp" 
                                    className="w-3.5 h-3.5 object-contain"
                                  />
                                  <span>WhatsApp</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 2: PROFILE */}
              {dashboardTab === "profile" && (
                <form onSubmit={handleSaveProfile} className="space-y-4 sm:space-y-5">
                  {profileMsg && (
                    <div className={`p-3.5 rounded-md flex items-center gap-2.5 text-xs sm:text-sm font-bold border ${
                      profileMsg.type === "success" 
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        : "bg-red-500/15 border-red-500/30 text-red-300"
                    }`}>
                      {profileMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      <span>{profileMsg.text}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Nome Completo <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        WhatsApp / Telefone
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
                          maxLength={15}
                          value={editPhone}
                          onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                          placeholder="(98) 98750-5041"
                          className="w-full h-11 pl-12 pr-4 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium tabular-nums"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        CPF / CNPJ
                      </label>
                      <div className="relative flex items-center">
                        <FileText className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          maxLength={18}
                          value={editCpfCnpj}
                          onChange={(e) => setEditCpfCnpj(formatCpfCnpj(e.target.value))}
                          placeholder="000.000.000-00"
                          className="w-full h-11 pl-11 pr-4 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium tabular-nums"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="pt-2">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#26262A]">
                      <MapPin className="w-4 h-4 text-[#FE540B]" />
                      <h4 className="text-sm font-bold text-white tracking-wide">
                        Endereço de Entrega Padrão
                      </h4>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                            CEP {editLoadingCep && <span className="text-[11px] text-orange-400 lowercase font-normal">(buscando...)</span>}
                          </label>
                          <input
                            type="text"
                            value={editCep}
                            maxLength={9}
                            onChange={(e) => handleEditCepChange(e.target.value)}
                            placeholder="00000-000"
                            className="w-full h-11 px-3.5 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Número
                          </label>
                          <input
                            type="text"
                            value={editNumber}
                            onChange={(e) => setEditNumber(e.target.value)}
                            placeholder="Ex: 120"
                            className="w-full h-11 px-3.5 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Rua / Logradouro
                          </label>
                          <input
                            type="text"
                            value={editStreet}
                            onChange={(e) => setEditStreet(e.target.value)}
                            placeholder="Rua, Avenida..."
                            className="w-full h-11 px-3.5 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Complemento
                          </label>
                          <input
                            type="text"
                            value={editComplement}
                            onChange={(e) => setEditComplement(e.target.value)}
                            placeholder="Apto, Bloco, Casa..."
                            className="w-full h-11 px-3.5 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Bairro
                          </label>
                          <input
                            type="text"
                            value={editNeighborhood}
                            onChange={(e) => setEditNeighborhood(e.target.value)}
                            placeholder="Bairro"
                            className="w-full h-11 px-3.5 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Cidade
                          </label>
                          <input
                            type="text"
                            value={editCity}
                            onChange={(e) => setEditCity(e.target.value)}
                            placeholder="Cidade"
                            className="w-full h-11 px-3.5 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Estado (UF)
                          </label>
                          <input
                            type="text"
                            value={editState}
                            maxLength={2}
                            onChange={(e) => setEditState(e.target.value.toUpperCase())}
                            placeholder="UF"
                            className="w-full h-11 px-3.5 text-sm text-center uppercase bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="w-full sm:w-auto px-6 h-11 rounded-[6px] text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer font-black text-white whitespace-nowrap shrink-0 transition-all hover:brightness-110 disabled:opacity-60"
                      style={{ backgroundColor: brandColor || "#FE540B" }}
                    >
                      {savingProfile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Salvar Alterações</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* USER LOGGED OUT: LOGIN & REGISTER FORMS */
            <div className="space-y-6">
              {/* Segmented Control - Tab Switcher */}
              <div className="w-full max-w-[320px] mx-auto p-1 bg-[#0B0B0C] rounded-md border border-[#26262A] flex flex-row items-center gap-1 h-11 box-border">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("login");
                    setAuthError("");
                    setAuthSuccess("");
                  }}
                  className={`flex-1 h-full rounded-[4px] text-xs sm:text-sm font-bold transition-colors cursor-pointer select-none flex items-center justify-center text-center whitespace-nowrap px-3 ${
                    authTab === "login" 
                      ? "bg-white text-zinc-950 font-black" 
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Já sou Cliente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("register");
                    setAuthError("");
                    setAuthSuccess("");
                  }}
                  className={`flex-1 h-full rounded-[4px] text-xs sm:text-sm font-bold transition-colors cursor-pointer select-none flex items-center justify-center text-center whitespace-nowrap px-3 ${
                    authTab === "register" 
                      ? "bg-white text-zinc-950 font-black" 
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Criar Nova Conta
                </button>
              </div>

              {/* Subheader */}
              <div className="mb-6 flex items-center gap-3.5 pb-4 border-b border-[#26262A]">
                <div 
                  className="w-10 h-10 rounded-[6px] flex items-center justify-center shrink-0 border border-white/15 text-white"
                  style={{ backgroundColor: brandColor || "#FE540B" }}
                >
                  {authTab === "register" ? (
                    <UserPlus className="w-5 h-5 stroke-[2.2]" />
                  ) : (
                    <User className="w-5 h-5 stroke-[2.2]" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    {authTab === "login" ? "Acesse sua Conta" : "Dados para Cadastro"}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400">
                    {authTab === "login" 
                      ? "Preencha suas credenciais para gerenciar pedidos e dados." 
                      : "Preencha suas informações para agilizar suas compras e pedidos."}
                  </p>
                </div>
              </div>

              {/* Feedback Messages */}
              {authError && (
                <div className="p-3.5 rounded-md bg-red-500/15 border border-red-500/30 flex items-center gap-2.5 text-red-300 text-xs sm:text-sm font-bold animate-in shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="p-3.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs sm:text-sm font-bold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{authSuccess}</span>
                </div>
              )}

              {/* LOGIN FORM */}
              {authTab === "login" && (
                <form onSubmit={handleLoginSubmit} className="space-y-4 sm:space-y-5">
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

                  <div className="pt-2 flex justify-start">
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full sm:w-auto px-6 h-11 rounded-[6px] text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer font-black text-white whitespace-nowrap shrink-0 transition-all hover:brightness-110 disabled:opacity-60"
                      style={{ backgroundColor: brandColor || "#FE540B" }}
                    >
                      {authLoading ? (
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

              {/* REGISTER FORM */}
              {authTab === "register" && (
                <form onSubmit={handleRegisterSubmit} className="space-y-4 sm:space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Seu Nome Completo <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
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
                          className="w-full h-11 pl-11 pr-4 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium tabular-nums"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
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
                    </div>
                  </div>

                  {/* Endereço Completo */}
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
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                            CEP {regLoadingCep && <span className="text-[11px] text-orange-400 lowercase font-normal">(buscando...)</span>}
                          </label>
                          <input
                            type="text"
                            placeholder="00000-000"
                            maxLength={9}
                            value={regCep}
                            onChange={(e) => handleRegCepChange(e.target.value)}
                            className="w-full h-11 px-3.5 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Número
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: 120"
                            value={regNumber}
                            onChange={(e) => setRegNumber(e.target.value)}
                            className="w-full h-11 px-3.5 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Rua / Logradouro
                          </label>
                          <input
                            type="text"
                            placeholder="Rua, Avenida..."
                            value={regStreet}
                            onChange={(e) => setRegStreet(e.target.value)}
                            className="w-full h-11 px-3.5 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Complemento
                          </label>
                          <input
                            type="text"
                            placeholder="Apto, Bloco, Casa..."
                            value={regComplement}
                            onChange={(e) => setRegComplement(e.target.value)}
                            className="w-full h-11 px-3.5 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Bairro
                          </label>
                          <input
                            type="text"
                            placeholder="Bairro"
                            value={regNeighborhood}
                            onChange={(e) => setRegNeighborhood(e.target.value)}
                            className="w-full h-11 px-3.5 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Cidade
                          </label>
                          <input
                            type="text"
                            placeholder="Cidade"
                            value={regCity}
                            onChange={(e) => setRegCity(e.target.value)}
                            className="w-full h-11 px-3.5 text-sm bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Estado (UF)
                          </label>
                          <input
                            type="text"
                            placeholder="UF"
                            maxLength={2}
                            value={regState}
                            onChange={(e) => setRegState(e.target.value.toUpperCase())}
                            className="w-full h-11 px-3.5 text-sm text-center uppercase bg-[#0B0B0C] border border-[#26262A] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FE540B] transition-colors rounded-[4px] font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-start">
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full sm:w-auto px-6 h-11 rounded-[6px] text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer font-black text-white whitespace-nowrap shrink-0 transition-all hover:brightness-110 disabled:opacity-60"
                      style={{ backgroundColor: brandColor || "#FE540B" }}
                    >
                      {authLoading ? (
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
          )}
        </div>

        {/* Card: Nossa Localização & Atendimento */}
        <div id="customer-location-card" className="w-full flex flex-col gap-5">
          <div className={`p-6 sm:p-8 rounded-lg border transition-all duration-300 ${
            isWebsiteLayout || theme === 'glass' || theme === 'dark'
              ? 'bg-[#131315] border-[#26262A] shadow-2xl'
              : 'border-zinc-200 bg-white shadow-lg'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-[6px] flex items-center justify-center text-white shrink-0 border border-white/15"
                style={{ backgroundColor: brandColor || '#FE540B' }}
              >
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className={`text-lg sm:text-xl font-black ${isWebsiteLayout || theme === 'dark' || theme === 'glass' ? 'text-white' : 'text-slate-900'}`}>
                  Nossa Localização & Atendimento
                </h4>
                <p className="text-xs text-zinc-400">Venha nos fazer uma visita</p>
              </div>
            </div>

            {companyAddress && (
              <p className={`text-xs sm:text-sm font-medium mb-4 leading-relaxed ${isWebsiteLayout || theme === 'dark' || theme === 'glass' ? 'text-zinc-300' : 'text-slate-700'}`}>
                {companyAddress}
              </p>
            )}

            {companyAddress ? (
              <div className="w-full aspect-[16/9] sm:aspect-[2.2/1] min-h-[220px] max-h-[380px] rounded-md overflow-hidden border border-[#26262A] relative z-0 mb-4 bg-[#0B0B0C] group/map">
                <iframe
                  title="Localização Comercial"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(companyAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  className="w-full h-full border-0 pointer-events-none sm:pointer-events-auto"
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
                className="w-full h-11 px-4 rounded-[6px] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 bg-[#1B1B1E] hover:bg-[#26262A] text-white transition-colors border border-[#26262A] cursor-pointer mb-3 whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir no Google Maps</span>
              </a>
            )}

            <a
              href={generalWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-11 px-4 rounded-[6px] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white transition-colors cursor-pointer whitespace-nowrap"
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
          <div className="p-5 rounded-lg bg-[#131315] border border-[#26262A] flex items-center gap-3.5 text-white/90">
            <div className="w-10 h-10 rounded-[6px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs sm:text-sm font-black text-white">Atendimento Confiável & Dados Seguros</h5>
              <p className="text-xs text-zinc-400">Ambiente 100% protegido. Seus pedidos e dados cadastrais são tratados com segurança e agilidade.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
