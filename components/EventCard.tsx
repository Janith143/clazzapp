import React from 'react';
import { Event, TuitionInstitute } from '../types.ts';
import { ClockIcon, CalendarIcon, MapPinIcon, OnlineIcon, PencilIcon, TrashIcon, ShareIcon } from './Icons.tsx';
import { getDynamicEventStatus, getOptimizedImageUrl } from '../utils.ts';
import { slugify } from '../utils/slug.ts';


import { Teacher } from '../types';
import ShareModal from './ShareModal';
import { useState } from 'react';

interface EventCardProps {
  event: Event;
  organizer: TuitionInstitute | Teacher;
  onView: (event: Event) => void;
  onEdit?: (event: Event) => void;
  onDelete?: (id: string) => void;
  onTogglePublish?: (id: string) => void;
}

type DynamicStatus = 'live' | 'scheduled' | 'finished' | 'canceled';

const EventStatusBadge: React.FC<{ status: DynamicStatus }> = ({ status }) => {
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

const EventCard: React.FC<EventCardProps> = ({ event, organizer, onView, onEdit, onDelete, onTogglePublish }) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const currencyFormatter = new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
  });

  const getModeIcon = (mode: Event['mode']) => {
    switch (mode) {
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

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Generate slug for sharing
    // If logic is client-side only, we might just share the current URL logic or construct it.
    // Based on previous patterns, we construct the URL manually.
    // Note: We need slugify here.
    // But we can't import it easily inside the component body if not imported at top.
    // I'll add the import in a separate edit or assume it's available? 
    // Wait, I can't import inside function. 
    // I will add import in the second replacement chunk for this file.
    // For now, let's just use window.location.origin + '/events/' + slugify(event.title)
    // I need to update imports first.
  };

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
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsShareModalOpen(true);
          }}
          className="absolute top-2 left-2 p-2 bg-white/80 dark:bg-black/50 rounded-full hover:bg-white dark:hover:bg-black/70 transition-colors text-gray-700 dark:text-gray-200"
          title="Share"
        >
          <ShareIcon className="w-5 h-5" />
        </button>
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

        <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border flex items-center gap-2">
          {/* View Details Button - Always Primary */}
          <button
            onClick={() => onView(event)}
            className="flex-1 text-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors shadow-sm"
          >
            View Details
          </button>

          {/* Management Actions - Only visible to owners */}
          {(onEdit || onTogglePublish || onDelete) && (
            <div className="flex items-center gap-1 border-l border-light-border dark:border-dark-border pl-2 border-opacity-50">

              {/* Toggle Publish - Compact status indicator/button */}
              {onTogglePublish && (
                <button
                  onClick={(e) => { e.stopPropagation(); onTogglePublish(event.id); }}
                  title={event.isPublished ? 'Click to Unpublish' : 'Click to Publish'}
                  className={`p-2 rounded-md transition-colors ${event.isPublished ? 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30' : 'text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/30'}`}
                >
                  {/* Inline Eye Icon */}
                  {event.isPublished ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-5.975.75.75 0 000-.589A10.004 10.004 0 0010 3c-1.93 0-3.71.551-5.23 1.503L3.28 2.22zM8.941 6.819A4.01 4.01 0 0110 6c1.886 0 3.475 1.294 3.882 3.033l-4.941-2.214zM4.77 10.985A10.015 10.015 0 0010 17c1.47 0 2.85-.308 4.095-.86L12.59 14.64a4.002 4.002 0 01-5.717-5.717l-2.103-2.103a8.96 8.96 0 00.001 4.165z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )}

              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(event); }}
                  className="p-2 text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border rounded-md transition-colors"
                  title="Edit Event"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
              )}

              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                  title="Delete Event"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>

      </div>
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={`${window.location.origin}/events/${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}`}
        title={event.title}
        description={`Check out this event by ${organizer.name}`}
      />
    </div>
  );
};

export default EventCard;
