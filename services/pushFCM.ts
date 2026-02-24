import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { supabase } from "../lib/supabase";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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
    if (typeof window === "undefined") return { ok: false };

    if (!isFirebaseConfigValid()) {
      console.warn("Firebase config inválida. Push desativado.");
      return { ok: false };
    }

    if (!("Notification" in window)) return { ok: false };

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false };

    if (!("serviceWorker" in navigator)) return { ok: false };

    const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    const app = getApps().length
      ? getApps()[0]
      : initializeApp(firebaseConfig);

    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (!token) return { ok: false };

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
  } catch (err) {
    console.error("Push error:", err);
    return { ok: false };
  }
}

export async function startPush(params: {
  tenantId: string;
  userId: string;
}) {
  return forceSavePushToken(params.tenantId, params.userId);
}