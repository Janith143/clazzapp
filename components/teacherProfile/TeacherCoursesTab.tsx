
import React, { useMemo, useState } from 'react';
import { Teacher, Course } from '../../types.ts';
import { useData } from '../../contexts/DataContext.tsx';
import { useNavigation } from '../../contexts/NavigationContext.tsx';
import CourseCard from '../CourseCard.tsx';
import { PlusIcon, TrophyIcon } from '../Icons.tsx';
import CertificateModal from '../CertificateModal.tsx';

interface TeacherCoursesTabProps {
    teacher: Teacher;
    canEdit: boolean;
    onDelete: (courseId: string) => void;
}

const TeacherCoursesTab: React.FC<TeacherCoursesTabProps> = ({ teacher, canEdit, onDelete }) => {
    const { sales, handleTogglePublishState } = useData();
    const { handleNavigate } = useNavigation();
    
    const [selectedCourseForCert, setSelectedCourseForCert] = useState<Course | null>(null);

    const enrollmentCounts = useMemo(() => {
        const counts: { [key: string]: number } = {};
        sales.filter(s => s.teacherId === teacher.id && s.status === 'completed' && s.itemType === 'course').forEach(sale => {
            const key = `course_${sale.itemId}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }, [sales, teacher.id]);
    
    const coursesToShow = useMemo(() => {
        return canEdit 
            ? teacher.courses.filter(c => !c.isDeleted) 
            : teacher.courses.filter(c => c.isPublished && !c.isDeleted);
    }, [canEdit, teacher.courses]);

    const handleCreateCourse = () => teacher && handleNavigate({ name: 'course_editor', teacherId: teacher.id });
    const handleEditCourse = (courseId: string) => teacher && handleNavigate({ name: 'course_editor', courseId, teacherId: teacher.id });

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {canEdit && (
                <button onClick={handleCreateCourse} className="min-h-[200px] flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-light-border dark:border-dark-border hover:border-primary dark:hover:border-primary-light transition-colors text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light">
                    <PlusIcon className="w-10 h-10" />
                    <span className="mt-2 font-semibold">Create New Course</span>
                </button>
                )}
                {coursesToShow.map(course => (
                <div key={course.id} className="relative group">
                    <CourseCard 
                        course={course} 
                        teacher={teacher} 
                        viewMode={canEdit ? "teacher" : "public"} 
                        enrollmentCount={enrollmentCounts[`course_${course.id}`] || 0} 
                        onView={(c) => handleNavigate({name: 'course_detail', courseId: c.id})} 
                        onEdit={handleEditCourse} 
                        onDelete={onDelete} 
                        onTogglePublish={(id, action) => handleTogglePublishState(teacher.id, id, 'course', action)} 
                    />
                    {canEdit && (
                        <button 
                            onClick={() => setSelectedCourseForCert(course)}
                            className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-800 p-2 rounded-full shadow-md text-amber-500 hover:text-amber-600 transition-colors"
                            title="Issue Certificate"
                        >
                            <TrophyIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
                ))}
            </div>
            {canEdit && (
                <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 rounded-r-md text-yellow-800 dark:text-yellow-200">
                <h4 className="font-bold">Content Security Notice</h4>
                <p className="text-sm mt-2">
                    Please be advised that clazz.lk does not monitor or restrict downloading, screen recording, or external sharing of your content by students or third parties. While we take measures to provide a secure platform, we cannot guarantee complete protection against such actions.
                </p>
                </div>
            )}
            
            {selectedCourseForCert && (
                <CertificateModal 
                    isOpen={!!selectedCourseForCert}
                    onClose={() => setSelectedCourseForCert(null)}
                    course={selectedCourseForCert}
                    teacher={teacher}
                />
            )}
        </div>
    );
};

export default TeacherCoursesTab;
