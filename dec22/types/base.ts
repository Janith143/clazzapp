import type { User } from 'firebase/auth';

export type FirebaseUser = User;

export enum Theme {
    Light = 'light',
    Dark = 'dark',
}

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

export interface Address {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

export type Recurrence = 'none' | 'weekly';

export type StaticPageKey = 
  | 'about_us'
  | 'contact_support'
  | 'faq'
  | 'teacher_terms'
  | 'student_terms'
  | 'privacy_policy'
  | 'refund_policy'
  | 'disclaimer'
  | 'cookie_policy'
  | 'community_guidelines'
  | 'code_of_conduct'
  | 'copyright_policy';

export interface HomeSlide {
  image: string;
  title: string;
  subtitle: string;
  ctaText: string;
}

export interface SocialMediaLink {
    id: string;
    name: string;
    url: string;
    icon: string;
}

export interface ScheduleItem {
  id: number | string;
  type: 'class' | 'quiz';
  day: string;
  subject: string;
  title: string;
  startTime: string;
  endTime: string;
}

export interface UpcomingExam {
    id: string;
    name: string;
    date: string; // YYYY-MM-DD
    targetAudience: string;
    isHighPriority: boolean;
}

export type GoogleUserInfo = {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
};

export interface ContactInfo {
    phone: string;
    email: string;
    location: string;
    onlineAvailable: boolean;
}

export interface TimeTableEntry {
    classId: number;
    day: string;
    subject: string;
    title: string;
    startTime: string;
    endTime: string;
}

export interface SupportSettings {
    telegramBotToken: string;
    telegramChatId: string;
    isEnabled: boolean;
}

export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'agent';
    timestamp: any; // Firestore timestamp or ISO string
}
