import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
// FIX: Corrected Firebase Storage import to use a named export as per the v9 modular SDK.
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getMessaging, isSupported as isMessagingSupported, Messaging } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA6oJphhWF6MNu9laM6VttpWnIr-WdNuRo",
  authDomain: "clazz2-9e0a9.firebaseapp.com",
  projectId: "clazz2-9e0a9",
  storageBucket: "clazz2-9e0a9.firebasestorage.app",
  messagingSenderId: "980531128265",
  appId: "1:980531128265:web:0426d80e932d6adbfc2a18"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get instances of Firebase services using v9+ modular SDK
export const db = getFirestore(app);
export const auth = getAuth(app);
// FIX: Correctly initialize storage using the imported getStorage function.
export const storage = getStorage(app);

// Handle messaging initialization asynchronously
export const messagingPromise: Promise<Messaging | null> = isMessagingSupported().then(supported => {
    if (supported) {
        console.log("Firebase Messaging is supported.");
        return getMessaging(app);
    }
    console.warn("Firebase Messaging is not supported in this browser.");
    return null;
}).catch(e => {
    console.warn("Error initializing Firebase Messaging:", e);
    return null;
});

export default app;