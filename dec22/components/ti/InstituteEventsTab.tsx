import React from 'react';
// FIX: Alias Event to InstituteEvent to avoid name collision with native DOM Event type.
import { TuitionInstitute, Event as InstituteEvent } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useNavigation } from '../../contexts/NavigationContext';
import TIEventCard from './TIEventCard';
import { PlusIcon } from '../Icons';

interface InstituteEventsTabProps {
    institute: TuitionInstitute;
    onScheduleNew: () => void;
    onEdit: (event: InstituteEvent) => void;
    onCancel: (eventId: string) => void;
    onTogglePublish: (eventId: string) => void;
}

const InstituteEventsTab: React.FC<InstituteEventsTabProps> = ({ institute, onScheduleNew, onEdit, onCancel, onTogglePublish }) => {
    const { sales } = useData();
    const { handleNavigate } = useNavigation();

    const enrollmentCounts = React.useMemo(() => {
        const counts: { [key: string]: number } = {};
        sales.filter(s => s.instituteId === institute.id && s.status === 'completed' && s.itemType === 'event').forEach(sale => {
            const key = `event_${sale.itemId}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }, [sales, institute.id]);
    
    const eventsToShow = institute.events?.filter(e => !e.isDeleted) || [];

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button onClick={onScheduleNew} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors">
                    <PlusIcon className="h-4 h-4" />
                    <span>Schedule New Event</span>
                </button>
            </div>
            {eventsToShow.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {eventsToShow.map(event => (
                        <TIEventCard 
                            key={event.id} 
                            event={event} 
                            organizer={institute}
                            enrollmentCount={enrollmentCounts[`event_${event.id}`] || 0}
                            onView={(e) => handleNavigate({name: 'event_detail', eventId: e.id})} 
                            onEdit={onEdit} 
                            onCancel={onCancel} 
                            onTogglePublish={onTogglePublish}
                        />
                    ))}
                </div>
            ) : (
                 <div className="text-center py-16 text-light-subtle dark:text-dark-subtle">
                    <p className="text-xl font-semibold">No events scheduled yet.</p>
                    <p>Click "Schedule New Event" to get started.</p>
                </div>
            )}
        </div>
    );
};

export default InstituteEventsTab;