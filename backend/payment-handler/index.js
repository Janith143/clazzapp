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

// Reusable handler function
const handleCallback = (req, res) => {
    console.log(`--- Received WebXPay Callback (${req.method}) ---`);
    console.log('Headers:', JSON.stringify(req.headers));
    console.log('Body:', JSON.stringify(req.body));
    console.log('Query:', JSON.stringify(req.query));

    const defaultFrontendUrl = 'https://clazz.lk';
    let frontendUrl = defaultFrontendUrl;

    try {
        // Support both POST (body) and GET (query) parameters
        const data = req.method === 'GET' ? req.query : req.body;

        const encodedPayment = data.payment;
        const customFieldsRaw = data.custom_fields || data.custom_feilds;

        const orderId = data.order_id;
        const msg = data.msg;

        // If no data found, maybe it's just a health check hitting the wrong route?
        if (!encodedPayment && !customFieldsRaw && !orderId && req.method === 'GET') {
            return res.status(200).send('Payment Handler Service: No payment data found in request.');
        }

        if (!encodedPayment || !customFieldsRaw) {
            console.error('Callback is missing "payment" or "custom_fields".');
            // Try to recover order_id if available to at least show something
            const fallbackParams = orderId ? `?order_id=${orderId}` : '';
            return res.redirect(`${defaultFrontendUrl}/?payment_status=error&msg=Invalid_callback_data${fallbackParams}`);
        }
        // ... (rest of function is same, just using 'data' instead of req.body)

        // Try to decode custom_fields to find frontend_url
        try {
            // First decode Base64
            const decodedCustomFields = Buffer.from(customFieldsRaw, 'base64').toString('utf-8');
            // Then URL decode if needed
            const jsonString = decodeURIComponent(decodedCustomFields);
            const customFieldsObj = JSON.parse(jsonString);

            if (customFieldsObj && customFieldsObj.frontend_url) {
                frontendUrl = customFieldsObj.frontend_url;
                if (!frontendUrl.startsWith('http')) {
                    frontendUrl = defaultFrontendUrl;
                }
            }
        } catch (e) {
            console.warn("Retaining default frontend URL. Failed to parse custom_fields:", e.message);
        }

        console.log(`Using Frontend URL: ${frontendUrl}`);

        const decodedPayment = Buffer.from(encodedPayment, 'base64').toString('utf8');
        console.log('Decoded Payment String:', decodedPayment);

        const paymentParts = decodedPayment.split('|');
        // ... (rest is the same)

        const rawStatusCode = paymentParts[4] || '';
        const statusCode = rawStatusCode.split(' ')[0];
        console.log('Extracted Status Code:', statusCode);

        const redirectUrl = new URL(frontendUrl);
        redirectUrl.searchParams.append('status_code', statusCode);
        redirectUrl.searchParams.append('custom_fields', customFieldsRaw);
        redirectUrl.searchParams.append('debug_raw_status', rawStatusCode);

        if (orderId) redirectUrl.searchParams.append('order_id', orderId);
        if (msg) redirectUrl.searchParams.append('msg', msg);

        console.log('Redirecting to:', redirectUrl.toString());
        return res.redirect(302, redirectUrl.toString());

    } catch (error) {
        console.error('Error processing payment callback:', error);
        return res.redirect(`${frontendUrl}/?payment_status=error&msg=Server_error`);
    }
};

// Handle both POST and GET for flexibility
app.all('/payment-callback', handleCallback);

// Handle root path too, but prioritizing the Health Check for cleaner logs if visited directly
app.get('/', (req, res) => {
    // If it has query params, treat as callback
    if (Object.keys(req.query).length > 0) {
        return handleCallback(req, res);
    }
    res.status(200).send('Payment handler service is running.');
});
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