import React, { useMemo, useState } from 'react';
import { Product, Teacher } from '../../types';
import ProductReviewModal from './ProductReviewModal';

interface ProductManagementProps {
  teachers: Teacher[];
  onProductApproval: (teacherId: string, productId: string, decision: 'approved' | 'rejected') => void;
}

const ProductManagement: React.FC<ProductManagementProps> = ({ teachers, onProductApproval }) => {
    const [productToReview, setProductToReview] = useState<{ product: Product, teacher: Teacher } | null>(null);

    const pendingProducts = useMemo(() => {
        return teachers.flatMap(teacher => 
            (teacher.products || [])
                .filter(product => product.adminApproval === 'pending')
                .map(product => ({ product, teacher }))
        );
    }, [teachers]);

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });

    const handleApprove = () => {
        if (!productToReview) return;
        onProductApproval(productToReview.teacher.id, productToReview.product.id, 'approved');
        setProductToReview(null);
    };

    const handleReject = () => {
        if (!productToReview) return;
        onProductApproval(productToReview.teacher.id, productToReview.product.id, 'rejected');
        setProductToReview(null);
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Product Management</h1>
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Products Pending Review ({pendingProducts.length})</h2>
                {pendingProducts.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                            <thead className="bg-light-background dark:bg-dark-background">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Product</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Teacher</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Price</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Type</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-light-border dark:divide-dark-border">
                                {pendingProducts.map(({ product, teacher }) => (
                                    <tr key={product.id}>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <img src={product.coverImages?.[0] || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 150 150' fill='%23e2e8f0'%3E%3Crect width='150' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16px' fill='%2364748b'%3ENo Img%3C/text%3E%3C/svg%3E"} alt={product.title} className="w-12 h-12 object-cover rounded-md mr-4" />
                                                <div>
                                                    <button onClick={() => setProductToReview({ product, teacher })} className="font-semibold text-primary hover:underline text-left">
                                                        {product.title}
                                                    </button>
                                                    <p className="text-xs text-light-subtle dark:text-dark-subtle">{product.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">{teacher.name}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right font-semibold">{currencyFormatter.format(product.price)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center capitalize">{product.type}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center space-x-2">
                                            <button onClick={() => onProductApproval(teacher.id, product.id, 'approved')} className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Approve</button>
                                            <button onClick={() => onProductApproval(teacher.id, product.id, 'rejected')} className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Reject</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">No products are currently pending review.</p>
                )}
            </div>
            {productToReview && (
                <ProductReviewModal
                    isOpen={!!productToReview}
                    onClose={() => setProductToReview(null)}
                    product={productToReview.product}
                    teacher={productToReview.teacher}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            )}
        </div>
    );
};

export default ProductManagement;