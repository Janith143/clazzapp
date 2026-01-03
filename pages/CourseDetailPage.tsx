import React, { useState, useMemo } from 'react';
import { Course, Teacher, Lecture, LiveSession, Sale, PaymentMethod, PaymentPlan } from '../types.ts';
import { ChevronLeftIcon, LockClosedIcon, PlayCircleIcon, SpinnerIcon, LinkIcon, VideoCameraIcon, ClockIcon, CalendarIcon, CheckCircleIcon, PencilIcon, SaveIcon, XIcon } from '../components/Icons.tsx';
import StarRating from '../components/StarRating.tsx';
import ProgressBar from '../components/ProgressBar.tsx';
import Countdown from '../components/Countdown.tsx';
import { slugify } from '../utils/slug.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useNavigation } from '../contexts/NavigationContext.tsx';
import { useUI } from '../contexts/UIContext.tsx';
import { useData, useFetchItem } from '../contexts/DataContext.tsx';
import { useSEO } from '../hooks/useSEO.ts';
import { getAverageRating, getOptimizedImageUrl, createSrcSet } from '../utils.ts';
import SEOHead from '../components/SEOHead.tsx';
import MarkdownDisplay from '../components/MarkdownDisplay.tsx';
import ConfirmationModal from '../components/ConfirmationModal.tsx';
import Modal from '../components/Modal.tsx';
import PaymentMethodSelector from '../components/PaymentMethodSelector.tsx';
import GuestActionPrompt from '../components/GuestActionPrompt.tsx';

interface CourseDetailPageProps {
    courseId?: string;
    slug?: string;
}

const CourseDetailPage: React.FC<CourseDetailPageProps> = ({ courseId, slug }) => {
    const { currentUser } = useAuth();
    const { handleBack, handleNavigate, paymentGatewaySettings } = useNavigation();
    const { setModalState, setVideoPlayerState, addToast } = useUI();
    const { handleRateCourse, handleEnroll, handleUpdateTeacher, sales, teachers, loading: dataLoading } = useData();

    const resolvedCourseId = useMemo(() => {
        if (courseId) return courseId;
        if (slug && teachers.length > 0) {
            for (const t of teachers) {
                const found = t.courses.find(c => slugify(c.title) === slug);
                if (found) return found.id;
            }
        }
        return '';
    }, [courseId, slug, teachers]);

    const { item: fetchedCourse, teacher, isOwner, isEnrolled } = useFetchItem('course', resolvedCourseId);

    const course = fetchedCourse as Course | null;

    const [isConfirmingEnrollment, setIsConfirmingEnrollment] = useState(false);
    const [showPaymentSelector, setShowPaymentSelector] = useState(false);
    const [showGuestPrompt, setShowGuestPrompt] = useState(false);
    const [editSessionId, setEditSessionId] = useState<string | null>(null);
    const [linkInput, setLinkInput] = useState('');
    const [linkType, setLinkType] = useState<'join' | 'recording'>('join');

    const availablePlans: PaymentPlan[] = useMemo(() => {
        if (!course) return ['full'];
        if (course.paymentPlans && course.paymentPlans.length > 0) return course.paymentPlans;
        return course.paymentPlan ? [course.paymentPlan] : ['full'];
    }, [course]);

    const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<PaymentPlan>(availablePlans[0]);

    // Update selected plan if course changes or available plans change
    React.useEffect(() => {
        if (availablePlans.length > 0 && !availablePlans.includes(selectedPaymentPlan)) {
            setSelectedPaymentPlan(availablePlans[0]);
        }
    }, [availablePlans, selectedPaymentPlan]);


    const [partialPaymentTarget, setPartialPaymentTarget] = useState<{ amount: number, description: string, metadata: any } | null>(null);

    const courseType = course ? (course.type || 'recorded') : 'recorded';



    const totalDurationHoursForSchema = useMemo(() => {
        if (!course || !('lectures' in course)) return 0;
        return course.type === 'recorded'
            ? course.lectures.reduce((acc, l) => acc + l.durationMinutes, 0) / 60
            : (course.scheduleConfig?.durationMinutes || 60) * (course.liveSessions?.length || 0) / 60;
    }, [course]);

    const averageRating = useMemo(() => getAverageRating(course && 'ratings' in course ? course.ratings : undefined), [course]);
    const userRating = useMemo(() => (course && 'ratings' in course ? course.ratings : [])?.find(r => r.studentId === currentUser?.id)?.rating || 0, [course, currentUser]);

    const structuredData = useMemo(() => {
        if (!course || !teacher) return null;
        return {
            "@context": "https://schema.org",
            "@type": "Course",
            "name": course.title,
            "description": course.description,
            "provider": {
                "@type": "Person",
                "name": teacher.name,
                "image": teacher.avatar
            },
            "hasCourseInstance": {
                "@type": "CourseInstance",
                "courseMode": course.type === "live" ? "Live" : "Online",
                "courseWorkload": `PT${Math.round(totalDurationHoursForSchema)}H`
            },
            "offers": {
                "@type": "Offer",
                "price": course.fee,
                "priceCurrency": "LKR",
                "category": "Paid"
            },
            "aggregateRating": averageRating.count > 0 ? {
                "@type": "AggregateRating",
                "ratingValue": averageRating.average,
                "reviewCount": averageRating.count,
                "bestRating": 5,
                "worstRating": 1
            } : undefined
        };
    }, [course, teacher, totalDurationHoursForSchema, averageRating]);

    // SEOHead is used inside return, but we can't put it there easily without wrapping lots of stuff or using a fragment at top level.
    // Actually, we can put it in the main div.



    const completionPercentage = useMemo(() => {
        if (!isEnrolled || !currentUser?.watchHistory || !course || !('lectures' in course) || !currentUser.watchHistory[course.id]) {
            return 0;
        }
        const watchedLectures = currentUser.watchHistory[course.id];
        const watchedCount = Object.keys(watchedLectures).length;

        if (courseType === 'live' && course.liveSessions) {
            return 0; // TODO: Implement session tracking
        }

        const totalLectures = course.lectures.length;
        return totalLectures > 0 ? (watchedCount / totalLectures) * 100 : 0;
    }, [currentUser, course, isEnrolled, courseType]);

    const nextLiveSession = useMemo(() => {
        if (!course || courseType !== 'live' || !course.liveSessions) return null;
        const now = new Date();
        const futureSessions = course.liveSessions.filter(s => {
            const end = new Date(`${s.date}T${s.endTime}`);
            return end > now;
        });
        return futureSessions.sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime())[0];
    }, [course, courseType]);

    const userPurchases = useMemo(() => {
        if (!currentUser || !course) return [];
        return sales.filter(s => s.itemId === course.id && s.studentId === currentUser.id && s.status === 'completed');
    }, [sales, currentUser, course]);

    const hasFullAccess = useMemo(() => {
        if (isOwner) return true;
        return userPurchases.some(s => !s.purchaseMetadata || s.purchaseMetadata.type === 'full');
    }, [isOwner, userPurchases]);

    const isBlockUnlocked = (type: 'month' | 'session' | 'installment', index: number) => {
        if (hasFullAccess) return true;
        return userPurchases.some(s => s.purchaseMetadata?.type === type && s.purchaseMetadata?.index === index);
    };

    if (dataLoading) {
        return (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center flex flex-col items-center justify-center">
                <SpinnerIcon className="w-8 h-8 text-primary" />
                <p className="mt-4 text-light-subtle dark:text-dark-subtle">Loading course details...</p>
            </div>
        );
    }

    if (!course || !teacher || !('lectures' in course)) {
        return <div>Course not found. It may have been removed by the teacher.</div>;
    }

    const getPaymentAmountAndDescription = () => {
        let amount = course.fee;
        let description = course.title;
        let metadata: Sale['purchaseMetadata'] = { type: 'full' };

        // Use selectedPaymentPlan instead of course.paymentPlan
        if (courseType === 'live') {
            if (selectedPaymentPlan === 'installments_2') {
                amount = course.fee / 2;
                description = `${course.title} (Installment 1 of 2)`;
                metadata = { type: 'installment', index: 0 };
            } else if (selectedPaymentPlan === 'monthly') {
                const totalSessions = course.liveSessions?.length || 1;
                const daysCount = course.scheduleConfig?.days?.length || 1;
                const weeks = course.scheduleConfig?.weekCount || Math.ceil(totalSessions / daysCount) || 1;
                const months = Math.max(1, weeks / 4);
                amount = Math.round(course.fee / months);
                description = `${course.title} (Month 1)`;
                metadata = { type: 'month', index: 0 };
            } else if (selectedPaymentPlan === 'per_session') {
                const totalSessions = course.liveSessions?.length || 1;
                amount = Math.round(course.fee / totalSessions);
                description = `${course.title} (Session 1)`;
                metadata = { type: 'session', index: 0 };
            }
        }
        return { amount, description, metadata };
    };

    const initialPayment = getPaymentAmountAndDescription();

    const handleEnrollClick = () => {
        if (!currentUser) {
            setShowGuestPrompt(true);
        } else {
            setPartialPaymentTarget(initialPayment as any);
            setIsConfirmingEnrollment(true);
        }
    };

    const handleUnlockClick = (amount: number, description: string, metadata: any) => {
        if (!currentUser) {
            setShowGuestPrompt(true);
            return;
        }
        setPartialPaymentTarget({ amount, description, metadata });
        setIsConfirmingEnrollment(true);
    };

    const handleConfirmStepOne = () => {
        if (partialPaymentTarget) {
            const balanceToApply = Math.min(currentUser?.accountBalance || 0, partialPaymentTarget.amount);
            const remaining = partialPaymentTarget.amount - balanceToApply;

            if (remaining > 0) {
                setShowPaymentSelector(true);
                setIsConfirmingEnrollment(false);
            } else {
                handleEnroll(course, 'course', false, partialPaymentTarget.amount, partialPaymentTarget.description, partialPaymentTarget.metadata);
                setIsConfirmingEnrollment(false);
                setPartialPaymentTarget(null);
            }
        }
    };

    const handlePaymentMethodSelected = (method: PaymentMethod) => {
        if (partialPaymentTarget) {
            handleEnroll(course, 'course', false, partialPaymentTarget.amount, partialPaymentTarget.description, partialPaymentTarget.metadata, method);
        }
        setShowPaymentSelector(false);
        setPartialPaymentTarget(null);
    };

    const onViewTeacher = (teacher: Teacher) => {
        if (teacher.username) {
            handleNavigate({ name: 'teacher_profile_slug', slug: teacher.username });
        } else {
            handleNavigate({ name: 'teacher_profile', teacherId: teacher.id });
        }
    };

    const onPlayLecture = (lecture: Lecture, course: Course, isEnrolled: boolean) => {
        setVideoPlayerState({ isOpen: true, lecture, course, isEnrolled });
    };

    const handleEditLink = (sessionId: string, currentLink: string, type: 'join' | 'recording') => {
        setEditSessionId(sessionId);
        setLinkInput(currentLink || '');
        setLinkType(type);
    };

    const handleSaveLink = async () => {
        if (!course.liveSessions || !editSessionId) return;
        if (linkInput && !linkInput.startsWith('http')) {
            alert("Please enter a valid URL starting with http:// or https://");
            return;
        }
        const field = linkType === 'join' ? 'joinLink' : 'recordingLink';
        const updatedSessions = course.liveSessions.map(s =>
            s.id === editSessionId ? { ...s, [field]: linkInput } : s
        );
        try {
            const newCourses = teacher.courses.map(c => c.id === course.id ? { ...c, liveSessions: updatedSessions } : c);
            await handleUpdateTeacher(teacher.id, { courses: newCourses });
            addToast("Link updated successfully!", "success");
            setEditSessionId(null);
            setLinkInput('');
        } catch (e) {
            addToast("Failed to update link.", "error");
        }
    };

    const renderLiveSessionList = () => {
        const now = new Date();
        const sortedSessions = (course.liveSessions || []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let groups: { title: string, sessions: LiveSession[], unlockCost: number, isLocked: boolean, metadata: any }[] = [];

        // Use selectedPaymentPlan for display logic
        if (selectedPaymentPlan === 'monthly') {
            const sessionsPerWeek = course.scheduleConfig?.days?.length || 1;
            const sessionsPerMonth = sessionsPerWeek * 4;
            const monthCost = initialPayment.amount;
            for (let i = 0; i < sortedSessions.length; i += sessionsPerMonth) {
                const chunk = sortedSessions.slice(i, i + sessionsPerMonth);
                const monthIndex = i / sessionsPerMonth;
                groups.push({
                    title: `Month ${monthIndex + 1}`,
                    sessions: chunk,
                    unlockCost: monthCost,
                    isLocked: !isBlockUnlocked('month', monthIndex),
                    metadata: { type: 'month', index: monthIndex }
                });
            }
        } else if (selectedPaymentPlan === 'installments_2') {
            const halfPoint = Math.ceil(sortedSessions.length / 2);
            const installmentCost = course.fee / 2;
            groups.push({
                title: "Part 1 (First Half)",
                sessions: sortedSessions.slice(0, halfPoint),
                unlockCost: installmentCost,
                isLocked: !isBlockUnlocked('installment', 0),
                metadata: { type: 'installment', index: 0 }
            });
            groups.push({
                title: "Part 2 (Second Half)",
                sessions: sortedSessions.slice(halfPoint),
                unlockCost: installmentCost,
                isLocked: !isBlockUnlocked('installment', 1),
                metadata: { type: 'installment', index: 1 }
            });
        } else if (selectedPaymentPlan === 'per_session') {
            const sessionCost = Math.round(course.fee / sortedSessions.length);
            groups = sortedSessions.map((s, i) => ({
                title: `Session ${i + 1}`,
                sessions: [s],
                unlockCost: sessionCost,
                isLocked: !isBlockUnlocked('session', i),
                metadata: { type: 'session', index: i }
            }));
        } else {
            groups.push({
                title: "All Sessions",
                sessions: sortedSessions,
                unlockCost: course.fee,
                isLocked: !hasFullAccess,
                metadata: { type: 'full' }
            });
        }
        if (sortedSessions.length === 0) {
            return (
                <div className="text-center py-8 text-light-subtle dark:text-dark-subtle border-2 border-dashed border-light-border dark:border-dark-border rounded-lg">
                    <p>No live sessions scheduled yet.</p>
                </div>
            );
        }
        return (
            <div className="space-y-6">
                {groups.map((group, groupIndex) => (
                    <div key={groupIndex} className="relative border border-light-border dark:border-dark-border rounded-lg overflow-hidden">
                        <div className="bg-light-background dark:bg-dark-background p-3 border-b border-light-border dark:border-dark-border flex justify-between items-center">
                            <h3 className="font-bold text-light-text dark:text-dark-text">{group.title}</h3>
                            {group.isLocked ? (
                                <span className="text-xs font-bold text-red-500 flex items-center"><LockClosedIcon className="w-3 h-3 mr-1" /> Locked</span>
                            ) : (
                                <span className="text-xs font-bold text-green-600 flex items-center"><CheckCircleIcon className="w-3 h-3 mr-1" /> Unlocked</span>
                            )}
                        </div>
                        <div className="relative p-4 space-y-4 bg-light-surface dark:bg-dark-surface">
                            {group.isLocked && (
                                <div className="flex flex-col items-center justify-center p-6 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-lg text-center mb-4">
                                    <LockClosedIcon className="w-10 h-10 text-gray-400 mb-2" />
                                    <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200">Content Locked</h4>
                                    <p className="text-sm text-light-subtle dark:text-dark-subtle mb-4">Purchase this section to access class links and recordings.</p>
                                    <button
                                        onClick={() => handleUnlockClick(group.unlockCost, `Unlock ${group.title}`, group.metadata)}
                                        className="px-6 py-2 bg-primary text-white font-bold rounded-full hover:bg-primary-dark transition-colors shadow-md"
                                    >
                                        Pay {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(group.unlockCost)} to Unlock
                                    </button>
                                </div>
                            )}
                            {group.sessions.map((session, idx) => {
                                const startDateTime = new Date(`${session.date}T${session.startTime}`);
                                const endDateTime = new Date(`${session.date}T${session.endTime}`);
                                const isLive = now >= new Date(startDateTime.getTime() - 15 * 60000) && now <= endDateTime;
                                const isEditing = editSessionId === session.id;
                                const canAccess = !group.isLocked || isOwner;
                                return (
                                    <div key={session.id} className={`p-3 rounded-lg border ${isLive ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background'} ${!canAccess ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-bold text-light-text dark:text-dark-text text-sm">{session.title}</h4>
                                                <div className="flex items-center text-xs text-light-subtle dark:text-dark-subtle mt-1 space-x-3">
                                                    <span className="flex items-center"><CalendarIcon className="w-3 h-3 mr-1" />{new Date(session.date).toLocaleDateString()}</span>
                                                    <span className="flex items-center"><ClockIcon className="w-3 h-3 mr-1" />{session.startTime} - {session.endTime}</span>
                                                </div>
                                            </div>
                                            {isLive && <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded animate-pulse">LIVE</span>}
                                        </div>
                                        {canAccess && !isOwner && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {isLive && session.joinLink && (
                                                    <a href={session.joinLink} target="_blank" rel="noopener noreferrer" className="flex items-center px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"><VideoCameraIcon className="w-3 h-3 mr-1" /> Join Class</a>
                                                )}
                                                {session.recordingLink && (
                                                    <a href={session.recordingLink} target="_blank" rel="noopener noreferrer" className="flex items-center px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary-dark"><PlayCircleIcon className="w-3 h-3 mr-1" /> Recording</a>
                                                )}
                                                {session.resourceLink && (
                                                    <a href={session.resourceLink} target="_blank" rel="noopener noreferrer" className="flex items-center px-3 py-1.5 border border-primary text-primary text-xs rounded hover:bg-primary/10"><LinkIcon className="w-3 h-3 mr-1" /> Resources</a>
                                                )}
                                            </div>
                                        )}
                                        {isOwner && (
                                            <div className="mt-2 pt-2 border-t border-light-border dark:border-dark-border">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded border border-primary">
                                                        <input type="text" value={linkInput} onChange={e => setLinkInput(e.target.value)} className="flex-grow p-1 text-xs border rounded bg-transparent text-light-text dark:text-dark-text focus:outline-none" placeholder={linkType === 'join' ? "Zoom/Meet URL" : "Recording URL"} autoFocus />
                                                        <button onClick={handleSaveLink} className="text-green-600 hover:bg-green-100 p-1 rounded"><SaveIcon className="w-4 h-4" /></button>
                                                        <button onClick={() => setEditSessionId(null)} className="text-red-500 hover:bg-red-100 p-1 rounded"><XIcon className="w-4 h-4" /></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <VideoCameraIcon className="w-3 h-3 text-green-600" />
                                                                <span className="font-semibold">Join Link:</span>
                                                                {session.joinLink ? <a href={session.joinLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 truncate">{session.joinLink}</a> : <span className="text-gray-400 italic">Not set</span>}
                                                            </div>
                                                            <button onClick={() => handleEditLink(session.id, session.joinLink || '', 'join')} className="p-1 hover:bg-light-border dark:hover:bg-dark-border rounded text-primary" title="Edit Join Link"><PencilIcon className="w-3 h-3" /></button>
                                                        </div>
                                                        <div className="flex items-center justify-between text-xs">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <PlayCircleIcon className="w-3 h-3 text-red-600" />
                                                                <span className="font-semibold">Recording:</span>
                                                                {session.recordingLink ? <a href={session.recordingLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 truncate">{session.recordingLink}</a> : <span className="text-gray-400 italic">Not set</span>}
                                                            </div>
                                                            <button onClick={() => handleEditLink(session.id, session.recordingLink || '', 'recording')} className="p-1 hover:bg-light-border dark:hover:bg-dark-border rounded text-primary" title="Edit Recording Link"><PencilIcon className="w-3 h-3" /></button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });
    const totalDurationHours = courseType === 'recorded'
        ? course.lectures.reduce((acc, l) => acc + l.durationMinutes, 0) / 60
        : (course.scheduleConfig?.durationMinutes || 60) * (course.liveSessions?.length || 0) / 60;

    const balanceToApply = Math.min(currentUser?.accountBalance || 0, initialPayment.amount);
    const remainingFee = initialPayment.amount - balanceToApply;
    const coverImageSrcSet = createSrcSet(course.coverImage, [400, 800]);
    const getEnrollButtonText = () => {
        if (hasFullAccess) return "Course Fully Unlocked";
        if (userPurchases.length > 0 && selectedPaymentPlan !== 'full') return "Continue Learning";
        if (currentUser?.role === 'teacher' || currentUser?.role === 'admin') return "Only students can enroll";
        return `Pay ${initialPayment.description} (${currencyFormatter.format(initialPayment.amount)})`;
    };
    const isFullyEnrolled = hasFullAccess || (selectedPaymentPlan === 'full' && isEnrolled);
    const disableEnrollButton = isFullyEnrolled || currentUser?.role === 'teacher' || currentUser?.role === 'admin';

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slideInUp">
            <SEOHead
                title={course ? course.title : 'Course Details'}
                description={course ? course.description.substring(0, 160) : 'View course details on clazz.lk'}
                image={course && 'coverImage' in course ? course.coverImage : undefined}
                structuredData={structuredData}
            />
            <div className="mb-4">
                <button onClick={handleBack} className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors">
                    <ChevronLeftIcon className="h-5 w-5" />
                    <span>Back</span>
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                        <div className="flex items-center justify-between">
                            <h1 className="text-3xl md:text-4xl font-bold">{course.title}</h1>
                            {courseType === 'live' && <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold uppercase">Live Course</span>}
                        </div>
                        <div className="mt-2 text-light-subtle dark:text-dark-subtle">
                            <MarkdownDisplay content={course.description} className="prose-lg" />
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                            <button onClick={() => onViewTeacher(teacher)} className="flex items-center space-x-2 group">
                                <img src={teacher.avatar} alt={teacher.name} className="w-10 h-10 rounded-full" />
                                <div>
                                    <p className="text-sm text-light-subtle dark:text-dark-subtle">Created by</p>
                                    <p className="font-semibold group-hover:underline">{teacher.name}</p>
                                </div>
                            </button>
                            <div className="h-8 w-px bg-light-border dark:bg-dark-border"></div>
                            <StarRating rating={averageRating.average} count={averageRating.count} readOnly={true} />
                        </div>
                    </div>
                    {isEnrolled && !course.isDeleted && (
                        <div className="mt-8 bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md animate-fadeIn space-y-4">
                            {courseType === 'recorded' && (
                                <div>
                                    <h3 className="text-xl font-bold mb-2">Your Progress</h3>
                                    <ProgressBar value={completionPercentage} max={100} />
                                    <p className="text-xs text-right font-medium text-light-subtle dark:text-dark-subtle mt-1">{Math.round(completionPercentage)}% Complete</p>
                                </div>
                            )}
                            <div className="pt-4 border-t border-light-border dark:border-dark-border">
                                <h3 className="text-xl font-bold mb-2">{userRating > 0 ? 'Update your rating' : 'Rate this course'}</h3>
                                <p className="text-sm text-light-subtle dark:text-dark-subtle mb-4">Your feedback helps other students.</p>
                                <StarRating rating={userRating} onRatingChange={(rating) => handleRateCourse(course.id, rating)} size="lg" showLabel={false} />
                            </div>
                        </div>
                    )}
                    <div className="mt-8 bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                        {courseType === 'live' && availablePlans.length > 1 && (
                            <div className="mb-6">
                                <h3 className="text-xl font-bold mb-3">Choose Payment Plan</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {availablePlans.map(plan => (
                                        <label key={plan} className={`relative flex items-center p-4 border rounded-lg cursor-pointer transition-all ${selectedPaymentPlan === plan ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-background'}`}>
                                            <input
                                                type="radio"
                                                name="paymentPlan"
                                                value={plan}
                                                checked={selectedPaymentPlan === plan}
                                                onChange={() => setSelectedPaymentPlan(plan)}
                                                className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                                            />
                                            <div className="ml-3">
                                                <span className="block font-bold text-sm">
                                                    {plan === 'full' && 'Full Payment'}
                                                    {plan === 'monthly' && 'Monthly'}
                                                    {plan === 'per_session' && 'Per Session'}
                                                    {plan === 'installments_2' && '2 Installments'}
                                                </span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                        <h2 className="text-2xl font-bold mb-4">{courseType === 'live' ? 'Class Schedule' : 'Course Content'}</h2>
                        {courseType === 'live' ? renderLiveSessionList() : (
                            <div className="space-y-3">
                                {course.lectures.map((lecture, index) => (
                                    <div key={lecture.id} className={`p-3 bg-light-background dark:bg-dark-background rounded-md border border-light-border dark:border-dark-border flex items-center justify-between transition-colors ${!isEnrolled && !lecture.isFreePreview ? 'opacity-70' : 'group hover:border-primary'}`}>
                                        <button onClick={() => onPlayLecture(lecture, course, isEnrolled)} disabled={!isEnrolled && !lecture.isFreePreview} className="flex items-start text-left flex-grow disabled:cursor-not-allowed">
                                            <span className={`mr-3 mt-1 font-bold text-sm ${!isEnrolled && !lecture.isFreePreview ? 'text-light-subtle dark:text-dark-subtle' : 'text-light-subtle dark:text-dark-subtle group-hover:text-primary'}`}>{index + 1}</span>
                                            <div>
                                                <p className={`font-semibold ${!isEnrolled && !lecture.isFreePreview ? 'text-light-text dark:text-dark-text' : 'text-light-text dark:text-dark-text group-hover:text-primary'}`}>{lecture.title}</p>
                                                <div className="flex items-center text-xs text-light-subtle dark:text-dark-subtle mt-1">
                                                    <span>{lecture.durationMinutes} mins</span>
                                                    {lecture.isFreePreview && <span className="ml-2 text-green-500 font-medium">(Free Preview)</span>}
                                                </div>
                                            </div>
                                        </button>
                                        <div className="flex-shrink-0 ml-2 flex items-center space-x-4">
                                            {isEnrolled && lecture.resourcesUrl && <a href={lecture.resourcesUrl} target="_blank" rel="noopener noreferrer" title="View Resources" className="flex items-center text-blue-500 hover:text-blue-700 z-10 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/50"><LinkIcon className="w-5 h-5" /></a>}
                                            <div className="flex-shrink-0">{isEnrolled || lecture.isFreePreview ? <button onClick={() => onPlayLecture(lecture, course, isEnrolled)} title="Play Lecture"><PlayCircleIcon className="w-6 h-6 text-light-subtle dark:text-dark-subtle group-hover:text-primary" /></button> : <span title="Enroll to watch"><LockClosedIcon className="w-5 h-5 text-light-subtle dark:text-dark-subtle" /></span>}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <div className="sticky top-24 bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden">
                        <img src={getOptimizedImageUrl(course.coverImage, 400)} srcSet={coverImageSrcSet} sizes="33vw" alt={course.title} className="w-full h-48 object-cover" crossOrigin="anonymous" />
                        <div className="p-6">
                            {courseType === 'live' && nextLiveSession ? (
                                <div className="mb-6 pb-6 border-b border-light-border dark:border-dark-border">
                                    <h3 className="font-bold text-center text-lg mb-2">Next Session Starts In</h3>
                                    <Countdown targetDate={new Date(`${nextLiveSession.date}T${nextLiveSession.startTime}`)} completionMessage="Class is starting!" />
                                </div>
                            ) : null}
                            <div className="text-left">
                                <p className="text-3xl font-bold text-primary">{initialPayment.amount > 0 ? currencyFormatter.format(initialPayment.amount) : 'Free'}</p>
                                {selectedPaymentPlan && selectedPaymentPlan !== 'full' && <div className="text-xs font-semibold text-light-subtle dark:text-dark-subtle uppercase mt-1"><p>Plan: {selectedPaymentPlan.replace('_', ' ')}</p><p className="text-[10px] opacity-75 mt-0.5 text-primary">Total Fee: {currencyFormatter.format(course.fee)}</p></div>}
                            </div>
                            {currentUser && balanceToApply > 0 && !isFullyEnrolled && !course.isDeleted && <div className="mt-4 p-3 text-sm bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-md"><p className="font-semibold text-green-800 dark:text-green-200">Account Balance Applied!</p><div className="flex justify-between text-green-700 dark:text-green-300"><span>Balance Used:</span><span>-{currencyFormatter.format(balanceToApply)}</span></div><div className="flex justify-between font-bold mt-1 pt-1 border-t border-green-300 dark:border-green-700"><span>Amount to Pay:</span><span>{currencyFormatter.format(remainingFee)}</span></div></div>}
                            {course.isDeleted ? <div className="mt-4 w-full text-center px-4 py-3 text-sm font-medium text-yellow-800 bg-yellow-100 dark:text-yellow-200 dark:bg-yellow-900/50 rounded-md">This course has been removed by the teacher.</div> : <button onClick={handleEnrollClick} disabled={disableEnrollButton} className="mt-4 w-full bg-primary text-white font-bold py-3 rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">{getEnrollButtonText()}</button>}
                            <div className="mt-6 space-y-3 text-sm"><p><strong>This course includes:</strong></p><ul className="list-disc list-inside text-light-subtle dark:text-dark-subtle"><li>{courseType === 'live' ? `${course.liveSessions?.length || 0} Live Sessions` : `${course.lectures.length} lectures`}</li><li>{totalDurationHours.toFixed(1)} hours of content</li>{courseType === 'live' && <li>Live Q&A with Teacher</li>}<li>Certificate of Completion</li></ul></div>
                        </div>
                    </div>
                </div>
            </div>
            {isConfirmingEnrollment && partialPaymentTarget && (() => {
                let message: string;
                let confirmText: string;
                const totalAmount = partialPaymentTarget.amount;
                if (balanceToApply > 0) {
                    if (remainingFee > 0) {
                        message = `The price for "${partialPaymentTarget.description}" is ${currencyFormatter.format(totalAmount)}. Your account balance of ${currencyFormatter.format(balanceToApply)} will be applied. Continue to select a payment method for the remaining ${currencyFormatter.format(remainingFee)}?`;
                        confirmText = `Continue to Payment`;
                    } else {
                        message = `Your account balance of ${currencyFormatter.format(balanceToApply)} will fully cover the cost for "${partialPaymentTarget.description}". Continue?`;
                        confirmText = 'Use Balance to Purchase';
                    }
                } else {
                    message = `You are about to pay ${currencyFormatter.format(totalAmount)} for "${partialPaymentTarget.description}". Continue to select a payment method?`;
                    confirmText = `Continue to Payment`;
                }
                return <ConfirmationModal isOpen={true} onClose={() => { setIsConfirmingEnrollment(false); setPartialPaymentTarget(null); }} onConfirm={handleConfirmStepOne} title={`Confirm Purchase: ${course.title}`} message={message} confirmText={confirmText} />;
            })()}
            {showPaymentSelector && (
                <Modal isOpen={true} onClose={() => setShowPaymentSelector(false)} title="Select Payment Method">
                    <PaymentMethodSelector onSelect={handlePaymentMethodSelected} paymentGatewaySettings={paymentGatewaySettings} />
                </Modal>
            )}
            {showGuestPrompt && course && teacher && (
                <Modal isOpen={true} onClose={() => setShowGuestPrompt(false)} title="Enroll in Course">
                    <GuestActionPrompt
                        title={`Enroll in ${course.title}`}
                        subtitle={`By ${teacher.name}`}
                        description={<MarkdownDisplay content={course.description} className="line-clamp-3" />}
                        reason="You need to be logged in to enroll in this course."
                        onLogin={() => { setShowGuestPrompt(false); setModalState({ name: 'login', preventRedirect: true }); }}
                        onSignup={() => { setShowGuestPrompt(false); setModalState({ name: 'register', preventRedirect: true }); }}
                    />
                </Modal>
            )}
        </div>
    );
};

export default CourseDetailPage;