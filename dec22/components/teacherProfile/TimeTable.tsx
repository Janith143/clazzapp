import React from 'react';
import { ScheduleItem } from '../../types.ts';
import { TrophyIcon } from '../Icons.tsx';

interface TimeTableProps {
  schedule: ScheduleItem[];
  onItemClick?: (item: ScheduleItem) => void;
  title?: string;
}

const typeColors: { [key: string]: { [key: string]: string } } = {
  class: {
    'Physics': 'bg-blue-100 dark:bg-blue-900 border-blue-500',
    'Mathematics': 'bg-green-100 dark:bg-green-900 border-green-500',
    'Computer Science': 'bg-purple-100 dark:bg-purple-900 border-purple-500',
    'Chemistry': 'bg-red-100 dark:bg-red-900 border-red-500',
    'Biology': 'bg-teal-100 dark:bg-teal-900 border-teal-500',
    'Default': 'bg-gray-100 dark:bg-gray-700 border-gray-500'
  },
  quiz: {
    'Physics': 'bg-amber-100 dark:bg-amber-900 border-amber-500',
    'Mathematics': 'bg-lime-100 dark:bg-lime-900 border-lime-500',
    'Computer Science': 'bg-fuchsia-100 dark:bg-fuchsia-900 border-fuchsia-500',
    'Chemistry': 'bg-orange-100 dark:bg-orange-900 border-orange-500',
    'Biology': 'bg-cyan-100 dark:bg-cyan-900 border-cyan-500',
    'Default': 'bg-stone-100 dark:bg-stone-700 border-stone-500'
  }
};

const TimeTable: React.FC<TimeTableProps> = ({ schedule, onItemClick, title = "Weekly Time Table" }) => {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div>
      {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[700px] gap-2">
          {days.map(day => (
            <div key={day} className="font-semibold text-center text-light-subtle dark:text-dark-subtle pb-2 border-b-2 border-light-border dark:border-dark-border">{day}</div>
          ))}
          {days.map(day => (
            <div key={day} className="relative h-96 space-y-2 pt-2 border-l border-light-border dark:border-dark-border first:border-l-0 px-1">
              {schedule
                .filter(item => item.day === day)
                .sort((a,b) => a.startTime.localeCompare(b.startTime))
                .map((item, index) => {
                  const colors = typeColors[item.type] || typeColors.class;
                  const colorClass = colors[item.subject] || colors['Default'];
                  
                  const commonProps = {
                      key: `${item.id}-${item.type}`,
                      className: `p-2 rounded-md border-l-4 w-full text-left transition-all duration-200 ${colorClass} ${onItemClick ? 'cursor-pointer hover:shadow-md hover:scale-105 hover:border-primary' : ''} animate-fadeIn`,
                      style: { animationDelay: `${index * 50}ms` },
                      onClick: onItemClick ? () => onItemClick(item) : undefined,
                  };
                  
                  const content = (
                    <>
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-sm text-light-text dark:text-dark-text">{item.title}</p>
                        {item.type === 'quiz' && <TrophyIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-light-subtle dark:text-dark-subtle">{item.startTime}{item.endTime ? ` - ${item.endTime}` : ''}</p>
                    </>
                  );

                  return onItemClick ? (
                    <button {...commonProps}>{content}</button>
                  ) : (
                    <div {...commonProps}>{content}</div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimeTable;