
import React, { useState, useEffect } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import FormInput from '../FormInput';
import { SaveIcon } from '../Icons';

const DeveloperSettings: React.FC = () => {
    const { genAiKey, gDriveFetcherApiKey, functionUrls } = useNavigation();
    const { handleUpdateDeveloperSettings } = useData();
    const { addToast } = useUI();

    const [localGenAiKey, setLocalGenAiKey] = useState(genAiKey);
    const [localGDriveKey, setLocalGDriveKey] = useState(gDriveFetcherApiKey);
    const [localUrls, setLocalUrls] = useState(functionUrls);
    const [localSettings, setLocalSettings] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLocalGenAiKey(genAiKey);
        setLocalGDriveKey(gDriveFetcherApiKey);
        setLocalUrls(functionUrls);

        // Fetch Secure System Config for Backend
        const fetchSystemConfig = async () => {
            try {
                // We use getDoc directly here instead of hook since this is sensitive/rarely changed
                const { doc, getDoc } = await import('firebase/firestore');
                const { db } = await import('../../firebase');
                const configRef = doc(db, 'settings', 'system_config');
                const configSnap = await getDoc(configRef);

                // Extracted from legacy project (clazz2-9e0a9)
                const legacyDefaults = {
                    EMAIL_USER: 'clazzhelp@gmail.com',
                    EMAIL_PASS: 'yjpdovpcafirpcej',
                    NOTIFY_LK_USER_ID: '25286',
                    NOTIFY_LK_API_KEY: 'qXVxKpKoh25IKJEDAmaC',
                    NOTIFY_LK_SENDER_ID: 'Clazz.lk'
                };

                const legacyUrls = {
                    notification: 'https://asia-south1-clazz2-new.cloudfunctions.net/sendNotification',
                    payment: 'https://asia-south1-clazz2-new.cloudfunctions.net/paymentHandler',
                    marxPayment: 'https://asia-south1-clazz2-new.cloudfunctions.net/marxPaymentHandler',
                    gDriveFetcher: 'https://asia-south1-clazz2-new.cloudfunctions.net/gdriveImageFetcher',
                    fcmNotification: 'https://asia-south1-clazz2-new.cloudfunctions.net/fcmNotifications/send-fcm-push',
                    googleMeetHandler: 'https://asia-south1-clazz2-new.cloudfunctions.net/googleMeetHandler',
                    telegramBot: 'https://asia-south1-clazz2-new.cloudfunctions.net/telegramBot',
                    chatNotifications: 'https://asia-south1-clazz2-new.cloudfunctions.net/sendChatNotification',
                    ogImageHandler: 'https://asia-south1-clazz2-new.cloudfunctions.net/ogImageHandler',
                    storageCleanup: '' // Background triggers only (no HTTP endpoint)
                };

                if (configSnap.exists()) {
                    // Merge DB config with legacy defaults (DB takes precedence if key exists)
                    setLocalSettings((prev: any) => ({
                        ...legacyDefaults,
                        ...prev,
                        ...configSnap.data()
                    }));

                    // Smart Merge: Only fill in legacy URLs if the current state is empty
                    setLocalUrls((prev: any) => {
                        const updated = { ...prev };
                        Object.keys(legacyUrls).forEach((k) => {
                            const key = k as keyof typeof legacyUrls;
                            // If missing or empty string, use legacy default
                            if (!updated[key]) {
                                updated[key] = legacyUrls[key];
                            }
                        });
                        return updated;
                    });
                } else {
                    // Use legacy defaults if no DB config exists
                    setLocalSettings((prev: any) => ({ ...prev, ...legacyDefaults }));

                    // Smart Merge here too
                    setLocalUrls((prev: any) => {
                        const updated = { ...prev };
                        Object.keys(legacyUrls).forEach((k) => {
                            const key = k as keyof typeof legacyUrls;
                            if (!updated[key]) {
                                updated[key] = legacyUrls[key];
                            }
                        });
                        return updated;
                    });
                }
            } catch (error) {
                console.error("Failed to fetch system config:", error);
            }
        };
        fetchSystemConfig();
    }, [genAiKey, gDriveFetcherApiKey, functionUrls]);

    const handleUrlChange = (key: keyof typeof functionUrls, value: string) => {
        setLocalUrls(prev => ({ ...prev, [key]: value }));
    };

    const handleSettingChange = (key: string, value: string) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await handleUpdateDeveloperSettings({
                genAiKey: localGenAiKey,
                gDriveFetcherApiKey: localGDriveKey,
                functionUrls: localUrls,
                ...localSettings
            });
            // Toast handled in useAdminActions
        } catch (error) {
            console.error("Error saving developer settings:", error);
            addToast("Failed to save settings.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            <h1 className="text-3xl font-bold">Developer Settings</h1>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md border-l-4 border-warning">
                <h2 className="text-xl font-bold mb-4 text-warning">⚠️ Advanced Configuration</h2>
                <p className="text-sm text-light-subtle dark:text-dark-subtle mb-4">
                    These settings control core application integrations. Incorrect values will break functionality.
                    Changes are applied immediately to all users.
                </p>
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">API Keys</h2>
                <div className="space-y-4">
                    <FormInput
                        label="Google GenAI Key (Gemini)"
                        name="genAiKey"
                        value={localGenAiKey}
                        onChange={e => setLocalGenAiKey(e.target.value)}
                        type="password"
                    />
                    <FormInput
                        label="Google Drive Fetcher API Key"
                        name="gDriveKey"
                        value={localGDriveKey}
                        onChange={e => setLocalGDriveKey(e.target.value)}
                        type="password"
                    />
                </div>
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Cloud Function URLs</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Notification Function URL</label>
                        <FormInput
                            label=""
                            name="notificationUrl"
                            value={localUrls.notification}
                            onChange={e => handleUrlChange('notification', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">FCM Notification URL</label>
                        <FormInput
                            label=""
                            name="fcmNotificationUrl"
                            value={localUrls.fcmNotification || ''}
                            onChange={e => handleUrlChange('fcmNotification', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Payment Handler URL</label>
                        <FormInput
                            label=""
                            name="paymentUrl"
                            value={localUrls.payment}
                            onChange={e => handleUrlChange('payment', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Marx Payment URL</label>
                        <FormInput
                            label=""
                            name="marxPaymentUrl"
                            value={localUrls.marxPayment}
                            onChange={e => handleUrlChange('marxPayment', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">GDrive Fetcher URL</label>
                        <FormInput
                            label=""
                            name="gDriveFetcherUrl"
                            value={localUrls.gDriveFetcher}
                            onChange={e => handleUrlChange('gDriveFetcher', e.target.value)}
                        />
                    </div>

                    {/* New Functions */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Google Meet Handler URL</label>
                        <FormInput
                            label=""
                            name="googleMeetHandler"
                            value={localUrls.googleMeetHandler || ''}
                            onChange={e => handleUrlChange('googleMeetHandler' as any, e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Telegram Bot URL</label>
                        <FormInput
                            label=""
                            name="telegramBot"
                            value={localUrls.telegramBot || ''}
                            onChange={e => handleUrlChange('telegramBot' as any, e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Chat Notifications URL</label>
                        <FormInput
                            label=""
                            name="chatNotifications"
                            value={localUrls.chatNotifications || ''}
                            onChange={e => handleUrlChange('chatNotifications' as any, e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">OG Image Handler URL</label>
                        <FormInput
                            label=""
                            name="ogImageHandler"
                            value={localUrls.ogImageHandler || ''}
                            onChange={e => handleUrlChange('ogImageHandler' as any, e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Storage Cleanup URL</label>
                        <FormInput
                            label=""
                            name="storageCleanup"
                            value={localUrls.storageCleanup || ''}
                            onChange={e => handleUrlChange('storageCleanup' as any, e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md border-l-4 border-primary">
                <h2 className="text-xl font-bold mb-4 text-primary">Backend Services (Secure)</h2>
                <p className="text-sm text-light-subtle dark:text-dark-subtle mb-4">
                    Credentials for sending Emails and SMS. specific to the backend.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Gmail Configuration</h3>
                        <FormInput
                            label="Gmail User (Email)"
                            name="EMAIL_USER"
                            placeholder="e.g. alerts@clazz.lk"
                            value={localSettings.EMAIL_USER || ''}
                            onChange={e => handleSettingChange('EMAIL_USER', e.target.value)}
                        />
                        <FormInput
                            label="Gmail App Password"
                            name="EMAIL_PASS"
                            type="password"
                            placeholder="App Password from Google"
                            value={localSettings.EMAIL_PASS || ''}
                            onChange={e => handleSettingChange('EMAIL_PASS', e.target.value)}
                        />
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Notify.lk (SMS) Config</h3>
                        <FormInput
                            label="User ID"
                            name="NOTIFY_LK_USER_ID"
                            value={localSettings.NOTIFY_LK_USER_ID || ''}
                            onChange={e => handleSettingChange('NOTIFY_LK_USER_ID', e.target.value)}
                        />
                        <FormInput
                            label="API Key"
                            name="NOTIFY_LK_API_KEY"
                            type="password"
                            value={localSettings.NOTIFY_LK_API_KEY || ''}
                            onChange={e => handleSettingChange('NOTIFY_LK_API_KEY', e.target.value)}
                        />
                        <FormInput
                            label="Sender ID"
                            name="NOTIFY_LK_SENDER_ID"
                            placeholder="e.g. CLAZZ"
                            value={localSettings.NOTIFY_LK_SENDER_ID || ''}
                            onChange={e => handleSettingChange('NOTIFY_LK_SENDER_ID', e.target.value)}
                        />
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Google OAuth (Meet)</h3>
                        <FormInput
                            label="Client ID"
                            name="GOOGLE_CLIENT_ID"
                            placeholder="OAuth Client ID"
                            value={localSettings.GOOGLE_CLIENT_ID || ''}
                            onChange={e => handleSettingChange('GOOGLE_CLIENT_ID', e.target.value)}
                        />
                        <FormInput
                            label="Client Secret"
                            name="GOOGLE_CLIENT_SECRET"
                            type="password"
                            placeholder="OAuth Client Secret"
                            value={localSettings.GOOGLE_CLIENT_SECRET || ''}
                            onChange={e => handleSettingChange('GOOGLE_CLIENT_SECRET', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark disabled:opacity-50"
                >
                    <SaveIcon className="w-5 h-5" />
                    <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
                </button>
            </div>
        </div>
    );
};

export default DeveloperSettings;
