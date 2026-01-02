import React from 'react';
import { Lock, LogIn, UserPlus } from 'lucide-react';
import { UserGroupIcon } from './Icons';

interface GuestActionPromptProps {
    title: string;
    subtitle?: string;
    description?: string;
    reason?: string;
    onLogin: () => void;
    onSignup: () => void;
    icon?: React.ReactNode;
}

const GuestActionPrompt: React.FC<GuestActionPromptProps> = ({
    title,
    subtitle,
    description,
    reason = "You need to be logged in to access this content.",
    onLogin,
    onSignup,
    icon
}) => {
    return (
        <div className="flex flex-col items-center justify-center p-4">
            {/* Header Banner - simulating the look of GuestJoinView but adapted for modal content */}
            <div className="w-full h-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-xl relative flex items-center justify-center -mt-6 -mx-6 mb-6">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full shadow-lg">
                    {icon || <Lock className="w-6 h-6 text-white" />}
                </div>
            </div>

            <div className="text-center space-y-4 w-full">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {subtitle}
                        </p>
                    )}
                    {description && (
                        <p className="mt-2 text-gray-600 dark:text-gray-300 italic text-sm">
                            "{description}"
                        </p>
                    )}
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800/50 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
                    {reason}
                </div>

                <div className="space-y-3 pt-2 w-full">
                    <button
                        onClick={onLogin}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all transform hover:scale-[1.02] shadow-md"
                    >
                        <LogIn className="w-5 h-5" />
                        Log In
                    </button>

                    <div className="relative flex py-1 items-center">
                        <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                        <span className="flex-shrink mx-4 text-xs text-gray-400">New here?</span>
                        <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                    </div>

                    <button
                        onClick={onSignup}
                        className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2.5 px-4 rounded-lg transition-all transform hover:scale-[1.02]"
                    >
                        <UserPlus className="w-5 h-5" />
                        Create an Account
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuestActionPrompt;
