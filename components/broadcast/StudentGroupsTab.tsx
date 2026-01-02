import React, { useState } from 'react';
import { User as StudentUser } from '../../types';
import { useBroadcastData } from '../../hooks/useBroadcastData';
import JoinGroupModal from './JoinGroupModal';
import StudentChatView from './StudentChatView';
import { UserGroupIcon } from '../Icons';
import { Plus, Bell, ChevronRight } from 'lucide-react';

interface StudentGroupsTabProps {
    student: StudentUser;
    autoJoinCode?: string;
}

const StudentGroupsTab: React.FC<StudentGroupsTabProps> = ({ student, autoJoinCode }) => {
    const { groups, loading } = useBroadcastData(undefined, undefined, student.id);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    // Auto-open join modal if code provided
    React.useEffect(() => {
        if (autoJoinCode) {
            setIsJoinModalOpen(true);
        }
    }, [autoJoinCode]);

    if (selectedGroupId) {
        const selectedGroup = groups.find(g => g.id === selectedGroupId);
        if (!selectedGroup) return <div>Group not found</div>;
        return (
            <StudentChatView
                groupId={selectedGroupId}
                studentId={student.id}
                groupName={selectedGroup.name}
                onBack={() => setSelectedGroupId(null)}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">My Groups</h3>
                <button
                    onClick={() => setIsJoinModalOpen(true)}
                    className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                    <Plus className="w-5 h-5" />
                    Join New Group
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-500">Loading your groups...</div>
            ) : groups.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <UserGroupIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">You haven't joined any broadcast groups yet.</p>
                    <button
                        onClick={() => setIsJoinModalOpen(true)}
                        className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Join a Group
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {groups.map((group) => {
                        const hasUnread = group.hasUnread;

                        return (
                            <button
                                key={group.id}
                                onClick={() => setSelectedGroupId(group.id)}
                                className="w-full text-left bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition flex items-center gap-4"
                            >
                                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                                    <UserGroupIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h4 className="font-semibold text-gray-900 dark:text-white truncate pr-2">{group.name}</h4>
                                        {/* Optional: Time of last message */}
                                        {/* <span className="text-xs text-gray-500">2m ago</span> */}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[80%]">
                                            Click to view latest announcements
                                        </p>
                                        {hasUnread && (
                                            <div className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </button>
                        );
                    })}
                </div>
            )}

            <JoinGroupModal
                isOpen={isJoinModalOpen}
                onClose={() => setIsJoinModalOpen(false)}
                studentId={student.id}
                inviteCode={autoJoinCode}
            />
        </div>
    );
};

export default StudentGroupsTab;
