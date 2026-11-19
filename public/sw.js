self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Firebase Cloud Messaging Setup for background push
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAx0InWwWYapHOlNfIL_D3s9sfQjmIRi-w",
  authDomain: "gen-lang-client-0508823448.firebaseapp.com",
  projectId: "gen-lang-client-0508823448",
  storageBucket: "gen-lang-client-0508823448.firebasestorage.app",
  messagingSenderId: "594745417419",
  appId: "1:594745417419:web:08a669177a34794a57454e"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

const OFFICIAL_APP_FAVICON = "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/logo.png";
const SINGLE_APP_NOTIFICATION_TAG = "carddigital-gm-single-notification";

let lastSwNotifKey = "";
let lastSwNotifAt = 0;

function showSingleAppNotification(title, options) {
  const now = Date.now();
  const body = (options && options.body) || "";
  const dedupeKey = `${String(title).trim().toLowerCase()}::${String(body).trim().toLowerCase()}`;
  if (dedupeKey === lastSwNotifKey && now - lastSwNotifAt < 6000) {
    return Promise.resolve();
  }
  lastSwNotifKey = dedupeKey;
  lastSwNotifAt = now;

  const finalOptions = Object.assign({}, options, {
    tag: SINGLE_APP_NOTIFICATION_TAG,
    renotify: true,
  });

  return self.registration
    .getNotifications()
    .then((existing) => {
      if (Array.isArray(existing)) {
        existing.forEach((n) => {
          if (n.tag !== SINGLE_APP_NOTIFICATION_TAG) {
            try {
              n.close();
            } catch (e) {}
          }
        });
      }
      return self.registration.showNotification(title, finalOptions);
    })
    .catch(() => self.registration.showNotification(title, finalOptions));
}

function getLocalTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);
  const title = payload.notification?.title || "CardDigital GM";
  const body = payload.notification?.body || "Nova notificação recebida";
  const icon = payload.notification?.icon || OFFICIAL_APP_FAVICON;

  const notificationOptions = {
    body,
    icon,
    badge: OFFICIAL_APP_FAVICON,
    data: payload.data || { url: '/' },
    vibrate: [200, 100, 200]
  };

  showSingleAppNotification(title, notificationOptions);
});

self.addEventListener('push', function(event) {
  try {
    const data = event.data?.json();
    if (data && data.type === 'custom-local-alarm') {
      const options = {
        body: data.body,
        icon: data.icon || OFFICIAL_APP_FAVICON,
        badge: OFFICIAL_APP_FAVICON,
        vibrate: [200, 100, 200],
        data: { url: typeof data.url === 'string' ? data.url : '/' }
      };
      event.waitUntil(showSingleAppNotification(data.title, options));
    }
  } catch (e) {
    // Let Firebase handle it
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      let targetUrl = event.notification.data?.url || '/';
      
      if (targetUrl.startsWith('/')) {
        targetUrl = self.location.origin + targetUrl;
      }

      if (windowClients.length > 0) {
        const client = windowClients[0];
        client.focus();
        
        if (targetUrl.includes('/#')) {
          client.postMessage({ type: 'NAVIGATE', url: targetUrl });
        } else {
          return client.navigate(targetUrl);
        }
      } else {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

let intervalId;
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data === 'TEST_NOTIFICATION' || event.data.type === 'TEST_NOTIFICATION') {
    const title = event.data.title || "🔔 CardDigital GM · Notificação de Teste";
    const body = event.data.body || "Sua notificação em tempo real está funcionando perfeitamente dentro e fora do app!";
    const icon = event.data.icon || OFFICIAL_APP_FAVICON;
    const badge = event.data.badge || OFFICIAL_APP_FAVICON;
    const options = {
      body: body,
      icon: icon,
      badge: badge,
      vibrate: [200, 100, 200],
      requireInteraction: false,
      data: { url: event.data.url || '/' }
    };
    showSingleAppNotification(title, options);
  }

  // Notificação agendada (ex: 5s para testar minimizado ou 10s para segundo plano)
  if (event.data.type === 'SCHEDULE_TEST_NOTIFICATION') {
    const delay = event.data.delay || 5000;
    const title = event.data.title || "🔔 CardDigital GM · Teste em Segundo Plano";
    const body = event.data.body || "Notificação entregue com sucesso enquanto o app estava minimizado!";
    const icon = event.data.icon || OFFICIAL_APP_FAVICON;
    const badge = event.data.badge || OFFICIAL_APP_FAVICON;
    const url = event.data.url || '/';

    setTimeout(() => {
      showSingleAppNotification(title, {
        body,
        icon,
        badge,
        vibrate: [200, 100, 200],
        requireInteraction: false,
        data: { url }
      });
    }, delay);
  }

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const title = event.data.title || "CardDigital GM";
    const icon = event.data.icon || OFFICIAL_APP_FAVICON;
    const badge = event.data.badge || OFFICIAL_APP_FAVICON;
    const options = {
      body: event.data.body || "",
      icon: icon,
      badge: badge,
      vibrate: event.data.vibrate || [200, 100, 200],
      data: event.data.data || { url: '/' }
    };
    showSingleAppNotification(title, options);
  }

  if (event.data.type === 'CHECK_BACKGROUND_ALARMS') {
    checkBackgroundAlarms();
  }

  if (event.data.type === 'PING') {
    if (event.source && typeof event.source.postMessage === 'function') {
      event.source.postMessage({ type: 'PONG', timestamp: Date.now(), version: 7 });
    }
  }

  if (event.data && event.data.type === 'START_BACKGROUND_SYNC') {
    if (!intervalId) {
       intervalId = setInterval(() => {
          checkBackgroundAlarms();
       }, 30000);
    }
  }
});

// Suporte a Background Sync e Periodic Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-alarms') {
    event.waitUntil(checkBackgroundAlarms());
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-alarms-periodic') {
    event.waitUntil(checkBackgroundAlarms());
  }
});

// Função para checar alarmes no IndexedDB em segundo plano (somente se não houver aba visível aberta)
function checkBackgroundAlarms() {
  return self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clients) => {
      const hasVisibleClient = Array.isArray(clients) && clients.some(
        (c) => c.visibilityState === 'visible' || c.focused
      );
      if (hasVisibleClient) {
        return false;
      }

      return new Promise((resolve) => {
        try {
          const openReq = indexedDB.open("gm_pro_db", 2);
          openReq.onerror = () => resolve(false);
          openReq.onsuccess = () => {
            const db = openReq.result;
            if (!db.objectStoreNames.contains("alarms")) {
              return resolve(false);
            }
            const tx = db.transaction("alarms", "readwrite");
            const store = tx.objectStore("alarms");
            const getAllReq = store.getAll();

            getAllReq.onsuccess = () => {
              const alarms = getAllReq.result || [];
              const now = new Date();
              const today = getLocalTodayKey();
              const currentHours = now.getHours();
              const currentMinutes = now.getMinutes();
              const currentTotalMinutes = currentHours * 60 + currentMinutes;
              const currentTime = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

              let dueAlarm = null;

              alarms.forEach((alarm) => {
                if (!alarm.active) return;
                if (alarm.date && alarm.date !== today) return;
                if (alarm.lastTriggeredOn === today) return;

                let isDue = alarm.time === currentTime;
                if (!isDue) {
                  try {
                    const [h, m] = (alarm.time || "00:00").split(':').map(Number);
                    const diff = currentTotalMinutes - (h * 60 + m);
                    if (diff >= 0 && diff <= 45) {
                      isDue = true;
                    }
                  } catch {}
                }

                if (isDue) {
                  if (!dueAlarm) dueAlarm = alarm;
                  alarm.lastTriggeredOn = today;
                  alarm.triggered = true;
                  store.put(alarm);
                }
              });

              if (dueAlarm) {
                const notifTitle = `⏰ CardDigital GM · Alarme (${dueAlarm.time})`;
                let notifBody = `Lembrete agendado para ${dueAlarm.clientName || 'Cliente'}.`;
                if (dueAlarm.type === 'EXPENSE') {
                  notifBody = `Lembrete: Pagamento da despesa de "${dueAlarm.clientName}" agendado para ${dueAlarm.time}.`;
                } else if (dueAlarm.type === 'NOTE') {
                  notifBody = `Lembrete da nota "${dueAlarm.clientName}" programado para ${dueAlarm.time}.`;
                } else {
                  notifBody = `Orçamento "${dueAlarm.clientName}" em andamento. Prazo estimado: ${dueAlarm.deliveryDays || 5} dias.`;
                }

                showSingleAppNotification(notifTitle, {
                  body: notifBody,
                  icon: OFFICIAL_APP_FAVICON,
                  badge: OFFICIAL_APP_FAVICON,
                  vibrate: [200, 100, 200],
                  data: {
                    url: dueAlarm.type === 'EXPENSE' ? '/expenses' : dueAlarm.type === 'NOTE' ? '/notes' : '/budgets',
                    alarmId: dueAlarm.id,
                  }
                });
              }

              tx.oncomplete = () => resolve(true);
            };
          };
        } catch (e) {
          resolve(false);
        }
      });
    })
    .catch(() => false);
}
