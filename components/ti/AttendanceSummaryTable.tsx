import React from 'react';
import { IndividualClass, AttendanceRecord } from '../../types.ts';
import { CheckCircleIcon, BanknotesIcon, XCircleIcon } from '../Icons.tsx';
import { getOptimizedImageUrl } from '../../utils';

interface AttendanceSummaryTableProps {
    classInfo: IndividualClass;
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

const AttendanceSummaryTable: React.FC<AttendanceSummaryTableProps> = ({ classInfo }) => {
    const attendance = classInfo.attendance || [];

    const totalAttended = attendance.length;
    const paidPlatform = attendance.filter(a => a.paymentStatus === 'paid').length;
    const paidVenue = attendance.filter(a => a.paymentStatus === 'paid_at_venue').length;
    const unpaid = attendance.filter(a => a.paymentStatus === 'unpaid').length;

    return (
        <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
                <div className="p-3 bg-light-background dark:bg-dark-background rounded-lg">
                    <p className="text-2xl font-bold text-light-text dark:text-dark-text">{totalAttended}</p>
                    <p className="text-sm font-medium text-light-subtle dark:text-dark-subtle">Total Attended</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{paidPlatform}</p>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Paid (Platform)</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{paidVenue}</p>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Paid (Venue)</p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{unpaid}</p>
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">Unpaid</p>
                </div>
            </div>

            <h4 className="text-lg font-semibold mb-2 text-light-text dark:text-dark-text">Attendance Log</h4>
            <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                    <thead className="bg-light-background dark:bg-dark-background sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">#</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Student</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Time</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-light-border dark:divide-dark-border">
                        {attendance.length > 0 ? [...attendance].sort((a, b) => new Date(b.attendedAt).getTime() - new Date(a.attendedAt).getTime()).map((record, index) => (
                            <tr key={record.studentId} className="text-light-text dark:text-dark-text">
                                <td className="px-4 py-3">{index + 1}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center">
                                        <img src={getOptimizedImageUrl(record.studentAvatar, 32, 32)} alt={record.studentName} className="w-8 h-8 rounded-full mr-3" />
                                        <div>
                                            <p className="font-medium text-light-text dark:text-dark-text">{record.studentName}</p>
                                            <p className="text-xs text-light-subtle dark:text-dark-subtle">{record.studentId}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(record.attendedAt).toLocaleDateString()}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(record.attendedAt).toLocaleTimeString()}</td>
                                <td className="px-4 py-3 text-center">
                                    <StatusIcon status={record.paymentStatus} />
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-light-subtle dark:text-dark-subtle">No attendance records for this class yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AttendanceSummaryTable;
