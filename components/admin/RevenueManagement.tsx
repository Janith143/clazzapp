import React, { useState } from 'react';
import { Teacher, Withdrawal, User, TopUpRequest } from '../../types.ts';
import { CheckCircleIcon, XCircleIcon, ClockIcon, ChevronDownIcon } from '../Icons.tsx';
import RejectionReasonModal from '../RejectionReasonModal.tsx';
import ImageViewerModal from '../ImageViewerModal.tsx';
import StudentDetailsModal from '../StudentDetailsModal.tsx';

interface RevenueManagementProps {
    teachers: Teacher[];
    allUsers: User[];
    topUpRequests: TopUpRequest[];
    onUpdateWithdrawal: (userId: string, withdrawalId: string, status: Withdrawal['status'], notes?: string) => void;
    handleTopUpDecision: (requestId: string, decision: 'approved' | 'rejected', reason?: string, newAmount?: number) => void;
    onViewTeacher: (teacherId: string) => void;
}

const RevenueManagement: React.FC<RevenueManagementProps> = ({ teachers, allUsers, topUpRequests, onUpdateWithdrawal, handleTopUpDecision, onViewTeacher }) => {
    const [isRejectionModalOpen, setIsRejectionModalOpen] = React.useState(false);
    const [rejectionTarget, setRejectionTarget] = React.useState<TopUpRequest | null>(null);
    const [imageToView, setImageToView] = React.useState<{ url: string; title: string } | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [editedAmounts, setEditedAmounts] = useState<{ [key: string]: string }>({});
    const [isApprovedSlipsVisible, setIsApprovedSlipsVisible] = useState(false);

    const pendingWithdrawals = React.useMemo(() => {
        const teacherWithdrawals = teachers.flatMap(teacher =>
            teacher.withdrawalHistory
                .filter(w => w.status === 'pending')
                .map(w => ({ ...w, user: allUsers.find(u => u.id === teacher.userId), userType: 'Teacher' }))
        );

        const affiliateWithdrawals = allUsers
            .filter(u => u.role !== 'teacher' && u.withdrawalHistory && u.withdrawalHistory.length > 0)
            .flatMap(user =>
                user.withdrawalHistory!
                    .filter(w => w.status === 'pending')
                    .map(w => ({ ...w, user, userType: 'Affiliate' }))
            );

        return [...teacherWithdrawals, ...affiliateWithdrawals]
            .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());
    }, [teachers, allUsers]);

    const pendingTopUps = React.useMemo(() => {
        return topUpRequests
            .filter(req => req.status === 'pending')
            .map(req => ({ ...req, student: allUsers.find(u => u.id === req.studentId) }))
            .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());
    }, [topUpRequests, allUsers]);
    
    const approvedSlips = React.useMemo(() => {
        const approvedFromRequests = topUpRequests.filter(
            req => req.status === 'approved' && req.method === 'slip'
        );
    
        const approvedFromHistory = allUsers.flatMap(user => 
            (user.topUpHistory || [])
            .filter(req => req.status === 'approved' && req.method === 'slip')
            .map(req => ({ ...req, studentId: user.id })) // Ensure studentId is present
        );
        
        const allApproved = [...approvedFromRequests, ...approvedFromHistory];
        const uniqueApprovedMap = new Map<string, TopUpRequest & { student?: User }>();

        allApproved.forEach(req => {
            if (!uniqueApprovedMap.has(req.id)) {
                 uniqueApprovedMap.set(req.id, { ...req, student: allUsers.find(u => u.id === req.studentId) });
            }
        });

        return Array.from(uniqueApprovedMap.values())
            .sort((a, b) => new Date(b.processedAt || b.requestedAt).getTime() - new Date(a.processedAt || a.requestedAt).getTime());

    }, [topUpRequests, allUsers]);

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });

    const handleOpenRejectionModal = (request: TopUpRequest) => {
        setRejectionTarget(request);
        setIsRejectionModalOpen(true);
    };

    const handleRejectionSubmit = (reason: string) => {
        if (rejectionTarget) {
            handleTopUpDecision(rejectionTarget.id, 'rejected', reason);
        }
        setIsRejectionModalOpen(false);
        setRejectionTarget(null);
    };
    
    const handleViewUser = (user?: User) => {
        if (!user) return;
        if (user.role === 'teacher') {
            onViewTeacher(user.id);
        } else {
            setSelectedStudent(user);
        }
    };
    
    const handleAmountChange = (requestId: string, value: string) => {
        setEditedAmounts(prev => ({ ...prev, [requestId]: value }));
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Revenue & Payouts</h1>
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Pending Top-Up Requests</h2>
                {pendingTopUps.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                            <thead className="bg-light-background dark:bg-dark-background">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Student</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Amount (LKR)</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Requested On</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-light-border dark:divide-dark-border">
                                {pendingTopUps.map(req => {
                                    const editedValue = editedAmounts[req.id];
                                    const isEdited = editedValue !== undefined && parseFloat(editedValue) !== req.amount;
                                    const currentAmount = editedValue ?? req.amount.toString();

                                    return (
                                        <tr key={req.id}>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {req.student ? (
                                                    <button onClick={() => setSelectedStudent(req.student!)} className="text-left group">
                                                        <p className="font-medium group-hover:underline">{req.student.firstName} {req.student.lastName}</p>
                                                        <p className="text-xs text-light-subtle dark:text-dark-subtle">{req.student.id}</p>
                                                    </button>
                                                ) : 'Unknown'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-right">
                                                <input
                                                    type="number"
                                                    value={currentAmount}
                                                    onChange={(e) => handleAmountChange(req.id, e.target.value)}
                                                    className="w-28 px-2 py-1 border rounded-md text-right bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border"
                                                    step="0.01"
                                                />
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">{new Date(req.requestedAt).toLocaleString()}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center space-x-2">
                                                <button onClick={() => req.imageUrl && setImageToView({ url: req.imageUrl, title: 'Payment Slip' })} className="px-3 py-1 text-xs font-medium text-primary hover:underline">View Slip</button>
                                                {isEdited ? (
                                                     <button onClick={() => handleTopUpDecision(req.id, 'approved', undefined, parseFloat(editedAmounts[req.id]))} className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                                                        Update & Approve
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleTopUpDecision(req.id, 'approved')} className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                                                        Approve
                                                    </button>
                                                )}
                                                <button onClick={() => handleOpenRejectionModal(req)} className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Reject</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">No pending top-up requests.</p>
                )}
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                 <button onClick={() => setIsApprovedSlipsVisible(!isApprovedSlipsVisible)} className="w-full flex justify-between items-center text-left">
                    <h2 className="text-xl font-bold">Approved Payment Slips ({approvedSlips.length})</h2>
                    <ChevronDownIcon className={`w-6 h-6 transition-transform ${isApprovedSlipsVisible ? 'rotate-180' : ''}`} />
                </button>
                 {isApprovedSlipsVisible && (
                    <div className="mt-4 overflow-x-auto animate-fadeIn">
                        {approvedSlips.length > 0 ? (
                            <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                                <thead className="bg-light-background dark:bg-dark-background">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Student</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Processed On</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Requested On</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-light-border dark:divide-dark-border">
                                    {approvedSlips.map(req => (
                                        <tr key={req.id}>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {req.student ? (
                                                    <button onClick={() => setSelectedStudent(req.student!)} className="text-left group">
                                                        <p className="font-medium group-hover:underline">{req.student.firstName} {req.student.lastName}</p>
                                                        <p className="text-xs text-light-subtle dark:text-dark-subtle">{req.student.id}</p>
                                                    </button>
                                                ) : 'Unknown'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-right">
                                                <p className="font-semibold">{currencyFormatter.format(req.amount)}</p>
                                                {req.originalAmount && req.originalAmount !== req.amount && (
                                                    <p className="text-xs text-light-subtle dark:text-dark-subtle line-through">{currencyFormatter.format(req.originalAmount)}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">{req.processedAt ? new Date(req.processedAt).toLocaleString() : 'N/A'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">{new Date(req.requestedAt).toLocaleString()}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                                <button onClick={() => req.imageUrl && setImageToView({ url: req.imageUrl, title: 'Payment Slip' })} className="px-3 py-1 text-xs font-medium text-primary hover:underline">View Slip</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">No approved payment slips found.</p>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Pending Withdrawal Requests</h2>
                {pendingWithdrawals.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                            <thead className="bg-light-background dark:bg-dark-background">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">User</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">User Type</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Amount</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Requested On</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-light-border dark:divide-dark-border">
                                {pendingWithdrawals.map(w => (
                                    <tr key={w.id}>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {w.user ? (
                                                <button onClick={() => handleViewUser(w.user)} className="text-left group">
                                                    <p className="font-medium group-hover:underline">{w.user.firstName} {w.user.lastName}</p>
                                                    <p className="text-xs text-light-subtle dark:text-dark-subtle">{w.user.id}</p>
                                                </button>
                                            ) : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">{w.userType}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right font-semibold">{currencyFormatter.format(w.amount)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{new Date(w.requestedAt).toLocaleString()}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center space-x-2">
                                            <button onClick={() => onUpdateWithdrawal(w.userId, w.id, 'completed')} className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Mark as Completed</button>
                                            <button onClick={() => onUpdateWithdrawal(w.userId, w.id, 'failed', 'Admin rejected.')} className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Mark as Failed</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">No pending withdrawal requests.</p>
                )}
            </div>
             {imageToView && (
                <ImageViewerModal
                    isOpen={!!imageToView}
                    onClose={() => setImageToView(null)}
                    imageUrl={imageToView.url}
                    title={imageToView.title}
                />
            )}
             <RejectionReasonModal isOpen={isRejectionModalOpen} onClose={() => setIsRejectionModalOpen(false)} onSubmit={handleRejectionSubmit} />
             {selectedStudent && <StudentDetailsModal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} student={selectedStudent} />}
        </div>
    );
};

export default RevenueManagement;
