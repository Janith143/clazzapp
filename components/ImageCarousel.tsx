import React from 'react';
import { CameraIcon, TrashIcon, PlusIcon } from './Icons';
import { EditableImageType } from '../types';
import { createSrcSet } from '../utils';

interface ImageCarouselProps {
  images: string[];
  isEditable: boolean;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onEditImage: (type: EditableImageType) => void;
  onRemoveImage: (index: number) => void;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, isEditable, currentIndex, onIndexChange, onEditImage, onRemoveImage }) => {

  const goToPrevious = () => {
    if (images.length === 0) return;
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
    onIndexChange(newIndex);
  };

  const goToNext = () => {
    if (images.length === 0) return;
    const isLastSlide = currentIndex === images.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    onIndexChange(newIndex);
  };

  const goToSlide = (slideIndex: number) => {
    onIndexChange(slideIndex);
  };

  const imageSrc = images && images.length > currentIndex ? images[currentIndex] : null;

  if (!imageSrc) {
    return (
       <div 
        className="relative h-64 w-full animate-fadeIn group bg-light-border dark:bg-dark-border flex items-center justify-center"
        style={{ borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }}
       >
           {isEditable && (
            <button 
                onClick={() => onEditImage('cover_add')}
                className="flex items-center space-x-2 bg-white/80 dark:bg-black/60 backdrop-blur-sm text-light-text dark:text-dark-text text-sm font-semibold px-4 py-2 rounded-full shadow-md hover:bg-white dark:hover:bg-black transition-colors download-ignore"
            >
                <PlusIcon className="w-4 h-4" />
                <span>Add Cover Image</span>
            </button>
           )}
        </div>
    );
  }

  return (
    <div 
        className="relative h-64 w-full animate-fadeIn group" 
        style={{ 
            animationDelay: '50ms',
            overflow: 'hidden',
            borderTopLeftRadius: '0.5rem',
            borderTopRightRadius: '0.5rem'
        }}
    >
      <img
        src={imageSrc}
        alt="Cover image"
        crossOrigin="anonymous"
        className="w-full h-full object-cover duration-500"
      />

      {/* Edit/Remove overlay */}
      {isEditable && (
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center download-ignore">
            <div className="flex items-center space-x-4">
                <button onClick={() => onEditImage({ type: 'cover', index: currentIndex })} className="flex flex-col items-center text-white hover:text-primary-light transition-colors">
                      <CameraIcon className="w-10 h-10" />
                      <span className="text-xs font-semibold mt-1">Change Image</span>
                  </button>
                  {images.length > 1 && (
                      <button onClick={() => onRemoveImage(currentIndex)} className="flex flex-col items-center text-white hover:text-red-400 transition-colors">
                          <TrashIcon className="w-10 h-10" />
                          <span className="text-xs font-semibold mt-1">Remove</span>
                      </button>
                  )}
            </div>
        </div>
      )}
      
      {/* Add image button */}
      {isEditable && images.filter(Boolean).length < 3 && (
        <button 
          onClick={() => onEditImage('cover_add')}
          className="absolute top-4 right-4 bg-white/80 dark:bg-black/60 backdrop-blur-sm text-light-text dark:text-dark-text text-xs font-semibold px-3 py-1.5 rounded-full shadow-md hover:bg-white dark:hover:bg-black transition-colors opacity-0 group-hover:opacity-100 download-ignore"
        >
          + Add Image
        </button>
      )}


      {images.filter(Boolean).length > 1 && (
        <>
        {/* Left Arrow */}
        <button
            onClick={goToPrevious}
            className="absolute top-1/2 -translate-y-1/2 left-5 text-2xl rounded-full p-2 bg-black/20 text-white cursor-pointer group-hover:bg-black/40 transition-colors download-ignore"
            aria-label="Go to previous slide"
        >
            &#10094;
        </button>
        {/* Right Arrow */}
        <button 
            onClick={goToNext}
            className="absolute top-1/2 -translate-y-1/2 right-5 text-2xl rounded-full p-2 bg-black/20 text-white cursor-pointer group-hover:bg-black/40 transition-colors download-ignore"
            aria-label="Go to next slide"
        >
            &#10095;
        </button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex justify-center space-x-2 download-ignore">
            {images.map((img, slideIndex) => (
            img && <button
                key={slideIndex}
                onClick={() => goToSlide(slideIndex)}
                className={`cursor-pointer h-2 rounded-full transition-all ${
                currentIndex === slideIndex ? 'bg-white w-4' : 'bg-white/50 w-2'
                }`}
                aria-label={`Go to slide ${slideIndex + 1}`}
            ></button>
            ))}
        </div>
        </>
      )}
    </div>
  );
};

export default ImageCarousel;