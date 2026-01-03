import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { User, IndividualClass, Sale } from '../../types';
import { CheckCircleIcon, XCircleIcon, BanknotesIcon } from '../Icons.tsx';
import { useData } from '../../contexts/DataContext';
import { getOptimizedImageUrl } from '../../utils';

interface StudentAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: User;
    classInfo: IndividualClass;
    sale: Sale | null;
}

const StudentAttendanceModal: React.FC<StudentAttendanceModalProps> = ({ isOpen, onClose, student, classInfo, sale }) => {
    const { markAttendance, recordManualPayment } = useData();
    const [isLoading, setIsLoading] = useState(false);

    // Check enrollment status
    const isEnrolled = student.enrolledClassIds?.includes(classInfo.id);
    const [shouldEnroll, setShouldEnroll] = useState(!isEnrolled);

    // Payment state
    const [isPaid, setIsPaid] = useState(!!sale); // Previously paid
    const [paymentAction, setPaymentAction] = useState<'mark_only' | 'collect_now'>('mark_only'); // Default to just mark if not collecting

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });

    useEffect(() => {
        // Reset state on open
        if (isOpen) {
            setShouldEnroll(!student.enrolledClassIds?.includes(classInfo.id));
            setPaymentAction('mark_only');
        }
    }, [isOpen, student, classInfo]);

    const handleProcess = async () => {
        setIsLoading(true);
        try {
            let paymentStatus: 'paid_at_venue' | 'unpaid' | 'paid' = isPaid ? 'paid' : 'unpaid';
            let paymentRef = sale?.id;

            // If collecting payment now
            if (paymentAction === 'collect_now') {
                const newSale = await recordManualPayment(classInfo, student);
                if (newSale) {
                    paymentStatus = 'paid_at_venue';
                    paymentRef = newSale.id;
                    setIsPaid(true); // UI update
                } else {
                    // If payment failed, do we stop?
                    // For now, let's assume we stop or alert?
                    // recordManualPayment alerts on error.
                    setIsLoading(false);
                    return;
                }
            }

            // Mark Attendance (and enroll if checked)
            await markAttendance(classInfo.id, student, paymentStatus, paymentRef, shouldEnroll);

            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Student Attendance">
            <div className="text-center">
                <img src={getOptimizedImageUrl(student.avatar, 96, 96)} alt={student.firstName} className="w-24 h-24 rounded-full mx-auto shadow-lg border-2 border-primary" />
                <h2 className="text-2xl font-bold mt-4">{student.firstName} {student.lastName}</h2>
                <p className="text-sm text-light-subtle dark:text-dark-subtle">{student.id}</p>

                {/* Status Card */}
                <div className={`mt-6 p-4 rounded-lg border ${isPaid ? 'bg-green-50 dark:bg-green-900/30 border-green-500' : 'bg-red-50 dark:bg-red-900/30 border-red-500'}`}>
                    <div className="flex items-center justify-center">
                        {isPaid ? <CheckCircleIcon className="w-6 h-6 text-green-500" /> : <XCircleIcon className="w-6 h-6 text-red-500" />}
                        <p className={`ml-2 font-semibold text-lg ${isPaid ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                            {isPaid ? 'Payment Confirmed' : 'Not Paid'}
                        </p>
                    </div>
                    {isPaid && sale && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                            <p>Paid on: {new Date(sale.saleDate).toLocaleDateString()}</p>
                            <p>Method: {sale.paymentMethod === 'manual_at_venue' ? 'Manual' : 'Online'}</p>
                        </div>
                    )}
                </div>

                {/* Enrollment Option */}
                {!isEnrolled && (
                    <div className="mt-4 flex items-center justify-center space-x-2 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
                        <input
                            type="checkbox"
                            id="enrollCheck"
                            checked={shouldEnroll}
                            onChange={(e) => setShouldEnroll(e.target.checked)}
                            className="h-5 w-5 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <label htmlFor="enrollCheck" className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            Enroll student to this class now
                        </label>
                    </div>
                )}

                {/* Payment Action Selection (Only if not already paid and fee > 0) */}
                {!isPaid && classInfo.fee > 0 && (
                    <div className="mt-6 text-left">
                        <p className="text-sm font-medium mb-2">Action:</p>
                        <div className="space-y-2">
                            <label className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${paymentAction === 'mark_only' ? 'border-primary bg-primary/5' : 'border-light-border dark:border-dark-border'}`}>
                                <input
                                    type="radio"
                                    name="paymentAction"
                                    value="mark_only"
                                    checked={paymentAction === 'mark_only'}
                                    onChange={() => setPaymentAction('mark_only')}
                                    className="h-4 w-4 text-primary focus:ring-primary"
                                />
                                <div className="ml-3">
                                    <span className="block text-sm font-medium">Mark Attendance Only</span>
                                    <span className="block text-xs text-light-subtle dark:text-dark-subtle">Record as Unpaid</span>
                                </div>
                            </label>

                            <label className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${paymentAction === 'collect_now' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-light-border dark:border-dark-border'}`}>
                                <input
                                    type="radio"
                                    name="paymentAction"
                                    value="collect_now"
                                    checked={paymentAction === 'collect_now'}
                                    onChange={() => setPaymentAction('collect_now')}
                                    className="h-4 w-4 text-green-600 focus:ring-green-500"
                                />
                                <div className="ml-3">
                                    <span className="block text-sm font-medium text-green-700 dark:text-green-300">Collect Payment Now</span>
                                    <span className="block text-xs text-green-600 dark:text-green-400">Collect {currencyFormatter.format(classInfo.fee)} Cash</span>
                                </div>
                            </label>

                            {/* Option for Online Payment Link? (Future: Show QR for online pay?) */}
                            {classInfo.onlinePaymentEnabled && (
                                <div className="mt-2 text-xs text-center text-primary">
                                    Student can also pay via their portal online.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="mt-8">
                    <button
                        onClick={handleProcess}
                        disabled={isLoading}
                        className={`w-full bg-primary text-white font-bold py-3 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center`}
                    >
                        {isLoading ? 'Processing...' : (
                            paymentAction === 'collect_now' ? (
                                <>
                                    <BanknotesIcon className="w-5 h-5 mr-2" />
                                    Collect & Mark Attendance
                                </>
                            ) : 'Confirm Attendance'
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default StudentAttendanceModal;