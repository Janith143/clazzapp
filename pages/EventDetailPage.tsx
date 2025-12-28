
import React, { useMemo, useState, useEffect } from 'react';
import { Event, Teacher, TuitionInstitute, Photo, PhotoPrintOption } from '../types.ts';
import { ChevronLeftIcon, ClockIcon, CalendarIcon, MapPinIcon, OnlineIcon, UserCircleIcon, BanknotesIcon, SpinnerIcon } from '../components/Icons.tsx';
import Countdown from '../components/Countdown.tsx';
import { getDynamicEventStatus, getOptimizedImageUrl } from '../utils.ts';
import { useData } from '../contexts/DataContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useNavigation } from '../contexts/NavigationContext.tsx';
import { useUI } from '../contexts/UIContext.tsx';
import ConfirmationModal from '../components/ConfirmationModal.tsx';
import MarkdownDisplay from '../components/MarkdownDisplay.tsx';
import { useSEO } from '../hooks/useSEO.ts';
import SEOHead from '../components/SEOHead.tsx';
import TeacherCard from '../components/TeacherCard.tsx';
import PhotoCard from '../components/PhotoCard.tsx';

import { slugify } from '../utils/slug.ts';

interface EventDetailPageProps {
    eventId?: string;
    slug?: string;
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

const MiniTeacherCard: React.FC<{ teacher: Teacher, onClick: () => void }> = ({ teacher, onClick }) => (
    <div onClick={onClick} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-light-background dark:hover:bg-dark-background cursor-pointer transition-colors border border-transparent hover:border-light-border dark:hover:border-dark-border">
        <img src={getOptimizedImageUrl(teacher.profileImage, 48, 48)} alt={teacher.name} className="w-10 h-10 rounded-full object-cover" />
        <div>
            <p className="font-semibold text-sm text-light-text dark:text-dark-text">{teacher.name}</p>
            <p className="text-xs text-light-subtle dark:text-dark-subtle truncate max-w-[150px]">{teacher.tagline}</p>
        </div>
    </div>
);

const EventPhotoGallery: React.FC<{ event: Event }> = ({ event }) => {
    if (!event.photos || event.photos.length === 0) return null;
    return (
        <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Event Photos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {event.photos.map((photo, index) => (
                    <PhotoCard key={index} photo={photo} />
                ))}
            </div>
        </div>
    );
};

const EventDetailPage: React.FC<EventDetailPageProps> = ({ eventId, slug }) => {
    const { currentUser } = useAuth();
    const { handleBack, handleNavigate } = useNavigation();
    const { setModalState } = useUI();
    const { teachers, tuitionInstitutes, handleEnroll, sales, loading: dataLoading } = useData();

    const { event, organizer } = useMemo(() => {
        for (const ti of tuitionInstitutes) {
            let foundEvent = (ti.events || []).find(e => e.id === eventId);
            if (!foundEvent && slug) {
                foundEvent = (ti.events || []).find(e => slugify(e.title) === slug);
            }
            if (foundEvent) return { event: foundEvent, organizer: ti };
        }
        return { event: null, organizer: null };
    }, [tuitionInstitutes, eventId, slug]);

    const isEnrolled = useMemo(() => {
        if (!currentUser || !event) return false;
        return sales.some(s => s.studentId === currentUser.id && s.itemId === event.id && s.itemType === 'event' && s.status === 'completed');
    }, [currentUser, sales, event]);

    const participatingTeachers = useMemo(() => {
        if (!event) return [];
        return teachers.filter(t => event.participatingTeacherIds.includes(t.id));
    }, [teachers, event]);

    const structuredData = useMemo(() => {
        if (!event || !organizer) return null;
        return {
            "@context": "https://schema.org",
            "@type": "Event",
            "name": event.title,
            "description": event.description || '',
            "startDate": `${event.startDate}T${event.startTime}`,
            "endDate": `${event.startDate}T${event.endTime || '23:59'}`, // Fallback if end time missing
            "eventStatus": "https://schema.org/EventScheduled",
            "organizer": {
                "@type": "Organization",
                "name": organizer.name,
            },
            "image": event.flyerImage ? [event.flyerImage] : [],
            "offers": {
                "@type": "Offer",
                "price": 0, // Events might be free or have tickets, assuming generic for now or 0
                "priceCurrency": "LKR",
                "availability": "https://schema.org/InStock"
            }
        };
    }, [event, organizer]);

    const [isConfirmingEnrollment, setIsConfirmingEnrollment] = useState(false);

    const dynamicStatus = useMemo(() => event ? getDynamicEventStatus(event) : 'scheduled', [event]);

    if (dataLoading) {
        return (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center flex flex-col items-center justify-center">
                <SpinnerIcon className="w-8 h-8 text-primary" />
                <p className="mt-4 text-light-subtle dark:text-dark-subtle">Loading event details...</p>
            </div>
        );
    }

    if (!event || !organizer) {
        return <div>Event not found. It may have been removed by the organizer.</div>;
    }

    const handleEnrollClick = () => {
        if (!currentUser) {
            setModalState({ name: 'login', preventRedirect: true });
        } else {
            setIsConfirmingEnrollment(true);
        }
    };

    const handleConfirmEnrollment = () => {
        handleEnroll(event, 'event');
        setIsConfirmingEnrollment(false);
    };

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });
    const eventStartDateTime = new Date(`${event.startDate}T${event.startTime}`);
    const registrationDeadline = new Date(event.registrationDeadline);

    const getButtonText = () => {
        if (dynamicStatus === 'canceled') return 'Event Canceled';
        if (dynamicStatus === 'finished') return 'Event Finished';
        if (isEnrolled) return "You are Registered";
        if (new Date() > registrationDeadline) return "Registration Closed";
        if (currentUser?.role === 'teacher' || currentUser?.role === 'admin') {
            return "Only students can enroll";
        }
        return "Register Now";
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slideInUp">
            <SEOHead
                title={event ? event.title : 'Event Details'}
                description={event ? (event.description || '').substring(0, 160) : 'View event details on clazz.lk'}
                image={event ? event.flyerImage : undefined}
                structuredData={structuredData}
            />
            <div className="mb-4">
                <button onClick={handleBack} className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors">
                    <ChevronLeftIcon className="h-5 w-5" />
                    <span>Back</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg overflow-hidden">
                        <img src={getOptimizedImageUrl(event.flyerImage, 800)} alt={event.title} className="w-full h-auto object-cover" crossOrigin="anonymous" />
                    </div>

                    <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 uppercase tracking-wider">{event.category}</span>
                        <h1 className="mt-3 text-3xl md:text-4xl font-bold">{event.title}</h1>
                        <div className="mt-4">
                            <MarkdownDisplay content={event.description} />
                        </div>
                        <div className="mt-6">
                            <p className="text-sm text-light-subtle dark:text-dark-subtle">Organized by</p>
                            <p className="font-semibold text-lg">{organizer.name}</p>
                        </div>
                    </div>
                    <EventPhotoGallery event={event} />
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-8">
                        <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-6 space-y-4">
                            {dynamicStatus === 'scheduled' && (
                                <div className="pb-4 border-b border-light-border dark:border-dark-border">
                                    <h3 className="font-bold text-center text-lg mb-2">Event Starts In</h3>
                                    <Countdown targetDate={eventStartDateTime} completionMessage="Event is starting!" />
                                </div>
                            )}
                            <p className="text-3xl font-bold text-primary">{event.tickets.price > 0 ? currencyFormatter.format(event.tickets.price) : 'Free'}</p>
                            <button onClick={handleEnrollClick} disabled={isEnrolled || dynamicStatus !== 'scheduled' || new Date() > registrationDeadline || currentUser?.role === 'teacher' || currentUser?.role === 'admin'} className="w-full bg-primary text-white font-bold py-3 rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                                {getButtonText()}
                            </button>
                            <div className="pt-4 border-t border-light-border dark:border-dark-border space-y-3 text-sm">
                                <DetailItem icon={<CalendarIcon />} label="Date" value={`${new Date(event.startDate).toLocaleDateString()} - ${new Date(event.endDate).toLocaleDateString()}`} />
                                <DetailItem icon={<ClockIcon />} label="Time" value={`${event.startTime} - {event.endTime}`} />
                                <DetailItem icon={<OnlineIcon />} label="Mode" value={event.mode} />
                                {event.mode !== 'Online' && <DetailItem icon={<MapPinIcon />} label="Venue" value={event.venue} />}
                                <DetailItem icon={<UserCircleIcon />} label="Max Participants" value={event.tickets.maxParticipants ? `${event.tickets.maxParticipants}` : 'Unlimited'} />
                            </div>
                        </div>

                        {participatingTeachers.length > 0 && (
                            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                                <h2 className="text-xl font-bold mb-4">Participating Teachers</h2>
                                <div className="space-y-2">
                                    {participatingTeachers.map(teacher => (
                                        <MiniTeacherCard
                                            key={teacher.id}
                                            teacher={teacher}
                                            onClick={() => {
                                                if (teacher.username) {
                                                    handleNavigate({ name: 'teacher_profile_slug', slug: teacher.username });
                                                } else {
                                                    handleNavigate({ name: 'teacher_profile', teacherId: teacher.id });
                                                }
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {isConfirmingEnrollment && (
                <ConfirmationModal isOpen={true} onClose={() => setIsConfirmingEnrollment(false)} onConfirm={handleConfirmEnrollment} title={`Confirm Registration: ${event.title}`} message="Are you sure you want to register for this event?" confirmText="Yes, Register" />
            )}
        </div>
    );
};

export default EventDetailPage;
