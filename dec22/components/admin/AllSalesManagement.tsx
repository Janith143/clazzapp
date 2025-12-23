import React, { useMemo, useState } from 'react';
import { Sale, User, Teacher } from '../../types.ts';
import { CheckCircleIcon, XCircleIcon, ClockIcon, PauseIcon, PlayIcon } from '../Icons.tsx';
import ConfirmationModal from '../ConfirmationModal.tsx';
import StudentDetailsModal from '../StudentDetailsModal.tsx';

interface AllSalesManagementProps {
    allSales: Sale[];
    allUsers: User[];
    allTeachers: Teacher[];
    onViewTeacher: (username: string) => void;
    onUpdateSaleStatus: (saleId: string, status: Sale['status']) => void;
    onRefundSale: (saleId: string) => void;
}

const AllSalesManagement: React.FC<AllSalesManagementProps> = ({ allSales, allUsers, allTeachers, onViewTeacher, onUpdateSaleStatus, onRefundSale }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | Sale['status']>('all');
    const [actionTarget, setActionTarget] = useState<{sale: Sale; action: 'hold' | 'unhold' | 'refund' | 'cancel'} | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

    const enhancedSales = useMemo(() => {
        return allSales.map(sale => {
            const teacher = allTeachers.find(t => t.id === sale.teacherId);
            const student = allUsers.find(u => u.id === sale.studentId);
            return { ...sale, teacher, student };
        }).sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    }, [allSales, allUsers, allTeachers]);

    const filteredSales = useMemo(() => {
        return enhancedSales.filter(sale => {
            const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
            const lowerSearch = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm.trim() ||
                sale.itemName.toLowerCase().includes(lowerSearch) ||
                (sale.student && `${sale.student.firstName} ${sale.student.lastName}`.toLowerCase().includes(lowerSearch)) ||
                (sale.teacher && sale.teacher.name.toLowerCase().includes(lowerSearch)) ||
                sale.id.toLowerCase().includes(lowerSearch);
            return matchesStatus && matchesSearch;
        });
    }, [enhancedSales, searchTerm, statusFilter]);

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });

    const StatusBadge: React.FC<{ status: Sale['status'] }> = ({ status }) => {
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
    
    const handleConfirmAction = () => {
        if (!actionTarget) return;
        switch (actionTarget.action) {
            case 'hold': onUpdateSaleStatus(actionTarget.sale.id, 'hold'); break;
            case 'unhold': onUpdateSaleStatus(actionTarget.sale.id, 'completed'); break;
            case 'cancel': onUpdateSaleStatus(actionTarget.sale.id, 'canceled'); break;
            case 'refund': onRefundSale(actionTarget.sale.id); break;
        }
        setActionTarget(null);
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">All Sales Transactions</h1>
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <input 
                        type="text"
                        placeholder="Search by item, student, teacher, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:flex-grow px-3 py-2 border border-light-border dark:border-dark-border placeholder-light-subtle dark:placeholder-dark-subtle text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="w-full sm:w-auto px-3 py-2 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    >
                        <option value="all">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="hold">On Hold</option>
                        <option value="refunded">Refunded</option>
                        <option value="failed">Failed</option>
                        <option value="canceled">Canceled</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                        <thead className="bg-light-background dark:bg-dark-background">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Student & Teacher</th>
                                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Item</th>
                                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider">Total</th>
                                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider">Platform</th>
                                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider">Teacher</th>
                                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider">Institute</th>
                                <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Status</th>
                                <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-light-border dark:divide-dark-border">
                            {filteredSales.map(sale => (
                                <tr key={sale.id} className={`${sale.status === 'refunded' ? 'bg-gray-50 dark:bg-gray-800/50 text-light-subtle dark:text-dark-subtle' : 'text-light-text dark:text-dark-text'}`}>
                                    <td className="px-3 py-3 whitespace-nowrap">{new Date(sale.saleDate).toLocaleDateString()}</td>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        {sale.student ? (
                                            <button onClick={() => setSelectedStudent(sale.student)} className="text-left group w-full">
                                                <p className="font-medium group-hover:underline">{sale.student.firstName} {sale.student.lastName}</p>
                                                <p className="text-xs text-light-subtle dark:text-dark-subtle">{sale.student.id}</p>
                                            </button>
                                        ) : 'N/A'}
                                        {sale.teacher ? (
                                            <button onClick={() => onViewTeacher(sale.teacher!.id)} className="text-left group w-full mt-1">
                                                <p className="text-primary group-hover:underline text-xs">{sale.teacher.name}</p>
                                            </button>
                                        ) : <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">N/A</p>}
                                    </td>
                                    <td className="px-3 py-3"><p className="font-medium">{sale.itemName}</p><p className="text-xs capitalize">{sale.itemType}</p></td>
                                    <td className={`px-3 py-3 whitespace-nowrap text-right font-semibold ${sale.status === 'refunded' && 'line-through'}`}>{currencyFormatter.format(sale.totalAmount + sale.amountPaidFromBalance)}</td>
                                    <td className={`px-3 py-3 whitespace-nowrap text-right ${sale.status === 'refunded' && 'line-through'}`}>{currencyFormatter.format(sale.platformCommission || 0)}</td>
                                    <td className={`px-3 py-3 whitespace-nowrap text-right ${sale.status === 'refunded' && 'line-through'}`}>{currencyFormatter.format(sale.teacherCommission || 0)}</td>
                                    <td className={`px-3 py-3 whitespace-nowrap text-right ${sale.status === 'refunded' && 'line-through'}`}>{currencyFormatter.format(sale.instituteCommission || 0)}</td>
                                    <td className="px-3 py-3 whitespace-nowrap text-center"><StatusBadge status={sale.status} /></td>
                                    <td className="px-3 py-3 whitespace-nowrap text-center">
                                        <div className="relative inline-block text-left group">
                                            <button className="px-2 py-1 text-xs font-medium border border-light-border dark:border-dark-border rounded-md hover:bg-light-border dark:hover:bg-dark-border">Actions ▼</button>
                                            <div className="absolute right-0 bottom-full w-40 origin-bottom-right bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-md shadow-lg invisible group-hover:visible z-10">
                                                <div className="py-1">
                                                    {sale.status === 'completed' && <button onClick={() => setActionTarget({sale, action: 'hold'})} className="w-full text-left flex items-center px-4 py-2 text-sm hover:bg-light-border dark:hover:bg-dark-border"><PauseIcon className="w-4 h-4 mr-2"/>Hold</button>}
                                                    {sale.status === 'hold' && <button onClick={() => setActionTarget({sale, action: 'unhold'})} className="w-full text-left flex items-center px-4 py-2 text-sm hover:bg-light-border dark:hover:bg-dark-border"><PlayIcon className="w-4 h-4 mr-2"/>Mark as Completed</button>}
                                                    {sale.status === 'hold' && <button onClick={() => setActionTarget({sale, action: 'cancel'})} className="w-full text-left flex items-center px-4 py-2 text-sm hover:bg-light-border dark:hover:bg-dark-border"><XCircleIcon className="w-4 h-4 mr-2"/>Cancel</button>}
                                                    {sale.status !== 'refunded' && sale.status !== 'canceled' && <button onClick={() => setActionTarget({sale, action: 'refund'})} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"><XCircleIcon className="w-4 h-4 mr-2"/>Refund</button>}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {actionTarget && (
                <ConfirmationModal
                    isOpen={true}
                    onClose={() => setActionTarget(null)}
                    onConfirm={handleConfirmAction}
                    title={`Confirm Action: ${actionTarget.action.charAt(0).toUpperCase() + actionTarget.action.slice(1)}`}
                    message={`Are you sure you want to ${actionTarget.action} this transaction for "${actionTarget.sale.itemName}"?`}
                    confirmText={`Yes, ${actionTarget.action}`}
                />
            )}

            {selectedStudent && <StudentDetailsModal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} student={selectedStudent} />}
        </div>
    );
};

export default AllSalesManagement;