import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
// FIX: Corrected Firebase Storage import to use a named export as per the v9 modular SDK.
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getMessaging, isSupported as isMessagingSupported, Messaging } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDu1E1bp_xNe9mjCa1UH568yQuh8zBDYM4",
    authDomain: "clazz2-new.firebaseapp.com",
    projectId: "clazz2-new",
    storageBucket: "clazz2-new.firebasestorage.app",
    messagingSenderId: "487626975727",
    appId: "1:487626975727:web:2cfcb0cac5ddcf50ddae1a"
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