import React, { useMemo } from 'react';
import { Teacher, IndividualClass, Quiz } from '../../types.ts';
import { useData } from '../../contexts/DataContext.tsx';
import { useNavigation } from '../../contexts/NavigationContext.tsx';
import ClassCard from '../ClassCard.tsx';
import { PlusIcon } from '../Icons.tsx';
import { GoogleMeetIcon, GoogleIcon, CheckCircleIcon } from '../Icons.tsx';

interface TeacherClassesTabProps {
    teacher: Teacher;
    canEdit: boolean;
    onScheduleNew: () => void;
    onScheduleFreeSlot: () => void;
    onScheduleGoogleMeet: () => void;
    onEdit: (classInfo: IndividualClass) => void;
    onDelete: (classId: number, enrollmentCount: number) => void;
}

const TeacherClassesTab: React.FC<TeacherClassesTabProps> = ({ teacher, canEdit, onScheduleNew, onScheduleFreeSlot, onScheduleGoogleMeet, onEdit, onDelete }) => {
    const { sales, handleTogglePublishState } = useData();
    const { handleNavigate } = useNavigation();

    const enrollmentCounts = useMemo(() => {
        const counts: { [key: string]: number } = {};
        const classMap = new Map(teacher.individualClasses.map(c => [c.id, c]));

        sales
            .filter(s => s.teacherId === teacher.id && s.status === 'completed' && s.itemType === 'class')
            .forEach(sale => {
                const liveClass = classMap.get(sale.itemId as number);
                if (liveClass && sale.itemSnapshot && 'recurrence' in sale.itemSnapshot) {
                    const saleInstanceId = (sale.itemSnapshot as IndividualClass).instanceStartDate;
                    const liveInstanceId = (liveClass as IndividualClass).instanceStartDate;

                    // This check correctly handles undefined for legacy data, as undefined === undefined.
                    if (saleInstanceId === liveInstanceId) {
                        const key = `class_${sale.itemId}`;
                        counts[key] = (counts[key] || 0) + 1;
                    }
                }
            });
        return counts;
    }, [sales, teacher.id, teacher.individualClasses]);
    
    const classesToShow = useMemo(() => {
        return canEdit 
            ? teacher.individualClasses.filter(c => !c.isDeleted) 
            : teacher.individualClasses.filter(c => c.isPublished && c.status !== 'finished' && c.status !== 'canceled' && !c.isDeleted);
    }, [canEdit, teacher.individualClasses]);

    const handleConnectGoogle = () => {
        // This URL should point to your deployed `googleAuthRedirect` Cloud Function
        const functionUrl = `https://google-meet-handler-980531128265.us-central1.run.app/googleAuthRedirect?teacherId=${teacher.id}`;
        window.location.href = functionUrl;
    };

    return (
        <div>
            {canEdit && (
                <div className="space-y-4 mb-6">
                    <div className="flex flex-wrap gap-4">
                        <button onClick={onScheduleNew} className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors">
                            <PlusIcon className="h-4 w-4" />
                            <span>Schedule Group Class</span>
                        </button>
                        <button onClick={onScheduleGoogleMeet} disabled={!teacher.googleRefreshToken} className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={!teacher.googleRefreshToken ? "Connect your Google Account first" : "Schedule a class with an auto-generated Google Meet link"}>
                            <GoogleMeetIcon className="h-4 w-4" />
                            <span>Schedule with G-Meet</span>
                        </button>
                        <button onClick={onScheduleFreeSlot} className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                            <PlusIcon className="h-4 w-4" />
                            <span>Schedule 1-on-1 Slot</span>
                        </button>
                    </div>
                     {!teacher.googleRefreshToken && (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 rounded-r-md flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                To automatically generate Google Meet links, you need to connect your Google account.
                            </p>
                            <button onClick={handleConnectGoogle} className="flex-shrink-0 flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-700 transition-colors">
                                <GoogleIcon className="w-5 h-5" />
                                <span>Connect Google Account</span>
                            </button>
                        </div>
                    )}
                    {teacher.googleRefreshToken && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-400 rounded-r-md flex items-center gap-2">
                           <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400"/>
                           <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                                Your Google Account is connected. You can now schedule classes with Google Meet.
                           </p>
                        </div>
                    )}
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classesToShow.map(classInfo => (
                <ClassCard 
                    key={classInfo.id} 
                    classInfo={classInfo} 
                    teacher={teacher} 
                    viewMode={canEdit ? "teacher" : "public"} 
                    enrollmentCount={enrollmentCounts[`class_${classInfo.id}`] || 0} 
                    onView={(c) => handleNavigate({name: 'class_detail', classId: c.id})} 
                    onEdit={onEdit} 
                    onDelete={onDelete}
                    onTogglePublish={(id) => handleTogglePublishState(teacher.id, id, 'class')} 
                />
                ))}
            </div>
        </div>
    );
};

export default TeacherClassesTab;
