import React, { useState } from 'react';
import { useUI } from '../contexts/UIContext';
import { useNavigation } from '../contexts/NavigationContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const ReportContentPage: React.FC = () => {
    const { addToast } = useUI();
    const { handleBack } = useNavigation();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !reason || !details) {
            addToast('Please fill in all fields.', 'error');
            return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'content_reports'), {
                name,
                email,
                reason,
                details,
                createdAt: serverTimestamp(),
                status: 'pending'
            });
            addToast('Report submitted successfully. We will review it shortly.', 'success');
            setName('');
            setEmail('');
            setReason('');
            setDetails('');
        } catch (error) {
            console.error('Error submitting report:', error);
            addToast('Failed to submit report. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <button onClick={handleBack} className="mb-6 text-primary hover:underline">&larr; Back</button>
            <h1 className="text-3xl font-bold mb-6 text-light-text dark:text-dark-text">Report Content</h1>
            <p className="mb-6 text-light-subtle dark:text-dark-subtle">
                If you see any inappropriate content or behavior, please report it to us using this form.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md border border-light-border dark:border-dark-border">
                <div>
                    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Your Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Your Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Reason for Reporting</label>
                    <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                    >
                        <option value="">Select a reason</option>
                        <option value="inappropriate_content">Inappropriate Content</option>
                        <option value="spam">Spam or Misleading</option>
                        <option value="harassment">Harassment or Hate Speech</option>
                        <option value="copyright">Copyright Infringement</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Details</label>
                    <textarea
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Please provide specific details..."
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                    {loading ? 'Submitting...' : 'Submit Report'}
                </button>
            </form>
        </div>
    );
};

export default ReportContentPage;
