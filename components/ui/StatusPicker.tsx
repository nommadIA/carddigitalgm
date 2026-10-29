
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
  AGUARDANDO: "bg-[#F65A1A]/15 text-[#FF7A38] border-[#F65A1A]/50 shadow-sm",
  APROVADO: "bg-emerald-500/15 text-emerald-400 border-emerald-500/50 shadow-sm",
  PRODUCAO: "bg-[#F65A1A]/20 text-[#FF7A38] border-[#F65A1A]/60 shadow-sm",
  CONCLUIDO: "bg-emerald-500/20 text-emerald-400 border-emerald-500/60 shadow-sm",
  CANCELADO: "bg-red-500/15 text-red-400 border-red-500/40 shadow-sm",
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
              "h-9 px-3.5 rounded-md text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer",
              active 
                ? STYLE[s] 
                : "border-[#26262A] bg-[#131315] text-[#8B8B92] hover:bg-[#1B1B1E] hover:text-[#F2F2F3] hover:border-[#3F3F46]",
            ].join(" ")}
          >
            {LABEL[s]}
          </button>
        );
      })}
    </div>
  );
}
