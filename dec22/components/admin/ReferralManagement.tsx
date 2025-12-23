import React, { useMemo, useState } from 'react';
import { User, Teacher, Sale } from '../../types.ts';
import { UserGroupIcon, ShareIcon, BanknotesIcon } from '../Icons.tsx';
import StudentDetailsModal from '../StudentDetailsModal.tsx';

interface ReferralManagementProps {
  users: User[];
  teachers: Teacher[];
  sales: Sale[];
  onViewTeacher: (teacherId: string) => void;
}

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


const ReferralManagement: React.FC<ReferralManagementProps> = ({ users, teachers, sales, onViewTeacher }) => {
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 });

    const handleViewUser = (user: User) => {
        if (user.role === 'teacher') {
            onViewTeacher(user.id);
        } else {
            setSelectedStudent(user);
        }
    };

    const referralData = useMemo(() => {
        const PAYMENT_GATEWAY_FEE_RATE = 0.04;
        const PLATFORM_COSTS_RATE = 0.04;
        const MAX_EARNING_PER_REFERRAL = 100000;

        const referrers = users.filter(u => users.some(referred => referred.referrerId === u.id));
        const totalReferredUsers = users.filter(u => u.referrerId).length;

        const referrerDetails = referrers.map(referrer => {
            const referredUsers = users.filter(u => u.referrerId === referrer.id);
            const referredStudentsCount = referredUsers.filter(u => u.role === 'student').length;
            const referredTeacherUsers = referredUsers.filter(u => u.role === 'teacher');
            const referredTeacherUserIds = new Set(referredTeacherUsers.map(u => u.id));
            const approvedReferredTeachers = teachers.filter(t => t.registrationStatus === 'approved' && referredTeacherUserIds.has(t.userId));

            let totalNetPlatformIncomeFromReferrals = 0;
            let totalEarningsForReferrer = 0;
            
            // Chronological calculation for accuracy
            const lifetimeEarningsByTeacher = new Map<string, number>();

            const allSalesFromReferredTeachers = sales
                .filter(s => approvedReferredTeachers.some(t => t.id === s.teacherId) && s.status === 'completed')
                .sort((a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime());
            
            allSalesFromReferredTeachers.forEach(sale => {
                const teacher = teachers.find(t => t.id === sale.teacherId);
                if (!teacher) return;

                const saleValue = sale.totalAmount + sale.amountPaidFromBalance;
                const grossPlatformIncome = saleValue * (teacher.commissionRate / 100);
                const paymentGatewayCost = saleValue * PAYMENT_GATEWAY_FEE_RATE;
                const platformRunningCost = saleValue * PLATFORM_COSTS_RATE;
                const netPlatformIncome = grossPlatformIncome - paymentGatewayCost - platformRunningCost;

                if (netPlatformIncome <= 0) return;

                totalNetPlatformIncomeFromReferrals += netPlatformIncome;

                const currentLifetimeEarnings = lifetimeEarningsByTeacher.get(teacher.id) || 0;
                if (currentLifetimeEarnings >= MAX_EARNING_PER_REFERRAL) return;
                
                // Use a base 4% for lifetime calculation, as tiers are monthly.
                const potentialEarningFromSale = netPlatformIncome * 0.04;
                const remainingEarningCapacity = MAX_EARNING_PER_REFERRAL - currentLifetimeEarnings;
                const commissionableEarning = Math.min(potentialEarningFromSale, remainingEarningCapacity);

                lifetimeEarningsByTeacher.set(teacher.id, currentLifetimeEarnings + commissionableEarning);
            });

            totalEarningsForReferrer = Array.from(lifetimeEarningsByTeacher.values()).reduce((sum, earnings) => sum + earnings, 0);

            return {
                ...referrer,
                referredStudentsCount,
                referredTeachersCount: approvedReferredTeachers.length,
                totalNetPlatformIncomeFromReferrals: totalNetPlatformIncomeFromReferrals,
                totalEarningsForReferrer
            };
        });

        return {
            totalReferrers: referrers.length,
            totalReferredUsers,
            referrerDetails: referrerDetails.sort((a,b) => b.totalEarningsForReferrer - a.totalEarningsForReferrer),
        };
    }, [users, teachers, sales]);

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Referral System Overview</h1>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Referrers" value={referralData.totalReferrers} icon={<ShareIcon className="w-7 h-7" />} />
                <StatCard title="Total Referred Users" value={referralData.totalReferredUsers} icon={<UserGroupIcon className="w-7 h-7" />} />
                <StatCard title="Total Est. Payouts" value={currencyFormatter.format(referralData.referrerDetails.reduce((acc, r) => acc + r.totalEarningsForReferrer, 0))} icon={<BanknotesIcon className="w-7 h-7" />} />
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Referrer Leaderboard</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                        <thead className="bg-light-background dark:bg-dark-background">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-light-subtle dark:text-dark-subtle">Referrer</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-light-subtle dark:text-dark-subtle">Code</th>
                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-light-subtle dark:text-dark-subtle">Ref. Students</th>
                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-light-subtle dark:text-dark-subtle">Ref. Teachers</th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-light-subtle dark:text-dark-subtle">Net Platform Income</th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-light-subtle dark:text-dark-subtle">Total Earnings</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-light-border dark:divide-dark-border">
                            {referralData.referrerDetails.map(referrer => (
                                <tr key={referrer.id}>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <button onClick={() => handleViewUser(referrer)} className="flex items-center group">
                                            {referrer.avatar ? (
                                                <img src={referrer.avatar} alt={`${referrer.firstName} ${referrer.lastName}`} className="w-8 h-8 rounded-full mr-3" crossOrigin="anonymous" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white text-sm font-bold mr-3">
                                                    <span>
                                                        {referrer.firstName?.charAt(0) || ''}
                                                        {referrer.lastName?.charAt(0) || ''}
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-semibold text-light-text dark:text-dark-text group-hover:underline">{referrer.firstName} {referrer.lastName}</p>
                                                <p className="text-xs text-left text-light-subtle dark:text-dark-subtle">{referrer.id}</p>
                                            </div>
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap font-mono text-light-text dark:text-dark-text">{referrer.referralCode}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center font-medium text-light-text dark:text-dark-text">{referrer.referredStudentsCount}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center font-medium text-light-text dark:text-dark-text">{referrer.referredTeachersCount}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-light-text dark:text-dark-text">{currencyFormatter.format(referrer.totalNetPlatformIncomeFromReferrals)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-green-600 dark:text-green-400">{currencyFormatter.format(referrer.totalEarningsForReferrer)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
             {selectedStudent && <StudentDetailsModal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} student={selectedStudent} />}
        </div>
    );
};

export default ReferralManagement;