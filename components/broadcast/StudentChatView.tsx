import React, { useEffect, useRef } from 'react';
import { useBroadcastData } from '../../hooks/useBroadcastData';
import { format } from 'date-fns';
import { Paperclip, ArrowLeft } from 'lucide-react';
import { useBroadcastActions } from '../../hooks/useBroadcastActions';

interface StudentChatViewProps {
    groupId: string;
    studentId: string;
    groupName: string;
    onBack: () => void;
}

const StudentChatView: React.FC<StudentChatViewProps> = ({ groupId, studentId, groupName, onBack }) => {
    const { messages, loading } = useBroadcastData(undefined, groupId);
    const { markGroupAsRead } = useBroadcastActions();

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    };

    useEffect(() => {
        scrollToBottom();
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            markGroupAsRead(studentId, groupId, lastMsg.id);
        }
    }, [messages, studentId, groupId, markGroupAsRead]);

    return (
        <div className="flex flex-col h-[600px] bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button onClick={onBack} className="mr-3 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-white">{groupName}</h3>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/20">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 italic">
                        No messages yet.
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="flex justify-start">
                            <div className="max-w-[85%] bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-600">
                                <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">
                                    Teacher {groupName ? `(${groupName})` : ''}
                                </div>
                                {msg.type === 'image' && msg.attachmentUrl && (
                                    <div className="mb-2 rounded-lg overflow-hidden">
                                        <img src={msg.attachmentUrl} alt="Attachment" className="max-w-full h-auto" />
                                    </div>
                                )}
                                {msg.type === 'file' && msg.attachmentUrl && (
                                    <a
                                        href={msg.attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 bg-gray-100 dark:bg-gray-600 p-2 rounded mb-2 hover:bg-gray-200 dark:hover:bg-gray-500 transition text-sm"
                                    >
                                        <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                        <span className="truncate text-blue-600 dark:text-blue-300">View Attachment</span>
                                    </a>
                                )}
                                {msg.content && <p className="whitespace-pre-wrap text-sm md:text-base">{msg.content}</p>}
                                <div className="text-[10px] text-gray-400 mt-1 text-right">
                                    {format(new Date(msg.createdAt), 'h:mm a')}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
};

export default StudentChatView;
