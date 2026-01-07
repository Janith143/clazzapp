import React, { useState, useEffect, useCallback } from 'react';
// FIX: Removed duplicate FirebaseUser import to resolve a name collision. It is correctly imported as a type on line 9.
import { UserRole, User, Teacher, GoogleUserInfo, TuitionInstitute, Address, ContactInfo } from '../types';
import { UserPlusIcon, GoogleIcon, PhoneIcon, CheckCircleIcon } from '../components/Icons';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { useData } from '../contexts/DataContext';
import { useNavigation } from '../contexts/NavigationContext';
import type { FirebaseUser } from '../types';
import FormInput from '../components/FormInput';
import { isTemporaryEmail, sendNotification } from '../utils';
import { db } from '../firebase';
// FIX: Update Firebase imports for v9 modular SDK
import { doc, getDoc, writeBatch } from 'firebase/firestore';

interface RegistrationPageProps {
    refCode?: string;
    googleUser?: GoogleUserInfo;
    firebaseUser?: FirebaseUser;
    initialMethod?: 'email' | 'mobile';
    preventRedirect?: boolean;
    prefillData?: { firstName: string; lastName: string; email: string; contactNumber: string; };
}

const roles: UserRole[] = ['student', 'teacher'];

const generateNewId = (role: UserRole, allUsers: User[]): string => {
    const prefix = role === 'teacher' ? 'TID' : (role === 'student' ? 'SID' : 'TI');
    const relevantUsers = allUsers.filter(u => u.id.startsWith(prefix));

    let maxNum = 0;
    relevantUsers.forEach(user => {
        const match = user.id.match(new RegExp(`^${prefix}(\\d{4})`));
        if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) {
                maxNum = num;
            }
        }
    });

    const newNum = maxNum + 1;
    const paddedNum = String(newNum).padStart(4, '0');

    const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const suffix = randomChars[Math.floor(Math.random() * randomChars.length)] + randomChars[Math.floor(Math.random() * randomChars.length)];

    return `${prefix}${paddedNum}${suffix}`;
};


const RegistrationPage: React.FC<RegistrationPageProps> = ({ refCode, googleUser, firebaseUser, initialMethod, prefillData }) => {
    const { modalState, setModalState, addToast } = useUI();
    const { handleRegister, handleLoginSuccess, handleGoogleSignIn, updateUserAuthEmail } = useAuth();
    const { users, addUser, addTeacher, teachers, addTuitionInstitute } = useData();
    const { handleNavigate, teacherCardTaglines, functionUrls } = useNavigation();

    const isSocialSignup = !!googleUser || !!firebaseUser;
    const isPhoneOnlySignup = !!(firebaseUser && firebaseUser.phoneNumber && !firebaseUser.email);
    const isInstituteSignup = modalState.name === 'register' && modalState.userType === 'tuition_institute';
    const initialRoleProp = modalState.name === 'register' ? modalState.initialRole : undefined;
    const preventRedirect = modalState.name === 'register' ? modalState.preventRedirect : false;


    const [formData, setFormData] = useState({
        email: googleUser?.email || firebaseUser?.email || prefillData?.email || '',
        password: '',
        confirmPassword: '',
        firstName: isInstituteSignup ? '' : (googleUser?.displayName?.split(' ')[0] || prefillData?.firstName || ''),
        lastName: isInstituteSignup ? '' : (googleUser?.displayName?.split(' ').slice(1).join(' ') || prefillData?.lastName || ''),
        instituteName: isInstituteSignup ? (googleUser?.displayName || '') : '',
        contactNumber: prefillData?.contactNumber || '',
    });

    const [activeRole, setActiveRole] = useState<UserRole>(isInstituteSignup ? 'tuition_institute' : (initialRoleProp || 'student'));
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRefCodeVisible, setIsRefCodeVisible] = useState(!!refCode);
    const [refCodeInput, setRefCodeInput] = useState(refCode || '');
    const [registrationSuccess, setRegistrationSuccess] = useState(false);


    const handleClose = useCallback(() => setModalState({ name: 'none' }), [setModalState]);

    // FIX: Added useEffect to redirect to the login modal for the mobile OTP flow.
    useEffect(() => {
        if (initialMethod === 'mobile') {
            // Redirect to login page for OTP flow, preserving refCode
            setModalState({ name: 'login', initialMethod: 'mobile', userType: isInstituteSignup ? 'tuition_institute' : 'user', refCode, preventRedirect });
        }
    }, [initialMethod, setModalState, isInstituteSignup, refCode, preventRedirect]);

    // FIX: Sync formData when googleUser or firebaseUser props change after mount
    useEffect(() => {
        if (googleUser) {
            setFormData(prev => ({
                ...prev,
                email: googleUser.email || prev.email,
                firstName: !isInstituteSignup ? (googleUser.displayName?.split(' ')[0] || prev.firstName) : prev.firstName,
                lastName: !isInstituteSignup ? (googleUser.displayName?.split(' ').slice(1).join(' ') || prev.lastName) : prev.lastName,
                instituteName: isInstituteSignup ? (googleUser.displayName || prev.instituteName) : prev.instituteName
            }));
        } else if (firebaseUser) {
            setFormData(prev => ({
                ...prev,
                email: firebaseUser.email || prev.email,
            }));
        } else if (prefillData) {
            setFormData(prev => ({
                ...prev,
                email: prefillData.email || prev.email,
                firstName: prefillData.firstName || prev.firstName,
                lastName: prefillData.lastName || prev.lastName,
                contactNumber: prefillData.contactNumber || prev.contactNumber
            }));
        }
    }, [googleUser, firebaseUser, isInstituteSignup, prefillData]);

    const navigateToDashboard = (user: User) => {
        if (preventRedirect) {
            setModalState({ name: 'none' });
            return;
        }

        const teacher = teachers.find(t => t.userId === user.id);
        if (user.role === 'admin') {
            handleNavigate({ name: 'admin_dashboard' });
        } else if (user.role === 'teacher' && teacher) {
            handleNavigate({ name: 'teacher_profile', teacherId: teacher.id });
        } else if (user.role === 'tuition_institute') {
            handleNavigate({ name: 'ti_dashboard' });
        } else {
            handleNavigate({ name: 'student_dashboard' });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }

    const findReferrerId = (code: string | undefined): string | undefined => {
        if (!code) return undefined;
        const referrer = users.find(u => u.referralCode.toUpperCase() === code.toUpperCase());
        return referrer?.id;
    };

    const handleGoogleSignUp = async () => {
        setLoading(true);
        setError('');
        try {
            const { existingUser, newUserInfo } = await handleGoogleSignIn();
            if (existingUser) {
                addToast(`Welcome back, ${existingUser.firstName}! You're already registered.`, 'info');
                navigateToDashboard(existingUser);
            } else if (newUserInfo) {
                // Pass existing userType to preserve state
                setModalState({ name: 'register', googleUser: newUserInfo, userType: isInstituteSignup ? 'tuition_institute' : 'user', preventRedirect });
            }
        } catch (err: any) {
            if (err.code === 'auth/account-exists-with-different-credential') {
                setError("An account already exists with this email address. Please sign in using your original method (e.g., email and password, or mobile OTP).");
            } else if (err.message && (err.message.toLowerCase().includes('firebase:') || err.code?.toLowerCase().includes('auth/'))) {
                setError("An error occurred while signing up with Google. Please try again or contact support.");
            } else {
                setError(err.message || 'Failed to sign up with Google.');
            }
        } finally {
            setLoading(false);
        }
    };

    const createProfile = async (
        fbUser: FirebaseUser,
        details: { firstName: string; lastName: string; email: string; role: UserRole; avatar?: string, instituteName?: string; contactNumber?: string; }
    ) => {
        const { firstName, lastName, email, role, avatar, instituteName, contactNumber } = details;

        if (email && isTemporaryEmail(email)) {
            throw new Error("Registration with temporary email addresses is not allowed.");
        }

        const referrerId = findReferrerId(refCodeInput);
        const newId = generateNewId(role, users);

        // 1. Prepare User Object
        const newUser: User = {
            id: newId,
            uid: fbUser.uid,
            firstName: role === 'tuition_institute' ? instituteName! : firstName,
            lastName: role === 'tuition_institute' ? '(Institute)' : lastName,
            email, role,
            avatar: avatar || fbUser.photoURL || '',
            contactNumber: contactNumber || fbUser.phoneNumber || '',
            status: 'active',
            accountBalance: 0,
            referralBalance: { total: 0, withdrawn: 0, available: 0 }, // Initialize manually as we skip addUser hook
            referralCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
            isEmailVerified: fbUser.emailVerified,
            isMobileVerified: !!fbUser.phoneNumber,
            createdAt: new Date().toISOString(),
            ...(referrerId && { referrerId }),
        };

        // 2. Prepare Profile Object (Teacher or Institute)
        let newTeacher: Teacher | null = null;
        let newInstitute: TuitionInstitute | null = null;

        if (role === 'teacher') {
            const generateUniqueUsername = (fullName: string, allTeachers: Teacher[]): string => {
                const baseSlug = fullName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
                const allUsernames = new Set(allTeachers.map(t => t.username));

                if (!allUsernames.has(baseSlug)) return baseSlug;

                let counter = 2;
                let newSlug = `${baseSlug}${counter}`;
                while (allUsernames.has(newSlug)) {
                    counter++;
                    newSlug = `${baseSlug}${counter}`;
                }
                return newSlug;
            };

            const newTeacherUsername = generateUniqueUsername(`${newUser.firstName} ${newUser.lastName}`, teachers);
            const randomTagline = teacherCardTaglines && teacherCardTaglines.length > 0
                ? teacherCardTaglines[Math.floor(Math.random() * teacherCardTaglines.length)]
                : 'Passionate Educator Ready to Inspire';

            newTeacher = {
                id: newUser.id, userId: newUser.id, name: `${newUser.firstName} ${newUser.lastName}`,
                username: newTeacherUsername, email: newUser.email, profileImage: newUser.avatar,
                avatar: newUser.avatar,
                coverImages: [],
                tagline: randomTagline, bio: '', subjects: [], exams: [], qualifications: [], languages: [], experienceYears: 0,
                contact: { phone: fbUser.phoneNumber || '', email: newUser.email, location: '', onlineAvailable: true },
                timetable: [], individualClasses: [], courses: [], quizzes: [], achievements: [],
                registrationStatus: 'pending', earnings: { total: 0, withdrawn: 0, available: 0 },
                withdrawalHistory: [], payoutDetails: null, commissionRate: 25,
                verification: { id: { status: 'unverified' }, bank: { status: 'unverified' } },
                ratings: [],
            };
        } else if (role === 'tuition_institute') {
            newInstitute = {
                id: newUser.id,
                userId: newUser.id,
                name: instituteName!,
                address: { line1: '', city: '', state: '', postalCode: '', country: 'Sri Lanka' },
                contact: { phone: contactNumber || '', email: email, location: '', onlineAvailable: true },
                commissionRate: 25,
                platformMarkupRate: 15,
                registrationStatus: 'pending',
                earnings: { total: 0, withdrawn: 0, available: 0 },
                withdrawalHistory: [],
            };
        }

        // 3. ATOMIC WRITE: Create User AND Profile in one batch
        try {
            const batch = writeBatch(db);

            // Add User
            const userRef = doc(db, "users", newUser.id);
            batch.set(userRef, newUser);

            // Add Profile
            if (role === 'teacher' && newTeacher) {
                const teacherRef = doc(db, "teachers", newTeacher.id);
                batch.set(teacherRef, newTeacher);
            } else if (role === 'tuition_institute' && newInstitute) {
                const instituteRef = doc(db, "tuitionInstitutes", newInstitute.id);
                batch.set(instituteRef, newInstitute);
            }

            await batch.commit();

            // 4. Post-Registration Notifications (Side Effects)

            // A. Admin Notification
            const ADMIN_EMAIL = 'admin@clazz.lk';
            const subject = `New ${newUser.role} Registration: ${newUser.firstName} ${newUser.lastName}`;
            const approvalMessage = (newUser.role === 'teacher' || newUser.role === 'tuition_institute')
                ? "<p>This account is now pending your approval in the admin dashboard.</p>"
                : "";
            const htmlBody = `
              <div style="font-family: Arial, sans-serif; color: #333;">
                  <p>A new user has registered on Clazz.lk.</p>
                  <ul>
                      <li><strong>Name:</strong> ${newUser.firstName} ${newUser.lastName}</li>
                      <li><strong>Role:</strong> ${newUser.role}</li>
                      <li><strong>Email:</strong> ${newUser.email}</li>
                      <li><strong>User ID:</strong> ${newUser.id}</li>
                  </ul>
                  ${approvalMessage}
              </div>
          `;
            // We fire and forget notifications to not block the UI response
            sendNotification(functionUrls.notification, { email: ADMIN_EMAIL }, subject, htmlBody).catch(console.error);


            // B. Referrer Notification
            if (referrerId && role === 'teacher') {
                const referrer = users.find(u => u.id === referrerId);
                if (referrer) {
                    const newTeacherName = `${firstName} ${lastName}`;
                    const refSubject = "A new teacher joined using your referral code!";
                    const refBody = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <p>Hi ${referrer.firstName},</p>
                        <p>Great news! A new teacher, <strong>${newTeacherName}</strong>, has registered on Clazz.lk using your referral code.</p>
                        <p>Once their account is approved and they start generating platform income, you will begin earning commissions.</p>
                        <p>Thank you for helping our community grow!</p>
                        <p>The Clazz.lk Team</p>
                    </div>
                `;
                    sendNotification(functionUrls.notification, { email: referrer.email }, refSubject, refBody).catch(console.error);
                }
            }

        } catch (error: any) {
            console.error("Batch Registration Failed:", error);
            throw new Error("Failed to create account profile. Type: " + error.code || error.message);
        }

        return newUser;
    };

    const handleEmailRegistrationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (activeRole !== 'tuition_institute' && (!formData.firstName || !formData.lastName)) { setError('First and last name are required.'); return; }
        if (activeRole === 'tuition_institute' && !formData.instituteName) { setError('Institute name is required.'); return; }
        if (formData.password !== formData.confirmPassword) { setError('Passwords do not match.'); return; }
        if (formData.password.length < 6) { setError('Password must be at least 6 characters long.'); return; }

        setLoading(true);
        try {
            const fbUser = await handleRegister(formData.email, formData.password);
            if (fbUser) {
                await createProfile(fbUser, {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    instituteName: formData.instituteName,
                    contactNumber: formData.contactNumber,
                    email: formData.email,
                    role: activeRole,
                });
                setRegistrationSuccess(true);
            }
        } catch (err: any) {
            if (err.code === 'auth/email-already-in-use') {
                setError("This email address is already in use by another account. Please try to log in or use a different email.");
            } else if (err.message && (err.message.toLowerCase().includes('firebase:') || err.code?.toLowerCase().includes('auth/'))) {
                setError("An error occurred during registration. Please try again or contact support.");
            } else {
                setError(err.message || "Registration failed.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleProfileCompletionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const fbUser = firebaseUser || (googleUser ? { uid: googleUser.uid, emailVerified: true, photoURL: googleUser.photoURL, phoneNumber: null, email: googleUser.email } as unknown as FirebaseUser : null);

        if (!fbUser) {
            setError("Session error. Please try signing in again.");
            setLoading(false);
            return;
        }

        try {
            if (isPhoneOnlySignup && formData.email) {
                try {
                    await updateUserAuthEmail(formData.email);
                } catch (authError: any) {
                    // This specific error comes from our custom logic in AuthContext
                    if (authError.message.includes("This email is already associated")) {
                        setError("This email is already in use by another account. Please use a different email or contact support.");
                    } else {
                        setError(authError.message || "Failed to link email address.");
                    }
                    setLoading(false);
                    return;
                }
            }

            const newUser = await createProfile(fbUser, {
                firstName: formData.firstName,
                lastName: formData.lastName,
                instituteName: formData.instituteName,
                contactNumber: formData.contactNumber,
                email: formData.email,
                role: activeRole,
            });

            handleLoginSuccess(newUser, 'Registration successful! Welcome.');
            navigateToDashboard(newUser);

        } catch (err: any) {
            setError(err.message || "Failed to create profile.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = isSocialSignup ? handleProfileCompletionSubmit : handleEmailRegistrationSubmit;
    const modalTitle = registrationSuccess ? "Registration Successful" : (isInstituteSignup ? "Register Your Institute" : "Create your account");

    return (
        <Modal isOpen={true} onClose={handleClose} title={modalTitle}>
            {registrationSuccess ? (
                <div className="text-center p-4 animate-fadeIn">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold">Please verify your email</h3>
                    <p className="text-light-subtle dark:text-dark-subtle mt-2">
                        A verification link has been sent to your email address. Please check your inbox (and spam folder) and click the link to complete your registration.
                    </p>
                    <div className="mt-6">
                        <button
                            onClick={() => setModalState({ name: 'login', userType: isInstituteSignup ? 'tuition_institute' : 'user', preventRedirect })}
                            className="w-full bg-primary text-white font-bold py-3 rounded-md hover:bg-primary-dark transition-colors"
                        >
                            OK
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isInstituteSignup ? (
                            <>
                                <FormInput label="Institute Name" name="instituteName" value={formData.instituteName} onChange={handleChange} required />
                                <FormInput label="Contact Number" name="contactNumber" type="tel" value={formData.contactNumber} onChange={handleChange} required placeholder="+94771234567" />
                            </>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormInput label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
                                <FormInput label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
                            </div>
                        )}

                        {!isInstituteSignup && (
                            <FormInput label="Contact Number" name="contactNumber" type="tel" value={formData.contactNumber} onChange={handleChange} required placeholder="+94771234567" />
                        )}

                        {!isPhoneOnlySignup && (
                            <FormInput label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required disabled={!!googleUser?.email || !!firebaseUser?.email || !!prefillData?.email} />
                        )}

                        {!isSocialSignup && (
                            <>
                                <FormInput label="Password" name="password" type="password" value={formData.password} onChange={handleChange} required />
                                <FormInput label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required />
                            </>
                        )}

                        {!isInstituteSignup && !initialRoleProp && (
                            <>
                                <div className="text-sm">
                                    {!isRefCodeVisible ? (
                                        <button type="button" onClick={() => setIsRefCodeVisible(true)} className="font-medium text-primary hover:text-primary-dark">
                                            Have a referral code?
                                        </button>
                                    ) : (
                                        <FormInput
                                            label="Referral Code (Optional)"
                                            name="refCode"
                                            value={refCodeInput}
                                            onChange={(e) => setRefCodeInput(e.target.value)}
                                            placeholder="Enter code"
                                        />
                                    )}
                                </div>
                                <div className="border-b border-light-border dark:border-dark-border pt-2">
                                    <nav className="-mb-px flex justify-center space-x-4"><p className="py-3 px-1 text-sm font-medium">I am a:</p>{roles.map(role => (<button type="button" key={role} onClick={() => setActiveRole(role)} className={`${activeRole === role ? 'border-primary text-primary' : 'border-transparent text-light-subtle dark:text-dark-subtle hover:text-light-text'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm capitalize`}>{role}</button>))}</nav>
                                </div>
                            </>
                        )}
                        {initialRoleProp && (
                            <div className="text-sm text-center font-medium p-2 bg-light-background dark:bg-dark-background rounded-md border border-light-border dark:border-dark-border">
                                Registering as a <span className="capitalize font-bold text-primary">{initialRoleProp}</span>
                            </div>
                        )}
                        <div className="pt-2">
                            <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark disabled:opacity-50">
                                <UserPlusIcon className="w-5 h-5 mr-2" />
                                {loading ? 'Saving...' : (isSocialSignup ? 'Complete Profile' : 'Create Account')}
                            </button>
                        </div>
                    </form>

                    {!isSocialSignup && (
                        <>
                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-light-border dark:border-dark-border"></div>
                                <span className="flex-shrink mx-4 text-xs text-light-subtle dark:text-dark-subtle">OR SIGN UP WITH</span>
                                <div className="flex-grow border-t border-light-border dark:border-dark-border"></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={handleGoogleSignUp}
                                    className="group relative w-full flex justify-center py-2 px-4 border border-light-border dark:border-dark-border text-sm font-medium rounded-md text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface hover:bg-light-border dark:hover:bg-dark-border"
                                >
                                    <GoogleIcon className="w-5 h-5 mr-2" />
                                    Google
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModalState({ name: 'login', initialMethod: 'mobile', userType: isInstituteSignup ? 'tuition_institute' : 'user', preventRedirect })}
                                    className="group relative w-full flex justify-center py-2 px-4 border border-light-border dark:border-dark-border text-sm font-medium rounded-md text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface hover:bg-light-border dark:hover:bg-dark-border"
                                >
                                    <PhoneIcon className="w-5 h-5 mr-2" />
                                    Mobile (OTP)
                                </button>
                            </div>
                        </>
                    )}

                    {error && <p className="text-sm text-red-500 text-center pt-2">{error}</p>}

                    <p className="mt-6 text-center text-sm text-light-subtle dark:text-dark-subtle">
                        Already have an account?{' '}
                        <button onClick={() => setModalState({ name: 'login', userType: isInstituteSignup ? 'tuition_institute' : 'user', preventRedirect })} className="font-medium text-primary hover:text-primary-dark">
                            Sign in
                        </button>
                    </p>
                </div>
            )}
        </Modal>
    );
};

export default RegistrationPage;