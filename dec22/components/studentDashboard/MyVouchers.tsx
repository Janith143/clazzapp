
import React, { useMemo, useState } from 'react';
import { User, Voucher } from '../../types';
import { useData } from '../../contexts/DataContext';
import { TicketIcon, CheckCircleIcon, ClockIcon, XCircleIcon, ShareIcon } from '../Icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useUI } from '../../contexts/UIContext';
import ConfirmationModal from '../ConfirmationModal';

interface MyVouchersProps {
    user: User;
}

const VoucherCard: React.FC<{ voucher: Voucher; onCollect: (id: string) => void }> = ({ voucher, onCollect }) => {
    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 });
    const isExpired = new Date(voucher.expiresAt) < new Date();
    
    return (
        <div className={`relative p-5 rounded-lg shadow-md border-l-4 transition-all duration-300 ${isExpired ? 'border-gray-400 bg-gray-50 dark:bg-gray-800' : (voucher.isUsed ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-primary bg-light-surface dark:bg-dark-surface')}`}>
             <div className="flex justify-between items-start">
                 <div>
                     <h3 className="font-bold text-lg text-light-text dark:text-dark-text">{voucher.title || 'Gift Voucher'}</h3>
                     <p className="text-2xl font-bold text-primary mt-1">{currencyFormatter.format(voucher.amount)}</p>
                 </div>
                 <div className="text-right">
                     {voucher.isUsed ? (
                         <span className="flex items-center text-xs font-bold text-green-600 dark:text-green-400"><CheckCircleIcon className="w-4 h-4 mr-1"/>Used</span>
                     ) : isExpired ? (
                         <span className="flex items-center text-xs font-bold text-gray-500"><ClockIcon className="w-4 h-4 mr-1"/>Expired</span>
                     ) : (
                         <span className="flex items-center text-xs font-bold text-primary"><TicketIcon className="w-4 h-4 mr-1"/>Active</span>
                     )}
                 </div>
             </div>

             {voucher.redemptionRules && (
                 <div className="mt-3 text-sm text-light-subtle dark:text-dark-subtle bg-light-background dark:bg-dark-background p-2 rounded border border-light-border dark:border-dark-border">
                     <p className="font-semibold text-xs mb-1">Rules:</p>
                     {voucher.redemptionRules}
                 </div>
             )}

             <div className="mt-4 border-t border-light-border dark:border-dark-border pt-4">
                 {!voucher.isCollected ? (
                     <div className="text-center">
                         <p className="text-sm text-light-subtle dark:text-dark-subtle mb-2">You have a new voucher!</p>
                         <button onClick={() => onCollect(voucher.id)} className="w-full bg-primary text-white font-bold py-2 rounded-md hover:bg-primary-dark transition-colors animate-pulse">
                             Collect Voucher
                         </button>
                     </div>
                 ) : (
                     <div className="text-center">
                         <p className="text-xs text-light-subtle dark:text-dark-subtle mb-1">Voucher Code</p>
                         <div className="bg-light-background dark:bg-dark-background border border-dashed border-primary p-2 rounded-md font-mono text-lg font-bold tracking-widest text-primary select-all">
                             {voucher.code}
                         </div>
                         <p className="text-[10px] text-light-subtle dark:text-dark-subtle mt-2">
                             Expires: {new Date(voucher.expiresAt).toLocaleDateString()}
                         </p>
                     </div>
                 )}
             </div>
        </div>
    );
};

const MyVouchers: React.FC<MyVouchersProps> = ({ user }) => {
    const { vouchers } = useData();
    const { addToast } = useUI();
    const [confirmCollectionId, setConfirmCollectionId] = useState<string | null>(null);

    const userVouchers = useMemo(() => {
        return vouchers
            .filter(v => v.assignedToUserId === user.id)
            .sort((a,b) => {
                // Uncollected first, then active, then used/expired
                if (!a.isCollected && b.isCollected) return -1;
                if (a.isCollected && !b.isCollected) return 1;
                return new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime();
            });
    }, [vouchers, user.id]);

    const handleCollect = async (id: string) => {
        try {
            await updateDoc(doc(db, 'vouchers', id), { isCollected: true });
            addToast('Voucher collected! Code revealed.', 'success');
        } catch (error) {
            console.error(error);
            addToast('Failed to collect voucher.', 'error');
        }
    };

    if (userVouchers.length === 0) {
        return (
            <div className="text-center py-16 text-light-subtle dark:text-dark-subtle">
                <TicketIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-semibold">No Vouchers Yet</p>
                <p>Check back later for gifts and rewards.</p>
            </div>
        );
    }

    const uncollectedVouchers = userVouchers.filter(v => !v.isCollected);
    const collectedVouchers = userVouchers.filter(v => v.isCollected);

    return (
        <div className="space-y-8">
            {uncollectedVouchers.length > 0 && (
                <section>
                    <h3 className="text-xl font-bold mb-4 flex items-center text-primary">
                        <span className="relative flex h-3 w-3 mr-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                        New Vouchers Waiting
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {uncollectedVouchers.map(v => (
                            <VoucherCard key={v.id} voucher={v} onCollect={() => setConfirmCollectionId(v.id)} />
                        ))}
                    </div>
                </section>
            )}

            <section>
                <h3 className="text-xl font-bold mb-4">My Voucher Wallet</h3>
                {collectedVouchers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {collectedVouchers.map(v => (
                            <VoucherCard key={v.id} voucher={v} onCollect={() => {}} />
                        ))}
                    </div>
                ) : (
                    <p className="text-light-subtle dark:text-dark-subtle italic">You haven't collected any vouchers yet.</p>
                )}
            </section>

             <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-md text-sm text-blue-800 dark:text-blue-200">
                <p><strong>How to Redeem:</strong> Go to "Overview", click on "Top Up" under your Account Balance, select "Redeem Voucher", and enter the code shown above.</p>
            </div>

            <ConfirmationModal
                isOpen={!!confirmCollectionId}
                onClose={() => setConfirmCollectionId(null)}
                onConfirm={() => { if(confirmCollectionId) handleCollect(confirmCollectionId); setConfirmCollectionId(null); }}
                title="Collect Voucher"
                message="Are you ready to reveal your gift voucher code?"
                confirmText="Yes, Reveal Code"
            />
        </div>
    );
};

export default MyVouchers;
