import React, { useState, useEffect } from 'react';
import { User } from '../../types/user';
import { CustomClassRequest } from '../../types/customRequest';
import { PaymentMethod } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { db } from '../../firebase';
import { notifyUser } from '../../utils/notificationHelper';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { SpinnerIcon, CheckCircleIcon, XCircleIcon, ChatBubbleLeftRightIcon, CurrencyDollarIcon, CalendarIcon, InboxIcon, CreditCardIcon } from '../Icons';
import Modal from '../Modal';
import PaymentMethodSelector from '../PaymentMethodSelector';
import { useCustomRequestPayment } from '../../hooks/transactions/useCustomRequestPayment';

interface MyRequestsProps {
    student: User;
}

const MyRequests: React.FC<MyRequestsProps> = ({ student }) => {
    const { addToast } = useUI();
    const { functionUrls, paymentGatewaySettings } = useNavigation();
    const { currentUser } = useAuth(); // Need currentUser for hook dependencies if passed, though hook uses its own.
    // Actually hook expects deps: { currentUser, ui, nav }
    // Let's create the deps object.
    // Wait, typical use pattern for these actions hooks is `const actions = useDataActions({ currentUser, ... })`.
    // But useCustomRequestPayment is a standalone hook.
    // Let's see how I defined it: `export const useCustomRequestPayment = (deps: CustomRequestPaymentDeps) => { ... }`
    // So I need to call it with deps.

    // Better way: The hook *returns* the handler.
    const ui = useUI();
    const nav = useNavigation();
    const { handleCustomRequestPayment } = useCustomRequestPayment({ currentUser: student, ui, nav }); // Passing student as currentUser since this component is for student.
    // Ideally useAuth().currentUser but 'student' prop is passed. 'student' should be 'currentUser' effectively.

    const [requests, setRequests] = useState<CustomClassRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [teacherData, setTeacherData] = useState<{ [key: string]: { name: string; email?: string } }>({});

    const [selectedRequestForPayment, setSelectedRequestForPayment] = useState<CustomClassRequest | null>(null);

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
            const teacher = teacherData[messageRecipient.teacherId];
            await notifyUser(
                { id: messageRecipient.teacherId, email: teacher?.email },
                "New Message from Student",
                `${student.firstName} sent a message regarding "${messageRecipient.topic}": "${messageText}"`,
                {
                    type: 'info',
                    link: '/profile?tab=custom_requests',
                    notificationUrl: functionUrls.notification,
                    emailHtml: `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <h2>New Message from ${student.firstName}</h2>
                            <p><strong>Topic:</strong> ${messageRecipient.topic}</p>
                            <p><strong>Message:</strong></p>
                            <blockquote style="background: #f9f9f9; border-left: 4px solid #ccc; margin: 10px 0; padding: 10px;">
                                ${messageText}
                            </blockquote>
                            <p><a href="https://clazz.lk/profile?tab=custom_requests" style="display:inline-block;padding:10px 20px;background:#3b82f6;color:white;text-decoration:none;border-radius:5px;">Reply in Dashboard</a></p>
                        </div>
                    `
                }
            );
            addToast("Message sent to teacher.", "success");
            setMessageRecipient(null);
        } catch (error) {
            console.error("Error sending message:", error);
            addToast("Failed to send message.", "error");
        } finally {
            setSendingMessage(false);
        }
    };

    useEffect(() => {
        if (!student) return;

        const q = query(
            collection(db, 'customClassRequests'),
            where('studentId', '==', student.id),
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
            addToast("Failed to load requests. Please try refreshing.", 'error');
            setLoading(false);
        });

        return () => unsubscribe();
    }, [student.id, addToast]); // Added addToast to dependency

    // Separate effect to fetch teacher details based on requests
    useEffect(() => {
        const fetchTeachers = async () => {
            const uniqueTeacherIds = Array.from(new Set(requests.map(r => r.teacherId)));
            const missingIds = uniqueTeacherIds.filter(id => !teacherData[id]);

            if (missingIds.length === 0) return;

            const newTeachers: { [key: string]: { name: string; email?: string } } = {};
            let hasUpdates = false;

            await Promise.all(missingIds.map(async (tId) => {
                try {
                    const teacherDoc = await getDoc(doc(db, 'teachers', tId));
                    if (teacherDoc.exists()) {
                        const data = teacherDoc.data();
                        newTeachers[tId] = { name: data.name, email: data.contact?.email };
                        hasUpdates = true;
                    } else {
                        newTeachers[tId] = { name: 'Unknown Teacher' };
                        hasUpdates = true;
                    }
                } catch (err) {
                    console.error(`Error fetching teacher ${tId}:`, err);
                }
            }));

            if (hasUpdates) {
                setTeacherData(prev => ({ ...prev, ...newTeachers }));
            }
        };

        if (requests.length > 0) {
            fetchTeachers();
        }
    }, [requests, teacherData]);

    const handleAcceptChanges = async (requestId: string) => {
        setProcessingId(requestId);
        try {
            await updateDoc(doc(db, 'customClassRequests', requestId), {
                status: 'accepted',
                updatedAt: serverTimestamp()
            });
            addToast("Changes accepted! You can now proceed to payment.", "success");

            // Notify Teacher
            const request = requests.find(r => r.id === requestId);
            if (request) {
                const teacherInfo = teacherData[request.teacherId];
                await notifyUser(
                    { id: request.teacherId, email: teacherInfo?.email },
                    "Student Accepted Changes",
                    `${student.firstName} accepted your suggested changes for "${request.topic}".`,
                    {
                        type: 'success',
                        link: '/profile?tab=custom_requests',
                        notificationUrl: functionUrls.notification
                    }
                );
            }
        } catch (error) {
            console.error("Error accepting changes:", error);
            addToast("Failed to accept changes.", "error");
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectChanges = async (requestId: string) => {
        if (!window.confirm("Are you sure you want to reject these changes? This will cancel the request.")) return;
        setProcessingId(requestId);
        try {
            await updateDoc(doc(db, 'customClassRequests', requestId), {
                status: 'rejected',
                updatedAt: serverTimestamp()
            });
            addToast("Request cancelled.", "info");

            // Notify Teacher
            const request = requests.find(r => r.id === requestId);
            if (request) {
                await notifyUser(
                    { id: request.teacherId },
                    "Student Cancelled Request",
                    `${student.firstName} rejected your changes and cancelled the request for "${request.topic}".`,
                    {
                        type: 'warning',
                        link: '/profile?tab=custom_requests',
                    }
                );
            }
        } catch (error) {
            console.error("Error rejecting changes:", error);
            addToast("Failed to reject changes.", "error");
        } finally {
            setProcessingId(null);
        }
    };

    const handlePayClick = (request: CustomClassRequest) => {
        setSelectedRequestForPayment(request);
    };

    const handlePaymentMethodSelected = (method: PaymentMethod) => {
        if (selectedRequestForPayment) {
            handleCustomRequestPayment(selectedRequestForPayment, method);
            setSelectedRequestForPayment(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'change_requested': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
            case 'accepted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'paid':
            case 'scheduled': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className="flex justify-center p-8"><SpinnerIcon className="w-8 h-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <InboxIcon className="w-8 h-8 text-primary" />
                My Private Class Requests
            </h2>

            {requests.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-dark-surface rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-gray-500 text-lg">You haven't made any private class requests yet.</p>
                    <p className="text-sm text-gray-400 mt-2">Visit a teacher's profile to request a custom class.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {requests.map(request => (
                        <div key={request.id} className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700 hover:border-primary/50 transition-colors">
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="flex-grow">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-bold text-xl text-gray-900 dark:text-white">{request.topic}</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                with <span className="font-medium text-gray-700 dark:text-gray-300">{teacherData[request.teacherId]?.name || 'Loading...'}</span>
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(request.status)}`}>
                                            {request.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                                        <div className="flex items-center text-gray-700 dark:text-gray-300">
                                            <CurrencyDollarIcon className="w-5 h-5 mr-2 text-gray-400" />
                                            <span className="font-bold text-lg">LKR {request.totalCost.toLocaleString()}</span>
                                            <span className="text-xs text-gray-400 ml-2">(@ {request.ratesSnapshot.hourly}/hr)</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex flex-wrap gap-2">
                                            {request.requestedSlots.map((slot, idx) => (
                                                <div key={idx} className="flex items-center text-xs bg-gray-50 dark:bg-dark-background px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                                                    <CalendarIcon className="w-4 h-4 mr-2 text-primary" />
                                                    <span className="font-medium">{slot.date}</span>
                                                    <span className="mx-2 text-gray-400">|</span>
                                                    <span>{slot.startTime} - {slot.endTime}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 pt-4 md:pt-0 md:pl-6 min-w-[200px]">
                                    {request.status === 'accepted' && (() => {
                                        const now = new Date();
                                        const expiry = request.expiresAt ? new Date(request.expiresAt) : null;
                                        const isExpired = expiry && now > expiry;
                                        const timeLeft = expiry ? Math.max(0, expiry.getTime() - now.getTime()) : 0;
                                        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                                        const minsLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

                                        return (
                                            <div className="space-y-2">
                                                {expiry && !isExpired && (
                                                    <div className="text-xs text-center text-orange-600 font-medium bg-orange-50 dark:bg-orange-900/20 py-1 rounded">
                                                        Expires in {hoursLeft}h {minsLeft}m
                                                    </div>
                                                )}
                                                {isExpired ? (
                                                    <div className="text-center text-xs text-red-600 font-medium bg-red-50 py-2 rounded">
                                                        Request Expired
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handlePayClick(request)}
                                                        disabled={processingId === request.id}
                                                        className="w-full flex items-center justify-center px-4 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                                    >
                                                        {processingId === request.id ? <SpinnerIcon className="w-5 h-5 animate-spin mr-2" /> : <CreditCardIcon className="w-5 h-5 mr-2" />}
                                                        Pay Now
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    {request.status === 'pending' && (
                                        <div className="text-center text-sm text-gray-500 italic px-4 py-2 bg-gray-50 dark:bg-dark-background rounded-lg">
                                            Waiting for teacher approval
                                        </div>
                                    )}
                                    {request.status === 'paid' && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-center px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                                                <CheckCircleIcon className="w-5 h-5 mr-2" />
                                                Confirmed
                                            </div>
                                            {/* Cancellation Logic */}
                                            {(() => {
                                                const firstSlot = request.requestedSlots[0];
                                                if (!firstSlot) return null;
                                                const start = new Date(`${firstSlot.date}T${firstSlot.startTime}`);
                                                const now = new Date();
                                                const diffHours = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

                                                return (
                                                    <button
                                                        onClick={() => {
                                                            if (diffHours < 24) {
                                                                alert("Classes cancelled less than 24 hours in advance are non-refundable.");
                                                            }
                                                            handleRejectChanges(request.id);
                                                        }}
                                                        className="w-full text-xs text-red-500 hover:text-red-700 hover:underline text-center"
                                                    >
                                                        Cancel Class
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleMessageClick(request)}
                                        className="w-full flex items-center justify-center px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 dark:bg-transparent dark:text-gray-300 dark:border-gray-600 dark:hover:bg-dark-background font-medium rounded-lg transition-colors text-sm"
                                    >
                                        <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                                        Message Teacher
                                    </button>

                                    {request.status === 'change_requested' && (
                                        <div className="mt-2 space-y-2">
                                            <div className="text-xs text-orange-600 dark:text-orange-400 font-medium bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
                                                Teacher suggested changes. Please review cost/slots.
                                            </div>
                                            <button
                                                onClick={() => handleAcceptChanges(request.id)}
                                                disabled={!!processingId}
                                                className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded shadow-sm disabled:opacity-50"
                                            >
                                                Accept Changes
                                            </button>
                                            <button
                                                onClick={() => handleRejectChanges(request.id)}
                                                disabled={!!processingId}
                                                className="w-full px-3 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded disabled:opacity-50"
                                            >
                                                Reject/Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Payment Modal */}
            {selectedRequestForPayment && (
                <Modal isOpen={true} onClose={() => setSelectedRequestForPayment(null)} title="Select Payment Method">
                    <PaymentMethodSelector onSelect={handlePaymentMethodSelected} paymentGatewaySettings={paymentGatewaySettings} />
                </Modal>
            )}

            {/* Message Modal */}
            {messageRecipient && (
                <Modal isOpen={true} onClose={() => setMessageRecipient(null)} title={`Message ${teacherData[messageRecipient.teacherId]?.name || 'Teacher'}`}>
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
            )}
        </div>
    );
};

export default MyRequests;
