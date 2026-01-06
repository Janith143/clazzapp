import React, { useMemo } from 'react';
import { ScheduleItem } from '../../types';
import { ChevronRightIcon, ClockIcon } from '../Icons';

interface TimeTableProps {
  schedule: ScheduleItem[];
  onItemClick: (item: ScheduleItem) => void;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TimeTable: React.FC<TimeTableProps> = ({ schedule, onItemClick }) => {

  // Helper to parse "HH:MM" string to decimal hours (e.g. "14:30" -> 14.5)
  const parseTime = (timeStr: string) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
  };

  // Helper to get duration in minutes
  const getDuration = (startStr: string, endStr: string) => {
    const start = parseTime(startStr);
    let end = parseTime(endStr);
    if (!end || end <= start) end = start + 1; // Default to 1 hour if end time missing or invalid
    return (end - start) * 60;
  };

  // 1. Calculate Dynamic Range
  const { minHour, displayHours } = useMemo(() => {
    if (!schedule || schedule.length === 0) {
      // Default view if empty: 8 AM to 6 PM
      return { minHour: 8, displayHours: Array.from({ length: 11 }, (_, i) => i + 8) };
    }

    let min = 24;
    let max = 0;

    schedule.forEach(item => {
      const start = parseTime(item.startTime);
      let end = parseTime(item.endTime);
      // Handle missing/invalid end time for calculation purposes
      if (!end || end <= start) end = start + 1;

      if (start < min) min = start;
      if (end > max) max = end;
    });

    // Add buffer: Start 1 hour before earliest class (clamped to 0)
    // End 1 hour after latest class (clamped to 24)
    const startHour = Math.max(0, Math.floor(min) - 1);
    const endHour = Math.min(24, Math.ceil(max) + 1);

    // Create array of hours for the grid
    const count = Math.max(endHour - startHour, 5); // Ensure at least 5 hours height
    const hours = Array.from({ length: count }, (_, i) => i + startHour);

    return { minHour: startHour, displayHours: hours };
  }, [schedule]);

  // Helper to get time position (top offset and height)
  const getTimePosition = (startStr: string, endStr: string) => {
    const startHour = parseTime(startStr);
    // Offset relative to dynamically calculated minHour
    const offsetStart = Math.max(0, startHour - minHour);
    const top = offsetStart * 60; // 60px per hour
    const durationMinutes = getDuration(startStr, endStr);
    const height = (durationMinutes / 60) * 60;
    return { top, height };
  };

  // Group items by day for mobile view
  const itemsByDay = useMemo(() => {
    return DAYS.map(day => ({
      dayName: day,
      items: schedule
        .filter(item => item.day === day)
        .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime))
    }));
  }, [schedule]);

  // Mobile View: List of days with items
  const MobileView = () => (
    <div className="md:hidden space-y-4">
      {itemsByDay.map(({ dayName, items }) => (
        items.length > 0 && (
          <div key={dayName} className="rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 dark:bg-white/5 border-b border-light-border dark:border-dark-border flex justify-between items-center">
              <h4 className="font-bold text-light-text dark:text-dark-text">{dayName}</h4>
              <span className="text-xs text-light-subtle dark:text-dark-subtle">{items.length} events</span>
            </div>
            <div className="p-2 space-y-2">
              {items.length === 0 ? (
                <p className="text-xs text-center text-light-subtle dark:text-dark-subtle py-2">No events</p>
              ) : (
                items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => onItemClick(item)}
                    className={`w-full text-left p-3 rounded-lg border-l-4 shadow-sm active:scale-95 transition-transform flex justify-between items-center
                                            ${item.type === 'class'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      }`}
                  >
                    <div>
                      <p className="font-bold text-sm text-light-text dark:text-dark-text line-clamp-1">{item.title}</p>
                      <div className="flex items-center gap-1 text-xs text-light-subtle dark:text-dark-subtle mt-1">
                        <ClockIcon className="w-3 h-3" />
                        <span>
                          {new Date(`2000-01-01T${item.startTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} -
                          {item.endTime ? new Date(`2000-01-01T${item.endTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-light-subtle dark:text-dark-subtle" />
                  </button>
                ))
              )}
            </div>
          </div>
        )
      ))}
      {itemsByDay.every(d => d.items.length === 0) && (
        <div className="text-center p-8 text-light-subtle dark:text-dark-subtle">No classes scheduled for this week.</div>
      )}
    </div>
  );

  // Desktop View: Grid
  const DesktopView = () => (
    <div className="hidden md:block overflow-x-auto border border-light-border dark:border-dark-border rounded-xl bg-white dark:bg-dark-card shadow-sm">
      <div className="min-w-[800px] relative">
        {/* Header Row */}
        <div className="grid grid-cols-8 border-b border-light-border dark:border-dark-border bg-gray-50 dark:bg-white/5">
          <div className="p-3 text-xs font-bold text-center text-light-subtle dark:text-dark-subtle border-r border-light-border dark:border-dark-border">Time</div>
          {DAYS.map(day => (
            <div key={day} className="p-3 text-sm font-bold text-center text-light-text dark:text-dark-text border-r border-light-border dark:border-dark-border last:border-r-0">
              {day.slice(0, 3)} {/* Mon, Tue... */}
            </div>
          ))}
        </div>

        {/* Grid Body */}
        <div className="relative grid grid-cols-8" style={{ height: `${displayHours.length * 60}px` }}> {/* 60px per hour */}
          {/* Time Column */}
          <div className="col-span-1 border-r border-light-border dark:border-dark-border bg-gray-50/50 dark:bg-white/5">
            {displayHours.map((hour) => (
              <div key={hour} className="h-[60px] border-b border-light-border dark:border-dark-border text-xs text-right pr-2 pt-1 text-light-subtle dark:text-dark-subtle relative">
                <span className="-top-2 relative">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : hour === 24 ? '12 AM' : `${hour - 12} PM`}
                </span>
              </div>
            ))}
          </div>

          {/* Day Columns BG */}
          {DAYS.map((_, i) => (
            <div key={i} className="col-span-1 border-r border-light-border dark:border-dark-border last:border-r-0 relative">
              {displayHours.map(h => (
                <div key={h} className="h-[60px] border-b border-dashed border-gray-100 dark:border-gray-800" />
              ))}
            </div>
          ))}

          {/* Absolute Events Overlay */}
          <div className="absolute top-0 left-0 w-full h-full grid grid-cols-8 pointer-events-none">
            <div className="col-span-1"></div> {/* Spacer for time column */}
            {DAYS.map((day, colIndex) => (
              <div key={day} className="col-span-1 relative h-full">
                {schedule
                  .filter(item => item.day === day)
                  .map(item => {
                    const { top, height } = getTimePosition(item.startTime, item.endTime);
                    // Skip if out of bounds (before minHour)
                    if (top < 0) return null;

                    return (
                      <button
                        key={item.id}
                        onClick={() => onItemClick(item)}
                        className={`absolute w-[95%] left-[2.5%] rounded-md text-xs p-1 text-left border-l-4 shadow-sm hover:brightness-95 transition-all pointer-events-auto overflow-hidden group z-10
                                                    ${item.type === 'class'
                            ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-900 dark:text-blue-100'
                            : 'bg-purple-100 dark:bg-purple-900 border-purple-500 text-purple-900 dark:text-purple-100'
                          }`}
                        style={{ top: `${top}px`, height: `${Math.max(30, height)}px` }} // Min height 30px
                        title={`${item.title} (${item.startTime})`}
                      >
                        <div className="font-bold truncate group-hover:whitespace-normal">{item.title}</div>
                        <div className="opacity-80 truncate text-[10px]">
                          {new Date(`2000-01-01T${item.startTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </button>
                    );
                  })
                }
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <MobileView />
      <DesktopView />
    </div>
  );
};

export default TimeTable;