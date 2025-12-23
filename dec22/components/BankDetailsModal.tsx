import React, { useState, useEffect } from 'react';
import { PayoutDetails } from '../types.ts';
import Modal from './Modal.tsx';
import FormInput from './FormInput.tsx';
import { SaveIcon, XIcon } from './Icons.tsx';

interface BankDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: PayoutDetails) => void;
  initialData?: PayoutDetails | null;
}

const emptyDetails: PayoutDetails = {
    bankName: '',
    branchName: '',
    accountHolderName: '',
    accountNumber: '',
};

const BankDetailsModal: React.FC<BankDetailsModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [details, setDetails] = useState<PayoutDetails>(initialData || emptyDetails);

  useEffect(() => {
    if (isOpen) {
      setDetails(initialData || emptyDetails);
    }
  }, [isOpen, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(details);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Bank Details for Payouts">
        <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-light-subtle dark:text-dark-subtle -mt-2">
                This information is kept confidential and is used solely for processing your earnings withdrawals.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput label="Bank Name" name="bankName" value={details.bankName} onChange={handleChange} required placeholder="e.g., Sampath Bank" />
                <FormInput label="Branch Name" name="branchName" value={details.branchName} onChange={handleChange} required placeholder="e.g., Head Office" />
            </div>
            <FormInput label="Account Holder Name" name="accountHolderName" value={details.accountHolderName} onChange={handleChange} required placeholder="As it appears on your bank statement" />
            <FormInput label="Account Number" name="accountNumber" value={details.accountNumber} onChange={handleChange} required placeholder="e.g., 1234567890" />
            
            <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={onClose} className="inline-flex items-center justify-center px-4 py-2 border border-light-border dark:border-dark-border text-sm font-medium rounded-md shadow-sm text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface hover:bg-light-border dark:hover:bg-dark-border/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors">
                    <XIcon className="w-4 h-4 mr-2"/>
                    Cancel
                </button>
                <button type="submit" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors">
                    <SaveIcon className="w-4 h-4 mr-2"/>
                    Save Details
                </button>
            </div>
        </form>
    </Modal>
  );
};

export default BankDetailsModal;