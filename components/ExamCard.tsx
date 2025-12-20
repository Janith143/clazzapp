import React from 'react';
import { UpcomingExam } from '../types';
import Countdown from './Countdown';
import { CalendarIcon } from './Icons';

interface ExamCardProps {
    exam: UpcomingExam;
}

const ExamCard: React.FC<ExamCardProps> = ({ exam }) => {
    const examDate = new Date(exam.date);
    // Adjust for timezone to show correct date
    examDate.setMinutes(examDate.getMinutes() + examDate.getTimezoneOffset());
    
    const formattedDate = examDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });

    return (
        <div className={`p-3 rounded-lg shadow-md border-l-4 ${exam.isHighPriority ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/20' : 'border-primary bg-light-surface dark:bg-dark-surface'} animate-fadeIn`}>
            <div className="flex justify-between items-start gap-2">
                <h3 className="text-sm font-bold text-light-text dark:text-dark-text leading-tight">{exam.name}</h3>
            </div>
            <div className="flex items-center text-xs text-light-subtle dark:text-dark-subtle mt-1">
                <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                <span>{formattedDate}</span>
            </div>
            <div className="mt-2">
                <Countdown targetDate={examDate} completionMessage="Exam day is here!" size="small" />
            </div>
        </div>
    );
};

export default ExamCard;
