
import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import { UIProvider, useUI } from './contexts/UIContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { FirebaseProvider } from './contexts/FirebaseContext';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import BottomNavBar from './components/BottomNavBar';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import ForgotPasswordModal from './components/ForgotPasswordModal';
import StudentProfileModal from './components/StudentProfileModal';
import VideoPlayerModal from './components/VideoPlayerModal';
import ImageUploadModal from './components/ImageUploadModal';
import ToastManager from './components/ToastManager';
import PrePurchaseVerificationModal from './components/PrePurchaseVerificationModal';
import ScrollToTopButton from './components/ScrollToTopButton';
import CartModal from './components/CartModal';
import MobileWelcomeGate from './components/MobileWelcomeGate';
import ChatWidget from './components/ChatWidget';
import Modal from './components/Modal'; // Import standard Modal for notification popup
import ChristmasAnimation from './components/ChristmasAnimation';

// Pages
import HomePage from './pages/HomePage';
import AllTeachersPage from './pages/AllTeachersPage';
import AllCoursesPage from './pages/AllCoursesPage';
import AllClassesPage from './pages/AllClassesPage';
import AllQuizzesPage from './pages/AllQuizzesPage';
import AllExamsPage from './pages/AllExamsPage';
import AllEventsPage from './pages/AllEventsPage';
import AllProductsPage from './pages/AllProductsPage';
import TeacherProfilePage from './pages/TeacherProfilePage';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import EditProfilePage from './pages/EditProfilePage';
import CourseEditorPage from './pages/CourseEditorPage';
import CourseDetailPage from './pages/CourseDetailPage';
import ClassDetailPage from './pages/ClassDetailPage';
import QuizDetailPage from './pages/QuizDetailPage';
import EventDetailPage from './pages/EventDetailPage';
import ProductDetailPage from './pages/ProductDetailPage';
import QuizEditorPage from './pages/QuizEditorPage';
import QuizTakingPage from './pages/QuizTakingPage';
import PaymentRedirectPage from './pages/PaymentRedirectPage';
import StaticPage from './pages/StaticPage';
import GiftVoucherPage from './pages/GiftVoucherPage';
import ReferralDashboardPage from './pages/ReferralDashboardPage';
import TuitionInstituteDashboard from './pages/TuitionInstituteDashboard';
import AttendanceScannerPage from './pages/AttendanceScannerPage';
import TeacherReferralLandingPage from './pages/TeacherReferralLandingPage';
import SubscriptionSuccessPage from './pages/SubscriptionSuccessPage';
import { Quiz, Sale, PageState, Notification } from './types';
import { SpinnerIcon, CheckCircleIcon } from './components/Icons';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return isMobile;
};

// Notification Popup Component
const NotificationPopup: React.FC = () => {
    const { notificationPopup, setNotificationPopup } = useUI();
    const { isOpen, title, message } = notificationPopup;

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={() => setNotificationPopup(prev => ({...prev, isOpen: false}))} title={title || "Notification"} size="md">
            <div className="p-4 text-center">
                <p className="text-lg text-light-text dark:text-dark-text mb-6">{message}</p>
                <button 
                    onClick={() => setNotificationPopup(prev => ({...prev, isOpen: false}))}
                    className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                >
                    OK
                </button>
            </div>
        </Modal>
    );
};

function AppContent() {
  const { pageState, staticPageContent, handleNavigate, handleBack } = useNavigation();
  const { modalState, setModalState, videoPlayerState, imageUploadModal, prePurchaseVerificationModal, addToast, setChatWidgetOpen, setNotificationPopup } = useUI();
  const { currentUser, loading: authLoading } = useAuth();
  const { teachers, sales, handleFinishQuiz, handleUpdateTeacher, handleSaveCourse, handleSaveQuiz, handlePaymentResponse, loading: dataLoading } = useData();
  const paymentProcessedRef = useRef(false);

  const isMobile = useIsMobile();
  const [showWelcomeGate, setShowWelcomeGate] = useState(
    () => !sessionStorage.getItem('hasDismissedWelcomeGate')
  );

  const handleGateLogin = () => {
    setModalState({ name: 'login' });
    setShowWelcomeGate(false);
    sessionStorage.setItem('hasDismissedWelcomeGate', 'true');
  };

  const handleGateBrowse = () => {
    setShowWelcomeGate(false);
    sessionStorage.setItem('hasDismissedWelcomeGate', 'true');
  };
  
  // --- Push Notification Handlers ---

  // 1. Handle actions when app is opened via notification (Fresh Load)
  useEffect(() => {
      const handleInitialNotification = async () => {
        const params = new URLSearchParams(window.location.search);
        
        // Handle Chat Trigger
        if (params.get('action') === 'open_chat') {
             setChatWidgetOpen(true);
             // Clean URL
             window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        }
        
        // Handle Teacher Notification Popup
        const notificationId = params.get('notification_id');
        if (notificationId) {
            try {
                // We need to fetch the content if it's not passed in params (params are usually kept minimal)
                // However, we can also check if we can query the notification doc from Firestore
                const notifRef = doc(db, 'notifications', notificationId);
                const notifSnap = await getDoc(notifRef);
                
                if (notifSnap.exists()) {
                    const data = notifSnap.data() as Notification;
                    setNotificationPopup({
                        isOpen: true,
                        title: `Message from ${data.teacherName}`,
                        message: data.content
                    });
                }
            } catch (e) {
                console.error("Failed to fetch initial notification details", e);
            }
             // Clean URL
             window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        }
      };
      
      handleInitialNotification();
  }, [setChatWidgetOpen, setNotificationPopup]);

  // 2. Handle messages from Service Worker (App already open/background)
  useEffect(() => {
      if ('serviceWorker' in navigator) {
          const handler = (event: MessageEvent) => {
              const data = event.data;
              if (data && data.type === 'NOTIFICATION_CLICK') {
                   const payload = data.payload;
                   console.log("App received SW message:", payload);

                   if (payload.type === 'chat_reply') {
                       setChatWidgetOpen(true);
                   } else if (payload.type === 'teacher_notification') {
                       setNotificationPopup({
                           isOpen: true,
                           title: payload.title || "Notification",
                           message: payload.message || "You have a new message."
                       });
                       // Also navigate to teacher profile if ID is present
                       if (payload.teacherId) {
                           handleNavigate({ name: 'teacher_profile', teacherId: payload.teacherId });
                       }
                   }
              }
          };

          navigator.serviceWorker.addEventListener('message', handler);
          return () => navigator.serviceWorker.removeEventListener('message', handler);
      }
  }, [setChatWidgetOpen, setNotificationPopup, handleNavigate]);

  // Google Analytics Page View Tracking for SPA
  useEffect(() => {
    if ((window as any).gtag) {
      const path = window.location.hash.substring(1) || '/';
      const GA_ID = "G-98MHPV86X9";
      (window as any).gtag("config", GA_ID, {
        page_path: path,
      });
      console.log(`GA Page View Sent: ${path}`);
    }
  }, [pageState]);

  // Security check for protected routes
  useEffect(() => {
    if (authLoading) {
      return; // Wait for authentication to resolve
    }

    const protectedAdminRoutes: PageState['name'][] = [
      'admin_dashboard',
      'admin_view_student_dashboard',
      'admin_ti_dashboard',
    ];
    
    const protectedInstituteRoutes: PageState['name'][] = [
      'ti_dashboard',
    ];

    const isProtectedAdminRoute = protectedAdminRoutes.includes(pageState.name);
    const isProtectedInstituteRoute = protectedInstituteRoutes.includes(pageState.name);

    if (isProtectedAdminRoute) {
        if (!currentUser) {
            addToast('Please log in to access this page.', 'error');
            handleNavigate({ name: 'home' });
            setModalState({ name: 'login' });
        } else if (currentUser.role !== 'admin') {
            addToast('You do not have permission to access this page.', 'error');
            handleNavigate({ name: 'home' });
        }
    }

    if (isProtectedInstituteRoute) {
        if (!currentUser) {
            addToast('Please log in to access this page.', 'error');
            handleNavigate({ name: 'home' });
            setModalState({ name: 'login' });
        } else if (currentUser.role !== 'tuition_institute') {
            addToast('You must be a Tuition Institute to access this page.', 'error');
            handleNavigate({ name: 'home' });
        }
    }
  }, [pageState.name, currentUser, authLoading, addToast, handleNavigate, setModalState]);

  useEffect(() => {
    const processPayment = async () => {
        if (authLoading || dataLoading || paymentProcessedRef.current) {
            return;
        }

        const hash = window.location.hash;
        const queryPart = hash.includes('?') ? hash.substring(hash.indexOf('?')) : '';
        if (!queryPart) {
            return;
        }

        const params = new URLSearchParams(queryPart);

        const isWebxpay = params.has('status_code') && params.has('custom_fields');
        const isMarx = params.has('payment_gateway') && params.get('payment_gateway') === 'marxipg';
        
        if (!isWebxpay && !isMarx) {
            return;
        }
        
        paymentProcessedRef.current = true;

        // WebXPay callback
        if (isWebxpay) {
            const navigationState = await handlePaymentResponse(params);
            if (navigationState) {
                handleNavigate(navigationState);
            }
        } 
        // Marx IPG callback
        else if (isMarx) {
            const trId = params.get('trId');
            const merchantRID = params.get('merchantRID');

            if (trId && merchantRID) {
                try {
                    const MARX_FUNCTION_URL = 'https://marxpaymenthandler-gtlcyfs7jq-uc.a.run.app';
                    const response = await fetch(`${MARX_FUNCTION_URL}/completePayment`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ trId, merchantRID })
                    });

                    const result = await response.json();

                    if (result.success && result.finalStatus === 'SUCCESS') {
                        const newParams = new URLSearchParams();
                        newParams.append('status_code', '00'); // Simulate WebXPay success
                        newParams.append('custom_fields', result.custom_fields);
                        
                        const navigationState = await handlePaymentResponse(newParams);
                        if (navigationState) {
                            handleNavigate(navigationState);
                        }
                    } else {
                        addToast(`Payment failed: ${result.message && result.message !== 'null' ? result.message : 'Transaction was unsuccessful.'}`, 'error');
                        handleNavigate({ name: 'home' });
                    }
                } catch (error) {
                    console.error("Error completing Marx payment:", error);
                    addToast('There was an issue verifying your payment. Please contact support.', 'error');
                    handleNavigate({ name: 'home' });
                }
            }
        }
    };
    processPayment();
  }, [authLoading, dataLoading, handlePaymentResponse, handleNavigate, addToast]);

  const renderPage = () => {
    // Add guards to prevent rendering protected content before redirection.
    const protectedAdminRoutes = ['admin_dashboard', 'admin_view_student_dashboard', 'admin_ti_dashboard'];
    const protectedInstituteRoutes = ['ti_dashboard'];

    if (protectedAdminRoutes.includes(pageState.name) && (!currentUser || currentUser.role !== 'admin')) {
        return <div className="flex justify-center items-center h-screen"><SpinnerIcon className="w-8 h-8 text-primary" /></div>;
    }
    if (protectedInstituteRoutes.includes(pageState.name) && (!currentUser || currentUser.role !== 'tuition_institute')) {
        return <div className="flex justify-center items-center h-screen"><SpinnerIcon className="w-8 h-8 text-primary" /></div>;
    }

    switch (pageState.name) {
      case 'home': return <HomePage />;
      case 'all_teachers': return <AllTeachersPage />;
      case 'all_courses': return <AllCoursesPage />;
      case 'all_classes': return <AllClassesPage />;
      case 'all_quizzes': return <AllQuizzesPage />;
      case 'all_exams': return <AllExamsPage />;
      case 'all_events': return <AllEventsPage />;
      case 'all_products': return <AllProductsPage />;
      case 'teacher_profile_slug': return <TeacherProfilePage slug={pageState.slug} />;
      case 'teacher_profile': return <TeacherProfilePage teacherId={pageState.teacherId} />;
      case 'gift_voucher': return <GiftVoucherPage />;
      case 'voucher_success': return <GiftVoucherPage vouchers={pageState.vouchers} />;
      case 'topup_success': return <GiftVoucherPage successData={pageState.successData} />;
      case 'referral_dashboard': return <ReferralDashboardPage />;
      case 'teacher_referral_landing': return <TeacherReferralLandingPage refCode={pageState.refCode} level={pageState.level} />;
      case 'course_detail': return <CourseDetailPage courseId={pageState.courseId} />;
      case 'class_detail': return <ClassDetailPage classId={pageState.classId} />;
      case 'quiz_detail': return <QuizDetailPage quizId={pageState.quizId} instanceId={pageState.instanceId} />;
      case 'event_detail': return <EventDetailPage eventId={pageState.eventId} />;
      case 'product_detail': return <ProductDetailPage productId={pageState.productId} />;
      case 'student_dashboard': return <StudentDashboard />;
      case 'admin_dashboard': return <AdminDashboard />;
      case 'admin_view_student_dashboard': return <StudentDashboard userId={pageState.userId} isAdminView={true} />;
      case 'ti_dashboard': return <TuitionInstituteDashboard />;
      case 'admin_ti_dashboard': return <TuitionInstituteDashboard instituteId={pageState.instituteId} isAdminView={true} />;
      case 'attendance_scanner': return <AttendanceScannerPage classId={pageState.classId} eventId={pageState.eventId} />;
      case 'edit_teacher_profile': {
        const { teacherId } = pageState;
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) return <div>Teacher not found</div>;
        return <EditProfilePage 
            teacher={teacher} 
            onSave={(updatedTeacher) => {
                handleUpdateTeacher(updatedTeacher.id, updatedTeacher);
                if (updatedTeacher.username) {
                  handleNavigate({ name: 'teacher_profile_slug', slug: updatedTeacher.username });
                } else {
                  handleNavigate({ name: 'teacher_profile', teacherId: updatedTeacher.id });
                }
            }}
            onCancel={() => handleNavigate({ name: 'teacher_profile', teacherId: teacher.id })}
        />;
      }
      case 'course_editor': {
        const { courseId, teacherId } = pageState;
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) return <div>Teacher not found</div>;
        const courseData = courseId ? teacher.courses.find(c => c.id === courseId) : null;
        if (courseId && !courseData) return <div>Course not found</div>;
        return <CourseEditorPage 
            courseData={courseData || null} 
            teacherId={teacherId}
            onSave={handleSaveCourse}
            onCancel={() => handleNavigate({ name: 'teacher_profile', teacherId: teacher.id })}
        />;
      }
      case 'quiz_editor': {
        const { quizId, teacherId } = pageState;
        const teacher = teachers.find(t => t.id === teacherId);
        const quizData = teacher?.quizzes.find(q => q.id === quizId);
        if (!teacher || (quizId && !quizData)) return <div>Quiz not found</div>;
        return <QuizEditorPage 
            quizData={quizData!} 
            teacherId={teacherId}
            onSave={handleSaveQuiz}
            onCancel={() => handleNavigate({ name: 'teacher_profile', teacherId: teacher.id })}
        />;
      }
      case 'quiz_taking': {
        const { quizId } = pageState;
        let quizData: Quiz | null = null;
         for (const t of teachers) {
            const foundQuiz = t.quizzes.find(q => q.id === quizId);
            if (foundQuiz) {
                quizData = foundQuiz;
                break;
            }
        }
        if (!quizData && currentUser) { // Fallback for taking quiz of deleted item
             const saleRecord = sales.find(s => s.studentId === currentUser.id && s.itemType === 'quiz' && s.itemId === quizId);
             if (saleRecord) {
                 quizData = saleRecord.itemSnapshot as Quiz;
             }
        }
        if (!quizData || !currentUser) return <div>Quiz not found or user not logged in</div>;
        return <QuizTakingPage 
            quizData={quizData} 
            currentUser={currentUser}
            onFinishQuiz={handleFinishQuiz}
            onBack={handleBack}
        />;
      }
      case 'payment_redirect': {
          if (!currentUser && pageState.payload.type !== 'voucher' && pageState.payload.type !== 'external_topup' && pageState.payload.type !== 'marketplace_purchase' && pageState.payload.type !== 'photo_purchase' && pageState.payload.type !== 'teacher_subscription') {
              return <div>Please log in to complete the payment.</div>;
          }
          return <PaymentRedirectPage
            user={currentUser}
            payload={pageState.payload}
          />;
      }
      case 'subscription_success': {
          return <SubscriptionSuccessPage 
            planLevel={pageState.planLevel}
            amount={pageState.amount}
            transactionId={pageState.transactionId}
            billingDetails={pageState.billingDetails}
            refCode={pageState.refCode}
          />;
      }
      case 'static':
         const content = staticPageContent[pageState.pageKey];
         return <StaticPage title={content.title} content={content.content} onBack={handleBack} />;
      default: return <div>Page Not Found</div>;
    }
  };

  const renderModal = () => {
    if (modalState.name === 'login') return <LoginPage />;
    if (modalState.name === 'forgot_password') return <ForgotPasswordModal />;
    // FIX: Removed userToEdit prop from StudentProfileModal. It gets the user from context.
    if (modalState.name === 'edit_student_profile') return <StudentProfileModal />;
    if (modalState.name === 'cart') return <CartModal />;
    if (modalState.name === 'register') {
      return <RegistrationPage 
        refCode={modalState.refCode} 
        googleUser={modalState.googleUser} 
        firebaseUser={modalState.firebaseUser} 
        initialMethod={modalState.initialMethod}
        prefillData={modalState.prefillData}
      />;
    }
    return null;
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text`}>
      <ChristmasAnimation />
      {isMobile && !currentUser && !authLoading && showWelcomeGate && (
        <MobileWelcomeGate onLogin={handleGateLogin} onBrowse={handleGateBrowse} />
      )}
      <Header />
      <main className="flex-grow pb-20 md:pb-0">{renderPage()}</main>
      <Footer />
      <ChatWidget />
      
      {renderModal()}
      {imageUploadModal.isOpen && <ImageUploadModal />}
      {videoPlayerState.isOpen && videoPlayerState.lecture && videoPlayerState.course && <VideoPlayerModal />}
      {prePurchaseVerificationModal.isOpen && <PrePurchaseVerificationModal />}
      
      {/* Global Notification Popup */}
      <NotificationPopup />

      <ScrollToTopButton />
      <ToastManager />
      <BottomNavBar />
    </div>
  );
}

function App() {
  return (
    <NavigationProvider>
      <UIProvider>
        <AuthProvider>
          <DataProvider>
            <FirebaseProvider>
              <AppContent />
            </FirebaseProvider>
          </DataProvider>
        </AuthProvider>
      </UIProvider>
    </NavigationProvider>
  );
}

export default App;
