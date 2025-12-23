import React, { useMemo } from 'react';
import { Quiz, Teacher, User } from '../../types.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useData } from '../../contexts/DataContext.tsx';
import { useNavigation } from '../../contexts/NavigationContext.tsx';
import QuizCard from '../QuizCard.tsx';

interface MyQuizzesProps {
    user: User | null;
    isOwnerView?: boolean;
}

const MyQuizzes: React.FC<MyQuizzesProps> = ({ user, isOwnerView = false }) => {
    const { sales, teachers } = useData();
    const { handleNavigate } = useNavigation();
    const { currentUser } = useAuth(); // Keep for QuizCard prop

    const enrolledQuizzes = useMemo(() => {
        if (!user) {
            console.warn("MyQuizzes component rendered without a user prop.");
            return [];
        }

        const userSales = sales.filter(s => s.studentId === user.id && s.itemType === 'quiz' && s.status === 'completed');
        
        const quizzes: { quiz: Quiz; teacher: Teacher }[] = [];

        userSales.forEach(sale => {
            const teacher = teachers.find(t => t.id === sale.teacherId);
            if (!teacher) return;

            const liveQuiz = teacher.quizzes.find(q => q.id === sale.itemId);
            const quizData = sale.itemSnapshot as Quiz;

            if (!liveQuiz) {
                (quizData as any).isDeleted = true;
            }

            quizzes.push({ quiz: quizData, teacher });
        });
        
        return Array.from(new Map(quizzes.reverse().map(item => [`${item.quiz.id}-${item.quiz.instanceStartDate}`, item])).values()).reverse();
    }, [user, sales, teachers]);
    
    const emptyMessage = isOwnerView
        ? "You haven't enrolled in any quizzes yet."
        : "This student hasn't enrolled in any quizzes yet.";

    return enrolledQuizzes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledQuizzes.map(({ quiz, teacher }) => (
                <QuizCard 
                    key={`${quiz.id}-${quiz.instanceStartDate || ''}`} 
                    quiz={quiz} 
                    teacher={teacher} 
                    viewMode="public" 
                    isOwnerView={true} 
                    currentUser={currentUser} 
                    onView={(q) => handleNavigate({name: 'quiz_detail', quizId: q.id, instanceId: q.instanceStartDate})} 
                />
            ))}
        </div>
    ) : (
        <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">{emptyMessage}</p>
    );
};

export default MyQuizzes;
