
import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, messagingPromise } from '../firebase.ts';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useUI } from './UIContext.tsx';
import { useAuth } from './AuthContext.tsx';
import { getToken, onMessage } from 'firebase/messaging';
import { User } from '../types.ts';

interface FirebaseContextType {
    fcmToken: string | null;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { addToast, setChatWidgetOpen } = useUI();
    const { currentUser } = useAuth();
    const [fcmToken, setFcmToken] = useState<string | null>(null);

    const saveTokenToProfile = async (token: string) => {
        if (currentUser?.id) {
            const userRef = doc(db, "users", currentUser.id);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const userData = userDoc.data() as User;
                if (!userData.fcmTokens || !userData.fcmTokens.includes(token)) {
                    await updateDoc(userRef, {
                        fcmTokens: arrayUnion(token)
                    });
                    console.log('FCM token saved to user profile.');
                }
            }
        }
    };

    const enableNotifications = async (silent = false) => {

        // 0. Check for Native Android Shell
        if ((window as any).AndroidNative && (window as any).AndroidNative.getFcmToken) {
            const nativeToken = (window as any).AndroidNative.getFcmToken();
            console.log("Native Android Token Found:", nativeToken);
            if (nativeToken) {
                setFcmToken(nativeToken);
                await saveTokenToProfile(nativeToken);
                if (!silent) addToast('Native Notifications enabled!', 'success');
                return; // Skip Web Push logic
            }
        }

        if (!('Notification' in window)) {
            console.log('Notification API not supported in this browser.');
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted.');
            try {
                const messaging = await messagingPromise;
                if (!messaging) return;

                let registration: ServiceWorkerRegistration | undefined;

                if ('serviceWorker' in navigator) {
                    // Start by checking if we have a registration
                    registration = await navigator.serviceWorker.getRegistration();

                    // If not found or not active, wait for the 'ready' promise
                    if (!registration || !registration.active) {
                        console.log('Waiting for Service Worker to be ready...');
                        registration = await navigator.serviceWorker.ready;
                    }
                }

                const currentToken = await getToken(messaging, {
                    vapidKey: "BLk_TH2Pmf_M2_PpNQHazldZWKyZRL_7DsYGt8yToxYB-wXSjCew2JoKb-pxgS8FzwGkmcWz4NttuURRR7VdEu4",
                    serviceWorkerRegistration: registration
                });

                if (currentToken) {
                    console.log('FCM Token:', currentToken);
                    setFcmToken(currentToken);
                    await saveTokenToProfile(currentToken);
                    if (!silent) addToast('Notifications enabled successfully!', 'success');
                }
            } catch (tokenError) {
                console.error("Error retrieving FCM token:", tokenError);
                if (!silent) addToast('Failed to enable notifications. Please try again.', 'error');
            }
        } else {
            console.log('Unable to get permission to notify.');
            if (!silent) addToast('Permission denied. Please enable notifications in browser settings.', 'error');
        }
    };

    // Poll for Android Native Interface
    useEffect(() => {
        const checkForNative = async () => {
            if ((window as any).AndroidNative && (window as any).AndroidNative.getFcmToken) {
                const nativeToken = (window as any).AndroidNative.getFcmToken();
                if (nativeToken) {
                    console.log("Native Android Token Found via Poll:", nativeToken);
                    setFcmToken(nativeToken);
                    await saveTokenToProfile(nativeToken);
                    return true;
                }
            }
            return false;
        };

        // Check immediately
        checkForNative();

        let attempts = 0;
        const intervalId = setInterval(async () => {
            if (attempts > 10) { clearInterval(intervalId); return; } // Stop after 10 seconds
            const found = await checkForNative();
            if (found) clearInterval(intervalId);
            attempts++;
        }, 1000);

        return () => clearInterval(intervalId);
    }, [currentUser?.id]);

    // Setup FCM Listener
    useEffect(() => {
        let unsubscribeOnMessage: (() => void) | undefined;
        // ... (rest of existing setupFcmListener logic) ...

        const setupFcmListener = async () => {
            try {
                const messaging = await messagingPromise;
                if (!messaging) return;

                // Handle foreground messages
                unsubscribeOnMessage = onMessage(messaging, (payload) => {
                    console.log('Message received. ', payload);
                    const title = payload.notification?.title || 'New Message';
                    const body = payload.notification?.body || 'You have a new notification!';

                    addToast(`${title}: ${body}`, 'info');

                    if (payload.data?.type === 'chat_reply') {
                        setChatWidgetOpen(true);
                    }
                });

                // Auto-request permission on non-iOS devices if not yet granted
                // iOS requires a user gesture, so we skip auto-request there to avoid crashes/issues.
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

                if ('Notification' in window) {
                    if (Notification.permission === 'granted') {
                        enableNotifications(true);
                    } else if (Notification.permission === 'default' && !isIOS) {
                        // Automatically ask on Desktop/Android
                        // Pass false to show success toast if they explicitly click 'Allow', 
                        // but true if we want to avoid spam. 
                        // Let's use true (silent) for the background check to be safe from loops.
                        enableNotifications(true);
                    }
                }

            } catch (error) {
                console.error('An error occurred during FCM listener setup:', error);
            }
        };

        setupFcmListener();

        return () => {
            if (unsubscribeOnMessage) {
                unsubscribeOnMessage();
            }
        };

    }, [currentUser?.id, addToast]);

    const value = {
        fcmToken,
        enableNotifications // Export this function
    };

    return (
        <FirebaseContext.Provider value={value}>
            {children}
        </FirebaseContext.Provider>
    );
};

export const useFirebase = (): FirebaseContextType & { enableNotifications: (silent?: boolean) => Promise<void> } => {
    const context = useContext(FirebaseContext);
    if (context === undefined) {
        throw new Error('useFirebase must be used within a FirebaseProvider');
    }
    return context as FirebaseContextType & { enableNotifications: (silent?: boolean) => Promise<void> };
};
