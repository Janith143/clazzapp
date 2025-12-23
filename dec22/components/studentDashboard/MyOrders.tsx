import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { PhotoCartItem, ProductCartItem, Product, User } from '../../types';
import { downloadImage, getOptimizedImageUrl } from '../../utils';
import { DownloadIcon } from '../Icons';
import OrderStatusTracker from './OrderStatusTracker';

interface MyOrdersProps {
    user: User;
}

const PhotoItem: React.FC<{ item: PhotoCartItem }> = ({ item }) => {
    const currencyFormatter = new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 0,
    });

    // Use the utility to get an optimized thumbnail for display (e.g., 150px width)
    const displayImage = useMemo(() => {
        return getOptimizedImageUrl(item.photo.url_thumb || '', 150);
    }, [item.photo.url_thumb]);

    const handleRedownload = () => {
        let downloadUrl = '';
        let fileIdForName = item.photo.id || 'photo';

        if (item.type === 'photo_download_highres' && item.photo.url_highres) {
            downloadUrl = item.photo.url_highres;
        } else if (item.photo.url_thumb) {
            // Try to get high res from thumb if highres field is missing (common pattern for drive images)
            downloadUrl = item.photo.url_thumb.replace(/=s\d+$/, '=s1600');
        } else if (item.photo.id && /^[A-Za-z0-9_-]{20,}$/.test(item.photo.id)) {
            downloadUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(
                item.photo.id
            )}`;
        } else {
            alert('No download link available for this photo.');
            return;
        }

        const cleanedDownloadUrl = downloadUrl.replace(/&amp;/g, '&');
        downloadImage(cleanedDownloadUrl, `clazz_lk_${fileIdForName}.png`);
    };

    const price = (item.price || 0) * item.quantity;

    return (
        <div className="flex items-center gap-4 p-2 bg-light-surface dark:bg-dark-surface rounded-md">
            <img
                src={displayImage || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 150 150' fill='%23e2e8f0'%3E%3Crect width='150' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16px' fill='%2364748b'%3ENo Photo%3C/text%3E%3C/svg%3E"}
                alt="thumbnail"
                className="w-16 h-16 rounded-md object-cover"
                loading="lazy"
            />
            <div className="flex-grow">
                <p className="font-semibold text-sm text-light-text dark:text-dark-text">
                    Photo #{item.photo.id?.slice(-6) || 'N/A'}
                </p>
                <p className="text-xs capitalize text-light-subtle dark:text-dark-subtle">
                    {item.type.replace('photo_', '').replace('_', ' ')}
                    {item.type === 'photo_print' && ` (${item.printOption?.size})`}
                    {item.quantity > 1 && ` x ${item.quantity}`}
                </p>
            </div>
            <div className="text-right">
                <p className="font-semibold text-sm text-light-text dark:text-dark-text">
                    {currencyFormatter.format(price)}
                </p>
                {(item.type === 'photo_download' || item.type === 'photo_download_highres') && (
                    <button onClick={handleRedownload} className="text-xs text-primary hover:underline">
                        Re-download
                    </button>
                )}
            </div>
        </div>
    );
};

const ProductItem: React.FC<{ item: ProductCartItem }> = ({ item }) => {
    const currencyFormatter = new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 0,
    });
    const { teachers } = useData();
    const { handleNavigate } = useNavigation();

    const snapshotProduct = item.product as any;

    const liveProduct = useMemo(() => {
        const teacherId = snapshotProduct?.teacherId || snapshotProduct?.sellerId;
        if (!teacherId || !snapshotProduct?.id) return null;
        const teacher = teachers.find((t) => t.id === teacherId);
        return teacher?.products?.find((p) => p.id === snapshotProduct.id);
    }, [teachers, snapshotProduct]);

    const displayTitle = liveProduct?.title || snapshotProduct.title;

    const displayImage = useMemo(() => {
        let imageUrl: string | undefined;
        const coverImagesSource = snapshotProduct.coverImages;
        const legacyCoverImage = snapshotProduct.coverImage;

        if (Array.isArray(coverImagesSource) && coverImagesSource.length > 0 && coverImagesSource[0]) {
            imageUrl = coverImagesSource[0];
        } else if (typeof legacyCoverImage === 'string' && legacyCoverImage) {
            imageUrl = legacyCoverImage;
        } else if (typeof coverImagesSource === 'string' && coverImagesSource) {
            imageUrl = coverImagesSource;
        }
        
        return getOptimizedImageUrl(imageUrl || '', 150);
    }, [item.product]);

    const downloadUrl = snapshotProduct.downloadUrl || snapshotProduct.digitalFileUrl;
    const productType = snapshotProduct.type;

    const handleRedownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (productType === 'digital' && downloadUrl) {
            const filename = displayTitle.replace(/[^a-zA-Z0-9.-]/g, '_') || 'download';
            const cleanUrl = downloadUrl.replace(/&amp;/g, '&');
            downloadImage(cleanUrl, filename);
        }
    };

    const handleViewDetails = () => {
        if (snapshotProduct.id) {
            handleNavigate({ name: 'product_detail', productId: snapshotProduct.id });
        }
    };

    return (
        <div className="flex items-center gap-4 p-2 bg-light-surface dark:bg-dark-surface rounded-md">
            <button
                onClick={handleViewDetails}
                className="flex items-center gap-4 flex-grow text-left hover:opacity-80 transition-opacity rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
                <img
                    src={displayImage || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 150 150' fill='%23e2e8f0'%3E%3Crect width='150' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16px' fill='%2364748b'%3ENo Image%3C/text%3E%3C/svg%3E"}
                    alt={displayTitle}
                    className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                    loading="lazy"
                />
                <div className="flex-grow">
                    <p className="font-semibold text-sm text-light-text dark:text-dark-text">{displayTitle}</p>
                    <p className="text-xs capitalize text-light-subtle dark:text-dark-subtle">
                        {productType} {item.quantity > 1 && ` x ${item.quantity}`}
                    </p>
                </div>
            </button>
            <div className="text-right flex-shrink-0">
                <p className="font-semibold text-sm text-light-text dark:text-dark-text">
                    {currencyFormatter.format(snapshotProduct.price * item.quantity)}
                </p>
                {productType === 'digital' && downloadUrl && (
                    <button
                        onClick={handleRedownload}
                        className="text-xs text-primary hover:underline flex items-center justify-end gap-1 mt-1"
                    >
                        <DownloadIcon className="w-3 h-3" /> Re-download
                    </button>
                )}
            </div>
        </div>
    );
};

const MyOrders: React.FC<MyOrdersProps> = ({ user }) => {
    const { sales } = useData();

    const myOrders = useMemo(() => {
        if (!user) return [];
        return sales
            .filter(
                (s) =>
                    s.studentId === user.id &&
                    s.status === 'completed' &&
                    (s.itemType === 'photo_purchase' || s.itemType === 'marketplace_purchase')
            )
            .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    }, [user, sales]);

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });

    return myOrders.length > 0 ? (
        <div className="space-y-6">
            {myOrders.map((order) => {
                const hasCartItems = order.cartItems && order.cartItems.length > 0;
                const isLegacyProduct =
                    !hasCartItems &&
                    order.itemSnapshot &&
                    'price' in order.itemSnapshot &&
                    !('lectures' in order.itemSnapshot);

                if (!hasCartItems && !isLegacyProduct) return null;

                return (
                    <div
                        key={order.id}
                        className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden"
                    >
                        <div className="p-4 bg-light-background dark:bg-dark-background border-b border-light-border dark:border-dark-border flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div>
                                <p className="text-xs text-light-subtle dark:text-dark-subtle">
                                    Order ID: {order.id}
                                </p>
                                <p className="font-semibold text-light-text dark:text-dark-text">
                                    Order Date: {new Date(order.saleDate).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="text-left sm:text-right">
                                <p className="font-bold text-lg text-primary">
                                    {currencyFormatter.format(
                                        order.totalAmount + order.amountPaidFromBalance
                                    )}
                                </p>
                            </div>
                        </div>
                        {(order.photoOrderStatus || order.physicalOrderStatus) && (
                            <div className="p-6 border-b border-light-border dark:border-dark-border">
                                <OrderStatusTracker
                                    status={order.photoOrderStatus || order.physicalOrderStatus}
                                />
                            </div>
                        )}
                        {order.shippingAddress && (
                            <div className="p-4 text-sm border-b border-light-border dark:border-dark-border">
                                <h4 className="font-semibold mb-1 text-light-text dark:text-dark-text">
                                    Shipping to:
                                </h4>
                                <address className="not-italic text-light-subtle dark:text-dark-subtle text-xs">
                                    {order.shippingAddress.line1}
                                    <br />
                                    {order.shippingAddress.line2 && (
                                        <>
                                            {order.shippingAddress.line2}
                                            <br />
                                        </>
                                    )}
                                    {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                                    {order.shippingAddress.postalCode}
                                    <br />
                                    {order.shippingAddress.country}
                                </address>
                            </div>
                        )}
                        <div className="p-4 space-y-3">
                            {hasCartItems &&
                                order.cartItems!.map((item, index) => {
                                    if (item.type.startsWith('photo'))
                                        return (
                                            <PhotoItem
                                                key={`${item.id}-${index}`}
                                                item={item as PhotoCartItem}
                                            />
                                        );
                                    if (item.type === 'product')
                                        return (
                                            <ProductItem
                                                key={`${item.id}-${index}`}
                                                item={item as ProductCartItem}
                                            />
                                        );
                                    return null;
                                })}
                            {isLegacyProduct && (
                                <ProductItem
                                    item={{
                                        type: 'product',
                                        id: order.id,
                                        product: order.itemSnapshot as Product,
                                        quantity: 1,
                                    }}
                                />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    ) : (
        <p className="text-center py-8 text-light-subtle dark:text-dark-subtle">
            This student has not purchased any products or photos yet.
        </p>
    );
};

export default MyOrders;
