import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Quiz, User, StudentSubmission, Question } from '../types.ts';
import { ClockIcon } from '../components/Icons.tsx';
import ConfirmationModal from '../components/ConfirmationModal.tsx';

interface QuizTakingPageProps {
    quizData: Quiz;
    currentUser: User;
    onFinishQuiz: (submission: Omit<StudentSubmission, 'id' | 'score'>) => void;
    onBack: () => void;
}

type SelectedAnswers = { [questionId: string]: string[] };

const QuizTakingPage: React.FC<QuizTakingPageProps> = ({ quizData, currentUser, onFinishQuiz, onBack }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<SelectedAnswers>({});
    const [isConfirming, setIsConfirming] = useState(false);
    
    const handleCloseConfirm = useCallback(() => setIsConfirming(false), []);

    const quizEndTime = useMemo(() => new Date(new Date(`${quizData.date}T${quizData.startTime}`).getTime() + quizData.durationMinutes * 60000), [quizData]);
    const [timeLeft, setTimeLeft] = useState(Math.round((quizEndTime.getTime() - new Date().getTime()) / 1000));

    const handleSubmit = useCallback(() => {
        const submissionData = {
            studentId: currentUser.id,
            quizId: quizData.id,
            answers: Object.entries(selectedAnswers).map(([questionId, selectedAnswerIds]) => ({
                questionId,
                selectedAnswerIds,
            })),
            submittedAt: new Date().toISOString(),
            quizInstanceId: quizData.instanceStartDate, // Add this line
        };
        onFinishQuiz(submissionData);
    }, [currentUser.id, quizData.id, selectedAnswers, onFinishQuiz, quizData.instanceStartDate]);

    const handleConfirmSubmit = () => {
        handleSubmit();
        setIsConfirming(false);
    };

    useEffect(() => {
        if (timeLeft <= 0) {
            handleSubmit();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, handleSubmit]);

    const handleAnswerChange = (questionId: string, answerId: string) => {
        setSelectedAnswers(prev => {
            const currentAnswers = prev[questionId] || [];
            if (currentAnswers.includes(answerId)) {
                return { ...prev, [questionId]: currentAnswers.filter(id => id !== answerId) };
            } else {
                return { ...prev, [questionId]: [...currentAnswers, answerId] };
            }
        });
    };
    
    if (quizData.questions.length === 0) {
        return (
            <div className="text-center p-8">
                <p>This quiz has no questions yet. Please check back later.</p>
                <button onClick={onBack} className="mt-4 px-4 py-2 bg-primary text-white rounded-md">Go Back</button>
            </div>
        );
    }
    
    const currentQuestion: Question = quizData.questions[currentQuestionIndex];

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slideInUp">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-light-surface dark:bg-dark-surface p-4 rounded-lg shadow-md mb-8 sticky top-20 z-10">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold">{quizData.title}</h1>
                            <p className="text-sm text-light-subtle dark:text-dark-subtle">Question {currentQuestionIndex + 1} of {quizData.questions.length}</p>
                        </div>
                        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-white font-bold ${timeLeft < 300 ? 'bg-red-500 animate-pulse' : 'bg-primary'}`}>
                            <ClockIcon className="w-5 h-5" />
                            <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                        </div>
                    </div>
                </div>

                {/* Question Area */}
                <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                    {currentQuestion ? (
                        <div>
                            {currentQuestion.imageUrl && (
                                <div className="mb-6 rounded-lg overflow-hidden">
                                    <img src={currentQuestion.imageUrl} alt="Question visual aid" className="max-h-80 w-auto mx-auto" />
                                </div>
                            )}
                            <p className="text-lg font-semibold mb-6">{currentQuestion.text}</p>
                            <div className="space-y-4">
                                {currentQuestion.answers.map(answer => (
                                    <label key={answer.id} className="flex items-center p-4 border border-light-border dark:border-dark-border rounded-md cursor-pointer hover:border-primary transition-colors has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
                                        <input
                                            type="checkbox"
                                            name={`q_${currentQuestion.id}`}
                                            checked={(selectedAnswers[currentQuestion.id] || []).includes(answer.id)}
                                            onChange={() => handleAnswerChange(currentQuestion.id, answer.id)}
                                            className="h-5 w-5 text-primary focus:ring-primary border-light-border dark:border-dark-border rounded"
                                        />
                                        <span className="ml-4 text-md">{answer.text}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p>Loading question...</p>
                    )}
                </div>

                {/* Navigation */}
                <div className="mt-8 flex justify-between items-center">
                    <button 
                        onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                        disabled={currentQuestionIndex === 0}
                        className="px-6 py-2 text-sm font-medium border border-primary text-primary rounded-md hover:bg-primary/10 transition-colors disabled:opacity-50"
                    >
                        Previous
                    </button>
                    
                    {currentQuestionIndex === quizData.questions.length - 1 ? (
                        <button 
                            onClick={() => setIsConfirming(true)}
                            className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                        >
                            Finish Quiz
                        </button>
                    ) : (
                        <button 
                            onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                            disabled={currentQuestionIndex === quizData.questions.length - 1}
                            className="px-6 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50"
                        >
                            Next
                        </button>
                    )}
                </div>
            </div>
            <ConfirmationModal 
                isOpen={isConfirming}
                onClose={handleCloseConfirm}
                onConfirm={handleConfirmSubmit}
                title="Finish Quiz"
                message="Are you sure you want to finish and submit your quiz? You will not be able to change your answers."
                confirmText="Finish Quiz"
            />
        </div>
    );
};

export default QuizTakingPage;