import React, { useEffect, useState } from 'react';
import Modal from '../Modal';
import { useBroadcastActions } from '../../hooks/useBroadcastActions';
import { UserGroupIcon } from '../Icons';
import { BroadcastGroup } from '../../types/broadcast';
import { Loader2 } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';

interface JoinGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentId: string;
    inviteCode?: string;
}

const JoinGroupModal: React.FC<JoinGroupModalProps> = ({ isOpen, onClose, studentId, inviteCode: propInviteCode }) => {
    const { joinGroup, getGroupByInviteCode, loading } = useBroadcastActions();
    const { addToast } = useUI();
    const [code, setCode] = useState(propInviteCode || '');
    const [previewGroup, setPreviewGroup] = useState<BroadcastGroup | null>(null);
    const [checking, setChecking] = useState(false);

    // Reset state when modal opens/closes or prop changes
    useEffect(() => {
        if (isOpen) {
            setPreviewGroup(null);
            setCode(propInviteCode || '');
            if (propInviteCode) {
                handleCheckCode(propInviteCode);
            }
        }
    }, [isOpen, propInviteCode]);

    const handleCheckCode = async (codeToCheck: string) => {
        setChecking(true);
        const group = await getGroupByInviteCode(codeToCheck);
        setChecking(false);
        if (group) {
            setPreviewGroup(group);
        } else {
            addToast("Invalid invite code. Group not found.", "error");
            setPreviewGroup(null);
        }
    };

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();
        if (!code) return;
        handleCheckCode(code);
    };

    const handleJoin = async () => {
        if (!previewGroup) return;
        const result = await joinGroup(studentId, previewGroup.inviteCode);
        if (result) {
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={previewGroup ? "Confirm Group" : "Join Broadcast Group"} size="sm">
            <div className="flex flex-col items-center justify-center p-4">

                {checking ? (
                    <div className="py-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg w-full">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-gray-500 font-medium">Finding group...</p>
                    </div>
                ) : previewGroup ? (
                    <div className="w-full text-center animate-fadeIn">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 mb-4 border-4 border-white dark:border-gray-800 shadow-md">
                            {previewGroup.bannerImage ? (
                                <img src={previewGroup.bannerImage} alt={previewGroup.name} className="h-full w-full object-cover rounded-full" />
                            ) : (
                                <UserGroupIcon className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                            )}
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{previewGroup.name}</h3>
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <span className="text-sm text-gray-500 dark:text-gray-400">by</span>
                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{previewGroup.teacherName}</span>
                        </div>

                        {previewGroup.description && (
                            <div className="text-gray-600 dark:text-gray-300 text-sm mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-left border border-gray-100 dark:border-gray-700">
                                {previewGroup.description}
                            </div>
                        )}

                        <div className="flex items-center justify-center text-xs text-gray-500 mb-6 px-1">
                            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">Code: {previewGroup.inviteCode}</span>
                        </div>

                        <div className="flex gap-3 w-full">
                            <button
                                type="button"
                                className="flex-1 justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none transition"
                                onClick={() => setPreviewGroup(null)}
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={handleJoin}
                                disabled={loading}
                                className="flex-1 justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none disabled:opacity-50 shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 transition transform hover:-translate-y-0.5"
                            >
                                {loading ? 'Joining...' : 'Join Group'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full text-center animate-fadeIn">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 mb-6">
                            <UserGroupIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Have an Invite Code?</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
                            Enter the invite code shared by your teacher to preview and join their broadcast channel.
                        </p>

                        <form onSubmit={handleVerify} className="w-full">
                            <input
                                type="text"
                                required
                                className="block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg border p-4 text-center tracking-[0.2em] uppercase font-mono bg-gray-50 dark:bg-gray-800 dark:text-white mb-6 placeholder:tracking-normal placeholder:normal-case"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="Enter code here"
                            />

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    className="flex-1 justify-center rounded-lg border border-transparent bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition"
                                    onClick={onClose}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !code || checking}
                                    className="flex-1 justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none disabled:opacity-50 transition"
                                >
                                    Find Group
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default JoinGroupModal;
