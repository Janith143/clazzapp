const { onRequest } = require("firebase-functions/v2/https");
const express = require('express');
const admin = require('firebase-admin');
const { logger } = require("firebase-functions");

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const app = express();

// Automatically allow cross-origin requests
app.use(require('cors')({ origin: true }));

// The function's logic, wrapped in an Express app.
app.get('/', async (req, res) => {
    // Instruct crawlers not to cache the redirect itself,
    // but to follow it and cache the final image.
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    try {
        const configDoc = await db.collection('settings').doc('clientAppConfig').get();
        // Use an absolute URL for your default image as a reliable fallback
        let imageUrl = 'https://clazz.lk/Logo3.png';

        if (configDoc.exists()) {
            const configData = configDoc.data();
            if (configData && configData.ogImageUrl) {
                imageUrl = configData.ogImageUrl;
            }
        }

        logger.log(`Redirecting OG image request to: ${imageUrl}`);
        // Use a 307 Temporary Redirect to suggest the resource might change.
        res.redirect(307, imageUrl);

    } catch (error) {
        logger.error('Error fetching OG image URL from Firestore:', error);
        // Fallback to the absolute default image URL on error
        res.redirect(307, 'https://clazz.lk/Logo3.png');
    }
});

// This line is crucial. It exports the Express app as a Firebase Function.
// The function will be named 'ogImageHandler' upon deployment based on your firebase.json
exports.ogImageHandler = onRequest({ cors: true }, app);