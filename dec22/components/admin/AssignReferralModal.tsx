
import React, { useState } from 'react';
import Modal from '../Modal';
import FormInput from '../FormInput';
import { SaveIcon, XIcon } from '../Icons';
import { User } from '../../types';
import { useUI } from '../../contexts/UIContext';

interface AssignReferralModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onAssign: (userId: string, code: string) => Promise<void>;
}

const AssignReferralModal: React.FC<AssignReferralModalProps> = ({ isOpen, onClose, user, onAssign }) => {
    const { addToast } = useUI();
    const [referralCode, setReferralCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            await onAssign(user.id, referralCode);
            setReferralCode('');
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to assign referral code.');
            addToast(err.message || 'Failed to assign referral code.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Assign Referrer">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
                    <p>Assigning a referrer to <strong>{user.firstName} {user.lastName}</strong>.</p>
                    <p className="mt-1">Enter the <strong>Referral Code</strong> of the user who invited them.</p>
                </div>

                <FormInput
                    label="Referral Code"
                    name="referralCode"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="e.g. PASAN123"
                    required
                />
                
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <div className="flex justify-end space-x-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center px-4 py-2 border border-light-border dark:border-dark-border rounded-md text-sm hover:bg-light-background dark:hover:bg-dark-background transition-colors"
                        disabled={isSubmitting}
                    >
                        <XIcon className="w-4 h-4 mr-2" />
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex items-center px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
                        disabled={isSubmitting || !referralCode.trim()}
                    >
                        <SaveIcon className="w-4 h-4 mr-2" />
                        {isSubmitting ? 'Assigning...' : 'Assign'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AssignReferralModal;
