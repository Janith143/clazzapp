import React, { useMemo, useState, useEffect } from 'react';
import { Teacher } from '../types.ts';
import StarRating from './StarRating.tsx';
import { getAverageRating, extractAndTruncate, getOptimizedImageUrl } from '../utils.ts';
import { useData } from '../contexts/DataContext.tsx';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons.tsx';

interface TeacherCardProps {
    teacher: Teacher;
    onViewProfile: (teacherId: string) => void;
}

const TeacherCard: React.FC<TeacherCardProps> = ({ teacher, onViewProfile }) => {
    const { defaultCoverImages } = useData();
    const [imageIndex, setImageIndex] = useState(0);
    const [isImageLoading, setIsImageLoading] = useState(false);

    const averageRating = getAverageRating(teacher.ratings);

    const displayImages = useMemo(() => {
        const customCovers = (teacher.coverImages || []).filter(img => img && !img.includes('default-cover-images'));
        if (customCovers.length > 0) return customCovers;
        return defaultCoverImages.length > 0 ? defaultCoverImages : ['https://via.placeholder.com/800x400?text=No+Cover'];
    }, [teacher.coverImages, defaultCoverImages]);

    useEffect(() => {
        if (displayImages.length <= 1) return;

        const interval = setInterval(() => {
            setIsImageLoading(true);
            setImageIndex((prev) => (prev + 1) % displayImages.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [displayImages.length, imageIndex]);

    const currentImage = displayImages[imageIndex];

    const handleNextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsImageLoading(true);
        setImageIndex((prev) => (prev + 1) % displayImages.length);
    };

    const handlePrevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsImageLoading(true);
        setImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
    };

    const handleDotClick = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        setIsImageLoading(true);
        setImageIndex(index);
    }

    const handleImageLoad = () => {
        setIsImageLoading(false);
    };

    const optimizedCoverImage = getOptimizedImageUrl(currentImage, 400);
    const optimizedProfileImage = getOptimizedImageUrl(teacher.profileImage, 100, 100);

    const renderTeachingItems = () => {
        if (teacher.teachingItems && teacher.teachingItems.length > 0) {
            const itemsToShow = teacher.teachingItems.slice(0, 3);
            const hasMore = teacher.teachingItems.length > 3;
            return (
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {itemsToShow.map(item => (
                        <span key={item.id} className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary-dark dark:text-primary-light border border-primary/20">
                            {item.subject} <span className="opacity-70 text-[10px]">({item.mediums.map(m => m[0]).join('/')})</span>
                        </span>
                    ))}
                    {hasMore && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-light-border dark:bg-dark-border text-light-subtle dark:text-dark-subtle">
                            +{teacher.teachingItems.length - 3} more
                        </span>
                    )}
                </div>
            );
        } else if (teacher.subjects && teacher.subjects.length > 0) {
            // Fallback to legacy subjects
            return (
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {teacher.subjects.slice(0, 3).map(subject => (
                        <span key={subject} className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary-dark dark:text-primary-light">
                            {subject}
                        </span>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div
            className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden flex flex-col group animate-fadeIn transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
            onClick={() => onViewProfile(teacher.id)}
        >
            <div className="relative h-32 bg-light-border dark:bg-dark-border overflow-hidden">
                <img
                    src={optimizedCoverImage}
                    alt={`${teacher.name}'s cover`}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${isImageLoading ? 'opacity-50' : 'opacity-100'}`}
                    crossOrigin="anonymous"
                    onLoad={handleImageLoad}
                    loading="lazy"
                    decoding="async"
                    width="400"
                    height="128"
                    srcSet={`${getOptimizedImageUrl(currentImage, 400)} 400w, ${getOptimizedImageUrl(currentImage, 800)} 800w`}
                    sizes="(max-width: 768px) 100vw, 400px"
                />

                {displayImages.length > 1 && (
                    <>
                        <button onClick={handlePrevImage} className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/30 hover:bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        <button onClick={handleNextImage} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/30 hover:bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-1.5 z-10">
                            {displayImages.map((_, idx) => (
                                <button key={idx} onClick={(e) => handleDotClick(e, idx)} className={`w-1.5 h-1.5 rounded-full transition-colors shadow-sm ${idx === imageIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/70'}`} aria-label={`Go to image ${idx + 1}`} />
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="flex-grow flex flex-col items-center text-center p-4 pb-6 relative">
                <div className="w-24 h-24 -mt-16 rounded-full border-4 border-light-surface dark:border-dark-surface overflow-hidden shadow-lg flex-shrink-0 z-10 bg-light-surface dark:bg-dark-surface">
                    <img
                        src={optimizedProfileImage}
                        alt={teacher.name}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                        loading="lazy"
                        decoding="async"
                        width="96"
                        height="96"
                    />
                </div>

                <div className="mt-4">
                    <h3 className="text-xl font-bold text-light-text dark:text-dark-text tracking-tight group-hover:text-primary transition-colors">{teacher.name}</h3>
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">{teacher.tagline}</p>
                </div>

                {averageRating.count > 0 && (
                    <div className="mt-2">
                        <StarRating rating={averageRating.average} count={averageRating.count} readOnly={true} size="sm" />
                    </div>
                )}

                <div className="flex-grow mt-3 w-full">
                    <p className="prose-sm text-center prose-p:my-0 text-light-subtle dark:text-dark-subtle">
                        {extractAndTruncate(teacher.bio, 80)}
                    </p>
                </div>

                {renderTeachingItems()}
            </div>

            <div className="p-4 pt-0 mt-auto">
                <button
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                >
                    View Profile
                </button>
            </div>
        </div>
    );
};

export default TeacherCard;