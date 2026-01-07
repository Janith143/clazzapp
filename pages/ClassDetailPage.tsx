import React, { useMemo, useState, useEffect, useRef } from 'react';
import { IndividualClass, Teacher, Course, Lecture, PaymentMethod } from '../types.ts';
import { ChevronLeftIcon, ClockIcon, CalendarIcon, MapPinIcon, OnlineIcon, UserCircleIcon, LinkIcon, VideoCameraIcon, SpinnerIcon } from '../components/Icons.tsx';
import Countdown from '../components/Countdown.tsx';
import StarRating from '../components/StarRating.tsx';
import { getDynamicClassStatus, getNextSessionDateTime, getOptimizedImageUrl } from '../utils.ts';
import { useData, useFetchItem } from '../contexts/DataContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useNavigation } from '../contexts/NavigationContext.tsx';
import { useUI } from '../contexts/UIContext.tsx';
import ConfirmationModal from '../components/ConfirmationModal.tsx';
import MarkdownDisplay from '../components/MarkdownDisplay.tsx';
import { useSEO } from '../hooks/useSEO.ts';
import Modal from '../components/Modal.tsx';
import PaymentMethodSelector from '../components/PaymentMethodSelector.tsx';
import SEOHead from '../components/SEOHead.tsx';
import GuestActionPrompt from '../components/GuestActionPrompt.tsx';

import { slugify } from '../utils/slug.ts';

interface ClassDetailPageProps {
    classId?: number;
    slug?: string;
}

const ClassDetailPage: React.FC<ClassDetailPageProps> = ({ classId, slug }) => {
    const { currentUser } = useAuth();
    const { handleBack, handleNavigate, paymentGatewaySettings } = useNavigation();
    const { setModalState, setVideoPlayerState } = useUI();
    const { handleRateTeacher, handleEnroll, loading: dataLoading, teachers, sales, markAttendance } = useData();

    const resolvedClassId = useMemo(() => {
        if (classId) return classId;
        if (slug && teachers.length > 0) {
            for (const t of teachers) {
                const found = t.individualClasses.find(c => slugify(c.title) === slug);
                if (found) return found.id;
            }
        }
        return 0; // Return 0 or undefined as fallback
    }, [classId, slug, teachers]);

    const { item: classInfo, teacher, isEnrolled: originalIsEnrolled, isOwner: originalIsOwner } = useFetchItem('class', resolvedClassId || 0);

    // View as Student Toggle
    const [isViewAsStudent, setIsViewAsStudent] = useState(false);
    const [isViewAsEnrolled, setIsViewAsEnrolled] = useState(false); // New state for enrollment simulation

    const isOwner = (originalIsOwner || currentUser?.role === 'admin') && !isViewAsStudent; // Override isOwner for view mode
    const isEnrolled = originalIsEnrolled || isViewAsEnrolled; // Override isEnrolled for view mode

    const structuredData = useMemo(() => {
        if (!classInfo || !teacher) return null;
        const classItem = classInfo as IndividualClass;

        const isOnline = classItem.mode === 'Online' || classItem.mode === 'Both';
        const isPhysical = classItem.mode === 'Physical' || classItem.mode === 'Both';

        return {
            "@context": "https://schema.org",
            "@type": "Course",
            "name": classInfo.title,
            "description": classInfo.description,
            "provider": {
                "@type": "Person",
                "name": teacher.name,
                "image": teacher.avatar || teacher.profileImage
            },
            "hasCourseInstance": {
                "@type": "CourseInstance",
                "courseMode": isOnline ? (isPhysical ? "Blended" : "Online") : "OnSite",
                "courseWorkload": classItem.endTime ? `PT${(() => {
                    const [startH, startM] = classItem.startTime.split(':').map(Number);
                    const [endH, endM] = classItem.endTime.split(':').map(Number);
                    let diff = (endH * 60 + endM) - (startH * 60 + startM);
                    if (diff < 0) diff += 24 * 60;
                    const h = Math.floor(diff / 60);
                    const m = diff % 60;
                    return `${h}H${m}M`;
                })()}` : undefined,
                "startDate": classItem.date ? new Date(`${classItem.date}T${classItem.startTime}`).toISOString() : undefined,
                "location": isPhysical ? {
                    "@type": "Place",
                    "name": "Physical Class Venue", // Could be dynamic if venue field exists
                    "address": {
                        "@type": "PostalAddress",
                        "addressCountry": "LK"
                    }
                } : {
                    "@type": "VirtualLocation",
                    "url": classItem.joiningLink || "https://clazz.lk"
                }
            },
            "offers": {
                "@type": "Offer",
                "price": classItem.fee,
                "priceCurrency": "LKR",
                "availability": "https://schema.org/InStock",
                "category": "Paid"
            }
        };
    }, [classInfo, teacher]);

    const [isConfirmingEnrollment, setIsConfirmingEnrollment] = useState(false);
    const [showPaymentSelector, setShowPaymentSelector] = useState(false);
    const [showGuestPrompt, setShowGuestPrompt] = useState(false);
    const [isRecordingsOpen, setIsRecordingsOpen] = useState(false);
    const recordingsRef = useRef<HTMLDivElement>(null);

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000); // 30s update
        return () => clearInterval(timer);
    }, []);

    const dynamicStatus = useMemo(() => (classInfo && 'endTime' in classInfo) ? getDynamicClassStatus(classInfo) : 'scheduled', [classInfo, currentTime]); // Add currentTime dependency
    const nextSessionDateTime = useMemo(() => (classInfo && 'endTime' in classInfo) ? getNextSessionDateTime(classInfo) : null, [classInfo, currentTime]); // Add currentTime dependency

    const classEndDateTime = useMemo(() => {
        if (!classInfo || !('endTime' in classInfo)) return new Date();

        const now = new Date();
        const baseDateString = classInfo.recurrence === 'weekly' ? now.toISOString().split('T')[0] : classInfo.date;
        const [endHours, endMinutes] = classInfo.endTime.split(':').map(Number);
        const [startHours, startMinutes] = classInfo.startTime.split(':').map(Number);

        const [year, month, day] = baseDateString.split('-').map(Number);
        let endDate = new Date(year, month - 1, day, endHours, endMinutes, 0, 0);

        // Check for midnight crossover
        // (If EndTime is earlier than or equal to StartTime, it assumes next day)
        const endTimeValue = endHours * 60 + endMinutes;
        const startTimeValue = startHours * 60 + startMinutes;

        if (endTimeValue <= startTimeValue) {
            if (classInfo.recurrence === 'weekly') {
                // For weekly, we determine if we are on the Start Day or the End Day.
                // If we are on Start Day (today == classDay), it ends Tomorrow.
                // If we are on End Day (today == classDay + 1), it ends Today.
                const classStartDay = new Date(classInfo.date).getDay();
                const currentDay = now.getDay();

                if (currentDay === classStartDay) {
                    // We are on start day, so it ends tomorrow
                    endDate.setDate(endDate.getDate() + 1);
                }
                // If we are on the next day, endDate is already "Today at 01:00", which is correct.
            } else {
                // One-time class crossing midnight always ends the next day relative to start date
                // But here baseDateString is classInfo.date.
                endDate.setDate(endDate.getDate() + 1);
            }
        }

        return endDate;
    }, [classInfo, currentTime]); // Added currentTime to ensure day checks are accurate if component stays open overnight

    const recordingUrlsToShow = useMemo(() => {
        if (!classInfo || !('endTime' in classInfo) || !classInfo.recordingUrls) {
            return null;
        }

        if (classInfo.recurrence !== 'weekly') {
            return classInfo.recordingUrls[classInfo.date] || null;
        }

        const dates = Object.keys(classInfo.recordingUrls);
        if (dates.length === 0) {
            return null;
        }

        const mostRecentDate = dates.reduce((latest, current) => {
            return new Date(current) > new Date(latest) ? current : latest;
        });

        return classInfo.recordingUrls[mostRecentDate] || null;
    }, [classInfo]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (recordingsRef.current && !recordingsRef.current.contains(event.target as Node)) {
                setIsRecordingsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const canRate = useMemo(() => {
        // If viewing as student, allow seeing the rate card if conditions met (even if actually admin)
        // Note: Actual rating submission might still be blocked by backend if not student, but UI will show.
        const roleCheck = isViewAsStudent || (currentUser?.role === 'student');
        if (!currentUser || !teacher || !classInfo || !('endTime' in classInfo) || !roleCheck || !isEnrolled) return false;

        const status = getDynamicClassStatus(classInfo);
        if (status !== 'finished') return false;
        const oneHourAfterEnd = new Date(classEndDateTime.getTime() + 60 * 60 * 1000);
        const now = new Date();
        const alreadyRatedThisClass = teacher.ratings.some(r => r.studentId === currentUser.id && r.classId === classInfo.id);
        return now > classEndDateTime && now < oneHourAfterEnd && !alreadyRatedThisClass;
    }, [currentUser, isEnrolled, classInfo, teacher, classEndDateTime, isViewAsStudent]);

    if (dataLoading) {
        return (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center flex flex-col items-center justify-center">
                <SpinnerIcon className="w-8 h-8 text-primary" />
                <p className="mt-4 text-light-subtle dark:text-dark-subtle">Loading class details...</p>
            </div>
        );
    }

    if (!classInfo || !teacher || !('endTime' in classInfo)) {
        return <div>Class not found. It may have been removed by the teacher.</div>;
    }

    const handleEnrollClick = () => {
        if (!currentUser) {
            setShowGuestPrompt(true);
        } else {
            setIsConfirmingEnrollment(true);
        }
    };

    const handleConfirmStepOne = () => {
        const balanceToApply = Math.min(currentUser?.accountBalance || 0, classInfo.fee);
        const remaining = classInfo.fee - balanceToApply;

        const isManual = classInfo.paymentMethod === 'manual' && classInfo.fee > 0;

        if (remaining > 0 && !isManual) {
            setShowPaymentSelector(true);
            setIsConfirmingEnrollment(false);
        } else {
            handleEnroll(classInfo, 'class');
            setIsConfirmingEnrollment(false);
        }
    };

    const handlePaymentMethodSelected = (method: PaymentMethod) => {
        handleEnroll(classInfo, 'class', false, undefined, undefined, undefined, method);
        setShowPaymentSelector(false);
    };

    const onViewTeacher = (teacher: Teacher) => {
        if (teacher.username) {
            handleNavigate({ name: 'teacher_profile_slug', slug: teacher.username });
        } else {
            handleNavigate({ name: 'teacher_profile', teacherId: teacher.id });
        }
    };

    const handleWatchRecording = (recordingUrl: string) => {
        const instanceDate = classInfo.recurrence !== 'weekly' ? classInfo.date : (Object.keys(classInfo.recordingUrls!).find(date => classInfo.recordingUrls![date]?.includes(recordingUrl)) || classInfo.date);
        const mockLecture: Lecture = { id: `rec_${classInfo.id}_${instanceDate}`, title: `Recording for ${classInfo.title}`, description: `Session from ${new Date(instanceDate).toLocaleDateString()}`, videoUrl: recordingUrl, durationMinutes: 0, isFreePreview: false };
        const mockCourseShell: Course = { id: `cls_${classInfo.id}`, teacherId: teacher.id, title: classInfo.title, lectures: [mockLecture], description: classInfo.description, subject: classInfo.subject, coverImage: teacher.coverImages?.[0] || '', fee: classInfo.fee, currency: 'LKR', type: 'recorded', isPublished: classInfo.isPublished, ratings: [], adminApproval: 'approved' };
        setVideoPlayerState({ isOpen: true, lecture: mockLecture, course: mockCourseShell, isEnrolled: true });
    };

    const handleJoinClass = async () => {
        if (!classInfo.joiningLink) return;

        // Auto-mark attendance
        if (currentUser) {
            const studentSale = sales.find(s => s.studentId === currentUser.id && s.itemId === classInfo.id && s.itemType === 'class' && s.status === 'completed');

            // Determine likely payment status based on sale
            // If they have a completed sale, they are 'paid'. 
            // If manual_at_venue was selected but potentially not "paid" yet? 
            // Generally if sale.status is completed, they are good. 
            // We use the same logic as StudentAttendanceModal roughly.
            let paymentStatus: 'paid' | 'paid_at_venue' | 'unpaid' = 'unpaid';

            if (studentSale) {
                if (studentSale.paymentMethod === 'manual_at_venue') {
                    // For manual at venue, we might assume 'paid_at_venue' if they are joining?
                    // Or strictly 'unpaid' until teacher marks it?
                    // Let's assume 'paid_at_venue' if the sale exists and is completed (verified manual payment or trusted).
                    paymentStatus = 'paid_at_venue';
                } else {
                    paymentStatus = 'paid';
                }
            }

            // We do this asynchronously without awaiting to not delay the join
            markAttendance(classInfo.id, currentUser, paymentStatus, studentSale?.id).catch(err => console.error("Failed to auto-mark attendance", err));
        }

        window.open(classInfo.joiningLink, '_blank');
    };

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });
    const isManualPayment = classInfo.paymentMethod === 'manual' && classInfo.fee > 0;
    const balanceToApply = Math.min(currentUser?.accountBalance || 0, classInfo.fee);
    const remainingFee = classInfo.fee - balanceToApply;
    const formattedDate = new Date(classInfo.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const getModeIcon = (mode: IndividualClass['mode']) => {
        switch (mode) {
            case 'Online': return <OnlineIcon className="w-5 h-5" />;
            case 'Physical': return <MapPinIcon className="w-5 h-5" />;
            case 'Both': return <div className="flex items-center space-x-1"><OnlineIcon className="w-5 h-5" /><MapPinIcon className="w-5 h-5" /></div>;
            default: return null;
        }
    };

    const getButtonText = () => {
        if (dynamicStatus === 'canceled') return 'Class Canceled';
        if (dynamicStatus === 'finished') return 'Class Finished';
        if (isEnrolled) return "You are enrolled";
        if (!isViewAsStudent && (currentUser?.role === 'teacher' || currentUser?.role === 'admin')) return "Only students can enroll";
        if (isManualPayment) return "Register Now (Free)";
        return "Register Now";
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slideInUp">
            <SEOHead
                title={classInfo ? classInfo.title : 'Class Details'}
                description={classInfo ? classInfo.description.substring(0, 160) : 'View class details on clazz.lk'}
                image={teacher ? (teacher.avatar || teacher.profileImage) : undefined}
                structuredData={structuredData}
            />
            <div className="flex justify-between items-center mb-4">
                <button onClick={handleBack} className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors">
                    <ChevronLeftIcon className="h-5 w-5" />
                    <span>Back</span>
                </button>
                {(originalIsOwner || currentUser?.role === 'admin') && (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-light-subtle dark:text-dark-subtle">
                                {isViewAsStudent ? 'Viewing as Student' : 'Admin View'}
                            </span>
                            <button
                                onClick={() => {
                                    const newState = !isViewAsStudent;
                                    setIsViewAsStudent(newState);
                                    if (!newState) setIsViewAsEnrolled(false);
                                }}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isViewAsStudent ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isViewAsStudent ? 'translate-x-5' : 'translate-x-0'}`}
                                />
                            </button>
                        </div>

                        {/* Simulate Enrolled Toggle - Only visible when viewing as student */}
                        {isViewAsStudent && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-light-subtle dark:text-dark-subtle">
                                    {isViewAsEnrolled ? 'Simulating Enrolled' : 'Not Enrolled'}
                                </span>
                                <button
                                    onClick={() => setIsViewAsEnrolled(!isViewAsEnrolled)}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${isViewAsEnrolled ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isViewAsEnrolled ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-primary/10 text-primary-dark dark:text-primary-light uppercase tracking-wider">{classInfo.subject}</span>
                        <h1 className="mt-3 text-3xl md:text-4xl font-bold">{classInfo.title}</h1>
                        <div className="mt-2 text-light-subtle dark:text-dark-subtle"><MarkdownDisplay content={classInfo.description} className="prose-lg" /></div>
                        <div className="mt-6 flex items-center space-x-4"><button onClick={() => onViewTeacher(teacher)} className="flex items-center space-x-2 group"><img src={getOptimizedImageUrl(teacher.avatar, 40, 40)} alt={teacher.name} className="w-10 h-10 rounded-full" /><div><p className="text-sm text-light-subtle dark:text-dark-subtle">Taught by</p><p className="font-semibold group-hover:underline">{teacher.name}</p></div></button></div>
                    </div>
                    {canRate && (
                        <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md animate-fadeIn">
                            <h3 className="text-xl font-bold mb-2">How was your class?</h3>
                            <p className="text-sm text-light-subtle dark:text-dark-subtle mb-4">Rate your experience with {teacher.name}. Your feedback is valuable!</p>
                            <StarRating rating={0} onRatingChange={(rating) => handleRateTeacher(teacher.id, classInfo.id, rating)} size="lg" />
                        </div>
                    )}
                </div>
                <div className="lg:col-span-1">
                    <div className="sticky top-24 bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-6 space-y-4">
                        {dynamicStatus === 'scheduled' && nextSessionDateTime ? (
                            <div className="mb-6 pb-6 border-b border-light-border dark:border-dark-border">
                                <h3 className="font-bold text-center text-lg mb-2">Next Class Starts In</h3>
                                <Countdown targetDate={nextSessionDateTime} completionMessage="Class is about to start!" />
                            </div>
                        ) : dynamicStatus === 'scheduled' && !nextSessionDateTime ? (
                            <div className="mb-6 pb-6 border-b border-light-border dark:border-dark-border"><h3 className="font-bold text-center text-lg text-primary">This recurring class series has ended.</h3></div>
                        ) : null}
                        {dynamicStatus === 'live' && (
                            <div className="mb-6 pb-6 border-b border-light-border dark:border-dark-border">
                                <div className="text-center"><span className="px-4 py-2 rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 font-bold animate-pulse">Live Now!</span></div>
                                <h3 className="font-bold text-center text-lg mb-2 mt-4">Class Finishes In</h3>
                                <Countdown targetDate={classEndDateTime} completionMessage="Class has now ended." />
                            </div>
                        )}
                        <div className="text-left">
                            <p className="text-3xl font-bold text-primary">{classInfo.fee > 0 ? currencyFormatter.format(classInfo.fee) : 'Free'}</p>
                            {classInfo.fee > 0 && <p className="text-sm font-semibold text-light-subtle dark:text-dark-subtle">{classInfo.recurrence === 'flexible' ? 'for all sessions' : classInfo.weeklyPaymentOption === 'per_month' ? '/ month' : '/ session'}</p>}
                        </div>
                        {currentUser && balanceToApply > 0 && !isEnrolled && !isManualPayment && (dynamicStatus === 'scheduled' || dynamicStatus === 'live') && (
                            <div className="mt-4 p-3 text-sm bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-md">
                                <p className="font-semibold text-green-800 dark:text-green-200">Account Balance Applied!</p>
                                <div className="flex justify-between text-green-700 dark:text-green-300"><span>Balance Used:</span><span>-{currencyFormatter.format(balanceToApply)}</span></div>
                                <div className="flex justify-between font-bold mt-1 pt-1 border-t border-green-300 dark:border-green-700"><span>Amount to Pay:</span><span>{currencyFormatter.format(remainingFee)}</span></div>
                            </div>
                        )}
                        <div className="mt-4 space-y-2">
                            {isEnrolled && dynamicStatus === 'live' && classInfo.joiningLink && (
                                <button
                                    onClick={handleJoinClass}
                                    className="w-full text-center block bg-green-600 text-white font-bold py-3 rounded-md hover:bg-green-700 transition-colors"
                                >
                                    Join Class Now
                                </button>
                            )}
                            <button onClick={handleEnrollClick} disabled={isEnrolled || (dynamicStatus !== 'scheduled' && dynamicStatus !== 'live') || (!isViewAsStudent && (currentUser?.role === 'teacher' || currentUser?.role === 'admin'))} className="w-full bg-primary text-white font-bold py-3 rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">{getButtonText()}</button>
                            {isEnrolled && classInfo.documentLink && <a href={classInfo.documentLink} target="_blank" rel="noopener noreferrer" className="w-full text-center flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 transition-colors"><LinkIcon className="w-5 h-5" />View Class Documents</a>}
                        </div>
                    </div>
                </div>
            </div>
            {isConfirmingEnrollment && (() => {
                let message: string;
                let confirmText: string;
                if (classInfo.fee > 0 && !isManualPayment) {
                    if (balanceToApply > 0) {
                        if (remainingFee > 0) {
                            message = `Your account balance of ${currencyFormatter.format(balanceToApply)} will be applied. Continue to select a payment method for the remaining ${currencyFormatter.format(remainingFee)}?`;
                            confirmText = `Continue to Payment`;
                        } else {
                            message = `Your account balance of ${currencyFormatter.format(balanceToApply)} will fully cover the cost of this registration. Continue?`;
                            confirmText = 'Register using Balance';
                        }
                    } else {
                        message = `You are about to pay ${currencyFormatter.format(classInfo.fee)} to register for this class. Continue to select a payment method?`;
                        confirmText = `Continue to Payment`;
                    }
                    message += ' Please note that there will be no refunds for change of mind.';
                } else {
                    message = 'Are you sure you want to register for this class?';
                    confirmText = 'Yes, Register';
                }
                return <ConfirmationModal isOpen={true} onClose={() => setIsConfirmingEnrollment(false)} onConfirm={handleConfirmStepOne} title={`Confirm Registration: ${classInfo.title}`} message={message} confirmText={confirmText} />;
            })()}
            {showPaymentSelector && (
                <Modal isOpen={true} onClose={() => setShowPaymentSelector(false)} title="Select Payment Method">
                    <PaymentMethodSelector onSelect={handlePaymentMethodSelected} paymentGatewaySettings={paymentGatewaySettings} />
                </Modal>
            )}
            {showGuestPrompt && classInfo && teacher && (
                <Modal isOpen={true} onClose={() => setShowGuestPrompt(false)} title="Join Class">
                    <GuestActionPrompt
                        title={`Register for ${classInfo.title}`}
                        subtitle={`By ${teacher.name}`}
                        description={classInfo.description ? classInfo.description.substring(0, 100) + '...' : undefined}
                        reason="You need to be logged in to register for this class."
                        onLogin={() => { setShowGuestPrompt(false); setModalState({ name: 'login', preventRedirect: true }); }}
                        onSignup={() => { setShowGuestPrompt(false); setModalState({ name: 'register', preventRedirect: true }); }}
                    />
                </Modal>
            )}
        </div>
    );
};

export default ClassDetailPage;