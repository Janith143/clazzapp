import React, { useMemo, useState, useRef } from 'react';
import { IndividualClass, Teacher, User, Course, Lecture } from '../../types.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useData } from '../../contexts/DataContext.tsx';
import { useUI } from '../../contexts/UIContext.tsx';
import { VideoCameraIcon, PencilIcon } from '../Icons.tsx';
import HomeworkSubmissionModal from './HomeworkSubmissionModal.tsx';

interface MyPastClassesProps {
    user: User | null;
    isOwnerView?: boolean;
}

const MyPastClasses: React.FC<MyPastClassesProps> = ({ user, isOwnerView = false }) => {
    const { sales, teachers, handleSaveHomeworkSubmission } = useData();
    const { setVideoPlayerState } = useUI();
    const [submissionModalState, setSubmissionModalState] = useState<{
        isOpen: boolean;
        classInfo: IndividualClass | null;
        instanceDate: string | null;
    }>({ isOpen: false, classInfo: null, instanceDate: null });
    
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);


    const pastClassInstances = useMemo(() => {
        if (!user) {
            console.warn("MyPastClasses component rendered without a user prop.");
            return [];
        }

        const userClassSales = sales.filter(s => 
            s.studentId === user.id && 
            s.itemType === 'class' && 
            s.status === 'completed'
        );
        
        const instances: { classInfo: IndividualClass; teacher: Teacher, instanceDate: string }[] = [];
        const now = new Date();

        const toYYYYMMDD = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        userClassSales.forEach(sale => {
            const teacher = teachers.find(t => t.id === sale.teacherId);
            if (!teacher) return;

            let classData: IndividualClass;
            const liveClass = teacher.individualClasses.find(c => c.id === sale.itemId);

            if (liveClass) {
                classData = liveClass;
            } else if (sale.itemSnapshot && 'recurrence' in sale.itemSnapshot) {
                classData = { ...(sale.itemSnapshot as IndividualClass), isDeleted: true };
            } else {
                return;
            }

            if (classData.recurrence === 'weekly') {
                let currentDate = new Date(classData.date + 'T00:00:00');
                const seriesEndDate = classData.endDate ? new Date(classData.endDate + 'T23:59:59') : now;

                const [endHours, endMinutes] = classData.endTime.split(':').map(Number);

                while (currentDate <= seriesEndDate) {
                    const instanceEndDateTime = new Date(currentDate);
                    instanceEndDateTime.setHours(endHours, endMinutes, 59, 999);

                    if (instanceEndDateTime < now) {
                        instances.push({ 
                            classInfo: classData, 
                            teacher: teacher, 
                            instanceDate: toYYYYMMDD(currentDate)
                        });
                    }
                    if (currentDate > now && currentDate > seriesEndDate) break;

                    currentDate.setDate(currentDate.getDate() + 7);
                }
            } else { // One-time class
                const endDateTime = new Date(`${classData.date}T${classData.endTime}`);
                if (endDateTime < now) {
                    instances.push({ 
                        classInfo: classData, 
                        teacher: teacher, 
                        instanceDate: classData.date 
                    });
                }
            }
        });

        // Sort all instances from all class series by date, descending
        return instances.sort((a, b) => new Date(b.instanceDate).getTime() - new Date(a.instanceDate).getTime());

    }, [user, sales, teachers]);

    const handleWatchRecording = (recordingUrl: string, classInfo: IndividualClass, teacher: Teacher, instanceDate: string) => {
        const mockLecture: Lecture = {
            id: `rec_${classInfo.id}_${instanceDate}`,
            title: `Recording for ${classInfo.title}`,
            description: `Session from ${new Date(instanceDate).toLocaleDateString()}`,
            videoUrl: recordingUrl,
            durationMinutes: 0,
            isFreePreview: false,
        };
        
        const mockCourseShell: Course = {
            id: `cls_${classInfo.id}`,
            teacherId: teacher.id,
            title: classInfo.title,
            lectures: [mockLecture],
            description: classInfo.description,
            subject: classInfo.subject,
            coverImage: teacher.coverImages?.[0] || '',
            fee: classInfo.fee,
            currency: 'LKR',
            type: 'recorded',
            isPublished: classInfo.isPublished,
            ratings: [],
            adminApproval: 'approved',
        };

        setVideoPlayerState({
            isOpen: true,
            lecture: mockLecture,
            course: mockCourseShell,
            isEnrolled: true,
        });
    };

    const handleOpenSubmissionModal = (classInfo: IndividualClass, instanceDate: string) => {
        setSubmissionModalState({ isOpen: true, classInfo, instanceDate });
    };

    const handleCloseSubmissionModal = () => {
        setSubmissionModalState({ isOpen: false, classInfo: null, instanceDate: null });
    };

    const handleSaveSubmission = (classId: number, instanceDate: string, link: string) => {
        const classInfo = pastClassInstances.find(pci => pci.classInfo.id === classId)?.classInfo;
        if (classInfo) {
            handleSaveHomeworkSubmission(classInfo.teacherId, classId, instanceDate, link);
        }
        handleCloseSubmissionModal();
    };
    
     const toggleDropdown = (key: string) => {
        setOpenDropdown(prev => (prev === key ? null : key));
    };

    const emptyMessage = isOwnerView
        ? "You have no past classes with available recordings."
        : "This student has no past classes with available recordings.";

    if (pastClassInstances.length === 0) {
        return (
            <div className="text-center py-8 text-light-subtle dark:text-dark-subtle">
                <p>{emptyMessage}</p>
                <p className="text-sm">Recordings for finished classes will appear here once uploaded by the teacher.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {pastClassInstances.map(({ classInfo, teacher, instanceDate }, index) => {
                const recordingUrls = classInfo.recordingUrls?.[instanceDate];
                const existingSubmission = classInfo.homeworkSubmissions?.[instanceDate]?.find(s => s.studentId === user?.id);
                const dropdownKey = `${classInfo.id}-${instanceDate}`;

                return (
                    <div key={`${classInfo.id}-${instanceDate}-${index}`} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-light-surface dark:bg-dark-surface rounded-lg shadow-sm border border-light-border dark:border-dark-border">
                        <div className="flex items-center gap-4">
                            <img src={teacher.avatar} alt={teacher.name} className="w-12 h-12 rounded-full object-cover"/>
                            <div>
                                <p className="font-bold text-light-text dark:text-dark-text">{classInfo.title}</p>
                                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                                    Session Date: {new Date(instanceDate).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-light-subtle dark:text-dark-subtle">
                                    with {teacher.name}
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 sm:mt-0 w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                            <div className="relative">
                                {recordingUrls && recordingUrls.length > 0 ? (
                                    recordingUrls.length === 1 ? (
                                        <button 
                                            onClick={() => handleWatchRecording(recordingUrls[0], classInfo, teacher, instanceDate)}
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                                        >
                                            <VideoCameraIcon className="w-5 h-5"/>
                                            Watch Recording
                                        </button>
                                    ) : (
                                        <div>
                                            <button 
                                                onClick={() => toggleDropdown(dropdownKey)}
                                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                                            >
                                                <VideoCameraIcon className="w-5 h-5"/>
                                                Watch Recordings ({recordingUrls.length})
                                            </button>
                                            {openDropdown === dropdownKey && (
                                                <div className="absolute right-0 mt-2 w-48 bg-light-surface dark:bg-dark-surface rounded-md shadow-lg border border-light-border dark:border-dark-border z-10">
                                                    {recordingUrls.map((url, i) => (
                                                        <button key={i} onClick={() => handleWatchRecording(url, classInfo, teacher, instanceDate)} className="block w-full text-left px-4 py-2 text-sm text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border">
                                                            Recording Part {i+1}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                ) : (
                                    <div className="w-full sm:w-auto text-center px-4 py-2 text-sm font-medium text-light-subtle dark:text-dark-subtle bg-light-background dark:bg-dark-background rounded-md">
                                        Recording not available
                                    </div>
                                )}
                            </div>
                             <button
                                onClick={() => handleOpenSubmissionModal(classInfo, instanceDate)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border border-primary text-primary rounded-md hover:bg-primary/10 transition-colors"
                            >
                                <PencilIcon className="w-4 h-4" />
                                {existingSubmission ? 'Edit Submission' : 'Submit Homework'}
                            </button>
                        </div>
                    </div>
                );
            })}
             <HomeworkSubmissionModal
                isOpen={submissionModalState.isOpen}
                onClose={handleCloseSubmissionModal}
                onSave={handleSaveSubmission}
                classInfo={submissionModalState.classInfo}
                instanceDate={submissionModalState.instanceDate}
                existingSubmissionLink={
                    submissionModalState.classInfo?.homeworkSubmissions?.[submissionModalState.instanceDate!]?.find(s => s.studentId === user?.id)?.link
                }
            />
        </div>
    );
};

export default MyPastClasses;