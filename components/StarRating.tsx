import React, { useState } from 'react';
import { StarIcon } from './Icons.tsx';

interface StarRatingProps {
  rating: number;
  totalStars?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  readOnly?: boolean;
  onRatingChange?: (rating: number) => void;
  showLabel?: boolean;
  count?: number;
}

const StarRating: React.FC<StarRatingProps> = ({ 
    rating, 
    totalStars = 5, 
    size = 'md', 
    readOnly = false, 
    onRatingChange,
    showLabel = true,
    count
}) => {
    const [hoverRating, setHoverRating] = useState(0);
    
    const sizeClasses = {
        xs: 'h-3 w-3',
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-6 w-6',
    };

    const stars = Array.from({ length: totalStars }, (_, index) => {
        const starNumber = index + 1;
        const isFilled = starNumber <= (hoverRating || rating);

        return (
            <button
                key={starNumber}
                type="button"
                disabled={readOnly}
                onClick={() => onRatingChange && onRatingChange(starNumber)}
                onMouseEnter={() => !readOnly && setHoverRating(starNumber)}
                onMouseLeave={() => !readOnly && setHoverRating(0)}
                className={`transition-colors duration-150 ${
                    isFilled ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                } ${!readOnly ? 'cursor-pointer' : ''}`}
                aria-label={`Rate ${starNumber} out of ${totalStars} stars`}
            >
                <StarIcon className={`${sizeClasses[size]} fill-current`} />
            </button>
        );
    });

    return (
        <div className="flex items-center space-x-1">
            <div className="flex">{stars}</div>
            {showLabel && rating > 0 && (
                <span className={`text-sm font-bold ${size === 'xs' || size === 'sm' ? 'text-xs' : 'text-sm'}`}>
                    {rating.toFixed(1)}
                    {count !== undefined && <span className="ml-1 font-normal text-light-subtle dark:text-dark-subtle">({count})</span>}
                </span>
            )}
        </div>
    );
};

export default StarRating;