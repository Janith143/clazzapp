import React, { useMemo } from 'react';
import { Course, Teacher, User } from '../../types.ts';
import { useData } from '../../contexts/DataContext.tsx';
import { useNavigation } from '../../contexts/NavigationContext.tsx';
import CourseCard from '../CourseCard.tsx';

interface MyCoursesProps {
    user: User | null;
    isOwnerView?: boolean;
}

const MyCourses: React.FC<MyCoursesProps> = ({ user, isOwnerView = false }) => {
    const { sales, teachers } = useData();
    const { handleNavigate } = useNavigation();

    const enrolledCourses = useMemo(() => {
        if (!user) {
            console.warn("MyCourses component rendered without a user prop.");
            return [];
        }

        const userSales = sales.filter(s => s.studentId === user.id && s.itemType === 'course' && s.status === 'completed');
        
        const courses: { course: Course; teacher: Teacher, completionPercentage: number }[] = [];

        userSales.forEach(sale => {
            const teacher = teachers.find(t => t.id === sale.teacherId);
            if (!teacher) return;

            const liveCourse = teacher.courses.find(c => c.id === sale.itemId);
            let courseData: Course;
            if (liveCourse) {
                const snapshotLectures = (sale.itemSnapshot as Course).lectures;
                const liveLectures = liveCourse.lectures;
                const snapshotLectureIds = new Set(snapshotLectures.map(l => l.id));
                const newLectures = liveLectures.filter(l => !snapshotLectureIds.has(l.id));
                const mergedLectures = [...snapshotLectures, ...newLectures];
                courseData = { ...liveCourse, lectures: mergedLectures };
            } else {
                courseData = { ...(sale.itemSnapshot as Course), isDeleted: true };
            }

            const watchedLectures = user.watchHistory?.[courseData.id] || {};
            const watchedCount = Object.keys(watchedLectures).length;
            const totalLectures = courseData.lectures.length;
            const completionPercentage = totalLectures > 0 ? (watchedCount / totalLectures) * 100 : 0;
            
            courses.push({ course: courseData, teacher, completionPercentage });
        });
        
        return Array.from(new Map(courses.reverse().map(item => [item.course.id, item])).values()).reverse();
    }, [user, sales, teachers]);

    const emptyMessage = isOwnerView
        ? "You haven't enrolled in any courses yet."
        : "This student hasn't enrolled in any courses yet.";

    return enrolledCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map(({ course, teacher, completionPercentage }) => (
            <CourseCard 
                key={course.id} 
                course={course} 
                teacher={teacher} 
                viewMode="public" 
                isOwnerView={true} 
                completionPercentage={completionPercentage} 
                onView={() => handleNavigate({name: 'course_detail', courseId: course.id})} 
            />
            ))}
        </div>
    ) : (
        <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">{emptyMessage}</p>
    );
};

export default MyCourses;
