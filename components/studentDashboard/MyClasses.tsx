import React, { useMemo } from 'react';
import { IndividualClass, Teacher, User } from '../../types.ts';
import { useData } from '../../contexts/DataContext.tsx';
import { useNavigation } from '../../contexts/NavigationContext.tsx';
import ClassCard from '../ClassCard.tsx';
import { getDynamicClassStatus, getNextSessionDateTime } from '../../utils.ts';

interface MyClassesProps {
    user: User | null;
    isOwnerView?: boolean;
    filter?: 'all' | 'upcoming';
}

const MyClasses: React.FC<MyClassesProps> = ({ user, isOwnerView = false, filter = 'all' }) => {
    const { sales, teachers } = useData();
    const { handleNavigate } = useNavigation();

    const enrolledClasses = useMemo(() => {
        if (!user) {
            console.warn("MyClasses component rendered without a user prop.");
            return [];
        }

        const userSales = sales.filter(s => s.studentId === user.id && s.itemType === 'class');
        
        const classes: { classInfo: IndividualClass; teacher: Teacher }[] = [];

        userSales.forEach(sale => {
            const teacher = teachers.find(t => t.id === sale.teacherId);
            if (!teacher) return;

            if (sale.status === 'completed') {
                const liveClass = teacher.individualClasses.find(c => c.id === sale.itemId);
                if (liveClass) {
                    classes.push({ classInfo: liveClass, teacher });
                } else {
                    classes.push({ classInfo: { ...(sale.itemSnapshot as IndividualClass), isDeleted: true }, teacher });
                }
            } else if (sale.status === 'refunded') {
                classes.push({ classInfo: { ...(sale.itemSnapshot as IndividualClass), status: 'canceled' }, teacher });
            }
        });
        
        return Array.from(new Map(classes.reverse().map(item => [item.classInfo.id, item])).values()).reverse();
    }, [user, sales, teachers]);
    
    const displayedClasses = useMemo(() => {
        let classesToDisplay = [...enrolledClasses];

        if (filter === 'upcoming') {
            classesToDisplay = classesToDisplay.filter(({ classInfo }) => {
                const status = getDynamicClassStatus(classInfo);
                return status === 'scheduled' || status === 'live';
            });
            classesToDisplay.sort((a, b) => {
                const dateA = getNextSessionDateTime(a.classInfo)?.getTime() || Infinity;
                const dateB = getNextSessionDateTime(b.classInfo)?.getTime() || Infinity;
                return dateA - dateB;
            });
        }
        return classesToDisplay;
    }, [enrolledClasses, filter]);

    const emptyMessage = isOwnerView
        ? filter === 'upcoming'
            ? "You have no upcoming classes scheduled."
            : "You haven't enrolled in any classes yet."
        : "This student has no classes matching the filter.";

    return (
        <div>
            {filter === 'upcoming' && (
                <div className="mb-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <h3 className="font-bold text-lg text-primary">Showing Upcoming &amp; Live Classes</h3>
                    <p className="text-sm text-primary/80">Sorted by the next session date.</p>
                </div>
            )}
            {displayedClasses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedClasses.map(({ classInfo, teacher }) => (
                        <ClassCard 
                            key={classInfo.id} 
                            classInfo={classInfo} 
                            teacher={teacher} 
                            viewMode="public" 
                            isOwnerView={true} 
                            onView={() => handleNavigate({name: 'class_detail', classId: classInfo.id})} 
                        />
                    ))}
                </div>
            ) : (
                <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">{emptyMessage}</p>
            )}
        </div>
    );
};

export default MyClasses;