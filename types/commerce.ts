import type { Address, ContactInfo } from './base';
import { AttendanceRecord, Course, IndividualClass, Product, Quiz } from './content';
import { PayoutDetails, Withdrawal, BillingDetails } from './payment';
import { CustomClassRequest } from './customRequest';

export type EventCategory = 'Workshop' | 'Seminar' | 'Exhibition' | 'Competition' | 'Camp' | 'Class Series' | 'Award Ceremony' | 'School Event';

export interface Photo {
    id: string;
    url_thumb: string;
    url_highres: string;
    photographer?: string;
    tags?: string[];
}

export interface PhotoPrintOption {
    id: string;
    size: string; // e.g., "4x6", "A4"
    price: number;
}

export interface BulkDiscount {
    id: string;
    quantity: number;
    discountPercent: number; // e.g., 10 for 10%
}

export interface PhotoGallerySettings {
    isEnabled: boolean;
    googleDriveLink?: string;
    downloadPrice?: number;
    downloadPriceHighRes?: number;
    bulkDiscounts?: BulkDiscount[];
    photos?: Photo[];
}

export type ProductCartItem = {
    type: 'product';
    id: string; // unique cart instance id
    product: Product;
    quantity: number;
};

export type PhotoCartItem = {
    type: 'photo_download' | 'photo_download_highres' | 'photo_print';
    id: string; // unique cart instance id
    photo: Photo;
    printOption?: PhotoPrintOption; // Only for 'photo_print'
    eventId: string;
    instituteId: string;
    quantity: number;
    price: number;
};

export type CartItem = ProductCartItem | PhotoCartItem;

export interface Event {
    id: string;
    organizerId: string;
    organizerType: 'tuition_institute' | 'teacher';
    title: string;
    description: string;
    flyerImage: string;
    category: EventCategory;
    mode: 'Online' | 'Physical' | 'Hybrid';
    venue?: string;
    address?: Address;
    googleMapsLink?: string;
    onlineLink?: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    registrationDeadline: string;
    duration: string;
    tickets: {
        price: number;
        maxParticipants: number | null;
    };
    participatingTeacherIds: string[];
    status: 'scheduled' | 'live' | 'finished' | 'canceled';
    adminApproval: 'not_requested' | 'pending' | 'approved' | 'rejected';
    isPublished: boolean;
    attendees?: AttendanceRecord[];
    isDeleted?: boolean;
    gallery?: PhotoGallerySettings;
}

export interface TuitionInstitute {
    id: string;
    userId: string;
    name: string;
    address: Address;
    contact: ContactInfo;
    commissionRate: number;
    platformMarkupRate: number;
    manualAttendanceFee?: number; // Fixed fee for manual attendance
    photoCommissionRate?: number;
    registrationStatus: 'pending' | 'approved' | 'rejected';
    earnings: {
        total: number;
        withdrawn: number;
        available: number;
        pending?: number;
        processedPayouts?: string[];
    };
    withdrawalHistory: Withdrawal[];
    payoutDetails?: PayoutDetails | null;
    teacherManualBalances?: { [teacherId: string]: { balance: number; teacherName: string; lastReset?: string } };
    linkedTeacherIds?: string[];
    linkedTeacherCommissions?: { [teacherId: string]: number };
    events?: Event[];
}

export interface Sale {
    id: string;
    studentId: string;
    teacherId?: string;
    instituteId?: string;
    itemId: string | number;
    itemType: 'course' | 'class' | 'quiz' | 'event' | 'marketplace_purchase' | 'photo_purchase' | 'additional_service' | 'custom_class';
    itemName: string;
    totalAmount: number;
    amountPaidFromBalance: number;
    teacherCommission?: number;
    instituteCommission?: number;
    platformCommission?: number;
    sellerPayouts?: { [sellerId: string]: number };
    saleDate: string;
    currency: 'LKR';
    status: 'completed' | 'refunded' | 'hold' | 'failed' | 'cleared' | 'canceled';
    paymentMethod?: 'gateway' | 'balance' | 'manual_at_venue';
    itemSnapshot?: Course | IndividualClass | Quiz | Event | Product | AdditionalService | CustomClassRequest;
    cartItems?: CartItem[];
    photoOrderStatus?: 'pending' | 'processing' | 'shipped' | 'delivered';
    physicalOrderStatus?: 'pending' | 'processing' | 'shipped' | 'delivered';
    shippingAddress?: Address;
    billingDetails?: BillingDetails;
    purchaseMetadata?: {
        type: 'full' | 'month' | 'session' | 'installment';
        index?: number; // 0-based index of the month, session, or installment
    };
    serviceDetails?: {
        description: string;
    };
}

export interface AdditionalService {
    id: string;
    title: string;
    description: string;
    cost: number;
    isCustom?: boolean;
}