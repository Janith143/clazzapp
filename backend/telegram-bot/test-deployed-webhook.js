const fetch = require('node-fetch');

const WEBHOOK_URL = 'https://asia-south1-clazz2-new.cloudfunctions.net/telegramBot';

async function testWebhook() {
    const payload = {
        update_id: 123456789,
        message: {
            message_id: 55,
            from: {
                id: 987654321,
                is_bot: false,
                first_name: "Test",
                username: "testuser"
            },
            chat: {
                id: -100123456789,
                title: "Test Group",
                type: "supergroup"
            },
            date: 1678900000,
            text: "This is a reply from the agent",
            reply_to_message: {
                message_id: 50,
                from: {
                    id: 1122334455, // Bot ID
                    is_bot: true,
                    first_name: "Support Bot"
                },
                chat: {
                    id: -100123456789,
                    title: "Test Group",
                    type: "supergroup"
                },
                date: 1678899000,
                text: "🔔 New Support Message\n\nUser ID: Guest\nChat ID: test-webhook-chat-001\nLanguage: en\n\nHello, I need help!"
            }
        }
    };

    try {
        console.log(`Sending simulated webhook to: ${WEBHOOK_URL}`);
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log(`Response Status: ${response.status}`);
        console.log(`Response Body: ${text}`);

        if (response.status === 200) {
            console.log("✅ Success! The endpoint is reachable and accepted the payload.");
        } else {
            console.log("❌ Failed! The endpoint returned an error.");
        }

    } catch (error) {
        console.error("Error executing request:", error);
    }
}

testWebhook();
