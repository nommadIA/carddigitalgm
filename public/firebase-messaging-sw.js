importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuração idêntica à do app principal
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
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const title = payload.notification?.title || "CardDigital GM";
  const body = payload.notification?.body || "Nova notificação recebida";
  const icon = payload.notification?.icon || "/logo.png";

  const notificationOptions = {
    body: body,
    icon: icon,
    badge: icon,
    data: payload.data,
    vibrate: [200, 100, 200]
  };

  self.registration.showNotification(title, notificationOptions);
});
