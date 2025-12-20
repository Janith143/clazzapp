
import { useCallback } from 'react';
import { User, IndividualClass, Sale, TuitionInstitute, Teacher, AttendanceRecord, Event } from '../types';
import { UIContextType } from '../contexts/UIContext';
import { db } from '../firebase';
// FIX: Update Firebase imports for v9 modular SDK
import { doc, setDoc, updateDoc, writeBatch, increment, arrayUnion, runTransaction, collection, getDoc } from 'firebase/firestore';
import { generateStandardId } from '../utils';

interface InstituteActionDeps {
    ui: UIContextType;
    currentUser: User | null;
    teachers: Teacher[];
    tuitionInstitutes: TuitionInstitute[];
    sales: Sale[];
}

export const useInstituteActions = (deps: InstituteActionDeps) => {
    const { ui, currentUser, teachers, tuitionInstitutes, sales } = deps;
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


    const markAttendance = useCallback(async (classId: number, student: User, paymentStatus: 'paid_at_venue' | 'unpaid' | 'paid', paymentRef?: string): Promise<boolean> => {
        const teacher = teachers.find(t => t.individualClasses.some(c => c.id === classId));
        if (!teacher) { addToast("Could not find class owner.", "error"); return false; }

        try {
            await runTransaction(db, async (transaction) => {
                const teacherRef = doc(db, 'teachers', teacher.id);
                const teacherDoc = await transaction.get(teacherRef);
                if (!teacherDoc.exists()) throw new Error("Teacher not found");

                const updatedTeacherData = teacherDoc.data() as Teacher;
                const classIndex = updatedTeacherData.individualClasses.findIndex(c => c.id === classId);
                if (classIndex === -1) throw new Error("Class not found on teacher profile");

                const classToUpdate = updatedTeacherData.individualClasses[classIndex];
                const existingAttendance = classToUpdate.attendance || [];

                // Prevent duplicate attendance
                if (existingAttendance.some(a => a.studentId === student.id)) {
                    addToast(`${student.firstName} is already marked as attended.`, "info");
                    return; // Abort transaction by not writing anything
                }

                const newRecord: AttendanceRecord = { studentId: student.id, studentName: `${student.firstName} ${student.lastName}`, studentAvatar: student.avatar, attendedAt: new Date().toISOString(), paymentStatus, paymentRef };

                classToUpdate.attendance = [...existingAttendance, newRecord];
                updatedTeacherData.individualClasses[classIndex] = classToUpdate;

                transaction.update(teacherRef, { individualClasses: updatedTeacherData.individualClasses });
            });
            addToast(`${student.firstName}'s attendance marked successfully.`, 'success');
            return true;
        } catch (e) {
            console.error("Failed to mark attendance:", e);
            addToast((e as Error).message || "Error marking attendance.", "error");
            return false;
        }
    }, [teachers, addToast]);

    const recordManualPayment = useCallback(async (classInfo: IndividualClass, student: User): Promise<Sale | null> => {
        if (!currentUser || !classInfo.instituteId) { addToast("Operation failed: missing user or institute context.", "error"); return null; }

        const newSaleId = generateStandardId('INV');
        const saleRef = doc(db, "sales", newSaleId);

        // Retrieve dynamic platform fee
        let platformFee = 50; // Default fallback
        try {
            const configDoc = await getDoc(doc(db, 'settings', 'clientAppConfig'));
            if (configDoc.exists()) {
                const configData = configDoc.data() as any; // Cast to any
                if (configData.financialSettings?.manualPaymentPlatformFee !== undefined) {
                    platformFee = configData.financialSettings.manualPaymentPlatformFee;
                }
            }
        } catch (err) {
            console.error("Failed to fetch platform fee config, using default:", err);
        }

        const institute = tuitionInstitutes.find(ti => ti.id === classInfo.instituteId);
        if (!institute) { addToast("Institute not found.", "error"); return null; }

        const instituteCommissionRate = institute.commissionRate;

        const instituteCommission = classInfo.fee * (instituteCommissionRate / 100) - platformFee;
        const teacherCommission = classInfo.fee - (classInfo.fee * (instituteCommissionRate / 100));

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
            const teacherRef = doc(db, "teachers", classInfo.teacherId);

            batch.update(instituteRef, {
                'earnings.total': increment(instituteCommission),
                'earnings.available': increment(instituteCommission),
                [`teacherManualBalances.${classInfo.teacherId}.balance`]: increment(teacherCommission),
                [`teacherManualBalances.${classInfo.teacherId}.teacherName`]: teachers.find(t => t.id === classInfo.teacherId)?.name || 'Unknown',
            });
            batch.update(teacherRef, { [`manualEarningsByInstitute.${classInfo.instituteId}`]: increment(teacherCommission) });

            await batch.commit();
            addToast("Manual payment recorded successfully!", "success");
            return sale;
        } catch (e) {
            console.error("Failed to record manual payment:", e);
            addToast("Error recording payment.", "error");
            return null;
        }
    }, [currentUser, addToast, teachers, tuitionInstitutes]);

    const handleResetTeacherBalance = useCallback(async (instituteId: string, teacherId: string) => {
        try {
            const instituteRef = doc(db, "tuitionInstitutes", instituteId);
            const teacherRef = doc(db, "teachers", teacherId);
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
    }, [addToast]);

    return {
        addTuitionInstitute,
        updateTuitionInstitute,
        handleSaveEvent,
        handleCancelEvent,
        handleToggleEventPublishState,
        markAttendance,
        recordManualPayment,
        handleResetTeacherBalance,
    };
};
