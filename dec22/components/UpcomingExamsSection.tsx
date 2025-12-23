import React, { useMemo } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { UpcomingExam } from '../types';
import ExamCard from './ExamCard';

const UpcomingExamsSection: React.FC = () => {
    const { upcomingExams, handleNavigate } = useNavigation();
    const { currentUser } = useAuth();

    const sortedAndFilteredExams = useMemo(() => {
        if (!upcomingExams) return [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const futureExams = upcomingExams.filter(exam => new Date(exam.date) >= now);

        futureExams.sort((a, b) => {
            if (a.isHighPriority !== b.isHighPriority) {
                return a.isHighPriority ? -1 : 1;
            }
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
        
        if (currentUser?.targetAudience) {
            const userAudience = currentUser.targetAudience;
            const matchingExams: UpcomingExam[] = [];
            const otherExams: UpcomingExam[] = [];

            futureExams.forEach(exam => {
                if (exam.targetAudience === userAudience) {
                    matchingExams.push(exam);
                } else {
                    otherExams.push(exam);
                }
            });
            return [...matchingExams, ...otherExams];
        }

        return futureExams;
    }, [upcomingExams, currentUser]);

    const mobileExams = sortedAndFilteredExams.slice(0, 4);

    if (sortedAndFilteredExams.length === 0) {
        return null;
    }

    return (
        <div className="lg:bg-light-surface lg:dark:bg-dark-surface lg:p-6 lg:rounded-lg lg:shadow-md lg:h-[500px] lg:flex lg:flex-col">
            <div className="flex justify-between items-center mb-6 lg:mb-4">
                <h2 className="text-3xl lg:text-xl font-bold">Upcoming Exams</h2>
                <button onClick={() => handleNavigate({ name: 'all_exams' })} className="text-sm font-medium text-primary hover:underline">View All</button>
            </div>
            
            <div className="lg:flex-grow lg:overflow-y-auto lg:pr-2">
                
                {/* Mobile/Tablet Grid (hidden on large screens) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:hidden">
                    {mobileExams.map(exam => (
                        <ExamCard key={exam.id} exam={exam} />
                    ))}
                </div>

                {/* Desktop List (only visible on large screens) */}
                <div className="hidden lg:flex lg:flex-col lg:space-y-4">
                    {sortedAndFilteredExams.map(exam => (
                        <ExamCard key={exam.id} exam={exam} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UpcomingExamsSection;