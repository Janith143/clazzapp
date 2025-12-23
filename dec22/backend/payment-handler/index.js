// This Cloud Function is dedicated to handling payment gateway callbacks.
const { onRequest } = require("firebase-functions/v2/https");
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}

const app = express();

// Allow cross-origin requests
app.use(cors({ origin: true }));
// Middleware to parse URL-encoded bodies, required for WebXPay's form post callback
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
    res.status(200).send('Payment handler service is running.');
});

// Endpoint to handle the POST callback from WebXPay
app.post('/payment-callback', (req, res) => {
    console.log('--- Received WebXPay Callback ---');
    console.log('Raw Body:', req.body);

    const frontendUrl = 'https://clazz.lk'; 

    try {
        const encodedPayment = req.body.payment;
        const customFields = req.body.custom_fields || req.body.custom_feilds;
        
        const orderId = req.body.order_id;
        const msg = req.body.msg;

        if (!encodedPayment || customFields === undefined) {
            console.error('Callback is missing "payment" or "custom_fields" in the body.');
            return res.redirect(`${frontendUrl}/?payment_status=error&msg=Invalid_callback_from_gateway`);
        }

        const decodedPayment = Buffer.from(encodedPayment, 'base64').toString('utf8');
        console.log('Decoded Payment String:', decodedPayment);

        const paymentParts = decodedPayment.split('|');
        if (paymentParts.length < 5) {
            console.error('Decoded payment string has an invalid format.');
            return res.redirect(`${frontendUrl}/?payment_status=error&msg=Malformed_payment_data`);
        }

        const rawStatusCode = paymentParts[4] || '';
        const statusCode = rawStatusCode.split(' ')[0]; 
        console.log('Extracted Status Code:', statusCode);

        const redirectUrl = new URL(frontendUrl);
        redirectUrl.searchParams.append('status_code', statusCode);
        redirectUrl.searchParams.append('custom_fields', customFields);
        
        if (orderId) redirectUrl.searchParams.append('order_id', orderId);
        if (msg) redirectUrl.searchParams.append('msg', msg);

        console.log('Successfully parsed. Redirecting user to:', redirectUrl.toString());
        return res.redirect(302, redirectUrl.toString());

    } catch (error) {
        console.error('Error processing payment callback:', error);
        return res.redirect(`${frontendUrl}/?payment_status=error&msg=Server_error_processing_callback`);
    }
});


// Export the Express app for Google Cloud Functions to handle.
exports.paymentHandler = onRequest(app);