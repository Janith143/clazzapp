import { useState, useCallback } from 'react';
import { db, storage } from '../firebase'; // Adjust imports 
import { collection, addDoc, doc, setDoc, updateDoc, serverTimestamp, increment, deleteDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { BroadcastGroup, BroadcastMessage } from '../types/broadcast';
import { useUI } from '../contexts/UIContext';

export const useBroadcastActions = () => {
    const { addToast } = useUI();
    const [loading, setLoading] = useState(false);

    // Create a new Broadcast Group
    const createGroup = useCallback(async (teacherId: string, teacherName: string, name: string, description?: string, bannerFile?: File) => {
        setLoading(true);
        try {
            const inviteCode = uuidv4().substring(0, 8).toUpperCase();
            let bannerImage = undefined;

            if (bannerFile) {
                const storageRef = ref(storage, `broadcast_banners/${uuidv4()}_${bannerFile.name}`);
                await uploadBytes(storageRef, bannerFile);
                bannerImage = await getDownloadURL(storageRef);
            }

            const newGroup: Omit<BroadcastGroup, 'id'> = {
                teacherId,
                teacherName,
                name,
                description: description || null,
                inviteCode,
                memberCount: 0,
                createdAt: new Date().toISOString(),
                bannerImage: bannerImage || null,
                lastMessagePreview: 'Group created',
                lastMessageAt: new Date().toISOString()
            };

            await addDoc(collection(db, 'broadcast_groups'), newGroup);
            addToast("Broadcast group created successfully!", "success");
            return true;
        } catch (error) {
            console.error("Error creating group:", error);
            addToast("Failed to create group.", "error");
            return false;
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    // Send a Message (Teacher Only)
    const postMessage = useCallback(async (groupId: string, teacherId: string, content: string, file?: File) => {
        setLoading(true);
        try {
            let attachmentUrl = undefined;
            let type: 'text' | 'image' | 'file' = 'text';

            if (file) {
                const storageRef = ref(storage, `broadcast_attachments/${groupId}/${uuidv4()}_${file.name}`);
                await uploadBytes(storageRef, file);
                attachmentUrl = await getDownloadURL(storageRef);
                type = file.type.startsWith('image/') ? 'image' : 'file';
            }

            const newMessage: Omit<BroadcastMessage, 'id'> = {
                groupId,
                content,
                type,
                attachmentUrl: attachmentUrl || null,
                attachmentName: file?.name || null,
                createdAt: new Date().toISOString()
            };

            const msgRef = await addDoc(collection(db, `broadcast_groups/${groupId}/messages`), newMessage);

            // Update Group Metadata
            await updateDoc(doc(db, 'broadcast_groups', groupId), {
                lastMessageId: msgRef.id,
                lastMessagePreview: type === 'text' ? content.substring(0, 50) : `[${type}]`,
                lastMessageAt: new Date().toISOString()
            });

            return true;
        } catch (error) {
            console.error("Error sending message:", error);
            addToast("Failed to send message.", "error");
            return false;
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    // Join Group (Student)
    const joinGroup = useCallback(async (studentId: string, inviteCode: string) => {
        setLoading(true);
        try {
            // Find group by invite code
            const q = query(collection(db, 'broadcast_groups'), where('inviteCode', '==', inviteCode), limit(1));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                addToast("Invalid invite code.", "error");
                return false;
            }

            const groupDoc = querySnapshot.docs[0];
            const groupId = groupDoc.id;

            // Check if already member
            const membershipRef = doc(db, 'broadcast_members', `${groupId}_${studentId}`);
            const membershipSnap = await getDocs(query(collection(db, 'broadcast_members'), where('groupId', '==', groupId), where('studentId', '==', studentId)));

            if (!membershipSnap.empty) {
                addToast("You are already a member of this group.", "info");
                return groupId;
            }

            await setDoc(membershipRef, {
                groupId,
                studentId,
                joinedAt: new Date().toISOString(),
                notificationsEnabled: true
            });

            // Increment count
            await updateDoc(groupDoc.ref, {
                memberCount: increment(1)
            });

            addToast("Joined group successfully!", "success");
            return groupId;
        } catch (error) {
            console.error("Error joining group:", error);
            addToast("Failed to join group.", "error");
            return false;
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    const getGroupByInviteCode = useCallback(async (inviteCode: string) => {
        setLoading(true);
        try {
            const q = query(collection(db, 'broadcast_groups'), where('inviteCode', '==', inviteCode), limit(1));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) return null;
            return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as BroadcastGroup;
        } catch (error) {
            console.error("Error fetching group by code:", error);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const markGroupAsRead = useCallback(async (studentId: string, groupId: string, lastMessageId: string) => {
        try {
            const membershipRef = doc(db, 'broadcast_members', `${groupId}_${studentId}`);
            await updateDoc(membershipRef, {
                lastReadMessageId: lastMessageId
            });
            return true;
        } catch (error) {
            console.error("Error marking group as read:", error);
            return false;
        }
    }, []);

    return {
        createGroup,
        postMessage,
        joinGroup,
        getGroupByInviteCode,
        markGroupAsRead,
        loading
    };
};
