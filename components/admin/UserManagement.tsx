
import React, { useState, useMemo } from 'react';
import { Teacher, User, VerificationStatus, TuitionInstitute } from '../../types.ts';
import { CheckCircleIcon, XCircleIcon, ClockIcon, DocumentTextIcon, BanknotesIcon, DownloadIcon, SearchIcon, ShareIcon } from '../Icons.tsx';
import DefaultCoverImageModal from './DefaultCoverImageModal.tsx';
import { useData } from '../../contexts/DataContext.tsx';
import { useNavigation } from '../../contexts/NavigationContext.tsx';
import { useUI } from '../../contexts/UIContext.tsx';
import { calculateTeacherProfileCompletion } from '../../utils.ts';
import AssignReferralModal from './AssignReferralModal.tsx';

interface UserManagementProps {
  teachers: Teacher[];
  users: User[];
  onUpdateTeacher: (teacherId: string, updates: Partial<Teacher>) => void;
  onViewTeacher: (teacherId: string) => void;
  onViewStudentDashboard: (userId: string) => void;
  defaultCoverImages: string[];
}

const UserManagement: React.FC<UserManagementProps> = ({ teachers, users, onUpdateTeacher, onViewTeacher, onViewStudentDashboard, defaultCoverImages }) => {
    const { tuitionInstitutes, updateTuitionInstitute, handleAssignReferralCode } = useData();
    const { handleNavigate } = useNavigation();
    const { setModalState } = useUI();
    const [activeTab, setActiveTab] = useState<'teachers' | 'approved_teachers' | 'students' | 'institutes'>('teachers');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [commissionFilter, setCommissionFilter] = useState('');

    const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [commissionRates, setCommissionRates] = useState<{[key: string]: string}>({});
    const [instituteCommissionRates, setInstituteCommissionRates] = useState<{[key: string]: string}>({});
    const [platformMarkupRates, setPlatformMarkupRates] = useState<{ [key: string]: string }>({});
    const [photoCommissionRates, setPhotoCommissionRates] = useState<{ [key: string]: string }>({});
    
    // Referral Modal State
    const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
    const [selectedUserForReferral, setSelectedUserForReferral] = useState<User | null>(null);

    const sortedTeachers = useMemo(() => {
        const userMap: Map<string, User> = new Map(users.map(u => [u.id, u]));
        
        let filteredTeachers = [...teachers];

        // Filter by Status
        if (statusFilter !== 'all') {
            filteredTeachers = filteredTeachers.filter(t => t.registrationStatus === statusFilter);
        }

        // Filter by Commission Rate
        if (commissionFilter !== '') {
            filteredTeachers = filteredTeachers.filter(t => t.commissionRate.toString() === commissionFilter);
        }

        if (searchTerm.trim()) {
            const lowerSearch = searchTerm.toLowerCase();
            filteredTeachers = filteredTeachers.filter(teacher => {
                const locations = teacher.teachingLocations 
                    ? teacher.teachingLocations.map(l => `${l.instituteName} ${l.town} ${l.district}`).join(' ') 
                    : '';

                return (
                    teacher.name.toLowerCase().includes(lowerSearch) ||
                    teacher.id.toLowerCase().includes(lowerSearch) ||
                    teacher.email.toLowerCase().includes(lowerSearch) ||
                    locations.toLowerCase().includes(lowerSearch)
                );
            });
        }

        return filteredTeachers.sort((a, b) => {
            const userA = userMap.get(a.userId);
            const userB = userMap.get(b.userId);
            if (userA?.createdAt && userB?.createdAt) {
                return new Date(userB.createdAt).getTime() - new Date(userA.createdAt).getTime();
            }
            if (userA?.createdAt) return -1;
            if (userB?.createdAt) return 1;
            return 0;
        });
    }, [teachers, users, searchTerm, statusFilter, commissionFilter]);

    const approvedTeachersList = useMemo(() => {
        return sortedTeachers.filter(t => t.registrationStatus === 'approved');
    }, [sortedTeachers]);

    const sortedStudents = useMemo(() => {
        let filteredStudents = users.filter(u => u.role === 'student');
        if (searchTerm.trim()) {
            const lowerSearch = searchTerm.toLowerCase();
            filteredStudents = filteredStudents.filter(student => 
                `${student.firstName} ${student.lastName}`.toLowerCase().includes(lowerSearch) ||
                student.id.toLowerCase().includes(lowerSearch) ||
                (student.email && student.email.toLowerCase().includes(lowerSearch))
            );
        }
        return filteredStudents.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            if (a.createdAt) return -1;
            if (b.createdAt) return 1;
            return 0;
        });
    }, [users, searchTerm]);

    const sortedInstitutes = useMemo(() => {
        const userMap: Map<string, User> = new Map(users.map(u => [u.id, u]));
        let filteredInstitutes = [...tuitionInstitutes];
        if (searchTerm.trim()) {
            const lowerSearch = searchTerm.toLowerCase();
            filteredInstitutes = filteredInstitutes.filter(institute => 
                institute.name.toLowerCase().includes(lowerSearch) ||
                institute.id.toLowerCase().includes(lowerSearch) ||
                (institute.contact?.email && institute.contact.email.toLowerCase().includes(lowerSearch))
            );
        }
        return filteredInstitutes.sort((a, b) => {
            const userA = userMap.get(a.userId);
            const userB = userMap.get(b.userId);
            if (userA?.createdAt && userB?.createdAt) {
                return new Date(userB.createdAt).getTime() - new Date(userA.createdAt).getTime();
            }
            if (userA?.createdAt) return -1;
            if (userB?.createdAt) return 1;
            return 0;
        });
    }, [tuitionInstitutes, users, searchTerm]);
    
    const handleDownloadAllContacts = () => {
        const dataToExport = [];

        // Students
        sortedStudents.forEach(s => {
            dataToExport.push({
                Role: 'Student',
                Name: `${s.firstName} ${s.lastName}`,
                Email: s.email,
                ContactNumber: s.contactNumber || ''
            });
        });

        // Teachers
        sortedTeachers.forEach(t => {
            dataToExport.push({
                Role: 'Teacher',
                Name: t.name,
                Email: t.email,
                ContactNumber: t.contact?.phone || ''
            });
        });

        // Institutes
        sortedInstitutes.forEach(i => {
            dataToExport.push({
                Role: 'Institute',
                Name: i.name,
                Email: i.contact?.email || '',
                ContactNumber: i.contact?.phone || ''
            });
        });

        const downloadCSV = (data: any[], filename: string) => {
            if (data.length === 0) {
                alert("No contact data to download.");
                return;
            }
            const headers = Object.keys(data[0]);
            const csvContent = [
                headers.join(','),
                ...data.map(row => 
                    headers.map(header => {
                        let cell = row[header] === null || row[header] === undefined ? '' : String(row[header]);
                        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                            cell = `"${cell.replace(/"/g, '""')}"`;
                        }
                        return cell;
                    }).join(',')
                )
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        downloadCSV(dataToExport, `clazz_lk_contact_data_${new Date().toISOString().split('T')[0]}.csv`);
    };


    const handleCommissionChange = (teacherId: string, value: string) => {
        setCommissionRates(prev => ({...prev, [teacherId]: value}));
    };
    const handleSaveCommission = (teacherId: string) => {
        const rate = parseFloat(commissionRates[teacherId]);
        if (!isNaN(rate)) {
            onUpdateTeacher(teacherId, { commissionRate: rate });
            alert(`Commission for this teacher has been updated to ${rate}%.`);
            const newRates = {...commissionRates};
            delete newRates[teacherId];
            setCommissionRates(newRates);
        }
    };
    
    const handleInstituteCommissionChange = (instituteId: string, value: string) => {
        setInstituteCommissionRates(prev => ({ ...prev, [instituteId]: value }));
    };

    const handleSaveInstituteCommission = (instituteId: string) => {
        const rate = parseFloat(instituteCommissionRates[instituteId]);
        if (!isNaN(rate)) {
            updateTuitionInstitute(instituteId, { commissionRate: rate });
            alert(`Commission for this institute has been updated to ${rate}%.`);
            const newRates = { ...instituteCommissionRates };
            delete newRates[instituteId];
            setInstituteCommissionRates(newRates);
        }
    };

    const handlePlatformMarkupChange = (instituteId: string, value: string) => {
        setPlatformMarkupRates(prev => ({ ...prev, [instituteId]: value }));
    };

    const handleSavePlatformMarkup = (instituteId: string) => {
        const rate = parseFloat(platformMarkupRates[instituteId]);
        if (!isNaN(rate)) {
            updateTuitionInstitute(instituteId, { platformMarkupRate: rate });
            alert(`Platform markup for this institute has been updated to ${rate}%.`);
            const newRates = { ...platformMarkupRates };
            delete newRates[instituteId];
            setPlatformMarkupRates(newRates);
        }
    };
    
    const handlePhotoCommissionChange = (instituteId: string, value: string) => {
        setPhotoCommissionRates(prev => ({ ...prev, [instituteId]: value }));
    };

    const handleSavePhotoCommission = (instituteId: string) => {
        const rate = parseFloat(photoCommissionRates[instituteId]);
        if (!isNaN(rate) && rate >= 0 && rate <= 100) {
            updateTuitionInstitute(instituteId, { photoCommissionRate: rate });
            alert(`Institute's photo commission has been updated to ${rate}%.`);
            const newRates = { ...photoCommissionRates };
            delete newRates[instituteId];
            setPhotoCommissionRates(newRates);
        } else {
            alert("Please enter a valid percentage between 0 and 100.");
        }
    };

    
    const handleSetDefaultCover = (teacher: Teacher, imageUrl: string) => {
        onUpdateTeacher(teacher.id, { coverImages: [imageUrl] });
        setIsCoverModalOpen(false);
        setSelectedTeacher(null);
    };

    const handleEditStudent = (student: User) => {
      setModalState({ name: 'edit_student_profile', userToEdit: student });
    };

    const handleApproval = (teacherId: string, decision: 'approved' | 'rejected' | 'pending') => {
        onUpdateTeacher(teacherId, { registrationStatus: decision });
        alert(`Teacher status has been updated to ${decision}.`);
    };
    
    const handleInstituteApproval = (instituteId: string, decision: 'approved' | 'rejected') => {
        updateTuitionInstitute(instituteId, { registrationStatus: decision });
        alert(`Institute has been ${decision}.`);
    };
    
    const openReferralModal = (user: User) => {
        setSelectedUserForReferral(user);
        setIsReferralModalOpen(true);
    };
    
    const VerificationStatusIcon: React.FC<{status: VerificationStatus}> = ({status}) => {
        const statusMap = {
            verified: { icon: <CheckCircleIcon className="w-5 h-5 text-green-500 dark:text-green-400" />, text: 'Verified' },
            pending: { icon: <ClockIcon className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />, text: 'Pending' },
            rejected: { icon: <XCircleIcon className="w-5 h-5 text-red-500 dark:text-red-400" />, text: 'Rejected' },
            unverified: { icon: <DocumentTextIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />, text: 'Unverified' },
        };
        const { icon, text } = statusMap[status];
        return <span title={text}>{icon}</span>
    };

    const StatusBadge: React.FC<{status: Teacher['registrationStatus']}> = ({ status }) => {
        const styles = {
            approved: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/50 dark:text-yellow-300',
            rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
        };
        return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
    };

    const renderTeacherTable = (data: Teacher[]) => (
         <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md overflow-x-auto">
            <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                 <thead className="bg-light-background dark:bg-dark-background">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Teacher ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Registered Date</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Verification (ID/Bank)</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Profile %</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Commission</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Actions</th>
                    </tr>
                 </thead>
             <tbody className="divide-y divide-light-border dark:divide-dark-border">
                 {data.map(teacher => {
                     const teacherUser = users.find(u => u.id === teacher.userId);
                     const { percentage: profileCompletion } = calculateTeacherProfileCompletion(teacher);

                     return (
                         <tr key={teacher.id}>
                            <td className="px-4 py-3 whitespace-nowrap font-medium text-light-text dark:text-dark-text">{teacher.name}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-light-text dark:text-dark-text">{teacher.id}</td>
                            <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={teacher.registrationStatus} /></td>
                            <td className="px-4 py-3 whitespace-nowrap text-light-text dark:text-dark-text">{teacherUser?.createdAt ? new Date(teacherUser.createdAt).toLocaleDateString() : 'N/A'}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex justify-center items-center space-x-2">
                                    <VerificationStatusIcon status={teacher.verification.id.status} />
                                    <span className="text-light-subtle dark:text-dark-subtle">/</span>
                                    <VerificationStatusIcon status={teacher.verification.bank.status} />
                                </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span className={`font-bold ${
                                    profileCompletion === 100 ? 'text-green-600 dark:text-green-400' : 
                                    profileCompletion >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 
                                    'text-red-600 dark:text-red-400'
                                }`}>
                                    {profileCompletion}%
                                </span>
                            </td>
                             <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                    <input type="number" value={commissionRates[teacher.id] ?? teacher.commissionRate} onChange={(e) => handleCommissionChange(teacher.id, e.target.value)} className="w-20 px-2 py-1 border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text" />
                                    <span className="ml-1 text-light-text dark:text-dark-text">%</span>
                                    {commissionRates[teacher.id] !== undefined && <button onClick={() => handleSaveCommission(teacher.id)} className="ml-2 text-xs text-primary hover:underline">Save</button>}
                                </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center space-x-2">
                                {teacher.registrationStatus === 'pending' && (
                                    <>
                                        <button onClick={() => handleApproval(teacher.id, 'approved')} className="px-2 py-1 text-xs text-white bg-green-600 rounded-md hover:bg-green-700">Approve</button>
                                        <button onClick={() => handleApproval(teacher.id, 'rejected')} className="px-2 py-1 text-xs text-white bg-red-600 rounded-md hover:bg-red-700">Reject</button>
                                    </>
                                )}
                                {teacher.registrationStatus === 'approved' && (
                                    <>
                                        <button onClick={() => handleApproval(teacher.id, 'pending')} className="px-2 py-1 text-xs text-white bg-yellow-600 rounded-md hover:bg-yellow-700">Unpublish</button>
                                        {teacher.coverImages.length === 0 && (
                                            <button onClick={() => { setSelectedTeacher(teacher); setIsCoverModalOpen(true); }} className="px-2 py-1 text-xs text-white bg-blue-500 rounded-md hover:bg-blue-600">Set Default</button>
                                        )}
                                    </>
                                )}
                                {teacher.registrationStatus === 'rejected' && (
                                    <button onClick={() => handleApproval(teacher.id, 'approved')} className="px-2 py-1 text-xs text-white bg-green-600 rounded-md hover:bg-green-700">Re-Approve</button>
                                )}
                                {teacherUser && !teacherUser.referrerId && (
                                    <button onClick={() => openReferralModal(teacherUser)} className="text-primary hover:underline text-xs font-semibold px-2">Assign Referrer</button>
                                )}
                                <button onClick={() => onViewTeacher(teacher.id)} className="text-primary hover:underline text-xs font-semibold">View Profile</button>
                            </td>
                        </tr>
                     )
                 })}
             </tbody>
            </table>
         </div>
    );
    
     const renderStudentTable = () => (
         <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md overflow-x-auto">
            <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                 <thead className="bg-light-background dark:bg-dark-background">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Student ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Registered Date</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Account Balance</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Actions</th>
                    </tr>
                 </thead>
             <tbody className="divide-y divide-light-border dark:divide-dark-border">
                 {sortedStudents.map(student => (
                    <tr key={student.id}>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-light-text dark:text-dark-text">{student.firstName} {student.lastName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-light-text dark:text-dark-text">{student.id}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-light-text dark:text-dark-text">{student.email}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-light-text dark:text-dark-text">{student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-light-text dark:text-dark-text">{new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(student.accountBalance)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                            {!student.referrerId && (
                                <button onClick={() => openReferralModal(student)} className="text-primary hover:underline text-xs font-semibold mr-4">Assign Referrer</button>
                            )}
                            <button onClick={() => onViewStudentDashboard(student.id)} className="text-primary hover:underline text-xs font-semibold">View Dashboard</button>
                            <button onClick={() => handleEditStudent(student)} className="text-primary hover:underline text-xs font-semibold ml-4">Edit Profile</button>
                        </td>
                    </tr>
                 ))}
             </tbody>
            </table>
         </div>
    );
    
     const renderInstituteTable = () => (
        <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md overflow-x-auto">
            <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                <thead className="bg-light-background dark:bg-dark-background">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Institute ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Registered</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Class Comm.</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Platform Markup</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Photo Comm.</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-light-border dark:divide-dark-border">
                    {sortedInstitutes.map(institute => {
                        const instituteUser = users.find(u => u.id === institute.userId);
                        return (
                            <tr key={institute.id}>
                                <td className="px-4 py-3 whitespace-nowrap font-medium">{institute.name}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{institute.id}</td>
                                <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={institute.registrationStatus} /></td>
                                <td className="px-4 py-3 whitespace-nowrap">{instituteUser?.createdAt ? new Date(instituteUser.createdAt).toLocaleDateString() : 'N/A'}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <input type="number" value={instituteCommissionRates[institute.id] ?? institute.commissionRate} onChange={(e) => handleInstituteCommissionChange(institute.id, e.target.value)} className="w-20 px-2 py-1 border rounded-md bg-light-background dark:bg-dark-background" />
                                        <span className="ml-1">%</span>
                                        {instituteCommissionRates[institute.id] !== undefined && <button onClick={() => handleSaveInstituteCommission(institute.id)} className="ml-2 text-xs text-primary hover:underline">Save</button>}
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <input type="number" value={platformMarkupRates[institute.id] ?? institute.platformMarkupRate} onChange={(e) => handlePlatformMarkupChange(institute.id, e.target.value)} className="w-20 px-2 py-1 border rounded-md bg-light-background dark:bg-dark-background" />
                                        <span className="ml-1">%</span>
                                        {platformMarkupRates[institute.id] !== undefined && <button onClick={() => handleSavePlatformMarkup(institute.id)} className="ml-2 text-xs text-primary hover:underline">Save</button>}
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <input type="number" value={photoCommissionRates[institute.id] ?? institute.photoCommissionRate ?? 60} onChange={(e) => handlePhotoCommissionChange(institute.id, e.target.value)} min="0" max="100" className="w-20 px-2 py-1 border rounded-md bg-light-background dark:bg-dark-background" />
                                        <span className="ml-1">%</span>
                                        {photoCommissionRates[institute.id] !== undefined && <button onClick={() => handleSavePhotoCommission(institute.id)} className="ml-2 text-xs text-primary hover:underline">Save</button>}
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center space-x-2">
                                    {institute.registrationStatus === 'pending' && (
                                        <>
                                            <button onClick={() => handleInstituteApproval(institute.id, 'approved')} className="px-2 py-1 text-xs text-white bg-green-600 rounded-md hover:bg-green-700">Approve</button>
                                            <button onClick={() => handleInstituteApproval(institute.id, 'rejected')} className="px-2 py-1 text-xs text-white bg-red-600 rounded-md hover:bg-red-700">Reject</button>
                                        </>
                                    )}
                                     <button onClick={() => handleNavigate({ name: 'admin_ti_dashboard', instituteId: institute.id })} className="text-primary hover:underline text-xs font-semibold">View Dashboard</button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );


    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">User Management</h1>
                <button
                    onClick={handleDownloadAllContacts}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                >
                    <DownloadIcon className="w-4 h-4" />
                    <span>Download All Contacts</span>
                </button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="relative flex-grow">
                    <input
                        type="text"
                        placeholder="Search by name, ID, or email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-light-border dark:border-dark-border placeholder-light-subtle dark:placeholder-dark-subtle text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-subtle dark:text-dark-subtle" />
                </div>

                {(activeTab === 'teachers' || activeTab === 'approved_teachers') && (
                    <>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="w-full md:w-48 px-3 py-2 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        >
                            <option value="all">All Status</option>
                            <option value="approved">Approved</option>
                            <option value="pending">Pending</option>
                            <option value="rejected">Rejected</option>
                        </select>
                        <input
                            type="number"
                            placeholder="Comm. %"
                            value={commissionFilter}
                            onChange={(e) => setCommissionFilter(e.target.value)}
                            className="w-full md:w-32 px-3 py-2 border border-light-border dark:border-dark-border placeholder-light-subtle dark:placeholder-dark-subtle text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </>
                )}
            </div>

             <div className="border-b border-light-border dark:border-dark-border">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('teachers')} className={`${activeTab === 'teachers' ? 'border-primary text-primary' : 'border-transparent text-light-subtle dark:text-dark-subtle hover:text-light-text'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>All Teachers ({sortedTeachers.length})</button>
                    <button onClick={() => setActiveTab('approved_teachers')} className={`${activeTab === 'approved_teachers' ? 'border-primary text-primary' : 'border-transparent text-light-subtle dark:text-dark-subtle hover:text-light-text'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Approved Teachers ({approvedTeachersList.length})</button>
                    <button onClick={() => setActiveTab('students')} className={`${activeTab === 'students' ? 'border-primary text-primary' : 'border-transparent text-light-subtle dark:text-dark-subtle hover:text-light-text'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Students ({sortedStudents.length})</button>
                    <button onClick={() => setActiveTab('institutes')} className={`${activeTab === 'institutes' ? 'border-primary text-primary' : 'border-transparent text-light-subtle dark:text-dark-subtle hover:text-light-text'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Institutes ({sortedInstitutes.length})</button>
                </nav>
            </div>
            {activeTab === 'teachers' ? renderTeacherTable(sortedTeachers) : 
             activeTab === 'approved_teachers' ? renderTeacherTable(approvedTeachersList) : 
             activeTab === 'students' ? renderStudentTable() : renderInstituteTable()}
            
            {selectedTeacher && <DefaultCoverImageModal isOpen={isCoverModalOpen} onClose={() => {setIsCoverModalOpen(false); setSelectedTeacher(null);}} teacher={selectedTeacher} onSave={(id, url) => handleSetDefaultCover(selectedTeacher, url)} defaultCoverImages={defaultCoverImages} />}
            
            {selectedUserForReferral && (
                <AssignReferralModal 
                    isOpen={isReferralModalOpen} 
                    onClose={() => { setIsReferralModalOpen(false); setSelectedUserForReferral(null); }} 
                    user={selectedUserForReferral} 
                    onAssign={handleAssignReferralCode} 
                />
            )}
        </div>
    );
};

export default UserManagement;
