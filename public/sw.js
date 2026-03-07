importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// --- Firebase Config ---
try {
  firebase.initializeApp({
    apiKey: "AIzaSyDOGFwwRtGhXed5XFsR_9HGGP6tAd_-59o",
    authDomain: "easy-market-gm.firebaseapp.com",
    projectId: "easy-market-gm",
    storageBucket: "easy-market-gm.firebasestorage.app",
    messagingSenderId: "594745417419",
    appId: "1:594745417419:web:08a669177a34794a57454e"
  });

  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    console.log('[sw.js] Received background message ', payload);
    const title = payload.notification?.title || "CardDigital GM";
    const body = payload.notification?.body || "Nova notificação recebida";
    const icon = payload.notification?.icon || "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg";

    self.registration.showNotification(title, {
      body,
      icon,
      badge: icon,
      data: payload.data,
      vibrate: [200, 100, 200]
    });
  });
} catch (e) {
  console.error("[sw.js] Firebase init error:", e);
}

// --- IndexedDB Logic for SW ---
const DB_NAME = "gm_pro_db";
const STORE_NAME = "alarms";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAlarmsFromDB() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

async function markAlarmAsTriggeredInDB(alarmId) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(alarmId);
    request.onsuccess = () => {
      const alarm = request.result;
      if (alarm) {
        alarm.lastTriggeredOn = new Date().toISOString().split('T')[0];
        store.put(alarm);
      }
    };
  } catch (e) {}
}

// --- Background Check ---
let checkInterval = null;

async function checkAlarms() {
  try {
    const alarms = await getAlarmsFromDB();
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const today = new Date().toISOString().split('T')[0];

    for (const alarm of alarms) {
      if (alarm.active && alarm.time === currentTime && alarm.lastTriggeredOn !== today) {
        // Trigger notification
        self.registration.showNotification(alarm.type === 'EXPENSE' ? '🔔 Lembrete de Despesa' : '✅ Orçamento Aprovado', {
          body: `Cliente: ${alarm.clientName}\nHorário Programado: ${alarm.time}\n\nToque para ver os detalhes no CardDigital GM.`,
          icon: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg",
          badge: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg",
          vibrate: [200, 100, 200, 100, 200],
          tag: alarm.id,
          renotify: true,
          requireInteraction: true,
          data: { url: "/#/budgets" }
        });

        await markAlarmAsTriggeredInDB(alarm.id);
      }
    }
  } catch (e) {
    console.error("SW Check Error:", e);
  }
}

// Start checking
if (!checkInterval) {
  checkInterval = setInterval(checkAlarms, 30000); // Check every 30s for better accuracy
}

// Listen for manual triggers from the app
self.addEventListener("message", (event) => {
  if (event.data === "CHECK_ALARMS") {
    checkAlarms();
  }
  if (event.data === "TEST_NOTIFICATION") {
    self.registration.showNotification("Teste de Notificação", {
      body: "O Service Worker está ativo e funcionando!",
      icon: "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/LOGO%20APP%20oficial.svg",
      vibrate: [200, 100, 200],
      tag: "test-notification",
      requireInteraction: true,
      data: { url: "/#/" }
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(event.notification.data.url) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
