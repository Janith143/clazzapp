import React, { useMemo } from 'react';
import { ChartBarIcon, UsersIcon, BookOpenIcon, BanknotesIcon, TicketIcon, ShareIcon, CurrencyDollarIcon, DocumentTextIcon, CalculatorIcon, PrinterIcon, CreditCardIcon, ShieldCheckIcon, CodeBracketIcon, MailIcon, BuildingOffice2Icon } from '../Icons.tsx';
import { AdminView } from '../../types.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useData } from '../../contexts/DataContext.tsx';

const ShoppingBagIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.658-.463 1.243-1.119 1.243H4.51c-.656 0-1.19-.585-1.119-1.243L4.644 8.507A3.75 3.75 0 018.25 4.5h7.5a3.75 3.75 0 013.606 3.993z" />
  </svg>
);


interface AdminSidebarProps {
  activeView: AdminView;
  setActiveView: (view: AdminView) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeView, setActiveView }) => {
  const { currentUser } = useAuth();
  const { teachers, tuitionInstitutes, users, topUpRequests, sales } = useData();

  const [requestCounts, setRequestCounts] = React.useState({ deletion: 0, reports: 0, unsubscribe: 0 });
  const [lastViewedCounts, setLastViewedCounts] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    const unsubDeletion = onSnapshot(query(collection(db, 'deletion_requests'), where('status', '==', 'pending')), (snap) => {
      setRequestCounts(prev => ({ ...prev, deletion: snap.size }));
    });
    const unsubReports = onSnapshot(query(collection(db, 'content_reports'), where('status', '==', 'pending')), (snap) => {
      setRequestCounts(prev => ({ ...prev, reports: snap.size }));
    });
    const unsubUnsubscribe = onSnapshot(query(collection(db, 'unsubscribe_requests'), where('status', '==', 'pending')), (snap) => {
      setRequestCounts(prev => ({ ...prev, unsubscribe: snap.size }));
    });

    return () => { unsubDeletion(); unsubReports(); unsubUnsubscribe(); };
  }, []);

  const pendingCount = useMemo(() => {
    if (!teachers) return 0;
    return teachers.reduce((acc, teacher) => {
      const teacherPending = (teacher.courses || []).filter(c => c.adminApproval === 'pending').length;
      return acc + teacherPending;
    }, 0);
  }, [teachers]);

  const revenuePendingCount = useMemo(() => {
    let count = 0;
    // Pending Top-Up Requests
    if (topUpRequests) count += topUpRequests.filter(r => r.status === 'pending').length;

    // Pending Withdrawals (Teachers)
    if (teachers) {
      count += teachers.reduce((acc, t) => acc + (t.withdrawalHistory || []).filter(w => w.status === 'pending').length, 0);
    }

    // Pending Withdrawals (Institutes)
    if (tuitionInstitutes) {
      count += tuitionInstitutes.reduce((acc, i) => acc + (i.withdrawalHistory || []).filter(w => w.status === 'pending').length, 0);
    }

    // Pending Withdrawals (Users/Affiliates)
    if (users) {
      count += users.reduce((acc, u) => acc + (u.withdrawalHistory || []).filter(w => w.status === 'pending').length, 0);
    }

    return count;
  }, [teachers, tuitionInstitutes, users, topUpRequests]);

  const counts = useMemo(() => {
    if (!teachers || !sales || !tuitionInstitutes) return {};

    const userPending = teachers.filter(t =>
      (t.registrationStatus === 'pending') ||
      (t.verification?.id?.status === 'pending') ||
      (t.verification?.bank?.status === 'pending')
    ).length;

    const productPending = teachers.reduce((acc, t) => acc + (t.products || []).filter(p => p.adminApproval === 'pending').length, 0);

    // Sales are automated or handled via revenue (TopUps). Generic sales don't have 'pending' status.
    const salesPending = 0;

    const photoOrdersPending = sales.filter(s => s.photoOrderStatus === 'pending').length;

    const physicalOrdersPending = sales.filter(s => s.physicalOrderStatus === 'pending').length;

    const institutePending = tuitionInstitutes.filter(i => (i as any).registrationStatus === 'pending').length;

    const totalRequests = requestCounts.deletion + requestCounts.reports + requestCounts.unsubscribe;

    return {
      users: userPending,
      products: productPending,
      allsales: salesPending,
      photo_orders: photoOrdersPending,
      physical_orders: physicalOrdersPending,
      institutes: institutePending,
      requests: totalRequests
    };
  }, [teachers, sales, tuitionInstitutes, requestCounts]);

  // Update viewed counts when active view changes or counts change while active
  React.useEffect(() => {
    // Only apply to the requested tabs to 'clear' the badge
    if (['users', 'institutes'].includes(activeView)) {
      const currentCount = (counts as any)[activeView] || 0;
      // Verify if update needed to avoid loop? React handles primitive value checks in setState usually, but object ref might differ.
      // Actually setLastViewedCounts uses callback.
      setLastViewedCounts(prev => {
        if (prev[activeView] === currentCount) return prev;
        return { ...prev, [activeView]: currentCount };
      });
    }
  }, [activeView, counts]);

  const navItems = useMemo(() => {
    const allItems: { id: AdminView; label: string; icon: React.ReactNode }[] = [
      { id: 'analytics', label: 'Analytics', icon: <ChartBarIcon className="w-5 h-5 mr-3" /> },
      { id: 'users', label: 'User Management', icon: <UsersIcon className="w-5 h-5 mr-3" /> },
      { id: 'staff', label: 'Team & Permissions', icon: <ShieldCheckIcon className="w-5 h-5 mr-3" /> },
      { id: 'content', label: 'Content & Approvals', icon: <BookOpenIcon className="w-5 h-5 mr-3" /> },
      { id: 'products', label: 'Products', icon: <ShoppingBagIcon className="w-5 h-5 mr-3" /> },
      { id: 'allsales', label: 'All Sales', icon: <BanknotesIcon className="w-5 h-5 mr-3" /> },
      { id: 'photo_orders', label: 'Photo Orders', icon: <PrinterIcon className="w-5 h-5 mr-3" /> },
      { id: 'physical_orders', label: 'Physical Orders', icon: <ShoppingBagIcon className="w-5 h-5 mr-3" /> },
      { id: 'revenue', label: 'Revenue & Payouts', icon: <CurrencyDollarIcon className="w-5 h-5 mr-3" /> },
      { id: 'vouchers', label: 'Voucher Management', icon: <TicketIcon className="w-5 h-5 mr-3" /> },
      { id: 'referrals', label: 'Referral System', icon: <ShareIcon className="w-5 h-5 mr-3" /> },
      { id: 'payment_gateways', label: 'Payment Gateways', icon: <CreditCardIcon className="w-5 h-5 mr-3" /> },
      { id: 'site_content', label: 'Site Content', icon: <DocumentTextIcon className="w-5 h-5 mr-3" /> },
      { id: 'institutes', label: 'Institutes', icon: <BuildingOffice2Icon className="w-5 h-5 mr-3" /> },
      { id: 'calculation_guide', label: 'Calculation Guide', icon: <CalculatorIcon className="w-5 h-5 mr-3" /> },
      { id: 'requests', label: 'Requests', icon: <MailIcon className="w-5 h-5 mr-3" /> },
      { id: 'communications', label: 'Communications', icon: <ShareIcon className="w-5 h-5 mr-3" /> },
      { id: 'developer', label: 'Developer', icon: <CodeBracketIcon className="w-5 h-5 mr-3" /> },
    ];

    if (!currentUser?.permissions || currentUser.permissions.includes('all')) {
      // Super Admin sees everything
      return allItems;
    }

    // Filter based on permissions for sub-admins
    // Note: 'staff' permission is typically reserved for super admins, but included in logic if needed.
    return allItems.filter(item => currentUser.permissions!.includes(item.id));
  }, [currentUser]);

  return (
    <aside className="w-full md:w-64 flex-shrink-0 bg-light-surface dark:bg-dark-surface p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-bold mb-4 px-2">Admin Menu</h2>
      <nav className="flex flex-col gap-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeView === item.id
              ? 'bg-primary text-white'
              : 'text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border'
              }`}
          >
            <div className="flex items-center">
              {item.icon}
              {item.label}
            </div>
            {item.id === 'content' && pendingCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                {pendingCount}
              </span>
            )}
            {item.id === 'revenue' && revenuePendingCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                {revenuePendingCount}
              </span>
            )}
            {/* Generic Badges from 'counts' map */}
            {['users', 'products', 'allsales', 'photo_orders', 'physical_orders', 'institutes', 'requests'].includes(item.id) && (() => {
              const count = (counts as any)[item.id] || 0;
              if (count === 0) return null;

              // Logic for hiding badge after view for specific tabs
              if (['users', 'institutes'].includes(item.id)) {
                const viewed = lastViewedCounts[item.id] || 0;
                if (count <= viewed) return null;
              }

              return (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                  {count}
                </span>
              );
            })()}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;