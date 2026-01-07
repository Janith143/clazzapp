
import React, { useState, useMemo, useCallback } from 'react';
import { DashboardTab, User, ScheduleItem, Quiz } from '../types';
import { BookOpenIcon, VideoCameraIcon, BanknotesIcon, CheckCircleIcon, TicketIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useUI } from '../contexts/UIContext';
import { useFirebase } from '../contexts/FirebaseContext';
import { calculateStudentProfileCompletion } from '../utils';
import ProgressBar from '../components/ProgressBar';

import { useBroadcastData } from '../hooks/useBroadcastData';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { CustomClassRequest } from '../types/customRequest';
import { useSmartBadge } from '../hooks/useSmartBadge';

// Tab Components
import MyCourses from '../components/studentDashboard/MyCourses';
import MyClasses from '../components/studentDashboard/MyClasses';
import MyQuizzes from '../components/studentDashboard/MyQuizzes';
import MyEvents from '../components/studentDashboard/MyEvents';
import TransactionHistory from '../components/studentDashboard/TransactionHistory';
import MyProfile from '../components/studentDashboard/MyProfile';
import MyAttendance from '../components/studentDashboard/MyAttendance';
import MyRequests from '../components/studentDashboard/MyRequests';
import TopUpModal from '../components/TopUpModal';
import MyExamsSection from '../components/MyExamsSection';
import MyOrders from '../components/studentDashboard/MyOrders';
import MyPastClasses from '../components/studentDashboard/MyPastClasses';
import MyScoreCard from '../components/studentDashboard/MyScoreCard';

import StudentDashboardTabs from '../components/studentDashboard/StudentDashboardTabs';
import TimeTable from '../components/teacherProfile/TimeTable';
import MyVouchers from '../components/studentDashboard/MyVouchers';
import MyCertificates from '../components/studentDashboard/MyCertificates';
import StudentGroupsTab from '../components/broadcast/StudentGroupsTab';
import GuestJoinView from '../components/broadcast/GuestJoinView';

interface StudentDashboardProps {
    userId?: string;
    isAdminView?: boolean;
}

const StatCard: React.FC<{ title: string; value: string | React.ReactNode; icon: React.ReactNode; onAction?: () => void; actionLabel?: string }> = ({ title, value, icon, onAction, actionLabel }) => {
    const commonClasses = "bg-light-surface dark:bg-dark-surface p-4 rounded-lg shadow-sm border border-light-border dark:border-dark-border";
    const content = (
        <div className="flex items-center justify-between">
            <div className="flex items-center">
                <div className="p-3 bg-primary/10 text-primary rounded-lg mr-4">{icon}</div>
                <div>
                    <p className="text-sm font-medium text-light-subtle dark:text-dark-subtle">{title}</p>
                    <div className="text-xl font-bold text-light-text dark:text-dark-text">{value}</div>
                </div>
            </div>
            {onAction && actionLabel && (
                <button onClick={(e) => { e.stopPropagation(); onAction(); }} className="px-3 py-1 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors">
                    {actionLabel}
                </button>
            )}
        </div>
    );

    if (onAction && !actionLabel) {
        return (
            <button onClick={onAction} className={`${commonClasses} w-full text-left hover:border-primary transition-colors h-full`}>
                {content}
            </button>
        );
    }

    return <div className={`${commonClasses} h-full`}>{content}</div>;
}


const StudentDashboard: React.FC<StudentDashboardProps> = ({ userId, isAdminView = false }) => {
    const { currentUser } = useAuth();
    const { sales, users, teachers, vouchers, certificates, submissions } = useData();
    const { pageState, handleNavigate } = useNavigation();
    const { setModalState } = useUI();
    const { enableNotifications } = useFirebase();

    // View as Student Toggle
    const [isViewAsStudent, setIsViewAsStudent] = useState(false);
    const effectiveIsAdminView = isAdminView && !isViewAsStudent;

    const displayUser = useMemo(() => {
        if (isAdminView && userId) {
            return users.find(u => u.id === userId);
        }
        return currentUser;
    }, [isAdminView, userId, users, currentUser]);

    // Fetch broadcast unread count
    const { unreadTotal } = useBroadcastData(undefined, undefined, (!effectiveIsAdminView && displayUser) ? displayUser.id : undefined);

    // Fetch Custom Requests for Timetable
    const [customRequests, setCustomRequests] = useState<CustomClassRequest[]>([]);

    React.useEffect(() => {
        if (!displayUser) return;
        const q = query(
            collection(db, 'customClassRequests'),
            where('studentId', '==', displayUser.id)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setCustomRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CustomClassRequest)));
        });
        return () => unsubscribe();
    }, [displayUser?.id]);



    const getInitialTab = (): DashboardTab => {
        if (pageState.name === 'student_dashboard' && pageState.initialTab) return pageState.initialTab;
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        // valid tabs check could be stricter, but casting is safe enough for UI state (will just default if invalid in switch)
        return (tabParam as DashboardTab) || 'overview';
    };

    const [activeTab, setActiveTab] = useState<DashboardTab>(getInitialTab);
    const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
    const [classFilter, setClassFilter] = useState<'all' | 'upcoming'>('all');

    const handleTabChange = (tab: DashboardTab) => {
        if (tab !== 'classes') {
            setClassFilter('all');
        }

        // Smart Badges: Mark as viewed when tab is opened
        if (tab === 'requests') markRequestsViewed();
        if (tab === 'certificates') markCertificatesViewed();
        if (tab === 'attendance') markAttendanceViewed();
        if (tab === 'my_orders') markOrdersViewed();
        if (tab === 'my_vouchers') markVouchersViewed();
        if (tab === 'score_card') markScoresViewed();
        if (tab === 'groups') markGroupsViewed();

        setActiveTab(tab);
    };

    const handleViewUpcomingClasses = () => {
        setClassFilter('upcoming');
        setActiveTab('classes');
    };

    const handleCloseTopUp = useCallback(() => setIsTopUpModalOpen(false), []);

    const { percentage: profileCompletion } = calculateStudentProfileCompletion(displayUser as User);


    // Data for Badges (Destructured above)

    // 1. Requests Badge
    const { unseenCount: unseenRequests, markAsViewed: markRequestsViewed } = useSmartBadge('student_requests', customRequests, 'updatedAt');

    // 2. Certificates Badge
    const myCertificates = useMemo(() => {
        if (!displayUser) return [];
        return certificates.filter(c => c.studentId === displayUser.id);
    }, [certificates, displayUser]);
    const { unseenCount: unseenCertificates, markAsViewed: markCertificatesViewed } = useSmartBadge('student_certificates', myCertificates, 'issuedAt');

    // 3. Attendance Badge 
    const myAttendanceRecords = useMemo(() => {
        if (!displayUser) return [];
        const records: any[] = [];
        teachers.forEach(teacher => {
            teacher.individualClasses.forEach(classInfo => {
                if (classInfo.attendance) {
                    classInfo.attendance.forEach(record => {
                        if (record.studentId === displayUser.id) {
                            records.push({
                                ...record,
                                // timestamp is attendedAt
                            });
                        }
                    });
                }
            });
        });
        return records;
    }, [displayUser, teachers]);
    const { unseenCount: unseenAttendance, markAsViewed: markAttendanceViewed } = useSmartBadge('student_attendance', myAttendanceRecords, 'attendedAt');

    // 4. Orders Badge 
    const myOrders = useMemo(() => {
        if (!displayUser) return [];
        return sales.filter(s => s.studentId === displayUser.id && (
            s.itemType === 'photo_purchase' ||
            s.itemType === 'marketplace_purchase' ||
            (s.itemSnapshot && 'coverImages' in s.itemSnapshot && !s.cartItems)
        ));
    }, [sales, displayUser]);
    const { unseenCount: unseenOrders, markAsViewed: markOrdersViewed } = useSmartBadge('student_orders', myOrders, 'saleDate');

    // 5. Vouchers Badge
    const myVouchers = useMemo(() => {
        return vouchers.filter(v => v.assignedToUserId === displayUser?.id);
    }, [vouchers, displayUser]);
    const { unseenCount: unseenVouchers, markAsViewed: markVouchersViewed } = useSmartBadge('student_vouchers', myVouchers, 'issuedAt');

    // 6. Score Card Badge 
    const mySubmissions = useMemo(() => {
        if (!displayUser) return [];
        return submissions.filter(s => s.studentId === displayUser.id);
    }, [submissions, displayUser]);
    const { unseenCount: unseenScores, markAsViewed: markScoresViewed } = useSmartBadge('student_scores', mySubmissions, 'submittedAt');

    // 7. Groups/Inbox Badge (Mocking 'updatedAt' from unread total if simpler, or just reset logic)
    // Since 'unreadTotal' is a number, we can't track timestamps easily. 
    // We will just use the number itself to show badge, and clearing it might require 'markAllAsRead' logic in Broadcast context.
    // For now we pass it as badge directly.
    const markGroupsViewed = () => { }; // Handled by opening the tab usually? Or need explicit broadcast action. 



    const { enrolledCoursesCount, enrolledClassesCount, enrolledQuizzesCount, enrolledEventsCount, purchaseHistoryCount, topUpHistoryCount, myOrdersCount, uncollectedVouchersCount } = useMemo(() => {
        if (!displayUser) return { enrolledCoursesCount: 0, enrolledClassesCount: 0, enrolledQuizzesCount: 0, enrolledEventsCount: 0, purchaseHistoryCount: 0, topUpHistoryCount: 0, myOrdersCount: 0, uncollectedVouchersCount: 0 };

        const userSales = sales.filter(s => s.studentId === displayUser.id);
        const uniqueCourses = new Set(userSales.filter(s => s.itemType === 'course').map(s => s.itemId));
        const uniqueClasses = new Set(userSales.filter(s => s.itemType === 'class').map(s => s.itemId));
        const uniqueQuizzes = new Set(userSales.filter(s => s.itemType === 'quiz').map(s => s.itemId));
        const uniqueEvents = new Set(userSales.filter(s => s.itemType === 'event').map(s => s.itemId));

        const myOrdersCount = userSales.filter(s =>
            s.status === 'completed' &&
            (
                s.itemType === 'photo_purchase' ||
                s.itemType === 'marketplace_purchase' ||
                // This condition identifies legacy single-product sales while excluding other item types that might have snapshots
                (s.itemSnapshot && 'coverImages' in s.itemSnapshot && !s.cartItems)
            )
        ).length;

        const uncollectedVouchersCount = vouchers.filter(v => v.assignedToUserId === displayUser.id && !v.isCollected).length;

        return {
            enrolledCoursesCount: uniqueCourses.size,
            enrolledClassesCount: uniqueClasses.size,
            enrolledQuizzesCount: uniqueQuizzes.size,
            enrolledEventsCount: uniqueEvents.size,
            purchaseHistoryCount: userSales.length,
            topUpHistoryCount: displayUser.topUpHistory?.length || 0,
            myOrdersCount,
            uncollectedVouchersCount,
            certificatesCount: 0 // Placeholder, we access via context in dashboard but for tabs we need it here. But wait, certificates are in `useData()`. Let's grab them.
        };
    }, [displayUser, sales, vouchers]);

    // Better way: Grab certificates from useData directly for count
    // const { certificates } = useData(); // Removed redundant call
    const certificatesCount = useMemo(() => {
        if (!displayUser || !certificates) return 0;
        return certificates.filter(c => c.studentId === displayUser.id).length;
    }, [certificates, displayUser]);

    // Timetable State & Logic
    const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

    const { weekStart, weekEnd, scheduleForWeek } = useMemo(() => {
        if (!displayUser) return { weekStart: new Date(), weekEnd: new Date(), scheduleForWeek: [] };

        const getWeekRange = (offset: number) => {
            const now = new Date();
            const dayOfWeek = now.getDay();
            const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const monday = new Date(new Date(now.setDate(diff + (offset * 7))).setHours(0, 0, 0, 0));
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);
            return { weekStart: monday, weekEnd: sunday };
        };
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        const { weekStart, weekEnd } = getWeekRange(currentWeekOffset);
        const schedule: ScheduleItem[] = [];

        // Get enrolled classes
        const enrolledSales = sales.filter(s => s.studentId === displayUser.id && s.itemType === 'class' && s.status === 'completed');

        enrolledSales.forEach(sale => {
            const teacher = teachers.find(t => t.id === sale.teacherId);
            const liveClass = teacher?.individualClasses.find(c => c.id === sale.itemId);

            if (liveClass) {
                if (liveClass.status === 'canceled' || liveClass.isDeleted) return;

                const classDate = new Date(liveClass.date);
                classDate.setMinutes(classDate.getMinutes() + classDate.getTimezoneOffset());

                if (liveClass.recurrence === 'weekly') {
                    const dayIndex = new Date(liveClass.date).getDay();
                    const dayName = daysOfWeek[dayIndex];
                    const seriesStartDate = new Date(liveClass.date);
                    const seriesEndDate = liveClass.endDate ? new Date(liveClass.endDate) : null;

                    if (seriesStartDate <= weekEnd && (!seriesEndDate || seriesEndDate >= weekStart)) {
                        schedule.push({
                            id: liveClass.id,
                            type: 'class',
                            day: dayName,
                            subject: liveClass.subject,
                            title: liveClass.title,
                            startTime: liveClass.startTime,
                            endTime: liveClass.endTime
                        });
                    }
                } else if (liveClass.recurrence === 'flexible' && liveClass.flexibleDates) {
                    liveClass.flexibleDates.forEach(fd => {
                        const fdDate = new Date(fd.date);
                        fdDate.setMinutes(fdDate.getMinutes() + fdDate.getTimezoneOffset());
                        if (fdDate >= weekStart && fdDate <= weekEnd) {
                            const dayName = daysOfWeek[fdDate.getDay()];
                            schedule.push({
                                id: liveClass.id,
                                type: 'class',
                                day: dayName,
                                subject: liveClass.subject,
                                title: liveClass.title,
                                startTime: fd.startTime,
                                endTime: fd.endTime
                            });
                        }
                    })
                } else {
                    // One time
                    const cDate = new Date(liveClass.date);
                    cDate.setMinutes(cDate.getMinutes() + cDate.getTimezoneOffset());

                    if (cDate >= weekStart && cDate <= weekEnd) {
                        const dayName = daysOfWeek[cDate.getDay()];
                        schedule.push({
                            id: liveClass.id,
                            type: 'class',
                            day: dayName,
                            subject: liveClass.subject,
                            title: liveClass.title,
                            startTime: liveClass.startTime,
                            endTime: liveClass.endTime
                        });
                    }
                }
            }
        });

        // Get enrolled quizzes
        const enrolledQuizSales = sales.filter(s => s.studentId === displayUser.id && s.itemType === 'quiz' && s.status === 'completed');
        enrolledQuizSales.forEach(sale => {
            const teacher = teachers.find(t => t.id === sale.teacherId);
            const liveQuiz = teacher?.quizzes.find(q => q.id === sale.itemId);
            const quizToUse = liveQuiz || (sale.itemSnapshot as Quiz);

            if (quizToUse && quizToUse.status === 'scheduled') {
                const qDate = new Date(quizToUse.date);
                qDate.setMinutes(qDate.getMinutes() + qDate.getTimezoneOffset());

                if (qDate >= weekStart && qDate <= weekEnd) {
                    const dayName = daysOfWeek[qDate.getDay()];
                    schedule.push({
                        id: quizToUse.id,
                        type: 'quiz',
                        day: dayName,
                        subject: quizToUse.subject,
                        title: quizToUse.title,
                        startTime: quizToUse.startTime,
                        endTime: ''
                    });
                }
            }
        });

        // Get paid custom requests
        const paidRequests = customRequests.filter(r => r.status === 'paid');
        paidRequests.forEach(req => {
            req.requestedSlots.forEach(slot => {
                const slotDate = new Date(slot.date);
                // No timezone offset needed for simple date string usually, but consistent with above:
                // Actually YYYY-MM-DD string construction:
                const sDate = new Date(slot.date + 'T00:00:00');

                if (sDate >= weekStart && sDate <= weekEnd) {
                    const dayName = daysOfWeek[sDate.getDay()];
                    schedule.push({
                        id: req.id,
                        type: 'class', // Treat as class for display
                        day: dayName,
                        subject: req.topic,
                        title: `Private: ${req.topic}`,
                        startTime: slot.startTime,
                        endTime: slot.endTime
                    });
                }
            });
        });

        return { weekStart, weekEnd, scheduleForWeek: schedule };
    }, [displayUser, currentWeekOffset, sales, teachers, customRequests]);


    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });

    if (!displayUser) {
        if (pageState.name === 'student_dashboard' && pageState.joinCode) {
            return <GuestJoinView joinCode={pageState.joinCode} />;
        }
        return <div>User not found or you are not logged in.</div>;
    }

    const renderTabContent = () => {
        const isOwnerView = !effectiveIsAdminView;
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-8 animate-fadeIn">
                        {/* Header Content Specific to Overview */}
                        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                            <div>
                                <h1 className="text-3xl font-bold">Welcome{effectiveIsAdminView ? '' : ' back'}, {displayUser.firstName}!</h1>
                                <p className="text-light-subtle dark:text-dark-subtle mt-1">{effectiveIsAdminView ? `Viewing dashboard for ${displayUser.firstName} ${displayUser.lastName} (${displayUser.id})` : "Here's a summary of your learning activities."}</p>
                                {!effectiveIsAdminView && (
                                    <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                        Student ID: {displayUser.id}
                                    </div>
                                )}
                            </div>

                            {/* View as Student Toggle for Admins */}
                            {isAdminView && (
                                <div className="flex items-center gap-2 mb-2 md:mb-0">
                                    <span className="text-xs font-medium text-light-subtle dark:text-dark-subtle">
                                        {isViewAsStudent ? 'Viewing as Student' : 'Admin View'}
                                    </span>
                                    <button
                                        onClick={() => setIsViewAsStudent(!isViewAsStudent)}
                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isViewAsStudent ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isViewAsStudent ? 'translate-x-5' : 'translate-x-0'}`}
                                        />
                                    </button>
                                </div>
                            )}

                            {!effectiveIsAdminView && 'Notification' in window && Notification.permission === 'default' && (
                                <button
                                    onClick={() => enableNotifications()}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all animate-pulse"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                    </svg>
                                    Turn on Notifications
                                </button>
                            )}
                        </div>

                        {/* Voucher Notification */}
                        {uncollectedVouchersCount > 0 && !effectiveIsAdminView && (
                            <div className="mb-6 animate-fadeIn">
                                <button
                                    onClick={() => setActiveTab('my_vouchers')}
                                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg shadow-lg flex items-center justify-between hover:scale-[1.01] transition-transform"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/20 rounded-full animate-bounce">
                                            <TicketIcon className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold text-lg">You have a Gift Voucher!</h3>
                                            <p className="text-sm opacity-90">Someone has sent you a voucher. Click here to collect it.</p>
                                        </div>
                                    </div>
                                    <div className="bg-white text-primary font-bold px-3 py-1 rounded-full text-sm">
                                        {uncollectedVouchersCount} Waiting
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* Profile Completion Alert */}
                        {profileCompletion === 100 ? (
                            <div className="mb-6 animate-fadeIn">
                                <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-3 rounded-r-lg shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                            Great job, {displayUser.firstName}! Your profile is 100% complete.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setModalState({ name: 'edit_student_profile', userToEdit: displayUser })}
                                        className="text-xs px-3 py-1.5 bg-white dark:bg-green-800 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-100 font-medium rounded hover:bg-green-50 dark:hover:bg-green-700 transition-colors"
                                    >
                                        Edit Details
                                    </button>
                                </div>
                            </div>
                        ) : (
                            (profileCompletion < 100 || effectiveIsAdminView) && (
                                <div className="mb-6 animate-fadeIn">
                                    <div className="bg-yellow-100 dark:bg-yellow-900/50 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 p-4 rounded-r-lg shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="flex-grow">
                                            <p className="font-bold">Complete {effectiveIsAdminView ? 'this student\'s' : 'your'} profile for a better experience!</p>
                                            <div className="flex items-center gap-4 mt-2">
                                                <ProgressBar value={profileCompletion} max={100} />
                                                <span className="font-bold text-sm flex-shrink-0">{profileCompletion}%</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setModalState({ name: 'edit_student_profile', userToEdit: displayUser })}
                                            className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-md hover:bg-yellow-600 transition-colors flex-shrink-0 w-full sm:w-auto"
                                        >
                                            Complete Profile
                                        </button>
                                    </div>
                                </div>
                            )
                        )}

                        <MyExamsSection user={displayUser} />

                        <div>
                            <h2 className="text-xl font-bold mb-4">Dashboard Overview</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatCard title="Enrolled Courses" value={enrolledCoursesCount} icon={<BookOpenIcon className="w-6 h-6" />} onAction={() => handleTabChange('courses')} />
                                <StatCard title="Active Classes" value={enrolledClassesCount} icon={<VideoCameraIcon className="w-6 h-6" />} onAction={handleViewUpcomingClasses} />
                                <StatCard
                                    title="Account Balance"
                                    value={currencyFormatter.format(displayUser.accountBalance)}
                                    icon={<BanknotesIcon className="w-6 h-6" />}
                                    onAction={!effectiveIsAdminView ? () => setIsTopUpModalOpen(true) : undefined}
                                    actionLabel="Top Up"
                                />
                            </div>
                        </div>


                    </div>
                );
            case 'timetable':
                return (
                    <div className="animate-fadeIn">
                        <div className="flex justify-between items-center mb-4">
                            <button onClick={() => setCurrentWeekOffset(prev => prev - 1)} className="px-4 py-2 text-sm font-medium border border-light-border dark:border-dark-border rounded-md hover:bg-light-border dark:hover:bg-dark-border transition-colors">&lt; Previous Week</button>
                            <span className="font-semibold text-lg">{weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}</span>
                            <button onClick={() => setCurrentWeekOffset(prev => prev + 1)} className="px-4 py-2 text-sm font-medium border border-light-border dark:border-dark-border rounded-md hover:bg-light-border dark:hover:bg-dark-border transition-colors">Next Week &gt;</button>
                        </div>
                        <div className="bg-light-surface dark:bg-dark-surface p-4 rounded-lg shadow-md">
                            <TimeTable
                                schedule={scheduleForWeek}
                                onItemClick={(item) => handleNavigate(item.type === 'class' ? { name: 'class_detail', classId: item.id as number } : { name: 'quiz_detail', quizId: item.id as string })}
                            />
                        </div>
                    </div>
                );
            case 'courses': return <MyCourses user={displayUser} isOwnerView={isOwnerView} />;
            case 'classes': return <MyClasses user={displayUser} isOwnerView={isOwnerView} filter={classFilter} />;
            case 'past_classes': return <MyPastClasses user={displayUser} isOwnerView={isOwnerView} />;
            case 'quizzes': return <MyQuizzes user={displayUser} isOwnerView={isOwnerView} />;
            case 'certificates': return <MyCertificates user={displayUser} />;
            case 'groups': return <StudentGroupsTab student={displayUser} autoJoinCode={(pageState.name === 'student_dashboard' ? pageState.joinCode : undefined)} />;
            case 'my_events': return <MyEvents user={displayUser} />;
            case 'history': return <TransactionHistory user={displayUser} />;
            case 'attendance': return <MyAttendance user={displayUser} />;
            case 'profile': return <MyProfile user={displayUser} isAdminView={effectiveIsAdminView} />;
            case 'my_orders': return <MyOrders user={displayUser} />;
            case 'requests':
                return <MyRequests student={displayUser} />;
            case 'score_card': return <MyScoreCard user={displayUser} />;
            case 'my_vouchers': return <MyVouchers user={displayUser} />;
            default: return null;
        }
    };

    const tabCounts = {
        courses: enrolledCoursesCount,
        classes: enrolledClassesCount,
        quizzes: enrolledQuizzesCount,
        events: enrolledEventsCount,
        orders: myOrdersCount,
        history: purchaseHistoryCount + topUpHistoryCount,
        certificates: certificatesCount,
        groups: unreadTotal || 0
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="md:w-64 flex-shrink-0 order-1 md:order-1 relative z-20">
                    <div className="sticky top-24">
                        <StudentDashboardTabs
                            activeTab={activeTab}
                            setActiveTab={handleTabChange}
                            counts={tabCounts}
                            badges={{
                                requests: unseenRequests > 0,
                                certificates: unseenCertificates > 0,
                                attendance: unseenAttendance > 0,
                                my_orders: unseenOrders > 0,
                                my_vouchers: unseenVouchers > 0,
                                score_card: unseenScores > 0,
                                groups: unreadTotal > 0
                            }}
                        />
                    </div>
                </div>

                {/* Main Content Area - Added padding-left on mobile to avoid overlap with fixed sidebar */}
                <div className="flex-1 min-w-0 order-2 md:order-2 pl-16 md:pl-0 animate-slideInUp relative z-0">
                    {renderTabContent()}
                </div>
            </div>

            {!effectiveIsAdminView && isTopUpModalOpen && (
                <TopUpModal
                    isOpen={isTopUpModalOpen}
                    onClose={handleCloseTopUp}
                />
            )}
        </div>
    );
};

export default StudentDashboard;