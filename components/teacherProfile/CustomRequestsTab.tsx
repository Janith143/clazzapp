import React, { useState, useEffect } from 'react';
import { Teacher } from '../../types';
import { CustomClassRequest } from '../../types/customRequest';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { db } from '../../firebase';
import { notifyUser } from '../../utils/notificationHelper';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { SpinnerIcon, CheckCircleIcon, XCircleIcon, ChatBubbleLeftRightIcon, CurrencyDollarIcon, CalendarIcon } from '../Icons';
import Modal from '../Modal';

interface CustomRequestsTabProps {
    teacher: Teacher;
}

const CustomRequestsTab: React.FC<CustomRequestsTabProps> = ({ teacher }) => {
    const { currentUser } = useAuth();
    const { addToast } = useUI();
    const { functionUrls } = useNavigation();
    const [requests, setRequests] = useState<CustomClassRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeStatus, setActiveStatus] = useState<string>('pending');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [editingRequest, setEditingRequest] = useState<CustomClassRequest | null>(null);
    const [editSlots, setEditSlots] = useState<{ date: string, startTime: string, duration: number }[]>([]);
    const [editNote, setEditNote] = useState('');
    const [editHourlyRate, setEditHourlyRate] = useState(0);

    // Messaging State
    const [messageRecipient, setMessageRecipient] = useState<CustomClassRequest | null>(null);
    const [messageText, setMessageText] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);

    const handleMessageClick = (request: CustomClassRequest) => {
        setMessageRecipient(request);
        setMessageText('');
    };

    const handleSendMessage = async () => {
        if (!messageRecipient || !messageText.trim()) return;
        setSendingMessage(true);
        try {
            await notifyUser(
                { id: messageRecipient.studentId, email: messageRecipient.studentEmail, phone: messageRecipient.studentPhone, name: messageRecipient.studentName },
                "New Message from Teacher",
                `${teacher.name} sent a message regarding "${messageRecipient.topic}": "${messageText}"`,
                {
                    type: 'info',
                    link: '/dashboard?tab=requests',
                    notificationUrl: functionUrls.notification,
                    emailHtml: `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <h2>New Message from ${teacher.name}</h2>
                            <p><strong>Topic:</strong> ${messageRecipient.topic}</p>
                            <p><strong>Message:</strong></p>
                            <blockquote style="background: #f9f9f9; border-left: 4px solid #ccc; margin: 10px 0; padding: 10px;">
                                ${messageText}
                            </blockquote>
                            <p><a href="https://clazz.lk/dashboard?tab=requests" style="display:inline-block;padding:10px 20px;background:#3b82f6;color:white;text-decoration:none;border-radius:5px;">Reply in Dashboard</a></p>
                        </div>
                    `
                }
            );
            addToast("Message sent to student.", "success");
            setMessageRecipient(null);
        } catch (error) {
            console.error("Error sending message:", error);
            addToast("Failed to send message.", "error");
        } finally {
            setSendingMessage(false);
        }
    };

    useEffect(() => {
        if (!currentUser || currentUser.id !== teacher.id) return;

        const q = query(
            collection(db, 'customClassRequests'),
            where('teacherId', '==', teacher.id),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedRequests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as CustomClassRequest));
            setRequests(fetchedRequests);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching requests:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser, teacher.id]);

    const handleUpdateStatus = async (requestId: string, newStatus: CustomClassRequest['status']) => {
        setProcessingId(requestId);
        try {
            const updateData: any = {
                status: newStatus,
                updatedAt: serverTimestamp()
            };

            if (newStatus === 'accepted') {
                // Set expiry to 24 hours from now
                const expiry = new Date();
                expiry.setHours(expiry.getHours() + 24);
                updateData.expiresAt = expiry.toISOString();
            }

            await updateDoc(doc(db, 'customClassRequests', requestId), updateData);
            addToast(`Request ${newStatus} successfully`, 'success');

            // Notify Student
            const targetRequest = requests.find(r => r.id === requestId);
            if (targetRequest) {
                const title = newStatus === 'accepted' ? 'Class Request Accepted!' : 'Class Request Rejected';
                const message = newStatus === 'accepted'
                    ? `Good news! ${teacher.name} has accepted your request for "${targetRequest.topic}". Please pay within 24 hours.`
                    : `${teacher.name} has rejected your request for "${targetRequest.topic}".`;
                const type = newStatus === 'accepted' ? 'success' : 'error';

                await notifyUser(
                    { id: targetRequest.studentId, email: targetRequest.studentEmail, phone: targetRequest.studentPhone, name: targetRequest.studentName },
                    title,
                    message,
                    {
                        type,
                        link: '/dashboard?tab=requests',
                        notificationUrl: functionUrls.notification,
                        emailHtml: `
                            <div style="font-family: Arial, sans-serif; color: #333;">
                                <h2>${title}</h2>
                                <p><strong>Teacher:</strong> ${teacher.name}</p>
                                <p><strong>Topic:</strong> ${targetRequest.topic}</p>
                                <p>${message}</p>
                                ${newStatus === 'accepted' ? `<p><strong>Expires in 24 hours.</strong></p><p><a href="https://clazz.lk/dashboard?tab=requests" style="display:inline-block;padding:10px 20px;background:#22c55e;color:white;text-decoration:none;border-radius:5px;">Pay Now to Confirm</a></p>` : ''}
                            </div>
                        `
                    }
                );
            }
        } catch (error) {
            console.error("Error updating status:", error);
            addToast("Failed to update status", 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleSuggestChanges = async () => {
        if (!editingRequest) return;
        setProcessingId(editingRequest.id);

        let totalMinutes = 0;
        editSlots.forEach(s => totalMinutes += s.duration);
        const newTotalCost = Math.ceil((totalMinutes / 60) * editHourlyRate);

        try {
            const updatedSlots = editSlots.map(s => {
                const [hours, minutes] = s.startTime.split(':').map(Number);
                const date = new Date(s.date + 'T00:00:00'); // Ensure date object
                date.setHours(hours, minutes + s.duration);
                const endTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                return {
                    date: s.date,
                    startTime: s.startTime,
                    endTime,
                    durationMinutes: s.duration
                };
            });

            await updateDoc(doc(db, 'customClassRequests', editingRequest.id), {
                status: 'change_requested',
                requestedSlots: updatedSlots,
                totalCost: newTotalCost,
                ratesSnapshot: { hourly: editHourlyRate },
                negotiationHistory: [
                    ...editingRequest.negotiationHistory,
                    {
                        sender: 'teacher',
                        message: editNote,
                        proposedSlots: updatedSlots,
                        proposedCost: newTotalCost,
                        timestamp: new Date().toISOString()
                    }
                ],
                updatedAt: serverTimestamp()
            });

            addToast("Changes suggested to student.", "success");

            // Notify Student
            await notifyUser(
                { id: editingRequest.studentId, email: editingRequest.studentEmail, phone: editingRequest.studentPhone, name: editingRequest.studentName },
                "Changes Proposed by Teacher",
                `${teacher.name} has suggested changes for your "${editingRequest.topic}" request.`,
                {
                    type: 'warning',
                    link: '/dashboard?tab=requests',
                    notificationUrl: functionUrls.notification,
                    emailHtml: `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <h2>Changes Proposed by Teacher</h2>
                            <p><strong>Teacher:</strong> ${teacher.name}</p>
                            <p>the teacher has proposed some changes to the schedule or pricing for your request: "<strong>${editingRequest.topic}</strong>".</p>
                            ${editNote ? `<p><strong>Note:</strong> "${editNote}"</p>` : ''}
                            <p>Please review these changes in your dashboard.</p>
                            <p><a href="https://clazz.lk/dashboard?tab=requests" style="display:inline-block;padding:10px 20px;background:#eab308;color:white;text-decoration:none;border-radius:5px;">Review Changes</a></p>
                        </div>
                    `
                }
            );

            setEditingRequest(null);
        } catch (error) {
            console.error(error);
            addToast("Failed to suggest changes.", "error");
        } finally {
            setProcessingId(null);
        }
    };

    const openEditModal = (req: CustomClassRequest) => {
        setEditingRequest(req);
        setEditSlots(req.requestedSlots.map(s => ({
            date: s.date,
            startTime: s.startTime,
            duration: s.durationMinutes
        })));
        setEditHourlyRate(req.ratesSnapshot.hourly);
        setEditNote('');
    };

    const filteredRequests = requests.filter(req => {
        if (activeStatus === 'history') { // Show rejected/expired/paid in history? Or maybe separate.
            return ['rejected', 'expired'].includes(req.status);
        }
        if (activeStatus === 'scheduled') {
            return ['paid', 'scheduled'].includes(req.status);
        }
        return req.status === activeStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'accepted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'paid':
            case 'scheduled': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className="flex justify-center p-8"><SpinnerIcon className="w-8 h-8 animate-spin text-primary" /></div>;

    return (
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <CurrencyDollarIcon className="w-6 h-6 text-primary" />
                Custom Class Requests
            </h2>

            <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
                {[
                    { id: 'pending', label: 'Pending' },
                    { id: 'change_requested', label: 'Negotiating' },
                    { id: 'accepted', label: 'Accepted (Unpaid)' },
                    { id: 'scheduled', label: 'Scheduled / Paid' },
                    { id: 'history', label: 'History (Rejected/Expired)' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveStatus(tab.id)}
                        className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeStatus === tab.id
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                    >
                        {tab.label}
                        <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
                            {requests.filter(r => {
                                if (tab.id === 'history') return ['rejected', 'expired'].includes(r.status);
                                if (tab.id === 'scheduled') return ['paid', 'scheduled'].includes(r.status);
                                return r.status === tab.id;
                            }).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Request List */}
            <div className="space-y-4">
                {filteredRequests.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p>No requests found in this category.</p>
                    </div>
                ) : (
                    filteredRequests.map(request => (
                        <div key={request.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-primary/50 transition-colors bg-gray-50 dark:bg-dark-background/50">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex-grow">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{request.topic}</h3>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${getStatusColor(request.status)}`}>
                                            {request.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-sm mb-4">
                                        <div>
                                            <span className="text-gray-500 block text-xs">Student</span>
                                            <span className="font-medium">{request.studentName}</span>
                                            <div className="text-xs text-gray-400">{request.studentEmail} • {request.studentPhone}</div>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs">Total Cost</span>
                                            <span className="font-bold text-lg text-primary">LKR {request.totalCost.toLocaleString()}</span>
                                            <span className="text-xs text-gray-400 ml-2">(@ LKR {request.ratesSnapshot.hourly}/hr)</span>
                                        </div>
                                    </div>

                                    {request.message && (
                                        <div className="bg-white dark:bg-dark-surface p-3 rounded-md mb-4 text-sm text-gray-600 dark:text-gray-300 italic border-l-4 border-gray-300 dark:border-gray-600">
                                            "{request.message}"
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-gray-500 uppercase">Requested Slots</span>
                                        <div className="flex flex-wrap gap-2">
                                            {request.requestedSlots.map((slot, idx) => (
                                                <div key={idx} className="flex items-center text-xs bg-white dark:bg-dark-surface px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                                                    <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-primary" />
                                                    <span className="font-medium">{slot.date}</span>
                                                    <span className="mx-1 text-gray-400">|</span>
                                                    <span>{slot.startTime} - {slot.endTime}</span>
                                                    <span className="ml-1.5 text-xs text-gray-400">({slot.durationMinutes}m)</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                {request.status === 'pending' && (
                                    <div className="flex flex-col gap-2 justify-center min-w-[140px] border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 pt-4 md:pt-0 md:pl-4">
                                        <button
                                            onClick={() => handleUpdateStatus(request.id, 'accepted')}
                                            disabled={processingId === request.id}
                                            className="flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                                        >
                                            {processingId === request.id ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4 mr-2" />}
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(request.id, 'rejected')}
                                            disabled={processingId === request.id}
                                            className="flex items-center justify-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                                        >
                                            <XCircleIcon className="w-4 h-4 mr-2" />
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => openEditModal(request)}
                                            className="flex items-center justify-center px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-md transition-colors"
                                        >
                                            Suggest Changes
                                        </button>
                                        <button
                                            onClick={() => handleMessageClick(request)}
                                            className="flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 text-sm font-medium rounded-md transition-colors"
                                        >
                                            <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                                            Chat
                                        </button>
                                    </div>
                                )}
                                {request.status === 'accepted' && (
                                    <div className="flex flex-col gap-2 justify-center min-w-[140px] border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 pt-4 md:pt-0 md:pl-4">
                                        <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300 mb-2">
                                            Waiting for payment
                                        </div>
                                        <button
                                            onClick={() => handleMessageClick(request)}
                                            className="flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 text-sm font-medium rounded-md transition-colors"
                                        >
                                            <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                                            Chat
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Edit/Suggest Modal */}
            {editingRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-lg p-6 animate-fadeIn">
                        <h3 className="text-xl font-bold mb-4">Suggest Alternative</h3>
                        <p className="text-sm text-gray-500 mb-4">Propose different times or price. The student will need to approve these changes.</p>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {/* Slots Editor */}
                            <div>
                                <label className="block text-sm font-bold mb-2">Slots</label>
                                {editSlots.map((slot, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2 items-center">
                                        <input type="date" value={slot.date} onChange={e => {
                                            const newSlots = [...editSlots];
                                            newSlots[idx].date = e.target.value;
                                            setEditSlots(newSlots);
                                        }} className="p-1 border text-sm rounded w-1/3 dark:bg-gray-700" />
                                        <input type="time" value={slot.startTime} onChange={e => {
                                            const newSlots = [...editSlots];
                                            newSlots[idx].startTime = e.target.value;
                                            setEditSlots(newSlots);
                                        }} className="p-1 border text-sm rounded w-1/4 dark:bg-gray-700" />
                                        <select value={slot.duration} onChange={e => {
                                            const newSlots = [...editSlots];
                                            newSlots[idx].duration = Number(e.target.value);
                                            setEditSlots(newSlots);
                                        }} className="p-1 border text-sm rounded w-1/4 dark:bg-gray-700">
                                            <option value={30}>30m</option>
                                            <option value={60}>1h</option>
                                            <option value={90}>1.5h</option>
                                            <option value={120}>2h</option>
                                        </select>
                                        <button onClick={() => setEditSlots(editSlots.filter((_, i) => i !== idx))} className="text-red-500 font-bold px-2">×</button>
                                    </div>
                                ))}
                                <button onClick={() => setEditSlots([...editSlots, { date: '', startTime: '', duration: 60 }])} className="text-xs text-primary font-medium hover:underline">+ Add Slot</button>
                            </div>

                            {/* Price Editor */}
                            <div>
                                <label className="block text-sm font-bold mb-2">Hourly Rate (LKR)</label>
                                <input type="number" value={editHourlyRate} onChange={e => setEditHourlyRate(Number(e.target.value))} className="w-full p-2 border rounded dark:bg-gray-700" />
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-sm font-bold mb-2">Note to Student</label>
                                <textarea value={editNote} onChange={e => setEditNote(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700" placeholder="Reason for change..." rows={2} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setEditingRequest(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded">Cancel</button>
                            <button onClick={handleSuggestChanges} disabled={!!processingId} className="px-4 py-2 bg-primary text-white font-bold rounded hover:bg-primary-dark disabled:opacity-50">
                                {processingId ? 'Sending...' : 'Send Proposal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Message Modal */}
            {
                messageRecipient && (
                    <Modal isOpen={true} onClose={() => setMessageRecipient(null)} title={`Message ${messageRecipient.studentName}`}>
                        <div className="space-y-4">
                            <textarea
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                placeholder="Type your message here..."
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark-background dark:text-gray-100 h-32"
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setMessageRecipient(null)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSendMessage}
                                    disabled={sendingMessage || !messageText.trim()}
                                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                    {sendingMessage ? <SpinnerIcon className="w-5 h-5 animate-spin mr-2" /> : <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />}
                                    Send Message
                                </button>
                            </div>
                        </div>
                    </Modal>
                )
            }
        </div >
    );
};

export default CustomRequestsTab;
