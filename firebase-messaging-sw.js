
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA6oJphhWF6MNu9laM6VttpWnIr-WdNuRo",
  authDomain: "clazz2-9e0a9.firebaseapp.com",
  projectId: "clazz2-9e0a9",
  storageBucket: "clazz2-9e0a9.firebasestorage.app",
  messagingSenderId: "980531128265",
  appId: "1:980531128265:web:0426d80e932d6adbfc2a18"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.webpush?.notification?.icon || '/Logo3.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click received.');
    event.notification.close();

    // Determine URL to open
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    // Send message to client to handle navigation or state update
                    client.postMessage({
                        type: 'NOTIFICATION_CLICK',
                        payload: event.notification.data
                    });
                    return client.focus();
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
