
import React from "react";

type BudgetStatus = "AGUARDANDO" | "APROVADO" | "PRODUCAO" | "CONCLUIDO" | "CANCELADO";

const LABEL: Record<BudgetStatus, string> = {
  AGUARDANDO: "AGUARDANDO",
  APROVADO: "APROVADO",
  PRODUCAO: "PRODUÇÃO",
  CONCLUIDO: "CONCLUÍDOS",
  CANCELADO: "CANCELADOS",
};

const STYLE: Record<BudgetStatus, string> = {
  AGUARDANDO: "bg-amber-500/15 text-amber-200 border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
  APROVADO: "bg-emerald-500/15 text-emerald-200 border-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
  PRODUCAO: "bg-orange-500/15 text-orange-200 border-orange-500/25 shadow-[0_0_10px_rgba(249,115,22,0.2)]",
  CONCLUIDO: "bg-emerald-400/10 text-emerald-100 border-emerald-400/20 shadow-[0_0_10px_rgba(52,211,153,0.2)]",
  CANCELADO: "bg-red-500/15 text-red-200 border-red-500/25 shadow-[0_0_10px_rgba(239,68,68,0.2)]",
};

export default function StatusPicker({
  value,
  onChange,
}: {
  value: BudgetStatus;
  onChange: (v: BudgetStatus) => void;
}) {
  const v = (value || "AGUARDANDO") as BudgetStatus;

  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(LABEL) as BudgetStatus[]).map((s) => {
        const active = v === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={[
              "px-3 py-2 rounded-full text-xs font-extrabold border backdrop-blur-md transition-all",
              active 
                ? STYLE[s] 
                : "border-white/10 bg-black/20 text-white/40 hover:bg-white/5 hover:text-white/60",
            ].join(" ")}
          >
            {LABEL[s]}
          </button>
        );
      })}
    </div>
  );
}
