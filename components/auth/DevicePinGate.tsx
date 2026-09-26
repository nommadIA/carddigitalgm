import React, { useState, useEffect } from "react";
import { useAuth } from "../../store/AuthContext";
import {
  isPinSecurityActive,
  isSessionUnlocked,
  setSessionUnlocked,
  verifyPinResetToken,
  clearPinResetData,
} from "../../lib/securityPin";
import PinLockModal from "./PinLockModal";

interface DevicePinGateProps {
  children: React.ReactNode;
}

export default function DevicePinGate({ children }: DevicePinGateProps) {
  const { user, signOut } = useAuth();
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [justUnlocked, setJustUnlocked] = useState<boolean>(false);
  const [isResettingViaUrl, setIsResettingViaUrl] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.email) {
      setIsLocked(false);
      return;
    }

    // Verifica se acessou via link de redefinição de PIN por e-mail
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reset_pin") === "true") {
        const emailParam = params.get("email") || user.email;
        const tokenParam = params.get("token");

        if (tokenParam) {
          if (verifyPinResetToken(emailParam, tokenParam)) {
            setIsResettingViaUrl(true);
            setIsLocked(false);
            return;
          }
        } else {
          // Acesso direto autenticado via link de recuperação do Supabase
          setIsResettingViaUrl(true);
          setIsLocked(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Erro ao verificar parâmetro reset_pin:", e);
    }

    const checkLockStatus = () => {
      const pinActive = isPinSecurityActive(user.email);
      const unlocked = isSessionUnlocked();
      setIsLocked(pinActive && !unlocked);
    };

    checkLockStatus();

    const handleLockEvent = () => {
      checkLockStatus();
    };

    window.addEventListener("gm:lock_session", handleLockEvent);
    window.addEventListener("storage", handleLockEvent);

    return () => {
      window.removeEventListener("gm:lock_session", handleLockEvent);
      window.removeEventListener("storage", handleLockEvent);
    };
  }, [user]);

  const handleUnlock = () => {
    setSessionUnlocked(true);
    setIsLocked(false);
    setJustUnlocked(true);
    setTimeout(() => {
      setJustUnlocked(false);
    }, 800);
  };

  const handleResetSuccess = () => {
    if (user?.email) {
      clearPinResetData(user.email);
    }
    // Remove os parâmetros de redefinição da URL sem recarregar a página
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("reset_pin");
      url.searchParams.delete("token");
      url.searchParams.delete("email");
      window.history.replaceState(
        {},
        document.title,
        url.pathname + (url.search ? url.search : "")
      );
    } catch {}

    setIsResettingViaUrl(false);
    handleUnlock();
  };

  const handleCancelAndSignOut = async () => {
    await signOut();
    setIsLocked(false);
    setIsResettingViaUrl(false);
  };

  return (
    <>
      <div
        className={`w-full min-h-screen transition-all duration-700 ease-out ${
          isLocked || isResettingViaUrl
            ? "filter blur-lg pointer-events-none select-none scale-[0.985] origin-center opacity-80"
            : justUnlocked
            ? "animate-fade-in filter blur-none scale-100 opacity-100"
            : ""
        }`}
      >
        {children}
      </div>

      {isResettingViaUrl && user && (
        <PinLockModal
          open={true}
          mode="setup"
          email={user.email}
          userName={user.full_name || user.email.split("@")[0]}
          title="Redefinir PIN de Segurança"
          description="Você acessou pelo link seguro de autorização do e-mail. Crie seu novo PIN de 4 dígitos para este dispositivo."
          onSuccess={handleResetSuccess}
          onCancel={handleCancelAndSignOut}
        />
      )}

      {isLocked && !isResettingViaUrl && user && (
        <PinLockModal
          open={true}
          mode="verify"
          email={user.email}
          userName={user.full_name || user.email.split("@")[0]}
          title="Dispositivo Protegido por PIN"
          description="Este dispositivo possui credenciais salvas protegidas por PIN. Digite os 4 dígitos para continuar."
          onSuccess={handleUnlock}
          onCancel={handleCancelAndSignOut}
        />
      )}
    </>
  );
}
