export type RequestStatus = 'pending' | 'accepted' | 'change_requested' | 'paid' | 'scheduled' | 'rejected' | 'expired';

export interface CustomClassRequest {
    id: string;
    studentId: string;
    teacherId: string;
    studentName: string; // denormalized for ease
    studentEmail: string;
    studentPhone: string; // for SMS/WhatsApp
    topic: string;
    message: string;
    requestedSlots: {
        date: string; // YYYY-MM-DD
        startTime: string; // HH:mm
        endTime: string; // HH:mm
        durationMinutes: number;
    }[];
    ratesSnapshot: { // Store rates at time of request
        hourly: number;
    };
    totalCost: number;
    status: RequestStatus;
    negotiationHistory: {
        sender: 'teacher' | 'student';
        message?: string;
        proposedSlots?: any[]; // if changed
        proposedCost?: number; // if changed
        timestamp: string;
    }[];
    expiresAt?: string; // ISO string for payment deadline
    createdAt: any; // Timestamp
    updatedAt: any; // Timestamp
}
