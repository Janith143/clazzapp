import type { Address } from './base';
import type { TopUpRequest, MonthlyReferralEarning, Withdrawal } from './payment';

export type UserRole = 'student' | 'teacher' | 'admin' | 'tuition_institute';

export interface UserNotification {
    notificationId: string;
    isRead: boolean;
}

export interface CustomExam {
    id: string;
    name: string;
    date: string; // YYYY-MM-DD
    targetAudience: string;
}

export interface EducationEntry {
    id: string;
    institution: string;
    qualification: string;
    period: string; // e.g., "2020 - 2024"
}

export interface ExperienceEntry {
    id: string;
    role: string;
    organization: string;
    period: string;
    description: string;
}

export interface ReferenceEntry {
    id: string;
    name: string;
    title: string;
    organization: string;
    email: string;
    phone: string;
}

export interface ProjectEntry {
    id: string;
    name: string;
    description: string;
}

export interface User {
    id: string;
    uid?: string; // Firebase Auth UID
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    role: UserRole;
    avatar: string;
    contactNumber?: string;
    address?: Address;
    status: 'active' | 'pending' | 'suspended';
    enrolledCourseIds?: string[];
    enrolledClassIds?: number[];
    enrolledQuizIds?: string[];
    enrolledEventIds?: string[];
    accountBalance: number;
    topUpHistory?: TopUpRequest[];
    referralCode: string;
    referrerId?: string;
    referralBalance?: {
        total: number;
        withdrawn: number;
        available: number;
    };
    monthlyReferralEarnings?: MonthlyReferralEarning[];
    withdrawalHistory?: Withdrawal[];
    isEmailVerified?: boolean;
    isMobileVerified?: boolean;
    watchHistory?: { [courseId: string]: { [lectureId: string]: boolean } };
    createdAt?: string;
    followingTeacherIds?: string[];
    notifications?: UserNotification[];
    studentCardState?: {
        tagline: string;
        lastUpdated: string; // ISO String
    };
    fcmTokens?: string[];
    gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
    dateOfBirth?: string; // YYYY-MM-DD
    preferredLanguage?: 'Sinhala' | 'English' | 'Tamil';
    schools?: string[];
    learningInstitutes?: string[];
    careerAspirations?: string;
    achievements?: string[];
    targetAudience?: string;
    customExams?: CustomExam[];
    profileSummary?: string;
    technicalSkills?: string[];
    softSkills?: string[];
    languages?: string[];
    education?: EducationEntry[];
    experience?: ExperienceEntry[];
    projects?: ProjectEntry[];
    hobbies?: string[];
    certifications?: string[];
    references?: ReferenceEntry[];
    permissions?: string[]; // For admin delegation. Undefined = Super Admin.
}