import { useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useUserActions } from './useUserActions';
import { useContentActions } from './useContentActions';
import { useTransactionActions } from './useTransactionActions';
import { useAdminActions } from './useAdminActions';
import { useInstituteActions } from './useInstituteActions';
import { db, storage } from '../firebase';
// FIX: Replaced incorrect import with named imports for Firebase Storage functions as per v9 modular SDK.
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, writeBatch, arrayUnion, arrayRemove, getDoc, runTransaction, collection, setDoc, increment, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { EditableImageType, IndividualClass, Teacher, Sale, PageState, TuitionInstitute } from '../types';

// This is a composer hook that brings all the data action hooks together.
export const useDataActions = (deps: any) => {
    const { currentUser, users, teachers, tuitionInstitutes, knownInstitutes, sales, vouchers, topUpRequests, submissions, certificates, defaultCoverImages } = deps;
    const auth = useAuth();
    const ui = useUI();
    const nav = useNavigation();
    const { addToast } = ui;
    const currencyFormatter = useMemo(() => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }), []);

    const handleImageSave = async (base64: string, type: EditableImageType | null, opContext?: any): Promise<string | void> => {
        if (!base64) { addToast("No image selected.", "error"); return; }
        const timestamp = Date.now();
        let filePath: string;

        if (type === 'student_profile' && currentUser) filePath = `profile-images/students/${currentUser.id}_${timestamp}`;
        else if (type === 'profile') filePath = `profile-images/teachers/${opContext.teacherId}_${timestamp}`;
        else if (type === 'cover_add') filePath = `cover-images/${opContext.teacherId}/${timestamp}`;
        else if (typeof type === 'object' && type.type === 'cover') filePath = `cover-images/${opContext.teacherId}/${timestamp}`;
        else if (type === 'admin_default_cover') filePath = `default-cover-images/${timestamp}`;
        else if (type === 'id_verification_front' || type === 'id_verification_back') filePath = `verification-docs/${opContext.teacherId}/${type}_${timestamp}`;
        else if (type === 'bank_verification') filePath = `verification-docs/${opContext.teacherId}/bank_${timestamp}`;
        else if (type === 'payment_slip') filePath = `payment-slips/${currentUser?.id}/${timestamp}`;
        else if (type === 'event_flyer') filePath = `event-flyers/${opContext.organizerId}/${timestamp}`;
        else if (type === 'quiz_question_image') filePath = `quiz-images/${opContext.quizId}/${opContext.questionId}_${timestamp}`;
        else if (type === 'product_cover' || type === 'course_cover') filePath = `product-images/${opContext.teacherId}/${timestamp}`;
        else if (type === 'og_image') filePath = `site-assets/og_image_${timestamp}`;
        else if (type === 'payment_method_logo') filePath = `site-assets/payment-logos/${opContext.methodId}_${timestamp}`;
        else throw new Error(`Unsupported image upload type: ${type}`);

        // FIX: Use the correctly imported ref function from firebase/storage.
        const storageRef = ref(storage, filePath);
        try {
            addToast("Uploading image...", "info");
            // FIX: Use the correctly imported uploadString function from firebase/storage.
            await uploadString(storageRef, base64, 'data_url');
            // FIX: Use the correctly imported getDownloadURL function from firebase/storage.
            const downloadURL = await getDownloadURL(storageRef);

            if (type === 'student_profile' && currentUser) {
                await updateDoc(doc(db, "users", currentUser.id), { avatar: downloadURL });
            } else if (type === 'profile') {
                const teacherRef = doc(db, "teachers", opContext.teacherId);
                const teacherDoc = await getDoc(teacherRef);
                if (teacherDoc.exists()) {
                    const userRef = doc(db, 'users', (teacherDoc.data() as any).userId);
                    const batch = writeBatch(db);
                    batch.update(teacherRef, { profileImage: downloadURL, avatar: downloadURL });
                    batch.update(userRef, { avatar: downloadURL });
                    await batch.commit();
                }
            } else if (type === 'cover_add') {
                await updateDoc(doc(db, "teachers", opContext.teacherId), { coverImages: arrayUnion(downloadURL) });
            } else if (typeof type === 'object' && type.type === 'cover') {
                const teacherRef = doc(db, "teachers", opContext.teacherId);
                const teacherDoc = await getDoc(teacherRef);
                if (teacherDoc.exists()) {
                    // FIX: Use Array.isArray() to prevent crash
                    const coverImages = (teacherDoc.data() as any).coverImages;
                    const newCoverImages = [...(Array.isArray(coverImages) ? coverImages : [])];
                    newCoverImages[type.index] = downloadURL;
                    await updateDoc(doc(db, "teachers", opContext.teacherId), { coverImages: newCoverImages });
                }
            } else if (type === 'admin_default_cover') {
                // Use setDoc with merge to ensure doc exists, but arrayUnion works best with updateDoc if doc exists.
                // To be safe and since we are adding, setDoc with merge and arrayUnion works.
                await setDoc(doc(db, "settings", "appConfig"), { defaultCoverImages: arrayUnion(downloadURL) }, { merge: true });
            }

            if (!['payment_slip', 'event_flyer', 'quiz_question_image', 'product_cover', 'course_cover', 'og_image', 'payment_method_logo'].includes(type as string)) {
                addToast("Image saved successfully!", "success");
            }
            return downloadURL;
        } catch (error) {
            console.error("Image upload/save failed:", error);
            addToast("Image save failed. Please try again.", "error");
        }
    };

    // Although the logic is split into multiple hooks for organization,
    // they are all included here to be created as one cohesive `useDataActions` hook
    // to satisfy the user's prompt structure with minimal new files.
    const userActions = useUserActions({ currentUser, ui, users, nav });
    const adminActions = useAdminActions({ ui, nav, users, teachers, tuitionInstitutes, knownInstitutes, sales, topUpRequests, ...userActions, handleImageSave });

    const contentActionsDeps = { currentUser, teachers, sales, submissions, ui, nav, handleUpdateTeacher: adminActions.handleUpdateTeacher, handleImageSave };
    const contentActions = {
        ...useContentActions(contentActionsDeps),
        handleSaveHomeworkSubmission: useCallback(async (teacherId: string, classId: number, instanceDate: string, link: string) => {
            if (!currentUser) {
                addToast("You must be logged in to submit homework.", "error");
                return;
            }
            const teacherRef = doc(db, 'teachers', teacherId);
            try {
                await runTransaction(db, async (transaction) => {
                    const teacherDoc = await transaction.get(teacherRef);
                    if (!teacherDoc.exists()) throw new Error("Class teacher not found.");

                    const teacherData = teacherDoc.data() as Teacher;

                    // FIX: Use Array.isArray() to prevent crash
                    const classes = Array.isArray(teacherData.individualClasses) ? teacherData.individualClasses : [];
                    const classIndex = classes.findIndex(c => c.id === classId);
                    if (classIndex === -1) throw new Error("Class not found.");

                    const classToUpdate = { ...classes[classIndex] };
                    const submissionsForDate = classToUpdate.homeworkSubmissions?.[instanceDate] || [];

                    const existingSubmissionIndex = submissionsForDate.findIndex(s => s.studentId === currentUser.id);

                    const newSubmission = {
                        studentId: currentUser.id,
                        link,
                        submittedAt: new Date().toISOString(),
                    };

                    if (existingSubmissionIndex > -1) {
                        submissionsForDate[existingSubmissionIndex] = newSubmission;
                    } else {
                        submissionsForDate.push(newSubmission);
                    }

                    if (!classToUpdate.homeworkSubmissions) {
                        classToUpdate.homeworkSubmissions = {};
                    }
                    // FIX: Changed from function call syntax to array/object property access syntax.
                    classToUpdate.homeworkSubmissions[instanceDate] = submissionsForDate;

                    // FIX: Use the 'classes' variable that is guaranteed to be an array
                    const updatedClasses = [...classes];
                    updatedClasses[classIndex] = classToUpdate;

                    transaction.update(teacherRef, { individualClasses: updatedClasses });
                });
                addToast("Homework submitted successfully!", "success");
            } catch (e) {
                console.error("Failed to save homework submission:", e);
                addToast((e as Error).message || "Error saving homework.", "error");
            }
        }, [currentUser, addToast])
    };

    const transactionActions = useTransactionActions({ currentUser, users, teachers, tuitionInstitutes, sales, vouchers, ui, auth, nav, handleImageSave, handleUpdateUser: userActions.handleUpdateUser, currencyFormatter });
    const instituteActions = useInstituteActions({ ui, currentUser, teachers, tuitionInstitutes, sales, functionUrls: nav.functionUrls });

    const handleUpdateOgImage = useCallback(async (imageUrl: string) => {
        await setDoc(doc(db, 'settings', 'appConfig'), { ogImageUrl: imageUrl }, { merge: true });
    }, []);

    return {
        ...userActions,
        ...adminActions,
        handleIssueCertificate: adminActions.handleIssueCertificate,
        ...contentActions,
        ...transactionActions,
        ...instituteActions,
        handleImageSave,
        handleUpdateOgImage,
    };
}