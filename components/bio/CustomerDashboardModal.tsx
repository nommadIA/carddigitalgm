import React, { useState, useEffect } from "react";
import { 
  X, User, ShoppingBag, MapPin, Phone, Mail, LogOut, 
  ChevronRight, ChevronDown, ChevronUp, Copy, Check, 
  ExternalLink, Clock, PackageCheck, AlertCircle, Loader2, Sparkles, MessageCircle, FileText,
  CreditCard, CheckCircle2, ShieldCheck, ArrowRight, Send
} from "lucide-react";
import { 
  Customer, 
  CustomerOrder, 
  fetchCustomerOrders, 
  updateCustomerProfile, 
  signOutCustomer, 
  lookupViaCep 
} from "../../lib/customerService";
import { OrderPaymentModal } from "./OrderPaymentModal";
import { pushToast } from "../../store/toast";

interface CustomerDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onCustomerUpdated: (customer: Customer) => void;
  onLogout: () => void;
  brandColor?: string;
  pixKey?: string;
  pixType?: string;
  cardUrl?: string;
  companyWhatsapp?: string;
  companyName?: string;
  companyAddress?: string;
  companyAddressUrl?: string;
  companyEmail?: string;
  onOpenAdminOrders?: () => void;
  isAdmin?: boolean;
}

export function CustomerDashboardModal({
  isOpen,
  onClose,
  customer,
  onCustomerUpdated,
  onLogout,
  brandColor = "#FE540B",
  pixKey,
  pixType,
  cardUrl,
  companyWhatsapp = "98987505041",
  companyName = "GM Edificação",
  companyAddress,
  companyAddressUrl,
  companyEmail = "gmedificacao@gmail.com",
  onOpenAdminOrders,
  isAdmin = false,
}: CustomerDashboardModalProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "profile">("orders");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);
  const [selectedPaymentOrder, setSelectedPaymentOrder] = useState<CustomerOrder | null>(null);

  // Edit profile state
  const [editName, setEditName] = useState(customer.full_name || "");
  const [editPhone, setEditPhone] = useState(customer.phone || "");
  const [editCpfCnpj, setEditCpfCnpj] = useState(customer.cpf_cnpj || "");
  const [editCep, setEditCep] = useState(customer.cep || "");
  const [editStreet, setEditStreet] = useState(customer.street || "");
  const [editNumber, setEditNumber] = useState(customer.number || "");
  const [editComplement, setEditComplement] = useState(customer.complement || "");
  const [editNeighborhood, setEditNeighborhood] = useState(customer.neighborhood || "");
  const [editCity, setEditCity] = useState(customer.city || "");
  const [editState, setEditState] = useState(customer.state || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

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
    if (isOpen && customer?.id) {
      loadOrders();
      setEditName(customer.full_name || "");
      setEditPhone(customer.phone || "");
      setEditCpfCnpj(customer.cpf_cnpj || "");
      setEditCep(customer.cep || "");
      setEditStreet(customer.street || "");
      setEditNumber(customer.number || "");
      setEditComplement(customer.complement || "");
      setEditNeighborhood(customer.neighborhood || "");
      setEditCity(customer.city || "");
      setEditState(customer.state || "");
    }
  }, [isOpen, customer]);

  const loadOrders = async () => {
    if (!customer?.id) return;
    setLoadingOrders(true);
    const list = await fetchCustomerOrders(customer.id);
    setOrders(list);
    setLoadingOrders(false);
    if (list.length > 0 && !expandedOrderId) {
      setExpandedOrderId(list[0].id);
    }
  };

  if (!isOpen) return null;

  const handleCepChange = async (val: string) => {
    setEditCep(val);
    const clean = val.replace(/\D/g, "");
    if (clean.length === 8) {
      setLoadingCep(true);
      const res = await lookupViaCep(clean);
      setLoadingCep(false);
      if (res) {
        setEditStreet(res.street || "");
        setEditNeighborhood(res.neighborhood || "");
        setEditCity(res.city || "");
        setEditState(res.state || "");
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      pushToast({ type: "error", title: "Erro", message: "Informe seu nome completo." });
      return;
    }

    setSavingProfile(true);
    const res = await updateCustomerProfile(customer.id, {
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
      pushToast({ type: "success", title: "Sucesso", message: "Seus dados foram atualizados com sucesso!" });
      onCustomerUpdated(res.customer);
    } else {
      pushToast({ type: "error", title: "Erro", message: res.error || "Não foi possível atualizar os dados." });
    }
  };

  const handleLogoutClick = async () => {
    await signOutCustomer();
    onLogout();
    onClose();
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

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "preparando":
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">Em Preparo</span>;
      case "enviado":
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-500/20 text-purple-400 border border-purple-500/30">Enviado / A Caminho</span>;
      case "entregue":
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Entregue / Concluído</span>;
      case "cancelado":
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-red-500/20 text-red-400 border border-red-500/30">Cancelado</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">Aguardando Confirmação</span>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Pago
          </span>
        );
      case "in_process":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Em Análise
          </span>
        );
      case "failed":
      case "rejected":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-red-500/20 text-red-400 border border-red-500/30 inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Não Aprovado
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Aguardando Pagamento
          </span>
        );
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case "pix":
        return (
          <span className="text-[11px] font-bold text-teal-400 inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span> PIX
          </span>
        );
      case "credit_card":
        return (
          <span className="text-[11px] font-bold text-orange-400 inline-flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5" /> Cartão
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-bold text-zinc-400">
            A Combinar
          </span>
        );
    }
  };

  const handleCopyPix = (orderId: string, keyVal: string) => {
    if (!keyVal) return;
    navigator.clipboard.writeText(keyVal);
    setCopiedPixId(orderId);
    pushToast({ type: "success", title: "Copiado", message: "Chave Pix copiada com sucesso!" });
    setTimeout(() => setCopiedPixId(null), 3000);
  };

  const handleOpenWhatsAppOrder = (order: CustomerOrder) => {
    const cleanPhone = (companyWhatsapp || "98987505041").replace(/\D/g, "");
    const msg = `Olá! Sou ${customer.full_name}, gostaria de saber mais sobre o meu pedido #${order.order_number} no valor de ${formatBRL(order.total)}.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const cleanWhatsapp = (companyWhatsapp || "98987505041").replace(/\D/g, "");
  const generalWhatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
    `Olá! Sou ${customer.full_name}, cliente cadastrado(a) na GM Edificação, e gostaria de atendimento.`
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
          Área do Cliente
        </h2>
        
        <p className="text-xs sm:text-sm md:text-base font-medium leading-relaxed max-w-2xl text-zinc-300">
          Olá, <strong className="text-white">{customer.full_name.split(' ')[0]}</strong>! Acompanhe o status dos seus pedidos, atualize seus dados cadastrais e fale diretamente com a equipe da GM Edificação.
        </p>
      </div>

      {/* 2. Main Grid: Content + Side Card (Idêntico ao Fale com a Gente) */}
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-24 sm:mb-12">
        
        {/* Left Container: Orders & Profile (Col 1-7) */}
        <div 
          className="w-full lg:col-span-7 apple-glass-card p-5 sm:p-8 md:p-10 rounded-[2.5rem] text-white gm-customer-dashboard-container gm-customer-modal-container transition-all duration-300 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Admin Notice Banner if applicable */}
          {isAdmin && onOpenAdminOrders && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/5 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-200">Acesso Administrativo Liberado</h4>
                  <p className="text-xs text-zinc-300">Gerencie todos os pedidos de clientes, estoque e configurações do site.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdminOrders();
                }}
                className="px-4 py-2 rounded-xl text-xs font-black text-black bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shrink-0"
              >
                <span>Painel Admin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Segmented Control - Navigation Tabs */}
          <div className="w-full max-w-[340px] mx-auto mb-6 p-1 bg-black/60 backdrop-blur-md rounded-2xl border border-white/15 flex flex-row items-center gap-1 h-12 box-border">
            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className={`flex-1 h-full rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 text-center whitespace-nowrap px-3 ${
                activeTab === "orders" 
                  ? "bg-white text-zinc-950 shadow-md font-black" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Pedidos ({orders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`flex-1 h-full rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 text-center whitespace-nowrap px-3 ${
                activeTab === "profile" 
                  ? "bg-white text-zinc-950 shadow-md font-black" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Meus Dados</span>
            </button>
          </div>

          {/* Subheader */}
          <div className="mb-6 flex items-center gap-3.5 pb-4 border-b border-white/10">
            <div 
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md shrink-0 border border-white/20 text-white"
              style={{ backgroundColor: brandColor || "#FE540B" }}
            >
              {activeTab === "orders" ? (
                <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <User className="w-5 h-5 stroke-[2.5]" />
              )}
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {activeTab === "orders" ? "Histórico de Pedidos" : "Dados Cadastrais & Endereço"}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400">
                {activeTab === "orders" 
                  ? "Consulte compras, pagamentos e o status de entrega de cada pedido." 
                  : "Mantenha seus dados atualizados para entregas rápidas e precisas."}
              </p>
            </div>
          </div>

          {/* ============================================================== */}
          {/* TAB: MEUS PEDIDOS                                              */}
          {/* ============================================================== */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              {loadingOrders ? (
                <div className="py-14 flex flex-col items-center justify-center gap-3 text-zinc-400">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                  <span className="text-sm font-semibold">Carregando seus pedidos...</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500 shadow-inner">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">Nenhum pedido realizado ainda</h4>
                    <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
                      Navegue pelos produtos no catálogo do site e faça seu primeiro pedido com entrega rápida!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="site-btn-pill px-8 py-3.5 text-xs sm:text-sm uppercase tracking-wider cursor-pointer font-black inline-flex items-center gap-2 mt-2"
                    style={{ backgroundColor: brandColor || "#FE540B" }}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Ver Catálogo de Produtos</span>
                  </button>
                </div>
              ) : (
                orders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  return (
                    <div 
                      key={order.id} 
                      className="p-5 rounded-3xl bg-black/40 border border-white/10 hover:border-white/20 transition-all space-y-4 shadow-md"
                    >
                      {/* Order Summary Bar */}
                      <div 
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base sm:text-lg font-black text-white">
                              Pedido #{order.order_number}
                            </span>
                            {getOrderStatusBadge(order.order_status)}
                            {getPaymentStatusBadge(order.payment_status)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-400 font-medium">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-zinc-500" />
                              {formatDate(order.created_at)}
                            </span>
                            <span>•</span>
                            <span>{order.items?.length || 0} produto(s)</span>
                            <span>•</span>
                            {getPaymentMethodBadge(order.payment_method)}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/10">
                          <div className="text-right">
                            <span className="text-[11px] uppercase font-bold text-zinc-400 block tracking-wider">Total</span>
                            <span className="text-lg sm:text-xl font-black" style={{ color: brandColor }}>
                              {formatBRL(order.total)}
                            </span>
                          </div>
                          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>

                      {/* Order Expanded Details */}
                      {isExpanded && (
                        <div className="pt-4 border-t border-white/10 space-y-4 animate-in fade-in duration-200">
                          {/* Items list */}
                          <div className="space-y-2">
                            <span className="text-xs font-black text-zinc-300 uppercase tracking-wider block">
                              Itens do Pedido:
                            </span>
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                              {(order.items || []).map((it, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/5 text-xs sm:text-sm">
                                  <div className="flex items-center gap-3 min-w-0">
                                    {it.image_url ? (
                                      <img src={it.image_url} alt={it.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10" />
                                    ) : (
                                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 text-zinc-400">
                                        <ShoppingBag className="w-5 h-5" />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-bold text-white truncate max-w-[220px] sm:max-w-xs">{it.name}</p>
                                      <p className="text-xs text-zinc-400 mt-0.5">
                                        Quantidade: <strong>{it.quantity}</strong> {it.selectedOption?.quantity ? `(${it.selectedOption.quantity})` : ""}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="font-black text-white shrink-0 text-sm">
                                    {formatBRL(Number(it.price) * it.quantity)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Delivery Info */}
                          {order.shipping_address && (
                            <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 text-xs sm:text-sm space-y-1">
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

                          {/* Actions for this Order */}
                          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/10">
                            <button
                              type="button"
                              onClick={() => setSelectedPaymentOrder(order)}
                              className="site-btn-pill px-5 py-2.5 text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer font-black"
                              style={{ backgroundColor: brandColor || "#FE540B" }}
                            >
                              <CreditCard className="w-4 h-4" />
                              <span>
                                {order.payment_status === "paid" 
                                  ? "Detalhes do Pagamento" 
                                  : "Pagar Agora / Comprovante"}
                              </span>
                            </button>

                            {pixKey && order.payment_status === "pending" && (
                              <button
                                type="button"
                                onClick={() => handleCopyPix(order.id, pixKey)}
                                className="px-4 py-2.5 rounded-full text-xs font-black bg-white/10 hover:bg-white/20 text-white flex items-center gap-2 transition-all cursor-pointer border border-white/10"
                              >
                                {copiedPixId === order.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                <span>{copiedPixId === order.id ? "Pix Copiado!" : "Copiar Chave Pix"}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenWhatsAppOrder(order)}
                              className="px-4 py-2.5 rounded-full text-xs font-black bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center gap-2 transition-all cursor-pointer shadow-md"
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

          {/* ============================================================== */}
          {/* TAB: MEUS DADOS                                                */}
          {/* ============================================================== */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-zinc-400 absolute left-4 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    WhatsApp / Telefone
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
                      maxLength={15}
                      value={editPhone}
                      onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                      placeholder="(98) 98750-5041"
                      className="w-full pl-12 pr-4 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    CPF / CNPJ
                  </label>
                  <div className="relative flex items-center">
                    <FileText className="w-4 h-4 text-zinc-400 absolute left-4 pointer-events-none" />
                    <input
                      type="text"
                      maxLength={18}
                      value={editCpfCnpj}
                      onChange={(e) => setEditCpfCnpj(formatCpfCnpj(e.target.value))}
                      placeholder="000.000.000-00"
                      className="w-full pl-11 pr-4 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Endereço Completo */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                  <MapPin className="w-4 h-4 text-[#FE540B]" />
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    Endereço de Entrega Padrão
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
                        value={editCep}
                        maxLength={9}
                        onChange={(e) => handleCepChange(e.target.value)}
                        placeholder="00000-000"
                        className="w-full px-4 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Número
                      </label>
                      <input
                        type="text"
                        value={editNumber}
                        onChange={(e) => setEditNumber(e.target.value)}
                        placeholder="Ex: 120"
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
                        value={editStreet}
                        onChange={(e) => setEditStreet(e.target.value)}
                        placeholder="Rua, Avenida..."
                        className="w-full px-4 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Complemento (opcional)
                      </label>
                      <input
                        type="text"
                        value={editComplement}
                        onChange={(e) => setEditComplement(e.target.value)}
                        placeholder="Apto, Bloco, Casa..."
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
                        value={editNeighborhood}
                        onChange={(e) => setEditNeighborhood(e.target.value)}
                        placeholder="Bairro"
                        className="w-full px-4 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="Cidade"
                        className="w-full px-4 py-3.5 text-sm sm:text-base border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Estado (UF)
                      </label>
                      <input
                        type="text"
                        value={editState}
                        maxLength={2}
                        onChange={(e) => setEditState(e.target.value.toUpperCase())}
                        placeholder="UF"
                        className="w-full px-4 py-3.5 text-sm sm:text-base text-center uppercase border focus:outline-none transition-all duration-300 rounded-2xl apple-glass-input font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="site-btn-pill w-full sm:w-auto px-8 sm:px-10 py-3.5 text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer font-black"
                  style={{ backgroundColor: brandColor || "#FE540B" }}
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Salvando Alterações...</span>
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

        {/* Side Card: Profile Summary, Map & WhatsApp (Col 8-12) - Idêntico ao Fale com a Gente */}
        <div className="w-full lg:col-span-5 flex flex-col gap-5">
          {/* Subcard 1: User Account & Fast Actions */}
          <div 
            className="p-6 sm:p-8 rounded-[2.5rem] border transition-all duration-300 apple-glass-card border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-md shrink-0 border border-white/20"
                  style={{ backgroundColor: brandColor || "#FE540B" }}
                >
                  {(customer.full_name || "C").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white truncate max-w-[180px]">{customer.full_name}</h3>
                    {isAdmin ? (
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                        Admin
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                        Cliente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 truncate max-w-[200px]">{customer.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogoutClick}
                className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Sair da Conta"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>

            {/* Direct WhatsApp button with prefilled customer name */}
            <a
              href={generalWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] mb-4"
            >
              <img 
                src="https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/ICONES%20SVG/ICONES%20COR%20BRANCA/Whatsapp%20branco.svg" 
                alt="WhatsApp" 
                className="w-4 h-4 object-contain"
              />
              <span>Atendimento Direto WhatsApp</span>
            </a>

            {/* Location Section */}
            {companyAddress && (
              <>
                <div className="flex items-center gap-2.5 mb-2 pt-2 border-t border-white/10">
                  <MapPin className="w-4 h-4 text-[#FE540B]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Localização & Retirada</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed mb-3">
                  {companyAddress}
                </p>

                <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 shadow-md relative z-0 mb-3 bg-zinc-900 group/map">
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

                <a
                  href={companyAddressUrl ? companyAddressUrl : `https://maps.google.com/?q=${encodeURIComponent(companyAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white transition-all border border-white/15 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir no Google Maps</span>
                </a>
              </>
            )}
          </div>

          {/* Subcard 2: Security & Commitment Badge (Idêntico ao Fale com a Gente) */}
          <div 
            className="p-5 rounded-2xl bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 flex items-center gap-3.5 text-white/90"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs sm:text-sm font-black text-white">Atendimento Confiável & Dados Seguros</h5>
              <p className="text-xs text-zinc-400">Ambiente 100% protegido. Seus pedidos e dados cadastrais são tratados com segurança e agilidade.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Pagamento Seguro do Pedido Selecionado */}
      <OrderPaymentModal
        isOpen={!!selectedPaymentOrder}
        onClose={() => setSelectedPaymentOrder(null)}
        order={selectedPaymentOrder}
        pixKey={pixKey}
        pixType={pixType}
        cardUrl={cardUrl}
        brandColor={brandColor}
        companyName={companyName}
        companyWhatsapp={companyWhatsapp}
        onPaymentUpdated={() => {
          loadOrders();
        }}
      />
    </div>
  );
}
