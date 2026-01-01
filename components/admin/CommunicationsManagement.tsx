import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { User, Teacher } from '../../types';
import { SearchIcon, ShareIcon, MailIcon, DocumentTextIcon, PhoneIcon, CheckCircleIcon, SaveIcon } from '../Icons';
import { CommunicationHistory } from './CommunicationHistory';

type MailingListCategory =
    | 'students_mobile'
    | 'students_email'
    | 'students_both'
    | 'teachers_approved_mobile'
    | 'teachers_approved_email'
    | 'teachers_approved_both'
    | 'teachers_pending_mobile'
    | 'teachers_pending_email'
    | 'teachers_pending_both';

const MAILING_LISTS: { id: MailingListCategory; label: string }[] = [
    { id: 'students_mobile', label: 'Students (Mobile)' },
    { id: 'students_email', label: 'Students (Email)' },
    { id: 'students_both', label: 'Students (Both)' },
    { id: 'teachers_approved_mobile', label: 'Teachers Approved (Mobile)' },
    { id: 'teachers_approved_email', label: 'Teachers Approved (Email)' },
    { id: 'teachers_approved_both', label: 'Teachers Approved (Both)' },
    { id: 'teachers_pending_mobile', label: 'Teachers Pending (Mobile)' },
    { id: 'teachers_pending_email', label: 'Teachers Pending (Email)' },
    { id: 'teachers_pending_both', label: 'Teachers Pending (Both)' },
];

const CommunicationsManagement: React.FC = () => {
    const { users, teachers, handleSendNotification } = useData();
    const { currentUser } = useAuth();
    const { addToast } = useUI();
    const { functionUrls } = useNavigation();

    const [viewMode, setViewMode] = useState<'compose' | 'history'>('compose');
    const [selectedListCategory, setSelectedListCategory] = useState<MailingListCategory>('students_mobile');
    const [savedListIds, setSavedListIds] = useState<Set<string>>(new Set());

    // Flexible Filters
    const [roleFilter, setRoleFilter] = useState<'all' | 'students' | 'teachers_all' | 'teachers_approved' | 'teachers_pending'>('all');
    const [contactFilter, setContactFilter] = useState<'all' | 'mobile_only' | 'email_only' | 'both'>('all');

    // UI State
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isListLoading, setIsListLoading] = useState(false);
    const [isSavingList, setIsSavingList] = useState(false);

    // Message State
    const [selectedChannels, setSelectedChannels] = useState<{ email: boolean; sms: boolean; push: boolean }>({
        email: true,
        sms: true,
        push: false
    });

    // Smart Delivery Config
    const [smartDeliveryEnabled, setSmartDeliveryEnabled] = useState(true);
    const [smartDeliveryPreference, setSmartDeliveryPreference] = useState<'sms' | 'email'>('sms');
    const [preferSms, setPreferSms] = useState(true); // Keeping for legacy reference, synced with smart pref

    const [userChannelPreferences, setUserChannelPreferences] = useState<Record<string, string[]>>({});

    const [subject, setSubject] = useState('');
    const [messageBody, setMessageBody] = useState('');
    const [smsMessage, setSmsMessage] = useState('');
    const [pushTitle, setPushTitle] = useState('');
    const [pushBody, setPushBody] = useState('');
    const [sending, setSending] = useState(false);

    // 1. Fetch Saved List Logic (Optional Legacy Logic)
    useEffect(() => {
        const fetchSavedList = async () => {
            // Implementation can be restored if "Category" based persistence is needed alongside filters
        };
    }, []);

    // 1. Fetch Saved List Logic & Auto-Configure Filters/Channels
    useEffect(() => {
        const loadListAndConfig = async () => {
            setIsListLoading(true);

            // A. Auto-Configure Filters & Channels based on Category
            // This ensures "View and Edit" is intuitive
            if (selectedListCategory.startsWith('students')) {
                setRoleFilter('students');
            } else if (selectedListCategory.includes('teachers_approved')) {
                setRoleFilter('teachers_approved');
            } else if (selectedListCategory.includes('teachers_pending')) {
                setRoleFilter('teachers_pending');
            }

            if (selectedListCategory.includes('mobile')) {
                setContactFilter('mobile_only');
                setSelectedChannels({ email: false, sms: true, push: false });
            } else if (selectedListCategory.includes('email')) {
                setContactFilter('email_only');
                setSelectedChannels({ email: true, sms: false, push: false });
            } else if (selectedListCategory.includes('both')) {
                setContactFilter('both');
                setSelectedChannels({ email: true, sms: true, push: false });
            }

            // B. Fetch Saved IDs
            try {
                const docRef = doc(db, 'mailing_lists', selectedListCategory);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.userIds && Array.isArray(data.userIds)) {
                        setSavedListIds(new Set(data.userIds as string[]));
                        setSelectedUserIds(new Set(data.userIds as string[])); // Auto-select stored users
                    } else {
                        setSavedListIds(new Set());
                        setSelectedUserIds(new Set());
                    }
                } else {
                    setSavedListIds(new Set());
                    setSelectedUserIds(new Set());
                }
            } catch (error) {
                console.error("Error loading list:", error);
                addToast('Failed to load saved list', 'error');
            } finally {
                setIsListLoading(false);
            }
        };
        loadListAndConfig();
    }, [selectedListCategory]);

    const handleSaveList = async () => {
        setIsSavingList(true);
        try {
            await setDoc(doc(db, 'mailing_lists', selectedListCategory), {
                userIds: Array.from(selectedUserIds),
                updatedAt: new Date().toISOString()
            });
            setSavedListIds(new Set(selectedUserIds));
            addToast('Mailing list saved successfully.', 'success');
        } catch (error) {
            console.error(error);
            addToast('Failed to save list.', 'error');
        } finally {
            setIsSavingList(false);
        }
    };


    // 2. Filter Logic
    const filteredUsers = useMemo(() => {
        let list: (User | Teacher)[] = [];
        const lowerQuery = searchQuery.toLowerCase();
        const getName = (u: any) => u.name || `${(u as any).firstName} ${(u as any).lastName}`;

        // Role Filter
        if (roleFilter === 'students') {
            list = users.filter(u => u.role === 'student');
        } else if (roleFilter.startsWith('teachers')) {
            if (roleFilter === 'teachers_all') {
                list = teachers;
            } else if (roleFilter === 'teachers_approved') {
                list = teachers.filter(t => t.registrationStatus === 'approved');
            } else if (roleFilter === 'teachers_pending') {
                list = teachers.filter(t => t.registrationStatus === 'pending');
            }
        } else {
            // All - Combined
            list = [...users.filter(u => u.role === 'student'), ...teachers];
        }

        // Contact Filter & Search
        return list.filter(u => {
            const user = (u as any).userId ? users.find(sub => sub.id === (u as any).userId) || u : u; // Resolve teacher to user

            // Fallbacks for contact info
            const mobile = (user as User).contactNumber || (user as any).contact?.phone || (user as any).phoneNumber;
            const email = user.email || (user as any).contact?.email;

            // Contact Filter
            if (contactFilter === 'mobile_only' && (!mobile || email)) return false;
            if (contactFilter === 'email_only' && (!email || mobile)) return false;
            if (contactFilter === 'both' && (!mobile || !email)) return false;

            // Search
            const name = getName(u);
            const id = u.id;
            return (
                name.toLowerCase().includes(lowerQuery) ||
                (email && email.toLowerCase().includes(lowerQuery)) ||
                (mobile && mobile.includes(lowerQuery)) ||
                id.toLowerCase().includes(lowerQuery)
            );
        });
    }, [users, teachers, roleFilter, contactFilter, searchQuery]);


    // Helper to determine active channels for a user (Smart Delivery Logic)
    const getFinalUserChannels = (user: any) => {
        // 1. Check user manual override first
        if (userChannelPreferences[user.id]) return userChannelPreferences[user.id];

        // 2. Resolve contact info
        const mobile = (user as User).contactNumber || (user as any).contact?.phone || (user as any).phoneNumber;
        const email = user.email;

        const channels: string[] = [];

        // 3. Global Channel Selection
        if (selectedChannels.push) channels.push('push');

        // Add potentially available channels
        if (selectedChannels.sms && mobile) channels.push('sms');
        if (selectedChannels.email && email) channels.push('email');

        // 4. Apply Smart Delivery (Duplicate Prevention)
        // Only applies if user has BOTH and we are trying to send BOTH
        if (smartDeliveryEnabled && channels.includes('sms') && channels.includes('email')) {
            if (smartDeliveryPreference === 'sms') {
                return channels.filter(c => c !== 'email');
            } else {
                return channels.filter(c => c !== 'sms');
            }
        }

        return channels;
    };


    const handleToggleUser = (id: string) => {
        const newSet = new Set(selectedUserIds);
        if (newSet.has(id)) {
            newSet.delete(id);
            if (selectAll) setSelectAll(false);
            setUserChannelPreferences(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        } else {
            newSet.add(id);
        }
        setSelectedUserIds(newSet);
    };

    const handleSelectAllToggle = () => {
        if (selectAll) {
            setSelectAll(false);
            setSelectedUserIds(new Set());
        } else {
            setSelectAll(true);
            setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
        }
    };

    // Helper to manually toggle - this creates an override
    const toggleUserChannel = (userId: string, channel: 'email' | 'sms' | 'push') => {
        // We need to resolve the user object to get default channels
        const userObj = filteredUsers.find(u => u.id === userId);
        if (!userObj) return;

        const resolvedUser = (userObj as any).userId ? users.find(sub => sub.id === (userObj as any).userId) || userObj : userObj;

        // Get current effective channels (either existing override or calculated default)
        const currentChannels = userChannelPreferences[userId] || getFinalUserChannels(resolvedUser);

        let newChannels = [...currentChannels];
        if (newChannels.includes(channel)) {
            newChannels = newChannels.filter(c => c !== channel);
        } else {
            newChannels.push(channel);
        }

        // Save as override
        setUserChannelPreferences(prev => ({ ...prev, [userId]: newChannels }));
    };

    const handleSend = async () => {
        if (selectedUserIds.size === 0) {
            addToast('Please select at least one recipient.', 'error');
            return;
        }

        if (!window.confirm(`Are you sure you want to send this message to ${selectedUserIds.size} users?`)) return;

        setSending(true);

        // Prepare Recipient Data using Smart Delivery Resolution
        const recipients = filteredUsers
            .filter(u => selectedUserIds.has(u.id))
            .map(u => {
                const resolvedUser = (u as any).userId ? users.find(sub => sub.id === (u as any).userId) || u : u;
                return {
                    id: u.id,
                    email: resolvedUser.email,
                    phoneNumber: (resolvedUser as User).contactNumber || (resolvedUser as any).contact?.phone || (resolvedUser as any).phoneNumber || '',
                    name: (u as any).name || `${(resolvedUser as User).firstName} ${(resolvedUser as User).lastName}`,
                    allowedChannels: getFinalUserChannels(resolvedUser)
                };
            });

        try {
            const validChannels = Object.keys(selectedChannels).filter(k => selectedChannels[k as keyof typeof selectedChannels]);

            // Call Backend
            const response = await fetch(`${functionUrls.notification}/bulk-send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipients,
                    validChannels: validChannels,
                    messageData: { subject, htmlBody: messageBody, smsMessage, pushTitle, pushBody }
                })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);

            if (result.results) {
                addToast(`Processed: ${result.results.email?.success || 0} Emails, ${result.results.sms?.success || 0} SMS, ${result.results.push?.success || 0} Pushes.`, 'success');
            }

            // Reset
            setSelectedUserIds(new Set());
            setSelectAll(false);
            addToast('Bulk operation completed successfully.', 'success');

        } catch (error: any) {
            console.error(error);
            addToast('Failed to send messages: ' + error.message, 'error');
        } finally {
            setSending(false);
        }
    };

    // ... (previous code)

    // Helper to calculate unique user ID count for "Select All" display
    const filteredCount = filteredUsers.length;

    const handleSelectAllMatching = () => {
        const allIds = new Set(filteredUsers.map(u => u.id));
        setSelectedUserIds(allIds);
        setSelectAll(true);
        addToast(`Selected all ${allIds.size} users matching current filters`, 'success');
    };

    const handleSelectEveryone = () => {
        // Reset filters to show everyone
        setRoleFilter('all');
        setContactFilter('all');
        setSearchQuery('');
        // We need to wait for the filter to update? No, state updates are async.
        // But we can manually calculate 'all' here or use a useEffect?
        // Better: Set a flag 'autoSelectAll' that effects trigger on filter change?
        // Simpler: Just set filters, and the user can click "Select All" once it loads.
        // AUTO-MAGIC WAY:
        // We can't synchronously get the result of the filter change.
        // So we will set a special "selectingAll" state.

        setRoleFilter('all');
        setContactFilter('all');
        setSearchQuery('');

        // Use a timeout to allow render cycle to update filteredUsers (not ideal but works for simple react)
        // OR better: use a unique effect for this action.
        setTimeout(() => {
            // This is a bit hacky, but since filteredUsers is a useMemo dependent on state, 
            // we need the next render.
            // Actually, we can just calculate them from raw `users` and `teachers` right here for the selection.
            const allIds = new Set([
                ...users.map(u => u.id),
                ...teachers.map(t => t.id)
            ]);
            setSelectedUserIds(allIds);
            setSelectAll(true);
            addToast(`Selected all ${allIds.size} users in database`, 'success');
        }, 100);
    };

    return (
        <div className="space-y-6 max-w-full mx-auto pb-20 px-4">
            <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">Communications Center</h1>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                {/* LEFT: Filters & Table - Expanded Space */}
                <div className="xl:col-span-2 bg-light-surface dark:bg-dark-surface rounded-lg shadow p-4 flex flex-col h-[80vh]">

                    {/* Quick Audience Selectors */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <button
                            onClick={handleSelectEveryone}
                            className="flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded shadow hover:opacity-90 transition-all font-semibold text-sm"
                        >
                            <span className="text-lg">🌍</span> Select Everyone (All Categories)
                        </button>
                        <button
                            onClick={handleSelectAllMatching}
                            disabled={filteredCount === 0}
                            className="flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-light-text dark:text-dark-text rounded shadow transition-all font-semibold text-sm"
                        >
                            <CheckCircleIcon className="w-5 h-5 text-green-500" />
                            Select All Matching ({filteredCount})
                        </button>
                    </div>

                    {/* Saved Lists Control */}
                    <div className="flex items-center gap-2 mb-2 p-2 bg-primary/5 rounded border border-primary/10">
                        <span className="text-xs font-bold text-primary uppercase whitespace-nowrap">Load Presets:</span>
                        <select
                            value={selectedListCategory}
                            onChange={(e) => setSelectedListCategory(e.target.value as MailingListCategory)}
                            className="flex-1 px-2 py-1 bg-white dark:bg-dark-background border rounded text-xs"
                        >
                            {MAILING_LISTS.map(list => (
                                <option key={list.id} value={list.id}>{list.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleSaveList}
                            disabled={isSavingList}
                            className="flex items-center px-3 py-1 bg-primary text-white text-xs rounded shadow hover:bg-primary/90 whitespace-nowrap"
                        >
                            <SaveIcon className="w-3 h-3 mr-1" />
                            {isSavingList ? 'Saving...' : 'Save As Preset'}
                        </button>
                    </div>

                    {/* Filters Bar */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value as any)}
                            className="px-2 py-1 bg-light-background dark:bg-dark-background border rounded text-sm focus:ring-primary"
                        >
                            <option value="all">All Roles</option>
                            <option value="students">Students</option>
                            <option value="teachers_all">Teachers (All)</option>
                            <option value="teachers_approved">Teachers (Approved)</option>
                            <option value="teachers_pending">Teachers (Pending)</option>
                        </select>
                        <select
                            value={contactFilter}
                            onChange={(e) => setContactFilter(e.target.value as any)}
                            className="px-2 py-1 bg-light-background dark:bg-dark-background border rounded text-sm focus:ring-primary"
                        >
                            <option value="all">All Contacts</option>
                            <option value="mobile_only">Mobile Only</option>
                            <option value="email_only">Email Only</option>
                            <option value="both">Both Available</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Search name, email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 px-3 py-1 bg-light-background dark:bg-dark-background border rounded text-sm focus:ring-primary"
                        />
                    </div>

                    {/* TABLE HEADERS */}
                    <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 border-b pb-2 mb-2 px-2">
                        <div className="col-span-1">
                            <input type="checkbox" checked={selectAll} onChange={handleSelectAllToggle} />
                        </div>
                        <div className="col-span-5">User</div>
                        <div className="col-span-3">Contacts</div>
                        <div className="col-span-3">Channels</div>
                    </div>

                    {/* TABLE BODY */}
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {filteredUsers.length === 0 && (
                            <div className="text-center py-10 text-gray-400 text-sm">No users match filters</div>
                        )}
                        {filteredUsers.map(user => {
                            const resolvedUser = (user as any).userId ? users.find(sub => sub.id === (user as any).userId) || user : user;
                            const mobile = (resolvedUser as User).contactNumber || (resolvedUser as any).contact?.phone || (resolvedUser as any).phoneNumber;
                            const email = resolvedUser.email;
                            const activeChannels = getFinalUserChannels(resolvedUser); // This now reflects Smart Delivery logic
                            const isSelected = selectedUserIds.has(user.id);

                            // Safe role access
                            const userRole = (user as any).role || ((user as any).registrationStatus ? 'teacher' : 'unknown');

                            return (
                                <div key={user.id} className={`grid grid-cols-12 gap-2 items-center p-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-800 text-sm ${isSelected ? 'border-primary bg-primary/5' : 'border-transparent'}`}>
                                    <div className="col-span-1">
                                        <input type="checkbox" checked={isSelected} onChange={() => handleToggleUser(user.id)} className="rounded text-primary" />
                                    </div>
                                    <div className="col-span-5 truncate">
                                        <div className="font-medium text-light-text dark:text-dark-text">{(user as any).name || `${(resolvedUser as any).firstName} ${(resolvedUser as any).lastName}`}</div>
                                        <div className="text-xs text-gray-400 capitalize">{userRole}</div>
                                    </div>
                                    <div className="col-span-3 flex flex-col space-y-1 text-xs">
                                        {mobile && <div className="flex items-center text-green-600"><PhoneIcon className="w-3 h-3 mr-1" /> {mobile}</div>}
                                        {email && <div className="flex items-center text-blue-600"><MailIcon className="w-3 h-3 mr-1" /> <span className="truncate max-w-[100px]">{email}</span></div>}
                                    </div>
                                    <div className="col-span-3 flex space-x-1">
                                        {/* Visual feedback of what will be sent */}
                                        <span
                                            onClick={(e) => { e.stopPropagation(); if (isSelected) toggleUserChannel(user.id, 'email'); }}
                                            className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer ${activeChannels.includes('email') ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-300 border-transparent transition-opacity opacity-20'}`}
                                            title={isSelected ? "Toggle Email" : "Select user to toggle"}
                                        >
                                            Email
                                        </span>
                                        <span
                                            onClick={(e) => { e.stopPropagation(); if (isSelected) toggleUserChannel(user.id, 'sms'); }}
                                            className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer ${activeChannels.includes('sms') ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-300 border-transparent transition-opacity opacity-20'}`}
                                            title={isSelected ? "Toggle SMS" : "Select user to toggle"}
                                        >
                                            SMS
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-2 text-xs text-right text-gray-500">
                        {selectedUserIds.size} selected
                    </div>
                </div>

                {/* RIGHT: Composition & Settings */}
                <div className="xl:col-span-2 space-y-4">
                    {/* Settings Panel */}
                    <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow p-4">
                        <h3 className="font-semibold mb-3">Delivery Settings</h3>

                        {/* Smart Delivery Controls */}
                        <div className="mb-4 p-3 border rounded bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                    <div className="p-1 bg-green-100 rounded mr-2"><DocumentTextIcon className="w-4 h-4 text-green-600" /></div>
                                    <div>
                                        <div className="font-medium text-sm">Smart Delivery</div>
                                        <div className="text-xs text-gray-500">Avoid duplicate messages</div>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setSmartDeliveryEnabled(!smartDeliveryEnabled)}
                                    className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${smartDeliveryEnabled ? 'bg-primary' : 'bg-gray-300'}`}
                                >
                                    <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${smartDeliveryEnabled ? 'translate-x-5' : ''}`} />
                                </div>
                            </div>

                            {smartDeliveryEnabled && (
                                <div className="ml-8 mt-2 text-xs text-gray-600 dark:text-gray-400">
                                    <p className="mb-2">If a recipient has <b>both available</b>, send:</p>
                                    <div className="flex space-x-4">
                                        <label className="flex items-center cursor-pointer">
                                            <input
                                                type="radio"
                                                name="smartPref"
                                                checked={smartDeliveryPreference === 'sms'}
                                                onChange={() => setSmartDeliveryPreference('sms')}
                                                className="mr-1 text-primary focus:ring-primary"
                                            />
                                            SMS Only
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input
                                                type="radio"
                                                name="smartPref"
                                                checked={smartDeliveryPreference === 'email'}
                                                onChange={() => setSmartDeliveryPreference('email')}
                                                className="mr-1 text-primary focus:ring-primary"
                                            />
                                            Email Only
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Global Channels */}
                        <div className="grid grid-cols-3 gap-4">
                            <label className={`flex flex-col items-center justify-center p-3 border rounded cursor-pointer transition-colors ${selectedChannels.email ? 'border-blue-500 bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                                <input type="checkbox" checked={selectedChannels.email} onChange={(e) => setSelectedChannels(p => ({ ...p, email: e.target.checked }))} className="hidden" />
                                <MailIcon className={`w-6 h-6 mb-1 ${selectedChannels.email ? 'text-blue-500' : 'text-gray-400'}`} />
                                <span className="text-xs font-medium">Email</span>
                            </label>
                            <label className={`flex flex-col items-center justify-center p-3 border rounded cursor-pointer transition-colors ${selectedChannels.sms ? 'border-green-500 bg-green-50/50' : 'hover:bg-gray-50'}`}>
                                <input type="checkbox" checked={selectedChannels.sms} onChange={(e) => setSelectedChannels(p => ({ ...p, sms: e.target.checked }))} className="hidden" />
                                <DocumentTextIcon className={`w-6 h-6 mb-1 ${selectedChannels.sms ? 'text-green-500' : 'text-gray-400'}`} />
                                <span className="text-xs font-medium">SMS</span>
                            </label>
                            <label className={`flex flex-col items-center justify-center p-3 border rounded cursor-pointer transition-colors ${selectedChannels.push ? 'border-purple-500 bg-purple-50/50' : 'hover:bg-gray-50'}`}>
                                <input type="checkbox" checked={selectedChannels.push} onChange={(e) => setSelectedChannels(p => ({ ...p, push: e.target.checked }))} className="hidden" />
                                <PhoneIcon className={`w-6 h-6 mb-1 ${selectedChannels.push ? 'text-purple-500' : 'text-gray-400'}`} />
                                <span className="text-xs font-medium">Push</span>
                            </label>
                        </div>
                    </div>

                    {/* Email Composer */}
                    {selectedChannels.email && (
                        <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow p-6 border-l-4 border-blue-500">
                            <h3 className="font-semibold mb-4 text-light-text dark:text-dark-text">Email Content</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle mb-1">Subject</label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="w-full px-3 py-2 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-md focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle mb-1">HTML Body</label>
                                    <textarea
                                        value={messageBody}
                                        onChange={(e) => setMessageBody(e.target.value)}
                                        rows={6}
                                        className="w-full px-3 py-2 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-md focus:ring-blue-500 font-mono text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SMS Composer */}
                    {selectedChannels.sms && (
                        <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow p-6 border-l-4 border-green-500">
                            <h3 className="font-semibold mb-4 text-light-text dark:text-dark-text">SMS Content</h3>
                            <div className="space-y-4">
                                <textarea
                                    value={smsMessage}
                                    onChange={(e) => setSmsMessage(e.target.value)}
                                    rows={3}
                                    maxLength={160}
                                    className="w-full px-3 py-2 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-md focus:ring-green-500"
                                />
                                <div className="text-right text-xs text-light-subtle">{smsMessage.length}/160</div>
                            </div>
                        </div>
                    )}

                    {/* Push Composer */}
                    {selectedChannels.push && (
                        <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow p-6 border-l-4 border-purple-500">
                            <h3 className="font-semibold mb-4 text-light-text dark:text-dark-text">Push Notification</h3>
                            <div className="space-y-4">
                                <input type="text" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} placeholder="Title" className="w-full px-3 py-2 bg-light-background dark:bg-dark-background border rounded-md focus:ring-purple-500" />
                                <textarea value={pushBody} onChange={(e) => setPushBody(e.target.value)} placeholder="Body" rows={2} className="w-full px-3 py-2 bg-light-background dark:bg-dark-background border rounded-md focus:ring-purple-500" />
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleSend}
                        disabled={sending || selectedUserIds.size === 0}
                        className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all ${sending ? 'bg-gray-400' : 'bg-gradient-to-r from-primary to-accent hover:-translate-y-1'}`}
                    >
                        {sending ? 'Sending...' : `Send to ${selectedUserIds.size} Recipients`}
                    </button>

                </div>
            </div>
        </div>
    );
};

export default CommunicationsManagement;
