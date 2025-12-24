import React from 'react';
import { User } from '../types.ts';
import Modal from './Modal.tsx';
import { MailIcon, PhoneIcon, MapPinIcon } from './Icons.tsx';
import { getOptimizedImageUrl } from '../utils.tsx';

interface StudentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: User;
}

const DetailItem: React.FC<{ icon: React.ReactNode, label: string, value?: string }> = ({ icon, label, value }) => (
    <div className="flex items-start">
        <div className="flex-shrink-0 w-6 h-6 text-primary mt-1">{icon}</div>
        <div className="ml-4">
            <p className="text-sm font-medium text-light-subtle dark:text-dark-subtle">{label}</p>
            {value ? (
                <p className="text-md text-light-text dark:text-dark-text">{value}</p>
            ) : (
                <p className="text-md text-light-subtle dark:text-dark-subtle italic">Not provided</p>
            )}
        </div>
    </div>
);


const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({ isOpen, onClose, student }) => {
    if (!isOpen) return null;

    const fullAddress = student.address
        ? [student.address.line1, student.address.line2, student.address.city, student.address.state, student.address.postalCode, student.address.country].filter(Boolean).join(', ')
        : undefined;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Student Details">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 p-4">
                <img
                    src={getOptimizedImageUrl(student.avatar, 96, 96)}
                    alt={`${student.firstName} ${student.lastName}`}
                    className="w-24 h-24 rounded-full object-cover flex-shrink-0 border-2 border-primary"
                />
                <div className="text-center sm:text-left">
                    <h2 className="text-2xl font-bold">{student.firstName} {student.lastName}</h2>
                    <p className="text-primary">{student.email}</p>
                </div>
            </div>
            <div className="mt-6 border-t border-light-border dark:border-dark-border pt-6 space-y-4">
                <DetailItem icon={<MailIcon />} label="Email Address" value={student.email} />
                <DetailItem icon={<PhoneIcon />} label="Contact Number" value={student.contactNumber} />
                <DetailItem icon={<MapPinIcon />} label="Address" value={fullAddress} />
            </div>
            <div className="mt-6 text-center text-xs text-light-subtle dark:text-dark-subtle">
                <p>Please use this information responsibly and in accordance with our privacy policy.</p>
            </div>
        </Modal>
    );
};

export default StudentDetailsModal;