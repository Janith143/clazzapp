import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNavigation } from '../contexts/NavigationContext';
import { IndividualClass, Teacher, Sale, TuitionInstitute, User, Event as InstituteEvent } from '../types';
import { BanknotesIcon, VideoCameraIcon, UserCircleIcon, ClipboardListIcon, PlusIcon, ChevronLeftIcon, SaveIcon, UserPlusIcon, TrashIcon, PencilIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon } from '../components/Icons';
import Modal from '../components/Modal';
import TIScheduleClassModal from '../components/ti/TIScheduleClassModal';
import TIScheduleEventModal from '../components/ti/TIScheduleEventModal';
import InstituteEventsTab from '../components/ti/InstituteEventsTab';
import ClassRecordingsModal from '../components/ti/ClassRecordingsModal'; // Import the new modal
import ClassCard from '../components/ClassCard';
import ConfirmationModal from '../components/ConfirmationModal';
import AttendanceSummaryTable from '../components/ti/AttendanceSummaryTable';
import TIManagedTeacherModal from '../components/ti/TIManagedTeacherModal';
import TIAddExistingTeacherModal from '../components/ti/TIAddExistingTeacherModal';
import StudentAttendanceModal from '../components/ti/StudentAttendanceModal';
import SearchableSelect from '../components/SearchableSelect';
import FormInput from '../components/FormInput';
import { sriLankanDistricts, sriLankanTownsByDistrict } from '../data/mockData';
import { useUI } from '../contexts/UIContext';
import { getOptimizedImageUrl } from '../utils';

const EventIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M12 12.75h.008v.008H12v-.008z" />
    </svg>
);


const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-light-surface dark:bg-dark-surface p-5 rounded-lg shadow-md border border-light-border dark:border-dark-border">
        <div className="flex items-center">
            <div className="p-3 bg-primary/10 text-primary rounded-lg mr-4">{icon}</div>
            <div>
                <p className="text-sm font-medium text-light-subtle dark:text-dark-subtle">{title}</p>
                <p className="text-3xl font-bold text-light-text dark:text-dark-text">{value}</p>
            </div>
        </div>
    </div>
);

const InstituteProfileSettings: React.FC<{ institute: TuitionInstitute }> = ({ institute }) => {
    const { updateTuitionInstitute } = useData();
    const { addToast } = useUI();
    const [commission, setCommission] = useState(institute.commissionRate.toString());
    const [address, setAddress] = useState(institute.address || { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'Sri Lanka' });
    const [isSaving, setIsSaving] = useState(false);

    const townOptions = useMemo(() => {
        if (!address.state) return [];
        const towns = sriLankanTownsByDistrict[address.state] || [];
        return [{ value: '', label: 'Select a town' }, ...towns.map(t => ({ value: t, label: t }))];
    }, [address.state]);

    const handleSave = async () => {
        const newRate = parseFloat(commission);

        if (isNaN(newRate)) {
            addToast("Please enter a valid number for commission rate.", "error");
            return;
        }
        if (newRate < institute.platformMarkupRate) {
            addToast(`Your class commission rate must be at least ${institute.platformMarkupRate}% to cover platform fees.`, "error");
            return;
        }
        if (!address.state || !address.city || !address.line1) {
            addToast("Please fill in the complete address (Line 1, District, Town).", "error");
            return;
        }

        setIsSaving(true);
        try {
            await updateTuitionInstitute(institute.id, {
                commissionRate: newRate,
                address: address
            });
            addToast("Settings updated successfully!", "success");
        } catch (e) {
            addToast("Failed to update settings.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md max-w-lg mx-auto">
            <h2 className="text-xl font-bold mb-4">Institute Settings</h2>
            <div className="space-y-6">
                <div>
                    <h3 className="text-md font-semibold mb-3 border-b border-light-border dark:border-dark-border pb-2">Location Details</h3>
                    <div className="space-y-4">
                        <FormInput
                            label="Street Address (Line 1)"
                            name="line1"
                            value={address.line1 || ''}
                            onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                            placeholder="No 123, Main Street"
                        />
                        <FormInput
                            label="Address Line 2 (Optional)"
                            name="line2"
                            value={address.line2 || ''}
                            onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                            placeholder="Building Name, Floor, etc."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SearchableSelect
                                label="District"
                                options={sriLankanDistricts.map(d => ({ value: d, label: d }))}
                                value={address.state || ''}
                                onChange={(val) => setAddress({ ...address, state: val, city: '' })} // Reset town on district change
                                placeholder="Select District"
                            />
                            <SearchableSelect
                                label="Town"
                                options={townOptions}
                                value={address.city || ''}
                                onChange={(val) => setAddress({ ...address, city: val })}
                                placeholder="Select Town"
                                disabled={!address.state}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-md font-semibold mb-3 border-b border-light-border dark:border-dark-border pb-2">Financial Settings</h3>
                    <label htmlFor="commissionRate" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                        Your Revenue % (for Classes)
                    </label>
                    <div className="flex items-center">
                        <input
                            id="commissionRate"
                            type="number"
                            value={commission}
                            onChange={(e) => setCommission(e.target.value)}
                            min={institute.platformMarkupRate}
                            step="0.5"
                            className="w-full px-3 py-2 border border-light-border dark:border-dark-border placeholder-light-subtle dark:placeholder-dark-subtle text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                        <span className="ml-2 text-lg font-medium">%</span>
                    </div>
                    <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">
                        Your earnings from platform class sales. Platform markup is {institute.platformMarkupRate}%.
                    </p>
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || (commission === institute.commissionRate.toString())}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark disabled:opacity-50"
                    >
                        <SaveIcon className="w-4 h-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface TuitionInstituteDashboardProps {
    instituteId?: string;
    isAdminView?: boolean;
}

const TuitionInstituteDashboard: React.FC<TuitionInstituteDashboardProps> = ({ instituteId, isAdminView = false }) => {
    const { currentUser } = useAuth();
    const { tuitionInstitutes, teachers, sales, users, handleSaveClass, handleCancelItem, handleTogglePublishState, handleResetTeacherBalance, processMonthlyPayouts, handleSaveEvent, handleCancelEvent, handleToggleEventPublishState, addManagedTeacher, saveManagedTeacher, deleteManagedTeacher, toggleTeacherPublishState, updateTuitionInstitute, markAttendance, finishWeeklyClassSession, requestWithdrawal } = useData();
    const { handleNavigate } = useNavigation();
    const { addToast } = useUI();

    const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'events' | 'attendance' | 'earnings' | 'teachers' | 'profile'>('overview');

    // Teacher Modal State
    const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
    const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
    const [isAddExistingModalOpen, setIsAddExistingModalOpen] = useState(false);
    const [editingCommission, setEditingCommission] = useState<string | null>(null);
    const [tempCommission, setTempCommission] = useState<string>('');
    const [isAddChoiceModalOpen, setIsAddChoiceModalOpen] = useState(false);

    // Manual Attendance State
    const [manualStudentId, setManualStudentId] = useState('');
    const [foundStudent, setFoundStudent] = useState<User | null>(null);

    // Earnings Report State
    const [selectedReportClass, setSelectedReportClass] = useState<string>('all');

    // Class Modal State
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [classToEdit, setClassToEdit] = useState<IndividualClass | null>(null);
    const [itemToCancel, setItemToCancel] = useState<{ id: number | string; type: 'class' | 'event' } | null>(null);
    const [selectedClassForRecordings, setSelectedClassForRecordings] = useState<IndividualClass | null>(null);
    const [isRecordingsModalOpen, setIsRecordingsModalOpen] = useState(false);

    // Event Modal State
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<InstituteEvent | null>(null);

    const [selectedClassForAttendance, setSelectedClassForAttendance] = useState<IndividualClass | null>(null);
    const [resetTarget, setResetTarget] = useState<{ teacherId: string; teacherName: string } | null>(null);
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
    const [withdrawalAmountInput, setWithdrawalAmountInput] = useState('');

    // Ref to prevent repeated payout checks on re-renders
    const hasCheckedPayouts = useRef(false);

    const institute = useMemo(() => {
        if (isAdminView && instituteId) {
            return tuitionInstitutes.find(ti => ti.id === instituteId);
        }
        return tuitionInstitutes.find(ti => ti.userId === currentUser?.id);
    }, [tuitionInstitutes, currentUser, isAdminView, instituteId]);

    useEffect(() => {
        if (institute?.id && !hasCheckedPayouts.current) {
            processMonthlyPayouts('institute', institute.id);
            hasCheckedPayouts.current = true;
        }
    }, [institute?.id, processMonthlyPayouts]);

    const instituteClasses = useMemo(() => {
        if (!institute) return [];
        return teachers
            .flatMap(t => t.individualClasses.filter(c => c.instituteId === institute.id).map(c => ({ ...c, teacher: t })))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [institute, teachers]);

    const enrollmentCounts = useMemo(() => {
        if (!institute) return {};
        const counts: { [key: string]: number } = {};
        sales.filter(s => s.instituteId === institute.id && s.status === 'completed' && s.itemType === 'class').forEach(sale => {
            const key = `class_${sale.itemId}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }, [sales, institute]);



    const handleSearchStudent = () => {
        if (!manualStudentId) { addToast("Please enter a Student ID", "error"); return; }
        const student = users.find(u => u.id === manualStudentId || (u as any).studentId === manualStudentId);
        if (student) {
            setFoundStudent(student);
            addToast("Student found", "success");
            // Automatically open text modal if preferred, or user clicks button
            // User requested "show a window". So opening it makes sense to streamline.
            // But let's keep it initiated by user action after seeing result to confirm identity?
            // "when marking attendance... show a window".
            // So, show the student preview, then a "Proceed" button? 
            // OR just open it immediately? 
            // "Enter student ID... show a window".
            // Let's open it immediately for speed.
            setIsAttendanceModalOpen(true);
        } else {
            setFoundStudent(null);
            addToast("Student not found", "error");
        }
    };

    const studentSale = useMemo(() => {
        if (!foundStudent || !selectedClassForAttendance) return null;
        return sales.find(s => s.studentId === foundStudent.id && s.itemId === selectedClassForAttendance.id && s.itemType === 'class' && s.status === 'completed');
    }, [sales, foundStudent, selectedClassForAttendance]);

    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

    // Removed handleManualMark as the modal handles it now.

    const saveLinkedCommission = async (teacherId: string) => {
        if (!institute) return;
        const rate = parseFloat(tempCommission);
        if (isNaN(rate) || rate < 0 || rate > 100) { addToast("Invalid commission rate", "error"); return; }

        const updatedCommissions = { ...(institute.linkedTeacherCommissions || {}), [teacherId]: rate };
        await updateTuitionInstitute(institute.id, { linkedTeacherCommissions: updatedCommissions });
        setEditingCommission(null);
        addToast("Commission updated", "success");
    };

    const handleSaveTeacher = async (formData: any) => {
        const dataToSave = teacherToEdit ? { ...formData, id: teacherToEdit.id } : formData;
        await saveManagedTeacher(dataToSave);
        setTeacherToEdit(null);
    };

    const handleEditTeacher = (teacher: Teacher) => {
        setTeacherToEdit(teacher);
        setIsTeacherModalOpen(true);
    };

    const handleDeleteTeacher = async (teacherId: string) => {
        await deleteManagedTeacher(teacherId);
    };

    const handleUnlinkTeacher = async (teacherId: string) => {
        if (!institute || !institute.linkedTeacherIds) return;
        if (!confirm("Are you sure you want to unlink this teacher? They will remain on the platform but effectively removed from your institute list.")) return;

        const newLinks = institute.linkedTeacherIds.filter(id => id !== teacherId);
        await updateTuitionInstitute(institute.id, {
            linkedTeacherIds: newLinks
        });
        addToast("Teacher unlinked successfully!", "success");
    };

    const handleToggleTeacherPublish = async (teacher: Teacher) => {
        await toggleTeacherPublishState(teacher.id, !!teacher.isPublished);
    };

    const handleAddExistingTeacher = async (teacherId: string) => {
        if (!institute) return;
        const currentLinks = institute.linkedTeacherIds || [];
        if (!currentLinks.includes(teacherId)) {
            await updateTuitionInstitute(institute.id, {
                linkedTeacherIds: [...currentLinks, teacherId]
            });
            addToast("Teacher linked successfully!", "success");
        }
    };

    const handleInternalSaveClass = (classDetails: IndividualClass) => {
        handleSaveClass(classDetails);
        setIsClassModalOpen(false);
        setClassToEdit(null);
    };

    const handleInternalSaveEvent = (eventDetails: InstituteEvent) => {
        handleSaveEvent(eventDetails);
        setIsEventModalOpen(false);
        setEventToEdit(null);
    };

    const handleEditEvent = (eventDetails: InstituteEvent) => {
        setEventToEdit(eventDetails);
        setIsEventModalOpen(true);
    };

    const handleEditClass = (classInfo: IndividualClass) => {
        setClassToEdit(classInfo);
        setIsClassModalOpen(true);
    };

    const requestCancelItem = (id: number | string, type: 'class' | 'event') => {
        setItemToCancel({ id, type });
    };

    const handleConfirmCancel = () => {
        if (!itemToCancel || !institute) return;
        if (itemToCancel.type === 'class') {
            const classToCancel = instituteClasses.find(c => c.id === itemToCancel.id);
            if (classToCancel) {
                handleCancelItem(classToCancel.teacherId, itemToCancel.id, 'class');
            }
        } else if (itemToCancel.type === 'event') {
            handleCancelEvent(institute.id, itemToCancel.id as string);
        }
        setItemToCancel(null);
    };

    const handleResetClick = (teacherId: string, teacherName: string) => {
        setResetTarget({ teacherId, teacherName });
    };

    const handleConfirmReset = async () => {
        if (resetTarget && institute) {
            await handleResetTeacherBalance(institute.id, resetTarget.teacherId);
            setResetTarget(null);
        }
    };

    const handleFinishSessionClick = async () => {
        if (!selectedClassForAttendance) return;
        if (!confirm(`Are you sure you want to finish the current session for '${selectedClassForAttendance.title}'?\n\nThis will:\n1. Archive current attendance records.\n2. Move the class date to next week.\n3. Reset attendance list for new marking.`)) return;

        await finishWeeklyClassSession(selectedClassForAttendance);
        // Deselect or refresh will happen via re-render, but best to deselect to avoid showing stale data
        setSelectedClassForAttendance(null);
        setIsAttendanceModalOpen(false);
    };

    const handleOpenRecordings = (classInfo: IndividualClass) => {
        setSelectedClassForRecordings(classInfo);
        setIsRecordingsModalOpen(true);
    };

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });

    const { last3MonthsEarnings, currentMonthEarnings } = useMemo(() => {
        if (!institute) return { last3MonthsEarnings: [], currentMonthEarnings: 0 };

        const now = new Date();
        const earningsByMonth = new Map<string, number>();

        const instituteSales = sales.filter(s => s.instituteId === institute.id && s.status === 'completed');

        instituteSales.forEach(sale => {
            const saleDate = new Date(sale.saleDate);
            const monthKey = `${saleDate.getFullYear()}-${saleDate.getMonth()}`; // YYYY-M
            const currentEarnings = earningsByMonth.get(monthKey) || 0;
            earningsByMonth.set(monthKey, currentEarnings + (sale.instituteCommission || 0));
        });

        const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
        const currentMonthTotal = earningsByMonth.get(currentMonthKey) || 0;

        const lastMonths = [];
        for (let i = 1; i <= 3; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = d.getMonth();
            const monthName = d.toLocaleString('default', { month: 'long', year: 'numeric' });
            const monthKey = `${year}-${month}`;

            lastMonths.push({
                monthName,
                earnings: earningsByMonth.get(monthKey) || 0,
            });
        }

        return { last3MonthsEarnings: lastMonths.reverse(), currentMonthEarnings: currentMonthTotal };
    }, [institute, sales]);

    if (!institute) {
        return <div className="p-8 text-center">Loading institute data or profile not found...</div>;
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'classes':
                return (
                    <div>
                        <div className="flex justify-end mb-4">
                            <button onClick={() => { setClassToEdit(null); setIsClassModalOpen(true); }} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors">
                                <PlusIcon className="h-4 h-4" />
                                <span>Schedule New Class</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {instituteClasses.map(({ teacher, ...classInfo }) => (
                                <ClassCard
                                    key={classInfo.id}
                                    classInfo={classInfo}
                                    teacher={teacher}
                                    viewMode="teacher"
                                    enrollmentCount={enrollmentCounts[`class_${classInfo.id}`] || 0}
                                    onView={(c) => handleNavigate({ name: 'class_detail', classId: c.id })}
                                    onEdit={handleEditClass}
                                    onDelete={(id, enrollmentCount) => requestCancelItem(id, 'class')}
                                    onTogglePublish={(id) => handleTogglePublishState(classInfo.teacherId, id, 'class')}
                                    onManageRecordings={handleOpenRecordings}
                                />
                            ))}
                        </div>
                    </div>
                );
            case 'events':
                return (
                    <InstituteEventsTab
                        institute={institute}
                        onScheduleNew={() => { setEventToEdit(null); setIsEventModalOpen(true); }}
                        onEdit={handleEditEvent}
                        onCancel={(id) => requestCancelItem(id, 'event')}
                        onTogglePublish={(eventId) => handleToggleEventPublishState(institute.id, eventId)}
                    />
                );
            case 'attendance':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <h3 className="text-xl font-bold mb-4">Select a Class</h3>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                                {instituteClasses.filter(c => c.status === 'scheduled').map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setSelectedClassForAttendance(c as IndividualClass)}
                                        className={`w-full text-left p-3 border rounded-lg transition-colors ${selectedClassForAttendance?.id === c.id ? 'bg-primary/10 border-primary' : 'border-light-border dark:border-dark-border hover:bg-light-border dark:hover:bg-dark-border'}`}
                                    >
                                        <p className="font-bold">{c.title}</p>
                                        <p className="text-sm text-light-subtle dark:text-dark-subtle">{c.subject} - {new Date(c.date).toLocaleDateString()}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            {selectedClassForAttendance ? (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xl font-bold">Attendance for: {selectedClassForAttendance.title}</h3>
                                        <button onClick={() => handleNavigate({ name: 'attendance_scanner', classId: selectedClassForAttendance.id })} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark">
                                            Open Scanner
                                        </button>
                                        {(selectedClassForAttendance.recurrence === 'weekly' || selectedClassForAttendance.recurrence === 'flexible') && (
                                            <button onClick={handleFinishSessionClick} className="ml-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                                                Finish & Reset Session
                                            </button>
                                        )}
                                    </div>

                                    {/* Manual Attendance Entry */}
                                    <div className="bg-white dark:bg-dark-surface p-4 rounded-lg border border-light-border dark:border-dark-border">
                                        <h4 className="text-sm font-bold mb-2">Manual Entry</h4>
                                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                                            <div className="flex-grow w-full md:w-auto">
                                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Student ID</label>
                                                <div className="flex">
                                                    <input
                                                        type="text"
                                                        value={manualStudentId}
                                                        onChange={(e) => setManualStudentId(e.target.value)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchStudent(); }}
                                                        placeholder="Enter ID (e.g. STU-12345)"
                                                        className="flex-grow px-3 py-2 border rounded-l-md dark:bg-dark-background dark:border-dark-border focus:ring-primary focus:border-primary"
                                                    />
                                                    <button
                                                        onClick={handleSearchStudent}
                                                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-dark-border rounded-r-md hover:bg-gray-200 dark:hover:bg-gray-600"
                                                    >
                                                        Search
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {foundStudent && (
                                            <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20 flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div>
                                                        <p className="font-bold text-primary">Student Found!</p>
                                                        <button onClick={() => setIsAttendanceModalOpen(true)} className="text-sm underline">
                                                            Open Attendance Window
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {isAttendanceModalOpen && foundStudent && selectedClassForAttendance && (
                                        <StudentAttendanceModal
                                            isOpen={isAttendanceModalOpen}
                                            onClose={() => { setIsAttendanceModalOpen(false); setFoundStudent(null); setManualStudentId(''); }}
                                            student={foundStudent}
                                            classInfo={selectedClassForAttendance}
                                            sale={studentSale || null}
                                        />
                                    )}
                                    <AttendanceSummaryTable classInfo={selectedClassForAttendance} />
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-center p-8 bg-light-background dark:bg-dark-background rounded-lg">
                                    <p className="text-light-subtle dark:text-dark-subtle">Select a class from the left to view attendance records and open the scanner.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'teachers':
                const managedTeachers = teachers.filter(t => (t.instituteId === institute.id && t.isManaged) || institute.linkedTeacherIds?.includes(t.id));
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-light-surface dark:bg-dark-surface p-4 rounded-lg shadow-sm border border-light-border dark:border-dark-border">
                            <div>
                                <h3 className="text-lg font-bold">Teachers</h3>
                                <p className="text-sm text-light-subtle dark:text-dark-subtle">Manage your institute's teachers.</p>
                            </div>
                            <button onClick={() => setIsAddChoiceModalOpen(true)} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors">
                                <PlusIcon className="h-4 h-4" />
                                <span>Add Teacher</span>
                            </button>
                        </div>
                        {isAddChoiceModalOpen && (
                            <Modal isOpen={isAddChoiceModalOpen} onClose={() => setIsAddChoiceModalOpen(false)} title="Add Teacher" size="sm">
                                <div className="space-y-4">
                                    <button
                                        onClick={() => { setIsAddChoiceModalOpen(false); setTeacherToEdit(null); setIsTeacherModalOpen(true); }}
                                        className="w-full flex items-center p-4 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-lg hover:border-primary transition-colors text-left"
                                    >
                                        <div className="p-3 bg-primary/10 rounded-full mr-4 text-primary">
                                            <UserCircleIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold">Create New Profile</p>
                                            <p className="text-xs text-light-subtle dark:text-dark-subtle">Register a new teacher under your institute.</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => { setIsAddChoiceModalOpen(false); setIsAddExistingModalOpen(true); }}
                                        className="w-full flex items-center p-4 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-lg hover:border-primary transition-colors text-left"
                                    >
                                        <div className="p-3 bg-secondary/10 rounded-full mr-4 text-secondary">
                                            <UserPlusIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold">Link Existing Teacher</p>
                                            <p className="text-xs text-light-subtle dark:text-dark-subtle">Add a teacher already registered on Clazz.lk.</p>
                                        </div>
                                    </button>
                                </div>
                            </Modal>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {managedTeachers.filter(t => !t.isDeleted).map(teacher => (
                                <div key={teacher.id} className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md border border-light-border dark:border-dark-border flex flex-col items-center text-center relative group">
                                    {/* Action Buttons */}
                                    <div className="absolute top-3 right-3 flex space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-black/50 rounded-full p-1 backdrop-blur-sm">
                                        {teacher.isManaged ? (
                                            <>
                                                <button
                                                    onClick={() => handleToggleTeacherPublish(teacher)}
                                                    title={teacher.isPublished ? "Unpublish" : "Publish"}
                                                    className={`p-1.5 rounded-full ${teacher.isPublished ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                >
                                                    {teacher.isPublished ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => handleEditTeacher(teacher)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full"
                                                    title="Edit"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTeacher(teacher.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"
                                                    title="Delete"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleUnlinkTeacher(teacher.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"
                                                title="Unlink"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 mb-4 relative">
                                        {teacher.profileImage ? (
                                            <img src={teacher.profileImage} alt={teacher.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                <UserCircleIcon className="w-16 h-16" />
                                            </div>
                                        )}
                                        {!teacher.isPublished && teacher.isManaged && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <span className="text-white text-xs font-bold px-2 py-1 bg-gray-800/80 rounded">Hidden</span>
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="text-xl font-bold">{teacher.name}</h4>
                                    <p className="text-sm text-primary font-medium">{teacher.subjects.join(', ')}</p>

                                    {/* Tag/Badge for Managed vs Linked */}
                                    <span className={`px-2 py-0.5 mt-2 rounded-full text-[10px] font-bold uppercase tracking-wide mb-3 ${teacher.isManaged ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                        {teacher.isManaged ? 'Managed Profile' : 'Linked Teacher'}
                                    </span>

                                    <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">{teacher.contact?.phone || 'No contact info'}</p>

                                    <div className="mt-4 flex items-center justify-center space-x-4 w-full pt-4 border-t border-light-border dark:border-dark-border">
                                        <div className="text-center">
                                            <p className="text-xs text-light-subtle dark:text-dark-subtle">Commission</p>
                                            {!teacher.isManaged ? (
                                                <div className="flex items-center justify-center space-x-1">
                                                    {editingCommission === teacher.id ? (
                                                        <div className="flex items-center">
                                                            <input
                                                                type="number"
                                                                value={tempCommission}
                                                                onChange={(e) => setTempCommission(e.target.value)}
                                                                className="w-12 px-1 py-0.5 text-sm border rounded"
                                                                autoFocus
                                                            />
                                                            <button onClick={() => saveLinkedCommission(teacher.id)} className="ml-1 text-green-600">
                                                                <CheckCircleIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p className="font-bold text-lg">
                                                                {institute.linkedTeacherCommissions?.[teacher.id] ?? institute.commissionRate}%
                                                            </p>
                                                            <button
                                                                onClick={() => { setEditingCommission(teacher.id); setTempCommission(String(institute.linkedTeacherCommissions?.[teacher.id] ?? institute.commissionRate)); }}
                                                                className="text-light-subtle hover:text-primary transition-colors"
                                                                title="Set specific commission for this teacher"
                                                            >
                                                                <PencilIcon className="w-3 h-3" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="font-bold text-lg">{teacher.commissionRate}%</p>
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-light-subtle dark:text-dark-subtle">Classes</p>
                                            <p className="font-bold text-lg">{teacher.individualClasses?.length || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {managedTeachers.filter(t => !t.isDeleted).length === 0 && (
                                <div className="col-span-full py-12 text-center text-light-subtle dark:text-dark-subtle bg-light-background dark:bg-dark-background rounded-lg border border-dashed border-light-border dark:border-dark-border">
                                    <UserCircleIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>No managed or linked teachers found. click "Add Teacher" to get started.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'earnings':
                const manualSales = sales.filter(s => s.instituteId === institute.id && s.paymentMethod === 'manual_at_venue' && (selectedReportClass === 'all' || String(s.itemId) === String(selectedReportClass)));
                const teacherBalances = institute.teacherManualBalances ? Object.entries(institute.teacherManualBalances) : [];

                return (
                    <div className="space-y-8">
                        <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-bold mb-4 text-light-text dark:text-dark-text">Balances Owed to Teachers (from Manual Collections)</h2>
                            <p className="text-sm text-light-subtle dark:text-dark-subtle mb-4">This balance is settled directly between you and the teacher. After paying, use the reset button to clear their balance on the platform.</p>
                            {teacherBalances.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                                        <thead className="bg-light-background dark:bg-dark-background">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Teacher</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Balance Owed</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Last Paid</th>
                                                <th className="px-4 py-3 text-center text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-light-border dark:divide-dark-border">
                                            {teacherBalances.map(([teacherId, data]) => {
                                                const typedData = data as { balance: number; teacherName: string; lastReset?: string };
                                                return (
                                                    <tr key={teacherId}>
                                                        <td className="px-4 py-3 whitespace-nowrap font-medium text-light-text dark:text-dark-text">{typedData.teacherName}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-lg text-primary">{currencyFormatter.format(typedData.balance)}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-light-text dark:text-dark-text">{typedData.lastReset ? new Date(typedData.lastReset).toLocaleDateString() : 'Never'}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                                            <button disabled={typedData.balance <= 0} onClick={() => handleResetClick(teacherId, typedData.teacherName)} className="px-3 py-1 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary-dark disabled:bg-gray-400">
                                                                Pay & Reset Balance
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (<p className="text-center py-8 text-light-subtle dark:text-dark-subtle">No outstanding balances with teachers from manual collections.</p>)}
                        </div>

                        <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                            <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-light-text dark:text-dark-text">Manual Collections Log</h2>
                                <div className="mt-2 md:mt-0">
                                    <select
                                        value={selectedReportClass}
                                        onChange={(e) => setSelectedReportClass(e.target.value)}
                                        className="px-3 py-2 text-sm border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text focus:outline-none focus:ring-primary"
                                    >
                                        <option value="all">All Classes</option>
                                        {instituteClasses.map(c => <option key={c.id} value={c.id}>{c.title} ({new Date(c.date).toLocaleDateString()})</option>)}
                                    </select>
                                </div>
                            </div>
                            {manualSales.length > 0 ? (
                                <div className="overflow-x-auto max-h-96">
                                    <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                                        <thead className="bg-light-background dark:bg-dark-background sticky top-0">
                                            <tr>
                                                <th className="px-3 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Date</th>
                                                <th className="px-3 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Class</th>
                                                <th className="px-3 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Student</th>
                                                <th className="px-3 py-3 text-right text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Collected</th>
                                                <th className="px-3 py-3 text-right text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Teacher's Share</th>
                                                <th className="px-3 py-3 text-right text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Your Income</th>
                                                <th className="px-3 py-3 text-right text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Platform Fee</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-light-border dark:divide-dark-border">
                                            {manualSales.map(sale => {
                                                const student = users.find(u => u.id === sale.studentId);
                                                return (
                                                    <tr key={sale.id}>
                                                        <td className="px-3 py-3 whitespace-nowrap text-light-text dark:text-dark-text">{new Date(sale.saleDate).toLocaleDateString()}</td>
                                                        <td className="px-3 py-3 text-light-text dark:text-dark-text">{sale.itemName}</td>
                                                        <td className="px-3 py-3 text-light-text dark:text-dark-text">{student ? `${student.firstName} ${student.lastName}` : 'N/A'}</td>
                                                        <td className="px-3 py-3 text-right font-semibold text-light-text dark:text-dark-text">{currencyFormatter.format(sale.amountPaidFromBalance)}</td>
                                                        <td className="px-3 py-3 text-right text-light-text dark:text-dark-text">{currencyFormatter.format(sale.teacherCommission || 0)}</td>
                                                        <td className="px-3 py-3 text-right text-green-600 font-semibold">{currencyFormatter.format(sale.instituteCommission || 0)}</td>
                                                        <td className="px-3 py-3 text-right text-red-600">{currencyFormatter.format(sale.platformCommission || 0)}</td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (<p className="text-center py-8 text-light-subtle dark:text-dark-subtle">No manual payments have been recorded yet.</p>)}
                        </div>
                        {/* Wrapper continues... */}
                        {/* Withdrawal History Section */}
                        <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-bold mb-4 text-light-text dark:text-dark-text">Withdrawal History</h2>
                            {institute.withdrawalHistory && institute.withdrawalHistory.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                                        <thead className="bg-light-background dark:bg-dark-background">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Amount</th>
                                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Status</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-light-border dark:divide-dark-border">
                                            {[...institute.withdrawalHistory].reverse().map((w) => (
                                                <tr key={w.id}>
                                                    <td className="px-4 py-3 whitespace-nowrap">{new Date(w.requestedAt).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap font-semibold">{currencyFormatter.format(w.amount)}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${w.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                                            w.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                            }`}>
                                                            {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-light-subtle dark:text-dark-subtle max-w-xs truncate">{w.notes || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">No withdrawal history found.</p>
                            )}
                        </div>
                    </div>
                );
            case 'profile':
                return <InstituteProfileSettings institute={institute} />;
            case 'overview':
            default:
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        <div className="lg:col-span-1 bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md space-y-4">
                            <div>
                                <h2 className="text-xl font-bold">Available Funds</h2>
                                <p className="text-sm text-light-subtle dark:text-dark-subtle">Accumulated balance from previous months.</p>
                                <p className="text-4xl font-bold text-primary mt-2">{currencyFormatter.format(institute.earnings.available)}</p>
                            </div>
                            <div className="pt-4 border-t border-light-border dark:border-dark-border">
                                <h3 className="font-semibold text-light-text dark:text-dark-text">This Month's Earnings (Pending)</h3>
                                <p className="text-2xl font-bold">{currencyFormatter.format(currentMonthEarnings)}</p>
                                <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">Available to withdraw on 15th of next month.</p>
                            </div>
                            <div className="pt-4 border-t border-light-border dark:border-dark-border">
                                <h3 className="font-semibold mb-2">Withdraw Your Funds</h3>
                                <p className="text-sm text-light-subtle dark:text-dark-subtle mb-3">
                                    Request a payout of your available balance to your registered bank account.
                                </p>

                                {institute.earnings.pending ? (
                                    <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                                        <p className="text-sm text-yellow-800 dark:text-yellow-200 font-semibold flex items-center">
                                            <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                                            Pending Withdrawal: {currencyFormatter.format(institute.earnings.pending)}
                                        </p>
                                    </div>
                                ) : null}

                                <button
                                    onClick={() => { setWithdrawalAmountInput(Math.floor(institute.earnings.available).toString()); setIsWithdrawalModalOpen(true); }}
                                    disabled={institute.earnings.available < 1000}
                                    className="w-full py-2 px-4 bg-primary text-white font-medium rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {institute.earnings.available < 1000 ? 'Minimum Balance LKR 1,000' : 'Request Withdrawal'}
                                </button>

                                <div className="mt-4 text-center">
                                    <button onClick={() => setActiveTab('earnings')} className="text-sm text-primary hover:underline">
                                        View Withdrawal History
                                    </button>
                                </div>
                            </div>

                            {/* Withdrawal Request Modal */}
                            {isWithdrawalModalOpen && (
                                <Modal isOpen={isWithdrawalModalOpen} onClose={() => setIsWithdrawalModalOpen(false)} title="Request Withdrawal" size="sm">
                                    <div className="space-y-4">
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                                Available Balance: <span className="font-bold">{currencyFormatter.format(institute.earnings.available)}</span>
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                                                Amount to Withdraw (LKR)
                                            </label>
                                            <input
                                                type="number"
                                                value={withdrawalAmountInput}
                                                onChange={(e) => setWithdrawalAmountInput(e.target.value)}
                                                max={institute.earnings.available}
                                                min={1000}
                                                className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background focus:ring-primary focus:border-primary"
                                            />
                                            <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">Minimum withdrawal amount is LKR 1,000. Funds will be transferred to your registered bank account.</p>
                                        </div>
                                        <div className="flex justify-end space-x-3 pt-2">
                                            <button
                                                onClick={() => setIsWithdrawalModalOpen(false)}
                                                className="px-4 py-2 text-sm text-light-text dark:text-dark-text hover:bg-light-surface dark:hover:bg-dark-surface rounded-md"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const amount = parseFloat(withdrawalAmountInput);
                                                    if (isNaN(amount) || amount < 1000 || amount > institute.earnings.available) {
                                                        addToast("Please enter a valid amount.", "error");
                                                        return;
                                                    }
                                                    await requestWithdrawal(institute.id, amount);
                                                    setIsWithdrawalModalOpen(false);
                                                }}
                                                className="px-4 py-2 text-sm text-white bg-primary rounded-md hover:bg-primary-dark"
                                            >
                                                Submit Request
                                            </button>
                                        </div>
                                    </div>
                                </Modal>
                            )}
                        </div>

                        <div className="lg:col-span-2 space-y-8">
                            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                                <h2 className="text-xl font-bold mb-4">Recent Monthly Earnings</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {last3MonthsEarnings.map(monthData => (
                                        <div key={monthData.monthName} className="p-4 bg-light-background dark:bg-dark-background rounded-lg text-center">
                                            <p className="text-sm font-medium text-light-subtle dark:text-dark-subtle">{monthData.monthName}</p>
                                            <p className="text-2xl font-bold text-light-text dark:text-dark-text mt-1">{currencyFormatter.format(monthData.earnings)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <StatCard title="Total Classes Scheduled" value={instituteClasses.length} icon={<VideoCameraIcon className="w-6 h-6" />} />
                                <StatCard title="Total Lifetime Earnings" value={currencyFormatter.format(institute.earnings.total)} icon={<BanknotesIcon className="w-6 h-6" />} />
                            </div>
                        </div>
                    </div>
                );
        }
    };

    const tabItems = [
        { id: 'overview', label: 'Overview', icon: <BanknotesIcon className="w-5 h-5 mr-2" /> },
        { id: 'classes', label: 'Classes', icon: <VideoCameraIcon className="w-5 h-5 mr-2" /> },
        { id: 'events', label: 'Events', icon: <EventIcon className="w-5 h-5 mr-2" /> },
        { id: 'teachers', label: 'Teachers', icon: <UserCircleIcon className="w-5 h-5 mr-2" /> },
        { id: 'attendance', label: 'Attendance', icon: <ClipboardListIcon className="w-5 h-5 mr-2" /> },
        { id: 'earnings', label: 'Earnings', icon: <BanknotesIcon className="w-5 h-5 mr-2" /> },
        { id: 'profile', label: 'Profile', icon: <UserCircleIcon className="w-5 h-5 mr-2" /> },
    ];

    return (
        <div className="min-h-screen bg-light-background dark:bg-dark-background flex flex-col">
            {/* Header Section */}
            <div className="bg-white dark:bg-dark-surface border-b border-light-border dark:border-dark-border py-4 px-6 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                        <span className="mr-3 p-2 bg-primary/10 rounded-lg text-primary">
                            <BanknotesIcon className="w-6 h-6" />
                        </span>
                        {institute.name}
                    </h1>
                </div>
                <button
                    onClick={() => handleNavigate({ name: isAdminView ? 'admin_dashboard' : 'home' })}
                    className="flex items-center space-x-2 text-sm font-medium text-light-subtle dark:text-dark-subtle hover:text-primary transition-colors"
                >
                    <ChevronLeftIcon className="h-4 h-4" />
                    <span>Exit Dashboard</span>
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Navigation */}
                <aside className="w-64 bg-white dark:bg-dark-surface border-r border-light-border dark:border-dark-border hidden md:flex flex-col overflow-y-auto">
                    <nav className="p-4 space-y-1">
                        {tabItems.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${activeTab === tab.id
                                    ? 'bg-primary text-white shadow-md'
                                    : 'text-light-subtle dark:text-dark-subtle hover:bg-light-background dark:hover:bg-dark-background hover:text-light-text dark:hover:text-dark-text'
                                    }`}
                            >
                                <div className={`${activeTab === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'} mr-3 flex-shrink-0`}>
                                    {tab.icon}
                                </div>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                    <div className="mt-auto p-4 border-t border-light-border dark:border-dark-border">
                        <div className="bg-primary/5 rounded-lg p-3">
                            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Monthly Earnings</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{currencyFormatter.format(currentMonthEarnings)}</p>
                        </div>
                    </div>
                </aside>

                {/* Mobile Navigation (Tabs for smaller screens) */}
                <div className="md:hidden w-full overflow-x-auto bg-white dark:bg-dark-surface border-b border-light-border dark:border-dark-border fixed bottom-0 left-0 z-50 flex justify-between px-2 py-2 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    {tabItems.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex flex-col items-center justify-center px-3 py-1 rounded-md min-w-[64px] ${activeTab === tab.id
                                ? 'text-primary'
                                : 'text-light-subtle dark:text-dark-subtle'
                                }`}
                        >
                            <div className="mb-1">{tab.icon}</div>
                            <span className="text-[10px] font-medium">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-light-background dark:bg-dark-background pb-20 md:pb-8">
                    <div className="max-w-7xl mx-auto">
                        {renderTabContent()}
                    </div>
                </main>
            </div>

            {isClassModalOpen && (
                <TIScheduleClassModal
                    isOpen={isClassModalOpen}
                    onClose={() => setIsClassModalOpen(false)}
                    onSave={handleInternalSaveClass}
                    instituteId={institute.id}
                    initialData={classToEdit}
                />
            )}
            {isEventModalOpen && (
                <TIScheduleEventModal
                    isOpen={isEventModalOpen}
                    onClose={() => setIsEventModalOpen(false)}
                    onSave={handleInternalSaveEvent}
                    organizerId={institute.id}
                    organizerType="tuition_institute"
                    initialData={eventToEdit}
                />
            )}
            {itemToCancel && (
                <ConfirmationModal
                    isOpen={true}
                    onClose={() => setItemToCancel(null)}
                    onConfirm={handleConfirmCancel}
                    title={`Cancel ${itemToCancel.type}`}
                    message={`Are you sure you want to cancel this ${itemToCancel.type}? This will refund all enrolled students.`}
                    confirmText="Yes, Cancel"
                />
            )}
            {resetTarget && (
                <ConfirmationModal
                    isOpen={true}
                    onClose={() => setResetTarget(null)}
                    onConfirm={handleConfirmReset}
                    title={`Reset Balance for ${resetTarget.teacherName}`}
                    message={`This confirms you have paid the teacher their share of manual collections. It will reset their balance on the platform to zero. This cannot be undone.`}
                    confirmText="Yes, I've Paid & Reset"
                />
            )}
            {isTeacherModalOpen && (
                <TIManagedTeacherModal
                    isOpen={isTeacherModalOpen}
                    onClose={() => setIsTeacherModalOpen(false)}
                    onSave={handleSaveTeacher}
                    initialData={teacherToEdit}
                    instituteCommissionRate={institute.commissionRate}
                />
            )}
            {isAddExistingModalOpen && (
                <TIAddExistingTeacherModal
                    isOpen={isAddExistingModalOpen}
                    onClose={() => setIsAddExistingModalOpen(false)}
                    onAdd={handleAddExistingTeacher}
                    existingTeacherIds={institute.linkedTeacherIds || []}
                />
            )}
            {selectedClassForRecordings && (
                <ClassRecordingsModal
                    isOpen={isRecordingsModalOpen}
                    onClose={() => setIsRecordingsModalOpen(false)}
                    classInfo={selectedClassForRecordings}
                    teacherId={selectedClassForRecordings.teacherId}
                />
            )}
        </div>
    );
};

export default TuitionInstituteDashboard;
