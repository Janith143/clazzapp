import React, { useState, useEffect } from 'react';
import { Teacher } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import Modal from '../Modal';
import { SpinnerIcon, PlusIcon, TrashIcon } from '../Icons';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { notifyUser } from '../../utils/notificationHelper';
import { useNavigation } from '../../contexts/NavigationContext';

interface RequestCustomClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    teacher: Teacher;
}

const RequestCustomClassModal: React.FC<RequestCustomClassModalProps> = ({ isOpen, onClose, teacher }) => {
    const { currentUser } = useAuth();
    const { addToast } = useUI();
    const { functionUrls } = useNavigation();

    // Form States
    const [topic, setTopic] = useState('');
    const [message, setMessage] = useState('');
    const [slots, setSlots] = useState<{ date: string, startTime: string, duration: number }[]>([
        { date: '', startTime: '', duration: 60 }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cost Calculation
    const [estimatedCost, setEstimatedCost] = useState(0);

    const hourlyRate = teacher.customClassSettings?.rates.hourly || 0;

    useEffect(() => {
        // Calculate total minutes
        let totalMinutes = 0;
        slots.forEach(slot => {
            if (slot.date && slot.startTime && slot.duration) {
                totalMinutes += slot.duration;
            }
        });

        // Simple hourly calculation for now
        const cost = (totalMinutes / 60) * hourlyRate;
        setEstimatedCost(Math.ceil(cost));
    }, [slots, hourlyRate]);

    const handleAddSlot = () => {
        setSlots([...slots, { date: '', startTime: '', duration: 60 }]);
    };

    const handleRemoveSlot = (index: number) => {
        setSlots(slots.filter((_, i) => i !== index));
    };

    const isDateAvailable = (dateString: string) => {
        if (!teacher.customClassSettings?.availability?.days) return true; // Default to all if not set
        const date = new Date(dateString);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        return teacher.customClassSettings.availability.days.includes(dayName);
    };

    const handleSlotChange = (index: number, field: string, value: any) => {
        if (field === 'date') {
            if (!isDateAvailable(value)) {
                addToast(`This teacher is only available on: ${teacher.customClassSettings?.availability.days.join(', ')}`, 'error');
                return;
            }
        }

        const newSlots = [...slots];
        newSlots[index] = { ...newSlots[index], [field]: value };
        setSlots(newSlots);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            addToast("Please login to send a request.", "error");
            return;
        }
        if (!topic.trim()) {
            addToast("Please enter a topic.", "error");
            return;
        }
        if (slots.some(s => !s.date || !s.startTime)) {
            addToast("Please fill in all date and time fields.", "error");
            return;
        }

        // Validate Availability (Buffer & Time Windows)
        const settings = teacher.customClassSettings?.availability;
        if (settings) {
            const now = new Date();
            const bufferMinutes = settings.bufferMinutes || 0;
            const minStartDate = new Date(now.getTime() + bufferMinutes * 60000);

            for (const slot of slots) {
                const slotStart = new Date(`${slot.date}T${slot.startTime}`);
                if (slotStart < minStartDate) {
                    addToast(`Slots must be booked at least ${bufferMinutes} minutes in advance.`, "error");
                    return;
                }

                if (settings.timeWindows && settings.timeWindows.length > 0) {
                    const [slotStartHour, slotStartMin] = slot.startTime.split(':').map(Number);
                    const slotEndTotalMinutes = slotStartHour * 60 + slotStartMin + slot.duration;
                    const slotEndHour = Math.floor(slotEndTotalMinutes / 60);
                    const slotEndMin = slotEndTotalMinutes % 60;
                    const slotEndTimeStr = `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMin).padStart(2, '0')}`;

                    const isValidWindow = settings.timeWindows.some(window => {
                        return slot.startTime >= window.start && slotEndTimeStr <= window.end;
                    });

                    if (!isValidWindow) {
                        addToast(`One or more slots act outside the teacher's available hours.`, "error");
                        return;
                    }
                }
            }
        }

        setIsSubmitting(true);
        try {
            // Check Daily Limit
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const q = query(
                collection(db, 'customClassRequests'),
                where('studentId', '==', currentUser.id),
                where('createdAt', '>=', today)
            );
            const querySnapshot = await getDocs(q);
            if (querySnapshot.size >= 3) {
                addToast("Daily limit reached. You can only send 3 requests per day.", "error");
                setIsSubmitting(false);
                return;
            }

            const requestData = {
                studentId: currentUser.id,
                teacherId: teacher.id,
                studentName: `${currentUser.firstName} ${currentUser.lastName}`,
                studentEmail: currentUser.email,
                studentPhone: currentUser.contactNumber || '',
                topic,
                message,
                requestedSlots: slots.map(s => {
                    // Calculate end time
                    const [hours, minutes] = s.startTime.split(':').map(Number);
                    const date = new Date();
                    date.setHours(hours, minutes + s.duration);
                    const endTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                    return {
                        date: s.date,
                        startTime: s.startTime,
                        endTime: endTime,
                        durationMinutes: s.duration
                    };
                }),
                ratesSnapshot: {
                    hourly: hourlyRate
                },
                totalCost: estimatedCost,
                status: 'pending',
                negotiationHistory: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await addDoc(collection(db, 'customClassRequests'), requestData);

            addToast("Request sent successfully!", "success");

            // Notify Teacher
            await notifyUser(
                { id: teacher.id, email: teacher.email, phone: teacher.contact?.phone, name: teacher.name },
                "New Private Class Request",
                `${currentUser?.firstName} requested a private class: "${topic}"`,
                {
                    type: 'info',
                    link: '/profile?tab=custom_requests',
                    notificationUrl: functionUrls.notification,
                    emailHtml: `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <h2>New Private Class Request</h2>
                            <p><strong>Student:</strong> ${currentUser?.firstName} ${currentUser?.lastName}</p>
                            <p><strong>Topic:</strong> ${topic}</p>
                            <p><strong>Estimated:</strong> LKR ${estimatedCost.toLocaleString()}</p>
                            <p>Please check your dashboard to accept or reject this request.</p>
                            <p><a href="https://clazz.lk/profile?tab=custom_requests" style="display:inline-block;padding:10px 20px;background:#004aad;color:white;text-decoration:none;border-radius:5px;">View Request</a></p>
                        </div>
                    `
                }
            );

            onClose();
            // Reset form
            setTopic('');
            setMessage('');
            setSlots([{ date: '', startTime: '', duration: 60 }]);
        } catch (error) {
            console.error("Error sending request:", error);
            addToast("Failed to send request. Please try again.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Request Private Class" size="lg">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md text-blue-800 dark:text-blue-200 text-sm">
                    <p>Request a custom session with <strong>{teacher.name}</strong>. The teacher will review your request and accept or suggest another time.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic / Subject *</label>
                    <input
                        type="text"
                        required
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        placeholder="e.g. Physics Revision - Mechanics"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message (Optional)</label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        rows={3}
                        placeholder="Any specific requirements..."
                    />
                </div>

                {/* Availability Guide */}
                {teacher.customClassSettings?.availability && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md border border-green-100 dark:border-green-900/40">
                        <h4 className="font-bold text-green-800 dark:text-green-200 text-sm mb-2">Teacher Availability</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-semibold text-green-700 dark:text-green-300 block mb-1">Days:</span>
                                <div className="flex flex-wrap gap-1">
                                    {teacher.customClassSettings.availability.days.map(day => (
                                        <span key={day} className="px-2 py-0.5 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 rounded text-xs">
                                            {day}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="font-semibold text-green-700 dark:text-green-300 block mb-1">Time Windows:</span>
                                <div className="space-y-1">
                                    {teacher.customClassSettings.availability.timeWindows.map((window, idx) => (
                                        <div key={idx} className="text-green-800 dark:text-green-100 text-xs flex items-center">
                                            <span className="w-20">{window.start} - {window.end}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {teacher.customClassSettings.availability.bufferMinutes > 0 && (
                                <div className="col-span-1 sm:col-span-2 mt-1">
                                    <p className="text-xs text-green-700 dark:text-green-300">
                                        * Please book at least {teacher.customClassSettings.availability.bufferMinutes} minutes in advance.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preferred Slots *</label>
                        <button type="button" onClick={handleAddSlot} className="text-sm text-primary hover:underline flex items-center">
                            <PlusIcon className="w-4 h-4 mr-1" /> Add Slot
                        </button>
                    </div>

                    <div className="space-y-3">
                        {slots.map((slot, index) => (
                            <div key={index} className="flex flex-col sm:flex-row gap-3 items-end bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 mb-1 block">Date</label>
                                    <input
                                        type="date"
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                        value={slot.date}
                                        onChange={(e) => handleSlotChange(index, 'date', e.target.value)}
                                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm"
                                    />
                                </div>
                                <div className="w-full sm:w-32">
                                    <label className="text-xs text-gray-500 mb-1 block">Start Time</label>
                                    <input
                                        type="time"
                                        required
                                        value={slot.startTime}
                                        onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm"
                                    />
                                </div>
                                <div className="w-full sm:w-32">
                                    <label className="text-xs text-gray-500 mb-1 block">Duration</label>
                                    <select
                                        value={slot.duration}
                                        onChange={(e) => handleSlotChange(index, 'duration', Number(e.target.value))}
                                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm"
                                    >
                                        <option value={30}>30 min</option>
                                        <option value={60}>1 hour</option>
                                        <option value={90}>1.5 hours</option>
                                        <option value={120}>2 hours</option>
                                    </select>
                                </div>
                                {slots.length > 1 && (
                                    <button type="button" onClick={() => handleRemoveSlot(index)} className="text-red-500 hover:bg-red-50 p-2 rounded-md">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t pt-4 dark:border-gray-700">
                    <div className="flex justify-between items-center text-lg font-bold">
                        <span>Estimated Cost:</span>
                        <span className="text-primary">LKR {estimatedCost.toLocaleString()}</span>
                    </div>
                    <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-md border border-yellow-100 dark:border-yellow-800/30">
                        <p className="text-xs text-yellow-800 dark:text-yellow-200 font-medium">
                            ⚠️ Disclaimer: Final schedule is subject to teacher approval.
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            Cancellation Policy: Requests cancelled by the student after acceptance but before payment incur no fee. Paid classes cancelled less than 24 hours before start time are non-refundable.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-md">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-primary text-white font-bold rounded-md hover:bg-primary-dark disabled:opacity-50 flex items-center"
                    >
                        {isSubmitting ? <SpinnerIcon className="w-5 h-5 animate-spin mr-2" /> : null}
                        Send Request
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default RequestCustomClassModal;
