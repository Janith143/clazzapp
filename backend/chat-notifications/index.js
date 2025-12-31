const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
setGlobalOptions({ region: "asia-south1" });
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore"); // Import correctly
const { logger } = require("firebase-functions");

if (!admin.apps.length) admin.initializeApp();

const db = getFirestore('clazzdb2'); // Initialize correctly

// Hybrid handler that works for both Firebase SDK and Raw CloudEvents
const chatNotificationHandler = async (event) => {
    let chatId;
    let messageData;

    try {
        // CASE 1: Firebase SDK (event.data is a DocumentSnapshot)
        if (event.params && event.params.chatId && event.data && typeof event.data.data === 'function') {
            chatId = event.params.chatId;
            messageData = event.data.data();
        }
        // CASE 2: Raw CloudEvent (deployed via gcloud run)
        else if (event.subject) {
            // Subject format: documents/supportChats/{chatId}/messages/{messageId}
            const match = event.subject.match(/supportChats\/(.*?)\/messages\/(.*?)$/);
            if (match) {
                chatId = match[1];
                const messageId = match[2];
                // Fetch fresh data from Firestore because raw event.data might be protobuf/binary
                const msgDoc = await db
                    .collection('supportChats')
                    .doc(chatId)
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

        if (!chatId || !messageData) {
            console.log("Could not extract chatId or messageData from event.");
            return;
        }

        // Only send notification if the message is from an 'agent'
        if (messageData.sender !== 'agent') {
            return;
        }

        // Fetch the parent chat document to get the FCM token
        const chatDoc = await db.collection('supportChats').doc(chatId).get();
        if (!chatDoc.exists) {
            logger.warn(`Chat document ${chatId} not found.`);
            return;
        }

        const chatData = chatDoc.data();
        const fcmToken = chatData.fcmToken;

        if (!fcmToken) {
            logger.info(`No FCM token found for chat ${chatId}. Skipping notification.`);
            return;
        }

        const clickLink = `https://clazz.lk/?action=open_chat&chatId=${chatId}`;

        const payload = {
            token: fcmToken,
            data: {
                type: 'chat_reply',
                chatId: chatId,
                url: clickLink,
                title: "Support Agent",
                body: messageData.text || "You received a new message.",
                click_action: "FLUTTER_NOTIFICATION_CLICK"
            },
            webpush: {
                notification: {
                    icon: 'https://clazz.lk/Logo3.png',
                    requireInteraction: true,
                    fcm_options: {
                        link: clickLink
                    }
                }
            },
        };

        const response = await admin.messaging().send(payload);
        logger.log('Successfully sent chat notification:', response);

    } catch (error) {
        logger.error("Error sending chat push notification:", error);
    }
};

// Export for Firebase Functions (CLI deployment)
exports.sendChatNotification = onDocumentCreated({
    document: "supportChats/{chatId}/messages/{messageId}",
    database: "clazzdb2"
}, chatNotificationHandler);

// Export for Cloud Run / Functions Framework (Manual gcloud deployment)
exports.sendChatNotificationRaw = chatNotificationHandler;
