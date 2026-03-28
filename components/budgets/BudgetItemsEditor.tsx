import React, { useMemo } from "react";
import { toNumber, formatBRL } from "../../lib/money";

export type BudgetKind = "agency" | "print";

export type BudgetItemDraft = {
  id?: string;
  title: string;
  description?: string;

  // Agency
  qty: number;
  unit_price: number;

  // Print
  width_cm?: number;
  height_cm?: number;
  area_m2?: number;
  price_per_m2?: number;
};

function calcAreaM2(width_cm?: number, height_cm?: number) {
  const w = toNumber(width_cm);
  const h = toNumber(height_cm);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / 10000; // cm² -> m²
}

export default function BudgetItemsEditor({
  kind,
  items,
  onChange,
}: {
  kind: BudgetKind;
  items: BudgetItemDraft[];
  onChange: (items: BudgetItemDraft[]) => void;
}) {
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => {
      const qty = toNumber(it.qty) || 1;

      if (kind === "print") {
        const area = calcAreaM2(it.width_cm, it.height_cm);
        const ppm2 = toNumber(it.price_per_m2);
        const itemTotal = area * ppm2; // total por item (1 unidade)
        return acc + itemTotal; // (se quiser multiplicar por qty, troque por itemTotal * qty)
      }

      return acc + qty * toNumber(it.unit_price);
    }, 0);
  }, [items, kind]);

  function update(index: number, patch: Partial<BudgetItemDraft>) {
    const next = [...items];
    const merged = { ...next[index], ...patch };

    // Se for impressão, atualiza area automaticamente
    if (kind === "print") {
      const area = calcAreaM2(merged.width_cm, merged.height_cm);
      merged.area_m2 = area;
    }

    next[index] = merged;
    onChange(next);
  }

  function add() {
    onChange([
      ...items,
      kind === "print"
        ? {
            title: "Impressão",
            description: "",
            qty: 1,
            unit_price: 0, // não usa no print (mantemos por compatibilidade)
            width_cm: 0,
            height_cm: 0,
            area_m2: 0,
            price_per_m2: 0,
          }
        : { title: "Serviço", description: "", qty: 1, unit_price: 0 },
    ]);
  }

  function remove(index: number) {
    const next = items.filter((_, i) => i !== index);
    onChange(
      next.length
        ? next
        : [
            kind === "print"
              ? {
                  title: "Impressão",
                  description: "",
                  qty: 1,
                  unit_price: 0,
                  width_cm: 0,
                  height_cm: 0,
                  area_m2: 0,
                  price_per_m2: 0,
                }
              : { title: "Serviço", description: "", qty: 1, unit_price: 0 },
          ]
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-slate-200 font-semibold">Itens do Orçamento</div>
        <button
          type="button"
          onClick={add}
          className="px-3 py-1.5 rounded-lg bg-[var(--gm-primary)] text-white font-semibold hover:brightness-110"
        >
          + Adicionar item
        </button>
      </div>

      <div className="space-y-3">
        {items.map((it, idx) => {
          const qty = toNumber(it.qty) || 1;

          const agencyTotal = qty * toNumber(it.unit_price);

          const area = calcAreaM2(it.width_cm, it.height_cm);
          const ppm2 = toNumber(it.price_per_m2);
          const printTotal = area * ppm2; // se quiser multiplicar por qty: printTotal * qty

          const total = kind === "print" ? printTotal : agencyTotal;

          return (
            <div key={idx} className="rounded-xl border border-white/10 p-3 bg-white/5">
              <div className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <input
                    value={it.title}
                    onChange={(e) => update(idx, { title: e.target.value })}
                    placeholder={kind === "print" ? "Tipo de impressão" : "Título do serviço"}
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-slate-100"
                  />
                  <textarea
                    value={it.description || ""}
                    onChange={(e) => update(idx, { description: e.target.value })}
                    placeholder="Descrição (opcional)"
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-slate-100 min-h-[70px]"
                  />

                  {kind === "print" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-slate-300 mb-1">Largura (cm)</div>
                        <input
                          value={it.width_cm ?? 0}
                          onChange={(e) => update(idx, { width_cm: toNumber(e.target.value) })}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-slate-100"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-slate-300 mb-1">Altura (cm)</div>
                        <input
                          value={it.height_cm ?? 0}
                          onChange={(e) => update(idx, { height_cm: toNumber(e.target.value) })}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-slate-100"
                        />
                      </div>

                      <div>
                        <div className="text-xs text-slate-300 mb-1">Área (m²)</div>
                        <input
                          value={(it.area_m2 ?? area).toFixed(4)}
                          readOnly
                          className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-slate-100"
                        />
                      </div>

                      <div>
                        <div className="text-xs text-slate-300 mb-1">R$ / m²</div>
                        <input
                          value={it.price_per_m2 ?? 0}
                          onChange={(e) => update(idx, { price_per_m2: toNumber(e.target.value) })}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-slate-100"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-[160px] space-y-2">
                  {kind !== "print" && (
                    <>
                      <input
                        value={it.qty}
                        onChange={(e) => update(idx, { qty: toNumber(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        placeholder="Qtd"
                        className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-slate-100"
                      />
                      <input
                        value={it.unit_price}
                        onChange={(e) => update(idx, { unit_price: toNumber(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        placeholder="Valor unit."
                        className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-slate-100"
                      />
                    </>
                  )}

                  <div className="text-slate-200 text-sm font-semibold">
                    Total: {formatBRL(total)}
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="w-full px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 font-semibold hover:bg-red-500/30"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-slate-100 font-semibold">
          Subtotal: {formatBRL(subtotal)}
        </div>
      </div>
    </div>
  );
}