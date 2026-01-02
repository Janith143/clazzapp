
import type { Recurrence } from './base';

export interface Lecture {
    id: string;
    title: string;
    description: string;
    videoUrl: string;
    resourcesUrl?: string;
    durationMinutes: number;
    isFreePreview: boolean;
}

export interface LiveSession {
    id: string;
    title: string; // Topic
    description?: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    resourceLink?: string;
    joinLink?: string;
    recordingLink?: string;
    status: 'scheduled' | 'live' | 'finished';
}

export interface CourseRating {
    studentId: string;
    rating: number; // 1 to 5
    ratedAt: string; // ISO string
}

export type CourseType = 'recorded' | 'live';
export type PaymentPlan = 'full' | 'monthly' | 'per_session' | 'installments_2';

export interface Course {
    id: string;
    teacherId: string;
    title: string;
    description: string;
    subject: string;
    coverImage: string;
    fee: number;
    currency: 'LKR';
    type: CourseType;
    paymentPlan?: PaymentPlan;
    lectures: Lecture[]; // Used if type is 'recorded'
    liveSessions?: LiveSession[]; // Used if type is 'live'
    scheduleConfig?: {
        startDate: string;
        startTime: string;
        durationMinutes: number;
        weekCount: number;
        days: number[]; // 0=Sun, 1=Mon...
    };
    isPublished: boolean;
    ratings: CourseRating[];
    isDeleted?: boolean;
    adminApproval: 'not_requested' | 'pending' | 'approved' | 'rejected';
    medium?: string;
    grade?: string;
}

export interface AttendanceRecord {
    studentId: string;
    studentName: string;
    studentAvatar: string;
    attendedAt: string; // ISO String
    paymentStatus: 'paid' | 'unpaid' | 'paid_at_venue';
    paymentRef?: string; // saleId
}

export interface StudentScore {
    studentId: string;
    score: number;
}

export interface ClassGrading {
    maxMark: number;
    studentScores: StudentScore[];
}

export interface HomeworkSubmission {
    studentId: string;
    link: string;
    submittedAt: string; // ISO String
}

export interface IndividualClass {
    id: number;
    teacherId: string;
    title: string;
    subject: string;
    description: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    fee: number;
    currency: 'LKR';
    targetAudience: string;
    mode: 'Online' | 'Physical' | 'Both';
    joiningLink?: string;
    meetProvider?: 'google';
    googleEventId?: string;
    documentLink?: string;
    recordingUrls?: { [date: string]: string[] };
    grades?: { [instanceDate: string]: ClassGrading };
    homeworkSubmissions?: { [instanceDate: string]: HomeworkSubmission[] };
    recurrence: 'none' | 'weekly' | 'flexible';
    weeklyPaymentOption?: 'per_session' | 'per_month';
    flexibleDates?: { date: string; startTime: string; endTime: string }[];
    institute?: string;
    instituteId?: string;
    district?: string;
    town?: string;
    endDate?: string; // YYYY-MM-DD
    status: 'scheduled' | 'finished' | 'canceled';
    isPublished: boolean;
    paymentMethod?: 'platform' | 'manual';
    isDeleted?: boolean;
    attendance?: AttendanceRecord[];
    isFreeSlot?: boolean;
    instanceStartDate?: string;
    medium?: string;
    grade?: string;
}

export interface Answer {
    id: string;
    text: string;
    isCorrect: boolean;
}

export interface Question {
    id: string;
    text: string;
    imageUrl?: string;
    answers: Answer[];
}

export interface Quiz {
    id: string;
    teacherId: string;
    title: string;
    description: string;
    subject: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    durationMinutes: number;
    fee: number;
    currency: 'LKR';
    questions: Question[];
    status: 'scheduled' | 'finished' | 'canceled';
    isPublished: boolean;
    isDeleted?: boolean;
    instanceStartDate?: string;
    medium?: string;
    grade?: string;
}

export interface StudentSubmission {
    id: string;
    studentId: string;
    quizId: string;
    answers: { questionId: string; selectedAnswerIds: string[]; }[];
    score: number;
    submittedAt: string; // ISO string
    quizInstanceId?: string;
}

export interface StudentResult {
    studentId: string;
    studentName: string;
    studentAvatar: string;
    score: number;
    timeTakenSeconds: number;
}

export type ProductType = 'digital' | 'physical';

export interface Product {
    id: string;
    teacherId: string;
    title: string;
    description: string;
    type: ProductType;
    coverImages: string[];
    price: number;
    currency: 'LKR';
    isPublished: boolean;
    isDeleted?: boolean;
    adminApproval: 'not_requested' | 'pending' | 'approved' | 'rejected';
    downloadUrl?: string;
    stock?: number;
    orderLeadTime?: string;
}

export interface Certificate {
    id: string;
    studentId: string;
    studentName: string;
    teacherId: string;
    teacherName: string;
    itemId: string; // Course ID
    itemType: 'course';
    itemTitle: string;
    issuedAt: string; // ISO String
    pdfUrl: string;
    verificationId: string;
}
