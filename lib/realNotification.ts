// lib/realNotification.ts
import { pushToast } from "../store/toast";
import { playNotificationSound } from "./audio";

export interface SystemNotificationOptions {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  url?: string;
  soundId?: string;
  inAppToast?: boolean;
}

const DEFAULT_ICON = "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg";

/**
 * Dispara uma notificação REAL tanto DENTRO do aplicativo (toast visual e som)
 * quanto FORA do aplicativo (notificação nativa do sistema operacional / desktop / mobile / PWA).
 */
export async function triggerRealNotification(options: SystemNotificationOptions = {}): Promise<boolean> {
  const title = options.title || "🔔 CardDigital GM · Notificação de Teste";
  const body = options.body || "Sua notificação em tempo real está funcionando perfeitamente dentro e fora do app!";
  const icon = options.icon || DEFAULT_ICON;
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
              badge: icon,
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
            badge: icon,
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
