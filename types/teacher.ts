
import { ContactInfo, TimeTableEntry } from './base';
import { IndividualClass, Course, Quiz, Product } from './content';
import { Event } from './commerce';
import { Withdrawal, PayoutDetails } from './payment';
import { IdVerification, BankVerification } from './verification';

export interface TeacherRating {
    studentId: string;
    classId: number;
    rating: number; // 1 to 5
    ratedAt: string; // ISO string
}

export interface TeachingItem {
    id: string;
    audience: string;
    subject: string;
    mediums: string[]; // 'Sinhala' | 'Tamil' | 'English'
    grades: string[]; // 'Grade 1', 'Grade 12', 'Revision', etc.
}

export type InstituteType = 'School' | 'Tuition Institute' | 'University' | 'Vocational Training' | 'Technical College' | 'Teacher Training' | 'Other';

export interface TeachingLocation {
    id: string;
    district: string;
    town: string;
    instituteName: string;
    instituteType: InstituteType;
}

// Global registry of institutes added by teachers
export interface KnownInstitute {
    id: string;
    name: string;
    district: string;
    town: string;
    type: InstituteType;
    addedBy?: string; // teacherId
}

export interface Teacher {
    id: string;
    userId?: string; // Optional for managed teachers
    isManaged?: boolean;
    instituteId?: string;
    name: string;
    username: string;
    email: string;
    profileImage: string;
    avatar: string;
    coverImages: string[];
    tagline: string;
    bio: string;
    subjects: string[]; // Legacy/Searchable simple list
    teachingItems?: TeachingItem[]; // Detailed structured list
    exams: string[];
    qualifications: string[];
    languages: string[];
    experienceYears: number;
    commissionRate: number;
    contact: ContactInfo;
    timetable: TimeTableEntry[];
    individualClasses: IndividualClass[];
    courses: Course[];
    quizzes: Quiz[];
    products?: Product[];
    achievements: string[];
    registrationStatus: 'pending' | 'approved' | 'rejected';
    earnings: {
        total: number;
        withdrawn: number;
        available: number;
        processedPayouts?: string[];
    };
    withdrawalHistory: Withdrawal[];
    payoutDetails?: PayoutDetails | null;
    verification: {
        id: IdVerification;
        bank: BankVerification;
    };
    ratings: TeacherRating[];
    followers?: string[];
    manualEarningsByInstitute?: { [instituteId: string]: number };
    teachingInstitutes?: string[]; // Legacy simple string array
    teachingLocations?: TeachingLocation[]; // New structured location data
    googleRefreshToken?: string;
    youtubeLinks?: string[];
    googleDriveLink?: string;
    events?: Event[]; // Reusing the Event type (likely needs import adjustment if there's a name collision)
    isPublished?: boolean;
    isDeleted?: boolean;
}