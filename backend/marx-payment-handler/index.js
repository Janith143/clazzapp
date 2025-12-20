const { onRequest } = require("firebase-functions/v2/onRequest");
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

const MARX_API_BASE_URL = 'https://payment.v4.api.marx.lk/api/v4/ipg';
const FRONTEND_URL = 'https://clazz.lk';

// Endpoint for the user to be redirected back to from Marx IPG
app.get('/marx-callback', (req, res) => {
    const { trId, merchantRID } = req.query;
    if (!trId || !merchantRID) {
        return res.redirect(`${FRONTEND_URL}/?payment_status=error&msg=Invalid_callback_parameters`);
    }
    const redirectUrl = new URL(FRONTEND_URL);
    redirectUrl.searchParams.append('payment_gateway', 'marxipg');
    redirectUrl.searchParams.append('trId', trId);
    redirectUrl.searchParams.append('merchantRID', merchantRID);
    res.redirect(302, redirectUrl.toString());
});

// Endpoint for the frontend to call to initiate a payment
app.post('/createOrder', async (req, res) => {
    const { order_id, amount, items, customer, custom_fields, return_url } = req.body;

    try {
        const settingsDoc = await db.collection('settings').doc('clientAppConfig').get();
        const apiKey = settingsDoc.data()?.paymentGatewaySettings?.gateways?.marxipg?.apiKey;
        if (!apiKey) {
            throw new Error('Marx IPG API key not configured.');
        }

        // Sanitize phone number for Marx API
        let finalMobile = customer.contact_number || '';
        // Remove spaces, dashes, etc.
        finalMobile = finalMobile.replace(/[\s-()]/g, '');

        // If it starts with a leading 0, replace it with +94
        if (finalMobile.startsWith('0')) {
            finalMobile = `+94${finalMobile.substring(1)}`;
        }
        // If it starts with 94 but not +, add it.
        else if (finalMobile.startsWith('94') && !finalMobile.startsWith('+')) {
            finalMobile = `+${finalMobile}`;
        }
        // If it's a 9 digit number, prepend +94
        else if (finalMobile.length === 9 && !finalMobile.startsWith('94')) {
            finalMobile = `+94${finalMobile}`;
        }

        const payload = {
            merchantRID: order_id,
            amount: parseFloat(amount.toFixed(2)),
            validTimeLimit: 2, // How many hours the payment link will work
            returnUrl: req.body.return_url || `https://marxpaymenthandler-gtlcyfs7jq-uc.a.run.app/marx-callback`,
            customerMail: customer.email,
            customerMobile: finalMobile,
            orderSummary: items,
            customerReference: order_id, // Changed from name to Invoice Number (order_id)
            paymentMethod: "OTHER" // "OTHER" (for Visa/Mastercard/UnionPay) or "AMEX"
        };

        const response = await fetch(`${MARX_API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'merchant-api-key': apiKey,
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (result.status !== 0) {
            // Log the detailed error from Marx API for debugging
            console.error('Marx API Error:', result.message, result.data);
            throw new Error(result.message || 'Failed to create Marx order.');
        }

        // Store custom_fields temporarily for later retrieval
        await db.collection('payment_sessions').doc(order_id).set({
            custom_fields: custom_fields,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).send({ success: true, payUrl: result.data.payUrl, trId: result.data.trId });
    } catch (error) {
        console.error('Error creating Marx order:', error);
        res.status(500).send({ success: false, message: error.message });
    }
});

// Endpoint for the frontend to call to complete the payment
app.post('/completePayment', async (req, res) => {
    const { trId, merchantRID } = req.body;

    try {
        const settingsDoc = await db.collection('settings').doc('clientAppConfig').get();
        const apiKey = settingsDoc.data()?.paymentGatewaySettings?.gateways?.marxipg?.apiKey;
        if (!apiKey) {
            throw new Error('Marx IPG API key not configured.');
        }

        const response = await fetch(`${MARX_API_BASE_URL}/orders/${trId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'merchant-api-key': apiKey,
            },
            body: JSON.stringify({ merchantRID }),
        });

        const result = await response.json();

        if (result.status === 0 && result.data.summaryResult === "SUCCESS") {
            const sessionDoc = await db.collection('payment_sessions').doc(merchantRID).get();
            if (!sessionDoc.exists) {
                throw new Error('Payment session data not found.');
            }
            const custom_fields = sessionDoc.data().custom_fields;

            // Clean up the session document
            await db.collection('payment_sessions').doc(merchantRID).delete();

            res.status(200).send({ success: true, finalStatus: 'SUCCESS', custom_fields });
        } else {
            res.status(200).send({ success: false, finalStatus: 'FAILURE', message: result.message });
        }
    } catch (error) {
        console.error('Error completing Marx payment:', error);
        res.status(500).send({ success: false, message: error.message });
    }
});

exports.marxPaymentHandler = onRequest({ cors: true }, app);