import React, { useMemo, useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import { useUI } from '../contexts/UIContext';
import { useData } from '../contexts/DataContext';
import { useNavigation } from '../contexts/NavigationContext';
import { CartItem, Event, BillingDetails, Product, PhotoCartItem, ProductCartItem, Address } from '../types';
import { TrashIcon, ShoppingCartIcon } from './Icons';
import FormInput from './FormInput';
import { useAuth } from '../contexts/AuthContext';
import { getOptimizedImageUrl } from '../utils';

interface CartModalProps { }

const CartModal: React.FC<CartModalProps> = () => {
    const { modalState, setModalState, cart, removeFromCart, updateCartItemQuantity, clearCart, addToast } = useUI();
    const { tuitionInstitutes, teachers } = useData();
    const { handleNavigate } = useNavigation();
    const { currentUser } = useAuth();

    const [step, setStep] = useState<'cart' | 'billing'>('cart');
    const [billingDetails, setBillingDetails] = useState<BillingDetails>({
        billingFirstName: '',
        billingLastName: '',
        billingEmail: '',
        billingContactNumber: '',
        billingAddressLineOne: '',
        billingCity: '',
        billingState: '',
        billingPostalCode: '',
        billingCountry: 'Sri Lanka'
    });
    const [shippingAddress, setShippingAddress] = useState<Address>({
        line1: '', line2: '', city: '', state: '', postalCode: '', country: 'Sri Lanka'
    });
    const [sameAsBilling, setSameAsBilling] = useState(true);

    const isOpen = modalState.name === 'cart';

    const hasPhysicalItems = useMemo(() => {
        return cart.some(item =>
            (item.type === 'product' && (item as ProductCartItem).product.type === 'physical') ||
            item.type === 'photo_print'
        );
    }, [cart]);

    useEffect(() => {
        if (isOpen && step === 'billing' && currentUser) {
            setBillingDetails(prev => ({
                ...prev,
                billingFirstName: prev.billingFirstName || currentUser.firstName,
                billingLastName: prev.billingLastName || currentUser.lastName,
                billingEmail: prev.billingEmail || currentUser.email,
                billingContactNumber: prev.billingContactNumber || currentUser.contactNumber || '',
                billingAddressLineOne: prev.billingAddressLineOne || currentUser.address?.line1 || '',
                billingCity: prev.billingCity || currentUser.address?.city || '',
                billingState: prev.billingState || currentUser.address?.state || '',
                billingPostalCode: prev.billingPostalCode || currentUser.address?.postalCode || '',
                billingCountry: 'Sri Lanka',
            }));
        }
    }, [isOpen, step, currentUser]);

    const onClose = useCallback(() => {
        setStep('cart');
        setModalState({ name: 'none' });
    }, [setModalState]);

    const { subtotal, discount, total, groupedBySeller } = useMemo(() => {
        let currentSubtotal = 0;
        const sellers: { [key: string]: { name: string; items: CartItem[] } } = {};

        cart.forEach(item => {
            let price = 0;
            let sellerId = '';
            let sellerName = 'Unknown Seller';

            if (item.type === 'product') {
                const productItem = item as ProductCartItem;
                price = productItem.product.price * productItem.quantity;
                sellerId = productItem.product.teacherId;
                const teacher = teachers.find(t => t.id === sellerId);
                sellerName = teacher?.name || 'Unknown Teacher';

            } else { // Photo item
                const photoItem = item as PhotoCartItem;
                price = photoItem.price * photoItem.quantity;
                sellerId = photoItem.instituteId;
                const institute = tuitionInstitutes.find(ti => ti.id === sellerId);
                sellerName = institute?.name || 'Unknown Institute';
            }

            currentSubtotal += price;

            if (!sellers[sellerId]) {
                sellers[sellerId] = { name: sellerName, items: [] };
            }
            sellers[sellerId].items.push(item);
        });

        let appliedDiscount = 0;
        const photoItems = cart.filter(item => item.type.startsWith('photo')) as PhotoCartItem[];
        if (photoItems.length > 0) {
            const firstPhotoItem = photoItems[0];
            const institute = tuitionInstitutes.find(ti => ti.id === firstPhotoItem.instituteId);
            const event = institute?.events?.find(e => e.id === firstPhotoItem.eventId);
            const discounts = event?.gallery?.bulkDiscounts || [];
            if (discounts.length > 0) {
                const sortedDiscounts = [...discounts].sort((a, b) => b.quantity - a.quantity);
                for (const d of sortedDiscounts) {
                    if (photoItems.length >= d.quantity) {
                        const photoSubtotal = photoItems.reduce((acc, item) => {
                            return acc + (item.price * item.quantity);
                        }, 0);
                        appliedDiscount = photoSubtotal * (d.discountPercent / 100);
                        break;
                    }
                }
            }
        }

        const finalTotal = currentSubtotal - appliedDiscount;
        return { subtotal: currentSubtotal, discount: appliedDiscount, total: finalTotal, groupedBySeller: sellers };

    }, [cart, tuitionInstitutes, teachers]);

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });

    const handleBillingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBillingDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setShippingAddress(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleCheckout = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (cart.length === 0) return;

        const finalShippingAddress = hasPhysicalItems
            ? (sameAsBilling
                ? {
                    line1: billingDetails.billingAddressLineOne,
                    city: billingDetails.billingCity || '',
                    state: billingDetails.billingState || '',
                    postalCode: billingDetails.billingPostalCode || '',
                    country: billingDetails.billingCountry || 'Sri Lanka',
                }
                : shippingAddress)
            : undefined;

        const isPhotoPurchase = cart.some(item => item.type.startsWith('photo'));

        if (isPhotoPurchase) {
            const photoCart = cart as PhotoCartItem[];
            const instituteId = photoCart[0]?.instituteId;
            if (!instituteId) {
                addToast("Could not process photo order. Missing event information.", "error");
                return;
            }
            handleNavigate({
                name: 'payment_redirect',
                payload: {
                    type: 'photo_purchase',
                    cart: photoCart,
                    totalAmount: total,
                    instituteId: instituteId,
                    billingDetails: billingDetails,
                    shippingAddress: finalShippingAddress,
                }
            });
        } else { // Product purchase
            handleNavigate({
                name: 'payment_redirect',
                payload: {
                    type: 'marketplace_purchase',
                    cart: cart,
                    totalAmount: total,
                    billingDetails: billingDetails,
                    shippingAddress: finalShippingAddress,
                }
            });
        }
        onClose();
    };

    const renderBillingForm = () => (
        <form onSubmit={handleCheckout} className="space-y-4 text-light-text dark:text-dark-text">
            <h3 className="text-lg font-semibold">Billing Information</h3>
            <p className="text-sm text-light-subtle dark:text-dark-subtle -mt-2">
                Please provide your details for the invoice and payment.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput label="First Name" name="billingFirstName" value={billingDetails.billingFirstName} onChange={handleBillingChange} required />
                <FormInput label="Last Name" name="billingLastName" value={billingDetails.billingLastName} onChange={handleBillingChange} required />
            </div>
            <FormInput label="Email" name="billingEmail" type="email" value={billingDetails.billingEmail} onChange={handleBillingChange} required />
            <FormInput label="Contact Number" name="billingContactNumber" type="tel" value={billingDetails.billingContactNumber} onChange={handleBillingChange} required />
            <FormInput label="Address Line 1" name="billingAddressLineOne" value={billingDetails.billingAddressLineOne} onChange={handleBillingChange} required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput label="City" name="billingCity" value={billingDetails.billingCity || ''} onChange={handleBillingChange} required={hasPhysicalItems} />
                <FormInput label="State / Province" name="billingState" value={billingDetails.billingState || ''} onChange={handleBillingChange} required={hasPhysicalItems} />
            </div>
            <FormInput label="Postal Code" name="billingPostalCode" value={billingDetails.billingPostalCode || ''} onChange={handleBillingChange} required={hasPhysicalItems} />

            {hasPhysicalItems && (
                <div className="pt-4 border-t border-light-border dark:border-dark-border">
                    <h3 className="text-lg font-semibold">Shipping Information</h3>
                    <div className="mt-2 flex items-center">
                        <input type="checkbox" id="sameAsBilling" checked={sameAsBilling} onChange={(e) => setSameAsBilling(e.target.checked)} className="h-4 w-4 text-primary focus:ring-primary border-light-border dark:border-dark-border rounded" />
                        <label htmlFor="sameAsBilling" className="ml-2 block text-sm">Shipping address is same as billing</label>
                    </div>
                    {!sameAsBilling && (
                        <div className="mt-4 space-y-4 animate-fadeIn">
                            <FormInput label="Address Line 1" name="line1" value={shippingAddress.line1} onChange={handleShippingChange} required />
                            <FormInput label="Address Line 2 (Optional)" name="line2" value={shippingAddress.line2 || ''} onChange={handleShippingChange} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput label="City" name="city" value={shippingAddress.city} onChange={handleShippingChange} required />
                                <FormInput label="State / Province" name="state" value={shippingAddress.state} onChange={handleShippingChange} required />
                            </div>
                            <FormInput label="Postal Code" name="postalCode" value={shippingAddress.postalCode} onChange={handleShippingChange} required />
                        </div>
                    )}
                </div>
            )}

            <div className="mt-6 pt-4 border-t border-light-border dark:border-dark-border">
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span>{currencyFormatter.format(subtotal)}</span></div>
                    {discount > 0 && (<div className="flex justify-between text-green-600 dark:text-green-400"><span>Bulk Discount</span><span>- {currencyFormatter.format(discount)}</span></div>)}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-light-border dark:border-dark-border"><span>Total</span><span>{currencyFormatter.format(total)}</span></div>
                </div>
                <button type="submit" className="mt-4 w-full bg-primary text-white font-bold py-3 rounded-md hover:bg-primary-dark transition-colors">
                    Pay {currencyFormatter.format(total)}
                </button>
                <button type="button" onClick={() => setStep('cart')} className="mt-2 w-full text-sm text-light-subtle dark:text-dark-subtle hover:text-primary">
                    &larr; Back to Cart
                </button>
            </div>
        </form>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Your Shopping Cart" size="3xl">
            {cart.length > 0 ? (
                step === 'cart' ? (
                    <div className="flex flex-col h-[70vh]">
                        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                            {Object.entries(groupedBySeller).map(([sellerId, group]) => {
                                const sellerGroup = group as { name: string; items: CartItem[] };
                                return (
                                    <div key={sellerId}>
                                        <h4 className="font-semibold text-md mb-2">{sellerGroup.name}</h4>
                                        <div className="space-y-3">
                                            {sellerGroup.items.map((item) => {
                                                const isProduct = item.type === 'product';
                                                const isPhotoPrint = item.type === 'photo_print';
                                                const productItem = isProduct ? (item as ProductCartItem) : null;
                                                const photoItem = !isProduct ? (item as PhotoCartItem) : null;

                                                let name = '';
                                                let image = '';
                                                let details = '';
                                                let price = 0;

                                                if (isProduct && productItem) {
                                                    name = productItem.product.title;
                                                    image = getOptimizedImageUrl(productItem.product.coverImages?.[0], 100) || 'https://via.placeholder.com/150.png?text=No+Img';
                                                    details = productItem.product.type;
                                                    price = productItem.product.price;
                                                } else if (photoItem) {
                                                    name = `Photo #${photoItem.photo.id.slice(-6)}`;
                                                    image = getOptimizedImageUrl(photoItem.photo.url_thumb, 100);
                                                    price = photoItem.price;
                                                    if (isPhotoPrint) {
                                                        details = `Print (${photoItem.printOption?.size})`;
                                                    } else {
                                                        if (photoItem.type === 'photo_download_highres') {
                                                            details = 'Download (Full Quality)';
                                                        } else {
                                                            details = 'Download (Standard)';
                                                        }
                                                    }
                                                }

                                                return (
                                                    <div key={item.id} className="flex items-center gap-4 p-2 bg-light-background dark:bg-dark-background rounded-md">
                                                        <img src={image} alt="thumbnail" className="w-16 h-16 rounded-md object-cover" />
                                                        <div className="flex-grow">
                                                            <p className="font-semibold text-sm text-light-text dark:text-dark-text">{name}</p>
                                                            <p className="text-xs capitalize text-light-subtle dark:text-dark-subtle">{details}</p>
                                                        </div>
                                                        {(isProduct || isPhotoPrint) && (
                                                            <input
                                                                type="number"
                                                                value={item.quantity}
                                                                onChange={(e) => updateCartItemQuantity(item.id, parseInt(e.target.value, 10))}
                                                                min="1"
                                                                className="w-16 p-1 border rounded bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                                            />
                                                        )}
                                                        <p className="font-semibold text-sm text-light-text dark:text-dark-text">
                                                            {currencyFormatter.format(price * item.quantity)}
                                                        </p>
                                                        <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full">
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border">
                            <div className="space-y-1 text-sm text-light-text dark:text-dark-text">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>{currencyFormatter.format(subtotal)}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-green-600 dark:text-green-400">
                                        <span>Bulk Discount</span>
                                        <span>- {currencyFormatter.format(discount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-lg pt-2 border-t border-light-border dark:border-dark-border">
                                    <span>Total</span>
                                    <span>{currencyFormatter.format(total)}</span>
                                </div>
                            </div>
                            <button onClick={() => setStep('billing')} className="mt-4 w-full bg-primary text-white font-bold py-3 rounded-md hover:bg-primary-dark transition-colors">
                                Proceed to Checkout
                            </button>
                            <button onClick={clearCart} className="mt-2 w-full text-sm text-light-subtle dark:text-dark-subtle hover:text-red-500">
                                Clear Cart
                            </button>
                        </div>
                    </div>
                ) : renderBillingForm()
            ) : (
                <div className="text-center py-12">
                    <ShoppingCartIcon className="w-16 h-16 mx-auto text-light-subtle dark:text-dark-subtle" />
                    <p className="mt-4 font-semibold text-light-text dark:text-dark-text">Your cart is empty</p>
                    <p className="mt-1 text-sm text-light-subtle dark:text-dark-subtle">Add items from the store or event galleries to get started.</p>
                </div>
            )}
        </Modal>
    );
};

export default CartModal;