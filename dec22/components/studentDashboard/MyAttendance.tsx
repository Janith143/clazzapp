import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { AttendanceRecord, User } from '../../types';
import { CheckCircleIcon, BanknotesIcon, XCircleIcon } from '../Icons.tsx';

interface MyAttendanceProps {
    user: User;
}

const StatusIcon: React.FC<{ status: AttendanceRecord['paymentStatus'] }> = ({ status }) => {
    switch (status) {
        case 'paid':
            return <span title="Paid via Platform"><CheckCircleIcon className="w-5 h-5 text-green-500" /></span>;
        case 'paid_at_venue':
            return <span title="Paid at Venue"><BanknotesIcon className="w-5 h-5 text-blue-500" /></span>;
        case 'unpaid':
            return <span title="Unpaid"><XCircleIcon className="w-5 h-5 text-red-500" /></span>;
        default:
            return null;
    }
};

const MyAttendance: React.FC<MyAttendanceProps> = ({ user }) => {
    const { teachers } = useData();

    const myAttendanceRecords = useMemo(() => {
        if (!user) return [];

        const records: (AttendanceRecord & { classTitle: string, classSubject: string })[] = [];

        teachers.forEach(teacher => {
            teacher.individualClasses.forEach(classInfo => {
                if (classInfo.attendance) {
                    classInfo.attendance.forEach(record => {
                        if (record.studentId === user.id) {
                            records.push({
                                ...record,
                                classTitle: classInfo.title,
                                classSubject: classInfo.subject,
                            });
                        }
                    });
                }
            });
        });

        return records.sort((a, b) => new Date(b.attendedAt).getTime() - new Date(a.attendedAt).getTime());
    }, [user, teachers]);

    return (
        <div className="bg-light-surface dark:bg-dark-surface p-4 rounded-lg shadow-md overflow-x-auto">
            <h3 className="text-xl font-bold mb-4 px-2">My Attendance Log</h3>
            {myAttendanceRecords.length > 0 ? (
                <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                    <thead className="bg-light-background dark:bg-dark-background">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Class</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Time</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Payment Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-light-border dark:divide-dark-border">
                        {myAttendanceRecords.map((record, index) => (
                            <tr key={`${record.studentId}-${record.attendedAt}-${index}`} className="text-light-text dark:text-dark-text">
                                <td className="px-4 py-3">
                                    <p className="font-medium">{record.classTitle}</p>
                                    <p className="text-xs text-light-subtle dark:text-dark-subtle">{record.classSubject}</p>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(record.attendedAt).toLocaleDateString()}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(record.attendedAt).toLocaleTimeString()}</td>
                                <td className="px-4 py-3 text-center">
                                    <StatusIcon status={record.paymentStatus} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">This student has no attendance records yet.</p>
            )}
        </div>
    );
};

export default MyAttendance;