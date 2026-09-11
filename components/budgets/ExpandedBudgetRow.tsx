import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { 
  Loader2, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  QrCode, 
  FileText, 
  Pencil, 
  Copy, 
  ExternalLink, 
  Check, 
  CheckCircle2, 
  Layers, 
  DollarSign,
  AlertCircle,
  RotateCcw,
  Trash2,
  Bell
} from "lucide-react";
import { WhatsAppIcon } from "../ui/WhatsAppIcon";
import { CURRENCY_FORMATTER } from "../../constants";

export interface ExpandedBudgetRowProps {
  budgetId: string;
  initialRow?: any;
  tab?: string;
  onEdit?: () => void;
  onShare?: () => void;
  onPdf?: () => void;
  onDuplicate?: () => void;
  onReminder?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  onConfirmHardDelete?: () => void;
}

export default function ExpandedBudgetRow({
  budgetId,
  initialRow,
  tab,
  onEdit,
  onShare,
  onPdf,
  onDuplicate,
  onReminder,
  onDelete,
  onRestore,
  onConfirmHardDelete,
}: ExpandedBudgetRowProps) {
  const [data, setData] = useState<any>(initialRow || null);
  const [loading, setLoading] = useState(!initialRow);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        if (!initialRow) setLoading(true);

        // 1. Carrega dados completos do orçamento
        const { data: bData, error: bErr } = await supabase
          .from("budgets")
          .select("*")
          .eq("id", budgetId)
          .maybeSingle();

        if (!isMounted) return;
        if (bErr) console.warn("Erro ao buscar orçamento:", bErr);

        const currentBudget = bData || initialRow || {};

        // 2. Carrega itens (tenta primeiro a tabela relacional budget_items, com fallback para o array items do budget)
        let itemsList: any[] = [];
        const { data: biData, error: biErr } = await supabase
          .from("budget_items")
          .select("*")
          .eq("budget_id", budgetId)
          .order("created_at", { ascending: true });

        if (!biErr && biData && biData.length > 0) {
          itemsList = biData;
        } else if (currentBudget?.items) {
          if (Array.isArray(currentBudget.items)) {
            itemsList = currentBudget.items;
          } else if (typeof currentBudget.items === "string") {
            try {
              itemsList = JSON.parse(currentBudget.items);
            } catch (e) {
              itemsList = [];
            }
          }
        }

        // 3. Carrega dados do cliente se client_id estiver disponível
        let clientData = null;
        if (currentBudget.client_id) {
          const { data: cData } = await supabase
            .from("clients")
            .select("*")
            .eq("id", currentBudget.client_id)
            .maybeSingle();
          if (cData) clientData = cData;
        }

        if (isMounted) {
          setData({
            ...currentBudget,
            client: clientData,
            resolvedItems: itemsList,
          });
        }
      } catch (err) {
        console.error("ExpandedBudgetRow load error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [budgetId, initialRow]);

  const copyToClipboard = async (text: string, type: "link" | "id") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "link") {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      }
    } catch {
      // Falha silenciosa
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 bg-black/30 border-t border-white/5 animate-fade-in">
        <Loader2 className="animate-spin text-[var(--gm-primary)]" size={26} />
        <span className="text-xs text-slate-400 font-medium">Carregando todas as informações do orçamento...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-black/30 border-t border-white/5 text-sm text-slate-400 flex items-center gap-2">
        <AlertCircle size={18} className="text-amber-500" />
        <span>Não foi possível carregar os dados detalhados deste orçamento.</span>
      </div>
    );
  }

  const items = data.resolvedItems || (Array.isArray(data.items) ? data.items : []);
  const client = data.client || {};
  const clientWhatsapp = client.whatsapp || client.phone || "";
  const cleanPhone = clientWhatsapp.replace(/\D/g, "");
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`}` : null;

  const createdDate = data.created_at ? new Date(data.created_at) : null;
  const isCreatedDateValid = Boolean(createdDate && !isNaN(createdDate.getTime()));

  const completedDate = data.completed_at ? new Date(data.completed_at) : null;
  const isCompletedDateValid = Boolean(completedDate && !isNaN(completedDate.getTime()));

  const status = String(data.status || "AGUARDANDO").toUpperCase();
  const isConcluido = status.includes("CONCLU");
  const isAprovado = status.includes("APROV");
  const isCancelado = status.includes("CANC");

  const subtotal = Number(data.subtotal || 0);
  const discount = Number(data.discount || 0);
  const total = Number(data.total_amount || 0);
  const discountPercent = subtotal > 0 && discount > 0 ? ((discount / subtotal) * 100).toFixed(1) : null;

  const isPix = String(data.payment_method || "").toUpperCase().includes("PIX");
  const installments = Number(data.installments || 1);
  const installmentValue = installments > 1 && total > 0 ? total / installments : null;

  return (
    <div className="p-5 sm:p-6 bg-[#0e0e11]/90 border-t border-white/10 text-sm text-slate-200 animate-fade-in flex flex-col gap-6 select-text">
      {/* 1. TOPO: IDENTIFICAÇÃO, STATUS, DATAS E PRAZOS */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Badge de Status */}
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 ${
              isConcluido
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : isAprovado
                ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                : isCancelado
                ? "bg-red-500/15 text-red-400 border-red-500/30"
                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {isConcluido ? "Concluído" : isAprovado ? "Aprovado" : isCancelado ? "Cancelado" : "Aguardando"}
          </span>

          {/* Tipo de Serviço */}
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/5 border border-white/10 text-slate-300">
            {data.type === "print" ? "Impressão Digital" : "Agência / Serviços"}
          </span>
        </div>

        {/* Datas e Prazos */}
        <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
          {isCreatedDateValid && createdDate && (
            <div className="flex items-center gap-1.5" title="Data de criação">
              <Calendar size={14} className="text-[var(--gm-primary)]" />
              <span><span className="text-[var(--gm-primary)] font-bold">Emissão:</span> <strong className="text-white font-mono">{createdDate.toLocaleDateString("pt-BR")}</strong></span>
            </div>
          )}
          {isCompletedDateValid && completedDate && (
            <div className="flex items-center gap-1.5" title="Data de conclusão">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span><span className="text-emerald-400 font-bold">Conclusão:</span> <strong className="text-white font-mono">{completedDate.toLocaleDateString("pt-BR")}</strong></span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-[var(--gm-primary)]" />
            <span><span className="text-[var(--gm-primary)] font-bold">Prazo:</span> <strong className="text-white">{data.delivery_days ?? 5} dias úteis</strong></span>
          </div>
          {data.validity_days && (
            <div className="flex items-center gap-1.5">
              <span><span className="text-[var(--gm-primary)] font-bold">Validade:</span> <strong className="text-white">{data.validity_days} dias</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* 2. DADOS DO CLIENTE E CONDIÇÕES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card do Cliente */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--gm-primary)]">
            <User size={15} />
            <span>Dados do Cliente</span>
          </div>
          <div className="text-base font-extrabold text-white">
            {(data.client_name || client.name || "CLIENTE NÃO INFORMADO").toUpperCase()}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
            {clientWhatsapp ? (
              <div className="flex items-center gap-1.5">
                <Phone size={13} className="text-emerald-400 shrink-0" />
                {waUrl ? (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>{clientWhatsapp}</span>
                    <ExternalLink size={11} />
                  </a>
                ) : (
                  <span>{clientWhatsapp}</span>
                )}
              </div>
            ) : (
              <div className="text-slate-500 flex items-center gap-1.5">
                <Phone size={13} className="shrink-0" />
                <span>Sem WhatsApp cadastrado</span>
              </div>
            )}

            {client.cpf_cnpj ? (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[var(--gm-primary)]">CPF/CNPJ:</span>
                <span className="text-white font-mono">{client.cpf_cnpj}</span>
              </div>
            ) : null}

            {client.email ? (
              <div className="flex items-center gap-1.5 sm:col-span-2">
                <Mail size={13} className="text-[var(--gm-primary)] shrink-0" />
                <span className="font-bold text-[var(--gm-primary)]">E-mail:</span>
                <span className="truncate text-white">{client.email}</span>
              </div>
            ) : null}

            {client.address ? (
              <div className="flex items-center gap-1.5 sm:col-span-2">
                <MapPin size={13} className="text-[var(--gm-primary)] shrink-0" />
                <span className="font-bold text-[var(--gm-primary)]">Endereço:</span>
                <span className="truncate text-white">{client.address}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Card de Pagamento & Faturamento */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--gm-primary)] mb-2">
              <CreditCard size={15} />
              <span>Condições de Pagamento</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 font-bold text-sm text-white">
                {isPix ? (
                  <>
                    <QrCode size={16} className="text-emerald-400" />
                    <span>Pagamento via PIX</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={16} className="text-sky-400" />
                    <span>Cartão de Crédito</span>
                  </>
                )}
              </span>

              {installments > 1 && (
                <span className="text-xs font-semibold text-slate-300">
                  {installments}x de {installmentValue ? CURRENCY_FORMATTER.format(installmentValue) : "-"}
                  {data.interest_rate ? ` (${data.interest_rate}% juros)` : " sem juros"}
                </span>
              )}
            </div>
          </div>

          {/* Link de pagamento se houver */}
          {data.payment_link ? (
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <span className="text-xs text-slate-400 truncate flex-1 font-mono">
                {data.payment_link}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(data.payment_link, "link")}
                className="px-2.5 py-1 text-xs rounded-md bg-white/5 hover:bg-white/10 text-[var(--gm-primary)] border border-white/10 flex items-center gap-1 shrink-0 font-bold"
                title="Copiar link de pagamento"
              >
                {copiedLink ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedLink ? "Copiado!" : "Copiar Link"}</span>
              </button>
              <a
                href={data.payment_link}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 text-xs rounded-md bg-[var(--gm-primary)]/15 hover:bg-[var(--gm-primary)]/25 text-[var(--gm-primary)] border border-[var(--gm-primary)]/30 flex items-center gap-1 shrink-0 font-bold"
                title="Abrir link de pagamento"
              >
                <span>Abrir</span>
                <ExternalLink size={12} />
              </a>
            </div>
          ) : null}
        </div>
      </div>

      {/* 3. ITENS DETALHADOS DO ORÇAMENTO */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--gm-primary)]">
            <Layers size={15} />
            <span>Itens do Orçamento ({items.length})</span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-slate-400 text-xs italic text-center">
            Nenhum item discriminado individualmente. O valor total refere-se ao serviço descrito no título.
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item: any, idx: number) => {
              const qty = Number(item.quantity ?? item.qty ?? 1);
              const unitPrice = Number(item.unit_price ?? item.unitPrice ?? 0);
              const width = Number(item.width_cm ?? item.width ?? 0);
              const height = Number(item.height_cm ?? item.height ?? 0);
              const pricePerM2 = Number(item.price_per_m2 ?? 0);
              const isArea = width > 0 && height > 0;
              const areaM2 = isArea ? (width * height) / 10000 : 0;

              const itemTotal = Number(
                item.total ??
                item.total_price ??
                (isArea && pricePerM2 > 0 ? areaM2 * pricePerM2 : qty * unitPrice) ??
                0
              );

              const desc = String(item.description || item.title || `Item ${idx + 1}`);

              return (
                <div
                  key={item.id || idx}
                  className="p-3.5 sm:p-4 rounded-xl bg-white/[0.025] hover:bg-white/[0.04] transition-colors border border-white/10 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs text-[var(--gm-primary)] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white leading-snug whitespace-pre-wrap">
                        {desc}
                      </div>

                      {/* Medidas / Cálculo por Área */}
                      {isArea && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap text-xs font-mono text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md w-fit">
                          <span>
                            Dimensões: {width} × {height} cm ({areaM2.toFixed(2)} m²)
                          </span>
                          {pricePerM2 > 0 && (
                            <span>• {CURRENCY_FORMATTER.format(pricePerM2)}/m²</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantidade, Valor Unitário e Subtotal do Item */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0 shrink-0 text-right">
                    <div className="text-xs text-slate-400">
                      {qty} un. × {CURRENCY_FORMATTER.format(unitPrice || (isArea && pricePerM2 ? areaM2 * pricePerM2 : 0))}
                    </div>
                    <div className="text-base font-extrabold text-white sm:mt-1">
                      {CURRENCY_FORMATTER.format(itemTotal)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. QUADRO RESUMO FINANCEIRO & VALOR TOTAL */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-white/[0.04] to-black/40 border border-white/12 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Valores Secundários (Subtotal, Desconto) */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-6 text-xs">
          <div>
            <div className="text-slate-400 uppercase font-black tracking-wider mb-0.5">Subtotal</div>
            <div className="font-bold text-slate-200 text-sm sm:text-base">
              {CURRENCY_FORMATTER.format(subtotal || total)}
            </div>
          </div>

          <div>
            <div className="text-slate-400 uppercase font-black tracking-wider mb-0.5">Desconto</div>
            <div className={`font-bold text-sm sm:text-base ${discount > 0 ? "text-red-400" : "text-slate-400"}`}>
              {discount > 0 ? `- ${CURRENCY_FORMATTER.format(discount)}` : "R$ 0,00"}
              {discountPercent ? ` (${discountPercent}%)` : ""}
            </div>
          </div>
        </div>

        {/* VALOR TOTAL EM DESTAQUE */}
        <div className="sm:text-right border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
          <div className="text-[var(--gm-primary)] text-xs uppercase font-black tracking-widest mb-1">
            Valor Total do Orçamento
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[var(--gm-primary)] drop-shadow-[0_0_12px_rgba(254,84,11,0.35)]">
            {CURRENCY_FORMATTER.format(total)}
          </div>
        </div>
      </div>

      {/* 5. AÇÕES RÁPIDAS DA EXPANSÃO */}
      <div className="flex flex-col gap-2 pt-3 w-full">
        {(tab === "CONCLUIDOS" || isConcluido) ? (
          /* CONCLUÍDOS: 4 BOTÕES (2 EM CIMA DE 2 BOTÕES), SEM LEMBRETES E SEM EDITAR */
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full">
            {/* LINHA DE CIMA: USAR MODELO + GERAR PDF */}
            {onDuplicate && (
              <button
                type="button"
                onClick={onDuplicate}
                className="h-11 sm:h-12 px-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 bg-[var(--gm-primary)] hover:bg-[var(--gm-primary)]/90 text-white shadow-[0_0_14px_rgba(246,90,26,0.35)] transition-all cursor-pointer border border-[var(--gm-primary)] active:scale-[0.98]"
                title="Usar este orçamento como modelo para criar um novo"
              >
                <Copy size={16} className="shrink-0" />
                <span className="truncate">Usar Modelo</span>
              </button>
            )}

            {onPdf && (
              <button
                type="button"
                onClick={onPdf}
                className="h-11 sm:h-12 px-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 hover:border-white/20 transition-all cursor-pointer active:scale-[0.98]"
                title="Visualizar ou gerar arquivo PDF oficial do orçamento"
              >
                <FileText size={16} className="text-[var(--gm-primary)] shrink-0" />
                <span className="truncate">Gerar PDF</span>
              </button>
            )}

            {/* LINHA DE BAIXO: WHATSAPP + LIXEIRA */}
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="h-11 sm:h-12 px-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/25 hover:border-emerald-500/40 transition-all cursor-pointer active:scale-[0.98]"
                title="Compartilhar orçamento via WhatsApp"
              >
                <WhatsAppIcon size={16} className="shrink-0" />
                <span className="truncate">WhatsApp</span>
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="h-11 sm:h-12 px-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/25 hover:border-red-500/40 transition-all cursor-pointer active:scale-[0.98]"
                title="Mover para a lixeira"
              >
                <Trash2 size={16} className="shrink-0" />
                <span className="truncate">Lixeira</span>
              </button>
            )}
          </div>
        ) : tab === "LIXEIRA" ? (
          <div className="grid grid-cols-2 gap-2 w-full pt-1">
            {onRestore && (
              <button
                type="button"
                onClick={onRestore}
                className="h-9 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer"
                title="Restaurar este orçamento"
              >
                <RotateCcw size={14} />
                <span>Restaurar</span>
              </button>
            )}
            {onConfirmHardDelete && (
              <button
                type="button"
                onClick={onConfirmHardDelete}
                className="h-9 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer"
                title="Excluir este orçamento definitivamente"
              >
                <Trash2 size={14} />
                <span>Excluir</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* BOTÕES LADO A LADO */}
            <div className="grid grid-cols-3 gap-2 w-full">
              {onPdf && (
                <button
                  type="button"
                  onClick={onPdf}
                  className="h-10 sm:h-11 px-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 hover:border-white/20 transition-all cursor-pointer truncate"
                  title="Visualizar ou gerar arquivo PDF oficial do orçamento"
                >
                  <FileText size={15} className="text-[var(--gm-primary)] shrink-0" />
                  <span className="truncate">Gerar PDF</span>
                </button>
              )}

              {onShare && (
                <button
                  type="button"
                  onClick={onShare}
                  className="h-10 sm:h-11 px-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer truncate"
                  title="Compartilhar orçamento via WhatsApp"
                >
                  <WhatsAppIcon size={16} className="shrink-0" />
                  <span className="truncate">WhatsApp</span>
                </button>
              )}

              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="h-10 sm:h-11 px-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 bg-[var(--gm-primary)]/10 hover:bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] hover:text-white border border-[var(--gm-primary)]/25 hover:border-[var(--gm-primary)]/50 transition-all cursor-pointer truncate"
                  title="Editar orçamento"
                >
                  <Pencil size={15} className="shrink-0" />
                  <span className="truncate">Editar</span>
                </button>
              )}
            </div>

            {/* AÇÕES COMPLEMENTARES LADO A LADO (LEMBRETES / LIXEIRA) */}
            {(onReminder || onDelete) && (
              <div className="grid grid-cols-2 gap-2 w-full pt-0.5">
                {onReminder && (
                  <button
                    type="button"
                    onClick={onReminder}
                    className="h-9 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                    title="Configurar lembretes"
                  >
                    <Bell size={14} className="text-amber-400 shrink-0" />
                    <span className="truncate">Lembretes</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="h-9 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 bg-red-500/[0.06] hover:bg-red-500/15 text-red-400 hover:text-red-300 border border-red-500/15 hover:border-red-500/30 transition-all cursor-pointer"
                    title="Mover para a lixeira"
                  >
                    <Trash2 size={14} className="shrink-0" />
                    <span className="truncate">Lixeira</span>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
