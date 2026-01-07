const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
setGlobalOptions({ region: "asia-south1", memory: "512MiB" });
const express = require('express');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const axios = require('axios');
const cors = require('cors');

if (!admin.apps.length) {
    admin.initializeApp();
}
// Use specific database instance where data resides
const db = getFirestore('clazzdb2');
const app = express();

app.use(cors({ origin: true }));

let cachedIndexHtml = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

let cachedAppConfig = null;
let lastConfigFetchTime = 0;

const slugify = (text) => {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
};

const getIndexHtml = async () => {
    const now = Date.now();
    if (cachedIndexHtml && (now - lastFetchTime < CACHE_DURATION)) {
        return cachedIndexHtml;
    }

    try {
        const response = await axios.get(`https://clazz.lk/index.html?t=${now}`);
        cachedIndexHtml = response.data;
        lastFetchTime = now;
        return cachedIndexHtml;
    } catch (e) {
        console.error("Failed to fetch index.html", e.message);
        return null; // Don't return empty string, return null so we can handle 503
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



const resizeGoogleImage = (url) => {
    if (!url) return url;
    // Check if it's a Google User Content URL
    if (url.includes('googleusercontent.com')) {
        // Replace size param (e.g., =s96-c, =s96) with =s600 for high quality
        // 1. Remove existing size param if it exists at the end
        const cleanUrl = url.split('=')[0];
        return `${cleanUrl}=s600`;
    }
    return url;
};

const injectMeta = (html, { title, description, image, url, type, jsonLd }) => {
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
        replaceItemProp('name', title);
    }

    if (description) {
        replaceNameTag('description', description);
        replaceTag('og:description', description);
        replaceTag('twitter:description', description);
        replaceItemProp('description', description);
    }

    if (image) {
        replaceTag('og:image', image);
        replaceTag('twitter:image', image);
        replaceItemProp('image', image);
        replaceTag('og:image:width', '1200');
        replaceTag('og:image:height', '630');
        replaceTag('og:image:type', 'image/png');
    }

    if (url) {
        replaceTag('og:url', url);
    }

    if (type) {
        replaceTag('og:type', type);
    }

    // JSON-LD Injection
    if (jsonLd) {
        const jsonString = JSON.stringify(jsonLd);
        // Remove existing JSON-LD if any (simple check)
        // Then append new one
        modified = modified.replace('</head>', `<script type="application/ld+json">${jsonString}</script></head>`);
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
        url: `https://clazz.lk${path}`,
        jsonLd: null
    };

    // --- Data Fetching Helpers ---

    const getTeacherMeta = async (identifier) => {
        try {
            const teachersRef = db.collection('teachers');
            let snapshot = await teachersRef.where('username', '==', identifier).limit(1).get();
            let teacher = null;

            if (!snapshot.empty) {
                teacher = snapshot.docs[0].data();
            } else {
                const docSnap = await teachersRef.doc(identifier).get();
                if (docSnap.exists) {
                    teacher = docSnap.data();
                } else {
                    // Fallback: Fetch all teachers and search case-insensitive (Matches Frontend behavior)
                    // Note: This is resource intensive if there are thousands of teachers, but essential for case-insensitivity without schema changes.
                    const allTeachersSnap = await teachersRef.get(); // Reads all teachers
                    teacher = allTeachersSnap.docs
                        .map(doc => ({ ...doc.data(), id: doc.id }))
                        .find(t =>
                            (t.username && t.username.toLowerCase() === identifier.toLowerCase()) ||
                            t.id === identifier
                        );
                }
            }

            if (teacher) {
                const highResImage = resizeGoogleImage(teacher.profileImage || meta.image);
                return {
                    title: `${teacher.name} | Clazz.lk`,
                    description: teacher.tagline || teacher.bio?.substring(0, 160),
                    image: highResImage,
                    type: 'profile',
                    jsonLd: {
                        "@context": "https://schema.org",
                        "@type": "Person",
                        "name": teacher.name,
                        "description": teacher.bio,
                        "image": highResImage,
                        "jobTitle": "Teacher"
                    }
                };
            }
        } catch (e) { console.error(e); }
        return null;
    };

    const getCourseMeta = async (slug) => {
        try {
            // Courses are in subcollections or root group? Using Group for broad search implicitly or loop teachers?
            // Expensive to loop. Assumes 'courses' collectionGroup query.
            // Problem: Finding by slug across ALL teachers efficiently.
            // Function relies on slug being unique or 'first match'.
            // Querying teachers is too slow.
            // Strategy: We can't easily index custom slug inside array.
            // But if 'courses' is a collectionGroup:
            const coursesSnap = await db.collectionGroup('courses').get(); // Only fetches if small. 
            // Warning: fetching ALL courses is bad scale.
            // Better: If slug contains ID? No.
            // If we can't efficiently find by slug, we fallback to default.
            // BUT: Sitemap generator iterates teachers.
            // Optimized approach: Firestore doesn't support array-contains partial.
            // Use Client-side search? No.
            // Hack: List all teachers? No.
            // REALITY CHECK: Without a 'slug' index on a root collection, this is hard.
            // Solution: Iterate teachers (limited to 50?) or Assume user enters ID?
            // Frontend uses `useData` which loads ALL teachers.
            // SSR can't load all.
            // COMPROMISE: If segments[2] (ID) exists? No URL is /course/:slug
            // If we can't verify slug efficiently, return generic?
            // Wait! Previous Code view of `ClassDetailPage` used `useFetchItem`? No, `useData`.
            // SSR cannot do that.
            // If you want SSR for courses, URL structure should ideally be /course/:id/:slug or use a root 'courses' collection.
            // Assuming we must scan:
            // fetching all teachers to ensure we don't miss any due to 'isPublished' flags (OG tags should likely show if the link is valid anyway)
            const teachersSnap = await db.collection('teachers').get();

            for (const doc of teachersSnap.docs) {
                const t = doc.data();
                if (t.courses && Array.isArray(t.courses)) {
                    const found = t.courses.find(c => {
                        if (c.isDeleted) return false;
                        const simpleSlug = slugify(c.title);
                        const isMatch = simpleSlug === slug || (c.id && slug.endsWith(c.id) && slug.includes(simpleSlug));
                        return isMatch;
                    });

                    if (found) {
                        const imageToUse = found.coverImage || t.profileImage || meta.image;
                        const highResImage = resizeGoogleImage(imageToUse);

                        return {
                            title: `${found.title} | ${t.name}`,
                            description: found.description?.substring(0, 160) || `Enroll in ${found.title} by ${t.name}`,
                            image: highResImage,
                            type: 'website',
                            jsonLd: {
                                "@context": "https://schema.org",
                                "@type": "Course",
                                "name": found.title,
                                "description": found.description,
                                "provider": { "@type": "Person", "name": t.name },
                                "offers": {
                                    "@type": "Offer",
                                    "price": found.fee,
                                    "priceCurrency": "LKR"
                                }
                            }
                        };
                    }
                }
            }
        } catch (e) { console.error('[SSR] Error in getCourseMeta:', e); }
        return null;
    };

    // Similarly for Events, Classes.
    // NOTE: This IS expensive (reading all teachers). 
    // For now, with < 100 teachers, it's 1 read = 100 docs = fast enough (50ms).
    // Future work: Denormalize slugs to a 'slugs' collection.

    const getDataBySlug = async (type, slug) => {
        try {
            // Use same robust scan as getCourseMeta
            const teachersSnap = await db.collection('teachers').get();

            for (const doc of teachersSnap.docs) {
                const t = doc.data();
                let found = null;
                let ldType = "";
                let fallbackImage = t.profileImage || meta.image;

                if (type === 'course' && t.courses) {
                    // Should use getCourseMeta instead, but just in case
                    found = t.courses.find(c => {
                        const s = slugify(c.title);
                        return s === slug || (c.id && slug.endsWith(c.id) && slug.includes(s));
                    });
                    ldType = "Course";
                } else if (type === 'event' && t.events) {
                    found = t.events.find(e => {
                        const s = slugify(e.title);
                        const isMatch = s === slug || (e.id && slug.endsWith(e.id) && slug.includes(s));
                        return isMatch;
                    });
                    ldType = "Event";
                } else if (type === 'class' && t.individualClasses) {
                    found = t.individualClasses.find(c => {
                        const s = slugify(c.title);
                        const isMatch = s === slug || (c.id && slug.endsWith(c.id) && slug.includes(s));
                        return isMatch;
                    });
                    ldType = "Course";
                } else if (type === 'quiz' && t.quizzes) {
                    found = t.quizzes.find(q => {
                        const s = slugify(q.title);
                        const isMatch = s === slug || (q.id && slug.endsWith(q.id) && slug.includes(s));
                        return isMatch;
                    });
                    ldType = "EducationEvent";
                }

                if (found) {
                    const imageToUse = found.coverImage || fallbackImage;
                    const highResImage = resizeGoogleImage(imageToUse);

                    return {
                        title: `${found.title} | ${t.name}`,
                        description: found.description?.substring(0, 160) || `${type.charAt(0).toUpperCase() + type.slice(1)} by ${t.name}`,
                        image: highResImage,
                        type: 'website',
                        jsonLd: {
                            "@context": "https://schema.org",
                            "@type": ldType,
                            "name": found.title,
                            "description": found.description,
                            "provider": { "@type": "Person", "name": t.name }
                        }
                    };
                }
            }

            // Also check Institutes for Events
            if (type === 'event') {
                const instSnap = await db.collection('tuitionInstitutes').get();
                for (const doc of instSnap.docs) {
                    const ti = doc.data();
                    if (ti.events) {
                        const found = ti.events.find(e => e.id === slug || slugify(e.title) === slug);
                        if (found) {
                            return {
                                title: `${found.title} | ${ti.name}`,
                                description: found.description?.substring(0, 160),
                                image: ti.logo || meta.image,
                                type: 'website',
                                jsonLd: {
                                    "@context": "https://schema.org",
                                    "@type": "Event",
                                    "name": found.title,
                                    "location": { "@type": "Place", "name": ti.name }
                                }
                            };
                        }
                    }
                }
            }

        } catch (e) { console.error('[SSR] Error in getDataBySlug:', e); }
        return null;
    };


    // --- Route Matching ---

    // 1. Teacher Profile (Vanity or Slug)
    if (segments.length === 1 && !RESERVED_PATHS.includes(segments[0]) && segments[0] !== '') {
        const data = await getTeacherMeta(segments[0]);
        if (data) meta = { ...meta, ...data };
    }
    else if (segments[0] === 'teacher' && segments[1]) {
        const data = await getTeacherMeta(segments[1]);
        if (data) meta = { ...meta, ...data };
    }
    // 2. Course
    else if ((segments[0] === 'course' || segments[0] === 'courses') && segments[1]) {
        const data = await getCourseMeta(segments[1]);
        if (data) meta = { ...meta, ...data };
    }
    // 3. Class (Individual)
    else if ((segments[0] === 'class' || segments[0] === 'classes') && segments[1]) {
        const data = await getDataBySlug('class', segments[1]);
        if (data) meta = { ...meta, ...data };
    }
    // 4. Quiz
    else if ((segments[0] === 'quiz' || segments[0] === 'quizzes') && segments[1]) {
        const data = await getDataBySlug('quiz', segments[1]);
        if (data) meta = { ...meta, ...data };
    }
    // 5. Event
    // 6. Programmatic SEO: /best-combined-mathematics-classes-in-colombo
    // Pattern: /best-(.+)-classes-in-(.+)
    const seoMatch = cleanPath.match(/^best-(.+)-classes-in-(.+)$/);
    if (seoMatch) {
        const subjectSlug = seoMatch[1];
        const locationSlug = seoMatch[2];
        const subject = subjectSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const city = locationSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        meta = {
            ...meta,
            title: `Best ${subject} Classes in ${city} | Top Tutors & Institutes`,
            description: `Find the best ${subject} classes in ${city}. Compare top-rated tutors, check fees, and enroll online on Clazz.lk.`,
            // Optional: Inject breadcrumb JSON-LD
            jsonLd: {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [{
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "https://clazz.lk"
                }, {
                    "@type": "ListItem",
                    "position": 2,
                    "name": `${subject} Classes in ${city}`
                }]
            }
        };
    }
    else if (segments[0] === 'event' && segments[1]) {
        const data = await getDataBySlug('event', segments[1]);
        if (data) meta = { ...meta, ...data };
    }


    const indexHtml = await getIndexHtml();

    if (!indexHtml) {
        console.error("Could not load index.html");
        return res.status(503).send("Service Unavailable.");
    }

    const finalHtml = injectMeta(indexHtml, meta);

    res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.send(finalHtml);
});

exports.ssrHandler = onRequest({ cors: true }, app);
