import React, { useRef } from 'react';
import Modal from './Modal.tsx';
import { Teacher, Withdrawal } from '../types.ts';
import { LogoIcon, DownloadIcon } from './Icons.tsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface WithdrawalInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher;
  withdrawal: Withdrawal;
}

const WithdrawalInvoiceModal: React.FC<WithdrawalInvoiceModalProps> = ({ isOpen, onClose, teacher, withdrawal }) => {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = () => {
    const input = invoiceRef.current;
    if (input) {
      html2canvas(input, { scale: 2 })
        .then(canvas => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`payout-invoice-${withdrawal.id}.pdf`);
        });
    }
  };

  if (!isOpen) return null;

  const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });
  const processedDate = withdrawal.processedAt ? new Date(withdrawal.processedAt).toLocaleDateString() : 'N/A';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Payout Invoice #${withdrawal.id}`}>
      <div>
        <div ref={invoiceRef} className="p-8 space-y-8 text-sm bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-lg">PAYMENT VOUCHER</p>
                    <p className="text-light-subtle dark:text-dark-subtle">From:</p>
                    <div className="flex items-center space-x-2 mt-1">
                        <LogoIcon className="h-8 w-8" />
                        <span className="text-xl font-bold">clazz.<span className="text-primary">lk</span></span>
                    </div>
                </div>
                <div className="text-right">
                    <p>Invoice #: {withdrawal.id}</p>
                    <p>Date Issued: {processedDate}</p>
                </div>
            </div>

            <div>
                <p className="font-semibold text-light-subtle dark:text-dark-subtle">Paid To:</p>
                <p className="font-bold text-lg">{teacher.name}</p>
                <p>{teacher.email}</p>
                {teacher.payoutDetails && (
                    <div className="text-xs mt-1 text-light-subtle dark:text-dark-subtle">
                        <p>{teacher.payoutDetails.bankName} - {teacher.payoutDetails.branchName}</p>
                        <p>A/C: **** **** {teacher.payoutDetails.accountNumber.slice(-4)}</p>
                    </div>
                )}
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-light-background dark:bg-dark-background">
                        <tr>
                            <th className="px-4 py-2 text-left font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Description</th>
                            <th className="px-4 py-2 text-right font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-light-border dark:border-dark-border text-light-text dark:text-dark-text">
                            <td className="px-4 py-3">
                                <p className="font-semibold">Payout for services rendered on clazz.lk</p>
                                <p className="text-xs text-light-subtle dark:text-dark-subtle">Request Date: {new Date(withdrawal.requestedAt).toLocaleDateString()}</p>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">{currencyFormatter.format(withdrawal.amount)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end mt-4">
                <div className="w-full max-w-sm space-y-2">
                    <div className="flex justify-between font-bold text-xl pt-2 border-t-2 border-light-text dark:border-dark-text">
                        <span>Total Paid</span>
                        <span>{currencyFormatter.format(withdrawal.amount)}</span>
                    </div>
                </div>
            </div>
            
            <p className="text-center text-xs text-light-subtle dark:text-dark-subtle pt-6">
                This is a computer-generated document. Thank you for being a part of the clazz.lk community.
            </p>
        </div>
         <div className="p-4 bg-light-background dark:bg-dark-background border-t border-light-border dark:border-dark-border flex justify-end">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default WithdrawalInvoiceModal;