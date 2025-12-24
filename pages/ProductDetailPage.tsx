
import React from 'react';
import { useData, useFetchItem } from '../contexts/DataContext.tsx';
import { getOptimizedImageUrl } from '../utils.ts';
import { useNavigation } from '../contexts/NavigationContext.tsx';
import { useUI } from '../contexts/UIContext.tsx';
import { ChevronLeftIcon, ShoppingCartIcon, SpinnerIcon } from '../components/Icons.tsx';
import MarkdownDisplay from '../components/MarkdownDisplay.tsx';
import { useSEO } from '../hooks/useSEO.ts';
import { ProductCartItem, Product, Teacher } from '../types.ts';
import ProductImageCarousel from "../components/ProductImageCarousel.tsx";

interface ProductDetailPageProps {
    productId: string;
}

const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ productId }) => {
    const { handleBack, handleNavigate } = useNavigation();
    const { addToCart } = useUI();
    const { loading: dataLoading } = useData();
    const { item: fetchedProduct, teacher } = useFetchItem('product', productId);

    // Explicitly cast the item to Product since useFetchItem returns a union
    const product = fetchedProduct as Product | null;

    useSEO(
        product ? product.title : 'Product Details',
        product ? product.description.substring(0, 160) : 'View product details on clazz.lk',
        product && product.coverImages && product.coverImages.length > 0 ? product.coverImages[0] : undefined
    );

    if (dataLoading) {
        return (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center flex flex-col items-center justify-center">
                <SpinnerIcon className="w-8 h-8 text-primary" />
                <p className="mt-4 text-light-subtle dark:text-dark-subtle">Loading product details...</p>
            </div>
        );
    }

    if (!product || !teacher || !('type' in product)) {
        return <div>Product not found or has been removed.</div>;
    }

    const handleAddToCart = () => {
        const itemToAdd: Omit<ProductCartItem, 'id' | 'quantity'> = { type: 'product', product };
        addToCart(itemToAdd);
    };

    const onViewTeacher = (teacher: Teacher) => {
        if (teacher.username) {
            handleNavigate({ name: 'teacher_profile_slug', slug: teacher.username });
        } else {
            handleNavigate({ name: 'teacher_profile', teacherId: teacher.id });
        }
    };

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slideInUp">
            <div className="mb-4">
                <button onClick={handleBack} className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors">
                    <ChevronLeftIcon className="h-5 w-5" />
                    <span>Back</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="rounded-lg shadow-lg overflow-hidden">
                    {product.coverImages && product.coverImages.length > 0 ? (
                        <ProductImageCarousel images={product.coverImages} />
                    ) : (
                        <div className="flex items-center justify-center h-[400px] bg-gray-100 text-gray-500">
                            No images available
                        </div>
                    )}
                </div>

                <div>
                    <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                        <h1 className="text-3xl font-bold">{product.title}</h1>
                        <button onClick={() => onViewTeacher(teacher)} className="mt-2 flex items-center space-x-2 group">
                            <img src={getOptimizedImageUrl(teacher.avatar, 32, 32)} alt={teacher.name} className="w-8 h-8 rounded-full" />
                            <div>
                                <p className="text-sm text-light-subtle dark:text-dark-subtle">Created by</p>
                                <p className="font-semibold group-hover:underline">{teacher.name}</p>
                            </div>
                        </button>

                        <div className="my-6">
                            <p className="text-4xl font-bold text-primary">{currencyFormatter.format(product.price)}</p>
                        </div>

                        <button onClick={handleAddToCart} className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-3 rounded-md hover:bg-primary-dark transition-colors">
                            <ShoppingCartIcon className="w-5 h-5" />
                            Add to Cart
                        </button>

                        <div className="mt-6 space-y-3 text-sm border-t border-light-border dark:border-dark-border pt-4">
                            <p><strong>Type:</strong> <span className="capitalize">{product.type}</span></p>
                            {product.type === 'physical' && (
                                <>
                                    <p><strong>Stock:</strong> {product.stock !== undefined && product.stock > 0 ? `${product.stock} available` : (product.stock === 0 ? 'Out of Stock' : 'Available')}</p>
                                    <p><strong>Lead Time:</strong> {product.orderLeadTime || 'Not specified'}</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 bg-light-surface dark:bg-dark-surface p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-4">Product Description</h2>
                <MarkdownDisplay content={product.description} />
            </div>
        </div>
    );
};

export default ProductDetailPage;
