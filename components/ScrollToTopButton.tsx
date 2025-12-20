import React, { useState, useEffect } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from './Icons.tsx';

const ScrollToTopButton: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [pointsUp, setPointsUp] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const show = window.scrollY > 200;
            const pointUp = window.scrollY > window.innerHeight / 2;
            setIsVisible(show);
            setPointsUp(pointUp);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleClick = () => {
        if (pointsUp) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`fixed bottom-36 md:bottom-24 right-8 z-50 p-3 rounded-full bg-primary/70 dark:bg-primary/50 text-white backdrop-blur-sm shadow-lg hover:bg-primary dark:hover:bg-primary/80 transition-all duration-300 ${
                isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            }`}
            aria-label={pointsUp ? 'Scroll to top' : 'Scroll down'}
        >
            {pointsUp ? <ChevronUpIcon className="w-6 h-6" /> : <ChevronDownIcon className="w-6 h-6" />}
        </button>
    );
};

export default ScrollToTopButton;