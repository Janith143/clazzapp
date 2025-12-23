import React, { useState, useEffect } from 'react';
import { Lecture } from '../types';
import Modal from './Modal';
import FormInput from './FormInput';
import { SaveIcon } from './Icons';
import MarkdownEditor from './MarkdownEditor';

interface LectureEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lecture: Lecture) => void;
  lecture: Lecture | null;
}

const initialLectureState: Omit<Lecture, 'id'> = {
  title: '',
  description: '',
  videoUrl: '',
  resourcesUrl: '',
  durationMinutes: 0,
  isFreePreview: false,
};

const LectureEditModal: React.FC<LectureEditModalProps> = ({ isOpen, onClose, onSave, lecture }) => {
    const [formData, setFormData] = useState(initialLectureState);

    useEffect(() => {
        if (isOpen) {
            setFormData(lecture || initialLectureState);
        }
    }, [isOpen, lecture]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
             setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            id: lecture?.id || `l_${Date.now()}`,
            durationMinutes: Number(formData.durationMinutes) || 0,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={lecture ? 'Edit Lecture' : 'Add New Lecture'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput label="Lecture Title" name="title" value={formData.title} onChange={handleChange} required />
                <MarkdownEditor
                    label="Description"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                />
                <FormInput label="Video URL" name="videoUrl" value={formData.videoUrl} onChange={handleChange} placeholder="e.g., https://vimeo.com/12345" />
                <FormInput label="Resources URL (Google Drive, etc.)" name="resourcesUrl" value={formData.resourcesUrl || ''} onChange={handleChange} placeholder="e.g., https://drive.google.com/..." />
                <FormInput label="Duration (minutes)" name="durationMinutes" type="number" value={formData.durationMinutes.toString()} onChange={handleChange} />
                
                <div className="flex items-center">
                    <input
                        id="isFreePreview"
                        name="isFreePreview"
                        type="checkbox"
                        checked={formData.isFreePreview}
                        onChange={handleChange}
                        className="h-4 w-4 text-primary focus:ring-primary border-light-border dark:border-dark-border rounded"
                    />
                    <label htmlFor="isFreePreview" className="ml-2 block text-sm text-light-text dark:text-dark-text">
                        Make this a free preview lecture
                    </label>
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        type="submit"
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors"
                    >
                        <SaveIcon className="w-5 h-5 mr-2" />
                        {lecture ? 'Save Changes' : 'Add Lecture'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default LectureEditModal;