import React from 'react';
// FIX: Alias Event to InstituteEvent to avoid name collision with native DOM Event type.
import { Event as InstituteEvent, TuitionInstitute } from '../../types';
import { ClockIcon, CalendarIcon, UserGroupIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '../Icons';
import { getDynamicEventStatus } from '../../utils';

interface TIEventCardProps {
  event: InstituteEvent;
  organizer: TuitionInstitute;
  enrollmentCount: number;
  onView: (event: InstituteEvent) => void;
  onEdit: (event: InstituteEvent) => void;
  onCancel: (eventId: string) => void;
  onTogglePublish: (eventId: string) => void;
}

type DynamicStatus = 'live' | 'scheduled' | 'finished' | 'canceled';

const EventStatusBadge: React.FC<{status: DynamicStatus}> = ({ status }) => {
    const styles: Record<DynamicStatus, string> = {
        scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        live: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 animate-pulse',
        finished: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        canceled: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
    };
    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

const TIEventCard: React.FC<TIEventCardProps> = ({ event, organizer, enrollmentCount, onView, onEdit, onCancel, onTogglePublish }) => {
  const currencyFormatter = new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
  });

  const formattedDate = new Date(event.startDate).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
  });

  const dynamicStatus = getDynamicEventStatus(event);

  return (
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden flex flex-col group animate-fadeIn transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
       <div className="relative">
            <img src={event.flyerImage} alt={event.title} className="w-full h-40 object-cover"/>
            <div className="absolute top-2 left-2 flex items-center gap-2">
                <EventStatusBadge status={dynamicStatus} />
                 {!event.isPublished && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">Unpublished</span>
                )}
            </div>
       </div>

      <div className="p-4 flex-grow flex flex-col">
        <h3 className="text-md font-bold text-light-text dark:text-dark-text">{event.title}</h3>
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">{event.category}</p>
        
        <div className="mt-3 space-y-2 text-sm text-light-subtle dark:text-dark-subtle flex-grow">
            <div className="flex items-center">
                <CalendarIcon className="w-4 h-4 mr-2" />
                <span>{formattedDate}</span>
            </div>
            <div className="flex items-center">
                <ClockIcon className="w-4 h-4 mr-2" />
                <span>{event.startTime} - {event.endTime}</span>
            </div>
            <div className="flex items-center" title={`${enrollmentCount} enrolled students`}>
                <UserGroupIcon className="w-4 h-4 mr-2" />
                <span>{enrollmentCount} Enrolled</span>
            </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-light-border dark:border-dark-border flex justify-between items-center">
            <button onClick={() => onView(event)} className="text-sm font-medium text-primary hover:underline">View Details</button>
            <div className="flex items-center space-x-1">
                <button
                    onClick={() => onTogglePublish(event.id)}
                    disabled={dynamicStatus !== 'scheduled'}
                    className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors disabled:opacity-50"
                    title={dynamicStatus !== 'scheduled' ? "Can only change publish status for scheduled events" : (event.isPublished ? 'Unpublish Event' : 'Publish Event')}
                    aria-label={event.isPublished ? "Unpublish event" : "Publish event"}
                >
                    {event.isPublished ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
                <button 
                    onClick={() => onEdit(event)} 
                    disabled={dynamicStatus === 'canceled'}
                    className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors disabled:opacity-50" 
                    title="Edit Event">
                    <PencilIcon className="h-4 w-4" />
                </button>
                <button 
                    onClick={() => onCancel(event.id)} 
                    disabled={dynamicStatus !== 'scheduled'}
                    className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors disabled:opacity-50" 
                    title={dynamicStatus !== 'scheduled' ? "Cannot cancel an event that is not scheduled." : "Cancel event & refund students"}>
                    <TrashIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default TIEventCard;