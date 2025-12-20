
import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import FormInput from '../FormInput';
import { Voucher } from '../../types';
import { SaveIcon, XIcon } from '../Icons';

interface EditVoucherModalProps {
    isOpen: boolean;
    onClose: () => void;
    voucher: Voucher;
    onSave: (id: string, updates: Partial<Voucher>) => Promise<void>;
}

const EditVoucherModal: React.FC<EditVoucherModalProps> = ({ isOpen, onClose, voucher, onSave }) => {
    const [formData, setFormData] = useState<Partial<Voucher>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && voucher) {
            setFormData({
                amount: voucher.amount,
                title: voucher.title,
                redemptionRules: voucher.redemptionRules,
                expiresAt: voucher.expiresAt ? new Date(voucher.expiresAt).toISOString().split('T')[0] : '',
            });
        }
    }, [isOpen, voucher]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(voucher.id, {
                ...formData,
                amount: Number(formData.amount),
                // Ensure date string is ISO if changed
                expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : voucher.expiresAt
            });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Voucher">
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput label="Title" name="title" value={formData.title || ''} onChange={handleChange} />
                <FormInput label="Amount" name="amount" type="number" value={formData.amount?.toString() || ''} onChange={handleChange} />
                <div>
                     <label className="block text-sm font-medium mb-1 text-light-text dark:text-dark-text">Redemption Rules</label>
                     <textarea name="redemptionRules" value={formData.redemptionRules || ''} onChange={handleChange} className="w-full p-2 border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text" rows={3} />
                </div>
                <FormInput label="Expiry Date" name="expiresAt" type="date" value={formData.expiresAt?.split('T')[0] || ''} onChange={handleChange} />
                
                <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 border border-light-border dark:border-dark-border rounded-md text-light-text dark:text-dark-text hover:bg-light-background dark:hover:bg-dark-background flex items-center">
                        <XIcon className="w-4 h-4 mr-2" />
                        Cancel
                    </button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark flex items-center">
                        <SaveIcon className="w-4 h-4 mr-2" />
                        Save
                    </button>
                </div>
            </form>
        </Modal>
    );
};
export default EditVoucherModal;
