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

// Export the Express app for Google Cloud Functions to handle.
exports.sendNotification = onRequest({ cors: true }, app);
