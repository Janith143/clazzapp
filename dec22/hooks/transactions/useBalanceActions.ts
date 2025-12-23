import { useCallback } from 'react';
import { User, TopUpRequest, PaymentMethod } from '../../types';
import { UIContextType } from '../../contexts/UIContext';
import { NavigationContextType } from '../../contexts/NavigationContext';
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface BalanceActionDeps {
    currentUser: User | null;
    ui: UIContextType;
    nav: NavigationContextType;
    handleImageSave: (base64: string, type: any, context?: any) => Promise<string | void>;
}

export const useBalanceActions = (deps: BalanceActionDeps) => {
    const { currentUser, ui, nav, handleImageSave } = deps;
    const { addToast, setModalState } = ui;

    const handleTopUpWithGateway = useCallback((amount: number, selectedMethod?: PaymentMethod) => {
        const executeTopUp = (skipProfileCheck = false, updatedProfileData?: Partial<User>) => {
            const effectiveUser = currentUser ? { ...currentUser, ...updatedProfileData } : null;

            if (!effectiveUser) {
                setModalState({ name: 'login', preventRedirect: true });
                return;
            }
    
            if (!skipProfileCheck) {
                const { email, contactNumber, address } = effectiveUser;
                const isProfileComplete = email && contactNumber && address?.line1 && address?.city;
                if (!isProfileComplete) {
                    let initialStep = 1;
                    if (email && contactNumber) {
                        initialStep = 2;
                    }
                    addToast('Please complete your profile to proceed with payment.', 'info');
                    setModalState({ 
                        name: 'edit_student_profile', 
                        initialStep, 
                        onSaveAndContinue: (data) => executeTopUp(true, data)
                    });
                    return;
                }
            }
    
            nav.handleNavigate({ 
                name: 'payment_redirect', 
                payload: { 
                    type: 'topup', 
                    amount, 
                    updatedUser: effectiveUser as User,
                    selectedMethod 
                } 
            });
        };
    
        executeTopUp();
    }, [currentUser, nav.handleNavigate, setModalState, addToast]);

    const handleTopUpWithSlip = useCallback(async (amount: number, slipImage: string) => {
        if (!currentUser) {
            addToast("You must be logged in to request a top-up.", "error");
            setModalState({ name: 'login', preventRedirect: true });
            return;
        }
        addToast("Submitting your request...", "info");
        try {
            const imageUrl = await handleImageSave(slipImage, 'payment_slip');
            if (!imageUrl) {
                throw new Error("Failed to upload payment slip image.");
            }

            const newRequestId = `topup_${currentUser.id}_${Date.now()}`;
            const requestRef = doc(db, "topUpRequests", newRequestId);

            const newRequest: TopUpRequest = {
                id: newRequestId,
                studentId: currentUser.id,
                method: 'slip',
                amount: amount,
                imageUrl: imageUrl as string,
                status: 'pending',
                requestedAt: new Date().toISOString(),
            };

            await setDoc(requestRef, newRequest);
            addToast("Your top-up request has been submitted for verification. It will be processed within 24 hours.", "success");
        } catch (error) {
            console.error("Error submitting top-up request:", error);
            addToast("There was an error submitting your request. Please try again.", "error");
        }
    }, [currentUser, addToast, setModalState, handleImageSave]);

    return { handleTopUpWithGateway, handleTopUpWithSlip };
};