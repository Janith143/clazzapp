import React, { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";
import { getOptimizedImageUrl } from "../utils.ts";

interface ProductImageCarouselProps {
  images: string[];
}

const ProductImageCarousel: React.FC<ProductImageCarouselProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Main Image */}
      <div className="relative overflow-hidden rounded-2xl bg-gray-100 dark:bg-dark-border group h-[400px]">
        {/* Stacking images for cross-fade */}
        {images.map((img, index) => (
          <img
            key={index}
            src={getOptimizedImageUrl(img, 600)}
            alt={`Product image ${index + 1}`}
            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ease-in-out ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
          />
        ))}

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute top-1/2 left-3 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-700 p-2 rounded-full shadow-lg z-20 transition-opacity opacity-50 group-hover:opacity-100"
              aria-label="Previous image"
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <button
              onClick={nextImage}
              className="absolute top-1/2 right-3 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-700 p-2 rounded-full shadow-lg z-20 transition-opacity opacity-50 group-hover:opacity-100"
              aria-label="Next image"
            >
              <ChevronRightIcon className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex mt-3 gap-2 justify-center">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-300 ease-in-out ${index === currentIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              aria-label={`Go to image ${index + 1}`}
            >
              <img
                src={getOptimizedImageUrl(img, 100)}
                alt={`Thumbnail ${index + 1}`}
                className="object-cover w-full h-full"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageCarousel;