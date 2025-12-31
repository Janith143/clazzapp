const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: "clazz2-new"
    });
}

const db = getFirestore('clazzdb2');

async function verify() {
    console.log("Verifying config...");
    const doc = await db.collection('settings').doc('clientAppConfig').get();
    if (doc.exists) {
        console.log("Current URLs:", JSON.stringify(doc.data().functionUrls, null, 2));
    } else {
        console.log("Config not found.");
    }
}

verify().catch(console.error);
