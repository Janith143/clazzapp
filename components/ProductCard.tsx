
import React from 'react';
import { Product, Teacher } from '../types';
import { PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon, ClockIcon, ShoppingCartIcon, ShareIcon, ExternalLinkIcon } from './Icons';
import { useUI } from '../contexts/UIContext';
import { getOptimizedImageUrl } from '../utils';
import { slugify } from '../utils/slug';

interface ProductCardProps {
    product: Product;
    teacher: Teacher;
    viewMode: 'public' | 'teacher';
    onViewDetails?: (product: Product) => void;
    onEdit?: (product: Product) => void;
    onDelete?: (productId: string) => void;
    onTogglePublish?: (productId: string, action?: 'request_approval') => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, teacher, viewMode, onViewDetails, onEdit, onDelete, onTogglePublish }) => {
    const { addToast } = useUI();

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 });
    const optimizedCoverImage = getOptimizedImageUrl(product.coverImages?.[0] || '', 400);

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}/#/products/${slugify(product.title)}`;
        navigator.clipboard.writeText(url).then(() => {
            addToast('Product link copied to clipboard!', 'success');
        }).catch(() => {
            addToast('Failed to copy link.', 'error');
        });
    };

    const renderPublicationButton = () => {
        if (!onTogglePublish || viewMode !== 'teacher') return null;

        if (product.adminApproval === 'approved') {
            return (
                <button onClick={() => onTogglePublish(product.id)} className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light" title={product.isPublished ? "Unpublish" : "Publish"}>
                    {product.isPublished ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
            );
        }
        if (product.adminApproval === 'pending') {
            return <div className="p-2 text-xs font-semibold flex items-center text-yellow-600 dark:text-yellow-400"><ClockIcon className="h-4 w-4 mr-1" />Pending</div>;
        }
        const buttonText = product.adminApproval === 'rejected' ? 'Resubmit' : 'Request Publish';
        return (
            <button onClick={() => onTogglePublish(product.id, 'request_approval')} className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                {buttonText}
            </button>
        );
    };

    const cardContent = (
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden flex flex-col group animate-fadeIn transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl h-full">
            <div className="relative">
                <img
                    src={optimizedCoverImage || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 225' fill='%23e2e8f0'%3E%3Crect width='400' height='225'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24px' fill='%2364748b'%3ENo Image%3C/text%3E%3C/svg%3E"}
                    alt={product.title}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                    decoding="async"
                />
                <div className="absolute top-2 left-2 px-2 py-1 text-xs font-semibold rounded-full bg-black/50 text-white backdrop-blur-sm capitalize">{product.type}</div>
                {product.adminApproval === 'rejected' && viewMode === 'teacher' && <div className="absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded-full bg-red-500 text-white">Rejected</div>}
            </div>

            <div className="p-4 flex-grow flex flex-col">
                <h3 className="text-md font-bold text-light-text dark:text-dark-text group-hover:text-primary transition-colors flex-grow">{product.title}</h3>
                <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">by {teacher.name}</p>
                <p className="mt-2 text-lg font-bold text-primary">{currencyFormatter.format(product.price)}</p>
            </div>

            {viewMode === 'teacher' ? (
                <div className="p-4 pt-0">
                    <div className="flex justify-end items-center space-x-2 border-t border-light-border dark:border-dark-border pt-3">
                        <button onClick={handleShare} className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors" title="Share Link">
                            <ShareIcon className="h-4 w-4" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onViewDetails) onViewDetails(product);
                            }}
                            className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors"
                            title="Preview Product"
                        >
                            <ExternalLinkIcon className="h-4 w-4" />
                        </button>
                        {renderPublicationButton()}
                        <button onClick={() => onEdit && onEdit(product)} className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors" title="Edit"><PencilIcon className="h-4 w-4" /></button>
                        <button onClick={() => onDelete && onDelete(product.id)} className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400" title="Delete"><TrashIcon className="h-4 w-4" /></button>
                    </div>
                </div>
            ) : (
                <div className="p-4 pt-0 mt-auto">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails && onViewDetails(product);
                        }}
                        className="w-full text-center px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/10 transition-colors"
                    >
                        View Details
                    </button>
                </div>
            )}
        </div>
    );

    return viewMode === 'public' ? (
        <div onClick={() => onViewDetails && onViewDetails(product)} className="w-full h-full text-left cursor-pointer">
            {cardContent}
        </div>
    ) : (
        cardContent
    );
};

export default ProductCard;
