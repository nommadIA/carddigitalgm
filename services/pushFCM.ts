import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { supabase } from "../lib/supabase";

const sanitize = (val: any) => typeof val === "string" ? val.trim().replace(/['"]/g, "") : val;

const firebaseConfig = {
  apiKey: "AIzaSyDOGFwwRtGhXed5XFsR_9HGGP6tAd_-59o",
  authDomain: "easy-market-gm.firebaseapp.com",
  projectId: "easy-market-gm",
  storageBucket: "easy-market-gm.firebasestorage.app",
  messagingSenderId: "594745417419",
  appId: "1:594745417419:web:08a669177a34794a57454e",
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

    // Unregister all existing service workers to clear any conflicts
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let registration of registrations) {
      await registration.unregister();
      console.log("[PushFCM] Unregistered old service worker:", registration.scope);
    }

    const swReg = await navigator.serviceWorker.register("/sw.js?v=4");
    await swReg.update();
    
    // Wait for the service worker to be ready
    const readySwReg = await navigator.serviceWorker.ready;

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

    // Diagnóstico detalhado para o usuário verificar no console
    console.log("[PushFCM] Verificando Configuração Firebase:");
    console.log("- API Key (Início/Fim):", firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...${firebaseConfig.apiKey.slice(-5)}` : "MISSING");
    console.log("- Project ID:", firebaseConfig.projectId || "MISSING");
    console.log("- App ID:", firebaseConfig.appId || "MISSING");
    console.log("- VAPID Key (Início/Fim):", cleanVapidKey ? `${cleanVapidKey.substring(0, 10)}...${cleanVapidKey.slice(-5)}` : "MISSING");

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
      // O Firebase usa atob internamente. Vamos testar se a chave é decodificável.
      // 1. Converte Base64URL para Base64 padrão
      let base64 = cleanVapidKey.replace(/-/g, '+').replace(/_/g, '/');
      // 2. Remove qualquer caractere que não seja válido em Base64 (proteção contra lixo de cópia/cola)
      base64 = base64.replace(/[^A-Za-z0-9+/]/g, '');
      // 3. Adicionamos preenchimento (padding) se necessário para o atob
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
      window.atob(padded);
    } catch (e) {
      console.warn("VAPID_KEY malformada (não é Base64 válido). Verifique se copiou a chave completa. Push desativado.");
      return { ok: false, reason: "malformed_vapid_key" };
    }

    // Clear Firebase Installations and Messaging cache if there's a problem
    try {
      const deleteDB = (dbName: string) => new Promise((resolve) => {
        const req = window.indexedDB.deleteDatabase(dbName);
        req.onsuccess = resolve;
        req.onerror = resolve;
        req.onblocked = resolve;
      });

      if (window.indexedDB.databases) {
        const dbs = await window.indexedDB.databases();
        for (const db of dbs) {
          if (db.name && (db.name.includes("firebase-installations") || db.name.includes("firebase-messaging") || db.name.includes("fcm"))) {
            await deleteDB(db.name);
            console.log("[PushFCM] Cleared Firebase DB:", db.name);
          }
        }
      } else {
        // Fallback for browsers that don't support indexedDB.databases()
        await deleteDB("firebase-installations-database");
        await deleteDB("firebase-messaging-database");
        await deleteDB("firebase-heartbeat-database");
        await deleteDB("fcm_token_details_db");
      }
    } catch (e) {
      console.warn("Could not clear IndexedDB:", e);
    }

    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: cleanVapidKey,
      serviceWorkerRegistration: readySwReg,
    });

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
    if (err?.message?.includes("Failed to fetch") || err?.code === "messaging/token-subscribe-failed") {
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