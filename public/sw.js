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
    vibrate: [200, 100, 200, 100, 200]
  };

  self.registration.showNotification(title, notificationOptions);
});

self.addEventListener('push', function(event) {
  // If the push is handled by firebase, it might consume the event.
  // We only handle it manually if it has our custom plain data.
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
      event.waitUntil(self.registration.showNotification(data.title, options));
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
      
      // Ensure target URL is absolute to avoid relative path issues
      if (targetUrl.startsWith('/')) {
        targetUrl = self.location.origin + targetUrl;
      }

      if (windowClients.length > 0) {
        const client = windowClients[0];
        client.focus();
        
        // If it's just a hash change, we can try to send a message or let it navigate
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
      vibrate: [200, 100, 200, 100, 200],
      tag: 'test-notification-' + Date.now(),
      renotify: true,
      requireInteraction: false,
      data: { url: event.data.url || '/' }
    };
    self.registration.showNotification(title, options);
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
      self.registration.showNotification(title, {
        body,
        icon,
        badge,
        vibrate: [200, 100, 200, 100, 200],
        tag: 'test-sched-' + Date.now(),
        renotify: true,
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
      tag: event.data.tag || 'gm-notif-' + Date.now(),
      renotify: true,
      data: event.data.data || { url: '/' }
    };
    self.registration.showNotification(title, options);
  }

  if (event.data.type === 'CHECK_BACKGROUND_ALARMS') {
    checkBackgroundAlarms();
  }

  if (event.data.type === 'PING') {
    if (event.source && typeof event.source.postMessage === 'function') {
      event.source.postMessage({ type: 'PONG', timestamp: Date.now(), version: 6 });
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

// Função para checar alarmes no IndexedDB em segundo plano
function checkBackgroundAlarms() {
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
          const today = now.toISOString().split('T')[0];
          const currentHours = now.getHours();
          const currentMinutes = now.getMinutes();
          const currentTotalMinutes = currentHours * 60 + currentMinutes;
          const currentTime = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

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
              const notifTitle = `⏰ CardDigital GM · Alarme (${alarm.time})`;
              let notifBody = `Lembrete agendado para ${alarm.clientName || 'Cliente'}.`;
              if (alarm.type === 'EXPENSE') {
                notifBody = `Lembrete: Pagamento da despesa de "${alarm.clientName}" agendado para ${alarm.time}.`;
              } else if (alarm.type === 'NOTE') {
                notifBody = `Lembrete da nota "${alarm.clientName}" programado para ${alarm.time}.`;
              } else {
                notifBody = `Orçamento "${alarm.clientName}" em andamento. Prazo estimado: ${alarm.deliveryDays || 5} dias.`;
              }

              self.registration.showNotification(notifTitle, {
                body: notifBody,
                icon: OFFICIAL_APP_FAVICON,
                badge: OFFICIAL_APP_FAVICON,
                vibrate: [200, 100, 200, 100, 200],
                tag: 'alarm-' + alarm.id + '-' + today,
                renotify: true,
                data: {
                  url: alarm.type === 'EXPENSE' ? '/expenses' : alarm.type === 'NOTE' ? '/notes' : '/budgets',
                  alarmId: alarm.id,
                }
              });

              alarm.lastTriggeredOn = today;
              alarm.triggered = true;
              store.put(alarm);
            }
          });

          tx.oncomplete = () => resolve(true);
        };
      };
    } catch (e) {
      resolve(false);
    }
  });
}
