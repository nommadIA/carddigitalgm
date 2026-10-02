import React, { useState, useEffect, useRef } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SecurityVerifierProps {
  onVerifyChange?: (verified: boolean) => void;
  autoVerify?: boolean;
  className?: string;
}

// Caracteres nítidos e fáceis de digitar
const CHAR_SET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateCode(): string {
  let res = "";
  for (let i = 0; i < 4; i++) {
    res += CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)];
  }
  return res;
}

export default function SecurityVerifier({
  onVerifyChange,
  className = "",
}: SecurityVerifierProps) {
  const [status, setStatus] = useState<"idle" | "inputting" | "verifying" | "success">("idle");
  const [targetCode, setTargetCode] = useState<string>("");
  const [userInput, setUserInput] = useState<string>("");
  const [isShaking, setIsShaking] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Inicializa desmarcado a cada carregamento ou logout
  useEffect(() => {
    if (onVerifyChange) {
      onVerifyChange(false);
    }
  }, [onVerifyChange]);

  const handleStartChallenge = () => {
    if (status !== "idle") return;
    const newCode = generateCode();
    setTargetCode(newCode);
    setUserInput("");
    setIsShaking(false);
    setStatus("inputting");

    setTimeout(() => {
      hiddenInputRef.current?.focus();
    }, 120);
  };

  const handleCodeClickToRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipping(true);
    const newCode = generateCode();
    setTargetCode(newCode);
    setUserInput("");
    setIsShaking(false);
    setTimeout(() => setIsFlipping(false), 400);
    hiddenInputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    setUserInput(val);
    setIsShaking(false);

    // Validação inteligente 100% automática ao preencher o 4º caractere
    if (val.length === 4) {
      if (val === targetCode) {
        setStatus("verifying");
        setTimeout(() => {
          setStatus("success");
          if (onVerifyChange) onVerifyChange(true);
        }, 500);
      } else {
        // Erro: vibração suave, limpa o campo e atualiza o código sem botões manuais
        setIsShaking(true);
        setTimeout(() => {
          setIsShaking(false);
          setUserInput("");
          setTargetCode(generateCode());
        }, 500);
      }
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Container único, sem caixas extras ou botões separados */}
      <div
        onClick={status === "idle" ? handleStartChallenge : () => hiddenInputRef.current?.focus()}
        className={`w-full apple-glass-input rounded-xl px-3 py-2 sm:py-2.5 flex flex-col justify-center select-none transition-all duration-300 relative overflow-hidden ${
          status === "idle" ? "cursor-pointer hover:border-white/30 hover:bg-white/[0.08]" : ""
        } ${status === "inputting" ? "border-[#4285F4]/70 shadow-md shadow-blue-500/10" : ""} ${
          status === "success" ? "border-[#0F9D58]/60 bg-[#0F9D58]/[0.06]" : ""
        }`}
        style={{ minHeight: "58px" }}
      >
        {/* Input invisível que captura o teclado automaticamente */}
        {status === "inputting" && (
          <input
            ref={hiddenInputRef}
            type="text"
            maxLength={4}
            value={userInput}
            onChange={handleInputChange}
            className="absolute inset-0 opacity-0 cursor-text pointer-events-auto"
            autoFocus
          />
        )}

        <div className="flex items-center justify-between w-full">
          {/* LADO ESQUERDO: Checkbox / Interação Inteligente */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
            {/* Estado 1: Inicial (Aguardando clique) */}
            {status === "idle" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2.5 sm:gap-3"
              >
                <div className="w-6 h-6 rounded-md border-2 border-white/40 hover:border-[#4285F4] hover:shadow-[0_0_10px_rgba(66,133,244,0.4)] transition-all shrink-0 flex items-center justify-center bg-black/40" />
                <span className="text-zinc-200 text-xs sm:text-[13px] font-medium">
                  Não sou um robô
                </span>
              </motion.div>
            )}

            {/* Estado 2: Desafio Inteligente Integrado (Sem botões extras) */}
            {status === "inputting" && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 sm:gap-2.5 flex-wrap"
              >
                {/* Código interativo: clique no próprio código para trocar */}
                <motion.div
                  onClick={handleCodeClickToRefresh}
                  animate={{ rotateY: isFlipping ? 180 : 0 }}
                  transition={{ duration: 0.35 }}
                  title="Clique no código para gerar outro"
                  className="h-8 px-2.5 rounded-lg bg-black/60 border border-white/20 hover:border-[#4285F4] flex items-center justify-center gap-1 cursor-pointer shadow-inner transition-colors group relative"
                >
                  {targetCode.split("").map((c, i) => {
                    const colors = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"];
                    return (
                      <span
                        key={i}
                        className="font-mono font-black text-base drop-shadow"
                        style={{ color: colors[i % colors.length] }}
                      >
                        {c}
                      </span>
                    );
                  })}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-zinc-400 bg-black/80 px-2 py-0.5 rounded pointer-events-none whitespace-nowrap">
                    Clique p/ trocar
                  </div>
                </motion.div>

                {/* 4 Caixas de dígitos que se preenchem automaticamente ao digitar */}
                <motion.div
                  animate={isShaking ? { x: [-6, 6, -5, 5, -2, 2, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-1"
                >
                  {[0, 1, 2, 3].map((idx) => {
                    const char = userInput[idx] || "";
                    const isCurrent = userInput.length === idx;
                    return (
                      <div
                        key={idx}
                        className={`w-7 h-8 rounded-md flex items-center justify-center font-mono font-bold text-base transition-all ${
                          char
                            ? "bg-blue-500/20 border-2 border-[#4285F4] text-white shadow-sm shadow-blue-500/30"
                            : isCurrent
                            ? "bg-black/50 border-2 border-white/50 text-white animate-pulse"
                            : "bg-black/30 border border-white/15 text-zinc-500"
                        } ${isShaking ? "border-red-500 bg-red-500/20" : ""}`}
                      >
                        {char}
                      </div>
                    );
                  })}
                </motion.div>
              </motion.div>
            )}

            {/* Estado 3: Animação de Análise/Verificação */}
            {status === "verifying" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2.5"
              >
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5 animate-spin text-[#4285F4]"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-90"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
                <span className="text-white text-xs sm:text-[13px] font-medium tracking-wide">
                  Validando segurança...
                </span>
              </motion.div>
            )}

            {/* Estado 4: Sucesso Confirmado com Animação Fluida */}
            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="flex items-center gap-2.5"
              >
                <div className="w-6 h-6 rounded-md bg-[#0F9D58] flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-500/30">
                  <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                </div>
                <span className="text-white font-semibold text-xs sm:text-[13px] tracking-tight">
                  Não sou um robô
                </span>
              </motion.div>
            )}
          </div>

          {/* LADO DIREITO: Identidade Oficial Google reCAPTCHA */}
          <div className="flex flex-col items-center justify-center shrink-0 pl-2">
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  fill="#4285F4"
                />
                <path
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                  fill="#34A853"
                />
                <path
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  fill="#EA4335"
                />
              </svg>
              <span className="text-[9px] font-semibold text-white/90 tracking-wider uppercase">
                reCAPTCHA
              </span>
            </div>
            <div className="text-[8px] text-zinc-400 font-normal mt-0.5 select-none space-x-1">
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noreferrer"
                className="hover:underline hover:text-white transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Privacidade
              </a>
              <span>•</span>
              <a
                href="https://policies.google.com/terms"
                target="_blank"
                rel="noreferrer"
                className="hover:underline hover:text-white transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Termos
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
