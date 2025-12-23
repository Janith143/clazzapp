// This Cloud Function is dedicated to fetching images from Google Drive using v2 syntax.

const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
setGlobalOptions({ region: "asia-south1" });
const { google } = require('googleapis');
const { logger } = require("firebase-functions");

const drive = google.drive('v3');

/**
 * Extracts the folder ID from a standard Google Drive folder URL.
 * @param {string} url The public URL of the Google Drive folder.
 * @returns {string|null} The extracted folder ID or null if not found.
 */
const extractFolderId = (url) => {
    if (!url) return null;
    const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
};

// Define the Cloud Function using the v2 onRequest handler.
exports.gdriveImageFetcher = onRequest({ cors: true }, async (req, res) => {
    // A health check for GET requests to the root.
    if (req.method === 'GET') {
        res.status(200).send('gdrive-image-fetcher service is running.');
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).send({ success: false, message: 'Method Not Allowed.' });
    }

    const { url: folderUrl, apiKey } = req.body;

    if (!folderUrl) {
        return res.status(400).send({ success: false, message: 'Google Drive folder URL is required.' });
    }

    const folderId = extractFolderId(folderUrl);
    if (!folderId) {
        return res.status(400).send({ success: false, message: 'Invalid Google Drive folder URL format. Please use the full URL from the address bar.' });
    }

    if (!apiKey) {
        logger.error('API key was not provided in the request body.');
        // User-facing error message is generic as requested.
        return res.status(500).send({ success: false, message: 'Server is not configured correctly.' });
    }

    try {
        const response = await drive.files.list({
            key: apiKey,
            q: `'${folderId}' in parents and mimeType contains 'image/'`,
            fields: 'files(id, name, thumbnailLink, webViewLink)',
            pageSize: 200, // Limit to 200 images per folder for this implementation
        });

        if (!response.data.files || response.data.files.length === 0) {
            return res.status(404).send({ success: false, message: 'No image files found. Make sure the folder is public ("Anyone with the link") and contains images.' });
        }

        const photos = response.data.files.map(file => ({
            id: file.id,
            url_thumb: file.thumbnailLink,
            url_highres: file.thumbnailLink ? file.thumbnailLink.replace(/=s\d+$/, '=s1600') : file.webViewLink,
            photographer: file.name,
        }));

        res.status(200).send({ success: true, photos });

    } catch (error) {
        logger.error('Google Drive API Error:', error.message, { error });
        let userMessage = 'An error occurred while fetching images from Google Drive.';
        // The `google-api-nodejs-client` library throws errors with a `code` property.
        if (error.code === 403) {
            userMessage = 'API key error or folder is not public. Please check sharing settings ("Anyone with the link").';
        } else if (error.code === 404) {
            userMessage = 'Folder not found. Please check the link and sharing permissions.';
        } else if (error.message && error.message.includes('API key not valid')) {
            userMessage = 'The provided API key is not valid for Google Drive API.';
        }
        res.status(500).send({ success: false, message: userMessage });
    }
});