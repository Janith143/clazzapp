
import React, { useRef } from 'react';
import { UploadIcon, CameraIcon } from './Icons.tsx';
import { getOptimizedImageUrl } from '../utils.ts';

interface ImageUploadInputProps {
  label: string;
  currentImage: string | null;
  onImageChange: (base64: string) => void;
  aspectRatio?: 'aspect-video' | 'aspect-square';
}

const ImageUploadInput: React.FC<ImageUploadInputProps> = ({ label, currentImage, onImageChange, aspectRatio = 'aspect-video' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleContainerClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`File size exceeds the ${MAX_SIZE_MB}MB limit. Please upload a smaller image.`);
      if (event.target) {
        event.target.value = ''; // Reset the file input
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        onImageChange(base64);
      }
    };
    reader.readAsDataURL(file);

    // Reset file input to allow re-uploading the same file if needed
    if (event.target) {
      event.target.value = '';
    }
  };

  const recommendation = aspectRatio === 'aspect-square'
    ? "Recommended: Square image (1:1)"
    : "Recommended: Landscape image (16:9)";

  const optimizedUserInfo = getOptimizedImageUrl(currentImage || '', 400);

  return (
    <div>
      <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
        {label}
      </label>
      <div
        onClick={handleContainerClick}
        className={`relative w-full ${aspectRatio} rounded-md border-2 border-dashed border-light-border dark:border-dark-border cursor-pointer group flex items-center justify-center bg-light-background dark:bg-dark-background hover:border-primary dark:hover:border-primary transition-colors`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
        />
        {currentImage ? (
          <>
            <img src={currentImage.startsWith('data:') ? currentImage : optimizedUserInfo} alt="Preview" className={`w-full h-full object-cover rounded-md`} crossOrigin="anonymous" />
            <div className="absolute inset-0 bg-black/50 rounded-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="text-center">
                <CameraIcon className="w-8 h-8 mx-auto" />
                <p className="text-sm font-semibold mt-1">Change Image</p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-600 dark:text-gray-400">
            <UploadIcon className="w-10 h-10 mx-auto" />
            <p className="mt-2 text-sm">Click to upload an image</p>
            <p className="text-xs">{recommendation}</p>
          </div>
        )}
      </div>
      <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1 text-center sm:text-left">
        Max file size: 5MB. Accepted types: PNG, JPG, WEBP.
      </p>
    </div>
  );
};

export default ImageUploadInput;
