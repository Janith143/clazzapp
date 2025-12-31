import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { SpinnerIcon, TrashIcon, CheckCircleIcon, XIcon, MailIcon, PhoneIcon } from '../Icons';
import { useUI } from '../../contexts/UIContext';

interface RequestBase {
    id: string;
    createdAt: Timestamp;
    status: 'pending' | 'completed' | 'rejected';
}

interface DeletionRequest extends RequestBase {
    accountId?: string;
    email?: string; // Legacy support
    reason?: string;
}

interface ContentReport extends RequestBase {
    name: string;
    email: string;
    reason: string;
    details: string;
}

interface UnsubscribeRequest extends RequestBase {
    contact: string;
    type: 'sms' | 'email';
}

const RequestsManagement: React.FC = () => {
    const { addToast } = useUI();
    const [activeTab, setActiveTab] = useState<'deletion' | 'reports' | 'unsubscribe'>('deletion');

    const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
    const [contentReports, setContentReports] = useState<ContentReport[]>([]);
    const [unsubscribeRequests, setUnsubscribeRequests] = useState<UnsubscribeRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubDeletion = onSnapshot(query(collection(db, 'deletion_requests'), orderBy('createdAt', 'desc')), (snapshot) => {
            setDeletionRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DeletionRequest)));
        });

        const unsubReports = onSnapshot(query(collection(db, 'content_reports'), orderBy('createdAt', 'desc')), (snapshot) => {
            setContentReports(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ContentReport)));
        });

        const unsubUnsubscribe = onSnapshot(query(collection(db, 'unsubscribe_requests'), orderBy('createdAt', 'desc')), (snapshot) => {
            setUnsubscribeRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UnsubscribeRequest)));
            setLoading(false);
        });

        return () => {
            unsubDeletion();
            unsubReports();
            unsubUnsubscribe();
        };
    }, []);

    const handleUpdateStatus = async (collectionName: string, id: string, status: 'completed' | 'rejected') => {
        try {
            await updateDoc(doc(db, collectionName, id), { status });
            addToast('Status updated successfully', 'success');
        } catch (error) {
            console.error(error);
            addToast('Failed to update status', 'error');
        }
    };

    const handleDelete = async (collectionName: string, id: string) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        try {
            await deleteDoc(doc(db, collectionName, id));
            addToast('Record deleted', 'success');
        } catch (error) {
            console.error(error);
            addToast('Failed to delete record', 'error');
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        return new Date(timestamp.seconds * 1000).toLocaleString();
    };

    const renderStatusBadge = (status: string) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {status?.toUpperCase()}
            </span>
        );
    };

    if (loading) return <div className="flex justify-center p-12"><SpinnerIcon className="w-8 h-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">Requests & Reports</h1>

            <div className="flex space-x-2 border-b border-light-border dark:border-dark-border">
                {(['deletion', 'reports', 'unsubscribe'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                                ? 'border-primary text-primary'
                                : 'border-transparent text-light-subtle dark:text-dark-subtle hover:text-light-text dark:hover:text-dark-text'
                            }`}
                    >
                        {tab === 'deletion' && 'Account Deletion'}
                        {tab === 'reports' && 'Content Reports'}
                        {tab === 'unsubscribe' && 'Unsubscribe'}
                    </button>
                ))}
            </div>

            <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-light-border dark:divide-dark-border">
                        <thead className="bg-light-background dark:bg-dark-background">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Date</th>
                                {activeTab === 'deletion' && <th className="px-6 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Account ID / Email</th>}
                                {activeTab === 'reports' && (
                                    <>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Reporter</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Reason</th>
                                    </>
                                )}
                                {activeTab === 'unsubscribe' && <th className="px-6 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Contact</th>}
                                <th className="px-6 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Details</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-light-surface dark:bg-dark-surface divide-y divide-light-border dark:divide-dark-border">
                            {activeTab === 'deletion' && deletionRequests.map(req => (
                                <tr key={req.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-light-subtle dark:text-dark-subtle">{formatDate(req.createdAt)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-light-text dark:text-dark-text">{req.accountId || req.email}</td>
                                    <td className="px-6 py-4 text-sm text-light-subtle dark:text-dark-subtle max-w-xs truncate" title={req.reason}>{req.reason || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{renderStatusBadge(req.status)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => handleUpdateStatus('deletion_requests', req.id, 'completed')} className="text-green-600 hover:text-green-900" title="Mark Complete"><CheckCircleIcon className="w-5 h-5 inline" /></button>
                                        <button onClick={() => handleUpdateStatus('deletion_requests', req.id, 'rejected')} className="text-red-600 hover:text-red-900" title="Reject"><XIcon className="w-5 h-5 inline" /></button>
                                        <button onClick={() => handleDelete('deletion_requests', req.id)} className="text-gray-400 hover:text-red-600" title="Delete"><TrashIcon className="w-5 h-5 inline" /></button>
                                    </td>
                                </tr>
                            ))}

                            {activeTab === 'reports' && contentReports.map(rep => (
                                <tr key={rep.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-light-subtle dark:text-dark-subtle">{formatDate(rep.createdAt)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text dark:text-dark-text">
                                        <div>{rep.name}</div>
                                        <div className="text-xs text-light-subtle dark:text-dark-subtle">{rep.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text dark:text-dark-text">{rep.reason}</td>
                                    <td className="px-6 py-4 text-sm text-light-subtle dark:text-dark-subtle max-w-xs truncate" title={rep.details}>{rep.details}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{renderStatusBadge(rep.status)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => handleUpdateStatus('content_reports', rep.id, 'completed')} className="text-green-600 hover:text-green-900"><CheckCircleIcon className="w-5 h-5 inline" /></button>
                                        <button onClick={() => handleUpdateStatus('content_reports', rep.id, 'rejected')} className="text-red-600 hover:text-red-900"><XIcon className="w-5 h-5 inline" /></button>
                                        <button onClick={() => handleDelete('content_reports', rep.id)} className="text-gray-400 hover:text-red-600"><TrashIcon className="w-5 h-5 inline" /></button>
                                    </td>
                                </tr>
                            ))}

                            {activeTab === 'unsubscribe' && unsubscribeRequests.map(unsub => (
                                <tr key={unsub.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-light-subtle dark:text-dark-subtle">{formatDate(unsub.createdAt)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-light-text dark:text-dark-text">
                                        <div className="flex items-center">
                                            {unsub.type === 'email' ? <MailIcon className="w-4 h-4 mr-2 text-primary" /> : <PhoneIcon className="w-4 h-4 mr-2 text-green-500" />}
                                            {unsub.contact}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-light-subtle dark:text-dark-subtle">-</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{renderStatusBadge(unsub.status)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => handleUpdateStatus('unsubscribe_requests', unsub.id, 'completed')} className="text-green-600 hover:text-green-900"><CheckCircleIcon className="w-5 h-5 inline" /></button>
                                        <button onClick={() => handleUpdateStatus('unsubscribe_requests', unsub.id, 'rejected')} className="text-red-600 hover:text-red-900"><XIcon className="w-5 h-5 inline" /></button>
                                        <button onClick={() => handleDelete('unsubscribe_requests', unsub.id)} className="text-gray-400 hover:text-red-600"><TrashIcon className="w-5 h-5 inline" /></button>
                                    </td>
                                </tr>
                            ))}

                            {((activeTab === 'deletion' && deletionRequests.length === 0) ||
                                (activeTab === 'reports' && contentReports.length === 0) ||
                                (activeTab === 'unsubscribe' && unsubscribeRequests.length === 0)) && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-light-subtle dark:text-dark-subtle">
                                            No requests found.
                                        </td>
                                    </tr>
                                )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RequestsManagement;
