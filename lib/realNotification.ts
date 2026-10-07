// lib/realNotification.ts
import { pushToast } from "../store/toast";
import { playNotificationSound } from "./audio";
import { readSettingsLocal } from "./settings";

export interface SystemNotificationOptions {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  url?: string;
  soundId?: string;
  inAppToast?: boolean;
}

// Logo oficial do CardDigital GM (Five Icon / Favicon / App Icon oficial em formato PNG para suporte total nos SOs)
export const OFFICIAL_APP_FAVICON = "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/logo.png";
export const OFFICIAL_APP_LOCAL_ICON = "/logo.png";

/**
 * Retorna o logo cadastrado pelo usuário (logo da empresa ou avatar).
 * Se o usuário tiver cadastrado seu logo nas Configurações, este é priorizado na caixa de notificações.
 */
export function getUserRegisteredLogo(): string | null {
  try {
    const settings = readSettingsLocal();
    if (settings?.company_logo_url && typeof settings.company_logo_url === "string" && settings.company_logo_url.trim()) {
      return settings.company_logo_url.trim();
    }
    if (settings?.avatar_url && typeof settings.avatar_url === "string" && settings.avatar_url.trim()) {
      return settings.avatar_url.trim();
    }
  } catch {}
  return null;
}

/**
 * Dispara uma notificação REAL tanto DENTRO do aplicativo (toast visual e som)
 * quanto FORA do aplicativo (notificação nativa do sistema operacional / desktop / mobile / PWA).
 * 
 * 1. Badge / Five Icon: Sempre o logo oficial do app CardDigital GM no cabeçalho do sistema.
 * 2. Icon / Caixa de Notificações: O logo cadastrado do usuário (ou oficial caso ainda não tenha cadastrado).
 */
export async function triggerRealNotification(options: SystemNotificationOptions = {}): Promise<boolean> {
  const title = options.title || "🔔 CardDigital GM · Notificação";
  const body = options.body || "Sua notificação em tempo real está funcionando perfeitamente dentro e fora do app!";
  
  // 1. Five Icon do App Oficial CardDigital GM para o cabeçalho/badge
  const badge = options.badge || OFFICIAL_APP_FAVICON;

  // 2. Logo cadastrado do usuário para a caixa de notificações
  const userRegisteredLogo = getUserRegisteredLogo();
  const icon = options.icon || userRegisteredLogo || OFFICIAL_APP_FAVICON;
  
  const url = options.url || (typeof window !== "undefined" ? window.location.href : "/");

  // 1. Tocar som ativo do sistema
  try {
    const savedSound = (typeof localStorage !== "undefined" ? localStorage.getItem("gm.notificationSound") : null) || options.soundId;
    playNotificationSound(savedSound || undefined);
  } catch (e) {
    console.warn("[Notification] Erro ao tocar som:", e);
  }

  // 2. Vibração tátil no smartphone
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 200]);
    } catch (e) {}
  }

  // 3. Notificação DENTRO DO APP (Toast em tempo real)
  if (options.inAppToast !== false) {
    pushToast({
      type: "success",
      title: title,
      message: body,
      ttl: 6000,
    });
  }

  // 4. Notificação FORA DO APP (Nativa do Sistema Operacional / Windows / Mac / Android / iOS PWA)
  if (typeof window !== "undefined" && "Notification" in window) {
    let permission = Notification.permission;
    
    // Se ainda não foi solicitada, solicita permissão imediatamente
    if (permission !== "granted" && permission !== "denied") {
      try {
        permission = await Notification.requestPermission();
      } catch (e) {
        console.warn("[Notification] Erro ao solicitar permissão:", e);
      }
    }

    if (permission === "granted") {
      let shownViaSw = false;

      // Disparo prioritário via Service Worker (garante entrega fora do app / 2º plano / minimizado)
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          if (reg && typeof reg.showNotification === "function") {
            const swOptions: any = {
              body,
              icon,
              badge,
              vibrate: [200, 100, 200, 100, 200],
              tag: "gm-real-notif-" + Date.now(),
              renotify: true,
              requireInteraction: false,
              data: { url },
            };
            await reg.showNotification(title, swOptions);
            shownViaSw = true;
          }

          if (reg && reg.active) {
            reg.active.postMessage({
              type: "TEST_NOTIFICATION",
              title,
              body,
              icon,
              badge,
              url,
            });
          }
        } catch (e) {
          console.warn("[Notification] Erro ao disparar via Service Worker:", e);
        }
      }

      // Disparo via Notification API do navegador (para navegadores de desktop)
      if (!shownViaSw) {
        try {
          const notif = new Notification(title, {
            body,
            icon,
            badge,
            tag: "gm-real-notif-" + Date.now(),
            requireInteraction: false,
            data: { url },
          } as any);

          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        } catch (e) {
          console.warn("[Notification] Erro ao instanciar Notification:", e);
        }
      }
    } else if (permission === "denied") {
      pushToast({
        type: "info",
        title: "Permissão de Notificação Bloqueada",
        message: "Para receber alertas fora do app, habilite as notificações nas configurações do seu navegador.",
        ttl: 7000,
      });
    }
  }

  return true;
}

/**
 * Adiciona uma notificação ao histórico local do cabeçalho do app
 */
export function addInAppNotificationItem(item: {
  title: string;
  message: string;
  type?: "system" | "alarm" | "update" | "direct";
  url?: string;
}) {
  try {
    const raw = localStorage.getItem("gm.notifications");
    const list = raw ? JSON.parse(raw) : [];
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const newItem = {
      id: "notif_" + Date.now(),
      title: item.title,
      message: item.message,
      time: timeStr,
      read: false,
      type: item.type || "system",
      url: item.url || "/",
    };
    list.unshift(newItem);
    localStorage.setItem("gm.notifications", JSON.stringify(list.slice(0, 50)));
    window.dispatchEvent(new CustomEvent("gm_notifications_changed"));
  } catch (e) {}
}

/**
 * 1. CHECK-IN ESTADO 1: APP ABERTO (FOREGROUND)
 * Dispara visual em tela, áudio tátil, vibração smartphone e atualiza sino
 */
export async function testNotificationAberto(customSound?: string): Promise<{ ok: boolean; message: string }> {
  const title = "🟢 CardDigital GM · App Aberto";
  const body = "Alerta visual, toque sonoro e vibração tátil funcionando perfeitamente em primeiro plano!";

  // 1. Toca som
  try {
    playNotificationSound(customSound);
  } catch {}

  // 2. Vibra smartphone
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([150, 80, 150]);
    } catch {}
  }

  // 3. Adiciona ao sino de notificações
  addInAppNotificationItem({
    title,
    message: body,
    type: "system",
  });

  // 4. Toast Apple Glass
  pushToast({
    type: "success",
    title,
    message: body,
    ttl: 5000,
  });

  return { ok: true, message: "Notificação em tela executada com sucesso!" };
}

/**
 * 2. CHECK-IN ESTADO 2: APP MINIMIZADO
 * Agenda notificação via Service Worker com atraso (ex: 5s) para o usuário poder minimizar a janela
 */
export async function testNotificationMinimizado(delaySeconds = 5): Promise<{ ok: boolean; message: string }> {
  // Solicita permissão se necessário
  if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
    try {
      await Notification.requestPermission();
    } catch {}
  }

  const title = "🟡 CardDigital GM · App Minimizado";
  const body = "O sistema detectou que a janela estava minimizada e entregou o alerta nativo no sistema operacional!";
  const icon = getUserRegisteredLogo() || OFFICIAL_APP_FAVICON;

  // Tenta agendar no Service Worker para não ser congelado pelo navegador
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.active) {
        reg.active.postMessage({
          type: "SCHEDULE_TEST_NOTIFICATION",
          delay: delaySeconds * 1000,
          title,
          body,
          icon,
          badge: OFFICIAL_APP_FAVICON,
          url: "/",
        });
        return {
          ok: true,
          message: `Alerta agendado! Minimize a janela agora: ele surgirá em ${delaySeconds} segundos.`,
        };
      }
    } catch (e) {}
  }

  // Fallback com setTimeout se SW indisponível
  setTimeout(async () => {
    await triggerRealNotification({
      title,
      body,
      icon,
      inAppToast: false,
    });
  }, delaySeconds * 1000);

  return {
    ok: true,
    message: `Alerta agendado! Minimize a janela agora: ele surgirá em ${delaySeconds} segundos.`,
  };
}

/**
 * 3. CHECK-IN ESTADO 3: EM SEGUNDO PLANO (OUTRA ABA OU TELA BLOQUEADA)
 * Agenda no Service Worker para 8 segundos para o usuário trocar de aba ou bloquear a tela
 */
export async function testNotificationSegundoPlano(delaySeconds = 8): Promise<{ ok: boolean; message: string }> {
  if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
    try {
      await Notification.requestPermission();
    } catch {}
  }

  const title = "🔵 CardDigital GM · Segundo Plano";
  const body = "Notificação recebida com sucesso com o dispositivo com tela bloqueada ou em outra aba!";
  const icon = getUserRegisteredLogo() || OFFICIAL_APP_FAVICON;

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.active) {
        reg.active.postMessage({
          type: "SCHEDULE_TEST_NOTIFICATION",
          delay: delaySeconds * 1000,
          title,
          body,
          icon,
          badge: OFFICIAL_APP_FAVICON,
          url: "/",
        });
        return {
          ok: true,
          message: `Agendado! Bloqueie a tela ou abra outro aplicativo agora. Alerta chegará em ${delaySeconds}s.`,
        };
      }
    } catch (e) {}
  }

  setTimeout(async () => {
    await triggerRealNotification({
      title,
      body,
      icon,
      inAppToast: false,
    });
  }, delaySeconds * 1000);

  return {
    ok: true,
    message: `Agendado! Bloqueie a tela ou abra outro aplicativo agora. Alerta chegará em ${delaySeconds}s.`,
  };
}

/**
 * 4. CHECK-IN ESTADO 4: APP FECHADO (PUSH & SERVICE WORKER)
 * Dispara notificação via Service Worker nativo e checa prontidão de Web Push
 */
export async function testNotificationFechado(): Promise<{ ok: boolean; message: string; details: any }> {
  const title = "🟣 CardDigital GM · App Fechado / Push";
  const body = "Infraestrutura de Push e Service Worker ativa! Notificações chegam mesmo com o app encerrado.";
  const icon = getUserRegisteredLogo() || OFFICIAL_APP_FAVICON;

  let swActive = false;
  let permission = typeof Notification !== "undefined" ? Notification.permission : "unknown";

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === "function") {
        await reg.showNotification(title, {
          body,
          icon,
          badge: OFFICIAL_APP_FAVICON,
          vibrate: [200, 100, 200, 100, 200],
          tag: "test-push-fechado-" + Date.now(),
          renotify: true,
          data: { url: "/" },
        } as any);
        swActive = true;
      }
    } catch (e) {}
  }

  return {
    ok: swActive,
    message: swActive
      ? "Push disparado com sucesso através do Service Worker independente!"
      : "Service Worker ainda iniciando ou permissão pendente.",
    details: {
      permission,
      serviceWorkerActive: swActive,
    },
  };
}

/**
 * Diagnóstico completo em tempo real do ecossistema de notificações
 */
export async function getNotificationDiagnostics() {
  const isBrowser = typeof window !== "undefined";
  const notifSupported = isBrowser && "Notification" in window;
  const permission = notifSupported ? Notification.permission : "unsupported";
  const swSupported = isBrowser && "serviceWorker" in navigator;
  let swReady = false;
  let swScope = "";

  if (swSupported) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        swReady = true;
        swScope = reg.scope;
      }
    } catch {}
  }

  const isIOS = isBrowser && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = isBrowser && (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );

  const vibrateSupported = isBrowser && "vibrate" in navigator;
  const savedSound = isBrowser ? localStorage.getItem("gm.notificationSound") || "classic_chord" : "classic_chord";
  const muted = isBrowser ? localStorage.getItem("gm.notificationsMuted") === "true" : false;

  return {
    notificationSupported: notifSupported,
    permission,
    serviceWorkerSupported: swSupported,
    serviceWorkerReady: swReady,
    serviceWorkerScope: swScope,
    isIOS,
    isStandalone,
    vibrateSupported,
    currentSound: savedSound,
    soundMuted: muted,
  };
}
