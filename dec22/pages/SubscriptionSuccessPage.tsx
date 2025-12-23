import React from 'react';
import { useUI } from '../contexts/UIContext.tsx';
import { CheckCircleIcon, LogoIcon } from '../components/Icons.tsx';
import { BillingDetails } from '../types.ts';

interface SubscriptionSuccessPageProps {
    planLevel: number;
    amount: number;
    transactionId: string;
    billingDetails: BillingDetails;
    refCode: string;
}

const SubscriptionSuccessPage: React.FC<SubscriptionSuccessPageProps> = ({ planLevel, amount, transactionId, billingDetails, refCode }) => {
    const { setModalState } = useUI();
    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 });

    const handleCreateAccount = () => {
        setModalState({
            name: 'register',
            userType: 'user',
            initialRole: 'teacher',
            refCode: refCode,
            preventRedirect: false,
            // We pass the billing details as initial data for the registration form
            prefillData: {
                firstName: billingDetails.billingFirstName,
                lastName: billingDetails.billingLastName,
                email: billingDetails.billingEmail,
                contactNumber: billingDetails.billingContactNumber
            }
        });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-light-background dark:bg-dark-background p-4 animate-fadeIn">
             <div className="bg-light-surface dark:bg-dark-surface p-8 rounded-2xl shadow-xl max-w-lg w-full text-center border border-light-border dark:border-dark-border">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <CheckCircleIcon className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                </div>
                
                <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-2">Payment Successful!</h1>
                <p className="text-lg text-light-subtle dark:text-dark-subtle mb-6">
                    Thank you for subscribing to our <strong>{planLevel === 1 ? 'Pro' : 'Premium'} Teacher Plan</strong>.
                </p>

                <div className="bg-light-background dark:bg-dark-background p-4 rounded-lg border border-light-border dark:border-dark-border text-left mb-8 space-y-2">
                    <div className="flex justify-between">
                        <span className="text-light-subtle dark:text-dark-subtle">Amount Paid:</span>
                        <span className="font-bold text-primary">{currencyFormatter.format(amount)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-light-subtle dark:text-dark-subtle">Transaction ID:</span>
                        <span className="font-mono text-sm">{transactionId}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-light-subtle dark:text-dark-subtle">Payer Name:</span>
                        <span className="font-medium">{billingDetails.billingFirstName} {billingDetails.billingLastName}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-sm font-medium text-light-text dark:text-dark-text">
                        To activate your features, please create your teacher account now using the details you provided.
                    </p>
                    <button 
                        onClick={handleCreateAccount}
                        className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-dark transition-transform hover:scale-105 shadow-lg shadow-primary/30"
                    >
                        Create Your Account
                    </button>
                </div>
             </div>
        </div>
    );
};

export default SubscriptionSuccessPage;