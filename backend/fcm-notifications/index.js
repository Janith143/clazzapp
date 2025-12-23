
// This is the correct structure for a Google Cloud Function (2nd Gen) using Express.
// It EXPORTS the app; it does NOT listen on a port.
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
setGlobalOptions({ region: "asia-south1" });
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// The SDK will automatically use Google Application Default Credentials
// when deployed on Google Cloud services like Cloud Run.
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            projectId: process.env.GCP_PROJECT || 'clazz2-new', // Updated to correct project ID
        });
        console.log('Firebase Admin SDK initialized successfully.');
    } catch (error) {
        console.error('Firebase Admin SDK initialization error:', error);
    }
}

const { getFirestore } = require('firebase-admin/firestore'); // Import getFirestore

const db = getFirestore('clazzdb2'); // Use named database
const messaging = admin.messaging();
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.status(200).send('FCM push notification service is running.');
});

// Main endpoint to send notifications
app.post('/send-fcm-push', async (req, res) => {
    const { teacherId, content, target } = req.body;

    if (!teacherId || !content || !target) {
        return res.status(400).send({ success: false, message: 'Missing required fields: teacherId, content, target.' });
    }

    try {
        // 1. Get Teacher Info
        const teacherDoc = await db.collection('teachers').doc(teacherId).get();
        if (!teacherDoc.exists) {
            return res.status(404).send({ success: false, message: 'Teacher not found.' });
        }
        const teacher = teacherDoc.data();

        // 2. Get Target Student IDs
        let studentIds = [];
        if (target === 'all_followers') {
            studentIds = teacher.followers || [];
        } else if (target.type === 'class' && target.classId) {
            const salesSnapshot = await db.collection('sales')
                .where('itemId', '==', target.classId)
                .where('itemType', '==', 'class')
                .where('status', '==', 'completed')
                .get();
            studentIds = salesSnapshot.docs.map(doc => doc.data().studentId);
        }

        if (studentIds.length === 0) {
            return res.status(200).send({ success: true, message: 'No recipients found for this notification.' });
        }

        const uniqueStudentIds = [...new Set(studentIds)];

        // 3. Save Notification to 'notifications' collection
        const notificationRef = db.collection('notifications').doc();
        const newNotification = {
            id: notificationRef.id,
            teacherId: teacher.id,
            teacherName: teacher.name,
            teacherAvatar: teacher.avatar,
            content,
            target,
            createdAt: new Date().toISOString(),
            recipientCount: uniqueStudentIds.length,
        };
        await notificationRef.set(newNotification);

        // 4. Get FCM Tokens and update user notifications in batches
        const allTokens = [];
        const batch = db.batch();
        const chunkSize = 30; // Firestore 'in' query limit

        for (let i = 0; i < uniqueStudentIds.length; i += chunkSize) {
            const chunk = uniqueStudentIds.slice(i, i + chunkSize);
            const usersSnapshot = await db.collection('users').where('id', 'in', chunk).get();

            usersSnapshot.forEach(userDoc => {
                const user = userDoc.data();
                if (user.fcmTokens && user.fcmTokens.length > 0) {
                    allTokens.push(...user.fcmTokens);
                }
                // Add notification reference to user's profile
                const userRef = db.collection('users').doc(user.id);
                batch.update(userRef, {
                    notifications: admin.firestore.FieldValue.arrayUnion({
                        notificationId: newNotification.id,
                        isRead: false
                    })
                });
            });
        }
        await batch.commit();

        if (allTokens.length === 0) {
            return res.status(200).send({ success: true, message: 'Notification saved, but no registered devices found to send a push notification.' });
        }

        const uniqueTokens = [...new Set(allTokens)];
        const clickLink = `https://clazz.lk/?teacherId=${teacher.id}&notification_id=${newNotification.id}`;
        const iconUrl = teacher.avatar || 'https://clazz.lk/Logo3.png';

        // 5. Send Push Notifications via FCM
        const messagePayload = {
            notification: {
                title: `New message from ${teacher.name}`,
                body: content,
            },
            data: {
                // Specific fields to trigger client-side popup logic
                type: 'teacher_notification',
                title: `Message from ${teacher.name}`,
                message: content,
                url: clickLink,
                teacherId: teacher.id,
                notificationId: newNotification.id
            },
            webpush: {
                notification: {
                    icon: iconUrl,
                    requireInteraction: true,
                    // fcm_options link is the standard way for background clicks to open a URL
                    fcm_options: {
                        link: clickLink
                    }
                }
            },
            tokens: uniqueTokens,
        };

        const response = await messaging.sendEachForMulticast(messagePayload);

        console.log(`Successfully sent ${response.successCount} messages.`);

        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(uniqueTokens[idx]);
                }
            });
            console.log('List of tokens that caused failures:', failedTokens);
        }

        res.status(200).send({ success: true, message: `Notification sent to ${response.successCount} devices.` });

    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).send({ success: false, message: 'An internal error occurred: ' + error.message });
    }
});

// Export the app for Cloud Functions (Firebase)
exports.fcmNotifications = onRequest({ cors: true }, app);

// Start the server directly for Cloud Run (Docker)
// This check ensures we don't conflict when running in Firebase environment
// Start the server directly for Cloud Run (Docker)
// This check ensures we don't conflict when running in Firebase environment
if (require.main === module) {
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}
