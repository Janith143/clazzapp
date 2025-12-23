import React, { useState, useEffect } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import FormInput from '../FormInput';
import { SaveIcon } from '../Icons';
import { PaymentGatewaySettings, PaymentMethod } from '../../types';
import ImageUploadInput from '../ImageUploadInput';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const PaymentGatewayManagement: React.FC = () => {
    const { paymentGatewaySettings } = useNavigation();
    const { handleUpdatePaymentGatewaySettings, handleImageSave } = useData();
    const { addToast } = useUI();

    const [activeTab, setActiveTab] = useState<'live' | 'staging'>('live');
    const [envSettings, setEnvSettings] = useState<{ live: PaymentGatewaySettings; staging: PaymentGatewaySettings } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Initial default structure
    const defaultSettings: PaymentGatewaySettings = {
        activePaymentGateway: 'webxpay',
        methodMapping: {
            card: 'marxipg', ezcash: 'webxpay', mcash: 'webxpay', frimi: 'webxpay', qr: 'webxpay', direct_bank: 'webxpay'
        },
        methodLogos: {},
        gateways: {
            webxpay: { secretKey: '', publicKey: '', baseUrl: 'https://webxpay.com/index.php?route=checkout/billing' },
            marxipg: { apiKey: '', baseUrl: 'https://payment.v4.api.marx.lk/api/v4/ipg' }
        }
    };

    // Load Environments
    useEffect(() => {
        const loadIds = async () => {
            try {
                const docRef = doc(db, 'settings', 'environments');
                const snapshot = await getDoc(docRef);

                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setEnvSettings({
                        live: data.live?.paymentGatewaySettings || { ...defaultSettings, ...paymentGatewaySettings }, // Fallback to current if missing
                        staging: data.staging?.paymentGatewaySettings || JSON.parse(JSON.stringify(defaultSettings))
                    });
                    if (data.activeEnvironment === 'live' || data.activeEnvironment === 'staging') {
                        setActiveTab(data.activeEnvironment);
                    }
                } else {
                    // Initialize with current as Live
                    setEnvSettings({
                        live: { ...defaultSettings, ...paymentGatewaySettings },
                        staging: JSON.parse(JSON.stringify(defaultSettings))
                    });
                }
            } catch (err) {
                console.error("Error loading payment environments:", err);
                addToast("Failed to load environment settings.", "error");
            }
        };
        loadIds();
    }, []);

    const currentSettings = envSettings ? envSettings[activeTab] : defaultSettings;

    const updateCurrentSettings = (updater: (prev: PaymentGatewaySettings) => PaymentGatewaySettings) => {
        if (!envSettings) return;
        setEnvSettings(prev => ({
            ...prev!,
            [activeTab]: updater(prev![activeTab])
        }));
    };

    const handleMappingChange = (method: PaymentMethod, gateway: 'webxpay' | 'marxipg') => {
        updateCurrentSettings(prev => ({
            ...prev,
            methodMapping: { ...prev.methodMapping, [method]: gateway }
        }));
    };

    const handleKeyChange = (gateway: 'webxpay' | 'marxipg', key: string, value: string) => {
        updateCurrentSettings(prev => ({
            ...prev,
            gateways: {
                ...prev.gateways,
                [gateway]: { ...prev.gateways[gateway], [key]: value }
            }
        }));
    };

    const handleLogoUpload = async (methodId: PaymentMethod, base64: string) => {
        try {
            const url = await handleImageSave(base64, 'payment_method_logo', { methodId });
            if (url) {
                updateCurrentSettings(prev => ({
                    ...prev,
                    methodLogos: { ...prev.methodLogos, [methodId]: url }
                }));
                addToast(`${methodId} logo uploaded successfully. Save settings to apply.`, 'info');
            }
        } catch (error) {
            addToast('Failed to upload logo.', 'error');
        }
    };

    const handleSave = async () => {
        if (!envSettings) return;
        setIsSaving(true);
        try {
            // 1. Save Configs to 'settings/environments'
            const envDocRef = doc(db, 'settings', 'environments');
            const envSnap = await getDoc(envDocRef);
            const currentData = envSnap.exists() ? envSnap.data() : {};

            const newData = {
                ...currentData,
                activeEnvironment: activeTab, // Persist the active selection
                live: {
                    ...(currentData.live || {}),
                    paymentGatewaySettings: envSettings.live
                },
                staging: {
                    ...(currentData.staging || {}),
                    paymentGatewaySettings: envSettings.staging
                }
            };

            await setDoc(envDocRef, newData);

            // 2. Activate specific environment to clientAppConfig
            await handleUpdatePaymentGatewaySettings(envSettings[activeTab]);

            addToast(`Saved & Activated ${activeTab.toUpperCase()} Payment Settings!`, 'success');
        } catch (error) {
            addToast('Failed to save settings.', 'error');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const methodLabels: Record<PaymentMethod, string> = {
        card: 'Visa / Mastercard',
        ezcash: 'eZ Cash',
        mcash: 'mCash',
        frimi: 'FriMi',
        qr: 'Bank QR (LANKAQR)',
        direct_bank: 'Direct Bank Transfer'
    };

    const logoUpdatableMethods: PaymentMethod[] = ['ezcash', 'frimi', 'mcash'];

    if (!envSettings) return <div>Loading Payment Settings...</div>;

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Payment Gateway Management</h1>
                <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('live')}
                        className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'live'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        LIVE
                    </button>
                    <button
                        onClick={() => setActiveTab('staging')}
                        className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'staging'
                            ? 'bg-green-600 text-white shadow-md'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        STAGING
                    </button>
                </div>
            </div>

            <div className={`p-4 rounded-lg border-l-4 mb-4 ${activeTab === 'live' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' : 'bg-green-50 dark:bg-green-900/20 border-green-500'}`}>
                <h3 className={`text-lg font-bold ${activeTab === 'live' ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                    {activeTab.toUpperCase()} Environment
                </h3>
                <p className="text-sm opacity-80">
                    Configuring payment gateways for <strong>{activeTab}</strong>.
                    Clicking "Save & Activate" will apply these settings to the application.
                </p>
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Payment Method Routing</h2>
                <p className="text-sm text-light-subtle dark:text-dark-subtle mb-6">Select which gateway handles each specific payment method for {activeTab}.</p>
                <div className="space-y-4">
                    {(Object.keys(currentSettings.methodMapping) as PaymentMethod[]).map(method => (
                        <div key={method} className="flex items-center justify-between p-3 bg-light-background dark:bg-dark-background rounded-md">
                            <span className="font-semibold text-sm">{methodLabels[method]}</span>
                            <div className="flex space-x-4">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`mapping-${method}`}
                                        value="webxpay"
                                        checked={currentSettings.methodMapping[method] === 'webxpay'}
                                        onChange={() => handleMappingChange(method, 'webxpay')}
                                        className="h-4 w-4 text-primary focus:ring-primary"
                                    />
                                    <span className="ml-2 text-sm">WebXPay</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`mapping-${method}`}
                                        value="marxipg"
                                        checked={currentSettings.methodMapping[method] === 'marxipg'}
                                        onChange={() => handleMappingChange(method, 'marxipg')}
                                        className="h-4 w-4 text-primary focus:ring-primary"
                                    />
                                    <span className="ml-2 text-sm">Marx IPG</span>
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Payment Method Branding</h2>
                <p className="text-sm text-light-subtle dark:text-dark-subtle mb-6">Upload custom logos for mobile payment methods. Recommended: PNG with transparent background.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {logoUpdatableMethods.map(methodId => (
                        <div key={methodId} className="space-y-2">
                            <ImageUploadInput
                                label={methodLabels[methodId]}
                                currentImage={currentSettings.methodLogos?.[methodId] || null}
                                onImageChange={(base64) => handleLogoUpload(methodId, base64)}
                                aspectRatio="aspect-square"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">WebXPay Credentials ({activeTab})</h2>
                <div className="space-y-4">
                    <FormInput
                        label="Secret Key"
                        name="webxpay_secret"
                        value={currentSettings.gateways.webxpay.secretKey}
                        onChange={e => handleKeyChange('webxpay', 'secretKey', e.target.value)}
                        type="password"
                    />
                    <FormInput
                        label="Base URL (Form Action)"
                        name="webxpay_base_url"
                        placeholder="https://webxpay.com/index.php?route=checkout/billing"
                        value={currentSettings.gateways.webxpay.baseUrl || ''}
                        onChange={e => handleKeyChange('webxpay', 'baseUrl', e.target.value)}
                    />
                    <div>
                        <label className="block text-sm font-medium mb-1">Public Key</label>
                        <textarea
                            value={currentSettings.gateways.webxpay.publicKey}
                            onChange={e => handleKeyChange('webxpay', 'publicKey', e.target.value)}
                            rows={6}
                            className="w-full p-2 border rounded-md bg-light-background dark:bg-dark-background font-mono text-xs"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Marx IPG Credentials ({activeTab})</h2>
                <div className="space-y-4">
                    <FormInput
                        label="API Key"
                        name="marxipg_api"
                        value={currentSettings.gateways.marxipg.apiKey}
                        onChange={e => handleKeyChange('marxipg', 'apiKey', e.target.value)}
                        type="password"
                    />
                    <FormInput
                        label="Base URL (API Endpoint)"
                        name="marx_base_url"
                        placeholder="https://payment.v4.api.marx.lk/api/v4/ipg"
                        value={currentSettings.gateways.marxipg.baseUrl || ''}
                        onChange={e => handleKeyChange('marxipg', 'baseUrl', e.target.value)}
                    />
                </div>
            </div>

            <div className="fixed bottom-6 right-8 z-50">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-8 py-4 border border-transparent text-lg font-bold rounded-full shadow-xl text-white bg-primary hover:bg-primary-dark disabled:opacity-50 transform hover:scale-105 transition-all"
                >
                    <SaveIcon className="w-6 h-6" />
                    <span>{isSaving ? 'Activating...' : `Save & Activate ${activeTab.toUpperCase()}`}</span>
                </button>
            </div>

            <div className="flex justify-end mt-8">
                <button onClick={handleSave} disabled={isSaving} className="flex items-center space-x-2 px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark disabled:opacity-50">
                    <SaveIcon className="w-5 h-5" />
                    <span>{isSaving ? 'Activating...' : `Save & Activate ${activeTab.toUpperCase()}`}</span>
                </button>
            </div>
        </div>
    );
};

export default PaymentGatewayManagement;