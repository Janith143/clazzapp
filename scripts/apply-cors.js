
const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json"); // We might need to find where the key is or use default credentials

// Initialize the app with a service account, granting admin privileges
// Try to use application default credentials if no service account file is found
try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "clazz2-new.firebasestorage.app",
    });
} catch (e) {
    console.log("Service account not found or invalid, trying default credentials...");
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            storageBucket: "clazz2-new.firebasestorage.app",
        });
    } catch (e2) {
        console.error("Failed to initialize admin app", e2);
        process.exit(1);
    }
}

const bucket = admin.storage().bucket();

const corsConfiguration = [
    {
        origin: ["https://app.clazz.lk", "http://localhost:5173", "https://clazz.lk"],
        method: ["GET"],
        maxAgeSeconds: 3600,
    },
];

bucket.setCorsConfiguration(corsConfiguration)
    .then(() => {
        console.log("CORS configuration applied successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Error applying CORS configuration:", error);
        process.exit(1);
    });
