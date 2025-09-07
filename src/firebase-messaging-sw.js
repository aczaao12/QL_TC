importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCBIeRWKoBTllCpdqEaRukS6V62ddFABps",
  authDomain: "ql-tc-65613.firebaseapp.com",
  projectId: "ql-tc-65613",
  storageBucket: "ql-tc-65613.firebasestorage.app",
  messagingSenderId: "186724776357",
  appId: "1:186724776357:web:445be47a462fb7d937504c",
  measurementId: "G-HWQGTSE65Q"
};

// Initialize the Firebase app in the service worker by reusing the config from the main app
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'Background Message';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icons/icon-192x192.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
