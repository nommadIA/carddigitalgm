import React, { useState, useEffect, useCallback } from "react";
import { Lock, ShieldCheck, Delete, AlertCircle, X, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { verifySecurityPin, saveSecurityPin } from "../../lib/securityPin";

interface PinLockModalProps {
  open: boolean;
  mode: "verify" | "setup";
  email?: string;
  userName?: string;
  title?: string;
  description?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function PinLockModal({
  open,
  mode = "verify",
  email,
  userName,
  title,
  description,
  onSuccess,
  onCancel,
}: PinLockModalProps) {
  const [pin, setPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [setupStep, setSetupStep] = useState<"create" | "confirm">("create");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Reset estado ao abrir
  useEffect(() => {
    if (open) {
      setPin("");
      setConfirmPin("");
      setSetupStep("create");
      setErrorMsg("");
      setIsShaking(false);
    }
  }, [open, mode]);

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setIsShaking(true);
    setTimeout(() => {
      setIsShaking(false);
      setPin("");
      if (mode === "setup" && setupStep === "confirm") {
        setSetupStep("create");
        setConfirmPin("");
      }
    }, 500);
  };

  const handleDigit = useCallback(
    (digit: string) => {
      setErrorMsg("");
      if (mode === "verify") {
        if (pin.length < 4) {
          const nextPin = pin + digit;
          setPin(nextPin);
          if (nextPin.length === 4) {
            // Validar
            setTimeout(() => {
              if (verifySecurityPin(nextPin, email)) {
                onSuccess();
              } else {
                triggerError("PIN incorreto. Tente novamente.");
              }
            }, 100);
          }
        }
      } else {
        // Mode SETUP
        if (setupStep === "create") {
          if (pin.length < 4) {
            const nextPin = pin + digit;
            setPin(nextPin);
            if (nextPin.length === 4) {
              setConfirmPin(nextPin);
              setTimeout(() => {
                setSetupStep("confirm");
                setPin("");
              }, 200);
            }
          }
        } else {
          // Confirm step
          if (pin.length < 4) {
            const nextPin = pin + digit;
            setPin(nextPin);
            if (nextPin.length === 4) {
              setTimeout(() => {
                if (nextPin === confirmPin) {
                  saveSecurityPin(nextPin, email);
                  onSuccess();
                } else {
                  triggerError("Os PINs digitados não conferem. Crie novamente.");
                }
              }, 150);
            }
          }
        }
      }
    },
    [pin, confirmPin, setupStep, mode, email, onSuccess]
  );

  const handleDelete = useCallback(() => {
    setErrorMsg("");
    setPin((prev) => prev.slice(0, -1));
  }, []);

  // Suporte a teclado físico (números 0-9, Backspace, Esc)
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleDelete();
      } else if (e.key === "Escape" && onCancel) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleDigit, handleDelete, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-[360px] bg-[#121216]/90 border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center relative text-center"
      >
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
            title="Fechar"
          >
            <X size={18} />
          </button>
        )}

        {/* Ícone de Segurança com Brilho Suave */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[var(--gm-primary,#FE540B)]/20 to-orange-500/10 border border-[var(--gm-primary,#FE540B)]/40 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/15">
          {mode === "setup" ? (
            <KeyRound size={28} className="text-[var(--gm-primary,#FE540B)]" />
          ) : (
            <Lock size={28} className="text-[var(--gm-primary,#FE540B)]" />
          )}
        </div>

        {/* Título e Instrução */}
        <h3 className="text-xl font-bold text-white tracking-tight">
          {title ||
            (mode === "setup"
              ? setupStep === "create"
                ? "Criar PIN de Segurança"
                : "Confirme o seu PIN"
              : "PIN de Segurança")}
        </h3>

        <p className="text-xs text-zinc-400 mt-1 mb-6 px-2">
          {description ||
            (mode === "setup"
              ? setupStep === "create"
                ? "Digite 4 dígitos para proteger suas credenciais salvas neste computador."
                : "Digite os mesmos 4 dígitos para confirmar."
              : userName
              ? `Olá, ${userName}. Confirme seu PIN de 4 dígitos para acessar.`
              : "Digite seu PIN de 4 dígitos para desbloquear o acesso.")}
        </p>

        {/* 4 Pontos / Bubbles do PIN */}
        <motion.div
          animate={isShaking ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center gap-4 mb-6"
        >
          {[0, 1, 2, 3].map((index) => {
            const filled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  filled
                    ? "bg-[var(--gm-primary,#FE540B)] border-[var(--gm-primary,#FE540B)] scale-110 shadow-md shadow-orange-500/40"
                    : isShaking
                    ? "border-red-500 bg-red-500/20"
                    : "border-white/30 bg-white/5"
                }`}
              />
            );
          })}
        </motion.div>

        {/* Mensagem de Erro */}
        {errorMsg ? (
          <div className="text-xs text-red-400 font-semibold mb-4 flex items-center justify-center gap-1.5 animate-fade-in">
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        ) : (
          <div className="h-4 mb-4" />
        )}

        {/* Teclado Numérico Virtual Estilo Apple / Touch */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[270px]">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-14 rounded-2xl bg-white/[0.06] hover:bg-white/[0.14] active:bg-[var(--gm-primary,#FE540B)]/30 border border-white/10 active:scale-95 transition-all text-xl font-semibold text-white flex items-center justify-center cursor-pointer shadow-sm"
            >
              {num}
            </button>
          ))}

          {/* Botão Vazio / Cancelar */}
          <div className="h-14 flex items-center justify-center">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs text-zinc-400 hover:text-white uppercase font-bold tracking-wider transition"
              >
                Cancelar
              </button>
            )}
          </div>

          {/* Dígito 0 */}
          <button
            type="button"
            onClick={() => handleDigit("0")}
            className="h-14 rounded-2xl bg-white/[0.06] hover:bg-white/[0.14] active:bg-[var(--gm-primary,#FE540B)]/30 border border-white/10 active:scale-95 transition-all text-xl font-semibold text-white flex items-center justify-center cursor-pointer shadow-sm"
          >
            0
          </button>

          {/* Botão Apagar (Backspace) */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={pin.length === 0}
            className="h-14 rounded-2xl bg-white/[0.03] hover:bg-white/[0.10] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed border border-white/5 transition-all flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
            title="Apagar"
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Dica de Teclado Físico */}
        <p className="text-[11px] text-zinc-500 mt-6 select-none">
          Você também pode digitar pelo teclado numérico
        </p>
      </motion.div>
    </div>
  );
}
