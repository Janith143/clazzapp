import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import FormInput from './FormInput';
import { SaveIcon, XIcon, PlusIcon, TrashIcon } from './Icons';
import { IndividualClass } from '../types';

interface AddRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (classId: number, instanceDate: string, recordingUrls: string[]) => void;
  classInfo: IndividualClass | null;
  instanceDate: string | null;
}

const AddRecordingModal: React.FC<AddRecordingModalProps> = ({ isOpen, onClose, onSave, classInfo, instanceDate }) => {
    const [urls, setUrls] = useState<string[]>(['']);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && classInfo && instanceDate) {
            const existingUrls = classInfo.recordingUrls?.[instanceDate];
            setUrls(existingUrls && existingUrls.length > 0 ? existingUrls : ['']);
            setError('');
        }
    }, [isOpen, classInfo, instanceDate]);

    const handleUrlChange = (index: number, value: string) => {
        const newUrls = [...urls];
        newUrls[index] = value;
        setUrls(newUrls);
    };

    const addUrlField = () => {
        setUrls(prev => [...prev, '']);
    };

    const removeUrlField = (index: number) => {
        setUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!classInfo || !instanceDate) return;
        
        const finalUrls = urls.filter(u => u.trim() !== '');

        for (const url of finalUrls) {
            try {
                new URL(url); // Validate each URL
            } catch (_) {
                setError(`Invalid URL detected: "${url}". Please ensure all links are valid.`);
                return;
            }
        }

        onSave(classInfo.id, instanceDate, finalUrls);
    };

    if (!classInfo || !instanceDate) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Recordings for "${classInfo.title}" on ${new Date(instanceDate).toLocaleDateString()}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 rounded-r-md text-yellow-800 dark:text-yellow-200">
                    <h4 className="font-bold">Important Notice</h4>
                    <p className="text-sm mt-2">
                        It is highly recommended to add recordings of your online class. These links will be visible only to enrolled students and serve as crucial evidence in case of payment disputes.
                    </p>
                </div>
                
                <div className="space-y-3">
                    {urls.map((url, index) => (
                        <div key={index} className="flex items-center gap-2">
                             <FormInput 
                                label={`Recording URL #${index + 1}`}
                                name={`recordingUrl-${index}`}
                                type="url"
                                value={url}
                                onChange={(e) => handleUrlChange(index, e.target.value)}
                                placeholder="https://..."
                            />
                            {urls.length > 1 && (
                                <button type="button" onClick={() => removeUrlField(index)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full mt-6">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <button type="button" onClick={addUrlField} className="w-full flex items-center justify-center gap-2 text-sm font-medium text-primary border-2 border-dashed border-primary/50 rounded-md py-2 hover:bg-primary/10">
                    <PlusIcon className="w-4 h-4" /> Add Another Link
                </button>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <div className="pt-4 flex justify-end space-x-3">
                     <button type="button" onClick={onClose} className="inline-flex items-center justify-center px-4 py-2 border border-light-border dark:border-dark-border text-sm font-medium rounded-md shadow-sm">
                        <XIcon className="w-4 h-4 mr-2"/>
                        Cancel
                    </button>
                    <button type="submit" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark">
                        <SaveIcon className="w-4 h-4 mr-2"/>
                        Save Links
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddRecordingModal;