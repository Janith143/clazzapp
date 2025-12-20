
import { useCallback } from 'react';
import { User, BillingDetails } from '../../types';
import { NavigationContextType } from '../../contexts/NavigationContext';

interface ExternalPaymentActionsDeps {
    nav: NavigationContextType;
}

export const useExternalPaymentActions = (deps: ExternalPaymentActionsDeps) => {
    const { nav } = deps;
    
    const handleExternalTopUpRequest = useCallback((students: Pick<User, 'id' | 'firstName' | 'lastName'>[], amountPerStudent: number, billingDetails: BillingDetails) => {
        const totalAmount = students.length * amountPerStudent;
        nav.handleNavigate({
            name: 'payment_redirect',
            payload: {
                type: 'external_topup',
                students,
                amountPerStudent,
                totalAmount,
                billingDetails
            }
        });
    }, [nav.handleNavigate]);
    
    return { handleExternalTopUpRequest };
};
