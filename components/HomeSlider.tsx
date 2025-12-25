import React, { useState, useEffect, useCallback } from 'react';
import { HomeSlide } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { getOptimizedImageUrl, createSrcSet } from '../utils';

interface HomeSliderProps {
  slides: HomeSlide[];
  onCtaClick: (ctaText: string) => void;
}

const HomeSlider: React.FC<HomeSliderProps> = ({ slides, onCtaClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? slides.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = useCallback(() => {
    const isLastSlide = currentIndex === slides.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  }, [currentIndex, slides.length]);

  useEffect(() => {
    const timer = setTimeout(goToNext, 5000);
    return () => clearTimeout(timer);
  }, [currentIndex, goToNext]);

  return (
    <div className="relative h-[500px] w-full m-auto group">
      {/* LCP Optimization: Use standard img tag instead of background-image */}
      <img
        src={slides[currentIndex].image}
        alt={slides[currentIndex].title}
        // @ts-ignore - fetchpriority is a valid HTML attribute but React types might not know it yet
        fetchpriority="high"
        className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out z-0"
        width="1920"
        height="500"
        srcSet={createSrcSet(slides[currentIndex].image, [400, 800, 1200, 1920])}
        sizes="(max-width: 640px) 400px, (max-width: 1024px) 1200px, 1920px"
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50 z-10" />

      <div className="w-full h-full flex flex-col items-center justify-center text-center text-white p-4 relative z-20">
        <h1 className="text-4xl md:text-6xl font-bold animate-slideInUp" style={{ animationDelay: '100ms' }}>{slides[currentIndex].title}</h1>
        <p className="mt-4 text-lg md:text-xl max-w-2xl animate-slideInUp" style={{ animationDelay: '300ms' }}>{slides[currentIndex].subtitle}</p>
        <button
          onClick={() => onCtaClick(slides[currentIndex].ctaText)}
          className="mt-8 px-8 py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark transition-transform hover:scale-105 animate-slideInUp"
          style={{ animationDelay: '500ms' }}
        >
          {slides[currentIndex].ctaText}
        </button>
      </div>

      <button onClick={goToPrevious} className="absolute top-1/2 -translate-y-1/2 left-5 text-white p-2 bg-black/30 rounded-full hover:bg-black/50 transition-colors z-30">
        <ChevronLeftIcon className="h-6 w-6" />
      </button>
      <button onClick={goToNext} className="absolute top-1/2 -translate-y-1/2 right-5 text-white p-2 bg-black/30 rounded-full hover:bg-black/50 transition-colors z-30">
        <ChevronRightIcon className="h-6 w-6" />
      </button>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex space-x-2 z-30">
        {slides.map((_, slideIndex) => (
          <button
            key={slideIndex}
            onClick={() => setCurrentIndex(slideIndex)}
            className={`h-2 rounded-full transition-all duration-300 ${currentIndex === slideIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'
              }`}
            aria-label={`Go to slide ${slideIndex + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HomeSlider;