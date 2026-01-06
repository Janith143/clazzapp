
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { sendNotification } from '../utils';

export interface UserNotification {
    id?: string;
    recipientId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    link?: string;
    isRead: boolean;
    createdAt: any;
    metadata?: any;
}

/**
 * Sends a unified notification to a user.
 * 1. Creates an in-app notification in 'user_notifications' collection.
 * 2. Sends an Email/SMS via the existing sendNotification utility (if contact info provided).
 */
export const notifyUser = async (
    recipient: { id: string; email?: string; phone?: string; name?: string },
    title: string,
    message: string,
    options?: {
        type?: 'info' | 'success' | 'warning' | 'error';
        link?: string;
        metadata?: any;
        emailHtml?: string;
        smsMessage?: string;
        notificationUrl?: string; // function URL for email
    }
) => {
    try {
        // 1. In-App Notification
        await addDoc(collection(db, 'user_notifications'), {
            recipientId: recipient.id,
            title,
            message,
            type: options?.type || 'info',
            link: options?.link || null,
            isRead: false,
            createdAt: serverTimestamp(),
            metadata: options?.metadata || null
        });

        // 2. Email / SMS (if configured)
        if (options?.notificationUrl) {
            let htmlBody = options.emailHtml;
            if (!htmlBody) {
                // Default simple template
                htmlBody = `
                    <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
                        <h2>${title}</h2>
                        <p>${message}</p>
                        ${options.link ? `<p><a href="${options.link}">View Details</a></p>` : ''}
                        <p>The Clazz.lk Team</p>
                    </div>
                `;
            }

            await sendNotification(
                options.notificationUrl,
                { email: recipient.email, contactNumber: recipient.phone },
                title,
                htmlBody,
                options.smsMessage
            );
        }

    } catch (error) {
        console.error("Error sending notification:", error);
        // Don't throw, so we don't break the main flow if notification fails
    }
};
