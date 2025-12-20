import React from 'react';
import { PaymentMethod } from '../types';
import { useNavigation } from '../contexts/NavigationContext';

interface PaymentMethodSelectorProps {
    onSelect: (method: PaymentMethod) => void;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({ onSelect }) => {
    const { paymentGatewaySettings } = useNavigation();
    const logos = paymentGatewaySettings.methodLogos || {};

    const methods: { id: PaymentMethod; label: string; icon: string }[] = [
        { id: 'card', label: 'Visa / Mastercard', icon: logos.card || 'https://cdn-icons-png.flaticon.com/512/349/349221.png' },
        { id: 'ezcash', label: 'eZ Cash', icon: logos.ezcash || 'https://upload.wikimedia.org/wikipedia/en/2/27/Ez-cash-logo.png' },
        { id: 'mcash', label: 'mCash', icon: logos.mcash || 'https://mobitel.lk/sites/default/files/mcash-logo-v1.png' },
        { id: 'frimi', label: 'FriMi', icon: logos.frimi || 'https://www.frimi.lk/assets/images/frimi-logo.png' },
        { id: 'qr', label: 'LANKAQR / QR Scan', icon: logos.qr || 'https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg' },
        { id: 'direct_bank', label: 'Pay with Bank Account', icon: logos.direct_bank || 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png' }
    ];

    return (
        <div className="space-y-4">
            <p className="text-center text-sm font-semibold text-light-subtle dark:text-dark-subtle mb-4">Choose your preferred payment method:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {methods.map(method => (
                    <button
                        key={method.id}
                        type="button"
                        onClick={() => onSelect(method.id)}
                        className="flex items-center p-3 border border-light-border dark:border-dark-border rounded-lg hover:border-primary dark:hover:border-primary hover:bg-primary/5 transition-all text-left group"
                    >
                        <img src={method.icon} alt={method.label} className="w-10 h-10 object-contain mr-3 bg-white p-1 rounded border border-gray-100" />
                        <div>
                            <p className="font-bold text-sm text-light-text dark:text-dark-text group-hover:text-primary">{method.label}</p>
                            <p className="text-[10px] text-light-subtle dark:text-dark-subtle">Secure encrypted payment</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default PaymentMethodSelector;