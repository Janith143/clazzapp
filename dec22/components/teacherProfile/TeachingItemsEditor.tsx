
import React, { useState, useMemo } from 'react';
import { TeachingItem } from '../../types';
import { useNavigation } from '../../contexts/NavigationContext';
import { targetAudienceOptions } from '../../data/mockData';
import FormSelect from '../FormSelect';
import { CheckCircleIcon, PlusIcon, TrashIcon } from '../Icons';
import { v4 as uuidv4 } from 'uuid';
import { useUI } from '../../contexts/UIContext';

interface TeachingItemsEditorProps {
    items: TeachingItem[];
    onChange: (items: TeachingItem[]) => void;
}

const TeachingItemsEditor: React.FC<TeachingItemsEditorProps> = ({ items, onChange }) => {
    const { subjects: subjectsByAudience } = useNavigation();
    const { addToast } = useUI();

    const [newItemAudience, setNewItemAudience] = useState(targetAudienceOptions[0].value);
    const [newItemSubject, setNewItemSubject] = useState('');
    const [newItemMediums, setNewItemMediums] = useState<string[]>([]);
    const [newItemGrades, setNewItemGrades] = useState<string[]>([]);

    const availableSubjects = useMemo(() => {
        if (!newItemAudience) return [];
        return subjectsByAudience[newItemAudience] || [];
    }, [newItemAudience, subjectsByAudience]);

    const availableGrades = useMemo(() => {
        if (newItemAudience.includes('Primary')) {
            return ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
        } else if (newItemAudience.includes('Secondary') || newItemAudience.includes('Ordinary Level')) {
            return ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'];
        } else if (newItemAudience.includes('Advanced Level')) {
            return ['Grade 12', 'Grade 13', 'Revision'];
        }
        return [];
    }, [newItemAudience]);

    const toggleMedium = (medium: string) => {
        setNewItemMediums(prev => prev.includes(medium) ? prev.filter(m => m !== medium) : [...prev, medium]);
    };

    const toggleGrade = (grade: string) => {
        setNewItemGrades(prev => prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]);
    };

    const handleAddTeachingItem = () => {
        if (!newItemAudience || !newItemSubject) {
            addToast("Please select an audience and a subject.", "error");
            return;
        }
        if (newItemMediums.length === 0) {
            addToast("Please select at least one medium.", "error");
            return;
        }
        if (availableGrades.length > 0 && newItemGrades.length === 0) {
            addToast("Please select at least one grade.", "error");
            return;
        }

        const newItem: TeachingItem = {
            id: uuidv4(),
            audience: newItemAudience,
            subject: newItemSubject,
            mediums: newItemMediums,
            grades: newItemGrades
        };

        onChange([...items, newItem]);
        setNewItemMediums([]);
        setNewItemGrades([]);
    };

    const handleRemoveTeachingItem = (id: string) => {
        onChange(items.filter(item => item.id !== id));
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold border-b border-light-border dark:border-dark-border pb-2 text-light-text dark:text-dark-text">Teaching Areas</h2>
            
            {/* Builder Form */}
            <div className="p-4 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                     <FormSelect 
                        label="1. Target Audience" 
                        name="audience" 
                        value={newItemAudience} 
                        onChange={(e) => { setNewItemAudience(e.target.value); setNewItemSubject(''); }} 
                        options={targetAudienceOptions} 
                    />
                    <FormSelect 
                        label="2. Subject" 
                        name="subject" 
                        value={newItemSubject} 
                        onChange={(e) => setNewItemSubject(e.target.value)} 
                        options={availableSubjects} 
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">3. Medium</label>
                    <div className="flex flex-wrap gap-3">
                        {['Sinhala', 'Tamil', 'English'].map(medium => (
                            <label key={medium} className={`flex items-center px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${newItemMediums.includes(medium) ? 'bg-primary/10 border-primary text-primary font-medium' : 'bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border text-light-text dark:text-dark-text'}`}>
                                <input type="checkbox" className="hidden" checked={newItemMediums.includes(medium)} onChange={() => toggleMedium(medium)} />
                                {newItemMediums.includes(medium) && <CheckCircleIcon className="w-4 h-4 mr-1.5" />}
                                {medium}
                            </label>
                        ))}
                    </div>
                </div>

                {availableGrades.length > 0 && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">4. Grade(s)</label>
                        <div className="flex flex-wrap gap-2">
                            {availableGrades.map(grade => (
                                <label key={grade} className={`flex items-center px-3 py-1 rounded-md border cursor-pointer text-xs sm:text-sm transition-colors ${newItemGrades.includes(grade) ? 'bg-primary text-white border-primary' : 'bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border text-light-text dark:text-dark-text'}`}>
                                    <input type="checkbox" className="hidden" checked={newItemGrades.includes(grade)} onChange={() => toggleGrade(grade)} />
                                    {grade}
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                <button type="button" onClick={handleAddTeachingItem} className="mt-2 flex items-center justify-center w-full py-2 px-4 border border-dashed border-primary text-primary rounded-md hover:bg-primary/10 transition-colors font-medium">
                    <PlusIcon className="w-4 h-4 mr-2" /> Add This Subject
                </button>
            </div>

            {/* List */}
            {items.length > 0 && (
                <div className="space-y-2">
                    {items.map((item) => (
                        <div key={item.id} className="flex items-start justify-between p-3 bg-light-background dark:bg-dark-background rounded-md border border-light-border dark:border-dark-border">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-primary">{item.subject}</span>
                                    <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300">{item.mediums.join(', ')}</span>
                                </div>
                                <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">{item.audience}</p>
                                {item.grades.length > 0 && <p className="text-xs text-light-text dark:text-dark-text mt-1 font-medium">{item.grades.join(', ')}</p>}
                            </div>
                            <button type="button" onClick={() => handleRemoveTeachingItem(item.id)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 p-1.5 rounded-full transition-colors">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TeachingItemsEditor;
