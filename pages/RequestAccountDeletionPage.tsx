import React, { useState } from 'react';
import { useUI } from '../contexts/UIContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const RequestAccountDeletionPage: React.FC = () => {
    const { addToast } = useUI();
    const { handleBack } = useNavigation();
    const { currentUser } = useAuth();
    const [accountId, setAccountId] = useState(currentUser?.id || '');
    const [reason, setReason] = useState('');
    const [confirmation, setConfirmation] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountId || !confirmation) {
            addToast('Please provide your Account ID and confirm deletion request.', 'error');
            return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'deletion_requests'), {
                accountId,
                reason,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            addToast('Deletion request submitted. We will process it within 30 days.', 'success');
            if (!currentUser) setAccountId(''); // Clear if not logged in (autofilled otherwise)
            setReason('');
            setConfirmation(false);
        } catch (error) {
            console.error('Error submitting deletion request:', error);
            addToast('Failed to submit request. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <button onClick={handleBack} className="mb-6 text-primary hover:underline">&larr; Back</button>
            <h1 className="text-3xl font-bold mb-6 text-light-text dark:text-dark-text">Request Account Deletion</h1>
            <p className="mb-6 text-light-subtle dark:text-dark-subtle">
                We are sorry to see you go. Please fill out the form below to request the deletion of your account and all associated data.
                This action is irreversible.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md border border-light-border dark:border-dark-border">
                <div>
                    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Account ID</label>
                    <input
                        type="text"
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                        placeholder="e.g. 0712345678"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Reason (Optional)</label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Tell us why you are leaving..."
                    />
                </div>
                <div className="flex items-start">
                    <input
                        id="confirmation"
                        type="checkbox"
                        checked={confirmation}
                        onChange={(e) => setConfirmation(e.target.checked)}
                        className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        required
                    />
                    <label htmlFor="confirmation" className="ml-2 block text-sm text-light-subtle dark:text-dark-subtle">
                        I understand that this action will permanently delete my account and data.
                    </label>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                    {loading ? 'Submitting...' : 'Request Deletion'}
                </button>
            </form>
        </div>
    );
};

export default RequestAccountDeletionPage;
