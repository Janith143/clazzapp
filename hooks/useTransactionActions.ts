
import {
    User, Sale, Course, IndividualClass, Quiz, Voucher, BillingDetails, PageState, Event, Teacher, TopUpRequest, TuitionInstitute, CartItem, ProductCartItem, Product, PhotoCartItem, Photo
} from '../types';
import { UIContextType } from '../contexts/UIContext';
import { AuthContextType } from '../contexts/AuthContext';
import { NavigationContextType } from '../contexts/NavigationContext';

import { useEnrollmentActions } from './transactions/useEnrollmentActions';
import { useBalanceActions } from './transactions/useBalanceActions';
import { useVoucherActions } from './transactions/useVoucherActions';
import { usePaymentResponseHandler } from './transactions/usePaymentResponseHandler';
import { useFinancialManagementActions } from './transactions/useFinancialManagementActions';
import { useExternalPaymentActions } from './transactions/useExternalPaymentActions';

interface TransactionActionDeps {
    currentUser: User | null;
    ui: UIContextType;
    auth: AuthContextType;
    nav: NavigationContextType;
    currencyFormatter: Intl.NumberFormat;
    users: User[];
    teachers: Teacher[];
    tuitionInstitutes: TuitionInstitute[];
    sales: Sale[];
    vouchers: Voucher[];
    handleImageSave: (base64: string, type: any, context?: any) => Promise<string | void>;
    handleUpdateUser: (updatedUser: Partial<User> & { id: string }) => Promise<void>;
}

export const useTransactionActions = (deps: TransactionActionDeps) => {
    const { handleEnroll } = useEnrollmentActions(deps);
    const { handleTopUpWithGateway, handleTopUpWithSlip } = useBalanceActions(deps);
    const { handleVoucherPurchaseRequest, handleRedeemVoucher } = useVoucherActions(deps);
    const { handlePaymentResponse } = usePaymentResponseHandler(deps);
    const { handleRequestAffiliateWithdrawal, handleRefundSale } = useFinancialManagementActions(deps);
    const { handleExternalTopUpRequest } = useExternalPaymentActions(deps);

    return {
        handleEnroll,
        handlePaymentResponse,
        handleTopUpWithGateway,
        handleTopUpWithSlip,
        handleRedeemVoucher,
        handleVoucherPurchaseRequest,
        handleExternalTopUpRequest,
        handleRequestAffiliateWithdrawal,
        handleRefundSale,
    };
};
