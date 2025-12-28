import React from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { ChevronRightIcon } from './Icons';

interface NotFoundStateProps {
    title?: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
}

const NotFoundState: React.FC<NotFoundStateProps> = ({
    title = "We couldn't find that page",
    message = "The link you followed may be broken, or the page may have been removed.",
    actionLabel = "Go to Home",
    onAction
}) => {
    const { handleNavigate } = useNavigation();

    const handleAction = () => {
        if (onAction) {
            onAction();
        } else {
            handleNavigate({ name: 'home' });
        }
    };

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center animate-fadeIn">
            <div className="mb-6 relative">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mb-2">
                {title}
            </h2>

            <p className="text-light-subtle dark:text-dark-subtle max-w-md mb-8">
                {message}
            </p>

            <button
                onClick={handleAction}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
            >
                {actionLabel}
                <ChevronRightIcon className="ml-2 -mr-1 h-5 w-5" />
            </button>
        </div>
    );
};

export default NotFoundState;
