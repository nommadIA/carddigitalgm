import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { 
  Users, ShieldCheck, Clock, CheckCircle2, AlertTriangle, AlertCircle, 
  Search, RefreshCw, MessageCircle, Calendar, Plus, ChevronRight, 
  Sparkles, Check, X, ShieldAlert, ArrowLeft, Trash2, KeyRound, ExternalLink, Copy
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  fetchConsolidatedUsers, RegisteredUserRecord, approveUserAccess, 
  extendUserTrial, expireUserAccess, deleteUserFromRegistry, UserSubscriptionStatus 
} from "../lib/adminUsersService";
import { PlanId, PLANS_DATA } from "../lib/subscriptionPlans";
import { pushToast } from "../store/toast";
import { openWhatsapp } from "../services/whatsApp";
import { isUserAdminEmail } from "../constants";

export default function AdminUsersManager() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [usersList, setUsersList] = useState<RegisteredUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"todos" | "solicitou_liberacao" | "teste" | "ativo" | "expirado">("todos");

  // Modais de ação administrativa
  const [approvalModalUser, setApprovalModalUser] = useState<RegisteredUserRecord | null>(null);
  const [selectedPlanForApproval, setSelectedPlanForApproval] = useState<PlanId>("intermediario");
  const [approvalDurationDays, setApprovalDurationDays] = useState<number>(30);
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Modal estender teste
  const [extendModalUser, setExtendModalUser] = useState<RegisteredUserRecord | null>(null);
  const [extraTrialDays, setExtraTrialDays] = useState<number>(7);

  // Modal deletar usuário
  const [deleteModalUser, setDeleteModalUser] = useState<RegisteredUserRecord | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchConsolidatedUsers();
      setUsersList(data);
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();

    const handleRegistryUpdated = (e: any) => {
      if (e?.detail) setUsersList(e.detail);
    };
    window.addEventListener("gm_users_registry_updated", handleRegistryUpdated);
    return () => {
      window.removeEventListener("gm_users_registry_updated", handleRegistryUpdated);
    };
  }, []);

  // Estatísticas e contadores
  const stats = useMemo(() => {
    const total = usersList.length;
    const pendingApproval = usersList.filter((u) => u.status === "solicitou_liberacao").length;
    const inTrial = usersList.filter((u) => u.status === "teste").length;
    const active = usersList.filter((u) => u.status === "ativo").length;
    const expired = usersList.filter((u) => u.status === "expirado").length;
    return { total, pendingApproval, inTrial, active, expired };
  }, [usersList]);

  // Lista filtrada
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      // Filtro por tab
      if (selectedFilter !== "todos" && u.status !== selectedFilter) {
        return false;
      }

      // Filtro por busca de texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.name.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchPlan = u.planName.toLowerCase().includes(q);
        return matchName || matchEmail || matchPlan;
      }

      return true;
    });
  }, [usersList, selectedFilter, searchQuery]);

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    pushToast({
      title: "E-mail Copiado!",
      message: email,
      type: "success",
    });
  };

  const handleOpenApprovalModal = (userRecord: RegisteredUserRecord) => {
    setApprovalModalUser(userRecord);
    setSelectedPlanForApproval(userRecord.requestedPlanId || userRecord.planId !== "adm" ? (userRecord.requestedPlanId || (userRecord.planId as PlanId)) : "intermediario");
    setApprovalDurationDays(30);
    setAdminNotes("");
  };

  const handleConfirmApproval = async () => {
    if (!approvalModalUser) return;
    setIsProcessingAction(true);
    const ok = await approveUserAccess(approvalModalUser.email, selectedPlanForApproval, approvalDurationDays, adminNotes);
    setIsProcessingAction(false);

    if (ok) {
      pushToast({
        title: "Acesso Liberado com Sucesso!",
        message: `O usuário ${approvalModalUser.name} (${approvalModalUser.email}) foi ativado no plano ${PLANS_DATA[selectedPlanForApproval].name} por ${approvalDurationDays} dias.`,
        type: "success",
      });
      setApprovalModalUser(null);
      loadUsers();
    } else {
      pushToast({
        title: "Erro ao liberar",
        message: "Não foi possível atualizar o plano do usuário.",
        type: "error",
      });
    }
  };

  const handleConfirmExtendTrial = async () => {
    if (!extendModalUser) return;
    setIsProcessingAction(true);
    const ok = await extendUserTrial(extendModalUser.email, extraTrialDays);
    setIsProcessingAction(false);

    if (ok) {
      pushToast({
        title: "Período de Teste Estendido!",
        message: `Adicionados +${extraTrialDays} dias de teste para ${extendModalUser.name}.`,
        type: "success",
      });
      setExtendModalUser(null);
      loadUsers();
    } else {
      pushToast({
        title: "Erro ao estender",
        message: "Não foi possível estender o teste do usuário.",
        type: "error",
      });
    }
  };

  const handleConfirmExpireUser = async (userRecord: RegisteredUserRecord) => {
    if (confirm(`Tem certeza que deseja bloquear/expirar o acesso de ${userRecord.name} (${userRecord.email})?`)) {
      const ok = await expireUserAccess(userRecord.email);
      if (ok) {
        pushToast({
          title: "Acesso Expirado",
          message: `O acesso do usuário ${userRecord.email} foi encerrado.`,
          type: "info",
        });
        loadUsers();
      }
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteModalUser) return;
    setIsProcessingAction(true);
    const ok = await deleteUserFromRegistry(deleteModalUser.email);
    setIsProcessingAction(false);

    if (ok) {
      pushToast({
        title: "Usuário Removido",
        message: `${deleteModalUser.name} foi removido da lista administrativa.`,
        type: "info",
      });
      setDeleteModalUser(null);
      loadUsers();
    }
  };

  const handleContactWhatsApp = (userRecord: RegisteredUserRecord) => {
    const text = `Olá ${userRecord.name}! Aqui é da administração do aplicativo CardDigital GM. Estamos entrando em contato a respeito da sua conta (${userRecord.email}). Como podemos te ajudar?`;
    openWhatsapp(userRecord.phone || "5598984242784", text);
  };

  return (
    <div className="w-full min-h-screen pb-16 text-white select-none">
      {/* Top Banner / Navegação Master */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer"
            title="Voltar ao Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FE540B]/20 border border-[#FE540B]/50 text-[#FE540B]">
                Módulo Master ADM
              </span>
              <span className="text-xs text-zinc-500 font-mono">Conta: gmedificacao@gmail.com</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
              <span>Gestão de Usuários & Assinaturas</span>
              <ShieldCheck size={24} className="text-[#FE540B]" />
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            title="Atualizar lista de usuários"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-[#FE540B]" : ""} />
            <span>Atualizar</span>
          </button>

          <Link
            to="/planos"
            className="px-4 py-2 rounded-xl bg-[#FE540B] hover:bg-[#ff6924] text-white text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#FE540B]/25 active:scale-95"
          >
            <Sparkles size={14} />
            <span>Preços & Pix dos Planos</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
        {/* Total */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Usuários</span>
            <Users size={16} className="text-zinc-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white mt-1">{stats.total}</span>
          <span className="text-[11px] text-zinc-500">Cadastrados no app</span>
        </div>

        {/* Solicitaram Liberação */}
        <div 
          onClick={() => setSelectedFilter("solicitou_liberacao")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            stats.pendingApproval > 0
              ? "bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30"
              : "bg-white/[0.03] border-white/10"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Solicitaram Liberação
            </span>
            <AlertCircle size={16} className={stats.pendingApproval > 0 ? "text-amber-400 animate-pulse" : "text-zinc-500"} />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-amber-300 mt-1">{stats.pendingApproval}</span>
          <span className="text-[11px] text-amber-400/80 font-medium">Aguardando seu aval</span>
        </div>

        {/* Em Teste */}
        <div 
          onClick={() => setSelectedFilter("teste")}
          className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-sky-500/40 transition-all cursor-pointer flex flex-col gap-1"
        >
          <div className="flex items-center justify-between text-sky-400">
            <span className="text-xs font-bold uppercase tracking-wider">Em Teste (7d)</span>
            <Clock size={16} className="text-sky-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-sky-300 mt-1">{stats.inTrial}</span>
          <span className="text-[11px] text-zinc-500">Degustação ativa</span>
        </div>

        {/* Ativos / Pagos */}
        <div 
          onClick={() => setSelectedFilter("ativo")}
          className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 transition-all cursor-pointer flex flex-col gap-1"
        >
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider">Ativos / Pagos</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-emerald-300 mt-1">{stats.active}</span>
          <span className="text-[11px] text-zinc-500">Planos vigentes</span>
        </div>

        {/* Expirados */}
        <div 
          onClick={() => setSelectedFilter("expirado")}
          className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-red-500/40 transition-all cursor-pointer flex flex-col gap-1"
        >
          <div className="flex items-center justify-between text-red-400">
            <span className="text-xs font-bold uppercase tracking-wider">Expirados</span>
            <AlertTriangle size={16} className="text-red-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-red-300 mt-1">{stats.expired}</span>
          <span className="text-[11px] text-zinc-500">Teste/plano finalizado</span>
        </div>
      </div>

      {/* Barra de Filtro e Busca */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-5">
        {/* Filtros em Abas */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {[
            { id: "todos", label: "Todos", count: stats.total },
            { id: "solicitou_liberacao", label: "🔔 Solicitaram Liberação", count: stats.pendingApproval, highlight: true },
            { id: "teste", label: "⏳ Em Teste (7d)", count: stats.inTrial },
            { id: "ativo", label: "✅ Ativos", count: stats.active },
            { id: "expirado", label: "⚠️ Expirados", count: stats.expired },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedFilter(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                selectedFilter === tab.id
                  ? tab.highlight
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/30"
                    : "bg-[#FE540B] text-white shadow-md shadow-[#FE540B]/30"
                  : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedFilter === tab.id ? "bg-black/20 text-current" : "bg-white/10 text-zinc-400"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Input de Busca */}
        <div className="relative min-w-[240px] sm:min-w-[280px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-black/40 border border-white/15 focus:border-[#FE540B] text-xs text-white outline-none transition-all placeholder:text-zinc-500 font-medium"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-zinc-400 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 sm:px-6">Usuário / Empresa</th>
                <th className="py-3.5 px-4">Data de Criação</th>
                <th className="py-3.5 px-4">Status da Assinatura</th>
                <th className="py-3.5 px-4">Plano Vigente / Solicitado</th>
                <th className="py-3.5 px-4 text-right">Ações do Administrador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 text-xs">
                    Nenhum usuário encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isMaster = u.status === "adm" || isUserAdminEmail(u.email);
                  const isPending = u.status === "solicitou_liberacao";
                  const isTrial = u.status === "teste";
                  const isActive = u.status === "ativo";
                  const isExpired = u.status === "expirado";

                  // Formata data de criação
                  let formattedDate = "Data não informada";
                  try {
                    if (u.createdAt) {
                      const d = new Date(u.createdAt);
                      formattedDate = d.toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                    }
                  } catch {}

                  return (
                    <tr
                      key={u.id || u.email}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        isPending ? "bg-amber-500/[0.06] border-l-4 border-l-amber-500" : ""
                      }`}
                    >
                      {/* Usuário / Empresa */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isMaster
                              ? "bg-[#FE540B] text-white shadow-md shadow-[#FE540B]/30"
                              : isPending
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-white/10 text-white"
                          }`}>
                            {u.name ? u.name.slice(0, 2).toUpperCase() : u.email.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="font-extrabold text-white text-sm truncate flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isMaster && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#FE540B]/20 text-[#FE540B] border border-[#FE540B]/40">
                                  MASTER ADM
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-400 text-xs mt-0.5">
                              <span className="truncate">{u.email}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyEmail(u.email)}
                                className="text-zinc-500 hover:text-white transition-colors"
                                title="Copiar e-mail"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Data de Criação */}
                      <td className="py-4 px-4 text-zinc-300 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-zinc-500" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isMaster && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/15 border border-amber-500/40 text-amber-300">
                            <ShieldCheck size={13} />
                            <span>Acesso Master Total</span>
                          </span>
                        )}

                        {isPending && (
                          <div className="inline-flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-black animate-pulse shadow-md shadow-amber-500/20">
                              <AlertCircle size={13} />
                              <span>Solicitou Liberação (Pago)</span>
                            </span>
                            {u.requestedAt && (
                              <span className="text-[10px] text-amber-300/80 font-medium pl-1">
                                Comprovante Pix enviado
                              </span>
                            )}
                          </div>
                        )}

                        {isTrial && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/15 border border-sky-500/40 text-sky-300">
                            <Clock size={13} />
                            <span>Em Teste ({u.daysRemaining} dias restantes)</span>
                          </span>
                        )}

                        {isActive && !isMaster && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
                            <CheckCircle2 size={13} />
                            <span>Ativo ({u.daysRemaining} dias)</span>
                          </span>
                        )}

                        {isExpired && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 border border-red-500/40 text-red-300">
                            <AlertTriangle size={13} />
                            <span>Acesso Expirado</span>
                          </span>
                        )}
                      </td>

                      {/* Plano */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-xs">
                            {isPending && u.requestedPlanId 
                              ? `Solicitou: Plano ${PLANS_DATA[u.requestedPlanId]?.name || "Criador"}`
                              : u.planName}
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            {isMaster ? "Acesso Desenvolvedor" : isPending ? "Aguardando aprovação" : isTrial ? "Cota 7 dias gratuita" : "Assinatura mensal"}
                          </span>
                        </div>
                      </td>

                      {/* Ações Administrativas */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isMaster && (
                            <>
                              {/* Botão de Liberar Acesso / Aprovar Pagamento */}
                              <button
                                type="button"
                                onClick={() => handleOpenApprovalModal(u)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 ${
                                  isPending
                                    ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/30"
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                }`}
                                title="Liberar ou atualizar plano do usuário"
                              >
                                <Check size={13} className="stroke-[3]" />
                                <span>{isPending ? "Liberar Acesso" : "Aprovar / Alterar"}</span>
                              </button>

                              {/* Estender Teste */}
                              <button
                                type="button"
                                onClick={() => setExtendModalUser(u)}
                                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
                                title="Estender período de teste"
                              >
                                <Plus size={13} />
                                <span>+Teste</span>
                              </button>

                              {/* WhatsApp */}
                              <button
                                type="button"
                                onClick={() => handleContactWhatsApp(u)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 border border-white/10 transition-all cursor-pointer"
                                title="Contatar no WhatsApp"
                              >
                                <MessageCircle size={14} />
                              </button>

                              {/* Expirar / Revogar */}
                              {isActive && (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmExpireUser(u)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-white/10 transition-all cursor-pointer"
                                  title="Pausar / Expirar Acesso"
                                >
                                  <AlertTriangle size={14} />
                                </button>
                              )}

                              {/* Excluir da lista */}
                              <button
                                type="button"
                                onClick={() => setDeleteModalUser(u)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-white/10 transition-all cursor-pointer"
                                title="Excluir Usuário"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}

                          {isMaster && (
                            <span className="text-[11px] text-zinc-500 italic pr-2">Conta Master Imutável</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: LIBERAR ACESSO / APROVAR PAGAMENTO */}
      {approvalModalUser && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-[#0F1015] border border-white/15 rounded-3xl p-6 shadow-2xl relative text-white"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Liberar Acesso & Aprovar Plano</h3>
                  <p className="text-xs text-zinc-400">
                    Usuário: <strong className="text-white">{approvalModalUser.name}</strong> ({approvalModalUser.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovalModalUser(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Escolha do Plano */}
            <div className="flex flex-col gap-3 mb-5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Selecione o Plano a Ser Liberado:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["basico", "intermediario", "avancado"] as PlanId[]).map((pid) => {
                  const p = PLANS_DATA[pid];
                  const isSel = selectedPlanForApproval === pid;
                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => setSelectedPlanForApproval(pid)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSel
                          ? "bg-[#FE540B]/15 border-[#FE540B] shadow-md shadow-[#FE540B]/15 text-white"
                          : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="text-xs font-black">{p.name}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">R$ {p.price.toFixed(2)}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duração */}
            <div className="flex flex-col gap-2 mb-5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Período de Validade:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { days: 30, label: "30 Dias (1 Mês)" },
                  { days: 90, label: "90 Dias (3 Meses)" },
                  { days: 365, label: "365 Dias (1 Ano)" },
                ].map((item) => (
                  <button
                    key={item.days}
                    type="button"
                    onClick={() => setApprovalDurationDays(item.days)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      approvalDurationDays === item.days
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Anotações */}
            <div className="flex flex-col gap-1.5 mb-6">
              <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Observações do Administrador (Opcional):
              </label>
              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Ex: Pagamento confirmado via Pix em 30/10"
                className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/15 focus:border-emerald-500 text-xs text-white outline-none"
              />
            </div>

            {/* Botões do Rodapé */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setApprovalModalUser(null)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleConfirmApproval}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
              >
                <Check size={16} className="stroke-[3]" />
                <span>Confirmar Liberação Imediata</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: ESTENDER PERÍODO DE TESTE */}
      {extendModalUser && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#0F1015] border border-white/15 rounded-3xl p-6 shadow-2xl relative text-white"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Estender Teste Grátis</h3>
                  <p className="text-xs text-zinc-400">
                    Usuário: <strong className="text-white">{extendModalUser.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExtendModalUser(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-zinc-300 mb-4">
              Escolha quantos dias adicionais de degustação sem travas você deseja conceder a este usuário:
            </p>

            <div className="grid grid-cols-3 gap-2 mb-6">
              {[7, 15, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setExtraTrialDays(days)}
                  className={`py-3 px-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    extraTrialDays === days
                      ? "bg-sky-500/20 border-sky-500 text-sky-300 font-black shadow-md shadow-sky-500/20"
                      : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white font-bold text-xs"
                  }`}
                >
                  <div className="text-base font-black">+{days} Dias</div>
                  <div className="text-[10px] text-zinc-400">Gratuidade</div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setExtendModalUser(null)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleConfirmExtendTrial}
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-sky-500/20 active:scale-95 disabled:opacity-50"
              >
                <Check size={16} className="stroke-[3]" />
                <span>Aplicar +{extraTrialDays} Dias</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: EXCLUIR USUÁRIO */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#0F1015] border border-red-500/30 rounded-3xl p-6 shadow-2xl relative text-white"
          >
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-black text-white">Excluir Usuário</h3>
            </div>
            <p className="text-xs text-zinc-300 mb-6 leading-relaxed">
              Tem certeza que deseja remover <strong className="text-white">{deleteModalUser.name}</strong> ({deleteModalUser.email}) da lista de usuários? Esta ação remove os registros de controle administrativo.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleConfirmDeleteUser}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider active:scale-95 disabled:opacity-50"
              >
                Excluir
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
