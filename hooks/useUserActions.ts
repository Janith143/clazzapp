import { useCallback } from 'react';
import { User, Teacher, TuitionInstitute } from '../types';
import { UIContextType } from '../contexts/UIContext';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, writeBatch, arrayUnion, arrayRemove, runTransaction, increment } from 'firebase/firestore';
import { sendNotification } from '../utils';

const ADMIN_EMAIL = 'admin@clazz.lk'; // TODO: Move to a secure configuration

interface UserActionDeps {
    currentUser: User | null;
    ui: UIContextType;
    users: User[];
}

export const useUserActions = (deps: UserActionDeps) => {
    const { currentUser, ui, users } = deps;
    const { addToast, setModalState } = ui;
    
    const addUser = useCallback(async (user: User) => {
        try {
            const userWithBalance = {
                ...user,
                referralBalance: { total: 0, withdrawn: 0, available: 0 }
            };
            await setDoc(doc(db, "users", user.id), userWithBalance);
            
            // Admin Notification
            const subject = `New ${user.role} Registration: ${user.firstName} ${user.lastName}`;
            const approvalMessage = (user.role === 'teacher' || user.role === 'tuition_institute') 
                ? "<p>This account is now pending your approval in the admin dashboard.</p>"
                : "";
            const htmlBody = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <p>A new user has registered on Clazz.lk.</p>
                    <ul>
                        <li><strong>Name:</strong> ${user.firstName} ${user.lastName}</li>
                        <li><strong>Role:</strong> ${user.role}</li>
                        <li><strong>Email:</strong> ${user.email}</li>
                        <li><strong>User ID:</strong> ${user.id}</li>
                    </ul>
                    ${approvalMessage}
                </div>
            `;
            await sendNotification({ email: ADMIN_EMAIL }, subject, htmlBody);

        } catch (e) {
            console.error(e);
            addToast("Failed to save user profile.", "error");
            throw e; 
        }
    }, [addToast]);
    
    const addTeacher = useCallback(async (teacher: Teacher) => {
        await setDoc(doc(db, "teachers", teacher.id), teacher);
        
        // Affiliate Referrer Notification
        const teacherUser = users.find(u => u.id === teacher.userId);
        if (teacherUser?.referrerId) {
            const referrer = users.find(u => u.id === teacherUser.referrerId);
            if (referrer) {
                const subject = "A new teacher joined using your referral code!";
                const htmlBody = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <p>Hi ${referrer.firstName},</p>
                        <p>Great news! A new teacher, <strong>${teacher.name}</strong>, has registered on Clazz.lk using your referral code.</p>
                        <p>Once their account is approved and they start generating platform income, you will begin earning commissions.</p>
                    </div>`;
                await sendNotification({ email: referrer.email }, subject, htmlBody);
            }
        }
    }, [users]);
    
    const addTuitionInstitute = useCallback(async (institute: TuitionInstitute) => {
        await setDoc(doc(db, "tuitionInstitutes", institute.id), institute);
    }, []);

    const handleUpdateUser = useCallback(async (updatedUser: Partial<User> & { id: string }) => {
        try {
            await updateDoc(doc(db, "users", updatedUser.id), updatedUser);
        } catch(e) {
             console.error("Error updating user profile:", e);
             addToast("Error updating profile.", "error");
             throw e;
        }
    }, [addToast]);
    
    const handleUserVerification = useCallback(async (updates: Partial<User>) => {
        if (!currentUser) return;
        try {
            await updateDoc(doc(db, "users", currentUser.id), updates);
        } catch (e) {
            console.error("Error updating user verification:", e);
        }
    }, [currentUser]);

    const handleFollowToggle = useCallback(async (teacherId: string) => {
        if (!currentUser) {
            addToast('Please log in to follow a teacher.', 'info');
            setModalState({ name: 'login' });
            return;
        }
        const userRef = doc(db, "users", currentUser.id);
        const teacherRef = doc(db, "teachers", teacherId);
        const isFollowing = currentUser.followingTeacherIds?.includes(teacherId);
        
        const batch = writeBatch(db);
        if (isFollowing) {
            batch.update(userRef, { followingTeacherIds: arrayRemove(teacherId) });
            batch.update(teacherRef, { followers: arrayRemove(currentUser.id) });
        } else {
            batch.update(userRef, { followingTeacherIds: arrayUnion(teacherId) });
            batch.update(teacherRef, { followers: arrayUnion(currentUser.id) });
        }
        await batch.commit();
        addToast(isFollowing ? 'Unfollowed teacher.' : 'Now following teacher!', 'success');
    }, [currentUser, addToast, setModalState]);
    
    const handleMarkAllAsRead = useCallback(async () => {
        if (!currentUser?.notifications?.length) return;
        const newNotifications = currentUser.notifications.map(n => ({ ...n, isRead: true }));
        await updateDoc(doc(db, 'users', currentUser.id), { notifications: newNotifications });
    }, [currentUser]);

    const handleRedeemReferralEarnings = useCallback(async (year: number, month: number) => {
        if (!currentUser) { addToast("You must be logged in.", "error"); return; }
        const userRef = doc(db, "users", currentUser.id);
        try {
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw new Error("User not found.");
                const userData = userDoc.data() as User;
                const monthlyEarnings = userData.monthlyReferralEarnings || [];
                const earningIndex = monthlyEarnings.findIndex(e => e.year === year && e.month === month);
                if (earningIndex === -1) throw new Error("Earning record for that month not found.");
                if (monthlyEarnings[earningIndex].status !== 'pending') throw new Error("Earnings for this month have already been processed.");
                const earningAmount = monthlyEarnings[earningIndex].earnings;
                monthlyEarnings[earningIndex].status = 'processed';
                const newReferralBalance = {
                    total: userData.referralBalance?.total || 0,
                    withdrawn: userData.referralBalance?.withdrawn || 0,
                    available: (userData.referralBalance?.available || 0) + earningAmount,
                };
                transaction.update(userRef, { monthlyReferralEarnings: monthlyEarnings, referralBalance: newReferralBalance });
            });
            addToast("Monthly earnings added to your available balance!", "success");
        } catch (e) {
            console.error(e);
            addToast((e as Error).message, "error");
        }
    }, [currentUser, addToast]);

    return {
        addUser,
        addTeacher,
        addTuitionInstitute,
        handleUpdateUser,
        handleUserVerification,
        handleFollowToggle,
        handleMarkAllAsRead,
        handleRedeemReferralEarnings,
    };
};
