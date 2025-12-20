import React, { useRef } from 'react';
import Modal from './Modal.tsx';
import { Sale } from '../types.ts';
import { LogoIcon, DownloadIcon } from './Icons.tsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: Sale | null;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, saleData }) => {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = () => {
    const input = invoiceRef.current;
    if (input && saleData) {
      html2canvas(input, { scale: 2 })
        .then(canvas => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          const y = 0;
          pdf.addImage(imgData, 'PNG', 0, y, pdfWidth, pdfHeight);
          pdf.save(`invoice-${saleData.id}.pdf`);
        });
    }
  };

  if (!isOpen || !saleData) return null;

  const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });
  const fullItemPrice = saleData.totalAmount + saleData.amountPaidFromBalance;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Invoice #${saleData.id}`}>
      <div>
        <div ref={invoiceRef} className="p-6 space-y-6 text-sm bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center space-x-2">
                        <LogoIcon className="h-8 w-8" />
                        <span className="text-xl font-bold">clazz.<span className="text-primary">lk</span></span>
                    </div>
                    <p className="text-light-subtle dark:text-dark-subtle">Your learning partner.</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg">INVOICE</p>
                    <p>Date: {new Date(saleData.saleDate).toLocaleDateString()}</p>
                </div>
            </div>

            <div>
                <p className="font-semibold">Billed To:</p>
                <p>Student ID: {saleData.studentId}</p>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-light-background dark:bg-dark-background">
                        <tr>
                            <th className="px-4 py-2 text-left font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Description</th>
                            <th className="px-4 py-2 text-right font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="text-light-text dark:text-dark-text">
                        <tr className="border-b border-light-border dark:border-dark-border">
                            <td className="px-4 py-2">
                            <p className="font-semibold">{saleData.itemName}</p>
                            <p className="text-xs text-light-subtle dark:text-dark-subtle capitalize">{saleData.itemType} Purchase</p>
                            </td>
                            <td className="px-4 py-2 text-right">{currencyFormatter.format(fullItemPrice)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between text-light-text dark:text-dark-text">
                        <span className="text-light-subtle dark:text-dark-subtle">Subtotal</span>
                        <span>{currencyFormatter.format(fullItemPrice)}</span>
                    </div>
                    {saleData.amountPaidFromBalance > 0 && (
                        <div className="flex justify-between text-green-600 dark:text-green-400">
                            <span>Paid from Account Balance</span>
                            <span>- {currencyFormatter.format(saleData.amountPaidFromBalance)}</span>
                        </div>
                    )}
                     {saleData.totalAmount > 0 && (
                         <div className="flex justify-between text-light-text dark:text-dark-text">
                            <span className="text-light-subtle dark:text-dark-subtle">Paid via Gateway</span>
                            <span>{currencyFormatter.format(saleData.totalAmount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-light-border dark:border-dark-border text-light-text dark:text-dark-text">
                        <span>Total Paid</span>
                        <span>{currencyFormatter.format(fullItemPrice)}</span>
                    </div>
                </div>
            </div>
            
            <p className="text-center text-xs text-light-subtle dark:text-dark-subtle pt-4">
                Thank you for your purchase! If you have any questions, please contact support.
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

export default InvoiceModal;