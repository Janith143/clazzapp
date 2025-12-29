const { onDocumentCreated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

// Set global options, e.g., region
setGlobalOptions({ region: "asia-south1" });

// Connect to the specific named database used by the client
const db = getFirestore('clazzdb2');

/**
 * Trigger: When a new Teacher is created, ensure a corresponding User exists.
 * This prevents "Orphaned Teacher" scenarios where a teacher profile exists 
 * but the user cannot log in because the 'users' doc is missing.
 */
exports.ensureUserExistsForTeacher = onDocumentCreated(
    {
        document: "teachers/{teacherId}",
        database: "clazzdb2" // Explicitly target the named db trigger
    },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) {
            console.log("No data associated with the event");
            return;
        }

        const teacherId = event.params.teacherId;
        const teacherData = snapshot.data();

        console.log(`Checking user existence for new teacher: ${teacherId}`);

        try {
            const userRef = db.collection('users').doc(teacherId);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                console.log(`User document missing for teacher ${teacherId}. Auto-creating now.`);

                // Construct User Data from Teacher Data
                const newUserData = {
                    id: teacherId,
                    firstName: teacherData.firstName || teacherData.name?.split(' ')[0] || 'Teacher',
                    lastName: teacherData.lastName || teacherData.name?.split(' ').slice(1).join(' ') || '',
                    email: teacherData.email || teacherData.contact?.email || '',
                    role: 'teacher',
                    isTeacher: true,
                    profileImage: teacherData.profileImage || teacherData.avatar || '',
                    avatar: teacherData.avatar || teacherData.profileImage || '',
                    createdAt: new Date().toISOString(),
                    syncedFromTeacher: true, // Flag to track these auto-created accounts
                    autoCreatedByTrigger: true
                };

                await userRef.set(newUserData);
                console.log(`Successfully created user doc for ${teacherId}`);
            } else {
                console.log(`User document already exists for ${teacherId}. No action needed.`);
            }
        } catch (error) {
            console.error(`Error ensuring user exists for ${teacherId}:`, error);
        }
    }
);

/**
 * Trigger: When a User is DELETED, delete the corresponding Teacher profile.
 * This prevents "Orphaned Teacher" scenarios where a User is removed (e.g., admin deletes user)
 * but the Teacher profile remains public.
 */
exports.cleanupTeacherOnUserDelete = onDocumentDeleted(
    {
        document: "users/{userId}",
        database: "clazzdb2"
    },
    async (event) => {
        const userId = event.params.userId;
        console.log(`User deleted: ${userId}. Checking for linked teacher profile...`);

        try {
            const teacherRef = db.collection('teachers').doc(userId);
            const teacherDoc = await teacherRef.get();

            if (teacherDoc.exists) {
                console.log(`Found orphaned teacher profile for deleted user ${userId}. Deleting teacher profile...`);
                await teacherRef.delete();
                console.log(`Successfully deleted teacher profile for ${userId}`);
            } else {
                console.log(`No linked teacher profile found for ${userId}.`);
            }
        } catch (error) {
            console.error(`Error cleaning up teacher for ${userId}:`, error);
        }
    }
);
