// This Cloud Function is dedicated to handling payment gateway callbacks.
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
setGlobalOptions({ region: "asia-south1" });
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

    const defaultFrontendUrl = 'https://clazz.lk';
    let frontendUrl = defaultFrontendUrl;

    try {
        const encodedPayment = req.body.payment;
        // custom_fields usually comes as a Base64 string from frontend -> Gateway -> Here
        // But some gateways might decode it or send it as is. WebXPay documentation says custom_fields is string.
        const customFieldsRaw = req.body.custom_fields || req.body.custom_feilds;

        const orderId = req.body.order_id;
        const msg = req.body.msg;

        if (!encodedPayment || !customFieldsRaw) {
            console.error('Callback is missing "payment" or "custom_fields" in the body.');
            return res.redirect(`${defaultFrontendUrl}/?payment_status=error&msg=Invalid_callback_from_gateway`);
        }

        // Try to decode custom_fields to find frontend_url
        try {
            // First decode Base64
            const decodedCustomFields = Buffer.from(customFieldsRaw, 'base64').toString('utf-8');
            // Then URL decode if needed (though Base64 usually covers it) - sometimes JSON is URIComponentEncoded before Base64
            const jsonString = decodeURIComponent(decodedCustomFields);
            const customFieldsObj = JSON.parse(jsonString);

            if (customFieldsObj && customFieldsObj.frontend_url) {
                frontendUrl = customFieldsObj.frontend_url;
                // Basic validation to ensure it's a valid URL string
                if (!frontendUrl.startsWith('http')) {
                    frontendUrl = defaultFrontendUrl;
                }
            }
        } catch (e) {
            console.warn("Retaining default frontend URL. Failed to parse custom_fields for dynamic redirection:", e.message);
        }

        console.log(`Using Frontend URL: ${frontendUrl}`);

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
        // Pass original raw custom_fields back to frontend to be parsed there
        redirectUrl.searchParams.append('custom_fields', customFieldsRaw);

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