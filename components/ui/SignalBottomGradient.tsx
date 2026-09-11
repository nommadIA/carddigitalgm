import React from "react";
import { Bell } from "lucide-react";

interface SignalBottomGradientProps {
  active: boolean;
  className?: string;
  showBadge?: boolean;
  onDismiss?: () => void;
}

export const SignalBottomGradient: React.FC<SignalBottomGradientProps> = ({
  active,
  className = "",
  showBadge = true,
  onDismiss,
}) => {
  if (!active) return null;

  return (
    <div
      className={`absolute inset-0 rounded-[inherit] pointer-events-none overflow-hidden z-30 ${className}`}
      aria-label="Item localizado por notificação"
    >
      {/* Círculo Grande: Inicia em escala 0, expande até 100 cobrindo o modal/card todo e finaliza zerado em loop */}
      <div className="gm-circle-pulse-container">
        {/* Onda 1: Círculo Grande Principal */}
        <div className="gm-big-circle-wave gm-big-circle-wave-1" />

        {/* Onda 2: Círculo Grande Secundário em Eco Contínuo */}
        <div className="gm-big-circle-wave gm-big-circle-wave-2" />

        {/* Núcleo Central de Pulso com Ícone do Sino Sutil */}
        {showBadge && (
          <div className="gm-big-circle-core">
            <Bell
              size={18}
              className="text-white fill-orange-400/30 drop-shadow-[0_0_12px_#FE540B] animate-pulse"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SignalBottomGradient;
