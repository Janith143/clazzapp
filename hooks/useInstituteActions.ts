
import { useCallback } from 'react';
import { User, IndividualClass, Sale, TuitionInstitute, Teacher, AttendanceRecord, Event, Withdrawal } from '../types';
import { UIContextType } from '../contexts/UIContext';
import { db } from '../firebase';
// FIX: Update Firebase imports for v9 modular SDK
import { doc, setDoc, updateDoc, writeBatch, increment, arrayUnion, runTransaction, collection, getDoc } from 'firebase/firestore';
import { generateStandardId, sendNotification } from '../utils';

interface InstituteActionDeps {
    ui: UIContextType;
    currentUser: User | null;
    teachers: Teacher[];
    tuitionInstitutes: TuitionInstitute[];
    sales: Sale[];
    functionUrls: Record<string, string>;
}

export const useInstituteActions = (deps: InstituteActionDeps) => {
    const { ui, currentUser, teachers, tuitionInstitutes, sales, functionUrls } = deps;
    const { addToast } = ui;

    const addTuitionInstitute = useCallback(async (institute: TuitionInstitute) => {
        try {
            await setDoc(doc(db, "tuitionInstitutes", institute.id), institute);
        } catch (e) {
            console.error(e);
            addToast("Failed to save institute profile.", "error");
            throw e;
        }
    }, [addToast]);

    const updateTuitionInstitute = useCallback(async (instituteId: string, updates: Partial<TuitionInstitute>) => {
        try {
            await updateDoc(doc(db, "tuitionInstitutes", instituteId), updates);
        } catch (e) {
            console.error(e);
            addToast("Failed to update institute profile.", "error");
            throw e;
        }
    }, [addToast]);

    const handleSaveEvent = useCallback(async (eventDetails: Event) => {
        const institute = tuitionInstitutes.find(ti => ti.id === eventDetails.organizerId);
        if (!institute) {
            addToast("Could not find the organizing institute.", "error");
            return;
        }

        const existingEvents = institute.events || [];
        const existingIndex = existingEvents.findIndex(e => e.id === eventDetails.id);
        const newEvents = [...existingEvents];

        if (existingIndex > -1) {
            newEvents[existingIndex] = eventDetails;
        } else {
            newEvents.push(eventDetails);
        }

        try {
            await updateTuitionInstitute(institute.id, { events: newEvents });
            addToast("Event saved successfully!", "success");
        } catch (e) {
            addToast("Failed to save event.", "error");
        }
    }, [tuitionInstitutes, updateTuitionInstitute, addToast]);

    const handleCancelEvent = useCallback(async (instituteId: string, eventId: string) => {
        const institute = tuitionInstitutes.find(ti => ti.id === instituteId);
        if (!institute) return;

        const batch = writeBatch(db);
        const instituteRef = doc(db, 'tuitionInstitutes', instituteId);

        const existingEvents = institute.events || [];
        const eventIndex = existingEvents.findIndex(e => e.id === eventId);
        if (eventIndex > -1) {
            const updatedEvents = [...existingEvents];
            updatedEvents[eventIndex] = { ...updatedEvents[eventIndex], status: 'canceled', isDeleted: true };
            batch.update(instituteRef, { events: updatedEvents });
        }

        const salesToRefund = sales.filter(s => s.itemId === eventId && s.itemType === 'event' && s.status === 'completed');
        for (const sale of salesToRefund) {
            batch.update(doc(db, "sales", sale.id), { status: 'refunded' });
            const refundAmount = sale.totalAmount + sale.amountPaidFromBalance;
            batch.update(doc(db, "users", sale.studentId), { accountBalance: increment(refundAmount) });
        }

        try {
            await batch.commit();
            addToast(`Event canceled and ${salesToRefund.length} student(s) refunded.`, 'success');
        } catch (e) {
            console.error(e);
            addToast("Failed to cancel event.", "error");
        }
    }, [sales, tuitionInstitutes, addToast]);

    const handleToggleEventPublishState = useCallback(async (instituteId: string, eventId: string) => {
        const institute = tuitionInstitutes.find(ti => ti.id === instituteId);
        if (!institute) {
            addToast("Could not find the organizing institute.", "error");
            return;
        }

        const events = institute.events || [];
        const eventIndex = events.findIndex(e => e.id === eventId);
        if (eventIndex === -1) {
            addToast("Event not found to update.", "error");
            return;
        }

        const updatedEvents = [...events];
        const isPublishing = !updatedEvents[eventIndex].isPublished;
        updatedEvents[eventIndex].isPublished = isPublishing;

        try {
            await updateTuitionInstitute(instituteId, { events: updatedEvents });
            addToast(`Event has been ${isPublishing ? 'published' : 'unpublished'}.`, "success");
        } catch (e) {
            addToast("Failed to update event status.", "error");
        }
    }, [tuitionInstitutes, updateTuitionInstitute, addToast]);

    const getTeacherCollection = useCallback((teacherId: string) => {
        const teacher = teachers.find(t => t.id === teacherId);
        return (teacher as any)?._collection || 'teachers'; // Default to legacy 'teachers' if not found/tagged
    }, [teachers]);

    const saveManagedTeacher = useCallback(async (teacherData: Partial<Teacher>) => {
        if (!currentUser) {
            addToast("You must be logged in.", "error");
            return;
        }

        try {
            if (teacherData.id) {
                // Update existing
                const collectionName = getTeacherCollection(teacherData.id);
                await updateDoc(doc(db, collectionName, teacherData.id), teacherData);
                addToast("Teacher updated successfully.", "success");
            } else {
                // Create new - user separated collection
                const newTeacherId = generateStandardId('TCH');
                const teacher: Teacher = {
                    id: newTeacherId,
                    name: teacherData.name || 'New Teacher',
                    username: teacherData.username || `inst_${currentUser.id}_${Date.now()}`,
                    // Valid email format but placeholder - no Auth User created
                    email: teacherData.email || `${newTeacherId}@placeholder.com`,
                    profileImage: teacherData.profileImage || '',
                    avatar: teacherData.avatar || '',
                    coverImages: [],
                    tagline: teacherData.tagline || '',
                    bio: teacherData.bio || '',
                    subjects: teacherData.subjects || [],
                    exams: [],
                    qualifications: [],
                    languages: [],
                    experienceYears: 0,
                    commissionRate: teacherData.commissionRate || 0,
                    contact: teacherData.contact || { phone: '', email: '', location: '', onlineAvailable: false },
                    timetable: [],
                    individualClasses: [],
                    courses: [],
                    quizzes: [],
                    achievements: [],
                    registrationStatus: 'approved',
                    earnings: {
                        total: 0,
                        withdrawn: 0,
                        available: 0
                    },
                    withdrawalHistory: [],
                    verification: {
                        id: { frontUrl: '', backUrl: '', status: 'approved' },
                        bank: { bankName: '', branch: '', accountName: '', accountNumber: '', status: 'approved' }
                    },
                    ratings: [],
                    manualEarningsByInstitute: {},
                    isManaged: true,
                    instituteId: currentUser.id,
                    isPublished: true,
                    ...teacherData
                } as Teacher;

                await setDoc(doc(db, "managed_teachers", newTeacherId), teacher);
                addToast("Teacher added successfully.", "success");
            }
        } catch (e) {
            console.error(e);
            addToast("Failed to save teacher.", "error");
        }
    }, [currentUser, addToast, getTeacherCollection]);




    const deleteManagedTeacher = useCallback(async (teacherId: string) => {
        if (!confirm("Are you sure you want to delete this teacher? This action cannot be undone.")) return;
        try {
            const collectionName = getTeacherCollection(teacherId);
            await updateDoc(doc(db, collectionName, teacherId), { isDeleted: true });
            addToast("Teacher deleted successfully.", "success");
        } catch (e) {
            console.error(e);
            addToast("Failed to delete teacher.", "error");
        }
    }, [addToast, getTeacherCollection]);

    const toggleTeacherPublishState = useCallback(async (teacherId: string, currentState: boolean) => {
        try {
            const collectionName = getTeacherCollection(teacherId);
            await updateDoc(doc(db, collectionName, teacherId), { isPublished: !currentState });
            addToast(`Teacher ${!currentState ? 'published' : 'unpublished'} successfully.`, "success");
        } catch (e) {
            console.error(e);
            addToast("Failed to update publish state.", "error");
        }
    }, [addToast, getTeacherCollection]);

    const markAttendance = useCallback(async (classId: number, student: User, paymentStatus: 'paid_at_venue' | 'unpaid' | 'paid', paymentRef?: string, enrollNow: boolean = false): Promise<boolean> => {
        const teacher = teachers.find(t => t.individualClasses.some(c => c.id === classId));
        if (!teacher) { addToast("Could not find class owner.", "error"); return false; }

        let classTitle = '';

        try {
            await runTransaction(db, async (transaction) => {
                const collectionName = (teacher as any)._collection || 'teachers';
                const teacherRef = doc(db, collectionName, teacher.id);
                const teacherDoc = await transaction.get(teacherRef);
                if (!teacherDoc.exists()) throw new Error("Teacher not found");

                const updatedTeacherData = teacherDoc.data() as Teacher;
                const classIndex = updatedTeacherData.individualClasses.findIndex(c => c.id === classId);
                if (classIndex === -1) throw new Error("Class not found on teacher profile");

                const classToUpdate = updatedTeacherData.individualClasses[classIndex];
                classTitle = classToUpdate.title;
                const existingAttendance = classToUpdate.attendance || [];

                // Prevent duplicate attendance
                if (existingAttendance.some(a => a.studentId === student.id)) {
                    throw new Error("ALREADY_MARKED");
                }

                const newRecord: AttendanceRecord = {
                    studentId: student.id,
                    studentName: `${student.firstName} ${student.lastName}`,
                    studentAvatar: student.avatar || '',
                    attendedAt: new Date().toISOString(),
                    paymentStatus
                };
                if (paymentRef) newRecord.paymentRef = paymentRef;
                if (paymentStatus === 'paid_at_venue' || paymentStatus === 'paid') newRecord.paymentStatus = paymentStatus;

                classToUpdate.attendance = [...existingAttendance, newRecord];
                updatedTeacherData.individualClasses[classIndex] = classToUpdate;

                // Sanitize Payload
                const safeIndividualClasses = JSON.parse(JSON.stringify(updatedTeacherData.individualClasses));
                transaction.update(teacherRef, { individualClasses: safeIndividualClasses });

                // --- CHARGE ATTENDANCE FEE ---
                // ONLY charge here if Unpaid. If Paid, the Sale record (recordManualPayment) handles the fee/commission.
                if (paymentStatus !== 'paid_at_venue' && paymentStatus !== 'paid') {
                    // Find Institute
                    const currentClass = updatedTeacherData.individualClasses[classIndex];
                    if (currentClass.instituteId) {
                        const institute = tuitionInstitutes.find(ti => ti.id === currentClass.instituteId);
                        if (institute) {
                            const fee = institute.manualAttendanceFee ?? 50;
                            const instituteRef = doc(db, "tuitionInstitutes", currentClass.instituteId);

                            // Deduct from Institute
                            transaction.update(instituteRef, {
                                'earnings.total': increment(-fee),
                                'earnings.available': increment(-fee)
                            });

                            // Add to Platform Stats
                            const statsRef = doc(db, 'settings', 'platform_stats');
                            transaction.set(statsRef, {
                                totalEarnings: increment(fee),
                                [`monthlyEarnings.${new Date().toISOString().slice(0, 7)}`]: increment(fee),
                                lastUpdated: new Date().toISOString()
                            }, { merge: true });

                            // Log
                            const logRef = doc(collection(db, 'activity_logs'));
                            transaction.set(logRef, {
                                type: 'attendance_fee_charge',
                                description: `Attendance Fee deducted for ${student.firstName} ${student.lastName} (Unpaid)`,
                                feeAmount: fee,
                                instituteId: currentClass.instituteId,
                                classId: classId,
                                timestamp: new Date().toISOString()
                            });
                        }
                    }
                }
                // -----------------------------


                // Handle Enrollment if requested
                if (enrollNow) {
                    const studentRef = doc(db, 'users', student.id);
                    transaction.update(studentRef, { enrolledClassIds: arrayUnion(classId) });
                }
            });

            // Handle Payment Creation (outside transaction to avoid complexity, or careful inclusion)
            // If Paid at Venue, we should record the manual payment sale ONLY if not already recorded (no paymentRef)
            if ((paymentStatus === 'paid_at_venue' || paymentStatus === 'paid') && !paymentRef) {
                // We re-fetch class info to be safe or use what we found. 
                // Since we have 'teachers', we can find it.
                const teacher = teachers.find(t => t.individualClasses.some(c => c.id === classId));
                const classInfo = teacher?.individualClasses.find(c => c.id === classId);
                if (classInfo) {
                    await recordManualPayment(classInfo, student);
                }
            }

            addToast(`${student.firstName}'s attendance marked successfully.`, 'success');

            // Send Guardian Notification
            if (student.guardianEmail || student.guardianPhone) {
                const dateStr = new Date().toLocaleDateString();
                const subject = `Attendance Alert: ${classTitle}`;
                const htmlBody = `
                    <p>Dear Guardian,</p>
                    <p>This is a notification to confirm that your child, <b>${student.firstName} ${student.lastName}</b>, has attended the class <b>${classTitle}</b> on ${dateStr}.</p>
                    <p>Best regards,<br/>The Clazz.lk Team</p>
                `;
                const smsMessage = `Dear Guardian, ${student.firstName} attended '${classTitle}' on ${dateStr}. - Clazz.lk`;

                // Fire and forget notification
                sendNotification(
                    functionUrls.notification,
                    { email: student.guardianEmail, contactNumber: student.guardianPhone },
                    subject,
                    htmlBody,
                    smsMessage
                ).catch(err => console.error("Failed to send guardian notification", err));
            }

            return true;
        } catch (e: any) {
            if (e.message === "ALREADY_MARKED") {
                addToast(`${student.firstName} is already marked as attended.`, "info");
                return true;
            }
            console.error("Failed to mark attendance:", e);
            addToast((e as Error).message || "Error marking attendance.", "error");
            return false;
        }
    }, [teachers, addToast, functionUrls, tuitionInstitutes, currentUser]);

    const removeAttendance = useCallback(async (classId: number, studentId: string): Promise<boolean> => {
        const teacher = teachers.find(t => t.individualClasses.some(c => c.id === classId));
        if (!teacher) { addToast("Could not find class owner.", "error"); return false; }

        try {
            await runTransaction(db, async (transaction) => {
                const collectionName = (teacher as any)._collection || 'teachers';
                const teacherRef = doc(db, collectionName, teacher.id);
                const teacherDoc = await transaction.get(teacherRef);
                if (!teacherDoc.exists()) throw new Error("Teacher not found");

                const updatedTeacherData = teacherDoc.data() as Teacher;
                const classIndex = updatedTeacherData.individualClasses.findIndex(c => c.id === classId);
                if (classIndex === -1) throw new Error("Class not found on teacher profile");

                const classToUpdate = updatedTeacherData.individualClasses[classIndex];
                const existingAttendance = classToUpdate.attendance || [];

                classToUpdate.attendance = existingAttendance.filter(a => a.studentId !== studentId);
                updatedTeacherData.individualClasses[classIndex] = classToUpdate;

                transaction.update(teacherRef, { individualClasses: updatedTeacherData.individualClasses });
            });
            addToast(`Attendance removed successfully.`, 'success');
            return true;
        } catch (e) {
            console.error("Failed to remove attendance:", e);
            addToast((e as Error).message || "Error removing attendance.", "error");
            return false;
        }
    }, [teachers, addToast, tuitionInstitutes, currentUser]);

    const recordManualPayment = useCallback(async (classInfo: IndividualClass, student: User): Promise<Sale | null> => {
        if (!currentUser || !classInfo.instituteId) { addToast("Operation failed: missing user or institute context.", "error"); return null; }

        const newSaleId = generateStandardId('INV');
        const saleRef = doc(db, "sales", newSaleId);

        const institute = tuitionInstitutes.find(ti => ti.id === classInfo.instituteId);
        if (!institute) { addToast("Institute not found.", "error"); return null; }

        // Logic Change: Restore Fee logic for Paid transactions so it appears in Sales logs.
        // recordManualPayment handles the REVENUE SPLIT (Commission - Fee).
        let platformFee = institute.manualAttendanceFee !== undefined ? institute.manualAttendanceFee : 50;

        // Determine effective commission rate (use teacher specific override if available, else institute default)
        const instituteCommissionRate = institute.linkedTeacherCommissions?.[classInfo.teacherId] ?? institute.commissionRate;

        // Platform gets: Platform Fee (Fixed)
        // Institute gets: Commission Share - Platform Fee
        const instituteShareGross = (classInfo.fee * (instituteCommissionRate / 100));
        const instituteCommission = instituteShareGross - platformFee;
        const teacherCommission = classInfo.fee - instituteShareGross;

        // Note: If instituteCommission < 0, institute owes platform. Firestore increments handle negatives fine.

        const sale: Sale = {
            id: newSaleId, studentId: student.id, teacherId: classInfo.teacherId, instituteId: classInfo.instituteId,
            itemId: classInfo.id, itemType: 'class', itemName: classInfo.title, totalAmount: 0,
            amountPaidFromBalance: classInfo.fee,
            saleDate: new Date().toISOString(), currency: 'LKR', status: 'completed',
            paymentMethod: 'manual_at_venue', itemSnapshot: classInfo,
            platformCommission: platformFee, instituteCommission, teacherCommission,
        };

        try {
            const batch = writeBatch(db);
            batch.set(saleRef, sale);
            const instituteRef = doc(db, "tuitionInstitutes", classInfo.instituteId);
            const collectionName = getTeacherCollection(classInfo.teacherId);
            const teacherRef = doc(db, collectionName, classInfo.teacherId);

            batch.update(instituteRef, {
                'earnings.total': increment(instituteCommission),
                'earnings.available': increment(instituteCommission),
                [`teacherManualBalances.${classInfo.teacherId}.balance`]: increment(teacherCommission),
                [`teacherManualBalances.${classInfo.teacherId}.teacherName`]: teachers.find(t => t.id === classInfo.teacherId)?.name || 'Unknown',
            });
            batch.update(teacherRef, { [`manualEarningsByInstitute.${classInfo.instituteId}`]: increment(teacherCommission) });

            // Activity Log for Payment Revenue
            const logRef = doc(collection(db, 'activity_logs'));
            batch.set(logRef, {
                type: 'manual_payment_revenue',
                description: `Manual payment revenue recorded: ${classInfo.fee} LKR`,
                amount: classInfo.fee,
                instituteCommission,
                teacherCommission,
                initiatedBy: currentUser.uid,
                timestamp: new Date().toISOString(),
                relatedSalesId: newSaleId,
                instituteId: classInfo.instituteId
            });


            await batch.commit();
            addToast("Manual payment recorded successfully!", "success");
            return sale;
        } catch (e) {
            console.error("Failed to record manual payment:", e);
            addToast("Error recording payment.", "error");
            return null;
        }
    }, [currentUser, addToast, teachers, tuitionInstitutes]);
    const finishWeeklyClassSession = useCallback(async (classInfo: IndividualClass, nextDate?: string) => {
        const teacher = teachers.find(t => t.id === classInfo.teacherId);
        if (!teacher) { addToast("Teacher not found.", "error"); return; }
        if (!currentUser) return; // Should not happen

        // 1. Archive Attendance
        const sessionRef = doc(collection(db, 'class_sessions'));
        const attendanceSnapshot = classInfo.attendance || [];
        const sessionData = {
            classId: classInfo.id,
            teacherId: classInfo.teacherId,
            instituteId: classInfo.instituteId,
            date: classInfo.date,
            startTime: classInfo.startTime,
            endTime: classInfo.endTime,
            title: classInfo.title,
            attendanceCount: attendanceSnapshot.length,
            attendance: attendanceSnapshot,
            archivedAt: new Date().toISOString(),
            archivedBy: currentUser.uid
        };

        // 2. Calculate Next Date (Default +7 days if not provided)
        let nextSessionDate = nextDate;
        if (!nextSessionDate) {
            const current = new Date(classInfo.date);
            current.setDate(current.getDate() + 7);
            nextSessionDate = current.toISOString().split('T')[0];
        }

        // 3. Update Class Object
        const updatedClasses = teacher.individualClasses.map(c => {
            if (c.id === classInfo.id) {
                return {
                    ...c,
                    date: nextSessionDate!,
                    attendance: [], // Reset attendance
                    status: 'scheduled' as const
                };
            }
            return c;
        });

        try {
            const batch = writeBatch(db);
            batch.set(sessionRef, sessionData);

            const teacherRef = doc(db, 'teachers', teacher.id);
            batch.update(teacherRef, { individualClasses: updatedClasses });

            // Also log to activity_logs for visibility
            const logRef = doc(collection(db, 'activity_logs'));
            batch.set(logRef, {
                type: 'class_session_finished',
                description: `Weekly class '${classInfo.title}' session finished. Attendance archived. Next session: ${nextSessionDate}`,
                relatedId: classInfo.id.toString(),
                timestamp: new Date().toISOString(),
                initiatedBy: currentUser.uid
            });

            await batch.commit();
            addToast(`Session finished! Next class scheduled for ${nextSessionDate}`, "success");
        } catch (e) {
            console.error(e);
            addToast("Failed to finish session.", "error");
        }
    }, [teachers, currentUser, addToast]);


    const handleResetTeacherBalance = useCallback(async (instituteId: string, teacherId: string) => {
        try {
            const instituteRef = doc(db, "tuitionInstitutes", instituteId);
            const collectionName = getTeacherCollection(teacherId);
            const teacherRef = doc(db, collectionName, teacherId);
            const batch = writeBatch(db);

            batch.update(instituteRef, {
                [`teacherManualBalances.${teacherId}.balance`]: 0,
                [`teacherManualBalances.${teacherId}.lastReset`]: new Date().toISOString()
            });
            batch.update(teacherRef, {
                [`manualEarningsByInstitute.${instituteId}`]: 0
            });

            await batch.commit();
            addToast("Teacher's manual collection balance has been reset.", "success");
        } catch (e) {
            console.error("Failed to reset teacher balance:", e);
            addToast("Error resetting balance.", "error");
        }
    }, [addToast, getTeacherCollection]);

    const requestWithdrawal = useCallback(async (instituteId: string, amount: number) => {
        const institute = tuitionInstitutes.find(ti => ti.id === instituteId);
        if (!institute) { addToast("Institute not found.", "error"); return; }

        if (institute.earnings.available < amount) {
            addToast("Insufficient available balance.", "error");
            return;
        }

        if (amount < 1000) { // Minimum withdrawal amount
            addToast("Minimum withdrawal amount is LKR 1,000.", "error");
            return;
        }

        const withdrawalId = generateStandardId('WDR');
        const newWithdrawal: Withdrawal = {
            id: withdrawalId,
            userId: institute.userId,
            instituteId: institute.id, // Explicitly link to institute
            userType: 'institute',
            amount,
            requestedAt: new Date().toISOString(),
            status: 'pending',
            payoutDetails: institute.payoutDetails || undefined
        };

        try {
            await runTransaction(db, async (transaction) => {
                const instituteRef = doc(db, "tuitionInstitutes", instituteId);
                const reqRef = doc(db, "withdrawal_requests", withdrawalId);
                const instituteDoc = await transaction.get(instituteRef);

                if (!instituteDoc.exists()) throw new Error("Institute does not exist!");
                const freshData = instituteDoc.data() as TuitionInstitute;

                if (freshData.earnings.available < amount) {
                    throw new Error("Balance changed during transaction. Insufficient funds.");
                }

                // Deduct from available, Add to pending
                transaction.update(instituteRef, {
                    'earnings.available': increment(-amount),
                    'earnings.pending': increment(amount),
                    withdrawalHistory: arrayUnion(newWithdrawal)
                });

                transaction.set(reqRef, newWithdrawal);
            });

            addToast("Withdrawal requested successfully!", "success");
        } catch (e) {
            console.error("Withdrawal request failed:", e);
            addToast((e as Error).message || "Failed to process withdrawal request.", "error");
        }
    }, [tuitionInstitutes, addToast]);

    return {
        addTuitionInstitute,
        updateTuitionInstitute,
        handleSaveEvent,
        handleCancelEvent,
        handleToggleEventPublishState,
        addManagedTeacher: saveManagedTeacher,
        saveManagedTeacher,
        markAttendance,
        removeAttendance,
        recordManualPayment,
        handleResetTeacherBalance,
        deleteManagedTeacher,
        toggleTeacherPublishState,
        getTeacherCollection,
        finishWeeklyClassSession,
        requestWithdrawal
    };
};
