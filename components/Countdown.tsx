import React, { useState, useEffect } from 'react';

interface CountdownProps {
  targetDate: Date;
  completionMessage: string;
  size?: 'large' | 'small';
}

const TimeCard: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="flex flex-col items-center">
        <div className="w-16 h-16 flex items-center justify-center bg-light-background dark:bg-dark-background rounded-lg shadow-inner">
            <span className="text-3xl font-bold text-primary">{value.toString().padStart(2, '0')}</span>
        </div>
        <span className="mt-2 text-xs font-semibold uppercase text-light-subtle dark:text-dark-subtle">{label}</span>
    </div>
);


const Countdown: React.FC<CountdownProps> = ({ targetDate, completionMessage, size = 'large' }) => {
  const calculateTimeLeft = () => {
    const difference = +targetDate - +new Date();
    let timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0, total: difference };

    if (difference > 0) {
      timeLeft = {
        ...timeLeft,
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearTimeout(timer);
  });

  if (timeLeft.total <= 0) {
      return <div className={`text-center font-bold text-primary ${size === 'small' ? 'text-sm' : 'text-lg'}`}>{completionMessage}</div>;
  }
  
  if (size === 'small') {
      return (
           <div className="flex justify-start items-baseline space-x-1.5 text-center">
                {timeLeft.days > 0 && (
                    <div className="flex items-baseline">
                        <span className="text-xl font-bold text-primary leading-none">{timeLeft.days}</span>
                        <span className="text-[10px] font-semibold text-light-subtle dark:text-dark-subtle ml-0.5">d</span>
                    </div>
                )}
                <div className="flex items-baseline">
                    <span className="text-xl font-bold text-primary leading-none">{String(timeLeft.hours).padStart(2, '0')}</span>
                    <span className="text-[10px] font-semibold text-light-subtle dark:text-dark-subtle ml-0.5">h</span>
                </div>
                <div className="flex items-baseline">
                    <span className="text-xl font-bold text-primary leading-none">{String(timeLeft.minutes).padStart(2, '0')}</span>
                    <span className="text-[10px] font-semibold text-light-subtle dark:text-dark-subtle ml-0.5">m</span>
                </div>
                <div className="flex items-baseline">
                    <span className="text-xl font-bold text-primary leading-none">{String(timeLeft.seconds).padStart(2, '0')}</span>
                    <span className="text-[10px] font-semibold text-light-subtle dark:text-dark-subtle ml-0.5">s</span>
                </div>
            </div>
      );
  }

  return (
    <div className="flex justify-center space-x-2 sm:space-x-4">
      {timeLeft.days > 0 && <TimeCard value={timeLeft.days} label="Days" />}
      <TimeCard value={timeLeft.hours} label="Hours" />
      <TimeCard value={timeLeft.minutes} label="Minutes" />
      <TimeCard value={timeLeft.seconds} label="Seconds" />
    </div>
  );
};

export default Countdown;