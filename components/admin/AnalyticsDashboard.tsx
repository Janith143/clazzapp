import React, { useMemo } from 'react';
import { Teacher, User, Sale } from '../../types.ts';
import { BanknotesIcon, UsersIcon, UserGroupIcon, ChartBarIcon } from '../Icons.tsx';

interface AnalyticsDashboardProps {
  teachers: Teacher[];
  users: User[];
  sales: Sale[];
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

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ teachers, users, sales }) => {

    const stats = useMemo(() => {
        const totalRevenue = sales
            .filter(sale => sale.status === 'completed')
            .reduce((acc, sale) => acc + (sale.totalAmount + sale.amountPaidFromBalance), 0);
        const totalUsers = users.length;
        const totalTeachers = teachers.length;
        const totalSales = sales.length;
        return { totalRevenue, totalUsers, totalTeachers, totalSales };
    }, [teachers, users, sales]);

    const currencyFormatter = new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Analytics Overview</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Revenue" 
                    value={currencyFormatter.format(stats.totalRevenue)} 
                    icon={<BanknotesIcon className="w-7 h-7" />}
                />
                <StatCard 
                    title="Total Users" 
                    value={stats.totalUsers}
                    icon={<UsersIcon className="w-7 h-7" />}
                />
                <StatCard 
                    title="Total Teachers" 
                    value={stats.totalTeachers}
                    icon={<UserGroupIcon className="w-7 h-7" />}
                />
                 <StatCard 
                    title="Total Sales" 
                    value={stats.totalSales}
                    icon={<ChartBarIcon className="w-7 h-7" />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">User Growth</h2>
                    <div className="mt-6 h-64 bg-light-border dark:bg-dark-border rounded-md flex items-center justify-center">
                        <p className="text-light-subtle dark:text-dark-subtle">User Growth Chart (Mock)</p>
                    </div>
                </div>
                 <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">Monthly Revenue</h2>
                    <div className="mt-6 h-64 bg-light-border dark:bg-dark-border rounded-md flex items-center justify-center">
                        <p className="text-light-subtle dark:text-dark-subtle">Revenue Chart (Mock)</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;