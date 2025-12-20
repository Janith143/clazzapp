import React, { useState, useMemo } from 'react';
import { User, AdminView } from '../../types';
import { PlusIcon, PencilIcon, CheckCircleIcon, XIcon, SaveIcon, ShieldCheckIcon } from '../Icons';
import Modal from '../Modal';
import FormInput from '../FormInput';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';

interface StaffManagementProps {
    users: User[];
    onUpdatePermissions: (userId: string, permissions: string[]) => void;
}

const permissionOptions: { key: AdminView; label: string }[] = [
    { key: 'analytics', label: 'Analytics' },
    { key: 'users', label: 'User Management' },
    { key: 'staff', label: 'Team & Permissions' },
    { key: 'content', label: 'Content Management' },
    { key: 'products', label: 'Product Management' },
    { key: 'allsales', label: 'Sales History' },
    { key: 'photo_orders', label: 'Photo Orders' },
    { key: 'physical_orders', label: 'Physical Orders' },
    { key: 'revenue', label: 'Revenue & Payouts' },
    { key: 'vouchers', label: 'Voucher Management' },
    { key: 'referrals', label: 'Referral System' },
    { key: 'payment_gateways', label: 'Payment Gateways' },
    { key: 'site_content', label: 'Site Content' },
    { key: 'calculation_guide', label: 'Calculation Guide' },
];

const StaffManagement: React.FC<StaffManagementProps> = ({ users, onUpdatePermissions }) => {
    const { addUser } = useData();
    const { handleRegister } = useAuth();
    const { addToast } = useUI();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
    });
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const staffUsers = useMemo(() => {
        return users.filter(u => u.role === 'admin');
    }, [users]);

    const openModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({ firstName: user.firstName, lastName: user.lastName, email: user.email, password: '' });
            if (!user.permissions || user.permissions.includes('all')) {
                setIsSuperAdmin(true);
                setSelectedPermissions(permissionOptions.map(p => p.key));
            } else {
                setIsSuperAdmin(false);
                setSelectedPermissions(user.permissions);
            }
        } else {
            setEditingUser(null);
            setFormData({ firstName: '', lastName: '', email: '', password: '' });
            setIsSuperAdmin(false);
            setSelectedPermissions([]);
        }
        setIsModalOpen(true);
    };

    const togglePermission = (key: string) => {
        if (isSuperAdmin) return; // Cannot toggle individual permissions if Super Admin
        setSelectedPermissions(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const handleSuperAdminChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsSuperAdmin(e.target.checked);
        if (e.target.checked) {
            setSelectedPermissions(permissionOptions.map(p => p.key));
        } else {
            setSelectedPermissions([]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        try {
            // Determine final permissions array to save
            // Note: We don't save 'all' explicitly anymore to make logic simpler, or we can save explicit list
            // If super admin, we can either save 'all' or undefined. Let's standardise on undefined or check for logic consistency.
            // Based on logic in AdminDashboard: !permissions || permissions.includes('all').
            // We will save `undefined` (remove field) if Super Admin to stick to the schema, or explicit list if not.
            // Actually, updating with undefined in Firestore updateDoc requires deleteField().
            // Easier path: Save explicit full list for Super Admin, or a special flag.
            // Let's use the logic: if Super Admin, pass `['all']` to be safe and explicit.
            
            const finalPermissions = isSuperAdmin ? ['all'] : selectedPermissions;

            if (editingUser) {
                // Update existing user permissions
                onUpdatePermissions(editingUser.id, finalPermissions);
                addToast("Staff permissions updated.", "success");
            } else {
                // Create new staff
                if (!formData.password || formData.password.length < 6) {
                    addToast("Password must be at least 6 characters.", "error");
                    setIsProcessing(false);
                    return;
                }

                // 1. Register in Firebase Auth
                const fbUser = await handleRegister(formData.email, formData.password);
                
                if (fbUser) {
                     // 2. Create User Doc
                     const newId = `ADM${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
                     
                     const newUser: User = {
                        id: newId,
                        uid: fbUser.uid,
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        email: formData.email,
                        role: 'admin',
                        avatar: '',
                        status: 'active',
                        accountBalance: 0,
                        referralCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
                        isEmailVerified: true, // Assume admin created accounts are verified or internal
                        createdAt: new Date().toISOString(),
                        permissions: finalPermissions
                    };
                    
                    await addUser(newUser);
                    addToast("New staff account created.", "success");
                }
            }
            setIsModalOpen(false);
        } catch (error: any) {
            console.error(error);
            addToast(error.message || "Operation failed.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Team & Permissions</h1>
                <button onClick={() => openModal()} className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors">
                    <PlusIcon className="w-5 h-5" />
                    <span>Add Staff Member</span>
                </button>
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md overflow-x-auto">
                <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                    <thead className="bg-light-background dark:bg-dark-background">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Name</th>
                            <th className="px-4 py-3 text-left font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Email</th>
                            <th className="px-4 py-3 text-left font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Role Type</th>
                            <th className="px-4 py-3 text-left font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Access Areas</th>
                            <th className="px-4 py-3 text-center font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-light-border dark:divide-dark-border">
                        {staffUsers.map(user => {
                            const isSuper = !user.permissions || user.permissions.includes('all');
                            const accessCount = user.permissions ? user.permissions.length : 'All';
                            
                            return (
                                <tr key={user.id}>
                                    <td className="px-4 py-3 whitespace-nowrap font-medium text-light-text dark:text-dark-text">{user.firstName} {user.lastName}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-light-text dark:text-dark-text">{user.email}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {isSuper ? (
                                            <span className="px-2 py-1 text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 rounded-full">Super Admin</span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full">Sub-Admin</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 max-w-xs truncate text-light-subtle dark:text-dark-subtle" title={user.permissions?.join(', ')}>
                                        {isSuper ? 'Full Access' : `${accessCount} section(s)`}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => openModal(user)} className="text-primary hover:underline flex items-center justify-center w-full">
                                            <PencilIcon className="w-4 h-4 mr-1" /> Edit
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? "Edit Permissions" : "Add New Staff"}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {!editingUser && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInput label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
                            <FormInput label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
                            <FormInput label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
                            <FormInput label="Password" name="password" type="password" value={formData.password} onChange={handleChange} required placeholder="Min 6 chars" />
                        </div>
                    )}
                    
                    {editingUser && (
                        <div className="bg-light-background dark:bg-dark-background p-3 rounded-md border border-light-border dark:border-dark-border">
                            <p className="font-bold">{editingUser.firstName} {editingUser.lastName}</p>
                            <p className="text-sm text-light-subtle dark:text-dark-subtle">{editingUser.email}</p>
                        </div>
                    )}

                    <div className="border-t border-light-border dark:border-dark-border pt-4">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <ShieldCheckIcon className="w-5 h-5 mr-2 text-primary" />
                            Access Control
                        </h3>
                        
                        <div className="flex items-center mb-6 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-md border border-purple-200 dark:border-purple-800">
                            <input 
                                type="checkbox" 
                                id="superAdmin" 
                                checked={isSuperAdmin} 
                                onChange={handleSuperAdminChange} 
                                className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <div className="ml-3">
                                <label htmlFor="superAdmin" className="block text-sm font-bold text-gray-900 dark:text-gray-100">Super Admin Access</label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Grants full access to all current and future sections.</p>
                            </div>
                        </div>

                        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${isSuperAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
                            {permissionOptions.map(option => (
                                <label key={option.key} className="flex items-center p-3 border border-light-border dark:border-dark-border rounded-md hover:bg-light-background dark:hover:bg-dark-background cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedPermissions.includes(option.key)}
                                        onChange={() => togglePermission(option.key)}
                                        disabled={isSuperAdmin}
                                        className="h-4 w-4 text-primary focus:ring-primary border-light-border dark:border-dark-border rounded"
                                    />
                                    <span className="ml-3 text-sm font-medium text-light-text dark:text-dark-text">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 space-x-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-light-border dark:border-dark-border rounded-md text-light-text dark:text-dark-text hover:bg-light-background dark:hover:bg-dark-background">
                            Cancel
                        </button>
                        <button type="submit" disabled={isProcessing} className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50">
                            <SaveIcon className="w-4 h-4 mr-2" />
                            {isProcessing ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default StaffManagement;