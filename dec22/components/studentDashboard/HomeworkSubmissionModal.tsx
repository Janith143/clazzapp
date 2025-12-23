import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import FormInput from '../FormInput';
import { SaveIcon, XIcon } from '../Icons';
import { IndividualClass } from '../../types';

interface HomeworkSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (classId: number, instanceDate: string, link: string) => void;
  classInfo: IndividualClass | null;
  instanceDate: string | null;
  existingSubmissionLink?: string;
}

const HomeworkSubmissionModal: React.FC<HomeworkSubmissionModalProps> = ({ isOpen, onClose, onSave, classInfo, instanceDate, existingSubmissionLink }) => {
    const [link, setLink] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setLink(existingSubmissionLink || '');
            setError('');
        }
    }, [isOpen, existingSubmissionLink]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!classInfo || !instanceDate) return;

        try {
            new URL(link); // Validate URL
        } catch (_) {
            setError('Please enter a valid URL (e.g., https://...).');
            return;
        }

        onSave(classInfo.id, instanceDate, link);
    };

    if (!classInfo || !instanceDate) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Submit Homework for "${classInfo.title}" on ${new Date(instanceDate).toLocaleDateString()}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    Upload your homework files to a service like Google Drive, make sure the link is accessible ('Anyone with the link can view'), and paste the link below.
                </p>
                <FormInput 
                    label="Homework Link (e.g., Google Drive)"
                    name="homeworkLink"
                    type="url"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    required
                    placeholder="https://drive.google.com/..."
                />
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <div className="pt-4 flex justify-end space-x-3">
                     <button type="button" onClick={onClose} className="inline-flex items-center justify-center px-4 py-2 border border-light-border dark:border-dark-border text-sm font-medium rounded-md shadow-sm">
                        <XIcon className="w-4 h-4 mr-2"/>
                        Cancel
                    </button>
                    <button type="submit" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark">
                        <SaveIcon className="w-4 h-4 mr-2"/>
                        {existingSubmissionLink ? 'Update Submission' : 'Submit Homework'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default HomeworkSubmissionModal;
