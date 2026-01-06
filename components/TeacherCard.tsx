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
    const { defaultCoverImages, tuitionInstitutes } = useData();
    const [imageIndex, setImageIndex] = useState(0);
    const [isImageLoading, setIsImageLoading] = useState(false);

    const averageRating = getAverageRating(teacher.ratings);

    const displayImages = useMemo(() => {
        const customCovers = (teacher.coverImages || []).filter(img => img && !img.includes('default-cover-images'));
        if (customCovers.length > 0) return customCovers;
        return defaultCoverImages.length > 0 ? defaultCoverImages : ['https://via.placeholder.com/800x400?text=No+Cover'];
    }, [teacher.coverImages, defaultCoverImages]);

    const instituteName = useMemo(() => {
        if (teacher.isManaged && teacher.instituteId) {
            return tuitionInstitutes.find(i => i.id === teacher.instituteId)?.name;
        }
        return null;
    }, [teacher, tuitionInstitutes]);

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

                {instituteName && (
                    <div className="absolute top-2 left-2 z-20">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-white/90 dark:bg-black/70 text-xs font-bold text-primary shadow-sm backdrop-blur-sm">
                            {instituteName} Teacher
                        </span>
                    </div>
                )}

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
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Share URL logic: favored username, fallback to ID
                        const slug = teacher.username || teacher.id; // Or maybe just teacher.username if we want to force vanity? stick to robust.
                        // Actually, if we use vanity URL: clazz.lk/{username}
                        // If no username: clazz.lk/teacher/{id}??
                        // The user objective was "Vanity Teacher URLs ... app.clazz.lk/#/{teacher.name} -> clazz.lk/{teacher.name}".
                        // Use window.location.origin + '/' + teacher.username (if exists)
                        let url = window.location.origin + '/';
                        if (teacher.username) {
                            url += teacher.username;
                        } else {
                            url += 'teacher/' + teacher.id;
                        }

                        navigator.clipboard.writeText(url);
                        alert("Link copied: " + url);
                    }}
                    className="absolute top-2 right-2 p-2 bg-white/80 dark:bg-black/50 rounded-full hover:bg-white dark:hover:bg-black/70 transition-colors text-gray-700 dark:text-gray-200 z-20 opacity-0 group-hover:opacity-100"
                    title="Share Profile"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M13 4.5a2.5 2.5 0 11.702 1.737L6.97 9.604a2.51 2.51 0 010 .792l6.733 3.367a2.5 2.5 0 11-.671 1.341l-6.733-3.367a2.5 2.5 0 110-3.508l6.733-3.367A2.5 2.5 0 0113 4.5z" />
                    </svg>
                </button>
            </div>

            <div className="flex-grow flex flex-col items-center text-center p-3 pb-4 relative">
                <div className="w-20 h-20 -mt-12 rounded-full border-4 border-light-surface dark:border-dark-surface overflow-hidden shadow-lg flex-shrink-0 z-10 bg-light-surface dark:bg-dark-surface">
                    <img
                        src={optimizedProfileImage}
                        alt={teacher.name}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                        loading="lazy"
                        decoding="async"
                        width="80"
                        height="80"
                    />
                </div>

                <div className="mt-3">
                    <h3 className="text-lg font-bold text-light-text dark:text-dark-text tracking-tight group-hover:text-primary transition-colors">{teacher.name}</h3>
                    <p className="text-xs text-light-subtle dark:text-dark-subtle">{teacher.tagline}</p>
                </div>

                {averageRating.count > 0 && (
                    <div className="mt-1">
                        <StarRating rating={averageRating.average} count={averageRating.count} readOnly={true} size="sm" />
                    </div>
                )}

                <div className="flex-grow mt-2 w-full">
                    <p className="prose-sm text-center text-xs prose-p:my-0 text-light-subtle dark:text-dark-subtle leading-snug">
                        {extractAndTruncate(teacher.bio, 60)}
                    </p>
                </div>

                {renderTeachingItems()}
            </div>
        </div>
    );
};

export default TeacherCard;