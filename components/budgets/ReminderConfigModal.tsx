import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, BellOff, Clock, Save, X } from "lucide-react";
import { GlassTimePicker } from "../ui/GlassTimePicker";
import {
  getBudgetReminderTimes,
  setBudgetReminderTimes,
  getBudgetRemindersEnabled,
  setBudgetRemindersEnabled,
  syncAllBudgetAlarms,
} from "../../lib/alarmSystem";
import { readSettingsLocal } from "../../lib/settings";
import { playNotificationSound } from "../../lib/audio";
import { pushToast } from "../../store/toast";
import { triggerRealNotification } from "../../lib/realNotification";

interface ReminderConfigModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ReminderConfigModal({
  open,
  onClose,
}: ReminderConfigModalProps) {
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [rem1, setRem1] = useState("09:00");
  const [rem2, setRem2] = useState("13:00");
  const [rem3, setRem3] = useState("18:00");
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermission>("default");

  const [isIframe, setIsIframe] = useState(false);

  const [pushStatus, setPushStatus] = useState<{
    ok: boolean;
    reason?: string;
  }>({ ok: true });

  useEffect(() => {
    setIsIframe(window.self !== window.top);
    if ("Notification" in window) {
      setPermissionStatus(Notification.permission);
    }

    // Verifica se o Push está configurado (importado dinamicamente para evitar logs imediatos)
    const vapid = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapid || vapid.includes("YOUR_") || vapid.length < 30) {
      setPushStatus({
        ok: false,
        reason: "Configuração de Push (Firebase) pendente no ambiente.",
      });
    }

    if (open) {
      const times = getBudgetReminderTimes();
      setRem1(times[0] || "09:00");
      setRem2(times[1] || "13:00");
      setRem3(times[2] || "18:00");
      setRemindersEnabled(getBudgetRemindersEnabled());
    }
  }, [open]);

  function handleOpenNewTab() {
    // Abre a URL atual (que no iframe é a URL do app) em uma nova aba
    window.open(window.location.href, "_blank");
  }

  function normalizeTime(v: string) {
    const t = String(v || "").trim();
    return /^\d{2}:\d{2}$/.test(t) ? t : "";
  }

  function handleSave() {
    setBudgetRemindersEnabled(remindersEnabled);

    if (!remindersEnabled) {
      setSavedToast("Lembretes desativados.");
      setTimeout(() => {
        setSavedToast(null);
        onClose();
      }, 2000);
      return;
    }

    const t1 = normalizeTime(rem1);
    const t2 = normalizeTime(rem2);
    const t3 = normalizeTime(rem3);

    if (!t1 || !t2 || !t3) {
      alert("Preencha os 3 horários.");
      return;
    }

    setBudgetReminderTimes([t1, t2, t3]);
    syncAllBudgetAlarms();

    // Solicita permissão de notificação se estiver ativando
    if (
      remindersEnabled &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().then((status) =>
        setPermissionStatus(status),
      );
    }

    setSavedToast("Configuração salva para todos os orçamentos APROVADOS!");
    setTimeout(() => {
      setSavedToast(null);
      onClose();
    }, 2000);
  }

  async function handleTestNotification() {
    await triggerRealNotification({
      title: "⏰ CardDigital GM · Lembrete de Orçamentos",
      body: "Seus alertas e notificações de prazos estão ativos e funcionando dentro e fora do app!",
    });

    setSavedToast("Notificação de teste executada com sucesso!");
    setTimeout(() => setSavedToast(null), 4000);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative border border-[#26262A] rounded-lg w-full max-w-md bg-[#131315] gm-modal shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#26262A] flex items-center justify-between gap-3 bg-[#0B0B0C]/60">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${remindersEnabled ? "bg-[var(--gm-accent)]" : "bg-red-500"}`}
            />
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Lembretes Automáticos
              </h3>
              <p className="text-xs text-[#8B8B92] mt-0.5">Alertas e notificações para orçamentos aprovados</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 rounded-[4px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] hover:border-[#3F3F46] text-[#8B8B92] hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Status Control */}
          <div className="flex items-center justify-between p-4 rounded-md bg-[#0B0B0C] border border-[#26262A]">
            <div>
              <div className="text-sm font-bold text-white uppercase tracking-wider">
                Status APROVADO
              </div>
              <div className="text-xs text-[#8B8B92] mt-1 font-mono uppercase">
                Auto-disparo: {remindersEnabled ? "Ativado" : "Desativado"}
              </div>
            </div>
            <button
              type="button"
              className={`h-8 px-3.5 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                remindersEnabled
                  ? "bg-[var(--gm-accent)]/20 text-[var(--gm-accent)] border border-[var(--gm-accent)]/40"
                  : "bg-[#1B1B1E] text-[#8B8B92] border border-[#26262A]"
              }`}
              onClick={() => setRemindersEnabled(!remindersEnabled)}
            >
              {remindersEnabled ? "Ativo" : "Off"}
            </button>
          </div>

          {permissionStatus === "denied" && (
            <div className="p-4 rounded-md bg-red-500/10 border border-red-500/30 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <BellOff size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs text-red-200/80 leading-relaxed">
                  <span className="font-bold text-red-400 block mb-1">
                    Erro: Permissão Negada
                  </span>
                  {isIframe
                    ? "Restrição de Iframe detectada. Abra em nova aba para ignorar a política de segurança."
                    : "Notificações do sistema bloqueadas. Redefina as permissões nas configurações do navegador."}
                </div>
              </div>
              {isIframe && (
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="h-9 w-full rounded-[6px] bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-bold uppercase tracking-wider transition-colors border border-red-500/30 cursor-pointer"
                >
                  Iniciar Nova Instância
                </button>
              )}
            </div>
          )}

          {!pushStatus.ok && (
            <div className="p-3.5 rounded-md bg-[var(--gm-primary)]/10 border border-[var(--gm-primary)]/25 flex items-start gap-3">
              <Clock size={15} className="text-[var(--gm-primary)] shrink-0 mt-0.5" />
              <div className="text-xs text-[#CBD5E1] leading-snug">
                <span className="text-[var(--gm-primary)] font-bold">Aviso: </span>
                {pushStatus.reason}
                <span className="text-[#8B8B92] mt-1 block">
                  Os lembretes locais (com o app aberto) continuarão funcionando normalmente.
                </span>
              </div>
            </div>
          )}

          {/* Time Controls */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "CH 01", val: rem1, set: setRem1 },
              { label: "CH 02", val: rem2, set: setRem2 },
              { label: "CH 03", val: rem3, set: setRem3 },
            ].map((ch, idx) => (
              <div key={idx} className="space-y-1.5">
                <label className="text-[11px] uppercase font-mono font-bold tracking-widest text-[#8B8B92] block text-center">
                  {ch.label}
                </label>
                <div className="relative group">
                  <GlassTimePicker
                    value={ch.val}
                    onChange={ch.set}
                    disabled={!remindersEnabled}
                    className="w-full h-11 bg-[#0B0B0C] border border-[#26262A] rounded-[4px] flex items-center justify-center text-center text-sm font-mono text-white focus:border-[var(--gm-primary)] transition-colors disabled:opacity-40"
                  />
                </div>
              </div>
            ))}
          </div>

          {savedToast && (
            <div className="bg-[var(--gm-accent)]/10 border border-[var(--gm-accent)]/30 text-[var(--gm-accent)] text-xs font-mono font-bold uppercase p-3 rounded-[4px] text-center">
              {savedToast}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 space-y-3">
            <div className="text-[11px] text-[#8B8B92] text-center px-2 font-mono uppercase tracking-wider">
              Instalação PWA recomendada para segundo plano.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="h-10 rounded-[6px] bg-[var(--gm-primary,#F65A1A)] hover:brightness-110 text-[#0B0B0C] border border-[var(--gm-primary,#F65A1A)] text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                onClick={handleSave}
              >
                <Save size={15} className="text-[#0B0B0C]" />
                <span>Salvar</span>
              </button>

              <button
                className="h-10 rounded-[6px] border border-[#26262A] bg-[#1B1B1E] hover:bg-[#26262A] text-[#F2F2F3] text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                onClick={handleTestNotification}
                type="button"
              >
                <Bell size={15} className="text-[var(--gm-primary,#F65A1A)]" />
                <span>Testar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
