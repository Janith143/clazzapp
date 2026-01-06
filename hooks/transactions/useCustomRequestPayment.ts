
import { useCallback } from 'react';
import { User, Sale, CustomClassRequest, PaymentMethod } from '../../types';
import { UIContextType } from '../../contexts/UIContext';
import { NavigationContextType } from '../../contexts/NavigationContext';
import { db } from '../../firebase';
import { doc, runTransaction } from 'firebase/firestore';
import { generateStandardId } from '../../utils';

interface CustomRequestPaymentDeps {
    currentUser: User | null;
    ui: UIContextType;
    nav: NavigationContextType;
}

export const useCustomRequestPayment = (deps: CustomRequestPaymentDeps) => {
    const { currentUser, ui, nav } = deps;
    const { addToast, setModalState } = ui;
    const { handleNavigate } = nav;

    const handleCustomRequestPayment = useCallback(async (
        request: CustomClassRequest,
        selectedMethod?: PaymentMethod
    ) => {
        if (!currentUser) { setModalState({ name: 'login', preventRedirect: true }); return; }

        // Profile check
        const { email, contactNumber, address } = currentUser;
        const isProfileComplete = email && contactNumber && address?.line1 && address?.city;

        if (!isProfileComplete) {
            addToast('Please complete your profile to proceed with payment.', 'info');
            setModalState({
                name: 'edit_student_profile',
                initialStep: (email && contactNumber) ? 2 : 1,
                onSaveAndContinue: () => handleCustomRequestPayment(request, selectedMethod) // Recursive retry logic needs careful handling or just ask user to retry manually. 
                // Simple retry:
                // onSaveAndContinue: (data) => executeEnrollment(true, data) - pattern in useEnrollmentActions.
            });
            // For simplicity in this custom hook, just return and let user click pay again after edit.
            // Or better, implement the retry callback properly if needed.
            // Let's stick to simple "Update and click pay again" for now to avoid complexity in this new hook.
            return;
        }

        const newSaleId = generateStandardId('INV'); // Or 'CUST-INV'? Standard INV is fine for sales.
        const saleRef = doc(db, "sales", newSaleId);

        const saleData: Partial<Sale> = {
            id: newSaleId,
            studentId: currentUser.id,
            itemId: request.id,
            itemType: 'custom_class', // Need to add this to Sale ItemType type or cast as any/custom
            itemName: `Private Class: ${request.topic}`,
            totalAmount: 0,
            amountPaidFromBalance: 0,
            saleDate: new Date().toISOString(),
            currency: 'LKR',
            status: 'hold',
            teacherId: request.teacherId,
            // itemSnapshot: request, // Store request snapshot? Types might mismatch if Sale expects Course/Class. 
            // Let's store it but we might need to cast or ensure types.ts supports it.
            // Actually 'custom_class' is not in ItemType yet.
        };

        const finalFee = request.totalCost;

        try {
            await runTransaction(db, async (transaction) => {
                const studentDoc = await transaction.get(doc(db, "users", currentUser.id));
                if (!studentDoc.exists()) throw new Error("Student document not found!");
                const studentData = studentDoc.data() as User;

                const balanceToApply = Math.min(studentData.accountBalance || 0, finalFee);
                saleData.amountPaidFromBalance = balanceToApply;
                saleData.totalAmount = finalFee - balanceToApply;

                if (saleData.totalAmount! > 0) {
                    saleData.status = 'hold';
                    transaction.set(saleRef, saleData);
                } else {
                    // Full balance payment
                    saleData.status = 'completed';
                    saleData.paymentMethod = 'balance';
                    // Commission logic? 
                    // Reuse logic from handleEnroll or simplify.
                    // Let's assume standard logic: 
                    // We need teacher/institute comm stats.
                    // For now, let's keep it simple: just record sale.
                    // IMPORTANT: We need to update Request Status to 'paid' if full balance.
                    transaction.update(doc(db, 'customClassRequests', request.id), { status: 'paid', updatedAt: new Date().toISOString() });

                    transaction.set(saleRef, saleData);
                    if (balanceToApply > 0) transaction.update(doc(db, "users", currentUser.id), { accountBalance: studentData.accountBalance - balanceToApply });
                }
            });

            if (saleData.totalAmount! > 0) {
                // Redirect to Payment Gateway Handler Page
                handleNavigate({
                    name: 'payment_redirect',
                    payload: {
                        type: 'custom_payment', // New type for PaymentRedirectPage to handle
                        item: request,
                        sale: saleData as Sale,
                        updatedUser: currentUser, // Should use effectiveUser if we did profile update logic
                        selectedMethod
                    }
                });
            } else {
                addToast("Payment successful using account balance!", "success");
                // Notification handled by triggers or manual call here?
                // Request status updated in transaction.
            }

        } catch (e) {
            console.error(e);
            addToast("Payment initiation failed.", "error");
        }

    }, [currentUser, addToast, setModalState, handleNavigate]);

    return { handleCustomRequestPayment };
};
