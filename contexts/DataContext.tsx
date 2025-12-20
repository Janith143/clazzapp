
import React, { createContext, useState, useContext, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    User, Teacher, Sale, Course, IndividualClass, Quiz, Lecture, StudentSubmission,
    Voucher, TopUpRequest, EditableImageType, PayoutDetails, BillingDetails, MonthlyReferralEarning, Withdrawal, PageState, DashboardTab, HomeSlide, StaticPageKey, SocialMediaLink, Notification, TuitionInstitute, UpcomingExam, PhotoPrintOption, Event, Product, ClassGrading,
    PaymentGatewaySettings, KnownInstitute, FinancialSettings, SupportSettings, PaymentMethod
} from '../types';
import { useAuth } from './AuthContext';
import { db, storage } from '../firebase';
import {
    collection, onSnapshot, doc,
    query, QuerySnapshot, DocumentData, DocumentSnapshot,
    writeBatch,
    runTransaction,
    arrayUnion,
    increment
} from 'firebase/firestore';
import { useDataActions } from '../hooks/useDataActions';
import { getDynamicClassStatus } from '../utils';
import { useNavigation } from './NavigationContext';


export interface DataContextType {
    loading: boolean;
    users: User[];
    teachers: Teacher[];
    tuitionInstitutes: TuitionInstitute[];
    knownInstitutes: KnownInstitute[];
    sales: Sale[];
    vouchers: Voucher[];
    topUpRequests: TopUpRequest[];
    submissions: StudentSubmission[];
    defaultCoverImages: string[];
    addUser: (user: User) => Promise<void>;
    addTeacher: (teacher: Teacher) => Promise<void>;
    addTuitionInstitute: (institute: TuitionInstitute) => Promise<void>;
    updateTuitionInstitute: (instituteId: string, updates: Partial<TuitionInstitute>) => void;
    handleUpdateUser: (updatedUser: Partial<User> & { id: string }) => Promise<void>;
    handleUserVerification: (updates: Partial<User>) => void;
    handleImageSave: (base64: string, type: EditableImageType | null, context?: any) => Promise<string | void>;
    handleUpdateTeacher: (teacherId: string, updates: Partial<Teacher>) => Promise<void>;
    handleRemoveCoverImageFromArray: (teacherId: string, imageUrl: string) => void;
    handleSaveClass: (classDetails: IndividualClass) => void;
    handleSaveCourse: (courseDetails: Course) => Promise<void>;
    handleSaveQuiz: (quizDetails: Quiz) => Promise<void>;
    handleCancelItem: (teacherId: string, itemId: string | number, type: 'class' | 'quiz') => void;
    handleTogglePublishState: (teacherId: string, itemId: string | number, type: 'class' | 'course' | 'quiz', action?: 'request_approval') => void;
    // FIX: Updated handleEnroll signature to include selectedMethod and return Promise<void> to match implementation in useEnrollmentActions hook.
    handleEnroll: (item: Course | IndividualClass | Quiz | Event, type: 'course' | 'class' | 'quiz' | 'event', ignoreVerification?: boolean, customPaymentAmount?: number, customPaymentDescription?: string, purchaseMetadata?: Sale['purchaseMetadata'], selectedMethod?: PaymentMethod) => Promise<void>;
    handleRateCourse: (courseId: string, rating: number) => void;
    handleRateTeacher: (teacherId: string, classId: number, rating: number) => void;
    handleFinishQuiz: (submissionData: Omit<StudentSubmission, 'id' | 'score'>) => void;
    handleDeleteQuizSubmissions: (quizId: string) => Promise<void>;
    handlePaymentResponse: (params: URLSearchParams) => Promise<PageState | null>;
    // FIX: Updated handleTopUpWithGateway signature to include selectedMethod to match implementation in useBalanceActions hook.
    handleTopUpWithGateway: (amount: number, selectedMethod?: PaymentMethod) => void;
    handleTopUpWithSlip: (amount: number, slipImage: string) => void;
    handleRedeemVoucher: (code: string) => Promise<boolean>;
    handleVoucherPurchaseRequest: (details: Omit<Voucher, 'id' | 'code' | 'isUsed' | 'purchasedAt' | 'expiresAt'>, quantity: number) => void;
    handleExternalTopUpRequest: (students: Pick<User, 'id' | 'firstName' | 'lastName'>[], amountPerStudent: number, billingDetails: BillingDetails) => void;
    handleRequestWithdrawal: (teacherId: string, amount: number) => void;
    handleSaveBankDetails: (teacherId: string, details: PayoutDetails) => void;
    handleVerificationUpload: (teacherId: string, type: 'id_front' | 'id_back' | 'bank', base64: string, requestNote: string) => Promise<void>;
    handleVerificationDecision: (teacherId: string, type: 'id' | 'bank', decision: 'approve' | 'reject', reason: string) => void;
    handleUpdateWithdrawal: (userId: string, withdrawalId: string, status: Withdrawal['status'], notes?: string) => void;
    handleRemoveDefaultCoverImage: (imageUrl: string) => Promise<void>;
    handleTopUpDecision: (requestId: string, decision: 'approved' | 'rejected', reason?: string, newAmount?: number) => void;
    handleUpdateSaleStatus: (saleId: string, status: Sale['status']) => void;
    handleUpdatePhotoOrderStatus: (saleId: string, status: Sale['photoOrderStatus']) => void;
    handleUpdatePhysicalOrderStatus: (saleId: string, status: Sale['physicalOrderStatus']) => void;
    handleRefundSale: (saleId: string) => void;
    handleRedeemReferralEarnings: (year: number, month: number) => void;
    handleRequestAffiliateWithdrawal: (amount: number) => Promise<void>;
    handleCourseApproval: (teacherId: string, courseId: string, decision: 'approved' | 'rejected') => void;
    logLectureWatch: (courseId: string, lectureId: string) => void;
    handleUpdateStaticContent: (key: StaticPageKey, data: { title: string; content: string; }) => Promise<void>;
    handleUpdateHomeSlides: (slides: HomeSlide[]) => Promise<void>;
    handleUpdateSocialMediaLinks: (links: SocialMediaLink[]) => Promise<void>;
    handleUpdateSubjects: (subjects: Record<string, { value: string, label: string }[]>) => Promise<void>;
    handleUpdateStudentCardTaglines: (taglines: string[]) => Promise<void>;
    handleUpdateTeacherCardTaglines: (taglines: string[]) => Promise<void>;
    handleUpdateHomePageCardCounts: (counts: { teachers: number, courses: number, classes: number, quizzes: number, events: number }) => Promise<void>;
    handleUpdateUpcomingExams: (exams: UpcomingExam[]) => Promise<void>;
    handleUpdatePhotoPrintOptions: (options: PhotoPrintOption[]) => Promise<void>;
    handleUpdatePaymentGatewaySettings: (settings: PaymentGatewaySettings) => Promise<void>;
    handleUpdateOgImage: (imageUrl: string) => Promise<void>;
    handleUpdateTeacherDashboardMessage: (message: string) => Promise<void>;
    handleUpdateFinancialSettings: (settings: FinancialSettings) => Promise<void>;
    handleUpdateSupportSettings: (settings: SupportSettings) => Promise<void>;
    processMonthlyPayouts: (userType: 'teacher' | 'institute' | 'student', userId: string) => Promise<void>;
    handleSendNotification: (teacherId: string, content: string, target: Notification['target']) => Promise<void>;
    handleFollowToggle: (teacherId: string) => Promise<void>;
    handleMarkAllAsRead: () => Promise<void>;
    markAttendance: (classId: number, student: User, paymentStatus: 'paid_at_venue' | 'unpaid' | 'paid', paymentRef?: string) => Promise<boolean>;
    recordManualPayment: (classInfo: IndividualClass, student: User) => Promise<Sale | null>;
    handleResetTeacherBalance: (instituteId: string, teacherId: string) => Promise<void>;
    handleSaveEvent: (eventDetails: Event) => void;
    handleCancelEvent: (instituteId: string, eventId: string) => void;
    handleToggleEventPublishState: (instituteId: string, eventId: string) => void;
    handleSaveProduct: (productDetails: Product) => void;
    handleProductApproval: (teacherId: string, productId: string, decision: 'approved' | 'rejected') => void;
    handleUpdateDeveloperSettings: (settings: { genAiKey: string; gDriveFetcherApiKey: string; functionUrls: any }) => Promise<void>;
    handleSaveClassRecording: (teacherId: string, classId: number, instanceDate: string, recordingUrls: string[]) => Promise<void>;
    handleSaveGrading: (teacherId: string, classId: number, instanceDate: string, grades: ClassGrading) => Promise<void>;
    handleSaveHomeworkSubmission: (teacherId: string, classId: number, instanceDate: string, link: string) => Promise<void>;
    handleAssignReferralCode: (userId: string, code: string) => Promise<void>;
    handleGenerateVouchers: (studentIds: string[], amount: number, details: { title?: string; rules?: string; expiryDate: string }) => Promise<void>;
    handleDeleteVoucher: (voucherId: string) => Promise<void>;
    handleUpdateVoucher: (voucherId: string, updates: Partial<Voucher>) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// function moved inside provider

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const { functionUrls } = useNavigation();
    const [users, setUsers] = useState<User[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [tuitionInstitutes, setTuitionInstitutes] = useState<TuitionInstitute[]>([]);
    const [knownInstitutes, setKnownInstitutes] = useState<KnownInstitute[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [topUpRequests, setTopUpRequests] = useState<TopUpRequest[]>([]);
    const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
    const [defaultCoverImages, setDefaultCoverImages] = useState<string[]>([]);
    const [remindersSent, setRemindersSent] = useState<{ [key: string]: '30min' | '5min' }>({});

    const [loading, setLoading] = useState(true);
    const [teachersLoaded, setTeachersLoaded] = useState(false);
    const [institutesLoaded, setInstitutesLoaded] = useState(false);


    useEffect(() => {
        const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot: QuerySnapshot) => setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User))));

        const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snapshot: QuerySnapshot) => {
            setTeachers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Teacher)));
            setTeachersLoaded(true);
        });

        const unsubInstitutes = onSnapshot(collection(db, 'tuitionInstitutes'), (snapshot: QuerySnapshot) => {
            setTuitionInstitutes(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TuitionInstitute)));
            setInstitutesLoaded(true);
        });

        const unsubKnownInstitutes = onSnapshot(collection(db, 'knownInstitutes'), (snapshot: QuerySnapshot) => {
            setKnownInstitutes(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as KnownInstitute)));
        });

        const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot: QuerySnapshot) => setSales(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Sale))));
        const unsubVouchers = onSnapshot(collection(db, 'vouchers'), (snapshot: QuerySnapshot) => setVouchers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Voucher))));
        const unsubTopUps = onSnapshot(collection(db, 'topUpRequests'), (snapshot: QuerySnapshot) => setTopUpRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TopUpRequest))));
        const unsubSubmissions = onSnapshot(collection(db, 'submissions'), (snapshot: QuerySnapshot) => setSubmissions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentSubmission))));
        const unsubConfig = onSnapshot(doc(db, 'settings', 'clientAppConfig'), (docSnap: DocumentSnapshot) => {
            setDefaultCoverImages(docSnap.exists() ? (docSnap.data() as any).defaultCoverImages || [] : []);
        });

        return () => {
            unsubUsers(); unsubTeachers(); unsubInstitutes(); unsubKnownInstitutes(); unsubSales(); unsubVouchers(); unsubTopUps(); unsubSubmissions(); unsubConfig();
        };
    }, []);

    useEffect(() => {
        if (teachersLoaded && institutesLoaded) {
            setLoading(false);
        }
    }, [teachersLoaded, institutesLoaded, teachers, tuitionInstitutes]);

    useEffect(() => {
        const sendLinkReminder = async (teacher: User, cls: IndividualClass, time: string) => {
            const subject = `Reminder: Add Joining Link for '${cls.title}'`;
            const htmlBody = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <p>Dear ${teacher.firstName},</p>
                    <p>This is a reminder that your class, <strong>${cls.title}</strong>, is scheduled to start in approximately <strong>${time}</strong>.</p>
                    <p>The joining link for this online/hybrid class has not been added yet. Please add it as soon as possible from your teacher dashboard so that students can join on time.</p>
                    <p>Thank you,</p>
                    <p>The clazz.lk Team</p>
                </div>
            `;

            try {
                const response = await fetch(functionUrls.notification, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        toEmail: teacher.email,
                        subject,
                        htmlBody
                    })
                });
                if (!response.ok) {
                    throw new Error('Notification API returned an error.');
                }
                console.log(`Sent ${time} reminder to ${teacher.email} for class ${cls.id}`);
            } catch (error) {
                console.error("Failed to send reminder email:", error);
            }
        };

        const interval = setInterval(() => {
            const now = new Date();
            teachers.forEach(teacher => {
                const teacherUser = users.find(u => u.id === teacher.userId);
                if (!teacherUser || !teacherUser.email) return;

                teacher.individualClasses.forEach(cls => {
                    if ((cls.mode === 'Online' || cls.mode === 'Both') && !cls.joiningLink && cls.status === 'scheduled') {
                        const startDateTime = new Date(`${cls.date}T${cls.startTime}`);
                        if (isNaN(startDateTime.getTime())) return;

                        const diffMinutes = (startDateTime.getTime() - now.getTime()) / (1000 * 60);

                        const reminderKey = `${teacher.id}_${cls.id}`;

                        if (diffMinutes > 29 && diffMinutes <= 30 && remindersSent[reminderKey] !== '30min' && remindersSent[reminderKey] !== '5min') {
                            sendLinkReminder(teacherUser, cls, '30 minutes');
                            setRemindersSent(prev => ({ ...prev, [reminderKey]: '30min' }));
                        } else if (diffMinutes > 4 && diffMinutes <= 5 && remindersSent[reminderKey] !== '5min') {
                            sendLinkReminder(teacherUser, cls, '5 minutes');
                            setRemindersSent(prev => ({ ...prev, [reminderKey]: '5min' }));
                        }
                    }
                });
            });
        }, 60 * 1000);

        return () => clearInterval(interval);
    }, [teachers, users, remindersSent, functionUrls.notification]);

    useEffect(() => {
        const checkAndUnpublishClasses = async () => {
            if (teachers.length === 0) return;

            console.log("Checking for finished classes to unpublish...");
            const batch = writeBatch(db);
            let updatesMade = false;

            for (const teacher of teachers) {
                if (!Array.isArray(teacher.individualClasses)) {
                    continue;
                }
                let teacherNeedsUpdate = false;
                const updatedClasses = teacher.individualClasses.map(cls => {
                    if (cls.isPublished && cls.status !== 'finished') {
                        const dynamicStatus = getDynamicClassStatus(cls);
                        if (dynamicStatus === 'finished') {
                            teacherNeedsUpdate = true;
                            return { ...cls, isPublished: false, status: 'finished' };
                        }
                    }
                    return cls;
                });

                if (teacherNeedsUpdate) {
                    const teacherRef = doc(db, 'teachers', teacher.id);
                    batch.update(teacherRef, { individualClasses: updatedClasses });
                    updatesMade = true;
                }
            }

            if (updatesMade) {
                try {
                    await batch.commit();
                    console.log('Batch update: Unpublished finished classes.');
                } catch (error) {
                    console.error('Error unpublishing finished classes:', error);
                }
            }
        };

        const intervalId = setInterval(checkAndUnpublishClasses, 5 * 60 * 1000);
        const timeoutId = setTimeout(checkAndUnpublishClasses, 15000);

        return () => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, [teachers]);

    const actions = useDataActions({
        currentUser, users, teachers, tuitionInstitutes, knownInstitutes, sales, vouchers, topUpRequests, submissions, defaultCoverImages
    });

    const value: DataContextType = {
        users, teachers, tuitionInstitutes, knownInstitutes, sales, vouchers, topUpRequests, submissions, defaultCoverImages,
        ...actions, loading
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export const useFetchItem = (type: 'course' | 'class' | 'quiz' | 'product', id: string | number) => {
    const { teachers, sales } = useData();
    const { currentUser } = useAuth();

    return useMemo(() => {
        let item: Course | IndividualClass | Quiz | Product | null = null;
        let teacher: Teacher | null = null;

        for (const t of teachers) {
            let foundItem: Course | IndividualClass | Quiz | Product | undefined;
            if (type === 'course') foundItem = t.courses.find(c => c.id === id);
            else if (type === 'class') foundItem = t.individualClasses.find(c => c.id === id);
            else if (type === 'quiz') foundItem = t.quizzes.find(q => q.id === id);
            else if (type === 'product') foundItem = (t.products || []).find(p => p.id === id);

            if (foundItem) {
                item = foundItem;
                teacher = t;
                break;
            }
        }

        if (!item && currentUser && type !== 'product') {
            const saleRecord = sales.find(s => s.studentId === currentUser.id && s.itemType === type && String(s.itemId) === String(id));
            if (saleRecord) {
                const snapshotTeacher = teachers.find(t => t.id === saleRecord.teacherId);
                item = { ...saleRecord.itemSnapshot as any, isDeleted: true };
                teacher = snapshotTeacher || null;
            }
        }

        if (!item || !teacher) {
            return { item: null, teacher: null, isOwner: false, isEnrolled: false };
        }

        const isOwner = currentUser?.id === teacher.userId;
        let isEnrolled = isOwner;
        if (!isEnrolled && currentUser) {
            isEnrolled = sales.some(s => {
                if (s.studentId !== currentUser.id || String(s.itemId) !== String(id) || s.itemType !== type || s.status !== 'completed') {
                    return false;
                }

                if (type === 'class' && (item as IndividualClass).weeklyPaymentOption === 'per_month') {
                    const saleDate = new Date(s.saleDate);
                    const now = new Date();
                    return saleDate.getFullYear() === now.getFullYear() && saleDate.getMonth() === now.getMonth();
                }

                if (type === 'class' || type === 'quiz') {
                    const liveItem = item as IndividualClass | Quiz;
                    if (!s.itemSnapshot) {
                        return false;
                    }
                    const saleItem = s.itemSnapshot as IndividualClass | Quiz;

                    if (liveItem.instanceStartDate) {
                        return saleItem.instanceStartDate === liveItem.instanceStartDate;
                    }
                    else {
                        return !saleItem.instanceStartDate;
                    }
                }

                if (type === 'course' || type === 'product' || type === 'event') {
                    return true;
                }

                return false;
            });
        }

        return { item, teacher, isOwner, isEnrolled };
    }, [teachers, currentUser, type, id, sales]);
};
