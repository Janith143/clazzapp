import React, { useState, useEffect } from 'react';
import Modal from './Modal.tsx';
import ImageUploadInput from './ImageUploadInput.tsx';
import { SaveIcon, XIcon } from './Icons.tsx';

interface VerificationUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageUrl: string, requestNote: string) => void;
  verificationType: 'id_front' | 'id_back' | 'bank';
}

const VerificationUploadModal: React.FC<VerificationUploadModalProps> = ({ isOpen, onClose, onSave, verificationType }) => {
  const [image, setImage] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    // Reset state when the modal is opened to ensure a clean slate
    if (isOpen) {
      setImage(null);
      setNote('');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (image) {
      onSave(image, note);
    }
  };
  
  const titles = {
      id_front: "Upload ID Verification (Front)",
      id_back: "Upload ID Verification (Back)",
      bank: "Upload Bank Details Verification Document"
  };
  
  const descriptions = {
      id_front: "Please upload a clear image of the front of your National ID Card, Passport, or Driving License.",
      id_back: "Please upload a clear image of the back of your National ID Card or Driving License.",
      bank: "Please upload a clear image of your bank passbook page showing your name and account number, or a relevant online banking screenshot."
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titles[verificationType]}>
      <div className="space-y-6">
        <p className="text-sm text-light-subtle dark:text-dark-subtle">
            {descriptions[verificationType]}
        </p>

        <ImageUploadInput
          label="Verification Document Image"
          currentImage={image}
          onImageChange={setImage}
          aspectRatio="aspect-video"
        />
        
        <div>
            <label htmlFor="requestNote" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                Message to Admin (Optional)
            </label>
            <textarea
                id="requestNote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-light-border dark:border-dark-border placeholder-light-subtle dark:placeholder-dark-subtle text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Add any notes for the administrator regarding this document."
            />
        </div>

        <div className="pt-4 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center px-4 py-2 border border-light-border dark:border-dark-border text-sm font-medium rounded-md shadow-sm text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface hover:bg-light-border dark:hover:bg-dark-border/50"
          >
            <XIcon className="w-4 h-4 mr-2" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!image}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark disabled:opacity-50"
          >
            <SaveIcon className="w-5 h-5 mr-2" />
            Submit for Review
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default VerificationUploadModal;