
import React from 'react';
import { Quiz, Teacher, User, StudentSubmission } from '../types.ts';
import { ClockIcon, CalendarIcon, PencilIcon, TrashIcon, TrophyIcon, UserGroupIcon, EyeIcon, EyeSlashIcon, ShareIcon, ExternalLinkIcon } from './Icons.tsx';
import StarRating from './StarRating.tsx';
import { getAverageRating, getDynamicQuizStatus, getOptimizedImageUrl } from '../utils.ts';
import { slugify } from '../utils/slug.ts';
import { useNavigation } from '../contexts/NavigationContext.tsx';
import { useUI } from '../contexts/UIContext.tsx';

interface QuizCardProps {
    quiz: Quiz;
    teacher: Teacher;
    viewMode: 'public' | 'teacher';
    currentUser?: User | null;
    enrollmentCount?: { totalEnrollments: number, newEnrollments: number };
    onView: (quiz: Quiz) => void;
    onEdit?: (quiz: Quiz) => void;
    onManage?: (quiz: Quiz) => void;
    onCancel?: (quizId: string) => void;
    onTogglePublish?: (quizId: string) => void;
    isOwnerView?: boolean;
}

const QuizStatusBadge: React.FC<{ status: 'scheduled' | 'finished' | 'canceled' }> = ({ status }) => {
    const styles = {
        scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        finished: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        canceled: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
    };
    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

const QuizCard: React.FC<QuizCardProps> = ({ quiz, teacher, viewMode, currentUser, enrollmentCount, onView, onEdit, onManage, onCancel, onTogglePublish, isOwnerView = false }) => {
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
        const url = `${window.location.origin}/quizzes/${slugify(quiz.title)}`;
        navigator.clipboard.writeText(url).then(() => {
            addToast('Quiz link copied to clipboard!', 'success');
        }).catch(() => {
            addToast('Failed to copy link.', 'error');
        });
    };

    const currencyFormatter = new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 0,
    });

    const isEnrolled = currentUser?.enrolledQuizIds?.includes(quiz.id);
    const teacherRating = getAverageRating(teacher.ratings);
    const dynamicStatus = getDynamicQuizStatus(quiz);

    const getAction = () => {
        if (viewMode === 'teacher') {
            return (
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-2">
                        <QuizStatusBadge status={dynamicStatus} />
                        {!quiz.isPublished && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">Unpublished</span>
                        )}
                    </div>
                    <div className="flex items-center space-x-1">
                        <button onClick={handleShare} className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors" title="Share Link">
                            <ShareIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => onView(quiz)} className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors" title="Preview Quiz">
                            <ExternalLinkIcon className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => onTogglePublish && onTogglePublish(quiz.id)}
                            disabled={(enrollmentCount?.newEnrollments ?? 0) > 0 || dynamicStatus !== 'scheduled'}
                            className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={quiz.isPublished ? "Unpublish quiz" : "Publish quiz"}
                            title={(enrollmentCount?.newEnrollments ?? 0) > 0 ? "Cannot change status while students are enrolled in the current session" : (dynamicStatus !== 'scheduled' ? "Can only publish/unpublish scheduled quizzes" : (quiz.isPublished ? "Unpublish this quiz" : "Publish this quiz"))}
                        >
                            {quiz.isPublished ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                        <button
                            onClick={() => onEdit && onEdit(quiz)}
                            disabled={dynamicStatus === 'canceled'}
                            className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Edit quiz settings"
                            title={dynamicStatus === 'canceled' ? 'Cannot edit a canceled quiz' : 'Edit quiz settings'}
                        >
                            <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => onManage && onManage(quiz)}
                            disabled={dynamicStatus === 'canceled'}
                            className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Manage questions"
                            title={dynamicStatus === 'canceled' ? 'Cannot manage questions for a canceled quiz' : 'Manage questions'}
                        ><TrophyIcon className="h-4 w-4" /></button>
                        <button
                            onClick={() => onCancel && onCancel(quiz.id)}
                            disabled={dynamicStatus !== 'scheduled'}
                            className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Cancel quiz"
                            title={dynamicStatus !== 'scheduled' ? "Cannot cancel a quiz that is not scheduled." : "Cancel quiz & refund students"}
                        >
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            );
        }

        if (quiz.isDeleted && !isOwnerView) {
            return <div className="w-full text-center px-4 py-2 text-sm font-medium text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900/50 rounded-md">Removed by teacher</div>;
        }
        if (dynamicStatus === 'canceled') {
            return <div className="w-full text-center px-4 py-2 text-sm font-medium text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900/50 rounded-md">Canceled</div>;
        }

        return <button onClick={() => onView(quiz)} className="w-full text-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors">
            {dynamicStatus === 'finished' ? 'View Results' : (isEnrolled ? 'View Quiz' : 'View Details')}
        </button>;
    };

    const formattedDate = new Date(quiz.date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });

    return (
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden flex flex-col group animate-fadeIn transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="p-5 flex-grow flex flex-col">
                <div className="flex justify-between items-start">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${dynamicStatus !== 'scheduled' ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300' : 'bg-primary/10 text-primary-dark dark:text-primary-light'}`}>
                        {quiz.subject}
                    </span>
                    <div className="text-right">
                        <p className={`text-xl font-bold ${quiz.fee === 0 ? 'text-green-600 dark:text-green-400' : 'text-primary'}`}>
                            {quiz.fee === 0 ? 'Free' : currencyFormatter.format(quiz.fee)}
                        </p>
                    </div>
                </div>

                <h3 className="mt-3 text-lg font-bold text-light-text dark:text-dark-text group-hover:text-primary transition-colors">{quiz.title}</h3>

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


                <div className="mt-4 space-y-2 text-sm text-light-subtle dark:text-dark-subtle flex-grow">
                    <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        <span>{formattedDate} at {quiz.startTime}</span>
                    </div>
                    <div className="flex items-center">
                        <ClockIcon className="w-4 h-4 mr-2" />
                        <span>{quiz.durationMinutes} minutes duration</span>
                    </div>
                    {viewMode === 'teacher' && typeof enrollmentCount !== 'undefined' && (
                        <div className="flex items-center" title={`${enrollmentCount.newEnrollments} new enrollments, ${enrollmentCount.totalEnrollments} total`}>
                            <UserGroupIcon className="w-4 h-4 mr-1.5" />
                            <span className="font-semibold">{enrollmentCount.newEnrollments}</span>
                            {enrollmentCount.newEnrollments !== enrollmentCount.totalEnrollments && (
                                <span className="text-xs text-light-subtle dark:text-dark-subtle ml-1">({enrollmentCount.totalEnrollments} total)</span>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border flex justify-between items-center">
                    {getAction()}
                </div>
            </div>
        </div>
    );
};

export default QuizCard;
