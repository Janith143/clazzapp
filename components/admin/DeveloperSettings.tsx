import React, { useState, useEffect } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import FormInput from '../FormInput';
import { SaveIcon } from '../Icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const DeveloperSettings: React.FC = () => {
    // Active Configs (from Context)
    const { genAiKey, gDriveFetcherApiKey, functionUrls } = useNavigation();
    const { handleUpdateDeveloperSettings } = useData();
    const { addToast } = useUI();

    const [settings, setSettings] = useState({
        genAiKey: '',
        gDriveFetcherApiKey: '',
        functionUrls: {} as Record<string, string>,
        EMAIL_USER: '',
        EMAIL_PASS: '',
        NOTIFY_LK_USER_ID: '',
        NOTIFY_LK_API_KEY: '',
        NOTIFY_LK_SENDER_ID: '',
        GOOGLE_CLIENT_ID: '',
        GOOGLE_CLIENT_SECRET: ''
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const loadConfigs = async () => {
            try {
                // Fetch Backend System Config
                const sysConfigDoc = await getDoc(doc(db, 'settings', 'system_config'));
                const sysConfig = sysConfigDoc.exists() ? sysConfigDoc.data() : {};

                // Merge Context (Frontend) + System Config (Backend)
                setSettings({
                    genAiKey: genAiKey || '',
                    gDriveFetcherApiKey: gDriveFetcherApiKey || '',
                    functionUrls: functionUrls || {},
                    EMAIL_USER: sysConfig.EMAIL_USER || '',
                    EMAIL_PASS: sysConfig.EMAIL_PASS || '',
                    NOTIFY_LK_USER_ID: sysConfig.NOTIFY_LK_USER_ID || '',
                    NOTIFY_LK_API_KEY: sysConfig.NOTIFY_LK_API_KEY || '',
                    NOTIFY_LK_SENDER_ID: sysConfig.NOTIFY_LK_SENDER_ID || '',
                    GOOGLE_CLIENT_ID: sysConfig.GOOGLE_CLIENT_ID || '',
                    GOOGLE_CLIENT_SECRET: sysConfig.GOOGLE_CLIENT_SECRET || ''
                });
                setIsInitialized(true);
            } catch (error) {
                console.error("Failed to load settings:", error);
                addToast("Failed to load settings.", "error");
            }
        };

        if (!isInitialized) {
            loadConfigs();
        }
    }, [genAiKey, functionUrls, isInitialized]);

    const handleKeyChange = (key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleUrlChange = (key: string, value: string) => {
        setSettings(prev => ({
            ...prev,
            functionUrls: {
                ...prev.functionUrls,
                [key]: value
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await handleUpdateDeveloperSettings({
                genAiKey: settings.genAiKey,
                gDriveFetcherApiKey: settings.gDriveFetcherApiKey,
                functionUrls: settings.functionUrls,
                // Pass backend secrets
                EMAIL_USER: settings.EMAIL_USER,
                EMAIL_PASS: settings.EMAIL_PASS,
                NOTIFY_LK_USER_ID: settings.NOTIFY_LK_USER_ID,
                NOTIFY_LK_API_KEY: settings.NOTIFY_LK_API_KEY,
                NOTIFY_LK_SENDER_ID: settings.NOTIFY_LK_SENDER_ID,
                GOOGLE_CLIENT_ID: settings.GOOGLE_CLIENT_ID,
                GOOGLE_CLIENT_SECRET: settings.GOOGLE_CLIENT_SECRET
            });
            addToast("Settings updated successfully.", "success");
        } catch (error) {
            console.error("Error saving settings:", error);
            addToast("Failed to save settings.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isInitialized) return <div className="p-8">Loading Settings...</div>;

    return (
        <div className="space-y-8 animate-fadeIn pb-20">
            <h1 className="text-3xl font-bold">Developer Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">Configure global application keys and endpoints.</p>

            {/* --- Cloud Function URLs --- */}
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Cloud Function URLs</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(settings.functionUrls).length > 0 ? (
                        Object.keys(settings.functionUrls).map((key) => (
                            <div key={key}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {key.replace(/([A-Z])/g, ' $1').trim()} URL
                                </label>
                                <FormInput
                                    label=""
                                    name={key}
                                    value={settings.functionUrls[key] || ''}
                                    onChange={e => handleUrlChange(key, e.target.value)}
                                />
                            </div>
                        ))
                    ) : (
                        <p>No function URLs configured.</p>
                    )}
                </div>
            </div>

            {/* --- API Keys --- */}
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Global API Keys</h2>
                <div className="space-y-4">
                    <FormInput
                        label="Google GenAI Key (Gemini)"
                        name="genAiKey"
                        value={settings.genAiKey}
                        onChange={e => handleKeyChange('genAiKey', e.target.value)}
                        type="password"
                    />
                    <FormInput
                        label="Google Drive Fetcher API Key"
                        name="gDriveKey"
                        value={settings.gDriveFetcherApiKey}
                        onChange={e => handleKeyChange('gDriveFetcherApiKey', e.target.value)}
                        type="password"
                    />
                </div>
            </div>

            {/* --- Backend Secrets --- */}
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Backend Secrets</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                        label="Gmail User"
                        name="EMAIL_USER"
                        value={settings.EMAIL_USER}
                        onChange={e => handleKeyChange('EMAIL_USER', e.target.value)}
                    />
                    <FormInput
                        label="Gmail App Password"
                        name="EMAIL_PASS"
                        value={settings.EMAIL_PASS}
                        onChange={e => handleKeyChange('EMAIL_PASS', e.target.value)}
                        type="password"
                    />
                    <FormInput
                        label="Notify.lk User ID"
                        name="NOTIFY_LK_USER_ID"
                        value={settings.NOTIFY_LK_USER_ID}
                        onChange={e => handleKeyChange('NOTIFY_LK_USER_ID', e.target.value)}
                    />
                    <FormInput
                        label="Notify.lk API Key"
                        name="NOTIFY_LK_API_KEY"
                        value={settings.NOTIFY_LK_API_KEY}
                        onChange={e => handleKeyChange('NOTIFY_LK_API_KEY', e.target.value)}
                        type="password"
                    />
                    <FormInput
                        label="Google Client ID"
                        name="GOOGLE_CLIENT_ID"
                        value={settings.GOOGLE_CLIENT_ID}
                        onChange={e => handleKeyChange('GOOGLE_CLIENT_ID', e.target.value)}
                    />
                    <FormInput
                        label="Google Client Secret"
                        name="GOOGLE_CLIENT_SECRET"
                        value={settings.GOOGLE_CLIENT_SECRET}
                        onChange={e => handleKeyChange('GOOGLE_CLIENT_SECRET', e.target.value)}
                        type="password"
                    />
                </div>
            </div>

            <div className="fixed bottom-6 right-8">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-8 py-4 border border-transparent text-lg font-bold rounded-full shadow-xl text-white bg-primary hover:bg-primary-dark disabled:opacity-50 transform hover:scale-105 transition-all"
                >
                    <SaveIcon className="w-6 h-6" />
                    <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                </button>
            </div>
        </div>
    );
};

export default DeveloperSettings;
