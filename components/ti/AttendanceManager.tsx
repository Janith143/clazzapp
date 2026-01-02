import React, { useState, useMemo } from 'react';
import { IndividualClass, Sale, User, AttendanceRecord } from '../../types';
import { getOptimizedImageUrl } from '../../utils';
import { CheckCircleIcon, XCircleIcon, SpinnerIcon, BanknotesIcon } from '../Icons';
import { useData } from '../../contexts/DataContext';

interface AttendanceManagerProps {
    classInfo: IndividualClass;
    enrolledStudents: {
        student: User;
        sale: Sale;
    }[];
}

const AttendanceManager: React.FC<AttendanceManagerProps> = ({ classInfo, enrolledStudents }) => {
    const { markAttendance, removeAttendance } = useData();
    const [loadingStudent, setLoadingStudent] = useState<string | null>(null);

    const attendanceMap = useMemo(() => {
        const map = new Map<string, AttendanceRecord>();
        if (classInfo.attendance) {
            classInfo.attendance.forEach(record => {
                map.set(record.studentId, record);
            });
        }
        return map;
    }, [classInfo.attendance]);

    const handleToggleAttendance = async (student: User, sale: Sale) => {
        if (loadingStudent) return;
        setLoadingStudent(student.id);

        try {
            if (attendanceMap.has(student.id)) {
                // Already present -> Mark Absent (Remove)
                await removeAttendance(classInfo.id, student.id);
            } else {
                // Absent -> Mark Present
                // Determine payment status
                let paymentStatus: AttendanceRecord['paymentStatus'] = 'unpaid';
                if (sale.status === 'completed') {
                    paymentStatus = sale.paymentMethod === 'manual_at_venue' ? 'paid_at_venue' : 'paid';
                }

                await markAttendance(classInfo.id, student, paymentStatus, sale.id);
            }
        } catch (error) {
            console.error("Failed to toggle attendance", error);
        } finally {
            setLoadingStudent(null);
        }
    };

    const sortedStudents = useMemo(() => {
        return [...enrolledStudents].sort((a, b) => {
            const isAPresent = attendanceMap.has(a.student.id);
            const isBPresent = attendanceMap.has(b.student.id);

            // Present students first
            if (isAPresent && !isBPresent) return -1;
            if (!isAPresent && isBPresent) return 1;

            // Then alphabetical
            return (a.student.firstName || '').localeCompare(b.student.firstName || '');
        });
    }, [enrolledStudents, attendanceMap]);

    const totalEnrolled = enrolledStudents.length;
    const totalPresent = attendanceMap.size;

    return (
        <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-bold text-light-text dark:text-dark-text">Attendance Roll Call</h4>
                <div className="text-sm font-medium">
                    <span className="text-green-600 dark:text-green-400">{totalPresent}</span>
                    <span className="text-light-subtle dark:text-dark-subtle"> / {totalEnrolled} Present</span>
                </div>
            </div>

            <div className="overflow-x-auto max-h-[60vh]">
                <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                    <thead className="bg-light-background dark:bg-dark-background sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Student</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Enrollment</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-light-border dark:divide-dark-border">
                        {sortedStudents.length > 0 ? sortedStudents.map(({ student, sale }) => {
                            const isPresent = attendanceMap.has(student.id);
                            const record = attendanceMap.get(student.id);
                            const isLoading = loadingStudent === student.id;

                            return (
                                <tr key={student.id} className={`transition-colors ${isPresent ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center">
                                            <img src={getOptimizedImageUrl(student.avatar, 32, 32)} alt={student.firstName} className="w-8 h-8 rounded-full mr-3" />
                                            <div>
                                                <p className="font-medium text-light-text dark:text-dark-text">{student.firstName} {student.lastName}</p>
                                                <p className="text-xs text-light-subtle dark:text-dark-subtle">{student.email || student.contactNumber}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-xs">
                                            <p className="text-light-text dark:text-dark-text capitalize">{(sale.paymentMethod || 'unknown').replace(/_/g, ' ')}</p>
                                            <p className="text-light-subtle dark:text-dark-subtle">{new Date(sale.saleDate).toLocaleDateString()}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {isPresent ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                                                Present
                                                {record?.paymentStatus === 'paid_at_venue' && <span title="Paid at Venue"><BanknotesIcon className="w-3 h-3 ml-1" /></span>}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                Absent
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => handleToggleAttendance(student, sale)}
                                            disabled={isLoading}
                                            className={`p-2 rounded-full transition-colors ${isPresent
                                                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                }`}
                                            title={isPresent ? "Mark Absent" : "Mark Present"}
                                        >
                                            {isLoading ? (
                                                <SpinnerIcon className="w-5 h-5 animate-spin text-primary" />
                                            ) : isPresent ? (
                                                <XCircleIcon className="w-6 h-6" />
                                            ) : (
                                                <CheckCircleIcon className="w-6 h-6" />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={4} className="text-center py-8 text-light-subtle dark:text-dark-subtle">
                                    No students enrolled yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AttendanceManager;
