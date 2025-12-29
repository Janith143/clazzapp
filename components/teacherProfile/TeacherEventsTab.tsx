import React from 'react';
import { Teacher, TuitionInstitute, Event } from '../../types';
import EventCard from '../EventCard';
import { useNavigation } from '../../contexts/NavigationContext';
import { slugify } from '../../utils/slug';
import { PlusIcon } from '../Icons';

interface TeacherEventsTabProps {
    teacher: Teacher;
    events: { event: Event; organizer: TuitionInstitute | Teacher }[];
    canEdit?: boolean;
    onScheduleNew?: () => void;
    onEdit?: (event: Event) => void;
    onCancel?: (id: string) => void; // assuming delete/cancel logic
    onTogglePublish?: (id: string) => void;
}

const TeacherEventsTab: React.FC<TeacherEventsTabProps> = ({
    teacher,
    events,
    canEdit = false,
    onScheduleNew,
    onEdit,
    onCancel,
    onTogglePublish
}) => {
    const { handleNavigate } = useNavigation();

    return (
        <div className="space-y-6">
            {canEdit && onScheduleNew && (
                <div className="flex justify-end">
                    <button
                        onClick={onScheduleNew}
                        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>Schedule New Event</span>
                    </button>
                </div>
            )}

            {events.length === 0 ? (
                <div className="text-center py-16 text-light-subtle dark:text-dark-subtle">
                    <p className="text-lg font-semibold">No upcoming events</p>
                    <p>{teacher.name} has no scheduled events.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(({ event, organizer }) => (
                        <EventCard
                            key={event.id}
                            event={event}
                            organizer={organizer}
                            onView={(e) => handleNavigate({ name: 'event_detail_slug', slug: slugify(e.title) })}
                            // Only allow editing if it's the teacher's own event
                            onEdit={canEdit && event.organizerId === teacher.id ? onEdit : undefined}
                            onDelete={canEdit && event.organizerId === teacher.id && onCancel ? (id) => onCancel(id) : undefined}
                            onTogglePublish={canEdit && event.organizerId === teacher.id && onTogglePublish ? (id) => onTogglePublish(id) : undefined}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default TeacherEventsTab;
