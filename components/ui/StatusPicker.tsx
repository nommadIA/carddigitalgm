
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
  AGUARDANDO: "bg-[var(--gm-accent)]/15 text-[var(--gm-accent)] border-[var(--gm-accent)]/25 shadow-[0_0_10px_rgba(var(--gm-accent-rgb),0.2)]",
  APROVADO: "bg-[var(--gm-primary)]/15 text-[var(--gm-primary)] border-[var(--gm-primary)]/25 shadow-[0_0_10px_rgba(var(--gm-primary-rgb),0.2)]",
  PRODUCAO: "bg-[var(--gm-accent)]/20 text-[var(--gm-accent)] border-[var(--gm-accent)]/30 shadow-[0_0_15px_rgba(var(--gm-accent-rgb),0.3)]",
  CONCLUIDO: "bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] border-[var(--gm-primary)]/30 shadow-[0_0_15px_rgba(var(--gm-primary-rgb),0.3)]",
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
