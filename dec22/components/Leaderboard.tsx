import React from 'react';
import { StudentResult } from '../types.ts';
import { ClockIcon } from './Icons.tsx';

interface LeaderboardProps {
  results: StudentResult[];
  totalQuestions: number;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ results, totalQuestions }) => {
    
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const rankColors = [
        'text-yellow-400', // 1st
        'text-gray-400 dark:text-gray-300', // 2nd
        'text-yellow-600 dark:text-amber-700', // 3rd
    ];

    return (
        <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
            {results.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-light-border dark:divide-dark-border">
                        <thead className="bg-light-background dark:bg-dark-background">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-16">Rank</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Student</th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Score</th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-light-border dark:divide-dark-border">
                            {results.map((result, index) => (
                                <tr key={result.studentId} className={index < 3 ? 'bg-primary/5 dark:bg-primary/10' : ''}>
                                    <td className={`px-4 py-3 whitespace-nowrap font-bold text-xl ${rankColors[index] || 'text-light-text dark:text-dark-text'}`}>
                                        #{index + 1}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {result.studentAvatar ? (
                                                <img className="h-10 w-10 rounded-full" src={result.studentAvatar} alt={result.studentName} crossOrigin="anonymous" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white text-base font-bold">
                                                    <span>
                                                        {result.studentName?.split(' ')[0]?.charAt(0) || ''}
                                                        {result.studentName?.split(' ')[1]?.charAt(0) || ''}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-light-text dark:text-dark-text">{result.studentName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold">
                                        {result.score} / {totalQuestions}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-light-subtle dark:text-dark-subtle">
                                        <div className="flex items-center justify-end">
                                            <ClockIcon className="w-4 h-4 mr-1"/>
                                            {formatTime(result.timeTakenSeconds)}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">No submissions yet. The leaderboard will appear here after the quiz ends.</p>
            )}
        </div>
    );
};

export default Leaderboard;