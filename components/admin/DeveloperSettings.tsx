
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
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLocalGenAiKey(genAiKey);
        setLocalGDriveKey(gDriveFetcherApiKey);
        setLocalUrls(functionUrls);
    }, [genAiKey, gDriveFetcherApiKey, functionUrls]);

    const handleUrlChange = (key: keyof typeof functionUrls, value: string) => {
        setLocalUrls(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await handleUpdateDeveloperSettings({
                genAiKey: localGenAiKey,
                gDriveFetcherApiKey: localGDriveKey,
                functionUrls: localUrls
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
                <div className="space-y-4">
                    <FormInput
                        label="Notification Function URL"
                        name="notificationUrl"
                        value={localUrls.notification}
                        onChange={e => handleUrlChange('notification', e.target.value)}
                    />
                    <FormInput
                        label="Payment Confirmation URL"
                        name="paymentUrl"
                        value={localUrls.payment}
                        onChange={e => handleUrlChange('payment', e.target.value)}
                    />
                    <FormInput
                        label="Marx Payment Handler URL"
                        name="marxPaymentUrl"
                        value={localUrls.marxPayment}
                        onChange={e => handleUrlChange('marxPayment', e.target.value)}
                    />
                    <FormInput
                        label="Google Drive Image Fetcher URL"
                        name="gDriveFetcherUrl"
                        value={localUrls.gDriveFetcher}
                        onChange={e => handleUrlChange('gDriveFetcher', e.target.value)}
                    />
                    <FormInput
                        label="FCM Notification URL"
                        name="fcmNotificationUrl"
                        value={localUrls.fcmNotification || ''}
                        onChange={e => handleUrlChange('fcmNotification', e.target.value)}
                    />
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
