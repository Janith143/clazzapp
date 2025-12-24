import React from 'react';
import Modal from './Modal.tsx';
// FIX: Import Event type and EventIcon
import { Course, IndividualClass, Quiz, Teacher, Lecture, Event } from '../types.ts';
import { getOptimizedImageUrl } from '../utils.ts';
import { ClockIcon, CalendarIcon, MapPinIcon, OnlineIcon, UserCircleIcon, BookOpenIcon, VideoCameraIcon, ClipboardListIcon, BanknotesIcon, EventIcon } from './Icons.tsx';

interface PurchasedItemDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    // FIX: Update item prop to include Event
    item: Course | IndividualClass | Quiz | Event;
    // FIX: Update teacher prop to be a generic person object
    teacher: Teacher | { name: string; avatar: string; };
}

const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value?: string | React.ReactNode; }> = ({ icon, label, value }) => (
    <div className="flex items-start">
        <div className="flex-shrink-0 w-5 h-5 text-light-subtle dark:text-dark-subtle mt-1">{icon}</div>
        <div className="ml-3">
            <p className="text-sm font-medium text-light-subtle dark:text-dark-subtle">{label}</p>
            <div className="text-md font-semibold text-light-text dark:text-dark-text">{value || '-'}</div>
        </div>
    </div>
);

const renderClassDetails = (item: IndividualClass, currencyFormatter: Intl.NumberFormat) => {
    const formattedDate = new Date(item.date).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    return (
        <div className="space-y-4">
            <p className="text-light-text dark:text-dark-text">{item.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-light-border dark:border-dark-border">
                <DetailItem icon={<BanknotesIcon />} label="Fee" value={currencyFormatter.format(item.fee)} />
                <DetailItem icon={<UserCircleIcon />} label="Target Audience" value={item.targetAudience} />
                <DetailItem icon={<CalendarIcon />} label={item.recurrence === 'weekly' ? `Weekly on ${new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}s` : "Date"} value={item.recurrence !== 'weekly' ? formattedDate : `Starts ${formattedDate}`} />
                <DetailItem icon={<ClockIcon />} label="Time" value={`${item.startTime} - ${item.endTime}`} />
                <DetailItem icon={<OnlineIcon />} label="Mode" value={item.mode} />
                {(item.mode === 'Physical' || item.mode === 'Both') && (
                    <DetailItem icon={<MapPinIcon />} label="Location" value={[item.institute, item.town, item.district].filter(Boolean).join(', ')} />
                )}
            </div>
        </div>
    );
};

const renderCourseDetails = (item: Course, currencyFormatter: Intl.NumberFormat) => {
    const totalDurationHours = item.lectures.reduce((acc, l) => acc + l.durationMinutes, 0) / 60;
    return (
        <div className="space-y-4">
            <p className="text-light-text dark:text-dark-text">{item.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-light-border dark:border-dark-border">
                <DetailItem icon={<BanknotesIcon />} label="Fee" value={currencyFormatter.format(item.fee)} />
                <DetailItem icon={<BookOpenIcon />} label="Lectures" value={item.lectures.length} />
                <DetailItem icon={<ClockIcon />} label="Total Duration" value={`${totalDurationHours.toFixed(1)} hours`} />
            </div>
            <div>
                <h3 className="font-semibold text-lg mt-4 mb-2 text-light-text dark:text-dark-text">Lectures</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {item.lectures.map((lecture, index) => (
                        <div key={lecture.id} className="flex items-start p-2 bg-light-background dark:bg-dark-background rounded-md">
                            <span className="font-bold text-sm text-light-subtle dark:text-dark-subtle mr-3 mt-0.5">{index + 1}</span>
                            <div>
                                <p className="font-medium text-light-text dark:text-dark-text">{lecture.title}</p>
                                <p className="text-xs text-light-subtle dark:text-dark-subtle">{lecture.durationMinutes} mins</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const renderQuizDetails = (item: Quiz, currencyFormatter: Intl.NumberFormat) => {
    return (
        <div className="space-y-4">
            <p className="text-light-text dark:text-dark-text">{item.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-light-border dark:border-dark-border">
                <DetailItem icon={<BanknotesIcon />} label="Fee" value={currencyFormatter.format(item.fee)} />
                <DetailItem icon={<ClipboardListIcon />} label="Questions" value={`${item.questions.length} questions`} />
                <DetailItem icon={<CalendarIcon />} label="Date" value={new Date(item.date).toLocaleDateString()} />
                <DetailItem icon={<ClockIcon />} label="Time" value={`${item.startTime} (${item.durationMinutes} mins)`} />
            </div>
        </div>
    );
};

// FIX: Add renderEventDetails function
const renderEventDetails = (item: Event, currencyFormatter: Intl.NumberFormat) => {
    const formattedDate = new Date(item.startDate).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    });
    return (
        <div className="space-y-4">
            <p className="text-light-text dark:text-dark-text">{item.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-light-border dark:border-dark-border">
                <DetailItem icon={<BanknotesIcon />} label="Price" value={currencyFormatter.format(item.tickets.price)} />
                <DetailItem icon={<UserCircleIcon />} label="Category" value={item.category} />
                <DetailItem icon={<CalendarIcon />} label="Date" value={`${formattedDate}`} />
                <DetailItem icon={<ClockIcon />} label="Time" value={`${item.startTime} - ${item.endTime}`} />
                <DetailItem icon={<OnlineIcon />} label="Mode" value={item.mode} />
                {(item.mode === 'Physical' || item.mode === 'Hybrid') && (
                    <DetailItem icon={<MapPinIcon />} label="Venue" value={item.venue} />
                )}
            </div>
        </div>
    );
};


const PurchasedItemDetailModal: React.FC<PurchasedItemDetailModalProps> = ({ isOpen, onClose, item, teacher }) => {
    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });

    let content: React.ReactNode = null;
    let icon: React.ReactNode = null;
    let typeLabel = '';

    // FIX: Update logic to handle Event type
    if ('organizerId' in item) { // This is an Event
        content = renderEventDetails(item, currencyFormatter);
        icon = <EventIcon className="w-6 h-6" />;
        typeLabel = 'Event Details';
    } else if ('lectures' in item) {
        content = renderCourseDetails(item, currencyFormatter);
        icon = <BookOpenIcon className="w-6 h-6" />;
        typeLabel = 'Course Details';
    } else if ('questions' in item) {
        content = renderQuizDetails(item, currencyFormatter);
        icon = <ClipboardListIcon className="w-6 h-6" />;
        typeLabel = 'Quiz Details';
    } else {
        content = renderClassDetails(item, currencyFormatter);
        icon = <VideoCameraIcon className="w-6 h-6" />;
        typeLabel = 'Class Details';
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Purchased Item Details" size="3xl">
            <div className="space-y-6">
                <div className="p-4 bg-light-background dark:bg-dark-background rounded-lg border border-light-border dark:border-dark-border">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="flex items-center px-3 py-1 text-sm font-semibold rounded-full bg-primary/10 text-primary-dark dark:text-primary-light uppercase tracking-wider">
                                {icon}
                                <span className="ml-2">{typeLabel}</span>
                            </span>
                            <h2 className="mt-2 text-2xl font-bold text-light-text dark:text-dark-text">{item.title}</h2>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                            <img src={getOptimizedImageUrl(teacher.avatar, 48, 48)} alt={teacher.name} className="w-12 h-12 rounded-full ml-auto shadow-md" />
                            <p className="text-sm font-semibold mt-1 text-light-text dark:text-dark-text">{teacher.name}</p>
                            <p className="text-xs text-light-subtle dark:text-dark-subtle">Purchased Version</p>
                        </div>
                    </div>
                </div>
                {content}
            </div>
        </Modal>
    );
};

export default PurchasedItemDetailModal;
