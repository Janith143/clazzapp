import React, { useState } from 'react';
import { Quiz, Question, Answer } from '../types.ts';
import { SaveIcon, XIcon, PlusIcon, SpinnerIcon } from '../components/Icons.tsx';
import QuestionEditorCard from '../components/QuestionEditorCard.tsx';
import { useData } from '../contexts/DataContext.tsx';

interface QuizEditorPageProps {
  quizData: Quiz;
  teacherId: string;
  onSave: (quiz: Quiz) => void | Promise<void>;
  onCancel: () => void;
}

const QuizEditorPage: React.FC<QuizEditorPageProps> = ({ quizData, teacherId, onSave, onCancel }) => {
    const [quiz, setQuiz] = useState<Quiz>(quizData);
    const { handleImageSave } = useData();
    const [isSaving, setIsSaving] = useState(false);
    
    const handleQuestionChange = (updatedQuestion: Question) => {
        setQuiz(prev => ({
            ...prev,
            questions: prev.questions.map(q => q.id === updatedQuestion.id ? updatedQuestion : q)
        }));
    };

    const addQuestion = () => {
        const newQuestion: Question = {
            id: `q_${Date.now()}`,
            text: '',
            answers: [
                { id: `a_${Date.now()}_1`, text: '', isCorrect: false },
                { id: `a_${Date.now()}_2`, text: '', isCorrect: false },
            ]
        };
        setQuiz(prev => ({
            ...prev,
            questions: [...prev.questions, newQuestion]
        }));
    };
    
    const deleteQuestion = (questionId: string) => {
        setQuiz(prev => ({
            ...prev,
            questions: prev.questions.filter(q => q.id !== questionId)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const questionsWithUrls = await Promise.all(
                quiz.questions.map(async (question) => {
                    if (question.imageUrl && question.imageUrl.startsWith('data:image')) {
                        const uploadedUrl = await handleImageSave(
                            question.imageUrl,
                            'quiz_question_image', 
                            { quizId: quiz.id, questionId: question.id }
                        );
                        if (uploadedUrl) {
                            return { ...question, imageUrl: uploadedUrl };
                        }
                    }
                    return question;
                })
            );
            
            const updatedQuiz = { ...quiz, questions: questionsWithUrls };
            
            await onSave(updatedQuiz);
            onCancel();
        } catch (error) {
            console.error("Failed to save quiz with images:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-slideInUp p-4">
            <form onSubmit={handleSubmit}>
                <div className="bg-light-surface dark:bg-dark-surface p-8 rounded-lg shadow-md">
                     <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">Quiz Editor</h1>
                            <p className="text-lg text-primary mt-1">{quiz.title}</p>
                            <p className="text-light-subtle dark:text-dark-subtle mt-1">Add, edit, and arrange questions for your quiz.</p>
                        </div>
                         <button
                            type="button"
                            onClick={onCancel}
                            className="inline-flex items-center justify-center p-2 rounded-full text-light-subtle dark:text-dark-subtle hover:bg-light-border dark:hover:bg-dark-border transition-colors"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    
                    <div className="space-y-6">
                        {quiz.questions.map((question, index) => (
                            <QuestionEditorCard 
                                key={question.id}
                                question={question}
                                questionNumber={index + 1}
                                onChange={handleQuestionChange}
                                onDelete={() => deleteQuestion(question.id)}
                            />
                        ))}
                    </div>

                    <div className="mt-6">
                        <button type="button" onClick={addQuestion} className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium text-primary border-2 border-dashed border-primary/50 rounded-md hover:bg-primary/10 transition-colors">
                            <PlusIcon className="h-5 h-5" />
                            <span>Add Question</span>
                        </button>
                    </div>
                </div>

                <div className="mt-8 pt-6 flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex items-center justify-center px-6 py-2 border border-light-border dark:border-dark-border text-sm font-medium rounded-md shadow-sm text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface hover:bg-light-border dark:hover:bg-dark-border/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors"
                    >
                        <XIcon className="w-5 h-5 mr-2" />
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors disabled:opacity-50"
                    >
                        {isSaving ? <SpinnerIcon className="w-5 h-5 mr-2" /> : <SaveIcon className="w-5 h-5 mr-2" />}
                        {isSaving ? 'Saving...' : 'Save Quiz'}
                    </button>
                </div>
            </form>
        </div>
    )
};

export default QuizEditorPage;