const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
setGlobalOptions({ region: "asia-south1", memory: "512MiB" });
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

let cachedIndexHtml = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

let cachedAppConfig = null;
let lastConfigFetchTime = 0;

const getIndexHtml = async () => {
    const now = Date.now();
    if (cachedIndexHtml && (now - lastFetchTime < CACHE_DURATION)) {
        return cachedIndexHtml;
    }

    try {
        // Append a timestamp to prevent caching at the edge for this fetch
        // Use a random query param to ensure we get a fresh copy from the CDN/Storage
        const response = await axios.get(`https://clazz.lk/index.html?t=${now}`);
        cachedIndexHtml = response.data;
        lastFetchTime = now;
        return cachedIndexHtml;
    } catch (e) {
        console.error("Failed to fetch index.html", e.message);
        return null;
    }
};

const getAppConfig = async () => {
    const now = Date.now();
    if (cachedAppConfig && (now - lastConfigFetchTime < CACHE_DURATION)) {
        return cachedAppConfig;
    }

    try {
        const docSnap = await db.collection('settings').doc('appConfig').get();
        if (docSnap.exists) {
            cachedAppConfig = docSnap.data();
            lastConfigFetchTime = now;
            return cachedAppConfig;
        }
    } catch (e) {
        console.error("Failed to fetch appConfig", e.message);
    }
    return null;
};

const injectMeta = (html, { title, description, image, url }) => {
    if (!html) return "";
    let modified = html;

    const replaceTag = (property, content) => {
        const regex = new RegExp(`<meta\\s+property=["']${property}["']\\s+content=["'][^"']*["']`, 'gi');
        if (regex.test(modified)) {
            modified = modified.replace(regex, `<meta property="${property}" content="${content}"`);
        } else {
            modified = modified.replace('</head>', `<meta property="${property}" content="${content}"></head>`);
        }
    };

    const replaceItemProp = (itemprop, content) => {
        const regex = new RegExp(`<meta\\s+itemprop=["']${itemprop}["']\\s+content=["'][^"']*["']`, 'gi');
        if (regex.test(modified)) {
            modified = modified.replace(regex, `<meta itemprop="${itemprop}" content="${content}"`);
        } else {
            modified = modified.replace('</head>', `<meta itemprop="${itemprop}" content="${content}"></head>`);
        }
    };

    // ... (rest of replaceNameTag logic, can leave as is or inline it if you want, but I will just focus on sticking this new helper in)
    const replaceNameTag = (name, content) => {
        const regex = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["'][^"']*["']`, 'gi');
        if (regex.test(modified)) {
            modified = modified.replace(regex, `<meta name="${name}" content="${content}"`);
        } else {
            modified = modified.replace('</head>', `<meta name="${name}" content="${content}"></head>`);
        }
    };

    if (title) {
        if (/<title>.*<\/title>/i.test(modified)) {
            modified = modified.replace(/<title>.*<\/title>/i, `<title>${title}</title>`);
        } else {
            modified = modified.replace('</head>', `<title>${title}</title></head>`);
        }
        replaceTag('og:title', title);
        replaceTag('twitter:title', title);
        replaceItemProp('name', title); // WhatsApp fallback
    }

    if (description) {
        replaceNameTag('description', description);
        replaceTag('og:description', description);
        replaceTag('twitter:description', description);
        replaceItemProp('description', description); // WhatsApp fallback
    }

    if (image) {
        replaceTag('og:image', image);
        replaceTag('twitter:image', image);
        replaceItemProp('image', image); // WhatsApp Primary

        // Add dimensions for WhatsApp/FB to render large card immediately
        // Note: We blindly add these assuming the image is from our generator or a standard large image
        // If it's a teacher profile image, it might be smaller, but usually > 300px so okay.
        replaceTag('og:image:width', '1200');
        replaceTag('og:image:height', '630');
        replaceTag('og:image:type', 'image/png');
    }

    if (url) {
        replaceTag('og:url', url);
    }

    return modified;
};

const RESERVED_PATHS = [
    'admin', 'teachers', 'courses', 'classes', 'quizzes', 'exams', 'events',
    'store', 'gift-voucher', 'referrals', 'dashboard', 'institute', 'home',
    'login', 'register', 'robots.txt', 'sitemap.xml', 'favicon.ico', 'manifest.json'
];

app.get('**', async (req, res) => {
    const path = req.path;
    const cleanPath = path.substring(1);
    const segments = cleanPath.split('/');

    // CRITICAL FIX: Fail fast for assets.
    // If we don't return 404 here, this function returns HTML for image requests, breaking the site.
    if (path.startsWith('/assets/') || path.match(/\.(js|css|png|jpg|jpeg|gif|ico|json|map|woff|woff2|txt|xml|svg)$/i)) {
        return res.status(404).send('Not Found');
    }

    const appConfig = await getAppConfig();
    const globalOgImage = appConfig?.ogImageUrl;
    const fallbackImage = globalOgImage || "https://asia-south1-clazz2-new.cloudfunctions.net/ogImageHandler";

    let meta = {
        title: "clazz.lk - Sri Lanka's Biggest Online Teachers Directory",
        description: "Connect with the best tutors, enroll in online classes, and excel in your studies.",
        image: fallbackImage,
        url: `https://clazz.lk${path}`
    };

    const getTeacherMeta = async (identifier) => {
        try {
            const teachersRef = db.collection('teachers');
            // Try nickname/username first
            let snapshot = await teachersRef.where('username', '==', identifier).limit(1).get();
            let teacher = null;

            if (!snapshot.empty) {
                teacher = snapshot.docs[0].data();
            } else {
                // Try ID direct lookup
                const docSnap = await teachersRef.doc(identifier).get();
                if (docSnap.exists) {
                    teacher = docSnap.data();
                }
            }

            if (teacher) {
                return {
                    title: `${teacher.name} | Clazz.lk`,
                    description: teacher.tagline || teacher.bio?.substring(0, 160) || "View teacher profile on Clazz.lk",
                    image: teacher.profileImage || meta.image
                };
            }
        } catch (e) {
            console.error("Error fetching teacher:", e);
        }
        return null;
    };

    // 1. Vanity URL: /TeacherName
    if (segments.length === 1 && !RESERVED_PATHS.includes(segments[0]) && segments[0] !== '') {
        const data = await getTeacherMeta(segments[0]);
        if (data) meta = { ...meta, ...data };
    }
    // 2. Explicit Teacher Route: /teacher/slug_or_id
    else if (segments[0] === 'teacher' && segments[1]) {
        const data = await getTeacherMeta(segments[1]);
        if (data) meta = { ...meta, ...data };
    }

    const indexHtml = await getIndexHtml();

    if (!indexHtml) {
        console.error("Could not load index.html from source. Returning basic 503.");
        return res.status(503).send("Service Unavailable: Could not load app shell.");
    }

    const finalHtml = injectMeta(indexHtml, meta);

    // Set long cache for CDN but short for browser to ensure dynamic updates
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.send(finalHtml);
});

exports.ssrHandler = onRequest({ cors: true }, app);
