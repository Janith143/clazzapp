import React, { useMemo } from 'react';
import { Teacher, Quiz } from '../../types.ts';
import { useData } from '../../contexts/DataContext.tsx';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useNavigation } from '../../contexts/NavigationContext.tsx';
import QuizCard from '../QuizCard.tsx';
import { PlusIcon } from '../Icons.tsx';
import { getDynamicQuizStatus } from '../../utils.ts';

interface TeacherQuizzesTabProps {
    teacher: Teacher;
    canEdit: boolean;
    onScheduleNew: () => void;
    onEdit: (quiz: Quiz) => void;
    onCancel: (quizId: string) => void;
}

const TeacherQuizzesTab: React.FC<TeacherQuizzesTabProps> = ({ teacher, canEdit, onScheduleNew, onEdit, onCancel }) => {
    const { sales, handleTogglePublishState } = useData();
    const { currentUser } = useAuth();
    const { handleNavigate } = useNavigation();

    const enrollmentCounts = useMemo(() => {
        const counts: { [key: string]: { newEnrollments: number; totalEnrollments: number } } = {};
        const quizMap = new Map(teacher.quizzes.map(q => [q.id, q]));
    
        // Initialize counts for all of teacher's quizzes to avoid undefined errors
        teacher.quizzes.forEach(quiz => {
            counts[`quiz_${quiz.id}`] = { newEnrollments: 0, totalEnrollments: 0 };
        });
    
        sales
            .filter(s => s.teacherId === teacher.id && s.status === 'completed' && s.itemType === 'quiz')
            .forEach(sale => {
                const key = `quiz_${sale.itemId}`;
                if (counts[key]) {
                    counts[key].totalEnrollments += 1;
    
                    const liveQuiz = quizMap.get(sale.itemId as string);
                    if (liveQuiz && sale.itemSnapshot && 'questions' in sale.itemSnapshot) {
                        const saleInstanceId = (sale.itemSnapshot as Quiz).instanceStartDate;
                        const liveInstanceId = (liveQuiz as Quiz).instanceStartDate;
                        
                        // Robust check: Only count as a new enrollment if instance IDs match.
                        // Handles legacy data where instance IDs might be undefined.
                        if (liveInstanceId && saleInstanceId === liveInstanceId) {
                            counts[key].newEnrollments += 1;
                        } else if (!liveInstanceId && !saleInstanceId) {
                            // Legacy case: if neither have an ID, assume it's the same run.
                            counts[key].newEnrollments += 1;
                        }
                    }
                }
            });
        return counts;
    }, [sales, teacher.id, teacher.quizzes]);
    
    const quizzesToShow = useMemo(() => {
        return canEdit 
            ? teacher.quizzes.filter(q => !q.isDeleted) 
            : teacher.quizzes.filter(q => {
                const status = getDynamicQuizStatus(q);
                return q.isPublished && status !== 'finished' && status !== 'canceled' && !q.isDeleted;
            });
    }, [canEdit, teacher.quizzes]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {canEdit && (
              <button onClick={onScheduleNew} className="min-h-[200px] flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-light-border dark:border-dark-border hover:border-primary dark:hover:border-primary-light transition-colors text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light">
                <PlusIcon className="w-10 h-10" />
                <span className="mt-2 font-semibold">Schedule New Quiz</span>
              </button>
            )}
            {quizzesToShow.map(quiz => (
              <QuizCard 
                key={quiz.id} 
                quiz={quiz} 
                teacher={teacher} 
                viewMode={canEdit ? "teacher" : "public"} 
                currentUser={currentUser} 
                enrollmentCount={enrollmentCounts[`quiz_${quiz.id}`]} 
                onView={(q) => handleNavigate({name: 'quiz_detail', quizId: q.id})} 
                onEdit={onEdit} 
                onManage={(q) => handleNavigate({ name: 'quiz_editor', quizId: q.id, teacherId: teacher.id })} 
                onCancel={onCancel} 
                onTogglePublish={(id) => handleTogglePublishState(teacher.id, id, 'quiz')} 
              />
            ))}
        </div>
    );
};

export default TeacherQuizzesTab;
