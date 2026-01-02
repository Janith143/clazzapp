import React, { useState } from 'react';
import { Teacher } from '../../types';
import { useBroadcastData } from '../../hooks/useBroadcastData';
import CreateGroupModal from './CreateGroupModal';
import TeacherChatView from './TeacherChatView';
import { UserGroupIcon } from '../Icons';
import { Plus, MessageSquare, Share2 } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';

interface TeacherGroupsTabProps {
    teacher: Teacher;
}

const TeacherGroupsTab: React.FC<TeacherGroupsTabProps> = ({ teacher }) => {
    const { groups, loading } = useBroadcastData(teacher.id, undefined);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const { addToast } = useUI();

    const handleCopyInvite = (code: string) => {
        const inviteLink = `${window.location.origin}/dashboard?tab=groups&join=${code}`;
        navigator.clipboard.writeText(inviteLink);
        addToast("Invite link copied to clipboard", "success");
    };

    if (selectedGroupId) {
        const selectedGroup = groups.find(g => g.id === selectedGroupId);
        if (!selectedGroup) return <div>Group not found</div>;
        return (
            <TeacherChatView
                groupId={selectedGroupId}
                teacherId={teacher.id}
                groupName={selectedGroup.name}
                onBack={() => setSelectedGroupId(null)}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Broadcast Groups</h3>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="w-5 h-5" />
                    Create Group
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-500">Loading groups...</div>
            ) : groups.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <UserGroupIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">You haven't created any broadcast groups yet.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {groups.map((group) => (
                        <div key={group.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <UserGroupIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleCopyInvite(group.inviteCode)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition"
                                        title="Copy Invite Link"
                                    >
                                        <Share2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">{group.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 h-10">
                                {group.description || "No description"}
                            </p>

                            <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono">
                                    Code: {group.inviteCode}
                                </span>
                                <span>{group.memberCount || 0} students</span>
                            </div>

                            <button
                                onClick={() => setSelectedGroupId(group.id)}
                                className="w-full py-2.5 flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition"
                            >
                                <MessageSquare className="w-4 h-4" />
                                Open Chat
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <CreateGroupModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                teacherId={teacher.id}
                teacherName={teacher.name}
            />
        </div>
    );
};

export default TeacherGroupsTab;
