import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Select from "../../components/ui/Select";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../store/AuthContext";
import {
  Palette,
  Printer,
  X,
  Plus,
  Trash2,
  Calculator,
  Tag,
  ArrowLeft,
  Check,
  CheckCircle2,
  CreditCard,
  Wallet,
  Clock,
  Brush,
  Eraser,
  Save,
  ChevronUp,
  ChevronDown,
  ArrowRight,
} from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  budgetToEditId?: string | null; // ✅ Modo edição
  duplicateFromBudgetId?: string | null; // ✅ Modo usar como modelo
};

type ClientRow = { id: string; name: string };
type BudgetKind = "agency" | "print";
type Step = "pick" | "form";
type PayMethod = "PIX" | "CREDIT";

type BudgetItemDraft = {
  id: string;
  description: string;
  isAreaCalc: boolean;
  quantity: number;
  unitPrice: number;
  width: number;
  height: number;
  pricePerM2: number;
  deliveryTime: string;
  artworkIncluded: boolean;
  total: number;
};

function money(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v || 0);
}
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Helper para extrair dados da descrição salva (Engenharia reversa do texto)
function parseDescription(fullDesc: string) {
  // Padrão antigo: "Descrição... \n\nPrazo: X dias • Arte Inclusa: Sim"
  // Padrão novo: "Descrição... \n\nArte Inclusa: Sim"
  
  let description = fullDesc;
  let deliveryTime = "3 dias";
  let artworkIncluded = false;

  if (fullDesc.includes("Prazo:")) {
    const parts = fullDesc.split("Prazo:");
    description = parts[0].trim();
    const metaPart = parts[1];
    const metaSplit = metaPart.split("• Arte Inclusa:");
    if (metaSplit.length > 0) deliveryTime = metaSplit[0].trim();
    if (metaSplit.length > 1) {
      artworkIncluded = metaSplit[1].trim() === "Sim";
    }
  } else if (fullDesc.includes("Arte Inclusa:")) {
    const parts = fullDesc.split("Arte Inclusa:");
    description = parts[0].trim();
    artworkIncluded = parts[1].trim() === "Sim";
  }

  description = description.replace(/\n+$/, "");

  return { description, deliveryTime, artworkIncluded };
}

function isMissingColumnError(err: any) {
  const msg = String(err?.message || "");
  return msg.includes("Could not find the") || String(err?.code || "") === "PGRST204";
}

function stripMissingColumn(payload: any, err: any) {
  const msg = String(err?.message || "");
  const m = msg.match(/Could not find the '(.+?)' column/);
  const col = m?.[1];
  if (col && payload && Object.prototype.hasOwnProperty.call(payload, col)) {
    const next = { ...payload };
    delete next[col];
    return next;
  }
  return payload;
}

async function upsertBudgetWithAutoStrip(payload: any, id?: string) {
  let current = { ...payload };

  for (let i = 0; i < 6; i++) {
    const qRetry = id
      ? supabase.from("budgets").update(current).eq("id", id)
      : supabase.from("budgets").insert(current);

    const res = await qRetry.select().single();
    if (!res.error) return res.data;

    if (isMissingColumnError(res.error)) {
      const next = stripMissingColumn(current, res.error);
      if (JSON.stringify(next) === JSON.stringify(current)) throw res.error;
      current = next;
      continue;
    }
    throw res.error;
  }
  throw new Error("Falha ao salvar orçamento (schema incompatível).");
}

async function insertItemsWithAutoStrip(items: any[]) {
  if (items.length === 0) return;
  let currentItems = [...items];

  for (let i = 0; i < 6; i++) {
    const res = await supabase.from("budget_items").insert(currentItems);
    if (!res.error) return;

    if (isMissingColumnError(res.error)) {
      const msg = String(res.error?.message || "");
      const m = msg.match(/Could not find the '(.+?)' column/);
      const col = m?.[1];

      if (col) {
        const nextItems = currentItems.map((it) => {
          const c = { ...it };
          delete c[col];
          return c;
        });
        if (JSON.stringify(nextItems) === JSON.stringify(currentItems)) throw res.error;
        currentItems = nextItems;
        continue;
      }
    }
    throw res.error;
  }
}

// --- STYLES ---
const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000000,
  background: "rgba(0, 0, 0, 0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
};

const fullScreenContainer: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000000,
  background: "#09090b",
  color: "#f4f4f5",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const topBar: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 50,
  background: "rgba(24, 24, 27, 0.95)",
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  padding: "16px 24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
};

const pageContent: React.CSSProperties = {
  flex: 1,
  width: "100%",
  maxWidth: "1100px",
  margin: "0 auto",
  // ✅ mais espaço no final + safe-area (iPhone/Android gesture bar)
  padding: "32px 24px calc(160px + env(safe-area-inset-bottom, 0px)) 24px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#94a3b8",
  marginBottom: 16,
  marginTop: 32,
};

const card: React.CSSProperties = {
  background: "rgba(24, 24, 27, 0.75)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

const labelTop: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#94a3b8",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.025em",
};

const inputBig: React.CSSProperties = {
  width: "100%",
  background: "rgba(0, 0, 0, 0.4)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 10,
  padding: "12px 14px",
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: 500,
  outline: "none",
  transition: "all 0.2s",
};

const itemRow: React.CSSProperties = {
  background: "rgba(24, 24, 27, 0.6)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 14,
  padding: 20,
  marginBottom: 16,
  position: "relative",
};

export default function NewBudgetModal({ open, onClose, onSuccess, budgetToEditId, duplicateFromBudgetId }: Props) {
  const { tenantId } = useAuth();

  const [step, setStep] = useState<Step>("pick");
  const [kind, setKind] = useState<BudgetKind>("agency");

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");

  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("PIX");
  const [paymentLink, setPaymentLink] = useState<string>("");
  const [installments, setInstallments] = useState<number>(1);
  const [interestRate, setInterestRate] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [validityDays, setValidityDays] = useState<number>(5);
  const [deliveryDays, setDeliveryDays] = useState<number>(5);

  const [items, setItems] = useState<BudgetItemDraft[]>([]);
  const [barPosition, setBarPosition] = useState(16); // Posição padrão em px da base
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = React.useRef(0);
  const dragStartPos = React.useRef(0);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    // Se clicou em botão, não arrasta
    if ((e.target as HTMLElement).closest('button')) return;
    
    setIsDragging(true);
    const y = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    dragStartY.current = y;
    dragStartPos.current = barPosition;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const deltaY = dragStartY.current - y;
      setBarPosition(Math.max(10, Math.min(600, dragStartPos.current + deltaY)));
    };

    const handleEnd = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, barPosition]);

  const itemsEndRef = React.useRef<HTMLDivElement | null>(null);
  const lastDescRef = React.useRef<HTMLTextAreaElement | null>(null);

  const resetForm = () => {
    setStep("pick");
    setKind("agency");
    setClientId("");
    setClientName("");
    setPaymentMethod("PIX");
    setPaymentLink("");
    setInstallments(1);
    setInterestRate(0);
    setDiscountAmount(0);
    setValidityDays(5);
    setDeliveryDays(5);
    setItems([]);
    setSaving(false);
  };

  // Carregar clientes
  useEffect(() => {
    if (!tenantId) return;
    
    (async () => {
      setLoadingClients(true);
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("id,name")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .order("name", { ascending: true });

        if (error) console.error(error);
        setClients((data || []) as any);
      } finally {
        setLoadingClients(false);
      }
    })();
  }, [tenantId]);

  // Atualiza clientName ao selecionar
  useEffect(() => {
    if (!clientId) return;
    const found = clients.find((c) => c.id === clientId);
    setClientName(found?.name || "");
  }, [clientId, clients]);

  // Modo edição ou modo modelo: carregar orçamento
  const targetId = budgetToEditId || duplicateFromBudgetId;
  useEffect(() => {
    if (!targetId || !tenantId || !open) return;

    setLoadingData(true);
    setStep("form");

    (async () => {
      try {
        const { data: budget, error } = await supabase
          .from("budgets")
          .select("*, items:budget_items(*)")
          .eq("id", targetId)
          .single();

        if (error) throw error;

        setKind((budget.type as BudgetKind) || "agency");
        setClientId(budget.client_id || "");
        setClientName(budget.client_name || "");
        setPaymentMethod((budget.payment_method as PayMethod) || "PIX");
        setPaymentLink(budget.payment_link || "");
        setInstallments(Number(budget.installments || 1));
        setInterestRate(Number(budget.interest_rate || 0));
        setValidityDays(Number(budget.validity_days || 5));
        setDeliveryDays(Number(budget.delivery_days || 5));
        
        const loadedDiscountAmount = Number(budget.discount || 0);
        setDiscountAmount(loadedDiscountAmount);

        const loadedItems: BudgetItemDraft[] = ((budget.items || []) as any[]).map((it) => {
          const parsed = parseDescription(String(it.description || ""));
          const isPrint = (budget.type as BudgetKind) === "print";
          const isAreaCalc = isPrint && (Number(it.width_cm || it.width || 0) > 0 || Number(it.height_cm || it.height || 0) > 0);

          return {
            id: crypto.randomUUID(),
            description: parsed.description || "",
            isAreaCalc: !!isAreaCalc,
            quantity: Number(it.quantity || 1),
            unitPrice: Number(it.unit_price || 0),
            width: Number(it.width_cm || it.width || 0),
            height: Number(it.height_cm || it.height || 0),
            pricePerM2: Number(it.price_per_m2 || 0),
            deliveryTime: parsed.deliveryTime || "3 dias",
            artworkIncluded: !!parsed.artworkIncluded,
            total: Number(it.total || 0),
          };
        });

        setItems(loadedItems.length ? loadedItems : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    })();
  }, [targetId, tenantId, open]);

  const applyTemplate = (nextKind: BudgetKind) => {
    setKind(nextKind);
    const isPrint = nextKind === "print";

    // "Páginas predefinidas" = itens-base prontos para editar
    const base: BudgetItemDraft[] = isPrint
      ? [
          {
            id: crypto.randomUUID(),
            description: "Lona/Adesivo (m²) — descreva material e acabamento",
            isAreaCalc: true,
            quantity: 1,
            unitPrice: 0,
            width: 100,
            height: 100,
            pricePerM2: 0,
            deliveryTime: "3 dias",
            artworkIncluded: false,
            total: 0,
          },
        ]
      : [
          {
            id: crypto.randomUUID(),
            description: "Serviço 01 — ex: Identidade Visual / Social Media / Motion",
            isAreaCalc: false,
            quantity: 1,
            unitPrice: 0,
            width: 0,
            height: 0,
            pricePerM2: 0,
            deliveryTime: "3 dias",
            artworkIncluded: true,
            total: 0,
          },
        ];

    const recalced = base.map((it) => {
      const next = { ...it };
      if (isPrint && next.isAreaCalc) {
        const area = (Number(next.width || 0) * Number(next.height || 0)) / 10000;
        next.total = area * Number(next.pricePerM2 || 0) * Number(next.quantity || 1);
      } else {
        next.total = Number(next.quantity || 1) * Number(next.unitPrice || 0);
      }
      return next;
    });

    setItems(recalced);
    setStep("form");
  };

  const handleAddItem = () => {
    const isPrint = kind === "print";
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: "",
        isAreaCalc: isPrint,
        quantity: 1,
        unitPrice: 0,
        width: 0,
        height: 0,
        pricePerM2: 0,
        deliveryTime: "3 dias",
        artworkIncluded: false,
        total: 0,
      },
    ]);
  };

  useEffect(() => {
    if (items.length === 0) return;

    // rola para o final
    requestAnimationFrame(() => {
      itemsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });

      // foca na descrição do último item
      setTimeout(() => {
        lastDescRef.current?.focus();
      }, 120);
    });
  }, [items.length]);

  const updateItem = (id: string, patch: Partial<BudgetItemDraft>) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const next = { ...it, ...patch };

        if (kind === "print" && next.isAreaCalc) {
          const area = (Number(next.width || 0) * Number(next.height || 0)) / 10000;
          next.total = area * Number(next.pricePerM2 || 0) * Number(next.quantity || 1);
        } else {
          next.total = Number(next.quantity || 1) * Number(next.unitPrice || 0);
        }
        return next;
      })
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const subtotal = useMemo(() => items.reduce((acc, it) => acc + it.total, 0), [items]);

  const discountPercentage = useMemo(() => (subtotal > 0 ? (discountAmount / subtotal) * 100 : 0), [subtotal, discountAmount]);

  const totalFinal = useMemo(() => {
    const afterDiscount = subtotal - discountAmount;

    if (paymentMethod === "PIX") return afterDiscount;
    const rate = clamp(Number(interestRate) || 0, 0, 200) / 100;
    return afterDiscount * (1 + rate);
  }, [subtotal, paymentMethod, interestRate, discountAmount]);

  async function handleSave() {
    if (!tenantId) return alert("Erro de autenticação.");
    if (!clientId) return alert("Selecione um cliente.");

    const validItems = items.filter((it) => it.description.trim().length > 0);
    if (validItems.length === 0) return alert("Adicione itens com descrição.");

    setSaving(true);

    try {
      const budgetPayload: any = {
        tenant_id: tenantId,
        client_id: clientId,
        client_name: clientName,
        status: budgetToEditId ? undefined : "AGUARDANDO",
        type: kind,
        subtotal: subtotal,
        discount: discountAmount,
        total_amount: totalFinal,
        delivery_days: deliveryDays,
        validity_days: validityDays,
        payment_method: paymentMethod,
        payment_link: paymentLink,
        installments: paymentMethod === "PIX" ? 1 : installments,
        interest_rate: paymentMethod === "PIX" ? 0 : interestRate,
      };

      const budgetData = await upsertBudgetWithAutoStrip(budgetPayload, budgetToEditId || undefined);
      const finalBudgetId = budgetData?.id;
      if (!finalBudgetId) throw new Error("Sem ID retornado.");

      if (budgetToEditId) {
        await supabase.from("budget_items").delete().eq("budget_id", finalBudgetId);
      }

      const dbItems = validItems.map((it) => {
        const extraInfo = `\n\nPrazo: ${deliveryDays} dias • Arte Inclusa: ${
          it.artworkIncluded ? "Sim" : "Não"
        }`;
        const finalDescription = (it.description + extraInfo).trim();

        if (kind === "print" && it.isAreaCalc) {
          const area = (Number(it.width) * Number(it.height)) / 10000;
          return {
            tenant_id: tenantId,
            budget_id: finalBudgetId,
            description: finalDescription,
            service_type: "IMPRESSAO",
            width: it.width,
            height: it.height,
            width_cm: it.width,
            height_cm: it.height,
            quantity: it.quantity,
            price_per_m2: it.pricePerM2,
            unit_price: area * it.pricePerM2,
            total: it.total,
          };
        } else {
          return {
            tenant_id: tenantId,
            budget_id: finalBudgetId,
            description: finalDescription,
            service_type: kind === "agency" ? "AGENCIA" : "IMPRESSAO",
            quantity: it.quantity,
            unit_price: it.unitPrice,
            total: it.total,
            width: 0,
            height: 0,
          };
        }
      });

      await insertItemsWithAutoStrip(dbItems);

      // PDF Auto removido conforme solicitado
      if (!budgetToEditId) resetForm();
      onSuccess();
    } catch (err: any) {
      console.error(err);
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return <div style={{ display: "none" }} />;

  // --- PICK SCREEN ---
  if (step === "pick" && !budgetToEditId) {
    return createPortal(
      <div style={overlay} onClick={onClose}>
        <div
          className="w-full max-w-[800px] p-8 md:p-10 rounded-2xl gm-modal gm-card bg-[var(--gm-surface)] border-none text-white shadow-2xl animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">Novo Orçamento</h2>
              <p className="text-base font-medium text-slate-300">Selecione o modelo de proposta ideal para este projeto.</p>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer">
              <X size={22} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              className="group relative p-6 rounded-xl border border-white/10 bg-zinc-800/60 hover:bg-zinc-800 hover:border-[var(--gm-primary)]/60 transition-all text-left flex flex-col gap-4 shadow-lg cursor-pointer"
              onClick={() => applyTemplate("agency")}
            >
              <div className="w-14 h-14 rounded-xl bg-[var(--gm-primary)]/15 text-[var(--gm-primary)] flex items-center justify-center border border-[var(--gm-primary)]/30 group-hover:scale-110 transition-transform">
                <Palette size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-[var(--gm-primary)] transition-colors">
                  Agência & Design
                </h3>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed font-medium">
                  Orçamentos baseados em serviços, artes digitais e criação.
                </p>
              </div>
            </button>

            <button
              className="group relative p-6 rounded-xl border border-white/10 bg-zinc-800/60 hover:bg-zinc-800 hover:border-[var(--gm-primary)]/60 transition-all text-left flex flex-col gap-4 shadow-lg cursor-pointer"
              onClick={() => applyTemplate("print")}
            >
              <div className="w-14 h-14 rounded-xl bg-[var(--gm-primary)]/15 text-[var(--gm-primary)] flex items-center justify-center border border-[var(--gm-primary)]/30 group-hover:scale-110 transition-transform">
                <Printer size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-[var(--gm-primary)] transition-colors">
                  Impressão & Gráfica
                </h3>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed font-medium">
                  Cálculo de Lonas (m²) e Materiais Gráficos (Panfletos, Cartões).
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // --- FORM SCREEN ---
  return createPortal(
    <div style={fullScreenContainer}>
      <div style={topBar}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {!budgetToEditId && (
              <button onClick={() => setStep("pick")} className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/10">
                <ArrowLeft size={22} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-white leading-none">
                  {budgetToEditId ? "Editar Proposta" : duplicateFromBudgetId ? "Novo Orçamento (Usando Modelo)" : "Criar Proposta"}
                </h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      kind === "agency"
                        ? "border-[var(--gm-primary)]/30 text-[var(--gm-primary)] bg-[var(--gm-primary)]/10"
                        : "border-[var(--gm-accent)]/30 text-[var(--gm-accent)] bg-[var(--gm-accent)]/10"
                    }`}
                  >
                    {kind === "agency" ? "AGÊNCIA" : "IMPRESSÃO GRÁFICA"}
                  </span>
                </div>
              </div>
              {loadingData && <span className="text-[10px] text-slate-400 animate-pulse ml-2 font-medium">Carregando...</span>}
            </div>
          </div>
        </div>

        <button onClick={() => { onClose(); if (!budgetToEditId) resetForm(); }} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer">
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto w-full" style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
        <div style={pageContent}>
          <div className="flex flex-col gap-6">
            {/* 01. CLIENTE */}
          <div style={{ ...card, position: "relative", zIndex: 40 }}>
            <div style={labelTop} className="flex justify-between">
              <span>01. Cliente</span>
            </div>
            <Select
              style={inputBig}
              value={clientId}
              onChange={(val) => setClientId(String(val))}
              disabled={loadingClients || loadingData}
              className="cursor-pointer hover:bg-white/5 focus:bg-black/40 focus:border-[var(--gm-primary)]"
              placeholder={loadingClients ? "Carregando..." : "Selecione o cliente..."}
              options={clients.map(c => ({ value: c.id, label: c.name }))}
              searchable={true}
            />
          </div>

          {/* 02. ITENS */}
          <div style={{ position: "relative", zIndex: 20 }}>
            <div className="flex items-center justify-between mb-4">
              <div style={sectionTitle} className="!mb-0 !marginTop-0">
                02. Itens da Proposta
              </div>
              <button
                onClick={handleAddItem}
                className="text-xs font-bold px-3 py-1.5 rounded bg-[var(--gm-primary)]/10 text-[var(--gm-primary)] border border-[var(--gm-primary)]/20 hover:bg-[var(--gm-primary)]/20 transition-all flex items-center gap-1"
              >
                <Plus size={14} /> Adicionar Item
              </button>
            </div>

            {items.length === 0 && (
              <div className="p-8 border border-dashed border-white/10 rounded-lg text-center text-slate-500">
                <div className="font-bold text-white mb-1">Comece com um template</div>
                <div className="text-sm mb-4">
                  Já deixei uma proposta-base pronta (editável) para {kind === "agency" ? "AGÊNCIA" : "IMPRESSÃO GRÁFICA"}.
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => applyTemplate(kind)}
                    className="px-4 py-2 rounded-xl font-bold text-xs bg-[var(--gm-primary)]/15 text-[var(--gm-primary)] border border-[var(--gm-primary)]/25 hover:bg-[var(--gm-primary)]/25 transition-all"
                  >
                    Usar páginas predefinidas
                  </button>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-4 py-2 rounded-xl font-bold text-xs bg-black/20 text-slate-300 border border-white/10 hover:bg-white/5 transition-all"
                  >
                    Adicionar item manual
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={item.id} style={itemRow} className="group hover:border-white/10 transition-colors">
                  <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-white/10 text-xs font-bold flex items-center justify-center text-slate-300">
                        {idx + 1}
                      </div>

                      {kind === "print" && (
                        <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 gap-1">
                          <button
                            type="button"
                            onClick={() => updateItem(item.id, { isAreaCalc: true })}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 group ${
                              item.isAreaCalc ? "bg-[var(--gm-primary)] text-white shadow-md" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            }`}
                          >
                            <Calculator size={14} className={item.isAreaCalc ? "animate-pulse" : "group-hover:rotate-12 transition-transform"} />
                            Comunicação Visual
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItem(item.id, { isAreaCalc: false })}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 group ${
                              !item.isAreaCalc ? "bg-white/10 text-white shadow-md" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            }`}
                          >
                            <Tag size={14} className={!item.isAreaCalc ? "animate-pulse" : "group-hover:-rotate-12 transition-transform"} />
                            Materiais Gráficos
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-500/50 hover:text-red-500 p-1 rounded hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mb-4">
                    <label style={labelTop}>Descrição do Serviço / Produto</label>
                    <textarea
                      ref={idx === items.length - 1 ? lastDescRef : undefined}
                      style={{ ...inputBig, minHeight: 80, resize: "vertical" }}
                      placeholder={
                        kind === "print"
                          ? item.isAreaCalc
                            ? "Ex: Lona Frontlight 440g com ilhós"
                            : "Ex: 1000 Panfletos 10x15cm Couchê 90g"
                          : "Ex: Criação de Identidade Visual Completa"
                      }
                      value={item.description}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 items-end">
                    <div>
                      <label style={labelTop}>
                        <Brush size={10} className="inline mr-1" /> Arte Inclusa?
                      </label>
                      <div className="flex bg-black/40 rounded-lg p-1 border border-white/10 h-[42px] items-center">
                        <button
                          onClick={() => updateItem(item.id, { artworkIncluded: true })}
                          className={`flex-1 h-full rounded text-xs font-bold transition-all ${
                            item.artworkIncluded ? "bg-[var(--gm-accent)] text-white" : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          Sim
                        </button>
                        <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
                        <button
                          onClick={() => updateItem(item.id, { artworkIncluded: false })}
                          className={`flex-1 h-full rounded text-xs font-bold transition-all ${
                            !item.artworkIncluded ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          Não
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-4 items-end">
                    {kind === "print" && item.isAreaCalc && (
                      <>
                        <div className="col-span-6 sm:col-span-3">
                          <label style={labelTop}>Largura (cm)</label>
                          <input
                            type="number"
                            style={inputBig}
                            value={item.width}
                            onChange={(e) => updateItem(item.id, { width: Number(e.target.value) })}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-3">
                          <label style={labelTop}>Altura (cm)</label>
                          <input
                            type="number"
                            style={inputBig}
                            value={item.height}
                            onChange={(e) => updateItem(item.id, { height: Number(e.target.value) })}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-3">
                          <label style={labelTop}>R$ por m²</label>
                          <input
                            type="number"
                            style={inputBig}
                            value={item.pricePerM2}
                            onChange={(e) => updateItem(item.id, { pricePerM2: Number(e.target.value) })}
                            onFocus={(e) => e.target.select()}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-3">
                          <label style={labelTop}>Qtd</label>
                          <input
                            type="number"
                            style={inputBig}
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                            onFocus={(e) => e.target.select()}
                            placeholder="1"
                          />
                        </div>
                      </>
                    )}

                    {!item.isAreaCalc && (
                      <>
                        <div className="col-span-4 sm:col-span-3">
                          <label style={labelTop}>Quantidade</label>
                          <input
                            type="number"
                            style={inputBig}
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                            onFocus={(e) => e.target.select()}
                            placeholder="1"
                          />
                        </div>
                        <div className="col-span-8 sm:col-span-4">
                          <label style={labelTop}>Valor Unitário (R$)</label>
                          <input
                            type="number"
                            style={inputBig}
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })}
                            onFocus={(e) => e.target.select()}
                            placeholder="0.00"
                          />
                        </div>
                      </>
                    )}

                    <div className={`${kind === "print" && item.isAreaCalc ? "col-span-12" : "col-span-12 sm:col-span-5"} flex justify-end items-center h-[50px]`}>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total do Item</div>
                        <div className="text-xl font-bold text-white">{money(item.total)}</div>
                        {kind === "print" && item.isAreaCalc && (
                          <div className="text-[10px] text-slate-500">
                            {((item.width * item.height) / 10000).toFixed(2)} m² total
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={itemsEndRef} />
            </div>
          </div>

          {/* 03. RESUMO FINANCEIRO */}
          <div style={{ ...card, position: "relative", zIndex: 10 }}>
            <div style={labelTop} className="mb-4">
              03. Resumo Financeiro & Pagamento
            </div>

            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <label style={labelTop}>Forma de Pagamento</label>

                {(() => {
                  const preset =
                    paymentMethod === "PIX"
                      ? "PIX"
                      : "CREDIT";

                  const pill = (active: boolean) =>
                    `p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                      active
                        ? "bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] border-[var(--gm-primary)]/50 shadow-md"
                        : "bg-black/30 text-slate-400 border-white/10 hover:bg-white/5 hover:text-white"
                    }`;

                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod("PIX");
                            setInstallments(1);
                            setInterestRate(0);
                          }}
                          className={pill(preset === "PIX")}
                        >
                          <Wallet size={24} />
                          <span className="font-bold text-sm">PIX</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod("CREDIT");
                            if (!installments || installments < 2) setInstallments(4);
                          }}
                          className={pill(preset === "CREDIT")}
                        >
                          <CreditCard size={24} />
                          <span className="font-bold text-sm">Cartão de crédito</span>
                        </button>
                      </div>

                      {paymentMethod === "CREDIT" && (
                        <div className="flex flex-col gap-3 animate-fade-in bg-black/20 p-4 rounded-xl border border-white/5">
                          <div className="grid grid-cols-2 gap-3 items-end">
                            <div>
                              <label style={labelTop}>Parcelas</label>
                              <Select 
                                style={inputBig} 
                                value={installments} 
                                onChange={(val) => setInstallments(Number(val))}
                                options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map(n => ({ value: n, label: `${n}x` }))}
                              />
                            </div>
                            <div>
                              <label style={labelTop}>Juros (%)</label>
                              <input
                                type="number"
                                style={inputBig}
                                value={interestRate}
                                onChange={(e) => setInterestRate(Number(e.target.value))}
                                onFocus={(e) => e.target.select()}
                                placeholder="0"
                              />
                            </div>
                          </div>
                          <div>
                            <label style={labelTop}>Link de Pagamento (Opcional)</label>
                            <input 
                              type="url" 
                              placeholder="https://..."
                              style={inputBig} 
                              value={paymentLink} 
                              onChange={e => setPaymentLink(e.target.value)} 
                            />
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                <div className="mt-4 grid grid-cols-3 gap-4 items-end">
                  <div>
                    <label style={labelTop}>Desconto (R$)</label>
                    <div className="relative">
                      <input
                        type="number"
                        style={inputBig}
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="pr-12"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-white/10 px-1.5 py-0.5 rounded border border-white/10">
                        {discountPercentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={labelTop}>Validade (Dias)</label>
                    <input
                      type="number"
                      style={inputBig}
                      value={validityDays}
                      onChange={(e) => setValidityDays(Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <label style={labelTop}>Entrega (Dias)</label>
                    <input
                      type="number"
                      style={inputBig}
                      value={deliveryDays}
                      onChange={(e) => setDeliveryDays(Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      placeholder="5"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 md:border-l md:border-white/10 md:pl-8 flex flex-col justify-center gap-3">
                <div className="flex justify-between text-sm text-slate-400">
                  <span className="font-medium">Subtotal</span>
                  <span className="text-white font-bold">{money(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-400 font-semibold">
                    <span>Desconto ({discountPercentage.toFixed(1)}%)</span>
                    <span>-{money(discountAmount)}</span>
                  </div>
                )}
                {paymentMethod === "CREDIT" && interestRate > 0 && (
                  <div className="flex justify-between text-sm text-[var(--gm-primary)] font-semibold">
                    <span>Juros ({interestRate}%)</span>
                    <span>+{money(totalFinal - (subtotal - discountAmount))}</span>
                  </div>
                )}
                <div className="border-t border-white/10 pt-4 mt-2">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-widest block mb-1">Total Final</span>
                    <span className="text-3xl font-extrabold text-[var(--gm-primary)]">{money(totalFinal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 04. AÇÕES */}
      <div
        className={`p-3.5 sm:p-5 rounded-2xl bg-[#18181b]/95 backdrop-blur-xl border border-white/20 text-white flex flex-row items-center justify-between gap-3 shadow-2xl z-50 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{
          position: "fixed",
          left: 12,
          right: 12,
          bottom: `calc(${barPosition}px + env(safe-area-inset-bottom, 0px))`,
          maxWidth: 1052,
          margin: "0 auto",
          transition: isDragging ? "none" : "bottom 0.3s ease",
          touchAction: "none",
        }}
      >
        {/* Drag Handle Visual */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full" />

        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center shrink-0">
            <CheckCircle2 size={26} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-white font-bold text-sm sm:text-base leading-tight">
              {budgetToEditId ? "Atualizar Proposta?" : "Pronto para finalizar?"}
            </div>
            <div className="hidden sm:block text-slate-400 text-[10px] uppercase tracking-wider font-medium mt-0.5">
              Confira os valores antes de salvar
            </div>
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); handleSave(); }}
          disabled={saving}
          className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm bg-[var(--gm-primary)] text-white shadow-lg shadow-[var(--gm-primary)]/25 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 sm:gap-3 shrink-0 cursor-pointer"
        >
          {saving ? (
            "Salvando..."
          ) : budgetToEditId ? (
            <>
              <ArrowRight size={18} className="animate-arrow-point" />
              <span>Atualizar Proposta</span>
            </>
          ) : (
            <>
              <ArrowRight size={18} className="animate-arrow-point" />
              <span>Finalizar Proposta</span>
            </>
          )}
        </button>
      </div>
      </div>
    </div>,
    document.body
  );
}