import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { User, GoogleUserInfo, FirebaseUser } from '../types.ts';
import { useUI } from './UIContext.tsx';
import { useNavigation } from './NavigationContext.tsx';
import { auth, db } from '../firebase.ts';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithCustomToken,
    signOut,
    linkWithCredential,
    EmailAuthProvider,
    verifyBeforeUpdateEmail,
    User as AuthUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, query, where, getDocs, collection, onSnapshot, updateDoc } from 'firebase/firestore';

export interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    handleLogin: (email: string, password: string) => Promise<User | null>;
    handleGoogleSignIn: () => Promise<{ existingUser: User | null; newUserInfo: GoogleUserInfo | null; }>;
    handleRegister: (email: string, password: string) => Promise<FirebaseUser | null>;
    handleLogout: () => void;
    handleLoginSuccess: (user: User, customMessage?: string | null) => void;
    handleResendVerificationEmail: (firebaseUser: AuthUser) => Promise<void>;
    handlePasswordReset: (email: string) => Promise<void>;
    sendPhoneNumberOtp: (phoneNumber: string) => Promise<void>;
    verifyPhoneNumberOtp: (phoneNumber: string, otp: string) => Promise<{ existingUser: User | null; newFirebaseUser: AuthUser | null; }>;
    linkPhoneNumber: (phoneNumber: string) => Promise<void>;
    verifyPhoneNumberLink: (otp: string, phoneNumber: string) => Promise<void>;
    updateUserAuthEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const { addToast, setModalState } = useUI();
    const { handleNavigate } = useNavigation();
    
    // NOTE: Replace with your actual deployed Cloud Function URL base
    const cloudFunctionBaseUrl = 'https://us-central1-gen-lang-client-0695487820.cloudfunctions.net/notification-function';

    useEffect(() => {
        // FIX: Replaced useRef with a closure variable to manage the snapshot subscription.
        // This is a cleaner pattern within useEffect and avoids potential race conditions or closure issues
        // that may have caused the "Expected 1 arguments, but got 0" error.
        let unsubscribeUserSnapshot: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (unsubscribeUserSnapshot) {
                unsubscribeUserSnapshot();
                unsubscribeUserSnapshot = undefined;
            }

            if (firebaseUser) {
                try {
                    const usersRef = collection(db, "users");
                    const q = query(usersRef, where("uid", "==", firebaseUser.uid));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const userDocRef = querySnapshot.docs[0].ref;

                        // FIX: Add an error handler to the onSnapshot listener for robustness.
                        unsubscribeUserSnapshot = onSnapshot(userDocRef, 
                            (docSnap) => {
                                if (docSnap.exists()) {
                                    const userData = docSnap.data() as User;
                                    if (firebaseUser.emailVerified || firebaseUser.phoneNumber) {
                                        setCurrentUser({ 
                                            ...userData, 
                                            isEmailVerified: firebaseUser.emailVerified, 
                                            isMobileVerified: !!firebaseUser.phoneNumber 
                                        });
                                    } else {
                                        setCurrentUser(null);
                                    }
                                } else {
                                    setCurrentUser(null);
                                }
                                setLoading(false);
                            },
                            (error) => {
                                console.error("Auth context onSnapshot error: ", error);
                                setCurrentUser(null);
                                setLoading(false);
                            }
                        );
                    } else {
                        setCurrentUser(null);
                        setLoading(false);
                    }
                } catch (error) {
                    console.error("Error fetching user document for auth state change:", error);
                    setCurrentUser(null);
                    setLoading(false);
                }
            } else {
                setCurrentUser(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeUserSnapshot) {
                unsubscribeUserSnapshot();
            }
        };
    }, []);

    const handleLoginSuccess = useCallback((user: User, customMessage?: string | null) => {
        // This manually sets the user state, fixing the race condition on new user registration.
        setCurrentUser(user);
        
        setModalState({ name: 'none' });
        if (customMessage) {
            addToast(customMessage, 'success');
        } else if (customMessage === undefined) {
            addToast(`Welcome back, ${user.firstName}!`, 'success');
        }
    }, [addToast, setModalState]);

    const handleLogin = useCallback(async (email: string, password: string): Promise<User | null> => {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        if (!userCredential.user!.emailVerified) {
            throw { code: 'auth/email-not-verified', user: userCredential.user };
        }

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("uid", "==", userCredential.user!.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw { code: 'auth/profile-incomplete', user: userCredential.user };
        }
        
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data() as User;

        handleLoginSuccess(userData);
        return userData;
    }, [handleLoginSuccess]);

    const handleGoogleSignIn = useCallback(async (): Promise<{ existingUser: User | null; newUserInfo: GoogleUserInfo | null; }> => {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user!;

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("uid", "==", user.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data() as User;
            handleLoginSuccess(userData, `Welcome back, ${userData.firstName}!`);
            return { existingUser: userData, newUserInfo: null };
        } else {
            return { 
                existingUser: null,
                newUserInfo: {
                    uid: user.uid,
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                }
            };
        }
    }, [handleLoginSuccess]);
    
    const handleRegister = useCallback(async (email: string, password: string): Promise<FirebaseUser | null> => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user!);
        return userCredential.user as FirebaseUser;
    }, []);
    
    const handleResendVerificationEmail = useCallback(async (firebaseUser: AuthUser) => {
        await sendEmailVerification(firebaseUser);
        addToast("Verification email sent. Please check your inbox.", "info");
    }, [addToast]);

    const handlePasswordReset = useCallback(async (email: string) => {
        await sendPasswordResetEmail(auth, email);
    }, []);

    const updateUserAuthEmail = useCallback(async (newEmail: string) => {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("No user is currently authenticated.");
        }
    
        const hasEmailProvider = user.providerData.some(
            (provider) => provider.providerId === EmailAuthProvider.PROVIDER_ID
        );
    
        try {
            if (hasEmailProvider) {
                await verifyBeforeUpdateEmail(user, newEmail);
            } else {
                const tempPassword = Math.random().toString(36).slice(-10);
                const credential = EmailAuthProvider.credential(newEmail, tempPassword);
    
                await linkWithCredential(user, credential);
    
                const updatedUser = auth.currentUser;
                if (updatedUser) {
                    await sendEmailVerification(updatedUser);
                } else {
                    throw new Error("User session lost after linking. Please try again.");
                }
            }
        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use' || error.code === 'auth/credential-already-in-use') {
                throw new Error("This email is already associated with another account.");
            } else if (error.code === 'auth/requires-recent-login') {
                 throw new Error('This is a sensitive action. Please log out and log back in to update your email.');
            }
            throw error;
        }
    }, []);
    
    const sendPhoneNumberOtp = useCallback(async (phoneNumber: string) => {
        const response = await fetch(`${cloudFunctionBaseUrl}/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to send OTP.');
        }
    }, [cloudFunctionBaseUrl]);

    const verifyPhoneNumberOtp = useCallback(async (phoneNumber: string, otp: string): Promise<{ existingUser: User | null; newFirebaseUser: AuthUser | null; }> => {
        console.log('verifyPhoneNumberOtp called', { phoneNumber, otp }); // ← debug log
        const response = await fetch(`${cloudFunctionBaseUrl}/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, otp }),
        });
    
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to verify OTP.');
        }
    
        const { customToken, isNewUser, newFirebaseUser } = data;
        const userCredential = await signInWithCustomToken(auth, customToken);
    
        if (isNewUser) {
            // Firestore document will be created in RegistrationPage, so we just return the new auth user
            return { existingUser: null, newFirebaseUser: newFirebaseUser as AuthUser };
        } else {
            // User exists, log them in fully
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("uid", "==", userCredential.user!.uid));
            const querySnapshot = await getDocs(q);
    
            if (querySnapshot.empty) {
                // This case means auth user exists, but firestore doc doesn't. Treat as new.
                return { existingUser: null, newFirebaseUser: userCredential.user };
            }
    
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data() as User;
            handleLoginSuccess(userData, `Welcome back!`);
            return { existingUser: userData, newFirebaseUser: null };
        }
    }, [cloudFunctionBaseUrl, handleLoginSuccess]);
    
    const linkPhoneNumber = sendPhoneNumberOtp;

    const verifyPhoneNumberLink = useCallback(async (otp: string, phoneNumber: string) => {
        if (!auth.currentUser || !currentUser) throw new Error("No user is currently signed in.");

        const idToken = await auth.currentUser.getIdToken();

        const response = await fetch(`${cloudFunctionBaseUrl}/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, otp, idToken }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to verify and link phone number.');
        }
        
        // Update Firestore document which will trigger the onSnapshot listener to update the context state
        const updatedFields = {
            contactNumber: phoneNumber,
            isMobileVerified: true,
        };
        const userRef = doc(db, "users", currentUser.id);
        await updateDoc(userRef, updatedFields);
        addToast("Phone number verified!", "success");
    }, [currentUser, addToast, cloudFunctionBaseUrl]);

    const handleLogout = useCallback(async () => {
        await signOut(auth);
        handleNavigate({ name: 'home' });
        addToast("You've been logged out.", 'info');
    }, [handleNavigate, addToast]);

    const value: AuthContextType = {
        currentUser,
        loading,
        handleLogin,
        handleGoogleSignIn,
        handleRegister,
        handleLogout,
        handleLoginSuccess,
        handleResendVerificationEmail: handleResendVerificationEmail as (firebaseUser: AuthUser) => Promise<void>,
        handlePasswordReset,
        sendPhoneNumberOtp,
        verifyPhoneNumberOtp,
        linkPhoneNumber,
        verifyPhoneNumberLink,
        updateUserAuthEmail,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
