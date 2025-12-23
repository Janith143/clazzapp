
import { useCallback } from 'react';
import { User, Sale, Withdrawal } from '../../types';
import { UIContextType } from '../../contexts/UIContext';
import { db } from '../../firebase';
import { doc, runTransaction, increment, writeBatch } from 'firebase/firestore';

interface FinancialManagementActionsDeps {
    currentUser: User | null;
    ui: UIContextType;
    sales: Sale[];
}

export const useFinancialManagementActions = (deps: FinancialManagementActionsDeps) => {
    const { currentUser, ui, sales } = deps;
    const { addToast } = ui;

    const handleRequestAffiliateWithdrawal = useCallback(async (amount: number) => {
        if (!currentUser) return;
        const userRef = doc(db, 'users', currentUser.id);
        try {
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw new Error("User profile not found");
                const userData = userDoc.data() as User;
                const balance = userData.referralBalance || { available: 0 };
                if (balance.available < amount) throw new Error("Insufficient available balance for withdrawal.");

                const newWithdrawal: Withdrawal = { id: `w_${Date.now()}`, userId: currentUser.id, amount, requestedAt: new Date().toISOString(), status: 'pending' };
                const withdrawalHistory = [...(userData.withdrawalHistory || []), newWithdrawal];
                
                transaction.update(userRef, {
                    'referralBalance.available': increment(-amount),
                    withdrawalHistory: withdrawalHistory
                });
            });
            addToast("Withdrawal request submitted.", "success");
        } catch(e) { 
            addToast((e as Error).message || "Withdrawal failed", "error"); 
        }
    }, [currentUser, addToast]);
    
    const handleRefundSale = useCallback(async (saleId: string) => {
        const sale = sales.find(s => s.id === saleId);
        if (!sale || sale.status === 'refunded') {
            addToast("Sale not found or already refunded.", "error");
            return;
        }

        const batch = writeBatch(db);
        const saleRef = doc(db, 'sales', saleId);
        batch.update(saleRef, { status: 'refunded' });

        const refundAmount = sale.totalAmount + sale.amountPaidFromBalance;
        if (refundAmount > 0) {
            batch.update(doc(db, "users", sale.studentId), { accountBalance: increment(refundAmount) });
        }

        if (sale.teacherId && sale.teacherCommission && sale.teacherCommission > 0) {
            const teacherRef = doc(db, 'teachers', sale.teacherId);
            batch.update(teacherRef, { 'earnings.total': increment(-sale.teacherCommission) });
        }

        if (sale.instituteId && sale.instituteCommission && sale.instituteCommission > 0) {
            const instituteRef = doc(db, 'tuitionInstitutes', sale.instituteId);
            batch.update(instituteRef, { 'earnings.total': increment(-sale.instituteCommission) });
        }
        
        try {
            await batch.commit();
            addToast("Sale refunded to student's account balance.", "success");
        } catch (e) {
            addToast("Refund failed.", "error");
        }
    }, [sales, addToast]);
    
    return { handleRequestAffiliateWithdrawal, handleRefundSale };
};
