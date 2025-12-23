export type TopUpMethod = 'gateway' | 'slip' | 'voucher';

export type PaymentMethod = 'card' | 'ezcash' | 'mcash' | 'frimi' | 'qr' | 'direct_bank';

export interface TopUpRequest {
    id: string;
    studentId: string;
    method: TopUpMethod;
    amount: number;
    originalAmount?: number;
    imageUrl?: string; // For slip method
    voucherCode?: string; // For voucher method
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string;
    processedAt?: string;
    rejectionReason?: string;
}

export interface MonthlyReferralEarning {
    year: number;
    month: number; // 0-11
    netPlatformIncome: number;
    commissionRate: number;
    earnings: number;
    status: 'pending' | 'processed';
}

export interface Withdrawal {
    id: string;
    userId: string;
    amount: number;
    requestedAt: string;
    processedAt?: string;
    status: 'pending' | 'completed' | 'failed';
    notes?: string;
}

export interface PayoutDetails {
    bankName: string;
    branchName: string;
    accountHolderName: string;
    accountNumber: string;
}

export type BillingDetails = {
    billingFirstName: string;
    billingLastName: string;
    billingEmail: string;
    billingContactNumber: string;
    billingAddressLineOne: string;
    billingCity?: string;
    billingState?: string;
    billingPostalCode?: string;
    billingCountry?: string;
};

export interface FinancialSettings {
    referralGatewayFeeRate: number;
    referralPlatformCostRate: number;
    referralMaxEarning: number;
    referralBaseRate: number;
    referralTier1Threshold: number;
    referralTier1Rate: number;
    referralTier2Threshold: number;
    referralTier2Rate: number;
    referralTier3Threshold: number;
    referralTier3Rate: number;
    manualPaymentPlatformFee: number;
}

export interface PaymentGatewaySettings {
    activePaymentGateway: 'webxpay' | 'marxipg';
    methodMapping: Record<PaymentMethod, 'webxpay' | 'marxipg'>;
    methodLogos?: Partial<Record<PaymentMethod, string>>;
    gateways: {
        webxpay: {
            secretKey: string;
            publicKey: string;
            baseUrl?: string; // Optional for backward compatibility initally
        };
        marxipg: {
            apiKey: string;
            baseUrl?: string;
        };
    };
}

export interface Voucher {
    id: string;
    code: string;
    amount: number;
    isUsed: boolean;
    usedBy?: string | null; // studentId
    usedAt?: string | null; // ISO date string
    billingFirstName: string;
    billingLastName: string;
    billingEmail: string;
    billingContactNumber: string;
    billingAddressLineOne: string;
    billingAddressLineTwo?: string;
    billingCity?: string;
    billingState?: string;
    billingPostalCode?: string;
    billingCountry?: string;
    cardSenderName?: string;
    recipientName?: string;
    recipientEmail?: string;
    message?: string;
    purchasedAt: string;
    expiresAt: string;
    // New fields for admin generated vouchers
    assignedToUserId?: string; // If assigned directly to a student
    isCollected?: boolean; // If assigned, has the student "collected" it to reveal code
    generatedByAdmin?: boolean;
    redemptionRules?: string; // Rules for usage (e.g. "Only for Grade 10 Math")
    title?: string;
}