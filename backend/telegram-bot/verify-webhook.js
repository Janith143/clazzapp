const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fetch = require('node-fetch'); // Ensure node-fetch is used if fetch is not global

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'clazz2-new'
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
            console.log("To set it, run:");
            // Construct the expected URL based on the actual deployed function
            const expectedUrl = "https://asia-south1-clazz2-new.cloudfunctions.net/telegramBot";
            console.log(`curl "https://api.telegram.org/bot${token}/setWebhook?url=${expectedUrl}"`);
        }

    } catch (error) {
        console.error("Execution Code Error:", error);
    }
}

checkWebhook();
