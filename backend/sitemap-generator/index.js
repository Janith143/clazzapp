const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { logger } = require("firebase-functions");

admin.initializeApp();
const db = admin.firestore();

const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-');        // Replace multiple - with single -
};

exports.generateSitemap = onRequest({ region: "us-central1" }, async (req, res) => {
    try {
        const baseUrl = "https://clazz.lk";
        const urls = [];

        // 1. Static Pages
        const staticPages = [
            "",
            "/teachers",
            "/courses",
            "/classes",
            "/quizzes",
            "/events",
            "/store",
            "/gift-voucher",
            "/login",
            "/register"
        ];

        staticPages.forEach(page => {
            urls.push({
                loc: `${baseUrl}${page}`,
                changefreq: 'daily',
                priority: page === "" ? '1.0' : '0.8'
            });
        });

        // 2. Teachers (Approved & Published)
        const teachersSnap = await db.collection('teachers')
            .where('registrationStatus', '==', 'approved')
            .get();

        teachersSnap.forEach(doc => {
            const t = doc.data();
            // Filter out if explicitly false (some might be undefined which counts as visible usually, but let's be strict if needed)
            // Frontend logic: (teacher.registrationStatus === 'approved' && teacher.isPublished !== false)
            if (t.isPublished !== false) {
                const slug = t.username || t.id; // use username if avail, else ID. 
                // Wait, frontend uses /teacher/slug. If username missing, it uses /teacher_profile?teacherId=... in some old logic 
                // but TeacherProfilePage handles `slug` prop. 
                // Ideally prompt teachers to set username.
                // If no username, maybe omit or use ID if route supports it?
                // Route '/teacher/:slug' likely supports ID if not conflicting.
                // Let's assume username is preferred.
                const path = t.username ? `/teacher/${t.username}` : `/teacher/${t.id}`;
                urls.push({
                    loc: `${baseUrl}${path}`,
                    changefreq: 'weekly',
                    priority: '0.9'
                });
            }
        });

        // 3. Courses (Published & Not Deleted)
        // Iterating teachers to access their sub-collections or array data
        // Let's check logic: useData uses `courses` collection???
        // DataContext.tsx: `onSnapshot(collection(db, "teachers")...` -> teachers contain courses?
        // Teacher object has `courses: Course[]`.
        // So courses are INSIDE teacher documents?
        // Check `types/teacher.ts`.
        // Yes line 111 of commerce.ts (Wait `TuitionInstitute`... `Teacher`?)
        // Let's check Teacher type.
        // Teacher has `courses`.
        // BUT they might ALSO be in a root collection `courses` for searching?
        // If they are ONLY in teacher doc, I assume `teachersSnap` already has them if I fetched whole docs.
        // `teachersSnap` (from 'teachers' col) -> data has `courses` array.
        // So I can iterate `teachersSnap` data.

        // RE-ITERATE Teachers for Courses
        teachersSnap.forEach(doc => {
            const t = doc.data();
            if (t.courses && Array.isArray(t.courses)) {
                t.courses.forEach(c => {
                    if (c.isPublished && !c.isDeleted) {
                        const slug = slugify(c.title);
                        // URL: /course/:slug
                        // Problem: Duplicates? Course titles not unique?
                        // Frontend `resolvedCourseId` logic (step 1453 line 36) finds course by slugify(title).
                        // If duplicates exist, it picks first.
                        // I will assume slugs are used.
                        urls.push({
                            loc: `${baseUrl}/course/${slug}`,
                            changefreq: 'weekly',
                            priority: '0.8',
                            lastmod: c.updatedAt || new Date().toISOString().split('T')[0] // Fallback
                        });
                    }
                });
            }
        });

        // 4. Events (Published & Not Deleted)
        // Teachers have `events`. Institutes have `events`.
        // Also `events` root collection?
        // `useData` fetches `events`? 
        // `useData`: `teachers`... `tuitionInstitutes`...
        // `AllEventsPage` logic? uses `teachers` and `tuitionInstitutes` to aggregate events.
        // So events are embedded.

        // RE-ITERATE Teachers for Events
        teachersSnap.forEach(doc => {
            const t = doc.data();
            if (t.events && Array.isArray(t.events)) {
                t.events.forEach(e => {
                    if (e.isPublished && !e.isDeleted) {
                        urls.push({
                            loc: `${baseUrl}/event/${e.id}`,
                            changefreq: 'weekly',
                            priority: '0.7'
                        });
                    }
                });
            }
        });

        // Institutes Events
        const institutesSnap = await db.collection('tuitionInstitutes')
            .where('registrationStatus', '==', 'approved')
            .get();

        institutesSnap.forEach(doc => {
            const ti = doc.data();
            if (ti.events && Array.isArray(ti.events)) {
                ti.events.forEach(e => {
                    // Check if not already added? (Teachers might be participants, but organizer is TI)
                    // If event is hosted by TI, it's in TI events.
                    if (e.isPublished && !e.isDeleted) {
                        // Avoid duplicates if I added check? Map usage?
                        // For now, assume IDs unique.
                        urls.push({
                            loc: `${baseUrl}/event/${e.id}`,
                            changefreq: 'weekly',
                            priority: '0.7'
                        });
                    }
                });
            }
        });

        // Construct XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

        urls.forEach(u => {
            xml += `
  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
  </url>`;
        });

        xml += `
</urlset>`;

        res.set('Content-Type', 'application/xml');
        res.status(200).send(xml);

    } catch (error) {
        logger.error("Sitemap generation failed", error);
        res.status(500).send("Internal Server Error");
    }
});
