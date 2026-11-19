import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { supabase } from "../lib/supabase";

const sanitize = (val: any) => typeof val === "string" ? val.trim().replace(/['"]/g, "") : val;

const firebaseConfig = {
  apiKey: sanitize(import.meta.env.VITE_FIREBASE_API_KEY) || "AIzaSyAx0InWwWYapHOlNfIL_D3s9sfQjmIRi-w",
  authDomain: sanitize(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || "gen-lang-client-0508823448.firebaseapp.com",
  projectId: sanitize(import.meta.env.VITE_FIREBASE_PROJECT_ID) || "gen-lang-client-0508823448",
  storageBucket: sanitize(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || "gen-lang-client-0508823448.firebasestorage.app",
  messagingSenderId: sanitize(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || "594745417419",
  appId: sanitize(import.meta.env.VITE_FIREBASE_APP_ID) || "1:594745417419:web:08a669177a34794a57454e",
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

function isFirebaseConfigValid() {
  return (
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  );
}

export async function forceSavePushToken(tenantId: string, userId: string) {
  try {
    if (typeof window === "undefined") return { ok: false, reason: "no_window" };

    if (!isFirebaseConfigValid()) {
      console.warn("Firebase config inválida. Push desativado.");
      return { ok: false, reason: "invalid_config" };
    }

    if (!("Notification" in window)) return { ok: false, reason: "no_notification_api" };

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "permission_denied" };

    if (!("serviceWorker" in navigator)) return { ok: false, reason: "no_sw_api" };

    // Unregister only conflicting/legacy service workers, preserving active /sw.js?v=7
    const registrations = await navigator.serviceWorker.getRegistrations();
    let existingSwReg: ServiceWorkerRegistration | undefined;
    for (const registration of registrations) {
      const scriptUrl =
        registration.active?.scriptURL ||
        registration.waiting?.scriptURL ||
        registration.installing?.scriptURL ||
        "";
      if (scriptUrl.includes("/sw.js?v=7")) {
        existingSwReg = registration;
      } else {
        await registration.unregister().catch(() => {});
        console.log("[PushFCM] Unregistered legacy service worker:", registration.scope);
      }
    }

    const swReg = existingSwReg || (await navigator.serviceWorker.register("/sw.js?v=7"));
    await swReg.update().catch(() => {});
    
    // Wait for the service worker to be ready
    const readySwReg = await navigator.serviceWorker.ready;

    // Tenta registrar Background Sync (para Android/Chrome)
    try {
      // Background sync is often restricted in iframes, so we only try if we are top-level
      if (window === window.top) {
        if ('sync' in readySwReg) {
          await (readySwReg as any).sync.register('check-alarms');
          console.log("[PushFCM] Background Sync registered");
        }
        
        if ('periodicSync' in readySwReg) {
          const status = await (navigator as any).permissions.query({
            name: 'periodic-background-sync',
          });
          if (status.state === 'granted') {
            await (readySwReg as any).periodicSync.register('check-alarms-periodic', {
              minInterval: 15 * 60 * 1000, // Mínimo de 15 minutos (limite do Chrome)
            });
            console.log("[PushFCM] Periodic Sync registered");
          }
        }
      }
    } catch (e: any) {
      // Ignore the warning if it's about window context (iframe)
      if (!e?.message?.includes('without a window')) {
        console.debug("[PushFCM] Sync registration skipped or failed:", e.message);
      }
    }

    let app;
    if (getApps().length) {
      app = getApps()[0];
      if (app.options.apiKey !== firebaseConfig.apiKey) {
        await deleteApp(app);
        app = initializeApp(firebaseConfig);
      }
    } else {
      app = initializeApp(firebaseConfig);
    }

    // Hardcoded VAPID key from Firebase Console to avoid environment variable issues
    const rawVapid = "BMnNQ1r8Nb3FKjzE5BRAC5NraDjNHL4_-NTdKNQx7CmEQ8h_eC0L7JMQbclZkS7rrkxR5UtqLZYEzk9mWvxnwsk";
    const cleanVapidKey = typeof rawVapid === "string" 
      ? rawVapid.trim().replace(/\s/g, '') 
      : "";

    if (!firebaseConfig.apiKey || !firebaseConfig.apiKey.startsWith("AIza")) {
      console.error("ERRO: VITE_FIREBASE_API_KEY parece inválida ou não foi carregada corretamente. Verifique os Secrets.");
      return { ok: false, reason: "invalid_api_key_format" };
    }

    if (!cleanVapidKey || cleanVapidKey === "" || cleanVapidKey.includes("YOUR_") || cleanVapidKey.length < 30) {
      console.warn("VAPID_KEY não configurada ou muito curta. Push desativado.");
      return { ok: false, reason: "invalid_vapid_key" };
    }

    // Validação robusta de Base64URL para evitar erro do atob interno do Firebase
    try {
      let base64 = cleanVapidKey.replace(/-/g, '+').replace(/_/g, '/');
      base64 = base64.replace(/[^A-Za-z0-9+/]/g, '');
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
      window.atob(padded);
    } catch (e) {
      console.warn("VAPID_KEY malformada (não é Base64 válido). Verifique se copiou a chave completa. Push desativado.");
      return { ok: false, reason: "malformed_vapid_key" };
    }

    const messaging = getMessaging(app);

    let token = "";
    try {
      token = await getToken(messaging, {
        vapidKey: cleanVapidKey,
        serviceWorkerRegistration: readySwReg,
      });
    } catch {
      // Somente em caso de erro de cache/token corrompido, limpa IDB e tenta uma vez
      try {
        const deleteDB = (dbName: string) => new Promise((resolve) => {
          const req = window.indexedDB.deleteDatabase(dbName);
          req.onsuccess = resolve;
          req.onerror = resolve;
          req.onblocked = resolve;
        });
        await deleteDB("firebase-installations-database");
        await deleteDB("firebase-messaging-database");
        await deleteDB("fcm_token_details_db");
        token = await getToken(messaging, {
          vapidKey: cleanVapidKey,
          serviceWorkerRegistration: readySwReg,
        });
      } catch {}
    }

    if (!token) return { ok: false, reason: "empty_token" };

    await supabase.from("fcm_tokens").upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        token,
        platform: "web",
        device_info: navigator.userAgent,
      },
      { onConflict: "token" }
    );

    return { ok: true };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    if (errorMsg.includes("API key expired")) {
      console.warn("Push notifications setup disabled: API key expired.");
      return { ok: false, reason: "api_key_expired" };
    }
    if (errorMsg.includes("Failed to fetch") || err?.code === "messaging/token-subscribe-failed") {
      console.warn("Push notifications blocked by browser or adblocker (Failed to fetch). This is normal if you have tracking protection enabled.");
      return { ok: false, reason: "network_or_adblocker" };
    }
    console.warn("Push notifications setup failed:", err?.message || err);
    return { ok: false, reason: "exception" };
  }
}

export async function startPush(params: {
  tenantId: string;
  userId: string;
}) {
  return forceSavePushToken(params.tenantId, params.userId);
}