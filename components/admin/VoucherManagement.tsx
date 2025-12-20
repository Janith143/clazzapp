



import React, { useState, useMemo } from 'react';
import { Voucher, User } from '../../types.ts';
import { CheckCircleIcon, XCircleIcon, ClockIcon, PlusIcon, PencilIcon, TrashIcon } from '../Icons.tsx';
import StudentDetailsModal from '../StudentDetailsModal.tsx';
import GenerateVoucherModal from './GenerateVoucherModal.tsx';
import { useData } from '../../contexts/DataContext.tsx';
import ConfirmationModal from '../ConfirmationModal.tsx';
import EditVoucherModal from './EditVoucherModal.tsx';

interface VoucherManagementProps {
  vouchers: Voucher[];
  users: User[];
}

const VoucherStatusBadge: React.FC<{ voucher: Voucher }> = ({ voucher }) => {
    if (voucher.isUsed) {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                <XCircleIcon className="w-4 h-4 mr-1.5 text-gray-500 dark:text-gray-400" />
                Used
            </span>
        );
    }
    if (new Date() > new Date(voucher.expiresAt)) {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                <ClockIcon className="w-4 h-4 mr-1.5" />
                Expired
            </span>
        );
    }
    return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
            <CheckCircleIcon className="w-4 h-4 mr-1.5" />
            Available
        </span>
    );
};


const VoucherManagement: React.FC<VoucherManagementProps> = ({ vouchers, users }) => {
    const { handleDeleteVoucher, handleUpdateVoucher } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    
    // Edit/Delete State
    const [voucherToDelete, setVoucherToDelete] = useState<Voucher | null>(null);
    const [voucherToEdit, setVoucherToEdit] = useState<Voucher | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });

    const filteredVouchers = useMemo(() => {
        let enhancedVouchers = vouchers.map(v => {
            const redeemedByUser = v.usedBy ? users.find(u => u.id === v.usedBy) : null;
            return {
                ...v,
                redeemedByUser,
                redeemedByName: redeemedByUser ? `${redeemedByUser.firstName} ${redeemedByUser.lastName}` : v.usedBy,
            };
        });

        if (searchTerm.trim()) {
            const lowerSearch = searchTerm.toLowerCase();
            enhancedVouchers = enhancedVouchers.filter(v => 
                v.code.toLowerCase().includes(lowerSearch) ||
                (v.redeemedByName && v.redeemedByName.toLowerCase().includes(lowerSearch))
            );
        }

        return enhancedVouchers.sort((a,b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
    }, [vouchers, users, searchTerm]);
    
    const handleDeleteClick = (voucher: Voucher) => {
        if (voucher.isUsed) {
            alert("Cannot delete a voucher that has already been used.");
            return;
        }
        setVoucherToDelete(voucher);
    };

    const confirmDelete = async () => {
        if (voucherToDelete) {
            await handleDeleteVoucher(voucherToDelete.id);
            setVoucherToDelete(null);
        }
    };

    const handleEditClick = (voucher: Voucher) => {
        setVoucherToEdit(voucher);
        setIsEditModalOpen(true);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Voucher Management</h1>
                <button onClick={() => setIsGenerateModalOpen(true)} className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors shadow-md">
                    <PlusIcon className="w-5 h-5" />
                    <span>Generate Free Vouchers</span>
                </button>
            </div>
            
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">All Vouchers</h2>
                    <input
                        type="text"
                        placeholder="Search by code or student..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full max-w-xs px-3 py-2 border border-light-border dark:border-dark-border placeholder-light-subtle dark:placeholder-dark-subtle text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                        <thead className="bg-light-background dark:bg-dark-background">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Code</th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Redeemed By</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Purchaser</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Purchased</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Expires</th>
                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-light-border dark:divide-dark-border">
                            {filteredVouchers.map(v => (
                                <tr key={v.code}>
                                    <td className="px-4 py-3 whitespace-nowrap font-mono font-semibold">{v.code}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right font-medium">{currencyFormatter.format(v.amount)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center"><VoucherStatusBadge voucher={v} /></td>
                                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                                        {v.generatedByAdmin ? (
                                            <span className="text-purple-600 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded">Admin Gift</span>
                                        ) : 'Purchased'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {v.isUsed ? (
                                            v.redeemedByUser ? (
                                                <button onClick={() => setSelectedStudent(v.redeemedByUser)} className="text-left group">
                                                    <p className="font-medium group-hover:underline">{v.redeemedByName}</p>
                                                    <p className="text-xs text-light-subtle dark:text-dark-subtle">{v.usedBy}</p>
                                                    <p className="text-xs text-light-subtle dark:text-dark-subtle">{v.usedAt ? new Date(v.usedAt).toLocaleDateString() : ''}</p>
                                                </button>
                                            ) : (
                                                <div>
                                                    <p>{v.redeemedByName}</p>
                                                    <p className="text-xs text-light-subtle dark:text-dark-subtle">{v.usedAt ? new Date(v.usedAt).toLocaleDateString() : ''}</p>
                                                </div>
                                            )
                                        ) : (v.assignedToUserId ? <span className="text-xs text-blue-500">Assigned to user</span> : '-')}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">{v.billingFirstName} {v.billingLastName}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{new Date(v.purchasedAt).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{new Date(v.expiresAt).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center space-x-2">
                                        <button onClick={() => handleEditClick(v)} className="text-primary hover:underline" title="Edit Voucher">
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        {!v.isUsed && (
                                            <button onClick={() => handleDeleteClick(v)} className="text-red-500 hover:underline" title="Delete Voucher">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {selectedStudent && <StudentDetailsModal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} student={selectedStudent} />}
            <GenerateVoucherModal isOpen={isGenerateModalOpen} onClose={() => setIsGenerateModalOpen(false)} />
            
            {voucherToDelete && (
                <ConfirmationModal 
                    isOpen={true}
                    onClose={() => setVoucherToDelete(null)}
                    onConfirm={confirmDelete}
                    title="Delete Voucher"
                    message={`Are you sure you want to delete voucher ${voucherToDelete.code}? This action cannot be undone.`}
                    confirmText="Delete"
                />
            )}
            
            {voucherToEdit && (
                <EditVoucherModal 
                    isOpen={isEditModalOpen}
                    onClose={() => { setIsEditModalOpen(false); setVoucherToEdit(null); }}
                    voucher={voucherToEdit}
                    onSave={handleUpdateVoucher}
                />
            )}
        </div>
    );
};

export default VoucherManagement;
