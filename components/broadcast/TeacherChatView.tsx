import React, { useState, useRef, useEffect } from 'react';
import { useBroadcastActions } from '../../hooks/useBroadcastActions';
import { useBroadcastData } from '../../hooks/useBroadcastData';
import { BroadcastMessage } from '../../types/broadcast';
import { format } from 'date-fns';
import { Send, Image as ImageIcon, Paperclip, X, ArrowLeft, Trash2 } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';

interface TeacherChatViewProps {
    groupId: string;
    teacherId: string;
    groupName: string;
    onBack: () => void;
}

const TeacherChatView: React.FC<TeacherChatViewProps> = ({ groupId, teacherId, groupName, onBack }) => {
    const { messages, loading } = useBroadcastData(undefined, groupId);
    const { postMessage, loading: sending } = useBroadcastActions();
    const { addToast } = useUI();

    const [text, setText] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() && !selectedFile) return;

        const success = await postMessage(groupId, teacherId, text, selectedFile || undefined);
        if (success) {
            setText('');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
            addToast("Failed to send message", "error");
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    return (
        <div className="flex flex-col h-[600px] bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button onClick={onBack} className="mr-3 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-white">{groupName}</h3>
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">Broadcast Channel</p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/20">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 italic">
                        No messages yet. Start broadcasting!
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="flex justify-end">
                            <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
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
                                        className="flex items-center gap-2 bg-blue-700 p-2 rounded mb-2 hover:bg-blue-800 transition text-sm"
                                    >
                                        <Paperclip className="w-4 h-4" />
                                        <span className="truncate">{msg.attachmentName || 'Attachment'}</span>
                                    </a>
                                )}
                                {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                                <div className="text-[10px] text-blue-100 mt-1 text-right">
                                    {format(new Date(msg.createdAt), 'h:mm a')}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                {selectedFile && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg max-w-max">
                        <span className="text-xs font-medium truncate max-w-[200px] text-gray-700 dark:text-gray-300">
                            {selectedFile.name}
                        </span>
                        <button onClick={() => setSelectedFile(null)} className="text-gray-500 hover:text-red-500">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <form onSubmit={handleSend} className="flex items-end gap-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-full transition"
                        title="Attach File"
                    >
                        <ImageIcon className="w-5 h-5" />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                    // accept="image/*,.pdf,.doc,.docx" // Optional restriction
                    />

                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500/50 transition">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Type a broadcast message..."
                            rows={1}
                            className="w-full bg-transparent border-none focus:ring-0 resize-none p-1 max-h-32 text-gray-800 dark:text-white placeholder-gray-500"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={(!text.trim() && !selectedFile) || sending}
                        className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition shadow-sm"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TeacherChatView;
