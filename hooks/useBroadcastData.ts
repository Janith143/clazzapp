import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, limit } from 'firebase/firestore';
import { BroadcastGroup, BroadcastMessage } from '../types/broadcast';

export const useBroadcastData = (teacherId?: string, groupId?: string, studentId?: string) => {
    const [groups, setGroups] = useState<BroadcastGroup[]>([]);
    const [messages, setMessages] = useState<BroadcastMessage[]>([]);
    const [unreadTotal, setUnreadTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    // Fetch Groups (Teacher or Student context)
    useEffect(() => {
        if (!teacherId && !studentId) {
            // If we are just fetching messages, we don't need groups
            return;
        }

        setLoading(true);
        let unsubscribe: () => void;

        if (teacherId) {
            // Teacher View: Get groups owned by teacher
            const q = query(collection(db, 'broadcast_groups'), where('teacherId', '==', teacherId), orderBy('lastMessageAt', 'desc'));
            unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedGroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BroadcastGroup));
                setGroups(fetchedGroups);
                setLoading(false);
            }, (err) => {
                console.error("Error fetching teacher groups:", err);
                setLoading(false);
            });
        } else if (studentId) {
            // Student View: Get groups student is member of
            const memberQ = query(collection(db, 'broadcast_members'), where('studentId', '==', studentId));
            unsubscribe = onSnapshot(memberQ, async (snapshot) => {
                if (snapshot.empty) {
                    setGroups([]);
                    setUnreadTotal(0);
                    setLoading(false);
                    return;
                }

                const memberData = snapshot.docs.map(d => d.data());
                const groupIds = memberData.map(m => m.groupId);
                const readMap = new Map();
                memberData.forEach(m => readMap.set(m.groupId, m.lastReadMessageId));

                try {
                    const groupPromises = groupIds.map(gid => getDoc(doc(db, 'broadcast_groups', gid)));
                    const groupDocs = await Promise.all(groupPromises);

                    let count = 0;
                    const fetchedGroups = groupDocs
                        .filter(d => d.exists())
                        .map(d => {
                            const data = d.data() as any;
                            const lastRead = readMap.get(d.id);
                            // Unread if group has a message AND (never read OR last read != last message)
                            const hasUnread = !!(data.lastMessageId && data.lastMessageId !== lastRead);
                            if (hasUnread) count++;
                            return { id: d.id, ...data, hasUnread } as BroadcastGroup;
                        });

                    fetchedGroups.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
                    setGroups(fetchedGroups);
                    setUnreadTotal(count);
                } catch (err) {
                    console.error("Error fetching joined groups:", err);
                }
                setLoading(false);
            });
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [teacherId, studentId]);

    // Fetch Messages (Chat context)
    useEffect(() => {
        if (!groupId) return;

        setLoading(true);
        const q = query(
            collection(db, `broadcast_groups/${groupId}/messages`),
            orderBy('createdAt', 'asc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BroadcastMessage));
            setMessages(msgs);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching messages:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [groupId]);

    return { groups, messages, unreadTotal, loading };
};
