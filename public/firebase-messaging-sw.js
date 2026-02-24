messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "CardDigital GM";
  const body = payload.notification?.body || "Nova notificação";

  self.registration.showNotification(title, { body });
});