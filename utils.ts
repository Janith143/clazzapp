
import { User, Teacher, IndividualClass } from './types';
import { ContentState, convertFromRaw } from 'draft-js';

// Notification URL is now passed dynamically
// const NOTIFICATION_FUNCTION_URL = ...;


/**
 * Sends a generic notification by calling our secure backend Cloud Function.
 * This can be used for both email and SMS.
 */
export const sendNotification = async (
    notificationUrl: string,
    recipient: { email?: string | null; contactNumber?: string | null },
    subject: string,
    htmlBody: string,
    smsMessage?: string,
) => {

    try {
        const payload: any = {};
        if (recipient.email) {
            payload.toEmail = recipient.email;
            payload.subject = subject;
            payload.htmlBody = htmlBody;
        }
        if (smsMessage && recipient.contactNumber) {
            let sanitizedNumber = recipient.contactNumber.replace(/[^0-9]/g, '');
            if (sanitizedNumber.startsWith('0')) {
                sanitizedNumber = '94' + sanitizedNumber.substring(1);
            }
            payload.toSms = sanitizedNumber;
            payload.smsMessage = smsMessage;
        }

        if (Object.keys(payload).length === 0) {
            console.warn("No contact info provided for notification.");
            return;
        }

        if (notificationUrl.includes('YOUR_PROJECT_ID')) {
            console.log("Simulating sending notification (Please update the Cloud Function URL in utils.ts):", payload);
            return;
        }

        const response = await fetch(notificationUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to send notification: ${errorBody}`);
        }
        console.log(`Notification request sent successfully for subject: ${subject}`);

    } catch (error) {
        console.error("Failed to send notification:", error);
    }
};


/**
 * Calculates the average rating and count from an array of rating objects.
 */
export const getAverageRating = (ratings: any[] | undefined): { average: number; count: number } => {
    if (!ratings || ratings.length === 0) {
        return { average: 0, count: 0 };
    }
    const total = ratings.reduce((acc, r) => acc + r.rating, 0);
    return {
        average: total / ratings.length,
        count: ratings.length,
    };
};

/**
 * Creates a srcset string for responsive images from various providers.
 */
export const createSrcSet = (baseUrl: string, sizes: number[]): string => {
    if (!baseUrl) return '';
    return sizes
        .map(size => {
            let url = baseUrl;
            try {
                if (url.includes('images.unsplash.com')) {
                    const urlObj = new URL(url);
                    urlObj.searchParams.set('w', size.toString());
                    urlObj.searchParams.set('fit', 'crop');
                    url = urlObj.toString();
                } else if (url.includes('picsum.photos')) {
                    const parts = url.split('/');
                    if (parts.length >= 6 && !isNaN(parseInt(parts[parts.length - 2], 10))) {
                        const originalWidth = parseInt(parts[parts.length - 2], 10);
                        const originalHeight = parseInt(parts[parts.length - 1], 10);

                        parts[parts.length - 2] = size.toString();

                        if (!isNaN(originalHeight) && originalWidth > 0) {
                            parts[parts.length - 1] = Math.round((originalHeight / originalWidth) * size).toString();
                        }
                        url = parts.join('/');
                    }
                }
            } catch (e) {
                // Fallback if URL parsing fails
                return `${baseUrl} ${size}w`;
            }
            return `${url} ${size}w`;
        })
        .join(', ');
};

/**
 * Generates an optimized thumbnail URL for supported providers.
 * For Google-hosted images (lh3.googleusercontent.com, drive storage), it appends size params.
 * For Unsplash/Picsum, it adjusts query params.
 * For others, returns original.
 */
export const getOptimizedImageUrl = (url: string, width: number, height?: number): string => {
    if (!url) return '';

    // HOTFIX: Replace old bucket URL with new bucket URL
    if (url.includes('clazz2-9e0a9.firebasestorage.app')) {
        url = url.replace('clazz2-9e0a9.firebasestorage.app', 'clazz2-new.firebasestorage.app');
    }

    // Google User Content (Drive, Auth Profiles)
    // Supports patterns like lh3.googleusercontent.com/...
    // Also handles standard Google Drive file links
    if (url.includes('googleusercontent.com') || url.includes('drive-storage')) {
        // Remove existing size params if present (e.g., =s1600)
        const baseUrl = url.split('=')[0];
        if (height && width === height) {
            return `${baseUrl}=s${width}-c`; // Square crop
        }
        return `${baseUrl}=s${width}`; // Scale width
    }

    // Google Drive File URLs
    if (url.includes('drive.google.com')) {
        // Transform https://drive.google.com/file/d/{ID}/view... to direct link
        const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
            return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
        }
    }

    // Unsplash
    if (url.includes('images.unsplash.com')) {
        try {
            const urlObj = new URL(url);
            urlObj.searchParams.set('w', width.toString());
            if (height) urlObj.searchParams.set('h', height.toString());
            urlObj.searchParams.set('fit', 'crop');
            urlObj.searchParams.set('q', '80'); // Reasonable quality for thumbnails
            return urlObj.toString();
        } catch (e) { return url; }
    }

    // Picsum
    if (url.includes('picsum.photos')) {
        const parts = url.split('/');
        // Format: https://picsum.photos/id/{id}/{width}/{height}
        // or https://picsum.photos/{width}/{height}
        // This is a naive replacement for mock data
        if (parts.length >= 5) {
            // Assuming standard picsum structure, the last two are w/h
            // We'll just return a new random url if parsing fails, or try to replace end segments
            // For safety in this app context, mostly returning original or appending query if supported
            return url;
        }
    }

    return url;
};

/**
 * Extracts a YouTube video ID from various URL formats.
 */
export const getYoutubeVideoId = (url: string): string | null => {
    if (!url) return null;
    // This regex covers:
    // - youtube.com/watch?v=VIDEO_ID
    // - youtu.be/VIDEO_ID
    // - youtube.com/embed/VIDEO_ID
    // - youtube.com/v/VIDEO_ID
    // and other variations.
    const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};


/**
 * Determines the dynamic status of a class based on the current time.
 */
export const getDynamicClassStatus = (classInfo: any, now: Date = new Date()): 'live' | 'scheduled' | 'finished' | 'canceled' => {
    if (classInfo.status === 'canceled' || classInfo.isDeleted) {
        return 'canceled';
    }
    if (classInfo.status === 'finished') {
        return 'finished';
    }

    if (classInfo.recurrence === 'flexible') {
        if (!classInfo.flexibleDates) return 'finished';

        const hasFutureSession = classInfo.flexibleDates.some((d: { date: string, startTime: string }) => {
            const sessionStart = new Date(`${d.date}T${d.startTime}`);
            return sessionStart > now;
        });

        const isCurrentlyLive = classInfo.flexibleDates.some((d: { date: string, startTime: string, endTime: string }) => {
            const sessionStart = new Date(`${d.date}T${d.startTime}`);
            const sessionEnd = new Date(`${d.date}T${d.endTime}`);
            return now >= sessionStart && now <= sessionEnd;
        });

        if (isCurrentlyLive) return 'live';
        if (hasFutureSession) return 'scheduled';
        return 'finished';
    }

    // Logic for one-time and weekly
    const startDateTime = new Date(`${classInfo.date}T${classInfo.startTime}`);
    const endDateTime = new Date(`${classInfo.date}T${classInfo.endTime}`);

    if (classInfo.recurrence === 'weekly') {
        const classDay = startDateTime.getDay();
        const todayDay = now.getDay();

        if (classDay === todayDay) {
            const nowTime = now.getHours() * 60 + now.getMinutes();
            const startTime = startDateTime.getHours() * 60 + startDateTime.getMinutes();
            const endTime = endDateTime.getHours() * 60 + endDateTime.getMinutes();

            if (nowTime >= startTime && nowTime <= endTime) {
                const seriesStartDate = new Date(classInfo.date);
                const seriesEndDate = classInfo.endDate ? new Date(classInfo.endDate) : null;
                if (now >= seriesStartDate && (!seriesEndDate || now <= seriesEndDate)) {
                    return 'live';
                }
            }
        }
        const seriesEndDate = classInfo.endDate ? new Date(`${classInfo.endDate}T23:59:59`) : null;
        if (seriesEndDate && now > seriesEndDate) {
            return 'finished';
        }
        return 'scheduled';
    }

    // One-time
    if (now >= startDateTime && now <= endDateTime) {
        return 'live';
    }
    if (now > endDateTime) {
        return 'finished';
    }
    return 'scheduled';
};

/**
 * Determines the dynamic status of an event based on the current time.
 */
export const getDynamicEventStatus = (event: any): 'live' | 'scheduled' | 'finished' | 'canceled' => {
    if (event.status === 'canceled' || event.isDeleted) {
        return 'canceled';
    }
    if (event.status === 'finished') {
        return 'finished';
    }

    const now = new Date();
    const startDateTime = new Date(`${event.startDate}T${event.startTime}`);
    const endDateTime = new Date(`${event.endDate}T${event.endTime}`);

    if (now >= startDateTime && now <= endDateTime) {
        return 'live';
    }
    if (now > endDateTime) {
        return 'finished';
    }
    return 'scheduled';
};

/**
 * Determines the dynamic status of a quiz based on the current time.
 */
export const getDynamicQuizStatus = (quiz: any): 'scheduled' | 'finished' | 'canceled' => {
    if (quiz.status === 'canceled' || quiz.isDeleted) {
        return 'canceled';
    }
    if (quiz.status === 'finished') {
        return 'finished';
    }

    const now = new Date();
    const quizEndDateTime = new Date(
        new Date(`${quiz.date}T${quiz.startTime}`).getTime() + quiz.durationMinutes * 60000
    );

    if (now > quizEndDateTime) {
        return 'finished';
    }

    return 'scheduled';
};

/**
 * Calculates the next upcoming session date and time for a class.
 */
export const getNextSessionDateTime = (classInfo: IndividualClass, now: Date = new Date()): Date | null => {
    if (classInfo.status === 'canceled' || classInfo.isDeleted) {
        return null;
    }

    if (classInfo.recurrence === 'flexible') {
        // Find the next future date from the flexibleDates array
        if (!classInfo.flexibleDates) return null;
        const futureDates = classInfo.flexibleDates
            .map(d => new Date(`${d.date}T${d.startTime}`))
            .filter(d => d > now);

        if (futureDates.length === 0) return null;

        futureDates.sort((a, b) => a.getTime() - b.getTime());
        return futureDates[0];
    }

    if (classInfo.recurrence !== 'weekly') {
        const classStartDateTime = new Date(`${classInfo.date}T${classInfo.startTime}`);
        return classStartDateTime > now ? classStartDateTime : null;
    }

    // --- Weekly Logic ---
    const [startHours, startMinutes] = classInfo.startTime.split(':').map(Number);

    const classSeriesStartDate = new Date(classInfo.date + 'T00:00:00');
    const classSeriesEndDate = classInfo.endDate ? new Date(classInfo.endDate + 'T23:59:59') : null;

    if (now < classSeriesStartDate) {
        const firstSession = new Date(classSeriesStartDate);
        firstSession.setHours(startHours, startMinutes, 0, 0);
        return firstSession;
    }
    if (classSeriesEndDate && now > classSeriesEndDate) {
        return null; // Series has ended
    }

    const classDayOfWeek = classSeriesStartDate.getDay();
    const todayDayOfWeek = now.getDay();

    let daysUntilNextClass = classDayOfWeek - todayDayOfWeek;

    if (daysUntilNextClass < 0) {
        daysUntilNextClass += 7;
    } else if (daysUntilNextClass === 0) {
        const nowTotalMinutes = now.getHours() * 60 + now.getMinutes();
        const startTotalMinutes = startHours * 60 + startMinutes;
        if (nowTotalMinutes >= startTotalMinutes) {
            daysUntilNextClass = 7;
        }
    }

    const nextSessionDate = new Date(now);
    nextSessionDate.setDate(now.getDate() + daysUntilNextClass);
    nextSessionDate.setHours(startHours, startMinutes, 0, 0);

    if (classSeriesEndDate && nextSessionDate > classSeriesEndDate) {
        return null; // The calculated next session is after the series ends.
    }

    return nextSessionDate;
};


const disposableEmailDomains = [
    'mailinator.com',
    'temp-mail.org',
    '10minutemail.com',
    'guerrillamail.com',
    'yopmail.com',
];

/**
 * Checks if an email belongs to a known disposable email provider.
 */
export const isTemporaryEmail = (email: string): boolean => {
    if (!email) return false;
    const domain = email.split('@')[1];
    return disposableEmailDomains.includes(domain);
};

/**
 * Generates a standardized, time-based ID with a prefix.
 */
export const generateStandardId = (prefix: string): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();

    return `${prefix}-${year}${month}${day}-${randomPart}`;
};

/**
 * Sends a payment confirmation notification.
 */
export const sendPaymentConfirmation = async (
    notificationUrl: string,
    user: { email?: string | null; contactNumber?: string | null },
    amount: number,
    itemName: string,
    transactionId: string
) => {
    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });
    const subject = `Payment Confirmation for ${itemName}`;
    const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
            <h2 style="color: #004aad;">Thank you for your transaction!</h2>
            <p>This email confirms your recent transaction on clazz.lk.</p>
            <h3 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Transaction Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px 0; font-weight: bold;">Item:</td>
                    <td style="padding: 10px 0;">${itemName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px 0; font-weight: bold;">Amount Paid:</td>
                    <td style="padding: 10px 0;">${currencyFormatter.format(amount)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px 0; font-weight: bold;">Transaction ID:</td>
                    <td style="padding: 10px 0;">${transactionId}</td>
                </tr>
            </table>
            <p style="margin-top: 20px;">You can view your purchase history in your dashboard on our website.</p>
            <p>Thank you for choosing clazz.lk!</p>
        </div>
    `;
    const smsMessage = `Thank you for your payment of ${currencyFormatter.format(amount)} for "${itemName}" on clazz.lk. Ref: ${transactionId}`;
    await sendNotification(notificationUrl, user, subject, htmlBody, smsMessage);
};


/**
 * Calculates the completion percentage of a teacher's profile.
 */
export const calculateTeacherProfileCompletion = (teacher: Teacher | undefined): { percentage: number, missing: string[] } => {
    if (!teacher) return { percentage: 0, missing: [] };
    const checks = [
        {
            key: 'Teaching Subjects & Grades',
            weight: 15,
            isComplete: (teacher.teachingItems && teacher.teachingItems.length > 0) || (teacher.subjects && teacher.subjects.length > 0)
        },
        { key: 'Exams Prepared For', weight: 5, isComplete: (teacher.exams?.length || 0) > 0 },
        { key: 'Qualifications', weight: 5, isComplete: (teacher.qualifications?.length || 0) > 0 },
        { key: 'Experience', weight: 5, isComplete: teacher.experienceYears !== undefined && teacher.experienceYears !== null },
        { key: 'Profile Picture', weight: 10, isComplete: !!teacher.profileImage && !teacher.profileImage.includes('picsum.photos') },
        { key: 'Bio', weight: 10, isComplete: (teacher.bio?.length || 0) > 20 },
        { key: 'Contact Details', weight: 5, isComplete: !!teacher.contact?.phone && !!teacher.contact?.email },
        {
            key: 'Teaching Locations',
            weight: 5,
            isComplete: (teacher.teachingLocations && teacher.teachingLocations.length > 0) || !!teacher.contact?.location
        },
        { key: 'Cover Image', weight: 5, isComplete: (teacher.coverImages?.length || 0) > 0 },
        { key: 'Tagline', weight: 5, isComplete: !!teacher.tagline },
        { key: 'ID Verification', weight: 15, isComplete: ['verified', 'pending'].includes(teacher.verification?.id?.status || '') },
        { key: 'Bank Verification', weight: 15, isComplete: ['verified', 'pending'].includes(teacher.verification?.bank?.status || '') },
    ];
    let score = 0;
    const missing: string[] = [];
    checks.forEach(check => {
        if (check.isComplete) score += check.weight;
        else missing.push(check.key);
    });
    return { percentage: Math.round(score), missing };
};

/**
 * Calculates the completion percentage of a student's profile.
 */
export const calculateStudentProfileCompletion = (student: User | undefined): { percentage: number, missing: string[] } => {
    if (!student) return { percentage: 0, missing: [] };
    const checks = [
        { key: 'Full Name', weight: 10, isComplete: !!student.firstName && !!student.lastName },
        { key: 'Gender & Date of Birth', weight: 10, isComplete: !!student.gender && !!student.dateOfBirth },
        { key: 'Preferred Language', weight: 10, isComplete: !!student.preferredLanguage },
        { key: 'Student Category', weight: 10, isComplete: !!student.targetAudience },
        { key: 'Verified Email', weight: 15, isComplete: !!student.isEmailVerified },
        { key: 'Verified Mobile', weight: 15, isComplete: !!student.isMobileVerified },
        { key: 'Address Details', weight: 10, isComplete: !!student.address?.line1 && !!student.address?.city },
        { key: 'Schools', weight: 10, isComplete: (student.schools?.length || 0) > 0 },
        { key: 'Career Aspirations', weight: 5, isComplete: (student.careerAspirations?.length || 0) > 10 },
        { key: 'Achievements', weight: 5, isComplete: (student.achievements?.length || 0) > 0 },
    ];
    let score = 0;
    const missing: string[] = [];
    checks.forEach(check => {
        if (check.isComplete) score += check.weight;
        else missing.push(check.key);
    });
    return { percentage: Math.round(score), missing };
};

/**
 * Fetches an image URL as a blob and triggers a browser download.
 */
export const downloadImage = async (url: string, filename: string) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
        console.error("Image download failed:", error);
        window.open(url, '_blank');
    }
};

/**
 * Safely extracts plain text from either a Draft.js JSON string or plain markdown/text,
 * then truncates it.
 */
export const extractAndTruncate = (content: any, length: number = 80): string => {
    if (!content) return '';

    let plainText = '';

    try {
        let rawContent;
        if (typeof content === 'string') {
            if (content.trim().startsWith('{')) {
                rawContent = JSON.parse(content);
            } else {
                plainText = content;
            }
        } else if (typeof content === 'object' && content !== null) {
            rawContent = content;
        } else {
            plainText = String(content);
        }

        if (rawContent && Array.isArray(rawContent.blocks) && 'entityMap' in rawContent) {
            const contentState = convertFromRaw(rawContent);
            plainText = contentState.getPlainText();
        } else if (rawContent) {
            plainText = typeof content === 'string' ? content : JSON.stringify(content);
        }
    } catch (e) {
        plainText = String(content);
    }

    // Remove markdown characters and multiple newlines for a cleaner snippet
    plainText = plainText.replace(/(\*|_|`|#|~|>|\\n|\n)/g, ' ').replace(/\s\s+/g, ' ').trim();

    if (plainText.length <= length) {
        return plainText;
    }

    // Truncate and add ellipsis
    return plainText.substring(0, length).trim() + '...';
};