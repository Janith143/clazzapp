import { useCallback, useMemo } from 'react';
import { Teacher, Course, Product, Quiz, IndividualClass, Sale, StudentSubmission, ClassGrading, EditableImageType, CourseRating, TeacherRating, Event } from '../types';
import { useNavigation } from '../contexts/NavigationContext';
import { db } from '../firebase';
// FIX: Import 'setDoc' and 'runTransaction' from 'firebase/firestore' to fix 'Cannot find name' errors.
import { doc, updateDoc, getDoc, writeBatch, increment, deleteDoc, query, where, getDocs, collection, setDoc, runTransaction } from 'firebase/firestore';
import { sendNotification } from '../utils';

const ADMIN_EMAIL = 'admin@clazz.lk';

interface ContentActionDeps {
    currentUser: any;
    teachers: Teacher[];
    sales: Sale[];
    submissions: StudentSubmission[];
    ui: any;
    nav: any;
    handleUpdateTeacher: (teacherId: string, updates: Partial<Teacher>) => Promise<void>;
    handleImageSave: (base64: string, type: EditableImageType | null, context?: any) => Promise<string | void>;
}

export const useContentActions = (deps: ContentActionDeps) => {
    const { currentUser, teachers, sales, submissions, ui, nav, handleUpdateTeacher, handleImageSave } = deps;
    const { addToast } = ui;
    const { handleNavigate, functionUrls } = nav;
    const currencyFormatter = useMemo(() => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }), []);


    const handleSaveClass = useCallback((classDetails: IndividualClass) => {
        const ownerId = classDetails.teacherId;
        const teacherToUpdate = teachers.find(t => t.id === ownerId);
        if (!teacherToUpdate) { addToast("Selected teacher profile not found.", "error"); return; }
        const existingIndex = teacherToUpdate.individualClasses.findIndex(c => c.id === classDetails.id);
        const newClasses = [...teacherToUpdate.individualClasses];
        if (existingIndex > -1) newClasses[existingIndex] = classDetails;
        else newClasses.push(classDetails);
        handleUpdateTeacher(teacherToUpdate.id, { individualClasses: newClasses });
    }, [teachers, handleUpdateTeacher, addToast]);

    const handleSaveCourse = useCallback(async (courseDetails: Course) => {
        let finalCourseDetails = { ...courseDetails };

        // Handle image upload if a new base64 image is present
        if (finalCourseDetails.coverImage && finalCourseDetails.coverImage.startsWith('data:image')) {
            addToast("Uploading cover image...", "info");
            try {
                const downloadURL = await handleImageSave(finalCourseDetails.coverImage, 'course_cover', { teacherId: finalCourseDetails.teacherId });
                if (downloadURL) {
                    finalCourseDetails.coverImage = downloadURL as string;
                } else {
                    addToast("Cover image upload failed. Course not saved.", "error");
                    return;
                }
            } catch (e) {
                console.error("Image upload error:", e);
                addToast("Image upload failed.", "error");
                return;
            }
        }

        const teacherId = finalCourseDetails.teacherId;
        const teacherRef = doc(db, "teachers", teacherId);

        try {
            await runTransaction(db, async (transaction) => {
                const teacherDoc = await transaction.get(teacherRef);
                if (!teacherDoc.exists()) {
                    throw new Error("Associated teacher profile not found.");
                }

                const teacherData = teacherDoc.data() as Teacher;
                const currentCourses = teacherData.courses || [];
                const existingIndex = currentCourses.findIndex(c => c.id === finalCourseDetails.id);

                const newCourses = [...currentCourses];
                const isNew = existingIndex === -1;

                if (isNew) {
                    newCourses.push(finalCourseDetails);
                } else {
                    newCourses[existingIndex] = finalCourseDetails;
                }

                transaction.update(teacherRef, { courses: newCourses });
            });

            const isNew = !teachers.find(t => t.id === teacherId)?.courses.some(c => c.id === finalCourseDetails.id); // Check sync state or just assume success
            // Note: 'isNew' calculation here is slightly approximate since we just wrote it, but good enough for toast msg.
            // Actually, simplified:
            addToast("Course saved successfully!", "success");

            // Only navigate if we can confirm it was valid
            handleNavigate({ name: 'teacher_profile', teacherId: teacherId });

        } catch (e: any) {
            console.error("Failed to save course:", e);
            addToast(e.message || "Failed to save course.", "error");
        }
    }, [teachers, handleImageSave, addToast, handleNavigate]);

    const handleSaveProduct = useCallback(async (productDetails: Product) => {
        const teacher = teachers.find(t => t.id === productDetails.teacherId);
        if (!teacher) { addToast("Associated teacher not found.", "error"); return; }

        const existingProducts = teacher.products || [];
        const existingIndex = existingProducts.findIndex(p => p.id === productDetails.id);
        const newProducts = [...existingProducts];
        const isNewProduct = existingIndex === -1;

        if (isNewProduct) {
            newProducts.push(productDetails);
        } else {
            newProducts[existingIndex] = productDetails;
        }

        await handleUpdateTeacher(teacher.id, { products: newProducts });
        addToast(isNewProduct ? "Product created. You can now request for it to be published." : "Product updated.", "success");

        if (isNewProduct) {
            const subject = `New Product Listed: ${productDetails.title}`;
            const htmlBody = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <p>A new product has been created by a teacher and is ready for review.</p>
                    <ul>
                        <li><strong>Product:</strong> ${productDetails.title}</li>
                        <li><strong>Teacher:</strong> ${teacher.name} (${teacher.id})</li>
                        <li><strong>Price:</strong> ${currencyFormatter.format(productDetails.price)}</li>
                        <li><strong>Type:</strong> ${productDetails.type}</li>
                    </ul>
                    <p>You can review and approve it from the admin dashboard under 'Product Management'. Note: The teacher must still click 'Request Publish' for it to appear in your queue.</p>
                </div>
            `;
            await sendNotification(functionUrls.notification, { email: ADMIN_EMAIL }, subject, htmlBody);
        }
    }, [teachers, handleUpdateTeacher, addToast, currencyFormatter]);

    const handleSaveQuiz = useCallback(async (quizDetails: Quiz) => {
        const teacher = teachers.find(t => t.id === quizDetails.teacherId);
        if (!teacher) { addToast("Error: Associated teacher profile not found.", "error"); return; }
        const existingIndex = teacher.quizzes.findIndex(q => q.id === quizDetails.id);
        const newQuizzes = [...teacher.quizzes];
        if (existingIndex > -1) { newQuizzes[existingIndex] = quizDetails; } else { newQuizzes.push(quizDetails); }
        await handleUpdateTeacher(teacher.id, { quizzes: newQuizzes });
    }, [teachers, handleUpdateTeacher, addToast]);

    const handleCancelItem = useCallback(async (teacherId: string, itemId: string | number, type: 'class' | 'quiz') => {
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) return;

        const batch = writeBatch(db);
        const teacherRef = doc(db, 'teachers', teacherId);
        let itemsToUpdate: any[] = [];
        let itemToCancel: any;

        if (type === 'class') {
            itemsToUpdate = teacher.individualClasses.map(c => {
                if (c.id === itemId) { itemToCancel = c; return { ...c, status: 'canceled', isPublished: false }; }
                return c;
            });
            batch.update(teacherRef, { individualClasses: itemsToUpdate });
        } else {
            itemsToUpdate = teacher.quizzes.map(q => {
                if (q.id === itemId) { itemToCancel = q; return { ...q, status: 'canceled', isPublished: false }; }
                return q;
            });
            batch.update(teacherRef, { quizzes: itemsToUpdate });
        }

        if (!itemToCancel) { addToast("Item to cancel not found.", "error"); return; }

        const salesToRefund = sales.filter(s => s.itemId === itemId && s.itemType === type && s.status === 'completed' && (s.itemSnapshot as any)?.instanceStartDate === itemToCancel.instanceStartDate);

        for (const sale of salesToRefund) {
            batch.update(doc(db, "sales", sale.id), { status: 'refunded' });
            const refundAmount = sale.totalAmount + sale.amountPaidFromBalance;
            batch.update(doc(db, "users", sale.studentId), { accountBalance: increment(refundAmount) });

            // Deduct earnings from teacher and institute
            if (sale.teacherCommission && sale.teacherCommission > 0) {
                batch.update(teacherRef, { 'earnings.total': increment(-sale.teacherCommission) });
            }

            if (sale.instituteId && sale.instituteCommission && sale.instituteCommission > 0) {
                const instituteRef = doc(db, 'tuitionInstitutes', sale.instituteId);
                batch.update(instituteRef, { 'earnings.total': increment(-sale.instituteCommission) });
            }
        }

        try {
            await batch.commit();
            addToast(`${type} canceled and ${salesToRefund.length} student(s) refunded.`, 'success');
        } catch (e) {
            console.error(e);
            addToast(`Failed to cancel ${type}.`, "error");
        }
    }, [teachers, sales, addToast]);

    const handleTogglePublishState = useCallback(async (teacherId: string, itemId: string | number, type: 'class' | 'course' | 'quiz' | 'product' | 'events', action?: 'request_approval') => {
        const teacherRef = doc(db, 'teachers', teacherId);
        try {
            const teacherDoc = await getDoc(teacherRef);
            if (!teacherDoc.exists()) throw new Error("Teacher not found");
            const teacherData = teacherDoc.data() as Teacher;
            let updatePayload: Partial<Teacher> = {};
            let itemTypeLabel = type.charAt(0).toUpperCase() + type.slice(1);
            let isPublishing = false;
            let showSuccessToast = true;
            let itemToUpdate: any;

            if (type === 'class') {
                const items = [...teacherData.individualClasses];
                const idx = items.findIndex(i => i.id === itemId);
                if (idx > -1) { isPublishing = !items[idx].isPublished; items[idx].isPublished = isPublishing; updatePayload = { individualClasses: items }; }
            } else if (type === 'course') {
                const items = [...teacherData.courses];
                const idx = items.findIndex(i => i.id === itemId);
                if (idx > -1) {
                    itemToUpdate = items[idx];
                    if (action === 'request_approval') {
                        items[idx].adminApproval = 'pending';
                        addToast(`${itemTypeLabel} submitted for admin review.`, 'success');
                        showSuccessToast = false;

                        const subject = `Content Awaiting Approval: ${itemToUpdate.title}`;
                        const htmlBody = `
                            <div style="font-family: Arial, sans-serif; color: #333;">
                                <p>A new course is awaiting your approval.</p>
                                <ul>
                                    <li><strong>Title:</strong> ${itemToUpdate.title}</li>
                                    <li><strong>Type:</strong> ${type}</li>
                                    <li><strong>Teacher:</strong> ${teacherData.name} (${teacherId})</li>
                                </ul>
                                <p>Please review it in the admin dashboard.</p>
                            </div>`;
                        await sendNotification(functionUrls.notification, { email: ADMIN_EMAIL }, subject, htmlBody);
                    } else {
                        isPublishing = !items[idx].isPublished;
                        items[idx].isPublished = isPublishing;
                    }
                    updatePayload = { courses: items };
                }
            } else if (type === 'product') {
                const items = [...(teacherData.products || [])];
                const idx = items.findIndex(i => i.id === itemId);
                if (idx > -1) {
                    itemToUpdate = items[idx];
                    if (action === 'request_approval') {
                        items[idx].adminApproval = 'pending';
                        addToast(`${itemTypeLabel} submitted for admin review.`, 'success');
                        showSuccessToast = false;

                        const subject = `Product Awaiting Approval: ${itemToUpdate.title}`;
                        const htmlBody = `
                            <div style="font-family: Arial, sans-serif; color: #333;">
                                <p>A new product is awaiting your approval.</p>
                                <ul>
                                    <li><strong>Title:</strong> ${itemToUpdate.title}</li>
                                    <li><strong>Type:</strong> ${type}</li>
                                    <li><strong>Teacher:</strong> ${teacherData.name} (${teacherId})</li>
                                </ul>
                                <p>Please review it in the admin dashboard.</p>
                            </div>`;
                        await sendNotification(functionUrls.notification, { email: ADMIN_EMAIL }, subject, htmlBody);
                    } else {
                        isPublishing = !items[idx].isPublished;
                        items[idx].isPublished = isPublishing;
                    }
                    updatePayload = { products: items };
                }
            } else if (type === 'quiz') {
                const items = [...teacherData.quizzes];
                const idx = items.findIndex(i => i.id === itemId);
                if (idx > -1) { isPublishing = !items[idx].isPublished; items[idx].isPublished = isPublishing; updatePayload = { quizzes: items }; }
            } else if (type === 'events') {
                const items = [...(teacherData.events || [])];
                const idx = items.findIndex(i => i.id === itemId);
                if (idx > -1) { isPublishing = !items[idx].isPublished; items[idx].isPublished = isPublishing; updatePayload = { events: items }; }
            }

            if (Object.keys(updatePayload).length > 0) {
                await updateDoc(teacherRef, updatePayload);
                if (showSuccessToast) addToast(`${itemTypeLabel} has been ${isPublishing ? 'published' : 'unpublished'}.`, 'success');
            } else { addToast(`Could not find ${itemTypeLabel} to update.`, 'error'); }
        } catch (e) { console.error(e); addToast(`Failed to update ${type}.`, 'error'); }
    }, [addToast]);

    const handleRateCourse = useCallback(async (courseId: string, rating: number) => {
        if (!currentUser) {
            addToast("You must be logged in to rate a course.", "error");
            return;
        }
        const teacher = teachers.find(t => t.courses.some(c => c.id === courseId));
        if (!teacher) {
            addToast("Could not find the course to rate.", "error");
            return;
        }

        const newCourses = teacher.courses.map(course => {
            if (course.id === courseId) {
                const newRatings = [...course.ratings];
                const userRatingIndex = newRatings.findIndex(r => r.studentId === currentUser.id);

                const ratingData: CourseRating = {
                    studentId: currentUser.id,
                    rating,
                    ratedAt: new Date().toISOString()
                };

                if (userRatingIndex > -1) {
                    newRatings[userRatingIndex] = ratingData;
                } else {
                    newRatings.push(ratingData);
                }
                return { ...course, ratings: newRatings };
            }
            return course;
        });

        try {
            await handleUpdateTeacher(teacher.id, { courses: newCourses });
            addToast("Thank you for your rating!", "success");
        } catch (e) {
            // Error toast will be in handleUpdateTeacher
        }
    }, [currentUser, teachers, handleUpdateTeacher, addToast]);

    const handleRateTeacher = useCallback(async (teacherId: string, classId: number, rating: number) => {
        if (!currentUser) {
            addToast("You must be logged in to rate a teacher.", "error");
            return;
        }
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) {
            addToast("Could not find the teacher to rate.", "error");
            return;
        }

        const newRatings = [...(teacher.ratings || [])];
        const userRatingIndex = newRatings.findIndex(r => r.studentId === currentUser.id && r.classId === classId);

        const ratingData: TeacherRating = {
            studentId: currentUser.id,
            classId,
            rating,
            ratedAt: new Date().toISOString()
        };

        if (userRatingIndex > -1) {
            newRatings[userRatingIndex] = ratingData;
        } else {
            newRatings.push(ratingData);
        }

        try {
            await handleUpdateTeacher(teacher.id, { ratings: newRatings });
            addToast("Thank you for your rating!", "success");
        } catch (e) {
            // Error toast will be in handleUpdateTeacher
        }
    }, [currentUser, teachers, handleUpdateTeacher, addToast]);

    const handleFinishQuiz = useCallback(async (submissionData: Omit<StudentSubmission, 'id' | 'score'>) => {
        const quizSale = sales.find(s => s.itemId === submissionData.quizId && s.studentId === submissionData.studentId && (s.itemSnapshot as Quiz).instanceStartDate === submissionData.quizInstanceId);
        const quiz = quizSale?.itemSnapshot as Quiz;
        if (!quiz) { addToast("Quiz data not found for this submission.", "error"); return; }

        let score = 0;
        quiz.questions.forEach(q => {
            const submissionAnswer = submissionData.answers.find(a => a.questionId === q.id);
            if (submissionAnswer) {
                const correctAnswers = q.answers.filter(a => a.isCorrect).map(a => a.id);
                if (correctAnswers.length === submissionAnswer.selectedAnswerIds.length && correctAnswers.every(id => submissionAnswer.selectedAnswerIds.includes(id))) {
                    score++;
                }
            }
        });

        const submissionId = `sub_${submissionData.studentId}_${submissionData.quizId}_${submissionData.quizInstanceId}`;
        await setDoc(doc(db, "submissions", submissionId), { ...submissionData, id: submissionId, score });
        addToast("Quiz submitted successfully!", "success");
        handleNavigate({ name: 'quiz_detail', quizId: submissionData.quizId, instanceId: submissionData.quizInstanceId });
    }, [sales, addToast, handleNavigate]);

    const handleDeleteQuizSubmissions = useCallback(async (quizId: string) => {
        const batch = writeBatch(db);
        const q = query(collection(db, "submissions"), where("quizId", "==", quizId));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        addToast("Previous submissions for this quiz have been cleared.", "success");
    }, [addToast]);

    const logLectureWatch = useCallback(async (courseId: string, lectureId: string) => {
        if (!currentUser) return;
        const fieldToUpdate = `watchHistory.${courseId}.${lectureId}`;
        await updateDoc(doc(db, "users", currentUser.id), { [fieldToUpdate]: true });
    }, [currentUser]);

    const handleSaveClassRecording = useCallback(async (teacherId: string, classId: number, instanceDate: string, recordingUrls: string[]) => {
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) {
            addToast("Teacher not found.", "error");
            return;
        }

        const classIndex = teacher.individualClasses.findIndex(c => c.id === classId);
        if (classIndex === -1) {
            addToast("Class not found.", "error");
            return;
        }

        const updatedClasses = [...teacher.individualClasses];
        const classToUpdate = { ...updatedClasses[classIndex] };

        if (!classToUpdate.recordingUrls) {
            classToUpdate.recordingUrls = {};
        }
        classToUpdate.recordingUrls[instanceDate] = recordingUrls;

        updatedClasses[classIndex] = classToUpdate;

        try {
            await handleUpdateTeacher(teacherId, { individualClasses: updatedClasses });
            addToast("Recording link(s) saved!", "success");
        } catch (e) {
            // error toast is in handleUpdateTeacher
        }
    }, [teachers, handleUpdateTeacher, addToast]);

    const handleSaveGrading = useCallback(async (teacherId: string, classId: number, instanceDate: string, grades: ClassGrading) => {
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) { addToast("Teacher not found.", "error"); return; }
        const classIndex = teacher.individualClasses.findIndex(c => c.id === classId);
        if (classIndex === -1) { addToast("Class not found.", "error"); return; }
        const updatedClasses = [...teacher.individualClasses];
        if (!updatedClasses[classIndex].grades) updatedClasses[classIndex].grades = {};
        updatedClasses[classIndex].grades![instanceDate] = grades;
        await handleUpdateTeacher(teacherId, { individualClasses: updatedClasses });
        addToast("Grades saved successfully!", "success");
    }, [teachers, handleUpdateTeacher, addToast]);

    const handleSaveHomeworkSubmission = useCallback(async (teacherId: string, classId: number, instanceDate: string, link: string) => {
        if (!currentUser) {
            addToast("You must be logged in to submit homework.", "error");
            return;
        }
        try {
            await runTransaction(db, async (transaction) => {
                const teacherRef = doc(db, 'teachers', teacherId);
                const teacherDoc = await transaction.get(teacherRef);
                if (!teacherDoc.exists()) throw new Error("Class teacher not found.");

                const teacherData = teacherDoc.data() as Teacher;
                const classIndex = teacherData.individualClasses.findIndex(c => c.id === classId);
                if (classIndex === -1) throw new Error("Class not found.");

                const classToUpdate = { ...teacherData.individualClasses[classIndex] };
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

                const updatedClasses = [...teacherData.individualClasses];
                updatedClasses[classIndex] = classToUpdate;

                transaction.update(teacherRef, { individualClasses: updatedClasses });
            });
            addToast("Homework submitted successfully!", "success");
        } catch (e) {
            console.error(e);
            addToast((e as Error).message || "Error saving homework.", "error");
        }
    }, [currentUser, addToast]);

    const handleSaveEvent = useCallback(async (eventDetails: Event) => {
        const teacherId = eventDetails.organizerId;
        const teacher = teachers.find(t => t.id === teacherId);

        if (!teacher) {
            addToast("Associated teacher profile not found.", "error");
            return;
        }

        const existingEvents = teacher.events || [];
        const existingIndex = existingEvents.findIndex(e => e.id === eventDetails.id);
        const newEvents = [...existingEvents];

        if (existingIndex > -1) {
            newEvents[existingIndex] = eventDetails;
        } else {
            newEvents.push(eventDetails);
        }

        try {
            await handleUpdateTeacher(teacher.id, { events: newEvents });
            addToast("Event saved successfully!", "success");
        } catch (e) {
            // Error toast handled in handleUpdateTeacher
        }
    }, [teachers, handleUpdateTeacher, addToast]);

    return {
        handleSaveClass, handleSaveCourse, handleSaveProduct, handleSaveQuiz, handleSaveEvent, handleCancelItem, handleTogglePublishState,
        handleRateCourse, handleRateTeacher, handleFinishQuiz, handleDeleteQuizSubmissions, logLectureWatch,
        handleSaveClassRecording, handleSaveGrading, handleSaveHomeworkSubmission
    };
};