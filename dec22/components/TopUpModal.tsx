import React, { useState } from 'react';
import Modal from './Modal.tsx';
import ImageUploadInput from './ImageUploadInput.tsx';
import FormInput from './FormInput.tsx';
import { useData } from '../contexts/DataContext.tsx';
import { BanknotesIcon, UploadIcon, TicketIcon, SpinnerIcon } from './Icons.tsx';
import PaymentMethodSelector from './PaymentMethodSelector.tsx';
import { PaymentMethod } from '../types.ts';

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TopUpTab = 'gateway' | 'deposit' | 'voucher';

const TopUpModal: React.FC<TopUpModalProps> = ({ isOpen, onClose }) => {
    const { handleTopUpWithGateway, handleTopUpWithSlip, handleRedeemVoucher } = useData();
    const [activeTab, setActiveTab] = useState<TopUpTab>('gateway');
    const [amount, setAmount] = useState('');
    const [slipImage, setSlipImage] = useState<string | null>(null);
    const [voucherCode, setVoucherCode] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPaymentSelector, setShowPaymentSelector] = useState(false);

    const handleGatewayStepOne = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError('Please enter a valid amount.');
            return;
        }
        setShowPaymentSelector(true);
    };

    const handlePaymentMethodSelected = (method: PaymentMethod) => {
        const numAmount = parseFloat(amount);
        handleTopUpWithGateway(numAmount, method);
        setShowPaymentSelector(false);
        onClose();
    };

    const handleSlipSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError('Please enter a valid amount.');
            return;
        }
        if (!slipImage) {
            setError('Please upload an image of your deposit slip.');
            return;
        }
        handleTopUpWithSlip(numAmount, slipImage);
        onClose();
    };

    const handleVoucherSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!voucherCode.trim()) {
            setError('Please enter a voucher code.');
            return;
        }
        
        setIsSubmitting(true);
        const success = await handleRedeemVoucher(voucherCode);
        setIsSubmitting(false);

        if (success) {
            onClose();
        }
    };

    const renderTabContent = () => {
        switch(activeTab) {
            case 'gateway':
                return (
                    <form onSubmit={handleGatewayStepOne} className="space-y-4">
                        <p className="text-sm text-center text-light-subtle dark:text-dark-subtle">Enter the amount you wish to add to your account balance.</p>
                        <FormInput label="Amount (LKR)" name="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} required min={100} />
                        <div className="pt-2">
                             <button type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-md hover:bg-primary-dark transition-colors">
                                Continue to Payment
                            </button>
                        </div>
                    </form>
                );
            case 'deposit':
                return (
                     <form onSubmit={handleSlipSubmit} className="space-y-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 rounded-r-md text-blue-800 dark:text-blue-200 text-sm">
                            <h4 className="font-bold">Instructions:</h4>
                            <ol className="list-decimal list-inside mt-2 space-y-1">
                                <li>
                                Deposit your desired amount to our bank account:<br />
                                <strong className="font-mono">
                                    Bank:</strong> Sampath Bank<br />
                                <strong className="font-mono">
                                    Account Name:</strong> PANORALINK BUSINESS SOLUTIONS (PVT) LTD<br />
                                <strong className="font-mono">
                                    Account Number:</strong> <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>004610004410</span><br />
                                </li>
                                <li>Upload a clear photo or screenshot of the deposit slip/confirmation.</li>
                                <li>Enter the exact amount you deposited below.</li>
                            </ol>
                        </div>
                        <FormInput label="Deposited Amount (LKR)" name="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} required />
                        <ImageUploadInput label="Upload Deposit Slip" currentImage={slipImage} onImageChange={setSlipImage} aspectRatio="aspect-video" />
                         <div className="pt-2">
                             <button type="submit" disabled={!slipImage || !amount} className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50">
                                <UploadIcon className="w-5 h-5 mr-2" />
                                Submit for Verification
                            </button>
                        </div>
                    </form>
                );
            case 'voucher':
                return (
                     <form onSubmit={handleVoucherSubmit} className="space-y-4">
                        <p className="text-sm text-center text-light-subtle dark:text-dark-subtle">Enter the code from your gift voucher to redeem its value to your account balance.</p>
                        <FormInput label="Voucher Code" name="voucherCode" type="text" value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())} required placeholder="GIFTXXXX" />
                         <div className="pt-2">
                             <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50">
                                {isSubmitting ? <SpinnerIcon className="w-5 h-5 mr-2" /> : <TicketIcon className="w-5 h-5 mr-2" />}
                                {isSubmitting ? 'Redeeming...' : 'Redeem Voucher'}
                            </button>
                        </div>
                    </form>
                );
        }
    }

    const tabs = [
        { id: 'gateway', label: 'Online Payment' },
        { id: 'deposit', label: 'Bank Deposit' },
        { id: 'voucher', label: 'Redeem Voucher' }
    ];

    return (
        <>
            <Modal isOpen={isOpen && !showPaymentSelector} onClose={onClose} title="Top Up Your Account Balance">
                <div className="space-y-6">
                    <div className="border-b border-light-border dark:border-dark-border">
                        <nav className="-mb-px flex justify-center space-x-4" aria-label="Tabs">
                            {tabs.map(tab => (
                                <button key={tab.id} onClick={() => { setActiveTab(tab.id as TopUpTab); setError(''); }} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-light-subtle dark:text-dark-subtle hover:text-light-text'}`}>{tab.label}</button>
                            ))}
                        </nav>
                    </div>
                    {error && <p className="text-sm text-red-500 text-center -mb-2">{error}</p>}
                    <div>{renderTabContent()}</div>
                </div>
            </Modal>
            {showPaymentSelector && (
                <Modal isOpen={true} onClose={() => setShowPaymentSelector(false)} title="Select Payment Method">
                    <PaymentMethodSelector onSelect={handlePaymentMethodSelected} />
                </Modal>
            )}
        </>
    );
};

export default TopUpModal;