import React, { useMemo, useState } from 'react';
import { Teacher, Course } from '../../types.ts';
import { BookOpenIcon, VideoCameraIcon, ClipboardListIcon, PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '../Icons.tsx';
import CourseReviewModal from './CourseReviewModal.tsx';

interface ContentManagementProps {
  teachers: Teacher[];
  defaultCoverImages: string[];
  onAddDefaultCoverImage: () => void;
  onRemoveDefaultCoverImage: (imageUrl: string) => void;
  onCourseApproval: (teacherId: string, courseId: string, decision: 'approved' | 'rejected') => void;
}

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-light-surface dark:bg-dark-surface p-5 rounded-lg shadow-md border border-light-border dark:border-dark-border">
        <div className="flex items-center">
            <div className="p-3 bg-primary/10 text-primary rounded-lg mr-4">{icon}</div>
            <div>
                <p className="text-sm font-medium text-light-subtle dark:text-dark-subtle">{title}</p>
                <p className="text-3xl font-bold text-light-text dark:text-dark-text">{value}</p>
            </div>
        </div>
    </div>
);


const ContentManagement: React.FC<ContentManagementProps> = ({ teachers, defaultCoverImages, onAddDefaultCoverImage, onRemoveDefaultCoverImage, onCourseApproval }) => {
  const [courseToReview, setCourseToReview] = useState<{ course: Course, teacher: Teacher } | null>(null);

  const totalCourses = teachers.reduce((sum, t) => sum + (t.courses?.length || 0), 0);
  const totalClasses = teachers.reduce((sum, t) => sum + (t.individualClasses?.length || 0), 0);
  const totalQuizzes = teachers.reduce((sum, t) => sum + (t.quizzes?.length || 0), 0);

  const pendingCourses = useMemo(() => {
    return teachers.flatMap(teacher => 
        (teacher.courses || [])
            .filter(course => course.adminApproval === 'pending')
            .map(course => ({ course, teacher }))
    );
  }, [teachers]);

  const handleApprove = () => {
      if (!courseToReview) return;
      onCourseApproval(courseToReview.teacher.id, courseToReview.course.id, 'approved');
      setCourseToReview(null);
  };

  const handleReject = () => {
      if (!courseToReview) return;
      onCourseApproval(courseToReview.teacher.id, courseToReview.course.id, 'rejected');
      setCourseToReview(null);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Content Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Courses" value={totalCourses} icon={<BookOpenIcon className="w-7 h-7" />} />
        <StatCard title="Total Classes" value={totalClasses} icon={<VideoCameraIcon className="w-7 h-7" />} />
        <StatCard title="Total Quizzes" value={totalQuizzes} icon={<ClipboardListIcon className="w-7 h-7" />} />
      </div>

      <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Courses Pending Review ({pendingCourses.length})</h2>
        {pendingCourses.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                    <thead className="bg-light-background dark:bg-dark-background">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Course Title</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Teacher</th>
                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-light-border dark:divide-dark-border">
                        {pendingCourses.map(({ course, teacher }) => (
                            <tr key={course.id}>
                                <td className="px-4 py-3 whitespace-nowrap font-medium">
                                    <button onClick={() => setCourseToReview({ course, teacher })} className="text-primary hover:underline text-left">
                                        {course.title}
                                    </button>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">{teacher.name}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-center space-x-2">
                                    <button onClick={() => onCourseApproval(teacher.id, course.id, 'approved')} className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 inline-flex items-center"><CheckCircleIcon className="w-4 h-4 mr-1"/>Approve</button>
                                    <button onClick={() => onCourseApproval(teacher.id, course.id, 'rejected')} className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 inline-flex items-center"><XCircleIcon className="w-4 h-4 mr-1"/>Reject</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (
            <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">No courses are currently pending review.</p>
        )}
      </div>
      
      <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Manage Default Teacher Cover Images</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {defaultCoverImages.map(imgUrl => (
            <div key={imgUrl} className="relative group aspect-video">
              <img src={imgUrl} alt="Default cover" className="w-full h-full object-cover rounded-md" />
              <div className="absolute inset-0 bg-black/60 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => onRemoveDefaultCoverImage(imgUrl)} 
                    className="text-white p-2 bg-red-500/80 rounded-full hover:bg-red-600 transition-colors"
                    aria-label="Remove image"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          <button 
            onClick={onAddDefaultCoverImage} 
            className="aspect-video flex flex-col items-center justify-center p-6 border-2 border-dashed border-light-border dark:border-dark-border rounded-lg hover:border-primary dark:hover:border-primary-light hover:text-primary dark:hover:text-primary-light transition-colors"
          >
            <PlusIcon className="w-8 h-8 mb-2" />
            <span className="font-semibold text-sm text-center">Add New Image</span>
          </button>
        </div>
      </div>

      <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Content Moderation</h2>
        <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">
            (A section for reviewing/flagging content would be here)
        </p>
      </div>

      {courseToReview && (
        <CourseReviewModal
            isOpen={!!courseToReview}
            onClose={() => setCourseToReview(null)}
            course={courseToReview.course}
            teacher={courseToReview.teacher}
            onApprove={handleApprove}
            onReject={handleReject}
        />
      )}
    </div>
  );
};

export default ContentManagement;