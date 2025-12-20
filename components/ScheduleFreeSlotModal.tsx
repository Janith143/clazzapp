import React, { useState, useEffect } from 'react';
import Modal from './Modal.tsx';
import FormInput from './FormInput.tsx';
import { SaveIcon, XIcon } from './Icons.tsx';
import { IndividualClass } from '../types.ts';
import MarkdownEditor from './MarkdownEditor.tsx';

interface ScheduleFreeSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (slotDetails: IndividualClass) => void;
  teacherId: string;
}

const ScheduleFreeSlotModal: React.FC<ScheduleFreeSlotModalProps> = ({ isOpen, onClose, onSave, teacherId }) => {
    const [slotDetails, setSlotDetails] = useState({
        date: '',
        startTime: '',
        endTime: '',
        fee: '',
        description: '',
        joiningLink: '',
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setError('');
            setSlotDetails({
                date: '',
                startTime: '',
                endTime: '',
                fee: '',
                description: '',
                joiningLink: '',
            });
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSlotDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (slotDetails.joiningLink) {
            try {
                new URL(slotDetails.joiningLink);
            } catch (_) {
                setError('The provided joining link is not a valid URL. Please include https://');
                return;
            }
        }

        const selectedDateTime = new Date(`${slotDetails.date}T${slotDetails.startTime}`);
        const now = new Date();
        if (selectedDateTime < now) {
            setError('Cannot schedule a slot in the past. Please select a future date or time.');
            return;
        }

        const finalSlot: IndividualClass = {
            id: Date.now(),
            teacherId: teacherId,
            title: "Free Slot",
            subject: "1-on-1 Consultation", // A sensible default subject
            description: slotDetails.description,
            date: slotDetails.date,
            startTime: slotDetails.startTime,
            endTime: slotDetails.endTime,
            fee: parseFloat(slotDetails.fee) || 0,
            currency: 'LKR',
            targetAudience: 'Any', // Sensible default
            mode: 'Online',
            joiningLink: slotDetails.joiningLink,
            recurrence: 'none',
            status: 'scheduled',
            isPublished: true, // Publish by default
            paymentMethod: 'platform',
            isFreeSlot: true,
        };

        onSave(finalSlot);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Schedule a 1-on-1 Slot">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-light-subtle dark:text-dark-subtle -mt-2">
                    This creates a single-enrollment, 1-on-1 online slot. It will be unpublished automatically once a student enrolls.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label="Date" name="date" type="date" value={slotDetails.date} onChange={handleChange} required />
                    <FormInput label="Fee (LKR)" name="fee" type="number" value={slotDetails.fee} onChange={handleChange} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label="Start Time" name="startTime" type="time" value={slotDetails.startTime} onChange={handleChange} required />
                    <FormInput label="End Time" name="endTime" type="time" value={slotDetails.endTime} onChange={handleChange} required />
                </div>
                <FormInput
                    label="Online Joining Link (Zoom, Meet, etc.)"
                    name="joiningLink"
                    type="url"
                    value={slotDetails.joiningLink}
                    onChange={handleChange}
                    placeholder="e.g., https://zoom.us/j/1234567890"
                />
                <MarkdownEditor
                    label="Description (Optional)"
                    id="free-slot-description"
                    name="description"
                    value={slotDetails.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Briefly describe what this slot is for (e.g., 'Paper discussion', 'Doubt clearing session')."
                />
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <div className="pt-4 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="inline-flex items-center justify-center px-4 py-2 border border-light-border dark:border-dark-border text-sm font-medium rounded-md shadow-sm text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface hover:bg-light-border dark:hover:bg-dark-border/50">
                        <XIcon className="w-4 h-4 mr-2"/>
                        Cancel
                    </button>
                    <button type="submit" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark">
                        <SaveIcon className="w-4 h-4 mr-2"/>
                        Save Slot
                    </button>
                </div>
            </form>
        </Modal>
    );
};
export default ScheduleFreeSlotModal;