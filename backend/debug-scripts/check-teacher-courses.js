const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json'); // Assumed/standard location or using default credential if available

// If you don't have a service key file locally, we might rely on default credentials if logged in via CLI.
// However, typically in these environments, we use admin.initializeApp() with no args if running in Cloud Functions, 
// or we need to find where the creds are. 
// Given the user context, I see `backend/fcm-notifications/index.js` uses default init.
// But running locally with `node` might fail without GOOGLE_APPLICATION_CREDENTIALS.
// Let's try standard init and see.

try {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: "clazz2-new"
    });
} catch (e) {
    if (!admin.apps.length) admin.initializeApp();
}

const db = admin.firestore();

async function checkTeacher() {
    const teacherId = 'TID0100RM';
    console.log(`Checking for teacher: ${teacherId}`);

    // 1. Try Doc ID check
    let doc = await db.collection('teachers').doc(teacherId).get();

    if (!doc.exists) {
        console.log(`No document found with ID ${teacherId}. Checking fields...`);
        // 2. Try Field check (e.g. maybe 'tid' or 'username'?)
        const snapshot = await db.collection('teachers').where('id', '==', teacherId).get();
        if (snapshot.empty) {
            const snapshot2 = await db.collection('teachers').where('tid', '==', teacherId).get();
            if (snapshot2.empty) {
                console.log("Teacher not found by ID or tid field.");
                // List all teachers just to be safe (briefly)
                // const all = await db.collection('teachers').limit(5).get();
                // all.forEach(d => console.log(d.id, d.data().name));
                return;
            }
            doc = snapshot2.docs[0];
        } else {
            doc = snapshot.docs[0];
        }
    }

    console.log(`Found Teacher: ${doc.id} (${doc.data().name})`);

    const data = doc.data();
    const courses = data.courses || [];
    console.log(`Total Courses: ${courses.length}`);

    courses.forEach((c, index) => {
        console.log(`[${index}] ${c.title} (ID: ${c.id})`);
        console.log(`    Status: ${c.adminApproval}`);
        console.log(`    Published: ${c.isPublished}`);
        console.log(`    Deleted: ${c.isDeleted}`);
    });
}

checkTeacher().catch(console.error);
