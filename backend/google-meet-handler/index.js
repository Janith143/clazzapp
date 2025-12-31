

const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
setGlobalOptions({ region: "asia-south1" });
const express = require('express');
const { google } = require('googleapis');
const admin = require('firebase-admin');
const { logger } = require("firebase-functions");

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
    admin.initializeApp();
}
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('clazzdb2');

const app = express();
app.use(require('cors')({ origin: true }));
app.use(express.json());


// Helper to get System Config
async function getConfig() {
    try {
        const configDoc = await db.collection('settings').doc('system_config').get();
        if (configDoc.exists) {
            return { ...process.env, ...configDoc.data() };
        }
    } catch (error) {
        logger.error("Error fetching system_config:", error);
    }
    return process.env;
}

// --- 1. Start the Authentication Flow ---
app.get('/googleAuthRedirect', async (req, res) => {
    const { teacherId } = req.query;
    if (!teacherId) {
        return res.status(400).send('Teacher ID is required.');
    }

    const config = await getConfig();
    const GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = config.GOOGLE_CLIENT_SECRET;
    // Dynamic Redirect URI based on current host
    const REDIRECT_URI = 'https://asia-south1-clazz2-new.cloudfunctions.net/googleMeetHandler/googleAuthCallback';

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        logger.error("Google OAuth credentials missing in settings/system_config.");
        return res.status(500).send('Server configuration error on OAuth credentials.');
    }

    const oauth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        REDIRECT_URI
    );

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.events'],
        state: Buffer.from(JSON.stringify({ teacherId, redirect_base: `https://${req.get('host')}` })).toString('base64'),
    });
    res.redirect(authUrl);
});


// --- 2. Handle the Callback from Google ---
app.get('/googleAuthCallback', async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state) {
        return res.status(400).send('Missing code or state from Google callback.');
    }

    try {
        const { teacherId } = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        if (!teacherId) {
            throw new Error("Invalid state: teacherId missing.");
        }

        const { tokens } = await oauth2Client.getToken(code);
        const refreshToken = tokens.refresh_token;

        const teacherRef = db.collection('teachers').doc(teacherId);

        if (refreshToken) {
            // Only update the refresh token if a new one is provided.
            await teacherRef.update({
                googleRefreshToken: refreshToken,
            });
            logger.log(`Successfully stored new refresh token for teacher ${teacherId}`);
        } else {
            // This is expected if the user has already granted offline access.
            // The existing token remains valid until revoked.
            logger.warn("No new refresh token received for teacher:", teacherId, "This is expected on subsequent authentications.");
        }

        // Redirect to the index page which will then load the teacher's profile via JS
        res.redirect(`https://clazz.lk/?teacherId=${teacherId}`);


    } catch (error) {
        logger.error('Error during Google auth callback:', error);
        res.status(500).send('Authentication failed. Please try again.');
    }
});


// --- 3. Create or Update a Google Meet Link ---
app.post('/createGoogleMeet', async (req, res) => {
    const { teacherId, title, startTime, endTime, date, googleEventId } = req.body;

    if (!teacherId || !title || !startTime || !endTime || !date) {
        return res.status(400).send({ success: false, message: 'Missing required class details.' });
    }

    try {
        const teacherRef = db.collection('teachers').doc(teacherId);
        const doc = await teacherRef.get();

        if (!doc.exists) {
            return res.status(404).send({ success: false, message: 'Teacher not found.' });
        }
        const teacherData = doc.data();
        const refreshToken = teacherData.googleRefreshToken;

        if (!refreshToken) {
            return res.status(403).send({ success: false, message: 'Teacher has not connected their Google account.' });
        }

        const config = await getConfig();
        const GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;
        const GOOGLE_CLIENT_SECRET = config.GOOGLE_CLIENT_SECRET;
        // Redirect URI must match what was sent during auth flow exactly
        const REDIRECT_URI = 'https://asia-south1-clazz2-new.cloudfunctions.net/googleMeetHandler/googleAuthCallback';

        const oauth2Client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            REDIRECT_URI
        );

        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const eventResource = {
            summary: title,
            description: `This is an online class for clazz.lk.`,
            start: {
                dateTime: `${date}T${startTime}:00`,
                timeZone: 'Asia/Colombo',
            },
            end: {
                dateTime: `${date}T${endTime}:00`,
                timeZone: 'Asia/Colombo',
            },
        };

        if (googleEventId) {
            logger.log(`Patching Google Calendar event ${googleEventId} for teacher ${teacherId}`);
            // Using PATCH to avoid overwriting the conference data.
            await calendar.events.patch({
                calendarId: 'primary',
                eventId: googleEventId,
                resource: eventResource,
            });

            // After patching, explicitly GET the event to ensure we have the hangoutLink
            const updatedEvent = await calendar.events.get({
                calendarId: 'primary',
                eventId: googleEventId,
                fields: 'hangoutLink' // We only need this one field
            });

            const meetLink = updatedEvent.data.hangoutLink;
            if (!meetLink) {
                throw new Error("Failed to retrieve the Google Meet link after updating the event.");
            }

            logger.log(`Successfully patched event. Meet link confirmed: ${meetLink}`);
            res.status(200).send({ success: true, meetLink, eventId: googleEventId });

        } else {
            logger.log(`Creating new Google Calendar event for teacher ${teacherId}`);
            const event = {
                ...eventResource,
                conferenceData: {
                    createRequest: {
                        requestId: `clazz-${teacherId}-${Date.now()}`,
                        conferenceSolutionKey: { type: 'hangoutsMeet' }
                    }
                },
            };

            const response = await calendar.events.insert({
                calendarId: 'primary',
                resource: event,
                conferenceDataVersion: 1,
            });

            const meetLink = response.data.hangoutLink;
            const eventId = response.data.id;

            if (!meetLink || !eventId) {
                throw new Error("Google Calendar API did not return a Meet link or event ID.");
            }
            logger.log(`Created Meet link for teacher ${teacherId}: ${meetLink}`);
            res.status(200).send({ success: true, meetLink: meetLink, eventId: eventId });
        }

    } catch (error) {
        logger.error(`Error creating/updating Google Meet for teacher ${teacherId}:`, error);
        res.status(500).send({ success: false, message: 'Failed to create or update Google Meet link.' });
    }
});


const PORT = process.env.PORT || 8080;
if (require.main === module) {
    app.listen(PORT, () => {
        logger.log(`Server listening on port ${PORT}`);
    });
}

exports.googleMeetHandler = onRequest({ cors: true }, app);