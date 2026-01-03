
import React, { createContext, useState, useContext, useCallback, useEffect, useMemo } from 'react';
import { PageState, StaticPageKey, HomeSlide, SocialMediaLink, FinancialSettings, UpcomingExam, PhotoPrintOption, PaymentGatewaySettings, SupportSettings, AdditionalService } from '../types';
import { homeSlides as mockHomeSlides, mockSocialMediaLinks, defaultSubjectsByAudience, mockPhotoPrintOptions } from '../data/mockData';
import { staticPageContent as mockStaticPageContent } from '../data/staticContent';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { matchPath } from '../utils/routeMatcher';

const defaultAppConfig = {
    genAiKey: 'AIzaSyB7BZfezyOj30ga7-dqKPQSVW6EbTMZiiQ',
    gDriveFetcherApiKey: 'AIzaSyAOXMXnOsBKgj2c0HmA3mIZndz9eXXOkL0',
    functionUrls: {
        notification: 'https://asia-south1-clazz2-new.cloudfunctions.net/sendNotification',
        payment: 'https://asia-south1-clazz2-new.cloudfunctions.net/paymentHandler',
        marxPayment: 'https://asia-south1-clazz2-new.cloudfunctions.net/marxPaymentHandler',
        gDriveFetcher: 'https://asia-south1-clazz2-new.cloudfunctions.net/gdriveImageFetcher',
        fcmNotification: 'https://asia-south1-clazz2-new.cloudfunctions.net/fcmNotifications/send-fcm-push',
        storageCleanup: '',
        googleMeetHandler: 'https://asia-south1-clazz2-new.cloudfunctions.net/googleMeetHandler',
        ogImageHandler: 'https://asia-south1-clazz2-new.cloudfunctions.net/ogImageHandler',
        telegramBot: 'https://asia-south1-clazz2-new.cloudfunctions.net/telegramBot',
        chatNotifications: 'https://asia-south1-clazz2-new.cloudfunctions.net/sendChatNotification'
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

export interface SectionConfig {
    count: number;
    mode: 'latest' | 'selected';
    selectedIds: string[];
}

export interface HomePageLayoutConfig {
    teachers: SectionConfig;
    courses: SectionConfig;
    classes: SectionConfig;
    quizzes: SectionConfig;
    events: SectionConfig;
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
    homePageLayoutConfig: HomePageLayoutConfig;
    upcomingExams: UpcomingExam[];
    photoPrintOptions: PhotoPrintOption[];
    additionalServices: AdditionalService[];
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
        storageCleanup: string;
        googleMeetHandler: string;
        ogImageHandler: string;
        telegramBot: string;
        chatNotifications: string;
    };

    handleNavigate: (page: PageState, options?: { quizFinish?: boolean }) => void;
    handleBack: () => void;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

const getPageStateFromURL = (): PageState => {
    // 1. Support legacy Hash URLs (Redirect Logic)
    if (window.location.hash.length > 2) {
        // We handle this inside useEffect to trigger a replaceState
    }

    const { pathname, search } = window.location;
    const params = new URLSearchParams(search);

    // --- Query Parameter Routing (Legacy / Fallbacks / functional links) ---
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

    // --- Path Based Routing ---

    // Static Routes
    if (pathname === '/' || pathname === '') return { name: 'home' };
    if (pathname === '/teachers') return { name: 'all_teachers' };
    if (pathname === '/courses') return { name: 'all_courses' };
    if (pathname === '/classes') return { name: 'all_classes' };
    if (pathname === '/quizzes') return { name: 'all_quizzes' };
    if (pathname === '/exams') return { name: 'all_exams' };
    if (pathname === '/events') return { name: 'all_events' };
    if (pathname === '/store') return { name: 'all_products' };
    if (pathname === '/gift-voucher') return { name: 'gift_voucher' };
    if (pathname === '/referrals') return { name: 'referral_dashboard' };
    if (pathname === '/dashboard') {
        return {
            name: 'student_dashboard',
            initialTab: (params.get('tab') as import('../types').DashboardTab) || undefined,
            joinCode: params.get('join') || undefined
        };
    }
    if (pathname === '/admin') return { name: 'admin_dashboard' };
    if (pathname === '/institute/dashboard') return { name: 'ti_dashboard' };

    // Dynamic Routes
    let match;

    match = matchPath(pathname, '/teacher/:slug');
    if (match) return { name: 'teacher_profile_slug', slug: match.slug };

    match = matchPath(pathname, '/courses/:slug');
    if (match) return { name: 'course_detail_slug', slug: match.slug };

    match = matchPath(pathname, '/classes/:slug');
    if (match) return { name: 'class_detail_slug', slug: match.slug };

    match = matchPath(pathname, '/quizzes/:slug');
    if (match) return { name: 'quiz_detail_slug', slug: match.slug, instanceId: params.get('instanceId') || undefined };

    match = matchPath(pathname, '/events/:slug');
    if (match) return { name: 'event_detail_slug', slug: match.slug };

    match = matchPath(pathname, '/store/:slug');
    if (match) return { name: 'product_detail_slug', slug: match.slug };


    // Fallback for simple slug at root: /janith
    const pathSegments = pathname.split('/').filter(Boolean);
    const reservedPaths = ['admin', 'teachers', 'courses', 'classes', 'quizzes', 'exams', 'events', 'store', 'gift-voucher', 'referrals', 'dashboard', 'institute', 'home'];
    if (pathSegments.length === 1 && !reservedPaths.includes(pathSegments[0])) {
        return { name: 'teacher_profile_slug', slug: pathSegments[0] };
    }


    match = matchPath(pathname, '/admin/institute/:instituteId');
    if (match) return { name: 'admin_ti_dashboard', instituteId: match.instituteId };

    match = matchPath(pathname, '/admin/student/:userId');
    match = matchPath(pathname, '/admin/student/:userId');
    if (match) return { name: 'admin_view_student_dashboard', userId: match.userId };

    // Programmatic SEO: /best-combined-mathematics-classes-in-colombo
    const seoMatch = pathname.match(/^\/best-(.+)-classes-in-(.+)$/);
    if (seoMatch) {
        const subjectSlug = seoMatch[1];
        const locationSlug = seoMatch[2];
        // Convert slugs back to readable if needed, or pass as slugs
        // We'll pass as slugs to the page, page can format them.
        return { name: 'programmatic_landing', subject: subjectSlug, location: locationSlug };
    }

    return { name: 'home' };
};

const getURLPathFromPageState = (page: PageState): string => {
    let path: string;
    switch (page.name) {
        case 'home': path = '/'; break;
        case 'teacher_profile_slug': path = `/${page.slug}`; break; // Top level vanity: /janith
        case 'teacher_profile': path = `/?teacherId=${page.teacherId}`; break; // Keep query for ID lookup
        case 'course_detail': path = `/?courseId=${page.courseId}`; break;
        case 'course_detail_slug': path = `/courses/${page.slug}`; break;
        case 'class_detail': path = `/?classId=${page.classId}`; break;
        case 'class_detail_slug': path = `/classes/${page.slug}`; break;
        case 'product_detail': path = `/?productId=${page.productId}`; break;
        case 'product_detail_slug': path = `/store/${page.slug}`; break;
        case 'quiz_detail':
            let quizPath = `/?quizId=${page.quizId}`;
            if (page.instanceId) {
                quizPath += `&instanceId=${page.instanceId}`;
            }
            path = quizPath;
            break;
        case 'quiz_detail_slug':
            let quizSlugPath = `/quizzes/${page.slug}`;
            if (page.instanceId) {
                quizSlugPath += `?instanceId=${page.instanceId}`;
            }
            path = quizSlugPath;
            break;
        case 'event_detail': path = `/?eventId=${page.eventId}`; break;
        case 'event_detail_slug': path = `/events/${page.slug}`; break;
        case 'quiz_taking': path = `/?takeQuiz=${page.quizId}`; break;
        case 'attendance_scanner': path = `/?scanAttendance=${page.classId}`; break;
        case 'static': path = `/?page=${page.pageKey}`; break;
        case 'teacher_referral_landing':
            path = `/?teacherRef=${page.refCode}`;
            if (page.level) path += `&level=${page.level}`;
            break;
        case 'programmatic_landing':
            path = `/best-${page.subject}-classes-in-${page.location}`;
            break;

        case 'all_teachers': path = '/teachers'; break;
        case 'all_courses': path = '/courses'; break;
        case 'all_classes': path = '/classes'; break;
        case 'all_quizzes': path = '/quizzes'; break;
        case 'all_exams': path = '/exams'; break;
        case 'all_events': path = '/events'; break;
        case 'all_products': path = '/store'; break;
        case 'student_dashboard':
            path = '/dashboard';
            const dashboardParams = new URLSearchParams();
            if (page.initialTab) dashboardParams.append('tab', page.initialTab);
            if (page.joinCode) dashboardParams.append('join', page.joinCode);
            const dQs = dashboardParams.toString();
            if (dQs) path += '?' + dQs;
            break;
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
            // These pages don't have dedicated URLs yet, stay on current URL or root
            return window.location.pathname + window.location.search;

        default: path = '/'; break;
    }
    return path;
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
    const [homePageLayoutConfig, setHomePageLayoutConfig] = useState<HomePageLayoutConfig>({
        teachers: { count: 3, mode: 'latest', selectedIds: [] },
        courses: { count: 3, mode: 'latest', selectedIds: [] },
        classes: { count: 3, mode: 'latest', selectedIds: [] },
        quizzes: { count: 3, mode: 'latest', selectedIds: [] },
        events: { count: 3, mode: 'latest', selectedIds: [] }
    });
    const [upcomingExams, setUpcomingExams] = useState<UpcomingExam[]>([]);
    const [photoPrintOptions, setPhotoPrintOptions] = useState<PhotoPrintOption[]>(mockPhotoPrintOptions);
    const [additionalServices, setAdditionalServices] = useState<AdditionalService[]>([]);
    const [paymentGatewaySettings, setPaymentGatewaySettings] = useState<PaymentGatewaySettings>(defaultPaymentGatewaySettings);
    const [supportSettings, setSupportSettings] = useState<SupportSettings>(defaultSupportSettings);
    const [ogImageUrl, setOgImageUrl] = useState<string>('');
    const [teacherDashboardMessage, setTeacherDashboardMessage] = useState<string>('');

    // Secure/Dev Config State (from clientAppConfig)
    const [genAiKey, setGenAiKey] = useState<string>(defaultAppConfig.genAiKey);
    const [gDriveFetcherApiKey, setGDriveFetcherApiKey] = useState<string>(defaultAppConfig.gDriveFetcherApiKey);
    const [functionUrls, setFunctionUrls] = useState(defaultAppConfig.functionUrls);


    useEffect(() => {
        // --- Popstate Handler (Browser Back/Forward) ---
        const handlePopState = () => {
            setPageState(getPageStateFromURL());
        };

        window.addEventListener('popstate', handlePopState);

        // --- Legacy Hash Redirect ---
        // If query params or hash exists, we might need to clean it up or migrate
        if (window.location.hash) {
            // Logic to migrate /#/teacher to /teacher if needed, or just let the getPageState handle it
            // For now, getPageState extracts params from hash if present in logic, but we moved to Path.
            // If user comes with #, we should probably redirect to path equivalent.
            const hash = window.location.hash.substring(1); // /teachers
            if (hash && hash !== '/') {
                // Simple migration: Just strip the # and replace state
                // Note: This matches simple paths. Complex query params in hash need more logic.
                // For safety one-time migration:
                const newPath = hash.startsWith('/') ? hash : '/' + hash;
                window.history.replaceState(null, '', newPath);
                setPageState(getPageStateFromURL());
            }
        }

        // --- Redirect /home to / ---
        if (window.location.pathname === '/home') {
            window.history.replaceState(null, '', '/');
            setPageState({ name: 'home' });
        }


        // Listener 1: Site Content (appConfig)
        const unsubAppConfig = onSnapshot(doc(db, 'settings', 'appConfig'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as any;
                setHomeSlides(data.homeSlides || mockHomeSlides);
                setStaticPageContent(prev => ({ ...mockStaticPageContent, ...data.staticContent }));
                setSocialMediaLinks(data.socialMediaLinks || mockSocialMediaLinks);
                setSubjects(data.subjects || defaultSubjectsByAudience);
                setStudentCardTaglines(data.studentCardTaglines || []);
                setTeacherCardTaglines(data.teacherCardTaglines || []);

                // Migration logic for homePageLayoutConfig
                let layoutConfig: HomePageLayoutConfig = {
                    teachers: { count: 3, mode: 'latest', selectedIds: [] },
                    courses: { count: 3, mode: 'latest', selectedIds: [] },
                    classes: { count: 3, mode: 'latest', selectedIds: [] },
                    quizzes: { count: 3, mode: 'latest', selectedIds: [] },
                    events: { count: 3, mode: 'latest', selectedIds: [] }
                };

                if (data.homePageLayoutConfig) {
                    layoutConfig = data.homePageLayoutConfig;
                } else if (data.homePageCardCounts) {
                    // Backwards compatibility for old simple structure
                    layoutConfig = {
                        teachers: { count: data.homePageCardCounts.teachers || 3, mode: 'latest', selectedIds: [] },
                        courses: { count: data.homePageCardCounts.courses || 3, mode: 'latest', selectedIds: [] },
                        classes: { count: data.homePageCardCounts.classes || 3, mode: 'latest', selectedIds: [] },
                        quizzes: { count: data.homePageCardCounts.quizzes || 3, mode: 'latest', selectedIds: [] },
                        events: { count: data.homePageCardCounts.events || 3, mode: 'latest', selectedIds: [] }
                    };
                }
                setHomePageLayoutConfig(layoutConfig);

                setUpcomingExams(data.upcomingExams || []);
                setPhotoPrintOptions(data.photoPrintOptions || mockPhotoPrintOptions);
                setAdditionalServices(data.additionalServices || []);
                setFinancialSettings({ ...defaultFinancialSettings, ...(data.financialSettings || {}) });
                setSupportSettings(data.supportSettings || defaultSupportSettings);
                setOgImageUrl(data.ogImageUrl || '');
                setTeacherDashboardMessage(data.teacherDashboardMessage || '');
            }
        });

        // Listener 2: Developer/System Settings (clientAppConfig)
        const unsubClientConfig = onSnapshot(doc(db, 'settings', 'clientAppConfig'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as any;

                // Payment settings are in clientAppConfig
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

                // Secure Config Loading
                setGenAiKey(data.genAiKey || defaultAppConfig.genAiKey);
                setGDriveFetcherApiKey(data.gDriveFetcherApiKey || defaultAppConfig.gDriveFetcherApiKey);
                setFunctionUrls({
                    ...defaultAppConfig.functionUrls,
                    ...(data.functionUrls || {}),
                });

            } else {
                console.warn("Client config document not found in Firestore. Using default values.");
            }
        });

        return () => {
            window.removeEventListener('popstate', handlePopState);
            unsubAppConfig();
            unsubClientConfig();
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

        const newPath = getURLPathFromPageState(page);

        if (options?.quizFinish) {
            window.history.replaceState(null, '', newPath);
            setPageState(page);
        } else {
            const currentPath = window.location.pathname + window.location.search;
            if (newPath !== currentPath) {
                window.history.pushState(null, '', newPath);
                setPageState(page);
            } else {
                // Same path, just ensuring state is sync
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

    const value: NavigationContextType = useMemo(() => ({
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
        homePageLayoutConfig,
        upcomingExams,
        photoPrintOptions,
        additionalServices,
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
    }), [
        pageState, searchQuery, homeSlides, staticPageContent, socialMediaLinks, subjects, allSubjects,
        studentCardTaglines, teacherCardTaglines, financialSettings, homePageLayoutConfig, upcomingExams,
        photoPrintOptions, additionalServices, paymentGatewaySettings, supportSettings, ogImageUrl, teacherDashboardMessage,
        genAiKey, gDriveFetcherApiKey, functionUrls, handleNavigate
    ]);

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
