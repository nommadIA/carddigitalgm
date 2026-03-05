importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDOGFwwRtGhXed5XFsR_9HGGPG6tAd-_590",
  authDomain: "easy-market-gm.firebaseapp.com",
  projectId: "easy-market-gm",
  storageBucket: "easy-market-gm.appspot.com",
  messagingSenderId: "594745417419",
  appId: "1:594745417419:web:08a669177a34794a57454e"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "CardDigital GM";
  const body = payload.notification?.body || "Nova notificação";

  self.registration.showNotification(title, { body });
});
