import React from 'react';
import Modal from './Modal.tsx';
import { CheckCircleIcon, XCircleIcon } from './Icons.tsx';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  children?: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  children,
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div>
        <div className="text-center">
          <p className="text-md text-light-subtle dark:text-dark-subtle mb-6">{message}</p>
        </div>
        {children}
        <div className={`flex justify-center space-x-4 ${children ? 'mt-6' : ''}`}>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center px-6 py-2 border border-light-border dark:border-dark-border text-sm font-medium rounded-md shadow-sm text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface hover:bg-light-border dark:hover:bg-dark-border/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors"
          >
            <XCircleIcon className="w-5 h-5 mr-2" />
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
             <CheckCircleIcon className="w-5 h-5 mr-2" />
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
