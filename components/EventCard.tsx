import React from 'react';
import { Event, TuitionInstitute } from '../types.ts';
import { ClockIcon, CalendarIcon, MapPinIcon, OnlineIcon } from './Icons.tsx';
import { getDynamicEventStatus, getOptimizedImageUrl } from '../utils.ts';

interface EventCardProps {
  event: Event;
  organizer: TuitionInstitute;
  onView: (event: Event) => void;
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

const EventCard: React.FC<EventCardProps> = ({ event, organizer, onView }) => {
  const currencyFormatter = new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
  });

  const getModeIcon = (mode: Event['mode']) => {
    switch(mode) {
      case 'Online': return <OnlineIcon className="w-4 h-4" />;
      case 'Physical': return <MapPinIcon className="w-4 h-4" />;
      case 'Hybrid': return <div className="flex items-center space-x-1"><OnlineIcon className="w-4 h-4" /><MapPinIcon className="w-4 h-4" /></div>;
      default: return null;
    }
  };
  
  const formattedDate = new Date(event.startDate).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
  });

  const dynamicStatus = getDynamicEventStatus(event);
  const optimizedFlyer = getOptimizedImageUrl(event.flyerImage, 400);

  return (
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden flex flex-col group animate-fadeIn transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative">
        <img
          src={optimizedFlyer || 'https://via.placeholder.com/400x225'}
          alt={event.title}
          crossOrigin="anonymous"
          className="w-full h-48 object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute top-0 right-0 bg-primary text-white text-sm font-bold px-3 py-1 m-2 rounded-md">
            {event.tickets.price > 0 ? currencyFormatter.format(event.tickets.price) : 'Free'}
        </div>
      </div>
      <div className="p-5 flex-grow flex flex-col">
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
            {event.category}
        </span>
        
        <h3 className="mt-3 text-lg font-bold text-light-text dark:text-dark-text group-hover:text-primary transition-colors">{event.title}</h3>
        
        <div className="mt-2 text-sm font-medium text-light-subtle dark:text-dark-subtle">
            Organized by <span className="font-semibold text-light-text dark:text-dark-text">{organizer.name}</span>
        </div>

        <div className="mt-4 space-y-2 text-sm text-light-subtle dark:text-dark-subtle flex-grow">
            <div className="flex items-center">
                <CalendarIcon className="w-4 h-4 mr-2" />
                <span>{formattedDate}</span>
            </div>
            <div className="flex items-center">
                <ClockIcon className="w-4 h-4 mr-2" />
                <span>{event.startTime} - {event.endTime}</span>
            </div>
             <div className="flex items-center">
                <div className="w-4 h-4 mr-2 flex items-center justify-center">{getModeIcon(event.mode)}</div>
                <span>{event.mode}</span>
            </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border">
          <button 
              onClick={() => onView(event)} 
              className="w-full text-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
          >
              View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
