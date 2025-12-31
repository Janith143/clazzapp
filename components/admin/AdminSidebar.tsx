import React, { useMemo } from 'react';
import { ChartBarIcon, UsersIcon, BookOpenIcon, BanknotesIcon, TicketIcon, ShareIcon, CurrencyDollarIcon, DocumentTextIcon, CalculatorIcon, PrinterIcon, CreditCardIcon, ShieldCheckIcon, CodeBracketIcon, MailIcon } from '../Icons.tsx';
import { AdminView } from '../../types.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';

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

  const navItems = useMemo(() => {
    const allItems: { id: AdminView; label: string; icon: React.ReactNode }[] = [
      { id: 'analytics', label: 'Analytics', icon: <ChartBarIcon className="w-5 h-5 mr-3" /> },
      { id: 'users', label: 'User Management', icon: <UsersIcon className="w-5 h-5 mr-3" /> },
      { id: 'staff', label: 'Team & Permissions', icon: <ShieldCheckIcon className="w-5 h-5 mr-3" /> },
      { id: 'content', label: 'Content (Legacy)', icon: <BookOpenIcon className="w-5 h-5 mr-3" /> },
      { id: 'products', label: 'Products', icon: <ShoppingBagIcon className="w-5 h-5 mr-3" /> },
      { id: 'allsales', label: 'All Sales', icon: <BanknotesIcon className="w-5 h-5 mr-3" /> },
      { id: 'photo_orders', label: 'Photo Orders', icon: <PrinterIcon className="w-5 h-5 mr-3" /> },
      { id: 'physical_orders', label: 'Physical Orders', icon: <ShoppingBagIcon className="w-5 h-5 mr-3" /> },
      { id: 'revenue', label: 'Revenue & Payouts', icon: <CurrencyDollarIcon className="w-5 h-5 mr-3" /> },
      { id: 'vouchers', label: 'Voucher Management', icon: <TicketIcon className="w-5 h-5 mr-3" /> },
      { id: 'referrals', label: 'Referral System', icon: <ShareIcon className="w-5 h-5 mr-3" /> },
      { id: 'payment_gateways', label: 'Payment Gateways', icon: <CreditCardIcon className="w-5 h-5 mr-3" /> },
      { id: 'site_content', label: 'Site Content', icon: <DocumentTextIcon className="w-5 h-5 mr-3" /> },
      { id: 'calculation_guide', label: 'Calculation Guide', icon: <CalculatorIcon className="w-5 h-5 mr-3" /> },
      { id: 'requests', label: 'Requests', icon: <MailIcon className="w-5 h-5 mr-3" /> },
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
            className={`w-full flex items-center text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeView === item.id
              ? 'bg-primary text-white'
              : 'text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border'
              }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;