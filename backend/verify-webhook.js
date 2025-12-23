const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (!admin.apps.length) {
    // You might need to set GOOGLE_APPLICATION_CREDENTIALS env var if running locally
    // or rely on default credentials if signed in via gcloud
    admin.initializeApp({
        projectId: 'clazz2-new' // Hardcoding project ID based on context
    });
}

const db = getFirestore();

async function checkWebhook() {
    try {
        console.log("Reading config...");
        const configDoc = await db.collection('settings').doc('clientAppConfig').get();
        if (!configDoc.exists) {
            console.error("Error: 'settings/clientAppConfig' document not found.");
            return;
        }

        const config = configDoc.data().supportSettings;
        if (!config || !config.telegramBotToken) {
            console.error("Error: Telegram Bot Token not found in Firestore.");
            return;
        }

        const token = config.telegramBotToken;
        console.log(`Found token: ${token.substring(0, 5)}...`);

        const url = `https://api.telegram.org/bot${token}/getWebhookInfo`;
        const response = await fetch(url);
        const data = await response.json();

        console.log("\n--- Telegram Webhook Status ---");
        console.log(JSON.stringify(data, null, 2));
        console.log("-------------------------------\n");

        if (data.ok && data.result.url) {
            console.log("Current Webhook URL:", data.result.url);
        } else {
            console.log("⚠️ Webhook is NOT set or invalid.");
        }

    } catch (error) {
        console.error("Execution Code Error:", error);
    }
}

checkWebhook();
