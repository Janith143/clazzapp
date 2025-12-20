import React, { useState } from 'react';
import Modal from '../Modal';
import { User, IndividualClass, Sale } from '../../types';
import { CheckCircleIcon, XCircleIcon, BanknotesIcon } from '../Icons.tsx';
import { useData } from '../../contexts/DataContext';

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
    const [isPaid, setIsPaid] = useState(!!sale);

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });

    const handleMarkAttendance = async () => {
        setIsLoading(true);
        // If the student has paid (either via platform or just now at venue), status is 'paid'. Otherwise 'unpaid'.
        // The `paid_at_venue` status is only set when recording the payment itself.
        const paymentStatus = isPaid ? (sale?.paymentMethod === 'manual_at_venue' ? 'paid_at_venue' : 'paid') : 'unpaid';
        const paymentRef = sale?.id;
        await markAttendance(classInfo.id, student, paymentStatus, paymentRef);
        setIsLoading(false);
        onClose();
    };

    const handleRecordPayment = async () => {
        setIsLoading(true);
        const newSale = await recordManualPayment(classInfo, student);
        if (newSale) {
            // After recording payment, immediately mark attendance with the correct status and reference.
            await markAttendance(classInfo.id, student, 'paid_at_venue', newSale.id);
            setIsPaid(true); // Update UI to reflect payment
        }
        setIsLoading(false);
        onClose(); // Close after action
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Student Attendance">
            <div className="text-center">
                <img src={student.avatar} alt={student.firstName} className="w-24 h-24 rounded-full mx-auto shadow-lg border-2 border-primary" />
                <h2 className="text-2xl font-bold mt-4">{student.firstName} {student.lastName}</h2>
                <p className="text-sm text-light-subtle dark:text-dark-subtle">{student.id}</p>

                <div className={`mt-6 p-4 rounded-lg border ${isPaid ? 'bg-green-50 dark:bg-green-900/30 border-green-500' : 'bg-red-50 dark:bg-red-900/30 border-red-500'}`}>
                    <div className="flex items-center justify-center">
                        {isPaid ? <CheckCircleIcon className="w-6 h-6 text-green-500" /> : <XCircleIcon className="w-6 h-6 text-red-500" />}
                        <p className={`ml-2 font-semibold text-lg ${isPaid ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                            {isPaid ? 'Payment Confirmed' : 'Not Enrolled / Not Paid'}
                        </p>
                    </div>
                    {isPaid && sale && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                           <p>Paid on: {new Date(sale.saleDate).toLocaleDateString()}</p>
                           <p>Amount: {currencyFormatter.format(sale.totalAmount + sale.amountPaidFromBalance)}</p>
                        </div>
                    )}
                </div>
                
                <div className="mt-8 space-y-3">
                    <button
                        onClick={handleMarkAttendance}
                        disabled={isLoading}
                        className="w-full bg-primary text-white font-bold py-3 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Processing...' : 'Mark Attendance'}
                    </button>
                    {!isPaid && classInfo.paymentMethod === 'manual' && classInfo.fee > 0 && (
                         <button
                            onClick={handleRecordPayment}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center bg-green-600 text-white font-bold py-3 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            <BanknotesIcon className="w-5 h-5 mr-2" />
                            {isLoading ? 'Recording...' : `Record Payment (${currencyFormatter.format(classInfo.fee)})`}
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default StudentAttendanceModal;