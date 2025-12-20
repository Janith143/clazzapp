import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CustomExam, UpcomingExam, User } from '../types';
import ExamCard from './ExamCard';

interface MyExamsSectionProps {
    user: User | null;
}

const MyExamsSection: React.FC<MyExamsSectionProps> = ({ user }) => {

    const sortedAndFilteredExams = useMemo(() => {
        if (!user?.customExams) return [];
        
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        oneDayAgo.setHours(0,0,0,0);

        const futureExams = user.customExams.filter(exam => {
            const examDate = new Date(exam.date);
            return examDate.getTime() >= oneDayAgo.getTime();
        });

        futureExams.sort((a, b) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
        
        return futureExams.map(exam => ({...exam, isHighPriority: false}));

    }, [user]);

    if (sortedAndFilteredExams.length === 0) {
        return null;
    }

    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">My Upcoming Exams</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {sortedAndFilteredExams.map(exam => (
                    <ExamCard key={exam.id} exam={exam as UpcomingExam} />
                ))}
            </div>
        </div>
    );
};

export default MyExamsSection;