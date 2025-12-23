import React, { useMemo, useState } from 'react';
import { Sale, User, PhotoCartItem } from '../../types.ts';
import { useData } from '../../contexts/DataContext.tsx';
import { ChevronDownIcon } from '../Icons.tsx';

const PhotoItem: React.FC<{ item: PhotoCartItem }> = ({ item }) => (
    <div className="flex items-center gap-3 p-2 bg-light-surface dark:bg-dark-surface rounded">
        <img src={item.photo.url_thumb} alt="thumbnail" className="w-12 h-12 rounded object-cover"/>
        <div>
            <p className="font-semibold text-xs">Photo #{item.photo.id.slice(-6)}</p>
            <p className="text-xs text-light-subtle dark:text-dark-subtle">Print ({item.printOption?.size}) x{item.quantity}</p>
        </div>
    </div>
);

const PhotoOrderManagement: React.FC = () => {
    const { sales, users, handleUpdatePhotoOrderStatus } = useData();
    const [openOrderId, setOpenOrderId] = useState<string | null>(null);

    const printOrders = useMemo(() => {
        return sales
            .filter(s => s.itemType === 'photo_purchase' && s.photoOrderStatus && s.photoOrderStatus !== 'delivered')
            .map(s => ({
                ...s,
                student: users.find(u => u.id === s.studentId)
            }))
            .sort((a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime());
    }, [sales, users]);

    const handleStatusChange = (saleId: string, status: Sale['photoOrderStatus']) => {
        handleUpdatePhotoOrderStatus(saleId, status);
    };

    const toggleOrder = (orderId: string) => {
        setOpenOrderId(prev => (prev === orderId ? null : orderId));
    };

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Photo Print Order Management</h1>
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Active Print Orders ({printOrders.length})</h2>
                {printOrders.length > 0 ? (
                    <div className="space-y-3">
                        {printOrders.map(order => {
                            const printItems = (order.cartItems?.filter(item => item.type === 'photo_print') || []) as PhotoCartItem[];
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
                                                value={order.photoOrderStatus}
                                                onChange={(e) => handleStatusChange(order.id, e.target.value as any)}
                                                onClick={(e) => e.stopPropagation()} // Prevent accordion from closing
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
                                                    <h4 className="font-semibold text-sm mb-2">Items to Print ({printItems.length}):</h4>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                                        {printItems.map((item, index) => (
                                                            <PhotoItem key={`${item.photo.id}-${index}`} item={item} />
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
                                                            <p>{order.shippingAddress.city}{order.shippingAddress.state && `, ${order.shippingAddress.state}`} {order.shippingAddress.postalCode}</p>
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
                    <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">No active print orders.</p>
                )}
            </div>
        </div>
    );
};

export default PhotoOrderManagement;