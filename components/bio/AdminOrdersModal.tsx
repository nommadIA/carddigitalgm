import React, { useState, useEffect } from "react";
import { 
  X, ShoppingBag, CheckCircle2, Clock, AlertCircle, 
  ExternalLink, Search, RefreshCw, MessageCircle, 
  Eye, Check, MapPin, Phone, User, FileText, 
  Truck, ArrowRight, DollarSign, Filter, Sparkles, Image as ImageIcon,
  CreditCard, ShieldCheck, ChevronDown, ChevronUp
} from "lucide-react";
import { 
  CustomerOrder, 
  fetchAllStoreOrders, 
  updateOrderStatus, 
  updateOrderPaymentStatus 
} from "../../lib/customerService";
import { fetchOrderPayments, OrderPayment } from "../../lib/paymentService";
import { pushToast } from "../../store/toast";

interface AdminOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId?: string;
  brandColor?: string;
  companyName?: string;
  companyWhatsapp?: string;
}

export function AdminOrdersModal({
  isOpen,
  onClose,
  tenantId = "global",
  brandColor = "#FE540B",
  companyName = "GM Edificação",
  companyWhatsapp = "",
}: AdminOrdersModalProps) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "review_receipt" | "pending_payment" | "paid" | "preparing">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [paymentsMap, setPaymentsMap] = useState<Record<string, OrderPayment[]>>({});

  useEffect(() => {
    if (isOpen) {
      loadOrders();
    }
  }, [isOpen, tenantId]);

  const loadOrders = async () => {
    setLoading(true);
    const list = await fetchAllStoreOrders(tenantId);
    setOrders(list);
    setLoading(false);

    // Fetch payments for each order to find attached receipts
    const map: Record<string, OrderPayment[]> = {};
    for (const ord of list) {
      try {
        const pays = await fetchOrderPayments(ord.id);
        if (pays.length > 0) {
          map[ord.id] = pays;
        }
      } catch {}
    }
    setPaymentsMap(map);
  };

  if (!isOpen) return null;

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

  // Helper to extract receipt URL from payments or notes
  const getOrderReceiptUrl = (order: CustomerOrder): string | null => {
    const pays = paymentsMap[order.id];
    if (pays && pays.length > 0) {
      const withReceipt = pays.find(p => p.receipt_url);
      if (withReceipt?.receipt_url) return withReceipt.receipt_url;
    }
    if (order.notes && order.notes.includes("Comprovante anexado pelo cliente:")) {
      const parts = order.notes.split("Comprovante anexado pelo cliente:");
      if (parts[1]) return parts[1].trim();
    }
    return null;
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const receipt = getOrderReceiptUrl(order);

    if (filterTab === "review_receipt") {
      // Pedidos com comprovante anexado que ainda não estão aprovados como 'paid'
      if (!receipt || order.payment_status === "paid") return false;
    } else if (filterTab === "pending_payment") {
      if (order.payment_status === "paid") return false;
    } else if (filterTab === "paid") {
      if (order.payment_status !== "paid") return false;
    } else if (filterTab === "preparing") {
      if (order.order_status !== "preparando" && order.order_status !== "enviado") return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = order.customer_name?.toLowerCase().includes(q);
      const matchNum = order.order_number?.toString().includes(q);
      const matchEmail = order.customer_email?.toLowerCase().includes(q);
      const matchPhone = order.customer_phone?.includes(q);
      return matchName || matchNum || matchEmail || matchPhone;
    }

    return true;
  });

  // Count orders waiting for receipt review
  const pendingReceiptCount = orders.filter(
    (o) => getOrderReceiptUrl(o) && o.payment_status !== "paid"
  ).length;

  const handleApprovePayment = async (order: CustomerOrder) => {
    setUpdatingId(order.id);
    const res = await updateOrderPaymentStatus(order.id, "paid");
    setUpdatingId(null);

    if (res.success) {
      pushToast({
        type: "success",
        title: "Pagamento Aprovado!",
        message: `O Pedido #${order.order_number} foi marcado como Pago.`,
      });
      // Atualiza estado local
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, payment_status: "paid" } : o));

      // Oferece notificar cliente no WhatsApp
      const clientPhone = (order.customer_phone || "").replace(/\D/g, "");
      if (clientPhone) {
        const num = clientPhone.startsWith("55") || clientPhone.length > 11 ? clientPhone : `55${clientPhone}`;
        const msg = `*PAGAMENTO CONFIRMADO! 🎉*\n\n` +
          `Olá, *${order.customer_name.split(" ")[0]}*!\n` +
          `Confirmamos o recebimento do seu pagamento via Pix para o *Pedido #${order.order_number}* no valor de *${formatBRL(order.total)}*.\n\n` +
          `Seu pedido já está sendo preparado com muito carinho pela nossa equipe! 📦✨`;
        window.open(`https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(msg)}`, "_blank");
      }
    } else {
      pushToast({
        type: "error",
        title: "Erro ao aprovar",
        message: res.error || "Não foi possível atualizar o pagamento.",
      });
    }
  };

  const handleRejectPayment = async (order: CustomerOrder) => {
    setUpdatingId(order.id);
    const res = await updateOrderPaymentStatus(order.id, "failed");
    setUpdatingId(null);

    if (res.success) {
      pushToast({
        type: "info",
        title: "Comprovante Rejeitado",
        message: `Pedido #${order.order_number} atualizado. Notifique o cliente para reenviar o comprovante.`,
      });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, payment_status: "failed" } : o));

      const clientPhone = (order.customer_phone || "").replace(/\D/g, "");
      if (clientPhone) {
        const num = clientPhone.startsWith("55") || clientPhone.length > 11 ? clientPhone : `55${clientPhone}`;
        const msg = `Olá, *${order.customer_name.split(" ")[0]}*! Referente ao seu *Pedido #${order.order_number}*:\n\n` +
          `Não conseguimos validar o comprovante enviado. Por favor, envie novamente o comprovante legível ou nos informe por aqui para liberarmos seu pedido. Obrigado!`;
        window.open(`https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(msg)}`, "_blank");
      }
    }
  };

  const handleChangeOrderStatus = async (
    orderId: string, 
    newStatus: "aguardando_aprovacao" | "preparando" | "enviado" | "entregue" | "cancelado"
  ) => {
    setUpdatingId(orderId);
    const res = await updateOrderStatus(orderId, newStatus);
    setUpdatingId(null);

    if (res.success) {
      pushToast({
        type: "success",
        title: "Status Atualizado!",
        message: `O status do pedido foi alterado com sucesso.`,
      });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o));
    } else {
      pushToast({
        type: "error",
        title: "Erro",
        message: res.error || "Falha ao mudar status.",
      });
    }
  };

  const handleContactCustomerWhatsApp = (order: CustomerOrder) => {
    const clientPhone = (order.customer_phone || "").replace(/\D/g, "");
    if (!clientPhone) {
      pushToast({ type: "info", title: "Aviso", message: "Cliente não cadastrou número de telefone/WhatsApp." });
      return;
    }
    const num = clientPhone.startsWith("55") || clientPhone.length > 11 ? clientPhone : `55${clientPhone}`;
    const msg = `Olá, ${order.customer_name}! Aqui é da ${companyName}, estou entrando em contato a respeito do seu Pedido #${order.order_number}.`;
    window.open(`https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-black/80 animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl fora border border-white/12 rounded-[2.25rem] p-6 sm:p-8 shadow-2xl relative my-auto max-h-[94vh] flex flex-col text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3.5">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: brandColor }}
            >
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-white">Gestão de Pedidos & Vendas</h2>
                <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Painel do Lojista
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400">
                Acompanhe compras, confira comprovantes de Pix e atualize pedidos em tempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadOrders}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
              title="Recarregar Pedidos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-400" : ""}`} />
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

        {/* Filter & Search Bar */}
        <div className="my-4 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-black/40 border border-white/10">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterTab === "all" ? "bg-white text-zinc-950 shadow" : "text-zinc-400 hover:text-white"
                }`}
              >
                Todos ({orders.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterTab("review_receipt")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterTab === "review_receipt" 
                    ? "bg-amber-400 text-zinc-950 shadow" 
                    : pendingReceiptCount > 0 
                      ? "text-amber-400 bg-amber-400/10 border border-amber-400/30 animate-pulse" 
                      : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>⚠️ Conferir Comprovantes</span>
                {pendingReceiptCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-black flex items-center justify-center">
                    {pendingReceiptCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setFilterTab("paid")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterTab === "paid" ? "bg-white text-zinc-950 shadow" : "text-zinc-400 hover:text-white"
                }`}
              >
                Pagos ({orders.filter(o => o.payment_status === "paid").length})
              </button>

              <button
                type="button"
                onClick={() => setFilterTab("preparing")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterTab === "preparing" ? "bg-white text-zinc-950 shadow" : "text-zinc-400 hover:text-white"
                }`}
              >
                Em Andamento
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex items-center w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por cliente ou pedido..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-[#FE540B]"
              />
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {loading && orders.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 space-y-2">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto text-orange-500" />
              <p className="text-sm font-semibold">Carregando pedidos da loja...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <p className="text-base font-bold text-white">Nenhum pedido encontrado nesta categoria</p>
              <p className="text-xs text-zinc-500">Assim que os clientes fizerem compras, elas aparecerão aqui automaticamente.</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              const receiptUrl = getOrderReceiptUrl(order);
              const isReceiptPendingReview = !!receiptUrl && order.payment_status !== "paid";

              return (
                <div 
                  key={order.id}
                  className={`p-5 rounded-3xl border transition-all space-y-4 shadow-md ${
                    isReceiptPendingReview 
                      ? "bg-gradient-to-r from-amber-500/10 via-[#14151e] to-[#14151e] border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]"
                      : "bg-[#14151e] border-white/10 hover:border-white/20"
                  }`}
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

                        {/* Payment Status Badge */}
                        {order.payment_status === "paid" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Pago
                          </span>
                        ) : isReceiptPendingReview ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/25 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5" /> Comprovante Anexado (Conferir)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
                            Aguardando Pagamento
                          </span>
                        )}

                        {/* Fulfillment Status Badge */}
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/5 border border-white/10 text-zinc-300">
                          {order.order_status === "preparando" ? "Em Preparo" : order.order_status === "enviado" ? "Enviado" : order.order_status === "entregue" ? "Entregue" : "Novo Pedido"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                        <span className="font-bold text-white flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                          {order.customer_name}
                        </span>
                        <span>•</span>
                        <span>{order.customer_phone || "Sem tel"}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          {formatDate(order.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/10">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">Total</span>
                        <span className="text-lg sm:text-xl font-black" style={{ color: brandColor }}>
                          {formatBRL(order.total)}
                        </span>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Prominent Receipt Alert if attached and pending */}
                  {isReceiptPendingReview && receiptUrl && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <strong className="block text-white text-sm">O cliente anexou o comprovante do Pix!</strong>
                          <span className="text-zinc-300">Confira a imagem e clique em "Aprovar Pagamento" para liberar o pedido.</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptUrl(receiptUrl)}
                          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Ver Foto</span>
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === order.id}
                          onClick={() => handleApprovePayment(order)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Aprovar Pagamento</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Order Expanded Details */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-white/10 space-y-4 animate-in fade-in duration-200">
                      {/* Products List */}
                      <div className="space-y-2">
                        <span className="text-xs font-black text-zinc-300 uppercase tracking-wider block">
                          Produtos Comprados:
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
                                    Qtd: <strong>{it.quantity}</strong> {it.selectedOption?.quantity ? `(${it.selectedOption.quantity})` : ""}
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

                      {/* Customer & Delivery Address Card */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                          <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                            <User className="w-4 h-4 text-orange-400" /> Dados do Cliente:
                          </span>
                          <p className="text-white font-bold">{order.customer_name}</p>
                          <p className="text-zinc-400">{order.customer_email}</p>
                          <p className="text-zinc-400">{order.customer_phone || "Sem telefone informado"}</p>
                          {order.customer_cpf_cnpj && <p className="text-zinc-400">CPF/CNPJ: {order.customer_cpf_cnpj}</p>}
                        </div>

                        <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                          <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-emerald-400" /> Entrega:
                          </span>
                          <p className="text-white font-medium">
                            {typeof order.shipping_address === "string" 
                              ? order.shipping_address 
                              : order.shipping_address?.pickup 
                                ? "Retirar no Local"
                                : `${order.shipping_address?.street || ""} ${order.shipping_address?.number ? `Nº ${order.shipping_address.number}` : ""} ${order.shipping_address?.neighborhood || ""} ${order.shipping_address?.city || ""}`.trim() || order.notes || "A combinar"}
                          </p>
                        </div>
                      </div>

                      {/* Attached Receipt Preview inside details */}
                      {receiptUrl && (
                        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                              <ImageIcon className="w-4 h-4 text-teal-400" />
                              Comprovante de Pagamento Anexado:
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedReceiptUrl(receiptUrl)}
                              className="text-xs font-bold text-orange-400 hover:text-orange-300 underline flex items-center gap-1 cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Abrir Imagem Completa
                            </button>
                          </div>

                          <div 
                            className="bg-black/50 p-2 rounded-xl border border-white/10 inline-block cursor-pointer hover:border-white/30 transition-all max-w-xs"
                            onClick={() => setSelectedReceiptUrl(receiptUrl)}
                          >
                            <img 
                              src={receiptUrl} 
                              alt="Comprovante de pagamento" 
                              className="h-36 rounded-lg object-contain"
                            />
                          </div>
                        </div>
                      )}

                      {/* Admin Actions Bar for Order */}
                      <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex flex-wrap items-center justify-between gap-3">
                        {/* Status do Pedido Selector */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400 font-bold">Status do Pedido:</span>
                          <select
                            value={order.order_status}
                            disabled={updatingId === order.id}
                            onChange={(e) => handleChangeOrderStatus(order.id, e.target.value as any)}
                            className="h-9 px-3 rounded-lg bg-[#14151e] border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer"
                          >
                            <option value="aguardando_aprovacao">Aguardando Confirmação</option>
                            <option value="preparando">Em Preparo</option>
                            <option value="enviado">Enviado / A Caminho</option>
                            <option value="entregue">Entregue / Concluído</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        </div>

                        {/* Payment Approval & WhatsApp Contact */}
                        <div className="flex flex-wrap items-center gap-2">
                          {order.payment_status !== "paid" ? (
                            <button
                              type="button"
                              disabled={updatingId === order.id}
                              onClick={() => handleApprovePayment(order)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Confirmar Pagamento (Marcar como Pago)</span>
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" /> Pagamento Já Confirmado
                            </span>
                          )}

                          {receiptUrl && order.payment_status !== "paid" && (
                            <button
                              type="button"
                              disabled={updatingId === order.id}
                              onClick={() => handleRejectPayment(order)}
                              className="px-3 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 font-bold text-xs transition-all cursor-pointer"
                            >
                              Rejeitar Comprovante
                            </button>
                          )}

                          {order.customer_phone && (
                            <button
                              type="button"
                              onClick={() => handleContactCustomerWhatsApp(order)}
                              className="px-3.5 py-2 rounded-xl bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>WhatsApp</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <span>
            Total de Pedidos Registrados: <strong className="text-white">{orders.length}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-black text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Lightbox / Fullscreen Receipt Viewer */}
      {selectedReceiptUrl && (
        <div 
          className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-200"
          onClick={() => setSelectedReceiptUrl(null)}
        >
          <div 
            className="relative max-w-3xl max-h-[90vh] bg-zinc-950 p-4 rounded-3xl border border-white/20 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 mb-3 text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-teal-400" /> Comprovante de Pagamento
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={selectedReceiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir Original
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedReceiptUrl(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-auto max-h-[75vh] w-full flex items-center justify-center bg-black/40 rounded-2xl p-2">
              <img 
                src={selectedReceiptUrl} 
                alt="Comprovante de pagamento" 
                className="max-h-[70vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
