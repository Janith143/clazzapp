import React, { useEffect, useRef, useState } from 'react';
import { User, PageState, ProductCartItem, PhotoCartItem, CartItem, PaymentMethod } from '../types.ts';
import { LogoIcon } from '../components/Icons.tsx';
import { useNavigation } from '../contexts/NavigationContext.tsx';

// --- WebXPay Configuration ---
// --- WebXPay Configuration ---
// Removed hardcoded constants. Now using NavigationContext.

interface PaymentRedirectPageProps {
    user: User | null;
    payload: Extract<PageState, { name: 'payment_redirect' }>['payload'];
}

const PaymentRedirectPage: React.FC<PaymentRedirectPageProps> = ({ user: contextUser, payload }) => {
    const formRef = useRef<HTMLFormElement>(null);
    const [formData, setFormData] = useState<Record<string, string> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { paymentGatewaySettings, functionUrls } = useNavigation();

    const user = (payload as any).updatedUser as User | undefined || contextUser;

    useEffect(() => {
        const initiatePayment = async () => {
            let order_id: string;
            let items: string;
            let amount: number;
            let customFieldsObject: any;
            let data: any = {};

            const frontend_url = window.location.origin;

            const baseUserDetails = {
                first_name: user?.firstName || '',
                last_name: user?.lastName || '',
                email: user?.email || '',
                contact_number: user?.contactNumber || '0771234567',
                address_line_one: user?.address?.line1 || 'N/A',
                address_line_two: user?.address?.line2 || '',
                city: user?.address?.city || 'N/A',
                state: user?.address?.state || '',
                postal_code: user?.address?.postalCode || '',
                country: user?.address?.country || 'Sri Lanka'
            };

            switch (payload.type) {
                case 'enrollment':
                    customFieldsObject = { type: 'enrollment', sale: payload.sale, itemType: ('lectures' in payload.item) ? 'course' : (('questions' in payload.item) ? 'quiz' : 'class'), frontend_url };
                    order_id = payload.sale.id;
                    items = payload.item.title;
                    amount = payload.sale.totalAmount;
                    data = { ...baseUserDetails, items };
                    break;

                case 'topup':
                    customFieldsObject = { type: 'topup', amount: payload.amount, frontend_url };
                    order_id = `topup_${user?.id}_${Date.now()}`;
                    items = 'Account Top-Up';
                    amount = payload.amount;
                    data = { ...baseUserDetails, items };
                    break;

                case 'voucher':
                    customFieldsObject = { type: 'voucher', details: payload.details, quantity: payload.quantity, totalAmount: payload.totalAmount, frontend_url };
                    order_id = `voucher_${Date.now()}`;
                    items = `${payload.quantity} x Gift Voucher(s)`;
                    amount = payload.totalAmount;
                    data = {
                        first_name: payload.details.billingFirstName,
                        last_name: payload.details.billingLastName,
                        email: payload.details.billingEmail,
                        contact_number: payload.details.billingContactNumber || '0771234567',
                        address_line_one: payload.details.billingAddressLineOne,
                        address_line_two: payload.details.billingAddressLineTwo || '',
                        city: payload.details.billingCity || 'N/A',
                        state: payload.details.billingState || '',
                        postal_code: payload.details.billingPostalCode || '',
                        country: payload.details.billingCountry || 'Sri Lanka',
                        items,
                    };
                    break;

                case 'external_topup':
                    customFieldsObject = { type: 'external_topup', students: payload.students, amountPerStudent: payload.amountPerStudent, totalAmount: payload.totalAmount, billingDetails: payload.billingDetails, frontend_url };
                    order_id = `ext_topup_${Date.now()}`;
                    items = `Account Top-Up for ${payload.students.length} student(s)`;
                    amount = payload.totalAmount;
                    data = {
                        first_name: payload.billingDetails.billingFirstName,
                        last_name: payload.billingDetails.billingLastName,
                        email: payload.billingDetails.billingEmail,
                        contact_number: payload.billingDetails.billingContactNumber || '0771234567',
                        address_line_one: payload.billingDetails.billingAddressLineOne,
                        city: payload.billingDetails.billingCity || 'N/A',
                        state: payload.billingDetails.billingState || '',
                        postal_code: payload.billingDetails.billingPostalCode || '',
                        country: payload.billingDetails.billingCountry || 'Sri Lanka',
                        items,
                    };
                    break;
                case 'photo_purchase':
                case 'marketplace_purchase': {
                    const { cart, totalAmount, billingDetails } = payload;

                    const slimCart = cart.map(item => {
                        if (item.type === 'product') {
                            return {
                                type: 'product',
                                id: (item as ProductCartItem).product.id,
                                quantity: item.quantity,
                            };
                        }
                        const photoItem = item as PhotoCartItem;
                        return {
                            type: photoItem.type,
                            id: photoItem.photo.id,
                            url_thumb: photoItem.photo.url_thumb,
                            url_highres: photoItem.photo.url_highres,
                            quantity: photoItem.quantity,
                            printOptionId: photoItem.printOption?.id,
                            eventId: photoItem.eventId,
                            instituteId: photoItem.instituteId
                        };
                    });

                    customFieldsObject = { ...payload, cart: slimCart, frontend_url };

                    order_id = `${payload.type}_${Date.now()}`;
                    items = `Purchase (${cart.length} items)`;
                    amount = totalAmount;
                    data = {
                        first_name: billingDetails.billingFirstName,
                        last_name: billingDetails.billingLastName,
                        email: billingDetails.billingEmail,
                        contact_number: billingDetails.billingContactNumber || '0771234567',
                        address_line_one: billingDetails.billingAddressLineOne,
                        city: billingDetails.billingCity || 'N/A',
                        state: billingDetails.billingState || '',
                        postal_code: billingDetails.billingPostalCode || '',
                        country: billingDetails.billingCountry || 'Sri Lanka',
                        items,
                    };
                    break;
                }
                case 'teacher_subscription': {
                    customFieldsObject = { type: 'teacher_subscription', planLevel: payload.planLevel, amount: payload.amount, refCode: payload.refCode, billingDetails: payload.billingDetails, frontend_url };
                    order_id = `sub_${payload.planLevel}_${Date.now()}`;
                    items = `Teacher Subscription - Plan ${payload.planLevel}`;
                    amount = payload.amount;
                    data = {
                        first_name: payload.billingDetails.billingFirstName,
                        last_name: payload.billingDetails.billingLastName,
                        email: payload.billingDetails.billingEmail,
                        contact_number: payload.billingDetails.billingContactNumber,
                        address_line_one: 'N/A',
                        city: 'N/A',
                        country: 'Sri Lanka',
                        items
                    };
                    break;
                }
                case 'additional_service': {
                    const { customDetails, sale } = payload;
                    customFieldsObject = {
                        type: 'additional_service',
                        serviceDetails: customDetails.serviceDetails,
                        amountPaidFromBalance: customDetails.amountPaidFromBalance,
                        totalAmount: customDetails.totalAmount,
                        billingDetails: {
                            billingFirstName: baseUserDetails.first_name,
                            billingLastName: baseUserDetails.last_name,
                            billingEmail: baseUserDetails.email,
                            billingContactNumber: baseUserDetails.contact_number,
                            billingAddressLineOne: baseUserDetails.address_line_one,
                            billingCity: baseUserDetails.city,
                            billingCountry: baseUserDetails.country
                        },
                        frontend_url
                    };
                    order_id = sale.id;
                    items = customDetails.serviceDetails.title;
                    amount = customDetails.totalAmount;
                    data = { ...baseUserDetails, items };
                    break;
                }
                case 'custom_payment': {
                    const { item, sale } = payload;
                    // item is CustomClassRequest
                    customFieldsObject = {
                        type: 'custom_payment',
                        requestId: item.id,
                        saleId: sale.id,
                        teacherId: item.teacherId,
                        amountPaidFromBalance: sale.amountPaidFromBalance,
                        frontend_url
                    };
                    order_id = sale.id;
                    items = `Private Class: ${item.topic}`;
                    amount = sale.totalAmount;
                    data = { ...baseUserDetails, items };
                    break;
                }
                default:
                    setError("Invalid payment type.");
                    return;
            }

            if (amount <= 0 && payload.type !== 'enrollment') {
                setError("Amount must be greater than zero for this transaction type.");
                return;
            }

            // Determine Target Gateway based on method selection or default mapping
            const selectedMethod = (payload as any).selectedMethod as PaymentMethod || 'card';
            const targetGateway = paymentGatewaySettings.methodMapping[selectedMethod] || paymentGatewaySettings.activePaymentGateway;



            if (targetGateway === 'marxipg') {
                try {
                    const custom_fields = btoa(unescape(encodeURIComponent(JSON.stringify(customFieldsObject))));
                    const marxPayload = {
                        order_id: order_id,
                        amount: amount,
                        items: items,
                        customer: {
                            first_name: data.first_name,
                            last_name: data.last_name,
                            email: data.email,
                            contact_number: data.contact_number,
                        },
                        custom_fields: custom_fields,
                        return_url: `${functionUrls.marxPayment}/marx-callback`,
                        frontend_url: frontend_url // Send dynamic frontend URL
                    };


                    const response = await fetch(`${functionUrls.marxPayment}/createOrder`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(marxPayload)
                    });

                    const result = await response.json();

                    if (result.success && result.payUrl) {
                        window.location.href = result.payUrl;
                    } else {
                        throw new Error(result.message || 'Failed to initiate Marx payment.');
                    }
                } catch (err: any) {
                    console.error("Marx Frontend Error:", err);
                    setError(err.message);
                }
            } else { // WebXPay
                const plaintext = `${order_id}|${amount.toFixed(2)}`;
                const encrypt = new (window as any).JSEncrypt();

                // Get Key from config
                const webxpayPublicKey = paymentGatewaySettings.gateways.webxpay.publicKey;
                if (!webxpayPublicKey) {
                    setError("Payment configuration error: Missing Public Key.");
                    return;
                }

                encrypt.setPublicKey(webxpayPublicKey);
                const payment = encrypt.encrypt(plaintext);

                if (!payment) {
                    console.error("Encryption failed! Plaintext:", plaintext);
                    setError("Could not prepare payment data. Please try again.");
                    return;
                }

                const custom_fields = btoa(unescape(encodeURIComponent(JSON.stringify(customFieldsObject))));

                const finalData = {
                    ...data,
                    // Get Secret from config
                    secret_key: paymentGatewaySettings.gateways.webxpay.secretKey,
                    payment,
                    process_currency: 'LKR',
                    cms: 'React',
                    return_url: `${functionUrls.payment}/payment-callback`,
                    custom_fields,
                    enc_method: 'JCs3J+6oSz4V0LgE0zi/Bg==',
                };
                setFormData(finalData);
            }
        };

        const tryGenerate = (retries = 10, delay = 200) => {
            if ((window as any).JSEncrypt) {
                try {
                    const testEncrypt = new (window as any).JSEncrypt();
                    if (testEncrypt && typeof testEncrypt.setPublicKey === 'function') {
                        initiatePayment();
                    } else {
                        throw new Error("JSEncrypt object is invalid or missing methods.");
                    }
                } catch (e) {
                    console.error(`JSEncrypt instantiation failed. Retries left: ${retries}`, e);
                    if (retries > 0) {
                        setTimeout(() => tryGenerate(retries - 1, delay), delay);
                    } else {
                        setError("A required payment library failed to initialize. Please check your connection and try again.");
                    }
                }
            } else if (retries > 0) {
                setTimeout(() => tryGenerate(retries - 1, delay), delay);
            } else {
                setError("A required payment library failed to load. Please check your network connection and refresh the page.");
            }
        };

        tryGenerate();

    }, [user, payload, paymentGatewaySettings]);

    useEffect(() => {
        if (formData && formRef.current) {
            formRef.current.submit();
        }
    }, [formData]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-light-background dark:bg-dark-background">
                <div className="text-center p-8 max-w-md">
                    <LogoIcon className="h-16 w-16 mx-auto text-red-500" />
                    <h1 className="text-2xl font-bold mt-4 text-red-600">Payment Error</h1>
                    <p className="mt-2 text-light-subtle dark:text-dark-subtle">{error}</p>
                    <button onClick={() => window.history.back()} className="mt-6 px-6 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark">Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-light-background dark:bg-dark-background">
            <div className="text-center p-8">
                <LogoIcon className="h-16 w-16 mx-auto text-primary animate-pulse" />
                <h1 className="text-2xl font-bold mt-4">Preparing secure payment...</h1>

                <p className="mt-2 text-light-subtle dark:text-dark-subtle">You will be redirected automatically. Do not close this window.</p>
                <div className="mt-8"><div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary"></div></div>
            </div>

            <form ref={formRef} method="post" action={paymentGatewaySettings.gateways.webxpay.baseUrl || "https://webxpay.com/index.php?route=checkout/billing"} style={{ display: 'none' }}>
                {formData && Object.entries(formData).map(([key, value]) => (
                    <input type="hidden" name={key} value={value as string} key={key} />
                ))}
            </form>
        </div >
    );
};

export default PaymentRedirectPage;