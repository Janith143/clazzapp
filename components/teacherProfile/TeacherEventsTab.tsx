import React from 'react';
import { Teacher, TuitionInstitute } from '../../types.ts';
import EventCard from '../EventCard.tsx';
import { useNavigation } from '../../contexts/NavigationContext.tsx';

interface TeacherEventsTabProps {
    teacher: Teacher;
    events: { event: any; organizer: TuitionInstitute }[];
}

const TeacherEventsTab: React.FC<TeacherEventsTabProps> = ({ teacher, events }) => {
    const { handleNavigate } = useNavigation();

    if (events.length === 0) {
        return (
            <div className="text-center py-16 text-light-subtle dark:text-dark-subtle">
                <p className="text-lg font-semibold">No upcoming events</p>
                <p>{teacher.name} is not participating in any scheduled events at the moment.</p>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(({ event, organizer }) => (
              <EventCard 
                key={event.id} 
                event={event} 
                organizer={organizer} 
                onView={(e) => handleNavigate({ name: 'event_detail', eventId: e.id })} 
              />
            ))}
        </div>
    );
};

export default TeacherEventsTab;
