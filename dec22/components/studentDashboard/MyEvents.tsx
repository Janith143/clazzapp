import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useNavigation } from '../../contexts/NavigationContext';
import EventCard from '../EventCard.tsx';
import { User } from '../../types';

interface MyEventsProps {
    user: User;
}

const MyEvents: React.FC<MyEventsProps> = ({ user }) => {
    const { sales, tuitionInstitutes } = useData();
    const { handleNavigate } = useNavigation();

    const enrolledEvents = useMemo(() => {
        if (!user) return [];

        const userSales = sales.filter(s => s.studentId === user.id && s.itemType === 'event' && s.status === 'completed');
        
        return userSales.map(sale => {
            const organizer = tuitionInstitutes.find(ti => ti.id === sale.instituteId);
            return { event: sale.itemSnapshot, organizer };
        }).filter(item => item.organizer); // Only show if organizer data is available
    }, [user, sales, tuitionInstitutes]);

    return enrolledEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledEvents.map(({ event, organizer }) => (
                <EventCard 
                    key={event.id} 
                    event={event as any} 
                    organizer={organizer!} 
                    onView={(e) => handleNavigate({ name: 'event_detail', eventId: e.id })} 
                />
            ))}
        </div>
    ) : (
        <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">This student hasn't registered for any events yet.</p>
    );
};

export default MyEvents;