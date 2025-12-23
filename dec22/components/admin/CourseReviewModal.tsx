import React from 'react';
import Modal from '../Modal.tsx';
import { Course, Teacher } from '../../types.ts';
import { CheckCircleIcon, XCircleIcon, ClockIcon, LinkIcon } from '../Icons.tsx';
import MarkdownDisplay from '../MarkdownDisplay.tsx';

interface CourseReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    course: Course;
    teacher: Teacher;
    onApprove: () => void;
    onReject: () => void;
}

const CourseReviewModal: React.FC<CourseReviewModalProps> = ({ isOpen, onClose, course, teacher, onApprove, onReject }) => {
    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });
    const totalDurationHours = course.lectures.reduce((acc, l) => acc + l.durationMinutes, 0) / 60;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Review Course Content" size="4xl">
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row gap-6">
                    <img src={course.coverImage} alt={course.title} className="w-full sm:w-1/3 h-auto object-cover rounded-lg shadow-md" crossOrigin="anonymous" />
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold">{course.title}</h2>
                        <p className="text-sm text-light-subtle dark:text-dark-subtle mt-1">by {teacher.name}</p>
                        <div className="mt-4 text-light-text dark:text-dark-text">
                            <MarkdownDisplay content={course.description} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                            <div className="flex items-center"><span className="font-semibold mr-2">Fee:</span> {currencyFormatter.format(course.fee)}</div>
                            <div className="flex items-center"><span className="font-semibold mr-2">Lectures:</span> {course.lectures.length}</div>
                            <div className="flex items-center"><span className="font-semibold mr-2">Total Duration:</span> {totalDurationHours.toFixed(1)} hours</div>
                        </div>
                    </div>
                </div>

                {/* Lectures Section */}
                <div>
                    <h3 className="text-xl font-semibold mb-3 border-b border-light-border dark:border-dark-border pb-2">Lectures</h3>
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                        {course.lectures.length > 0 ? course.lectures.map((lecture, index) => (
                            <div key={lecture.id} className="p-3 bg-light-background dark:bg-dark-background rounded-md border border-light-border dark:border-dark-border">
                                <p className="font-semibold text-light-text dark:text-dark-text">{index + 1}. {lecture.title}</p>
                                <div className="text-xs text-light-subtle dark:text-dark-subtle mt-1">
                                    <MarkdownDisplay content={lecture.description} className="prose-sm prose-p:my-0" />
                                </div>
                                <div className="mt-2 text-xs flex items-center justify-between">
                                    <span className="flex items-center text-light-subtle dark:text-dark-subtle">
                                        <ClockIcon className="w-3 h-3 mr-1" /> {lecture.durationMinutes} minutes
                                    </span>
                                    <div className="flex items-center space-x-4">
                                        {lecture.resourcesUrl && (
                                            <a href={lecture.resourcesUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-primary hover:underline">
                                                <LinkIcon className="w-3 h-3 mr-1" /> View Resources
                                            </a>
                                        )}
                                        {lecture.videoUrl && (
                                            <a href={lecture.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-primary hover:underline">
                                                <LinkIcon className="w-3 h-3 mr-1" /> View Video
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )) : <p className="text-light-subtle dark:text-dark-subtle">This course has no lectures yet.</p>}
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-6 flex justify-end space-x-3 border-t border-light-border dark:border-dark-border">
                    <button onClick={onReject} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                        <XCircleIcon className="w-5 h-5" />
                        <span>Reject</span>
                    </button>
                    <button onClick={onApprove} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                        <CheckCircleIcon className="w-5 h-5" />
                        <span>Approve</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default CourseReviewModal;