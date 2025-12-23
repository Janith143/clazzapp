
import { useCallback } from 'react';
import { User, Voucher, BillingDetails, TopUpRequest } from '../../types';
import { UIContextType } from '../../contexts/UIContext';
import { NavigationContextType } from '../../contexts/NavigationContext';
import { db } from '../../firebase';
import { collection, query, where, getDocs, runTransaction, doc, increment, arrayUnion } from 'firebase/firestore';

interface VoucherActionDeps {
    currentUser: User | null;
    ui: UIContextType;
    nav: NavigationContextType;
    currencyFormatter: Intl.NumberFormat;
}

export const useVoucherActions = (deps: VoucherActionDeps) => {
    const { currentUser, ui, nav, currencyFormatter } = deps;
    const { addToast, setModalState } = ui;
    
    const handleVoucherPurchaseRequest = useCallback((details: Omit<Voucher, 'id'|'code'|'isUsed'|'purchasedAt'|'expiresAt'>, quantity: number) => {
        const totalAmount = details.amount * quantity;
        nav.handleNavigate({ name: 'payment_redirect', payload: { type: 'voucher', details, quantity, totalAmount } });
    }, [nav.handleNavigate]);
    
    const handleRedeemVoucher = useCallback(async (code: string): Promise<boolean> => {
        if (!currentUser) {
            addToast("Please log in to redeem vouchers.", "error");
            return false;
        }

        try {
            const q = query(collection(db, 'vouchers'), where("code", "==", code.toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                addToast("Invalid voucher code.", "error");
                return false;
            }

            const voucherDoc = querySnapshot.docs[0];
            const voucherData = voucherDoc.data() as Voucher;

            if (voucherData.isUsed) {
                addToast("This voucher has already been redeemed.", "error"); return false;
            }
            if (new Date(voucherData.expiresAt) < new Date()) {
                addToast("This voucher has expired.", "error"); return false;
            }
            if (voucherData.assignedToUserId && voucherData.assignedToUserId !== currentUser.id) {
                addToast("This voucher is assigned to another user.", "error"); return false;
            }

            await runTransaction(db, async (transaction) => {
                const voucherRef = voucherDoc.ref;
                const userRef = doc(db, 'users', currentUser.id);

                const freshVoucherDoc = await transaction.get(voucherRef);
                if (!freshVoucherDoc.exists() || (freshVoucherDoc.data() as Voucher).isUsed) {
                    throw new Error("This voucher has just been redeemed.");
                }

                transaction.update(voucherRef, {
                    isUsed: true,
                    usedBy: currentUser.id,
                    usedAt: new Date().toISOString()
                });

                const topUpEntry: TopUpRequest = {
                    id: `topup_v_${Date.now()}`,
                    studentId: currentUser.id,
                    method: 'voucher',
                    amount: voucherData.amount,
                    voucherCode: voucherData.code,
                    status: 'approved',
                    requestedAt: new Date().toISOString(),
                    processedAt: new Date().toISOString()
                };
                transaction.update(userRef, {
                    accountBalance: increment(voucherData.amount),
                    topUpHistory: arrayUnion(topUpEntry)
                });
            });

            addToast(`Successfully redeemed ${currencyFormatter.format(voucherData.amount)}!`, "success");
            return true;

        } catch (error: any) {
            const msg = typeof error === 'string' ? error : (error.message || "Failed to redeem voucher.");
            addToast(msg, "error");
            return false;
        }
    }, [currentUser, addToast, currencyFormatter]);
    
    return { handleVoucherPurchaseRequest, handleRedeemVoucher };
};
