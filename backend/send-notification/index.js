// This is the correct structure for a Google Cloud Function (2nd Gen) using Express.
// It EXPORTS the app; it does NOT listen on a port.
const { onRequest } = require("firebase-functions/v2/https");
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.status(200).send('Generic notification service is running.');
});

// Main function logic for generic notifications
app.post('/', async (req, res) => {
    const { toEmail, toSms, subject, htmlBody, smsMessage } = req.body;

    const emailPromise = async () => {
        if (!toEmail || !subject || !htmlBody) return { service: 'email', status: 'skipped', reason: 'Missing parameters.' };
        
        const { EMAIL_USER, EMAIL_PASS } = process.env;
        if (!EMAIL_USER || !EMAIL_PASS) {
            console.error('Email environment variables not set.');
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

        const { NOTIFY_LK_USER_ID, NOTIFY_LK_API_KEY, NOTIFY_LK_SENDER_ID } = process.env;
        if (!NOTIFY_LK_USER_ID || !NOTIFY_LK_API_KEY || !NOTIFY_LK_SENDER_ID) {
            console.error('SMS environment variables not set.');
            return { service: 'sms', status: 'failed', error: 'Server not configured for SMS.' };
        }
        
        const url = `https://app.notify.lk/api/v1/send?user_id=${NOTIFY_LK_USER_ID}&api_key=${NOTIFY_LK_API_KEY}&sender_id=${encodeURIComponent(NOTIFY_LK_SENDER_ID)}&to=${toSms}&message=${encodeURIComponent(smsMessage)}`;
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


// Export the Express app for Google Cloud Functions to handle.
exports.sendNotification = onRequest({ cors: true }, app);
