importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuração idêntica à do app principal
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

let lastFcmKey = "";
let lastFcmAt = 0;

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const title = payload.notification?.title || "CardDigital GM";
  const body = payload.notification?.body || "Nova notificação recebida";
  const icon = payload.notification?.icon || OFFICIAL_APP_FAVICON;

  const now = Date.now();
  const key = `${String(title).trim().toLowerCase()}::${String(body).trim().toLowerCase()}`;
  if (key === lastFcmKey && now - lastFcmAt < 6000) {
    return;
  }
  lastFcmKey = key;
  lastFcmAt = now;

  const notificationOptions = {
    body: body,
    icon: icon,
    badge: OFFICIAL_APP_FAVICON,
    tag: SINGLE_APP_NOTIFICATION_TAG,
    renotify: true,
    data: payload.data,
    vibrate: [200, 100, 200]
  };

  self.registration
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
      return self.registration.showNotification(title, notificationOptions);
    })
    .catch(() => self.registration.showNotification(title, notificationOptions));
});
