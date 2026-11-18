
import React, { useEffect, useMemo, useState } from "react";
import Select from "../../components/ui/Select";
import { supabase } from "../../lib/supabase";
import { X, Save, Loader2 } from "lucide-react";

import BudgetItemsEditor, { BudgetItemDraft, BudgetKind } from "../../components/budgets/BudgetItemsEditor";
import { toNumber } from "../../lib/money";
import { scheduleApprovedBudgetReminders, removeAlarmsForBudget } from "../../lib/alarmSystem";
import { getAppSettings } from "../../lib/settings";
import StatusPicker from "../../components/ui/StatusPicker";

type ClientSimple = { id: string; name: string };

type BudgetStatus = "AGUARDANDO" | "APROVADO" | "PRODUCAO" | "CONCLUIDO" | "CANCELADO";

type Props = {
  open: boolean;
  budgetId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

const STATUS_LABEL: Record<BudgetStatus, string> = {
  AGUARDANDO: "AGUARDANDO",
  APROVADO: "APROVADO",
  PRODUCAO: "PRODUÇÃO",
  CONCLUIDO: "CONCLUÍDOS",
  CANCELADO: "CANCELADOS",
};

function splitDesc(desc: string) {
  const raw = (desc || "").trim();
  const idx = raw.indexOf(" - ");
  if (idx === -1) return { title: raw.slice(0, 40) || "Item", description: "" };
  return { title: raw.slice(0, idx).trim() || "Item", description: raw.slice(idx + 3).trim() || "" };
}

export default function EditBudgetModal({ open, budgetId, onClose, onSuccess }: Props) {
  const [clients, setClients] = useState<ClientSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // form
  const [clientId, setClientId] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [status, setStatus] = useState<BudgetStatus>("AGUARDANDO");
  const [deliveryDays, setDeliveryDays] = useState<string>("5");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [budgetType, setBudgetType] = useState<BudgetKind>("agency");
  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CREDIT">("PIX");
  const [paymentLink, setPaymentLink] = useState<string>("");
  const [installments, setInstallments] = useState<number>(1);
  const [interestRate, setInterestRate] = useState<number>(0);
  const [items, setItems] = useState<BudgetItemDraft[]>([]);
  const [settings, setSettings] = useState<any>(null);

  const tenantId = useMemo(() => localStorage.getItem("tenant_id") || "", []);

  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => {
      if (budgetType === "print") {
        const area = (toNumber(it.width_cm) * toNumber(it.height_cm)) / 10000;
        return acc + area * toNumber(it.price_per_m2);
      }
      return acc + toNumber(it.qty || 1) * toNumber(it.unit_price);
    }, 0);
  }, [items, budgetType]);

  const discountValue = useMemo(() => toNumber(discountAmount), [discountAmount]);
  const discountPercentage = useMemo(() => (subtotal > 0 ? (discountValue / subtotal) * 100 : 0), [subtotal, discountValue]);

  const total = useMemo(() => Math.max(0, subtotal - discountValue), [subtotal, discountValue]);

  // Carrega settings + dados do orçamento
  useEffect(() => {
    if (!open || !budgetId) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);

        const s = await getAppSettings(tenantId);
        if (!alive) return;
        setSettings(s);

        // clientes (para dropdown)
        const { data: cData, error: cErr } = await supabase
          .from("clients")
          .select("id,name")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .order("name", { ascending: true });

        if (!alive) return;
        if (cErr) throw cErr;
        setClients((cData || []) as any);

        // orçamento
        const { data, error } = await supabase
          .from("budgets")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("id", budgetId)
          .maybeSingle();

        if (!alive) return;
        if (error) throw error;
        if (!data) throw new Error("Budget not found");

        setClientId(data.client_id || "");
        setClientName(data.client_name || "");
        setStatus((String(data.status || "AGUARDANDO").toUpperCase() as BudgetStatus) || "AGUARDANDO");

        // título (se existir, senão gera do primeiro item)
        const baseTitle = data.title || "";
        if (baseTitle) setTitle(baseTitle);
        else {
          const first = (data.items?.[0]?.description as string) || "";
          const sp = splitDesc(first);
          setTitle(sp.title || "Orçamento");
        }

        setDeliveryDays(String(data.delivery_days ?? 5));
        
        const loadedDiscountAmount = Number(data.discount ?? 0);
        setDiscountAmount(String(loadedDiscountAmount));

        // tipo (agency/print)
        const kind = (data.type || "agency") as BudgetKind;
        setBudgetType(kind === "print" ? "print" : "agency");

        setPaymentMethod((data.payment_method as "PIX" | "CREDIT") || "PIX");
        setPaymentLink(data.payment_link || "");
        setInstallments(Number(data.installments || 1));
        setInterestRate(Number(data.interest_rate || 0));

        // itens
        const mapped: BudgetItemDraft[] = (data.items || []).map((it: any) => {
          const desc = splitDesc(it.description || "");
          return {
            id: it.id || crypto.randomUUID(),
            title: it.title || desc.title,
            description: it.description || desc.description,
            qty: it.quantity ?? it.qty ?? 1,
            unit_price: it.unitPrice ?? it.unit_price ?? 0,

            width_cm: it.width_cm ?? it.width ?? 0,
            height_cm: it.height_cm ?? it.height ?? 0,
            price_per_m2: it.price_per_m2 ?? it.unitPrice ?? 0,
          } as any;
        });

        setItems(mapped.length ? mapped : [{ id: crypto.randomUUID(), title: "Item", description: "", qty: 1, unit_price: 0 } as any]);
      } catch (e) {
        console.error("EditBudgetModal load error", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, budgetId, tenantId]);

  // mantém clientName sincronizado ao trocar clientId
  useEffect(() => {
    if (!clientId) return;
    const c = clients.find((x) => x.id === clientId);
    if (c?.name) setClientName(c.name);
  }, [clientId, clients]);

  // Fecha com Escape
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  async function onSave() {
    if (!tenantId || !budgetId) return;

    setSaving(true);
    try {
      const payload: any = {
        tenant_id: tenantId,
        client_id: clientId,
        client_name: clientName,
        title: title || null,
        status,
        type: budgetType,

        items: items.map((it) => {
          // salva em formato compatível
          if (budgetType === "print") {
            return {
              id: it.id,
              description: `${it.title || "Item"} - ${it.description || ""}`.trim(),
              width_cm: toNumber((it as any).width_cm),
              height_cm: toNumber((it as any).height_cm),
              price_per_m2: toNumber((it as any).price_per_m2),
            };
          }

          return {
            id: it.id,
            description: `${it.title || "Item"} - ${it.description || ""}`.trim(),
            quantity: toNumber((it as any).qty || 1),
            unit_price: toNumber((it as any).unit_price),
          };
        }),

        subtotal,
        discount: discountValue,
        total_amount: total,
        delivery_days: toNumber(deliveryDays || 5),
        payment_method: paymentMethod,
        payment_link: paymentLink,
        installments: paymentMethod === "PIX" ? 1 : installments,
        interest_rate: paymentMethod === "PIX" ? 0 : interestRate,
      };

      const { error } = await supabase
        .from("budgets")
        .update(payload)
        .eq("tenant_id", tenantId)
        .eq("id", budgetId);

      if (error) throw error;

      // ✅ Notificação leve quando APROVADO ou PRODUCAO (3 horários das Configurações)
      if (status === "APROVADO" || status === "PRODUCAO") {
        scheduleApprovedBudgetReminders(budgetId, clientName || "Cliente", toNumber(deliveryDays || 5));
      } else if (status === "CONCLUIDO" || status === "CANCELADO" || (status as string) === "LIXEIRA" || status === "AGUARDANDO") {
        removeAlarmsForBudget(budgetId);
      }

      onSuccess();
    } catch (e) {
      console.error("EditBudgetModal save error", e);
      alert("Falha ao salvar orçamento. Verifique o Supabase.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl max-h-[90dvh] overflow-y-auto bg-[#131315] border border-[#26262A] rounded-[10px] custom-scrollbar flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#26262A] sticky top-0 bg-[#131315] z-10 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Editar Orçamento</h2>
            <div className="text-xs font-mono text-zinc-400 mt-0.5">
              {budgetId ? `#${budgetId.slice(0, 8)}` : ""}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-[4px] bg-[#1B1B1E] hover:bg-[#26262A] text-zinc-400 hover:text-white border border-[#26262A] transition-colors flex items-center justify-center cursor-pointer shrink-0"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 pb-8">
            {loading ? (
            <div className="flex items-center gap-3 text-zinc-400 p-4 justify-center h-48">
                <Loader2 className="animate-spin" size={24} />
                <span>Carregando informações...</span>
            </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Itens */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-[#0B0B0C] border border-[#26262A] rounded-md p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white">Itens</h3>
                            <div className="text-xs text-zinc-400">
                            Tipo: <b className="text-[var(--gm-primary)]">{budgetType === "print" ? "Comunicação Visual" : "Agência & Design"}</b>
                            </div>
                        </div>

                        <BudgetItemsEditor kind={budgetType} items={items} onChange={setItems} />
                    </div>
                </div>

                {/* Right: Dados */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#0B0B0C] border border-[#26262A] rounded-md p-5 space-y-5 sticky top-6">
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Cliente</label>
                            <Select
                                value={clientId}
                                onChange={(val) => setClientId(String(val))}
                                className="w-full h-11 bg-[#131315] border border-[#26262A] rounded-[6px] px-3 text-white outline-none focus:border-[var(--gm-primary)] transition-colors"
                                options={clients.map(c => ({ value: c.id, label: c.name }))}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Título</label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ex: Identidade Visual"
                                className="w-full h-11 bg-[#131315] border border-[#26262A] rounded-[6px] px-3 text-white outline-none focus:border-[var(--gm-primary)] transition-colors"
                            />
                        </div>

                        {/* Status */}
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Status</label>
                            <StatusPicker value={status as any} onChange={(v: any) => setStatus(v)} />
                            <div className="mt-2 text-xs text-zinc-400">
                                Atual: <b className="text-[var(--gm-primary)]">{STATUS_LABEL[status]}</b>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Pagamento</label>
                                <Select
                                    value={paymentMethod}
                                    onChange={(val) => setPaymentMethod(val as any)}
                                    className="w-full h-11 bg-[#131315] border border-[#26262A] rounded-[6px] px-3 text-white outline-none focus:border-[var(--gm-primary)] transition-colors"
                                    options={[
                                        { value: "PIX", label: "PIX" },
                                        { value: "CREDIT", label: "Cartão de Crédito" }
                                    ]}
                                />
                            </div>
                            {paymentMethod === "CREDIT" && (
                                <div className="sm:col-span-2 grid grid-cols-2 gap-3 bg-[#131315] p-3.5 rounded-md border border-[#26262A]">
                                    <div>
                                        <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Parcelas</label>
                                        <Select
                                            value={installments}
                                            onChange={(val) => setInstallments(Number(val))}
                                            className="w-full h-11 bg-[#0B0B0C] border border-[#26262A] rounded-[6px] px-3 text-white outline-none focus:border-[var(--gm-primary)] transition-colors"
                                            options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => ({ value: n, label: `${n}x` }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Juros (%)</label>
                                        <input
                                            type="number"
                                            value={interestRate}
                                            onChange={(e) => setInterestRate(Number(e.target.value))}
                                            onFocus={(e) => e.target.select()}
                                            min="0"
                                            max="100"
                                            className="w-full h-11 bg-[#0B0B0C] border border-[#26262A] rounded-[6px] px-3 text-white tabular-nums outline-none focus:border-[var(--gm-primary)] transition-colors"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Link de Pagamento (Opcional)</label>
                                        <input
                                            value={paymentLink}
                                            onChange={(e) => setPaymentLink(e.target.value)}
                                            placeholder="https://..."
                                            type="url"
                                            className="w-full h-11 bg-[#0B0B0C] border border-[#26262A] rounded-[6px] px-3 text-white outline-none focus:border-[var(--gm-primary)] transition-colors"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Prazo (dias)</label>
                                <input
                                    value={deliveryDays}
                                    onChange={(e) => setDeliveryDays(e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    type="number"
                                    min={0}
                                    className="w-full h-11 bg-[#131315] border border-[#26262A] rounded-[6px] px-3 text-white tabular-nums outline-none focus:border-[var(--gm-primary)] transition-colors"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Desconto (R$)</label>
                                <div className="relative">
                                    <input
                                        value={discountAmount}
                                        onChange={(e) => setDiscountAmount(e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                        type="number"
                                        min={0}
                                        className="w-full h-11 bg-[#131315] border border-[#26262A] rounded-[6px] px-3 text-white tabular-nums outline-none focus:border-[var(--gm-primary)] transition-colors pr-14"
                                    />
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold tabular-nums text-zinc-400 bg-[#1B1B1E] px-1.5 py-0.5 rounded-[4px] border border-[#26262A]">
                                        {discountPercentage.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Totais */}
                        <div className="border-t border-[#26262A] pt-4 space-y-2">
                            <div className="flex justify-between text-sm text-zinc-400">
                                <span>Subtotal</span>
                                <b className="text-white tabular-nums">
                                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(subtotal)}
                                </b>
                            </div>

                            {discountValue > 0 && (
                                <div className="flex justify-between text-sm text-emerald-400">
                                    <span>Desconto ({discountPercentage.toFixed(1)}%)</span>
                                    <b className="font-semibold tabular-nums">
                                        -{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(discountValue)}
                                    </b>
                                </div>
                            )}

                            <div className="flex justify-between items-baseline text-sm text-zinc-400 pt-2">
                                <span>Total</span>
                                <b className="text-2xl text-[var(--gm-primary)] tabular-nums">
                                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}
                                </b>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 h-11 rounded-[6px] font-bold text-xs uppercase tracking-wider bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] text-[#F2F2F3] transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                            >
                                <X size={16} />
                                <span>Cancelar</span>
                            </button>

                            <button
                                type="button"
                                onClick={onSave}
                                disabled={saving}
                                className="flex-1 h-11 rounded-[6px] font-black text-xs uppercase tracking-wider bg-[var(--gm-btn-bg,var(--gm-primary,#FE540B))] hover:brightness-110 text-[var(--gm-primary-foreground,#0B0B0C)] border border-[var(--gm-btn-border,var(--gm-primary,#FE540B))] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:bg-[#18181B] disabled:border-[#26262A] disabled:text-[#52525B] disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                            >
                                {saving ? <Loader2 className="animate-spin text-current" size={18} /> : <Save size={18} className="text-current" />}
                                <span>{saving ? "Salvando..." : "Salvar"}</span>
                            </button>
                        </div>

                        <div className="text-[11px] text-zinc-500 text-center">
                            * Lembrete “APROVADO” usa seus 3 horários em Configurações.
                        </div>

                        {/* Espaço mínimo no final do card */}
                        <div className="w-full h-2 pointer-events-none select-none" aria-hidden="true" />
                    </div>
                </div>
            </div>
            )}
        </div>
      </div>
    </div>
  );
}
