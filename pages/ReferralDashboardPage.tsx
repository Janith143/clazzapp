import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useData } from '../contexts/DataContext.tsx';
import { useUI } from '../contexts/UIContext.tsx';
import { useNavigation } from '../contexts/NavigationContext.tsx';
import { User, Withdrawal } from '../types.ts';
import { ChevronLeftIcon, UserGroupIcon, ShareIcon, BanknotesIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from '../components/Icons.tsx';
import ProgressBar from '../components/ProgressBar.tsx';
import ConfirmationModal from '../components/ConfirmationModal.tsx';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-light-surface dark:bg-dark-surface p-5 rounded-lg shadow-md border border-light-border dark:border-dark-border">
        <div className="flex items-center">
            <div className="p-3 bg-primary/10 text-primary rounded-lg mr-4">{icon}</div>
            <div>
                <p className="text-sm font-medium text-light-subtle dark:text-dark-subtle">{title}</p>
                <p className="text-3xl font-bold text-light-text dark:text-dark-text">{value}</p>
            </div>
        </div>
    </div>
);

const ReferralDashboardPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { users, teachers, sales, handleRequestAffiliateWithdrawal, processMonthlyPayouts } = useData();
    const { addToast } = useUI();
    const { handleNavigate, financialSettings } = useNavigation();

    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isCheckingPayouts, setIsCheckingPayouts] = useState(true);

    const referralLink = currentUser ? `${window.location.origin}/?ref=${currentUser.referralCode}` : '';
    const teacherReferralLink = currentUser ? `${window.location.origin}/?teacherRef=${currentUser.referralCode}` : '';

    useEffect(() => {
        const checkPayouts = async () => {
            if (currentUser?.id) {
                setIsCheckingPayouts(true);
                if (currentUser.role === 'teacher' || currentUser.role === 'student' || currentUser.role === 'tuition_institute') {
                    const userTypeForPayout = currentUser.role === 'tuition_institute' ? 'institute' : currentUser.role;
                    await processMonthlyPayouts(userTypeForPayout as any, currentUser.id);
                }
                setIsCheckingPayouts(false);
            }
        };
        checkPayouts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.id, currentUser?.role]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
            .then(() => addToast('Copied to clipboard!', 'success'))
            .catch(() => addToast('Failed to copy.', 'error'));
    };

    const referralBalance = currentUser?.referralBalance || { total: 0, withdrawn: 0, available: 0 };


    const referralStats = useMemo(() => {
        if (!currentUser) return null;

        const referredUsers = users.filter(u => u.referrerId === currentUser.id);
        const referredStudents = referredUsers.filter(u => u.role === 'student');
        const referredTeacherUsers = referredUsers.filter(u => u.role === 'teacher');

        const referredTeacherUserIds = new Set(referredTeacherUsers.map(u => u.id));
        const referredTeachers = teachers.filter(t => t.registrationStatus === 'approved' && referredTeacherUserIds.has(t.userId));

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const allSalesFromReferredTeachersThisMonth = sales
            .filter(s => referredTeachers.some(t => t.id === s.teacherId) && s.status === 'completed' && new Date(s.saleDate) >= startOfMonth);

        const monthlyNetPlatformIncome = allSalesFromReferredTeachersThisMonth.reduce((acc, sale) => {
            const teacher = teachers.find(t => t.id === sale.teacherId);
            if (!teacher) return acc;

            const currentLifetimeEarnings = (currentUser.monthlyReferralEarnings || [])
                .filter(e => e.status === 'processed')
                .reduce((sum, e) => sum + e.earnings, 0);

            if (currentLifetimeEarnings >= financialSettings.referralMaxEarning) {
                return acc;
            }

            const saleValue = sale.totalAmount + sale.amountPaidFromBalance;
            const grossPlatformIncome = saleValue * (teacher.commissionRate / 100);
            const paymentGatewayCost = saleValue * financialSettings.referralGatewayFeeRate;
            const platformRunningCost = saleValue * financialSettings.referralPlatformCostRate;
            const netPlatformIncome = grossPlatformIncome - paymentGatewayCost - platformRunningCost;

            return acc + (netPlatformIncome > 0 ? netPlatformIncome : 0);
        }, 0);

        let currentTier = 1;
        let monthlyCommissionRate = financialSettings.referralBaseRate;
        if (monthlyNetPlatformIncome >= financialSettings.referralTier3Threshold) { currentTier = 4; monthlyCommissionRate = financialSettings.referralTier3Rate; }
        else if (monthlyNetPlatformIncome >= financialSettings.referralTier2Threshold) { currentTier = 3; monthlyCommissionRate = financialSettings.referralTier2Rate; }
        else if (monthlyNetPlatformIncome >= financialSettings.referralTier1Threshold) { currentTier = 2; monthlyCommissionRate = financialSettings.referralTier1Rate; }

        const estimatedMonthlyEarnings = monthlyNetPlatformIncome * monthlyCommissionRate;

        const earningsPerTeacher = referredTeachers.map(teacher => {
            const totalNetPlatformIncome = sales
                .filter(s => s.teacherId === teacher.id && s.status === 'completed')
                .reduce((acc, sale) => {
                    const saleValue = sale.totalAmount + sale.amountPaidFromBalance;
                    const grossPlatformIncome = saleValue * (teacher.commissionRate / 100);
                    const netPlatformIncome = grossPlatformIncome - (saleValue * (financialSettings.referralGatewayFeeRate + financialSettings.referralPlatformCostRate));
                    return acc + (netPlatformIncome > 0 ? netPlatformIncome : 0);
                }, 0);

            const totalEarningsFromTeacher = (currentUser.monthlyReferralEarnings || [])
                .reduce((sum, e) => sum + e.earnings, 0); // This is a simplification; for real accuracy, we'd need to track earnings per teacher.

            return {
                teacher,
                totalNetPlatformIncome,
                totalEarningsFromTeacher // This is now a simplified total, not per-teacher
            };
        });

        return { referredStudents, referredTeachers, monthlyNetPlatformIncome, estimatedMonthlyEarnings, earningsPerTeacher };
    }, [currentUser, users, teachers, sales, financialSettings]);


    if (!currentUser) {
        return <div className="text-center p-8">Please log in to view your referral dashboard.</div>;
    }

    const handleConfirmWithdraw = () => {
        const amount = parseFloat(withdrawAmount);
        if (amount > 0 && referralBalance.available >= amount) {
            handleRequestAffiliateWithdrawal(amount);
        }
        setIsWithdrawModalOpen(false);
        setWithdrawAmount('');
    };

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 });

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const sortedWithdrawals = useMemo(() => {
        return [...(currentUser.withdrawalHistory || [])].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    }, [currentUser.withdrawalHistory]);

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
        return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{icons[status]}{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
    };


    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slideInUp">
            <div className="mb-8"><button onClick={() => handleNavigate({ name: 'home' })} className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-dark"><ChevronLeftIcon className="h-5 w-5" /><span>Back to Home</span></button></div>

            <div className="bg-light-surface dark:bg-dark-surface p-8 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold text-center">Your Referral Program</h1>
                <p className="mt-2 text-light-subtle dark:text-dark-subtle text-center">Share your links and earn commissions!</p>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h2 className="text-xl font-bold">Invite a Student</h2>
                        <p className="mt-1 text-sm text-light-subtle dark:text-dark-subtle">
                            Share this link with students. You'll earn from their top-ups. (Feature coming soon)
                        </p>
                        <div className="mt-4">
                            <label className="font-semibold text-sm">Your Student Referral Link</label>
                            <div className="mt-1 flex items-center gap-2">
                                <input type="text" readOnly value={referralLink} className="w-full text-sm p-2 border rounded-md bg-light-background dark:bg-dark-background text-light-subtle dark:text-dark-subtle" />
                                <button onClick={() => handleCopy(referralLink)} className="p-2 bg-primary text-white rounded-md hover:bg-primary-dark"><ShareIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold">Invite a Teacher</h2>
                        <p className="mt-1 text-sm text-light-subtle dark:text-dark-subtle">
                            Share this link with educators. You'll earn commissions based on the platform income they generate.
                        </p>
                        <div className="mt-4">
                            <label className="font-semibold text-sm">Your Teacher Referral Link</label>
                            <div className="mt-1 flex items-center gap-2">
                                <input type="text" readOnly value={teacherReferralLink} className="w-full text-sm p-2 border rounded-md bg-light-background dark:bg-dark-background text-light-subtle dark:text-dark-subtle" />
                                <button onClick={() => handleCopy(teacherReferralLink)} className="p-2 bg-primary text-white rounded-md hover:bg-primary-dark"><ShareIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                <StatCard title="Referred Students" value={referralStats?.referredStudents.length || 0} icon={<UserGroupIcon className="w-7 h-7" />} />
                <StatCard title="Referred Teachers" value={referralStats?.referredTeachers.length || 0} icon={<UserGroupIcon className="w-7 h-7" />} />
                <StatCard title="Total Referral Earnings" value={currencyFormatter.format(referralBalance.total)} icon={<BanknotesIcon className="w-7 h-7" />} />
                <StatCard title="Available for Withdrawal" value={currencyFormatter.format(referralBalance.available)} icon={<CheckCircleIcon className="w-7 h-7" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Monthly Earnings Table */}
                    <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">Monthly Earnings History</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                                <thead className="bg-light-background dark:bg-dark-background"><tr><th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-light-subtle dark:text-dark-subtle">Month</th><th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-light-subtle dark:text-dark-subtle">Net Income Generated</th><th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-light-subtle dark:text-dark-subtle">Your Earnings</th><th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-light-subtle dark:text-dark-subtle">Status</th></tr></thead>
                                <tbody className="divide-y divide-light-border dark:divide-dark-border">
                                    {(currentUser.monthlyReferralEarnings || []).map(e => (
                                        <tr key={`${e.year}-${e.month}`}>
                                            <td className="px-3 py-3 whitespace-nowrap font-semibold text-light-text dark:text-dark-text">{monthNames[e.month]} {e.year}</td>
                                            <td className="px-3 py-3 whitespace-nowrap text-right text-light-text dark:text-dark-text">{currencyFormatter.format(e.netPlatformIncome)}</td>
                                            <td className="px-3 py-3 whitespace-nowrap text-right font-bold text-green-600 dark:text-green-400">{currencyFormatter.format(e.earnings)}</td>
                                            <td className="px-3 py-3 whitespace-nowrap text-center capitalize text-light-text dark:text-dark-text">{e.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* Withdrawal History */}
                    <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">Withdrawal History</h2>
                        {sortedWithdrawals.length > 0 ? (
                            <div className="overflow-x-auto max-h-60"><table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm"><thead className="bg-light-background dark:bg-dark-background sticky top-0"><tr><th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-light-subtle dark:text-dark-subtle">Requested</th><th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-light-subtle dark:text-dark-subtle">Amount</th><th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-light-subtle dark:text-dark-subtle">Status</th></tr></thead><tbody className="divide-y divide-light-border dark:divide-dark-border">{sortedWithdrawals.map(w => (<tr key={w.id}><td className="px-3 py-3 whitespace-nowrap">{new Date(w.requestedAt).toLocaleDateString()}</td><td className="px-3 py-3 whitespace-nowrap text-right font-semibold">{currencyFormatter.format(w.amount)}</td><td className="px-3 py-3 whitespace-nowrap text-center"><WithdrawalStatusBadge status={w.status} /></td></tr>))}</tbody></table></div>
                        ) : <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">No withdrawal requests yet.</p>}
                    </div>
                </div>

                {/* Withdraw Funds Card */}
                <div className="lg:col-span-1">
                    <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md sticky top-24">
                        <h2 className="text-xl font-bold mb-4">Withdraw Referral Earnings</h2>
                        <div className="text-center bg-light-background dark:bg-dark-background p-4 rounded-lg">
                            <p className="text-sm text-light-subtle dark:text-dark-subtle">Available to Withdraw</p>
                            <p className="text-4xl font-bold text-primary">{currencyFormatter.format(referralBalance.available)}</p>
                        </div>
                        <button onClick={() => setIsWithdrawModalOpen(true)} disabled={referralBalance.available < 10000 || isCheckingPayouts} className="mt-4 w-full bg-primary text-white font-bold py-3 rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                            {isCheckingPayouts ? 'Processing Payouts...' : 'Request Withdrawal'}
                        </button>
                        {referralBalance.available < 10000 && <p className="text-center text-xs text-light-subtle dark:text-dark-subtle mt-2">A minimum balance of {currencyFormatter.format(10000)} is required to withdraw.</p>}
                    </div>
                </div>
            </div>

            <div className="mt-8 text-left text-xs text-light-subtle dark:text-dark-subtle bg-light-background dark:bg-dark-background p-4 rounded-lg border border-light-border dark:border-dark-border">
                <h4 className="font-bold text-sm text-light-text dark:text-dark-text mb-2">Program Rules & Conditions</h4>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Earn commissions based on the Net Platform Income generated by your referred teachers.</li>
                    <li>Commissions are tiered: Tier 1 (&lt; 100k LKR) earns 4%, Tier 2 (&lt; 300k) earns 5%, Tier 3 (&lt; 1M) earns 6%, Tier 4 (&ge; 1M) earns 7%. Tiers are calculated based on the total NPI generated by all your referred teachers within a calendar month.</li>
                    <li>Your total lifetime earnings from each individually referred teacher are capped at 100,000 LKR.</li>
                    <li>Monthly earnings are automatically processed and moved to your "Available for Withdrawal" balance on the 16th of the following month.</li>
                    <li>Withdrawals require a minimum available balance of 10,000 LKR.</li>
                </ol>
            </div>

            <ConfirmationModal isOpen={isWithdrawModalOpen} onClose={() => setIsWithdrawModalOpen(false)} onConfirm={handleConfirmWithdraw} title="Request Withdrawal" message={`Enter amount to withdraw from your available balance of ${currencyFormatter.format(referralBalance.available)}.`} confirmText="Submit Request">
                <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} max={referralBalance.available} className="w-full mt-4 p-2 border rounded-md text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border" placeholder="Amount (e.g., 10000)" />
            </ConfirmationModal>
        </div>
    );
};

export default ReferralDashboardPage;