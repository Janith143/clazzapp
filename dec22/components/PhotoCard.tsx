import React, { useState, useEffect, useRef } from 'react';
import { Photo, PhotoPrintOption, PhotoCartItem } from '../types.ts';
import { useUI } from '../contexts/UIContext.tsx';
import { ShoppingCartIcon } from './Icons.tsx';

interface PhotoCardProps {
    photo: Photo;
    isFavorite: boolean;
    downloadPrice: number;
    downloadPriceHighRes: number;
    printOptions: PhotoPrintOption[];
    eventId: string;
    instituteId: string;
}

const HeartIcon: React.FC<React.SVGProps<SVGSVGElement> & { isFavorite: boolean }> = ({ isFavorite, ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              className={`transition-all duration-300 ${isFavorite ? 'fill-red-500 stroke-red-600' : 'fill-white/80 stroke-white'}`}
              strokeWidth="1.5"
        />
    </svg>
);


const PhotoCard: React.FC<PhotoCardProps> = ({ photo, isFavorite, downloadPrice, downloadPriceHighRes, printOptions, eventId, instituteId }) => {
    const { toggleFavoritePhoto, addToCart } = useUI();
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const optionsRef = useRef<HTMLDivElement>(null);

    // Click outside handler to close the options popup
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
                setIsOptionsOpen(false);
            }
        }

        if (isOptionsOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOptionsOpen]);
    
    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 });

    const handleAddToCart = (type: 'photo_download' | 'photo_print' | 'photo_download_highres', price: number, printOption?: PhotoPrintOption) => {
        const itemToAdd: Omit<PhotoCartItem, 'id' | 'quantity'> = { type, photo, printOption, eventId, instituteId, price };
        addToCart(itemToAdd);
        setIsOptionsOpen(false);
    };

    return (
        <div className={`relative aspect-square group rounded-lg shadow-md animate-fadeIn ${isOptionsOpen ? 'z-10 overflow-visible' : 'overflow-hidden'}`}>
            <img src={photo.url_thumb} alt={`Event photo ${photo.id}`} loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
            
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-white/20 dark:text-black/20 text-4xl font-bold transform -rotate-12 select-none">Clazz.lk</span>
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                <div>
                    <button 
                        onClick={() => toggleFavoritePhoto(photo.id)}
                        className="p-2 bg-black/30 rounded-full backdrop-blur-sm hover:scale-110 transition-transform"
                        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                        <HeartIcon isFavorite={isFavorite} className="w-6 h-6" />
                    </button>
                </div>

                <div className="relative" ref={optionsRef}>
                    <button 
                        onClick={() => setIsOptionsOpen(prev => !prev)}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold py-2 rounded-md hover:bg-primary-dark transition-colors"
                    >
                        <ShoppingCartIcon className="w-4 h-4" />
                        <span>Add to Cart</span>
                    </button>
                    {isOptionsOpen && (
                        <div className="absolute bottom-full mb-2 w-56 left-1/2 -translate-x-1/2 bg-light-surface dark:bg-dark-surface rounded-md shadow-lg overflow-hidden animate-slideInUp" style={{animationDuration: '200ms'}}>
                            <button onClick={() => handleAddToCart('photo_download', downloadPrice)} className="w-full text-left p-3 hover:bg-light-border dark:hover:bg-dark-border flex justify-between items-center">
                                <span className="text-sm whitespace-nowrap">Download (Standard)</span>
                                <span className="font-semibold text-sm whitespace-nowrap">{currencyFormatter.format(downloadPrice)}</span>
                            </button>
                            <button onClick={() => handleAddToCart('photo_download_highres', downloadPriceHighRes)} className="w-full text-left p-3 hover:bg-light-border dark:hover:bg-dark-border flex justify-between items-center">
                                <span className="text-sm whitespace-nowrap">Download (Full Quality)</span>
                                <span className="font-semibold text-sm whitespace-nowrap">{currencyFormatter.format(downloadPriceHighRes)}</span>
                            </button>
                            {printOptions.map(opt => (
                                <button key={opt.id} onClick={() => handleAddToCart('photo_print', opt.price, opt)} className="w-full text-left p-3 hover:bg-light-border dark:hover:bg-dark-border flex justify-between items-center">
                                    <span className="text-sm whitespace-nowrap">Print ({opt.size})</span>
                                    <span className="font-semibold text-sm whitespace-nowrap">{currencyFormatter.format(opt.price)}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PhotoCard;