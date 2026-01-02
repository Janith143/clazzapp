const { onDocumentCreated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
setGlobalOptions({ region: "asia-south1" });
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");

if (!admin.apps.length) admin.initializeApp();

const db = getFirestore('clazzdb2');

// --- Helper: Subscribe/Unsubscribe Tokens ---
const manageSubscription = async (tokens, topic, action) => {
    if (!tokens || tokens.length === 0) return;
    try {
        if (action === 'subscribe') {
            await admin.messaging().subscribeToTopic(tokens, topic);
            logger.info(`Subscribed ${tokens.length} tokens to ${topic}`);
        } else {
            await admin.messaging().unsubscribeFromTopic(tokens, topic);
            logger.info(`Unsubscribed ${tokens.length} tokens from ${topic}`);
        }
    } catch (e) {
        logger.error(`Error managing subscription for ${topic}:`, e);
    }
};

const broadcastNotificationHandler = async (event) => {
    let groupId;
    let messageData;

    try {
        // CASE 1: Firebase SDK (event.data is a DocumentSnapshot)
        if (event.params && event.params.groupId && event.data && typeof event.data.data === 'function') {
            groupId = event.params.groupId;
            messageData = event.data.data();
        }
        // CASE 2: Raw CloudEvent
        else if (event.subject) {
            const match = event.subject.match(/broadcast_groups\/(.*?)\/messages\/(.*?)$/);
            if (match) {
                groupId = match[1];
                const messageId = match[2];
                const msgDoc = await db
                    .collection('broadcast_groups')
                    .doc(groupId)
                    .collection('messages')
                    .doc(messageId)
                    .get();

                if (!msgDoc.exists) {
                    console.log("Document does not exist (raw mode).");
                    return;
                }
                messageData = msgDoc.data();
            }
        }

        if (!groupId || !messageData) {
            console.log("Could not extract groupId or messageData from event.");
            return;
        }

        // Get Group Details for Name
        const groupDoc = await db.collection('broadcast_groups').doc(groupId).get();
        if (!groupDoc.exists) {
            logger.warn(`Group document ${groupId} not found.`);
            return;
        }

        const groupData = groupDoc.data();
        const groupName = groupData.name || "Broadcast Group";
        const topic = `group_${groupId}`;

        // Determine Notification Body
        let body = messageData.content || "New message";
        if (messageData.type === 'image') body = "📷 [Photo]";
        if (messageData.type === 'file') body = `kb [File] ${messageData.attachmentName || ''}`;
        if (messageData.content && messageData.type !== 'text') {
            body = messageData.content;
        }

        const clickLink = `https://clazz.lk/dashboard?tab=groups&groupId=${groupId}`;

        const payload = {
            topic: topic,
            data: {
                type: 'broadcast_message',
                groupId: groupId,
                url: clickLink,
                title: groupName,
                body: body,
                click_action: "FLUTTER_NOTIFICATION_CLICK"
            },
            notification: {
                title: groupName,
                body: body,
            },
            webpush: {
                notification: {
                    title: groupName,
                    body: body,
                    icon: 'https://clazz.lk/Logo3.png',
                    requireInteraction: true,
                    fcm_options: {
                        link: clickLink
                    }
                }
            },
        };

        const response = await admin.messaging().send(payload);
        logger.log(`Successfully sent broadcast notification to topic ${topic}:`, response);

    } catch (error) {
        logger.error("Error sending broadcast notification:", error);
    }
};

exports.sendBroadcastNotification = onDocumentCreated({
    document: "broadcast_groups/{groupId}/messages/{messageId}",
    database: "clazzdb2"
}, broadcastNotificationHandler);


// --- Member Subscription Triggers ---

exports.subscribeBroadcastMember = onDocumentCreated({
    document: "broadcast_members/{memberId}",
    database: "clazzdb2"
}, async (event) => {
    const data = event.data.data();
    if (!data) return;

    const { studentId, groupId } = data;
    if (!studentId || !groupId) return;

    // Get user tokens
    const userDoc = await db.collection('users').doc(studentId).get();
    if (!userDoc.exists) return;

    const userData = userDoc.data();
    // Combine legacy token and array
    const tokens = new Set();
    if (userData.fcmToken) tokens.add(userData.fcmToken);
    if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
        userData.fcmTokens.forEach(t => tokens.add(t));
    }

    if (tokens.size > 0) {
        const tokenArray = Array.from(tokens);
        await manageSubscription(tokenArray, `group_${groupId}`, 'subscribe');
    }
});

exports.unsubscribeBroadcastMember = onDocumentDeleted({
    document: "broadcast_members/{memberId}",
    database: "clazzdb2"
}, async (event) => {
    const data = event.data.data(); // onDeleted has data in event.data
    // In v2 cloud functions, event.data is the snapshot.
    if (!data) return;

    const { studentId, groupId } = data;
    if (!studentId || !groupId) return;

    const userDoc = await db.collection('users').doc(studentId).get();
    if (!userDoc.exists) return;

    const userData = userDoc.data();
    const tokens = new Set();
    if (userData.fcmToken) tokens.add(userData.fcmToken);
    if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
        userData.fcmTokens.forEach(t => tokens.add(t));
    }

    if (tokens.size > 0) {
        const tokenArray = Array.from(tokens);
        await manageSubscription(tokenArray, `group_${groupId}`, 'unsubscribe');
    }
});
