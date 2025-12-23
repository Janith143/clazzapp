import React, { useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Quiz, IndividualClass, User } from '../../types';
import LineChart from '../charts/LineChart';
import BarChart from '../charts/BarChart';
import RadarChart from '../charts/RadarChart';

interface MyScoreCardProps {
    user: User;
}

const MyScoreCard: React.FC<MyScoreCardProps> = ({ user }) => {
    const { teachers, submissions, sales } = useData();
    const [filterType, setFilterType] = useState<'all' | 'class' | 'quiz'>('all');
    const [subjectFilter, setSubjectFilter] = useState<string>('all');

    const gradedItems = useMemo(() => {
        if (!user) return [];

        const items: any[] = [];
        
        // Process graded classes
        teachers.forEach(teacher => {
            teacher.individualClasses.forEach(classInfo => {
                if (classInfo.grades) {
                    Object.entries(classInfo.grades).forEach(([instanceDate, gradeData]) => {
                        const studentScoreEntry = gradeData.studentScores.find(s => s.studentId === user.id);
                        if (studentScoreEntry) {
                            const totalScore = gradeData.studentScores.reduce((sum, s) => sum + s.score, 0);
                            const classAverage = gradeData.studentScores.length > 0 ? totalScore / gradeData.studentScores.length : 0;
                            items.push({
                                id: `${classInfo.id}-${instanceDate}`,
                                title: classInfo.title,
                                subject: classInfo.subject,
                                date: instanceDate,
                                studentScore: studentScoreEntry.score,
                                maxMark: gradeData.maxMark,
                                classAverage,
                                type: 'class',
                            });
                        }
                    });
                }
            });
        });

        // Process quiz submissions
        submissions
            .filter(sub => sub.studentId === user.id)
            .forEach(sub => {
                const sale = sales.find(s => s.itemId === sub.quizId && s.itemType === 'quiz' && (s.itemSnapshot as any)?.instanceStartDate === sub.quizInstanceId);
                if (!sale || !sale.itemSnapshot) return;
                
                const quiz = sale.itemSnapshot as Quiz;
                if (!quiz.questions) return;
                
                const instanceSubmissions = submissions.filter(s => s.quizId === quiz.id && s.quizInstanceId === quiz.instanceStartDate);
                const totalScore = instanceSubmissions.reduce((sum, s) => sum + s.score, 0);
                const classAverage = instanceSubmissions.length > 0 ? totalScore / instanceSubmissions.length : 0;
                
                items.push({
                    id: `${quiz.id}-${quiz.instanceStartDate}`,
                    title: quiz.title,
                    subject: quiz.subject,
                    date: quiz.date,
                    studentScore: sub.score,
                    maxMark: quiz.questions.length,
                    classAverage,
                    type: 'quiz'
                });
            });

        return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [user, teachers, submissions, sales]);

    const filteredItems = useMemo(() => {
        return gradedItems.filter(item => 
            (filterType === 'all' || item.type === filterType) &&
            (subjectFilter === 'all' || item.subject === subjectFilter)
        );
    }, [gradedItems, filterType, subjectFilter]);

    const subjectOptions = useMemo(() => {
        const allSubjects = new Set(gradedItems.map(item => item.subject));
        return ['all', ...Array.from(allSubjects)];
    }, [gradedItems]);

    const lineChartData = useMemo(() => {
        return filteredItems.map(item => ({
            x: new Date(item.date).toLocaleDateString('en-CA'),
            y: (item.studentScore / item.maxMark) * 100,
            y2: (item.classAverage / item.maxMark) * 100,
            details: item,
        }));
    }, [filteredItems]);
    
    const barChartData = useMemo(() => {
        return filteredItems.slice(-10).map(item => ({ // Show last 10 items for clarity
            label: item.title.substring(0, 15) + '...',
            value1: item.studentScore,
            value2: item.classAverage,
            max: item.maxMark,
        }));
    }, [filteredItems]);

    const radarChartData = useMemo(() => {
        const subjectScores: { [subject: string]: { total: number; count: number } } = {};
        gradedItems.forEach(item => {
            if (!subjectScores[item.subject]) {
                subjectScores[item.subject] = { total: 0, count: 0 };
            }
            const percentage = (item.studentScore / item.maxMark) * 100;
            subjectScores[item.subject].total += percentage;
            subjectScores[item.subject].count += 1;
        });

        return Object.entries(subjectScores).map(([subject, data]) => ({
            subject,
            score: data.total / data.count,
        }));
    }, [gradedItems]);

    if (gradedItems.length === 0) {
        return <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">No graded assignments or quizzes found.</p>;
    }

    return (
        <div className="space-y-8">
            <div className="bg-light-surface dark:bg-dark-surface p-4 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4">Performance Overview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="w-full p-2 border rounded-md bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border">
                        <option value="all">All Assessments</option>
                        <option value="class">Graded Classes</option>
                        <option value="quiz">Quizzes</option>
                    </select>
                    <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="w-full p-2 border rounded-md bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border">
                        {subjectOptions.map(sub => <option key={sub} value={sub}>{sub === 'all' ? 'All Subjects' : sub}</option>)}
                    </select>
                </div>
            </div>

            {filteredItems.length > 0 ? (
                <>
                    <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                        <h4 className="font-semibold mb-4 text-lg">Score Over Time</h4>
                        <LineChart data={lineChartData} y1Label="Your Score" y2Label="Class Average" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                            <h4 className="font-semibold mb-4 text-lg">Recent Performance vs. Average</h4>
                            <BarChart data={barChartData} label1="Your Score" label2="Class Average" />
                        </div>
                        <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                            <h4 className="font-semibold mb-4 text-lg">Average Performance by Subject</h4>
                            <RadarChart data={radarChartData} />
                        </div>
                    </div>
                </>
            ) : (
                <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">No data available for the selected filters.</p>
            )}
        </div>
    );
};

export default MyScoreCard;