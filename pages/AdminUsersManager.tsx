import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { 
  Users, ShieldCheck, Clock, CheckCircle2, AlertTriangle, AlertCircle, 
  Search, RefreshCw, Calendar, Plus, ChevronRight, 
  Sparkles, Check, X, ShieldAlert, ArrowLeft, Trash2, KeyRound, ExternalLink, Copy,
  Phone, Mail, CheckCheck, PauseCircle, Layers, ArrowUpRight, Bell, Send
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
import { ForgeSpecCard } from "../components/ui/ForgeSpecCard";
import { broadcastAppNotification } from "../lib/syncHub";
import { WhatsAppIcon } from "../components/ui/WhatsAppIcon";

function formatPhoneBR(value: string) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

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

  // Notificações simultâneas no Modal de Liberação
  const [approvalPhone, setApprovalPhone] = useState<string>("");
  const [approvalSendWhatsApp, setApprovalSendWhatsApp] = useState<boolean>(true);
  const [approvalSendSystem, setApprovalSendSystem] = useState<boolean>(true);

  // Modal estender teste
  const [extendModalUser, setExtendModalUser] = useState<RegisteredUserRecord | null>(null);
  const [extraTrialDays, setExtraTrialDays] = useState<number>(7);
  const [extendPhone, setExtendPhone] = useState<string>("");
  const [extendSendWhatsApp, setExtendSendWhatsApp] = useState<boolean>(true);
  const [extendSendSystem, setExtendSendSystem] = useState<boolean>(true);

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
    setApprovalPhone(userRecord.phone ? formatPhoneBR(userRecord.phone) : "");
    setApprovalSendWhatsApp(true);
    setApprovalSendSystem(true);
  };

  const handleOpenExtendModal = (userRecord: RegisteredUserRecord) => {
    setExtendModalUser(userRecord);
    setExtraTrialDays(7);
    setExtendPhone(userRecord.phone ? formatPhoneBR(userRecord.phone) : "");
    setExtendSendWhatsApp(true);
    setExtendSendSystem(true);
  };

  const handleConfirmApproval = async () => {
    if (!approvalModalUser) return;
    setIsProcessingAction(true);
    const planName = PLANS_DATA[selectedPlanForApproval].name;
    const ok = await approveUserAccess(approvalModalUser.email, selectedPlanForApproval, approvalDurationDays, adminNotes);
    setIsProcessingAction(false);

    if (ok) {
      // 1. Notificação do Sistema no Aplicativo do Usuário
      if (approvalSendSystem) {
        try {
          await broadcastAppNotification(approvalModalUser.tenantId || null, {
            title: "Plano Liberado com Sucesso! 🚀",
            message: `Seu plano ${planName} foi ativado por ${approvalDurationDays} dias no CardDigital GM! Todas as funcionalidades estão desbloqueadas.`,
            type: "system",
            url: "/planos",
          });
        } catch (err) {
          console.warn("Aviso ao disparar notificação do sistema:", err);
        }
      }

      // 2. Notificação no WhatsApp do Usuário
      if (approvalSendWhatsApp) {
        try {
          const appUrl = window.location.origin;
          const phoneTarget = (approvalPhone || approvalModalUser.phone || "").replace(/\D/g, "");
          const text = `Olá, *${approvalModalUser.name}*! 👋\n\n` +
            `🎉 *Seu acesso ao CardDigital GM foi liberado com sucesso!*\n\n` +
            `📦 *Plano Ativado:* ${planName}\n` +
            `⏳ *Validade:* ${approvalDurationDays} dias\n` +
            `✨ *Status:* 100% Desbloqueado e Pronto para Uso\n\n` +
            `Você já pode emitir orçamentos em PDF A4 timbrado, gerenciar clientes e usar todas as ferramentas:\n` +
            `🔗 ${appUrl}\n\n` +
            `Qualquer dúvida ou suporte, estamos à sua disposição!`;
          
          openWhatsapp(phoneTarget || "5598984242784", text);
        } catch (err) {
          console.warn("Aviso ao abrir WhatsApp:", err);
        }
      }

      pushToast({
        title: "Acesso Liberado com Sucesso!",
        message: `O usuário ${approvalModalUser.name} foi ativado no plano ${planName} por ${approvalDurationDays} dias. Notificações disparadas!`,
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
      // 1. Notificação do Sistema no Aplicativo do Usuário
      if (extendSendSystem) {
        try {
          await broadcastAppNotification(extendModalUser.tenantId || null, {
            title: "Período de Teste Estendido! ⏳",
            message: `Você ganhou mais +${extraTrialDays} dias de degustação gratuita no CardDigital GM! Aproveite para criar orçamentos e cadastrar clientes.`,
            type: "system",
            url: "/planos",
          });
        } catch (err) {
          console.warn("Aviso ao disparar notificação do sistema:", err);
        }
      }

      // 2. Notificação no WhatsApp do Usuário
      if (extendSendWhatsApp) {
        try {
          const appUrl = window.location.origin;
          const phoneTarget = (extendPhone || extendModalUser.phone || "").replace(/\D/g, "");
          const text = `Olá, *${extendModalUser.name}*! 👋\n\n` +
            `🎁 *Boas notícias! Seu período de teste no CardDigital GM foi estendido!*\n\n` +
            `⏳ *Dias Adicionais Concedidos:* +${extraTrialDays} dias de cortesia gratuita\n` +
            `✨ *Acesso:* 100% Liberado no Sistema\n\n` +
            `Aproveite para criar orçamentos profissionais, testar materiais e fechar novas obras:\n` +
            `🔗 ${appUrl}\n\n` +
            `Desejamos muito sucesso na sua produção!`;

          openWhatsapp(phoneTarget || "5598984242784", text);
        } catch (err) {
          console.warn("Aviso ao abrir WhatsApp:", err);
        }
      }

      pushToast({
        title: "Período de Teste Estendido!",
        message: `Adicionados +${extraTrialDays} dias de teste para ${extendModalUser.name}. Notificações enviadas!`,
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
    <div className="w-full min-h-screen pb-20 text-[#f2f2f3] select-none space-y-6">
      {/* 1. TOP BANNER / NAVEGAÇÃO FORGE INDUSTRIAL */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-[#26262a]">
        <div className="flex items-center gap-3.5">
          <Link
            to="/"
            className="w-10 h-10 rounded-[4px] bg-[#1b1b1e] hover:bg-[#26262a] border border-[#26262a] hover:border-[var(--gm-primary,#FE540B)] flex items-center justify-center text-[#8b8b92] hover:text-white transition-all cursor-pointer shadow-sm group"
            title="Voltar ao Dashboard"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-[2px] text-xs font-mono font-bold uppercase tracking-wider bg-[var(--gm-primary,#FE540B)]/15 border border-[var(--gm-primary,#FE540B)]/40 text-[var(--gm-primary,#FE540B)]">
                MÓDULO MASTER ADM
              </span>
              <span className="text-xs text-[#8b8b92] font-mono">Conta: gmedificacao@gmail.com</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#f2f2f3] tracking-tight mt-1 flex items-center gap-2.5">
              <span>Gestão de Usuários & Assinaturas</span>
              <ShieldCheck size={22} className="text-[var(--gm-primary,#FE540B)] shrink-0" />
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-start sm:justify-end">
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="h-10 px-4 rounded-[4px] text-xs font-mono font-bold tracking-wider uppercase inline-flex items-center gap-2 cursor-pointer transition-all border border-[#26262a] bg-[#131315] hover:bg-[#1b1b1e] text-[#f2f2f3] hover:border-[#38383f] disabled:opacity-50"
            title="Atualizar lista de usuários"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-[var(--gm-primary,#FE540B)]" : "text-[#8b8b92]"} />
            <span>Atualizar</span>
          </button>

          <Link
            to="/planos"
            className="h-10 px-4 rounded-[4px] text-xs font-mono font-bold tracking-wider uppercase inline-flex items-center gap-2 cursor-pointer shadow-[0_2px_12px_rgba(var(--gm-primary-rgb,246,90,26),0.3)] bg-[var(--gm-btn-bg,var(--gm-primary,#FE540B))] hover:brightness-110 text-[var(--gm-primary-foreground,#0b0b0c)] active:scale-[0.99]"
            title="Gerenciar valores e chaves Pix"
          >
            <Sparkles size={14} className="stroke-[2.5]" />
            <span>Preços & Pix dos Planos</span>
          </Link>
        </div>
      </div>

      {/* 2. KPI CARDS (FORGE SPEC SYSTEM) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        {/* CARD 01: TOTAL USUÁRIOS */}
        <ForgeSpecCard
          id="01"
          title="TOTAL USUÁRIOS"
          status="BASE"
          statusLive={false}
          eyebrow="BASE CADASTRADA"
          figure={stats.total}
          unit="USUÁRIOS"
          tags={[
            { label: "CADASTRADOS NO APP", accent: false, icon: <Users size={13} className="text-[#8b8b92]" /> }
          ]}
        />

        {/* CARD 02: SOLICITAÇÕES */}
        <ForgeSpecCard
          id="02"
          title="SOLICITAÇÕES"
          status={stats.pendingApproval > 0 ? "URGENTE" : "ZERADO"}
          statusLive={stats.pendingApproval > 0}
          eyebrow="AVAL NECESSÁRIO"
          figure={stats.pendingApproval}
          unit="ITENS"
          onClick={() => setSelectedFilter("solicitou_liberacao")}
          className={stats.pendingApproval > 0 ? "ring-1 ring-amber-500/40 border-amber-500/50 cursor-pointer" : "cursor-pointer"}
          tags={[
            { 
              label: stats.pendingApproval > 0 ? "AGUARDANDO AVAL" : "SEM PENDÊNCIAS", 
              accent: stats.pendingApproval > 0, 
              icon: <AlertCircle size={13} className={stats.pendingApproval > 0 ? "text-amber-400" : "text-[#8b8b92]"} /> 
            }
          ]}
        />

        {/* CARD 03: EM DEGUSTAÇÃO (7D) */}
        <ForgeSpecCard
          id="03"
          title="EM TESTE (7D)"
          status="DEGUST"
          statusLive={false}
          eyebrow="PERÍODO DE TESTE"
          figure={stats.inTrial}
          unit="CONTAS"
          onClick={() => setSelectedFilter("teste")}
          className="cursor-pointer"
          tags={[
            { label: "DEGUSTAÇÃO ATIVA", accent: false, icon: <Clock size={13} className="text-sky-400" /> }
          ]}
        />

        {/* CARD 04: ATIVOS / PAGOS */}
        <ForgeSpecCard
          id="04"
          title="ATIVOS / PAGOS"
          status="VIGENTE"
          statusLive={true}
          eyebrow="ASSINANTES"
          figure={stats.active}
          unit="PLANOS"
          onClick={() => setSelectedFilter("ativo")}
          className="cursor-pointer"
          tags={[
            { label: "PLANOS VIGENTES", accent: true, icon: <CheckCircle2 size={13} className="text-emerald-400" /> }
          ]}
        />

        {/* CARD 05: EXPIRADOS */}
        <ForgeSpecCard
          id="05"
          title="EXPIRADOS"
          status="ALERTA"
          statusLive={false}
          eyebrow="FINALIZADOS"
          figure={stats.expired}
          unit="CONTAS"
          onClick={() => setSelectedFilter("expirado")}
          className="cursor-pointer"
          tags={[
            { label: "PLANO FINALIZADO", accent: false, icon: <AlertTriangle size={13} className="text-rose-400" /> }
          ]}
        />
      </div>

      {/* 3. BARRA DE FILTRO E BUSCA FORGE UI */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
        {/* Filtros em Abas Estilo Forge */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {[
            { id: "todos", label: "TODOS", count: stats.total },
            { id: "solicitou_liberacao", label: "SOLICITARAM LIBERAÇÃO", count: stats.pendingApproval, highlight: true },
            { id: "teste", label: "EM TESTE (7D)", count: stats.inTrial },
            { id: "ativo", label: "ATIVOS", count: stats.active },
            { id: "expirado", label: "EXPIRADOS", count: stats.expired },
          ].map((tab) => {
            const isSelected = selectedFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedFilter(tab.id as any)}
                className={`h-10 px-3.5 rounded-[4px] font-mono text-xs font-bold tracking-wider uppercase flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                  isSelected
                    ? tab.highlight && stats.pendingApproval > 0
                      ? "bg-amber-500 text-black border-amber-500 shadow-sm"
                      : "bg-[var(--gm-primary,#FE540B)] text-[var(--gm-primary-foreground,#0b0b0c)] border-[var(--gm-primary,#FE540B)] shadow-sm font-black"
                    : "bg-[#131315] hover:bg-[#1b1b1e] text-[#8b8b92] hover:text-white border-[#26262a]"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-[2px] text-[11px] font-mono ${
                  isSelected ? "bg-black/25 text-current font-bold" : "bg-white/10 text-zinc-400"
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Input de Busca Forge */}
        <div className="relative min-w-[260px] sm:min-w-[320px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full h-10 pl-9 pr-8 rounded-[4px] bg-[#131315] border border-[#26262a] hover:border-[#38383f] focus:border-[var(--gm-primary,#FE540B)] text-xs sm:text-[13px] font-mono text-[#f2f2f3] outline-none transition-all placeholder:text-[#8b8b92]"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8b92]" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8b8b92] hover:text-white p-1"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 4. TABELA FORGE SPEC DE USUÁRIOS (ALINHADA À ESQUERDA) */}
      <div className="forge-spec overflow-hidden border border-[#26262a] bg-[#131315] rounded-[4px] shadow-2xl">
        <div className="forge-spec__bar bg-[#121316] border-b border-[#26262a] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-[2px] bg-[var(--gm-primary,#FE540B)]/20 border border-[var(--gm-primary,#FE540B)]/40 text-[var(--gm-primary,#FE540B)] text-xs font-mono font-bold flex items-center justify-center">
              06
            </span>
            <span className="text-xs font-mono font-bold uppercase text-[#f2f2f3] tracking-wider flex items-center gap-2">
              <span>REGISTRO DE USUÁRIOS & ASSINATURAS</span>
              <span className="text-zinc-600 hidden sm:inline">/</span>
              <span className="text-[#8b8b92] font-mono font-normal hidden sm:inline">{filteredUsers.length} registros</span>
            </span>
          </div>

          <span className="text-xs font-mono uppercase px-2 py-0.5 rounded-[2px] border border-[#26262a] bg-[#1b1b1e] text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>SINCRONIZADO</span>
          </span>
        </div>

        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#26262a] text-xs font-mono font-bold text-[#8b8b92] uppercase tracking-wider bg-white/[0.01]">
                <th className="py-4 px-4 sm:px-6 min-w-[280px] text-left">USUÁRIO / EMPRESA</th>
                <th className="py-4 px-4 min-w-[170px] text-left">DATA DE CRIAÇÃO</th>
                <th className="py-4 px-4 min-w-[220px] text-left">STATUS DA ASSINATURA</th>
                <th className="py-4 px-4 min-w-[200px] text-left">PLANO VIGENTE / SOLICITADO</th>
                <th className="py-4 px-4 sm:px-6 min-w-[320px] text-left">AÇÕES DO ADMINISTRADOR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26262a]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center font-mono text-xs sm:text-sm text-[#8b8b92]">
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
                      className={`hover:bg-white/[0.025] transition-colors ${
                        isPending ? "bg-amber-500/[0.04] border-l-2 border-l-amber-500" : ""
                      }`}
                    >
                      {/* Usuário / Empresa */}
                      <td className="py-5 sm:py-6 px-4 sm:px-6 text-left">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-[4px] flex items-center justify-center font-mono font-bold text-xs shrink-0 border ${
                            isMaster
                              ? "bg-[var(--gm-primary,#FE540B)] text-[var(--gm-primary-foreground,#0b0b0c)] border-[var(--gm-primary,#FE540B)] shadow-sm"
                              : isPending
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : "bg-[#1b1b1e] text-[#f2f2f3] border-[#26262a]"
                          }`}>
                            {u.name ? u.name.slice(0, 2).toUpperCase() : u.email.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="font-bold text-[#f2f2f3] text-sm truncate flex items-center gap-2">
                              <span>{u.name}</span>
                              {isMaster && (
                                <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-bold uppercase bg-[var(--gm-primary,#FE540B)]/20 text-[var(--gm-primary,#FE540B)] border border-[var(--gm-primary,#FE540B)]/40">
                                   MASTER ADM
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[#8b8b92] font-mono text-xs mt-1">
                              <span className="truncate">{u.email}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyEmail(u.email)}
                                className="text-zinc-500 hover:text-white transition-colors p-0.5 cursor-pointer"
                                title="Copiar e-mail"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Data de Criação */}
                      <td className="py-5 sm:py-6 px-4 text-[#8b8b92] font-mono text-xs whitespace-nowrap text-left">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-zinc-500 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-5 sm:py-6 px-4 whitespace-nowrap text-left">
                        {isMaster && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-mono font-bold uppercase bg-[var(--gm-primary,#FE540B)]/10 border border-[var(--gm-primary,#FE540B)]/30 text-[var(--gm-primary,#FE540B)]">
                            <ShieldCheck size={14} />
                            <span>ACESSO MASTER TOTAL</span>
                          </span>
                        )}

                        {isPending && (
                          <div className="inline-flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-mono font-bold uppercase bg-amber-500/20 border border-amber-500/50 text-amber-300 animate-pulse">
                              <AlertCircle size={14} />
                              <span>SOLICITOU LIBERAÇÃO</span>
                            </span>
                            {u.requestedAt && (
                              <span className="text-[11px] font-mono text-amber-400/80 pl-1">
                                Comprovante Pix anexado
                              </span>
                            )}
                          </div>
                        )}

                        {isTrial && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-mono font-bold uppercase bg-sky-500/10 border border-sky-500/30 text-sky-400">
                            <Clock size={14} />
                            <span>EM TESTE ({u.daysRemaining}D RESTANTES)</span>
                          </span>
                        )}

                        {isActive && !isMaster && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-mono font-bold uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                            <CheckCircle2 size={14} />
                            <span>ATIVO ({u.daysRemaining} DIAS)</span>
                          </span>
                        )}

                        {isExpired && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-mono font-bold uppercase bg-rose-500/10 border border-rose-500/30 text-rose-400">
                            <AlertTriangle size={14} />
                            <span>ACESSO EXPIRADO</span>
                          </span>
                        )}
                      </td>

                      {/* Plano */}
                      <td className="py-5 sm:py-6 px-4 whitespace-nowrap text-left">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#f2f2f3] text-sm">
                            {isPending && u.requestedPlanId 
                              ? `Solicitou: ${PLANS_DATA[u.requestedPlanId]?.name || "Criador"}`
                              : u.planName}
                          </span>
                          <span className="text-xs font-mono text-[#8b8b92] mt-0.5">
                            {isMaster ? "Acesso Desenvolvedor" : isPending ? "Aguardando aprovação" : isTrial ? "Cota 7 dias gratuita" : "Assinatura mensal"}
                          </span>
                        </div>
                      </td>

                      {/* Ações Administrativas (ALINHADO À ESQUERDA) */}
                      <td className="py-5 sm:py-6 px-4 sm:px-6 whitespace-nowrap text-left">
                        <div className="flex items-center justify-start gap-2">
                          {!isMaster && (
                            <>
                              {/* Botão de Liberar Acesso / Aprovar Pagamento */}
                              <button
                                type="button"
                                onClick={() => handleOpenApprovalModal(u)}
                                className={`h-[38px] px-3.5 rounded-[4px] text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 border ${
                                  isPending
                                    ? "bg-amber-500 hover:bg-amber-400 text-black border-amber-500 shadow-amber-500/20"
                                    : "bg-[#1b1b1e] hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:border-emerald-500/60"
                                }`}
                                title="Liberar ou atualizar plano do usuário"
                              >
                                <Check size={14} className="stroke-[3]" />
                                <span>{isPending ? "Liberar Acesso" : "Aprovar / Alterar"}</span>
                              </button>

                              {/* Estender Teste (Texto 'Teste' sem o '+' antecedente, com ícone '+' animado) */}
                              <button
                                type="button"
                                onClick={() => handleOpenExtendModal(u)}
                                className="h-[38px] px-3.5 rounded-[4px] bg-[#1b1b1e] hover:bg-[#26262a] border border-[#26262a] hover:border-[var(--gm-primary,#FE540B)]/50 text-xs font-mono font-bold text-[#f2f2f3] flex items-center gap-1.5 transition-all cursor-pointer shadow-sm group active:scale-95"
                                title="Estender período de teste"
                              >
                                <Plus size={14} className="text-[var(--gm-primary,#FE540B)] animate-pulse group-hover:rotate-90 transition-transform duration-200" />
                                <span>Teste</span>
                              </button>

                              {/* WhatsApp Original */}
                              <button
                                type="button"
                                onClick={() => handleContactWhatsApp(u)}
                                className="h-[38px] px-2.5 rounded-[4px] bg-[#16171a] hover:bg-[#25D366]/15 text-[#8b8b92] hover:text-[#25D366] border border-[#26262a] hover:border-[#25D366]/50 flex items-center justify-center transition-all cursor-pointer shadow-sm group active:scale-95"
                                title="Contatar no WhatsApp Oficial"
                              >
                                <WhatsAppIcon size={16} className="text-[#25D366] group-hover:scale-110 transition-transform duration-200" />
                              </button>

                              {/* Expirar / Revogar */}
                              {isActive && (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmExpireUser(u)}
                                  className="w-[38px] h-[38px] rounded-[4px] bg-[#1b1b1e] hover:bg-amber-500/20 text-[#8b8b92] hover:text-amber-400 border border-[#26262a] hover:border-amber-500/40 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                                  title="Pausar / Expirar Acesso"
                                >
                                  <AlertTriangle size={15} />
                                </button>
                              )}

                              {/* Excluir da lista */}
                              <button
                                type="button"
                                onClick={() => setDeleteModalUser(u)}
                                className="w-[38px] h-[38px] rounded-[4px] bg-[#1b1b1e] hover:bg-rose-500/20 text-[#8b8b92] hover:text-rose-400 border border-[#26262a] hover:border-rose-500/40 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                                title="Excluir Usuário"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}

                          {isMaster && (
                            <span className="text-xs font-mono text-[#8b8b92]">Conta Master Imutável</span>
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

      {/* =========================================================================
          MODAIS ADMINISTRATIVOS (FORGE SPEC SYSTEM)
         ========================================================================= */}

      {/* MODAL 1: LIBERAR ACESSO / APROVAR PLANO */}
      {approvalModalUser && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ maxWidth: "560px", width: "100%" }}
            className="bg-[#131315] border border-[#26262a] rounded-[6px] shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden text-[#f2f2f3]"
          >
            {/* Top Bar Forge Spec */}
            <div className="forge-spec__bar bg-[#121316] border-b border-[#26262a] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-[2px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center">
                  01
                </span>
                <span className="text-xs font-mono font-bold uppercase text-[#f2f2f3] tracking-wider">
                  LIBERAR ACESSO // APROVAR PLANO
                </span>
              </div>
              <button
                type="button"
                onClick={() => setApprovalModalUser(null)}
                className="w-7 h-7 rounded-[3px] bg-[#1b1b1e] hover:bg-[#26262a] text-[#8b8b92] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              {/* Resumo do Usuário */}
              <div className="p-3.5 rounded-[4px] bg-[#1b1b1e] border border-[#26262a] flex items-center gap-3">
                <div className="w-10 h-10 rounded-[3px] bg-[var(--gm-primary,#FE540B)] text-[var(--gm-primary-foreground,#0b0b0c)] font-mono font-bold text-sm flex items-center justify-center shrink-0">
                  {approvalModalUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm text-[#f2f2f3] truncate">{approvalModalUser.name}</span>
                  <span className="text-xs font-mono text-[#8b8b92] truncate">{approvalModalUser.email}</span>
                </div>
              </div>

              {/* Escolha do Plano */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#8b8b92] block">
                  Selecione o Plano a Ser Liberado:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(["basico", "intermediario", "avancado"] as PlanId[]).map((pid) => {
                    const p = PLANS_DATA[pid];
                    const isSel = selectedPlanForApproval === pid;
                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => setSelectedPlanForApproval(pid)}
                        className={`p-3 rounded-[4px] border text-left transition-all cursor-pointer ${
                          isSel
                            ? "bg-[var(--gm-primary,#FE540B)]/15 border-[var(--gm-primary,#FE540B)] text-white shadow-sm"
                            : "bg-[#1b1b1e] border-[#26262a] text-[#8b8b92] hover:border-[#38383f] hover:text-[#f2f2f3]"
                        }`}
                      >
                        <div className="text-xs font-mono font-bold uppercase truncate">{p.name}</div>
                        <div className="text-sm font-bold text-[#f2f2f3] mt-1">R$ {p.price.toFixed(2)}</div>
                        <div className="text-[11px] font-mono text-[#8b8b92]">mensal</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Período de Validade */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#8b8b92] block">
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
                      className={`py-2 px-2.5 rounded-[4px] border font-mono text-xs font-bold transition-all cursor-pointer text-center ${
                        approvalDurationDays === item.days
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                          : "bg-[#1b1b1e] border-[#26262a] text-[#8b8b92] hover:text-[#f2f2f3] hover:border-[#38383f]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#8b8b92] block">
                  Observações do Administrador (Opcional):
                </label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Ex: Pagamento confirmado via Pix em 30/10"
                  className="w-full h-10 px-3 rounded-[4px] bg-[#1b1b1e] border border-[#26262a] focus:border-emerald-500 text-xs sm:text-[13px] font-mono text-[#f2f2f3] outline-none"
                />
              </div>

              {/* CANAIS DE NOTIFICAÇÃO (WHATSAPP + SISTEMA) */}
              <div className="p-3.5 rounded-[4px] bg-[#18181b] border border-[#26262a] space-y-3">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--gm-primary,#FE540B)] flex items-center gap-1.5">
                  <Bell size={14} />
                  <span>Notificações Automáticas ao Usuário</span>
                </div>

                {/* Notificação via WhatsApp */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={approvalSendWhatsApp}
                      onChange={(e) => setApprovalSendWhatsApp(e.target.checked)}
                      className="w-4 h-4 rounded-[2px] bg-[#131315] border-[#26262a] text-[var(--gm-primary,#FE540B)] focus:ring-0 cursor-pointer accent-[var(--gm-primary,#FE540B)]"
                    />
                    <span className="text-xs font-mono font-bold text-[#f2f2f3] flex items-center gap-1.5">
                      <WhatsAppIcon size={14} className="text-[#25D366]" />
                      <span>Notificar usuário no WhatsApp com dados de liberação</span>
                    </span>
                  </label>

                  {approvalSendWhatsApp && (
                    <div className="pl-6">
                      <input
                        type="tel"
                        value={approvalPhone}
                        onChange={(e) => setApprovalPhone(formatPhoneBR(e.target.value))}
                        placeholder="WhatsApp do usuário (ex: (98) 98424-2784)"
                        className="w-full h-9 px-3 rounded-[4px] bg-[#131315] border border-[#26262a] focus:border-[#25D366] text-xs font-mono text-[#f2f2f3] outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Notificação no Sistema */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={approvalSendSystem}
                    onChange={(e) => setApprovalSendSystem(e.target.checked)}
                    className="w-4 h-4 rounded-[2px] bg-[#131315] border-[#26262a] text-[var(--gm-primary,#FE540B)] focus:ring-0 cursor-pointer accent-[var(--gm-primary,#FE540B)]"
                  />
                  <span className="text-xs font-mono font-bold text-[#f2f2f3] flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>Disparar notificação no próprio sistema (Sino + Push + Alerta sonoro)</span>
                  </span>
                </label>
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#26262a]">
                <button
                  type="button"
                  onClick={() => setApprovalModalUser(null)}
                  className="h-10 px-4 rounded-[4px] bg-[#1b1b1e] hover:bg-[#26262a] border border-[#26262a] text-xs font-mono font-bold text-[#8b8b92] hover:text-[#f2f2f3] cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={handleConfirmApproval}
                  className="h-10 px-5 rounded-[4px] bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-[0_2px_12px_rgba(16,185,129,0.3)] active:scale-95 disabled:opacity-50"
                >
                  <Check size={15} className="stroke-[3]" />
                  <span>Confirmar Liberação & Notificar</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: ESTENDER PERÍODO DE TESTE */}
      {extendModalUser && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ maxWidth: "520px", width: "100%" }}
            className="bg-[#131315] border border-[#26262a] rounded-[6px] shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden text-[#f2f2f3]"
          >
            {/* Top Bar Forge Spec */}
            <div className="forge-spec__bar bg-[#121316] border-b border-[#26262a] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-[2px] bg-sky-500/20 border border-sky-500/40 text-sky-400 text-xs font-mono font-bold flex items-center justify-center">
                  02
                </span>
                <span className="text-xs font-mono font-bold uppercase text-[#f2f2f3] tracking-wider">
                  ESTENDER TESTE GRÁTIS
                </span>
              </div>
              <button
                type="button"
                onClick={() => setExtendModalUser(null)}
                className="w-7 h-7 rounded-[3px] bg-[#1b1b1e] hover:bg-[#26262a] text-[#8b8b92] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="p-3.5 rounded-[4px] bg-[#1b1b1e] border border-[#26262a] flex items-center gap-3">
                <div className="w-9 h-9 rounded-[3px] bg-sky-500/20 border border-sky-500/40 text-sky-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  <Clock size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm text-[#f2f2f3] truncate">{extendModalUser.name}</span>
                  <span className="text-xs font-mono text-[#8b8b92] truncate">{extendModalUser.email}</span>
                </div>
              </div>

              <p className="text-xs font-mono text-[#8b8b92]">
                Selecione os dias adicionais de degustação sem travas a conceder:
              </p>

              <div className="grid grid-cols-3 gap-2.5">
                {[7, 15, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setExtraTrialDays(days)}
                    className={`p-3 rounded-[4px] border text-center transition-all cursor-pointer ${
                      extraTrialDays === days
                        ? "bg-sky-500/20 border-sky-500 text-sky-300 shadow-sm font-bold"
                        : "bg-[#1b1b1e] border-[#26262a] text-[#8b8b92] hover:text-[#f2f2f3] hover:border-[#38383f]"
                    }`}
                  >
                    <div className="text-base font-mono font-bold">+{days} Dias</div>
                    <div className="text-[11px] font-mono text-[#8b8b92]">Gratuidade</div>
                  </button>
                ))}
              </div>

              {/* CANAIS DE NOTIFICAÇÃO (WHATSAPP + SISTEMA) */}
              <div className="p-3.5 rounded-[4px] bg-[#18181b] border border-[#26262a] space-y-3">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--gm-primary,#FE540B)] flex items-center gap-1.5">
                  <Bell size={14} />
                  <span>Notificações Automáticas ao Usuário</span>
                </div>

                {/* Notificação via WhatsApp */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={extendSendWhatsApp}
                      onChange={(e) => setExtendSendWhatsApp(e.target.checked)}
                      className="w-4 h-4 rounded-[2px] bg-[#131315] border-[#26262a] text-[var(--gm-primary,#FE540B)] focus:ring-0 cursor-pointer accent-[var(--gm-primary,#FE540B)]"
                    />
                    <span className="text-xs font-mono font-bold text-[#f2f2f3] flex items-center gap-1.5">
                      <WhatsAppIcon size={14} className="text-[#25D366]" />
                      <span>Notificar usuário no WhatsApp com aviso de teste estendido</span>
                    </span>
                  </label>

                  {extendSendWhatsApp && (
                    <div className="pl-6">
                      <input
                        type="tel"
                        value={extendPhone}
                        onChange={(e) => setExtendPhone(formatPhoneBR(e.target.value))}
                        placeholder="WhatsApp do usuário (ex: (98) 98424-2784)"
                        className="w-full h-9 px-3 rounded-[4px] bg-[#131315] border border-[#26262a] focus:border-[#25D366] text-xs font-mono text-[#f2f2f3] outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Notificação no Sistema */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={extendSendSystem}
                    onChange={(e) => setExtendSendSystem(e.target.checked)}
                    className="w-4 h-4 rounded-[2px] bg-[#131315] border-[#26262a] text-[var(--gm-primary,#FE540B)] focus:ring-0 cursor-pointer accent-[var(--gm-primary,#FE540B)]"
                  />
                  <span className="text-xs font-mono font-bold text-[#f2f2f3] flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-sky-400" />
                    <span>Disparar notificação no próprio sistema (Sino + Push + Alerta sonoro)</span>
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#26262a]">
                <button
                  type="button"
                  onClick={() => setExtendModalUser(null)}
                  className="h-10 px-4 rounded-[4px] bg-[#1b1b1e] hover:bg-[#26262a] border border-[#26262a] text-xs font-mono font-bold text-[#8b8b92] hover:text-[#f2f2f3] cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={handleConfirmExtendTrial}
                  className="h-10 px-5 rounded-[4px] bg-sky-500 hover:bg-sky-400 text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-[0_2px_12px_rgba(14,165,233,0.3)] active:scale-95 disabled:opacity-50"
                >
                  <Check size={15} className="stroke-[3]" />
                  <span>Aplicar +{extraTrialDays} Dias & Notificar</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: EXCLUIR USUÁRIO */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ maxWidth: "480px", width: "100%" }}
            className="bg-[#131315] border border-rose-500/40 rounded-[6px] shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden text-[#f2f2f3]"
          >
            {/* Top Bar Forge Spec */}
            <div className="forge-spec__bar bg-[#121316] border-b border-[#26262a] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-[2px] bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-mono font-bold flex items-center justify-center">
                  03
                </span>
                <span className="text-xs font-mono font-bold uppercase text-rose-400 tracking-wider">
                  CONFIRMAR EXCLUSÃO
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="w-7 h-7 rounded-[3px] bg-[#1b1b1e] hover:bg-[#26262a] text-[#8b8b92] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <p className="text-xs sm:text-sm font-mono text-[#8b8b92] leading-relaxed">
                Tem certeza que deseja remover o registro administrativo do usuário abaixo?
              </p>

              <div className="p-3.5 rounded-[4px] bg-[#1b1b1e] border border-[#26262a] flex items-center gap-3">
                <div className="w-9 h-9 rounded-[3px] bg-rose-500/20 border border-rose-500/40 text-rose-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  <Trash2 size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm text-[#f2f2f3] truncate">{deleteModalUser.name}</span>
                  <span className="text-xs font-mono text-[#8b8b92] truncate">{deleteModalUser.email}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#26262a]">
                <button
                  type="button"
                  onClick={() => setDeleteModalUser(null)}
                  className="h-10 px-4 rounded-[4px] bg-[#1b1b1e] hover:bg-[#26262a] border border-[#26262a] text-xs font-mono font-bold text-[#8b8b92] hover:text-[#f2f2f3] cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={handleConfirmDeleteUser}
                  className="h-10 px-5 rounded-[4px] bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs uppercase tracking-wider active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  Excluir Registro
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
