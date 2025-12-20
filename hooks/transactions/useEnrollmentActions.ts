import { useCallback } from 'react';
import { User, Sale, Course, IndividualClass, Quiz, Event, Teacher, TuitionInstitute, PaymentMethod } from '../../types';
import { UIContextType } from '../../contexts/UIContext';
import { NavigationContextType } from '../../contexts/NavigationContext';
import { db } from '../../firebase';
import { doc, runTransaction, increment } from 'firebase/firestore';
import { generateStandardId, sendPaymentConfirmation } from '../../utils';

interface EnrollmentActionDeps {
    currentUser: User | null;
    ui: UIContextType;
    nav: NavigationContextType;
    teachers: Teacher[];
    tuitionInstitutes: TuitionInstitute[];
}

export const useEnrollmentActions = (deps: EnrollmentActionDeps) => {
    const { currentUser, ui, nav, teachers, tuitionInstitutes } = deps;
    const { addToast, setModalState } = ui;
    const { handleNavigate } = nav;

    const handleEnroll = useCallback(async (
        item: Course | IndividualClass | Quiz | Event,
        type: 'course' | 'class' | 'quiz' | 'event',
        ignoreVerification = false,
        customPaymentAmount?: number,
        customPaymentDescription?: string,
        purchaseMetadata?: Sale['purchaseMetadata'],
        selectedMethod?: PaymentMethod
    ) => {
        const executeEnrollment = async (skipProfileCheck = false, updatedProfileData?: Partial<User>) => {
            const effectiveUser = currentUser ? { ...currentUser, ...updatedProfileData } : null;

            if (!effectiveUser) { setModalState({ name: 'login', preventRedirect: true }); return; }

            if (!skipProfileCheck) {
                const { email, contactNumber, address } = effectiveUser;
                const isProfileComplete = email && contactNumber && address?.line1 && address?.city;
                if (!isProfileComplete) {
                    let initialStep = 1;
                    if (email && contactNumber) initialStep = 2;
                    
                    addToast('Please complete your profile to proceed with payment.', 'info');
                    setModalState({ 
                        name: 'edit_student_profile', 
                        initialStep, 
                        onSaveAndContinue: (data) => executeEnrollment(true, data)
                    });
                    return;
                }
            }

            const newSaleId = generateStandardId('INV');
            const saleRef = doc(db, "sales", newSaleId);
            const displayItemName = customPaymentDescription || item.title;
    
            const saleData: Partial<Sale> = { 
                id: newSaleId, studentId: effectiveUser.id, itemId: item.id, itemType: type, itemName: displayItemName, 
                totalAmount: 0, amountPaidFromBalance: 0, saleDate: new Date().toISOString(), 
                currency: 'LKR', status: 'completed', itemSnapshot: item,
            };
    
            if (purchaseMetadata) saleData.purchaseMetadata = purchaseMetadata;
            if (type === 'event') saleData.instituteId = (item as Event).organizerId; 
            else {
                if ('teacherId' in item) saleData.teacherId = item.teacherId;
                if ('instituteId' in item && item.instituteId) saleData.instituteId = item.instituteId;
            }
            
            const sale: Sale = saleData as Sale;
            
            let finalFee = 0;
            if (customPaymentAmount !== undefined) finalFee = customPaymentAmount;
            else finalFee = (type === 'event') ? (item as Event).tickets.price : ('fee' in item) ? (item as Course | IndividualClass | Quiz).fee : 0;
            
            if (type === 'class' && (item as IndividualClass).paymentMethod === 'manual') finalFee = 0;
    
            try {
                await runTransaction(db, async (transaction) => {
                    const studentDoc = await transaction.get(doc(db, "users", effectiveUser.id));
                    if (!studentDoc.exists()) throw new Error("Student document not found!");
                    const studentData = studentDoc.data() as User;
                    
                    if (type === 'class' && (item as IndividualClass).isFreeSlot) {
                        const teacherRef = doc(db, 'teachers', (item as IndividualClass).teacherId);
                        const teacherDoc = await transaction.get(teacherRef);
                        if (teacherDoc.exists()) {
                            const teacherData = teacherDoc.data() as Teacher;
                            const classInDb = teacherData.individualClasses.find(c => c.id === item.id);
                            if (!classInDb || !classInDb.isPublished) throw new Error("This 1-on-1 slot has just been booked by someone else.");
                            const updatedClasses = teacherData.individualClasses.map(c => c.id === item.id ? { ...c, isPublished: false } : c);
                            transaction.update(teacherRef, { individualClasses: updatedClasses });
                        } else throw new Error("Teacher not found.");
                    }
    
                    const balanceToApply = Math.min(studentData.accountBalance, finalFee);
                    sale.amountPaidFromBalance = balanceToApply;
                    sale.totalAmount = finalFee - balanceToApply;
    
                    if (sale.totalAmount > 0) { 
                        sale.status = 'hold'; 
                        transaction.set(saleRef, sale); 
                    } else {
                        sale.status = 'completed';
                        sale.paymentMethod = (type === 'class' && (item as IndividualClass).paymentMethod === 'manual') ? 'manual_at_venue' : 'balance';
                        
                        const saleValue = sale.amountPaidFromBalance;
                        if (saleValue > 0) {
                            let platformComm = 0, teacherComm = 0, instituteComm = 0;
                            if (sale.instituteId) {
                                const institute = tuitionInstitutes.find(ti => ti.id === sale.instituteId);
                                if (institute) {
                                    platformComm = saleValue * (institute.platformMarkupRate / 100);
                                    const instituteGross = saleValue * (institute.commissionRate / 100);
                                    instituteComm = instituteGross - platformComm;
                                    teacherComm = saleValue - instituteGross;
                                }
                            } else if (sale.teacherId) {
                                const teacher = teachers.find(t => t.id === sale.teacherId);
                                if (teacher) {
                                    platformComm = saleValue * (teacher.commissionRate / 100);
                                    teacherComm = saleValue - platformComm;
                                }
                            }
                            sale.platformCommission = platformComm;
                            sale.teacherCommission = teacherComm;
                            sale.instituteCommission = instituteComm;
                            if (teacherComm > 0 && sale.teacherId) transaction.update(doc(db, 'teachers', sale.teacherId), { 'earnings.total': increment(teacherComm) });
                            if (instituteComm > 0 && sale.instituteId) transaction.update(doc(db, 'tuitionInstitutes', sale.instituteId), { 'earnings.total': increment(instituteComm) });
                        }
                        transaction.set(saleRef, sale);
                        if (balanceToApply > 0) transaction.update(doc(db, "users", effectiveUser.id), { accountBalance: studentData.accountBalance - balanceToApply });
                    }
                });
    
                if (sale.totalAmount > 0) {
                    handleNavigate({ 
                        name: 'payment_redirect', 
                        payload: { 
                            type: 'enrollment', 
                            item, 
                            sale, 
                            updatedUser: effectiveUser as User,
                            selectedMethod 
                        } 
                    });
                } else {
                    addToast(`Successfully registered for ${item.title}!`, 'success');
                    if (finalFee > 0) sendPaymentConfirmation(effectiveUser, finalFee, sale.itemName, sale.id);
                }
            } catch (e) { console.error(e); addToast((e as Error).message || "Unable to enroll.", "error"); }
        };
        await executeEnrollment();
    }, [currentUser, addToast, setModalState, handleNavigate, teachers, tuitionInstitutes]);

    return { handleEnroll };
};