const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        admin.initializeApp();
        console.log("Firebase Admin initialized");
    } catch (e) {
        console.error("Firebase Admin initialization failed", e);
    }
}
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Helper to get Telegram Config
const getTelegramConfig = async () => {
    try {
        const configDoc = await db.collection('settings').doc('appConfig').get();
        if (!configDoc.exists) {
            console.log("appConfig document does not exist");
            return {};
        }
        const config = configDoc.data();
        return config?.supportSettings || {};
    } catch (error) {
        console.error("Error reading from Firestore:", error);
        throw error;
    }
};

// --- Handlers ---

const handleSendMessage = async (req, res) => {
    const { chatId, text, userLanguage, userId } = req.body;
    
    console.log("Processing sendMessage for chatId:", chatId, "User ID:", userId);

    try {
        let config;
        try {
            config = await getTelegramConfig();
        } catch (dbError) {
            return res.status(500).json({ success: false, error: "Database error: " + dbError.message });
        }

        const { telegramBotToken, telegramChatId } = config;
        
        if (!telegramBotToken || !telegramChatId) {
            console.error("Telegram settings missing. Token:", !!telegramBotToken, "ChatID:", !!telegramChatId);
            return res.status(500).json({ success: false, error: "Telegram settings not configured in Admin Dashboard." });
        }

        // Updated message template to include User ID
        const message = `🔔 New Support Message\n\nUser ID: ${userId || 'Guest'}\nChat ID: ${chatId}\nLanguage: ${userLanguage}\n\n${text}`;
        
        const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

        // Use global fetch (Node 20+)
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: telegramChatId,
                text: message
            })
        });
        
        const result = await response.json();
        
        if (!result.ok) {
            console.error("Telegram API Error:", result);
            throw new Error(`Telegram API Error: ${result.description}`);
        }
        
        console.log("Message sent to Telegram successfully");
        res.status(200).json({ success: true });

    } catch (error) {
        console.error("Error sending to Telegram:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const handleWebhook = async (req, res) => {
    const update = req.body;
    
    // 1. Basic Validation: Is this a message?
    if (!update || !update.message) {
        // Return 200 to acknowledge other types of updates (typing, status changes, etc.) so Telegram doesn't retry
        return res.status(200).send('OK');
    }

    const message = update.message;

    // 2. Reply Validation: Is this a reply to another message?
    // We only forward messages where the Agent explicitly replies to a User's forwarded message
    if (!message.reply_to_message) {
        console.log("Webhook ignored: Message is not a reply.");
        return res.status(200).send('OK');
    }

    // 3. Content Extraction: Handle Text or Captions (for images/files)
    // If the agent sends a photo without a caption, we use a placeholder.
    const replyText = message.text || message.caption || "[Media/File Sent]";
    
    // 4. ID Extraction: Look at the ORIGINAL message being replied to
    const originalText = message.reply_to_message.text || message.reply_to_message.caption || "";

    // Regex to find "Chat ID: <id>"
    // Supports: "Chat ID: 123", "Chat ID:123", "chat id: 123", handles newlines
    const chatIDRegex = /Chat ID:\s*([a-zA-Z0-9\-_]+)/i;
    const match = originalText.match(chatIDRegex);
    
    if (match && match[1]) {
        const chatId = match[1];
        console.log(`Webhook: Found Chat ID ${chatId}. Forwarding agent reply...`);
        
        try {
            // Add agent reply to Firestore
            await db.collection('supportChats').doc(chatId).collection('messages').add({
                text: replyText,
                sender: 'agent',
                timestamp: new Date().toISOString()
            });
            console.log(`Webhook: Successfully forwarded to Firestore Chat ID: ${chatId}`);
        } catch (error) {
            console.error("Webhook Error: Failed to save to Firestore", error);
        }
    } else {
        console.warn("Webhook Warning: Could not find 'Chat ID' in the original message. Agent must reply to a message containing the ID header.");
        console.log("Original Text was:", originalText.substring(0, 50) + "...");
    }
    
    // Always return 200 OK to Telegram
    res.status(200).send('OK');
};

// --- Routes ---

app.post('/sendMessageToTelegram', handleSendMessage);
app.post('/telegramWebhook', handleWebhook);

// Health check
app.get('/', (req, res) => {
    res.status(200).send('Telegram Bot Service is running');
});

// CATCH-ALL POST HANDLER: Handles requests sent to root /
app.post('/', async (req, res) => {
    console.log('Received POST at root /');
    
    // If body contains chatId, it's a message from the app
    if (req.body && (req.body.chatId || req.body.text)) {
        console.log('Routing to sendMessage handler');
        return handleSendMessage(req, res);
    }
    
    // If body looks like a Telegram Update object
    if (req.body && (req.body.message || req.body.update_id || req.body.callback_query)) {
        console.log('Routing to webhook handler');
        return handleWebhook(req, res);
    }

    // Default
    console.log('Request body did not match known handlers:', req.body);
    res.status(200).send('Service active. Please check your URL path.');
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Telegram Bot Service listening on port ${PORT}`);
});