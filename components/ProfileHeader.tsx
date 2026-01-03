import React, { useMemo } from 'react';
import { Teacher, EditableImageType } from '../types';
import { PencilIcon, StarIcon, UserGroupIcon, PhoneIcon, LinkIcon, LogoIcon } from './Icons';
import ImageCarousel from './ImageCarousel';
import StarRating from './StarRating';
import { getAverageRating, createSrcSet, calculateTeacherProfileCompletion, getOptimizedImageUrl } from '../utils';
import { useData } from '../contexts/DataContext';
import ProgressBar from './ProgressBar';
import QRCodeWithLogo from './QRCodeWithLogo';

interface ProfileHeaderProps {
    teacher: Teacher;
    isOwnProfile: boolean;
    onEditProfile: () => void;
    onEditImage: (type: EditableImageType) => void;
    onRemoveCoverImage: (index: number) => void;
    coverImageIndex: number;
    setCoverImageIndex: (index: number) => void;
    followerCount?: number;
}

const ProfileHeader = React.forwardRef<HTMLDivElement, ProfileHeaderProps>(({
    teacher,
    isOwnProfile,
    onEditProfile,
    onEditImage,
    onRemoveCoverImage,
    coverImageIndex,
    setCoverImageIndex,
    followerCount
}, ref) => {
    const { defaultCoverImages, tuitionInstitutes } = useData();

    const profileUrl = teacher.username
        ? `${window.location.origin}/${teacher.username}`
        : `${window.location.origin}/?teacherId=${teacher.id}`;

    const averageRating = getAverageRating(teacher.ratings);
    const profileImageSrcSet = teacher.profileImage ? createSrcSet(teacher.profileImage, [160, 320]) : undefined;
    const { percentage: profileCompletion } = calculateTeacherProfileCompletion(teacher);

    const customCoverImages = useMemo(() =>
        (teacher.coverImages || []).filter(img => img && !img.includes('default-cover-images')),
        [teacher.coverImages]
    );

    const coverImagesToShow = useMemo(() =>
        customCoverImages.length > 0
            ? customCoverImages
            : (defaultCoverImages || []),
        [customCoverImages, defaultCoverImages]
    );

    const instituteName = useMemo(() => {
        if (teacher.isManaged && teacher.instituteId) {
            return tuitionInstitutes.find(i => i.id === teacher.instituteId)?.name;
        }
        return null;
    }, [teacher, tuitionInstitutes]);

    return (
        <div
            ref={ref}
            className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-2xl mb-8 animate-fadeIn overflow-hidden border border-slate-200 dark:border-slate-700"
        >
            <div className="relative w-full h-64">
                <ImageCarousel
                    images={coverImagesToShow}
                    isEditable={isOwnProfile}
                    currentIndex={coverImageIndex}
                    onIndexChange={setCoverImageIndex}
                    onEditImage={onEditImage}
                    onRemoveImage={onRemoveCoverImage}
                />
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                    <div className="md:col-span-2 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left">
                        <div
                            className="relative flex-shrink-0 -mt-24 border-4 border-light-surface dark:border-dark-surface shadow-lg"
                            style={{ width: '10rem', height: '10rem', overflow: 'hidden', borderRadius: '9999px', clipPath: 'circle(50% at 50% 50%)' }}
                        >
                            {teacher.profileImage ? (
                                <img src={getOptimizedImageUrl(teacher.profileImage, 160, 160)} srcSet={profileImageSrcSet} sizes="160px" alt={teacher.name} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 'bold', fontSize: '3rem' }}>
                                    {teacher.name?.split(' ')[0]?.charAt(0) || ''}{teacher.name?.split(' ')[1]?.charAt(0) || ''}
                                </div>
                            )}
                            {isOwnProfile && (
                                <button onClick={() => onEditImage('profile')} className="absolute bottom-2 right-2 bg-white/80 dark:bg-black/60 rounded-full p-2 text-light-text dark:text-dark-text hover:bg-primary hover:text-white transition-colors download-ignore" aria-label="Edit profile picture">
                                    <PencilIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        <div className="sm:ml-6 mt-4 sm:mt-0 flex-grow">
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-1">
                                <h1 className="text-3xl font-bold">{teacher.name}</h1>
                                {instituteName && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary uppercase tracking-wide">
                                        {instituteName} Teacher
                                    </span>
                                )}
                            </div>
                            <p className="text-md text-primary">{teacher.tagline}</p>
                            <div className="mt-2"><StarRating rating={averageRating.average} count={averageRating.count} readOnly={true} /></div>

                            {followerCount !== undefined && (
                                <div className="mt-3 flex items-center space-x-2 text-sm text-light-text dark:text-dark-text justify-center sm:justify-start">
                                    <UserGroupIcon className="w-5 h-5 text-light-subtle dark:text-dark-subtle" />
                                    <span className="font-semibold">{followerCount}</span><span>Followers</span>
                                </div>
                            )}

                            {isOwnProfile && (
                                <div className="mt-4">
                                    <div className="flex justify-between items-center mb-1 text-sm">
                                        <span className="font-semibold">Profile Completion</span><span className="font-bold text-primary">{profileCompletion}%</span>
                                    </div>
                                    <ProgressBar value={profileCompletion} max={100} />
                                </div>
                            )}

                            <div className="mt-4 space-y-3 text-sm text-light-text dark:text-dark-text text-center sm:text-left">
                                <div>
                                    <strong className="font-semibold text-light-subtle dark:text-dark-subtle block mb-2">Teaching Areas</strong>
                                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                        {teacher.teachingItems && teacher.teachingItems.length > 0 ? (
                                            teacher.teachingItems.map(item => (
                                                <div key={item.id} className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary/5 border border-primary/10 text-light-text dark:text-dark-text text-left">
                                                    <span className="block font-bold text-primary">{item.subject}</span>
                                                    <span className="block opacity-80">{item.audience}</span>
                                                    {item.grades.length > 0 && <span className="block opacity-70 mt-0.5 text-[10px]">{item.grades.join(', ')}</span>}
                                                </div>
                                            ))
                                        ) : (
                                            teacher.subjects.map(subject => <span key={subject} className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary-dark dark:text-primary-light">{subject}</span>)
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <strong className="font-semibold text-light-subtle dark:text-dark-subtle block mb-1">Qualifications</strong>
                                    <p className="text-xs">{teacher.qualifications.join(' • ')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {isOwnProfile && (
                        <div className="absolute top-0 right-0 download-ignore">
                            <button onClick={onEditProfile} className="flex-shrink-0 flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors">
                                <PencilIcon className="w-3 h-3" /><span>Edit</span>
                            </button>
                        </div>
                    )}

                    <div className="md:col-span-1 flex flex-col justify-between items-center pt-4 md:pt-0 md:border-l border-light-border dark:border-dark-border md:pl-6 text-center">
                        <div className="flex flex-col items-center w-full">
                            <div className="flex items-center space-x-2"><LogoIcon className="h-6 w-6" /><span className="text-lg font-bold">clazz.<span className="text-primary">lk</span></span></div>
                            <div className="mt-2 w-24 h-24 rounded-md shadow-sm overflow-hidden bg-white">
                                <QRCodeWithLogo data={profileUrl} logoSrc="/Logo3.png" size={96} className="" />
                            </div>
                            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="mt-3 text-[10px] sm:text-xs text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light break-all font-mono bg-gray-50 dark:bg-white/5 px-2 py-1.5 rounded border border-light-border dark:border-dark-border transition-colors max-w-full">
                                {profileUrl}
                            </a>
                        </div>
                        <div className="mt-4 space-y-2 text-sm">
                            <div className="flex items-center"><PhoneIcon className="w-4 h-4 mr-2 text-light-subtle dark:text-dark-subtle" /><span>{teacher.contact.phone}</span></div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-light-border dark:border-dark-border mt-6 pt-4 text-center">
                    <p className="text-sm italic text-light-subtle dark:text-dark-subtle">"Join me on clazz.lk to learn, grow, and achieve."</p>
                </div>
            </div>
        </div>
    );
});

ProfileHeader.displayName = 'ProfileHeader';

export default ProfileHeader;