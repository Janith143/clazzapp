import React from 'react';
import { IndividualClass, Teacher } from '../types.ts';

interface OngoingClassesBarProps {
  ongoingClasses: { classInfo: IndividualClass; teacher: Teacher }[];
  onClassClick: (classInfo: IndividualClass) => void;
  onBarClick: () => void;
}

const OngoingClassesBar: React.FC<OngoingClassesBarProps> = ({ ongoingClasses, onClassClick, onBarClick }) => {
  const separator = <span className="mx-4 font-normal">|</span>;

  // Create an array of JSX elements for the classes
  const classElements = ongoingClasses.map((item, index) => (
    <React.Fragment key={item.classInfo.id}>
      {index > 0 && separator}
      <button
        onClick={() => onClassClick(item.classInfo)}
        className="hover:underline focus:underline focus:outline-none text-left"
      >
        {`${item.classInfo.title} by ${item.teacher.name}`}
      </button>
    </React.Fragment>
  ));

  return (
    <div className="w-full bg-red-600 dark:bg-red-700 text-white py-2.5 group animate-fadeIn">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3 overflow-hidden">
          <button onClick={onBarClick} className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/70 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span className="ml-2 font-bold text-sm uppercase tracking-wider">Live Now</span>
          </button>
          
          <div className="flex-1 overflow-hidden whitespace-nowrap">
            <div className="inline-block animate-marquee group-hover:[animation-play-state:paused]">
              {/* The content to be scrolled */}
              <span className="inline-flex items-center mx-8 font-medium text-sm">
                {classElements}
              </span>
              {/* The duplicated content for seamless effect */}
              <span className="inline-flex items-center mx-8 font-medium text-sm">
                {classElements}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OngoingClassesBar;