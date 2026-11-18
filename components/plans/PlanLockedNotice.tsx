// components/plans/PlanLockedNotice.tsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Crown, ArrowRight, X, Sparkles } from "lucide-react";
import { PLANS_DATA, PlanId } from "../../lib/subscriptionPlans";

interface PlanLockedNoticeProps {
  isOpen?: boolean;
  onClose?: () => void;
  variant?: "page" | "modal" | "inline";
  title?: string;
  reason?: string;
  requiredPlan?: PlanId;
  currentPlanName?: string;
  isExpired?: boolean;
}

export default function PlanLockedNotice({
  isOpen = true,
  onClose,
  variant = "page",
  title = "Recurso Exclusivo de Plano Superior",
  reason,
  requiredPlan = "intermediario",
  currentPlanName,
  isExpired = false,
}: PlanLockedNoticeProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (variant !== "modal" || !isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant, isOpen, onClose]);

  if (variant === "modal" && !isOpen) return null;

  const plan = PLANS_DATA[requiredPlan] || PLANS_DATA.intermediario;
  const resolvedReason =
    reason ||
    (isExpired
      ? "Seu período de teste ou assinatura expirou. Renove ou escolha um plano ativo para desbloquear."
      : `Esta funcionalidade está disponível a partir do Plano ${plan.name}.`);

  const handleGoPlans = () => {
    onClose?.();
    navigate("/planos");
  };

  if (variant === "inline") {
    return (
      <div className="w-full rounded-lg border border-amber-500/35 bg-[#131315] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-md bg-[var(--gm-primary,#FE540B)]/15 border border-[var(--gm-primary,#FE540B)]/35 text-[var(--gm-primary,#FE540B)] flex items-center justify-center shrink-0">
            <Lock size={19} />
          </div>
          <div className="flex flex-col gap-1 min-w-0 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#0B0B0C] border border-[#26262A] text-[var(--gm-primary,#FE540B)]">
                {isExpired ? "Assinatura Expirada" : `Requer Plano ${plan.name}`}
              </span>
              {currentPlanName && (
                <span className="text-[11px] font-mono text-[#8B8B92]">
                  Atual: <strong className="text-[#CBD5E1]">{currentPlanName}</strong>
                </span>
              )}
            </div>
            <h4 className="text-sm sm:text-base font-black text-[#F2F2F3] leading-snug">
              {title}
            </h4>
            <p className="text-xs text-[#8B8B92] leading-relaxed">{resolvedReason}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoPlans}
          className="forge-btn forge-btn--primary !h-11 !min-h-[44px] !px-5 !rounded-[6px] text-xs sm:text-sm font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer whitespace-nowrap"
        >
          <Crown size={17} />
          <span>{isExpired ? "Renovar Plano" : `Fazer Upgrade (${plan.name})`}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  const cardContent = (
    <div className="w-full max-w-lg rounded-lg border border-[#26262A] bg-[#131315] p-6 sm:p-8 flex flex-col items-center text-center gap-5 relative overflow-hidden shadow-2xl">
      {variant === "modal" && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-[4px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] text-[#8B8B92] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
      )}

      <div className="w-14 h-14 rounded-lg bg-[var(--gm-primary,#FE540B)]/15 border border-[var(--gm-primary,#FE540B)]/35 flex items-center justify-center text-[var(--gm-primary,#FE540B)]">
        <Lock size={26} />
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="px-2.5 py-1 rounded-[4px] text-[11px] font-mono font-black uppercase tracking-wider bg-[#0B0B0C] border border-[#26262A] text-[var(--gm-primary,#FE540B)] inline-flex items-center gap-1.5">
          <Sparkles size={12} />
          <span>{isExpired ? "Acesso Expirado" : `Disponível no Plano ${plan.name}`}</span>
        </span>

        <h3 className="text-xl sm:text-2xl font-black text-[#F2F2F3] tracking-tight mt-1">
          {title}
        </h3>

        <p className="text-sm text-[#8B8B92] leading-relaxed max-w-md">
          {resolvedReason}
        </p>

        {currentPlanName && (
          <p className="text-xs font-mono text-[#8B8B92] mt-1">
            Seu plano atual: <strong className="text-[#CBD5E1]">{currentPlanName}</strong>
          </p>
        )}
      </div>

      <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-2">
        {variant === "modal" && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="forge-btn forge-btn--secondary flex-1 !h-11 !min-h-[44px] !rounded-[6px] text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            Fechar
          </button>
        )}
        <button
          type="button"
          onClick={handleGoPlans}
          className="forge-btn forge-btn--primary flex-1 !h-11 !min-h-[44px] !px-5 !rounded-[6px] text-xs sm:text-sm font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <Crown size={18} />
          <span>{isExpired ? "Escolher um Plano" : "Fazer Upgrade Agora"}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );

  if (variant === "modal") {
    return (
      <div
        className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      >
        <div onClick={(e) => e.stopPropagation()} className="w-full flex justify-center">
          {cardContent}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center py-10 px-2">
      {cardContent}
    </div>
  );
}
