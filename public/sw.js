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
  apiKey: "AIzaSyDOGFwwRtGhXed5XFsR_9HGGP6tAd_-59o",
  authDomain: "easy-market-gm.firebaseapp.com",
  projectId: "easy-market-gm",
  storageBucket: "easy-market-gm.firebasestorage.app",
  messagingSenderId: "594745417419",
  appId: "1:594745417419:web:08a669177a34794a57454e"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);
  const title = payload.notification?.title || "CardDigital GM";
  const body = payload.notification?.body || "Nova notificação recebida";
  const icon = payload.notification?.icon || "/icon-192.png";

  const notificationOptions = {
    body,
    icon,
    badge: icon,
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
        icon: '/icon-192.png',
        badge: '/icon-192.png',
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
  if (event.data && event.data.type === 'START_BACKGROUND_SYNC') {
    if (!intervalId) {
       intervalId = setInterval(() => {
          // Keep alive tick
       }, 20000);
    }
  }
});
