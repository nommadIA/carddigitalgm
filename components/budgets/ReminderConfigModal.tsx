import React, { useEffect, useState } from "react";
import { Bell, BellOff, Clock, Save, X } from "lucide-react";
import { getBudgetReminderTimes, setBudgetReminderTimes, getBudgetRemindersEnabled, setBudgetRemindersEnabled, syncAllBudgetAlarms } from "../../lib/alarmSystem";

interface ReminderConfigModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ReminderConfigModal({ open, onClose }: ReminderConfigModalProps) {
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [rem1, setRem1] = useState("09:00");
  const [rem2, setRem2] = useState("13:00");
  const [rem3, setRem3] = useState("18:00");
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");

  const [isIframe, setIsIframe] = useState(false);

  const [pushStatus, setPushStatus] = useState<{ ok: boolean; reason?: string }>({ ok: true });

  useEffect(() => {
    setIsIframe(window.self !== window.top);
    if ("Notification" in window) {
      setPermissionStatus(Notification.permission);
    }
    
    // Verifica se o Push está configurado (importado dinamicamente para evitar logs imediatos)
    const vapid = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapid || vapid.includes("YOUR_") || vapid.length < 30) {
      setPushStatus({ ok: false, reason: "Configuração de Push (Firebase) pendente no ambiente." });
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
    if (remindersEnabled && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(status => setPermissionStatus(status));
    }

    setSavedToast("Configuração salva para todos os orçamentos APROVADOS!");
    setTimeout(() => {
      setSavedToast(null);
      onClose();
    }, 2000);
  }

  function handleTestNotification() {
    if (!("Notification" in window)) {
      alert("Este navegador não suporta notificações.");
      return;
    }

    if (Notification.permission === "denied") {
      if (isIframe) {
        alert("As notificações estão bloqueadas pelo Google AI Studio (Iframe).\n\nPara funcionar, você precisa abrir o app em uma nova aba usando o botão que aparecerá no modal.");
      } else {
        alert("As notificações estão BLOQUEADAS no seu navegador.\n\nPara ativar:\n1. Clique no ícone de 'Cadeado' ao lado da URL.\n2. Ative a opção 'Notificações'.\n3. Recarregue a página.");
      }
      return;
    }

    const sendTest = () => {
      const title = "Teste de Notificação";
      const options = {
        body: "Seu sistema de lembretes está funcionando corretamente!",
        icon: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg",
        vibrate: [200, 100, 200],
        tag: "test-notification",
        renotify: true,
        requireInteraction: true
      } as any;

      setSavedToast("Disparando teste... Verifique sua área de notificações.");
      setTimeout(() => setSavedToast(null), 5000);

      // Tenta via Service Worker primeiro
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then(async registration => {
          try {
            // Tenta registrar o token antes do teste para validar a config
            const { startPush } = await import("../../services/pushFCM");
            const res = await startPush({ tenantId: "test", userId: "test" });
            
            if (!res.ok) {
              if (res.reason === "malformed_vapid_key") {
                alert("ERRO: Chave VAPID malformada. Verifique se copiou a chave pública completa.");
              } else if (res.reason === "invalid_api_key_format") {
                alert("ERRO: Chave API do Firebase inválida. Certifique-se de que ela começa com 'AIza'.");
              } else {
                console.warn("Push registration failed during test:", res.reason);
              }
            }

            if (registration.active) {
              registration.active.postMessage("TEST_NOTIFICATION");
            } else {
              registration.showNotification(title, options);
            }
          } catch (err: any) {
            console.error("SW Test Error:", err);
            if (err.message?.includes("API key not valid")) {
              alert("ERRO CRÍTICO: O Firebase rejeitou sua API Key. Verifique se copiou a 'Chave de API da Web' correta no Console do Firebase.");
            }
            new Notification(title, options);
          }
        }).catch(err => {
          console.error("SW Ready Error:", err);
          new Notification(title, options);
        });
      } else {
        new Notification(title, options);
      }
    };

    if (Notification.permission !== "granted") {
      Notification.requestPermission().then(permission => {
        setPermissionStatus(permission);
        if (permission === "granted") {
          sendTest();
        } else {
          alert("Você negou a permissão. Para receber alertas, é necessário permitir as notificações.");
        }
      });
    } else {
      sendTest();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#151619] border border-white/5 rounded-2xl w-full max-w-md shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden animate-slide-up">
        {/* Header - Hardware Style */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${remindersEnabled ? "bg-[var(--gm-accent)] shadow-[0_0_8px_rgba(var(--gm-accent-rgb),0.6)]" : "bg-red-500"} animate-pulse`} />
            <h3 className="text-[10px] uppercase font-mono tracking-[2px] text-white/40">
              Sistema // Notificações
            </h3>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Status Control */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider">Status APROVADO</div>
              <div className="text-[10px] text-white/40 mt-1 font-mono uppercase">
                Auto-disparo: {remindersEnabled ? "Ativado" : "Desativado"}
              </div>
            </div>
            <button
              type="button"
              className={`h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                remindersEnabled 
                ? "bg-[var(--gm-accent)]/20 text-[var(--gm-accent)] border border-[var(--gm-accent)]/30" 
                : "bg-white/5 text-white/40 border border-white/10"
              }`}
              onClick={() => setRemindersEnabled(!remindersEnabled)}
            >
              {remindersEnabled ? "Ativo" : "Off"}
            </button>
          </div>
          
          {permissionStatus === "denied" && (
            <div className="p-4 rounded-xl bg-red-500/5 border border-dashed border-red-500/30 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <BellOff size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div className="text-[10px] text-red-200/60 leading-relaxed font-mono uppercase">
                  <span className="font-bold text-red-400 block mb-1">Erro: Permissão Negada</span>
                  {isIframe ? (
                    "Restrição de Iframe detectada. Abra em nova aba para ignorar a política de segurança."
                  ) : (
                    "Notificações do sistema bloqueadas. Redefina as permissões nas configurações do navegador."
                  )}
                </div>
              </div>
              {isIframe && (
                <button 
                  onClick={handleOpenNewTab}
                  className="h-8 w-full rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[10px] font-bold uppercase tracking-widest transition-colors border border-red-500/30"
                >
                  Iniciar Nova Instância
                </button>
              )}
            </div>
          )}

          {!pushStatus.ok && (
            <div className="p-3 rounded-xl bg-[var(--gm-primary)]/5 border border-dashed border-[var(--gm-primary)]/20 flex items-start gap-3">
              <Clock size={14} className="text-[var(--gm-primary)] shrink-0 mt-0.5" />
              <div className="text-[9px] text-[var(--gm-primary)]/60 font-mono uppercase leading-tight">
                <span className="text-[var(--gm-primary)] font-bold">Aviso:</span> {pushStatus.reason}
                <br />
                <span className="opacity-50 mt-1 block">Os lembretes locais (com o app aberto) continuarão funcionando normalmente.</span>
              </div>
            </div>
          )}

          {/* Time Controls - Hardware Grid */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "CH 01", val: rem1, set: setRem1 },
              { label: "CH 02", val: rem2, set: setRem2 },
              { label: "CH 03", val: rem3, set: setRem3 }
            ].map((ch, idx) => (
              <div key={idx} className="space-y-2">
                <label className="text-[9px] uppercase font-mono tracking-widest text-white/30 block text-center">
                  {ch.label}
                </label>
                <div className="relative group">
                  <input
                    type="time"
                    className="w-full h-12 bg-black/40 border border-white/10 rounded-lg text-center text-sm font-mono text-white focus:border-[var(--gm-primary)] focus:ring-1 focus:ring-[var(--gm-primary)] transition-all disabled:opacity-30"
                    value={ch.val}
                    onChange={(e) => ch.set(e.target.value)}
                    disabled={!remindersEnabled}
                  />
                  <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-lg group-hover:border-white/10 transition-colors" />
                </div>
              </div>
            ))}
          </div>

          {savedToast && (
            <div className="bg-[var(--gm-accent)]/5 border border-dashed border-[var(--gm-accent)]/30 text-[var(--gm-accent)] text-[9px] font-mono uppercase p-3 rounded-xl text-center animate-pulse">
              {savedToast}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 space-y-3">
            <div className="text-[9px] text-white/20 text-center px-4 font-mono uppercase tracking-wider">
              Nota: Instalação PWA recomendada para execução em segundo plano.
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                className="h-12 rounded-xl bg-[var(--gm-primary)] hover:opacity-90 text-white text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(var(--gm-primary-rgb),0.2)]"
                onClick={handleSave}
              >
                <Save size={14} />
                Salvar
              </button>

              <button 
                className="h-12 rounded-xl border border-white/10 bg-white/5 text-white/40 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                onClick={handleTestNotification}
                type="button"
              >
                <Bell size={14} />
                Testar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
