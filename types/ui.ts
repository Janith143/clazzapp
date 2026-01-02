import type { FirebaseUser, StaticPageKey, GoogleUserInfo } from './base';
import type { CartItem, PhotoCartItem, Sale, Event } from './commerce';
import type { BillingDetails, Voucher, PaymentMethod } from './payment';
import type { User } from './user';
import type { Course, IndividualClass, Quiz, Product } from './content';

export type EditableImageType = 'profile' | 'student_profile' | 'cover_add' | { type: 'cover', index: number } | 'admin_default_cover' | 'id_verification_front' | 'id_verification_back' | 'bank_verification' | 'payment_slip' | 'event_flyer' | 'quiz_question_image' | 'product_cover' | 'course_cover' | 'og_image' | 'payment_method_logo';

export type AdminView = 'analytics' | 'users' | 'content' | 'products' | 'revenue' | 'vouchers' | 'referrals' | 'allsales' | 'site_content' | 'calculation_guide' | 'photo_orders' | 'physical_orders' | 'payment_gateways' | 'staff' | 'developer' | 'requests' | 'communications';
export type DashboardTab = 'overview' | 'courses' | 'classes' | 'quizzes' | 'products' | 'history' | 'profile' | 'my_events' | 'my_orders' | 'past_classes' | 'score_card' | 'attendance' | 'timetable' | 'my_vouchers' | 'earnings' | 'certificates' | 'groups';

type PaymentRedirectPayload =
  | { type: 'enrollment'; item: Course | IndividualClass | Quiz | Event; sale: Sale; updatedUser?: User; selectedMethod?: PaymentMethod }
  | { type: 'topup'; amount: number; updatedUser?: User; selectedMethod?: PaymentMethod }
  | { type: 'voucher'; details: Omit<Voucher, 'id' | 'code' | 'isUsed' | 'purchasedAt' | 'expiresAt'>; quantity: number; totalAmount: number }
  | { type: 'external_topup'; students: Pick<User, 'id' | 'firstName' | 'lastName'>[]; amountPerStudent: number; totalAmount: number; billingDetails: BillingDetails }
  | { type: 'marketplace_purchase', cart: CartItem[], totalAmount: number, billingDetails: BillingDetails, shippingAddress?: import('./base').Address }
  | { type: 'photo_purchase', cart: PhotoCartItem[], totalAmount: number, instituteId: string, billingDetails: BillingDetails, shippingAddress?: import('./base').Address }
  | { type: 'teacher_subscription', planLevel: number, amount: number, refCode: string, billingDetails: BillingDetails, selectedMethod?: PaymentMethod }
  | { type: 'additional_service', customDetails: { serviceDetails: { title: string; description?: string }; amountPaidFromBalance: number; totalAmount: number }, sale: Sale, updatedUser?: User, selectedMethod?: PaymentMethod };

export type PageState =
  | { name: 'home' }
  | { name: 'all_teachers' }
  | { name: 'all_courses' }
  | { name: 'all_classes'; options?: { ongoingOnly?: boolean } }
  | { name: 'all_quizzes' }
  | { name: 'all_exams' }
  | { name: 'all_events' }
  | { name: 'all_products' }
  | { name: 'teacher_profile'; teacherId: string }
  | { name: 'teacher_profile_slug'; slug: string }
  | { name: 'course_detail'; courseId: string }
  | { name: 'course_detail_slug'; slug: string }
  | { name: 'class_detail'; classId: number }
  | { name: 'class_detail_slug'; slug: string }
  | { name: 'quiz_detail'; quizId: string; instanceId?: string }
  | { name: 'quiz_detail_slug'; slug: string; instanceId?: string }
  | { name: 'event_detail'; eventId: string }
  | { name: 'event_detail_slug'; slug: string }
  | { name: 'product_detail'; productId: string }
  | { name: 'product_detail_slug'; slug: string }
  | { name: 'student_dashboard', initialTab?: DashboardTab; joinCode?: string }
  | { name: 'admin_dashboard' }
  | { name: 'admin_view_student_dashboard'; userId: string }
  | { name: 'ti_dashboard' }
  | { name: 'admin_ti_dashboard'; instituteId: string }
  | { name: 'attendance_scanner'; classId?: number; eventId?: string }
  | { name: 'edit_teacher_profile'; teacherId: string }
  | { name: 'course_editor'; teacherId: string; courseId?: string }
  | { name: 'quiz_editor'; teacherId: string; quizId?: string }
  | { name: 'quiz_taking'; quizId: string }
  | {
    name: 'payment_redirect';
    payload: PaymentRedirectPayload;
  }
  | { name: 'static'; pageKey: StaticPageKey }
  | { name: 'referral_dashboard' }
  | { name: 'teacher_referral_landing'; refCode: string; level?: string }
  | { name: 'gift_voucher' }
  | { name: 'voucher_success'; vouchers: Voucher[] }
  | { name: 'topup_success'; successData: { students: User[]; amountPerStudent: number; totalAmount: number } }
  | { name: 'topup_success'; successData: { students: User[]; amountPerStudent: number; totalAmount: number } }
  | { name: 'subscription_success'; planLevel: number; amount: number; transactionId: string; billingDetails: BillingDetails; refCode: string }
  | { name: 'report_content' }
  | { name: 'request_deletion' }
  | { name: 'unsubscribe'; type?: 'sms' | 'email' };

export type ModalState =
  | { name: 'none' }
  | { name: 'login', initialMethod?: 'email' | 'mobile', userType?: 'user' | 'tuition_institute', refCode?: string, preventRedirect?: boolean }
  | {
    name: 'register',
    refCode?: string,
    googleUser?: GoogleUserInfo,
    firebaseUser?: FirebaseUser,
    userType?: 'user' | 'tuition_institute',
    initialRole?: 'teacher',
    initialMethod?: 'email' | 'mobile',
    preventRedirect?: boolean,
    prefillData?: { firstName: string; lastName: string; email: string; contactNumber: string; }
  }
  | { name: 'forgot_password' }
  | { name: 'edit_student_profile', initialStep?: number, userToEdit?: User, onSaveAndContinue?: (updatedData?: Partial<User>) => void }
  | { name: 'cart' };