
import React from 'react';
import { IndividualClass, Teacher } from '../types';
import { ClockIcon, CalendarIcon, UserGroupIcon, PencilIcon, TrashIcon, MapPinIcon, OnlineIcon, EyeIcon, EyeSlashIcon, VideoCameraIcon, ShareIcon, ExternalLinkIcon } from './Icons';
import StarRating from './StarRating';
import { getDynamicClassStatus, getAverageRating, extractAndTruncate, getOptimizedImageUrl } from '../utils';
import { slugify } from '../utils/slug';
import { useNavigation } from '../contexts/NavigationContext';
import { useUI } from '../contexts/UIContext';

interface ClassStatusBadgeProps {
    status: 'scheduled' | 'live' | 'finished' | 'canceled';
}

const ClassStatusBadge: React.FC<ClassStatusBadgeProps> = ({ status }) => {
    const styles = {
        scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        live: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 animate-pulse',
        finished: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        canceled: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
    };
    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

interface ClassCardProps {
    classInfo: IndividualClass;
    teacher: Teacher;
    viewMode: 'public' | 'teacher';
    enrollmentCount?: number;
    onView: (classInfo: IndividualClass, teacher: Teacher) => void;
    onEdit?: (classInfo: IndividualClass) => void;
    onDelete?: (classId: number, enrolledCount: number) => void;
    onTogglePublish?: (classId: number) => void;
    isOwnerView?: boolean;
}

const ClassCard: React.FC<ClassCardProps> = ({ classInfo, teacher, viewMode, enrollmentCount, onView, onEdit, onDelete, onTogglePublish, isOwnerView = false }) => {
    const { handleNavigate } = useNavigation();
    const { addToast } = useUI();

    const onViewTeacher = (teacher: Teacher) => {
        if (teacher.username) {
            handleNavigate({ name: 'teacher_profile_slug', slug: teacher.username });
        } else {
            handleNavigate({ name: 'teacher_profile', teacherId: teacher.id });
        }
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}/classes/${slugify(classInfo.title)}`;
        navigator.clipboard.writeText(url).then(() => {
            addToast('Class link copied to clipboard!', 'success');
        }).catch(() => {
            addToast('Failed to copy link.', 'error');
        });
    };

    const currencyFormatter = new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 0,
    });

    const getModeIcon = (mode: IndividualClass['mode']) => {
        switch (mode) {
            case 'Online': return <OnlineIcon className="w-4 h-4" />;
            case 'Physical': return <MapPinIcon className="w-4 h-4" />;
            case 'Both': return <div className="flex items-center space-x-1"><OnlineIcon className="w-4 h-4" /><MapPinIcon className="w-4 h-4" /></div>;
            default: return null;
        }
    };

    const formattedDate = new Date(classInfo.date).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const dynamicStatus = classInfo.isDeleted ? 'canceled' : getDynamicClassStatus(classInfo);
    const teacherRating = getAverageRating(teacher.ratings);

    return (
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden flex flex-col group animate-fadeIn transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="p-5 flex-grow flex flex-col">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary-dark dark:text-primary-light uppercase tracking-wider">
                            {classInfo.subject}
                            {classInfo.medium && <span className="opacity-70 ml-1">({classInfo.medium.charAt(0)})</span>}
                        </span>
                        {classInfo.isFreeSlot && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                1-on-1 Slot
                            </span>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold text-primary">{currencyFormatter.format(classInfo.fee)}</p>
                        {classInfo.fee > 0 && <p className="text-xs text-light-subtle dark:text-dark-subtle">{classInfo.weeklyPaymentOption === 'per_month' ? '/ month' : '/ session'}</p>}
                        {classInfo.paymentMethod === 'manual' && <p className="text-xs font-bold text-green-600 dark:text-green-400">(Pay at venue)</p>}
                    </div>
                </div>

                <h3 className="mt-3 text-lg font-bold text-light-text dark:text-dark-text group-hover:text-primary transition-colors">{classInfo.title}</h3>

                <div className="mt-2 flex items-center space-x-2">
                    <button onClick={() => onViewTeacher(teacher)} className="flex items-center space-x-2 text-sm group/teacher">
                        {teacher.avatar ? (
                            <img src={getOptimizedImageUrl(teacher.avatar, 32, 32)} alt={teacher.name} className="w-6 h-6 rounded-full" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                                <span>
                                    {teacher.name?.split(' ')[0]?.charAt(0) || ''}
                                    {teacher.name?.split(' ')[1]?.charAt(0) || ''}
                                </span>
                            </div>
                        )}
                        <span className="font-medium text-light-subtle dark:text-dark-subtle group-hover/teacher:underline">{teacher.name}</span>
                    </button>
                    {teacherRating.count > 0 && <StarRating rating={teacherRating.average} readOnly={true} size="xs" showLabel={false} />}
                </div>

                <p className="mt-3 text-xs text-light-subtle dark:text-dark-subtle flex-grow">
                    {extractAndTruncate(classInfo.description, 100)}
                </p>

                <div className="mt-4 space-y-2 text-sm text-light-subtle dark:text-dark-subtle">
                    <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        <span>
                            {classInfo.recurrence === 'weekly' ? `Weekly on ${getDayOfWeek(classInfo.date)}s`
                                : classInfo.recurrence === 'flexible' ? `${classInfo.flexibleDates?.length || 0} Sessions`
                                    : formattedDate}
                        </span>
                    </div>
                    {classInfo.recurrence !== 'flexible' && (
                        <div className="flex items-center">
                            <ClockIcon className="w-4 h-4 mr-2" />
                            <span>{classInfo.startTime} - {classInfo.endTime}</span>
                        </div>
                    )}
                    <div className="flex items-center">
                        <div className="w-4 h-4 mr-2 flex items-center justify-center">{getModeIcon(classInfo.mode)}</div>
                        <span>{classInfo.mode === 'Both' ? 'Online & Physical' : classInfo.mode}</span>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border flex flex-wrap gap-y-3 justify-between items-center">
                    {viewMode === 'public' ? (
                        (dynamicStatus === 'canceled' && isOwnerView) ? (
                            <div className="w-full text-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 dark:text-gray-200 dark:bg-gray-800 rounded-md">
                                Canceled & Refunded to Balance
                            </div>
                        ) : (classInfo.isDeleted && !isOwnerView) ? (
                            <div className="w-full text-center px-4 py-2 text-sm font-medium text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900/50 rounded-md">
                                Removed by teacher
                            </div>
                        ) : (
                            <button
                                onClick={() => onView(classInfo, teacher)}
                                className="w-full text-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                            >
                                View Details
                            </button>
                        )
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-2">
                                <ClassStatusBadge status={dynamicStatus} />
                                {!classInfo.isPublished && (
                                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">Unpublished</span>
                                )}
                                {typeof enrollmentCount !== 'undefined' && (
                                    <div className="flex items-center text-sm text-light-subtle dark:text-dark-subtle" title={`${enrollmentCount} enrolled students`}>
                                        <UserGroupIcon className="w-4 h-4 mr-1" />
                                        <span>{enrollmentCount}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1 ml-auto">
                                <button onClick={handleShare} className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors" title="Share Link">
                                    <ShareIcon className="h-4 w-4" />
                                </button>
                                <button onClick={() => onView(classInfo, teacher)} className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors" title="Preview Class">
                                    <ExternalLinkIcon className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => onTogglePublish && onTogglePublish(classInfo.id)}
                                    disabled={(enrollmentCount ?? 0) > 0 || dynamicStatus === 'finished' || dynamicStatus === 'canceled'}
                                    className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={
                                        (enrollmentCount ?? 0) > 0 ? "Cannot change publish status while students are enrolled" :
                                            (dynamicStatus !== 'scheduled' ? "Can only publish/unpublish scheduled classes" :
                                                (classInfo.isPublished ? "Unpublish this class from the website" : "Make this class public on the website"))
                                    }
                                    aria-label={classInfo.isPublished ? "Unpublish class" : "Publish class"}
                                >
                                    {classInfo.isPublished ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                </button>
                                <button
                                    onClick={() => onEdit && onEdit(classInfo)}
                                    className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors"
                                    aria-label="Edit class"
                                    title="Edit class"
                                >
                                    <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => onDelete && onDelete(classInfo.id, enrollmentCount || 0)}
                                    className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                                    aria-label="Delete class"
                                    title={(enrollmentCount ?? 0) > 0 ? `Delete class and refund ${enrollmentCount} enrolled student(s).` : "Delete class"}
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

function getDayOfWeek(dateString: string): string {
    const date = new Date(dateString);
    // Adjust for timezone offset to get correct UTC day
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[date.getDay()];
}

export default ClassCard;
