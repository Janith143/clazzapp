// This Cloud Function is dedicated to handling payment gateway callbacks.
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
setGlobalOptions({ region: "asia-south1" });
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}

// Connect to the specific named database used by the client
const db = getFirestore('clazzdb2');

const app = express();

// Allow cross-origin requests
app.use(cors({ origin: true }));
// Middleware to parse URL-encoded bodies, required for WebXPay's form post callback
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
    res.status(200).send('Payment handler service is running.');
});

// Reusable handler function
const handleCallback = (req, res) => {
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

        // DEBUG: Pass the raw status code to frontend for debugging "Payment Failed" issues
        redirectUrl.searchParams.append('debug_raw_status', rawStatusCode);

        if (orderId) redirectUrl.searchParams.append('order_id', orderId);
        if (msg) redirectUrl.searchParams.append('msg', msg);

        console.log('Successfully parsed. Redirecting user to:', redirectUrl.toString());
        return res.redirect(302, redirectUrl.toString());

    } catch (error) {
        console.error('Error processing payment callback:', error);
        return res.redirect(`${frontendUrl}/?payment_status=error&msg=Server_error_processing_callback`);
    }
};

// Endpoint to handle the POST callback from WebXPay
app.post('/payment-callback', handleCallback);

// Also handle POST at root in case user configured the URL without /payment-callback
app.post('/', handleCallback);


// Endpoint to sync orphaned teachers (Teachers without a User document)
app.get('/sync-orphaned-teachers', async (req, res) => {
    try {
        const teachersSnapshot = await db.collection('teachers').get();
        const results = {
            totalTeachers: teachersSnapshot.size,
            fixed: 0,
            alreadyExists: 0,
            errors: [],
            fixedIds: []
        };

        const batchPromises = [];

        for (const teacherDoc of teachersSnapshot.docs) {
            const teacherId = teacherDoc.id;
            const teacherData = teacherDoc.data();

            batchPromises.push(async () => {
                const userDocRef = db.collection('users').doc(teacherId);
                const userDoc = await userDocRef.get();

                if (!userDoc.exists) {
                    console.log(`Syncing missing user for teacher: ${teacherId}`);
                    // Construct User Data from Teacher Data
                    const newUserData = {
                        id: teacherId,
                        firstName: teacherData.firstName || teacherData.name?.split(' ')[0] || 'Teacher',
                        lastName: teacherData.lastName || teacherData.name?.split(' ').slice(1).join(' ') || '',
                        email: teacherData.email || teacherData.contact?.email || '',
                        role: 'teacher',
                        isTeacher: true,
                        profileImage: teacherData.profileImage || '',
                        createdAt: new Date().toISOString(),
                        syncedFromTeacher: true // Flag to track these auto-created accounts
                    };

                    try {
                        await userDocRef.set(newUserData);
                        results.fixed++;
                        results.fixedIds.push(teacherId);
                    } catch (e) {
                        console.error(`Failed to create user for ${teacherId}:`, e);
                        results.errors.push({ id: teacherId, error: e.message });
                    }
                } else {
                    results.alreadyExists++;
                    // Optional: Ensure isTeacher flag is true even if user exists
                    if (userDoc.data().role !== 'teacher' || !userDoc.data().isTeacher) {
                        // We could update it, but let's be safe and just log for now
                        // await userDocRef.update({ isTeacher: true, role: 'teacher' });
                    }
                }
            });
        }

        // Execute sequentially or in limited parallel chunks if too many, but for <1000 items Promise.all is fine for "checking".
        // However, we pushed async functions to an array. Let's run them.
        await Promise.all(batchPromises.map(fn => fn()));

        res.json({
            success: true,
            message: 'Sync complete',
            results
        });

    } catch (error) {
        console.error('Error syncing teachers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Export the Express app for Google Cloud Functions to handle.
exports.paymentHandler = onRequest(app);