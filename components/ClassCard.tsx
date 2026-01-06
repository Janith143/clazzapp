
import React from 'react';
import { IndividualClass, Teacher } from '../types';
import { ClockIcon, CalendarIcon, UserGroupIcon, PencilIcon, TrashIcon, MapPinIcon, OnlineIcon, EyeIcon, EyeSlashIcon, VideoCameraIcon, ShareIcon, ExternalLinkIcon } from './Icons';
import StarRating from './StarRating';
import { getDynamicClassStatus, getAverageRating, extractAndTruncate, getOptimizedImageUrl } from '../utils';
import { slugify } from '../utils/slug';
import { useNavigation } from '../contexts/NavigationContext';
import { useUI } from '../contexts/UIContext';
import { useData } from '../contexts/DataContext';

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
    onManageRecordings?: (classInfo: IndividualClass) => void;
    isOwnerView?: boolean;
}

const ClassCard: React.FC<ClassCardProps> = ({ classInfo, teacher, viewMode, enrollmentCount, onView, onEdit, onDelete, onTogglePublish, onManageRecordings, isOwnerView = false }) => {
    const { tuitionInstitutes } = useData();
    const { handleNavigate } = useNavigation();
    const { addToast } = useUI();

    const institute = classInfo.instituteId ? tuitionInstitutes.find(i => i.id === classInfo.instituteId) : null;

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
        <div
            className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden flex flex-col group animate-fadeIn transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
            onClick={() => onView(classInfo, teacher)}
        >
            <div className="p-4 flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {institute && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center">
                                <span className="mr-1">🏛️</span>
                                {institute.name}
                            </span>
                        )}
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 text-primary-dark dark:text-primary-light uppercase tracking-wider">
                            {classInfo.subject}
                            {classInfo.medium && <span className="opacity-70 ml-1">({classInfo.medium.charAt(0)})</span>}
                        </span>
                        {classInfo.isFreeSlot && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                1-on-1
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-base font-bold text-light-text dark:text-dark-text group-hover:text-primary transition-colors line-clamp-2 leading-tight pr-2">{classInfo.title}</h3>
                    <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-primary leading-none">{currencyFormatter.format(classInfo.fee)}</p>
                        {classInfo.fee > 0 && <p className="text-[10px] text-light-subtle dark:text-dark-subtle">{classInfo.weeklyPaymentOption === 'per_month' ? '/ month' : '/ session'}</p>}
                    </div>
                </div>

                <div className="mb-2 flex items-center space-x-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewTeacher(teacher);
                        }}
                        className="flex items-center space-x-1.5 text-xs group/teacher w-fit"
                    >
                        {teacher.avatar ? (
                            <img src={getOptimizedImageUrl(teacher.avatar, 32, 32)} alt={teacher.name} className="w-5 h-5 rounded-full object-cover border border-light-border dark:border-dark-border" />
                        ) : (
                            <div className="w-5 h-5 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold">
                                <span>
                                    {teacher.name?.split(' ')[0]?.charAt(0) || ''}
                                    {teacher.name?.split(' ')[1]?.charAt(0) || ''}
                                </span>
                            </div>
                        )}
                        <span className="font-medium text-light-subtle dark:text-dark-subtle group-hover/teacher:underline truncate max-w-[150px]">{teacher.name}</span>
                    </button>
                    {teacherRating.count > 0 && <StarRating rating={teacherRating.average} readOnly={true} size="xs" showLabel={false} />}
                </div>

                <div className="space-y-1.5 text-xs text-light-subtle dark:text-dark-subtle mb-3">
                    <div className="flex items-center">
                        <CalendarIcon className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                        <span className="font-medium">
                            {classInfo.recurrence === 'weekly' ? `Weekly on ${getDayOfWeek(classInfo.date)}s`
                                : classInfo.recurrence === 'flexible' ? `${classInfo.flexibleDates?.length || 0} Sessions`
                                    : formattedDate}
                        </span>
                    </div>
                    {classInfo.recurrence !== 'flexible' && (
                        <div className="flex items-center">
                            <ClockIcon className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                            <span>{classInfo.startTime} - {classInfo.endTime}</span>
                        </div>
                    )}
                    <div className="flex items-center">
                        <div className="w-3.5 h-3.5 mr-1.5 flex items-center justify-center opacity-70">{getModeIcon(classInfo.mode)}</div>
                        <span>{classInfo.mode === 'Both' ? 'Online & Physical' : classInfo.mode}</span>
                    </div>
                </div>

                <div className="mt-auto pt-3 border-t border-light-border dark:border-dark-border">
                    {viewMode === 'public' ? (
                        (dynamicStatus === 'canceled' && isOwnerView) ? (
                            <div className="w-full text-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 dark:text-gray-200 dark:bg-gray-800 rounded-md">
                                Canceled
                            </div>
                        ) : (classInfo.isDeleted && !isOwnerView) ? (
                            <div className="w-full text-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900/50 rounded-md">
                                Removed
                            </div>
                        ) : null
                    ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <ClassStatusBadge status={dynamicStatus} />
                                {!classInfo.isPublished && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">Unpublished</span>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                {onManageRecordings && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onManageRecordings(classInfo); }}
                                        className="p-1.5 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors"
                                        title="Recordings"
                                    >
                                        <VideoCameraIcon className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                <button onClick={handleShare} className="p-1.5 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors" title="Share Link">
                                    <ShareIcon className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onView(classInfo, teacher); }} className="p-1.5 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors" title="Preview">
                                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onTogglePublish && onTogglePublish(classInfo.id); }}
                                    disabled={(enrollmentCount ?? 0) > 0 || dynamicStatus === 'finished' || dynamicStatus === 'canceled'}
                                    className="p-1.5 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors disabled:opacity-50"
                                >
                                    {classInfo.isPublished ? <EyeSlashIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit && onEdit(classInfo); }}
                                    className="p-1.5 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors"
                                >
                                    <PencilIcon className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete && onDelete(classInfo.id, enrollmentCount || 0); }}
                                    className="p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                                >
                                    <TrashIcon className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
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
