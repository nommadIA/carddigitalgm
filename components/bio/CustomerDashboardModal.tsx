import React, { useState, useEffect } from "react";
import { 
  X, User, ShoppingBag, MapPin, Phone, Mail, LogOut, 
  ChevronRight, ChevronDown, ChevronUp, Copy, Check, 
  ExternalLink, Clock, PackageCheck, AlertCircle, Loader2, Sparkles, MessageCircle, FileText,
  CreditCard, CheckCircle2, ShieldCheck, ArrowRight
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
  companyWhatsapp = "",
  companyName = "GM Edificação",
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
  const [saveHover, setSaveHover] = useState(false);

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
      pushToast({ type: "success", title: "Sucesso", message: "Seus dados foram atualizados!" });
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
    pushToast({ type: "success", title: "Copiado", message: "Chave Pix copiada para a área de transferência!" });
    setTimeout(() => setCopiedPixId(null), 3000);
  };

  const handleOpenWhatsAppOrder = (order: CustomerOrder) => {
    const cleanPhone = companyWhatsapp.replace(/\D/g, "");
    if (!cleanPhone) {
      pushToast({ type: "info", title: "Aviso", message: "WhatsApp da loja não configurado." });
      return;
    }
    const num = cleanPhone.startsWith("55") || cleanPhone.length > 11 ? cleanPhone : `55${cleanPhone}`;
    const msg = `Olá! Sou ${customer.full_name}, gostaria de saber mais sobre o meu pedido #${order.order_number} no valor de ${formatBRL(order.total)}.`;
    window.open(`https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl sm:max-w-3xl bg-[#0f1016]/98 border border-white/12 rounded-[2.25rem] p-6 sm:p-9 shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative my-auto max-h-[92vh] flex flex-col text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3.5">
            <div 
              className="w-13 h-13 rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-lg"
              style={{ backgroundColor: brandColor }}
            >
              {(customer.full_name || "C").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">{customer.full_name}</h2>
                <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Cliente
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400">{customer.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAdminOrders && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdminOrders();
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Abrir Gestão de Todos os Pedidos e Comprovantes"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Painel do Lojista</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLogoutClick}
              className="px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Sair da Conta"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Pill Container) */}
        <div className="p-1.5 bg-black/50 rounded-full border border-white/10 my-6 grid grid-cols-2 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`h-12 rounded-full text-xs sm:text-sm font-black transition-all cursor-pointer select-none flex items-center justify-center gap-2 ${
              activeTab === "orders" 
                ? "bg-white text-zinc-950 shadow-md scale-[1.01]" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Meus Pedidos ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`h-12 rounded-full text-xs sm:text-sm font-black transition-all cursor-pointer select-none flex items-center justify-center gap-2 ${
              activeTab === "profile" 
                ? "bg-white text-zinc-950 shadow-md scale-[1.01]" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Meus Dados & Endereço</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB: MEUS PEDIDOS                                              */}
        {/* ============================================================== */}
        {activeTab === "orders" && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {loadingOrders ? (
              <div className="py-14 flex flex-col items-center justify-center gap-3 text-zinc-400">
                <Loader2 className="w-7 h-7 animate-spin text-orange-500" />
                <span className="text-sm font-semibold">Carregando seus pedidos...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-14 text-center space-y-4">
                <div className="w-18 h-18 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500 shadow-inner">
                  <ShoppingBag className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Nenhum pedido realizado ainda</h3>
                  <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
                    Navegue pelos produtos no catálogo e adicione itens ao carrinho para fazer sua primeira compra!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3.5 rounded-full text-white font-black text-sm uppercase tracking-wider shadow-xl hover:brightness-110 active:scale-95 cursor-pointer inline-flex items-center gap-2 mt-2"
                  style={{ backgroundColor: brandColor }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Explorar Produtos</span>
                </button>
              </div>
            ) : (
              orders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                return (
                  <div 
                    key={order.id} 
                    className="p-5 rounded-3xl bg-[#14151e] border border-white/10 hover:border-white/20 transition-all space-y-4 shadow-md"
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

                        {/* Actions for this Order (Payment & Contact) */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/10">
                          {/* Botão de Pagamento Seguro */}
                          <button
                            type="button"
                            onClick={() => setSelectedPaymentOrder(order)}
                            className="px-4.5 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white flex items-center gap-2 transition-all cursor-pointer shadow-md hover:brightness-110 active:scale-98"
                            style={{ backgroundColor: brandColor }}
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>
                              {order.payment_status === "paid" 
                                ? "Ver Detalhes do Pagamento" 
                                : "Pagar Agora / Anexar Comprovante"}
                            </span>
                          </button>

                          {pixKey && order.payment_status === "pending" && (
                            <button
                              type="button"
                              onClick={() => handleCopyPix(order.id, pixKey)}
                              className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-white/10 hover:bg-white/15 text-white flex items-center gap-2 transition-all cursor-pointer border border-white/10"
                            >
                              {copiedPixId === order.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                              <span>{copiedPixId === order.id ? "Pix Copiado!" : "Copiar Chave"}</span>
                            </button>
                          )}

                          {companyWhatsapp && (
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsAppOrder(order)}
                              className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 flex items-center gap-2 transition-all cursor-pointer"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>WhatsApp</span>
                            </button>
                          )}
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
          <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto pr-1 space-y-5">
            <div>
              <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider mb-2">
                Nome Completo
              </label>
              <div className="relative flex items-center">
                <User className="w-5 h-5 text-zinc-500 absolute left-4.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-14 pl-13 pr-5 rounded-2xl bg-[#14151e] border border-white/12 text-white text-sm sm:text-base font-semibold focus:outline-none focus:border-[#FE540B] focus:ring-2 focus:ring-[#FE540B]/25 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider mb-2">
                  WhatsApp / Telefone
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-5 h-5 text-zinc-500 absolute left-4.5 pointer-events-none" />
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full h-14 pl-13 pr-5 rounded-2xl bg-[#14151e] border border-white/12 text-white text-sm sm:text-base font-semibold focus:outline-none focus:border-[#FE540B] focus:ring-2 focus:ring-[#FE540B]/25 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider mb-2">
                  CPF / CNPJ
                </label>
                <div className="relative flex items-center">
                  <FileText className="w-5 h-5 text-zinc-500 absolute left-4.5 pointer-events-none" />
                  <input
                    type="text"
                    value={editCpfCnpj}
                    onChange={(e) => setEditCpfCnpj(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full h-14 pl-13 pr-5 rounded-2xl bg-[#14151e] border border-white/12 text-white text-sm sm:text-base font-semibold focus:outline-none focus:border-[#FE540B] focus:ring-2 focus:ring-[#FE540B]/25 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Address fields */}
            <div className="p-5 rounded-3xl bg-black/40 border border-white/10 space-y-4">
              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4" style={{ color: brandColor }} />
                Endereço de Entrega Padrão
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    CEP {loadingCep && <span className="text-[10px] text-orange-400 lowercase font-normal">(buscando...)</span>}
                  </label>
                  <input
                    type="text"
                    value={editCep}
                    maxLength={9}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    className="w-full h-12 px-4 rounded-xl bg-[#14151e] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#FE540B]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Número
                  </label>
                  <input
                    type="text"
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
                    placeholder="Ex: 120"
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
                  value={editStreet}
                  onChange={(e) => setEditStreet(e.target.value)}
                  placeholder="Rua, Avenida..."
                  className="w-full h-12 px-4 rounded-xl bg-[#14151e] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#FE540B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={editComplement}
                    onChange={(e) => setEditComplement(e.target.value)}
                    placeholder="Apto, Bloco..."
                    className="w-full h-12 px-4 rounded-xl bg-[#14151e] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#FE540B]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={editNeighborhood}
                    onChange={(e) => setEditNeighborhood(e.target.value)}
                    placeholder="Bairro"
                    className="w-full h-12 px-4 rounded-xl bg-[#14151e] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#FE540B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder="Cidade"
                    className="w-full h-12 px-4 rounded-xl bg-[#14151e] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#FE540B]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    value={editState}
                    maxLength={2}
                    onChange={(e) => setEditState(e.target.value.toUpperCase())}
                    placeholder="UF"
                    className="w-full h-12 px-4 rounded-xl bg-[#14151e] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#FE540B]"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button (SitePillButton style) */}
            <button
              type="submit"
              disabled={savingProfile}
              onMouseEnter={() => setSaveHover(true)}
              onMouseLeave={() => setSaveHover(false)}
              className="w-full h-14 sm:h-15 rounded-full font-black text-base sm:text-lg tracking-wide transition-all duration-200 shadow-xl cursor-pointer flex items-center justify-center gap-2 mt-4 border-0 select-none"
              style={{
                backgroundColor: saveHover ? "#FFFFFF" : brandColor,
                color: saveHover ? brandColor : "#FFFFFF",
                boxShadow: saveHover 
                  ? "0 8px 25px rgba(255,255,255,0.3)" 
                  : `0 6px 22px ${brandColor}40`,
                transform: saveHover ? "scale(1.01)" : "none",
              }}
            >
              {savingProfile ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Salvando Alterações...</span>
                </>
              ) : (
                <span>Salvar Alterações</span>
              )}
            </button>
          </form>
        )}
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
