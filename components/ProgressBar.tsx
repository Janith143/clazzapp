import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max, label }) => {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div>
      {label && <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary-dark bg-primary/20">{label}</span>}
      <div className="w-full bg-light-border dark:bg-dark-border rounded-full h-2.5 mt-1">
        <div 
          className="bg-primary h-2.5 rounded-full transition-all duration-500" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;