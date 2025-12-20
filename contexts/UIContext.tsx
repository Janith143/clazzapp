
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Theme, ModalState, Lecture, Course, EditableImageType, Toast, CartItem, ProductCartItem, PhotoCartItem } from '../types.ts';
import { v4 as uuidv4 } from 'uuid';

export interface UIContextType {
    theme: Theme;
    modalState: ModalState;
    videoPlayerState: { isOpen: boolean; lecture: Lecture | null; course: Course | null; isEnrolled: boolean };
    imageUploadModal: { isOpen: boolean, type: EditableImageType | null, context?: any };
    prePurchaseVerificationModal: { isOpen: boolean, missing?: 'email' | 'mobile', onSkip?: () => void };
    toasts: Toast[];
    cart: CartItem[];
    favoritePhotos: string[]; // array of photo IDs
    
    // New states for notifications and chat
    isChatWidgetOpen: boolean;
    setChatWidgetOpen: (isOpen: boolean) => void;
    notificationPopup: { isOpen: boolean; title: string; message: string };
    setNotificationPopup: React.Dispatch<React.SetStateAction<{ isOpen: boolean; title: string; message: string }>>;

    toggleTheme: () => void;
    setModalState: React.Dispatch<React.SetStateAction<ModalState>>;
    setVideoPlayerState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; lecture: Lecture | null; course: Course | null; isEnrolled: boolean }>>;
    setImageUploadModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean, type: EditableImageType | null, context?: any }>>;
    setPrePurchaseVerificationModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean, missing?: 'email' | 'mobile', onSkip?: () => void }>>;
    openImageUploadModal: (type: EditableImageType, context?: any) => void;
    addToast: (message: string, type?: Toast['type']) => void;
    removeToast: (id: number) => void;
    
    // Cart Actions
    addToCart: (item: Omit<CartItem, 'id' | 'quantity'>) => void;
    removeFromCart: (cartItemId: string) => void;
    updateCartItemQuantity: (cartItemId: string, newQuantity: number) => void;
    clearCart: () => void;

    // Photo Favorites
    toggleFavoritePhoto: (photoId: string) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(Theme.Light);
    const [modalState, setModalState] = useState<ModalState>({ name: 'none' });
    const [videoPlayerState, setVideoPlayerState] = useState<{ isOpen: boolean; lecture: Lecture | null; course: Course | null; isEnrolled: boolean }>({ isOpen: false, lecture: null, course: null, isEnrolled: false });
    const [imageUploadModal, setImageUploadModal] = useState<{ isOpen: boolean, type: EditableImageType | null, context?: any }>({ isOpen: false, type: null });
    const [prePurchaseVerificationModal, setPrePurchaseVerificationModal] = useState<{ isOpen: boolean, missing?: 'email' | 'mobile', onSkip?: () => void }>({ isOpen: false });
    const [toasts, setToasts] = useState<Toast[]>([]);
    
    const [cart, setCart] = useState<CartItem[]>([]);
    const [favoritePhotos, setFavoritePhotos] = useState<string[]>([]);
    
    // New states
    const [isChatWidgetOpen, setChatWidgetOpen] = useState(false);
    const [notificationPopup, setNotificationPopup] = useState<{ isOpen: boolean; title: string; message: string }>({ isOpen: false, title: '', message: '' });


    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === Theme.Dark);
    }, [theme]);
    
    const toggleTheme = () => setTheme(prev => (prev === Theme.Light ? Theme.Dark : Theme.Light));
    
    const openImageUploadModal = (type: EditableImageType, context?: any) => setImageUploadModal({ isOpen: true, type, context });

    const addToast = (message: string, type: Toast['type'] = 'info') => {
        setToasts(prev => [...prev, { id: Date.now(), message, type }]);
    };
    
    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };
    
    const addToCart = (itemToAdd: Omit<CartItem, 'id' | 'quantity'>) => {
        setCart(prevCart => {
            if (itemToAdd.type === 'product') {
                const productItemToAdd = itemToAdd as Omit<ProductCartItem, 'id' | 'quantity'>;
                const existingItemIndex = prevCart.findIndex(item => item.type === 'product' && item.product.id === productItemToAdd.product.id);
                if (existingItemIndex > -1) {
                    const updatedCart = [...prevCart];
                    const existingItem = updatedCart[existingItemIndex] as ProductCartItem;
                    updatedCart[existingItemIndex] = { ...existingItem, quantity: existingItem.quantity + 1 };
                    addToast('Item quantity updated in cart.', 'info');
                    return updatedCart;
                } else {
                    addToast(`${productItemToAdd.product.title} added to cart!`, 'success');
                    const newItem: ProductCartItem = {
                        type: 'product',
                        id: uuidv4(),
                        quantity: 1,
                        product: productItemToAdd.product,
                    };
                    return [...prevCart, newItem];
                }
            } else { // Photo items
                const photoItemToAdd = itemToAdd as Omit<PhotoCartItem, 'id' | 'quantity'>;
                const existingItemIndex = prevCart.findIndex(item => 
                    item.type === photoItemToAdd.type && 
                    (item as PhotoCartItem).photo.id === photoItemToAdd.photo.id &&
                    (item.type !== 'photo_print' || (item as PhotoCartItem).printOption?.id === photoItemToAdd.printOption?.id)
                );
                if (existingItemIndex > -1) {
                    addToast('This photo item is already in your cart.', 'info');
                    return prevCart;
                } else {
                    addToast(`Photo item added to cart!`, 'success');
                    const newItem: PhotoCartItem = {
                        type: photoItemToAdd.type,
                        id: uuidv4(),
                        quantity: 1,
                        photo: photoItemToAdd.photo,
                        printOption: photoItemToAdd.printOption,
                        eventId: photoItemToAdd.eventId,
                        instituteId: photoItemToAdd.instituteId,
                        price: photoItemToAdd.price,
                    };
                    return [...prevCart, newItem];
                }
            }
        });
    };

    const removeFromCart = (cartItemId: string) => {
        setCart(prevCart => prevCart.filter(item => item.id !== cartItemId));
        addToast('Item removed from cart.', 'info');
    };

    const updateCartItemQuantity = (cartItemId: string, newQuantity: number) => {
        setCart(prevCart => prevCart.map(item => {
            if (item.id === cartItemId && (item.type === 'product' || item.type === 'photo_print')) {
                return { ...item, quantity: Math.max(1, newQuantity) };
            }
            return item;
        }));
    };
    
    const clearCart = () => setCart([]);

    const toggleFavoritePhoto = (photoId: string) => {
        setFavoritePhotos(prevFavorites => {
            if (prevFavorites.includes(photoId)) {
                return prevFavorites.filter(id => id !== photoId);
            } else {
                addToast('Added to favorites!', 'success');
                return [...prevFavorites, photoId];
            }
        });
    };


    const value: UIContextType = {
        theme, modalState, videoPlayerState, imageUploadModal, prePurchaseVerificationModal, toasts,
        cart, favoritePhotos,
        isChatWidgetOpen, setChatWidgetOpen, notificationPopup, setNotificationPopup,
        toggleTheme, setModalState, setVideoPlayerState, setImageUploadModal, setPrePurchaseVerificationModal,
        openImageUploadModal, addToast, removeToast,
        addToCart, removeFromCart, updateCartItemQuantity, clearCart,
        toggleFavoritePhoto
    };
    
    return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = (): UIContextType => {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
