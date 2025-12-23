import React from 'react';
import Modal from '../Modal.tsx';
import { Product, Teacher } from '../../types.ts';
import { CheckCircleIcon, XCircleIcon, DownloadIcon } from '../Icons.tsx';
import ImageCarousel from '../ImageCarousel.tsx';
import MarkdownDisplay from '../MarkdownDisplay.tsx';

interface ProductReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    teacher: Teacher;
    onApprove: () => void;
    onReject: () => void;
}

const ProductReviewModal: React.FC<ProductReviewModalProps> = ({ isOpen, onClose, product, teacher, onApprove, onReject }) => {
    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });
    const [coverImageIndex, setCoverImageIndex] = React.useState(0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Review Product" size="4xl">
            <div className="space-y-6">
                {/* Header Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-lg shadow-lg overflow-hidden">
                         <ImageCarousel
                            images={product.coverImages}
                            isEditable={false}
                            currentIndex={coverImageIndex}
                            onIndexChange={setCoverImageIndex}
                            onEditImage={() => {}}
                            onRemoveImage={() => {}}
                        />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold">{product.title}</h2>
                        <p className="text-sm text-light-subtle dark:text-dark-subtle mt-1">by {teacher.name}</p>
                        
                        <div className="my-4">
                            <p className="text-3xl font-bold text-primary">{currencyFormatter.format(product.price)}</p>
                        </div>
                        
                        <div className="mt-4 space-y-3 text-sm border-t border-light-border dark:border-dark-border pt-4">
                            <p><strong>Type:</strong> <span className="capitalize">{product.type}</span></p>
                            {product.type === 'digital' && product.downloadUrl && (
                                <div className="flex items-center">
                                    <strong className="mr-2">Download Link:</strong>
                                    <a href={product.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex items-center gap-1">
                                        <DownloadIcon className="w-4 h-4" />
                                        <span>Click to verify</span>
                                    </a>
                                </div>
                            )}
                            {product.type === 'physical' && (
                                <>
                                    <p><strong>Stock:</strong> {product.stock !== undefined && product.stock >= 0 ? `${product.stock} available` : 'Unlimited'}</p>
                                    {/* FIX: Removed reference to non-existent 'shippingCost' property. Shipping is included in the price. */}
                                    <p><strong>Lead Time:</strong> {product.orderLeadTime || 'Not specified'}</p>
                                </>
                            )}
                        </div>

                    </div>
                </div>

                {/* Description Section */}
                <div>
                    <h3 className="text-xl font-semibold mb-3 border-b border-light-border dark:border-dark-border pb-2">Description</h3>
                    <div className="max-h-[30vh] overflow-y-auto pr-2">
                        <MarkdownDisplay content={product.description} />
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-6 flex justify-end space-x-3 border-t border-light-border dark:border-dark-border">
                    <button onClick={onReject} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                        <XCircleIcon className="w-5 h-5" />
                        <span>Reject</span>
                    </button>
                    <button onClick={onApprove} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                        <CheckCircleIcon className="w-5 h-5" />
                        <span>Approve</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ProductReviewModal;