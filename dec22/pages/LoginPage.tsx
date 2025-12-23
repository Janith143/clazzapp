
import React, { useState, useCallback, useEffect } from 'react';
import { User, UserRole } from '../types';
import Modal from '../components/Modal';
import { UserCircleIcon, MailIcon, PhoneIcon, GoogleIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { useData } from '../contexts/DataContext';
import { useNavigation } from '../contexts/NavigationContext';
import type { FirebaseUser } from '../types';
import FormInput from '../components/FormInput';

const LoginPage: React.FC = () => {
    const { modalState, setModalState, addToast } = useUI();
    const { handleLogin, handleGoogleSignIn, handleResendVerificationEmail, sendPhoneNumberOtp, verifyPhoneNumberOtp } = useAuth();
    const { teachers } = useData();
    const { handleNavigate } = useNavigation();
    
    const isInstituteLogin = modalState.name === 'login' && modalState.userType === 'tuition_institute';
    const refCode = modalState.name === 'login' ? modalState.refCode : undefined;
    const preventRedirect = modalState.name === 'login' ? modalState.preventRedirect : false;

    const getInitialMethod = () => (modalState.name === 'login' && modalState.initialMethod) ? modalState.initialMethod : 'email';

    const [loginMethod, setLoginMethod] = useState<'email' | 'mobile'>(getInitialMethod());
    const [emailFormData, setEmailFormData] = useState({ email: '', password: '' });
    const [mobileStep, setMobileStep] = useState<'phone' | 'otp'>('phone');
    const [phoneNumber, setPhoneNumber] = useState('+94');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [unverifiedUser, setUnverifiedUser] = useState<FirebaseUser | null>(null);
    const [isRoleMismatch, setIsRoleMismatch] = useState(false);

    const handleClose = useCallback(() => {
        setModalState({ name: 'none' });
    }, [setModalState]);

    useEffect(() => {
        if (modalState.name === 'login' && modalState.initialMethod) {
            setLoginMethod(modalState.initialMethod);
        }
    }, [modalState]);

    const navigateToDashboard = (user: User) => {
        if (preventRedirect) {
            handleClose();
            return;
        }

        if (user.role === 'admin') {
            handleNavigate({ name: 'admin_dashboard' });
        } else if (user.role === 'teacher') {
            const teacher = teachers.find(t => t.userId === user.id);
            if (teacher) {
                handleNavigate({ name: 'teacher_profile', teacherId: teacher.id });
            } else {
                handleNavigate({ name: 'home' });
            }
        } else if (user.role === 'tuition_institute') {
            handleNavigate({ name: 'ti_dashboard' });
        } else {
            handleNavigate({ name: 'student_dashboard' });
        }
    };

    const handleLoginError = (user: User) => {
        setIsRoleMismatch(true);
        if (isInstituteLogin && user.role !== 'tuition_institute') {
            setError(`This is a ${user.role} account. Please use the general login page.`);
        } else if (!isInstituteLogin && user.role === 'tuition_institute') {
            setError('This is an Institute account. Please use the Institute Login page.');
        }
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmailFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setIsRoleMismatch(false);
        setUnverifiedUser(null);
        try {
            const user = await handleLogin(emailFormData.email, emailFormData.password);
            if (user) {
                if ((isInstituteLogin && user.role !== 'tuition_institute') || (!isInstituteLogin && user.role === 'tuition_institute')) {
                    handleLoginError(user);
                    return;
                }
                navigateToDashboard(user);
            }
        } catch (err: any) {
            if (err.code === 'auth/email-not-verified') {
                setError('Please verify your email to log in.');
                setUnverifiedUser(err.user);
            } else if (err.code === 'auth/profile-incomplete') {
                setError('');
                addToast("Welcome! Please complete your profile to continue.", "info");
                setModalState({ name: 'register', firebaseUser: err.user, userType: isInstituteLogin ? 'tuition_institute' : 'user', preventRedirect });
            } else {
                if (err.message && (err.message.toLowerCase().includes('firebase:') || err.code?.toLowerCase().includes('auth/'))) {
                    setError("An error occurred during sign-in. Please check your credentials or contact support.");
                } else {
                    setError(err.message || 'Failed to sign in.');
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!unverifiedUser) return;
        setLoading(true);
        setError('');
        try {
            await handleResendVerificationEmail(unverifiedUser);
            setUnverifiedUser(null);
        } catch (e: any) {
            setError(e.message || 'Failed to resend verification email.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        setIsRoleMismatch(false);
        try {
            const { existingUser, newUserInfo } = await handleGoogleSignIn();
            if (existingUser) {
                if ((isInstituteLogin && existingUser.role !== 'tuition_institute') || (!isInstituteLogin && existingUser.role === 'tuition_institute')) {
                     handleLoginError(existingUser);
                     return;
                }
                navigateToDashboard(existingUser);
            } else if (newUserInfo) {
                setModalState({ name: 'register', googleUser: newUserInfo, userType: isInstituteLogin ? 'tuition_institute' : 'user', preventRedirect });
            }
        } catch (err: any) {
            if (err.code === 'auth/account-exists-with-different-credential') {
                setError("An account already exists with this email address. Please sign in using your original method (e.g., email and password, or mobile OTP).");
            } else if (err.message && (err.message.toLowerCase().includes('firebase:') || err.code?.toLowerCase().includes('auth/'))) {
                 setError("An error occurred while signing in with Google. Please try again or contact support.");
            } else {
                 setError(err.message || 'Failed to sign in with Google.');
             }
        } finally {
            setLoading(false);
        }
    };
    
    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await sendPhoneNumberOtp(phoneNumber);
            setMobileStep('otp');
        } catch (err: any) {
            if (err.message && (err.message.toLowerCase().includes('firebase:') || err.code?.toLowerCase().includes('auth/'))) {
                setError("An unexpected error occurred while sending the OTP. Please check the number and try again, or contact support if the issue persists.");
            } else {
                setError(err.message || 'Failed to send OTP. The phone number might be invalid or already in use by another account.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setIsRoleMismatch(false);
        try {
            const { existingUser, newFirebaseUser } = await verifyPhoneNumberOtp(phoneNumber, otp);
            if (existingUser) {
                 if ((isInstituteLogin && existingUser.role !== 'tuition_institute') || (!isInstituteLogin && existingUser.role === 'tuition_institute')) {
                     handleLoginError(existingUser);
                     return;
                }
                navigateToDashboard(existingUser);
            } else if (newFirebaseUser) {
                setModalState({ name: 'register', firebaseUser: newFirebaseUser, userType: isInstituteLogin ? 'tuition_institute' : 'user', refCode, preventRedirect });
            }
        } catch (err: any) {
            if (err.code === 'auth/credential-already-in-use') {
                setError("This phone number is already associated with another account. Please log in using another method or contact support.");
            } else if (err.message && (err.message.toLowerCase().includes('firebase:') || err.code?.toLowerCase().includes('auth/'))) {
                setError("An error occurred during verification. Please try again or contact support.");
            } else {
                setError(err.message || 'Failed to verify OTP. Please check the code and try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const renderMobileForm = () => (
        <>
            <form onSubmit={mobileStep === 'phone' ? handlePhoneSubmit : handleOtpSubmit}>
                {mobileStep === 'phone' ? (
                    <FormInput 
                        label="Mobile Number"
                        name="phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+94771234567"
                        required
                    />
                ) : (
                    <>
                        <p className="text-center text-sm text-light-subtle dark:text-dark-subtle">
                            Enter the OTP sent to {phoneNumber}.{' '}
                            <button type="button" onClick={() => { setMobileStep('phone'); setError(''); }} className="font-medium text-primary hover:text-primary-dark">Change</button>
                        </p>
                        <FormInput
                            label="Verification Code"
                            name="otp"
                            type="text"
                            inputMode="numeric"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="Enter 6-digit OTP"
                            required
                        />
                    </>
                )}
                 <div className="pt-2">
                    <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50">
                        <PhoneIcon className="w-5 h-5 mr-2" />
                        {loading ? 'Sending...' : (mobileStep === 'phone' ? 'Send OTP' : 'Verify & Sign In')}
                    </button>
                </div>
            </form>
        </>
    );
    
    const modalTitle = isInstituteLogin ? "Institute Login" : "Sign in to your account";

    return (
        <Modal isOpen={true} onClose={handleClose} title={modalTitle}>
            <div className="space-y-6">
                <div className="border-b border-light-border dark:border-dark-border">
                    <nav className="-mb-px flex justify-center space-x-4" aria-label="Tabs">
                        <button
                            onClick={() => { setLoginMethod('email'); setError(''); setIsRoleMismatch(false); }}
                            className={`flex items-center whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                loginMethod === 'email'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-light-subtle dark:text-dark-subtle hover:text-light-text dark:hover:text-dark-text hover:border-light-border dark:hover:border-dark-border'
                            }`}
                        >
                            <MailIcon className="w-5 h-5 mr-2" /> Login with Email
                        </button>
                        <button
                            onClick={() => { setLoginMethod('mobile'); setError(''); setMobileStep('phone'); setIsRoleMismatch(false); }}
                            className={`flex items-center whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                loginMethod === 'mobile'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-light-subtle dark:text-dark-subtle hover:text-light-text dark:hover:text-dark-text hover:border-light-border dark:hover:border-dark-border'
                            }`}
                        >
                             <PhoneIcon className="w-5 h-5 mr-2" /> Login with Mobile
                        </button>
                    </nav>
                </div>
                
                {loginMethod === 'email' ? (
                    <form className="space-y-4" onSubmit={handleEmailSubmit}>
                        <FormInput label="Email Address" name="email" type="email" value={emailFormData.email} onChange={handleEmailChange} placeholder="Email address" required />
                        <FormInput label="Password" name="password" type="password" value={emailFormData.password} onChange={handleEmailChange} placeholder="Password" required />
                        
                        <div className="text-right text-sm">
                          <button
                            type="button"
                            onClick={() => setModalState({ name: 'forgot_password' })}
                            className="font-medium text-primary hover:text-primary-dark focus:outline-none"
                          >
                            Forgot your password?
                          </button>
                        </div>
                        
                        <div className="pt-2">
                            <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors disabled:opacity-50">
                                <UserCircleIcon className="w-5 h-5 mr-2" />
                                {loading ? 'Signing In...' : 'Sign In with Email'}
                            </button>
                        </div>
                    </form>
                ) : renderMobileForm()}

                {error && <p className="text-sm text-red-500 text-center pt-2">{error}</p>}
                
                {isRoleMismatch && (
                    <div className="text-center text-sm mt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setError('');
                                setIsRoleMismatch(false);
                                setModalState({ name: 'login', userType: isInstituteLogin ? 'user' : 'tuition_institute' });
                            }}
                            className="font-medium text-primary hover:text-primary-dark underline"
                        >
                            Click here to switch to the {isInstituteLogin ? 'User' : 'Institute'} Login page.
                        </button>
                    </div>
                )}

                {unverifiedUser && (
                    <div className="text-center text-sm">
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={loading}
                            className="font-medium text-primary hover:text-primary-dark focus:outline-none disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Resend verification email'}
                        </button>
                    </div>
                )}
                
                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-light-border dark:border-dark-border"></div>
                    <span className="flex-shrink mx-4 text-xs text-light-subtle dark:text-dark-subtle">OR</span>
                    <div className="flex-grow border-t border-light-border dark:border-dark-border"></div>
                </div>

                <div>
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="group relative w-full flex justify-center py-2 px-4 border border-light-border dark:border-dark-border text-sm font-medium rounded-md text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface hover:bg-light-border dark:hover:bg-dark-border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors"
                    >
                        <GoogleIcon className="w-5 h-5 mr-2" />
                        Sign in with Google
                    </button>
                </div>


                <p className="mt-6 text-center text-sm text-light-subtle dark:text-dark-subtle">
                    Don't have an account?{' '}
                    <button onClick={() => setModalState({ name: 'register', userType: isInstituteLogin ? 'tuition_institute' : 'user', refCode, preventRedirect })} className="font-medium text-primary hover:text-primary-dark">
                        Sign up
                    </button>
                </p>
            </div>
        </Modal>
    );
};

export default LoginPage;
