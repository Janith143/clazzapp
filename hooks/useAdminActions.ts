

import { useCallback, useMemo } from 'react';
// FIX: Import PaymentGatewaySettings
import { Teacher, Withdrawal, TopUpRequest, Sale, StaticPageKey, HomeSlide, SocialMediaLink, User, TuitionInstitute, PayoutDetails, Notification, UpcomingExam, PhotoPrintOption, PaymentGatewaySettings, KnownInstitute, Voucher, FinancialSettings, SupportSettings, AdditionalService } from '../types';
import { UIContextType } from '../contexts/UIContext';
import { NavigationContextType } from '../contexts/NavigationContext';
import { db } from '../firebase';
// FIX: Update Firebase imports for v9 modular SDK
import { doc, updateDoc, writeBatch, arrayRemove, arrayUnion, increment, setDoc, getDoc, runTransaction, collection, addDoc, deleteDoc } from 'firebase/firestore';
import { sendPaymentConfirmation, sendNotification } from '../utils';

const ADMIN_EMAIL = 'admin@clazz.lk';

interface AdminActionDeps {
    ui: UIContextType;
    nav: NavigationContextType;
    users: User[];
    teachers: Teacher[];
    tuitionInstitutes: TuitionInstitute[];
    sales: Sale[];
    topUpRequests: TopUpRequest[];
    knownInstitutes: KnownInstitute[];
}

export const useAdminActions = (deps: any) => {
    const { ui, nav, users, teachers, tuitionInstitutes, knownInstitutes, sales, topUpRequests, handleImageSave } = deps;
    const { addToast } = ui;
    const { functionUrls } = nav;
    const currencyFormatter = useMemo(() => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }), []);


    const handleUpdateTeacher = useCallback(async (teacherId: string, updates: Partial<Teacher>) => {
        try {
            const teacherRef = doc(db, "teachers", teacherId);

            // Add username uniqueness check
            if (updates.username) {
                const currentTeacher = teachers.find((t: Teacher) => t.id === teacherId);
                // Make sure username is actually changing
                if (currentTeacher && currentTeacher.username !== updates.username) {
                    const isUsernameTaken = teachers.some((t: Teacher) => t.id !== teacherId && t.username === updates.username);
                    if (isUsernameTaken) {
                        // Throwing an error will be caught and toasted
                        throw new Error(`Username "${updates.username}" is already taken.`);
                    }
                }
            }

            // --- Logic to save new locations to 'knownInstitutes' ---
            if (updates.teachingLocations && updates.teachingLocations.length > 0) {
                const batch = writeBatch(db);
                let newInstitutesAdded = false;

                // We iterate through the locations being saved
                for (const loc of updates.teachingLocations) {
                    // Check if this location already exists in our global list
                    // We check name + district + town. Case-insensitive check for robustness.
                    const exists = knownInstitutes.some(ki =>
                        ki.name.toLowerCase() === loc.instituteName.toLowerCase() &&
                        ki.district === loc.district &&
                        ki.town === loc.town
                    );

                    if (!exists) {
                        const newKnownInstituteRef = doc(collection(db, 'knownInstitutes'));
                        const newKnownInstitute: KnownInstitute = {
                            id: newKnownInstituteRef.id,
                            name: loc.instituteName,
                            district: loc.district,
                            town: loc.town,
                            type: loc.instituteType,
                            addedBy: teacherId
                        };
                        batch.set(newKnownInstituteRef, newKnownInstitute);
                        newInstitutesAdded = true;
                    }
                }

                if (newInstitutesAdded) {
                    await batch.commit();
                    // We don't need to notify; the DataContext listener will pick up the new knownInstitutes automatically
                }
            }
            // -----------------------------------------------------

            if (updates.registrationStatus === 'approved') {
                const teacherDoc = await getDoc(teacherRef);
                if (teacherDoc.exists()) {
                    const teacherData = teacherDoc.data() as Teacher;
                    if (teacherData.registrationStatus !== 'approved') {
                        const subject = "Your Clazz.lk Teacher Account is Approved!";
                        const htmlBody = `
                            <div style="font-family: Arial, sans-serif; color: #333;">
                                <h2>Congratulations, ${teacherData.name}!</h2>
                                <p>Your teacher account on clazz.lk has been reviewed and approved. You can now log in to your dashboard to create courses, schedule classes, and start teaching.</p>
                                <p>Welcome to our community of educators!</p>
                                <p>The Clazz.lk Team</p>
                            </div>
                        `;
                        await sendNotification(functionUrls.notification, { email: teacherData.email }, subject, htmlBody);
                    }
                }
            }

            await updateDoc(teacherRef, updates);
        } catch (e) {
            console.error("Error updating teacher:", e);
            addToast((e as Error).message || "Error updating teacher.", "error");
            throw e;
        }
    }, [addToast, teachers, knownInstitutes]);



    const handleUpdateWithdrawal = useCallback(async (userId: string, withdrawalId: string, status: 'completed' | 'failed', notes?: string) => {
        try {
            const user = users.find(u => u.id === userId);
            if (!user) throw new Error("User not found");

            const isTeacher = user.role === 'teacher';
            const collectionName = isTeacher ? 'teachers' : 'users';
            const profileRef = doc(db, collectionName, userId);

            let withdrawalAmount = 0;

            await runTransaction(db, async (transaction) => {
                const profileDoc = await transaction.get(profileRef);
                if (!profileDoc.exists()) throw new Error("Profile not found");

                const profileData = profileDoc.data() as Teacher | User;
                const withdrawalHistory = [...(profileData.withdrawalHistory || [])];
                const withdrawalIndex = withdrawalHistory.findIndex(w => w.id === withdrawalId);
                if (withdrawalIndex === -1) throw new Error("Withdrawal record not found.");

                const withdrawal = { ...withdrawalHistory[withdrawalIndex] };

                if (withdrawal.status !== 'pending') {
                    throw new Error('This request has already been processed.');
                }

                withdrawal.status = status;
                withdrawal.processedAt = new Date().toISOString();
                if (notes) withdrawal.notes = notes;
                withdrawalAmount = withdrawal.amount;

                withdrawalHistory[withdrawalIndex] = withdrawal;

                let updates: any = { withdrawalHistory };

                if (isTeacher) {
                    const teacherProfile = profileData as Teacher;
                    let earnings = { ...teacherProfile.earnings };
                    if (status === 'completed') {
                        earnings.withdrawn = (earnings.withdrawn || 0) + withdrawal.amount;
                    } else if (status === 'failed') {
                        earnings.available = (earnings.available || 0) + withdrawal.amount;
                    }
                    updates.earnings = earnings;
                } else {
                    const userProfile = profileData as User;
                    if (status === 'failed') {
                        // Assuming non-teacher withdrawals refund to account balance if failed
                        updates.accountBalance = (userProfile.accountBalance || 0) + withdrawal.amount;
                    }
                }

                transaction.update(profileRef, updates);
            });

            ui.addToast(`Withdrawal status updated to ${status}.`, 'success');

            if (status === 'completed' && user) {
                const subject = "Your Withdrawal Request has been Processed";
                const htmlBody = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <p>Dear ${user.firstName},</p>
                        <p>Your withdrawal request for <strong>${currencyFormatter.format(withdrawalAmount)}</strong> has been processed.</p>
                        <p>The funds should be reflected in your bank account shortly. Please check your account.</p>
                        <p>Thank you for being a part of Clazz.lk!</p>
                        <p>The Clazz.lk Team</p>
                    </div>
                `;
                await sendNotification(functionUrls.notification, { email: user.email }, subject, htmlBody);
            }

        } catch (e) {
            console.error(e);
            ui.addToast((e as Error).message || "Failed to update withdrawal.", "error");
        }
    }, [users, ui, currencyFormatter]);

    const handleRemoveDefaultCoverImage = useCallback(async (imageUrl: string) => {
        try {
            const settingsRef = doc(db, "settings", "appConfig");
            await updateDoc(settingsRef, { defaultCoverImages: arrayRemove(imageUrl) });
            addToast("Default cover image removed.", "success");
        } catch (e) {
            console.error(e);
            addToast("Failed to remove image.", "error");
        }
    }, [addToast]);

    const handleRemoveCoverImageFromArray = useCallback(async (teacherId: string, imageUrl: string) => {
        const teacherRef = doc(db, "teachers", teacherId);
        try {
            await updateDoc(teacherRef, {
                coverImages: arrayRemove(imageUrl)
            });
            addToast('Cover image removed.', 'success');
        } catch (error: any) {
            console.error('Error removing cover image:', error);
            addToast('Failed to remove cover image.', 'error');
        }
    }, [addToast]);

    const handleTopUpDecision = useCallback(async (requestId: string, decision: 'approved' | 'rejected', reason?: string, newAmount?: number) => {
        const request = topUpRequests.find(r => r.id === requestId);
        if (!request) return;

        const batch = writeBatch(db);
        const requestRef = doc(db, "topUpRequests", requestId);

        const finalAmount = (typeof newAmount === 'number' && newAmount >= 0) ? newAmount : request.amount;

        const updateData: Partial<TopUpRequest> = {
            status: decision,
            processedAt: new Date().toISOString(),
        };

        if (reason) updateData.rejectionReason = reason;

        if (decision === 'approved' && typeof newAmount === 'number' && newAmount !== request.amount) {
            updateData.originalAmount = request.amount;
            updateData.amount = finalAmount;
        }

        batch.update(requestRef, updateData);

        if (decision === 'approved') {
            const userRef = doc(db, "users", request.studentId);
            const approvedRequest: TopUpRequest = {
                ...request,
                status: 'approved',
                processedAt: new Date().toISOString(),
                amount: finalAmount, // Ensure history reflects the final credited amount
                ...(typeof newAmount === 'number' && newAmount !== request.amount && { originalAmount: request.amount })
            };
            batch.update(userRef, {
                accountBalance: increment(finalAmount),
                topUpHistory: arrayUnion(approvedRequest)
            });
            const student = users.find(u => u.id === request.studentId);
            if (student) {
                sendPaymentConfirmation(functionUrls.notification, student, finalAmount, 'Bank Deposit Top-Up', request.id);
            }
        }
        await batch.commit();
        addToast(`Top-up request ${decision}.`, "success");
    }, [topUpRequests, users, addToast]);

    const handleUpdateSaleStatus = useCallback(async (saleId: string, status: Sale['status']) => {
        try {
            await updateDoc(doc(db, "sales", saleId), { status });
            addToast(`Sale status updated to ${status}.`, 'success');
        } catch (e) {
            console.error(e);
            addToast('Failed to update sale status.', 'error');
        }
    }, [addToast]);

    // FIX: Implement handleUpdatePhotoOrderStatus to satisfy DataContextType
    const handleUpdatePhotoOrderStatus = useCallback(async (saleId: string, status: Sale['photoOrderStatus']) => {
        try {
            await updateDoc(doc(db, "sales", saleId), { photoOrderStatus: status });
            addToast(`Photo order status updated to ${status}.`, 'success');
        } catch (e) {
            console.error(e);
            addToast('Failed to update photo order status.', 'error');
        }
    }, [addToast]);

    // FIX: Implement handleUpdatePhysicalOrderStatus
    const handleUpdatePhysicalOrderStatus = useCallback(async (saleId: string, status: Sale['physicalOrderStatus']) => {
        try {
            await updateDoc(doc(db, "sales", saleId), { physicalOrderStatus: status });
            addToast(`Order status updated to ${status}.`, 'success');
        } catch (e) {
            console.error(e);
            addToast('Failed to update order status.', 'error');
        }
    }, [addToast]);

    const handleSaveBankDetails = useCallback(async (teacherId: string, details: PayoutDetails) => {
        await handleUpdateTeacher(teacherId, { payoutDetails: details });
    }, [handleUpdateTeacher]);

    const handleVerificationUpload = useCallback(async (teacherId: string, type: 'id_front' | 'id_back' | 'bank', base64: string, requestNote: string) => {
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) {
            addToast("Teacher not found.", "error");
            return;
        }
        try {
            const imageTypeMap: Record<typeof type, 'id_verification_front' | 'id_verification_back' | 'bank_verification'> = {
                'id_front': 'id_verification_front',
                'id_back': 'id_verification_back',
                'bank': 'bank_verification'
            };
            const imageUrl = await handleImageSave(base64, imageTypeMap[type], { teacherId });
            if (imageUrl) {
                const verificationUpdate: any = {};
                if (type === 'id_front') {
                    verificationUpdate['verification.id.frontImageUrl'] = imageUrl;
                    verificationUpdate['verification.id.status'] = 'pending';
                    verificationUpdate['verification.id.requestNote'] = requestNote;
                    verificationUpdate['verification.id.rejectionReason'] = '';
                } else if (type === 'id_back') {
                    verificationUpdate['verification.id.backImageUrl'] = imageUrl;
                    verificationUpdate['verification.id.status'] = 'pending';
                    verificationUpdate['verification.id.requestNote'] = requestNote;
                    verificationUpdate['verification.id.rejectionReason'] = '';
                } else { // bank
                    verificationUpdate['verification.bank.imageUrl'] = imageUrl;
                    verificationUpdate['verification.bank.status'] = 'pending';
                    verificationUpdate['verification.bank.requestNote'] = requestNote;
                    verificationUpdate['verification.bank.rejectionReason'] = '';
                }

                await handleUpdateTeacher(teacherId, verificationUpdate);
                addToast("Verification document submitted for review.", "success");
            }
        } catch (e) {
            console.error("Verification upload failed:", e);
            addToast("Failed to upload document.", "error");
        }
    }, [teachers, handleImageSave, handleUpdateTeacher, addToast]);

    const handleVerificationDecision = useCallback(async (teacherId: string, type: 'id' | 'bank', decision: 'approve' | 'reject', reason: string) => {
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) return;
        const currentVerification = teacher.verification[type];
        const verificationUpdate = {
            [`verification.${type}`]: { ...currentVerification, status: decision === 'approve' ? 'verified' : 'rejected', rejectionReason: reason || '' }
        };
        await handleUpdateTeacher(teacherId, verificationUpdate);
        addToast(`Verification has been ${decision === 'approve' ? 'approved' : 'rejected'}.`, 'success');

        if (decision === 'approve') {
            const subject = `Your ${type.toUpperCase()} Verification is Approved!`;
            const htmlBody = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <p>Dear ${teacher.name},</p>
                    <p>Your <strong>${type === 'id' ? 'ID' : 'Bank'} verification document</strong> has been reviewed and approved by our team.</p>
                    ${(type === 'bank' && teacher.verification.id.status === 'verified') || (type === 'id' && teacher.verification.bank.status === 'verified') ? '<p>Both your ID and Bank details are now verified. You can now request withdrawals from your earnings dashboard.</p>' : '<p>Please ensure both your ID and Bank documents are verified to enable withdrawals.</p>'}
                    <p>Regards,</p>
                    <p>The Clazz.lk Team</p>
                </div>
            `;
            await sendNotification(functionUrls.notification, { email: teacher.email }, subject, htmlBody);
        }
    }, [teachers, handleUpdateTeacher, addToast]);

    const handleUpdateStaticContent = useCallback(async (key: StaticPageKey, data: { title: string; content: string; }) => {
        await setDoc(doc(db, 'settings', 'appConfig'), { [`staticContent.${key}`]: data }, { merge: true });
    }, []);

    const handleUpdateHomeSlides = useCallback(async (slides: HomeSlide[]) => {
        await setDoc(doc(db, 'settings', 'appConfig'), { homeSlides: slides }, { merge: true });
    }, []);

    const handleUpdateSocialMediaLinks = useCallback(async (links: SocialMediaLink[]) => {
        await setDoc(doc(db, 'settings', 'appConfig'), { socialMediaLinks: links }, { merge: true });
    }, []);

    const handleUpdateSubjects = useCallback(async (subjects: Record<string, { value: string, label: string }[]>) => {
        await setDoc(doc(db, 'settings', 'appConfig'), { subjects }, { merge: true });
    }, []);

    const handleUpdateStudentCardTaglines = useCallback(async (taglines: string[]) => {
        await setDoc(doc(db, 'settings', 'appConfig'), { studentCardTaglines: taglines }, { merge: true });
    }, []);

    const handleUpdateTeacherCardTaglines = useCallback(async (taglines: string[]) => {
        await setDoc(doc(db, 'settings', 'appConfig'), { teacherCardTaglines: taglines }, { merge: true });
    }, []);

    const handleUpdateHomePageLayoutConfig = useCallback(async (config: any) => {
        await setDoc(doc(db, 'settings', 'appConfig'), { homePageLayoutConfig: config }, { merge: true });
    }, []);

    const handleUpdateUpcomingExams = useCallback(async (exams: UpcomingExam[]) => {
        await setDoc(doc(db, 'settings', 'appConfig'), { upcomingExams: exams }, { merge: true });
    }, []);

    const handleUpdatePhotoPrintOptions = useCallback(async (options: PhotoPrintOption[]) => {
        await setDoc(doc(db, 'settings', 'appConfig'), { photoPrintOptions: options }, { merge: true });
    }, []);

    const handleUpdateAdditionalServices = useCallback(async (services: AdditionalService[]) => {
        await setDoc(doc(db, 'settings', 'appConfig'), { additionalServices: services }, { merge: true });
    }, []);

    const handleUpdatePaymentGatewaySettings = useCallback(async (settings: PaymentGatewaySettings) => {
        await updateDoc(doc(db, 'settings', 'clientAppConfig'), { paymentGatewaySettings: settings });
    }, []);

    const handleUpdateTeacherDashboardMessage = useCallback(async (message: string) => {
        await setDoc(doc(db, 'settings', 'appConfig'), { teacherDashboardMessage: message }, { merge: true });
    }, []);

    const handleUpdateFinancialSettings = useCallback(async (settings: FinancialSettings) => {
        await setDoc(doc(db, 'settings', 'appConfig'), { financialSettings: settings }, { merge: true });
    }, []);

    const handleUpdateSupportSettings = useCallback(async (settings: SupportSettings) => {
        await setDoc(doc(db, 'settings', 'appConfig'), { supportSettings: settings }, { merge: true });
    }, []);

    const processMonthlyPayouts = useCallback(async (userType: 'teacher' | 'institute' | 'student', userId: string) => {
        if (!userId) return;

        const now = new Date();
        const isPayoutDay = now.getDate() >= 15;
        const payoutDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const payoutYear = payoutDate.getFullYear();
        const payoutMonth = payoutDate.getMonth();
        const payoutIdentifier = `${payoutYear}-${String(payoutMonth + 1).padStart(2, '0')}`;

        if (!isPayoutDay) {
            console.log(`Payout processing for ${payoutIdentifier} is scheduled for the 15th.`);
            return;
        }

        const collectionName = userType === 'teacher' ? 'teachers' : (userType === 'institute' ? 'tuitionInstitutes' : 'users');
        const docRef = doc(db, collectionName, userId);

        try {
            const userDoc = await getDoc(docRef); // Read before transaction
            if (!userDoc.exists()) {
                console.warn(`${userType} ${userId} not found for payout check.`);
                return;
            }

            const userData = userDoc.data() as Teacher | TuitionInstitute;
            const processedPayouts = userData.earnings?.processedPayouts || [];

            if (processedPayouts.includes(payoutIdentifier)) {
                // This console log can be spammy, so let's quiet it down.
                // console.log(`Payout for ${payoutIdentifier} has already been processed for ${userId}. Skipping.`);
                return; // Exit before transaction and toast
            }

            // If we reach here, a payout check is needed.
            await runTransaction(db, async (transaction) => {
                const freshUserDoc = await transaction.get(docRef);
                if (!freshUserDoc.exists()) throw new Error(`${userType} not found in transaction.`);

                const freshUserData = freshUserDoc.data() as Teacher | TuitionInstitute;
                const freshProcessedPayouts = freshUserData.earnings?.processedPayouts || [];

                if (freshProcessedPayouts.includes(payoutIdentifier)) {
                    return; // Another process might have just completed it.
                }

                const firstDayOfPayoutMonth = new Date(payoutYear, payoutMonth, 1);
                const lastDayOfPayoutMonth = new Date(payoutYear, payoutMonth + 1, 0, 23, 59, 59);

                const relevantSales = deps.sales.filter((sale: Sale) => {
                    const saleDate = new Date(sale.saleDate);
                    const isCorrectSeller = (userType === 'teacher' && sale.teacherId === userId) || (userType === 'institute' && sale.instituteId === userId);
                    return isCorrectSeller && sale.status === 'completed' && saleDate >= firstDayOfPayoutMonth && saleDate <= lastDayOfPayoutMonth;
                });

                const netEarnings = relevantSales.reduce((acc: number, sale: Sale) => {
                    if (userType === 'teacher') return acc + (sale.teacherCommission || 0);
                    if (userType === 'institute') return acc + (sale.instituteCommission || 0);
                    return acc;
                }, 0);

                if (netEarnings <= 0) {
                    transaction.update(docRef, {
                        'earnings.processedPayouts': arrayUnion(payoutIdentifier)
                    });
                    return;
                }

                transaction.update(docRef, {
                    'earnings.available': increment(netEarnings),
                    'earnings.processedPayouts': arrayUnion(payoutIdentifier)
                });
            });

            addToast("Payout balances have been checked and updated.", "info");

        } catch (error) {
            console.error(`Error processing monthly payouts for ${userType} ${userId}:`, error);
        }
    }, [deps.sales, addToast]);

    const handleSendNotification = useCallback(async (teacherId: string, content: string, target: Notification['target']) => {
        // Fallback to hardcoded if not set yet, for backwards compatibility
        const FCM_FUNCTION_URL = functionUrls.fcmNotification || 'https://asia-south1-clazz2-new.cloudfunctions.net/fcmNotifications/send-fcm-push';
        try {
            const response = await fetch(FCM_FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teacherId, content, target }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send notification');
            }
            addToast('Notification sent successfully!', 'success');
        } catch (e) {
            console.error(e);
            addToast('Failed to send notification.', 'error');
        }
    }, [addToast]);

    const handleRequestWithdrawal = useCallback(async (teacherId: string, amount: number) => {
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) { addToast("Teacher not found.", "error"); return; }

        const teacherRef = doc(db, "teachers", teacherId);

        try {
            await runTransaction(db, async (transaction) => {
                const teacherDoc = await transaction.get(teacherRef);
                if (!teacherDoc.exists()) throw new Error("Teacher profile not found.");

                const teacherData = teacherDoc.data() as Teacher;
                const earnings = teacherData.earnings;

                if (earnings.available < amount) {
                    throw new Error("Insufficient available balance for withdrawal.");
                }

                const newWithdrawal: Withdrawal = { id: `w_${Date.now()}`, userId: teacher.userId, amount, requestedAt: new Date().toISOString(), status: 'pending' };

                transaction.update(teacherRef, {
                    'earnings.available': increment(-amount),
                    withdrawalHistory: arrayUnion(newWithdrawal)
                });
            });
            addToast("Withdrawal request submitted successfully.", "success");
        } catch (e) {
            console.error(e);
            addToast((e as Error).message || "Withdrawal request failed.", "error");
        }
    }, [teachers, addToast]);

    const handleCourseApproval = useCallback(async (teacherId: string, courseId: string, decision: 'approved' | 'rejected') => {
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) return;
        const courseIndex = teacher.courses.findIndex(c => c.id === courseId);
        if (courseIndex === -1) return;

        const newCourses = [...teacher.courses];
        newCourses[courseIndex].adminApproval = decision;
        if (decision === 'approved') newCourses[courseIndex].isPublished = true;

        await handleUpdateTeacher(teacherId, { courses: newCourses });
        addToast(`Course has been ${decision}.`, "success");

        if (decision === 'approved') {
            const subject = `Your course "${newCourses[courseIndex].title}" has been approved!`;
            const htmlBody = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <p>Hi ${teacher.name},</p>
                    <p>Your course, "<strong>${newCourses[courseIndex].title}</strong>", has been reviewed and approved by our team.</p>
                    <p>It is now published and visible to students on the platform. You can manage its visibility from your teacher dashboard.</p>
                    <p>The Clazz.lk Team</p>
                </div>
            `;
            await sendNotification(functionUrls.notification, { email: teacher.email }, subject, htmlBody);
        }
    }, [teachers, handleUpdateTeacher, addToast]);

    const handleProductApproval = useCallback(async (teacherId: string, productId: string, decision: 'approved' | 'rejected') => {
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher || !teacher.products) return;
        const productIndex = teacher.products.findIndex(p => p.id === productId);
        if (productIndex === -1) return;

        const newProducts = [...teacher.products];
        newProducts[productIndex].adminApproval = decision;
        if (decision === 'approved') newProducts[productIndex].isPublished = true;

        await handleUpdateTeacher(teacherId, { products: newProducts });
        addToast(`Product has been ${decision}.`, "success");

        if (decision === 'approved') {
            const subject = `Your product "${newProducts[productIndex].title}" has been approved!`;
            const htmlBody = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <p>Hi ${teacher.name},</p>
                    <p>Your product, "<strong>${newProducts[productIndex].title}</strong>", has been reviewed and approved by our team.</p>
                    <p>It is now published and visible to students on the platform store. You can manage its visibility from your teacher dashboard.</p>
                    <p>The Clazz.lk Team</p>
                </div>
            `;
            await sendNotification(functionUrls.notification, { email: teacher.email }, subject, htmlBody);
        }
    }, [teachers, handleUpdateTeacher, addToast]);

    const handleAssignReferralCode = useCallback(async (userId: string, code: string) => {
        // Find referrer by code
        const referrer = users.find(u => u.referralCode?.toUpperCase() === code.toUpperCase());

        if (!referrer) {
            throw new Error(`Referral code "${code}" is invalid.`);
        }

        if (referrer.id === userId) {
            throw new Error("Cannot assign self as referrer.");
        }

        try {
            await updateDoc(doc(db, 'users', userId), { referrerId: referrer.id });
            addToast(`Successfully assigned referrer: ${referrer.firstName} ${referrer.lastName}`, 'success');
        } catch (error: any) {
            console.error(error);
            throw new Error("Failed to update user profile.");
        }
    }, [users, addToast]);

    const handleGenerateVouchers = useCallback(async (studentIds: string[], amount: number, details: { title?: string; rules?: string; expiryDate: string }) => {
        const batch = writeBatch(db);
        const generatedVouchers: Voucher[] = [];

        studentIds.forEach(studentId => {
            const voucherRef = doc(collection(db, "vouchers"));
            const newVoucher: Voucher = {
                id: voucherRef.id,
                code: `GIFT${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                amount: amount,
                isUsed: false,
                isCollected: false,
                generatedByAdmin: true,
                assignedToUserId: studentId,
                title: details.title,
                redemptionRules: details.rules,
                purchasedAt: new Date().toISOString(),
                expiresAt: details.expiryDate,

                // Dummy billing info for admin generation
                billingFirstName: 'Admin',
                billingLastName: 'System',
                billingEmail: ADMIN_EMAIL,
                billingContactNumber: '',
                billingAddressLineOne: 'System Generated',
            };

            batch.set(voucherRef, newVoucher);
            generatedVouchers.push(newVoucher);
        });

        try {
            await batch.commit();
            addToast(`Successfully generated ${generatedVouchers.length} vouchers.`, 'success');

            // Notify students (optional but good UX)
            // Ideally use a batched cloud function, but here's a loop for simplicity or integrate with the notification service later.
        } catch (error: any) {
            console.error(error);
            addToast("Failed to generate vouchers.", "error");
        }
    }, [addToast]);

    const handleDeleteVoucher = useCallback(async (voucherId: string) => {
        try {
            await deleteDoc(doc(db, "vouchers", voucherId));
            addToast("Voucher deleted successfully.", "success");
        } catch (e) {
            console.error(e);
            addToast("Failed to delete voucher.", "error");
        }
    }, [addToast]);

    const handleUpdateVoucher = useCallback(async (voucherId: string, updates: Partial<Voucher>) => {
        try {
            await updateDoc(doc(db, "vouchers", voucherId), updates);
            addToast("Voucher updated successfully.", "success");
        } catch (e) {
            console.error(e);
            addToast("Failed to update voucher.", "error");
        }
    }, [addToast]);

    const handleUpdateDeveloperSettings = useCallback(async (settings: any) => {
        try {
            // Split settings into Client Config and System Config
            const {
                EMAIL_USER, EMAIL_PASS, NOTIFY_LK_USER_ID, NOTIFY_LK_API_KEY, NOTIFY_LK_SENDER_ID, // Backend keys
                GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, // Google Auth Keys (Backend)
                ...clientConfig // Existing client keys (genAiKey, functionUrls, etc.)
            } = settings;

            const batch = writeBatch(db);

            // 1. Update Client App Config (Frontend visible)
            if (Object.keys(clientConfig).length > 0) {
                batch.update(doc(db, 'settings', 'clientAppConfig'), clientConfig);
            }

            // 2. Update System Config (Backend only / Secure)
            const backendConfig = {
                EMAIL_USER, EMAIL_PASS, NOTIFY_LK_USER_ID, NOTIFY_LK_API_KEY, NOTIFY_LK_SENDER_ID,
                GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
            };

            // Filter out undefined values to avoid overwriting with nothing if not provided
            const cleanBackendConfig = Object.fromEntries(
                Object.entries(backendConfig).filter(([_, v]) => v !== undefined)
            );

            if (Object.keys(cleanBackendConfig).length > 0) {
                // Use set with merge: true to create if not exists
                batch.set(doc(db, 'settings', 'system_config'), cleanBackendConfig, { merge: true });
            }

            await batch.commit();
            addToast('Developer settings updated successfully.', 'success');
        } catch (e) {
            console.error(e);
            addToast('Failed to update developer settings.', 'error');
        }
    }, [addToast]);

    return {
        handleUpdateTeacher,

        handleUpdateWithdrawal,
        handleRemoveDefaultCoverImage,
        handleRemoveCoverImageFromArray,
        handleTopUpDecision,
        handleUpdateSaleStatus,
        handleUpdatePhotoOrderStatus,
        handleSaveBankDetails,
        handleVerificationDecision,
        handleUpdateStaticContent,
        handleUpdateHomeSlides,
        handleUpdateSocialMediaLinks,
        handleUpdateSubjects,
        handleUpdateStudentCardTaglines,
        handleUpdateTeacherCardTaglines,
        handleUpdateHomePageLayoutConfig,
        handleUpdateUpcomingExams,
        handleUpdatePhotoPrintOptions,
        handleUpdateAdditionalServices,
        handleUpdatePaymentGatewaySettings,
        handleUpdateTeacherDashboardMessage,
        handleUpdateFinancialSettings,
        handleUpdateSupportSettings,
        processMonthlyPayouts,
        handleSendNotification,
        handleRequestWithdrawal,
        handleCourseApproval,
        handleProductApproval,
        handleVerificationUpload,
        handleUpdatePhysicalOrderStatus,
        handleAssignReferralCode,
        handleGenerateVouchers,
        handleDeleteVoucher,
        handleUpdateVoucher,
        handleUpdateDeveloperSettings
    };
};
