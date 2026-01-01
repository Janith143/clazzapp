import { useCallback } from 'react';
import { User, Sale, AdditionalService } from '../../types';
import { UIContextType } from '../../contexts/UIContext';
import { NavigationContextType } from '../../contexts/NavigationContext';
import { db } from '../../firebase';
import { doc, runTransaction, increment } from 'firebase/firestore';
import { generateStandardId, sendPaymentConfirmation } from '../../utils';

interface ServicePurchaseActionDeps {
    currentUser: User | null;
    ui: UIContextType;
    nav: NavigationContextType;
}

export const useServicePurchaseActions = (deps: ServicePurchaseActionDeps) => {
    const { currentUser, ui, nav } = deps;
    const { addToast, setModalState } = ui;
    const { handleNavigate } = nav;

    const handlePurchaseService = useCallback(async (
        service: AdditionalService,
        customAmount?: number,
        customDescription?: string,
        selectedMethod?: import('../../types').PaymentMethod
    ) => {
        if (!currentUser) { setModalState({ name: 'login', preventRedirect: true }); return; }

        const amountToPay = customAmount !== undefined ? customAmount : service.cost;
        const description = customDescription || service.title;

        const newSaleId = generateStandardId('INV');
        const saleRef = doc(db, "sales", newSaleId);

        const saleData: Sale = {
            id: newSaleId,
            studentId: currentUser.id,
            teacherId: currentUser.id, // Teacher paying for themselves
            itemId: newSaleId, // Transaction ID as Item ID for services
            itemType: 'additional_service',
            itemName: description,
            totalAmount: 0,
            amountPaidFromBalance: 0,
            saleDate: new Date().toISOString(),
            currency: 'LKR',
            status: 'completed',
            serviceDetails: { description },
            paymentMethod: 'balance'
        };

        try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, "users", currentUser.id);
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw new Error("User profile not found.");
                const userData = userDoc.data() as User;

                const balanceToApply = Math.min(userData.accountBalance, amountToPay);
                saleData.amountPaidFromBalance = balanceToApply;
                saleData.totalAmount = amountToPay - balanceToApply;

                if (saleData.totalAmount > 0) {
                    saleData.status = 'hold';
                    saleData.paymentMethod = 'gateway';
                }

                transaction.set(saleRef, saleData);

                if (balanceToApply > 0) {
                    // Deduct from balance immediately if fully covered or partial coverage committed
                    // Actually, for partial, we usually deduct only on success.
                    // But if we commit 'amountPaidFromBalance' here, we should deduct it?
                    // In 'handleEnroll', we deduct it immediately: `transaction.update(..., { accountBalance: ... - balanceToApply })`
                    // BUT only if fully paid?
                    // Let's check handleEnroll logic again:
                    // `if (sale.totalAmount > 0) { status = 'hold'; transaction.set(saleRef, sale); }` -> NO deduction in transaction block for hold.
                    // `else { ... transaction.update(user, deduct); }`
                    // So for split payment, handleEnroll DOES NOT deduct initially. It relies on the Gateway Callback to do the deduction?
                    // Wait, `usePaymentResponseHandler` has logic `if (amountPaidFromBalance > 0) ... increment(-amount)`.
                    // So yes, `handleEnroll` does NOT deduct if redirecting.

                    if (saleData.totalAmount === 0) {
                        transaction.update(userRef, { accountBalance: increment(-balanceToApply) });
                    }
                }
            });

            if (saleData.totalAmount > 0) {
                // Redirect to Gateway
                handleNavigate({
                    name: 'payment_redirect',
                    payload: {
                        type: 'additional_service',
                        customDetails: {
                            serviceDetails: { title: description, description },
                            amountPaidFromBalance: saleData.amountPaidFromBalance,
                            totalAmount: saleData.totalAmount // Amount to pay at gateway
                        },
                        sale: saleData,
                        updatedUser: currentUser,
                        selectedMethod
                    }
                });
            } else {
                addToast(`Successfully paid for ${description}!`, 'success');
                if (nav.functionUrls?.notification) {
                    sendPaymentConfirmation(nav.functionUrls.notification, currentUser, amountToPay, description, newSaleId);
                }
            }
        } catch (e) {
            console.error(e);
            addToast((e as Error).message || "Payment initiation failed.", "error");
        }
    }, [currentUser, addToast, setModalState, handleNavigate, nav.functionUrls]);

    return { handlePurchaseService };
};
