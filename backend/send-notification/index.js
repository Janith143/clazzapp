// This is the correct structure for a Google Cloud Function (2nd Gen) using Express.
// It EXPORTS the app; it does NOT listen on a port.
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
setGlobalOptions({ region: "asia-south1" });
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fetch = require('node-fetch');
const admin = require('firebase-admin');

// Initialize Admin SDK once
if (!admin.apps.length) {
    admin.initializeApp();
}
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('clazzdb2');
const auth = admin.auth();

const app = express();

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));
app.use(express.json());

// Helper to get config from Firestore or Env
async function getConfig() {
    try {
        const configDoc = await db.collection('settings').doc('system_config').get();
        if (configDoc.exists) {
            return { ...process.env, ...configDoc.data() };
        }
    } catch (error) {
        console.error("Error fetching system_config:", error);
    }
    return process.env;
}

// Health check endpoint
app.get('/', (req, res) => {
    res.status(200).send('Notification service is running.');
});

// Main endpoint: generic notification (email + SMS)
app.post('/', async (req, res) => {
    const { toEmail, toSms, subject, htmlBody, smsMessage } = req.body;
    const config = await getConfig();

    const emailPromise = async () => {
        if (!toEmail || !subject || !htmlBody) return { service: 'email', status: 'skipped', reason: 'Missing parameters.' };

        const { EMAIL_USER, EMAIL_PASS } = config;
        if (!EMAIL_USER || !EMAIL_PASS) {
            console.error('Email environment variables/config not set.');
            return { service: 'email', status: 'failed', error: 'Server not configured for emails.' };
        }

        const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: EMAIL_USER, pass: EMAIL_PASS } });
        try {
            await transporter.sendMail({ from: `"Clazz.lk" <${EMAIL_USER}>`, to: toEmail, subject, html: htmlBody });
            return { service: 'email', status: 'success' };
        } catch (error) {
            console.error('Nodemailer Error:', error);
            return { service: 'email', status: 'failed', error: error.message };
        }
    };

    const smsPromise = async () => {
        if (!toSms || !smsMessage) return { service: 'sms', status: 'skipped', reason: 'Missing parameters.' };

        const { NOTIFY_LK_USER_ID, NOTIFY_LK_API_KEY, NOTIFY_LK_SENDER_ID } = config;
        if (!NOTIFY_LK_USER_ID || !NOTIFY_LK_API_KEY || !NOTIFY_LK_SENDER_ID) {
            console.error('SMS environment variables/config not set.');
            return { service: 'sms', status: 'failed', error: 'Server not configured for SMS.' };
        }

        // Logic from legacy: Remove '+' for Notify.lk
        const notifyNumber = toSms.replace(/^\+/, '');
        const url = `https://app.notify.lk/api/v1/send?user_id=${NOTIFY_LK_USER_ID}&api_key=${NOTIFY_LK_API_KEY}&sender_id=${encodeURIComponent(NOTIFY_LK_SENDER_ID)}&to=${notifyNumber}&message=${encodeURIComponent(smsMessage)}`;

        try {
            const response = await fetch(url);
            const jsonResponse = await response.json();
            if (jsonResponse.status !== 'success') throw new Error(jsonResponse.message || 'Notify.lk API error.');
            return { service: 'sms', status: 'success' };
        } catch (error) {
            console.error('Notify.lk Error:', error);
            return { service: 'sms', status: 'failed', error: error.message };
        }
    };

    try {
        const results = await Promise.all([emailPromise(), smsPromise()]);
        res.status(200).send({ success: true, results });
    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
});

// OTP generation endpoint
app.post('/send-otp', async (req, res) => {
    const { phoneNumber } = req.body;
    console.log('Received phoneNumber:', phoneNumber);

    if (!phoneNumber || !/^\+94\d{9}$/.test(phoneNumber)) {
        return res.status(400).send({ success: false, message: 'Invalid phone number format. Use +94XXXXXXXXX.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Logic from legacy: 10 minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    try {
        // Logic from legacy: Use 'otp_requests' collection
        await db.collection('otp_requests').doc(phoneNumber).set({
            otp,
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAt)
        });

        const config = await getConfig();
        const { NOTIFY_LK_USER_ID, NOTIFY_LK_API_KEY, NOTIFY_LK_SENDER_ID } = config;

        if (!NOTIFY_LK_USER_ID || !NOTIFY_LK_API_KEY || !NOTIFY_LK_SENDER_ID) {
            console.error('SMS environment variables/config not set.');
            // Fallback for demo/dev if SMS not configured: Log it
            console.log(`[DEV MODE] OTP for ${phoneNumber}: ${otp}`);
            return res.status(200).send({ success: true, message: 'OTP generated (Dev Mode).' });
        }

        const notifyNumber = phoneNumber.replace(/^\+/, '');
        const smsMessage = `Your Clazz.lk verification code is: ${otp}`;
        const url = `https://app.notify.lk/api/v1/send?user_id=${NOTIFY_LK_USER_ID}&api_key=${NOTIFY_LK_API_KEY}&sender_id=${encodeURIComponent(NOTIFY_LK_SENDER_ID)}&to=${notifyNumber}&message=${encodeURIComponent(smsMessage)}`;

        const response = await fetch(url);
        const json = await response.json();
        if (json.status !== 'success') throw new Error(json.message || 'Notify.lk API error.');

        res.status(200).send({ success: true, message: 'OTP sent successfully.' });
    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).send({ success: false, message: error.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    const { phoneNumber, otp, idToken } = req.body;
    console.log('--- /verify-otp called ---', { phoneNumber, hasIdToken: !!idToken });

    if (!phoneNumber || !otp) return res.status(400).send({ success: false, message: 'Phone number and OTP are required.' });

    try {
        const otpRef = db.collection('otp_requests').doc(phoneNumber);
        const otpDoc = await otpRef.get();

        if (!otpDoc.exists) {
            return res.status(400).send({ success: false, message: 'Invalid or expired OTP.' });
        }

        const { otp: storedOtp, expiresAt } = otpDoc.data();

        // Logic from legacy: Check expiry
        if (expiresAt.toDate() < new Date()) {
            await otpRef.delete();
            return res.status(400).send({ success: false, message: 'OTP expired.' });
        }

        if (storedOtp !== otp) {
            return res.status(400).send({ success: false, message: 'Invalid OTP.' });
        }

        // OTP Valid. Clear it.
        await otpRef.delete();

        // Logic from legacy: Handle linking vs login
        if (idToken) {
            // ✅ LINK phone to existing user
            const decodedToken = await auth.verifyIdToken(idToken);
            await auth.updateUser(decodedToken.uid, { phoneNumber });
            return res.status(200).send({ success: true, message: 'Phone number linked successfully.' });
        } else {
            // ✅ SIGNUP/LOGIN flow
            let uid;
            let isNewUser = false;
            let newFirebaseUser = null;

            try {
                const userRecord = await auth.getUserByPhoneNumber(phoneNumber);
                uid = userRecord.uid;
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    isNewUser = true;
                    // Use legacy response structure for compatibility
                    const newUser = await auth.createUser({
                        phoneNumber: phoneNumber,
                        verified: true
                    });
                    uid = newUser.uid;
                    newFirebaseUser = {
                        uid: newUser.uid,
                        phoneNumber: newUser.phoneNumber,
                        email: null,
                        emailVerified: false
                    };
                } else {
                    throw error;
                }
            }

            // Create Custom Token
            const customToken = await auth.createCustomToken(uid);
            res.status(200).send({ success: true, customToken, isNewUser, newFirebaseUser });
        }

    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).send({ success: false, message: error.message });
    }
});

// Bulk Send Endpoint
app.post('/bulk-send', async (req, res) => {
    const { recipients, messageData, validChannels } = req.body; // recipients: { id, email, phoneNumber, name }[], validChannels: ['email', 'sms', 'push']
    const { subject, htmlBody, smsMessage } = messageData;

    if (!recipients || !recipients.length) {
        return res.status(400).send({ success: false, message: 'No recipients provided.' });
    }

    const config = await getConfig();
    const { EMAIL_USER, EMAIL_PASS, NOTIFY_LK_USER_ID, NOTIFY_LK_API_KEY, NOTIFY_LK_SENDER_ID } = config;

    let emailTransporter;
    if (validChannels.includes('email')) {
        if (!EMAIL_USER || !EMAIL_PASS) {
            return res.status(500).send({ success: false, message: 'Email configuration missing.' });
        }
        emailTransporter = nodemailer.createTransport({ service: 'gmail', auth: { user: EMAIL_USER, pass: EMAIL_PASS } });
    }

    const results = {
        email: { success: 0, failed: 0 },
        sms: { success: 0, failed: 0 },
        push: { success: 0, failed: 0 }
    };

    // Process in batches to avoid timeouts or rate limits
    const BATCH_SIZE = 20;

    try {
        // 3. Create Global Notification Document (One for the batch/bulk op)
        // We do this ONCE if there are push recipients.
        let notificationId = null;
        if (validChannels.includes('push')) {
            const notificationRef = db.collection('notifications').doc();
            notificationId = notificationRef.id;
            await notificationRef.set({
                id: notificationId,
                teacherId: 'admin', // Sender is Admin
                teacherName: 'Clazz Admin',
                teacherAvatar: 'https://clazz.lk/Logo3.png',
                content: messageData.pushBody, // Store raw body with {{name}} for reference
                target: { type: 'bulk', recipients: recipients.length },
                createdAt: new Date().toISOString(),
                recipientCount: recipients.length,
            });
        }

        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
            const batch = recipients.slice(i, i + BATCH_SIZE);

            await Promise.all(batch.map(async (user) => {
                // Determine channels for this user: use override if present, else fallback to global ValidChannels
                const userChannels = user.allowedChannels && user.allowedChannels.length > 0
                    ? user.allowedChannels
                    : validChannels;

                // Send Email
                if (validChannels.includes('email') && userChannels.includes('email') && user.email) {
                    try {
                        const unsubscribeLink = `https://clazz.lk/?page=unsubscribe&type=email&email=${encodeURIComponent(user.email)}`;
                        const personalizedHtml = `${htmlBody.replace('{{name}}', user.name || 'User')}<br/><br/><hr/><small><a href="${unsubscribeLink}">Unsubscribe</a></small>`;

                        await emailTransporter.sendMail({
                            from: `"Clazz.lk" <${EMAIL_USER}>`,
                            to: user.email,
                            subject: subject.replace('{{name}}', user.name || 'User'),
                            html: personalizedHtml
                        });
                        results.email.success++;
                    } catch (e) {
                        console.error(`Failed to send email to ${user.email}:`, e);
                        results.email.failed++;
                    }
                }

                // Send SMS
                if (validChannels.includes('sms') && userChannels.includes('sms') && user.phoneNumber) {
                    try {
                        if (NOTIFY_LK_USER_ID && NOTIFY_LK_API_KEY && NOTIFY_LK_SENDER_ID) {
                            const notifyNumber = user.phoneNumber.replace(/^\+/, '');
                            const fullUnsubLink = `https://clazz.lk/?page=unsubscribe&type=sms`;
                            const personalizedSms = `${smsMessage.replace('{{name}}', user.name || 'User')}\n\nOpt-out: ${fullUnsubLink}`;
                            const url = `https://app.notify.lk/api/v1/send?user_id=${NOTIFY_LK_USER_ID}&api_key=${NOTIFY_LK_API_KEY}&sender_id=${encodeURIComponent(NOTIFY_LK_SENDER_ID)}&to=${notifyNumber}&message=${encodeURIComponent(personalizedSms)}`;
                            const response = await fetch(url);
                            const json = await response.json();
                            if (json.status === 'success') results.sms.success++;
                            else throw new Error(json.message);
                        } else {
                            results.sms.failed++; // Config missing
                        }
                    } catch (e) {
                        console.error(`Failed to send SMS to ${user.phoneNumber}:`, e);
                        results.sms.failed++;
                    }
                }

                // Send Push
                if (validChannels.includes('push') && userChannels.includes('push') && notificationId) {
                    try {
                        const userRef = db.collection('users').doc(user.id);
                        const userDoc = await userRef.get();

                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            const fcmTokens = userData.fcmTokens || [];

                            // 1. Persist to User's Notifications
                            await userRef.update({
                                notifications: admin.firestore.FieldValue.arrayUnion({
                                    notificationId: notificationId,
                                    isRead: false
                                })
                            });

                            // 2. Send FCM
                            if (fcmTokens.length > 0) {
                                const { pushTitle, pushBody } = messageData;
                                const personalizedTitle = pushTitle.replace('{{name}}', user.name || 'User');
                                const personalizedBody = pushBody.replace('{{name}}', user.name || 'User');
                                const clickLink = `https://clazz.lk/?notification_id=${notificationId}`; // Open app to notification

                                const message = {
                                    data: {
                                        type: 'teacher_notification', // Keeping type consistent
                                        title: personalizedTitle,
                                        body: personalizedBody,
                                        message: personalizedBody,
                                        url: clickLink,
                                        teacherId: 'admin',
                                        notificationId: notificationId
                                    },
                                    webpush: {
                                        notification: {
                                            title: personalizedTitle,
                                            body: personalizedBody,
                                            icon: 'https://clazz.lk/Logo3.png',
                                            requireInteraction: true,
                                            fcm_options: {
                                                link: clickLink
                                            }
                                        }
                                    },
                                    tokens: fcmTokens
                                };
                                const pushResponse = await admin.messaging().sendEachForMulticast(message);
                                results.push.success += pushResponse.successCount;
                                results.push.failed += pushResponse.failureCount;
                            }
                        }
                    } catch (e) {
                        console.error(`Failed to send Push to ${user.id}:`, e);
                        results.push.failed++;
                    }
                }
            }));
        }

        // 4. Log the Operation to 'communication_logs'
        await db.collection('communication_logs').add({
            timestamp: new Date().toISOString(),
            sender: 'admin',
            channels: validChannels,
            stats: results,
            recipientCount: recipients.length,
            messagePreview: {
                subject: subject || '',
                sms: smsMessage || '',
                push: messageData.pushTitle || ''
            }
        });

        res.status(200).send({ success: true, results });

    } catch (error) {
        console.error('Bulk send error:', error);
        res.status(500).send({ success: false, message: error.message });
    }
});

// Export the Express app for Google Cloud Functions to handle.
exports.sendNotification = onRequest({ cors: true }, app);
