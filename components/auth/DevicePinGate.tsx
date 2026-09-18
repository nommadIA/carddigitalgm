import React, { useState, useEffect } from "react";
import { useAuth } from "../../store/AuthContext";
import { isPinSecurityActive, isSessionUnlocked, setSessionUnlocked } from "../../lib/securityPin";
import PinLockModal from "./PinLockModal";

interface DevicePinGateProps {
  children: React.ReactNode;
}

export default function DevicePinGate({ children }: DevicePinGateProps) {
  const { user, signOut } = useAuth();
  const [isLocked, setIsLocked] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.email) {
      setIsLocked(false);
      return;
    }

    const pinActive = isPinSecurityActive(user.email);
    const unlocked = isSessionUnlocked();

    // Se o PIN estiver ativado e a sessão ainda não foi destravada nesta inicialização
    if (pinActive && !unlocked) {
      setIsLocked(true);
    } else {
      setIsLocked(false);
    }
  }, [user]);

  const handleUnlock = () => {
    setSessionUnlocked(true);
    setIsLocked(false);
  };

  const handleCancelAndSignOut = async () => {
    await signOut();
    setIsLocked(false);
  };

  return (
    <>
      {children}

      {isLocked && user && (
        <PinLockModal
          open={true}
          mode="verify"
          email={user.email}
          userName={user.full_name || user.email.split("@")[0]}
          title="Dispositivo Protegido por PIN"
          description="Este computador possui credenciais salvas protegidas por PIN. Digite os 4 dígitos para continuar."
          onSuccess={handleUnlock}
          onCancel={handleCancelAndSignOut}
        />
      )}
    </>
  );
}
