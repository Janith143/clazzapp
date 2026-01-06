
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Teacher, IndividualClass, Quiz, EditableImageType, ScheduleItem, Notification as SystemNotification, Product, Sale, Photo, User } from '../types';
import { CustomClassRequest } from '../types/customRequest';
import ProfileHeader from '../components/ProfileHeader';
import ProfileTabs, { allTabs } from '../components/ProfileTabs';
import { DownloadIcon, UserPlusIcon, CheckCircleIcon, SpinnerIcon, XIcon, PlayCircleIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/Icons';
import ScheduleClassModal from '../components/ScheduleClassModal';
import ScheduleQuizModal from '../components/ScheduleQuizModal';
import ConfirmationModal from '../components/ConfirmationModal';
import TeacherProfileCompletionModal from '../components/teacherProfile/TeacherProfileCompletionModal';
import ProgressBar from '../components/ProgressBar';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { useFirebase } from '../contexts/FirebaseContext';
import { useNavigation } from '../contexts/NavigationContext';
import MarkdownDisplay from '../components/MarkdownDisplay';
import { useSmartBadge } from '../hooks/useSmartBadge';
import { useSEO } from '../hooks/useSEO';
import SEOHead from '../components/SEOHead';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, writeBatch, increment, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { getDynamicClassStatus, getDynamicQuizStatus, calculateTeacherProfileCompletion, getYoutubeVideoId, getOptimizedImageUrl } from '../utils';
import { notifyUser } from '../utils/notificationHelper';
import ScheduleFreeSlotModal from '../components/ScheduleFreeSlotModal';
import Modal from '../components/Modal';
import { YouTubePlayer } from '../components/YouTubePlayer';
import { slugify } from '../utils/slug';
import ImageViewerModal from '../components/ImageViewerModal';
import NotFoundState from '../components/NotFoundState';
import { useContentActions } from '../hooks/useContentActions';
import TIScheduleEventModal from '../components/ti/TIScheduleEventModal';


// Tab Components
import TeacherClassesTab from '../components/teacherProfile/TeacherClassesTab';
import TeacherCoursesTab from '../components/teacherProfile/TeacherCoursesTab';
import TeacherQuizzesTab from '../components/teacherProfile/TeacherQuizzesTab';
import TeacherProductsTab from '../components/teacherProfile/TeacherProductsTab';
import EarningsDashboard from '../components/teacherProfile/EarningsDashboard';
import TimeTable from '../components/teacherProfile/TimeTable';
import ContactSection from '../components/teacherProfile/ContactSection';
import AttendanceSummaryTable from '../components/ti/AttendanceSummaryTable';
import AttendanceManager from '../components/ti/AttendanceManager';
import TeacherEventsTab from '../components/teacherProfile/TeacherEventsTab';
import TeacherPastClassesTab from '../components/teacherProfile/TeacherPastClassesTab';
import TeacherGroupsTab from '../components/broadcast/TeacherGroupsTab';
import CustomClassSettingsTab from '../components/teacherProfile/CustomClassSettingsTab';
import TeacherSettingsTab from '../components/teacherProfile/TeacherSettingsTab';
import CustomRequestsTab from '../components/teacherProfile/CustomRequestsTab';
import RequestCustomClassModal from '../components/teacherProfile/RequestCustomClassModal';
import TeacherDashboardTabs from '../components/teacherProfile/TeacherDashboardTabs'; // Added import

// Inlined TeacherNotificationsTab Component
const TeacherNotificationsTab: React.FC<{ teacher: Teacher }> = ({ teacher }) => {
    const { handleSendNotification } = useData();
    const [content, setContent] = useState('');
    const [target, setTarget] = useState<'all_followers' | 'class'>('all_followers');
    const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
    const [sentNotifications, setSentNotifications] = useState<SystemNotification[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'notifications'), where('teacherId', '==', teacher.id), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const notifs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemNotification));
            setSentNotifications(notifs);
        });
        return () => unsubscribe();
    }, [teacher.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setLoading(true);

        let notificationTarget: SystemNotification['target'];
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
    const { sales, teachers, users, handleUpdateTeacher, handleSaveClass, handleSaveQuiz, handleCancelItem, handleRequestWithdrawal, handleSaveBankDetails, handleVerificationUpload, handleVerificationDecision, handleTogglePublishState, handleRemoveCoverImageFromArray, handleFollowToggle, handleDeleteQuizSubmissions, tuitionInstitutes, handleUpdatePhysicalOrderStatus, loading: dataLoading, processMonthlyPayouts, submissions, handleImageSave } = useData();
    const ui = useUI();
    const nav = useNavigation();
    const { addToast, openImageUploadModal } = ui;
    const { handleNavigate, teacherDashboardMessage, functionUrls, gDriveFetcherApiKey } = nav;
    const { enableNotifications } = useFirebase();

    const teacher = useMemo(() => {
        if (teacherId) return teachers.find(t => t.id === teacherId);
        if (slug) return teachers.find(t => t.username === slug);
        return null;
    }, [teachers, teacherId, slug]);

    const { percentage: profileCompletion, missing: missingItems } = calculateTeacherProfileCompletion(teacher);



    const structuredData = useMemo(() => {
        if (!teacher) return null;
        return {
            "@context": "https://schema.org",
            "@type": "Person",
            "name": teacher.name,
            "description": teacher.bio,
            "image": teacher.profileImage,
            "jobTitle": "Teacher",
            "url": window.location.href
        };
    }, [teacher]);

    const isOwnProfile = currentUser?.id === teacher?.userId;
    const isAdminView = currentUser?.role === 'admin';
    const canEdit = isOwnProfile || isAdminView;

    // ... (existing code)

    // SEO Implementation
    const seoTitle = teacher ? `${teacher.name} | Clazz.lk` : 'Teacher Profile | Clazz.lk';
    const seoDescription = teacher ? (teacher.tagline || teacher.bio?.substring(0, 160) || "View teacher profile on Clazz.lk") : 'Connect with the best tutors in Sri Lanka.';
    const seoImage = teacher?.profileImage || '/Logo3.png';

    if (!teacher && !dataLoading) {
        // Fallback or 404 handled by render
    }

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
    const [itemToDelete, setItemToDelete] = useState<{ id: string | number, type: 'course' | 'product' | 'class' | 'event', enrollmentCount?: number } | null>(null);
    // Fix: Store ID instead of object to keep data fresh
    const [selectedClassIdForAttendance, setSelectedClassIdForAttendance] = useState<number | null>(null);

    const derivedClassForAttendance = useMemo(() => {
        if (!selectedClassIdForAttendance || !teacher) return null;
        return teacher.individualClasses.find(c => c.id === selectedClassIdForAttendance) || null;
    }, [teacher, selectedClassIdForAttendance]);

    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const [isCheckingPayouts, setIsCheckingPayouts] = useState(true);
    const [isMessageDismissed, setIsMessageDismissed] = useState(true);
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<any>(null);

    const { handleSaveEvent } = useContentActions({
        currentUser,
        teachers,
        sales,
        submissions,
        ui,
        nav,
        handleUpdateTeacher,
        handleImageSave
    });

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

    const [isRequestClassModalOpen, setIsRequestClassModalOpen] = useState(false);

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

    const teacherEvents = useMemo(() => {
        if (!teacher) return [];
        // Events where teacher is a participant (from Institutes)
        const participating = tuitionInstitutes
            .flatMap(ti => (ti.events || []).map(e => ({ event: e, organizer: ti })))
            .filter(({ event }) => event.participatingTeacherIds?.includes(teacher.id));

        // Events organized by the teacher themselves
        const ownEvents = (teacher.events || []).map(e => ({ event: e, organizer: teacher }));

        return [...participating, ...ownEvents].sort((a, b) => new Date(a.event.startDate).getTime() - new Date(b.event.startDate).getTime());
    }, [teacher, tuitionInstitutes]);



    const visibleEventsCount = useMemo(() => {
        if (!teacherEvents.length) return 0;
        if (canEdit) return teacherEvents.length;
        return teacherEvents.filter(e => e.event.isPublished).length;
    }, [teacherEvents, canEdit]);

    // ------------------------------------------------------------------
    // Dynamic Tab Filtering
    // ------------------------------------------------------------------
    const tabs = useMemo(() => {
        if (!teacher) return allTabs;

        // If owner/admin, show all tabs to allow editing/creation (except maybe completely irrelevant ones)
        // But for now, we follow standard logic: owner sees controls.
        if (canEdit) return allTabs;

        // Public View: Check content availability
        // Note: For students, we only show tabs that have *active/published* content.
        const hasClasses = teacher.individualClasses?.some(c => !c.isDeleted && c.isPublished);
        const hasCourses = teacher.courses?.some(c => !c.isDeleted && c.isPublished);
        const hasQuizzes = teacher.quizzes?.some(q => !q.isDeleted && q.isPublished);
        const hasProducts = teacher.products?.some(p => !p.isDeleted && p.isPublished);
        const hasEvents = visibleEventsCount > 0;

        return allTabs.filter(tab => {
            switch (tab.id) {
                case 'overview': return true;
                case 'classes': return hasClasses;
                case 'courses': return hasCourses;
                case 'quizzes': return hasQuizzes;
                case 'products': return hasProducts;
                case 'my_events': return hasEvents;
                case 'contact': return true; // Always show contact info
                case 'timetable': return true; // Timetable usually relevant if they exist
                default: return true;
            }
        });
    }, [teacher, canEdit, visibleEventsCount]);

    // Redirect if current activeTab becomes hidden (e.g. via direct URL or state change)
    useEffect(() => {
        if (teacher && tabs.length > 0) {
            const isTabAvailable = tabs.some(t => t.id === activeTab);
            if (!isTabAvailable) {
                // Determine fallback: 'overview' if available, else first tab
                const fallback = tabs.find(t => t.id === 'overview') ? 'overview' : tabs[0].id;
                setActiveTab(fallback);
            }
        }
    }, [activeTab, tabs, teacher]);

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
    const [customRequests, setCustomRequests] = useState<CustomClassRequest[]>([]);

    useEffect(() => {
        if (!teacherId || !isOwnProfile) return;
        const q = query(
            collection(db, 'customClassRequests'),
            where('teacherId', '==', teacherId)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setCustomRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CustomClassRequest)));
        });
        return () => unsubscribe();
    }, [teacherId, isOwnProfile]);

    // Business card state
    const [coverImageIndex, setCoverImageIndex] = useState(0);

    // Badge Logic
    const teacherSales = useMemo(() => {
        if (!teacher) return [];
        return sales.filter(s => s.teacherId === teacher.id && s.status === 'completed');
    }, [sales, teacher]);

    const { unseenCount: unseenEarnings, markAsViewed: markEarningsViewed } = useSmartBadge('teacher_earnings', teacherSales, 'saleDate');
    const { unseenCount: unseenRequests, markAsViewed: markRequestsViewed } = useSmartBadge('teacher_requests', customRequests, 'updatedAt');

    const handleTabChange = (tabId: string) => {
        if (tabId === 'earnings') markEarningsViewed();
        if (tabId === 'custom_requests') markRequestsViewed();
        setActiveTab(tabId);
    };

    const handleInternalSaveEvent = async (eventDetails: any) => {
        if (!teacher) return;
        await handleSaveEvent({
            ...eventDetails,
            organizerId: teacher.id,
            organizerType: 'teacher'
        });
        setIsEventModalOpen(false);
        setEventToEdit(null);
    };

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

            // Notify Students about Deletion
            salesToRefund.forEach(sale => {
                if (sale.billingDetails?.billingEmail) {
                    notifyUser(
                        { id: sale.studentId, email: sale.billingDetails.billingEmail },
                        "Class Cancelled & Refunded",
                        `The class "${classToDelete.title}" has been deleted by the teacher. A full refund has been initiated to your wallet.`,
                        {
                            type: 'warning',
                            link: '/dashboard',
                            notificationUrl: functionUrls.notification
                        }
                    );
                }
            });

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

        // Add Paid Custom Requests to Timetable
        if (canEdit) {
            const paidRequests = customRequests.filter(r => r.status === 'paid');
            paidRequests.forEach(req => {
                req.requestedSlots.forEach(slot => {
                    // Similar date construction
                    const sDate = new Date(slot.date + 'T00:00:00');
                    if (sDate >= weekStart && sDate <= weekEnd) {
                        const dayName = daysOfWeek[sDate.getDay()];
                        schedule.push({
                            id: req.id,
                            type: 'class', // Treat as class
                            day: dayName,
                            subject: req.topic,
                            title: `Private: ${req.topic} (${req.studentName})`,
                            startTime: slot.startTime,
                            endTime: slot.endTime
                        });
                    }
                });
            });
        }

        return { weekStart, weekEnd, scheduleForWeek: schedule };
    }, [teacher, currentWeekOffset, canEdit, customRequests]);



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
        const canView = false;
        return canView ? null : <NotFoundState />;
    }
    const canView = (teacher.registrationStatus === 'approved' && teacher.isPublished !== false) || (currentUser && (currentUser.id === teacher.userId || currentUser.role === 'admin' || teacher.instituteId === currentUser.id));
    if (!canView) return <NotFoundState title="Profile Private" message="This teacher's profile is currently not public." />;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-12">
                        <SEOHead
                            title={seoTitle}
                            description={seoDescription}
                            image={seoImage}
                            url={window.location.href}
                            structuredData={structuredData}
                        />
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
                                                    <img src={getOptimizedImageUrl(photo.url_thumb, 400)} alt={`Showcase image ${index + 1}`} className="w-full h-full object-cover" />
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
                return (
                    <TeacherEventsTab
                        teacher={teacher}
                        events={teacherEvents}
                        canEdit={isOwnProfile}
                        onScheduleNew={() => {
                            setEventToEdit(null);
                            setIsEventModalOpen(true);
                        }}
                        onEdit={(event) => {
                            setEventToEdit(event);
                            setIsEventModalOpen(true);
                        }}
                        onCancel={(id) => setItemToDelete({ id, type: 'event' })}
                        onTogglePublish={(id) => handleTogglePublishState(teacher.id, id, 'events')}
                    />
                );
            case 'past_classes':
                return canEdit ? <TeacherPastClassesTab teacher={teacher} sales={sales} /> : null;
            case 'groups':
                return canEdit ? <TeacherGroupsTab teacher={teacher} /> : null;
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
                                        onClick={() => setSelectedClassIdForAttendance(c.id)}
                                        className={`w-full text-left p-3 border rounded-lg transition-colors ${selectedClassIdForAttendance === c.id ? 'bg-primary/10 border-primary' : 'border-light-border dark:border-dark-border hover:bg-light-border dark:hover:bg-dark-border'}`}
                                    >
                                        <p className="font-bold">{c.title}</p>
                                        <p className="text-sm text-light-subtle dark:text-dark-subtle">{new Date(c.date).toLocaleDateString()}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            {derivedClassForAttendance ? (
                                <AttendanceManager
                                    classInfo={derivedClassForAttendance}
                                    enrolledStudents={sales
                                        .filter(s => s.itemId === derivedClassForAttendance.id && s.itemType === 'class' && (s.status === 'completed' || s.paymentMethod === 'manual_at_venue'))
                                        .map(s => {
                                            const student = users.find(u => u.id === s.studentId);
                                            return student ? { student, sale: s } : null;
                                        })
                                        .filter((item): item is { student: User; sale: Sale } => item !== null)
                                    }
                                />
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
                        <TimeTable schedule={scheduleForWeek} onItemClick={(item) => handleNavigate(item.type === 'class' ? { name: 'class_detail_slug', slug: slugify(item.title || '') } : { name: 'quiz_detail_slug', slug: slugify(item.title || '') })} />
                    </div>
                );
            case 'contact':
                return <ContactSection teacher={teacher} />;
            case 'custom_requests':
                return <CustomRequestsTab teacher={teacher} />;
            case 'settings':
                return <TeacherSettingsTab teacher={teacher} />;
            default:
                return <div>Select a tab</div>;
        }
    };

    return (
        <div className={canEdit ? "min-h-screen bg-light-background dark:bg-dark-background" : "container mx-auto px-4 sm:px-6 lg:px-8 py-8"}>
            <SEOHead
                title={teacher ? `${teacher.name} | clazz.lk` : 'Teacher Profile'}
                description={teacher ? teacher.tagline || teacher.bio.substring(0, 160) : 'View teacher profile.'}
                image={teacher ? teacher.profileImage : undefined}
                structuredData={structuredData}
            />
            <div className={`flex flex-col md:flex-row ${canEdit ? '' : 'gap-8'}`}>
                {/* Sidebar Navigation */}
                {canEdit ? (
                    <div className="flex-shrink-0 z-20"> {/* Wrapper for Teacher Dashboard Sidebar */}
                        <TeacherDashboardTabs
                            activeTab={activeTab}
                            setActiveTab={handleTabChange}
                            isOwnProfile={true}
                            badges={{
                                earnings: unseenEarnings > 0,
                                custom_requests: unseenRequests > 0
                            }}
                        />
                    </div>
                ) : (
                    <div className="w-full md:w-64 flex-shrink-0 relative z-20">
                        <div className="sticky top-24">
                            <ProfileTabs
                                activeTab={activeTab}
                                setActiveTab={handleTabChange}
                                isOwnProfile={canEdit}
                                hasEvents={visibleEventsCount > 0}
                                tabs={tabs}
                                badges={{
                                    earnings: unseenEarnings > 0,
                                    custom_requests: unseenRequests > 0
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className={`flex-1 min-w-0 space-y-8 animate-slideInUp relative z-0 ${canEdit ? 'pl-14 p-4 md:pl-0 md:p-8' : ''}`}>
                    {/* Overview-only Header Content - These are placed inside the main content column */}
                    {activeTab === 'overview' && (
                        <>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                                {isOwnProfile && !isMessageDismissed && teacherDashboardMessage ? (
                                    <div className="flex-grow p-4 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 rounded-r-md relative animate-fadeIn">
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
                                ) : (
                                    <div />
                                )}

                                {isOwnProfile && 'Notification' in window && Notification.permission === 'default' && (
                                    <button
                                        onClick={() => enableNotifications()}
                                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all animate-pulse"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                        </svg>
                                        Turn on Notifications
                                    </button>
                                )}
                            </div>

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

                            <ProfileHeader
                                teacher={teacher}
                                isOwnProfile={canEdit}
                                onEditProfile={handleEditProfile}
                                onEditImage={(type) => openImageUploadModal(type, { teacherId: teacher.id })}
                                onRemoveCoverImage={handleRemoveCoverImage}
                                coverImageIndex={coverImageIndex}
                                setCoverImageIndex={setCoverImageIndex}
                                followerCount={followerCount}
                                onRequestCustomClass={() => setIsRequestClassModalOpen(true)}
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

            {isEventModalOpen && (
                <TIScheduleEventModal
                    isOpen={isEventModalOpen}
                    onClose={() => setIsEventModalOpen(false)}
                    onSave={handleInternalSaveEvent}
                    organizerId={teacher.id}
                    organizerType="teacher"
                    initialData={eventToEdit}
                />
            )}
            {/* Other Modals */}
            <RequestCustomClassModal
                isOpen={isRequestClassModalOpen}
                onClose={() => setIsRequestClassModalOpen(false)}
                teacher={teacher}
            />
        </div>
    );
};

export default TeacherProfilePage;
