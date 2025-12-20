import React, { useMemo, useState } from 'react';
import { Sale, User, ProductCartItem } from '../../types';
import { useData } from '../../contexts/DataContext';
import { ChevronDownIcon } from '../Icons';

const ProductItem: React.FC<{ item: ProductCartItem }> = ({ item }) => (
    <div className="flex items-center gap-3 p-2 bg-light-surface dark:bg-dark-surface rounded">
        <img src={item.product.coverImages?.[0] || 'https://via.placeholder.com/150.png?text=No+Img'} alt={item.product.title} className="w-12 h-12 rounded object-cover"/>
        <div>
            <p className="font-semibold text-xs">{item.product.title}</p>
            <p className="text-xs text-light-subtle dark:text-dark-subtle">Qty: {item.quantity}</p>
        </div>
    </div>
);

const PhysicalOrderManagement: React.FC = () => {
    const { sales, users, handleUpdatePhysicalOrderStatus } = useData();
    const [openOrderId, setOpenOrderId] = useState<string | null>(null);

    const physicalOrders = useMemo(() => {
        return sales
            .filter(s => s.itemType === 'marketplace_purchase' && s.physicalOrderStatus && s.physicalOrderStatus !== 'delivered')
            .map(s => ({
                ...s,
                student: users.find(u => u.id === s.studentId)
            }))
            .sort((a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime());
    }, [sales, users]);

    const handleStatusChange = (saleId: string, status: Sale['physicalOrderStatus']) => {
        handleUpdatePhysicalOrderStatus(saleId, status);
    };

    const toggleOrder = (orderId: string) => {
        setOpenOrderId(prev => (prev === orderId ? null : orderId));
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Physical Product Order Management</h1>
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Active Physical Orders ({physicalOrders.length})</h2>
                {physicalOrders.length > 0 ? (
                    <div className="space-y-3">
                        {physicalOrders.map(order => {
                            const physicalItems = (order.cartItems?.filter(item => item.type === 'product' && item.product.type === 'physical') || []) as ProductCartItem[];
                            if (physicalItems.length === 0) return null;
                            
                            return (
                                <div key={order.id} className="border border-light-border dark:border-dark-border rounded-lg">
                                    <button onClick={() => toggleOrder(order.id)} className="w-full flex items-center justify-between p-4 text-left">
                                        <div>
                                            <p className="font-semibold">{order.student?.firstName} {order.student?.lastName}</p>
                                            <p className="text-xs text-light-subtle dark:text-dark-subtle">
                                                ID: {order.id} | Date: {new Date(order.saleDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <select
                                                value={order.physicalOrderStatus}
                                                onChange={(e) => handleStatusChange(order.id, e.target.value as any)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background focus:ring-primary focus:border-primary"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="processing">Processing</option>
                                                <option value="shipped">Shipped</option>
                                                <option value="delivered">Delivered</option>
                                            </select>
                                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${openOrderId === order.id ? 'rotate-180' : ''}`} />
                                        </div>
                                    </button>
                                    {openOrderId === order.id && (
                                        <div className="p-4 border-t border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <h4 className="font-semibold text-sm mb-2">Items ({physicalItems.length}):</h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                                        {physicalItems.map((item, index) => (
                                                            <ProductItem key={`${item.product.id}-${index}`} item={item} />
                                                        ))}
                                                    </div>
                                                </div>
                                                {order.shippingAddress && (
                                                    <div className="pt-4 md:pt-0 md:border-l md:border-light-border md:dark:border-dark-border md:pl-4">
                                                        <h4 className="font-semibold text-sm mb-2">Shipping Address:</h4>
                                                        <address className="not-italic text-xs text-light-subtle dark:text-dark-subtle">
                                                            <p className="font-medium text-light-text dark:text-dark-text">{order.student?.firstName} {order.student?.lastName}</p>
                                                            <p>{order.shippingAddress.line1}</p>
                                                            {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                                                            <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                                                            <p className="mt-2 font-semibold text-light-text dark:text-dark-text">{order.student?.contactNumber}</p>
                                                        </address>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">No active physical product orders.</p>
                )}
            </div>
        </div>
    );
};

export default PhysicalOrderManagement;