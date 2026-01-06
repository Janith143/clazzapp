
import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to track "new" items based on a timestamp field and localStorage.
 * 
 * @param key Unique key for localStorage (e.g., 'last_viewed_earnings')
 * @param items Array of items to check
 * @param dateField The field in the item object that contains the date/timestamp string
 * @returns { unseenCount, markAsViewed }
 */
export const useSmartBadge = (key: string, items: any[], dateField: string = 'createdAt') => {
    const [lastViewed, setLastViewed] = useState<number>(() => {
        if (typeof window === 'undefined') return 0;
        const stored = localStorage.getItem(key);
        return stored ? parseInt(stored, 10) : 0;
    });

    const [unseenCount, setUnseenCount] = useState(0);

    useEffect(() => {
        if (!items || items.length === 0) {
            setUnseenCount(0);
            return;
        }

        const count = items.reduce((acc, item) => {
            const itemDate = new Date(item[dateField]).getTime();
            if (itemDate > lastViewed) {
                return acc + 1;
            }
            return acc;
        }, 0);

        setUnseenCount(count);
    }, [items, lastViewed, dateField]);

    const markAsViewed = useCallback(() => {
        const now = Date.now();
        setLastViewed(now);
        setUnseenCount(0);
        if (typeof window !== 'undefined') {
            localStorage.setItem(key, now.toString());
        }
    }, [key]);

    return { unseenCount, markAsViewed };
};
