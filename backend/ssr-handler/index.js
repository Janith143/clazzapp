const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
setGlobalOptions({ region: "asia-south1", memory: "512MiB" }); // Increased memory for potential HTML processing
const express = require('express');
const admin = require('firebase-admin');
const axios = require('axios');
const cors = require('cors');

if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const app = express();

app.use(cors({ origin: true }));

// Cache the index.html content in memory to avoid fetching it on every request
let cachedIndexHtml = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

const getIndexHtml = async () => {
    const now = Date.now();
    if (cachedIndexHtml && (now - lastFetchTime < CACHE_DURATION)) {
        return cachedIndexHtml;
    }

    try {
        // Fetch from the hosted site. 
        // NOTE: During local dev, this might point to live. 
        // In production, it points to itself (static content).
        // Standard practice: fetch from the public hosting URL.
        const response = await axios.get('https://clazz.lk/index.html');
        cachedIndexHtml = response.data;
        lastFetchTime = now;
        return cachedIndexHtml;
    } catch (e) {
        console.error("Failed to fetch index.html", e);
        return null;
    }
};

const injectMeta = (html, { title, description, image, url }) => {
    if (!html) return "";

    let modified = html;

    // Helper to replace content of a specific meta tag
    const replaceTag = (property, content) => {
        const regex = new RegExp(`<meta property="${property}" content="[^"]*"`, 'g');
        modified = modified.replace(regex, `<meta property="${property}" content="${content}"`);
    };

    const replaceNameTag = (name, content) => {
        const regex = new RegExp(`<meta name="${name}" content="[^"]*"`, 'g');
        modified = modified.replace(regex, `<meta name="${name}" content="${content}"`);
    };

    if (title) {
        modified = modified.replace(/<title>.*<\/title>/, `<title>${title}</title>`);
        replaceTag('og:title', title);
        replaceTag('twitter:title', title);
    }

    if (description) {
        replaceNameTag('description', description);
        replaceTag('og:description', description);
        replaceTag('twitter:description', description);
    }

    if (image) {
        replaceTag('og:image', image);
        replaceTag('twitter:image', image);
    }

    if (url) {
        replaceTag('og:url', url);
    }

    return modified;
};

// Reserved paths that should definitely NOT be treated as teacher profiles
// 'assets' is handled by hosting priority usually, but good to check.
const RESERVED_PATHS = [
    'admin', 'teachers', 'courses', 'classes', 'quizzes', 'exams', 'events',
    'store', 'gift-voucher', 'referrals', 'dashboard', 'institute', 'home',
    'login', 'register', 'robots.txt', 'sitemap.xml', 'favicon.ico', 'manifest.json'
];

app.get('**', async (req, res) => {
    const path = req.path; // e.g. /ChemistryWithRukshanSir or /courses/physics
    const cleanPath = path.substring(1); // remove leading slash
    const segments = cleanPath.split('/');

    // Ignore static assets if they somehow reached here (though hosting handles them first)
    if (path.startsWith('/assets/') || path.includes('.')) {
        // It's likely a file.
        // If we don't handle it, we should probably output the plain index.html 
        // so client-side routing detects 404 or handles it.
        // BUT file extensions usually mean static files.
    }

    let meta = {
        title: "clazz.lk - Online Learning Platform for Sri Lanka",
        description: "Connect with the best tutors, enroll in online classes, and excel in your studies.",
        image: "https://clazz.lk/Logo3.png",
        url: `https://clazz.lk${path}`
    };

    let needsDeepLookup = false;

    // Logic to determine if we need to fetch data
    if (segments.length === 1 && !RESERVED_PATHS.includes(segments[0]) && segments[0] !== '') {
        // Potential Teacher Vanity URL: /TeacherName
        const slug = segments[0];
        try {
            // Find teacher by username (slug)
            // Note: In Firestore we might need a query
            const teachersRef = db.collection('teachers');
            const snapshot = await teachersRef.where('username', '==', slug).limit(1).get();

            if (!snapshot.empty) {
                const teacher = snapshot.docs[0].data();
                meta.title = `${teacher.name} | Clazz.lk`;
                meta.description = teacher.tagline || teacher.bio?.substring(0, 160) || "View teacher profile on Clazz.lk";
                meta.image = teacher.profileImage || meta.image;
            } else {
                // Fallback: Check if it's a teacher ID?
                const docSnap = await teachersRef.doc(slug).get();
                if (docSnap.exists) {
                    const teacher = docSnap.data();
                    meta.title = `${teacher.name} | Clazz.lk`;
                    meta.description = teacher.tagline || teacher.bio?.substring(0, 160) || "View teacher profile on Clazz.lk";
                    meta.image = teacher.profileImage || meta.image;
                }
            }
        } catch (e) {
            console.error("Error fetching teacher", e);
        }
    }
    // Handle specific Detail Pages if needed (Courses, Classes, etc.)
    else if (segments[0] === 'teacher' && segments[1]) {
        // /teacher/slug
        const slug = segments[1];
        try {
            const teachersRef = db.collection('teachers');
            const snapshot = await teachersRef.where('username', '==', slug).limit(1).get();
            if (!snapshot.empty) {
                const teacher = snapshot.docs[0].data();
                meta.title = `${teacher.name} | Clazz.lk`;
                meta.image = teacher.profileImage || meta.image;
            }
        } catch (e) { }
    } else if (segments[0] === 'courses' && segments[1]) {
        // /courses/slug
        // Logic similar to above...
    }

    const indexHtml = await getIndexHtml();

    if (!indexHtml) {
        // If we fail to fetch index.html, we can't do SSR. 
        // Return 500 or redirect to basic hosting static URL?
        // Redirecting to index.html might cause loop if rewrite points back here.
        // Best to send a simple fail message or retry.
        return res.status(503).send("Service Unavailable");
    }

    const finalHtml = injectMeta(indexHtml, meta);

    // Set long cache for CDN but short for browser to ensure dynamic updates
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.send(finalHtml);
});

exports.ssrHandler = onRequest({ cors: true }, app);
