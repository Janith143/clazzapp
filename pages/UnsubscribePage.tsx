import React, { useState, useEffect } from 'react';
import { useUI } from '../contexts/UIContext';
import { useNavigation } from '../contexts/NavigationContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface UnsubscribePageProps {
    type?: 'sms' | 'email';
}

const UnsubscribePage: React.FC<UnsubscribePageProps> = ({ type }) => {
    const { addToast } = useUI();
    const { handleBack } = useNavigation();
    const [contact, setContact] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedType, setSelectedType] = useState<'sms' | 'email'>(type || 'email');

    useEffect(() => {
        if (type) setSelectedType(type);
    }, [type]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contact) {
            addToast('Please provide your contact information.', 'error');
            return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'unsubscribe_requests'), {
                contact,
                type: selectedType,
                createdAt: serverTimestamp(),
                status: 'pending'
            });
            addToast(`Unsubscribed from ${selectedType === 'sms' ? 'SMS' : 'Email'} successfully.`, 'success');
            setContact('');
        } catch (error) {
            console.error('Error submitting unsubscribe request:', error);
            addToast('Failed to unsubscribe. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <button onClick={handleBack} className="mb-6 text-primary hover:underline">&larr; Back</button>
            <h1 className="text-3xl font-bold mb-6 text-light-text dark:text-dark-text">Unsubscribe</h1>
            <p className="mb-6 text-light-subtle dark:text-dark-subtle">
                We're sorry to see you go. Enter your details below to unsubscribe from our communications.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md border border-light-border dark:border-dark-border">
                <div>
                    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Communication Type</label>
                    <div className="flex space-x-4 mb-4">
                        <label className="flex items-center">
                            <input
                                type="radio"
                                checked={selectedType === 'email'}
                                onChange={() => setSelectedType('email')}
                                className="mr-2"
                            />
                            Email
                        </label>
                        <label className="flex items-center">
                            <input
                                type="radio"
                                checked={selectedType === 'sms'}
                                onChange={() => setSelectedType('sms')}
                                className="mr-2"
                            />
                            SMS
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                        {selectedType === 'email' ? 'Email Address' : 'Phone Number'}
                    </label>
                    <input
                        type={selectedType === 'email' ? 'email' : 'tel'}
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder={selectedType === 'email' ? 'example@email.com' : '+947XXXXXXXX'}
                        className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                    {loading ? 'Processing...' : 'Unsubscribe'}
                </button>
            </form>
        </div>
    );
};

export default UnsubscribePage;
