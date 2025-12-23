import React from 'react';
import Modal from './Modal.tsx';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ isOpen, onClose, imageUrl, title }) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="3xl">
      <div className="bg-light-background dark:bg-dark-background p-4 rounded-md">
        <img src={imageUrl} alt={title} className="max-w-full max-h-[80vh] mx-auto object-contain" crossOrigin="anonymous" />
      </div>
    </Modal>
  );
};

export default ImageViewerModal;