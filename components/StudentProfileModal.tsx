
import React, { useState, useEffect, useCallback } from 'react';
import { User, Address, CustomExam, EducationEntry, ProjectEntry, ExperienceEntry, ReferenceEntry } from '../types.ts';
import Modal from './Modal.tsx';
import FormInput from './FormInput.tsx';
import FormSelect from './FormSelect.tsx';
import TagInput from './TagInput.tsx';
import ProgressBar from './ProgressBar.tsx';
import MarkdownEditor from './MarkdownEditor.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useData } from '../contexts/DataContext.tsx';
import { useUI } from '../contexts/UIContext.tsx';
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, MailIcon, PhoneIcon, PlusIcon, TrashIcon } from './Icons.tsx';
import { auth, db } from '../firebase.ts';
// FIX: Update Firebase imports for v9 modular SDK
import { doc, updateDoc } from 'firebase/firestore';
import { calculateStudentProfileCompletion } from '../utils.ts';
import { targetAudienceOptions } from '../data/mockData.ts';
import { v4 as uuidv4 } from 'uuid';

const RESEND_COOLDOWN_SECONDS = 30;

const emptyAddress: Address = {
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Sri Lanka'
};

const StudentProfileModal: React.FC = () => {
    const { currentUser, handleResendVerificationEmail, linkPhoneNumber, verifyPhoneNumberLink, updateUserAuthEmail, handlePasswordReset } = useAuth();
    const { handleUpdateUser } = useData();
    const { modalState, setModalState, addToast } = useUI();
    
    const [formData, setFormData] = useState<Partial<User>>({});
    const [step, setStep] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    
    const [phoneOtpStep, setPhoneOtpStep] = useState<'enter_number' | 'enter_otp'>('enter_number');
    const [phoneOtp, setPhoneOtp] = useState('');
    const [phoneResendCooldown, setPhoneResendCooldown] = useState(0);
    const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
    const [error, setError] = useState('');
    const [customTargetAudience, setCustomTargetAudience] = useState('');
    const [newExam, setNewExam] = useState({ name: '', date: '', targetAudience: targetAudienceOptions[0].value });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isMandatoryFlow = modalState.name === 'edit_student_profile' && !!modalState.onSaveAndContinue;

    const handleClose = useCallback(() => {
        if (isMandatoryFlow) {
            addToast("For gateway payments, providing your email, mobile, and address is required. Alternatively, you can use the bank transfer option on your dashboard.", "info");
        }
        setModalState({ name: 'none' });
    }, [setModalState, isMandatoryFlow, addToast]);


    // Check if the current user is editing their own profile
    const isOwnProfile = !modalState.name || (modalState.name === 'edit_student_profile' && (!modalState.userToEdit || modalState.userToEdit.id === currentUser?.id));

    // Initial Form Population
    useEffect(() => {
        if (modalState.name === 'edit_student_profile') {
            const userForModal = modalState.userToEdit || currentUser;
            // Only initialize if we haven't yet, or if switching users (admin view)
            if (userForModal && (!formData.id || formData.id !== userForModal.id)) {
                const initialFormData = {
                    ...userForModal,
                    address: userForModal.address || emptyAddress
                };
                
                const isPredefined = targetAudienceOptions.some(opt => opt.value === userForModal.targetAudience);
                if (isPredefined && userForModal.targetAudience !== 'Other') {
                    initialFormData.targetAudience = userForModal.targetAudience;
                    setCustomTargetAudience('');
                } else {
                    initialFormData.targetAudience = 'Other';
                    setCustomTargetAudience(userForModal.targetAudience || '');
                }
        
                setFormData(initialFormData);
                const initialStep = modalState.initialStep || 0;
                setStep(initialStep);
            }
        }
    }, [modalState, currentUser?.id]); // Only depend on ID change, not the whole object

    // Sync Verification Status from Background Updates
    useEffect(() => {
        if (isOwnProfile && currentUser && formData.id === currentUser.id) {
             setFormData(prev => ({
                 ...prev,
                 isEmailVerified: currentUser.isEmailVerified,
                 isMobileVerified: currentUser.isMobileVerified,
                 // We sync these in case they were updated by the verification flow
                 // But we use the values from currentUser which comes from Firestore
                 email: currentUser.email,
                 contactNumber: currentUser.contactNumber
             }));
        }
    }, [currentUser?.isEmailVerified, currentUser?.isMobileVerified, currentUser?.email, currentUser?.contactNumber, isOwnProfile]);


    useEffect(() => {
        let timer: number | undefined;
        if (phoneResendCooldown > 0) {
            timer = window.setTimeout(() => setPhoneResendCooldown(prev => prev - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [phoneResendCooldown]);
    
    // Auto-check email verification
    useEffect(() => {
        if (isOwnProfile && modalState.name === 'edit_student_profile' && formData && !formData.isEmailVerified && formData.email) {
            const interval = setInterval(async () => {
                if (auth.currentUser) {
                    await auth.currentUser.reload();
                    if (auth.currentUser.emailVerified) {
                        const userRef = doc(db, "users", currentUser!.id);
                        // Sync the verified email to the profile as well
                        await updateDoc(userRef, { 
                            isEmailVerified: true,
                            email: auth.currentUser.email
                        });
                        addToast("Email successfully verified!", "success");
                        clearInterval(interval);
                    }
                }
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [modalState.name, formData.email, formData.isEmailVerified, addToast, currentUser, isOwnProfile]);

    const { percentage: progress } = calculateStudentProfileCompletion(formData as User);
    
    const steps = [
        { name: "Personal Information" },
        { name: "Contact & Verification" },
        { name: "Address Details" },
        { name: "Academic & Goals" },
        { name: "CV & Portfolio" },
    ];

    const validateStep = (currentStep: number) => {
        const newErrors: Record<string, string> = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        switch (currentStep) {
            case 0:
                if (!formData.firstName?.trim()) newErrors.firstName = "First name is required to continue.";
                if (!formData.lastName?.trim()) newErrors.lastName = "Last name is required to continue.";
                break;
            case 1:
                if (isMandatoryFlow) {
                    if (!formData.email?.trim()) {
                        newErrors.email = "Email is mandatory for payments.";
                    } else if (!emailRegex.test(formData.email)) {
                        newErrors.email = "Please enter a valid email format.";
                    }
                    if (!formData.contactNumber?.trim()) newErrors.contactNumber = "Contact number is mandatory for payments.";
                } else if (formData.email && !emailRegex.test(formData.email)) {
                    newErrors.email = "Please enter a valid email format.";
                }
                break;
            case 2:
                if (isMandatoryFlow) {
                    if (!formData.address?.line1?.trim()) newErrors.line1 = "Address Line 1 is mandatory for payments.";
                    if (!formData.address?.city?.trim()) newErrors.city = "City is mandatory for payments.";
                }
                break;
            default:
                break;
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleNextStep = () => {
        if (!validateStep(step)) {
            if (isMandatoryFlow) {
                addToast("Please fill in the required fields to continue.", "error");
            }
            return;
        }
        if (step < steps.length - 1) {
            setErrors({});
            setStep(prev => prev + 1);
        }
    };

    const validateAllMandatorySteps = () => {
        const newErrors: Record<string, string> = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        let firstErrorStep = -1;
    
        // Step 0
        if (!formData.firstName?.trim()) {
            newErrors.firstName = "First name is required.";
            if (firstErrorStep === -1) firstErrorStep = 0;
        }
        if (!formData.lastName?.trim()) {
            newErrors.lastName = "Last name is required.";
            if (firstErrorStep === -1) firstErrorStep = 0;
        }
    
        // Step 1
        if (!formData.email?.trim()) {
            newErrors.email = "Email is mandatory for payments.";
            if (firstErrorStep === -1) firstErrorStep = 1;
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = "Please enter a valid email format.";
            if (firstErrorStep === -1) firstErrorStep = 1;
        }
        if (!formData.contactNumber?.trim()) {
            newErrors.contactNumber = "Contact number is mandatory for payments.";
            if (firstErrorStep === -1) firstErrorStep = 1;
        }
        
        // Step 2
        if (!formData.address?.line1?.trim()) {
            newErrors.line1 = "Address Line 1 is mandatory for payments.";
            if (firstErrorStep === -1) firstErrorStep = 2;
        }
        if (!formData.address?.city?.trim()) {
            newErrors.city = "City is mandatory for payments.";
            if (firstErrorStep === -1) firstErrorStep = 2;
        }
    
        setErrors(newErrors);
        
        if (firstErrorStep !== -1) {
            setStep(firstErrorStep);
            addToast("Please complete all mandatory fields before finishing.", "error");
            return false;
        }
        
        return true;
    };
    
    const handleFinish = async () => {
        if (isMandatoryFlow) {
            if (!validateAllMandatorySteps()) {
                return;
            }
        } else {
             if(!validateStep(step)) {
                addToast("Please fill all mandatory fields to continue.", "error");
                return;
            }
        }

        setIsSaving(true);
        try {
            const userToUpdateId = (modalState.name === 'edit_student_profile' && modalState.userToEdit?.id) || currentUser?.id;
            
            // Capture the latest state of formData to pass to the callback
            const finalData = { ...formData };
            if (finalData.targetAudience === 'Other') {
                finalData.targetAudience = customTargetAudience;
            }

            if (userToUpdateId) {
                await handleUpdateUser({ id: userToUpdateId, ...finalData });
            }
            addToast("Profile updated successfully!", "success");
            
            const continueAction = (modalState.name === 'edit_student_profile' && modalState.onSaveAndContinue) ? modalState.onSaveAndContinue : null;
        
            setModalState({ name: 'none' });

            if (continueAction) {
                // Pass the fresh data so the callback doesn't have to wait for context updates
                continueAction(finalData);
            }

        } catch (e) {
            addToast("Failed to save profile. Please try again.", "error");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
        if (name === 'targetAudience' && value !== 'Other') {
            setCustomTargetAudience('');
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // ... (rest of the component logic remains unchanged)
    // Redacted for brevity since no other logic changes are needed in the rest of the file
    // Only the handleFinish function and the types import needed updates.
    
    const handleNewExamChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewExam(prev => ({ ...prev, [name]: value }));
    };

    const handleAddExam = () => {
        if (!newExam.name || !newExam.date) {
            addToast("Please provide both an exam name and a date.", "error");
            return;
        }
        const examToAdd: CustomExam = { ...newExam, id: uuidv4() };
        setFormData(prev => ({
            ...prev,
            customExams: [...(prev.customExams || []), examToAdd]
        }));
        setNewExam({ name: '', date: '', targetAudience: targetAudienceOptions[0].value });
    };

    const handleRemoveExam = (id: string) => {
        setFormData(prev => ({
            ...prev,
            customExams: (prev.customExams || []).filter(exam => exam.id !== id)
        }));
    };
    
    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
        setFormData(prev => ({ ...prev, address: { ...(prev.address as Address), [name]: value }}));
    };
    
    const handleTagsChange = (name: keyof User, tags: string[]) => {
        setFormData(prev => ({ ...prev, [name]: tags }));
    };

    const handleSendVerificationEmail = async () => {
        if (!isOwnProfile) return;
        if (!auth.currentUser) {
            setError("Session error. Please try again.");
            return;
        }
        setLoading(prev => ({ ...prev, email: true }));
        setError('');
        try {
            if (formData.email !== currentUser?.email && formData.email) {
                await updateUserAuthEmail(formData.email);
                
                // Immediately save the new email to the database profile to ensure consistency,
                // in case the user closes the modal before clicking 'Finish'.
                if (currentUser) {
                    await handleUpdateUser({ id: currentUser.id, email: formData.email });
                }

                addToast(`Verification link sent to ${formData.email}. Check your inbox to complete the update.`, "info");
            } else {
                await handleResendVerificationEmail(auth.currentUser);
                addToast(`Verification email re-sent to ${formData.email}.`, "info");
            }
        } catch (e: any) {
            if (e.message && e.message.includes("already associated")) {
                 setError("This email is already in use by another account. Please use a different email or contact support.");
            } else if (e.message && (e.message.toLowerCase().includes('firebase:') || e.code?.toLowerCase().includes('auth/'))) {
                setError("An unexpected error occurred while processing your email update. Please try again or contact support if the issue persists.");
            } else {
                setError(e.message || "Failed to send email.");
            }
        } finally {
            setLoading(prev => ({ ...prev, email: false }));
        }
    };

    const handleSetPassword = async () => {
        if (!isOwnProfile) return;
        if (!currentUser?.email) {
            setError("An email address is required to set/reset a password.");
            return;
        }
        setLoading(prev => ({ ...prev, password: true }));
        setError('');
        try {
            await handlePasswordReset(currentUser.email);
            addToast(`A password reset link has been sent to ${currentUser.email}.`, "info");
        } catch (e: any) {
            if (e.message && (e.message.toLowerCase().includes('firebase:') || e.code?.toLowerCase().includes('auth/'))) {
                setError("An unexpected error occurred while sending the password reset link. Please try again or contact support.");
            } else {
                setError(e.message || "Failed to send password reset email.");
            }
        } finally {
            setLoading(prev => ({ ...prev, password: false }));
        }
    };

    const handleSendOtp = async () => {
        if (!isOwnProfile) return;
        if (!formData.contactNumber) {
            setError("Please enter a phone number.");
            return;
        }
        setLoading(prev => ({ ...prev, phone: true }));
        setError('');
        try {
            await linkPhoneNumber(formData.contactNumber);
            setPhoneOtpStep('enter_otp');
            setPhoneResendCooldown(RESEND_COOLDOWN_SECONDS);
        } catch (e: any) {
            if (e.message && (e.message.toLowerCase().includes('firebase:') || e.code?.toLowerCase().includes('auth/'))) {
                setError("An unexpected error occurred while sending the OTP. Please check the number and try again, or contact support if the issue persists.");
            } else {
                setError(e.message || "Failed to send OTP. The phone number might be invalid or already in use by another account.");
            }
        } finally {
            setLoading(prev => ({ ...prev, phone: false }));
        }
    };

    const handleVerifyOtp = async () => {
        if (!isOwnProfile) return;
        if (!phoneOtp || !formData.contactNumber) {
            setError("Please enter the 6-digit OTP code.");
            return;
        }
        setLoading(prev => ({ ...prev, phone: true }));
        setError('');
        try {
            await verifyPhoneNumberLink(phoneOtp, formData.contactNumber);
            setPhoneOtpStep('enter_number');
            setPhoneOtp('');
        } catch (e: any) {
            if (e.message && e.message.toLowerCase().includes("already in use")) {
                 setError("This phone number is already in use by another account. Please use a different number or contact support.");
            } else if (e.message && (e.message.toLowerCase().includes('firebase:') || e.code?.toLowerCase().includes('auth/'))) {
                setError("An unexpected error occurred during phone verification. Please try again or contact support.");
            } else {
                setError(e.message || "Failed to verify OTP. The code may be incorrect or expired.");
            }
        } finally {
            setLoading(prev => ({ ...prev, phone: false }));
        }
    };
    
    type ListName = 'education' | 'experience' | 'projects' | 'references';
    type ListItem = EducationEntry | ExperienceEntry | ProjectEntry | ReferenceEntry;

    const handleDynamicListChange = (listName: ListName, id: string, field: string, value: string) => {
        setFormData(prev => {
            const list = (prev[listName] as any[]) || [];
            const updatedList = list.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            );
            return { ...prev, [listName]: updatedList };
        });
    };

    const handleAddItem = (listName: ListName) => {
        let newItem: ListItem;
        switch(listName) {
            case 'education': newItem = { id: uuidv4(), qualification: '', institution: '', period: '' }; break;
            case 'experience': newItem = { id: uuidv4(), role: '', organization: '', period: '', description: '' }; break;
            case 'projects': newItem = { id: uuidv4(), name: '', description: '' }; break;
            case 'references': newItem = { id: uuidv4(), name: '', title: '', organization: '', email: '', phone: '' }; break;
            default: return;
        }
        setFormData(prev => ({
            ...prev,
            [listName]: [...(prev[listName] as any[] || []), newItem]
        }));
    };
    
    const handleRemoveItem = (listName: ListName, id: string) => {
        setFormData(prev => ({
            ...prev,
            [listName]: (prev[listName] as any[] || []).filter(item => item.id !== id)
        }));
    };
    
    const renderStepContent = () => {
        switch(step) {
            case 0: return (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput label="First Name" name="firstName" value={formData.firstName || ''} onChange={handleChange} required error={errors.firstName} />
                        <FormInput label="Last Name" name="lastName" value={formData.lastName || ''} onChange={handleChange} required error={errors.lastName} />
                    </div>
                     <FormSelect 
                        label="Gender" 
                        name="gender" 
                        value={formData.gender || ''} 
                        onChange={handleChange}
                        options={[
                            { value: 'Male', label: 'Male' },
                            { value: 'Female', label: 'Female' },
                            { value: 'Other', label: 'Other' },
                            { value: 'Prefer not to say', label: 'Prefer not to say' },
                        ]}
                    />
                    <FormInput label="Date of Birth" name="dateOfBirth" type="date" value={formData.dateOfBirth || ''} onChange={handleChange} />
                    <FormSelect 
                        label="Preferred Language"
                        name="preferredLanguage"
                        value={formData.preferredLanguage || ''}
                        onChange={handleChange}
                        options={[
                            { value: 'Sinhala', label: 'Sinhala' },
                            { value: 'English', label: 'English' },
                            { value: 'Tamil', label: 'Tamil' },
                        ]}
                    />
                    <FormSelect 
                        label="Which category best describes you?"
                        name="targetAudience"
                        value={formData.targetAudience || ''}
                        onChange={handleChange}
                        options={targetAudienceOptions}
                        required
                    />
                    {formData.targetAudience === 'Other' && (
                         <FormInput
                            label="Please specify"
                            name="customTargetAudience"
                            value={customTargetAudience}
                            onChange={(e) => setCustomTargetAudience(e.target.value)}
                            required
                            placeholder="e.g., International school grade 8"
                        />
                    )}
                </div>
            );
            case 1: return (
                 <div className="space-y-4">
                    {error && <p className="text-sm text-center text-red-500">{error}</p>}
                    <div className="p-3 bg-light-background dark:bg-dark-background rounded-md border border-light-border dark:border-dark-border">
                        <FormInput label={`Email Address ${isMandatoryFlow ? '(Mandatory for payments)' : ''}`} name="email" type="email" value={formData.email || ''} onChange={handleChange} placeholder="Add your email" error={errors.email} />
                        {isOwnProfile && (
                            <div className="mt-2 flex items-center space-x-4">
                                {formData.isEmailVerified ? (
                                    <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center"><CheckCircleIcon className="w-4 h-4 mr-1"/>Verified</p>
                                ) : formData.email ? (
                                    <button type="button" onClick={handleSendVerificationEmail} disabled={loading.email} className="text-sm font-medium text-primary hover:text-primary-dark disabled:opacity-50">
                                        {loading.email ? 'Sending...' : 'Send Verification Link'}
                                    </button>
                                ) : null}
                                {formData.isEmailVerified && (
                                    <button type="button" onClick={handleSetPassword} disabled={loading.password} className="text-sm font-medium text-primary hover:text-primary-dark disabled:opacity-50">
                                        {loading.password ? 'Sending...' : 'Set / Reset Password'}
                                    </button>
                                )}
                            </div>
                        )}
                        {!isOwnProfile && (
                             <p className="mt-2 text-xs text-light-subtle dark:text-dark-subtle italic">Verification options are disabled when editing another user's profile.</p>
                        )}
                    </div>
                    <div className="p-3 bg-light-background dark:bg-dark-background rounded-md border border-light-border dark:border-dark-border">
                        {phoneOtpStep === 'enter_number' ? (
                            <FormInput label={`Contact Number ${isMandatoryFlow ? '(Mandatory for payments)' : ''}`} name="contactNumber" type="tel" value={formData.contactNumber || ''} onChange={handleChange} placeholder="+94771234567" error={errors.contactNumber} />
                        ) : (
                            <FormInput label="Enter OTP" name="otp" type="text" value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)} placeholder="6-digit code" required />
                        )}
                        {isOwnProfile && (
                            formData.isMobileVerified ? (
                                <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400 flex items-center"><CheckCircleIcon className="w-4 h-4 mr-1"/>Verified</p>
                            ) : formData.contactNumber ? (
                                phoneOtpStep === 'enter_number' ? (
                                    <button type="button" onClick={handleSendOtp} disabled={loading.phone} className="mt-2 text-sm font-medium text-primary hover:text-primary-dark disabled:opacity-50">{loading.phone ? 'Sending...' : 'Verify Number'}</button>
                                ) : (
                                    <div className="flex items-center justify-between mt-2">
                                        <button type="button" onClick={handleVerifyOtp} disabled={loading.phone} className="text-sm font-medium text-primary hover:text-primary-dark disabled:opacity-50">{loading.phone ? 'Verifying...' : 'Submit Code'}</button>
                                        <button type="button" onClick={handleSendOtp} disabled={phoneResendCooldown > 0 || loading.phone} className="text-sm font-medium text-primary hover:text-primary-dark disabled:opacity-50">Resend {phoneResendCooldown > 0 ? `(${phoneResendCooldown}s)` : ''}</button>
                                    </div>
                                )
                            ) : null
                        )}
                    </div>
                </div>
            );
            case 2: return (
                <div className="space-y-4">
                    <FormInput label={`Address Line 1 ${isMandatoryFlow ? '(Mandatory for payments)' : ''}`} name="line1" value={formData.address?.line1 || ''} onChange={handleAddressChange} error={errors.line1} />
                    <FormInput label="Address Line 2 (Optional)" name="line2" value={formData.address?.line2 || ''} onChange={handleAddressChange} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput label={`City ${isMandatoryFlow ? '(Mandatory for payments)' : ''}`} name="city" value={formData.address?.city || ''} onChange={handleAddressChange} error={errors.city} />
                        <FormInput label="State / Province" name="state" value={formData.address?.state || ''} onChange={handleAddressChange} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput label="Postal Code" name="postalCode" value={formData.address?.postalCode || ''} onChange={handleAddressChange} />
                        <FormInput label="Country" name="country" value={formData.address?.country || 'Sri Lanka'} onChange={handleChange} required disabled />
                    </div>
                </div>
            );
            case 3: return (
                <div className="space-y-6">
                    <TagInput label="Current & Previous Schools" tags={formData.schools || []} onTagsChange={(tags) => handleTagsChange('schools', tags)} />
                    <TagInput label="Learning Institutes (Online or Physical)" tags={formData.learningInstitutes || []} onTagsChange={(tags) => handleTagsChange('learningInstitutes', tags)} />
                    <TagInput label="Awards & Achievements" tags={formData.achievements || []} onTagsChange={(tags) => handleTagsChange('achievements', tags)} />
                     <MarkdownEditor
                        label="Career Aspirations"
                        id="careerAspirations"
                        name="careerAspirations"
                        value={formData.careerAspirations || ''}
                        onChange={handleChange}
                        rows={3}
                        placeholder="e.g., Software Engineer, Doctor, Entrepreneur..."
                    />

                    <div className="pt-4 border-t border-light-border dark:border-dark-border">
                        <h4 className="font-semibold text-light-text dark:text-dark-text mb-2">My Personal Exams</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {(formData.customExams || []).map(exam => (
                                <div key={exam.id} className="flex justify-between items-center p-2 bg-light-surface dark:bg-dark-surface rounded-md">
                                    <div>
                                        <p className="font-medium text-sm">{exam.name}</p>
                                        <p className="text-xs text-light-subtle dark:text-dark-subtle">{new Date(exam.date).toLocaleDateString()}</p>
                                    </div>
                                    <button type="button" onClick={() => handleRemoveExam(exam.id)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            ))}
                            {(formData.customExams || []).length === 0 && <p className="text-center text-xs text-light-subtle dark:text-dark-subtle py-4">No personal exams added yet.</p>}
                        </div>
                        <div className="mt-4 space-y-3 p-3 border-t border-light-border dark:border-dark-border">
                            <h5 className="text-sm font-semibold text-light-text dark:text-dark-text">Add New Exam</h5>
                            <FormInput label="Exam Name" name="name" value={newExam.name} onChange={handleNewExamChange} placeholder="e.g., Mid-term Test" />
                            <FormInput label="Date" name="date" type="date" value={newExam.date} onChange={handleNewExamChange} />
                            <FormSelect label="Audience" name="targetAudience" value={newExam.targetAudience} onChange={handleNewExamChange} options={targetAudienceOptions} />
                            <button type="button" onClick={handleAddExam} className="w-full flex items-center justify-center gap-2 text-sm font-medium text-primary border border-primary rounded-md py-2 hover:bg-primary/10">
                                <PlusIcon className="w-4 h-4"/> Add Exam
                            </button>
                        </div>
                    </div>
                </div>
            );
            case 4: return (
                <div className="space-y-6">
                    <MarkdownEditor label="Profile Summary" id="profileSummary" name="profileSummary" value={formData.profileSummary || ''} onChange={handleChange} rows={4} placeholder="A brief summary about your academic interests and goals for your CV." />
                    <TagInput label="Technical Skills" tags={formData.technicalSkills || []} onTagsChange={(tags) => handleTagsChange('technicalSkills', tags)} />
                    <TagInput label="Soft Skills" tags={formData.softSkills || []} onTagsChange={(tags) => handleTagsChange('softSkills', tags)} />
                    <TagInput label="Languages" tags={formData.languages || []} onTagsChange={(tags) => handleTagsChange('languages', tags)} />
                    <TagInput label="Certifications & Trainings" tags={formData.certifications || []} onTagsChange={(tags) => handleTagsChange('certifications', tags)} />
                    
                    {/* Work Experience */}
                    <div className="pt-4 border-t border-light-border dark:border-dark-border">
                        <h4 className="font-semibold mb-2 text-light-text dark:text-dark-text">Work Experience</h4>
                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                            {(formData.experience || []).map(exp => (
                                <div key={exp.id} className="p-3 bg-light-surface dark:bg-dark-surface rounded-md border border-light-border dark:border-dark-border relative space-y-2">
                                    <FormInput label="Role" name="role" value={exp.role} onChange={e => handleDynamicListChange('experience', exp.id, 'role', e.target.value)} />
                                    <FormInput label="Organization" name="organization" value={exp.organization} onChange={e => handleDynamicListChange('experience', exp.id, 'organization', e.target.value)} />
                                    <FormInput label="Period" name="period" value={exp.period} onChange={e => handleDynamicListChange('experience', exp.id, 'period', e.target.value)} placeholder="e.g., 2023 - Present"/>
                                    <MarkdownEditor label="Description" id={`exp-desc-${exp.id}`} name="description" value={exp.description} onChange={e => handleDynamicListChange('experience', exp.id, 'description', e.target.value)} rows={3} />
                                    <button type="button" onClick={() => handleRemoveItem('experience', exp.id)} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={() => handleAddItem('experience')} className="mt-2 w-full flex items-center justify-center gap-2 text-sm font-medium text-primary border-2 border-dashed border-primary/50 rounded-md py-2 hover:bg-primary/10">
                            <PlusIcon className="w-4 h-4"/> Add Experience
                        </button>
                    </div>

                    {/* Education */}
                    <div className="pt-4 border-t border-light-border dark:border-dark-border">
                        <h4 className="font-semibold mb-2 text-light-text dark:text-dark-text">Education History</h4>
                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                            {(formData.education || []).map(edu => (
                                <div key={edu.id} className="p-3 bg-light-surface dark:bg-dark-surface rounded-md border border-light-border dark:border-dark-border relative space-y-2">
                                    <FormInput label="Qualification" name="qualification" value={edu.qualification} onChange={e => handleDynamicListChange('education', edu.id, 'qualification', e.target.value)} />
                                    <FormInput label="Institution" name="institution" value={edu.institution} onChange={e => handleDynamicListChange('education', edu.id, 'institution', e.target.value)} />
                                    <FormInput label="Period" name="period" value={edu.period} onChange={e => handleDynamicListChange('education', edu.id, 'period', e.target.value)} placeholder="e.g., 2020 - 2024" />
                                    <button type="button" onClick={() => handleRemoveItem('education', edu.id)} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            ))}
                        </div>
                         <button type="button" onClick={() => handleAddItem('education')} className="mt-2 w-full flex items-center justify-center gap-2 text-sm font-medium text-primary border-2 border-dashed border-primary/50 rounded-md py-2 hover:bg-primary/10">
                            <PlusIcon className="w-4 h-4"/> Add Education
                        </button>
                    </div>

                    {/* Projects */}
                     <div className="pt-4 border-t border-light-border dark:border-dark-border">
                        <h4 className="font-semibold mb-2 text-light-text dark:text-dark-text">Projects</h4>
                         <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                            {(formData.projects || []).map(proj => (
                                <div key={proj.id} className="p-3 bg-light-surface dark:bg-dark-surface rounded-md border border-light-border dark:border-dark-border relative space-y-2">
                                    <FormInput label="Project Name" name="name" value={proj.name} onChange={e => handleDynamicListChange('projects', proj.id, 'name', e.target.value)} />
                                    <MarkdownEditor label="Description" id={`proj-desc-${proj.id}`} name="description" value={proj.description} onChange={e => handleDynamicListChange('projects', proj.id, 'description', e.target.value)} rows={3} />
                                    <button type="button" onClick={() => handleRemoveItem('projects', proj.id)} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            ))}
                        </div>
                         <button type="button" onClick={() => handleAddItem('projects')} className="mt-2 w-full flex items-center justify-center gap-2 text-sm font-medium text-primary border-2 border-dashed border-primary/50 rounded-md py-2 hover:bg-primary/10">
                            <PlusIcon className="w-4 h-4"/> Add Project
                        </button>
                    </div>
                    
                    {/* References */}
                    <div className="pt-4 border-t border-light-border dark:border-dark-border">
                        <h4 className="font-semibold mb-2 text-light-text dark:text-dark-text">References</h4>
                         <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                            {(formData.references || []).map(ref => (
                                <div key={ref.id} className="p-3 bg-light-surface dark:bg-dark-surface rounded-md border border-light-border dark:border-dark-border relative space-y-2">
                                    <FormInput label="Full Name" name="name" value={ref.name} onChange={e => handleDynamicListChange('references', ref.id, 'name', e.target.value)} />
                                    <FormInput label="Title / Position" name="title" value={ref.title} onChange={e => handleDynamicListChange('references', ref.id, 'title', e.target.value)} />
                                    <FormInput label="Organization" name="organization" value={ref.organization} onChange={e => handleDynamicListChange('references', ref.id, 'organization', e.target.value)} />
                                    <FormInput label="Email" name="email" value={ref.email} onChange={e => handleDynamicListChange('references', ref.id, 'email', e.target.value)} />
                                    <FormInput label="Phone" name="phone" value={ref.phone} onChange={e => handleDynamicListChange('references', ref.id, 'phone', e.target.value)} />
                                    <button type="button" onClick={() => handleRemoveItem('references', ref.id)} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            ))}
                        </div>
                         <button type="button" onClick={() => handleAddItem('references')} className="mt-2 w-full flex items-center justify-center gap-2 text-sm font-medium text-primary border-2 border-dashed border-primary/50 rounded-md py-2 hover:bg-primary/10">
                            <PlusIcon className="w-4 h-4"/> Add Reference
                        </button>
                    </div>
                </div>
            );
            default: return null;
        }
    };

    return (
        <Modal isOpen={modalState.name === 'edit_student_profile'} onClose={handleClose} title="Complete Your Profile" size="3xl">
            <div className="space-y-4">
                {isMandatoryFlow && (
                    <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 rounded-r-md text-yellow-800 dark:text-yellow-200">
                        <p className="text-sm font-medium">
                            <b>Action Required:</b> To proceed with your payment, please complete the required fields in your profile (name, contact, address). This information is necessary for our payment gateway to process the transaction securely.
                        </p>
                    </div>
                )}
                <div className="flex items-center gap-4">
                    <ProgressBar value={progress} max={100} />
                    <span className="font-bold text-lg text-light-text dark:text-dark-text">{progress}%</span>
                </div>
                <div className="relative p-4 bg-light-background dark:bg-dark-background rounded-lg border border-light-border dark:border-dark-border min-h-[300px]">
                    <h3 className="text-lg font-bold mb-4 text-light-text dark:text-dark-text">{steps[step].name}</h3>
                    {renderStepContent()}
                </div>
                <div className="flex justify-between items-center pt-4">
                    <button onClick={() => setStep(prev => prev - 1)} disabled={step === 0 || isSaving} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium border border-primary text-primary rounded-md hover:bg-primary/10 transition-colors disabled:opacity-50">
                        <ChevronLeftIcon className="w-4 h-4" />
                        <span>Previous</span>
                    </button>
                    <button onClick={step < steps.length - 1 ? handleNextStep : handleFinish} disabled={isSaving} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50">
                        <span>{isSaving ? 'Saving...' : (step === steps.length - 1 ? 'Finish' : 'Continue')}</span>
                        {step < steps.length - 1 ? <ChevronRightIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4"/>}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default StudentProfileModal;
