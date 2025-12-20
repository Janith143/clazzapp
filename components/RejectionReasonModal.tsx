import React, { useState, useEffect } from 'react';
import Modal from './Modal.tsx';
import { XCircleIcon, CheckCircleIcon } from './Icons.tsx';

interface RejectionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const RejectionReasonModal: React.FC<RejectionReasonModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (reason.trim()) {
      onSubmit(reason.trim());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Provide Rejection Reason">
      <div className="space-y-4">
        <p className="text-sm text-light-subtle dark:text-dark-subtle">
          Please provide a clear reason for rejecting this document. This will be shown to the teacher.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-light-border dark:border-dark-border placeholder-light-subtle dark:placeholder-dark-subtle text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder="e.g., The name on the ID does not match the profile name."
        />
        <div className="pt-4 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center px-4 py-2 border border-light-border dark:border-dark-border text-sm font-medium rounded-md shadow-sm text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface hover:bg-light-border dark:hover:bg-dark-border/50"
          >
            <XCircleIcon className="w-4 h-4 mr-2" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!reason.trim()}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            <CheckCircleIcon className="w-4 h-4 mr-2" />
            Submit Rejection
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RejectionReasonModal;
