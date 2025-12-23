import React, { useState, useEffect } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import FormInput from '../FormInput';
import { SaveIcon, UploadIcon } from '../Icons';
import { PaymentMethod } from '../../types';
import ImageUploadInput from '../ImageUploadInput';

const PaymentGatewayManagement: React.FC = () => {
    const { paymentGatewaySettings } = useNavigation();
    const { handleUpdatePaymentGatewaySettings, handleImageSave } = useData();
    const { addToast } = useUI();

    const [settings, setSettings] = useState(paymentGatewaySettings);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setSettings(paymentGatewaySettings);
    }, [paymentGatewaySettings]);

    const handleMappingChange = (method: PaymentMethod, gateway: 'webxpay' | 'marxipg') => {
        setSettings(prev => ({
            ...prev,
            methodMapping: {
                ...prev.methodMapping,
                [method]: gateway
            }
        }));
    };

    const handleKeyChange = (gateway: 'webxpay' | 'marxipg', key: string, value: string) => {
        setSettings(prev => ({
            ...prev,
            gateways: {
                ...prev.gateways,
                [gateway]: {
                    ...prev.gateways[gateway],
                    [key]: value
                }
            }
        }));
    };

    const handleLogoUpload = async (methodId: PaymentMethod, base64: string) => {
        try {
            const url = await handleImageSave(base64, 'payment_method_logo', { methodId });
            if (url) {
                setSettings(prev => ({
                    ...prev,
                    methodLogos: {
                        ...prev.methodLogos,
                        [methodId]: url
                    }
                }));
                addToast(`${methodId} logo uploaded successfully. Save settings to apply.`, 'info');
            }
        } catch (error) {
            addToast('Failed to upload logo.', 'error');
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await handleUpdatePaymentGatewaySettings(settings);
            addToast('Payment gateway settings saved successfully!', 'success');
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
    
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Payment Gateway Management</h1>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Payment Method Routing</h2>
                <p className="text-sm text-light-subtle dark:text-dark-subtle mb-6">Select which gateway handles each specific payment method.</p>
                <div className="space-y-4">
                    {(Object.keys(settings.methodMapping) as PaymentMethod[]).map(method => (
                        <div key={method} className="flex items-center justify-between p-3 bg-light-background dark:bg-dark-background rounded-md">
                            <span className="font-semibold text-sm">{methodLabels[method]}</span>
                            <div className="flex space-x-4">
                                <label className="flex items-center cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name={`mapping-${method}`} 
                                        value="webxpay" 
                                        checked={settings.methodMapping[method] === 'webxpay'} 
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
                                        checked={settings.methodMapping[method] === 'marxipg'} 
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
                                currentImage={settings.methodLogos?.[methodId] || null} 
                                onImageChange={(base64) => handleLogoUpload(methodId, base64)}
                                aspectRatio="aspect-square"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">WebXPay Credentials</h2>
                <div className="space-y-4">
                    <FormInput label="Secret Key" name="webxpay_secret" value={settings.gateways.webxpay.secretKey} onChange={e => handleKeyChange('webxpay', 'secretKey', e.target.value)} />
                    <div>
                        <label className="block text-sm font-medium mb-1">Public Key</label>
                        <textarea value={settings.gateways.webxpay.publicKey} onChange={e => handleKeyChange('webxpay', 'publicKey', e.target.value)} rows={6} className="w-full p-2 border rounded-md bg-light-background dark:bg-dark-background font-mono text-xs"/>
                    </div>
                </div>
            </div>

            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Marx IPG Credentials</h2>
                <div className="space-y-4">
                    <FormInput label="API Key" name="marxipg_api" value={settings.gateways.marxipg.apiKey} onChange={e => handleKeyChange('marxipg', 'apiKey', e.target.value)} />
                </div>
            </div>

            <div className="flex justify-end">
                <button onClick={handleSave} disabled={isSaving} className="flex items-center space-x-2 px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark disabled:opacity-50">
                    <SaveIcon className="w-5 h-5" />
                    <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                </button>
            </div>
        </div>
    );
};

export default PaymentGatewayManagement;