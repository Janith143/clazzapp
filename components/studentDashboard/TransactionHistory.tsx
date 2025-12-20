import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
// FIX: Import Event and TuitionInstitute types
import { Sale, TopUpRequest, Course, IndividualClass, Quiz, Teacher, Event, TuitionInstitute, User } from '../../types.ts';
import { CheckCircleIcon, XCircleIcon, ClockIcon, PauseIcon } from '../Icons.tsx';
import InvoiceModal from '../InvoiceModal.tsx';
import PurchasedItemDetailModal from '../PurchasedItemDetailModal.tsx';

interface TransactionHistoryProps {
    user: User;
}

const SaleStatusBadge: React.FC<{ status: Sale['status'] }> = ({ status }) => {
    const statusMap: Record<Sale['status'], { icon: React.ReactNode; text: string; classes: string; }> = {
        completed: { icon: <CheckCircleIcon className="w-4 h-4 mr-1.5" />, text: 'Completed', classes: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
        refunded: { icon: <XCircleIcon className="w-4 h-4 mr-1.5" />, text: 'Refunded', classes: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
        hold: { icon: <PauseIcon className="w-4 h-4 mr-1.5" />, text: 'On Hold', classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/50 dark:text-yellow-300' },
        failed: { icon: <XCircleIcon className="w-4 h-4 mr-1.5" />, text: 'Failed', classes: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
        cleared: { icon: <CheckCircleIcon className="w-4 h-4 mr-1.5" />, text: 'Cleared', classes: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
        canceled: { icon: <XCircleIcon className="w-4 h-4 mr-1.5" />, text: 'Canceled', classes: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' }
    };
    const statusInfo = statusMap[status];
    if (!statusInfo) return null;
    const { icon, text, classes } = statusInfo;
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>{icon}{text}</span>;
};

const TopUpStatusBadge: React.FC<{ status: TopUpRequest['status'] }> = ({ status }) => {
    const statusMap = {
        approved: { icon: <CheckCircleIcon className="w-4 h-4 mr-1.5" />, text: 'Approved', classes: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
        pending: { icon: <ClockIcon className="w-4 h-4 mr-1.5" />, text: 'Pending', classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/50 dark:text-yellow-300' },
        rejected: { icon: <XCircleIcon className="w-4 h-4 mr-1.5" />, text: 'Rejected', classes: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
    };
    const { icon, text, classes } = statusMap[status];
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>{icon}{text}</span>;
};


const TransactionHistory: React.FC<TransactionHistoryProps> = ({ user }) => {
    // FIX: Get users and tuitionInstitutes to find organizer details for events.
    const { sales, teachers, users, tuitionInstitutes, topUpRequests } = useData();

    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    // FIX: Update state to handle Event type and a generic 'person' object for teacher/organizer.
    const [selectedItemSnapshot, setSelectedItemSnapshot] = useState<{ item: Course | IndividualClass | Quiz | Event, person: Teacher | { name: string; avatar: string; } } | null>(null);

    const handleCloseInvoice = useCallback(() => setSelectedSale(null), []);
    const handleCloseSnapshot = useCallback(() => setSelectedItemSnapshot(null), []);

    // FIX: Update function signature to accept Event and a generic person object.
    const onViewItemSnapshot = (item: Course | IndividualClass | Quiz | Event, person: Teacher | { name: string; avatar: string; }) => {
        setSelectedItemSnapshot({ item, person });
    };

    const purchaseHistory = useMemo(() => {
        if (!user) return [];
        return sales.filter(sale => sale.studentId === user.id)
          .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    }, [sales, user]);

    const topUpHistory = useMemo(() => {
        if (!user) return [];

        // Get pending requests from the global state for the current user
        const pendingRequests = topUpRequests.filter(
            req => req.studentId === user.id && req.status === 'pending'
        );

        // Get processed (approved/rejected) requests already stored on the user object
        const processedRequests = user.topUpHistory || [];

        // Combine them and sort by the request date
        const allRequests = [...pendingRequests, ...processedRequests];
        
        return allRequests.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    }, [user, topUpRequests]);


    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });

    if (!user) return null;

    return (
        <div className="space-y-8">
            <div className="bg-light-surface dark:bg-dark-surface p-4 rounded-lg shadow-md overflow-x-auto">
                <h3 className="text-xl font-bold mb-4 px-2">Purchase History</h3>
                {purchaseHistory.length > 0 ? (
                    <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                        <thead className="bg-light-background dark:bg-dark-background">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Item</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Total Amount</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-light-border dark:divide-dark-border">
                            {purchaseHistory.map(sale => {
                                // FIX: Logic to determine the display person (teacher or organizer)
                                let displayPerson: (Teacher | { name: string; avatar: string; }) | null = null;
                                let personNotFound = true;

                                if (sale.itemType === 'event') {
                                    const organizer = tuitionInstitutes.find(ti => ti.id === sale.instituteId);
                                    if (organizer) {
                                        const organizerUser = users.find(u => u.id === organizer.userId);
                                        if (organizerUser) {
                                            displayPerson = { name: organizer.name, avatar: organizerUser.avatar };
                                            personNotFound = false;
                                        }
                                    }
                                } else {
                                    const teacher = teachers.find(t => t.id === sale.teacherId);
                                    if (teacher) {
                                        displayPerson = teacher;
                                        personNotFound = false;
                                    }
                                }
                                
                                // FIX: Correctly disable the button for unsupported item types.
                                const isSnapshotViewable = sale.itemSnapshot && ['course', 'class', 'quiz', 'event'].includes(sale.itemType);


                                return (
                                <tr key={sale.id} className="text-light-text dark:text-dark-text">
                                    <td className="px-4 py-3 whitespace-nowrap">{new Date(sale.saleDate).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <button 
                                            onClick={() => displayPerson && isSnapshotViewable && onViewItemSnapshot(sale.itemSnapshot as Course | IndividualClass | Quiz | Event, displayPerson)} 
                                            disabled={personNotFound || !isSnapshotViewable}
                                            className="font-medium text-primary hover:underline text-left disabled:no-underline disabled:text-light-subtle disabled:cursor-default"
                                            title={personNotFound ? 'Original creator is no longer available' : 'View purchased item details'}
                                        >
                                            {sale.itemName}
                                        </button>
                                        <p className="text-xs text-light-subtle dark:text-dark-subtle capitalize">{sale.itemType.replace('_', ' ')}</p>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                        <p className="font-semibold">{currencyFormatter.format(sale.totalAmount + sale.amountPaidFromBalance)}</p>
                                        {sale.paymentMethod === 'manual_at_venue' ? (
                                            <p className="text-xs text-blue-600 dark:text-blue-400">Paid at Venue</p>
                                        ) : sale.amountPaidFromBalance > 0 ? (
                                            <div>
                                                <p className="text-xs text-green-600 dark:text-green-400">
                                                    From Balance: {currencyFormatter.format(sale.amountPaidFromBalance)}
                                                </p>
                                                {sale.totalAmount > 0 && (
                                                    <p className="text-xs text-light-subtle dark:text-dark-subtle">
                                                        From Gateway: {currencyFormatter.format(sale.totalAmount)}
                                                    </p>
                                                )}
                                            </div>
                                        ) : null}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                        <SaleStatusBadge status={sale.status} />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                        {sale.status === 'completed' ? (
                                            <button onClick={() => setSelectedSale(sale)} className="text-primary hover:underline">View Invoice</button>
                                        ) : (
                                            <span className="text-light-subtle dark:text-dark-subtle">-</span>
                                        )}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                ) : <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">This student has no purchase history.</p>}
            </div>
             <div className="bg-light-surface dark:bg-dark-surface p-4 rounded-lg shadow-md overflow-x-auto">
                <h3 className="text-xl font-bold mb-4 px-2">Top-Up History</h3>
                {topUpHistory.length > 0 ? (
                    <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                        <thead className="bg-light-background dark:bg-dark-background">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Method</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-light-border dark:divide-dark-border">
                            {topUpHistory.map(req => (
                                <tr key={req.id} className="text-light-text dark:text-dark-text">
                                    <td className="px-4 py-3 whitespace-nowrap">{new Date(req.requestedAt).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 whitespace-nowrap capitalize">{req.method}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right font-semibold">{currencyFormatter.format(req.amount)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                        <TopUpStatusBadge status={req.status} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">This student has no top-up history.</p>}
            </div>
            
            <InvoiceModal 
                isOpen={!!selectedSale} 
                onClose={handleCloseInvoice} 
                saleData={selectedSale}
            />
            {selectedItemSnapshot && (
                <PurchasedItemDetailModal
                    isOpen={!!selectedItemSnapshot}
                    onClose={handleCloseSnapshot}
                    item={selectedItemSnapshot.item}
                    teacher={selectedItemSnapshot.person}
                />
            )}
        </div>
    );
};

export default TransactionHistory;