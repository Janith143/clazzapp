export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface IdVerification {
    status: VerificationStatus;
    frontImageUrl?: string;
    backImageUrl?: string;
    requestNote?: string;
    rejectionReason?: string;
}

export interface BankVerification {
    status: VerificationStatus;
    imageUrl?: string;
    requestNote?: string;
    rejectionReason?: string;
}
