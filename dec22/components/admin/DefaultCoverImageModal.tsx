import React, { useState } from 'react';
import Modal from '../Modal.tsx';
import { Teacher } from '../../types.ts';
import { SaveIcon, CheckCircleIcon } from '../Icons.tsx';

interface DefaultCoverImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    teacher: Teacher;
    onSave: (teacherId: string, imageUrl: string) => void;
    defaultCoverImages: string[];
}

const DefaultCoverImageModal: React.FC<DefaultCoverImageModalProps> = ({ isOpen, onClose, teacher, onSave, defaultCoverImages }) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const handleSave = () => {
        if (selectedImage) {
            onSave(teacher.id, selectedImage);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Set Default Cover for ${teacher.name}`}>
            <div className="space-y-4">
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    This teacher has not uploaded any cover images. Select a default image to display on their profile.
                </p>
                <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto p-2 bg-light-background dark:bg-dark-background rounded-md">
                    {defaultCoverImages.map(img => (
                        <div key={img} className="relative cursor-pointer group" onClick={() => setSelectedImage(img)}>
                            <img src={img} alt="Default cover" className="w-full h-auto rounded-md" />
                            <div className={`absolute inset-0 bg-primary/50 rounded-md border-4 border-primary flex items-center justify-center text-white transition-opacity ${selectedImage === img ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                                {selectedImage === img && <CheckCircleIcon className="h-12 w-12" />}
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="pt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!selectedImage}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark disabled:opacity-50"
                    >
                        <SaveIcon className="w-5 h-5 mr-2" />
                        Set Cover Image
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default DefaultCoverImageModal;