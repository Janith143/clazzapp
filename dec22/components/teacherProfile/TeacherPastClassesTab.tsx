import React, { useMemo, useState } from 'react';
import { Teacher, IndividualClass, Sale, User, ClassGrading } from '../../types.ts';
import { useData } from '../../contexts/DataContext.tsx';
import { VideoCameraIcon, PencilIcon, ClipboardListIcon } from '../Icons.tsx';
import AddRecordingModal from '../AddRecordingModal.tsx';
import GradingModal from '../GradingModal.tsx';
import HomeworkViewerModal from './HomeworkViewerModal.tsx';

interface TeacherPastClassesTabProps {
    teacher: Teacher;
    sales: Sale[];
}

const TeacherPastClassesTab: React.FC<TeacherPastClassesTabProps> = ({ teacher, sales }) => {
    const { handleSaveClassRecording, handleSaveGrading, users } = useData();
    const [recordingModalState, setRecordingModalState] = useState<{
        isOpen: boolean;
        classInfo: IndividualClass | null;
        instanceDate: string | null;
    }>({ isOpen: false, classInfo: null, instanceDate: null });

    const [gradingModalState, setGradingModalState] = useState<{
        isOpen: boolean;
        classInfo: IndividualClass | null;
        instanceDate: string | null;
        enrolledStudents: User[];
    }>({ isOpen: false, classInfo: null, instanceDate: null, enrolledStudents: [] });

    const [homeworkModalState, setHomeworkModalState] = useState<{
        isOpen: boolean;
        classInfo: IndividualClass | null;
        instanceDate: string | null;
        enrolledStudents: User[];
    }>({ isOpen: false, classInfo: null, instanceDate: null, enrolledStudents: [] });

    const pastClassInstancesWithData = useMemo(() => {
        const instances: { classInfo: IndividualClass; instanceDate: string }[] = [];
        const now = new Date();

        const toYYYYMMDD = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        teacher.individualClasses.forEach(cls => {
            if (cls.status === 'canceled' || cls.isDeleted) return;

            if (cls.recurrence === 'weekly') {
                let currentDate = new Date(cls.date + 'T00:00:00');
                const seriesEndDate = cls.endDate ? new Date(cls.endDate + 'T23:59:59') : now;

                const [endHours, endMinutes] = cls.endTime.split(':').map(Number);

                while (currentDate <= seriesEndDate) {
                    const instanceEndDateTime = new Date(currentDate);
                    instanceEndDateTime.setHours(endHours, endMinutes, 59, 999);

                    if (instanceEndDateTime < now) {
                        instances.push({ 
                            classInfo: cls, 
                            instanceDate: toYYYYMMDD(currentDate)
                        });
                    }
                    
                    if (currentDate > now && currentDate > seriesEndDate) break;
                    
                    currentDate.setDate(currentDate.getDate() + 7);
                }
            } else { // One-time class
                const endDateTime = new Date(`${cls.date}T${cls.endTime}`);
                if (endDateTime < now) {
                    instances.push({ 
                        classInfo: cls, 
                        instanceDate: cls.date 
                    });
                }
            }
        });

        const sortedInstances = instances.sort((a, b) => new Date(b.instanceDate).getTime() - new Date(a.instanceDate).getTime());
        
        return sortedInstances.map(instance => {
            const relevantSales = sales.filter(s =>
                s.itemId === instance.classInfo.id &&
                s.itemType === 'class' &&
                s.status === 'completed'
            );

            const enrollmentCount = relevantSales.filter(sale => {
                const saleDate = new Date(sale.saleDate);
                saleDate.setHours(0, 0, 0, 0);
                
                const instanceDateObj = new Date(instance.instanceDate + 'T00:00:00');
                return instanceDateObj >= saleDate;
            }).length;

            return { ...instance, enrollmentCount };
        }).filter(instance => instance.enrollmentCount > 0);
    }, [teacher.individualClasses, sales]);


    const handleOpenRecordingModal = (classInfo: IndividualClass, instanceDate: string) => {
        setRecordingModalState({ isOpen: true, classInfo, instanceDate });
    };

    const handleCloseRecordingModal = () => {
        setRecordingModalState({ isOpen: false, classInfo: null, instanceDate: null });
    };
    
    const handleOpenGradingModal = (classInfo: IndividualClass, instanceDate: string) => {
        const enrolledStudentIds = new Set(sales
            .filter(s =>
                s.itemId === classInfo.id &&
                s.itemType === 'class' &&
                s.status === 'completed' &&
                new Date(s.saleDate) <= new Date(instanceDate)
            )
            .map(s => s.studentId)
        );
        const enrolledStudents = users.filter(u => enrolledStudentIds.has(u.id));
        setGradingModalState({ isOpen: true, classInfo, instanceDate, enrolledStudents });
    };

    const handleCloseGradingModal = () => {
        setGradingModalState({ isOpen: false, classInfo: null, instanceDate: null, enrolledStudents: [] });
    };

    const handleOpenHomeworkModal = (classInfo: IndividualClass, instanceDate: string) => {
        const enrolledStudentIds = new Set(sales
            .filter(s =>
                s.itemId === classInfo.id &&
                s.itemType === 'class' &&
                s.status === 'completed' &&
                new Date(s.saleDate) <= new Date(instanceDate)
            )
            .map(s => s.studentId)
        );
        const enrolledStudents = users.filter(u => enrolledStudentIds.has(u.id));
        setHomeworkModalState({ isOpen: true, classInfo, instanceDate, enrolledStudents });
    };

    const handleCloseHomeworkModal = () => {
        setHomeworkModalState({ isOpen: false, classInfo: null, instanceDate: null, enrolledStudents: [] });
    };

    const handleSaveRecording = (classId: number, instanceDate: string, urls: string[]) => {
        handleSaveClassRecording(teacher.id, classId, instanceDate, urls);
        handleCloseRecordingModal();
    };

    const handleSaveGrades = (classId: number, instanceDate: string, grades: ClassGrading) => {
        handleSaveGrading(teacher.id, classId, instanceDate, grades);
        handleCloseGradingModal();
    };


    if (pastClassInstancesWithData.length === 0) {
        return (
            <div className="text-center py-16 text-light-subtle dark:text-dark-subtle">
                <p>You have no past classes with enrolled students.</p>
                <p className="text-sm">Once a class session with students is finished, it will appear here.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
             <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 rounded-r-md text-yellow-800 dark:text-yellow-200">
                <h4 className="font-bold">Manage Past Classes</h4>
                <p className="text-sm mt-2">
                    This section lists all your finished class sessions. It is highly recommended to upload a recording for each session. You can also add grades and view homework submissions for your students here.
                </p>
            </div>
            <div className="space-y-4">
                {pastClassInstancesWithData.map(({ classInfo, instanceDate, enrollmentCount }) => {
                    const recordingUrls = classInfo.recordingUrls?.[instanceDate];
                    const hasRecordings = recordingUrls && recordingUrls.length > 0;
                    const grades = classInfo.grades?.[instanceDate];
                    const hasStudents = enrollmentCount > 0;

                    return (
                        <div key={`${classInfo.id}-${instanceDate}`} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-light-surface dark:bg-dark-surface rounded-lg shadow-sm border border-light-border dark:border-dark-border">
                            <div>
                                <p className="font-bold text-light-text dark:text-dark-text">{classInfo.title}</p>
                                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                                    Session Date: {new Date(instanceDate).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="mt-4 sm:mt-0 w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                                {hasStudents ? (
                                    <>
                                        <button 
                                            onClick={() => handleOpenRecordingModal(classInfo, instanceDate)}
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/10 transition-colors"
                                        >
                                            <VideoCameraIcon className="w-5 h-5"/>
                                            {hasRecordings ? `Edit Recordings (${recordingUrls.length})` : 'Add Recording'}
                                        </button>
                                        <button 
                                            onClick={() => handleOpenHomeworkModal(classInfo, instanceDate)}
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
                                        >
                                            <ClipboardListIcon className="w-4 h-4"/>
                                            View Homework
                                        </button>
                                        <button 
                                            onClick={() => handleOpenGradingModal(classInfo, instanceDate)}
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                                        >
                                            <PencilIcon className="w-4 h-4"/>
                                            {grades ? 'Edit Grades' : 'Add Grades'}
                                        </button>
                                    </>
                                ) : (
                                    <div className="w-full sm:w-auto text-center px-4 py-2 text-sm font-medium text-light-subtle dark:text-dark-subtle bg-light-background dark:bg-dark-background rounded-md">
                                        No Students Enrolled
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
             <AddRecordingModal 
                isOpen={recordingModalState.isOpen}
                onClose={handleCloseRecordingModal}
                onSave={handleSaveRecording}
                classInfo={recordingModalState.classInfo}
                instanceDate={recordingModalState.instanceDate}
            />
             <GradingModal 
                isOpen={gradingModalState.isOpen}
                onClose={handleCloseGradingModal}
                onSave={handleSaveGrades}
                classInfo={gradingModalState.classInfo}
                instanceDate={gradingModalState.instanceDate}
                enrolledStudents={gradingModalState.enrolledStudents}
            />
            <HomeworkViewerModal
                isOpen={homeworkModalState.isOpen}
                onClose={handleCloseHomeworkModal}
                classInfo={homeworkModalState.classInfo}
                instanceDate={homeworkModalState.instanceDate}
                enrolledStudents={homeworkModalState.enrolledStudents}
            />
        </div>
    );
};

export default TeacherPastClassesTab;