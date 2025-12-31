const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: "clazz2-new"
    });
}

const db = getFirestore('clazzdb2');

async function updateFunctionUrls() {
    console.log("Reading current config...");
    const configRef = db.collection('settings').doc('clientAppConfig');
    const doc = await configRef.get();

    if (!doc.exists) {
        console.error("Config document not found!");
        return;
    }

    const currentData = doc.data();
    console.log("Current Function URLs:", currentData.functionUrls);

    // Define the correct standard URLs for 2nd Gen functions in asia-south1
    const correctUrls = {
        marxPayment: 'https://asia-south1-clazz2-new.cloudfunctions.net/marxPaymentHandler',
        payment: 'https://asia-south1-clazz2-new.cloudfunctions.net/paymentHandler',
    };

    const updatedUrls = {
        ...currentData.functionUrls,
        ...correctUrls
    };

    console.log("Updating to:", updatedUrls);

    await configRef.update({
        functionUrls: updatedUrls
    });

    console.log("Successfully updated function URLs in Firestore.");
}

updateFunctionUrls().catch(console.error);
