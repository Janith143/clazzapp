import React, { useEffect, useState } from 'react';
import { useUI } from '../../contexts/UIContext';
import { useBroadcastActions } from '../../hooks/useBroadcastActions';
import { BroadcastGroup } from '../../types/broadcast';
import { UserGroupIcon } from '../Icons';
import { Lock, LogIn, UserPlus } from 'lucide-react';

interface GuestJoinViewProps {
    joinCode: string;
}

const GuestJoinView: React.FC<GuestJoinViewProps> = ({ joinCode }) => {
    const { setModalState } = useUI();
    const { getGroupByInviteCode } = useBroadcastActions();
    const [group, setGroup] = useState<BroadcastGroup | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchGroup = async () => {
            if (!joinCode) return;
            setLoading(true);
            try {
                const groupData = await getGroupByInviteCode(joinCode);
                if (groupData) {
                    setGroup(groupData);
                } else {
                    setError('Group not found or invite code is invalid.');
                }
            } catch (err) {
                setError('Failed to load group details.');
            } finally {
                setLoading(false);
            }
        };

        fetchGroup();
    }, [joinCode, getGroupByInviteCode]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-pulse">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        );
    }

    if (error || !group) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
                <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4">
                    <UserGroupIcon className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Unavailable</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">{error || 'The group you are trying to join does not exist.'}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-8 bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-slideInUp">
                {/* Header Banner Mockup */}
                <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full shadow-lg">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                </div>

                <div className="p-8 text-center space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Join <span className="text-blue-600">{group.name}</span>
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Managed by <span className="font-medium text-gray-700 dark:text-gray-300">{group.teacherName}</span>
                        </p>
                        {group.description && (
                            <p className="mt-4 text-gray-600 dark:text-gray-300 italic text-sm">
                                "{group.description}"
                            </p>
                        )}
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800/50 rounded-xl p-4 text-sm text-yellow-800 dark:text-yellow-200">
                        You need to be logged in to join this broadcast group and receive updates.
                    </div>

                    <div className="space-y-3 pt-2">
                        <button
                            onClick={() => setModalState({ name: 'login', preventRedirect: true })}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-md"
                        >
                            <LogIn className="w-5 h-5" />
                            Log In to Join Group
                        </button>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                            <span className="flex-shrink mx-4 text-xs text-gray-400">New here?</span>
                            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                        </div>

                        <button
                            onClick={() => setModalState({ name: 'register', preventRedirect: true })}
                            className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-3 px-6 rounded-xl transition-all transform hover:scale-[1.02]"
                        >
                            <UserPlus className="w-5 h-5" />
                            Create an Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuestJoinView;
