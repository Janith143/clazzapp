
import React, { useMemo, useState, useEffect } from 'react';
import { Quiz, Teacher, StudentSubmission, StudentResult, Sale } from '../types.ts';
import { ChevronLeftIcon, ClockIcon, CalendarIcon, TrophyIcon, UserCircleIcon, BanknotesIcon, CheckCircleIcon, XCircleIcon, SpinnerIcon } from '../components/Icons.tsx';
import Leaderboard from '../components/Leaderboard.tsx';
import Countdown from '../components/Countdown.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useNavigation } from '../contexts/NavigationContext.tsx';
import { useUI } from '../contexts/UIContext.tsx';
import { useData, useFetchItem } from '../contexts/DataContext.tsx';
import ConfirmationModal from '../components/ConfirmationModal.tsx';
import { getDynamicQuizStatus, getOptimizedImageUrl } from '../utils.ts';
import MarkdownDisplay from '../components/MarkdownDisplay.tsx';
import { useSEO } from '../hooks/useSEO.ts';

import { slugify } from '../utils/slug.ts';

interface QuizDetailPageProps {
    quizId?: string;
    instanceId?: string;
    slug?: string;
}

const QuizDetailPage: React.FC<QuizDetailPageProps> = ({ quizId, instanceId, slug }) => {
    const { currentUser } = useAuth();
    const { handleBack, handleNavigate } = useNavigation();
    const { setModalState } = useUI();
    const { submissions, users, handleEnroll, sales, teachers, loading: dataLoading } = useData();

    const resolvedQuizId = useMemo(() => {
        if (quizId) return quizId;
        if (slug && teachers.length > 0) {
            for (const t of teachers) {
                const found = t.quizzes.find(q => slugify(q.title) === slug);
                if (found) return found.id;
            }
        }
        return '';
    }, [quizId, slug, teachers]);

    const { item: liveQuiz, teacher } = useFetchItem('quiz', resolvedQuizId);

    const [isReviewVisible, setIsReviewVisible] = useState(false);
    const [isConfirmingEnrollment, setIsConfirmingEnrollment] = useState(false);

    const quiz = useMemo(() => {
        // If an instanceId is provided (from "My Quizzes"), find that specific sale and show the snapshot.
        if (instanceId && currentUser) {
            const saleForInstance = sales.find(s =>
                s.studentId === currentUser.id &&
                s.itemId === quizId &&
                s.itemType === 'quiz' &&
                (s.itemSnapshot as Quiz).instanceStartDate === instanceId
            );
            if (saleForInstance) {
                return saleForInstance.itemSnapshot as Quiz;
            }
        }
        // Otherwise (or if snapshot not found), default to the live version.
        return liveQuiz;
    }, [instanceId, liveQuiz, sales, currentUser, quizId]);

    const isEnrolled = useMemo(() => {
        if (!currentUser || !quiz || !('instanceStartDate' in quiz)) return false;
        if (teacher?.userId === currentUser.id) return true;

        return sales.some(s =>
            s.studentId === currentUser.id &&
            s.itemId === quiz.id &&
            s.itemType === 'quiz' &&
            s.status === 'completed' &&
            (s.itemSnapshot as Quiz).instanceStartDate === quiz.instanceStartDate
        );
    }, [currentUser, quiz, sales, teacher]);

    const userSubmission = useMemo(() => {
        if (!currentUser || !quiz || !('instanceStartDate' in quiz)) return null;
        return submissions.find(s =>
            s.studentId === currentUser.id &&
            s.quizId === quiz.id &&
            s.quizInstanceId === quiz.instanceStartDate
        );
    }, [currentUser, submissions, quiz]);

    useSEO(
        quiz ? quiz.title : 'Quiz Details',
        quiz ? quiz.description.substring(0, 160) : 'View quiz details on clazz.lk',
        teacher ? teacher.profileImage : undefined
    );

    const dynamicStatus = useMemo(() => (quiz && 'questions' in quiz) ? getDynamicQuizStatus(quiz) : 'scheduled', [quiz]);

    const quizEndDateTime = useMemo(() =>
        (quiz && 'durationMinutes' in quiz) ? new Date(new Date(`${quiz.date}T${quiz.startTime}`).getTime() + quiz.durationMinutes * 60000) : new Date(),
        [quiz]
    );

    const leaderboardResults: StudentResult[] = useMemo(() => {
        if (!quiz || !('questions' in quiz) || dynamicStatus !== 'finished') return [];

        const instanceIdToShow = quiz.instanceStartDate;

        const quizSubmissions = submissions.filter(s => s.quizId === quiz.id && s.quizInstanceId === instanceIdToShow);

        const results: StudentResult[] = quizSubmissions.map(submission => {
            const student = users.find(u => u.id === submission.studentId);
            const quizStart = new Date(`${quiz.date}T${quiz.startTime}`);
            const submitTime = new Date(submission.submittedAt);
            const timeTakenSeconds = Math.round((submitTime.getTime() - quizStart.getTime()) / 1000);

            return {
                studentId: submission.studentId,
                studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
                studentAvatar: student?.avatar || '',
                score: submission.score,
                timeTakenSeconds: timeTakenSeconds > 0 ? timeTakenSeconds : Math.floor(Math.random() * quiz.durationMinutes * 60)
            };
        });

        return results.sort((a, b) => {
            if (a.score !== b.score) return b.score - a.score;
            return a.timeTakenSeconds - b.timeTakenSeconds;
        });
    }, [dynamicStatus, quiz, submissions, users]);

    if (dataLoading) {
        return (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center flex flex-col items-center justify-center">
                <SpinnerIcon className="w-8 h-8 text-primary" />
                <p className="mt-4 text-light-subtle dark:text-dark-subtle">Loading quiz details...</p>
            </div>
        );
    }

    if (!quiz || !teacher || !('questions' in quiz)) {
        return <div>Quiz not found. It may have been removed by the teacher.</div>;
    }

    const handleEnrollClick = () => {
        if (!currentUser) {
            setModalState({ name: 'login', preventRedirect: true });
        } else {
            setIsConfirmingEnrollment(true);
        }
    };

    const handleConfirmEnrollment = () => {
        // We must enroll in the LIVE version, not the snapshot
        // FIX: Add type guard to ensure liveQuiz is not a Product before enrolling
        if (liveQuiz && 'questions' in liveQuiz) {
            handleEnroll(liveQuiz as Quiz, 'quiz');
        }
        setIsConfirmingEnrollment(false);
    };

    const onStartQuiz = () => handleNavigate({ name: 'quiz_taking', quizId: quiz.id });
    const onViewTeacher = (teacher: Teacher) => {
        if (teacher.username) {
            handleNavigate({ name: 'teacher_profile_slug', slug: teacher.username });
        } else {
            handleNavigate({ name: 'teacher_profile', teacherId: teacher.id });
        }
    };

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });
    const quizStartDateTime = new Date(`${quiz.date}T${quiz.startTime}`);

    const balanceToApply = Math.min(currentUser?.accountBalance || 0, quiz.fee);
    const remainingFee = quiz.fee - balanceToApply;

    const renderActionButton = () => {
        if (dynamicStatus === 'canceled') {
            return <button disabled className="w-full bg-gray-500 text-white font-bold py-3 rounded-md cursor-not-allowed">Quiz Canceled</button>;
        }

        if (!isEnrolled && (currentUser?.role === 'teacher' || currentUser?.role === 'admin')) {
            return <button disabled className="w-full bg-gray-500 text-white font-bold py-3 rounded-md cursor-not-allowed">Only students can enroll</button>;
        }

        if (userSubmission) {
            if (dynamicStatus !== 'finished') {
                return <button disabled className="w-full bg-gray-500 text-white font-bold py-3 rounded-md cursor-not-allowed">Submitted</button>;
            } else {
                return <button onClick={() => setIsReviewVisible(!isReviewVisible)} className="w-full bg-primary text-white font-bold py-3 rounded-md hover:bg-primary-dark">
                    {isReviewVisible ? 'Hide Answer Review' : 'Review Your Answers'}
                </button>;
            }
        }

        if (dynamicStatus === 'finished') {
            return <button disabled className="w-full bg-gray-500 text-white font-bold py-3 rounded-md cursor-not-allowed">Quiz has ended</button>;
        }

        if (new Date() < quizStartDateTime) {
            if (!isEnrolled) {
                return <button onClick={handleEnrollClick} className="w-full bg-primary text-white font-bold py-3 rounded-md hover:bg-primary-dark">Register Now</button>;
            }
            return <button disabled className="w-full bg-gray-500 text-white font-bold py-3 rounded-md cursor-not-allowed">Enrolled</button>;
        }

        if (isEnrolled && !userSubmission) {
            return <button onClick={onStartQuiz} className="w-full bg-green-600 text-white font-bold py-3 rounded-md hover:bg-green-700 animate-pulse">Start Quiz Now</button>;
        }

        if (!currentUser) {
            return <button onClick={() => setModalState({ name: 'login', preventRedirect: true })} className="w-full bg-primary text-white font-bold py-3 rounded-md hover:bg-primary-dark">Login to Register</button>;
        }

        return <button onClick={handleEnrollClick} className="w-full bg-primary text-white font-bold py-3 rounded-md hover:bg-primary-dark">Register Now</button>;
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slideInUp">
            <div className="mb-4">
                {instanceId ? (
                    <button onClick={() => handleNavigate({ name: 'student_dashboard', initialTab: 'quizzes' })} className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors">
                        <ChevronLeftIcon className="h-5 w-5" />
                        <span>Back to My Quizzes</span>
                    </button>
                ) : (
                    <button onClick={handleBack} className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors">
                        <ChevronLeftIcon className="h-5 w-5" />
                        <span>Back</span>
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-primary/10 text-primary-dark dark:text-primary-light uppercase tracking-wider">
                            {quiz.subject}
                        </span>
                        <h1 className="mt-3 text-3xl md:text-4xl font-bold">{quiz.title}</h1>
                        <div className="mt-2 text-light-subtle dark:text-dark-subtle">
                            <MarkdownDisplay content={quiz.description} className="prose-lg" />
                        </div>

                        <div className="mt-6 flex items-center space-x-4">
                            <button onClick={() => onViewTeacher(teacher)} className="flex items-center space-x-2 group">
                                <img src={getOptimizedImageUrl(teacher.avatar, 40, 40)} alt={teacher.name} className="w-10 h-10 rounded-full" />
                                <div>
                                    <p className="text-sm text-light-subtle dark:text-dark-subtle">Hosted by</p>
                                    <p className="font-semibold group-hover:underline">{teacher.name}</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {userSubmission ? (
                        dynamicStatus !== 'finished' ? (
                            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md text-center">
                                <h2 className="text-2xl font-bold mb-4">Submission Received!</h2>
                                <p className="text-light-subtle dark:text-dark-subtle mb-6">
                                    Results, leaderboard, and the answer review will be available after the quiz officially ends.
                                </p>
                                <h3 className="font-bold text-lg mb-2">Quiz Ends In</h3>
                                <div className="flex justify-center">
                                    <Countdown targetDate={quizEndDateTime} completionMessage="The quiz has ended!" />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                                    <h2 className="text-2xl font-bold mb-4">Your Result</h2>
                                    <div className="flex justify-around text-center">
                                        <div>
                                            <p className="text-sm text-light-subtle dark:text-dark-subtle">Score</p>
                                            <p className="text-3xl font-bold text-primary">{userSubmission.score}/{quiz.questions.length}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-light-subtle dark:text-dark-subtle">Rank</p>
                                            <p className="text-3xl font-bold text-primary">#{leaderboardResults.findIndex(r => r.studentId === currentUser?.id) + 1 || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                {isReviewVisible && (
                                    <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md space-y-6">
                                        <h2 className="text-2xl font-bold">Answer Review</h2>
                                        {quiz.questions.map((q, index) => {
                                            const submissionAnswer = userSubmission.answers.find(a => a.questionId === q.id);
                                            return (
                                                <div key={q.id} className="p-4 border border-light-border dark:border-dark-border rounded-md">
                                                    {q.imageUrl && (
                                                        <div className="mb-4 rounded-lg overflow-hidden">
                                                            <img src={q.imageUrl} alt="Question visual aid" className="max-h-60 w-auto mx-auto" />
                                                        </div>
                                                    )}
                                                    <p className="font-semibold">{index + 1}. {q.text}</p>
                                                    <div className="mt-3 space-y-2">
                                                        {q.answers.map(ans => {
                                                            const isSelected = submissionAnswer?.selectedAnswerIds.includes(ans.id);
                                                            const isCorrect = ans.isCorrect;
                                                            let icon = null;
                                                            let colorClass = '';
                                                            if (isSelected && !isCorrect) {
                                                                icon = <XCircleIcon className="w-5 h-5 text-red-500 mr-2" />;
                                                                colorClass = 'bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500';
                                                            } else if (isCorrect) {
                                                                icon = <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />;
                                                                colorClass = 'bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500';
                                                            }
                                                            return (
                                                                <div key={ans.id} className={`flex items-center p-3 rounded-md ${colorClass}`}>
                                                                    {icon}
                                                                    <p className={`${isSelected ? 'font-bold' : ''}`}>{ans.text}</p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <Leaderboard results={leaderboardResults} totalQuestions={quiz.questions.length} />
                            </>
                        )
                    ) : (
                        (dynamicStatus === 'finished') ? (
                            <Leaderboard results={leaderboardResults} totalQuestions={quiz.questions.length} />
                        ) : (
                            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md text-center">
                                <h2 className="text-2xl font-bold mb-2">Ready to test your knowledge?</h2>
                                <p className="text-light-subtle dark:text-dark-subtle">
                                    Register and start the quiz before the time runs out. Good luck!
                                </p>
                            </div>
                        )
                    )}

                </div>

                <div className="lg:col-span-1">
                    <div className="sticky top-24 bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-6 space-y-4">
                        {dynamicStatus === 'scheduled' && new Date() < quizStartDateTime && !userSubmission && (
                            <div className="pb-4 border-b border-light-border dark:border-dark-border">
                                <h3 className="font-bold text-center text-lg mb-2">Quiz Starts In</h3>
                                <Countdown targetDate={quizStartDateTime} completionMessage="Quiz is starting now!" />
                            </div>
                        )}
                        <p className="text-3xl font-bold text-primary">{quiz.fee > 0 ? currencyFormatter.format(quiz.fee) : 'Free'}</p>
                        {currentUser && balanceToApply > 0 && !isEnrolled && quiz.status === 'scheduled' && (
                            <div className="mt-4 p-3 text-sm bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-md">
                                <p className="font-semibold text-green-800 dark:text-green-200">Account Balance Applied!</p>
                                <div className="flex justify-between text-green-700 dark:text-green-300">
                                    <span>Balance Used:</span>
                                    <span>-{currencyFormatter.format(balanceToApply)}</span>
                                </div>
                                <div className="flex justify-between font-bold mt-1 pt-1 border-t border-green-300 dark:border-green-700">
                                    <span>Amount to Pay:</span>
                                    <span>{currencyFormatter.format(remainingFee)}</span>
                                </div>
                            </div>
                        )}
                        {renderActionButton()}
                    </div>
                </div>
            </div>
            {isConfirmingEnrollment && (() => {
                let message: string;
                let confirmText: string;

                if (quiz.fee > 0) {
                    if (balanceToApply > 0) {
                        if (remainingFee > 0) {
                            message = `Your account balance of ${currencyFormatter.format(balanceToApply)} will be applied. You are about to pay the remaining ${currencyFormatter.format(remainingFee)}. Continue?`;
                            confirmText = `Pay ${currencyFormatter.format(remainingFee)}`;
                        } else {
                            message = `Your account balance of ${currencyFormatter.format(balanceToApply)} will fully cover the cost of this registration. Continue?`;
                            confirmText = 'Register using Balance';
                        }
                    } else {
                        message = `You are about to pay ${currencyFormatter.format(quiz.fee)} to register for this quiz. Continue?`;
                        confirmText = `Pay ${currencyFormatter.format(quiz.fee)}`;
                    }
                    message += ' Please note that there will be no refunds for change of mind.';
                } else {
                    message = 'Are you sure you want to register for this quiz?';
                    confirmText = 'Yes, Register';
                }

                return (
                    <ConfirmationModal
                        isOpen={true}
                        onClose={() => setIsConfirmingEnrollment(false)}
                        onConfirm={handleConfirmEnrollment}
                        title={`Confirm Registration: ${quiz.title}`}
                        message={message}
                        confirmText={confirmText}
                    />
                );
            })()}
        </div>
    );
};

export default QuizDetailPage;
