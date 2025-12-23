import React, { useState } from 'react';
import { XIcon, PlusIcon } from './Icons';

interface TagInputProps {
    label: string;
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    placeholder?: string;
}

const TagInput: React.FC<TagInputProps> = ({ label, tags, onTagsChange, placeholder = "Type and click + to add" }) => {
    const [inputValue, setInputValue] = useState('');

    const handleAdd = () => {
        const newTag = inputValue.trim();
        if (newTag) {
            if (!tags.includes(newTag)) {
                onTagsChange([...tags, newTag]);
            }
            setInputValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    const removeTag = (tagToRemove: string) => {
        onTagsChange(tags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">{label}</label>
            
            <div className="flex gap-2 mb-3">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-grow px-3 py-2 border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-light-text dark:text-dark-text"
                    placeholder={placeholder}
                />
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!inputValue.trim()}
                    className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                    <span key={tag} className="flex items-center bg-primary/10 text-primary text-sm font-medium px-3 py-1.5 rounded-full border border-primary/20">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="ml-2 text-primary/70 hover:text-red-500 focus:outline-none transition-colors">
                            <XIcon className="w-3 h-3" />
                        </button>
                    </span>
                ))}
            </div>
        </div>
    );
};

export default TagInput;