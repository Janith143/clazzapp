
import React, { createContext, useState, useContext, useCallback, useEffect, useMemo } from 'react';
import { PageState, StaticPageKey, HomeSlide, SocialMediaLink, FinancialSettings, UpcomingExam, PhotoPrintOption, PaymentGatewaySettings, SupportSettings } from '../types';
import { homeSlides as mockHomeSlides, mockSocialMediaLinks, defaultSubjectsByAudience, mockPhotoPrintOptions } from '../data/mockData';
import { staticPageContent as mockStaticPageContent } from '../data/staticContent';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

const defaultAppConfig = {
    genAiKey: 'AIzaSyB7BZfezyOj30ga7-dqKPQSVW6EbTMZiiQ',
    gDriveFetcherApiKey: 'AIzaSyAOXMXnOsBKgj2c0HmA3mIZndz9eXXOkL0',
    functionUrls: {
        notification: 'https://us-central1-gen-lang-client-0695487820.cloudfunctions.net/notification-function',
        payment: 'https://us-central1-gen-lang-client-0695487820.cloudfunctions.net/payment-handler',
        marxPayment: 'https://marxpaymenthandler-gtlcyfs7jq-uc.a.run.app',
        gDriveFetcher: 'https://gdriveimagefetcher-gtlcyfs7jq-uc.a.run.app',
        fcmNotification: 'https://fcm-notifications-980531128265.us-central1.run.app/send-fcm-push'
    },
    paymentGatewaySettings: {
        gateways: {
            webxpay: {
                secretKey: 'c5bd50e8-b56b-4b25-a828-73348a4da427',
                publicKey: `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCz6RFF+L4rWbdnk7Ita+u/0C0+
y3syMIYd1KI/dVJ5PIxQNxcxQ+fZSDjvX6DU8906mQOurS0yQO0RUiraSUVj92HZ
rebhOWCy+AdPJc6wPgiWvgXmGd4SFSFFEEqWIx8uY1BaK7qxphy0ci4wFIlg7YcX
JwI425SRIyXz9YYsJwIDAQAB
-----END PUBLIC KEY-----`
            }
        }
    }
};

const defaultFinancialSettings: FinancialSettings = {
    referralGatewayFeeRate: 0.04,
    referralPlatformCostRate: 0.04,
    referralMaxEarning: 100000,
    referralBaseRate: 0.04,
    referralTier1Threshold: 100000,
    referralTier1Rate: 0.05,
    referralTier2Threshold: 300000,
    referralTier2Rate: 0.06,
    referralTier3Threshold: 1000000,
    referralTier3Rate: 0.07,
    manualPaymentPlatformFee: 50,
};

const defaultPaymentGatewaySettings: PaymentGatewaySettings = {
    activePaymentGateway: 'webxpay',
    methodMapping: {
        card: 'marxipg',
        ezcash: 'webxpay',
        mcash: 'webxpay',
        frimi: 'webxpay',
        qr: 'webxpay',
        direct_bank: 'webxpay'
    },
    gateways: {
        webxpay: {
            secretKey: '',
            publicKey: '',
        },
        marxipg: {
            apiKey: '',
        }
    }
};

const defaultSupportSettings: SupportSettings = {
    telegramBotToken: '',
    telegramChatId: '',
    isEnabled: true
};

interface HomePageCardCounts {
    teachers: number;
    courses: number;
    classes: number;
    quizzes: number;
    events: number;
}

export interface NavigationContextType {
    pageState: PageState;
    searchQuery: string;
    homeSlides: HomeSlide[];
    staticPageContent: typeof mockStaticPageContent;
    socialMediaLinks: SocialMediaLink[];
    subjects: Record<string, { value: string, label: string }[]>;
    allSubjects: { value: string, label: string }[];
    studentCardTaglines: string[];
    teacherCardTaglines: string[];
    financialSettings: FinancialSettings;
    homePageCardCounts: HomePageCardCounts;
    upcomingExams: UpcomingExam[];
    photoPrintOptions: PhotoPrintOption[];
    paymentGatewaySettings: PaymentGatewaySettings;
    supportSettings: SupportSettings;
    ogImageUrl: string;
    teacherDashboardMessage: string;

    // Secure Config Fields
    genAiKey: string;
    gDriveFetcherApiKey: string;
    functionUrls: {
        notification: string;
        payment: string;
        marxPayment: string;
        gDriveFetcher: string;
        fcmNotification: string;
    };

    handleNavigate: (page: PageState, options?: { quizFinish?: boolean }) => void;
    handleBack: () => void;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

const getPageStateFromURL = (): PageState => {
    const hash = window.location.hash.substring(1); // e.g., "/?teacherId=123" or "/teachers"

    const [pathPart, queryPart] = hash.split('?');
    const params = new URLSearchParams(queryPart || '');
    const path = pathPart || '/';

    if (params.has('teacherId')) return { name: 'teacher_profile', teacherId: params.get('teacherId')! };
    if (params.has('courseId')) return { name: 'course_detail', courseId: params.get('courseId')! };
    if (params.has('classId')) return { name: 'class_detail', classId: Number(params.get('classId')!) };
    if (params.has('quizId')) return { name: 'quiz_detail', quizId: params.get('quizId')!, instanceId: params.get('instanceId') || undefined };
    if (params.has('eventId')) return { name: 'event_detail', eventId: params.get('eventId')! };
    if (params.has('productId')) return { name: 'product_detail', productId: params.get('productId')! };
    if (params.has('takeQuiz')) return { name: 'quiz_taking', quizId: params.get('takeQuiz')! };
    if (params.has('scanAttendance')) return { name: 'attendance_scanner', classId: Number(params.get('scanAttendance')!) };
    if (params.has('page')) return { name: 'static', pageKey: params.get('page')! as StaticPageKey };
    if (params.has('teacherRef')) return { name: 'teacher_referral_landing', refCode: params.get('teacherRef')!, level: params.get('level') || undefined };


    // path based for cleaner non-detail URLs
    const pathSegments = path.split('/').filter(Boolean);

    const reservedPaths = ['admin', 'teachers', 'courses', 'classes', 'quizzes', 'exams', 'events', 'store', 'gift-voucher', 'referrals', 'dashboard', 'institute'];
    if (pathSegments.length === 1 && pathSegments[0] && !reservedPaths.includes(pathSegments[0])) {
        return { name: 'teacher_profile_slug', slug: pathSegments[0] };
    }

    if (pathSegments[0] === 'admin' && pathSegments[1] === 'institute' && pathSegments[2]) {
        return { name: 'admin_ti_dashboard', instituteId: pathSegments[2] };
    }
    if (pathSegments[0] === 'admin' && pathSegments[1] === 'student' && pathSegments[2]) {
        return { name: 'admin_view_student_dashboard', userId: pathSegments[2] };
    }
    if (path === '/teachers') return { name: 'all_teachers' };
    if (path === '/courses') return { name: 'all_courses' };
    if (path === '/classes') return { name: 'all_classes' };
    if (path === '/quizzes') return { name: 'all_quizzes' };
    if (path === '/exams') return { name: 'all_exams' };
    if (path === '/events') return { name: 'all_events' };
    if (path === '/store') return { name: 'all_products' };
    if (path === '/gift-voucher') return { name: 'gift_voucher' };
    if (path === '/referrals') return { name: 'referral_dashboard' };
    if (path === '/dashboard') return { name: 'student_dashboard' };
    if (path === '/admin') return { name: 'admin_dashboard' };
    if (path === '/institute/dashboard') return { name: 'ti_dashboard' };

    return { name: 'home' };
};

const getURLHashFromPageState = (page: PageState): string => {
    let path: string;
    switch (page.name) {
        case 'home': path = '/'; break;
        case 'teacher_profile_slug': path = `/${page.slug}`; break;
        case 'teacher_profile': path = `/?teacherId=${page.teacherId}`; break;
        case 'course_detail': path = `/?courseId=${page.courseId}`; break;
        case 'class_detail': path = `/?classId=${page.classId}`; break;
        case 'product_detail': path = `/?productId=${page.productId}`; break;
        case 'quiz_detail':
            let quizPath = `/?quizId=${page.quizId}`;
            if (page.instanceId) {
                quizPath += `&instanceId=${page.instanceId}`;
            }
            path = quizPath;
            break;
        case 'event_detail': path = `/?eventId=${page.eventId}`; break;
        case 'quiz_taking': path = `/?takeQuiz=${page.quizId}`; break;
        case 'attendance_scanner': path = `/?scanAttendance=${page.classId}`; break;
        case 'static': path = `/?page=${page.pageKey}`; break;
        case 'teacher_referral_landing':
            path = `/?teacherRef=${page.refCode}`;
            if (page.level) path += `&level=${page.level}`;
            break;

        case 'all_teachers': path = '/teachers'; break;
        case 'all_courses': path = '/courses'; break;
        case 'all_classes': path = '/classes'; break;
        case 'all_quizzes': path = '/quizzes'; break;
        case 'all_exams': path = '/exams'; break;
        case 'all_events': path = '/events'; break;
        case 'all_products': path = '/store'; break;
        case 'student_dashboard': path = '/dashboard'; break;
        case 'admin_dashboard': path = '/admin'; break;
        case 'admin_view_student_dashboard': path = `/admin/student/${page.userId}`; break;
        case 'ti_dashboard': path = '/institute/dashboard'; break;
        case 'admin_ti_dashboard': path = `/admin/institute/${page.instituteId}`; break;
        case 'referral_dashboard': path = '/referrals'; break;
        case 'gift_voucher': path = '/gift-voucher'; break;

        case 'edit_teacher_profile':
        case 'course_editor':
        case 'quiz_editor':
        case 'payment_redirect':
        case 'voucher_success':
        case 'topup_success':
        case 'subscription_success':
            return window.location.hash || '#/';

        default: path = '/'; break;
    }
    return `#${path}`;
};


export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [pageState, setPageState] = useState<PageState>(getPageStateFromURL());
    const [searchQuery, setSearchQuery] = useState('');
    const [homeSlides, setHomeSlides] = useState<HomeSlide[]>(mockHomeSlides);
    const [staticPageContent, setStaticPageContent] = useState(mockStaticPageContent);
    const [socialMediaLinks, setSocialMediaLinks] = useState<SocialMediaLink[]>(mockSocialMediaLinks);
    const [subjects, setSubjects] = useState<Record<string, { value: string, label: string }[]>>(defaultSubjectsByAudience);
    const [studentCardTaglines, setStudentCardTaglines] = useState<string[]>([]);
    const [teacherCardTaglines, setTeacherCardTaglines] = useState<string[]>([]);
    const [financialSettings, setFinancialSettings] = useState<FinancialSettings>(defaultFinancialSettings);
    const [homePageCardCounts, setHomePageCardCounts] = useState<HomePageCardCounts>({ teachers: 3, courses: 3, classes: 3, quizzes: 3, events: 3 });
    const [upcomingExams, setUpcomingExams] = useState<UpcomingExam[]>([]);
    const [photoPrintOptions, setPhotoPrintOptions] = useState<PhotoPrintOption[]>(mockPhotoPrintOptions);
    const [paymentGatewaySettings, setPaymentGatewaySettings] = useState<PaymentGatewaySettings>(defaultPaymentGatewaySettings);
    const [supportSettings, setSupportSettings] = useState<SupportSettings>(defaultSupportSettings);
    const [ogImageUrl, setOgImageUrl] = useState<string>('');
    const [teacherDashboardMessage, setTeacherDashboardMessage] = useState<string>('');

    // Secure Config State
    const [genAiKey, setGenAiKey] = useState<string>(defaultAppConfig.genAiKey);
    const [gDriveFetcherApiKey, setGDriveFetcherApiKey] = useState<string>(defaultAppConfig.gDriveFetcherApiKey);
    const [functionUrls, setFunctionUrls] = useState(defaultAppConfig.functionUrls);


    useEffect(() => {
        const handleHashChange = () => {
            setPageState(getPageStateFromURL());
        };

        window.addEventListener('hashchange', handleHashChange);

        const unsubConfig = onSnapshot(doc(db, 'settings', 'clientAppConfig'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as any; // Cast to any to access properties
                setHomeSlides(data.homeSlides || mockHomeSlides);
                setStaticPageContent(prev => ({ ...mockStaticPageContent, ...data.staticContent }));
                setSocialMediaLinks(data.socialMediaLinks || mockSocialMediaLinks);
                setSubjects(data.subjects || defaultSubjectsByAudience);
                setStudentCardTaglines(data.studentCardTaglines || []);
                setTeacherCardTaglines(data.teacherCardTaglines || []);
                setFinancialSettings({ ...defaultFinancialSettings, ...(data.financialSettings || {}) });
                setHomePageCardCounts(data.homePageCardCounts || { teachers: 3, courses: 3, classes: 3, quizzes: 3, events: 3 });
                setUpcomingExams(data.upcomingExams || []);
                setPhotoPrintOptions(data.photoPrintOptions || mockPhotoPrintOptions);
                const mergedPaymentSettings = {
                    ...defaultPaymentGatewaySettings,
                    ...(data.paymentGatewaySettings || {}),
                    methodMapping: {
                        ...defaultPaymentGatewaySettings.methodMapping,
                        ...(data.paymentGatewaySettings?.methodMapping || {})
                    },
                    methodLogos: {
                        ...defaultPaymentGatewaySettings.methodLogos,
                        ...(data.paymentGatewaySettings?.methodLogos || {})
                    },
                    gateways: {
                        ...defaultPaymentGatewaySettings.gateways,
                        ...(data.paymentGatewaySettings?.gateways || {}),
                        webxpay: {
                            ...defaultPaymentGatewaySettings.gateways.webxpay,
                            ...(data.paymentGatewaySettings?.gateways?.webxpay || {})
                        }
                    }
                };
                setPaymentGatewaySettings(mergedPaymentSettings);
                setSupportSettings(data.supportSettings || defaultSupportSettings);
                setOgImageUrl(data.ogImageUrl || '');
                setTeacherDashboardMessage(data.teacherDashboardMessage || '');

                // Secure Config Loading
                setGenAiKey(data.genAiKey || defaultAppConfig.genAiKey);
                setGDriveFetcherApiKey(data.gDriveFetcherApiKey || defaultAppConfig.gDriveFetcherApiKey);
                setFunctionUrls({ ...defaultAppConfig.functionUrls, ...(data.functionUrls || {}) });

                // Auto-Seed: Check if critical new keys are missing in the EXISTING doc, and update if so.
                const needsUpdate = !data.genAiKey || !data.functionUrls || !data.paymentGatewaySettings?.gateways?.webxpay?.secretKey;
                if (needsUpdate) {
                    // Update only missing fields to avoid overwriting existing data
                    const updateData: any = {};
                    if (!data.genAiKey) updateData.genAiKey = defaultAppConfig.genAiKey;
                    if (!data.gDriveFetcherApiKey) updateData.gDriveFetcherApiKey = defaultAppConfig.gDriveFetcherApiKey;
                    if (!data.functionUrls) updateData.functionUrls = defaultAppConfig.functionUrls;

                    // Specific check for WebXPay secret to inject it if missing
                    if (!data.paymentGatewaySettings?.gateways?.webxpay?.secretKey) {
                        updateData['paymentGatewaySettings.gateways.webxpay.secretKey'] = defaultAppConfig.paymentGatewaySettings.gateways.webxpay.secretKey;
                    }
                    if (!data.paymentGatewaySettings?.gateways?.webxpay?.publicKey) {
                        updateData['paymentGatewaySettings.gateways.webxpay.publicKey'] = defaultAppConfig.paymentGatewaySettings.gateways.webxpay.publicKey;
                    }

                    updateDoc(doc(db, 'settings', 'clientAppConfig'), updateData).catch(err => console.error("Failed to auto-seed config:", err));
                }

            } else {
                // Document does not exist - Seed it completely
                setDoc(doc(db, 'settings', 'clientAppConfig'), {
                    ...defaultAppConfig,
                    // Include structural defaults if needed, or rely on them being optional/merged
                    financialSettings: defaultFinancialSettings,
                    paymentGatewaySettings: {
                        ...defaultPaymentGatewaySettings,
                        gateways: {
                            ...defaultPaymentGatewaySettings.gateways,
                            webxpay: {
                                ...defaultPaymentGatewaySettings.gateways.webxpay,
                                ...defaultAppConfig.paymentGatewaySettings.gateways.webxpay
                            }
                        }
                    }
                }).catch(err => console.error("Failed to create initial config:", err));
            }
        });

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
            unsubConfig();
        };
    }, []);

    const allSubjects = useMemo(() => {
        const subjectSet = new Set<string>();
        Object.values(subjects).forEach(subjectArray => {
            if (Array.isArray(subjectArray)) {
                subjectArray.forEach(subject => subjectSet.add(subject.value));
            }
        });
        return Array.from(subjectSet).sort().map(s => ({ value: s, label: s }));
    }, [subjects]);

    const handleNavigate = useCallback((page: PageState, options?: { quizFinish?: boolean }) => {
        window.scrollTo(0, 0);

        const newHash = getURLHashFromPageState(page);

        if (options?.quizFinish) {
            window.history.replaceState(null, '', newHash);
            setPageState(page);
        } else {
            const currentHash = window.location.hash || '#/';
            if (newHash !== currentHash) {
                window.location.hash = newHash.substring(1);
            } else {
                setPageState(page);
            }
        }

        if (page.name !== 'home') {
            setSearchQuery('');
        }
    }, [setSearchQuery]);

    const handleBack = () => {
        window.history.back();
    };

    const value: NavigationContextType = {
        pageState,
        searchQuery,
        homeSlides,
        staticPageContent,
        socialMediaLinks,
        subjects,
        allSubjects,
        studentCardTaglines,
        teacherCardTaglines,
        financialSettings,
        homePageCardCounts,
        upcomingExams,
        photoPrintOptions,
        paymentGatewaySettings,
        supportSettings,
        ogImageUrl,
        teacherDashboardMessage,
        genAiKey,
        gDriveFetcherApiKey,
        functionUrls,
        handleNavigate,
        handleBack,
        setSearchQuery,
    };

    return (
        <NavigationContext.Provider value={value}>
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigation = (): NavigationContextType => {
    const context = useContext(NavigationContext);
    if (context === undefined) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
};
