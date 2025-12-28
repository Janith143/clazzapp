
import React from 'react';
import { Course, Teacher } from '../types';
import { PencilIcon, TrashIcon, UserGroupIcon, EyeIcon, EyeSlashIcon, ClockIcon, ShareIcon, ExternalLinkIcon } from './Icons';
import StarRating from './StarRating';
import ProgressBar from './ProgressBar';
import { slugify } from '../utils/slug';

import { useNavigation } from '../contexts/NavigationContext';
import { useUI } from '../contexts/UIContext';
import { getAverageRating, getOptimizedImageUrl, createSrcSet, extractAndTruncate } from '../utils';

interface CourseCardProps {
    course: Course;
    teacher: Teacher;
    viewMode: 'public' | 'teacher';
    enrollmentCount?: number;
    completionPercentage?: number;
    onView: (course: Course, teacher: Teacher) => void;
    onEdit?: (courseId: string) => void;
    onDelete?: (courseId: string) => void;
    onTogglePublish?: (courseId: string, action?: 'request_approval') => void;
    isOwnerView?: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, teacher, viewMode, enrollmentCount, completionPercentage, onView, onEdit, onDelete, onTogglePublish, isOwnerView = false }) => {
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
        const url = `${window.location.origin}/courses/${slugify(course.title)}`;
        navigator.clipboard.writeText(url).then(() => {
            addToast('Course link copied to clipboard!', 'success');
        }).catch(() => {
            addToast('Failed to copy link.', 'error');
        });
    };

    const currencyFormatter = new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 0,
    });

    const averageRating = getAverageRating(course.ratings);
    const optimizedCoverImage = getOptimizedImageUrl(course.coverImage, 400);
    const coverImageSrcSet = createSrcSet(optimizedCoverImage, [400, 800]);

    const renderPublicationButton = () => {
        if (!onTogglePublish) return null;

        if (course.adminApproval === 'approved') {
            return (
                <button
                    onClick={() => onTogglePublish(course.id)}
                    className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors"
                    aria-label={course.isPublished ? "Unpublish course" : "Publish course"}
                    title={course.isPublished ? "Unpublish this course" : "Publish this course"}
                >
                    {course.isPublished ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
            );
        }
        if (course.adminApproval === 'pending') {
            return (
                <div className="p-2 text-xs font-semibold flex items-center text-yellow-600 dark:text-yellow-400">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    Pending
                </div>
            );
        }
        // 'not_requested' or 'rejected'
        const buttonText = course.adminApproval === 'rejected' ? 'Resubmit' : 'Request Publish';
        return (
            <button
                onClick={() => onTogglePublish(course.id, 'request_approval')}
                className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                title="Submit this course for admin review to be published."
            >
                {buttonText}
            </button>
        );
    };

    return (
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden flex flex-col group animate-fadeIn transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="relative">
                <img
                    src={optimizedCoverImage || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 225' fill='%23e2e8f0'%3E%3Crect width='400' height='225'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24px' fill='%2364748b'%3ENo Image%3C/text%3E%3C/svg%3E"}
                    srcSet={coverImageSrcSet}
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    alt={course.title}
                    crossOrigin="anonymous"
                    className="w-full h-48 object-cover"
                    loading="lazy"
                    decoding="async"
                    width="400"
                    height="192"
                />
                <div className="absolute top-0 right-0 bg-primary text-white text-sm font-bold px-3 py-1 m-2 rounded-md">
                    {currencyFormatter.format(course.fee)}
                </div>
                {viewMode === 'teacher' && !course.isPublished && (
                    <div className="absolute top-0 left-0 bg-yellow-500 text-white text-xs font-bold px-2 py-1 m-2 rounded-md">
                        Unpublished
                    </div>
                )}
            </div>

            <div className="p-4 flex-grow flex flex-col">
                <h3 className="text-lg font-bold text-light-text dark:text-dark-text group-hover:text-primary transition-colors">{course.title}</h3>

                <button onClick={() => onViewTeacher(teacher)} className="mt-1 flex items-center space-x-2 text-sm group/teacher">
                    {teacher.avatar ? (
                        <img src={getOptimizedImageUrl(teacher.avatar, 32, 32)} alt={teacher.name} className="w-6 h-6 rounded-full" loading="lazy" width="24" height="24" />
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

                {averageRating.count > 0 && (
                    <div className="mt-2">
                        <StarRating rating={averageRating.average} count={averageRating.count} readOnly={true} size="sm" />
                    </div>
                )}

                {viewMode === 'teacher' && typeof enrollmentCount !== 'undefined' && (
                    <div className="mt-2 flex items-center text-sm text-light-subtle dark:text-dark-subtle" title={`${enrollmentCount} enrolled students`}>
                        <UserGroupIcon className="w-4 h-4 mr-1.5" />
                        <span>{enrollmentCount} Students Enrolled</span>
                    </div>
                )}

                {completionPercentage !== undefined && completionPercentage > 0 && (
                    <div className="mt-3 space-y-1">
                        <ProgressBar value={completionPercentage} max={100} />
                        <p className="text-xs text-right font-medium text-light-subtle dark:text-dark-subtle">{Math.round(completionPercentage)}% Complete</p>
                    </div>
                )}

                <p className="text-xs text-light-subtle dark:text-dark-subtle mt-2 flex-grow">
                    {extractAndTruncate(course.description, 100)}
                </p>
            </div>

            <div className="p-4 pt-0 mt-auto">
                {viewMode === 'public' ? (
                    (course.isDeleted && !isOwnerView) ? (
                        <div className="w-full text-center px-4 py-2 text-sm font-medium text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900/50 rounded-md">
                            Removed by teacher
                        </div>
                    ) : (
                        <button
                            onClick={() => onView(course, teacher)}
                            className="w-full text-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                        >
                            View Course
                        </button>
                    )
                ) : (
                    <div className="flex justify-end items-center space-x-2 border-t border-light-border dark:border-dark-border pt-3">
                        <button onClick={handleShare} className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors" title="Share Link">
                            <ShareIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => onView(course, teacher)} className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors" title="Preview Course">
                            <ExternalLinkIcon className="h-4 w-4" />
                        </button>
                        {renderPublicationButton()}
                        <button onClick={() => onEdit && onEdit(course.id)} className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors" aria-label="Edit course">
                            <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => onDelete && onDelete(course.id)}
                            disabled={(enrollmentCount ?? 0) > 0}
                            className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Delete course"
                            title={(enrollmentCount ?? 0) > 0 ? "Cannot delete a course with enrolled students. Unpublish it instead to prevent new enrollments." : "Delete course"}
                        >
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourseCard;
