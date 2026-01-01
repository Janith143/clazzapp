import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Teacher, Sale, User, Withdrawal, PayoutDetails, AdditionalService } from '../../types.ts';
import { BanknotesIcon, CheckCircleIcon, XCircleIcon, ClockIcon, DocumentTextIcon, PencilIcon, UploadIcon, PauseIcon, ChartBarIcon } from '../Icons.tsx';
import { useAuth } from '../../contexts/AuthContext';
import BankDetailsModal from '../BankDetailsModal.tsx';
import ConfirmationModal from '../ConfirmationModal.tsx';
import VerificationUploadModal from '../VerificationUploadModal.tsx';
import RejectionReasonModal from '../RejectionReasonModal.tsx';
import StudentDetailsModal from '../StudentDetailsModal.tsx';
import WithdrawalInvoiceModal from '../WithdrawalInvoiceModal.tsx';
import ImageViewerModal from '../ImageViewerModal.tsx';
import { useData } from '../../contexts/DataContext.tsx';
import PaymentMethodSelector from '../PaymentMethodSelector.tsx';
import { useNavigation } from '../../contexts/NavigationContext.tsx';
import Modal from '../Modal.tsx';
import FormInput from '../FormInput.tsx';


interface EarningsDashboardProps {
    teacher: Teacher;
    allSales: Sale[];
    allUsers: User[];
    isAdminView: boolean;
    onWithdraw: (amount: number) => void;
    onSaveBankDetails: (details: PayoutDetails) => void;
    onVerificationUpload: (type: 'id_front' | 'id_back' | 'bank', imageUrl: string, requestNote: string) => void;
    onVerificationDecision: (type: 'id' | 'bank', decision: 'approve' | 'reject', reason: string) => void;
    onUpdatePhysicalOrderStatus: (saleId: string, status: Sale['physicalOrderStatus']) => void;
}


const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-light-background dark:bg-dark-background p-5 rounded-lg border border-light-border dark:border-dark-border">
        <div className="flex items-center">
            <div className="p-3 bg-primary/10 text-primary rounded-lg mr-4">{icon}</div>
            <div>
                <p className="text-sm font-medium text-light-subtle dark:text-dark-subtle">{title}</p>
                <p className="text-2xl font-bold text-light-text dark:text-dark-text">{value}</p>
            </div>
        </div>
    </div>
);

const VerificationStatusBadge: React.FC<{ status: 'unverified' | 'pending' | 'verified' | 'rejected' }> = ({ status }) => {
    const statusMap = {
        verified: { icon: <CheckCircleIcon className="w-4 h-4 mr-1.5" />, text: 'Verified', classes: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
        pending: { icon: <ClockIcon className="w-4 h-4 mr-1.5" />, text: 'Pending Review', classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/50 dark:text-yellow-300' },
        rejected: { icon: <XCircleIcon className="w-4 h-4 mr-1.5" />, text: 'Rejected', classes: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
        unverified: { icon: <DocumentTextIcon className="w-4 h-4 mr-1.5" />, text: 'Not Submitted', classes: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
    };
    const { icon, text, classes } = statusMap[status];
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>{icon}{text}</span>;
};

const PayoutStatusBadge: React.FC<{ status: 'Upcoming' | 'Processed' | 'Processing' }> = ({ status }) => {
    const styles = {
        Upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        Processed: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        Processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/50 dark:text-yellow-300 animate-pulse'
    };
    const icons = {
        Upcoming: <ClockIcon className="w-4 h-4 mr-1.5" />,
        Processed: <CheckCircleIcon className="w-4 h-4 mr-1.5" />,
        Processing: <ClockIcon className="w-4 h-4 mr-1.5" />
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
            {icons[status]}
            {status}
        </span>
    );
};

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


const VerificationItem: React.FC<{ title: string; verification: any; onUpload: () => void; isAdminView: boolean; onApprove: () => void; onReject: () => void; onViewImage: (url: string, title: string) => void; }> = ({ title, verification, onUpload, isAdminView, onApprove, onReject, onViewImage }) => {
    return (
        <div className="border border-light-border dark:border-dark-border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-semibold text-light-text dark:text-dark-text">{title}</h3>
                    <VerificationStatusBadge status={verification.status} />
                </div>
                {!isAdminView && verification.status !== 'verified' && (
                    <button onClick={onUpload} className="flex-shrink-0 flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary-dark">
                        <UploadIcon className="w-3 h-3" />
                        <span>{verification.imageUrl ? 'Re-upload' : 'Upload'}</span>
                    </button>
                )}
            </div>
            {verification.rejectionReason && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/30 p-2 rounded-md"><strong>Reason:</strong> {verification.rejectionReason}</p>}
            {(isAdminView || verification.status === 'pending') && verification.imageUrl && (
                <div className="pt-2">
                    <button onClick={() => onViewImage(verification.imageUrl, `${title} Document`)} className="text-sm font-medium text-primary hover:underline">
                        View Submitted Document
                    </button>
                </div>
            )}
            {isAdminView && verification.status === 'pending' && (
                <div className="mt-4 space-y-2">
                    {verification.requestNote && <p className="text-xs italic text-light-subtle dark:text-dark-subtle p-2 bg-light-background dark:bg-dark-background rounded-md"><strong>Teacher's Note:</strong> {verification.requestNote}</p>}
                    <div className="flex space-x-2 pt-2">
                        <button onClick={onApprove} className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Approve</button>
                        <button onClick={onReject} className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Reject</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const EarningsDashboard: React.FC<EarningsDashboardProps> = ({ teacher, allSales, allUsers, isAdminView, onWithdraw, onSaveBankDetails, onVerificationUpload, onVerificationDecision, onUpdatePhysicalOrderStatus }) => {
    const { currentUser } = useAuth();
    const { processMonthlyPayouts, tuitionInstitutes, handlePurchaseService } = useData();
    const { additionalServices } = useNavigation();
    const [isCheckingPayouts, setIsCheckingPayouts] = useState(true);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    const [verificationType, setVerificationType] = useState<'id_front' | 'id_back' | 'bank'>('id_front');
    const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
    const [rejectionTarget, setRejectionTarget] = useState<'id' | 'bank' | null>(null);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
    const [salesSearchTerm, setSalesSearchTerm] = useState('');
    const [salesFilter, setSalesFilter] = useState<'all' | 'class' | 'course' | 'quiz'>('all');
    const [salesDateFilter, setSalesDateFilter] = useState<'all' | 'week' | 'month'>('all');
    const [imageToView, setImageToView] = useState<{ url: string; title: string } | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'saleDate', direction: 'descending' });
    const [viewingAddress, setViewingAddress] = useState<(Sale & { student?: User }) | null>(null);

    // Service Payment State
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [serviceToPay, setServiceToPay] = useState<AdditionalService | null>(null);
    const [customServiceDetails, setCustomServiceDetails] = useState<{ title: string, cost: string }>({ title: '', cost: '' });
    const [showPaymentSelector, setShowPaymentSelector] = useState(false);

    useEffect(() => {
        const checkPayouts = async () => {
            if (teacher.id) {
                setIsCheckingPayouts(true);
                await processMonthlyPayouts('teacher', teacher.id);
                setIsCheckingPayouts(false);
            }
        };
        checkPayouts();
    }, [teacher.id, processMonthlyPayouts]);

    const handleCloseBankModal = useCallback(() => setIsBankModalOpen(false), []);
    const handleCloseWithdrawModal = useCallback(() => setIsWithdrawModalOpen(false), []);
    const handleCloseVerificationModal = useCallback(() => setIsVerificationModalOpen(false), []);
    const handleCloseRejectionModal = useCallback(() => setIsRejectionModalOpen(false), []);
    const handleCloseStudentModal = useCallback(() => {
        setIsStudentModalOpen(false);
        setSelectedStudent(null);
    }, []);
    const handleCloseWithdrawalInvoiceModal = useCallback(() => setSelectedWithdrawal(null), []);
    const handleCloseImageViewer = useCallback(() => setImageToView(null), []);
    const handleCloseServiceModal = useCallback(() => setIsServiceModalOpen(false), []);
    const handleCloseShippingModal = useCallback(() => setViewingAddress(null), []);

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });
    const isVerified = teacher.verification.id.status === 'verified' && teacher.verification.bank.status === 'verified';

    const { incomeSales, expenseSales } = useMemo(() => {
        const income: (Sale & { student?: User })[] = [];
        const expense: (Sale & { student?: User })[] = [];

        allSales
            .filter(s => s.teacherId === teacher.id)
            .forEach(sale => {
                const saleWithStudent = { ...sale, student: allUsers.find(u => u.id === sale.studentId) };
                if (sale.itemType === 'additional_service') {
                    expense.push(saleWithStudent);
                } else {
                    income.push(saleWithStudent);
                }
            });

        // Sorting expense sales by date descending
        expense.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

        return { incomeSales: income, expenseSales: expense };
    }, [allSales, allUsers, teacher.id]);

    const manualEarningsByInstitute = useMemo(() => {
        if (!teacher.manualEarningsByInstitute) return [];
        return Object.entries(teacher.manualEarningsByInstitute).map(([instituteId, balance]) => {
            const institute = tuitionInstitutes.find(ti => ti.id === instituteId);
            return {
                instituteName: institute?.name || 'Unknown Institute',
                balance,
            };
        });
    }, [teacher.manualEarningsByInstitute, tuitionInstitutes]);


    const { lastMonthPayout, payoutDate, payoutStatus } = useMemo(() => {
        const now = new Date();
        const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfPreviousMonth = new Date(firstDayOfCurrentMonth.getTime() - 1);
        const firstDayOfPreviousMonth = new Date(lastDayOfPreviousMonth.getFullYear(), lastDayOfPreviousMonth.getMonth(), 1);

        const lastMonthSales = incomeSales.filter(sale => {
            const saleDate = new Date(sale.saleDate);
            return sale.status === 'completed' && saleDate >= firstDayOfPreviousMonth && saleDate <= lastDayOfPreviousMonth;
        });

        const grossEarnings = lastMonthSales.reduce((acc, sale) => acc + (sale.totalAmount + sale.amountPaidFromBalance), 0);
        const platformFee = grossEarnings * (teacher.commissionRate / 100);
        const netPayout = grossEarnings - platformFee;

        const payoutDate = new Date(now.getFullYear(), now.getMonth(), 15);

        const payoutIdentifier = `${lastDayOfPreviousMonth.getFullYear()}-${String(lastDayOfPreviousMonth.getMonth() + 1).padStart(2, '0')}`;
        let status: 'Processed' | 'Upcoming' | 'Processing' = 'Upcoming';
        if (teacher.earnings.processedPayouts?.includes(payoutIdentifier)) {
            status = 'Processed';
        } else if (now.getDate() >= 15) {
            status = 'Processing';
        }

        const previousMonthName = lastDayOfPreviousMonth.toLocaleString('default', { month: 'long' });

        return {
            lastMonthPayout: {
                gross: grossEarnings,
                fee: platformFee,
                net: netPayout,
                monthName: previousMonthName,
            },
            payoutDate,
            payoutStatus: status
        };
    }, [incomeSales, teacher.commissionRate, teacher.earnings.processedPayouts]);

    const filteredSales = useMemo(() => {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1)); // Monday as start of week
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);

        let filtered = incomeSales.filter(sale => {
            if (sale.status === 'hold') return false; // skip hold sales
            const lowerSearch = salesSearchTerm.toLowerCase();
            const matchesSearch = !lowerSearch || sale.itemName.toLowerCase().includes(lowerSearch) || (sale.student?.firstName && sale.student.firstName.toLowerCase().includes(lowerSearch)) || (sale.student?.lastName && sale.student.lastName.toLowerCase().includes(lowerSearch));
            const matchesFilter = salesFilter === 'all' || sale.itemType === salesFilter;

            const saleDate = new Date(sale.saleDate);
            let matchesDate = true;
            if (salesDateFilter === 'week') {
                matchesDate = saleDate >= startOfWeek;
            } else if (salesDateFilter === 'month') {
                matchesDate = saleDate >= startOfMonth;
            }

            return matchesSearch && matchesFilter && matchesDate;
        });

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                switch (sortConfig.key) {
                    case 'student':
                        aValue = a.student ? `${a.student.firstName} ${a.student.lastName}`.toLowerCase() : '';
                        bValue = b.student ? `${b.student.firstName} ${b.student.lastName}`.toLowerCase() : '';
                        break;
                    case 'totalAmount':
                        aValue = a.totalAmount + a.amountPaidFromBalance;
                        bValue = b.totalAmount + b.amountPaidFromBalance;
                        break;
                    case 'saleDate':
                        aValue = new Date(a.saleDate).getTime();
                        bValue = new Date(b.saleDate).getTime();
                        break;
                    default:
                        aValue = a[sortConfig.key as keyof typeof a];
                        bValue = b[sortConfig.key as keyof typeof b];
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }

        return filtered;
    }, [incomeSales, salesSearchTerm, salesFilter, salesDateFilter, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (columnKey: string) => {
        if (sortConfig.key === columnKey) {
            return sortConfig.direction === 'ascending' ? '▲' : '▼';
        }
        return '';
    };

    const sortedWithdrawals = useMemo(() => {
        return [...teacher.withdrawalHistory].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    }, [teacher.withdrawalHistory]);

    const handleConfirmWithdraw = () => {
        const amount = parseFloat(withdrawAmount);
        if (amount > 0 && amount <= teacher.earnings.available) {
            onWithdraw(amount);
        }
        setIsWithdrawModalOpen(false);
        setWithdrawAmount('');
    };

    const handleOpenVerificationModal = (type: 'id_front' | 'id_back' | 'bank') => {
        setVerificationType(type);
        setIsVerificationModalOpen(true);
    };

    const handleVerificationSave = (imageUrl: string, requestNote: string) => {
        onVerificationUpload(verificationType, imageUrl, requestNote);
        setIsVerificationModalOpen(false);
    };

    const handleOpenRejectionModal = (type: 'id' | 'bank') => {
        setRejectionTarget(type);
        setIsRejectionModalOpen(true);
    };

    const handleRejectionSubmit = (reason: string) => {
        if (rejectionTarget) {
            onVerificationDecision(rejectionTarget, 'reject', reason);
        }
        setIsRejectionModalOpen(false);
        setRejectionTarget(null);
    };

    const handleViewStudent = (student?: User) => {
        if (student) {
            setSelectedStudent(student);
            setIsStudentModalOpen(true);
        }
    }

    const handleViewImage = (url: string, title: string) => {
        setImageToView({ url, title });
    };

    const handleSaveAndCloseBankDetails = (details: PayoutDetails) => {
        onSaveBankDetails(details);
        handleCloseBankModal();
    };

    const openServicePayment = (service?: AdditionalService) => {
        if (service) {
            setServiceToPay(service);
            setCustomServiceDetails({ title: service.title, cost: service.cost.toString() });
        } else {
            setServiceToPay(null); // Custom
            setCustomServiceDetails({ title: '', cost: '' });
        }
        setIsServiceModalOpen(true);
    };

    // Correctly placing handlers here
    const handleConfirmServicePayment = useCallback(() => {
        const title = serviceToPay ? serviceToPay.title : customServiceDetails.title;
        const cost = serviceToPay ? serviceToPay.cost : parseFloat(customServiceDetails.cost);

        if (!title || cost <= 0) return;

        const balanceToApply = Math.min(currentUser?.accountBalance || 0, cost);
        const remaining = cost - balanceToApply;

        if (remaining > 0) {
            setIsServiceModalOpen(false);
            setShowPaymentSelector(true);
        } else {
            handlePurchaseService(
                serviceToPay || { id: 'custom', title, cost, description: '' },
                cost,
                title
            );
            setIsServiceModalOpen(false);
            setCustomServiceDetails({ title: '', cost: '' });
        }
    }, [serviceToPay, customServiceDetails, handlePurchaseService, currentUser]);

    const handlePaymentMethodSelected = (method: import('../../types').PaymentMethod) => {
        const title = serviceToPay ? serviceToPay.title : customServiceDetails.title;
        const cost = serviceToPay ? serviceToPay.cost : parseFloat(customServiceDetails.cost);

        handlePurchaseService(
            serviceToPay || { id: 'custom', title, cost, description: '' },
            cost,
            title,
            method
        );
        setShowPaymentSelector(false);
        setCustomServiceDetails({ title: '', cost: '' });
        setServiceToPay(null);
    };

    const WithdrawalStatusBadge: React.FC<{ status: Withdrawal['status'] }> = ({ status }) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/50 dark:text-yellow-300',
            completed: 'bg-green-100 text-green-800 dark:bg-green-800/50 dark:text-green-300',
            failed: 'bg-red-100 text-red-800 dark:bg-red-800/50 dark:text-red-300',
        };
        const icons = {
            pending: <ClockIcon className="w-4 h-4 mr-1.5" />,
            completed: <CheckCircleIcon className="w-4 h-4 mr-1.5" />,
            failed: <XCircleIcon className="w-4 h-4 mr-1.5" />,
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
                {icons[status]}
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Earnings" value={currencyFormatter.format(teacher.earnings.total)} icon={<BanknotesIcon className="w-6 h-6" />} />
                <StatCard title="Total Withdrawn" value={currencyFormatter.format(teacher.earnings.withdrawn)} icon={<CheckCircleIcon className="w-6 h-6" />} />
                <StatCard title="Available for Withdrawal" value={currencyFormatter.format(teacher.earnings.available)} icon={<ClockIcon className="w-6 h-6" />} />
                <StatCard title="Platform Commission" value={`${teacher.commissionRate}%`} icon={<ChartBarIcon className="w-6 h-6" />} />
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md text-light-text dark:text-dark-text">
                <h2 className="text-xl font-bold mb-4">Last Month's Payout Summary ({lastMonthPayout.monthName})</h2>
                <div className="space-y-4">
                    <div className="bg-light-background dark:bg-dark-background p-4 rounded-md">
                        <p className="text-sm text-light-subtle dark:text-dark-subtle">Gross Earnings</p>
                        <p className="text-2xl font-bold">{currencyFormatter.format(lastMonthPayout.gross)}</p>
                    </div>
                    <div className="bg-light-background dark:bg-dark-background p-4 rounded-md">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                            <div>
                                <p className="text-sm text-light-subtle dark:text-dark-subtle">Net Payout Amount</p>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{currencyFormatter.format(lastMonthPayout.net)}</p>
                            </div>
                            <div className="mt-2 sm:mt-0 text-left sm:text-right">
                                <p className="text-sm text-light-subtle dark:text-dark-subtle">Available to withdraw on</p>
                                <p className="font-semibold">{payoutDate.toLocaleDateString()}</p>
                                <div className="mt-1 flex justify-start sm:justify-end">
                                    <PayoutStatusBadge status={payoutStatus} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Earnings from Institute Manual Collections</h2>
                {manualEarningsByInstitute.length > 0 ? (
                    <div className="space-y-3">
                        {manualEarningsByInstitute.map(({ instituteName, balance }) => (
                            <div key={instituteName} className="flex justify-between items-center p-3 bg-light-background dark:bg-dark-background rounded-md">
                                <span className="font-medium">{instituteName}</span>
                                <span className="font-bold text-lg text-primary">{currencyFormatter.format(balance)}</span>
                            </div>
                        ))}
                        <p className="text-xs text-light-subtle dark:text-dark-subtle pt-2">Note: This amount is paid directly to you by the institute and cannot be withdrawn through the clazz.lk platform.</p>
                    </div>
                ) : (
                    <p className="text-center py-4 text-light-subtle dark:text-dark-subtle">No earnings from institute manual collections yet.</p>
                )}
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-light-text dark:text-dark-text">Verification Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-light-border dark:border-dark-border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-light-text dark:text-dark-text">ID Verification</h3>
                                <VerificationStatusBadge status={teacher.verification.id.status} />
                            </div>
                        </div>

                        {teacher.verification.id.rejectionReason && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/30 p-2 rounded-md"><strong>Reason:</strong> {teacher.verification.id.rejectionReason}</p>}

                        <div className="flex justify-between items-center pt-2 border-t border-light-border/50 dark:border-dark-border/50">
                            <p className="text-sm font-medium">Front Image</p>
                            <div className="flex items-center space-x-2">
                                {teacher.verification.id.frontImageUrl && (isAdminView || teacher.verification.id.status === 'pending') && (
                                    <button onClick={() => handleViewImage(teacher.verification.id.frontImageUrl!, 'ID Front Image')} className="text-xs font-medium text-primary hover:underline">View</button>
                                )}
                                {!isAdminView && teacher.verification.id.status !== 'verified' && (
                                    <button onClick={() => handleOpenVerificationModal('id_front')} className="px-2 py-1 text-xs text-primary border border-primary rounded-md hover:bg-primary/10">
                                        {teacher.verification.id.frontImageUrl ? 'Re-upload' : 'Upload'}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-light-border/50 dark:border-dark-border/50">
                            <p className="text-sm font-medium">Back Image</p>
                            <div className="flex items-center space-x-2">
                                {teacher.verification.id.backImageUrl && (isAdminView || teacher.verification.id.status === 'pending') && (
                                    <button onClick={() => handleViewImage(teacher.verification.id.backImageUrl!, 'ID Back Image')} className="text-xs font-medium text-primary hover:underline">View</button>
                                )}
                                {!isAdminView && teacher.verification.id.status !== 'verified' && (
                                    <button onClick={() => handleOpenVerificationModal('id_back')} className="px-2 py-1 text-xs text-primary border border-primary rounded-md hover:bg-primary/10">
                                        {teacher.verification.id.backImageUrl ? 'Re-upload' : 'Upload'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {isAdminView && teacher.verification.id.status === 'pending' && (
                            <div className="mt-4 space-y-2 pt-2 border-t border-light-border/50 dark:border-dark-border/50">
                                {teacher.verification.id.requestNote && <p className="text-xs italic text-light-subtle dark:text-dark-subtle p-2 bg-light-background dark:bg-dark-background rounded-md"><strong>Teacher's Note:</strong> {teacher.verification.id.requestNote}</p>}
                                <div className="flex space-x-2">
                                    <button onClick={() => onVerificationDecision('id', 'approve', '')} className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Approve</button>
                                    <button onClick={() => handleOpenRejectionModal('id')} className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Reject</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <VerificationItem
                        title="Bank Details Verification"
                        verification={teacher.verification.bank}
                        onUpload={() => handleOpenVerificationModal('bank')}
                        isAdminView={isAdminView}
                        onApprove={() => onVerificationDecision('bank', 'approve', '')}
                        onReject={() => handleOpenRejectionModal('bank')}
                        onViewImage={handleViewImage}
                    />
                </div>
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-light-text dark:text-dark-text">Bank & Payouts</h2>
                        {teacher.payoutDetails ? (
                            <div className="text-sm text-light-subtle dark:text-dark-subtle mt-1">
                                <p>{teacher.payoutDetails.bankName} - {teacher.payoutDetails.branchName}</p>
                                <p>A/C: **** **** {teacher.payoutDetails.accountNumber.slice(-4)}</p>
                            </div>
                        ) : (
                            <p className="text-sm text-light-subtle dark:text-dark-subtle mt-1">No bank details added yet.</p>
                        )}
                    </div>
                    <div className="flex-shrink-0 flex items-center space-x-2">
                        <button onClick={() => setIsBankModalOpen(true)} className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium border border-light-border dark:border-dark-border rounded-md hover:bg-light-border dark:hover:bg-dark-border text-light-text dark:text-dark-text">
                            <PencilIcon className="w-3 h-3" />
                            <span>Edit</span>
                        </button>
                        <button onClick={() => setIsWithdrawModalOpen(true)} disabled={!isVerified || teacher.earnings.available <= 0 || isCheckingPayouts} className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary-dark disabled:bg-gray-400 disabled:cursor-not-allowed">
                            {isCheckingPayouts ? 'Checking...' : 'Request Withdrawal'}
                        </button>
                    </div>
                </div>
                {!isVerified && (
                    <p className="mt-4 text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 p-2 rounded-md">
                        Please complete both ID and Bank verification to enable withdrawals.
                    </p>
                )}
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-light-text dark:text-dark-text">Additional Services</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {additionalServices.map(service => (
                        <div key={service.id} className="border border-light-border dark:border-dark-border rounded-lg p-4 flex flex-col justify-between">
                            <div>
                                <h3 className="font-semibold">{service.title}</h3>
                                {service.description && <p className="text-sm text-light-subtle dark:text-dark-subtle mt-1">{service.description}</p>}
                                <p className="text-lg font-bold text-primary mt-2">{currencyFormatter.format(service.cost)}</p>
                            </div>
                            <button onClick={() => openServicePayment(service)} className="mt-4 w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark">
                                Purchase
                            </button>
                        </div>
                    ))}
                    <div className="border border-dashed border-light-border dark:border-dark-border rounded-lg p-4 flex flex-col justify-center items-center text-center">
                        <h3 className="font-semibold">Custom Payment</h3>
                        <p className="text-sm text-light-subtle dark:text-dark-subtle mt-1">Make a payment for an unlisted service.</p>
                        <button onClick={() => openServicePayment()} className="mt-4 w-full px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/10">
                            Pay Custom Amount
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-light-text dark:text-dark-text">Withdrawal History</h2>
                {sortedWithdrawals.length > 0 ? (
                    <div className="overflow-x-auto max-h-96">
                        <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                            <thead className="bg-light-background dark:bg-dark-background sticky top-0">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Requested</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Processed</th>
                                    <th className="px-3 py-3 text-right text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Amount</th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Status</th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-light-border dark:divide-dark-border">
                                {sortedWithdrawals.map(w => (
                                    <tr key={w.id} className="text-light-text dark:text-dark-text">
                                        <td className="px-3 py-3 whitespace-nowrap">{new Date(w.requestedAt).toLocaleDateString()}</td>
                                        <td className="px-3 py-3 whitespace-nowrap">{w.processedAt ? new Date(w.processedAt).toLocaleDateString() : 'N/A'}</td>
                                        <td className="px-3 py-3 whitespace-nowrap text-right font-semibold">{currencyFormatter.format(w.amount)}</td>
                                        <td className="px-3 py-3 whitespace-nowrap text-center"><WithdrawalStatusBadge status={w.status} /></td>
                                        <td className="px-3 py-3 whitespace-nowrap text-center">
                                            {w.status === 'completed' ? (
                                                <button onClick={() => setSelectedWithdrawal(w)} className="text-primary hover:underline text-xs font-semibold">View Invoice</button>
                                            ) : w.notes ? (
                                                <span className="text-xs text-light-subtle dark:text-dark-subtle italic" title={w.notes}>Has Notes</span>
                                            ) : ('-')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">No withdrawal requests have been made yet.</p>
                )}
            </div>



            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-light-text dark:text-dark-text">Service Purchase History</h2>
                {expenseSales.length > 0 ? (
                    <div className="overflow-x-auto max-h-60">
                        <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                            <thead className="bg-light-background dark:bg-dark-background sticky top-0">
                                <tr className="text-light-text dark:text-dark-text">
                                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Service</th>
                                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider">Amount</th>
                                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-light-border dark:divide-dark-border">
                                {expenseSales.map(sale => (
                                    <tr key={sale.id} className="text-light-text dark:text-dark-text">
                                        <td className="px-3 py-3 whitespace-nowrap">{new Date(sale.saleDate).toLocaleDateString()}</td>
                                        <td className="px-3 py-3">{sale.itemName}</td>
                                        <td className="px-3 py-3 whitespace-nowrap text-right font-semibold">{currencyFormatter.format(sale.totalAmount + sale.amountPaidFromBalance)}</td>
                                        <td className="px-3 py-3 whitespace-nowrap text-center text-xs capitalize"><span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">{sale.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center py-4 text-light-subtle dark:text-dark-subtle">No service purchases found.</p>
                )}
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-light-text dark:text-dark-text">Sales History (Student Purchases)</h2>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="flex-grow grid grid-cols-2 sm:flex sm:space-x-2 rounded-md shadow-sm" role="group">
                        <button onClick={() => setSalesDateFilter('all')} className={`px-4 py-2 text-sm font-medium border rounded-l-lg ${salesDateFilter === 'all' ? 'bg-primary text-white border-primary' : 'bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border hover:bg-light-border dark:hover:bg-dark-border text-light-text dark:text-dark-text'}`}>All Time</button>
                        <button onClick={() => setSalesDateFilter('week')} className={`px-4 py-2 text-sm font-medium border-t border-b ${salesDateFilter === 'week' ? 'bg-primary text-white border-primary' : 'bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border hover:bg-light-border dark:hover:bg-dark-border text-light-text dark:text-dark-text'}`}>This Week</button>
                        <button onClick={() => setSalesDateFilter('month')} className={`px-4 py-2 text-sm font-medium border rounded-r-lg sm:border-l-0 ${salesDateFilter === 'month' ? 'bg-primary text-white border-primary' : 'bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border hover:bg-light-border dark:hover:bg-dark-border text-light-text dark:text-dark-text'}`}>This Month</button>
                    </div>
                    <input
                        type="text"
                        placeholder="Search by item or student..."
                        value={salesSearchTerm}
                        onChange={(e) => setSalesSearchTerm(e.target.value)}
                        className="w-full sm:w-auto px-3 py-2 border border-light-border dark:border-dark-border placeholder-light-subtle dark:placeholder-dark-subtle text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                    <select
                        value={salesFilter}
                        onChange={(e) => setSalesFilter(e.target.value as any)}
                        className="w-full sm:w-auto px-3 py-2 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    >
                        <option value="all">All Types</option>
                        <option value="class">Classes</option>
                        <option value="course">Courses</option>
                        <option value="quiz">Quizzes</option>
                    </select>
                </div>
                {filteredSales.length > 0 ? (
                    <div className="overflow-x-auto max-h-[40rem]">
                        <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                            <thead className="bg-light-background dark:bg-dark-background sticky top-0">
                                <tr className="text-light-text dark:text-dark-text">
                                    <th className="px-3 py-3 text-left text-xs"><button onClick={() => requestSort('saleDate')} className="flex items-center font-medium uppercase tracking-wider">Date <span className="ml-1">{getSortIndicator('saleDate')}</span></button></th>
                                    <th className="px-3 py-3 text-left text-xs"><button onClick={() => requestSort('student')} className="flex items-center font-medium uppercase tracking-wider">Student <span className="ml-1">{getSortIndicator('student')}</span></button></th>
                                    <th className="px-3 py-3 text-left text-xs"><button onClick={() => requestSort('itemName')} className="flex items-center font-medium uppercase tracking-wider">Item <span className="ml-1">{getSortIndicator('itemName')}</span></button></th>
                                    <th className="px-3 py-3 text-right text-xs"><button onClick={() => requestSort('totalAmount')} className="w-full flex justify-end items-center font-medium uppercase tracking-wider">Total Sale <span className="ml-1">{getSortIndicator('totalAmount')}</span></button></th>
                                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Shipping</th>
                                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Order Status</th>
                                    <th className="px-3 py-3 text-center text-xs"><button onClick={() => requestSort('status')} className="w-full flex justify-center items-center font-medium uppercase tracking-wider">Sale Status <span className="ml-1">{getSortIndicator('status')}</span></button></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-light-border dark:divide-dark-border">
                                {filteredSales.map((sale) => {
                                    const originalItemPrice = sale.totalAmount + sale.amountPaidFromBalance;
                                    const hasPhysical = sale.cartItems?.some(item => item.type === 'product' && item.product.type === 'physical');

                                    return (
                                        <tr key={sale.id} className={`${sale.status === 'refunded' ? 'bg-gray-50 dark:bg-gray-800/50' : ''} text-light-text dark:text-dark-text`}>
                                            <td className="px-3 py-3 whitespace-nowrap">{new Date(sale.saleDate).toLocaleDateString()}</td>
                                            <td className="px-3 py-3 whitespace-nowrap"><button onClick={() => handleViewStudent(sale.student)} className="text-primary hover:underline font-medium disabled:text-light-subtle dark:text-dark-subtle disabled:no-underline" disabled={!sale.student}>{sale.student ? `${sale.student.firstName} ${sale.student.lastName}` : 'N/A'}</button></td>
                                            <td className="px-3 py-3"><p className="font-medium">{sale.itemName}</p><p className="text-xs capitalize text-light-subtle dark:text-dark-subtle">{sale.itemType.replace(/_/g, ' ')}</p></td>
                                            <td className={`px-3 py-3 whitespace-nowrap text-right font-semibold ${sale.status === 'refunded' && 'line-through text-light-subtle dark:text-dark-subtle'}`}>{currencyFormatter.format(originalItemPrice)}</td>
                                            <td className="px-3 py-3 whitespace-nowrap text-center">
                                                {sale.shippingAddress ? (<button onClick={() => setViewingAddress(sale)} className="text-primary hover:underline text-xs font-semibold">View Address</button>) : (<span className="text-light-subtle dark:text-dark-subtle text-xs">-</span>)}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap text-center">
                                                {hasPhysical ? (
                                                    <select
                                                        value={sale.physicalOrderStatus || 'pending'}
                                                        onChange={(e) => onUpdatePhysicalOrderStatus(sale.id, e.target.value as Sale['physicalOrderStatus'])}
                                                        className="w-full p-1 text-xs border rounded-md bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border focus:ring-primary focus:border-primary"
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="processing">Processing</option>
                                                        <option value="shipped">Shipped</option>
                                                        <option value="delivered">Delivered</option>
                                                    </select>
                                                ) : (
                                                    <span className="text-light-subtle dark:text-dark-subtle text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap text-center"><SaleStatusBadge status={sale.status} /></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">No sales transactions found for the current filters.</p>
                )}
            </div>

            {selectedStudent && <StudentDetailsModal isOpen={isStudentModalOpen} onClose={handleCloseStudentModal} student={selectedStudent} />}
            <BankDetailsModal isOpen={isBankModalOpen} onClose={handleCloseBankModal} onSave={handleSaveAndCloseBankDetails} initialData={teacher.payoutDetails} />
            <ConfirmationModal isOpen={isWithdrawModalOpen} onClose={handleCloseWithdrawModal} onConfirm={handleConfirmWithdraw} title="Request Withdrawal" message={`Enter amount to withdraw (Available: ${currencyFormatter.format(teacher.earnings.available)})`} confirmText="Yes, Withdraw">
                <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} max={teacher.earnings.available} className="w-full mt-4 p-2 border rounded-md text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border" placeholder="Amount" />
            </ConfirmationModal>
            <VerificationUploadModal isOpen={isVerificationModalOpen} onClose={handleCloseVerificationModal} onSave={handleVerificationSave} verificationType={verificationType} />
            <RejectionReasonModal isOpen={isRejectionModalOpen} onClose={handleCloseRejectionModal} onSubmit={handleRejectionSubmit} />
            {selectedWithdrawal && <WithdrawalInvoiceModal isOpen={!!selectedWithdrawal} onClose={handleCloseWithdrawalInvoiceModal} teacher={teacher} withdrawal={selectedWithdrawal} />}
            {
                imageToView && (
                    <ImageViewerModal
                        isOpen={!!imageToView}
                        onClose={handleCloseImageViewer}
                        imageUrl={imageToView.url}
                        title={imageToView.title}
                    />
                )
            }
            {
                viewingAddress && viewingAddress.shippingAddress && (
                    <Modal isOpen={!!viewingAddress} onClose={handleCloseShippingModal} title="Shipping Details">
                        <div className="space-y-4 text-sm text-light-text dark:text-dark-text">
                            <div>
                                <p className="font-semibold">Recipient:</p>
                                <p>{viewingAddress.student?.firstName} {viewingAddress.student?.lastName}</p>
                                <p>{viewingAddress.student?.contactNumber}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Address:</p>
                                <address className="not-italic">
                                    {viewingAddress.shippingAddress.line1}<br />
                                    {viewingAddress.shippingAddress.line2 && <>{viewingAddress.shippingAddress.line2}<br /></>}
                                    {viewingAddress.shippingAddress.city}, {viewingAddress.shippingAddress.state} {viewingAddress.shippingAddress.postalCode}<br />
                                    {viewingAddress.shippingAddress.country}
                                </address>
                            </div>
                        </div>
                    </Modal>
                )
            }

            <Modal isOpen={isServiceModalOpen} onClose={handleCloseServiceModal} title={serviceToPay ? "Confirm Purchase" : "Custom Payment"}>
                <div className="space-y-4">
                    {!serviceToPay && (
                        <>
                            <FormInput label="Service Title / Purpose" name="title" value={customServiceDetails.title} onChange={(e) => setCustomServiceDetails(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Featured Listing Aug 2024" />
                            <FormInput label="Amount (LKR)" name="cost" type="number" value={customServiceDetails.cost} onChange={(e) => setCustomServiceDetails(prev => ({ ...prev, cost: e.target.value }))} />
                        </>
                    )}
                    {serviceToPay && (
                        <div>
                            <p className="text-sm text-light-subtle dark:text-dark-subtle">You are about to purchase:</p>
                            <p className="text-lg font-bold">{serviceToPay.title}</p>
                            <p className="text-xl font-bold text-primary mt-2">{currencyFormatter.format(serviceToPay.cost)}</p>
                        </div>
                    )}

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md text-sm text-yellow-800 dark:text-yellow-200">
                        <p>Note: Your wallet balance will be used first. Any remaining amount will be payable via card.</p>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={handleCloseServiceModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">Cancel</button>
                        <button
                            onClick={handleConfirmServicePayment}
                            disabled={!serviceToPay && (!customServiceDetails.title || !customServiceDetails.cost || parseFloat(customServiceDetails.cost) <= 0)}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {serviceToPay ? 'Confirm & Pay' : 'Pay Now'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showPaymentSelector} onClose={() => setShowPaymentSelector(false)} title="Select Payment Method">
                <PaymentMethodSelector onSelect={handlePaymentMethodSelected} />
            </Modal>
        </div >
    );
};

export default EarningsDashboard;
