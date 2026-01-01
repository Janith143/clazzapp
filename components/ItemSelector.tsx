import React, { useState, useMemo } from 'react';
import FormInput from './FormInput';
import { XIcon } from './Icons';
// Actually, looking at SiteContentManagement, it uses: import { SaveIcon, PlusIcon, TrashIcon } from '../Icons.tsx';
// I should probably use that or check if I can use heroicons directly. Use Icons.tsx if possible for consistency.

interface Item {
    id: string | number;
    title: string; // or name, handled via simple mapping
    subtitle?: string; // e.g., teacher name for a course
}

interface ItemSelectorProps {
    label: string;
    items: Item[];
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
    maxSelection?: number;
}

const ItemSelector: React.FC<ItemSelectorProps> = ({ label, items, selectedIds, onSelectionChange, maxSelection }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredItems = useMemo(() => {
        if (!searchQuery) return [];
        const lower = searchQuery.toLowerCase();
        return items
            .filter(item => !selectedIds.includes(String(item.id))) // Exclude already selected
            .filter(item => item.title.toLowerCase().includes(lower) || item.subtitle?.toLowerCase().includes(lower))
            .slice(0, 10); // Limit results
    }, [items, searchQuery, selectedIds]);

    const selectedItems = useMemo(() => {
        return selectedIds.map(id => items.find(i => String(i.id) === String(id))).filter(Boolean) as Item[];
    }, [items, selectedIds]);

    const handleSelect = (item: Item) => {
        if (maxSelection && selectedIds.length >= maxSelection) return;
        onSelectionChange([...selectedIds, String(item.id)]);
        setSearchQuery('');
    };

    const handleRemove = (id: string) => {
        onSelectionChange(selectedIds.filter(i => i !== id));
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>

            {/* Selected Items Chips */}
            <div className="flex flex-wrap gap-2 mb-2">
                {selectedItems.map(item => (
                    <div key={item.id} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                        <span>{item.title}</span>
                        {item.subtitle && <span className="text-xs opacity-70">({item.subtitle})</span>}
                        <button onClick={() => handleRemove(String(item.id))} className="hover:text-red-500">
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Search Input */}
            <div className="relative">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search to add..."
                    className="w-full px-4 py-2 border rounded-lg dark:bg-dark-card dark:border-dark-border focus:ring-2 focus:ring-primary focus:outline-none"
                    disabled={maxSelection ? selectedIds.length >= maxSelection : false}
                />

                {/* Dropdown */}
                {filteredItems.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-card border dark:border-dark-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleSelect(item)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex justify-between items-center"
                            >
                                <span>{item.title}</span>
                                {item.subtitle && <span className="text-sm text-gray-500">{item.subtitle}</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {maxSelection && <p className="text-xs text-gray-500">Maximum {maxSelection} items.</p>}
        </div>
    );
};

export default ItemSelector;
