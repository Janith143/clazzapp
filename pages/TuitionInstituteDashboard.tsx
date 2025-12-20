
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNavigation } from '../contexts/NavigationContext';
import { IndividualClass, Teacher, Sale, TuitionInstitute, User, Event as InstituteEvent } from '../types';
import { BanknotesIcon, VideoCameraIcon, UserCircleIcon, ClipboardListIcon, PlusIcon, ChevronLeftIcon, SaveIcon } from '../components/Icons';
import TIScheduleClassModal from '../components/ti/TIScheduleClassModal';
import TIScheduleEventModal from '../components/ti/TIScheduleEventModal';
import InstituteEventsTab from '../components/ti/InstituteEventsTab';
import ClassCard from '../components/ClassCard';
import ConfirmationModal from '../components/ConfirmationModal';
import AttendanceSummaryTable from '../components/ti/AttendanceSummaryTable';
import { useUI } from '../contexts/UIContext';

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
    const [isSaving, setIsSaving] = useState(false);

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

        setIsSaving(true);
        try {
            await updateTuitionInstitute(institute.id, { commissionRate: newRate });
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
                        <SaveIcon className="w-4 h-4 mr-2"/>
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
    const { tuitionInstitutes, teachers, sales, users, handleSaveClass, handleCancelItem, handleTogglePublishState, handleResetTeacherBalance, processMonthlyPayouts, handleSaveEvent, handleCancelEvent, handleToggleEventPublishState } = useData();
    const { handleNavigate } = useNavigation();

    const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'events' | 'attendance' | 'earnings' | 'profile'>('overview');
    
    // Class Modal State
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [classToEdit, setClassToEdit] = useState<IndividualClass | null>(null);
    const [itemToCancel, setItemToCancel] = useState<{ id: number | string; type: 'class' | 'event' } | null>(null);

    // Event Modal State
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<InstituteEvent | null>(null);

    const [selectedClassForAttendance, setSelectedClassForAttendance] = useState<IndividualClass | null>(null);
    const [resetTarget, setResetTarget] = useState<{ teacherId: string; teacherName: string } | null>(null);

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
          .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
                                    </div>
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
            case 'earnings':
                 const manualSales = sales.filter(s => s.instituteId === institute.id && s.paymentMethod === 'manual_at_venue');
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
                             <h2 className="text-xl font-bold mb-4 text-light-text dark:text-dark-text">Manual Collections Log</h2>
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
                                             )})}
                                         </tbody>
                                     </table>
                                 </div>
                             ) : (<p className="text-center py-8 text-light-subtle dark:text-dark-subtle">No manual payments have been recorded yet.</p>)}
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
                                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                                    To withdraw your available balance, please contact our finance department.
                                </p>
                                <div className="mt-4 p-3 bg-light-background dark:bg-dark-background rounded-md text-center border border-light-border dark:border-dark-border">
                                    <p className="font-semibold text-md">Contact for Withdrawals:</p>
                                    <a href="tel:0720768100" className="text-xl font-bold text-primary tracking-wider hover:underline">072-0768100</a>
                                </div>
                            </div>
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
        { id: 'attendance', label: 'Attendance', icon: <ClipboardListIcon className="w-5 h-5 mr-2" /> },
        { id: 'earnings', label: 'Earnings', icon: <BanknotesIcon className="w-5 h-5 mr-2" /> },
        { id: 'profile', label: 'Profile', icon: <UserCircleIcon className="w-5 h-5 mr-2" /> },
    ];

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slideInUp">
            <div className="mb-8">
                <button 
                    onClick={() => handleNavigate({ name: isAdminView ? 'admin_dashboard' : 'home' })} 
                    className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-dark"
                >
                    <ChevronLeftIcon className="h-5 h-5" />
                    <span>Back to {isAdminView ? 'Admin Dashboard' : 'Home'}</span>
                </button>
            </div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Institute Dashboard</h1>
                <p className="text-light-subtle dark:text-dark-subtle mt-1">Welcome, {institute.name}!</p>
            </div>

            <div className="border-b border-light-border dark:border-dark-border mb-8">
                <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                    {tabItems.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`${
                                activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-light-subtle dark:text-dark-subtle hover:text-light-text dark:hover:text-dark-text hover:border-light-border dark:hover:border-dark-border'
                            } flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div>{renderTabContent()}</div>
            
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
                    instituteId={institute.id}
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
        </div>
    );
};

export default TuitionInstituteDashboard;
