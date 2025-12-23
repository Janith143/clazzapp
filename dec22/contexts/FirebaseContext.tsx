
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
    const { addToast } = useUI();
    const { currentUser } = useAuth();
    const [fcmToken, setFcmToken] = useState<string | null>(null);

    // Setup FCM
    useEffect(() => {
        let unsubscribeOnMessage: (() => void) | undefined;

        const setupFcm = async () => {
            try {
                const messaging = await messagingPromise;
                if (!messaging) {
                    console.log('Firebase Messaging not available.');
                    return;
                }

                if ('serviceWorker' in navigator) {
                    // Wait specifically for the SW registration
                    // This prevents 'missing required authentication credential' errors
                    // by ensuring we have a valid registration scope.
                    let registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
                    
                    if (!registration) {
                        // If not found (e.g. first load), wait for ready or try register
                        registration = await navigator.serviceWorker.ready;
                    }
                    
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        console.log('Notification permission granted.');
                        
                        try {
                            const currentToken = await getToken(messaging, { 
                                vapidKey: "BP91yF-1yA6aV0k-1uG2yE-3lB4mN5oP6qR7sT8uV9w",
                                serviceWorkerRegistration: registration 
                            });

                            if (currentToken) {
                                console.log('FCM Token:', currentToken);
                                setFcmToken(currentToken);
                                
                                if (currentUser?.id) {
                                    const userRef = doc(db, "users", currentUser.id);
                                    const userDoc = await getDoc(userRef);
                                    
                                    if (userDoc.exists()) {
                                        const userData = userDoc.data() as User;
                                        if (!userData.fcmTokens || !userData.fcmTokens.includes(currentToken)) {
                                            await updateDoc(userRef, {
                                                fcmTokens: arrayUnion(currentToken)
                                            });
                                            console.log('FCM token saved to user profile.');
                                        }
                                    }
                                }
                            } else {
                                console.log('No registration token available. Request permission to generate one.');
                            }
                        } catch (tokenError) {
                            console.error("Error retrieving FCM token:", tokenError);
                        }
                    } else {
                        console.log('Unable to get permission to notify.');
                    }
                }

                // Handle foreground messages
                unsubscribeOnMessage = onMessage(messaging, (payload) => {
                    console.log('Message received. ', payload);
                    const title = payload.notification?.title || 'New Message';
                    const body = payload.notification?.body || 'You have a new notification!';
                    
                    addToast(`${title}: ${body}`, 'info');
                });

            } catch (error) {
                console.error('An error occurred during FCM setup:', error);
            }
        };

        setupFcm();

        return () => {
            if (unsubscribeOnMessage) {
                unsubscribeOnMessage();
            }
        };

    }, [currentUser?.id, addToast]);
    
    const value = {
        fcmToken
    };

    return (
        <FirebaseContext.Provider value={value}>
            {children}
        </FirebaseContext.Provider>
    );
};

export const useFirebase = (): FirebaseContextType => {
    const context = useContext(FirebaseContext);
    if (context === undefined) {
        throw new Error('useFirebase must be used within a FirebaseProvider');
    }
    return context;
};
