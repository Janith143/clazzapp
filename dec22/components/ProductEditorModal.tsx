import React, { useState, useEffect } from 'react';
import { Product } from '../types.ts';
import Modal from './Modal.tsx';
import FormInput from './FormInput.tsx';
import FormSelect from './FormSelect.tsx';
import ImageUploadInput from './ImageUploadInput.tsx';
import { SaveIcon, XIcon, TrashIcon } from './Icons.tsx';
import { useData } from '../contexts/DataContext.tsx';
import MarkdownEditor from './MarkdownEditor.tsx';

interface ProductEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void | Promise<void>;
  initialData: Product | null;
  teacherId: string;
}

const ProductEditorModal: React.FC<ProductEditorModalProps> = ({ isOpen, onClose, onSave, initialData, teacherId }) => {
    const { handleImageSave } = useData();
    const [product, setProduct] = useState<Partial<Product>>({});
    const [images, setImages] = useState<(string | null)[]>([null, null, null]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setError('');
            setIsSaving(false);
            if (initialData) {
                setProduct(initialData);
                // Pad the images array to always have 3 slots
                const initialImages = initialData.coverImages || [];
                setImages([...initialImages, null, null, null].slice(0, 3));
            } else {
                setProduct({
                    teacherId: teacherId,
                    title: '',
                    description: '',
                    type: 'digital',
                    price: 0,
                    currency: 'LKR',
                    isPublished: false,
                    adminApproval: 'not_requested',
                    coverImages: [],
                });
                setImages([null, null, null]);
            }
        }
    }, [isOpen, initialData, teacherId]);

    const handleImageChange = (index: number, base64: string) => {
        const newImages = [...images];
        newImages[index] = base64;
        setImages(newImages);
    };

    const handleRemoveImage = (index: number) => {
        const newImages = [...images];
        newImages[index] = null;
        setImages(newImages);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? parseFloat(value) || 0 : value;
        
        setProduct(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSaving(true);
        try {
            const uploadPromises = images.map(img => {
                if (img && img.startsWith('data:image')) {
                    return handleImageSave(img, 'product_cover', { teacherId });
                }
                return Promise.resolve(img);
            });

            const finalImageUrls = (await Promise.all(uploadPromises)).filter(Boolean) as string[];

            if (finalImageUrls.length === 0) {
                throw new Error("At least one cover image is required.");
            }

            const finalProduct: Product = {
                id: initialData?.id || `prod_${Date.now()}`,
                ...product,
                coverImages: finalImageUrls,
            } as Product;
            
            await onSave(finalProduct);
            onClose();

        } catch(e) {
            setError((e as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    const maxImages = product.type === 'physical' ? 3 : 1;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Product' : 'Create New Product'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput label="Product Title" name="title" value={product.title || ''} onChange={handleChange} required />
                
                <div className="space-y-4">
                    <p className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                        Product Images {product.type === 'physical' && `(up to ${maxImages})`}
                    </p>
                    {Array.from({ length: maxImages }).map((_, index) => (
                        <div key={index}>
                            <ImageUploadInput 
                                label={index === 0 ? 'Main Cover Image' : `Additional Image ${index + 1}`}
                                currentImage={images[index]} 
                                onImageChange={(base64) => handleImageChange(index, base64)} 
                                aspectRatio="aspect-video" 
                            />
                            {images[index] && (
                                <button type="button" onClick={() => handleRemoveImage(index)} className="text-xs text-red-500 hover:underline mt-1 flex items-center gap-1">
                                    <TrashIcon className="w-3 h-3"/> Remove Image
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <MarkdownEditor
                    label="Description"
                    id="description"
                    name="description"
                    value={product.description || ''}
                    onChange={handleChange}
                    rows={4}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormSelect label="Product Type" name="type" value={product.type || 'digital'} onChange={handleChange} options={[{value: 'digital', label: 'Digital'}, {value: 'physical', label: 'Physical'}]} />
                    <div>
                        <FormInput label="Price (LKR)" name="price" type="number" value={product.price?.toString() || ''} onChange={handleChange} required />
                        {product.type === 'physical' && (
                            <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">
                                No extra charges are collected for Shipping. Please include the shipping cost in the product price.
                            </p>
                        )}
                    </div>
                </div>

                {product.type === 'digital' && (
                    <FormInput label="Download URL / File Path" name="downloadUrl" value={product.downloadUrl || ''} onChange={handleChange} placeholder="e.g., Google Drive link" />
                )}
                {product.type === 'physical' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput label="Stock Quantity" name="stock" type="number" value={product.stock?.toString() || ''} onChange={handleChange} placeholder="Leave empty for unlimited" />
                        <FormInput label="Order Lead Time" name="orderLeadTime" type="text" value={product.orderLeadTime || ''} onChange={handleChange} placeholder="e.g., 2-3 business days" />
                    </div>
                )}
                
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <div className="pt-4 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md flex items-center text-light-text dark:text-dark-text"><XIcon className="w-4 h-4 mr-2"/>Cancel</button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50 flex items-center"><SaveIcon className="w-4 h-4 mr-2"/>{isSaving ? 'Saving...' : 'Save Product'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default ProductEditorModal;