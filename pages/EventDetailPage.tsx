
import React, { useMemo, useState, useEffect } from 'react';
import { Event, Teacher, TuitionInstitute, Photo, PhotoPrintOption } from '../types.ts';
import { ChevronLeftIcon, ClockIcon, CalendarIcon, MapPinIcon, OnlineIcon, UserCircleIcon, BanknotesIcon, SpinnerIcon } from '../components/Icons.tsx';
import Countdown from '../components/Countdown.tsx';
import { getDynamicEventStatus } from '../utils.ts';
import { useData } from '../contexts/DataContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useNavigation } from '../contexts/NavigationContext.tsx';
import { useUI } from '../contexts/UIContext.tsx';
import ConfirmationModal from '../components/ConfirmationModal.tsx';
import MarkdownDisplay from '../components/MarkdownDisplay.tsx';
import { useSEO } from '../hooks/useSEO.ts';
import TeacherCard from '../components/TeacherCard.tsx';
import PhotoCard from '../components/PhotoCard.tsx';

interface EventDetailPageProps {
    eventId: string;
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

const EventPhotoGallery: React.FC<{ event: Event }> = ({ event }) => {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState(10);
    const { favoritePhotos } = useUI();
    const { photoPrintOptions, functionUrls, gDriveFetcherApiKey } = useNavigation();

    useEffect(() => {
        if (!event.gallery?.googleDriveLink) {
            setIsLoading(false);
            return;
        }

        const fetchPhotos = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // IMPORTANT: Replace this with your deployed Cloud Function URL after deployment.
                const response = await fetch(functionUrls.gDriveFetcher, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: event.gallery.googleDriveLink,
                        apiKey: gDriveFetcherApiKey,
                    }),
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Failed to fetch photos.');
                }

                setPhotos(data.photos);

            } catch (err: any) {
                setError(err.message);
                console.error("Failed to fetch photos from Google Drive:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPhotos();
    }, [event.gallery?.googleDriveLink]);

    if (!event.gallery?.isEnabled || !event.gallery?.googleDriveLink) {
        return null;
    }

    const visiblePhotos = photos.slice(0, visibleCount);
    const downloadPrice = event.gallery.downloadPrice || 0;
    const downloadPriceHighRes = event.gallery.downloadPriceHighRes || 0;
    const printOptions = photoPrintOptions;

    return (
        <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Event Gallery</h2>
            {isLoading && <div className="flex justify-center items-center h-24"><div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-primary"></div></div>}
            {error && <p className="text-red-500 text-center">{error}</p>}
            {!isLoading && !error && photos.length > 0 && (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {visiblePhotos.map(photo => (
                            <PhotoCard
                                key={photo.id}
                                photo={photo}
                                isFavorite={favoritePhotos.includes(photo.id)}
                                downloadPrice={downloadPrice}
                                downloadPriceHighRes={downloadPriceHighRes}
                                printOptions={printOptions}
                                eventId={event.id}
                                instituteId={event.organizerId}
                            />
                        ))}
                    </div>
                    {visibleCount < photos.length && (
                        <div className="text-center mt-8">
                            <button
                                onClick={() => setVisibleCount(prev => prev + 10)}
                                className="px-6 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark transition-colors"
                            >
                                Load More Photos
                            </button>
                        </div>
                    )}
                </>
            )}
            {!isLoading && !error && photos.length === 0 && (
                <p className="text-light-subtle dark:text-dark-subtle text-center py-8">No photos found in the gallery or the folder is not shared correctly.</p>
            )}
        </div>
    );
};

const MiniTeacherCard: React.FC<{ teacher: Teacher, onClick: () => void }> = ({ teacher, onClick }) => (
    <button onClick={onClick} className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-light-border dark:hover:bg-dark-border transition-colors">
        <img src={teacher.avatar} alt={teacher.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
        <div className="text-left">
            <p className="font-semibold text-light-text dark:text-dark-text">{teacher.name}</p>
            <p className="text-xs text-light-subtle dark:text-dark-subtle">{teacher.tagline}</p>
        </div>
    </button>
);


const EventDetailPage: React.FC<EventDetailPageProps> = ({ eventId }) => {
    const { currentUser } = useAuth();
    const { handleBack, handleNavigate } = useNavigation();
    const { setModalState } = useUI();
    const { teachers, tuitionInstitutes, handleEnroll, sales, loading: dataLoading } = useData();

    const { event, organizer } = useMemo(() => {
        for (const ti of tuitionInstitutes) {
            const foundEvent = (ti.events || []).find(e => e.id === eventId);
            if (foundEvent) return { event: foundEvent, organizer: ti };
        }
        return { event: null, organizer: null };
    }, [tuitionInstitutes, eventId]);

    const isEnrolled = useMemo(() => {
        if (!currentUser || !event) return false;
        return sales.some(s => s.studentId === currentUser.id && s.itemId === event.id && s.itemType === 'event' && s.status === 'completed');
    }, [currentUser, sales, event]);

    const participatingTeachers = useMemo(() => {
        if (!event) return [];
        return teachers.filter(t => event.participatingTeacherIds.includes(t.id));
    }, [teachers, event]);

    useSEO(
        event ? event.title : 'Event Details',
        event ? (event.description || '').substring(0, 160) : 'View event details on clazz.lk',
        event ? event.flyerImage : undefined
    );

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
                        <img src={event.flyerImage} alt={event.title} className="w-full h-auto object-cover" crossOrigin="anonymous" />
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
                                        <MiniTeacherCard key={teacher.id} teacher={teacher} onClick={() => handleNavigate({ name: 'teacher_profile', teacherId: teacher.id })} />
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
