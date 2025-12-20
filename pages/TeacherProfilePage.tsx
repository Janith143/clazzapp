
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Teacher, IndividualClass, Quiz, EditableImageType, ScheduleItem, Notification, Product, Sale, Photo } from '../types';
import ProfileHeader from '../components/ProfileHeader';
import ProfileTabs from '../components/ProfileTabs';
import { DownloadIcon, UserPlusIcon, CheckCircleIcon, SpinnerIcon, XIcon, PlayCircleIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/Icons';
import ScheduleClassModal from '../components/ScheduleClassModal';
import ScheduleQuizModal from '../components/ScheduleQuizModal';
import ConfirmationModal from '../components/ConfirmationModal';
import TeacherProfileCompletionModal from '../components/teacherProfile/TeacherProfileCompletionModal';
import ProgressBar from '../components/ProgressBar';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { useNavigation } from '../contexts/NavigationContext';
import MarkdownDisplay from '../components/MarkdownDisplay';
import { useSEO } from '../hooks/useSEO';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, writeBatch, increment, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { getDynamicClassStatus, getDynamicQuizStatus, calculateTeacherProfileCompletion, getYoutubeVideoId } from '../utils';
import ScheduleFreeSlotModal from '../components/ScheduleFreeSlotModal';
import Modal from '../components/Modal';
import { YouTubePlayer } from '../components/YouTubePlayer';
import ImageViewerModal from '../components/ImageViewerModal';


// Tab Components
import TeacherClassesTab from '../components/teacherProfile/TeacherClassesTab';
import TeacherCoursesTab from '../components/teacherProfile/TeacherCoursesTab';
import TeacherQuizzesTab from '../components/teacherProfile/TeacherQuizzesTab';
import TeacherProductsTab from '../components/teacherProfile/TeacherProductsTab';
import EarningsDashboard from '../components/teacherProfile/EarningsDashboard';
import TimeTable from '../components/teacherProfile/TimeTable';
import ContactSection from '../components/teacherProfile/ContactSection';
import AttendanceSummaryTable from '../components/ti/AttendanceSummaryTable';
import TeacherEventsTab from '../components/teacherProfile/TeacherEventsTab';
import TeacherPastClassesTab from '../components/teacherProfile/TeacherPastClassesTab';

// Inlined TeacherNotificationsTab Component
const TeacherNotificationsTab: React.FC<{ teacher: Teacher }> = ({ teacher }) => {
    const { handleSendNotification } = useData();
    const [content, setContent] = useState('');
    const [target, setTarget] = useState<'all_followers' | 'class'>('all_followers');
    const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
    const [sentNotifications, setSentNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'notifications'), where('teacherId', '==', teacher.id), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const notifs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            setSentNotifications(notifs);
        });
        return () => unsubscribe();
    }, [teacher.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setLoading(true);

        let notificationTarget: Notification['target'];
        if (target === 'class' && selectedClassId) {
            const selectedClass = teacher.individualClasses.find(c => c.id === selectedClassId);
            if (!selectedClass) {
                alert("Selected class not found.");
                setLoading(false);
                return;
            }
            notificationTarget = { type: 'class', classId: selectedClass.id, className: selectedClass.title };
        } else {
            notificationTarget = 'all_followers';
        }

        await handleSendNotification(teacher.id, content, notificationTarget);
        setContent('');
        setLoading(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4">Send a Notification</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="notification-content" className="block text-sm font-medium mb-1">Message</label>
                        <textarea
                            id="notification-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={4}
                            maxLength={250}
                            className="w-full p-2 border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background focus:ring-primary focus:border-primary"
                            placeholder="Announce a new class, share an update, etc."
                            required
                        />
                        <p className="text-xs text-right text-light-subtle dark:text-dark-subtle">{content.length} / 250</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Target Audience</label>
                        <select
                            value={target}
                            onChange={(e) => setTarget(e.target.value as any)}
                            className="w-full p-2 border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background"
                        >
                            <option value="all_followers">All Followers</option>
                            <option value="class">Students of a specific class</option>
                        </select>
                    </div>
                    {target === 'class' && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Select Class</label>
                            <select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(Number(e.target.value))}
                                className="w-full p-2 border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background"
                                required
                            >
                                <option value="" disabled>-- Select a class --</option>
                                {teacher.individualClasses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>
                    )}
                    <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-2 rounded-md hover:bg-primary-dark disabled:opacity-50">
                        {loading ? 'Sending...' : 'Send Notification'}
                    </button>
                </form>
            </div>
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4">Sent History</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {sentNotifications.length > 0 ? sentNotifications.map(notif => (
                        <div key={notif.id} className="p-3 border-b border-light-border dark:border-dark-border">
                            <p className="text-sm text-light-text dark:text-dark-text">{notif.content}</p>
                            <div className="text-xs text-light-subtle dark:text-dark-subtle mt-2 flex justify-between">
                                <span>{new Date(notif.createdAt).toLocaleString()}</span>
                                <span className="font-semibold">{notif.target === 'all_followers' ? 'To All Followers' : `To class: ${(notif.target as any).className}`}</span>
                            </div>
                        </div>
                    )) : <p className="text-center text-sm text-light-subtle dark:text-dark-subtle py-8">No notifications sent yet.</p>}
                </div>
            </div>
        </div>
    );
};


interface TeacherProfilePageProps {
    teacherId?: string;
    slug?: string;
}

const TeacherProfilePage: React.FC<TeacherProfilePageProps> = ({ teacherId, slug }) => {
    const { currentUser } = useAuth();
    const { sales, teachers, users, handleUpdateTeacher, handleSaveClass, handleSaveQuiz, handleCancelItem, handleRequestWithdrawal, handleSaveBankDetails, handleVerificationUpload, handleVerificationDecision, handleTogglePublishState, handleRemoveCoverImageFromArray, handleFollowToggle, handleDeleteQuizSubmissions, tuitionInstitutes, handleUpdatePhysicalOrderStatus, loading: dataLoading, processMonthlyPayouts } = useData();
    const { openImageUploadModal, addToast } = useUI();
    const { handleNavigate, teacherDashboardMessage, functionUrls, gDriveFetcherApiKey } = useNavigation();

    const teacher = useMemo(() => {
        if (teacherId) return teachers.find(t => t.id === teacherId);
        if (slug) return teachers.find(t => t.username === slug);
        return null;
    }, [teachers, teacherId, slug]);

    const { percentage: profileCompletion, missing: missingItems } = calculateTeacherProfileCompletion(teacher);

    useSEO(
        teacher ? `${teacher.name} | clazz.lk` : 'Teacher Profile | clazz.lk',
        teacher ? teacher.tagline || teacher.bio.substring(0, 160) : 'View teacher profile on clazz.lk',
        teacher ? teacher.profileImage : undefined
    );

    const isOwnProfile = currentUser?.id === teacher?.userId;
    const isAdminView = currentUser?.role === 'admin';
    const canEdit = isOwnProfile || isAdminView;

    const followerCount = isOwnProfile ? teacher?.followers?.length || 0 : undefined;

    const isFollowing = useMemo(() => currentUser?.followingTeacherIds?.includes(teacher?.id || '') || false, [currentUser, teacher]);

    const [activeTab, setActiveTab] = useState('overview');

    // Modal states
    const [classToEdit, setClassToEdit] = useState<IndividualClass | null>(null);
    const [isScheduleClassModalOpen, setIsScheduleClassModalOpen] = useState(false);
    const [isScheduleFreeSlotModalOpen, setIsScheduleFreeSlotModalOpen] = useState(false);
    const [quizToEdit, setQuizToEdit] = useState<Quiz | null>(null);
    const [isScheduleQuizModalOpen, setIsScheduleQuizModalOpen] = useState(false);
    const [itemToCancel, setItemToCancel] = useState<{ id: number | string, type: 'class' | 'quiz' } | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ id: string | number, type: 'course' | 'product' | 'class', enrollmentCount?: number } | null>(null);
    const [selectedClassForAttendance, setSelectedClassForAttendance] = useState<IndividualClass | null>(null);
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const [isCheckingPayouts, setIsCheckingPayouts] = useState(true);
    const [isMessageDismissed, setIsMessageDismissed] = useState(true);
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

    // State for video showcase
    const [showAllVideos, setShowAllVideos] = useState(false);
    const INITIAL_VIDEO_COUNT = 8;
    const youtubeLinks = teacher?.youtubeLinks?.filter(Boolean) || [];
    const videosToShow = showAllVideos ? youtubeLinks : youtubeLinks.slice(0, INITIAL_VIDEO_COUNT);

    // State for image gallery showcase
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [viewingImage, setViewingImage] = useState<{ url: string, title: string } | null>(null);
    const [showAllImages, setShowAllImages] = useState(false);
    const INITIAL_IMAGE_COUNT = 5;

    useEffect(() => {
        if (!teacher?.googleDriveLink) {
            setPhotos([]);
            return;
        }

        const fetchPhotos = async () => {
            setIsLoadingPhotos(true);
            setPhotoError(null);
            try {
                const response = await fetch(functionUrls.gDriveFetcher, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: teacher.googleDriveLink,
                        apiKey: gDriveFetcherApiKey,
                    }),
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Failed to fetch photos. Please ensure the link is a public Google Drive folder.');
                }

                setPhotos(data.photos);

            } catch (err: any) {
                setPhotoError(err.message);
                console.error("Failed to fetch photos from Google Drive:", err);
            } finally {
                setIsLoadingPhotos(false);
            }
        };

        fetchPhotos();
    }, [teacher?.googleDriveLink]);


    useEffect(() => {
        const dismissedMsg = localStorage.getItem('dismissed_teacher_msg');
        if (teacherDashboardMessage && teacherDashboardMessage !== dismissedMsg) {
            setIsMessageDismissed(false);
        } else {
            setIsMessageDismissed(true);
        }
    }, [teacherDashboardMessage]);

    useEffect(() => {
        const checkPayouts = async () => {
            if (teacher?.id) {
                setIsCheckingPayouts(true);
                await processMonthlyPayouts('teacher', teacher.id);
                setIsCheckingPayouts(false);
            }
        };
        checkPayouts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [teacher?.id]);


    const handleCloseClassModal = useCallback(() => { setIsScheduleClassModalOpen(false); setClassToEdit(null); }, []);
    const handleCloseQuizModal = useCallback(() => { setIsScheduleQuizModalOpen(false); setQuizToEdit(null); }, []);
    const handleCloseCancelModal = useCallback(() => setItemToCancel(null), []);
    const handleCloseDeleteModal = useCallback(() => setItemToDelete(null), []);

    // Timetable state
    const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

    // Business card state
    const [coverImageIndex, setCoverImageIndex] = useState(0);

    const handleEditProfile = () => teacher && handleNavigate({ name: 'edit_teacher_profile', teacherId: teacher.id });

    const handleInternalSaveClass = (classDetails: IndividualClass) => {
        const originalClass = classToEdit; // The state from before the modal was opened

        // Check if we are rescheduling a finished or canceled class
        const currentStatus = originalClass ? getDynamicClassStatus(originalClass) : 'scheduled';

        if (originalClass && (currentStatus === 'finished' || currentStatus === 'canceled' || originalClass.status === 'canceled')) {
            const newDateTime = new Date(`${classDetails.date}T${classDetails.startTime}`);
            const now = new Date();

            let isFuture = false;
            if (classDetails.recurrence === 'flexible' && classDetails.flexibleDates) {
                // For flexible, check if any date is in the future
                isFuture = classDetails.flexibleDates.some(d => new Date(`${d.date}T${d.startTime}`) > now);
            } else {
                isFuture = newDateTime > now;
            }

            if (isFuture) {
                // It's a valid reschedule to the future, so we reactivate it
                classDetails.status = 'scheduled';
                // Set a new instance start date to invalidate old enrollments and treat as a new session
                classDetails.instanceStartDate = new Date().toISOString();
                // Clear previous attendance records for this new session
                classDetails.attendance = [];
            }
        }

        handleSaveClass(classDetails);
        setIsScheduleClassModalOpen(false);
        setClassToEdit(null);
    };

    const handleInternalSaveFreeSlot = (slotDetails: IndividualClass) => {
        handleSaveClass(slotDetails);
        setIsScheduleFreeSlotModalOpen(false);
    };

    const handleInternalSaveQuiz = async (quizDetails: Quiz) => {
        const originalQuiz = teacher?.quizzes.find(q => q.id === quizDetails.id);

        if (originalQuiz && (originalQuiz.status === 'finished' || getDynamicQuizStatus(originalQuiz) === 'finished')) {
            const newDateTime = new Date(`${quizDetails.date}T${quizDetails.startTime}`);
            if (newDateTime > new Date()) {
                quizDetails.status = 'scheduled';
                // Set a new instance start date to invalidate old enrollments for this new run.
                quizDetails.instanceStartDate = new Date().toISOString();
                // Do NOT clear previous submissions. They are now scoped by instanceId.
            }
        }

        await handleSaveQuiz(quizDetails);

        setIsScheduleQuizModalOpen(false);
        setQuizToEdit(null);

        if (teacher) {
            handleNavigate({ name: 'quiz_editor', quizId: quizDetails.id, teacherId: teacher.id });
        }
    };

    const handleConfirmCancelItem = () => {
        if (!itemToCancel || !teacher) return;
        handleCancelItem(teacher.id, itemToCancel.id, itemToCancel.type);
        setItemToCancel(null);
    };

    const handleDeleteItem = async () => {
        if (!itemToDelete || !teacher) return;
        const { id, type } = itemToDelete;

        if (type === 'course' || type === 'product') {
            const collectionKey = type === 'course' ? 'courses' : 'products';
            const items = (teacher[collectionKey as keyof Teacher] as any[]) || [];
            const updatedItems = items.map((item: any) =>
                item.id === id ? { ...item, isDeleted: true, isPublished: false } : item
            );
            try {
                await handleUpdateTeacher(teacher.id, { [collectionKey]: updatedItems });
                addToast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted.`, 'success');
            } catch (error) {
                addToast(`Failed to delete ${type}.`, "error");
                console.error(error);
            }
        } else if (type === 'class') {
            const classToDelete = teacher.individualClasses.find(c => c.id === id);
            if (!classToDelete) {
                addToast("Class not found to delete.", "error");
                setItemToDelete(null);
                return;
            }

            const batch = writeBatch(db);

            const salesToRefund = sales.filter(s =>
                s.itemId === id &&
                s.itemType === 'class' &&
                s.status === 'completed' &&
                (s.itemSnapshot as IndividualClass)?.instanceStartDate === classToDelete.instanceStartDate
            );

            let refundedStudents = 0;
            if (salesToRefund.length > 0) {
                for (const sale of salesToRefund) {
                    const saleRef = doc(db, "sales", sale.id);
                    const studentRef = doc(db, "users", sale.studentId);
                    const refundAmount = sale.totalAmount + sale.amountPaidFromBalance;

                    batch.update(saleRef, { status: 'refunded' });
                    batch.update(studentRef, { accountBalance: increment(refundAmount) });

                    // Deduct earnings from teacher and institute if applicable
                    if (sale.teacherId && sale.teacherCommission && sale.teacherCommission > 0) {
                        const teacherRefForEarnings = doc(db, 'teachers', sale.teacherId);
                        batch.update(teacherRefForEarnings, { 'earnings.total': increment(-sale.teacherCommission) });
                    }

                    if (sale.instituteId && sale.instituteCommission && sale.instituteCommission > 0) {
                        const instituteRef = doc(db, 'tuitionInstitutes', sale.instituteId);
                        batch.update(instituteRef, { 'earnings.total': increment(-sale.instituteCommission) });
                    }

                    refundedStudents++;
                }
            }

            const updatedClasses = teacher.individualClasses.map(c =>
                c.id === id ? { ...c, isDeleted: true, isPublished: false } : c
            );
            const teacherRef = doc(db, "teachers", teacher.id);
            batch.update(teacherRef, { individualClasses: updatedClasses });

            try {
                await batch.commit();
                if (refundedStudents > 0) {
                    addToast(`Class deleted. ${refundedStudents} student(s) have been fully refunded.`, 'success');
                } else {
                    addToast(`Class deleted successfully.`, 'success');
                }
            } catch (error) {
                addToast("Failed to delete class and process refunds.", "error");
                console.error(error);
            }
        }

        setItemToDelete(null);
    };

    const handleRemoveCoverImage = (index: number) => {
        if (!teacher) return;
        const imageUrlToRemove = teacher.coverImages[index];
        handleRemoveCoverImageFromArray(teacher.id, imageUrlToRemove);
        setCoverImageIndex(prev => Math.max(0, prev - 1));
    };

    const handleDismissMessage = () => {
        localStorage.setItem('dismissed_teacher_msg', teacherDashboardMessage);
        setIsMessageDismissed(true);
    };

    // --- Timetable Logic ---
    const { weekStart, weekEnd, scheduleForWeek } = useMemo(() => {
        if (!teacher) return { weekStart: new Date(), weekEnd: new Date(), scheduleForWeek: [] };

        const getWeekRange = (offset: number) => {
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
            const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is sunday
            const monday = new Date(new Date(now.setDate(diff + (offset * 7))).setHours(0, 0, 0, 0));
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);
            return { weekStart: monday, weekEnd: sunday };
        };
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        const { weekStart, weekEnd } = getWeekRange(currentWeekOffset);
        const schedule: ScheduleItem[] = [];

        // Filter logic updated to show unpublished items if editing is allowed
        const classesToShow = teacher.individualClasses.filter(c => !c.isDeleted && (canEdit || c.isPublished));

        classesToShow.forEach(c => {
            const classDate = new Date(c.date);
            classDate.setMinutes(classDate.getMinutes() + classDate.getTimezoneOffset()); // Adjust to UTC day

            if (c.recurrence === 'weekly') {
                const dayName = daysOfWeek[classDate.getDay()];
                const seriesStartDate = new Date(c.date);
                const seriesEndDate = c.endDate ? new Date(c.endDate) : null;
                if (seriesStartDate <= weekEnd && (!seriesEndDate || seriesEndDate >= weekStart)) {
                    schedule.push({ id: c.id, type: 'class', day: dayName, subject: c.subject, title: c.title, startTime: c.startTime, endTime: c.endTime });
                }
            } else if (c.recurrence === 'flexible' && c.flexibleDates) {
                c.flexibleDates.forEach(fd => {
                    const fdDate = new Date(fd.date);
                    fdDate.setMinutes(fdDate.getMinutes() + fdDate.getTimezoneOffset());
                    if (fdDate >= weekStart && fdDate <= weekEnd) {
                        const dayName = daysOfWeek[fdDate.getDay()];
                        schedule.push({ id: c.id, type: 'class', day: dayName, subject: c.subject, title: c.title, startTime: fd.startTime, endTime: fd.endTime });
                    }
                })
            } else {
                if (classDate >= weekStart && classDate <= weekEnd) {
                    const dayName = daysOfWeek[classDate.getDay()];
                    schedule.push({ id: c.id, type: 'class', day: dayName, subject: c.subject, title: c.title, startTime: c.startTime, endTime: c.endTime });
                }
            }
        });

        const quizzesToShow = teacher.quizzes.filter(q => !q.isDeleted && (canEdit || q.isPublished));
        quizzesToShow.forEach(q => {
            const quizDate = new Date(q.date);
            quizDate.setMinutes(quizDate.getMinutes() + quizDate.getTimezoneOffset()); // Adjust to UTC day
            if (quizDate >= weekStart && quizDate <= weekEnd) {
                const dayName = daysOfWeek[quizDate.getDay()];
                schedule.push({ id: q.id, type: 'quiz', day: dayName, subject: q.subject, title: q.title, startTime: q.startTime, endTime: '' });
            }
        });

        return { weekStart, weekEnd, scheduleForWeek: schedule };
    }, [teacher, currentWeekOffset, canEdit]);

    const teacherEvents = useMemo(() => {
        if (!teacher) return [];
        return tuitionInstitutes
            .flatMap(ti => (ti.events || []).map(e => ({ event: e, organizer: ti })))
            .filter(({ event }) => event.participatingTeacherIds?.includes(teacher.id));
    }, [teacher, tuitionInstitutes]);

    const getDeleteMessage = () => {
        if (!itemToDelete) return '';
        if (itemToDelete.type === 'class' && (itemToDelete.enrollmentCount || 0) > 0) {
            return `Are you sure you want to delete this class? This will automatically issue a full refund to all ${itemToDelete.enrollmentCount} enrolled students. This action cannot be undone.`;
        }
        return `Are you sure you want to delete this ${itemToDelete.type}? This action cannot be undone.`;
    };

    if (dataLoading) {
        return (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center flex flex-col items-center justify-center">
                <SpinnerIcon className="w-8 h-8 text-primary" />
                <p className="mt-4 text-light-subtle dark:text-dark-subtle">Loading teacher profile...</p>
            </div>
        );
    }

    if (!teacher) {
        const canView = false; // or some logic to check if profile should be visible
        return canView ? null : <div>This teacher's profile is not public or does not exist.</div>;
    }
    const canView = teacher.registrationStatus === 'approved' || (currentUser && (currentUser.id === teacher.userId || currentUser.role === 'admin'));
    if (!canView) return <div>This teacher's profile is not public.</div>;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-12">
                        {teacher.bio && (
                            <div className="bg-light-surface dark:bg-dark-surface p-6 md:p-8 rounded-lg shadow-md animate-fadeIn">
                                <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">About {teacher.name.split(' ')[0]}</h2>
                                <div className="text-light-text dark:text-dark-text">
                                    <MarkdownDisplay content={teacher.bio} className="prose-relaxed" />
                                </div>
                            </div>
                        )}
                        {youtubeLinks.length > 0 && (
                            <div className="bg-light-surface dark:bg-dark-surface p-6 md:p-8 rounded-lg shadow-md animate-fadeIn">
                                <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">
                                    Showcase Videos ({youtubeLinks.length})
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {videosToShow.map((link, index) => {
                                        const videoId = getYoutubeVideoId(link);
                                        if (!videoId) return null;
                                        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

                                        return (
                                            <button
                                                key={index}
                                                onClick={() => setPlayingVideoId(videoId)}
                                                className="relative group aspect-video rounded-lg overflow-hidden shadow-sm transition-transform hover:scale-105"
                                            >
                                                <img src={thumbnailUrl} alt={`YouTube video thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <PlayCircleIcon className="w-16 h-16 text-white/80" />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {youtubeLinks.length > INITIAL_VIDEO_COUNT && (
                                    <div className="mt-6 text-center">
                                        <button onClick={() => setShowAllVideos(prev => !prev)} className="px-6 py-2 border border-primary text-primary font-semibold rounded-full hover:bg-primary/10 transition-colors">
                                            {showAllVideos ? 'Show Less' : `Show All ${youtubeLinks.length} Videos`}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {teacher.googleDriveLink && (
                            <div className="bg-light-surface dark:bg-dark-surface p-6 md:p-8 rounded-lg shadow-md animate-fadeIn">
                                <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">Showcase Images</h2>
                                {isLoadingPhotos ? (
                                    <div className="flex justify-center items-center h-24"><SpinnerIcon className="w-8 h-8 text-primary" /></div>
                                ) : photoError ? (
                                    <p className="text-red-500 text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{photoError}</p>
                                ) : photos.length > 0 ? (
                                    <>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {(showAllImages ? photos : photos.slice(0, INITIAL_IMAGE_COUNT)).map((photo, index) => (
                                                <button
                                                    key={photo.id || index}
                                                    onClick={() => setViewingImage({ url: photo.url_highres || photo.url_thumb, title: `Image ${index + 1}` })}
                                                    className="relative group aspect-square rounded-lg overflow-hidden shadow-sm transition-transform hover:scale-105"
                                                >
                                                    <img src={photo.url_thumb} alt={`Showcase image ${index + 1}`} className="w-full h-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                        {photos.length > INITIAL_IMAGE_COUNT && (
                                            <div className="mt-6 text-center">
                                                <button onClick={() => setShowAllImages(prev => !prev)} className="px-6 py-2 border border-primary text-primary font-semibold rounded-full hover:bg-primary/10 transition-colors">
                                                    {showAllImages ? 'Show Less' : `Show All ${photos.length} Images`}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-light-subtle dark:text-dark-subtle text-center py-8">No images found in the provided Google Drive folder.</p>
                                )}
                            </div>
                        )}
                        {(canEdit || teacher.individualClasses.some(c => c.isPublished && !c.isDeleted)) && (
                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Classes</h2>
                                    {!canEdit && (
                                        <button onClick={() => setActiveTab('classes')} className="text-sm font-medium text-primary hover:underline">View All</button>
                                    )}
                                </div>
                                <TeacherClassesTab
                                    teacher={teacher}
                                    canEdit={canEdit}
                                    onScheduleNew={() => { setClassToEdit(null); setIsScheduleClassModalOpen(true); }}
                                    onScheduleFreeSlot={() => setIsScheduleFreeSlotModalOpen(true)}
                                    onScheduleGoogleMeet={() => { setClassToEdit({ meetProvider: 'google' } as IndividualClass); setIsScheduleClassModalOpen(true); }}
                                    onEdit={(c) => { setClassToEdit(c); setIsScheduleClassModalOpen(true); }}
                                    onDelete={(id, count) => setItemToDelete({ id, type: 'class', enrollmentCount: count })}
                                />
                            </section>
                        )}

                        {(canEdit || teacher.courses.some(c => c.isPublished && !c.isDeleted)) && (
                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Courses</h2>
                                    {!canEdit && (
                                        <button onClick={() => setActiveTab('courses')} className="text-sm font-medium text-primary hover:underline">View All</button>
                                    )}
                                </div>
                                <TeacherCoursesTab teacher={teacher} canEdit={canEdit} onDelete={(id) => setItemToDelete({ id, type: 'course' })} />
                            </section>
                        )}

                        {(canEdit || teacher.quizzes.some(q => q.isPublished && !q.isDeleted)) && (
                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Quizzes</h2>
                                    {!canEdit && (
                                        <button onClick={() => setActiveTab('quizzes')} className="text-sm font-medium text-primary hover:underline">View All</button>
                                    )}
                                </div>
                                <TeacherQuizzesTab teacher={teacher} canEdit={canEdit} onScheduleNew={() => setIsScheduleQuizModalOpen(true)} onEdit={(q) => { setQuizToEdit(q); setIsScheduleQuizModalOpen(true); }} onCancel={(id) => setItemToCancel({ id, type: 'quiz' })} />
                            </section>
                        )}

                        {(canEdit || (teacher.products && teacher.products.some(p => p.isPublished && !p.isDeleted))) && (
                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Store</h2>
                                    {!canEdit && (
                                        <button onClick={() => setActiveTab('products')} className="text-sm font-medium text-primary hover:underline">View All</button>
                                    )}
                                </div>
                                <TeacherProductsTab teacher={teacher} canEdit={canEdit} onDelete={(id) => setItemToDelete({ id, type: 'product' })} />
                            </section>
                        )}
                    </div>
                );
            case 'classes':
                return <TeacherClassesTab
                    teacher={teacher}
                    canEdit={canEdit}
                    onScheduleNew={() => {
                        setClassToEdit(null); // Ensure it's a new class
                        setIsScheduleClassModalOpen(true);
                    }}
                    onScheduleFreeSlot={() => setIsScheduleFreeSlotModalOpen(true)}
                    onScheduleGoogleMeet={() => {
                        // Set a partial object to signify a new G-Meet class
                        setClassToEdit({ meetProvider: 'google' } as IndividualClass);
                        setIsScheduleClassModalOpen(true);
                    }}
                    onEdit={(c) => {
                        setClassToEdit(c);
                        setIsScheduleClassModalOpen(true);
                    }}
                    onDelete={(id, count) => setItemToDelete({ id, type: 'class', enrollmentCount: count })}
                />;
            case 'courses':
                return <TeacherCoursesTab teacher={teacher} canEdit={canEdit} onDelete={(id) => setItemToDelete({ id, type: 'course' })} />;
            case 'quizzes':
                return <TeacherQuizzesTab teacher={teacher} canEdit={canEdit} onScheduleNew={() => setIsScheduleQuizModalOpen(true)} onEdit={(q) => { setQuizToEdit(q); setIsScheduleQuizModalOpen(true); }} onCancel={(id) => setItemToCancel({ id, type: 'quiz' })} />;
            case 'products':
                return <TeacherProductsTab teacher={teacher} canEdit={canEdit} onDelete={(id) => setItemToDelete({ id, type: 'product' })} />;
            case 'my_events':
                return <TeacherEventsTab teacher={teacher} events={teacherEvents} />;
            case 'past_classes':
                return canEdit ? <TeacherPastClassesTab teacher={teacher} sales={sales} /> : null;
            case 'earnings':
                return canEdit ? <EarningsDashboard
                    teacher={teacher} allSales={sales} allUsers={users} isAdminView={isAdminView}
                    onWithdraw={(amount) => handleRequestWithdrawal(teacher.id, amount)}
                    onSaveBankDetails={(details) => handleSaveBankDetails(teacher.id, details)}
                    onVerificationUpload={(type, imageUrl, requestNote) => handleVerificationUpload(teacher.id, type, imageUrl, requestNote)}
                    onVerificationDecision={(type, decision, reason) => handleVerificationDecision(teacher.id, type, decision, reason)}
                    onUpdatePhysicalOrderStatus={handleUpdatePhysicalOrderStatus}
                /> : null;
            case 'attendance':
                return canEdit ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <h3 className="text-xl font-bold mb-4">Select a Class</h3>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                                {teacher.individualClasses.filter(c => c.status !== 'canceled').map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setSelectedClassForAttendance(c)}
                                        className={`w-full text-left p-3 border rounded-lg transition-colors ${selectedClassForAttendance?.id === c.id ? 'bg-primary/10 border-primary' : 'border-light-border dark:border-dark-border hover:bg-light-border dark:hover:bg-dark-border'}`}
                                    >
                                        <p className="font-bold">{c.title}</p>
                                        <p className="text-sm text-light-subtle dark:text-dark-subtle">{c.subject} - {new Date(c.date).toLocaleDateString()}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            {selectedClassForAttendance ? (
                                <AttendanceSummaryTable classInfo={selectedClassForAttendance} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-center p-8 bg-light-background dark:bg-dark-background rounded-lg">
                                    <p className="text-light-subtle dark:text-dark-subtle">Select a class from the left to view attendance records.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : null;
            case 'notifications':
                return canEdit ? <TeacherNotificationsTab teacher={teacher} /> : null;
            case 'timetable':
                return (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <button onClick={() => setCurrentWeekOffset(prev => prev - 1)} className="px-4 py-2 text-sm font-medium border border-light-border dark:border-dark-border rounded-md hover:bg-light-border dark:hover:bg-dark-border transition-colors">&lt; Previous Week</button>
                            <span className="font-semibold">{weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}</span>
                            <button onClick={() => setCurrentWeekOffset(prev => prev + 1)} className="px-4 py-2 text-sm font-medium border border-light-border dark:border-dark-border rounded-md hover:bg-light-border dark:hover:bg-dark-border transition-colors">Next Week &gt;</button>
                        </div>
                        <TimeTable schedule={scheduleForWeek} onItemClick={(item) => handleNavigate(item.type === 'class' ? { name: 'class_detail', classId: item.id as number } : { name: 'quiz_detail', quizId: item.id as string })} />
                    </div>
                );
            case 'contact':
                return <ContactSection teacher={teacher} />;
            default:
                return <div>Select a tab</div>;
        }
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="md:w-64 flex-shrink-0 relative z-20">
                    <div className="sticky top-24">
                        <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} isOwnProfile={canEdit} hasEvents={teacherEvents.length > 0} />
                    </div>
                </div>

                {/* Main Content Area - Added padding-left on mobile to avoid overlap with fixed sidebar */}
                <div className="flex-1 min-w-0 space-y-8 pl-16 md:pl-0 animate-slideInUp relative z-0">
                    {/* Overview-only Header Content - These are placed inside the main content column */}
                    {activeTab === 'overview' && (
                        <>
                            {isOwnProfile && !isMessageDismissed && teacherDashboardMessage && (
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 rounded-r-md relative animate-fadeIn">
                                    <button onClick={handleDismissMessage} className="absolute top-2 right-2 p-1 text-blue-400 hover:text-blue-600 dark:hover:text-blue-200">
                                        <XIcon className="w-5 h-5" />
                                    </button>
                                    <div className="pr-8">
                                        <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-2">Platform Announcement</h4>
                                        <div className="text-sm text-blue-700 dark:text-blue-300 prose-sm max-w-none">
                                            <MarkdownDisplay content={teacherDashboardMessage} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {canEdit && (
                                profileCompletion === 100 ? (
                                    <div className="mb-6 animate-fadeIn">
                                        <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-3 rounded-r-lg shadow-sm flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                                    Great job, {teacher.name.split(' ')[0]}! Your profile is 100% complete.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setIsCompletionModalOpen(true)}
                                                className="text-xs px-3 py-1.5 bg-white dark:bg-green-800 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-100 font-medium rounded hover:bg-green-50 dark:hover:bg-green-700 transition-colors"
                                            >
                                                Edit Details
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    (profileCompletion < 100 || isAdminView) && (
                                        <div className="mb-6 animate-fadeIn">
                                            <div className="bg-yellow-100 dark:bg-yellow-900/50 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 p-4 rounded-r-lg shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                                                <div className="flex-grow">
                                                    <p className="font-bold">Complete your profile for a better experience!</p>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <ProgressBar value={profileCompletion} max={100} />
                                                        <span className="font-bold text-sm flex-shrink-0">{profileCompletion}%</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setIsCompletionModalOpen(true)}
                                                    className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-md hover:bg-yellow-600 transition-colors flex-shrink-0 w-full sm:w-auto"
                                                >
                                                    Complete Profile
                                                </button>
                                            </div>
                                        </div>
                                    )
                                )
                            )}

                            {teacher.registrationStatus !== 'approved' && canEdit && (
                                <div className={`p-4 rounded-md mb-6 text-center font-semibold text-white ${teacher.registrationStatus === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                    {teacher.registrationStatus === 'pending' ? 'Your profile is currently under review and not yet visible to the public. Please ensure that your profile is at least 50% complete to make it publicly visible.' : 'Your registration has been rejected. Please contact support.'}
                                </div>
                            )}

                            <ProfileHeader
                                teacher={teacher} isOwnProfile={canEdit} onEditProfile={handleEditProfile}
                                onEditImage={(type) => openImageUploadModal(type, { teacherId: teacher.id })}
                                onRemoveCoverImage={handleRemoveCoverImage}
                                coverImageIndex={coverImageIndex} setCoverImageIndex={setCoverImageIndex}
                                followerCount={followerCount}
                            />

                            {!isOwnProfile && currentUser?.role === 'student' && (
                                <div className="flex justify-center -mt-4 mb-8 download-ignore">
                                    <button
                                        onClick={() => handleFollowToggle(teacher.id)}
                                        className={`flex items-center space-x-2 px-6 py-2 rounded-full font-semibold transition-colors ${isFollowing
                                            ? 'bg-primary/10 text-primary border border-primary/20'
                                            : 'bg-primary text-white'
                                            }`}
                                    >
                                        {isFollowing ? <CheckCircleIcon className="w-5 h-5" /> : <UserPlusIcon className="w-5 h-5" />}
                                        <span>{isFollowing ? 'Following' : 'Follow'}</span>
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* Dynamic Tab Content */}
                    <div>
                        {renderTabContent()}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ScheduleClassModal isOpen={isScheduleClassModalOpen} onClose={handleCloseClassModal} onSave={handleInternalSaveClass} initialData={classToEdit} teacherId={teacher.id} />
            <ScheduleFreeSlotModal isOpen={isScheduleFreeSlotModalOpen} onClose={() => setIsScheduleFreeSlotModalOpen(false)} onSave={handleInternalSaveFreeSlot} teacherId={teacher.id} />
            <ScheduleQuizModal isOpen={isScheduleQuizModalOpen} onClose={handleCloseQuizModal} onSave={handleInternalSaveQuiz} initialData={quizToEdit} teacherId={teacher.id} />
            {itemToCancel && <ConfirmationModal isOpen={true} onClose={handleCloseCancelModal} onConfirm={handleConfirmCancelItem} title={`Cancel ${itemToCancel.type}`} message={`Are you sure you want to cancel this ${itemToCancel.type}? This will refund all enrolled students.`} confirmText="Yes, Cancel" />}
            {itemToDelete && <ConfirmationModal isOpen={true} onClose={handleCloseDeleteModal} onConfirm={handleDeleteItem} title={`Delete ${itemToDelete.type}`} message={getDeleteMessage()} confirmText="Yes, Delete" />}
            {canEdit && <TeacherProfileCompletionModal isOpen={isCompletionModalOpen} onClose={() => setIsCompletionModalOpen(false)} teacher={teacher} missingItems={missingItems} />}
            {playingVideoId && (
                <Modal
                    isOpen={true}
                    onClose={() => setPlayingVideoId(null)}
                    title="Video Showcase"
                    size="4xl"
                >
                    <YouTubePlayer videoId={playingVideoId} currentUser={currentUser} />
                </Modal>
            )}
            {viewingImage && (
                <ImageViewerModal
                    isOpen={true}
                    onClose={() => setViewingImage(null)}
                    imageUrl={viewingImage.url}
                    title={viewingImage.title}
                />
            )}
        </div>
    );
};

export default TeacherProfilePage;
