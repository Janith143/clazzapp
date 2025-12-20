import React, { useEffect } from 'react';
import { useUI } from '../contexts/UIContext.tsx';
import { Toast } from '../types.ts';
import { CheckCircleIcon, XCircleIcon } from './Icons.tsx';

const ToastComponent: React.FC<{ toast: Toast; onRemove: (id: number) => void }> = ({ toast, onRemove }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, 5000); // Auto-dismiss after 5 seconds

        return () => clearTimeout(timer);
    }, [toast.id, onRemove]);

    const typeClasses = {
        success: 'bg-green-100 dark:bg-green-900 border-green-500 text-green-800 dark:text-green-200',
        error: 'bg-red-100 dark:bg-red-900 border-red-500 text-red-800 dark:text-red-200',
        info: 'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-800 dark:text-blue-200',
    };
    
    const icons = {
        success: <CheckCircleIcon className="w-5 h-5" />,
        error: <XCircleIcon className="w-5 h-5" />,
        info: <CheckCircleIcon className="w-5 h-5" />,
    }

    return (
        <div 
            className={`flex items-center w-full max-w-sm p-4 space-x-4 rounded-lg shadow-lg border-l-4 animate-fadeIn ${typeClasses[toast.type]}`}
            role="alert"
        >
            <div className="flex-shrink-0">{icons[toast.type]}</div>
            <div className="text-sm font-medium">{toast.message}</div>
            <button
                type="button"
                className="ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg inline-flex h-8 w-8 hover:bg-white/20"
                onClick={() => onRemove(toast.id)}
                aria-label="Close"
            >
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
            </button>
        </div>
    );
};

const ToastManager: React.FC = () => {
    const { toasts, removeToast } = useUI();

    if (toasts.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-20 right-4 z-50 space-y-3">
            {toasts.map(toast => (
                <ToastComponent key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
        </div>
    );
};

export default ToastManager;
